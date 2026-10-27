package com.example.heliosdocument.storage;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardOpenOption;
import java.security.DigestInputStream;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import com.example.heliosdocument.config.SystemConfigurationService;

/**
 * Enterprise FileSystem Storage Service implementation.
 * Supports local paths (e.g. C:/helios-storage) and Windows UNC shares (e.g. \\fileserver\share).
 * Enforces path traversal security and returns sanitized relative paths for database persistence.
 */
@Service
public class FileSystemStorageService implements StorageService {

    private static final Logger log = LoggerFactory.getLogger(FileSystemStorageService.class);

    private final SystemConfigurationService configService;

    public FileSystemStorageService(SystemConfigurationService configService) {
        this.configService = configService;
    }

    @Override
    public StoredFileMetadata store(int tenantId, String tenantCode, String category, String originalFilename, InputStream inputStream) {
        try {
            Path root = getRootPath();
            String cleanTenantCode = sanitizeToken(tenantCode != null && !tenantCode.isBlank() ? tenantCode : ("tenant_" + tenantId));
            String cleanCategory = sanitizeToken(category != null && !category.isBlank() ? category : "general");

            String ext = "";
            String baseName = "file";
            if (originalFilename != null && originalFilename.contains(".")) {
                int dotIdx = originalFilename.lastIndexOf('.');
                ext = originalFilename.substring(dotIdx);
                baseName = originalFilename.substring(0, dotIdx);
            }
            String cleanBaseName = sanitizeFilename(baseName);
            String uniqueFilename = UUID.randomUUID() + (ext.isBlank() ? ".bin" : ext);

            // Relative path always uses forward slashes: tenants/{tenantCode}/{category}/{uuid.ext}
            String relativePath = String.format("tenants/%s/%s/%s", cleanTenantCode, cleanCategory, uniqueFilename);

            // Resolve target absolute path and enforce path traversal security guard
            Path targetPath = resolvePath(relativePath);
            Files.createDirectories(targetPath.getParent());

            // Compute SHA-256 while streaming bytes to target disk/share
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            long bytesWritten = 0;

            try (DigestInputStream dis = new DigestInputStream(inputStream, digest);
                 OutputStream out = Files.newOutputStream(targetPath, StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING, StandardOpenOption.WRITE)) {
                bytesWritten = dis.transferTo(out);
            }

            String sha256Hex = HexFormat.of().formatHex(digest.digest());
            String mimeType = Files.probeContentType(targetPath);
            if (mimeType == null) {
                mimeType = "application/octet-stream";
            }

            log.info("Stored file: '{}' ({} bytes, SHA-256: {}) in partition '{}'", relativePath, bytesWritten, sha256Hex, cleanTenantCode);

            return new StoredFileMetadata(
                    relativePath,
                    originalFilename != null ? originalFilename : uniqueFilename,
                    bytesWritten,
                    sha256Hex,
                    mimeType,
                    LocalDateTime.now()
            );
        } catch (NoSuchAlgorithmException | IOException e) {
            log.error("Failed to store file for tenant #{}: {}", tenantId, e.getMessage(), e);
            throw new RuntimeException("Failed to persist file to storage: " + e.getMessage(), e);
        }
    }

    @Override
    public StoredFileMetadata store(int tenantId, String tenantCode, String category, String originalFilename, byte[] content) {
        return store(tenantId, tenantCode, category, originalFilename, new ByteArrayInputStream(content));
    }

    @Override
    public byte[] loadAsBytes(String relativePath) {
        try {
            Path targetPath = resolvePath(relativePath);
            if (!Files.exists(targetPath)) {
                throw new IllegalArgumentException("File not found at relative path: " + relativePath);
            }
            return Files.readAllBytes(targetPath);
        } catch (IOException e) {
            log.error("Failed to load file '{}': {}", relativePath, e.getMessage(), e);
            throw new RuntimeException("Failed to read file from storage: " + e.getMessage(), e);
        }
    }

    @Override
    public InputStream loadAsStream(String relativePath) {
        try {
            Path targetPath = resolvePath(relativePath);
            if (!Files.exists(targetPath)) {
                throw new IllegalArgumentException("File not found at relative path: " + relativePath);
            }
            return Files.newInputStream(targetPath, StandardOpenOption.READ);
        } catch (IOException e) {
            log.error("Failed to open input stream for file '{}': {}", relativePath, e.getMessage(), e);
            throw new RuntimeException("Failed to open storage stream: " + e.getMessage(), e);
        }
    }

    @Override
    public Path resolvePath(String relativePath) {
        if (relativePath == null || relativePath.isBlank()) {
            throw new IllegalArgumentException("Relative path cannot be null or blank");
        }

        Path rootLocation = getRootPath();
        // Normalize slashes
        String cleanRel = relativePath.trim().replace('\\', '/');
        if (cleanRel.startsWith("/")) {
            cleanRel = cleanRel.substring(1);
        }

        Path resolved = rootLocation.resolve(cleanRel).normalize().toAbsolutePath();

        // Path-traversal security guard
        if (!resolved.startsWith(rootLocation)) {
            log.warn("Security Alert: Path traversal attempt blocked! Relative: '{}', Resolved: '{}', Root: '{}'",
                    relativePath, resolved, rootLocation);
            throw new SecurityException("Access denied: Path traversal outside configured root storage location.");
        }

        return resolved;
    }

    @Override
    public boolean exists(String relativePath) {
        try {
            Path path = resolvePath(relativePath);
            return Files.exists(path);
        } catch (Exception e) {
            return false;
        }
    }

    @Override
    public boolean delete(String relativePath) {
        try {
            Path path = resolvePath(relativePath);
            return Files.deleteIfExists(path);
        } catch (IOException e) {
            log.error("Failed to delete file '{}': {}", relativePath, e.getMessage());
            return false;
        }
    }

    @Override
    public String getRootLocation() {
        return getRootPath().toString();
    }

    private Path getRootPath() {
        String rawRoot = configService.getStorageRootPath();
        Path root = Paths.get(rawRoot).normalize().toAbsolutePath();
        if (!Files.exists(root)) {
            try {
                Files.createDirectories(root);
                log.info("Initialized root storage directory: '{}'", root);
            } catch (IOException e) {
                log.warn("Could not create storage root '{}' automatically: {}", root, e.getMessage());
            }
        }
        return root;
    }

    private String sanitizeToken(String raw) {
        if (raw == null) return "default";
        return raw.replaceAll("[^a-zA-Z0-9_-]", "_");
    }

    private String sanitizeFilename(String raw) {
        if (raw == null) return "file";
        return raw.replaceAll("[^a-zA-Z0-9._-]", "_");
    }
}

