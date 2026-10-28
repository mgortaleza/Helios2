package com.example.heliosdocument.model;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record TemplateVersionDto(
        String templateId,
        String endorsementId,
        String templateName,
        String fileName,
        int versionNumber,
        LocalDate editionDate,
        String relativePath,
        long fileSizeBytes,
        String sha256Checksum,
        String status,
        LocalDate effectiveDate,
        LocalDate expirationDate,
        String outputFormat,
        boolean isCurrentVersion,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {}

