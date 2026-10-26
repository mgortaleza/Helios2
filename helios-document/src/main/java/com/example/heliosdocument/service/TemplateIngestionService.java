package com.example.heliosdocument.service;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Service;

import com.aspose.words.Document;
import com.aspose.words.DocumentBuilder;
import com.aspose.words.Field;
import com.aspose.words.FieldType;
import com.aspose.words.FindReplaceOptions;
import com.aspose.words.IReplacingCallback;
import com.aspose.words.Node;
import com.aspose.words.ReplaceAction;
import com.aspose.words.ReplacingArgs;
import com.aspose.words.SaveFormat;
import com.example.heliosdocument.model.DocumentTemplateDto;
import com.example.heliosdocument.model.TemplateFieldDto;
import com.example.heliosdocument.model.UpdateFieldMappingsRequest;

@Service
public class TemplateIngestionService {

    private static final Logger log = LoggerFactory.getLogger(TemplateIngestionService.class);
    private final DocumentService documentService;

    // Pattern for legacy mustache tags {{field_name}} or table markers {{#table}} and {{/table}}
    private static final Pattern TAG_PATTERN = Pattern.compile("\\{\\{([#\\/]?\\s*[a-zA-Z0-9_\\.]+)\\s*\\}\\}");

    public TemplateIngestionService(DocumentService documentService) {
        this.documentService = documentService;
    }

    private JdbcTemplate getJdbc(int tenantId) {
        return documentService.getTenantJdbcTemplate(tenantId);
    }

    /**
     * Ingest a MS Word (.docx) template file:
     * 1. Loads doc via Aspose.Words
     * 2. Migrates {{tag}} legacy text tags to proper MERGEFIELD entities
     * 3. Extracts merge fields in the EXACT sequential order they appear in the document
     * 4. Persists the template metadata, sanitized DOCX binary, and template fields with field_order
     */
    public DocumentTemplateDto ingestTemplate(
            int tenantId,
            Integer endorsementId,
            String templateName,
            String fileName,
            String description,
            byte[] rawDocxBytes
    ) throws Exception {
        log.info("Ingesting template '{}' (fileName: {}) for endorsementId: {}", templateName, fileName, endorsementId);

        // 1. Load document with Aspose.Words
        Document doc;
        try (InputStream in = new ByteArrayInputStream(rawDocxBytes)) {
            doc = new Document(in);
        }

        // 2. Convert {{tag}} to proper MERGEFIELD
        migrateLegacyTagsToMergeFields(doc);

        // 3. Extract merge fields in strict document appearance order
        Set<String> uniqueFieldNames = new LinkedHashSet<>();
        List<ExtractedField> extractedList = new ArrayList<>();

        for (Field f : doc.getRange().getFields()) {
            if (f.getType() == FieldType.FIELD_MERGE_FIELD) {
                String code = f.getFieldCode();
                if (code == null) continue;
                String rawName = extractMergeFieldName(code);
                if (rawName == null || rawName.isBlank()) continue;

                boolean isTable = false;
                String cleaned = rawName.trim();
                if (cleaned.startsWith("TableStart:") || cleaned.startsWith("TableEnd:")) {
                    isTable = true;
                    cleaned = cleaned.substring(cleaned.indexOf(':') + 1).trim();
                }

                if (uniqueFieldNames.add(cleaned)) {
                    extractedList.add(new ExtractedField(cleaned, isTable));
                }
            }
        }

        // Fallback to getFieldNames() if getRange().getFields() missed any
        String[] fallbackNames = doc.getMailMerge().getFieldNames();
        if (fallbackNames != null) {
            for (String rawField : fallbackNames) {
                if (rawField == null || rawField.isBlank()) continue;
                String cleaned = rawField.trim();
                boolean isTable = false;
                if (cleaned.startsWith("TableStart:") || cleaned.startsWith("TableEnd:")) {
                    isTable = true;
                    cleaned = cleaned.substring(cleaned.indexOf(':') + 1).trim();
                }
                if (uniqueFieldNames.add(cleaned)) {
                    extractedList.add(new ExtractedField(cleaned, isTable));
                }
            }
        }

        // 4. Save migrated docx back to byte array
        byte[] migratedBytes;
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            doc.save(out, SaveFormat.DOCX);
            migratedBytes = out.toByteArray();
        }

        // 5. Store template in DB
        JdbcTemplate jdbc = getJdbc(tenantId);
        String insertTemplateSql = """
            INSERT INTO dbo.DOCUMENT_TEMPLATES 
            (ENDORSEMENT_ID, TEMPLATE_NAME, FILE_NAME, MIME_TYPE, FILE_DATA, DESCRIPTION, VERSION, IS_ACTIVE, CREATED_BY, CREATED_AT, UPDATED_AT)
            VALUES (?, ?, ?, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', ?, ?, 1, 1, 'ADMIN', GETDATE(), GETDATE())
        """;

        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbc.update(con -> {
            PreparedStatement ps = con.prepareStatement(insertTemplateSql, Statement.RETURN_GENERATED_KEYS);
            if (endorsementId != null && endorsementId > 0) {
                ps.setInt(1, endorsementId);
            } else {
                ps.setNull(1, java.sql.Types.INTEGER);
            }
            ps.setString(2, templateName);
            ps.setString(3, fileName != null ? fileName : "template.docx");
            ps.setBytes(4, migratedBytes);
            ps.setString(5, description != null ? description : "Word Document Template for Endorsements");
            return ps;
        }, keyHolder);

        Number generatedKey = keyHolder.getKey();
        if (generatedKey == null) {
            throw new IllegalStateException("Failed to retrieve generated TEMPLATE_ID from database.");
        }
        int templateId = generatedKey.intValue();
        log.info("Persisted DOCUMENT_TEMPLATES record ID: {} with {} fields", templateId, extractedList.size());

        // 6. Store fields in TEMPLATE_FIELDS table with sequential FIELD_ORDER
        String insertFieldSql = """
            INSERT INTO dbo.TEMPLATE_FIELDS 
            (TEMPLATE_ID, FIELD_NAME, IS_TABLE_REGION, DATA_MAPPING_PATH, SAMPLE_PREVIEW_VALUE, FIELD_ORDER, CREATED_AT, UPDATED_AT)
            VALUES (?, ?, ?, ?, ?, ?, GETDATE(), GETDATE())
        """;

        int order = 1;
        for (ExtractedField ef : extractedList) {
            String defaultMapping = deriveDefaultMapping(ef.name());
            String sampleVal = deriveSampleValue(ef.name());
            jdbc.update(insertFieldSql, templateId, ef.name(), ef.isTable() ? 1 : 0, defaultMapping, sampleVal, order++);
        }

        return getTemplateById(tenantId, templateId);
    }

    private String extractMergeFieldName(String fieldCode) {
        // e.g. "MERGEFIELD endorsement_nbr \* MERGEFORMAT"
        String trimmed = fieldCode.trim();
        if (trimmed.toUpperCase().startsWith("MERGEFIELD")) {
            trimmed = trimmed.substring("MERGEFIELD".length()).trim();
        }
        int spaceIdx = trimmed.indexOf(' ');
        int slashIdx = trimmed.indexOf('\\');
        int endIdx = trimmed.length();
        if (spaceIdx > 0 && spaceIdx < endIdx) endIdx = spaceIdx;
        if (slashIdx > 0 && slashIdx < endIdx) endIdx = slashIdx;
        return trimmed.substring(0, endIdx).replace("\"", "").trim();
    }

    /**
     * Replaces {{field}} and {{#table}}/{{/table}} with Aspose MS Word MERGEFIELDs
     */
    public void migrateLegacyTagsToMergeFields(Document doc) throws Exception {
        FindReplaceOptions options = new FindReplaceOptions();
        options.setReplacingCallback(new MustacheToMergeFieldReplacingCallback(doc));
        doc.getRange().replace(TAG_PATTERN, "", options);
    }

    /**
     * IReplacingCallback implementation to replace {{tag}} with Word MERGEFIELD entities
     */
    private static class MustacheToMergeFieldReplacingCallback implements IReplacingCallback {
        private final Document doc;

        public MustacheToMergeFieldReplacingCallback(Document doc) {
            this.doc = doc;
        }

        @Override
        public int replacing(ReplacingArgs args) throws Exception {
            Node matchNode = args.getMatchNode();
            DocumentBuilder builder = new DocumentBuilder(doc);
            builder.moveTo(matchNode);

            String fullMatch = args.getMatch().group(0);
            Matcher matcher = TAG_PATTERN.matcher(fullMatch);
            if (matcher.find()) {
                String rawTag = matcher.group(1).trim();
                String fieldName;
                if (rawTag.startsWith("#")) {
                    fieldName = "TableStart:" + rawTag.substring(1).trim();
                } else if (rawTag.startsWith("/")) {
                    fieldName = "TableEnd:" + rawTag.substring(1).trim();
                } else {
                    fieldName = rawTag;
                }
                builder.insertField("MERGEFIELD " + fieldName + " \\* MERGEFORMAT", "«" + fieldName + "»");
            }
            return ReplaceAction.REPLACE;
        }
    }

    public DocumentTemplateDto getTemplateById(int tenantId, int templateId) {
        JdbcTemplate jdbc = getJdbc(tenantId);
        String sql = """
            SELECT t.TEMPLATE_ID, t.ENDORSEMENT_ID, t.TEMPLATE_NAME, t.FILE_NAME, t.MIME_TYPE, 
                   t.DESCRIPTION, t.VERSION, t.IS_ACTIVE, t.CREATED_BY, t.CREATED_AT, t.UPDATED_AT,
                   e.ENDORSEMENT_NBR, e.ENDORSEMENT_TITLE, e.QUOTE_ID
            FROM dbo.DOCUMENT_TEMPLATES t
            LEFT JOIN dbo.UW_ENDORSEMENT e ON t.ENDORSEMENT_ID = e.ENDORSEMENT_ID
            WHERE t.TEMPLATE_ID = ?
        """;

        List<DocumentTemplateDto> list = jdbc.query(sql, (rs, rowNum) -> {
            Integer endId = rs.getInt("ENDORSEMENT_ID");
            if (rs.wasNull()) endId = null;
            Integer qId = rs.getInt("QUOTE_ID");
            if (rs.wasNull()) qId = null;

            return new DocumentTemplateDto(
                    rs.getInt("TEMPLATE_ID"),
                    endId,
                    rs.getString("TEMPLATE_NAME"),
                    rs.getString("FILE_NAME"),
                    rs.getString("MIME_TYPE"),
                    rs.getString("DESCRIPTION"),
                    rs.getInt("VERSION"),
                    rs.getBoolean("IS_ACTIVE"),
                    rs.getString("CREATED_BY"),
                    rs.getTimestamp("CREATED_AT") != null ? rs.getTimestamp("CREATED_AT").toLocalDateTime() : null,
                    rs.getTimestamp("UPDATED_AT") != null ? rs.getTimestamp("UPDATED_AT").toLocalDateTime() : null,
                    rs.getString("ENDORSEMENT_NBR"),
                    rs.getString("ENDORSEMENT_TITLE"),
                    qId,
                    getFieldsForTemplate(tenantId, templateId)
            );
        }, templateId);

        if (list.isEmpty()) {
            throw new IllegalArgumentException("Template with ID " + templateId + " not found.");
        }
        return list.get(0);
    }

    public List<DocumentTemplateDto> listTemplates(int tenantId) {
        JdbcTemplate jdbc = getJdbc(tenantId);
        String sql = """
            SELECT t.TEMPLATE_ID, t.ENDORSEMENT_ID, t.TEMPLATE_NAME, t.FILE_NAME, t.MIME_TYPE, 
                   t.DESCRIPTION, t.VERSION, t.IS_ACTIVE, t.CREATED_BY, t.CREATED_AT, t.UPDATED_AT,
                   e.ENDORSEMENT_NBR, e.ENDORSEMENT_TITLE, e.QUOTE_ID
            FROM dbo.DOCUMENT_TEMPLATES t
            LEFT JOIN dbo.UW_ENDORSEMENT e ON t.ENDORSEMENT_ID = e.ENDORSEMENT_ID
            ORDER BY t.TEMPLATE_ID DESC
        """;

        return jdbc.query(sql, (rs, rowNum) -> {
            int tid = rs.getInt("TEMPLATE_ID");
            Integer endId = rs.getInt("ENDORSEMENT_ID");
            if (rs.wasNull()) endId = null;
            Integer qId = rs.getInt("QUOTE_ID");
            if (rs.wasNull()) qId = null;

            return new DocumentTemplateDto(
                    tid,
                    endId,
                    rs.getString("TEMPLATE_NAME"),
                    rs.getString("FILE_NAME"),
                    rs.getString("MIME_TYPE"),
                    rs.getString("DESCRIPTION"),
                    rs.getInt("VERSION"),
                    rs.getBoolean("IS_ACTIVE"),
                    rs.getString("CREATED_BY"),
                    rs.getTimestamp("CREATED_AT") != null ? rs.getTimestamp("CREATED_AT").toLocalDateTime() : null,
                    rs.getTimestamp("UPDATED_AT") != null ? rs.getTimestamp("UPDATED_AT").toLocalDateTime() : null,
                    rs.getString("ENDORSEMENT_NBR"),
                    rs.getString("ENDORSEMENT_TITLE"),
                    qId,
                    getFieldsForTemplate(tenantId, tid)
            );
        });
    }

    public List<TemplateFieldDto> getFieldsForTemplate(int tenantId, int templateId) {
        JdbcTemplate jdbc = getJdbc(tenantId);
        String sql = """
            SELECT FIELD_ID, TEMPLATE_ID, FIELD_NAME, IS_TABLE_REGION, DATA_MAPPING_PATH, 
                   SAMPLE_PREVIEW_VALUE, CREATED_AT, UPDATED_AT
            FROM dbo.TEMPLATE_FIELDS
            WHERE TEMPLATE_ID = ?
            ORDER BY FIELD_ORDER ASC, FIELD_ID ASC
        """;

        return jdbc.query(sql, (rs, rowNum) -> new TemplateFieldDto(
                rs.getInt("FIELD_ID"),
                rs.getInt("TEMPLATE_ID"),
                rs.getString("FIELD_NAME"),
                rs.getBoolean("IS_TABLE_REGION"),
                rs.getString("DATA_MAPPING_PATH"),
                rs.getString("SAMPLE_PREVIEW_VALUE"),
                rs.getTimestamp("CREATED_AT") != null ? rs.getTimestamp("CREATED_AT").toLocalDateTime() : null,
                rs.getTimestamp("UPDATED_AT") != null ? rs.getTimestamp("UPDATED_AT").toLocalDateTime() : null
        ), templateId);
    }

    public void updateFieldMappings(int tenantId, int templateId, UpdateFieldMappingsRequest request) {
        if (request == null || request.mappings() == null) return;
        JdbcTemplate jdbc = getJdbc(tenantId);
        String sql = """
            UPDATE dbo.TEMPLATE_FIELDS 
            SET DATA_MAPPING_PATH = ?, UPDATED_AT = GETDATE()
            WHERE TEMPLATE_ID = ? AND FIELD_NAME = ?
        """;

        for (Map.Entry<String, String> entry : request.mappings().entrySet()) {
            jdbc.update(sql, entry.getValue(), templateId, entry.getKey());
        }
        log.info("Updated {} field mappings for template ID {}", request.mappings().size(), templateId);
    }

    public byte[] getRawTemplateData(int tenantId, int templateId) {
        JdbcTemplate jdbc = getJdbc(tenantId);
        String sql = "SELECT FILE_DATA FROM dbo.DOCUMENT_TEMPLATES WHERE TEMPLATE_ID = ?";
        return jdbc.queryForObject(sql, byte[].class, templateId);
    }

    public List<Map<String, Object>> listEndorsements(int tenantId) {
        JdbcTemplate jdbc = getJdbc(tenantId);
        String sql = """
            SELECT e.ENDORSEMENT_ID, e.QUOTE_ID, e.ENDORSEMENT_NBR, e.ENDORSEMENT_TITLE, 
                   e.ENDORSEMENT_TYPE, e.PREMIUM_DELTA, e.STATUS, q.QUOTE_NBR
            FROM dbo.UW_ENDORSEMENT e
            LEFT JOIN dbo.UW_QUOTE q ON e.QUOTE_ID = q.QUOTE_ID
            ORDER BY e.ENDORSEMENT_ID DESC
        """;
        return jdbc.queryForList(sql);
    }

    private String deriveDefaultMapping(String name) {
        String n = name.toLowerCase();
        if (n.contains("quote_nbr") || n.contains("quotenbr")) return "quote.QUOTE_NBR";
        if (n.contains("premium") && !n.contains("delta")) return "quote.PREMIUM";
        if (n.contains("premium_delta") || n.contains("endorsement_premium")) return "endorsement.PREMIUM_DELTA";
        if (n.contains("endorsement_nbr")) return "endorsement.ENDORSEMENT_NBR";
        if (n.contains("endorsement_title") || n.contains("title")) return "endorsement.ENDORSEMENT_TITLE";
        if (n.contains("insured") || n.contains("insured_name") || n.contains("customer")) return "party.LEGAL_NAME";
        if (n.contains("policy_nbr") || n.contains("policynbr")) return "policy.POLICY_NBR";
        if (n.contains("state")) return "quote.STATE_CODE";
        if (n.contains("limit")) return "quote.LIMIT_AMT";
        if (n.contains("retention") || n.contains("deductible")) return "quote.RETENTION_AMT";
        if (n.contains("date") || n.contains("effective")) return "endorsement.EFFECTIVE_DATE";
        if (n.contains("description")) return "endorsement.DESCRIPTION";
        return "";
    }

    private String deriveSampleValue(String name) {
        String n = name.toLowerCase();
        if (n.contains("quote")) return "Q-2026-8841";
        if (n.contains("premium") && !n.contains("delta")) return "$1,200.00";
        if (n.contains("delta")) return "+$150.00";
        if (n.contains("endorsement_nbr")) return "END-001-ADD-INS";
        if (n.contains("insured")) return "Apex Global Logistics LLC";
        if (n.contains("state")) return "CA";
        if (n.contains("limit")) return "$2,000,000";
        if (n.contains("date")) return "2026-10-26";
        return "Sample " + name;
    }

    private record ExtractedField(String name, boolean isTable) {}
}
