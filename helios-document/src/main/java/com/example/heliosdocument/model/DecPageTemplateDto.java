package com.example.heliosdocument.model;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonProperty;

public class DecPageTemplateDto {

    private Long id;

    @JsonProperty("form_id")
    private String formId;

    @JsonProperty("form_revision")
    private String formRevision;

    @JsonProperty("form_name")
    private String formName;

    @JsonProperty("effective_date")
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate effectiveDate;

    @JsonProperty("product_id")
    private Integer productId;

    @JsonProperty("file_storage_path")
    private String fileStoragePath;

    @JsonProperty("created_at")
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime createdAt;

    @JsonProperty("updated_at")
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime updatedAt;

    private List<String> fields = new ArrayList<>();

    public DecPageTemplateDto() {}

    public DecPageTemplateDto(Long id, String formId, String formRevision, String formName,
                             LocalDate effectiveDate, Integer productId, String fileStoragePath,
                             LocalDateTime createdAt, LocalDateTime updatedAt, List<String> fields) {
        this.id = id;
        this.formId = formId;
        this.formRevision = formRevision;
        this.formName = formName;
        this.effectiveDate = effectiveDate;
        this.productId = productId;
        this.fileStoragePath = fileStoragePath;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.fields = fields != null ? fields : new ArrayList<>();
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getFormId() {
        return formId;
    }

    public void setFormId(String formId) {
        this.formId = formId;
    }

    public String getFormRevision() {
        return formRevision;
    }

    public void setFormRevision(String formRevision) {
        this.formRevision = formRevision;
    }

    public String getFormName() {
        return formName;
    }

    public void setFormName(String formName) {
        this.formName = formName;
    }

    public LocalDate getEffectiveDate() {
        return effectiveDate;
    }

    public void setEffectiveDate(LocalDate effectiveDate) {
        this.effectiveDate = effectiveDate;
    }

    public Integer getProductId() {
        return productId;
    }

    public void setProductId(Integer productId) {
        this.productId = productId;
    }

    public String getFileStoragePath() {
        return fileStoragePath;
    }

    public void setFileStoragePath(String fileStoragePath) {
        this.fileStoragePath = fileStoragePath;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    public List<String> getFields() {
        return fields;
    }

    public void setFields(List<String> fields) {
        this.fields = fields;
    }
}

