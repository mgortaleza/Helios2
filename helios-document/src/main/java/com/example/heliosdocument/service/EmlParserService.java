package com.example.heliosdocument.service;

import java.io.BufferedInputStream;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Date;
import java.util.List;
import java.util.Properties;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import jakarta.mail.Address;
import jakarta.mail.BodyPart;
import jakarta.mail.Message;
import jakarta.mail.Multipart;
import jakarta.mail.Part;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import jakarta.mail.internet.MimeUtility;

@Service
public class EmlParserService {

    private static final Logger log = LoggerFactory.getLogger(EmlParserService.class);
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    public record EmailAttachment(
            String fileName,
            String contentType,
            byte[] content,
            long size
    ) {}

    public record ParsedEmail(
            String subject,
            String from,
            String to,
            String dateStr,
            String bodyText,
            String bodyHtml,
            List<EmailAttachment> attachments
    ) {}

    public ParsedEmail parse(Path emlPath) throws Exception {
        log.info("Parsing EML file at: {}", emlPath);
        Session session = Session.getDefaultInstance(new Properties());
        try (InputStream is = new BufferedInputStream(Files.newInputStream(emlPath))) {
            MimeMessage message = new MimeMessage(session, is);
            return parseMimeMessage(message);
        }
    }

    public ParsedEmail parseMimeMessage(MimeMessage message) throws Exception {
        String rawSubject = message.getSubject();
        String subject = (rawSubject != null && !rawSubject.isBlank()) ? decodeMimeHeader(rawSubject) : "No Subject";

        String from = formatAddresses(message.getFrom());
        String to = formatAddresses(message.getRecipients(Message.RecipientType.TO));

        Date sentDate = message.getSentDate();
        String dateStr;
        if (sentDate != null) {
            dateStr = sentDate.toInstant().atZone(ZoneId.systemDefault()).format(DATE_FORMATTER);
        } else {
            dateStr = java.time.LocalDateTime.now().format(DATE_FORMATTER);
        }

        EmailContentCollector collector = new EmailContentCollector();
        extractParts(message, collector);

        String bodyText = collector.plainText.length() > 0 ? collector.plainText.toString().trim() : null;
        String bodyHtml = collector.htmlText.length() > 0 ? collector.htmlText.toString().trim() : null;

        log.info("Parsed EML: Subject='{}', From='{}', Attachments={}", subject, from, collector.attachments.size());

        return new ParsedEmail(
                subject,
                from,
                to,
                dateStr,
                bodyText,
                bodyHtml,
                Collections.unmodifiableList(collector.attachments)
        );
    }

    private void extractParts(Part part, EmailContentCollector collector) throws Exception {
        String disposition = part.getDisposition();
        String rawFileName = part.getFileName();
        String contentType = part.getContentType();

        boolean isAttachment = false;
        String fileName = null;

        if (rawFileName != null && !rawFileName.isBlank()) {
            fileName = sanitizeFileName(decodeMimeHeader(rawFileName));
            isAttachment = true;
        } else if (disposition != null && disposition.equalsIgnoreCase(Part.ATTACHMENT)) {
            isAttachment = true;
            fileName = "attachment_" + (collector.attachments.size() + 1);
        }

        if (isAttachment) {
            if (fileName == null || fileName.isBlank()) {
                fileName = "attachment_" + (collector.attachments.size() + 1);
            }
            byte[] bytes = readPartBytes(part);
            collector.attachments.add(new EmailAttachment(
                    fileName,
                    contentType != null ? contentType : "application/octet-stream",
                    bytes,
                    bytes.length
            ));
            return;
        }

        if (part.isMimeType("text/plain")) {
            Object content = part.getContent();
            if (content != null) {
                collector.plainText.append(content.toString()).append("\n");
            }
        } else if (part.isMimeType("text/html")) {
            Object content = part.getContent();
            if (content != null) {
                collector.htmlText.append(content.toString()).append("\n");
            }
        } else if (part.isMimeType("multipart/*")) {
            Object content = part.getContent();
            if (content instanceof Multipart mp) {
                for (int i = 0; i < mp.getCount(); i++) {
                    BodyPart bp = mp.getBodyPart(i);
                    extractParts(bp, collector);
                }
            }
        } else if (part.isMimeType("message/rfc822")) {
            Object content = part.getContent();
            if (content instanceof Part nestedPart) {
                extractParts(nestedPart, collector);
            }
        } else {
            // Unnamed or other binary part with disposition inline or unspecified
            if (disposition != null && disposition.equalsIgnoreCase(Part.INLINE) && rawFileName == null) {
                // Ignore unnamed inline parts unless needed
            } else if (rawFileName != null && !rawFileName.isBlank()) {
                byte[] bytes = readPartBytes(part);
                collector.attachments.add(new EmailAttachment(
                        sanitizeFileName(decodeMimeHeader(rawFileName)),
                        contentType != null ? contentType : "application/octet-stream",
                        bytes,
                        bytes.length
                ));
            }
        }
    }

    private byte[] readPartBytes(Part part) throws Exception {
        try (InputStream in = part.getInputStream();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            byte[] buf = new byte[8192];
            int n;
            while ((n = in.read(buf)) != -1) {
                out.write(buf, 0, n);
            }
            return out.toByteArray();
        }
    }

    private String formatAddresses(Address[] addresses) {
        if (addresses == null || addresses.length == 0) {
            return "None";
        }
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < addresses.length; i++) {
            if (i > 0) sb.append(", ");
            sb.append(decodeMimeHeader(addresses[i].toString()));
        }
        return sb.toString();
    }

    private String decodeMimeHeader(String header) {
        if (header == null) return "";
        try {
            return MimeUtility.decodeText(header);
        } catch (Exception e) {
            return header;
        }
    }

    public static String sanitizeFileName(String name) {
        if (name == null || name.isBlank()) return "document";
        // Remove path traversal and illegal filesystem characters
        String clean = name.replaceAll("[\\\\/:*?\"<>|]", "_").trim();
        clean = clean.replaceAll("\\s+", " ");
        return clean.isEmpty() ? "document" : clean;
    }

    private static class EmailContentCollector {
        final StringBuilder plainText = new StringBuilder();
        final StringBuilder htmlText = new StringBuilder();
        final List<EmailAttachment> attachments = new ArrayList<>();
    }
}

