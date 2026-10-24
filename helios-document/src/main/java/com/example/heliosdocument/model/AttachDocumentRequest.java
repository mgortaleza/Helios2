package com.example.heliosdocument.model;

public record AttachDocumentRequest(
        String entityType,
        Long entityId,
        String entityNbr,
        String docType,
        String docTitle,
        String attachedBy
) {
}
