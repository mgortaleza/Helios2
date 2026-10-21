package com.example.helios2.tenant;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import javax.sql.DataSource;

import org.springframework.jdbc.datasource.lookup.AbstractRoutingDataSource;

import com.example.helios2.config.SqlServerDataSourceFactory;
import com.example.helios2.service.TenantRegistryService;

public class TenantRoutingDataSource extends AbstractRoutingDataSource {

    private final SqlServerDataSourceFactory dataSourceFactory;
    private final TenantRegistryService tenantRegistryService;
    private final Map<Integer, DataSource> resolvedDataSources = new ConcurrentHashMap<>();

    public TenantRoutingDataSource(
            SqlServerDataSourceFactory dataSourceFactory,
            TenantRegistryService tenantRegistryService,
            DataSource defaultTenantDataSource) {
        this.dataSourceFactory = dataSourceFactory;
        this.tenantRegistryService = tenantRegistryService;
        resolvedDataSources.put(TenantContext.DEFAULT_TENANT_ID, defaultTenantDataSource);

        super.setDefaultTargetDataSource(defaultTenantDataSource);
        super.setTargetDataSources(new ConcurrentHashMap<>(resolvedDataSources));
        super.afterPropertiesSet();
    }

    @Override
    protected Object determineCurrentLookupKey() {
        return TenantContext.getTenantId();
    }

    @Override
    protected DataSource determineTargetDataSource() {
        int tenantId = TenantContext.getTenantId();
        return resolvedDataSources.computeIfAbsent(tenantId, id -> {
            TenantConfig config = tenantRegistryService.getTenantById(id)
                    .orElseThrow(() -> new IllegalArgumentException("Unknown Tenant ID in MSTR_DATA: " + id));
            return dataSourceFactory.createDataSource(
                    "Helios2-Tenant-" + id + "-" + config.dbCatalogName(),
                    config.dbServerName(),
                    config.dbCatalogName()
            );
        });
    }

    public void evictTenantDataSource(int tenantId) {
        resolvedDataSources.remove(tenantId);
    }
}

