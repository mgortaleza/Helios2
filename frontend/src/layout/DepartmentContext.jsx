import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

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

  const [activeDepartment, setActiveDepartmentState] = useState(() => {
    const path = (window.location.hash || window.location.pathname || '').toLowerCase();
    if (path.includes('claims')) return DEPARTMENTS.CLAIMS;
    if (
      path.includes('policies') ||
      path.includes('submissions') ||
      path.includes('inbox') ||
      path.includes('quotes') ||
      path.includes('documents') ||
      path.includes('forms')
    ) {
      return DEPARTMENTS.UNDERWRITING;
    }
    return DEPARTMENTS.DASHBOARD;
  });

  // Controls whether the primary vertical nav bar is slim/collapsed (68px) or expanded (240px)
  const [isTier1Collapsed, setIsTier1Collapsed] = useState(
    activeDepartment === DEPARTMENTS.UNDERWRITING || activeDepartment === DEPARTMENTS.CLAIMS
  );

  // Controls whether the cascading secondary nav bar is visible
  const [isTier2Open, setIsTier2Open] = useState(
    activeDepartment === DEPARTMENTS.UNDERWRITING || activeDepartment === DEPARTMENTS.CLAIMS
  );

  // Synchronize department state with the route automatically
  useEffect(() => {
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
        if (redirect) navigate('/submissions');
      } else if (nextDept === DEPARTMENTS.CLAIMS) {
        setIsTier2Open(true);
        setIsTier1Collapsed(true);
        if (redirect) navigate('/claims');
      }
    },
    [navigate]
  );

  const toggleTier1 = useCallback(() => {
    setIsTier1Collapsed((prev) => !prev);
  }, []);

  const toggleTier2 = useCallback(() => {
    setIsTier2Open((prev) => !prev);
  }, []);

  return (
    <DepartmentReactContext.Provider
      value={{
        activeDepartment,
        setActiveDepartment: switchDepartment,
        switchDepartment,
        isTier1Collapsed,
        setIsTier1Collapsed,
        toggleTier1,
        isTier2Open,
        setIsTier2Open,
        toggleTier2,
        departments: DEPARTMENTS
      }}
    >
      {children}
    </DepartmentReactContext.Provider>
  );
}

export function useDepartment() {
  const context = useContext(DepartmentReactContext);
  return (
    context || {
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
    }
  );
}
