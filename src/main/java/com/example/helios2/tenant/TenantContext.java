package com.example.helios2.tenant;

public final class TenantContext {

    public static final int DEFAULT_TENANT_ID = 1;
    private static final ThreadLocal<Integer> CURRENT_TENANT = new ThreadLocal<>();

    private TenantContext() {
    }

    public static void setTenantId(Integer tenantId) {
        CURRENT_TENANT.set(tenantId);
    }

    public static int getTenantId() {
        Integer id = CURRENT_TENANT.get();
        return id != null ? id : DEFAULT_TENANT_ID;
    }

    public static void clear() {
        CURRENT_TENANT.remove();
    }
}

