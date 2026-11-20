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
        String enabledModules,
        Boolean autoReplyEnabled
) {
    public TenantConfig(
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
        this(tenantId, tenantName, dbServerName, dbCatalogName, primaryColor, accentColor, brandTitle, brandSubtitle, enabledModules, true);
    }

    public boolean isAutoReplyEnabled() {
        return autoReplyEnabled == null || autoReplyEnabled;
    }
}
