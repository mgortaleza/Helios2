import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
  Tabs,
  Tab,
  Chip,
  Card,
  CardContent,
  Divider,
  Avatar,
  IconButton,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  InputAdornment,
  Menu as MuiMenu
} from '@mui/material';
import {
  LayoutGrid,
  FileText,
  Files,
  AlertCircle,
  Bell,
  ChevronRight,
  ChevronsUpDown,
  Briefcase,
  TrendingUp,
  Clock,
  Menu as MenuIcon,
  Activity,
  RefreshCw,
  Plus,
  Calculator,
  User,
  Lock,
  LogOut,
  ShieldCheck,
  CheckCircle2,
  Key,
  Users,
  LogIn,
  Laptop,
  Printer,
  Download,
  Eye,
  ExternalLink,
  FileSpreadsheet,
  FileCheck,
  GitFork,
  Workflow,
  Zap,
  Inbox,
  Paperclip,
  Building,
  UserPlus,
  Folder,
  FolderCheck,
  Search,
  Trash2,
  Upload,
  History,
  MapPin,
  Building2,
  UserCheck
} from 'lucide-react';

// --- Dynamic Per-Tenant Theme Builder ---
function buildTenantTheme(primaryColor = '#013a12', accentColor = '#f59e0b') {
  return createTheme({
    palette: {
      primary: {
        main: primaryColor || '#013a12'
      },
      secondary: {
        main: accentColor || '#f59e0b'
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
}

// Geometric emblem that adapts to the active tenant's primary & accent colors
const HeliosBrandIcon = ({ primaryColor = '#013a12', accentColor = '#f59e0b' }) => (
  <svg width="24" height="24" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="3" width="11" height="11" rx="2.5" fill={accentColor} />
    <rect x="18" y="3" width="11" height="11" rx="2.5" fill={accentColor} opacity="0.82" />
    <rect x="3" y="18" width="11" height="11" rx="2.5" fill={accentColor} opacity="0.82" />
    <rect x="18" y="18" width="11" height="11" rx="2.5" fill={accentColor} />
    <rect x="10.5" y="10.5" width="11" height="11" rx="2" fill={primaryColor} />
    <rect x="13" y="13" width="6" height="6" rx="1" fill="#ffffff" opacity="0.85" />
  </svg>
);

function getTenantInitials(tenant) {
  if (!tenant) return 'AC';
  if (tenant.tenantId === 1 && tenant.tenantName?.includes('Default')) return 'AC';
  if (tenant.tenantId === 2 && tenant.tenantName?.includes('Legacy')) return 'GR';
  const words = (tenant.tenantName || 'AC').split(/\s+/);
  return words.slice(0, 2).map((w) => w[0]?.toUpperCase() || '').join('') || 'AC';
}

function getTenantShortLabel(tenant) {
  if (!tenant) return 'Acme Corp';
  if (tenant.tenantId === 1 && tenant.tenantName?.includes('Default')) {
    return 'Acme Corp';
  }
  if (tenant.tenantId === 2 && tenant.tenantName?.includes('Legacy')) {
    return 'Global Risk Partners';
  }
  return tenant.tenantName;
}

function StatusPill({ status }) {
  let bg = '#dbeafe';
  let fg = '#1d4ed8';
  if (status === 'Urgent' || status === 'Declined') {
    bg = '#fee2e2';
    fg = '#dc2626';
  } else if (status === 'Completed' || status === 'Bound' || status === 'Active' || status === 'Accepted') {
    bg = '#dcfce7';
    fg = '#15803d';
  } else if (status === 'In Progress' || status === 'Under Review' || status === 'Quoted') {
    bg = '#fef3c7';
    fg = '#b45309';
  } else if (status === 'Expired') {
    bg = '#f1f5f9';
    fg = '#475569';
  }

  return (
    <Box
      component="span"
      sx={{
        display: 'inline-block',
        px: 1.4,
        py: 0.35,
        borderRadius: '999px',
        fontSize: '0.75rem',
        fontWeight: 600,
        backgroundColor: bg,
        color: fg,
        lineHeight: 1.3
      }}
    >
      {status}
    </Box>
  );
}

// --- 1. Dashboard View (Matches Screenshot + Adapts Per Tenant & Role) ---
const DashboardView = ({ apiFetch, activeTenantId, currentTenant, activeRole, onNavigate }) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState(activeRole?.defaultTaskFilter || '');
  const [subTypeFilter, setSubTypeFilter] = useState('');
  const primaryColor = currentTenant?.primaryColor || '#013a12';

  useEffect(() => {
    setTypeFilter(activeRole?.defaultTaskFilter || '');
    setSubTypeFilter('');
  }, [activeRole?.roleCode, activeRole?.defaultTaskFilter]);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/api/tasks');
      setTasks(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load tasks:', err);
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks, activeTenantId]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchType = typeFilter === '' || task.type === typeFilter;
      const matchSubType = subTypeFilter === '' || task.subType === subTypeFilter;
      return matchType && matchSubType;
    });
  }, [tasks, typeFilter, subTypeFilter]);

  const availableSubTypes = useMemo(() => {
    if (!typeFilter) return Array.from(new Set(tasks.map((t) => t.subType)));
    return Array.from(new Set(tasks.filter((t) => t.type === typeFilter).map((t) => t.subType)));
  }, [tasks, typeFilter]);

  const isTenantTwo = Number(activeTenantId) === 2;
  const kpiCards = [
    {
      label: 'Total Active Policies',
      value: isTenantTwo ? '842' : '1245',
      icon: <FileText size={20} color={primaryColor} />,
      iconBg: isTenantTwo ? '#eff6ff' : '#ecfdf5',
      targetView: 'policy'
    },
    {
      label: 'Pending Submissions',
      value: isTenantTwo ? '54' : '87',
      icon: <Files size={20} color="#d97706" />,
      iconBg: '#fffbeb',
      targetView: 'submissions'
    },
    {
      label: 'Open Claims',
      value: isTenantTwo ? '19' : '32',
      icon: <AlertCircle size={20} color="#ef4444" />,
      iconBg: '#fef2f2',
      targetView: 'claims'
    },
    {
      label: 'YTD Written Premium',
      value: isTenantTwo ? '$9.8M' : '$14.2M',
      trend: isTenantTwo ? '+8.1%' : '+5.4%',
      icon: <TrendingUp size={20} color={primaryColor} />,
      iconBg: isTenantTwo ? '#eff6ff' : '#ecfdf5',
      targetView: 'policy'
    }
  ];

  const typeTabs = [
    { label: 'All', value: '' },
    { label: 'Underwriting', value: 'Underwriting' },
    { label: 'Claims', value: 'Claims' },
    { label: 'Renewals', value: 'Renewals' }
  ];

  return (
    <Box>
      {/* Page Title & Subtitle */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontSize: '1.65rem', mb: 0.4 }}>
          Dashboard
        </Typography>
        <Typography variant="body2" sx={{ color: '#64748b' }}>
          Manage your professional liability portfolio
        </Typography>
      </Box>

      {/* 4 KPI Stat Cards */}
      <Grid container spacing={2.5} sx={{ mb: 3.5 }}>
        {kpiCards.map((kpi) => (
          <Grid key={kpi.label} size={{ xs: 12, sm: 6, md: 3 }}>
            <Card
              elevation={0}
              onClick={() => onNavigate(kpi.targetView)}
              sx={{
                cursor: 'pointer',
                transition: 'box-shadow 0.15s ease, transform 0.15s ease',
                '&:hover': {
                  boxShadow: '0 4px 12px rgba(15, 23, 42, 0.06)',
                  transform: 'translateY(-1px)'
                }
              }}
            >
              <CardContent sx={{ p: '22px !important', display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box
                  sx={{
                    width: 46,
                    height: 46,
                    borderRadius: '50%',
                    backgroundColor: kpi.iconBg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  {kpi.icon}
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 500, display: 'block', mb: 0.2 }}>
                    {kpi.label}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                    <Typography sx={{ fontSize: '1.55rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.2 }}>
                      {kpi.value}
                    </Typography>
                    {kpi.trend && (
                      <Typography sx={{ fontSize: '0.78rem', fontWeight: 600, color: '#10b981' }}>
                        {kpi.trend}
                      </Typography>
                    )}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* My Tasks Card */}
      <Card elevation={0}>
        {/* Card Header Bar */}
        <Box
          sx={{
            px: 3,
            py: 2,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 2,
            borderBottom: '1px solid #f1f5f9'
          }}
        >
          <Typography sx={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
            My Tasks
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            {/* Segmented Pill Tabs */}
            <Box
              sx={{
                display: 'inline-flex',
                backgroundColor: '#f1f5f9',
                p: 0.5,
                borderRadius: '8px',
                gap: 0.5
              }}
            >
              {typeTabs.map((tab) => {
                const active = typeFilter === tab.value;
                return (
                  <Box
                    key={tab.label}
                    component="button"
                    type="button"
                    onClick={() => {
                      setTypeFilter(tab.value);
                      setSubTypeFilter('');
                    }}
                    sx={{
                      border: 'none',
                      cursor: 'pointer',
                      px: 1.75,
                      py: 0.65,
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                      fontWeight: active ? 600 : 500,
                      backgroundColor: active ? '#ffffff' : 'transparent',
                      color: active ? primaryColor : '#64748b',
                      boxShadow: active ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {tab.label}
                  </Box>
                );
              })}
            </Box>

            {/* Subtype Filter */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" sx={{ color: '#64748b', fontSize: '0.82rem' }}>
                Subtype:
              </Typography>
              <FormControl size="small" sx={{ minWidth: 160 }}>
                <Select
                  value={subTypeFilter}
                  displayEmpty
                  onChange={(e) => setSubTypeFilter(e.target.value)}
                  sx={{
                    fontSize: '0.82rem',
                    borderRadius: '6px',
                    backgroundColor: '#ffffff',
                    '& .MuiSelect-select': { py: 0.75, px: 1.5 }
                  }}
                >
                  <MenuItem value="" sx={{ fontSize: '0.82rem' }}>
                    All
                  </MenuItem>
                  {availableSubTypes.map((st) => (
                    <MenuItem key={st} value={st} sx={{ fontSize: '0.82rem' }}>
                      {st}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </Box>
        </Box>

        {/* Tasks Table */}
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f8fafc' }}>
                <TableCell sx={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748b', letterSpacing: '0.05em', py: 1.5, pl: 3 }}>
                  TASK DESCRIPTION
                </TableCell>
                <TableCell sx={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748b', letterSpacing: '0.05em', py: 1.5 }}>
                  TASK TYPE
                </TableCell>
                <TableCell sx={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748b', letterSpacing: '0.05em', py: 1.5 }}>
                  SUBTYPE
                </TableCell>
                <TableCell sx={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748b', letterSpacing: '0.05em', py: 1.5 }}>
                  RELATED RECORD
                </TableCell>
                <TableCell sx={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748b', letterSpacing: '0.05em', py: 1.5 }}>
                  DUE DATE
                </TableCell>
                <TableCell sx={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748b', letterSpacing: '0.05em', py: 1.5, pr: 3 }}>
                  STATUS
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <CircularProgress size={22} sx={{ mr: 1, verticalAlign: 'middle' }} />
                    Loading tasks...
                  </TableCell>
                </TableRow>
              ) : (
                filteredTasks.map((task) => (
                  <TableRow
                    key={task.id}
                    hover
                    sx={{
                      '& td': { borderBottom: '1px solid #f1f5f9', py: 1.8 }
                    }}
                  >
                    <TableCell sx={{ fontWeight: 600, color: '#1e293b', fontSize: '0.85rem', pl: 3 }}>
                      {task.title}
                    </TableCell>
                    <TableCell sx={{ color: '#64748b', fontSize: '0.84rem' }}>
                      {task.type}
                    </TableCell>
                    <TableCell>
                      <Box
                        component="span"
                        sx={{
                          display: 'inline-block',
                          px: 1.2,
                          py: 0.35,
                          borderRadius: '5px',
                          backgroundColor: '#f1f5f9',
                          color: '#475569',
                          fontSize: '0.75rem',
                          fontWeight: 500
                        }}
                      >
                        {task.subType}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography
                        component="span"
                        onClick={() => {
                          const rel = task.relatedRecord || '';
                          if (rel.startsWith('POL-')) onNavigate('policy');
                          else if (rel.startsWith('CLM-')) onNavigate('claims');
                          else onNavigate('submissions');
                        }}
                        sx={{
                          fontWeight: 700,
                          fontSize: '0.82rem',
                          color: primaryColor,
                          cursor: 'pointer',
                          '&:hover': { textDecoration: 'underline' }
                        }}
                      >
                        {task.relatedRecord || 'SUB-26-0412'}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ color: '#64748b', fontSize: '0.82rem' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                        <Clock size={14} color="#94a3b8" />
                        <span>{task.dueDate}</span>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ pr: 3 }}>
                      <StatusPill status={task.status} />
                    </TableCell>
                  </TableRow>
                ))
              )}
              {!loading && filteredTasks.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4, color: '#64748b' }}>
                    No tasks match the selected filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </Box>
  );
};

// --- 2. Policies View (Policy Search + Active File / Quote Level Info) ---
const PoliciesView = ({ apiFetch, activeTenantId }) => {
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPolicy, setSelectedPolicy] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [activeFileId, setActiveFileId] = useState(null);

  const [nameFilter, setNameFilter] = useState('');
  const [addressFilter, setAddressFilter] = useState('');
  const [productTypeFilter, setProductTypeFilter] = useState('');
  const [fileStatusFilter, setFileStatusFilter] = useState('');

  const loadPolicies = useCallback(
    async (filters = {}) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (filters.name) params.set('name', filters.name);
        if (filters.address) params.set('address', filters.address);
        if (filters.productType) params.set('productType', filters.productType);
        if (filters.fileStatus) params.set('fileStatus', filters.fileStatus);
        const qs = params.toString();
        const data = await apiFetch(qs ? `/api/policies?${qs}` : '/api/policies');
        setPolicies(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Failed to load policies:', err);
      } finally {
        setLoading(false);
      }
    },
    [apiFetch]
  );

  useEffect(() => {
    setSelectedPolicy(null);
    loadPolicies();
  }, [loadPolicies, activeTenantId]);

  const handleSearch = (e) => {
    if (e) e.preventDefault();
    loadPolicies({
      name: nameFilter,
      address: addressFilter,
      productType: productTypeFilter,
      fileStatus: fileStatusFilter
    });
  };

  const handlePolicySelect = (policy) => {
    setSelectedPolicy(policy);
    if (policy.submissions && policy.submissions.length > 0) {
      setActiveFileId(policy.submissions[0].id);
    } else {
      setActiveFileId(null);
    }
    setActiveTab(1);
  };

  if (selectedPolicy) {
    const activeFile =
      (selectedPolicy.submissions || []).find((sub) => sub.id === activeFileId) ||
      (selectedPolicy.submissions || [])[0];

    return (
      <Box>
        <Box sx={{ mb: 2 }}>
          <Button
            variant="text"
            onClick={() => {
              setSelectedPolicy(null);
              setActiveTab(0);
              setActiveFileId(null);
            }}
            startIcon={<ChevronRight size={16} style={{ transform: 'rotate(180deg)' }} />}
          >
            Back to Policy Search
          </Button>
        </Box>

        <Card elevation={0} sx={{ mb: 3, borderTop: '4px solid #013a12' }}>
          <CardContent>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 4 }}>
                <Typography variant="caption" color="textSecondary" textTransform="uppercase" fontWeight="bold">
                  Insured Address
                </Typography>
                <Typography variant="body1" sx={{ mt: 1, fontWeight: 600 }}>
                  {selectedPolicy.name}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {selectedPolicy.address}
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <Typography variant="caption" color="textSecondary" textTransform="uppercase" fontWeight="bold">
                  Industry Sector
                </Typography>
                <Typography variant="body1" sx={{ mt: 1, display: 'flex', alignItems: 'center' }}>
                  <Briefcase size={16} style={{ marginRight: 8, color: '#013a12' }} />
                  {selectedPolicy.industry}
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <Typography variant="caption" color="textSecondary" textTransform="uppercase" fontWeight="bold">
                  Agency Information
                </Typography>
                <Typography variant="body1" sx={{ mt: 1 }}>
                  {selectedPolicy.agencyInfo}
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
            <Tab label="File List" />
            <Tab label="Active File" />
            <Tab label="Documents & Forms" />
          </Tabs>
        </Box>

        {activeTab === 0 && (
          <Card elevation={0}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Submissions &amp; Files
              </Typography>
              <TableContainer component={Paper} elevation={0} variant="outlined">
                <Table>
                  <TableHead sx={{ backgroundColor: '#f8fafc' }}>
                    <TableRow>
                      <TableCell>File ID</TableCell>
                      <TableCell>Date</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="right">Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(selectedPolicy.submissions || []).map((sub) => (
                      <TableRow key={sub.id} hover>
                        <TableCell sx={{ fontWeight: 'bold' }}>{sub.id}</TableCell>
                        <TableCell>{sub.date}</TableCell>
                        <TableCell>
                          <StatusPill status={sub.status} />
                        </TableCell>
                        <TableCell align="right">
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={() => {
                              setActiveFileId(sub.id);
                              setActiveTab(1);
                            }}
                          >
                            View File
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        )}

        {activeTab === 1 && activeFile && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Card elevation={0}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">File Level Information: {activeFile.id}</Typography>
                  <StatusPill status={activeFile.status} />
                </Box>
                <Divider sx={{ mb: 2 }} />
                <Grid container spacing={3}>
                  <Grid size={{ xs: 6, sm: 3 }}>
                    <Typography variant="caption" color="textSecondary">
                      Underwriter
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {activeFile.fileLevelInfo?.underwriter}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 6, sm: 3 }}>
                    <Typography variant="caption" color="textSecondary">
                      Effective Date
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {activeFile.fileLevelInfo?.effectiveDate}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 6, sm: 3 }}>
                    <Typography variant="caption" color="textSecondary">
                      Expiration Date
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {activeFile.fileLevelInfo?.expirationDate}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 6, sm: 3 }}>
                    <Typography variant="caption" color="textSecondary">
                      Retroactive Date
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {activeFile.fileLevelInfo?.retroactiveDate}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 6, sm: 3 }}>
                    <Typography variant="caption" color="textSecondary">
                      Limit
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {activeFile.fileLevelInfo?.limit}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 6, sm: 3 }}>
                    <Typography variant="caption" color="textSecondary">
                      Retention
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {activeFile.fileLevelInfo?.retention}
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            <Card elevation={0}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Quote Level Information
                </Typography>
                <TableContainer component={Paper} elevation={0} variant="outlined">
                  <Table size="small">
                    <TableHead sx={{ backgroundColor: '#f8fafc' }}>
                      <TableRow>
                        <TableCell>Quote ID</TableCell>
                        <TableCell>Generated</TableCell>
                        <TableCell>Premium</TableCell>
                        <TableCell>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(activeFile.quotes || []).map((quote) => (
                        <TableRow key={quote.quoteId}>
                          <TableCell sx={{ fontWeight: 600 }}>{quote.quoteId}</TableCell>
                          <TableCell>{quote.generated}</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>{quote.premium}</TableCell>
                          <TableCell>
                            <StatusPill status={quote.status} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Box>
        )}

        {activeTab === 2 && (
          <DocumentsManager
            apiFetch={apiFetch}
            activeTenantId={activeTenantId}
            entityType="POLICY"
            entityId={selectedPolicy.policyId || parseInt(String(selectedPolicy.id || '101').replace(/\D/g, '') || '101', 10)}
            entityNbr={selectedPolicy.id || (activeFile ? String(activeFile.id) : `POL-${selectedPolicy.policyId || '2026'}`)}
            defaultInsuredName={selectedPolicy.name}
            defaultProductType={selectedPolicy.industry || 'Technology Errors & Omissions'}
            defaultEffectiveDate={activeFile?.fileLevelInfo?.effectiveDate || '2026-03-01'}
            defaultExpirationDate={activeFile?.fileLevelInfo?.expirationDate || '2027-03-01'}
            defaultLimit={activeFile?.fileLevelInfo?.limit || '$2,000,000'}
            defaultDeductible={activeFile?.fileLevelInfo?.retention || '$25,000'}
            quotes={activeFile?.quotes || []}
            title={`Policy Documents & Formal Schedules — ${selectedPolicy.name}`}
          />
        )}
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontSize: '1.65rem', mb: 0.4 }}>
          Policies
        </Typography>
        <Typography variant="body2" sx={{ color: '#64748b' }}>
          Search and inspect professional liability policies, submissions, and quotes
        </Typography>
      </Box>

      <Card elevation={0} sx={{ mb: 3 }}>
        <CardContent>
          <form onSubmit={handleSearch}>
            <Grid container spacing={2} alignItems="center">
              <Grid size={{ xs: 12, sm: 3 }}>
                <TextField
                  fullWidth
                  label="Insured Name"
                  size="small"
                  variant="outlined"
                  value={nameFilter}
                  onChange={(e) => setNameFilter(e.target.value)}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 3 }}>
                <TextField
                  fullWidth
                  label="Address"
                  size="small"
                  variant="outlined"
                  value={addressFilter}
                  onChange={(e) => setAddressFilter(e.target.value)}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 2 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Product Type</InputLabel>
                  <Select
                    label="Product Type"
                    value={productTypeFilter}
                    onChange={(e) => setProductTypeFilter(e.target.value)}
                  >
                    <MenuItem value="">
                      <em>All Products</em>
                    </MenuItem>
                    <MenuItem value="Technology E&O">Technology E&amp;O</MenuItem>
                    <MenuItem value="Medical Malpractice">Medical Malpractice</MenuItem>
                    <MenuItem value="Directors & Officers">Directors &amp; Officers</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 2 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>File Status</InputLabel>
                  <Select
                    label="File Status"
                    value={fileStatusFilter}
                    onChange={(e) => setFileStatusFilter(e.target.value)}
                  >
                    <MenuItem value="">
                      <em>All Statuses</em>
                    </MenuItem>
                    <MenuItem value="Active">Active</MenuItem>
                    <MenuItem value="Under Review">Under Review</MenuItem>
                    <MenuItem value="Expired">Expired</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 2 }}>
                <Button type="submit" fullWidth variant="contained" color="primary" disableElevation>
                  Search
                </Button>
              </Grid>
            </Grid>
          </form>
        </CardContent>
      </Card>

      <Card elevation={0}>
        <TableContainer>
          <Table>
            <TableHead sx={{ backgroundColor: '#f8fafc' }}>
              <TableRow>
                <TableCell sx={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b' }}>POLICY NUMBER</TableCell>
                <TableCell sx={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b' }}>INSURED NAME</TableCell>
                <TableCell sx={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b' }}>PRODUCT TYPE</TableCell>
                <TableCell sx={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b' }}>FILE STATUS</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                    <CircularProgress size={22} sx={{ mr: 1, verticalAlign: 'middle' }} />
                    Loading policies...
                  </TableCell>
                </TableRow>
              ) : (
                policies.map((row) => (
                  <TableRow
                    key={row.id}
                    hover
                    onClick={() => handlePolicySelect(row)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <TableCell sx={{ fontWeight: 700, color: 'primary.main' }}>{row.id}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{row.name}</TableCell>
                    <TableCell>{row.productType}</TableCell>
                    <TableCell>
                      <StatusPill status={row.fileStatus} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </Box>
  );
};

// --- US States List ---
const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

// --- 3. Submissions View ---
const SubmissionsView = ({ apiFetch, activeTenantId, activeRole }) => {
  const [subTab, setSubTab] = useState(0);
  const [subDetailTab, setSubDetailTab] = useState(0);
  const [submissions, setSubmissions] = useState([]);
  const [parties, setParties] = useState([]);
  const [selectedPartyId, setSelectedPartyId] = useState(null);
  const [partySearch, setPartySearch] = useState('');
  const [partyTypeFilter, setPartyTypeFilter] = useState('ALL');
  const [openAddOrg, setOpenAddOrg] = useState(false);
  const [openAddressHistory, setOpenAddressHistory] = useState(false);
  const [partyForAddress, setPartyForAddress] = useState(null);
  const [addressHistoryList, setAddressHistoryList] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showNewAddressInput, setShowNewAddressInput] = useState(false);
  const [newAddressData, setNewAddressData] = useState({
    line1: '',
    line2: '',
    city: '',
    stateCode: 'IL',
    postalCode: '',
    county: '',
    changeReason: 'Address Relocation / Update'
  });
  const [newPartyForm, setNewPartyForm] = useState({
    partyType: 'ORGANIZATION',
    partySubType: 'INSURED',
    name: '',
    firstName: '',
    lastName: '',
    line1: '',
    line2: '',
    city: '',
    stateCode: 'IL',
    postalCode: '',
    county: '',
    changeReason: 'Initial Address Setup'
  });
  const [ratingSubForQuote, setRatingSubForQuote] = useState(null);
  const [inspectingQuoteDetail, setInspectingQuoteDetail] = useState(null);
  const [flash, setFlash] = useState(null);
  const [selectedSub, setSelectedSub] = useState(null);
  const canCreateSubmission = activeRole ? activeRole.canCreateSubmission !== false : true;
  const canAddOrganization = activeRole ? activeRole.canAddOrganization !== false : true;

  const loadSubmissions = useCallback(async () => {
    try {
      const data = await apiFetch('/api/submissions');
      const list = Array.isArray(data) ? data : [];
      setSubmissions(list);
      return list;
    } catch (err) {
      setFlash({ type: 'error', text: err.message });
      return [];
    }
  }, [apiFetch]);

  const refreshSubmission = useCallback(
    async (subId) => {
      if (!subId) return;
      try {
        const [subQuotes, allSubs] = await Promise.all([
          apiFetch(`/api/quotes?submsnId=${subId}`),
          apiFetch('/api/submissions')
        ]);
        const list = Array.isArray(allSubs) ? allSubs : [];
        setSubmissions(list);
        const quotesList = Array.isArray(subQuotes) ? subQuotes : [];
        const matching = list.find((s) => s.submsnId === Number(subId));
        if (matching) {
          setSelectedSub({
            ...matching,
            status: 'Quoted',
            quotes: quotesList
          });
        } else {
          setSelectedSub((prev) =>
            prev && prev.submsnId === Number(subId)
              ? {
                  ...prev,
                  status: 'Quoted',
                  quotes: quotesList
                }
              : prev
          );
        }
      } catch (err) {
        console.error('Failed to refresh submission:', err);
      }
    },
    [apiFetch]
  );

  const loadParties = useCallback(
    async (q = '', pType = '') => {
      try {
        let url = `/api/parties?q=${encodeURIComponent(q)}`;
        if (pType && pType !== 'ALL') {
          url += `&partyType=${encodeURIComponent(pType)}`;
        }
        const data = await apiFetch(url);
        const list = Array.isArray(data) ? data : [];
        setParties(list);
        setSelectedPartyId((prev) =>
          list.some((p) => p.id === prev) ? prev : list[0]?.id ?? null
        );
      } catch (err) {
        setFlash({ type: 'error', text: err.message });
      }
    },
    [apiFetch]
  );

  useEffect(() => {
    setSelectedSub(null);
    loadSubmissions();
    loadParties('', partyTypeFilter);
  }, [loadSubmissions, loadParties, activeTenantId, partyTypeFilter]);

  // Rating Engine Integration State
  const [openRateModal, setOpenRateModal] = useState(false);
  const [isRating, setIsRating] = useState(false);
  const [ratingForm, setRatingForm] = useState({
    productCode: 'TECH_EO',
    stateCode: 'CA',
    effectiveDate: '2026-07-01',
    exposureValue: '10000000',
    classCode: 'TECH_SAAS',
    territoryCode: 'CA_SF',
    occurrenceLimit: '5000000',
    aggregateLimit: '5000000',
    retentionAmount: '50000',
    scheduleMod: '0.90',
    underwriter: 'Alex Morgan'
  });
  const [rateResult, setRateResult] = useState(null);

  const handleOpenRateModal = () => {
    if (!selectedPartyId) return;
    setOpenRateModal(true);
    setRateResult(null);
  };

  const handleCalculateRate = async () => {
    setIsRating(true);
    try {
      const payload = {
        tenantId: Number(activeTenantId),
        productCode: ratingForm.productCode,
        stateCode: ratingForm.stateCode,
        effectiveDate: ratingForm.effectiveDate,
        businessType: 'NEW',
        exposureValue: Number(ratingForm.exposureValue),
        classCode: ratingForm.classCode,
        territoryCode: ratingForm.territoryCode,
        occurrenceLimit: Number(ratingForm.occurrenceLimit),
        aggregateLimit: Number(ratingForm.aggregateLimit),
        retentionAmount: Number(ratingForm.retentionAmount),
        scheduleMod: Number(ratingForm.scheduleMod),
        riskAnswers: { priorLossesCount: 0 }
      };

      const res = await fetch('/rating-api/rate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setRateResult(data);
    } catch {
      // Local fallback calculation if rating engine offline
      const exp = Number(ratingForm.exposureValue) / 1000;
      const base = exp * 1.85;
      const terr = ratingForm.stateCode === 'CA' ? 1.25 : 1.15;
      const lim = Number(ratingForm.occurrenceLimit) >= 5000000 ? 1.80 : 1.35;
      const ded = Number(ratingForm.retentionAmount) >= 50000 ? 0.90 : 1.00;
      const sub = base * terr * lim * ded;
      const finalPrem = Math.round(sub * Number(ratingForm.scheduleMod) * 100) / 100;
      setRateResult({
        ratingStatus: Number(ratingForm.occurrenceLimit) > 5000000 ? 'REFERRED' : 'RATED',
        productCode: ratingForm.productCode,
        resolvedFilingVersion: '2025.1',
        stateCode: ratingForm.stateCode,
        serffTrackingNumber: `${ratingForm.stateCode}-2025-0812-EO`,
        finalAnnualPremium: finalPrem,
        minimumPremium: 2500,
        underwritingReferrals: Number(ratingForm.occurrenceLimit) > 5000000
          ? ['SENIOR_UW_REFERRAL: Occurrence limit exceeds standard $5M branch authority.']
          : [],
        attachedForms: [
          'EO-2025-BASE (Standard Technology E&O Policy Jacket)',
          'CYBER-104-SEC (Security Breach & Regulatory Defense Endorsement)',
          `${ratingForm.stateCode}-NOTICE-60D (${ratingForm.stateCode} Cancellation/Nonrenewal Notice)`
        ]
      });
    } finally {
      setIsRating(false);
    }
  };

  const handleCreateSubmissionWithRate = async () => {
    if (!selectedPartyId) return;
    try {
      const prem = rateResult ? `$${Number(rateResult.finalAnnualPremium).toLocaleString()}` : '$25,000';
      const lim = `$${Number(ratingForm.occurrenceLimit).toLocaleString()}`;
      const ret = `$${Number(ratingForm.retentionAmount).toLocaleString()}`;

      const created = await apiFetch('/api/submissions', {
        method: 'POST',
        body: JSON.stringify({
          partyId: selectedPartyId,
          underwriter: ratingForm.underwriter,
          limit: lim,
          retention: ret,
          premium: prem
        })
      });
      setFlash({
        type: 'success',
        text: `Submission ${created.submsnNbr} created and rated at ${prem} for ${created.orgName}`
      });
      setOpenRateModal(false);
      await loadSubmissions();
      setSubTab(0);
    } catch (err) {
      setFlash({ type: 'error', text: err.message });
    }
  };

  const handleAddParty = async (e) => {
    e.preventDefault();
    const isPerson = newPartyForm.partyType === 'PERSON';
    const computedName = isPerson
      ? `${newPartyForm.firstName.trim()} ${newPartyForm.lastName.trim()}`.trim()
      : newPartyForm.name.trim();

    if (!computedName) {
      setFlash({
        type: 'error',
        text: isPerson ? 'First Name and Last Name are required.' : 'Organization Name is required.'
      });
      return;
    }

    try {
      const payload = {
        name: computedName,
        orgName: computedName,
        partyType: newPartyForm.partyType,
        partySubType: newPartyForm.partySubType,
        firstName: isPerson ? newPartyForm.firstName.trim() : null,
        lastName: isPerson ? newPartyForm.lastName.trim() : null,
        address: newPartyForm.line1 && newPartyForm.line1.trim() ? {
          line1: newPartyForm.line1.trim(),
          line2: newPartyForm.line2 && newPartyForm.line2.trim() ? newPartyForm.line2.trim() : null,
          city: newPartyForm.city ? newPartyForm.city.trim() : '',
          stateCode: newPartyForm.stateCode || 'IL',
          postalCode: newPartyForm.postalCode ? newPartyForm.postalCode.trim() : '',
          county: newPartyForm.county && newPartyForm.county.trim() ? newPartyForm.county.trim() : null,
          countryCode: 'US',
          changeReason: newPartyForm.changeReason ? newPartyForm.changeReason.trim() : 'Initial Address Setup'
        } : null
      };

      const created = await apiFetch('/api/parties', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      setOpenAddOrg(false);
      setNewPartyForm({
        partyType: 'ORGANIZATION',
        partySubType: 'INSURED',
        name: '',
        firstName: '',
        lastName: '',
        line1: '',
        line2: '',
        city: '',
        stateCode: 'IL',
        postalCode: '',
        county: '',
        changeReason: 'Initial Address Setup'
      });
      await loadParties(partySearch, partyTypeFilter);
      setSelectedPartyId(created.id);
      setSubTab(1);
      setFlash({ type: 'success', text: `Saved ${created.partyTypeDisplay || created.partyType}: ${created.name}` });
    } catch (err) {
      setFlash({ type: 'error', text: err.message });
    }
  };

  const handleOpenAddressHistory = async (party, e) => {
    if (e) e.stopPropagation();
    setPartyForAddress(party);
    setOpenAddressHistory(true);
    setShowNewAddressInput(false);
    setLoadingHistory(true);
    try {
      const history = await apiFetch(`/api/parties/${party.id}/addresses`);
      setAddressHistoryList(Array.isArray(history) ? history : []);
    } catch (err) {
      setFlash({ type: 'error', text: `Failed to load address history: ${err.message}` });
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSaveNewAddress = async (e) => {
    e.preventDefault();
    if (!partyForAddress || !newAddressData.line1.trim()) return;
    try {
      const payload = {
        address: {
          line1: newAddressData.line1.trim(),
          line2: newAddressData.line2 ? newAddressData.line2.trim() : null,
          city: newAddressData.city ? newAddressData.city.trim() : '',
          stateCode: newAddressData.stateCode || 'IL',
          postalCode: newAddressData.postalCode ? newAddressData.postalCode.trim() : '',
          county: newAddressData.county ? newAddressData.county.trim() : null,
          countryCode: 'US',
          changeReason: newAddressData.changeReason ? newAddressData.changeReason.trim() : 'Address Relocation / Update'
        },
        changedBy: activeRole?.roleName ? `${activeRole.roleName}` : 'Underwriting Team',
        changeReason: newAddressData.changeReason ? newAddressData.changeReason.trim() : 'Address Relocation / Update'
      };

      await apiFetch(`/api/parties/${partyForAddress.id}/address`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });

      setFlash({ type: 'success', text: `Updated address for ${partyForAddress.name}!` });
      setShowNewAddressInput(false);
      setNewAddressData({
        line1: '',
        line2: '',
        city: '',
        stateCode: 'IL',
        postalCode: '',
        county: '',
        changeReason: 'Address Relocation / Update'
      });

      const history = await apiFetch(`/api/parties/${partyForAddress.id}/addresses`);
      setAddressHistoryList(Array.isArray(history) ? history : []);
      await loadParties(partySearch, partyTypeFilter);
    } catch (err) {
      setFlash({ type: 'error', text: `Failed to update address: ${err.message}` });
    }
  };

  const [zipLookupLoading, setZipLookupLoading] = useState(false);
  const [partyZipMatch, setPartyZipMatch] = useState(null);
  const [editZipMatch, setEditZipMatch] = useState(null);

  const lookupZip = useCallback(
    async (zip) => {
      const clean = String(zip || '').trim().replace(/[^\d]/g, '');
      if (clean.length === 5) {
        try {
          setZipLookupLoading(true);
          const data = await apiFetch(`/api/zip-codes/${clean}`);
          if (data && data.city && data.stateCode) {
            return data;
          }
        } catch (err) {
          // not found or error, silent fallback
        } finally {
          setZipLookupLoading(false);
        }
      }
      return null;
    },
    [apiFetch]
  );

  const handlePartyZipChange = async (e) => {
    const val = e.target.value;
    setNewPartyForm((prev) => ({ ...prev, postalCode: val }));
    const digits = val.replace(/[^\d]/g, '');
    if (digits.length === 5) {
      const match = await lookupZip(digits);
      if (match) {
        setPartyZipMatch(match);
        setNewPartyForm((prev) => ({
          ...prev,
          city: match.city,
          stateCode: match.stateCode,
          county: match.county || prev.county
        }));
      } else {
        setPartyZipMatch(null);
      }
    } else {
      setPartyZipMatch(null);
    }
  };

  const handleAddressEditZipChange = async (e) => {
    const val = e.target.value;
    setNewAddressData((prev) => ({ ...prev, postalCode: val }));
    const digits = val.replace(/[^\d]/g, '');
    if (digits.length === 5) {
      const match = await lookupZip(digits);
      if (match) {
        setEditZipMatch(match);
        setNewAddressData((prev) => ({
          ...prev,
          city: match.city,
          stateCode: match.stateCode,
          county: match.county || prev.county
        }));
      } else {
        setEditZipMatch(null);
      }
    } else {
      setEditZipMatch(null);
    }
  };

  if (selectedSub) {
    return (
      <Box>
        <Box sx={{ mb: 2 }}>
          <Button
            variant="text"
            onClick={() => setSelectedSub(null)}
            startIcon={<ChevronRight size={16} style={{ transform: 'rotate(180deg)' }} />}
          >
            Back to Submissions
          </Button>
        </Box>

        {flash && (
          <Alert severity={flash.type} onClose={() => setFlash(null)} sx={{ mb: 2 }}>
            {flash.text}
          </Alert>
        )}

        <Card elevation={0} sx={{ mb: 3, borderTop: '4px solid #013a12' }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Box>
                <Typography variant="h6">
                  Submission File: {selectedSub.submsnNbr} — {selectedSub.orgName}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Policy: {selectedSub.policyNbr || 'Pending'} • Product: {selectedSub.productType}
                </Typography>
              </Box>
              <StatusPill status={selectedSub.status || 'Quoted'} />
            </Box>
            <Divider sx={{ mb: 2 }} />
            <Grid container spacing={3}>
              <Grid size={{ xs: 6, sm: 3 }}>
                <Typography variant="caption" color="textSecondary">Underwriter</Typography>
                <Typography variant="body2" fontWeight={600}>{selectedSub.fileLevelInfo?.underwriter}</Typography>
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <Typography variant="caption" color="textSecondary">Effective Date</Typography>
                <Typography variant="body2" fontWeight={600}>{selectedSub.fileLevelInfo?.effectiveDate}</Typography>
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <Typography variant="caption" color="textSecondary">Expiration Date</Typography>
                <Typography variant="body2" fontWeight={600}>{selectedSub.fileLevelInfo?.expirationDate}</Typography>
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <Typography variant="caption" color="textSecondary">Retroactive Date</Typography>
                <Typography variant="body2" fontWeight={600}>{selectedSub.fileLevelInfo?.retroactiveDate}</Typography>
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <Typography variant="caption" color="textSecondary">Limit</Typography>
                <Typography variant="body2" fontWeight={600}>{selectedSub.fileLevelInfo?.limit}</Typography>
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <Typography variant="caption" color="textSecondary">Retention</Typography>
                <Typography variant="body2" fontWeight={600}>{selectedSub.fileLevelInfo?.retention}</Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={subDetailTab} onChange={(e, nv) => setSubDetailTab(nv)}>
            <Tab label="Quotes & SERFF Rating" icon={<Calculator size={16} />} iconPosition="start" />
            <Tab label="Documents & Forms" icon={<Printer size={16} />} iconPosition="start" />
          </Tabs>
        </Box>

        {subDetailTab === 0 && (
          <Card elevation={0}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box>
                  <Typography variant="h6">Quote Level Information</Typography>
                  <Typography variant="caption" color="textSecondary">
                    Approved rates calculated with SERFF regulatory rules and stored in dbo.UW_QUOTE
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<RefreshCw size={15} />}
                    onClick={() => refreshSubmission(selectedSub.submsnId)}
                  >
                    Refresh
                  </Button>
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<Calculator size={16} />}
                    onClick={() => setRatingSubForQuote(selectedSub)}
                  >
                    Rate &amp; Issue New Quote
                  </Button>
                </Box>
              </Box>
              <TableContainer component={Paper} elevation={0} variant="outlined">
                <Table size="small">
                  <TableHead sx={{ backgroundColor: '#f8fafc' }}>
                    <TableRow>
                      <TableCell>Quote ID</TableCell>
                      <TableCell>Product</TableCell>
                      <TableCell>State</TableCell>
                      <TableCell>SERFF Filing #</TableCell>
                      <TableCell>Limit / Retention</TableCell>
                      <TableCell>Generated</TableCell>
                      <TableCell>Premium</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(selectedSub.quotes || []).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} sx={{ textAlign: 'center', py: 3, color: '#94a3b8' }}>
                          No quotes issued yet for this submission. Click &quot;Rate &amp; Issue New Quote&quot; above.
                        </TableCell>
                      </TableRow>
                    ) : (
                      (selectedSub.quotes || []).map((q) => (
                        <TableRow key={q.quoteId} hover>
                          <TableCell sx={{ fontWeight: 700, color: 'primary.main' }}>{q.quoteId}</TableCell>
                          <TableCell>
                            <Chip label={q.productCode || selectedSub.productType || 'TECH_EO'} size="small" sx={{ fontSize: '0.7rem', height: 22 }} />
                          </TableCell>
                          <TableCell>
                            <Chip label={q.stateCode || 'CA'} size="small" variant="outlined" sx={{ fontWeight: 700, fontSize: '0.7rem' }} />
                          </TableCell>
                          <TableCell>
                            <code>{q.serffTrackingNbr || 'SERFF-2025-BASE'}</code>
                          </TableCell>
                          <TableCell sx={{ fontSize: '0.8rem' }}>
                            {q.limitAmt || selectedSub.fileLevelInfo?.limit || '$5,000,000'} / {q.retentionAmt || selectedSub.fileLevelInfo?.retention || '$50,000'}
                          </TableCell>
                          <TableCell sx={{ fontSize: '0.82rem' }}>{q.generated}</TableCell>
                          <TableCell sx={{ fontWeight: 800, color: 'primary.main', fontSize: '0.92rem' }}>{q.premium}</TableCell>
                          <TableCell>
                            <StatusPill status={q.status} />
                          </TableCell>
                          <TableCell align="right">
                            <Button
                              size="small"
                              variant="text"
                              onClick={() => setInspectingQuoteDetail({ ...q, orgName: selectedSub.orgName, submsnNbr: selectedSub.submsnNbr })}
                            >
                              Trace
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<Printer size={13} />}
                              sx={{ ml: 1 }}
                              onClick={() => setSubDetailTab(1)}
                            >
                              PDF
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        )}

        {subDetailTab === 1 && (
          <DocumentsManager
            apiFetch={apiFetch}
            activeTenantId={activeTenantId}
            entityType="SUBMISSION"
            entityId={selectedSub.submsnId}
            entityNbr={selectedSub.submsnNbr}
            defaultInsuredName={selectedSub.orgName}
            defaultProductType={selectedSub.productType || 'Technology Errors & Omissions'}
            defaultEffectiveDate={selectedSub.fileLevelInfo?.effectiveDate || '2026-03-01'}
            defaultExpirationDate={selectedSub.fileLevelInfo?.expirationDate || '2027-03-01'}
            defaultLimit={selectedSub.fileLevelInfo?.limit || '$2,000,000'}
            defaultDeductible={selectedSub.fileLevelInfo?.retention || '$25,000'}
            quotes={selectedSub.quotes || []}
            title={`Submission Documents & Forms — ${selectedSub.submsnNbr}`}
          />
        )}

        {/* Rating & Quote Creation for Selected Submission */}
        <RatingQuoteDialog
          open={Boolean(ratingSubForQuote)}
          onClose={() => setRatingSubForQuote(null)}
          submission={ratingSubForQuote}
          apiFetch={apiFetch}
          activeTenantId={activeTenantId}
          onQuoteSaved={async (savedQuote) => {
            setFlash({
              type: 'success',
              text: `Quote ${savedQuote.quoteId} (${savedQuote.premium}) successfully saved to dbo.UW_QUOTE for ${ratingSubForQuote?.orgName}!`
            });
            const subId = ratingSubForQuote?.submsnId || selectedSub?.submsnId || savedQuote?.submsnId;
            if (subId) {
              await refreshSubmission(subId);
            } else {
              await loadSubmissions();
            }
          }}
        />

        {/* Quote Trace Detail Modal */}
        <QuoteDetailDialog
          quote={inspectingQuoteDetail}
          onClose={() => setInspectingQuoteDetail(null)}
        />
      </Box>
    );
  }

  const selectedParty = parties.find((p) => p.id === selectedPartyId) || null;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontSize: '1.65rem', mb: 0.4 }}>
            Submissions
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748b' }}>
            Underwriting submissions and organization registry (UW_SUBMSN &amp; PT_PARTY)
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
          <Button variant="outlined" onClick={() => setSubTab(1)}>
            Search Organizations
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<Plus size={16} />}
            disabled={!canAddOrganization}
            onClick={() => setOpenAddOrg(true)}
          >
            {canAddOrganization ? 'Add Party / Organization' : 'Add Party (Restricted)'}
          </Button>
        </Box>
      </Box>

      {flash && (
        <Alert severity={flash.type} onClose={() => setFlash(null)} sx={{ mb: 2 }}>
          {flash.text}
        </Alert>
      )}

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={subTab} onChange={(_, v) => setSubTab(v)}>
          <Tab label="Submissions Queue" />
          <Tab label="Party & Address Registry (PT_PARTY & PT_ADDRESS)" />
        </Tabs>
      </Box>

      {subTab === 0 && (
        <Card elevation={0}>
          <TableContainer>
            <Table>
              <TableHead sx={{ backgroundColor: '#f8fafc' }}>
                <TableRow>
                  <TableCell sx={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b' }}>SUBMISSION NUMBER</TableCell>
                  <TableCell sx={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b' }}>INSURED NAME</TableCell>
                  <TableCell sx={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b' }}>POLICY NUMBER</TableCell>
                  <TableCell sx={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b' }}>PRODUCT TYPE</TableCell>
                  <TableCell sx={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b' }}>UNDERWRITER</TableCell>
                  <TableCell sx={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b' }}>DATE</TableCell>
                  <TableCell sx={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b' }}>STATUS</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {submissions.map((sub) => (
                  <TableRow
                    key={sub.submsnId}
                    hover
                    sx={{ cursor: 'pointer' }}
                    onClick={() => setSelectedSub(sub)}
                  >
                    <TableCell sx={{ fontWeight: 700, color: 'primary.main' }}>{sub.submsnNbr}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{sub.orgName}</TableCell>
                    <TableCell>{sub.policyNbr || '—'}</TableCell>
                    <TableCell>{sub.productType}</TableCell>
                    <TableCell>{sub.fileLevelInfo?.underwriter}</TableCell>
                    <TableCell>{sub.date}</TableCell>
                    <TableCell>
                      <StatusPill status={sub.status || 'Quoted'} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      {subTab === 1 && (
        <Card elevation={0}>
          <CardContent>
            <Box
              component="form"
              onSubmit={(e) => {
                e.preventDefault();
                loadParties(partySearch, partyTypeFilter);
              }}
              sx={{ display: 'flex', gap: 2, mb: 2.5, flexWrap: 'wrap', alignItems: 'center' }}
            >
              <TextField
                size="small"
                sx={{ flex: 1, minWidth: 240 }}
                label="Search Party Name, City, or State"
                value={partySearch}
                onChange={(e) => setPartySearch(e.target.value)}
              />
              <FormControl size="small" sx={{ minWidth: 180 }}>
                <InputLabel id="party-type-filter-label">Entity Classification</InputLabel>
                <Select
                  labelId="party-type-filter-label"
                  label="Entity Classification"
                  value={partyTypeFilter}
                  onChange={(e) => {
                    const val = e.target.value;
                    setPartyTypeFilter(val);
                    loadParties(partySearch, val);
                  }}
                >
                  <MenuItem value="ALL">All Classifications</MenuItem>
                  <MenuItem value="ORGANIZATION">Organizations (Insured / Agency)</MenuItem>
                  <MenuItem value="PERSON">Persons (Producer / Employee)</MenuItem>
                </Select>
              </FormControl>
              <Button type="submit" variant="contained" color="primary" sx={{ minWidth: 110 }}>
                Filter
              </Button>
            </Box>

            <TableContainer component={Paper} elevation={0} variant="outlined">
              <Table>
                <TableHead sx={{ backgroundColor: '#f8fafc' }}>
                  <TableRow>
                    <TableCell sx={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b', width: 60 }}>
                      ID
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b', minWidth: 180 }}>
                      PARTY / ENTITY NAME
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b', minWidth: 160 }}>
                      CLASSIFICATION
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b', minWidth: 260 }}>
                      PRIMARY US ADDRESS
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b', width: 110 }}>
                      STATUS
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b', width: 150 }}>
                      ADDRESS ACTIONS
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {parties.map((party) => {
                    const isSelected = party.id === selectedPartyId;
                    const isPerson = party.partyType === 'PERSON';
                    const addr = party.primaryAddress;
                    return (
                      <TableRow
                        key={party.id}
                        hover
                        onClick={() => setSelectedPartyId(party.id)}
                        selected={isSelected}
                        sx={{
                          cursor: 'pointer',
                          ...(isSelected
                            ? {
                                backgroundColor: 'rgba(1, 58, 18, 0.08) !important',
                                '& td:first-of-type': { borderLeft: '4px solid #013a12' }
                              }
                            : {})
                        }}
                      >
                        <TableCell sx={{ fontWeight: 600, color: '#64748b' }}>
                          #{party.id}
                        </TableCell>
                        <TableCell sx={{ fontWeight: isSelected ? 700 : 600, color: '#0f172a' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {isPerson ? (
                              <User size={16} color="#0284c7" />
                            ) : (
                              <Building size={16} color="#15803d" />
                            )}
                            <span>{party.name}</span>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={party.partyTypeDisplay || `${party.partyType}: ${party.partySubType}`}
                            sx={{
                              backgroundColor:
                                party.partyType === 'ORGANIZATION'
                                  ? party.partySubType === 'AGENCY'
                                    ? '#faf5ff'
                                    : '#eff6ff'
                                  : party.partySubType === 'PRODUCER'
                                  ? '#fffbeb'
                                  : '#f0fdfa',
                              color:
                                party.partyType === 'ORGANIZATION'
                                  ? party.partySubType === 'AGENCY'
                                    ? '#7e22ce'
                                    : '#1d4ed8'
                                  : party.partySubType === 'PRODUCER'
                                  ? '#b45309'
                                  : '#0f766e',
                              border:
                                party.partyType === 'ORGANIZATION'
                                  ? party.partySubType === 'AGENCY'
                                    ? '1px solid #e9d5ff'
                                    : '1px solid #bfdbfe'
                                  : party.partySubType === 'PRODUCER'
                                  ? '1px solid #fde68a'
                                  : '1px solid #99f6e4',
                              fontWeight: 600,
                              fontSize: '0.72rem',
                              height: 22
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          {addr ? (
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e293b' }}>
                                {addr.line1} {addr.line2 ? `(${addr.line2})` : ''}
                              </Typography>
                              <Typography variant="caption" sx={{ color: '#64748b' }}>
                                {addr.city}, {addr.stateCode} {addr.postalCode}
                                {addr.county ? ` • ${addr.county} County` : ''}
                              </Typography>
                            </Box>
                          ) : (
                            <Typography variant="caption" sx={{ color: '#94a3b8', fontStyle: 'italic' }}>
                              No address registered
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={addr?.addressStatus || (addr?.isActive ? 'ACTIVE' : 'NO ADDRESS')}
                            color={addr?.isActive ? 'success' : 'default'}
                            variant={addr?.isActive ? 'filled' : 'outlined'}
                            sx={{ fontSize: '0.68rem', height: 20, fontWeight: 700 }}
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            size="small"
                            variant="outlined"
                            color="inherit"
                            startIcon={<History size={14} />}
                            onClick={(e) => handleOpenAddressHistory(party, e)}
                            sx={{
                              textTransform: 'none',
                              fontSize: '0.72rem',
                              borderColor: '#cbd5e1',
                              color: '#334155',
                              '&:hover': { borderColor: '#94a3b8', backgroundColor: '#f1f5f9' }
                            }}
                          >
                            History &amp; Changes
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>

            <Box sx={{ mt: 2.5 }}>
              <Button
                variant="contained"
                color="primary"
                fullWidth
                size="large"
                startIcon={<Calculator size={18} />}
                disabled={!selectedParty || !canCreateSubmission}
                onClick={handleOpenRateModal}
              >
                {!canCreateSubmission
                  ? `Create Submission Restricted for Role (${activeRole?.roleName})`
                  : selectedParty
                    ? `Rate & Create Submission for ${selectedParty.name}`
                    : 'Select a Party to Rate & Submit'}
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Live Rating & Submission Creation Dialog */}
      <Dialog open={openRateModal} onClose={() => setOpenRateModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Calculator size={20} color="#0284c7" />
          <span>Rate &amp; Configure Submission &mdash; {selectedParty?.name}</span>
        </DialogTitle>
        <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography variant="body2" sx={{ color: '#64748b' }}>
            Calculate rates in real time against state-approved DOI filings in <code>HELIOS_RATING_DB</code>:
          </Typography>

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Product Line</InputLabel>
                <Select
                  label="Product Line"
                  value={ratingForm.productCode}
                  onChange={(e) => setRatingForm({ ...ratingForm, productCode: e.target.value })}
                >
                  <MenuItem value="TECH_EO">Technology E&amp;O</MenuItem>
                  <MenuItem value="COMMERCIAL_AUTO">Commercial Automobile &amp; Fleet</MenuItem>
                  <MenuItem value="MED_MAL">Medical Malpractice</MenuItem>
                  <MenuItem value="DNO">Directors &amp; Officers</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Risk State (Filing Jurisdiction)</InputLabel>
                <Select
                  label="Risk State (Filing Jurisdiction)"
                  value={ratingForm.stateCode}
                  onChange={(e) => setRatingForm({ ...ratingForm, stateCode: e.target.value })}
                >
                  <MenuItem value="CA">California (SERFF: CA-2025-0812-EO)</MenuItem>
                  <MenuItem value="NY">New York (SERFF: NY-2025-0443-EO)</MenuItem>
                  <MenuItem value="TX">Texas (SERFF: TX-2025-1109-EO)</MenuItem>
                  <MenuItem value="FL">Florida (SERFF: FL-2025-0671-EO)</MenuItem>
                  <MenuItem value="ALL">Nationwide Fallback (ISO Baseline)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                size="small"
                fullWidth
                label="Exposure (Annual Revenue / Headcount)"
                value={ratingForm.exposureValue}
                onChange={(e) => setRatingForm({ ...ratingForm, exposureValue: e.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Policy Limits</InputLabel>
                <Select
                  label="Policy Limits"
                  value={ratingForm.occurrenceLimit}
                  onChange={(e) => setRatingForm({ ...ratingForm, occurrenceLimit: e.target.value, aggregateLimit: e.target.value })}
                >
                  <MenuItem value="1000000">$1,000,000 / $1,000,000</MenuItem>
                  <MenuItem value="2000000">$2,000,000 / $2,000,000</MenuItem>
                  <MenuItem value="5000000">$5,000,000 / $5,000,000</MenuItem>
                  <MenuItem value="10000000">$10,000,000 / $10,000,000 (Requires Senior UW)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Retention (SIR)</InputLabel>
                <Select
                  label="Retention (SIR)"
                  value={ratingForm.retentionAmount}
                  onChange={(e) => setRatingForm({ ...ratingForm, retentionAmount: e.target.value })}
                >
                  <MenuItem value="10000">$10,000</MenuItem>
                  <MenuItem value="25000">$25,000 (Base)</MenuItem>
                  <MenuItem value="50000">$50,000 (10% Credit)</MenuItem>
                  <MenuItem value="100000">$100,000 (18% Credit)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                size="small"
                fullWidth
                label="Schedule Rating Mod (e.g. 0.90 = -10%)"
                value={ratingForm.scheduleMod}
                onChange={(e) => setRatingForm({ ...ratingForm, scheduleMod: e.target.value })}
              />
            </Grid>
          </Grid>

          <Button
            variant="outlined"
            color="secondary"
            fullWidth
            startIcon={isRating ? <CircularProgress size={16} color="inherit" /> : <Calculator size={16} />}
            disabled={isRating}
            onClick={handleCalculateRate}
          >
            {isRating ? 'Querying HeliosRating Engine...' : 'Calculate Live Rate & Evaluate Rules'}
          </Button>

          {rateResult && (
            <Paper variant="outlined" sx={{ p: 2, backgroundColor: '#f8fafc', borderLeft: '4px solid #0284c7' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Box>
                  <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700 }}>
                    RATED ANNUAL PREMIUM
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800, color: '#0f172a' }}>
                    ${Number(rateResult.finalAnnualPremium).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                  <Chip
                    label={rateResult.ratingStatus}
                    color={rateResult.ratingStatus === 'RATED' ? 'success' : 'warning'}
                    size="small"
                    sx={{ fontWeight: 700 }}
                  />
                  <Typography variant="caption" sx={{ display: 'block', color: '#64748b', mt: 0.5 }}>
                    {rateResult.serffTrackingNumber}
                  </Typography>
                </Box>
              </Box>

              {rateResult.underwritingReferrals?.length > 0 && (
                <Alert severity="warning" sx={{ py: 0.5, mb: 1.5, fontSize: '0.8rem' }}>
                  {rateResult.underwritingReferrals[0]}
                </Alert>
              )}

              <Typography variant="caption" sx={{ fontWeight: 700, color: '#475569', display: 'block', mb: 0.5 }}>
                Attached Mandatory Endorsements:
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                {(rateResult.attachedForms || []).map((form) => (
                  <Chip key={form} label={form} size="small" variant="outlined" sx={{ fontSize: '0.68rem', height: 22 }} />
                ))}
              </Box>
            </Paper>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenRateModal(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleCreateSubmissionWithRate}
          >
            {rateResult ? `Bind & Create Submission ($${Number(rateResult.finalAnnualPremium).toLocaleString()})` : 'Create Submission'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Enhanced Add Party / Organization Dialog with Classification and US Address */}
      <Dialog open={openAddOrg} onClose={() => setOpenAddOrg(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleAddParty}>
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Building2 size={22} color="#0284c7" />
            <span>Add New Party (PT_PARTY &amp; PT_ADDRESS)</span>
          </DialogTitle>
          <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <Typography variant="body2" sx={{ color: '#64748b' }}>
              Classify entity according to standard insurance code table (<code>PT_PARTY_TYPE_CODE</code>) and configure baseline US address.
            </Typography>

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth size="small">
                  <InputLabel id="party-type-select-label">Party Type</InputLabel>
                  <Select
                    labelId="party-type-select-label"
                    label="Party Type"
                    value={newPartyForm.partyType}
                    onChange={(e) => {
                      const type = e.target.value;
                      setNewPartyForm((prev) => ({
                        ...prev,
                        partyType: type,
                        partySubType: type === 'PERSON' ? 'PRODUCER' : 'INSURED'
                      }));
                    }}
                  >
                    <MenuItem value="ORGANIZATION">Organization</MenuItem>
                    <MenuItem value="PERSON">Person</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth size="small">
                  <InputLabel id="party-subtype-select-label">Party Sub-Type</InputLabel>
                  <Select
                    labelId="party-subtype-select-label"
                    label="Party Sub-Type"
                    value={newPartyForm.partySubType}
                    onChange={(e) =>
                      setNewPartyForm((prev) => ({ ...prev, partySubType: e.target.value }))
                    }
                  >
                    {newPartyForm.partyType === 'ORGANIZATION' ? [
                      <MenuItem key="INSURED" value="INSURED">Commercial Insured</MenuItem>,
                      <MenuItem key="AGENCY" value="AGENCY">Brokerage / Agency</MenuItem>
                    ] : [
                      <MenuItem key="PRODUCER" value="PRODUCER">Licensed Producer</MenuItem>,
                      <MenuItem key="EMPLOYEE" value="EMPLOYEE">Internal Employee</MenuItem>
                    ]}
                  </Select>
                </FormControl>
              </Grid>

              {newPartyForm.partyType === 'ORGANIZATION' ? (
                <Grid size={{ xs: 12 }}>
                  <TextField
                    label="Organization Name"
                    size="small"
                    fullWidth
                    required
                    placeholder="e.g. Acme Health Solutions LLC"
                    value={newPartyForm.name}
                    onChange={(e) =>
                      setNewPartyForm((prev) => ({ ...prev, name: e.target.value }))
                    }
                  />
                </Grid>
              ) : (
                <>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      label="First Name"
                      size="small"
                      fullWidth
                      required
                      placeholder="e.g. Sarah"
                      value={newPartyForm.firstName}
                      onChange={(e) =>
                        setNewPartyForm((prev) => ({ ...prev, firstName: e.target.value }))
                      }
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      label="Last Name"
                      size="small"
                      fullWidth
                      required
                      placeholder="e.g. Jenkins"
                      value={newPartyForm.lastName}
                      onChange={(e) =>
                        setNewPartyForm((prev) => ({ ...prev, lastName: e.target.value }))
                      }
                    />
                  </Grid>
                </>
              )}
            </Grid>

            <Divider>
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
                PRIMARY US ADDRESS (PT_ADDRESS)
              </Typography>
            </Divider>

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 8 }}>
                <TextField
                  label="Street Address Line 1"
                  size="small"
                  fullWidth
                  required
                  placeholder="e.g. 500 Michigan Ave"
                  value={newPartyForm.line1}
                  onChange={(e) =>
                    setNewPartyForm((prev) => ({ ...prev, line1: e.target.value }))
                  }
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  label="Suite / Unit"
                  size="small"
                  fullWidth
                  placeholder="e.g. Suite 400"
                  value={newPartyForm.line2}
                  onChange={(e) =>
                    setNewPartyForm((prev) => ({ ...prev, line2: e.target.value }))
                  }
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  label="ZIP Code"
                  size="small"
                  fullWidth
                  required
                  placeholder="e.g. 60611"
                  value={newPartyForm.postalCode}
                  onChange={handlePartyZipChange}
                  helperText={
                    partyZipMatch
                      ? `Auto-filled: ${partyZipMatch.city}, ${partyZipMatch.stateCode}`
                      : 'Enter 5-digit ZIP to auto-populate'
                  }
                  slotProps={{
                    input: {
                      endAdornment: zipLookupLoading ? (
                        <InputAdornment position="end">
                          <CircularProgress size={16} />
                        </InputAdornment>
                      ) : partyZipMatch ? (
                        <InputAdornment position="end">
                          <CheckCircle2 size={16} color="#16a34a" />
                        </InputAdornment>
                      ) : null
                    }
                  }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 5 }}>
                <TextField
                  label="City"
                  size="small"
                  fullWidth
                  required
                  placeholder="e.g. Chicago"
                  value={newPartyForm.city}
                  onChange={(e) =>
                    setNewPartyForm((prev) => ({ ...prev, city: e.target.value }))
                  }
                />
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <FormControl fullWidth size="small">
                  <InputLabel id="party-state-label">State</InputLabel>
                  <Select
                    labelId="party-state-label"
                    label="State"
                    value={newPartyForm.stateCode}
                    onChange={(e) =>
                      setNewPartyForm((prev) => ({ ...prev, stateCode: e.target.value }))
                    }
                  >
                    {US_STATES.map((st) => (
                      <MenuItem key={st} value={st}>
                        {st}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="County"
                  size="small"
                  fullWidth
                  placeholder="e.g. Cook"
                  value={newPartyForm.county}
                  onChange={(e) =>
                    setNewPartyForm((prev) => ({ ...prev, county: e.target.value }))
                  }
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Setup Reason / Note"
                  size="small"
                  fullWidth
                  placeholder="Initial Address Setup"
                  value={newPartyForm.changeReason}
                  onChange={(e) =>
                    setNewPartyForm((prev) => ({ ...prev, changeReason: e.target.value }))
                  }
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setOpenAddOrg(false)}>Cancel</Button>
            <Button type="submit" variant="contained" color="primary">
              Save Party &amp; Address
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Address History & Tracking Dialog */}
      <Dialog
        open={openAddressHistory}
        onClose={() => setOpenAddressHistory(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <History size={22} color="#0284c7" />
            <span>Address History &amp; Change Tracking &mdash; {partyForAddress?.name}</span>
          </Box>
          <Button
            size="small"
            variant={showNewAddressInput ? 'outlined' : 'contained'}
            color="primary"
            startIcon={showNewAddressInput ? undefined : <Plus size={16} />}
            onClick={() => setShowNewAddressInput((prev) => !prev)}
          >
            {showNewAddressInput ? 'Close Form' : '+ Record New Address'}
          </Button>
        </DialogTitle>
        <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {showNewAddressInput && (
            <Card variant="outlined" sx={{ backgroundColor: '#f8fafc', p: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, color: '#0f172a' }}>
                Record Address Change (Archives Previous Active Address)
              </Typography>
              <form onSubmit={handleSaveNewAddress}>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 8 }}>
                    <TextField
                      label="New Street Address Line 1"
                      size="small"
                      fullWidth
                      required
                      placeholder="e.g. 100 Corporate Blvd"
                      value={newAddressData.line1}
                      onChange={(e) =>
                        setNewAddressData((prev) => ({ ...prev, line1: e.target.value }))
                      }
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <TextField
                      label="Suite / Unit"
                      size="small"
                      fullWidth
                      placeholder="e.g. Suite 200"
                      value={newAddressData.line2}
                      onChange={(e) =>
                        setNewAddressData((prev) => ({ ...prev, line2: e.target.value }))
                      }
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <TextField
                      label="ZIP Code"
                      size="small"
                      fullWidth
                      required
                      placeholder="e.g. 02115"
                      value={newAddressData.postalCode}
                      onChange={handleAddressEditZipChange}
                      helperText={
                        editZipMatch
                          ? `Auto-filled: ${editZipMatch.city}, ${editZipMatch.stateCode}`
                          : 'Enter 5-digit ZIP to auto-populate'
                      }
                      slotProps={{
                        input: {
                          endAdornment: zipLookupLoading ? (
                            <InputAdornment position="end">
                              <CircularProgress size={16} />
                            </InputAdornment>
                          ) : editZipMatch ? (
                            <InputAdornment position="end">
                              <CheckCircle2 size={16} color="#16a34a" />
                            </InputAdornment>
                          ) : null
                        }
                      }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 5 }}>
                    <TextField
                      label="City"
                      size="small"
                      fullWidth
                      required
                      placeholder="e.g. Boston"
                      value={newAddressData.city}
                      onChange={(e) =>
                        setNewAddressData((prev) => ({ ...prev, city: e.target.value }))
                      }
                    />
                  </Grid>
                  <Grid size={{ xs: 6, sm: 3 }}>
                    <FormControl fullWidth size="small">
                      <InputLabel id="edit-state-label">State</InputLabel>
                      <Select
                        labelId="edit-state-label"
                        label="State"
                        value={newAddressData.stateCode}
                        onChange={(e) =>
                          setNewAddressData((prev) => ({ ...prev, stateCode: e.target.value }))
                        }
                      >
                        {US_STATES.map((st) => (
                          <MenuItem key={st} value={st}>
                            {st}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      label="County"
                      size="small"
                      fullWidth
                      placeholder="e.g. Suffolk"
                      value={newAddressData.county}
                      onChange={(e) =>
                        setNewAddressData((prev) => ({ ...prev, county: e.target.value }))
                      }
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      label="Reason for Change (Audit Tracking)"
                      size="small"
                      fullWidth
                      required
                      placeholder="e.g. Relocated regional office"
                      value={newAddressData.changeReason}
                      onChange={(e) =>
                        setNewAddressData((prev) => ({ ...prev, changeReason: e.target.value }))
                      }
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }} sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5 }}>
                    <Button size="small" onClick={() => setShowNewAddressInput(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" size="small" variant="contained" color="success">
                      Save &amp; Activate New Address
                    </Button>
                  </Grid>
                </Grid>
              </form>
            </Card>
          )}

          {loadingHistory ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress size={32} />
            </Box>
          ) : addressHistoryList.length === 0 ? (
            <Alert severity="info">No address records found for this party.</Alert>
          ) : (
            <TableContainer component={Paper} elevation={0} variant="outlined">
              <Table size="small">
                <TableHead sx={{ backgroundColor: '#f8fafc' }}>
                  <TableRow>
                    <TableCell sx={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b', width: 90 }}>
                      STATUS
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b' }}>
                      US ADDRESS
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b', width: 140 }}>
                      EFFECTIVE PERIOD
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b', width: 130 }}>
                      CHANGED DT
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b', width: 110 }}>
                      CHANGED BY
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b' }}>
                      CHANGE REASON
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {addressHistoryList.map((addr) => (
                    <TableRow
                      key={addr.addressId}
                      sx={{
                        backgroundColor: addr.isActive ? 'rgba(34, 197, 94, 0.04)' : 'transparent'
                      }}
                    >
                      <TableCell>
                        <Chip
                          size="small"
                          label={addr.addressStatus || (addr.isActive ? 'ACTIVE' : 'SUPERSEDED')}
                          color={addr.isActive ? 'success' : 'default'}
                          variant={addr.isActive ? 'filled' : 'outlined'}
                          sx={{ fontSize: '0.68rem', height: 20, fontWeight: 700 }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e293b' }}>
                          {addr.line1} {addr.line2 ? `(${addr.line2})` : ''}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#64748b' }}>
                          {addr.city}, {addr.stateCode} {addr.postalCode}
                          {addr.county ? ` • ${addr.county}` : ''}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.75rem', color: '#475569' }}>
                        <div>From: {addr.effectiveFrom ? addr.effectiveFrom.substring(0, 10) : '—'}</div>
                        <div>To: {addr.effectiveTo ? addr.effectiveTo.substring(0, 10) : 'Present'}</div>
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.75rem', color: '#64748b' }}>
                        {addr.changedDt ? addr.changedDt.substring(0, 19).replace('T', ' ') : '—'}
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.75rem', color: '#475569', fontWeight: 500 }}>
                        {addr.changedBy || 'System'}
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.75rem', color: '#334155', fontStyle: 'italic' }}>
                        {addr.changeReason || '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAddressHistory(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Rating & Quote Creation for Selected Submission */}
      <RatingQuoteDialog
        open={Boolean(ratingSubForQuote)}
        onClose={() => setRatingSubForQuote(null)}
        submission={ratingSubForQuote}
        apiFetch={apiFetch}
        activeTenantId={activeTenantId}
        onQuoteSaved={async (savedQuote) => {
          setFlash({
            type: 'success',
            text: `Quote ${savedQuote.quoteId} (${savedQuote.premium}) successfully saved to dbo.UW_QUOTE for ${ratingSubForQuote?.orgName}!`
          });
          const subId = ratingSubForQuote?.submsnId || selectedSub?.submsnId || savedQuote?.submsnId;
          if (subId) {
            await refreshSubmission(subId);
          } else {
            await loadSubmissions();
          }
        }}
      />

      {/* Quote Trace Detail Modal */}
      <QuoteDetailDialog
        quote={inspectingQuoteDetail}
        onClose={() => setInspectingQuoteDetail(null)}
      />
    </Box>
  );
};

// --- Shared Rating & Quote Generation Dialog ---
const RatingQuoteDialog = ({
  open,
  onClose,
  submission = null,
  submissions = [],
  apiFetch,
  activeTenantId,
  onQuoteSaved
}) => {
  const [selectedSubId, setSelectedSubId] = useState('');
  const [availableFlows, setAvailableFlows] = useState([]);
  const [selectedFlowId, setSelectedFlowId] = useState('');
  const [ratingEngineMode, setRatingEngineMode] = useState('BRMS'); // 'BRMS' | 'SERFF'
  const [isLoadingFlows, setIsLoadingFlows] = useState(false);
  const [ratingForm, setRatingForm] = useState({
    productCode: 'TECH_EO',
    stateCode: 'CA',
    effectiveDate: new Date().toISOString().slice(0, 10),
    exposureValue: '10000000',
    classCode: 'TECH_SAAS',
    territoryCode: 'CA_SF',
    occurrenceLimit: '5000000',
    aggregateLimit: '5000000',
    retentionAmount: '50000',
    scheduleMod: '0.90',
    underwriter: 'Michael Chang'
  });
  const [rateResult, setRateResult] = useState(null);
  const [isRating, setIsRating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  const parseNum = (val, fallback = 0) => {
    if (typeof val === 'number') return isNaN(val) ? fallback : val;
    const clean = String(val || '').replace(/[^0-9.-]/g, '');
    const num = parseFloat(clean);
    return isNaN(num) ? fallback : num;
  };

  useEffect(() => {
    if (!open) return;
    if (submission) {
      setSelectedSubId(submission.submsnId);
      let pCode = 'TECH_EO';
      if (submission.productType?.toLowerCase().includes('med')) pCode = 'MED_MAL';
      if (submission.productType?.toLowerCase().includes('direct') || submission.productType?.toLowerCase().includes('d&o')) pCode = 'DNO';
      if (submission.productType?.toLowerCase().includes('auto') || submission.productType?.toLowerCase().includes('fleet')) pCode = 'COMMERCIAL_AUTO';
      setRatingForm((prev) => ({
        ...prev,
        productCode: pCode,
        classCode: pCode === 'COMMERCIAL_AUTO' ? 'FLEET_COMMERCIAL' : (pCode === 'MED_MAL' ? 'PHYS_SURGERY' : (pCode === 'DNO' ? 'CORP_PRIVATE' : 'TECH_SAAS')),
        underwriter: submission.fileLevelInfo?.underwriter || 'Michael Chang',
        effectiveDate: submission.fileLevelInfo?.effectiveDate || new Date().toISOString().slice(0, 10)
      }));
    } else if (submissions && submissions.length > 0) {
      setSelectedSubId(submissions[0].submsnId);
    }
    setRateResult(null);
    setError(null);
  }, [open, submission?.submsnId]);

  useEffect(() => {
    if (!open) return;
    const fetchFlows = async () => {
      setIsLoadingFlows(true);
      try {
        const res = await fetch(`/api/brms/flows?tenantId=${activeTenantId || 1}`);
        if (res.ok) {
          const list = await res.json();
          setAvailableFlows(Array.isArray(list) ? list : []);
        }
      } catch (err) {
        console.warn('Failed to load BRMS flows:', err);
      } finally {
        setIsLoadingFlows(false);
      }
    };
    fetchFlows();
  }, [open, activeTenantId]);

  useEffect(() => {
    if (!availableFlows || availableFlows.length === 0) {
      setSelectedFlowId('');
      return;
    }
    // Prefer matching productCode & ACTIVE
    const matching = availableFlows.find((f) => f.status === 'ACTIVE' && f.productCode === ratingForm.productCode);
    if (matching) {
      setSelectedFlowId(String(matching.flowId));
    } else {
      const anyActive = availableFlows.find((f) => f.status === 'ACTIVE');
      if (anyActive) {
        setSelectedFlowId(String(anyActive.flowId));
      }
    }
  }, [ratingForm.productCode, availableFlows]);

  const activeSub = submission || (submissions || []).find((s) => s.submsnId === Number(selectedSubId));

  const handleCalculateRate = async () => {
    setIsRating(true);
    setError(null);
    const exposure = parseNum(ratingForm.exposureValue, 10000000);
    const occLimit = parseNum(ratingForm.occurrenceLimit, 5000000);
    const aggLimit = parseNum(ratingForm.aggregateLimit, 5000000);
    const retention = parseNum(ratingForm.retentionAmount, 50000);
    const schedMod = parseNum(ratingForm.scheduleMod, 0.90);

    // 1. If BRMS Mode is enabled and a flow is selected, execute through BRMS engine
    if (ratingEngineMode === 'BRMS' && selectedFlowId) {
      const chosenFlow = availableFlows.find((f) => String(f.flowId) === String(selectedFlowId));
      const brmsFacts = {
        tenantId: Number(activeTenantId) || 1,
        productCode: ratingForm.productCode,
        planCode: chosenFlow?.planCode || `${ratingForm.productCode}_COMMERCIAL`,
        stateCode: ratingForm.stateCode,
        exposureValue: exposure,
        exposureUnits: exposure / 1000,
        occurrenceLimit: occLimit,
        aggregateLimit: aggLimit,
        retentionAmount: retention,
        scheduleMod: schedMod,
        classCode: ratingForm.classCode,
        territoryCode: ratingForm.territoryCode,
        fleetSize: 15,
        driversUnder25: 1,
        priorAccidents: 0,
        lossRatio: 0.25,
        telematicsScore: 88,
        cyberScore: 85,
        priorLossesCount: 0,
        effectiveDate: ratingForm.effectiveDate
      };

      try {
        const res = await fetch(`/api/brms/flows/${selectedFlowId}/execute`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Tenant-ID': String(activeTenantId || 1)
          },
          body: JSON.stringify({ inputFacts: brmsFacts })
        });

        if (res.ok) {
          const brmsData = await res.json();
          if (brmsData.success) {
            const ff = brmsData.finalFacts || {};
            const finalPrem = ff.finalAnnualPremium !== undefined
              ? Number(ff.finalAnnualPremium)
              : (ff.preliminaryPremium || ff.basePremium || 2500);
            const rawStatus = ff.ratingStatus || ff.status || 'RATED';
            const ratingStatus = (rawStatus.includes('REFERRAL') || rawStatus.includes('REVIEW')) ? 'REFERRAL' : 'RATED';
            const attachedForms = ff.attachedForm
              ? [ff.attachedForm]
              : (ff.attachedForms || [`${ratingForm.productCode}-2025-BASE`, 'BRMS-RULEFLOW-CERT']);

            const auditTrail = brmsData.auditTrail || [];
            const traceLines = [
              `1. [BRMS Orchestrator] Executed RuleFlow #${selectedFlowId} "${chosenFlow?.flowName || chosenFlow?.flowCode || selectedFlowId}" in ${brmsData.totalDurationMs}ms`,
              `2. [Correlation ID] ${brmsData.correlationId}`,
              ...auditTrail.map((step, idx) =>
                `${idx + 3}. [${step.nodeName || step.nodeId}] (${step.nodeType}) -> ${step.evaluationSummary || 'Completed'} (${((step.executionTimeNanos || 0) / 1000000).toFixed(2)}ms)`
              ),
              `${auditTrail.length + 3}. [Rating Result] Final Annual Premium: $${finalPrem.toLocaleString(undefined, { minimumFractionDigits: 2 })} | Status: ${ratingStatus}`
            ];

            setRateResult({
              ratingStatus,
              productCode: ratingForm.productCode,
              planCode: chosenFlow?.planCode || `${ratingForm.productCode}_COMMERCIAL`,
              resolvedFilingVersion: `BRMS Flow: ${chosenFlow?.flowCode || selectedFlowId}`,
              stateCode: ratingForm.stateCode,
              serffTrackingNumber: `BRMS-${ratingForm.stateCode}-${chosenFlow?.flowCode || selectedFlowId}`,
              exposureUnits: brmsFacts.exposureUnits,
              baseRate: ff.baseLossCost || ff.baseRate || 1.85,
              basePremium: ff.basePremium || finalPrem,
              territoryFactor: ff.fleetRelativityFactor || ff.riskFactor || 1.0,
              limitRelativityFactor: 1.0,
              deductibleFactor: 1.0,
              subtotalPremium: ff.preliminaryPremium || finalPrem,
              scheduleModifier: schedMod,
              finalAnnualPremium: finalPrem,
              minimumPremium: 2500,
              isBrms: true,
              brmsFlowName: chosenFlow?.flowName || chosenFlow?.flowCode,
              brmsCorrelationId: brmsData.correlationId,
              brmsDurationMs: brmsData.totalDurationMs,
              brmsStepsCount: auditTrail.length,
              underwritingReferrals: ratingStatus === 'REFERRAL'
                ? ['BRMS Underwriting Referral: Flagged for review by RuleFlow conditional branch.']
                : [],
              attachedForms,
              calculationTrace: traceLines
            });
            setIsRating(false);
            return;
          } else {
            setError(`BRMS RuleFlow Error: ${brmsData.errorMessage}`);
            setIsRating(false);
            return;
          }
        }
      } catch (err) {
        console.warn('BRMS execution call failed, falling back to SERFF engine:', err);
      }
    }

    // 2. Standard SERFF Engine Fallback
    const payload = {
      tenantId: Number(activeTenantId) || 1,
      productCode: ratingForm.productCode,
      stateCode: ratingForm.stateCode,
      effectiveDate: ratingForm.effectiveDate,
      businessType: 'NEW',
      exposureValue: exposure,
      classCode: ratingForm.classCode,
      territoryCode: ratingForm.territoryCode,
      occurrenceLimit: occLimit,
      aggregateLimit: aggLimit,
      retentionAmount: retention,
      scheduleMod: schedMod,
      riskAnswers: { priorLossesCount: 0 }
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      try {
        const res = await fetch('/rating-api/rate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (res.ok) {
          const data = await res.json();
          if (data && data.finalAnnualPremium !== undefined) {
            setRateResult(data);
            return;
          }
        }
      } catch (err) {
        console.warn('Live rating API unavailable or timed out, using SERFF formula fallback:', err);
      } finally {
        clearTimeout(timeoutId);
      }

      // Local fallback calculation aligned with SERFF state plans if service offline
      const exp = exposure / 1000;
      const baseLoss = ratingForm.productCode === 'MED_MAL' ? 2.45 : (ratingForm.productCode === 'DNO' ? 1.40 : 1.85);
      const base = exp * baseLoss;
      const terr = ratingForm.stateCode === 'CA' ? 1.25 : (ratingForm.stateCode === 'NY' ? 1.35 : (ratingForm.stateCode === 'TX' ? 1.10 : 1.15));
      const lim = occLimit >= 10000000 ? 2.20 : (occLimit >= 5000000 ? 1.80 : 1.35);
      const ded = retention >= 50000 ? 0.90 : 1.00;
      const sub = base * terr * lim * ded;
      const finalPrem = Math.round(sub * schedMod * 100) / 100;
      const serffNum = `${ratingForm.stateCode}-2025-0812-${ratingForm.productCode === 'MED_MAL' ? 'MM' : (ratingForm.productCode === 'DNO' ? 'DO' : 'EO')}`;

      setRateResult({
        ratingStatus: occLimit > 5000000 ? 'REFERRAL' : 'RATED',
        productCode: ratingForm.productCode,
        planCode: `${ratingForm.productCode}_COMMERCIAL`,
        resolvedFilingVersion: '2025.1',
        stateCode: ratingForm.stateCode,
        serffTrackingNumber: serffNum,
        exposureUnits: exp,
        baseRate: baseLoss,
        basePremium: base,
        territoryFactor: terr,
        limitRelativityFactor: lim,
        deductibleFactor: ded,
        subtotalPremium: Math.round(sub * 100) / 100,
        scheduleModifier: schedMod,
        finalAnnualPremium: finalPrem,
        minimumPremium: ratingForm.productCode === 'MED_MAL' ? 5000 : 2500,
        underwritingReferrals: occLimit > 5000000
          ? ['SENIOR_UW_REFERRAL: Occurrence limit exceeds standard $5M branch authority.']
          : [],
        attachedForms: [
          `${ratingForm.productCode}-2025-BASE (Approved Policy Jacket & Form)`,
          'CYBER-104-SEC (Security Breach & Regulatory Defense Endorsement)',
          `${ratingForm.stateCode}-NOTICE-60D (${ratingForm.stateCode} Cancellation/Nonrenewal Notice)`
        ],
        calculationTrace: [
          `1. [Filing Resolution] Product: ${ratingForm.productCode} | State: ${ratingForm.stateCode} | SERFF: ${serffNum}`,
          `2. [Exposure Units] Normalized: ${exp.toLocaleString()} exposure units`,
          `3. [Base Rate] Base Loss Cost: ${baseLoss.toFixed(2)}`,
          `4. [Relativities] Terr: ${terr.toFixed(2)} * Limit: ${lim.toFixed(2)} * Ded: ${ded.toFixed(2)}`,
          `5. [Schedule Mod] Capped Mod: ${schedMod} -> Final Annual Premium: $${finalPrem.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
        ]
      });
    } catch (err) {
      setError(`Rating calculation failed: ${err.message}`);
    } finally {
      setIsRating(false);
    }
  };

  const handleSaveQuote = async () => {
    if (!rateResult) return;
    setIsSaving(true);
    setError(null);
    try {
      const prem = `$${Number(rateResult.finalAnnualPremium).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
      const lim = `$${parseNum(ratingForm.occurrenceLimit, 5000000).toLocaleString()}`;
      const ret = `$${parseNum(ratingForm.retentionAmount, 50000).toLocaleString()}`;

      const saved = await apiFetch('/api/quotes', {
        method: 'POST',
        body: JSON.stringify({
          submsnId: Number(selectedSubId) || (submission ? Number(submission.submsnId) : 0),
          productCode: ratingForm.productCode,
          stateCode: ratingForm.stateCode,
          exposureVal: String(ratingForm.exposureValue),
          limitAmt: lim,
          retentionAmt: ret,
          scheduleMod: String(ratingForm.scheduleMod),
          premium: prem,
          serffTrackingNbr: rateResult.serffTrackingNumber || `${ratingForm.stateCode}-2025-BASE`,
          baseRate: String(rateResult.baseRate || 1.85),
          calcTrace: JSON.stringify(rateResult.calculationTrace || []),
          status: rateResult.ratingStatus === 'REFERRAL' ? 'Under Review' : 'Quoted'
        })
      });

      if (onQuoteSaved) {
        await onQuoteSaved(saved);
      }
      onClose();
    } catch (err) {
      setError(`Failed to save quote to database: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', pb: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
          <Calculator size={22} color="#0284c7" />
          <Box>
            <Typography variant="h6" sx={{ fontSize: '1.15rem', fontWeight: 700 }}>
              Live Rating &amp; Quote Calculation
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748b' }}>
              SERFF State Approval Rules &bull; HELIOS_RATING_DB Engine
            </Typography>
          </Box>
        </Box>
        <Chip label="Rating Engine v2025.1" size="small" color="primary" variant="outlined" sx={{ fontWeight: 600 }} />
      </DialogTitle>

      <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, py: 2.5 }}>
        {error && (
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {!submission && submissions.length > 0 && (
          <FormControl fullWidth size="small">
            <InputLabel>Link Quote to Submission</InputLabel>
            <Select
              label="Link Quote to Submission"
              value={selectedSubId}
              onChange={(e) => setSelectedSubId(e.target.value)}
            >
              {submissions.map((s) => (
                <MenuItem key={s.submsnId} value={s.submsnId}>
                  {s.submsnNbr} &mdash; {s.orgName} ({s.productType})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        {activeSub && (
          <Paper variant="outlined" sx={{ p: 1.75, backgroundColor: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                TARGET INSURED &bull; SUBMISSION
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 700 }}>
                {activeSub.orgName} ({activeSub.submsnNbr})
              </Typography>
            </Box>
            <Chip label={activeSub.status || 'Quoted'} size="small" color="primary" sx={{ fontWeight: 600 }} />
          </Paper>
        )}

        {/* Rating Engine Mode & RuleFlow Selection */}
        <Paper
          variant="outlined"
          sx={{
            p: 2,
            borderRadius: 2,
            background: ratingEngineMode === 'BRMS'
              ? 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)'
              : '#f8fafc',
            borderColor: ratingEngineMode === 'BRMS' ? '#86efac' : '#cbd5e1'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1, mb: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Workflow size={20} color={ratingEngineMode === 'BRMS' ? '#16a34a' : '#64748b'} />
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: ratingEngineMode === 'BRMS' ? '#14532d' : '#334155' }}>
                  Rating Orchestration Engine
                </Typography>
                <Typography variant="caption" sx={{ color: ratingEngineMode === 'BRMS' ? '#166534' : '#64748b' }}>
                  {ratingEngineMode === 'BRMS' ? 'FICO Blaze-style DAG Visualizer & Rule Flow Orchestration' : 'Traditional Actuarial SERFF Table Matrix Engine'}
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                size="small"
                variant={ratingEngineMode === 'BRMS' ? 'contained' : 'outlined'}
                color="success"
                onClick={() => setRatingEngineMode('BRMS')}
                startIcon={<Zap size={14} />}
                sx={{ textTransform: 'none', fontWeight: 700, fontSize: '0.8rem' }}
              >
                BRMS Rule Flow
              </Button>
              <Button
                size="small"
                variant={ratingEngineMode === 'SERFF' ? 'contained' : 'outlined'}
                color="inherit"
                onClick={() => setRatingEngineMode('SERFF')}
                sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.8rem' }}
              >
                Classic SERFF
              </Button>
            </Box>
          </Box>

          {ratingEngineMode === 'BRMS' && (
            <Box sx={{ mt: 1 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Active BRMS RuleFlow Graph</InputLabel>
                <Select
                  label="Active BRMS RuleFlow Graph"
                  value={selectedFlowId}
                  onChange={(e) => setSelectedFlowId(e.target.value)}
                  disabled={isLoadingFlows}
                >
                  {availableFlows.map((f) => (
                    <MenuItem key={f.flowId} value={String(f.flowId)}>
                      {f.flowName} ({f.flowCode}) &mdash; {f.productCode || 'ALL'} / {f.planCode || 'DEFAULT'} [{f.status}]
                    </MenuItem>
                  ))}
                  {availableFlows.length === 0 && (
                    <MenuItem value="" disabled>
                      No RuleFlows loaded
                    </MenuItem>
                  )}
                </Select>
              </FormControl>
              <Typography variant="caption" sx={{ color: '#166534', display: 'block', mt: 0.75 }}>
                ⚡ Auto-associated with rating plans, conditional switches, and MVEL coordinate decision tables.
              </Typography>
            </Box>
          )}
        </Paper>

        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#334155' }}>
          Rating Parameters &amp; Regulatory Inputs:
        </Typography>

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Product Line</InputLabel>
              <Select
                label="Product Line"
                value={ratingForm.productCode}
                onChange={(e) => setRatingForm({ ...ratingForm, productCode: e.target.value })}
              >
                <MenuItem value="TECH_EO">Technology Errors &amp; Omissions</MenuItem>
                <MenuItem value="COMMERCIAL_AUTO">Commercial Automobile &amp; Fleet</MenuItem>
                <MenuItem value="MED_MAL">Medical Malpractice</MenuItem>
                <MenuItem value="DNO">Directors &amp; Officers Liability</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <FormControl fullWidth size="small">
              <InputLabel>State Jurisdiction (SERFF)</InputLabel>
              <Select
                label="State Jurisdiction (SERFF)"
                value={ratingForm.stateCode}
                onChange={(e) => setRatingForm({ ...ratingForm, stateCode: e.target.value })}
              >
                <MenuItem value="CA">California (DOI Approved)</MenuItem>
                <MenuItem value="NY">New York (DFS Strict Schedule Cap)</MenuItem>
                <MenuItem value="TX">Texas (TDI File &amp; Use)</MenuItem>
                <MenuItem value="FL">Florida (OIR Standard)</MenuItem>
                <MenuItem value="DE">Delaware (Corporate Registry)</MenuItem>
                <MenuItem value="IL">Illinois (Nationwide Fallback)</MenuItem>
                <MenuItem value="ALL">Nationwide ISO Baseline</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <TextField
              size="small"
              fullWidth
              label="Exposure Basis (Revenue / Budget $)"
              value={ratingForm.exposureValue}
              onChange={(e) => setRatingForm({ ...ratingForm, exposureValue: e.target.value })}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Policy Limit (Occ / Agg)</InputLabel>
              <Select
                label="Policy Limit (Occ / Agg)"
                value={ratingForm.occurrenceLimit}
                onChange={(e) => setRatingForm({ ...ratingForm, occurrenceLimit: e.target.value, aggregateLimit: e.target.value })}
              >
                <MenuItem value="1000000">$1,000,000 / $1,000,000</MenuItem>
                <MenuItem value="2000000">$2,000,000 / $2,000,000</MenuItem>
                <MenuItem value="5000000">$5,000,000 / $5,000,000</MenuItem>
                <MenuItem value="10000000">$10,000,000 / $10,000,000 (Referral)</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Retention / Deductible</InputLabel>
              <Select
                label="Retention / Deductible"
                value={ratingForm.retentionAmount}
                onChange={(e) => setRatingForm({ ...ratingForm, retentionAmount: e.target.value })}
              >
                <MenuItem value="10000">$10,000</MenuItem>
                <MenuItem value="25000">$25,000 (Standard)</MenuItem>
                <MenuItem value="50000">$50,000 (10% Credit)</MenuItem>
                <MenuItem value="100000">$100,000 (18% Credit)</MenuItem>
                <MenuItem value="250000">$250,000 (25% Credit)</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <TextField
              size="small"
              fullWidth
              label="Schedule Modifier (e.g. 0.90 = -10%)"
              value={ratingForm.scheduleMod}
              onChange={(e) => setRatingForm({ ...ratingForm, scheduleMod: e.target.value })}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <TextField
              size="small"
              fullWidth
              label="Classification Code"
              value={ratingForm.classCode}
              onChange={(e) => setRatingForm({ ...ratingForm, classCode: e.target.value })}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <TextField
              size="small"
              fullWidth
              label="Territory Code"
              value={ratingForm.territoryCode}
              onChange={(e) => setRatingForm({ ...ratingForm, territoryCode: e.target.value })}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <TextField
              size="small"
              fullWidth
              type="date"
              label="Effective Date"
              InputLabelProps={{ shrink: true }}
              value={ratingForm.effectiveDate}
              onChange={(e) => setRatingForm({ ...ratingForm, effectiveDate: e.target.value })}
            />
          </Grid>
        </Grid>

        <Button
          variant="contained"
          color={ratingEngineMode === 'BRMS' ? 'success' : 'secondary'}
          fullWidth
          size="large"
          startIcon={isRating ? <CircularProgress size={18} color="inherit" /> : (ratingEngineMode === 'BRMS' ? <Zap size={18} /> : <Calculator size={18} />)}
          disabled={isRating}
          onClick={handleCalculateRate}
          sx={{ fontWeight: 700 }}
        >
          {isRating
            ? 'Invoking Rating Algorithm & RuleFlow...'
            : (ratingEngineMode === 'BRMS' ? 'Execute BRMS RuleFlow Graph' : 'Run Rating Calculation (SERFF Engine)')}
        </Button>

        {rateResult && (
          <Box sx={{ mt: 1 }}>
            <Paper variant="outlined" sx={{ p: 2.5, backgroundColor: '#f8fafc', borderLeft: rateResult.isBrms ? '4px solid #16a34a' : '4px solid #0284c7' }}>
              {rateResult.isBrms && (
                <Chip
                  icon={<Zap size={14} />}
                  label={`Orchestrated by BRMS RuleFlow Engine (${rateResult.brmsStepsCount || 0} Nodes Executed in ${rateResult.brmsDurationMs || 0} ms)`}
                  size="small"
                  color="success"
                  sx={{ fontWeight: 700, mb: 1.5 }}
                />
              )}
              <Grid container spacing={2} alignItems="center">
                <Grid size={{ xs: 12, sm: 7 }}>
                  <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, letterSpacing: '0.05em' }}>
                    CALCULATED ANNUAL PREMIUM
                  </Typography>
                  <Typography variant="h3" sx={{ fontWeight: 800, color: '#0f172a', mt: 0.5 }}>
                    ${Number(rateResult.finalAnnualPremium).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mt: 0.5 }}>
                    Base Loss Cost: ${rateResult.baseRate} &bull; State Min: ${Number(rateResult.minimumPremium || 2500).toLocaleString()} &bull; Schedule Mod: {rateResult.scheduleModifier}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 5 }} sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
                  <StatusPill status={rateResult.ratingStatus === 'RATED' ? 'Quoted' : 'Under Review'} />
                  <Typography variant="body2" sx={{ fontWeight: 700, color: rateResult.isBrms ? '#16a34a' : '#0284c7', mt: 0.5 }}>
                    {rateResult.isBrms ? `RULEFLOW: ${rateResult.planCode || rateResult.productCode}` : `SERFF: ${rateResult.serffTrackingNumber}`}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                    Filing Version: {rateResult.resolvedFilingVersion || '2025.1'}
                  </Typography>
                </Grid>
              </Grid>

              {rateResult.underwritingReferrals?.length > 0 && (
                <Alert severity="warning" sx={{ mt: 2, fontSize: '0.8rem' }}>
                  {rateResult.underwritingReferrals[0]}
                </Alert>
              )}

              <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #e2e8f0' }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: '#475569', display: 'block', mb: 0.5 }}>
                  Algorithm &amp; RuleFlow Execution Audit Trace:
                </Typography>
                <Box sx={{ backgroundColor: '#0f172a', color: '#38bdf8', p: 1.5, borderRadius: '6px', fontSize: '0.74rem', fontFamily: 'monospace' }}>
                  {(rateResult.calculationTrace || []).map((t, idx) => (
                    <div key={idx}>{t}</div>
                  ))}
                </Box>
              </Box>

              <Box sx={{ mt: 1.5 }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: '#475569', display: 'block', mb: 0.5 }}>
                  Mandatory Policy Forms &amp; Endorsements Attached:
                </Typography>
                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                  {(rateResult.attachedForms || []).map((f) => (
                    <Chip key={f} label={f} size="small" variant="outlined" sx={{ fontSize: '0.7rem' }} />
                  ))}
                </Box>
              </Box>
            </Paper>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={isSaving}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color="primary"
          disabled={!rateResult || isSaving}
          startIcon={isSaving ? <CircularProgress size={16} color="inherit" /> : <Calculator size={16} />}
          onClick={handleSaveQuote}
        >
          {isSaving ? 'Storing in SQL Server...' : rateResult ? `Save Quote (${Number(rateResult.finalAnnualPremium).toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}) to Database` : 'Run Rating Calculation First'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// --- Quote Trace & Form Detail Inspection Dialog ---
const QuoteDetailDialog = ({ quote, onClose }) => {
  if (!quote) return null;

  let traceLines = [];
  if (quote.calcTrace) {
    try {
      const parsed = JSON.parse(quote.calcTrace);
      if (Array.isArray(parsed)) traceLines = parsed;
    } catch {
      traceLines = [quote.calcTrace];
    }
  }

  return (
    <Dialog open={Boolean(quote)} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Calculator size={20} color="#0284c7" />
          <Typography variant="h6" fontWeight={700}>
            Quote Audit Record: {quote.quoteId}
          </Typography>
        </Box>
        <StatusPill status={quote.status} />
      </DialogTitle>
      <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Paper variant="outlined" sx={{ p: 2, backgroundColor: '#f8fafc' }}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 6 }}>
              <Typography variant="caption" color="textSecondary">FINAL ANNUAL PREMIUM</Typography>
              <Typography variant="h4" fontWeight={800} color="primary.main">{quote.premium}</Typography>
            </Grid>
            <Grid size={{ xs: 6 }} sx={{ textAlign: 'right' }}>
              <Typography variant="caption" color="textSecondary">GENERATED DATE</Typography>
              <Typography variant="body1" fontWeight={600}>{quote.generated}</Typography>
            </Grid>
            <Grid size={{ xs: 6 }}>
              <Typography variant="caption" color="textSecondary">PRODUCT LINE</Typography>
              <Typography variant="body2" fontWeight={600}>{quote.productCode || 'Technology E&O'}</Typography>
            </Grid>
            <Grid size={{ xs: 6 }}>
              <Typography variant="caption" color="textSecondary">SERFF TRACKING #</Typography>
              <Typography variant="body2" fontWeight={600}>{quote.serffTrackingNbr || 'SERFF-APPROVED'}</Typography>
            </Grid>
            <Grid size={{ xs: 6 }}>
              <Typography variant="caption" color="textSecondary">LIMIT / RETENTION</Typography>
              <Typography variant="body2" fontWeight={600}>{quote.limitAmt || '$5,000,000'} / {quote.retentionAmt || '$50,000'}</Typography>
            </Grid>
            <Grid size={{ xs: 6 }}>
              <Typography variant="caption" color="textSecondary">STATE / SCHEDULE MOD</Typography>
              <Typography variant="body2" fontWeight={600}>{quote.stateCode || 'CA'} &bull; {quote.scheduleMod || '1.00'}</Typography>
            </Grid>
          </Grid>
        </Paper>

        <Typography variant="subtitle2" fontWeight={700}>
          Calculation Trace (SERFF Rules Engine):
        </Typography>
        <Box sx={{ backgroundColor: '#0f172a', color: '#38bdf8', p: 1.5, borderRadius: '6px', fontSize: '0.74rem', fontFamily: 'monospace' }}>
          {traceLines.length > 0 ? (
            traceLines.map((t, idx) => <div key={idx}>{t}</div>)
          ) : (
            <div>Base loss cost applied against normalized exposure and territorial matrix factor.</div>
          )}
        </Box>

        <Typography variant="subtitle2" fontWeight={700}>
          Mandatory Attached Policy Forms:
        </Typography>
        <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
          <Chip label={`${quote.productCode || 'TECH_EO'}-2025-BASE (Standard Policy Jacket)`} size="small" variant="outlined" />
          <Chip label="CYBER-104-SEC (Security Breach Endorsement)" size="small" variant="outlined" />
          <Chip label={`${quote.stateCode || 'CA'}-NOTICE-60D (Cancellation Notice)`} size="small" variant="outlined" />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="contained" color="primary">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// --- 4. Quotes & Rating Management View ---
const QuotesView = ({ apiFetch, activeTenantId, activeRole, onNavigate }) => {
  const [quotes, setQuotes] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [productFilter, setProductFilter] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [openRateDialog, setOpenRateDialog] = useState(false);
  const [inspectingQuote, setInspectingQuote] = useState(null);
  const [flash, setFlash] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [qData, sData] = await Promise.all([
        apiFetch('/api/quotes'),
        apiFetch('/api/submissions')
      ]);
      setQuotes(Array.isArray(qData) ? qData : []);
      setSubmissions(Array.isArray(sData) ? sData : []);
    } catch (err) {
      setFlash({ type: 'error', text: `Failed to load quotes: ${err.message}` });
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    loadData();
  }, [loadData, activeTenantId]);

  const subMap = useMemo(() => {
    const map = {};
    submissions.forEach((s) => {
      map[s.submsnId] = s;
    });
    return map;
  }, [submissions]);

  const filteredQuotes = useMemo(() => {
    return quotes.filter((q) => {
      const sub = subMap[q.submsnId];
      const matchSearch =
        !searchQuery ||
        q.quoteId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.serffTrackingNbr?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sub?.orgName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sub?.submsnNbr?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchProduct = !productFilter || q.productCode === productFilter;
      const matchState = !stateFilter || q.stateCode === stateFilter;
      const matchStatus = !statusFilter || q.status === statusFilter;
      return matchSearch && matchProduct && matchState && matchStatus;
    });
  }, [quotes, subMap, searchQuery, productFilter, stateFilter, statusFilter]);

  const totalVolume = useMemo(() => {
    return quotes.reduce((acc, q) => {
      const num = parseFloat((q.premium || '').replace(/[^0-9.]/g, '')) || 0;
      return acc + num;
    }, 0);
  }, [quotes]);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontSize: '1.65rem', mb: 0.4 }}>
            Quotes &amp; Rating Management
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748b' }}>
            Live SERFF-approved rating calculations, state filing compliance, and issued quotes stored in SQL Server (<code>dbo.UW_QUOTE</code>)
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
          <Button variant="outlined" startIcon={<RefreshCw size={16} />} onClick={loadData}>
            Refresh
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<Calculator size={16} />}
            onClick={() => setOpenRateDialog(true)}
          >
            Rate &amp; Issue New Quote
          </Button>
        </Box>
      </Box>

      {flash && (
        <Alert severity={flash.type} onClose={() => setFlash(null)} sx={{ mb: 2 }}>
          {flash.text}
        </Alert>
      )}

      {/* Summary KPI Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card elevation={0} sx={{ borderLeft: '4px solid #013a12' }}>
            <CardContent sx={{ py: 2 }}>
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, letterSpacing: '0.05em' }}>
                TOTAL STORED QUOTES
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5 }}>
                {quotes.length}
              </Typography>
              <Typography variant="caption" sx={{ color: '#013a12', fontWeight: 600 }}>
                Across {submissions.length} Submissions
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card elevation={0} sx={{ borderLeft: '4px solid #0284c7' }}>
            <CardContent sx={{ py: 2 }}>
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, letterSpacing: '0.05em' }}>
                QUOTED PREMIUM VOLUME
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5, color: '#0284c7' }}>
                ${totalVolume.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748b' }}>
                Live SERFF Calculated
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card elevation={0} sx={{ borderLeft: '4px solid #16a34a' }}>
            <CardContent sx={{ py: 2 }}>
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, letterSpacing: '0.05em' }}>
                SERFF REGULATORY MATRIX
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 800, mt: 1, color: '#16a34a' }}>
                6 STATE PLANS
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748b' }}>
                CA, NY, TX, FL, DE, IL
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card elevation={0} sx={{ borderLeft: '4px solid #8b5cf6' }}>
            <CardContent sx={{ py: 2 }}>
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, letterSpacing: '0.05em' }}>
                RATING ENGINE STATUS
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 800, mt: 1, color: '#8b5cf6' }}>
                ACTIVE (PORT 8084)
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748b' }}>
                HELIOS_RATING_DB
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filter Toolbar */}
      <Card elevation={0} sx={{ mb: 3 }}>
        <CardContent sx={{ py: 2 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                size="small"
                fullWidth
                placeholder="Search Quote #, Insured, SERFF #..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 2.5 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Product</InputLabel>
                <Select
                  label="Product"
                  value={productFilter}
                  onChange={(e) => setProductFilter(e.target.value)}
                >
                  <MenuItem value="">All Products</MenuItem>
                  <MenuItem value="TECH_EO">Technology E&amp;O</MenuItem>
                  <MenuItem value="COMMERCIAL_AUTO">Commercial Automobile &amp; Fleet</MenuItem>
                  <MenuItem value="MED_MAL">Medical Malpractice</MenuItem>
                  <MenuItem value="DNO">Directors &amp; Officers</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 6, sm: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel>State</InputLabel>
                <Select
                  label="State"
                  value={stateFilter}
                  onChange={(e) => setStateFilter(e.target.value)}
                >
                  <MenuItem value="">All States</MenuItem>
                  <MenuItem value="CA">California</MenuItem>
                  <MenuItem value="NY">New York</MenuItem>
                  <MenuItem value="TX">Texas</MenuItem>
                  <MenuItem value="FL">Florida</MenuItem>
                  <MenuItem value="DE">Delaware</MenuItem>
                  <MenuItem value="IL">Illinois</MenuItem>
                  <MenuItem value="ALL">Nationwide</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 6, sm: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  label="Status"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <MenuItem value="">All Statuses</MenuItem>
                  <MenuItem value="Quoted">Quoted</MenuItem>
                  <MenuItem value="Accepted">Accepted</MenuItem>
                  <MenuItem value="Declined">Declined</MenuItem>
                  <MenuItem value="Pending">Pending</MenuItem>
                  <MenuItem value="Under Review">Under Review</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 6, sm: 1.5 }}>
              <Button
                variant="text"
                fullWidth
                onClick={() => {
                  setSearchQuery('');
                  setProductFilter('');
                  setStateFilter('');
                  setStatusFilter('');
                }}
              >
                Clear
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Quotes Table */}
      <Card elevation={0}>
        <TableContainer>
          <Table size="small">
            <TableHead sx={{ backgroundColor: '#f8fafc' }}>
              <TableRow>
                <TableCell sx={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b' }}>QUOTE NUMBER</TableCell>
                <TableCell sx={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b' }}>INSURED / SUBMISSION</TableCell>
                <TableCell sx={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b' }}>PRODUCT</TableCell>
                <TableCell sx={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b' }}>STATE</TableCell>
                <TableCell sx={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b' }}>SERFF TRACKING #</TableCell>
                <TableCell sx={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b' }}>LIMIT / RETENTION</TableCell>
                <TableCell sx={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b' }}>DATE</TableCell>
                <TableCell sx={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b' }}>PREMIUM</TableCell>
                <TableCell sx={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b' }}>STATUS</TableCell>
                <TableCell align="right" sx={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b' }}>ACTIONS</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredQuotes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} sx={{ textAlign: 'center', py: 4, color: '#94a3b8' }}>
                    {loading ? 'Loading quotes from database...' : 'No quotes match the selected filters.'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredQuotes.map((q) => {
                  const sub = subMap[q.submsnId];
                  return (
                    <TableRow key={q.quoteId} hover>
                      <TableCell sx={{ fontWeight: 700, color: 'primary.main' }}>{q.quoteId}</TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {sub ? sub.orgName : `Submission #${q.submsnId || 'N/A'}`}
                        </Typography>
                        {sub && (
                          <Typography variant="caption" sx={{ color: '#64748b' }}>
                            {sub.submsnNbr}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={q.productCode || (sub?.productType) || 'TECH_EO'}
                          size="small"
                          sx={{ fontSize: '0.7rem', height: 22 }}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={q.stateCode || 'CA'}
                          size="small"
                          variant="outlined"
                          sx={{ fontWeight: 700, fontSize: '0.7rem' }}
                        />
                      </TableCell>
                      <TableCell>
                        <code>{q.serffTrackingNbr || 'SERFF-2025-BASE'}</code>
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.8rem' }}>
                        {q.limitAmt || '$5,000,000'} / {q.retentionAmt || '$50,000'}
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.82rem' }}>{q.generated}</TableCell>
                      <TableCell sx={{ fontWeight: 800, color: 'primary.main', fontSize: '0.92rem' }}>
                        {q.premium}
                      </TableCell>
                      <TableCell>
                        <StatusPill status={q.status} />
                      </TableCell>
                      <TableCell align="right">
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => setInspectingQuote({ ...q, orgName: sub?.orgName, submsnNbr: sub?.submsnNbr })}
                        >
                          Trace
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Rating & Quote Creation Dialog */}
      <RatingQuoteDialog
        open={openRateDialog}
        onClose={() => setOpenRateDialog(false)}
        submissions={submissions}
        apiFetch={apiFetch}
        activeTenantId={activeTenantId}
        onQuoteSaved={(newQuote) => {
          setFlash({ type: 'success', text: `Quote ${newQuote.quoteId} (${newQuote.premium}) successfully saved to dbo.UW_QUOTE!` });
          loadData();
        }}
      />

      {/* Quote Trace Inspection Dialog */}
      <QuoteDetailDialog
        quote={inspectingQuote}
        onClose={() => setInspectingQuote(null)}
      />
    </Box>
  );
};

// ============================================================================
// 4.5. DOCUMENTS & FORMS MANAGER (Aspose.PDF Java Microservice Engine)
// Generates & manages Policy Dec Pages, Quote Proposals, and Binder Letters
// ============================================================================
const DocumentsManager = ({
  apiFetch,
  activeTenantId,
  entityType = null,
  entityId = null,
  entityNbr = '',
  defaultInsuredName = '',
  defaultProductType = 'Technology Errors & Omissions',
  defaultPremium = '$8,500',
  defaultLimit = '$2,000,000',
  defaultDeductible = '$25,000',
  defaultEffectiveDate = '2026-03-01',
  defaultExpirationDate = '2027-03-01',
  quotes = [],
  title = 'Documents & Forms'
}) => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [previewDoc, setPreviewDoc] = useState(null);
  const [openGenerateModal, setOpenGenerateModal] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [flash, setFlash] = useState(null);

  // Attach from Inbox state
  const [openAttachInboxModal, setOpenAttachInboxModal] = useState(false);
  const [inboxQueuedDocs, setInboxQueuedDocs] = useState([]);
  const [loadingInbox, setLoadingInbox] = useState(false);
  const [selectedInboxId, setSelectedInboxId] = useState('');
  const [attachType, setAttachType] = useState('APPLICATION');
  const [attachingInbox, setAttachingInbox] = useState(false);

  // Client Machine File Upload state
  const [openUploadModal, setOpenUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadDocType, setUploadDocType] = useState('APPLICATION');
  const [uploadDocTitle, setUploadDocTitle] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Generator form state
  const [genForm, setGenForm] = useState({
    docType: 'DEC_PAGE',
    entityType: entityType || 'POLICY',
    entityId: entityId || 101,
    entityNbr: entityNbr || 'POL-2026-00101',
    insuredName: defaultInsuredName || 'Insured Enterprise LLC',
    productType: defaultProductType || 'Technology Errors & Omissions',
    annualPremium: String(defaultPremium || '$8,500').replace(/[^0-9.]/g, '') || '8500',
    coverageLimit: String(defaultLimit || '$2,000,000').replace(/[^0-9.]/g, '') || '2000000',
    deductible: String(defaultDeductible || '$25,000').replace(/[^0-9.]/g, '') || '25000',
    effectiveDate: defaultEffectiveDate || '2026-03-01',
    expirationDate: defaultExpirationDate || '2027-03-01',
    selectedQuoteId: ''
  });

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    try {
      let url = `/document-api/documents?tenantId=${activeTenantId}`;
      if (entityType) url += `&entityType=${encodeURIComponent(entityType)}`;
      if (entityId) url += `&entityId=${encodeURIComponent(entityId)}`;
      if (entityNbr) url += `&entityNbr=${encodeURIComponent(entityNbr)}`;
      const data = await apiFetch(url);
      setDocuments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load documents:', err);
      setFlash({ type: 'error', text: `Failed to load documents: ${err.message}` });
    } finally {
      setLoading(false);
    }
  }, [apiFetch, activeTenantId, entityType, entityId, entityNbr]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  // Sync generator form whenever props change
  useEffect(() => {
    setGenForm((prev) => ({
      ...prev,
      entityType: entityType || prev.entityType || 'POLICY',
      entityId: entityId || prev.entityId || 101,
      entityNbr: entityNbr || prev.entityNbr || 'POL-2026-00101',
      insuredName: defaultInsuredName || prev.insuredName,
      productType: defaultProductType || prev.productType,
      annualPremium: String(defaultPremium || '$8,500').replace(/[^0-9.]/g, '') || '8500',
      coverageLimit: String(defaultLimit || '$2,000,000').replace(/[^0-9.]/g, '') || '2000000',
      deductible: String(defaultDeductible || '$25,000').replace(/[^0-9.]/g, '') || '25000',
      effectiveDate: defaultEffectiveDate || prev.effectiveDate,
      expirationDate: defaultExpirationDate || prev.expirationDate
    }));
  }, [entityType, entityId, entityNbr, defaultInsuredName, defaultProductType, defaultPremium, defaultLimit, defaultDeductible, defaultEffectiveDate, defaultExpirationDate]);

  const handleSelectQuoteForGen = (quoteId) => {
    const q = (quotes || []).find((item) => String(item.quoteId) === String(quoteId));
    if (q) {
      setGenForm((prev) => ({
        ...prev,
        selectedQuoteId: quoteId,
        docType: 'QUOTE_PROPOSAL',
        productType: q.productCode || prev.productType,
        annualPremium: String(q.premium || prev.annualPremium).replace(/[^0-9.]/g, ''),
        coverageLimit: String(q.limitAmt || prev.coverageLimit).replace(/[^0-9.]/g, '') || prev.coverageLimit,
        deductible: String(q.retentionAmt || prev.deductible).replace(/[^0-9.]/g, '') || prev.deductible
      }));
    } else {
      setGenForm((prev) => ({ ...prev, selectedQuoteId: '' }));
    }
  };

  const handleGenerate = async (e) => {
    if (e) e.preventDefault();
    setGenerating(true);
    try {
      const payload = {
        tenantId: Number(activeTenantId),
        entityType: genForm.entityType,
        entityId: Number(genForm.entityId),
        entityNbr: genForm.entityNbr,
        docType: genForm.docType,
        insuredName: genForm.insuredName,
        productType: genForm.productType,
        annualPremium: parseFloat(genForm.annualPremium) || 0,
        coverageLimit: parseFloat(genForm.coverageLimit) || 0,
        deductible: parseFloat(genForm.deductible) || 0,
        effectiveDate: genForm.effectiveDate,
        expirationDate: genForm.expirationDate
      };

      const result = await apiFetch('/document-api/documents/generate', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      setFlash({
        type: 'success',
        text: `Document #${result.documentId} ("${result.docTitle}") generated successfully via Aspose.PDF!`
      });
      setOpenGenerateModal(false);
      await loadDocuments();
      setPreviewDoc(result);
    } catch (err) {
      setFlash({ type: 'error', text: `Document generation failed: ${err.message}` });
    } finally {
      setGenerating(false);
    }
  };

  const handleOpenAttachInbox = async () => {
    setLoadingInbox(true);
    setOpenAttachInboxModal(true);
    try {
      const data = await apiFetch(`/document-api/documents/incoming?status=QUEUED&tenantId=${activeTenantId}`);
      setInboxQueuedDocs(Array.isArray(data) ? data : []);
      if (Array.isArray(data) && data.length > 0) {
        setSelectedInboxId(String(data[0].incomingId));
      } else {
        setSelectedInboxId('');
      }
    } catch (e) {
      console.error('Failed to load queued incoming documents:', e);
      setFlash({ type: 'error', text: `Failed to load inbox queued documents: ${e.message}` });
    } finally {
      setLoadingInbox(false);
    }
  };

  const handleConfirmAttachInbox = async () => {
    if (!selectedInboxId) return;
    setAttachingInbox(true);
    try {
      const chosenDoc = inboxQueuedDocs.find((d) => String(d.incomingId) === String(selectedInboxId));
      await apiFetch(`/document-api/documents/incoming/${selectedInboxId}/attach?tenantId=${activeTenantId}`, {
        method: 'POST',
        body: JSON.stringify({
          entityType: entityType || 'POLICY',
          entityId: Number(entityId),
          entityNbr: entityNbr,
          docType: attachType,
          docTitle: chosenDoc?.documentName || 'Attached Document',
          attachedBy: 'Underwriter'
        })
      });
      setFlash({
        type: 'success',
        text: `Incoming document "${chosenDoc?.documentName || selectedInboxId}" successfully attached to ${entityNbr || entityType}!`
      });
      setOpenAttachInboxModal(false);
      await loadDocuments();
    } catch (err) {
      setFlash({ type: 'error', text: `Failed to attach document from inbox: ${err.message}` });
    } finally {
      setAttachingInbox(false);
    }
  };

  const processChosenFile = (file) => {
    if (!file) return;
    setUploadFile(file);
    const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
    setUploadDocTitle(cleanName);
  };

  const handleFileSelected = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      processChosenFile(e.target.files[0]);
    }
  };

  const handlePerformUpload = async () => {
    if (!uploadFile) return;
    setUploading(true);
    try {
      const numericEntityId = parseInt(String(entityId || '0').replace(/\D/g, '') || '0', 10);
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('tenantId', String(activeTenantId));
      formData.append('entityType', entityType || 'POLICY');
      formData.append('entityId', String(numericEntityId));
      formData.append('entityNbr', entityNbr || String(entityId) || '');
      formData.append('docType', uploadDocType);
      formData.append('docTitle', (uploadDocTitle && uploadDocTitle.trim()) || uploadFile.name);
      formData.append('uploadedBy', 'Client / User');

      const result = await apiFetch('/document-api/documents/upload', {
        method: 'POST',
        body: formData
      });

      setFlash({
        type: 'success',
        text: `Document "${result.docTitle || uploadFile.name}" successfully uploaded from client machine and attached to ${entityNbr || entityType}!`
      });
      setOpenUploadModal(false);
      setUploadFile(null);
      setUploadDocTitle('');
      await loadDocuments();
      if (result && result.documentId) {
        setPreviewDoc(result);
      }
    } catch (err) {
      console.error('Document upload error:', err);
      setFlash({ type: 'error', text: `Document upload failed: ${err.message}` });
    } finally {
      setUploading(false);
    }
  };

  const filteredDocs = useMemo(() => {
    return documents.filter((d) => {
      const matchType = filterType === 'ALL' || d.docType === filterType;
      const matchSearch =
        !searchQuery ||
        d.docTitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.fileName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.entityNbr?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchType && matchSearch;
    });
  }, [documents, filterType, searchQuery]);

  const stats = useMemo(() => {
    const decCount = documents.filter((d) => d.docType === 'DEC_PAGE').length;
    const quoteCount = documents.filter((d) => d.docType === 'QUOTE_PROPOSAL' || d.docType === 'QUOTE').length;
    const binderCount = documents.filter((d) => d.docType === 'BINDER_LETTER' || d.docType === 'LETTER').length;
    const totalBytes = documents.reduce((sum, d) => sum + (d.fileSizeBytes || 0), 0);
    return { decCount, quoteCount, binderCount, totalBytes, totalDocs: documents.length };
  }, [documents]);

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(2) + ' MB';
  };

  const renderDocTypeChip = (type) => {
    switch (type) {
      case 'DEC_PAGE':
        return <Chip label="Policy Dec Page" size="small" sx={{ bgcolor: '#ecfdf5', color: '#047857', fontWeight: 700, fontSize: '0.72rem', border: '1px solid #a7f3d0' }} />;
      case 'QUOTE_PROPOSAL':
      case 'QUOTE':
        return <Chip label="Quote Proposal" size="small" sx={{ bgcolor: '#eff6ff', color: '#1d4ed8', fontWeight: 700, fontSize: '0.72rem', border: '1px solid #bfdbfe' }} />;
      case 'BINDER_LETTER':
      case 'LETTER':
        return <Chip label="Binder Letter" size="small" sx={{ bgcolor: '#fdf4ff', color: '#7e22ce', fontWeight: 700, fontSize: '0.72rem', border: '1px solid #f0abfc' }} />;
      case 'APPLICATION':
        return <Chip label="Application" size="small" sx={{ bgcolor: '#fef3c7', color: '#b45309', fontWeight: 700, fontSize: '0.72rem', border: '1px solid #fde68a' }} />;
      case 'LOSS_RUNS':
        return <Chip label="Loss Runs" size="small" sx={{ bgcolor: '#ffedd5', color: '#c2410c', fontWeight: 700, fontSize: '0.72rem', border: '1px solid #fed7aa' }} />;
      case 'FINANCIALS':
        return <Chip label="Financials" size="small" sx={{ bgcolor: '#ecfeff', color: '#0e7490', fontWeight: 700, fontSize: '0.72rem', border: '1px solid #a5f3fc' }} />;
      case 'SCHEDULE':
        return <Chip label="Schedule" size="small" sx={{ bgcolor: '#f1f5f9', color: '#334155', fontWeight: 700, fontSize: '0.72rem', border: '1px solid #cbd5e1' }} />;
      case 'ENDORSEMENT':
        return <Chip label="Endorsement" size="small" sx={{ bgcolor: '#fae8ff', color: '#86198f', fontWeight: 700, fontSize: '0.72rem', border: '1px solid #f5d0fe' }} />;
      case 'ATTACHMENT':
        return <Chip label="Attachment" size="small" sx={{ bgcolor: '#f3e8ff', color: '#6b21a8', fontWeight: 700, fontSize: '0.72rem', border: '1px solid #e9d5ff' }} />;
      case 'CORRESPONDENCE':
        return <Chip label="Correspondence" size="small" sx={{ bgcolor: '#f0fdf4', color: '#166534', fontWeight: 700, fontSize: '0.72rem', border: '1px solid #bbf7d0' }} />;
      case 'OTHER':
        return <Chip label="Uploaded Doc" size="small" sx={{ bgcolor: '#f1f5f9', color: '#475569', fontWeight: 700, fontSize: '0.72rem', border: '1px solid #cbd5e1' }} />;
      default:
        return <Chip label={type} size="small" sx={{ fontSize: '0.72rem' }} />;
    }
  };

  return (
    <Box>
      {flash && (
        <Alert severity={flash.type} onClose={() => setFlash(null)} sx={{ mb: 2 }}>
          {flash.text}
        </Alert>
      )}

      {/* Metrics Row */}
      <Grid container spacing={2} sx={{ mb: 2.5 }}>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Card elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 2 }}>
            <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
              <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 600 }}>Total Documents</Typography>
              <Typography variant="h5" sx={{ fontWeight: 700, color: 'primary.main', mt: 0.2 }}>
                {stats.totalDocs}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Card elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 2 }}>
            <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
              <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 600 }}>Declarations Schedules</Typography>
              <Typography variant="h5" sx={{ fontWeight: 700, color: '#059669', mt: 0.2 }}>
                {stats.decCount}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Card elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 2 }}>
            <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
              <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 600 }}>Quote Proposals</Typography>
              <Typography variant="h5" sx={{ fontWeight: 700, color: '#2563eb', mt: 0.2 }}>
                {stats.quoteCount}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Card elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 2 }}>
            <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
              <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 600 }}>Binder Letters</Typography>
              <Typography variant="h5" sx={{ fontWeight: 700, color: '#9333ea', mt: 0.2 }}>
                {stats.binderCount}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Main Documents Table Card */}
      <Card elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 2 }}>
        <CardContent sx={{ p: 2.5 }}>
          {/* Header & Controls */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1.5 }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Printer size={20} style={{ color: '#059669' }} />
                {title}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                Stored in Tenant DB <code>dbo.DOC_DOCUMENT</code> and managed via Aspose.PDF Engine
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Button
                variant="outlined"
                size="small"
                startIcon={<RefreshCw size={15} />}
                onClick={loadDocuments}
                disabled={loading}
              >
                Refresh
              </Button>
              {entityType && entityId && (
                <Button
                  variant="outlined"
                  size="small"
                  color="secondary"
                  startIcon={<Paperclip size={15} />}
                  onClick={handleOpenAttachInbox}
                  sx={{ fontWeight: 600 }}
                >
                  Attach from Inbox
                </Button>
              )}
              {entityType && entityId && (
                <Button
                  variant="outlined"
                  size="small"
                  color="primary"
                  startIcon={<Upload size={15} />}
                  onClick={() => {
                    setUploadFile(null);
                    setUploadDocTitle('');
                    setUploadDocType('APPLICATION');
                    setOpenUploadModal(true);
                  }}
                  sx={{ fontWeight: 600 }}
                >
                  Upload Document
                </Button>
              )}
              <Button
                variant="contained"
                size="small"
                startIcon={<Plus size={16} />}
                onClick={() => setOpenGenerateModal(true)}
                sx={{ fontWeight: 600 }}
              >
                Generate Document
              </Button>
            </Box>
          </Box>

          {/* Filter Bar */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, gap: 1.5, flexWrap: 'wrap' }}>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {[
                { id: 'ALL', label: `All (${documents.length})` },
                { id: 'DEC_PAGE', label: `Dec Pages (${stats.decCount})` },
                { id: 'QUOTE_PROPOSAL', label: `Quotes (${stats.quoteCount})` },
                { id: 'BINDER_LETTER', label: `Binder Letters (${stats.binderCount})` }
              ].map((pill) => (
                <Chip
                  key={pill.id}
                  label={pill.label}
                  size="small"
                  clickable
                  variant={filterType === pill.id ? 'filled' : 'outlined'}
                  color={filterType === pill.id ? 'primary' : 'default'}
                  onClick={() => setFilterType(pill.id)}
                  sx={{ fontWeight: 600, fontSize: '0.75rem' }}
                />
              ))}
            </Box>

            <TextField
              size="small"
              placeholder="Search documents or files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              sx={{ width: { xs: '100%', sm: 260 } }}
            />
          </Box>

          {/* Documents Table */}
          <TableContainer component={Paper} elevation={0} variant="outlined" sx={{ borderRadius: 1.5 }}>
            <Table size="small">
              <TableHead sx={{ backgroundColor: '#f8fafc' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, width: 70 }}>Doc ID</TableCell>
                  <TableCell sx={{ fontWeight: 700, width: 130 }}>Type</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Document Title &amp; Target File</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>File Name &amp; Size</TableCell>
                  <TableCell sx={{ fontWeight: 700, width: 60 }}>Pages</TableCell>
                  <TableCell sx={{ fontWeight: 700, width: 130 }}>Engine</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Date Issued</TableCell>
                  <TableCell sx={{ fontWeight: 700, width: 80 }}>Status</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, width: 140 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} sx={{ textAlign: 'center', py: 4 }}>
                      <CircularProgress size={28} />
                      <Typography variant="body2" sx={{ mt: 1, color: '#64748b' }}>Loading documents from storage...</Typography>
                    </TableCell>
                  </TableRow>
                ) : filteredDocs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} sx={{ textAlign: 'center', py: 5, color: '#94a3b8' }}>
                      <Printer size={32} style={{ opacity: 0.3, marginBottom: 8 }} />
                      <Typography variant="body2" fontWeight={600} color="textSecondary">
                        No documents found {entityNbr ? `for ${entityNbr}` : ''}
                      </Typography>
                      <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 0.5 }}>
                        Click &quot;Generate Document&quot; above to create a Policy Dec Page, Quote Proposal, or Binder Letter using Aspose.PDF.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDocs.map((doc) => (
                    <TableRow key={doc.documentId} hover>
                      <TableCell sx={{ fontWeight: 700, color: 'primary.main' }}>
                        #{doc.documentId}
                      </TableCell>
                      <TableCell>
                        {renderDocTypeChip(doc.docType)}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e293b' }}>
                          {doc.docTitle}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#64748b' }}>
                          {doc.entityType}: <strong>{doc.entityNbr || `ID #${doc.entityId}`}</strong>
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <code style={{ fontSize: '0.75rem', color: '#0f172a' }}>{doc.fileName}</code>
                        <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                          {formatFileSize(doc.fileSizeBytes)}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600, textAlign: 'center' }}>
                        {doc.pageCount || 1}
                      </TableCell>
                      <TableCell>
                        {doc.status === 'ATTACHED' || (doc.generatedBy && doc.generatedBy !== 'DOCGEN_SERVICE' && doc.generatedBy !== 'ASPOSE_ENGINE') ? (
                          <Chip
                            label={doc.generatedBy || 'Inbox Attachment'}
                            size="small"
                            sx={{ fontSize: '0.68rem', height: 20, bgcolor: '#e0f2fe', color: '#0369a1', fontWeight: 600 }}
                          />
                        ) : (
                          <Chip
                            label="Aspose.PDF 24.12"
                            size="small"
                            variant="outlined"
                            sx={{ fontSize: '0.68rem', height: 20, bgcolor: '#f1f5f9', fontWeight: 600 }}
                          />
                        )}
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.8rem', color: '#475569' }}>
                        {doc.createdDt ? String(doc.createdDt).substring(0, 16) : 'Just now'}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={doc.status || 'ISSUED'}
                          size="small"
                          sx={{
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            bgcolor: '#dcfce7',
                            color: '#15803d',
                            height: 22
                          }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<Eye size={13} />}
                            onClick={() => setPreviewDoc(doc)}
                            sx={{ minWidth: 70, py: 0.4 }}
                          >
                            View
                          </Button>
                          <IconButton
                            size="small"
                            color="primary"
                            title="Download PDF"
                            onClick={() => {
                              window.open(`/document-api/documents/${doc.documentId}/download?tenantId=${activeTenantId}`, '_blank');
                            }}
                          >
                            <Download size={15} />
                          </IconButton>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* GENERATE DOCUMENT MODAL DIALOG */}
      <Dialog
        open={openGenerateModal}
        onClose={() => !generating && setOpenGenerateModal(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ pb: 1, borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 1 }}>
          <Printer size={20} style={{ color: '#059669' }} />
          Generate Insurance Document (Aspose.PDF Engine)
        </DialogTitle>
        <DialogContent sx={{ pt: 2.5 }}>
          {/* Engine Banner */}
          <Alert severity="info" sx={{ mb: 2.5, fontSize: '0.82rem' }}>
            Powered by <strong>Aspose.PDF for Java v24.12</strong> (Evaluation Engine). Generates dynamic high-fidelity corporate documents with native typography, table grids, calculations, and regulatory jackets.
          </Alert>

          {/* Autofill from Quote (if quotes available) */}
          {(quotes || []).length > 0 && (
            <Card elevation={0} sx={{ mb: 2.5, bgcolor: '#f8fafc', border: '1px dashed #cbd5e1' }}>
              <CardContent sx={{ py: 1.5, px: 2 }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: '#334155', display: 'block', mb: 1 }}>
                  Optional: Autofill Parameters from Existing Approved Quote
                </Typography>
                <Grid container spacing={2} alignItems="center">
                  <Grid size={{ xs: 12, sm: 8 }}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Select Existing Quote</InputLabel>
                      <Select
                        label="Select Existing Quote"
                        value={genForm.selectedQuoteId}
                        onChange={(e) => handleSelectQuoteForGen(e.target.value)}
                      >
                        <MenuItem value="">-- Manual Document Parameters --</MenuItem>
                        {(quotes || []).map((q) => (
                          <MenuItem key={q.quoteId} value={q.quoteId}>
                            {q.quoteId} — {q.productCode || 'TECH_EO'} | State: {q.stateCode || 'CA'} | Premium: {q.premium}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <Typography variant="caption" color="textSecondary">
                      Selecting a quote automatically configures a Quote Proposal with SERFF filing breakdown.
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          )}

          <Grid container spacing={2}>
            {/* Document Type */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Document Type</InputLabel>
                <Select
                  label="Document Type"
                  value={genForm.docType}
                  onChange={(e) => setGenForm({ ...genForm, docType: e.target.value })}
                >
                  <MenuItem value="DEC_PAGE">Policy Declarations Schedule (DEC_PAGE)</MenuItem>
                  <MenuItem value="QUOTE_PROPOSAL">Underwriting Quote Proposal (QUOTE_PROPOSAL)</MenuItem>
                  <MenuItem value="BINDER_LETTER">Insurance Coverage Binder Confirmation (BINDER_LETTER)</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Target File / Entity Reference */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                size="small"
                label="Target File / Policy / Submission Number"
                value={genForm.entityNbr}
                onChange={(e) => setGenForm({ ...genForm, entityNbr: e.target.value })}
                required
              />
            </Grid>

            {/* Insured Name */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                size="small"
                label="Insured Organization / Name"
                value={genForm.insuredName}
                onChange={(e) => setGenForm({ ...genForm, insuredName: e.target.value })}
                required
              />
            </Grid>

            {/* Product Type */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                size="small"
                label="Product Line / Coverage"
                value={genForm.productType}
                onChange={(e) => setGenForm({ ...genForm, productType: e.target.value })}
                required
              />
            </Grid>

            {/* Occurrence Limit */}
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth
                size="small"
                label="Occurrence / Aggregate Limit ($)"
                type="number"
                value={genForm.coverageLimit}
                onChange={(e) => setGenForm({ ...genForm, coverageLimit: e.target.value })}
                required
              />
            </Grid>

            {/* Deductible / Retention */}
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth
                size="small"
                label="Retention / Deductible ($)"
                type="number"
                value={genForm.deductible}
                onChange={(e) => setGenForm({ ...genForm, deductible: e.target.value })}
                required
              />
            </Grid>

            {/* Annual Premium */}
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth
                size="small"
                label="Annual Premium ($)"
                type="number"
                value={genForm.annualPremium}
                onChange={(e) => setGenForm({ ...genForm, annualPremium: e.target.value })}
                required
              />
            </Grid>

            {/* Effective Date */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                size="small"
                label="Effective Date"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={genForm.effectiveDate}
                onChange={(e) => setGenForm({ ...genForm, effectiveDate: e.target.value })}
                required
              />
            </Grid>

            {/* Expiration Date */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                size="small"
                label="Expiration Date"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={genForm.expirationDate}
                onChange={(e) => setGenForm({ ...genForm, expirationDate: e.target.value })}
                required
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #e2e8f0' }}>
          <Button onClick={() => setOpenGenerateModal(false)} disabled={generating}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleGenerate}
            disabled={generating || !genForm.entityNbr || !genForm.insuredName}
            startIcon={generating ? <CircularProgress size={16} color="inherit" /> : <Printer size={16} />}
            sx={{ fontWeight: 600 }}
          >
            {generating ? 'Generating PDF with Aspose...' : 'Generate & Issue PDF'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ATTACH FROM INBOX MODAL DIALOG */}
      <Dialog
        open={openAttachInboxModal}
        onClose={() => !attachingInbox && setOpenAttachInboxModal(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ pb: 1, borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 1 }}>
          <Paperclip size={20} style={{ color: '#0284c7' }} />
          Attach Document from Intake Inbox Queue
        </DialogTitle>
        <DialogContent sx={{ pt: 2.5 }}>
          <Alert severity="info" sx={{ mb: 2.5, fontSize: '0.82rem' }}>
            Associate an unattached incoming document dropped in <code>C:\helios-storage\documents\tenant_{activeTenantId}\inbox\</code> directly to this {entityType} (<strong>{entityNbr}</strong>).
          </Alert>

          {loadingInbox ? (
            <Box sx={{ textAlign: 'center', py: 3 }}>
              <CircularProgress size={24} />
              <Typography variant="body2" sx={{ mt: 1, color: '#64748b' }}>Scanning inbox queue...</Typography>
            </Box>
          ) : inboxQueuedDocs.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4, color: '#64748b' }}>
              <Inbox size={32} style={{ opacity: 0.4, marginBottom: 8 }} />
              <Typography variant="body1" sx={{ fontWeight: 600 }}>No unattached queued documents</Typography>
              <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
                Drop PDF or document files into <code>tenant_{activeTenantId}\inbox\</code> to ingest new files.
              </Typography>
            </Box>
          ) : (
            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              <Grid size={{ xs: 12 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Select Queued Document</InputLabel>
                  <Select
                    value={selectedInboxId}
                    label="Select Queued Document"
                    onChange={(e) => setSelectedInboxId(e.target.value)}
                  >
                    {inboxQueuedDocs.map((doc) => (
                      <MenuItem key={doc.incomingId} value={String(doc.incomingId)}>
                        #{doc.incomingId} — {doc.documentName} ({doc.fileName}) {doc.groupName ? `[${doc.groupName}]` : ''}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid size={{ xs: 12 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Document Classification / Type</InputLabel>
                  <Select
                    value={attachType}
                    label="Document Classification / Type"
                    onChange={(e) => setAttachType(e.target.value)}
                  >
                    <MenuItem value="APPLICATION">Commercial Insurance Application (ACORD)</MenuItem>
                    <MenuItem value="LOSS_RUNS">Historical Loss Runs &amp; Claim Experience</MenuItem>
                    <MenuItem value="FINANCIALS">Audited Financial Statements</MenuItem>
                    <MenuItem value="SCHEDULE">Exposure / Rating Schedule</MenuItem>
                    <MenuItem value="ENDORSEMENT">Policy Endorsement / Change Request</MenuItem>
                    <MenuItem value="ATTACHMENT">General Supporting Attachment</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 1.5, borderTop: '1px solid #e2e8f0' }}>
          <Button onClick={() => setOpenAttachInboxModal(false)} disabled={attachingInbox}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleConfirmAttachInbox}
            disabled={attachingInbox || !selectedInboxId || inboxQueuedDocs.length === 0}
            startIcon={attachingInbox ? <CircularProgress size={16} color="inherit" /> : <Paperclip size={16} />}
          >
            {attachingInbox ? 'Attaching...' : 'Attach to ' + (entityNbr || entityType)}
          </Button>
        </DialogActions>
      </Dialog>

      {/* CLIENT MACHINE FILE UPLOAD MODAL DIALOG */}
      <Dialog
        open={openUploadModal}
        onClose={() => !uploading && setOpenUploadModal(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ pb: 1, borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 1 }}>
          <Upload size={20} style={{ color: '#059669' }} />
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
              Upload Document from Client Machine
            </Typography>
            <Typography variant="caption" color="textSecondary">
              Browse local files on your computer and attach to {entityType || 'Record'} <strong>{entityNbr || `#${entityId}`}</strong>
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 2.5 }}>
          <Alert severity="info" sx={{ mb: 2, fontSize: '0.82rem' }}>
            Select a document from your computer (e.g. ACORD application, loss runs, financial statements, endorsements). It will be saved into the secure document repository and linked to <strong>{entityNbr || entityType}</strong>.
          </Alert>

          {/* Hidden File Input for Native File Browser */}
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.txt,.csv"
            onChange={handleFileSelected}
          />

          {/* Drag & Drop / File Browser Area */}
          <Box
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                processChosenFile(e.dataTransfer.files[0]);
              }
            }}
            sx={{
              border: uploadFile ? '2px solid #10b981' : '2px dashed #94a3b8',
              borderRadius: 2,
              p: 3,
              textAlign: 'center',
              backgroundColor: uploadFile ? '#f0fdf4' : '#f8fafc',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              '&:hover': {
                borderColor: '#10b981',
                backgroundColor: '#f0fdf4'
              },
              mb: 2.5
            }}
          >
            {uploadFile ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                <FileCheck size={40} style={{ color: '#059669' }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0f172a' }}>
                  {uploadFile.name}
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748b' }}>
                  {formatFileSize(uploadFile.size)} • {uploadFile.type || 'Document'}
                </Typography>
                <Button
                  size="small"
                  variant="outlined"
                  color="primary"
                  sx={{ mt: 1, textTransform: 'none', fontSize: '0.75rem' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                >
                  Change File...
                </Button>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                <Upload size={38} style={{ color: '#64748b' }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#334155' }}>
                  Click to browse client computer files
                </Typography>
                <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                  or drag and drop a file here (PDF, DOCX, XLSX, Images, etc.)
                </Typography>
              </Box>
            )}
          </Box>

          <Grid container spacing={2}>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                size="small"
                label="Document Title / Display Name"
                value={uploadDocTitle}
                onChange={(e) => setUploadDocTitle(e.target.value)}
                placeholder="e.g. Commercial Lines ACORD Application 2026"
                helperText="Name displayed in the documents repository table"
              />
            </Grid>

            <Grid size={{ xs: 12 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Document Classification / Type</InputLabel>
                <Select
                  value={uploadDocType}
                  label="Document Classification / Type"
                  onChange={(e) => setUploadDocType(e.target.value)}
                >
                  <MenuItem value="APPLICATION">Commercial Insurance Application (ACORD)</MenuItem>
                  <MenuItem value="LOSS_RUNS">Historical Loss Runs &amp; Claim Experience</MenuItem>
                  <MenuItem value="FINANCIALS">Audited Financial Statements</MenuItem>
                  <MenuItem value="SCHEDULE">Exposure / Rating Schedule</MenuItem>
                  <MenuItem value="ENDORSEMENT">Policy Endorsement / Change Request</MenuItem>
                  <MenuItem value="DEC_PAGE">Policy Declarations Schedule</MenuItem>
                  <MenuItem value="QUOTE_PROPOSAL">Quote Proposal</MenuItem>
                  <MenuItem value="BINDER_LETTER">Binder Confirmation Letter</MenuItem>
                  <MenuItem value="CORRESPONDENCE">Client / Broker Correspondence</MenuItem>
                  <MenuItem value="ATTACHMENT">General Supporting Attachment</MenuItem>
                  <MenuItem value="OTHER">Other / Miscellaneous</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 1.5, borderTop: '1px solid #e2e8f0' }}>
          <Button onClick={() => setOpenUploadModal(false)} disabled={uploading}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handlePerformUpload}
            disabled={uploading || !uploadFile}
            startIcon={uploading ? <CircularProgress size={16} color="inherit" /> : <Upload size={16} />}
          >
            {uploading ? 'Uploading...' : 'Upload & Attach'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* PDF PREVIEW MODAL DIALOG */}
      <Dialog
        open={Boolean(previewDoc)}
        onClose={() => setPreviewDoc(null)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle sx={{ pb: 1, borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FileText size={20} style={{ color: '#059669' }} />
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                {previewDoc?.docTitle || 'Document Preview'}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                File: <code>{previewDoc?.fileName}</code> • Size: {formatFileSize(previewDoc?.fileSizeBytes)} • Engine: Aspose.PDF
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              size="small"
              variant="outlined"
              startIcon={<ExternalLink size={14} />}
              onClick={() => {
                window.open(`/document-api/documents/${previewDoc?.documentId}/preview?tenantId=${activeTenantId}`, '_blank');
              }}
            >
              Open in Tab
            </Button>
            <Button
              size="small"
              variant="contained"
              startIcon={<Download size={14} />}
              onClick={() => {
                window.open(`/document-api/documents/${previewDoc?.documentId}/download?tenantId=${activeTenantId}`, '_blank');
              }}
            >
              Download PDF
            </Button>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: 0, bgcolor: '#334155' }}>
          {previewDoc && (
            <Box sx={{ width: '100%', height: '700px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <iframe
                src={`/document-api/documents/${previewDoc.documentId}/preview?tenantId=${activeTenantId}#toolbar=1`}
                title={previewDoc.docTitle}
                width="100%"
                height="100%"
                style={{ border: 'none' }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 1.5, borderTop: '1px solid #e2e8f0' }}>
          <Button onClick={() => setPreviewDoc(null)} variant="outlined">
            Close Preview
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// ============================================================================
// 4.6. INCOMING DOCUMENTS INBOX & PROCESSING WORKFLOW
// Manages unattached inbox documents dropped in C:\helios-storage\documents\<tenant>\inbox
// Preserves folder groupings, queues files, attaches to submissions/policies,
// and creates new organizations and submissions on intake.
// ============================================================================
const IncomingDocumentsView = ({ apiFetch, activeTenantId, activeRole, onNavigate }) => {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [flash, setFlash] = useState(null);
  const [selectedDocId, setSelectedDocId] = useState(null);

  // Modals state
  const [previewDoc, setPreviewDoc] = useState(null);
  const [attachDoc, setAttachDoc] = useState(null);
  const [createSubDoc, setCreateSubDoc] = useState(null);

  // Attach modal state
  const [attachEntityType, setAttachEntityType] = useState('SUBMISSION');
  const [submissionsList, setSubmissionsList] = useState([]);
  const [policiesList, setPoliciesList] = useState([]);
  const [selectedEntityId, setSelectedEntityId] = useState('');
  const [attachClassification, setAttachClassification] = useState('APPLICATION');
  const [attachCustomTitle, setAttachCustomTitle] = useState('');
  const [loadingEntities, setLoadingEntities] = useState(false);
  const [submittingAttach, setSubmittingAttach] = useState(false);

  // Create submission & org modal state
  const [createForm, setCreateForm] = useState({
    orgName: '',
    underwriter: 'Michael Chang',
    productType: 'Technology Errors & Omissions',
    effectiveDate: new Date().toISOString().substring(0, 10),
    expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10),
    retroactiveDate: new Date().toISOString().substring(0, 10),
    limitAmount: '$1,000,000',
    retentionAmount: '$10,000',
    docType: 'APPLICATION',
    docTitle: ''
  });
  const [submittingCreate, setSubmittingCreate] = useState(false);
  const [createSuccessResult, setCreateSuccessResult] = useState(null);

  const loadIncomingDocs = useCallback(async () => {
    setLoading(true);
    try {
      let url = `/document-api/documents/incoming?tenantId=${activeTenantId}`;
      if (filterStatus !== 'ALL') {
        url += `&status=${filterStatus}`;
      }
      const data = await apiFetch(url);
      setDocs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load incoming documents:', err);
      setFlash({ type: 'error', text: `Failed to load incoming documents: ${err.message}` });
    } finally {
      setLoading(false);
    }
  }, [apiFetch, activeTenantId, filterStatus]);

  useEffect(() => {
    loadIncomingDocs();
  }, [loadIncomingDocs]);

  const handleScanInbox = async () => {
    setScanning(true);
    try {
      const res = await apiFetch(`/document-api/documents/incoming/scan?tenantId=${activeTenantId}`, {
        method: 'POST'
      });
      const count = res?.processedCount || 0;
      setFlash({
        type: 'success',
        text: `Inbox scan complete! ${count} new incoming document(s) ingested into queue.`
      });
      await loadIncomingDocs();
    } catch (err) {
      console.error('Error scanning inbox:', err);
      setFlash({ type: 'error', text: `Inbox scan failed: ${err.message}` });
    } finally {
      setScanning(false);
    }
  };

  const handleDiscard = async (incomingId, docName) => {
    try {
      await apiFetch(`/document-api/documents/incoming/${incomingId}?tenantId=${activeTenantId}`, {
        method: 'DELETE'
      });
      setFlash({ type: 'info', text: `Incoming document #${incomingId} ("${docName}") marked as discarded.` });
      if (selectedDocId === incomingId) {
        setSelectedDocId(null);
      }
      await loadIncomingDocs();
    } catch (err) {
      setFlash({ type: 'error', text: `Failed to discard document: ${err.message}` });
    }
  };

  // Open Attach Modal and pre-load entities
  const handleOpenAttachModal = async (doc) => {
    setAttachDoc(doc);
    setAttachCustomTitle(doc.documentName || doc.fileName);
    setAttachClassification(
      doc.documentName?.toLowerCase().includes('loss') ? 'LOSS_RUNS' : 'APPLICATION'
    );
    setLoadingEntities(true);
    setSelectedEntityId('');
    try {
      const [subs, pols] = await Promise.all([
        apiFetch('/api/submissions').catch(() => []),
        apiFetch('/api/policies').catch(() => [])
      ]);
      const validSubs = Array.isArray(subs) ? subs : [];
      const validPols = Array.isArray(pols) ? pols : [];
      setSubmissionsList(validSubs);
      setPoliciesList(validPols);
      if (attachEntityType === 'SUBMISSION' && validSubs.length > 0) {
        setSelectedEntityId(String(validSubs[0].submsnId));
      } else if (validPols.length > 0) {
        setSelectedEntityId(String(validPols[0].policyId || validPols[0].id));
      }
    } catch (e) {
      console.error('Failed to load submissions/policies for attaching:', e);
    } finally {
      setLoadingEntities(false);
    }
  };

  const handleConfirmAttach = async () => {
    if (!attachDoc || !selectedEntityId) return;
    setSubmittingAttach(true);
    try {
      let entityNbr = '';
      if (attachEntityType === 'SUBMISSION') {
        const found = submissionsList.find((s) => String(s.submsnId) === String(selectedEntityId));
        entityNbr = found ? found.submsnNbr : `SUB-${selectedEntityId}`;
      } else {
        const found = policiesList.find((p) => String(p.policyId || p.id) === String(selectedEntityId));
        entityNbr = found ? (found.id || found.policyNbr) : `POL-${selectedEntityId}`;
      }

      await apiFetch(`/document-api/documents/incoming/${attachDoc.incomingId}/attach?tenantId=${activeTenantId}`, {
        method: 'POST',
        body: JSON.stringify({
          entityType: attachEntityType,
          entityId: Number(selectedEntityId),
          entityNbr: entityNbr,
          docType: attachClassification,
          docTitle: attachCustomTitle || attachDoc.documentName,
          attachedBy: activeRole?.roleName || 'Intake Underwriter'
        })
      });

      setFlash({
        type: 'success',
        text: `Document #${attachDoc.incomingId} successfully attached to ${attachEntityType} ${entityNbr}!`
      });
      setSelectedDocId(null);
      setAttachDoc(null);
      await loadIncomingDocs();
    } catch (err) {
      setFlash({ type: 'error', text: `Failed to attach document: ${err.message}` });
    } finally {
      setSubmittingAttach(false);
    }
  };

  // Open Create Submission Modal
  const handleOpenCreateSubModal = (doc) => {
    setCreateSubDoc(doc);
    setCreateSuccessResult(null);
    let autoOrg = doc.groupName ? doc.groupName.replace(/_/g, ' ') : doc.documentName.replace(/_/g, ' ');
    autoOrg = autoOrg.replace(/batch|acord|app|schedule/gi, '').trim();
    if (!autoOrg) autoOrg = 'New Applicant Group';

    setCreateForm({
      orgName: autoOrg,
      underwriter: 'Michael Chang',
      productType: 'Technology Errors & Omissions',
      effectiveDate: new Date().toISOString().substring(0, 10),
      expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10),
      retroactiveDate: new Date().toISOString().substring(0, 10),
      limitAmount: '$1,000,000',
      retentionAmount: '$10,000',
      docType: 'APPLICATION',
      docTitle: `${autoOrg} — Intake Application`
    });
  };

  const handleConfirmCreateSubmission = async (e) => {
    if (e) e.preventDefault();
    if (!createSubDoc) return;
    setSubmittingCreate(true);
    try {
      const res = await apiFetch(`/document-api/documents/incoming/${createSubDoc.incomingId}/create-submission?tenantId=${activeTenantId}`, {
        method: 'POST',
        body: JSON.stringify({
          orgName: createForm.orgName,
          underwriter: createForm.underwriter,
          productType: createForm.productType,
          effectiveDate: createForm.effectiveDate,
          expirationDate: createForm.expirationDate,
          retroactiveDate: createForm.retroactiveDate,
          limitAmount: createForm.limitAmount,
          retentionAmount: createForm.retentionAmount,
          docType: createForm.docType,
          docTitle: createForm.docTitle,
          attachedBy: createForm.underwriter
        })
      });

      setCreateSuccessResult(res);
      setFlash({
        type: 'success',
        text: `New Organization "${res.orgName}" and Submission ${res.submissionNbr} created successfully with document attached!`
      });
      setSelectedDocId(null);
      await loadIncomingDocs();
    } catch (err) {
      setFlash({ type: 'error', text: `Failed to create submission from document: ${err.message}` });
    } finally {
      setSubmittingCreate(false);
    }
  };

  const filteredDocs = useMemo(() => {
    return docs.filter((d) => {
      // When a document is attached to a file, do not display it in the table
      if (d.status === 'ATTACHED' || d.attachedEntityId || d.attachedEntityType) {
        return false;
      }
      if (filterStatus === 'DISCARDED' && d.status !== 'DISCARDED') return false;
      if (filterStatus === 'QUEUED' && d.status !== 'QUEUED') return false;

      const matchSearch =
        !searchQuery ||
        d.documentName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.fileName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.groupName?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchSearch;
    });
  }, [docs, filterStatus, searchQuery]);

  const selectedDoc = useMemo(() => {
    return filteredDocs.find((d) => d.incomingId === selectedDocId) || null;
  }, [filteredDocs, selectedDocId]);

  const stats = useMemo(() => {
    const total = docs.length;
    const queued = docs.filter((d) => d.status === 'QUEUED' && !d.attachedEntityId && !d.attachedEntityType).length;
    const attached = docs.filter((d) => d.status === 'ATTACHED' || d.attachedEntityId || d.attachedEntityType).length;
    const discarded = docs.filter((d) => d.status === 'DISCARDED').length;
    const groupCount = new Set(docs.filter((d) => d.status !== 'ATTACHED' && !d.attachedEntityId).map((d) => d.groupName).filter(Boolean)).size;
    return { total, queued, attached, discarded, groupCount };
  }, [docs]);

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(2) + ' MB';
  };

  const renderStatusChip = (status) => {
    switch (status) {
      case 'QUEUED':
        return (
          <Chip
            label="Queued in Inbox"
            size="small"
            sx={{ bgcolor: '#fef3c7', color: '#b45309', fontWeight: 700, fontSize: '0.72rem', border: '1px solid #fde68a' }}
          />
        );
      case 'ATTACHED':
        return (
          <Chip
            label="Attached"
            size="small"
            sx={{ bgcolor: '#dcfce7', color: '#15803d', fontWeight: 700, fontSize: '0.72rem', border: '1px solid #86efac' }}
          />
        );
      case 'DISCARDED':
        return (
          <Chip
            label="Discarded"
            size="small"
            sx={{ bgcolor: '#f1f5f9', color: '#64748b', fontWeight: 600, fontSize: '0.72rem' }}
          />
        );
      default:
        return <Chip label={status} size="small" sx={{ fontSize: '0.72rem' }} />;
    }
  };

  const renderAttachedEntity = (doc) => {
    if (!doc.attachedEntityType || !doc.attachedEntityNbr) {
      return <Typography variant="caption" color="textSecondary">—</Typography>;
    }
    const isSub = doc.attachedEntityType.toUpperCase() === 'SUBMISSION';
    return (
      <Chip
        label={`${doc.attachedEntityType}: ${doc.attachedEntityNbr}`}
        size="small"
        clickable
        color="primary"
        variant="outlined"
        onClick={() => {
          if (onNavigate) {
            onNavigate(isSub ? 'submissions' : 'policy');
          }
        }}
        sx={{ fontWeight: 600, fontSize: '0.72rem' }}
      />
    );
  };

  return (
    <Box>
      {flash && (
        <Alert severity={flash.type} onClose={() => setFlash(null)} sx={{ mb: 2 }}>
          {flash.text}
        </Alert>
      )}

      {/* Top Metrics Cards */}
      <Grid container spacing={2} sx={{ mb: 2.5 }}>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Card elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 2 }}>
            <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
              <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 600 }}>Total Ingested</Typography>
              <Typography variant="h5" sx={{ fontWeight: 700, color: 'primary.main', mt: 0.2 }}>
                {stats.total}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Card elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 2 }}>
            <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
              <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 600 }}>Queued (Pending Action)</Typography>
              <Typography variant="h5" sx={{ fontWeight: 700, color: '#d97706', mt: 0.2 }}>
                {stats.queued}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Card elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 2 }}>
            <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
              <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 600 }}>Attached / Linked</Typography>
              <Typography variant="h5" sx={{ fontWeight: 700, color: '#059669', mt: 0.2 }}>
                {stats.attached}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Card elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 2 }}>
            <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
              <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 600 }}>Grouped Batches</Typography>
              <Typography variant="h5" sx={{ fontWeight: 700, color: '#7c3aed', mt: 0.2 }}>
                {stats.groupCount}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Main Inbox Table Card */}
      <Card elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 2 }}>
        <CardContent sx={{ p: 2.5 }}>
          {/* Header & Controls */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1.5 }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Inbox size={20} style={{ color: '#0284c7' }} />
                Incoming Documents &amp; Intake Queue
              </Typography>
              <Typography variant="caption" color="textSecondary">
                Monitored inbox: <code>C:\helios-storage\documents\tenant_{activeTenantId}\inbox\</code> • Processed queue: <code>...\queue\</code>
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Button
                variant="outlined"
                size="small"
                startIcon={<RefreshCw size={15} />}
                onClick={loadIncomingDocs}
                disabled={loading}
              >
                Refresh
              </Button>
              <Button
                variant="contained"
                size="small"
                color="primary"
                startIcon={scanning ? <CircularProgress size={16} color="inherit" /> : <RefreshCw size={16} />}
                onClick={handleScanInbox}
                disabled={scanning}
                sx={{ fontWeight: 600 }}
              >
                {scanning ? 'Scanning Inbox...' : 'Scan Inbox Now'}
              </Button>
            </Box>
          </Box>

          {/* Filter Bar */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, gap: 1.5, flexWrap: 'wrap' }}>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {[
                { id: 'ALL', label: `All Pending (${stats.queued + stats.discarded})` },
                { id: 'QUEUED', label: `Queued (${stats.queued})` },
                { id: 'DISCARDED', label: `Discarded (${stats.discarded})` }
              ].map((pill) => (
                <Chip
                  key={pill.id}
                  label={pill.label}
                  size="small"
                  clickable
                  variant={filterStatus === pill.id ? 'filled' : 'outlined'}
                  color={filterStatus === pill.id ? 'primary' : 'default'}
                  onClick={() => {
                    setFilterStatus(pill.id);
                    setSelectedDocId(null);
                  }}
                  sx={{ fontWeight: 600, fontSize: '0.75rem' }}
                />
              ))}
            </Box>

            <TextField
              size="small"
              placeholder="Search incoming documents or batch..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              sx={{ width: { xs: '100%', sm: 280 } }}
            />
          </Box>

          {/* External Action Toolbar - functions on selected row (no radio buttons) */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 2,
              p: 1.5,
              borderRadius: 2,
              bgcolor: selectedDoc ? '#f0f9ff' : '#f8fafc',
              border: selectedDoc ? '1px solid #7dd3fc' : '1px dashed #cbd5e1',
              flexWrap: 'wrap',
              gap: 1.5
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: 1,
                  bgcolor: selectedDoc ? '#0284c7' : '#94a3b8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff'
                }}
              >
                <FileText size={18} />
              </Box>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 700, color: selectedDoc ? '#0369a1' : '#475569' }}>
                  {selectedDoc ? (
                    <>
                      Selected: #{selectedDoc.incomingId} — {selectedDoc.documentName}
                    </>
                  ) : (
                    'No document selected'
                  )}
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                  {selectedDoc ? (
                    <>
                      File: <code>{selectedDoc.fileName}</code> • {formatFileSize(selectedDoc.fileSizeBytes)} • {selectedDoc.groupName ? `Batch: ${selectedDoc.groupName}` : 'Standalone File'}
                    </>
                  ) : (
                    'Click any row in the table to select a document and activate actions.'
                  )}
                </Typography>
              </Box>
              {selectedDoc && (
                <Button
                  size="small"
                  variant="text"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedDocId(null);
                  }}
                  sx={{ fontSize: '0.75rem', color: '#64748b', minWidth: 'auto', ml: 1 }}
                >
                  Deselect
                </Button>
              )}
            </Box>

            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
              <Button
                size="small"
                variant="outlined"
                startIcon={<Eye size={15} />}
                disabled={!selectedDoc}
                onClick={() => selectedDoc && setPreviewDoc(selectedDoc)}
                sx={{ fontWeight: 600 }}
              >
                Open / Preview
              </Button>
              <Button
                size="small"
                variant="outlined"
                startIcon={<Download size={15} />}
                disabled={!selectedDoc}
                onClick={() => {
                  if (selectedDoc) {
                    window.open(`/document-api/documents/incoming/${selectedDoc.incomingId}/download?tenantId=${activeTenantId}`, '_blank');
                  }
                }}
                sx={{ fontWeight: 600 }}
              >
                Download
              </Button>
              <Button
                size="small"
                variant="contained"
                color="secondary"
                startIcon={<Paperclip size={15} />}
                disabled={!selectedDoc || selectedDoc.status === 'DISCARDED'}
                onClick={() => selectedDoc && handleOpenAttachModal(selectedDoc)}
                sx={{ fontWeight: 600 }}
              >
                Attach to File
              </Button>
              <Button
                size="small"
                variant="contained"
                color="primary"
                startIcon={<UserPlus size={15} />}
                disabled={!selectedDoc || selectedDoc.status === 'DISCARDED'}
                onClick={() => selectedDoc && handleOpenCreateSubModal(selectedDoc)}
                sx={{ fontWeight: 600 }}
              >
                New Submission
              </Button>
              <Button
                size="small"
                variant="outlined"
                color="error"
                startIcon={<Trash2 size={15} />}
                disabled={!selectedDoc || selectedDoc.status === 'DISCARDED'}
                onClick={() => {
                  if (selectedDoc) {
                    handleDiscard(selectedDoc.incomingId, selectedDoc.documentName);
                    setSelectedDocId(null);
                  }
                }}
                sx={{ fontWeight: 600 }}
              >
                Discard
              </Button>
            </Box>
          </Box>

          {/* Documents Table */}
          <TableContainer component={Paper} elevation={0} variant="outlined" sx={{ borderRadius: 1.5 }}>
            <Table size="small">
              <TableHead sx={{ backgroundColor: '#f8fafc' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, width: 60 }}>ID</TableCell>
                  <TableCell sx={{ fontWeight: 700, width: 40 }}></TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Document Title &amp; File</TableCell>
                  <TableCell sx={{ fontWeight: 700, width: 220 }}>Folder Group / Batch</TableCell>
                  <TableCell sx={{ fontWeight: 700, width: 160 }}>Received Date</TableCell>
                  <TableCell sx={{ fontWeight: 700, width: 100 }}>Size</TableCell>
                  <TableCell sx={{ fontWeight: 700, width: 140 }}>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} sx={{ textAlign: 'center', py: 4 }}>
                      <CircularProgress size={28} />
                      <Typography variant="body2" sx={{ mt: 1, color: '#64748b' }}>Loading incoming documents queue...</Typography>
                    </TableCell>
                  </TableRow>
                ) : filteredDocs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} sx={{ textAlign: 'center', py: 5, color: '#94a3b8' }}>
                      <Inbox size={32} style={{ opacity: 0.3, marginBottom: 8 }} />
                      <Typography variant="body2" fontWeight={600} color="textSecondary">
                        No pending inbox documents found
                      </Typography>
                      <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 0.5 }}>
                        Attached documents are linked to their respective files and excluded from the intake inbox.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDocs.map((doc) => {
                    const isSelected = selectedDocId === doc.incomingId;
                    return (
                      <TableRow
                        key={doc.incomingId}
                        hover
                        selected={isSelected}
                        onClick={() => setSelectedDocId(isSelected ? null : doc.incomingId)}
                        onDoubleClick={() => setPreviewDoc(doc)}
                        sx={{
                          cursor: 'pointer',
                          bgcolor: isSelected ? 'rgba(2, 132, 199, 0.08) !important' : 'inherit',
                          borderLeft: isSelected ? '4px solid #0284c7' : '4px solid transparent',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <TableCell sx={{ fontWeight: 700, color: isSelected ? '#0284c7' : 'primary.main' }}>
                          #{doc.incomingId}
                        </TableCell>
                        <TableCell sx={{ pr: 0 }}>
                          <FileText size={18} style={{ color: isSelected ? '#0284c7' : '#64748b' }} />
                        </TableCell>
                        <TableCell>
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: isSelected ? 700 : 600,
                              color: isSelected ? '#0369a1' : '#1e293b'
                            }}
                          >
                            {doc.documentName}
                          </Typography>
                          <code style={{ fontSize: '0.72rem', color: '#64748b' }}>{doc.fileName}</code>
                        </TableCell>
                        <TableCell>
                          {doc.groupName ? (
                            <Chip
                              icon={<Folder size={13} style={{ marginLeft: 4 }} />}
                              label={doc.groupName}
                              size="small"
                              sx={{
                                bgcolor: '#f5f3ff',
                                color: '#6d28d9',
                                fontWeight: 600,
                                fontSize: '0.72rem',
                                border: '1px solid #ddd6fe'
                              }}
                            />
                          ) : (
                            <Typography variant="caption" color="textSecondary">Standalone File</Typography>
                          )}
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.8rem', color: '#475569' }}>
                          {doc.receivedDt ? String(doc.receivedDt).substring(0, 16) : '—'}
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.8rem', color: '#475569' }}>
                          {formatFileSize(doc.fileSizeBytes)}
                        </TableCell>
                        <TableCell>
                          {renderStatusChip(doc.status)}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* 1. DOCUMENT PREVIEW MODAL */}
      <Dialog
        open={Boolean(previewDoc)}
        onClose={() => setPreviewDoc(null)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle sx={{ pb: 1, borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FileText size={20} style={{ color: '#0284c7' }} />
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                {previewDoc?.documentName || 'Document Preview'}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                File: <code>{previewDoc?.fileName}</code> • Size: {formatFileSize(previewDoc?.fileSizeBytes)} • Status: {previewDoc?.status} {previewDoc?.groupName ? `• Group: ${previewDoc.groupName}` : ''}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              size="small"
              variant="outlined"
              startIcon={<ExternalLink size={14} />}
              onClick={() => {
                window.open(`/document-api/documents/incoming/${previewDoc?.incomingId}/preview?tenantId=${activeTenantId}`, '_blank');
              }}
            >
              Open in Tab
            </Button>
            <Button
              size="small"
              variant="contained"
              startIcon={<Download size={14} />}
              onClick={() => {
                window.open(`/document-api/documents/incoming/${previewDoc?.incomingId}/download?tenantId=${activeTenantId}`, '_blank');
              }}
            >
              Download
            </Button>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: 0, bgcolor: '#334155' }}>
          {previewDoc && (
            <Box sx={{ width: '100%', height: '700px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <iframe
                src={`/document-api/documents/incoming/${previewDoc.incomingId}/preview?tenantId=${activeTenantId}#toolbar=1`}
                title={previewDoc.documentName}
                width="100%"
                height="100%"
                style={{ border: 'none' }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 1.5, borderTop: '1px solid #e2e8f0' }}>
          <Button onClick={() => setPreviewDoc(null)} variant="outlined">
            Close Preview
          </Button>
        </DialogActions>
      </Dialog>

      {/* 2. ATTACH TO SUBMISSION OR POLICY MODAL */}
      <Dialog
        open={Boolean(attachDoc)}
        onClose={() => !submittingAttach && setAttachDoc(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ pb: 1, borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 1 }}>
          <Paperclip size={20} style={{ color: '#0284c7' }} />
          Associate Document to Policy or Submission
        </DialogTitle>
        <DialogContent sx={{ pt: 2.5 }}>
          <Alert severity="info" sx={{ mb: 2.5, fontSize: '0.82rem' }}>
            Attaching <strong>{attachDoc?.documentName}</strong> ({attachDoc?.fileName}) directly links the file to the selected record and displays it in its Documents tab.
          </Alert>

          <Grid container spacing={2}>
            {/* Target Entity Type Toggle */}
            <Grid size={{ xs: 12 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Target Entity Type</InputLabel>
                <Select
                  value={attachEntityType}
                  label="Target Entity Type"
                  onChange={(e) => {
                    const next = e.target.value;
                    setAttachEntityType(next);
                    if (next === 'SUBMISSION' && submissionsList.length > 0) {
                      setSelectedEntityId(String(submissionsList[0].submsnId));
                    } else if (policiesList.length > 0) {
                      setSelectedEntityId(String(policiesList[0].policyId || policiesList[0].id));
                    }
                  }}
                >
                  <MenuItem value="SUBMISSION">Underwriting Submission (UW_SUBMSN)</MenuItem>
                  <MenuItem value="POLICY">Active Insurance Policy (UW_POLICY)</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Select Target Submission or Policy */}
            <Grid size={{ xs: 12 }}>
              {loadingEntities ? (
                <Box sx={{ textAlign: 'center', py: 2 }}>
                  <CircularProgress size={20} />
                </Box>
              ) : attachEntityType === 'SUBMISSION' ? (
                <FormControl fullWidth size="small">
                  <InputLabel>Select Target Submission</InputLabel>
                  <Select
                    value={selectedEntityId}
                    label="Select Target Submission"
                    onChange={(e) => setSelectedEntityId(e.target.value)}
                  >
                    {submissionsList.map((sub) => (
                      <MenuItem key={sub.submsnId} value={String(sub.submsnId)}>
                        {sub.submsnNbr} — {sub.orgName} ({sub.productType || 'Standard'} • {sub.status || 'Received'})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              ) : (
                <FormControl fullWidth size="small">
                  <InputLabel>Select Target Policy</InputLabel>
                  <Select
                    value={selectedEntityId}
                    label="Select Target Policy"
                    onChange={(e) => setSelectedEntityId(e.target.value)}
                  >
                    {policiesList.map((pol) => (
                      <MenuItem key={pol.policyId || pol.id} value={String(pol.policyId || pol.id)}>
                        {pol.id || pol.policyNbr} — {pol.name} ({pol.productType})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            </Grid>

            {/* Document Classification */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Classification / Type</InputLabel>
                <Select
                  value={attachClassification}
                  label="Classification / Type"
                  onChange={(e) => setAttachClassification(e.target.value)}
                >
                  <MenuItem value="APPLICATION">Commercial Application</MenuItem>
                  <MenuItem value="LOSS_RUNS">Loss Runs &amp; Claim Experience</MenuItem>
                  <MenuItem value="FINANCIALS">Audited Financial Statements</MenuItem>
                  <MenuItem value="SCHEDULE">Rating Schedule</MenuItem>
                  <MenuItem value="ENDORSEMENT">Endorsement Request</MenuItem>
                  <MenuItem value="ATTACHMENT">General Attachment</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Custom Title */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                size="small"
                label="Document Display Title"
                value={attachCustomTitle}
                onChange={(e) => setAttachCustomTitle(e.target.value)}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 1.5, borderTop: '1px solid #e2e8f0' }}>
          <Button onClick={() => setAttachDoc(null)} disabled={submittingAttach}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleConfirmAttach}
            disabled={submittingAttach || !selectedEntityId}
            startIcon={submittingAttach ? <CircularProgress size={16} color="inherit" /> : <Paperclip size={16} />}
            sx={{ fontWeight: 600 }}
          >
            {submittingAttach ? 'Attaching...' : 'Confirm Attachment'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 3. CREATE NEW ORGANIZATION & SUBMISSION MODAL */}
      <Dialog
        open={Boolean(createSubDoc)}
        onClose={() => !submittingCreate && setCreateSubDoc(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ pb: 1, borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 1 }}>
          <UserPlus size={20} style={{ color: '#059669' }} />
          Create Organization &amp; Submission from Document
        </DialogTitle>
        <DialogContent sx={{ pt: 2.5 }}>
          {createSuccessResult ? (
            <Box sx={{ py: 2 }}>
              <Alert severity="success" sx={{ mb: 3 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  Submission Created &amp; Document Attached Successfully!
                </Typography>
                <Typography variant="body2" sx={{ mt: 0.5 }}>
                  Organization: <strong>{createSuccessResult.orgName}</strong> (ID #{createSuccessResult.insuredPid})<br />
                  Submission Number: <strong>{createSuccessResult.submissionNbr}</strong> (ID #{createSuccessResult.submissionId})<br />
                  Document Attached: <strong>{createSubDoc?.documentName}</strong>
                </Typography>
              </Alert>

              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => {
                    setCreateSubDoc(null);
                    setCreateSuccessResult(null);
                    if (onNavigate) onNavigate('submissions');
                  }}
                  startIcon={<Files size={16} />}
                >
                  View Submissions
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => {
                    setCreateSubDoc(null);
                    setCreateSuccessResult(null);
                  }}
                >
                  Done
                </Button>
              </Box>
            </Box>
          ) : (
            <>
              <Alert severity="info" sx={{ mb: 2.5, fontSize: '0.82rem' }}>
                Quickly onboard a new insured organization in <code>dbo.PT_PARTY</code>, initialize a new <code>dbo.UW_SUBMSN</code> submission, and attach <strong>{createSubDoc?.fileName}</strong> automatically.
              </Alert>

              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 8 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Insured Organization Name"
                    value={createForm.orgName}
                    onChange={(e) => setCreateForm({ ...createForm, orgName: e.target.value })}
                    required
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Assigned Underwriter"
                    value={createForm.underwriter}
                    onChange={(e) => setCreateForm({ ...createForm, underwriter: e.target.value })}
                    required
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Product Line / Coverage</InputLabel>
                    <Select
                      value={createForm.productType}
                      label="Product Line / Coverage"
                      onChange={(e) => setCreateForm({ ...createForm, productType: e.target.value })}
                    >
                      <MenuItem value="Technology Errors & Omissions">Technology Errors &amp; Omissions</MenuItem>
                      <MenuItem value="Medical Malpractice">Medical Malpractice</MenuItem>
                      <MenuItem value="Cyber Liability">Cyber Liability &amp; Privacy Risk</MenuItem>
                      <MenuItem value="Directors & Officers">Directors &amp; Officers</MenuItem>
                      <MenuItem value="Commercial General Liability">Commercial General Liability</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid size={{ xs: 12, sm: 3 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Effective Date"
                    type="date"
                    InputLabelProps={{ shrink: true }}
                    value={createForm.effectiveDate}
                    onChange={(e) => setCreateForm({ ...createForm, effectiveDate: e.target.value })}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 3 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Expiration Date"
                    type="date"
                    InputLabelProps={{ shrink: true }}
                    value={createForm.expirationDate}
                    onChange={(e) => setCreateForm({ ...createForm, expirationDate: e.target.value })}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Occurrence Limit ($)"
                    value={createForm.limitAmount}
                    onChange={(e) => setCreateForm({ ...createForm, limitAmount: e.target.value })}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Retention / Deductible ($)"
                    value={createForm.retentionAmount}
                    onChange={(e) => setCreateForm({ ...createForm, retentionAmount: e.target.value })}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 4 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Document Type</InputLabel>
                    <Select
                      value={createForm.docType}
                      label="Document Type"
                      onChange={(e) => setCreateForm({ ...createForm, docType: e.target.value })}
                    >
                      <MenuItem value="APPLICATION">Commercial Application</MenuItem>
                      <MenuItem value="LOSS_RUNS">Loss Runs Report</MenuItem>
                      <MenuItem value="FINANCIALS">Audited Financials</MenuItem>
                      <MenuItem value="SCHEDULE">Rating Schedule</MenuItem>
                      <MenuItem value="ATTACHMENT">Supporting Document</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Document Title"
                    value={createForm.docTitle}
                    onChange={(e) => setCreateForm({ ...createForm, docTitle: e.target.value })}
                  />
                </Grid>
              </Grid>
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 1.5, borderTop: '1px solid #e2e8f0' }}>
          {!createSuccessResult && (
            <>
              <Button onClick={() => setCreateSubDoc(null)} disabled={submittingCreate}>
                Cancel
              </Button>
              <Button
                variant="contained"
                color="primary"
                onClick={handleConfirmCreateSubmission}
                disabled={submittingCreate || !createForm.orgName}
                startIcon={submittingCreate ? <CircularProgress size={16} color="inherit" /> : <UserPlus size={16} />}
                sx={{ fontWeight: 600 }}
              >
                {submittingCreate ? 'Creating & Attaching...' : 'Create Org & Submission'}
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// ============================================================================
// TOP-LEVEL DOCUMENTS & WORKFLOW CENTER VIEW
// ============================================================================
const DocumentsView = ({ apiFetch, activeTenantId, activeRole, onNavigate }) => {
  const [docTab, setDocTab] = useState(0);

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontSize: '1.65rem', mb: 0.4, fontWeight: 700 }}>
          Documents &amp; Intake Center
        </Typography>
        <Typography variant="body2" sx={{ color: '#64748b' }}>
          Intake inbox scanning, automated document queue processing, and enterprise policy/submission declarations
        </Typography>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={docTab} onChange={(e, v) => setDocTab(v)}>
          <Tab
            icon={<Inbox size={16} />}
            iconPosition="start"
            label="Incoming Documents Inbox"
            sx={{ fontWeight: 600, textTransform: 'none' }}
          />
          <Tab
            icon={<Printer size={16} />}
            iconPosition="start"
            label="Policy & Submission Repository"
            sx={{ fontWeight: 600, textTransform: 'none' }}
          />
        </Tabs>
      </Box>

      {docTab === 0 && (
        <IncomingDocumentsView
          apiFetch={apiFetch}
          activeTenantId={activeTenantId}
          activeRole={activeRole}
          onNavigate={onNavigate}
        />
      )}

      {docTab === 1 && (
        <DocumentsManager
          apiFetch={apiFetch}
          activeTenantId={activeTenantId}
          entityType={null}
          entityId={null}
          entityNbr=""
          defaultInsuredName=""
          title="Enterprise Document Repository"
        />
      )}
    </Box>
  );
};

// --- 5. Claims View ---
const ClaimsView = ({ apiFetch, activeTenantId, activeRole }) => {
  const [claims, setClaims] = useState([]);
  const [openNewClaim, setOpenNewClaim] = useState(false);
  const canReportClaim = activeRole ? activeRole.canReportClaim !== false : true;
  const [newClaim, setNewClaim] = useState({
    policyNbr: 'POL-2026-8832',
    insuredName: 'TechSolutions Corp',
    productType: 'Technology E&O',
    lossDate: '2026-10-15',
    reserveAmt: '$50,000',
    description: ''
  });

  const loadClaims = useCallback(async () => {
    try {
      const data = await apiFetch('/api/claims');
      setClaims(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load claims:', err);
    }
  }, [apiFetch]);

  useEffect(() => {
    loadClaims();
  }, [loadClaims, activeTenantId]);

  const handleCreateClaim = async (e) => {
    e.preventDefault();
    try {
      await apiFetch('/api/claims', {
        method: 'POST',
        body: JSON.stringify(newClaim)
      });
      setOpenNewClaim(false);
      setNewClaim({ ...newClaim, description: '' });
      await loadClaims();
    } catch (err) {
      console.error('Failed to create claim:', err);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontSize: '1.65rem', mb: 0.4 }}>
            Claims
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748b' }}>
            Professional liability claim triage, reserves, and litigation tracking
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="primary"
          startIcon={<Plus size={16} />}
          disabled={!canReportClaim}
          onClick={() => setOpenNewClaim(true)}
        >
          {canReportClaim ? 'Report Claim' : 'Report Claim (Restricted)'}
        </Button>
      </Box>

      <Card elevation={0}>
        <TableContainer>
          <Table>
            <TableHead sx={{ backgroundColor: '#f8fafc' }}>
              <TableRow>
                <TableCell sx={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b' }}>CLAIM NUMBER</TableCell>
                <TableCell sx={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b' }}>POLICY NUMBER</TableCell>
                <TableCell sx={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b' }}>INSURED NAME</TableCell>
                <TableCell sx={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b' }}>PRODUCT TYPE</TableCell>
                <TableCell sx={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b' }}>LOSS DATE</TableCell>
                <TableCell sx={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b' }}>RESERVE</TableCell>
                <TableCell sx={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b' }}>DESCRIPTION</TableCell>
                <TableCell sx={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b' }}>STATUS</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {claims.map((clm) => (
                <TableRow key={clm.id} hover>
                  <TableCell sx={{ fontWeight: 700, color: 'primary.main' }}>{clm.claimNbr}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{clm.policyNbr}</TableCell>
                  <TableCell>{clm.insuredName}</TableCell>
                  <TableCell>{clm.productType}</TableCell>
                  <TableCell>{clm.lossDate}</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{clm.reserveAmt}</TableCell>
                  <TableCell>{clm.description}</TableCell>
                  <TableCell>
                    <StatusPill status={clm.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      <Dialog open={openNewClaim} onClose={() => setOpenNewClaim(false)} maxWidth="xs" fullWidth>
        <form onSubmit={handleCreateClaim}>
          <DialogTitle>Report New Claim</DialogTitle>
          <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Policy Number"
              size="small"
              fullWidth
              required
              value={newClaim.policyNbr}
              onChange={(e) => setNewClaim({ ...newClaim, policyNbr: e.target.value })}
            />
            <TextField
              label="Insured Name"
              size="small"
              fullWidth
              required
              value={newClaim.insuredName}
              onChange={(e) => setNewClaim({ ...newClaim, insuredName: e.target.value })}
            />
            <FormControl size="small" fullWidth>
              <InputLabel>Product Type</InputLabel>
              <Select
                label="Product Type"
                value={newClaim.productType}
                onChange={(e) => setNewClaim({ ...newClaim, productType: e.target.value })}
              >
                <MenuItem value="Technology E&O">Technology E&amp;O</MenuItem>
                <MenuItem value="Medical Malpractice">Medical Malpractice</MenuItem>
                <MenuItem value="Directors & Officers">Directors &amp; Officers</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Loss Date (YYYY-MM-DD)"
              size="small"
              fullWidth
              value={newClaim.lossDate}
              onChange={(e) => setNewClaim({ ...newClaim, lossDate: e.target.value })}
            />
            <TextField
              label="Reserve Amount"
              size="small"
              fullWidth
              value={newClaim.reserveAmt}
              onChange={(e) => setNewClaim({ ...newClaim, reserveAmt: e.target.value })}
            />
            <TextField
              label="Claim Description"
              size="small"
              fullWidth
              multiline
              rows={2}
              value={newClaim.description}
              onChange={(e) => setNewClaim({ ...newClaim, description: e.target.value })}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenNewClaim(false)}>Cancel</Button>
            <Button type="submit" variant="contained" color="primary">
              Submit Claim
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

// --- 5. Full Multi-Tenant & SQL Server Diagnostics View ---
const DiagnosticsView = ({
  apiFetch,
  activeTenantId,
  setActiveTenantId,
  tenants,
  reloadTenants
}) => {
  const [diag, setDiag] = useState(null);
  const [loading, setLoading] = useState(true);
  const [openAddTenant, setOpenAddTenant] = useState(false);
  const [newTenant, setNewTenant] = useState({
    tenantId: '',
    tenantName: '',
    dbServerName: 'dbtst.ad.ortaleza.com',
    dbCatalogName: 'HELIOS2_TST',
    primaryColor: '#013a12',
    accentColor: '#f59e0b',
    brandTitle: 'Helios',
    brandSubtitle: 'INSURANCE MANAGEMENT SUITE',
    enabledModules: 'dashboard,policy,submissions,claims,diagnostics'
  });

  const themePresets = [
    { label: 'Forest Green (Default)', primary: '#013a12', accent: '#f59e0b' },
    { label: 'Royal Navy', primary: '#0f2942', accent: '#38bdf8' },
    { label: 'Burgundy Executive', primary: '#4c0519', accent: '#fb7185' },
    { label: 'Deep Indigo', primary: '#1e1b4b', accent: '#a78bfa' },
    { label: 'Slate Charcoal', primary: '#0f172a', accent: '#10b981' }
  ];

  const allModuleOptions = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'policy', label: 'Policies' },
    { id: 'submissions', label: 'Submissions' },
    { id: 'claims', label: 'Claims' },
    { id: 'diagnostics', label: 'Diagnostics' }
  ];

  const loadDiagnostics = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/api/diagnostics');
      setDiag(data);
    } catch (err) {
      console.error('Diagnostics error:', err);
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    loadDiagnostics();
  }, [loadDiagnostics, activeTenantId]);

  const handleOpenEditTenant = (t) => {
    setNewTenant({
      tenantId: String(t.tenantId),
      tenantName: t.tenantName || '',
      dbServerName: t.dbServerName || 'dbtst.ad.ortaleza.com',
      dbCatalogName: t.dbCatalogName || 'HELIOS2_TST',
      primaryColor: t.primaryColor || '#013a12',
      accentColor: t.accentColor || '#f59e0b',
      brandTitle: t.brandTitle || 'Helios',
      brandSubtitle: t.brandSubtitle || 'INSURANCE MANAGEMENT SUITE',
      enabledModules: t.enabledModules || 'dashboard,policy,submissions,claims,diagnostics'
    });
    setOpenAddTenant(true);
  };

  const toggleModuleInForm = (modId) => {
    if (modId === 'dashboard' || modId === 'diagnostics') return; // Keep core navigation accessible
    const currentList = (newTenant.enabledModules || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const exists = currentList.includes(modId);
    const nextList = exists ? currentList.filter((m) => m !== modId) : [...currentList, modId];
    setNewTenant({ ...newTenant, enabledModules: nextList.join(',') });
  };

  const handleSaveTenant = async (e) => {
    e.preventDefault();
    try {
      await apiFetch('/api/tenants', {
        method: 'POST',
        body: JSON.stringify({
          tenantId: Number(newTenant.tenantId),
          tenantName: newTenant.tenantName.trim(),
          dbServerName: newTenant.dbServerName.trim(),
          dbCatalogName: newTenant.dbCatalogName.trim(),
          primaryColor: newTenant.primaryColor,
          accentColor: newTenant.accentColor,
          brandTitle: newTenant.brandTitle.trim(),
          brandSubtitle: newTenant.brandSubtitle.trim(),
          enabledModules: newTenant.enabledModules
        })
      });
      setOpenAddTenant(false);
      await reloadTenants();
      await loadDiagnostics();
    } catch (err) {
      console.error('Failed to save tenant:', err);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontSize: '1.65rem', mb: 0.4 }}>
            Multi-Tenant &amp; SQL Diagnostics
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748b' }}>
            Live connection telemetry and per-tenant UI customization stored in MSTR_DATA
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button
            variant="outlined"
            startIcon={<Plus size={16} />}
            onClick={() => {
              setNewTenant({
                tenantId: '',
                tenantName: '',
                dbServerName: 'dbtst.ad.ortaleza.com',
                dbCatalogName: 'HELIOS2_TST',
                primaryColor: '#013a12',
                accentColor: '#f59e0b',
                brandTitle: 'Helios',
                brandSubtitle: 'INSURANCE MANAGEMENT SUITE',
                enabledModules: 'dashboard,policy,submissions,claims,diagnostics'
              });
              setOpenAddTenant(true);
            }}
          >
            Register Tenant
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<RefreshCw size={16} />}
            onClick={loadDiagnostics}
            disabled={loading}
          >
            Refresh Diagnostics
          </Button>
        </Box>
      </Box>

      {loading || !diag ? (
        <Card elevation={0}>
          <CardContent sx={{ py: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
            <CircularProgress size={22} />
            <Typography>Running SQL Server connection diagnostics...</Typography>
          </CardContent>
        </Card>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Runtime Environment */}
          <Card elevation={0}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Runtime Environment
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="body2" sx={{ mb: 0.75 }}>
                    <strong>Application:</strong> {diag.application}
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 0.75 }}>
                    <strong>OS &amp; Arch:</strong> {diag.osAndArch}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Java Runtime:</strong> {diag.javaRuntime}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="body2" sx={{ mb: 0.75 }}>
                    <strong>Process User:</strong> {diag.processUser}
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 0.75 }}>
                    <strong>Auth Mode:</strong> {diag.authMode}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Server Time:</strong> {diag.serverTime}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Master DB & Active Tenant DB */}
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Card elevation={0} sx={{ height: '100%', borderTop: '4px solid #013a12' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                    <Typography variant="h6">1. Master Multi-Tenant DB (MSTR_DATA)</Typography>
                    <StatusPill status={diag.masterDatabase?.connected ? 'Completed' : 'Urgent'} />
                  </Box>
                  <Divider sx={{ mb: 2 }} />
                  {diag.masterDatabase?.connected ? (
                    <>
                      <Typography variant="body2" sx={{ mb: 0.5 }}>
                        <strong>Database:</strong> <code>{diag.masterDatabase.databaseName}</code>
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 0.5 }}>
                        <strong>SQL Server:</strong> <code>{diag.masterDatabase.serverName}</code>
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 1.5 }}>
                        <strong>SQL Login:</strong> <code>{diag.masterDatabase.authenticatedUser}</code>
                      </Typography>
                      <Box
                        component="pre"
                        sx={{
                          backgroundColor: '#0f172a',
                          color: '#f8fafc',
                          p: 1.5,
                          borderRadius: 1.5,
                          overflowX: 'auto',
                          fontSize: '0.75rem',
                          m: 0
                        }}
                      >
                        {diag.masterDatabase.sqlVersion}
                      </Box>
                    </>
                  ) : (
                    <Alert severity="error">{diag.masterDatabase?.errorMessage || 'Connection failed'}</Alert>
                  )}
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Card elevation={0} sx={{ height: '100%', borderTop: '4px solid #005b7f' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                    <Typography variant="h6">
                      2. Active Tenant DB (Tenant #{diag.activeTenantId}: {diag.activeTenantConfig?.dbCatalogName})
                    </Typography>
                    <StatusPill status={diag.tenantDatabase?.connected ? 'Completed' : 'Urgent'} />
                  </Box>
                  <Divider sx={{ mb: 2 }} />
                  {diag.tenantDatabase?.connected ? (
                    <>
                      <Typography variant="body2" sx={{ mb: 0.5 }}>
                        <strong>Database:</strong> <code>{diag.tenantDatabase.databaseName}</code>
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 0.5 }}>
                        <strong>SQL Server:</strong> <code>{diag.tenantDatabase.serverName}</code>
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 1.5 }}>
                        <strong>SQL Login:</strong> <code>{diag.tenantDatabase.authenticatedUser}</code>
                      </Typography>
                      <Box
                        component="pre"
                        sx={{
                          backgroundColor: '#0f172a',
                          color: '#f8fafc',
                          p: 1.5,
                          borderRadius: 1.5,
                          overflowX: 'auto',
                          fontSize: '0.75rem',
                          m: 0
                        }}
                      >
                        {diag.tenantDatabase.sqlVersion}
                      </Box>
                    </>
                  ) : (
                    <Alert severity="error">{diag.tenantDatabase?.errorMessage || 'Connection failed'}</Alert>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Tenant Registry Table */}
          <Card elevation={0}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Registered Tenants &amp; UI Customization in <code>MSTR_DATA.dbo.TENANT_DB_CONFIG</code>
              </Typography>
              <TableContainer component={Paper} elevation={0} variant="outlined">
                <Table size="small">
                  <TableHead sx={{ backgroundColor: '#f8fafc' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>TENANT_ID</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>TENANT_NAME</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>DB_CATALOG_NM</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>UI THEME &amp; BRANDING</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>ENABLED MODULES</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>ACTIONS</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {tenants.map((t) => {
                      const isActive = t.tenantId === Number(activeTenantId);
                      const pColor = t.primaryColor || '#013a12';
                      const aColor = t.accentColor || '#f59e0b';
                      return (
                        <TableRow key={t.tenantId} selected={isActive}>
                          <TableCell>{t.tenantId}</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>{t.tenantName}</TableCell>
                          <TableCell>
                            <code>{t.dbCatalogName}</code>
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Box
                                sx={{
                                  width: 18,
                                  height: 18,
                                  borderRadius: '4px',
                                  backgroundColor: pColor,
                                  border: `2px solid ${aColor}`,
                                  flexShrink: 0
                                }}
                              />
                              <Box>
                                <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', lineHeight: 1.1 }}>
                                  {t.brandTitle || 'Helios'}
                                </Typography>
                                <Typography variant="caption" color="textSecondary" sx={{ fontSize: '0.68rem' }}>
                                  {t.brandSubtitle || 'INSURANCE MANAGEMENT SUITE'}
                                </Typography>
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                              {(t.enabledModules || 'dashboard,policy,submissions,claims,diagnostics')
                                .split(',')
                                .map((m) => (
                                  <Chip key={m} label={m} size="small" sx={{ fontSize: '0.68rem', height: 20 }} />
                                ))}
                            </Box>
                          </TableCell>
                          <TableCell align="right">
                            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, alignItems: 'center' }}>
                              <Button
                                size="small"
                                variant="text"
                                onClick={() => handleOpenEditTenant(t)}
                              >
                                Customize UI
                              </Button>
                              {isActive ? (
                                <StatusPill status="Active" />
                              ) : (
                                <Button
                                  size="small"
                                  variant="outlined"
                                  onClick={() => setActiveTenantId(t.tenantId)}
                                >
                                  Switch Tenant
                                </Button>
                              )}
                            </Box>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Box>
      )}

      <Dialog open={openAddTenant} onClose={() => setOpenAddTenant(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleSaveTenant}>
          <DialogTitle>Register / Customize Tenant UI in MSTR_DATA</DialogTitle>
          <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  label="Tenant ID (INT)"
                  type="number"
                  size="small"
                  fullWidth
                  required
                  value={newTenant.tenantId}
                  onChange={(e) => setNewTenant({ ...newTenant, tenantId: e.target.value })}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 8 }}>
                <TextField
                  label="Tenant Name"
                  size="small"
                  fullWidth
                  required
                  value={newTenant.tenantName}
                  onChange={(e) => setNewTenant({ ...newTenant, tenantName: e.target.value })}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="SQL Server Host (DB_SERVER_NM)"
                  size="small"
                  fullWidth
                  required
                  value={newTenant.dbServerName}
                  onChange={(e) => setNewTenant({ ...newTenant, dbServerName: e.target.value })}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Database Catalog (DB_CATALOG_NM)"
                  size="small"
                  fullWidth
                  required
                  value={newTenant.dbCatalogName}
                  onChange={(e) => setNewTenant({ ...newTenant, dbCatalogName: e.target.value })}
                />
              </Grid>
            </Grid>

            <Divider />
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0f172a' }}>
              Frontend Branding &amp; Theme Customization
            </Typography>

            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {themePresets.map((preset) => (
                <Chip
                  key={preset.label}
                  label={preset.label}
                  onClick={() =>
                    setNewTenant({
                      ...newTenant,
                      primaryColor: preset.primary,
                      accentColor: preset.accent
                    })
                  }
                  sx={{
                    backgroundColor: preset.primary,
                    color: '#ffffff',
                    fontWeight: 600,
                    fontSize: '0.72rem',
                    border: newTenant.primaryColor === preset.primary ? `2px solid ${preset.accent}` : 'none',
                    '&:hover': { opacity: 0.9, backgroundColor: preset.primary }
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
                  value={newTenant.primaryColor}
                  onChange={(e) => setNewTenant({ ...newTenant, primaryColor: e.target.value })}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Logo Accent Color (Hex)"
                  size="small"
                  fullWidth
                  value={newTenant.accentColor}
                  onChange={(e) => setNewTenant({ ...newTenant, accentColor: e.target.value })}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Sidebar Brand Title"
                  size="small"
                  fullWidth
                  value={newTenant.brandTitle}
                  onChange={(e) => setNewTenant({ ...newTenant, brandTitle: e.target.value })}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Sidebar Brand Subtitle"
                  size="small"
                  fullWidth
                  value={newTenant.brandSubtitle}
                  onChange={(e) => setNewTenant({ ...newTenant, brandSubtitle: e.target.value })}
                />
              </Grid>
            </Grid>

            <Box>
              <Typography variant="caption" sx={{ fontWeight: 600, color: '#64748b', display: 'block', mb: 1 }}>
                Enabled Sidebar Navigation Modules (Click to toggle):
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {allModuleOptions.map((mod) => {
                  const enabled = (newTenant.enabledModules || '').split(',').includes(mod.id);
                  return (
                    <Chip
                      key={mod.id}
                      label={mod.label}
                      color={enabled ? 'primary' : 'default'}
                      variant={enabled ? 'filled' : 'outlined'}
                      onClick={() => toggleModuleInForm(mod.id)}
                    />
                  );
                })}
              </Box>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenAddTenant(false)}>Cancel</Button>
            <Button type="submit" variant="contained" color="primary">
              Save Tenant Configuration
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

// --- Enterprise Login & Multi-Tenant Authentication View ---
const LoginView = ({ onLoginSuccess, tenants = [] }) => {
  const [selectedTenantId, setSelectedTenantId] = useState(1);
  const [username, setUsername] = useState('mchang');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [error, setError] = useState(null);
  const [tenantUsers, setTenantUsers] = useState([]);
  const [openSsoDialog, setOpenSsoDialog] = useState(false);
  const [ssoModalData, setSsoModalData] = useState({ title: '', desc: '', provider: '' });

  useEffect(() => {
    let isCurrent = true;
    const fetchUsers = async () => {
      try {
        const res = await fetch(`/api/auth/users?tenantId=${selectedTenantId}`, {
          headers: {
            'X-Tenant-ID': String(selectedTenantId)
          }
        });
        if (res.ok) {
          const list = await res.json();
          if (isCurrent && Array.isArray(list)) {
            setTenantUsers(list);
            if (list.length > 0 && !list.some((u) => u.username === username)) {
              setUsername(list[0].username);
            }
          }
        }
      } catch (err) {
        console.warn('Could not fetch tenant users:', err);
      }
    };
    fetchUsers();
    return () => { isCurrent = false; };
  }, [selectedTenantId]);

  const activeTenant = tenants.find((t) => t.tenantId === Number(selectedTenantId)) || tenants[0] || {
    tenantName: 'Helios2 Default Tenant',
    primaryColor: '#013a12',
    accentColor: '#f59e0b',
    brandTitle: 'Helios',
    brandSubtitle: 'INSURANCE MANAGEMENT SUITE'
  };

  const handleLogin = async (overrideUser = null) => {
    setIsLoggingIn(true);
    setError(null);
    const userToSubmit = overrideUser || username;
    try {
      const res = await fetch(`/api/auth/login?tenantId=${selectedTenantId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-ID': String(selectedTenantId)
        },
        body: JSON.stringify({
          tenantId: Number(selectedTenantId),
          username: userToSubmit,
          password: password
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Authentication failed for the selected tenant.');
      }
      onLoginSuccess(data.user, Number(selectedTenantId));
    } catch (err) {
      setError(err.message || 'Unable to sign in. Please verify your tenant and username.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSsoClick = (type) => {
    if (type === 'windows') {
      setSsoModalData({
        title: 'Windows Integrated Authentication (Kerberos / SPNEGO)',
        desc: 'Windows Domain Single Sign-On authenticates via Active Directory realm AD.ORTALEZA.COM. When enabled, your workstation Kerberos ticket automatically grants access to your tenant account mapped to dbo.APP_USER.EXTERNAL_SUBJECT_ID (e.g. mchang@AD.ORTALEZA.COM).',
        provider: 'WINDOWS_AD'
      });
    } else {
      setSsoModalData({
        title: 'Microsoft Azure Entra ID (OIDC / OAuth 2.0)',
        desc: 'Microsoft Azure Entra ID Single Sign-On federates with your corporate Microsoft 365 / Entra tenant. Tokens validate through OpenID Connect and map the incoming JWT claim (oid or preferred_username) directly to dbo.APP_USER in the tenant database.',
        provider: 'AZURE_ENTRA_ID'
      });
    }
    setOpenSsoDialog(true);
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        width: '100vw',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0b1324',
        backgroundImage: 'radial-gradient(circle at 50% 10%, #1e293b 0%, #0b1324 100%)',
        p: 2
      }}
    >
      <Card
        elevation={10}
        sx={{
          maxWidth: 480,
          width: '100%',
          borderRadius: 3,
          backgroundColor: '#ffffff',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45)',
          overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.1)'
        }}
      >
        {/* Brand Banner */}
        <Box
          sx={{
            backgroundColor: activeTenant.primaryColor || '#013a12',
            px: 4,
            py: 3.5,
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: `3px solid ${activeTenant.accentColor || '#f59e0b'}`
          }}
        >
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 0.5 }}>
              <HeliosBrandIcon primaryColor={activeTenant.primaryColor} accentColor={activeTenant.accentColor} />
              <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: '0.04em' }}>
                {activeTenant.brandTitle || 'Helios'}
              </Typography>
            </Box>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.85)', letterSpacing: '0.08em', fontWeight: 600 }}>
              {activeTenant.brandSubtitle || 'INSURANCE MANAGEMENT SUITE'}
            </Typography>
          </Box>
          <Chip
            label={activeTenant.dbCatalogName || 'HELIOS2_TST'}
            size="small"
            sx={{
              backgroundColor: 'rgba(255,255,255,0.2)',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.72rem'
            }}
          />
        </Box>

        <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#0f172a', mb: 0.5 }}>
            Enterprise User Sign-In
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748b', mb: 3 }}>
            Select your tenant directory and enter your account username.
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2.5, borderRadius: 1.5 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleLogin();
            }}
          >
            {/* Tenant Selection */}
            <FormControl fullWidth size="small" sx={{ mb: 2.5 }}>
              <InputLabel id="tenant-select-label">Target Tenant Realm</InputLabel>
              <Select
                labelId="tenant-select-label"
                label="Target Tenant Realm"
                value={selectedTenantId}
                onChange={(e) => setSelectedTenantId(e.target.value)}
              >
                {tenants.map((t) => (
                  <MenuItem key={t.tenantId} value={t.tenantId}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box
                        sx={{
                          width: 10,
                          height: 10,
                          borderRadius: '50%',
                          backgroundColor: t.primaryColor || '#013a12'
                        }}
                      />
                      <span>{t.tenantName}</span>
                      <Typography variant="caption" sx={{ color: '#94a3b8', ml: 0.5 }}>
                        ({t.dbCatalogName})
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Username Input */}
            <TextField
              fullWidth
              size="small"
              label="Account Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              sx={{ mb: 2 }}
              InputProps={{
                startAdornment: (
                  <Box sx={{ mr: 1, color: '#64748b', display: 'flex', alignItems: 'center' }}>
                    <User size={18} />
                  </Box>
                )
              }}
              required
            />

            {/* Password Input */}
            <TextField
              fullWidth
              size="small"
              type="password"
              label="Password (Optional - Blank Allowed)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              helperText="Passwords can be blank right now for tenant testing"
              sx={{ mb: 2.5 }}
              InputProps={{
                startAdornment: (
                  <Box sx={{ mr: 1, color: '#64748b', display: 'flex', alignItems: 'center' }}>
                    <Lock size={18} />
                  </Box>
                )
              }}
            />

            {/* Quick Demo Users (One-Click Login) */}
            {tenantUsers.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: '#475569', display: 'block', mb: 1 }}>
                  Sample Tenant Users (Click to Quick-Sign In):
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                  {tenantUsers.map((u) => {
                    const isSelected = username === u.username;
                    return (
                      <Chip
                        key={u.userId}
                        label={`${u.displayName} (${u.roleCode})`}
                        size="small"
                        color={isSelected ? 'primary' : 'default'}
                        variant={isSelected ? 'filled' : 'outlined'}
                        onClick={() => {
                          setUsername(u.username);
                          handleLogin(u.username);
                        }}
                        sx={{
                          cursor: 'pointer',
                          fontWeight: 600,
                          fontSize: '0.74rem',
                          '&:hover': { borderColor: '#0284c7' }
                        }}
                      />
                    );
                  })}
                </Box>
              </Box>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              disabled={isLoggingIn}
              startIcon={isLoggingIn ? <CircularProgress size={18} color="inherit" /> : <LogIn size={18} />}
              sx={{
                py: 1.25,
                fontWeight: 700,
                fontSize: '0.95rem',
                backgroundColor: activeTenant.primaryColor || '#013a12',
                '&:hover': {
                  backgroundColor: activeTenant.primaryColor || '#013a12',
                  filter: 'brightness(1.15)'
                }
              }}
            >
              {isLoggingIn ? 'Authenticating with Tenant DB...' : 'Sign In to Workspace'}
            </Button>
          </form>

          {/* Enterprise Single Sign-On Section */}
          <Box sx={{ mt: 3.5, pt: 2.5, borderTop: '1px solid #e2e8f0' }}>
            <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748b', display: 'block', mb: 1.5, textAlign: 'center' }}>
              ENTERPRISE SINGLE SIGN-ON (ROADMAP)
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Button
                variant="outlined"
                fullWidth
                size="small"
                onClick={() => handleSsoClick('windows')}
                startIcon={<Laptop size={16} color="#0284c7" />}
                sx={{
                  borderColor: '#cbd5e1',
                  color: '#334155',
                  justifyContent: 'flex-start',
                  px: 2,
                  py: 0.9,
                  '&:hover': { borderColor: '#94a3b8', backgroundColor: '#f8fafc' }
                }}
              >
                Sign in with Windows Domain (AD.ORTALEZA.COM)
              </Button>

              <Button
                variant="outlined"
                fullWidth
                size="small"
                onClick={() => handleSsoClick('entra')}
                startIcon={<ShieldCheck size={16} color="#2563eb" />}
                sx={{
                  borderColor: '#cbd5e1',
                  color: '#334155',
                  justifyContent: 'flex-start',
                  px: 2,
                  py: 0.9,
                  '&:hover': { borderColor: '#94a3b8', backgroundColor: '#f8fafc' }
                }}
              >
                Sign in with Microsoft Entra ID (Azure AD)
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Enterprise SSO Roadmap Modal */}
      <Dialog open={openSsoDialog} onClose={() => setOpenSsoDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.25, borderBottom: '1px solid #e2e8f0' }}>
          <Key size={20} color="#0284c7" />
          <Typography variant="h6" sx={{ fontSize: '1.05rem', fontWeight: 700 }}>
            {ssoModalData.title}
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ py: 2.5 }}>
          <Typography variant="body2" sx={{ color: '#334155', mb: 2 }}>
            {ssoModalData.desc}
          </Typography>
          <Paper variant="outlined" sx={{ p: 2, backgroundColor: '#f8fafc', mb: 2 }}>
            <Typography variant="caption" sx={{ fontWeight: 700, color: '#475569', display: 'block', mb: 0.5 }}>
              Database Identity Schema Mapping:
            </Typography>
            <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#0369a1' }}>
              dbo.APP_USER.AUTH_PROVIDER = &apos;{ssoModalData.provider}&apos;
              <br />
              dbo.APP_USER.EXTERNAL_SUBJECT_ID = user@ad.ortaleza.com / Azure-OID
            </Typography>
          </Paper>
          <Alert severity="info" sx={{ fontSize: '0.85rem' }}>
            Enterprise directory federation can be configured and managed in the <strong>Helios Admin Portal</strong> under <strong>User &amp; Identity Management</strong>. For current testing, use the sample users seeded in each tenant&apos;s database.
          </Alert>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 1.5 }}>
          <Button onClick={() => setOpenSsoDialog(false)} variant="contained" color="primary">
            Understood
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// --- Main Application Shell (Matches Uploaded Design Screenshot + Per-Tenant & Per-Role UI Customization) ---
export default function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('helios_auth_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [activeView, setActiveView] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [tenants, setTenants] = useState([
    {
      tenantId: 1,
      tenantName: 'Acme Corp',
      dbCatalogName: 'HELIOS2_TST',
      primaryColor: '#013a12',
      accentColor: '#f59e0b',
      brandTitle: 'Helios',
      brandSubtitle: 'INSURANCE MANAGEMENT SUITE',
      enabledModules: 'dashboard,policy,submissions,claims,diagnostics'
    },
    {
      tenantId: 2,
      tenantName: 'Global Risk Partners',
      dbCatalogName: 'HELIOS_TST',
      primaryColor: '#0f2942',
      accentColor: '#38bdf8',
      brandTitle: 'Helios',
      brandSubtitle: 'GLOBAL RISK UNDERWRITING',
      enabledModules: 'dashboard,policy,submissions,claims,diagnostics'
    }
  ]);
  const [roles, setRoles] = useState([
    {
      roleId: 1,
      tenantId: 1,
      roleCode: 'EXECUTIVE',
      roleName: 'Portfolio Executive',
      allowedModules: 'dashboard,policy,submissions,claims',
      defaultTaskFilter: '',
      canCreateSubmission: true,
      canAddOrganization: true,
      canReportClaim: true
    }
  ]);
  const [activeTenantId, setActiveTenantId] = useState(() => {
    try {
      const saved = localStorage.getItem('helios_auth_user');
      if (saved) {
        const u = JSON.parse(saved);
        if (u.tenantId) return Number(u.tenantId);
      }
    } catch {}
    return 1;
  });
  const [activeRoleCode, setActiveRoleCode] = useState(() => {
    try {
      const saved = localStorage.getItem('helios_auth_user');
      if (saved) {
        const u = JSON.parse(saved);
        if (u.roleCode) return u.roleCode;
      }
    } catch {}
    return 'EXECUTIVE';
  });
  const [tenantMenuAnchor, setTenantMenuAnchor] = useState(null);
  const [roleMenuAnchor, setRoleMenuAnchor] = useState(null);
  const [userMenuAnchor, setUserMenuAnchor] = useState(null);

  const handleLoginSuccess = (user, tenantId) => {
    const userWithTenant = { ...user, tenantId: Number(tenantId) };
    setCurrentUser(userWithTenant);
    setActiveTenantId(Number(tenantId));
    if (user.roleCode) {
      setActiveRoleCode(user.roleCode);
    }
    localStorage.setItem('helios_auth_user', JSON.stringify(userWithTenant));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('helios_auth_user');
  };

  const apiFetch = useCallback(
    async (path, options = {}) => {
      const headers = {
        'X-Tenant-ID': String(activeTenantId),
        ...(options.headers || {})
      };
      if (!(options.body instanceof FormData) && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
      }
      const response = await fetch(path, { ...options, headers });
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || `HTTP ${response.status}`);
      }
      return response.json();
    },
    [activeTenantId]
  );

  const reloadTenants = useCallback(async () => {
    try {
      const data = await apiFetch('/api/tenants');
      if (Array.isArray(data) && data.length > 0) {
        setTenants(data);
      }
    } catch (err) {
      console.error('Failed to load MSTR_DATA tenants:', err);
    }
  }, [apiFetch]);

  const reloadRoles = useCallback(async () => {
    try {
      const data = await apiFetch(`/api/roles?tenantId=${activeTenantId}`);
      if (Array.isArray(data) && data.length > 0) {
        setRoles(data);
        setActiveRoleCode((prev) =>
          data.some((r) => r.roleCode === prev) ? prev : data[0].roleCode
        );
      }
    } catch (err) {
      console.error('Failed to load MSTR_DATA roles:', err);
    }
  }, [apiFetch, activeTenantId]);

  useEffect(() => {
    reloadTenants();
    reloadRoles();
  }, [reloadTenants, reloadRoles]);

  const currentTenant = tenants.find((t) => t.tenantId === Number(activeTenantId)) || tenants[0];
  const activeRole = roles.find((r) => r.roleCode === activeRoleCode) || roles[0];
  const sidebarColor = currentTenant?.primaryColor || '#013a12';
  const accentColor = currentTenant?.accentColor || '#f59e0b';
  const brandTitle = currentTenant?.brandTitle || 'Helios';
  const brandSubtitle = currentTenant?.brandSubtitle || 'INSURANCE MANAGEMENT SUITE';
  const drawerWidth = sidebarCollapsed ? 72 : 250;

  const dynamicTheme = useMemo(
    () => buildTenantTheme(sidebarColor, accentColor),
    [sidebarColor, accentColor]
  );

  const allNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutGrid size={18} /> },
    { id: 'inbox', label: 'Document Inbox', icon: <Inbox size={18} /> },
    { id: 'policy', label: 'Policies', icon: <FileText size={18} /> },
    { id: 'submissions', label: 'Submissions', icon: <Files size={18} /> },
    { id: 'quotes', label: 'Quotes & Rating', icon: <Calculator size={18} /> },
    { id: 'documents', label: 'Documents & Forms', icon: <Printer size={18} /> },
    { id: 'claims', label: 'Claims', icon: <AlertCircle size={18} /> }
  ];

  const tenantModuleSet = new Set(
    (currentTenant?.enabledModules || 'dashboard,policy,submissions,claims,documents')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  );
  const roleModuleSet = new Set(
    (activeRole?.allowedModules || 'dashboard,policy,submissions,claims,documents')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  );

  const navItems = allNavItems.filter(
    (item) => item.id === 'dashboard' || item.id === 'inbox' || item.id === 'quotes' || item.id === 'documents' || (tenantModuleSet.has(item.id) && roleModuleSet.has(item.id))
  );

  useEffect(() => {
    if (!navItems.some((item) => item.id === activeView)) {
      setActiveView('dashboard');
    }
  }, [navItems, activeView]);

  const renderView = () => {
    switch (activeView) {
      case 'dashboard':
        return (
          <DashboardView
            apiFetch={apiFetch}
            activeTenantId={activeTenantId}
            currentTenant={currentTenant}
            activeRole={activeRole}
            onNavigate={setActiveView}
          />
        );
      case 'inbox':
        return <IncomingDocumentsView apiFetch={apiFetch} activeTenantId={activeTenantId} activeRole={activeRole} onNavigate={setActiveView} />;
      case 'policy':
        return <PoliciesView apiFetch={apiFetch} activeTenantId={activeTenantId} />;
      case 'submissions':
        return <SubmissionsView apiFetch={apiFetch} activeTenantId={activeTenantId} activeRole={activeRole} onNavigate={setActiveView} />;
      case 'quotes':
        return <QuotesView apiFetch={apiFetch} activeTenantId={activeTenantId} activeRole={activeRole} onNavigate={setActiveView} />;
      case 'documents':
        return <DocumentsView apiFetch={apiFetch} activeTenantId={activeTenantId} activeRole={activeRole} onNavigate={setActiveView} />;
      case 'claims':
        return <ClaimsView apiFetch={apiFetch} activeTenantId={activeTenantId} activeRole={activeRole} />;
      default:
        return (
          <DashboardView
            apiFetch={apiFetch}
            activeTenantId={activeTenantId}
            currentTenant={currentTenant}
            activeRole={activeRole}
            onNavigate={setActiveView}
          />
        );
    }
  };

  const getBreadcrumb = () => {
    const map = {
      dashboard: 'Dashboard',
      inbox: 'Document Intake Inbox & Queue',
      policy: 'Policies',
      submissions: 'Submissions',
      quotes: 'Quotes & Rating',
      documents: 'Documents & Intake Center',
      claims: 'Claims'
    };
    return map[activeView] || 'Dashboard';
  };

  if (!currentUser) {
    return (
      <ThemeProvider theme={buildTenantTheme('#013a12', '#f59e0b')}>
        <CssBaseline />
        <LoginView onLoginSuccess={handleLoginSuccess} tenants={tenants} />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={dynamicTheme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
        {/* Left Dynamic Tenant-Themed Collapsible Sidebar */}
        <Drawer
          variant="permanent"
          sx={{
            width: drawerWidth,
            flexShrink: 0,
            transition: 'width 0.2s ease',
            [`& .MuiDrawer-paper`]: {
              width: drawerWidth,
              boxSizing: 'border-box',
              backgroundColor: sidebarColor,
              color: '#ffffff',
              borderRight: 'none',
              overflowX: 'hidden',
              transition: 'width 0.2s ease, background-color 0.25s ease'
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
                <Box
                  onClick={() => setActiveView('dashboard')}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.25,
                    cursor: 'pointer',
                    minWidth: 0
                  }}
                >
                  <HeliosBrandIcon primaryColor={sidebarColor} accentColor={accentColor} />
                  <Typography
                    noWrap
                    sx={{
                      fontSize: '1.35rem',
                      fontWeight: 700,
                      color: '#ffffff',
                      letterSpacing: '0.01em',
                      lineHeight: 1.2
                    }}
                  >
                    {brandTitle}
                  </Typography>
                </Box>
              )}
              <IconButton
                size="small"
                title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                onClick={() => setSidebarCollapsed((prev) => !prev)}
                sx={{
                  color: 'rgba(255,255,255,0.75)',
                  '&:hover': {
                    color: '#ffffff',
                    backgroundColor: 'rgba(255,255,255,0.1)'
                  }
                }}
              >
                <MenuIcon size={18} />
              </IconButton>
            </Box>
            {!sidebarCollapsed && (
              <Typography
                noWrap
                sx={{
                  fontSize: '0.62rem',
                  fontWeight: 600,
                  letterSpacing: '0.12em',
                  color: 'rgba(255, 255, 255, 0.55)',
                  textTransform: 'uppercase'
                }}
              >
                {brandSubtitle}
              </Typography>
            )}
          </Box>

          <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.08)' }} />

          {/* Dark Translucent Tenant Selector Box */}
          <Box sx={{ px: sidebarCollapsed ? 1.25 : 2, py: 2 }}>
            <Box
              title={`Tenant: ${getTenantShortLabel(currentTenant)}`}
              onClick={(e) => setTenantMenuAnchor(e.currentTarget)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: sidebarCollapsed ? 'center' : 'space-between',
                p: sidebarCollapsed ? 0.9 : 1.25,
                borderRadius: '10px',
                backgroundColor: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                cursor: 'pointer',
                transition: 'background-color 0.15s ease',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)'
                }
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, overflow: 'hidden' }}>
                <Avatar
                  sx={{
                    width: 32,
                    height: 32,
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    bgcolor: 'rgba(255, 255, 255, 0.15)',
                    color: '#ffffff'
                  }}
                >
                  {getTenantInitials(currentTenant)}
                </Avatar>
                {!sidebarCollapsed && (
                  <Box sx={{ overflow: 'hidden' }}>
                    <Typography
                      sx={{
                        fontSize: '0.62rem',
                        fontWeight: 600,
                        letterSpacing: '0.08em',
                        color: 'rgba(255, 255, 255, 0.55)',
                        lineHeight: 1.1
                      }}
                    >
                      TENANT
                    </Typography>
                    <Typography
                      noWrap
                      sx={{
                        fontSize: '0.84rem',
                        fontWeight: 600,
                        color: '#ffffff',
                        lineHeight: 1.3
                      }}
                    >
                      {getTenantShortLabel(currentTenant)}
                    </Typography>
                  </Box>
                )}
              </Box>
              {!sidebarCollapsed && <ChevronsUpDown size={16} color="rgba(255, 255, 255, 0.55)" />}
            </Box>

            <MuiMenu
              anchorEl={tenantMenuAnchor}
              open={Boolean(tenantMenuAnchor)}
              onClose={() => setTenantMenuAnchor(null)}
              slotProps={{
                paper: {
                  sx: { width: 230, mt: 0.5 }
                }
              }}
            >
              {tenants.map((t) => (
                <MenuItem
                  key={t.tenantId}
                  selected={t.tenantId === Number(activeTenantId)}
                  onClick={() => {
                    setActiveTenantId(t.tenantId);
                    setTenantMenuAnchor(null);
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        backgroundColor: t.primaryColor || '#013a12',
                        border: `2px solid ${t.accentColor || '#f59e0b'}`
                      }}
                    />
                    <Box>
                      <Typography variant="body2" fontWeight={600}>
                        {getTenantShortLabel(t)}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        DB: {t.dbCatalogName}
                      </Typography>
                    </Box>
                  </Box>
                </MenuItem>
              ))}
            </MuiMenu>
          </Box>

          {/* Sidebar Navigation Menu */}
          <Box sx={{ px: sidebarCollapsed ? 1 : 1.75, mt: 0.5 }}>
            <List disablePadding>
              {navItems.map((item) => {
                const isSelected = activeView === item.id;
                return (
                  <ListItem key={item.id} disablePadding sx={{ mb: 0.6 }}>
                    <ListItemButton
                      title={sidebarCollapsed ? item.label : undefined}
                      selected={isSelected}
                      onClick={() => setActiveView(item.id)}
                      sx={{
                        borderRadius: '8px',
                        py: 1.1,
                        px: sidebarCollapsed ? 1.25 : 1.5,
                        justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                        color: isSelected ? '#ffffff' : 'rgba(255, 255, 255, 0.72)',
                        '&.Mui-selected': {
                          backgroundColor: 'rgba(255, 255, 255, 0.14)',
                          color: '#ffffff',
                          '&:hover': {
                            backgroundColor: 'rgba(255, 255, 255, 0.18)'
                          }
                        },
                        '&:hover': {
                          backgroundColor: 'rgba(255, 255, 255, 0.08)',
                          color: '#ffffff'
                        }
                      }}
                    >
                      <ListItemIcon
                        sx={{
                          minWidth: sidebarCollapsed ? 'auto' : 34,
                          justifyContent: 'center',
                          color: isSelected ? '#ffffff' : 'rgba(255, 255, 255, 0.72)'
                        }}
                      >
                        {item.icon}
                      </ListItemIcon>
                      {!sidebarCollapsed && (
                        <ListItemText
                          primary={item.label}
                          primaryTypographyProps={{
                            fontSize: '0.88rem',
                            fontWeight: isSelected ? 600 : 500
                          }}
                        />
                      )}
                    </ListItemButton>
                  </ListItem>
                );
              })}
            </List>
          </Box>

          {/* Sidebar User Profile & Sign Out Footer */}
          <Box sx={{ p: 1.5, mt: 'auto', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: sidebarCollapsed ? 'center' : 'space-between',
                p: 0.75,
                borderRadius: '8px',
                backgroundColor: 'rgba(255, 255, 255, 0.05)'
              }}
            >
              {!sidebarCollapsed && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                  <Avatar sx={{ width: 26, height: 26, fontSize: '0.72rem', backgroundColor: accentColor, color: '#000000', fontWeight: 700 }}>
                    {currentUser?.displayName ? currentUser.displayName.slice(0, 2).toUpperCase() : 'U'}
                  </Avatar>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography noWrap sx={{ fontSize: '0.78rem', fontWeight: 700, color: '#ffffff' }}>
                      {currentUser?.displayName || 'User'}
                    </Typography>
                    <Typography noWrap sx={{ fontSize: '0.66rem', color: 'rgba(255,255,255,0.6)' }}>
                      {activeRole?.roleName || currentUser?.roleCode}
                    </Typography>
                  </Box>
                </Box>
              )}
              <IconButton
                size="small"
                title="Sign Out"
                onClick={handleLogout}
                sx={{ color: 'rgba(255,255,255,0.7)', '&:hover': { color: '#ef4444', backgroundColor: 'rgba(239,68,68,0.1)' } }}
              >
                <LogOut size={16} />
              </IconButton>
            </Box>
          </Box>
        </Drawer>

        {/* Main Right Content Area */}
        <Box component="main" sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', height: '100vh' }}>
          {/* Top White Header Bar */}
          <AppBar
            position="static"
            color="transparent"
            elevation={0}
            sx={{
              borderBottom: '1px solid #e2e8f0',
              backgroundColor: '#ffffff',
              height: 56,
              justifyContent: 'center'
            }}
          >
            <Toolbar sx={{ justifyContent: 'space-between', minHeight: '56px !important', px: 3.5 }}>
              {/* Breadcrumb: Home > Dashboard */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography
                  onClick={() => setActiveView('dashboard')}
                  sx={{
                    fontSize: '0.82rem',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    '&:hover': { color: '#475569' }
                  }}
                >
                  Home
                </Typography>
                <ChevronRight size={14} color="#cbd5e1" />
                <Typography sx={{ fontSize: '0.82rem', fontWeight: 600, color: '#1e293b' }}>
                  {getBreadcrumb()}
                </Typography>
              </Box>

              {/* Right Active Role Switcher & Notification Bell */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box
                  onClick={(e) => setRoleMenuAnchor(e.currentTarget)}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    px: 1.5,
                    py: 0.5,
                    borderRadius: '999px',
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    cursor: 'pointer',
                    '&:hover': { backgroundColor: '#f1f5f9' }
                  }}
                >
                  <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                    Role:
                  </Typography>
                  <Typography sx={{ fontSize: '0.78rem', fontWeight: 600, color: sidebarColor }}>
                    {activeRole?.roleName || 'Portfolio Executive'}
                  </Typography>
                  <ChevronsUpDown size={14} color="#64748b" />
                </Box>

                <MuiMenu
                  anchorEl={roleMenuAnchor}
                  open={Boolean(roleMenuAnchor)}
                  onClose={() => setRoleMenuAnchor(null)}
                >
                  {roles.map((r) => (
                    <MenuItem
                      key={r.roleCode}
                      selected={r.roleCode === activeRole?.roleCode}
                      onClick={() => {
                        setActiveRoleCode(r.roleCode);
                        setRoleMenuAnchor(null);
                      }}
                    >
                      <Box>
                        <Typography variant="body2" fontWeight={600}>
                          {r.roleName}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          Modules: {r.allowedModules}
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </MuiMenu>

                {/* Logged In User Profile Pill */}
                <Box
                  onClick={(e) => setUserMenuAnchor(e.currentTarget)}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    px: 1.25,
                    py: 0.5,
                    borderRadius: '999px',
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    cursor: 'pointer',
                    '&:hover': { backgroundColor: '#f1f5f9' }
                  }}
                >
                  <Avatar
                    sx={{
                      width: 26,
                      height: 26,
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      backgroundColor: sidebarColor,
                      color: '#ffffff'
                    }}
                  >
                    {currentUser?.displayName
                      ? currentUser.displayName.split(' ').map((n) => n[0]).join('').slice(0, 2)
                      : 'U'}
                  </Avatar>
                  <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: '#1e293b', display: { xs: 'none', sm: 'block' } }}>
                    {currentUser?.displayName || 'User'}
                  </Typography>
                  <ChevronsUpDown size={13} color="#64748b" />
                </Box>

                <MuiMenu
                  anchorEl={userMenuAnchor}
                  open={Boolean(userMenuAnchor)}
                  onClose={() => setUserMenuAnchor(null)}
                >
                  <Box sx={{ px: 2, py: 1.5, minWidth: 220 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {currentUser?.displayName}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                      {currentUser?.email || `${currentUser?.username}@ortaleza.com`}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#0284c7', display: 'block', mt: 0.5 }}>
                      Dept: {currentUser?.department || 'Operations'}
                    </Typography>
                    <Chip
                      label={`Tenant: ${currentTenant?.tenantName || activeTenantId}`}
                      size="small"
                      sx={{ mt: 1, fontSize: '0.68rem', height: 20 }}
                    />
                  </Box>
                  <Divider />
                  <MenuItem
                    onClick={() => {
                      setUserMenuAnchor(null);
                      setRoleMenuAnchor(document.body);
                    }}
                  >
                    <ListItemIcon><ShieldCheck size={16} /></ListItemIcon>
                    <ListItemText primary="Switch Active Role" />
                  </MenuItem>
                  <MenuItem onClick={handleLogout}>
                    <ListItemIcon><LogOut size={16} color="#ef4444" /></ListItemIcon>
                    <ListItemText primary="Sign Out / Switch User" sx={{ color: '#ef4444', fontWeight: 600 }} />
                  </MenuItem>
                </MuiMenu>

                <IconButton size="small" sx={{ position: 'relative', color: '#64748b' }}>
                  <Bell size={18} />
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 5,
                      right: 6,
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      backgroundColor: '#ef4444'
                    }}
                  />
                </IconButton>
              </Box>
            </Toolbar>
          </AppBar>

          {/* Main Scrollable View Container */}
          <Box sx={{ flexGrow: 1, py: 4, px: { xs: 3, md: 5 }, overflow: 'auto', backgroundColor: '#f8fafc' }}>
            <Box sx={{ maxWidth: 1180, mx: 'auto' }}>
              {renderView()}
            </Box>
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  );
}
