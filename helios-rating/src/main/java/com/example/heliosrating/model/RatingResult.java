package com.example.heliosrating.model;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

public class RatingResult {
    private String ratingStatus; // RATED, REFERRED, DECLINED
    private String productCode;
    private String planCode;
    private String resolvedFilingVersion;
    private String stateCode;
    private String serffTrackingNumber;
    
    // Rating Breakdown
    private BigDecimal exposureUnits;
    private BigDecimal baseRate;
    private BigDecimal basePremium;
    private BigDecimal territoryFactor;
    private BigDecimal limitRelativityFactor;
    private BigDecimal deductibleFactor;
    private BigDecimal subtotalPremium;
    private BigDecimal scheduleModifier;
    private BigDecimal scheduleAdjustmentAmount;
    private BigDecimal minimumPremium;
    private BigDecimal finalAnnualPremium;

    // Rules & Compliance Outputs
    private List<String> underwritingReferrals = new ArrayList<>();
    private List<String> attachedForms = new ArrayList<>();
    private List<String> calculationTrace = new ArrayList<>();

    public RatingResult() {}

    public String getRatingStatus() { return ratingStatus; }
    public void setRatingStatus(String ratingStatus) { this.ratingStatus = ratingStatus; }

    public String getProductCode() { return productCode; }
    public void setProductCode(String productCode) { this.productCode = productCode; }

    public String getPlanCode() { return planCode; }
    public void setPlanCode(String planCode) { this.planCode = planCode; }

    public String getResolvedFilingVersion() { return resolvedFilingVersion; }
    public void setResolvedFilingVersion(String resolvedFilingVersion) { this.resolvedFilingVersion = resolvedFilingVersion; }

    public String getStateCode() { return stateCode; }
    public void setStateCode(String stateCode) { this.stateCode = stateCode; }

    public String getSerffTrackingNumber() { return serffTrackingNumber; }
    public void setSerffTrackingNumber(String serffTrackingNumber) { this.serffTrackingNumber = serffTrackingNumber; }

    public BigDecimal getExposureUnits() { return exposureUnits; }
    public void setExposureUnits(BigDecimal exposureUnits) { this.exposureUnits = exposureUnits; }

    public BigDecimal getBaseRate() { return baseRate; }
    public void setBaseRate(BigDecimal baseRate) { this.baseRate = baseRate; }

    public BigDecimal getBasePremium() { return basePremium; }
    public void setBasePremium(BigDecimal basePremium) { this.basePremium = basePremium; }

    public BigDecimal getTerritoryFactor() { return territoryFactor; }
    public void setTerritoryFactor(BigDecimal territoryFactor) { this.territoryFactor = territoryFactor; }

    public BigDecimal getLimitRelativityFactor() { return limitRelativityFactor; }
    public void setLimitRelativityFactor(BigDecimal limitRelativityFactor) { this.limitRelativityFactor = limitRelativityFactor; }

    public BigDecimal getDeductibleFactor() { return deductibleFactor; }
    public void setDeductibleFactor(BigDecimal deductibleFactor) { this.deductibleFactor = deductibleFactor; }

    public BigDecimal getSubtotalPremium() { return subtotalPremium; }
    public void setSubtotalPremium(BigDecimal subtotalPremium) { this.subtotalPremium = subtotalPremium; }

    public BigDecimal getScheduleModifier() { return scheduleModifier; }
    public void setScheduleModifier(BigDecimal scheduleModifier) { this.scheduleModifier = scheduleModifier; }

    public BigDecimal getScheduleAdjustmentAmount() { return scheduleAdjustmentAmount; }
    public void setScheduleAdjustmentAmount(BigDecimal scheduleAdjustmentAmount) { this.scheduleAdjustmentAmount = scheduleAdjustmentAmount; }

    public BigDecimal getMinimumPremium() { return minimumPremium; }
    public void setMinimumPremium(BigDecimal minimumPremium) { this.minimumPremium = minimumPremium; }

    public BigDecimal getFinalAnnualPremium() { return finalAnnualPremium; }
    public void setFinalAnnualPremium(BigDecimal finalAnnualPremium) { this.finalAnnualPremium = finalAnnualPremium; }

    public List<String> getUnderwritingReferrals() { return underwritingReferrals; }
    public void setUnderwritingReferrals(List<String> underwritingReferrals) { this.underwritingReferrals = underwritingReferrals; }

    public List<String> getAttachedForms() { return attachedForms; }
    public void setAttachedForms(List<String> attachedForms) { this.attachedForms = attachedForms; }

    public List<String> getCalculationTrace() { return calculationTrace; }
    public void setCalculationTrace(List<String> calculationTrace) { this.calculationTrace = calculationTrace; }
}

