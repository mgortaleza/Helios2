package com.example.helios2.service;

import java.math.BigDecimal;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Autowired;

import com.example.helios2.service.TenantRegistryService.DbPingResult;
import com.example.helios2.tenant.TenantContext;

@Service
public class HeliosService {

    private final JdbcTemplate tenantJdbcTemplate;
    private final Set<Integer> initializedTenants = ConcurrentHashMap.newKeySet();

    private final TenantRegistryService tenantRegistryService;

    public HeliosService(
            @Qualifier("tenantJdbcTemplate") JdbcTemplate tenantJdbcTemplate,
            @Autowired(required = false) TenantRegistryService tenantRegistryService) {
        this.tenantJdbcTemplate = tenantJdbcTemplate;
        this.tenantRegistryService = tenantRegistryService;
    }

    public record AddressDto(
            int addressId,
            int partyId,
            String line1,
            String line2,
            String city,
            String stateCode,
            String postalCode,
            String county,
            String countryCode,
            boolean isActive,
            String addressStatus,
            String effectiveFrom,
            String effectiveTo,
            String changedDt,
            String changedBy,
            String changeReason,
            String createdDt
    ) {
    }

    public record PartyTypeCodeDto(
            String partyType,
            String partySubType,
            String displayName,
            String description,
            boolean isActive
    ) {
    }

    public record AddressInput(
            String line1,
            String line2,
            String city,
            String stateCode,
            String postalCode,
            String county,
            String countryCode,
            String changeReason
    ) {
    }

    public record CreatePartyRequest(
            String name,
            String orgName,
            String partyType,
            String partySubType,
            String firstName,
            String lastName,
            AddressInput address
    ) {
        public CreatePartyRequest(String orgName) {
            this(orgName, orgName, "ORGANIZATION", "INSURED", null, null, null);
        }
    }

    public record PartyDto(
            int id,
            String name,
            String partyType,
            String partySubType,
            String partyTypeDisplay,
            String firstName,
            String lastName,
            AddressDto primaryAddress
    ) {
        public PartyDto(int id, String name) {
            this(id, name, "ORGANIZATION", "INSURED", "Commercial Insured", null, null, null);
        }
    }

    public record ZipCodeDto(
            String zipCode,
            String city,
            String stateCode,
            String stateName,
            String county
    ) {
    }

    public record SubmissionDto(
            int submsnId,
            String submsnNbr,
            int insuredPid,
            String orgName,
            Integer policyId,
            String policyNbr,
            String productType,
            String date,
            String status,
            FileLevelInfoDto fileLevelInfo,
            List<QuoteDto> quotes,
            Integer agencyId,
            String agencyInfo
    ) {
        public SubmissionDto(
                int submsnId,
                String submsnNbr,
                int insuredPid,
                String orgName,
                Integer policyId,
                String policyNbr,
                String productType,
                String date,
                String status,
                FileLevelInfoDto fileLevelInfo,
                List<QuoteDto> quotes
        ) {
            this(submsnId, submsnNbr, insuredPid, orgName, policyId, policyNbr, productType, date, status, fileLevelInfo, quotes, null, null);
        }
    }

    public record TaskDto(
            int id,
            String title,
            String type,
            String subType,
            String relatedRecord,
            String status,
            String dueDate
    ) {
    }

    public record QuoteDto(
            String quoteId,
            String premium,
            String status,
            String generated,
            String productCode,
            String stateCode,
            String exposureVal,
            String limitAmt,
            String retentionAmt,
            String scheduleMod,
            String serffTrackingNbr,
            String baseRate,
            String calcTrace,
            Integer submsnId
    ) {
        public QuoteDto(String quoteId, String premium, String status, String generated) {
            this(quoteId, premium, status, generated, null, null, null, null, null, null, null, null, null, null);
        }
        public QuoteDto(String quoteId, String premium, String status, String generated,
                        String productCode, String stateCode, String exposureVal,
                        String limitAmt, String retentionAmt, String scheduleMod,
                        String serffTrackingNbr, String baseRate, String calcTrace) {
            this(quoteId, premium, status, generated, productCode, stateCode, exposureVal,
                 limitAmt, retentionAmt, scheduleMod, serffTrackingNbr, baseRate, calcTrace, null);
        }
    }

    public record FileLevelInfoDto(
            String underwriter,
            String effectiveDate,
            String expirationDate,
            String retroactiveDate,
            String limit,
            String retention
    ) {
    }

    public record PolicySubmissionDto(
            String id,
            int submsnId,
            String date,
            String status,
            FileLevelInfoDto fileLevelInfo,
            List<QuoteDto> quotes
    ) {
    }

    public record PolicyDto(
            String id,
            int policyId,
            int insuredPid,
            String name,
            String productType,
            String fileStatus,
            String address,
            String industry,
            String agencyInfo,
            List<PolicySubmissionDto> submissions
    ) {
    }

    public record ClaimDto(
            int id,
            String claimNbr,
            String policyNbr,
            String insuredName,
            String productType,
            String lossDate,
            String status,
            String reserveAmt,
            String description
    ) {
    }

    public record AppUserDto(
            int userId,
            int tenantId,
            String username,
            String email,
            String displayName,
            String roleCode,
            String roleName,
            String department,
            String defaultTier1Nav,
            String defaultTier2NavUw,
            String defaultTier2NavClaims,
            String allowedTier2Nav,
            String authProvider,
            String externalSubjectId,
            boolean active,
            String createdDt,
            String lastLoginDt
    ) {
    }

    public synchronized void ensureTenantSchema() {
        int tenantId = TenantContext.getTenantId();
        if (!initializedTenants.add(tenantId)) {
            return;
        }
        try {
            // 1. Ensure dbo.PT_PARTY, dbo.PT_PARTY_TYPE_CODE, and dbo.PT_ADDRESS exist
            tenantJdbcTemplate.execute("""
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
                        ORG_NM VARCHAR(100) NOT NULL
                    );

                    IF COL_LENGTH('dbo.PT_PARTY', 'PARTY_TYPE') IS NULL
                        ALTER TABLE dbo.PT_PARTY ADD PARTY_TYPE VARCHAR(20) DEFAULT 'ORGANIZATION';
                    IF COL_LENGTH('dbo.PT_PARTY', 'PARTY_SUB_TYPE') IS NULL
                        ALTER TABLE dbo.PT_PARTY ADD PARTY_SUB_TYPE VARCHAR(20) DEFAULT 'INSURED';
                    IF COL_LENGTH('dbo.PT_PARTY', 'FIRST_NAME') IS NULL
                        ALTER TABLE dbo.PT_PARTY ADD FIRST_NAME NVARCHAR(100) NULL;
                    IF COL_LENGTH('dbo.PT_PARTY', 'LAST_NAME') IS NULL
                        ALTER TABLE dbo.PT_PARTY ADD LAST_NAME NVARCHAR(100) NULL;
                    IF COL_LENGTH('dbo.PT_PARTY', 'PRIMARY_ADDRESS_ID') IS NULL
                        ALTER TABLE dbo.PT_PARTY ADD PRIMARY_ADDRESS_ID INT NULL;

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
                    END;
                    """);

            // 2. Ensure dbo.UW_TASK exists and has RELATED_RECORD
            tenantJdbcTemplate.execute("""
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
                    IF COL_LENGTH('dbo.UW_TASK', 'RELATED_RECORD') IS NULL
                        ALTER TABLE dbo.UW_TASK ADD RELATED_RECORD VARCHAR(50) NULL;
                    """);

            // 3. Ensure dbo.UW_POLICY exists
            tenantJdbcTemplate.execute("""
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
                    """);

            // 4. Ensure dbo.UW_SUBMSN exists and has extended file-level columns
            tenantJdbcTemplate.execute("""
                    IF OBJECT_ID('dbo.UW_SUBMSN', 'U') IS NULL
                    CREATE TABLE dbo.UW_SUBMSN (
                        SUBMSN_ID INT IDENTITY(100000,1) PRIMARY KEY,
                        SUBMSN_NBR VARCHAR(50) NOT NULL,
                        INSURED_PID INT NOT NULL REFERENCES dbo.PT_PARTY(PARTY_ID)
                    );
                    IF COL_LENGTH('dbo.UW_SUBMSN', 'POLICY_ID') IS NULL
                        ALTER TABLE dbo.UW_SUBMSN ADD POLICY_ID INT NULL;
                    IF COL_LENGTH('dbo.UW_SUBMSN', 'SUBMSN_DT') IS NULL
                        ALTER TABLE dbo.UW_SUBMSN ADD SUBMSN_DT VARCHAR(20) NULL;
                    IF COL_LENGTH('dbo.UW_SUBMSN', 'STATUS') IS NULL
                        ALTER TABLE dbo.UW_SUBMSN ADD STATUS VARCHAR(50) NULL;
                    IF COL_LENGTH('dbo.UW_SUBMSN', 'UNDERWRITER') IS NULL
                        ALTER TABLE dbo.UW_SUBMSN ADD UNDERWRITER VARCHAR(100) NULL;
                    IF COL_LENGTH('dbo.UW_SUBMSN', 'EFFECTIVE_DT') IS NULL
                        ALTER TABLE dbo.UW_SUBMSN ADD EFFECTIVE_DT VARCHAR(20) NULL;
                    IF COL_LENGTH('dbo.UW_SUBMSN', 'EXPIRATION_DT') IS NULL
                        ALTER TABLE dbo.UW_SUBMSN ADD EXPIRATION_DT VARCHAR(20) NULL;
                    IF COL_LENGTH('dbo.UW_SUBMSN', 'RETROACTIVE_DT') IS NULL
                        ALTER TABLE dbo.UW_SUBMSN ADD RETROACTIVE_DT VARCHAR(20) NULL;
                    IF COL_LENGTH('dbo.UW_SUBMSN', 'LIMIT_AMT') IS NULL
                        ALTER TABLE dbo.UW_SUBMSN ADD LIMIT_AMT VARCHAR(50) NULL;
                    IF COL_LENGTH('dbo.UW_SUBMSN', 'RETENTION_AMT') IS NULL
                        ALTER TABLE dbo.UW_SUBMSN ADD RETENTION_AMT VARCHAR(50) NULL;
                    IF COL_LENGTH('dbo.UW_SUBMSN', 'AGENCY_ID') IS NULL
                        ALTER TABLE dbo.UW_SUBMSN ADD AGENCY_ID INT NULL;
                    IF COL_LENGTH('dbo.UW_SUBMSN', 'AGENCY_INFO') IS NULL
                        ALTER TABLE dbo.UW_SUBMSN ADD AGENCY_INFO VARCHAR(255) NULL;
                    """);

            // 5. Ensure dbo.UW_QUOTE exists
            tenantJdbcTemplate.execute("""
                    IF OBJECT_ID('dbo.UW_QUOTE', 'U') IS NULL
                    CREATE TABLE dbo.UW_QUOTE (
                        QUOTE_ID INT IDENTITY(1,1) PRIMARY KEY,
                        QUOTE_NBR VARCHAR(50) NOT NULL,
                        SUBMSN_ID INT NOT NULL,
                        PREMIUM VARCHAR(50) NOT NULL,
                        STATUS VARCHAR(50) NOT NULL,
                        GENERATED_DT VARCHAR(20) NOT NULL
                    );
                    IF COL_LENGTH('dbo.UW_QUOTE', 'PRODUCT_CODE') IS NULL ALTER TABLE dbo.UW_QUOTE ADD PRODUCT_CODE VARCHAR(50) NULL;
                    IF COL_LENGTH('dbo.UW_QUOTE', 'STATE_CODE') IS NULL ALTER TABLE dbo.UW_QUOTE ADD STATE_CODE VARCHAR(10) NULL;
                    IF COL_LENGTH('dbo.UW_QUOTE', 'EXPOSURE_VAL') IS NULL ALTER TABLE dbo.UW_QUOTE ADD EXPOSURE_VAL NUMERIC(18,2) NULL;
                    IF COL_LENGTH('dbo.UW_QUOTE', 'CLASS_CODE') IS NULL ALTER TABLE dbo.UW_QUOTE ADD CLASS_CODE VARCHAR(50) NULL;
                    IF COL_LENGTH('dbo.UW_QUOTE', 'TERRITORY_CODE') IS NULL ALTER TABLE dbo.UW_QUOTE ADD TERRITORY_CODE VARCHAR(50) NULL;
                    IF COL_LENGTH('dbo.UW_QUOTE', 'LIMIT_AMT') IS NULL ALTER TABLE dbo.UW_QUOTE ADD LIMIT_AMT VARCHAR(50) NULL;
                    IF COL_LENGTH('dbo.UW_QUOTE', 'RETENTION_AMT') IS NULL ALTER TABLE dbo.UW_QUOTE ADD RETENTION_AMT VARCHAR(50) NULL;
                    IF COL_LENGTH('dbo.UW_QUOTE', 'SCHEDULE_MOD') IS NULL ALTER TABLE dbo.UW_QUOTE ADD SCHEDULE_MOD NUMERIC(5,2) NULL;
                    IF COL_LENGTH('dbo.UW_QUOTE', 'SERFF_TRACKING_NBR') IS NULL ALTER TABLE dbo.UW_QUOTE ADD SERFF_TRACKING_NBR VARCHAR(100) NULL;
                    IF COL_LENGTH('dbo.UW_QUOTE', 'FILING_VERSION') IS NULL ALTER TABLE dbo.UW_QUOTE ADD FILING_VERSION VARCHAR(50) NULL;
                    IF COL_LENGTH('dbo.UW_QUOTE', 'BASE_RATE') IS NULL ALTER TABLE dbo.UW_QUOTE ADD BASE_RATE NUMERIC(10,4) NULL;
                    IF COL_LENGTH('dbo.UW_QUOTE', 'CALC_TRACE') IS NULL ALTER TABLE dbo.UW_QUOTE ADD CALC_TRACE VARCHAR(MAX) NULL;
                    IF COL_LENGTH('dbo.UW_QUOTE', 'ATTACHED_FORMS') IS NULL ALTER TABLE dbo.UW_QUOTE ADD ATTACHED_FORMS VARCHAR(MAX) NULL;
                    IF COL_LENGTH('dbo.UW_QUOTE', 'UNDERWRITING_REFERRALS') IS NULL ALTER TABLE dbo.UW_QUOTE ADD UNDERWRITING_REFERRALS VARCHAR(MAX) NULL;
                    """);

            // 6. Ensure dbo.CLM_CLAIM exists
            tenantJdbcTemplate.execute("""
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
                    """);

            // 7. Ensure dbo.APP_USER exists
            tenantJdbcTemplate.execute("""
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
                    END
                    """);

            seedInitialDataIfEmpty();
        } catch (Exception e) {
            initializedTenants.remove(tenantId);
            System.err.println("Warning during tenant schema check: " + e.getMessage());
        }
    }

    private void seedInitialDataIfEmpty() {
        Integer relatedMissingCount = tenantJdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM dbo.UW_TASK WHERE RELATED_RECORD IS NULL", Integer.class
        );
        Integer taskCount = tenantJdbcTemplate.queryForObject("SELECT COUNT(*) FROM dbo.UW_TASK", Integer.class);
        if ((taskCount != null && taskCount == 0) || (relatedMissingCount != null && relatedMissingCount > 0)) {
            tenantJdbcTemplate.update("DELETE FROM dbo.UW_TASK");
            Object[][] seedTasks = {
                {"Review Tech E&O Submission", "Underwriting", "Risk Assessment", "SUB-26-0412", "Pending", "2026-10-24"},
                {"Process D&O Claim Initial Reserve", "Claims", "Claim Triage", "CLM-26-001", "Urgent", "2026-10-23"},
                {"Follow up on MedMal renewal questionnaire", "Renewals", "Renewal Prep", "POL-2025-7111", "Pending", "2026-10-25"},
                {"Approve Lawyers E&O Quote", "Underwriting", "Coverage Review", "SUB-26-0414", "Completed", "2026-10-26"},
                {"Review A&E Loss Run Report", "Underwriting", "Loss Run Request", "SUB-26-0416", "Pending", "2026-10-27"},
                {"Process Agent Endorsement", "Underwriting", "Endorsement Processing", "POL-2026-8901", "Pending", "2026-10-28"},
                {"Verify Legal Credentials", "Underwriting", "Document Verification", "SUB-26-0414", "Pending", "2026-10-24"}
            };
            for (Object[] t : seedTasks) {
                tenantJdbcTemplate.update(
                        "INSERT INTO dbo.UW_TASK (TITLE, TASK_TYPE, TASK_SUBTYPE, RELATED_RECORD, STATUS, DUE_DATE) VALUES (?, ?, ?, ?, ?, ?)",
                        t[0], t[1], t[2], t[3], t[4], t[5]
                );
            }
        }

        Integer policyCount = tenantJdbcTemplate.queryForObject("SELECT COUNT(*) FROM dbo.UW_POLICY", Integer.class);
        if (policyCount != null && policyCount == 0) {
            int techPid = getOrCreatePartyId("TechSolutions Corp");
            int apexPid = getOrCreatePartyId("Apex Healthcare Partners");

            KeyHolder pol1Holder = new GeneratedKeyHolder();
            tenantJdbcTemplate.update(con -> {
                PreparedStatement ps = con.prepareStatement("""
                        INSERT INTO dbo.UW_POLICY (POLICY_NBR, INSURED_PID, INSURED_NM, PRODUCT_TYPE, FILE_STATUS, ADDRESS, INDUSTRY, AGENCY_INFO)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                        """, Statement.RETURN_GENERATED_KEYS);
                ps.setString(1, "POL-2026-8832");
                ps.setInt(2, techPid);
                ps.setString(3, "TechSolutions Corp");
                ps.setString(4, "Technology E&O");
                ps.setString(5, "Active");
                ps.setString(6, "101 Innovation Blvd, San Francisco, CA 94107");
                ps.setString(7, "Software Development");
                ps.setString(8, "Acme Brokers Inc. - Agent: Sarah Jenkins");
                return ps;
            }, pol1Holder);
            int pol1Id = pol1Holder.getKey() != null ? pol1Holder.getKey().intValue() : 1;

            KeyHolder pol2Holder = new GeneratedKeyHolder();
            tenantJdbcTemplate.update(con -> {
                PreparedStatement ps = con.prepareStatement("""
                        INSERT INTO dbo.UW_POLICY (POLICY_NBR, INSURED_PID, INSURED_NM, PRODUCT_TYPE, FILE_STATUS, ADDRESS, INDUSTRY, AGENCY_INFO)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                        """, Statement.RETURN_GENERATED_KEYS);
                ps.setString(1, "POL-2026-9104");
                ps.setInt(2, apexPid);
                ps.setString(3, "Apex Healthcare Partners");
                ps.setString(4, "Medical Malpractice");
                ps.setString(5, "Under Review");
                ps.setString(6, "400 Medical Center Dr, Chicago, IL 60612");
                ps.setString(7, "Healthcare Services");
                ps.setString(8, "Global Risk Partners - Agent: David Thorne");
                return ps;
            }, pol2Holder);
            int pol2Id = pol2Holder.getKey() != null ? pol2Holder.getKey().intValue() : 2;

            // Insert design submissions for POL-2026-8832 and POL-2026-9104
            int sub1Id = insertFullSubmission(
                    "SUB-9921", techPid, pol1Id, "2026-09-15", "Bound",
                    "Michael Chang", "2026-10-01", "2027-10-01", "2024-10-01", "$5,000,000", "$50,000"
            );
            insertQuote("Q-4432A", sub1Id, "$32,500", "Accepted", "2026-09-10");
            insertQuote("Q-4432B", sub1Id, "$28,000", "Declined", "2026-09-08");

            int sub2Id = insertFullSubmission(
                    "SUB-7710", techPid, pol1Id, "2025-09-10", "Expired",
                    "Michael Chang", "2025-10-01", "2026-10-01", "2024-10-01", "$3,000,000", "$25,000"
            );
            insertQuote("Q-2211", sub2Id, "$25,000", "Accepted", "2025-09-05");

            int sub3Id = insertFullSubmission(
                    "SUB-9945", apexPid, pol2Id, "2026-10-20", "Quoted",
                    "Alicia Keys", "2026-11-15", "2027-11-15", "2015-01-01", "$10,000,000", "$100,000"
            );
            insertQuote("Q-5590", sub3Id, "$145,000", "Pending", "2026-10-21");
        }

        // Backfill any existing UW_SUBMSN rows that don't have POLICY_ID or file-level columns populated yet
        backfillExistingSubmissions();

        Integer agencyCount = tenantJdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM dbo.PT_PARTY WHERE PARTY_SUB_TYPE = 'AGENCY'", Integer.class);
        if (agencyCount != null && agencyCount == 0) {
            createParty(new CreatePartyRequest("Acme Brokers Inc.", "Acme Brokers Inc.", "ORGANIZATION", "AGENCY", null, null,
                    new AddressInput("100 Financial Way", "Suite 400", "New York", "NY", "10005", "New York", "US", "Initial Seed")));
            createParty(new CreatePartyRequest("Global Risk Partners", "Global Risk Partners", "ORGANIZATION", "AGENCY", null, null,
                    new AddressInput("200 Michigan Ave", "Fl 12", "Chicago", "IL", "60601", "Cook", "US", "Initial Seed")));
            createParty(new CreatePartyRequest("Marsh Commercial Brokerage", "Marsh Commercial Brokerage", "ORGANIZATION", "AGENCY", null, null,
                    new AddressInput("500 Market St", "Ste 2200", "San Francisco", "CA", "94105", "San Francisco", "US", "Initial Seed")));
            createParty(new CreatePartyRequest("Aon Risk Services", "Aon Risk Services", "ORGANIZATION", "AGENCY", null, null,
                    new AddressInput("200 E Randolph St", "Ste 800", "Chicago", "IL", "60601", "Cook", "US", "Initial Seed")));
        }

        Integer claimCount = tenantJdbcTemplate.queryForObject("SELECT COUNT(*) FROM dbo.CLM_CLAIM", Integer.class);
        if (claimCount != null && claimCount == 0) {
            tenantJdbcTemplate.update("""
                    INSERT INTO dbo.CLM_CLAIM (CLAIM_NBR, POLICY_NBR, INSURED_NM, PRODUCT_TYPE, LOSS_DT, STATUS, RESERVE_AMT, DESCRIPTION)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    "CLM-2026-0412", "POL-2026-8832", "TechSolutions Corp", "Technology E&O",
                    "2026-08-14", "Open - Defense", "$85,000", "Software deployment SLA breach allegation"
            );
            tenantJdbcTemplate.update("""
                    INSERT INTO dbo.CLM_CLAIM (CLAIM_NBR, POLICY_NBR, INSURED_NM, PRODUCT_TYPE, LOSS_DT, STATUS, RESERVE_AMT, DESCRIPTION)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    "CLM-2026-0419", "POL-2026-9104", "Apex Healthcare Partners", "Medical Malpractice",
                    "2026-09-22", "Under Review", "$145,000", "Diagnostic consultation delay notice of circumstance"
            );
        }
    }

    private void backfillExistingSubmissions() {
        List<Map<String, Object>> unlinked = tenantJdbcTemplate.queryForList("""
                SELECT s.SUBMSN_ID, s.SUBMSN_NBR, s.INSURED_PID, p.ORG_NM
                FROM dbo.UW_SUBMSN s
                JOIN dbo.PT_PARTY p ON s.INSURED_PID = p.PARTY_ID
                WHERE s.POLICY_ID IS NULL
                """);
        for (Map<String, Object> row : unlinked) {
            int subId = ((Number) row.get("SUBMSN_ID")).intValue();
            int pid = ((Number) row.get("INSURED_PID")).intValue();
            String orgName = (String) row.get("ORG_NM");

            int policyId = getOrCreatePolicyForParty(pid, orgName);
            tenantJdbcTemplate.update("""
                    UPDATE dbo.UW_SUBMSN
                    SET POLICY_ID = ?,
                        SUBMSN_DT = ISNULL(SUBMSN_DT, '2026-10-15'),
                        STATUS = ISNULL(STATUS, 'Bound'),
                        UNDERWRITER = ISNULL(UNDERWRITER, 'Michael Chang'),
                        EFFECTIVE_DT = ISNULL(EFFECTIVE_DT, '2026-10-15'),
                        EXPIRATION_DT = ISNULL(EXPIRATION_DT, '2027-10-15'),
                        RETROACTIVE_DT = ISNULL(RETROACTIVE_DT, '2022-01-01'),
                        LIMIT_AMT = ISNULL(LIMIT_AMT, '$5,000,000'),
                        RETENTION_AMT = ISNULL(RETENTION_AMT, '$50,000')
                    WHERE SUBMSN_ID = ?
                    """, policyId, subId);

            Integer qCount = tenantJdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM dbo.UW_QUOTE WHERE SUBMSN_ID = ?", Integer.class, subId
            );
            if (qCount != null && qCount == 0) {
                insertQuote("Q-" + subId, subId, "$42,000", "Accepted", "2026-10-15");
            }
        }

        Integer userCount = tenantJdbcTemplate.queryForObject("SELECT COUNT(*) FROM dbo.APP_USER", Integer.class);
        if (userCount != null && userCount == 0) {
            int currentTenant = TenantContext.getTenantId();
            if (currentTenant == 2) {
                tenantJdbcTemplate.update("""
                        INSERT INTO dbo.APP_USER (TENANT_ID, USERNAME, EMAIL, DISPLAY_NAME, PASSWORD_HASH, ROLE_CODE, DEPARTMENT, AUTH_PROVIDER)
                        VALUES 
                        (2, 'ethorne', 'ethorne@legacy.ortaleza.com', 'Emily Thorne', '', 'UNDERWRITER', 'Global Risk Underwriting', 'LOCAL'),
                        (2, 'vhayes', 'vhayes@legacy.ortaleza.com', 'Victor Hayes', '', 'EXECUTIVE', 'Executive Risk Management', 'LOCAL'),
                        (2, 'mbrody', 'mbrody@legacy.ortaleza.com', 'Marcus Brody', '', 'CLAIMS_ADJUSTER', 'Claims Resolution', 'LOCAL'),
                        (2, 'lchen', 'lchen@legacy.ortaleza.com', 'Linda Chen', '', 'AUDITOR', 'Regulatory Compliance', 'LOCAL'),
                        (2, 'admin2', 'admin2@legacy.ortaleza.com', 'Legacy Tenant Admin', '', 'ADMIN', 'IT Operations', 'LOCAL')
                        """);
            } else {
                tenantJdbcTemplate.update("""
                        INSERT INTO dbo.APP_USER (TENANT_ID, USERNAME, EMAIL, DISPLAY_NAME, PASSWORD_HASH, ROLE_CODE, DEPARTMENT, AUTH_PROVIDER)
                        VALUES 
                        (1, 'mchang', 'mchang@ortaleza.com', 'Michael Chang', '', 'UNDERWRITER', 'Commercial Underwriting', 'LOCAL'),
                        (1, 'sjones', 'sjones@ortaleza.com', 'Sarah Jones', '', 'EXECUTIVE', 'Executive Management', 'LOCAL'),
                        (1, 'rpatel', 'rpatel@ortaleza.com', 'Raj Patel', '', 'CLAIMS_ADJUSTER', 'Claims Operations', 'LOCAL'),
                        (1, 'dvance', 'dvance@ortaleza.com', 'David Vance', '', 'AUDITOR', 'Compliance & Audit', 'LOCAL'),
                        (1, 'admin', 'admin@ortaleza.com', 'Helios Administrator', '', 'ADMIN', 'IT Systems & Administration', 'LOCAL')
                        """);
            }
        }
    }

    private int getOrCreatePartyId(String orgName) {
        List<Integer> ids = tenantJdbcTemplate.query(
                "SELECT PARTY_ID FROM dbo.PT_PARTY WHERE ORG_NM = ?",
                (rs, rowNum) -> rs.getInt("PARTY_ID"),
                orgName
        );
        if (!ids.isEmpty()) {
            return ids.get(0);
        }
        KeyHolder keyHolder = new GeneratedKeyHolder();
        tenantJdbcTemplate.update(connection -> {
            PreparedStatement ps = connection.prepareStatement(
                    "INSERT INTO dbo.PT_PARTY (ORG_NM) VALUES (?)",
                    Statement.RETURN_GENERATED_KEYS
            );
            ps.setString(1, orgName.trim());
            return ps;
        }, keyHolder);
        Number key = keyHolder.getKey();
        return key != null ? key.intValue() : -1;
    }

    private int getOrCreatePolicyForParty(int partyId, String orgName) {
        List<Integer> existing = tenantJdbcTemplate.query(
                "SELECT POLICY_ID FROM dbo.UW_POLICY WHERE INSURED_PID = ?",
                (rs, rowNum) -> rs.getInt("POLICY_ID"),
                partyId
        );
        if (!existing.isEmpty()) {
            return existing.get(0);
        }
        String polNbr = "POL-2026-" + (8900 + partyId);
        KeyHolder kh = new GeneratedKeyHolder();
        tenantJdbcTemplate.update(con -> {
            PreparedStatement ps = con.prepareStatement("""
                    INSERT INTO dbo.UW_POLICY (POLICY_NBR, INSURED_PID, INSURED_NM, PRODUCT_TYPE, FILE_STATUS, ADDRESS, INDUSTRY, AGENCY_INFO)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """, Statement.RETURN_GENERATED_KEYS);
            ps.setString(1, polNbr);
            ps.setInt(2, partyId);
            ps.setString(3, orgName);
            ps.setString(4, "Medical Malpractice");
            ps.setString(5, "Active");
            ps.setString(6, "200 Corporate Plaza, Chicago, IL 60601");
            ps.setString(7, "Professional Services");
            ps.setString(8, "Acme Brokers Inc. - Agent: Sarah Jenkins");
            return ps;
        }, kh);
        return kh.getKey() != null ? kh.getKey().intValue() : 1;
    }

    private int insertFullSubmission(
            String subNbr, int pid, int policyId, String subDt, String status,
            String underwriter, String effDt, String expDt, String retroDt, String limit, String retention) {
        KeyHolder kh = new GeneratedKeyHolder();
        tenantJdbcTemplate.update(con -> {
            PreparedStatement ps = con.prepareStatement("""
                    INSERT INTO dbo.UW_SUBMSN (
                        SUBMSN_NBR, INSURED_PID, POLICY_ID, SUBMSN_DT, STATUS,
                        UNDERWRITER, EFFECTIVE_DT, EXPIRATION_DT, RETROACTIVE_DT, LIMIT_AMT, RETENTION_AMT
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, Statement.RETURN_GENERATED_KEYS);
            ps.setString(1, subNbr);
            ps.setInt(2, pid);
            ps.setInt(3, policyId);
            ps.setString(4, subDt);
            ps.setString(5, status);
            ps.setString(6, underwriter);
            ps.setString(7, effDt);
            ps.setString(8, expDt);
            ps.setString(9, retroDt);
            ps.setString(10, limit);
            ps.setString(11, retention);
            return ps;
        }, kh);
        return kh.getKey() != null ? kh.getKey().intValue() : -1;
    }

    private void insertQuote(String quoteNbr, int submsnId, String premium, String status, String generatedDt) {
        tenantJdbcTemplate.update("""
                INSERT INTO dbo.UW_QUOTE (QUOTE_NBR, SUBMSN_ID, PREMIUM, STATUS, GENERATED_DT)
                VALUES (?, ?, ?, ?, ?)
                """, quoteNbr, submsnId, premium, status, generatedDt);
    }

    public List<TaskDto> getAllTasks() {
        ensureTenantSchema();
        String sql = """
                SELECT TASK_ID, TITLE, TASK_TYPE, TASK_SUBTYPE, ISNULL(RELATED_RECORD, 'SUB-26-0412') AS RELATED_RECORD, STATUS, DUE_DATE
                FROM dbo.UW_TASK
                ORDER BY TASK_ID ASC
                """;
        return tenantJdbcTemplate.query(sql, (rs, rowNum) -> new TaskDto(
                rs.getInt("TASK_ID"),
                rs.getString("TITLE"),
                rs.getString("TASK_TYPE"),
                rs.getString("TASK_SUBTYPE"),
                rs.getString("RELATED_RECORD"),
                rs.getString("STATUS"),
                rs.getString("DUE_DATE")
        ));
    }

    public TaskDto createTask(String title, String type, String subType, String relatedRecord, String status, String dueDate) {
        ensureTenantSchema();
        String rel = (relatedRecord != null && !relatedRecord.isBlank()) ? relatedRecord.trim() : "SUB-26-0420";
        KeyHolder kh = new GeneratedKeyHolder();
        tenantJdbcTemplate.update(con -> {
            PreparedStatement ps = con.prepareStatement("""
                    INSERT INTO dbo.UW_TASK (TITLE, TASK_TYPE, TASK_SUBTYPE, RELATED_RECORD, STATUS, DUE_DATE)
                    VALUES (?, ?, ?, ?, ?, ?)
                    """, Statement.RETURN_GENERATED_KEYS);
            ps.setString(1, title);
            ps.setString(2, type);
            ps.setString(3, subType);
            ps.setString(4, rel);
            ps.setString(5, status != null && !status.isBlank() ? status : "Pending");
            ps.setString(6, dueDate != null && !dueDate.isBlank() ? dueDate : LocalDate.now().plusDays(7).toString());
            return ps;
        }, kh);
        int id = kh.getKey() != null ? kh.getKey().intValue() : -1;
        return new TaskDto(id, title, type, subType, rel, status, dueDate);
    }

    public List<PolicyDto> searchPolicies(String name, String address, String productType, String fileStatus) {
        ensureTenantSchema();
        StringBuilder sql = new StringBuilder("""
                SELECT POLICY_ID, POLICY_NBR, INSURED_PID, INSURED_NM, PRODUCT_TYPE, FILE_STATUS,
                       ISNULL(ADDRESS, '') AS ADDRESS, ISNULL(INDUSTRY, '') AS INDUSTRY, ISNULL(AGENCY_INFO, '') AS AGENCY_INFO
                FROM dbo.UW_POLICY
                WHERE 1=1
                """);
        List<Object> args = new ArrayList<>();
        if (name != null && !name.isBlank()) {
            sql.append(" AND (INSURED_NM LIKE ? OR POLICY_NBR LIKE ?)");
            String pattern = "%" + name.trim() + "%";
            args.add(pattern);
            args.add(pattern);
        }
        if (address != null && !address.isBlank()) {
            sql.append(" AND ADDRESS LIKE ?");
            args.add("%" + address.trim() + "%");
        }
        if (productType != null && !productType.isBlank()) {
            sql.append(" AND PRODUCT_TYPE = ?");
            args.add(productType.trim());
        }
        if (fileStatus != null && !fileStatus.isBlank()) {
            sql.append(" AND FILE_STATUS = ?");
            args.add(fileStatus.trim());
        }
        sql.append(" ORDER BY POLICY_ID ASC");

        List<PolicyDto> policies = tenantJdbcTemplate.query(
                sql.toString(),
                (rs, rowNum) -> new PolicyDto(
                        rs.getString("POLICY_NBR"),
                        rs.getInt("POLICY_ID"),
                        rs.getInt("INSURED_PID"),
                        rs.getString("INSURED_NM"),
                        rs.getString("PRODUCT_TYPE"),
                        rs.getString("FILE_STATUS"),
                        rs.getString("ADDRESS"),
                        rs.getString("INDUSTRY"),
                        rs.getString("AGENCY_INFO"),
                        new ArrayList<>()
                ),
                args.toArray()
        );

        Map<Integer, List<QuoteDto>> quotesBySub = loadQuotesBySubmission();
        Map<Integer, List<PolicySubmissionDto>> subsByPolicy = new LinkedHashMap<>();

        tenantJdbcTemplate.query("""
                SELECT SUBMSN_ID, SUBMSN_NBR, POLICY_ID,
                       ISNULL(SUBMSN_DT, '2026-10-01') AS SUBMSN_DT,
                       ISNULL(STATUS, 'Bound') AS STATUS,
                       ISNULL(UNDERWRITER, 'Michael Chang') AS UNDERWRITER,
                       ISNULL(EFFECTIVE_DT, '2026-10-01') AS EFFECTIVE_DT,
                       ISNULL(EXPIRATION_DT, '2027-10-01') AS EXPIRATION_DT,
                       ISNULL(RETROACTIVE_DT, '2024-10-01') AS RETROACTIVE_DT,
                       ISNULL(LIMIT_AMT, '$5,000,000') AS LIMIT_AMT,
                       ISNULL(RETENTION_AMT, '$50,000') AS RETENTION_AMT
                FROM dbo.UW_SUBMSN
                ORDER BY SUBMSN_ID DESC
                """, rs -> {
            int subId = rs.getInt("SUBMSN_ID");
            int polId = rs.getInt("POLICY_ID");
            String subNbr = rs.getString("SUBMSN_NBR");
            String displayId = subNbr.startsWith("SUB-") ? subNbr : "SUB-" + subNbr;
            PolicySubmissionDto subDto = new PolicySubmissionDto(
                    displayId,
                    subId,
                    rs.getString("SUBMSN_DT"),
                    rs.getString("STATUS"),
                    new FileLevelInfoDto(
                            rs.getString("UNDERWRITER"),
                            rs.getString("EFFECTIVE_DT"),
                            rs.getString("EXPIRATION_DT"),
                            rs.getString("RETROACTIVE_DT"),
                            rs.getString("LIMIT_AMT"),
                            rs.getString("RETENTION_AMT")
                    ),
                    quotesBySub.getOrDefault(subId, List.of())
            );
            subsByPolicy.computeIfAbsent(polId, k -> new ArrayList<>()).add(subDto);
        });

        List<PolicyDto> enriched = new ArrayList<>();
        for (PolicyDto p : policies) {
            enriched.add(new PolicyDto(
                    p.id(),
                    p.policyId(),
                    p.insuredPid(),
                    p.name(),
                    p.productType(),
                    p.fileStatus(),
                    p.address(),
                    p.industry(),
                    p.agencyInfo(),
                    subsByPolicy.getOrDefault(p.policyId(), List.of())
            ));
        }
        return enriched;
    }

    private Map<Integer, List<QuoteDto>> loadQuotesBySubmission() {
        Map<Integer, List<QuoteDto>> map = new LinkedHashMap<>();
        tenantJdbcTemplate.query("""
                SELECT QUOTE_NBR, SUBMSN_ID, PREMIUM, STATUS, GENERATED_DT,
                       PRODUCT_CODE, STATE_CODE, CAST(EXPOSURE_VAL AS VARCHAR(50)) AS EXPOSURE_VAL,
                       LIMIT_AMT, RETENTION_AMT, CAST(SCHEDULE_MOD AS VARCHAR(50)) AS SCHEDULE_MOD,
                       SERFF_TRACKING_NBR, CAST(BASE_RATE AS VARCHAR(50)) AS BASE_RATE, CALC_TRACE
                FROM dbo.UW_QUOTE
                ORDER BY QUOTE_ID ASC
                """, rs -> {
            int subId = rs.getInt("SUBMSN_ID");
            map.computeIfAbsent(subId, k -> new ArrayList<>()).add(new QuoteDto(
                    rs.getString("QUOTE_NBR"),
                    rs.getString("PREMIUM"),
                    rs.getString("STATUS"),
                    rs.getString("GENERATED_DT"),
                    rs.getString("PRODUCT_CODE"),
                    rs.getString("STATE_CODE"),
                    rs.getString("EXPOSURE_VAL"),
                    rs.getString("LIMIT_AMT"),
                    rs.getString("RETENTION_AMT"),
                    rs.getString("SCHEDULE_MOD"),
                    rs.getString("SERFF_TRACKING_NBR"),
                    rs.getString("BASE_RATE"),
                    rs.getString("CALC_TRACE"),
                    subId
            ));
        });
        return map;
    }

    public List<QuoteDto> getAllQuotes() {
        ensureTenantSchema();
        List<QuoteDto> list = new ArrayList<>();
        tenantJdbcTemplate.query("""
                SELECT QUOTE_NBR, SUBMSN_ID, PREMIUM, STATUS, GENERATED_DT,
                       PRODUCT_CODE, STATE_CODE, CAST(EXPOSURE_VAL AS VARCHAR(50)) AS EXPOSURE_VAL,
                       LIMIT_AMT, RETENTION_AMT, CAST(SCHEDULE_MOD AS VARCHAR(50)) AS SCHEDULE_MOD,
                       SERFF_TRACKING_NBR, CAST(BASE_RATE AS VARCHAR(50)) AS BASE_RATE, CALC_TRACE
                FROM dbo.UW_QUOTE
                ORDER BY QUOTE_ID DESC
                """, rs -> {
            list.add(new QuoteDto(
                    rs.getString("QUOTE_NBR"),
                    rs.getString("PREMIUM"),
                    rs.getString("STATUS"),
                    rs.getString("GENERATED_DT"),
                    rs.getString("PRODUCT_CODE"),
                    rs.getString("STATE_CODE"),
                    rs.getString("EXPOSURE_VAL"),
                    rs.getString("LIMIT_AMT"),
                    rs.getString("RETENTION_AMT"),
                    rs.getString("SCHEDULE_MOD"),
                    rs.getString("SERFF_TRACKING_NBR"),
                    rs.getString("BASE_RATE"),
                    rs.getString("CALC_TRACE"),
                    rs.getInt("SUBMSN_ID")
            ));
        });
        return list;
    }

    public List<QuoteDto> getQuotesBySubmission(int submsnId) {
        ensureTenantSchema();
        List<QuoteDto> list = new ArrayList<>();
        tenantJdbcTemplate.query("""
                SELECT QUOTE_NBR, SUBMSN_ID, PREMIUM, STATUS, GENERATED_DT,
                       PRODUCT_CODE, STATE_CODE, CAST(EXPOSURE_VAL AS VARCHAR(50)) AS EXPOSURE_VAL,
                       LIMIT_AMT, RETENTION_AMT, CAST(SCHEDULE_MOD AS VARCHAR(50)) AS SCHEDULE_MOD,
                       SERFF_TRACKING_NBR, CAST(BASE_RATE AS VARCHAR(50)) AS BASE_RATE, CALC_TRACE
                FROM dbo.UW_QUOTE
                WHERE SUBMSN_ID = ?
                ORDER BY QUOTE_ID DESC
                """, rs -> {
            list.add(new QuoteDto(
                    rs.getString("QUOTE_NBR"),
                    rs.getString("PREMIUM"),
                    rs.getString("STATUS"),
                    rs.getString("GENERATED_DT"),
                    rs.getString("PRODUCT_CODE"),
                    rs.getString("STATE_CODE"),
                    rs.getString("EXPOSURE_VAL"),
                    rs.getString("LIMIT_AMT"),
                    rs.getString("RETENTION_AMT"),
                    rs.getString("SCHEDULE_MOD"),
                    rs.getString("SERFF_TRACKING_NBR"),
                    rs.getString("BASE_RATE"),
                    rs.getString("CALC_TRACE"),
                    rs.getInt("SUBMSN_ID")
            ));
        }, submsnId);
        return list;
    }

    public QuoteDto createRatedQuote(
            int submsnId,
            String productCode,
            String stateCode,
            String exposureVal,
            String limitAmt,
            String retentionAmt,
            String scheduleMod,
            String premium,
            String serffTrackingNbr,
            String baseRate,
            String calcTrace,
            String status
    ) {
        ensureTenantSchema();
        String today = LocalDate.now().toString();
        String finalStatus = (status != null && !status.isBlank()) ? status : "Quoted";

        Integer nextSeq = tenantJdbcTemplate.queryForObject(
                "SELECT ISNULL(MAX(QUOTE_ID), 1000) + 1 FROM dbo.UW_QUOTE", Integer.class);
        String quoteNbr = "Q-" + nextSeq;

        BigDecimal expNum = null;
        if (exposureVal != null && !exposureVal.isBlank()) {
            try {
                expNum = new BigDecimal(exposureVal.replaceAll("[^0-9.]", ""));
            } catch (Exception ignored) {}
        }
        BigDecimal schedNum = null;
        if (scheduleMod != null && !scheduleMod.isBlank()) {
            try {
                schedNum = new BigDecimal(scheduleMod.replaceAll("[^0-9.]", ""));
            } catch (Exception ignored) {}
        }
        BigDecimal baseNum = null;
        if (baseRate != null && !baseRate.isBlank()) {
            try {
                baseNum = new BigDecimal(baseRate.replaceAll("[^0-9.]", ""));
            } catch (Exception ignored) {}
        }

        tenantJdbcTemplate.update("""
                INSERT INTO dbo.UW_QUOTE (
                    QUOTE_NBR, SUBMSN_ID, PREMIUM, STATUS, GENERATED_DT,
                    PRODUCT_CODE, STATE_CODE, EXPOSURE_VAL, LIMIT_AMT, RETENTION_AMT,
                    SCHEDULE_MOD, SERFF_TRACKING_NBR, BASE_RATE, CALC_TRACE
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                quoteNbr, submsnId, premium, finalStatus, today,
                productCode, stateCode, expNum, limitAmt, retentionAmt,
                schedNum, serffTrackingNbr, baseNum, calcTrace
        );

        if (submsnId > 0) {
            tenantJdbcTemplate.update("""
                    UPDATE dbo.UW_SUBMSN
                    SET STATUS = 'Quoted'
                    WHERE SUBMSN_ID = ? AND STATUS IN ('Pending', 'Under Review')
                    """, submsnId);
        }

        return new QuoteDto(
                quoteNbr, premium, finalStatus, today,
                productCode, stateCode, exposureVal, limitAmt, retentionAmt,
                scheduleMod, serffTrackingNbr, baseRate, calcTrace, submsnId
        );
    }

    public List<SubmissionDto> getAllSubmissions() {
        ensureTenantSchema();
        Map<Integer, List<QuoteDto>> quotesBySub = loadQuotesBySubmission();
        String sql = """
                SELECT s.SUBMSN_ID, s.SUBMSN_NBR, s.INSURED_PID, p.ORG_NM,
                       s.POLICY_ID, pol.POLICY_NBR, ISNULL(pol.PRODUCT_TYPE, 'Medical Malpractice') AS PRODUCT_TYPE,
                       ISNULL(s.SUBMSN_DT, '2026-10-15') AS SUBMSN_DT,
                       ISNULL(s.STATUS, 'Quoted') AS STATUS,
                       ISNULL(s.UNDERWRITER, 'Michael Chang') AS UNDERWRITER,
                       ISNULL(s.EFFECTIVE_DT, '2026-10-15') AS EFFECTIVE_DT,
                       ISNULL(s.EXPIRATION_DT, '2027-10-15') AS EXPIRATION_DT,
                       ISNULL(s.RETROACTIVE_DT, '2023-01-01') AS RETROACTIVE_DT,
                       ISNULL(s.LIMIT_AMT, '$5,000,000') AS LIMIT_AMT,
                       ISNULL(s.RETENTION_AMT, '$50,000') AS RETENTION_AMT,
                       s.AGENCY_ID,
                       COALESCE(s.AGENCY_INFO, ap.ORG_NM, pol.AGENCY_INFO, '') AS AGENCY_INFO
                FROM dbo.UW_SUBMSN s
                JOIN dbo.PT_PARTY p ON s.INSURED_PID = p.PARTY_ID
                LEFT JOIN dbo.PT_PARTY ap ON s.AGENCY_ID = ap.PARTY_ID
                LEFT JOIN dbo.UW_POLICY pol ON s.POLICY_ID = pol.POLICY_ID
                ORDER BY s.SUBMSN_ID DESC
                """;
        return tenantJdbcTemplate.query(sql, (rs, rowNum) -> {
            int subId = rs.getInt("SUBMSN_ID");
            Integer agId = rs.getObject("AGENCY_ID") != null ? rs.getInt("AGENCY_ID") : null;
            String agInfo = rs.getString("AGENCY_INFO");
            return new SubmissionDto(
                    subId,
                    rs.getString("SUBMSN_NBR"),
                    rs.getInt("INSURED_PID"),
                    rs.getString("ORG_NM"),
                    (Integer) rs.getObject("POLICY_ID"),
                    rs.getString("POLICY_NBR"),
                    rs.getString("PRODUCT_TYPE"),
                    rs.getString("SUBMSN_DT"),
                    rs.getString("STATUS"),
                    new FileLevelInfoDto(
                            rs.getString("UNDERWRITER"),
                            rs.getString("EFFECTIVE_DT"),
                            rs.getString("EXPIRATION_DT"),
                            rs.getString("RETROACTIVE_DT"),
                            rs.getString("LIMIT_AMT"),
                            rs.getString("RETENTION_AMT")
                    ),
                    quotesBySub.getOrDefault(subId, List.of()),
                    agId,
                    agInfo
            );
        });
    }

    public List<PartyDto> searchParties(String query) {
        return searchParties(query, null, null, null);
    }

    public List<PartyDto> searchParties(String query, String partyType, String partySubType) {
        return searchParties(query, null, partyType, partySubType);
    }

    public List<PartyDto> searchParties(String query, String addressQuery, String partyType, String partySubType) {
        return searchParties(query, addressQuery, null, null, null, null, partyType, partySubType);
    }

    public List<PartyDto> searchParties(String query, String addressQuery, String street, String city, String state, String zip, String partyType, String partySubType) {
        ensureTenantSchema();
        StringBuilder sql = new StringBuilder("""
                SELECT 
                    p.PARTY_ID,
                    p.ORG_NM,
                    COALESCE(p.PARTY_TYPE, 'ORGANIZATION') AS PARTY_TYPE,
                    COALESCE(p.PARTY_SUB_TYPE, 'INSURED') AS PARTY_SUB_TYPE,
                    p.FIRST_NAME,
                    p.LAST_NAME,
                    COALESCE(tc.DISPLAY_NAME, p.PARTY_SUB_TYPE, 'Commercial Insured') AS PARTY_TYPE_DISPLAY,
                    a.ADDRESS_ID,
                    a.LINE1,
                    a.LINE2,
                    a.CITY,
                    a.STATE_CODE,
                    a.POSTAL_CODE,
                    a.COUNTY,
                    a.COUNTRY_CODE,
                    a.IS_ACTIVE AS ADDR_IS_ACTIVE,
                    a.ADDRESS_STATUS,
                    CONVERT(VARCHAR(30), a.EFFECTIVE_FROM, 126) AS EFFECTIVE_FROM,
                    CONVERT(VARCHAR(30), a.EFFECTIVE_TO, 126) AS EFFECTIVE_TO,
                    CONVERT(VARCHAR(30), a.CHANGED_DT, 126) AS CHANGED_DT,
                    a.CHANGED_BY,
                    a.CHANGE_REASON,
                    CONVERT(VARCHAR(30), a.CREATED_DT, 126) AS CREATED_DT
                FROM dbo.PT_PARTY p
                LEFT JOIN dbo.PT_PARTY_TYPE_CODE tc 
                    ON p.PARTY_TYPE = tc.PARTY_TYPE AND p.PARTY_SUB_TYPE = tc.PARTY_SUB_TYPE
                LEFT JOIN dbo.PT_ADDRESS a 
                    ON p.PRIMARY_ADDRESS_ID = a.ADDRESS_ID
                WHERE 1=1
                """);
        List<Object> params = new ArrayList<>();
        if (query != null && !query.isBlank()) {
            sql.append(" AND (p.ORG_NM LIKE ? OR p.FIRST_NAME LIKE ? OR p.LAST_NAME LIKE ? OR a.LINE1 LIKE ? OR a.CITY LIKE ? OR a.STATE_CODE LIKE ? OR a.POSTAL_CODE LIKE ?)");
            String q = "%" + query.trim() + "%";
            params.add(q);
            params.add(q);
            params.add(q);
            params.add(q);
            params.add(q);
            params.add(q);
            params.add(q);
        }
        if (addressQuery != null && !addressQuery.isBlank()) {
            sql.append(" AND (a.LINE1 LIKE ? OR a.LINE2 LIKE ? OR a.CITY LIKE ? OR a.STATE_CODE LIKE ? OR a.POSTAL_CODE LIKE ? OR a.COUNTY LIKE ?)");
            String aq = "%" + addressQuery.trim() + "%";
            params.add(aq);
            params.add(aq);
            params.add(aq);
            params.add(aq);
            params.add(aq);
            params.add(aq);
        }
        if (street != null && !street.isBlank()) {
            sql.append(" AND (a.LINE1 LIKE ? OR a.LINE2 LIKE ?)");
            String sq = "%" + street.trim() + "%";
            params.add(sq);
            params.add(sq);
        }
        if (city != null && !city.isBlank()) {
            sql.append(" AND a.CITY LIKE ?");
            params.add("%" + city.trim() + "%");
        }
        if (state != null && !state.isBlank()) {
            sql.append(" AND a.STATE_CODE LIKE ?");
            params.add("%" + state.trim() + "%");
        }
        if (zip != null && !zip.isBlank()) {
            sql.append(" AND a.POSTAL_CODE LIKE ?");
            params.add("%" + zip.trim() + "%");
        }
        if (partyType != null && !partyType.isBlank()) {
            sql.append(" AND p.PARTY_TYPE = ?");
            params.add(partyType.trim().toUpperCase());
        }
        if (partySubType != null && !partySubType.isBlank()) {
            sql.append(" AND p.PARTY_SUB_TYPE = ?");
            params.add(partySubType.trim().toUpperCase());
        }
        sql.append(" ORDER BY p.ORG_NM ASC");

        return tenantJdbcTemplate.query(sql.toString(), (rs, rowNum) -> {
            int partyId = rs.getInt("PARTY_ID");
            String name = rs.getString("ORG_NM");
            String pType = rs.getString("PARTY_TYPE");
            String pSubType = rs.getString("PARTY_SUB_TYPE");
            String pTypeDisplay = rs.getString("PARTY_TYPE_DISPLAY");
            String fName = rs.getString("FIRST_NAME");
            String lName = rs.getString("LAST_NAME");

            AddressDto address = null;
            int addrId = rs.getInt("ADDRESS_ID");
            if (!rs.wasNull() && addrId > 0) {
                address = new AddressDto(
                        addrId,
                        partyId,
                        rs.getString("LINE1"),
                        rs.getString("LINE2"),
                        rs.getString("CITY"),
                        rs.getString("STATE_CODE"),
                        rs.getString("POSTAL_CODE"),
                        rs.getString("COUNTY"),
                        rs.getString("COUNTRY_CODE"),
                        rs.getBoolean("ADDR_IS_ACTIVE"),
                        rs.getString("ADDRESS_STATUS"),
                        rs.getString("EFFECTIVE_FROM"),
                        rs.getString("EFFECTIVE_TO"),
                        rs.getString("CHANGED_DT"),
                        rs.getString("CHANGED_BY"),
                        rs.getString("CHANGE_REASON"),
                        rs.getString("CREATED_DT")
                );
            }

            return new PartyDto(
                    partyId,
                    name,
                    pType,
                    pSubType,
                    pTypeDisplay,
                    fName,
                    lName,
                    address
            );
        }, params.toArray());
    }

    public List<AddressDto> getPartyAddresses(int partyId) {
        ensureTenantSchema();
        String sql = """
                SELECT 
                    ADDRESS_ID, PARTY_ID, LINE1, LINE2, CITY, STATE_CODE, POSTAL_CODE, COUNTY, COUNTRY_CODE,
                    IS_ACTIVE, ADDRESS_STATUS,
                    CONVERT(VARCHAR(30), EFFECTIVE_FROM, 126) AS EFFECTIVE_FROM,
                    CONVERT(VARCHAR(30), EFFECTIVE_TO, 126) AS EFFECTIVE_TO,
                    CONVERT(VARCHAR(30), CHANGED_DT, 126) AS CHANGED_DT,
                    CHANGED_BY, CHANGE_REASON,
                    CONVERT(VARCHAR(30), CREATED_DT, 126) AS CREATED_DT
                FROM dbo.PT_ADDRESS
                WHERE PARTY_ID = ?
                ORDER BY IS_ACTIVE DESC, CHANGED_DT DESC
                """;
        return tenantJdbcTemplate.query(sql, (rs, rowNum) -> new AddressDto(
                rs.getInt("ADDRESS_ID"),
                rs.getInt("PARTY_ID"),
                rs.getString("LINE1"),
                rs.getString("LINE2"),
                rs.getString("CITY"),
                rs.getString("STATE_CODE"),
                rs.getString("POSTAL_CODE"),
                rs.getString("COUNTY"),
                rs.getString("COUNTRY_CODE"),
                rs.getBoolean("IS_ACTIVE"),
                rs.getString("ADDRESS_STATUS"),
                rs.getString("EFFECTIVE_FROM"),
                rs.getString("EFFECTIVE_TO"),
                rs.getString("CHANGED_DT"),
                rs.getString("CHANGED_BY"),
                rs.getString("CHANGE_REASON"),
                rs.getString("CREATED_DT")
        ), partyId);
    }

    public List<PartyTypeCodeDto> getPartyTypeCodes() {
        ensureTenantSchema();
        String sql = """
                SELECT PARTY_TYPE, PARTY_SUB_TYPE, DISPLAY_NAME, DESCRIPTION, IS_ACTIVE
                FROM dbo.PT_PARTY_TYPE_CODE
                WHERE IS_ACTIVE = 1
                ORDER BY PARTY_TYPE, PARTY_SUB_TYPE
                """;
        return tenantJdbcTemplate.query(sql, (rs, rowNum) -> new PartyTypeCodeDto(
                rs.getString("PARTY_TYPE"),
                rs.getString("PARTY_SUB_TYPE"),
                rs.getString("DISPLAY_NAME"),
                rs.getString("DESCRIPTION"),
                rs.getBoolean("IS_ACTIVE")
        ));
    }

    public PartyDto createParty(String orgName) {
        return createParty(new CreatePartyRequest(orgName));
    }

    public PartyDto createParty(CreatePartyRequest req) {
        ensureTenantSchema();
        String pType = (req.partyType() != null && !req.partyType().isBlank())
                ? req.partyType().trim().toUpperCase()
                : "ORGANIZATION";
        String pSubType = (req.partySubType() != null && !req.partySubType().isBlank())
                ? req.partySubType().trim().toUpperCase()
                : ("PERSON".equals(pType) ? "PRODUCER" : "INSURED");

        String fName = (req.firstName() != null) ? req.firstName().trim() : null;
        String lName = (req.lastName() != null) ? req.lastName().trim() : null;

        String displayName;
        if ("PERSON".equals(pType)) {
            if (req.name() != null && !req.name().isBlank()) {
                displayName = req.name().trim();
            } else {
                displayName = ((fName != null ? fName : "") + " " + (lName != null ? lName : "")).trim();
                if (displayName.isBlank() && req.orgName() != null) {
                    displayName = req.orgName().trim();
                }
            }
        } else {
            if (req.orgName() != null && !req.orgName().isBlank()) {
                displayName = req.orgName().trim();
            } else if (req.name() != null && !req.name().isBlank()) {
                displayName = req.name().trim();
            } else {
                displayName = "";
            }
        }

        if (displayName.isBlank()) {
            throw new IllegalArgumentException("Party Name or Person First/Last Name cannot be empty.");
        }

        String sqlParty = """
                INSERT INTO dbo.PT_PARTY (ORG_NM, PARTY_TYPE, PARTY_SUB_TYPE, FIRST_NAME, LAST_NAME)
                VALUES (?, ?, ?, ?, ?)
                """;
        KeyHolder keyHolder = new GeneratedKeyHolder();
        final String finalName = displayName;
        tenantJdbcTemplate.update(connection -> {
            PreparedStatement ps = connection.prepareStatement(sqlParty, Statement.RETURN_GENERATED_KEYS);
            ps.setString(1, finalName);
            ps.setString(2, pType);
            ps.setString(3, pSubType);
            ps.setString(4, fName);
            ps.setString(5, lName);
            return ps;
        }, keyHolder);

        Number partyKey = keyHolder.getKey();
        int partyId = partyKey != null ? partyKey.intValue() : -1;

        AddressDto addressDto = null;
        if (req.address() != null && req.address().line1() != null && !req.address().line1().isBlank()) {
            AddressInput addr = req.address();
            String sqlAddr = """
                    INSERT INTO dbo.PT_ADDRESS (
                        PARTY_ID, LINE1, LINE2, CITY, STATE_CODE, POSTAL_CODE, COUNTY, COUNTRY_CODE,
                        IS_ACTIVE, ADDRESS_STATUS, EFFECTIVE_FROM, CHANGED_DT, CHANGED_BY, CHANGE_REASON, CREATED_DT
                    ) VALUES (
                        ?, ?, ?, ?, ?, ?, ?, ?,
                        1, 'ACTIVE', SYSUTCDATETIME(), SYSUTCDATETIME(), ?, ?, SYSUTCDATETIME()
                    )
                    """;
            KeyHolder addrKeyHolder = new GeneratedKeyHolder();
            String country = (addr.countryCode() != null && !addr.countryCode().isBlank()) ? addr.countryCode().trim() : "US";
            String reason = (addr.changeReason() != null && !addr.changeReason().isBlank()) ? addr.changeReason().trim() : "Initial Address Creation";
            tenantJdbcTemplate.update(connection -> {
                PreparedStatement ps = connection.prepareStatement(sqlAddr, Statement.RETURN_GENERATED_KEYS);
                ps.setInt(1, partyId);
                ps.setString(2, addr.line1().trim());
                ps.setString(3, addr.line2() != null ? addr.line2().trim() : null);
                ps.setString(4, addr.city() != null ? addr.city().trim() : "");
                ps.setString(5, addr.stateCode() != null ? addr.stateCode().trim().toUpperCase() : "");
                ps.setString(6, addr.postalCode() != null ? addr.postalCode().trim() : "");
                ps.setString(7, addr.county() != null ? addr.county().trim() : null);
                ps.setString(8, country);
                ps.setString(9, "System User");
                ps.setString(10, reason);
                return ps;
            }, addrKeyHolder);

            Number addrKey = addrKeyHolder.getKey();
            int addressId = addrKey != null ? addrKey.intValue() : -1;

            if (addressId > 0) {
                tenantJdbcTemplate.update("UPDATE dbo.PT_PARTY SET PRIMARY_ADDRESS_ID = ? WHERE PARTY_ID = ?", addressId, partyId);
                addressDto = new AddressDto(
                        addressId,
                        partyId,
                        addr.line1().trim(),
                        addr.line2() != null ? addr.line2().trim() : null,
                        addr.city() != null ? addr.city().trim() : "",
                        addr.stateCode() != null ? addr.stateCode().trim().toUpperCase() : "",
                        addr.postalCode() != null ? addr.postalCode().trim() : "",
                        addr.county() != null ? addr.county().trim() : null,
                        country,
                        true,
                        "ACTIVE",
                        LocalDate.now().toString(),
                        null,
                        LocalDate.now().toString(),
                        "System User",
                        reason,
                        LocalDate.now().toString()
                );
            }
        }

        getOrCreatePolicyForParty(partyId, finalName);

        String typeDisplay = pSubType;
        try {
            List<String> displays = tenantJdbcTemplate.query(
                    "SELECT DISPLAY_NAME FROM dbo.PT_PARTY_TYPE_CODE WHERE PARTY_TYPE = ? AND PARTY_SUB_TYPE = ?",
                    (rs, rNum) -> rs.getString("DISPLAY_NAME"),
                    pType, pSubType
            );
            if (!displays.isEmpty()) {
                typeDisplay = displays.get(0);
            }
        } catch (Exception ignored) {
        }

        return new PartyDto(
                partyId,
                finalName,
                pType,
                pSubType,
                typeDisplay,
                fName,
                lName,
                addressDto
        );
    }

    public AddressDto updatePartyAddress(int partyId, AddressInput input, String changedBy, String changeReason) {
        ensureTenantSchema();
        if (input == null || input.line1() == null || input.line1().isBlank()) {
            throw new IllegalArgumentException("Address Line 1 is required.");
        }
        String actor = (changedBy != null && !changedBy.isBlank()) ? changedBy.trim() : "System User";
        String reason = (changeReason != null && !changeReason.isBlank())
                ? changeReason.trim()
                : (input.changeReason() != null ? input.changeReason().trim() : "Address Update");

        // 1. Mark existing active addresses as superseded/inactive with change timestamp and audit
        tenantJdbcTemplate.update("""
                UPDATE dbo.PT_ADDRESS
                SET IS_ACTIVE = 0,
                    ADDRESS_STATUS = 'SUPERSEDED',
                    EFFECTIVE_TO = SYSUTCDATETIME(),
                    CHANGED_DT = SYSUTCDATETIME(),
                    CHANGED_BY = ?,
                    CHANGE_REASON = ?
                WHERE PARTY_ID = ? AND IS_ACTIVE = 1
                """, actor, reason, partyId);

        // 2. Insert new address as active
        String country = (input.countryCode() != null && !input.countryCode().isBlank()) ? input.countryCode().trim() : "US";
        String sql = """
                INSERT INTO dbo.PT_ADDRESS (
                    PARTY_ID, LINE1, LINE2, CITY, STATE_CODE, POSTAL_CODE, COUNTY, COUNTRY_CODE,
                    IS_ACTIVE, ADDRESS_STATUS, EFFECTIVE_FROM, CHANGED_DT, CHANGED_BY, CHANGE_REASON, CREATED_DT
                ) VALUES (
                    ?, ?, ?, ?, ?, ?, ?, ?,
                    1, 'ACTIVE', SYSUTCDATETIME(), SYSUTCDATETIME(), ?, ?, SYSUTCDATETIME()
                )
                """;
        KeyHolder keyHolder = new GeneratedKeyHolder();
        tenantJdbcTemplate.update(connection -> {
            PreparedStatement ps = connection.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS);
            ps.setInt(1, partyId);
            ps.setString(2, input.line1().trim());
            ps.setString(3, input.line2() != null ? input.line2().trim() : null);
            ps.setString(4, input.city() != null ? input.city().trim() : "");
            ps.setString(5, input.stateCode() != null ? input.stateCode().trim().toUpperCase() : "");
            ps.setString(6, input.postalCode() != null ? input.postalCode().trim() : "");
            ps.setString(7, input.county() != null ? input.county().trim() : null);
            ps.setString(8, country);
            ps.setString(9, actor);
            ps.setString(10, reason);
            return ps;
        }, keyHolder);

        Number key = keyHolder.getKey();
        int addressId = key != null ? key.intValue() : -1;

        if (addressId > 0) {
            // 3. Update primary address pointer on party
            tenantJdbcTemplate.update("UPDATE dbo.PT_PARTY SET PRIMARY_ADDRESS_ID = ? WHERE PARTY_ID = ?", addressId, partyId);

            // 4. Update address string on any existing policies for this party
            String formatted = String.format("%s, %s, %s %s",
                    input.line1().trim(),
                    input.city() != null ? input.city().trim() : "",
                    input.stateCode() != null ? input.stateCode().trim() : "",
                    input.postalCode() != null ? input.postalCode().trim() : "").replaceAll(" ,", "").trim();
            tenantJdbcTemplate.update("UPDATE dbo.UW_POLICY SET ADDRESS = ? WHERE INSURED_PID = ?", formatted, partyId);
        }

        List<AddressDto> records = getPartyAddresses(partyId);
        return records.stream().filter(a -> a.addressId() == addressId).findFirst().orElse(null);
    }

    public SubmissionDto createSubmission(int partyId) {
        return createSubmissionWithDetails(partyId, null, null, null, null, null, null);
    }

    public SubmissionDto createSubmissionWithDetails(
            int partyId,
            String underwriter,
            String limit,
            String retention,
            String premium) {
        return createSubmissionWithDetails(partyId, underwriter, limit, retention, premium, null, null);
    }

    public SubmissionDto createSubmissionWithDetails(
            int partyId,
            String underwriter,
            String limit,
            String retention,
            String premium,
            Integer agencyId,
            String agencyInfo) {
        ensureTenantSchema();
        String orgName = tenantJdbcTemplate.queryForObject(
                "SELECT ORG_NM FROM dbo.PT_PARTY WHERE PARTY_ID = ?",
                String.class,
                partyId
        );
        int policyId = getOrCreatePolicyForParty(partyId, orgName);
        String policyNbr = tenantJdbcTemplate.queryForObject(
                "SELECT POLICY_NBR FROM dbo.UW_POLICY WHERE POLICY_ID = ?",
                String.class,
                policyId
        );
        String productType = tenantJdbcTemplate.queryForObject(
                "SELECT PRODUCT_TYPE FROM dbo.UW_POLICY WHERE POLICY_ID = ?",
                String.class,
                policyId
        );

        String today = LocalDate.now().toString();
        String nextYear = LocalDate.now().plusYears(1).toString();
        String retro = LocalDate.now().minusYears(2).toString();
        String uw = (underwriter != null && !underwriter.isBlank()) ? underwriter.trim() : "Michael Chang";
        String lim = (limit != null && !limit.isBlank()) ? limit.trim() : "$5,000,000";
        String ret = (retention != null && !retention.isBlank()) ? retention.trim() : "$50,000";
        String prem = (premium != null && !premium.isBlank()) ? premium.trim() : "$38,500";
        Integer resolvedAgencyId = (agencyId != null && agencyId > 0) ? agencyId : null;
        String resolvedAgencyInfo = (agencyInfo != null && !agencyInfo.isBlank()) ? agencyInfo.trim() : null;
        if (resolvedAgencyId != null && (resolvedAgencyInfo == null || resolvedAgencyInfo.isBlank())) {
            try {
                resolvedAgencyInfo = tenantJdbcTemplate.queryForObject(
                        "SELECT ORG_NM FROM dbo.PT_PARTY WHERE PARTY_ID = ?", String.class, resolvedAgencyId);
            } catch (Exception ignored) {}
        }

        String sql = """
                INSERT INTO dbo.UW_SUBMSN (
                    SUBMSN_NBR, INSURED_PID, POLICY_ID, SUBMSN_DT, STATUS,
                    UNDERWRITER, EFFECTIVE_DT, EXPIRATION_DT, RETROACTIVE_DT, LIMIT_AMT, RETENTION_AMT,
                    AGENCY_ID, AGENCY_INFO
                )
                OUTPUT inserted.SUBMSN_ID, inserted.SUBMSN_NBR
                SELECT 'SUB-' + CAST(ISNULL(MAX(SUBMSN_ID), 99999) + 1 AS VARCHAR(50)),
                       ?, ?, ?, 'Quoted', ?, ?, ?, ?, ?, ?, ?, ?
                FROM dbo.UW_SUBMSN
                """;

        final String finalAgencyInfo = resolvedAgencyInfo;
        final Integer finalAgencyId = resolvedAgencyId;

        SubmissionDto created = tenantJdbcTemplate.queryForObject(sql, (rs, rowNum) -> {
            int subId = rs.getInt("SUBMSN_ID");
            String subNbr = rs.getString("SUBMSN_NBR");
            String quoteNbr = "Q-" + subId;
            insertQuote(quoteNbr, subId, prem, "Pending", today);
            QuoteDto quote = new QuoteDto(quoteNbr, prem, "Pending", today);
            return new SubmissionDto(
                    subId,
                    subNbr,
                    partyId,
                    orgName,
                    policyId,
                    policyNbr,
                    productType,
                    today,
                    "Quoted",
                    new FileLevelInfoDto(uw, today, nextYear, retro, lim, ret),
                    List.of(quote),
                    finalAgencyId,
                    finalAgencyInfo
            );
        }, partyId, policyId, today, uw, today, nextYear, retro, lim, ret, finalAgencyId, finalAgencyInfo);

        if (finalAgencyInfo != null && !finalAgencyInfo.isBlank()) {
            try {
                tenantJdbcTemplate.update("UPDATE dbo.UW_POLICY SET AGENCY_INFO = ? WHERE POLICY_ID = ?", finalAgencyInfo, policyId);
            } catch (Exception ignored) {}
        }

        return created;
    }

    public List<ClaimDto> getAllClaims() {
        ensureTenantSchema();
        String sql = """
                SELECT CLAIM_ID, CLAIM_NBR, POLICY_NBR, INSURED_NM, PRODUCT_TYPE, LOSS_DT, STATUS, RESERVE_AMT, ISNULL(DESCRIPTION, '') AS DESCRIPTION
                FROM dbo.CLM_CLAIM
                ORDER BY CLAIM_ID DESC
                """;
        return tenantJdbcTemplate.query(sql, (rs, rowNum) -> new ClaimDto(
                rs.getInt("CLAIM_ID"),
                rs.getString("CLAIM_NBR"),
                rs.getString("POLICY_NBR"),
                rs.getString("INSURED_NM"),
                rs.getString("PRODUCT_TYPE"),
                rs.getString("LOSS_DT"),
                rs.getString("STATUS"),
                rs.getString("RESERVE_AMT"),
                rs.getString("DESCRIPTION")
        ));
    }

    public ClaimDto createClaim(String policyNbr, String insuredName, String productType, String lossDate, String reserveAmt, String description) {
        ensureTenantSchema();
        Integer nextSeq = tenantJdbcTemplate.queryForObject("SELECT ISNULL(MAX(CLAIM_ID), 419) + 1 FROM dbo.CLM_CLAIM", Integer.class);
        String claimNbr = "CLM-2026-0" + (nextSeq != null ? nextSeq : 420);
        String lDate = (lossDate != null && !lossDate.isBlank()) ? lossDate.trim() : LocalDate.now().toString();
        String rAmt = (reserveAmt != null && !reserveAmt.isBlank()) ? reserveAmt.trim() : "$50,000";

        KeyHolder kh = new GeneratedKeyHolder();
        tenantJdbcTemplate.update(con -> {
            PreparedStatement ps = con.prepareStatement("""
                    INSERT INTO dbo.CLM_CLAIM (CLAIM_NBR, POLICY_NBR, INSURED_NM, PRODUCT_TYPE, LOSS_DT, STATUS, RESERVE_AMT, DESCRIPTION)
                    VALUES (?, ?, ?, ?, ?, 'Open - Defense', ?, ?)
                    """, Statement.RETURN_GENERATED_KEYS);
            ps.setString(1, claimNbr);
            ps.setString(2, policyNbr);
            ps.setString(3, insuredName);
            ps.setString(4, productType != null && !productType.isBlank() ? productType : "Medical Malpractice");
            ps.setString(5, lDate);
            ps.setString(6, rAmt);
            ps.setString(7, description != null ? description : "");
            return ps;
        }, kh);
        int id = kh.getKey() != null ? kh.getKey().intValue() : -1;
        return new ClaimDto(id, claimNbr, policyNbr, insuredName, productType, lDate, "Open - Defense", rAmt, description);
    }

    public DbPingResult pingTenantDatabase() {
        try {
            ensureTenantSchema();
            return tenantJdbcTemplate.queryForObject(
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
            return new DbPingResult(false, "UNKNOWN_TENANT_DB", null, null, null, e.getMessage());
        }
    }

    public String resolveDefaultTier2Uw(int tenantId, String roleCode) {
        if (tenantRegistryService != null) {
            return tenantRegistryService.getDefaultTier2UwForRole(tenantId, roleCode);
        }
        return "submissions";
    }

    public String resolveDefaultTier2Claims(int tenantId, String roleCode) {
        if (tenantRegistryService != null) {
            return tenantRegistryService.getDefaultTier2ClaimsForRole(tenantId, roleCode);
        }
        return "claims";
    }

    public String resolveAllowedTier2(int tenantId, String roleCode) {
        if (tenantRegistryService != null) {
            return tenantRegistryService.getAllowedTier2ForRole(tenantId, roleCode);
        }
        return "inbox,policies,submissions,claims,claims/fnol,claims/open,claims/loss-runs";
    }

    public String resolveDefaultTier1(int tenantId, String roleCode) {
        if (tenantRegistryService != null) {
            return tenantRegistryService.getDefaultTier1ForRole(tenantId, roleCode);
        }
        if (roleCode == null) return "dashboard";
        String upper = roleCode.toUpperCase();
        if (upper.contains("UNDERWRITER") || upper.equals("UW")) return "underwriting";
        if (upper.contains("CLAIM")) return "claims";
        return "dashboard";
    }

    public String resolveRoleName(String roleCode) {
        if (roleCode == null) return "User";
        return switch (roleCode.toUpperCase()) {
            case "EXECUTIVE" -> "Portfolio Executive";
            case "UNDERWRITER" -> "Senior Underwriter";
            case "CLAIMS_ADJUSTER" -> "Claims Adjuster";
            case "AUDITOR" -> "Compliance Auditor (Read-Only)";
            case "ADMIN" -> "System Administrator";
            default -> roleCode;
        };
    }

    public List<AppUserDto> getAllUsers(int tenantId) {
        int prevTenant = TenantContext.getTenantId();
        try {
            TenantContext.setTenantId(tenantId);
            ensureTenantSchema();
            String sql = """
                    SELECT USER_ID, TENANT_ID, USERNAME, EMAIL, DISPLAY_NAME, ROLE_CODE,
                           DEPARTMENT, AUTH_PROVIDER, EXTERNAL_SUBJECT_ID, IS_ACTIVE,
                           CONVERT(VARCHAR(20), CREATED_DT, 120) AS CREATED_DT,
                           CONVERT(VARCHAR(20), LAST_LOGIN_DT, 120) AS LAST_LOGIN_DT
                    FROM dbo.APP_USER
                    WHERE TENANT_ID = ?
                    ORDER BY USER_ID ASC
                    """;
            return tenantJdbcTemplate.query(sql, (rs, rowNum) -> new AppUserDto(
                    rs.getInt("USER_ID"),
                    rs.getInt("TENANT_ID"),
                    rs.getString("USERNAME"),
                    rs.getString("EMAIL"),
                    rs.getString("DISPLAY_NAME"),
                    rs.getString("ROLE_CODE"),
                    resolveRoleName(rs.getString("ROLE_CODE")),
                    rs.getString("DEPARTMENT"),
                    resolveDefaultTier1(tenantId, rs.getString("ROLE_CODE")),
                    resolveDefaultTier2Uw(tenantId, rs.getString("ROLE_CODE")),
                    resolveDefaultTier2Claims(tenantId, rs.getString("ROLE_CODE")),
                    resolveAllowedTier2(tenantId, rs.getString("ROLE_CODE")),
                    rs.getString("AUTH_PROVIDER") != null ? rs.getString("AUTH_PROVIDER") : "LOCAL",
                    rs.getString("EXTERNAL_SUBJECT_ID"),
                    rs.getBoolean("IS_ACTIVE"),
                    rs.getString("CREATED_DT"),
                    rs.getString("LAST_LOGIN_DT")
            ), tenantId);
        } finally {
            TenantContext.setTenantId(prevTenant);
        }
    }

    public AppUserDto saveUser(AppUserDto user) {
        int prevTenant = TenantContext.getTenantId();
        try {
            TenantContext.setTenantId(user.tenantId());
            ensureTenantSchema();
            if (user.userId() > 0) {
                tenantJdbcTemplate.update("""
                        UPDATE dbo.APP_USER
                        SET USERNAME = ?, EMAIL = ?, DISPLAY_NAME = ?, ROLE_CODE = ?,
                            DEPARTMENT = ?, AUTH_PROVIDER = ?, EXTERNAL_SUBJECT_ID = ?,
                            IS_ACTIVE = ?, UPDATED_DT = GETDATE()
                        WHERE USER_ID = ? AND TENANT_ID = ?
                        """,
                        user.username(),
                        user.email(),
                        user.displayName(),
                        user.roleCode(),
                        user.department(),
                        user.authProvider() != null ? user.authProvider() : "LOCAL",
                        user.externalSubjectId(),
                        user.active() ? 1 : 0,
                        user.userId(),
                        user.tenantId()
                );
                return user;
            } else {
                KeyHolder kh = new GeneratedKeyHolder();
                tenantJdbcTemplate.update(con -> {
                    PreparedStatement ps = con.prepareStatement("""
                            INSERT INTO dbo.APP_USER (
                                TENANT_ID, USERNAME, EMAIL, DISPLAY_NAME, PASSWORD_HASH,
                                ROLE_CODE, DEPARTMENT, AUTH_PROVIDER, EXTERNAL_SUBJECT_ID, IS_ACTIVE
                            ) VALUES (?, ?, ?, ?, '', ?, ?, ?, ?, ?)
                            """, Statement.RETURN_GENERATED_KEYS);
                    ps.setInt(1, user.tenantId());
                    ps.setString(2, user.username());
                    ps.setString(3, user.email());
                    ps.setString(4, user.displayName());
                    ps.setString(5, user.roleCode());
                    ps.setString(6, user.department());
                    ps.setString(7, user.authProvider() != null ? user.authProvider() : "LOCAL");
                    ps.setString(8, user.externalSubjectId());
                    ps.setBoolean(9, user.active());
                    return ps;
                }, kh);
                Number key = kh.getKey();
                int newId = key != null ? key.intValue() : 0;
                return new AppUserDto(
                        newId,
                        user.tenantId(),
                        user.username(),
                        user.email(),
                        user.displayName(),
                        user.roleCode(),
                        resolveRoleName(user.roleCode()),
                        user.department(),
                        (user.defaultTier1Nav() != null && !user.defaultTier1Nav().isBlank()) ? user.defaultTier1Nav() : resolveDefaultTier1(user.tenantId(), user.roleCode()),
                        (user.defaultTier2NavUw() != null && !user.defaultTier2NavUw().isBlank()) ? user.defaultTier2NavUw() : resolveDefaultTier2Uw(user.tenantId(), user.roleCode()),
                        (user.defaultTier2NavClaims() != null && !user.defaultTier2NavClaims().isBlank()) ? user.defaultTier2NavClaims() : resolveDefaultTier2Claims(user.tenantId(), user.roleCode()),
                        (user.allowedTier2Nav() != null && !user.allowedTier2Nav().isBlank()) ? user.allowedTier2Nav() : resolveAllowedTier2(user.tenantId(), user.roleCode()),
                        user.authProvider() != null ? user.authProvider() : "LOCAL",
                        user.externalSubjectId(),
                        user.active(),
                        LocalDate.now().toString(),
                        null
                );
            }
        } finally {
            TenantContext.setTenantId(prevTenant);
        }
    }

    public boolean deleteUser(int userId) {
        return deleteUser(userId, TenantContext.getTenantId());
    }

    public boolean deleteUser(int userId, int tenantId) {
        int prevTenant = TenantContext.getTenantId();
        try {
            TenantContext.setTenantId(tenantId);
            ensureTenantSchema();
            int rows = tenantJdbcTemplate.update("UPDATE dbo.APP_USER SET IS_ACTIVE = 0 WHERE USER_ID = ?", userId);
            return rows > 0;
        } finally {
            TenantContext.setTenantId(prevTenant);
        }
    }

    public Map<String, Object> authenticate(int tenantId, String username, String password) {
        int prevTenant = TenantContext.getTenantId();
        try {
            TenantContext.setTenantId(tenantId);
            ensureTenantSchema();
            String sql = """
                    SELECT USER_ID, TENANT_ID, USERNAME, EMAIL, DISPLAY_NAME, PASSWORD_HASH, ROLE_CODE,
                           DEPARTMENT, AUTH_PROVIDER, EXTERNAL_SUBJECT_ID, IS_ACTIVE,
                           CONVERT(VARCHAR(20), CREATED_DT, 120) AS CREATED_DT,
                           CONVERT(VARCHAR(20), LAST_LOGIN_DT, 120) AS LAST_LOGIN_DT
                    FROM dbo.APP_USER
                    WHERE TENANT_ID = ? AND LOWER(USERNAME) = LOWER(?) AND IS_ACTIVE = 1
                    """;
            List<Map<String, Object>> rows = tenantJdbcTemplate.query(sql, (rs, rowNum) -> {
                Map<String, Object> map = new LinkedHashMap<>();
                map.put("userId", rs.getInt("USER_ID"));
                map.put("tenantId", rs.getInt("TENANT_ID"));
                map.put("username", rs.getString("USERNAME"));
                map.put("email", rs.getString("EMAIL"));
                map.put("displayName", rs.getString("DISPLAY_NAME"));
                map.put("passwordHash", rs.getString("PASSWORD_HASH"));
                map.put("roleCode", rs.getString("ROLE_CODE"));
                map.put("department", rs.getString("DEPARTMENT"));
                map.put("authProvider", rs.getString("AUTH_PROVIDER"));
                map.put("externalSubjectId", rs.getString("EXTERNAL_SUBJECT_ID"));
                map.put("active", rs.getBoolean("IS_ACTIVE"));
                map.put("createdDt", rs.getString("CREATED_DT"));
                map.put("lastLoginDt", rs.getString("LAST_LOGIN_DT"));
                return map;
            }, tenantId, username);

            if (rows.isEmpty()) {
                return Map.of("success", false, "message", "Invalid username or account inactive for this tenant.");
            }

            Map<String, Object> userMap = rows.get(0);
            String passHash = (String) userMap.get("passwordHash");
            if (passHash != null && !passHash.isBlank() && password != null && !password.isBlank()) {
                if (!passHash.equals(password)) {
                    return Map.of("success", false, "message", "Invalid password.");
                }
            }

            tenantJdbcTemplate.update("UPDATE dbo.APP_USER SET LAST_LOGIN_DT = GETDATE() WHERE USER_ID = ?", userMap.get("userId"));

            AppUserDto userDto = new AppUserDto(
                    (int) userMap.get("userId"),
                    (int) userMap.get("tenantId"),
                    (String) userMap.get("username"),
                    (String) userMap.get("email"),
                    (String) userMap.get("displayName"),
                    (String) userMap.get("roleCode"),
                    resolveRoleName((String) userMap.get("roleCode")),
                    (String) userMap.get("department"),
                    resolveDefaultTier1((int) userMap.get("tenantId"), (String) userMap.get("roleCode")),
                    resolveDefaultTier2Uw((int) userMap.get("tenantId"), (String) userMap.get("roleCode")),
                    resolveDefaultTier2Claims((int) userMap.get("tenantId"), (String) userMap.get("roleCode")),
                    resolveAllowedTier2((int) userMap.get("tenantId"), (String) userMap.get("roleCode")),
                    (String) userMap.get("authProvider"),
                    (String) userMap.get("externalSubjectId"),
                    (boolean) userMap.get("active"),
                    (String) userMap.get("createdDt"),
                    LocalDate.now().toString()
            );

            Map<String, Object> result = new LinkedHashMap<>();
            result.put("success", true);
            result.put("user", userDto);
            result.put("tenantId", tenantId);
            return result;
        } finally {
            TenantContext.setTenantId(prevTenant);
        }
    }

    public ZipCodeDto lookupZipCode(String zipCode) {
        if (zipCode == null || zipCode.isBlank()) {
            return null;
        }
        ensureTenantSchema();
        String cleanZip = zipCode.trim();
        if (cleanZip.contains("-")) {
            cleanZip = cleanZip.substring(0, cleanZip.indexOf('-')).trim();
        }
        String sql = """
                SELECT ZIP_CODE, CITY, STATE_CODE, STATE_NAME, COUNTY
                FROM dbo.REF_ZIP_CODE
                WHERE ZIP_CODE = ? AND IS_ACTIVE = 1
                """;
        List<ZipCodeDto> list = tenantJdbcTemplate.query(sql, (rs, rowNum) -> new ZipCodeDto(
                rs.getString("ZIP_CODE"),
                rs.getString("CITY"),
                rs.getString("STATE_CODE"),
                rs.getString("STATE_NAME"),
                rs.getString("COUNTY")
        ), cleanZip);

        if (!list.isEmpty()) {
            return list.get(0);
        }

        // Live fallback to national zip database if not yet in cache
        try {
            if (cleanZip.matches("^\\d{5}$")) {
                java.net.http.HttpClient client = java.net.http.HttpClient.newBuilder()
                        .connectTimeout(java.time.Duration.ofMillis(1200))
                        .build();
                java.net.http.HttpRequest req = java.net.http.HttpRequest.newBuilder()
                        .uri(java.net.URI.create("https://api.zippopotam.us/us/" + cleanZip))
                        .timeout(java.time.Duration.ofMillis(1500))
                        .header("Accept", "application/json")
                        .GET()
                        .build();
                java.net.http.HttpResponse<String> resp = client.send(req, java.net.http.HttpResponse.BodyHandlers.ofString());
                if (resp.statusCode() == 200 && resp.body() != null) {
                    String body = resp.body();
                    String place = extractJsonValue(body, "place name");
                    String stateAbbr = extractJsonValue(body, "state abbreviation");
                    String stateFull = extractJsonValue(body, "state");
                    if (place != null && stateAbbr != null) {
                        tenantJdbcTemplate.update("""
                                IF NOT EXISTS (SELECT 1 FROM dbo.REF_ZIP_CODE WHERE ZIP_CODE = ?)
                                INSERT INTO dbo.REF_ZIP_CODE (ZIP_CODE, CITY, STATE_CODE, STATE_NAME, COUNTY, IS_ACTIVE)
                                VALUES (?, ?, ?, ?, NULL, 1)
                                """, cleanZip, cleanZip, place, stateAbbr, stateFull);
                        return new ZipCodeDto(cleanZip, place, stateAbbr, stateFull, null);
                    }
                }
            }
        } catch (Exception ignored) {
        }

        return null;
    }

    private String extractJsonValue(String json, String key) {
        String pattern = "\"" + key + "\":\\s*\"([^\"]+)\"";
        java.util.regex.Matcher m = java.util.regex.Pattern.compile(pattern).matcher(json);
        if (m.find()) {
            return m.group(1);
        }
        return null;
    }
}
