package com.example.heliosrating.brms;

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
            String ruleDescription,
            Map<String, Object> outputActions,
            String evaluationNotes
    ) {}

    public record DecisionResult(
            boolean matched,
            List<DecisionTrace> traces,
            Map<String, Object> combinedActions
    ) {}

    /**
     * Executes sequential/first-hit coordinate evaluation against working facts.
     */
    public DecisionResult evaluate(TableModel model, Map<String, Object> context) {
        if (model == null || model.rows().isEmpty()) {
            return new DecisionResult(false, Collections.emptyList(), Collections.emptyMap());
        }

        List<TableColumn> conditionCols = model.columns().stream()
                .filter(c -> c.type().isCondition())
                .sorted(Comparator.comparingInt(TableColumn::order))
                .toList();

        List<TableColumn> actionCols = model.columns().stream()
                .filter(c -> c.type().isAction())
                .sorted(Comparator.comparingInt(TableColumn::order))
                .toList();

        List<DecisionTrace> traces = new ArrayList<>();
        Map<String, Object> combinedActions = new LinkedHashMap<>();
        boolean anyRowMatched = false;

        for (TableRow row : model.rows()) {
            boolean rowConditionsMet = true;
            StringBuilder logTrace = new StringBuilder("Row ").append(row.rowIndex()).append(": ");

            for (TableColumn condCol : conditionCols) {
                String coordKey = row.rowId() + "_" + condCol.columnId();
                TableCell cell = model.cellsByCoord().get(coordKey);

                if (cell == null || cell.rawExpression() == null) {
                    continue; // Unspecified cells evaluate as true (ANY)
                }

                String rawExpression = cell.rawExpression().trim();

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
                traces.add(trace);
                combinedActions.putAll(rowActions);
                anyRowMatched = true;

                if (model.hitPolicy() == HitPolicy.FIRST_HIT) {
                    break;
                }
            }
        }

        // Apply aggregation if COLLECT hit policy
        if (anyRowMatched && (model.hitPolicy() == HitPolicy.COLLECT_MIN || model.hitPolicy() == HitPolicy.COLLECT_MAX)) {
            applyCollectionHitPolicy(model, traces, combinedActions);
        }

        return new DecisionResult(anyRowMatched, traces, combinedActions);
    }

    private void applyCollectionHitPolicy(TableModel model, List<DecisionTrace> traces, Map<String, Object> combinedActions) {
        String targetField = model.aggregationField();
        if (targetField == null || targetField.isBlank()) return;

        List<BigDecimal> numericOutputs = new ArrayList<>();
        for (DecisionTrace dt : traces) {
            Object val = dt.outputActions().get(targetField);
            if (val != null) {
                try {
                    numericOutputs.add(new BigDecimal(val.toString()));
                } catch (NumberFormatException ignored) {}
            }
        }

        if (!numericOutputs.isEmpty()) {
            if (model.hitPolicy() == HitPolicy.COLLECT_MIN) {
                numericOutputs.stream().min(BigDecimal::compareTo).ifPresent(v -> combinedActions.put(targetField, v));
            } else if (model.hitPolicy() == HitPolicy.COLLECT_MAX) {
                numericOutputs.stream().max(BigDecimal::compareTo).ifPresent(v -> combinedActions.put(targetField, v));
            }
        }
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
            } else {
                // Direct literal match
                if ("STRING".equalsIgnoreCase(dataType)) {
                    mvelExpression = "fact.toString() == '" + rawExpression.replace("'", "\\'") + "'";
                } else {
                    mvelExpression = "fact == " + rawExpression;
                }
            }
        }

        try {
            Map<String, Object> evalContext = new HashMap<>(context);
            evalContext.put("fact", coerceToEvaluationType(rawFact, dataType));
            evalContext.put("facts", context);
            Object result = MVEL.eval(mvelExpression, evalContext);
            return Boolean.TRUE.equals(result);
        } catch (Exception ex) {
            log.error("Failed evaluating condition coordinate [{}: {}] against value: {}", propertyPath, rawExpression, rawFact, ex);
            return false;
        }
    }

    protected Object evaluateActionCell(String dataType, String rawExpression, Map<String, Object> context) {
        try {
            Map<String, Object> evalContext = new HashMap<>(context);
            evalContext.put("facts", context);
            Object evaluated = MVEL.eval(rawExpression, evalContext);
            if (evaluated == null) return null;

            if ("BIGDECIMAL".equalsIgnoreCase(dataType) || "DECIMAL".equalsIgnoreCase(dataType) || "CURRENCY".equalsIgnoreCase(dataType)) {
                return new BigDecimal(evaluated.toString()).setScale(4, RoundingMode.HALF_UP);
            }
            if ("INTEGER".equalsIgnoreCase(dataType) || "INT".equalsIgnoreCase(dataType)) {
                return Integer.parseInt(evaluated.toString());
            }
            if ("BOOLEAN".equalsIgnoreCase(dataType)) {
                return Boolean.parseBoolean(evaluated.toString());
            }
            return evaluated.toString();
        } catch (Exception ex) {
            log.warn("Action cell evaluation fallback to literal [{}]: {}", rawExpression, ex.getMessage());
            return rawExpression;
        }
    }

    private Object resolveFactValue(String path, Map<String, Object> context) {
        if (!path.contains(".")) {
            return context.get(path);
        }
        String[] tokens = path.split("\\.");
        Object curr = context;
        for (String token : tokens) {
            if (curr instanceof Map<?, ?> m) {
                curr = m.get(token);
            } else {
                return null;
            }
        }
        return curr;
    }

    private Object coerceToEvaluationType(Object val, String dataType) {
        if (val == null) return null;
        if ("DECIMAL".equalsIgnoreCase(dataType) || "BIGDECIMAL".equalsIgnoreCase(dataType) || "CURRENCY".equalsIgnoreCase(dataType)) {
            if (val instanceof BigDecimal) return val;
            return new BigDecimal(val.toString());
        }
        if ("INTEGER".equalsIgnoreCase(dataType)) {
            if (val instanceof Integer) return val;
            return Integer.parseInt(val.toString());
        }
        return val;
    }
}

