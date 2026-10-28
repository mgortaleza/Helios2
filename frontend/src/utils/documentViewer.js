/**
 * Universal document viewer caller: launches or focuses the detached
 * 2nd-screen/tab document previewer created for the Document Inbox (#/document-preview).
 *
 * @param {Object|Array<Object>} docs - Single document or list of document objects
 * @param {number} [initialIndex=0] - Initial document index to show
 * @param {string|number} [tenantId=1] - Active tenant ID
 */
export function openDocumentViewer(docs, initialIndex = 0, tenantId = 1) {
  const rawList = (Array.isArray(docs) ? docs : [docs]).filter(Boolean);
  if (rawList.length === 0) return null;

  const resolvedTenantId = String(tenantId || 1);

  // Normalize document fields so that incoming, repository, and dynamically generated docs all work
  const normalizedDocs = rawList.map((d, idx) => {
    const docName = d.documentName || d.fileName || d.title || d.form_name || `Document #${d.incomingId || d.documentId || d.id || idx + 1}`;
    const fName = d.fileName || (d.documentName ? (d.documentName.endsWith('.pdf') ? d.documentName : `${d.documentName}.pdf`) : 'document.pdf');

    let previewUrl = d.previewUrl || null;
    let downloadUrl = d.downloadUrl || null;

    if (d.incomingId) {
      // Inbox incoming document (exact path)
      previewUrl = `/document-api/documents/incoming/${d.incomingId}/preview?tenantId=${resolvedTenantId}#toolbar=1`;
      downloadUrl = `/document-api/documents/incoming/${d.incomingId}/download?tenantId=${resolvedTenantId}`;
    } else if (d.templateId) {
      // Dec page template test preview
      previewUrl = `/document-api/dec-page-templates/${d.templateId}/preview-test?tenantId=${resolvedTenantId}&t=${Date.now()}#toolbar=1`;
      downloadUrl = `/document-api/dec-page-templates/${d.templateId}/preview-test?tenantId=${resolvedTenantId}&download=true`;
    } else if (d.documentId || d.id) {
      // Formal repository document
      const docId = d.documentId || d.id;
      previewUrl = `/document-api/documents/${docId}/preview?tenantId=${resolvedTenantId}#toolbar=1`;
      downloadUrl = `/document-api/documents/${docId}/download?tenantId=${resolvedTenantId}`;
    }

    return {
      ...d,
      documentName: docName,
      fileName: fName,
      incomingId: d.incomingId || null,
      documentId: d.documentId || d.id || null,
      templateId: d.templateId || null,
      previewUrl: previewUrl,
      downloadUrl: downloadUrl,
      fileSizeBytes: d.fileSizeBytes || d.size || d.file_size || 0,
      mimeType: d.mimeType || d.fileExtension || 'application/pdf',
      status: d.status || 'READY'
    };
  });

  const validIndex = Math.max(0, Math.min(initialIndex, normalizedDocs.length - 1));
  const payload = {
    docs: normalizedDocs,
    activeIndex: validIndex,
    tenantId: resolvedTenantId,
    timestamp: Date.now()
  };

  // 1. Store in localStorage for instant access & storage event sync across windows
  try {
    localStorage.setItem('helios_doc_preview_payload', JSON.stringify(payload));
  } catch (e) {
    console.warn('Failed to save preview payload in localStorage:', e);
  }

  // 2. Attach to window object for cross-origin/opener inspection
  try {
    window.__helios_preview_payload = payload;
  } catch (e) {}

  // 3. Broadcast to existing open preview popup window
  try {
    const channel = new BroadcastChannel('helios_doc_preview_channel');
    channel.postMessage({ type: 'UPDATE_PREVIEW', ...payload });
    setTimeout(() => channel.close(), 100);
  } catch (e) {
    console.warn('BroadcastChannel error:', e);
  }

  // 4. Open or focus the named popup window
  // If running on admin port 8090, target the underwriting app port 80 where the preview route lives
  let previewUrl = `${window.location.origin}/#/document-preview`;
  if (window.location.port === '8090') {
    previewUrl = `http://${window.location.hostname}:80/#/document-preview`;
  }

  const popup = window.open(
    previewUrl,
    'helios_doc_preview_window',
    'width=1320,height=920,left=120,top=60,resizable=yes,scrollbars=yes,status=no,toolbar=no,menubar=no'
  );

  if (popup && !popup.closed) {
    try {
      popup.focus();
    } catch (e) {}
  }

  return popup;
}
