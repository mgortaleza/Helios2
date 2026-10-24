import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactFlow, {
  addEdge,
  Background,
  Controls,
  MiniMap,
  applyNodeChanges,
  applyEdgeChanges,
  Handle,
  Position,
  Panel
} from 'reactflow';
import 'reactflow/dist/style.css';

import {
  Box,
  Drawer,
  Typography,
  Button,
  IconButton,
  Chip,
  Divider,
  TextField,
  Paper,
  Tooltip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Card,
  CardContent,
  CardActions
} from '@mui/material';

import {
  Play,
  Save,
  CheckCircle2,
  AlertTriangle,
  Layers,
  GitFork,
  Sliders,
  RefreshCw,
  Trash2,
  HelpCircle,
  Table as TableIcon,
  ShieldAlert,
  Zap,
  Activity,
  Check,
  Code2,
  ArrowLeft,
  Plus,
  FolderOpen,
  Tag,
  Settings2,
  ExternalLink,
  ShieldCheck,
  Calculator,
  X
} from 'lucide-react';

// ============================================================================
// 1. CUSTOM REACT FLOW NODE RENDERERS
// ============================================================================

const BaseNodeContainer = ({ title, subtitle, icon: Icon, color, selected, children }) => (
  <Paper
    elevation={selected ? 8 : 2}
    sx={{
      minWidth: 240,
      maxWidth: 280,
      borderRadius: '8px',
      border: `2px solid ${selected ? '#0284c7' : color}`,
      backgroundColor: '#ffffff',
      overflow: 'hidden',
      transition: 'box-shadow 0.15s ease'
    }}
  >
    <Box
      sx={{
        backgroundColor: color,
        color: '#ffffff',
        px: 1.5,
        py: 0.8,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Icon size={16} />
        <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.82rem' }}>
          {title}
        </Typography>
      </Box>
    </Box>
    <Box sx={{ p: 1.25 }}>
      {subtitle && (
        <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mb: 0.75, fontSize: '0.74rem', fontWeight: 600 }}>
          {subtitle}
        </Typography>
      )}
      {children}
    </Box>
  </Paper>
);

const RulesetNode = ({ data, selected }) => (
  <BaseNodeContainer title={data.label || 'Ruleset Calculation'} subtitle="MVEL SCRIPT EXECUTION" icon={Code2} color="#0284c7" selected={selected}>
    <Handle type="target" position={Position.Top} style={{ background: '#0284c7', width: 10, height: 10 }} />
    <Box sx={{ backgroundColor: '#f8fafc', p: 1, borderRadius: '4px', border: '1px solid #e2e8f0', fontSize: '0.7rem', fontFamily: 'monospace', color: '#334155', maxHeight: 60, overflow: 'hidden' }}>
      {data.payloadScript || '// MVEL Script Logic...'}
    </Box>
    <Handle type="source" position={Position.Bottom} style={{ background: '#0284c7', width: 10, height: 10 }} />
  </BaseNodeContainer>
);

const ConditionalSwitchNode = ({ data, selected }) => (
  <BaseNodeContainer title={data.label || 'Conditional Switch'} subtitle="DECISION ROUTER" icon={GitFork} color="#d97706" selected={selected}>
    <Handle type="target" position={Position.Top} style={{ background: '#d97706', width: 10, height: 10 }} />
    <Typography variant="caption" sx={{ fontSize: '0.72rem', color: '#475569', display: 'block' }}>
      Branches on dynamic fact predicates.
    </Typography>
    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1, px: 1 }}>
      <Chip label="True" size="small" sx={{ height: 20, fontSize: '0.65rem', bgcolor: '#dcfce7', color: '#15803d', fontWeight: 700 }} />
      <Chip label="False" size="small" sx={{ height: 20, fontSize: '0.65rem', bgcolor: '#fee2e2', color: '#dc2626', fontWeight: 700 }} />
    </Box>
    <Handle type="source" position={Position.Bottom} id="true" style={{ left: '30%', background: '#16a34a', width: 10, height: 10 }} />
    <Handle type="source" position={Position.Bottom} id="false" style={{ left: '70%', background: '#dc2626', width: 10, height: 10 }} />
  </BaseNodeContainer>
);

const DecisionTableNode = ({ data, selected }) => (
  <BaseNodeContainer title={data.label || 'Decision Table'} subtitle="COORDINATE MATRIX" icon={TableIcon} color="#7c3aed" selected={selected}>
    <Handle type="target" position={Position.Top} style={{ background: '#7c3aed', width: 10, height: 10 }} />
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
      <Chip label={`Policy: ${data.hitPolicy || 'FIRST_HIT'}`} size="small" sx={{ height: 20, fontSize: '0.68rem', bgcolor: '#ede9fe', color: '#6d28d9', fontWeight: 600 }} />
      <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.7rem' }}>
        {data.rowCount || 4} Rule Rows
      </Typography>
    </Box>
    <Button
      fullWidth
      variant="outlined"
      size="small"
      startIcon={<TableIcon size={14} />}
      onClick={(e) => {
        e.stopPropagation();
        if (data.onOpenMatrix) data.onOpenMatrix();
      }}
      sx={{ mt: 0.5, fontSize: '0.72rem', py: 0.3, borderColor: '#7c3aed', color: '#7c3aed' }}
    >
      Open 2D Matrix
    </Button>
    <Handle type="source" position={Position.Bottom} style={{ background: '#7c3aed', width: 10, height: 10 }} />
  </BaseNodeContainer>
);

const UiAdjustmentNode = ({ data, selected }) => (
  <BaseNodeContainer title={data.label || 'UI Adjustment'} subtitle="DISCRETIONARY MODIFIER" icon={Sliders} color="#0d9488" selected={selected}>
    <Handle type="target" position={Position.Top} style={{ background: '#0d9488', width: 10, height: 10 }} />
    <Typography variant="caption" sx={{ fontSize: '0.72rem', color: '#475569', display: 'block' }}>
      Underwriter Schedule Credit / Debit clamp.
    </Typography>
    <Box sx={{ mt: 0.5, p: 0.5, bgcolor: '#f0fdfa', borderRadius: '4px', textAlign: 'center', fontSize: '0.75rem', fontWeight: 700, color: '#0f766e' }}>
      Range: [-25% .. +25%]
    </Box>
    <Handle type="source" position={Position.Bottom} style={{ background: '#0d9488', width: 10, height: 10 }} />
  </BaseNodeContainer>
);

const nodeTypes = {
  ruleset: RulesetNode,
  conditional_switch: ConditionalSwitchNode,
  decision_table: DecisionTableNode,
  ui_adjustment: UiAdjustmentNode
};

// Available Products & Rating Plans for Linking
const AVAILABLE_PRODUCTS = [
  { code: 'TECH_EO', name: 'Technology Errors & Omissions' },
  { code: 'COMMERCIAL_AUTO', name: 'Commercial Auto & Fleet' },
  { code: 'MED_MAL', name: 'Medical Malpractice Professional Liability' },
  { code: 'DNO', name: 'Directors & Officers Liability' },
  { code: 'GENERAL_LIABILITY', name: 'Commercial General Liability' },
  { code: 'COMMERCIAL_PROPERTY', name: 'Commercial Property & Inland Marine' }
];

const AVAILABLE_PLANS = [
  { code: 'TECH_EO_COMMERCIAL', name: 'Standard Commercial Tech E&O Plan' },
  { code: 'AUTO_FLEET', name: 'Commercial Fleet & Driver Schedule Plan' },
  { code: 'MED_MAL_PRIMARY', name: 'Primary Physician & Clinic Plan' },
  { code: 'DNO_PRIVATE', name: 'Private Enterprise D&O Plan' },
  { code: 'GL_OCCURRENCE', name: 'Commercial GL Occurrence Plan' }
];

// ============================================================================
// 2. MAIN RULEFLOW STUDIO COMPONENT
// ============================================================================

export default function RuleFlowStudio({ apiFetch, selectedTenantId }) {
  const reactFlowWrapper = useRef(null);

  const [flows, setFlows] = useState([]);
  const [selectedFlowId, setSelectedFlowId] = useState(null); // null means Show Catalog
  const [flowData, setFlowData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editHeaderModalOpen, setEditHeaderModalOpen] = useState(false);
  const [simulationOpen, setSimulationOpen] = useState(false);
  const [matrixModalOpen, setMatrixModalOpen] = useState(false);
  const [activeMatrixData, setActiveMatrixData] = useState(null);

  // Forms
  const [newFlowForm, setNewFlowForm] = useState({
    flowCode: '',
    flowName: '',
    description: '',
    productCode: 'TECH_EO',
    planCode: 'TECH_EO_COMMERCIAL',
    templateType: 'RATING_DECISION_TABLE'
  });

  const [editHeaderForm, setEditHeaderForm] = useState({
    flowName: '',
    description: '',
    productCode: '',
    planCode: '',
    status: 'ACTIVE'
  });

  // Validation & Execution State
  const [validationResult, setValidationResult] = useState(null);
  const [isValidating, setIsValidating] = useState(false);
  const [simulationFacts, setSimulationFacts] = useState(
    JSON.stringify(
      {
        exposureValue: 5000000,
        priorLossesCount: 0,
        occurrenceLimit: 2000000,
        fleetSize: 12,
        stateCode: "CA",
        basePremium: 1000.00
      },
      null,
      2
    )
  );
  const [simulationResult, setSimulationResult] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [alert, setAlert] = useState(null);

  // 1. Load Flows Inventory
  const loadFlowList = useCallback(async () => {
    try {
      const data = await apiFetch(`/api/brms/flows?tenantId=${selectedTenantId || 1}`);
      setFlows(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load ruleflows:', err);
    }
  }, [apiFetch, selectedTenantId]);

  useEffect(() => {
    loadFlowList();
  }, [loadFlowList]);

  // 2. Load Selected Flow Full Graph onto Canvas
  const loadFlowDetails = useCallback(async (id) => {
    setIsLoading(true);
    setValidationResult(null);
    setSimulationResult(null);
    try {
      const data = await apiFetch(`/api/brms/flows/${id}`);
      setFlowData(data);
      setSelectedFlowId(id);

      // Hydrate Canvas Nodes & Edges
      if (data.layoutJson && data.layoutJson.trim().length > 10) {
        try {
          const parsed = JSON.parse(data.layoutJson);
          if (parsed.nodes && parsed.edges) {
            const rehydratedNodes = parsed.nodes.map(n => ({
              ...n,
              data: {
                ...n.data,
                onOpenMatrix: () => {
                  const dt = (data.decisionTables || []).find(t => t.nodeId === n.data?.dbNodeId) || (data.decisionTables || [])[0];
                  setActiveMatrixData(dt);
                  setMatrixModalOpen(true);
                }
              }
            }));
            setNodes(rehydratedNodes);
            setEdges(parsed.edges);
            return;
          }
        } catch (e) {
          console.warn('Failed parsing saved layout JSON, falling back to layout synthesis');
        }
      }

      // Synthesize clean default positions if no custom layout exists
      const defaultPositions = {
        'node-1': { x: 80, y: 150 },
        'node-2': { x: 380, y: 150 },
        'node-3': { x: 740, y: 150 },
        'node-4': { x: 1100, y: 80 },
        'node-5': { x: 1100, y: 280 }
      };

      const canvasNodes = (data.nodes || []).map((n, idx) => {
        const clientKey = n.clientNodeKey || `node-${n.nodeId}`;
        const pos = defaultPositions[clientKey] || { x: 100 + idx * 300, y: 180 };

        return {
          id: clientKey,
          type: n.nodeType.toLowerCase(),
          position: pos,
          data: {
            dbNodeId: n.nodeId,
            label: n.nodeName,
            payloadScript: n.payloadScript,
            isEntry: n.isEntryNode,
            isTerminal: n.isTerminalNode,
            hitPolicy: n.nodeType === 'DECISION_TABLE' ? 'FIRST_HIT' : undefined,
            rowCount: 4,
            onOpenMatrix: () => {
              const dt = (data.decisionTables || []).find(t => t.nodeId === n.nodeId) || (data.decisionTables || [])[0];
              setActiveMatrixData(dt);
              setMatrixModalOpen(true);
            }
          }
        };
      });

      const canvasEdges = (data.edges || []).map((e) => ({
        id: e.clientEdgeKey || `edge-${e.edgeId}`,
        source: e.sourceClientKey,
        target: e.targetClientKey,
        sourceHandle: e.sourceHandle || undefined,
        label: e.routingCondition ? e.routingCondition : e.isDefaultBranch ? 'Default' : undefined,
        animated: true,
        style: { stroke: e.sourceHandle === 'true' ? '#16a34a' : e.sourceHandle === 'false' ? '#dc2626' : '#64748b', strokeWidth: 2 }
      }));

      setNodes(canvasNodes);
      setEdges(canvasEdges);
    } catch (err) {
      setAlert({ type: 'error', message: `Failed to load RuleFlow #${id}: ${err.message}` });
    } finally {
      setIsLoading(false);
    }
  }, [apiFetch]);

  // Handle Close Flow (Return to Catalog)
  const handleCloseFlow = () => {
    setSelectedFlowId(null);
    setFlowData(null);
    setSelectedNode(null);
    setValidationResult(null);
    loadFlowList();
  };

  // 3. React Flow Canvas Event Handlers
  const onNodesChange = useCallback((changes) => setNodes((nds) => applyNodeChanges(changes, nds)), []);
  const onEdgesChange = useCallback((changes) => setEdges((eds) => applyEdgeChanges(changes, eds)), []);
  const onConnect = useCallback((connection) => setEdges((eds) => addEdge({ ...connection, animated: true }, eds)), []);

  const onNodeClick = useCallback((event, node) => {
    setSelectedNode(node);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  // 4. Save Canvas Layout Coordinates & State
  const handleSaveLayout = async () => {
    if (!selectedFlowId) return;
    try {
      const layoutPayload = {
        layoutJson: JSON.stringify({ nodes, edges }),
        zoom: 1.0,
        x: 0.0,
        y: 0.0
      };

      await apiFetch(`/api/brms/flows/${selectedFlowId}/layout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(layoutPayload)
      });

      setAlert({ type: 'success', message: `Visual canvas state successfully saved to MSTR_DATA for Flow #${selectedFlowId}.` });
    } catch (err) {
      setAlert({ type: 'error', message: `Failed to save visual layout: ${err.message}` });
    }
  };

  // 5. Kahn's Topological Cycle Detection
  const handleValidateTopology = async () => {
    if (!selectedFlowId) return;
    setIsValidating(true);
    setValidationResult(null);

    try {
      const nodeDefs = nodes.map((n) => ({
        nodeId: n.id,
        nodeName: n.data?.label || n.id,
        isEntry: n.data?.isEntry || false,
        isTerminal: n.data?.isTerminal || false
      }));

      const edgeDefs = edges.map((e) => ({
        edgeId: e.id,
        sourceNodeId: e.source,
        targetNodeId: e.target,
        condition: e.label || ''
      }));

      const res = await apiFetch(`/api/brms/flows/${selectedFlowId}/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodes: nodeDefs, edges: edgeDefs })
      });

      setValidationResult(res);
    } catch (err) {
      setAlert({ type: 'error', message: `Topology validation error: ${err.message}` });
    } finally {
      setIsValidating(false);
    }
  };

  // 6. Test Simulation Execution
  const handleRunSimulation = async () => {
    if (!selectedFlowId) return;
    setIsSimulating(true);
    try {
      let facts = {};
      try {
        facts = JSON.parse(simulationFacts);
      } catch (e) {
        throw new Error('Invalid JSON facts format: ' + e.message);
      }

      const res = await apiFetch(`/api/brms/flows/${selectedFlowId}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputFacts: facts })
      });
      setSimulationResult(res);
    } catch (err) {
      setAlert({ type: 'error', message: `Execution failed: ${err.message}` });
    } finally {
      setIsSimulating(false);
    }
  };

  // 7. Create New Rule Flow
  const handleCreateNewFlow = async () => {
    if (!newFlowForm.flowCode || !newFlowForm.flowName) {
      setAlert({ type: 'warning', message: 'Flow Code and Flow Name are required.' });
      return;
    }

    try {
      const created = await apiFetch('/api/brms/flows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newFlowForm,
          tenantId: selectedTenantId || 1
        })
      });

      setCreateModalOpen(false);
      setAlert({ type: 'success', message: `Created RuleFlow ${created.flowCode} (ID: ${created.flowId}) successfully!` });
      await loadFlowList();
      loadFlowDetails(created.flowId);
    } catch (err) {
      setAlert({ type: 'error', message: `Failed to create flow: ${err.message}` });
    }
  };

  // 8. Edit Flow Associations (Product, Plan, Status)
  const handleOpenEditHeader = () => {
    if (!flowData?.header) return;
    setEditHeaderForm({
      flowName: flowData.header.flowName || '',
      description: flowData.header.description || '',
      productCode: flowData.header.productCode || 'TECH_EO',
      planCode: flowData.header.planCode || 'TECH_EO_COMMERCIAL',
      status: flowData.header.status || 'ACTIVE'
    });
    setEditHeaderModalOpen(true);
  };

  const handleSaveHeader = async () => {
    if (!selectedFlowId) return;
    try {
      await apiFetch(`/api/brms/flows/${selectedFlowId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editHeaderForm)
      });

      setEditHeaderModalOpen(false);
      setAlert({ type: 'success', message: 'Flow associations and status updated successfully.' });
      await loadFlowList();
      loadFlowDetails(selectedFlowId);
    } catch (err) {
      setAlert({ type: 'error', message: `Failed to update flow header: ${err.message}` });
    }
  };

  // ============================================================================
  // VIEW A: RULEFLOW INVENTORY CATALOG (When selectedFlowId is null)
  // ============================================================================
  if (!selectedFlowId) {
    return (
      <Box sx={{ p: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography variant="h4" sx={{ fontSize: '1.65rem', fontWeight: 800, mb: 0.5, color: '#0f172a' }}>
              BRMS RuleFlows &amp; Decision Matrices Catalog
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748b' }}>
              Visual business rules orchestrator, coordinate decision tables, and rating pipeline execution engines.
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Button variant="outlined" startIcon={<RefreshCw size={16} />} onClick={loadFlowList}>
              Refresh Catalog
            </Button>
            <Button
              variant="contained"
              color="primary"
              startIcon={<Plus size={16} />}
              onClick={() => {
                setNewFlowForm({
                  flowCode: `FLOW_${Date.now().toString().slice(-4)}`,
                  flowName: '',
                  description: '',
                  productCode: 'TECH_EO',
                  planCode: 'TECH_EO_COMMERCIAL',
                  templateType: 'RATING_DECISION_TABLE'
                });
                setCreateModalOpen(true);
              }}
            >
              Create New Rule Flow
            </Button>
          </Box>
        </Box>

        {alert && (
          <Alert severity={alert.type} sx={{ mb: 2.5 }} onClose={() => setAlert(null)}>
            {alert.message}
          </Alert>
        )}

        {/* Catalog Summary Metric Cards */}
        <Grid container spacing={2} sx={{ mb: 3.5 }}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card elevation={0} sx={{ borderLeft: '4px solid #0f172a' }}>
              <CardContent sx={{ py: 2 }}>
                <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, letterSpacing: '0.05em' }}>
                  REGISTERED RULEFLOWS
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5 }}>
                  {flows.length}
                </Typography>
                <Typography variant="caption" sx={{ color: '#0f172a', fontWeight: 600 }}>
                  Active in Tenant #{selectedTenantId || 1}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card elevation={0} sx={{ borderLeft: '4px solid #16a34a' }}>
              <CardContent sx={{ py: 2 }}>
                <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, letterSpacing: '0.05em' }}>
                  ACTIVE IN PRODUCTION
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5, color: '#16a34a' }}>
                  {flows.filter(f => f.status === 'ACTIVE').length}
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748b' }}>
                  Live for Underwriting &amp; Rating
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card elevation={0} sx={{ borderLeft: '4px solid #0284c7' }}>
              <CardContent sx={{ py: 2 }}>
                <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, letterSpacing: '0.05em' }}>
                  LINKED PRODUCTS
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5, color: '#0284c7' }}>
                  {new Set(flows.map(f => f.productCode).filter(Boolean)).size}
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748b' }}>
                  Lines of Business Supported
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card elevation={0} sx={{ borderLeft: '4px solid #7c3aed' }}>
              <CardContent sx={{ py: 2 }}>
                <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, letterSpacing: '0.05em' }}>
                  ACTUARIAL MATRICES
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5, color: '#7c3aed' }}>
                  {flows.length * 1}
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748b' }}>
                  Coordinate Relational Tables
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Flows Grid Cards */}
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <GitFork size={18} color="#0284c7" />
          Configured RuleFlow Engines &amp; Workflows:
        </Typography>

        <Grid container spacing={2.5}>
          {flows.map((flow) => {
            const prodName = AVAILABLE_PRODUCTS.find(p => p.code === flow.productCode)?.name || flow.productCode || 'Unassigned Product';
            const planName = AVAILABLE_PLANS.find(p => p.code === flow.planCode)?.name || flow.planCode || 'Default Rating Plan';

            return (
              <Grid key={flow.flowId} size={{ xs: 12, md: 6, lg: 6 }}>
                <Card
                  elevation={0}
                  sx={{
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    transition: 'all 0.2s ease',
                    '&:hover': { borderColor: '#0284c7', boxShadow: '0 4px 12px rgba(2, 132, 199, 0.08)' }
                  }}
                >
                  <CardContent sx={{ p: 2.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 800, fontSize: '1.05rem', color: '#0f172a' }}>
                          {flow.flowName}
                        </Typography>
                        <Typography variant="caption" sx={{ fontFamily: 'monospace', color: '#64748b', fontWeight: 600 }}>
                          {flow.flowCode} &bull; Flow ID #{flow.flowId} (v{flow.version})
                        </Typography>
                      </Box>
                      <Chip
                        label={flow.status}
                        size="small"
                        sx={{
                          fontWeight: 700,
                          fontSize: '0.72rem',
                          bgcolor: flow.status === 'ACTIVE' ? '#dcfce7' : '#fef3c7',
                          color: flow.status === 'ACTIVE' ? '#15803d' : '#b45309'
                        }}
                      />
                    </Box>

                    <Typography variant="body2" sx={{ color: '#475569', fontSize: '0.84rem', mb: 2, minHeight: 40, lineHeight: 1.45 }}>
                      {flow.description || 'Custom insurance rating workflow and business rules graph.'}
                    </Typography>

                    {/* Associated Product & Rating Plan Badges */}
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2, pt: 1.5, borderTop: '1px solid #f1f5f9' }}>
                      <Chip
                        icon={<ShieldCheck size={14} />}
                        label={`Product: ${prodName}`}
                        size="small"
                        sx={{ bgcolor: '#e0f2fe', color: '#0369a1', fontWeight: 600, fontSize: '0.74rem' }}
                      />
                      <Chip
                        icon={<Calculator size={14} />}
                        label={`Plan: ${planName}`}
                        size="small"
                        variant="outlined"
                        sx={{ borderColor: '#cbd5e1', color: '#334155', fontWeight: 600, fontSize: '0.74rem' }}
                      />
                    </Box>

                    <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block' }}>
                      Last Updated: {flow.updatedDt || 'Recently'}
                    </Typography>
                  </CardContent>

                  <Divider />

                  <CardActions sx={{ px: 2.5, py: 1.5, justifyContent: 'space-between', bgcolor: '#f8fafc' }}>
                    <Button
                      size="small"
                      variant="contained"
                      color="primary"
                      startIcon={<FolderOpen size={16} />}
                      onClick={() => loadFlowDetails(flow.flowId)}
                      sx={{ fontWeight: 700 }}
                    >
                      Open in Visual Studio
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<Play size={14} color="#16a34a" />}
                      onClick={() => {
                        setSelectedFlowId(flow.flowId);
                        setSimulationOpen(true);
                      }}
                      sx={{ fontSize: '0.78rem' }}
                    >
                      Quick Test
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            );
          })}
        </Grid>

        {/* DIALOG: CREATE NEW RULEFLOW */}
        <Dialog open={createModalOpen} onClose={() => setCreateModalOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Plus size={20} color="#0284c7" />
            Create New Business RuleFlow
          </DialogTitle>
          <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 2 }}>
            <TextField
              label="Flow Code (Unique Identifier)"
              fullWidth
              size="small"
              value={newFlowForm.flowCode}
              onChange={(e) => setNewFlowForm({ ...newFlowForm, flowCode: e.target.value.toUpperCase().replace(/\s+/g, '_') })}
              helperText="Uppercase alphanumeric string, e.g. DNO_EXCESS_RATING"
            />
            <TextField
              label="Flow Name"
              fullWidth
              size="small"
              value={newFlowForm.flowName}
              onChange={(e) => setNewFlowForm({ ...newFlowForm, flowName: e.target.value })}
              placeholder="e.g. Directors & Officers Excess Tier Rating Engine"
            />
            <TextField
              label="Description"
              fullWidth
              multiline
              rows={2}
              size="small"
              value={newFlowForm.description}
              onChange={(e) => setNewFlowForm({ ...newFlowForm, description: e.target.value })}
              placeholder="Describe business rules, audit requirements, and underwriting thresholds..."
            />

            <FormControl fullWidth size="small">
              <InputLabel>Associated Product Line</InputLabel>
              <Select
                label="Associated Product Line"
                value={newFlowForm.productCode}
                onChange={(e) => setNewFlowForm({ ...newFlowForm, productCode: e.target.value })}
              >
                {AVAILABLE_PRODUCTS.map((p) => (
                  <MenuItem key={p.code} value={p.code}>
                    {p.name} ({p.code})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth size="small">
              <InputLabel>Associated Rating Plan</InputLabel>
              <Select
                label="Associated Rating Plan"
                value={newFlowForm.planCode}
                onChange={(e) => setNewFlowForm({ ...newFlowForm, planCode: e.target.value })}
              >
                {AVAILABLE_PLANS.map((p) => (
                  <MenuItem key={p.code} value={p.code}>
                    {p.name} ({p.code})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth size="small">
              <InputLabel>Initial Graph Template</InputLabel>
              <Select
                label="Initial Graph Template"
                value={newFlowForm.templateType}
                onChange={(e) => setNewFlowForm({ ...newFlowForm, templateType: e.target.value })}
              >
                <MenuItem value="RATING_DECISION_TABLE">Rating &amp; Surcharge Pipeline (Entry &rarr; Decision Table &rarr; Switch &rarr; Output)</MenuItem>
                <MenuItem value="BLANK">Blank Flow Canvas (Starter Entry Node)</MenuItem>
              </Select>
            </FormControl>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setCreateModalOpen(false)}>Cancel</Button>
            <Button variant="contained" color="primary" onClick={handleCreateNewFlow} startIcon={<Plus size={16} />}>
              Create &amp; Launch Studio
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    );
  }

  // ============================================================================
  // VIEW B: VISUAL CANVAS WORKSPACE (When a flow is open)
  // ============================================================================
  return (
    <Box sx={{ width: '100%', height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {/* Top Floating Control Bar */}
      <Paper
        elevation={2}
        sx={{
          p: 1.5,
          m: 1.5,
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 10,
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          flexWrap: 'wrap',
          gap: 1.5
        }}
      >
        {/* Left Side: Back / Close Flow Button & Header Information */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Button
            variant="outlined"
            size="small"
            color="inherit"
            startIcon={<ArrowLeft size={16} />}
            onClick={handleCloseFlow}
            sx={{ fontWeight: 700, borderColor: '#cbd5e1' }}
          >
            All Flows
          </Button>

          <Divider orientation="vertical" flexItem sx={{ height: 28 }} />

          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="h6" sx={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                {flowData?.header?.flowName || `RuleFlow #${selectedFlowId}`}
              </Typography>
              <Chip
                label={flowData?.header?.status || 'ACTIVE'}
                size="small"
                sx={{
                  height: 20,
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  bgcolor: flowData?.header?.status === 'ACTIVE' ? '#dcfce7' : '#fef3c7',
                  color: flowData?.header?.status === 'ACTIVE' ? '#15803d' : '#b45309'
                }}
              />
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.25 }}>
              <Typography variant="caption" sx={{ fontFamily: 'monospace', color: '#64748b', fontWeight: 600 }}>
                {flowData?.header?.flowCode} &bull; v{flowData?.header?.version || 1}
              </Typography>
              <Chip
                label={`Product: ${flowData?.header?.productCode || 'COMMERCIAL_AUTO'}`}
                size="small"
                sx={{ height: 18, fontSize: '0.65rem', bgcolor: '#e0f2fe', color: '#0369a1', fontWeight: 600 }}
              />
              <Chip
                label={`Plan: ${flowData?.header?.planCode || 'AUTO_FLEET'}`}
                size="small"
                variant="outlined"
                sx={{ height: 18, fontSize: '0.65rem', borderColor: '#cbd5e1', color: '#475569' }}
              />
              <IconButton size="small" title="Edit Flow Associations" onClick={handleOpenEditHeader} sx={{ p: 0.25 }}>
                <Settings2 size={15} color="#0284c7" />
              </IconButton>
            </Box>
          </Box>
        </Box>

        {/* Right Side: Global Toolbar Actions */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, flexWrap: 'wrap' }}>
          <Button
            variant="text"
            size="small"
            startIcon={<Plus size={15} />}
            onClick={() => {
              setNewFlowForm({
                flowCode: `FLOW_${Date.now().toString().slice(-4)}`,
                flowName: '',
                description: '',
                productCode: flowData?.header?.productCode || 'TECH_EO',
                planCode: flowData?.header?.planCode || 'TECH_EO_COMMERCIAL',
                templateType: 'RATING_DECISION_TABLE'
              });
              setCreateModalOpen(true);
            }}
            sx={{ fontWeight: 600 }}
          >
            New Flow
          </Button>

          <Button
            variant="outlined"
            size="small"
            color="primary"
            disabled={isValidating}
            startIcon={<CheckCircle2 size={16} />}
            onClick={handleValidateTopology}
          >
            {isValidating ? 'Validating...' : 'Validate DAG'}
          </Button>

          <Button
            variant="contained"
            size="small"
            sx={{ bgcolor: '#16a34a', '&:hover': { bgcolor: '#15803d' }, fontWeight: 700 }}
            startIcon={<Play size={16} />}
            onClick={() => setSimulationOpen(true)}
          >
            Simulate Execution
          </Button>

          <Button
            variant="contained"
            size="small"
            sx={{ bgcolor: '#0f172a', '&:hover': { bgcolor: '#1e293b' }, fontWeight: 700 }}
            startIcon={<Save size={16} />}
            onClick={handleSaveLayout}
          >
            Save Layout
          </Button>
        </Box>
      </Paper>

      {/* Floating Alerts */}
      {alert && (
        <Alert
          severity={alert.type}
          sx={{ m: 1.5, position: 'absolute', top: 90, left: 24, zIndex: 100, boxShadow: 3 }}
          onClose={() => setAlert(null)}
        >
          {alert.message}
        </Alert>
      )}

      {/* Validation Banner */}
      {validationResult && (
        <Alert
          severity={validationResult.isValid ? 'success' : 'error'}
          sx={{ m: 1.5, zIndex: 90 }}
          onClose={() => setValidationResult(null)}
        >
          {validationResult.isValid ? (
            <Box>
              <strong>Topology Verified (Kahn's Sort):</strong> Zero circular dependencies detected.
              <Typography variant="caption" sx={{ display: 'block', mt: 0.5, fontFamily: 'monospace' }}>
                Topological Order: {validationResult.topologicalOrder?.join(' -> ')}
              </Typography>
            </Box>
          ) : (
            <Box>
              <strong>Graph Deadlock Detected:</strong> {validationResult.errorMessages?.join('; ')}
            </Box>
          )}
        </Alert>
      )}

      {/* React Flow Core Interactive Canvas */}
      <Box sx={{ flexGrow: 1, position: 'relative' }} ref={reactFlowWrapper}>
        {isLoading ? (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 2 }}>
            <CircularProgress size={32} />
            <Typography variant="body1" sx={{ color: '#64748b' }}>
              Hydrating RuleFlow Graph and Coordinate Matrices...
            </Typography>
          </Box>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            fitView
          >
            <Background gap={16} size={1} color="#e2e8f0" />
            <Controls />
            <MiniMap
              nodeColor={(n) => {
                switch (n.type) {
                  case 'ruleset': return '#0284c7';
                  case 'conditional_switch': return '#d97706';
                  case 'decision_table': return '#7c3aed';
                  case 'ui_adjustment': return '#0d9488';
                  default: return '#64748b';
                }
              }}
              style={{ bottom: 16, right: 16 }}
            />

            {/* Left Node Archetype Palette */}
            <Panel position="top-left">
              <Paper
                elevation={3}
                sx={{
                  p: 1.5,
                  borderRadius: '8px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1,
                  width: 220
                }}
              >
                <Typography variant="caption" sx={{ fontWeight: 800, color: '#475569', letterSpacing: '0.05em' }}>
                  NODE PALETTE
                </Typography>
                <Divider />

                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<Code2 size={16} color="#0284c7" />}
                  sx={{ justifyContent: 'flex-start', textTransform: 'none', color: '#0f172a', borderColor: '#e2e8f0' }}
                  onClick={() => {
                    const id = `node-${Date.now().toString().slice(-4)}`;
                    setNodes((nds) => nds.concat({
                      id,
                      type: 'ruleset',
                      position: { x: 250, y: 150 },
                      data: { label: 'New Ruleset', payloadScript: 'facts.step = "applied";' }
                    }));
                  }}
                >
                  Ruleset Script
                </Button>

                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<GitFork size={16} color="#d97706" />}
                  sx={{ justifyContent: 'flex-start', textTransform: 'none', color: '#0f172a', borderColor: '#e2e8f0' }}
                  onClick={() => {
                    const id = `node-${Date.now().toString().slice(-4)}`;
                    setNodes((nds) => nds.concat({
                      id,
                      type: 'conditional_switch',
                      position: { x: 250, y: 150 },
                      data: { label: 'New Conditional Switch' }
                    }));
                  }}
                >
                  Conditional Switch
                </Button>

                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<TableIcon size={16} color="#7c3aed" />}
                  sx={{ justifyContent: 'flex-start', textTransform: 'none', color: '#0f172a', borderColor: '#e2e8f0' }}
                  onClick={() => {
                    const id = `node-${Date.now().toString().slice(-4)}`;
                    setNodes((nds) => nds.concat({
                      id,
                      type: 'decision_table',
                      position: { x: 250, y: 150 },
                      data: {
                        label: 'New Decision Matrix',
                        hitPolicy: 'FIRST_HIT',
                        rowCount: 3,
                        onOpenMatrix: () => {
                          const dt = (flowData?.decisionTables || [])[0];
                          setActiveMatrixData(dt);
                          setMatrixModalOpen(true);
                        }
                      }
                    }));
                  }}
                >
                  Decision Table
                </Button>

                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<Sliders size={16} color="#0d9488" />}
                  sx={{ justifyContent: 'flex-start', textTransform: 'none', color: '#0f172a', borderColor: '#e2e8f0' }}
                  onClick={() => {
                    const id = `node-${Date.now().toString().slice(-4)}`;
                    setNodes((nds) => nds.concat({
                      id,
                      type: 'ui_adjustment',
                      position: { x: 250, y: 150 },
                      data: { label: 'Underwriter Adjustment' }
                    }));
                  }}
                >
                  UI Adjustment
                </Button>
              </Paper>
            </Panel>
          </ReactFlow>
        )}
      </Box>

      {/* Right Property Inspector Drawer */}
      <Drawer
        anchor="right"
        open={Boolean(selectedNode)}
        onClose={() => setSelectedNode(null)}
        variant="persistent"
        PaperProps={{
          sx: {
            width: 340,
            mt: '65px',
            height: 'calc(100vh - 185px)',
            p: 2.5,
            borderLeft: '1px solid #e2e8f0',
            boxShadow: 'none'
          }
        }}
      >
        {selectedNode && (
          <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Box>
                <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 800 }}>
                  Node Properties
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748b' }}>
                  Client Key: <code>{selectedNode.id}</code>
                </Typography>
              </Box>
              <IconButton size="small" onClick={() => setSelectedNode(null)}>
                <X size={18} />
              </IconButton>
            </Box>

            <Divider sx={{ mb: 2 }} />

            <TextField
              label="Node Name / Label"
              size="small"
              fullWidth
              value={selectedNode.data?.label || ''}
              onChange={(e) => {
                const newLabel = e.target.value;
                setNodes((nds) =>
                  nds.map((n) => (n.id === selectedNode.id ? { ...n, data: { ...n.data, label: newLabel } } : n))
                );
              }}
              sx={{ mb: 2 }}
            />

            {selectedNode.type === 'ruleset' && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: '#475569', display: 'block', mb: 0.5 }}>
                  MVEL SCRIPT PAYLOAD:
                </Typography>
                <TextField
                  multiline
                  rows={6}
                  fullWidth
                  size="small"
                  value={selectedNode.data?.payloadScript || ''}
                  onChange={(e) => {
                    const newScript = e.target.value;
                    setNodes((nds) =>
                      nds.map((n) => (n.id === selectedNode.id ? { ...n, data: { ...n.data, payloadScript: newScript } } : n))
                    );
                  }}
                  sx={{ fontFamily: 'monospace', fontSize: '0.78rem' }}
                />
              </Box>
            )}

            {selectedNode.type === 'decision_table' && (
              <Box sx={{ mb: 2 }}>
                <Button
                  fullWidth
                  variant="contained"
                  sx={{ bgcolor: '#7c3aed', '&:hover': { bgcolor: '#6d28d9' } }}
                  startIcon={<TableIcon size={16} />}
                  onClick={() => {
                    const dt = (flowData?.decisionTables || []).find(t => t.nodeId === selectedNode.data?.dbNodeId) || (flowData?.decisionTables || [])[0];
                    setActiveMatrixData(dt);
                    setMatrixModalOpen(true);
                  }}
                >
                  Configure 2D Decision Matrix
                </Button>
              </Box>
            )}

            <Box sx={{ mt: 'auto', pt: 2, borderTop: '1px solid #e2e8f0' }}>
              <Button
                fullWidth
                variant="outlined"
                color="error"
                startIcon={<Trash2 size={16} />}
                onClick={() => {
                  setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id));
                  setEdges((eds) => eds.filter((e) => e.source !== selectedNode.id && e.target !== selectedNode.id));
                  setSelectedNode(null);
                }}
              >
                Delete Node
              </Button>
            </Box>
          </Box>
        )}
      </Drawer>

      {/* MODAL 1: TEST SIMULATION & COMPLIANCE AUDIT TRACE */}
      <Dialog open={simulationOpen} onClose={() => setSimulationOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Zap size={20} color="#16a34a" />
          RuleFlow Simulation &amp; Regulatory Audit Runner
        </DialogTitle>
        <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 5 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: '#334155' }}>
                INPUT WORKING MEMORY FACTS (JSON):
              </Typography>
              <TextField
                multiline
                rows={12}
                fullWidth
                value={simulationFacts}
                onChange={(e) => setSimulationFacts(e.target.value)}
                sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}
              />
              <Button
                fullWidth
                variant="contained"
                sx={{ mt: 1.5, bgcolor: '#16a34a', '&:hover': { bgcolor: '#15803d' }, fontWeight: 700 }}
                startIcon={<Play size={16} />}
                disabled={isSimulating}
                onClick={handleRunSimulation}
              >
                {isSimulating ? 'Executing RuleFlow...' : 'Run BRMS Engine'}
              </Button>
            </Grid>

            <Grid size={{ xs: 12, md: 7 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: '#334155' }}>
                EXECUTION &amp; REGULATORY AUDIT LOG:
              </Typography>

              {!simulationResult ? (
                <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', bgcolor: '#f8fafc', color: '#94a3b8' }}>
                  Click &quot;Run BRMS Engine&quot; to test graph execution.
                </Paper>
              ) : (
                <Box sx={{ maxHeight: 420, overflowY: 'auto' }}>
                  <Box sx={{ display: 'flex', gap: 1, mb: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                    <Chip
                      label={simulationResult.success ? 'SUCCESS (200 OK)' : 'FAILED'}
                      size="small"
                      sx={{ bgcolor: simulationResult.success ? '#dcfce7' : '#fee2e2', color: simulationResult.success ? '#15803d' : '#dc2626', fontWeight: 700 }}
                    />
                    <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
                      Latency: <strong>{simulationResult.totalDurationMs} ms</strong>
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                      Correlation: <code>{simulationResult.correlationId}</code>
                    </Typography>
                  </Box>

                  {/* Chronological Step List */}
                  <Typography variant="caption" sx={{ fontWeight: 700, color: '#475569', display: 'block', mb: 1 }}>
                    EXECUTION STEPS ({simulationResult.auditTrail?.length || 0}):
                  </Typography>

                  {simulationResult.auditTrail?.map((step) => (
                    <Paper key={step.stepIndex} variant="outlined" sx={{ p: 1.5, mb: 1.5, bgcolor: '#ffffff' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.82rem' }}>
                          Step {step.stepIndex}: {step.nodeName} ({step.nodeType})
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#64748b', fontFamily: 'monospace' }}>
                          {(step.executionTimeNanos / 1000000).toFixed(2)} ms
                        </Typography>
                      </Box>
                      <Typography variant="body2" sx={{ fontSize: '0.78rem', color: '#475569', mb: 1 }}>
                        {step.evaluationSummary}
                      </Typography>
                      <Box sx={{ backgroundColor: '#f8fafc', p: 1, borderRadius: '4px', fontSize: '0.7rem', fontFamily: 'monospace', color: '#334155' }}>
                        <div>After: {JSON.stringify(step.factsAfter)}</div>
                      </Box>
                    </Paper>
                  ))}

                  <Typography variant="caption" sx={{ fontWeight: 700, color: '#475569', display: 'block', mt: 2, mb: 0.5 }}>
                    FINAL CALCULATED FACTS:
                  </Typography>
                  <Paper variant="outlined" sx={{ p: 1.5, bgcolor: '#0f172a', color: '#38bdf8', fontFamily: 'monospace', fontSize: '0.74rem' }}>
                    <pre style={{ margin: 0 }}>{JSON.stringify(simulationResult.finalFacts, null, 2)}</pre>
                  </Paper>
                </Box>
              )}
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSimulationOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* MODAL 2: 2D DECISION MATRIX VIEWER */}
      <Dialog open={matrixModalOpen} onClose={() => setMatrixModalOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
          <TableIcon size={20} color="#7c3aed" />
          2D Decision Matrix: {activeMatrixData?.tableName || 'Coordinate Table'}
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ mb: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
            <Chip label={`Hit Policy: ${activeMatrixData?.hitPolicy || 'FIRST_HIT'}`} size="small" sx={{ bgcolor: '#ede9fe', color: '#6d28d9', fontWeight: 600 }} />
            <Typography variant="caption" sx={{ color: '#64748b' }}>
              Relational Matrix coordinate model (Rows &times; Columns crossing at Expression Cells).
            </Typography>
          </Box>

          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead sx={{ bgcolor: '#f1f5f9' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, width: 60 }}>#</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Rule Description</TableCell>
                  {activeMatrixData?.columns?.map((c) => (
                    <TableCell key={c.ColumnId} sx={{ fontWeight: 700, color: c.ColumnType === 'ACTION' ? '#0d9488' : '#0284c7' }}>
                      {c.DisplayName} ({c.ColumnType})
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {activeMatrixData?.rows?.map((r) => (
                  <TableRow key={r.RowId} hover>
                    <TableCell sx={{ fontWeight: 700 }}>{r.RowIndex}</TableCell>
                    <TableCell>{r.RuleDescription}</TableCell>
                    {activeMatrixData?.columns?.map((c) => {
                      const cell = (activeMatrixData?.cells || []).find(
                        (cl) => cl.RowId === r.RowId && cl.ColumnId === c.ColumnId
                      );
                      return (
                        <TableCell key={c.ColumnId} sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                          {cell?.ExpressionValue || '-'}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMatrixModalOpen(false)}>Close Matrix</Button>
        </DialogActions>
      </Dialog>

      {/* MODAL 3: EDIT FLOW ASSOCIATIONS (PRODUCT / RATING PLAN) */}
      <Dialog open={editHeaderModalOpen} onClose={() => setEditHeaderModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Settings2 size={20} color="#0284c7" />
          Edit Flow Associations &amp; Status
        </DialogTitle>
        <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 2 }}>
          <TextField
            label="Flow Name"
            fullWidth
            size="small"
            value={editHeaderForm.flowName}
            onChange={(e) => setEditHeaderForm({ ...editHeaderForm, flowName: e.target.value })}
          />
          <TextField
            label="Description"
            fullWidth
            multiline
            rows={2}
            size="small"
            value={editHeaderForm.description}
            onChange={(e) => setEditHeaderForm({ ...editHeaderForm, description: e.target.value })}
          />
          <FormControl fullWidth size="small">
            <InputLabel>Associated Product Line</InputLabel>
            <Select
              label="Associated Product Line"
              value={editHeaderForm.productCode}
              onChange={(e) => setEditHeaderForm({ ...editHeaderForm, productCode: e.target.value })}
            >
              {AVAILABLE_PRODUCTS.map((p) => (
                <MenuItem key={p.code} value={p.code}>
                  {p.name} ({p.code})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth size="small">
            <InputLabel>Associated Rating Plan</InputLabel>
            <Select
              label="Associated Rating Plan"
              value={editHeaderForm.planCode}
              onChange={(e) => setEditHeaderForm({ ...editHeaderForm, planCode: e.target.value })}
            >
              {AVAILABLE_PLANS.map((p) => (
                <MenuItem key={p.code} value={p.code}>
                  {p.name} ({p.code})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth size="small">
            <InputLabel>Lifecycle Status</InputLabel>
            <Select
              label="Lifecycle Status"
              value={editHeaderForm.status}
              onChange={(e) => setEditHeaderForm({ ...editHeaderForm, status: e.target.value })}
            >
              <MenuItem value="ACTIVE">ACTIVE (Production Rating &amp; Underwriting)</MenuItem>
              <MenuItem value="DRAFT">DRAFT (Design &amp; Testing Mode)</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setEditHeaderModalOpen(false)}>Cancel</Button>
          <Button variant="contained" color="primary" onClick={handleSaveHeader}>
            Save Flow Settings
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
