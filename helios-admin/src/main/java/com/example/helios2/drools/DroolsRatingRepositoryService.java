package com.example.helios2.drools;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.sql.Date;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.time.LocalDate;
import java.util.*;

/**
 * Persistence service leveraging Helios_Rating_DB with DR_ prefixed tables.
 * Implements strict versioning with effective and expiration dates for
 * professional liability rating plans and state forms approval management.
 */
@Service
public class DroolsRatingRepositoryService {

    private static final Logger log = LoggerFactory.getLogger(DroolsRatingRepositoryService.class);

    private final JdbcTemplate ratingJdbcTemplate;
    private final ObjectMapper objectMapper;

    @Autowired
    public DroolsRatingRepositoryService(@Qualifier("ratingJdbcTemplate") JdbcTemplate ratingJdbcTemplate,
                                         ObjectMapper objectMapper) {
        this.ratingJdbcTemplate = ratingJdbcTemplate;
        this.objectMapper = objectMapper;
    }

    public record FlowHeaderDto(
            long flowId,
            String flowCode,
            String flowName,
            String description,
            String productCode,
            String planCode,
            String stateCode,
            String flowType,
            String version,
            int versionNum,
            String status,
            String effectiveDate,
            String expirationDate,
            String serffTrackingNo,
            String packageName,
            String updatedDt
    ) {}

    public record FlowFullDto(
            FlowHeaderDto header,
            String layoutJson,
            List<Map<String, Object>> nodes,
            List<Map<String, Object>> edges,
            List<Map<String, Object>> rules,
            List<Map<String, Object>> decisionTables,
            List<Map<String, Object>> stateFormApprovals,
            Map<String, Object> ratingPlanConfig
    ) {}

    public record FormApprovalDto(
            long formApprovalId,
            String productCode,
            String stateCode,
            String formNumber,
            String formName,
            String formEdition,
            String attachmentType,
            String approvalStatus,
            String doiFilingNumber,
            String serffTrackingNo,
            String effectiveDate,
            String expirationDate,
            String mandatoryCriteria,
            String exclusionCriteria,
            String updatedDt
    ) {}

    public record RatingPlanConfigDto(
            long planConfigId,
            String planCode,
            String productCode,
            String stateCode,
            String planName,
            String exposureUnit,
            BigDecimal baseLossCost,
            BigDecimal minPremium,
            BigDecimal maxScheduleDebit,
            BigDecimal maxScheduleCredit,
            String version,
            String status,
            String effectiveDate,
            String expirationDate
    ) {}

    // =========================================================================
    // FLOW CATALOG & METADATA (DR_RULE_FLOW)
    // =========================================================================

    public List<FlowHeaderDto> getFlows(String productCode, String stateCode, String status) {
        StringBuilder sql = new StringBuilder("""
                SELECT FLOW_ID, FLOW_CODE, FLOW_NAME, DESCRIPTION, PRODUCT_CODE, PLAN_CODE, STATE_CODE, FLOW_TYPE,
                       VERSION, VERSION_NUM, STATUS,
                       CONVERT(VARCHAR(10), EFFECTIVE_DATE, 120) AS EFFECTIVE_DATE,
                       CONVERT(VARCHAR(10), EXPIRATION_DATE, 120) AS EXPIRATION_DATE,
                       SERFF_TRACKING_NO, PACKAGE_NAME,
                       CONVERT(VARCHAR(30), UPDATED_DT, 120) AS UPDATED_DT
                FROM DR_RULE_FLOW
                WHERE 1=1
                """);
        List<Object> params = new ArrayList<>();

        if (productCode != null && !productCode.isBlank() && !"ALL".equalsIgnoreCase(productCode)) {
            sql.append(" AND PRODUCT_CODE = ?");
            params.add(productCode);
        }
        if (stateCode != null && !stateCode.isBlank() && !"ALL".equalsIgnoreCase(stateCode)) {
            sql.append(" AND (STATE_CODE = ? OR STATE_CODE = 'ALL')");
            params.add(stateCode);
        }
        if (status != null && !status.isBlank() && !"ALL".equalsIgnoreCase(status)) {
            sql.append(" AND STATUS = ?");
            params.add(status);
        }
        sql.append(" ORDER BY FLOW_ID DESC");

        return ratingJdbcTemplate.query(sql.toString(), (rs, i) -> new FlowHeaderDto(
                rs.getLong("FLOW_ID"),
                rs.getString("FLOW_CODE"),
                rs.getString("FLOW_NAME"),
                rs.getString("DESCRIPTION"),
                rs.getString("PRODUCT_CODE"),
                rs.getString("PLAN_CODE"),
                rs.getString("STATE_CODE"),
                rs.getString("FLOW_TYPE"),
                rs.getString("VERSION"),
                rs.getInt("VERSION_NUM"),
                rs.getString("STATUS"),
                rs.getString("EFFECTIVE_DATE"),
                rs.getString("EXPIRATION_DATE"),
                rs.getString("SERFF_TRACKING_NO"),
                rs.getString("PACKAGE_NAME"),
                rs.getString("UPDATED_DT")
        ), params.toArray());
    }

    public Optional<FlowFullDto> getFullFlow(long flowId) {
        String flowSql = """
                SELECT FLOW_ID, FLOW_CODE, FLOW_NAME, DESCRIPTION, PRODUCT_CODE, PLAN_CODE, STATE_CODE, FLOW_TYPE,
                       VERSION, VERSION_NUM, STATUS,
                       CONVERT(VARCHAR(10), EFFECTIVE_DATE, 120) AS EFFECTIVE_DATE,
                       CONVERT(VARCHAR(10), EXPIRATION_DATE, 120) AS EXPIRATION_DATE,
                       SERFF_TRACKING_NO, PACKAGE_NAME, LAYOUT_JSON,
                       CONVERT(VARCHAR(30), UPDATED_DT, 120) AS UPDATED_DT
                FROM DR_RULE_FLOW
                WHERE FLOW_ID = ?
                """;
        List<FlowFullDto> results = ratingJdbcTemplate.query(flowSql, (rs, i) -> {
            FlowHeaderDto header = new FlowHeaderDto(
                    rs.getLong("FLOW_ID"),
                    rs.getString("FLOW_CODE"),
                    rs.getString("FLOW_NAME"),
                    rs.getString("DESCRIPTION"),
                    rs.getString("PRODUCT_CODE"),
                    rs.getString("PLAN_CODE"),
                    rs.getString("STATE_CODE"),
                    rs.getString("FLOW_TYPE"),
                    rs.getString("VERSION"),
                    rs.getInt("VERSION_NUM"),
                    rs.getString("STATUS"),
                    rs.getString("EFFECTIVE_DATE"),
                    rs.getString("EXPIRATION_DATE"),
                    rs.getString("SERFF_TRACKING_NO"),
                    rs.getString("PACKAGE_NAME"),
                    rs.getString("UPDATED_DT")
            );
            String layout = rs.getString("LAYOUT_JSON");
            return new FlowFullDto(header, layout, new ArrayList<>(), new ArrayList<>(), new ArrayList<>(), new ArrayList<>(), new ArrayList<>(), new HashMap<>());
        }, flowId);

        if (results.isEmpty()) {
            return Optional.empty();
        }

        FlowFullDto base = results.get(0);
        FlowHeaderDto h = base.header();

        // 1. Nodes (DR_RULE_NODE)
        String nodeSql = """
                SELECT NODE_ID, NODE_KEY, NODE_NAME, NODE_TYPE, RULEFLOW_GROUP, EXECUTION_ORDER, CONFIG_JSON
                FROM DR_RULE_NODE
                WHERE FLOW_ID = ?
                ORDER BY EXECUTION_ORDER ASC, NODE_ID ASC
                """;
        List<Map<String, Object>> nodes = ratingJdbcTemplate.query(nodeSql, (rs, i) -> {
            Map<String, Object> node = new LinkedHashMap<>();
            node.put("nodeId", rs.getLong("NODE_ID"));
            node.put("nodeKey", rs.getString("NODE_KEY"));
            node.put("nodeName", rs.getString("NODE_NAME"));
            node.put("nodeType", rs.getString("NODE_TYPE"));
            node.put("ruleflowGroup", rs.getString("RULEFLOW_GROUP"));
            node.put("executionOrder", rs.getInt("EXECUTION_ORDER"));
            node.put("configJson", rs.getString("CONFIG_JSON"));
            return node;
        }, flowId);

        // 2. Edges (DR_RULE_ROUTING_EDGE)
        String edgeSql = """
                SELECT EDGE_ID, EDGE_KEY, SOURCE_NODE_KEY, TARGET_NODE_KEY, SOURCE_HANDLE, TARGET_HANDLE,
                       CONDITION_EXPRESSION, ROUTING_LABEL, ROUTING_ORDER
                FROM DR_RULE_ROUTING_EDGE
                WHERE FLOW_ID = ?
                ORDER BY ROUTING_ORDER ASC, EDGE_ID ASC
                """;
        List<Map<String, Object>> edges = ratingJdbcTemplate.query(edgeSql, (rs, i) -> {
            Map<String, Object> edge = new LinkedHashMap<>();
            edge.put("edgeId", rs.getLong("EDGE_ID"));
            edge.put("edgeKey", rs.getString("EDGE_KEY"));
            edge.put("sourceNodeKey", rs.getString("SOURCE_NODE_KEY"));
            edge.put("targetNodeKey", rs.getString("TARGET_NODE_KEY"));
            edge.put("sourceHandle", rs.getString("SOURCE_HANDLE"));
            edge.put("targetHandle", rs.getString("TARGET_HANDLE"));
            edge.put("conditionExpression", rs.getString("CONDITION_EXPRESSION"));
            edge.put("routingLabel", rs.getString("ROUTING_LABEL"));
            edge.put("routingOrder", rs.getInt("ROUTING_ORDER"));
            return edge;
        }, flowId);

        // 3. Rule Definitions (DR_RULE_DEFINITION)
        String ruleSql = """
                SELECT RULE_ID, NODE_ID, RULE_NAME, RULEFLOW_GROUP, SALIENCE, AGENDA_GROUP, ACTIVATION_GROUP,
                       NO_LOOP, LOCK_ON_ACTIVE, WHEN_CONDITION, THEN_CONSEQUENCE, STATUS,
                       CONVERT(VARCHAR(10), EFFECTIVE_DATE, 120) AS EFFECTIVE_DATE,
                       CONVERT(VARCHAR(10), EXPIRATION_DATE, 120) AS EXPIRATION_DATE
                FROM DR_RULE_DEFINITION
                WHERE FLOW_ID = ?
                ORDER BY SALIENCE DESC, RULE_ID ASC
                """;
        List<Map<String, Object>> rules = ratingJdbcTemplate.query(ruleSql, (rs, i) -> {
            Map<String, Object> r = new LinkedHashMap<>();
            r.put("ruleId", rs.getLong("RULE_ID"));
            r.put("nodeId", rs.getObject("NODE_ID"));
            r.put("ruleName", rs.getString("RULE_NAME"));
            r.put("ruleflowGroup", rs.getString("RULEFLOW_GROUP"));
            r.put("salience", rs.getInt("SALIENCE"));
            r.put("agendaGroup", rs.getString("AGENDA_GROUP"));
            r.put("activationGroup", rs.getString("ACTIVATION_GROUP"));
            r.put("noLoop", rs.getBoolean("NO_LOOP"));
            r.put("lockOnActive", rs.getBoolean("LOCK_ON_ACTIVE"));
            r.put("whenCondition", rs.getString("WHEN_CONDITION"));
            r.put("thenConsequence", rs.getString("THEN_CONSEQUENCE"));
            r.put("status", rs.getString("STATUS"));
            r.put("effectiveDate", rs.getString("EFFECTIVE_DATE"));
            r.put("expirationDate", rs.getString("EXPIRATION_DATE"));
            return r;
        }, flowId);

        // 4. Decision Tables (DR_DECISION_TABLE)
        List<Map<String, Object>> decisionTables = getDecisionTablesForFlow(flowId);

        // 5. State Form Approvals for this product (DR_FORM_STATE_APPROVAL)
        List<Map<String, Object>> formApprovals = getFormApprovalsForProduct(h.productCode(), h.stateCode(), h.effectiveDate());

        // 6. Rating Plan Config for this product & plan (DR_RATING_PLAN_CONFIG)
        Map<String, Object> planConfig = getRatingPlanConfig(h.productCode(), h.planCode(), h.stateCode(), h.effectiveDate());

        return Optional.of(new FlowFullDto(
                h,
                base.layoutJson(),
                nodes,
                edges,
                rules,
                decisionTables,
                formApprovals,
                planConfig
        ));
    }

    public List<Map<String, Object>> getDecisionTablesForFlow(long flowId) {
        String dtSql = """
                SELECT TABLE_ID, NODE_ID, TABLE_CODE, TABLE_NAME, RULEFLOW_GROUP, HIT_POLICY, DESCRIPTION
                FROM DR_DECISION_TABLE
                WHERE FLOW_ID = ?
                """;
        return ratingJdbcTemplate.query(dtSql, (rs, i) -> {
            long tableId = rs.getLong("TABLE_ID");
            Map<String, Object> dt = new LinkedHashMap<>();
            dt.put("tableId", tableId);
            dt.put("nodeId", rs.getObject("NODE_ID"));
            dt.put("tableCode", rs.getString("TABLE_CODE"));
            dt.put("tableName", rs.getString("TABLE_NAME"));
            dt.put("ruleflowGroup", rs.getString("RULEFLOW_GROUP"));
            dt.put("hitPolicy", rs.getString("HIT_POLICY"));
            dt.put("description", rs.getString("DESCRIPTION"));

            // Columns
            String colSql = """
                    SELECT COLUMN_ID, COLUMN_TYPE, HEADER_LABEL, PROPERTY_PATH, OPERATOR, DATA_TYPE, COL_INDEX
                    FROM DR_DECISION_TABLE_COLUMN
                    WHERE TABLE_ID = ?
                    ORDER BY COL_INDEX ASC
                    """;
            List<Map<String, Object>> cols = ratingJdbcTemplate.query(colSql, (crs, ci) -> {
                Map<String, Object> c = new LinkedHashMap<>();
                c.put("columnId", crs.getLong("COLUMN_ID"));
                c.put("columnType", crs.getString("COLUMN_TYPE"));
                c.put("headerLabel", crs.getString("HEADER_LABEL"));
                c.put("propertyPath", crs.getString("PROPERTY_PATH"));
                c.put("operator", crs.getString("OPERATOR"));
                c.put("dataType", crs.getString("DATA_TYPE"));
                c.put("colIndex", crs.getInt("COL_INDEX"));
                return c;
            }, tableId);
            dt.put("columns", cols);

            // Rows
            String rowSql = """
                    SELECT ROW_ID, ROW_ORDER, IS_ACTIVE, DESCRIPTION
                    FROM DR_DECISION_TABLE_ROW
                    WHERE TABLE_ID = ?
                    ORDER BY ROW_ORDER ASC
                    """;
            List<Map<String, Object>> rows = ratingJdbcTemplate.query(rowSql, (rrs, ri) -> {
                long rowId = rrs.getLong("ROW_ID");
                Map<String, Object> r = new LinkedHashMap<>();
                r.put("rowId", rowId);
                r.put("rowOrder", rrs.getInt("ROW_ORDER"));
                r.put("isActive", rrs.getBoolean("IS_ACTIVE"));
                r.put("description", rrs.getString("DESCRIPTION"));

                // Cells
                String cellSql = """
                        SELECT CELL_ID, COLUMN_ID, CELL_VALUE
                        FROM DR_DECISION_TABLE_CELL
                        WHERE ROW_ID = ?
                        """;
                Map<String, String> cells = new HashMap<>();
                ratingJdbcTemplate.query(cellSql, (cers) -> {
                    cells.put(String.valueOf(cers.getLong("COLUMN_ID")), cers.getString("CELL_VALUE"));
                }, rowId);
                r.put("cells", cells);
                return r;
            }, tableId);
            dt.put("rows", rows);

            return dt;
        }, flowId);
    }

    // =========================================================================
    // CREATION & VERSIONING WITH EFFECTIVE & EXPIRATION DATES
    // =========================================================================

    public FlowHeaderDto createRuleFlow(
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
    ) {
        String insertSql = """
                INSERT INTO DR_RULE_FLOW (
                    FLOW_CODE, FLOW_NAME, DESCRIPTION, PRODUCT_CODE, PLAN_CODE, STATE_CODE, FLOW_TYPE,
                    VERSION, VERSION_NUM, STATUS, EFFECTIVE_DATE, EXPIRATION_DATE, SERFF_TRACKING_NO,
                    PACKAGE_NAME, CREATED_BY, UPDATED_BY
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 'DRAFT', ?, ?, ?, ?, 'SYSTEM', 'SYSTEM')
                """;
        KeyHolder kh = new GeneratedKeyHolder();
        ratingJdbcTemplate.update(con -> {
            PreparedStatement ps = con.prepareStatement(insertSql, Statement.RETURN_GENERATED_KEYS);
            ps.setString(1, flowCode);
            ps.setString(2, flowName);
            ps.setString(3, description);
            ps.setString(4, productCode != null ? productCode : "TECH_EO");
            ps.setString(5, planCode != null ? planCode : "TECH_EO_COMMERCIAL");
            ps.setString(6, (stateCode != null && !stateCode.isBlank()) ? stateCode : "ALL");
            ps.setString(7, flowType != null ? flowType : "RATING_AND_FORMS");
            ps.setString(8, (version != null && !version.isBlank()) ? version : "1.0.0");
            ps.setDate(9, effectiveDate != null ? Date.valueOf(effectiveDate) : Date.valueOf(LocalDate.now()));
            if (expirationDate != null && !expirationDate.isBlank()) {
                ps.setDate(10, Date.valueOf(expirationDate));
            } else {
                ps.setNull(10, java.sql.Types.DATE);
            }
            ps.setString(11, serffTrackingNo);
            ps.setString(12, (packageName != null && !packageName.isBlank()) ? packageName : "com.helios.drools.rules");
            return ps;
        }, kh);

        long flowId = Objects.requireNonNull(kh.getKey()).longValue();

        // Seed default Start and End nodes
        ratingJdbcTemplate.update("""
                INSERT INTO DR_RULE_NODE (FLOW_ID, NODE_KEY, NODE_NAME, NODE_TYPE, EXECUTION_ORDER, CONFIG_JSON)
                VALUES (?, 'node-start', 'Start Policy Submission', 'START', 1, '{"x": 100, "y": 200}'),
                       (?, 'node-end', 'Policy Binding & Rating Terminal', 'END', 2, '{"x": 600, "y": 200}')
                """, flowId, flowId);

        return getFullFlow(flowId).orElseThrow().header();
    }

    public void updateRuleFlowHeader(
            long flowId,
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
    ) {
        String sql = """
                UPDATE DR_RULE_FLOW
                SET FLOW_NAME = COALESCE(?, FLOW_NAME),
                    DESCRIPTION = COALESCE(?, DESCRIPTION),
                    PRODUCT_CODE = COALESCE(?, PRODUCT_CODE),
                    PLAN_CODE = COALESCE(?, PLAN_CODE),
                    STATE_CODE = COALESCE(?, STATE_CODE),
                    VERSION = COALESCE(?, VERSION),
                    STATUS = COALESCE(?, STATUS),
                    EFFECTIVE_DATE = COALESCE(?, EFFECTIVE_DATE),
                    EXPIRATION_DATE = ?,
                    SERFF_TRACKING_NO = COALESCE(?, SERFF_TRACKING_NO),
                    UPDATED_DT = SYSDATETIMEOFFSET()
                WHERE FLOW_ID = ?
                """;
        ratingJdbcTemplate.update(sql,
                flowName,
                description,
                productCode,
                planCode,
                stateCode,
                version,
                status,
                effectiveDate != null ? Date.valueOf(effectiveDate) : null,
                (expirationDate != null && !expirationDate.isBlank()) ? Date.valueOf(expirationDate) : null,
                serffTrackingNo,
                flowId
        );
    }

    @Transactional
    public FlowHeaderDto cloneFlowVersion(long sourceFlowId, String newVersion, String newEffectiveDate, String newExpirationDate) {
        FlowFullDto source = getFullFlow(sourceFlowId).orElseThrow(() -> new IllegalArgumentException("Flow not found: " + sourceFlowId));
        FlowHeaderDto h = source.header();

        // Expire previous version if effective date is provided
        if (newEffectiveDate != null && !newEffectiveDate.isBlank()) {
            LocalDate newEff = LocalDate.parse(newEffectiveDate);
            LocalDate prevExp = newEff.minusDays(1);
            ratingJdbcTemplate.update("""
                    UPDATE DR_RULE_FLOW
                    SET EXPIRATION_DATE = ?, STATUS = 'SUPERSEDED', UPDATED_DT = SYSDATETIMEOFFSET()
                    WHERE FLOW_ID = ?
                    """, Date.valueOf(prevExp), sourceFlowId);
        }

        // Insert new Flow Version
        String insertSql = """
                INSERT INTO DR_RULE_FLOW (
                    FLOW_CODE, FLOW_NAME, DESCRIPTION, PRODUCT_CODE, PLAN_CODE, STATE_CODE, FLOW_TYPE,
                    VERSION, VERSION_NUM, STATUS, EFFECTIVE_DATE, EXPIRATION_DATE, SERFF_TRACKING_NO,
                    PACKAGE_NAME, GLOBAL_DEFINITIONS, LAYOUT_JSON, CREATED_BY, UPDATED_BY
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'DRAFT', ?, ?, ?, ?, ?, ?, 'SYSTEM', 'SYSTEM')
                """;
        KeyHolder kh = new GeneratedKeyHolder();
        ratingJdbcTemplate.update(con -> {
            PreparedStatement ps = con.prepareStatement(insertSql, Statement.RETURN_GENERATED_KEYS);
            ps.setString(1, h.flowCode());
            ps.setString(2, h.flowName());
            ps.setString(3, h.description());
            ps.setString(4, h.productCode());
            ps.setString(5, h.planCode());
            ps.setString(6, h.stateCode());
            ps.setString(7, h.flowType());
            ps.setString(8, (newVersion != null && !newVersion.isBlank()) ? newVersion : (h.version() + ".1"));
            ps.setInt(9, h.versionNum() + 1);
            ps.setDate(10, (newEffectiveDate != null && !newEffectiveDate.isBlank()) ? Date.valueOf(newEffectiveDate) : Date.valueOf(LocalDate.now()));
            if (newExpirationDate != null && !newExpirationDate.isBlank()) {
                ps.setDate(11, Date.valueOf(newExpirationDate));
            } else {
                ps.setNull(11, java.sql.Types.DATE);
            }
            ps.setString(12, h.serffTrackingNo());
            ps.setString(13, h.packageName());
            ps.setString(14, "");
            ps.setString(15, source.layoutJson());
            return ps;
        }, kh);

        long newFlowId = Objects.requireNonNull(kh.getKey()).longValue();

        // Map old node ID to new node ID
        Map<Long, Long> nodeIdMap = new HashMap<>();
        for (Map<String, Object> node : source.nodes()) {
            long oldNodeId = ((Number) node.get("nodeId")).longValue();
            KeyHolder nodeKh = new GeneratedKeyHolder();
            ratingJdbcTemplate.update(con -> {
                PreparedStatement ps = con.prepareStatement("""
                        INSERT INTO DR_RULE_NODE (FLOW_ID, NODE_KEY, NODE_NAME, NODE_TYPE, RULEFLOW_GROUP, EXECUTION_ORDER, CONFIG_JSON)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                        """, Statement.RETURN_GENERATED_KEYS);
                ps.setLong(1, newFlowId);
                ps.setString(2, (String) node.get("nodeKey"));
                ps.setString(3, (String) node.get("nodeName"));
                ps.setString(4, (String) node.get("nodeType"));
                ps.setString(5, (String) node.get("ruleflowGroup"));
                ps.setInt(6, ((Number) node.get("executionOrder")).intValue());
                ps.setString(7, (String) node.get("configJson"));
                return ps;
            }, nodeKh);
            nodeIdMap.put(oldNodeId, Objects.requireNonNull(nodeKh.getKey()).longValue());
        }

        // Clone Edges
        for (Map<String, Object> edge : source.edges()) {
            ratingJdbcTemplate.update("""
                    INSERT INTO DR_RULE_ROUTING_EDGE (FLOW_ID, EDGE_KEY, SOURCE_NODE_KEY, TARGET_NODE_KEY, SOURCE_HANDLE, TARGET_HANDLE, CONDITION_EXPRESSION, ROUTING_LABEL, ROUTING_ORDER)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    newFlowId,
                    edge.get("edgeKey"),
                    edge.get("sourceNodeKey"),
                    edge.get("targetNodeKey"),
                    edge.get("sourceHandle"),
                    edge.get("targetHandle"),
                    edge.get("conditionExpression"),
                    edge.get("routingLabel"),
                    edge.get("routingOrder")
            );
        }

        // Clone Rules
        for (Map<String, Object> rule : source.rules()) {
            Long oldNodeId = rule.get("nodeId") != null ? ((Number) rule.get("nodeId")).longValue() : null;
            Long newNodeId = oldNodeId != null ? nodeIdMap.get(oldNodeId) : null;
            ratingJdbcTemplate.update("""
                    INSERT INTO DR_RULE_DEFINITION (FLOW_ID, NODE_ID, RULE_NAME, RULEFLOW_GROUP, SALIENCE, AGENDA_GROUP, ACTIVATION_GROUP, NO_LOOP, LOCK_ON_ACTIVE, WHEN_CONDITION, THEN_CONSEQUENCE, STATUS, EFFECTIVE_DATE, EXPIRATION_DATE)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?)
                    """,
                    newFlowId,
                    newNodeId,
                    rule.get("ruleName"),
                    rule.get("ruleflowGroup"),
                    rule.get("salience"),
                    rule.get("agendaGroup"),
                    rule.get("activationGroup"),
                    rule.get("noLoop"),
                    rule.get("lockOnActive"),
                    rule.get("whenCondition"),
                    rule.get("thenConsequence"),
                    Date.valueOf((newEffectiveDate != null && !newEffectiveDate.isBlank()) ? newEffectiveDate : LocalDate.now().toString()),
                    (newExpirationDate != null && !newExpirationDate.isBlank()) ? Date.valueOf(newExpirationDate) : null
            );
        }

        // Clone Decision Tables
        for (Map<String, Object> dt : source.decisionTables()) {
            Long oldNodeId = dt.get("nodeId") != null ? ((Number) dt.get("nodeId")).longValue() : null;
            Long newNodeId = oldNodeId != null ? nodeIdMap.get(oldNodeId) : null;
            KeyHolder dtKh = new GeneratedKeyHolder();
            ratingJdbcTemplate.update(con -> {
                PreparedStatement ps = con.prepareStatement("""
                        INSERT INTO DR_DECISION_TABLE (FLOW_ID, NODE_ID, TABLE_CODE, TABLE_NAME, RULEFLOW_GROUP, HIT_POLICY, DESCRIPTION)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                        """, Statement.RETURN_GENERATED_KEYS);
                ps.setLong(1, newFlowId);
                if (newNodeId != null) ps.setLong(2, newNodeId); else ps.setNull(2, java.sql.Types.BIGINT);
                ps.setString(3, (String) dt.get("tableCode"));
                ps.setString(4, (String) dt.get("tableName"));
                ps.setString(5, (String) dt.get("ruleflowGroup"));
                ps.setString(6, (String) dt.get("hitPolicy"));
                ps.setString(7, (String) dt.get("description"));
                return ps;
            }, dtKh);
            long newTableId = Objects.requireNonNull(dtKh.getKey()).longValue();

            // Clone Columns
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> cols = (List<Map<String, Object>>) dt.get("columns");
            Map<Long, Long> colIdMap = new HashMap<>();
            if (cols != null) {
                for (Map<String, Object> c : cols) {
                    long oldColId = ((Number) c.get("columnId")).longValue();
                    KeyHolder colKh = new GeneratedKeyHolder();
                    ratingJdbcTemplate.update(con -> {
                        PreparedStatement ps = con.prepareStatement("""
                                INSERT INTO DR_DECISION_TABLE_COLUMN (TABLE_ID, COLUMN_TYPE, HEADER_LABEL, PROPERTY_PATH, OPERATOR, DATA_TYPE, COL_INDEX)
                                VALUES (?, ?, ?, ?, ?, ?, ?)
                                """, Statement.RETURN_GENERATED_KEYS);
                        ps.setLong(1, newTableId);
                        ps.setString(2, (String) c.get("columnType"));
                        ps.setString(3, (String) c.get("headerLabel"));
                        ps.setString(4, (String) c.get("propertyPath"));
                        ps.setString(5, (String) c.get("operator"));
                        ps.setString(6, (String) c.get("dataType"));
                        ps.setInt(7, ((Number) c.get("colIndex")).intValue());
                        return ps;
                    }, colKh);
                    colIdMap.put(oldColId, Objects.requireNonNull(colKh.getKey()).longValue());
                }
            }

            // Clone Rows & Cells
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> rList = (List<Map<String, Object>>) dt.get("rows");
            if (rList != null) {
                for (Map<String, Object> r : rList) {
                    KeyHolder rowKh = new GeneratedKeyHolder();
                    ratingJdbcTemplate.update(con -> {
                        PreparedStatement ps = con.prepareStatement("""
                                INSERT INTO DR_DECISION_TABLE_ROW (TABLE_ID, ROW_ORDER, IS_ACTIVE, DESCRIPTION)
                                VALUES (?, ?, ?, ?)
                                """, Statement.RETURN_GENERATED_KEYS);
                        ps.setLong(1, newTableId);
                        ps.setInt(2, ((Number) r.get("rowOrder")).intValue());
                        ps.setBoolean(3, Boolean.TRUE.equals(r.get("isActive")));
                        ps.setString(4, (String) r.get("description"));
                        return ps;
                    }, rowKh);
                    long newRowId = Objects.requireNonNull(rowKh.getKey()).longValue();

                    @SuppressWarnings("unchecked")
                    Map<String, String> cells = (Map<String, String>) r.get("cells");
                    if (cells != null) {
                        for (Map.Entry<String, String> ce : cells.entrySet()) {
                            long oldColId = Long.parseLong(ce.getKey());
                            Long newColId = colIdMap.get(oldColId);
                            if (newColId != null) {
                                ratingJdbcTemplate.update("""
                                        INSERT INTO DR_DECISION_TABLE_CELL (ROW_ID, COLUMN_ID, CELL_VALUE)
                                        VALUES (?, ?, ?)
                                        """, newRowId, newColId, ce.getValue());
                            }
                        }
                    }
                }
            }
        }

        return getFullFlow(newFlowId).orElseThrow().header();
    }

    public void saveLayout(long flowId, String layoutJson) {
        ratingJdbcTemplate.update("""
                UPDATE DR_RULE_FLOW
                SET LAYOUT_JSON = ?, UPDATED_DT = SYSDATETIMEOFFSET()
                WHERE FLOW_ID = ?
                """, layoutJson, flowId);
    }

    @Transactional
    public void deleteFlow(long flowId) {
        // delete audit steps & audits
        ratingJdbcTemplate.update("DELETE FROM DR_EXECUTION_AUDIT_STEP WHERE AUDIT_ID IN (SELECT AUDIT_ID FROM DR_EXECUTION_AUDIT WHERE FLOW_ID = ?)", flowId);
        ratingJdbcTemplate.update("DELETE FROM DR_EXECUTION_AUDIT WHERE FLOW_ID = ?", flowId);

        // delete decision tables
        ratingJdbcTemplate.update("DELETE FROM DR_DECISION_TABLE_CELL WHERE ROW_ID IN (SELECT ROW_ID FROM DR_DECISION_TABLE_ROW WHERE TABLE_ID IN (SELECT TABLE_ID FROM DR_DECISION_TABLE WHERE FLOW_ID = ?))", flowId);
        ratingJdbcTemplate.update("DELETE FROM DR_DECISION_TABLE_ROW WHERE TABLE_ID IN (SELECT TABLE_ID FROM DR_DECISION_TABLE WHERE FLOW_ID = ?)", flowId);
        ratingJdbcTemplate.update("DELETE FROM DR_DECISION_TABLE_COLUMN WHERE TABLE_ID IN (SELECT TABLE_ID FROM DR_DECISION_TABLE WHERE FLOW_ID = ?)", flowId);
        ratingJdbcTemplate.update("DELETE FROM DR_DECISION_TABLE WHERE FLOW_ID = ?", flowId);

        // delete rules and edges
        ratingJdbcTemplate.update("DELETE FROM DR_RULE_DEFINITION WHERE NODE_ID IN (SELECT NODE_ID FROM DR_RULE_NODE WHERE FLOW_ID = ?)", flowId);
        ratingJdbcTemplate.update("DELETE FROM DR_RULE_ROUTING_EDGE WHERE FLOW_ID = ?", flowId);

        // delete nodes
        ratingJdbcTemplate.update("DELETE FROM DR_RULE_NODE WHERE FLOW_ID = ?", flowId);

        // delete flow
        ratingJdbcTemplate.update("DELETE FROM DR_RULE_FLOW WHERE FLOW_ID = ?", flowId);
    }

    // =========================================================================
    // FORMS STATE APPROVAL MANAGEMENT (DR_FORM_STATE_APPROVAL)
    // =========================================================================

    public List<Map<String, Object>> getFormApprovalsForProduct(String productCode, String stateCode, String effDateStr) {
        StringBuilder sql = new StringBuilder("""
                SELECT FORM_APPROVAL_ID, PRODUCT_CODE, STATE_CODE, FORM_NUMBER, FORM_NAME, FORM_EDITION,
                       ATTACHMENT_TYPE, APPROVAL_STATUS, DOI_FILING_NUMBER, SERFF_TRACKING_NO,
                       CONVERT(VARCHAR(10), EFFECTIVE_DATE, 120) AS EFFECTIVE_DATE,
                       CONVERT(VARCHAR(10), EXPIRATION_DATE, 120) AS EXPIRATION_DATE,
                       MANDATORY_CRITERIA, EXCLUSION_CRITERIA,
                       CONVERT(VARCHAR(30), UPDATED_DT, 120) AS UPDATED_DT
                FROM DR_FORM_STATE_APPROVAL
                WHERE 1=1
                """);
        List<Object> params = new ArrayList<>();

        if (productCode != null && !productCode.isBlank() && !"ALL".equalsIgnoreCase(productCode)) {
            sql.append(" AND PRODUCT_CODE = ?");
            params.add(productCode);
        }
        if (stateCode != null && !stateCode.isBlank() && !"ALL".equalsIgnoreCase(stateCode)) {
            sql.append(" AND (STATE_CODE = ? OR STATE_CODE = 'ALL')");
            params.add(stateCode);
        }
        if (effDateStr != null && !effDateStr.isBlank()) {
            sql.append(" AND EFFECTIVE_DATE <= ? AND (EXPIRATION_DATE IS NULL OR EXPIRATION_DATE >= ?)");
            params.add(Date.valueOf(effDateStr));
            params.add(Date.valueOf(effDateStr));
        }
        sql.append(" ORDER BY STATE_CODE ASC, ATTACHMENT_TYPE DESC, FORM_NUMBER ASC");

        return ratingJdbcTemplate.query(sql.toString(), (rs, i) -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("formApprovalId", rs.getLong("FORM_APPROVAL_ID"));
            m.put("productCode", rs.getString("PRODUCT_CODE"));
            m.put("stateCode", rs.getString("STATE_CODE"));
            m.put("formNumber", rs.getString("FORM_NUMBER"));
            m.put("formName", rs.getString("FORM_NAME"));
            m.put("formEdition", rs.getString("FORM_EDITION"));
            m.put("attachmentType", rs.getString("ATTACHMENT_TYPE"));
            m.put("approvalStatus", rs.getString("APPROVAL_STATUS"));
            m.put("doiFilingNumber", rs.getString("DOI_FILING_NUMBER"));
            m.put("serffTrackingNo", rs.getString("SERFF_TRACKING_NO"));
            m.put("effectiveDate", rs.getString("EFFECTIVE_DATE"));
            m.put("expirationDate", rs.getString("EXPIRATION_DATE"));
            m.put("mandatoryCriteria", rs.getString("MANDATORY_CRITERIA"));
            m.put("exclusionCriteria", rs.getString("EXCLUSION_CRITERIA"));
            m.put("updatedDt", rs.getString("UPDATED_DT"));
            return m;
        }, params.toArray());
    }

    public void saveFormApproval(Map<String, Object> form) {
        Long id = form.get("formApprovalId") != null ? ((Number) form.get("formApprovalId")).longValue() : null;
        if (id == null || id <= 0) {
            String insertSql = """
                    INSERT INTO DR_FORM_STATE_APPROVAL (
                        PRODUCT_CODE, STATE_CODE, FORM_NUMBER, FORM_NAME, FORM_EDITION,
                        ATTACHMENT_TYPE, APPROVAL_STATUS, DOI_FILING_NUMBER, SERFF_TRACKING_NO,
                        EFFECTIVE_DATE, EXPIRATION_DATE, MANDATORY_CRITERIA, EXCLUSION_CRITERIA
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """;
            ratingJdbcTemplate.update(insertSql,
                    form.get("productCode"),
                    form.get("stateCode"),
                    form.get("formNumber"),
                    form.get("formName"),
                    form.get("formEdition"),
                    form.get("attachmentType"),
                    form.get("approvalStatus"),
                    form.get("doiFilingNumber"),
                    form.get("serffTrackingNo"),
                    Date.valueOf((String) form.get("effectiveDate")),
                    (form.get("expirationDate") != null && !((String) form.get("expirationDate")).isBlank()) ? Date.valueOf((String) form.get("expirationDate")) : null,
                    form.get("mandatoryCriteria"),
                    form.get("exclusionCriteria")
            );
        } else {
            String updateSql = """
                    UPDATE DR_FORM_STATE_APPROVAL
                    SET PRODUCT_CODE = ?, STATE_CODE = ?, FORM_NUMBER = ?, FORM_NAME = ?, FORM_EDITION = ?,
                        ATTACHMENT_TYPE = ?, APPROVAL_STATUS = ?, DOI_FILING_NUMBER = ?, SERFF_TRACKING_NO = ?,
                        EFFECTIVE_DATE = ?, EXPIRATION_DATE = ?, MANDATORY_CRITERIA = ?, EXCLUSION_CRITERIA = ?,
                        UPDATED_DT = SYSDATETIMEOFFSET()
                    WHERE FORM_APPROVAL_ID = ?
                    """;
            ratingJdbcTemplate.update(updateSql,
                    form.get("productCode"),
                    form.get("stateCode"),
                    form.get("formNumber"),
                    form.get("formName"),
                    form.get("formEdition"),
                    form.get("attachmentType"),
                    form.get("approvalStatus"),
                    form.get("doiFilingNumber"),
                    form.get("serffTrackingNo"),
                    Date.valueOf((String) form.get("effectiveDate")),
                    (form.get("expirationDate") != null && !((String) form.get("expirationDate")).isBlank()) ? Date.valueOf((String) form.get("expirationDate")) : null,
                    form.get("mandatoryCriteria"),
                    form.get("exclusionCriteria"),
                    id
            );
        }
    }

    public void deleteFormApproval(long id) {
        ratingJdbcTemplate.update("DELETE FROM DR_FORM_STATE_APPROVAL WHERE FORM_APPROVAL_ID = ?", id);
    }

    // =========================================================================
    // PROFESSIONAL LIABILITY RATING PLAN CONFIG (DR_RATING_PLAN_CONFIG)
    // =========================================================================

    public List<RatingPlanConfigDto> getRatingPlanConfigs(String productCode, String stateCode, String effDateStr) {
        StringBuilder sql = new StringBuilder("""
                SELECT PLAN_CONFIG_ID, PLAN_CODE, PRODUCT_CODE, STATE_CODE, PLAN_NAME, EXPOSURE_UNIT,
                       BASE_LOSS_COST, MIN_PREMIUM, MAX_SCHEDULE_DEBIT, MAX_SCHEDULE_CREDIT,
                       VERSION, STATUS,
                       CONVERT(VARCHAR(10), EFFECTIVE_DATE, 120) AS EFFECTIVE_DATE,
                       CONVERT(VARCHAR(10), EXPIRATION_DATE, 120) AS EXPIRATION_DATE
                FROM DR_RATING_PLAN_CONFIG
                WHERE 1=1
                """);
        List<Object> params = new ArrayList<>();

        if (productCode != null && !productCode.isBlank() && !"ALL".equalsIgnoreCase(productCode)) {
            sql.append(" AND PRODUCT_CODE = ?");
            params.add(productCode);
        }
        if (stateCode != null && !stateCode.isBlank() && !"ALL".equalsIgnoreCase(stateCode)) {
            sql.append(" AND (STATE_CODE = ? OR STATE_CODE = 'ALL')");
            params.add(stateCode);
        }
        if (effDateStr != null && !effDateStr.isBlank()) {
            sql.append(" AND EFFECTIVE_DATE <= ? AND (EXPIRATION_DATE IS NULL OR EXPIRATION_DATE >= ?)");
            params.add(Date.valueOf(effDateStr));
            params.add(Date.valueOf(effDateStr));
        }
        sql.append(" ORDER BY PRODUCT_CODE ASC, STATE_CODE ASC, EFFECTIVE_DATE DESC");

        return ratingJdbcTemplate.query(sql.toString(), (rs, i) -> new RatingPlanConfigDto(
                rs.getLong("PLAN_CONFIG_ID"),
                rs.getString("PLAN_CODE"),
                rs.getString("PRODUCT_CODE"),
                rs.getString("STATE_CODE"),
                rs.getString("PLAN_NAME"),
                rs.getString("EXPOSURE_UNIT"),
                rs.getBigDecimal("BASE_LOSS_COST"),
                rs.getBigDecimal("MIN_PREMIUM"),
                rs.getBigDecimal("MAX_SCHEDULE_DEBIT"),
                rs.getBigDecimal("MAX_SCHEDULE_CREDIT"),
                rs.getString("VERSION"),
                rs.getString("STATUS"),
                rs.getString("EFFECTIVE_DATE"),
                rs.getString("EXPIRATION_DATE")
        ), params.toArray());
    }

    public Map<String, Object> getRatingPlanConfig(String productCode, String planCode, String stateCode, String effDateStr) {
        String sql = """
                SELECT TOP 1 PLAN_CONFIG_ID, PLAN_CODE, PRODUCT_CODE, STATE_CODE, PLAN_NAME, EXPOSURE_UNIT,
                       BASE_LOSS_COST, MIN_PREMIUM, MAX_SCHEDULE_DEBIT, MAX_SCHEDULE_CREDIT,
                       VERSION, STATUS,
                       CONVERT(VARCHAR(10), EFFECTIVE_DATE, 120) AS EFFECTIVE_DATE,
                       CONVERT(VARCHAR(10), EXPIRATION_DATE, 120) AS EXPIRATION_DATE
                FROM DR_RATING_PLAN_CONFIG
                WHERE PRODUCT_CODE = ?
                  AND (STATE_CODE = ? OR STATE_CODE = 'ALL')
                  AND STATUS = 'ACTIVE'
                  AND EFFECTIVE_DATE <= ?
                  AND (EXPIRATION_DATE IS NULL OR EXPIRATION_DATE >= ?)
                ORDER BY CASE WHEN STATE_CODE = ? THEN 1 ELSE 2 END, EFFECTIVE_DATE DESC
                """;
        Date eff = effDateStr != null ? Date.valueOf(effDateStr) : Date.valueOf(LocalDate.now());
        List<Map<String, Object>> list = ratingJdbcTemplate.query(sql, (rs, i) -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("planConfigId", rs.getLong("PLAN_CONFIG_ID"));
            m.put("planCode", rs.getString("PLAN_CODE"));
            m.put("productCode", rs.getString("PRODUCT_CODE"));
            m.put("stateCode", rs.getString("STATE_CODE"));
            m.put("planName", rs.getString("PLAN_NAME"));
            m.put("exposureUnit", rs.getString("EXPOSURE_UNIT"));
            m.put("baseLossCost", rs.getBigDecimal("BASE_LOSS_COST"));
            m.put("minPremium", rs.getBigDecimal("MIN_PREMIUM"));
            m.put("maxScheduleDebit", rs.getBigDecimal("MAX_SCHEDULE_DEBIT"));
            m.put("maxScheduleCredit", rs.getBigDecimal("MAX_SCHEDULE_CREDIT"));
            m.put("version", rs.getString("VERSION"));
            m.put("status", rs.getString("STATUS"));
            m.put("effectiveDate", rs.getString("EFFECTIVE_DATE"));
            m.put("expirationDate", rs.getString("EXPIRATION_DATE"));
            return m;
        }, productCode, stateCode, eff, eff, stateCode);

        return list.isEmpty() ? Collections.emptyMap() : list.get(0);
    }

    public void saveRatingPlanConfig(Map<String, Object> plan) {
        Long id = plan.get("planConfigId") != null ? ((Number) plan.get("planConfigId")).longValue() : null;
        if (id == null || id <= 0) {
            String insertSql = """
                    INSERT INTO DR_RATING_PLAN_CONFIG (
                        PLAN_CODE, PRODUCT_CODE, STATE_CODE, PLAN_NAME, EXPOSURE_UNIT,
                        BASE_LOSS_COST, MIN_PREMIUM, MAX_SCHEDULE_DEBIT, MAX_SCHEDULE_CREDIT,
                        VERSION, STATUS, EFFECTIVE_DATE, EXPIRATION_DATE
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """;
            ratingJdbcTemplate.update(insertSql,
                    plan.get("planCode"),
                    plan.get("productCode"),
                    plan.get("stateCode"),
                    plan.get("planName"),
                    plan.get("exposureUnit"),
                    new BigDecimal(String.valueOf(plan.get("baseLossCost"))),
                    new BigDecimal(String.valueOf(plan.get("minPremium"))),
                    new BigDecimal(String.valueOf(plan.getOrDefault("maxScheduleDebit", "0.25"))),
                    new BigDecimal(String.valueOf(plan.getOrDefault("maxScheduleCredit", "0.25"))),
                    plan.get("version"),
                    plan.getOrDefault("status", "ACTIVE"),
                    Date.valueOf((String) plan.get("effectiveDate")),
                    (plan.get("expirationDate") != null && !((String) plan.get("expirationDate")).isBlank()) ? Date.valueOf((String) plan.get("expirationDate")) : null
            );
        } else {
            String updateSql = """
                    UPDATE DR_RATING_PLAN_CONFIG
                    SET PLAN_CODE = ?, PRODUCT_CODE = ?, STATE_CODE = ?, PLAN_NAME = ?, EXPOSURE_UNIT = ?,
                        BASE_LOSS_COST = ?, MIN_PREMIUM = ?, MAX_SCHEDULE_DEBIT = ?, MAX_SCHEDULE_CREDIT = ?,
                        VERSION = ?, STATUS = ?, EFFECTIVE_DATE = ?, EXPIRATION_DATE = ?,
                        UPDATED_DT = SYSDATETIMEOFFSET()
                    WHERE PLAN_CONFIG_ID = ?
                    """;
            ratingJdbcTemplate.update(updateSql,
                    plan.get("planCode"),
                    plan.get("productCode"),
                    plan.get("stateCode"),
                    plan.get("planName"),
                    plan.get("exposureUnit"),
                    new BigDecimal(String.valueOf(plan.get("baseLossCost"))),
                    new BigDecimal(String.valueOf(plan.get("minPremium"))),
                    new BigDecimal(String.valueOf(plan.getOrDefault("maxScheduleDebit", "0.25"))),
                    new BigDecimal(String.valueOf(plan.getOrDefault("maxScheduleCredit", "0.25"))),
                    plan.get("version"),
                    plan.getOrDefault("status", "ACTIVE"),
                    Date.valueOf((String) plan.get("effectiveDate")),
                    (plan.get("expirationDate") != null && !((String) plan.get("expirationDate")).isBlank()) ? Date.valueOf((String) plan.get("expirationDate")) : null,
                    id
            );
        }
    }

    public void deleteRatingPlanConfig(long id) {
        ratingJdbcTemplate.update("DELETE FROM DR_RATING_PLAN_CONFIG WHERE PLAN_CONFIG_ID = ?", id);
    }

    // =========================================================================
    // DECISION TABLE COORDINATE MATRIX CRUD (DR_DECISION_TABLE, _COLUMN, _ROW, _CELL)
    // =========================================================================

    public Map<String, Object> saveDecisionTable(long flowId, Map<String, Object> tableData) {
        Long tableId = tableData.get("tableId") != null ? ((Number) tableData.get("tableId")).longValue() : null;
        Long nodeId = tableData.get("nodeId") != null ? ((Number) tableData.get("nodeId")).longValue() : null;
        String tableCode = (String) tableData.getOrDefault("tableCode", "DT_" + System.currentTimeMillis());
        String tableName = (String) tableData.getOrDefault("tableName", "Decision Table");
        String ruleflowGroup = (String) tableData.getOrDefault("ruleflowGroup", "rating_group");
        String hitPolicy = (String) tableData.getOrDefault("hitPolicy", "FIRST");
        String description = (String) tableData.getOrDefault("description", "");

        if (tableId == null || tableId <= 0) {
            KeyHolder kh = new GeneratedKeyHolder();
            ratingJdbcTemplate.update(con -> {
                PreparedStatement ps = con.prepareStatement("""
                        INSERT INTO DR_DECISION_TABLE (FLOW_ID, NODE_ID, TABLE_CODE, TABLE_NAME, RULEFLOW_GROUP, HIT_POLICY, DESCRIPTION)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                        """, Statement.RETURN_GENERATED_KEYS);
                ps.setLong(1, flowId);
                if (nodeId != null) ps.setLong(2, nodeId); else ps.setNull(2, java.sql.Types.BIGINT);
                ps.setString(3, tableCode);
                ps.setString(4, tableName);
                ps.setString(5, ruleflowGroup);
                ps.setString(6, hitPolicy);
                ps.setString(7, description);
                return ps;
            }, kh);
            tableId = Objects.requireNonNull(kh.getKey()).longValue();
        } else {
            ratingJdbcTemplate.update("""
                    UPDATE DR_DECISION_TABLE
                    SET NODE_ID = ?, TABLE_CODE = ?, TABLE_NAME = ?, RULEFLOW_GROUP = ?, HIT_POLICY = ?, DESCRIPTION = ?
                    WHERE TABLE_ID = ?
                    """, nodeId, tableCode, tableName, ruleflowGroup, hitPolicy, description, tableId);
        }
        Map<String, Object> result = new LinkedHashMap<>(tableData);
        result.put("tableId", tableId);
        result.put("flowId", flowId);
        return result;
    }

    @Transactional
    public void deleteDecisionTable(long tableId) {
        ratingJdbcTemplate.update("DELETE FROM DR_DECISION_TABLE_CELL WHERE ROW_ID IN (SELECT ROW_ID FROM DR_DECISION_TABLE_ROW WHERE TABLE_ID = ?)", tableId);
        ratingJdbcTemplate.update("DELETE FROM DR_DECISION_TABLE_ROW WHERE TABLE_ID = ?", tableId);
        ratingJdbcTemplate.update("DELETE FROM DR_DECISION_TABLE_COLUMN WHERE TABLE_ID = ?", tableId);
        ratingJdbcTemplate.update("DELETE FROM DR_DECISION_TABLE WHERE TABLE_ID = ?", tableId);
    }

    public Map<String, Object> saveDecisionTableRow(long tableId, Map<String, Object> rowData) {
        Long rowId = rowData.get("rowId") != null ? ((Number) rowData.get("rowId")).longValue() : null;
        int rowOrder = rowData.containsKey("rowOrder") ? ((Number) rowData.get("rowOrder")).intValue() : 1;
        boolean isActive = !Boolean.FALSE.equals(rowData.get("isActive"));
        String description = (String) rowData.get("description");

        long targetRowId;
        if (rowId == null || rowId <= 0) {
            KeyHolder kh = new GeneratedKeyHolder();
            ratingJdbcTemplate.update(con -> {
                PreparedStatement ps = con.prepareStatement("""
                        INSERT INTO DR_DECISION_TABLE_ROW (TABLE_ID, ROW_ORDER, IS_ACTIVE, DESCRIPTION)
                        VALUES (?, ?, ?, ?)
                        """, Statement.RETURN_GENERATED_KEYS);
                ps.setLong(1, tableId);
                ps.setInt(2, rowOrder);
                ps.setBoolean(3, isActive);
                ps.setString(4, description);
                return ps;
            }, kh);
            targetRowId = Objects.requireNonNull(kh.getKey()).longValue();
        } else {
            targetRowId = rowId;
            ratingJdbcTemplate.update("""
                    UPDATE DR_DECISION_TABLE_ROW
                    SET ROW_ORDER = ?, IS_ACTIVE = ?, DESCRIPTION = ?
                    WHERE ROW_ID = ?
                    """, rowOrder, isActive, description, targetRowId);
        }

        @SuppressWarnings("unchecked")
        Map<String, String> cells = (Map<String, String>) rowData.get("cells");
        if (cells != null) {
            for (Map.Entry<String, String> entry : cells.entrySet()) {
                long colId = Long.parseLong(entry.getKey());
                String cellVal = entry.getValue();

                Integer cellCount = ratingJdbcTemplate.queryForObject(
                        "SELECT COUNT(*) FROM DR_DECISION_TABLE_CELL WHERE ROW_ID = ? AND COLUMN_ID = ?",
                        Integer.class, targetRowId, colId
                );

                if (cellCount != null && cellCount > 0) {
                    ratingJdbcTemplate.update("""
                            UPDATE DR_DECISION_TABLE_CELL
                            SET CELL_VALUE = ?
                            WHERE ROW_ID = ? AND COLUMN_ID = ?
                            """, cellVal, targetRowId, colId);
                } else {
                    ratingJdbcTemplate.update("""
                            INSERT INTO DR_DECISION_TABLE_CELL (ROW_ID, COLUMN_ID, CELL_VALUE)
                            VALUES (?, ?, ?)
                            """, targetRowId, colId, cellVal);
                }
            }
        }

        Map<String, Object> result = new LinkedHashMap<>(rowData);
        result.put("rowId", targetRowId);
        return result;
    }

    @Transactional
    public void deleteDecisionTableRow(long rowId) {
        ratingJdbcTemplate.update("DELETE FROM DR_DECISION_TABLE_CELL WHERE ROW_ID = ?", rowId);
        ratingJdbcTemplate.update("DELETE FROM DR_DECISION_TABLE_ROW WHERE ROW_ID = ?", rowId);
    }

    public Map<String, Object> saveDecisionTableColumn(long tableId, Map<String, Object> colData) {
        Long colId = colData.get("columnId") != null ? ((Number) colData.get("columnId")).longValue() : null;
        String type = (String) colData.getOrDefault("columnType", "CONDITION");
        String label = (String) colData.getOrDefault("headerLabel", "New Column");
        String prop = (String) colData.getOrDefault("propertyPath", "facts.property");
        String op = (String) colData.getOrDefault("operator", "EQUALS");
        String dataType = (String) colData.getOrDefault("dataType", "STRING");
        int index = colData.containsKey("colIndex") ? ((Number) colData.get("colIndex")).intValue() : 1;

        if (colId == null || colId <= 0) {
            KeyHolder kh = new GeneratedKeyHolder();
            ratingJdbcTemplate.update(con -> {
                PreparedStatement ps = con.prepareStatement("""
                        INSERT INTO DR_DECISION_TABLE_COLUMN (TABLE_ID, COLUMN_TYPE, HEADER_LABEL, PROPERTY_PATH, OPERATOR, DATA_TYPE, COL_INDEX)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                        """, Statement.RETURN_GENERATED_KEYS);
                ps.setLong(1, tableId);
                ps.setString(2, type);
                ps.setString(3, label);
                ps.setString(4, prop);
                ps.setString(5, op);
                ps.setString(6, dataType);
                ps.setInt(7, index);
                return ps;
            }, kh);
            colId = Objects.requireNonNull(kh.getKey()).longValue();
        } else {
            ratingJdbcTemplate.update("""
                    UPDATE DR_DECISION_TABLE_COLUMN
                    SET COLUMN_TYPE = ?, HEADER_LABEL = ?, PROPERTY_PATH = ?, OPERATOR = ?, DATA_TYPE = ?, COL_INDEX = ?
                    WHERE COLUMN_ID = ?
                    """, type, label, prop, op, dataType, index, colId);
        }

        Map<String, Object> result = new LinkedHashMap<>(colData);
        result.put("columnId", colId);
        return result;
    }

    @Transactional
    public void deleteDecisionTableColumn(long columnId) {
        ratingJdbcTemplate.update("DELETE FROM DR_DECISION_TABLE_CELL WHERE COLUMN_ID = ?", columnId);
        ratingJdbcTemplate.update("DELETE FROM DR_DECISION_TABLE_COLUMN WHERE COLUMN_ID = ?", columnId);
    }

    // =========================================================================
    // EXECUTION AUDIT LOGGING (DR_EXECUTION_AUDIT, DR_EXECUTION_AUDIT_STEP)
    // =========================================================================

    public long logExecutionAudit(
            long flowId,
            String flowCode,
            String version,
            String productCode,
            String stateCode,
            String effectiveDate,
            Map<String, Object> inputFacts,
            Map<String, Object> outputFacts,
            List<Map<String, Object>> attachedForms,
            String status,
            BigDecimal totalPremium,
            long durationMs,
            List<Map<String, Object>> steps
    ) {
        String insertSql = """
                INSERT INTO DR_EXECUTION_AUDIT (
                    FLOW_ID, FLOW_CODE, VERSION, PRODUCT_CODE, STATE_CODE, EFFECTIVE_DATE,
                    INPUT_FACTS_JSON, OUTPUT_FACTS_JSON, ATTACHED_FORMS_JSON, EXECUTION_STATUS,
                    TOTAL_PREMIUM, EXECUTION_DURATION_MS
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """;
        KeyHolder kh = new GeneratedKeyHolder();
        try {
            String inJson = objectMapper.writeValueAsString(inputFacts);
            String outJson = objectMapper.writeValueAsString(outputFacts);
            String formsJson = objectMapper.writeValueAsString(attachedForms);

            ratingJdbcTemplate.update(con -> {
                PreparedStatement ps = con.prepareStatement(insertSql, Statement.RETURN_GENERATED_KEYS);
                ps.setLong(1, flowId);
                ps.setString(2, flowCode);
                ps.setString(3, version);
                ps.setString(4, productCode);
                ps.setString(5, stateCode);
                ps.setDate(6, Date.valueOf(effectiveDate));
                ps.setString(7, inJson);
                ps.setString(8, outJson);
                ps.setString(9, formsJson);
                ps.setString(10, status);
                if (totalPremium != null) ps.setBigDecimal(11, totalPremium); else ps.setNull(11, java.sql.Types.DECIMAL);
                ps.setLong(12, durationMs);
                return ps;
            }, kh);

            long auditId = Objects.requireNonNull(kh.getKey()).longValue();

            if (steps != null) {
                int stepNum = 1;
                for (Map<String, Object> step : steps) {
                    ratingJdbcTemplate.update("""
                            INSERT INTO DR_EXECUTION_AUDIT_STEP (
                                AUDIT_ID, STEP_NUMBER, NODE_KEY, RULEFLOW_GROUP, RULE_NAME, ACTION_TAKEN, FACTS_DELTA_JSON
                            ) VALUES (?, ?, ?, ?, ?, ?, ?)
                            """,
                            auditId,
                            stepNum++,
                            step.get("nodeKey"),
                            step.get("ruleflowGroup"),
                            step.get("ruleName"),
                            step.getOrDefault("actionTaken", "Processed node " + step.get("nodeKey")),
                            objectMapper.writeValueAsString(step.get("factsDelta"))
                    );
                }
            }
            return auditId;
        } catch (JsonProcessingException e) {
            log.error("Failed to serialize audit json", e);
            return -1;
        }
    }

    // =========================================================================
    // NODE, EDGE, AND RULE CRUD OPERATIONS (DR_RULE_NODE, DR_RULE_ROUTING_EDGE, DR_RULE_DEFINITION)
    // =========================================================================

    public Map<String, Object> saveNode(long flowId, Map<String, Object> nodeData) {
        String nodeKey = (String) nodeData.get("nodeKey");
        if (nodeKey == null || nodeKey.isBlank()) {
            nodeKey = "node-" + UUID.randomUUID().toString().substring(0, 8);
        }
        String nodeName = (String) nodeData.getOrDefault("nodeName", "New Rule Node");
        String nodeType = (String) nodeData.getOrDefault("nodeType", "RULEFLOW_GROUP");
        String ruleflowGroup = (String) nodeData.get("ruleflowGroup");
        int executionOrder = nodeData.containsKey("executionOrder") ? ((Number) nodeData.get("executionOrder")).intValue() : 0;
        String configJson = (String) nodeData.get("configJson");

        // Check if exists
        Integer count = ratingJdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM DR_RULE_NODE WHERE FLOW_ID = ? AND NODE_KEY = ?",
                Integer.class, flowId, nodeKey
        );

        if (count != null && count > 0) {
            ratingJdbcTemplate.update("""
                    UPDATE DR_RULE_NODE
                    SET NODE_NAME = ?, NODE_TYPE = ?, RULEFLOW_GROUP = ?, EXECUTION_ORDER = ?, CONFIG_JSON = ?
                    WHERE FLOW_ID = ? AND NODE_KEY = ?
                    """, nodeName, nodeType, ruleflowGroup, executionOrder, configJson, flowId, nodeKey);
        } else {
            ratingJdbcTemplate.update("""
                    INSERT INTO DR_RULE_NODE (FLOW_ID, NODE_KEY, NODE_NAME, NODE_TYPE, RULEFLOW_GROUP, EXECUTION_ORDER, CONFIG_JSON)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    """, flowId, nodeKey, nodeName, nodeType, ruleflowGroup, executionOrder, configJson);
        }

        Map<String, Object> result = new LinkedHashMap<>(nodeData);
        result.put("nodeKey", nodeKey);
        result.put("flowId", flowId);
        return result;
    }

    @Transactional
    public void deleteNode(long flowId, String nodeKey) {
        Long nodeId = ratingJdbcTemplate.query(
                "SELECT NODE_ID FROM DR_RULE_NODE WHERE FLOW_ID = ? AND NODE_KEY = ?",
                rs -> rs.next() ? rs.getLong("NODE_ID") : null,
                flowId, nodeKey
        );
        if (nodeId != null) {
            ratingJdbcTemplate.update("DELETE FROM DR_RULE_DEFINITION WHERE NODE_ID = ?", nodeId);
            ratingJdbcTemplate.update("UPDATE DR_DECISION_TABLE SET NODE_ID = NULL WHERE NODE_ID = ?", nodeId);
        }

        ratingJdbcTemplate.update("""
                DELETE FROM DR_RULE_ROUTING_EDGE
                WHERE FLOW_ID = ? AND (SOURCE_NODE_KEY = ? OR TARGET_NODE_KEY = ?)
                """, flowId, nodeKey, nodeKey);

        ratingJdbcTemplate.update("""
                DELETE FROM DR_RULE_NODE
                WHERE FLOW_ID = ? AND NODE_KEY = ?
                """, flowId, nodeKey);
    }

    public Map<String, Object> saveEdge(long flowId, Map<String, Object> edgeData) {
        String edgeKey = (String) edgeData.get("edgeKey");
        if (edgeKey == null || edgeKey.isBlank()) {
            edgeKey = "e-" + UUID.randomUUID().toString().substring(0, 8);
        }
        String source = (String) edgeData.get("sourceNodeKey");
        String target = (String) edgeData.get("targetNodeKey");
        String sourceHandle = (String) edgeData.get("sourceHandle");
        String targetHandle = (String) edgeData.get("targetHandle");
        String cond = (String) edgeData.get("conditionExpression");
        String label = (String) edgeData.get("routingLabel");
        int order = edgeData.containsKey("routingOrder") ? ((Number) edgeData.get("routingOrder")).intValue() : 1;

        Integer count = ratingJdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM DR_RULE_ROUTING_EDGE WHERE FLOW_ID = ? AND EDGE_KEY = ?",
                Integer.class, flowId, edgeKey
        );

        if (count != null && count > 0) {
            ratingJdbcTemplate.update("""
                    UPDATE DR_RULE_ROUTING_EDGE
                    SET SOURCE_NODE_KEY = ?, TARGET_NODE_KEY = ?, SOURCE_HANDLE = ?, TARGET_HANDLE = ?,
                        CONDITION_EXPRESSION = ?, ROUTING_LABEL = ?, ROUTING_ORDER = ?
                    WHERE FLOW_ID = ? AND EDGE_KEY = ?
                    """, source, target, sourceHandle, targetHandle, cond, label, order, flowId, edgeKey);
        } else {
            ratingJdbcTemplate.update("""
                    INSERT INTO DR_RULE_ROUTING_EDGE (FLOW_ID, EDGE_KEY, SOURCE_NODE_KEY, TARGET_NODE_KEY, SOURCE_HANDLE, TARGET_HANDLE, CONDITION_EXPRESSION, ROUTING_LABEL, ROUTING_ORDER)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, flowId, edgeKey, source, target, sourceHandle, targetHandle, cond, label, order);
        }

        Map<String, Object> result = new LinkedHashMap<>(edgeData);
        result.put("edgeKey", edgeKey);
        return result;
    }

    public void deleteEdge(long flowId, String edgeKey) {
        ratingJdbcTemplate.update("DELETE FROM DR_RULE_ROUTING_EDGE WHERE FLOW_ID = ? AND EDGE_KEY = ?", flowId, edgeKey);
    }

    public void saveRule(long flowId, Map<String, Object> ruleData) {
        Long ruleId = ruleData.get("ruleId") != null ? ((Number) ruleData.get("ruleId")).longValue() : null;
        String ruleName = (String) ruleData.get("ruleName");
        String group = (String) ruleData.get("ruleflowGroup");
        int salience = ruleData.containsKey("salience") ? ((Number) ruleData.get("salience")).intValue() : 0;
        boolean noLoop = !Boolean.FALSE.equals(ruleData.get("noLoop"));
        String when = (String) ruleData.get("whenCondition");
        String then = (String) ruleData.get("thenConsequence");
        String status = (String) ruleData.getOrDefault("status", "ACTIVE");
        String eff = (String) ruleData.getOrDefault("effectiveDate", LocalDate.now().toString());
        String exp = (String) ruleData.get("expirationDate");

        if (ruleId == null || ruleId <= 0) {
            ratingJdbcTemplate.update("""
                    INSERT INTO DR_RULE_DEFINITION (FLOW_ID, RULE_NAME, RULEFLOW_GROUP, SALIENCE, NO_LOOP, WHEN_CONDITION, THEN_CONSEQUENCE, STATUS, EFFECTIVE_DATE, EXPIRATION_DATE)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, flowId, ruleName, group, salience, noLoop, when, then, status, Date.valueOf(eff), (exp != null && !exp.isBlank()) ? Date.valueOf(exp) : null);
        } else {
            ratingJdbcTemplate.update("""
                    UPDATE DR_RULE_DEFINITION
                    SET RULE_NAME = ?, RULEFLOW_GROUP = ?, SALIENCE = ?, NO_LOOP = ?,
                        WHEN_CONDITION = ?, THEN_CONSEQUENCE = ?, STATUS = ?, EFFECTIVE_DATE = ?, EXPIRATION_DATE = ?,
                        UPDATED_DT = SYSDATETIMEOFFSET()
                    WHERE FLOW_ID = ? AND RULE_ID = ?
                    """, ruleName, group, salience, noLoop, when, then, status, Date.valueOf(eff), (exp != null && !exp.isBlank()) ? Date.valueOf(exp) : null, flowId, ruleId);
        }
    }

    public void deleteRule(long flowId, long ruleId) {
        ratingJdbcTemplate.update("DELETE FROM DR_RULE_DEFINITION WHERE FLOW_ID = ? AND RULE_ID = ?", flowId, ruleId);
    }
}
