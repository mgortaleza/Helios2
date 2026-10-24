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
  CircularProgress
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
  Code2
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
  <BaseNodeContainer title="Rule Set" subtitle={data.label} icon={Layers} color="#0f766e" selected={selected}>
    {!data.isEntry && <Handle type="target" position={Position.Top} style={{ background: '#0f766e', width: 10, height: 10 }} />}
    <Box sx={{ bgcolor: '#f8fafc', p: 1, borderRadius: '4px', border: '1px solid #e2e8f0', fontFamily: 'monospace', fontSize: '0.68rem', color: '#334155', maxHeight: 60, overflow: 'hidden' }}>
      {data.payloadScript || data.summary || '// assignment_script();'}
    </Box>
    {!data.isTerminal && <Handle type="source" position={Position.Bottom} style={{ background: '#0f766e', width: 10, height: 10 }} />}
  </BaseNodeContainer>
);

const ConditionalSwitchNode = ({ data, selected }) => (
  <BaseNodeContainer title="Conditional Switch" subtitle={data.label} icon={GitFork} color="#d97706" selected={selected}>
    <Handle type="target" position={Position.Top} style={{ background: '#d97706', width: 10, height: 10 }} />
    <Box sx={{ bgcolor: '#fffbeb', p: 0.75, borderRadius: '4px', border: '1px solid #fef3c7', mb: 1.5 }}>
      <Typography variant="caption" sx={{ color: '#b45309', fontWeight: 700, display: 'block', fontSize: '0.7rem' }}>
        Predicate Router
      </Typography>
    </Box>
    <Box sx={{ display: 'flex', justifyContent: 'space-between', px: 1, pt: 0.5 }}>
      <Box sx={{ position: 'relative' }}>
        <Chip label="TRUE" size="small" sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700, bgcolor: '#dcfce7', color: '#16a34a' }} />
        <Handle
          type="source"
          id="true"
          position={Position.Bottom}
          style={{ left: 16, background: '#16a34a', width: 10, height: 10 }}
        />
      </Box>
      <Box sx={{ position: 'relative' }}>
        <Chip label="DEFAULT" size="small" sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700, bgcolor: '#fee2e2', color: '#dc2626' }} />
        <Handle
          type="source"
          id="false"
          position={Position.Bottom}
          style={{ left: 24, background: '#dc2626', width: 10, height: 10 }}
        />
      </Box>
    </Box>
  </BaseNodeContainer>
);

const DecisionTableNode = ({ data, selected }) => (
  <BaseNodeContainer title="Decision Table" subtitle={data.label} icon={TableIcon} color="#4338ca" selected={selected}>
    <Handle type="target" position={Position.Top} style={{ background: '#4338ca', width: 10, height: 10 }} />
    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', my: 0.75 }}>
      <Chip label={data.hitPolicy || 'FIRST_HIT'} size="small" sx={{ fontSize: '0.65rem', height: 20, bgcolor: '#e0e7ff', color: '#3730a3', fontWeight: 700 }} />
      <Chip label={`${data.rowCount || 4} Relational Rules`} size="small" sx={{ fontSize: '0.65rem', height: 20, bgcolor: '#f1f5f9' }} />
    </Box>
    {data.onOpenMatrix && (
      <Button
        size="small"
        variant="text"
        sx={{ fontSize: '0.72rem', py: 0.2, textTransform: 'none', color: '#4338ca', fontWeight: 700 }}
        onClick={(e) => {
          e.stopPropagation();
          data.onOpenMatrix(data);
        }}
      >
        View Coordinate Matrix &rarr;
      </Button>
    )}
    <Handle type="source" position={Position.Bottom} style={{ background: '#4338ca', width: 10, height: 10 }} />
  </BaseNodeContainer>
);

const UiAdjustmentNode = ({ data, selected }) => (
  <BaseNodeContainer title="UI Adjustment" subtitle={data.label} icon={Sliders} color="#be185d" selected={selected}>
    <Handle type="target" position={Position.Top} style={{ background: '#be185d', width: 10, height: 10 }} />
    <Box sx={{ bgcolor: '#fdf2f8', p: 0.8, borderRadius: '4px', border: '1px solid #fbcfe8', my: 0.5 }}>
      <Typography variant="caption" sx={{ color: '#be185d', fontFamily: 'monospace', fontWeight: 700, fontSize: '0.72rem', display: 'block' }}>
        {data.payloadScript || 'basePremium * 1.15'}
      </Typography>
    </Box>
    <Handle type="source" position={Position.Bottom} style={{ background: '#be185d', width: 10, height: 10 }} />
  </BaseNodeContainer>
);

const NODE_TYPES = {
  RULESET: RulesetNode,
  CONDITIONAL_SWITCH: ConditionalSwitchNode,
  DECISION_TABLE: DecisionTableNode,
  UI_ADJUSTMENT: UiAdjustmentNode
};

// ============================================================================
// 2. MAIN RULEFLOW STUDIO COMPONENT
// ============================================================================

export default function RuleFlowStudio({ apiFetch, selectedTenantId }) {
  const reactFlowWrapper = useRef(null);

  const [flows, setFlows] = useState([]);
  const [selectedFlowId, setSelectedFlowId] = useState(10001);
  const [flowData, setFlowData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);

  // Validation & Execution State
  const [validationResult, setValidationResult] = useState(null);
  const [isValidating, setIsValidating] = useState(false);

  const [simulationOpen, setSimulationOpen] = useState(false);
  const [simulationFacts, setSimulationFacts] = useState(
    JSON.stringify(
      {
        initialRequest: "Fleet Policy Quote",
        driverExperienceYears: 7,
        creditScore: 740,
        fleetSize: 12
      },
      null,
      2
    )
  );
  const [simulationResult, setSimulationResult] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);

  // Decision Table Matrix Viewer State
  const [matrixModalOpen, setMatrixModalOpen] = useState(false);
  const [activeMatrixData, setActiveMatrixData] = useState(null);

  const [alert, setAlert] = useState(null);

  // 1. Load Flows
  const loadFlowList = useCallback(async () => {
    try {
      const data = await apiFetch(`/api/brms/flows?tenantId=${selectedTenantId || 1}`);
      setFlows(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load ruleflows:', err);
    }
  }, [apiFetch, selectedTenantId]);

  // 2. Load Selected Flow Full Graph
  const loadFlowDetails = useCallback(async (id) => {
    setIsLoading(true);
    try {
      const data = await apiFetch(`/api/brms/flows/${id}`);
      setFlowData(data);

      // Hydrate Canvas Nodes & Edges
      if (data.layoutJson && data.layoutJson.trim().length > 10) {
        try {
          const parsed = JSON.parse(data.layoutJson);
          if (parsed.nodes && parsed.edges) {
            setNodes(parsed.nodes);
            setEdges(parsed.edges);
            return;
          }
        } catch (e) {
          console.warn('Failed parsing saved layout JSON, falling back to layout synthesis');
        }
      }

      // Synthesize clean default positions if no custom layout exists
      const defaultPositions = {
        'node-1': { x: 300, y: 50 },
        'node-2': { x: 300, y: 200 },
        'node-3': { x: 300, y: 350 },
        'node-4': { x: 120, y: 520 },
        'node-5': { x: 480, y: 520 }
      };

      const canvasNodes = (data.nodes || []).map((n, idx) => {
        const clientKey = n.clientNodeKey || `node-${n.nodeId}`;
        const pos = defaultPositions[clientKey] || { x: 300, y: 50 + idx * 140 };

        return {
          id: clientKey,
          type: n.nodeType,
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

  useEffect(() => {
    loadFlowList();
  }, [loadFlowList]);

  useEffect(() => {
    if (selectedFlowId) {
      loadFlowDetails(selectedFlowId);
    }
  }, [selectedFlowId, loadFlowDetails]);

  // React Flow Handlers
  const onNodesChange = useCallback((changes) => setNodes((nds) => applyNodeChanges(changes, nds)), []);
  const onEdgesChange = useCallback((changes) => setEdges((eds) => applyEdgeChanges(changes, eds)), []);
  const onConnect = useCallback((connection) => setEdges((eds) => addEdge({ ...connection, animated: true }, eds)), []);

  const onNodeClick = useCallback((_, node) => {
    setSelectedNode(node);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  // Palette Actions
  const handleAddNode = (archetype) => {
    const id = `node-${Date.now()}`;
    const newNode = {
      id,
      type: archetype,
      position: { x: 260 + Math.random() * 80, y: 220 + Math.random() * 80 },
      data: {
        label: `New ${archetype.replace('_', ' ')}`,
        payloadScript: archetype === 'RULESET' ? '// MVEL code\nbasePremium = basePremium * 1.0;' : archetype === 'UI_ADJUSTMENT' ? 'basePremium * 1.10' : undefined,
        hitPolicy: archetype === 'DECISION_TABLE' ? 'FIRST_HIT' : undefined
      }
    };
    setNodes((nds) => nds.concat(newNode));
  };

  const updateSelectedNodeData = (field, value) => {
    if (!selectedNode) return;
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id === selectedNode.id) {
          const updated = { ...n, data: { ...n.data, [field]: value } };
          setSelectedNode(updated);
          return updated;
        }
        return n;
      })
    );
  };

  const handleDeleteSelected = () => {
    if (!selectedNode) return;
    setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id));
    setEdges((eds) => eds.filter((e) => e.source !== selectedNode.id && e.target !== selectedNode.id));
    setSelectedNode(null);
  };

  // 3. Save Canvas Layout
  const handleSaveLayout = async () => {
    try {
      const payload = {
        layoutJson: JSON.stringify({ nodes, edges }),
        zoom: 1.0,
        x: 0.0,
        y: 0.0
      };
      await apiFetch(`/api/brms/flows/${selectedFlowId}/layout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      setAlert({ type: 'success', message: 'RuleFlow visual topology and layout saved to SQL Server.' });
      setTimeout(() => setAlert(null), 3500);
    } catch (err) {
      setAlert({ type: 'error', message: `Save failed: ${err.message}` });
    }
  };

  // 4. Validate Topology (Kahn's Algorithm)
  const handleValidateTopology = async () => {
    setIsValidating(true);
    try {
      const req = {
        nodes: nodes.map(n => ({
          nodeId: n.id,
          nodeType: n.type,
          isEntryNode: Boolean(n.data.isEntry)
        })),
        edges: edges.map(e => ({
          sourceId: e.source,
          targetId: e.target,
          conditionExpression: e.label,
          isDefault: Boolean(e.label === 'Default')
        }))
      };

      const res = await apiFetch(`/api/brms/flows/${selectedFlowId}/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req)
      });
      setValidationResult(res);
    } catch (err) {
      setAlert({ type: 'error', message: `Validation request error: ${err.message}` });
    } finally {
      setIsValidating(false);
    }
  };

  // 5. Test Simulation Execution
  const handleRunSimulation = async () => {
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

  const activeFlowHeader = flows.find(f => f.flowId === Number(selectedFlowId)) || flowData?.header;

  return (
    <Box sx={{ width: '100%', height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
      {/* Top Header & Flow Selector Ribbon */}
      <Paper elevation={0} sx={{ p: 2, borderBottom: '1px solid #e2e8f0', bgcolor: '#ffffff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ p: 1, bgcolor: '#0f172a', color: '#ffffff', borderRadius: 2 }}>
            <GitFork size={22} color="#38bdf8" />
          </Box>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="h6" sx={{ fontSize: '1.15rem', fontWeight: 700 }}>
                {activeFlowHeader?.flowName || 'RuleFlow Visualizer & Execution Platform'}
              </Typography>
              <Chip
                label={activeFlowHeader?.status || 'ACTIVE'}
                size="small"
                sx={{ bgcolor: '#dcfce7', color: '#15803d', fontWeight: 700, fontSize: '0.7rem', height: 20 }}
              />
              <Chip
                label={`v${activeFlowHeader?.version || 1}`}
                size="small"
                sx={{ bgcolor: '#f1f5f9', color: '#475569', fontWeight: 600, fontSize: '0.7rem', height: 20 }}
              />
            </Box>
            <Typography variant="caption" sx={{ color: '#64748b' }}>
              {activeFlowHeader?.description || 'Coordinate matrix decision tables, MVEL conditional switches, and discretionary premium modifier rules'}
            </Typography>
          </Box>
        </Box>

        {/* Global Toolbar Actions */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
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
            sx={{ bgcolor: '#16a34a', '&:hover': { bgcolor: '#15803d' } }}
            startIcon={<Play size={16} />}
            onClick={() => setSimulationOpen(true)}
          >
            Simulate Execution
          </Button>

          <Button
            variant="contained"
            size="small"
            sx={{ bgcolor: '#0f172a', '&:hover': { bgcolor: '#1e293b' } }}
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
          sx={{ m: 1.5, position: 'absolute', top: 130, left: 24, zIndex: 100, boxShadow: 3 }}
          onClose={() => setAlert(null)}
        >
          {alert.message}
        </Alert>
      )}

      {/* Validation Banner if checked */}
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

      {/* Main Canvas Workspace */}
      <Box sx={{ flex: 1, position: 'relative', bgcolor: '#f8fafc' }} ref={reactFlowWrapper}>
        {isLoading ? (
          <Box sx={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
            <CircularProgress size={28} />
            <Typography variant="body2" sx={{ color: '#64748b' }}>Hydrating RuleFlow Graph from SQL Server...</Typography>
          </Box>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={NODE_TYPES}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            fitView
          >
            <Background color="#cbd5e1" gap={18} size={1.2} />
            <Controls />
            <MiniMap nodeStrokeWidth={3} zoomable pannable style={{ border: '1px solid #cbd5e1', borderRadius: 8 }} />

            {/* In-Canvas Archetype Palette Panel */}
            <Panel position="top-left" style={{ margin: 16 }}>
              <Paper elevation={3} sx={{ p: 1, display: 'flex', alignItems: 'center', gap: 1, borderRadius: '8px' }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: '#475569', px: 0.5 }}>
                  ADD NODE:
                </Typography>
                <Tooltip title="MVEL Assignment & Computation Script">
                  <Button
                    size="small"
                    variant="outlined"
                    sx={{ borderColor: '#0f766e', color: '#0f766e', fontWeight: 600, fontSize: '0.74rem' }}
                    startIcon={<Layers size={14} />}
                    onClick={() => handleAddNode('RULESET')}
                  >
                    RuleSet
                  </Button>
                </Tooltip>
                <Tooltip title="2D Coordinate Relational Decision Matrix">
                  <Button
                    size="small"
                    variant="outlined"
                    sx={{ borderColor: '#4338ca', color: '#4338ca', fontWeight: 600, fontSize: '0.74rem' }}
                    startIcon={<TableIcon size={14} />}
                    onClick={() => handleAddNode('DECISION_TABLE')}
                  >
                    Decision Table
                  </Button>
                </Tooltip>
                <Tooltip title="Conditional Predicate Multi-Branch Gateway">
                  <Button
                    size="small"
                    variant="outlined"
                    sx={{ borderColor: '#d97706', color: '#d97706', fontWeight: 600, fontSize: '0.74rem' }}
                    startIcon={<GitFork size={14} />}
                    onClick={() => handleAddNode('CONDITIONAL_SWITCH')}
                  >
                    Switch
                  </Button>
                </Tooltip>
                <Tooltip title="Underwriting Modifiers & Schedule Debits (BigDecimal)">
                  <Button
                    size="small"
                    variant="outlined"
                    sx={{ borderColor: '#be185d', color: '#be185d', fontWeight: 600, fontSize: '0.74rem' }}
                    startIcon={<Sliders size={14} />}
                    onClick={() => handleAddNode('UI_ADJUSTMENT')}
                  >
                    Adjustment
                  </Button>
                </Tooltip>
              </Paper>
            </Panel>
          </ReactFlow>
        )}

        {/* Node Properties Inspector Drawer */}
        <Drawer
          anchor="right"
          open={Boolean(selectedNode)}
          variant="persistent"
          PaperProps={{ sx: { width: 360, p: 3, top: 120, height: 'calc(100% - 120px)', borderLeft: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' } }}
        >
          {selectedNode && (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 700 }}>
                  Node Inspector
                </Typography>
                <IconButton size="small" color="error" onClick={handleDeleteSelected}>
                  <Trash2 size={16} />
                </IconButton>
              </Box>

              <Chip
                label={selectedNode.type}
                size="small"
                sx={{
                  fontWeight: 700,
                  mb: 2.5,
                  bgcolor: selectedNode.type === 'RULESET' ? '#ccfbf1' : selectedNode.type === 'DECISION_TABLE' ? '#e0e7ff' : selectedNode.type === 'CONDITIONAL_SWITCH' ? '#fef3c7' : '#fce7f3',
                  color: selectedNode.type === 'RULESET' ? '#0f766e' : selectedNode.type === 'DECISION_TABLE' ? '#4338ca' : selectedNode.type === 'CONDITIONAL_SWITCH' ? '#b45309' : '#be185d'
                }}
              />

              <TextField
                fullWidth
                label="Node Name / Label"
                size="small"
                value={selectedNode.data.label || ''}
                onChange={(e) => updateSelectedNodeData('label', e.target.value)}
                sx={{ mb: 2 }}
              />

              {selectedNode.type === 'RULESET' && (
                <TextField
                  fullWidth
                  multiline
                  rows={6}
                  label="MVEL Script Payload"
                  size="small"
                  value={selectedNode.data.payloadScript || ''}
                  onChange={(e) => updateSelectedNodeData('payloadScript', e.target.value)}
                  sx={{ mb: 2, '& .MuiInputBase-input': { fontFamily: 'monospace', fontSize: '0.8rem' } }}
                />
              )}

              {selectedNode.type === 'DECISION_TABLE' && (
                <Box sx={{ mb: 2 }}>
                  <TextField
                    select
                    fullWidth
                    label="Hit Policy"
                    size="small"
                    value={selectedNode.data.hitPolicy || 'FIRST_HIT'}
                    SelectProps={{ native: true }}
                    onChange={(e) => updateSelectedNodeData('hitPolicy', e.target.value)}
                    sx={{ mb: 2 }}
                  >
                    <option value="FIRST_HIT">FIRST_HIT (Priority Row Order)</option>
                    <option value="ALL_HITS">ALL_HITS (Accumulative Multi-Action)</option>
                    <option value="COLLECT_MIN">COLLECT_MIN (Lowest Factor)</option>
                    <option value="COLLECT_MAX">COLLECT_MAX (Highest Surcharge)</option>
                  </TextField>

                  <Button
                    fullWidth
                    variant="outlined"
                    sx={{ borderColor: '#4338ca', color: '#4338ca', fontWeight: 600 }}
                    startIcon={<TableIcon size={16} />}
                    onClick={() => {
                      const dt = (flowData?.decisionTables || []).find(t => t.nodeId === selectedNode.data.dbNodeId) || (flowData?.decisionTables || [])[0];
                      setActiveMatrixData(dt);
                      setMatrixModalOpen(true);
                    }}
                  >
                    Configure Coordinate Matrix
                  </Button>
                </Box>
              )}

              {selectedNode.type === 'UI_ADJUSTMENT' && (
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="Modifier Expression (BigDecimal)"
                  size="small"
                  value={selectedNode.data.payloadScript || 'basePremium * (1.00 + 0.15)'}
                  onChange={(e) => updateSelectedNodeData('payloadScript', e.target.value)}
                  sx={{ mb: 2, '& .MuiInputBase-input': { fontFamily: 'monospace', fontSize: '0.8rem' } }}
                />
              )}

              <Divider sx={{ my: 2 }} />
              <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block' }}>
                Key: <code>{selectedNode.id}</code>
              </Typography>
              <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block' }}>
                DB ID: <code>{selectedNode.data.dbNodeId || 'Transient'}</code>
              </Typography>
            </Box>
          )}
        </Drawer>
      </Box>

      {/* MODAL 1: TEST SIMULATION & COMPLIANCE AUDIT TRACE */}
      <Dialog open={simulationOpen} onClose={() => setSimulationOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Zap size={20} color="#16a34a" />
          RuleFlow Simulation &amp; Regulatory Audit Runner
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={3}>
            {/* Input Facts Editor */}
            <Grid size={{ xs: 12, md: 5 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                Input Working Memory (JSON Facts)
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={12}
                value={simulationFacts}
                onChange={(e) => setSimulationFacts(e.target.value)}
                sx={{ '& .MuiInputBase-input': { fontFamily: 'monospace', fontSize: '0.8rem' } }}
              />
              <Button
                variant="contained"
                fullWidth
                sx={{ mt: 2, bgcolor: '#16a34a', '&:hover': { bgcolor: '#15803d' } }}
                startIcon={<Play size={16} />}
                disabled={isSimulating}
                onClick={handleRunSimulation}
              >
                {isSimulating ? 'Executing RuleFlow...' : 'Run BRMS Engine'}
              </Button>
            </Grid>

            {/* Execution Audit Trail & Final Facts */}
            <Grid size={{ xs: 12, md: 7 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                Step-by-Step Chronological Audit Trail
              </Typography>

              {!simulationResult ? (
                <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', bgcolor: '#f8fafc', color: '#94a3b8' }}>
                  Click &quot;Run BRMS Engine&quot; to test graph execution.
                </Paper>
              ) : (
                <Box sx={{ maxHeight: 420, overflowY: 'auto' }}>
                  <Box sx={{ display: 'flex', gap: 1, mb: 2, alignItems: 'center' }}>
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
                        <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.82rem' }}>
                          Step #{step.stepIndex}: {step.nodeName}
                        </Typography>
                        <Chip label={step.nodeType} size="small" sx={{ fontSize: '0.62rem', height: 18 }} />
                      </Box>
                      <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mb: 0.5 }}>
                        {step.evaluationSummary}
                      </Typography>
                      <Box sx={{ bgcolor: '#f1f5f9', p: 0.8, borderRadius: 1, fontFamily: 'monospace', fontSize: '0.7rem' }}>
                        <div>Duration: {(step.executionTimeNanos / 1000000).toFixed(3)} ms</div>
                      </Box>
                    </Paper>
                  ))}

                  {/* Final Facts Output */}
                  <Typography variant="caption" sx={{ fontWeight: 700, color: '#475569', display: 'block', mt: 2, mb: 1 }}>
                    FINAL WORKING MEMORY:
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

      {/* MODAL 2: 2D COORDINATE MATRIX VIEWER */}
      <Dialog open={matrixModalOpen} onClose={() => setMatrixModalOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
          <TableIcon size={20} color="#4338ca" />
          Coordinate Matrix Decision Table: {activeMatrixData?.tableName || 'Fleet Relativity Matrix'}
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ color: '#475569', mb: 1 }}>
              Evaluates insurance rating conditions using high-precision range translation: <code>[Min..Max)</code>, <code>&gt;= X</code>, <code>&lt; X</code> crossing at relational coordinate cells.
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Chip label={`Hit Policy: ${activeMatrixData?.hitPolicy || 'FIRST_HIT'}`} size="small" sx={{ fontWeight: 700, bgcolor: '#e0e7ff', color: '#3730a3' }} />
              <Chip label={`Table Code: ${activeMatrixData?.tableCode || 'DT_FLEET_RELATIVITY'}`} size="small" />
            </Box>
          </Box>

          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead sx={{ bgcolor: '#f1f5f9' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, width: 60 }}>#</TableCell>
                  {(activeMatrixData?.columns || [
                    { DisplayName: 'Driver Experience (Yrs)', ColumnType: 'CONDITION' },
                    { DisplayName: 'Commercial Credit Score', ColumnType: 'CONDITION' },
                    { DisplayName: 'Fleet Relativity Factor', ColumnType: 'ACTION' }
                  ]).map((c, i) => (
                    <TableCell key={i} sx={{ fontWeight: 700, color: c.ColumnType === 'ACTION' ? '#4338ca' : '#0f172a' }}>
                      {c.DisplayName}
                      <Chip
                        label={c.ColumnType}
                        size="small"
                        sx={{ ml: 1, height: 16, fontSize: '0.6rem', bgcolor: c.ColumnType === 'ACTION' ? '#e0e7ff' : '#e2e8f0' }}
                      />
                    </TableCell>
                  ))}
                  <TableCell sx={{ fontWeight: 700 }}>Description</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(activeMatrixData?.rows || [
                  { RowIndex: 1, RuleDescription: 'High Risk: Novice driver with adverse credit' },
                  { RowIndex: 2, RuleDescription: 'Standard Risk: Moderate experience with fair credit' },
                  { RowIndex: 3, RuleDescription: 'Preferred Risk: Experienced commercial driver with good credit' },
                  { RowIndex: 4, RuleDescription: 'Elite Veteran: 10+ years commercial clean history' }
                ]).map((row, rIdx) => {
                  // Coordinate lookup sample values
                  const sampleCells = [
                    ['[0..3)', '< 650', '1.450'],
                    ['[3..6)', '[650..720)', '1.150'],
                    ['[6..10)', '>= 720', '0.950'],
                    ['>= 10', 'ANY', '0.850']
                  ];
                  const cells = sampleCells[rIdx] || ['ANY', 'ANY', '1.000'];

                  return (
                    <TableRow key={row.RowIndex} sx={{ '&:hover': { bgcolor: '#f8fafc' } }}>
                      <TableCell sx={{ fontWeight: 700, color: '#64748b' }}>{row.RowIndex}</TableCell>
                      {cells.map((val, cIdx) => (
                        <TableCell key={cIdx} sx={{ fontFamily: 'monospace', fontWeight: cIdx === 2 ? 700 : 500, color: cIdx === 2 ? '#4338ca' : '#0f172a' }}>
                          {val}
                        </TableCell>
                      ))}
                      <TableCell sx={{ color: '#64748b', fontSize: '0.8rem' }}>{row.RuleDescription}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMatrixModalOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
