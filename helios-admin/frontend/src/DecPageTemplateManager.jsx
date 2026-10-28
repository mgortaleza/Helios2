import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
  Card,
  CardContent,
  CardHeader,
  Grid,
  Divider,
  Snackbar,
  Breadcrumbs
} from '@mui/material';
import {
  FileText,
  Upload,
  RefreshCw,
  Play,
  Download,
  CheckCircle2,
  AlertCircle,
  FileCode,
  Layers,
  Sparkles,
  Plus,
  Trash2,
  FileCheck,
  FolderOpen,
  ExternalLink
} from 'lucide-react';
import { openDocumentViewer } from './utils/documentViewer.js';

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

export default function DecPageTemplateManager({ apiFetch, selectedTenantId = 1 }) {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // Upload Form state
  const [uploadFile, setUploadFile] = useState(null);
  const [formId, setFormId] = useState('');
  const [formRevision, setFormRevision] = useState('2026.01');
  const [formName, setFormName] = useState('');
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().substring(0, 10));
  const [productId, setProductId] = useState(1);
  const [uploading, setUploading] = useState(false);

  // Testing UI state
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

  const [lastGeneratedDoc, setLastGeneratedDoc] = useState(null);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'info' });
  const fileInputRef = useRef(null);

  const showToast = (message, severity = 'success') => {
    setToast({ open: true, message, severity });
  };

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/document-api/dec-page-templates', {
        headers: {
          'X-Tenant-Id': String(selectedTenantId || 1)
        }
      });
      if (res.ok) {
        const data = await res.json();
        setTemplates(data || []);
        if (data && data.length > 0) {
          // If none selected or current selection not in data, pick first
          setSelectedTemplate((prev) => {
            if (prev) {
              const stillExists = data.find((t) => t.id === prev.id);
              if (stillExists) return stillExists;
            }
            return data[0];
          });
        } else {
          setSelectedTemplate(null);
        }
      } else {
        showToast('Failed to load Dec Page templates', 'error');
      }
    } catch (err) {
      console.error('Error fetching Dec Page templates:', err);
      showToast('Error connecting to document engine', 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedTenantId]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  // Update test values whenever selected template changes
  useEffect(() => {
    if (selectedTemplate && Array.isArray(selectedTemplate.fields)) {
      const initial = {};
      selectedTemplate.fields.forEach((f) => {
        if (!f.startsWith('Coverage_')) {
          initial[f] = getSampleValueForField(f);
        }
      });
      setTestValues(initial);
    }
  }, [selectedTemplate]);

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
    if (!selectedTemplate || !selectedTemplate.fields) return;
    const filled = {};
    selectedTemplate.fields.forEach((f) => {
      if (!f.startsWith('Coverage_')) {
        filled[f] = getSampleValueForField(f);
      }
    });
    setTestValues(filled);
    showToast('Sample test values pre-filled!', 'info');
  };

  /**
   * Single-request multipart upload & ingestion
   */
  const handleUploadSubmit = async () => {
    if (!uploadFile) {
      showToast('Please select a .docx Word template file', 'error');
      return;
    }
    if (!formId.trim()) {
      showToast('Form ID is required (e.g. DEC-HO3-001)', 'error');
      return;
    }
    if (!formRevision.trim()) {
      showToast('Form Revision is required (e.g. 2026.01)', 'error');
      return;
    }
    if (!formName.trim()) {
      showToast('Form Name is required', 'error');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('form_id', formId.trim());
      formData.append('form_revision', formRevision.trim());
      formData.append('form_name', formName.trim());
      formData.append('effective_date', effectiveDate);
      formData.append('product_id', String(productId));

      const res = await fetch('/document-api/dec-page-templates', {
        method: 'POST',
        headers: {
          'X-Tenant-Id': String(selectedTenantId || 1)
        },
        body: formData
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const created = await res.json();
      showToast(`Template ingested successfully! Extracted ${created.fields?.length || 0} fields.`, 'success');
      setUploadDialogOpen(false);
      setUploadFile(null);
      setFormId('');
      setFormName('');

      // Reload templates and select newly created
      await loadTemplates();
      setSelectedTemplate(created);
    } catch (err) {
      showToast(`Upload failed: ${err.message}`, 'error');
    } finally {
      setUploading(false);
    }
  };

  /**
   * Test generation & populated PDF download
   */
  const handleGenerateTestDecPage = async () => {
    if (!selectedTemplate) return;
    setGenerating(true);
    try {
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

      const res = await fetch(`/document-api/dec-page-templates/${selectedTemplate.id}/generate-test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-Id': String(selectedTenantId || 1)
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || `Server returned HTTP ${res.status}`);
      }

      const blob = await res.blob();
      const contentDisposition = res.headers.get('Content-Disposition') || '';
      let filename = `Test_DecPage_${selectedTemplate.form_id}.pdf`;
      const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (match && match[1]) {
        filename = match[1].replace(/['"]/g, '').trim();
      }

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

      // Open in document inbox viewer
      openDocumentViewer(generatedDocRecord, 0, selectedTenantId || 1);

      // Trigger automatic browser download
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      showToast('Populated Test Dec Page (.pdf) generated, opened in Document Viewer, and downloaded!', 'success');
    } catch (err) {
      showToast(`Test Generation Failed: ${err.message}`, 'error');
    } finally {
      setGenerating(false);
    }
  };

  /**
   * Delete template
   */
  const handleDeleteTemplate = async () => {
    if (!selectedTemplate) return;
    try {
      const res = await fetch(`/document-api/dec-page-templates/${selectedTemplate.id}`, {
        method: 'DELETE',
        headers: {
          'X-Tenant-Id': String(selectedTenantId || 1)
        }
      });
      if (res.ok || res.status === 204) {
        showToast('Template deleted successfully', 'success');
        setDeleteConfirmOpen(false);
        loadTemplates();
      } else {
        showToast('Failed to delete template', 'error');
      }
    } catch (err) {
      showToast(`Delete error: ${err.message}`, 'error');
    }
  };

  const fields = Array.isArray(selectedTemplate?.fields) ? selectedTemplate.fields : [];
  const flatFields = fields.filter((f) => !f.startsWith('Coverage_'));

  return (
    <Box sx={{ p: 3, maxWidth: 1600, mx: 'auto' }}>
      {/* Top Banner */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <FileCode size={26} color="#0284c7" />
            Declaration Page Template Engine
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748b', mt: 0.5 }}>
            Enterprise Ingestion & Aspose.Words Variable Coverage Table Generation Studio for Tenant #{selectedTenantId}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshCw size={16} />}
            onClick={loadTemplates}
            disabled={loading}
            sx={{ textTransform: 'none', borderRadius: 2 }}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<Upload size={16} />}
            onClick={() => setUploadDialogOpen(true)}
            sx={{
              backgroundColor: '#0284c7',
              textTransform: 'none',
              fontWeight: 700,
              borderRadius: 2,
              '&:hover': { backgroundColor: '#0369a1' }
            }}
          >
            Ingest Dec Template (.docx)
          </Button>
        </Box>
      </Box>

      {/* Main Layout: Template Selector Sidebar + Detail/Testing Panel */}
      <Grid container spacing={3}>
        {/* Left Column: Templates List */}
        <Grid item xs={12} lg={4}>
          <Card sx={{ borderRadius: 2, boxShadow: '0 2px 8px rgba(15, 23, 42, 0.06)' }}>
            <CardHeader
              title={<Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Dec Page Repository ({templates.length})</Typography>}
              avatar={<FolderOpen size={20} color="#0284c7" />}
              subheader="Select a template to view extracted tags and test document generation"
            />
            <Divider />
            <Box sx={{ maxHeight: 680, overflowY: 'auto' }}>
              {loading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                  <CircularProgress size={28} />
                </Box>
              )}
              {!loading && templates.length === 0 && (
                <Box sx={{ p: 4, textAlign: 'center' }}>
                  <Typography variant="body2" sx={{ color: '#64748b', mb: 2 }}>
                    No Declaration Page templates uploaded for Tenant #{selectedTenantId}.
                  </Typography>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<Upload size={14} />}
                    onClick={() => setUploadDialogOpen(true)}
                    sx={{ textTransform: 'none' }}
                  >
                    Upload First Template
                  </Button>
                </Box>
              )}
              {!loading && templates.map((t) => {
                const isSelected = selectedTemplate?.id === t.id;
                return (
                  <Box
                    key={t.id}
                    onClick={() => setSelectedTemplate(t)}
                    sx={{
                      p: 2,
                      cursor: 'pointer',
                      borderBottom: '1px solid #f1f5f9',
                      backgroundColor: isSelected ? '#f0f9ff' : 'transparent',
                      borderLeft: isSelected ? '4px solid #0284c7' : '4px solid transparent',
                      '&:hover': { backgroundColor: isSelected ? '#f0f9ff' : '#f8fafc' },
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0f172a' }}>
                        {t.form_name}
                      </Typography>
                      <Chip
                        label={t.form_revision}
                        size="small"
                        sx={{ fontSize: '0.7rem', fontWeight: 700, backgroundColor: '#e2e8f0' }}
                      />
                    </Box>
                    <Typography variant="caption" sx={{ color: '#0284c7', fontWeight: 700, fontFamily: 'monospace', display: 'block' }}>
                      {t.form_id}
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                      <Chip
                        label={getProductName(t.product_id)}
                        size="small"
                        sx={{ fontSize: '0.68rem', backgroundColor: '#e0f2fe', color: '#0369a1', fontWeight: 600 }}
                      />
                      <Typography variant="caption" sx={{ color: '#64748b' }}>
                        {t.fields?.length || 0} extracted tags
                      </Typography>
                    </Box>
                  </Box>
                );
              })}
            </Box>
          </Card>
        </Grid>

        {/* Right Column: Selected Template Detail & Interactive Testing Studio */}
        <Grid item xs={12} lg={8}>
          {selectedTemplate ? (
            <Box>
              {/* Template Header Card */}
              <Card sx={{ mb: 3, borderLeft: '5px solid #0284c7', borderRadius: 2 }}>
                <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 2 }}>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a' }}>
                      {selectedTemplate.form_name}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#64748b', mt: 0.5 }}>
                      Form ID: <strong>{selectedTemplate.form_id}</strong> &bull; Revision: <strong>{selectedTemplate.form_revision}</strong> &bull; Product: <strong>{getProductName(selectedTemplate.product_id)}</strong> &bull; Effective: <strong>{selectedTemplate.effective_date}</strong>
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#475569', display: 'block', mt: 0.5, fontFamily: 'monospace' }}>
                      Storage Path: {selectedTemplate.file_storage_path}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                    {lastGeneratedDoc && (
                      <Button
                        variant="outlined"
                        size="large"
                        startIcon={<ExternalLink size={18} />}
                        onClick={() => openDocumentViewer(lastGeneratedDoc, 0, selectedTenantId || 1)}
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
                      size="large"
                      disabled={generating}
                      startIcon={generating ? <CircularProgress size={18} color="inherit" /> : <Play size={18} />}
                      onClick={handleGenerateTestDecPage}
                      sx={{
                        backgroundColor: '#0284c7',
                        textTransform: 'none',
                        fontWeight: 700,
                        px: 3,
                        boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)',
                        '&:hover': { backgroundColor: '#0369a1' }
                      }}
                    >
                      {generating ? 'Generating PDF...' : 'Generate Test Dec Page (PDF)'}
                    </Button>
                    <IconButton
                      color="error"
                      size="small"
                      onClick={() => setDeleteConfirmOpen(true)}
                      title="Delete Template"
                    >
                      <Trash2 size={18} />
                    </IconButton>
                  </Box>
                </CardContent>
              </Card>

              {/* Extracted Fields Chips */}
              <Card sx={{ mb: 3, borderRadius: 2 }}>
                <CardHeader
                  title={
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                        Aspose.Words Discovered Tags ({fields.length})
                      </Typography>
                      <Tooltip title="Scanned via IReplacingCallback across document body, tables, and headers">
                        <CheckCircle2 size={18} color="#16a34a" />
                      </Tooltip>
                    </Box>
                  }
                  avatar={<Layers size={20} color="#0284c7" />}
                />
                <Divider />
                <CardContent>
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
                          fontSize: '0.78rem'
                        }}
                      />
                    ))}
                  </Box>
                </CardContent>
              </Card>

              {/* Testing Engine Form: Flat Fields */}
              <Card sx={{ mb: 3, borderRadius: 2 }}>
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
                  subheader="Dynamically mapped inputs for standard flat header/body fields"
                />
                <Divider />
                <CardContent>
                  <Grid container spacing={2}>
                    {flatFields.map((f) => (
                      <Grid item xs={12} sm={6} key={f}>
                        <TextField
                          label={`<<${f}>>`}
                          value={testValues[f] ?? ''}
                          onChange={(e) => handleFieldChange(f, e.target.value)}
                          fullWidth
                          size="small"
                          variant="outlined"
                          InputLabelProps={{ shrink: true }}
                          placeholder={`Enter test value for ${f}`}
                        />
                      </Grid>
                    ))}
                    {flatFields.length === 0 && (
                      <Grid item xs={12}>
                        <Alert severity="info">No flat fields detected in this template.</Alert>
                      </Grid>
                    )}
                  </Grid>
                </CardContent>
              </Card>

              {/* Testing Engine: Variable Coverage Table Strategy */}
              <Card sx={{ borderRadius: 2 }}>
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
                  subheader="Row 2 of the Word table acts as a template; Aspose deep clones it for each mock row, replaces tags, and removes the original row."
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
                              <TextField
                                size="small"
                                fullWidth
                                value={row.Coverage_Name || ''}
                                onChange={(e) => handleCoverageRowChange(idx, 'Coverage_Name', e.target.value)}
                              />
                            </TableCell>
                            <TableCell>
                              <TextField
                                size="small"
                                fullWidth
                                value={row.Coverage_Limit || ''}
                                onChange={(e) => handleCoverageRowChange(idx, 'Coverage_Limit', e.target.value)}
                              />
                            </TableCell>
                            <TableCell>
                              <TextField
                                size="small"
                                fullWidth
                                value={row.Coverage_Deductible || ''}
                                onChange={(e) => handleCoverageRowChange(idx, 'Coverage_Deductible', e.target.value)}
                              />
                            </TableCell>
                            <TableCell>
                              <TextField
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
                      onClick={() => openDocumentViewer(lastGeneratedDoc, 0, selectedTenantId || 1)}
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
            </Box>
          ) : (
            <Card sx={{ p: 6, textAlign: 'center', borderRadius: 2 }}>
              <FileCheck size={48} color="#94a3b8" style={{ marginBottom: 16 }} />
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#334155' }}>
                No Declaration Page Template Selected
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748b', mt: 1, mb: 3 }}>
                Upload or select a Word (.docx) Dec Page template to test tag extraction and tabular row cloning.
              </Typography>
              <Button
                variant="contained"
                startIcon={<Upload size={16} />}
                onClick={() => setUploadDialogOpen(true)}
                sx={{ backgroundColor: '#0284c7', textTransform: 'none', fontWeight: 600 }}
              >
                Ingest Dec Page Template
              </Button>
            </Card>
          )}
        </Grid>
      </Grid>

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onClose={() => !uploading && setUploadDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Upload size={22} color="#0284c7" />
          Ingest Word (.docx) Dec Page Template
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Form ID"
              placeholder="e.g. DEC-HO3-001, DEC-CGL-2026"
              value={formId}
              onChange={(e) => setFormId(e.target.value)}
              fullWidth
              size="small"
              required
            />
            <TextField
              label="Form Revision"
              placeholder="e.g. 2026.01"
              value={formRevision}
              onChange={(e) => setFormRevision(e.target.value)}
              fullWidth
              size="small"
              required
            />
            <TextField
              label="Form Name / Title"
              placeholder="e.g. Commercial Property & Casualty Policy Dec Page"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              fullWidth
              size="small"
              required
            />
            <TextField
              label="Effective Date"
              type="date"
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
              fullWidth
              size="small"
              InputLabelProps={{ shrink: true }}
              required
            />
            <FormControl fullWidth size="small">
              <InputLabel>Insurance Product / Line</InputLabel>
              <Select
                value={productId}
                label="Insurance Product / Line"
                onChange={(e) => setProductId(Number(e.target.value))}
              >
                {PRODUCT_OPTIONS.map((p) => (
                  <MenuItem key={p.id} value={p.id}>
                    {p.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Box
              onClick={() => fileInputRef.current?.click()}
              sx={{
                border: '2px dashed #0284c7',
                borderRadius: 2,
                p: 3,
                textAlign: 'center',
                backgroundColor: uploadFile ? '#f0f9ff' : '#fafafa',
                cursor: 'pointer',
                '&:hover': { backgroundColor: '#f0f9ff' }
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                style={{ display: 'none' }}
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setUploadFile(e.target.files[0]);
                  }
                }}
              />
              <FileText size={32} color="#0284c7" style={{ marginBottom: 8 }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0f172a' }}>
                {uploadFile ? uploadFile.name : 'Click to select Word (.docx) Template'}
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mt: 0.5 }}>
                {uploadFile
                  ? `${(uploadFile.size / 1024).toFixed(1)} KB selected`
                  : 'DOCX containing <<field_names>> and variable coverage table'}
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setUploadDialogOpen(false)} disabled={uploading} sx={{ textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleUploadSubmit}
            disabled={uploading}
            startIcon={uploading ? <CircularProgress size={16} color="inherit" /> : <Upload size={16} />}
            sx={{
              backgroundColor: '#0284c7',
              textTransform: 'none',
              fontWeight: 700,
              '&:hover': { backgroundColor: '#0369a1' }
            }}
          >
            {uploading ? 'Ingesting via Aspose...' : 'Ingest Template'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle sx={{ fontWeight: 800 }}>Confirm Deletion</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Are you sure you want to delete template <strong>{selectedTemplate?.form_name}</strong> ({selectedTemplate?.form_id})?
            This will also delete the physical file on disk and its child extracted fields.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDeleteConfirmOpen(false)} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button color="error" variant="contained" onClick={handleDeleteTemplate} sx={{ textTransform: 'none', fontWeight: 700 }}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Toast Notification */}
      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setToast((prev) => ({ ...prev, open: false }))}
          severity={toast.severity}
          variant="filled"
          sx={{ width: '100%', fontWeight: 600 }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

