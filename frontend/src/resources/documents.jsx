import React from 'react';
import {
  List,
  Datagrid,
  TextField,
  Show,
  SimpleShowLayout,
  SearchInput,
  useRecordContext,
  TopToolbar
} from 'react-admin';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Card, CardContent, Chip, Typography, Breadcrumbs, Link, Button, IconButton, Tooltip } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArticleIcon from '@mui/icons-material/Article';
import { Eye, ExternalLink, Download } from 'lucide-react';
import { getActiveTenantId } from '../tenantContext.jsx';
import { openDocumentViewer } from '../utils/documentViewer.js';

const documentFilters = [
  <SearchInput key="q" source="q" alwaysOn placeholder="Filter by Document Title or Type..." />
];

function ViewDocumentButton() {
  const record = useRecordContext();
  if (!record) return null;

  return (
    <Button
      variant="outlined"
      size="small"
      startIcon={<Eye size={14} />}
      onClick={(e) => {
        e.stopPropagation();
        const tenantId = getActiveTenantId();
        openDocumentViewer(record, 0, tenantId);
      }}
      sx={{
        textTransform: 'none',
        borderRadius: 1.5,
        fontWeight: 600,
        fontSize: '0.75rem',
        borderColor: '#0284c7',
        color: '#0284c7',
        '&:hover': { bgcolor: '#f0f9ff', borderColor: '#0369a1' }
      }}
    >
      View
    </Button>
  );
}

export function DocumentList(props) {
  const handleRowClick = (id, resource, record) => {
    const tenantId = getActiveTenantId();
    openDocumentViewer(record, 0, tenantId);
    return false; // prevent navigation away to default show view
  };

  return (
    <List
      resource="documents"
      title="Documents & File Intake Center"
      filters={documentFilters}
      perPage={25}
      sort={{ field: 'documentId', order: 'DESC' }}
      {...props}
    >
      <Datagrid
        rowClick={handleRowClick}
        bulkActionButtons={false}
        sx={{
          '& .RaDatagrid-row:hover': { cursor: 'pointer', backgroundColor: '#f8fafc' }
        }}
      >
        <TextField source="fileName" label="File Name" sx={{ fontWeight: 700, color: '#0284c7' }} />
        <TextField source="documentType" label="Document Classification" />
        <TextField source="fileExtension" label="Format" />
        <TextField source="uploadedBy" label="Uploaded By" />
        <TextField source="createdAt" label="Date Created" />
        <TextField source="status" label="Status" />
        <ViewDocumentButton label="Action" />
      </Datagrid>
    </List>
  );
}

function DocumentShowActions() {
  const record = useRecordContext();
  if (!record) return null;

  return (
    <TopToolbar>
      <Button
        variant="contained"
        startIcon={<ExternalLink size={16} />}
        onClick={() => {
          const tenantId = getActiveTenantId();
          openDocumentViewer(record, 0, tenantId);
        }}
        sx={{
          backgroundColor: '#0284c7',
          textTransform: 'none',
          fontWeight: 700,
          '&:hover': { backgroundColor: '#0369a1' }
        }}
      >
        Open in Document Viewer
      </Button>
    </TopToolbar>
  );
}

export function DocumentShow() {
  return (
    <Show title="Document Metadata" actions={<DocumentShowActions />}>
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
