package com.example.heliosrating.brms;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.PreparedStatement;
import java.sql.Statement;
import java.util.*;

/**
 * Persistence Bridge for RuleFlow Definitions, Coordinate Decision Matrices,
 * React Flow Layouts, and Regulatory Audit Logs in HELIOS_RATING_DB.
 */
@Service
public class RuleFlowRepositoryService {

    private static final Logger log = LoggerFactory.getLogger(RuleFlowRepositoryService.class);

    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;

    @Autowired
    public RuleFlowRepositoryService(JdbcTemplate jdbcTemplate, ObjectMapper objectMapper) {
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
    }

    public record FlowHeaderDto(
            long flowId,
            int tenantId,
            String flowCode,
            String flowName,
            String description,
            String productCode,
            String planCode,
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

    public record DecisionMatrixColumnDto(
            long columnId,
            String columnType,
            String attributeKey,
            String displayName,
            String dataType,
            int displayOrder
    ) {}

    public record DecisionMatrixRowDto(
            long rowId,
            int rowIndex,
            String ruleDescription,
            boolean isActive,
            Map<String, String> cellValues // Key: columnId as String -> ExpressionValue
    ) {}

    public record DecisionMatrixDto(
            long tableId,
            Long nodeId,
            String tableCode,
            String tableName,
            String hitPolicy,
            String aggregationField,
            List<DecisionMatrixColumnDto> columns,
            List<DecisionMatrixRowDto> rows
    ) {}

    public List<FlowHeaderDto> getFlowsForTenant(int tenantId, String productCode) {
        StringBuilder sql = new StringBuilder("""
                SELECT FlowId, TenantId, FlowCode, FlowName, Description, ProductCode, PlanCode, Version, Status,
                       CONVERT(VARCHAR(30), UpdatedDt, 120) AS UpdatedDt
                FROM dbo.RuleFlows
                WHERE TenantId = ?
                """);
        List<Object> params = new ArrayList<>();
        params.add(tenantId);

        if (productCode != null && !productCode.isBlank() && !"ALL".equalsIgnoreCase(productCode)) {
            sql.append(" AND ProductCode = ?");
            params.add(productCode);
        }
        sql.append(" ORDER BY FlowCode ASC, Version DESC");

        return jdbcTemplate.query(sql.toString(), (rs, i) -> new FlowHeaderDto(
                rs.getLong("FlowId"),
                rs.getInt("TenantId"),
                rs.getString("FlowCode"),
                rs.getString("FlowName"),
                rs.getString("Description"),
                rs.getString("ProductCode"),
                rs.getString("PlanCode"),
                rs.getInt("Version"),
                rs.getString("Status"),
                rs.getString("UpdatedDt")
        ), params.toArray());
    }

    public Optional<FlowFullDto> getFullFlow(long flowId) {
        String flowSql = """
                SELECT FlowId, TenantId, FlowCode, FlowName, Description, ProductCode, PlanCode, Version, Status,
                       CONVERT(VARCHAR(30), UpdatedDt, 120) AS UpdatedDt
                FROM dbo.RuleFlows
                WHERE FlowId = ?
                """;
        List<FlowHeaderDto> headers = jdbcTemplate.query(flowSql, (rs, i) -> new FlowHeaderDto(
                rs.getLong("FlowId"),
                rs.getInt("TenantId"),
                rs.getString("FlowCode"),
                rs.getString("FlowName"),
                rs.getString("Description"),
                rs.getString("ProductCode"),
                rs.getString("PlanCode"),
                rs.getInt("Version"),
                rs.getString("Status"),
                rs.getString("UpdatedDt")
        ), flowId);

        if (headers.isEmpty()) return Optional.empty();
        FlowHeaderDto header = headers.get(0);

        String layoutSql = "SELECT LayoutJson FROM dbo.RuleFlowCanvasLayouts WHERE FlowId = ?";
        List<String> layouts = jdbcTemplate.query(layoutSql, (rs, i) -> rs.getString("LayoutJson"), flowId);
        String layoutJson = layouts.isEmpty() ? "{}" : layouts.get(0);

        String nodesSql = """
                SELECT NodeId, FlowId, ClientNodeKey, NodeType, NodeName, IsEntryNode, IsTerminalNode,
                       PayloadScript, ConfigurationJson
                FROM dbo.RuleNodes
                WHERE FlowId = ?
                ORDER BY NodeId ASC
                """;
        List<Map<String, Object>> nodes = jdbcTemplate.query(nodesSql, (rs, i) -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("nodeId", rs.getLong("NodeId"));
            m.put("flowId", rs.getLong("FlowId"));
            m.put("clientNodeKey", rs.getString("ClientNodeKey"));
            m.put("nodeType", rs.getString("NodeType"));
            m.put("nodeName", rs.getString("NodeName"));
            m.put("isEntryNode", rs.getBoolean("IsEntryNode"));
            m.put("isTerminalNode", rs.getBoolean("IsTerminalNode"));
            m.put("payloadScript", rs.getString("PayloadScript"));
            m.put("configurationJson", rs.getString("ConfigurationJson"));
            return m;
        }, flowId);

        String edgesSql = """
                SELECT EdgeId, FlowId, ClientEdgeKey, SourceNodeId, TargetNodeId, SourceHandle,
                       RoutingCondition, EvaluationOrder, IsDefaultBranch
                FROM dbo.RuleRoutingEdges
                WHERE FlowId = ?
                ORDER BY EvaluationOrder ASC
                """;
        List<Map<String, Object>> edges = jdbcTemplate.query(edgesSql, (rs, i) -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("edgeId", rs.getLong("EdgeId"));
            m.put("flowId", rs.getLong("FlowId"));
            m.put("clientEdgeKey", rs.getString("ClientEdgeKey"));
            m.put("sourceNodeId", rs.getLong("SourceNodeId"));
            m.put("targetNodeId", rs.getLong("TargetNodeId"));
            m.put("sourceHandle", rs.getString("SourceHandle"));
            m.put("routingCondition", rs.getString("RoutingCondition"));
            m.put("evaluationOrder", rs.getInt("EvaluationOrder"));
            m.put("isDefaultBranch", rs.getBoolean("IsDefaultBranch"));
            return m;
        }, flowId);

        String dtSql = """
                SELECT dt.TableId, dt.NodeId, dt.TableCode, dt.TableName, dt.HitPolicy, dt.AggregationField
                FROM dbo.DecisionTables dt
                JOIN dbo.RuleNodes rn ON dt.NodeId = rn.NodeId
                WHERE rn.FlowId = ?
                """;
        List<Map<String, Object>> decisionTables = jdbcTemplate.query(dtSql, (rs, i) -> {
            long tableId = rs.getLong("TableId");
            Map<String, Object> tableMap = new LinkedHashMap<>();
            tableMap.put("tableId", tableId);
            tableMap.put("nodeId", rs.getLong("NodeId"));
            tableMap.put("tableCode", rs.getString("TableCode"));
            tableMap.put("tableName", rs.getString("TableName"));
            tableMap.put("hitPolicy", rs.getString("HitPolicy"));
            tableMap.put("aggregationField", rs.getString("AggregationField"));

            tableMap.put("columns", jdbcTemplate.query("""
                    SELECT ColumnId, TableId, ColumnType, AttributeKey, DisplayName, DataType, DisplayOrder
                    FROM dbo.DecisionTableColumns
                    WHERE TableId = ?
                    ORDER BY DisplayOrder ASC
                    """, (crs, ci) -> {
                Map<String, Object> c = new LinkedHashMap<>();
                c.put("columnId", crs.getLong("ColumnId"));
                c.put("columnType", crs.getString("ColumnType"));
                c.put("attributeKey", crs.getString("AttributeKey"));
                c.put("displayName", crs.getString("DisplayName"));
                c.put("dataType", crs.getString("DataType"));
                c.put("displayOrder", crs.getInt("DisplayOrder"));
                return c;
            }, tableId));

            tableMap.put("rows", jdbcTemplate.query("""
                    SELECT RowId, TableId, RowIndex, RuleDescription, IsActive
                    FROM dbo.DecisionTableRows
                    WHERE TableId = ?
                    ORDER BY RowIndex ASC
                    """, (rrs, ri) -> {
                Map<String, Object> r = new LinkedHashMap<>();
                r.put("rowId", rrs.getLong("RowId"));
                r.put("rowIndex", rrs.getInt("RowIndex"));
                r.put("ruleDescription", rrs.getString("RuleDescription"));
                r.put("isActive", rrs.getBoolean("IsActive"));
                return r;
            }, tableId));

            tableMap.put("cells", jdbcTemplate.query("""
                    SELECT CellId, RowId, ColumnId, ExpressionValue
                    FROM dbo.DecisionTableCells
                    WHERE RowId IN (SELECT RowId FROM dbo.DecisionTableRows WHERE TableId = ?)
                    """, (clrs, cli) -> {
                Map<String, Object> cl = new LinkedHashMap<>();
                cl.put("cellId", clrs.getLong("CellId"));
                cl.put("rowId", clrs.getLong("RowId"));
                cl.put("columnId", clrs.getLong("ColumnId"));
                cl.put("expressionValue", clrs.getString("ExpressionValue"));
                return cl;
            }, tableId));

            return tableMap;
        }, flowId);

        return Optional.of(new FlowFullDto(header, layoutJson, nodes, edges, decisionTables));
    }

    @Transactional
    public FlowHeaderDto cloneFlowAsNewVersion(long sourceFlowId, int requestedVersion, String description, String status) {
        Optional<FlowFullDto> opt = getFullFlow(sourceFlowId);
        if (opt.isEmpty()) {
            throw new IllegalArgumentException("Source RuleFlow not found: " + sourceFlowId);
        }
        FlowFullDto src = opt.get();
        FlowHeaderDto srcHdr = src.header();

        int targetVer = requestedVersion;
        if (targetVer <= 0) {
            Integer maxVer = jdbcTemplate.queryForObject(
                    "SELECT ISNULL(MAX(Version), 0) FROM dbo.RuleFlows WHERE FlowCode = ? AND TenantId = ?",
                    Integer.class, srcHdr.flowCode(), srcHdr.tenantId()
            );
            targetVer = (maxVer != null ? maxVer : srcHdr.version()) + 1;
        }

        String flowStatus = (status != null && !status.isBlank()) ? status : "DRAFT";
        String flowDesc = (description != null && !description.isBlank()) ? description : srcHdr.description();

        KeyHolder keyHolder = new GeneratedKeyHolder();
        int finalTargetVer = targetVer;
        jdbcTemplate.update(connection -> {
            PreparedStatement ps = connection.prepareStatement("""
                    INSERT INTO dbo.RuleFlows (TenantId, FlowCode, FlowName, Description, ProductCode, PlanCode, Version, Status, CreatedBy, UpdatedBy)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'SYSTEM', 'SYSTEM')
                    """, Statement.RETURN_GENERATED_KEYS);
            ps.setInt(1, srcHdr.tenantId());
            ps.setString(2, srcHdr.flowCode());
            ps.setString(3, srcHdr.flowName());
            ps.setString(4, flowDesc);
            ps.setString(5, srcHdr.productCode());
            ps.setString(6, srcHdr.planCode());
            ps.setInt(7, finalTargetVer);
            ps.setString(8, flowStatus);
            return ps;
        }, keyHolder);

        long newFlowId = keyHolder.getKey().longValue();

        // 1. Clone Layout
        jdbcTemplate.update("""
                INSERT INTO dbo.RuleFlowCanvasLayouts (FlowId, ViewportZoom, ViewportX, ViewportY, LayoutJson)
                SELECT ?, ViewportZoom, ViewportX, ViewportY, LayoutJson
                FROM dbo.RuleFlowCanvasLayouts WHERE FlowId = ?
                """, newFlowId, sourceFlowId);

        // 2. Clone Nodes & map oldId -> newId
        Map<Long, Long> nodeIdMap = new HashMap<>();
        for (Map<String, Object> node : src.nodes()) {
            long oldNodeId = ((Number) node.get("nodeId")).longValue();
            KeyHolder nodeKeyHolder = new GeneratedKeyHolder();
            jdbcTemplate.update(connection -> {
                PreparedStatement ps = connection.prepareStatement("""
                        INSERT INTO dbo.RuleNodes (FlowId, ClientNodeKey, NodeType, NodeName, IsEntryNode, IsTerminalNode, PayloadScript, ConfigurationJson)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                        """, Statement.RETURN_GENERATED_KEYS);
                ps.setLong(1, newFlowId);
                ps.setString(2, (String) node.get("clientNodeKey"));
                ps.setString(3, (String) node.get("nodeType"));
                ps.setString(4, (String) node.get("nodeName"));
                ps.setBoolean(5, Boolean.TRUE.equals(node.get("isEntryNode")));
                ps.setBoolean(6, Boolean.TRUE.equals(node.get("isTerminalNode")));
                ps.setString(7, (String) node.get("payloadScript"));
                ps.setString(8, (String) node.get("configurationJson"));
                return ps;
            }, nodeKeyHolder);
            long newNodeId = nodeKeyHolder.getKey().longValue();
            nodeIdMap.put(oldNodeId, newNodeId);
        }

        // 3. Clone Edges
        for (Map<String, Object> edge : src.edges()) {
            long oldSrcId = ((Number) edge.get("sourceNodeId")).longValue();
            long oldTgtId = ((Number) edge.get("targetNodeId")).longValue();
            Long newSrcId = nodeIdMap.get(oldSrcId);
            Long newTgtId = nodeIdMap.get(oldTgtId);

            if (newSrcId != null && newTgtId != null) {
                jdbcTemplate.update("""
                        INSERT INTO dbo.RuleRoutingEdges (FlowId, ClientEdgeKey, SourceNodeId, TargetNodeId, SourceHandle, RoutingCondition, EvaluationOrder, IsDefaultBranch)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                        newFlowId,
                        edge.get("clientEdgeKey"),
                        newSrcId,
                        newTgtId,
                        edge.get("sourceHandle"),
                        edge.get("routingCondition"),
                        edge.get("evaluationOrder"),
                        Boolean.TRUE.equals(edge.get("isDefaultBranch"))
                );
            }
        }

        // 4. Clone Decision Tables
        for (Map<String, Object> dt : src.decisionTables()) {
            long oldDtId = ((Number) dt.get("tableId")).longValue();
            Long oldNodeId = dt.get("nodeId") != null ? ((Number) dt.get("nodeId")).longValue() : null;
            Long newNodeId = oldNodeId != null ? nodeIdMap.get(oldNodeId) : null;
            String newCode = dt.get("tableCode") + "_V" + finalTargetVer;

            KeyHolder dtKeyHolder = new GeneratedKeyHolder();
            jdbcTemplate.update(connection -> {
                PreparedStatement ps = connection.prepareStatement("""
                        INSERT INTO dbo.DecisionTables (NodeId, TableCode, TableName, HitPolicy, AggregationField)
                        VALUES (?, ?, ?, ?, ?)
                        """, Statement.RETURN_GENERATED_KEYS);
                if (newNodeId != null) ps.setLong(1, newNodeId); else ps.setNull(1, java.sql.Types.BIGINT);
                ps.setString(2, newCode);
                ps.setString(3, (String) dt.get("tableName") + " (v" + finalTargetVer + ")");
                ps.setString(4, (String) dt.get("hitPolicy"));
                ps.setString(5, (String) dt.get("aggregationField"));
                return ps;
            }, dtKeyHolder);
            long newDtId = dtKeyHolder.getKey().longValue();

            // Clone Columns
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> cols = (List<Map<String, Object>>) dt.get("columns");
            Map<Long, Long> colIdMap = new HashMap<>();
            if (cols != null) {
                for (Map<String, Object> col : cols) {
                    long oldColId = ((Number) col.get("columnId")).longValue();
                    KeyHolder colKeyHolder = new GeneratedKeyHolder();
                    jdbcTemplate.update(connection -> {
                        PreparedStatement ps = connection.prepareStatement("""
                                INSERT INTO dbo.DecisionTableColumns (TableId, ColumnType, AttributeKey, DisplayName, DataType, DisplayOrder)
                                VALUES (?, ?, ?, ?, ?, ?)
                                """, Statement.RETURN_GENERATED_KEYS);
                        ps.setLong(1, newDtId);
                        ps.setString(2, (String) col.get("columnType"));
                        ps.setString(3, (String) col.get("attributeKey"));
                        ps.setString(4, (String) col.get("displayName"));
                        ps.setString(5, (String) col.get("dataType"));
                        ps.setInt(6, ((Number) col.get("displayOrder")).intValue());
                        return ps;
                    }, colKeyHolder);
                    colIdMap.put(oldColId, colKeyHolder.getKey().longValue());
                }
            }

            // Clone Rows & Cells
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> rows = (List<Map<String, Object>>) dt.get("rows");
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> cells = (List<Map<String, Object>>) dt.get("cells");
            Map<String, String> cellExprMap = new HashMap<>();
            if (cells != null) {
                for (Map<String, Object> cell : cells) {
                    cellExprMap.put(cell.get("rowId") + "_" + cell.get("columnId"), (String) cell.get("expressionValue"));
                }
            }

            if (rows != null) {
                for (Map<String, Object> row : rows) {
                    long oldRowId = ((Number) row.get("rowId")).longValue();
                    KeyHolder rowKeyHolder = new GeneratedKeyHolder();
                    jdbcTemplate.update(connection -> {
                        PreparedStatement ps = connection.prepareStatement("""
                                INSERT INTO dbo.DecisionTableRows (TableId, RowIndex, RuleDescription, IsActive)
                                VALUES (?, ?, ?, ?)
                                """, Statement.RETURN_GENERATED_KEYS);
                        ps.setLong(1, newDtId);
                        ps.setInt(2, ((Number) row.get("rowIndex")).intValue());
                        ps.setString(3, (String) row.get("ruleDescription"));
                        ps.setBoolean(4, Boolean.TRUE.equals(row.get("isActive")));
                        return ps;
                    }, rowKeyHolder);
                    long newRowId = rowKeyHolder.getKey().longValue();

                    for (Map.Entry<Long, Long> entry : colIdMap.entrySet()) {
                        long oldColId = entry.getKey();
                        long newColId = entry.getValue();
                        String expr = cellExprMap.get(oldRowId + "_" + oldColId);
                        if (expr != null) {
                            jdbcTemplate.update("""
                                    INSERT INTO dbo.DecisionTableCells (RowId, ColumnId, ExpressionValue)
                                    VALUES (?, ?, ?)
                                    """, newRowId, newColId, expr);
                        }
                    }
                }
            }
        }

        log.info("Cloned RuleFlow {} as new version v{} (new FlowId: {})", sourceFlowId, finalTargetVer, newFlowId);
        return getFullFlow(newFlowId).get().header();
    }

    public DecisionMatrixDto getDecisionTable(long tableId) {
        String dtSql = "SELECT TableId, NodeId, TableCode, TableName, HitPolicy, AggregationField FROM dbo.DecisionTables WHERE TableId = ?";
        List<Map<String, Object>> list = jdbcTemplate.queryForList(dtSql, tableId);
        if (list.isEmpty()) {
            throw new IllegalArgumentException("Decision Table not found: " + tableId);
        }
        Map<String, Object> row = list.get(0);
        Long nodeId = row.get("NodeId") != null ? ((Number) row.get("NodeId")).longValue() : null;

        List<DecisionMatrixColumnDto> cols = jdbcTemplate.query("""
                SELECT ColumnId, ColumnType, AttributeKey, DisplayName, DataType, DisplayOrder
                FROM dbo.DecisionTableColumns
                WHERE TableId = ?
                ORDER BY DisplayOrder ASC
                """, (rs, i) -> new DecisionMatrixColumnDto(
                rs.getLong("ColumnId"),
                rs.getString("ColumnType"),
                rs.getString("AttributeKey"),
                rs.getString("DisplayName"),
                rs.getString("DataType"),
                rs.getInt("DisplayOrder")
        ), tableId);

        List<Map<String, Object>> rawRows = jdbcTemplate.queryForList("""
                SELECT RowId, RowIndex, RuleDescription, IsActive
                FROM dbo.DecisionTableRows
                WHERE TableId = ?
                ORDER BY RowIndex ASC
                """, tableId);

        List<Map<String, Object>> rawCells = jdbcTemplate.queryForList("""
                SELECT c.RowId, c.ColumnId, c.ExpressionValue
                FROM dbo.DecisionTableCells c
                JOIN dbo.DecisionTableRows r ON c.RowId = r.RowId
                WHERE r.TableId = ?
                """, tableId);

        Map<String, String> cellLookup = new HashMap<>();
        for (Map<String, Object> c : rawCells) {
            cellLookup.put(c.get("RowId") + "_" + c.get("ColumnId"), (String) c.get("ExpressionValue"));
        }

        List<DecisionMatrixRowDto> rows = new ArrayList<>();
        for (Map<String, Object> r : rawRows) {
            long rId = ((Number) r.get("RowId")).longValue();
            Map<String, String> rowCellValues = new LinkedHashMap<>();
            for (DecisionMatrixColumnDto col : cols) {
                String val = cellLookup.getOrDefault(rId + "_" + col.columnId(), "-");
                rowCellValues.put(String.valueOf(col.columnId()), val);
            }
            rows.add(new DecisionMatrixRowDto(
                    rId,
                    ((Number) r.get("RowIndex")).intValue(),
                    (String) r.get("RuleDescription"),
                    Boolean.TRUE.equals(r.get("IsActive")),
                    rowCellValues
            ));
        }

        return new DecisionMatrixDto(
                tableId,
                nodeId,
                (String) row.get("TableCode"),
                (String) row.get("TableName"),
                (String) row.get("HitPolicy"),
                (String) row.get("AggregationField"),
                cols,
                rows
        );
    }

    @Transactional
    public DecisionMatrixDto updateDecisionMatrix(long tableId, DecisionMatrixDto dto) {
        jdbcTemplate.update("""
                UPDATE dbo.DecisionTables
                SET TableName = ?, HitPolicy = ?, AggregationField = ?
                WHERE TableId = ?
                """, dto.tableName(), dto.hitPolicy(), dto.aggregationField(), tableId);

        // Update columns
        if (dto.columns() != null) {
            for (DecisionMatrixColumnDto c : dto.columns()) {
                if (c.columnId() > 0) {
                    jdbcTemplate.update("""
                            UPDATE dbo.DecisionTableColumns
                            SET ColumnType = ?, AttributeKey = ?, DisplayName = ?, DataType = ?, DisplayOrder = ?
                            WHERE ColumnId = ? AND TableId = ?
                            """, c.columnType(), c.attributeKey(), c.displayName(), c.dataType(), c.displayOrder(), c.columnId(), tableId);
                } else {
                    jdbcTemplate.update("""
                            INSERT INTO dbo.DecisionTableColumns (TableId, ColumnType, AttributeKey, DisplayName, DataType, DisplayOrder)
                            VALUES (?, ?, ?, ?, ?, ?)
                            """, tableId, c.columnType(), c.attributeKey(), c.displayName(), c.dataType(), c.displayOrder());
                }
            }
        }

        // Update rows and cells
        if (dto.rows() != null) {
            for (DecisionMatrixRowDto r : dto.rows()) {
                long rowId = r.rowId();
                if (rowId <= 0) {
                    KeyHolder rkh = new GeneratedKeyHolder();
                    jdbcTemplate.update(connection -> {
                        PreparedStatement ps = connection.prepareStatement("""
                                INSERT INTO dbo.DecisionTableRows (TableId, RowIndex, RuleDescription, IsActive)
                                VALUES (?, ?, ?, ?)
                                """, Statement.RETURN_GENERATED_KEYS);
                        ps.setLong(1, tableId);
                        ps.setInt(2, r.rowIndex());
                        ps.setString(3, r.ruleDescription());
                        ps.setBoolean(4, r.isActive());
                        return ps;
                    }, rkh);
                    rowId = rkh.getKey().longValue();
                } else {
                    jdbcTemplate.update("""
                            UPDATE dbo.DecisionTableRows
                            SET RowIndex = ?, RuleDescription = ?, IsActive = ?
                            WHERE RowId = ? AND TableId = ?
                            """, r.rowIndex(), r.ruleDescription(), r.isActive(), rowId, tableId);
                }

                if (r.cellValues() != null) {
                    for (Map.Entry<String, String> cellEntry : r.cellValues().entrySet()) {
                        long colId = Long.parseLong(cellEntry.getKey());
                        String val = cellEntry.getValue() != null ? cellEntry.getValue() : "-";
                        jdbcTemplate.update("""
                                MERGE dbo.DecisionTableCells AS target
                                USING (SELECT ? AS RowId, ? AS ColumnId) AS source
                                ON target.RowId = source.RowId AND target.ColumnId = source.ColumnId
                                WHEN MATCHED THEN
                                    UPDATE SET ExpressionValue = ?
                                WHEN NOT MATCHED THEN
                                    INSERT (RowId, ColumnId, ExpressionValue) VALUES (?, ?, ?);
                                """, rowId, colId, val, rowId, colId, val);
                    }
                }
            }
        }

        log.info("Successfully updated Decision Matrix {} ({}) in HELIOS_RATING_DB", tableId, dto.tableCode());
        return getDecisionTable(tableId);
    }

    @Transactional
    public void deleteDecisionTableRow(long tableId, long rowId) {
        jdbcTemplate.update("DELETE FROM dbo.DecisionTableCells WHERE RowId = ?", rowId);
        jdbcTemplate.update("DELETE FROM dbo.DecisionTableRows WHERE RowId = ? AND TableId = ?", rowId, tableId);
    }

    @Transactional
    public FlowHeaderDto createFlow(int tenantId, String flowCode, String flowName, String description,
                                    String productCode, String planCode, String template) {
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            PreparedStatement ps = connection.prepareStatement("""
                    INSERT INTO dbo.RuleFlows (TenantId, FlowCode, FlowName, Description, ProductCode, PlanCode, Version, Status, CreatedBy, UpdatedBy)
                    VALUES (?, ?, ?, ?, ?, ?, 1, 'ACTIVE', 'SYSTEM', 'SYSTEM')
                    """, Statement.RETURN_GENERATED_KEYS);
            ps.setInt(1, tenantId);
            ps.setString(2, flowCode.toUpperCase().trim());
            ps.setString(3, flowName);
            ps.setString(4, description);
            ps.setString(5, productCode != null ? productCode.toUpperCase() : "TECH_EO");
            ps.setString(6, planCode != null ? planCode.toUpperCase() : "DEFAULT");
            return ps;
        }, keyHolder);

        long flowId = keyHolder.getKey().longValue();

        KeyHolder entryKeyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            PreparedStatement ps = connection.prepareStatement("""
                    INSERT INTO dbo.RuleNodes (FlowId, ClientNodeKey, NodeType, NodeName, IsEntryNode, IsTerminalNode, PayloadScript)
                    VALUES (?, 'node-entry', 'RULESET', '1. Normalize Exposure & Base Rate', 1, 0,
                            'facts.exposureUnits = facts.exposureValue / 1000.0;\\nfacts.baseLossCost = 1.85;\\nfacts.preliminaryPremium = facts.exposureUnits * facts.baseLossCost;')
                    """, Statement.RETURN_GENERATED_KEYS);
            ps.setLong(1, flowId);
            return ps;
        }, entryKeyHolder);

        String initialLayoutJson = """
                {"viewport":{"x":100,"y":100,"zoom":1.0},"nodes":[{"id":"node-entry","type":"ruleNode","position":{"x":100,"y":150},"data":{"label":"1. Normalize Exposure & Base Rate","nodeType":"RULESET","isEntry":true,"isTerminal":false}}],"edges":[]}
                """;
        jdbcTemplate.update("""
                INSERT INTO dbo.RuleFlowCanvasLayouts (FlowId, ViewportZoom, ViewportX, ViewportY, LayoutJson)
                VALUES (?, 1.0, 100.0, 100.0, ?)
                """, flowId, initialLayoutJson);

        return getFullFlow(flowId).get().header();
    }

    public void updateFlowHeader(long flowId, String flowName, String description, String productCode, String planCode, String status) {
        jdbcTemplate.update("""
                UPDATE dbo.RuleFlows
                SET FlowName = ?, Description = ?, ProductCode = ?, PlanCode = ?, Status = ?, UpdatedDt = SYSDATETIMEOFFSET()
                WHERE FlowId = ?
                """, flowName, description, productCode, planCode, status, flowId);
    }

    public void saveCanvasLayout(long flowId, String layoutJson, double zoom, double x, double y) {
        jdbcTemplate.update("""
                MERGE dbo.RuleFlowCanvasLayouts AS target
                USING (SELECT ? AS FlowId) AS source
                ON target.FlowId = source.FlowId
                WHEN MATCHED THEN
                    UPDATE SET LayoutJson = ?, ViewportZoom = ?, ViewportX = ?, ViewportY = ?, LastSavedDt = SYSDATETIMEOFFSET()
                WHEN NOT MATCHED THEN
                    INSERT (FlowId, ViewportZoom, ViewportX, ViewportY, LayoutJson)
                    VALUES (?, ?, ?, ?, ?);
                """, flowId, layoutJson, zoom, x, y, flowId, zoom, x, y, layoutJson);
    }

    public void recordExecutionAudit(long flowId, int tenantId, RuleFlowExecutor.ExecutionResult result, Map<String, Object> inputFacts) {
        try {
            KeyHolder keyHolder = new GeneratedKeyHolder();
            String inputJson = objectMapper.writeValueAsString(inputFacts);
            String outputJson = objectMapper.writeValueAsString(result.finalFacts());

            jdbcTemplate.update(connection -> {
                PreparedStatement ps = connection.prepareStatement("""
                        INSERT INTO dbo.RuleFlowExecutionAudits
                        (FlowId, TenantId, InputFactsJson, OutputFactsJson, TotalDurationMs, IsSuccess, ErrorMessage)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                        """, Statement.RETURN_GENERATED_KEYS);
                ps.setLong(1, flowId);
                ps.setInt(2, tenantId);
                ps.setString(3, inputJson);
                ps.setString(4, outputJson);
                ps.setLong(5, result.totalDurationMs());
                ps.setBoolean(6, result.success());
                ps.setString(7, result.errorMessage());
                return ps;
            }, keyHolder);

            if (keyHolder.getKey() != null && result.auditTrail() != null) {
                long auditId = keyHolder.getKey().longValue();
                for (RuleFlowExecutor.ExecutionAuditStep step : result.auditTrail()) {
                    String factsBefore = objectMapper.writeValueAsString(step.factsBefore());
                    String factsAfter = objectMapper.writeValueAsString(step.factsAfter());
                    jdbcTemplate.update("""
                            INSERT INTO dbo.RuleFlowExecutionAuditSteps
                            (AuditId, StepIndex, NodeId, NodeType, ExecutionDurationNanos, FactsBeforeJson, FactsAfterJson, AuditNote)
                            VALUES (?, ?, 0, ?, ?, ?, ?, ?)
                            """, auditId, step.stepIndex(), step.nodeType().name(), step.executionTimeNanos(),
                            factsBefore, factsAfter, step.evaluationSummary());
                }
            }
        } catch (Exception ex) {
            log.warn("Failed recording regulatory audit for Flow {}: {}", flowId, ex.getMessage());
        }
    }
}

