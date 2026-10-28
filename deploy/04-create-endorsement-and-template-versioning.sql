-- ============================================================================
-- Helios Platform Multi-Tenant Database Architecture: Option B
-- Endorsement Definition & Template Versioning Subsystem
-- Target Databases: Tenant dedicated catalogs (e.g., HELIOS2_TST, HELIOS_TST, HELIOS3_TST)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Ensure Required Schemas Exist
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'mstr')
    EXEC('CREATE SCHEMA [mstr]');
GO

IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'ref')
    EXEC('CREATE SCHEMA [ref]');
GO

IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'ops')
    EXEC('CREATE SCHEMA [ops]');
GO

-- ----------------------------------------------------------------------------
-- 2. Master Endorsement Definition Table: [mstr].[endorsement_definition]
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'endorsement_definition' AND schema_id = SCHEMA_ID('mstr'))
BEGIN
    CREATE TABLE mstr.endorsement_definition (
        ENDORSEMENT_ID UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_mstr_end_id DEFAULT NEWID(),
        ENDORSEMENT_CODE VARCHAR(50) NOT NULL,
        ENDORSEMENT_NAME NVARCHAR(200) NOT NULL,
        DESCRIPTION NVARCHAR(MAX) NULL,
        LINE_OF_BUSINESS VARCHAR(50) NOT NULL,
        IS_MANDATORY BIT NOT NULL CONSTRAINT DF_mstr_end_mandatory DEFAULT 0,
        CREATED_AT DATETIME2 NOT NULL CONSTRAINT DF_mstr_end_created DEFAULT GETDATE(),
        UPDATED_AT DATETIME2 NOT NULL CONSTRAINT DF_mstr_end_updated DEFAULT GETDATE(),
        CONSTRAINT PK_mstr_endorsement_definition PRIMARY KEY CLUSTERED (ENDORSEMENT_ID),
        CONSTRAINT UQ_mstr_endorsement_code UNIQUE (ENDORSEMENT_CODE)
    );

    CREATE NONCLUSTERED INDEX IX_mstr_end_lob ON mstr.endorsement_definition (LINE_OF_BUSINESS);
    PRINT 'Created mstr.endorsement_definition table.';
END
ELSE
BEGIN
    PRINT 'mstr.endorsement_definition table already exists.';
END
GO

-- ----------------------------------------------------------------------------
-- 3. Master Template Definition Table with Versioning: [mstr].[template_definition]
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'template_definition' AND schema_id = SCHEMA_ID('mstr'))
BEGIN
    CREATE TABLE mstr.template_definition (
        TEMPLATE_ID UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_mstr_tpl_id DEFAULT NEWID(),
        ENDORSEMENT_ID UNIQUEIDENTIFIER NOT NULL,
        TEMPLATE_NAME NVARCHAR(200) NOT NULL,
        FILE_NAME NVARCHAR(255) NOT NULL,
        VERSION_NUMBER INT NOT NULL CONSTRAINT DF_mstr_tpl_ver DEFAULT 1,
        EDITION_DATE DATE NOT NULL,
        RELATIVE_PATH VARCHAR(500) NOT NULL,
        FILE_SIZE_BYTES BIGINT NOT NULL CONSTRAINT DF_mstr_tpl_size DEFAULT 0,
        SHA256_CHECKSUM CHAR(64) NOT NULL,
        STATUS VARCHAR(30) NOT NULL CONSTRAINT DF_mstr_tpl_status DEFAULT 'ACTIVE', -- DRAFT, ACTIVE, SUPERSEDED, ARCHIVED
        EFFECTIVE_DATE DATE NOT NULL,
        EXPIRATION_DATE DATE NULL,
        OUTPUT_FORMAT VARCHAR(20) NOT NULL CONSTRAINT DF_mstr_tpl_fmt DEFAULT 'PDF', -- PDF, DOCX
        IS_CURRENT_VERSION BIT NOT NULL CONSTRAINT DF_mstr_tpl_current DEFAULT 1,
        CREATED_AT DATETIME2 NOT NULL CONSTRAINT DF_mstr_tpl_created DEFAULT GETDATE(),
        UPDATED_AT DATETIME2 NOT NULL CONSTRAINT DF_mstr_tpl_updated DEFAULT GETDATE(),
        CONSTRAINT PK_mstr_template_definition PRIMARY KEY CLUSTERED (TEMPLATE_ID),
        CONSTRAINT FK_mstr_tpl_endorsement FOREIGN KEY (ENDORSEMENT_ID) 
            REFERENCES mstr.endorsement_definition (ENDORSEMENT_ID) ON DELETE CASCADE
    );

    CREATE NONCLUSTERED INDEX IX_mstr_tpl_endorsement_version 
        ON mstr.template_definition (ENDORSEMENT_ID, VERSION_NUMBER DESC);

    CREATE NONCLUSTERED INDEX IX_mstr_tpl_current_lookup 
        ON mstr.template_definition (ENDORSEMENT_ID, IS_CURRENT_VERSION, STATUS);

    PRINT 'Created mstr.template_definition table.';
END
ELSE
BEGIN
    PRINT 'mstr.template_definition table already exists.';
END
GO

-- ----------------------------------------------------------------------------
-- 4. Reference Endorsement Cache: [ref].[endorsement_cache]
-- Populated by nightly batch sync ops.sp_RefreshReferenceCache
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'endorsement_cache' AND schema_id = SCHEMA_ID('ref'))
BEGIN
    CREATE TABLE ref.endorsement_cache (
        ENDORSEMENT_ID UNIQUEIDENTIFIER NOT NULL,
        ENDORSEMENT_CODE VARCHAR(50) NOT NULL,
        ENDORSEMENT_NAME NVARCHAR(200) NOT NULL,
        DESCRIPTION NVARCHAR(MAX) NULL,
        LINE_OF_BUSINESS VARCHAR(50) NOT NULL,
        IS_MANDATORY BIT NOT NULL,
        TEMPLATE_ID UNIQUEIDENTIFIER NULL,
        TEMPLATE_NAME NVARCHAR(200) NULL,
        VERSION_NUMBER INT NULL,
        EDITION_DATE DATE NULL,
        RELATIVE_PATH VARCHAR(500) NULL,
        SHA256_CHECKSUM CHAR(64) NULL,
        STATUS VARCHAR(30) NULL,
        OUTPUT_FORMAT VARCHAR(20) NULL,
        EFFECTIVE_DATE DATE NULL,
        EXPIRATION_DATE DATE NULL,
        LAST_SYNCED_AT DATETIME2 NOT NULL CONSTRAINT DF_ref_end_sync DEFAULT GETDATE(),
        SYNC_BATCH_ID VARCHAR(50) NOT NULL,
        CONSTRAINT PK_ref_endorsement_cache PRIMARY KEY CLUSTERED (ENDORSEMENT_ID)
    );

    CREATE NONCLUSTERED INDEX IX_ref_end_lob 
        ON ref.endorsement_cache (LINE_OF_BUSINESS, ENDORSEMENT_CODE);

    PRINT 'Created ref.endorsement_cache table.';
END
ELSE
BEGIN
    PRINT 'ref.endorsement_cache table already exists.';
END
GO

-- ----------------------------------------------------------------------------
-- 5. Seed Standard Industry Endorsements into [mstr].[endorsement_definition]
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM mstr.endorsement_definition WHERE ENDORSEMENT_CODE = 'CG 20 10')
BEGIN
    INSERT INTO mstr.endorsement_definition (ENDORSEMENT_CODE, ENDORSEMENT_NAME, DESCRIPTION, LINE_OF_BUSINESS, IS_MANDATORY)
    VALUES ('CG 20 10', 'Additional Insured - Owners, Lessees or Contractors - Scheduled Person or Organization', 
            'Provides additional insured status to scheduled owners, lessees or contractors regarding ongoing operations.', 'General Liability', 0);
END

IF NOT EXISTS (SELECT 1 FROM mstr.endorsement_definition WHERE ENDORSEMENT_CODE = 'CG 20 26')
BEGIN
    INSERT INTO mstr.endorsement_definition (ENDORSEMENT_CODE, ENDORSEMENT_NAME, DESCRIPTION, LINE_OF_BUSINESS, IS_MANDATORY)
    VALUES ('CG 20 26', 'Additional Insured - Designated Person or Organization', 
            'Designates a specific person or organization as an additional insured.', 'General Liability', 0);
END

IF NOT EXISTS (SELECT 1 FROM mstr.endorsement_definition WHERE ENDORSEMENT_CODE = 'CG 20 37')
BEGIN
    INSERT INTO mstr.endorsement_definition (ENDORSEMENT_CODE, ENDORSEMENT_NAME, DESCRIPTION, LINE_OF_BUSINESS, IS_MANDATORY)
    VALUES ('CG 20 37', 'Additional Insured - Owners, Lessees or Contractors - Completed Operations', 
            'Extends additional insured coverage to completed operations for designated entities.', 'General Liability', 0);
END

IF NOT EXISTS (SELECT 1 FROM mstr.endorsement_definition WHERE ENDORSEMENT_CODE = 'CA 20 48')
BEGIN
    INSERT INTO mstr.endorsement_definition (ENDORSEMENT_CODE, ENDORSEMENT_NAME, DESCRIPTION, LINE_OF_BUSINESS, IS_MANDATORY)
    VALUES ('CA 20 48', 'Designated Insured for Covered Autos Liability', 
            'Adds a designated entity as an insured for covered autos liability under commercial auto policies.', 'Commercial Auto', 0);
END

IF NOT EXISTS (SELECT 1 FROM mstr.endorsement_definition WHERE ENDORSEMENT_CODE = 'IL 00 17')
BEGIN
    INSERT INTO mstr.endorsement_definition (ENDORSEMENT_CODE, ENDORSEMENT_NAME, DESCRIPTION, LINE_OF_BUSINESS, IS_MANDATORY)
    VALUES ('IL 00 17', 'Common Policy Conditions', 
            'Standard common policy conditions applicable to commercial package and liability policies.', 'Commercial Package', 1);
END

IF NOT EXISTS (SELECT 1 FROM mstr.endorsement_definition WHERE ENDORSEMENT_CODE = 'END-WTR-01')
BEGIN
    INSERT INTO mstr.endorsement_definition (ENDORSEMENT_CODE, ENDORSEMENT_NAME, DESCRIPTION, LINE_OF_BUSINESS, IS_MANDATORY)
    VALUES ('END-WTR-01', 'Water Damage Exclusion & Flood Endorsement', 
            'Exclusion endorsement for flood and water damage with specified exception endorsements.', 'Commercial Property', 0);
END
GO

-- ----------------------------------------------------------------------------
-- 6. Updated Nightly Reference Cache Refresh Stored Procedure: [ops].[sp_RefreshReferenceCache]
-- Atomically projects mstr.* into ref.* for approved/active, effective-dated records
-- ----------------------------------------------------------------------------
CREATE OR ALTER PROCEDURE ops.sp_RefreshReferenceCache
    @BatchId VARCHAR(50) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF @BatchId IS NULL
        SET @BatchId = CONVERT(VARCHAR(50), NEWID());

    DECLARE @CurrentDate DATE = CAST(GETDATE() AS DATE);
    DECLARE @SyncTimestamp DATETIME2 = GETDATE();

    DECLARE @RowsProductSynced INT = 0;
    DECLARE @RowsFormSynced INT = 0;
    DECLARE @RowsApprovalSynced INT = 0;
    DECLARE @RowsPlanSynced INT = 0;
    DECLARE @RowsEndorsementSynced INT = 0;

    BEGIN TRY
        BEGIN TRANSACTION;

        -- 1. Sync Products (mstr.product_definition -> ref.product_cache)
        IF OBJECT_ID('mstr.product_definition', 'U') IS NOT NULL AND OBJECT_ID('ref.product_cache', 'U') IS NOT NULL
        BEGIN
            MERGE INTO ref.product_cache AS target
            USING (
                SELECT PRODUCT_ID, PRODUCT_CODE, PRODUCT_NAME, LINE_OF_BUSINESS, EFFECTIVE_DATE, EXPIRATION_DATE
                FROM mstr.product_definition
                WHERE IS_ACTIVE = 1
                  AND STATUS = 'APPROVED'
                  AND EFFECTIVE_DATE <= @CurrentDate
                  AND (EXPIRATION_DATE IS NULL OR EXPIRATION_DATE >= @CurrentDate)
            ) AS source
            ON target.PRODUCT_ID = source.PRODUCT_ID
            WHEN MATCHED AND (
                target.PRODUCT_CODE <> source.PRODUCT_CODE OR
                target.PRODUCT_NAME <> source.PRODUCT_NAME OR
                target.LINE_OF_BUSINESS <> source.LINE_OF_BUSINESS OR
                target.EFFECTIVE_DATE <> source.EFFECTIVE_DATE OR
                ISNULL(target.EXPIRATION_DATE, '9999-12-31') <> ISNULL(source.EXPIRATION_DATE, '9999-12-31')
            ) THEN
                UPDATE SET
                    target.PRODUCT_CODE = source.PRODUCT_CODE,
                    target.PRODUCT_NAME = source.PRODUCT_NAME,
                    target.LINE_OF_BUSINESS = source.LINE_OF_BUSINESS,
                    target.EFFECTIVE_DATE = source.EFFECTIVE_DATE,
                    target.EXPIRATION_DATE = source.EXPIRATION_DATE,
                    target.LAST_SYNCED_AT = @SyncTimestamp,
                    target.SYNC_BATCH_ID = @BatchId
            WHEN NOT MATCHED BY TARGET THEN
                INSERT (PRODUCT_ID, PRODUCT_CODE, PRODUCT_NAME, LINE_OF_BUSINESS, EFFECTIVE_DATE, EXPIRATION_DATE, LAST_SYNCED_AT, SYNC_BATCH_ID)
                VALUES (source.PRODUCT_ID, source.PRODUCT_CODE, source.PRODUCT_NAME, source.LINE_OF_BUSINESS, source.EFFECTIVE_DATE, source.EXPIRATION_DATE, @SyncTimestamp, @BatchId)
            WHEN NOT MATCHED BY SOURCE THEN
                DELETE;

            SET @RowsProductSynced = @@ROWCOUNT;
        END

        -- 2. Sync Forms (mstr.form_inventory -> ref.form_cache)
        IF OBJECT_ID('mstr.form_inventory', 'U') IS NOT NULL AND OBJECT_ID('ref.form_cache', 'U') IS NOT NULL
        BEGIN
            MERGE INTO ref.form_cache AS target
            USING (
                SELECT FORM_ID, FORM_NUMBER, FORM_NAME, EDITION_DATE, LINE_OF_BUSINESS, FORM_TYPE,
                       RELATIVE_PATH, FILE_SIZE_BYTES, SHA256_CHECKSUM, IS_MANDATORY, EFFECTIVE_DATE, EXPIRATION_DATE
                FROM mstr.form_inventory
                WHERE STATUS = 'APPROVED'
                  AND EFFECTIVE_DATE <= @CurrentDate
                  AND (EXPIRATION_DATE IS NULL OR EXPIRATION_DATE >= @CurrentDate)
            ) AS source
            ON target.FORM_ID = source.FORM_ID
            WHEN MATCHED AND (
                target.FORM_NUMBER <> source.FORM_NUMBER OR
                target.FORM_NAME <> source.FORM_NAME OR
                target.EDITION_DATE <> source.EDITION_DATE OR
                target.LINE_OF_BUSINESS <> source.LINE_OF_BUSINESS OR
                target.FORM_TYPE <> source.FORM_TYPE OR
                target.RELATIVE_PATH <> source.RELATIVE_PATH OR
                target.FILE_SIZE_BYTES <> source.FILE_SIZE_BYTES OR
                target.SHA256_CHECKSUM <> source.SHA256_CHECKSUM OR
                target.IS_MANDATORY <> source.IS_MANDATORY OR
                target.EFFECTIVE_DATE <> source.EFFECTIVE_DATE OR
                ISNULL(target.EXPIRATION_DATE, '9999-12-31') <> ISNULL(source.EXPIRATION_DATE, '9999-12-31')
            ) THEN
                UPDATE SET
                    target.FORM_NUMBER = source.FORM_NUMBER,
                    target.FORM_NAME = source.FORM_NAME,
                    target.EDITION_DATE = source.EDITION_DATE,
                    target.LINE_OF_BUSINESS = source.LINE_OF_BUSINESS,
                    target.FORM_TYPE = source.FORM_TYPE,
                    target.RELATIVE_PATH = source.RELATIVE_PATH,
                    target.FILE_SIZE_BYTES = source.FILE_SIZE_BYTES,
                    target.SHA256_CHECKSUM = source.SHA256_CHECKSUM,
                    target.IS_MANDATORY = source.IS_MANDATORY,
                    target.EFFECTIVE_DATE = source.EFFECTIVE_DATE,
                    target.EXPIRATION_DATE = source.EXPIRATION_DATE,
                    target.LAST_SYNCED_AT = @SyncTimestamp,
                    target.SYNC_BATCH_ID = @BatchId
            WHEN NOT MATCHED BY TARGET THEN
                INSERT (FORM_ID, FORM_NUMBER, FORM_NAME, EDITION_DATE, LINE_OF_BUSINESS, FORM_TYPE,
                        RELATIVE_PATH, FILE_SIZE_BYTES, SHA256_CHECKSUM, IS_MANDATORY, EFFECTIVE_DATE, EXPIRATION_DATE, LAST_SYNCED_AT, SYNC_BATCH_ID)
                VALUES (source.FORM_ID, source.FORM_NUMBER, source.FORM_NAME, source.EDITION_DATE, source.LINE_OF_BUSINESS, source.FORM_TYPE,
                        source.RELATIVE_PATH, source.FILE_SIZE_BYTES, source.SHA256_CHECKSUM, source.IS_MANDATORY, source.EFFECTIVE_DATE, source.EXPIRATION_DATE, @SyncTimestamp, @BatchId)
            WHEN NOT MATCHED BY SOURCE THEN
                DELETE;

            SET @RowsFormSynced = @@ROWCOUNT;
        END

        -- 3. Sync State Approvals (mstr.state_approval_filing -> ref.state_approval_cache)
        IF OBJECT_ID('mstr.state_approval_filing', 'U') IS NOT NULL AND OBJECT_ID('ref.state_approval_cache', 'U') IS NOT NULL
        BEGIN
            MERGE INTO ref.state_approval_cache AS target
            USING (
                SELECT f.FILING_ID, f.FORM_ID, f.STATE_CODE, inv.FORM_NUMBER, f.SERFF_TRACKING_NBR, 
                       f.APPROVAL_DATE, f.EFFECTIVE_DATE, f.EXPIRATION_DATE, f.MANDATORY_IN_STATE
                FROM mstr.state_approval_filing f
                INNER JOIN mstr.form_inventory inv ON f.FORM_ID = inv.FORM_ID
                WHERE f.APPROVAL_STATUS = 'APPROVED'
                  AND f.EFFECTIVE_DATE <= @CurrentDate
                  AND (f.EXPIRATION_DATE IS NULL OR f.EXPIRATION_DATE >= @CurrentDate)
                  AND inv.STATUS = 'APPROVED'
            ) AS source
            ON target.FILING_ID = source.FILING_ID
            WHEN MATCHED AND (
                target.FORM_ID <> source.FORM_ID OR
                target.STATE_CODE <> source.STATE_CODE OR
                target.FORM_NUMBER <> source.FORM_NUMBER OR
                ISNULL(target.SERFF_TRACKING_NBR, '') <> ISNULL(source.SERFF_TRACKING_NBR, '') OR
                target.MANDATORY_IN_STATE <> source.MANDATORY_IN_STATE OR
                target.EFFECTIVE_DATE <> source.EFFECTIVE_DATE OR
                ISNULL(target.EXPIRATION_DATE, '9999-12-31') <> ISNULL(source.EXPIRATION_DATE, '9999-12-31')
            ) THEN
                UPDATE SET
                    target.FORM_ID = source.FORM_ID,
                    target.STATE_CODE = source.STATE_CODE,
                    target.FORM_NUMBER = source.FORM_NUMBER,
                    target.SERFF_TRACKING_NBR = source.SERFF_TRACKING_NBR,
                    target.APPROVAL_DATE = source.APPROVAL_DATE,
                    target.EFFECTIVE_DATE = source.EFFECTIVE_DATE,
                    target.EXPIRATION_DATE = source.EXPIRATION_DATE,
                    target.MANDATORY_IN_STATE = source.MANDATORY_IN_STATE,
                    target.LAST_SYNCED_AT = @SyncTimestamp,
                    target.SYNC_BATCH_ID = @BatchId
            WHEN NOT MATCHED BY TARGET THEN
                INSERT (FILING_ID, FORM_ID, STATE_CODE, FORM_NUMBER, SERFF_TRACKING_NBR, APPROVAL_DATE, EFFECTIVE_DATE, EXPIRATION_DATE, MANDATORY_IN_STATE, LAST_SYNCED_AT, SYNC_BATCH_ID)
                VALUES (source.FILING_ID, source.FORM_ID, source.STATE_CODE, source.FORM_NUMBER, source.SERFF_TRACKING_NBR, source.APPROVAL_DATE, source.EFFECTIVE_DATE, source.EXPIRATION_DATE, source.MANDATORY_IN_STATE, @SyncTimestamp, @BatchId)
            WHEN NOT MATCHED BY SOURCE THEN
                DELETE;

            SET @RowsApprovalSynced = @@ROWCOUNT;
        END

        -- 4. Sync Rating Plans (mstr.rating_plan -> ref.rating_plan_cache)
        IF OBJECT_ID('mstr.rating_plan', 'U') IS NOT NULL AND OBJECT_ID('ref.rating_plan_cache', 'U') IS NOT NULL
        BEGIN
            MERGE INTO ref.rating_plan_cache AS target
            USING (
                SELECT PLAN_ID, PLAN_CODE, PLAN_NAME, LINE_OF_BUSINESS, STATE_CODE, ALGORITHM_VERSION, EFFECTIVE_DATE, EXPIRATION_DATE
                FROM mstr.rating_plan
                WHERE STATUS = 'APPROVED'
                  AND EFFECTIVE_DATE <= @CurrentDate
                  AND (EXPIRATION_DATE IS NULL OR EXPIRATION_DATE >= @CurrentDate)
            ) AS source
            ON target.PLAN_ID = source.PLAN_ID
            WHEN MATCHED AND (
                target.PLAN_CODE <> source.PLAN_CODE OR
                target.PLAN_NAME <> source.PLAN_NAME OR
                target.LINE_OF_BUSINESS <> source.LINE_OF_BUSINESS OR
                target.STATE_CODE <> source.STATE_CODE OR
                target.ALGORITHM_VERSION <> source.ALGORITHM_VERSION OR
                target.EFFECTIVE_DATE <> source.EFFECTIVE_DATE OR
                ISNULL(target.EXPIRATION_DATE, '9999-12-31') <> ISNULL(source.EXPIRATION_DATE, '9999-12-31')
            ) THEN
                UPDATE SET
                    target.PLAN_CODE = source.PLAN_CODE,
                    target.PLAN_NAME = source.PLAN_NAME,
                    target.LINE_OF_BUSINESS = source.LINE_OF_BUSINESS,
                    target.STATE_CODE = source.STATE_CODE,
                    target.ALGORITHM_VERSION = source.ALGORITHM_VERSION,
                    target.EFFECTIVE_DATE = source.EFFECTIVE_DATE,
                    target.EXPIRATION_DATE = source.EXPIRATION_DATE,
                    target.LAST_SYNCED_AT = @SyncTimestamp,
                    target.SYNC_BATCH_ID = @BatchId
            WHEN NOT MATCHED BY TARGET THEN
                INSERT (PLAN_ID, PLAN_CODE, PLAN_NAME, LINE_OF_BUSINESS, STATE_CODE, ALGORITHM_VERSION, EFFECTIVE_DATE, EXPIRATION_DATE, LAST_SYNCED_AT, SYNC_BATCH_ID)
                VALUES (source.PLAN_ID, source.PLAN_CODE, source.PLAN_NAME, source.LINE_OF_BUSINESS, source.STATE_CODE, source.ALGORITHM_VERSION, source.EFFECTIVE_DATE, source.EXPIRATION_DATE, @SyncTimestamp, @BatchId)
            WHEN NOT MATCHED BY SOURCE THEN
                DELETE;

            SET @RowsPlanSynced = @@ROWCOUNT;
        END

        -- 5. Sync Endorsement Definitions & Current Active Templates (mstr.* -> ref.endorsement_cache)
        -- Projects ONLY current active version (IS_CURRENT_VERSION = 1, STATUS IN ('ACTIVE', 'APPROVED'))
        IF OBJECT_ID('mstr.endorsement_definition', 'U') IS NOT NULL AND OBJECT_ID('ref.endorsement_cache', 'U') IS NOT NULL
        BEGIN
            MERGE INTO ref.endorsement_cache AS target
            USING (
                SELECT 
                    e.ENDORSEMENT_ID,
                    e.ENDORSEMENT_CODE,
                    e.ENDORSEMENT_NAME,
                    e.DESCRIPTION,
                    e.LINE_OF_BUSINESS,
                    e.IS_MANDATORY,
                    t.TEMPLATE_ID,
                    t.TEMPLATE_NAME,
                    t.VERSION_NUMBER,
                    t.EDITION_DATE,
                    t.RELATIVE_PATH,
                    t.SHA256_CHECKSUM,
                    t.STATUS,
                    t.OUTPUT_FORMAT,
                    t.EFFECTIVE_DATE,
                    t.EXPIRATION_DATE
                FROM mstr.endorsement_definition e
                LEFT JOIN mstr.template_definition t ON e.ENDORSEMENT_ID = t.ENDORSEMENT_ID 
                    AND t.IS_CURRENT_VERSION = 1 
                    AND t.STATUS IN ('ACTIVE', 'APPROVED')
                    AND t.EFFECTIVE_DATE <= @CurrentDate
                    AND (t.EXPIRATION_DATE IS NULL OR t.EXPIRATION_DATE >= @CurrentDate)
            ) AS source
            ON target.ENDORSEMENT_ID = source.ENDORSEMENT_ID
            WHEN MATCHED AND (
                target.ENDORSEMENT_CODE <> source.ENDORSEMENT_CODE OR
                target.ENDORSEMENT_NAME <> source.ENDORSEMENT_NAME OR
                ISNULL(target.DESCRIPTION, '') <> ISNULL(source.DESCRIPTION, '') OR
                target.LINE_OF_BUSINESS <> source.LINE_OF_BUSINESS OR
                target.IS_MANDATORY <> source.IS_MANDATORY OR
                ISNULL(CAST(target.TEMPLATE_ID AS VARCHAR(36)), '') <> ISNULL(CAST(source.TEMPLATE_ID AS VARCHAR(36)), '') OR
                ISNULL(target.VERSION_NUMBER, 0) <> ISNULL(source.VERSION_NUMBER, 0) OR
                ISNULL(target.RELATIVE_PATH, '') <> ISNULL(source.RELATIVE_PATH, '') OR
                ISNULL(target.SHA256_CHECKSUM, '') <> ISNULL(source.SHA256_CHECKSUM, '') OR
                ISNULL(target.OUTPUT_FORMAT, '') <> ISNULL(source.OUTPUT_FORMAT, '')
            ) THEN
                UPDATE SET
                    target.ENDORSEMENT_CODE = source.ENDORSEMENT_CODE,
                    target.ENDORSEMENT_NAME = source.ENDORSEMENT_NAME,
                    target.DESCRIPTION = source.DESCRIPTION,
                    target.LINE_OF_BUSINESS = source.LINE_OF_BUSINESS,
                    target.IS_MANDATORY = source.IS_MANDATORY,
                    target.TEMPLATE_ID = source.TEMPLATE_ID,
                    target.TEMPLATE_NAME = source.TEMPLATE_NAME,
                    target.VERSION_NUMBER = source.VERSION_NUMBER,
                    target.EDITION_DATE = source.EDITION_DATE,
                    target.RELATIVE_PATH = source.RELATIVE_PATH,
                    target.SHA256_CHECKSUM = source.SHA256_CHECKSUM,
                    target.STATUS = source.STATUS,
                    target.OUTPUT_FORMAT = source.OUTPUT_FORMAT,
                    target.EFFECTIVE_DATE = source.EFFECTIVE_DATE,
                    target.EXPIRATION_DATE = source.EXPIRATION_DATE,
                    target.LAST_SYNCED_AT = @SyncTimestamp,
                    target.SYNC_BATCH_ID = @BatchId
            WHEN NOT MATCHED BY TARGET THEN
                INSERT (ENDORSEMENT_ID, ENDORSEMENT_CODE, ENDORSEMENT_NAME, DESCRIPTION, LINE_OF_BUSINESS, IS_MANDATORY,
                        TEMPLATE_ID, TEMPLATE_NAME, VERSION_NUMBER, EDITION_DATE, RELATIVE_PATH, SHA256_CHECKSUM, STATUS, OUTPUT_FORMAT,
                        EFFECTIVE_DATE, EXPIRATION_DATE, LAST_SYNCED_AT, SYNC_BATCH_ID)
                VALUES (source.ENDORSEMENT_ID, source.ENDORSEMENT_CODE, source.ENDORSEMENT_NAME, source.DESCRIPTION, source.LINE_OF_BUSINESS, source.IS_MANDATORY,
                        source.TEMPLATE_ID, source.TEMPLATE_NAME, source.VERSION_NUMBER, source.EDITION_DATE, source.RELATIVE_PATH, source.SHA256_CHECKSUM, source.STATUS, source.OUTPUT_FORMAT,
                        source.EFFECTIVE_DATE, source.EXPIRATION_DATE, @SyncTimestamp, @BatchId)
            WHEN NOT MATCHED BY SOURCE THEN
                DELETE;

            SET @RowsEndorsementSynced = @@ROWCOUNT;
        END

        COMMIT TRANSACTION;

        SELECT 
            'SUCCESS' AS Status,
            @BatchId AS BatchId,
            @RowsProductSynced AS ProductsProcessed,
            @RowsFormSynced AS FormsProcessed,
            @RowsApprovalSynced AS StateApprovalsProcessed,
            @RowsPlanSynced AS RatingPlansProcessed,
            @RowsEndorsementSynced AS EndorsementsProcessed,
            @SyncTimestamp AS CompletedAt;

    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;

        DECLARE @ErrMsg NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrSeverity INT = ERROR_SEVERITY();

        RAISERROR(@ErrMsg, @ErrSeverity, 1);
    END CATCH
END
GO

