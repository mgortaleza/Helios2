package com.example.heliosdocgen.service;

import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import com.aspose.pdf.BorderInfo;
import com.aspose.pdf.BorderSide;
import com.aspose.pdf.Cell;
import com.aspose.pdf.Color;
import com.aspose.pdf.Document;
import com.aspose.pdf.FontRepository;
import com.aspose.pdf.HorizontalAlignment;
import com.aspose.pdf.HtmlFragment;
import com.aspose.pdf.MarginInfo;
import com.aspose.pdf.Page;
import com.aspose.pdf.Row;
import com.aspose.pdf.Table;
import com.aspose.pdf.TextFragment;
import com.example.heliosdocgen.model.GenerateDocumentRequest;

@Service
public class AsposePdfGeneratorService {

    private static final Logger log = LoggerFactory.getLogger(AsposePdfGeneratorService.class);

    public record GeneratedPdf(byte[] content, int pageCount) {}

    public GeneratedPdf generate(GenerateDocumentRequest req) {
        String docType = (req.docType() != null) ? req.docType().toUpperCase().trim() : "DEC_PAGE";
        return switch (docType) {
            case "QUOTE_PROPOSAL", "QUOTE" -> generateQuoteProposal(req);
            case "BINDER_LETTER", "LETTER" -> generateBinderLetter(req);
            case "EMAIL", "EMAIL_BODY", "EMAIL_DOCUMENT" -> generateEmailDocument(req);
            default -> generateDecPage(req);
        };
    }

    public GeneratedPdf generateEmailDocument(GenerateDocumentRequest req) {
        Document doc = new Document();
        Page page = doc.getPages().add();
        setupPageMargins(page);

        // Header Banner
        addBrandHeader(page, "HELIOS DOCUMENT MANAGEMENT", "INCOMING ELECTRONIC MAIL (EML) INTAKE RECORD");

        // Document Title
        String subject = safe(req.letterSubject(), safe(req.docTitle(), "No Subject"));
        addSectionTitle(page, "EMAIL INTAKE MANIFEST — " + subject);

        // Metadata Table
        Table metaTable = new Table();
        metaTable.setColumnWidths("120 400");
        metaTable.setDefaultCellBorder(new BorderInfo(BorderSide.All, 0.5f, Color.getLightGray()));
        metaTable.setDefaultCellPadding(new MarginInfo(5, 5, 5, 5));
        metaTable.setMargin(new MarginInfo(0, 5, 0, 15));

        addMetaRow2(metaTable, "Subject:", subject);
        addMetaRow2(metaTable, "From:", safe(req.emailFrom(), safe(req.signatoryName(), "Unknown Sender")));
        addMetaRow2(metaTable, "To:", safe(req.emailTo(), safe(req.recipientName(), "Helios Intake")));
        addMetaRow2(metaTable, "Date Received:", safe(req.emailDate(), LocalDate.now().toString()));

        List<String> attachments = req.emailAttachments() != null ? req.emailAttachments() : req.attachedForms();
        if (attachments != null && !attachments.isEmpty()) {
            StringBuilder attSb = new StringBuilder();
            for (int i = 0; i < attachments.size(); i++) {
                if (i > 0) attSb.append("\n");
                attSb.append((i + 1)).append(". ").append(attachments.get(i));
            }
            addMetaRow2(metaTable, "Extracted Attachments:", attSb.toString());
        } else {
            addMetaRow2(metaTable, "Extracted Attachments:", "None (Standalone correspondence)");
        }
        page.getParagraphs().add(metaTable);

        // Email Content Header
        addSectionHeader(page, "EMAIL MESSAGE BODY");

        // Body Content
        String bodyHtml = req.emailBodyHtml();
        String bodyText = req.letterBody();

        if (bodyHtml != null && !bodyHtml.isBlank()) {
            try {
                HtmlFragment htmlFrag = new HtmlFragment(bodyHtml);
                page.getParagraphs().add(htmlFrag);
            } catch (Exception ex) {
                log.warn("Failed to render email HTML fragment, falling back to text: {}", ex.getMessage());
                TextFragment textFrag = new TextFragment(safe(bodyText, "(Empty message body)"));
                textFrag.getTextState().setFontSize(9.5f);
                textFrag.getTextState().setLineSpacing(4);
                page.getParagraphs().add(textFrag);
            }
        } else {
            TextFragment textFrag = new TextFragment(safe(bodyText, "(Empty message body)"));
            textFrag.getTextState().setFontSize(9.5f);
            textFrag.getTextState().setLineSpacing(4);
            page.getParagraphs().add(textFrag);
        }

        return saveDocument(doc);
    }

    public GeneratedPdf generateDecPage(GenerateDocumentRequest req) {
        Document doc = new Document();
        Page page = doc.getPages().add();
        setupPageMargins(page);

        // Header Banner
        addBrandHeader(page, "HELIOS INSURANCE UNDERWRITING GROUP", "COMMERCIAL SPECIALTY LINES DECLARATIONS");

        // Document Title
        addSectionTitle(page, "POLICY DECLARATIONS SCHEDULE — " + safe(req.productType(), "Commercial Liability"));

        // Overview Grid Table
        Table metaTable = new Table();
        metaTable.setColumnWidths("130 140 110 140");
        metaTable.setDefaultCellBorder(new BorderInfo(BorderSide.All, 0.5f, Color.getLightGray()));
        metaTable.setDefaultCellPadding(new MarginInfo(5, 5, 5, 5));
        metaTable.setMargin(new MarginInfo(0, 10, 0, 12));

        addMetaRow(metaTable, "Policy Number:", safe(req.entityNbr(), "POL-2026-8832"), "File / Submsn Ref:", "SUB-" + safe(String.valueOf(req.entityId()), "9921"));
        addMetaRow(metaTable, "Named Insured:", safe(req.insuredName(), "TechSolutions Corp"), "Producing Agency:", safe(req.agencyInfo(), "Acme Brokers Inc."));
        addMetaRow(metaTable, "Insured Address:", safe(req.insuredAddress(), "101 Innovation Blvd, San Francisco, CA"), "Underwriter:", safe(req.underwriterName(), "Michael Chang"));
        addMetaRow(metaTable, "Effective Date:", safe(req.effectiveDate(), "2026-10-01"), "Expiration Date:", safe(req.expirationDate(), "2027-10-01"));
        addMetaRow(metaTable, "Retroactive Date:", safe(req.retroactiveDate(), "2022-10-01"), "Coverage Form:", "Claims-Made & Reported");
        page.getParagraphs().add(metaTable);

        // Coverage Limits & Retentions Table
        addSectionHeader(page, "SCHEDULE OF COVERAGES, LIMITS & RETENTIONS");
        Table limitsTable = new Table();
        limitsTable.setColumnWidths("260 130 130");
        limitsTable.setDefaultCellBorder(new BorderInfo(BorderSide.All, 0.5f, Color.getLightGray()));
        limitsTable.setDefaultCellPadding(new MarginInfo(6, 6, 6, 6));
        limitsTable.setMargin(new MarginInfo(0, 5, 0, 12));

        Row lHeader = limitsTable.getRows().add();
        addHeaderCell(lHeader, "Covered Insuring Agreement");
        addHeaderCell(lHeader, "Limit of Liability");
        addHeaderCell(lHeader, "Retention / Deductible");

        addDataRow3(limitsTable, "Professional Liability / Errors & Omissions", formatCurrencyWhole(req.limitAmount(), "$5,000,000"), formatCurrencyWhole(req.retentionAmount(), "$50,000"));
        addDataRow3(limitsTable, "Regulatory Defense & Fines Sublimit", "$1,000,000", "$25,000");
        addDataRow3(limitsTable, "Network Security & Privacy Liability", formatCurrencyWhole(req.limitAmount(), "$5,000,000"), formatCurrencyWhole(req.retentionAmount(), "$50,000"));
        addDataRow3(limitsTable, "Annual Policy Aggregate Limit", formatCurrencyWhole(req.limitAmount(), "$5,000,000"), "N/A");
        page.getParagraphs().add(limitsTable);

        // Premium Accounting
        addSectionHeader(page, "ANNUAL PREMIUM ACCOUNTING");
        Table premTable = new Table();
        premTable.setColumnWidths("390 130");
        premTable.setDefaultCellBorder(new BorderInfo(BorderSide.All, 0.5f, Color.getLightGray()));
        premTable.setDefaultCellPadding(new MarginInfo(5, 5, 5, 5));
        premTable.setMargin(new MarginInfo(0, 5, 0, 12));

        double ratedPrem = parseDouble(req.premiumAmount(), 32500.0);
        double surplusTax = Math.round(ratedPrem * 0.04 * 100.0) / 100.0;
        double totalInvoiced = ratedPrem + surplusTax;

        String ratedPremStr = formatCurrency(req.premiumAmount(), "$32,500.00");
        String surplusTaxStr = String.format("$%,.2f", surplusTax);
        String totalInvoicedStr = String.format("$%,.2f", totalInvoiced);

        addDataRow2(premTable, "Total Base Loss Cost & Rated Schedule Premium:", ratedPremStr);
        addDataRow2(premTable, "State Surplus Lines / DOI Regulatory Taxes & Fees (4.0%):", surplusTaxStr);

        Row totRow = premTable.getRows().add();
        addStyledCell(totRow, "TOTAL INVOICED ANNUAL PREMIUM (DUE AT INCEPTION):", true, 9, Color.getBlack(), rgb(241, 245, 249));
        addStyledCell(totRow, totalInvoicedStr, true, 9.5f, rgb(2, 132, 199), rgb(241, 245, 249));
        page.getParagraphs().add(premTable);

        // Forms & Endorsements Schedule
        addSectionHeader(page, "SCHEDULE OF FORMS & ENDORSEMENTS MADE PART OF THIS POLICY");
        Table formsTable = new Table();
        formsTable.setColumnWidths("130 390");
        formsTable.setDefaultCellBorder(new BorderInfo(BorderSide.All, 0.5f, Color.getLightGray()));
        formsTable.setDefaultCellPadding(new MarginInfo(5, 5, 5, 5));
        formsTable.setMargin(new MarginInfo(0, 5, 0, 12));

        Row fHeader = formsTable.getRows().add();
        addHeaderCell(fHeader, "Form Number");
        addHeaderCell(fHeader, "Form Title / Regulatory Caption");

        addDataRow2(formsTable, "IL-0017 (11/98)", "Common Policy Conditions - Specialty Lines");
        addDataRow2(formsTable, "PL-1001 (01/24)", "Errors & Omissions Coverage Part Jacket");
        addDataRow2(formsTable, "CY-2005 (06/25)", "Cyber Risk & Network Security Endorsement");
        addDataRow2(formsTable, "SL-TRIA (01/21)", "Terrorism Risk Insurance Act Mandatory Offer / Cap");

        if (req.attachedForms() != null) {
            for (String f : req.attachedForms()) {
                addDataRow2(formsTable, "CUSTOM-ENDORSE", f);
            }
        }
        page.getParagraphs().add(formsTable);

        // Signature & Attestation Block
        addSignatureBlock(page, safe(req.underwriterName(), "Michael Chang"), "Authorized Underwriting Representative");

        return saveDocument(doc);
    }

    public GeneratedPdf generateQuoteProposal(GenerateDocumentRequest req) {
        Document doc = new Document();
        Page page = doc.getPages().add();
        setupPageMargins(page);

        addBrandHeader(page, "HELIOS SPECIALTY UNDERWRITING", "OFFICIAL COMMERCIAL POLICY QUOTATION PROPOSAL");
        addSectionTitle(page, "SPECIALTY LINES QUOTE PROPOSAL — " + safe(req.productType(), "Tech E&O"));

        // Summary Table
        Table sumTable = new Table();
        sumTable.setColumnWidths("130 140 110 140");
        sumTable.setDefaultCellBorder(new BorderInfo(BorderSide.All, 0.5f, Color.getLightGray()));
        sumTable.setDefaultCellPadding(new MarginInfo(5, 5, 5, 5));
        sumTable.setMargin(new MarginInfo(0, 10, 0, 15));

                String entityRef = safe(req.entityNbr(), "9921");
        if (!entityRef.startsWith("SUB-") && !entityRef.startsWith("POL-") && !entityRef.startsWith("Q-")) {
            entityRef = "SUB-" + entityRef;
        }
        addMetaRow(sumTable, "Quote / Submsn #:", entityRef, "Proposal Date:", LocalDate.now().toString());
        addMetaRow(sumTable, "Applicant:", safe(req.insuredName(), "TechSolutions Corp"), "Broker Agency:", safe(req.agencyInfo(), "Acme Brokers"));
        addMetaRow(sumTable, "Proposed Term:", safe(req.effectiveDate(), "2026-10-01") + " to " + safe(req.expirationDate(), "2027-10-01"), "Quote Valid Until:", LocalDate.now().plusDays(30).toString());
        page.getParagraphs().add(sumTable);

        // Limits & Rating Breakdown
        addSectionHeader(page, "PROPOSED COVERAGE TERMS & PRICING INDICATION");
        Table rateTable = new Table();
        rateTable.setColumnWidths("300 220");
        rateTable.setDefaultCellBorder(new BorderInfo(BorderSide.All, 0.5f, Color.getLightGray()));
        rateTable.setDefaultCellPadding(new MarginInfo(6, 6, 6, 6));
        rateTable.setMargin(new MarginInfo(0, 5, 0, 15));

        addDataRow2(rateTable, "Coverage Part / LOB:", safe(req.productType(), "Technology Errors & Omissions"));
        addDataRow2(rateTable, "Each Claim Limit of Liability:", formatCurrencyWhole(req.limitAmount(), "$5,000,000"));
        addDataRow2(rateTable, "Policy Aggregate Limit:", formatCurrencyWhole(req.limitAmount(), "$5,000,000"));
        addDataRow2(rateTable, "Self-Insured Retention (Each Claim):", formatCurrencyWhole(req.retentionAmount(), "$50,000"));
        addDataRow2(rateTable, "Base Rate per $1k Gross Revenue:", formatBaseRate(req.baseRate(), "$1.85"));
        addDataRow2(rateTable, "Underwriter Schedule Factor:", formatScheduleMod(req.scheduleMod(), "0.900 (10% Credit Applied)"));

        String quotePremStr = formatCurrency(req.premiumAmount(), "$32,500.00");
        Row premR = rateTable.getRows().add();
        addStyledCell(premR, "ANNUAL INDICATED QUOTE PREMIUM:", true, 9, Color.getBlack(), rgb(241, 245, 249));
        addStyledCell(premR, quotePremStr, true, 10, rgb(2, 132, 199), rgb(241, 245, 249));
        page.getParagraphs().add(rateTable);

        // Rating Audit Trace (BRMS / Rule Flow Audit Steps)
        if (req.calculationTrace() != null && !req.calculationTrace().isEmpty()) {
            addSectionHeader(page, "UNDERWRITING RATING ENGINE AUDIT TRACE");
            Table traceTable = new Table();
            traceTable.setColumnWidths("520");
            traceTable.setDefaultCellBorder(new BorderInfo(BorderSide.All, 0.5f, rgb(226, 232, 240)));
            traceTable.setDefaultCellPadding(new MarginInfo(4, 4, 4, 4));
            traceTable.setMargin(new MarginInfo(0, 5, 0, 15));

            for (String step : req.calculationTrace()) {
                Row tr = traceTable.getRows().add();
                Cell c = tr.getCells().add();
                c.setBackgroundColor(rgb(248, 250, 252));
                TextFragment tf = new TextFragment("•  " + step);
                tf.getTextState().setFont(FontRepository.findFont("Helvetica"));
                tf.getTextState().setFontSize(8.5f);
                tf.getTextState().setForegroundColor(rgb(30, 41, 59));
                c.getParagraphs().add(tf);
            }
            page.getParagraphs().add(traceTable);
        }

        // Acceptance Disclaimer
        TextFragment disc = new TextFragment("This quote is conditioned upon receipt and review of satisfactory signed application warranty statement and no material change in loss activity prior to binding.");
        disc.getTextState().setFontSize(8.5f);
        disc.getTextState().setForegroundColor(Color.getGray());
        page.getParagraphs().add(disc);

        addSignatureBlock(page, safe(req.underwriterName(), "Michael Chang"), "Authorizing Underwriter");

        return saveDocument(doc);
    }

    public GeneratedPdf generateBinderLetter(GenerateDocumentRequest req) {
        Document doc = new Document();
        Page page = doc.getPages().add();
        setupPageMargins(page);

        addBrandHeader(page, "HELIOS INSURANCE GROUP", "FORMAL COVERAGE BINDER CONFIRMATION");

        // Date & Addressee
        TextFragment dateFrag = new TextFragment("Date: " + LocalDate.now().format(DateTimeFormatter.ofPattern("MMMM d, yyyy")));
        dateFrag.getTextState().setFont(FontRepository.findFont("Helvetica-Bold"));
        dateFrag.getTextState().setFontSize(10);
        page.getParagraphs().add(dateFrag);

        TextFragment toFrag = new TextFragment(
                "TO:\n" +
                safe(req.recipientName(), safe(req.insuredName(), "TechSolutions Corp")) + "\n" +
                safe(req.insuredAddress(), "101 Innovation Blvd, San Francisco, CA 94107") + "\n" +
                "Attn: Insurance & Risk Department"
        );
        toFrag.getTextState().setFontSize(9.5f);
        toFrag.setMargin(new MarginInfo(0, 10, 0, 15));
        page.getParagraphs().add(toFrag);

        // Subject
        TextFragment subj = new TextFragment("RE: FORMAL BINDER OF COVERAGE — " + safe(req.entityNbr(), "POL-2026-8832"));
        subj.getTextState().setFont(FontRepository.findFont("Helvetica-Bold"));
        subj.getTextState().setFontSize(11);
        subj.getTextState().setForegroundColor(rgb(2, 132, 199));
        subj.setMargin(new MarginInfo(0, 0, 0, 12));
        page.getParagraphs().add(subj);

        // Letter Body
        String defaultBody =
                "Dear Valued Policyholder & Broker Partner:\n\n" +
                "We are pleased to confirm that coverage has been formally BOUND under the terms and conditions of the Helios Specialty Insurance program. " +
                "This document serves as your immediate legal binder evidencing insurance coverage effective " + safe(req.effectiveDate(), "2026-10-01") + " " +
                "through " + safe(req.expirationDate(), "2027-10-01") + ".\n\n" +
                "Coverage is bound for the limits of liability stated below, subject to the standard terms, jacket conditions, and state regulatory endorsements of the Helios Insurance Group. " +
                "The formal policy jacket with complete declarations will be delivered in accordance with state statutory delivery guidelines.";

        TextFragment bodyFrag = new TextFragment(safe(req.letterBody(), defaultBody));
        bodyFrag.getTextState().setFontSize(9.5f);
        bodyFrag.getTextState().setLineSpacing(4);
        bodyFrag.setMargin(new MarginInfo(0, 0, 0, 15));
        page.getParagraphs().add(bodyFrag);

        // Quick Summary Box
        Table sum = new Table();
        sum.setColumnWidths("160 360");
        sum.setDefaultCellBorder(new BorderInfo(BorderSide.All, 0.5f, Color.getLightGray()));
        sum.setDefaultCellPadding(new MarginInfo(6, 6, 6, 6));
        sum.setMargin(new MarginInfo(0, 5, 0, 20));

        addDataRow2(sum, "Policy Identification:", safe(req.entityNbr(), "POL-2026-8832"));
        addDataRow2(sum, "Covered Line of Business:", safe(req.productType(), "Technology Errors & Omissions"));
        addDataRow2(sum, "Policy Limit of Liability:", formatCurrencyWhole(req.limitAmount(), "$5,000,000") + " Each Claim & Aggregate");
        addDataRow2(sum, "Self-Insured Retention:", formatCurrencyWhole(req.retentionAmount(), "$50,000") + " Each Claim");
        addDataRow2(sum, "Total Inception Premium:", formatCurrency(req.premiumAmount(), "$32,500.00"));
        page.getParagraphs().add(sum);

        addSignatureBlock(page, safe(req.signatoryName(), safe(req.underwriterName(), "Michael Chang")), "Senior Underwriting Officer, Helios Suite");

        return saveDocument(doc);
    }

    private void setupPageMargins(Page page) {
        page.getPageInfo().setMargin(new MarginInfo(36, 36, 36, 36)); // 0.5 in margins
    }

    private void addBrandHeader(Page page, String brand, String subhead) {
        Table headerTable = new Table();
        headerTable.setColumnWidths("340 180");
        headerTable.setMargin(new MarginInfo(0, 0, 0, 15));

        Row r = headerTable.getRows().add();

        Cell c1 = r.getCells().add();
        TextFragment bFrag = new TextFragment(brand);
        bFrag.getTextState().setFont(FontRepository.findFont("Helvetica-Bold"));
        bFrag.getTextState().setFontSize(13);
        bFrag.getTextState().setForegroundColor(rgb(15, 23, 42)); // Slate dark
        c1.getParagraphs().add(bFrag);

        TextFragment sFrag = new TextFragment(subhead);
        sFrag.getTextState().setFontSize(8.5f);
        sFrag.getTextState().setForegroundColor(rgb(100, 116, 139));
        c1.getParagraphs().add(sFrag);

        Cell c2 = r.getCells().add();
        TextFragment timeFrag = new TextFragment("HELIOS DOCGEN ENGINE #8088\n" + LocalDate.now());
        timeFrag.getTextState().setFont(FontRepository.findFont("Helvetica-Bold"));
        timeFrag.getTextState().setFontSize(8);
        timeFrag.getTextState().setForegroundColor(rgb(2, 132, 199));
        timeFrag.setHorizontalAlignment(HorizontalAlignment.Right);
        c2.getParagraphs().add(timeFrag);

        page.getParagraphs().add(headerTable);
    }

    private void addSectionTitle(Page page, String title) {
        Table t = new Table();
        t.setColumnWidths("520");
        t.setMargin(new MarginInfo(0, 0, 0, 10));
        Row r = t.getRows().add();
        addStyledCell(r, title, true, 11, Color.getWhite(), rgb(15, 23, 42));
        page.getParagraphs().add(t);
    }

    private void addSectionHeader(Page page, String title) {
        TextFragment frag = new TextFragment(title);
        frag.getTextState().setFont(FontRepository.findFont("Helvetica-Bold"));
        frag.getTextState().setFontSize(9.5f);
        frag.getTextState().setForegroundColor(rgb(15, 23, 42));
        frag.setMargin(new MarginInfo(0, 8, 0, 4));
        page.getParagraphs().add(frag);
    }

    private void addHeaderCell(Row r, String text) {
        addStyledCell(r, text, true, 8.5f, rgb(15, 23, 42), rgb(241, 245, 249));
    }

    private void addMetaRow(Table t, String label1, String val1, String label2, String val2) {
        Row r = t.getRows().add();
        addStyledCell(r, label1, true, 8, rgb(71, 85, 105), rgb(248, 250, 252));
        addStyledCell(r, val1, false, 8.5f, Color.getBlack(), null);
        addStyledCell(r, label2, true, 8, rgb(71, 85, 105), rgb(248, 250, 252));
        addStyledCell(r, val2, false, 8.5f, Color.getBlack(), null);
    }

    private void addMetaRow2(Table t, String label, String value) {
        Row r = t.getRows().add();
        addStyledCell(r, label, true, 8.5f, rgb(71, 85, 105), rgb(248, 250, 252));
        addStyledCell(r, value, false, 8.5f, Color.getBlack(), null);
    }

    private void addDataRow2(Table t, String col1, String col2) {
        Row r = t.getRows().add();
        addStyledCell(r, col1, false, 8.5f, Color.getBlack(), null);
        addStyledCell(r, col2, false, 8.5f, Color.getBlack(), null);
    }

    private void addDataRow3(Table t, String col1, String col2, String col3) {
        Row r = t.getRows().add();
        addStyledCell(r, col1, false, 8.5f, Color.getBlack(), null);
        addStyledCell(r, col2, false, 8.5f, Color.getBlack(), null);
        addStyledCell(r, col3, false, 8.5f, Color.getBlack(), null);
    }

    private Cell addStyledCell(Row r, String text, boolean bold, float size, Color fg, Color bg) {
        Cell c = r.getCells().add();
        if (bg != null) {
            c.setBackgroundColor(bg);
        }
        TextFragment tf = new TextFragment(text);
        if (bold) {
            tf.getTextState().setFont(FontRepository.findFont("Helvetica-Bold"));
        } else {
            tf.getTextState().setFont(FontRepository.findFont("Helvetica"));
        }
        if (size > 0) {
            tf.getTextState().setFontSize(size);
        }
        if (fg != null) {
            tf.getTextState().setForegroundColor(fg);
        }
        c.getParagraphs().add(tf);
        return c;
    }

    private Color rgb(int r, int g, int b) {
        return Color.fromRgb(new java.awt.Color(r, g, b));
    }

    private void addSignatureBlock(Page page, String signer, String title) {
        Table sigTable = new Table();
        sigTable.setColumnWidths("260 260");
        sigTable.setMargin(new MarginInfo(0, 20, 0, 0));

        Row r1 = sigTable.getRows().add();
        addStyledCell(r1, "AUTHORIZED REPRESENTATIVE SIGNATURE:", true, 8, Color.getGray(), null);
        addStyledCell(r1, "BINDING DATE & SEAL:", true, 8, Color.getGray(), null);

        Row r2 = sigTable.getRows().add();
        addStyledCell(r2, "_____________________________________\n" + signer + "\n" + title, false, 8.5f, Color.getBlack(), null);
        addStyledCell(r2, "_____________________________________\n" + LocalDate.now() + "\nHelios Dedicated DocGen Engine #8088", false, 8.5f, Color.getBlack(), null);

        page.getParagraphs().add(sigTable);
    }

    private GeneratedPdf saveDocument(Document doc) {
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            int count = (doc.getPages() != null) ? doc.getPages().size() : 1;
            doc.save(baos);
            byte[] bytes = baos.toByteArray();
            log.info("Aspose.PDF generated document successfully: {} bytes across {} page(s)", bytes.length, count);
            return new GeneratedPdf(bytes, count);
        } catch (Exception e) {
            log.error("Failed to compile Aspose.PDF document: {}", e.getMessage(), e);
            throw new RuntimeException("Aspose PDF compilation error: " + e.getMessage(), e);
        }
    }

    private String safe(String val, String def) {
        return (val != null && !val.isBlank()) ? val : def;
    }

    private double parseDouble(String val, double def) {
        if (val == null || val.isBlank()) return def;
        try {
            String clean = val.replaceAll("[^0-9.-]", "");
            if (clean.isBlank()) return def;
            return Double.parseDouble(clean);
        } catch (Exception e) {
            return def;
        }
    }

    private String formatCurrency(String val, String def) {
        if (val == null || val.isBlank()) return def;
        try {
            String clean = val.replaceAll("[^0-9.-]", "");
            if (clean.isBlank()) return def;
            double d = Double.parseDouble(clean);
            return String.format("$%,.2f", d);
        } catch (Exception e) {
            return val.startsWith("$") ? val : ("$" + val);
        }
    }

    private String formatCurrencyWhole(String val, String def) {
        if (val == null || val.isBlank()) return def;
        try {
            String clean = val.replaceAll("[^0-9.-]", "");
            if (clean.isBlank()) return def;
            double d = Double.parseDouble(clean);
            return String.format("$%,.0f", d);
        } catch (Exception e) {
            return val.startsWith("$") ? val : ("$" + val);
        }
    }

    private String formatBaseRate(String val, String def) {
        if (val == null || val.isBlank()) return def;
        try {
            String clean = val.replaceAll("[^0-9.-]", "");
            if (clean.isBlank()) return def;
            double d = Double.parseDouble(clean);
            return String.format("$%.2f", d);
        } catch (Exception e) {
            return val;
        }
    }

    private String formatScheduleMod(String val, String def) {
        if (val == null || val.isBlank()) return def;
        try {
            String clean = val.replaceAll("[^0-9.-]", "");
            if (clean.isBlank()) return def;
            double mod = Double.parseDouble(clean);
            if (mod < 1.0) {
                int credit = (int) Math.round((1.0 - mod) * 100);
                return String.format("%.2f (%d%% Credit Applied)", mod, credit);
            } else if (mod > 1.0) {
                int debit = (int) Math.round((mod - 1.0) * 100);
                return String.format("%.2f (+%d%% Surcharge Applied)", mod, debit);
            } else {
                return "1.00 (Standard Par)";
            }
        } catch (Exception e) {
            return val;
        }
    }
}
