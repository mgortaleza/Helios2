import React from 'react';
import {
  Button,
  Create,
  CreateButton,
  Datagrid,
  Edit,
  ExportButton,
  FunctionField,
  List,
  NumberField,
  NumberInput,
  SimpleForm,
  TextField,
  TextInput,
  TopToolbar,
  required,
  useNotify,
  useRecordContext,
  useRefresh
} from 'react-admin';
import { Chip } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import { useTenant } from '../tenantContext.jsx';

function SwitchTenantButton() {
  const record = useRecordContext();
  const { activeTenantId, setActiveTenantId } = useTenant();
  const refresh = useRefresh();
  const notify = useNotify();

  if (!record) return null;

  const isActive = Number(record.tenantId) === Number(activeTenantId);

  if (isActive) {
    return (
      <Chip
        icon={<CheckCircleIcon />}
        label="Active Tenant"
        color="success"
        size="small"
        sx={{ fontWeight: 600 }}
      />
    );
  }

  return (
    <Button
      label="Use Tenant"
      size="small"
      variant="outlined"
      startIcon={<SwapHorizIcon />}
      onClick={(e) => {
        e.stopPropagation();
        setActiveTenantId(record.tenantId);
        notify(`Switched active tenant to #${record.tenantId} (${record.tenantName})`, {
          type: 'info'
        });
        refresh();
      }}
    />
  );
}

function TenantListActions() {
  return (
    <TopToolbar>
      <CreateButton label="Register Tenant" />
      <ExportButton />
    </TopToolbar>
  );
}

export function TenantList() {
  return (
    <List
      title="Tenant Registry (MSTR_DATA.dbo.TENANT_DB_CONFIG)"
      actions={<TenantListActions />}
      sort={{ field: 'tenantId', order: 'ASC' }}
      perPage={25}
    >
      <Datagrid rowClick="edit" bulkActionButtons={false}>
        <NumberField source="tenantId" label="TENANT_ID" />
        <TextField
          source="tenantName"
          label="TENANT_NAME"
          sx={{ fontWeight: 700 }}
        />
        <TextField
          source="dbServerName"
          label="DB_SERVER_NM"
          sx={{ fontFamily: 'monospace' }}
        />
        <TextField
          source="dbCatalogName"
          label="DB_CATALOG_NM"
          sx={{ fontFamily: 'monospace', fontWeight: 600 }}
        />
        <FunctionField
          label="Active Session"
          render={() => <SwitchTenantButton />}
        />
      </Datagrid>
    </List>
  );
}

export function TenantCreate() {
  const { reloadTenants } = useTenant();

  return (
    <Create
      title="Register / Update Tenant in MSTR_DATA"
      redirect="list"
      mutationOptions={{
        onSuccess: () => {
          reloadTenants();
        }
      }}
    >
      <SimpleForm>
        <NumberInput
          source="tenantId"
          label="Tenant ID (TENANT_ID)"
          validate={required()}
          fullWidth
        />
        <TextInput
          source="tenantName"
          label="Tenant Name (TENANT_NAME)"
          placeholder="e.g. Helios2 Test Environment"
          validate={required()}
          fullWidth
        />
        <TextInput
          source="dbServerName"
          label="SQL Server Host (DB_SERVER_NM)"
          defaultValue="dbtst.ad.ortaleza.com"
          validate={required()}
          fullWidth
        />
        <TextInput
          source="dbCatalogName"
          label="Database Catalog (DB_CATALOG_NM)"
          placeholder="e.g. HELIOS2_TST"
          validate={required()}
          fullWidth
        />
      </SimpleForm>
    </Create>
  );
}

export function TenantEdit() {
  const { reloadTenants } = useTenant();

  return (
    <Edit
      title="Edit Tenant Configuration (MSTR_DATA)"
      redirect="list"
      mutationMode="pessimistic"
      mutationOptions={{
        onSuccess: () => {
          reloadTenants();
        }
      }}
    >
      <SimpleForm>
        <NumberInput
          source="tenantId"
          label="Tenant ID (TENANT_ID)"
          disabled
          fullWidth
        />
        <TextInput
          source="tenantName"
          label="Tenant Name (TENANT_NAME)"
          validate={required()}
          fullWidth
        />
        <TextInput
          source="dbServerName"
          label="SQL Server Host (DB_SERVER_NM)"
          validate={required()}
          fullWidth
        />
        <TextInput
          source="dbCatalogName"
          label="Database Catalog (DB_CATALOG_NM)"
          validate={required()}
          fullWidth
        />
      </SimpleForm>
    </Edit>
  );
}

