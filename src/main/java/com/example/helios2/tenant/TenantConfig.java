package com.example.helios2.tenant;

public record TenantConfig(
        int tenantId,
        String tenantName,
        String dbServerName,
        String dbCatalogName
) {
}

