import React from 'react';
import { useRedirect } from 'react-admin';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Grid,
  Button,
  Chip,
  Divider,
  Paper
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ShieldIcon from '@mui/icons-material/Shield';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import AssignmentIcon from '@mui/icons-material/Assignment';
import PolicyIcon from '@mui/icons-material/Policy';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useDepartment, DEPARTMENTS } from '../layout/DepartmentContext.jsx';

export function DashboardPage() {
  const redirect = useRedirect();
  const { switchDepartment } = useDepartment();

  return (
    <Box sx={{ p: 1 }}>
      {/* Header Banner */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, color: '#0f172a', mb: 0.5 }}>
          Helios Insurance Operations
        </Typography>
        <Typography variant="body1" sx={{ color: '#64748b' }}>
          Welcome to the operational console. Select a department below or use the sidebar navigation.
        </Typography>
      </Box>

      {/* Primary Department Switcher Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Underwriting Card */}
        <Grid item xs={12} md={6}>
          <Card
            variant="outlined"
            sx={{
              borderRadius: 3,
              border: '2px solid #e0f2fe',
              transition: 'all 0.25s ease',
              '&:hover': {
                borderColor: '#0284c7',
                boxShadow: '0 8px 24px rgba(2, 132, 199, 0.12)'
              }
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box
                    sx={{
                      p: 1.25,
                      borderRadius: 2,
                      backgroundColor: '#e0f2fe',
                      color: '#0284c7',
                      display: 'flex'
                    }}
                  >
                    <ShieldIcon sx={{ fontSize: 28 }} />
                  </Box>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: '#0f172a' }}>
                      Underwriting & Policy Lifecycle
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
                      CORE DEPARTMENT
                    </Typography>
                  </Box>
                </Box>
                <Chip label="Active" color="primary" size="small" sx={{ fontWeight: 700 }} />
              </Box>

              <Typography variant="body2" sx={{ color: '#475569', mb: 3 }}>
                Process incoming broker submissions, bind insurance policies, compute rating algorithms, and manage form schedules.
              </Typography>

              <Divider sx={{ mb: 2.5 }} />

              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={4}>
                  <Paper elevation={0} sx={{ p: 1.5, backgroundColor: '#f8fafc', borderRadius: 2, textAlign: 'center' }}>
                    <Typography variant="h5" sx={{ fontWeight: 800, color: '#0284c7' }}>
                      18
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#64748b' }}>
                      Inbox Queue
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={4}>
                  <Paper elevation={0} sx={{ p: 1.5, backgroundColor: '#f8fafc', borderRadius: 2, textAlign: 'center' }}>
                    <Typography variant="h5" sx={{ fontWeight: 800, color: '#0f172a' }}>
                      42
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#64748b' }}>
                      Submissions
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={4}>
                  <Paper elevation={0} sx={{ p: 1.5, backgroundColor: '#f8fafc', borderRadius: 2, textAlign: 'center' }}>
                    <Typography variant="h5" sx={{ fontWeight: 800, color: '#059669' }}>
                      128
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#64748b' }}>
                      Active Policies
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>

              <Button
                variant="contained"
                fullWidth
                endIcon={<ArrowForwardIcon />}
                onClick={() => {
                  switchDepartment(DEPARTMENTS.UNDERWRITING, true);
                }}
                sx={{ backgroundColor: '#0284c7', '&:hover': { backgroundColor: '#0369a1' } }}
              >
                Enter Underwriting Workspace
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Claims Card */}
        <Grid item xs={12} md={6}>
          <Card
            variant="outlined"
            sx={{
              borderRadius: 3,
              border: '2px solid #fef3c7',
              transition: 'all 0.25s ease',
              '&:hover': {
                borderColor: '#d97706',
                boxShadow: '0 8px 24px rgba(217, 119, 6, 0.12)'
              }
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box
                    sx={{
                      p: 1.25,
                      borderRadius: 2,
                      backgroundColor: '#fef3c7',
                      color: '#d97706',
                      display: 'flex'
                    }}
                  >
                    <HealthAndSafetyIcon sx={{ fontSize: 28 }} />
                  </Box>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: '#0f172a' }}>
                      Claims Operations & Reserves
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
                      CORE DEPARTMENT
                    </Typography>
                  </Box>
                </Box>
                <Chip label="Ready" color="warning" size="small" sx={{ fontWeight: 700 }} />
              </Box>

              <Typography variant="body2" sx={{ color: '#475569', mb: 3 }}>
                Intake First Notice of Loss (FNOL), audit adjuster reserves, track bodily injury and property damage, and monitor loss ratios.
              </Typography>

              <Divider sx={{ mb: 2.5 }} />

              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={4}>
                  <Paper elevation={0} sx={{ p: 1.5, backgroundColor: '#f8fafc', borderRadius: 2, textAlign: 'center' }}>
                    <Typography variant="h5" sx={{ fontWeight: 800, color: '#d97706' }}>
                      9
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#64748b' }}>
                      Open Claims
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={4}>
                  <Paper elevation={0} sx={{ p: 1.5, backgroundColor: '#f8fafc', borderRadius: 2, textAlign: 'center' }}>
                    <Typography variant="h5" sx={{ fontWeight: 800, color: '#dc2626' }}>
                      $385K
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#64748b' }}>
                      Total Reserves
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={4}>
                  <Paper elevation={0} sx={{ p: 1.5, backgroundColor: '#f8fafc', borderRadius: 2, textAlign: 'center' }}>
                    <Typography variant="h5" sx={{ fontWeight: 800, color: '#16a34a' }}>
                      28.4%
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#64748b' }}>
                      Loss Ratio
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>

              <Button
                variant="contained"
                fullWidth
                endIcon={<ArrowForwardIcon />}
                onClick={() => {
                  switchDepartment(DEPARTMENTS.CLAIMS, true);
                }}
                sx={{ backgroundColor: '#d97706', '&:hover': { backgroundColor: '#b45309' } }}
              >
                Enter Claims Operations
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

export default DashboardPage;

