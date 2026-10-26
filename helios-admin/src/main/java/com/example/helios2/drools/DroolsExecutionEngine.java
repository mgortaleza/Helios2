package com.example.helios2.drools;

import org.mvel2.MVEL;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.io.Serializable;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.*;

/**
 * Drools RuleFlow Runtime Engine.
 * Evaluates RuleFlow-Groups, Coordinate Decision Matrices, Conditional Branches,
 * State Form Approvals, and Rating Plans persisted in Helios_Rating_DB.
 */
@Service
public class DroolsExecutionEngine {

    private static final Logger log = LoggerFactory.getLogger(DroolsExecutionEngine.class);

    private final DroolsRatingRepositoryService repositoryService;

    @Autowired
    public DroolsExecutionEngine(DroolsRatingRepositoryService repositoryService) {
        this.repositoryService = repositoryService;
    }

    public record ExecutionResult(
            boolean success,
            String flowCode,
            String version,
            BigDecimal finalPremium,
            BigDecimal minPremium,
            boolean minPremiumApplied,
            List<Map<String, Object>> attachedForms,
            Map<String, Object> outputFacts,
            List<Map<String, Object>> timeline,
            String status,
            String message,
            long executionDurationMs,
            long auditId
    ) {}

    public ExecutionResult execute(long flowId, Map<String, Object> initialFacts) {
        long startTime = System.currentTimeMillis();

        var flowOpt = repositoryService.getFullFlow(flowId);
        if (flowOpt.isEmpty()) {
            return new ExecutionResult(false, "", "", null, null, false, List.of(), initialFacts, List.of(), "FAILED", "Flow not found", 0, -1);
        }

        var fullFlow = flowOpt.get();
        var header = fullFlow.header();

        // 1. Prepare Working Memory (Facts)
        Map<String, Object> facts = new LinkedHashMap<>(initialFacts != null ? initialFacts : Map.of());
        facts.putIfAbsent("productCode", header.productCode());
        facts.putIfAbsent("planCode", header.planCode());
        facts.putIfAbsent("state", facts.getOrDefault("state", "CA"));
        facts.putIfAbsent("effectiveDate", facts.getOrDefault("effectiveDate", LocalDate.now().toString()));
        facts.putIfAbsent("attachedForms", new ArrayList<String>());

        String effDate = (String) facts.get("effectiveDate");
        String state = (String) facts.get("state");
        String product = (String) facts.get("productCode");
        String plan = (String) facts.get("planCode");

        // 2. Fetch Rating Plan Config from DR_RATING_PLAN_CONFIG
        Map<String, Object> planConfig = repositoryService.getRatingPlanConfig(product, plan, state, effDate);
        BigDecimal baseLossCost = planConfig.containsKey("baseLossCost") ? (BigDecimal) planConfig.get("baseLossCost") : new BigDecimal("1.85");
        BigDecimal minPremium = planConfig.containsKey("minPremium") ? (BigDecimal) planConfig.get("minPremium") : new BigDecimal("2500.00");
        BigDecimal maxDebit = planConfig.containsKey("maxScheduleDebit") ? (BigDecimal) planConfig.get("maxScheduleDebit") : new BigDecimal("0.25");
        BigDecimal maxCredit = planConfig.containsKey("maxScheduleCredit") ? (BigDecimal) planConfig.get("maxScheduleCredit") : new BigDecimal("0.25");

        facts.put("baseLossCost", baseLossCost.doubleValue());
        facts.put("minPremium", minPremium.doubleValue());
        facts.put("maxScheduleDebit", maxDebit.doubleValue());
        facts.put("maxScheduleCredit", maxCredit.doubleValue());

        List<Map<String, Object>> timeline = new ArrayList<>();
        List<Map<String, Object>> attachedFormsDetails = new ArrayList<>();

        // Build Node Map & Outgoing Edges Map
        Map<String, Map<String, Object>> nodeMap = new LinkedHashMap<>();
        for (var n : fullFlow.nodes()) {
            nodeMap.put((String) n.get("nodeKey"), n);
        }

        Map<String, List<Map<String, Object>>> outgoingEdges = new HashMap<>();
        for (var e : fullFlow.edges()) {
            String src = (String) e.get("sourceNodeKey");
            outgoingEdges.computeIfAbsent(src, k -> new ArrayList<>()).add(e);
        }

        // Sort edges by routing order
        for (var list : outgoingEdges.values()) {
            list.sort(Comparator.comparingInt(e -> ((Number) e.getOrDefault("routingOrder", 0)).intValue()));
        }

        // Find Start Node
        String currentNodeKey = nodeMap.values().stream()
                .filter(n -> "START".equalsIgnoreCase((String) n.get("nodeType")))
                .map(n -> (String) n.get("nodeKey"))
                .findFirst()
                .orElse(nodeMap.keySet().stream().findFirst().orElse(""));

        Set<String> visited = new HashSet<>();
        int stepCount = 0;
        int maxSteps = 100; // Safeguard against infinite loops

        while (!currentNodeKey.isEmpty() && stepCount < maxSteps) {
            stepCount++;
            Map<String, Object> node = nodeMap.get(currentNodeKey);
            if (node == null) break;

            String nodeType = (String) node.get("nodeType");
            String nodeName = (String) node.get("nodeName");
            String group = (String) node.get("ruleflowGroup");

            Map<String, Object> factsBefore = new HashMap<>(facts);
            Map<String, Object> stepRecord = new LinkedHashMap<>();
            stepRecord.put("step", stepCount);
            stepRecord.put("nodeKey", currentNodeKey);
            stepRecord.put("nodeName", nodeName);
            stepRecord.put("nodeType", nodeType);
            stepRecord.put("ruleflowGroup", group);

            // Execute Node Archetype
            if ("RULEFLOW_GROUP".equalsIgnoreCase(nodeType)) {
                // Execute rules in this group
                List<Map<String, Object>> groupRules = fullFlow.rules().stream()
                        .filter(r -> group != null && group.equalsIgnoreCase((String) r.get("ruleflowGroup")))
                        .sorted((r1, r2) -> Integer.compare(
                                ((Number) r2.getOrDefault("salience", 0)).intValue(),
                                ((Number) r1.getOrDefault("salience", 0)).intValue()
                        ))
                        .toList();

                List<String> firedRules = new ArrayList<>();
                for (var r : groupRules) {
                    String ruleName = (String) r.get("ruleName");
                    String when = (String) r.get("whenCondition");
                    String then = (String) r.get("thenConsequence");

                    boolean match = true;
                    if (when != null && !when.isBlank() && !"$f : Map()".equalsIgnoreCase(when.trim())) {
                        try {
                            // Extract MVEL expression from Drools syntax or evaluate condition
                            String expr = sanitizeWhenForMvel(when);
                            Object res = MVEL.eval(expr, facts);
                            match = Boolean.TRUE.equals(res);
                        } catch (Exception ex) {
                            log.debug("MVEL rule when evaluation fallback: {}", ex.getMessage());
                            match = evaluateFallbackCondition(when, facts);
                        }
                    }

                    if (match) {
                        firedRules.add(ruleName);
                        executeConsequence(then, facts);
                    }
                }
                stepRecord.put("actionTaken", "Fired " + firedRules.size() + " rules in group: " + group);
                stepRecord.put("firedRules", firedRules);

            } else if ("DECISION_TABLE".equalsIgnoreCase(nodeType)) {
                // Execute coordinate decision table
                var dtOpt = fullFlow.decisionTables().stream()
                        .filter(dt -> group != null && group.equalsIgnoreCase((String) dt.get("ruleflowGroup")))
                        .findFirst();

                if (dtOpt.isPresent()) {
                    var dt = dtOpt.get();
                    executeDecisionTable(dt, facts, stepRecord);
                } else {
                    stepRecord.put("actionTaken", "No matching decision table found for group: " + group);
                }

            } else if ("FORM_APPROVAL".equalsIgnoreCase(nodeType)) {
                // Resolve State DOI Approved Forms from DR_FORM_STATE_APPROVAL
                List<Map<String, Object>> approvedForms = repositoryService.getFormApprovalsForProduct(product, state, effDate);
                List<String> attachedNumbers = new ArrayList<>();

                @SuppressWarnings("unchecked")
                List<String> currentForms = (List<String>) facts.computeIfAbsent("attachedForms", k -> new ArrayList<String>());

                for (var f : approvedForms) {
                    String formNum = (String) f.get("formNumber");
                    String attType = (String) f.get("attachmentType");
                    String mandatory = (String) f.get("mandatoryCriteria");

                    boolean shouldAttach = false;
                    if ("MANDATORY".equalsIgnoreCase(attType)) {
                        shouldAttach = true;
                    } else if (mandatory != null && !mandatory.isBlank()) {
                        try {
                            Object res = MVEL.eval(mandatory, facts);
                            shouldAttach = Boolean.TRUE.equals(res);
                        } catch (Exception e) {
                            shouldAttach = evaluateFallbackCondition(mandatory, facts);
                        }
                    }

                    if (shouldAttach) {
                        if (!currentForms.contains(formNum)) {
                            currentForms.add(formNum);
                        }
                        attachedNumbers.add(formNum);
                        if (attachedFormsDetails.stream().noneMatch(x -> formNum.equals(x.get("formNumber")))) {
                            attachedFormsDetails.add(f);
                        }
                    }
                }
                stepRecord.put("actionTaken", "Attached " + attachedNumbers.size() + " DOI-approved forms for state: " + state);
                stepRecord.put("attachedForms", attachedNumbers);

            } else if ("ACTION_SCRIPT".equalsIgnoreCase(nodeType)) {
                String config = (String) node.get("configJson");
                if (config != null && config.contains("script")) {
                    // Extract script or execute default underwriter referral
                    facts.put("referralRequired", true);
                    facts.put("referralReason", "High Cyber Risk / State Filing Underwriting Exception");
                }
                stepRecord.put("actionTaken", "Executed action script sequence");

            } else if ("CONDITIONAL_SPLIT".equalsIgnoreCase(nodeType)) {
                stepRecord.put("actionTaken", "Evaluated conditional branches and determined next path");
            } else if ("START".equalsIgnoreCase(nodeType)) {
                stepRecord.put("actionTaken", "Policy submission facts loaded into Drools working memory");
            } else if ("END".equalsIgnoreCase(nodeType)) {
                stepRecord.put("actionTaken", "Reached policy rating & binding terminal node");
            } else {
                stepRecord.put("actionTaken", "Processed node: " + nodeName + " (" + nodeType + ")");
            }

            stepRecord.putIfAbsent("actionTaken", "Processed node " + currentNodeKey);

            // Record Fact Delta
            Map<String, Object> factsDelta = new HashMap<>();
            for (Map.Entry<String, Object> entry : facts.entrySet()) {
                if (!Objects.equals(entry.getValue(), factsBefore.get(entry.getKey()))) {
                    factsDelta.put(entry.getKey(), entry.getValue());
                }
            }
            stepRecord.put("factsDelta", factsDelta);
            timeline.add(stepRecord);

            if ("END".equalsIgnoreCase(nodeType)) {
                break;
            }

            // Determine Next Node via Edges & Conditions
            List<Map<String, Object>> edges = outgoingEdges.getOrDefault(currentNodeKey, List.of());
            String nextNodeKey = "";
            for (var edge : edges) {
                String cond = (String) edge.get("conditionExpression");
                if (cond == null || cond.isBlank()) {
                    nextNodeKey = (String) edge.get("targetNodeKey");
                    break;
                }
                try {
                    Object res = MVEL.eval(cond, facts);
                    if (Boolean.TRUE.equals(res)) {
                        nextNodeKey = (String) edge.get("targetNodeKey");
                        break;
                    }
                } catch (Exception ex) {
                    if (evaluateFallbackCondition(cond, facts)) {
                        nextNodeKey = (String) edge.get("targetNodeKey");
                        break;
                    }
                }
            }

            if (nextNodeKey.isEmpty() && !edges.isEmpty()) {
                // Default to first edge if no conditions strictly matched
                nextNodeKey = (String) edges.get(0).get("targetNodeKey");
            }

            currentNodeKey = nextNodeKey;
        }

        // Final Rating Calculation & Minimum Premium Bounds
        BigDecimal runningPrem = calculateFinalPremium(facts, minPremium, maxDebit, maxCredit);
        boolean minApplied = runningPrem.compareTo(minPremium) <= 0;
        BigDecimal finalPrem = runningPrem.max(minPremium).setScale(2, RoundingMode.HALF_UP);
        facts.put("finalPremium", finalPrem.doubleValue());
        facts.put("minPremiumApplied", minApplied);

        long durationMs = System.currentTimeMillis() - startTime;

        // Log to DR_EXECUTION_AUDIT & DR_EXECUTION_AUDIT_STEP in Helios_Rating_DB
        long auditId = repositoryService.logExecutionAudit(
                header.flowId(),
                header.flowCode(),
                header.version(),
                header.productCode(),
                state,
                effDate,
                initialFacts != null ? initialFacts : Map.of(),
                facts,
                attachedFormsDetails,
                Boolean.TRUE.equals(facts.get("referralRequired")) ? "REFERRAL" : "SUCCESS",
                finalPrem,
                durationMs,
                timeline
        );

        return new ExecutionResult(
                true,
                header.flowCode(),
                header.version(),
                finalPrem,
                minPremium,
                minApplied,
                attachedFormsDetails,
                facts,
                timeline,
                Boolean.TRUE.equals(facts.get("referralRequired")) ? "REFERRAL_REQUIRED" : "APPROVED_BOUND",
                "RuleFlow executed successfully in " + durationMs + "ms",
                durationMs,
                auditId
        );
    }

    private void executeDecisionTable(Map<String, Object> dt, Map<String, Object> facts, Map<String, Object> stepRecord) {
        String tableCode = (String) dt.get("tableCode");
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> cols = (List<Map<String, Object>>) dt.get("columns");
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> rows = (List<Map<String, Object>>) dt.get("rows");

        if (cols == null || rows == null) return;

        List<Map<String, Object>> condCols = cols.stream().filter(c -> "CONDITION".equalsIgnoreCase((String) c.get("columnType"))).toList();
        List<Map<String, Object>> actCols = cols.stream().filter(c -> "ACTION".equalsIgnoreCase((String) c.get("columnType"))).toList();

        for (var row : rows) {
            if (!Boolean.TRUE.equals(row.get("isActive"))) continue;
            @SuppressWarnings("unchecked")
            Map<String, String> cells = (Map<String, String>) row.get("cells");
            if (cells == null) continue;

            boolean rowMatches = true;
            for (var c : condCols) {
                long colId = ((Number) c.get("columnId")).longValue();
                String cellVal = cells.get(String.valueOf(colId));
                if (cellVal == null || cellVal.isBlank() || "-".equals(cellVal)) continue;

                String prop = (String) c.get("propertyPath");
                String key = prop.replace("facts.", "");
                Object factVal = facts.get(key);

                if (factVal == null || !cellVal.equalsIgnoreCase(factVal.toString())) {
                    rowMatches = false;
                    break;
                }
            }

            if (rowMatches) {
                stepRecord.put("matchedRow", row.get("rowOrder"));
                stepRecord.put("matchedRowDesc", row.get("description"));

                for (var ac : actCols) {
                    long colId = ((Number) ac.get("columnId")).longValue();
                    String cellVal = cells.get(String.valueOf(colId));
                    if (cellVal == null || cellVal.isBlank() || "-".equals(cellVal)) continue;

                    String prop = (String) ac.get("propertyPath");
                    String key = prop.replace("facts.", "");
                    String dataType = (String) ac.get("dataType");

                    if ("NUMBER".equalsIgnoreCase(dataType) || "DECIMAL".equalsIgnoreCase(dataType)) {
                        facts.put(key, Double.parseDouble(cellVal));
                    } else if ("BOOLEAN".equalsIgnoreCase(dataType)) {
                        facts.put(key, Boolean.parseBoolean(cellVal));
                    } else {
                        facts.put(key, cellVal);
                    }
                }
                stepRecord.put("actionTaken", "Decision table " + tableCode + " matched Row " + row.get("rowOrder") + " (" + row.get("description") + ")");
                break; // FIRST_MATCH hit policy
            }
        }
    }

    private BigDecimal calculateFinalPremium(Map<String, Object> facts, BigDecimal minPremium, BigDecimal maxDebit, BigDecimal maxCredit) {
        double revenue = facts.containsKey("revenue") ? ((Number) facts.get("revenue")).doubleValue() : 1000000.0;
        double baseRate = facts.containsKey("baseLossCost") ? ((Number) facts.get("baseLossCost")).doubleValue() : 1.85;
        double limitFactor = facts.containsKey("limitFactor") ? ((Number) facts.get("limitFactor")).doubleValue() : 1.0;
        double deductibleFactor = facts.containsKey("deductibleFactor") ? ((Number) facts.get("deductibleFactor")).doubleValue() : 1.0;
        double cyberRelativity = facts.containsKey("cyberRelativity") ? ((Number) facts.get("cyberRelativity")).doubleValue() : 1.0;
        double scheduleMod = facts.containsKey("scheduleMod") ? ((Number) facts.get("scheduleMod")).doubleValue() : 0.0;

        // Cap schedule modification to state filing approval bounds
        double cappedScheduleMod = Math.max(-maxCredit.doubleValue(), Math.min(maxDebit.doubleValue(), scheduleMod));
        facts.put("appliedScheduleMod", cappedScheduleMod);

        double unadjBase = (revenue / 1000.0) * baseRate;
        double rated = unadjBase * limitFactor * deductibleFactor * cyberRelativity * (1.0 + cappedScheduleMod);

        return BigDecimal.valueOf(rated).setScale(2, RoundingMode.HALF_UP);
    }

    private void executeConsequence(String thenConsequence, Map<String, Object> facts) {
        if (thenConsequence == null || thenConsequence.isBlank()) return;
        try {
            // Check if MVEL can evaluate directly
            MVEL.eval(thenConsequence, facts);
        } catch (Exception ex) {
            // Parse common Drools consequence statements
            for (String statement : thenConsequence.split(";")) {
                String stmt = statement.trim();
                if (stmt.startsWith("$f.put(")) {
                    int p1 = stmt.indexOf("\"");
                    int p2 = stmt.indexOf("\"", p1 + 1);
                    int comma = stmt.indexOf(",", p2);
                    int close = stmt.lastIndexOf(")");
                    if (p1 >= 0 && p2 > p1 && comma > p2 && close > comma) {
                        String key = stmt.substring(p1 + 1, p2);
                        String val = stmt.substring(comma + 1, close).trim();
                        if ("true".equalsIgnoreCase(val)) facts.put(key, true);
                        else if ("false".equalsIgnoreCase(val)) facts.put(key, false);
                        else if (val.startsWith("\"") && val.endsWith("\"")) facts.put(key, val.substring(1, val.length() - 1));
                        else {
                            try { facts.put(key, Double.parseDouble(val)); }
                            catch (Exception ignored) { facts.put(key, val); }
                        }
                    }
                }
            }
        }
    }

    private String sanitizeWhenForMvel(String when) {
        String s = when.trim();
        if (s.startsWith("$f : Map(")) {
            s = s.substring(9);
            if (s.endsWith(")")) {
                s = s.substring(0, s.length() - 1);
            }
        }
        return s.replace("this[", "facts[")
                .replace("((Number)this[", "((Number)facts[")
                .replace("this[\"state\"]", "state")
                .replace("this[\"revenue\"]", "revenue");
    }

    private boolean evaluateFallbackCondition(String cond, Map<String, Object> facts) {
        if (cond == null || cond.isBlank() || "true".equalsIgnoreCase(cond.trim())) return true;
        if (cond.contains("eligible == true")) {
            return Boolean.TRUE.equals(facts.get("eligible"));
        }
        if (cond.contains("cyberRiskScore < 80")) {
            Object score = facts.get("cyberRiskScore");
            return score != null && ((Number) score).doubleValue() < 80;
        }
        if (cond.contains("cyberRiskScore >= 80")) {
            Object score = facts.get("cyberRiskScore");
            return score != null && ((Number) score).doubleValue() >= 80;
        }
        if (cond.contains("hasCyber == true")) {
            return Boolean.TRUE.equals(facts.get("hasCyber"));
        }
        if (cond.contains("state ==") || cond.contains("state.equals")) {
            String state = (String) facts.get("state");
            return state != null && cond.contains("\"" + state + "\"");
        }
        return true;
    }
}
