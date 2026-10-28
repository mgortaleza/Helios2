import React from 'react';
import {
  List,
  Datagrid,
  TextField,
  DateField,
  NumberField,
  ChipField,
  Show,
  SimpleShowLayout,
  TopToolbar,
  ExportButton,
  SearchInput,
  useRecordContext,
  useRedirect,
  Button
} from 'react-admin';
import { Box, Card, CardContent, Chip, Grid, Typography, Stack } from '@mui/material';
import RequestQuoteIcon from '@mui/icons-material/RequestQuote';
import ArticleIcon from '@mui/icons-material/Article';
import DynamicFormIcon from '@mui/icons-material/DynamicForm';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

const policyFilters = [
  <SearchInput key="q" source="q" alwaysOn placeholder="Filter by Policy # or Insured..." />
];

function PolicyListActions() {
  return (
    <TopToolbar>
      <ExportButton />
    </TopToolbar>
  );
}

export function PolicyList(props) {
  return (
    <List
      resource="policies"
      title="Underwriting Policies"
      filters={policyFilters}
      actions={<PolicyListActions />}
      perPage={25}
      sort={{ field: 'policyNbr', order: 'DESC' }}
      {...props}
    >
      <Datagrid rowClick="show" bulkActionButtons={false}>
        <TextField source="policyNbr" label="Policy #" sx={{ fontWeight: 700 }} />
        <TextField source="insuredName" label="Insured Organization" />
        <TextField source="productType" label="Product / Line" />
        <TextField source="effectiveDate" label="Effective Date" />
        <TextField source="expirationDate" label="Expiration Date" />
        <TextField source="premiumAmt" label="Annual Premium" sx={{ fontWeight: 600, color: '#047857' }} />
        <TextField source="policyStatus" label="Status" />
      </Datagrid>
    </List>
  );
}

function PolicyShowActions() {
  const record = useRecordContext();
  const redirect = useRedirect();

  if (!record) return null;

  return (
    <TopToolbar>
      <Button
        label="Quotes & Rating"
        onClick={() => redirect(`/policies/${record.id}/quotes`)}
        startIcon={<RequestQuoteIcon />}
      />
      <Button
        label="Documents"
        onClick={() => redirect(`/policies/${record.id}/documents`)}
        startIcon={<ArticleIcon />}
      />
      <Button
        label="Forms"
        onClick={() => redirect(`/policies/${record.id}/forms`)}
        startIcon={<DynamicFormIcon />}
      />
    </TopToolbar>
  );
}

export function PolicyShow() {
  return (
    <Show title="Policy Details" actions={<PolicyShowActions />}>
      <SimpleShowLayout>
        <Box sx={{ mb: 2 }}>
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#0f172a' }}>
            Commercial Insurance Policy
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748b' }}>
            Underwriting Contract & Rating Ledger
          </Typography>
        </Box>

        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={4}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="caption" color="textSecondary">POLICY NUMBER</Typography>
                <TextField source="policyNbr" sx={{ display: 'block', fontSize: '1.1rem', fontWeight: 700 }} />
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="caption" color="textSecondary">INSURED NAME</Typography>
                <TextField source="insuredName" sx={{ display: 'block', fontSize: '1.1rem', fontWeight: 600 }} />
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="caption" color="textSecondary">TOTAL WRITTEN PREMIUM</Typography>
                <TextField source="premiumAmt" sx={{ display: 'block', fontSize: '1.1rem', fontWeight: 700, color: '#059669' }} />
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#334155', mb: 1 }}>
            TERTIARY NAVIGATION SHORTCUTS
          </Typography>
          <PolicyShowActions />
        </Box>
      </SimpleShowLayout>
    </Show>
  );
}

