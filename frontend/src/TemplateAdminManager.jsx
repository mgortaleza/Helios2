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
  Grid,
  Divider,
  Snackbar
} from '@mui/material';
import {
  FileText,
  Upload,
  RefreshCw,
  Save,
  Download,
  CheckCircle2,
  AlertCircle,
  FileCode,
  TableProperties,
  ArrowRight,
  ExternalLink,
  Layers,
  Sparkles
} from 'lucide-react';

// Suggested standard database mapping targets
const COMMON_MAPPING_OPTIONS = [
  { value: 'endorsement.ENDORSEMENT_NBR', label: 'Endorsement Nbr (endorsement.ENDORSEMENT_NBR)' },
  { value: 'endorsement.ENDORSEMENT_TITLE', label: 'Endorsement Title (endorsement.ENDORSEMENT_TITLE)' },
  { value: 'endorsement.EFFECTIVE_DATE', label: 'Effective Date (endorsement.EFFECTIVE_DATE)' },
  { value: 'endorsement.PREMIUM_DELTA', label: 'Endorsement Premium Delta (endorsement.PREMIUM_DELTA)' },
  { value: 'endorsement.DESCRIPTION', label: 'Endorsement Description (endorsement.DESCRIPTION)' },
  { value: 'quote.QUOTE_NBR', label: 'Quote Number (quote.QUOTE_NBR)' },
  { value: 'quote.PREMIUM', label: 'Quote Total Premium (quote.PREMIUM)' },
  { value: 'quote.STATE_CODE', label: 'State Code (quote.STATE_CODE)' },
  { value: 'quote.LIMIT_AMT', label: 'Policy Limit (quote.LIMIT_AMT)' },
  { value: 'quote.RETENTION_AMT', label: 'Retention / Deductible (quote.RETENTION_AMT)' },
  { value: 'quote.PRODUCT_CODE', label: 'Product Code (quote.PRODUCT_CODE)' },
  { value: 'party.LEGAL_NAME', label: 'Named Insured (party.LEGAL_NAME)' },
  { value: 'party.FEIN', label: 'FEIN / Tax ID (party.FEIN)' },
  { value: 'custom', label: 'Custom Mapping / Literal Text' }
];

export default function TemplateAdminManager({ apiFetch, selectedTenantId }) {
  const [templates, setTemplates] = useState([]);
  const [endorsements, setEndorsements] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [savingMappings, setSavingMappings] = useState(false);
  const [renderingPdf, setRenderingPdf] = useState(false);
  const [fieldMappings, setFieldMappings] = useState({});
  const [isCustomMode, setIsCustomMode] = useState({});
  const [feedback, setFeedback] = useState({ open: false, message: '', severity: 'info' });

  // Upload dialog state
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [templateName, setTemplateName] = useState('');
  const [endorsementId, setEndorsementId] = useState('');
  const [description, setDescription] = useState('');
  const fileInputRef = useRef(null);

  const showToast = (message, severity = 'success') => {
    setFeedback({ open: true, message, severity });
  };

  // Fetch templates list
  const loadTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/document-api/templates', {
        headers: {
          'X-Tenant-Id': String(selectedTenantId || 1)
        }
      });
      if (res.ok) {
        const data = await res.json();
        setTemplates(data || []);
        if (data && data.length > 0 && !selectedTemplate) {
          selectTemplate(data[0]);
        }
      } else {
        showToast('Failed to load templates from document engine', 'error');
      }
    } catch (err) {
      console.error('Error fetching templates:', err);
      showToast('Error connecting to document engine', 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedTenantId]);

  // Fetch endorsements list for dropdown
  const loadEndorsements = useCallback(async () => {
    try {
      const res = await fetch('/document-api/templates/endorsements', {
        headers: {
          'X-Tenant-Id': String(selectedTenantId || 1)
        }
      });
      if (res.ok) {
        const data = await res.json();
        setEndorsements(data || []);
      }
    } catch (err) {
      console.error('Error loading endorsements:', err);
    }
  }, [selectedTenantId]);

  useEffect(() => {
    loadTemplates();
    loadEndorsements();
  }, [loadTemplates, loadEndorsements]);

  // Select a template and populate mappings map
  const selectTemplate = (tmpl) => {
    setSelectedTemplate(tmpl);
    const mappings = {};
    const customModes = {};
    if (tmpl && tmpl.fields) {
      tmpl.fields.forEach((f) => {
        const path = f.dataMappingPath || '';
        mappings[f.fieldName] = path;
        const isStandard = COMMON_MAPPING_OPTIONS.some((o) => o.value === path);
        customModes[f.fieldName] = !isStandard;
      });
    }
    setFieldMappings(mappings);
    setIsCustomMode(customModes);
  };

  // Handle Mapping change
  const handleMappingChange = (fieldName, value) => {
    setFieldMappings((prev) => ({
      ...prev,
      [fieldName]: value
    }));
  };

  // Handle Dropdown Selection
  const handleDropdownSelect = (fieldName, selectedVal) => {
    if (selectedVal === 'custom') {
      setIsCustomMode((prev) => ({ ...prev, [fieldName]: true }));
      // When selecting custom mapping, keep field entry blank as requested
      handleMappingChange(fieldName, '');
    } else {
      setIsCustomMode((prev) => ({ ...prev, [fieldName]: false }));
      handleMappingChange(fieldName, selectedVal);
    }
  };

  // Save Mappings back to Spring Boot
  const handleSaveMappings = async () => {
    if (!selectedTemplate) return;
    setSavingMappings(true);
    try {
      const res = await fetch(`/document-api/templates/${selectedTemplate.templateId}/fields`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-Id': String(selectedTenantId || 1)
        },
        body: JSON.stringify({ mappings: fieldMappings })
      });

      if (res.ok) {
        showToast('Field mappings saved successfully!');
        // Refresh selected template
        const refreshed = await fetch(`/document-api/templates/${selectedTemplate.templateId}`, {
          headers: { 'X-Tenant-Id': String(selectedTenantId || 1) }
        });
        if (refreshed.ok) {
          const updated = await refreshed.json();
          setSelectedTemplate(updated);
          // Also update in templates array
          setTemplates((prev) =>
            prev.map((t) => (t.templateId === updated.templateId ? updated : t))
          );
        }
      } else {
        showToast('Failed to save field mappings', 'error');
      }
    } catch (err) {
      console.error('Error saving mappings:', err);
      showToast('Error saving mappings', 'error');
    } finally {
      setSavingMappings(false);
    }
  };

  // Upload Word Template file
  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!uploadFile) {
      showToast('Please select a .docx Word template file', 'error');
      return;
    }
    if (!templateName.trim()) {
      showToast('Please provide a template name', 'error');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('templateName', templateName.trim());
      if (endorsementId) {
        formData.append('endorsementId', endorsementId);
      }
      if (description) {
        formData.append('description', description.trim());
      }

      const res = await fetch('/document-api/templates/upload', {
        method: 'POST',
        headers: {
          'X-Tenant-Id': String(selectedTenantId || 1)
        },
        body: formData
      });

      if (res.ok) {
        const created = await res.json();
        showToast(`Template ingested successfully! Found ${created.fields?.length || 0} fields.`);
        setUploadDialogOpen(false);
        setUploadFile(null);
        setTemplateName('');
        setEndorsementId('');
        setDescription('');
        // Reload list and select new template
        await loadTemplates();
        selectTemplate(created);
      } else {
        showToast('Failed to ingest Word template. Please ensure it is a valid .docx file.', 'error');
      }
    } catch (err) {
      console.error('Upload error:', err);
      showToast('Error uploading template', 'error');
    } finally {
      setUploading(false);
    }
  };

  // Download Rendered PDF
  const handleDownloadRenderedPdf = async () => {
    if (!selectedTemplate) return;
    setRenderingPdf(true);
    try {
      const targetEntityId = selectedTemplate.endorsementId || '';
      const url = `/document-api/templates/${selectedTemplate.templateId}/render?entityId=${targetEntityId}&entityType=ENDORSEMENT`;

      const res = await fetch(url, {
        headers: {
          'X-Tenant-Id': String(selectedTenantId || 1)
        }
      });

      if (res.ok) {
        const blob = await res.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `${selectedTemplate.templateName.replace(/[^a-zA-Z0-9.-]/g, '_')}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(downloadUrl);
        a.remove();
        showToast('PDF rendered and downloaded successfully!');
      } else {
        showToast('Failed to render PDF from Word template', 'error');
      }
    } catch (err) {
      console.error('Error rendering PDF:', err);
      showToast('Error rendering PDF', 'error');
    } finally {
      setRenderingPdf(false);
    }
  };

  return (
    <Box sx={{ p: 1 }}>
      {/* Header bar */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <FileText size={24} color="#0284c7" />
            Word Template Ingestion &amp; PDF Generation Engine
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748b', mt: 0.5 }}>
            Ingest MS Word (.docx) templates, auto-convert legacy tags to Aspose MERGEFIELDs, map database columns, and render dynamic PDFs.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshCw size={16} />}
            onClick={loadTemplates}
            disabled={loading}
            sx={{ borderColor: '#cbd5e1', color: '#475569' }}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<Upload size={16} />}
            onClick={() => setUploadDialogOpen(true)}
            sx={{ bgcolor: '#0284c7', '&:hover': { bgcolor: '#0369a1' } }}
          >
            Upload New Template
          </Button>
        </Box>
      </Box>

      {/* Main Grid: Left Template List / Right Discovered Fields & Mapping Panel */}
      <Grid container spacing={3}>
        {/* Left Column: Template Library */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#1e293b', mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Layers size={18} color="#0284c7" />
              Template Library ({templates.length})
            </Typography>

            {loading && templates.length === 0 ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress size={28} />
              </Box>
            ) : templates.length === 0 ? (
              <Alert severity="info" sx={{ mt: 1 }}>
                No templates uploaded yet. Click <strong>Upload New Template</strong> above to ingest a .docx file.
              </Alert>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, maxHeight: '650px', overflowY: 'auto', pr: 0.5 }}>
                {templates.map((tmpl) => {
                  const isSelected = selectedTemplate?.templateId === tmpl.templateId;
                  return (
                    <Card
                      key={tmpl.templateId}
                      onClick={() => selectTemplate(tmpl)}
                      sx={{
                        cursor: 'pointer',
                        border: isSelected ? '2px solid #0284c7' : '1px solid #e2e8f0',
                        bgcolor: isSelected ? '#f0f9ff' : '#ffffff',
                        transition: 'all 0.15s ease-in-out',
                        '&:hover': {
                          borderColor: '#38bdf8',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
                        }
                      }}
                    >
                      <CardContent sx={{ p: '14px !important' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0f172a' }}>
                            {tmpl.templateName}
                          </Typography>
                          <Chip
                            label={`v${tmpl.version || 1}`}
                            size="small"
                            sx={{ height: 20, fontSize: '0.7rem', bgcolor: '#e0f2fe', color: '#0369a1', fontWeight: 600 }}
                          />
                        </Box>

                        <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mt: 0.5 }}>
                          File: {tmpl.fileName}
                        </Typography>

                        {tmpl.endorsementTitle && (
                          <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Chip
                              label={tmpl.endorsementNbr || 'Endorsement'}
                              size="small"
                              variant="outlined"
                              sx={{ height: 20, fontSize: '0.68rem', borderColor: '#cbd5e1' }}
                            />
                            <Typography variant="caption" sx={{ color: '#475569', fontWeight: 500 }}>
                              {tmpl.endorsementTitle}
                            </Typography>
                          </Box>
                        )}

                        <Box sx={{ mt: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                            {tmpl.fields?.length || 0} fields discovered
                          </Typography>
                          {tmpl.quoteId && (
                            <Typography variant="caption" sx={{ color: '#64748b' }}>
                              Quote #{tmpl.quoteId}
                            </Typography>
                          )}
                        </Box>
                      </CardContent>
                    </Card>
                  );
                })}
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Right Column: Field Mapping & Render Sandbox */}
        <Grid item xs={12} md={8}>
          {selectedTemplate ? (
            <Paper sx={{ p: 3, borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              {/* Selected Template Header */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#0f172a' }}>
                    {selectedTemplate.templateName}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#64748b' }}>
                    File: <strong>{selectedTemplate.fileName}</strong> | Endorsement:{' '}
                    <strong>{selectedTemplate.endorsementTitle || 'None assigned'}</strong>
                  </Typography>
                  {selectedTemplate.relativePath && (
                    <Box sx={{ mt: 1, p: 1.2, bgcolor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0', display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
                      <Typography variant="caption" sx={{ color: '#475569' }}>
                        <strong>Storage Path:</strong> <code>{selectedTemplate.relativePath}</code>
                      </Typography>
                      {selectedTemplate.fileSizeBytes > 0 && (
                        <Typography variant="caption" sx={{ color: '#475569' }}>
                          <strong>Size:</strong> {(selectedTemplate.fileSizeBytes / 1024).toFixed(1)} KB
                        </Typography>
                      )}
                      {selectedTemplate.sha256Checksum && (
                        <Typography variant="caption" sx={{ color: '#475569', fontFamily: 'monospace' }} title={selectedTemplate.sha256Checksum}>
                          <strong>SHA-256:</strong> {selectedTemplate.sha256Checksum.substring(0, 16)}...
                        </Typography>
                      )}
                      {selectedTemplate.approvalStatus && (
                        <Chip
                          label={selectedTemplate.approvalStatus}
                          size="small"
                          color="success"
                          variant="outlined"
                          sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700 }}
                        />
                      )}
                    </Box>
                  )}
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant="outlined"
                    startIcon={renderingPdf ? <CircularProgress size={16} /> : <Download size={16} />}
                    onClick={handleDownloadRenderedPdf}
                    disabled={renderingPdf}
                    sx={{ borderColor: '#0284c7', color: '#0284c7' }}
                  >
                    Generate &amp; Download PDF
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={savingMappings ? <CircularProgress size={16} color="inherit" /> : <Save size={16} />}
                    onClick={handleSaveMappings}
                    disabled={savingMappings}
                    sx={{ bgcolor: '#0f172a', '&:hover': { bgcolor: '#1e293b' } }}
                  >
                    Save Mappings
                  </Button>
                </Box>
              </Box>

              <Divider sx={{ my: 2 }} />

              {/* Tag Inventory Info */}
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Sparkles size={18} color="#0284c7" />
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1e293b' }}>
                    Discovered Merge Fields &amp; Database Column Mappings
                  </Typography>
                </Box>
                <Typography variant="caption" sx={{ color: '#64748b' }}>
                  Ordered sequentially as discovered in the document template
                </Typography>
              </Box>

              {/* Mapping Table */}
              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: '8px', maxHeight: '500px' }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#f8fafc' }}>
                      <TableCell sx={{ fontWeight: 700, color: '#475569', width: '25%' }}>Discovered Field</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: '#475569', width: '15%' }}>Type</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: '#475569', width: '40%' }}>Database Column Mapping</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: '#475569', width: '20%' }}>Sample Preview</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedTemplate.fields && selectedTemplate.fields.length > 0 ? (
                      selectedTemplate.fields.map((f) => {
                        const currentVal = fieldMappings[f.fieldName] !== undefined ? fieldMappings[f.fieldName] : (f.dataMappingPath || '');
                        const isCustom = isCustomMode[f.fieldName] ?? !COMMON_MAPPING_OPTIONS.some((o) => o.value === currentVal);

                        return (
                          <TableRow key={f.fieldId || f.fieldName} hover>
                            <TableCell sx={{ fontWeight: 600, color: '#0f172a' }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                                <FileCode size={15} color="#0284c7" />
                                <code>{f.fieldName}</code>
                              </Box>
                            </TableCell>
                            <TableCell>
                              {f.isTableRegion ? (
                                <Chip
                                  icon={<TableProperties size={12} />}
                                  label="Table Region"
                                  size="small"
                                  color="secondary"
                                  sx={{ height: 20, fontSize: '0.68rem', fontWeight: 600 }}
                                />
                              ) : (
                                <Chip
                                  label="Scalar Field"
                                  size="small"
                                  variant="outlined"
                                  sx={{ height: 20, fontSize: '0.68rem' }}
                                />
                              )}
                            </TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                <FormControl size="small" fullWidth>
                                  <Select
                                    value={isCustom ? 'custom' : currentVal}
                                    onChange={(e) => handleDropdownSelect(f.fieldName, e.target.value)}
                                    sx={{ fontSize: '0.82rem', height: 32 }}
                                  >
                                    {COMMON_MAPPING_OPTIONS.map((opt) => (
                                      <MenuItem key={opt.value} value={opt.value} sx={{ fontSize: '0.82rem' }}>
                                        {opt.label}
                                      </MenuItem>
                                    ))}
                                  </Select>
                                </FormControl>
                                {isCustom && (
                                  <TextField
                                    size="small"
                                    placeholder="Enter custom path or literal value..."
                                    value={currentVal}
                                    onChange={(e) => handleMappingChange(f.fieldName, e.target.value)}
                                    sx={{ input: { fontSize: '0.8rem', py: 0.4 } }}
                                  />
                                )}
                              </Box>
                            </TableCell>
                            <TableCell sx={{ color: '#64748b', fontSize: '0.82rem' }}>
                              {f.samplePreviewValue || '—'}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} align="center" sx={{ py: 3, color: '#94a3b8' }}>
                          No merge fields found in this Word template.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          ) : (
            <Paper sx={{ p: 6, textAlign: 'center', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <FileText size={48} color="#94a3b8" style={{ marginBottom: 16 }} />
              <Typography variant="h6" sx={{ color: '#475569', fontWeight: 600 }}>
                Select a Template to View &amp; Map Fields
              </Typography>
              <Typography variant="body2" sx={{ color: '#94a3b8', mt: 0.5 }}>
                Choose a Word template from the left library, or upload a new tagged .docx template.
              </Typography>
            </Paper>
          )}
        </Grid>
      </Grid>

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onClose={() => !uploading && setUploadDialogOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleUploadSubmit}>
          <DialogTitle sx={{ fontWeight: 700, color: '#0f172a' }}>
            Upload MS Word Template (.docx)
          </DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
            <Alert severity="info" sx={{ fontSize: '0.85rem' }}>
              The ingestion engine supports standard MS Word <strong>MERGEFIELD</strong> tags as well as legacy <strong>{'{{field_name}}'}</strong> mustache tags. Table loops formatted as <strong>{'{{#table_name}}'}</strong> are seamlessly migrated to Aspose table regions.
            </Alert>

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, color: '#1e293b' }}>
                Select Word Document (.docx) *
              </Typography>
              <input
                ref={fileInputRef}
                type="file"
                accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setUploadFile(file);
                    if (!templateName) {
                      setTemplateName(file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '));
                    }
                  }
                }}
                style={{ width: '100%' }}
                required
              />
              {uploadFile && (
                <Typography variant="caption" sx={{ color: '#0284c7', mt: 0.5, display: 'block', fontWeight: 600 }}>
                  Selected: {uploadFile.name} ({(uploadFile.size / 1024).toFixed(1)} KB)
                </Typography>
              )}
            </Box>

            <TextField
              label="Template Name"
              required
              fullWidth
              size="small"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="e.g. Additional Insured Endorsement Template"
            />

            <FormControl fullWidth size="small">
              <InputLabel>Associated Endorsement Record</InputLabel>
              <Select
                value={endorsementId}
                label="Associated Endorsement Record"
                onChange={(e) => setEndorsementId(e.target.value)}
              >
                <MenuItem value="">
                  <em>None / Standalone Template</em>
                </MenuItem>
                {endorsements.map((end) => (
                  <MenuItem key={end.ENDORSEMENT_ID} value={end.ENDORSEMENT_ID}>
                    {end.ENDORSEMENT_NBR} — {end.ENDORSEMENT_TITLE} (Quote #{end.QUOTE_NBR || end.QUOTE_ID})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Description / Purpose"
              fullWidth
              multiline
              rows={2}
              size="small"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Explain what policy change or schedule this template applies to"
            />
          </DialogContent>
          <DialogActions sx={{ p: 2.5 }}>
            <Button onClick={() => setUploadDialogOpen(false)} disabled={uploading} sx={{ color: '#64748b' }}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={uploading}
              startIcon={uploading ? <CircularProgress size={16} color="inherit" /> : <Upload size={16} />}
              sx={{ bgcolor: '#0284c7', '&:hover': { bgcolor: '#0369a1' } }}
            >
              {uploading ? 'Ingesting & Scanning...' : 'Ingest & Scan Tags'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Notification Toast */}
      <Snackbar
        open={feedback.open}
        autoHideDuration={4000}
        onClose={() => setFeedback((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setFeedback((prev) => ({ ...prev, open: false }))}
          severity={feedback.severity}
          sx={{ width: '100%', boxShadow: 3 }}
        >
          {feedback.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
