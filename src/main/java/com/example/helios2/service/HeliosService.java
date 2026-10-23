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

import com.example.helios2.service.TenantRegistryService.DbPingResult;
import com.example.helios2.tenant.TenantContext;

@Service
public class HeliosService {

    private final JdbcTemplate tenantJdbcTemplate;
    private final Set<Integer> initializedTenants = ConcurrentHashMap.newKeySet();

    public HeliosService(@Qualifier("tenantJdbcTemplate") JdbcTemplate tenantJdbcTemplate) {
        this.tenantJdbcTemplate = tenantJdbcTemplate;
    }

    public record PartyDto(int id, String name) {
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
            List<QuoteDto> quotes
    ) {
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
            String calcTrace
    ) {
        public QuoteDto(String quoteId, String premium, String status, String generated) {
            this(quoteId, premium, status, generated, null, null, null, null, null, null, null, null, null);
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

    public synchronized void ensureTenantSchema() {
        int tenantId = TenantContext.getTenantId();
        if (!initializedTenants.add(tenantId)) {
            return;
        }
        try {
            // 1. Ensure dbo.PT_PARTY exists
            tenantJdbcTemplate.execute("""
                    IF OBJECT_ID('dbo.PT_PARTY', 'U') IS NULL
                    CREATE TABLE dbo.PT_PARTY (
                        PARTY_ID INT IDENTITY(1,1) PRIMARY KEY,
                        ORG_NM VARCHAR(100) NOT NULL
                    );
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
                    rs.getString("CALC_TRACE")
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
                    rs.getString("CALC_TRACE")
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
                    rs.getString("CALC_TRACE")
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
                scheduleMod, serffTrackingNbr, baseRate, calcTrace
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
                       ISNULL(s.RETENTION_AMT, '$50,000') AS RETENTION_AMT
                FROM dbo.UW_SUBMSN s
                JOIN dbo.PT_PARTY p ON s.INSURED_PID = p.PARTY_ID
                LEFT JOIN dbo.UW_POLICY pol ON s.POLICY_ID = pol.POLICY_ID
                ORDER BY s.SUBMSN_ID DESC
                """;
        return tenantJdbcTemplate.query(sql, (rs, rowNum) -> {
            int subId = rs.getInt("SUBMSN_ID");
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
                    quotesBySub.getOrDefault(subId, List.of())
            );
        });
    }

    public List<PartyDto> searchParties(String query) {
        ensureTenantSchema();
        if (query == null || query.isBlank()) {
            String sql = "SELECT PARTY_ID, ORG_NM FROM dbo.PT_PARTY ORDER BY ORG_NM ASC";
            return tenantJdbcTemplate.query(sql, (rs, rowNum) -> new PartyDto(
                    rs.getInt("PARTY_ID"),
                    rs.getString("ORG_NM")
            ));
        }
        String sql = "SELECT PARTY_ID, ORG_NM FROM dbo.PT_PARTY WHERE ORG_NM LIKE ? ORDER BY ORG_NM ASC";
        return tenantJdbcTemplate.query(
                sql,
                (rs, rowNum) -> new PartyDto(rs.getInt("PARTY_ID"), rs.getString("ORG_NM")),
                "%" + query.trim() + "%"
        );
    }

    public PartyDto createParty(String orgName) {
        ensureTenantSchema();
        if (orgName == null || orgName.isBlank()) {
            throw new IllegalArgumentException("Organization Name cannot be empty.");
        }
        String trimmed = orgName.trim();
        String sql = "INSERT INTO dbo.PT_PARTY (ORG_NM) VALUES (?)";
        KeyHolder keyHolder = new GeneratedKeyHolder();

        tenantJdbcTemplate.update(connection -> {
            PreparedStatement ps = connection.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS);
            ps.setString(1, trimmed);
            return ps;
        }, keyHolder);

        Number key = keyHolder.getKey();
        int newId = key != null ? key.intValue() : -1;
        getOrCreatePolicyForParty(newId, trimmed);
        return new PartyDto(newId, trimmed);
    }

    public SubmissionDto createSubmission(int partyId) {
        return createSubmissionWithDetails(partyId, null, null, null, null);
    }

    public SubmissionDto createSubmissionWithDetails(
            int partyId,
            String underwriter,
            String limit,
            String retention,
            String premium) {
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

        String sql = """
                INSERT INTO dbo.UW_SUBMSN (
                    SUBMSN_NBR, INSURED_PID, POLICY_ID, SUBMSN_DT, STATUS,
                    UNDERWRITER, EFFECTIVE_DT, EXPIRATION_DT, RETROACTIVE_DT, LIMIT_AMT, RETENTION_AMT
                )
                OUTPUT inserted.SUBMSN_ID, inserted.SUBMSN_NBR
                SELECT 'SUB-' + CAST(ISNULL(MAX(SUBMSN_ID), 99999) + 1 AS VARCHAR(50)),
                       ?, ?, ?, 'Quoted', ?, ?, ?, ?, ?, ?
                FROM dbo.UW_SUBMSN
                """;

        return tenantJdbcTemplate.queryForObject(sql, (rs, rowNum) -> {
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
                    List.of(quote)
            );
        }, partyId, policyId, today, uw, today, nextYear, retro, lim, ret);
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
}
