-- ============================================================================
-- Helios Platform Tier 1 Control Plane: System Configuration Schema
-- Target Database: MSTR_DATA (or Helios_Platform_Admin)
-- ============================================================================

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'system_configuration' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE dbo.system_configuration (
        config_key VARCHAR(100) NOT NULL,
        config_value NVARCHAR(MAX) NOT NULL,
        description NVARCHAR(500) NULL,
        is_encrypted BIT NOT NULL CONSTRAINT DF_system_configuration_encrypted DEFAULT 0,
        updated_at DATETIME2 NOT NULL CONSTRAINT DF_system_configuration_updated DEFAULT GETDATE(),
        CONSTRAINT PK_system_configuration PRIMARY KEY CLUSTERED (config_key)
    );

    PRINT 'Created table dbo.system_configuration in master catalog.';
END
ELSE
BEGIN
    PRINT 'Table dbo.system_configuration already exists.';
END
GO

-- Seed Default Enterprise Configurations
-- Sourced dynamically by Spring Boot SystemConfigurationService with zero-downtime refresh.
-- Default storage path set to C:/helios-storage; designed for zero-code cutover to enterprise UNC share (e.g. \\fileserver\helios-storage)

IF NOT EXISTS (SELECT 1 FROM dbo.system_configuration WHERE config_key = 'storage.root.path')
BEGIN
    INSERT INTO dbo.system_configuration (config_key, config_value, description, is_encrypted, updated_at)
    VALUES (
        'storage.root.path',
        'C:/helios-storage',
        'Root physical directory or Windows UNC network share for all tenant files, templates, and documents.',
        0,
        GETDATE()
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM dbo.system_configuration WHERE config_key = 'storage.provider')
BEGIN
    INSERT INTO dbo.system_configuration (config_key, config_value, description, is_encrypted, updated_at)
    VALUES (
        'storage.provider',
        'FILESYSTEM',
        'Storage driver provider type (FILESYSTEM / UNC / S3).',
        0,
        GETDATE()
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM dbo.system_configuration WHERE config_key = 'cache.sync.cron')
BEGIN
    INSERT INTO dbo.system_configuration (config_key, config_value, description, is_encrypted, updated_at)
    VALUES (
        'cache.sync.cron',
        '0 0 2 * * *',
        'Spring cron expression for nightly off-hours reference cache synchronization (ops.sp_RefreshReferenceCache).',
        0,
        GETDATE()
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM dbo.system_configuration WHERE config_key = 'cache.sync.batch.size')
BEGIN
    INSERT INTO dbo.system_configuration (config_key, config_value, description, is_encrypted, updated_at)
    VALUES (
        'cache.sync.batch.size',
        '500',
        'Maximum batch batch size for MERGE synchronization cycles.',
        0,
        GETDATE()
    );
END
GO

