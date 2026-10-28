import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { setGlobalTenantId } from './tenantContext.jsx';

const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes

const AuthContext = createContext({
  currentUser: null,
  sessionNotice: null,
  login: () => {},
  logout: () => {}
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

  const login = useCallback((user, tenantId) => {
    const userWithTenant = { ...user, tenantId: Number(tenantId) };
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
      sessionStorage.clear();
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
