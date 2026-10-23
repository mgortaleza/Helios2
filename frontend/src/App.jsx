import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  Calculator
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

// --- 3. Submissions View ---
const SubmissionsView = ({ apiFetch, activeTenantId, activeRole }) => {
  const [subTab, setSubTab] = useState(0);
  const [submissions, setSubmissions] = useState([]);
  const [parties, setParties] = useState([]);
  const [selectedPartyId, setSelectedPartyId] = useState(null);
  const [partySearch, setPartySearch] = useState('');
  const [newOrgName, setNewOrgName] = useState('');
  const [openAddOrg, setOpenAddOrg] = useState(false);
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
    async (q = '') => {
      try {
        const data = await apiFetch(`/api/parties?q=${encodeURIComponent(q)}`);
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
    loadParties('');
  }, [loadSubmissions, loadParties, activeTenantId]);

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

  const handleAddOrg = async (e) => {
    e.preventDefault();
    if (!newOrgName.trim()) return;
    try {
      const created = await apiFetch('/api/parties', {
        method: 'POST',
        body: JSON.stringify({ orgName: newOrgName.trim() })
      });
      setOpenAddOrg(false);
      setNewOrgName('');
      await loadParties('');
      setSelectedPartyId(created.id);
      setSubTab(1);
      setFlash({ type: 'success', text: `Saved organization: ${created.name}` });
    } catch (err) {
      setFlash({ type: 'error', text: err.message });
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
                    <TableCell align="right">Details</TableCell>
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
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>

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
            {canAddOrganization ? 'Add Organization' : 'Add Organization (Restricted)'}
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
          <Tab label="Organizations (Select Row to Create Submission)" />
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
                loadParties(partySearch);
              }}
              sx={{ display: 'flex', gap: 2, mb: 2.5 }}
            >
              <TextField
                size="small"
                fullWidth
                label="Search Organization Name"
                value={partySearch}
                onChange={(e) => setPartySearch(e.target.value)}
              />
              <Button type="submit" variant="contained" color="primary" sx={{ minWidth: 120 }}>
                Search
              </Button>
            </Box>

            <TableContainer component={Paper} elevation={0} variant="outlined">
              <Table>
                <TableHead sx={{ backgroundColor: '#f8fafc' }}>
                  <TableRow>
                    <TableCell sx={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b' }}>
                      ORGANIZATION NAME
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {parties.map((party) => {
                    const isSelected = party.id === selectedPartyId;
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
                        <TableCell sx={{ fontWeight: isSelected ? 700 : 500 }}>
                          {party.name}
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
                    : 'Select an Organization to Rate & Submit'}
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

      <Dialog open={openAddOrg} onClose={() => setOpenAddOrg(false)} maxWidth="xs" fullWidth>
        <form onSubmit={handleAddOrg}>
          <DialogTitle>Add New Organization</DialogTitle>
          <DialogContent dividers>
            <TextField
              label="Organization Name"
              size="small"
              fullWidth
              required
              value={newOrgName}
              onChange={(e) => setNewOrgName(e.target.value)}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenAddOrg(false)}>Cancel</Button>
            <Button type="submit" variant="contained" color="primary">
              Save Organization
            </Button>
          </DialogActions>
        </form>
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
      setRatingForm((prev) => ({
        ...prev,
        productCode: pCode,
        classCode: pCode === 'MED_MAL' ? 'PHYS_SURGERY' : (pCode === 'DNO' ? 'CORP_PRIVATE' : 'TECH_SAAS'),
        underwriter: submission.fileLevelInfo?.underwriter || 'Michael Chang',
        effectiveDate: submission.fileLevelInfo?.effectiveDate || new Date().toISOString().slice(0, 10)
      }));
    } else if (submissions && submissions.length > 0) {
      setSelectedSubId(submissions[0].submsnId);
    }
    setRateResult(null);
    setError(null);
  }, [open, submission?.submsnId]);

  const activeSub = submission || (submissions || []).find((s) => s.submsnId === Number(selectedSubId));

  const handleCalculateRate = async () => {
    setIsRating(true);
    setError(null);
    const exposure = parseNum(ratingForm.exposureValue, 10000000);
    const occLimit = parseNum(ratingForm.occurrenceLimit, 5000000);
    const aggLimit = parseNum(ratingForm.aggregateLimit, 5000000);
    const retention = parseNum(ratingForm.retentionAmount, 50000);
    const schedMod = parseNum(ratingForm.scheduleMod, 0.90);

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
          color="secondary"
          fullWidth
          size="large"
          startIcon={isRating ? <CircularProgress size={18} color="inherit" /> : <Calculator size={18} />}
          disabled={isRating}
          onClick={handleCalculateRate}
        >
          {isRating ? 'Invoking Rating Algorithm & Matrix...' : 'Run Rating Calculation (SERFF Engine)'}
        </Button>

        {rateResult && (
          <Box sx={{ mt: 1 }}>
            <Paper variant="outlined" sx={{ p: 2.5, backgroundColor: '#f8fafc', borderLeft: '4px solid #0284c7' }}>
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
                  <Typography variant="body2" sx={{ fontWeight: 700, color: '#0284c7', mt: 0.5 }}>
                    SERFF: {rateResult.serffTrackingNumber}
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
                  Algorithm Execution Audit Trace:
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

// --- Main Application Shell (Matches Uploaded Design Screenshot + Per-Tenant & Per-Role UI Customization) ---
export default function App() {
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
  const [activeTenantId, setActiveTenantId] = useState(1);
  const [activeRoleCode, setActiveRoleCode] = useState('EXECUTIVE');
  const [tenantMenuAnchor, setTenantMenuAnchor] = useState(null);
  const [roleMenuAnchor, setRoleMenuAnchor] = useState(null);

  const apiFetch = useCallback(
    async (path, options = {}) => {
      const headers = {
        'Content-Type': 'application/json',
        'X-Tenant-ID': String(activeTenantId),
        ...(options.headers || {})
      };
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
    { id: 'policy', label: 'Policies', icon: <FileText size={18} /> },
    { id: 'submissions', label: 'Submissions', icon: <Files size={18} /> },
    { id: 'quotes', label: 'Quotes & Rating', icon: <Calculator size={18} /> },
    { id: 'claims', label: 'Claims', icon: <AlertCircle size={18} /> }
  ];

  const tenantModuleSet = new Set(
    (currentTenant?.enabledModules || 'dashboard,policy,submissions,claims')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  );
  const roleModuleSet = new Set(
    (activeRole?.allowedModules || 'dashboard,policy,submissions,claims')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  );

  const navItems = allNavItems.filter(
    (item) => item.id === 'dashboard' || item.id === 'quotes' || (tenantModuleSet.has(item.id) && roleModuleSet.has(item.id))
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
      case 'policy':
        return <PoliciesView apiFetch={apiFetch} activeTenantId={activeTenantId} />;
      case 'submissions':
        return <SubmissionsView apiFetch={apiFetch} activeTenantId={activeTenantId} activeRole={activeRole} onNavigate={setActiveView} />;
      case 'quotes':
        return <QuotesView apiFetch={apiFetch} activeTenantId={activeTenantId} activeRole={activeRole} onNavigate={setActiveView} />;
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
      policy: 'Policies',
      submissions: 'Submissions',
      quotes: 'Quotes & Rating',
      claims: 'Claims'
    };
    return map[activeView] || 'Dashboard';
  };

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
