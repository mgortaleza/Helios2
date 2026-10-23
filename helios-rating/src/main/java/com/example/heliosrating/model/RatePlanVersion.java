package com.example.heliosrating.model;

import java.math.BigDecimal;
import java.time.LocalDate;

public class RatePlanVersion {
    private Integer versionId;
    private String productCode;
    private String planCode;
    private String stateCode;
    private String versionNumber;
    private String serffTrackingNumber;
    private String filingStatus; // DRAFT, FILED_PENDING, APPROVED, ACTIVE, SUPERSEDED
    private LocalDate newBizEffectiveDate;
    private LocalDate renewalEffectiveDate;
    private LocalDate expirationDate;
    private BigDecimal minPremium;
    private BigDecimal maxScheduleDebitPct;
    private BigDecimal maxScheduleCreditPct;
    private String description;

    public RatePlanVersion() {}

    public RatePlanVersion(Integer versionId, String productCode, String planCode, String stateCode,
                           String versionNumber, String serffTrackingNumber, String filingStatus,
                           LocalDate newBizEffectiveDate, LocalDate renewalEffectiveDate, LocalDate expirationDate,
                           BigDecimal minPremium, BigDecimal maxScheduleDebitPct, BigDecimal maxScheduleCreditPct,
                           String description) {
        this.versionId = versionId;
        this.productCode = productCode;
        this.planCode = planCode;
        this.stateCode = stateCode;
        this.versionNumber = versionNumber;
        this.serffTrackingNumber = serffTrackingNumber;
        this.filingStatus = filingStatus;
        this.newBizEffectiveDate = newBizEffectiveDate;
        this.renewalEffectiveDate = renewalEffectiveDate;
        this.expirationDate = expirationDate;
        this.minPremium = minPremium;
        this.maxScheduleDebitPct = maxScheduleDebitPct;
        this.maxScheduleCreditPct = maxScheduleCreditPct;
        this.description = description;
    }

    public Integer getVersionId() { return versionId; }
    public void setVersionId(Integer versionId) { this.versionId = versionId; }

    public String getProductCode() { return productCode; }
    public void setProductCode(String productCode) { this.productCode = productCode; }

    public String getPlanCode() { return planCode; }
    public void setPlanCode(String planCode) { this.planCode = planCode; }

    public String getStateCode() { return stateCode; }
    public void setStateCode(String stateCode) { this.stateCode = stateCode; }

    public String getVersionNumber() { return versionNumber; }
    public void setVersionNumber(String versionNumber) { this.versionNumber = versionNumber; }

    public String getSerffTrackingNumber() { return serffTrackingNumber; }
    public void setSerffTrackingNumber(String serffTrackingNumber) { this.serffTrackingNumber = serffTrackingNumber; }

    public String getFilingStatus() { return filingStatus; }
    public void setFilingStatus(String filingStatus) { this.filingStatus = filingStatus; }

    public LocalDate getNewBizEffectiveDate() { return newBizEffectiveDate; }
    public void setNewBizEffectiveDate(LocalDate newBizEffectiveDate) { this.newBizEffectiveDate = newBizEffectiveDate; }

    public LocalDate getRenewalEffectiveDate() { return renewalEffectiveDate; }
    public void setRenewalEffectiveDate(LocalDate renewalEffectiveDate) { this.renewalEffectiveDate = renewalEffectiveDate; }

    public LocalDate getExpirationDate() { return expirationDate; }
    public void setExpirationDate(LocalDate expirationDate) { this.expirationDate = expirationDate; }

    public BigDecimal getMinPremium() { return minPremium; }
    public void setMinPremium(BigDecimal minPremium) { this.minPremium = minPremium; }

    public BigDecimal getMaxScheduleDebitPct() { return maxScheduleDebitPct; }
    public void setMaxScheduleDebitPct(BigDecimal maxScheduleDebitPct) { this.maxScheduleDebitPct = maxScheduleDebitPct; }

    public BigDecimal getMaxScheduleCreditPct() { return maxScheduleCreditPct; }
    public void setMaxScheduleCreditPct(BigDecimal maxScheduleCreditPct) { this.maxScheduleCreditPct = maxScheduleCreditPct; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
}
