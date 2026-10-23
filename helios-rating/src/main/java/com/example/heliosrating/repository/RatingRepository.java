package com.example.heliosrating.repository;

import com.example.heliosrating.model.Product;
import com.example.heliosrating.model.RatePlanVersion;
import com.example.heliosrating.model.RatingPlan;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import jakarta.annotation.PostConstruct;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

@Repository
public class RatingRepository {
    private static final Logger log = LoggerFactory.getLogger(RatingRepository.class);

    @Autowired(required = false)
    private JdbcTemplate jdbcTemplate;

    // In-Memory fallback store so the engine is 100% operational in all environments
    private final Map<String, Product> products = new LinkedHashMap<>();
    private final Map<String, RatingPlan> plans = new LinkedHashMap<>();
    private final List<RatePlanVersion> versions = new ArrayList<>();
    private final Map<String, BigDecimal> baseRates = new HashMap<>(); // product:classCode -> rate
    private final Map<String, BigDecimal> territoryFactors = new HashMap<>(); // state:territory -> factor
    private final Map<String, BigDecimal> limitFactors = new HashMap<>(); // limitKey -> factor
    private final Map<String, BigDecimal> deductibleFactors = new HashMap<>(); // deductibleKey -> factor

    @PostConstruct
    public void init() {
        initInMemoryData();
        tryProvisionDatabase();
    }

    private void initInMemoryData() {
        // 1. Products
        products.put("TECH_EO", new Product("TECH_EO", "Technology Errors & Omissions", "Professional Liability", "Tech consulting, software developers, SaaS"));
        products.put("MED_MAL", new Product("MED_MAL", "Medical Malpractice", "Healthcare Professional Liability", "Physicians, surgical groups, clinics"));
        products.put("DNO", new Product("DNO", "Directors & Officers", "Management Liability", "Corporate governance, executive protection"));

        // 2. Rating Plans
        plans.put("TECH_EO_COMMERCIAL", new RatingPlan("TECH_EO_COMMERCIAL", "TECH_EO", "Standard Commercial Tech E&O", "REVENUE_PER_1K", "Rated on annual gross revenue per $1,000"));
        plans.put("MED_MAL_PRIMARY", new RatingPlan("MED_MAL_PRIMARY", "MED_MAL", "Primary Physician & Clinic Plan", "HEADCOUNT", "Rated on licensed provider headcount by specialty"));
        plans.put("DNO_PRIVATE", new RatingPlan("DNO_PRIVATE", "DNO", "Private Enterprise D&O Plan", "ASSETS_PER_1M", "Rated on total balance sheet assets per $1M"));

        // 3. State Filings & Versions
        // California Tech E&O
        versions.add(new RatePlanVersion(1, "TECH_EO", "TECH_EO_COMMERCIAL", "CA", "2025.1", "CA-2025-0812-EO",
                "ACTIVE", LocalDate.of(2025, 1, 1), LocalDate.of(2025, 3, 1), LocalDate.of(2027, 12, 31),
                new BigDecimal("2500.00"), new BigDecimal("0.25"), new BigDecimal("0.25"), "California DOI Approved Standard Tech E&O Filing"));
        // New York Tech E&O
        versions.add(new RatePlanVersion(2, "TECH_EO", "TECH_EO_COMMERCIAL", "NY", "2025.1", "NY-2025-0443-EO",
                "ACTIVE", LocalDate.of(2025, 1, 1), LocalDate.of(2025, 2, 1), LocalDate.of(2027, 12, 31),
                new BigDecimal("3000.00"), new BigDecimal("0.15"), new BigDecimal("0.15"), "New York DFS Approved Filing (Strict Schedule Credit Cap)"));
        // Texas Tech E&O
        versions.add(new RatePlanVersion(3, "TECH_EO", "TECH_EO_COMMERCIAL", "TX", "2025.1", "TX-2025-1109-EO",
                "ACTIVE", LocalDate.of(2025, 1, 1), LocalDate.of(2025, 1, 1), LocalDate.of(2027, 12, 31),
                new BigDecimal("2000.00"), new BigDecimal("0.30"), new BigDecimal("0.30"), "Texas TDI File and Use Plan"));
        // Florida Tech E&O
        versions.add(new RatePlanVersion(4, "TECH_EO", "TECH_EO_COMMERCIAL", "FL", "2025.1", "FL-2025-0671-EO",
                "ACTIVE", LocalDate.of(2025, 1, 1), LocalDate.of(2025, 1, 1), LocalDate.of(2027, 12, 31),
                new BigDecimal("2500.00"), new BigDecimal("0.20"), new BigDecimal("0.20"), "Florida OIR Standard Plan"));
        // Nationwide Fallback Tech E&O
        versions.add(new RatePlanVersion(5, "TECH_EO", "TECH_EO_COMMERCIAL", "ALL", "2024.2", "US-2024-BASE-EO",
                "ACTIVE", LocalDate.of(2024, 6, 1), LocalDate.of(2024, 6, 1), null,
                new BigDecimal("2000.00"), new BigDecimal("0.25"), new BigDecimal("0.25"), "Nationwide Benchmark ISO Advisory Plan"));

        // Medical Malpractice Filings
        versions.add(new RatePlanVersion(6, "MED_MAL", "MED_MAL_PRIMARY", "CA", "2025.1", "CA-2025-0102-MM",
                "ACTIVE", LocalDate.of(2025, 1, 1), LocalDate.of(2025, 1, 1), null,
                new BigDecimal("5000.00"), new BigDecimal("0.20"), new BigDecimal("0.20"), "California MICRA Compliant Medical Malpractice"));
        versions.add(new RatePlanVersion(7, "MED_MAL", "MED_MAL_PRIMARY", "ALL", "2024.1", "US-2024-BASE-MM",
                "ACTIVE", LocalDate.of(2024, 1, 1), LocalDate.of(2024, 1, 1), null,
                new BigDecimal("4500.00"), new BigDecimal("0.25"), new BigDecimal("0.25"), "Nationwide Baseline MedMal Plan"));

        // D&O Filings
        versions.add(new RatePlanVersion(8, "DNO", "DNO_PRIVATE", "DE", "2025.1", "DE-2025-0044-DO",
                "ACTIVE", LocalDate.of(2025, 1, 1), LocalDate.of(2025, 1, 1), null,
                new BigDecimal("3500.00"), new BigDecimal("0.25"), new BigDecimal("0.25"), "Delaware Corporate Registry D&O Program"));
        versions.add(new RatePlanVersion(9, "DNO", "DNO_PRIVATE", "ALL", "2024.1", "US-2024-BASE-DO",
                "ACTIVE", LocalDate.of(2024, 1, 1), LocalDate.of(2024, 1, 1), null,
                new BigDecimal("3000.00"), new BigDecimal("0.25"), new BigDecimal("0.25"), "Nationwide Baseline D&O Plan"));

        // 4. Base Loss Cost Rates (per exposure unit)
        baseRates.put("TECH_EO:TECH_SAAS", new BigDecimal("1.85")); // $1.85 per $1k revenue
        baseRates.put("TECH_EO:TECH_CONSULT", new BigDecimal("1.45"));
        baseRates.put("TECH_EO:TECH_INFRA", new BigDecimal("2.20"));
        baseRates.put("TECH_EO:DEFAULT", new BigDecimal("1.75"));

        baseRates.put("MED_MAL:SURGERY_GENERAL", new BigDecimal("12500.00")); // per doctor
        baseRates.put("MED_MAL:INTERNAL_MED", new BigDecimal("6800.00"));
        baseRates.put("MED_MAL:PEDIATRICS", new BigDecimal("5200.00"));
        baseRates.put("MED_MAL:DEFAULT", new BigDecimal("7500.00"));

        baseRates.put("DNO:FIN_SERVICES", new BigDecimal("450.00")); // per $1M assets
        baseRates.put("DNO:HEALTHCARE", new BigDecimal("380.00"));
        baseRates.put("DNO:COMMERCIAL", new BigDecimal("290.00"));
        baseRates.put("DNO:DEFAULT", new BigDecimal("320.00"));

        // 5. Territory Factors
        territoryFactors.put("CA:CA_SF", new BigDecimal("1.25"));
        territoryFactors.put("CA:CA_LA", new BigDecimal("1.18"));
        territoryFactors.put("CA:DEFAULT", new BigDecimal("1.10"));
        territoryFactors.put("NY:NY_METRO", new BigDecimal("1.30"));
        territoryFactors.put("NY:DEFAULT", new BigDecimal("1.15"));
        territoryFactors.put("TX:TX_HOUSTON", new BigDecimal("1.08"));
        territoryFactors.put("TX:DEFAULT", new BigDecimal("1.00"));
        territoryFactors.put("FL:DEFAULT", new BigDecimal("1.20"));
        territoryFactors.put("ALL:DEFAULT", new BigDecimal("1.00"));

        // 6. Limit Relativities ($1M base = 1.00)
        limitFactors.put("1000000", new BigDecimal("1.00"));
        limitFactors.put("2000000", new BigDecimal("1.35"));
        limitFactors.put("3000000", new BigDecimal("1.55"));
        limitFactors.put("5000000", new BigDecimal("1.80"));
        limitFactors.put("10000000", new BigDecimal("2.35"));

        // 7. Deductible / Retention Factors ($25k base = 1.00)
        deductibleFactors.put("10000", new BigDecimal("1.10"));
        deductibleFactors.put("25000", new BigDecimal("1.00"));
        deductibleFactors.put("50000", new BigDecimal("0.90"));
        deductibleFactors.put("100000", new BigDecimal("0.82"));
        deductibleFactors.put("250000", new BigDecimal("0.70"));
    }

    private void tryProvisionDatabase() {
        if (jdbcTemplate == null) {
            log.info("JdbcTemplate not available; running with high-performance in-memory rating repository.");
            return;
        }
        try {
            // Provision schema if database is reachable
            jdbcTemplate.execute("""
                IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'RATE_PRODUCT')
                CREATE TABLE RATE_PRODUCT (
                    PRODUCT_CODE VARCHAR(50) PRIMARY KEY,
                    PRODUCT_NAME VARCHAR(100) NOT NULL,
                    LINE_OF_BUSINESS VARCHAR(100) NOT NULL,
                    DESCRIPTION VARCHAR(255) NULL
                );
                
                IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'RATE_PLAN')
                CREATE TABLE RATE_PLAN (
                    PLAN_CODE VARCHAR(50) PRIMARY KEY,
                    PRODUCT_CODE VARCHAR(50) NOT NULL,
                    PLAN_NAME VARCHAR(100) NOT NULL,
                    EXPOSURE_BASIS VARCHAR(50) NOT NULL,
                    DESCRIPTION VARCHAR(255) NULL
                );

                IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'RATE_PLAN_VERSION')
                CREATE TABLE RATE_PLAN_VERSION (
                    VERSION_ID INT IDENTITY(1,1) PRIMARY KEY,
                    PRODUCT_CODE VARCHAR(50) NOT NULL,
                    PLAN_CODE VARCHAR(50) NOT NULL,
                    STATE_CODE VARCHAR(10) NOT NULL,
                    VERSION_NUMBER VARCHAR(20) NOT NULL,
                    SERFF_TRACKING_NBR VARCHAR(50) NULL,
                    FILING_STATUS VARCHAR(30) NOT NULL,
                    NEW_BIZ_EFF_DT DATE NOT NULL,
                    RENEWAL_EFF_DT DATE NOT NULL,
                    EXPIRATION_DT DATE NULL,
                    MIN_PREMIUM DECIMAL(18,2) NOT NULL,
                    MAX_SCHEDULE_DEBIT DECIMAL(5,2) NOT NULL,
                    MAX_SCHEDULE_CREDIT DECIMAL(5,2) NOT NULL,
                    DESCRIPTION VARCHAR(255) NULL
                );
            """);
            log.info("Verified and provisioned SQL Server HELIOS_RATING_DB schema.");
        } catch (Exception ex) {
            log.warn("SQL Server connection deferred ({}). Using initialized in-memory rating matrix.", ex.getMessage());
        }
    }

    public List<Product> getAllProducts() { return new ArrayList<>(products.values()); }
    public List<RatingPlan> getAllPlans() { return new ArrayList<>(plans.values()); }
    public List<RatePlanVersion> getAllVersions() { return new ArrayList<>(versions); }

    public RatePlanVersion findActiveVersion(String productCode, String stateCode, LocalDate effDate, String businessType) {
        String prod = normalizeProductCode(productCode);
        String state = stateCode != null ? stateCode.toUpperCase().trim() : "ALL";
        boolean isRenewal = "RENEWAL".equalsIgnoreCase(businessType);

        // 1. Try exact State match first
        RatePlanVersion match = versions.stream()
                .filter(v -> v.getProductCode().equalsIgnoreCase(prod))
                .filter(v -> v.getStateCode().equalsIgnoreCase(state))
                .filter(v -> "ACTIVE".equalsIgnoreCase(v.getFilingStatus()))
                .filter(v -> {
                    LocalDate start = isRenewal ? v.getRenewalEffectiveDate() : v.getNewBizEffectiveDate();
                    boolean afterStart = !effDate.isBefore(start);
                    boolean beforeEnd = v.getExpirationDate() == null || !effDate.isAfter(v.getExpirationDate());
                    return afterStart && beforeEnd;
                })
                .findFirst()
                .orElse(null);

        if (match != null) return match;

        // 2. Fallback to 'ALL' nationwide approved version
        return versions.stream()
                .filter(v -> v.getProductCode().equalsIgnoreCase(prod))
                .filter(v -> "ALL".equalsIgnoreCase(v.getStateCode()))
                .filter(v -> "ACTIVE".equalsIgnoreCase(v.getFilingStatus()))
                .findFirst()
                .orElse(versions.get(0));
    }

    public BigDecimal getBaseRate(String productCode, String classCode) {
        String prod = normalizeProductCode(productCode);
        String key = prod + ":" + (classCode != null ? classCode.toUpperCase() : "DEFAULT");
        return baseRates.getOrDefault(key, baseRates.getOrDefault(prod + ":DEFAULT", new BigDecimal("1.75")));
    }

    public BigDecimal getTerritoryFactor(String stateCode, String territoryCode) {
        String state = stateCode != null ? stateCode.toUpperCase().trim() : "ALL";
        String key = state + ":" + (territoryCode != null ? territoryCode.toUpperCase() : "DEFAULT");
        return territoryFactors.getOrDefault(key, territoryFactors.getOrDefault(state + ":DEFAULT", new BigDecimal("1.00")));
    }

    public BigDecimal getLimitFactor(Long limit) {
        return limitFactors.getOrDefault(String.valueOf(limit), new BigDecimal("1.00"));
    }

    public BigDecimal getDeductibleFactor(Long retention) {
        return deductibleFactors.getOrDefault(String.valueOf(retention), new BigDecimal("1.00"));
    }

    private String normalizeProductCode(String code) {
        if (code == null) return "TECH_EO";
        String upper = code.toUpperCase();
        if (upper.contains("TECH") || upper.contains("E&O") || upper.contains("EO")) return "TECH_EO";
        if (upper.contains("MED") || upper.contains("MAL")) return "MED_MAL";
        if (upper.contains("D&O") || upper.contains("DNO") || upper.contains("DIRECTOR")) return "DNO";
        return upper;
    }
}
