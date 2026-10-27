package com.example.heliosdocument.service;

import java.io.IOException;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

import javax.sql.DataSource;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.example.heliosdocument.client.DocgenClient;
import com.example.heliosdocument.model.DocumentDto;
import com.example.heliosdocument.model.GenerateDocumentRequest;
import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;

@Service
public class DocumentService {

    private static final Logger log = LoggerFactory.getLogger(DocumentService.class);

    private final DocgenClient docgenClient;
    private final DocumentStorageService storageService;
    private final Map<Integer, JdbcTemplate> tenantTemplates = new ConcurrentHashMap<>();

    @Value("${spring.datasource.url}")
    private String masterDbUrl;

    public DocumentService(DocgenClient docgenClient, DocumentStorageService storageService) {
        this.docgenClient = docgenClient;
        this.storageService = storageService;
    }

    public JdbcTemplate getTenantJdbcTemplate(int tenantId) {
        return tenantTemplates.computeIfAbsent(tenantId, id -> {
            String catalog = (id == 2) ? "HELIOS_TST" : "HELIOS2_TST";
            String jdbcUrl = "jdbc:sqlserver://dbtst.ad.ortaleza.com:1433;databaseName=" + catalog
                    + ";integratedSecurity=true;encrypt=false;trustServerCertificate=true;sendStringParametersAsUnicode=false";
            HikariConfig config = new HikariConfig();
            config.setPoolName("HeliosDocument-TenantPool-" + id);
            config.setDriverClassName("com.microsoft.sqlserver.jdbc.SQLServerDriver");
            config.setJdbcUrl(jdbcUrl);
            config.setMaximumPoolSize(5);
            config.setMinimumIdle(1);
            config.setConnectionTimeout(10000);
            config.setIdleTimeout(30000);
            config.setMaxLifetime(1800000);
            HikariDataSource ds = new HikariDataSource(config);
            log.info("Initialized Hikari JDBC Template for Tenant #{} -> {}", id, catalog);
            return new JdbcTemplate(ds);
        });
    }

    public DocumentDto generateAndSave(GenerateDocumentRequest req) {
        int tenantId = (req.tenantId() != null && req.tenantId() > 0) ? req.tenantId() : 1;
        String entityType = (req.entityType() != null) ? req.entityType().toUpperCase().trim() : "POLICY";
        int entityId = (req.entityId() != null) ? req.entityId() : 1;
        String docType = (req.docType() != null) ? req.docType().toUpperCase().trim() : "DEC_PAGE";

        String entityNbr = (req.entityNbr() != null && !req.entityNbr().isBlank())
                ? req.entityNbr().trim()
                : (entityType.equalsIgnoreCase("POLICY") ? "POL-2026-" + entityId : "SUB-" + entityId);

        String docTitle = (req.docTitle() != null && !req.docTitle().isBlank())
                ? req.docTitle().trim()
                : switch (docType) {
                    case "QUOTE_PROPOSAL", "QUOTE" -> "Quote Proposal — " + entityNbr + " (" + req.insuredName() + ")";
                    case "BINDER_LETTER", "LETTER" -> "Insurance Coverage Binder Confirmation — " + entityNbr;
                    default -> "Policy Declarations Schedule — " + entityNbr + " (" + req.insuredName() + ")";
                };

        GenerateDocumentRequest effectiveReq = enrichWithRatedQuoteDataIfMissing(tenantId, req);

        // 1. Delegate PDF generation strictly to DocGen microservice
        DocgenClient.GeneratedDocumentResult generated = docgenClient.generate(effectiveReq);

        // 2. Determine File Name
        String timestamp = LocalDate.now().toString().replace("-", "");
        String fileName = switch (docType) {
            case "QUOTE_PROPOSAL", "QUOTE" -> "QUOTE_" + entityNbr.replace(" ", "_") + "_" + timestamp + ".pdf";
            case "BINDER_LETTER", "LETTER" -> "BINDER_" + entityNbr.replace(" ", "_") + "_" + timestamp + ".pdf";
            default -> "DEC_" + entityNbr.replace(" ", "_") + "_" + timestamp + ".pdf";
        };

        // 3. Store on disk via Storage Service
        Path storedPath;
        try {
            storedPath = storageService.storeDocument(tenantId, entityType, entityId, fileName, generated.content());
        } catch (IOException e) {
            throw new RuntimeException("Failed to persist document to storage: " + e.getMessage(), e);
        }

        // 4. Record metadata in dbo.DOC_DOCUMENT
        JdbcTemplate jdbc = getTenantJdbcTemplate(tenantId);
        KeyHolder kh = new GeneratedKeyHolder();
        String sql = """
                INSERT INTO dbo.DOC_DOCUMENT (
                    TENANT_ID, ENTITY_TYPE, ENTITY_ID, ENTITY_NBR, DOC_TYPE,
                    DOC_TITLE, FILE_NAME, FILE_PATH, FILE_SIZE_BYTES, MIME_TYPE,
                    PAGE_COUNT, STATUS, GENERATED_BY
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ISSUED', 'DOCGEN_SERVICE')
                """;

        jdbc.update(con -> {
            PreparedStatement ps = con.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS);
            ps.setInt(1, tenantId);
            ps.setString(2, entityType);
            ps.setInt(3, entityId);
            ps.setString(4, entityNbr);
            ps.setString(5, docType);
            ps.setString(6, docTitle);
            ps.setString(7, fileName);
            ps.setString(8, storedPath.toString());
            ps.setLong(9, (long) generated.content().length);
            ps.setString(10, "application/pdf");
            ps.setInt(11, generated.pageCount());
            return ps;
        }, kh);

        int newDocId = (kh.getKey() != null) ? kh.getKey().intValue() : 0;
        log.info("Recorded document record in DB: ID={}, File={}", newDocId, fileName);

        return new DocumentDto(
                newDocId,
                tenantId,
                entityType,
                entityId,
                entityNbr,
                docType,
                docTitle,
                fileName,
                storedPath.toString(),
                (long) generated.content().length,
                "application/pdf",
                generated.pageCount(),
                "ISSUED",
                "DOCGEN_SERVICE",
                LocalDate.now().toString()
        );
    }

    public DocumentDto uploadAndSave(
            int tenantId,
            String entityType,
            int entityId,
            String entityNbr,
            String docType,
            String docTitle,
            String uploadedBy,
            MultipartFile file) throws IOException {

        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Cannot upload empty file");
        }

        String safeEntityType = (entityType != null && !entityType.isBlank())
                ? entityType.toUpperCase().trim()
                : "POLICY";

        String effectiveEntityNbr = (entityNbr != null && !entityNbr.isBlank())
                ? entityNbr.trim()
                : (safeEntityType.equalsIgnoreCase("POLICY") ? "POL-2026-" + entityId : "SUB-" + entityId);

        String effectiveDocType = (docType != null && !docType.isBlank())
                ? docType.toUpperCase().trim()
                : "OTHER";

        String rawFileName = file.getOriginalFilename();
        final String effectiveFileName = (rawFileName == null || rawFileName.isBlank())
                ? "uploaded_file_" + System.currentTimeMillis()
                : Paths.get(rawFileName).getFileName().toString();

        final String effectiveTitle = (docTitle != null && !docTitle.isBlank())
                ? docTitle.trim()
                : effectiveFileName;

        byte[] bytes = file.getBytes();
        long fileSize = file.getSize();
        String rawMimeType = file.getContentType();
        final String effectiveMimeType;
        if (rawMimeType == null || rawMimeType.isBlank()) {
            String lower = effectiveFileName.toLowerCase();
            if (lower.endsWith(".pdf")) {
                effectiveMimeType = "application/pdf";
            } else if (lower.endsWith(".png")) {
                effectiveMimeType = "image/png";
            } else if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) {
                effectiveMimeType = "image/jpeg";
            } else if (lower.endsWith(".docx") || lower.endsWith(".doc")) {
                effectiveMimeType = "application/msword";
            } else if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
                effectiveMimeType = "application/vnd.ms-excel";
            } else {
                effectiveMimeType = "application/octet-stream";
            }
        } else {
            effectiveMimeType = rawMimeType;
        }

        Path storedPath = storageService.storeUploadedDocument(tenantId, effectiveFileName, bytes);
        final String finalFileName = storedPath.getFileName().toString();

        JdbcTemplate jdbc = getTenantJdbcTemplate(tenantId);
        KeyHolder kh = new GeneratedKeyHolder();
        String sql = """
                INSERT INTO dbo.DOC_DOCUMENT (
                    TENANT_ID, ENTITY_TYPE, ENTITY_ID, ENTITY_NBR, DOC_TYPE,
                    DOC_TITLE, FILE_NAME, FILE_PATH, FILE_SIZE_BYTES, MIME_TYPE,
                    PAGE_COUNT, STATUS, GENERATED_BY
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'ACTIVE', ?)
                """;

        String effectiveUploadedBy = (uploadedBy != null && !uploadedBy.isBlank()) ? uploadedBy.trim() : "CLIENT_UPLOAD";

        jdbc.update(con -> {
            PreparedStatement ps = con.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS);
            ps.setInt(1, tenantId);
            ps.setString(2, safeEntityType);
            ps.setInt(3, entityId);
            ps.setString(4, effectiveEntityNbr);
            ps.setString(5, effectiveDocType);
            ps.setString(6, effectiveTitle);
            ps.setString(7, finalFileName);
            ps.setString(8, storedPath.toString());
            ps.setLong(9, fileSize);
            ps.setString(10, effectiveMimeType);
            ps.setString(11, effectiveUploadedBy);
            return ps;
        }, kh);

        int newDocId = (kh.getKey() != null) ? kh.getKey().intValue() : 0;
        log.info("Recorded client uploaded document in DB: ID={}, File={}, Entity={}/{}", newDocId, finalFileName, safeEntityType, entityId);

        return new DocumentDto(
                newDocId,
                tenantId,
                safeEntityType,
                entityId,
                effectiveEntityNbr,
                effectiveDocType,
                effectiveTitle,
                finalFileName,
                storedPath.toString(),
                fileSize,
                effectiveMimeType,
                1,
                "ACTIVE",
                effectiveUploadedBy,
                LocalDate.now().toString()
        );
    }

    public List<DocumentDto> getDocuments(int tenantId, String entityType, Integer entityId, String docType) {
        return getDocuments(tenantId, entityType, entityId, null, docType);
    }

    public List<DocumentDto> getDocuments(int tenantId, String entityType, Integer entityId, String entityNbr, String docType) {
        JdbcTemplate jdbc = getTenantJdbcTemplate(tenantId);
        StringBuilder sql = new StringBuilder("""
                SELECT DOCUMENT_ID, TENANT_ID, ENTITY_TYPE, ENTITY_ID, ENTITY_NBR,
                       DOC_TYPE, DOC_TITLE, FILE_NAME, FILE_PATH, FILE_SIZE_BYTES,
                       MIME_TYPE, PAGE_COUNT, STATUS, GENERATED_BY,
                       CONVERT(VARCHAR(20), CREATED_DT, 120) AS CREATED_DT
                FROM dbo.DOC_DOCUMENT
                WHERE TENANT_ID = ? AND STATUS <> 'DELETED'
                """);

        List<Object> params = new ArrayList<>();
        params.add(tenantId);

        if (entityType != null && !entityType.isBlank()) {
            sql.append(" AND LOWER(ENTITY_TYPE) = LOWER(?)");
            params.add(entityType.trim());
        }
        if (entityId != null && entityId > 0 && entityNbr != null && !entityNbr.isBlank()) {
            sql.append(" AND (ENTITY_ID = ? OR LOWER(ENTITY_NBR) = LOWER(?))");
            params.add(entityId);
            params.add(entityNbr.trim());
        } else if (entityId != null && entityId > 0) {
            sql.append(" AND ENTITY_ID = ?");
            params.add(entityId);
        } else if (entityNbr != null && !entityNbr.isBlank()) {
            sql.append(" AND LOWER(ENTITY_NBR) = LOWER(?)");
            params.add(entityNbr.trim());
        }
        if (docType != null && !docType.isBlank()) {
            sql.append(" AND LOWER(DOC_TYPE) = LOWER(?)");
            params.add(docType.trim());
        }

        sql.append(" ORDER BY DOCUMENT_ID DESC");

        return jdbc.query(sql.toString(), (rs, rowNum) -> new DocumentDto(
                rs.getInt("DOCUMENT_ID"),
                rs.getInt("TENANT_ID"),
                rs.getString("ENTITY_TYPE"),
                rs.getInt("ENTITY_ID"),
                rs.getString("ENTITY_NBR"),
                rs.getString("DOC_TYPE"),
                rs.getString("DOC_TITLE"),
                rs.getString("FILE_NAME"),
                rs.getString("FILE_PATH"),
                rs.getLong("FILE_SIZE_BYTES"),
                rs.getString("MIME_TYPE"),
                rs.getInt("PAGE_COUNT"),
                rs.getString("STATUS"),
                rs.getString("GENERATED_BY"),
                rs.getString("CREATED_DT")
        ), params.toArray());
    }

    public Optional<DocumentDto> getDocumentById(int tenantId, int docId) {
        JdbcTemplate jdbc = getTenantJdbcTemplate(tenantId);
        String sql = """
                SELECT DOCUMENT_ID, TENANT_ID, ENTITY_TYPE, ENTITY_ID, ENTITY_NBR,
                       DOC_TYPE, DOC_TITLE, FILE_NAME, FILE_PATH, FILE_SIZE_BYTES,
                       MIME_TYPE, PAGE_COUNT, STATUS, GENERATED_BY,
                       CONVERT(VARCHAR(20), CREATED_DT, 120) AS CREATED_DT
                FROM dbo.DOC_DOCUMENT
                WHERE DOCUMENT_ID = ? AND TENANT_ID = ?
                """;
        List<DocumentDto> list = jdbc.query(sql, (rs, rowNum) -> new DocumentDto(
                rs.getInt("DOCUMENT_ID"),
                rs.getInt("TENANT_ID"),
                rs.getString("ENTITY_TYPE"),
                rs.getInt("ENTITY_ID"),
                rs.getString("ENTITY_NBR"),
                rs.getString("DOC_TYPE"),
                rs.getString("DOC_TITLE"),
                rs.getString("FILE_NAME"),
                rs.getString("FILE_PATH"),
                rs.getLong("FILE_SIZE_BYTES"),
                rs.getString("MIME_TYPE"),
                rs.getInt("PAGE_COUNT"),
                rs.getString("STATUS"),
                rs.getString("GENERATED_BY"),
                rs.getString("CREATED_DT")
        ), docId, tenantId);

        return list.stream().findFirst();
    }

    public boolean deleteDocument(int tenantId, int docId) {
        JdbcTemplate jdbc = getTenantJdbcTemplate(tenantId);
        int rows = jdbc.update("UPDATE dbo.DOC_DOCUMENT SET STATUS = 'DELETED' WHERE DOCUMENT_ID = ? AND TENANT_ID = ?", docId, tenantId);
        return rows > 0;
    }

    private GenerateDocumentRequest enrichWithRatedQuoteDataIfMissing(int tenantId, GenerateDocumentRequest req) {
        boolean hasValidPrem = req.premiumAmount() != null
                && !req.premiumAmount().trim().isBlank()
                && !req.premiumAmount().trim().equals("$0")
                && !req.premiumAmount().trim().equals("$0.00")
                && !req.premiumAmount().trim().equals("0");

        if (hasValidPrem && req.calculationTrace() != null && !req.calculationTrace().isEmpty()) {
            return req;
        }

        try {
            JdbcTemplate jdbc = getTenantJdbcTemplate(tenantId);
            String entityType = (req.entityType() != null) ? req.entityType().toUpperCase().trim() : "POLICY";
            int entityId = (req.entityId() != null) ? req.entityId() : 0;

            String sql = null;
            Object[] params = null;

            if ("SUBMISSION".equalsIgnoreCase(entityType) && entityId > 0) {
                sql = "SELECT TOP 1 PREMIUM, LIMIT_AMT, RETENTION_AMT, PRODUCT_CODE, SERFF_TRACKING_NBR, " +
                      "CAST(BASE_RATE AS VARCHAR(50)) AS BASE_RATE, CAST(SCHEDULE_MOD AS VARCHAR(50)) AS SCHEDULE_MOD, " +
                      "CALC_TRACE, ATTACHED_FORMS FROM dbo.UW_QUOTE WHERE SUBMSN_ID = ? ORDER BY QUOTE_ID DESC";
                params = new Object[]{entityId};
            } else if ("POLICY".equalsIgnoreCase(entityType) && entityId > 0) {
                sql = "SELECT TOP 1 q.PREMIUM, q.LIMIT_AMT, q.RETENTION_AMT, q.PRODUCT_CODE, q.SERFF_TRACKING_NBR, " +
                      "CAST(q.BASE_RATE AS VARCHAR(50)) AS BASE_RATE, CAST(q.SCHEDULE_MOD AS VARCHAR(50)) AS SCHEDULE_MOD, " +
                      "q.CALC_TRACE, q.ATTACHED_FORMS FROM dbo.UW_QUOTE q " +
                      "INNER JOIN dbo.UW_SUBMSN s ON s.SUBMSN_ID = q.SUBMSN_ID WHERE s.POLICY_ID = ? ORDER BY q.QUOTE_ID DESC";
                params = new Object[]{entityId};
            } else if ("QUOTE".equalsIgnoreCase(entityType)) {
                sql = "SELECT TOP 1 PREMIUM, LIMIT_AMT, RETENTION_AMT, PRODUCT_CODE, SERFF_TRACKING_NBR, " +
                      "CAST(BASE_RATE AS VARCHAR(50)) AS BASE_RATE, CAST(SCHEDULE_MOD AS VARCHAR(50)) AS SCHEDULE_MOD, " +
                      "CALC_TRACE, ATTACHED_FORMS FROM dbo.UW_QUOTE WHERE QUOTE_ID = ? OR QUOTE_NBR = ? ORDER BY QUOTE_ID DESC";
                params = new Object[]{entityId, req.entityNbr()};
            }

            if (sql != null) {
                List<Map<String, Object>> rows = jdbc.queryForList(sql, params);
                if (!rows.isEmpty()) {
                    Map<String, Object> r = rows.get(0);
                    String dbPrem = (String) r.get("PREMIUM");
                    String dbLimit = (String) r.get("LIMIT_AMT");
                    String dbRet = (String) r.get("RETENTION_AMT");
                    String dbSerff = (String) r.get("SERFF_TRACKING_NBR");
                    String dbBase = (String) r.get("BASE_RATE");
                    String dbSched = (String) r.get("SCHEDULE_MOD");
                    String dbTrace = (String) r.get("CALC_TRACE");

                    log.info("Auto-enriching docgen request from dbo.UW_QUOTE: premium={}, limit={}, retention={}",
                            dbPrem, dbLimit, dbRet);

                    List<String> traceList = req.calculationTrace();
                    if ((traceList == null || traceList.isEmpty()) && dbTrace != null && !dbTrace.isBlank()) {
                        try {
                            traceList = new com.fasterxml.jackson.databind.ObjectMapper().readValue(
                                    dbTrace, new com.fasterxml.jackson.core.type.TypeReference<List<String>>() {});
                        } catch (Exception e) {
                            traceList = List.of(dbTrace);
                        }
                    }

                    String effectivePremium = hasValidPrem ? req.premiumAmount() : dbPrem;
                    String effectiveLimit = (req.limitAmount() != null && !req.limitAmount().isBlank()) ? req.limitAmount() : dbLimit;
                    String effectiveRet = (req.retentionAmount() != null && !req.retentionAmount().isBlank()) ? req.retentionAmount() : dbRet;
                    String effectiveSerff = (req.serffTrackingNumber() != null && !req.serffTrackingNumber().isBlank()) ? req.serffTrackingNumber() : dbSerff;
                    String effectiveBase = (req.baseRate() != null && !req.baseRate().isBlank()) ? req.baseRate() : dbBase;
                    String effectiveSched = (req.scheduleMod() != null && !req.scheduleMod().isBlank()) ? req.scheduleMod() : dbSched;

                    return new GenerateDocumentRequest(
                            tenantId,
                            req.entityType(),
                            req.entityId(),
                            req.entityNbr(),
                            req.docType(),
                            req.docTitle(),
                            req.insuredName(),
                            req.insuredAddress(),
                            (req.productType() != null && !req.productType().isBlank()) ? req.productType() : (String) r.get("PRODUCT_CODE"),
                            req.underwriterName(),
                            req.effectiveDate(),
                            req.expirationDate(),
                            req.retroactiveDate(),
                            effectiveLimit,
                            effectiveRet,
                            effectivePremium,
                            req.agencyInfo(),
                            effectiveSerff,
                            effectiveBase,
                            effectiveSched,
                            traceList,
                            req.attachedForms(),
                            req.letterSubject(),
                            req.letterBody(),
                            req.recipientName(),
                            req.recipientTitle(),
                            req.signatoryName(),
                            req.signatoryTitle(),
                            req.emailFrom(),
                            req.emailTo(),
                            req.emailDate(),
                            req.emailBodyHtml(),
                            req.emailAttachments()
                    );
                }
            }
        } catch (Exception e) {
            log.warn("Could not auto-enrich document generation request with rating data: {}", e.getMessage());
        }

        return req;
    }
}
