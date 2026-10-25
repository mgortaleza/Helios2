package com.example.helios2.tenant;

public record TenantConfig(
        int tenantId,
        String tenantName,
        String dbServerName,
        String dbCatalogName,
        String primaryColor,
        String accentColor,
        String brandTitle,
        String brandSubtitle,
        String enabledModules
) {
}


