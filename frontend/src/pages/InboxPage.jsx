import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTenant, apiFetch } from '../tenantContext.jsx';
import IncomingDocumentsManager from './IncomingDocumentsManager.jsx';

/**
 * InboxPage: Full Document Intake Inbox & Queue
 * Houses real-time document ingestion, status filtering (NEW, ATTACHED, DISCARDED, QUEUED),
 * multi-file batch actions, submission linking, manual scans, and document previewing.
 */
export function InboxPage() {
  const { activeTenantId } = useTenant();
  const navigate = useNavigate();

  const handleNavigate = (view, payload) => {
    if (view === 'submissions' || view === 'intake-submission') {
      navigate('/submissions', { state: payload });
    } else {
      navigate('/');
    }
  };

  return (
    <IncomingDocumentsManager
      apiFetch={apiFetch}
      activeTenantId={activeTenantId}
      selectedTenantId={activeTenantId}
      onNavigate={handleNavigate}
    />
  );
}

export default InboxPage;
