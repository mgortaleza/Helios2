import React from 'react';
import { Admin, CustomRoutes, Resource, radiantLightTheme } from 'react-admin';
import { Route } from 'react-router-dom';
import AssignmentIcon from '@mui/icons-material/Assignment';
import BusinessIcon from '@mui/icons-material/Business';
import DnsIcon from '@mui/icons-material/Dns';

import { TenantProvider } from './tenantContext.jsx';
import { dataProvider } from './dataProvider.js';
import { HeliosLayout } from './layout/HeliosLayout.jsx';
import {
  SubmissionList,
  SubmissionCreate,
  SubmissionShow
} from './resources/submissions.jsx';
import {
  PartyList,
  PartyCreate,
  PartyShow
} from './resources/parties.jsx';
import {
  TenantList,
  TenantCreate,
  TenantEdit
} from './resources/tenants.jsx';
import { DiagnosticsPage } from './pages/DiagnosticsPage.jsx';

export default function App() {
  return (
    <TenantProvider>
      <Admin
        title="Helios2"
        dataProvider={dataProvider}
        layout={HeliosLayout}
        theme={radiantLightTheme}
      >
        <Resource
          name="submissions"
          options={{ label: 'Submissions' }}
          icon={AssignmentIcon}
          list={SubmissionList}
          create={SubmissionCreate}
          show={SubmissionShow}
          recordRepresentation={(record) =>
            `Submission #${record.submsnNbr} (${record.orgName})`
          }
        />

        <Resource
          name="parties"
          options={{ label: 'Organizations' }}
          icon={BusinessIcon}
          list={PartyList}
          create={PartyCreate}
          show={PartyShow}
          recordRepresentation={(record) => record.name}
        />

        <Resource
          name="tenants"
          options={{ label: 'MSTR_DATA Tenants' }}
          icon={DnsIcon}
          list={TenantList}
          create={TenantCreate}
          edit={TenantEdit}
          recordRepresentation={(record) =>
            `#${record.tenantId} - ${record.tenantName} [${record.dbCatalogName}]`
          }
        />

        <CustomRoutes>
          <Route path="/diagnostics" element={<DiagnosticsPage />} />
        </CustomRoutes>
      </Admin>
    </TenantProvider>
  );
}
