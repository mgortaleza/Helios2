import React, { useEffect, useState, useCallback } from 'react';
import { Title, useDataProvider, useNotify } from 'react-admin';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import { useTenant } from '../tenantContext.jsx';

function DatabaseStatusCard({ title, pingResult }) {
  const connected = Boolean(pingResult?.connected);

  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardHeader
        title={title}
        titleTypographyProps={{ variant: 'subtitle1', fontWeight: 700 }}
        action={
          connected ? (
            <Chip
              icon={<CheckCircleIcon />}
              label="CONNECTED"
              color="success"
              size="small"
              sx={{ fontWeight: 700 }}
            />
          ) : (
            <Chip
              icon={<ErrorIcon />}
              label="FAILED"
              color="error"
              size="small"
              sx={{ fontWeight: 700 }}
            />
          )
        }
      />
      <Divider />
      <CardContent>
        {connected ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography variant="body2">
              <strong>Database:</strong> <code>{pingResult.databaseName}</code>
            </Typography>
            {pingResult.serverName && (
              <Typography variant="body2">
                <strong>SQL Server Instance:</strong> <code>{pingResult.serverName}</code>
              </Typography>
            )}
            <Typography variant="body2">
              <strong>SQL Login:</strong> <code>{pingResult.authenticatedUser}</code>
            </Typography>
            <Box
              component="pre"
              sx={{
                backgroundColor: '#0f172a',
                color: '#f8fafc',
                p: 1.5,
                borderRadius: 1,
                overflowX: 'auto',
                fontSize: '0.78rem',
                mt: 1,
                mb: 0
              }}
            >
              {pingResult.sqlVersion}
            </Box>
          </Box>
        ) : (
          <Typography variant="body2" color="error" sx={{ fontWeight: 600 }}>
            {pingResult?.errorMessage || 'Unable to connect to SQL Server'}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

export function DiagnosticsPage() {
  const dataProvider = useDataProvider();
  const notify = useNotify();
  const { tenants, activeTenantId } = useTenant();

  const [diagnostics, setDiagnostics] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadDiagnostics = useCallback(async () => {
    setLoading(true);
    try {
      const data = await dataProvider.getDiagnostics();
      setDiagnostics(data);
    } catch (err) {
      notify(`Diagnostics Error: ${err.message}`, { type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [dataProvider, notify]);

  useEffect(() => {
    loadDiagnostics();
  }, [loadDiagnostics, activeTenantId]);

  return (
    <Box sx={{ mt: 2, mb: 4 }}>
      <Title title="Helios2 Multi-Tenant & SQL Diagnostics" />

      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 2,
          flexWrap: 'wrap',
          gap: 1
        }}
      >
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Multi-Tenant &amp; SQL Server Diagnostics
        </Typography>
        <Button
          variant="contained"
          startIcon={<RefreshIcon />}
          onClick={loadDiagnostics}
          disabled={loading}
        >
          Refresh Diagnostics
        </Button>
      </Box>

      {loading || !diagnostics ? (
        <Card variant="outlined">
          <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 4 }}>
            <CircularProgress size={24} />
            <Typography variant="body1">
              Running SQL Server connection diagnostics...
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Card variant="outlined">
            <CardHeader
              title="Runtime Environment"
              titleTypographyProps={{ variant: 'subtitle1', fontWeight: 700 }}
            />
            <Divider />
            <CardContent>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="body2">
                    <strong>Application:</strong> {diagnostics.application}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                    <strong>OS &amp; Arch:</strong> {diagnostics.osAndArch}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                    <strong>Java Runtime:</strong> {diagnostics.javaRuntime}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="body2">
                    <strong>Process User:</strong> {diagnostics.processUser}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                    <strong>Auth Mode:</strong> {diagnostics.authMode}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                    <strong>Server Time:</strong> {diagnostics.serverTime}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <DatabaseStatusCard
                title="1. Master Multi-Tenant DB (MSTR_DATA)"
                pingResult={diagnostics.masterDatabase}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <DatabaseStatusCard
                title={`2. Active Tenant DB (Tenant #${diagnostics.activeTenantId}: ${
                  diagnostics.activeTenantConfig?.dbCatalogName || 'Unknown'
                })`}
                pingResult={diagnostics.tenantDatabase}
              />
            </Grid>
          </Grid>

          <Card variant="outlined">
            <CardHeader
              title="Registered Tenants in MSTR_DATA.dbo.TENANT_DB_CONFIG"
              titleTypographyProps={{ variant: 'subtitle1', fontWeight: 700 }}
            />
            <Divider />
            <TableContainer component={Paper} elevation={0}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>TENANT_ID</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>TENANT_NAME</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>DB_SERVER_NM</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>DB_CATALOG_NM</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>STATUS</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {tenants.map((t) => {
                    const isActive = t.tenantId === Number(activeTenantId);
                    return (
                      <TableRow key={t.tenantId} selected={isActive}>
                        <TableCell>{t.tenantId}</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{t.tenantName}</TableCell>
                        <TableCell>
                          <code>{t.dbServerName}</code>
                        </TableCell>
                        <TableCell>
                          <code>{t.dbCatalogName}</code>
                        </TableCell>
                        <TableCell>
                          {isActive ? (
                            <Chip label="Active" color="primary" size="small" />
                          ) : (
                            <Chip label="Configured" variant="outlined" size="small" />
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </Box>
      )}
    </Box>
  );
}

