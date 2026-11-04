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
import com.example.helios2.service.HeliosRulesRatingService;
import com.example.helios2.service.HeliosRulesRatingService.RatingRequestDto;
import com.example.helios2.service.HeliosRulesRatingService.RatingResponseDto;
import com.example.helios2.service.HeliosService;
import com.example.helios2.service.HeliosService.AddressDto;
import com.example.helios2.service.HeliosService.AddressInput;
import com.example.helios2.service.HeliosService.ClaimDto;
import com.example.helios2.service.HeliosService.CreatePartyRequest;
import com.example.helios2.service.HeliosService.PartyDto;
import com.example.helios2.service.HeliosService.PartyTypeCodeDto;
import com.example.helios2.service.HeliosService.PolicyDto;
import com.example.helios2.service.HeliosService.ProductDto;
import com.example.helios2.service.HeliosService.QuoteDto;
import com.example.helios2.service.HeliosService.RatingPlanDto;
import com.example.helios2.service.HeliosService.SubmissionDto;
import com.example.helios2.service.HeliosService.TaskDto;
import com.example.helios2.service.HeliosService.ZipCodeDto;
import com.example.helios2.service.TenantRegistryService;
import com.example.helios2.tenant.TenantConfig;
import com.example.helios2.tenant.TenantContext;
import com.example.helios2.tenant.TenantRoutingDataSource;
import com.fasterxml.jackson.databind.ObjectMapper;

@RestController
@RequestMapping("/api")
public class HeliosController {

    private final TenantRegistryService tenantRegistryService;
    private final HeliosService heliosService;
    private final TenantRoutingDataSource tenantRoutingDataSource;
    private final HeliosRulesRatingService ratingService;
    private final ObjectMapper objectMapper;

    public HeliosController(
            TenantRegistryService tenantRegistryService,
            HeliosService heliosService,
            TenantRoutingDataSource tenantRoutingDataSource,
            HeliosRulesRatingService ratingService,
            ObjectMapper objectMapper) {
        this.tenantRegistryService = tenantRegistryService;
        this.heliosService = heliosService;
        this.tenantRoutingDataSource = tenantRoutingDataSource;
        this.ratingService = ratingService;
        this.objectMapper = objectMapper;
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

    @GetMapping("/products")
    public List<ProductDto> getProducts() {
        return heliosService.getAllProducts();
    }

    @GetMapping("/products/{productCode}/rating-plan")
    public ResponseEntity<RatingPlanDto> getRatingPlan(@PathVariable("productCode") String productCode) {
        return heliosService.getRatingPlanForProduct(productCode)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping("/rating/calculate")
    public ResponseEntity<RatingResponseDto> calculateRate(@RequestBody RatingRequestDto req) {
        ProductDto product = heliosService.getProductByCode(req.productCode()).orElse(null);
        RatingPlanDto plan = (product != null && product.ratingPlan() != null)
                ? product.ratingPlan()
                : heliosService.getRatingPlanForProduct(req.productCode()).orElse(null);

        RatingResponseDto resp = ratingService.rateQuote(req, product, plan);
        return ResponseEntity.ok(resp);
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
            String planCode,
            String planName,
            String ruleVersionId,
            String stateCode,
            String exposureVal,
            String limitAmt,
            String retentionAmt,
            String scheduleMod,
            String premium,
            String serffTrackingNbr,
            String baseRate,
            String calcTrace,
            String factsJson,
            String status,
            Boolean autoRate,
            Map<String, Object> dynamicAttributes
    ) {
    }

    @PostMapping("/quotes")
    public ResponseEntity<QuoteDto> createQuote(@RequestBody CreateQuoteRequest req) {
        int subId = (req.submsnId() != null) ? req.submsnId() : 0;
        String prodCode = (req.productCode() != null && !req.productCode().isBlank())
                ? req.productCode() : "TECH_EO";

        ProductDto product = heliosService.getProductByCode(prodCode).orElse(null);
        RatingPlanDto plan = (product != null && product.ratingPlan() != null)
                ? product.ratingPlan()
                : heliosService.getRatingPlanForProduct(prodCode).orElse(null);

        String planCode = (req.planCode() != null && !req.planCode().isBlank())
                ? req.planCode()
                : (plan != null ? plan.planCode() : prodCode + "_COMMERCIAL");
        String planName = (req.planName() != null && !req.planName().isBlank())
                ? req.planName()
                : (plan != null ? plan.planName() : planCode);
        String versionId = (req.ruleVersionId() != null && !req.ruleVersionId().isBlank())
                ? req.ruleVersionId()
                : (plan != null ? plan.ruleVersionId() : "v1.0.0");

        String finalPremium = req.premium();
        String finalCalcTrace = req.calcTrace();
        String finalFactsJson = req.factsJson();
        Long calcPremiumCents = null;

        // If autoRate is requested, or if premium is not yet calculated, invoke helios-rules
        boolean shouldRate = Boolean.TRUE.equals(req.autoRate()) || finalPremium == null || finalPremium.isBlank();
        if (shouldRate) {
            RatingRequestDto ratingReq = new RatingRequestDto(
                    subId,
                    null,
                    prodCode,
                    planCode,
                    versionId,
                    req.stateCode(),
                    null,
                    product != null ? product.lineOfBusiness() : null,
                    prodCode,
                    null,
                    req.exposureVal(),
                    req.limitAmt(),
                    req.retentionAmt(),
                    req.scheduleMod(),
                    null,
                    null,
                    req.dynamicAttributes()
            );

            RatingResponseDto ratingResp = ratingService.rateQuote(ratingReq, product, plan);
            finalPremium = ratingResp.calculatedAmount();
            calcPremiumCents = ratingResp.calculatedPremiumCents();
            finalCalcTrace = String.join("\n", ratingResp.executionTrace());
            try {
                finalFactsJson = objectMapper.writeValueAsString(ratingResp.factsOutput());
            } catch (Exception ignored) {}
        }

        QuoteDto created = heliosService.createRatedQuote(
                subId,
                prodCode,
                planCode,
                planName,
                versionId,
                calcPremiumCents,
                req.stateCode(),
                req.exposureVal(),
                req.limitAmt(),
                req.retentionAmt(),
                req.scheduleMod(),
                finalPremium,
                req.serffTrackingNbr(),
                req.baseRate(),
                finalCalcTrace,
                finalFactsJson,
                req.status()
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
        result.put("service", "Helios2 Core Policy & Claims Suite");
        result.put("status", "UP");
        result.put("version", "0.1.0-SNAPSHOT");
        result.put("application", "Helios2 Spring Boot Multi-Tenant Service");
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
    public List<HeliosService.AppUserDto> getUsers() {
        int tenantId = TenantContext.getTenantId();
        return heliosService.getAllUsers(tenantId);
    }

    @PostMapping("/users")
    public ResponseEntity<?> createUser(@RequestBody HeliosService.AppUserDto user) {
        int activeTenantId = TenantContext.getTenantId();
        if (user.tenantId() != activeTenantId) {
            return ResponseEntity.status(403).body(Map.of("error", "Forbidden", "message", "Cross-tenant access violation: user tenant does not match active realm."));
        }
        HeliosService.AppUserDto saved = heliosService.saveUser(user);
        return ResponseEntity.ok(saved);
    }

    @org.springframework.web.bind.annotation.PutMapping("/users/{userId}")
    public ResponseEntity<?> updateUser(
            @org.springframework.web.bind.annotation.PathVariable("userId") int userId,
            @RequestBody HeliosService.AppUserDto user) {
        int activeTenantId = TenantContext.getTenantId();
        if (user.tenantId() != activeTenantId) {
            return ResponseEntity.status(403).body(Map.of("error", "Forbidden", "message", "Cross-tenant access violation: user tenant does not match active realm."));
        }
        HeliosService.AppUserDto toSave = new HeliosService.AppUserDto(
                userId,
                activeTenantId,
                user.username(),
                user.email(),
                user.displayName(),
                user.roleCode(),
                user.roleName(),
                user.department(),
                user.defaultTier1Nav(),
                user.defaultTier2NavUw(),
                user.defaultTier2NavClaims(),
                user.allowedTier2Nav(),
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
            @org.springframework.web.bind.annotation.PathVariable("userId") int userId) {
        int tenantId = TenantContext.getTenantId();
        boolean ok = heliosService.deleteUser(userId, tenantId);
        return ResponseEntity.ok(Map.of("success", ok, "userId", userId));
    }
}
