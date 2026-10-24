package com.example.heliosdocument.model;

public record DocumentDto(
        int documentId,
        int tenantId,
        String entityType,
        int entityId,
        String entityNbr,
        String docType,
        String docTitle,
        String fileName,
        String filePath,
        long fileSizeBytes,
        String mimeType,
        int pageCount,
        String status,
        String generatedBy,
        String createdDt
) {}

