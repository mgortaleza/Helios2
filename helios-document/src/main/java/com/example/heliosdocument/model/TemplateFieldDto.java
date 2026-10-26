package com.example.heliosdocument.model;

import java.time.LocalDateTime;

public record TemplateFieldDto(
        Integer fieldId,
        Integer templateId,
        String fieldName,
        Boolean isTableRegion,
        String dataMappingPath,
        String samplePreviewValue,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {}

