import React, { useState, useEffect, useCallback } from 'react';
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
  Plus,
  RefreshCw,
  Menu as MenuIcon,
  ChevronRight,
  ExternalLink
} from 'lucide-react';

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

export default function App() {
  const [activeTab, setActiveTab] = useState('tenants');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [tenants, setTenants] = useState([]);
  const [selectedTenantId, setSelectedTenantId] = useState(1);
  const [roles, setRoles] = useState([]);
  const [diag, setDiag] = useState(null);
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

  const loadDiagnostics = useCallback(async () => {
    try {
      const data = await apiFetch('/api/diagnostics');
      setDiag(data);
    } catch (err) {
      setFlash({ type: 'error', text: `Failed to load diagnostics: ${err.message}` });
    }
  }, [apiFetch]);

  useEffect(() => {
    loadTenants();
    loadRoles();
    loadDiagnostics();
  }, [loadTenants, loadRoles, loadDiagnostics]);

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
    { id: 'diagnostics', label: 'SQL & System Diagnostics', icon: <Activity size={18} /> }
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
                        Role &amp; Permission Customization — {activeTenantObj?.tenantName || `Tenant #${selectedTenantId}`}
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

              {/* TAB 3: SQL & SYSTEM DIAGNOSTICS */}
              {activeTab === 'diagnostics' && (
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Box>
                      <Typography variant="h4" sx={{ fontSize: '1.65rem', mb: 0.4 }}>
                        SQL Server &amp; Multi-Tenant Diagnostics
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#64748b' }}>
                        Live connectivity telemetry for MSTR_DATA and Tenant #{selectedTenantId} ({activeTenantObj?.dbCatalogName})
                      </Typography>
                    </Box>
                    <Button variant="contained" startIcon={<RefreshCw size={16} />} onClick={loadDiagnostics}>
                      Refresh Telemetry
                    </Button>
                  </Box>

                  {!diag ? (
                    <Card elevation={0}>
                      <CardContent sx={{ py: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
                        <CircularProgress size={22} />
                        <Typography>Pinging SQL Server catalogs...</Typography>
                      </CardContent>
                    </Card>
                  ) : (
                    <Grid container spacing={3}>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <Card elevation={0} sx={{ borderTop: '4px solid #0f172a' }}>
                          <CardContent>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                              <Typography variant="h6">Master Registry DB (MSTR_DATA)</Typography>
                              <StatusBadge ok={diag.masterDatabase?.connected} label={diag.masterDatabase?.connected ? 'Connected' : 'Error'} />
                            </Box>
                            <Divider sx={{ mb: 2 }} />
                            <Typography variant="body2" sx={{ mb: 0.5 }}>
                              <strong>Database:</strong> <code>{diag.masterDatabase?.databaseName}</code>
                            </Typography>
                            <Typography variant="body2" sx={{ mb: 0.5 }}>
                              <strong>SQL Server:</strong> <code>{diag.masterDatabase?.serverName}</code>
                            </Typography>
                            <Typography variant="body2" sx={{ mb: 1.5 }}>
                              <strong>Authenticated User:</strong> <code>{diag.masterDatabase?.authenticatedUser}</code>
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <Card elevation={0} sx={{ borderTop: '4px solid #0284c7' }}>
                          <CardContent>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                              <Typography variant="h6">
                                Tenant #{diag.activeTenantId} DB ({diag.activeTenantConfig?.dbCatalogName})
                              </Typography>
                              <StatusBadge ok={diag.tenantDatabase?.connected} label={diag.tenantDatabase?.connected ? 'Connected' : 'Error'} />
                            </Box>
                            <Divider sx={{ mb: 2 }} />
                            <Typography variant="body2" sx={{ mb: 0.5 }}>
                              <strong>Database:</strong> <code>{diag.tenantDatabase?.databaseName}</code>
                            </Typography>
                            <Typography variant="body2" sx={{ mb: 0.5 }}>
                              <strong>SQL Server:</strong> <code>{diag.tenantDatabase?.serverName}</code>
                            </Typography>
                            <Typography variant="body2" sx={{ mb: 1.5 }}>
                              <strong>Authenticated User:</strong> <code>{diag.tenantDatabase?.authenticatedUser}</code>
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                    </Grid>
                  )}
                </Box>
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
    </ThemeProvider>
  );
}

