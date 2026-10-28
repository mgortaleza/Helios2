package com.example.heliosdocument.model;

import java.time.LocalDateTime;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonProperty;

public class DecPageTemplateFieldDto {

    private Long id;

    @JsonProperty("template_id")
    private Long templateId;

    @JsonProperty("field_name")
    private String fieldName;

    @JsonProperty("created_at")
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime createdAt;

    public DecPageTemplateFieldDto() {}

    public DecPageTemplateFieldDto(Long id, Long templateId, String fieldName, LocalDateTime createdAt) {
        this.id = id;
        this.templateId = templateId;
        this.fieldName = fieldName;
        this.createdAt = createdAt;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getTemplateId() {
        return templateId;
    }

    public void setTemplateId(Long templateId) {
        this.templateId = templateId;
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

