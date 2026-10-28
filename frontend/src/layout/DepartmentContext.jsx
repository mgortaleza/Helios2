import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth, resolveUserDefaultTier1 } from '../authContext.jsx';

export const DEPARTMENTS = {
  DASHBOARD: 'dashboard',
  UNDERWRITING: 'underwriting',
  CLAIMS: 'claims'
};

const DepartmentReactContext = createContext({
  activeDepartment: DEPARTMENTS.DASHBOARD,
  setActiveDepartment: () => {},
  switchDepartment: () => {},
  isTier1Collapsed: false,
  setIsTier1Collapsed: () => {},
  toggleTier1: () => {},
  isTier2Open: false,
  setIsTier2Open: () => {},
  toggleTier2: () => {},
  departments: DEPARTMENTS
});

export function DepartmentProvider({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const lastUserKeyRef = useRef(null);

  const initialDefault = resolveUserDefaultTier1(currentUser);

  const [activeDepartment, setActiveDepartmentState] = useState(() => {
    return initialDefault;
  });

  // Controls whether the primary vertical nav bar is slim/collapsed (68px) or expanded (240px)
  const [isTier1Collapsed, setIsTier1Collapsed] = useState(
    activeDepartment === DEPARTMENTS.UNDERWRITING || activeDepartment === DEPARTMENTS.CLAIMS
  );

  // Controls whether the cascading secondary nav bar is visible
  const [isTier2Open, setIsTier2Open] = useState(
    activeDepartment === DEPARTMENTS.UNDERWRITING || activeDepartment === DEPARTMENTS.CLAIMS
  );

  const resolveUwRoute = useCallback(() => {
    const raw = (currentUser?.defaultTier2NavUw || 'submissions').trim();
    return raw.startsWith('/') ? raw : `/${raw}`;
  }, [currentUser]);

  const resolveClaimsRoute = useCallback(() => {
    const raw = (currentUser?.defaultTier2NavClaims || 'claims').trim();
    return raw.startsWith('/') ? raw : `/${raw}`;
  }, [currentUser]);

  // On Login or User Switch: Immediately reset Tier 1 & Tier 2 navigation to the user's role default
  useEffect(() => {
    if (!currentUser) {
      lastUserKeyRef.current = null;
      return;
    }

    const userKey = `${currentUser.userId || currentUser.username}_${currentUser.tenantId}`;
    const isNewLogin = lastUserKeyRef.current !== userKey;

    if (isNewLogin) {
      lastUserKeyRef.current = userKey;
      const targetDept = resolveUserDefaultTier1(currentUser);

      if (targetDept === DEPARTMENTS.UNDERWRITING) {
        setActiveDepartmentState(DEPARTMENTS.UNDERWRITING);
        setIsTier2Open(true);
        setIsTier1Collapsed(true);
        navigate(resolveUwRoute(), { replace: true });
      } else if (targetDept === DEPARTMENTS.CLAIMS) {
        setActiveDepartmentState(DEPARTMENTS.CLAIMS);
        setIsTier2Open(true);
        setIsTier1Collapsed(true);
        navigate(resolveClaimsRoute(), { replace: true });
      } else {
        setActiveDepartmentState(DEPARTMENTS.DASHBOARD);
        setIsTier2Open(false);
        setIsTier1Collapsed(false);
        navigate('/', { replace: true });
      }
    }
  }, [currentUser, navigate, resolveUwRoute, resolveClaimsRoute]);

  // Synchronize department state with in-session route changes
  useEffect(() => {
    if (!lastUserKeyRef.current) return; // Wait until initial login routing has completed

    const rawPath = (location.pathname || '') + (location.hash || '');
    const path = rawPath.toLowerCase();

    if (path.includes('claims')) {
      setActiveDepartmentState(DEPARTMENTS.CLAIMS);
      setIsTier2Open(true);
      setIsTier1Collapsed(true);
    } else if (
      path.includes('policies') ||
      path.includes('submissions') ||
      path.includes('inbox') ||
      path.includes('quotes') ||
      path.includes('documents') ||
      path.includes('forms')
    ) {
      setActiveDepartmentState(DEPARTMENTS.UNDERWRITING);
      setIsTier2Open(true);
      setIsTier1Collapsed(true);
    } else if (path === '/' || path === '' || path === '#/' || path === '#') {
      setActiveDepartmentState(DEPARTMENTS.DASHBOARD);
      setIsTier2Open(false);
      setIsTier1Collapsed(false);
    }
  }, [location.pathname, location.hash]);

  const switchDepartment = useCallback(
    (nextDept, redirect = true) => {
      setActiveDepartmentState(nextDept);

      if (nextDept === DEPARTMENTS.DASHBOARD) {
        setIsTier2Open(false);
        setIsTier1Collapsed(false);
        if (redirect) navigate('/');
      } else if (nextDept === DEPARTMENTS.UNDERWRITING) {
        setIsTier2Open(true);
        setIsTier1Collapsed(true);
        if (redirect) navigate(resolveUwRoute());
      } else if (nextDept === DEPARTMENTS.CLAIMS) {
        setIsTier2Open(true);
        setIsTier1Collapsed(true);
        if (redirect) navigate(resolveClaimsRoute());
      }
    },
    [navigate, resolveUwRoute, resolveClaimsRoute]
  );

  const toggleTier1 = useCallback(() => {
    setIsTier1Collapsed((prev) => !prev);
  }, []);

  const toggleTier2 = useCallback(() => {
    setIsTier2Open((prev) => !prev);
  }, []);

  const value = {
    activeDepartment,
    setActiveDepartment: setActiveDepartmentState,
    switchDepartment,
    isTier1Collapsed,
    setIsTier1Collapsed,
    toggleTier1,
    isTier2Open,
    setIsTier2Open,
    toggleTier2,
    resolveUwRoute,
    resolveClaimsRoute,
    departments: DEPARTMENTS
  };

  return (
    <DepartmentReactContext.Provider value={value}>
      {children}
    </DepartmentReactContext.Provider>
  );
}

export function useDepartment() {
  const context = useContext(DepartmentReactContext);
  if (!context) {
    throw new Error('useDepartment must be used within a DepartmentProvider');
  }
  return context;
}

export default DepartmentProvider;
