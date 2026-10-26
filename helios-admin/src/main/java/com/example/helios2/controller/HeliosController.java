package com.example.helios2.controller;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.example.helios2.config.SqlServerDataSourceFactory;
import com.example.helios2.service.HeliosService;
import com.example.helios2.service.HeliosService.AddressDto;
import com.example.helios2.service.HeliosService.AddressInput;
import com.example.helios2.service.HeliosService.ClaimDto;
import com.example.helios2.service.HeliosService.CreatePartyRequest;
import com.example.helios2.service.HeliosService.PartyDto;
import com.example.helios2.service.HeliosService.PartyTypeCodeDto;
import com.example.helios2.service.HeliosService.PolicyDto;
import com.example.helios2.service.HeliosService.SubmissionDto;
import com.example.helios2.service.HeliosService.TaskDto;
import com.example.helios2.service.HeliosService.ZipCodeDto;
import com.example.helios2.service.ServiceRegistryService;
import com.example.helios2.service.ServiceRegistryService.ServiceCatalogDto;
import com.example.helios2.service.TenantRegistryService;
import com.example.helios2.tenant.TenantConfig;
import com.example.helios2.tenant.TenantContext;
import com.example.helios2.tenant.TenantRoutingDataSource;

@RestController
@RequestMapping("/api")
public class HeliosController {

    private final TenantRegistryService tenantRegistryService;
    private final ServiceRegistryService serviceRegistryService;
    private final HeliosService heliosService;
    private final TenantRoutingDataSource tenantRoutingDataSource;

    public HeliosController(
            TenantRegistryService tenantRegistryService,
            ServiceRegistryService serviceRegistryService,
            HeliosService heliosService,
            TenantRoutingDataSource tenantRoutingDataSource) {
        this.tenantRegistryService = tenantRegistryService;
        this.serviceRegistryService = serviceRegistryService;
        this.heliosService = heliosService;
        this.tenantRoutingDataSource = tenantRoutingDataSource;
    }

    @GetMapping("/services")
    public List<ServiceCatalogDto> getServices() {
        return serviceRegistryService.getActiveServices();
    }

    @PostMapping("/services")
    public ResponseEntity<ServiceCatalogDto> saveService(@RequestBody ServiceCatalogDto serviceDto) {
        ServiceCatalogDto saved = serviceRegistryService.saveService(serviceDto);
        return ResponseEntity.ok(saved);
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

    @GetMapping("/tenants/next-id")
    public ResponseEntity<Map<String, Object>> getNextTenantId() {
        int nextId = tenantRegistryService.getNextTenantId();
        return ResponseEntity.ok(Map.of("nextTenantId", nextId));
    }

    @DeleteMapping("/tenants/{tenantId}")
    public ResponseEntity<Map<String, Object>> deleteTenant(@PathVariable("tenantId") int tenantId) {
        boolean deleted = tenantRegistryService.deleteTenant(tenantId);
        tenantRoutingDataSource.evictTenantDataSource(tenantId);
        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("success", deleted);
        resp.put("tenantId", tenantId);
        resp.put("message", deleted
                ? "Tenant #" + tenantId + " removed from application registry. Physical database remains preserved."
                : "Tenant #" + tenantId + " not found.");
        return ResponseEntity.ok(resp);
    }

    @PostMapping("/tenants/provision")
    public ResponseEntity<Map<String, Object>> provisionTenant(@RequestBody TenantRegistryService.ProvisionTenantRequest req) {
        Map<String, Object> result = tenantRegistryService.provisionNewTenant(req);
        Integer tid = (Integer) result.get("tenantId");
        if (tid != null) {
            tenantRoutingDataSource.evictTenantDataSource(tid);
        }
        return ResponseEntity.ok(result);
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
            String premium,
            Integer agencyId,
            String agencyInfo
    ) {
        public CreateSubmissionRequest(int partyId, String underwriter, String limit, String retention, String premium) {
            this(partyId, underwriter, limit, retention, premium, null, null);
        }
    }

    @PostMapping("/submissions")
    public ResponseEntity<SubmissionDto> createSubmission(@RequestBody CreateSubmissionRequest request) {
        SubmissionDto created = heliosService.createSubmissionWithDetails(
                request.partyId(),
                request.underwriter(),
                request.limit(),
                request.retention(),
                request.premium(),
                request.agencyId(),
                request.agencyInfo()
        );
        return ResponseEntity.ok(created);
    }

    @GetMapping("/party-types")
    public List<PartyTypeCodeDto> getPartyTypes() {
        return heliosService.getPartyTypeCodes();
    }

    @GetMapping("/parties")
    public List<PartyDto> searchParties(
            @RequestParam(name = "q", required = false) String query,
            @RequestParam(name = "address", required = false) String address,
            @RequestParam(name = "street", required = false) String street,
            @RequestParam(name = "city", required = false) String city,
            @RequestParam(name = "state", required = false) String state,
            @RequestParam(name = "zip", required = false) String zip,
            @RequestParam(name = "partyType", required = false) String partyType,
            @RequestParam(name = "partySubType", required = false) String partySubType) {
        return heliosService.searchParties(query, address, street, city, state, zip, partyType, partySubType);
    }

    @PostMapping("/parties")
    public ResponseEntity<PartyDto> createParty(@RequestBody CreatePartyRequest request) {
        PartyDto created = heliosService.createParty(request);
        return ResponseEntity.ok(created);
    }

    @GetMapping("/parties/{partyId}/addresses")
    public List<AddressDto> getPartyAddresses(@PathVariable("partyId") int partyId) {
        return heliosService.getPartyAddresses(partyId);
    }

    public record UpdateAddressRequest(
            AddressInput address,
            String changedBy,
            String changeReason
    ) {
    }

    @PutMapping("/parties/{partyId}/address")
    public ResponseEntity<AddressDto> updatePartyAddress(
            @PathVariable("partyId") int partyId,
            @RequestBody UpdateAddressRequest request) {
        AddressDto updated = heliosService.updatePartyAddress(
                partyId,
                request.address(),
                request.changedBy(),
                request.changeReason()
        );
        return ResponseEntity.ok(updated);
    }

    @GetMapping("/zip-codes/{zipCode}")
    public ResponseEntity<ZipCodeDto> lookupZipCode(@PathVariable("zipCode") String zipCode) {
        ZipCodeDto dto = heliosService.lookupZipCode(zipCode);
        if (dto == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(dto);
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
        result.put("service", "HeliosAdmin Control Plane & RBAC Manager");
        result.put("status", "UP");
        result.put("version", "1.0.0-SNAPSHOT");
        result.put("application", "HeliosAdmin Platform Control Plane");
        result.put("osAndArch", System.getProperty("os.name") + " (" + System.getProperty("os.arch") + ")");
        result.put("javaRuntime", System.getProperty("java.runtime.version"));
        result.put("processUser", System.getProperty("user.name"));
        result.put("authMode", SqlServerDataSourceFactory.isWindows() ? "Windows Integrated Auth (Native DLL)" : "JavaKerberos (JAAS)");
        result.put("serverTime", LocalDateTime.now().toString());

        Runtime rt = Runtime.getRuntime();
        long totalMem = rt.totalMemory();
        long freeMem = rt.freeMemory();
        long maxMem = rt.maxMemory();
        result.put("usedMemoryMb", (totalMem - freeMem) / (1024 * 1024));
        result.put("totalMemoryMb", totalMem / (1024 * 1024));
        result.put("maxMemoryMb", maxMem / (1024 * 1024));
        result.put("availableProcessors", rt.availableProcessors());
        result.put("activeThreads", Thread.activeCount());

        result.put("activeTenantId", activeTenantId);
        result.put("activeTenantConfig", tenantRegistryService.getTenantById(activeTenantId).orElse(null));
        result.put("masterDatabase", tenantRegistryService.pingMasterDatabase());
        result.put("tenantDatabase", heliosService.pingTenantDatabase());
        return result;
    }

    @GetMapping("/diagnostics/gmailcap")
    public ResponseEntity<Map<String, Object>> getGmailCapDiagnostics() {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("service", "gmailcap");
        result.put("application", "Helios GmailCap Python Ingestion Service");
        result.put("executionMode", "Python Scheduled Daemon");
        result.put("interval", "60s (Every 1 minute)");
        result.put("targetInbox", "C:\\helios-storage\\documents\\tenant_1\\inbox");
        result.put("logDirectory", "C:\\helios-storage\\logs");
        result.put("serverTime", LocalDateTime.now().toString());

        List<java.nio.file.Path> candidates = List.of(
                java.nio.file.Path.of("C:", "helios-storage", "logs", "gmailcap_status.json"),
                java.nio.file.Path.of("C:", "helios-storage", "log", "gmailcap_status.json"),
                java.nio.file.Path.of("C:", "helios-storage", "logs", "gmailcap.json"),
                java.nio.file.Path.of("C:", "helios-storage", "gmailcap_status.json")
        );

        java.nio.file.Path found = null;
        for (java.nio.file.Path p : candidates) {
            if (java.nio.file.Files.exists(p)) {
                found = p;
                break;
            }
        }

        if (found != null) {
            try {
                long lastModified = java.nio.file.Files.getLastModifiedTime(found).toMillis();
                long secondsAgo = Math.max(0, (System.currentTimeMillis() - lastModified) / 1000);
                result.put("statusFile", found.toString());
                result.put("lastModifiedSecondsAgo", secondsAgo);

                String content = java.nio.file.Files.readString(found);
                com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
                Map<?, ?> parsed = mapper.readValue(content, Map.class);
                parsed.forEach((k, v) -> result.put(String.valueOf(k), v));

                if (secondsAgo <= 180) {
                    result.put("status", "UP");
                    result.put("health", "ONLINE");
                } else {
                    result.put("status", "DEGRADED");
                    result.put("health", "STALE");
                    result.put("warning", "Heartbeat stale: last run was " + secondsAgo + "s ago (expected every 60s)");
                }
            } catch (Exception e) {
                result.put("status", "DEGRADED");
                result.put("health", "PARSE_ERROR");
                result.put("error", "Error reading status file: " + e.getMessage());
            }
        } else {
            result.put("status", "UP");
            result.put("health", "PENDING_FIRST_RUN");
            result.put("statusFileExpected", "C:\\helios-storage\\logs\\gmailcap_status.json");
            result.put("note", "Log folder active. Waiting for Python service to output heartbeat JSON.");
        }

        return ResponseEntity.ok(result);
    }

    public record LoginRequest(Integer tenantId, String username, String password) {}

    @GetMapping("/auth/users")
    public List<HeliosService.AppUserDto> getAuthUsers(
            @RequestParam(name = "tenantId", required = false) Integer tenantIdParam) {
        int tenantId = (tenantIdParam != null && tenantIdParam > 0) ? tenantIdParam : TenantContext.getTenantId();
        TenantContext.setTenantId(tenantId);
        return heliosService.getAllUsers(tenantId);
    }

    @PostMapping("/auth/login")
    public ResponseEntity<?> login(
            @RequestParam(name = "tenantId", required = false) Integer queryTenantId,
            @RequestBody LoginRequest req,
            jakarta.servlet.http.HttpServletRequest request) {
        int tenantId = (req.tenantId() != null && req.tenantId() > 0) ? req.tenantId()
                : (queryTenantId != null && queryTenantId > 0) ? queryTenantId
                : TenantContext.getTenantId();

        if (!tenantRegistryService.isValidTenantId(tenantId)) {
            return ResponseEntity.status(404).body(Map.of("success", false, "message", "Tenant realm #" + tenantId + " does not exist."));
        }

        TenantContext.setTenantId(tenantId);
        Map<String, Object> result = heliosService.authenticate(tenantId, req.username(), req.password());
        if (Boolean.TRUE.equals(result.get("success"))) {
            jakarta.servlet.http.HttpSession session = request.getSession(true);
            session.setAttribute(com.example.helios2.tenant.TenantFilter.SESSION_AUTH_USER, result.get("user"));
            session.setAttribute(com.example.helios2.tenant.TenantFilter.SESSION_AUTH_TENANT_ID, tenantId);
            return ResponseEntity.ok(result);
        } else {
            return ResponseEntity.status(401).body(result);
        }
    }

    @PostMapping("/auth/logout")
    public ResponseEntity<?> logout(jakarta.servlet.http.HttpServletRequest request) {
        jakarta.servlet.http.HttpSession session = request.getSession(false);
        if (session != null) {
            session.removeAttribute(com.example.helios2.tenant.TenantFilter.SESSION_AUTH_USER);
            session.removeAttribute(com.example.helios2.tenant.TenantFilter.SESSION_AUTH_TENANT_ID);
            session.invalidate();
        }
        TenantContext.clear();
        return ResponseEntity.ok(Map.of("success", true, "message", "Session invalidated and cached tenant context reset."));
    }

    @GetMapping("/auth/session")
    public ResponseEntity<?> getAuthSession(jakarta.servlet.http.HttpServletRequest request) {
        jakarta.servlet.http.HttpSession session = request.getSession(false);
        if (session != null && session.getAttribute(com.example.helios2.tenant.TenantFilter.SESSION_AUTH_USER) != null) {
            return ResponseEntity.ok(Map.of(
                    "authenticated", true,
                    "user", session.getAttribute(com.example.helios2.tenant.TenantFilter.SESSION_AUTH_USER),
                    "tenantId", session.getAttribute(com.example.helios2.tenant.TenantFilter.SESSION_AUTH_TENANT_ID)
            ));
        }
        return ResponseEntity.ok(Map.of("authenticated", false));
    }

    @GetMapping("/users")
    public List<HeliosService.AppUserDto> getUsers(
            @RequestParam(name = "tenantId", required = false) Integer tenantIdParam) {
        int tenantId = (tenantIdParam != null && tenantIdParam > 0) ? tenantIdParam : TenantContext.getTenantId();
        TenantContext.setTenantId(tenantId);
        return heliosService.getAllUsers(tenantId);
    }

    @PostMapping("/users")
    public ResponseEntity<HeliosService.AppUserDto> createUser(@RequestBody HeliosService.AppUserDto user) {
        TenantContext.setTenantId(user.tenantId());
        HeliosService.AppUserDto saved = heliosService.saveUser(user);
        return ResponseEntity.ok(saved);
    }

    @org.springframework.web.bind.annotation.PutMapping("/users/{userId}")
    public ResponseEntity<HeliosService.AppUserDto> updateUser(
            @org.springframework.web.bind.annotation.PathVariable("userId") int userId,
            @RequestBody HeliosService.AppUserDto user) {
        TenantContext.setTenantId(user.tenantId());
        HeliosService.AppUserDto toSave = new HeliosService.AppUserDto(
                userId,
                user.tenantId(),
                user.username(),
                user.email(),
                user.displayName(),
                user.roleCode(),
                user.roleName(),
                user.department(),
                user.authProvider(),
                user.externalSubjectId(),
                user.active(),
                user.createdDt(),
                user.lastLoginDt()
        );
        HeliosService.AppUserDto saved = heliosService.saveUser(toSave);
        return ResponseEntity.ok(saved);
    }

    @org.springframework.web.bind.annotation.DeleteMapping("/users/{userId}")
    public ResponseEntity<Map<String, Object>> deleteUser(
            @org.springframework.web.bind.annotation.PathVariable("userId") int userId,
            @RequestParam(name = "tenantId", required = false) Integer tenantIdParam) {
        int tenantId = (tenantIdParam != null && tenantIdParam > 0) ? tenantIdParam : TenantContext.getTenantId();
        boolean ok = heliosService.deleteUser(userId, tenantId);
        return ResponseEntity.ok(Map.of("success", ok, "userId", userId));
    }
}
