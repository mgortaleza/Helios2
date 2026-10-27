-- ============================================================================
-- Helios Platform Multi-Tenant Database Architecture: Option B
-- Per-Tenant Dedicated Database with Dual-Schema:
--   - [mstr] : Master Product, Inventory, Regulatory & State Filings
--   - [ref]  : Read-Only Fast Snapshot Cache populated via Off-Hours Batch Sync
--   - [ops]  : Transactional Domain Entities (Parties, Submissions, Policies)
--
-- Target Databases: Tenant dedicated catalogs (e.g., HELIOS2_TST, HELIOS_TST, HELIOS3_TST)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Create Required Schemas
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
-- 2. Master Product & Regulatory Schema: [mstr]
-- ----------------------------------------------------------------------------

-- 2a. Product Definition (Commercial Auto, General Liability, Property, etc.)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'product_definition' AND schema_id = SCHEMA_ID('mstr'))
BEGIN
    CREATE TABLE mstr.product_definition (
        PRODUCT_ID INT IDENTITY(1,1) NOT NULL,
        PRODUCT_CODE VARCHAR(50) NOT NULL,
        PRODUCT_NAME NVARCHAR(200) NOT NULL,
        LINE_OF_BUSINESS VARCHAR(50) NOT NULL,
        STATUS VARCHAR(30) NOT NULL CONSTRAINT DF_mstr_prod_status DEFAULT 'APPROVED',
        EFFECTIVE_DATE DATE NOT NULL,
        EXPIRATION_DATE DATE NULL,
        DESCRIPTION NVARCHAR(500) NULL,
        IS_ACTIVE BIT NOT NULL CONSTRAINT DF_mstr_prod_active DEFAULT 1,
        CREATED_AT DATETIME2 NOT NULL CONSTRAINT DF_mstr_prod_created DEFAULT GETDATE(),
        UPDATED_AT DATETIME2 NOT NULL CONSTRAINT DF_mstr_prod_updated DEFAULT GETDATE(),
        CONSTRAINT PK_mstr_product_definition PRIMARY KEY CLUSTERED (PRODUCT_ID),
        CONSTRAINT UQ_mstr_product_code UNIQUE (PRODUCT_CODE)
    );
END
GO

-- 2b. Form Inventory (Policy forms, endorsements, notices, declarations)
-- Binary .docx stored in filesystem/UNC share, relative path recorded here
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'form_inventory' AND schema_id = SCHEMA_ID('mstr'))
BEGIN
    CREATE TABLE mstr.form_inventory (
        FORM_ID INT IDENTITY(1,1) NOT NULL,
        FORM_NUMBER VARCHAR(100) NOT NULL,
        FORM_NAME NVARCHAR(255) NOT NULL,
        EDITION_DATE VARCHAR(20) NOT NULL,
        LINE_OF_BUSINESS VARCHAR(50) NOT NULL,
        FORM_TYPE VARCHAR(50) NOT NULL, -- DECLARATION, ENDORSEMENT, SCHEDULE, MANDATORY_NOTICE
        RELATIVE_PATH VARCHAR(500) NOT NULL, -- e.g. tenants/HELIOS2_TST/templates/{uuid}.docx
        FILE_SIZE_BYTES BIGINT NOT NULL CONSTRAINT DF_mstr_form_size DEFAULT 0,
        SHA256_CHECKSUM VARCHAR(64) NOT NULL,
        IS_MANDATORY BIT NOT NULL CONSTRAINT DF_mstr_form_mandatory DEFAULT 0,
        STATUS VARCHAR(30) NOT NULL CONSTRAINT DF_mstr_form_status DEFAULT 'APPROVED', -- DRAFT, PENDING, APPROVED, WITHDRAWN
        EFFECTIVE_DATE DATE NOT NULL,
        EXPIRATION_DATE DATE NULL,
        CREATED_AT DATETIME2 NOT NULL CONSTRAINT DF_mstr_form_created DEFAULT GETDATE(),
        UPDATED_AT DATETIME2 NOT NULL CONSTRAINT DF_mstr_form_updated DEFAULT GETDATE(),
        CONSTRAINT PK_mstr_form_inventory PRIMARY KEY CLUSTERED (FORM_ID),
        CONSTRAINT UQ_mstr_form_nbr_edition UNIQUE (FORM_NUMBER, EDITION_DATE)
    );
    CREATE NONCLUSTERED INDEX IX_mstr_form_lob_status ON mstr.form_inventory (LINE_OF_BUSINESS, STATUS, EFFECTIVE_DATE);
END
GO

-- 2c. State Approval & Regulatory Filings (SERFF Tracking, state department approvals)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'state_approval_filing' AND schema_id = SCHEMA_ID('mstr'))
BEGIN
    CREATE TABLE mstr.state_approval_filing (
        FILING_ID INT IDENTITY(1,1) NOT NULL,
        FORM_ID INT NOT NULL,
        STATE_CODE VARCHAR(2) NOT NULL,
        SERFF_TRACKING_NBR VARCHAR(100) NULL,
        APPROVAL_STATUS VARCHAR(50) NOT NULL CONSTRAINT DF_mstr_filing_status DEFAULT 'APPROVED',
        APPROVAL_DATE DATE NULL,
        EFFECTIVE_DATE DATE NOT NULL,
        EXPIRATION_DATE DATE NULL,
        MANDATORY_IN_STATE BIT NOT NULL CONSTRAINT DF_mstr_filing_mandatory DEFAULT 0,
        CREATED_AT DATETIME2 NOT NULL CONSTRAINT DF_mstr_filing_created DEFAULT GETDATE(),
        UPDATED_AT DATETIME2 NOT NULL CONSTRAINT DF_mstr_filing_updated DEFAULT GETDATE(),
        CONSTRAINT PK_mstr_state_approval_filing PRIMARY KEY CLUSTERED (FILING_ID),
        CONSTRAINT FK_mstr_filing_form FOREIGN KEY (FORM_ID) REFERENCES mstr.form_inventory (FORM_ID) ON DELETE CASCADE,
        CONSTRAINT UQ_mstr_filing_form_state UNIQUE (FORM_ID, STATE_CODE)
    );
    CREATE NONCLUSTERED INDEX IX_mstr_filing_lookup ON mstr.state_approval_filing (STATE_CODE, APPROVAL_STATUS, EFFECTIVE_DATE);
END
GO

-- 2d. Rating Plan Config
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'rating_plan' AND schema_id = SCHEMA_ID('mstr'))
BEGIN
    CREATE TABLE mstr.rating_plan (
        PLAN_ID INT IDENTITY(1,1) NOT NULL,
        PLAN_CODE VARCHAR(50) NOT NULL,
        PLAN_NAME NVARCHAR(200) NOT NULL,
        LINE_OF_BUSINESS VARCHAR(50) NOT NULL,
        STATE_CODE VARCHAR(2) NOT NULL,
        ALGORITHM_VERSION VARCHAR(30) NOT NULL DEFAULT 'v1.0.0',
        STATUS VARCHAR(30) NOT NULL CONSTRAINT DF_mstr_plan_status DEFAULT 'APPROVED',
        EFFECTIVE_DATE DATE NOT NULL,
        EXPIRATION_DATE DATE NULL,
        CREATED_AT DATETIME2 NOT NULL CONSTRAINT DF_mstr_plan_created DEFAULT GETDATE(),
        UPDATED_AT DATETIME2 NOT NULL CONSTRAINT DF_mstr_plan_updated DEFAULT GETDATE(),
        CONSTRAINT PK_mstr_rating_plan PRIMARY KEY CLUSTERED (PLAN_ID),
        CONSTRAINT UQ_mstr_plan_code_state UNIQUE (PLAN_CODE, STATE_CODE)
    );
END
GO

-- ----------------------------------------------------------------------------
-- 3. Read-Only Snapshot Reference Cache: [ref]
-- Populated atomically during off-hours batch sync from mstr.*
-- ----------------------------------------------------------------------------

-- 3a. Product Cache
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'product_cache' AND schema_id = SCHEMA_ID('ref'))
BEGIN
    CREATE TABLE ref.product_cache (
        PRODUCT_ID INT NOT NULL,
        PRODUCT_CODE VARCHAR(50) NOT NULL,
        PRODUCT_NAME NVARCHAR(200) NOT NULL,
        LINE_OF_BUSINESS VARCHAR(50) NOT NULL,
        EFFECTIVE_DATE DATE NOT NULL,
        EXPIRATION_DATE DATE NULL,
        LAST_SYNCED_AT DATETIME2 NOT NULL CONSTRAINT DF_ref_prod_synced DEFAULT GETDATE(),
        SYNC_BATCH_ID UNIQUEIDENTIFIER NULL,
        CONSTRAINT PK_ref_product_cache PRIMARY KEY CLUSTERED (PRODUCT_ID)
    );
    CREATE NONCLUSTERED INDEX IX_ref_prod_code ON ref.product_cache(PRODUCT_CODE);
END
GO

-- 3b. Form Cache
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'form_cache' AND schema_id = SCHEMA_ID('ref'))
BEGIN
    CREATE TABLE ref.form_cache (
        FORM_ID INT NOT NULL,
        FORM_NUMBER VARCHAR(100) NOT NULL,
        FORM_NAME NVARCHAR(255) NOT NULL,
        EDITION_DATE VARCHAR(20) NOT NULL,
        LINE_OF_BUSINESS VARCHAR(50) NOT NULL,
        FORM_TYPE VARCHAR(50) NOT NULL,
        RELATIVE_PATH VARCHAR(500) NOT NULL,
        FILE_SIZE_BYTES BIGINT NOT NULL,
        SHA256_CHECKSUM VARCHAR(64) NOT NULL,
        IS_MANDATORY BIT NOT NULL,
        EFFECTIVE_DATE DATE NOT NULL,
        EXPIRATION_DATE DATE NULL,
        LAST_SYNCED_AT DATETIME2 NOT NULL CONSTRAINT DF_ref_form_synced DEFAULT GETDATE(),
        SYNC_BATCH_ID UNIQUEIDENTIFIER NULL,
        CONSTRAINT PK_ref_form_cache PRIMARY KEY CLUSTERED (FORM_ID)
    );
    CREATE NONCLUSTERED INDEX IX_ref_form_lob ON ref.form_cache(LINE_OF_BUSINESS, IS_MANDATORY);
    CREATE NONCLUSTERED INDEX IX_ref_form_number ON ref.form_cache(FORM_NUMBER);
END
GO

-- 3c. State Approval Cache
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'state_approval_cache' AND schema_id = SCHEMA_ID('ref'))
BEGIN
    CREATE TABLE ref.state_approval_cache (
        FILING_ID INT NOT NULL,
        FORM_ID INT NOT NULL,
        STATE_CODE VARCHAR(2) NOT NULL,
        FORM_NUMBER VARCHAR(100) NOT NULL,
        SERFF_TRACKING_NBR VARCHAR(100) NULL,
        APPROVAL_DATE DATE NULL,
        EFFECTIVE_DATE DATE NOT NULL,
        EXPIRATION_DATE DATE NULL,
        MANDATORY_IN_STATE BIT NOT NULL,
        LAST_SYNCED_AT DATETIME2 NOT NULL CONSTRAINT DF_ref_filing_synced DEFAULT GETDATE(),
        SYNC_BATCH_ID UNIQUEIDENTIFIER NULL,
        CONSTRAINT PK_ref_state_approval_cache PRIMARY KEY CLUSTERED (FILING_ID)
    );
    CREATE NONCLUSTERED INDEX IX_ref_filing_state ON ref.state_approval_cache(STATE_CODE, FORM_ID);
END
GO

-- 3d. Rating Plan Cache
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'rating_plan_cache' AND schema_id = SCHEMA_ID('ref'))
BEGIN
    CREATE TABLE ref.rating_plan_cache (
        PLAN_ID INT NOT NULL,
        PLAN_CODE VARCHAR(50) NOT NULL,
        PLAN_NAME NVARCHAR(200) NOT NULL,
        LINE_OF_BUSINESS VARCHAR(50) NOT NULL,
        STATE_CODE VARCHAR(2) NOT NULL,
        ALGORITHM_VERSION VARCHAR(30) NOT NULL,
        EFFECTIVE_DATE DATE NOT NULL,
        EXPIRATION_DATE DATE NULL,
        LAST_SYNCED_AT DATETIME2 NOT NULL CONSTRAINT DF_ref_plan_synced DEFAULT GETDATE(),
        SYNC_BATCH_ID UNIQUEIDENTIFIER NULL,
        CONSTRAINT PK_ref_rating_plan_cache PRIMARY KEY CLUSTERED (PLAN_ID)
    );
    CREATE NONCLUSTERED INDEX IX_ref_plan_lob_state ON ref.rating_plan_cache(LINE_OF_BUSINESS, STATE_CODE);
END
GO

-- ----------------------------------------------------------------------------
-- 4. Transactional Domain Entities: [ops]
-- ----------------------------------------------------------------------------

-- 4a. Parties (Insureds, Brokers, Claimants, Vendors)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'party' AND schema_id = SCHEMA_ID('ops'))
BEGIN
    CREATE TABLE ops.party (
        PARTY_ID BIGINT IDENTITY(1,1) NOT NULL,
        TENANT_ID INT NOT NULL DEFAULT 1,
        PARTY_TYPE VARCHAR(30) NOT NULL DEFAULT 'ORGANIZATION', -- INDIVIDUAL / ORGANIZATION
        LEGAL_NAME NVARCHAR(255) NOT NULL,
        DBA_NAME NVARCHAR(255) NULL,
        FEIN_SSN VARCHAR(20) NULL,
        STATUS VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
        CREATED_AT DATETIME2 NOT NULL DEFAULT GETDATE(),
        UPDATED_AT DATETIME2 NOT NULL DEFAULT GETDATE(),
        CONSTRAINT PK_ops_party PRIMARY KEY CLUSTERED (PARTY_ID)
    );
    CREATE NONCLUSTERED INDEX IX_ops_party_name ON ops.party (LEGAL_NAME);
    CREATE NONCLUSTERED INDEX IX_ops_party_fein ON ops.party (FEIN_SSN) WHERE FEIN_SSN IS NOT NULL;
END
GO

-- 4b. Party Addresses
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'party_address' AND schema_id = SCHEMA_ID('ops'))
BEGIN
    CREATE TABLE ops.party_address (
        ADDRESS_ID BIGINT IDENTITY(1,1) NOT NULL,
        PARTY_ID BIGINT NOT NULL,
        ADDRESS_TYPE VARCHAR(30) NOT NULL DEFAULT 'MAILING', -- MAILING, PHYSICAL, BILLING, LOCATION
        LINE1 NVARCHAR(200) NOT NULL,
        LINE2 NVARCHAR(200) NULL,
        CITY NVARCHAR(100) NOT NULL,
        STATE_CODE VARCHAR(2) NOT NULL,
        POSTAL_CODE VARCHAR(20) NOT NULL,
        COUNTRY VARCHAR(50) NOT NULL DEFAULT 'USA',
        IS_PRIMARY BIT NOT NULL DEFAULT 1,
        CREATED_AT DATETIME2 NOT NULL DEFAULT GETDATE(),
        UPDATED_AT DATETIME2 NOT NULL DEFAULT GETDATE(),
        CONSTRAINT PK_ops_party_address PRIMARY KEY CLUSTERED (ADDRESS_ID),
        CONSTRAINT FK_ops_address_party FOREIGN KEY (PARTY_ID) REFERENCES ops.party (PARTY_ID) ON DELETE CASCADE
    );
    CREATE NONCLUSTERED INDEX IX_ops_address_lookup ON ops.party_address (STATE_CODE, POSTAL_CODE);
END
GO

-- 4c. Submissions (Underwriting intake workflows)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'submission' AND schema_id = SCHEMA_ID('ops'))
BEGIN
    CREATE TABLE ops.submission (
        SUBMISSION_ID BIGINT IDENTITY(1,1) NOT NULL,
        TENANT_ID INT NOT NULL DEFAULT 1,
        SUBMISSION_NBR VARCHAR(50) NOT NULL,
        NAMED_INSURED_PARTY_ID BIGINT NOT NULL,
        LINE_OF_BUSINESS VARCHAR(50) NOT NULL,
        PRODUCT_CODE VARCHAR(50) NULL,
        STATUS VARCHAR(30) NOT NULL DEFAULT 'SUBMITTED', -- SUBMITTED, IN_REVIEW, QUOTED, BOUND, DECLINED
        EFFECTIVE_DATE DATE NOT NULL,
        EXPIRATION_DATE DATE NOT NULL,
        ESTIMATED_PREMIUM DECIMAL(18,2) NULL,
        ASSIGNED_UNDERWRITER VARCHAR(100) NULL,
        CREATED_AT DATETIME2 NOT NULL DEFAULT GETDATE(),
        UPDATED_AT DATETIME2 NOT NULL DEFAULT GETDATE(),
        CONSTRAINT PK_ops_submission PRIMARY KEY CLUSTERED (SUBMISSION_ID),
        CONSTRAINT FK_ops_submission_insured FOREIGN KEY (NAMED_INSURED_PARTY_ID) REFERENCES ops.party (PARTY_ID),
        CONSTRAINT UQ_ops_submission_nbr UNIQUE (SUBMISSION_NBR)
    );
    CREATE NONCLUSTERED INDEX IX_ops_sub_status_eff ON ops.submission (STATUS, EFFECTIVE_DATE);
END
GO

-- 4d. Policies (Bound policies)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'policy' AND schema_id = SCHEMA_ID('ops'))
BEGIN
    CREATE TABLE ops.policy (
        POLICY_ID BIGINT IDENTITY(1,1) NOT NULL,
        TENANT_ID INT NOT NULL DEFAULT 1,
        POLICY_NBR VARCHAR(50) NOT NULL,
        SUBMISSION_ID BIGINT NULL,
        INSURED_PARTY_ID BIGINT NOT NULL,
        LINE_OF_BUSINESS VARCHAR(50) NOT NULL,
        PRODUCT_CODE VARCHAR(50) NOT NULL,
        STATUS VARCHAR(30) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, CANCELLED, EXPIRED, REINSTATED
        EFFECTIVE_DATE DATE NOT NULL,
        EXPIRATION_DATE DATE NOT NULL,
        TOTAL_PREMIUM DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        ISSUED_AT DATETIME2 NOT NULL DEFAULT GETDATE(),
        CREATED_AT DATETIME2 NOT NULL DEFAULT GETDATE(),
        UPDATED_AT DATETIME2 NOT NULL DEFAULT GETDATE(),
        CONSTRAINT PK_ops_policy PRIMARY KEY CLUSTERED (POLICY_ID),
        CONSTRAINT FK_ops_policy_insured FOREIGN KEY (INSURED_PARTY_ID) REFERENCES ops.party (PARTY_ID),
        CONSTRAINT FK_ops_policy_submission FOREIGN KEY (SUBMISSION_ID) REFERENCES ops.submission (SUBMISSION_ID),
        CONSTRAINT UQ_ops_policy_nbr UNIQUE (POLICY_NBR)
    );
    CREATE NONCLUSTERED INDEX IX_ops_policy_status ON ops.policy (STATUS, EFFECTIVE_DATE, EXPIRATION_DATE);
END
GO

-- 4e. Policy Form Snapshots
-- Immutable audit record of the exact form versions and physical file checksums attached to bound policies
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'policy_form_snapshot' AND schema_id = SCHEMA_ID('ops'))
BEGIN
    CREATE TABLE ops.policy_form_snapshot (
        SNAPSHOT_ID BIGINT IDENTITY(1,1) NOT NULL,
        POLICY_ID BIGINT NOT NULL,
        FORM_ID INT NOT NULL,
        FORM_NUMBER VARCHAR(100) NOT NULL,
        EDITION_DATE VARCHAR(20) NOT NULL,
        FORM_NAME NVARCHAR(255) NOT NULL,
        RELATIVE_PATH VARCHAR(500) NOT NULL,
        SHA256_CHECKSUM VARCHAR(64) NOT NULL,
        ATTACHED_AT DATETIME2 NOT NULL DEFAULT GETDATE(),
        CONSTRAINT PK_ops_policy_form_snapshot PRIMARY KEY CLUSTERED (SNAPSHOT_ID),
        CONSTRAINT FK_ops_form_snap_policy FOREIGN KEY (POLICY_ID) REFERENCES ops.policy (POLICY_ID) ON DELETE CASCADE
    );
    CREATE NONCLUSTERED INDEX IX_ops_form_snap_policy ON ops.policy_form_snapshot (POLICY_ID);
END
GO

-- ----------------------------------------------------------------------------
-- 5. Stored Procedure: ops.sp_RefreshReferenceCache
-- Atomic, Idempotent MERGE from [mstr].* to [ref].* for approved, effective records
-- ----------------------------------------------------------------------------
CREATE OR ALTER PROCEDURE ops.sp_RefreshReferenceCache
    @BatchId UNIQUEIDENTIFIER = NULL,
    @RowsProductSynced INT = 0 OUTPUT,
    @RowsFormSynced INT = 0 OUTPUT,
    @RowsApprovalSynced INT = 0 OUTPUT,
    @RowsRatingSynced INT = 0 OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF @BatchId IS NULL
        SET @BatchId = NEWID();

    DECLARE @CurrentDate DATE = CAST(GETDATE() AS DATE);
    DECLARE @SyncTimestamp DATETIME2 = GETDATE();

    BEGIN TRANSACTION;
    BEGIN TRY
        -- 1. Sync Products (mstr.product_definition -> ref.product_cache)
        MERGE INTO ref.product_cache AS target
        USING (
            SELECT PRODUCT_ID, PRODUCT_CODE, PRODUCT_NAME, LINE_OF_BUSINESS, EFFECTIVE_DATE, EXPIRATION_DATE
            FROM mstr.product_definition
            WHERE STATUS = 'APPROVED'
              AND IS_ACTIVE = 1
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

        -- 2. Sync Forms (mstr.form_inventory -> ref.form_cache)
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

        -- 3. Sync State Approvals (mstr.state_approval_filing -> ref.state_approval_cache)
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

        -- 4. Sync Rating Plans (mstr.rating_plan -> ref.rating_plan_cache)
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

        SET @RowsRatingSynced = @@ROWCOUNT;

        COMMIT TRANSACTION;

        SELECT 
            @BatchId AS SyncBatchId,
            @RowsProductSynced AS ProductsProcessed,
            @RowsFormSynced AS FormsProcessed,
            @RowsApprovalSynced AS StateApprovalsProcessed,
            @RowsRatingSynced AS RatingPlansProcessed,
            @SyncTimestamp AS CompletedAt,
            'SUCCESS' AS Status;
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

