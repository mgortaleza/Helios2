package com.example.heliosdocument.config;

import java.util.Collections;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;

/**
 * Dynamic System Configuration Service.
 * Sources global enterprise settings (storage root paths, sync schedules, provider flags)
 * from Tier 1 Admin control plane (dbo.system_configuration) with in-memory caching and
 * application.properties / environment variable fallback.
 */
@Service
public class SystemConfigurationService {

    private static final Logger log = LoggerFactory.getLogger(SystemConfigurationService.class);

    public static final String KEY_STORAGE_ROOT_PATH = "storage.root.path";
    public static final String KEY_STORAGE_PROVIDER = "storage.provider";
    public static final String KEY_CACHE_SYNC_CRON = "cache.sync.cron";

    private final JdbcTemplate masterJdbcTemplate;
    private final String fallbackStorageRoot;
    private final Map<String, String> cache = new ConcurrentHashMap<>();

    public SystemConfigurationService(
            JdbcTemplate masterJdbcTemplate,
            @Value("${helios.storage.root.path:${HELIOS_STORAGE_ROOT:C:/helios-storage}}") String fallbackStorageRoot
    ) {
        this.masterJdbcTemplate = masterJdbcTemplate;
        this.fallbackStorageRoot = normalizePath(fallbackStorageRoot);
    }

    @PostConstruct
    public void init() {
        refreshCache();
    }

    /**
     * Re-reads all configuration entries from dbo.system_configuration into memory.
     * Can be invoked via REST endpoint or on-demand for zero-downtime configuration cutover.
     */
    public synchronized void refreshCache() {
        try {
            String sql = "SELECT config_key, config_value FROM dbo.system_configuration";
            masterJdbcTemplate.query(sql, rs -> {
                String key = rs.getString("config_key");
                String val = rs.getString("config_value");
                if (key != null && val != null) {
                    cache.put(key.trim(), val.trim());
                }
            });
            log.info("SystemConfigurationService loaded {} dynamic configurations from dbo.system_configuration", cache.size());
        } catch (Exception e) {
            log.warn("Could not load dbo.system_configuration from master database (using fallback defaults): {}", e.getMessage());
        }

        // Ensure default storage root path is present
        cache.computeIfAbsent(KEY_STORAGE_ROOT_PATH, k -> fallbackStorageRoot);
        log.info("Active Helios storage root path: '{}'", getStorageRootPath());
    }

    /**
     * Resolves storage root path dynamically:
     * 1. dbo.system_configuration ['storage.root.path']
     * 2. Fallback to application.properties / HELIOS_STORAGE_ROOT
     */
    public String getStorageRootPath() {
        String path = cache.get(KEY_STORAGE_ROOT_PATH);
        if (path == null || path.isBlank()) {
            path = fallbackStorageRoot;
        }
        return normalizePath(path);
    }

    public String getProperty(String key, String defaultValue) {
        return cache.getOrDefault(key, defaultValue);
    }

    public String getProperty(String key) {
        return cache.get(key);
    }

    public Map<String, String> getAllConfigurations() {
        return Collections.unmodifiableMap(cache);
    }

    /**
     * Updates or inserts a configuration property in both the database and live in-memory cache.
     */
    public void updateProperty(String key, String value, String description) {
        String normalizedKey = key.trim();
        String normalizedVal = value.trim();

        String mergeSql = """
            MERGE INTO dbo.system_configuration AS target
            USING (SELECT ? AS config_key, ? AS config_value, ? AS description) AS source
            ON target.config_key = source.config_key
            WHEN MATCHED THEN
                UPDATE SET target.config_value = source.config_value,
                           target.description = COALESCE(source.description, target.description),
                           target.updated_at = GETDATE()
            WHEN NOT MATCHED THEN
                INSERT (config_key, config_value, description, is_encrypted, updated_at)
                VALUES (source.config_key, source.config_value, source.description, 0, GETDATE());
        """;

        masterJdbcTemplate.update(mergeSql, normalizedKey, normalizedVal, description);
        cache.put(normalizedKey, normalizedVal);
        log.info("Updated dynamic system configuration '{}' = '{}'", normalizedKey, normalizedVal);
    }

    private String normalizePath(String raw) {
        if (raw == null) return "C:/helios-storage";
        String cleaned = raw.trim();
        // Replace backslashes with forward slashes for uniform Java NIO handling unless Windows UNC
        if (cleaned.startsWith("\\\\") || cleaned.startsWith("//")) {
            // Enterprise Windows UNC path e.g. \\fileserver\helios-storage
            return cleaned.replace('/', '\\');
        }
        return cleaned.replace('\\', '/');
    }
}

