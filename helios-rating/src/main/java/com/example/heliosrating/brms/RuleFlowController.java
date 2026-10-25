package com.example.heliosrating.brms;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/v1/brms")
@CrossOrigin(origins = "*", allowedHeaders = "*")
public class RuleFlowController {

    private final GraphValidationService validationService;
    private final RuleFlowExecutor ruleFlowExecutor;
    private final RuleFlowRepositoryService repositoryService;

    @Autowired
    public RuleFlowController(
            GraphValidationService validationService,
            RuleFlowExecutor ruleFlowExecutor,
            RuleFlowRepositoryService repositoryService) {
        this.validationService = validationService;
        this.ruleFlowExecutor = ruleFlowExecutor;
        this.repositoryService = repositoryService;
    }

    @GetMapping("/flows")
    public ResponseEntity<List<RuleFlowRepositoryService.FlowHeaderDto>> listFlows(
            @RequestParam(name = "tenantId", defaultValue = "1") int tenantId,
            @RequestParam(name = "productCode", required = false) String productCode) {
        List<RuleFlowRepositoryService.FlowHeaderDto> flows = repositoryService.getFlowsForTenant(tenantId, productCode);
        return ResponseEntity.ok(flows);
    }

    @GetMapping("/flows/{id}")
    public ResponseEntity<RuleFlowRepositoryService.FlowFullDto> getFlow(@PathVariable("id") long flowId) {
        return repositoryService.getFullFlow(flowId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    public record CreateFlowRequest(
            int tenantId,
            String flowCode,
            String flowName,
            String description,
            String productCode,
            String planCode,
            String template
    ) {}

    @PostMapping("/flows")
    public ResponseEntity<RuleFlowRepositoryService.FlowHeaderDto> createFlow(@RequestBody CreateFlowRequest req) {
        int tenantId = req.tenantId() > 0 ? req.tenantId() : 1;
        RuleFlowRepositoryService.FlowHeaderDto created = repositoryService.createFlow(
                tenantId, req.flowCode(), req.flowName(), req.description(), req.productCode(), req.planCode(), req.template()
        );
        return ResponseEntity.ok(created);
    }

    public record UpdateFlowHeaderRequest(
            String flowName,
            String description,
            String productCode,
            String planCode,
            String status
    ) {}

    @PutMapping("/flows/{id}")
    public ResponseEntity<Void> updateFlow(@PathVariable("id") long flowId, @RequestBody UpdateFlowHeaderRequest req) {
        repositoryService.updateFlowHeader(flowId, req.flowName(), req.description(), req.productCode(), req.planCode(), req.status());
        return ResponseEntity.ok().build();
    }

    public record CloneVersionRequest(
            int requestedVersion,
            String description,
            String status
    ) {}

    @PostMapping("/flows/{id}/clone-version")
    public ResponseEntity<RuleFlowRepositoryService.FlowHeaderDto> cloneVersion(
            @PathVariable("id") long flowId,
            @RequestBody(required = false) CloneVersionRequest req) {
        int ver = req != null ? req.requestedVersion() : 0;
        String desc = req != null ? req.description() : null;
        String status = req != null ? req.status() : "DRAFT";
        RuleFlowRepositoryService.FlowHeaderDto cloned = repositoryService.cloneFlowAsNewVersion(flowId, ver, desc, status);
        return ResponseEntity.ok(cloned);
    }

    public record SaveLayoutRequest(
            String layoutJson,
            double zoom,
            double x,
            double y
    ) {}

    @RequestMapping(value = "/flows/{id}/layout", method = {RequestMethod.POST, RequestMethod.PUT})
    public ResponseEntity<Void> saveLayout(@PathVariable("id") long flowId, @RequestBody SaveLayoutRequest req) {
        repositoryService.saveCanvasLayout(flowId, req.layoutJson(), req.zoom(), req.x(), req.y());
        return ResponseEntity.ok().build();
    }

    public record ValidateGraphRequest(
            List<GraphValidationService.NodeDefinition> nodes,
            List<GraphValidationService.EdgeDefinition> edges
    ) {}

    @PostMapping("/validate")
    public ResponseEntity<GraphValidationService.ValidationResult> validateGraph(@RequestBody ValidateGraphRequest req) {
        var result = validationService.validateTopology(
                req.nodes() != null ? req.nodes() : Collections.emptyList(),
                req.edges() != null ? req.edges() : Collections.emptyList()
        );
        return ResponseEntity.ok(result);
    }

    public record ExecuteFlowRequest(
            Map<String, Object> inputFacts
    ) {}

    @PostMapping("/flows/{id}/execute")
    public ResponseEntity<RuleFlowExecutor.ExecutionResult> executeFlow(
            @PathVariable("id") long flowId,
            @RequestBody ExecuteFlowRequest req,
            @RequestParam(name = "tenantId", defaultValue = "1") int tenantId) {

        var flowOpt = repositoryService.getFullFlow(flowId);
        if (flowOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        var flow = flowOpt.get();

        // 1. Convert DB nodes to ExecutionNodes
        Map<String, RuleFlowExecutor.ExecutionNode> executionNodeMap = new LinkedHashMap<>();
        for (Map<String, Object> rawNode : flow.nodes()) {
            String clientKey = (String) rawNode.get("clientNodeKey");
            String nodeTypeStr = (String) rawNode.get("nodeType");
            RuleFlowExecutor.NodeType nodeType;
            try {
                nodeType = RuleFlowExecutor.NodeType.valueOf(nodeTypeStr);
            } catch (Exception e) {
                nodeType = RuleFlowExecutor.NodeType.RULESET;
            }

            DecisionTableEngine.TableModel tableModel = null;
            if (nodeType == RuleFlowExecutor.NodeType.DECISION_TABLE && !flow.decisionTables().isEmpty()) {
                long nodeId = ((Number) rawNode.get("nodeId")).longValue();
                var matchingTableOpt = flow.decisionTables().stream()
                        .filter(dt -> dt.get("nodeId") != null && ((Number) dt.get("nodeId")).longValue() == nodeId)
                        .findFirst();

                if (matchingTableOpt.isEmpty() && !flow.decisionTables().isEmpty()) {
                    matchingTableOpt = Optional.of(flow.decisionTables().get(0));
                }

                if (matchingTableOpt.isPresent()) {
                    var dt = matchingTableOpt.get();
                    tableModel = buildTableModelFromDto(dt);
                }
            }

            var execNode = new RuleFlowExecutor.ExecutionNode(
                    clientKey,
                    nodeType,
                    (String) rawNode.get("nodeName"),
                    Boolean.TRUE.equals(rawNode.get("isEntryNode")),
                    Boolean.TRUE.equals(rawNode.get("isTerminalNode")),
                    (String) rawNode.get("payloadScript"),
                    tableModel
            );
            executionNodeMap.put(clientKey, execNode);
        }

        // 2. Convert DB edges to ExecutionEdges
        Map<String, List<RuleFlowExecutor.ExecutionEdge>> executionEdgeMap = new LinkedHashMap<>();
        Map<Long, String> nodeIdToClientKey = new HashMap<>();
        for (Map<String, Object> rawNode : flow.nodes()) {
            nodeIdToClientKey.put(((Number) rawNode.get("nodeId")).longValue(), (String) rawNode.get("clientNodeKey"));
        }

        for (Map<String, Object> rawEdge : flow.edges()) {
            long srcId = ((Number) rawEdge.get("sourceNodeId")).longValue();
            long tgtId = ((Number) rawEdge.get("targetNodeId")).longValue();
            String sourceKey = nodeIdToClientKey.get(srcId);
            String targetKey = nodeIdToClientKey.get(tgtId);
            if (sourceKey == null || targetKey == null) continue;

            String edgeKey = (String) rawEdge.get("clientEdgeKey");
            String sourceHandle = (String) rawEdge.get("sourceHandle");
            String condition = (String) rawEdge.get("routingCondition");
            int order = rawEdge.get("evaluationOrder") != null ? ((Number) rawEdge.get("evaluationOrder")).intValue() : 1;
            boolean isDefault = Boolean.TRUE.equals(rawEdge.get("isDefaultBranch"));

            var edge = new RuleFlowExecutor.ExecutionEdge(edgeKey, sourceKey, targetKey, sourceHandle, condition, order, isDefault);
            executionEdgeMap.computeIfAbsent(sourceKey, k -> new ArrayList<>()).add(edge);
        }

        // 3. Execute
        var result = ruleFlowExecutor.execute(flowId, executionNodeMap, executionEdgeMap, req.inputFacts());

        // 4. Commit Regulatory Audit
        repositoryService.recordExecutionAudit(flowId, tenantId, result, req.inputFacts());

        return ResponseEntity.ok(result);
    }

    public record ExecuteByPlanRequest(
            String productCode,
            String planCode,
            Map<String, Object> inputFacts,
            Integer tenantId
    ) {}

    @PostMapping("/execute-by-plan")
    public ResponseEntity<RuleFlowExecutor.ExecutionResult> executeByPlan(
            @RequestBody ExecuteByPlanRequest req,
            @RequestParam(name = "tenantId", defaultValue = "1") int defaultTenantId) {
        int tenantId = (req.tenantId() != null && req.tenantId() > 0) ? req.tenantId() : defaultTenantId;

        List<RuleFlowRepositoryService.FlowHeaderDto> candidateFlows =
                repositoryService.getFlowsForTenant(tenantId, req.productCode());

        Optional<RuleFlowRepositoryService.FlowHeaderDto> match = candidateFlows.stream()
                .filter(f -> "ACTIVE".equalsIgnoreCase(f.status()))
                .filter(f -> req.planCode() == null || req.planCode().isBlank() || req.planCode().equalsIgnoreCase(f.planCode()))
                .findFirst();

        if (match.isEmpty()) {
            match = candidateFlows.stream().filter(f -> "ACTIVE".equalsIgnoreCase(f.status())).findFirst();
        }

        if (match.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        return executeFlow(match.get().flowId(), new ExecuteFlowRequest(req.inputFacts()), tenantId);
    }

    // --- Decision Matrix Endpoints ---

    @GetMapping("/decision-tables/{id}")
    public ResponseEntity<RuleFlowRepositoryService.DecisionMatrixDto> getDecisionTable(@PathVariable("id") long tableId) {
        try {
            var dto = repositoryService.getDecisionTable(tableId);
            return ResponseEntity.ok(dto);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.notFound().build();
        }
    }

    @PutMapping("/decision-tables/{id}")
    public ResponseEntity<RuleFlowRepositoryService.DecisionMatrixDto> updateDecisionTable(
            @PathVariable("id") long tableId,
            @RequestBody RuleFlowRepositoryService.DecisionMatrixDto dto) {
        var updated = repositoryService.updateDecisionMatrix(tableId, dto);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/decision-tables/{id}/rows/{rowId}")
    public ResponseEntity<Void> deleteDecisionTableRow(
            @PathVariable("id") long tableId,
            @PathVariable("rowId") long rowId) {
        repositoryService.deleteDecisionTableRow(tableId, rowId);
        return ResponseEntity.ok().build();
    }

    @SuppressWarnings("unchecked")
    private DecisionTableEngine.TableModel buildTableModelFromDto(Map<String, Object> dt) {
        long tableId = ((Number) dt.get("tableId")).longValue();
        String tableCode = (String) dt.get("tableCode");
        String hitPolicyStr = (String) dt.get("hitPolicy");
        DecisionTableEngine.HitPolicy hitPolicy = DecisionTableEngine.HitPolicy.FIRST_HIT;
        try {
            if (hitPolicyStr != null) hitPolicy = DecisionTableEngine.HitPolicy.valueOf(hitPolicyStr);
        } catch (Exception ignored) {}

        String aggField = (String) dt.get("aggregationField");

        List<Map<String, Object>> rawCols = (List<Map<String, Object>>) dt.get("columns");
        List<DecisionTableEngine.TableColumn> cols = new ArrayList<>();
        if (rawCols != null) {
            for (Map<String, Object> rc : rawCols) {
                long colId = ((Number) rc.get("columnId")).longValue();
                String colTypeStr = (String) rc.get("columnType");
                DecisionTableEngine.ColumnType colType = DecisionTableEngine.ColumnType.CONDITION;
                try {
                    if (colTypeStr != null) colType = DecisionTableEngine.ColumnType.valueOf(colTypeStr);
                } catch (Exception ignored) {}

                String attrKey = (String) rc.get("attributeKey");
                String dataType = (String) rc.get("dataType");
                int order = rc.get("displayOrder") != null ? ((Number) rc.get("displayOrder")).intValue() : 1;
                cols.add(new DecisionTableEngine.TableColumn(colId, colType, attrKey, dataType, order));
            }
        }

        List<Map<String, Object>> rawRows = (List<Map<String, Object>>) dt.get("rows");
        List<DecisionTableEngine.TableRow> rows = new ArrayList<>();
        if (rawRows != null) {
            for (Map<String, Object> rr : rawRows) {
                long rowId = ((Number) rr.get("rowId")).longValue();
                int rIdx = rr.get("rowIndex") != null ? ((Number) rr.get("rowIndex")).intValue() : 1;
                String desc = (String) rr.get("ruleDescription");
                rows.add(new DecisionTableEngine.TableRow(rowId, rIdx, desc));
            }
        }

        List<Map<String, Object>> rawCells = (List<Map<String, Object>>) dt.get("cells");
        Map<String, DecisionTableEngine.TableCell> cellsByCoord = new LinkedHashMap<>();
        if (rawCells != null) {
            for (Map<String, Object> rcell : rawCells) {
                long rowId = ((Number) rcell.get("rowId")).longValue();
                long colId = ((Number) rcell.get("columnId")).longValue();
                String expr = (String) rcell.get("expressionValue");
                cellsByCoord.put(rowId + "_" + colId, new DecisionTableEngine.TableCell(rowId, colId, expr));
            }
        }

        return new DecisionTableEngine.TableModel(tableId, tableCode, hitPolicy, aggField, cols, rows, cellsByCoord);
    }
}
