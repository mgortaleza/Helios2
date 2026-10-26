package com.example.helios2.tenant;

import java.io.IOException;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import com.example.helios2.service.TenantRegistryService;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;

@Component
public class TenantFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(TenantFilter.class);

    public static final String TENANT_HEADER = "X-Tenant-ID";
    public static final String SESSION_AUTH_TENANT_ID = "AUTH_TENANT_ID";
    public static final String SESSION_AUTH_USER = "AUTH_USER";

    private final TenantRegistryService tenantRegistryService;

    public TenantFilter(TenantRegistryService tenantRegistryService) {
        this.tenantRegistryService = tenantRegistryService;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {

        String path = request.getRequestURI();
        HttpSession session = request.getSession(false);
        Integer sessionTenantId = null;
        if (session != null && session.getAttribute(SESSION_AUTH_TENANT_ID) != null) {
            sessionTenantId = (Integer) session.getAttribute(SESSION_AUTH_TENANT_ID);
        }

        String tenantHeader = request.getHeader(TENANT_HEADER);
        Integer headerTenantId = null;
        if (tenantHeader != null && !tenantHeader.isBlank()) {
            try {
                headerTenantId = Integer.parseInt(tenantHeader.trim());
            } catch (NumberFormatException e) {
                log.warn("Invalid X-Tenant-ID header format: '{}' from IP: {}", tenantHeader, request.getRemoteAddr());
                response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                response.setContentType("application/json");
                response.getWriter().write("{\"error\":\"Bad Request\",\"message\":\"Invalid X-Tenant-ID header format. Must be an integer.\"}");
                return;
            }
        }

        int targetTenantId;

        // VULNERABILITY MITIGATION 1: Authenticated session tenant binding (Anti-Tenant Hopping / IDOR)
        if (sessionTenantId != null && sessionTenantId > 0) {
            // If the user has an active authenticated session, lock execution strictly to the session's realm
            if (headerTenantId != null && !headerTenantId.equals(sessionTenantId)) {
                log.warn("Security Alert: Cross-tenant access attempt blocked! Session tenant: {}, requested header tenant: {}, user: {}, path: {}",
                        sessionTenantId, headerTenantId, session.getAttribute(SESSION_AUTH_USER), path);
                response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                response.setContentType("application/json");
                response.getWriter().write("{\"error\":\"Forbidden\",\"message\":\"Cross-tenant access violation: Requested X-Tenant-ID does not match authenticated session realm.\"}");
                return;
            }
            targetTenantId = sessionTenantId;
        } else {
            // Unauthenticated request (Auth realm discovery, login, or public endpoints)
            if (headerTenantId != null) {
                targetTenantId = headerTenantId;
            } else {
                // Check query parameter only on auth endpoints; do not allow query parameter spoofing on business APIs
                String tenantParam = request.getParameter("tenantId");
                if (tenantParam != null && !tenantParam.isBlank() && path.contains("/auth/")) {
                    try {
                        targetTenantId = Integer.parseInt(tenantParam.trim());
                    } catch (NumberFormatException ignored) {
                        targetTenantId = TenantContext.DEFAULT_TENANT_ID;
                    }
                } else {
                    targetTenantId = TenantContext.DEFAULT_TENANT_ID;
                }
            }

            // VULNERABILITY MITIGATION 2: Tenant Existence & Validation Check
            if (targetTenantId <= 0 || !tenantRegistryService.isValidTenantId(targetTenantId)) {
                log.warn("Security Alert: Invalid or non-existent tenant ID requested: {} on path {}", targetTenantId, path);
                response.setStatus(HttpServletResponse.SC_NOT_FOUND);
                response.setContentType("application/json");
                response.getWriter().write("{\"error\":\"Not Found\",\"message\":\"Tenant realm #" + targetTenantId + " does not exist in master registry.\"}");
                return;
            }
        }

        TenantContext.setTenantId(targetTenantId);
        response.setHeader(TENANT_HEADER, String.valueOf(targetTenantId));

        try {
            filterChain.doFilter(request, response);
        } finally {
            // VULNERABILITY MITIGATION 5: ThreadLocal cleanup to prevent thread pool contamination
            TenantContext.clear();
        }
    }
}
