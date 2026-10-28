package com.example.heliosdocument.repository;

import java.sql.Date;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

import com.example.heliosdocument.entity.DecPageTemplate;
import com.example.heliosdocument.entity.DecPageTemplateField;
import com.example.heliosdocument.service.DocumentService;

@Repository
public class JdbcDecPageTemplateRepository implements DecPageTemplateRepository {

    private static final Logger log = LoggerFactory.getLogger(JdbcDecPageTemplateRepository.class);

    private final DocumentService documentService;

    public JdbcDecPageTemplateRepository(DocumentService documentService) {
        this.documentService = documentService;
    }

    private JdbcTemplate getJdbc(int tenantId) {
        return documentService.getTenantJdbcTemplate(tenantId);
    }

    private final RowMapper<DecPageTemplate> templateRowMapper = (rs, rowNum) -> {
        DecPageTemplate t = new DecPageTemplate();
        t.setId(rs.getLong("id"));
        t.setFormId(rs.getString("form_id"));
        t.setFormRevision(rs.getString("form_revision"));
        t.setFormName(rs.getString("form_name"));
        Date effDate = rs.getDate("effective_date");
        if (effDate != null) {
            t.setEffectiveDate(effDate.toLocalDate());
        }
        t.setProductId(rs.getInt("product_id"));
        t.setFileStoragePath(rs.getString("file_storage_path"));
        Timestamp cat = rs.getTimestamp("created_at");
        if (cat != null) {
            t.setCreatedAt(cat.toLocalDateTime());
        }
        Timestamp uat = rs.getTimestamp("updated_at");
        if (uat != null) {
            t.setUpdatedAt(uat.toLocalDateTime());
        }
        return t;
    };

    private final RowMapper<DecPageTemplateField> fieldRowMapper = (rs, rowNum) -> {
        DecPageTemplateField f = new DecPageTemplateField();
        f.setId(rs.getLong("id"));
        f.setFieldName(rs.getString("field_name"));
        Timestamp cat = rs.getTimestamp("created_at");
        if (cat != null) {
            f.setCreatedAt(cat.toLocalDateTime());
        }
        return f;
    };

    @Override
    public DecPageTemplate save(int tenantId, DecPageTemplate entity) {
        JdbcTemplate jdbc = getJdbc(tenantId);
        LocalDateTime now = LocalDateTime.now();

        if (entity.getId() == null) {
            // INSERT
            entity.setCreatedAt(now);
            entity.setUpdatedAt(now);

            String insertSql = """
                INSERT INTO dbo.dec_page_template (
                    form_id, form_revision, form_name, effective_date, product_id, file_storage_path, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """;

            KeyHolder keyHolder = new GeneratedKeyHolder();
            jdbc.update(connection -> {
                PreparedStatement ps = connection.prepareStatement(insertSql, Statement.RETURN_GENERATED_KEYS);
                ps.setString(1, entity.getFormId());
                ps.setString(2, entity.getFormRevision());
                ps.setString(3, entity.getFormName());
                ps.setDate(4, Date.valueOf(entity.getEffectiveDate()));
                ps.setInt(5, entity.getProductId());
                ps.setString(6, entity.getFileStoragePath());
                ps.setTimestamp(7, Timestamp.valueOf(entity.getCreatedAt()));
                ps.setTimestamp(8, Timestamp.valueOf(entity.getUpdatedAt()));
                return ps;
            }, keyHolder);

            Number generatedId = keyHolder.getKey();
            if (generatedId != null) {
                entity.setId(generatedId.longValue());
            }

            // Save child fields
            if (entity.getFields() != null && !entity.getFields().isEmpty()) {
                String insertFieldSql = """
                    INSERT INTO dbo.dec_page_template_field (template_id, field_name, created_at)
                    VALUES (?, ?, ?)
                """;
                List<Object[]> batchArgs = new ArrayList<>();
                for (DecPageTemplateField field : entity.getFields()) {
                    field.setTemplate(entity);
                    field.setCreatedAt(now);
                    batchArgs.add(new Object[]{
                        entity.getId(),
                        field.getFieldName(),
                        Timestamp.valueOf(field.getCreatedAt())
                    });
                }
                jdbc.batchUpdate(insertFieldSql, batchArgs);
            }

            log.info("Saved DecPageTemplate #{} (Form: {} Rev: {}) with {} fields for tenant #{}",
                    entity.getId(), entity.getFormId(), entity.getFormRevision(),
                    entity.getFields() != null ? entity.getFields().size() : 0, tenantId);
        } else {
            // UPDATE
            entity.setUpdatedAt(now);
            String updateSql = """
                UPDATE dbo.dec_page_template SET
                    form_id = ?,
                    form_revision = ?,
                    form_name = ?,
                    effective_date = ?,
                    product_id = ?,
                    file_storage_path = ?,
                    updated_at = ?
                WHERE id = ?
            """;
            jdbc.update(updateSql,
                    entity.getFormId(),
                    entity.getFormRevision(),
                    entity.getFormName(),
                    Date.valueOf(entity.getEffectiveDate()),
                    entity.getProductId(),
                    entity.getFileStoragePath(),
                    Timestamp.valueOf(entity.getUpdatedAt()),
                    entity.getId());
        }

        return entity;
    }

    @Override
    public Optional<DecPageTemplate> findById(int tenantId, Long id) {
        JdbcTemplate jdbc = getJdbc(tenantId);
        String sql = "SELECT * FROM dbo.dec_page_template WHERE id = ?";
        List<DecPageTemplate> list = jdbc.query(sql, templateRowMapper, id);
        if (list.isEmpty()) {
            return Optional.empty();
        }
        DecPageTemplate template = list.get(0);
        template.setFields(findFieldsByTemplateId(tenantId, id));
        return Optional.of(template);
    }

    @Override
    public List<DecPageTemplate> findAll(int tenantId) {
        JdbcTemplate jdbc = getJdbc(tenantId);
        String sql = "SELECT * FROM dbo.dec_page_template ORDER BY effective_date DESC, id DESC";
        List<DecPageTemplate> list = jdbc.query(sql, templateRowMapper);
        for (DecPageTemplate template : list) {
            template.setFields(findFieldsByTemplateId(tenantId, template.getId()));
        }
        return list;
    }

    @Override
    public List<DecPageTemplate> findByProductId(int tenantId, Integer productId) {
        JdbcTemplate jdbc = getJdbc(tenantId);
        String sql = "SELECT * FROM dbo.dec_page_template WHERE product_id = ? ORDER BY effective_date DESC";
        List<DecPageTemplate> list = jdbc.query(sql, templateRowMapper, productId);
        for (DecPageTemplate template : list) {
            template.setFields(findFieldsByTemplateId(tenantId, template.getId()));
        }
        return list;
    }

    @Override
    public boolean deleteById(int tenantId, Long id) {
        JdbcTemplate jdbc = getJdbc(tenantId);
        // Cascade delete child fields first (or rely on SQL ON DELETE CASCADE)
        jdbc.update("DELETE FROM dbo.dec_page_template_field WHERE template_id = ?", id);
        int rows = jdbc.update("DELETE FROM dbo.dec_page_template WHERE id = ?", id);
        return rows > 0;
    }

    @Override
    public List<DecPageTemplateField> findFieldsByTemplateId(int tenantId, Long templateId) {
        JdbcTemplate jdbc = getJdbc(tenantId);
        String sql = "SELECT * FROM dbo.dec_page_template_field WHERE template_id = ? ORDER BY id ASC";
        return jdbc.query(sql, fieldRowMapper, templateId);
    }
}

