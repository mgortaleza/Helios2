-- ============================================================================
-- Helios Platform Tier 2 Navigation Customization Migration
-- Target Database: MSTR_DATA
-- ============================================================================

IF COL_LENGTH('dbo.TENANT_ROLE_CONFIG', 'DEFAULT_TIER2_NAV_UW') IS NULL
BEGIN
    ALTER TABLE dbo.TENANT_ROLE_CONFIG ADD DEFAULT_TIER2_NAV_UW VARCHAR(50) NULL;
END
GO

IF COL_LENGTH('dbo.TENANT_ROLE_CONFIG', 'DEFAULT_TIER2_NAV_CLAIMS') IS NULL
BEGIN
    ALTER TABLE dbo.TENANT_ROLE_CONFIG ADD DEFAULT_TIER2_NAV_CLAIMS VARCHAR(50) NULL;
END
GO

IF COL_LENGTH('dbo.TENANT_ROLE_CONFIG', 'ALLOWED_TIER2_NAV') IS NULL
BEGIN
    ALTER TABLE dbo.TENANT_ROLE_CONFIG ADD ALLOWED_TIER2_NAV VARCHAR(500) NULL;
END
GO

UPDATE dbo.TENANT_ROLE_CONFIG
SET DEFAULT_TIER2_NAV_UW = COALESCE(DEFAULT_TIER2_NAV_UW, 'submissions'),
    DEFAULT_TIER2_NAV_CLAIMS = COALESCE(DEFAULT_TIER2_NAV_CLAIMS, 'claims'),
    ALLOWED_TIER2_NAV = COALESCE(ALLOWED_TIER2_NAV, CASE
        WHEN UPPER(ROLE_CODE) LIKE '%UNDERWRITER%' OR UPPER(ROLE_CODE) = 'UW' THEN 'inbox,policies,submissions'
        WHEN UPPER(ROLE_CODE) LIKE '%CLAIM%' THEN 'claims,claims/fnol,claims/open,claims/loss-runs'
        WHEN UPPER(ROLE_CODE) LIKE '%AUDITOR%' THEN 'policies,submissions,claims,claims/loss-runs'
        ELSE 'inbox,policies,submissions,claims,claims/fnol,claims/open,claims/loss-runs'
    END)
WHERE DEFAULT_TIER2_NAV_UW IS NULL OR DEFAULT_TIER2_NAV_CLAIMS IS NULL OR ALLOWED_TIER2_NAV IS NULL;
GO
