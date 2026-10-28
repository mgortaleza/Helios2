package com.example.heliosdocument.service;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardOpenOption;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.aspose.words.Cell;
import com.aspose.words.Document;
import com.aspose.words.FindReplaceDirection;
import com.aspose.words.FindReplaceOptions;
import com.aspose.words.IReplacingCallback;
import com.aspose.words.NodeType;
import com.aspose.words.Paragraph;
import com.aspose.words.ReplaceAction;
import com.aspose.words.ReplacingArgs;
import com.aspose.words.Row;
import com.aspose.words.SaveFormat;
import com.aspose.words.Table;
import com.example.heliosdocument.entity.DecPageTemplate;
import com.example.heliosdocument.entity.DecPageTemplateField;
import com.example.heliosdocument.model.DecPageGenerateTestRequest;
import com.example.heliosdocument.model.DecPageTemplateDto;
import com.example.heliosdocument.model.DecPageTemplateFieldDto;
import com.example.heliosdocument.repository.DecPageTemplateRepository;

@Service
public class DecPageTemplateService {

    private static final Logger log = LoggerFactory.getLogger(DecPageTemplateService.class);

    private static final Pattern TAG_PATTERN = Pattern.compile("<<([^>>]+)>>");

    private final DecPageTemplateRepository repository;

    @Value("${helios.decpage.storage.path:}")
    private String configuredStoragePath;

    public DecPageTemplateService(DecPageTemplateRepository repository) {
        this.repository = repository;
    }

    /**
     * Resolves the physical base directory for storing ingested Word templates.
     */
    public Path resolveStorageDirectory() {
        if (configuredStoragePath != null && !configuredStoragePath.isBlank()) {
            return Paths.get(configuredStoragePath);
        }

        boolean isWindows = System.getProperty("os.name", "").toLowerCase().contains("win");
        if (isWindows) {
            Path winPath = Paths.get("C:/helios-storage/templates/dec-pages");
            try {
                Files.createDirectories(winPath);
                return winPath;
            } catch (Exception e) {
                return Paths.get(System.getProperty("user.home"), "helios-storage", "templates", "dec-pages");
            }
        } else {
            Path unixPath = Paths.get("/mnt/data/templates");
            try {
                Files.createDirectories(unixPath);
                return unixPath;
            } catch (Exception e) {
                return Paths.get("/tmp/helios-templates/dec-pages");
            }
        }
    }

    /**
     * Ingest Word (.docx) Declaration Page template:
     * - Scans DOCX stream using Aspose.Words and an IReplacingCallback.
     * - Detects and extracts all text inside << >> brackets.
     * - Saves physical DOCX to local disk and records path.
     * - Saves extracted field names into dec_page_template_field table linked to parent template.
     */
    public DecPageTemplateDto ingestTemplate(
            int tenantId,
            MultipartFile file,
            String formId,
            String formRevision,
            String formName,
            LocalDate effectiveDate,
            Integer productId
    ) throws Exception {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Template file cannot be empty.");
        }
        if (formId == null || formId.isBlank()) {
            throw new IllegalArgumentException("form_id is required.");
        }
        if (formRevision == null || formRevision.isBlank()) {
            throw new IllegalArgumentException("form_revision is required.");
        }
        if (formName == null || formName.isBlank()) {
            throw new IllegalArgumentException("form_name is required.");
        }
        if (effectiveDate == null) {
            effectiveDate = LocalDate.now();
        }
        if (productId == null) {
            productId = 1;
        }

        log.info("Ingesting Dec Page Template: formId={}, revision={}, product={}, tenant={}",
                formId, formRevision, productId, tenantId);

        byte[] docBytes = file.getBytes();
        Document doc;
        try (InputStream in = file.getInputStream()) {
            doc = new Document(in);
        }

        Set<String> extractedFieldNames = new LinkedHashSet<>();
        FindReplaceOptions scanOptions = new FindReplaceOptions();
        scanOptions.setReplacingCallback(new IReplacingCallback() {
            @Override
            public int replacing(ReplacingArgs args) {
                String match = args.getMatch().group();
                if (match.startsWith("<<") && match.endsWith(">>") && match.length() > 4) {
                    String cleanTag = match.substring(2, match.length() - 2).trim();
                    if (!cleanTag.isEmpty()) {
                        extractedFieldNames.add(cleanTag);
                    }
                }
                return ReplaceAction.SKIP;
            }
        });
        doc.getRange().replace(TAG_PATTERN, "", scanOptions);

        // Secondary pass across Paragraph and Table cell text to ensure complete sequential extraction
        for (Paragraph p : (Iterable<Paragraph>) doc.getChildNodes(NodeType.PARAGRAPH, true)) {
            String text = p.getText();
            if (text != null && text.contains("<<") && text.contains(">>")) {
                Matcher m = TAG_PATTERN.matcher(text);
                while (m.find()) {
                    String tag = m.group(1).trim();
                    if (!tag.isEmpty()) {
                        extractedFieldNames.add(tag);
                    }
                }
            }
        }

        log.info("Extracted {} unique template fields: {}", extractedFieldNames.size(), extractedFieldNames);

        Path storageDir = resolveStorageDirectory();
        Files.createDirectories(storageDir);

        String sanitizedFormId = formId.replaceAll("[^a-zA-Z0-9-_]", "_");
        String sanitizedRev = formRevision.replaceAll("[^a-zA-Z0-9-_]", "_");
        String storedFileName = String.format("%s_%s_%s.docx", sanitizedFormId, sanitizedRev, UUID.randomUUID().toString().substring(0, 8));
        Path destinationPath = storageDir.resolve(storedFileName);

        Files.write(destinationPath, docBytes, StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING);
        String fileStoragePath = destinationPath.toAbsolutePath().toString();
        log.info("Persisted physical template DOCX to: {}", fileStoragePath);

        DecPageTemplate template = new DecPageTemplate();
        template.setFormId(formId.trim());
        template.setFormRevision(formRevision.trim());
        template.setFormName(formName.trim());
        template.setEffectiveDate(effectiveDate);
        template.setProductId(productId);
        template.setFileStoragePath(fileStoragePath);

        for (String fieldName : extractedFieldNames) {
            template.addField(fieldName);
        }

        DecPageTemplate saved = repository.save(tenantId, template);

        return mapToDto(saved);
    }

    private final Map<String, GeneratedDocResult> lastGeneratedTestCache = new java.util.concurrent.ConcurrentHashMap<>();

    public GeneratedDocResult getOrGenerateTestDecPage(int tenantId, Long templateId) throws Exception {
        String cacheKey = tenantId + ":" + templateId;
        GeneratedDocResult cached = lastGeneratedTestCache.get(cacheKey);
        if (cached != null) {
            return cached;
        }
        return generateTestDecPage(tenantId, templateId, new DecPageGenerateTestRequest());
    }

    /**
     * Generation Engine:
     * - Populates coverages supporting both:
     *   A) Multi-row numbered slots (e.g. <<Coverage_1_Name>>, <<Coverage_2_Name>>...)
     *   B) Dynamic 2nd row DOM tabular cloning (e.g. <<Coverage_Name>>, <<Coverage_Limit>>...)
     * - Populates standard forms schedule tags (<<Form_1_Number>>, etc.)
     * - Performs standard string replacement for all flat fields.
     * - Fills standard policy metadata defaults for clean rendering.
     * - Generates and returns a pristine PDF document (SaveFormat.PDF).
     */
    public GeneratedDocResult generateTestDecPage(
            int tenantId,
            Long templateId,
            DecPageGenerateTestRequest request
    ) throws Exception {
        Optional<DecPageTemplate> opt = repository.findById(tenantId, templateId);
        if (opt.isEmpty()) {
            throw new IllegalArgumentException("Dec Page Template #" + templateId + " not found for tenant #" + tenantId);
        }
        DecPageTemplate template = opt.get();

        File templateFile = new File(template.getFileStoragePath());
        if (!templateFile.exists()) {
            throw new IllegalStateException("Physical template file not found on disk at: " + template.getFileStoragePath());
        }

        Document doc;
        try (FileInputStream fis = new FileInputStream(templateFile)) {
            doc = new Document(fis);
        }

        Map<String, Object> fieldValues = request != null && request.getFieldValues() != null
                ? new LinkedHashMap<>(request.getFieldValues())
                : new LinkedHashMap<>();

        List<Map<String, Object>> coverages = request != null && request.getCoverages() != null && !request.getCoverages().isEmpty()
                ? request.getCoverages()
                : generateDefaultMockCoverages();

        log.info("Generating test Dec Page PDF for Template #{} with {} flat fields and {} coverage rows",
                templateId, fieldValues.size(), coverages.size());

        // ---------------------------------------------------------------------
        // 1. VARIABLE COVERAGE TABLE HANDLING
        // ---------------------------------------------------------------------

        // Pattern A: Numbered Coverage Slots (<<Coverage_1_Name>>, <<Coverage_1_Limit>>, etc.)
        for (int i = 0; i < 25; i++) {
            int slot = i + 1;
            String slotNameTag = "<<Coverage_" + slot + "_Name>>";
            String slotLimitTag = "<<Coverage_" + slot + "_Limit>>";
            String slotDedTag = "<<Coverage_" + slot + "_Deductible>>";
            String slotPremTag = "<<Coverage_" + slot + "_Premium>>";
            String slotTagPrefix = "<<Coverage_" + slot + "_";

            if (i < coverages.size()) {
                Map<String, Object> cov = coverages.get(i);
                String name = getFieldVal(cov, fieldValues, "Coverage_" + slot + "_Name", "Coverage_Name", "name");
                String limit = getFieldVal(cov, fieldValues, "Coverage_" + slot + "_Limit", "Coverage_Limit", "limit");
                String ded = getFieldVal(cov, fieldValues, "Coverage_" + slot + "_Deductible", "Coverage_Deductible", "deductible");
                String prem = getFieldVal(cov, fieldValues, "Coverage_" + slot + "_Premium", "Coverage_Premium", "premium");

                // If all fields for this slot are blank, remove the table row so no blank line is generated
                if (name.isBlank() && limit.isBlank() && ded.isBlank() && prem.isBlank()) {
                    boolean removed = removeTableRowContainingTag(doc, slotTagPrefix);
                    if (!removed) {
                        doc.getRange().replace(slotNameTag, "", new FindReplaceOptions());
                        doc.getRange().replace(slotLimitTag, "", new FindReplaceOptions());
                        doc.getRange().replace(slotDedTag, "", new FindReplaceOptions());
                        doc.getRange().replace(slotPremTag, "", new FindReplaceOptions());
                    }
                } else {
                    doc.getRange().replace(slotNameTag, name, new FindReplaceOptions());
                    doc.getRange().replace(slotLimitTag, limit, new FindReplaceOptions());
                    doc.getRange().replace(slotDedTag, ded, new FindReplaceOptions());
                    doc.getRange().replace(slotPremTag, prem, new FindReplaceOptions());
                }
            } else {
                // Slot is beyond provided coverages count:
                // If row is in a table, REMOVE the entire table row to prevent generating blank lines
                boolean removed = removeTableRowContainingTag(doc, slotTagPrefix);
                if (!removed) {
                    doc.getRange().replace(slotNameTag, "", new FindReplaceOptions());
                    doc.getRange().replace(slotLimitTag, "", new FindReplaceOptions());
                    doc.getRange().replace(slotDedTag, "", new FindReplaceOptions());
                    doc.getRange().replace(slotPremTag, "", new FindReplaceOptions());
                }
            }
        }

        // Pattern B: Dynamic DOM Row Cloning (where row 1 is a single template row with unnumbered tags)
        Table coverageTable = null;
        Row templateRow = null;

        for (Table table : (Iterable<Table>) doc.getChildNodes(NodeType.TABLE, true)) {
            if (table.getRows().getCount() >= 2) {
                for (int r = 1; r < table.getRows().getCount(); r++) {
                    Row candidateRow = table.getRows().get(r);
                    String rowText = candidateRow.getText();
                    if (rowText.contains("<<Coverage_Name>>") || rowText.contains("<<Coverage_Limit>>") ||
                        (rowText.contains("<<Coverage_") && !rowText.contains("<<Coverage_1_"))) {
                        coverageTable = table;
                        templateRow = candidateRow;
                        break;
                    }
                }
            }
            if (coverageTable != null) break;
        }

        if (coverageTable != null && templateRow != null) {
            log.info("Found dynamic coverage template row. Performing DOM tabular row cloning for {} coverages...", coverages.size());
            for (Map<String, Object> covRow : coverages) {
                Row clonedRow = (Row) templateRow.deepClone(true);
                for (Map.Entry<String, Object> entry : covRow.entrySet()) {
                    String tag = "<<" + entry.getKey() + ">>";
                    String value = entry.getValue() != null ? String.valueOf(entry.getValue()) : "";
                    clonedRow.getRange().replace(tag, value, new FindReplaceOptions(FindReplaceDirection.FORWARD));
                }
                clonedRow.getRange().replace(TAG_PATTERN, "", new FindReplaceOptions());
                coverageTable.appendChild(clonedRow);
            }
            templateRow.remove();
        }

        // ---------------------------------------------------------------------
        // 2. FORMS & ENDORSEMENTS SCHEDULE TAGS
        // ---------------------------------------------------------------------
        List<Map<String, String>> defaultForms = List.of(
                Map.of("num", "IL 00 17", "ed", "11/98", "name", "Common Policy Conditions"),
                Map.of("num", "CP 00 10", "ed", "10/12", "name", "Building and Personal Property Coverage Form"),
                Map.of("num", "CP 00 30", "ed", "10/12", "name", "Business Income and Extra Expense Coverage Form"),
                Map.of("num", "CG 00 01", "ed", "04/13", "name", "Commercial General Liability Coverage Form"),
                Map.of("num", "IL 00 21", "ed", "09/08", "name", "Nuclear Energy Liability Exclusion Endorsement")
        );
        for (int i = 0; i < defaultForms.size(); i++) {
            int slot = i + 1;
            Map<String, String> f = defaultForms.get(i);
            String fNum = fieldValues.containsKey("Form_" + slot + "_Number") ? String.valueOf(fieldValues.get("Form_" + slot + "_Number")) : f.get("num");
            String fEd = fieldValues.containsKey("Form_" + slot + "_Edition") ? String.valueOf(fieldValues.get("Form_" + slot + "_Edition")) : f.get("ed");
            String fName = fieldValues.containsKey("Form_" + slot + "_Name") ? String.valueOf(fieldValues.get("Form_" + slot + "_Name")) : f.get("name");

            doc.getRange().replace("<<Form_" + slot + "_Number>>", fNum, new FindReplaceOptions());
            doc.getRange().replace("<<Form_" + slot + "_Edition>>", fEd, new FindReplaceOptions());
            doc.getRange().replace("<<Form_" + slot + "_Name>>", fName, new FindReplaceOptions());
        }

        // ---------------------------------------------------------------------
        // 3. FLAT USER TEST FIELDS REPLACEMENT
        // ---------------------------------------------------------------------
        FindReplaceOptions flatReplaceOptions = new FindReplaceOptions(FindReplaceDirection.FORWARD);
        for (Map.Entry<String, Object> entry : fieldValues.entrySet()) {
            if ("coverages".equalsIgnoreCase(entry.getKey())) continue;
            Object val = entry.getValue();
            if (val instanceof List || val instanceof Map) continue;

            String tag = "<<" + entry.getKey() + ">>";
            String replacement = val != null ? String.valueOf(val) : "";
            doc.getRange().replace(tag, replacement, flatReplaceOptions);
        }

        // ---------------------------------------------------------------------
        // 4. STANDARD POLICY & COMPANY METADATA DEFAULTS (if unpopulated)
        // ---------------------------------------------------------------------
        Map<String, String> standardDefaults = new LinkedHashMap<>();
        standardDefaults.put("Company_Name", "Helios Specialty Insurance Company");
        standardDefaults.put("Transaction_Type", "New Business Policy Issue");
        standardDefaults.put("LOB_Name", "Commercial Property & Casualty");
        standardDefaults.put("Insured_Name", "Helios Logistics & Transport Inc.");
        standardDefaults.put("Named_Insured", "Helios Logistics & Transport Inc.");
        standardDefaults.put("Insured_Address_Line_1", "450 North Michigan Ave, Suite 1200");
        standardDefaults.put("Insured_City", "Chicago");
        standardDefaults.put("Insured_State", "IL");
        standardDefaults.put("Insured_Zip", "60611");
        standardDefaults.put("Agency_Name", "Midwest Underwriters Agency Corp");
        standardDefaults.put("Agency_Code", "AG-IL-8842");
        standardDefaults.put("Agency_Contact_Info", "commercial@midwestbrokerage.com | (312) 555-0199");
        standardDefaults.put("Risk_ID", "LOC-001 / BLDG-01");
        standardDefaults.put("Risk_Description", "Commercial Office Building & Warehouse Facilities");
        standardDefaults.put("Risk_Location_Address", "100 Innovation Way, Suite 400");
        standardDefaults.put("Risk_Location_City", "Chicago");
        standardDefaults.put("Risk_Location_State", "IL");
        standardDefaults.put("Risk_Location_Zip", "60606");
        standardDefaults.put("Total_Premium", "$9,750.00");
        standardDefaults.put("Fees_Surcharges", "$150.00 (Guaranty Fund & Inspection Surcharge)");
        standardDefaults.put("Total_Amount_Due", "$9,900.00");
        standardDefaults.put("Issue_Date", LocalDate.now().format(DateTimeFormatter.ofPattern("MM/dd/yyyy")));

        for (Map.Entry<String, String> def : standardDefaults.entrySet()) {
            doc.getRange().replace("<<" + def.getKey() + ">>", def.getValue(), new FindReplaceOptions());
        }

        // Clean up any remaining unpopulated tags
        doc.getRange().replace(TAG_PATTERN, "", new FindReplaceOptions());

        // Clean up any table rows that became completely blank so empty lines are not generated
        cleanupBlankTableRows(doc);

        // ---------------------------------------------------------------------
        // 5. ASPOSE PDF EXPORT (SaveFormat.PDF)
        // ---------------------------------------------------------------------
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        doc.save(out, SaveFormat.PDF);
        byte[] pdfBytes = out.toByteArray();

        String downloadFileName = String.format("%s_%s_DecPage.pdf",
                template.getFormId().replaceAll("[^a-zA-Z0-9-_]", "_"),
                template.getFormRevision().replaceAll("[^a-zA-Z0-9-_]", "_"));

        GeneratedDocResult result = new GeneratedDocResult(downloadFileName, pdfBytes);
        lastGeneratedTestCache.put(tenantId + ":" + templateId, result);
        log.info("Successfully generated PDF Dec Page ({} bytes) for template ID: {}", pdfBytes.length, templateId);
        return result;
    }

    private String getFieldVal(Map<String, Object> cov, Map<String, Object> flatFields, String... candidateKeys) {
        for (String k : candidateKeys) {
            if (cov != null && cov.containsKey(k) && cov.get(k) != null) {
                return String.valueOf(cov.get(k));
            }
            if (flatFields != null && flatFields.containsKey(k) && flatFields.get(k) != null) {
                return String.valueOf(flatFields.get(k));
            }
        }
        return "";
    }

    private List<Map<String, Object>> generateDefaultMockCoverages() {
        List<Map<String, Object>> list = new ArrayList<>();
        list.add(Map.of(
                "Coverage_Name", "Commercial Property - Building",
                "Coverage_Limit", "$2,500,000",
                "Coverage_Deductible", "$10,000",
                "Coverage_Premium", "$4,200.00"
        ));
        list.add(Map.of(
                "Coverage_Name", "Business Personal Property (BPP)",
                "Coverage_Limit", "$1,000,000",
                "Coverage_Deductible", "$5,000",
                "Coverage_Premium", "$2,850.00"
        ));
        list.add(Map.of(
                "Coverage_Name", "Commercial General Liability - Occurrence",
                "Coverage_Limit", "$2,000,000 Occ / $4,000,000 Agg",
                "Coverage_Deductible", "$0",
                "Coverage_Premium", "$2,700.00"
        ));
        list.add(Map.of(
                "Coverage_Name", "Business Income & Extra Expense",
                "Coverage_Limit", "$500,000",
                "Coverage_Deductible", "72 Hours",
                "Coverage_Premium", "$1,120.00"
        ));
        list.add(Map.of(
                "Coverage_Name", "Equipment Breakdown Coverage",
                "Coverage_Limit", "$500,000",
                "Coverage_Deductible", "$2,500",
                "Coverage_Premium", "$640.00"
        ));
        return list;
    }

    public List<DecPageTemplateDto> listTemplates(int tenantId) {
        List<DecPageTemplate> list = repository.findAll(tenantId);
        List<DecPageTemplateDto> dtos = new ArrayList<>();
        for (DecPageTemplate t : list) {
            dtos.add(mapToDto(t));
        }
        return dtos;
    }

    public Optional<DecPageTemplateDto> getTemplateById(int tenantId, Long templateId) {
        return repository.findById(tenantId, templateId).map(this::mapToDto);
    }

    public List<DecPageTemplateFieldDto> getTemplateFields(int tenantId, Long templateId) {
        List<DecPageTemplateField> fields = repository.findFieldsByTemplateId(tenantId, templateId);
        List<DecPageTemplateFieldDto> dtos = new ArrayList<>();
        for (DecPageTemplateField f : fields) {
            dtos.add(new DecPageTemplateFieldDto(f.getId(), templateId, f.getFieldName(), f.getCreatedAt()));
        }
        return dtos;
    }

    public boolean deleteTemplate(int tenantId, Long templateId) {
        Optional<DecPageTemplate> opt = repository.findById(tenantId, templateId);
        if (opt.isPresent()) {
            DecPageTemplate t = opt.get();
            try {
                if (t.getFileStoragePath() != null) {
                    Files.deleteIfExists(Paths.get(t.getFileStoragePath()));
                }
            } catch (Exception e) {
                log.warn("Could not delete physical file {}: {}", t.getFileStoragePath(), e.getMessage());
            }
        }
        return repository.deleteById(tenantId, templateId);
    }

    private DecPageTemplateDto mapToDto(DecPageTemplate entity) {
        List<String> fieldStrings = new ArrayList<>();
        if (entity.getFields() != null) {
            for (DecPageTemplateField f : entity.getFields()) {
                fieldStrings.add(f.getFieldName());
            }
        }
        return new DecPageTemplateDto(
                entity.getId(),
                entity.getFormId(),
                entity.getFormRevision(),
                entity.getFormName(),
                entity.getEffectiveDate(),
                entity.getProductId(),
                entity.getFileStoragePath(),
                entity.getCreatedAt(),
                entity.getUpdatedAt(),
                fieldStrings
        );
    }

    /**
     * Removes any table row containing the specified tag prefix (e.g. <<Coverage_4_)
     * so that unused or blank coverage lines are not generated in the output table.
     */
    private boolean removeTableRowContainingTag(Document doc, String tagPrefix) {
        boolean removed = false;
        for (Table table : (Iterable<Table>) doc.getChildNodes(NodeType.TABLE, true)) {
            for (int r = table.getRows().getCount() - 1; r >= 0; r--) {
                Row row = table.getRows().get(r);
                String rowText = row.getText();
                if (rowText != null && rowText.contains(tagPrefix)) {
                    log.info("Removing unused coverage table row containing tag prefix: {}", tagPrefix);
                    row.remove();
                    removed = true;
                }
            }
        }
        return removed;
    }

    /**
     * Scans all tables in the document and deletes any non-header data row whose
     * cells are all completely blank/whitespace, ensuring clean tabular rendering.
     */
    private void cleanupBlankTableRows(Document doc) {
        for (Table table : (Iterable<Table>) doc.getChildNodes(NodeType.TABLE, true)) {
            if (table.getRows().getCount() > 1) {
                // Examine rows from bottom up to index 1 (preserve header row 0)
                for (int r = table.getRows().getCount() - 1; r >= 1; r--) {
                    Row row = table.getRows().get(r);
                    boolean isBlank = true;
                    for (Cell cell : (Iterable<Cell>) row.getCells()) {
                        String text = cell.getText() != null
                                ? cell.getText().replaceAll("[\\r\\n\\u0007\\t\\s]+", "").trim()
                                : "";
                        if (!text.isEmpty()) {
                            isBlank = false;
                            break;
                        }
                    }
                    if (isBlank) {
                        log.info("Removing completely blank table row at index {} to eliminate empty lines", r);
                        row.remove();
                    }
                }
            }
        }
    }

    public record GeneratedDocResult(String fileName, byte[] docxBytes) {}
}
