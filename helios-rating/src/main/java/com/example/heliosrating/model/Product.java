package com.example.heliosrating.model;

public class Product {
    private String productCode;
    private String productName;
    private String lineOfBusiness;
    private String description;

    public Product() {}
    public Product(String productCode, String productName, String lineOfBusiness, String description) {
        this.productCode = productCode;
        this.productName = productName;
        this.lineOfBusiness = lineOfBusiness;
        this.description = description;
    }

    public String getProductCode() { return productCode; }
    public void setProductCode(String productCode) { this.productCode = productCode; }

    public String getProductName() { return productName; }
    public void setProductName(String productName) { this.productName = productName; }

    public String getLineOfBusiness() { return lineOfBusiness; }
    public void setLineOfBusiness(String lineOfBusiness) { this.lineOfBusiness = lineOfBusiness; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
}

