package com.example.heliosrating.brms;

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
     * Executes a RuleFlow graph starting at its designated root entry node.
     */
    public ExecutionResult execute(
            long flowId,
            Map<String, ExecutionNode> nodesById,
            Map<String, List<ExecutionEdge>> outgoingEdgesByNodeId,
            Map<String, Object> initialFacts
    ) {
        long startTimeNanos = System.nanoTime();
        String correlationId = "EXEC-" + UUID.randomUUID();
        Map<String, Object> workingMemory = new LinkedHashMap<>(initialFacts != null ? initialFacts : Collections.emptyMap());
        workingMemory.put("facts", workingMemory);

        List<ExecutionAuditStep> auditSteps = new ArrayList<>();

        ExecutionNode currentNode = nodesById.values().stream()
                .filter(ExecutionNode::isEntry)
                .findFirst()
                .orElse(null);

        if (currentNode == null) {
            return new ExecutionResult(correlationId, false, "Execution halted: Graph has no designated entry node.",
                    shallowCopy(workingMemory), auditSteps, 0);
        }

        int stepsCount = 0;
        try {
            while (currentNode != null) {
                stepsCount++;
                if (stepsCount > MAX_STEP_EXECUTION_CAP) {
                    throw new IllegalStateException("Potential infinite loop: Execution aborted after " + MAX_STEP_EXECUTION_CAP + " steps.");
                }

                Map<String, Object> factsBefore = shallowCopy(workingMemory);
                long nodeStart = System.nanoTime();
                String summary;

                switch (currentNode.type()) {
                    case RULESET -> {
                        summary = executeRulesetNode(currentNode, workingMemory);
                    }
                    case CONDITIONAL_SWITCH -> {
                        summary = "Evaluated branching conditions.";
                    }
                    case DECISION_TABLE -> {
                        summary = executeDecisionTableNode(currentNode, workingMemory);
                    }
                    case UI_ADJUSTMENT -> {
                        summary = executeUiAdjustmentNode(currentNode, workingMemory);
                    }
                    default -> summary = "Executed custom node.";
                }

                long nodeDuration = System.nanoTime() - nodeStart;
                Map<String, Object> factsAfter = shallowCopy(workingMemory);

                auditSteps.add(new ExecutionAuditStep(
                        stepsCount,
                        currentNode.nodeId(),
                        currentNode.name(),
                        currentNode.type(),
                        nodeDuration,
                        factsBefore,
                        factsAfter,
                        summary
                ));

                if (currentNode.isTerminal()) {
                    break;
                }

                currentNode = resolveNextNode(currentNode, outgoingEdgesByNodeId, nodesById, workingMemory);
            }

            long totalDurationMs = (System.nanoTime() - startTimeNanos) / 1_000_000;
            log.info("[{}] RuleFlow {} execution finished in {} ms over {} steps.", correlationId, flowId, totalDurationMs, stepsCount);
            return new ExecutionResult(correlationId, true, null, shallowCopy(workingMemory), auditSteps, totalDurationMs);

        } catch (Exception ex) {
            long totalDurationMs = (System.nanoTime() - startTimeNanos) / 1_000_000;
            log.error("[{}] RuleFlow {} execution failed at step {}: {}", correlationId, flowId, stepsCount, ex.getMessage(), ex);
            return new ExecutionResult(correlationId, false, ex.getMessage(), shallowCopy(workingMemory), auditSteps, totalDurationMs);
        }
    }

    private String executeRulesetNode(ExecutionNode node, Map<String, Object> memory) {
        String script = node.payloadScript();
        if (script == null || script.trim().isEmpty()) {
            return "No payload script defined; skipped.";
        }
        try {
            memory.put("facts", memory);
            Serializable compiled = MVEL.compileExpression(script);
            MVEL.executeExpression(compiled, memory);
            return "Executed MVEL script assignments.";
        } catch (Exception ex) {
            throw new RuntimeException("Ruleset Node [" + node.name() + "] failure: " + ex.getMessage(), ex);
        }
    }

    private String executeDecisionTableNode(ExecutionNode node, Map<String, Object> memory) {
        DecisionTableEngine.TableModel tableModel = node.decisionTableModel();
        if (tableModel == null) {
            return "Decision table model not bound to node; skipped.";
        }
        DecisionTableEngine.DecisionResult result = decisionTableEngine.evaluate(tableModel, memory);
        if (result.matched()) {
            memory.putAll(result.combinedActions());
            memory.put("facts", memory);
            return "Decision Table matched " + result.traces().size() + " rule rows.";
        }
        return "Decision Table matched 0 rule rows.";
    }

    private String executeUiAdjustmentNode(ExecutionNode node, Map<String, Object> memory) {
        if (!memory.containsKey("scheduleMod")) {
            memory.put("scheduleMod", new BigDecimal("1.00"));
        } else {
            Object rawMod = memory.get("scheduleMod");
            if (rawMod != null) {
                BigDecimal mod = new BigDecimal(rawMod.toString());
                BigDecimal min = new BigDecimal("0.75");
                BigDecimal max = new BigDecimal("1.25");
                if (mod.compareTo(min) < 0) mod = min;
                if (mod.compareTo(max) > 0) mod = max;
                memory.put("scheduleMod", mod.setScale(2, RoundingMode.HALF_UP));
            }
        }
        memory.put("facts", memory);
        return "Discretionary Schedule Modifier verified within filed regulatory bounds.";
    }

    private ExecutionNode resolveNextNode(
            ExecutionNode current,
            Map<String, List<ExecutionEdge>> edgeMap,
            Map<String, ExecutionNode> nodeMap,
            Map<String, Object> memory
    ) {
        List<ExecutionEdge> outgoing = edgeMap.getOrDefault(current.nodeId(), Collections.emptyList());
        if (outgoing.isEmpty()) {
            return null;
        }

        List<ExecutionEdge> sortedEdges = outgoing.stream()
                .sorted(Comparator.comparingInt(ExecutionEdge::evaluationOrder))
                .toList();

        ExecutionEdge defaultEdge = null;
        for (ExecutionEdge edge : sortedEdges) {
            if (edge.isDefault()) {
                defaultEdge = edge;
                continue;
            }
            String condition = edge.routingCondition();
            if (condition == null || condition.trim().isEmpty()) {
                return nodeMap.get(edge.targetNodeId());
            }
            try {
                memory.put("facts", memory);
                Object evalResult = MVEL.eval(condition, memory);
                if (Boolean.TRUE.equals(evalResult)) {
                    return nodeMap.get(edge.targetNodeId());
                }
            } catch (Exception ex) {
                log.warn("Edge condition [{}] evaluation error on Edge {}: {}", condition, edge.edgeId(), ex.getMessage());
            }
        }

        if (defaultEdge != null) {
            return nodeMap.get(defaultEdge.targetNodeId());
        }

        return null;
    }

    private Map<String, Object> shallowCopy(Map<String, Object> src) {
        Map<String, Object> copy = new LinkedHashMap<>();
        for (Map.Entry<String, Object> entry : src.entrySet()) {
            if ("facts".equals(entry.getKey())) continue;
            copy.put(entry.getKey(), entry.getValue());
        }
        return copy;
    }
}
