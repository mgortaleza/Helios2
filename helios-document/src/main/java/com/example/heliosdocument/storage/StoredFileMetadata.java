package com.example.heliosdocument.storage;

import java.time.LocalDateTime;

/**
 * Metadata record returned upon physical file persistence by StorageService.
 * Contains only relative path and cryptographic verification details.
 */
public record StoredFileMetadata(
        String relativePath,
        String fileName,
        long fileSizeBytes,
        String sha256Checksum,
        String mimeType,
        LocalDateTime storedAt
) {}

