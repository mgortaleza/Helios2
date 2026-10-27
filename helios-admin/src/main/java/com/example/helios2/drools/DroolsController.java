package com.example.helios2.drools;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

/**
 * REST API Controller for Drools RuleFlow Visualizer, DRL Generator,
 * Forms State Approval Management, and Rating Plans Execution.
 */
@RestController
@RequestMapping("/api/drools")
@CrossOrigin(origins = "*", allowedHeaders = "*")
public class DroolsController {

    private final DroolsRatingRepositoryService repositoryService;
    private final DroolsDrlGenerator drlGenerator;
    private final DroolsExecutionEngine executionEngine;

    @Autowired
    public DroolsController(DroolsRatingRepositoryService repositoryService,
                            DroolsDrlGenerator drlGenerator,
                            DroolsExecutionEngine executionEngine) {
        this.repositoryService = repositoryService;
        this.drlGenerator = drlGenerator;
        this.executionEngine = executionEngine;
    }

    // =========================================================================
    // RULEFLOWS
    // =========================================================================

    @GetMapping("/flows")
    public ResponseEntity<List<DroolsRatingRepositoryService.FlowHeaderDto>> listFlows(
            @RequestParam(name = "productCode", required = false) String productCode,
            @RequestParam(name = "stateCode", required = false) String stateCode,
            @RequestParam(name = "status", required = false) String status) {
        return ResponseEntity.ok(repositoryService.getFlows(productCode, stateCode, status));
    }

    @GetMapping("/flows/{id}")
    public ResponseEntity<?> getFlow(@PathVariable("id") long flowId) {
        return repositoryService.getFullFlow(flowId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    public record CreateFlowRequest(
            String flowCode,
            String flowName,
            String description,
            String productCode,
            String planCode,
            String stateCode,
            String flowType,
            String version,
            String effectiveDate,
            String expirationDate,
            String serffTrackingNo,
            String packageName
    ) {}

    @PostMapping("/flows")
    public ResponseEntity<DroolsRatingRepositoryService.FlowHeaderDto> createFlow(@RequestBody CreateFlowRequest req) {
        var created = repositoryService.createRuleFlow(
                req.flowCode(),
                req.flowName(),
                req.description(),
                req.productCode(),
                req.planCode(),
                req.stateCode(),
                req.flowType(),
                req.version(),
                req.effectiveDate(),
                req.expirationDate(),
                req.serffTrackingNo(),
                req.packageName()
        );
        return ResponseEntity.ok(created);
    }

    public record UpdateFlowRequest(
            String flowName,
            String description,
            String productCode,
            String planCode,
            String stateCode,
            String version,
            String status,
            String effectiveDate,
            String expirationDate,
            String serffTrackingNo
    ) {}

    @PutMapping("/flows/{id}")
    public ResponseEntity<?> updateFlow(@PathVariable("id") long flowId, @RequestBody UpdateFlowRequest req) {
        repositoryService.updateRuleFlowHeader(
                flowId,
                req.flowName(),
                req.description(),
                req.productCode(),
                req.planCode(),
                req.stateCode(),
                req.version(),
                req.status(),
                req.effectiveDate(),
                req.expirationDate(),
                req.serffTrackingNo()
        );
        return ResponseEntity.ok(Map.of("success", true, "flowId", flowId));
    }

    @DeleteMapping("/flows/{id}")
    public ResponseEntity<?> deleteFlow(@PathVariable("id") long flowId) {
        repositoryService.deleteFlow(flowId);
        return ResponseEntity.ok(Map.of("success", true, "deletedFlowId", flowId));
    }

    public record CloneVersionRequest(
            String newVersion,
            String effectiveDate,
            String expirationDate
    ) {}

    @PostMapping("/flows/{id}/clone-version")
    public ResponseEntity<DroolsRatingRepositoryService.FlowHeaderDto> cloneVersion(
            @PathVariable("id") long flowId,
            @RequestBody CloneVersionRequest req) {
        var cloned = repositoryService.cloneFlowVersion(
                flowId,
                req.newVersion(),
                req.effectiveDate(),
                req.expirationDate()
        );
        return ResponseEntity.ok(cloned);
    }

    public record SaveLayoutRequest(String layoutJson) {}

    @PostMapping("/flows/{id}/layout")
    public ResponseEntity<?> saveLayout(@PathVariable("id") long flowId, @RequestBody SaveLayoutRequest req) {
        repositoryService.saveLayout(flowId, req.layoutJson());
        return ResponseEntity.ok(Map.of("success", true, "flowId", flowId));
    }

    // =========================================================================
    // NODES, EDGES, AND RULES MANAGEMENT
    // =========================================================================

    @PostMapping("/flows/{id}/nodes")
    public ResponseEntity<?> saveNode(@PathVariable("id") long flowId, @RequestBody Map<String, Object> nodeData) {
        var saved = repositoryService.saveNode(flowId, nodeData);
        return ResponseEntity.ok(saved);
    }

    @DeleteMapping("/flows/{id}/nodes/{nodeKey}")
    public ResponseEntity<?> deleteNode(@PathVariable("id") long flowId, @PathVariable("nodeKey") String nodeKey) {
        repositoryService.deleteNode(flowId, nodeKey);
        return ResponseEntity.ok(Map.of("success", true, "deletedNodeKey", nodeKey));
    }

    @PostMapping("/flows/{id}/edges")
    public ResponseEntity<?> saveEdge(@PathVariable("id") long flowId, @RequestBody Map<String, Object> edgeData) {
        var saved = repositoryService.saveEdge(flowId, edgeData);
        return ResponseEntity.ok(saved);
    }

    @DeleteMapping("/flows/{id}/edges/{edgeKey}")
    public ResponseEntity<?> deleteEdge(@PathVariable("id") long flowId, @PathVariable("edgeKey") String edgeKey) {
        repositoryService.deleteEdge(flowId, edgeKey);
        return ResponseEntity.ok(Map.of("success", true, "deletedEdgeKey", edgeKey));
    }

    @PostMapping("/flows/{id}/rules")
    public ResponseEntity<?> saveRule(@PathVariable("id") long flowId, @RequestBody Map<String, Object> ruleData) {
        repositoryService.saveRule(flowId, ruleData);
        return ResponseEntity.ok(Map.of("success", true));
    }

    @DeleteMapping("/flows/{id}/rules/{ruleId}")
    public ResponseEntity<?> deleteRule(@PathVariable("id") long flowId, @PathVariable("ruleId") long ruleId) {
        repositoryService.deleteRule(flowId, ruleId);
        return ResponseEntity.ok(Map.of("success", true, "deletedRuleId", ruleId));
    }

    // =========================================================================
    // DROOLS DRL GENERATION
    // =========================================================================

    @GetMapping("/flows/{id}/drl")
    public ResponseEntity<?> getDrl(@PathVariable("id") long flowId) {
        var fullFlow = repositoryService.getFullFlow(flowId);
        if (fullFlow.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        String drl = drlGenerator.generateDrl(fullFlow.get());
        return ResponseEntity.ok(Map.of(
                "flowId", flowId,
                "flowCode", fullFlow.get().header().flowCode(),
                "version", fullFlow.get().header().version(),
                "drlContent", drl
        ));
    }

    // =========================================================================
    // FORMS STATE APPROVAL MANAGEMENT (DR_FORM_STATE_APPROVAL)
    // =========================================================================

    @GetMapping("/form-approvals")
    public ResponseEntity<List<Map<String, Object>>> listFormApprovals(
            @RequestParam(name = "productCode", required = false) String productCode,
            @RequestParam(name = "stateCode", required = false) String stateCode,
            @RequestParam(name = "effectiveDate", required = false) String effectiveDate) {
        return ResponseEntity.ok(repositoryService.getFormApprovalsForProduct(productCode, stateCode, effectiveDate));
    }

    @PostMapping("/form-approvals")
    public ResponseEntity<?> saveFormApproval(@RequestBody Map<String, Object> form) {
        repositoryService.saveFormApproval(form);
        return ResponseEntity.ok(Map.of("success", true));
    }

    @DeleteMapping("/form-approvals/{id}")
    public ResponseEntity<?> deleteFormApproval(@PathVariable("id") long id) {
        repositoryService.deleteFormApproval(id);
        return ResponseEntity.ok(Map.of("success", true, "deletedId", id));
    }

    // =========================================================================
    // PROFESSIONAL LIABILITY RATING PLAN CONFIGS (DR_RATING_PLAN_CONFIG)
    // =========================================================================

    @GetMapping("/rating-plans")
    public ResponseEntity<List<DroolsRatingRepositoryService.RatingPlanConfigDto>> listRatingPlans(
            @RequestParam(name = "productCode", required = false) String productCode,
            @RequestParam(name = "stateCode", required = false) String stateCode,
            @RequestParam(name = "effectiveDate", required = false) String effectiveDate) {
        return ResponseEntity.ok(repositoryService.getRatingPlanConfigs(productCode, stateCode, effectiveDate));
    }

    @PostMapping("/rating-plans")
    public ResponseEntity<?> saveRatingPlan(@RequestBody Map<String, Object> plan) {
        repositoryService.saveRatingPlanConfig(plan);
        return ResponseEntity.ok(Map.of("success", true));
    }

    @DeleteMapping("/rating-plans/{id}")
    public ResponseEntity<?> deleteRatingPlan(@PathVariable("id") long id) {
        repositoryService.deleteRatingPlanConfig(id);
        return ResponseEntity.ok(Map.of("success", true, "deletedPlanId", id));
    }

    // =========================================================================
    // DECISION TABLE COORDINATE MATRIX (DR_DECISION_TABLE, _COLUMN, _ROW, _CELL)
    // =========================================================================

    @PostMapping("/flows/{id}/decision-tables")
    public ResponseEntity<?> saveDecisionTable(@PathVariable("id") long flowId, @RequestBody Map<String, Object> tableData) {
        var saved = repositoryService.saveDecisionTable(flowId, tableData);
        return ResponseEntity.ok(saved);
    }

    @DeleteMapping("/decision-tables/{id}")
    public ResponseEntity<?> deleteDecisionTable(@PathVariable("id") long tableId) {
        repositoryService.deleteDecisionTable(tableId);
        return ResponseEntity.ok(Map.of("success", true, "deletedTableId", tableId));
    }

    @PostMapping("/decision-tables/{id}/rows")
    public ResponseEntity<?> saveDecisionTableRow(@PathVariable("id") long tableId, @RequestBody Map<String, Object> rowData) {
        var saved = repositoryService.saveDecisionTableRow(tableId, rowData);
        return ResponseEntity.ok(saved);
    }

    @DeleteMapping("/decision-tables/rows/{rowId}")
    public ResponseEntity<?> deleteDecisionTableRow(@PathVariable("rowId") long rowId) {
        repositoryService.deleteDecisionTableRow(rowId);
        return ResponseEntity.ok(Map.of("success", true, "deletedRowId", rowId));
    }

    @PostMapping("/decision-tables/{id}/columns")
    public ResponseEntity<?> saveDecisionTableColumn(@PathVariable("id") long tableId, @RequestBody Map<String, Object> colData) {
        var saved = repositoryService.saveDecisionTableColumn(tableId, colData);
        return ResponseEntity.ok(saved);
    }

    @DeleteMapping("/decision-tables/columns/{colId}")
    public ResponseEntity<?> deleteDecisionTableColumn(@PathVariable("colId") long colId) {
        repositoryService.deleteDecisionTableColumn(colId);
        return ResponseEntity.ok(Map.of("success", true, "deletedColumnId", colId));
    }

    // =========================================================================
    // DROOLS SIMULATION / EXECUTION
    // =========================================================================

    public record SimulateRequest(Map<String, Object> facts) {}

    @PostMapping("/flows/{id}/simulate")
    public ResponseEntity<DroolsExecutionEngine.ExecutionResult> simulate(
            @PathVariable("id") long flowId,
            @RequestBody SimulateRequest req) {
        var result = executionEngine.execute(flowId, req.facts());
        return ResponseEntity.ok(result);
    }
}

