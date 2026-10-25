package com.example.heliosdocument.model;

public record IncomingDocumentDto(
        int incomingId,
        int tenantId,
        String documentName,
        String fileName,
        String filePath,
        Long fileSizeBytes,
        String mimeType,
        String groupId,
        String groupName,
        String status,
        String attachedEntityType,
        Long attachedEntityId,
        String attachedEntityNbr,
        Long documentId,
        String receivedDt,
        String attachedDt,
        String attachedBy,
        String createdDt
) {
}
