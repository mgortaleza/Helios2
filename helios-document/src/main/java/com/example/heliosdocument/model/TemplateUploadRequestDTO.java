package com.example.heliosdocument.model;

import org.springframework.web.multipart.MultipartFile;

public class TemplateUploadRequestDTO {
    private MultipartFile file;
    private String mode; // "NEW_ENDORSEMENT" vs "EXISTING_ENDORSEMENT"
    private String endorsementId;
    private String endorsementCode;
    private String endorsementName;
    private String description;
    private String lineOfBusiness;
    private String editionDate;
    private String effectiveDate;
    private String expirationDate;
    private String outputFormat; // "PDF" or "DOCX"
    private String templateName;

    public TemplateUploadRequestDTO() {
        this.outputFormat = "PDF";
        this.mode = "NEW_ENDORSEMENT";
    }

    public MultipartFile getFile() {
        return file;
    }

    public void setFile(MultipartFile file) {
        this.file = file;
    }

    public String getMode() {
        return mode;
    }

    public void setMode(String mode) {
        this.mode = mode;
    }

    public String getEndorsementId() {
        return endorsementId;
    }

    public void setEndorsementId(String endorsementId) {
        this.endorsementId = endorsementId;
    }

    public String getEndorsementCode() {
        return endorsementCode;
    }

    public void setEndorsementCode(String endorsementCode) {
        this.endorsementCode = endorsementCode;
    }

    public String getEndorsementName() {
        return endorsementName;
    }

    public void setEndorsementName(String endorsementName) {
        this.endorsementName = endorsementName;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getLineOfBusiness() {
        return lineOfBusiness;
    }

    public void setLineOfBusiness(String lineOfBusiness) {
        this.lineOfBusiness = lineOfBusiness;
    }

    public String getEditionDate() {
        return editionDate;
    }

    public void setEditionDate(String editionDate) {
        this.editionDate = editionDate;
    }

    public String getEffectiveDate() {
        return effectiveDate;
    }

    public void setEffectiveDate(String effectiveDate) {
        this.effectiveDate = effectiveDate;
    }

    public String getExpirationDate() {
        return expirationDate;
    }

    public void setExpirationDate(String expirationDate) {
        this.expirationDate = expirationDate;
    }

    public String getOutputFormat() {
        return outputFormat;
    }

    public void setOutputFormat(String outputFormat) {
        this.outputFormat = outputFormat;
    }

    public String getTemplateName() {
        return templateName;
    }

    public void setTemplateName(String templateName) {
        this.templateName = templateName;
    }
}

