package com.example.helios2.service;

import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicBoolean;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Service;

import com.example.helios2.tenant.TenantConfig;

@Service
public class TenantRegistryService {

    private final JdbcTemplate masterJdbcTemplate;
    private final AtomicBoolean schemaInitialized = new AtomicBoolean(false);

    private static final RowMapper<TenantConfig> TENANT_ROW_MAPPER = (rs, rowNum) -> {
        int tenantId = rs.getInt("TENANT_ID");
        String defaultPrimary = (tenantId == 2) ? "#0f2942" : "#013a12";
        String defaultAccent = (tenantId == 2) ? "#38bdf8" : "#f59e0b";
        String defaultTitle = "Helios";
        String defaultSubtitle = (tenantId == 2) ? "GLOBAL RISK UNDERWRITING" : "INSURANCE MANAGEMENT SUITE";
        String defaultModules = "dashboard,policy,submissions,claims,diagnostics";

        String primaryColor = rs.getString("PRIMARY_COLOR");
        String accentColor = rs.getString("ACCENT_COLOR");
        String brandTitle = rs.getString("BRAND_TITLE");
        String brandSubtitle = rs.getString("BRAND_SUBTITLE");
        String enabledModules = rs.getString("ENABLED_MODULES");

        return new TenantConfig(
                tenantId,
                rs.getString("TENANT_NAME"),
                rs.getString("DB_SERVER_NM"),
                rs.getString("DB_CATALOG_NM"),
                (primaryColor != null && !primaryColor.isBlank()) ? primaryColor : defaultPrimary,
                (accentColor != null && !accentColor.isBlank()) ? accentColor : defaultAccent,
                (brandTitle != null && !brandTitle.isBlank()) ? brandTitle : defaultTitle,
                (brandSubtitle != null && !brandSubtitle.isBlank()) ? brandSubtitle : defaultSubtitle,
                (enabledModules != null && !enabledModules.isBlank()) ? enabledModules : defaultModules
        );
    };

    public TenantRegistryService(@Qualifier("masterJdbcTemplate") JdbcTemplate masterJdbcTemplate) {
        this.masterJdbcTemplate = masterJdbcTemplate;
    }

    private void ensureMasterUiColumns() {
        if (!schemaInitialized.compareAndSet(false, true)) {
            return;
        }
        try {
            masterJdbcTemplate.execute("""
                    IF COL_LENGTH('dbo.TENANT_DB_CONFIG', 'PRIMARY_COLOR') IS NULL
                        ALTER TABLE dbo.TENANT_DB_CONFIG ADD PRIMARY_COLOR VARCHAR(20) NULL;
                    IF COL_LENGTH('dbo.TENANT_DB_CONFIG', 'ACCENT_COLOR') IS NULL
                        ALTER TABLE dbo.TENANT_DB_CONFIG ADD ACCENT_COLOR VARCHAR(20) NULL;
                    IF COL_LENGTH('dbo.TENANT_DB_CONFIG', 'BRAND_TITLE') IS NULL
                        ALTER TABLE dbo.TENANT_DB_CONFIG ADD BRAND_TITLE VARCHAR(100) NULL;
                    IF COL_LENGTH('dbo.TENANT_DB_CONFIG', 'BRAND_SUBTITLE') IS NULL
                        ALTER TABLE dbo.TENANT_DB_CONFIG ADD BRAND_SUBTITLE VARCHAR(120) NULL;
                    IF COL_LENGTH('dbo.TENANT_DB_CONFIG', 'ENABLED_MODULES') IS NULL
                        ALTER TABLE dbo.TENANT_DB_CONFIG ADD ENABLED_MODULES VARCHAR(200) NULL;
                    """);

            masterJdbcTemplate.update("""
                    UPDATE dbo.TENANT_DB_CONFIG
                    SET PRIMARY_COLOR = COALESCE(PRIMARY_COLOR, '#013a12'),
                        ACCENT_COLOR = COALESCE(ACCENT_COLOR, '#f59e0b'),
                        BRAND_TITLE = COALESCE(BRAND_TITLE, 'Helios'),
                        BRAND_SUBTITLE = COALESCE(BRAND_SUBTITLE, 'INSURANCE MANAGEMENT SUITE'),
                        ENABLED_MODULES = COALESCE(ENABLED_MODULES, 'dashboard,policy,submissions,claims,diagnostics')
                    WHERE TENANT_ID = 1;
                    """);

            masterJdbcTemplate.update("""
                    UPDATE dbo.TENANT_DB_CONFIG
                    SET PRIMARY_COLOR = COALESCE(PRIMARY_COLOR, '#0f2942'),
                        ACCENT_COLOR = COALESCE(ACCENT_COLOR, '#38bdf8'),
                        BRAND_TITLE = COALESCE(BRAND_TITLE, 'Helios'),
                        BRAND_SUBTITLE = COALESCE(BRAND_SUBTITLE, 'GLOBAL RISK UNDERWRITING'),
                        ENABLED_MODULES = COALESCE(ENABLED_MODULES, 'dashboard,policy,submissions,claims,diagnostics')
                    WHERE TENANT_ID = 2;
                    """);

            masterJdbcTemplate.execute("""
                    IF OBJECT_ID('dbo.TENANT_ROLE_CONFIG', 'U') IS NULL
                    CREATE TABLE dbo.TENANT_ROLE_CONFIG (
                        ROLE_ID INT IDENTITY(1,1) PRIMARY KEY,
                        TENANT_ID INT NOT NULL,
                        ROLE_CODE VARCHAR(50) NOT NULL,
                        ROLE_NAME VARCHAR(100) NOT NULL,
                        ALLOWED_MODULES VARCHAR(200) NOT NULL,
                        DEFAULT_TASK_FILTER VARCHAR(50) NULL,
                        CAN_CREATE_SUBMISSION BIT NOT NULL DEFAULT 1,
                        CAN_ADD_ORGANIZATION BIT NOT NULL DEFAULT 1,
                        CAN_REPORT_CLAIM BIT NOT NULL DEFAULT 1
                    );
                    """);

            seedDefaultRolesForTenant(1);
            seedDefaultRolesForTenant(2);
        } catch (Exception e) {
            schemaInitialized.set(false);
            System.err.println("Warning ensuring master UI customization columns: " + e.getMessage());
        }
    }

    private void seedDefaultRolesForTenant(int tenantId) {
        Integer count = masterJdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM dbo.TENANT_ROLE_CONFIG WHERE TENANT_ID = ?",
                Integer.class,
                tenantId
        );
        if (count != null && count == 0) {
            String insertSql = """
                    INSERT INTO dbo.TENANT_ROLE_CONFIG
                    (TENANT_ID, ROLE_CODE, ROLE_NAME, ALLOWED_MODULES, DEFAULT_TASK_FILTER, CAN_CREATE_SUBMISSION, CAN_ADD_ORGANIZATION, CAN_REPORT_CLAIM)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """;
            masterJdbcTemplate.update(insertSql, tenantId, "EXECUTIVE", "Portfolio Executive", "dashboard,policy,submissions,claims", "", true, true, true);
            masterJdbcTemplate.update(insertSql, tenantId, "UNDERWRITER", "Senior Underwriter", "dashboard,policy,submissions", "Underwriting", true, true, false);
            masterJdbcTemplate.update(insertSql, tenantId, "CLAIMS_ADJUSTER", "Claims Adjuster", "dashboard,policy,claims", "Claims", false, false, true);
            masterJdbcTemplate.update(insertSql, tenantId, "AUDITOR", "Compliance Auditor (Read-Only)", "dashboard,policy,submissions,claims", "", false, false, false);
        }
    }

    public record TenantRoleDto(
            int roleId,
            int tenantId,
            String roleCode,
            String roleName,
            String allowedModules,
            String defaultTaskFilter,
            boolean canCreateSubmission,
            boolean canAddOrganization,
            boolean canReportClaim
    ) {
    }

    private static final RowMapper<TenantRoleDto> ROLE_ROW_MAPPER = (rs, rowNum) -> new TenantRoleDto(
            rs.getInt("ROLE_ID"),
            rs.getInt("TENANT_ID"),
            rs.getString("ROLE_CODE"),
            rs.getString("ROLE_NAME"),
            rs.getString("ALLOWED_MODULES"),
            rs.getString("DEFAULT_TASK_FILTER") != null ? rs.getString("DEFAULT_TASK_FILTER") : "",
            rs.getBoolean("CAN_CREATE_SUBMISSION"),
            rs.getBoolean("CAN_ADD_ORGANIZATION"),
            rs.getBoolean("CAN_REPORT_CLAIM")
    );

    public List<TenantRoleDto> getRolesForTenant(int tenantId) {
        ensureMasterUiColumns();
        seedDefaultRolesForTenant(tenantId);
        String sql = "SELECT ROLE_ID, TENANT_ID, ROLE_CODE, ROLE_NAME, ALLOWED_MODULES, "
                   + "DEFAULT_TASK_FILTER, CAN_CREATE_SUBMISSION, CAN_ADD_ORGANIZATION, CAN_REPORT_CLAIM "
                   + "FROM dbo.TENANT_ROLE_CONFIG WHERE TENANT_ID = ? ORDER BY ROLE_ID ASC";
        return masterJdbcTemplate.query(sql, ROLE_ROW_MAPPER, tenantId);
    }

    public TenantRoleDto saveRoleForTenant(TenantRoleDto role) {
        ensureMasterUiColumns();
        if (role.roleId() > 0) {
            masterJdbcTemplate.update("""
                    UPDATE dbo.TENANT_ROLE_CONFIG
                    SET TENANT_ID = ?, ROLE_CODE = ?, ROLE_NAME = ?, ALLOWED_MODULES = ?,
                        DEFAULT_TASK_FILTER = ?, CAN_CREATE_SUBMISSION = ?, CAN_ADD_ORGANIZATION = ?, CAN_REPORT_CLAIM = ?
                    WHERE ROLE_ID = ?
                    """,
                    role.tenantId(),
                    role.roleCode(),
                    role.roleName(),
                    role.allowedModules(),
                    role.defaultTaskFilter() != null ? role.defaultTaskFilter() : "",
                    role.canCreateSubmission(),
                    role.canAddOrganization(),
                    role.canReportClaim(),
                    role.roleId()
            );
            return role;
        } else {
            masterJdbcTemplate.update("""
                    INSERT INTO dbo.TENANT_ROLE_CONFIG
                    (TENANT_ID, ROLE_CODE, ROLE_NAME, ALLOWED_MODULES, DEFAULT_TASK_FILTER, CAN_CREATE_SUBMISSION, CAN_ADD_ORGANIZATION, CAN_REPORT_CLAIM)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    role.tenantId(),
                    role.roleCode(),
                    role.roleName(),
                    role.allowedModules(),
                    role.defaultTaskFilter() != null ? role.defaultTaskFilter() : "",
                    role.canCreateSubmission(),
                    role.canAddOrganization(),
                    role.canReportClaim()
            );
            List<TenantRoleDto> roles = getRolesForTenant(role.tenantId());
            return roles.isEmpty() ? role : roles.get(roles.size() - 1);
        }
    }

    public List<TenantConfig> getAllTenants() {
        ensureMasterUiColumns();
        String sql = "SELECT TENANT_ID, TENANT_NAME, DB_SERVER_NM, DB_CATALOG_NM, "
                   + "PRIMARY_COLOR, ACCENT_COLOR, BRAND_TITLE, BRAND_SUBTITLE, ENABLED_MODULES "
                   + "FROM dbo.TENANT_DB_CONFIG ORDER BY TENANT_ID ASC";
        return masterJdbcTemplate.query(sql, TENANT_ROW_MAPPER);
    }

    public Optional<TenantConfig> getTenantById(int tenantId) {
        ensureMasterUiColumns();
        String sql = "SELECT TENANT_ID, TENANT_NAME, DB_SERVER_NM, DB_CATALOG_NM, "
                   + "PRIMARY_COLOR, ACCENT_COLOR, BRAND_TITLE, BRAND_SUBTITLE, ENABLED_MODULES "
                   + "FROM dbo.TENANT_DB_CONFIG WHERE TENANT_ID = ?";
        List<TenantConfig> results = masterJdbcTemplate.query(sql, TENANT_ROW_MAPPER, tenantId);
        return results.stream().findFirst();
    }

    public TenantConfig registerOrUpdateTenant(TenantConfig config) {
        ensureMasterUiColumns();
        String primaryColor = (config.primaryColor() != null && !config.primaryColor().isBlank())
                ? config.primaryColor().trim() : "#013a12";
        String accentColor = (config.accentColor() != null && !config.accentColor().isBlank())
                ? config.accentColor().trim() : "#f59e0b";
        String brandTitle = (config.brandTitle() != null && !config.brandTitle().isBlank())
                ? config.brandTitle().trim() : "Helios";
        String brandSubtitle = (config.brandSubtitle() != null && !config.brandSubtitle().isBlank())
                ? config.brandSubtitle().trim() : "INSURANCE MANAGEMENT SUITE";
        String enabledModules = (config.enabledModules() != null && !config.enabledModules().isBlank())
                ? config.enabledModules().trim() : "dashboard,policy,submissions,claims,diagnostics";

        String upsertSql = """
                IF EXISTS (SELECT 1 FROM dbo.TENANT_DB_CONFIG WHERE TENANT_ID = ?)
                    UPDATE dbo.TENANT_DB_CONFIG
                    SET TENANT_NAME = ?, DB_SERVER_NM = ?, DB_CATALOG_NM = ?,
                        PRIMARY_COLOR = ?, ACCENT_COLOR = ?, BRAND_TITLE = ?, BRAND_SUBTITLE = ?, ENABLED_MODULES = ?
                    WHERE TENANT_ID = ?
                ELSE
                    INSERT INTO dbo.TENANT_DB_CONFIG (
                        TENANT_ID, TENANT_NAME, DB_SERVER_NM, DB_CATALOG_NM,
                        PRIMARY_COLOR, ACCENT_COLOR, BRAND_TITLE, BRAND_SUBTITLE, ENABLED_MODULES
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """;
        masterJdbcTemplate.update(
                upsertSql,
                config.tenantId(),
                config.tenantName(),
                config.dbServerName(),
                config.dbCatalogName(),
                primaryColor,
                accentColor,
                brandTitle,
                brandSubtitle,
                enabledModules,
                config.tenantId(),
                config.tenantId(),
                config.tenantName(),
                config.dbServerName(),
                config.dbCatalogName(),
                primaryColor,
                accentColor,
                brandTitle,
                brandSubtitle,
                enabledModules
        );
        return new TenantConfig(
                config.tenantId(),
                config.tenantName(),
                config.dbServerName(),
                config.dbCatalogName(),
                primaryColor,
                accentColor,
                brandTitle,
                brandSubtitle,
                enabledModules
        );
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

