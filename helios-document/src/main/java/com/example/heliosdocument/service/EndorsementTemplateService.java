package com.example.heliosdocument.service;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.sql.Date;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

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
import com.example.heliosdocument.model.EndorsementDefinitionDto;
import com.example.heliosdocument.model.TemplateFieldDto;
import com.example.heliosdocument.model.TemplateUploadRequestDTO;
import com.example.heliosdocument.model.TemplateVersionDto;
import com.example.heliosdocument.storage.StorageService;
import com.example.heliosdocument.storage.StoredFileMetadata;

@Service
public class EndorsementTemplateService {

    private static final Logger log = LoggerFactory.getLogger(EndorsementTemplateService.class);

    private static final Pattern TAG_PATTERN = Pattern.compile("\\{\\{([#\\/]?\\s*[a-zA-Z0-9_\\.]+)\\s*\\}\\}");

    private final DocumentService documentService;
    private final StorageService storageService;

    public EndorsementTemplateService(DocumentService documentService, StorageService storageService) {
        this.documentService = documentService;
        this.storageService = storageService;
    }

    private JdbcTemplate getJdbc(int tenantId) {
        return documentService.getTenantJdbcTemplate(tenantId);
    }

    private String resolveTenantCode(int tenantId) {
        return switch (tenantId) {
            case 2 -> "HELIOS_TST";
            case 3 -> "HELIOS3_TST";
            default -> "HELIOS2_TST";
        };
    }

    /**
     * Lists all endorsements in mstr.endorsement_definition along with their current active template.
     */
    public List<EndorsementDefinitionDto> listEndorsements(int tenantId) {
        JdbcTemplate jdbc = getJdbc(tenantId);
        ensureTablesExist(jdbc);

        String sql = """
            SELECT 
                e.ENDORSEMENT_ID,
                e.ENDORSEMENT_CODE,
                e.ENDORSEMENT_NAME,
                e.DESCRIPTION,
                e.LINE_OF_BUSINESS,
                e.IS_MANDATORY,
                e.CREATED_AT,
                e.UPDATED_AT,
                t.TEMPLATE_ID AS CURRENT_TEMPLATE_ID,
                t.VERSION_NUMBER AS CURRENT_VERSION_NUMBER,
                t.EDITION_DATE AS CURRENT_EDITION_DATE,
                t.STATUS AS CURRENT_STATUS,
                t.RELATIVE_PATH AS CURRENT_RELATIVE_PATH,
                t.OUTPUT_FORMAT AS CURRENT_OUTPUT_FORMAT
            FROM mstr.endorsement_definition e
            LEFT JOIN mstr.template_definition t ON e.ENDORSEMENT_ID = t.ENDORSEMENT_ID AND t.IS_CURRENT_VERSION = 1
            ORDER BY e.ENDORSEMENT_CODE ASC
        """;

        return jdbc.query(sql, (rs, rowNum) -> {
            String endId = rs.getString("ENDORSEMENT_ID");
            String code = rs.getString("ENDORSEMENT_CODE");
            String name = rs.getString("ENDORSEMENT_NAME");
            String desc = rs.getString("DESCRIPTION");
            String lob = rs.getString("LINE_OF_BUSINESS");
            boolean mandatory = rs.getBoolean("IS_MANDATORY");
            LocalDateTime created = rs.getTimestamp("CREATED_AT") != null ? rs.getTimestamp("CREATED_AT").toLocalDateTime() : null;
            LocalDateTime updated = rs.getTimestamp("UPDATED_AT") != null ? rs.getTimestamp("UPDATED_AT").toLocalDateTime() : null;

            String tplId = rs.getString("CURRENT_TEMPLATE_ID");
            int verNum = rs.getInt("CURRENT_VERSION_NUMBER");
            Integer currentVer = rs.wasNull() ? null : verNum;
            Date editionD = rs.getDate("CURRENT_EDITION_DATE");
            String editionDateStr = editionD != null ? editionD.toString() : null;
            String curStatus = rs.getString("CURRENT_STATUS");
            String curPath = rs.getString("CURRENT_RELATIVE_PATH");
            String curFmt = rs.getString("CURRENT_OUTPUT_FORMAT");

            return new EndorsementDefinitionDto(
                    endId,
                    code,
                    name,
                    desc,
                    lob,
                    mandatory,
                    created,
                    updated,
                    tplId,
                    currentVer,
                    editionDateStr,
                    curStatus,
                    curPath,
                    curFmt,
                    List.of()
            );
        });
    }

    /**
     * Retrieves full version history for a given endorsement.
     */
    public List<TemplateVersionDto> getEndorsementVersions(int tenantId, String endorsementId) {
        JdbcTemplate jdbc = getJdbc(tenantId);
        ensureTablesExist(jdbc);

        String sql = """
            SELECT 
                TEMPLATE_ID,
                ENDORSEMENT_ID,
                TEMPLATE_NAME,
                FILE_NAME,
                VERSION_NUMBER,
                EDITION_DATE,
                RELATIVE_PATH,
                FILE_SIZE_BYTES,
                SHA256_CHECKSUM,
                STATUS,
                EFFECTIVE_DATE,
                EXPIRATION_DATE,
                OUTPUT_FORMAT,
                IS_CURRENT_VERSION,
                CREATED_AT,
                UPDATED_AT
            FROM mstr.template_definition
            WHERE ENDORSEMENT_ID = ?
            ORDER BY VERSION_NUMBER DESC
        """;

        return jdbc.query(sql, (rs, rowNum) -> {
            Date edDate = rs.getDate("EDITION_DATE");
            Date effDate = rs.getDate("EFFECTIVE_DATE");
            Date expDate = rs.getDate("EXPIRATION_DATE");

            return new TemplateVersionDto(
                    rs.getString("TEMPLATE_ID"),
                    rs.getString("ENDORSEMENT_ID"),
                    rs.getString("TEMPLATE_NAME"),
                    rs.getString("FILE_NAME"),
                    rs.getInt("VERSION_NUMBER"),
                    edDate != null ? edDate.toLocalDate() : null,
                    rs.getString("RELATIVE_PATH"),
                    rs.getLong("FILE_SIZE_BYTES"),
                    rs.getString("SHA256_CHECKSUM"),
                    rs.getString("STATUS"),
                    effDate != null ? effDate.toLocalDate() : null,
                    expDate != null ? expDate.toLocalDate() : null,
                    rs.getString("OUTPUT_FORMAT"),
                    rs.getBoolean("IS_CURRENT_VERSION"),
                    rs.getTimestamp("CREATED_AT") != null ? rs.getTimestamp("CREATED_AT").toLocalDateTime() : null,
                    rs.getTimestamp("UPDATED_AT") != null ? rs.getTimestamp("UPDATED_AT").toLocalDateTime() : null
            );
        }, endorsementId);
    }

    /**
     * Uploads and versions a template:
     * - Ingests Word .docx, converting {{tag}} to MERGEFIELDs
     * - Saves binary to StorageService
     * - Manages Endorsement record (new or existing)
     * - Version calculation & prior version superseding
     * - Compensating rollback: deletes file from disk/UNC share on database error
     */
    @Transactional
    public TemplateVersionDto uploadAndVersionTemplate(int tenantId, TemplateUploadRequestDTO request) throws Exception {
        MultipartFile file = request.getFile();
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Upload file cannot be null or empty.");
        }

        String fileName = file.getOriginalFilename();
        if (fileName == null || fileName.isBlank()) {
            fileName = "template.docx";
        }

        byte[] rawBytes = file.getBytes();

        // 1. Aspose.Words Ingestion: Convert mustache tags {{tag}} to MERGEFIELDs
        Document doc;
        try (InputStream in = new ByteArrayInputStream(rawBytes)) {
            doc = new Document(in);
        }
        migrateLegacyTagsToMergeFields(doc);

        List<ExtractedField> extractedFields = extractFields(doc);

        byte[] sanitizedBytes;
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            doc.save(out, SaveFormat.DOCX);
            sanitizedBytes = out.toByteArray();
        }

        // 2. Stream physical file to StorageService
        String tenantCode = resolveTenantCode(tenantId);
        StoredFileMetadata fileMeta = storageService.store(tenantId, tenantCode, "templates", fileName, sanitizedBytes);
        String relativePath = fileMeta.relativePath();
        log.info("Persisted template file to StorageService at: {}", relativePath);

        // 3. Database persistence with transactional rollback & file cleanup guard
        JdbcTemplate jdbc = getJdbc(tenantId);
        ensureTablesExist(jdbc);

        try {
            String endorsementIdStr = request.getEndorsementId();
            String mode = request.getMode() != null ? request.getMode().trim().toUpperCase() : "NEW_ENDORSEMENT";
            String lob = request.getLineOfBusiness() != null && !request.getLineOfBusiness().isBlank()
                    ? request.getLineOfBusiness().trim() : "General Liability";

            String templateName = request.getTemplateName();
            if (templateName == null || templateName.isBlank()) {
                templateName = request.getEndorsementName() != null && !request.getEndorsementName().isBlank()
                        ? request.getEndorsementName() : fileName.replaceFirst("\\.docx$", "");
            }

            LocalDate editionDate = parseDateOrFallback(request.getEditionDate(), LocalDate.now());
            LocalDate effectiveDate = parseDateOrFallback(request.getEffectiveDate(), LocalDate.now());
            LocalDate expirationDate = (request.getExpirationDate() != null && !request.getExpirationDate().isBlank())
                    ? LocalDate.parse(request.getExpirationDate()) : null;
            String outputFormat = request.getOutputFormat() != null && !request.getOutputFormat().isBlank()
                    ? request.getOutputFormat().toUpperCase() : "PDF";

            int nextVersion = 1;

            if ("EXISTING_ENDORSEMENT".equals(mode)) {
                if (endorsementIdStr == null || endorsementIdStr.isBlank()) {
                    throw new IllegalArgumentException("endorsementId is required when mode is EXISTING_ENDORSEMENT.");
                }

                // Verify endorsement exists
                Integer exists = jdbc.queryForObject(
                        "SELECT COUNT(*) FROM mstr.endorsement_definition WHERE ENDORSEMENT_ID = ?",
                        Integer.class,
                        endorsementIdStr
                );
                if (exists == null || exists == 0) {
                    throw new IllegalArgumentException("Target endorsement ID " + endorsementIdStr + " does not exist.");
                }

                // Determine next version number
                Integer currentMax = jdbc.queryForObject(
                        "SELECT MAX(VERSION_NUMBER) FROM mstr.template_definition WHERE ENDORSEMENT_ID = ?",
                        Integer.class,
                        endorsementIdStr
                );
                nextVersion = (currentMax != null && currentMax > 0) ? currentMax + 1 : 1;

                // Supersede prior current version(s)
                jdbc.update("""
                    UPDATE mstr.template_definition
                    SET IS_CURRENT_VERSION = 0,
                        STATUS = 'SUPERSEDED',
                        UPDATED_AT = GETDATE()
                    WHERE ENDORSEMENT_ID = ? AND IS_CURRENT_VERSION = 1
                """, endorsementIdStr);

                log.info("Superseded prior versions for endorsement {}. New version will be {}", endorsementIdStr, nextVersion);
            } else {
                // NEW_ENDORSEMENT mode
                UUID newEndId = UUID.randomUUID();
                endorsementIdStr = newEndId.toString();

                String code = request.getEndorsementCode();
                if (code == null || code.isBlank()) {
                    code = "END-" + (int)(Math.random() * 9000 + 1000);
                }
                String name = request.getEndorsementName();
                if (name == null || name.isBlank()) {
                    name = templateName;
                }
                String desc = request.getDescription();

                jdbc.update("""
                    INSERT INTO mstr.endorsement_definition 
                    (ENDORSEMENT_ID, ENDORSEMENT_CODE, ENDORSEMENT_NAME, DESCRIPTION, LINE_OF_BUSINESS, IS_MANDATORY, CREATED_AT, UPDATED_AT)
                    VALUES (?, ?, ?, ?, ?, 0, GETDATE(), GETDATE())
                """, endorsementIdStr, code.trim(), name.trim(), desc, lob);

                log.info("Created new endorsement definition {} [{}]", endorsementIdStr, code);
            }

            // Insert new template version into mstr.template_definition
            UUID templateId = UUID.randomUUID();
            String templateIdStr = templateId.toString();

            jdbc.update("""
                INSERT INTO mstr.template_definition
                (TEMPLATE_ID, ENDORSEMENT_ID, TEMPLATE_NAME, FILE_NAME, VERSION_NUMBER, EDITION_DATE,
                 RELATIVE_PATH, FILE_SIZE_BYTES, SHA256_CHECKSUM, STATUS, EFFECTIVE_DATE, EXPIRATION_DATE,
                 OUTPUT_FORMAT, IS_CURRENT_VERSION, CREATED_AT, UPDATED_AT)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?, ?, 1, GETDATE(), GETDATE())
            """,
                    templateIdStr,
                    endorsementIdStr,
                    templateName,
                    fileName,
                    nextVersion,
                    Date.valueOf(editionDate),
                    relativePath,
                    fileMeta.fileSizeBytes(),
                    fileMeta.sha256Checksum(),
                    Date.valueOf(effectiveDate),
                    expirationDate != null ? Date.valueOf(expirationDate) : null,
                    outputFormat
            );

            // Backwards-compatibility bridge: also sync to legacy dbo.DOCUMENT_TEMPLATES & dbo.TEMPLATE_FIELDS
            syncToLegacyDocumentTemplates(jdbc, endorsementIdStr, templateName, fileName, relativePath,
                    fileMeta.fileSizeBytes(), fileMeta.sha256Checksum(), editionDate.toString(), nextVersion, extractedFields);

            return new TemplateVersionDto(
                    templateIdStr,
                    endorsementIdStr,
                    templateName,
                    fileName,
                    nextVersion,
                    editionDate,
                    relativePath,
                    fileMeta.fileSizeBytes(),
                    fileMeta.sha256Checksum(),
                    "ACTIVE",
                    effectiveDate,
                    expirationDate,
                    outputFormat,
                    true,
                    LocalDateTime.now(),
                    LocalDateTime.now()
            );

        } catch (Exception dbEx) {
            log.error("Database persistence failed during template upload. Performing compensating file rollback for: {}", relativePath, dbEx);
            try {
                storageService.delete(relativePath);
                log.info("Compensating rollback deleted orphan file: {}", relativePath);
            } catch (Exception cleanEx) {
                log.warn("Failed to delete orphan file {} during rollback: {}", relativePath, cleanEx.getMessage());
            }
            throw dbEx;
        }
    }

    /**
     * Resolves and downloads physical .docx bytes for a specific template version.
     */
    public DownloadResult downloadTemplateVersion(int tenantId, String templateId) {
        JdbcTemplate jdbc = getJdbc(tenantId);
        ensureTablesExist(jdbc);

        String sql = "SELECT TEMPLATE_ID, FILE_NAME, RELATIVE_PATH FROM mstr.template_definition WHERE TEMPLATE_ID = ?";
        List<Map<String, Object>> rows = jdbc.queryForList(sql, templateId);

        String relPath = null;
        String fileName = "template.docx";

        if (!rows.isEmpty()) {
            relPath = (String) rows.get(0).get("RELATIVE_PATH");
            fileName = (String) rows.get(0).get("FILE_NAME");
        } else {
            // Fallback check legacy dbo.DOCUMENT_TEMPLATES
            List<Map<String, Object>> legacyRows = jdbc.queryForList(
                    "SELECT TEMPLATE_ID, FILE_NAME, RELATIVE_PATH FROM dbo.DOCUMENT_TEMPLATES WHERE TEMPLATE_ID = ?", templateId);
            if (!legacyRows.isEmpty()) {
                relPath = (String) legacyRows.get(0).get("RELATIVE_PATH");
                fileName = (String) legacyRows.get(0).get("FILE_NAME");
            }
        }

        if (relPath == null || relPath.isBlank() || !storageService.exists(relPath)) {
            throw new IllegalStateException("Physical file for template " + templateId + " not found at storage path: " + relPath);
        }

        byte[] bytes = storageService.loadAsBytes(relPath);
        return new DownloadResult(fileName, bytes);
    }

    public record DownloadResult(String fileName, byte[] data) {}

    private void syncToLegacyDocumentTemplates(
            JdbcTemplate jdbc,
            String endorsementIdStr,
            String templateName,
            String fileName,
            String relativePath,
            long fileSizeBytes,
            String sha256Checksum,
            String editionDateStr,
            int versionNumber,
            List<ExtractedField> extractedFields
    ) {
        try {
            // Add columns if missing
            String alterDdl = """
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
                    ALTER TABLE dbo.DOCUMENT_TEMPLATES ADD APPROVAL_STATUS VARCHAR(50) NOT NULL CONSTRAINT DF_doc_tpl_appr DEFAULT 'APPROVED';
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.TEMPLATE_FIELDS') AND name = 'FIELD_ORDER')
                    ALTER TABLE dbo.TEMPLATE_FIELDS ADD FIELD_ORDER INT NULL DEFAULT 0;
            """;
            jdbc.execute(alterDdl);

            String insertLegacySql = """
                INSERT INTO dbo.DOCUMENT_TEMPLATES 
                (TEMPLATE_NAME, FILE_NAME, MIME_TYPE, RELATIVE_PATH, FILE_SIZE_BYTES, SHA256_CHECKSUM,
                 FORM_NUMBER, EDITION_DATE, APPROVAL_STATUS, FILE_DATA, DESCRIPTION, VERSION, IS_ACTIVE, CREATED_BY, CREATED_AT, UPDATED_AT)
                VALUES (?, ?, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', ?, ?, ?, ?, ?, 'APPROVED', NULL, ?, ?, 1, 'ADMIN', GETDATE(), GETDATE())
            """;

            KeyHolder kh = new GeneratedKeyHolder();
            jdbc.update(con -> {
                PreparedStatement ps = con.prepareStatement(insertLegacySql, Statement.RETURN_GENERATED_KEYS);
                ps.setString(1, templateName);
                ps.setString(2, fileName);
                ps.setString(3, relativePath);
                ps.setLong(4, fileSizeBytes);
                ps.setString(5, sha256Checksum);
                ps.setString(6, templateName.replaceAll("[^a-zA-Z0-9-]", "_").toUpperCase());
                ps.setString(7, editionDateStr);
                ps.setString(8, "Word Document Template for Endorsements");
                ps.setInt(9, versionNumber);
                return ps;
            }, kh);

            Number genId = kh.getKey();
            if (genId != null) {
                int legacyTplId = genId.intValue();
                String insertFieldSql = """
                    INSERT INTO dbo.TEMPLATE_FIELDS 
                    (TEMPLATE_ID, FIELD_NAME, IS_TABLE_REGION, DATA_MAPPING_PATH, SAMPLE_PREVIEW_VALUE, FIELD_ORDER, CREATED_AT, UPDATED_AT)
                    VALUES (?, ?, ?, ?, ?, ?, GETDATE(), GETDATE())
                """;

                int orderIdx = 1;
                for (ExtractedField ef : extractedFields) {
                    jdbc.update(insertFieldSql, legacyTplId, ef.name, ef.isTable ? 1 : 0,
                            deriveDefaultMapping(ef.name), deriveSampleValue(ef.name), orderIdx++);
                }
            }
        } catch (Exception e) {
            log.warn("Legacy DOCUMENT_TEMPLATES sync non-fatal error: {}", e.getMessage());
        }
    }

    private void ensureTablesExist(JdbcTemplate jdbc) {
        try {
            String ddl = """
                IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'mstr') EXEC('CREATE SCHEMA [mstr]');
                IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'ref') EXEC('CREATE SCHEMA [ref]');
                IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'ops') EXEC('CREATE SCHEMA [ops]');

                IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'endorsement_definition' AND schema_id = SCHEMA_ID('mstr'))
                BEGIN
                    CREATE TABLE mstr.endorsement_definition (
                        ENDORSEMENT_ID UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_mstr_end_id DEFAULT NEWID(),
                        ENDORSEMENT_CODE VARCHAR(50) NOT NULL,
                        ENDORSEMENT_NAME NVARCHAR(200) NOT NULL,
                        DESCRIPTION NVARCHAR(MAX) NULL,
                        LINE_OF_BUSINESS VARCHAR(50) NOT NULL,
                        IS_MANDATORY BIT NOT NULL CONSTRAINT DF_mstr_end_mandatory DEFAULT 0,
                        CREATED_AT DATETIME2 NOT NULL CONSTRAINT DF_mstr_end_created DEFAULT GETDATE(),
                        UPDATED_AT DATETIME2 NOT NULL CONSTRAINT DF_mstr_end_updated DEFAULT GETDATE(),
                        CONSTRAINT PK_mstr_endorsement_definition PRIMARY KEY CLUSTERED (ENDORSEMENT_ID),
                        CONSTRAINT UQ_mstr_endorsement_code UNIQUE (ENDORSEMENT_CODE)
                    );
                END

                IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'template_definition' AND schema_id = SCHEMA_ID('mstr'))
                BEGIN
                    CREATE TABLE mstr.template_definition (
                        TEMPLATE_ID UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_mstr_tpl_id DEFAULT NEWID(),
                        ENDORSEMENT_ID UNIQUEIDENTIFIER NOT NULL,
                        TEMPLATE_NAME NVARCHAR(200) NOT NULL,
                        FILE_NAME NVARCHAR(255) NOT NULL,
                        VERSION_NUMBER INT NOT NULL CONSTRAINT DF_mstr_tpl_ver DEFAULT 1,
                        EDITION_DATE DATE NOT NULL,
                        RELATIVE_PATH VARCHAR(500) NOT NULL,
                        FILE_SIZE_BYTES BIGINT NOT NULL CONSTRAINT DF_mstr_tpl_size DEFAULT 0,
                        SHA256_CHECKSUM CHAR(64) NOT NULL,
                        STATUS VARCHAR(30) NOT NULL CONSTRAINT DF_mstr_tpl_status DEFAULT 'ACTIVE',
                        EFFECTIVE_DATE DATE NOT NULL,
                        EXPIRATION_DATE DATE NULL,
                        OUTPUT_FORMAT VARCHAR(20) NOT NULL CONSTRAINT DF_mstr_tpl_fmt DEFAULT 'PDF',
                        IS_CURRENT_VERSION BIT NOT NULL CONSTRAINT DF_mstr_tpl_current DEFAULT 1,
                        CREATED_AT DATETIME2 NOT NULL CONSTRAINT DF_mstr_tpl_created DEFAULT GETDATE(),
                        UPDATED_AT DATETIME2 NOT NULL CONSTRAINT DF_mstr_tpl_updated DEFAULT GETDATE(),
                        CONSTRAINT PK_mstr_template_definition PRIMARY KEY CLUSTERED (TEMPLATE_ID),
                        CONSTRAINT FK_mstr_tpl_endorsement FOREIGN KEY (ENDORSEMENT_ID) 
                            REFERENCES mstr.endorsement_definition (ENDORSEMENT_ID) ON DELETE CASCADE
                    );
                END

                IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'endorsement_cache' AND schema_id = SCHEMA_ID('ref'))
                BEGIN
                    CREATE TABLE ref.endorsement_cache (
                        ENDORSEMENT_ID UNIQUEIDENTIFIER NOT NULL,
                        ENDORSEMENT_CODE VARCHAR(50) NOT NULL,
                        ENDORSEMENT_NAME NVARCHAR(200) NOT NULL,
                        DESCRIPTION NVARCHAR(MAX) NULL,
                        LINE_OF_BUSINESS VARCHAR(50) NOT NULL,
                        IS_MANDATORY BIT NOT NULL,
                        TEMPLATE_ID UNIQUEIDENTIFIER NULL,
                        TEMPLATE_NAME NVARCHAR(200) NULL,
                        VERSION_NUMBER INT NULL,
                        EDITION_DATE DATE NULL,
                        RELATIVE_PATH VARCHAR(500) NULL,
                        SHA256_CHECKSUM CHAR(64) NULL,
                        STATUS VARCHAR(30) NULL,
                        OUTPUT_FORMAT VARCHAR(20) NULL,
                        EFFECTIVE_DATE DATE NULL,
                        EXPIRATION_DATE DATE NULL,
                        LAST_SYNCED_AT DATETIME2 NOT NULL CONSTRAINT DF_ref_end_sync DEFAULT GETDATE(),
                        SYNC_BATCH_ID VARCHAR(50) NOT NULL,
                        CONSTRAINT PK_ref_endorsement_cache PRIMARY KEY CLUSTERED (ENDORSEMENT_ID)
                    );
                END
            """;
            jdbc.execute(ddl);
        } catch (Exception e) {
            log.warn("Auto-ensuring tables exist notice: {}", e.getMessage());
        }
    }

    private LocalDate parseDateOrFallback(String dateStr, LocalDate fallback) {
        if (dateStr == null || dateStr.isBlank()) return fallback;
        try {
            if (dateStr.length() == 7) { // "2026-10"
                return LocalDate.parse(dateStr + "-01");
            }
            return LocalDate.parse(dateStr);
        } catch (Exception e) {
            return fallback;
        }
    }

    private void migrateLegacyTagsToMergeFields(Document doc) throws Exception {
        FindReplaceOptions options = new FindReplaceOptions();
        options.setReplacingCallback(new MustacheToMergeFieldCallback(doc));
        doc.getRange().replace(TAG_PATTERN, "", options);
    }

    private List<ExtractedField> extractFields(Document doc) throws Exception {
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

        return extractedList;
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

    private String deriveDefaultMapping(String name) {
        String n = name.toLowerCase();
        if (n.contains("endorsement_nbr") || n.contains("endorsementnbr") || n.equals("form_number") || n.equals("endorsement_number"))
            return "endorsement.ENDORSEMENT_NBR";
        if (n.contains("endorsement_title") || n.contains("endorsementtitle") || n.equals("form_title") || n.equals("title"))
            return "endorsement.ENDORSEMENT_TITLE";
        if (n.contains("effective_date") || n.contains("effectivedate"))
            return "endorsement.EFFECTIVE_DATE";
        if (n.contains("premium_delta") || n.contains("premiumdelta") || n.contains("delta_premium"))
            return "endorsement.PREMIUM_DELTA";
        if (n.contains("description") || n.contains("endorsement_desc"))
            return "endorsement.DESCRIPTION";
        if (n.contains("quote_nbr") || n.contains("quotenbr") || n.contains("policy_nbr") || n.contains("policynbr"))
            return "quote.QUOTE_NBR";
        if (n.contains("total_premium") || n.contains("quote_premium") || n.equals("premium"))
            return "quote.PREMIUM";
        if (n.contains("state_code") || n.contains("statecode") || n.equals("state"))
            return "quote.STATE_CODE";
        if (n.contains("limit_amt") || n.contains("policy_limit") || n.contains("limit"))
            return "quote.LIMIT_AMT";
        if (n.contains("retention_amt") || n.contains("deductible"))
            return "quote.RETENTION_AMT";
        if (n.contains("named_insured") || n.contains("insured_name") || n.contains("legal_name") || n.contains("party_name"))
            return "party.LEGAL_NAME";
        if (n.contains("fein") || n.contains("tax_id"))
            return "party.FEIN";

        return "endorsement." + name.toUpperCase();
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

            String innerContent = m.group(1).trim();
            builder.moveTo(matchNode);

            if (innerContent.startsWith("#")) {
                String tableName = innerContent.substring(1).trim();
                builder.insertField("MERGEFIELD TableStart:" + tableName + " \\* MERGEFORMAT", "«TableStart:" + tableName + "»");
            } else if (innerContent.startsWith("/")) {
                String tableName = innerContent.substring(1).trim();
                builder.insertField("MERGEFIELD TableEnd:" + tableName + " \\* MERGEFORMAT", "«TableEnd:" + tableName + "»");
            } else {
                builder.insertField("MERGEFIELD " + innerContent + " \\* MERGEFORMAT", "«" + innerContent + "»");
            }

            return ReplaceAction.REPLACE;
        }
    }
}
