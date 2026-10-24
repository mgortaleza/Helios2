package com.example.helios2.brms;

import com.example.helios2.tenant.TenantContext;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

/**
 * REST Gateway for the BRMS RuleFlow Visualizer & Execution Platform.
 */
@RestController
@RequestMapping("/api/brms")
@CrossOrigin(origins = "*", allowedHeaders = "*")
public class RuleFlowController {

    private final RuleFlowRepositoryService repositoryService;
    private final GraphValidationService validationService;
    private final RuleFlowExecutor ruleFlowExecutor;

    @Autowired
    public RuleFlowController(RuleFlowRepositoryService repositoryService,
                              GraphValidationService validationService,
                              RuleFlowExecutor ruleFlowExecutor) {
        this.repositoryService = repositoryService;
        this.validationService = validationService;
        this.ruleFlowExecutor = ruleFlowExecutor;
    }

    @GetMapping("/flows")
    public ResponseEntity<List<RuleFlowRepositoryService.FlowHeaderDto>> listFlows(
            @RequestParam(name = "tenantId", required = false) Integer tenantIdParam) {
        int tenantId = (tenantIdParam != null && tenantIdParam > 0) ? tenantIdParam : TenantContext.getTenantId();
        return ResponseEntity.ok(repositoryService.getFlowsForTenant(tenantId));
    }

    @GetMapping("/flows/{id}")
    public ResponseEntity<?> getFlow(@PathVariable("id") long flowId) {
        return repositoryService.getFullFlow(flowId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    public record SaveLayoutRequest(String layoutJson, Double zoom, Double x, Double y) {}

    @PostMapping("/flows/{id}/layout")
    public ResponseEntity<?> saveLayout(@PathVariable("id") long flowId, @RequestBody SaveLayoutRequest req) {
        repositoryService.saveCanvasLayout(flowId,
                req.layoutJson() != null ? req.layoutJson() : "{}",
                req.zoom() != null ? req.zoom() : 1.0,
                req.x() != null ? req.x() : 0.0,
                req.y() != null ? req.y() : 0.0);
        return ResponseEntity.ok(Map.of("success", true, "flowId", flowId));
    }

    public record ValidateFlowRequest(
            List<GraphValidationService.NodeDefinition> nodes,
            List<GraphValidationService.EdgeDefinition> edges
    ) {}

    @PostMapping("/flows/{id}/validate")
    public ResponseEntity<GraphValidationService.ValidationResult> validateFlow(
            @PathVariable("id") long flowId,
            @RequestBody ValidateFlowRequest req) {
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
            @RequestHeader(name = "X-Tenant-ID", required = false) Integer headerTenantId) {

        int tenantId = (headerTenantId != null && headerTenantId > 0) ? headerTenantId : TenantContext.getTenantId();

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
            RuleFlowExecutor.NodeType nodeType = RuleFlowExecutor.NodeType.valueOf(nodeTypeStr);
            long dbNodeId = ((Number) rawNode.get("nodeId")).longValue();

            // Find matching decision table if applicable
            DecisionTableEngine.TableModel dtModel = null;
            if (nodeType == RuleFlowExecutor.NodeType.DECISION_TABLE) {
                var matchedTable = flow.decisionTables().stream()
                        .filter(t -> ((Number) t.get("nodeId")).longValue() == dbNodeId)
                        .findFirst();

                if (matchedTable.isPresent()) {
                    var t = matchedTable.get();
                    long tableId = ((Number) t.get("tableId")).longValue();
                    String code = (String) t.get("tableCode");
                    DecisionTableEngine.HitPolicy hitPolicy = DecisionTableEngine.HitPolicy.valueOf((String) t.get("hitPolicy"));
                    String aggField = (String) t.get("aggregationField");

                    @SuppressWarnings("unchecked")
                    List<Map<String, Object>> rawCols = (List<Map<String, Object>>) t.get("columns");
                    @SuppressWarnings("unchecked")
                    List<Map<String, Object>> rawRows = (List<Map<String, Object>>) t.get("rows");
                    @SuppressWarnings("unchecked")
                    List<Map<String, Object>> rawCells = (List<Map<String, Object>>) t.get("cells");

                    List<DecisionTableEngine.TableColumn> cols = new ArrayList<>();
                    for (Map<String, Object> rc : rawCols) {
                        cols.add(new DecisionTableEngine.TableColumn(
                                ((Number) rc.get("ColumnId")).longValue(),
                                DecisionTableEngine.ColumnType.valueOf((String) rc.get("ColumnType")),
                                (String) rc.get("AttributeKey"),
                                (String) rc.get("DataType"),
                                ((Number) rc.get("DisplayOrder")).intValue()
                        ));
                    }

                    List<DecisionTableEngine.TableRow> rows = new ArrayList<>();
                    for (Map<String, Object> rr : rawRows) {
                        rows.add(new DecisionTableEngine.TableRow(
                                ((Number) rr.get("RowId")).longValue(),
                                ((Number) rr.get("RowIndex")).intValue(),
                                (String) rr.get("RuleDescription")
                        ));
                    }

                    Map<String, DecisionTableEngine.TableCell> cellsByCoord = new HashMap<>();
                    for (Map<String, Object> rcell : rawCells) {
                        long rId = ((Number) rcell.get("RowId")).longValue();
                        long cId = ((Number) rcell.get("ColumnId")).longValue();
                        String expr = (String) rcell.get("ExpressionValue");
                        cellsByCoord.put(rId + "_" + cId, new DecisionTableEngine.TableCell(rId, cId, expr));
                    }

                    dtModel = new DecisionTableEngine.TableModel(tableId, code, hitPolicy, aggField, cols, rows, cellsByCoord);
                }
            }

            executionNodeMap.put(clientKey, new RuleFlowExecutor.ExecutionNode(
                    clientKey,
                    nodeType,
                    (String) rawNode.get("nodeName"),
                    Boolean.TRUE.equals(rawNode.get("isEntryNode")),
                    Boolean.TRUE.equals(rawNode.get("isTerminalNode")),
                    (String) rawNode.get("payloadScript"),
                    dtModel
            ));
        }

        // 2. Convert DB edges to ExecutionEdges
        Map<String, List<RuleFlowExecutor.ExecutionEdge>> executionEdgeMap = new LinkedHashMap<>();
        for (Map<String, Object> rawEdge : flow.edges()) {
            String sourceKey = (String) rawEdge.get("sourceClientKey");
            String targetKey = (String) rawEdge.get("targetClientKey");
            String edgeKey = (String) rawEdge.get("clientEdgeKey");
            String condition = (String) rawEdge.get("routingCondition");
            int order = ((Number) rawEdge.get("evaluationOrder")).intValue();
            boolean isDefault = Boolean.TRUE.equals(rawEdge.get("isDefaultBranch"));
            String sourceHandle = (String) rawEdge.get("sourceHandle");

            var edge = new RuleFlowExecutor.ExecutionEdge(edgeKey, sourceKey, targetKey, sourceHandle, condition, order, isDefault);
            executionEdgeMap.computeIfAbsent(sourceKey, k -> new ArrayList<>()).add(edge);
        }

        // 3. Execute
        var result = ruleFlowExecutor.execute(flowId, executionNodeMap, executionEdgeMap, req.inputFacts());

        // 4. Commit Regulatory Audit
        repositoryService.recordExecutionAudit(flowId, tenantId, result, req.inputFacts());

        return ResponseEntity.ok(result);
    }
}
