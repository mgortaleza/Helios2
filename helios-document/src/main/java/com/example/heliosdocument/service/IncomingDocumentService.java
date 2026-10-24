package com.example.heliosdocument.service;

import java.io.File;
import java.io.IOException;
import java.nio.file.DirectoryStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.Resource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import com.example.heliosdocument.model.AttachDocumentRequest;
import com.example.heliosdocument.model.CreateSubmissionFromDocRequest;
import com.example.heliosdocument.model.IncomingDocumentDto;

@Service
public class IncomingDocumentService {

    private static final Logger log = LoggerFactory.getLogger(IncomingDocumentService.class);

    private final DocumentService documentService;
    private final DocumentStorageService storageService;

    public IncomingDocumentService(DocumentService documentService, DocumentStorageService storageService) {
        this.documentService = documentService;
        this.storageService = storageService;
    }

    /**
     * Periodic scanner that scans all tenant inbox folders every 5 seconds.
     */
    @Scheduled(fixedDelay = 5000)
    public void scheduledInboxScan() {
        try {
            scanTenantInbox(1);
            scanTenantInbox(2);
        } catch (Exception e) {
            log.error("Error running scheduled incoming documents inbox scan: {}", e.getMessage(), e);
        }
    }

    /**
     * Scans the inbox folder for a specific tenant:
     * C:\helios-storage\documents\tenant_{tenantId}\inbox\
     * - Files directly in inbox: standalone incoming documents
     * - Folders in inbox: grouped incoming documents (batch/submission package)
     * Moves all files to C:\helios-storage\documents\tenant_{tenantId}\queue\
     * and writes records to dbo.DOC_INCOMING.
     */
    public synchronized int scanTenantInbox(int tenantId) {
        Path rootStorage = storageService.getRootStoragePath();
        Path tenantRoot = rootStorage.resolve("tenant_" + tenantId);
        Path inboxDir = tenantRoot.resolve("inbox");
        Path queueDir = tenantRoot.resolve("queue");

        int processedCount = 0;

        try {
            Files.createDirectories(inboxDir);
            Files.createDirectories(queueDir);
        } catch (IOException e) {
            log.warn("Could not create inbox or queue directories for tenant {}: {}", tenantId, e.getMessage());
            return 0;
        }

        JdbcTemplate jdbc = documentService.getTenantJdbcTemplate(tenantId);

        try (DirectoryStream<Path> stream = Files.newDirectoryStream(inboxDir)) {
            for (Path entry : stream) {
                if (Files.isDirectory(entry)) {
                    // Grouped documents inside a folder
                    String folderName = entry.getFileName().toString();
                    String groupId = "GRP-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
                    Path targetGroupDir = queueDir.resolve(folderName);
                    try {
                        Files.createDirectories(targetGroupDir);
                        try (DirectoryStream<Path> groupStream = Files.newDirectoryStream(entry)) {
                            for (Path fileInGroup : groupStream) {
                                if (Files.isRegularFile(fileInGroup)) {
                                    processedCount += processAndMoveFile(
                                            jdbc, tenantId, fileInGroup, targetGroupDir, groupId, folderName
                                    );
                                }
                            }
                        }
                        // Delete empty source folder if empty
                        try {
                            Files.delete(entry);
                        } catch (IOException ignored) {
                            // Folder might still have unreadable files
                        }
                    } catch (IOException ex) {
                        log.error("Failed to process grouped folder {}: {}", entry, ex.getMessage(), ex);
                    }
                } else if (Files.isRegularFile(entry)) {
                    // Standalone document
                    processedCount += processAndMoveFile(jdbc, tenantId, entry, queueDir, null, null);
                }
            }
        } catch (IOException e) {
            log.error("Error reading inbox for tenant {}: {}", tenantId, e.getMessage(), e);
        }

        if (processedCount > 0) {
            log.info("Tenant #{}: Processed and queued {} incoming document(s)", tenantId, processedCount);
        }

        return processedCount;
    }

    private int processAndMoveFile(
            JdbcTemplate jdbc,
            int tenantId,
            Path sourceFile,
            Path targetDir,
            String groupId,
            String groupName
    ) {
        try {
            String originalFileName = sourceFile.getFileName().toString();
            // Avoid conflict if file with same name already exists in target
            Path targetFile = targetDir.resolve(originalFileName);
            if (Files.exists(targetFile)) {
                String namePart = originalFileName;
                String extPart = "";
                int dotIdx = originalFileName.lastIndexOf('.');
                if (dotIdx > 0) {
                    namePart = originalFileName.substring(0, dotIdx);
                    extPart = originalFileName.substring(dotIdx);
                }
                String uniqueName = namePart + "_" + System.currentTimeMillis() + extPart;
                targetFile = targetDir.resolve(uniqueName);
            }

            // Move file into queue
            Files.move(sourceFile, targetFile, StandardCopyOption.REPLACE_EXISTING);
            long fileSizeBytes = Files.size(targetFile);
            String mimeType = probeMimeType(targetFile);
            String docName = cleanDocTitle(originalFileName);

            // Insert into dbo.DOC_INCOMING
            String sql = """
                    INSERT INTO dbo.DOC_INCOMING (
                        TENANT_ID, DOCUMENT_NAME, FILE_NAME, FILE_PATH, FILE_SIZE_BYTES,
                        MIME_TYPE, GROUP_ID, GROUP_NAME, STATUS, RECEIVED_DT, CREATED_DT, UPDATED_DT
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'QUEUED', GETDATE(), GETDATE(), GETDATE())
                    """;

            Path finalTarget = targetFile;
            jdbc.update(con -> {
                PreparedStatement ps = con.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS);
                ps.setInt(1, tenantId);
                ps.setString(2, docName);
                ps.setString(3, finalTarget.getFileName().toString());
                ps.setString(4, finalTarget.toAbsolutePath().toString());
                ps.setLong(5, fileSizeBytes);
                ps.setString(6, mimeType);
                ps.setString(7, groupId);
                ps.setString(8, groupName);
                return ps;
            });

            log.info("Tenant #{}: Moved incoming file '{}' to queue: {}", tenantId, originalFileName, targetFile);
            return 1;
        } catch (Exception e) {
            log.error("Failed to process and move file {}: {}", sourceFile, e.getMessage(), e);
            return 0;
        }
    }

    public List<IncomingDocumentDto> getIncomingDocuments(int tenantId, String status, String groupName) {
        JdbcTemplate jdbc = documentService.getTenantJdbcTemplate(tenantId);
        StringBuilder sql = new StringBuilder("""
                SELECT INCOMING_ID, TENANT_ID, DOCUMENT_NAME, FILE_NAME, FILE_PATH,
                       FILE_SIZE_BYTES, MIME_TYPE, GROUP_ID, GROUP_NAME, STATUS,
                       ATTACHED_ENTITY_TYPE, ATTACHED_ENTITY_ID, ATTACHED_ENTITY_NBR,
                       DOCUMENT_ID,
                       CONVERT(VARCHAR(20), RECEIVED_DT, 120) AS RECEIVED_DT,
                       CONVERT(VARCHAR(20), ATTACHED_DT, 120) AS ATTACHED_DT,
                       ATTACHED_BY,
                       CONVERT(VARCHAR(20), CREATED_DT, 120) AS CREATED_DT
                FROM dbo.DOC_INCOMING
                WHERE TENANT_ID = ?
                """);

        List<Object> params = new ArrayList<>();
        params.add(tenantId);

        if (status != null && !status.isBlank() && !status.equalsIgnoreCase("ALL")) {
            sql.append(" AND UPPER(STATUS) = UPPER(?)");
            params.add(status.trim());
        }

        if (groupName != null && !groupName.isBlank()) {
            sql.append(" AND (LOWER(GROUP_NAME) LIKE LOWER(?) OR LOWER(GROUP_ID) LIKE LOWER(?))");
            params.add("%" + groupName.trim() + "%");
            params.add("%" + groupName.trim() + "%");
        }

        sql.append(" ORDER BY INCOMING_ID DESC");

        return jdbc.query(sql.toString(), (rs, rowNum) -> mapIncomingDto(rs), params.toArray());
    }

    public Optional<IncomingDocumentDto> getIncomingDocumentById(int tenantId, int incomingId) {
        JdbcTemplate jdbc = documentService.getTenantJdbcTemplate(tenantId);
        String sql = """
                SELECT INCOMING_ID, TENANT_ID, DOCUMENT_NAME, FILE_NAME, FILE_PATH,
                       FILE_SIZE_BYTES, MIME_TYPE, GROUP_ID, GROUP_NAME, STATUS,
                       ATTACHED_ENTITY_TYPE, ATTACHED_ENTITY_ID, ATTACHED_ENTITY_NBR,
                       DOCUMENT_ID,
                       CONVERT(VARCHAR(20), RECEIVED_DT, 120) AS RECEIVED_DT,
                       CONVERT(VARCHAR(20), ATTACHED_DT, 120) AS ATTACHED_DT,
                       ATTACHED_BY,
                       CONVERT(VARCHAR(20), CREATED_DT, 120) AS CREATED_DT
                FROM dbo.DOC_INCOMING
                WHERE INCOMING_ID = ? AND TENANT_ID = ?
                """;

        List<IncomingDocumentDto> list = jdbc.query(sql, (rs, rowNum) -> mapIncomingDto(rs), incomingId, tenantId);
        return list.stream().findFirst();
    }

    public Resource loadIncomingFileResource(int tenantId, int incomingId) throws IOException {
        IncomingDocumentDto doc = getIncomingDocumentById(tenantId, incomingId)
                .orElseThrow(() -> new IllegalArgumentException("Incoming document #" + incomingId + " not found for tenant " + tenantId));
        return storageService.loadDocumentAsResource(doc.filePath());
    }

    /**
     * Attaches an incoming document to an existing Policy or Submission.
     * Inserts an entry into dbo.DOC_DOCUMENT and marks dbo.DOC_INCOMING as 'ATTACHED'.
     */
    public IncomingDocumentDto attachDocument(int tenantId, int incomingId, AttachDocumentRequest req) {
        IncomingDocumentDto doc = getIncomingDocumentById(tenantId, incomingId)
                .orElseThrow(() -> new IllegalArgumentException("Incoming document #" + incomingId + " not found"));

        JdbcTemplate jdbc = documentService.getTenantJdbcTemplate(tenantId);

        String entityType = (req.entityType() != null && !req.entityType().isBlank())
                ? req.entityType().toUpperCase().trim()
                : "SUBMISSION";
        long entityId = (req.entityId() != null && req.entityId() > 0) ? req.entityId() : 1L;
        String entityNbr = (req.entityNbr() != null && !req.entityNbr().isBlank())
                ? req.entityNbr().trim()
                : (entityType.equalsIgnoreCase("POLICY") ? "POL-" + entityId : "SUB-" + entityId);

        String docType = (req.docType() != null && !req.docType().isBlank())
                ? req.docType().toUpperCase().trim()
                : "ATTACHMENT";
        String docTitle = (req.docTitle() != null && !req.docTitle().isBlank())
                ? req.docTitle().trim()
                : doc.documentName();
        String attachedBy = (req.attachedBy() != null && !req.attachedBy().isBlank())
                ? req.attachedBy().trim()
                : "INBOX_WORKFLOW";

        // 1. Insert into dbo.DOC_DOCUMENT so policy/submission document views display it
        KeyHolder kh = new GeneratedKeyHolder();
        String insertDocSql = """
                INSERT INTO dbo.DOC_DOCUMENT (
                    TENANT_ID, ENTITY_TYPE, ENTITY_ID, ENTITY_NBR, DOC_TYPE,
                    DOC_TITLE, FILE_NAME, FILE_PATH, FILE_SIZE_BYTES, MIME_TYPE,
                    PAGE_COUNT, STATUS, GENERATED_BY
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'ATTACHED', ?)
                """;

        jdbc.update(con -> {
            PreparedStatement ps = con.prepareStatement(insertDocSql, Statement.RETURN_GENERATED_KEYS);
            ps.setInt(1, tenantId);
            ps.setString(2, entityType);
            ps.setInt(3, (int) entityId);
            ps.setString(4, entityNbr);
            ps.setString(5, docType);
            ps.setString(6, docTitle);
            ps.setString(7, doc.fileName());
            ps.setString(8, doc.filePath());
            ps.setLong(9, doc.fileSizeBytes() != null ? doc.fileSizeBytes() : 0L);
            ps.setString(10, doc.mimeType() != null ? doc.mimeType() : "application/pdf");
            ps.setString(11, attachedBy);
            return ps;
        }, kh);

        int newDocId = (kh.getKey() != null) ? kh.getKey().intValue() : 0;

        // 2. Update dbo.DOC_INCOMING
        String updateIncomingSql = """
                UPDATE dbo.DOC_INCOMING
                SET STATUS = 'ATTACHED',
                    ATTACHED_ENTITY_TYPE = ?,
                    ATTACHED_ENTITY_ID = ?,
                    ATTACHED_ENTITY_NBR = ?,
                    DOCUMENT_ID = ?,
                    ATTACHED_DT = GETDATE(),
                    ATTACHED_BY = ?,
                    UPDATED_DT = GETDATE()
                WHERE INCOMING_ID = ? AND TENANT_ID = ?
                """;

        jdbc.update(updateIncomingSql, entityType, entityId, entityNbr, newDocId, attachedBy, incomingId, tenantId);

        log.info("Tenant #{}: Attached incoming doc #{} to {} #{} ({}) -> New DOC_DOCUMENT ID #{}",
                tenantId, incomingId, entityType, entityId, entityNbr, newDocId);

        return getIncomingDocumentById(tenantId, incomingId).orElse(doc);
    }

    /**
     * Creates a new Organization (PT_PARTY) and Submission (UW_SUBMSN),
     * and automatically attaches this incoming document to the newly created submission.
     */
    public Map<String, Object> createSubmissionAndAttach(int tenantId, int incomingId, CreateSubmissionFromDocRequest req) {
        JdbcTemplate jdbc = documentService.getTenantJdbcTemplate(tenantId);

        // 1. Resolve or Create Insured Organization (PT_PARTY)
        int insuredPid = (req.insuredPid() != null && req.insuredPid() > 0) ? req.insuredPid() : 0;
        String orgName = (req.orgName() != null && !req.orgName().isBlank())
                ? req.orgName().trim()
                : "New Intake Insured " + System.currentTimeMillis() % 10000;

        int resolvedPid = insuredPid;
        if (resolvedPid == 0) {
            KeyHolder partyKh = new GeneratedKeyHolder();
            String partySql = "INSERT INTO dbo.PT_PARTY (ORG_NM) VALUES (?)";
            jdbc.update(con -> {
                PreparedStatement ps = con.prepareStatement(partySql, Statement.RETURN_GENERATED_KEYS);
                ps.setString(1, orgName);
                return ps;
            }, partyKh);
            resolvedPid = (partyKh.getKey() != null) ? partyKh.getKey().intValue() : 1;
            log.info("Tenant #{}: Created new PT_PARTY #{} for '{}'", tenantId, resolvedPid, orgName);
        }
        final int finalInsuredPid = resolvedPid;

        // 2. Generate Submission Number and Create Submission (UW_SUBMSN)
        String submsnNbr = (req.submissionNbr() != null && !req.submissionNbr().isBlank())
                ? req.submissionNbr().trim()
                : "SUB-" + (10000 + (int) (Math.random() * 90000));

        String submsnDate = LocalDate.now().toString();
        String effectiveDate = (req.effectiveDate() != null && !req.effectiveDate().isBlank()) ? req.effectiveDate() : LocalDate.now().toString();
        String expirationDate = (req.expirationDate() != null && !req.expirationDate().isBlank()) ? req.expirationDate() : LocalDate.now().plusYears(1).toString();
        String underwriter = (req.underwriter() != null && !req.underwriter().isBlank()) ? req.underwriter().trim() : "Michael Chang";
        String limitAmt = (req.limitAmount() != null && !req.limitAmount().isBlank()) ? req.limitAmount().trim() : "$1,000,000";
        String retentionAmt = (req.retentionAmount() != null && !req.retentionAmount().isBlank()) ? req.retentionAmount().trim() : "$10,000";

        KeyHolder subKh = new GeneratedKeyHolder();
        String subSql = """
                INSERT INTO dbo.UW_SUBMSN (
                    SUBMSN_NBR, INSURED_PID, POLICY_ID, SUBMSN_DT, STATUS,
                    UNDERWRITER, EFFECTIVE_DT, EXPIRATION_DT, RETROACTIVE_DT,
                    LIMIT_AMT, RETENTION_AMT
                ) VALUES (?, ?, NULL, ?, 'Received', ?, ?, ?, ?, ?, ?)
                """;

        String retroDate = (req.retroactiveDate() != null) ? req.retroactiveDate() : effectiveDate;

        jdbc.update(con -> {
            PreparedStatement ps = con.prepareStatement(subSql, Statement.RETURN_GENERATED_KEYS);
            ps.setString(1, submsnNbr);
            ps.setInt(2, finalInsuredPid);
            ps.setString(3, submsnDate);
            ps.setString(4, underwriter);
            ps.setString(5, effectiveDate);
            ps.setString(6, expirationDate);
            ps.setString(7, retroDate);
            ps.setString(8, limitAmt);
            ps.setString(9, retentionAmt);
            return ps;
        }, subKh);

        int newSubmsnId = (subKh.getKey() != null) ? subKh.getKey().intValue() : 0;
        log.info("Tenant #{}: Created new UW_SUBMSN #{} ({}) for Party #{}", tenantId, newSubmsnId, submsnNbr, finalInsuredPid);

        // 3. Attach Incoming Document to New Submission
        AttachDocumentRequest attachReq = new AttachDocumentRequest(
                "SUBMISSION",
                (long) newSubmsnId,
                submsnNbr,
                req.docType() != null && !req.docType().isBlank() ? req.docType() : "APPLICATION",
                req.docTitle() != null && !req.docTitle().isBlank() ? req.docTitle() : orgName + " - Intake Application",
                req.attachedBy() != null ? req.attachedBy() : underwriter
        );

        IncomingDocumentDto attachedDoc = attachDocument(tenantId, incomingId, attachReq);

        Map<String, Object> result = new HashMap<>();
        result.put("submissionId", newSubmsnId);
        result.put("submissionNbr", submsnNbr);
        result.put("insuredPid", finalInsuredPid);
        result.put("orgName", orgName);
        result.put("status", "Received");
        result.put("underwriter", underwriter);
        result.put("effectiveDate", effectiveDate);
        result.put("attachedDocument", attachedDoc);

        return result;
    }

    public boolean discardDocument(int tenantId, int incomingId) {
        JdbcTemplate jdbc = documentService.getTenantJdbcTemplate(tenantId);
        int rows = jdbc.update(
                "UPDATE dbo.DOC_INCOMING SET STATUS = 'DISCARDED', UPDATED_DT = GETDATE() WHERE INCOMING_ID = ? AND TENANT_ID = ?",
                incomingId, tenantId
        );
        return rows > 0;
    }

    private IncomingDocumentDto mapIncomingDto(java.sql.ResultSet rs) throws java.sql.SQLException {
        long entityId = rs.getLong("ATTACHED_ENTITY_ID");
        long docId = rs.getLong("DOCUMENT_ID");
        return new IncomingDocumentDto(
                rs.getInt("INCOMING_ID"),
                rs.getInt("TENANT_ID"),
                rs.getString("DOCUMENT_NAME"),
                rs.getString("FILE_NAME"),
                rs.getString("FILE_PATH"),
                rs.getLong("FILE_SIZE_BYTES"),
                rs.getString("MIME_TYPE"),
                rs.getString("GROUP_ID"),
                rs.getString("GROUP_NAME"),
                rs.getString("STATUS"),
                rs.getString("ATTACHED_ENTITY_TYPE"),
                rs.wasNull() ? null : entityId,
                rs.getString("ATTACHED_ENTITY_NBR"),
                rs.wasNull() ? null : docId,
                rs.getString("RECEIVED_DT"),
                rs.getString("ATTACHED_DT"),
                rs.getString("ATTACHED_BY"),
                rs.getString("CREATED_DT")
        );
    }

    private String cleanDocTitle(String fileName) {
        String title = fileName;
        int dot = title.lastIndexOf('.');
        if (dot > 0) {
            title = title.substring(0, dot);
        }
        return title.replace('_', ' ').replace('-', ' ').trim();
    }

    private String probeMimeType(Path path) {
        try {
            String probed = Files.probeContentType(path);
            if (probed != null && !probed.isBlank()) {
                return probed;
            }
        } catch (IOException ignored) {
        }
        String name = path.getFileName().toString().toLowerCase();
        if (name.endsWith(".pdf")) return "application/pdf";
        if (name.endsWith(".png")) return "image/png";
        if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg";
        if (name.endsWith(".gif")) return "image/gif";
        if (name.endsWith(".docx")) return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        if (name.endsWith(".doc")) return "application/msword";
        if (name.endsWith(".xlsx")) return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        if (name.endsWith(".xls")) return "application/vnd.ms-excel";
        if (name.endsWith(".txt")) return "text/plain";
        if (name.endsWith(".csv")) return "text/csv";
        return "application/octet-stream";
    }
}
