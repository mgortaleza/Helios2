package com.example.helios2.service;

import java.io.File;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicBoolean;

import javax.sql.DataSource;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Service;

import com.example.helios2.config.SqlServerDataSourceFactory;
import com.example.helios2.tenant.TenantConfig;

@Service
public class TenantRegistryService {

    private final JdbcTemplate masterJdbcTemplate;
    private final SqlServerDataSourceFactory dataSourceFactory;
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

    public TenantRegistryService(
            @Qualifier("masterJdbcTemplate") JdbcTemplate masterJdbcTemplate,
            SqlServerDataSourceFactory dataSourceFactory) {
        this.masterJdbcTemplate = masterJdbcTemplate;
        this.dataSourceFactory = dataSourceFactory;
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

    public int getNextTenantId() {
        ensureMasterUiColumns();
        Integer maxId = masterJdbcTemplate.queryForObject(
                "SELECT ISNULL(MAX(TENANT_ID), 0) + 1 FROM dbo.TENANT_DB_CONFIG",
                Integer.class
        );
        return (maxId != null && maxId > 0) ? maxId : 1;
    }

    public boolean deleteTenant(int tenantId) {
        ensureMasterUiColumns();
        // Remove tenant roles from master configuration
        masterJdbcTemplate.update("DELETE FROM dbo.TENANT_ROLE_CONFIG WHERE TENANT_ID = ?", tenantId);
        // Remove tenant from master database configuration (physical database remains intact on SQL Server)
        int rows = masterJdbcTemplate.update("DELETE FROM dbo.TENANT_DB_CONFIG WHERE TENANT_ID = ?", tenantId);
        return rows > 0;
    }

    public record ProvisionTenantRequest(
            Integer tenantId,
            String tenantName,
            String dbServerName,
            String dbCatalogName,
            String primaryColor,
            String accentColor,
            String brandTitle,
            String brandSubtitle,
            String enabledModules,
            Boolean createDatabase,
            Boolean copySchema,
            Boolean seedInitialData
    ) {
    }

    public Map<String, Object> provisionNewTenant(ProvisionTenantRequest req) {
        ensureMasterUiColumns();
        int assignedTenantId = (req.tenantId() != null && req.tenantId() > 0) ? req.tenantId() : getNextTenantId();
        String tenantName = (req.tenantName() != null && !req.tenantName().isBlank())
                ? req.tenantName().trim() : ("Tenant " + assignedTenantId);
        String serverName = (req.dbServerName() != null && !req.dbServerName().isBlank())
                ? req.dbServerName().trim() : "dbtst.ad.ortaleza.com";
        String catalogName = (req.dbCatalogName() != null && !req.dbCatalogName().isBlank())
                ? req.dbCatalogName().trim() : ("HELIOS" + assignedTenantId + "_TST");

        // Validate catalog name characters to prevent SQL injection
        if (!catalogName.matches("^[a-zA-Z0-9_]+$")) {
            throw new IllegalArgumentException("Database catalog name must only contain alphanumeric characters and underscores.");
        }

        boolean dbCreated = false;
        boolean schemaCreated = false;

        // 1. Create SQL Server database if requested
        if (req.createDatabase() == null || Boolean.TRUE.equals(req.createDatabase())) {
            DataSource masterDs = dataSourceFactory.createDataSource("ProvMaster-" + assignedTenantId, serverName, "master");
            try {
                JdbcTemplate serverMasterJdbc = new JdbcTemplate(masterDs);
                Integer exists = serverMasterJdbc.queryForObject(
                        "SELECT COUNT(*) FROM sys.databases WHERE name = ?", Integer.class, catalogName
                );
                if (exists == null || exists == 0) {
                    serverMasterJdbc.execute("CREATE DATABASE [" + catalogName + "];");
                    dbCreated = true;
                }
            } finally {
                if (masterDs instanceof AutoCloseable ac) {
                    try { ac.close(); } catch (Exception ignored) {}
                }
            }

            // Small delay to ensure database is in ONLINE state
            try { Thread.sleep(600); } catch (InterruptedException ignored) {}
        }

        // 2. Clone schema and create all 12 core tables in the new tenant database
        if (req.copySchema() == null || Boolean.TRUE.equals(req.copySchema())) {
            DataSource tenantDs = dataSourceFactory.createDataSource("ProvTenant-" + assignedTenantId, serverName, catalogName);
            try {
                JdbcTemplate tenantJdbc = new JdbcTemplate(tenantDs);

                // Execute all table creation DDL
                tenantJdbc.execute("""
                        IF OBJECT_ID('dbo.PT_PARTY_TYPE_CODE', 'U') IS NULL
                        BEGIN
                            CREATE TABLE dbo.PT_PARTY_TYPE_CODE (
                                PARTY_TYPE VARCHAR(20) NOT NULL,
                                PARTY_SUB_TYPE VARCHAR(20) NOT NULL,
                                DISPLAY_NAME NVARCHAR(100) NOT NULL,
                                DESCRIPTION NVARCHAR(255) NULL,
                                IS_ACTIVE BIT DEFAULT 1 NOT NULL,
                                CONSTRAINT PK_pt_party_type_code PRIMARY KEY (PARTY_TYPE, PARTY_SUB_TYPE)
                            );
                            INSERT INTO dbo.PT_PARTY_TYPE_CODE (PARTY_TYPE, PARTY_SUB_TYPE, DISPLAY_NAME, DESCRIPTION, IS_ACTIVE)
                            VALUES
                                ('ORGANIZATION', 'INSURED', 'Commercial Insured', 'Standard commercial entity requiring coverage', 1),
                                ('ORGANIZATION', 'AGENCY', 'Brokerage / Agency', 'Independent or captive retail insurance brokerage', 1),
                                ('PERSON', 'EMPLOYEE', 'Internal Employee', 'Internal underwriting, claims, or operations staff member', 1),
                                ('PERSON', 'PRODUCER', 'Licensed Producer', 'Licensed retail insurance agent or producer', 1);
                        END;

                        IF OBJECT_ID('dbo.PT_PARTY', 'U') IS NULL
                        CREATE TABLE dbo.PT_PARTY (
                            PARTY_ID INT IDENTITY(1,1) PRIMARY KEY,
                            ORG_NM VARCHAR(100) NOT NULL,
                            PARTY_TYPE VARCHAR(20) DEFAULT 'ORGANIZATION',
                            PARTY_SUB_TYPE VARCHAR(20) DEFAULT 'INSURED',
                            FIRST_NAME NVARCHAR(100) NULL,
                            LAST_NAME NVARCHAR(100) NULL,
                            PRIMARY_ADDRESS_ID INT NULL
                        );

                        IF OBJECT_ID('dbo.PT_ADDRESS', 'U') IS NULL
                        BEGIN
                            CREATE TABLE dbo.PT_ADDRESS (
                                ADDRESS_ID INT IDENTITY(1,1) PRIMARY KEY,
                                PARTY_ID INT NOT NULL REFERENCES dbo.PT_PARTY(PARTY_ID),
                                LINE1 NVARCHAR(150) NOT NULL,
                                LINE2 NVARCHAR(150) NULL,
                                CITY NVARCHAR(100) NOT NULL,
                                STATE_CODE VARCHAR(2) NOT NULL,
                                POSTAL_CODE VARCHAR(10) NOT NULL,
                                COUNTY NVARCHAR(100) NULL,
                                COUNTRY_CODE VARCHAR(2) DEFAULT 'US' NOT NULL,
                                IS_ACTIVE BIT DEFAULT 1 NOT NULL,
                                ADDRESS_STATUS VARCHAR(20) DEFAULT 'ACTIVE' NOT NULL,
                                EFFECTIVE_FROM DATETIME2 DEFAULT GETDATE() NOT NULL,
                                EFFECTIVE_TO DATETIME2 NULL,
                                CHANGED_DT DATETIME2 DEFAULT GETDATE() NOT NULL,
                                CHANGED_BY NVARCHAR(100) NULL,
                                CHANGE_REASON NVARCHAR(255) NULL,
                                CREATED_DT DATETIME2 DEFAULT GETDATE() NOT NULL
                            );
                            CREATE INDEX IX_pt_address_party_active ON dbo.PT_ADDRESS (PARTY_ID, IS_ACTIVE);
                        END;

                        IF OBJECT_ID('dbo.REF_ZIP_CODE', 'U') IS NULL
                        BEGIN
                            CREATE TABLE dbo.REF_ZIP_CODE (
                                ZIP_CODE VARCHAR(10) NOT NULL PRIMARY KEY,
                                CITY NVARCHAR(100) NOT NULL,
                                STATE_CODE VARCHAR(2) NOT NULL,
                                STATE_NAME NVARCHAR(100) NULL,
                                COUNTY NVARCHAR(100) NULL,
                                IS_ACTIVE BIT DEFAULT 1 NOT NULL,
                                CREATED_DT DATETIME2 DEFAULT GETDATE() NOT NULL
                            );
                            CREATE INDEX IX_REF_ZIP_STATE_CITY ON dbo.REF_ZIP_CODE(STATE_CODE, CITY);
                            IF EXISTS (SELECT 1 FROM sys.databases WHERE name = 'HELIOS2_TST')
                            BEGIN
                                INSERT INTO dbo.REF_ZIP_CODE (ZIP_CODE, CITY, STATE_CODE, STATE_NAME, COUNTY, IS_ACTIVE, CREATED_DT)
                                SELECT ZIP_CODE, CITY, STATE_CODE, STATE_NAME, COUNTY, IS_ACTIVE, GETDATE()
                                FROM HELIOS2_TST.dbo.REF_ZIP_CODE;
                            END;
                        END;

                        IF OBJECT_ID('dbo.UW_TASK', 'U') IS NULL
                        CREATE TABLE dbo.UW_TASK (
                            TASK_ID INT IDENTITY(1,1) PRIMARY KEY,
                            TITLE VARCHAR(200) NOT NULL,
                            TASK_TYPE VARCHAR(100) NOT NULL,
                            TASK_SUBTYPE VARCHAR(100) NOT NULL,
                            RELATED_RECORD VARCHAR(50) NULL,
                            STATUS VARCHAR(50) NOT NULL,
                            DUE_DATE VARCHAR(20) NOT NULL
                        );

                        IF OBJECT_ID('dbo.UW_POLICY', 'U') IS NULL
                        CREATE TABLE dbo.UW_POLICY (
                            POLICY_ID INT IDENTITY(1,1) PRIMARY KEY,
                            POLICY_NBR VARCHAR(50) NOT NULL,
                            INSURED_PID INT NOT NULL,
                            INSURED_NM VARCHAR(150) NOT NULL,
                            PRODUCT_TYPE VARCHAR(100) NOT NULL,
                            FILE_STATUS VARCHAR(50) NOT NULL,
                            ADDRESS VARCHAR(255) NULL,
                            INDUSTRY VARCHAR(100) NULL,
                            AGENCY_INFO VARCHAR(255) NULL
                        );

                        IF OBJECT_ID('dbo.UW_SUBMSN', 'U') IS NULL
                        CREATE TABLE dbo.UW_SUBMSN (
                            SUBMSN_ID INT IDENTITY(100000,1) PRIMARY KEY,
                            SUBMSN_NBR VARCHAR(50) NOT NULL,
                            INSURED_PID INT NOT NULL REFERENCES dbo.PT_PARTY(PARTY_ID),
                            POLICY_ID INT NULL,
                            SUBMSN_DT VARCHAR(20) NULL,
                            STATUS VARCHAR(50) NULL,
                            UNDERWRITER VARCHAR(100) NULL,
                            EFFECTIVE_DT VARCHAR(20) NULL,
                            EXPIRATION_DT VARCHAR(20) NULL,
                            RETROACTIVE_DT VARCHAR(20) NULL,
                            LIMIT_AMT VARCHAR(50) NULL,
                            RETENTION_AMT VARCHAR(50) NULL
                        );

                        IF OBJECT_ID('dbo.UW_QUOTE', 'U') IS NULL
                        CREATE TABLE dbo.UW_QUOTE (
                            QUOTE_ID INT IDENTITY(1,1) PRIMARY KEY,
                            QUOTE_NBR VARCHAR(50) NOT NULL,
                            SUBMSN_ID INT NOT NULL,
                            PREMIUM VARCHAR(50) NOT NULL,
                            STATUS VARCHAR(50) NOT NULL,
                            GENERATED_DT VARCHAR(20) NOT NULL,
                            PRODUCT_CODE VARCHAR(50) NULL,
                            STATE_CODE VARCHAR(10) NULL,
                            EXPOSURE_VAL NUMERIC(18,2) NULL,
                            CLASS_CODE VARCHAR(50) NULL,
                            TERRITORY_CODE VARCHAR(50) NULL,
                            LIMIT_AMT VARCHAR(50) NULL,
                            RETENTION_AMT VARCHAR(50) NULL,
                            SCHEDULE_MOD NUMERIC(5,2) NULL,
                            SERFF_TRACKING_NBR VARCHAR(100) NULL,
                            FILING_VERSION VARCHAR(50) NULL,
                            BASE_RATE NUMERIC(10,4) NULL,
                            CALC_TRACE VARCHAR(MAX) NULL,
                            ATTACHED_FORMS VARCHAR(MAX) NULL,
                            UNDERWRITING_REFERRALS VARCHAR(MAX) NULL
                        );

                        IF OBJECT_ID('dbo.CLM_CLAIM', 'U') IS NULL
                        CREATE TABLE dbo.CLM_CLAIM (
                            CLAIM_ID INT IDENTITY(1,1) PRIMARY KEY,
                            CLAIM_NBR VARCHAR(50) NOT NULL,
                            POLICY_NBR VARCHAR(50) NOT NULL,
                            INSURED_NM VARCHAR(150) NOT NULL,
                            PRODUCT_TYPE VARCHAR(100) NOT NULL,
                            LOSS_DT VARCHAR(20) NOT NULL,
                            STATUS VARCHAR(50) NOT NULL,
                            RESERVE_AMT VARCHAR(50) NOT NULL,
                            DESCRIPTION VARCHAR(255) NULL
                        );

                        IF OBJECT_ID('dbo.APP_USER', 'U') IS NULL
                        BEGIN
                            CREATE TABLE dbo.APP_USER (
                                USER_ID INT IDENTITY(1001,1) PRIMARY KEY,
                                TENANT_ID INT NOT NULL,
                                USERNAME VARCHAR(100) NOT NULL,
                                EMAIL VARCHAR(150) NULL,
                                DISPLAY_NAME VARCHAR(150) NOT NULL,
                                PASSWORD_HASH VARCHAR(255) NULL,
                                ROLE_CODE VARCHAR(50) NOT NULL,
                                DEPARTMENT VARCHAR(100) NULL,
                                AUTH_PROVIDER VARCHAR(50) NOT NULL DEFAULT 'LOCAL',
                                EXTERNAL_SUBJECT_ID VARCHAR(128) NULL,
                                IS_ACTIVE BIT NOT NULL DEFAULT 1,
                                CREATED_DT DATETIME NOT NULL DEFAULT GETDATE(),
                                UPDATED_DT DATETIME NOT NULL DEFAULT GETDATE(),
                                LAST_LOGIN_DT DATETIME NULL,
                                CONSTRAINT UQ_APP_USER_TENANT_USERNAME UNIQUE (TENANT_ID, USERNAME)
                            );
                        END;

                        IF OBJECT_ID('dbo.DOC_DOCUMENT', 'U') IS NULL
                        BEGIN
                            CREATE TABLE dbo.DOC_DOCUMENT (
                                DOCUMENT_ID INT IDENTITY(1,1) PRIMARY KEY,
                                TENANT_ID INT NOT NULL,
                                ENTITY_TYPE VARCHAR(50) NOT NULL,
                                ENTITY_ID INT NOT NULL,
                                ENTITY_NBR VARCHAR(100) NULL,
                                DOC_TYPE VARCHAR(50) NOT NULL,
                                DOC_TITLE VARCHAR(255) NOT NULL,
                                FILE_NAME VARCHAR(255) NOT NULL,
                                FILE_PATH VARCHAR(500) NOT NULL,
                                FILE_SIZE_BYTES BIGINT NOT NULL,
                                MIME_TYPE VARCHAR(100) NOT NULL,
                                PAGE_COUNT INT NOT NULL,
                                STATUS VARCHAR(50) NOT NULL,
                                GENERATED_BY VARCHAR(100) NOT NULL,
                                CREATED_DT DATETIME2 NOT NULL DEFAULT GETDATE(),
                                UPDATED_DT DATETIME2 NOT NULL DEFAULT GETDATE()
                            );
                        END;

                        IF OBJECT_ID('dbo.DOC_INCOMING', 'U') IS NULL
                        BEGIN
                            CREATE TABLE dbo.DOC_INCOMING (
                                INCOMING_ID INT IDENTITY(1,1) PRIMARY KEY,
                                TENANT_ID INT NOT NULL DEFAULT 1,
                                DOCUMENT_NAME NVARCHAR(255) NOT NULL,
                                FILE_NAME NVARCHAR(255) NOT NULL,
                                FILE_PATH NVARCHAR(500) NOT NULL,
                                FILE_SIZE_BYTES BIGINT NULL,
                                MIME_TYPE NVARCHAR(100) NULL,
                                GROUP_ID NVARCHAR(100) NULL,
                                GROUP_NAME NVARCHAR(255) NULL,
                                STATUS NVARCHAR(50) NOT NULL DEFAULT 'QUEUED',
                                ATTACHED_ENTITY_TYPE NVARCHAR(50) NULL,
                                ATTACHED_ENTITY_ID BIGINT NULL,
                                ATTACHED_ENTITY_NBR NVARCHAR(100) NULL,
                                DOCUMENT_ID BIGINT NULL,
                                RECEIVED_DT DATETIME2 NOT NULL DEFAULT GETDATE(),
                                ATTACHED_DT DATETIME2 NULL,
                                ATTACHED_BY NVARCHAR(100) NULL,
                                CREATED_DT DATETIME2 NOT NULL DEFAULT GETDATE(),
                                UPDATED_DT DATETIME2 NOT NULL DEFAULT GETDATE()
                            );
                            CREATE INDEX IX_DOC_INCOMING_STATUS ON dbo.DOC_INCOMING(TENANT_ID, STATUS);
                            CREATE INDEX IX_DOC_INCOMING_GROUP ON dbo.DOC_INCOMING(GROUP_ID);
                            CREATE INDEX IX_DOC_INCOMING_ATTACHED ON dbo.DOC_INCOMING(ATTACHED_ENTITY_TYPE, ATTACHED_ENTITY_ID);
                        END;
                        """);

                // Seed baseline accounts for the tenant
                tenantJdbc.update("""
                        IF NOT EXISTS (SELECT 1 FROM dbo.APP_USER WHERE TENANT_ID = ?)
                        BEGIN
                            INSERT INTO dbo.APP_USER (TENANT_ID, USERNAME, EMAIL, DISPLAY_NAME, ROLE_CODE, DEPARTMENT, AUTH_PROVIDER, IS_ACTIVE)
                            VALUES
                                (?, 'admin', 'admin@example.com', 'Tenant Administrator', 'EXECUTIVE', 'Executive Management', 'LOCAL', 1),
                                (?, 'underwriter', 'underwriter@example.com', 'Senior Underwriter', 'UNDERWRITER', 'Commercial Underwriting', 'LOCAL', 1),
                                (?, 'adjuster', 'adjuster@example.com', 'Claims Specialist', 'CLAIMS_ADJUSTER', 'Claims Handling', 'LOCAL', 1);
                        END;
                        """, assignedTenantId, assignedTenantId, assignedTenantId, assignedTenantId);

                // Seed sample party and initial task
                tenantJdbc.update("""
                        IF NOT EXISTS (SELECT 1 FROM dbo.PT_PARTY)
                        BEGIN
                            INSERT INTO dbo.PT_PARTY (ORG_NM, PARTY_TYPE, PARTY_SUB_TYPE) VALUES ('Sample Commercial Insured', 'ORGANIZATION', 'INSURED');
                            DECLARE @newPid INT = SCOPE_IDENTITY();
                            INSERT INTO dbo.PT_ADDRESS (PARTY_ID, LINE1, CITY, STATE_CODE, POSTAL_CODE, COUNTY, COUNTRY_CODE, IS_ACTIVE, ADDRESS_STATUS, CHANGE_REASON)
                            VALUES (@newPid, '100 Business Parkway', 'Chicago', 'IL', '60611', 'Cook', 'US', 1, 'ACTIVE', 'Initial Provisioning');
                            DECLARE @newAid INT = SCOPE_IDENTITY();
                            UPDATE dbo.PT_PARTY SET PRIMARY_ADDRESS_ID = @newAid WHERE PARTY_ID = @newPid;

                            INSERT INTO dbo.UW_TASK (TITLE, TASK_TYPE, TASK_SUBTYPE, RELATED_RECORD, STATUS, DUE_DATE)
                            VALUES ('Review Baseline Tenant Setup & Portfolios', 'Underwriting', 'Initial Review', 'SUB-INIT-001', 'In Progress', CONVERT(VARCHAR(10), GETDATE(), 120));
                        END;
                        """);

                schemaCreated = true;
            } finally {
                if (tenantDs instanceof AutoCloseable ac) {
                    try { ac.close(); } catch (Exception ignored) {}
                }
            }
        }

        // 3. Ensure local tenant storage directory structure exists
        try {
            File uploadDir = new File("C:/helios-storage/documents/tenant_" + assignedTenantId + "/upload");
            uploadDir.mkdirs();
            File tenantDir = new File("C:/helios-storage/tenant_" + assignedTenantId);
            tenantDir.mkdirs();
        } catch (Exception e) {
            System.err.println("Warning creating tenant storage directory: " + e.getMessage());
        }

        // 4. Register in MSTR_DATA.dbo.TENANT_DB_CONFIG
        TenantConfig savedConfig = registerOrUpdateTenant(new TenantConfig(
                assignedTenantId,
                tenantName,
                serverName,
                catalogName,
                req.primaryColor(),
                req.accentColor(),
                req.brandTitle(),
                req.brandSubtitle(),
                req.enabledModules()
        ));

        // 5. Seed default roles for tenant in dbo.TENANT_ROLE_CONFIG
        seedDefaultRolesForTenant(assignedTenantId);

        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("success", true);
        resp.put("tenantId", assignedTenantId);
        resp.put("tenantName", tenantName);
        resp.put("dbServerName", serverName);
        resp.put("dbCatalogName", catalogName);
        resp.put("databaseCreated", dbCreated);
        resp.put("schemaCreated", schemaCreated);
        resp.put("tenantConfig", savedConfig);
        resp.put("message", "Tenant #" + assignedTenantId + " (" + tenantName + ") successfully provisioned with SQL database '" + catalogName + "'.");
        return resp;
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

