package com.example.helios2.service;

import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Service;

import com.example.helios2.tenant.TenantConfig;

@Service
public class TenantRegistryService {

    private final JdbcTemplate masterJdbcTemplate;

    private static final RowMapper<TenantConfig> TENANT_ROW_MAPPER = (rs, rowNum) -> new TenantConfig(
            rs.getInt("TENANT_ID"),
            rs.getString("TENANT_NAME"),
            rs.getString("DB_SERVER_NM"),
            rs.getString("DB_CATALOG_NM")
    );

    public TenantRegistryService(@Qualifier("masterJdbcTemplate") JdbcTemplate masterJdbcTemplate) {
        this.masterJdbcTemplate = masterJdbcTemplate;
    }

    public List<TenantConfig> getAllTenants() {
        String sql = "SELECT TENANT_ID, TENANT_NAME, DB_SERVER_NM, DB_CATALOG_NM "
                   + "FROM dbo.TENANT_DB_CONFIG ORDER BY TENANT_ID ASC";
        return masterJdbcTemplate.query(sql, TENANT_ROW_MAPPER);
    }

    public Optional<TenantConfig> getTenantById(int tenantId) {
        String sql = "SELECT TENANT_ID, TENANT_NAME, DB_SERVER_NM, DB_CATALOG_NM "
                   + "FROM dbo.TENANT_DB_CONFIG WHERE TENANT_ID = ?";
        List<TenantConfig> results = masterJdbcTemplate.query(sql, TENANT_ROW_MAPPER, tenantId);
        return results.stream().findFirst();
    }

    public TenantConfig registerOrUpdateTenant(TenantConfig config) {
        String upsertSql = """
                IF EXISTS (SELECT 1 FROM dbo.TENANT_DB_CONFIG WHERE TENANT_ID = ?)
                    UPDATE dbo.TENANT_DB_CONFIG
                    SET TENANT_NAME = ?, DB_SERVER_NM = ?, DB_CATALOG_NM = ?
                    WHERE TENANT_ID = ?
                ELSE
                    INSERT INTO dbo.TENANT_DB_CONFIG (TENANT_ID, TENANT_NAME, DB_SERVER_NM, DB_CATALOG_NM)
                    VALUES (?, ?, ?, ?)
                """;
        masterJdbcTemplate.update(
                upsertSql,
                config.tenantId(),
                config.tenantName(),
                config.dbServerName(),
                config.dbCatalogName(),
                config.tenantId(),
                config.tenantId(),
                config.tenantName(),
                config.dbServerName(),
                config.dbCatalogName()
        );
        return config;
    }

    public DbPingResult pingMasterDatabase() {
        try {
            return masterJdbcTemplate.queryForObject(
                    "SELECT SYSTEM_USER AS auth_user, DB_NAME() AS db_name, @@SERVERNAME AS srv_name, @@VERSION AS version",
                    (rs, rowNum) -> new DbPingResult(
                            true,
                            rs.getString("db_name"),
                            rs.getString("srv_name"),
                            rs.getString("auth_user"),
                            rs.getString("version"),
                            null
                    )
            );
        } catch (Exception e) {
            return new DbPingResult(false, "MSTR_DATA", null, null, null, e.getMessage());
        }
    }

    public record DbPingResult(
            boolean connected,
            String databaseName,
            String serverName,
            String authenticatedUser,
            String sqlVersion,
            String errorMessage
    ) {
    }
}

