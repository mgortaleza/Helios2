package com.example.helios2.controller;

import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.helios2.sync.ReferenceCacheSyncScheduler;

@RestController
@RequestMapping("/api/sync/reference-cache")
public class ReferenceCacheSyncController {

    private static final Logger log = LoggerFactory.getLogger(ReferenceCacheSyncController.class);

    private final ReferenceCacheSyncScheduler syncScheduler;

    public ReferenceCacheSyncController(ReferenceCacheSyncScheduler syncScheduler) {
        this.syncScheduler = syncScheduler;
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> triggerAllTenantsSync() {
        log.info("Manual reference cache synchronization triggered for all tenants.");
        List<ReferenceCacheSyncScheduler.SyncResult> results = syncScheduler.syncAllTenants();
        long successCount = results.stream().filter(r -> "SUCCESS".equals(r.status())).count();

        return ResponseEntity.ok(Map.of(
                "success", true,
                "totalTenants", results.size(),
                "successfulSyncs", successCount,
                "results", results
        ));
    }

    @PostMapping("/{tenantId}")
    public ResponseEntity<?> triggerTenantSync(@PathVariable("tenantId") int tenantId) {
        log.info("Manual reference cache synchronization triggered for tenant #{}.", tenantId);
        try {
            ReferenceCacheSyncScheduler.SyncResult result = syncScheduler.syncTenantById(tenantId);
            return ResponseEntity.ok(result);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(404).body(Map.of("error", "Not Found", "message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", "Sync Error", "message", e.getMessage()));
        }
    }
}

