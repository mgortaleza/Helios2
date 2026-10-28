package com.example.heliosdocument.controller;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.format.annotation.DateTimeFormat;
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

import com.example.heliosdocument.model.DecPageGenerateTestRequest;
import com.example.heliosdocument.model.DecPageTemplateDto;
import com.example.heliosdocument.model.DecPageTemplateFieldDto;
import com.example.heliosdocument.service.DecPageTemplateService;

@RestController
@RequestMapping("/api/v1/dec-page-templates")
@CrossOrigin(origins = "*", exposedHeaders = {"Content-Range", "X-Total-Count"})
public class DecPageTemplateController {

    private static final Logger log = LoggerFactory.getLogger(DecPageTemplateController.class);

    private final DecPageTemplateService service;

    public DecPageTemplateController(DecPageTemplateService service) {
        this.service = service;
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
     * Requirement 3: Ingest Word (.docx) Declaration Page template:
     * Receives metadata and multipart file in a single request.
     * Scans DOCX stream using Aspose.Words & IReplacingCallback for << >> tags.
     * Saves file to local disk, stores path and metadata, and saves extracted fields.
     */
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> uploadAndIngestTemplate(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "form_id", required = false) String formIdSnake,
            @RequestParam(value = "formId", required = false) String formIdCamel,
            @RequestParam(value = "form_revision", required = false) String formRevSnake,
            @RequestParam(value = "formRevision", required = false) String formRevCamel,
            @RequestParam(value = "form_name", required = false) String formNameSnake,
            @RequestParam(value = "formName", required = false) String formNameCamel,
            @RequestParam(value = "effective_date", required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate effectiveDateSnake,
            @RequestParam(value = "effectiveDate", required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate effectiveDateCamel,
            @RequestParam(value = "product_id", required = false) Integer productIdSnake,
            @RequestParam(value = "productId", required = false) Integer productIdCamel,
            @RequestHeader(value = "X-Tenant-Id", required = false) String tenantHeader
    ) {
        int tenantId = resolveTenantId(tenantHeader);
        String formId = formIdSnake != null ? formIdSnake : formIdCamel;
        String formRevision = formRevSnake != null ? formRevSnake : formRevCamel;
        String formName = formNameSnake != null ? formNameSnake : formNameCamel;
        LocalDate effectiveDate = effectiveDateSnake != null ? effectiveDateSnake : effectiveDateCamel;
        Integer productId = productIdSnake != null ? productIdSnake : productIdCamel;

        if (file == null || file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Multipart file is missing or empty."));
        }
        if (formId == null || formId.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "form_id is required."));
        }
        if (formRevision == null || formRevision.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "form_revision is required."));
        }
        if (formName == null || formName.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "form_name is required."));
        }

        try {
            DecPageTemplateDto created = service.ingestTemplate(
                    tenantId, file, formId, formRevision, formName, effectiveDate, productId);
            return ResponseEntity.status(HttpStatus.CREATED).body(created);
        } catch (IllegalArgumentException e) {
            log.warn("Validation error on template ingestion: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            log.error("Failed to ingest Dec Page template: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(Map.of("error", "Ingestion failed: " + e.getMessage()));
        }
    }

    /**
     * List all DecPage templates for current tenant (React-admin compatible).
     */
    @GetMapping
    public ResponseEntity<List<DecPageTemplateDto>> listTemplates(
            @RequestHeader(value = "X-Tenant-Id", required = false) String tenantHeader
    ) {
        int tenantId = resolveTenantId(tenantHeader);
        List<DecPageTemplateDto> list = service.listTemplates(tenantId);

        HttpHeaders headers = new HttpHeaders();
        int total = list.size();
        headers.add("Content-Range", "dec-page-templates 0-" + (total > 0 ? total - 1 : 0) + "/" + total);
        headers.add("X-Total-Count", String.valueOf(total));
        headers.add("Access-Control-Expose-Headers", "Content-Range, X-Total-Count");

        return new ResponseEntity<>(list, headers, HttpStatus.OK);
    }

    /**
     * Get specific template by ID.
     */
    @GetMapping("/{id}")
    public ResponseEntity<?> getTemplate(
            @PathVariable("id") Long id,
            @RequestHeader(value = "X-Tenant-Id", required = false) String tenantHeader
    ) {
        int tenantId = resolveTenantId(tenantHeader);
        return service.getTemplateById(tenantId, id)
                .<ResponseEntity<?>>map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "Dec Page Template #" + id + " not found.")));
    }

    /**
     * Requirement 2: Fetch extracted fields for a template.
     */
    @GetMapping("/{id}/fields")
    public ResponseEntity<List<DecPageTemplateFieldDto>> getTemplateFields(
            @PathVariable("id") Long id,
            @RequestHeader(value = "X-Tenant-Id", required = false) String tenantHeader
    ) {
        int tenantId = resolveTenantId(tenantHeader);
        List<DecPageTemplateFieldDto> fields = service.getTemplateFields(tenantId, id);
        return ResponseEntity.ok(fields);
    }

    /**
     * Requirement 4: Test generation request endpoint:
     * Accepts template ID and JSON payload / Map of test values.
     * Loads DOCX from disk, executes DOM row cloning for coverages table,
     * performs flat string replacement, and streams populated DOCX back.
     */
    @PostMapping("/{id}/generate-test")
    public ResponseEntity<?> generateTestDecPage(
            @PathVariable("id") Long id,
            @RequestBody(required = false) DecPageGenerateTestRequest request,
            @RequestHeader(value = "X-Tenant-Id", required = false) String tenantHeader
    ) {
        int tenantId = resolveTenantId(tenantHeader);
        try {
            DecPageTemplateService.GeneratedDocResult result = service.generateTestDecPage(
                    tenantId, id, request != null ? request : new DecPageGenerateTestRequest());

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            headers.setContentDispositionFormData("attachment", result.fileName());
            headers.setContentLength(result.docxBytes().length);
            headers.add("Access-Control-Expose-Headers", "Content-Disposition");

            return new ResponseEntity<>(result.docxBytes(), headers, HttpStatus.OK);
        } catch (IllegalArgumentException e) {
            log.warn("Validation error on test generation: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            log.error("Failed to generate test Dec Page for template #{}: {}", id, e.getMessage(), e);
            return ResponseEntity.internalServerError().body(Map.of("error", "Generation failed: " + e.getMessage()));
        }
    }

    /**
     * Delete template.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteTemplate(
            @PathVariable("id") Long id,
            @RequestHeader(value = "X-Tenant-Id", required = false) String tenantHeader
    ) {
        int tenantId = resolveTenantId(tenantHeader);
        boolean deleted = service.deleteTemplate(tenantId, id);
        if (deleted) {
            return ResponseEntity.noContent().build();
        } else {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Template not found."));
        }
    }
}

