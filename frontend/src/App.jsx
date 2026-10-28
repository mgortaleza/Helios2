import React from 'react';
import {
  Admin,
  Resource,
  CustomRoutes
} from 'react-admin';
import { Route } from 'react-router-dom';
import { createTheme } from '@mui/material/styles';

// Data Provider & Multi-Tenant Context
import { dataProvider } from './dataProvider.js';
import { TenantProvider, useTenant } from './tenantContext.jsx';
import { AuthProvider, useAuth } from './authContext.jsx';
import { LoginPage } from './pages/LoginPage.jsx';

// Custom Layout with 3-Tier Cascading Navigation
import { HeliosLayout, HeliosErrorFallback } from './layout/HeliosLayout.jsx';

// Resource Views (Tier 2 & Supporting)
import { PolicyList, PolicyShow } from './resources/policies.jsx';
import { SubmissionList, SubmissionShow, SubmissionCreate } from './resources/submissions.jsx';
import { QuoteList, QuoteShow, NestedQuotesView } from './resources/quotes.jsx';
import { DocumentList, DocumentShow, NestedDocumentsView } from './resources/documents.jsx';
import { FormList, FormShow, NestedFormsView } from './resources/forms.jsx';
import {
  DecPageTemplateList,
  DecPageTemplateShow,
  DecPageTemplateCreate
} from './resources/decPageTemplates.jsx';
import {
  ClaimList,
  ClaimShow,
  ClaimsFnolView,
  ClaimsOpenView,
  ClaimsLossRunsView
} from './resources/claims.jsx';
import { PartyList, PartyShow, PartyCreate } from './resources/parties.jsx';
import { TenantList } from './resources/tenants.jsx';

// Standalone & Nested Pages
import { DashboardPage } from './pages/DashboardPage.jsx';
import { InboxPage } from './pages/InboxPage.jsx';
import { DiagnosticsPage } from './pages/DiagnosticsPage.jsx';
import { DocumentPreviewPage } from './pages/DocumentPreviewPage.jsx';

/**
 * Modern Corporate Enterprise Theme for Helios2
 */
const heliosTheme = createTheme({
  palette: {
    primary: {
      main: '#0284c7', // Underwriting Sky Blue
      light: '#38bdf8',
      dark: '#0369a1'
    },
    secondary: {
      main: '#d97706', // Claims Warm Amber
      light: '#f59e0b',
      dark: '#b45309'
    },
    background: {
      default: '#f8fafc',
      paper: '#ffffff'
    },
    text: {
      primary: '#0f172a',
      secondary: '#64748b'
    }
  },
  typography: {
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    h4: { fontWeight: 800, color: '#0f172a' },
    h5: { fontWeight: 700, color: '#0f172a' },
    h6: { fontWeight: 600, color: '#0f172a' },
    subtitle1: { fontWeight: 600 },
    subtitle2: { fontWeight: 600 }
  },
  shape: {
    borderRadius: 8
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: 6
        }
      }
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.05)',
          border: '1px solid #e2e8f0'
        }
      }
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none'
        }
      }
    }
  }
});

/**
 * Helios2 React-Admin Main Application Entry Point
 *
 * Implements a 3-Tier Cascading Navigation Layout:
 * - Tier 1 (Main Nav / Switcher): Dashboard, Underwriting, Claims
 * - Tier 2 (Secondary Nav): Document Inbox, Policies, Submissions (or Claims Registry, FNOL, etc.)
 * - Tier 3 (Tertiary Nav): Quotes & Rating, Documents, Forms (collapsible under Policies & Submissions)
 */
export default function App() {
  return (
    <TenantProvider>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </TenantProvider>
  );
}

function AppShell() {
  const { currentUser, login, sessionNotice } = useAuth();
  const { tenants } = useTenant();

  if (!currentUser) {
    return (
      <LoginPage
        onLoginSuccess={login}
        tenants={tenants}
        inactivityMessage={sessionNotice}
      />
    );
  }

  return (
    <Admin
      dataProvider={dataProvider}
      layout={HeliosLayout}
      dashboard={DashboardPage}
      theme={heliosTheme}
      error={HeliosErrorFallback}
    >
        {/* =================================================================
            STANDALONE DETACHED WINDOW ROUTES (noLayout)
            Used for 2nd screen multi-document previewer and popup windows.
           ================================================================= */}
        <CustomRoutes noLayout>
          <Route path="document-preview" element={<DocumentPreviewPage />} />
          <Route path="/document-preview" element={<DocumentPreviewPage />} />
        </CustomRoutes>

        <CustomRoutes>
          {/* =================================================================
              TIER 2 ROUTES
             ================================================================= */}
          {/* Underwriting: Document Intake Inbox */}
          <Route path="inbox" element={<InboxPage />} />

          {/* Claims: Operational Views */}
          <Route path="claims/fnol" element={<ClaimsFnolView />} />
          <Route path="claims/open" element={<ClaimsOpenView />} />
          <Route path="claims/loss-runs" element={<ClaimsLossRunsView />} />

          {/* =================================================================
              TIER 3 NESTED ROUTES: SUBMISSIONS
              Handles both parameterized (:id) and collection-level drill-downs:
              - submissions/:id/quotes  &  submissions/quotes
              - submissions/:id/documents  &  submissions/documents
              - submissions/:id/forms  &  submissions/forms
             ================================================================= */}
          <Route
            path="submissions/quotes"
            element={<NestedQuotesView context="submissions" />}
          />
          <Route
            path="submissions/:id/quotes"
            element={<NestedQuotesView context="submissions" />}
          />
          <Route
            path="submissions/documents"
            element={<NestedDocumentsView context="submissions" />}
          />
          <Route
            path="submissions/:id/documents"
            element={<NestedDocumentsView context="submissions" />}
          />
          <Route
            path="submissions/forms"
            element={<NestedFormsView context="submissions" />}
          />
          <Route
            path="submissions/:id/forms"
            element={<NestedFormsView context="submissions" />}
          />

          {/* =================================================================
              TIER 3 NESTED ROUTES: POLICIES
              Handles both parameterized (:id) and collection-level drill-downs:
              - policies/:id/quotes  &  policies/quotes
              - policies/:id/documents  &  policies/documents
              - policies/:id/forms  &  policies/forms
             ================================================================= */}
          <Route
            path="policies/quotes"
            element={<NestedQuotesView context="policies" />}
          />
          <Route
            path="policies/:id/quotes"
            element={<NestedQuotesView context="policies" />}
          />
          <Route
            path="policies/documents"
            element={<NestedDocumentsView context="policies" />}
          />
          <Route
            path="policies/:id/documents"
            element={<NestedDocumentsView context="policies" />}
          />
          <Route
            path="policies/forms"
            element={<NestedFormsView context="policies" />}
          />
          <Route
            path="policies/:id/forms"
            element={<NestedFormsView context="policies" />}
          />
        </CustomRoutes>

        {/* ===================================================================
            CORE RESOURCE REGISTRATIONS
            CustomMenu handles all navigation rendering, preventing menu clutter
            while granting full CRUD routing capabilities.
           =================================================================== */}
        <Resource
          name="policies"
          list={PolicyList}
          show={PolicyShow}
        />
        <Resource
          name="submissions"
          list={SubmissionList}
          show={SubmissionShow}
          create={SubmissionCreate}
        />
        <Resource
          name="quotes"
          list={QuoteList}
          show={QuoteShow}
        />
        <Resource
          name="documents"
          list={DocumentList}
          show={DocumentShow}
        />
        <Resource
          name="forms"
          list={FormList}
          show={FormShow}
        />
        <Resource
          name="dec-page-templates"
          list={DecPageTemplateList}
          show={DecPageTemplateShow}
          create={DecPageTemplateCreate}
          options={{ label: 'Dec Page Templates' }}
        />
        <Resource
          name="claims"
          list={ClaimList}
          show={ClaimShow}
        />
        <Resource
          name="parties"
          list={PartyList}
          show={PartyShow}
          create={PartyCreate}
        />
        <Resource
          name="tenants"
          list={TenantList}
        />
      </Admin>
  );
}
