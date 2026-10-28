import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { setGlobalTenantId } from './tenantContext.jsx';

const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes

export function resolveUserDefaultTier1(user) {
  if (!user) return 'dashboard';
  const raw = (user.defaultTier1Nav || '').toLowerCase().trim();
  if (raw === 'underwriting' || raw === 'claims' || raw === 'dashboard') {
    return raw;
  }
  const role = (user.roleCode || '').toUpperCase();
  if (role.includes('UNDERWRITER') || role === 'UW') return 'underwriting';
  if (role.includes('CLAIM')) return 'claims';
  return 'dashboard';
}

const AuthContext = createContext({
  currentUser: null,
  sessionNotice: null,
  login: () => {},
  logout: () => {},
  resolveUserDefaultTier1
});

export function AuthProvider({ children }) {
  const [sessionNotice, setSessionNotice] = useState(() => {
    try {
      const savedUser = localStorage.getItem('helios_auth_user');
      const lastActiveStr = localStorage.getItem('helios_last_active');
      if (savedUser && lastActiveStr) {
        const lastActive = Number(lastActiveStr);
        if (!isNaN(lastActive) && lastActive > 0 && Date.now() - lastActive > INACTIVITY_TIMEOUT_MS) {
          localStorage.removeItem('helios_auth_user');
          localStorage.removeItem('helios_last_active');
          return 'Your previous session expired after 15 minutes of inactivity. Please sign in again.';
        }
      }
    } catch {}
    return null;
  });

  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('helios_auth_user');
      if (!saved) return null;
      const lastActiveStr = localStorage.getItem('helios_last_active');
      if (lastActiveStr) {
        const lastActive = Number(lastActiveStr);
        if (!isNaN(lastActive) && lastActive > 0 && Date.now() - lastActive > INACTIVITY_TIMEOUT_MS) {
          localStorage.removeItem('helios_auth_user');
          localStorage.removeItem('helios_last_active');
          return null;
        }
      }
      return JSON.parse(saved);
    } catch {
      return null;
    }
  });

  const login = useCallback(async (user, tenantId) => {
    let resolvedTier1 = user?.defaultTier1Nav;
    let resolvedTier2Uw = user?.defaultTier2NavUw;
    let resolvedTier2Claims = user?.defaultTier2NavClaims;
    let resolvedAllowedTier2 = user?.allowedTier2Nav;

    // Dynamically fetch roles from tenant config to ensure tier 1 and tier 2 navigation configs are present
    if (!resolvedTier1 || !resolvedTier2Uw || !resolvedTier2Claims || !resolvedAllowedTier2) {
      try {
        const res = await fetch(`/api/roles?tenantId=${tenantId}`, {
          headers: { 'X-Tenant-ID': String(tenantId) }
        });
        if (res.ok) {
          const roles = await res.json();
          if (Array.isArray(roles)) {
            const matchedRole = roles.find(
              (r) => (r.roleCode || '').toUpperCase() === (user?.roleCode || '').toUpperCase()
            );
            if (matchedRole) {
              if (matchedRole.defaultTier1Nav && !resolvedTier1) resolvedTier1 = matchedRole.defaultTier1Nav;
              if (matchedRole.defaultTier2NavUw && !resolvedTier2Uw) resolvedTier2Uw = matchedRole.defaultTier2NavUw;
              if (matchedRole.defaultTier2NavClaims && !resolvedTier2Claims) resolvedTier2Claims = matchedRole.defaultTier2NavClaims;
              if (matchedRole.allowedTier2Nav && !resolvedAllowedTier2) resolvedAllowedTier2 = matchedRole.allowedTier2Nav;
            }
          }
        }
      } catch (e) {
        console.warn('Could not fetch role navigation configs:', e);
      }
    }

    if (!resolvedTier1) {
      resolvedTier1 = resolveUserDefaultTier1(user);
    }
    if (!resolvedTier2Uw) {
      resolvedTier2Uw = 'submissions';
    }
    if (!resolvedTier2Claims) {
      resolvedTier2Claims = 'claims';
    }
    if (!resolvedAllowedTier2) {
      const upper = (user?.roleCode || '').toUpperCase();
      if (upper.includes('UNDERWRITER') || upper === 'UW') {
        resolvedAllowedTier2 = 'inbox,policies,submissions';
      } else if (upper.includes('CLAIM')) {
        resolvedAllowedTier2 = 'claims,claims/fnol,claims/open,claims/loss-runs';
      } else {
        resolvedAllowedTier2 = 'inbox,policies,submissions,claims,claims/fnol,claims/open,claims/loss-runs';
      }
    }

    const userWithTenant = {
      ...user,
      tenantId: Number(tenantId),
      defaultTier1Nav: resolvedTier1,
      defaultTier2NavUw: resolvedTier2Uw,
      defaultTier2NavClaims: resolvedTier2Claims,
      allowedTier2Nav: resolvedAllowedTier2
    };

    setCurrentUser(userWithTenant);
    setGlobalTenantId(Number(tenantId));
    setSessionNotice(null);
    try {
      localStorage.setItem('helios_auth_user', JSON.stringify(userWithTenant));
      localStorage.setItem('helios_selected_tenant_id', String(tenantId));
      localStorage.setItem('helios2_tenantId', String(tenantId));
      localStorage.setItem('helios_last_active', String(Date.now()));
    } catch {}
  }, []);

  const logout = useCallback(async (reason = null) => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    } catch {}
    setCurrentUser(null);
    if (typeof reason === 'string' && reason.trim()) {
      setSessionNotice(reason);
    } else {
      setSessionNotice(null);
    }
    try {
      localStorage.removeItem('helios_auth_user');
      localStorage.removeItem('helios_last_active');
      localStorage.removeItem('helios_selected_tenant_id');
      localStorage.removeItem('helios2_tenantId');
      sessionStorage.clear();
      // Reset browser path to root so next login starts clean
      if (window.location.pathname !== '/' || window.location.hash !== '') {
        window.history.replaceState(null, '', '/');
      }
    } catch {}
  }, []);

  // 15-Minute Inactivity Auto-Logout Tracker
  useEffect(() => {
    if (!currentUser) return;

    const interval = setInterval(() => {
      const lastActiveStr = localStorage.getItem('helios_last_active');
      if (lastActiveStr) {
        const lastActive = Number(lastActiveStr);
        if (!isNaN(lastActive) && Date.now() - lastActive > INACTIVITY_TIMEOUT_MS) {
          logout('Your session expired due to inactivity. Please sign in again.');
        }
      }
    }, 30000);

    const recordActivity = () => {
      try {
        localStorage.setItem('helios_last_active', String(Date.now()));
      } catch {}
    };

    window.addEventListener('mousemove', recordActivity, { passive: true });
    window.addEventListener('keydown', recordActivity, { passive: true });
    window.addEventListener('click', recordActivity, { passive: true });

    return () => {
      clearInterval(interval);
      window.removeEventListener('mousemove', recordActivity);
      window.removeEventListener('keydown', recordActivity);
      window.removeEventListener('click', recordActivity);
    };
  }, [currentUser, logout]);

  return (
    <AuthContext.Provider value={{ currentUser, sessionNotice, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

