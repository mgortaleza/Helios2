package com.example.heliosdocument.repository;

import java.util.List;
import java.util.Optional;

import com.example.heliosdocument.entity.DecPageTemplate;
import com.example.heliosdocument.entity.DecPageTemplateField;

public interface DecPageTemplateRepository {

    DecPageTemplate save(int tenantId, DecPageTemplate entity);

    Optional<DecPageTemplate> findById(int tenantId, Long id);

    List<DecPageTemplate> findAll(int tenantId);

    List<DecPageTemplate> findByProductId(int tenantId, Integer productId);

    boolean deleteById(int tenantId, Long id);

    List<DecPageTemplateField> findFieldsByTemplateId(int tenantId, Long templateId);
}

