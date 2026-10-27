-- ============================================================================
-- Helios Platform Document & Word Template Storage Evolution:
-- Migrate from DB BLOB (FILE_DATA) to Filesystem / Windows UNC Share Storage
-- Target Database: Tenant Catalogs (HELIOS2_TST, HELIOS_TST, etc.)
-- ============================================================================

IF EXISTS (SELECT * FROM sys.tables WHERE name = 'DOCUMENT_TEMPLATES' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    -- 1. Add Relative Path (StorageService relative path, e.g. tenants/{tenantCode}/templates/{uuid}.docx)
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.DOCUMENT_TEMPLATES') AND name = 'RELATIVE_PATH')
    BEGIN
        ALTER TABLE dbo.DOCUMENT_TEMPLATES ADD RELATIVE_PATH VARCHAR(500) NULL;
    END

    -- 2. Add File Size Bytes
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.DOCUMENT_TEMPLATES') AND name = 'FILE_SIZE_BYTES')
    BEGIN
        ALTER TABLE dbo.DOCUMENT_TEMPLATES ADD FILE_SIZE_BYTES BIGINT NULL DEFAULT 0;
    END

    -- 3. Add SHA-256 Checksum for immutability & tampering verification
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.DOCUMENT_TEMPLATES') AND name = 'SHA256_CHECKSUM')
    BEGIN
        ALTER TABLE dbo.DOCUMENT_TEMPLATES ADD SHA256_CHECKSUM VARCHAR(64) NULL;
    END

    -- 4. Add Form Number
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.DOCUMENT_TEMPLATES') AND name = 'FORM_NUMBER')
    BEGIN
        ALTER TABLE dbo.DOCUMENT_TEMPLATES ADD FORM_NUMBER VARCHAR(100) NULL;
    END

    -- 5. Add Edition Date
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.DOCUMENT_TEMPLATES') AND name = 'EDITION_DATE')
    BEGIN
        ALTER TABLE dbo.DOCUMENT_TEMPLATES ADD EDITION_DATE VARCHAR(20) NULL;
    END

    -- 6. Add Approval Status
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.DOCUMENT_TEMPLATES') AND name = 'APPROVAL_STATUS')
    BEGIN
        ALTER TABLE dbo.DOCUMENT_TEMPLATES ADD APPROVAL_STATUS VARCHAR(50) NOT NULL CONSTRAINT DF_doc_template_approval DEFAULT 'APPROVED';
    END

    -- 7. Make FILE_DATA VARBINARY(MAX) NULLABLE (Deprecating database BLOB storage)
    ALTER TABLE dbo.DOCUMENT_TEMPLATES ALTER COLUMN FILE_DATA VARBINARY(MAX) NULL;

    PRINT 'Updated dbo.DOCUMENT_TEMPLATES table with relative path & storage metadata columns.';
END
GO

