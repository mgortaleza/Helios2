package com.example.heliosrating.model;

public class RatingPlan {
    private String planCode;
    private String productCode;
    private String planName;
    private String exposureBasis; // REVENUE_PER_1K, HEADCOUNT, ASSETS_PER_1M
    private String description;

    public RatingPlan() {}
    public RatingPlan(String planCode, String productCode, String planName, String exposureBasis, String description) {
        this.planCode = planCode;
        this.productCode = productCode;
        this.planName = planName;
        this.exposureBasis = exposureBasis;
        this.description = description;
    }

    public String getPlanCode() { return planCode; }
    public void setPlanCode(String planCode) { this.planCode = planCode; }

    public String getProductCode() { return productCode; }
    public void setProductCode(String productCode) { this.productCode = productCode; }

    public String getPlanName() { return planName; }
    public void setPlanName(String planName) { this.planName = planName; }

    public String getExposureBasis() { return exposureBasis; }
    public void setExposureBasis(String exposureBasis) { this.exposureBasis = exposureBasis; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
}

