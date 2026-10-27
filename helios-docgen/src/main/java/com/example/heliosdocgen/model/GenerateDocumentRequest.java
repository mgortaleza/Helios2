package com.example.heliosdocgen.model;

import java.util.List;
import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
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
        @JsonAlias({"coverageLimit", "limit", "occurrenceLimit"}) String limitAmount,
        @JsonAlias({"deductible", "retention"}) String retentionAmount,
        @JsonAlias({"annualPremium", "premium", "finalAnnualPremium"}) String premiumAmount,
        String agencyInfo,
        @JsonAlias({"serffTrackingNbr", "serffNumber"}) String serffTrackingNumber,
        String baseRate,
        String scheduleMod,
        @JsonAlias({"calcTrace"}) List<String> calculationTrace,
        List<String> attachedForms,
        String letterSubject,
        String letterBody,
        String recipientName,
        String recipientTitle,
        String signatoryName,
        String signatoryTitle,
        String emailFrom,
        String emailTo,
        String emailDate,
        String emailBodyHtml,
        List<String> emailAttachments
) {
    public GenerateDocumentRequest(
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
    ) {
        this(tenantId, entityType, entityId, entityNbr, docType, docTitle, insuredName, insuredAddress, productType, underwriterName,
                effectiveDate, expirationDate, retroactiveDate, limitAmount, retentionAmount, premiumAmount, agencyInfo, serffTrackingNumber,
                baseRate, scheduleMod, calculationTrace, attachedForms, letterSubject, letterBody, recipientName, recipientTitle, signatoryName, signatoryTitle,
                null, null, null, null, null);
    }
}
