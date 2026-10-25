import React from 'react';
import {
  AppBar,
  Layout,
  Menu,
  TitlePortal,
  useRefresh,
  useNotify
} from 'react-admin';
import {
  Box,
  Chip,
  FormControl,
  MenuItem,
  Select,
  Typography
} from '@mui/material';
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart';
import StorageIcon from '@mui/icons-material/Storage';
import { useTenant } from '../tenantContext.jsx';

export function HeliosAppBar() {
  const { tenants, activeTenantId, activeTenant, setActiveTenantId } = useTenant();
  const refresh = useRefresh();
  const notify = useNotify();

  const handleTenantChange = (event) => {
    const nextId = Number(event.target.value);
    setActiveTenantId(nextId);
    const chosen = tenants.find((t) => t.tenantId === nextId);
    notify(
      chosen
        ? `Switched active tenant to #${chosen.tenantId} (${chosen.tenantName} - ${chosen.dbCatalogName})`
        : `Switched active tenant to #${nextId}`,
      { type: 'info' }
    );
    refresh();
  };

  return (
    <AppBar
      color="primary"
      sx={{
        backgroundColor: '#0f172a',
        '& .RaAppBar-toolbar': {
          gap: 1.5,
          flexWrap: 'wrap'
        }
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mr: 1 }}>
        <Typography variant="h6" component="span" sx={{ fontWeight: 700, letterSpacing: '0.02em' }}>
          Helios2
        </Typography>
        <Chip
          label="React-Admin"
          size="small"
          sx={{
            backgroundColor: '#1d4ed8',
            color: '#e0f2fe',
            fontWeight: 600,
            fontSize: '0.72rem'
          }}
        />
      </Box>

      <TitlePortal />

      {activeTenant && (
        <Chip
          icon={<StorageIcon sx={{ color: '#d1fae5 !important', fontSize: 16 }} />}
          label={`DB: ${activeTenant.dbCatalogName}`}
          size="small"
          title="Active SQL Server Catalog routed via MSTR_DATA"
          sx={{
            backgroundColor: '#047857',
            color: '#d1fae5',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            fontWeight: 600
          }}
        />
      )}

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 1 }}>
        <Typography variant="body2" sx={{ color: '#cbd5e1', fontWeight: 600, display: { xs: 'none', sm: 'inline' } }}>
          Tenant (MSTR_DATA):
        </Typography>
        <FormControl size="small" variant="outlined">
          <Select
            id="tenantSelect"
            value={tenants.some((t) => t.tenantId === Number(activeTenantId)) ? Number(activeTenantId) : ''}
            displayEmpty
            onChange={handleTenantChange}
            sx={{
              backgroundColor: '#1e293b',
              color: '#f8fafc',
              fontSize: '0.85rem',
              minWidth: 220,
              '.MuiOutlinedInput-notchedOutline': {
                borderColor: '#334155'
              },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: '#64748b'
              },
              '.MuiSvgIcon-root': {
                color: '#f8fafc'
              }
            }}
          >
            {tenants.length === 0 ? (
              <MenuItem value="">
                <em>Loading tenants...</em>
              </MenuItem>
            ) : (
              tenants.map((t) => (
                <MenuItem key={t.tenantId} value={t.tenantId}>
                  #{t.tenantId} - {t.tenantName} [{t.dbCatalogName}]
                </MenuItem>
              ))
            )}
          </Select>
        </FormControl>
      </Box>
    </AppBar>
  );
}

export function HeliosMenu() {
  return (
    <Menu>
      <Menu.ResourceItem name="submissions" />
      <Menu.ResourceItem name="parties" />
      <Menu.ResourceItem name="tenants" />
      <Menu.Item
        to="/diagnostics"
        primaryText="SQL Diagnostics"
        leftIcon={<MonitorHeartIcon />}
      />
    </Menu>
  );
}

export function HeliosLayout(props) {
  return <Layout {...props} appBar={HeliosAppBar} menu={HeliosMenu} />;
}
