package com.example.helios2.sync;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

import javax.sql.DataSource;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import com.example.helios2.config.SqlServerDataSourceFactory;
import com.example.helios2.service.TenantRegistryService;
import com.example.helios2.tenant.TenantConfig;

/**
 * Off-Hours Nightly Batch Synchronization Worker for Option B Dual-Schema Architecture.
 * Executes ops.sp_RefreshReferenceCache across all active tenant databases, performing
 * an atomic, idempotent MERGE from [mstr].* to [ref].* for approved, effective-dated records.
 */
@Service
@EnableScheduling
public class ReferenceCacheSyncScheduler {

    private static final Logger log = LoggerFactory.getLogger(ReferenceCacheSyncScheduler.class);

    private final TenantRegistryService tenantRegistryService;
    private final SqlServerDataSourceFactory dataSourceFactory;
    private final ConcurrentHashMap<String, DataSource> tenantDataSources = new ConcurrentHashMap<>();

    public ReferenceCacheSyncScheduler(
            TenantRegistryService tenantRegistryService,
            SqlServerDataSourceFactory dataSourceFactory
    ) {
        this.tenantRegistryService = tenantRegistryService;
        this.dataSourceFactory = dataSourceFactory;
    }

    public record SyncResult(
            int tenantId,
            String tenantName,
            String dbCatalogName,
            String status,
            int productsProcessed,
            int formsProcessed,
            int stateApprovalsProcessed,
            int ratingPlansProcessed,
            long durationMs,
            String errorMessage,
            LocalDateTime executedAt
    ) {}

    /**
     * Scheduled off-hours execution configured via cron (default 02:00 AM nightly: 0 0 2 * * *).
     */
    @Scheduled(cron = "${helios.cache.sync.cron:0 0 2 * * *}")
    public void runNightlyOffHoursSync() {
        log.info("=== Starting Nightly Off-Hours Reference Cache Synchronization (ops.sp_RefreshReferenceCache) ===");
        List<SyncResult> results = syncAllTenants();
        long successCount = results.stream().filter(r -> "SUCCESS".equals(r.status())).count();
        log.info("=== Finished Nightly Reference Cache Sync: {}/{} Tenants Synced Successfully ===", successCount, results.size());
    }

    /**
     * Synchronizes reference caches across all registered tenants.
     */
    public List<SyncResult> syncAllTenants() {
        List<TenantConfig> tenants = tenantRegistryService.getAllTenants();
        List<SyncResult> results = new ArrayList<>();

        for (TenantConfig tenant : tenants) {
            results.add(syncTenant(tenant));
        }

        return results;
    }

    /**
     * Synchronizes a specific tenant by tenant ID.
     */
    public SyncResult syncTenantById(int tenantId) {
        TenantConfig tenant = tenantRegistryService.getTenantById(tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Tenant #" + tenantId + " does not exist in master registry."));
        return syncTenant(tenant);
    }

    public SyncResult syncTenant(TenantConfig tenant) {
        long start = System.currentTimeMillis();
        int tenantId = tenant.tenantId();
        String catalog = tenant.dbCatalogName();
        String server = tenant.dbServerName();

        try {
            DataSource ds = tenantDataSources.computeIfAbsent(catalog, c ->
                    dataSourceFactory.createDataSource("RefSync-" + tenantId, server, c)
            );
            JdbcTemplate tenantJdbc = new JdbcTemplate(ds);

            // Verify stored procedure existence before invocation
            Integer spExists = tenantJdbc.queryForObject(
                    "SELECT COUNT(*) FROM sys.procedures WHERE name = 'sp_RefreshReferenceCache' AND schema_id = SCHEMA_ID('ops')",
                    Integer.class
            );

            if (spExists == null || spExists == 0) {
                log.warn("Tenant #{}: ops.sp_RefreshReferenceCache procedure not yet installed in database '{}'", tenantId, catalog);
                return new SyncResult(tenantId, tenant.tenantName(), catalog, "SKIPPED_SP_NOT_FOUND",
                        0, 0, 0, 0, System.currentTimeMillis() - start, "ops.sp_RefreshReferenceCache not present in tenant DB", LocalDateTime.now());
            }

            // Execute stored procedure
            String callSql = "EXEC ops.sp_RefreshReferenceCache @BatchId = ?";
            UUID batchId = UUID.randomUUID();

            SyncResult result = tenantJdbc.query(callSql, rs -> {
                if (rs.next()) {
                    return new SyncResult(
                            tenantId,
                            tenant.tenantName(),
                            catalog,
                            rs.getString("Status"),
                            rs.getInt("ProductsProcessed"),
                            rs.getInt("FormsProcessed"),
                            rs.getInt("StateApprovalsProcessed"),
                            rs.getInt("RatingPlansProcessed"),
                            System.currentTimeMillis() - start,
                            null,
                            LocalDateTime.now()
                    );
                }
                return new SyncResult(tenantId, tenant.tenantName(), catalog, "SUCCESS", 0, 0, 0, 0,
                        System.currentTimeMillis() - start, null, LocalDateTime.now());
            }, batchId);

            log.info("Synced reference cache for Tenant #{} ({}) in {} ms: [Products: {}, Forms: {}, Approvals: {}, Plans: {}]",
                    tenantId, catalog, result.durationMs(), result.productsProcessed(), result.formsProcessed(),
                    result.stateApprovalsProcessed(), result.ratingPlansProcessed());

            return result;
        } catch (Exception e) {
            log.error("Failed to sync reference cache for Tenant #{} ({}): {}", tenantId, catalog, e.getMessage(), e);
            return new SyncResult(
                    tenantId,
                    tenant.tenantName(),
                    catalog,
                    "FAILED",
                    0, 0, 0, 0,
                    System.currentTimeMillis() - start,
                    e.getMessage(),
                    LocalDateTime.now()
            );
        }
    }
}

