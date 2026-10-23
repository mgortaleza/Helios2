-- ============================================================================
-- HELIOS_RATING_DB Schema Initialization & Actuarial Seed Data
-- Database: HELIOS_RATING_DB on dbtst.ad.ortaleza.com:1433
-- Supports: Multi-Product, Rating Plans, State DOI / SERFF Approval Versioning
-- ============================================================================

USE HELIOS_RATING_DB;
GO

-- 1. Product Registry
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'RATE_PRODUCT')
BEGIN
    CREATE TABLE dbo.RATE_PRODUCT (
        PRODUCT_CODE        VARCHAR(50)  NOT NULL PRIMARY KEY,
        PRODUCT_NAME        VARCHAR(100) NOT NULL,
        LINE_OF_BUSINESS    VARCHAR(100) NOT NULL,
        DESCRIPTION         VARCHAR(255) NULL,
        CREATED_DT          DATETIME     NOT NULL DEFAULT GETDATE()
    );
END
GO

-- 2. Rating Plans
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'RATE_PLAN')
BEGIN
    CREATE TABLE dbo.RATE_PLAN (
        PLAN_CODE           VARCHAR(50)  NOT NULL PRIMARY KEY,
        PRODUCT_CODE        VARCHAR(50)  NOT NULL FOREIGN KEY REFERENCES dbo.RATE_PRODUCT(PRODUCT_CODE),
        PLAN_NAME           VARCHAR(100) NOT NULL,
        EXPOSURE_BASIS      VARCHAR(50)  NOT NULL, -- REVENUE_PER_1K, HEADCOUNT, ASSETS_PER_1M
        DESCRIPTION         VARCHAR(255) NULL,
        CREATED_DT          DATETIME     NOT NULL DEFAULT GETDATE()
    );
END
GO

-- 3. State DOI & SERFF Versioning Registry
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'RATE_PLAN_VERSION')
BEGIN
    CREATE TABLE dbo.RATE_PLAN_VERSION (
        VERSION_ID          INT IDENTITY(1,1) PRIMARY KEY,
        PRODUCT_CODE        VARCHAR(50)  NOT NULL FOREIGN KEY REFERENCES dbo.RATE_PRODUCT(PRODUCT_CODE),
        PLAN_CODE           VARCHAR(50)  NOT NULL FOREIGN KEY REFERENCES dbo.RATE_PLAN(PLAN_CODE),
        STATE_CODE          VARCHAR(10)  NOT NULL, -- CA, NY, TX, FL, ALL
        VERSION_NUMBER      VARCHAR(20)  NOT NULL, -- e.g. 2025.1
        SERFF_TRACKING_NBR  VARCHAR(50)  NULL,     -- State DOI SERFF ID
        FILING_STATUS       VARCHAR(30)  NOT NULL, -- DRAFT, FILED_PENDING, APPROVED, ACTIVE, SUPERSEDED
        NEW_BIZ_EFF_DT      DATE         NOT NULL,
        RENEWAL_EFF_DT      DATE         NOT NULL,
        EXPIRATION_DT       DATE         NULL,
        MIN_PREMIUM         DECIMAL(18,2) NOT NULL DEFAULT 2000.00,
        MAX_SCHEDULE_DEBIT  DECIMAL(5,2)  NOT NULL DEFAULT 0.25, -- +25%
        MAX_SCHEDULE_CREDIT DECIMAL(5,2)  NOT NULL DEFAULT 0.25, -- -25%
        DESCRIPTION         VARCHAR(255) NULL,
        CREATED_DT          DATETIME     NOT NULL DEFAULT GETDATE()
    );
    CREATE INDEX IX_RATE_PLAN_VER_LOOKUP ON dbo.RATE_PLAN_VERSION (PRODUCT_CODE, STATE_CODE, FILING_STATUS, NEW_BIZ_EFF_DT);
END
GO

-- 4. Base Loss Cost Rates by Class Code
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'RATE_BASE_LOSS_COST')
BEGIN
    CREATE TABLE dbo.RATE_BASE_LOSS_COST (
        RATE_ID             INT IDENTITY(1,1) PRIMARY KEY,
        PRODUCT_CODE        VARCHAR(50)   NOT NULL FOREIGN KEY REFERENCES dbo.RATE_PRODUCT(PRODUCT_CODE),
        CLASS_CODE          VARCHAR(50)   NOT NULL,
        CLASS_NAME          VARCHAR(150)  NOT NULL,
        BASE_RATE           DECIMAL(18,4) NOT NULL, -- Rate per exposure unit
        HAZARD_GRADE        INT           NOT NULL DEFAULT 1
    );
    CREATE UNIQUE INDEX UX_BASE_RATE ON dbo.RATE_BASE_LOSS_COST (PRODUCT_CODE, CLASS_CODE);
END
GO

-- 5. Territory Relativity Factors
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'RATE_TERRITORY_FACTOR')
BEGIN
    CREATE TABLE dbo.RATE_TERRITORY_FACTOR (
        TERRITORY_ID        INT IDENTITY(1,1) PRIMARY KEY,
        STATE_CODE          VARCHAR(10)  NOT NULL,
        TERRITORY_CODE      VARCHAR(50)  NOT NULL,
        TERRITORY_NAME      VARCHAR(100) NOT NULL,
        FACTOR              DECIMAL(6,4) NOT NULL
    );
    CREATE UNIQUE INDEX UX_TERR_FACTOR ON dbo.RATE_TERRITORY_FACTOR (STATE_CODE, TERRITORY_CODE);
END
GO

-- 6. Limit Relativities
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'RATE_LIMIT_RELATIVITY')
BEGIN
    CREATE TABLE dbo.RATE_LIMIT_RELATIVITY (
        LIMIT_ID            INT IDENTITY(1,1) PRIMARY KEY,
        OCCURRENCE_LIMIT    BIGINT       NOT NULL,
        AGGREGATE_LIMIT     BIGINT       NOT NULL,
        FACTOR              DECIMAL(6,4) NOT NULL
    );
    CREATE UNIQUE INDEX UX_LIMIT_FACTOR ON dbo.RATE_LIMIT_RELATIVITY (OCCURRENCE_LIMIT, AGGREGATE_LIMIT);
END
GO

-- 7. Deductible / Retention Factors
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'RATE_DEDUCTIBLE_FACTOR')
BEGIN
    CREATE TABLE dbo.RATE_DEDUCTIBLE_FACTOR (
        DEDUCTIBLE_ID       INT IDENTITY(1,1) PRIMARY KEY,
        RETENTION_AMOUNT    BIGINT       NOT NULL UNIQUE,
        FACTOR              DECIMAL(6,4) NOT NULL
    );
END
GO

-- 8. Underwriting Referral Guidelines & Rules
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'UW_RULE_GUIDELINE')
BEGIN
    CREATE TABLE dbo.UW_RULE_GUIDELINE (
        RULE_ID             INT IDENTITY(1,1) PRIMARY KEY,
        RULE_CODE           VARCHAR(50)  NOT NULL UNIQUE,
        RULE_NAME           VARCHAR(100) NOT NULL,
        TRIGGER_TYPE        VARCHAR(50)  NOT NULL, -- LIMIT, LOSS_HISTORY, SCHEDULE_CREDIT
        THRESHOLD_VALUE     VARCHAR(50)  NOT NULL,
        ACTION_LEVEL        VARCHAR(30)  NOT NULL, -- INFO, REFERRAL, DECLINE
        MESSAGE_TEMPLATE    VARCHAR(255) NOT NULL
    );
END
GO

-- 9. Mandatory Policy & Endorsement Attachment Rules
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'UW_FORM_ATTACHMENT_RULE')
BEGIN
    CREATE TABLE dbo.UW_FORM_ATTACHMENT_RULE (
        FORM_ID             INT IDENTITY(1,1) PRIMARY KEY,
        FORM_NUMBER         VARCHAR(50)  NOT NULL,
        FORM_NAME           VARCHAR(150) NOT NULL,
        PRODUCT_CODE        VARCHAR(50)  NULL,
        STATE_CODE          VARCHAR(10)  NULL,
        IS_MANDATORY        BIT          NOT NULL DEFAULT 1
    );
END
GO

-- 10. Rating Audit & Execution Log
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'RATING_CALC_LOG')
BEGIN
    CREATE TABLE dbo.RATING_CALC_LOG (
        LOG_ID              INT IDENTITY(1,1) PRIMARY KEY,
        TENANT_ID           INT          NOT NULL,
        PRODUCT_CODE        VARCHAR(50)  NOT NULL,
        STATE_CODE          VARCHAR(10)  NOT NULL,
        FILING_VERSION      VARCHAR(20)  NOT NULL,
        FINAL_PREMIUM       DECIMAL(18,2) NOT NULL,
        RATING_STATUS       VARCHAR(30)  NOT NULL,
        INPUT_PAYLOAD_JSON  NVARCHAR(MAX) NULL,
        TRACE_LOG_JSON      NVARCHAR(MAX) NULL,
        CALCULATED_DT       DATETIME     NOT NULL DEFAULT GETDATE()
    );
    CREATE INDEX IX_RATING_LOG_DT ON dbo.RATING_CALC_LOG (CALCULATED_DT DESC);
END
GO

-- ============================================================================
-- SEED INITIAL ACTUARIAL DATA
-- ============================================================================

-- Products
MERGE dbo.RATE_PRODUCT AS target
USING (VALUES
    ('TECH_EO', 'Technology Errors & Omissions', 'Professional Liability', 'Enterprise SaaS, software engineering, and technology consulting'),
    ('MED_MAL', 'Medical Malpractice', 'Healthcare Professional Liability', 'Physicians, surgical practices, and clinical groups'),
    ('DNO', 'Directors & Officers', 'Management Liability', 'Executive indemnity and corporate governance protection')
) AS source (PRODUCT_CODE, PRODUCT_NAME, LINE_OF_BUSINESS, DESCRIPTION)
ON target.PRODUCT_CODE = source.PRODUCT_CODE
WHEN NOT MATCHED THEN
    INSERT (PRODUCT_CODE, PRODUCT_NAME, LINE_OF_BUSINESS, DESCRIPTION)
    VALUES (source.PRODUCT_CODE, source.PRODUCT_NAME, source.LINE_OF_BUSINESS, source.DESCRIPTION);

-- Rating Plans
MERGE dbo.RATE_PLAN AS target
USING (VALUES
    ('TECH_EO_COMMERCIAL', 'TECH_EO', 'Standard Commercial Tech E&O', 'REVENUE_PER_1K', 'Rated on annual gross revenue per $1,000'),
    ('MED_MAL_PRIMARY', 'MED_MAL', 'Primary Physician & Clinic Plan', 'HEADCOUNT', 'Rated on licensed provider headcount by specialty'),
    ('DNO_PRIVATE', 'DNO', 'Private Enterprise D&O Plan', 'ASSETS_PER_1M', 'Rated on total balance sheet assets per $1M')
) AS source (PLAN_CODE, PRODUCT_CODE, PLAN_NAME, EXPOSURE_BASIS, DESCRIPTION)
ON target.PLAN_CODE = source.PLAN_CODE
WHEN NOT MATCHED THEN
    INSERT (PLAN_CODE, PRODUCT_CODE, PLAN_NAME, EXPOSURE_BASIS, DESCRIPTION)
    VALUES (source.PLAN_CODE, source.PRODUCT_CODE, source.PLAN_NAME, source.EXPOSURE_BASIS, source.DESCRIPTION);

-- State Filings
IF NOT EXISTS (SELECT 1 FROM dbo.RATE_PLAN_VERSION WHERE SERFF_TRACKING_NBR = 'CA-2025-0812-EO')
BEGIN
    INSERT INTO dbo.RATE_PLAN_VERSION
        (PRODUCT_CODE, PLAN_CODE, STATE_CODE, VERSION_NUMBER, SERFF_TRACKING_NBR, FILING_STATUS, NEW_BIZ_EFF_DT, RENEWAL_EFF_DT, EXPIRATION_DT, MIN_PREMIUM, MAX_SCHEDULE_DEBIT, MAX_SCHEDULE_CREDIT, DESCRIPTION)
    VALUES
        ('TECH_EO', 'TECH_EO_COMMERCIAL', 'CA', '2025.1', 'CA-2025-0812-EO', 'ACTIVE', '2025-01-01', '2025-03-01', '2027-12-31', 2500.00, 0.25, 0.25, 'California DOI Approved Standard Tech E&O Filing'),
        ('TECH_EO', 'TECH_EO_COMMERCIAL', 'NY', '2025.1', 'NY-2025-0443-EO', 'ACTIVE', '2025-01-01', '2025-02-01', '2027-12-31', 3000.00, 0.15, 0.15, 'New York DFS Approved Filing (Strict Schedule Credit Cap)'),
        ('TECH_EO', 'TECH_EO_COMMERCIAL', 'TX', '2025.1', 'TX-2025-1109-EO', 'ACTIVE', '2025-01-01', '2025-01-01', '2027-12-31', 2000.00, 0.30, 0.30, 'Texas TDI File and Use Plan'),
        ('TECH_EO', 'TECH_EO_COMMERCIAL', 'FL', '2025.1', 'FL-2025-0671-EO', 'ACTIVE', '2025-01-01', '2025-01-01', '2027-12-31', 2500.00, 0.20, 0.20, 'Florida OIR Standard Plan'),
        ('TECH_EO', 'TECH_EO_COMMERCIAL', 'ALL', '2024.2', 'US-2024-BASE-EO', 'ACTIVE', '2024-06-01', '2024-06-01', NULL,         2000.00, 0.25, 0.25, 'Nationwide Benchmark ISO Advisory Plan'),
        ('MED_MAL', 'MED_MAL_PRIMARY',    'CA', '2025.1', 'CA-2025-0102-MM', 'ACTIVE', '2025-01-01', '2025-01-01', NULL,         5000.00, 0.20, 0.20, 'California MICRA Compliant Medical Malpractice'),
        ('MED_MAL', 'MED_MAL_PRIMARY',    'ALL', '2024.1', 'US-2024-BASE-MM', 'ACTIVE', '2024-01-01', '2024-01-01', NULL,         4500.00, 0.25, 0.25, 'Nationwide Baseline MedMal Plan'),
        ('DNO',     'DNO_PRIVATE',        'DE', '2025.1', 'DE-2025-0044-DO', 'ACTIVE', '2025-01-01', '2025-01-01', NULL,         3500.00, 0.25, 0.25, 'Delaware Corporate Registry D&O Program'),
        ('DNO',     'DNO_PRIVATE',        'ALL', '2024.1', 'US-2024-BASE-DO', 'ACTIVE', '2024-01-01', '2024-01-01', NULL,         3000.00, 0.25, 0.25, 'Nationwide Baseline D&O Plan');
END
GO

-- Base Loss Cost Rates
MERGE dbo.RATE_BASE_LOSS_COST AS target
USING (VALUES
    ('TECH_EO', 'TECH_SAAS', 'Enterprise Software & Cloud Platforms', 1.8500, 2),
    ('TECH_EO', 'TECH_CONSULT', 'IT Systems Consulting & Architecture', 1.4500, 1),
    ('TECH_EO', 'TECH_INFRA', 'Hosting, Data Centers & Managed Services', 2.2000, 3),
    ('TECH_EO', 'DEFAULT', 'General Technology Services', 1.7500, 2),
    ('MED_MAL', 'SURGERY_GENERAL', 'General Surgery Practices', 12500.0000, 4),
    ('MED_MAL', 'INTERNAL_MED', 'Internal Medicine & Family Practice', 6800.0000, 2),
    ('MED_MAL', 'PEDIATRICS', 'Pediatric Medicine', 5200.0000, 1),
    ('MED_MAL', 'DEFAULT', 'General Clinical Medicine', 7500.0000, 2),
    ('DNO', 'FIN_SERVICES', 'Asset Management & FinTech', 450.0000, 3),
    ('DNO', 'HEALTHCARE', 'Healthcare Systems & Hospital Boards', 380.0000, 2),
    ('DNO', 'COMMERCIAL', 'General Commercial Enterprises', 290.0000, 1),
    ('DNO', 'DEFAULT', 'Standard Commercial D&O', 320.0000, 2)
) AS source (PRODUCT_CODE, CLASS_CODE, CLASS_NAME, BASE_RATE, HAZARD_GRADE)
ON target.PRODUCT_CODE = source.PRODUCT_CODE AND target.CLASS_CODE = source.CLASS_CODE
WHEN NOT MATCHED THEN
    INSERT (PRODUCT_CODE, CLASS_CODE, CLASS_NAME, BASE_RATE, HAZARD_GRADE)
    VALUES (source.PRODUCT_CODE, source.CLASS_CODE, source.CLASS_NAME, source.BASE_RATE, source.HAZARD_GRADE);

-- Territory Factors
MERGE dbo.RATE_TERRITORY_FACTOR AS target
USING (VALUES
    ('CA', 'CA_SF', 'San Francisco Bay Area / Silicon Valley', 1.2500),
    ('CA', 'CA_LA', 'Los Angeles / Orange County', 1.1800),
    ('CA', 'DEFAULT', 'Rest of California', 1.1000),
    ('NY', 'NY_METRO', 'New York City Metro Area', 1.3000),
    ('NY', 'DEFAULT', 'Upstate New York', 1.1500),
    ('TX', 'TX_HOUSTON', 'Greater Houston / Harris County', 1.0800),
    ('TX', 'DEFAULT', 'Rest of Texas', 1.0000),
    ('FL', 'DEFAULT', 'State of Florida', 1.2000),
    ('ALL', 'DEFAULT', 'Nationwide Baseline', 1.0000)
) AS source (STATE_CODE, TERRITORY_CODE, TERRITORY_NAME, FACTOR)
ON target.STATE_CODE = source.STATE_CODE AND target.TERRITORY_CODE = source.TERRITORY_CODE
WHEN NOT MATCHED THEN
    INSERT (STATE_CODE, TERRITORY_CODE, TERRITORY_NAME, FACTOR)
    VALUES (source.STATE_CODE, source.TERRITORY_CODE, source.TERRITORY_NAME, source.FACTOR);

-- Limit Relativities
MERGE dbo.RATE_LIMIT_RELATIVITY AS target
USING (VALUES
    (1000000, 1000000, 1.0000),
    (2000000, 2000000, 1.3500),
    (3000000, 3000000, 1.5500),
    (5000000, 5000000, 1.8000),
    (10000000, 10000000, 2.3500)
) AS source (OCCURRENCE_LIMIT, AGGREGATE_LIMIT, FACTOR)
ON target.OCCURRENCE_LIMIT = source.OCCURRENCE_LIMIT AND target.AGGREGATE_LIMIT = source.AGGREGATE_LIMIT
WHEN NOT MATCHED THEN
    INSERT (OCCURRENCE_LIMIT, AGGREGATE_LIMIT, FACTOR)
    VALUES (source.OCCURRENCE_LIMIT, source.AGGREGATE_LIMIT, source.FACTOR);

-- Deductible Relativities
MERGE dbo.RATE_DEDUCTIBLE_FACTOR AS target
USING (VALUES
    (10000, 1.1000),
    (25000, 1.0000),
    (50000, 0.9000),
    (100000, 0.8200),
    (250000, 0.7000)
) AS source (RETENTION_AMOUNT, FACTOR)
ON target.RETENTION_AMOUNT = source.RETENTION_AMOUNT
WHEN NOT MATCHED THEN
    INSERT (RETENTION_AMOUNT, FACTOR)
    VALUES (source.RETENTION_AMOUNT, source.FACTOR);

-- Underwriting Guidelines
MERGE dbo.UW_RULE_GUIDELINE AS target
USING (VALUES
    ('LIMIT_EXCEEDS_5M', 'Limit Exceeds $5M Branch Authority', 'LIMIT', '5000000', 'REFERRAL', 'SENIOR_UW_REFERRAL: Occurrence limit exceeds standard $5M branch authority.'),
    ('PRIOR_LOSSES_PRESENT', 'Prior Loss History On Account', 'LOSS_HISTORY', '0', 'REFERRAL', 'CLAIMS_REVIEW_REFERRAL: Account has prior loss history; requires 5-year hard copy loss runs.'),
    ('HIGH_SCHEDULE_CREDIT', 'Schedule Credit Exceeds 15%', 'SCHEDULE_CREDIT', '0.15', 'REFERRAL', 'MANAGEMENT_SIGN_OFF: Schedule credit exceeds 15%; requires Branch Underwriting Manager approval.')
) AS source (RULE_CODE, RULE_NAME, TRIGGER_TYPE, THRESHOLD_VALUE, ACTION_LEVEL, MESSAGE_TEMPLATE)
ON target.RULE_CODE = source.RULE_CODE
WHEN NOT MATCHED THEN
    INSERT (RULE_CODE, RULE_NAME, TRIGGER_TYPE, THRESHOLD_VALUE, ACTION_LEVEL, MESSAGE_TEMPLATE)
    VALUES (source.RULE_CODE, source.RULE_NAME, source.TRIGGER_TYPE, source.THRESHOLD_VALUE, source.ACTION_LEVEL, source.MESSAGE_TEMPLATE);

-- Mandatory Policy & State Form Endorsements
MERGE dbo.UW_FORM_ATTACHMENT_RULE AS target
USING (VALUES
    ('EO-2025-BASE', 'Standard Technology E&O Policy Jacket', 'TECH_EO', NULL, 1),
    ('CYBER-104-SEC', 'Security Breach & Regulatory Defense Endorsement', 'TECH_EO', NULL, 1),
    ('MM-2025-CMP', 'Claims-Made Medical Professional Liability Form', 'MED_MAL', NULL, 1),
    ('MM-NOSE-COV', 'Prior Acts Retroactive Date Coverage Endorsement', 'MED_MAL', NULL, 1),
    ('DNO-2025-EXEC', 'Executive Protection & Entity Coverage Form', 'DNO', NULL, 1),
    ('CA-NOTICE-60D', 'California 60-Day Notice of Cancellation/Nonrenewal', NULL, 'CA', 1),
    ('NY-DFS-REG500', 'New York Cybersecurity Certification Addendum', NULL, 'NY', 1),
    ('FL-SURPLUS-01', 'Florida Notice of Surplus Lines Placement', NULL, 'FL', 1)
) AS source (FORM_NUMBER, FORM_NAME, PRODUCT_CODE, STATE_CODE, IS_MANDATORY)
ON target.FORM_NUMBER = source.FORM_NUMBER
WHEN NOT MATCHED THEN
    INSERT (FORM_NUMBER, FORM_NAME, PRODUCT_CODE, STATE_CODE, IS_MANDATORY)
    VALUES (source.FORM_NUMBER, source.FORM_NAME, source.PRODUCT_CODE, source.STATE_CODE, source.IS_MANDATORY);
GO
