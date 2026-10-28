package com.example.heliosdocument.entity;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;

/**
 * DecPageTemplate: Stores metadata and physical disk storage path for
 * dynamic Word (.docx) Declaration Page templates.
 */
@Entity
@Table(name = "dec_page_template")
public class DecPageTemplate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "form_id", nullable = false, length = 50)
    private String formId;

    @Column(name = "form_revision", nullable = false, length = 20)
    private String formRevision;

    @Column(name = "form_name", nullable = false, length = 255)
    private String formName;

    @Column(name = "effective_date", nullable = false)
    private LocalDate effectiveDate;

    @Column(name = "product_id", nullable = false)
    private Integer productId;

    @Column(name = "file_storage_path", nullable = false, length = 500)
    private String fileStoragePath;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "template", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    private List<DecPageTemplateField> fields = new ArrayList<>();

    public DecPageTemplate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    public DecPageTemplate(String formId, String formRevision, String formName,
                           LocalDate effectiveDate, Integer productId, String fileStoragePath) {
        this();
        this.formId = formId;
        this.formRevision = formRevision;
        this.formName = formName;
        this.effectiveDate = effectiveDate;
        this.productId = productId;
        this.fileStoragePath = fileStoragePath;
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

    public List<DecPageTemplateField> getFields() {
        return fields;
    }

    public void setFields(List<DecPageTemplateField> fields) {
        this.fields = fields;
    }

    public void addField(String fieldName) {
        DecPageTemplateField field = new DecPageTemplateField(this, fieldName);
        this.fields.add(field);
    }

    public void addField(DecPageTemplateField field) {
        field.setTemplate(this);
        this.fields.add(field);
    }
}

