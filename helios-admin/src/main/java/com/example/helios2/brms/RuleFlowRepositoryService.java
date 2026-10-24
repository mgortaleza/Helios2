package com.example.helios2.brms;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.*;

/**
 * Persistence Bridge for RuleFlow Definitions, Coordinate Decision Matrices,
 * React Flow Layouts, and Regulatory Audit Logs in MSTR_DATA.
 */
@Service
public class RuleFlowRepositoryService {

    private static final Logger log = LoggerFactory.getLogger(RuleFlowRepositoryService.class);

    private final JdbcTemplate masterJdbcTemplate;
    private final ObjectMapper objectMapper;

    @Autowired
    public RuleFlowRepositoryService(@Qualifier("masterJdbcTemplate") JdbcTemplate masterJdbcTemplate,
                                     ObjectMapper objectMapper) {
        this.masterJdbcTemplate = masterJdbcTemplate;
        this.objectMapper = objectMapper;
    }

    public record FlowHeaderDto(
            long flowId,
            int tenantId,
            String flowCode,
            String flowName,
            String description,
            int version,
            String status,
            String updatedDt
    ) {}

    public record FlowFullDto(
            FlowHeaderDto header,
            String layoutJson,
            List<Map<String, Object>> nodes,
            List<Map<String, Object>> edges,
            List<Map<String, Object>> decisionTables
    ) {}

    public List<FlowHeaderDto> getFlowsForTenant(int tenantId) {
        String sql = """
                SELECT FlowId, TenantId, FlowCode, FlowName, Description, Version, Status,
                       CONVERT(VARCHAR(30), UpdatedDt, 120) AS UpdatedDt
                FROM dbo.RuleFlows
                WHERE TenantId = ?
                ORDER BY FlowId ASC
                """;
        return masterJdbcTemplate.query(sql, (rs, i) -> new FlowHeaderDto(
                rs.getLong("FlowId"),
                rs.getInt("TenantId"),
                rs.getString("FlowCode"),
                rs.getString("FlowName"),
                rs.getString("Description"),
                rs.getInt("Version"),
                rs.getString("Status"),
                rs.getString("UpdatedDt")
        ), tenantId);
    }

    public Optional<FlowFullDto> getFullFlow(long flowId) {
        String flowSql = """
                SELECT FlowId, TenantId, FlowCode, FlowName, Description, Version, Status,
                       CONVERT(VARCHAR(30), UpdatedDt, 120) AS UpdatedDt
                FROM dbo.RuleFlows
                WHERE FlowId = ?
                """;
        List<FlowHeaderDto> headers = masterJdbcTemplate.query(flowSql, (rs, i) -> new FlowHeaderDto(
                rs.getLong("FlowId"),
                rs.getInt("TenantId"),
                rs.getString("FlowCode"),
                rs.getString("FlowName"),
                rs.getString("Description"),
                rs.getInt("Version"),
                rs.getString("Status"),
                rs.getString("UpdatedDt")
        ), flowId);

        if (headers.isEmpty()) {
            return Optional.empty();
        }
        FlowHeaderDto header = headers.get(0);

        // Fetch Layout JSON
        String layoutSql = "SELECT LayoutJson FROM dbo.RuleFlowCanvasLayouts WHERE FlowId = ?";
        List<String> layouts = masterJdbcTemplate.query(layoutSql, (rs, i) -> rs.getString("LayoutJson"), flowId);
        String layoutJson = layouts.isEmpty() ? null : layouts.get(0);

        // Fetch Nodes
        String nodesSql = """
                SELECT NodeId, ClientNodeKey, NodeType, NodeName, IsEntryNode, IsTerminalNode,
                       PayloadScript, ConfigurationJson
                FROM dbo.RuleNodes
                WHERE FlowId = ?
                ORDER BY NodeId ASC
                """;
        List<Map<String, Object>> nodes = masterJdbcTemplate.query(nodesSql, (rs, i) -> {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("nodeId", rs.getLong("NodeId"));
            map.put("clientNodeKey", rs.getString("ClientNodeKey"));
            map.put("nodeType", rs.getString("NodeType"));
            map.put("nodeName", rs.getString("NodeName"));
            map.put("isEntryNode", rs.getBoolean("IsEntryNode"));
            map.put("isTerminalNode", rs.getBoolean("IsTerminalNode"));
            map.put("payloadScript", rs.getString("PayloadScript"));
            map.put("configurationJson", rs.getString("ConfigurationJson"));
            return map;
        }, flowId);

        // Fetch Edges
        String edgesSql = """
                SELECT e.EdgeId, e.ClientEdgeKey, e.SourceNodeId, e.TargetNodeId, e.SourceHandle,
                       e.RoutingCondition, e.EvaluationOrder, e.IsDefaultBranch,
                       src.ClientNodeKey AS SourceClientKey, tgt.ClientNodeKey AS TargetClientKey
                FROM dbo.RuleRoutingEdges e
                JOIN dbo.RuleNodes src ON e.SourceNodeId = src.NodeId
                JOIN dbo.RuleNodes tgt ON e.TargetNodeId = tgt.NodeId
                WHERE e.FlowId = ?
                ORDER BY e.EvaluationOrder ASC
                """;
        List<Map<String, Object>> edges = masterJdbcTemplate.query(edgesSql, (rs, i) -> {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("edgeId", rs.getLong("EdgeId"));
            map.put("clientEdgeKey", rs.getString("ClientEdgeKey"));
            map.put("sourceNodeId", rs.getLong("SourceNodeId"));
            map.put("targetNodeId", rs.getLong("TargetNodeId"));
            map.put("sourceClientKey", rs.getString("SourceClientKey"));
            map.put("targetClientKey", rs.getString("TargetClientKey"));
            map.put("sourceHandle", rs.getString("SourceHandle"));
            map.put("routingCondition", rs.getString("RoutingCondition"));
            map.put("evaluationOrder", rs.getInt("EvaluationOrder"));
            map.put("isDefaultBranch", rs.getBoolean("IsDefaultBranch"));
            return map;
        }, flowId);

        // Fetch Decision Tables attached to flow nodes
        String dtSql = """
                SELECT dt.TableId, dt.NodeId, dt.TableCode, dt.TableName, dt.HitPolicy, dt.AggregationField
                FROM dbo.DecisionTables dt
                JOIN dbo.RuleNodes n ON dt.NodeId = n.NodeId
                WHERE n.FlowId = ?
                """;
        List<Map<String, Object>> tables = masterJdbcTemplate.query(dtSql, (rs, i) -> {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("tableId", rs.getLong("TableId"));
            map.put("nodeId", rs.getLong("NodeId"));
            map.put("tableCode", rs.getString("TableCode"));
            map.put("tableName", rs.getString("TableName"));
            map.put("hitPolicy", rs.getString("HitPolicy"));
            map.put("aggregationField", rs.getString("AggregationField"));
            return map;
        }, flowId);

        for (Map<String, Object> t : tables) {
            long tableId = (Long) t.get("tableId");
            // Columns
            String colSql = """
                    SELECT ColumnId, ColumnType, AttributeKey, DisplayName, DataType, DisplayOrder
                    FROM dbo.DecisionTableColumns
                    WHERE TableId = ?
                    ORDER BY ColumnType DESC, DisplayOrder ASC
                    """;
            t.put("columns", masterJdbcTemplate.queryForList(colSql, tableId));

            // Rows
            String rowSql = """
                    SELECT RowId, RowIndex, RuleDescription, IsActive
                    FROM dbo.DecisionTableRows
                    WHERE TableId = ? AND IsActive = 1
                    ORDER BY RowIndex ASC
                    """;
            List<Map<String, Object>> rowList = masterJdbcTemplate.queryForList(rowSql, tableId);
            t.put("rows", rowList);

            // Cells
            String cellSql = """
                    SELECT c.CellId, c.RowId, c.ColumnId, c.ExpressionValue
                    FROM dbo.DecisionTableCells c
                    JOIN dbo.DecisionTableRows r ON c.RowId = r.RowId
                    WHERE r.TableId = ?
                    """;
            t.put("cells", masterJdbcTemplate.queryForList(cellSql, tableId));
        }

        return Optional.of(new FlowFullDto(header, layoutJson, nodes, edges, tables));
    }

    public void saveCanvasLayout(long flowId, String layoutJson, double zoom, double x, double y) {
        String upsertSql = """
                IF EXISTS (SELECT 1 FROM dbo.RuleFlowCanvasLayouts WHERE FlowId = ?)
                BEGIN
                    UPDATE dbo.RuleFlowCanvasLayouts
                    SET LayoutJson = ?, ViewportZoom = ?, ViewportX = ?, ViewportY = ?, LastSavedDt = SYSDATETIMEOFFSET()
                    WHERE FlowId = ?;
                END
                ELSE
                BEGIN
                    INSERT INTO dbo.RuleFlowCanvasLayouts (FlowId, LayoutJson, ViewportZoom, ViewportX, ViewportY)
                    VALUES (?, ?, ?, ?, ?);
                END
                """;
        masterJdbcTemplate.update(upsertSql, flowId, layoutJson, zoom, x, y, flowId, flowId, layoutJson, zoom, x, y);
        log.info("Persisted Canvas Layout for RuleFlow {}", flowId);
    }

    public void recordExecutionAudit(long flowId, int tenantId, RuleFlowExecutor.ExecutionResult result, Map<String, Object> initialFacts) {
        try {
            String initialJson = objectMapper.writeValueAsString(initialFacts != null ? initialFacts : Collections.emptyMap());
            String finalJson = objectMapper.writeValueAsString(result.finalFacts() != null ? result.finalFacts() : Collections.emptyMap());
            String traceJson = objectMapper.writeValueAsString(result.auditTrail() != null ? result.auditTrail() : Collections.emptyList());

            String sql = """
                    INSERT INTO dbo.RuleFlowExecutionAudits 
                    (FlowId, ExecutionCorrelationId, TenantId, ExecutionStatus, TotalExecutionTimeMs, InitialFactsJson, FinalFactsJson, ExecutionTraceJson)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """;
            masterJdbcTemplate.update(sql, flowId, result.correlationId(), tenantId,
                    result.success() ? "SUCCESS" : "FAILED",
                    result.totalDurationMs(),
                    initialJson, finalJson, traceJson);
        } catch (JsonProcessingException e) {
            log.warn("Failed serializing RuleFlow audit record for correlation {}: {}", result.correlationId(), e.getMessage());
        }
    }
}
