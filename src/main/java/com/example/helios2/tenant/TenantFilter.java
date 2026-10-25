package com.example.helios2.tenant;

import java.io.IOException;

import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Component
public class TenantFilter extends OncePerRequestFilter {

    public static final String TENANT_HEADER = "X-Tenant-ID";

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {

        String tenantParam = request.getHeader(TENANT_HEADER);
        if (tenantParam == null || tenantParam.isBlank()) {
            tenantParam = request.getParameter("tenantId");
        }

        int tenantId = TenantContext.DEFAULT_TENANT_ID;
        if (tenantParam != null && !tenantParam.isBlank()) {
            try {
                tenantId = Integer.parseInt(tenantParam.trim());
            } catch (NumberFormatException ignored) {
                tenantId = TenantContext.DEFAULT_TENANT_ID;
            }
        }

        TenantContext.setTenantId(tenantId);
        try {
            filterChain.doFilter(request, response);
        } finally {
            TenantContext.clear();
        }
    }
}

