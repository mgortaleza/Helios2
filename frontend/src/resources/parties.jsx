import React, { useState, useEffect } from 'react';
import {
  Button,
  Create,
  CreateButton,
  Datagrid,
  ExportButton,
  List,
  ReferenceManyField,
  SaveButton,
  SearchInput,
  Show,
  SimpleForm,
  SimpleShowLayout,
  TextField,
  TextInput,
  Toolbar,
  TopToolbar,
  required,
  maxLength,
  useCreate,
  useListContext,
  useNotify,
  useRecordContext,
  useRedirect
} from 'react-admin';
import { Box, Button as MuiButton } from '@mui/material';
import PostAddIcon from '@mui/icons-material/PostAdd';

const partyFilters = [
  <SearchInput
    key="q"
    source="q"
    alwaysOn
    placeholder="Enter organization name..."
  />
];

function CreateSubmissionForRecordButton() {
  const record = useRecordContext();
  const [create, { isPending }] = useCreate();
  const notify = useNotify();
  const redirect = useRedirect();

  if (!record) return null;

  const handleClick = (e) => {
    e.stopPropagation();
    create(
      'submissions',
      { data: { partyId: record.id } },
      {
        onSuccess: (created) => {
          notify(
            `Submission Created! Number: ${created.submsnNbr} for ${created.orgName}`,
            { type: 'success' }
          );
          redirect('list', 'submissions');
        },
        onError: (err) => {
          notify(`Database Error: ${err.message}`, { type: 'error' });
        }
      }
    );
  };

  return (
    <Button
      label="Create Submission"
      onClick={handleClick}
      disabled={isPending}
      variant="contained"
      color="success"
      size="small"
      startIcon={<PostAddIcon />}
    />
  );
}

function PartyListActions({ selectedParty, onCreateSubmission, isCreating }) {
  return (
    <TopToolbar>
      <Button
        label={
          selectedParty
            ? `Create Submission (${selectedParty.name})`
            : 'Create Submission'
        }
        onClick={onCreateSubmission}
        disabled={!selectedParty || isCreating}
        variant="contained"
        color="success"
        startIcon={<PostAddIcon />}
      />
      <CreateButton label="Add Organization" />
      <ExportButton />
    </TopToolbar>
  );
}

function PartyListContent({ selectedPartyId, setSelectedPartyId, onCreateSubmission, isCreating }) {
  const { data } = useListContext();

  useEffect(() => {
    if (Array.isArray(data) && data.length > 0) {
      const stillExists = data.some((item) => item.id === selectedPartyId);
      if (!stillExists) {
        setSelectedPartyId(data[0].id);
      }
    } else {
      setSelectedPartyId(null);
    }
  }, [data, selectedPartyId, setSelectedPartyId]);

  const selectedParty = Array.isArray(data)
    ? data.find((item) => item.id === selectedPartyId) || null
    : null;

  return (
    <>
      <Datagrid
        bulkActionButtons={false}
        rowClick={(id) => {
          setSelectedPartyId(id);
          return false;
        }}
        rowSx={(record) =>
          record.id === selectedPartyId
            ? {
                backgroundColor: 'rgba(25, 118, 210, 0.14)',
                '&:hover': {
                  backgroundColor: 'rgba(25, 118, 210, 0.20) !important'
                },
                '& td:first-of-type': {
                  borderLeft: '4px solid #1976d2'
                }
              }
            : {
                cursor: 'pointer'
              }
        }
      >
        <TextField
          source="name"
          label="Organization Name"
          sx={{ fontWeight: 600 }}
        />
      </Datagrid>

      {Array.isArray(data) && data.length > 0 && (
        <Box sx={{ p: 2, borderTop: '1px solid #e2e8f0' }}>
          <MuiButton
            variant="contained"
            color="success"
            fullWidth
            size="large"
            startIcon={<PostAddIcon />}
            disabled={!selectedParty || isCreating}
            onClick={onCreateSubmission}
            sx={{ fontWeight: 600 }}
          >
            {selectedParty
              ? `Create Submission for Selected Organization (${selectedParty.name})`
              : 'Create Submission for Selected Organization'}
          </MuiButton>
        </Box>
      )}
    </>
  );
}

export function PartyList() {
  const [selectedPartyId, setSelectedPartyId] = useState(null);
  const [create, { isPending }] = useCreate();
  const notify = useNotify();
  const redirect = useRedirect();

  const handleCreateSubmission = () => {
    if (!selectedPartyId) {
      notify('Please select an organization first.', { type: 'warning' });
      return;
    }
    create(
      'submissions',
      { data: { partyId: selectedPartyId } },
      {
        onSuccess: (created) => {
          notify(
            `Submission Created! Number: ${created.submsnNbr} for ${created.orgName}`,
            { type: 'success' }
          );
          redirect('list', 'submissions');
        },
        onError: (err) => {
          notify(`Database Error: ${err.message}`, { type: 'error' });
        }
      }
    );
  };

  return (
    <List
      title="Search Organizations (PT_PARTY)"
      filters={partyFilters}
      actions={
        <PartyListToolbarWrapper
          selectedPartyId={selectedPartyId}
          onCreateSubmission={handleCreateSubmission}
          isCreating={isPending}
        />
      }
      sort={{ field: 'name', order: 'ASC' }}
      perPage={25}
    >
      <PartyListContent
        selectedPartyId={selectedPartyId}
        setSelectedPartyId={setSelectedPartyId}
        onCreateSubmission={handleCreateSubmission}
        isCreating={isPending}
      />
    </List>
  );
}

function PartyListToolbarWrapper({ selectedPartyId, onCreateSubmission, isCreating }) {
  const { data } = useListContext();
  const selectedParty = Array.isArray(data)
    ? data.find((item) => item.id === selectedPartyId) || null
    : null;

  return (
    <PartyListActions
      selectedParty={selectedParty}
      onCreateSubmission={onCreateSubmission}
      isCreating={isCreating}
    />
  );
}

function PartyCreateToolbar() {
  const [createSubmission] = useCreate();
  const notify = useNotify();
  const redirect = useRedirect();

  return (
    <Toolbar sx={{ display: 'flex', gap: 2 }}>
      <SaveButton label="Save to Database" />
      <SaveButton
        label="Save & Create Submission"
        icon={<PostAddIcon />}
        color="success"
        type="button"
        mutationOptions={{
          onSuccess: (createdParty) => {
            createSubmission(
              'submissions',
              { data: { partyId: createdParty.id } },
              {
                onSuccess: (createdSub) => {
                  notify(
                    `Saved ${createdParty.name} & Created Submission #${createdSub.submsnNbr}!`,
                    { type: 'success' }
                  );
                  redirect('list', 'submissions');
                },
                onError: (err) => {
                  notify(`Saved org, but failed to create submission: ${err.message}`, {
                    type: 'warning'
                  });
                  redirect('show', 'parties', createdParty.id);
                }
              }
            );
          }
        }}
      />
    </Toolbar>
  );
}

export function PartyCreate() {
  return (
    <Create title="Add New Organization (PT_PARTY)" redirect="list">
      <SimpleForm toolbar={<PartyCreateToolbar />}>
        <TextInput
          source="orgName"
          label="Organization Name"
          placeholder="e.g. Acme Corp"
          validate={[required(), maxLength(100)]}
          fullWidth
        />
      </SimpleForm>
    </Create>
  );
}

function PartyShowActions() {
  return (
    <TopToolbar>
      <CreateSubmissionForRecordButton />
    </TopToolbar>
  );
}

export function PartyShow() {
  return (
    <Show title="Organization Details" actions={<PartyShowActions />}>
      <SimpleShowLayout>
        <TextField source="name" label="Organization Name (ORG_NM)" />
        <ReferenceManyField
          label="Submissions for this Organization (UW_SUBMSN)"
          reference="submissions"
          target="insuredPid"
        >
          <Datagrid rowClick="show" bulkActionButtons={false}>
            <TextField
              source="submsnNbr"
              label="Submission Number"
              sx={{ fontWeight: 700 }}
            />
            <TextField source="orgName" label="Organization Name" />
          </Datagrid>
        </ReferenceManyField>
      </SimpleShowLayout>
    </Show>
  );
}
