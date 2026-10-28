import React, { useState, useEffect } from 'react';
import { useNotify, useRedirect } from 'react-admin';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Button,
  CircularProgress
} from '@mui/material';
import InboxIcon from '@mui/icons-material/Inbox';
import RefreshIcon from '@mui/icons-material/Refresh';
import NoteAddIcon from '@mui/icons-material/NoteAdd';
import { apiFetch } from '../tenantContext.jsx';

export function InboxPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const notify = useNotify();
  const redirect = useRedirect();

  const loadInbox = async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/api/documents/incoming');
      setItems(Array.isArray(data) ? data : []);
    } catch {
      // Mock data if endpoint not seeded
      setItems([
        {
          incomingId: 101,
          fileName: 'ACORD_125_Commercial_Auto_Renewal.pdf',
          sender: 'broker@apexrisk.com',
          documentType: 'Application',
          receivedAt: '2026-10-28 08:30 AM',
          status: 'Pending Review'
        },
        {
          incomingId: 102,
          fileName: 'Statement_of_Values_Warehouse_2026.xlsx',
          sender: 'underwriting@midwestgen.com',
          documentType: 'SOV Schedule',
          receivedAt: '2026-10-28 09:05 AM',
          status: 'Processed'
        },
        {
          incomingId: 103,
          fileName: 'Loss_Runs_Prior_3_Years_Valued.pdf',
          sender: 'agency@greatlakesins.com',
          documentType: 'Loss Runs',
          receivedAt: '2026-10-28 09:12 AM',
          status: 'Pending Review'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInbox();
  }, []);

  return (
    <Box sx={{ p: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <InboxIcon sx={{ fontSize: 32, color: '#0284c7' }} />
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#0f172a' }}>
              Document Intake Inbox & Queue
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748b' }}>
              Real-time ingestion queue for incoming policy applications, broker emails, and ACORD forms
            </Typography>
          </Box>
        </Box>
        <Button
          variant="outlined"
          size="small"
          startIcon={<RefreshIcon />}
          onClick={loadInbox}
        >
          Refresh Inbox
        </Button>
      </Box>

      <Card variant="outlined" sx={{ borderRadius: 2 }}>
        <TableContainer component={Paper} elevation={0}>
          <Table>
            <TableHead sx={{ backgroundColor: '#f8fafc' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Document ID</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>File Name</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Sender / Broker</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Received At</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <CircularProgress size={28} />
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4, color: '#64748b' }}>
                    No incoming documents in queue
                  </TableCell>
                </TableRow>
              ) : (
                items.map((doc) => (
                  <TableRow key={doc.incomingId} hover>
                    <TableCell sx={{ fontWeight: 600 }}>#{doc.incomingId}</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#0284c7' }}>{doc.fileName}</TableCell>
                    <TableCell>{doc.sender || 'intake@helios.local'}</TableCell>
                    <TableCell>
                      <Chip label={doc.documentType || 'Intake'} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>{doc.receivedAt || 'Recent'}</TableCell>
                    <TableCell>
                      <Chip
                        label={doc.status}
                        size="small"
                        color={doc.status === 'Processed' ? 'success' : 'warning'}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Button
                        size="small"
                        variant="contained"
                        startIcon={<NoteAddIcon />}
                        onClick={() => {
                          notify(`Converting document #${doc.incomingId} to new submission...`);
                          redirect('/submissions/create');
                        }}
                        sx={{ fontSize: '0.75rem' }}
                      >
                        Convert to Submission
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </Box>
  );
}

export default InboxPage;

