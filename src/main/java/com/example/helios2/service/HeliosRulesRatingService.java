package com.example.helios2.service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.text.DecimalFormat;
import java.time.Duration;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * Service that connects Helios2 to the standalone helios-rules (BRMS) application.
 * 
 * Prepares and outputs facts for helios-rules to execute via Drools,
 * and receives the calculated premium amount, fired rules, and calculation trace.
 */
@Service
public class HeliosRulesRatingService {

    private static final Logger log = LoggerFactory.getLogger(HeliosRulesRatingService.class);

    private final String brmsBaseUrl;
    private final String defaultTenantId;
    private final int timeoutMs;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    public HeliosRulesRatingService(
            @Value("${helios2.rules.url:http://10.1.10.56:8085/helios2-brms}") String brmsBaseUrl,
            @Value("${helios2.rules.tenant-id:HELIOS_US}") String defaultTenantId,
            @Value("${helios2.rules.connect-timeout-ms:5000}") int timeoutMs,
            ObjectMapper objectMapper) {
        this.brmsBaseUrl = brmsBaseUrl != null && brmsBaseUrl.endsWith("/")
                ? brmsBaseUrl.substring(0, brmsBaseUrl.length() - 1)
                : brmsBaseUrl;
        this.defaultTenantId = (defaultTenantId != null && !defaultTenantId.isBlank()) ? defaultTenantId : "HELIOS_US";
        this.timeoutMs = timeoutMs > 0 ? timeoutMs : 5000;
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofMillis(this.timeoutMs))
                .build();
    }

    public record RatingRequestDto(
            Integer submsnId,
            String quoteId,
            String productCode,
            String planCode,
            String ruleVersionId,
            String stateCode,
            String effectiveDate,
            String lineOfBusiness,
            String specialtyClass,
            Long basePremiumCents,
            String exposureVal,
            String limitAmt,
            String retentionAmt,
            String scheduleMod,
            Integer yearsInPractice,
            Integer licensedProfessionalsCount,
            Map<String, Object> dynamicAttributes
    ) {
    }

    public record RatingResponseDto(
            String productCode,
            String productName,
            String planCode,
            String planName,
            String ruleVersionId,
            Long calculatedPremiumCents,
            String calculatedAmount,
            Long basePremiumCents,
            String baseAmount,
            List<String> firedRules,
            List<String> executionTrace,
            long executionTimeMs,
            String ratingStatus,
            Map<String, Object> factsOutput,
            String engineSource
    ) {
    }

    /**
     * Prepares and outputs facts for helios-rules, invokes POST /api/brms/evaluate,
     * and extracts the calculated amount and execution audit trail.
     */
    public RatingResponseDto rateQuote(
            RatingRequestDto req,
            HeliosService.ProductDto product,
            HeliosService.RatingPlanDto plan) {

        long startTime = System.currentTimeMillis();

        String resolvedProductCode = (product != null)
                ? product.productCode()
                : (req.productCode() != null ? req.productCode() : "TECH_EO");
        String resolvedProductName = (product != null)
                ? product.productName()
                : resolvedProductCode;

        String resolvedPlanCode = (plan != null)
                ? plan.planCode()
                : (req.planCode() != null ? req.planCode() : resolvedProductCode + "_COMMERCIAL");
        String resolvedPlanName = (plan != null)
                ? plan.planName()
                : resolvedPlanCode;

        String resolvedVersionId = (req.ruleVersionId() != null && !req.ruleVersionId().isBlank())
                ? req.ruleVersionId()
                : (plan != null ? plan.ruleVersionId() : "v1.0.0");

        // 1. Build the Fact dictionary that Helios2 will output for helios-rules
        Map<String, Object> policyFacts = buildPolicyFacts(req, product, plan);

        // 2. Prepare the outer BRMS evaluate payload
        Map<String, Object> evaluatePayload = new LinkedHashMap<>();
        evaluatePayload.put("tenantId", defaultTenantId);
        evaluatePayload.put("ruleVersionId", resolvedVersionId);
        evaluatePayload.put("policy", policyFacts);

        String evaluateUrl = brmsBaseUrl + "/api/brms/evaluate";
        log.info("Outputting facts to standalone helios-rules at {}: product={}, plan={}, version={}",
                evaluateUrl, resolvedProductCode, resolvedPlanCode, resolvedVersionId);

        try {
            String jsonRequest = objectMapper.writeValueAsString(evaluatePayload);

            HttpRequest httpRequest = HttpRequest.newBuilder()
                    .uri(URI.create(evaluateUrl))
                    .header("Content-Type", "application/json")
                    .header("Accept", "application/json")
                    .timeout(Duration.ofMillis(timeoutMs))
                    .POST(HttpRequest.BodyPublishers.ofString(jsonRequest))
                    .build();

            HttpResponse<String> httpResponse = httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofString());

            if (httpResponse.statusCode() >= 200 && httpResponse.statusCode() < 300) {
                JsonNode root = objectMapper.readTree(httpResponse.body());

                Long calcPremiumCents = root.path("calculatedPremiumCents").asLong(0L);
                Long basePremCents = root.path("basePremiumCents").asLong(0L);
                if (basePremCents == 0L && policyFacts.get("basePremiumCents") instanceof Number n) {
                    basePremCents = n.longValue();
                }

                List<String> firedRules = new ArrayList<>();
                if (root.has("firedRules") && root.get("firedRules").isArray()) {
                    for (JsonNode ruleNode : root.get("firedRules")) {
                        firedRules.add(ruleNode.asText());
                    }
                }

                List<String> executionTrace = new ArrayList<>();
                if (root.has("executionTrace") && root.get("executionTrace").isArray()) {
                    for (JsonNode traceNode : root.get("executionTrace")) {
                        executionTrace.add(traceNode.asText());
                    }
                }

                long duration = System.currentTimeMillis() - startTime;
                String formattedCalcAmount = formatCentsToUsd(calcPremiumCents);
                String formattedBaseAmount = formatCentsToUsd(basePremCents);

                log.info("Received calculated amount from helios-rules: {} ({} cents), fired {} rules in {}ms",
                        formattedCalcAmount, calcPremiumCents, firedRules.size(), duration);

                return new RatingResponseDto(
                        resolvedProductCode,
                        resolvedProductName,
                        resolvedPlanCode,
                        resolvedPlanName,
                        resolvedVersionId,
                        calcPremiumCents,
                        formattedCalcAmount,
                        basePremCents,
                        formattedBaseAmount,
                        firedRules,
                        executionTrace,
                        duration,
                        "RATED",
                        policyFacts,
                        "HELIOS_RULES_STANDALONE"
                );
            } else {
                log.warn("helios-rules returned non-200 HTTP code {}: {}", httpResponse.statusCode(), httpResponse.body());
                return executeFallbackRating(req, product, plan, policyFacts, startTime, "HTTP " + httpResponse.statusCode());
            }

        } catch (Exception e) {
            log.warn("Unable to contact standalone helios-rules at {} ({}). Using in-process engine fallback.",
                    evaluateUrl, e.getMessage());
            return executeFallbackRating(req, product, plan, policyFacts, startTime, e.getMessage());
        }
    }

    /**
     * Builds the complete facts map that Helios2 outputs for helios-rules.
     */
    public Map<String, Object> buildPolicyFacts(
            RatingRequestDto req,
            HeliosService.ProductDto product,
            HeliosService.RatingPlanDto plan) {

        Map<String, Object> facts = new LinkedHashMap<>();

        // Native POJO properties on Policy.java
        String quoteNbr = req.quoteId() != null && !req.quoteId().isBlank()
                ? req.quoteId()
                : (req.submsnId() != null ? "Q-" + req.submsnId() : "Q-DRAFT");
        facts.put("policyNumber", quoteNbr);

        String state = req.stateCode() != null && !req.stateCode().isBlank()
                ? req.stateCode().toUpperCase().trim()
                : "CA";
        facts.put("state", state);

        String effectiveDate = req.effectiveDate() != null && !req.effectiveDate().isBlank()
                ? req.effectiveDate()
                : LocalDate.now().toString();
        facts.put("effectiveDate", effectiveDate);

        String lineOfBusiness = (product != null && product.lineOfBusiness() != null)
                ? product.lineOfBusiness().toUpperCase().replace(" ", "_")
                : (req.lineOfBusiness() != null ? req.lineOfBusiness() : "PROFESSIONAL_LIABILITY");
        facts.put("lineOfBusiness", lineOfBusiness);

        String specialtyClass = req.specialtyClass() != null && !req.specialtyClass().isBlank()
                ? req.specialtyClass()
                : (product != null ? product.productCode() : "TECH_EO");
        facts.put("specialtyClass", specialtyClass);

        // Parse monetary amounts in cents
        long defaultBase = (plan != null && plan.defaultBasePremiumCents() != null)
                ? plan.defaultBasePremiumCents()
                : 250000L;
        long basePremiumCents = (req.basePremiumCents() != null && req.basePremiumCents() > 0)
                ? req.basePremiumCents()
                : defaultBase;
        facts.put("basePremiumCents", basePremiumCents);

        long defaultLimit = (plan != null && plan.defaultLimitCents() != null)
                ? plan.defaultLimitCents()
                : 200000000L;
        long coverageLimitCents = parseAmountCents(req.limitAmt(), defaultLimit);
        facts.put("coverageLimitCents", coverageLimitCents);

        long defaultDeductible = (plan != null && plan.defaultDeductibleCents() != null)
                ? plan.defaultDeductibleCents()
                : 2500000L;
        long policyDeductibleCents = parseAmountCents(req.retentionAmt(), defaultDeductible);
        facts.put("policyDeductibleCents", policyDeductibleCents);

        long defaultRevenue = 500000000L; // $5M
        long annualRevenueCents = parseAmountCents(req.exposureVal(), defaultRevenue);
        facts.put("annualRevenueCents", annualRevenueCents);

        facts.put("yearsInPractice", req.yearsInPractice() != null ? req.yearsInPractice() : 5);
        facts.put("licensedProfessionalsCount", req.licensedProfessionalsCount() != null ? req.licensedProfessionalsCount() : 10);

        // Dynamic Rating Attributes for Drools rules:
        // Defaults align with active rules in helios-rules
        facts.put("RetroactiveCoverageYears", 5);
        facts.put("ClaimFreeYears", 6);
        facts.put("PriorMalpracticeClaimsCount", 0);
        facts.put("DefenseOutsideLimits", false);
        facts.put("HasPeerReviewProgram", true);
        facts.put("PracticeSpecialtyClass", "TECH_SAAS_EO");
        facts.put("BoardCertifiedRatioPct", 85);

        // Override with any user-provided dynamic attributes
        if (req.dynamicAttributes() != null) {
            req.dynamicAttributes().forEach((k, v) -> {
                if (v != null) {
                    facts.put(k, v);
                }
            });
        }

        return facts;
    }

    /**
     * In-process fallback when the standalone helios-rules microservice is unreachable.
     * Evaluates the core Drools rule logic and returns the calculated amount.
     */
    private RatingResponseDto executeFallbackRating(
            RatingRequestDto req,
            HeliosService.ProductDto product,
            HeliosService.RatingPlanDto plan,
            Map<String, Object> facts,
            long startTime,
            String reason) {

        long baseCents = (facts.get("basePremiumCents") instanceof Number n) ? n.longValue() : 250000L;
        long calculatedCents = baseCents;

        List<String> firedRules = new ArrayList<>();
        List<String> trace = new ArrayList<>();
        trace.add("Helios2 internal rule emulator (Standalone helios-rules fallback: " + reason + ")");

        // Rule 1: Prior Acts Step-Rate Maturity Load (> 3 Yrs Retro) -> +45,000 cents
        Object retroObj = facts.get("RetroactiveCoverageYears");
        int retroYears = retroObj instanceof Number ? ((Number) retroObj).intValue() : 0;
        if (retroYears > 3) {
            calculatedCents += 45000L;
            firedRules.add("Prior Acts Step-Rate Maturity Load (> 3 Yrs Retro)");
            trace.add(String.format("Rule [Prior Acts Step-Rate Maturity Load (> 3 Yrs Retro)] applied delta: +45000 cents (New Total: %d cents)", calculatedCents));
        }

        // Rule 2: CA Judicial Venue Load -> +35,000 cents
        String state = String.valueOf(facts.get("state"));
        if ("CA".equalsIgnoreCase(state)) {
            calculatedCents += 35000L;
            firedRules.add("CA Judicial Venue Professional Liability Load");
            trace.add(String.format("Rule [CA Judicial Venue Professional Liability Load] applied delta: +35000 cents (New Total: %d cents)", calculatedCents));
        }

        // Rule 3: Claims-Free 5+ Years Risk Management Credit -> -25,000 cents
        Object claimFreeObj = facts.get("ClaimFreeYears");
        int claimFreeYears = claimFreeObj instanceof Number ? ((Number) claimFreeObj).intValue() : 0;
        if (claimFreeYears >= 5) {
            calculatedCents -= 25000L;
            firedRules.add("Claims-Free 5+ Years Risk Management Credit");
            trace.add(String.format("Rule [Claims-Free 5+ Years Risk Management Credit] applied delta: -25000 cents (New Total: %d cents)", calculatedCents));
        }

        // Rule 4: CEOL Defense Outside Limits
        Object ceolObj = facts.get("DefenseOutsideLimits");
        boolean ceol = Boolean.TRUE.equals(ceolObj) || "true".equalsIgnoreCase(String.valueOf(ceolObj));
        if (ceol) {
            long ceolDelta = (long) (calculatedCents * 0.12);
            calculatedCents += ceolDelta;
            firedRules.add("Defense Costs Outside Limits (CEOL) Endorsement");
            trace.add(String.format("Rule [Defense Costs Outside Limits (CEOL) Endorsement] applied delta: +%d cents (New Total: %d cents)", ceolDelta, calculatedCents));
        }

        // Rule 5: Adverse Malpractice / E&O Loss History Surcharge
        Object claimsCountObj = facts.get("PriorMalpracticeClaimsCount");
        int claimsCount = claimsCountObj instanceof Number ? ((Number) claimsCountObj).intValue() : 0;
        if (claimsCount > 0) {
            long surcharge = 50000L * claimsCount;
            calculatedCents += surcharge;
            firedRules.add("Adverse Malpractice / E&O Loss History Surcharge");
            trace.add(String.format("Rule [Adverse Malpractice / E&O Loss History Surcharge] applied delta: +%d cents (New Total: %d cents)", surcharge, calculatedCents));
        }

        long duration = System.currentTimeMillis() - startTime;
        String formattedCalcAmount = formatCentsToUsd(calculatedCents);
        String formattedBaseAmount = formatCentsToUsd(baseCents);

        return new RatingResponseDto(
                product != null ? product.productCode() : (req.productCode() != null ? req.productCode() : "TECH_EO"),
                product != null ? product.productName() : "Technology Errors & Omissions",
                plan != null ? plan.planCode() : "TECH_EO_COMMERCIAL",
                plan != null ? plan.planName() : "Standard Commercial Tech E&O Rating Plan",
                plan != null ? plan.ruleVersionId() : "v1.0.0",
                calculatedCents,
                formattedCalcAmount,
                baseCents,
                formattedBaseAmount,
                firedRules,
                trace,
                duration,
                "RATED",
                facts,
                "FALLBACK"
        );
    }

    /**
     * Converts cents into a formatted USD string (e.g. 305000 -> "$3,050.00").
     */
    public static String formatCentsToUsd(Long cents) {
        if (cents == null) return "$0.00";
        double dollars = cents / 100.0;
        DecimalFormat df = new DecimalFormat("$#,##0.00");
        return df.format(dollars);
    }

    /**
     * Parses user currency strings or numbers into exact cents.
     */
    public static long parseAmountCents(String raw, long defaultVal) {
        if (raw == null || raw.isBlank()) return defaultVal;
        try {
            String sanitized = raw.replaceAll("[^0-9.]", "");
            if (sanitized.isBlank()) return defaultVal;
            double val = Double.parseDouble(sanitized);
            // If value looks like whole dollars (e.g. 5000000 or 50000), convert to cents
            return Math.round(val * 100.0);
        } catch (Exception e) {
            return defaultVal;
        }
    }
}

