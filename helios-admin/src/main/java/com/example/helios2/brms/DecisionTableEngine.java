package com.example.helios2.brms;

import org.mvel2.MVEL;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.Serializable;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Coordinate Matrix Decision Table Engine.
 * Evaluates condition-action coordinate grids using MVEL.
 * Translates insurance domain range syntax into compiled runtime predicates with
 * high-precision BigDecimal rounding and full decision trace auditing.
 */
@Service
public class DecisionTableEngine {

    private static final Logger log = LoggerFactory.getLogger(DecisionTableEngine.class);

    // Range Pattern: [min..max], (min..max], [min..max), (min..max)
    private static final Pattern RANGE_PATTERN = Pattern.compile("^([\\[\\(])\\s*([0-9.]+)\\s*\\.\\.\\s*([0-9.]+)\\s*([\\]\\)])$");
    // Relational Operators: >= 500, < 25, == 'CA', != 'DECLINED'
    private static final Pattern OPERATOR_PATTERN = Pattern.compile("^(>=|<=|>|<|==|!=)\\s*(.+)$");

    public enum HitPolicy { FIRST_HIT, ALL_HITS, COLLECT_MIN, COLLECT_MAX }
    public enum ColumnType {
        CONDITION, ACTION, INPUT, OUTPUT;

        public boolean isCondition() {
            return this == CONDITION || this == INPUT;
        }

        public boolean isAction() {
            return this == ACTION || this == OUTPUT;
        }
    }

    public record TableColumn(long columnId, ColumnType type, String attributeKey, String dataType, int order) {}
    public record TableCell(long rowId, long columnId, String rawExpression) {}
    public record TableRow(long rowId, int rowIndex, String description) {}

    public record TableModel(
            long tableId,
            String tableCode,
            HitPolicy hitPolicy,
            String aggregationField,
            List<TableColumn> columns,
            List<TableRow> rows,
            Map<String, TableCell> cellsByCoord // Key: rowId + "_" + columnId
    ) {}

    public record DecisionTrace(
            long tableId,
            int rowMatchedIndex,
            String rowDescription,
            Map<String, Object> producedActions,
            String conditionEvaluationLog
    ) {}

    public record TableExecutionResult(
            boolean executed,
            List<DecisionTrace> matchedRules,
            Map<String, Object> outputFacts
    ) {}

    /**
     * Executes the coordinate decision table against the active fact context.
     *
     * @param model Fully populated coordinate matrix model
     * @param context Active working memory of facts (mutable Map)
     * @return TableExecutionResult detailing modifications and audit trail
     */
    public TableExecutionResult evaluate(TableModel model, Map<String, Object> context) {
        log.debug("Evaluating Decision Table: {} ({}) under HitPolicy: {}", model.tableCode(), model.tableId(), model.hitPolicy());
        List<DecisionTrace> matches = new ArrayList<>();
        Map<String, Object> pendingOutputs = new HashMap<>();

        List<TableColumn> conditionCols = model.columns().stream()
                .filter(c -> c.type().isCondition())
                .sorted(Comparator.comparingInt(TableColumn::order))
                .toList();

        List<TableColumn> actionCols = model.columns().stream()
                .filter(c -> c.type().isAction())
                .sorted(Comparator.comparingInt(TableColumn::order))
                .toList();

        for (TableRow row : model.rows().stream().sorted(Comparator.comparingInt(TableRow::rowIndex)).toList()) {
            boolean rowConditionsMet = true;
            StringBuilder logTrace = new StringBuilder();

            for (TableColumn condCol : conditionCols) {
                String coordKey = row.rowId() + "_" + condCol.columnId();
                TableCell cell = model.cellsByCoord().get(coordKey);
                String rawExpression = (cell != null) ? cell.rawExpression().trim() : "-";

                // Wildcard matches
                if (rawExpression.isEmpty() || rawExpression.equals("-") || rawExpression.equalsIgnoreCase("ANY")) {
                    continue;
                }

                boolean cellResult = evaluateConditionCell(condCol.attributeKey(), condCol.dataType(), rawExpression, context);
                logTrace.append(String.format("[%s: %s => %b] ", condCol.attributeKey(), rawExpression, cellResult));

                if (!cellResult) {
                    rowConditionsMet = false;
                    break;
                }
            }

            if (rowConditionsMet) {
                Map<String, Object> rowActions = new LinkedHashMap<>();
                for (TableColumn actCol : actionCols) {
                    String coordKey = row.rowId() + "_" + actCol.columnId();
                    TableCell cell = model.cellsByCoord().get(coordKey);
                    if (cell != null && !cell.rawExpression().trim().isEmpty() && !cell.rawExpression().equals("-")) {
                        Object calculatedValue = evaluateActionCell(actCol.dataType(), cell.rawExpression(), context);
                        rowActions.put(actCol.attributeKey(), calculatedValue);
                    }
                }

                DecisionTrace trace = new DecisionTrace(
                        model.tableId(),
                        row.rowIndex(),
                        row.description(),
                        rowActions,
                        logTrace.toString()
                );
                matches.add(trace);

                if (model.hitPolicy() == HitPolicy.FIRST_HIT) {
                    pendingOutputs.putAll(rowActions);
                    break; // Terminate scan on first match
                } else if (model.hitPolicy() == HitPolicy.ALL_HITS) {
                    pendingOutputs.putAll(rowActions);
                }
            }
        }

        // Resolve Aggregate Hit Policies (COLLECT_MIN / COLLECT_MAX)
        if (!matches.isEmpty() && (model.hitPolicy() == HitPolicy.COLLECT_MIN || model.hitPolicy() == HitPolicy.COLLECT_MAX)) {
            String targetKey = model.aggregationField();
            BigDecimal resolvedValue = null;

            for (DecisionTrace match : matches) {
                Object val = match.producedActions().get(targetKey);
                if (val instanceof BigDecimal num) {
                    if (resolvedValue == null) {
                        resolvedValue = num;
                    } else if (model.hitPolicy() == HitPolicy.COLLECT_MIN) {
                        resolvedValue = resolvedValue.min(num);
                    } else {
                        resolvedValue = resolvedValue.max(num);
                    }
                }
            }
            if (resolvedValue != null) {
                pendingOutputs.put(targetKey, resolvedValue);
            }
        }

        // Commit outputs into working memory
        context.putAll(pendingOutputs);
        return new TableExecutionResult(!matches.isEmpty(), matches, pendingOutputs);
    }

    /**
     * Translates insurance mathematical ranges and conditional patterns into executable MVEL predicates.
     */
    protected boolean evaluateConditionCell(String propertyPath, String dataType, String rawExpression, Map<String, Object> context) {
        Object rawFact = resolveFactValue(propertyPath, context);

        if (rawFact == null) {
            return rawExpression.equalsIgnoreCase("null") || rawExpression.equalsIgnoreCase("is empty");
        }

        String mvelExpression;
        Matcher rangeMatcher = RANGE_PATTERN.matcher(rawExpression);

        if (rangeMatcher.matches()) {
            boolean inclusiveMin = rangeMatcher.group(1).equals("[");
            String minVal = rangeMatcher.group(2);
            String maxVal = rangeMatcher.group(3);
            boolean inclusiveMax = rangeMatcher.group(4).equals("]");

            String leftOp = inclusiveMin ? ">=" : ">";
            String rightOp = inclusiveMax ? "<=" : "<";

            mvelExpression = String.format("fact %s %s && fact %s %s", leftOp, minVal, rightOp, maxVal);
        } else {
            Matcher opMatcher = OPERATOR_PATTERN.matcher(rawExpression);
            if (opMatcher.matches()) {
                String operator = opMatcher.group(1);
                String operand = opMatcher.group(2);
                mvelExpression = "fact " + operator + " " + operand;
            } else if (rawExpression.startsWith("in ") || rawExpression.startsWith("IN ")) {
                mvelExpression = "fact " + rawExpression;
            } else {
                if (dataType.equalsIgnoreCase("STRING") && !rawExpression.startsWith("'") && !rawExpression.startsWith("\"")) {
                    mvelExpression = "fact == '" + rawExpression + "'";
                } else {
                    mvelExpression = "fact == " + rawExpression;
                }
            }
        }

        Map<String, Object> evalContext = new HashMap<>(context);
        evalContext.put("fact", normalizeNumber(rawFact));

        try {
            Serializable compiled = MVEL.compileExpression(mvelExpression);
            Object result = MVEL.executeExpression(compiled, evalContext);
            return Boolean.TRUE.equals(result);
        } catch (Exception ex) {
            log.error("Failed evaluating MVEL cell expression '{}' with fact '{}'. Error: {}", mvelExpression, rawFact, ex.getMessage());
            return false;
        }
    }

    protected Object evaluateActionCell(String dataType, String rawExpression, Map<String, Object> context) {
        try {
            Serializable compiled = MVEL.compileExpression(rawExpression);
            Object evaluated = MVEL.executeExpression(compiled, context);

            if (dataType.equalsIgnoreCase("DECIMAL")) {
                if (evaluated instanceof BigDecimal bd) {
                    return bd.setScale(4, RoundingMode.HALF_UP);
                }
                return new BigDecimal(String.valueOf(evaluated)).setScale(4, RoundingMode.HALF_UP);
            }
            return evaluated;
        } catch (Exception ex) {
            if (dataType.equalsIgnoreCase("DECIMAL")) {
                return new BigDecimal(rawExpression).setScale(4, RoundingMode.HALF_UP);
            }
            return rawExpression;
        }
    }

    private Object resolveFactValue(String propertyPath, Map<String, Object> facts) {
        if (!propertyPath.contains(".")) {
            return facts.get(propertyPath);
        }
        String[] parts = propertyPath.split("\\.");
        Object curr = facts;
        for (String part : parts) {
            if (curr instanceof Map<?, ?> map) {
                curr = map.get(part);
            } else {
                return null;
            }
        }
        return curr;
    }

    private Object normalizeNumber(Object val) {
        if (val instanceof Number && !(val instanceof BigDecimal)) {
            return new BigDecimal(val.toString());
        }
        return val;
    }
}

