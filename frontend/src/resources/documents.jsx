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
import ArticleIcon from '@mui/icons-material/Article';

const documentFilters = [
  <SearchInput key="q" source="q" alwaysOn placeholder="Filter by Document Title or Type..." />
];

export function DocumentList(props) {
  return (
    <List
      resource="documents"
      title="Documents & File Intake Center"
      filters={documentFilters}
      perPage={25}
      sort={{ field: 'documentId', order: 'DESC' }}
      {...props}
    >
      <Datagrid rowClick="show" bulkActionButtons={false}>
        <TextField source="fileName" label="File Name" sx={{ fontWeight: 700 }} />
        <TextField source="documentType" label="Document Classification" />
        <TextField source="fileExtension" label="Format" />
        <TextField source="uploadedBy" label="Uploaded By" />
        <TextField source="createdAt" label="Date Created" />
        <TextField source="status" label="Status" />
      </Datagrid>
    </List>
  );
}

export function DocumentShow() {
  return (
    <Show title="Document Metadata">
      <SimpleShowLayout>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
          Document Record & Metadata
        </Typography>
        <TextField source="fileName" label="File Name" />
        <TextField source="documentType" label="Classification" />
        <TextField source="fileExtension" label="Format / Type" />
        <TextField source="status" label="Processing Status" />
      </SimpleShowLayout>
    </Show>
  );
}

/**
 * NestedDocumentsView: Component handling Tier 3 nested route paths:
 * - /submissions/:id/documents or /submissions/documents
 * - /policies/:id/documents or /policies/documents
 */
export function NestedDocumentsView({ context = 'submissions' }) {
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
          Documents
        </Typography>
      </Breadcrumbs>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
        <ArticleIcon sx={{ fontSize: 32, color: '#0284c7' }} />
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#0f172a' }}>
            {parentTitle} Attached Documents
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748b' }}>
            {id
              ? `Manage policy endorsements, intake files, and client PDFs for ${isSubmission ? 'Submission' : 'Policy'} #${id}`
              : `Consolidated document repository across all active ${parentTitle.toLowerCase()}`}
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
          <DocumentList />
        </CardContent>
      </Card>
    </Box>
  );
}

