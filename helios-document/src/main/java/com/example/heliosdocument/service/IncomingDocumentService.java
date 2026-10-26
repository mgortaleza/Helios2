package com.example.heliosdocument.service;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
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

import com.example.heliosdocument.client.DocgenClient;
import com.example.heliosdocument.model.AttachDocumentRequest;
import com.example.heliosdocument.model.CreateSubmissionFromDocRequest;
import com.example.heliosdocument.model.IncomingDocumentDto;

@Service
public class IncomingDocumentService {

    private static final Logger log = LoggerFactory.getLogger(IncomingDocumentService.class);

    private final DocumentService documentService;
    private final DocumentStorageService storageService;
    private final EmlParserService emlParserService;
    private final DocgenClient docgenClient;

    public IncomingDocumentService(
            DocumentService documentService,
            DocumentStorageService storageService,
            EmlParserService emlParserService,
            DocgenClient docgenClient
    ) {
        this.documentService = documentService;
        this.storageService = storageService;
        this.emlParserService = emlParserService;
        this.docgenClient = docgenClient;
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
     * - Files directly in inbox: standalone incoming documents (or .eml packages)
     * - Folders in inbox: grouped incoming documents (batch/submission package)
     * Converts .eml email bodies to PDF, extracts all attachments, and moves
     * files to C:\helios-storage\documents\tenant_{tenantId}\queue\
     * while writing records to dbo.DOC_INCOMING with group associations intact.
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
                                    if (isEmlFile(fileInGroup)) {
                                        processedCount += processEmlFileIntoGroup(
                                                jdbc, tenantId, fileInGroup, targetGroupDir, groupId, folderName
                                        );
                                    } else {
                                        processedCount += processAndMoveFile(
                                                jdbc, tenantId, fileInGroup, targetGroupDir, groupId, folderName
                                        );
                                    }
                                }
                            }
                        }
                        // Delete empty source folder if empty
                        try {
                            Files.delete(entry);
                        } catch (IOException ignored) {
                        }
                    } catch (IOException ex) {
                        log.error("Failed to process grouped folder {}: {}", entry, ex.getMessage(), ex);
                    }
                } else if (Files.isRegularFile(entry)) {
                    // Standalone file in inbox
                    if (isEmlFile(entry)) {
                        processedCount += processStandaloneEmlFile(jdbc, tenantId, entry, queueDir);
                    } else {
                        // Check if this is a loose companion .txt for an .eml processed concurrently or earlier
                        String fileName = entry.getFileName().toString();
                        if (fileName.toLowerCase().endsWith(".txt")) {
                            String baseName = getBaseName(fileName);
                            Path potentialEml = inboxDir.resolve(baseName + ".eml");
                            if (Files.exists(potentialEml)) {
                                // Will be handled or cleaned up with the .eml
                                continue;
                            }
                        }
                        processedCount += processAndMoveFile(jdbc, tenantId, entry, queueDir, null, null);
                    }
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

    /**
     * Processes a standalone EML file located in the tenant inbox.
     * Extracts email body to PDF, extracts all attachments, and keeps
     * body and attachments together in a dedicated subfolder inside queue/.
     */
    private int processStandaloneEmlFile(JdbcTemplate jdbc, int tenantId, Path emlFile, Path queueDir) {
        log.info("Tenant #{}: Handling incoming EML file '{}'", tenantId, emlFile.getFileName());
        try {
            EmlParserService.ParsedEmail email = emlParserService.parse(emlFile);

            String baseName = getBaseName(emlFile.getFileName().toString());
            String cleanSubject = sanitizeGroupName(email.subject());
            if (cleanSubject.isBlank() || cleanSubject.equalsIgnoreCase("No_Subject")) {
                cleanSubject = sanitizeGroupName(baseName);
            }

            // Subfolder name to keep email body PDF and attachments grouped together
            String folderName = "Email_" + cleanSubject;
            Path targetGroupDir = queueDir.resolve(folderName);
            if (Files.exists(targetGroupDir)) {
                targetGroupDir = queueDir.resolve(folderName + "_" + System.currentTimeMillis());
                folderName = targetGroupDir.getFileName().toString();
            }
            Files.createDirectories(targetGroupDir);

            String groupId = "GRP-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
            int count = processEmlContentIntoGroup(jdbc, tenantId, emlFile, email, targetGroupDir, groupId, folderName);

            // Clean up source .eml from inbox
            try {
                Files.delete(emlFile);
                log.info("Cleaned up source EML file: {}", emlFile);
            } catch (Exception ex) {
                log.warn("Could not delete source EML {}: {}", emlFile, ex.getMessage());
            }

            // Clean up any companion .txt file created by older mail fetchers with the same base name
            try {
                Path companionTxt = emlFile.getParent().resolve(baseName + ".txt");
                if (Files.exists(companionTxt)) {
                    Files.delete(companionTxt);
                    log.info("Cleaned up companion .txt file: {}", companionTxt);
                }
            } catch (Exception ignored) {
            }

            return count;
        } catch (Exception e) {
            log.error("Failed to process standalone EML file {}: {}", emlFile, e.getMessage(), e);
            return 0;
        }
    }

    /**
     * Processes an EML file located within a grouped subfolder in the tenant inbox.
     */
    private int processEmlFileIntoGroup(
            JdbcTemplate jdbc,
            int tenantId,
            Path emlFile,
            Path targetGroupDir,
            String groupId,
            String groupName
    ) {
        log.info("Tenant #{}: Handling grouped EML file '{}' in group '{}'", tenantId, emlFile.getFileName(), groupName);
        try {
            EmlParserService.ParsedEmail email = emlParserService.parse(emlFile);
            int count = processEmlContentIntoGroup(jdbc, tenantId, emlFile, email, targetGroupDir, groupId, groupName);

            try {
                Files.delete(emlFile);
                log.info("Cleaned up source grouped EML file: {}", emlFile);
            } catch (Exception ex) {
                log.warn("Could not delete source grouped EML {}: {}", emlFile, ex.getMessage());
            }

            return count;
        } catch (Exception e) {
            log.error("Failed to process grouped EML file {}: {}", emlFile, e.getMessage(), e);
            return 0;
        }
    }

    /**
     * Converts email body to PDF and extracts attachments into the target group directory,
     * registering all generated documents into dbo.DOC_INCOMING with matching group info.
     */
    private int processEmlContentIntoGroup(
            JdbcTemplate jdbc,
            int tenantId,
            Path emlFile,
            EmlParserService.ParsedEmail email,
            Path targetGroupDir,
            String groupId,
            String groupName
    ) {
        int count = 0;
        List<String> attachmentFileNames = email.attachments().stream()
                .map(EmlParserService.EmailAttachment::fileName)
                .toList();

        // 1. Convert email body to PDF
        String subject = (email.subject() != null && !email.subject().isBlank()) ? email.subject() : "No Subject";
        String cleanSubject = sanitizeGroupName(subject);
        String bodyFileName = "Email_" + cleanSubject + ".pdf";
        if (bodyFileName.length() > 80) {
            bodyFileName = bodyFileName.substring(0, 76) + ".pdf";
        }
        Path pdfTarget = targetGroupDir.resolve(bodyFileName);
        if (Files.exists(pdfTarget)) {
            pdfTarget = targetGroupDir.resolve("Email_" + cleanSubject + "_" + System.currentTimeMillis() + ".pdf");
        }

        byte[] pdfBytes = null;
        try {
            DocgenClient.GeneratedDocumentResult result = docgenClient.generateEmailPdf(
                    tenantId,
                    subject,
                    email.from(),
                    email.to(),
                    email.dateStr(),
                    email.bodyText(),
                    email.bodyHtml(),
                    attachmentFileNames
            );
            pdfBytes = result.content();
            log.info("DocGen generated email body PDF: {} bytes", pdfBytes.length);
        } catch (Exception ex) {
            log.warn("DocGen service call failed for email PDF, using fallback PDF engine: {}", ex.getMessage());
            pdfBytes = generateFallbackEmailPdf(email, attachmentFileNames);
        }

        try {
            Files.write(pdfTarget, pdfBytes);
            insertDocIncoming(
                    jdbc,
                    tenantId,
                    "Email - " + cleanDocTitle(subject),
                    pdfTarget.getFileName().toString(),
                    pdfTarget.toAbsolutePath().toString(),
                    pdfBytes.length,
                    "application/pdf",
                    groupId,
                    groupName
            );
            count++;
            log.info("Tenant #{}: Saved and queued email body PDF '{}' -> {}", tenantId, pdfTarget.getFileName(), pdfTarget);
        } catch (Exception e) {
            log.error("Failed to write/record email body PDF: {}", e.getMessage(), e);
        }

        // 2. Extract and queue all attachments
        for (EmlParserService.EmailAttachment att : email.attachments()) {
            try {
                String safeAttName = EmlParserService.sanitizeFileName(att.fileName());
                Path attTarget = targetGroupDir.resolve(safeAttName);
                if (Files.exists(attTarget)) {
                    String base = getBaseName(safeAttName);
                    String ext = getExtension(safeAttName);
                    attTarget = targetGroupDir.resolve(base + "_" + System.currentTimeMillis() + ext);
                }

                Files.write(attTarget, att.content());
                long size = att.content().length;
                String mime = (att.contentType() != null && !att.contentType().isBlank() && !att.contentType().contains("octet-stream"))
                        ? att.contentType()
                        : probeMimeType(attTarget);

                insertDocIncoming(
                        jdbc,
                        tenantId,
                        cleanDocTitle(attTarget.getFileName().toString()),
                        attTarget.getFileName().toString(),
                        attTarget.toAbsolutePath().toString(),
                        size,
                        mime,
                        groupId,
                        groupName
                );
                count++;
                log.info("Tenant #{}: Extracted attachment '{}' ({} bytes) -> {}", tenantId, attTarget.getFileName(), size, attTarget);
            } catch (Exception e) {
                log.error("Failed to extract and record attachment {}: {}", att.fileName(), e.getMessage(), e);
            }
        }

        return count;
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
                String namePart = getBaseName(originalFileName);
                String extPart = getExtension(originalFileName);
                String uniqueName = namePart + "_" + System.currentTimeMillis() + extPart;
                targetFile = targetDir.resolve(uniqueName);
            }

            // Move file into queue
            Files.move(sourceFile, targetFile, StandardCopyOption.REPLACE_EXISTING);
            long fileSizeBytes = Files.size(targetFile);
            String mimeType = probeMimeType(targetFile);
            String docName = cleanDocTitle(originalFileName);

            insertDocIncoming(
                    jdbc,
                    tenantId,
                    docName,
                    targetFile.getFileName().toString(),
                    targetFile.toAbsolutePath().toString(),
                    fileSizeBytes,
                    mimeType,
                    groupId,
                    groupName
            );

            log.info("Tenant #{}: Moved incoming file '{}' to queue: {}", tenantId, originalFileName, targetFile);
            return 1;
        } catch (Exception e) {
            log.error("Failed to process and move file {}: {}", sourceFile, e.getMessage(), e);
            return 0;
        }
    }

    private void insertDocIncoming(
            JdbcTemplate jdbc,
            int tenantId,
            String docName,
            String fileName,
            String filePath,
            long fileSizeBytes,
            String mimeType,
            String groupId,
            String groupName
    ) {
        String sql = """
                INSERT INTO dbo.DOC_INCOMING (
                    TENANT_ID, DOCUMENT_NAME, FILE_NAME, FILE_PATH, FILE_SIZE_BYTES,
                    MIME_TYPE, GROUP_ID, GROUP_NAME, STATUS, RECEIVED_DT, CREATED_DT, UPDATED_DT
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'QUEUED', GETDATE(), GETDATE(), GETDATE())
                """;

        jdbc.update(con -> {
            PreparedStatement ps = con.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS);
            ps.setInt(1, tenantId);
            ps.setString(2, docName);
            ps.setString(3, fileName);
            ps.setString(4, filePath);
            ps.setLong(5, fileSizeBytes);
            ps.setString(6, mimeType);
            ps.setString(7, groupId);
            ps.setString(8, groupName);
            return ps;
        });
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

        // Ensure columns for agency association exist
        try {
            jdbc.execute("""
                    IF COL_LENGTH('dbo.UW_SUBMSN', 'AGENCY_ID') IS NULL
                        ALTER TABLE dbo.UW_SUBMSN ADD AGENCY_ID INT NULL;
                    IF COL_LENGTH('dbo.UW_SUBMSN', 'AGENCY_INFO') IS NULL
                        ALTER TABLE dbo.UW_SUBMSN ADD AGENCY_INFO VARCHAR(255) NULL;
                    """);
        } catch (Exception ex) {
            log.warn("Notice checking UW_SUBMSN agency columns: {}", ex.getMessage());
        }

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

        // 2. Resolve Agency Association
        Integer agencyId = (req.agencyId() != null && req.agencyId() > 0) ? req.agencyId() : null;
        String agencyInfo = (req.agencyInfo() != null && !req.agencyInfo().isBlank()) ? req.agencyInfo().trim() : null;
        if (agencyId != null && (agencyInfo == null || agencyInfo.isBlank())) {
            try {
                agencyInfo = jdbc.queryForObject("SELECT ORG_NM FROM dbo.PT_PARTY WHERE PARTY_ID = ?", String.class, agencyId);
            } catch (Exception ignored) {}
        }
        final Integer finalAgencyId = agencyId;
        final String finalAgencyInfo = agencyInfo;

        // 3. Generate Submission Number and Create Submission (UW_SUBMSN)
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
                    LIMIT_AMT, RETENTION_AMT, AGENCY_ID, AGENCY_INFO
                ) VALUES (?, ?, NULL, ?, 'Received', ?, ?, ?, ?, ?, ?, ?, ?)
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
            if (finalAgencyId != null) {
                ps.setInt(10, finalAgencyId);
            } else {
                ps.setNull(10, java.sql.Types.INTEGER);
            }
            ps.setString(11, finalAgencyInfo);
            return ps;
        }, subKh);

        int newSubmsnId = (subKh.getKey() != null) ? subKh.getKey().intValue() : 0;
        log.info("Tenant #{}: Created new UW_SUBMSN #{} ({}) for Party #{} (Agency: {})",
                tenantId, newSubmsnId, submsnNbr, finalInsuredPid, finalAgencyInfo);

        // 4. Attach Incoming Document to New Submission
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
        result.put("agencyId", finalAgencyId);
        result.put("agencyInfo", finalAgencyInfo);
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

    private boolean isEmlFile(Path path) {
        String name = path.getFileName().toString().toLowerCase();
        return name.endsWith(".eml") || name.endsWith(".msg");
    }

    private String getBaseName(String fileName) {
        int dot = fileName.lastIndexOf('.');
        return (dot > 0) ? fileName.substring(0, dot) : fileName;
    }

    private String getExtension(String fileName) {
        int dot = fileName.lastIndexOf('.');
        return (dot >= 0) ? fileName.substring(dot) : "";
    }

    private String sanitizeGroupName(String name) {
        if (name == null || name.isBlank()) return "Email_Intake";
        String clean = name.replaceAll("[^a-zA-Z0-9_-]", "_").replaceAll("_+", "_").trim();
        clean = clean.replaceAll("^_|_$", "");
        if (clean.length() > 60) {
            clean = clean.substring(0, 60);
        }
        return clean.isEmpty() ? "Email_Intake" : clean;
    }

    private String cleanDocTitle(String fileName) {
        String title = fileName;
        int dot = title.lastIndexOf('.');
        if (dot > 0) {
            title = title.substring(0, dot);
        }
        return title.replace('_', ' ').replace('-', ' ').trim();
    }

    private byte[] generateFallbackEmailPdf(EmlParserService.ParsedEmail email, List<String> attachmentNames) {
        try {
            StringBuilder sb = new StringBuilder();
            sb.append("HELIOS INCOMING EMAIL INTAKE RECORD\n");
            sb.append("========================================================================\n");
            sb.append("Subject: ").append(email.subject()).append("\n");
            sb.append("From: ").append(email.from()).append("\n");
            sb.append("To: ").append(email.to()).append("\n");
            sb.append("Date Received: ").append(email.dateStr()).append("\n");
            if (attachmentNames != null && !attachmentNames.isEmpty()) {
                sb.append("Extracted Attachments (").append(attachmentNames.size()).append("):\n");
                for (int i = 0; i < attachmentNames.size(); i++) {
                    sb.append("  ").append(i + 1).append(". ").append(attachmentNames.get(i)).append("\n");
                }
            } else {
                sb.append("Extracted Attachments: None\n");
            }
            sb.append("========================================================================\n\n");
            sb.append("EMAIL CONTENT:\n\n");
            if (email.bodyText() != null && !email.bodyText().isBlank()) {
                sb.append(email.bodyText()).append("\n");
            } else if (email.bodyHtml() != null && !email.bodyHtml().isBlank()) {
                sb.append(email.bodyHtml().replaceAll("<[^>]*>", " ").replaceAll("\\s+", " ")).append("\n");
            } else {
                sb.append("(Empty message body)\n");
            }
            return createSimplePdf(sb.toString());
        } catch (Exception e) {
            log.error("Failed to generate fallback email PDF: {}", e.getMessage(), e);
            return createSimplePdf("Email Subject: " + email.subject());
        }
    }

    private byte[] createSimplePdf(String text) {
        String escaped = text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)");
        String[] lines = escaped.split("\n");
        StringBuilder stream = new StringBuilder();
        stream.append("BT\n/F1 9 Tf\n50 740 Td\n13 TL\n");
        for (String line : lines) {
            String l = line.length() > 95 ? line.substring(0, 92) + "..." : line;
            stream.append("(").append(l).append(") '\n");
        }
        stream.append("ET\n");

        byte[] streamBytes = stream.toString().getBytes(StandardCharsets.ISO_8859_1);
        int streamLen = streamBytes.length;

        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try {
            out.write("%PDF-1.4\n".getBytes(StandardCharsets.US_ASCII));
            List<Integer> offsets = new ArrayList<>();
            offsets.add(out.size());
            out.write("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n".getBytes(StandardCharsets.US_ASCII));
            offsets.add(out.size());
            out.write("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n".getBytes(StandardCharsets.US_ASCII));
            offsets.add(out.size());
            out.write("3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n".getBytes(StandardCharsets.US_ASCII));
            offsets.add(out.size());
            out.write("4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n".getBytes(StandardCharsets.US_ASCII));
            offsets.add(out.size());
            out.write(("5 0 obj\n<< /Length " + streamLen + " >>\nstream\n").getBytes(StandardCharsets.US_ASCII));
            out.write(streamBytes);
            out.write("\nendstream\nendobj\n".getBytes(StandardCharsets.US_ASCII));
            int xrefOffset = out.size();
            out.write("xref\n0 6\n0000000000 65535 f \n".getBytes(StandardCharsets.US_ASCII));
            for (int offset : offsets) {
                out.write(String.format("%010d 00000 n \n", offset).getBytes(StandardCharsets.US_ASCII));
            }
            out.write(("trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n" + xrefOffset + "\n%%EOF\n").getBytes(StandardCharsets.US_ASCII));
        } catch (Exception ignored) {
        }
        return out.toByteArray();
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
