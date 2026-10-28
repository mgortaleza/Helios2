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
  Snackbar,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormLabel,
  Tabs,
  Tab
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
  Sparkles,
  History,
  Clock,
  ShieldCheck,
  FileDown,
  PlusCircle,
  Link as LinkIcon
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

const LOB_OPTIONS = [
  'General Liability',
  'Commercial Auto',
  'Commercial Property',
  'Commercial Package',
  'Workers Compensation',
  'Cyber Liability',
  'Inland Marine'
];

export default function TemplateAdminManager({ apiFetch, selectedTenantId }) {
  const [templates, setTemplates] = useState([]);
  const [endorsements, setEndorsements] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [activeTab, setActiveTab] = useState(0); // 0 = Field Mappings, 1 = Version History
  const [versionHistory, setVersionHistory] = useState([]);
  const [loadingVersions, setLoadingVersions] = useState(false);

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [savingMappings, setSavingMappings] = useState(false);
  const [renderingPdf, setRenderingPdf] = useState(false);
  const [fieldMappings, setFieldMappings] = useState({});
  const [isCustomMode, setIsCustomMode] = useState({});
  const [feedback, setFeedback] = useState({ open: false, message: '', severity: 'info' });

  // Dual-mode Upload dialog state
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadMode, setUploadMode] = useState('EXISTING_ENDORSEMENT'); // 'EXISTING_ENDORSEMENT' | 'NEW_ENDORSEMENT'
  const [uploadFile, setUploadFile] = useState(null);
  const [templateName, setTemplateName] = useState('');
  const [selectedEndorsementId, setSelectedEndorsementId] = useState('');
  
  // New endorsement inline fields
  const [newEndorsementCode, setNewEndorsementCode] = useState('');
  const [newEndorsementName, setNewEndorsementName] = useState('');
  const [newLineOfBusiness, setNewLineOfBusiness] = useState('General Liability');
  const [description, setDescription] = useState('');
  
  // Metadata fields
  const todayStr = new Date().toISOString().substring(0, 10);
  const [editionDate, setEditionDate] = useState(todayStr);
  const [effectiveDate, setEffectiveDate] = useState(todayStr);
  const [expirationDate, setExpirationDate] = useState('');
  const [outputFormat, setOutputFormat] = useState('PDF');

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
  }, [selectedTenantId, selectedTemplate]);

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

  // Load version history for the selected endorsement / template
  const loadVersionHistory = useCallback(async (endId) => {
    if (!endId) {
      setVersionHistory([]);
      return;
    }
    setLoadingVersions(true);
    try {
      const res = await fetch(`/document-api/templates/endorsements/${endId}/versions`, {
        headers: {
          'X-Tenant-Id': String(selectedTenantId || 1)
        }
      });
      if (res.ok) {
        const versions = await res.json();
        setVersionHistory(versions || []);
      } else {
        setVersionHistory([]);
      }
    } catch (err) {
      console.error('Failed to load version history:', err);
      setVersionHistory([]);
    } finally {
      setLoadingVersions(false);
    }
  }, [selectedTenantId]);

  // Select a template and populate mappings map + version history
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

    // Resolve endorsement ID for version history
    const endId = tmpl?.endorsementId || tmpl?.ENDORSEMENT_ID;
    if (endId) {
      loadVersionHistory(endId);
    } else {
      setVersionHistory([]);
    }
  };

  // Handle Mapping change
  const handleMappingChange = (fieldName, value) => {
    setFieldMappings((prev) => ({
      ...prev,
      [fieldName]: value
    }));
  };

  // Handle predefined dropdown selection
  const handleDropdownSelect = (fieldName, selectedVal) => {
    if (selectedVal === 'custom') {
      setIsCustomMode((prev) => ({ ...prev, [fieldName]: true }));
      setFieldMappings((prev) => ({ ...prev, [fieldName]: '' }));
    } else {
      setIsCustomMode((prev) => ({ ...prev, [fieldName]: false }));
      setFieldMappings((prev) => ({ ...prev, [fieldName]: selectedVal }));
    }
  };

  // Save updated mappings
  const handleSaveMappings = async () => {
    if (!selectedTemplate) return;
    setSavingMappings(true);

    try {
      const fieldList = Object.entries(fieldMappings).map(([fieldName, dataMappingPath]) => ({
        fieldName,
        dataMappingPath: dataMappingPath || null
      }));

      const res = await fetch(`/document-api/templates/${selectedTemplate.templateId}/fields`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-Id': String(selectedTenantId || 1)
        },
        body: JSON.stringify({ fields: fieldList })
      });

      if (res.ok) {
        showToast('Field mappings saved successfully!');
        // Refresh selected template
        const refreshed = await fetch(`/document-api/templates/${selectedTemplate.templateId}`, {
          headers: {
            'X-Tenant-Id': String(selectedTenantId || 1)
          }
        });
        if (refreshed.ok) {
          const updated = await refreshed.json();
          setSelectedTemplate(updated);
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

  // Handle Dual-Mode Upload Submit
  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!uploadFile) {
      showToast('Please select a .docx Word template file', 'error');
      return;
    }

    if (uploadMode === 'EXISTING_ENDORSEMENT' && !selectedEndorsementId) {
      showToast('Please select an existing endorsement to associate with', 'error');
      return;
    }

    if (uploadMode === 'NEW_ENDORSEMENT') {
      if (!newEndorsementCode.trim()) {
        showToast('Please specify an Endorsement Code (e.g. CG 20 10)', 'error');
        return;
      }
      if (!newEndorsementName.trim()) {
        showToast('Please specify an Endorsement Name', 'error');
        return;
      }
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('mode', uploadMode);
      formData.append('editionDate', editionDate);
      formData.append('effectiveDate', effectiveDate);
      if (expirationDate) {
        formData.append('expirationDate', expirationDate);
      }
      formData.append('outputFormat', outputFormat);

      if (uploadMode === 'EXISTING_ENDORSEMENT') {
        formData.append('endorsementId', selectedEndorsementId);
        const matched = endorsements.find(
          (end) => String(end.endorsementId || end.ENDORSEMENT_ID) === String(selectedEndorsementId)
        );
        const nameToUse = templateName.trim() || matched?.endorsementName || matched?.ENDORSEMENT_TITLE || 'Template';
        formData.append('templateName', nameToUse);
        formData.append('description', description.trim() || matched?.description || '');
      } else {
        // NEW_ENDORSEMENT
        formData.append('endorsementCode', newEndorsementCode.trim());
        formData.append('endorsementName', newEndorsementName.trim());
        formData.append('lineOfBusiness', newLineOfBusiness);
        formData.append('templateName', templateName.trim() || newEndorsementName.trim());
        if (description) {
          formData.append('description', description.trim());
        }
      }

      const res = await fetch('/document-api/templates/upload-versioned', {
        method: 'POST',
        headers: {
          'X-Tenant-Id': String(selectedTenantId || 1)
        },
        body: formData
      });

      if (res.ok) {
        const result = await res.json();
        showToast(`Template v${result.versionNumber || 1} uploaded & versioned successfully!`);
        setUploadDialogOpen(false);
        resetUploadForm();
        await loadTemplates();
        await loadEndorsements();
        if (result.endorsementId) {
          loadVersionHistory(result.endorsementId);
        }
      } else {
        const errJson = await res.json().catch(() => ({}));
        showToast(errJson.error || 'Failed to upload and version template', 'error');
      }
    } catch (err) {
      console.error('Error uploading template:', err);
      showToast('Error uploading template file', 'error');
    } finally {
      setUploading(false);
    }
  };

  const resetUploadForm = () => {
    setUploadFile(null);
    setTemplateName('');
    setSelectedEndorsementId('');
    setNewEndorsementCode('');
    setNewEndorsementName('');
    setDescription('');
    setExpirationDate('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Download Historical .docx Version
  const handleDownloadHistoricalDocx = async (version) => {
    try {
      const res = await fetch(`/document-api/templates/versions/${version.templateId}/download`, {
        headers: {
          'X-Tenant-Id': String(selectedTenantId || 1)
        }
      });
      if (res.ok) {
        const blob = await res.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = version.fileName || `template-v${version.versionNumber}.docx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(downloadUrl);
        a.remove();
        showToast(`Downloaded ${version.fileName || 'template .docx'}`);
      } else {
        showToast('Failed to download template file', 'error');
      }
    } catch (err) {
      console.error('Error downloading template version:', err);
      showToast('Error downloading file', 'error');
    }
  };

  // Render & Download live PDF from Word template
  const handleDownloadRenderedPdf = async () => {
    if (!selectedTemplate) return;
    setRenderingPdf(true);

    try {
      const res = await fetch(`/document-api/templates/${selectedTemplate.templateId}/render`, {
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
            Word Template &amp; Endorsement Versioning Engine
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748b', mt: 0.5 }}>
            Manage endorsement templates with automated versioning, stream .docx binaries to filesystem storage, map database columns, and track audit history.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshCw size={16} />}
            onClick={() => {
              loadTemplates();
              loadEndorsements();
            }}
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
            Upload Template / Endorsement
          </Button>
        </Box>
      </Box>

      {/* Main Grid: Left Template Library / Right Workspace */}
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
                No templates uploaded yet. Click <strong>Upload Template / Endorsement</strong> above to ingest a .docx file.
              </Alert>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, maxHeight: '680px', overflowY: 'auto', pr: 0.5 }}>
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
                            sx={{ height: 20, fontSize: '0.7rem', bgcolor: '#e0f2fe', color: '#0369a1', fontWeight: 700 }}
                          />
                        </Box>

                        <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mt: 0.5 }}>
                          File: {tmpl.fileName}
                        </Typography>

                        {(tmpl.endorsementTitle || tmpl.endorsementNbr) && (
                          <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                            <Chip
                              label={tmpl.endorsementNbr || 'Endorsement'}
                              size="small"
                              variant="outlined"
                              sx={{ height: 20, fontSize: '0.68rem', borderColor: '#0284c7', color: '#0284c7', fontWeight: 600 }}
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
                          {tmpl.editionDate && (
                            <Typography variant="caption" sx={{ color: '#64748b' }}>
                              Ed. {tmpl.editionDate}
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

        {/* Right Column: Tabbed View (Field Mappings vs Version History) */}
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
                    <strong>{selectedTemplate.endorsementTitle || selectedTemplate.endorsementNbr || 'None assigned'}</strong>
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
                  {activeTab === 0 && (
                    <Button
                      variant="contained"
                      startIcon={savingMappings ? <CircularProgress size={16} color="inherit" /> : <Save size={16} />}
                      onClick={handleSaveMappings}
                      disabled={savingMappings}
                      sx={{ bgcolor: '#0f172a', '&:hover': { bgcolor: '#1e293b' } }}
                    >
                      Save Mappings
                    </Button>
                  )}
                </Box>
              </Box>

              {/* Navigation Tabs */}
              <Tabs
                value={activeTab}
                onChange={(e, val) => setActiveTab(val)}
                sx={{ borderBottom: '1px solid #e2e8f0', mb: 2 }}
              >
                <Tab
                  icon={<Sparkles size={16} />}
                  iconPosition="start"
                  label={`Discovered Fields (${selectedTemplate.fields?.length || 0})`}
                  sx={{ textTransform: 'none', fontWeight: 600 }}
                />
                <Tab
                  icon={<History size={16} />}
                  iconPosition="start"
                  label={`Version History (${versionHistory.length})`}
                  sx={{ textTransform: 'none', fontWeight: 600 }}
                />
              </Tabs>

              {/* Tab 0: Field Mappings */}
              {activeTab === 0 && (
                <Box>
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
                </Box>
              )}

              {/* Tab 1: Version History & Historical Downloads */}
              {activeTab === 1 && (
                <Box>
                  {loadingVersions ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                      <CircularProgress size={28} />
                    </Box>
                  ) : versionHistory.length === 0 ? (
                    <Alert severity="info" sx={{ mt: 1 }}>
                      No version history found for this endorsement yet. Future uploads associated with this endorsement will automatically increment versions.
                    </Alert>
                  ) : (
                    <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: '8px' }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow sx={{ bgcolor: '#f8fafc' }}>
                            <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Version</TableCell>
                            <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Edition / Effective</TableCell>
                            <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Status</TableCell>
                            <TableCell sx={{ fontWeight: 700, color: '#475569' }}>File &amp; Integrity</TableCell>
                            <TableCell sx={{ fontWeight: 700, color: '#475569', textAlign: 'right' }}>Action</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {versionHistory.map((ver) => (
                            <TableRow key={ver.templateId} hover>
                              <TableCell>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Chip
                                    label={`v${ver.versionNumber}`}
                                    size="small"
                                    color={ver.isCurrentVersion ? 'primary' : 'default'}
                                    sx={{ fontWeight: 700, height: 22 }}
                                  />
                                  {ver.isCurrentVersion && (
                                    <Chip label="CURRENT" size="small" color="success" sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700 }} />
                                  )}
                                </Box>
                              </TableCell>
                              <TableCell sx={{ fontSize: '0.82rem' }}>
                                <div><strong>Edition:</strong> {ver.editionDate || '—'}</div>
                                <div style={{ color: '#64748b' }}>Effective: {ver.effectiveDate || '—'}</div>
                              </TableCell>
                              <TableCell>
                                <Chip
                                  label={ver.status}
                                  size="small"
                                  color={ver.status === 'ACTIVE' ? 'success' : ver.status === 'SUPERSEDED' ? 'default' : 'warning'}
                                  variant={ver.status === 'SUPERSEDED' ? 'outlined' : 'filled'}
                                  sx={{ height: 20, fontSize: '0.7rem', fontWeight: 600 }}
                                />
                              </TableCell>
                              <TableCell sx={{ fontSize: '0.8rem' }}>
                                <div style={{ fontWeight: 500, color: '#1e293b' }}>{ver.fileName}</div>
                                <div style={{ color: '#64748b' }}>{(ver.fileSizeBytes / 1024).toFixed(1)} KB | {ver.outputFormat}</div>
                                {ver.sha256Checksum && (
                                  <Tooltip title={`Full Checksum: ${ver.sha256Checksum}`}>
                                    <Typography variant="caption" sx={{ fontFamily: 'monospace', color: '#94a3b8' }}>
                                      SHA: {ver.sha256Checksum.substring(0, 12)}...
                                    </Typography>
                                  </Tooltip>
                                )}
                              </TableCell>
                              <TableCell align="right">
                                <Button
                                  size="small"
                                  variant="outlined"
                                  startIcon={<FileDown size={14} />}
                                  onClick={() => handleDownloadHistoricalDocx(ver)}
                                  sx={{ fontSize: '0.75rem', textTransform: 'none' }}
                                >
                                  Download DOCX
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </Box>
              )}
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

      {/* Dual-Mode Template Upload Dialog */}
      <Dialog
        open={uploadDialogOpen}
        onClose={() => !uploading && setUploadDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <form onSubmit={handleUploadSubmit}>
          <DialogTitle sx={{ fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 1 }}>
            <Upload size={20} color="#0284c7" />
            Upload &amp; Version Endorsement Template
          </DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
            <Alert severity="info" sx={{ fontSize: '0.85rem' }}>
              Upload Word (.docx) templates to external filesystem storage. The engine automatically converts mustache tags to Aspose MERGEFIELDs, maintains version increments, and supersedes older releases.
            </Alert>

            {/* Mode Selector */}
            <Paper variant="outlined" sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: '8px' }}>
              <FormLabel component="legend" sx={{ fontWeight: 700, color: '#1e293b', fontSize: '0.9rem', mb: 1 }}>
                Endorsement Association Mode
              </FormLabel>
              <RadioGroup
                row
                value={uploadMode}
                onChange={(e) => setUploadMode(e.target.value)}
              >
                <FormControlLabel
                  value="EXISTING_ENDORSEMENT"
                  control={<Radio size="small" />}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <LinkIcon size={16} color="#0284c7" />
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        Associate with Existing Endorsement (Creates Next Version)
                      </Typography>
                    </Box>
                  }
                />
                <FormControlLabel
                  value="NEW_ENDORSEMENT"
                  control={<Radio size="small" />}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <PlusCircle size={16} color="#16a34a" />
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        Create New Endorsement Inline
                      </Typography>
                    </Box>
                  }
                />
              </RadioGroup>
            </Paper>

            {/* Mode: EXISTING_ENDORSEMENT */}
            {uploadMode === 'EXISTING_ENDORSEMENT' && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <FormControl fullWidth size="small" required>
                  <InputLabel>Select Existing Endorsement *</InputLabel>
                  <Select
                    value={selectedEndorsementId}
                    label="Select Existing Endorsement *"
                    onChange={(e) => {
                      setSelectedEndorsementId(e.target.value);
                      const matched = endorsements.find(
                        (end) => String(end.endorsementId || end.ENDORSEMENT_ID) === String(e.target.value)
                      );
                      if (matched && !templateName) {
                        setTemplateName(matched.endorsementName || matched.ENDORSEMENT_TITLE || '');
                      }
                    }}
                  >
                    {endorsements.map((end) => {
                      const id = end.endorsementId || end.ENDORSEMENT_ID;
                      const code = end.endorsementCode || end.ENDORSEMENT_NBR;
                      const title = end.endorsementName || end.ENDORSEMENT_TITLE;
                      const lob = end.lineOfBusiness || end.LINE_OF_BUSINESS;
                      const curVer = end.currentVersionNumber ? ` [v${end.currentVersionNumber}]` : '';

                      return (
                        <MenuItem key={id} value={id}>
                          <strong>{code}</strong> — {title} ({lob || 'General'}){curVer}
                        </MenuItem>
                      );
                    })}
                  </Select>
                </FormControl>
              </Box>
            )}

            {/* Mode: NEW_ENDORSEMENT */}
            {uploadMode === 'NEW_ENDORSEMENT' && (
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="Endorsement Code *"
                    required
                    fullWidth
                    size="small"
                    value={newEndorsementCode}
                    onChange={(e) => setNewEndorsementCode(e.target.value)}
                    placeholder="e.g. CG 20 10, END-WTR-01"
                  />
                </Grid>
                <Grid item xs={12} sm={8}>
                  <TextField
                    label="Endorsement Name *"
                    required
                    fullWidth
                    size="small"
                    value={newEndorsementName}
                    onChange={(e) => {
                      setNewEndorsementName(e.target.value);
                      if (!templateName) setTemplateName(e.target.value);
                    }}
                    placeholder="e.g. Additional Insured - Owners, Lessees or Contractors"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Line of Business *</InputLabel>
                    <Select
                      value={newLineOfBusiness}
                      label="Line of Business *"
                      onChange={(e) => setNewLineOfBusiness(e.target.value)}
                    >
                      {LOB_OPTIONS.map((lob) => (
                        <MenuItem key={lob} value={lob}>{lob}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Description"
                    fullWidth
                    size="small"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief description of coverage or condition"
                  />
                </Grid>
              </Grid>
            )}

            <Divider />

            {/* Common Template & Versioning Metadata */}
            <Grid container spacing={2}>
              <Grid item xs={12} sm={8}>
                <TextField
                  label="Template Display Name"
                  fullWidth
                  size="small"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="e.g. Additional Insured Endorsement Word Template"
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Output Format</InputLabel>
                  <Select
                    value={outputFormat}
                    label="Output Format"
                    onChange={(e) => setOutputFormat(e.target.value)}
                  >
                    <MenuItem value="PDF">PDF (Portable Document Format)</MenuItem>
                    <MenuItem value="DOCX">DOCX (Editable Word Document)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  label="Edition Date"
                  type="date"
                  fullWidth
                  size="small"
                  value={editionDate}
                  onChange={(e) => setEditionDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  label="Effective Date"
                  type="date"
                  fullWidth
                  size="small"
                  value={effectiveDate}
                  onChange={(e) => setEffectiveDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  label="Expiration Date (Optional)"
                  type="date"
                  fullWidth
                  size="small"
                  value={expirationDate}
                  onChange={(e) => setExpirationDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>

            {/* File Input */}
            <Box sx={{ p: 2, border: '2px dashed #cbd5e1', borderRadius: '8px', bgcolor: '#f8fafc', textAlign: 'center' }}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, color: '#1e293b' }}>
                Select MS Word (.docx) Document File *
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
                required
              />
              {uploadFile && (
                <Typography variant="caption" sx={{ color: '#0284c7', mt: 1, display: 'block', fontWeight: 600 }}>
                  Selected: {uploadFile.name} ({(uploadFile.size / 1024).toFixed(1)} KB)
                </Typography>
              )}
            </Box>
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
              {uploading ? 'Ingesting & Versioning...' : uploadMode === 'NEW_ENDORSEMENT' ? 'Create Endorsement & Template' : 'Upload New Version'}
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
