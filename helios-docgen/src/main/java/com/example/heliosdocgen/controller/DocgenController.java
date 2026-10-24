package com.example.heliosdocgen.controller;

import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.heliosdocgen.model.DocgenResponse;
import com.example.heliosdocgen.model.GenerateDocumentRequest;
import com.example.heliosdocgen.service.AsposePdfGeneratorService;

@RestController
@RequestMapping("/api/v1/docgen")
@CrossOrigin(origins = "*")
public class DocgenController {

    private static final Logger log = LoggerFactory.getLogger(DocgenController.class);

    private final AsposePdfGeneratorService pdfGeneratorService;

    public DocgenController(AsposePdfGeneratorService pdfGeneratorService) {
        this.pdfGeneratorService = pdfGeneratorService;
    }

    @PostMapping("/generate")
    public ResponseEntity<DocgenResponse> generate(@RequestBody GenerateDocumentRequest req) {
        long start = System.currentTimeMillis();
        log.info("Received PDF generation request for entity {} #{} (docType={})",
                req.entityType(), req.entityNbr(), req.docType());

        AsposePdfGeneratorService.GeneratedPdf pdf = pdfGeneratorService.generate(req);
        long duration = System.currentTimeMillis() - start;

        String base64 = Base64.getEncoder().encodeToString(pdf.content());
        DocgenResponse response = new DocgenResponse(
                pdf.pageCount(),
                (long) pdf.content().length,
                base64,
                "application/pdf",
                duration,
                "Document generated successfully by DocGen Engine"
        );

        log.info("Generated PDF in {}ms: {} bytes, {} page(s)", duration, pdf.content().length, pdf.pageCount());
        return ResponseEntity.status(HttpStatus.OK).body(response);
    }

    @PostMapping("/render")
    public ResponseEntity<byte[]> render(@RequestBody GenerateDocumentRequest req) {
        AsposePdfGeneratorService.GeneratedPdf pdf = pdfGeneratorService.generate(req);
        String fileName = (req.docTitle() != null && !req.docTitle().isBlank())
                ? req.docTitle().replaceAll("[^a-zA-Z0-9.-]", "_") + ".pdf"
                : "document.pdf";

        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + fileName + "\"")
                .header("X-Page-Count", String.valueOf(pdf.pageCount()))
                .body(pdf.content());
    }

    @GetMapping("/diagnostics")
    public ResponseEntity<Map<String, Object>> getDiagnostics() {
        Runtime rt = Runtime.getRuntime();
        long totalMem = rt.totalMemory();
        long freeMem = rt.freeMemory();
        long maxMem = rt.maxMemory();

        Map<String, Object> map = new LinkedHashMap<>();
        map.put("service", "Helios Dedicated PDF Document Generation Engine (DocGen)");
        map.put("shortName", "DocGen");
        map.put("status", "UP");
        map.put("version", "0.1.0-SNAPSHOT");
        map.put("engine", "Aspose.PDF for Java 24.12");
        map.put("dedicatedTomcatInstance", "C:\\tomcat11-docgen");
        map.put("dedicatedHttpPort", 8088);
        map.put("serverTime", java.time.LocalDateTime.now().toString());
        map.put("usedMemoryMb", (totalMem - freeMem) / (1024 * 1024));
        map.put("totalMemoryMb", totalMem / (1024 * 1024));
        map.put("maxMemoryMb", maxMem / (1024 * 1024));
        map.put("availableProcessors", rt.availableProcessors());
        map.put("activeThreads", Thread.activeCount());

        return ResponseEntity.ok(map);
    }
}
