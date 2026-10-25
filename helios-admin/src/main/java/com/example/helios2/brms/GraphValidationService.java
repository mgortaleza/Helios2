package com.example.helios2.brms;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.*;

/**
 * Validates RuleFlow Directed Acyclic Graph (DAG) topologies.
 * Enforces execution determinism by rejecting circular deadlocks via Kahn's Algorithm
 * and asserting structural continuity prior to database persistence.
 */
@Service
public class GraphValidationService {

    private static final Logger log = LoggerFactory.getLogger(GraphValidationService.class);

    public record NodeDefinition(String nodeId, String nodeType, boolean isEntryNode) {}
    public record EdgeDefinition(String sourceId, String targetId, String conditionExpression, boolean isDefault) {}

    public record ValidationResult(
            boolean isValid,
            List<String> topologicalOrder,
            List<String> errorMessages,
            List<String> warningMessages
    ) {}

    /**
     * Executes strict DAG validation using Kahn's topological sorting algorithm.
     *
     * @param nodes Collection of logical graph nodes
     * @param edges Collection of directed routing edges
     * @return Detailed validation report containing topological execution order or circular path errors
     */
    public ValidationResult validateTopology(Collection<NodeDefinition> nodes, Collection<EdgeDefinition> edges) {
        List<String> errors = new ArrayList<>();
        List<String> warnings = new ArrayList<>();
        List<String> topologicalOrder = new ArrayList<>();

        if (nodes == null || nodes.isEmpty()) {
            errors.add("RuleFlow graph must contain at least one operational node.");
            return new ValidationResult(false, Collections.emptyList(), errors, warnings);
        }

        // 1. Structural Checks: Validate Entry Node Isolation
        List<NodeDefinition> entryNodes = nodes.stream().filter(NodeDefinition::isEntryNode).toList();
        if (entryNodes.isEmpty()) {
            errors.add("RuleFlow has no entry point defined. Exactly one node must have isEntryNode=true.");
        } else if (entryNodes.size() > 1) {
            errors.add("Multiple entry points detected (" + entryNodes.size() + "). RuleFlow execution requires a single root.");
        }

        Set<String> registeredNodeIds = new HashSet<>();
        for (NodeDefinition node : nodes) {
            if (!registeredNodeIds.add(node.nodeId())) {
                errors.add("Duplicate NodeId encountered: " + node.nodeId());
            }
        }

        // 2. Build Ingress/Egress Adjacency Matrix
        Map<String, Set<String>> adjacency = new HashMap<>();
        Map<String, Integer> inDegree = new HashMap<>();

        for (String id : registeredNodeIds) {
            adjacency.put(id, new HashSet<>());
            inDegree.put(id, 0);
        }

        for (EdgeDefinition edge : edges) {
            if (!registeredNodeIds.contains(edge.sourceId())) {
                errors.add("Edge references non-existent source node: " + edge.sourceId());
                continue;
            }
            if (!registeredNodeIds.contains(edge.targetId())) {
                errors.add("Edge references non-existent target node: " + edge.targetId());
                continue;
            }
            if (edge.sourceId().equals(edge.targetId())) {
                errors.add("Direct self-referencing loop detected on Node: " + edge.sourceId());
                continue;
            }

            boolean added = adjacency.get(edge.sourceId()).add(edge.targetId());
            if (added) {
                inDegree.put(edge.targetId(), inDegree.get(edge.targetId()) + 1);
            }
        }

        if (!errors.isEmpty()) {
            return new ValidationResult(false, Collections.emptyList(), errors, warnings);
        }

        // 3. Kahn's Algorithm for Topological Sort & Cycle Detection
        Queue<String> zeroInDegreeQueue = new ArrayDeque<>();
        for (Map.Entry<String, Integer> entry : inDegree.entrySet()) {
            if (entry.getValue() == 0) {
                zeroInDegreeQueue.add(entry.getKey());
            }
        }

        // Verify root node is in zero in-degree set
        if (!entryNodes.isEmpty()) {
            String rootId = entryNodes.get(0).nodeId();
            if (inDegree.getOrDefault(rootId, -1) > 0) {
                errors.add("Entry node '" + rootId + "' has inbound edges, which can lead to premature recursion.");
            }
        }

        int processedNodeCount = 0;
        while (!zeroInDegreeQueue.isEmpty()) {
            String current = zeroInDegreeQueue.poll();
            topologicalOrder.add(current);
            processedNodeCount++;

            for (String neighbor : adjacency.get(current)) {
                int updatedInDegree = inDegree.get(neighbor) - 1;
                inDegree.put(neighbor, updatedInDegree);
                if (updatedInDegree == 0) {
                    zeroInDegreeQueue.add(neighbor);
                }
            }
        }

        // 4. Circular Dependency Assertion
        if (processedNodeCount < registeredNodeIds.size()) {
            List<String> cycleCulprits = inDegree.entrySet().stream()
                    .filter(e -> e.getValue() > 0)
                    .map(Map.Entry::getKey)
                    .toList();
            errors.add("Circular dependency detected! Cycle spans through nodes: " + cycleCulprits);
            return new ValidationResult(false, Collections.emptyList(), errors, warnings);
        }

        // 5. Connectivity Diagnostic: Unreachable Node Detection
        if (!entryNodes.isEmpty()) {
            Set<String> reachableNodes = new HashSet<>();
            Queue<String> reachQueue = new ArrayDeque<>();
            reachQueue.add(entryNodes.get(0).nodeId());
            reachableNodes.add(entryNodes.get(0).nodeId());

            while (!reachQueue.isEmpty()) {
                String curr = reachQueue.poll();
                for (String child : adjacency.get(curr)) {
                    if (reachableNodes.add(child)) {
                        reachQueue.add(child);
                    }
                }
            }

            for (String nodeId : registeredNodeIds) {
                if (!reachableNodes.contains(nodeId)) {
                    warnings.add("Node '" + nodeId + "' is orphan/unreachable from root entry point.");
                }
            }
        }

        log.info("RuleFlow topology verified. Sequential order: {}", topologicalOrder);
        return new ValidationResult(true, topologicalOrder, errors, warnings);
    }
}
