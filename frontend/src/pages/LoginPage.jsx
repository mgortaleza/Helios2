import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Chip,
  Button,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Paper
} from '@mui/material';
import {
  Clock,
  User,
  Lock,
  LogIn,
  Laptop,
  ShieldCheck,
  Key
} from 'lucide-react';

import { HeliosBrandIcon } from '../layout/CustomMenu.jsx';

const DEFAULT_TENANTS = [
  {
    tenantId: 1,
    tenantName: 'Acme Corp',
    dbCatalogName: 'HELIOS2_TST',
    primaryColor: '#013a12',
    accentColor: '#f59e0b',
    brandTitle: 'Helios',
    brandSubtitle: 'INSURANCE MANAGEMENT SUITE'
  },
  {
    tenantId: 2,
    tenantName: 'Global Risk Partners',
    dbCatalogName: 'HELIOS_TST',
    primaryColor: '#0f2942',
    accentColor: '#38bdf8',
    brandTitle: 'Helios',
    brandSubtitle: 'GLOBAL RISK UNDERWRITING'
  }
];

export function LoginPage({ onLoginSuccess, tenants: propTenants = [], inactivityMessage = null }) {
  const [tenants, setTenants] = useState(() => (propTenants.length > 0 ? propTenants : DEFAULT_TENANTS));

  const [selectedTenantId, setSelectedTenantId] = useState(() => {
    try {
      const saved = localStorage.getItem('helios_selected_tenant_id') || localStorage.getItem('helios2_tenantId');
      if (saved) {
        const id = Number(saved);
        if (id > 0) return id;
      }
    } catch {}
    return 1;
  });

  const [username, setUsername] = useState('mchang');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [error, setError] = useState(null);
  const [tenantUsers, setTenantUsers] = useState([]);
  const [openSsoDialog, setOpenSsoDialog] = useState(false);
  const [ssoModalData, setSsoModalData] = useState({ title: '', desc: '', provider: '' });

  // Update tenants if propTenants loads asynchronously
  useEffect(() => {
    if (propTenants && propTenants.length > 0) {
      setTenants(propTenants);
    } else {
      fetch('/api/tenants')
        .then((res) => (res.ok ? res.json() : []))
        .then((data) => {
          if (Array.isArray(data) && data.length > 0) {
            setTenants(data);
          }
        })
        .catch(() => {});
    }
  }, [propTenants]);

  // Fetch users belonging to the active tenant
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
    return () => {
      isCurrent = false;
    };
  }, [selectedTenantId]);

  const activeTenant =
    tenants.find((t) => Number(t.tenantId) === Number(selectedTenantId)) ||
    tenants[0] ||
    DEFAULT_TENANTS[0];

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
      if (onLoginSuccess) {
        onLoginSuccess(data.user, Number(selectedTenantId));
      }
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
              <HeliosBrandIcon
                primaryColor={activeTenant.primaryColor || '#013a12'}
                accentColor={activeTenant.accentColor || '#f59e0b'}
              />
              <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: '0.04em' }}>
                {activeTenant.brandTitle || 'Helios'}
              </Typography>
            </Box>
            <Typography
              variant="caption"
              sx={{ color: 'rgba(255,255,255,0.85)', letterSpacing: '0.08em', fontWeight: 600 }}
            >
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

          {typeof inactivityMessage === 'string' && inactivityMessage.trim() ? (
            <Alert
              severity="warning"
              icon={<Clock size={18} />}
              sx={{ mb: 2.5, borderRadius: 1.5, fontSize: '0.85rem' }}
            >
              {inactivityMessage}
            </Alert>
          ) : null}

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
                onChange={(e) => {
                  const newId = Number(e.target.value);
                  setSelectedTenantId(newId);
                  try {
                    localStorage.setItem('helios_selected_tenant_id', String(newId));
                    localStorage.setItem('helios2_tenantId', String(newId));
                  } catch {}
                }}
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
            <Typography
              variant="caption"
              sx={{ fontWeight: 700, color: '#64748b', display: 'block', mb: 1.5, textAlign: 'center' }}
            >
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
            Enterprise directory federation can be configured and managed in the{' '}
            <strong>Helios Admin Portal</strong> under <strong>User &amp; Identity Management</strong>. For current
            testing, use the sample users seeded in each tenant&apos;s database.
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
}

export default LoginPage;

