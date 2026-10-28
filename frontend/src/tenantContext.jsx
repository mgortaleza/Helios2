import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const initialParams = new URLSearchParams(window.location.search);
const initialTenantFromUrl = Number(initialParams.get('tenantId'));
const initialTenantFromStorage = Number(window.localStorage.getItem('helios2_tenantId'));

let currentTenantId = initialTenantFromUrl || initialTenantFromStorage || 1;

export function getActiveTenantId() {
  return currentTenantId;
}

export function setGlobalTenantId(tenantId) {
  currentTenantId = Number(tenantId) || 1;
  try {
    window.localStorage.setItem('helios2_tenantId', String(currentTenantId));
  } catch {
    // Ignore storage errors
  }
}

export async function apiFetch(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    'X-Tenant-ID': String(currentTenantId),
    ...(options.headers || {})
  };
  const response = await fetch(path, { ...options, headers });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(errText || `HTTP ${response.status}`);
  }
  return response.json();
}

const TenantReactContext = createContext({
  tenants: [],
  activeTenantId: 1,
  activeTenant: null,
  setActiveTenantId: () => {},
  reloadTenants: async () => {}
});

export function TenantProvider({ children }) {
  const [tenants, setTenants] = useState([]);
  const [activeTenantId, setActiveTenantIdState] = useState(currentTenantId);

  const reloadTenants = useCallback(async () => {
    try {
      const data = await apiFetch('/api/tenants');
      setTenants(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load MSTR_DATA tenants:', err);
    }
  }, []);

  useEffect(() => {
    reloadTenants();
  }, [reloadTenants]);

  const setActiveTenantId = useCallback((nextId) => {
    const numId = Number(nextId) || 1;
    setGlobalTenantId(numId);
    setActiveTenantIdState(numId);
  }, []);

  const activeTenant = tenants.find((t) => t.tenantId === Number(activeTenantId)) || null;

  return (
    <TenantReactContext.Provider
      value={{
        tenants,
        activeTenantId,
        activeTenant,
        setActiveTenantId,
        reloadTenants
      }}
    >
      {children}
    </TenantReactContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantReactContext);
  return (
    context || {
      tenants: [],
      activeTenantId: 1,
      activeTenant: null,
      setActiveTenantId: () => {},
      reloadTenants: async () => {}
    }
  );
}

