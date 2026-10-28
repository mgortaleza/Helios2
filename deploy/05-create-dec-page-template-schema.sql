-- ============================================================================
-- Helios Platform: Dynamic Declaration Page Template Ingestion & Generation
-- Target Database: Tenant Catalogs (HELIOS2_TST, HELIOS_TST, HELIOS3_TST, MSTR_DATA)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. DecPageTemplate: Master Template Configuration Table
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'dec_page_template' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE dbo.dec_page_template (
        id BIGINT IDENTITY(1,1) NOT NULL,
        form_id VARCHAR(50) NOT NULL,
        form_revision VARCHAR(20) NOT NULL,
        form_name NVARCHAR(255) NOT NULL,
        effective_date DATE NOT NULL,
        product_id INT NOT NULL,
        file_storage_path NVARCHAR(500) NOT NULL,
        created_at DATETIME2 NOT NULL CONSTRAINT DF_dec_template_created DEFAULT GETDATE(),
        updated_at DATETIME2 NOT NULL CONSTRAINT DF_dec_template_updated DEFAULT GETDATE(),
        CONSTRAINT PK_dec_page_template PRIMARY KEY CLUSTERED (id),
        CONSTRAINT UQ_dec_page_template_form_rev UNIQUE (form_id, form_revision)
    );

    CREATE NONCLUSTERED INDEX IX_dec_page_template_product 
        ON dbo.dec_page_template (product_id, effective_date);

    PRINT 'Created dbo.dec_page_template table.';
END
ELSE
BEGIN
    PRINT 'dbo.dec_page_template already exists.';
END
GO

-- ----------------------------------------------------------------------------
-- 2. DecPageTemplateField: Child Extracted Fields Table
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'dec_page_template_field' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE dbo.dec_page_template_field (
        id BIGINT IDENTITY(1,1) NOT NULL,
        template_id BIGINT NOT NULL,
        field_name VARCHAR(100) NOT NULL,
        created_at DATETIME2 NOT NULL CONSTRAINT DF_dec_field_created DEFAULT GETDATE(),
        CONSTRAINT PK_dec_page_template_field PRIMARY KEY CLUSTERED (id),
        CONSTRAINT FK_dec_field_template FOREIGN KEY (template_id) 
            REFERENCES dbo.dec_page_template (id) ON DELETE CASCADE
    );

    CREATE NONCLUSTERED INDEX IX_dec_field_template_id 
        ON dbo.dec_page_template_field (template_id);

    PRINT 'Created dbo.dec_page_template_field table.';
END
ELSE
BEGIN
    PRINT 'dbo.dec_page_template_field already exists.';
END
GO

