package com.example.heliosdocument.client;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Base64;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import com.example.heliosdocument.model.GenerateDocumentRequest;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

@Component
public class DocgenClient {

    private static final Logger log = LoggerFactory.getLogger(DocgenClient.class);

    private final String docgenBaseUrl;
    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    public record GeneratedDocumentResult(byte[] content, int pageCount, long durationMs) {}

    public DocgenClient(
            @Value("${docgen.service.url:http://127.0.0.1:8088/helios-docgen/api/v1/docgen}") String docgenBaseUrl,
            ObjectMapper objectMapper) {
        this.docgenBaseUrl = docgenBaseUrl.replaceAll("/+$", "");
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
        log.info("Initialized DocgenClient connected to {}", this.docgenBaseUrl);
    }

    public GeneratedDocumentResult generate(GenerateDocumentRequest req) {
        String endpoint = docgenBaseUrl + "/generate";
        log.info("Delegating PDF generation to DocGen microservice at {} for entity {} #{}",
                endpoint, req.entityType(), req.entityNbr());

        try {
            String jsonPayload = objectMapper.writeValueAsString(req);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(endpoint))
                    .timeout(Duration.ofSeconds(60))
                    .header("Content-Type", "application/json")
                    .header("Accept", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(jsonPayload))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() != 200) {
                log.error("DocGen service returned HTTP {} with body: {}", response.statusCode(), response.body());
                throw new RuntimeException("DocGen microservice failed with HTTP status " + response.statusCode());
            }

            Map<String, Object> body = objectMapper.readValue(response.body(), new TypeReference<Map<String, Object>>() {});
            String base64 = (String) body.get("pdfBase64");
            if (base64 == null || base64.isBlank()) {
                throw new RuntimeException("DocGen microservice returned null/empty PDF base64 content");
            }

            byte[] pdfBytes = Base64.getDecoder().decode(base64);
            int pageCount = body.containsKey("pageCount") ? ((Number) body.get("pageCount")).intValue() : 1;
            long durationMs = body.containsKey("generationDurationMs") ? ((Number) body.get("generationDurationMs")).longValue() : 0L;

            log.info("DocGen microservice successfully generated PDF: {} bytes, {} pages in {}ms",
                    pdfBytes.length, pageCount, durationMs);

            return new GeneratedDocumentResult(pdfBytes, pageCount, durationMs);

        } catch (Exception e) {
            log.error("Failed to call DocGen microservice at {}: {}", endpoint, e.getMessage(), e);
            throw new RuntimeException("Document generation failed via DocGen microservice: " + e.getMessage(), e);
        }
    }
}
