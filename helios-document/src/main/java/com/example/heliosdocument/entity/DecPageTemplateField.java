package com.example.heliosdocument.entity;

import java.time.LocalDateTime;

import com.fasterxml.jackson.annotation.JsonIgnore;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

/**
 * DecPageTemplateField: Child table storing specific <<field_names>>
 * extracted from the ingested DOCX template.
 */
@Entity
@Table(name = "dec_page_template_field")
public class DecPageTemplateField {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "template_id", nullable = false)
    private DecPageTemplate template;

    @Column(name = "field_name", nullable = false, length = 100)
    private String fieldName;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    public DecPageTemplateField() {
        this.createdAt = LocalDateTime.now();
    }

    public DecPageTemplateField(DecPageTemplate template, String fieldName) {
        this();
        this.template = template;
        this.fieldName = fieldName;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public DecPageTemplate getTemplate() {
        return template;
    }

    public void setTemplate(DecPageTemplate template) {
        this.template = template;
    }

    public String getFieldName() {
        return fieldName;
    }

    public void setFieldName(String fieldName) {
        this.fieldName = fieldName;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}

