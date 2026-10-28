import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  Button,
  IconButton,
  Chip,
  TextField,
  InputAdornment,
  Divider,
  Paper,
  Tooltip,
  CircularProgress
} from '@mui/material';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  X,
  FileText,
  Search,
  RefreshCw,
  Layers,
  PanelLeftClose,
  PanelLeftOpen,
  CheckCircle,
  Clock,
  Paperclip
} from 'lucide-react';

function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function DocumentPreviewPage() {
  const [docs, setDocs] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [tenantId, setTenantId] = useState('1');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchFilter, setSearchFilter] = useState('');
  const [frameLoading, setFrameLoading] = useState(true);

  // Apply payload received from parent / storage / broadcast
  const handleApplyPayload = useCallback((payload) => {
    if (!payload || !Array.isArray(payload.docs)) {
      return;
    }
    setDocs(payload.docs);
    if (payload.docs.length === 0) {
      setActiveIndex(0);
      return;
    }
    const validIdx = typeof payload.activeIndex === 'number' && payload.activeIndex >= 0 && payload.activeIndex < payload.docs.length
      ? payload.activeIndex
      : 0;
    setActiveIndex(validIdx);
    if (payload.tenantId) {
      setTenantId(payload.tenantId);
    }
    // Auto open sidebar if multiple documents exist
    if (payload.docs.length > 1) {
      setSidebarOpen(true);
    }
    setFrameLoading(true);
  }, []);

  // 1. Initial hydration from window.opener or localStorage
  useEffect(() => {
    try {
      if (window.opener && window.opener.__helios_preview_payload) {
        handleApplyPayload(window.opener.__helios_preview_payload);
        return;
      }
    } catch (e) {
      // Cross-origin access restriction if different domain, ignore
    }

    try {
      const raw = localStorage.getItem('helios_doc_preview_payload');
      if (raw) {
        const parsed = JSON.parse(raw);
        handleApplyPayload(parsed);
      }
    } catch (err) {
      console.warn('Failed to parse initial preview payload:', err);
    }
  }, [handleApplyPayload]);

  // 2. Cross-window listeners: BroadcastChannel & StorageEvent
  useEffect(() => {
    let channel;
    try {
      channel = new BroadcastChannel('helios_doc_preview_channel');
      channel.onmessage = (event) => {
        if (event.data && (event.data.type === 'UPDATE_PREVIEW' || event.data.docs)) {
          handleApplyPayload(event.data);
        }
      };
    } catch (e) {
      console.warn('BroadcastChannel not supported:', e);
    }

    const onStorageChange = (e) => {
      if (e.key === 'helios_doc_preview_payload' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          handleApplyPayload(parsed);
        } catch (err) {
          console.warn('Storage sync error:', err);
        }
      }
    };

    window.addEventListener('storage', onStorageChange);

    return () => {
      if (channel) {
        channel.close();
      }
      window.removeEventListener('storage', onStorageChange);
    };
  }, [handleApplyPayload]);

  const activeDoc = useMemo(() => {
    if (!docs || docs.length === 0) return null;
    return docs[activeIndex] || docs[0];
  }, [docs, activeIndex]);

  // Update window title with active document name and batch count
  useEffect(() => {
    if (activeDoc) {
      document.title = `${activeDoc.documentName || activeDoc.fileName} (${activeIndex + 1}/${docs.length}) - Helios Document Preview`;
    } else {
      document.title = 'Helios Document Preview';
    }
  }, [activeDoc, activeIndex, docs.length]);

  // Keyboard navigation: Left/Right arrows, Escape to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't intercept if user is typing in search input
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
        return;
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setActiveIndex((prev) => Math.max(0, prev - 1));
        setFrameLoading(true);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setActiveIndex((prev) => Math.min(docs.length - 1, prev + 1));
        setFrameLoading(true);
      } else if (e.key === 'Escape') {
        window.close();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [docs.length]);

  const handlePrev = () => {
    if (activeIndex > 0) {
      setActiveIndex(activeIndex - 1);
      setFrameLoading(true);
    }
  };

  const handleNext = () => {
    if (activeIndex < docs.length - 1) {
      setActiveIndex(activeIndex + 1);
      setFrameLoading(true);
    }
  };

  const handleSelectDoc = (index) => {
    setActiveIndex(index);
    setFrameLoading(true);
  };

  const filteredDocs = useMemo(() => {
    if (!searchFilter.trim()) return docs;
    const q = searchFilter.toLowerCase();
    return docs.filter(
      (d) =>
        (d.documentName && d.documentName.toLowerCase().includes(q)) ||
        (d.fileName && d.fileName.toLowerCase().includes(q)) ||
        (d.incomingId && String(d.incomingId).includes(q)) ||
        (d.groupName && d.groupName.toLowerCase().includes(q))
    );
  }, [docs, searchFilter]);

  const previewSrc = useMemo(() => {
    if (!activeDoc) return '';
    if (activeDoc.previewUrl) return activeDoc.previewUrl;
    if (activeDoc.blobUrl) return activeDoc.blobUrl;
    if (activeDoc.url) return activeDoc.url;
    if (activeDoc.incomingId) {
      return `/document-api/documents/incoming/${activeDoc.incomingId}/preview?tenantId=${tenantId}#toolbar=1`;
    }
    const docId = activeDoc.documentId || activeDoc.id;
    if (docId) {
      return `/document-api/documents/${docId}/preview?tenantId=${tenantId}#toolbar=1`;
    }
    return '';
  }, [activeDoc, tenantId]);

  const downloadUrl = useMemo(() => {
    if (!activeDoc) return '';
    if (activeDoc.downloadUrl) return activeDoc.downloadUrl;
    if (activeDoc.blobUrl) return activeDoc.blobUrl;
    if (activeDoc.previewUrl) return activeDoc.previewUrl;
    if (activeDoc.incomingId) {
      return `/document-api/documents/incoming/${activeDoc.incomingId}/download?tenantId=${tenantId}`;
    }
    const docId = activeDoc.documentId || activeDoc.id;
    if (docId) {
      return `/document-api/documents/${docId}/download?tenantId=${tenantId}`;
    }
    return '';
  }, [activeDoc, tenantId]);

  return (
    <Box
      sx={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: '#0f172a',
        overflow: 'hidden',
        userSelect: 'none'
      }}
    >
      {/* =====================================================================
          TOP ACTION & NAVIGATION APP BAR
         ===================================================================== */}
      <Paper
        elevation={3}
        square
        sx={{
          height: 56,
          minHeight: 56,
          bgcolor: '#1e293b',
          borderBottom: '1px solid #334155',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
          gap: 1.5,
          zIndex: 10
        }}
      >
        {/* Left: Brand, Sidebar Toggle & Batch Counter */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 260 }}>
          <Tooltip title={sidebarOpen ? 'Hide Document List' : 'Show Document List'}>
            <IconButton
              size="small"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              sx={{ color: sidebarOpen ? '#38bdf8' : '#94a3b8', bgcolor: sidebarOpen ? 'rgba(56, 189, 248, 0.1)' : 'transparent' }}
            >
              {sidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
            </IconButton>
          </Tooltip>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FileText size={18} style={{ color: '#38bdf8' }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#f8fafc', letterSpacing: 0.2 }}>
              Helios Preview
            </Typography>
          </Box>

          {docs.length > 0 && (
            <Chip
              icon={<Layers size={13} style={{ color: '#0284c7' }} />}
              label={`${activeIndex + 1} of ${docs.length}`}
              size="small"
              sx={{
                bgcolor: '#0f172a',
                color: '#38bdf8',
                fontWeight: 700,
                fontSize: '0.75rem',
                border: '1px solid #0284c7',
                height: 24
              }}
            />
          )}
        </Box>

        {/* Center: Prev/Next Stepper & Active Document Title */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1, justifyContent: 'center', overflow: 'hidden' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, bgcolor: '#0f172a', borderRadius: 1.5, p: 0.25, border: '1px solid #334155' }}>
            <Tooltip title="Previous Document (Left Arrow)">
              <span>
                <IconButton
                  size="small"
                  onClick={handlePrev}
                  disabled={activeIndex <= 0 || docs.length <= 1}
                  sx={{
                    color: activeIndex > 0 ? '#f8fafc' : '#475569',
                    p: 0.5,
                    '&:hover': { bgcolor: '#1e293b' }
                  }}
                >
                  <ChevronLeft size={18} />
                </IconButton>
              </span>
            </Tooltip>

            <Tooltip title="Next Document (Right Arrow)">
              <span>
                <IconButton
                  size="small"
                  onClick={handleNext}
                  disabled={activeIndex >= docs.length - 1 || docs.length <= 1}
                  sx={{
                    color: activeIndex < docs.length - 1 ? '#f8fafc' : '#475569',
                    p: 0.5,
                    '&:hover': { bgcolor: '#1e293b' }
                  }}
                >
                  <ChevronRight size={18} />
                </IconButton>
              </span>
            </Tooltip>
          </Box>

          {activeDoc && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0, overflow: 'hidden' }}>
              <Typography
                variant="body2"
                noWrap
                sx={{ fontWeight: 600, color: '#e2e8f0', maxWidth: 450 }}
              >
                {activeDoc.documentName || activeDoc.fileName}
              </Typography>
              <Typography variant="caption" noWrap sx={{ color: '#94a3b8', display: { xs: 'none', md: 'inline' } }}>
                • #{activeDoc.incomingId} ({formatFileSize(activeDoc.fileSizeBytes)})
              </Typography>
              {activeDoc.status && (
                <Chip
                  label={activeDoc.status}
                  size="small"
                  sx={{
                    height: 20,
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    bgcolor:
                      activeDoc.status === 'NEW'
                        ? 'rgba(14, 165, 233, 0.15)'
                        : activeDoc.status === 'ATTACHED'
                        ? 'rgba(34, 197, 94, 0.15)'
                        : 'rgba(148, 163, 184, 0.15)',
                    color:
                      activeDoc.status === 'NEW'
                        ? '#38bdf8'
                        : activeDoc.status === 'ATTACHED'
                        ? '#4ade80'
                        : '#cbd5e1',
                    border: '1px solid currentColor'
                  }}
                />
              )}
            </Box>
          )}
        </Box>

        {/* Right: Actions (Download, Open Tab, Close) */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Tooltip title="Download Current Document">
            <span>
              <Button
                size="small"
                variant="outlined"
                startIcon={<Download size={14} />}
                disabled={!activeDoc}
                onClick={() => {
                  if (downloadUrl) {
                    const a = document.createElement('a');
                    a.href = downloadUrl;
                    a.download = activeDoc?.fileName || activeDoc?.documentName || 'document.pdf';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                  }
                }}
                sx={{
                  color: '#e2e8f0',
                  borderColor: '#475569',
                  textTransform: 'none',
                  fontSize: '0.75rem',
                  py: 0.4,
                  '&:hover': { borderColor: '#38bdf8', bgcolor: 'rgba(56, 189, 248, 0.1)' }
                }}
              >
                Download
              </Button>
            </span>
          </Tooltip>

          <Tooltip title="Open in New Browser Tab">
            <span>
              <Button
                size="small"
                variant="outlined"
                startIcon={<ExternalLink size={14} />}
                disabled={!activeDoc}
                onClick={() => {
                  if (previewSrc) window.open(previewSrc, '_blank');
                }}
                sx={{
                  color: '#e2e8f0',
                  borderColor: '#475569',
                  textTransform: 'none',
                  fontSize: '0.75rem',
                  py: 0.4,
                  '&:hover': { borderColor: '#38bdf8', bgcolor: 'rgba(56, 189, 248, 0.1)' }
                }}
              >
                Raw Tab
              </Button>
            </span>
          </Tooltip>

          <Divider orientation="vertical" flexItem sx={{ borderColor: '#334155', mx: 0.5 }} />

          <Tooltip title="Close Window (Esc)">
            <IconButton
              size="small"
              onClick={() => window.close()}
              sx={{
                color: '#94a3b8',
                '&:hover': { color: '#f87171', bgcolor: 'rgba(239, 68, 68, 0.1)' }
              }}
            >
              <X size={18} />
            </IconButton>
          </Tooltip>
        </Box>
      </Paper>

      {/* =====================================================================
          MAIN WORKSPACE (SIDEBAR + VIEWER)
         ===================================================================== */}
      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>
        {/* Collapsible Document List Sidebar */}
        {sidebarOpen && (
          <Box
            sx={{
              width: 320,
              minWidth: 320,
              height: '100%',
              bgcolor: '#1e293b',
              borderRight: '1px solid #334155',
              display: 'flex',
              flexDirection: 'column',
              zIndex: 5
            }}
          >
            {/* Sidebar Search Bar */}
            <Box sx={{ p: 1.5, borderBottom: '1px solid #334155' }}>
              <TextField
                size="small"
                fullWidth
                placeholder={`Search ${docs.length} document${docs.length === 1 ? '' : 's'}...`}
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search size={14} style={{ color: '#64748b' }} />
                    </InputAdornment>
                  ),
                  sx: {
                    bgcolor: '#0f172a',
                    color: '#f8fafc',
                    fontSize: '0.8rem',
                    borderRadius: 1,
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: '#334155' },
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#475569' },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#38bdf8' }
                  }
                }}
              />
            </Box>

            {/* Document Items List */}
            <Box sx={{ flex: 1, overflowY: 'auto', p: 1, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
              {filteredDocs.length === 0 ? (
                <Box sx={{ p: 3, textAlign: 'center' }}>
                  <Typography variant="body2" sx={{ color: '#64748b' }}>
                    {docs.length === 0 ? 'No documents selected for preview.' : 'No matching documents found.'}
                  </Typography>
                </Box>
              ) : (
                filteredDocs.map((doc) => {
                  const actualIdx = docs.findIndex((d) => d.incomingId === doc.incomingId);
                  const isSelected = actualIdx === activeIndex;

                  return (
                    <Paper
                      key={doc.incomingId}
                      elevation={isSelected ? 2 : 0}
                      onClick={() => handleSelectDoc(actualIdx)}
                      sx={{
                        p: 1.25,
                        cursor: 'pointer',
                        borderRadius: 1.5,
                        bgcolor: isSelected ? 'rgba(2, 132, 199, 0.2)' : '#0f172a',
                        border: isSelected ? '1px solid #38bdf8' : '1px solid #1e293b',
                        transition: 'all 0.15s ease',
                        '&:hover': {
                          bgcolor: isSelected ? 'rgba(2, 132, 199, 0.25)' : 'rgba(51, 65, 85, 0.4)',
                          borderColor: isSelected ? '#38bdf8' : '#475569'
                        }
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                        <FileText
                          size={18}
                          style={{
                            color: isSelected ? '#38bdf8' : '#94a3b8',
                            marginTop: 2,
                            flexShrink: 0
                          }}
                        />
                        <Box sx={{ minWidth: 0, flex: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 0.5 }}>
                            <Typography
                              variant="body2"
                              noWrap
                              sx={{
                                fontWeight: isSelected ? 700 : 600,
                                color: isSelected ? '#38bdf8' : '#f1f5f9',
                                fontSize: '0.8rem'
                              }}
                            >
                              {doc.documentName || doc.fileName}
                            </Typography>
                            <Typography
                              variant="caption"
                              sx={{
                                fontWeight: 700,
                                color: isSelected ? '#7dd3fc' : '#64748b',
                                fontSize: '0.7rem'
                              }}
                            >
                              #{actualIdx + 1}
                            </Typography>
                          </Box>

                          <Typography
                            variant="caption"
                            noWrap
                            sx={{ color: '#94a3b8', display: 'block', fontSize: '0.72rem' }}
                          >
                            {doc.fileName}
                          </Typography>

                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
                            <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.68rem' }}>
                              {formatFileSize(doc.fileSizeBytes)}
                            </Typography>
                            {doc.groupName && (
                              <Chip
                                label={doc.groupName}
                                size="small"
                                sx={{
                                  height: 16,
                                  fontSize: '0.62rem',
                                  bgcolor: '#1e293b',
                                  color: '#cbd5e1'
                                }}
                              />
                            )}
                          </Box>
                        </Box>
                      </Box>
                    </Paper>
                  );
                })
              )}
            </Box>

            {/* Sidebar Footer */}
            <Box
              sx={{
                p: 1.25,
                bgcolor: '#0f172a',
                borderTop: '1px solid #334155',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.7rem' }}>
                Use ← / → keys to navigate
              </Typography>
              <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.7rem' }}>
                Tenant: {tenantId}
              </Typography>
            </Box>
          </Box>
        )}

        {/* Main Document Viewer (Iframe container) */}
        <Box
          sx={{
            flex: 1,
            height: '100%',
            bgcolor: '#334155',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden'
          }}
        >
          {activeDoc ? (
            <>
              {frameLoading && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: 'rgba(15, 23, 42, 0.7)',
                    zIndex: 2,
                    gap: 1.5
                  }}
                >
                  <CircularProgress size={36} sx={{ color: '#38bdf8' }} />
                  <Typography variant="body2" sx={{ color: '#e2e8f0', fontWeight: 600 }}>
                    Loading document #{activeDoc.incomingId}...
                  </Typography>
                </Box>
              )}

              <iframe
                key={`${activeDoc.incomingId}-${tenantId}`}
                src={previewSrc}
                title={activeDoc.documentName || activeDoc.fileName}
                width="100%"
                height="100%"
                style={{ border: 'none' }}
                onLoad={() => setFrameLoading(false)}
              />
            </>
          ) : (
            <Box sx={{ textAlign: 'center', p: 4, maxWidth: 480 }}>
              <Paper
                elevation={0}
                sx={{
                  p: 4,
                  bgcolor: '#1e293b',
                  borderRadius: 2,
                  border: '1px dashed #475569',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 1.5
                }}
              >
                <Layers size={48} style={{ color: '#64748b' }} />
                <Typography variant="h6" sx={{ color: '#f8fafc', fontWeight: 700 }}>
                  Ready for Document Preview
                </Typography>
                <Typography variant="body2" sx={{ color: '#94a3b8', lineHeight: 1.5 }}>
                  Select one or multiple documents in the <strong>Helios Intake Inbox</strong> and click{' '}
                  <strong>Open / Preview</strong> to display them here in real-time.
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748b' }}>
                  This window automatically replaces content when a new document batch is selected.
                </Typography>
              </Paper>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}

export default DocumentPreviewPage;

