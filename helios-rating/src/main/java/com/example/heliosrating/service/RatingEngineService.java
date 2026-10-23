package com.example.heliosrating.service;

import com.example.heliosrating.model.RatePlanVersion;
import com.example.heliosrating.model.RatingRequest;
import com.example.heliosrating.model.RatingResult;
import com.example.heliosrating.repository.RatingRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
public class RatingEngineService {

    @Autowired
    private RatingRepository repository;

    public RatingResult rate(RatingRequest req) {
        RatingResult result = new RatingResult();
        List<String> trace = new ArrayList<>();

        // 1. Resolve State-Approved Rating Plan Version
        RatePlanVersion version = repository.findActiveVersion(
                req.getProductCode(),
                req.getStateCode(),
                req.getEffectiveDate(),
                req.getBusinessType()
        );

        result.setProductCode(version.getProductCode());
        result.setPlanCode(version.getPlanCode());
        result.setResolvedFilingVersion(version.getVersionNumber());
        result.setStateCode(version.getStateCode());
        result.setSerffTrackingNumber(version.getSerffTrackingNumber());
        result.setMinimumPremium(version.getMinPremium());

        trace.add(String.format("1. [State Filing Resolution] Product: %s | State: %s | SERFF: %s | Version: %s (Eff: %s to %s)",
                version.getProductCode(), version.getStateCode(), version.getSerffTrackingNumber(), version.getVersionNumber(),
                version.getNewBizEffectiveDate(), version.getExpirationDate() != null ? version.getExpirationDate() : "Open"));

        // 2. Exposure Normalization
        BigDecimal rawExposure = req.getExposureValue();
        BigDecimal exposureUnits;
        if ("MED_MAL".equalsIgnoreCase(version.getProductCode())) {
            exposureUnits = rawExposure.max(BigDecimal.ONE);
            trace.add(String.format("2. [Exposure Basis] Provider Headcount: %s doctor(s)", exposureUnits));
        } else if ("DNO".equalsIgnoreCase(version.getProductCode())) {
            exposureUnits = rawExposure.divide(new BigDecimal("1000000"), 4, RoundingMode.HALF_UP).max(new BigDecimal("0.5"));
            trace.add(String.format("2. [Exposure Basis] Assets per $1M: %s units (from $%s)", exposureUnits, rawExposure));
        } else {
            // Default Commercial Revenue per $1,000
            exposureUnits = rawExposure.divide(new BigDecimal("1000"), 4, RoundingMode.HALF_UP).max(new BigDecimal("10"));
            trace.add(String.format("2. [Exposure Basis] Gross Revenue per $1k: %s units (from $%s)", exposureUnits, rawExposure));
        }
        result.setExposureUnits(exposureUnits);

        // 3. Base Loss Cost Lookup
        BigDecimal baseRate = repository.getBaseRate(version.getProductCode(), req.getClassCode());
        BigDecimal basePremium = exposureUnits.multiply(baseRate).setScale(2, RoundingMode.HALF_UP);
        result.setBaseRate(baseRate);
        result.setBasePremium(basePremium);
        trace.add(String.format("3. [Base Rate] Class: %s -> Base Rate: $%s -> Base Premium: $%s",
                req.getClassCode() != null ? req.getClassCode() : "DEFAULT", baseRate, basePremium));

        // 4. Territory Relativity Factor
        BigDecimal territoryFactor = repository.getTerritoryFactor(req.getStateCode(), req.getTerritoryCode());
        result.setTerritoryFactor(territoryFactor);
        trace.add(String.format("4. [Territory] State: %s | Territory: %s -> Multiplier: %s",
                req.getStateCode(), req.getTerritoryCode() != null ? req.getTerritoryCode() : "DEFAULT", territoryFactor));

        // 5. Limit Relativity Factor
        BigDecimal limitFactor = repository.getLimitFactor(req.getOccurrenceLimit());
        result.setLimitRelativityFactor(limitFactor);
        trace.add(String.format("5. [Limit Relativity] Occurrence Limit: $%s / Agg: $%s -> Factor: %s",
                req.getOccurrenceLimit(), req.getAggregateLimit(), limitFactor));

        // 6. Deductible / Retention Relativity Factor
        BigDecimal deductibleFactor = repository.getDeductibleFactor(req.getRetentionAmount());
        result.setDeductibleFactor(deductibleFactor);
        trace.add(String.format("6. [Retention Relativity] Self-Insured Retention: $%s -> Factor: %s",
                req.getRetentionAmount(), deductibleFactor));

        // Subtotal before schedule rating
        BigDecimal subtotal = basePremium
                .multiply(territoryFactor)
                .multiply(limitFactor)
                .multiply(deductibleFactor)
                .setScale(2, RoundingMode.HALF_UP);
        result.setSubtotalPremium(subtotal);
        trace.add(String.format("7. [Subtotal Premium] Base ($%s) * Terr (%s) * Limit (%s) * Ret (%s) = $%s",
                basePremium, territoryFactor, limitFactor, deductibleFactor, subtotal));

        // 7. Schedule Rating & State DOI Statutory Capping
        BigDecimal requestedMod = req.getScheduleMod();
        BigDecimal maxCredit = version.getMaxScheduleCreditPct(); // e.g. 0.25 (allows mod down to 0.75)
        BigDecimal maxDebit = version.getMaxScheduleDebitPct();   // e.g. 0.25 (allows mod up to 1.25)
        BigDecimal minAllowedMod = BigDecimal.ONE.subtract(maxCredit);
        BigDecimal maxAllowedMod = BigDecimal.ONE.add(maxDebit);

        BigDecimal clampedMod = requestedMod.max(minAllowedMod).min(maxAllowedMod);
        result.setScheduleModifier(clampedMod);

        BigDecimal scheduledPremium = subtotal.multiply(clampedMod).setScale(2, RoundingMode.HALF_UP);
        BigDecimal adjustment = scheduledPremium.subtract(subtotal);
        result.setScheduleAdjustmentAmount(adjustment);
        trace.add(String.format("8. [Schedule Rating] Requested Mod: %s -> State Capped [%s to %s]: %s -> Adjustment: $%s",
                requestedMod, minAllowedMod, maxAllowedMod, clampedMod, adjustment));

        // 8. Minimum Earned / Filed Premium Check
        BigDecimal finalPremium = scheduledPremium;
        if (scheduledPremium.compareTo(version.getMinPremium()) < 0) {
            finalPremium = version.getMinPremium();
            trace.add(String.format("9. [Minimum Premium] Scheduled $%s below filed state minimum $%s. Premium adjusted to $%s.",
                    scheduledPremium, version.getMinPremium(), finalPremium));
        } else {
            trace.add(String.format("9. [Minimum Premium] Final premium $%s satisfies state minimum threshold ($%s).",
                    finalPremium, version.getMinPremium()));
        }
        result.setFinalAnnualPremium(finalPremium);

        // 9. Underwriting Referral Guidelines Evaluation
        List<String> referrals = new ArrayList<>();
        if (req.getOccurrenceLimit() > 5000000L) {
            referrals.add("SENIOR_UW_REFERRAL: Occurrence limit exceeds standard $5M branch authority.");
        }
        if (req.getRiskAnswers() != null) {
            Object losses = req.getRiskAnswers().get("priorLossesCount");
            if (losses != null && Integer.parseInt(String.valueOf(losses)) > 0) {
                referrals.add("CLAIMS_REVIEW_REFERRAL: Account has prior loss history; requires 5-year hard copy loss runs.");
            }
        }
        if (clampedMod.compareTo(new BigDecimal("0.85")) < 0) {
            referrals.add("MANAGEMENT_SIGN_OFF: Schedule credit exceeds 15%; requires Branch Underwriting Manager approval.");
        }
        result.setUnderwritingReferrals(referrals);
        result.setRatingStatus(referrals.isEmpty() ? "RATED" : "REFERRED");

        // 10. Form & Endorsement Attachment Logic
        List<String> forms = new ArrayList<>();
        if ("TECH_EO".equalsIgnoreCase(version.getProductCode())) {
            forms.add("EO-2025-BASE (Standard Technology E&O Policy Jacket)");
            forms.add("CYBER-104-SEC (Security Breach & Regulatory Defense Endorsement)");
        } else if ("MED_MAL".equalsIgnoreCase(version.getProductCode())) {
            forms.add("MM-2025-CMP (Claims-Made Medical Professional Liability Form)");
            forms.add("MM-NOSE-COV (Prior Acts Retroactive Date Coverage Endorsement)");
        } else {
            forms.add("DNO-2025-EXEC (Executive Protection & Entity Coverage Form)");
        }

        // State specific endorsements
        if ("CA".equalsIgnoreCase(version.getStateCode())) {
            forms.add("CA-NOTICE-60D (California 60-Day Notice of Cancellation/Nonrenewal)");
        } else if ("NY".equalsIgnoreCase(version.getStateCode())) {
            forms.add("NY-DFS-REG500 (New York Cybersecurity Certification Addendum)");
        } else if ("FL".equalsIgnoreCase(version.getStateCode())) {
            forms.add("FL-SURPLUS-01 (Florida Notice of Surplus Lines Placement)");
        }

        result.setAttachedForms(forms);
        result.setCalculationTrace(trace);
        return result;
    }
}
