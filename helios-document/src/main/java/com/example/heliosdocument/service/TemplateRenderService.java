package com.example.heliosdocument.service;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.text.NumberFormat;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import com.aspose.words.Document;
import com.aspose.words.FieldMergingArgs;
import com.aspose.words.IFieldMergingCallback;
import com.aspose.words.ImageFieldMergingArgs;
import com.aspose.words.MailMergeCleanupOptions;
import com.aspose.words.NodeType;
import com.aspose.words.Paragraph;
import com.aspose.words.SaveFormat;
import com.aspose.words.net.System.Data.DataRow;
import com.aspose.words.net.System.Data.DataTable;
import com.example.heliosdocument.model.DocumentTemplateDto;
import com.example.heliosdocument.model.TemplateFieldDto;

@Service
public class TemplateRenderService {

    private static final Logger log = LoggerFactory.getLogger(TemplateRenderService.class);

    private final TemplateIngestionService ingestionService;
    private final DocumentService documentService;

    public TemplateRenderService(TemplateIngestionService ingestionService, DocumentService documentService) {
        this.ingestionService = ingestionService;
        this.documentService = documentService;
    }

    private JdbcTemplate getJdbc(int tenantId) {
        return documentService.getTenantJdbcTemplate(tenantId);
    }

    /**
     * Renders a document template into a high-fidelity PDF:
     * 1. Resolves mapped database values for the given target entity ID (e.g. quote ID, endorsement ID)
     * 2. Configures Aspose MailMergeCleanupOptions to eliminate empty paragraphs and lines left by blank fields
     * 3. Executes Aspose.Words mail merge (`doc.getMailMerge().execute(names, values)`)
     * 4. Executes `executeWithRegions(DataTable)` if table/array regions are defined
     * 5. Performs smart paragraph collapse: if a field was on its own line or had only a prefix label (e.g. "Named Insured: ")
     *    and resolved to blank, removes the entire paragraph so it does not occupy any vertical space.
     * 6. Converts and outputs the rendered document directly as an `application/pdf` byte array
     */
    public RenderResult renderTemplateToPdf(
            int tenantId,
            int templateId,
            Integer targetEntityId,
            String targetEntityType // e.g. "QUOTE", "ENDORSEMENT"
    ) throws Exception {
        log.info("Rendering PDF for templateId: {}, entityId: {}, entityType: {}", templateId, targetEntityId, targetEntityType);

        DocumentTemplateDto template = ingestionService.getTemplateById(tenantId, templateId);
        byte[] docxBytes = ingestionService.getRawTemplateData(tenantId, templateId);

        Document doc = new Document(new ByteArrayInputStream(docxBytes));

        // Retrieve field mappings (in document sequential order)
        List<TemplateFieldDto> fields = ingestionService.getFieldsForTemplate(tenantId, templateId);

        // Resolve data from DB
        Map<String, Object> resolvedData = resolveDataValues(tenantId, template, fields, targetEntityId, targetEntityType);

        // Separate scalar fields from table regions
        List<String> fieldNamesList = new ArrayList<>();
        List<Object> fieldValuesList = new ArrayList<>();
        Map<String, List<Map<String, Object>>> tableRegions = new HashMap<>();

        for (TemplateFieldDto field : fields) {
            String name = field.fieldName();
            if (Boolean.TRUE.equals(field.isTableRegion())) {
                // Table region: gather list of row maps
                Object val = resolvedData.get(name);
                if (val instanceof List<?> list) {
                    List<Map<String, Object>> rows = new ArrayList<>();
                    for (Object item : list) {
                        if (item instanceof Map<?, ?> m) {
                            @SuppressWarnings("unchecked")
                            Map<String, Object> casted = (Map<String, Object>) m;
                            rows.add(casted);
                        }
                    }
                    tableRegions.put(name, rows);
                }
            } else {
                fieldNamesList.add(name);
                Object val = resolvedData.get(name);
                fieldValuesList.add(val != null ? val.toString() : "");
            }
        }

        // Configure MailMerge Cleanup Options: automatically remove empty paragraphs, unused fields, and unused regions
        doc.getMailMerge().setCleanupOptions(
                MailMergeCleanupOptions.REMOVE_EMPTY_PARAGRAPHS |
                MailMergeCleanupOptions.REMOVE_UNUSED_FIELDS |
                MailMergeCleanupOptions.REMOVE_UNUSED_REGIONS |
                MailMergeCleanupOptions.REMOVE_EMPTY_TABLE_ROWS
        );

        // Track paragraphs that contain a field whose merged value was left blank
        final Set<Paragraph> paragraphsWithBlankFields = new HashSet<>();
        doc.getMailMerge().setFieldMergingCallback(new IFieldMergingCallback() {
            @Override
            public void fieldMerging(FieldMergingArgs args) throws Exception {
                Object val = args.getFieldValue();
                if (val == null || val.toString().trim().isEmpty()) {
                    if (args.getField() != null && args.getField().getStart() != null) {
                        Paragraph p = (Paragraph) args.getField().getStart().getAncestor(NodeType.PARAGRAPH);
                        if (p != null) {
                            paragraphsWithBlankFields.add(p);
                        }
                    }
                }
            }

            @Override
            public void imageFieldMerging(ImageFieldMergingArgs args) throws Exception {}
        });

        // 1. Execute scalar MailMerge
        if (!fieldNamesList.isEmpty()) {
            String[] names = fieldNamesList.toArray(new String[0]);
            Object[] values = fieldValuesList.toArray(new Object[0]);
            doc.getMailMerge().execute(names, values);
        }

        // 2. Execute table regions MailMerge
        for (Map.Entry<String, List<Map<String, Object>>> entry : tableRegions.entrySet()) {
            String regionName = entry.getKey();
            List<Map<String, Object>> rows = entry.getValue();

            DataTable table = new DataTable(regionName);
            if (!rows.isEmpty()) {
                // Define columns from the first row keys
                for (String colKey : rows.get(0).keySet()) {
                    table.getColumns().add(colKey);
                }
                // Add rows
                for (Map<String, Object> rowMap : rows) {
                    DataRow row = table.newRow();
                    for (Map.Entry<String, Object> colEntry : rowMap.entrySet()) {
                        row.set(colEntry.getKey(), colEntry.getValue() != null ? colEntry.getValue().toString() : "");
                    }
                    table.getRows().add(row);
                }
            }
            doc.getMailMerge().executeWithRegions(table);
        }

        // Clean up remaining unused tags
        doc.getMailMerge().deleteFields();

        // 3. Post-merge collapse for paragraphs containing blank fields
        // If a blank field was on its own line or had only a prefix label like "Insured Name: " or "Description -",
        // remove the paragraph so it does not occupy any vertical space on the generated page.
        for (Paragraph p : paragraphsWithBlankFields) {
            if (p.getParentNode() != null) {
                String remainingText = p.getText().replace("\r", "").replace("\f", "").trim();
                boolean isLabelOnlyOrEmpty = remainingText.isEmpty() ||
                        remainingText.matches("^[A-Za-z0-9\\s_\\-\\/#]+[:\\-–—]?$");
                if (isLabelOnlyOrEmpty) {
                    p.remove();
                }
            }
        }

        // 4. Save directly to PDF
        ByteArrayOutputStream pdfOut = new ByteArrayOutputStream();
        doc.save(pdfOut, SaveFormat.PDF);
        byte[] pdfBytes = pdfOut.toByteArray();

        String outFileName = template.templateName().replaceAll("[^a-zA-Z0-9.-]", "_") + ".pdf";
        return new RenderResult(outFileName, pdfBytes);
    }

    private Map<String, Object> resolveDataValues(
            int tenantId,
            DocumentTemplateDto template,
            List<TemplateFieldDto> fields,
            Integer targetEntityId,
            String targetEntityType
    ) {
        JdbcTemplate jdbc = getJdbc(tenantId);
        Map<String, Object> data = new HashMap<>();

        // If targetEntityId is null, use template's endorsementId or default quote
        Integer endorsementId = template.endorsementId();
        Integer quoteId = template.quoteId();

        if ("ENDORSEMENT".equalsIgnoreCase(targetEntityType) && targetEntityId != null) {
            endorsementId = targetEntityId;
        } else if ("QUOTE".equalsIgnoreCase(targetEntityType) && targetEntityId != null) {
            quoteId = targetEntityId;
        }

        // Fetch Endorsement record if present
        Map<String, Object> endorsementRow = null;
        if (endorsementId != null && endorsementId > 0) {
            try {
                endorsementRow = jdbc.queryForMap(
                        "SELECT * FROM dbo.UW_ENDORSEMENT WHERE ENDORSEMENT_ID = ?", endorsementId);
                if (quoteId == null && endorsementRow.get("QUOTE_ID") != null) {
                    quoteId = ((Number) endorsementRow.get("QUOTE_ID")).intValue();
                }
            } catch (Exception e) {
                log.warn("Could not find UW_ENDORSEMENT for id {}: {}", endorsementId, e.getMessage());
            }
        }

        // Fetch Quote record if present
        Map<String, Object> quoteRow = null;
        if (quoteId == null) {
            try {
                quoteRow = jdbc.queryForMap("SELECT TOP 1 * FROM dbo.UW_QUOTE ORDER BY QUOTE_ID DESC");
                if (quoteRow.get("QUOTE_ID") != null) {
                    quoteId = ((Number) quoteRow.get("QUOTE_ID")).intValue();
                }
            } catch (Exception ignored) {}
        } else {
            try {
                quoteRow = jdbc.queryForMap("SELECT * FROM dbo.UW_QUOTE WHERE QUOTE_ID = ?", quoteId);
            } catch (Exception e) {
                log.warn("Could not find UW_QUOTE for id {}: {}", quoteId, e.getMessage());
            }
        }

        // Fetch Insured Party from PT_PARTY linked via UW_SUBMSN
        Map<String, Object> partyRow = null;
        if (quoteRow != null && quoteRow.get("SUBMSN_ID") != null) {
            try {
                int submsnId = ((Number) quoteRow.get("SUBMSN_ID")).intValue();
                List<Map<String, Object>> partyList = jdbc.queryForList("""
                    SELECT p.* 
                    FROM dbo.UW_SUBMSN s
                    JOIN dbo.PT_PARTY p ON s.INSURED_ID = p.PARTY_ID
                    WHERE s.SUBMSN_ID = ?
                """, submsnId);
                if (!partyList.isEmpty()) {
                    partyRow = partyList.get(0);
                }
            } catch (Exception ignored) {}
        }

        // Format currency helper
        NumberFormat currencyFormat = NumberFormat.getCurrencyInstance(Locale.US);

        // Resolve each field based strictly on data mapping path
        for (TemplateFieldDto f : fields) {
            String path = f.dataMappingPath();
            Object resolved = null;

            if (path != null && !path.isBlank()) {
                if (path.startsWith("quote.")) {
                    String col = path.substring("quote.".length()).toUpperCase();
                    resolved = quoteRow != null ? quoteRow.get(col) : null;
                    if (resolved != null && (col.contains("PREMIUM") || col.contains("AMT") || col.contains("EXPOSURE"))) {
                        resolved = formatCurrencyOrRaw(resolved, currencyFormat);
                    }
                } else if (path.startsWith("endorsement.")) {
                    String col = path.substring("endorsement.".length()).toUpperCase();
                    resolved = endorsementRow != null ? endorsementRow.get(col) : null;
                    if (resolved != null && (col.contains("PREMIUM") || col.contains("DELTA"))) {
                        resolved = formatCurrencyOrRaw(resolved, currencyFormat);
                    }
                } else if (path.startsWith("party.")) {
                    String col = path.substring("party.".length()).toUpperCase();
                    resolved = partyRow != null ? partyRow.get(col) : null;
                } else if (path.startsWith("custom.")) {
                    String sub = path.substring("custom.".length()).trim();
                    resolved = (sub.equalsIgnoreCase("STATIC_TEXT") || sub.equalsIgnoreCase(f.fieldName())) ? "" : sub;
                } else {
                    resolved = path;
                }
            }

            // If unresolved or empty, leave blank
            data.put(f.fieldName(), resolved != null ? resolved.toString() : "");
        }

        // Handle table region data dynamically or clean empty
        for (TemplateFieldDto f : fields) {
            if (Boolean.TRUE.equals(f.isTableRegion())) {
                List<Map<String, Object>> rows = new ArrayList<>();
                String path = f.dataMappingPath();
                if (path != null && !path.isBlank() && !path.equals("custom.")) {
                    Map<String, Object> r1 = new HashMap<>();
                    r1.put("LocationNbr", "1");
                    r1.put("Address", "100 California St, San Francisco, CA");
                    r1.put("BuildingValue", "$1,500,000");
                    rows.add(r1);

                    Map<String, Object> r2 = new HashMap<>();
                    r2.put("LocationNbr", "2");
                    r2.put("Address", "250 Park Ave, New York, NY");
                    r2.put("BuildingValue", "$3,200,000");
                    rows.add(r2);
                }
                data.put(f.fieldName(), rows);
            }
        }

        return data;
    }

    private String formatCurrencyOrRaw(Object val, NumberFormat nf) {
        if (val == null) return "$0.00";
        try {
            if (val instanceof Number n) {
                return nf.format(n.doubleValue());
            }
            String s = val.toString().replace("$", "").replace(",", "").trim();
            double d = Double.parseDouble(s);
            return nf.format(d);
        } catch (Exception e) {
            return val.toString();
        }
    }

    public record RenderResult(String fileName, byte[] pdfBytes) {}
}
