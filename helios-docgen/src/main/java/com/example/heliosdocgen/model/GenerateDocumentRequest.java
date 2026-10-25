package com.example.heliosdocgen.model;

import java.util.List;

public record GenerateDocumentRequest(
        Integer tenantId,
        String entityType,
        Integer entityId,
        String entityNbr,
        String docType,
        String docTitle,
        String insuredName,
        String insuredAddress,
        String productType,
        String underwriterName,
        String effectiveDate,
        String expirationDate,
        String retroactiveDate,
        String limitAmount,
        String retentionAmount,
        String premiumAmount,
        String agencyInfo,
        String serffTrackingNumber,
        String baseRate,
        String scheduleMod,
        List<String> calculationTrace,
        List<String> attachedForms,
        String letterSubject,
        String letterBody,
        String recipientName,
        String recipientTitle,
        String signatoryName,
        String signatoryTitle
) {}
