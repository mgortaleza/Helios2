package com.example.heliosrating.model;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;

public class RatingRequest {
    private Integer tenantId;
    private String productCode;       // e.g. TECH_EO, MED_MAL, DNO
    private String planCode;          // optional: e.g. STANDARD_COMMERCIAL
    private String stateCode;         // e.g. CA, NY, TX, FL
    private LocalDate effectiveDate;  // e.g. 2026-07-01
    private String businessType;      // NEW or RENEWAL
    private BigDecimal exposureValue; // Revenue, Physician Count, Assets
    private String classCode;         // e.g. TECH_SAAS, SURGERY_GENERAL, FIN_MGMT
    private String territoryCode;     // e.g. CA_SF, NY_METRO, TX_HOUSTON
    private Long occurrenceLimit;     // e.g. 5000000 ($5M)
    private Long aggregateLimit;      // e.g. 5000000 ($5M)
    private Long retentionAmount;     // e.g. 50000 ($50k)
    private BigDecimal scheduleMod;   // e.g. 0.95 (5% credit), default 1.00
    private Map<String, Object> riskAnswers; // custom underwriting questionnaire answers

    public RatingRequest() {}

    public Integer getTenantId() { return tenantId != null ? tenantId : 1; }
    public void setTenantId(Integer tenantId) { this.tenantId = tenantId; }

    public String getProductCode() { return productCode; }
    public void setProductCode(String productCode) { this.productCode = productCode; }

    public String getPlanCode() { return planCode; }
    public void setPlanCode(String planCode) { this.planCode = planCode; }

    public String getStateCode() { return stateCode != null ? stateCode.toUpperCase().trim() : "ALL"; }
    public void setStateCode(String stateCode) { this.stateCode = stateCode; }

    public LocalDate getEffectiveDate() { return effectiveDate != null ? effectiveDate : LocalDate.now(); }
    public void setEffectiveDate(LocalDate effectiveDate) { this.effectiveDate = effectiveDate; }

    public String getBusinessType() { return businessType != null ? businessType.toUpperCase().trim() : "NEW"; }
    public void setBusinessType(String businessType) { this.businessType = businessType; }

    public BigDecimal getExposureValue() { return exposureValue != null ? exposureValue : BigDecimal.ZERO; }
    public void setExposureValue(BigDecimal exposureValue) { this.exposureValue = exposureValue; }

    public String getClassCode() { return classCode; }
    public void setClassCode(String classCode) { this.classCode = classCode; }

    public String getTerritoryCode() { return territoryCode; }
    public void setTerritoryCode(String territoryCode) { this.territoryCode = territoryCode; }

    public Long getOccurrenceLimit() { return occurrenceLimit != null ? occurrenceLimit : 1000000L; }
    public void setOccurrenceLimit(Long occurrenceLimit) { this.occurrenceLimit = occurrenceLimit; }

    public Long getAggregateLimit() { return aggregateLimit != null ? aggregateLimit : 1000000L; }
    public void setAggregateLimit(Long aggregateLimit) { this.aggregateLimit = aggregateLimit; }

    public Long getRetentionAmount() { return retentionAmount != null ? retentionAmount : 25000L; }
    public void setRetentionAmount(Long retentionAmount) { this.retentionAmount = retentionAmount; }

    public BigDecimal getScheduleMod() { return scheduleMod != null ? scheduleMod : BigDecimal.ONE; }
    public void setScheduleMod(BigDecimal scheduleMod) { this.scheduleMod = scheduleMod; }

    public Map<String, Object> getRiskAnswers() { return riskAnswers; }
    public void setRiskAnswers(Map<String, Object> riskAnswers) { this.riskAnswers = riskAnswers; }
}

