import React, { useState } from 'react';
import {
  List,
  Datagrid,
  TextField,
  Show,
  SimpleShowLayout,
  SearchInput,
  useNotify,
  useRedirect
} from 'react-admin';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Grid,
  Button,
  TextField as MuiTextField,
  MenuItem,
  Alert,
  Chip
} from '@mui/material';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import FolderSpecialIcon from '@mui/icons-material/FolderSpecial';
import AssessmentIcon from '@mui/icons-material/Assessment';
import AddIcon from '@mui/icons-material/Add';

const claimFilters = [
  <SearchInput key="q" source="q" alwaysOn placeholder="Filter by Claim # or Insured..." />
];

export function ClaimList(props) {
  const redirect = useRedirect();

  return (
    <List
      resource="claims"
      title="Claims Management Registry"
      filters={claimFilters}
      perPage={25}
      sort={{ field: 'claimId', order: 'DESC' }}
      {...props}
    >
      <Datagrid rowClick="show" bulkActionButtons={false}>
        <TextField source="claimNbr" label="Claim #" sx={{ fontWeight: 700, color: '#b45309' }} />
        <TextField source="policyNbr" label="Policy #" />
        <TextField source="insuredName" label="Insured Organization" />
        <TextField source="lossDate" label="Date of Loss" />
        <TextField source="reserveAmt" label="Reserve Amount" sx={{ fontWeight: 700, color: '#dc2626' }} />
        <TextField source="claimStatus" label="Status" />
      </Datagrid>
    </List>
  );
}

export function ClaimShow() {
  return (
    <Show title="Claim File Details">
      <SimpleShowLayout>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, color: '#9a3412' }}>
          Claim File & Reserve Adjustment Summary
        </Typography>
        <TextField source="claimNbr" label="Claim Number" />
        <TextField source="policyNbr" label="Policy Number" />
        <TextField source="insuredName" label="Insured Organization" />
        <TextField source="lossDate" label="Date of Loss" />
        <TextField source="reserveAmt" label="Case Reserves" />
        <TextField source="claimStatus" label="File Status" />
        <TextField source="description" label="Loss Description" />
      </SimpleShowLayout>
    </Show>
  );
}

/**
 * ClaimsFnolView: First Notice of Loss submission intake for the Claims department
 */
export function ClaimsFnolView() {
  const notify = useNotify();
  const redirect = useRedirect();
  const [form, setForm] = useState({
    policyNbr: 'POL-2026-8832',
    insuredName: 'TechSolutions Corp',
    lossDate: new Date().toISOString().slice(0, 10),
    lossLocation: 'Chicago, IL',
    reserveAmt: '$25,000',
    description: ''
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    notify('FNOL reported successfully. Claim file initialized in pending review state.', { type: 'success' });
  };

  return (
    <Box sx={{ maxWidth: 840, mx: 'auto', p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
        <ReportProblemIcon sx={{ fontSize: 32, color: '#ef4444' }} />
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#0f172a' }}>
            First Notice of Loss (FNOL) Intake
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748b' }}>
            Report an incident and initialize claim reserves and adjuster assignment
          </Typography>
        </Box>
      </Box>

      {submitted && (
        <Alert severity="success" sx={{ mb: 3 }}>
          First Notice of Loss submitted for policy <strong>{form.policyNbr}</strong>. Claim reserve set to{' '}
          <strong>{form.reserveAmt}</strong>.
        </Alert>
      )}

      <Card variant="outlined" sx={{ borderRadius: 2 }}>
        <CardHeader
          title="Incident Report Form"
          subheader="Enter casualty or property loss particulars"
          sx={{ borderBottom: '1px solid #e2e8f0', pb: 1.5 }}
        />
        <CardContent sx={{ pt: 3 }}>
          <form onSubmit={handleSubmit}>
            <Grid container spacing={2.5}>
              <Grid item xs={12} sm={6}>
                <MuiTextField
                  label="Policy Number"
                  fullWidth
                  required
                  value={form.policyNbr}
                  onChange={(e) => setForm({ ...form, policyNbr: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <MuiTextField
                  label="Insured Organization"
                  fullWidth
                  required
                  value={form.insuredName}
                  onChange={(e) => setForm({ ...form, insuredName: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <MuiTextField
                  label="Date of Loss"
                  type="date"
                  fullWidth
                  required
                  InputLabelProps={{ shrink: true }}
                  value={form.lossDate}
                  onChange={(e) => setForm({ ...form, lossDate: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <MuiTextField
                  label="Initial Reserve Estimate"
                  fullWidth
                  required
                  value={form.reserveAmt}
                  onChange={(e) => setForm({ ...form, reserveAmt: e.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <MuiTextField
                  label="Incident & Damage Description"
                  multiline
                  rows={4}
                  fullWidth
                  required
                  placeholder="Detail the cause of loss, involved parties, property damage, or bodily injury..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </Grid>
            </Grid>

            <Box sx={{ mt: 3, display: 'flex', gap: 1.5, justifyContent: 'flex-end' }}>
              <Button variant="outlined" onClick={() => redirect('/claims')}>
                Cancel
              </Button>
              <Button type="submit" variant="contained" sx={{ backgroundColor: '#dc2626', '&:hover': { backgroundColor: '#b91c1c' } }}>
                File Claim (FNOL)
              </Button>
            </Box>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
}

/**
 * ClaimsOpenView: View dedicated to monitoring active open claims and reserve balances
 */
export function ClaimsOpenView() {
  return (
    <Box sx={{ p: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
        <FolderSpecialIcon sx={{ fontSize: 32, color: '#f59e0b' }} />
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#0f172a' }}>
            Open Claims & Reserve Audit
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748b' }}>
            Active open claim files requiring ongoing adjuster contact, reserve adjustments, or litigation tracking
          </Typography>
        </Box>
      </Box>

      <Card variant="outlined" sx={{ borderRadius: 2 }}>
        <CardContent sx={{ p: 0 }}>
          <ClaimList />
        </CardContent>
      </Card>
    </Box>
  );
}

/**
 * ClaimsLossRunsView: Reporting and analytics for historical loss runs
 */
export function ClaimsLossRunsView() {
  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
        <AssessmentIcon sx={{ fontSize: 32, color: '#10b981' }} />
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#0f172a' }}>
            Loss Runs & Actuarial Reports
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748b' }}>
            Generate 5-year valued loss runs, incurred loss trends, and claims loss frequency analysis
          </Typography>
        </Box>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card variant="outlined" sx={{ p: 2, textAlign: 'center', backgroundColor: '#f0fdf4' }}>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#15803d' }}>
              $142,500
            </Typography>
            <Typography variant="body2" sx={{ color: '#166534', fontWeight: 600 }}>
              Total Paid Losses (YTD)
            </Typography>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card variant="outlined" sx={{ p: 2, textAlign: 'center', backgroundColor: '#fffbeb' }}>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#b45309' }}>
              $385,000
            </Typography>
            <Typography variant="body2" sx={{ color: '#92400e', fontWeight: 600 }}>
              Outstanding Case Reserves
            </Typography>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card variant="outlined" sx={{ p: 2, textAlign: 'center', backgroundColor: '#eff6ff' }}>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#1d4ed8' }}>
              28.4%
            </Typography>
            <Typography variant="body2" sx={{ color: '#1e40af', fontWeight: 600 }}>
              Net Incurred Loss Ratio
            </Typography>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

