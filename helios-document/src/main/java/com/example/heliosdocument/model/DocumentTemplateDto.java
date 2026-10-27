package com.example.heliosdocument.model;

import java.time.LocalDateTime;
import java.util.List;

public record DocumentTemplateDto(
        Integer templateId,
        Integer endorsementId,
        String templateName,
        String fileName,
        String mimeType,
        String description,
        Integer version,
        Boolean isActive,
        String createdBy,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        String endorsementNbr,
        String endorsementTitle,
        Integer quoteId,
        String relativePath,
        Long fileSizeBytes,
        String sha256Checksum,
        String formNumber,
        String editionDate,
        String approvalStatus,
        List<TemplateFieldDto> fields
) {}
