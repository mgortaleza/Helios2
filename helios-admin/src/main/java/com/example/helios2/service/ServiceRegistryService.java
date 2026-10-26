package com.example.helios2.service;

import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Service;

@Service
public class ServiceRegistryService {

    private static final Logger log = LoggerFactory.getLogger(ServiceRegistryService.class);

    private final JdbcTemplate masterJdbcTemplate;
    private final AtomicBoolean schemaInitialized = new AtomicBoolean(false);

    public record ServiceCatalogDto(
            int serviceId,
            String serviceKey,
            String displayName,
            String shortName,
            String serviceDesc,
            int port,
            String windowsService,
            String diagnosticsRoute,
            String healthUrl,
            String uiColor,
            String uiIcon,
            int displayOrder,
            boolean requiresTenant,
            boolean isActive
    ) {}

    private static final RowMapper<ServiceCatalogDto> SERVICE_ROW_MAPPER = (rs, rowNum) -> new ServiceCatalogDto(
            rs.getInt("SERVICE_ID"),
            rs.getString("SERVICE_KEY"),
            rs.getString("DISPLAY_NAME"),
            rs.getString("SHORT_NAME"),
            rs.getString("SERVICE_DESC"),
            rs.getInt("PORT"),
            rs.getString("WINDOWS_SERVICE"),
            rs.getString("DIAGNOSTICS_ROUTE"),
            rs.getString("HEALTH_URL"),
            rs.getString("UI_COLOR"),
            rs.getString("UI_ICON"),
            rs.getInt("DISPLAY_ORDER"),
            rs.getBoolean("REQUIRES_TENANT"),
            rs.getBoolean("IS_ACTIVE")
    );

    public ServiceRegistryService(@Qualifier("masterJdbcTemplate") JdbcTemplate masterJdbcTemplate) {
        this.masterJdbcTemplate = masterJdbcTemplate;
    }

    public void ensureSchema() {
        if (!schemaInitialized.compareAndSet(false, true)) {
            return;
        }
        try {
            masterJdbcTemplate.execute("""
                    IF OBJECT_ID('dbo.MSTR_SERVICE_CATALOG', 'U') IS NULL
                    BEGIN
                        CREATE TABLE dbo.MSTR_SERVICE_CATALOG (
                            SERVICE_ID INT IDENTITY(1,1) PRIMARY KEY,
                            SERVICE_KEY VARCHAR(50) NOT NULL UNIQUE,
                            DISPLAY_NAME NVARCHAR(100) NOT NULL,
                            SHORT_NAME NVARCHAR(50) NOT NULL,
                            SERVICE_DESC NVARCHAR(255) NULL,
                            PORT INT NOT NULL,
                            WINDOWS_SERVICE NVARCHAR(100) NOT NULL,
                            DIAGNOSTICS_ROUTE NVARCHAR(255) NOT NULL,
                            HEALTH_URL NVARCHAR(255) NULL,
                            UI_COLOR VARCHAR(30) NOT NULL DEFAULT '#0284c7',
                            UI_ICON VARCHAR(50) NOT NULL DEFAULT 'Server',
                            DISPLAY_ORDER INT NOT NULL DEFAULT 10,
                            REQUIRES_TENANT BIT NOT NULL DEFAULT 0,
                            IS_ACTIVE BIT NOT NULL DEFAULT 1,
                            CREATED_DT DATETIME NOT NULL DEFAULT GETDATE(),
                            UPDATED_DT DATETIME NOT NULL DEFAULT GETDATE()
                        );

                        INSERT INTO dbo.MSTR_SERVICE_CATALOG 
                            (SERVICE_KEY, DISPLAY_NAME, SHORT_NAME, SERVICE_DESC, PORT, WINDOWS_SERVICE, DIAGNOSTICS_ROUTE, UI_COLOR, UI_ICON, DISPLAY_ORDER, REQUIRES_TENANT)
                        VALUES
                            ('helios2', 'Helios2 Core Policy & Claims', 'Helios2 Core', 'Policy lifecycle, submissions intake, claims & dynamic multi-tenant routing', 8080, 'Tomcat11', '/core-api/diagnostics', '#4c0519', 'Layers', 1, 0),
                            ('admin', 'HeliosAdmin Control Plane', 'HeliosAdmin', 'Multi-tenant branding, role definitions, identity & ACL management', 8082, 'Tomcat11Admin', '/api/diagnostics', '#0f172a', 'ShieldCheck', 2, 0),
                            ('rating', 'HeliosRating Rules & SERFF Engine', 'HeliosRating', 'Multi-state statutory filings, schedule caps & rating algorithms', 8084, 'Tomcat11Rating', '/rating-api/diagnostics', '#0284c7', 'Calculator', 3, 0),
                            ('document', 'HeliosDocument Repository & Lifecycle', 'HeliosDocument', 'SQL Server metadata tracking, disk storage, retrieval, preview & lifecycle', 8086, 'Tomcat11Document', '/document-api/documents/diagnostics', '#7c3aed', 'FileText', 4, 1),
                            ('docgen', 'HeliosDocgen Dedicated PDF Engine', 'HeliosDocgen', 'Isolated high-performance Aspose.PDF generation engine (Dec pages, binders, proposals)', 8088, 'Tomcat11Docgen', '/docgen-api/diagnostics', '#d97706', 'Printer', 5, 0);
                            ('gmailcap', 'Helios GmailCap Mail Intake', 'GmailCap', 'Automated Python Gmail poller (60s) capturing submissions, EML & attachments', 0, 'gmailcap.py (1m interval)', '/api/diagnostics/gmailcap', '#ea4335', 'Mail', 6, 0);
                    END
                    """);
            log.info("Verified dbo.MSTR_SERVICE_CATALOG schema in MSTR_DATA");
        } catch (Exception e) {
            log.error("Failed to ensure MSTR_SERVICE_CATALOG schema: {}", e.getMessage(), e);
        }
    }

    public List<ServiceCatalogDto> getActiveServices() {
        ensureSchema();
        String sql = """
                SELECT SERVICE_ID, SERVICE_KEY, DISPLAY_NAME, SHORT_NAME, SERVICE_DESC,
                       PORT, WINDOWS_SERVICE, DIAGNOSTICS_ROUTE, HEALTH_URL,
                       UI_COLOR, UI_ICON, DISPLAY_ORDER, REQUIRES_TENANT, IS_ACTIVE
                FROM dbo.MSTR_SERVICE_CATALOG
                WHERE IS_ACTIVE = 1
                ORDER BY DISPLAY_ORDER, SERVICE_ID
                """;
        return masterJdbcTemplate.query(sql, SERVICE_ROW_MAPPER);
    }

    public List<ServiceCatalogDto> getAllServices() {
        ensureSchema();
        String sql = """
                SELECT SERVICE_ID, SERVICE_KEY, DISPLAY_NAME, SHORT_NAME, SERVICE_DESC,
                       PORT, WINDOWS_SERVICE, DIAGNOSTICS_ROUTE, HEALTH_URL,
                       UI_COLOR, UI_ICON, DISPLAY_ORDER, REQUIRES_TENANT, IS_ACTIVE
                FROM dbo.MSTR_SERVICE_CATALOG
                ORDER BY DISPLAY_ORDER, SERVICE_ID
                """;
        return masterJdbcTemplate.query(sql, SERVICE_ROW_MAPPER);
    }

    public ServiceCatalogDto saveService(ServiceCatalogDto dto) {
        ensureSchema();
        String upsertSql = """
                MERGE INTO dbo.MSTR_SERVICE_CATALOG AS target
                USING (SELECT ? AS SERVICE_KEY) AS source
                ON (target.SERVICE_KEY = source.SERVICE_KEY)
                WHEN MATCHED THEN
                    UPDATE SET DISPLAY_NAME = ?,
                               SHORT_NAME = ?,
                               SERVICE_DESC = ?,
                               PORT = ?,
                               WINDOWS_SERVICE = ?,
                               DIAGNOSTICS_ROUTE = ?,
                               HEALTH_URL = ?,
                               UI_COLOR = ?,
                               UI_ICON = ?,
                               DISPLAY_ORDER = ?,
                               REQUIRES_TENANT = ?,
                               IS_ACTIVE = ?,
                               UPDATED_DT = GETDATE()
                WHEN NOT MATCHED THEN
                    INSERT (SERVICE_KEY, DISPLAY_NAME, SHORT_NAME, SERVICE_DESC, PORT, WINDOWS_SERVICE, DIAGNOSTICS_ROUTE, HEALTH_URL, UI_COLOR, UI_ICON, DISPLAY_ORDER, REQUIRES_TENANT, IS_ACTIVE)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
                """;

        masterJdbcTemplate.update(upsertSql,
                dto.serviceKey(),
                dto.displayName(),
                dto.shortName(),
                dto.serviceDesc(),
                dto.port(),
                dto.windowsService(),
                dto.diagnosticsRoute(),
                dto.healthUrl(),
                dto.uiColor() != null ? dto.uiColor() : "#0284c7",
                dto.uiIcon() != null ? dto.uiIcon() : "Server",
                dto.displayOrder(),
                dto.requiresTenant() ? 1 : 0,
                dto.isActive() ? 1 : 0,
                // Insert params:
                dto.serviceKey(),
                dto.displayName(),
                dto.shortName(),
                dto.serviceDesc(),
                dto.port(),
                dto.windowsService(),
                dto.diagnosticsRoute(),
                dto.healthUrl(),
                dto.uiColor() != null ? dto.uiColor() : "#0284c7",
                dto.uiIcon() != null ? dto.uiIcon() : "Server",
                dto.displayOrder(),
                dto.requiresTenant() ? 1 : 0,
                dto.isActive() ? 1 : 0
        );

        return masterJdbcTemplate.query(
                "SELECT * FROM dbo.MSTR_SERVICE_CATALOG WHERE SERVICE_KEY = ?",
                SERVICE_ROW_MAPPER,
                dto.serviceKey()
        ).stream().findFirst().orElse(dto);
    }
}
