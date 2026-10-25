package com.example.heliosdocument.model;

public record CreateSubmissionFromDocRequest(
        String orgName,
        Integer insuredPid,
        String submissionNbr,
        String underwriter,
        String productType,
        String effectiveDate,
        String expirationDate,
        String retroactiveDate,
        String limitAmount,
        String retentionAmount,
        String docType,
        String docTitle,
        String attachedBy
) {
}
