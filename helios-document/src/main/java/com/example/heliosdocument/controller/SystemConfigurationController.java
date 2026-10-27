package com.example.heliosdocument.controller;

import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.heliosdocument.config.SystemConfigurationService;
import com.example.heliosdocument.storage.StorageService;

@RestController
@RequestMapping("/api/v1/system-config")
public class SystemConfigurationController {

    private static final Logger log = LoggerFactory.getLogger(SystemConfigurationController.class);

    private final SystemConfigurationService configService;
    private final StorageService storageService;

    public SystemConfigurationController(SystemConfigurationService configService, StorageService storageService) {
        this.configService = configService;
        this.storageService = storageService;
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> getSystemConfigurations() {
        return ResponseEntity.ok(Map.of(
                "configurations", configService.getAllConfigurations(),
                "storageRootPath", configService.getStorageRootPath(),
                "resolvedRootLocation", storageService.getRootLocation()
        ));
    }

    @GetMapping("/{key}")
    public ResponseEntity<Map<String, String>> getConfiguration(@PathVariable("key") String key) {
        String val = configService.getProperty(key);
        if (val == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(Map.of("key", key, "value", val));
    }

    public record ConfigUpdateRequest(String value, String description) {}

    @PutMapping("/{key}")
    public ResponseEntity<Map<String, Object>> updateConfiguration(
            @PathVariable("key") String key,
            @RequestBody ConfigUpdateRequest request
    ) {
        log.info("Updating dynamic system configuration key '{}' to '{}'", key, request.value());
        configService.updateProperty(key, request.value(), request.description());
        return ResponseEntity.ok(Map.of(
                "success", true,
                "key", key,
                "value", request.value(),
                "activeStorageRoot", configService.getStorageRootPath(),
                "message", "Configuration updated and cache refreshed with zero downtime."
        ));
    }

    @PostMapping("/refresh")
    public ResponseEntity<Map<String, Object>> refreshCache() {
        log.info("Manual refresh of SystemConfiguration cache triggered.");
        configService.refreshCache();
        return ResponseEntity.ok(Map.of(
                "success", true,
                "activeStorageRoot", configService.getStorageRootPath(),
                "resolvedRootLocation", storageService.getRootLocation(),
                "message", "SystemConfiguration cache refreshed from dbo.system_configuration successfully."
        ));
    }
}

