package com.example.helios2.controller;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.example.helios2.config.SqlServerDataSourceFactory;
import com.example.helios2.service.HeliosService;
import com.example.helios2.service.HeliosService.PartyDto;
import com.example.helios2.service.HeliosService.SubmissionDto;
import com.example.helios2.service.TenantRegistryService;
import com.example.helios2.tenant.TenantConfig;
import com.example.helios2.tenant.TenantContext;
import com.example.helios2.tenant.TenantRoutingDataSource;

@RestController
@RequestMapping("/api")
public class HeliosController {

    private final TenantRegistryService tenantRegistryService;
    private final HeliosService heliosService;
    private final TenantRoutingDataSource tenantRoutingDataSource;

    public HeliosController(
            TenantRegistryService tenantRegistryService,
            HeliosService heliosService,
            TenantRoutingDataSource tenantRoutingDataSource) {
        this.tenantRegistryService = tenantRegistryService;
        this.heliosService = heliosService;
        this.tenantRoutingDataSource = tenantRoutingDataSource;
    }

    @GetMapping("/tenants")
    public List<TenantConfig> getTenants() {
        return tenantRegistryService.getAllTenants();
    }

    @PostMapping("/tenants")
    public ResponseEntity<TenantConfig> saveTenant(@RequestBody TenantConfig config) {
        TenantConfig saved = tenantRegistryService.registerOrUpdateTenant(config);
        tenantRoutingDataSource.evictTenantDataSource(config.tenantId());
        return ResponseEntity.ok(saved);
    }

    @GetMapping("/submissions")
    public List<SubmissionDto> getSubmissions() {
        return heliosService.getAllSubmissions();
    }

    public record CreateSubmissionRequest(int partyId) {
    }

    @PostMapping("/submissions")
    public ResponseEntity<SubmissionDto> createSubmission(@RequestBody CreateSubmissionRequest request) {
        SubmissionDto created = heliosService.createSubmission(request.partyId());
        return ResponseEntity.ok(created);
    }

    @GetMapping("/parties")
    public List<PartyDto> searchParties(@RequestParam(name = "q", required = false) String query) {
        return heliosService.searchParties(query);
    }

    public record CreatePartyRequest(String orgName) {
    }

    @PostMapping("/parties")
    public ResponseEntity<PartyDto> createParty(@RequestBody CreatePartyRequest request) {
        PartyDto created = heliosService.createParty(request.orgName());
        return ResponseEntity.ok(created);
    }

    @GetMapping("/diagnostics")
    public Map<String, Object> getDiagnostics() {
        int activeTenantId = TenantContext.getTenantId();
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("application", "Helios2 Spring Boot Multi-Tenant Service");
        result.put("osAndArch", System.getProperty("os.name") + " (" + System.getProperty("os.arch") + ")");
        result.put("javaRuntime", System.getProperty("java.runtime.version"));
        result.put("processUser", System.getProperty("user.name"));
        result.put("authMode", SqlServerDataSourceFactory.isWindows() ? "Windows Integrated Auth (Native DLL)" : "JavaKerberos (JAAS)");
        result.put("serverTime", LocalDateTime.now().toString());
        result.put("activeTenantId", activeTenantId);
        result.put("activeTenantConfig", tenantRegistryService.getTenantById(activeTenantId).orElse(null));
        result.put("masterDatabase", tenantRegistryService.pingMasterDatabase());
        result.put("tenantDatabase", heliosService.pingTenantDatabase());
        return result;
    }
}

