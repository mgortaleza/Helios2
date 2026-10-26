import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  Button,
  IconButton,
  Chip,
  Card,
  CardContent,
  Grid,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Checkbox,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  Inbox,
  RefreshCw,
  FileText,
  Eye,
  Download,
  Paperclip,
  UserPlus,
  Trash2,
  Folder,
  Mail,
  ChevronDown,
  ChevronRight,
  CornerDownRight,
  ExternalLink
} from 'lucide-react';

export default function IncomingDocumentsManager({ apiFetch, activeTenantId, selectedTenantId, onNavigate }) {
  const tenantId = activeTenantId || selectedTenantId || 1;

  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [flash, setFlash] = useState(null);
  const [selectedDocIds, setSelectedDocIds] = useState([]);
  const [expandedParents, setExpandedParents] = useState({});

  const toggleExpand = (parentId) => {
    setExpandedParents((prev) => ({
      ...prev,
      [parentId]: prev[parentId] === undefined ? false : !prev[parentId]
    }));
  };

  // Modals state
  const [previewDoc, setPreviewDoc] = useState(null);
  const [attachDoc, setAttachDoc] = useState(null);

  // Attach modal state
  const [attachEntityType, setAttachEntityType] = useState('SUBMISSION');
  const [submissionsList, setSubmissionsList] = useState([]);
  const [policiesList, setPoliciesList] = useState([]);
  const [selectedEntityId, setSelectedEntityId] = useState('');
  const [attachClassification, setAttachClassification] = useState('APPLICATION');
  const [attachCustomTitle, setAttachCustomTitle] = useState('');
  const [loadingEntities, setLoadingEntities] = useState(false);
  const [submittingAttach, setSubmittingAttach] = useState(false);

  const loadIncomingDocs = useCallback(async () => {
    setLoading(true);
    try {
      let url = `/document-api/documents/incoming?tenantId=${tenantId}`;
      if (filterStatus !== 'ALL') {
        url += `&status=${filterStatus}`;
      }
      const data = await apiFetch(url);
      setDocs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load incoming documents:', err);
      setFlash({ type: 'error', text: `Failed to load incoming documents: ${err.message}` });
    } finally {
      setLoading(false);
    }
  }, [apiFetch, tenantId, filterStatus]);

  useEffect(() => {
    loadIncomingDocs();
  }, [loadIncomingDocs]);

  const handleScanInbox = async () => {
    setScanning(true);
    try {
      const res = await apiFetch(`/document-api/documents/incoming/scan?tenantId=${tenantId}`, {
        method: 'POST'
      });
      const count = res?.processedCount || 0;
      setFlash({
        type: 'success',
        text: `Inbox scan complete! ${count} new incoming document(s) ingested into queue.`
      });
      await loadIncomingDocs();
    } catch (err) {
      console.error('Error scanning inbox:', err);
      setFlash({ type: 'error', text: `Inbox scan failed: ${err.message}` });
    } finally {
      setScanning(false);
    }
  };

  const handleDiscard = async (incomingId, docName) => {
    try {
      await apiFetch(`/document-api/documents/incoming/${incomingId}?tenantId=${tenantId}`, {
        method: 'DELETE'
      });
      setFlash({ type: 'info', text: `Incoming document #${incomingId} ("${docName}") marked as discarded.` });
      setSelectedDocIds((prev) => prev.filter((id) => id !== incomingId));
      await loadIncomingDocs();
    } catch (err) {
      setFlash({ type: 'error', text: `Failed to discard document: ${err.message}` });
    }
  };

  // Open Attach Modal and pre-load entities
  const handleOpenAttachModal = async (doc) => {
    setAttachDoc(doc);
    setAttachCustomTitle(doc.documentName || doc.fileName);
    setAttachClassification(
      doc.documentName?.toLowerCase().includes('loss') ? 'LOSS_RUNS' : 'APPLICATION'
    );
    setLoadingEntities(true);
    setSelectedEntityId('');
    try {
      const [subs, pols] = await Promise.all([
        apiFetch('/api/submissions').catch(() => []),
        apiFetch('/api/policies').catch(() => [])
      ]);
      const validSubs = Array.isArray(subs) ? subs : [];
      const validPols = Array.isArray(pols) ? pols : [];
      setSubmissionsList(validSubs);
      setPoliciesList(validPols);
      if (attachEntityType === 'SUBMISSION' && validSubs.length > 0) {
        setSelectedEntityId(String(validSubs[0].submsnId));
      } else if (validPols.length > 0) {
        setSelectedEntityId(String(validPols[0].policyId || validPols[0].id));
      }
    } catch (e) {
      console.error('Failed to load submissions/policies for attaching:', e);
    } finally {
      setLoadingEntities(false);
    }
  };

  const handleConfirmAttach = async () => {
    if (!attachDoc || !selectedEntityId) return;
    setSubmittingAttach(true);
    try {
      let entityNbr = '';
      if (attachEntityType === 'SUBMISSION') {
        const found = submissionsList.find((s) => String(s.submsnId) === String(selectedEntityId));
        entityNbr = found ? found.submsnNbr : `SUB-${selectedEntityId}`;
      } else {
        const found = policiesList.find((p) => String(p.policyId || p.id) === String(selectedEntityId));
        entityNbr = found ? (found.id || found.policyNbr) : `POL-${selectedEntityId}`;
      }

      await apiFetch(`/document-api/documents/incoming/${attachDoc.incomingId}/attach?tenantId=${tenantId}`, {
        method: 'POST',
        body: JSON.stringify({
          entityType: attachEntityType,
          entityId: Number(selectedEntityId),
          entityNbr: entityNbr,
          docType: attachClassification,
          docTitle: attachCustomTitle || attachDoc.documentName,
          attachedBy: 'Helios Administrator'
        })
      });

      setFlash({
        type: 'success',
        text: `Document #${attachDoc.incomingId} successfully attached to ${attachEntityType} ${entityNbr}!`
      });
      setSelectedDocIds([]);
      setAttachDoc(null);
      await loadIncomingDocs();
    } catch (err) {
      setFlash({ type: 'error', text: `Failed to attach document: ${err.message}` });
    } finally {
      setSubmittingAttach(false);
    }
  };

  const handleStartCreateSubmission = (docsToProcess) => {
    const targetDocs = docsToProcess && docsToProcess.length > 0 ? docsToProcess : selectedDocs;
    if (!targetDocs || targetDocs.length === 0) return;
    if (onNavigate) {
      onNavigate('intake-submission', { selectedDocs: targetDocs });
    } else {
      window.open(`http://10.1.10.56/?tenantId=${tenantId}`, '_blank');
    }
  };

  const filteredDocs = useMemo(() => {
    return docs.filter((d) => {
      if (d.status === 'ATTACHED' || d.attachedEntityId || d.attachedEntityType) {
        return false;
      }
      if (filterStatus === 'DISCARDED' && d.status !== 'DISCARDED') return false;
      if (filterStatus === 'QUEUED' && d.status !== 'QUEUED') return false;

      const matchSearch =
        !searchQuery ||
        d.documentName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.fileName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.groupName?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchSearch;
    });
  }, [docs, filterStatus, searchQuery]);

  // Group documents into hierarchy: Main email as parent, attachments as children
  const hierarchicalDocs = useMemo(() => {
    const groups = new Map();
    const standalone = [];

    filteredDocs.forEach((doc) => {
      const gKey = doc.groupId || doc.groupName;
      if (gKey) {
        if (!groups.has(gKey)) {
          groups.set(gKey, []);
        }
        groups.get(gKey).push(doc);
      } else {
        standalone.push(doc);
      }
    });

    const items = [];

    groups.forEach((groupDocs) => {
      const emailDoc = groupDocs.find(
        (d) =>
          d.documentName?.startsWith('Email - ') ||
          d.fileName?.startsWith('Email_') ||
          d.fileName?.toLowerCase().endsWith('.eml') ||
          d.mimeType?.includes('message/rfc822')
      ) || (groupDocs.length > 1 ? groupDocs[0] : null);

      if (emailDoc && groupDocs.length > 1) {
        const children = groupDocs.filter((d) => d.incomingId !== emailDoc.incomingId);
        items.push({
          id: `parent-${emailDoc.incomingId}`,
          isParent: true,
          parentDoc: emailDoc,
          children: children,
          receivedDt: emailDoc.receivedDt
        });
      } else {
        groupDocs.forEach((d) => {
          items.push({
            id: `item-${d.incomingId}`,
            isParent: false,
            parentDoc: d,
            children: [],
            receivedDt: d.receivedDt
          });
        });
      }
    });

    standalone.forEach((d) => {
      items.push({
        id: `item-${d.incomingId}`,
        isParent: false,
        parentDoc: d,
        children: [],
        receivedDt: d.receivedDt
      });
    });

    items.sort((a, b) => (b.parentDoc.incomingId || 0) - (a.parentDoc.incomingId || 0));
    return items;
  }, [filteredDocs]);

  const handleToggleParent = (parentDoc, children) => {
    const familyIds = [parentDoc.incomingId, ...children.map((c) => c.incomingId)];
    const isFamilyAllSelected = familyIds.every((id) => selectedDocIds.includes(id));

    if (isFamilyAllSelected) {
      const toRemove = new Set(familyIds);
      setSelectedDocIds((prev) => prev.filter((id) => !toRemove.has(id)));
    } else {
      setSelectedDocIds((prev) => Array.from(new Set([...prev, ...familyIds])));
    }
  };

  const handleToggleChild = (childDoc) => {
    const childId = childDoc.incomingId;
    setSelectedDocIds((prev) =>
      prev.includes(childId) ? prev.filter((id) => id !== childId) : [...prev, childId]
    );
  };

  const handleToggleSingle = (doc) => {
    const id = doc.incomingId;
    setSelectedDocIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const selectedDocs = useMemo(() => {
    return filteredDocs.filter((d) => selectedDocIds.includes(d.incomingId));
  }, [filteredDocs, selectedDocIds]);

  const selectedDoc = selectedDocs[0] || null;

  const totalSelectedBytes = useMemo(() => {
    return selectedDocs.reduce((acc, d) => acc + (d.fileSizeBytes || 0), 0);
  }, [selectedDocs]);

  const stats = useMemo(() => {
    const total = docs.length;
    const queued = docs.filter((d) => d.status === 'QUEUED' && !d.attachedEntityId && !d.attachedEntityType).length;
    const attached = docs.filter((d) => d.status === 'ATTACHED' || d.attachedEntityId || d.attachedEntityType).length;
    const discarded = docs.filter((d) => d.status === 'DISCARDED').length;
    const groupCount = new Set(docs.filter((d) => d.status !== 'ATTACHED' && !d.attachedEntityId).map((d) => d.groupName).filter(Boolean)).size;
    return { total, queued, attached, discarded, groupCount };
  }, [docs]);

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(2) + ' MB';
  };

  const renderStatusChip = (status) => {
    switch (status) {
      case 'QUEUED':
        return (
          <Chip
            label="Queued in Inbox"
            size="small"
            sx={{ bgcolor: '#fef3c7', color: '#b45309', fontWeight: 700, fontSize: '0.72rem', border: '1px solid #fde68a' }}
          />
        );
      case 'ATTACHED':
        return (
          <Chip
            label="Attached"
            size="small"
            sx={{ bgcolor: '#dcfce7', color: '#15803d', fontWeight: 700, fontSize: '0.72rem', border: '1px solid #86efac' }}
          />
        );
      case 'DISCARDED':
        return (
          <Chip
            label="Discarded"
            size="small"
            sx={{ bgcolor: '#f1f5f9', color: '#64748b', fontWeight: 600, fontSize: '0.72rem' }}
          />
        );
      default:
        return <Chip label={status} size="small" sx={{ fontSize: '0.72rem' }} />;
    }
  };

  return (
    <Box>
      {flash && (
        <Alert severity={flash.type} onClose={() => setFlash(null)} sx={{ mb: 2 }}>
          {flash.text}
        </Alert>
      )}

      {/* Top Metrics Cards */}
      <Grid container spacing={2} sx={{ mb: 2.5 }}>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Card elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 2 }}>
            <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
              <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 600 }}>Total Ingested</Typography>
              <Typography variant="h5" sx={{ fontWeight: 700, color: 'primary.main', mt: 0.2 }}>
                {stats.total}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Card elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 2 }}>
            <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
              <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 600 }}>Queued (Pending Action)</Typography>
              <Typography variant="h5" sx={{ fontWeight: 700, color: '#d97706', mt: 0.2 }}>
                {stats.queued}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Card elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 2 }}>
            <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
              <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 600 }}>Attached / Linked</Typography>
              <Typography variant="h5" sx={{ fontWeight: 700, color: '#059669', mt: 0.2 }}>
                {stats.attached}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Card elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 2 }}>
            <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
              <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 600 }}>Grouped Batches</Typography>
              <Typography variant="h5" sx={{ fontWeight: 700, color: '#7c3aed', mt: 0.2 }}>
                {stats.groupCount}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Main Inbox Table Card */}
      <Card elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 2 }}>
        <CardContent sx={{ p: 2.5 }}>
          {/* Header & Controls */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1.5 }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Inbox size={20} style={{ color: '#0284c7' }} />
                Incoming Documents &amp; Intake Queue
              </Typography>
              <Typography variant="caption" color="textSecondary">
                Monitored inbox: <code>C:\helios-storage\documents\tenant_{tenantId}\inbox\</code> • Processed queue: <code>...\queue\</code>
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Button
                variant="outlined"
                size="small"
                startIcon={<RefreshCw size={15} />}
                onClick={loadIncomingDocs}
                disabled={loading}
              >
                Refresh
              </Button>
              <Button
                variant="contained"
                size="small"
                color="primary"
                startIcon={scanning ? <CircularProgress size={16} color="inherit" /> : <RefreshCw size={16} />}
                onClick={handleScanInbox}
                disabled={scanning}
                sx={{ fontWeight: 600 }}
              >
                {scanning ? 'Scanning Inbox...' : 'Scan Inbox Now'}
              </Button>
            </Box>
          </Box>

          {/* Filter Bar */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, gap: 1.5, flexWrap: 'wrap' }}>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {[
                { id: 'ALL', label: `All Pending (${stats.queued + stats.discarded})` },
                { id: 'QUEUED', label: `Queued (${stats.queued})` },
                { id: 'DISCARDED', label: `Discarded (${stats.discarded})` }
              ].map((pill) => (
                <Chip
                  key={pill.id}
                  label={pill.label}
                  size="small"
                  clickable
                  variant={filterStatus === pill.id ? 'filled' : 'outlined'}
                  color={filterStatus === pill.id ? 'primary' : 'default'}
                  onClick={() => {
                    setFilterStatus(pill.id);
                    setSelectedDocIds([]);
                  }}
                  sx={{ fontWeight: 600, fontSize: '0.75rem' }}
                />
              ))}
            </Box>

            <TextField
              size="small"
              placeholder="Search incoming documents or batch..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              sx={{ width: { xs: '100%', sm: 280 } }}
            />
          </Box>

          {/* External Action Toolbar */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 2,
              p: 1.5,
              borderRadius: 2,
              bgcolor: selectedDocs.length > 0 ? '#f0f9ff' : '#f8fafc',
              border: selectedDocs.length > 0 ? '1px solid #7dd3fc' : '1px dashed #cbd5e1',
              flexWrap: 'wrap',
              gap: 1.5
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: 1,
                  bgcolor: selectedDocs.length > 0 ? '#0284c7' : '#94a3b8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff'
                }}
              >
                <FileText size={18} />
              </Box>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 700, color: selectedDocs.length > 0 ? '#0369a1' : '#475569' }}>
                  {selectedDocs.length === 1 ? (
                    <>
                      Selected: #{selectedDoc.incomingId} — {selectedDoc.documentName}
                    </>
                  ) : selectedDocs.length > 1 ? (
                    <>
                      Selected: {selectedDocs.length} documents ({formatFileSize(totalSelectedBytes)})
                    </>
                  ) : (
                    'No document selected'
                  )}
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                  {selectedDocs.length === 1 ? (
                    <>
                      File: <code>{selectedDoc.fileName}</code> • {formatFileSize(selectedDoc.fileSizeBytes)} • {selectedDoc.groupName ? `Batch: ${selectedDoc.groupName}` : 'Standalone File'}
                    </>
                  ) : selectedDocs.length > 1 ? (
                    <>
                      {selectedDocs.map((d) => `#${d.incomingId}`).join(', ')} • Ready for submission intake
                    </>
                  ) : (
                    'Select one or multiple rows via checkboxes or clicks to activate intake actions.'
                  )}
                </Typography>
              </Box>
              {selectedDocs.length > 0 && (
                <Button
                  size="small"
                  variant="text"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedDocIds([]);
                  }}
                  sx={{ fontSize: '0.75rem', color: '#64748b', minWidth: 'auto', ml: 1 }}
                >
                  Deselect All
                </Button>
              )}
            </Box>

            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
              <Button
                size="small"
                variant="outlined"
                startIcon={<Eye size={15} />}
                disabled={selectedDocs.length !== 1}
                onClick={() => selectedDoc && setPreviewDoc(selectedDoc)}
                sx={{ fontWeight: 600 }}
              >
                Open / Preview
              </Button>
              <Button
                size="small"
                variant="outlined"
                startIcon={<Download size={15} />}
                disabled={selectedDocs.length !== 1}
                onClick={() => {
                  if (selectedDoc) {
                    window.open(`/document-api/documents/incoming/${selectedDoc.incomingId}/download?tenantId=${tenantId}`, '_blank');
                  }
                }}
                sx={{ fontWeight: 600 }}
              >
                Download
              </Button>
              <Button
                size="small"
                variant="contained"
                color="secondary"
                startIcon={<Paperclip size={15} />}
                disabled={selectedDocs.length === 0 || selectedDocs.some((d) => d.status === 'DISCARDED')}
                onClick={() => selectedDoc && handleOpenAttachModal(selectedDoc)}
                sx={{ fontWeight: 600 }}
              >
                Attach to File
              </Button>
              <Button
                size="small"
                variant="contained"
                color="primary"
                startIcon={<UserPlus size={15} />}
                disabled={selectedDocs.length === 0 || selectedDocs.some((d) => d.status === 'DISCARDED')}
                onClick={() => handleStartCreateSubmission(selectedDocs)}
                sx={{ fontWeight: 600 }}
              >
                {selectedDocs.length > 1 ? `New Submission (${selectedDocs.length})` : 'New Submission'}
              </Button>
              <Button
                size="small"
                variant="outlined"
                color="error"
                startIcon={<Trash2 size={15} />}
                disabled={selectedDocs.length === 0 || selectedDocs.some((d) => d.status === 'DISCARDED')}
                onClick={() => {
                  selectedDocs.forEach((d) => handleDiscard(d.incomingId, d.documentName));
                  setSelectedDocIds([]);
                }}
                sx={{ fontWeight: 600 }}
              >
                Discard
              </Button>
            </Box>
          </Box>

          {/* Documents Table */}
          <TableContainer component={Paper} elevation={0} variant="outlined" sx={{ borderRadius: 1.5 }}>
            <Table size="small">
              <TableHead sx={{ backgroundColor: '#f8fafc' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, width: 60 }}>ID</TableCell>
                  <TableCell sx={{ width: 44, p: 0.5, textAlign: 'center' }}>
                    <Checkbox
                      size="small"
                      indeterminate={selectedDocIds.length > 0 && selectedDocIds.length < filteredDocs.length}
                      checked={filteredDocs.length > 0 && selectedDocIds.length === filteredDocs.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedDocIds(filteredDocs.map((d) => d.incomingId));
                        } else {
                          setSelectedDocIds([]);
                        }
                      }}
                    />
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Document Title &amp; File</TableCell>
                  <TableCell sx={{ fontWeight: 700, width: 220 }}>Folder Group / Batch</TableCell>
                  <TableCell sx={{ fontWeight: 700, width: 160 }}>Received Date</TableCell>
                  <TableCell sx={{ fontWeight: 700, width: 100 }}>Size</TableCell>
                  <TableCell sx={{ fontWeight: 700, width: 140 }}>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} sx={{ textAlign: 'center', py: 4 }}>
                      <CircularProgress size={28} />
                      <Typography variant="body2" sx={{ mt: 1, color: '#64748b' }}>Loading incoming documents queue...</Typography>
                    </TableCell>
                  </TableRow>
                ) : filteredDocs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} sx={{ textAlign: 'center', py: 5, color: '#94a3b8' }}>
                      <Inbox size={32} style={{ opacity: 0.3, marginBottom: 8 }} />
                      <Typography variant="body2" fontWeight={600} color="textSecondary">
                        No pending inbox documents found
                      </Typography>
                      <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 0.5 }}>
                        Attached documents are linked to their respective files and excluded from the intake inbox.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  hierarchicalDocs.map((item) => {
                    if (item.isParent) {
                      const parentDoc = item.parentDoc;
                      const children = item.children;
                      const isExpanded = expandedParents[parentDoc.incomingId] !== false;
                      const familyIds = [parentDoc.incomingId, ...children.map((c) => c.incomingId)];
                      const isFamilyAllSelected = familyIds.every((id) => selectedDocIds.includes(id));
                      const isParentSelected = selectedDocIds.includes(parentDoc.incomingId);
                      const isAnyChildSelected = children.some((c) => selectedDocIds.includes(c.incomingId));
                      const isFamilyIndeterminate = !isFamilyAllSelected && (isParentSelected || isAnyChildSelected);
                      const isHighlight = isParentSelected || isFamilyAllSelected;

                      return (
                        <React.Fragment key={`group-${parentDoc.incomingId}`}>
                          <TableRow
                            hover
                            selected={isHighlight}
                            onClick={() => handleToggleParent(parentDoc, children)}
                            onDoubleClick={() => setPreviewDoc(parentDoc)}
                            sx={{
                              cursor: 'pointer',
                              bgcolor: isHighlight ? 'rgba(2, 132, 199, 0.08) !important' : '#ffffff',
                              borderLeft: isHighlight ? '4px solid #0284c7' : '4px solid transparent',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <TableCell sx={{ py: 1 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <IconButton
                                  size="small"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleExpand(parentDoc.incomingId);
                                  }}
                                  sx={{ p: 0.2, color: '#64748b' }}
                                >
                                  {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                </IconButton>
                                <Typography variant="body2" sx={{ fontWeight: 700, color: 'primary.main', fontSize: '0.8rem' }}>
                                  #{parentDoc.incomingId}
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell sx={{ width: 44, p: 0.5, textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                              <Checkbox
                                size="small"
                                checked={isFamilyAllSelected}
                                indeterminate={isFamilyIndeterminate}
                                onChange={() => handleToggleParent(parentDoc, children)}
                              />
                            </TableCell>
                            <TableCell sx={{ py: 1 }}>
                              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                                <Mail size={18} style={{ color: '#0284c7', marginTop: 2, flexShrink: 0 }} />
                                <Box>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                    <Typography
                                      variant="body2"
                                      sx={{
                                        fontWeight: 700,
                                        color: isHighlight ? '#0369a1' : '#0f172a'
                                      }}
                                    >
                                      {parentDoc.documentName}
                                    </Typography>
                                    <Chip
                                      size="small"
                                      label={`${children.length} attachment${children.length > 1 ? 's' : ''}`}
                                      sx={{
                                        bgcolor: '#e0f2fe',
                                        color: '#0369a1',
                                        fontWeight: 700,
                                        fontSize: '0.68rem',
                                        height: 20
                                      }}
                                    />
                                  </Box>
                                  <code style={{ fontSize: '0.72rem', color: '#64748b' }}>{parentDoc.fileName}</code>
                                </Box>
                              </Box>
                            </TableCell>
                            <TableCell sx={{ py: 1 }}>
                              {parentDoc.groupName ? (
                                <Chip
                                  icon={<Folder size={13} style={{ marginLeft: 4 }} />}
                                  label={parentDoc.groupName}
                                  size="small"
                                  sx={{
                                    bgcolor: '#f5f3ff',
                                    color: '#6d28d9',
                                    fontWeight: 600,
                                    fontSize: '0.72rem',
                                    border: '1px solid #ddd6fe'
                                  }}
                                />
                              ) : (
                                <Typography variant="caption" color="textSecondary">Standalone File</Typography>
                              )}
                            </TableCell>
                            <TableCell sx={{ fontSize: '0.8rem', color: '#475569', py: 1 }}>
                              {parentDoc.receivedDt ? String(parentDoc.receivedDt).substring(0, 16) : '—'}
                            </TableCell>
                            <TableCell sx={{ fontSize: '0.8rem', color: '#475569', py: 1 }}>
                              {formatFileSize(parentDoc.fileSizeBytes)}
                            </TableCell>
                            <TableCell sx={{ py: 1 }}>
                              {renderStatusChip(parentDoc.status)}
                            </TableCell>
                          </TableRow>

                          {/* Children Attachment Rows */}
                          {isExpanded &&
                            children.map((child) => {
                              const isChildSelected = selectedDocIds.includes(child.incomingId);
                              return (
                                <TableRow
                                  key={child.incomingId}
                                  hover
                                  selected={isChildSelected}
                                  onClick={() => handleToggleChild(child)}
                                  onDoubleClick={() => setPreviewDoc(child)}
                                  sx={{
                                    cursor: 'pointer',
                                    bgcolor: isChildSelected ? 'rgba(2, 132, 199, 0.08) !important' : '#f8fafc',
                                    borderLeft: isChildSelected ? '4px solid #0284c7' : '4px solid #cbd5e1',
                                    transition: 'all 0.15s ease'
                                  }}
                                >
                                  <TableCell sx={{ pl: 4.5, py: 0.8, fontWeight: 600, fontSize: '0.78rem', color: '#64748b' }}>
                                    #{child.incomingId}
                                  </TableCell>
                                  <TableCell sx={{ width: 44, p: 0.5, textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                                    <Checkbox
                                      size="small"
                                      checked={isChildSelected}
                                      onChange={() => handleToggleChild(child)}
                                    />
                                  </TableCell>
                                  <TableCell sx={{ py: 0.8 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, pl: 1 }}>
                                      <CornerDownRight size={15} style={{ color: '#94a3b8', flexShrink: 0 }} />
                                      <Paperclip size={15} style={{ color: '#0284c7', flexShrink: 0 }} />
                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                        <Typography
                                          variant="body2"
                                          sx={{
                                            fontWeight: isChildSelected ? 700 : 600,
                                            color: isChildSelected ? '#0369a1' : '#334155'
                                          }}
                                        >
                                          {child.documentName}
                                        </Typography>
                                        <Chip
                                          label="Attachment"
                                          size="small"
                                          sx={{
                                            bgcolor: '#f1f5f9',
                                            color: '#475569',
                                            fontWeight: 600,
                                            fontSize: '0.65rem',
                                            height: 18
                                          }}
                                        />
                                        <code style={{ fontSize: '0.72rem', color: '#64748b' }}>{child.fileName}</code>
                                      </Box>
                                    </Box>
                                  </TableCell>
                                  <TableCell sx={{ py: 0.8 }}>
                                    <Typography variant="caption" sx={{ color: '#64748b', fontStyle: 'italic' }}>
                                      ↳ Attached to #{parentDoc.incomingId}
                                    </Typography>
                                  </TableCell>
                                  <TableCell sx={{ fontSize: '0.8rem', color: '#475569', py: 0.8 }}>
                                    {child.receivedDt ? String(child.receivedDt).substring(0, 16) : '—'}
                                  </TableCell>
                                  <TableCell sx={{ fontSize: '0.8rem', color: '#475569', py: 0.8 }}>
                                    {formatFileSize(child.fileSizeBytes)}
                                  </TableCell>
                                  <TableCell sx={{ py: 0.8 }}>
                                    {renderStatusChip(child.status)}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                        </React.Fragment>
                      );
                    }

                    // Standalone Item
                    const doc = item.parentDoc;
                    const isSelected = selectedDocIds.includes(doc.incomingId);
                    return (
                      <TableRow
                        key={doc.incomingId}
                        hover
                        selected={isSelected}
                        onClick={() => handleToggleSingle(doc)}
                        onDoubleClick={() => setPreviewDoc(doc)}
                        sx={{
                          cursor: 'pointer',
                          bgcolor: isSelected ? 'rgba(2, 132, 199, 0.08) !important' : 'inherit',
                          borderLeft: isSelected ? '4px solid #0284c7' : '4px solid transparent',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <TableCell sx={{ fontWeight: 700, color: isSelected ? '#0284c7' : 'primary.main' }}>
                          #{doc.incomingId}
                        </TableCell>
                        <TableCell sx={{ width: 44, p: 0.5, textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            size="small"
                            checked={isSelected}
                            onChange={() => handleToggleSingle(doc)}
                          />
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <FileText size={18} style={{ color: isSelected ? '#0284c7' : '#64748b', flexShrink: 0 }} />
                            <Box>
                              <Typography
                                variant="body2"
                                sx={{
                                  fontWeight: isSelected ? 700 : 600,
                                  color: isSelected ? '#0369a1' : '#1e293b'
                                }}
                              >
                                {doc.documentName}
                              </Typography>
                              <code style={{ fontSize: '0.72rem', color: '#64748b' }}>{doc.fileName}</code>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          {doc.groupName ? (
                            <Chip
                              icon={<Folder size={13} style={{ marginLeft: 4 }} />}
                              label={doc.groupName}
                              size="small"
                              sx={{
                                bgcolor: '#f5f3ff',
                                color: '#6d28d9',
                                fontWeight: 600,
                                fontSize: '0.72rem',
                                border: '1px solid #ddd6fe'
                              }}
                            />
                          ) : (
                            <Typography variant="caption" color="textSecondary">Standalone File</Typography>
                          )}
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.8rem', color: '#475569' }}>
                          {doc.receivedDt ? String(doc.receivedDt).substring(0, 16) : '—'}
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.8rem', color: '#475569' }}>
                          {formatFileSize(doc.fileSizeBytes)}
                        </TableCell>
                        <TableCell>
                          {renderStatusChip(doc.status)}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* 1. DOCUMENT PREVIEW MODAL */}
      <Dialog
        open={Boolean(previewDoc)}
        onClose={() => setPreviewDoc(null)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle sx={{ pb: 1, borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FileText size={20} style={{ color: '#0284c7' }} />
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                {previewDoc?.documentName || 'Document Preview'}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                File: <code>{previewDoc?.fileName}</code> • Size: {formatFileSize(previewDoc?.fileSizeBytes)} • Status: {previewDoc?.status} {previewDoc?.groupName ? `• Group: ${previewDoc.groupName}` : ''}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              size="small"
              variant="outlined"
              startIcon={<ExternalLink size={14} />}
              onClick={() => {
                window.open(`/document-api/documents/incoming/${previewDoc?.incomingId}/preview?tenantId=${tenantId}`, '_blank');
              }}
            >
              Open in Tab
            </Button>
            <Button
              size="small"
              variant="contained"
              startIcon={<Download size={14} />}
              onClick={() => {
                window.open(`/document-api/documents/incoming/${previewDoc?.incomingId}/download?tenantId=${tenantId}`, '_blank');
              }}
            >
              Download
            </Button>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: 0, bgcolor: '#334155' }}>
          {previewDoc && (
            <Box sx={{ width: '100%', height: '700px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <iframe
                src={`/document-api/documents/incoming/${previewDoc.incomingId}/preview?tenantId=${tenantId}#toolbar=1`}
                title={previewDoc.documentName}
                width="100%"
                height="100%"
                style={{ border: 'none' }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 1.5, borderTop: '1px solid #e2e8f0' }}>
          <Button onClick={() => setPreviewDoc(null)} variant="outlined">
            Close Preview
          </Button>
        </DialogActions>
      </Dialog>

      {/* 2. ATTACH TO SUBMISSION OR POLICY MODAL */}
      <Dialog
        open={Boolean(attachDoc)}
        onClose={() => !submittingAttach && setAttachDoc(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ pb: 1, borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 1 }}>
          <Paperclip size={20} style={{ color: '#0284c7' }} />
          Associate Document to Policy or Submission
        </DialogTitle>
        <DialogContent sx={{ pt: 2.5 }}>
          <Alert severity="info" sx={{ mb: 2.5, fontSize: '0.82rem' }}>
            Attaching <strong>{attachDoc?.documentName}</strong> ({attachDoc?.fileName}) directly links the file to the selected record and displays it in its Documents tab.
          </Alert>

          <Grid container spacing={2}>
            {/* Target Entity Type Toggle */}
            <Grid size={{ xs: 12 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Target Entity Type</InputLabel>
                <Select
                  value={attachEntityType}
                  label="Target Entity Type"
                  onChange={(e) => {
                    const next = e.target.value;
                    setAttachEntityType(next);
                    if (next === 'SUBMISSION' && submissionsList.length > 0) {
                      setSelectedEntityId(String(submissionsList[0].submsnId));
                    } else if (policiesList.length > 0) {
                      setSelectedEntityId(String(policiesList[0].policyId || policiesList[0].id));
                    }
                  }}
                >
                  <MenuItem value="SUBMISSION">Underwriting Submission (UW_SUBMSN)</MenuItem>
                  <MenuItem value="POLICY">Active Insurance Policy (UW_POLICY)</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Select Target Submission or Policy */}
            <Grid size={{ xs: 12 }}>
              {loadingEntities ? (
                <Box sx={{ textAlign: 'center', py: 2 }}>
                  <CircularProgress size={20} />
                </Box>
              ) : attachEntityType === 'SUBMISSION' ? (
                <FormControl fullWidth size="small">
                  <InputLabel>Select Target Submission</InputLabel>
                  <Select
                    value={selectedEntityId}
                    label="Select Target Submission"
                    onChange={(e) => setSelectedEntityId(e.target.value)}
                  >
                    {submissionsList.map((sub) => (
                      <MenuItem key={sub.submsnId} value={String(sub.submsnId)}>
                        {sub.submsnNbr} — {sub.orgName} ({sub.productType || 'Standard'} • {sub.status || 'Received'})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              ) : (
                <FormControl fullWidth size="small">
                  <InputLabel>Select Target Policy</InputLabel>
                  <Select
                    value={selectedEntityId}
                    label="Select Target Policy"
                    onChange={(e) => setSelectedEntityId(e.target.value)}
                  >
                    {policiesList.map((pol) => (
                      <MenuItem key={pol.policyId || pol.id} value={String(pol.policyId || pol.id)}>
                        {pol.id || pol.policyNbr} — {pol.name} ({pol.productType})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            </Grid>

            {/* Document Classification */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Classification / Type</InputLabel>
                <Select
                  value={attachClassification}
                  label="Classification / Type"
                  onChange={(e) => setAttachClassification(e.target.value)}
                >
                  <MenuItem value="APPLICATION">Commercial Application</MenuItem>
                  <MenuItem value="LOSS_RUNS">Loss Runs &amp; Claim Experience</MenuItem>
                  <MenuItem value="FINANCIALS">Audited Financial Statements</MenuItem>
                  <MenuItem value="SCHEDULE">Rating Schedule</MenuItem>
                  <MenuItem value="ENDORSEMENT">Endorsement Request</MenuItem>
                  <MenuItem value="ATTACHMENT">General Attachment</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Custom Title */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                size="small"
                label="Document Display Title"
                value={attachCustomTitle}
                onChange={(e) => setAttachCustomTitle(e.target.value)}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 1.5, borderTop: '1px solid #e2e8f0' }}>
          <Button onClick={() => setAttachDoc(null)} disabled={submittingAttach}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleConfirmAttach}
            disabled={submittingAttach || !selectedEntityId}
            startIcon={submittingAttach ? <CircularProgress size={16} color="inherit" /> : <Paperclip size={16} />}
            sx={{ fontWeight: 600 }}
          >
            {submittingAttach ? 'Attaching...' : 'Confirm Attachment'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

