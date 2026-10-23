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
import com.example.helios2.service.HeliosService.ClaimDto;
import com.example.helios2.service.HeliosService.PartyDto;
import com.example.helios2.service.HeliosService.PolicyDto;
import com.example.helios2.service.HeliosService.QuoteDto;
import com.example.helios2.service.HeliosService.SubmissionDto;
import com.example.helios2.service.HeliosService.TaskDto;
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

    @GetMapping("/roles")
    public List<TenantRegistryService.TenantRoleDto> getRoles(
            @RequestParam(name = "tenantId", required = false) Integer tenantIdParam) {
        int targetTenantId = (tenantIdParam != null) ? tenantIdParam : TenantContext.getTenantId();
        return tenantRegistryService.getRolesForTenant(targetTenantId);
    }

    @PostMapping("/roles")
    public ResponseEntity<TenantRegistryService.TenantRoleDto> saveRole(
            @RequestBody TenantRegistryService.TenantRoleDto role) {
        return ResponseEntity.ok(tenantRegistryService.saveRoleForTenant(role));
    }

    @GetMapping("/tasks")
    public List<TaskDto> getTasks() {
        return heliosService.getAllTasks();
    }

    public record CreateTaskRequest(String title, String type, String subType, String relatedRecord, String status, String dueDate) {
    }

    @PostMapping("/tasks")
    public ResponseEntity<TaskDto> createTask(@RequestBody CreateTaskRequest req) {
        TaskDto created = heliosService.createTask(
                req.title(),
                req.type(),
                req.subType(),
                req.relatedRecord(),
                req.status(),
                req.dueDate()
        );
        return ResponseEntity.ok(created);
    }

    @GetMapping("/policies")
    public List<PolicyDto> searchPolicies(
            @RequestParam(name = "name", required = false) String name,
            @RequestParam(name = "address", required = false) String address,
            @RequestParam(name = "productType", required = false) String productType,
            @RequestParam(name = "fileStatus", required = false) String fileStatus) {
        return heliosService.searchPolicies(name, address, productType, fileStatus);
    }

    @GetMapping("/submissions")
    public List<SubmissionDto> getSubmissions() {
        return heliosService.getAllSubmissions();
    }

    public record CreateSubmissionRequest(
            int partyId,
            String underwriter,
            String limit,
            String retention,
            String premium
    ) {
    }

    @PostMapping("/submissions")
    public ResponseEntity<SubmissionDto> createSubmission(@RequestBody CreateSubmissionRequest request) {
        SubmissionDto created = heliosService.createSubmissionWithDetails(
                request.partyId(),
                request.underwriter(),
                request.limit(),
                request.retention(),
                request.premium()
        );
        return ResponseEntity.ok(created);
    }

    @GetMapping("/quotes")
    public List<QuoteDto> getQuotes(@RequestParam(name = "submsnId", required = false) Integer submsnId) {
        if (submsnId != null) {
            return heliosService.getQuotesBySubmission(submsnId);
        }
        return heliosService.getAllQuotes();
    }

    public record CreateQuoteRequest(
            Integer submsnId,
            String productCode,
            String stateCode,
            String exposureVal,
            String limitAmt,
            String retentionAmt,
            String scheduleMod,
            String premium,
            String serffTrackingNbr,
            String baseRate,
            String calcTrace,
            String status
    ) {
    }

    @PostMapping("/quotes")
    public ResponseEntity<QuoteDto> createQuote(@RequestBody CreateQuoteRequest req) {
        int subId = (req.submsnId() != null) ? req.submsnId() : 0;
        QuoteDto created = heliosService.createRatedQuote(
                subId,
                req.productCode(),
                req.stateCode(),
                req.exposureVal(),
                req.limitAmt(),
                req.retentionAmt(),
                req.scheduleMod(),
                req.premium(),
                req.serffTrackingNbr(),
                req.baseRate(),
                req.calcTrace(),
                req.status()
        );
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

    @GetMapping("/claims")
    public List<ClaimDto> getClaims() {
        return heliosService.getAllClaims();
    }

    public record CreateClaimRequest(
            String policyNbr,
            String insuredName,
            String productType,
            String lossDate,
            String reserveAmt,
            String description
    ) {
    }

    @PostMapping("/claims")
    public ResponseEntity<ClaimDto> createClaim(@RequestBody CreateClaimRequest request) {
        ClaimDto created = heliosService.createClaim(
                request.policyNbr(),
                request.insuredName(),
                request.productType(),
                request.lossDate(),
                request.reserveAmt(),
                request.description()
        );
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
