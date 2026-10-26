package com.example.helios2.drools;

import org.springframework.stereotype.Service;

import java.util.*;

/**
 * Service that translates database-stored RuleFlows, Decision Tables,
 * and Form State Approvals into standard Drools Rule Language (DRL).
 */
@Service
public class DroolsDrlGenerator {

    public String generateDrl(DroolsRatingRepositoryService.FlowFullDto flow) {
        DroolsRatingRepositoryService.FlowHeaderDto header = flow.header();
        StringBuilder drl = new StringBuilder();

        // 1. Package & Metadata Header
        drl.append("// ============================================================================\n");
        drl.append("// DROOLS DRL RULE DEFINITIONS (GENERATED FROM HELIOS_RATING_DB)\n");
        drl.append("// Flow Code: ").append(header.flowCode()).append("\n");
        drl.append("// Flow Name: ").append(header.flowName()).append("\n");
        drl.append("// Version: ").append(header.version()).append(" (Effective: ").append(header.effectiveDate())
           .append(" -> ").append(header.expirationDate() != null ? header.expirationDate() : "OPEN").append(")\n");
        drl.append("// Product: ").append(header.productCode()).append(" | Plan: ").append(header.planCode()).append("\n");
        if (header.serffTrackingNo() != null) {
            drl.append("// SERFF Filing: ").append(header.serffTrackingNo()).append("\n");
        }
        drl.append("// ============================================================================\n\n");

        drl.append("package ").append(header.packageName() != null ? header.packageName() : "com.helios.drools.rules").append(";\n\n");

        // 2. Imports
        drl.append("import java.util.Map;\n");
        drl.append("import java.util.List;\n");
        drl.append("import java.util.ArrayList;\n");
        drl.append("import java.math.BigDecimal;\n");
        drl.append("import java.time.LocalDate;\n");
        drl.append("import org.slf4j.Logger;\n\n");

        // 3. Globals
        drl.append("global org.slf4j.Logger logger;\n\n");

        // 4. Drools Rules from DR_RULE_DEFINITION
        drl.append("// ----------------------------------------------------------------------------\n");
        drl.append("// 1. RULEFLOW-GROUP RULES (DR_RULE_DEFINITION)\n");
        drl.append("// ----------------------------------------------------------------------------\n\n");

        for (Map<String, Object> rule : flow.rules()) {
            drl.append("rule \"").append(rule.get("ruleName")).append("\"\n");
            drl.append("    ruleflow-group \"").append(rule.get("ruleflowGroup")).append("\"\n");
            if (rule.get("salience") != null) {
                drl.append("    salience ").append(rule.get("salience")).append("\n");
            }
            if (Boolean.TRUE.equals(rule.get("noLoop"))) {
                drl.append("    no-loop true\n");
            }
            if (Boolean.TRUE.equals(rule.get("lockOnActive"))) {
                drl.append("    lock-on-active true\n");
            }
            if (rule.get("agendaGroup") != null) {
                drl.append("    agenda-group \"").append(rule.get("agendaGroup")).append("\"\n");
            }
            drl.append("    when\n");
            String when = (String) rule.get("whenCondition");
            if (when != null && !when.isBlank()) {
                drl.append("        ").append(when).append("\n");
            } else {
                drl.append("        $f : Map()\n");
            }
            drl.append("    then\n");
            String then = (String) rule.get("thenConsequence");
            if (then != null && !then.isBlank()) {
                for (String line : then.split(";")) {
                    String trimmed = line.trim();
                    if (!trimmed.isEmpty()) {
                        drl.append("        ").append(trimmed).append(";\n");
                    }
                }
            }
            drl.append("end\n\n");
        }

        // 5. Decision Tables as Drools Rules
        drl.append("// ----------------------------------------------------------------------------\n");
        drl.append("// 2. DECISION TABLE MATRICES (DR_DECISION_TABLE)\n");
        drl.append("// ----------------------------------------------------------------------------\n\n");

        for (Map<String, Object> dt : flow.decisionTables()) {
            String tableCode = (String) dt.get("tableCode");
            String group = (String) dt.get("ruleflowGroup");
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> cols = (List<Map<String, Object>>) dt.get("columns");
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> rows = (List<Map<String, Object>>) dt.get("rows");

            if (cols != null && rows != null) {
                for (Map<String, Object> row : rows) {
                    if (!Boolean.TRUE.equals(row.get("isActive"))) continue;
                    long rowOrder = ((Number) row.get("rowOrder")).longValue();
                    String rowDesc = (String) row.get("description");
                    @SuppressWarnings("unchecked")
                    Map<String, String> cells = (Map<String, String>) row.get("cells");

                    drl.append("rule \"").append(tableCode).append("_Row_").append(rowOrder).append("\"\n");
                    drl.append("    ruleflow-group \"").append(group).append("\"\n");
                    drl.append("    salience ").append(100 - rowOrder).append("\n");
                    drl.append("    no-loop true\n");
                    drl.append("    when\n");
                    drl.append("        $f : Map(\n");

                    List<String> conditions = new ArrayList<>();
                    List<String> actions = new ArrayList<>();

                    for (Map<String, Object> col : cols) {
                        String colType = (String) col.get("columnType");
                        long colId = ((Number) col.get("columnId")).longValue();
                        String cellVal = cells != null ? cells.get(String.valueOf(colId)) : null;
                        if (cellVal == null || cellVal.isBlank() || "-".equals(cellVal)) continue;

                        String prop = (String) col.get("propertyPath");
                        String key = prop.replace("facts.", "");

                        if ("CONDITION".equalsIgnoreCase(colType)) {
                            conditions.add("            this[\"" + key + "\"] != null && this[\"" + key + "\"].toString() == \"" + cellVal + "\"");
                        } else if ("ACTION".equalsIgnoreCase(colType)) {
                            String dataType = (String) col.get("dataType");
                            if ("NUMBER".equalsIgnoreCase(dataType) || "DECIMAL".equalsIgnoreCase(dataType)) {
                                actions.add("        $f.put(\"" + key + "\", " + cellVal + ");");
                            } else if ("BOOLEAN".equalsIgnoreCase(dataType)) {
                                actions.add("        $f.put(\"" + key + "\", " + Boolean.parseBoolean(cellVal) + ");");
                            } else {
                                actions.add("        $f.put(\"" + key + "\", \"" + cellVal + "\");");
                            }
                        }
                    }

                    if (conditions.isEmpty()) {
                        drl.append("            // Unconditional match\n");
                    } else {
                        drl.append(String.join(",\n", conditions)).append("\n");
                    }
                    drl.append("        )\n");
                    drl.append("    then\n");
                    if (rowDesc != null && !rowDesc.isBlank()) {
                        drl.append("        // ").append(rowDesc).append("\n");
                    }
                    for (String action : actions) {
                        drl.append(action).append("\n");
                    }
                    drl.append("end\n\n");
                }
            }
        }

        // 6. State Forms Approval Rules (DR_FORM_STATE_APPROVAL)
        drl.append("// ----------------------------------------------------------------------------\n");
        drl.append("// 3. FORMS STATE APPROVAL RULES (DR_FORM_STATE_APPROVAL)\n");
        drl.append("// ----------------------------------------------------------------------------\n\n");

        for (Map<String, Object> form : flow.stateFormApprovals()) {
            String formNumber = (String) form.get("formNumber");
            String state = (String) form.get("stateCode");
            String attType = (String) form.get("attachmentType");
            String mandatoryCriteria = (String) form.get("mandatoryCriteria");

            drl.append("rule \"FORM_ATTACH_").append(formNumber.replace("-", "_")).append("_").append(state).append("\"\n");
            drl.append("    ruleflow-group \"Forms_State_Approval_Group\"\n");
            drl.append("    no-loop true\n");
            drl.append("    when\n");
            drl.append("        $f : Map(");
            if (!"ALL".equalsIgnoreCase(state)) {
                drl.append("this[\"state\"] == \"").append(state).append("\"");
                if (mandatoryCriteria != null && !mandatoryCriteria.isBlank() && !"true".equalsIgnoreCase(mandatoryCriteria)) {
                    drl.append(", ").append(mandatoryCriteria);
                }
            } else if (mandatoryCriteria != null && !mandatoryCriteria.isBlank() && !"true".equalsIgnoreCase(mandatoryCriteria)) {
                drl.append(mandatoryCriteria);
            }
            drl.append(")\n");
            drl.append("    then\n");
            drl.append("        // Attaching DOI Approved Form: ").append(form.get("formName")).append(" (Edition: ").append(form.get("formEdition")).append(")\n");
            if (form.get("serffTrackingNo") != null) {
                drl.append("        // SERFF: ").append(form.get("serffTrackingNo")).append("\n");
            }
            drl.append("        List forms = (List) $f.get(\"attachedForms\");\n");
            drl.append("        if (forms == null) { forms = new ArrayList(); $f.put(\"attachedForms\", forms); }\n");
            drl.append("        if (!forms.contains(\"").append(formNumber).append("\")) forms.add(\"").append(formNumber).append("\");\n");
            drl.append("end\n\n");
        }

        return drl.toString();
    }
}

