package com.example.heliosdocument.controller;

import java.io.IOException;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.example.heliosdocument.model.AttachDocumentRequest;
import com.example.heliosdocument.model.CreateSubmissionFromDocRequest;
import com.example.heliosdocument.model.DocumentDto;
import com.example.heliosdocument.model.GenerateDocumentRequest;
import com.example.heliosdocument.model.IncomingDocumentDto;
import com.example.heliosdocument.service.DocumentService;
import com.example.heliosdocument.service.DocumentStorageService;
import com.example.heliosdocument.service.IncomingDocumentService;

@RestController
@RequestMapping("/api/v1/documents")
@CrossOrigin(origins = "*")
public class DocumentController {

    private static final Logger log = LoggerFactory.getLogger(DocumentController.class);

    private final DocumentService documentService;
    private final DocumentStorageService storageService;
    private final IncomingDocumentService incomingDocumentService;

    public DocumentController(
            DocumentService documentService,
            DocumentStorageService storageService,
            IncomingDocumentService incomingDocumentService) {
        this.documentService = documentService;
        this.storageService = storageService;
        this.incomingDocumentService = incomingDocumentService;
    }

    // ========================================================================
    // 1. GENERATED / FORMAL REPOSITORY DOCUMENTS
    // ========================================================================

    @PostMapping("/generate")
    public ResponseEntity<DocumentDto> generate(
            @RequestHeader(name = "X-Tenant-ID", required = false) Integer headerTenantId,
            @RequestBody GenerateDocumentRequest req) {

        int tenantId = (req.tenantId() != null && req.tenantId() > 0)
                ? req.tenantId()
                : (headerTenantId != null && headerTenantId > 0) ? headerTenantId : 1;

        GenerateDocumentRequest effectiveReq = new GenerateDocumentRequest(
                tenantId,
                req.entityType(),
                req.entityId(),
                req.entityNbr(),
                req.docType(),
                req.docTitle(),
                req.insuredName(),
                req.insuredAddress(),
                req.productType(),
                req.underwriterName(),
                req.effectiveDate(),
                req.expirationDate(),
                req.retroactiveDate(),
                req.limitAmount(),
                req.retentionAmount(),
                req.premiumAmount(),
                req.agencyInfo(),
                req.serffTrackingNumber(),
                req.baseRate(),
                req.scheduleMod(),
                req.calculationTrace(),
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

        DocumentDto generated = documentService.generateAndSave(effectiveReq);
        return ResponseEntity.status(HttpStatus.CREATED).body(generated);
    }

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<DocumentDto> uploadDocument(
            @RequestHeader(name = "X-Tenant-ID", required = false) Integer headerTenantId,
            @RequestParam(name = "tenantId", required = false) Integer queryTenantId,
            @RequestParam(name = "entityType", required = false) String entityType,
            @RequestParam(name = "entityId", required = false) String rawEntityId,
            @RequestParam(name = "entityNbr", required = false) String entityNbr,
            @RequestParam(name = "docType", required = false, defaultValue = "OTHER") String docType,
            @RequestParam(name = "docTitle", required = false) String docTitle,
            @RequestParam(name = "uploadedBy", required = false, defaultValue = "CLIENT_UPLOAD") String uploadedBy,
            @RequestParam("file") MultipartFile file) {

        int tenantId = (queryTenantId != null && queryTenantId > 0)
                ? queryTenantId
                : (headerTenantId != null && headerTenantId > 0) ? headerTenantId : 1;

        int safeEntityId = 0;
        String effectiveEntityNbr = entityNbr;
        if (rawEntityId != null && !rawEntityId.isBlank()) {
            try {
                safeEntityId = Integer.parseInt(rawEntityId.trim());
            } catch (NumberFormatException e) {
                if (effectiveEntityNbr == null || effectiveEntityNbr.isBlank()) {
                    effectiveEntityNbr = rawEntityId.trim();
                }
                String digits = rawEntityId.replaceAll("[^0-9]", "");
                if (!digits.isEmpty()) {
                    try {
                        safeEntityId = Integer.parseInt(digits.length() > 9 ? digits.substring(digits.length() - 9) : digits);
                    } catch (Exception ignored) {}
                }
            }
        }

        String safeEntityType = (entityType != null && !entityType.isBlank()) ? entityType : "POLICY";

        try {
            DocumentDto uploaded = documentService.uploadAndSave(
                    tenantId,
                    safeEntityType,
                    safeEntityId,
                    effectiveEntityNbr,
                    docType,
                    docTitle,
                    uploadedBy,
                    file
            );
            return ResponseEntity.status(HttpStatus.CREATED).body(uploaded);
        } catch (Exception e) {
            log.error("Failed to upload document: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping
    public List<DocumentDto> getDocuments(
            @RequestHeader(name = "X-Tenant-ID", required = false) Integer headerTenantId,
            @RequestParam(name = "tenantId", required = false) Integer queryTenantId,
            @RequestParam(name = "entityType", required = false) String entityType,
            @RequestParam(name = "entityId", required = false) String rawEntityId,
            @RequestParam(name = "entityNbr", required = false) String entityNbr,
            @RequestParam(name = "docType", required = false) String docType) {

        int tenantId = (queryTenantId != null && queryTenantId > 0)
                ? queryTenantId
                : (headerTenantId != null && headerTenantId > 0) ? headerTenantId : 1;

        Integer entityId = null;
        String effectiveEntityNbr = entityNbr;
        if (rawEntityId != null && !rawEntityId.isBlank()) {
            try {
                entityId = Integer.valueOf(rawEntityId.trim());
            } catch (NumberFormatException e) {
                if (effectiveEntityNbr == null || effectiveEntityNbr.isBlank()) {
                    effectiveEntityNbr = rawEntityId.trim();
                }
                String digits = rawEntityId.replaceAll("[^0-9]", "");
                if (!digits.isEmpty()) {
                    try {
                        entityId = Integer.valueOf(digits.length() > 9 ? digits.substring(digits.length() - 9) : digits);
                    } catch (Exception ignored) {}
                }
            }
        }

        return documentService.getDocuments(tenantId, entityType, entityId, effectiveEntityNbr, docType);
    }

    @GetMapping("/{documentId}")
    public ResponseEntity<DocumentDto> getDocument(
            @RequestHeader(name = "X-Tenant-ID", required = false) Integer headerTenantId,
            @RequestParam(name = "tenantId", required = false) Integer queryTenantId,
            @PathVariable("documentId") int documentId) {

        int tenantId = (queryTenantId != null && queryTenantId > 0)
                ? queryTenantId
                : (headerTenantId != null && headerTenantId > 0) ? headerTenantId : 1;

        return documentService.getDocumentById(tenantId, documentId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{documentId}/download")
    public ResponseEntity<Resource> download(
            @RequestHeader(name = "X-Tenant-ID", required = false) Integer headerTenantId,
            @RequestParam(name = "tenantId", required = false) Integer queryTenantId,
            @PathVariable("documentId") int documentId) {

        int tenantId = (queryTenantId != null && queryTenantId > 0)
                ? queryTenantId
                : (headerTenantId != null && headerTenantId > 0) ? headerTenantId : 1;

        return documentService.getDocumentById(tenantId, documentId)
                .map(doc -> {
                    try {
                        Resource resource = storageService.loadDocumentAsResource(doc.filePath());
                        MediaType mediaType = MediaType.APPLICATION_PDF;
                        if (doc.mimeType() != null) {
                            try {
                                mediaType = MediaType.parseMediaType(doc.mimeType());
                            } catch (Exception ignored) {}
                        }
                        return ResponseEntity.ok()
                                .contentType(mediaType)
                                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + doc.fileName() + "\"")
                                .body(resource);
                    } catch (IOException e) {
                        log.error("Failed to stream document {}: {}", documentId, e.getMessage());
                        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).<Resource>build();
                    }
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{documentId}/preview")
    public ResponseEntity<Resource> preview(
            @RequestHeader(name = "X-Tenant-ID", required = false) Integer headerTenantId,
            @RequestParam(name = "tenantId", required = false) Integer queryTenantId,
            @PathVariable("documentId") int documentId) {

        int tenantId = (queryTenantId != null && queryTenantId > 0)
                ? queryTenantId
                : (headerTenantId != null && headerTenantId > 0) ? headerTenantId : 1;

        return documentService.getDocumentById(tenantId, documentId)
                .map(doc -> {
                    try {
                        Resource resource = storageService.loadDocumentAsResource(doc.filePath());
                        MediaType mediaType = MediaType.APPLICATION_PDF;
                        if (doc.mimeType() != null) {
                            try {
                                mediaType = MediaType.parseMediaType(doc.mimeType());
                            } catch (Exception ignored) {}
                        }
                        return ResponseEntity.ok()
                                .contentType(mediaType)
                                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + doc.fileName() + "\"")
                                .body(resource);
                    } catch (IOException e) {
                        log.error("Failed to stream document {}: {}", documentId, e.getMessage());
                        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).<Resource>build();
                    }
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{documentId}")
    public ResponseEntity<Map<String, Object>> deleteDocument(
            @RequestHeader(name = "X-Tenant-ID", required = false) Integer headerTenantId,
            @RequestParam(name = "tenantId", required = false) Integer queryTenantId,
            @PathVariable("documentId") int documentId) {

        int tenantId = (queryTenantId != null && queryTenantId > 0)
                ? queryTenantId
                : (headerTenantId != null && headerTenantId > 0) ? headerTenantId : 1;

        boolean ok = documentService.deleteDocument(tenantId, documentId);
        return ResponseEntity.ok(Map.of("success", ok, "documentId", documentId));
    }

    // ========================================================================
    // 2. INCOMING / QUEUED INBOX DOCUMENTS WORKFLOW
    // ========================================================================

    @GetMapping("/incoming")
    public List<IncomingDocumentDto> getIncomingDocuments(
            @RequestHeader(name = "X-Tenant-ID", required = false) Integer headerTenantId,
            @RequestParam(name = "tenantId", required = false) Integer queryTenantId,
            @RequestParam(name = "status", required = false) String status,
            @RequestParam(name = "groupName", required = false) String groupName) {

        int tenantId = (queryTenantId != null && queryTenantId > 0)
                ? queryTenantId
                : (headerTenantId != null && headerTenantId > 0) ? headerTenantId : 1;

        return incomingDocumentService.getIncomingDocuments(tenantId, status, groupName);
    }

    @GetMapping("/incoming/{incomingId}")
    public ResponseEntity<IncomingDocumentDto> getIncomingDocument(
            @RequestHeader(name = "X-Tenant-ID", required = false) Integer headerTenantId,
            @RequestParam(name = "tenantId", required = false) Integer queryTenantId,
            @PathVariable("incomingId") int incomingId) {

        int tenantId = (queryTenantId != null && queryTenantId > 0)
                ? queryTenantId
                : (headerTenantId != null && headerTenantId > 0) ? headerTenantId : 1;

        return incomingDocumentService.getIncomingDocumentById(tenantId, incomingId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/incoming/{incomingId}/preview")
    public ResponseEntity<Resource> previewIncomingDocument(
            @RequestHeader(name = "X-Tenant-ID", required = false) Integer headerTenantId,
            @RequestParam(name = "tenantId", required = false) Integer queryTenantId,
            @PathVariable("incomingId") int incomingId) {

        int tenantId = (queryTenantId != null && queryTenantId > 0)
                ? queryTenantId
                : (headerTenantId != null && headerTenantId > 0) ? headerTenantId : 1;

        return incomingDocumentService.getIncomingDocumentById(tenantId, incomingId)
                .map(doc -> {
                    try {
                        Resource resource = incomingDocumentService.loadIncomingFileResource(tenantId, incomingId);
                        MediaType mediaType = MediaType.APPLICATION_PDF;
                        if (doc.mimeType() != null) {
                            try {
                                mediaType = MediaType.parseMediaType(doc.mimeType());
                            } catch (Exception ignored) {}
                        }
                        return ResponseEntity.ok()
                                .contentType(mediaType)
                                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + doc.fileName() + "\"")
                                .body(resource);
                    } catch (IOException e) {
                        log.error("Failed to stream incoming document {}: {}", incomingId, e.getMessage());
                        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).<Resource>build();
                    }
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/incoming/{incomingId}/download")
    public ResponseEntity<Resource> downloadIncomingDocument(
            @RequestHeader(name = "X-Tenant-ID", required = false) Integer headerTenantId,
            @RequestParam(name = "tenantId", required = false) Integer queryTenantId,
            @PathVariable("incomingId") int incomingId) {

        int tenantId = (queryTenantId != null && queryTenantId > 0)
                ? queryTenantId
                : (headerTenantId != null && headerTenantId > 0) ? headerTenantId : 1;

        return incomingDocumentService.getIncomingDocumentById(tenantId, incomingId)
                .map(doc -> {
                    try {
                        Resource resource = incomingDocumentService.loadIncomingFileResource(tenantId, incomingId);
                        MediaType mediaType = MediaType.APPLICATION_OCTET_STREAM;
                        if (doc.mimeType() != null) {
                            try {
                                mediaType = MediaType.parseMediaType(doc.mimeType());
                            } catch (Exception ignored) {}
                        }
                        return ResponseEntity.ok()
                                .contentType(mediaType)
                                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + doc.fileName() + "\"")
                                .body(resource);
                    } catch (IOException e) {
                        log.error("Failed to download incoming document {}: {}", incomingId, e.getMessage());
                        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).<Resource>build();
                    }
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/incoming/scan")
    public ResponseEntity<Map<String, Object>> triggerInboxScan(
            @RequestHeader(name = "X-Tenant-ID", required = false) Integer headerTenantId,
            @RequestParam(name = "tenantId", required = false) Integer queryTenantId) {

        int tenantId = (queryTenantId != null && queryTenantId > 0)
                ? queryTenantId
                : (headerTenantId != null && headerTenantId > 0) ? headerTenantId : 1;

        int processed = incomingDocumentService.scanTenantInbox(tenantId);
        return ResponseEntity.ok(Map.of(
                "success", true,
                "tenantId", tenantId,
                "processedCount", processed,
                "timestamp", java.time.LocalDateTime.now().toString()
        ));
    }

    @PostMapping("/incoming/{incomingId}/attach")
    public ResponseEntity<IncomingDocumentDto> attachIncomingDocument(
            @RequestHeader(name = "X-Tenant-ID", required = false) Integer headerTenantId,
            @RequestParam(name = "tenantId", required = false) Integer queryTenantId,
            @PathVariable("incomingId") int incomingId,
            @RequestBody AttachDocumentRequest req) {

        int tenantId = (queryTenantId != null && queryTenantId > 0)
                ? queryTenantId
                : (headerTenantId != null && headerTenantId > 0) ? headerTenantId : 1;

        IncomingDocumentDto attached = incomingDocumentService.attachDocument(tenantId, incomingId, req);
        return ResponseEntity.ok(attached);
    }

    @PostMapping("/incoming/{incomingId}/create-submission")
    public ResponseEntity<Map<String, Object>> createSubmissionAndAttach(
            @RequestHeader(name = "X-Tenant-ID", required = false) Integer headerTenantId,
            @RequestParam(name = "tenantId", required = false) Integer queryTenantId,
            @PathVariable("incomingId") int incomingId,
            @RequestBody CreateSubmissionFromDocRequest req) {

        int tenantId = (queryTenantId != null && queryTenantId > 0)
                ? queryTenantId
                : (headerTenantId != null && headerTenantId > 0) ? headerTenantId : 1;

        Map<String, Object> result = incomingDocumentService.createSubmissionAndAttach(tenantId, incomingId, req);
        return ResponseEntity.status(HttpStatus.CREATED).body(result);
    }

    @DeleteMapping("/incoming/{incomingId}")
    public ResponseEntity<Map<String, Object>> discardIncomingDocument(
            @RequestHeader(name = "X-Tenant-ID", required = false) Integer headerTenantId,
            @RequestParam(name = "tenantId", required = false) Integer queryTenantId,
            @PathVariable("incomingId") int incomingId) {

        int tenantId = (queryTenantId != null && queryTenantId > 0)
                ? queryTenantId
                : (headerTenantId != null && headerTenantId > 0) ? headerTenantId : 1;

        boolean ok = incomingDocumentService.discardDocument(tenantId, incomingId);
        return ResponseEntity.ok(Map.of("success", ok, "incomingId", incomingId));
    }

    // ========================================================================
    // 3. SERVICE DIAGNOSTICS
    // ========================================================================

    @GetMapping("/diagnostics")
    public ResponseEntity<Map<String, Object>> getDiagnostics(
            @RequestHeader(name = "X-Tenant-ID", required = false) Integer headerTenantId,
            @RequestParam(name = "tenantId", required = false) Integer queryTenantId) {

        int tenantId = (queryTenantId != null && queryTenantId > 0)
                ? queryTenantId
                : (headerTenantId != null && headerTenantId > 0) ? headerTenantId : 1;

        Runtime rt = Runtime.getRuntime();
        long totalMem = rt.totalMemory();
        long freeMem = rt.freeMemory();
        long maxMem = rt.maxMemory();

        Map<String, Object> map = new LinkedHashMap<>();
        map.put("service", "Helios Document Repository & Lifecycle Microservice");
        map.put("shortName", "Document");
        map.put("status", "UP");
        map.put("version", "0.1.0-SNAPSHOT");
        map.put("serverTime", java.time.LocalDateTime.now().toString());
        map.put("storagePath", storageService.getRootStoragePath().toString());
        map.put("storagePathExists", java.nio.file.Files.exists(storageService.getRootStoragePath()));
        map.put("documentsIssuedCount", documentService.getDocuments(tenantId, null, null, null).size());
        map.put("incomingQueuedCount", incomingDocumentService.getIncomingDocuments(tenantId, "QUEUED", null).size());
        map.put("incomingTotalCount", incomingDocumentService.getIncomingDocuments(tenantId, null, null).size());
        map.put("activeTenantId", tenantId);
        map.put("usedMemoryMb", (totalMem - freeMem) / (1024 * 1024));
        map.put("totalMemoryMb", totalMem / (1024 * 1024));
        map.put("maxMemoryMb", maxMem / (1024 * 1024));
        map.put("availableProcessors", rt.availableProcessors());
        map.put("activeThreads", Thread.activeCount());

        return ResponseEntity.ok(map);
    }
}
