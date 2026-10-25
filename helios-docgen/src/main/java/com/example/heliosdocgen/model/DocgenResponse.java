package com.example.heliosdocgen.model;

public record DocgenResponse(
        int pageCount,
        long fileSizeBytes,
        String pdfBase64,
        String mimeType,
        long generationDurationMs,
        String message
) {}
