import React from 'react';
import {
  List,
  Datagrid,
  TextField,
  Show,
  SimpleShowLayout,
  TopToolbar,
  ExportButton,
  SearchInput,
  useRedirect,
  Button
} from 'react-admin';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Card, CardContent, Chip, Typography, Breadcrumbs, Link } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CalculateIcon from '@mui/icons-material/Calculate';

const quoteFilters = [
  <SearchInput key="q" source="q" alwaysOn placeholder="Filter by Quote # or Insured..." />
];

export function QuoteList(props) {
  return (
    <List
      resource="quotes"
      title="Quotes & Rating Center"
      filters={quoteFilters}
      perPage={25}
      sort={{ field: 'quoteId', order: 'DESC' }}
      {...props}
    >
      <Datagrid rowClick="show" bulkActionButtons={false}>
        <TextField source="quoteNbr" label="Quote #" sx={{ fontWeight: 700 }} />
        <TextField source="insuredName" label="Insured Organization" />
        <TextField source="productType" label="Line of Business" />
        <TextField source="ratePlanVersion" label="BRMS Rating Plan" />
        <TextField source="calculatedPremium" label="Calculated Premium" sx={{ fontWeight: 700, color: '#047857' }} />
        <TextField source="quoteStatus" label="Quote Status" />
      </Datagrid>
    </List>
  );
}

export function QuoteShow() {
  return (
    <Show title="Quote Details">
      <SimpleShowLayout>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
          Underwriting Rating Worksheet & Quote Summary
        </Typography>
        <TextField source="quoteNbr" label="Quote Number" />
        <TextField source="insuredName" label="Insured Organization" />
        <TextField source="productType" label="Product / Program" />
        <TextField source="calculatedPremium" label="Calculated Premium" />
        <TextField source="ratePlanVersion" label="Rate Plan Version" />
      </SimpleShowLayout>
    </Show>
  );
}

/**
 * NestedQuotesView: Component handling Tier 3 nested route paths:
 * - /submissions/:id/quotes or /submissions/quotes
 * - /policies/:id/quotes or /policies/quotes
 */
export function NestedQuotesView({ context = 'submissions' }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const isSubmission = context === 'submissions';
  const parentTitle = isSubmission ? 'Submissions' : 'Policies';
  const parentBaseUrl = isSubmission ? '/submissions' : '/policies';

  return (
    <Box sx={{ p: 1 }}>
      <Breadcrumbs sx={{ mb: 2, fontSize: '0.85rem' }}>
        <Link
          component="button"
          variant="body2"
          onClick={() => navigate(parentBaseUrl)}
          sx={{ display: 'flex', alignItems: 'center', gap: 0.5, cursor: 'pointer', textDecoration: 'none' }}
        >
          <ArrowBackIcon fontSize="small" />
          {parentTitle} {id ? `#${id}` : ''}
        </Link>
        <Typography color="text.primary" sx={{ fontWeight: 600 }}>
          Quotes & Rating
        </Typography>
      </Breadcrumbs>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
        <CalculateIcon sx={{ fontSize: 32, color: '#0284c7' }} />
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#0f172a' }}>
            {parentTitle} Quotes & Rating Worksheet
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748b' }}>
            {id
              ? `Dynamic rating calculations and generated rate proposals for ${isSubmission ? 'Submission' : 'Policy'} #${id}`
              : `Dynamic rating calculations and quote records across all active ${parentTitle.toLowerCase()}`}
          </Typography>
        </Box>
        {id && (
          <Chip
            label={`Parent ID: ${id}`}
            color="primary"
            variant="outlined"
            size="small"
            sx={{ ml: 'auto', fontWeight: 600 }}
          />
        )}
      </Box>

      <Card variant="outlined" sx={{ borderRadius: 2 }}>
        <CardContent sx={{ p: 0 }}>
          <QuoteList />
        </CardContent>
      </Card>
    </Box>
  );
}

