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

import com.example.heliosdocument.model.DocumentDto;
import com.example.heliosdocument.model.GenerateDocumentRequest;
import com.example.heliosdocument.service.DocumentService;
import com.example.heliosdocument.service.DocumentStorageService;

@RestController
@RequestMapping("/api/v1/documents")
@CrossOrigin(origins = "*")
public class DocumentController {

    private static final Logger log = LoggerFactory.getLogger(DocumentController.class);

    private final DocumentService documentService;
    private final DocumentStorageService storageService;

    public DocumentController(DocumentService documentService, DocumentStorageService storageService) {
        this.documentService = documentService;
        this.storageService = storageService;
    }

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
                req.signatoryTitle()
        );

        DocumentDto generated = documentService.generateAndSave(effectiveReq);
        return ResponseEntity.status(HttpStatus.CREATED).body(generated);
    }

    @GetMapping
    public List<DocumentDto> getDocuments(
            @RequestHeader(name = "X-Tenant-ID", required = false) Integer headerTenantId,
            @RequestParam(name = "tenantId", required = false) Integer queryTenantId,
            @RequestParam(name = "entityType", required = false) String entityType,
            @RequestParam(name = "entityId", required = false) Integer entityId,
            @RequestParam(name = "docType", required = false) String docType) {

        int tenantId = (queryTenantId != null && queryTenantId > 0)
                ? queryTenantId
                : (headerTenantId != null && headerTenantId > 0) ? headerTenantId : 1;

        return documentService.getDocuments(tenantId, entityType, entityId, docType);
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
                        return ResponseEntity.ok()
                                .contentType(MediaType.APPLICATION_PDF)
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
                        return ResponseEntity.ok()
                                .contentType(MediaType.APPLICATION_PDF)
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
        map.put("pdfGeneratorEngine", "Delegated to DocGen Engine (Port 8088)");
        map.put("serverTime", java.time.LocalDateTime.now().toString());
        map.put("storagePath", storageService.getRootStoragePath().toString());
        map.put("storagePathExists", java.nio.file.Files.exists(storageService.getRootStoragePath()));
        map.put("documentsIssuedCount", documentService.getDocuments(tenantId, null, null, null).size());
        map.put("activeTenantId", tenantId);
        map.put("usedMemoryMb", (totalMem - freeMem) / (1024 * 1024));
        map.put("totalMemoryMb", totalMem / (1024 * 1024));
        map.put("maxMemoryMb", maxMem / (1024 * 1024));
        map.put("availableProcessors", rt.availableProcessors());
        map.put("activeThreads", Thread.activeCount());

        return ResponseEntity.ok(map);
    }
}

