package com.example.heliosdocument.service;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.time.LocalDate;
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
import com.example.heliosdocument.storage.StorageService;
import com.example.heliosdocument.storage.StoredFileMetadata;

@Service
public class TemplateIngestionService {

    private static final Logger log = LoggerFactory.getLogger(TemplateIngestionService.class);

    private final DocumentService documentService;
    private final StorageService storageService;

    // Pattern for legacy mustache tags {{field_name}} or table markers {{#table}} and {{/table}}
    private static final Pattern TAG_PATTERN = Pattern.compile("\\{\\{([#\\/]?\\s*[a-zA-Z0-9_\\.]+)\\s*\\}\\}");

    public TemplateIngestionService(DocumentService documentService, StorageService storageService) {
        this.documentService = documentService;
        this.storageService = storageService;
    }

    private JdbcTemplate getJdbc(int tenantId) {
        return documentService.getTenantJdbcTemplate(tenantId);
    }

    public String resolveTenantCode(int tenantId) {
        return switch (tenantId) {
            case 2 -> "HELIOS_TST";
            case 3 -> "HELIOS3_TST";
            default -> "HELIOS2_TST";
        };
    }

    /**
     * Ingest a MS Word (.docx) template file:
     * 1. Loads doc via Aspose.Words
     * 2. Migrates {{tag}} legacy text tags to proper MERGEFIELD entities
     * 3. Extracts merge fields in the EXACT sequential order they appear in the document
     * 4. Streams the sanitized DOCX to physical storage via StorageService (local or Windows UNC share)
     * 5. Persists template metadata and RELATIVE PATH in SQL Server (FILE_DATA set to NULL)
     * 6. Saves extracted field mappings
     */
    public DocumentTemplateDto ingestTemplate(
            int tenantId,
            Integer endorsementId,
            String templateName,
            String fileName,
            String description,
            byte[] rawDocxBytes
    ) throws Exception {
        log.info("Ingesting template '{}' (fileName: {}) for tenant #{}", templateName, fileName, tenantId);

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

        // 5. Stream binary to filesystem / UNC share via StorageService
        String tenantCode = resolveTenantCode(tenantId);
        StoredFileMetadata fileMeta = storageService.store(tenantId, tenantCode, "templates", fileName, migratedBytes);

        String formNumber = deriveFormNumber(templateName, fileName);
        String editionDate = String.format("%04d-%02d", LocalDate.now().getYear(), LocalDate.now().getMonthValue());
        String approvalStatus = "APPROVED";

        // 6. Store template in DB (Persist RELATIVE_PATH, eliminate BLOB)
        JdbcTemplate jdbc = getJdbc(tenantId);

        // Ensure new columns exist on tenant table dynamically
        ensureStorageColumnsExist(jdbc);

        String insertTemplateSql = """
            INSERT INTO dbo.DOCUMENT_TEMPLATES 
            (ENDORSEMENT_ID, TEMPLATE_NAME, FILE_NAME, MIME_TYPE, RELATIVE_PATH, FILE_SIZE_BYTES, SHA256_CHECKSUM,
             FORM_NUMBER, EDITION_DATE, APPROVAL_STATUS, FILE_DATA, DESCRIPTION, VERSION, IS_ACTIVE, CREATED_BY, CREATED_AT, UPDATED_AT)
            VALUES (?, ?, ?, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', ?, ?, ?, ?, ?, ?, NULL, ?, 1, 1, 'ADMIN', GETDATE(), GETDATE())
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
            ps.setString(4, fileMeta.relativePath());
            ps.setLong(5, fileMeta.fileSizeBytes());
            ps.setString(6, fileMeta.sha256Checksum());
            ps.setString(7, formNumber);
            ps.setString(8, editionDate);
            ps.setString(9, approvalStatus);
            ps.setString(10, description != null ? description : "Word Document Template for Endorsements");
            return ps;
        }, keyHolder);

        Number generatedKey = keyHolder.getKey();
        int templateId = (generatedKey != null) ? generatedKey.intValue() : 0;
        log.info("Created DOCUMENT_TEMPLATES record ID: {} with relativePath: '{}'", templateId, fileMeta.relativePath());

        // 7. Synchronize to mstr.form_inventory if present
        syncToMstrFormInventory(jdbc, formNumber, templateName, editionDate, fileMeta);

        // 8. Insert discovered fields with exact field_order sequence
        ensureFieldOrderColumn(jdbc);

        String insertFieldSql = """
            INSERT INTO dbo.TEMPLATE_FIELDS 
            (TEMPLATE_ID, FIELD_NAME, IS_TABLE_REGION, DATA_MAPPING_PATH, SAMPLE_PREVIEW_VALUE, FIELD_ORDER, CREATED_AT, UPDATED_AT)
            VALUES (?, ?, ?, ?, ?, ?, GETDATE(), GETDATE())
        """;

        List<TemplateFieldDto> createdFields = new ArrayList<>();
        int orderIndex = 1;
        for (ExtractedField ef : extractedList) {
            String defaultPath = deriveDefaultMapping(ef.name);
            String sampleVal = deriveSampleValue(ef.name);

            final int fOrder = orderIndex++;
            jdbc.update(insertFieldSql, templateId, ef.name, ef.isTable ? 1 : 0, defaultPath, sampleVal, fOrder);

            createdFields.add(new TemplateFieldDto(
                    null,
                    templateId,
                    ef.name,
                    ef.isTable,
                    defaultPath,
                    sampleVal,
                    LocalDateTime.now(),
                    LocalDateTime.now()
            ));
        }

        return new DocumentTemplateDto(
                templateId,
                endorsementId,
                templateName,
                fileName,
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                description,
                1,
                true,
                "ADMIN",
                LocalDateTime.now(),
                LocalDateTime.now(),
                null,
                null,
                null,
                fileMeta.relativePath(),
                fileMeta.fileSizeBytes(),
                fileMeta.sha256Checksum(),
                formNumber,
                editionDate,
                approvalStatus,
                createdFields
        );
    }

    private void ensureStorageColumnsExist(JdbcTemplate jdbc) {
        try {
            String ddl = """
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.DOCUMENT_TEMPLATES') AND name = 'RELATIVE_PATH')
                    ALTER TABLE dbo.DOCUMENT_TEMPLATES ADD RELATIVE_PATH VARCHAR(500) NULL;
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.DOCUMENT_TEMPLATES') AND name = 'FILE_SIZE_BYTES')
                    ALTER TABLE dbo.DOCUMENT_TEMPLATES ADD FILE_SIZE_BYTES BIGINT NULL DEFAULT 0;
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.DOCUMENT_TEMPLATES') AND name = 'SHA256_CHECKSUM')
                    ALTER TABLE dbo.DOCUMENT_TEMPLATES ADD SHA256_CHECKSUM VARCHAR(64) NULL;
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.DOCUMENT_TEMPLATES') AND name = 'FORM_NUMBER')
                    ALTER TABLE dbo.DOCUMENT_TEMPLATES ADD FORM_NUMBER VARCHAR(100) NULL;
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.DOCUMENT_TEMPLATES') AND name = 'EDITION_DATE')
                    ALTER TABLE dbo.DOCUMENT_TEMPLATES ADD EDITION_DATE VARCHAR(20) NULL;
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.DOCUMENT_TEMPLATES') AND name = 'APPROVAL_STATUS')
                    ALTER TABLE dbo.DOCUMENT_TEMPLATES ADD APPROVAL_STATUS VARCHAR(50) NOT NULL CONSTRAINT DF_doc_tmp_appr DEFAULT 'APPROVED';
                ALTER TABLE dbo.DOCUMENT_TEMPLATES ALTER COLUMN FILE_DATA VARBINARY(MAX) NULL;
            """;
            jdbc.execute(ddl);
        } catch (Exception e) {
            log.debug("Storage columns check completed: {}", e.getMessage());
        }
    }

    private void syncToMstrFormInventory(JdbcTemplate jdbc, String formNumber, String templateName, String editionDate, StoredFileMetadata meta) {
        try {
            String sql = """
                IF EXISTS (SELECT * FROM sys.tables WHERE name = 'form_inventory' AND schema_id = SCHEMA_ID('mstr'))
                BEGIN
                    MERGE INTO mstr.form_inventory AS target
                    USING (SELECT ? AS FORM_NUMBER, ? AS EDITION_DATE) AS source
                    ON target.FORM_NUMBER = source.FORM_NUMBER AND target.EDITION_DATE = source.EDITION_DATE
                    WHEN MATCHED THEN
                        UPDATE SET FORM_NAME = ?, RELATIVE_PATH = ?, FILE_SIZE_BYTES = ?, SHA256_CHECKSUM = ?, UPDATED_AT = GETDATE()
                    WHEN NOT MATCHED THEN
                        INSERT (FORM_NUMBER, FORM_NAME, EDITION_DATE, LINE_OF_BUSINESS, FORM_TYPE, RELATIVE_PATH, FILE_SIZE_BYTES, SHA256_CHECKSUM, IS_MANDATORY, STATUS, EFFECTIVE_DATE, CREATED_AT, UPDATED_AT)
                        VALUES (source.FORM_NUMBER, ?, source.EDITION_DATE, 'COMMERCIAL_PROPERTY', 'ENDORSEMENT', ?, ?, ?, 0, 'APPROVED', CAST(GETDATE() AS DATE), GETDATE(), GETDATE());
                END
            """;
            jdbc.update(sql, formNumber, editionDate, templateName, meta.relativePath(), meta.fileSizeBytes(), meta.sha256Checksum(),
                    templateName, meta.relativePath(), meta.fileSizeBytes(), meta.sha256Checksum());
        } catch (Exception e) {
            log.debug("mstr.form_inventory sync skipped: {}", e.getMessage());
        }
    }

    private void ensureFieldOrderColumn(JdbcTemplate jdbc) {
        try {
            String checkColSql = """
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.TEMPLATE_FIELDS') AND name = 'FIELD_ORDER')
                BEGIN
                    ALTER TABLE dbo.TEMPLATE_FIELDS ADD FIELD_ORDER INT NOT NULL DEFAULT 1;
                END
            """;
            jdbc.execute(checkColSql);
        } catch (Exception ignored) {}
    }

    private void migrateLegacyTagsToMergeFields(Document doc) throws Exception {
        FindReplaceOptions options = new FindReplaceOptions();
        options.setReplacingCallback(new MustacheToMergeFieldCallback(doc));
        doc.getRange().replace(TAG_PATTERN, "", options);
    }

    public DocumentTemplateDto getTemplateById(int tenantId, int templateId) {
        JdbcTemplate jdbc = getJdbc(tenantId);
        String sql = """
            SELECT t.TEMPLATE_ID, t.ENDORSEMENT_ID, t.TEMPLATE_NAME, t.FILE_NAME, t.MIME_TYPE, 
                   t.DESCRIPTION, t.VERSION, t.IS_ACTIVE, t.CREATED_BY, t.CREATED_AT, t.UPDATED_AT,
                   t.RELATIVE_PATH, t.FILE_SIZE_BYTES, t.SHA256_CHECKSUM, t.FORM_NUMBER, t.EDITION_DATE, t.APPROVAL_STATUS,
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
            long size = rs.getLong("FILE_SIZE_BYTES");
            if (rs.wasNull()) size = 0L;

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
                    rs.getString("RELATIVE_PATH"),
                    size,
                    rs.getString("SHA256_CHECKSUM"),
                    rs.getString("FORM_NUMBER"),
                    rs.getString("EDITION_DATE"),
                    rs.getString("APPROVAL_STATUS"),
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
                   t.RELATIVE_PATH, t.FILE_SIZE_BYTES, t.SHA256_CHECKSUM, t.FORM_NUMBER, t.EDITION_DATE, t.APPROVAL_STATUS,
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
            long size = rs.getLong("FILE_SIZE_BYTES");
            if (rs.wasNull()) size = 0L;

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
                    rs.getString("RELATIVE_PATH"),
                    size,
                    rs.getString("SHA256_CHECKSUM"),
                    rs.getString("FORM_NUMBER"),
                    rs.getString("EDITION_DATE"),
                    rs.getString("APPROVAL_STATUS"),
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

    /**
     * Resolves raw template bytes:
     * 1. If RELATIVE_PATH is present and file exists on physical storage, loads from StorageService
     * 2. Fallback to legacy database BLOB (FILE_DATA) for backward compatibility
     */
    public byte[] getRawTemplateData(int tenantId, int templateId) {
        JdbcTemplate jdbc = getJdbc(tenantId);
        String sql = "SELECT RELATIVE_PATH, FILE_DATA FROM dbo.DOCUMENT_TEMPLATES WHERE TEMPLATE_ID = ?";
        return jdbc.queryForObject(sql, (rs, rowNum) -> {
            String relPath = rs.getString("RELATIVE_PATH");
            if (relPath != null && !relPath.isBlank() && storageService.exists(relPath)) {
                return storageService.loadAsBytes(relPath);
            }
            byte[] blob = rs.getBytes("FILE_DATA");
            if (blob != null && blob.length > 0) {
                return blob;
            }
            throw new IllegalStateException("Template #" + templateId + " physical binary file not found at " + relPath);
        }, templateId);
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

    private String deriveFormNumber(String name, String filename) {
        String base = (name != null && !name.isBlank()) ? name : filename;
        if (base == null) return "IL-00-17";
        return base.replaceAll("[^a-zA-Z0-9-]", "_").toUpperCase();
    }

    private String deriveDefaultMapping(String name) {
        String n = name.toLowerCase();
        if (n.contains("endorsement_nbr") || n.contains("endorsementnumber") || n.equals("formnumber")) {
            return "endorsement.ENDORSEMENT_NBR";
        }
        if (n.contains("endorsement_title") || n.contains("formname") || n.contains("title")) {
            return "endorsement.ENDORSEMENT_TITLE";
        }
        if (n.contains("effective_date") || n.contains("effectivedate")) {
            return "endorsement.EFFECTIVE_DATE";
        }
        if (n.contains("premium_delta") || n.contains("endorsementpremium") || n.contains("delta")) {
            return "endorsement.PREMIUM_DELTA";
        }
        if (n.contains("description") || n.contains("endorsement_desc")) {
            return "endorsement.DESCRIPTION";
        }
        if (n.contains("quote_nbr") || n.contains("quotenumber") || n.contains("policy_number")) {
            return "quote.QUOTE_NBR";
        }
        if (n.contains("quote_premium") || n.contains("total_premium") || n.contains("premium")) {
            return "quote.PREMIUM";
        }
        if (n.contains("named_insured") || n.contains("legal_name") || n.contains("insured")) {
            return "party.LEGAL_NAME";
        }
        if (n.contains("fein") || n.contains("tax_id")) {
            return "party.FEIN";
        }
        if (n.contains("state_code") || n.contains("state")) {
            return "quote.STATE_CODE";
        }
        if (n.contains("limit") || n.contains("coverage_limit")) {
            return "quote.LIMIT_AMT";
        }
        if (n.contains("retention") || n.contains("deductible")) {
            return "quote.RETENTION_AMT";
        }
        if (n.contains("product_code") || n.contains("lob")) {
            return "quote.PRODUCT_CODE";
        }
        return "custom";
    }

    private String deriveSampleValue(String name) {
        String n = name.toLowerCase();
        if (n.contains("nbr") || n.contains("number")) return "END-2026-0042";
        if (n.contains("date")) return "2026-10-27";
        if (n.contains("premium") || n.contains("delta") || n.contains("amount") || n.contains("amt")) return "$1,250.00";
        if (n.contains("name") || n.contains("insured")) return "Acme Logistics Holdings LLC";
        if (n.contains("state")) return "IL";
        if (n.contains("fein")) return "36-1234567";
        if (n.contains("limit")) return "$1,000,000";
        if (n.contains("deductible") || n.contains("retention")) return "$5,000";
        return "Sample " + name;
    }

    private static String extractMergeFieldName(String fieldCode) {
        if (fieldCode == null) return null;
        String trimmed = fieldCode.trim();
        if (trimmed.toUpperCase().startsWith("MERGEFIELD")) {
            String remainder = trimmed.substring("MERGEFIELD".length()).trim();
            if (remainder.startsWith("\"") && remainder.length() > 1) {
                int nextQuote = remainder.indexOf('"', 1);
                if (nextQuote != -1) {
                    return remainder.substring(1, nextQuote);
                }
            }
            int firstSpace = remainder.indexOf(' ');
            if (firstSpace != -1) {
                return remainder.substring(0, firstSpace);
            }
            return remainder;
        }
        return trimmed;
    }

    private record ExtractedField(String name, boolean isTable) {}

    private static class MustacheToMergeFieldCallback implements IReplacingCallback {
        private final Document doc;
        private final DocumentBuilder builder;

        public MustacheToMergeFieldCallback(Document doc) {
            this.doc = doc;
            this.builder = new DocumentBuilder(doc);
        }

        @Override
        public int replacing(ReplacingArgs args) throws Exception {
            Node matchNode = args.getMatchNode();
            String fullTag = args.getMatch().group();
            Matcher m = TAG_PATTERN.matcher(fullTag);
            if (!m.find()) return ReplaceAction.SKIP;

            String inner = m.group(1).trim();
            String fieldName;

            if (inner.startsWith("#")) {
                String tableName = inner.substring(1).trim();
                fieldName = "TableStart:" + tableName;
            } else if (inner.startsWith("/")) {
                String tableName = inner.substring(1).trim();
                fieldName = "TableEnd:" + tableName;
            } else {
                fieldName = inner;
            }

            builder.moveTo(matchNode);
            builder.insertField("MERGEFIELD \"" + fieldName + "\" \\* MERGEFORMAT", null);

            return ReplaceAction.REPLACE;
        }
    }
}
