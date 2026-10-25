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
  CardActions,
  Switch,
  FormControlLabel
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
  X,
  Workflow,
  GitBranch,
  Copy,
  Edit3,
  Filter,
  Search
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

  // Catalog Filter & Search State
  const [catalogProductFilter, setCatalogProductFilter] = useState('ALL');
  const [catalogSearchQuery, setCatalogSearchQuery] = useState('');

  // Version Cloning Modal State
  const [cloneModalOpen, setCloneModalOpen] = useState(false);
  const [cloneTargetFlow, setCloneTargetFlow] = useState(null);
  const [cloneForm, setCloneForm] = useState({
    requestedVersion: 2,
    description: '',
    status: 'DRAFT'
  });

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

  // ============================================================================
  // DECISION MATRIX DATA NORMALIZATION & GRID CONTROLS
  // ============================================================================
  const normalizeMatrixData = useCallback((dt) => {
    if (!dt) return null;
    const cols = (dt.columns || []).map((c, idx) => ({
      columnId: c.columnId || c.ColumnId || (idx + 1),
      columnType: c.columnType || c.ColumnType || 'CONDITION',
      attributeKey: c.attributeKey || c.AttributeKey || `attr_${idx + 1}`,
      displayName: c.displayName || c.DisplayName || `Column ${idx + 1}`,
      dataType: c.dataType || c.DataType || 'STRING',
      displayOrder: c.displayOrder || c.DisplayOrder || (idx + 1)
    }));

    const rawRows = dt.rows || [];
    const rawCells = dt.cells || [];
    const cellLookup = {};
    rawCells.forEach(cell => {
      const rId = cell.rowId || cell.RowId;
      const cId = cell.columnId || cell.ColumnId;
      cellLookup[`${rId}_${cId}`] = cell.expressionValue !== undefined ? cell.expressionValue : cell.ExpressionValue || '-';
    });

    const rows = rawRows.map(r => {
      const rId = r.rowId || r.RowId;
      let cellVals = r.cellValues ? { ...r.cellValues } : {};
      cols.forEach(col => {
        const cIdStr = String(col.columnId);
        if (cellVals[cIdStr] === undefined) {
          cellVals[cIdStr] = cellLookup[`${rId}_${col.columnId}`] || '-';
        }
      });
      return {
        rowId: rId,
        rowIndex: r.rowIndex !== undefined ? r.rowIndex : r.RowIndex,
        ruleDescription: r.ruleDescription || r.RuleDescription || '',
        isActive: r.isActive !== undefined ? r.isActive : r.IsActive !== undefined ? r.IsActive : true,
        cellValues: cellVals
      };
    });

    return {
      tableId: dt.tableId || dt.TableId,
      nodeId: dt.nodeId || dt.NodeId,
      tableCode: dt.tableCode || dt.TableCode,
      tableName: dt.tableName || dt.TableName,
      hitPolicy: dt.hitPolicy || dt.HitPolicy || 'FIRST_HIT',
      aggregationField: dt.aggregationField || dt.AggregationField || '',
      columns: cols,
      rows: rows
    };
  }, []);

  const openDecisionMatrixEditor = useCallback(async (tableRef) => {
    const tableId = typeof tableRef === 'object' ? tableRef?.tableId || tableRef?.TableId : tableRef;
    if (!tableId) {
      if (typeof tableRef === 'object') {
        setActiveMatrixData(normalizeMatrixData(tableRef));
        setMatrixModalOpen(true);
      }
      return;
    }
    try {
      const data = await apiFetch(`/api/brms/decision-tables/${tableId}`);
      if (data && data.tableId) {
        setActiveMatrixData(normalizeMatrixData(data));
      } else {
        setActiveMatrixData(normalizeMatrixData(tableRef));
      }
    } catch (err) {
      console.warn('Could not fetch decision table directly, fallback to local object:', err);
      setActiveMatrixData(normalizeMatrixData(tableRef));
    }
    setMatrixModalOpen(true);
  }, [apiFetch, normalizeMatrixData]);

  const handleSaveDecisionMatrix = async () => {
    if (!activeMatrixData?.tableId) return;
    try {
      const updated = await apiFetch(`/api/brms/decision-tables/${activeMatrixData.tableId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(activeMatrixData)
      });
      setActiveMatrixData(normalizeMatrixData(updated || activeMatrixData));
      setAlert({
        type: 'success',
        message: `Decision Matrix '${activeMatrixData.tableName || activeMatrixData.tableCode}' successfully saved to HELIOS_RATING_DB.`
      });
      if (flowData && flowData.decisionTables) {
        const nextDt = flowData.decisionTables.map(t => (t.tableId || t.TableId) === activeMatrixData.tableId ? { ...t, ...activeMatrixData } : t);
        setFlowData({ ...flowData, decisionTables: nextDt });
      }
      setMatrixModalOpen(false);
    } catch (err) {
      setAlert({ type: 'error', message: `Failed to save decision matrix: ${err.message}` });
    }
  };

  const handleMatrixCellChange = (rowId, colId, value) => {
    if (!activeMatrixData) return;
    const nextRows = activeMatrixData.rows.map(r => {
      if (r.rowId === rowId) {
        return {
          ...r,
          cellValues: {
            ...(r.cellValues || {}),
            [String(colId)]: value
          }
        };
      }
      return r;
    });
    setActiveMatrixData({ ...activeMatrixData, rows: nextRows });
  };

  const handleMatrixRowDescChange = (rowId, desc) => {
    if (!activeMatrixData) return;
    const nextRows = activeMatrixData.rows.map(r => r.rowId === rowId ? { ...r, ruleDescription: desc } : r);
    setActiveMatrixData({ ...activeMatrixData, rows: nextRows });
  };

  const handleMatrixRowActiveToggle = (rowId) => {
    if (!activeMatrixData) return;
    const nextRows = activeMatrixData.rows.map(r => r.rowId === rowId ? { ...r, isActive: !r.isActive } : r);
    setActiveMatrixData({ ...activeMatrixData, rows: nextRows });
  };

  const handleAddMatrixRow = () => {
    if (!activeMatrixData) return;
    const currentRows = activeMatrixData.rows || [];
    const maxIndex = currentRows.reduce((max, r) => Math.max(max, r.rowIndex || 0), 0);
    const newRowId = -1 * (currentRows.length + 1);
    const defaultCells = {};
    (activeMatrixData.columns || []).forEach(col => {
      defaultCells[String(col.columnId)] = '-';
    });
    const newRow = {
      rowId: newRowId,
      rowIndex: maxIndex + 1,
      ruleDescription: 'New Matrix Business Rule',
      isActive: true,
      cellValues: defaultCells
    };
    setActiveMatrixData({ ...activeMatrixData, rows: [...currentRows, newRow] });
  };

  const handleDeleteMatrixRow = async (rowId) => {
    if (!activeMatrixData) return;
    if (rowId > 0 && activeMatrixData.tableId) {
      try {
        await apiFetch(`/api/brms/decision-tables/${activeMatrixData.tableId}/rows/${rowId}`, { method: 'DELETE' });
      } catch (err) {
        console.warn('Failed remote delete of row:', err);
      }
    }
    const nextRows = activeMatrixData.rows.filter(r => r.rowId !== rowId);
    setActiveMatrixData({ ...activeMatrixData, rows: nextRows });
  };

  const handleOpenCloneModal = (targetFlow) => {
    const src = targetFlow || flowData?.header;
    if (!src) return;
    setCloneTargetFlow(src);
    setCloneForm({
      requestedVersion: (src.version || 1) + 1,
      description: `Cloned from v${src.version || 1}: Updated underwriting logic and rating factors`,
      status: 'DRAFT'
    });
    setCloneModalOpen(true);
  };

  const handleSaveCloneVersion = async () => {
    if (!cloneTargetFlow?.flowId) return;
    try {
      const cloned = await apiFetch(`/api/brms/flows/${cloneTargetFlow.flowId}/clone-version`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cloneForm)
      });
      setCloneModalOpen(false);
      setAlert({
        type: 'success',
        message: `Successfully created new version v${cloned.version} (${cloned.flowCode}) in HELIOS_RATING_DB.`
      });
      await loadFlowList();
      if (selectedFlowId) {
        loadFlowDetails(cloned.flowId);
      }
    } catch (err) {
      setAlert({ type: 'error', message: `Failed to clone flow version: ${err.message}` });
    }
  };

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
                  const dt = (data.decisionTables || []).find(t => (t.nodeId || t.NodeId) === n.data?.dbNodeId) || (data.decisionTables || [])[0];
                  openDecisionMatrixEditor(dt);
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
              const dt = (data.decisionTables || []).find(t => (t.nodeId || t.NodeId) === n.nodeId) || (data.decisionTables || [])[0];
              openDecisionMatrixEditor(dt);
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
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(layoutPayload)
      });

      setAlert({ type: 'success', message: `Visual canvas state successfully saved to HELIOS_RATING_DB for Flow #${selectedFlowId}.` });
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

        {/* Search, Filter Toolbar & Flow Catalog Table */}
        <Box sx={{ mb: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <GitFork size={20} color="#0284c7" />
            <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0f172a' }}>
              Configured RuleFlow Engines &amp; Workflows:
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
            <TextField
              size="small"
              placeholder="Search flows by code, name, description..."
              value={catalogSearchQuery}
              onChange={(e) => setCatalogSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: <Search size={16} color="#94a3b8" style={{ marginRight: 8 }} />
              }}
              sx={{ minWidth: 280 }}
            />
            <FormControl size="small" sx={{ minWidth: 220 }}>
              <InputLabel>Filter by Product Line</InputLabel>
              <Select
                label="Filter by Product Line"
                value={catalogProductFilter}
                onChange={(e) => setCatalogProductFilter(e.target.value)}
              >
                <MenuItem value="ALL">All Product Lines</MenuItem>
                {AVAILABLE_PRODUCTS.map((p) => (
                  <MenuItem key={p.code} value={p.code}>
                    {p.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </Box>

        <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden', mb: 4 }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: '#f8fafc' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, color: '#475569', py: 1.5 }}>Flow Code &amp; ID</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569', py: 1.5 }}>Workflow Engine Name &amp; Description</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569', py: 1.5, textAlign: 'center' }}>Version</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569', py: 1.5 }}>Product Line</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569', py: 1.5 }}>Rating Plan</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569', py: 1.5, textAlign: 'center' }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569', py: 1.5 }}>Last Updated</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569', py: 1.5, textAlign: 'right' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {flows
                .filter((flow) => {
                  if (catalogProductFilter !== 'ALL' && flow.productCode !== catalogProductFilter) {
                    return false;
                  }
                  if (catalogSearchQuery.trim()) {
                    const q = catalogSearchQuery.toLowerCase();
                    const code = (flow.flowCode || '').toLowerCase();
                    const name = (flow.flowName || '').toLowerCase();
                    const desc = (flow.description || '').toLowerCase();
                    const plan = (flow.planCode || '').toLowerCase();
                    return code.includes(q) || name.includes(q) || desc.includes(q) || plan.includes(q);
                  }
                  return true;
                })
                .map((flow) => {
                  const prodName = AVAILABLE_PRODUCTS.find(p => p.code === flow.productCode)?.name || flow.productCode || 'Unassigned Product';
                  const planName = AVAILABLE_PLANS.find(p => p.code === flow.planCode)?.name || flow.planCode || 'Default Rating Plan';

                  return (
                    <TableRow key={flow.flowId} hover sx={{ '&:hover': { bgcolor: '#f8fafc' } }}>
                      <TableCell sx={{ verticalAlign: 'top', py: 1.5 }}>
                        <Typography variant="body2" sx={{ fontWeight: 800, fontFamily: 'monospace', color: '#0f172a' }}>
                          {flow.flowCode}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#64748b' }}>
                          Flow ID #{flow.flowId}
                        </Typography>
                      </TableCell>

                      <TableCell sx={{ verticalAlign: 'top', maxWidth: 340, py: 1.5 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0f172a', mb: 0.3 }}>
                          {flow.flowName}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#64748b', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {flow.description || 'Custom insurance rating workflow and business rules graph.'}
                        </Typography>
                      </TableCell>

                      <TableCell sx={{ verticalAlign: 'top', textAlign: 'center', py: 1.5 }}>
                        <Chip
                          label={`v${flow.version || 1}`}
                          size="small"
                          sx={{
                            fontWeight: 700,
                            fontSize: '0.72rem',
                            bgcolor: '#ede9fe',
                            color: '#6d28d9'
                          }}
                        />
                      </TableCell>

                      <TableCell sx={{ verticalAlign: 'top', py: 1.5 }}>
                        <Chip
                          icon={<ShieldCheck size={13} />}
                          label={prodName}
                          size="small"
                          sx={{ bgcolor: '#e0f2fe', color: '#0369a1', fontWeight: 600, fontSize: '0.72rem' }}
                        />
                      </TableCell>

                      <TableCell sx={{ verticalAlign: 'top', py: 1.5 }}>
                        <Typography variant="caption" sx={{ fontWeight: 600, color: '#334155' }}>
                          {planName}
                        </Typography>
                      </TableCell>

                      <TableCell sx={{ verticalAlign: 'top', textAlign: 'center', py: 1.5 }}>
                        <Chip
                          label={flow.status}
                          size="small"
                          sx={{
                            fontWeight: 700,
                            fontSize: '0.7rem',
                            bgcolor: flow.status === 'ACTIVE' ? '#dcfce7' : '#fef3c7',
                            color: flow.status === 'ACTIVE' ? '#15803d' : '#b45309'
                          }}
                        />
                      </TableCell>

                      <TableCell sx={{ verticalAlign: 'top', whiteSpace: 'nowrap', py: 1.5 }}>
                        <Typography variant="caption" sx={{ color: '#64748b' }}>
                          {flow.updatedDt || 'Recently'}
                        </Typography>
                      </TableCell>

                      <TableCell sx={{ verticalAlign: 'top', textAlign: 'right', py: 1.5 }}>
                        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', flexWrap: 'nowrap' }}>
                          <Button
                            size="small"
                            variant="contained"
                            color="primary"
                            startIcon={<Workflow size={15} />}
                            onClick={() => loadFlowDetails(flow.flowId)}
                            sx={{ fontWeight: 700, textTransform: 'none', px: 1.5 }}
                          >
                            Flow Studio
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<GitBranch size={14} />}
                            onClick={() => handleOpenCloneModal(flow)}
                            sx={{ fontWeight: 600, textTransform: 'none', borderColor: '#cbd5e1', color: '#475569' }}
                          >
                            New Version
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<Play size={14} color="#16a34a" />}
                            onClick={() => {
                              setSelectedFlowId(flow.flowId);
                              setSimulationOpen(true);
                            }}
                            sx={{ fontWeight: 600, textTransform: 'none', borderColor: '#cbd5e1', color: '#16a34a' }}
                          >
                            Quick Test
                          </Button>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
              {flows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} sx={{ textAlign: 'center', py: 4, color: '#64748b' }}>
                    No ruleflows registered for tenant. Click "Create New Rule Flow" to begin.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

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

        {/* DIALOG: CLONE FLOW AS NEW VERSION */}
        <Dialog open={cloneModalOpen} onClose={() => setCloneModalOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
            <GitBranch size={20} color="#6d28d9" />
            Save as New Version / Branch Flow
          </DialogTitle>
          <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 2 }}>
            <Alert severity="info" sx={{ fontSize: '0.82rem' }}>
              Cloning will replicate the entire graph topology, MVEL scripts, canvas layout coordinates, and all coordinate Decision Tables with their columns, rows, and cell matrices into <strong>HELIOS_RATING_DB</strong> under a new version tag.
            </Alert>
            <TextField
              label="Source Flow"
              fullWidth
              size="small"
              disabled
              value={`${cloneTargetFlow?.flowCode || ''} (Current v${cloneTargetFlow?.version || 1})`}
            />
            <TextField
              label="New Version Number"
              fullWidth
              size="small"
              type="number"
              value={cloneForm.requestedVersion}
              onChange={(e) => setCloneForm({ ...cloneForm, requestedVersion: parseInt(e.target.value) || 1 })}
              helperText="Incremented integer version identifier"
            />
            <TextField
              label="Version Release Notes / Description"
              fullWidth
              multiline
              rows={2}
              size="small"
              value={cloneForm.description}
              onChange={(e) => setCloneForm({ ...cloneForm, description: e.target.value })}
              placeholder="e.g. v2: Updated actuarial factors for state filings, refined credit score tiers..."
            />
            <FormControl fullWidth size="small">
              <InputLabel>Initial Lifecycle Status</InputLabel>
              <Select
                label="Initial Lifecycle Status"
                value={cloneForm.status}
                onChange={(e) => setCloneForm({ ...cloneForm, status: e.target.value })}
              >
                <MenuItem value="DRAFT">DRAFT (Recommended for new versions in design/review)</MenuItem>
                <MenuItem value="ACTIVE">ACTIVE (Immediate Production Rating)</MenuItem>
              </Select>
            </FormControl>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setCloneModalOpen(false)}>Cancel</Button>
            <Button
              variant="contained"
              sx={{ bgcolor: '#6d28d9', '&:hover': { bgcolor: '#5b21b6' }, fontWeight: 700 }}
              onClick={handleSaveCloneVersion}
              startIcon={<GitBranch size={16} />}
            >
              Confirm &amp; Create Version
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
            variant="outlined"
            size="small"
            startIcon={<GitBranch size={16} />}
            onClick={() => handleOpenCloneModal(flowData?.header)}
            sx={{ fontWeight: 700, borderColor: '#cbd5e1', color: '#334155' }}
          >
            Save as New Version
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

      {/* MODAL 2: 2D DECISION MATRIX EDITOR & VIEWER (Saved in Rating DB) */}
      <Dialog open={matrixModalOpen} onClose={() => setMatrixModalOpen(false)} maxWidth="xl" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TableIcon size={22} color="#7c3aed" />
            <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a' }}>
              Actuarial Decision Matrix Editor: {activeMatrixData?.tableName || 'Coordinate Table'}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip
              label="HELIOS_RATING_DB.dbo.DecisionTables"
              size="small"
              sx={{ bgcolor: '#f1f5f9', color: '#475569', fontFamily: 'monospace', fontSize: '0.72rem' }}
            />
            <IconButton size="small" onClick={() => setMatrixModalOpen(false)}>
              <X size={18} />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 2.5 }}>
          {/* Metadata Bar */}
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2.5, flexWrap: 'wrap' }}>
            <TextField
              label="Matrix Table Name"
              size="small"
              value={activeMatrixData?.tableName || ''}
              onChange={(e) => setActiveMatrixData({ ...activeMatrixData, tableName: e.target.value })}
              sx={{ minWidth: 320 }}
            />
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Hit Evaluation Policy</InputLabel>
              <Select
                label="Hit Evaluation Policy"
                value={activeMatrixData?.hitPolicy || 'FIRST_HIT'}
                onChange={(e) => setActiveMatrixData({ ...activeMatrixData, hitPolicy: e.target.value })}
              >
                <MenuItem value="FIRST_HIT">FIRST_HIT (Sequential Priority)</MenuItem>
                <MenuItem value="RULE_ORDER">RULE_ORDER (Multi-hit ordered)</MenuItem>
                <MenuItem value="COLLECT_SUM">COLLECT_SUM (Sum all action outputs)</MenuItem>
                <MenuItem value="COLLECT_MIN">COLLECT_MIN (Minimum action output)</MenuItem>
                <MenuItem value="COLLECT_MAX">COLLECT_MAX (Maximum action output)</MenuItem>
              </Select>
            </FormControl>
            <Chip
              label={`Table Code: ${activeMatrixData?.tableCode || '-'}`}
              size="small"
              sx={{ fontFamily: 'monospace', fontWeight: 600 }}
            />
            <Button
              variant="outlined"
              size="small"
              color="primary"
              startIcon={<Plus size={15} />}
              onClick={handleAddMatrixRow}
              sx={{ ml: 'auto', fontWeight: 700 }}
            >
              Add Rule Row
            </Button>
          </Box>

          <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 480 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800, width: 50, bgcolor: '#f8fafc' }}>#</TableCell>
                  <TableCell sx={{ fontWeight: 800, width: 70, bgcolor: '#f8fafc', textAlign: 'center' }}>Active</TableCell>
                  <TableCell sx={{ fontWeight: 800, minWidth: 240, bgcolor: '#f8fafc' }}>Rule Description / Actuarial Reason</TableCell>
                  {activeMatrixData?.columns?.map((c) => {
                    const isAction = c.columnType === 'ACTION' || c.ColumnType === 'ACTION';
                    const colId = c.columnId || c.ColumnId;
                    const dispName = c.displayName || c.DisplayName;
                    const attrKey = c.attributeKey || c.AttributeKey;
                    return (
                      <TableCell
                        key={colId}
                        sx={{
                          fontWeight: 800,
                          minWidth: 160,
                          bgcolor: isAction ? '#ecfdf5' : '#f0f9ff',
                          color: isAction ? '#065f46' : '#0369a1',
                          borderBottom: `2px solid ${isAction ? '#10b981' : '#0284c7'}`
                        }}
                      >
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 800, fontSize: '0.78rem' }}>
                            {dispName}
                          </Typography>
                          <Typography variant="caption" sx={{ fontFamily: 'monospace', fontSize: '0.68rem', display: 'block', opacity: 0.85 }}>
                            {attrKey} ({isAction ? 'OUTPUT' : 'INPUT'})
                          </Typography>
                        </Box>
                      </TableCell>
                    );
                  })}
                  <TableCell sx={{ fontWeight: 800, width: 60, bgcolor: '#f8fafc', textAlign: 'center' }}>Delete</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {activeMatrixData?.rows?.map((r) => {
                  const rowId = r.rowId || r.RowId;
                  const rowIdx = r.rowIndex || r.RowIndex;
                  const rowDesc = r.ruleDescription || r.RuleDescription || '';
                  const rowActive = r.isActive !== undefined ? r.isActive : r.IsActive !== undefined ? r.IsActive : true;
                  return (
                    <TableRow key={rowId} hover sx={{ opacity: rowActive ? 1 : 0.55 }}>
                      <TableCell sx={{ fontWeight: 700, color: '#64748b' }}>{rowIdx}</TableCell>
                      <TableCell sx={{ textAlign: 'center' }}>
                        <Switch
                          size="small"
                          checked={!!rowActive}
                          onChange={() => handleMatrixRowActiveToggle(rowId)}
                          color="success"
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          fullWidth
                          variant="standard"
                          value={rowDesc}
                          onChange={(e) => handleMatrixRowDescChange(rowId, e.target.value)}
                          placeholder="Describe condition trigger..."
                          InputProps={{ style: { fontSize: '0.82rem' } }}
                        />
                      </TableCell>
                      {activeMatrixData?.columns?.map((c) => {
                        const colId = c.columnId || c.ColumnId;
                        const isAction = c.columnType === 'ACTION' || c.ColumnType === 'ACTION';
                        const currentVal = r.cellValues ? r.cellValues[String(colId)] : '';
                        return (
                          <TableCell key={colId} sx={{ bgcolor: isAction ? '#f0fdf4' : '#fafafa' }}>
                            <TextField
                              size="small"
                              fullWidth
                              variant="outlined"
                              value={currentVal !== undefined ? currentVal : ''}
                              onChange={(e) => handleMatrixCellChange(rowId, colId, e.target.value)}
                              placeholder={isAction ? '1.000' : 'e.g. [0..5)'}
                              InputProps={{
                                style: {
                                  fontSize: '0.8rem',
                                  fontFamily: 'monospace',
                                  fontWeight: 600,
                                  color: isAction ? '#065f46' : '#0369a1'
                                }
                              }}
                            />
                          </TableCell>
                        );
                      })}
                      <TableCell sx={{ textAlign: 'center' }}>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeleteMatrixRow(rowId)}
                          title="Delete Rule Row"
                        >
                          <Trash2 size={16} />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>

          <Box sx={{ mt: 2, p: 1.5, bgcolor: '#f8fafc', borderRadius: 1.5, border: '1px solid #e2e8f0', display: 'flex', gap: 3, alignItems: 'center' }}>
            <Typography variant="caption" sx={{ fontWeight: 700, color: '#475569' }}>
              EXPRESSION SYNTAX GUIDE:
            </Typography>
            <Typography variant="caption" sx={{ fontFamily: 'monospace', color: '#334155' }}>
              Ranges: <code>[0..3)</code> &bull; <code>[650..720]</code>
            </Typography>
            <Typography variant="caption" sx={{ fontFamily: 'monospace', color: '#334155' }}>
              Inequalities: <code>&lt; 650</code> &bull; <code>&gt;= 720</code>
            </Typography>
            <Typography variant="caption" sx={{ fontFamily: 'monospace', color: '#334155' }}>
              Wildcard: <code>ANY</code> or <code>-</code>
            </Typography>
            <Typography variant="caption" sx={{ fontFamily: 'monospace', color: '#334155' }}>
              Outputs: <code>1.450</code> &bull; <code>"REFER_SENIOR_UW"</code>
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, justifyContent: 'space-between', bgcolor: '#f8fafc' }}>
          <Button onClick={() => setMatrixModalOpen(false)} color="inherit">
            Cancel
          </Button>
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Button
              variant="contained"
              sx={{ bgcolor: '#7c3aed', '&:hover': { bgcolor: '#6d28d9' }, fontWeight: 700 }}
              startIcon={<Save size={16} />}
              onClick={handleSaveDecisionMatrix}
            >
              Save Matrix to Rating DB
            </Button>
          </Box>
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
