package com.example.heliosdocument.storage;

import java.io.InputStream;
import java.nio.file.Path;

/**
 * StorageService abstraction for physical document and template persistence.
 * Decouples application logic from filesystem, Windows UNC network shares, or object storage.
 */
public interface StorageService {

    /**
     * Stores a file stream under the tenant's partition (e.g. tenants/{tenantCode}/{category}/{uuid}.docx).
     *
     * @param tenantId         The numeric tenant identifier.
     * @param tenantCode       The tenant code or database catalog name (e.g. HELIOS2_TST).
     * @param category         The logical file category (e.g. templates, forms, generated).
     * @param originalFilename The original filename.
     * @param inputStream      The content stream.
     * @return StoredFileMetadata containing relative path, file size, and SHA-256 checksum.
     */
    StoredFileMetadata store(int tenantId, String tenantCode, String category, String originalFilename, InputStream inputStream);

    /**
     * Stores a byte array under the tenant's partition.
     */
    StoredFileMetadata store(int tenantId, String tenantCode, String category, String originalFilename, byte[] content);

    /**
     * Loads physical file content as a byte array.
     *
     * @param relativePath Relative storage path (e.g. tenants/{tenantCode}/templates/{uuid}.docx).
     * @return Raw file bytes.
     */
    byte[] loadAsBytes(String relativePath);

    /**
     * Loads physical file content as an InputStream.
     *
     * @param relativePath Relative storage path.
     * @return Open InputStream.
     */
    InputStream loadAsStream(String relativePath);

    /**
     * Resolves the secure absolute path against dynamic storage root with path-traversal guards.
     */
    Path resolvePath(String relativePath);

    /**
     * Checks if a relative file path exists on disk or network share.
     */
    boolean exists(String relativePath);

    /**
     * Deletes a file by relative path.
     */
    boolean delete(String relativePath);

    /**
     * Returns the current resolved root storage path.
     */
    String getRootLocation();
}

