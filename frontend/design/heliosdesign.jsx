import React, { useState, useMemo } from 'react';
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
  Breadcrumbs,
  Link,
  Grid
} from '@mui/material';
import {
  LayoutDashboard,
  FileText,
  Send,
  ShieldAlert,
  Bell,
  Settings,
  User,
  ChevronRight,
  Briefcase
} from 'lucide-react';

// --- Theme Configuration ---
const heliosTheme = createTheme({
  palette: {
    primary: {
      main: '#004812', // W.R. Berkley inspired Dark Green
      light: '#336c41',
      dark: '#00320c',
    },
    secondary: {
      main: '#005b7f',
    },
    background: {
      default: '#f4f6f8',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
  },
  components: {
    MuiButton: {
      styleOverrides: { root: { textTransform: 'none', borderRadius: 6 } },
    },
    MuiCard: {
      styleOverrides: { root: { borderRadius: 8, boxShadow: '0 2px 10px rgba(0,0,0,0.05)' } },
    },
  },
});

// --- Mock Data ---
const MOCK_TENANTS = [
  { id: 't1', name: 'Acme Brokers Inc.', logo: 'AB' },
  { id: 't2', name: 'Global Risk Partners', logo: 'GR' },
];

const TASKS = [
  { id: 1, title: 'Review E&O Endorsement', type: 'Underwriting', subType: 'Endorsement Review', status: 'Pending', dueDate: '2026-10-23' },
  { id: 2, title: 'D&O Renewal Follow-up', type: 'Administrative', subType: 'Client Communication', status: 'In Progress', dueDate: '2026-10-24' },
  { id: 3, title: 'Approve Cyber Liability Quote', type: 'Underwriting', subType: 'Quote Approval', status: 'Urgent', dueDate: '2026-10-22' },
  { id: 4, title: 'Audit Medical Malpractice File', type: 'Compliance', subType: 'File Audit', status: 'Pending', dueDate: '2026-10-28' },
];

const POLICIES = [
  {
    id: 'POL-2026-8832',
    name: 'TechSolutions Corp',
    productType: 'Technology E&O',
    fileStatus: 'Active',
    address: '101 Innovation Blvd, San Francisco, CA 94107',
    industry: 'Software Development',
    agencyInfo: 'Acme Brokers Inc. - Agent: Sarah Jenkins',
    submissions: [
      {
        id: 'SUB-9921',
        date: '2026-09-15',
        status: 'Bound',
        fileLevelInfo: {
          underwriter: 'Michael Chang',
          effectiveDate: '2026-10-01',
          expirationDate: '2027-10-01',
          retroactiveDate: '2024-10-01',
          limit: '$5,000,000',
          retention: '$50,000',
        },
        quotes: [
          { quoteId: 'Q-4432A', premium: '$32,500', status: 'Accepted', generated: '2026-09-10' },
          { quoteId: 'Q-4432B', premium: '$28,000', status: 'Declined', generated: '2026-09-08' }
        ]
      },
      {
        id: 'SUB-7710',
        date: '2025-09-10',
        status: 'Expired',
        fileLevelInfo: {
          underwriter: 'Michael Chang',
          effectiveDate: '2025-10-01',
          expirationDate: '2026-10-01',
          retroactiveDate: '2024-10-01',
          limit: '$3,000,000',
          retention: '$25,000',
        },
        quotes: [
          { quoteId: 'Q-2211', premium: '$25,000', status: 'Accepted', generated: '2025-09-05' }
        ]
      }
    ]
  },
  {
    id: 'POL-2026-9104',
    name: 'Apex Healthcare Partners',
    productType: 'Medical Malpractice',
    fileStatus: 'Under Review',
    address: '400 Medical Center Dr, Chicago, IL 60612',
    industry: 'Healthcare Services',
    agencyInfo: 'Global Risk Partners - Agent: David Thorne',
    submissions: [
      {
        id: 'SUB-9945',
        date: '2026-10-20',
        status: 'Quoted',
        fileLevelInfo: {
          underwriter: 'Alicia Keys',
          effectiveDate: '2026-11-15',
          expirationDate: '2027-11-15',
          retroactiveDate: '2015-01-01',
          limit: '$10,000,000',
          retention: '$100,000',
        },
        quotes: [
          { quoteId: 'Q-5590', premium: '$145,000', status: 'Pending', generated: '2026-10-21' }
        ]
      }
    ]
  }
];

// --- Components ---

const AbstractLogo = () => (
  <svg width="48" height="48" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="20" y="20" width="60" height="60" rx="16" fill="#004812" transform="rotate(45 50 50)" opacity="0.9"/>
    <rect x="30" y="30" width="40" height="40" rx="8" fill="#4CAF50" transform="rotate(45 50 50)" opacity="0.8"/>
    <rect x="40" y="40" width="20" height="20" rx="4" fill="#ffffff" transform="rotate(45 50 50)"/>
  </svg>
);

const DashboardView = () => {
  const [typeFilter, setTypeFilter] = useState('');
  const [subTypeFilter, setSubTypeFilter] = useState('');

  const filteredTasks = useMemo(() => {
    return TASKS.filter(task => {
      const matchType = typeFilter === '' || task.type === typeFilter;
      const matchSubType = subTypeFilter === '' || task.subType === subTypeFilter;
      return matchType && matchSubType;
    });
  }, [typeFilter, subTypeFilter]);

  // Derive subtypes based on selected type
  const availableSubTypes = useMemo(() => {
    if (!typeFilter) return Array.from(new Set(TASKS.map(t => t.subType)));
    return Array.from(new Set(TASKS.filter(t => t.type === typeFilter).map(t => t.subType)));
  }, [typeFilter]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'Urgent': return 'error';
      case 'In Progress': return 'warning';
      case 'Pending': return 'info';
      default: return 'default';
    }
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Dashboard</Typography>
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">My Tasks</Typography>
            <Box display="flex" gap={2}>
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Task Type</InputLabel>
                <Select
                  value={typeFilter}
                  label="Task Type"
                  onChange={(e) => {
                    setTypeFilter(e.target.value);
                    setSubTypeFilter(''); // Reset subtype when type changes
                  }}
                >
                  <MenuItem value=""><em>All Types</em></MenuItem>
                  <MenuItem value="Underwriting">Underwriting</MenuItem>
                  <MenuItem value="Administrative">Administrative</MenuItem>
                  <MenuItem value="Compliance">Compliance</MenuItem>
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 150 }} disabled={availableSubTypes.length === 0}>
                <InputLabel>Task Subtype</InputLabel>
                <Select
                  value={subTypeFilter}
                  label="Task Subtype"
                  onChange={(e) => setSubTypeFilter(e.target.value)}
                >
                  <MenuItem value=""><em>All Subtypes</em></MenuItem>
                  {availableSubTypes.map(st => (
                    <MenuItem key={st} value={st}>{st}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </Box>
          <TableContainer component={Paper} elevation={0} variant="outlined">
            <Table>
              <TableHead sx={{ backgroundColor: '#f9fafb' }}>
                <TableRow>
                  <TableCell>Title</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Subtype</TableCell>
                  <TableCell>Due Date</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredTasks.map((task) => (
                  <TableRow key={task.id} hover sx={{ cursor: 'pointer' }}>
                    <TableCell>{task.title}</TableCell>
                    <TableCell>{task.type}</TableCell>
                    <TableCell>{task.subType}</TableCell>
                    <TableCell>{task.dueDate}</TableCell>
                    <TableCell>
                      <Chip label={task.status} color={getStatusColor(task.status)} size="small" />
                    </TableCell>
                  </TableRow>
                ))}
                {filteredTasks.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 3 }}>No tasks match the selected filters.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );
};

const PoliciesView = () => {
  const [selectedPolicy, setSelectedPolicy] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [activeFileId, setActiveFileId] = useState(null);

  const handlePolicySelect = (policy) => {
    setSelectedPolicy(policy);
    // Automatically select the most recent submission (assuming array is sorted descending by date or id)
    if (policy.submissions && policy.submissions.length > 0) {
      setActiveFileId(policy.submissions[0].id);
    }
    // Switch to Active File tab
    setActiveTab(1); 
  };

  const handleBackToSearch = () => {
    setSelectedPolicy(null);
    setActiveTab(0);
    setActiveFileId(null);
  };

  if (selectedPolicy) {
    const activeFile = selectedPolicy.submissions.find(sub => sub.id === activeFileId) || selectedPolicy.submissions[0];

    return (
      <Box>
        <Box mb={2}>
          <Button variant="text" onClick={handleBackToSearch} startIcon={<ChevronRight style={{ transform: 'rotate(180deg)' }} />}>
            Back to Policy Search
          </Button>
        </Box>
        
        {/* Detail Header Box */}
        <Card sx={{ mb: 3, borderTop: '4px solid #004812' }}>
          <CardContent>
            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <Typography variant="caption" color="textSecondary" textTransform="uppercase" fontWeight="bold">Insured Address</Typography>
                <Typography variant="body1" mt={1}>{selectedPolicy.name}</Typography>
                <Typography variant="body2" color="textSecondary">{selectedPolicy.address}</Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="caption" color="textSecondary" textTransform="uppercase" fontWeight="bold">Industry Sector</Typography>
                <Typography variant="body1" mt={1} display="flex" alignItems="center">
                  <Briefcase size={16} style={{ marginRight: 8, color: '#004812' }} />
                  {selectedPolicy.industry}
                </Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="caption" color="textSecondary" textTransform="uppercase" fontWeight="bold">Agency Information</Typography>
                <Typography variant="body1" mt={1}>{selectedPolicy.agencyInfo}</Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Navigation Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
            <Tab label="File List" />
            <Tab label="Active File" />
          </Tabs>
        </Box>

        {/* Tab 0: File List */}
        {activeTab === 0 && (
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Submissions & Files</Typography>
              <TableContainer component={Paper} elevation={0} variant="outlined">
                <Table>
                  <TableHead sx={{ backgroundColor: '#f9fafb' }}>
                    <TableRow>
                      <TableCell>File ID</TableCell>
                      <TableCell>Date</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="right">Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedPolicy.submissions.map((sub) => (
                      <TableRow key={sub.id} hover>
                        <TableCell fontWeight="bold">{sub.id}</TableCell>
                        <TableCell>{sub.date}</TableCell>
                        <TableCell><Chip label={sub.status} size="small" color={sub.status === 'Bound' ? 'success' : 'default'} /></TableCell>
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

        {/* Tab 1: Active File (File Level + Quote Level info) */}
        {activeTab === 1 && activeFile && (
          <Box display="flex" flexDirection="column" gap={3}>
            {/* File Level Information */}
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6">File Level Information: {activeFile.id}</Typography>
                  <Chip label={activeFile.status} color={activeFile.status === 'Bound' ? 'success' : 'primary'} />
                </Box>
                <Divider sx={{ mb: 2 }} />
                <Grid container spacing={3}>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="caption" color="textSecondary">Underwriter</Typography>
                    <Typography variant="body2" fontWeight="medium">{activeFile.fileLevelInfo.underwriter}</Typography>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="caption" color="textSecondary">Effective Date</Typography>
                    <Typography variant="body2" fontWeight="medium">{activeFile.fileLevelInfo.effectiveDate}</Typography>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="caption" color="textSecondary">Expiration Date</Typography>
                    <Typography variant="body2" fontWeight="medium">{activeFile.fileLevelInfo.expirationDate}</Typography>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="caption" color="textSecondary">Retroactive Date</Typography>
                    <Typography variant="body2" fontWeight="medium">{activeFile.fileLevelInfo.retroactiveDate}</Typography>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="caption" color="textSecondary">Limit</Typography>
                    <Typography variant="body2" fontWeight="medium">{activeFile.fileLevelInfo.limit}</Typography>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="caption" color="textSecondary">Retention</Typography>
                    <Typography variant="body2" fontWeight="medium">{activeFile.fileLevelInfo.retention}</Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Quote Level Information */}
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Quote Level Information</Typography>
                <TableContainer component={Paper} elevation={0} variant="outlined">
                  <Table size="small">
                    <TableHead sx={{ backgroundColor: '#f9fafb' }}>
                      <TableRow>
                        <TableCell>Quote ID</TableCell>
                        <TableCell>Generated</TableCell>
                        <TableCell>Premium</TableCell>
                        <TableCell>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {activeFile.quotes.map((quote) => (
                        <TableRow key={quote.quoteId}>
                          <TableCell>{quote.quoteId}</TableCell>
                          <TableCell>{quote.generated}</TableCell>
                          <TableCell fontWeight="bold">{quote.premium}</TableCell>
                          <TableCell>
                            <Typography variant="body2" color={quote.status === 'Accepted' ? 'green' : quote.status === 'Declined' ? 'error' : 'textSecondary'}>
                              {quote.status}
                            </Typography>
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
      <Typography variant="h5" gutterBottom>Policy Search</Typography>
      
      {/* Search Criteria */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={3}>
              <TextField fullWidth label="Insured Name" size="small" variant="outlined" />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField fullWidth label="Address" size="small" variant="outlined" />
            </Grid>
            <Grid item xs={12} sm={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Product Type</InputLabel>
                <Select label="Product Type" defaultValue="">
                  <MenuItem value="Tech">Technology E&O</MenuItem>
                  <MenuItem value="MedMal">Medical Malpractice</MenuItem>
                  <MenuItem value="D&O">Directors & Officers</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={2}>
              <FormControl fullWidth size="small">
                <InputLabel>File Status</InputLabel>
                <Select label="File Status" defaultValue="">
                  <MenuItem value="Active">Active</MenuItem>
                  <MenuItem value="Review">Under Review</MenuItem>
                  <MenuItem value="Expired">Expired</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={2}>
              <Button fullWidth variant="contained" color="primary" disableElevation>
                Search
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Results Table */}
      <Card>
        <TableContainer>
          <Table>
            <TableHead sx={{ backgroundColor: '#f9fafb' }}>
              <TableRow>
                <TableCell>Policy Number</TableCell>
                <TableCell>Insured Name</TableCell>
                <TableCell>Product Type</TableCell>
                <TableCell>File Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {POLICIES.map((row) => (
                <TableRow 
                  key={row.id} 
                  hover 
                  onClick={() => handlePolicySelect(row)}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell fontWeight="medium" color="primary">{row.id}</TableCell>
                  <TableCell>{row.name}</TableCell>
                  <TableCell>{row.productType}</TableCell>
                  <TableCell>
                    <Chip 
                      label={row.fileStatus} 
                      size="small" 
                      color={row.fileStatus === 'Active' ? 'success' : 'default'} 
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </Box>
  );
};

// --- Main Layout ---
export default function App() {
  const [activeView, setActiveView] = useState('dashboard');
  const [activeTenant, setActiveTenant] = useState('t1');

  const renderView = () => {
    switch (activeView) {
      case 'dashboard': return <DashboardView />;
      case 'policy': return <PoliciesView />;
      case 'submissions': return <Typography variant="h5">Submissions View (Placeholder)</Typography>;
      case 'claims': return <Typography variant="h5">Claims View (Placeholder)</Typography>;
      default: return <DashboardView />;
    }
  };

  const getBreadcrumb = () => {
    const map = {
      dashboard: 'Dashboard',
      policy: 'Policies',
      submissions: 'Submissions',
      claims: 'Claims'
    };
    return map[activeView];
  };

  return (
    <ThemeProvider theme={heliosTheme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
        
        {/* Sidebar */}
        <Drawer
          variant="permanent"
          sx={{
            width: 280,
            flexShrink: 0,
            [`& .MuiDrawer-paper`]: { width: 280, boxSizing: 'border-box', backgroundColor: '#ffffff', borderRight: '1px solid #e0e0e0' },
          }}
        >
          {/* Brand & Tenant Selector Area */}
          <Box p={3} pb={2}>
            <Box display="flex" alignItems="center" gap={2} mb={1}>
              <AbstractLogo />
              <Box>
                <Typography variant="h5" color="primary" fontWeight="bold" sx={{ letterSpacing: 1 }}>HELIOS</Typography>
              </Box>
            </Box>
            <Typography variant="caption" color="textSecondary" sx={{ ml: 1, display: 'block', mb: 3 }}>
              Insurance Management Suite
            </Typography>

            <FormControl fullWidth size="small">
              <Select
                value={activeTenant}
                onChange={(e) => setActiveTenant(e.target.value)}
                sx={{ borderRadius: 2, backgroundColor: '#f4f6f8' }}
                renderValue={(selected) => {
                  const tenant = MOCK_TENANTS.find(t => t.id === selected);
                  return (
                    <Box display="flex" alignItems="center" gap={1}>
                      <Avatar sx={{ width: 24, height: 24, fontSize: 12, bgcolor: 'primary.main' }}>{tenant.logo}</Avatar>
                      <Typography variant="body2" fontWeight="medium">{tenant.name}</Typography>
                    </Box>
                  );
                }}
              >
                {MOCK_TENANTS.map((tenant) => (
                  <MenuItem key={tenant.id} value={tenant.id}>
                    <Avatar sx={{ width: 24, height: 24, fontSize: 12, bgcolor: 'primary.main', mr: 1 }}>{tenant.logo}</Avatar>
                    {tenant.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
          <Divider />

          {/* Navigation Menu */}
          <Box sx={{ overflow: 'auto', mt: 2, px: 2 }}>
            <List>
              {[
                { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
                { id: 'policy', label: 'Policies', icon: <FileText size={20} /> },
                { id: 'submissions', label: 'Submissions', icon: <Send size={20} /> },
                { id: 'claims', label: 'Claims', icon: <ShieldAlert size={20} /> },
              ].map((item) => (
                <ListItem key={item.id} disablePadding sx={{ mb: 0.5 }}>
                  <ListItemButton
                    selected={activeView === item.id}
                    onClick={() => setActiveView(item.id)}
                    sx={{
                      borderRadius: 2,
                      '&.Mui-selected': {
                        backgroundColor: 'rgba(0, 72, 18, 0.08)',
                        color: 'primary.main',
                        '& .MuiListItemIcon-root': { color: 'primary.main' }
                      },
                      '&:hover': { backgroundColor: 'rgba(0, 72, 18, 0.04)' }
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 40, color: activeView === item.id ? 'primary.main' : '#637381' }}>
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText 
                      primary={item.label} 
                      primaryTypographyProps={{ fontWeight: activeView === item.id ? 600 : 500 }} 
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </Box>
        </Drawer>

        {/* Main Content Area */}
        <Box component="main" sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', height: '100vh' }}>
          {/* Top App Bar */}
          <AppBar position="static" color="transparent" elevation={0} sx={{ borderBottom: '1px solid #e0e0e0', backgroundColor: '#fff' }}>
            <Toolbar sx={{ justifyContent: 'space-between' }}>
              <Breadcrumbs aria-label="breadcrumb">
                <Link underline="hover" color="inherit" href="#">Helios</Link>
                <Typography color="text.primary" fontWeight="medium">{getBreadcrumb()}</Typography>
              </Breadcrumbs>
              
              <Box display="flex" alignItems="center" gap={1}>
                <IconButton size="small"><Search size={20} /></IconButton>
                <IconButton size="small"><Bell size={20} /></IconButton>
                <IconButton size="small"><Settings size={20} /></IconButton>
                <Divider orientation="vertical" flexItem sx={{ mx: 1, my: 1.5 }} />
                <IconButton size="small" sx={{ backgroundColor: 'primary.main', color: 'white', '&:hover': { backgroundColor: 'primary.dark' }}}>
                  <User size={18} />
                </IconButton>
              </Box>
            </Toolbar>
          </AppBar>

          {/* View Container */}
          <Box sx={{ flexGrow: 1, p: 4, overflow: 'auto', backgroundColor: '#f4f6f8' }}>
            <Box maxWidth="xl" mx="auto">
              {renderView()}
            </Box>
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  );
}