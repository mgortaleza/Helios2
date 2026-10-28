import React from 'react';
import {
  Notification
} from 'react-admin';
import { useLocation } from 'react-router-dom';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  Chip,
  Avatar,
  Paper,
  Alert,
  Button
} from '@mui/material';
import StorageIcon from '@mui/icons-material/Storage';
import ShieldIcon from '@mui/icons-material/Shield';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import { LayoutGrid } from 'lucide-react';

import { useTenant } from '../tenantContext.jsx';
import { useDepartment, DepartmentProvider, DEPARTMENTS } from './DepartmentContext.jsx';
import { useAuth } from '../authContext.jsx';
import { CustomMenu, getUserInitials } from './CustomMenu.jsx';

/**
 * HeliosErrorFallback: Diagnostic error display that exposes full stack traces
 * and context instead of opaque error dialogs.
 */
export function HeliosErrorFallback({ error, errorInfo }) {
  console.error('Helios Client Error:', error, errorInfo);
  return (
    <Box sx={{ p: 4, maxWidth: 900, mx: 'auto', mt: 3 }}>
      <Typography variant="h5" color="error" sx={{ fontWeight: 800, mb: 1 }}>
        Helios Application Error
      </Typography>
      <Alert severity="error" sx={{ mb: 2, fontWeight: 600 }}>
        {error?.message || String(error)}
      </Alert>
      <Paper
        sx={{
          p: 2,
          backgroundColor: '#0f172a',
          color: '#f8fafc',
          overflow: 'auto',
          fontFamily: 'monospace',
          fontSize: '0.8rem',
          borderRadius: 2,
          maxHeight: 350
        }}
      >
        <pre style={{ margin: 0 }}>{error?.stack}</pre>
        {errorInfo?.componentStack && (
          <pre style={{ marginTop: 12, color: '#94a3b8' }}>{errorInfo.componentStack}</pre>
        )}
      </Paper>
      <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
        <Button variant="contained" onClick={() => (window.location.href = '/')}>
          Return to Dashboard
        </Button>
        <Button variant="outlined" onClick={() => window.location.reload()}>
          Reload Page
        </Button>
      </Box>
    </Box>
  );
}

/**
 * HeliosAppBar: Clean top bar with:
 * - Current context breadcrumb
 * - Read-only Database Catalog badge
 * - No tenant switcher
 * - Current user status
 */
export function HeliosAppBar() {
  const { activeTenant } = useTenant();
  const { activeDepartment } = useDepartment();
  const { currentUser } = useAuth();
  const location = useLocation();

  const getBreadcrumbTitle = () => {
    const path = (location.pathname || '') + (location.hash || '');
    const lower = path.toLowerCase();
    if (lower.includes('inbox')) return 'Document Intake Inbox';
    if (lower.includes('policies') && lower.includes('quotes')) return 'Policies • Quotes & Rating';
    if (lower.includes('policies') && lower.includes('documents')) return 'Policies • Documents';
    if (lower.includes('policies') && lower.includes('forms')) return 'Policies • Forms';
    if (lower.includes('policies')) return 'Underwriting • Policies';
    if (lower.includes('submissions') && lower.includes('quotes')) return 'Submissions • Quotes & Rating';
    if (lower.includes('submissions') && lower.includes('documents')) return 'Submissions • Documents';
    if (lower.includes('submissions') && lower.includes('forms')) return 'Submissions • Forms';
    if (lower.includes('submissions')) return 'Underwriting • Submissions';
    if (lower.includes('fnol')) return 'Claims • First Notice of Loss (FNOL)';
    if (lower.includes('open')) return 'Claims • Open Claims & Reserves';
    if (lower.includes('loss-runs')) return 'Claims • Loss Runs & Actuarial Reports';
    if (lower.includes('claims')) return 'Claims Operations';
    return 'Insurance Operations Dashboard';
  };

  const isUnderwriting = activeDepartment === DEPARTMENTS.UNDERWRITING;
  const isClaims = activeDepartment === DEPARTMENTS.CLAIMS;

  return (
    <AppBar
      position="static"
      color="transparent"
      elevation={0}
      sx={{
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        height: 56,
        justifyContent: 'center',
        flexShrink: 0
      }}
    >
      <Toolbar sx={{ justifyContent: 'space-between', minHeight: '56px !important', px: 3 }}>
        {/* Breadcrumb / Title Context */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {isUnderwriting ? (
            <ShieldIcon sx={{ color: '#0284c7', fontSize: 20 }} />
          ) : isClaims ? (
            <HealthAndSafetyIcon sx={{ color: '#d97706', fontSize: 20 }} />
          ) : (
            <Box sx={{ display: 'flex', color: '#0284c7' }}>
              <LayoutGrid size={18} />
            </Box>
          )}

          <Typography sx={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>
            {getBreadcrumbTitle()}
          </Typography>

          {isUnderwriting && (
            <Chip
              label="Underwriting"
              size="small"
              sx={{
                height: 22,
                fontSize: '0.7rem',
                fontWeight: 700,
                backgroundColor: '#e0f2fe',
                color: '#0369a1'
              }}
            />
          )}

          {isClaims && (
            <Chip
              label="Claims"
              size="small"
              sx={{
                height: 22,
                fontSize: '0.7rem',
                fontWeight: 700,
                backgroundColor: '#fef3c7',
                color: '#b45309'
              }}
            />
          )}
        </Box>

        {/* Right Info: Read-Only DB Catalog & User Pill */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {activeTenant?.dbCatalogName && (
            <Chip
              icon={<StorageIcon sx={{ color: '#047857 !important', fontSize: 16 }} />}
              label={`DB: ${activeTenant.dbCatalogName}`}
              size="small"
              sx={{
                backgroundColor: '#ecfdf5',
                color: '#047857',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                fontWeight: 700,
                fontSize: '0.72rem',
                height: 24,
                border: '1px solid #a7f3d0'
              }}
            />
          )}

          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              px: 1.25,
              py: 0.5,
              borderRadius: '999px',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0'
            }}
          >
            <Avatar sx={{ width: 22, height: 22, fontSize: '0.68rem', fontWeight: 800, bgcolor: '#0284c7' }}>
              {getUserInitials(currentUser)}
            </Avatar>
            <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155' }}>
              {currentUser?.displayName || currentUser?.username || 'User'}
            </Typography>
          </Box>
        </Box>
      </Toolbar>
    </AppBar>
  );
}

/**
 * HeliosLayout: Top-level layout container implementing cascading 3-tier navigation:
 * - Column 1: Primary Vertical Sidebar (Tier 1)
 * - Column 2: Cascading Secondary Sidebar (Tier 2)
 * - Main: Top Bar + Content area
 */
export function HeliosLayout(props) {
  const { children } = props;

  return (
    <DepartmentProvider>
      <Box sx={{ display: 'flex', minHeight: '100vh', width: '100vw', overflow: 'hidden' }}>
        {/* Cascading Multi-Column Navigation */}
        <CustomMenu />

        {/* Main Content Area */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            display: 'flex',
            flexDirection: 'column',
            height: '100vh',
            overflow: 'hidden',
            backgroundColor: '#f8fafc'
          }}
        >
          <HeliosAppBar />

          {/* Main Scrollable View Container */}
          <Box
            sx={{
              flexGrow: 1,
              overflowY: 'auto',
              p: { xs: 2, sm: 3.5 }
            }}
          >
            <Box sx={{ maxWidth: 1400, mx: 'auto' }}>
              {children}
            </Box>
          </Box>
        </Box>

        <Notification />
      </Box>
    </DepartmentProvider>
  );
}

export default HeliosLayout;
