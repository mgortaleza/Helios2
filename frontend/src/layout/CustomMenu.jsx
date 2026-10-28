import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  IconButton,
  Avatar,
  Divider,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
  Tooltip
} from '@mui/material';

// Icons
import {
  LayoutGrid,
  ShieldCheck,
  AlertCircle,
  Inbox,
  FileText,
  Files,
  LogOut,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Menu as MenuIcon,
  Calculator,
  Printer,
  FileCheck,
  TrendingUp,
  Folder
} from 'lucide-react';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import FolderSpecialIcon from '@mui/icons-material/FolderSpecial';

import { useDepartment, DEPARTMENTS } from './DepartmentContext.jsx';
import { useTenant } from '../tenantContext.jsx';
import { useAuth } from '../authContext.jsx';

/**
 * Geometric Helios emblem that adapts to tenant primary & accent colors
 */
export const HeliosBrandIcon = ({ primaryColor = '#013a12', accentColor = '#f59e0b' }) => (
  <svg width="26" height="26" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="3" width="11" height="11" rx="2.5" fill={accentColor} />
    <rect x="18" y="3" width="11" height="11" rx="2.5" fill={accentColor} opacity="0.82" />
    <rect x="3" y="18" width="11" height="11" rx="2.5" fill={accentColor} opacity="0.82" />
    <rect x="18" y="18" width="11" height="11" rx="2.5" fill={accentColor} />
    <rect x="10.5" y="10.5" width="11" height="11" rx="2" fill={primaryColor} />
    <rect x="13" y="13" width="6" height="6" rx="1" fill="#ffffff" opacity="0.85" />
  </svg>
);

function getTenantInitials(tenant) {
  if (!tenant) return 'H2';
  const name = tenant.tenantName || 'Helios2';
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function getUserInitials(user) {
  if (!user) return 'U';
  const name = user.displayName || user.username || '';
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase() || 'U';
}

/**
 * CustomMenu: Two-column Cascading Navigation Layout
 * Column 1 (Primary Navigation): Dashboard, Underwriting, Claims (vertical)
 * Column 2 (Cascading Navigation): Document Inbox, Policies, Submissions (or Claims views)
 */
export function CustomMenu() {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    activeDepartment,
    switchDepartment,
    isTier1Collapsed,
    toggleTier1,
    isTier2Open,
    setIsTier2Open
  } = useDepartment();

  const { activeTenant } = useTenant();

  // Accordion state inside Policies and Submissions
  const [policiesOpen, setPoliciesOpen] = useState(true);
  const [submissionsOpen, setSubmissionsOpen] = useState(true);

  // Auto-expand accordions based on route
  useEffect(() => {
    const path = (location.pathname || '') + (location.hash || '');
    const lower = path.toLowerCase();
    if (lower.includes('policies')) {
      setPoliciesOpen(true);
    }
    if (lower.includes('submissions')) {
      setSubmissionsOpen(true);
    }
  }, [location.pathname, location.hash]);

  const currentPath = (location.pathname || '') + (location.hash || '');
  const lowerPath = currentPath.toLowerCase();

  const primaryColor = activeTenant?.primaryColor || '#013a12';
  const accentColor = activeTenant?.accentColor || '#f59e0b';
  const brandTitle = activeTenant?.brandTitle || 'Helios2';
  const brandSubtitle = activeTenant?.brandSubtitle || 'INSURANCE MANAGEMENT SUITE';

  const { currentUser, logout } = useAuth();

  const allowedTier2List = currentUser?.allowedTier2Nav
    ? currentUser.allowedTier2Nav.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)
    : null;

  const isTier2Allowed = (itemKey) => {
    if (!allowedTier2List || allowedTier2List.length === 0) return true;
    return allowedTier2List.includes(itemKey.toLowerCase());
  };

  const handleLogout = () => {
    logout();
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh', flexShrink: 0, zIndex: 1200 }}>
      {/* =========================================================================
          COLUMN 1: PRIMARY VERTICAL NAVIGATION (MAIN NAVIGATION BAR)
         ========================================================================= */}
      <Box
        sx={{
          width: isTier1Collapsed ? 68 : 240,
          backgroundColor: primaryColor,
          color: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          transition: 'width 0.22s cubic-bezier(0.4, 0, 0.2, 1)',
          overflow: 'hidden',
          borderRight: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '2px 0 8px rgba(0,0,0,0.25)'
        }}
      >
        {/* Brand Header with Old Look & Label */}
        <Box
          sx={{
            px: isTier1Collapsed ? 1.25 : 2.5,
            pt: 2.25,
            pb: 1.75,
            display: 'flex',
            alignItems: 'center',
            justifyContent: isTier1Collapsed ? 'center' : 'space-between'
          }}
        >
          {!isTier1Collapsed && (
            <Box
              onClick={() => switchDepartment(DEPARTMENTS.DASHBOARD, true)}
              sx={{ display: 'flex', alignItems: 'center', gap: 1.25, cursor: 'pointer', minWidth: 0 }}
            >
              <HeliosBrandIcon primaryColor={primaryColor} accentColor={accentColor} />
              <Box sx={{ minWidth: 0 }}>
                <Typography
                  noWrap
                  sx={{
                    fontSize: '1.3rem',
                    fontWeight: 800,
                    color: '#ffffff',
                    letterSpacing: '0.01em',
                    lineHeight: 1.2
                  }}
                >
                  {brandTitle}
                </Typography>
                <Typography
                  noWrap
                  sx={{
                    fontSize: '0.58rem',
                    fontWeight: 700,
                    letterSpacing: '0.12em',
                    color: 'rgba(255, 255, 255, 0.65)',
                    textTransform: 'uppercase'
                  }}
                >
                  {brandSubtitle}
                </Typography>
              </Box>
            </Box>
          )}

          {isTier1Collapsed && (
            <Tooltip title={`${brandTitle} - Click to expand`} placement="right">
              <IconButton
                size="small"
                onClick={toggleTier1}
                sx={{ p: 0.5, color: '#ffffff' }}
              >
                <HeliosBrandIcon primaryColor={primaryColor} accentColor={accentColor} />
              </IconButton>
            </Tooltip>
          )}

          {!isTier1Collapsed && (
            <IconButton
              size="small"
              title="Collapse sidebar"
              onClick={toggleTier1}
              sx={{
                color: 'rgba(255,255,255,0.7)',
                '&:hover': { color: '#ffffff', backgroundColor: 'rgba(255,255,255,0.1)' }
              }}
            >
              <MenuIcon size={18} />
            </IconButton>
          )}
        </Box>

        <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.1)' }} />

        {/* Read-Only Tenant Info Block (No dropdown / switcher) */}
        <Box sx={{ px: isTier1Collapsed ? 1.25 : 2, py: 1.75 }}>
          <Box
            title={`${activeTenant?.tenantName || 'Tenant'} (${activeTenant?.dbCatalogName || 'DB'})`}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: isTier1Collapsed ? 'center' : 'flex-start',
              p: isTier1Collapsed ? 0.75 : 1.2,
              borderRadius: '8px',
              backgroundColor: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              userSelect: 'none'
            }}
          >
            <Avatar
              sx={{
                width: 30,
                height: 30,
                fontSize: '0.75rem',
                fontWeight: 800,
                bgcolor: accentColor,
                color: '#000000',
                border: '1.5px solid rgba(255, 255, 255, 0.3)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
              }}
            >
              {getTenantInitials(activeTenant)}
            </Avatar>

            {!isTier1Collapsed && (
              <Box sx={{ ml: 1.25, overflow: 'hidden', minWidth: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <Typography
                    sx={{
                      fontSize: '0.6rem',
                      fontWeight: 700,
                      letterSpacing: '0.08em',
                      color: 'rgba(255, 255, 255, 0.65)',
                      lineHeight: 1
                    }}
                  >
                    ORGANIZATION
                  </Typography>
                  <Box
                    sx={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      backgroundColor: '#10b981',
                      display: 'inline-block'
                    }}
                    title="Active Organization Realm"
                  />
                </Box>
                <Typography
                  noWrap
                  sx={{
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    color: '#ffffff',
                    lineHeight: 1.3
                  }}
                >
                  {activeTenant?.tenantName || 'Helios2 Default Tenant'}
                </Typography>
                {activeTenant?.dbCatalogName && (
                  <Typography
                    noWrap
                    sx={{
                      fontSize: '0.65rem',
                      fontFamily: 'monospace',
                      color: 'rgba(255, 255, 255, 0.6)'
                    }}
                  >
                    [{activeTenant.dbCatalogName}]
                  </Typography>
                )}
              </Box>
            )}
          </Box>
        </Box>

        <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.08)', mb: 1 }} />

        {/* Vertical Primary Navigation Items */}
        <List sx={{ px: 1, py: 0 }}>
          {/* 1. Dashboard */}
          <ListItem disablePadding sx={{ mb: 0.75 }}>
            <Tooltip title={isTier1Collapsed ? 'Dashboard' : ''} placement="right">
              <ListItemButton
                onClick={() => switchDepartment(DEPARTMENTS.DASHBOARD, true)}
                selected={activeDepartment === DEPARTMENTS.DASHBOARD}
                sx={{
                  borderRadius: '8px',
                  px: isTier1Collapsed ? 1.5 : 1.75,
                  py: 1,
                  justifyContent: isTier1Collapsed ? 'center' : 'flex-start',
                  backgroundColor:
                    activeDepartment === DEPARTMENTS.DASHBOARD
                      ? 'rgba(255, 255, 255, 0.18)'
                      : 'transparent',
                  color: '#ffffff',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    color: '#ffffff'
                  }
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: isTier1Collapsed ? 'auto' : 36,
                    color: activeDepartment === DEPARTMENTS.DASHBOARD ? accentColor : 'rgba(255, 255, 255, 0.8)',
                    justifyContent: 'center'
                  }}
                >
                  <LayoutGrid size={20} />
                </ListItemIcon>
                {!isTier1Collapsed && (
                  <ListItemText
                    primary="Dashboard"
                    primaryTypographyProps={{
                      fontSize: '0.9rem',
                      fontWeight: activeDepartment === DEPARTMENTS.DASHBOARD ? 700 : 500
                    }}
                  />
                )}
              </ListItemButton>
            </Tooltip>
          </ListItem>

          {/* 2. Underwriting */}
          <ListItem disablePadding sx={{ mb: 0.75 }}>
            <Tooltip title={isTier1Collapsed ? 'Underwriting' : ''} placement="right">
              <ListItemButton
                onClick={() => switchDepartment(DEPARTMENTS.UNDERWRITING, true)}
                selected={activeDepartment === DEPARTMENTS.UNDERWRITING}
                sx={{
                  borderRadius: '8px',
                  px: isTier1Collapsed ? 1.5 : 1.75,
                  py: 1,
                  justifyContent: isTier1Collapsed ? 'center' : 'flex-start',
                  backgroundColor:
                    activeDepartment === DEPARTMENTS.UNDERWRITING
                      ? 'rgba(255, 255, 255, 0.18)'
                      : 'transparent',
                  color: '#ffffff',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    color: '#ffffff'
                  }
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: isTier1Collapsed ? 'auto' : 36,
                    color: activeDepartment === DEPARTMENTS.UNDERWRITING ? accentColor : 'rgba(255, 255, 255, 0.8)',
                    justifyContent: 'center'
                  }}
                >
                  <ShieldCheck size={20} />
                </ListItemIcon>
                {!isTier1Collapsed && (
                  <ListItemText
                    primary="Underwriting"
                    primaryTypographyProps={{
                      fontSize: '0.9rem',
                      fontWeight: activeDepartment === DEPARTMENTS.UNDERWRITING ? 700 : 500
                    }}
                  />
                )}
                {!isTier1Collapsed && activeDepartment === DEPARTMENTS.UNDERWRITING && isTier2Open && (
                  <ChevronRight size={16} color="rgba(255,255,255,0.7)" />
                )}
              </ListItemButton>
            </Tooltip>
          </ListItem>

          {/* 3. Claims */}
          <ListItem disablePadding sx={{ mb: 0.75 }}>
            <Tooltip title={isTier1Collapsed ? 'Claims' : ''} placement="right">
              <ListItemButton
                onClick={() => switchDepartment(DEPARTMENTS.CLAIMS, true)}
                selected={activeDepartment === DEPARTMENTS.CLAIMS}
                sx={{
                  borderRadius: '8px',
                  px: isTier1Collapsed ? 1.5 : 1.75,
                  py: 1,
                  justifyContent: isTier1Collapsed ? 'center' : 'flex-start',
                  backgroundColor:
                    activeDepartment === DEPARTMENTS.CLAIMS
                      ? 'rgba(255, 255, 255, 0.18)'
                      : 'transparent',
                  color: '#ffffff',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    color: '#ffffff'
                  }
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: isTier1Collapsed ? 'auto' : 36,
                    color: activeDepartment === DEPARTMENTS.CLAIMS ? accentColor : 'rgba(255, 255, 255, 0.8)',
                    justifyContent: 'center'
                  }}
                >
                  <AlertCircle size={20} />
                </ListItemIcon>
                {!isTier1Collapsed && (
                  <ListItemText
                    primary="Claims"
                    primaryTypographyProps={{
                      fontSize: '0.9rem',
                      fontWeight: activeDepartment === DEPARTMENTS.CLAIMS ? 700 : 500
                    }}
                  />
                )}
                {!isTier1Collapsed && activeDepartment === DEPARTMENTS.CLAIMS && isTier2Open && (
                  <ChevronRight size={16} color="rgba(255,255,255,0.7)" />
                )}
              </ListItemButton>
            </Tooltip>
          </ListItem>
        </List>

        {/* User Profile & Logout at Bottom Left */}
        <Box sx={{ mt: 'auto', p: 1.5, borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: isTier1Collapsed ? 'center' : 'space-between',
              p: 0.75,
              borderRadius: '8px',
              backgroundColor: 'rgba(255, 255, 255, 0.06)'
            }}
          >
            {!isTier1Collapsed && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                <Avatar
                  sx={{
                    width: 28,
                    height: 28,
                    fontSize: '0.72rem',
                    bgcolor: accentColor,
                    color: '#000000',
                    fontWeight: 700
                  }}
                >
                  {getUserInitials(currentUser)}
                </Avatar>
                <Box sx={{ minWidth: 0 }}>
                  <Typography noWrap sx={{ fontSize: '0.78rem', fontWeight: 700, color: '#ffffff' }}>
                    {currentUser?.displayName || currentUser?.username || 'User'}
                  </Typography>
                  <Typography noWrap sx={{ fontSize: '0.66rem', color: 'rgba(255, 255, 255, 0.65)' }}>
                    {currentUser?.roleCode || currentUser?.roleName || 'Underwriting'}
                  </Typography>
                </Box>
              </Box>
            )}

            <Tooltip title="Sign Out" placement="right">
              <IconButton
                size="small"
                onClick={handleLogout}
                sx={{
                  color: 'rgba(255, 255, 255, 0.75)',
                  '&:hover': { color: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.15)' }
                }}
              >
                <LogOut size={16} />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </Box>

      {/* =========================================================================
          COLUMN 2: CASCADING SECONDARY SIDEBAR
          Opens when Underwriting or Claims is active; can be collapsed/uncollapsed
         ========================================================================= */}
      {isTier2Open && activeDepartment !== DEPARTMENTS.DASHBOARD && (
        <Box
          sx={{
            width: 240,
            backgroundColor: '#0f172a',
            color: '#f8fafc',
            display: 'flex',
            flexDirection: 'column',
            borderRight: '1px solid #1e293b',
            boxShadow: '4px 0 12px rgba(0,0,0,0.18)',
            animation: 'fadeInSlide 0.2s ease-out',
            '@keyframes fadeInSlide': {
              '0%': { opacity: 0, transform: 'translateX(-10px)' },
              '100%': { opacity: 1, transform: 'translateX(0)' }
            }
          }}
        >
          {/* Secondary Header */}
          <Box
            sx={{
              p: 2,
              borderBottom: '1px solid #1e293b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <Box>
              <Typography sx={{ fontSize: '0.92rem', fontWeight: 800, color: '#f8fafc', lineHeight: 1.2 }}>
                {activeDepartment === DEPARTMENTS.UNDERWRITING ? 'Underwriting' : 'Claims'}
              </Typography>
              <Typography sx={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 600 }}>
                Operations Workspace
              </Typography>
            </Box>

            {/* Toggle button to collapse Tier 2 or uncollapse Tier 1 */}
            <Tooltip title={isTier1Collapsed ? 'Expand main menu' : 'Collapse main menu'}>
              <IconButton
                size="small"
                onClick={toggleTier1}
                sx={{
                  color: '#94a3b8',
                  border: '1px solid #334155',
                  borderRadius: 1.5,
                  p: 0.5,
                  '&:hover': { color: '#ffffff', backgroundColor: '#1e293b' }
                }}
              >
                {isTier1Collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
              </IconButton>
            </Tooltip>
          </Box>

          {/* Secondary Navigation List */}
          <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 1.25 }}>
            {activeDepartment === DEPARTMENTS.UNDERWRITING ? (
              /* --- Underwriting Items --- */
              <List disablePadding>
                {/* 1. Document Inbox */}
                {isTier2Allowed('inbox') && (
                <ListItem disablePadding sx={{ mb: 0.5 }}>
                  <ListItemButton
                    onClick={() => navigate('/inbox')}
                    selected={lowerPath.includes('inbox')}
                    sx={{
                      borderRadius: 1.5,
                      py: 0.8,
                      px: 1.25,
                      backgroundColor: lowerPath.includes('inbox') ? 'rgba(56, 189, 248, 0.12)' : 'transparent',
                      color: lowerPath.includes('inbox') ? '#38bdf8' : '#cbd5e1',
                      '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.05)', color: '#ffffff' }
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 32, color: lowerPath.includes('inbox') ? '#38bdf8' : '#94a3b8' }}>
                      <Inbox size={17} />
                    </ListItemIcon>
                    <ListItemText
                      primary="Document Inbox"
                      primaryTypographyProps={{ fontSize: '0.84rem', fontWeight: lowerPath.includes('inbox') ? 700 : 500 }}
                    />
                  </ListItemButton>
                </ListItem>
                )}

                {/* 2. Policies Item with Nested Sub-Menu */}
                {isTier2Allowed('policies') && (
                <ListItem disablePadding sx={{ display: 'block', mb: 0.5 }}>
                  <ListItemButton
                    onClick={() => {
                      navigate('/policies');
                      setPoliciesOpen(true);
                    }}
                    selected={lowerPath.includes('policies') && !lowerPath.includes('/quotes') && !lowerPath.includes('/documents') && !lowerPath.includes('/forms')}
                    sx={{
                      borderRadius: 1.5,
                      py: 0.8,
                      px: 1.25,
                      backgroundColor: lowerPath.includes('policies') ? 'rgba(56, 189, 248, 0.12)' : 'transparent',
                      color: lowerPath.includes('policies') ? '#38bdf8' : '#cbd5e1',
                      '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.05)', color: '#ffffff' }
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 32, color: lowerPath.includes('policies') ? '#38bdf8' : '#94a3b8' }}>
                      <FileText size={17} />
                    </ListItemIcon>
                    <ListItemText
                      primary="Policies"
                      primaryTypographyProps={{ fontSize: '0.84rem', fontWeight: lowerPath.includes('policies') ? 700 : 500 }}
                    />
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPoliciesOpen((prev) => !prev);
                      }}
                      sx={{ p: 0.25, color: '#94a3b8' }}
                    >
                      {policiesOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </IconButton>
                  </ListItemButton>

                  {/* Policies Nested Sub-Menu: Quotes & Rating, Documents, Forms */}
                  <Collapse in={policiesOpen} timeout="auto" unmountOnExit>
                    <List disablePadding sx={{ pl: 3.5, borderLeft: '1.5px solid rgba(56, 189, 248, 0.25)', ml: 2, my: 0.5 }}>
                      <ListItem disablePadding sx={{ mb: 0.25 }}>
                        <ListItemButton
                          onClick={() => navigate('/policies/quotes')}
                          selected={lowerPath.includes('policies') && lowerPath.includes('quotes')}
                          sx={{
                            borderRadius: 1,
                            py: 0.4,
                            px: 1,
                            color: lowerPath.includes('policies') && lowerPath.includes('quotes') ? '#38bdf8' : '#94a3b8',
                            '&:hover': { color: '#ffffff' }
                          }}
                        >
                          <ListItemIcon sx={{ minWidth: 26, color: 'inherit' }}>
                            <Calculator size={15} />
                          </ListItemIcon>
                          <ListItemText primary="Quotes & Rating" primaryTypographyProps={{ fontSize: '0.78rem' }} />
                        </ListItemButton>
                      </ListItem>

                      <ListItem disablePadding sx={{ mb: 0.25 }}>
                        <ListItemButton
                          onClick={() => navigate('/policies/documents')}
                          selected={lowerPath.includes('policies') && lowerPath.includes('documents')}
                          sx={{
                            borderRadius: 1,
                            py: 0.4,
                            px: 1,
                            color: lowerPath.includes('policies') && lowerPath.includes('documents') ? '#38bdf8' : '#94a3b8',
                            '&:hover': { color: '#ffffff' }
                          }}
                        >
                          <ListItemIcon sx={{ minWidth: 26, color: 'inherit' }}>
                            <Folder size={15} />
                          </ListItemIcon>
                          <ListItemText primary="Documents" primaryTypographyProps={{ fontSize: '0.78rem' }} />
                        </ListItemButton>
                      </ListItem>

                      <ListItem disablePadding>
                        <ListItemButton
                          onClick={() => navigate('/policies/forms')}
                          selected={lowerPath.includes('policies') && lowerPath.includes('forms')}
                          sx={{
                            borderRadius: 1,
                            py: 0.4,
                            px: 1,
                            color: lowerPath.includes('policies') && lowerPath.includes('forms') ? '#38bdf8' : '#94a3b8',
                            '&:hover': { color: '#ffffff' }
                          }}
                        >
                          <ListItemIcon sx={{ minWidth: 26, color: 'inherit' }}>
                            <Printer size={15} />
                          </ListItemIcon>
                          <ListItemText primary="Forms" primaryTypographyProps={{ fontSize: '0.78rem' }} />
                        </ListItemButton>
                      </ListItem>
                    </List>
                  </Collapse>
                </ListItem>
                )}

                {/* 3. Submissions Item with Nested Sub-Menu */}
                {isTier2Allowed('submissions') && (
                <ListItem disablePadding sx={{ display: 'block', mb: 0.5 }}>
                  <ListItemButton
                    onClick={() => {
                      navigate('/submissions');
                      setSubmissionsOpen(true);
                    }}
                    selected={lowerPath.includes('submissions') && !lowerPath.includes('/quotes') && !lowerPath.includes('/documents') && !lowerPath.includes('/forms')}
                    sx={{
                      borderRadius: 1.5,
                      py: 0.8,
                      px: 1.25,
                      backgroundColor: lowerPath.includes('submissions') ? 'rgba(56, 189, 248, 0.12)' : 'transparent',
                      color: lowerPath.includes('submissions') ? '#38bdf8' : '#cbd5e1',
                      '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.05)', color: '#ffffff' }
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 32, color: lowerPath.includes('submissions') ? '#38bdf8' : '#94a3b8' }}>
                      <Files size={17} />
                    </ListItemIcon>
                    <ListItemText
                      primary="Submissions"
                      primaryTypographyProps={{ fontSize: '0.84rem', fontWeight: lowerPath.includes('submissions') ? 700 : 500 }}
                    />
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSubmissionsOpen((prev) => !prev);
                      }}
                      sx={{ p: 0.25, color: '#94a3b8' }}
                    >
                      {submissionsOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </IconButton>
                  </ListItemButton>

                  {/* Submissions Nested Sub-Menu: Quotes & Rating, Documents, Forms */}
                  <Collapse in={submissionsOpen} timeout="auto" unmountOnExit>
                    <List disablePadding sx={{ pl: 3.5, borderLeft: '1.5px solid rgba(129, 140, 248, 0.25)', ml: 2, my: 0.5 }}>
                      <ListItem disablePadding sx={{ mb: 0.25 }}>
                        <ListItemButton
                          onClick={() => navigate('/submissions/quotes')}
                          selected={lowerPath.includes('submissions') && lowerPath.includes('quotes')}
                          sx={{
                            borderRadius: 1,
                            py: 0.4,
                            px: 1,
                            color: lowerPath.includes('submissions') && lowerPath.includes('quotes') ? '#818cf8' : '#94a3b8',
                            '&:hover': { color: '#ffffff' }
                          }}
                        >
                          <ListItemIcon sx={{ minWidth: 26, color: 'inherit' }}>
                            <Calculator size={15} />
                          </ListItemIcon>
                          <ListItemText primary="Quotes & Rating" primaryTypographyProps={{ fontSize: '0.78rem' }} />
                        </ListItemButton>
                      </ListItem>

                      <ListItem disablePadding sx={{ mb: 0.25 }}>
                        <ListItemButton
                          onClick={() => navigate('/submissions/documents')}
                          selected={lowerPath.includes('submissions') && lowerPath.includes('documents')}
                          sx={{
                            borderRadius: 1,
                            py: 0.4,
                            px: 1,
                            color: lowerPath.includes('submissions') && lowerPath.includes('documents') ? '#818cf8' : '#94a3b8',
                            '&:hover': { color: '#ffffff' }
                          }}
                        >
                          <ListItemIcon sx={{ minWidth: 26, color: 'inherit' }}>
                            <Folder size={15} />
                          </ListItemIcon>
                          <ListItemText primary="Documents" primaryTypographyProps={{ fontSize: '0.78rem' }} />
                        </ListItemButton>
                      </ListItem>

                      <ListItem disablePadding>
                        <ListItemButton
                          onClick={() => navigate('/submissions/forms')}
                          selected={lowerPath.includes('submissions') && lowerPath.includes('forms')}
                          sx={{
                            borderRadius: 1,
                            py: 0.4,
                            px: 1,
                            color: lowerPath.includes('submissions') && lowerPath.includes('forms') ? '#818cf8' : '#94a3b8',
                            '&:hover': { color: '#ffffff' }
                          }}
                        >
                          <ListItemIcon sx={{ minWidth: 26, color: 'inherit' }}>
                            <Printer size={15} />
                          </ListItemIcon>
                          <ListItemText primary="Forms" primaryTypographyProps={{ fontSize: '0.78rem' }} />
                        </ListItemButton>
                      </ListItem>
                    </List>
                  </Collapse>
                </ListItem>
                )}
              </List>
            ) : (
              /* --- Claims Items --- */
              <List disablePadding>
                {isTier2Allowed('claims') && (
                <ListItem disablePadding sx={{ mb: 0.5 }}>
                  <ListItemButton
                    onClick={() => navigate('/claims')}
                    selected={lowerPath === '/claims' || lowerPath === '#/claims'}
                    sx={{
                      borderRadius: 1.5,
                      py: 0.8,
                      px: 1.25,
                      backgroundColor: lowerPath === '/claims' ? 'rgba(245, 158, 11, 0.12)' : 'transparent',
                      color: lowerPath === '/claims' ? '#fbbf24' : '#cbd5e1',
                      '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.05)', color: '#ffffff' }
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 32, color: lowerPath === '/claims' ? '#fbbf24' : '#94a3b8' }}>
                      <ReceiptLongIcon sx={{ fontSize: 18 }} />
                    </ListItemIcon>
                    <ListItemText primary="Claims Registry" primaryTypographyProps={{ fontSize: '0.84rem' }} />
                  </ListItemButton>
                </ListItem>
                )}

                {(isTier2Allowed('claims/fnol') || isTier2Allowed('fnol')) && (
                <ListItem disablePadding sx={{ mb: 0.5 }}>
                  <ListItemButton
                    onClick={() => navigate('/claims/fnol')}
                    selected={lowerPath.includes('fnol')}
                    sx={{
                      borderRadius: 1.5,
                      py: 0.8,
                      px: 1.25,
                      backgroundColor: lowerPath.includes('fnol') ? 'rgba(239, 68, 68, 0.12)' : 'transparent',
                      color: lowerPath.includes('fnol') ? '#f87171' : '#cbd5e1',
                      '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.05)', color: '#ffffff' }
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 32, color: lowerPath.includes('fnol') ? '#f87171' : '#94a3b8' }}>
                      <ReportProblemIcon sx={{ fontSize: 18 }} />
                    </ListItemIcon>
                    <ListItemText primary="Report FNOL" primaryTypographyProps={{ fontSize: '0.84rem' }} />
                  </ListItemButton>
                </ListItem>
                )}

                {(isTier2Allowed('claims/open') || isTier2Allowed('open')) && (
                <ListItem disablePadding sx={{ mb: 0.5 }}>
                  <ListItemButton
                    onClick={() => navigate('/claims/open')}
                    selected={lowerPath.includes('open')}
                    sx={{
                      borderRadius: 1.5,
                      py: 0.8,
                      px: 1.25,
                      backgroundColor: lowerPath.includes('open') ? 'rgba(245, 158, 11, 0.12)' : 'transparent',
                      color: lowerPath.includes('open') ? '#fbbf24' : '#cbd5e1',
                      '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.05)', color: '#ffffff' }
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 32, color: lowerPath.includes('open') ? '#fbbf24' : '#94a3b8' }}>
                      <FolderSpecialIcon sx={{ fontSize: 18 }} />
                    </ListItemIcon>
                    <ListItemText primary="Open Claims & Reserves" primaryTypographyProps={{ fontSize: '0.84rem' }} />
                  </ListItemButton>
                </ListItem>
                )}

                {(isTier2Allowed('claims/loss-runs') || isTier2Allowed('loss-runs')) && (
                <ListItem disablePadding sx={{ mb: 0.5 }}>
                  <ListItemButton
                    onClick={() => navigate('/claims/loss-runs')}
                    selected={lowerPath.includes('loss-runs')}
                    sx={{
                      borderRadius: 1.5,
                      py: 0.8,
                      px: 1.25,
                      backgroundColor: lowerPath.includes('loss-runs') ? 'rgba(16, 185, 129, 0.12)' : 'transparent',
                      color: lowerPath.includes('loss-runs') ? '#34d399' : '#cbd5e1',
                      '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.05)', color: '#ffffff' }
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 32, color: lowerPath.includes('loss-runs') ? '#34d399' : '#94a3b8' }}>
                      <TrendingUp size={17} />
                    </ListItemIcon>
                    <ListItemText primary="Loss Runs & Reports" primaryTypographyProps={{ fontSize: '0.84rem' }} />
                  </ListItemButton>
                </ListItem>
                )}
              </List>
            )}
          </Box>
        </Box>
      )}
    </Box>
  );
}

export default CustomMenu;
