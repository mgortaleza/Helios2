-- ============================================================================
-- Helios Platform Service Catalog Registry Schema & Seed Data
-- Database: MSTR_DATA
-- Description: Dynamic service registry driving the Admin Diagnostics page.
--              Whenever a new microservice is added or provisioned on Tomcat,
--              inserting a row into this table enables real-time monitoring
--              with ZERO code changes in the frontend or backend!
-- ============================================================================

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

    PRINT 'Created and seeded dbo.MSTR_SERVICE_CATALOG in MSTR_DATA';
END
GO
