package com.example.heliosdocument.controller;

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
import com.example.heliosdocument.model.TemplateFieldDto;
import com.example.heliosdocument.model.UpdateFieldMappingsRequest;
import com.example.heliosdocument.service.TemplateIngestionService;
import com.example.heliosdocument.service.TemplateRenderService;

@RestController
@RequestMapping("/api/v1/templates")
@CrossOrigin(origins = "*")
public class TemplateAdminController {

    private static final Logger log = LoggerFactory.getLogger(TemplateAdminController.class);

    private final TemplateIngestionService ingestionService;
    private final TemplateRenderService renderService;

    public TemplateAdminController(TemplateIngestionService ingestionService, TemplateRenderService renderService) {
        this.ingestionService = ingestionService;
        this.renderService = renderService;
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
     * Upload and ingest a Word (.docx) template:
     * - Scans & converts legacy mustache tags to Word MERGEFIELDs
     * - Discovers all unique fields
     * - Saves template file binary & fields into SQL Server
     * - Returns discovered fields & template metadata
     */
    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<DocumentTemplateDto> uploadTemplate(
            @RequestParam("file") MultipartFile file,
            @RequestParam("templateName") String templateName,
            @RequestParam(value = "endorsementId", required = false) Integer endorsementId,
            @RequestParam(value = "description", required = false) String description,
            @RequestHeader(value = "X-Tenant-Id", required = false) String tenantHeader
    ) {
        int tenantId = resolveTenantId(tenantHeader);
        try {
            if (file == null || file.isEmpty()) {
                return ResponseEntity.badRequest().build();
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
            return ResponseEntity.internalServerError().build();
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
     * List existing endorsements for mapping selection
     */
    @GetMapping("/endorsements")
    public ResponseEntity<List<Map<String, Object>>> listEndorsements(
            @RequestHeader(value = "X-Tenant-Id", required = false) String tenantHeader
    ) {
        int tenantId = resolveTenantId(tenantHeader);
        return ResponseEntity.ok(ingestionService.listEndorsements(tenantId));
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

