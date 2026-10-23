package com.example.heliosdocument.service;

import java.io.IOException;
import java.nio.file.Path;
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

import com.example.heliosdocument.model.DocumentDto;
import com.example.heliosdocument.model.GenerateDocumentRequest;
import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;

@Service
public class DocumentService {

    private static final Logger log = LoggerFactory.getLogger(DocumentService.class);

    private final AsposePdfGeneratorService pdfGeneratorService;
    private final DocumentStorageService storageService;
    private final Map<Integer, JdbcTemplate> tenantTemplates = new ConcurrentHashMap<>();

    @Value("${spring.datasource.url}")
    private String masterDbUrl;

    public DocumentService(AsposePdfGeneratorService pdfGeneratorService, DocumentStorageService storageService) {
        this.pdfGeneratorService = pdfGeneratorService;
        this.storageService = storageService;
    }

    private JdbcTemplate getTenantJdbcTemplate(int tenantId) {
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

        // 1. Generate Binary via Aspose.PDF
        AsposePdfGeneratorService.GeneratedPdf generated = pdfGeneratorService.generate(req);

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
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ISSUED', 'ASPOSE_PDF_ENGINE')
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
                "ASPOSE_PDF_ENGINE",
                LocalDate.now().toString()
        );
    }

    public List<DocumentDto> getDocuments(int tenantId, String entityType, Integer entityId, String docType) {
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
        if (entityId != null && entityId > 0) {
            sql.append(" AND ENTITY_ID = ?");
            params.add(entityId);
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
}
