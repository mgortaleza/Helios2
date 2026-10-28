import React, { useState, useEffect } from 'react';
import {
  List,
  Datagrid,
  TextField,
  DateField,
  Show,
  SimpleShowLayout,
  Create,
  SimpleForm,
  TextInput,
  DateInput,
  SelectInput,
  FileInput,
  FileField,
  ReferenceInput,
  required,
  TopToolbar,
  CreateButton,
  useRecordContext,
  useNotify,
  useRedirect,
  Button as RaButton
} from 'react-admin';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Grid,
  Button,
  TextField as MuiTextField,
  Chip,
  Alert,
  CircularProgress,
  Divider,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  Breadcrumbs,
  Link
} from '@mui/material';
import {
  FileText,
  Upload,
  Play,
  Download,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Sparkles,
  ArrowLeft,
  FileCheck,
  Layers,
  RefreshCw,
  ExternalLink,
  Eye
} from 'lucide-react';
import { getActiveTenantId } from '../tenantContext.jsx';
import { openDocumentViewer } from '../utils/documentViewer.js';

export const PRODUCT_OPTIONS = [
  { id: 1, name: 'Commercial Property (CP)' },
  { id: 2, name: 'Commercial General Liability (CGL)' },
  { id: 3, name: 'Medical Malpractice (MED_MAL)' },
  { id: 4, name: 'Technology Errors & Omissions (TECH_EO)' },
  { id: 5, name: 'Business Owners Policy (BOP)' },
  { id: 6, name: 'Commercial Auto (CA)' }
];

export function getProductName(id) {
  const match = PRODUCT_OPTIONS.find((p) => p.id === Number(id));
  return match ? match.name : `Product #${id}`;
}

const ListActions = () => (
  <TopToolbar>
    <CreateButton label="Ingest New Dec Template" icon={<Upload size={16} />} />
  </TopToolbar>
);

export function DecPageTemplateList(props) {
  const navigate = useNavigate();

  return (
    <Box sx={{ p: 1 }}>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <FileText size={26} color="#0284c7" />
          Declaration Page Template Engine
        </Typography>
        <Typography variant="body2" sx={{ color: '#64748b', mt: 0.5 }}>
          Upload, ingest, parse dynamic Word (.docx) Declaration Page templates, and test variable coverage table row cloning.
        </Typography>
      </Box>

      <List actions={<ListActions />} perPage={20} sort={{ field: 'effectiveDate', order: 'DESC' }} {...props}>
        <Datagrid
          rowClick="show"
          bulkActionButtons={false}
          sx={{
            '& .RaDatagrid-headerCell': { fontWeight: 700, backgroundColor: '#f8fafc' },
            '& .RaDatagrid-row:hover': { backgroundColor: '#f1f5f9', cursor: 'pointer' }
          }}
        >
          <TextField
            source="form_id"
            label="Form ID"
            sx={{ fontWeight: 700, color: '#0284c7', fontFamily: 'monospace' }}
          />
          <TextField source="form_revision" label="Revision" sx={{ fontWeight: 600 }} />
          <TextField source="form_name" label="Form Name / Title" />
          <DateField source="effective_date" label="Effective Date" />
          <ProductChipField source="product_id" label="Line / Product" />
          <ExtractedCountField label="Discovered Fields" />
          <ActionTestButton />
        </Datagrid>
      </List>
    </Box>
  );
}

function ProductChipField({ source }) {
  const record = useRecordContext();
  if (!record) return null;
  const productId = record[source];
  return (
    <Chip
      label={getProductName(productId)}
      size="small"
      sx={{ backgroundColor: '#e0f2fe', color: '#0369a1', fontWeight: 600, fontSize: '0.75rem' }}
    />
  );
}

function ExtractedCountField() {
  const record = useRecordContext();
  if (!record) return null;
  const count = Array.isArray(record.fields) ? record.fields.length : 0;
  return (
    <Chip
      label={`${count} Fields`}
      size="small"
      color={count > 0 ? 'success' : 'default'}
      variant="outlined"
      sx={{ fontWeight: 600, fontSize: '0.75rem' }}
    />
  );
}

function ActionTestButton() {
  const record = useRecordContext();
  const navigate = useNavigate();
  if (!record) return null;

  return (
    <Button
      variant="contained"
      size="small"
      startIcon={<Play size={14} />}
      onClick={(e) => {
        e.stopPropagation();
        navigate(`/dec-page-templates/${record.id}/show`);
      }}
      sx={{
        backgroundColor: '#0284c7',
        color: '#ffffff',
        textTransform: 'none',
        fontWeight: 600,
        borderRadius: 1.5,
        '&:hover': { backgroundColor: '#0369a1' }
      }}
    >
      Test Dec Page
    </Button>
  );
}

/**
 * Requirement 2: Template Creation Form:
 * - inputs for form_id, form_revision, form_name, effective_date, and product_id
 * - file upload component for DOCX template
 * - single request multipart upload to backend
 */
export function DecPageTemplateCreate() {
  const redirect = useRedirect();
  const notify = useNotify();

  return (
    <Box sx={{ maxWidth: 840, mx: 'auto', p: 2 }}>
      <Card sx={{ borderRadius: 2, boxShadow: '0 4px 12px rgba(15, 23, 42, 0.08)' }}>
        <CardHeader
          avatar={<Upload size={24} color="#0284c7" />}
          title={
            <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a' }}>
              Ingest Word (.docx) Dec Page Template
            </Typography>
          }
          subheader="Aspose.Words will scan the DOCX stream to extract all <<field_names>> and configure the variable coverage table."
        />
        <Divider />
        <CardContent>
          <SimpleForm
            defaultValues={{
              form_revision: '2026.01',
              effective_date: new Date().toISOString().substring(0, 10),
              product_id: 1
            }}
            sx={{ p: 1 }}
          >
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextInput
                  source="form_id"
                  label="Form ID (e.g. DEC-HO3-001, DEC-CGL-2026)"
                  validate={[required()]}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextInput
                  source="form_revision"
                  label="Form Revision (e.g. 2026.01)"
                  validate={[required()]}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12}>
                <TextInput
                  source="form_name"
                  label="Form Name / Description"
                  validate={[required()]}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <DateInput
                  source="effective_date"
                  label="Effective Date"
                  validate={[required()]}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <ReferenceInput source="product_id" reference="products">
                  <SelectInput optionText="name" label="Insurance Product" validate={[required()]} fullWidth />
                </ReferenceInput>
              </Grid>
              <Grid item xs={12}>
                <Box
                  sx={{
                    border: '2px dashed #94a3b8',
                    borderRadius: 2,
                    p: 2,
                    backgroundColor: '#f8fafc',
                    textAlign: 'center'
                  }}
                >
                  <FileInput
                    source="file"
                    label="Word Template (.docx)"
                    accept={{
                      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
                    }}
                    validate={[required()]}
                    placeholder={<p>Drag and drop a .docx Declaration Page template, or click to browse</p>}
                  >
                    <FileField source="src" title="title" />
                  </FileInput>
                  <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mt: 1 }}>
                    Must be a Microsoft Word (.docx) file containing &lt;&lt;field_names&gt;&gt; and tabular coverage rows.
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </SimpleForm>
        </CardContent>
      </Card>
    </Box>
  );
}

/**
 * Requirement 2: Template Show & Interactive Testing UI:
 * - Fetches extracted fields from backend
 * - Dynamically renders form (one text input per extracted field)
 * - Renders editable Variable Coverage Table for tabular row cloning
 * - "Generate Test Dec Page" button submits test values & downloads resulting populated DOCX
 */
export function DecPageTemplateShow() {
  const { id } = useParams();
  const navigate = useNavigate();
  const notify = useNotify();

  const [template, setTemplate] = useState(null);
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [lastGeneratedDoc, setLastGeneratedDoc] = useState(null);
  const [testValues, setTestValues] = useState({});
  const [coverageRows, setCoverageRows] = useState([
    {
      Coverage_Name: 'Commercial Property - Building',
      Coverage_Limit: '$2,500,000',
      Coverage_Deductible: '$10,000',
      Coverage_Premium: '$4,200.00'
    },
    {
      Coverage_Name: 'Business Personal Property (BPP)',
      Coverage_Limit: '$1,000,000',
      Coverage_Deductible: '$5,000',
      Coverage_Premium: '$2,850.00'
    },
    {
      Coverage_Name: 'Commercial General Liability',
      Coverage_Limit: '$2,000,000 Occ / $4,000,000 Agg',
      Coverage_Deductible: '$0',
      Coverage_Premium: '$2,700.00'
    }
  ]);

  const loadTemplate = async () => {
    try {
      setLoading(true);
      const tenantId = getActiveTenantId();
      const res = await fetch(`/document-api/dec-page-templates/${id}`, {
        headers: { 'X-Tenant-Id': String(tenantId) }
      });
      if (!res.ok) throw new Error('Template not found');
      const data = await res.json();
      setTemplate(data);

      const fieldList = Array.isArray(data.fields) ? data.fields : [];
      setFields(fieldList);

      // Initialize default test values for flat fields
      const initial = {};
      fieldList.forEach((f) => {
        if (!f.startsWith('Coverage_')) {
          initial[f] = getSampleValueForField(f);
        }
      });
      setTestValues(initial);
    } catch (err) {
      notify(`Failed to load template: ${err.message}`, { type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplate();
  }, [id]);

  function getSampleValueForField(fieldName) {
    const fn = fieldName.toLowerCase();
    if (fn.includes('policy_number') || fn.includes('policynumber')) return 'POL-2026-9942-01';
    if (fn.includes('city')) return 'Chicago';
    if (fn.includes('state')) return 'IL';
    if (fn.includes('zip')) return '60611';
    if (fn.includes('address_line_1') || fn.includes('line_1')) return '450 North Michigan Ave, Suite 1200';
    if (fn.includes('location_address') || fn.includes('address')) return '450 North Michigan Ave, Suite 1200';
    if (fn.includes('named_insured') || fn.includes('insured_name') || fn.includes('insured')) return 'Helios Logistics & Transport Inc.';
    if (fn.includes('effective_date') || fn.includes('effdate')) return '01/01/2026';
    if (fn.includes('expiration_date') || fn.includes('expdate')) return '01/01/2027';
    if (fn.includes('agency_name') || fn.includes('agency')) return 'Midwest Underwriters Agency Corp';
    if (fn.includes('agency_code') || fn.includes('agent_code') || fn.includes('producer_code')) return 'AG-IL-8842';
    if (fn.includes('agency_contact') || fn.includes('contact_info')) return 'commercial@midwestbrokerage.com | (312) 555-0199';
    if (fn.includes('risk_id')) return 'LOC-001 / BLDG-01';
    if (fn.includes('risk_desc')) return 'Commercial Office Building & Warehouse Facilities';
    if (fn.includes('fees') || fn.includes('surcharges')) return '$150.00 (Guaranty Fund & Inspection Surcharge)';
    if (fn.includes('amount_due')) return '$9,900.00';
    if (fn.includes('total_premium') || fn.includes('premium')) return '$9,750.00';
    if (fn.includes('company_name')) return 'Helios Specialty Insurance Company';
    if (fn.includes('transaction_type')) return 'New Business Policy Issue';
    if (fn.includes('lob_name') || fn.includes('line_of_business')) return 'Commercial Property & Casualty';
    if (fn.includes('issue_date')) return '01/15/2026';
    return `Sample ${fieldName}`;
  }

  const handleFieldChange = (fieldName, val) => {
    setTestValues((prev) => ({ ...prev, [fieldName]: val }));
  };

  const handleCoverageRowChange = (index, col, val) => {
    setCoverageRows((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [col]: val };
      return copy;
    });
  };

  const addCoverageRow = () => {
    setCoverageRows((prev) => [
      ...prev,
      {
        Coverage_Name: 'Equipment Breakdown & Spoilage',
        Coverage_Limit: '$500,000',
        Coverage_Deductible: '$2,500',
        Coverage_Premium: '$850.00'
      }
    ]);
  };

  const removeCoverageRow = (index) => {
    setCoverageRows((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePreFillAll = () => {
    const filled = {};
    fields.forEach((f) => {
      if (!f.startsWith('Coverage_')) {
        filled[f] = getSampleValueForField(f);
      }
    });
    setTestValues(filled);
    notify('Sample test values pre-filled!', { type: 'info' });
  };

  /**
   * Requirement 4: Test Generation Trigger & Populated PDF Download
   */
  const handleGenerateTestDecPage = async () => {
    try {
      setGenerating(true);
      const tenantId = getActiveTenantId();

      // Merge flat fields with numbered coverage tags from coverageRows
      const coverageSlotValues = {};
      coverageRows.forEach((row, idx) => {
        const slot = idx + 1;
        coverageSlotValues[`Coverage_${slot}_Name`] = row.Coverage_Name || '';
        coverageSlotValues[`Coverage_${slot}_Limit`] = row.Coverage_Limit || '';
        coverageSlotValues[`Coverage_${slot}_Deductible`] = row.Coverage_Deductible || '';
        coverageSlotValues[`Coverage_${slot}_Premium`] = row.Coverage_Premium || '';
      });

      const payload = {
        fieldValues: {
          ...testValues,
          ...coverageSlotValues
        },
        coverages: coverageRows
      };

      const res = await fetch(`/document-api/dec-page-templates/${id}/generate-test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-Id': String(tenantId)
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || `Server returned HTTP ${res.status}`);
      }

      const blob = await res.blob();
      const contentDisposition = res.headers.get('Content-Disposition') || '';
      let filename = `Test_DecPage_${template?.form_id || id}.pdf`;
      const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (match && match[1]) {
        filename = match[1].replace(/['"]/g, '').trim();
      }

      // Create active blob URL for viewing and downloading
      const blobUrl = window.URL.createObjectURL(blob);
      const generatedDocRecord = {
        documentName: filename,
        fileName: filename,
        fileSizeBytes: blob.size,
        mimeType: 'application/pdf',
        previewUrl: blobUrl,
        downloadUrl: blobUrl,
        status: 'TEST_GENERATED'
      };
      setLastGeneratedDoc(generatedDocRecord);

      // Launch in the document inbox viewer
      openDocumentViewer(generatedDocRecord, 0, tenantId);

      // Trigger browser download
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      notify('Populated Test Dec Page (.pdf) generated, opened in Document Viewer, and downloaded!', { type: 'success' });
    } catch (err) {
      notify(`Test Generation Failed: ${err.message}`, { type: 'error' });
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!template) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Dec Page Template #{id} could not be found.</Alert>
      </Box>
    );
  }

  const flatFields = fields.filter((f) => !f.startsWith('Coverage_'));
  const coverageFields = fields.filter((f) => f.startsWith('Coverage_'));

  return (
    <Box sx={{ p: 2 }}>
      {/* Navigation Breadcrumbs */}
      <Breadcrumbs sx={{ mb: 2, fontSize: '0.85rem' }}>
        <Link
          component="button"
          variant="body2"
          onClick={() => navigate('/dec-page-templates')}
          sx={{ display: 'flex', alignItems: 'center', gap: 0.5, cursor: 'pointer', textDecoration: 'none' }}
        >
          <ArrowLeft size={14} /> Back to Dec Templates
        </Link>
        <Typography color="text.primary" sx={{ fontWeight: 600 }}>
          {template.form_id} (Rev: {template.form_revision})
        </Typography>
      </Breadcrumbs>

      {/* Header Banner */}
      <Card sx={{ mb: 3, borderLeft: '5px solid #0284c7' }}>
        <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 2 }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800, color: '#0f172a' }}>
              {template.form_name}
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748b', mt: 0.5 }}>
              Form ID: <strong>{template.form_id}</strong> &bull; Revision: <strong>{template.form_revision}</strong> &bull; Product: <strong>{getProductName(template.product_id)}</strong> &bull; Effective: <strong>{template.effective_date}</strong>
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
            {lastGeneratedDoc && (
              <Button
                variant="outlined"
                size="large"
                startIcon={<ExternalLink size={18} />}
                onClick={() => openDocumentViewer(lastGeneratedDoc, 0, getActiveTenantId())}
                sx={{
                  textTransform: 'none',
                  fontWeight: 700,
                  px: 2.5,
                  borderColor: '#0284c7',
                  color: '#0284c7',
                  '&:hover': { borderColor: '#0369a1', bgcolor: '#f0f9ff' }
                }}
              >
                Open in Viewer
              </Button>
            )}
            <Button
              variant="contained"
              color="primary"
              size="large"
              disabled={generating}
              startIcon={generating ? <CircularProgress size={18} color="inherit" /> : <Play size={18} />}
              onClick={handleGenerateTestDecPage}
              sx={{
                backgroundColor: '#0284c7',
                textTransform: 'none',
                fontWeight: 700,
                px: 3,
                boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)',
                '&:hover': { backgroundColor: '#0369a1' }
              }}
            >
              {generating ? 'Generating PDF...' : 'Generate Test Dec Page (PDF)'}
            </Button>
          </Box>
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        {/* Left Column: Template Metadata & Discovered Fields */}
        <Grid item xs={12} md={4}>
          <Card sx={{ mb: 3 }}>
            <CardHeader
              title={<Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Template Specification</Typography>}
              avatar={<FileCheck size={20} color="#0284c7" />}
            />
            <Divider />
            <CardContent sx={{ pt: 1.5 }}>
              <Box sx={{ mb: 1.5 }}>
                <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>Form Identification</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{template.form_id} (Rev: {template.form_revision})</Typography>
              </Box>
              <Box sx={{ mb: 1.5 }}>
                <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>Form Title</Typography>
                <Typography variant="body2">{template.form_name}</Typography>
              </Box>
              <Box sx={{ mb: 1.5 }}>
                <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>Insurance Product</Typography>
                <Chip label={getProductName(template.product_id)} size="small" sx={{ mt: 0.5, fontWeight: 600 }} />
              </Box>
              <Box sx={{ mb: 1.5 }}>
                <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>Physical File Storage Path</Typography>
                <Typography variant="caption" sx={{ fontFamily: 'monospace', wordBreak: 'break-all', color: '#334155', backgroundColor: '#f1f5f9', p: 0.5, borderRadius: 1, display: 'block' }}>
                  {template.file_storage_path}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>Last Ingestion / Scan Date</Typography>
                <Typography variant="body2">{template.created_at || 'Just now'}</Typography>
              </Box>
            </CardContent>
          </Card>

          {/* Discovered Fields Chips */}
          <Card>
            <CardHeader
              title={
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    Extracted Tags ({fields.length})
                  </Typography>
                  <Tooltip title="Aspose.Words scanned and extracted all <<field_names>> from the DOCX stream">
                    <CheckCircle2 size={16} color="#16a34a" />
                  </Tooltip>
                </Box>
              }
              avatar={<Layers size={20} color="#0284c7" />}
            />
            <Divider />
            <CardContent>
              <Typography variant="body2" sx={{ color: '#64748b', mb: 1.5 }}>
                The following dynamic tags were discovered in the uploaded Word document:
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8 }}>
                {fields.map((f) => (
                  <Chip
                    key={f}
                    label={`<<${f}>>`}
                    size="small"
                    sx={{
                      backgroundColor: f.startsWith('Coverage_') ? '#fef3c7' : '#e0f2fe',
                      color: f.startsWith('Coverage_') ? '#b45309' : '#0369a1',
                      fontWeight: 600,
                      fontFamily: 'monospace',
                      fontSize: '0.75rem'
                    }}
                  />
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Right Column: Testing UI - Dynamic Input Form & Coverage Table */}
        <Grid item xs={12} md={8}>
          <Card sx={{ mb: 3 }}>
            <CardHeader
              title={
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    1. Flat Field Test Inputs
                  </Typography>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<Sparkles size={14} />}
                    onClick={handlePreFillAll}
                    sx={{ textTransform: 'none', borderRadius: 1.5 }}
                  >
                    Pre-fill Sample Data
                  </Button>
                </Box>
              }
              subheader="Dynamically generated form: one text input per discovered tag."
            />
            <Divider />
            <CardContent>
              <Grid container spacing={2}>
                {flatFields.map((f) => (
                  <Grid item xs={12} sm={6} key={f}>
                    <MuiTextField
                      label={`<<${f}>>`}
                      value={testValues[f] ?? ''}
                      onChange={(e) => handleFieldChange(f, e.target.value)}
                      fullWidth
                      size="small"
                      variant="outlined"
                      InputLabelProps={{ shrink: true }}
                      placeholder={`Enter test value for ${f}`}
                      helperText={`Replaces <<${f}>> in DOCX body`}
                    />
                  </Grid>
                ))}
                {flatFields.length === 0 && (
                  <Grid item xs={12}>
                    <Alert severity="info">No flat fields found in template.</Alert>
                  </Grid>
                )}
              </Grid>
            </CardContent>
          </Card>

          {/* Variable Coverage Table Strategy */}
          <Card>
            <CardHeader
              title={
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    2. Variable Coverage Table (DOM Tabular Row Cloning)
                  </Typography>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<Plus size={14} />}
                    onClick={addCoverageRow}
                    sx={{ textTransform: 'none', borderRadius: 1.5 }}
                  >
                    Add Coverage Row
                  </Button>
                </Box>
              }
              subheader="The second row of the coverages table is deep cloned for each entry and the original template row is removed."
            />
            <Divider />
            <CardContent sx={{ p: 0 }}>
              <TableContainer component={Paper} elevation={0}>
                <Table size="small">
                  <TableHead sx={{ backgroundColor: '#f8fafc' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, width: '30%' }}>&lt;&lt;Coverage_Name&gt;&gt;</TableCell>
                      <TableCell sx={{ fontWeight: 700, width: '25%' }}>&lt;&lt;Coverage_Limit&gt;&gt;</TableCell>
                      <TableCell sx={{ fontWeight: 700, width: '20%' }}>&lt;&lt;Coverage_Deductible&gt;&gt;</TableCell>
                      <TableCell sx={{ fontWeight: 700, width: '20%' }}>&lt;&lt;Coverage_Premium&gt;&gt;</TableCell>
                      <TableCell sx={{ width: '5%' }} align="center"></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {coverageRows.map((row, idx) => (
                      <TableRow key={idx}>
                        <TableCell>
                          <MuiTextField
                            size="small"
                            fullWidth
                            value={row.Coverage_Name || ''}
                            onChange={(e) => handleCoverageRowChange(idx, 'Coverage_Name', e.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                          <MuiTextField
                            size="small"
                            fullWidth
                            value={row.Coverage_Limit || ''}
                            onChange={(e) => handleCoverageRowChange(idx, 'Coverage_Limit', e.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                          <MuiTextField
                            size="small"
                            fullWidth
                            value={row.Coverage_Deductible || ''}
                            onChange={(e) => handleCoverageRowChange(idx, 'Coverage_Deductible', e.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                          <MuiTextField
                            size="small"
                            fullWidth
                            value={row.Coverage_Premium || ''}
                            onChange={(e) => handleCoverageRowChange(idx, 'Coverage_Premium', e.target.value)}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <IconButton
                            size="small"
                            color="error"
                            disabled={coverageRows.length <= 1}
                            onClick={() => removeCoverageRow(idx)}
                          >
                            <Trash2 size={16} />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
            <Divider />
            <Box sx={{ p: 2, display: 'flex', justifyContent: 'flex-end', gap: 2, backgroundColor: '#fafafa' }}>
              {lastGeneratedDoc && (
                <Button
                  variant="outlined"
                  size="large"
                  startIcon={<ExternalLink size={18} />}
                  onClick={() => openDocumentViewer(lastGeneratedDoc, 0, getActiveTenantId())}
                  sx={{
                    textTransform: 'none',
                    fontWeight: 700,
                    px: 3,
                    borderColor: '#0284c7',
                    color: '#0284c7',
                    '&:hover': { borderColor: '#0369a1', bgcolor: '#f0f9ff' }
                  }}
                >
                  Open in Document Viewer
                </Button>
              )}
              <Button
                variant="contained"
                size="large"
                disabled={generating}
                startIcon={generating ? <CircularProgress size={18} color="inherit" /> : <Download size={18} />}
                onClick={handleGenerateTestDecPage}
                sx={{
                  backgroundColor: '#0284c7',
                  textTransform: 'none',
                  fontWeight: 700,
                  px: 4,
                  '&:hover': { backgroundColor: '#0369a1' }
                }}
              >
                {generating ? 'Processing & Converting to PDF...' : 'Generate Test Dec Page (PDF)'}
              </Button>
            </Box>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

