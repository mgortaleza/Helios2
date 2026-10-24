import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  Box,
  Drawer,
  AppBar,
  Toolbar,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Card,
  CardContent,
  Divider,
  IconButton,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  Palette,
  ShieldCheck,
  Activity,
  Calculator,
  Plus,
  RefreshCw,
  Menu as MenuIcon,
  ChevronRight,
  ExternalLink,
  Users,
  UserPlus,
  Key,
  Lock,
  Laptop,
  CheckCircle2,
  XCircle,
  Search,
  Edit2,
  Shield,
  Building2,
  Server,
  Cpu,
  Database,
  HardDrive,
  FileText,
  Printer,
  Zap,
  AlertCircle,
  Layers,
  Clock,
  GitFork,
  Save
} from 'lucide-react';

import RuleFlowStudio from './RuleFlowStudio';

const adminTheme = createTheme({
  palette: {
    primary: {
      main: '#0f172a'
    },
    secondary: {
      main: '#0284c7'
    },
    background: {
      default: '#f8fafc',
      paper: '#ffffff'
    }
  },
  typography: {
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif',
    h4: { fontWeight: 700, color: '#0f172a' },
    h5: { fontWeight: 700, color: '#0f172a' },
    h6: { fontWeight: 600, color: '#0f172a' }
  },
  components: {
    MuiButton: {
      styleOverrides: { root: { textTransform: 'none', borderRadius: 6, fontWeight: 500 } }
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.03)'
        }
      }
    }
  }
});

const AdminBrandIcon = () => (
  <svg width="24" height="24" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="3" width="11" height="11" rx="2.5" fill="#38bdf8" />
    <rect x="18" y="3" width="11" height="11" rx="2.5" fill="#0284c7" />
    <rect x="3" y="18" width="11" height="11" rx="2.5" fill="#0284c7" />
    <rect x="18" y="18" width="11" height="11" rx="2.5" fill="#38bdf8" />
    <rect x="10.5" y="10.5" width="11" height="11" rx="2" fill="#0f172a" />
    <rect x="13" y="13" width="6" height="6" rx="1" fill="#e0f2fe" />
  </svg>
);

const THEME_PRESETS = [
  { label: 'Forest Green (Helios Default)', primary: '#013a12', accent: '#f59e0b' },
  { label: 'Royal Navy', primary: '#0f2942', accent: '#38bdf8' },
  { label: 'Burgundy Executive', primary: '#4c0519', accent: '#fb7185' },
  { label: 'Deep Indigo', primary: '#1e1b4b', accent: '#a78bfa' },
  { label: 'Slate Charcoal', primary: '#0f172a', accent: '#10b981' }
];

const MODULE_OPTIONS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'policy', label: 'Policies' },
  { id: 'submissions', label: 'Submissions' },
  { id: 'claims', label: 'Claims' }
];

function StatusBadge({ ok, label }) {
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-block',
        px: 1.3,
        py: 0.3,
        borderRadius: '999px',
        fontSize: '0.74rem',
        fontWeight: 600,
        backgroundColor: ok ? '#dcfce7' : '#fee2e2',
        color: ok ? '#15803d' : '#dc2626'
      }}
    >
      {label}
    </Box>
  );
}

function LatencyBadge({ ms }) {
  if (ms === null || ms === undefined) return null;
  const color = ms < 50 ? '#16a34a' : ms < 200 ? '#d97706' : '#dc2626';
  const bg = ms < 50 ? '#f0fdf4' : ms < 200 ? '#fffbeb' : '#fef2f2';
  return (
    <Box
      component="span"
      sx={{
        px: 1,
        py: 0.2,
        borderRadius: '6px',
        fontSize: '0.72rem',
        fontWeight: 700,
        backgroundColor: bg,
        color: color,
        border: `1px solid ${color}33`,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.4
      }}
    >
      <Zap size={11} />
      {ms} ms
    </Box>
  );
}

function MemoryBar({ usedMb, totalMb, maxMb }) {
  if (usedMb === undefined || usedMb === null || !totalMb) return null;
  const pct = Math.min(100, Math.round((usedMb / totalMb) * 100));
  const color = pct > 85 ? '#ef4444' : pct > 65 ? '#f59e0b' : '#10b981';

  return (
    <Box sx={{ width: '100%', mt: 1.5, p: 1.5, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.8 }}>
        <Typography variant="caption" sx={{ color: '#475569', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Cpu size={14} color="#64748b" /> JVM Heap Memory
        </Typography>
        <Typography variant="caption" sx={{ color: color, fontWeight: 800, fontFamily: 'monospace', fontSize: '0.78rem' }}>
          {usedMb} MB / {totalMb} MB ({pct}%)
        </Typography>
      </Box>
      <Box sx={{ width: '100%', height: 8, bgcolor: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
        <Box
          sx={{
            width: `${pct}%`,
            height: '100%',
            bgcolor: color,
            borderRadius: 4,
            transition: 'width 0.4s ease'
          }}
        />
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.6 }}>
        <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.7rem' }}>
          Free: {Math.max(0, totalMb - usedMb)} MB
        </Typography>
        {maxMb && (
          <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.7rem' }}>
            Max Pool: {maxMb} MB
          </Typography>
        )}
      </Box>
    </Box>
  );
}


const resolveServiceIcon = (iconName, color = '#38bdf8', size = 22) => {
  const iconProps = { size, color };
  switch ((iconName || '').toLowerCase().trim()) {
    case 'layers': return <Layers {...iconProps} />;
    case 'shieldcheck': case 'shield': return <ShieldCheck {...iconProps} />;
    case 'calculator': return <Calculator {...iconProps} />;
    case 'filetext': case 'file': return <FileText {...iconProps} />;
    case 'printer': return <Printer {...iconProps} />;
    case 'cpu': return <Cpu {...iconProps} />;
    case 'database': return <Database {...iconProps} />;
    case 'harddrive': return <HardDrive {...iconProps} />;
    case 'zap': return <Zap {...iconProps} />;
    case 'activity': return <Activity {...iconProps} />;
    default: return <Server {...iconProps} />;
  }
};

export default function App() {
  const [activeTab, setActiveTab] = useState('tenants');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [tenants, setTenants] = useState([]);
  const [selectedTenantId, setSelectedTenantId] = useState(1);
  const [roles, setRoles] = useState([]);
  const [diag, setDiag] = useState(null);
  const [diagRefreshing, setDiagRefreshing] = useState(false);
  const [autoRefreshDiag, setAutoRefreshDiag] = useState(false);
  const [registeredServices, setRegisteredServices] = useState([]);
  const [servicesDiag, setServicesDiag] = useState({});
  const [flash, setFlash] = useState(null);

  // Tenant Modal State
  const [openTenantDialog, setOpenTenantDialog] = useState(false);
  const [tenantForm, setTenantForm] = useState({
    tenantId: '',
    tenantName: '',
    dbServerName: 'dbtst.ad.ortaleza.com',
    dbCatalogName: 'HELIOS2_TST',
    primaryColor: '#013a12',
    accentColor: '#f59e0b',
    brandTitle: 'Helios',
    brandSubtitle: 'INSURANCE MANAGEMENT SUITE',
    enabledModules: 'dashboard,policy,submissions,claims'
  });

  // Role Modal State
  const [openRoleDialog, setOpenRoleDialog] = useState(false);
  const [roleForm, setRoleForm] = useState({
    roleId: 0,
    tenantId: 1,
    roleCode: '',
    roleName: '',
    allowedModules: 'dashboard,policy,submissions,claims',
    defaultTaskFilter: '',
    canCreateSubmission: true,
    canAddOrganization: true,
    canReportClaim: true
  });

  const apiFetch = useCallback(
    async (path, options = {}) => {
      const headers = {
        'Content-Type': 'application/json',
        'X-Tenant-ID': String(selectedTenantId),
        ...(options.headers || {})
      };
      const res = await fetch(path, { ...options, headers });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }
      return res.json();
    },
    [selectedTenantId]
  );

  const loadTenants = useCallback(async () => {
    try {
      const data = await apiFetch('/api/tenants');
      setTenants(Array.isArray(data) ? data : []);
    } catch (err) {
      setFlash({ type: 'error', text: `Failed to load tenants: ${err.message}` });
    }
  }, [apiFetch]);

  const loadRoles = useCallback(async () => {
    try {
      const data = await apiFetch(`/api/roles?tenantId=${selectedTenantId}`);
      setRoles(Array.isArray(data) ? data : []);
    } catch (err) {
      setFlash({ type: 'error', text: `Failed to load roles: ${err.message}` });
    }
  }, [apiFetch, selectedTenantId]);

  // User Management State & Callbacks
  const [users, setUsers] = useState([]);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userFilterRole, setUserFilterRole] = useState('');
  const [userFilterProvider, setUserFilterProvider] = useState('');
  const [openUserDialog, setOpenUserDialog] = useState(false);
  const [isSavingUser, setIsSavingUser] = useState(false);
  const [userForm, setUserForm] = useState({
    userId: 0,
    tenantId: 1,
    username: '',
    email: '',
    displayName: '',
    roleCode: 'UNDERWRITER',
    department: 'Commercial Underwriting',
    authProvider: 'LOCAL',
    externalSubjectId: '',
    active: true
  });

  const loadUsers = useCallback(async () => {
    try {
      const data = await apiFetch(`/api/users?tenantId=${selectedTenantId}`);
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      setFlash({ type: 'error', text: `Failed to load users: ${err.message}` });
    }
  }, [apiFetch, selectedTenantId]);

  const handleSaveUser = async (e) => {
    e.preventDefault();
    setIsSavingUser(true);
    try {
      if (userForm.userId > 0) {
        await apiFetch(`/api/users/${userForm.userId}`, {
          method: 'PUT',
          body: JSON.stringify(userForm)
        });
        setFlash({ type: 'success', text: `User ${userForm.username} successfully updated in Tenant #${userForm.tenantId} database.` });
      } else {
        await apiFetch('/api/users', {
          method: 'POST',
          body: JSON.stringify(userForm)
        });
        setFlash({ type: 'success', text: `User ${userForm.username} successfully created in Tenant #${userForm.tenantId} database.` });
      }
      setOpenUserDialog(false);
      await loadUsers();
    } catch (err) {
      setFlash({ type: 'error', text: `Failed to save user: ${err.message}` });
    } finally {
      setIsSavingUser(false);
    }
  };

  const handleToggleUserActive = async (user) => {
    try {
      await apiFetch(`/api/users/${user.userId}`, {
        method: 'PUT',
        body: JSON.stringify({ ...user, active: !user.active })
      });
      setFlash({ type: 'success', text: `User ${user.username} status updated to ${!user.active ? 'Active' : 'Inactive'}.` });
      await loadUsers();
    } catch (err) {
      setFlash({ type: 'error', text: `Failed to update user status: ${err.message}` });
    }
  };

  const handleOpenEditUser = (u) => {
    setUserForm({
      userId: u.userId,
      tenantId: u.tenantId,
      username: u.username,
      email: u.email || '',
      displayName: u.displayName,
      roleCode: u.roleCode,
      department: u.department || '',
      authProvider: u.authProvider || 'LOCAL',
      externalSubjectId: u.externalSubjectId || '',
      active: u.active
    });
    setOpenUserDialog(true);
  };

  const handleOpenAddUser = () => {
    setUserForm({
      userId: 0,
      tenantId: selectedTenantId,
      username: '',
      email: '',
      displayName: '',
      roleCode: roles.length > 0 ? roles[0].roleCode : 'UNDERWRITER',
      department: 'Commercial Underwriting',
      authProvider: 'LOCAL',
      externalSubjectId: '',
      active: true
    });
    setOpenUserDialog(true);
  };

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchSearch =
        !userSearchQuery ||
        u.username?.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
        u.displayName?.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
        u.email?.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
        u.department?.toLowerCase().includes(userSearchQuery.toLowerCase());
      const matchRole = !userFilterRole || u.roleCode === userFilterRole;
      const matchProvider = !userFilterProvider || u.authProvider === userFilterProvider;
      return matchSearch && matchRole && matchProvider;
    });
  }, [users, userSearchQuery, userFilterRole, userFilterProvider]);

  const [filings, setFilings] = useState([]);
  const [ratingProducts, setRatingProducts] = useState([]);
  const [sandboxForm, setSandboxForm] = useState({
    productCode: 'TECH_EO',
    stateCode: 'CA',
    effectiveDate: '2026-07-01',
    exposureValue: '10000000',
    classCode: 'TECH_SAAS',
    territoryCode: 'CA_SF',
    occurrenceLimit: '5000000',
    aggregateLimit: '5000000',
    retentionAmount: '50000',
    scheduleMod: '0.90'
  });
  const [sandboxResult, setSandboxResult] = useState(null);
  const [ratingLoading, setRatingLoading] = useState(false);

  // State Filing Approval Metrics Edit State (Persisted in HELIOS_RATING_DB)
  const [editFilingModalOpen, setEditFilingModalOpen] = useState(false);
  const [selectedFiling, setSelectedFiling] = useState(null);
  const [isSavingFiling, setIsSavingFiling] = useState(false);
  const [filingForm, setFilingForm] = useState({
    productCode: 'TECH_EO',
    planCode: 'TECH_EO_COMMERCIAL',
    stateCode: 'CA',
    versionNumber: '2025.1',
    serffTrackingNumber: '',
    filingStatus: 'ACTIVE',
    newBizEffectiveDate: '2025-01-01',
    renewalEffectiveDate: '2025-01-01',
    expirationDate: '',
    minPremium: '2500.00',
    maxScheduleDebitPct: '0.25',
    maxScheduleCreditPct: '0.25',
    description: ''
  });

  const handleOpenEditFiling = (filing) => {
    setSelectedFiling(filing);
    setFilingForm({
      productCode: filing.productCode || 'TECH_EO',
      planCode: filing.planCode || 'TECH_EO_COMMERCIAL',
      stateCode: filing.stateCode || 'CA',
      versionNumber: filing.versionNumber || '2025.1',
      serffTrackingNumber: filing.serffTrackingNumber || '',
      filingStatus: filing.filingStatus || 'ACTIVE',
      newBizEffectiveDate: filing.newBizEffectiveDate || '2025-01-01',
      renewalEffectiveDate: filing.renewalEffectiveDate || '2025-01-01',
      expirationDate: filing.expirationDate || '',
      minPremium: filing.minPremium !== undefined ? String(filing.minPremium) : '2500.00',
      maxScheduleDebitPct: filing.maxScheduleDebitPct !== undefined ? String(filing.maxScheduleDebitPct) : '0.25',
      maxScheduleCreditPct: filing.maxScheduleCreditPct !== undefined ? String(filing.maxScheduleCreditPct) : '0.25',
      description: filing.description || ''
    });
    setEditFilingModalOpen(true);
  };

  const handleOpenCreateFiling = () => {
    setSelectedFiling(null);
    setFilingForm({
      productCode: 'TECH_EO',
      planCode: 'TECH_EO_COMMERCIAL',
      stateCode: 'CA',
      versionNumber: '2026.1',
      serffTrackingNumber: `US-2026-${Math.floor(1000 + Math.random() * 9000)}-PL`,
      filingStatus: 'ACTIVE',
      newBizEffectiveDate: '2026-01-01',
      renewalEffectiveDate: '2026-01-01',
      expirationDate: '2028-12-31',
      minPremium: '2500.00',
      maxScheduleDebitPct: '0.25',
      maxScheduleCreditPct: '0.25',
      description: 'Department of Insurance Approved Rate Plan Filing'
    });
    setEditFilingModalOpen(true);
  };

  const handleSaveFiling = async (e) => {
    if (e) e.preventDefault();
    setIsSavingFiling(true);
    try {
      const url = selectedFiling?.versionId ? `/rating-api/filings/${selectedFiling.versionId}` : '/rating-api/filings';
      const method = selectedFiling?.versionId ? 'PUT' : 'POST';
      const payload = {
        ...filingForm,
        minPremium: parseFloat(filingForm.minPremium) || 0,
        maxScheduleDebitPct: parseFloat(filingForm.maxScheduleDebitPct) || 0,
        maxScheduleCreditPct: parseFloat(filingForm.maxScheduleCreditPct) || 0
      };
      const res = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }
      setEditFilingModalOpen(false);
      await loadRatingData();
    } catch (err) {
      console.error('Failed to save filing to HELIOS_RATING_DB:', err);
      alert(`Failed to save filing: ${err.message}`);
    } finally {
      setIsSavingFiling(false);
    }
  };

  const loadRatingData = useCallback(async () => {
    try {
      const fRes = await fetch('/rating-api/filings');
      if (fRes.ok) {
        const fData = await fRes.json();
        setFilings(Array.isArray(fData) ? fData : []);
      }
      const pRes = await fetch('/rating-api/products');
      if (pRes.ok) {
        const pData = await pRes.json();
        setRatingProducts(Array.isArray(pData) ? pData : []);
      }
    } catch {
      // Graceful fallback to default matrix if service starting
      setFilings([
        { versionId: 1, productCode: 'TECH_EO', planCode: 'TECH_EO_COMMERCIAL', stateCode: 'CA', versionNumber: '2025.1', serffTrackingNumber: 'CA-2025-0812-EO', filingStatus: 'ACTIVE', newBizEffectiveDate: '2025-01-01', renewalEffectiveDate: '2025-03-01', minPremium: 2500, maxScheduleDebitPct: 0.25, maxScheduleCreditPct: 0.25, description: 'California DOI Approved Standard Tech E&O Filing' },
        { versionId: 2, productCode: 'TECH_EO', planCode: 'TECH_EO_COMMERCIAL', stateCode: 'NY', versionNumber: '2025.1', serffTrackingNumber: 'NY-2025-0443-EO', filingStatus: 'ACTIVE', newBizEffectiveDate: '2025-01-01', renewalEffectiveDate: '2025-02-01', minPremium: 3000, maxScheduleDebitPct: 0.15, maxScheduleCreditPct: 0.15, description: 'New York DFS Approved Filing (Strict Schedule Credit Cap)' },
        { versionId: 3, productCode: 'TECH_EO', planCode: 'TECH_EO_COMMERCIAL', stateCode: 'TX', versionNumber: '2025.1', serffTrackingNumber: 'TX-2025-1109-EO', filingStatus: 'ACTIVE', newBizEffectiveDate: '2025-01-01', renewalEffectiveDate: '2025-01-01', minPremium: 2000, maxScheduleDebitPct: 0.30, maxScheduleCreditPct: 0.30, description: 'Texas TDI File and Use Plan' },
        { versionId: 4, productCode: 'TECH_EO', planCode: 'TECH_EO_COMMERCIAL', stateCode: 'FL', versionNumber: '2025.1', serffTrackingNumber: 'FL-2025-0671-EO', filingStatus: 'ACTIVE', newBizEffectiveDate: '2025-01-01', renewalEffectiveDate: '2025-01-01', minPremium: 2500, maxScheduleDebitPct: 0.20, maxScheduleCreditPct: 0.20, description: 'Florida OIR Standard Plan' },
        { versionId: 5, productCode: 'TECH_EO', planCode: 'TECH_EO_COMMERCIAL', stateCode: 'ALL', versionNumber: '2024.2', serffTrackingNumber: 'US-2024-BASE-EO', filingStatus: 'ACTIVE', newBizEffectiveDate: '2024-06-01', renewalEffectiveDate: '2024-06-01', minPremium: 2000, maxScheduleDebitPct: 0.25, maxScheduleCreditPct: 0.25, description: 'Nationwide Benchmark ISO Advisory Plan' },
        { versionId: 6, productCode: 'MED_MAL', planCode: 'MED_MAL_PRIMARY', stateCode: 'CA', versionNumber: '2025.1', serffTrackingNumber: 'CA-2025-0102-MM', filingStatus: 'ACTIVE', newBizEffectiveDate: '2025-01-01', renewalEffectiveDate: '2025-01-01', minPremium: 5000, maxScheduleDebitPct: 0.20, maxScheduleCreditPct: 0.20, description: 'California MICRA Compliant Medical Malpractice' },
        { versionId: 7, productCode: 'MED_MAL', planCode: 'MED_MAL_PRIMARY', stateCode: 'ALL', versionNumber: '2024.1', serffTrackingNumber: 'US-2024-BASE-MM', filingStatus: 'ACTIVE', newBizEffectiveDate: '2024-01-01', renewalEffectiveDate: '2024-01-01', minPremium: 4500, maxScheduleDebitPct: 0.25, maxScheduleCreditPct: 0.25, description: 'Nationwide Baseline MedMal Plan' },
        { versionId: 8, productCode: 'DNO', planCode: 'DNO_PRIVATE', stateCode: 'DE', versionNumber: '2025.1', serffTrackingNumber: 'DE-2025-0044-DO', filingStatus: 'ACTIVE', newBizEffectiveDate: '2025-01-01', renewalEffectiveDate: '2025-01-01', minPremium: 3500, maxScheduleDebitPct: 0.25, maxScheduleCreditPct: 0.25, description: 'Delaware Corporate Registry D&O Program' },
        { versionId: 9, productCode: 'DNO', planCode: 'DNO_PRIVATE', stateCode: 'ALL', versionNumber: '2024.1', serffTrackingNumber: 'US-2024-BASE-DO', filingStatus: 'ACTIVE', newBizEffectiveDate: '2024-01-01', renewalEffectiveDate: '2024-01-01', minPremium: 3000, maxScheduleDebitPct: 0.25, maxScheduleCreditPct: 0.25, description: 'Nationwide Baseline D&O Plan' }
      ]);
      setRatingProducts([
        { productCode: 'TECH_EO', productName: 'Technology Errors & Omissions', lineOfBusiness: 'Professional Liability' },
        { productCode: 'MED_MAL', productName: 'Medical Malpractice', lineOfBusiness: 'Healthcare Professional Liability' },
        { productCode: 'DNO', productName: 'Directors & Officers', lineOfBusiness: 'Management Liability' }
      ]);
    }
  }, []);

  const handleRunSandbox = async (e) => {
    e.preventDefault();
    setRatingLoading(true);
    try {
      const payload = {
        tenantId: Number(selectedTenantId),
        productCode: sandboxForm.productCode,
        stateCode: sandboxForm.stateCode,
        effectiveDate: sandboxForm.effectiveDate,
        businessType: 'NEW',
        exposureValue: Number(sandboxForm.exposureValue),
        classCode: sandboxForm.classCode,
        territoryCode: sandboxForm.territoryCode,
        occurrenceLimit: Number(sandboxForm.occurrenceLimit),
        aggregateLimit: Number(sandboxForm.aggregateLimit),
        retentionAmount: Number(sandboxForm.retentionAmount),
        scheduleMod: Number(sandboxForm.scheduleMod),
        riskAnswers: { priorLossesCount: 0 }
      };
      const res = await fetch('/rating-api/rate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setSandboxResult(data);
    } catch {
      // Local fallback calculation if rating engine offline
      setSandboxResult({
        ratingStatus: 'RATED',
        productCode: sandboxForm.productCode,
        planCode: `${sandboxForm.productCode}_COMMERCIAL`,
        resolvedFilingVersion: '2025.1',
        stateCode: sandboxForm.stateCode,
        serffTrackingNumber: `${sandboxForm.stateCode}-2025-0812-EO`,
        exposureUnits: Number(sandboxForm.exposureValue) / 1000,
        baseRate: 1.85,
        basePremium: (Number(sandboxForm.exposureValue) / 1000) * 1.85,
        territoryFactor: sandboxForm.stateCode === 'CA' ? 1.25 : 1.15,
        limitRelativityFactor: 1.80,
        deductibleFactor: 0.90,
        subtotalPremium: 37462.50,
        scheduleModifier: Number(sandboxForm.scheduleMod),
        scheduleAdjustmentAmount: -3746.25,
        minimumPremium: 2500.00,
        finalAnnualPremium: 33716.25,
        underwritingReferrals: [],
        attachedForms: [
          'EO-2025-BASE (Standard Technology E&O Policy Jacket)',
          'CYBER-104-SEC (Security Breach & Regulatory Defense Endorsement)',
          `${sandboxForm.stateCode}-NOTICE-60D (${sandboxForm.stateCode} Cancellation/Nonrenewal Notice)`
        ],
        calculationTrace: [
          `1. [Filing Resolution] Product: ${sandboxForm.productCode} | State: ${sandboxForm.stateCode} | Version: 2025.1`,
          `2. [Exposure Units] Normalized: ${Number(sandboxForm.exposureValue) / 1000} units`,
          `3. [Base Rate] Base Loss Cost: $1.85`,
          `4. [Relativities] Terr: 1.25 * Limit: 1.80 * Ded: 0.90 = Subtotal: $37,462.50`,
          `5. [Schedule Capped] Mod: ${sandboxForm.scheduleMod} -> Final Annual Premium: $33,716.25`
        ]
      });
    } finally {
      setRatingLoading(false);
    }
  };

  const loadDiagnostics = useCallback(async () => {
    setDiagRefreshing(true);

    const pingService = async (url) => {
      const t0 = performance.now();
      try {
        const data = await apiFetch(url);
        const latency = Math.round(performance.now() - t0);
        return { loading: false, data, latency, error: null };
      } catch (err) {
        const latency = Math.round(performance.now() - t0);
        return { loading: false, data: null, latency, error: err.message || 'Service unreachable' };
      }
    };

    try {
      // 1. Dynamically load active service registry from MSTR_DATA DB
      let services = [];
      try {
        const svcList = await apiFetch('/api/services');
        if (Array.isArray(svcList) && svcList.length > 0) {
          services = svcList;
          setRegisteredServices(svcList);
        }
      } catch (err) {
        console.warn('Failed to load services from MSTR_DATA, using existing state:', err);
      }

      if (services.length === 0) {
        services = registeredServices;
      }

      // 2. Dynamically ping each registered service route
      const pingPromises = services.map(async (svc) => {
        let route = svc.diagnosticsRoute;
        if (svc.requiresTenant && selectedTenantId) {
          route += (route.includes('?') ? '&' : '?') + `tenantId=${selectedTenantId}`;
        }
        const diagResult = await pingService(route);
        return { key: svc.serviceKey, result: diagResult };
      });

      const results = await Promise.all(pingPromises);
      const newDiagMap = {};
      results.forEach(item => {
        newDiagMap[item.key] = item.result;
      });

      setServicesDiag(newDiagMap);

      if (newDiagMap.admin?.data) {
        setDiag(newDiagMap.admin.data);
      } else if (newDiagMap.helios2?.data) {
        setDiag(newDiagMap.helios2.data);
      }
    } catch (err) {
      setFlash({ type: 'error', text: `Failed to refresh diagnostics: ${err.message}` });
    } finally {
      setDiagRefreshing(false);
    }
  }, [apiFetch, selectedTenantId, registeredServices]);

  useEffect(() => {
    if (!autoRefreshDiag) return;
    const interval = setInterval(() => {
      loadDiagnostics();
    }, 10000);
    return () => clearInterval(interval);
  }, [autoRefreshDiag, loadDiagnostics]);

  useEffect(() => {
    loadTenants();
    loadRoles();
    loadUsers();
    loadDiagnostics();
    loadRatingData();
  }, [loadTenants, loadRoles, loadUsers, loadDiagnostics, loadRatingData]);

  const handleOpenEditTenant = (t) => {
    setTenantForm({
      tenantId: String(t.tenantId),
      tenantName: t.tenantName || '',
      dbServerName: t.dbServerName || 'dbtst.ad.ortaleza.com',
      dbCatalogName: t.dbCatalogName || 'HELIOS2_TST',
      primaryColor: t.primaryColor || '#013a12',
      accentColor: t.accentColor || '#f59e0b',
      brandTitle: t.brandTitle || 'Helios',
      brandSubtitle: t.brandSubtitle || 'INSURANCE MANAGEMENT SUITE',
      enabledModules: t.enabledModules || 'dashboard,policy,submissions,claims'
    });
    setOpenTenantDialog(true);
  };

  const handleSaveTenant = async (e) => {
    e.preventDefault();
    try {
      await apiFetch('/api/tenants', {
        method: 'POST',
        body: JSON.stringify({
          tenantId: Number(tenantForm.tenantId),
          tenantName: tenantForm.tenantName.trim(),
          dbServerName: tenantForm.dbServerName.trim(),
          dbCatalogName: tenantForm.dbCatalogName.trim(),
          primaryColor: tenantForm.primaryColor,
          accentColor: tenantForm.accentColor,
          brandTitle: tenantForm.brandTitle.trim(),
          brandSubtitle: tenantForm.brandSubtitle.trim(),
          enabledModules: tenantForm.enabledModules
        })
      });
      setOpenTenantDialog(false);
      setFlash({ type: 'success', text: `Saved Tenant #${tenantForm.tenantId} customization to MSTR_DATA.` });
      await loadTenants();
      await loadDiagnostics();
    } catch (err) {
      setFlash({ type: 'error', text: err.message });
    }
  };

  const toggleTenantModule = (modId) => {
    if (modId === 'dashboard') return;
    const list = (tenantForm.enabledModules || '').split(',').map((s) => s.trim()).filter(Boolean);
    const next = list.includes(modId) ? list.filter((m) => m !== modId) : [...list, modId];
    setTenantForm({ ...tenantForm, enabledModules: next.join(',') });
  };

  const handleOpenEditRole = (role) => {
    setRoleForm({
      roleId: role.roleId,
      tenantId: role.tenantId,
      roleCode: role.roleCode,
      roleName: role.roleName,
      allowedModules: role.allowedModules || 'dashboard,policy,submissions,claims',
      defaultTaskFilter: role.defaultTaskFilter || '',
      canCreateSubmission: Boolean(role.canCreateSubmission),
      canAddOrganization: Boolean(role.canAddOrganization),
      canReportClaim: Boolean(role.canReportClaim)
    });
    setOpenRoleDialog(true);
  };

  const handleOpenNewRole = () => {
    setRoleForm({
      roleId: 0,
      tenantId: Number(selectedTenantId),
      roleCode: '',
      roleName: '',
      allowedModules: 'dashboard,policy,submissions',
      defaultTaskFilter: '',
      canCreateSubmission: true,
      canAddOrganization: true,
      canReportClaim: false
    });
    setOpenRoleDialog(true);
  };

  const toggleRoleModule = (modId) => {
    if (modId === 'dashboard') return;
    const list = (roleForm.allowedModules || '').split(',').map((s) => s.trim()).filter(Boolean);
    const next = list.includes(modId) ? list.filter((m) => m !== modId) : [...list, modId];
    setRoleForm({ ...roleForm, allowedModules: next.join(',') });
  };

  const handleSaveRole = async (e) => {
    e.preventDefault();
    try {
      await apiFetch('/api/roles', {
        method: 'POST',
        body: JSON.stringify({
          ...roleForm,
          tenantId: Number(roleForm.tenantId),
          roleCode: roleForm.roleCode.trim().toUpperCase(),
          roleName: roleForm.roleName.trim()
        })
      });
      setOpenRoleDialog(false);
      setFlash({ type: 'success', text: `Saved role "${roleForm.roleName}" for Tenant #${roleForm.tenantId} in MSTR_DATA.` });
      await loadRoles();
    } catch (err) {
      setFlash({ type: 'error', text: err.message });
    }
  };

  const drawerWidth = sidebarCollapsed ? 72 : 260;
  const navItems = [
    { id: 'tenants', label: 'Tenant Customization', icon: <Palette size={18} /> },
    { id: 'roles', label: 'Role & RBAC Manager', icon: <ShieldCheck size={18} /> },
    { id: 'users', label: 'User & Identity Manager', icon: <Users size={18} /> },
    { id: 'rating', label: 'Rating & State Filings', icon: <Calculator size={18} /> },
    { id: 'ruleflow', label: 'RuleFlow Studio & BRMS', icon: <GitFork size={18} /> },
    { id: 'diagnostics', label: 'Services & System Diagnostics', icon: <Activity size={18} /> }
  ];

  const activeTenantObj = tenants.find((t) => t.tenantId === Number(selectedTenantId)) || tenants[0];

  return (
    <ThemeProvider theme={adminTheme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
        {/* Left Control Plane Sidebar */}
        <Drawer
          variant="permanent"
          sx={{
            width: drawerWidth,
            flexShrink: 0,
            transition: 'width 0.2s ease',
            [`& .MuiDrawer-paper`]: {
              width: drawerWidth,
              boxSizing: 'border-box',
              backgroundColor: '#0f172a',
              color: '#ffffff',
              borderRight: 'none',
              overflowX: 'hidden',
              transition: 'width 0.2s ease'
            }
          }}
        >
          {/* Brand Header */}
          <Box sx={{ px: sidebarCollapsed ? 1.5 : 2.5, pt: 2.5, pb: 2 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: sidebarCollapsed ? 'center' : 'space-between',
                mb: sidebarCollapsed ? 0 : 0.5
              }}
            >
              {!sidebarCollapsed && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                  <AdminBrandIcon />
                  <Typography sx={{ fontSize: '1.25rem', fontWeight: 700, color: '#ffffff' }}>
                    HeliosAdmin
                  </Typography>
                </Box>
              )}
              <IconButton
                size="small"
                onClick={() => setSidebarCollapsed((prev) => !prev)}
                sx={{ color: 'rgba(255,255,255,0.75)', '&:hover': { color: '#ffffff' } }}
              >
                <MenuIcon size={18} />
              </IconButton>
            </Box>
            {!sidebarCollapsed && (
              <Typography
                sx={{
                  fontSize: '0.62rem',
                  fontWeight: 600,
                  letterSpacing: '0.12em',
                  color: '#38bdf8',
                  textTransform: 'uppercase'
                }}
              >
                MULTI-TENANT &amp; RBAC CONTROL PLANE
              </Typography>
            )}
          </Box>

          <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)' }} />

          {/* Target Tenant Selector */}
          {!sidebarCollapsed && (
            <Box sx={{ px: 2, py: 2 }}>
              <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8', mb: 0.75, letterSpacing: '0.06em' }}>
                MANAGING TENANT SCOPE
              </Typography>
              <FormControl fullWidth size="small">
                <Select
                  value={selectedTenantId}
                  onChange={(e) => setSelectedTenantId(Number(e.target.value))}
                  sx={{
                    backgroundColor: 'rgba(255,255,255,0.08)',
                    color: '#ffffff',
                    fontSize: '0.84rem',
                    fontWeight: 600,
                    '.MuiSvgIcon-root': { color: '#ffffff' }
                  }}
                >
                  {tenants.map((t) => (
                    <MenuItem key={t.tenantId} value={t.tenantId}>
                      Tenant #{t.tenantId}: {t.tenantName}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          )}

          {/* Navigation Items */}
          <Box sx={{ px: sidebarCollapsed ? 1 : 1.75, mt: 1 }}>
            <List disablePadding>
              {navItems.map((item) => {
                const selected = activeTab === item.id;
                return (
                  <ListItem key={item.id} disablePadding sx={{ mb: 0.6 }}>
                    <ListItemButton
                      selected={selected}
                      onClick={() => setActiveTab(item.id)}
                      sx={{
                        borderRadius: '8px',
                        py: 1.1,
                        px: sidebarCollapsed ? 1.25 : 1.5,
                        justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                        color: selected ? '#ffffff' : 'rgba(255,255,255,0.72)',
                        '&.Mui-selected': {
                          backgroundColor: 'rgba(56, 189, 248, 0.18)',
                          color: '#38bdf8'
                        }
                      }}
                    >
                      <ListItemIcon
                        sx={{
                          minWidth: sidebarCollapsed ? 'auto' : 34,
                          color: selected ? '#38bdf8' : 'rgba(255,255,255,0.72)'
                        }}
                      >
                        {item.icon}
                      </ListItemIcon>
                      {!sidebarCollapsed && (
                        <ListItemText
                          primary={item.label}
                          primaryTypographyProps={{ fontSize: '0.88rem', fontWeight: selected ? 600 : 500 }}
                        />
                      )}
                    </ListItemButton>
                  </ListItem>
                );
              })}
            </List>
          </Box>
        </Drawer>

        {/* Main Right Content */}
        <Box component="main" sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', height: '100vh' }}>
          <AppBar
            position="static"
            color="transparent"
            elevation={0}
            sx={{ borderBottom: '1px solid #e2e8f0', backgroundColor: '#ffffff', height: 56, justifyContent: 'center' }}
          >
            <Toolbar sx={{ justifyContent: 'space-between', minHeight: '56px !important', px: 3.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography sx={{ fontSize: '0.82rem', color: '#94a3b8' }}>HeliosAdmin (Port 8082)</Typography>
                <ChevronRight size={14} color="#cbd5e1" />
                <Typography sx={{ fontSize: '0.82rem', fontWeight: 600, color: '#1e293b' }}>
                  {navItems.find((n) => n.id === activeTab)?.label}
                </Typography>
              </Box>
              <Button
                size="small"
                variant="outlined"
                endIcon={<ExternalLink size={14} />}
                href="http://app.netyx.net"
                target="_blank"
              >
                Open Helios2 App (app.netyx.net)
              </Button>
            </Toolbar>
          </AppBar>

          <Box sx={{ flexGrow: 1, py: 4, px: { xs: 3, md: 5 }, overflow: 'auto', backgroundColor: '#f8fafc' }}>
            <Box sx={{ maxWidth: 1180, mx: 'auto' }}>
              {flash && (
                <Alert severity={flash.type} onClose={() => setFlash(null)} sx={{ mb: 3 }}>
                  {flash.text}
                </Alert>
              )}

              {/* TAB 1: TENANT CUSTOMIZATION */}
              {activeTab === 'tenants' && (
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Box>
                      <Typography variant="h4" sx={{ fontSize: '1.65rem', mb: 0.4 }}>
                        Tenant Branding &amp; Module Customization
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#64748b' }}>
                        Configure per-tenant SQL Server routing, sidebar colors, titles, and enabled modules in MSTR_DATA.dbo.TENANT_DB_CONFIG
                      </Typography>
                    </Box>
                    <Button
                      variant="contained"
                      startIcon={<Plus size={16} />}
                      onClick={() => {
                        setTenantForm({
                          tenantId: '',
                          tenantName: '',
                          dbServerName: 'dbtst.ad.ortaleza.com',
                          dbCatalogName: 'HELIOS2_TST',
                          primaryColor: '#013a12',
                          accentColor: '#f59e0b',
                          brandTitle: 'Helios',
                          brandSubtitle: 'INSURANCE MANAGEMENT SUITE',
                          enabledModules: 'dashboard,policy,submissions,claims'
                        });
                        setOpenTenantDialog(true);
                      }}
                    >
                      Register New Tenant
                    </Button>
                  </Box>

                  <Card elevation={0}>
                    <TableContainer>
                      <Table>
                        <TableHead sx={{ backgroundColor: '#f8fafc' }}>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>TENANT ID</TableCell>
                            <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>TENANT NAME</TableCell>
                            <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>SQL CATALOG</TableCell>
                            <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>THEME &amp; BRANDING</TableCell>
                            <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>TENANT MODULES</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>ACTIONS</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {tenants.map((t) => (
                            <TableRow key={t.tenantId} hover>
                              <TableCell sx={{ fontWeight: 700 }}>#{t.tenantId}</TableCell>
                              <TableCell sx={{ fontWeight: 600 }}>{t.tenantName}</TableCell>
                              <TableCell>
                                <code>{t.dbCatalogName}</code>
                              </TableCell>
                              <TableCell>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                                  <Box
                                    sx={{
                                      width: 24,
                                      height: 24,
                                      borderRadius: '6px',
                                      backgroundColor: t.primaryColor || '#013a12',
                                      border: `2px solid ${t.accentColor || '#f59e0b'}`
                                    }}
                                  />
                                  <Box>
                                    <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                                      {t.brandTitle || 'Helios'}
                                    </Typography>
                                    <Typography variant="caption" color="textSecondary">
                                      {t.brandSubtitle}
                                    </Typography>
                                  </Box>
                                </Box>
                              </TableCell>
                              <TableCell>
                                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                  {(t.enabledModules || 'dashboard,policy,submissions,claims')
                                    .split(',')
                                    .filter((m) => m !== 'diagnostics')
                                    .map((m) => (
                                      <Chip key={m} label={m} size="small" sx={{ fontSize: '0.7rem', height: 22 }} />
                                    ))}
                                </Box>
                              </TableCell>
                              <TableCell align="right">
                                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    onClick={() => {
                                      setSelectedTenantId(t.tenantId);
                                      setActiveTab('roles');
                                    }}
                                  >
                                    Manage Roles
                                  </Button>
                                  <Button
                                    size="small"
                                    variant="contained"
                                    onClick={() => handleOpenEditTenant(t)}
                                  >
                                    Customize UI
                                  </Button>
                                </Box>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Card>
                </Box>
              )}

              {/* TAB 2: ROLE & RBAC CUSTOMIZATION */}
              {activeTab === 'roles' && (
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Box>
                      <Typography variant="h4" sx={{ fontSize: '1.65rem', mb: 0.4 }}>
                        Role &amp; Permission Customization ΓÇö {activeTenantObj?.tenantName || `Tenant #${selectedTenantId}`}
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#64748b' }}>
                        Configure intra-tenant roles, visible sidebar tabs, default task queues, and write permissions in MSTR_DATA.dbo.TENANT_ROLE_CONFIG
                      </Typography>
                    </Box>
                    <Button variant="contained" startIcon={<Plus size={16} />} onClick={handleOpenNewRole}>
                      Add Role for Tenant #{selectedTenantId}
                    </Button>
                  </Box>

                  <Card elevation={0}>
                    <TableContainer>
                      <Table>
                        <TableHead sx={{ backgroundColor: '#f8fafc' }}>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>ROLE CODE</TableCell>
                            <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>ROLE NAME</TableCell>
                            <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>ALLOWED SIDEBAR TABS</TableCell>
                            <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>DEFAULT TASK QUEUE</TableCell>
                            <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>ACTION PERMISSIONS</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>EDIT</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {roles.map((r) => (
                            <TableRow key={r.roleId} hover>
                              <TableCell>
                                <code>{r.roleCode}</code>
                              </TableCell>
                              <TableCell sx={{ fontWeight: 600 }}>{r.roleName}</TableCell>
                              <TableCell>
                                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                  {(r.allowedModules || '').split(',').map((m) => (
                                    <Chip key={m} label={m} size="small" color="primary" variant="outlined" sx={{ fontSize: '0.7rem', height: 22 }} />
                                  ))}
                                </Box>
                              </TableCell>
                              <TableCell>{r.defaultTaskFilter || 'All Tasks'}</TableCell>
                              <TableCell>
                                <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                                  <StatusBadge ok={r.canCreateSubmission} label="Create Submsn" />
                                  <StatusBadge ok={r.canAddOrganization} label="Add Org" />
                                  <StatusBadge ok={r.canReportClaim} label="Report Claim" />
                                </Box>
                              </TableCell>
                              <TableCell align="right">
                                <Button size="small" variant="outlined" onClick={() => handleOpenEditRole(r)}>
                                  Edit Permissions
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Card>
                </Box>
              )}

              {/* TAB: USER & IDENTITY MANAGEMENT */}
              {activeTab === 'users' && (
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Box>
                      <Typography variant="h4" sx={{ fontSize: '1.65rem', mb: 0.4 }}>
                        User &amp; Identity Management — {activeTenantObj?.tenantName || `Tenant #${selectedTenantId}`}
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#64748b' }}>
                        Maintain user accounts, role assignments, and tenant associations in <code>{activeTenantObj?.dbCatalogName || 'HELIOS2_TST'}</code> (dbo.APP_USER). Enterprise SSO architecture ready for Windows Login and Azure Entra ID.
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1.5 }}>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<RefreshCw size={15} />}
                        onClick={loadUsers}
                      >
                        Refresh Users
                      </Button>
                      <Button
                        variant="contained"
                        size="small"
                        startIcon={<UserPlus size={16} />}
                        onClick={handleOpenAddUser}
                      >
                        Create User
                      </Button>
                    </Box>
                  </Box>

                  {/* Summary Metric Cards */}
                  <Grid container spacing={2.5} sx={{ mb: 3 }}>
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                      <Card elevation={0}>
                        <CardContent sx={{ p: 2.25 }}>
                          <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                            Tenant Accounts
                          </Typography>
                          <Typography variant="h4" sx={{ fontWeight: 800, color: '#0f172a', mt: 0.5 }}>
                            {users.length}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#0284c7', mt: 0.5, display: 'block' }}>
                            Catalog: {activeTenantObj?.dbCatalogName}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                      <Card elevation={0}>
                        <CardContent sx={{ p: 2.25 }}>
                          <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                            Active Accounts
                          </Typography>
                          <Typography variant="h4" sx={{ fontWeight: 800, color: '#16a34a', mt: 0.5 }}>
                            {users.filter((u) => u.active).length}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#64748b', mt: 0.5, display: 'block' }}>
                            {users.filter((u) => !u.active).length} deactivated
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                      <Card elevation={0}>
                        <CardContent sx={{ p: 2.25 }}>
                          <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                            Directory Mode
                          </Typography>
                          <Typography variant="h5" sx={{ fontWeight: 700, color: '#0f172a', mt: 0.75 }}>
                            Local + SSO Ready
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#64748b', mt: 0.5, display: 'block' }}>
                            Windows AD &bull; Azure Entra ID
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                      <Card elevation={0}>
                        <CardContent sx={{ p: 2.25 }}>
                          <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                            Password Policy
                          </Typography>
                          <Typography variant="h5" sx={{ fontWeight: 700, color: '#d97706', mt: 0.75 }}>
                            Blank Allowed
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#64748b', mt: 0.5, display: 'block' }}>
                            Evaluation / Demo mode active
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>

                  {/* Filters & Search */}
                  <Card elevation={0} sx={{ mb: 3 }}>
                    <CardContent sx={{ p: 2, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                      <TextField
                        size="small"
                        placeholder="Filter by name, username, email, department..."
                        value={userSearchQuery}
                        onChange={(e) => setUserSearchQuery(e.target.value)}
                        sx={{ minWidth: 280, flexGrow: 1 }}
                        InputProps={{
                          startAdornment: (
                            <Box sx={{ mr: 1, color: '#64748b', display: 'flex', alignItems: 'center' }}>
                              <Search size={16} />
                            </Box>
                          )
                        }}
                      />
                      <FormControl size="small" sx={{ minWidth: 180 }}>
                        <InputLabel>Role Filter</InputLabel>
                        <Select
                          label="Role Filter"
                          value={userFilterRole}
                          onChange={(e) => setUserFilterRole(e.target.value)}
                        >
                          <MenuItem value="">All Roles</MenuItem>
                          {roles.map((r) => (
                            <MenuItem key={r.roleCode} value={r.roleCode}>
                              {r.roleName}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      <FormControl size="small" sx={{ minWidth: 180 }}>
                        <InputLabel>Auth Provider</InputLabel>
                        <Select
                          label="Auth Provider"
                          value={userFilterProvider}
                          onChange={(e) => setUserFilterProvider(e.target.value)}
                        >
                          <MenuItem value="">All Providers</MenuItem>
                          <MenuItem value="LOCAL">Local Database</MenuItem>
                          <MenuItem value="WINDOWS_AD">Windows Active Directory</MenuItem>
                          <MenuItem value="AZURE_ENTRA_ID">Microsoft Entra ID</MenuItem>
                        </Select>
                      </FormControl>
                    </CardContent>
                  </Card>

                  {/* Users Table */}
                  <Card elevation={0} sx={{ mb: 3 }}>
                    <TableContainer component={Paper} elevation={0}>
                      <Table size="small">
                        <TableHead sx={{ backgroundColor: '#f8fafc' }}>
                          <TableRow>
                            <TableCell>User</TableCell>
                            <TableCell>Tenant Association</TableCell>
                            <TableCell>Assigned Role</TableCell>
                            <TableCell>Department</TableCell>
                            <TableCell>Auth Provider</TableCell>
                            <TableCell>External Identity / UPN</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Last Login</TableCell>
                            <TableCell align="right">Actions</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {filteredUsers.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={9} sx={{ textAlign: 'center', py: 4, color: '#94a3b8' }}>
                                No users found in {activeTenantObj?.dbCatalogName} matching current filters.
                              </TableCell>
                            </TableRow>
                          ) : (
                            filteredUsers.map((u) => (
                              <TableRow key={u.userId} hover>
                                <TableCell>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                                    <Box
                                      sx={{
                                        width: 32,
                                        height: 32,
                                        borderRadius: '50%',
                                        backgroundColor: '#0f172a',
                                        color: '#ffffff',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontWeight: 700,
                                        fontSize: '0.78rem'
                                      }}
                                    >
                                      {u.displayName.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                                    </Box>
                                    <Box>
                                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                        {u.displayName}
                                      </Typography>
                                      <Typography variant="caption" sx={{ color: '#64748b' }}>
                                        @{u.username} &bull; {u.email || 'no-email'}
                                      </Typography>
                                    </Box>
                                  </Box>
                                </TableCell>
                                <TableCell>
                                  <Chip
                                    label={`Tenant #${u.tenantId} (${activeTenantObj?.dbCatalogName || 'HELIOS2_TST'})`}
                                    size="small"
                                    sx={{ fontWeight: 600, fontSize: '0.7rem' }}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Chip
                                    label={u.roleName || u.roleCode}
                                    size="small"
                                    color="primary"
                                    variant="outlined"
                                    sx={{ fontWeight: 600, fontSize: '0.72rem' }}
                                  />
                                </TableCell>
                                <TableCell sx={{ fontSize: '0.8rem', color: '#475569' }}>
                                  {u.department || 'General Insurance'}
                                </TableCell>
                                <TableCell>
                                  <Chip
                                    label={u.authProvider || 'LOCAL'}
                                    size="small"
                                    sx={{
                                      fontSize: '0.68rem',
                                      fontWeight: 700,
                                      backgroundColor:
                                        u.authProvider === 'AZURE_ENTRA_ID'
                                          ? '#e0f2fe'
                                          : u.authProvider === 'WINDOWS_AD'
                                          ? '#f0fdf4'
                                          : '#f1f5f9',
                                      color:
                                        u.authProvider === 'AZURE_ENTRA_ID'
                                          ? '#0369a1'
                                          : u.authProvider === 'WINDOWS_AD'
                                          ? '#15803d'
                                          : '#475569'
                                    }}
                                  />
                                </TableCell>
                                <TableCell sx={{ fontSize: '0.78rem', fontFamily: 'monospace', color: '#0369a1' }}>
                                  {u.externalSubjectId || `${u.username}@ad.ortaleza.com`}
                                </TableCell>
                                <TableCell>
                                  <Chip
                                    label={u.active ? 'Active' : 'Inactive'}
                                    size="small"
                                    color={u.active ? 'success' : 'default'}
                                    sx={{ fontSize: '0.7rem', fontWeight: 600 }}
                                  />
                                </TableCell>
                                <TableCell sx={{ fontSize: '0.78rem', color: '#64748b' }}>
                                  {u.lastLoginDt ? u.lastLoginDt.slice(0, 16) : 'Never'}
                                </TableCell>
                                <TableCell align="right">
                                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                                    <Button
                                      size="small"
                                      variant="outlined"
                                      startIcon={<Edit2 size={13} />}
                                      onClick={() => handleOpenEditUser(u)}
                                    >
                                      Edit
                                    </Button>
                                    <Button
                                      size="small"
                                      color={u.active ? 'error' : 'success'}
                                      onClick={() => handleToggleUserActive(u)}
                                    >
                                      {u.active ? 'Deactivate' : 'Activate'}
                                    </Button>
                                  </Box>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Card>

                  {/* Enterprise Single Sign-On Architecture & Roadmap Section */}
                  <Card elevation={0} sx={{ borderLeft: '4px solid #0284c7' }}>
                    <CardContent sx={{ p: 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 1.5 }}>
                        <ShieldCheck size={22} color="#0284c7" />
                        <Typography variant="h6" sx={{ fontWeight: 700 }}>
                          Enterprise Identity Federation Architecture (Planned Roadmap)
                        </Typography>
                      </Box>
                      <Typography variant="body2" sx={{ color: '#475569', mb: 3 }}>
                        Helios is designed for enterprise hybrid identity federation. User accounts stored in each tenant&apos;s database (<code>dbo.APP_USER</code>) are already provisioned with federation identifiers (<code>AUTH_PROVIDER</code>, <code>EXTERNAL_SUBJECT_ID</code>) to seamlessly transition from evaluation passwords to corporate Single Sign-On.
                      </Typography>

                      <Grid container spacing={3}>
                        <Grid size={{ xs: 12, md: 6 }}>
                          <Paper variant="outlined" sx={{ p: 2.5, backgroundColor: '#f8fafc', height: '100%' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                              <Laptop size={18} color="#0284c7" />
                              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0f172a' }}>
                                1. Windows Login (Kerberos / SPNEGO / Active Directory)
                              </Typography>
                            </Box>
                            <Typography variant="body2" sx={{ color: '#64748b', fontSize: '0.82rem', mb: 2 }}>
                              Authenticates transparently using your Windows domain workstation session. When a user navigates to Helios, the browser negotiates a Kerberos ticket with the Spring Boot backend.
                            </Typography>
                            <Box sx={{ backgroundColor: '#0f172a', color: '#38bdf8', p: 1.5, borderRadius: '6px', fontSize: '0.74rem', fontFamily: 'monospace' }}>
                              <div># Domain Realm: AD.ORTALEZA.COM</div>
                              <div># SPN: HTTP/apptst.ad.ortaleza.com@AD.ORTALEZA.COM</div>
                              <div># Matching: dbo.APP_USER.EXTERNAL_SUBJECT_ID = sAMAccountName + &apos;@AD.ORTALEZA.COM&apos;</div>
                              <div># Fallback: NTLM Negotiate via Waffle Security Filter</div>
                            </Box>
                          </Paper>
                        </Grid>

                        <Grid size={{ xs: 12, md: 6 }}>
                          <Paper variant="outlined" sx={{ p: 2.5, backgroundColor: '#f8fafc', height: '100%' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                              <Key size={18} color="#2563eb" />
                              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0f172a' }}>
                                2. Microsoft Azure Entra ID (OIDC / OAuth 2.0)
                              </Typography>
                            </Box>
                            <Typography variant="body2" sx={{ color: '#64748b', fontSize: '0.82rem', mb: 2 }}>
                              Integrates with Microsoft 365 / Azure Entra ID for cloud-first enterprise authentication with multi-factor authentication (MFA) and conditional access.
                            </Typography>
                            <Box sx={{ backgroundColor: '#0f172a', color: '#38bdf8', p: 1.5, borderRadius: '6px', fontSize: '0.74rem', fontFamily: 'monospace' }}>
                              <div># Authority: https://login.microsoftonline.com/&lt;tenant-id&gt;</div>
                              <div># Flow: Authorization Code with PKCE</div>
                              <div># Claims: oid (Object ID), preferred_username, roles</div>
                              <div># Matching: dbo.APP_USER.EXTERNAL_SUBJECT_ID = token.oid</div>
                            </Box>
                          </Paper>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Box>
              )}

              {/* TAB 3: SERVICES STATUS & PERFORMANCE METRICS */}
              {activeTab === 'diagnostics' && (() => {
                const serviceList = registeredServices.map((svc) => ({
                  id: svc.serviceKey,
                  title: svc.displayName,
                  shortName: svc.shortName,
                  serviceDesc: svc.serviceDesc,
                  port: String(svc.port),
                  windowsService: svc.windowsService,
                  route: svc.diagnosticsRoute,
                  color: svc.uiColor || '#0284c7',
                  icon: resolveServiceIcon(svc.uiIcon, svc.uiColor ? '#38bdf8' : undefined),
                  diag: servicesDiag[svc.serviceKey] || { loading: diagRefreshing, data: null, latency: null, error: null }
                }));

                const onlineCount = serviceList.filter(s => s.diag?.data && !s.diag?.error).length;
                const latencies = serviceList.filter(s => s.diag?.latency != null).map(s => s.diag.latency);
                const avgLatency = latencies.length ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : null;
                const totalHeapUsed = serviceList.reduce((acc, s) => acc + (s.diag?.data?.usedMemoryMb || 0), 0);
                const totalHeapAllocated = serviceList.reduce((acc, s) => acc + (s.diag?.data?.totalMemoryMb || 0), 0);

                return (
                  <Box>
                    {/* Header */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
                      <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.4 }}>
                          <Typography variant="h4" sx={{ fontSize: '1.65rem' }}>
                            Platform Topology &amp; Service Diagnostics
                          </Typography>
                          <Chip
                            label="Dynamic MSTR_DATA Registry"
                            size="small"
                            sx={{ height: 22, fontSize: '0.7rem', fontWeight: 700, bgcolor: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0' }}
                          />
                        </Box>
                        <Typography variant="body2" sx={{ color: '#64748b' }}>
                          Real-time health telemetry, round-trip latency, JVM heap allocation, and database connectivity across all {serviceList.length} microservices dynamically loaded from MSTR_DATA
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <FormControlLabel
                          control={
                            <Switch
                              size="small"
                              checked={autoRefreshDiag}
                              onChange={(e) => setAutoRefreshDiag(e.target.checked)}
                            />
                          }
                          label={<Typography variant="body2" sx={{ fontSize: '0.82rem', color: '#475569', fontWeight: 600 }}>Auto-refresh (10s)</Typography>}
                        />
                        <Button
                          variant="contained"
                          disabled={diagRefreshing}
                          startIcon={<RefreshCw size={16} className={diagRefreshing ? 'spin-icon' : ''} />}
                          onClick={loadDiagnostics}
                        >
                          {diagRefreshing ? 'Refreshing Services...' : 'Refresh All Services'}
                        </Button>
                      </Box>
                    </Box>

                    {/* Platform Summary Metrics Banner */}
                    <Grid container spacing={2.5} sx={{ mb: 3.5 }}>
                      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <Card elevation={0} sx={{ borderLeft: '4px solid #16a34a', height: '100%' }}>
                          <CardContent sx={{ py: 2 }}>
                            <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, letterSpacing: '0.05em' }}>
                              MICROSERVICES OPERATIONAL
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mt: 0.5 }}>
                              <Typography variant="h4" sx={{ fontWeight: 800, color: onlineCount === 4 ? '#16a34a' : '#d97706' }}>
                                {onlineCount} / 4
                              </Typography>
                              <Chip
                                label={onlineCount === 4 ? '100% HEALTHY' : 'DEGRADED'}
                                size="small"
                                sx={{
                                  fontSize: '0.68rem',
                                  fontWeight: 700,
                                  height: 20,
                                  bgcolor: onlineCount === 4 ? '#dcfce7' : '#fef3c7',
                                  color: onlineCount === 4 ? '#15803d' : '#b45309'
                                }}
                              />
                            </Box>
                            <Typography variant="caption" sx={{ color: '#64748b', mt: 0.5, display: 'block' }}>
                              Core (8080), Admin (8082), Rating (8084), Doc (8086)
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>

                      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <Card elevation={0} sx={{ borderLeft: '4px solid #0284c7', height: '100%' }}>
                          <CardContent sx={{ py: 2 }}>
                            <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, letterSpacing: '0.05em' }}>
                              AVG ROUND-TRIP LATENCY
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mt: 0.5 }}>
                              <Typography variant="h4" sx={{ fontWeight: 800, color: '#0284c7' }}>
                                {avgLatency != null ? `${avgLatency} ms` : '...'}
                              </Typography>
                              {latencies.length > 0 && (
                                <Chip
                                  label={`Max: ${Math.max(...latencies)} ms`}
                                  size="small"
                                  sx={{ fontSize: '0.68rem', fontWeight: 700, height: 20, bgcolor: '#e0f2fe', color: '#0284c7' }}
                                />
                              )}
                            </Box>
                            <Typography variant="caption" sx={{ color: '#64748b', mt: 0.5, display: 'block' }}>
                              Measured client-side via NGINX reverse-proxy
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>

                      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <Card elevation={0} sx={{ borderLeft: '4px solid #7c3aed', height: '100%' }}>
                          <CardContent sx={{ py: 2 }}>
                            <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, letterSpacing: '0.05em' }}>
                              TOTAL JVM HEAP CONSUMPTION
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mt: 0.5 }}>
                              <Typography variant="h4" sx={{ fontWeight: 800, color: '#7c3aed' }}>
                                {totalHeapUsed} MB
                              </Typography>
                              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
                                / {totalHeapAllocated} MB
                              </Typography>
                            </Box>
                            <Typography variant="caption" sx={{ color: '#64748b', mt: 0.5, display: 'block' }}>
                              Aggregated across 4 dedicated JVM instances
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>

                      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <Card elevation={0} sx={{ borderLeft: '4px solid #0f172a', height: '100%' }}>
                          <CardContent sx={{ py: 2 }}>
                            <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, letterSpacing: '0.05em' }}>
                              SQL CLUSTER STATE
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mt: 0.5 }}>
                              <Typography variant="h5" sx={{ fontWeight: 800, color: '#0f172a' }}>
                                SQL SERVER 2025
                              </Typography>
                              <Chip
                                label="ONLINE"
                                size="small"
                                sx={{ fontSize: '0.68rem', fontWeight: 700, height: 20, bgcolor: '#dcfce7', color: '#15803d' }}
                              />
                            </Box>
                            <Typography variant="caption" sx={{ color: '#64748b', mt: 0.5, display: 'block' }}>
                              dbtst.ad.ortaleza.com (Windows Auth Native DLL)
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                    </Grid>

                    {/* Section 1: Microservices Grid */}
                    <Typography variant="h6" sx={{ fontSize: '1.15rem', fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Server size={20} color="#0284c7" />
                      Platform Microservices Fleet (APPTST - 10.1.10.56)
                    </Typography>

                    <Grid container spacing={3} sx={{ mb: 4 }}>
                      {serviceList.map((svc) => {
                        const isUp = svc.diag?.data && !svc.diag?.error;
                        const data = svc.diag?.data || {};

                        return (
                          <Grid key={svc.id} size={{ xs: 12, md: 6 }}>
                            <Card elevation={0} sx={{ borderTop: `4px solid ${svc.color}`, height: '100%', display: 'flex', flexDirection: 'column' }}>
                              <CardContent sx={{ flex: 1, p: 2.5 }}>
                                {/* Top Title & Status */}
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                    <Box
                                      sx={{
                                        width: 38,
                                        height: 38,
                                        borderRadius: 2,
                                        bgcolor: `${svc.color}15`,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                      }}
                                    >
                                      {svc.icon}
                                    </Box>
                                    <Box>
                                      <Typography variant="h6" sx={{ fontSize: '1.05rem', fontWeight: 700 }}>
                                        {svc.title}
                                      </Typography>
                                      <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                                        {svc.serviceDesc}
                                      </Typography>
                                    </Box>
                                  </Box>

                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <LatencyBadge ms={svc.diag?.latency} />
                                    <StatusBadge ok={isUp} label={isUp ? 'ONLINE' : 'OFFLINE'} />
                                  </Box>
                                </Box>

                                <Divider sx={{ my: 1.5 }} />

                                {/* Host / Port / Windows Service Info */}
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                                  <Chip
                                    label={`Port: ${svc.port}`}
                                    size="small"
                                    sx={{ fontSize: '0.74rem', fontWeight: 600, bgcolor: '#f1f5f9', color: '#0f172a' }}
                                  />
                                  <Chip
                                    label={`Service: ${svc.windowsService}`}
                                    size="small"
                                    sx={{ fontSize: '0.74rem', fontWeight: 600, bgcolor: '#f1f5f9', color: '#0f172a' }}
                                  />
                                  <Chip
                                    label={`Route: ${svc.route}`}
                                    size="small"
                                    sx={{ fontSize: '0.74rem', fontFamily: 'monospace', bgcolor: '#f8fafc', color: '#475569' }}
                                  />
                                  {data.version && (
                                    <Chip
                                      label={`v${data.version}`}
                                      size="small"
                                      sx={{ fontSize: '0.74rem', fontWeight: 600, bgcolor: '#f1f5f9', color: '#64748b' }}
                                    />
                                  )}
                                </Box>

                                {/* JVM Heap Memory Bar */}
                                {isUp && data.usedMemoryMb != null && (
                                  <MemoryBar
                                    usedMb={data.usedMemoryMb}
                                    totalMb={data.totalMemoryMb}
                                    maxMb={data.maxMemoryMb}
                                  />
                                )}

                                {/* Hardware & Concurrency Telemetry */}
                                {isUp && (
                                  <Box sx={{ mt: 2, pt: 1.5, borderTop: '1px dashed #e2e8f0' }}>
                                    <Grid container spacing={1}>
                                      <Grid size={{ xs: 6 }}>
                                        <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                                          CPU PROCESSORS
                                        </Typography>
                                        <Typography variant="body2" sx={{ fontWeight: 700, color: '#0f172a' }}>
                                          {data.availableProcessors ? `${data.availableProcessors} Cores` : '2 Cores'}
                                        </Typography>
                                      </Grid>
                                      <Grid size={{ xs: 6 }}>
                                        <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                                          ACTIVE THREADS
                                        </Typography>
                                        <Typography variant="body2" sx={{ fontWeight: 700, color: '#0f172a' }}>
                                          {data.activeThreads ? `${data.activeThreads} Threads` : '20 Threads'}
                                        </Typography>
                                      </Grid>

                                      {/* Domain-specific Metrics */}
                                      {svc.id === 'helios2' && (
                                        <>
                                          <Grid size={{ xs: 12 }} sx={{ mt: 1 }}>
                                            <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                                              MULTI-TENANT ROUTING &amp; AUTH
                                            </Typography>
                                            <Typography variant="body2" sx={{ fontSize: '0.82rem', color: '#334155' }}>
                                              Active Tenant #{data.activeTenantId} ({data.activeTenantConfig?.tenantName || 'Default'}) &bull; {data.authMode}
                                            </Typography>
                                          </Grid>
                                        </>
                                      )}

                                      {svc.id === 'admin' && (
                                        <>
                                          <Grid size={{ xs: 12 }} sx={{ mt: 1 }}>
                                            <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                                              TENANT REGISTRY &amp; ACLs
                                            </Typography>
                                            <Typography variant="body2" sx={{ fontSize: '0.82rem', color: '#334155' }}>
                                              {tenants.length} Tenants Configured &bull; Master Registry (<code>MSTR_DATA</code>) Connected
                                            </Typography>
                                          </Grid>
                                        </>
                                      )}

                                      {svc.id === 'rating' && (
                                        <>
                                          <Grid size={{ xs: 12 }} sx={{ mt: 1 }}>
                                            <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                                              ACTUARIAL PRODUCTS &amp; FILINGS
                                            </Typography>
                                            <Typography variant="body2" sx={{ fontSize: '0.82rem', color: '#334155' }}>
                                              {data.availableProductsCount || 3} Commercial Lines &bull; {data.availablePlansCount || 3} Plans &bull; {data.activeStateFilingsCount || 9} State Filings (SERFF)
                                            </Typography>
                                          </Grid>
                                        </>
                                      )}

                                      {svc.id === 'document' && (
                                        <>
                                          <Grid size={{ xs: 12 }} sx={{ mt: 1 }}>
                                            <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                                              DOCUMENT GENERATOR &amp; ASPOSE PDF
                                            </Typography>
                                            <Typography variant="body2" sx={{ fontSize: '0.82rem', color: '#334155' }}>
                                              {data.engine || 'Aspose.PDF for Java 24.12'} &bull; {data.documentsIssuedCount || 0} Documents Issued &bull; Storage: <code>{data.storagePath}</code>
                                            </Typography>
                                          </Grid>
                                        </>
                                      )}
                                    </Grid>
                                  </Box>
                                )}

                                {/* Error banner if service is down */}
                                {!isUp && (
                                  <Alert severity="error" sx={{ mt: 2, py: 0.5, fontSize: '0.8rem' }}>
                                    {svc.diag?.error || 'Service unresponsive on assigned port'}
                                  </Alert>
                                )}
                              </CardContent>
                            </Card>
                          </Grid>
                        );
                      })}
                    </Grid>

                    {/* Section 2: Database Infrastructure & Tenant Catalogs */}
                    <Typography variant="h6" sx={{ fontSize: '1.15rem', fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Database size={20} color="#0f172a" />
                      Database Infrastructure &amp; Dynamic Tenant Catalogs (SQL Server 2025)
                    </Typography>

                    <Grid container spacing={3}>
                      {/* Master Catalog */}
                      <Grid size={{ xs: 12, md: 4 }}>
                        <Card elevation={0} sx={{ borderTop: '4px solid #0f172a', height: '100%' }}>
                          <CardContent sx={{ p: 2.5 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                              <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 700 }}>
                                Master Registry (MSTR_DATA)
                              </Typography>
                              <StatusBadge
                                ok={diag?.masterDatabase?.connected}
                                label={diag?.masterDatabase?.connected ? 'Connected' : 'Error'}
                              />
                            </Box>
                            <Divider sx={{ mb: 2 }} />
                            <Typography variant="body2" sx={{ mb: 0.5, fontSize: '0.82rem' }}>
                              <strong>Server:</strong> <code>{diag?.masterDatabase?.serverName || 'DBTST'} (dbtst.ad.ortaleza.com:1433)</code>
                            </Typography>
                            <Typography variant="body2" sx={{ mb: 0.5, fontSize: '0.82rem' }}>
                              <strong>Catalog:</strong> <code>{diag?.masterDatabase?.databaseName || 'MSTR_DATA'}</code>
                            </Typography>
                            <Typography variant="body2" sx={{ mb: 1.5, fontSize: '0.82rem' }}>
                              <strong>Identity:</strong> <code>{diag?.masterDatabase?.authenticatedUser || 'AD\\APPTST$'}</code>
                            </Typography>
                            <Box sx={{ bgcolor: '#f8fafc', p: 1.5, borderRadius: 1.5, border: '1px solid #e2e8f0', fontSize: '0.74rem', color: '#475569' }}>
                              Stores master tenant registrations (<code>dbo.TENANT_DB_CONFIG</code>) and global role permissions.
                            </Box>
                          </CardContent>
                        </Card>
                      </Grid>

                      {/* Active Tenant Catalog */}
                      <Grid size={{ xs: 12, md: 4 }}>
                        <Card elevation={0} sx={{ borderTop: '4px solid #0284c7', height: '100%' }}>
                          <CardContent sx={{ p: 2.5 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                              <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 700 }}>
                                Tenant #{selectedTenantId} ({activeTenantObj?.dbCatalogName || 'HELIOS2_TST'})
                              </Typography>
                              <StatusBadge
                                ok={diag?.tenantDatabase?.connected}
                                label={diag?.tenantDatabase?.connected ? 'Connected' : 'Error'}
                              />
                            </Box>
                            <Divider sx={{ mb: 2 }} />
                            <Typography variant="body2" sx={{ mb: 0.5, fontSize: '0.82rem' }}>
                              <strong>Server:</strong> <code>{diag?.tenantDatabase?.serverName || 'DBTST'} (dbtst.ad.ortaleza.com:1433)</code>
                            </Typography>
                            <Typography variant="body2" sx={{ mb: 0.5, fontSize: '0.82rem' }}>
                              <strong>Catalog:</strong> <code>{diag?.tenantDatabase?.databaseName || activeTenantObj?.dbCatalogName || 'HELIOS2_TST'}</code>
                            </Typography>
                            <Typography variant="body2" sx={{ mb: 1.5, fontSize: '0.82rem' }}>
                              <strong>Identity:</strong> <code>{diag?.tenantDatabase?.authenticatedUser || 'AD\\APPTST$'}</code>
                            </Typography>
                            <Box sx={{ bgcolor: '#f8fafc', p: 1.5, borderRadius: 1.5, border: '1px solid #e2e8f0', fontSize: '0.74rem', color: '#475569' }}>
                              Dynamic tenant isolation via <code>X-Tenant-ID</code>. Stores policies, submissions, users, and documents.
                            </Box>
                          </CardContent>
                        </Card>
                      </Grid>

                      {/* Actuarial & Rating Database */}
                      <Grid size={{ xs: 12, md: 4 }}>
                        <Card elevation={0} sx={{ borderTop: '4px solid #059669', height: '100%' }}>
                          <CardContent sx={{ p: 2.5 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                              <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 700 }}>
                                Rating DB (HELIOS_RATING_DB)
                              </Typography>
                              <StatusBadge
                                ok={servicesDiag.rating?.data && !servicesDiag.rating?.error}
                                label={servicesDiag.rating?.data && !servicesDiag.rating?.error ? 'Connected' : 'Offline'}
                              />
                            </Box>
                            <Divider sx={{ mb: 2 }} />
                            <Typography variant="body2" sx={{ mb: 0.5, fontSize: '0.82rem' }}>
                              <strong>Server:</strong> <code>DBTST (dbtst.ad.ortaleza.com:1433)</code>
                            </Typography>
                            <Typography variant="body2" sx={{ mb: 0.5, fontSize: '0.82rem' }}>
                              <strong>Catalog:</strong> <code>HELIOS_RATING_DB</code>
                            </Typography>
                            <Typography variant="body2" sx={{ mb: 1.5, fontSize: '0.82rem' }}>
                              <strong>Filings:</strong> <code>9 Approved Versions (SERFF)</code>
                            </Typography>
                            <Box sx={{ bgcolor: '#f8fafc', p: 1.5, borderRadius: 1.5, border: '1px solid #e2e8f0', fontSize: '0.74rem', color: '#475569' }}>
                              Multi-state statutory actuarial rules, schedule caps, and product rate versioning engine.
                            </Box>
                          </CardContent>
                        </Card>
                      </Grid>
                    </Grid>
                  </Box>
                );
              })()}

              {/* TAB 4: RATING & STATE FILINGS */}
              {activeTab === 'rating' && (
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Box>
                      <Typography variant="h4" sx={{ fontSize: '1.65rem', mb: 0.4 }}>
                        Rules, Rating &amp; State Approval Registry
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#64748b' }}>
                        Manage product lines, SERFF regulatory filings, state-specific schedule caps, and test algorithms in <code>HELIOS_RATING_DB</code>
                      </Typography>
                    </Box>
                    <Button variant="contained" startIcon={<RefreshCw size={16} />} onClick={loadRatingData}>
                      Refresh Filings
                    </Button>
                  </Box>

                  {/* Summary Metric Cards */}
                  <Grid container spacing={2} sx={{ mb: 3 }}>
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                      <Card elevation={0} sx={{ borderLeft: '4px solid #0f172a' }}>
                        <CardContent sx={{ py: 2 }}>
                          <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, letterSpacing: '0.05em' }}>
                            PRODUCTS
                          </Typography>
                          <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5 }}>
                            {ratingProducts.length}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#0f172a', fontWeight: 600 }}>
                            TECH_EO, MED_MAL, DNO
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                      <Card elevation={0} sx={{ borderLeft: '4px solid #0284c7' }}>
                        <CardContent sx={{ py: 2 }}>
                          <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, letterSpacing: '0.05em' }}>
                            ACTIVE STATE FILINGS
                          </Typography>
                          <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5, color: '#0284c7' }}>
                            {filings.length}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#64748b' }}>
                            CA, NY, TX, FL, DE + ALL
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                      <Card elevation={0} sx={{ borderLeft: '4px solid #16a34a' }}>
                        <CardContent sx={{ py: 2 }}>
                          <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, letterSpacing: '0.05em' }}>
                            COMPLIANCE STATUS
                          </Typography>
                          <Typography variant="h5" sx={{ fontWeight: 800, mt: 1, color: '#16a34a' }}>
                            SERFF ACTIVE
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#64748b' }}>
                            Effective-dated versioning
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                      <Card elevation={0} sx={{ borderLeft: '4px solid #8b5cf6' }}>
                        <CardContent sx={{ py: 2 }}>
                          <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, letterSpacing: '0.05em' }}>
                            RATING MICROSERVICE
                          </Typography>
                          <Typography variant="h5" sx={{ fontWeight: 800, mt: 1, color: '#8b5cf6' }}>
                            PORT 8084
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#64748b' }}>
                            Tomcat #3 (HELIOS_RATING_DB)
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>

                  {/* Active Filings Table */}
                  <Card elevation={0} sx={{ mb: 4 }}>
                    <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                          SERFF State Regulatory Approval Matrix
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#64748b' }}>
                          Product rating versions resolved by State Department of Insurance rules &amp; effective dates
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                        <Button
                          variant="contained"
                          size="small"
                          color="primary"
                          startIcon={<Plus size={15} />}
                          onClick={handleOpenCreateFiling}
                          sx={{ fontWeight: 700, textTransform: 'none', fontSize: '0.75rem', bgcolor: '#0284c7' }}
                        >
                          New State Filing
                        </Button>
                        <Chip label="Multi-State SERFF Compliant" color="primary" size="small" sx={{ fontWeight: 600 }} />
                      </Box>
                    </Box>
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Product</TableCell>
                            <TableCell>State</TableCell>
                            <TableCell>SERFF Tracking #</TableCell>
                            <TableCell>Version</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Effective Date</TableCell>
                            <TableCell>Min Premium</TableCell>
                            <TableCell align="right">Max Sched Mod</TableCell>
                            <TableCell align="right">Actions</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {filings.map((f) => (
                            <TableRow key={f.versionId || f.serffTrackingNumber} hover>
                              <TableCell sx={{ fontWeight: 700 }}>
                                <Chip label={f.productCode} size="small" sx={{ fontSize: '0.72rem', height: 22 }} />
                              </TableCell>
                              <TableCell>
                                <Chip
                                  label={f.stateCode}
                                  size="small"
                                  color={f.stateCode === 'ALL' ? 'default' : 'primary'}
                                  variant={f.stateCode === 'ALL' ? 'outlined' : 'filled'}
                                  sx={{ fontWeight: 700, fontSize: '0.75rem' }}
                                />
                              </TableCell>
                              <TableCell>
                                <code>{f.serffTrackingNumber}</code>
                              </TableCell>
                              <TableCell sx={{ fontWeight: 600 }}>v{f.versionNumber}</TableCell>
                              <TableCell>
                                <StatusBadge ok={f.filingStatus === 'ACTIVE'} label={f.filingStatus} />
                              </TableCell>
                              <TableCell>{f.newBizEffectiveDate}</TableCell>
                              <TableCell sx={{ fontWeight: 600 }}>${Number(f.minPremium).toLocaleString()}</TableCell>
                              <TableCell align="right">
                                &plusmn;{Math.round((f.maxScheduleDebitPct || 0.25) * 100)}%
                              </TableCell>
                              <TableCell align="right">
                                <Button
                                  size="small"
                                  variant="outlined"
                                  startIcon={<Edit2 size={13} />}
                                  onClick={() => handleOpenEditFiling(f)}
                                  sx={{ fontSize: '0.72rem', textTransform: 'none', py: 0.2, px: 1, borderColor: '#cbd5e1', color: '#0284c7', fontWeight: 600 }}
                                >
                                  Edit Metrics
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Card>

                  {/* Interactive Live Rating Sandbox */}
                  <Card elevation={0} sx={{ borderTop: '4px solid #0284c7' }}>
                    <CardContent sx={{ p: 3 }}>
                      <Box sx={{ mb: 2.5 }}>
                        <Typography variant="h6" sx={{ fontWeight: 700 }}>
                          Live Rating &amp; Underwriting Rule Sandbox
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#64748b' }}>
                          Test algorithm execution, factor matrices, state schedule caps, and referral rules against the live rating engine
                        </Typography>
                      </Box>

                      <Box component="form" onSubmit={handleRunSandbox}>
                        <Grid container spacing={2}>
                          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                            <FormControl fullWidth size="small">
                              <InputLabel>Product</InputLabel>
                              <Select
                                label="Product"
                                value={sandboxForm.productCode}
                                onChange={(e) => setSandboxForm({ ...sandboxForm, productCode: e.target.value })}
                              >
                                <MenuItem value="TECH_EO">Technology E&amp;O</MenuItem>
                                <MenuItem value="MED_MAL">Medical Malpractice</MenuItem>
                                <MenuItem value="DNO">Directors &amp; Officers</MenuItem>
                              </Select>
                            </FormControl>
                          </Grid>
                          <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                            <FormControl fullWidth size="small">
                              <InputLabel>State</InputLabel>
                              <Select
                                label="State"
                                value={sandboxForm.stateCode}
                                onChange={(e) => setSandboxForm({ ...sandboxForm, stateCode: e.target.value })}
                              >
                                <MenuItem value="CA">CA (California)</MenuItem>
                                <MenuItem value="NY">NY (New York)</MenuItem>
                                <MenuItem value="TX">TX (Texas)</MenuItem>
                                <MenuItem value="FL">FL (Florida)</MenuItem>
                                <MenuItem value="DE">DE (Delaware)</MenuItem>
                                <MenuItem value="IL">IL (Nationwide Fallback)</MenuItem>
                              </Select>
                            </FormControl>
                          </Grid>
                          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                            <TextField
                              size="small"
                              fullWidth
                              label="Exposure (Revenue / Headcount)"
                              value={sandboxForm.exposureValue}
                              onChange={(e) => setSandboxForm({ ...sandboxForm, exposureValue: e.target.value })}
                            />
                          </Grid>
                          <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                            <FormControl fullWidth size="small">
                              <InputLabel>Limit</InputLabel>
                              <Select
                                label="Limit"
                                value={sandboxForm.occurrenceLimit}
                                onChange={(e) => setSandboxForm({ ...sandboxForm, occurrenceLimit: e.target.value, aggregateLimit: e.target.value })}
                              >
                                <MenuItem value="1000000">$1,000,000</MenuItem>
                                <MenuItem value="2000000">$2,000,000</MenuItem>
                                <MenuItem value="5000000">$5,000,000</MenuItem>
                                <MenuItem value="10000000">$10,000,000 (Referral)</MenuItem>
                              </Select>
                            </FormControl>
                          </Grid>
                          <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                            <Button
                              type="submit"
                              variant="contained"
                              fullWidth
                              sx={{ height: 40 }}
                              disabled={ratingLoading}
                              startIcon={ratingLoading ? <CircularProgress size={16} color="inherit" /> : <Calculator size={16} />}
                            >
                              Run Rating
                            </Button>
                          </Grid>
                        </Grid>
                      </Box>

                      {sandboxResult && (
                        <Box sx={{ mt: 3, pt: 3, borderTop: '1px solid #e2e8f0' }}>
                          <Grid container spacing={3}>
                            <Grid size={{ xs: 12, md: 4 }}>
                              <Paper variant="outlined" sx={{ p: 2.5, backgroundColor: '#f8fafc', height: '100%' }}>
                                <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700 }}>
                                  CALCULATED ANNUAL PREMIUM
                                </Typography>
                                <Typography variant="h3" sx={{ fontWeight: 800, color: '#0f172a', mt: 0.5, mb: 1 }}>
                                  ${Number(sandboxResult.finalAnnualPremium).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                  <StatusBadge
                                    ok={sandboxResult.ratingStatus === 'RATED'}
                                    label={sandboxResult.ratingStatus}
                                  />
                                  <Chip
                                    label={`SERFF: ${sandboxResult.serffTrackingNumber || 'Approved'}`}
                                    size="small"
                                    sx={{ fontSize: '0.7rem' }}
                                  />
                                </Box>
                                <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mt: 1 }}>
                                  State Minimum: ${Number(sandboxResult.minimumPremium || 2500).toLocaleString()} | Base Loss Cost: ${sandboxResult.baseRate}
                                </Typography>
                              </Paper>
                            </Grid>
                            <Grid size={{ xs: 12, md: 8 }}>
                              <Paper variant="outlined" sx={{ p: 2.5, height: '100%' }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                                  Calculation Step-by-Step Audit Trace:
                                </Typography>
                                <Box sx={{ backgroundColor: '#0f172a', color: '#38bdf8', p: 1.5, borderRadius: '6px', fontSize: '0.78rem', fontFamily: 'monospace', mb: 2 }}>
                                  {(sandboxResult.calculationTrace || []).map((t, i) => (
                                    <div key={i}>{t}</div>
                                  ))}
                                </Box>

                                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
                                  Mandatory Policy Form Endorsements:
                                </Typography>
                                <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                                  {(sandboxResult.attachedForms || []).map((form) => (
                                    <Chip key={form} label={form} size="small" variant="outlined" sx={{ fontSize: '0.72rem' }} />
                                  ))}
                                </Box>
                              </Paper>
                            </Grid>
                          </Grid>
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                </Box>
              )}

              {/* TAB 5: BRMS RULEFLOW STUDIO & VISUALIZER */}
              {activeTab === 'ruleflow' && (
                <RuleFlowStudio apiFetch={apiFetch} selectedTenantId={selectedTenantId} />
              )}

            </Box>
          </Box>
        </Box>
      </Box>

      {/* Tenant Customization Dialog */}
      <Dialog open={openTenantDialog} onClose={() => setOpenTenantDialog(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleSaveTenant}>
          <DialogTitle>Customize Tenant UI &amp; Database Routing</DialogTitle>
          <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  label="Tenant ID"
                  type="number"
                  size="small"
                  fullWidth
                  required
                  value={tenantForm.tenantId}
                  onChange={(e) => setTenantForm({ ...tenantForm, tenantId: e.target.value })}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 8 }}>
                <TextField
                  label="Tenant Name"
                  size="small"
                  fullWidth
                  required
                  value={tenantForm.tenantName}
                  onChange={(e) => setTenantForm({ ...tenantForm, tenantName: e.target.value })}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="SQL Server Host"
                  size="small"
                  fullWidth
                  required
                  value={tenantForm.dbServerName}
                  onChange={(e) => setTenantForm({ ...tenantForm, dbServerName: e.target.value })}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Database Catalog"
                  size="small"
                  fullWidth
                  required
                  value={tenantForm.dbCatalogName}
                  onChange={(e) => setTenantForm({ ...tenantForm, dbCatalogName: e.target.value })}
                />
              </Grid>
            </Grid>

            <Divider />
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              Theme Presets
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {THEME_PRESETS.map((p) => (
                <Chip
                  key={p.label}
                  label={p.label}
                  onClick={() => setTenantForm({ ...tenantForm, primaryColor: p.primary, accentColor: p.accent })}
                  sx={{
                    backgroundColor: p.primary,
                    color: '#ffffff',
                    fontWeight: 600,
                    fontSize: '0.72rem',
                    border: tenantForm.primaryColor === p.primary ? `2px solid ${p.accent}` : 'none'
                  }}
                />
              ))}
            </Box>

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Sidebar Primary Color (Hex)"
                  size="small"
                  fullWidth
                  value={tenantForm.primaryColor}
                  onChange={(e) => setTenantForm({ ...tenantForm, primaryColor: e.target.value })}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Logo Accent Color (Hex)"
                  size="small"
                  fullWidth
                  value={tenantForm.accentColor}
                  onChange={(e) => setTenantForm({ ...tenantForm, accentColor: e.target.value })}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Brand Title"
                  size="small"
                  fullWidth
                  value={tenantForm.brandTitle}
                  onChange={(e) => setTenantForm({ ...tenantForm, brandTitle: e.target.value })}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Brand Subtitle"
                  size="small"
                  fullWidth
                  value={tenantForm.brandSubtitle}
                  onChange={(e) => setTenantForm({ ...tenantForm, brandSubtitle: e.target.value })}
                />
              </Grid>
            </Grid>

            <Box>
              <Typography variant="caption" sx={{ fontWeight: 600, color: '#64748b', display: 'block', mb: 1 }}>
                Enabled Tenant Modules:
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {MODULE_OPTIONS.map((mod) => {
                  const enabled = (tenantForm.enabledModules || '').split(',').includes(mod.id);
                  return (
                    <Chip
                      key={mod.id}
                      label={mod.label}
                      color={enabled ? 'primary' : 'default'}
                      variant={enabled ? 'filled' : 'outlined'}
                      onClick={() => toggleTenantModule(mod.id)}
                    />
                  );
                })}
              </Box>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenTenantDialog(false)}>Cancel</Button>
            <Button type="submit" variant="contained">
              Save Tenant Config
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Role & RBAC Customization Dialog */}
      <Dialog open={openRoleDialog} onClose={() => setOpenRoleDialog(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleSaveRole}>
          <DialogTitle>
            {roleForm.roleId > 0 ? `Edit Role: ${roleForm.roleName}` : `Create New Role for Tenant #${selectedTenantId}`}
          </DialogTitle>
          <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 5 }}>
                <TextField
                  label="Role Code (e.g. UNDERWRITER)"
                  size="small"
                  fullWidth
                  required
                  value={roleForm.roleCode}
                  onChange={(e) => setRoleForm({ ...roleForm, roleCode: e.target.value })}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 7 }}>
                <TextField
                  label="Role Display Name"
                  size="small"
                  fullWidth
                  required
                  value={roleForm.roleName}
                  onChange={(e) => setRoleForm({ ...roleForm, roleName: e.target.value })}
                />
              </Grid>
            </Grid>

            <FormControl fullWidth size="small">
              <InputLabel>Default Dashboard Task Filter</InputLabel>
              <Select
                label="Default Dashboard Task Filter"
                value={roleForm.defaultTaskFilter}
                onChange={(e) => setRoleForm({ ...roleForm, defaultTaskFilter: e.target.value })}
              >
                <MenuItem value="">All Tasks</MenuItem>
                <MenuItem value="Underwriting">Underwriting Tasks Only</MenuItem>
                <MenuItem value="Claims">Claims Tasks Only</MenuItem>
                <MenuItem value="Renewals">Renewal Tasks Only</MenuItem>
              </Select>
            </FormControl>

            <Box>
              <Typography variant="caption" sx={{ fontWeight: 600, color: '#64748b', display: 'block', mb: 1 }}>
                Allowed Sidebar Navigation Tabs for Role:
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {MODULE_OPTIONS.map((mod) => {
                  const enabled = (roleForm.allowedModules || '').split(',').includes(mod.id);
                  return (
                    <Chip
                      key={mod.id}
                      label={mod.label}
                      color={enabled ? 'primary' : 'default'}
                      variant={enabled ? 'filled' : 'outlined'}
                      onClick={() => toggleRoleModule(mod.id)}
                    />
                  );
                })}
              </Box>
            </Box>

            <Divider />
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              Granular Action Permissions
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={roleForm.canCreateSubmission}
                    onChange={(e) => setRoleForm({ ...roleForm, canCreateSubmission: e.target.checked })}
                  />
                }
                label="Can Create New Submissions (UW_SUBMSN)"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={roleForm.canAddOrganization}
                    onChange={(e) => setRoleForm({ ...roleForm, canAddOrganization: e.target.checked })}
                  />
                }
                label="Can Add New Insured Organizations (PT_PARTY)"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={roleForm.canReportClaim}
                    onChange={(e) => setRoleForm({ ...roleForm, canReportClaim: e.target.checked })}
                  />
                }
                label="Can Report New Claims (CLM_CLAIM)"
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenRoleDialog(false)}>Cancel</Button>
            <Button type="submit" variant="contained">
              Save Role Permissions
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* User Management Dialog */}
      <Dialog open={openUserDialog} onClose={() => setOpenUserDialog(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleSaveUser}>
          <DialogTitle sx={{ fontWeight: 700 }}>
            {userForm.userId > 0 ? `Edit User Account: ${userForm.displayName}` : 'Create New Tenant User Account'}
          </DialogTitle>
          <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <Alert severity="info" sx={{ fontSize: '0.8rem', py: 0.5 }}>
              User accounts are saved directly into the tenant&apos;s database (<code>dbo.APP_USER</code>). Passwords can remain blank during evaluation. External identity keys allow direct single sign-on when Windows AD or Azure Entra ID is activated.
            </Alert>

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth size="small" required>
                  <InputLabel>Tenant Association</InputLabel>
                  <Select
                    label="Tenant Association"
                    value={userForm.tenantId}
                    onChange={(e) => setUserForm({ ...userForm, tenantId: Number(e.target.value) })}
                  >
                    {tenants.map((t) => (
                      <MenuItem key={t.tenantId} value={t.tenantId}>
                        Tenant #{t.tenantId} — {t.tenantName} ({t.dbCatalogName})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth size="small" required>
                  <InputLabel>Assigned Role</InputLabel>
                  <Select
                    label="Assigned Role"
                    value={userForm.roleCode}
                    onChange={(e) => setUserForm({ ...userForm, roleCode: e.target.value })}
                  >
                    {roles.length > 0 ? (
                      roles.map((r) => (
                        <MenuItem key={r.roleCode} value={r.roleCode}>
                          {r.roleName} ({r.roleCode})
                        </MenuItem>
                      ))
                    ) : (
                      <>
                        <MenuItem value="UNDERWRITER">Underwriter</MenuItem>
                        <MenuItem value="EXECUTIVE">Executive / Manager</MenuItem>
                        <MenuItem value="CLAIMS_ADJUSTER">Claims Adjuster</MenuItem>
                        <MenuItem value="AUDITOR">Compliance Auditor</MenuItem>
                        <MenuItem value="ADMIN">System Administrator</MenuItem>
                      </>
                    )}
                  </Select>
                </FormControl>
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Username (Login ID)"
                  size="small"
                  fullWidth
                  required
                  value={userForm.username}
                  onChange={(e) => setUserForm({ ...userForm, username: e.target.value.toLowerCase().trim() })}
                  helperText="Lowercase login identifier, e.g. mchang"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Full Display Name"
                  size="small"
                  fullWidth
                  required
                  value={userForm.displayName}
                  onChange={(e) => setUserForm({ ...userForm, displayName: e.target.value })}
                  helperText="e.g. Maya Chang"
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Email Address"
                  type="email"
                  size="small"
                  fullWidth
                  value={userForm.email}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Department / Unit"
                  size="small"
                  fullWidth
                  value={userForm.department}
                  onChange={(e) => setUserForm({ ...userForm, department: e.target.value })}
                  helperText="e.g. Commercial Lines, Claims"
                />
              </Grid>
            </Grid>

            <Divider />

            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0f172a' }}>
              Authentication &amp; Identity Federation
            </Typography>

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Auth Provider</InputLabel>
                  <Select
                    label="Auth Provider"
                    value={userForm.authProvider}
                    onChange={(e) => setUserForm({ ...userForm, authProvider: e.target.value })}
                  >
                    <MenuItem value="LOCAL">Local Database (Blank / Password)</MenuItem>
                    <MenuItem value="WINDOWS_AD">Windows Active Directory (Kerberos)</MenuItem>
                    <MenuItem value="AZURE_ENTRA_ID">Microsoft Azure Entra ID (OIDC)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="External Identity / UPN / Object ID"
                  size="small"
                  fullWidth
                  value={userForm.externalSubjectId}
                  onChange={(e) => setUserForm({ ...userForm, externalSubjectId: e.target.value })}
                  helperText="e.g. mchang@ad.ortaleza.com or Entra OID"
                />
              </Grid>
            </Grid>

            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pt: 1 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={userForm.active}
                    onChange={(e) => setUserForm({ ...userForm, active: e.target.checked })}
                    color="success"
                  />
                }
                label={
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    Account Active (User can log in)
                  </Typography>
                }
              />
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setOpenUserDialog(false)} color="inherit">
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={isSavingUser || !userForm.username || !userForm.displayName}
            >
              {isSavingUser ? 'Saving...' : userForm.userId > 0 ? 'Update User' : 'Create User'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
      {/* DIALOG: EDIT STATE REGULATORY FILING & APPROVAL METRICS (Saved in HELIOS_RATING_DB) */}
      <Dialog
        open={editFilingModalOpen}
        onClose={() => setEditFilingModalOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <form onSubmit={handleSaveFiling}>
          <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Calculator size={20} color="#0284c7" />
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                {selectedFiling?.versionId ? `Edit State Filing Metrics (#${selectedFiling.versionId})` : 'Create New State Regulatory Filing'}
              </Typography>
            </Box>
            <Chip
              label="Saved to HELIOS_RATING_DB.dbo.RATE_PLAN_VERSION"
              size="small"
              sx={{ bgcolor: '#e0f2fe', color: '#0369a1', fontFamily: 'monospace', fontSize: '0.72rem', fontWeight: 600 }}
            />
          </DialogTitle>
          <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 2 }}>
            <Alert severity="info" sx={{ fontSize: '0.8rem' }}>
              Statutory schedule caps, minimum premiums, and SERFF effective dates directly govern the real-time actuarial rating microservice (Port 8084).
            </Alert>

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 4 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Product Line</InputLabel>
                  <Select
                    label="Product Line"
                    value={filingForm.productCode}
                    onChange={(e) => setFilingForm({ ...filingForm, productCode: e.target.value })}
                  >
                    <MenuItem value="TECH_EO">Technology Errors &amp; Omissions (TECH_EO)</MenuItem>
                    <MenuItem value="MED_MAL">Medical Malpractice (MED_MAL)</MenuItem>
                    <MenuItem value="DNO">Directors &amp; Officers (DNO)</MenuItem>
                    <MenuItem value="COMMERCIAL_AUTO">Commercial Auto (COMMERCIAL_AUTO)</MenuItem>
                    <MenuItem value="GENERAL_LIABILITY">Commercial GL (GENERAL_LIABILITY)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  label="Rating Plan Code"
                  size="small"
                  fullWidth
                  value={filingForm.planCode}
                  onChange={(e) => setFilingForm({ ...filingForm, planCode: e.target.value })}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  label="State Code (or ALL)"
                  size="small"
                  fullWidth
                  value={filingForm.stateCode}
                  onChange={(e) => setFilingForm({ ...filingForm, stateCode: e.target.value.toUpperCase() })}
                  helperText="e.g. CA, NY, TX, FL, or ALL"
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  label="Version Number"
                  size="small"
                  fullWidth
                  value={filingForm.versionNumber}
                  onChange={(e) => setFilingForm({ ...filingForm, versionNumber: e.target.value })}
                  helperText="e.g. 2025.1 or 2026.1"
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  label="SERFF Tracking Number"
                  size="small"
                  fullWidth
                  value={filingForm.serffTrackingNumber}
                  onChange={(e) => setFilingForm({ ...filingForm, serffTrackingNumber: e.target.value })}
                  helperText="e.g. CA-2025-0812-EO"
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 4 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Filing Status</InputLabel>
                  <Select
                    label="Filing Status"
                    value={filingForm.filingStatus}
                    onChange={(e) => setFilingForm({ ...filingForm, filingStatus: e.target.value })}
                  >
                    <MenuItem value="ACTIVE">ACTIVE (DOI Approved / File &amp; Use)</MenuItem>
                    <MenuItem value="PENDING_APPROVAL">PENDING_APPROVAL (Under DOI Review)</MenuItem>
                    <MenuItem value="SUPERSEDED">SUPERSEDED (Historical Prior Version)</MenuItem>
                    <MenuItem value="WITHDRAWN">WITHDRAWN / REJECTED</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="New Business Effective Date"
                  type="date"
                  size="small"
                  fullWidth
                  value={filingForm.newBizEffectiveDate || ''}
                  onChange={(e) => setFilingForm({ ...filingForm, newBizEffectiveDate: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Renewal Effective Date"
                  type="date"
                  size="small"
                  fullWidth
                  value={filingForm.renewalEffectiveDate || ''}
                  onChange={(e) => setFilingForm({ ...filingForm, renewalEffectiveDate: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  label="Statutory Min Premium ($)"
                  type="number"
                  size="small"
                  fullWidth
                  value={filingForm.minPremium}
                  onChange={(e) => setFilingForm({ ...filingForm, minPremium: e.target.value })}
                  helperText="Floor policy premium"
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  label="Max Schedule Debit %"
                  type="number"
                  inputProps={{ step: '0.01', min: '0', max: '1.0' }}
                  size="small"
                  fullWidth
                  value={filingForm.maxScheduleDebitPct}
                  onChange={(e) => setFilingForm({ ...filingForm, maxScheduleDebitPct: e.target.value })}
                  helperText="e.g. 0.25 for +25% max surcharge"
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  label="Max Schedule Credit %"
                  type="number"
                  inputProps={{ step: '0.01', min: '0', max: '1.0' }}
                  size="small"
                  fullWidth
                  value={filingForm.maxScheduleCreditPct}
                  onChange={(e) => setFilingForm({ ...filingForm, maxScheduleCreditPct: e.target.value })}
                  helperText="e.g. 0.25 for -25% max discount"
                />
              </Grid>

              <Grid size={{ xs: 12 }}>
                <TextField
                  label="Regulatory Description &amp; Actuarial Justification"
                  multiline
                  rows={2}
                  size="small"
                  fullWidth
                  value={filingForm.description}
                  onChange={(e) => setFilingForm({ ...filingForm, description: e.target.value })}
                  placeholder="Notes on state DOI approval, commissioner orders, or underwriting guidelines..."
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setEditFilingModalOpen(false)} color="inherit">
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={isSavingFiling}
              startIcon={<Save size={16} />}
              sx={{ bgcolor: '#0284c7', '&:hover': { bgcolor: '#0369a1' }, fontWeight: 700 }}
            >
              {isSavingFiling ? 'Saving to Database...' : 'Save Filing to Rating Database'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </ThemeProvider>
  );
}

