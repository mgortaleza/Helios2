package com.example.heliosdocument.model;

import java.util.Map;

public record UpdateFieldMappingsRequest(
        Map<String, String> mappings // fieldName -> dataMappingPath
) {}

