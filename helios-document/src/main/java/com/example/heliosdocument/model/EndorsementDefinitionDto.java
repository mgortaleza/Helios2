package com.example.heliosdocument.model;

import java.time.LocalDateTime;
import java.util.List;

public record EndorsementDefinitionDto(
        String endorsementId,
        String endorsementCode,
        String endorsementName,
        String description,
        String lineOfBusiness,
        boolean isMandatory,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        String currentTemplateId,
        Integer currentVersionNumber,
        String currentEditionDate,
        String currentStatus,
        String currentRelativePath,
        String currentOutputFormat,
        List<TemplateVersionDto> versions
) {}

