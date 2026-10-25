package com.example.heliosdocument.service;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardOpenOption;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;

@Service
public class DocumentStorageService {

    private static final Logger log = LoggerFactory.getLogger(DocumentStorageService.class);

    private final Path rootStoragePath;

    public DocumentStorageService(@Value("${helios.documents.storage.path:C:/helios-storage/documents}") String storagePath) {
        this.rootStoragePath = Paths.get(storagePath).toAbsolutePath().normalize();
        try {
            Files.createDirectories(this.rootStoragePath);
            log.info("Initialized DocumentStorageService root at: {}", this.rootStoragePath);
        } catch (IOException e) {
            log.warn("Could not create document storage root directory {}: {}", this.rootStoragePath, e.getMessage());
        }
    }

    public Path storeDocument(int tenantId, String entityType, int entityId, String fileName, byte[] content) throws IOException {
        String safeEntityType = (entityType != null && !entityType.isBlank()) ? entityType.toLowerCase().trim() : "general";
        Path targetDir = rootStoragePath
                .resolve("tenant_" + tenantId)
                .resolve(safeEntityType)
                .resolve(String.valueOf(entityId));

        Files.createDirectories(targetDir);

        Path targetFile = targetDir.resolve(fileName);
        Files.write(targetFile, content, StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING);
        log.info("Stored document binary [{} bytes] at: {}", content.length, targetFile);
        return targetFile;
    }

    public byte[] loadDocumentBytes(String filePath) throws IOException {
        Path path = Paths.get(filePath);
        if (!Files.exists(path)) {
            throw new IOException("Document file not found at path: " + filePath);
        }
        return Files.readAllBytes(path);
    }

    public Resource loadDocumentAsResource(String filePath) throws IOException {
        Path path = Paths.get(filePath);
        if (!Files.exists(path)) {
            throw new IOException("Document file not found at path: " + filePath);
        }
        return new FileSystemResource(path.toFile());
    }

    public boolean deleteDocument(String filePath) {
        try {
            Path path = Paths.get(filePath);
            return Files.deleteIfExists(path);
        } catch (IOException e) {
            log.warn("Failed to delete physical file {}: {}", filePath, e.getMessage());
            return false;
        }
    }

    public Path getRootStoragePath() {
        return rootStoragePath;
    }
}

