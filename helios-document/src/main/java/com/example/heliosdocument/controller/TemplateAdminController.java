package com.example.heliosdocument.controller;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.example.heliosdocument.model.DocumentTemplateDto;
import com.example.heliosdocument.model.EndorsementDefinitionDto;
import com.example.heliosdocument.model.TemplateFieldDto;
import com.example.heliosdocument.model.TemplateUploadRequestDTO;
import com.example.heliosdocument.model.TemplateVersionDto;
import com.example.heliosdocument.model.UpdateFieldMappingsRequest;
import com.example.heliosdocument.service.EndorsementTemplateService;
import com.example.heliosdocument.service.TemplateIngestionService;
import com.example.heliosdocument.service.TemplateRenderService;

@RestController
@RequestMapping("/api/v1/templates")
@CrossOrigin(origins = "*")
public class TemplateAdminController {

    private static final Logger log = LoggerFactory.getLogger(TemplateAdminController.class);

    private final TemplateIngestionService ingestionService;
    private final TemplateRenderService renderService;
    private final EndorsementTemplateService endorsementTemplateService;

    public TemplateAdminController(
            TemplateIngestionService ingestionService,
            TemplateRenderService renderService,
            EndorsementTemplateService endorsementTemplateService
    ) {
        this.ingestionService = ingestionService;
        this.renderService = renderService;
        this.endorsementTemplateService = endorsementTemplateService;
    }

    private int resolveTenantId(String headerVal) {
        if (headerVal == null || headerVal.isBlank()) return 1;
        try {
            return Integer.parseInt(headerVal.trim());
        } catch (NumberFormatException e) {
            return 1;
        }
    }

    /**
     * Upload and ingest a Word (.docx) template (Legacy endpoint):
     * - Scans & converts legacy mustache tags to Word MERGEFIELDs
     * - Discovers all unique fields
     * - Streams binary to StorageService & saves metadata in SQL Server
     * - Returns discovered fields & template metadata
     */
    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> uploadTemplate(
            @RequestParam("file") MultipartFile file,
            @RequestParam("templateName") String templateName,
            @RequestParam(value = "endorsementId", required = false) Integer endorsementId,
            @RequestParam(value = "description", required = false) String description,
            @RequestParam(value = "mode", required = false) String mode,
            @RequestHeader(value = "X-Tenant-Id", required = false) String tenantHeader
    ) {
        int tenantId = resolveTenantId(tenantHeader);
        try {
            if (file == null || file.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "File is empty or missing."));
            }

            // If mode is specified, route through EndorsementTemplateService
            if (mode != null && !mode.isBlank()) {
                TemplateUploadRequestDTO req = new TemplateUploadRequestDTO();
                req.setFile(file);
                req.setTemplateName(templateName);
                req.setDescription(description);
                req.setMode(mode);
                if (endorsementId != null) {
                    req.setEndorsementId(String.valueOf(endorsementId));
                }
                TemplateVersionDto vDto = endorsementTemplateService.uploadAndVersionTemplate(tenantId, req);
                return ResponseEntity.status(HttpStatus.CREATED).body(vDto);
            }

            DocumentTemplateDto dto = ingestionService.ingestTemplate(
                    tenantId,
                    endorsementId,
                    templateName,
                    file.getOriginalFilename(),
                    description,
                    file.getBytes()
            );

            return ResponseEntity.status(HttpStatus.CREATED).body(dto);
        } catch (Exception e) {
            log.error("Failed to ingest template: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Versioned template upload endpoint:
     * Supports mode = 'NEW_ENDORSEMENT' or 'EXISTING_ENDORSEMENT'
     * Automatically increments versions, supersedes old versions, and provides compensating file rollback.
     */
    @PostMapping(value = "/upload-versioned", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> uploadVersionedTemplate(
            @ModelAttribute TemplateUploadRequestDTO request,
            @RequestHeader(value = "X-Tenant-Id", required = false) String tenantHeader
    ) {
        int tenantId = resolveTenantId(tenantHeader);
        try {
            if (request.getFile() == null || request.getFile().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "File cannot be empty."));
            }

            TemplateVersionDto result = endorsementTemplateService.uploadAndVersionTemplate(tenantId, request);
            return ResponseEntity.status(HttpStatus.CREATED).body(result);
        } catch (IllegalArgumentException e) {
            log.warn("Validation error on upload-versioned: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            log.error("Failed to upload versioned template: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * List all uploaded templates
     */
    @GetMapping
    public ResponseEntity<List<DocumentTemplateDto>> listTemplates(
            @RequestHeader(value = "X-Tenant-Id", required = false) String tenantHeader
    ) {
        int tenantId = resolveTenantId(tenantHeader);
        return ResponseEntity.ok(ingestionService.listTemplates(tenantId));
    }

    /**
     * Get a specific template with its fields
     */
    @GetMapping("/{templateId}")
    public ResponseEntity<DocumentTemplateDto> getTemplate(
            @PathVariable("templateId") int templateId,
            @RequestHeader(value = "X-Tenant-Id", required = false) String tenantHeader
    ) {
        int tenantId = resolveTenantId(tenantHeader);
        return ResponseEntity.ok(ingestionService.getTemplateById(tenantId, templateId));
    }

    /**
     * Get extracted fields for a template
     */
    @GetMapping("/{templateId}/fields")
    public ResponseEntity<List<TemplateFieldDto>> getTemplateFields(
            @PathVariable("templateId") int templateId,
            @RequestHeader(value = "X-Tenant-Id", required = false) String tenantHeader
    ) {
        int tenantId = resolveTenantId(tenantHeader);
        return ResponseEntity.ok(ingestionService.getFieldsForTemplate(tenantId, templateId));
    }

    /**
     * Update database data column mappings for discovered fields
     */
    @PutMapping("/{templateId}/fields")
    public ResponseEntity<Void> updateFieldMappings(
            @PathVariable("templateId") int templateId,
            @RequestBody UpdateFieldMappingsRequest request,
            @RequestHeader(value = "X-Tenant-Id", required = false) String tenantHeader
    ) {
        int tenantId = resolveTenantId(tenantHeader);
        ingestionService.updateFieldMappings(tenantId, templateId, request);
        return ResponseEntity.noContent().build();
    }

    /**
     * List existing endorsements for mapping selection.
     * Returns rich endorsement definitions with current template metadata,
     * maintaining backward compatibility for frontend components.
     */
    @GetMapping("/endorsements")
    public ResponseEntity<List<Map<String, Object>>> listEndorsements(
            @RequestHeader(value = "X-Tenant-Id", required = false) String tenantHeader
    ) {
        int tenantId = resolveTenantId(tenantHeader);
        List<EndorsementDefinitionDto> list = endorsementTemplateService.listEndorsements(tenantId);
        
        List<Map<String, Object>> response = new ArrayList<>();
        for (EndorsementDefinitionDto e : list) {
            Map<String, Object> map = new LinkedHashMap<>();
            // Modern fields
            map.put("endorsementId", e.endorsementId());
            map.put("endorsementCode", e.endorsementCode());
            map.put("endorsementName", e.endorsementName());
            map.put("description", e.description());
            map.put("lineOfBusiness", e.lineOfBusiness());
            map.put("isMandatory", e.isMandatory());
            map.put("createdAt", e.createdAt());
            map.put("updatedAt", e.updatedAt());
            map.put("currentTemplateId", e.currentTemplateId());
            map.put("currentVersionNumber", e.currentVersionNumber());
            map.put("currentEditionDate", e.currentEditionDate());
            map.put("currentStatus", e.currentStatus());
            map.put("currentRelativePath", e.currentRelativePath());
            map.put("currentOutputFormat", e.currentOutputFormat());

            // Backward compatibility aliases
            map.put("ENDORSEMENT_ID", e.endorsementId());
            map.put("ENDORSEMENT_NBR", e.endorsementCode());
            map.put("ENDORSEMENT_TITLE", e.endorsementName());
            map.put("DESCRIPTION", e.description());
            map.put("LINE_OF_BUSINESS", e.lineOfBusiness());
            map.put("STATUS", e.currentStatus() != null ? e.currentStatus() : "ACTIVE");

            response.add(map);
        }

        // If mstr is completely empty, fallback to legacy query so old data isn't lost
        if (response.isEmpty()) {
            return ResponseEntity.ok(ingestionService.listEndorsements(tenantId));
        }

        return ResponseEntity.ok(response);
    }

    /**
     * Retrieve version history for a specific endorsement
     */
    @GetMapping("/endorsements/{endorsementId}/versions")
    public ResponseEntity<List<TemplateVersionDto>> getEndorsementVersions(
            @PathVariable("endorsementId") String endorsementId,
            @RequestHeader(value = "X-Tenant-Id", required = false) String tenantHeader
    ) {
        int tenantId = resolveTenantId(tenantHeader);
        return ResponseEntity.ok(endorsementTemplateService.getEndorsementVersions(tenantId, endorsementId));
    }

    /**
     * Download physical Word (.docx) file for a specific template version
     */
    @GetMapping("/versions/{templateId}/download")
    public ResponseEntity<byte[]> downloadTemplateVersion(
            @PathVariable("templateId") String templateId,
            @RequestHeader(value = "X-Tenant-Id", required = false) String tenantHeader
    ) {
        int tenantId = resolveTenantId(tenantHeader);
        try {
            EndorsementTemplateService.DownloadResult result = endorsementTemplateService.downloadTemplateVersion(tenantId, templateId);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.wordprocessingml.document"));
            headers.setContentDispositionFormData("attachment", result.fileName());
            headers.setContentLength(result.data().length);

            return new ResponseEntity<>(result.data(), headers, HttpStatus.OK);
        } catch (Exception e) {
            log.error("Failed to download template version {}: {}", templateId, e.getMessage(), e);
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Render the template into a live PDF download:
     * Mail merges dynamic values and executes regions, streaming application/pdf
     */
    @GetMapping(value = "/{templateId}/render", produces = MediaType.APPLICATION_PDF_VALUE)
    public ResponseEntity<byte[]> renderTemplatePdf(
            @PathVariable("templateId") int templateId,
            @RequestParam(value = "entityId", required = false) Integer entityId,
            @RequestParam(value = "entityType", defaultValue = "ENDORSEMENT") String entityType,
            @RequestHeader(value = "X-Tenant-Id", required = false) String tenantHeader
    ) {
        int tenantId = resolveTenantId(tenantHeader);
        try {
            TemplateRenderService.RenderResult result = renderService.renderTemplateToPdf(
                    tenantId, templateId, entityId, entityType);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            headers.setContentDispositionFormData("attachment", result.fileName());
            headers.setContentLength(result.pdfBytes().length);

            return new ResponseEntity<>(result.pdfBytes(), headers, HttpStatus.OK);
        } catch (Exception e) {
            log.error("Failed to render PDF for template ID {}: {}", templateId, e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }
}
