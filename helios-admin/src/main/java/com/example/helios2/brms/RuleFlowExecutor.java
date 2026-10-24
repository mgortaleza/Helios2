package com.example.helios2.brms;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.mvel2.MVEL;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.Serializable;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;

/**
 * Unified RuleFlow Orchestrator & State Machine.
 * Executes topological node graphs (RULESET, CONDITIONAL_SWITCH, DECISION_TABLE, UI_ADJUSTMENT).
 * Guarantees fact propagation safety and captures chronological audit trails for statutory compliance.
 */
@Service
public class RuleFlowExecutor {

    private static final Logger log = LoggerFactory.getLogger(RuleFlowExecutor.class);
    private static final int MAX_STEP_EXECUTION_CAP = 1000;

    private final DecisionTableEngine decisionTableEngine;
    private final ObjectMapper objectMapper;

    public RuleFlowExecutor(DecisionTableEngine decisionTableEngine, ObjectMapper objectMapper) {
        this.decisionTableEngine = decisionTableEngine;
        this.objectMapper = objectMapper;
    }

    public enum NodeType { RULESET, CONDITIONAL_SWITCH, DECISION_TABLE, UI_ADJUSTMENT }

    public record ExecutionNode(
            String nodeId,
            NodeType type,
            String name,
            boolean isEntry,
            boolean isTerminal,
            String payloadScript,
            DecisionTableEngine.TableModel decisionTableModel
    ) {}

    public record ExecutionEdge(
            String edgeId,
            String sourceNodeId,
            String targetNodeId,
            String sourceHandle,
            String routingCondition,
            int evaluationOrder,
            boolean isDefault
    ) {}

    public record ExecutionAuditStep(
            int stepIndex,
            String nodeId,
            String nodeName,
            NodeType nodeType,
            long executionTimeNanos,
            Map<String, Object> factsBefore,
            Map<String, Object> factsAfter,
            String evaluationSummary
    ) {}

    public record ExecutionResult(
            String correlationId,
            boolean success,
            String errorMessage,
            Map<String, Object> finalFacts,
            List<ExecutionAuditStep> auditTrail,
            long totalDurationMs
    ) {}

    /**
     * Coordinates transactional graph execution from entry to terminal state.
     */
    public ExecutionResult execute(
            long flowId,
            Map<String, ExecutionNode> nodes,
            Map<String, List<ExecutionEdge>> edges,
            Map<String, Object> inputFacts) {

        String correlationId = "EXEC-" + UUID.randomUUID();
        long startTime = System.currentTimeMillis();
        List<ExecutionAuditStep> auditTrail = new ArrayList<>();

        Map<String, Object> workingMemory = deepCopyAndNormalize(inputFacts != null ? inputFacts : Collections.emptyMap());

        ExecutionNode currentNode = nodes.values().stream()
                .filter(ExecutionNode::isEntry)
                .findFirst()
                .orElse(null);

        if (currentNode == null) {
            return new ExecutionResult(correlationId, false, "Execution failed: No root entry node found.", workingMemory, auditTrail, 0);
        }

        int stepCounter = 0;
        try {
            while (currentNode != null) {
                if (++stepCounter > MAX_STEP_EXECUTION_CAP) {
                    throw new IllegalStateException("Maximum execution step cap exceeded (" + MAX_STEP_EXECUTION_CAP + "). Infinite loop detected!");
                }

                long nodeStartNano = System.nanoTime();
                Map<String, Object> beforeSnapshot = shallowCopy(workingMemory);
                String stepSummary;

                log.debug("[{}] Step {}: Executing Node '{}' [{}]", correlationId, stepCounter, currentNode.name(), currentNode.type());

                // 1. Process Node Execution Logic
                switch (currentNode.type()) {
                    case RULESET -> {
                        executeRulesetScript(currentNode.payloadScript(), workingMemory);
                        stepSummary = "Executed MVEL script assignments.";
                    }
                    case DECISION_TABLE -> {
                        if (currentNode.decisionTableModel() != null) {
                            var dtResult = decisionTableEngine.evaluate(currentNode.decisionTableModel(), workingMemory);
                            stepSummary = String.format("Decision Table matched %d rule rows.", dtResult.matchedRules().size());
                        } else {
                            stepSummary = "Decision Table bypassed (no configuration model).";
                        }
                    }
                    case UI_ADJUSTMENT -> {
                        executeAdjustmentNode(currentNode.payloadScript(), workingMemory);
                        stepSummary = "Applied underwriting schedule/debit modifications.";
                    }
                    case CONDITIONAL_SWITCH -> {
                        stepSummary = "Evaluated branching conditions.";
                    }
                    default -> throw new IllegalArgumentException("Unsupported node archetype: " + currentNode.type());
                }

                long nodeDuration = System.nanoTime() - nodeStartNano;
                auditTrail.add(new ExecutionAuditStep(
                        stepCounter,
                        currentNode.nodeId(),
                        currentNode.name(),
                        currentNode.type(),
                        nodeDuration,
                        beforeSnapshot,
                        shallowCopy(workingMemory),
                        stepSummary
                ));

                if (currentNode.isTerminal()) {
                    log.debug("[{}] Reached terminal node '{}'. Halting execution.", correlationId, currentNode.name());
                    break;
                }

                // 2. Resolve Next Downstream Target Node via Edge Routing
                List<ExecutionEdge> outEdges = edges.getOrDefault(currentNode.nodeId(), Collections.emptyList());
                if (outEdges.isEmpty()) {
                    log.debug("[{}] Node '{}' has no outbound transitions. Completing flow.", correlationId, currentNode.name());
                    break;
                }

                currentNode = resolveNextNode(currentNode, outEdges, nodes, workingMemory);
            }

            long totalDuration = System.currentTimeMillis() - startTime;
            log.info("[{}] RuleFlow {} execution finished in {} ms over {} steps.",
                    correlationId, flowId, totalDuration, stepCounter);

            return new ExecutionResult(correlationId, true, null, workingMemory, auditTrail, totalDuration);

        } catch (Exception ex) {
            log.error("[{}] Execution failure at step {}: {}", correlationId, stepCounter, ex.getMessage(), ex);
            long totalDuration = System.currentTimeMillis() - startTime;
            return new ExecutionResult(correlationId, false, ex.getMessage(), workingMemory, auditTrail, totalDuration);
        }
    }

    private ExecutionNode resolveNextNode(
            ExecutionNode current,
            List<ExecutionEdge> outEdges,
            Map<String, ExecutionNode> nodes,
            Map<String, Object> workingMemory) {

        List<ExecutionEdge> sortedEdges = outEdges.stream()
                .sorted(Comparator.comparingInt(ExecutionEdge::evaluationOrder))
                .toList();

        ExecutionEdge selectedEdge = null;
        ExecutionEdge defaultEdge = null;

        for (ExecutionEdge edge : sortedEdges) {
            if (edge.isDefault()) {
                defaultEdge = edge;
                continue;
            }

            if (edge.routingCondition() != null && !edge.routingCondition().trim().isEmpty()) {
                try {
                    Serializable compiled = MVEL.compileExpression(edge.routingCondition());
                    Object res = MVEL.executeExpression(compiled, workingMemory);
                    if (Boolean.TRUE.equals(res)) {
                        selectedEdge = edge;
                        break;
                    }
                } catch (Exception e) {
                    log.warn("Edge condition '{}' failed evaluation: {}", edge.routingCondition(), e.getMessage());
                }
            } else {
                selectedEdge = edge;
                break;
            }
        }

        if (selectedEdge == null) {
            selectedEdge = defaultEdge;
        }

        if (selectedEdge == null) {
            log.warn("No valid outbound edge branch selected from Node '{}'. Flow halts.", current.name());
            return null;
        }

        return nodes.get(selectedEdge.targetNodeId());
    }

    private void executeRulesetScript(String script, Map<String, Object> context) {
        if (script == null || script.trim().isEmpty()) return;
        Serializable compiled = MVEL.compileExpression(script);
        MVEL.executeExpression(compiled, context);
    }

    private void executeAdjustmentNode(String expression, Map<String, Object> context) {
        if (expression == null || expression.trim().isEmpty()) return;

        context.forEach((k, v) -> {
            if (v instanceof Number && !(v instanceof BigDecimal)) {
                context.put(k, new BigDecimal(v.toString()));
            }
        });

        Serializable compiled = MVEL.compileExpression(expression);
        Object outcome = MVEL.executeExpression(compiled, context);

        if (outcome instanceof Map<?, ?> resultMap) {
            resultMap.forEach((k, v) -> context.put(k.toString(), v));
        } else if (outcome instanceof BigDecimal bd) {
            context.put("adjustedPremium", bd.setScale(2, RoundingMode.HALF_UP));
        }
    }

    private Map<String, Object> shallowCopy(Map<String, Object> src) {
        return new LinkedHashMap<>(src);
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> deepCopyAndNormalize(Map<String, Object> original) {
        try {
            String json = objectMapper.writeValueAsString(original);
            Map<String, Object> copy = objectMapper.readValue(json, LinkedHashMap.class);
            normalizeNumericValues(copy);
            return copy;
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Failed to initialize RuleFlow working memory clone", e);
        }
    }

    @SuppressWarnings("unchecked")
    private void normalizeNumericValues(Map<String, Object> map) {
        for (Map.Entry<String, Object> entry : map.entrySet()) {
            Object val = entry.getValue();
            if (val instanceof Double || val instanceof Float) {
                entry.setValue(BigDecimal.valueOf(((Number) val).doubleValue()).setScale(4, RoundingMode.HALF_UP));
            } else if (val instanceof Integer || val instanceof Long) {
                entry.setValue(new BigDecimal(val.toString()));
            } else if (val instanceof Map<?, ?> nested) {
                normalizeNumericValues((Map<String, Object>) nested);
            }
        }
    }
}
