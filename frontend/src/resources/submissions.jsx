import React from 'react';
import {
  AutocompleteInput,
  Button,
  Create,
  CreateButton,
  Datagrid,
  ExportButton,
  List,
  ReferenceField,
  ReferenceInput,
  SearchInput,
  Show,
  SimpleForm,
  SimpleShowLayout,
  TextField,
  TopToolbar,
  required,
  useRedirect
} from 'react-admin';
import AddBusinessIcon from '@mui/icons-material/AddBusiness';
import SearchIcon from '@mui/icons-material/Search';
import { Box, Typography } from '@mui/material';

const submissionFilters = [
  <SearchInput
    key="q"
    source="q"
    alwaysOn
    placeholder="Filter by Submission # or Organization..."
  />
];

function SubmissionListActions() {
  const redirect = useRedirect();
  return (
    <TopToolbar>
      <Button
        label="Search Orgs"
        onClick={() => redirect('list', 'parties')}
        startIcon={<SearchIcon />}
      />
      <Button
        label="New Org"
        onClick={() => redirect('create', 'parties')}
        startIcon={<AddBusinessIcon />}
      />
      <CreateButton label="New Submission" />
      <ExportButton />
    </TopToolbar>
  );
}

export function SubmissionList() {
  return (
    <List
      title="Submissions Dashboard (UW_SUBMSN)"
      filters={submissionFilters}
      actions={<SubmissionListActions />}
      sort={{ field: 'submsnNbr', order: 'DESC' }}
      perPage={25}
    >
      <Datagrid rowClick="show" bulkActionButtons={false}>
        <TextField
          source="submsnNbr"
          label="Submission Number"
          sx={{ fontWeight: 700 }}
        />
        <TextField source="orgName" label="Organization Name" />
      </Datagrid>
    </List>
  );
}

export function SubmissionCreate() {
  const redirect = useRedirect();

  return (
    <Create title="Create New Submission" redirect="list">
      <SimpleForm>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
          Select Insured Organization from <code>dbo.PT_PARTY</code>
        </Typography>
        <ReferenceInput source="partyId" reference="parties" perPage={100}>
          <AutocompleteInput
            label="Organization (PT_PARTY)"
            optionText="name"
            filterToQuery={(searchText) => ({ q: searchText })}
            validate={required()}
            fullWidth
          />
        </ReferenceInput>
        <Box sx={{ mt: 1 }}>
          <Button
            label="Organization not listed? Add New Organization"
            onClick={() => redirect('create', 'parties')}
            startIcon={<AddBusinessIcon />}
          />
        </Box>
      </SimpleForm>
    </Create>
  );
}

export function SubmissionShow() {
  return (
    <Show title="Submission Details">
      <SimpleShowLayout>
        <TextField source="submsnNbr" label="Submission Number (SUBMSN_NBR)" />
        <TextField source="orgName" label="Organization Name (ORG_NM)" />
        <ReferenceField
          source="insuredPid"
          reference="parties"
          label="Linked Organization"
          link="show"
        >
          <TextField source="name" />
        </ReferenceField>
      </SimpleShowLayout>
    </Show>
  );
}
