import React from 'react';
import {
  List,
  Datagrid,
  TextField,
  Show,
  SimpleShowLayout,
  SearchInput
} from 'react-admin';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Card, CardContent, Chip, Typography, Breadcrumbs, Link } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DynamicFormIcon from '@mui/icons-material/DynamicForm';

const formFilters = [
  <SearchInput key="q" source="q" alwaysOn placeholder="Filter by Form Code or Title..." />
];

export function FormList(props) {
  return (
    <List
      resource="forms"
      title="Standard Forms & Schedule Repository"
      filters={formFilters}
      perPage={25}
      sort={{ field: 'formCode', order: 'ASC' }}
      {...props}
    >
      <Datagrid rowClick="show" bulkActionButtons={false}>
        <TextField source="formCode" label="Form / Schedule Code" sx={{ fontWeight: 700, color: '#1e40af' }} />
        <TextField source="formName" label="Form Title & Description" />
        <TextField source="category" label="Coverage Category" />
        <TextField source="version" label="Edition / Version" />
        <TextField source="status" label="Status" />
      </Datagrid>
    </List>
  );
}

export function FormShow() {
  return (
    <Show title="Insurance Form Specification">
      <SimpleShowLayout>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
          Form Configuration & Schedule Definition
        </Typography>
        <TextField source="formCode" label="Form Code" />
        <TextField source="formName" label="Title" />
        <TextField source="category" label="Category" />
        <TextField source="version" label="Edition" />
        <TextField source="status" label="Status" />
      </SimpleShowLayout>
    </Show>
  );
}

/**
 * NestedFormsView: Component handling Tier 3 nested route paths:
 * - /submissions/:id/forms or /submissions/forms
 * - /policies/:id/forms or /policies/forms
 */
export function NestedFormsView({ context = 'submissions' }) {
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
          Forms & Schedules
        </Typography>
      </Breadcrumbs>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
        <DynamicFormIcon sx={{ fontSize: 32, color: '#0284c7' }} />
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#0f172a' }}>
            {parentTitle} Forms & ACORD Schedules
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748b' }}>
            {id
              ? `ACORD applications, supplemental question forms, and endorsements assigned to ${isSubmission ? 'Submission' : 'Policy'} #${id}`
              : `ACORD forms and standard insurance questionnaires across all ${parentTitle.toLowerCase()}`}
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
          <FormList />
        </CardContent>
      </Card>
    </Box>
  );
}

