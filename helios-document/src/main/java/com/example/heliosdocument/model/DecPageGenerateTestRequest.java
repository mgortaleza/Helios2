package com.example.heliosdocument.model;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import com.fasterxml.jackson.annotation.JsonProperty;

public class DecPageGenerateTestRequest {

    @JsonProperty("fieldValues")
    private Map<String, Object> fieldValues = new LinkedHashMap<>();

    @JsonProperty("coverages")
    private List<Map<String, Object>> coverages = new ArrayList<>();

    public DecPageGenerateTestRequest() {}

    public Map<String, Object> getFieldValues() {
        return fieldValues;
    }

    public void setFieldValues(Map<String, Object> fieldValues) {
        this.fieldValues = fieldValues != null ? fieldValues : new LinkedHashMap<>();
    }

    public List<Map<String, Object>> getCoverages() {
        return coverages;
    }

    public void setCoverages(List<Map<String, Object>> coverages) {
        this.coverages = coverages != null ? coverages : new ArrayList<>();
    }
}

