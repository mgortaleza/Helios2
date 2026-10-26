import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  FormControlLabel,
  Slider
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
  Search,
  FileText,
  Calendar,
  Clock,
  ArrowRight,
  PlusCircle
} from 'lucide-react';

// ============================================================================
// 1. CUSTOM REACT FLOW NODE RENDERERS FOR DROOLS
// ============================================================================

const BaseNodeContainer = ({ title, subtitle, icon: Icon, color, selected, children }) => (
  <Paper
    elevation={selected ? 8 : 2}
    sx={{
      minWidth: 250,
      maxWidth: 290,
      borderRadius: '8px',
      border: `2px solid ${selected ? '#2563eb' : color}`,
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
        gap: 1
      }}
    >
      {Icon && <Icon size={16} />}
      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.85rem', lineHeight: 1.2 }} noWrap>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="caption" sx={{ opacity: 0.9, fontSize: '0.7rem', display: 'block' }} noWrap>
            {subtitle}
          </Typography>
        )}
      </Box>
    </Box>
    <Box sx={{ p: 1.5, fontSize: '0.78rem', color: '#334155' }}>
      {children}
    </Box>
  </Paper>
);

const DroolsStartNode = ({ data, selected }) => (
  <Box sx={{ position: 'relative' }}>
    <BaseNodeContainer
      title={data.label || 'Start Policy Submission'}
      subtitle="Working Memory Fact Injection"
      icon={Play}
      color="#059669"
      selected={selected}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        <Typography variant="caption" sx={{ color: '#047857', fontWeight: 600 }}>
          Initial Facts Context:
        </Typography>
        <Typography variant="caption" sx={{ color: '#64748b', fontFamily: 'monospace' }}>
          Quote, Insured, Rating Factors
        </Typography>
        <Chip label="Drools Entrypoint" size="small" sx={{ alignSelf: 'flex-start', mt: 0.5, height: 18, fontSize: '0.65rem', bgcolor: '#d1fae5', color: '#065f46' }} />
      </Box>
    </BaseNodeContainer>
    <Handle type="source" position={Position.Right} style={{ background: '#059669', width: 10, height: 10 }} />
  </Box>
);

const DroolsRuleGroupNode = ({ data, selected }) => (
  <Box sx={{ position: 'relative' }}>
    <Handle type="target" position={Position.Left} style={{ background: '#7c3aed', width: 10, height: 10 }} />
    <BaseNodeContainer
      title={data.label || 'RuleFlow Group'}
      subtitle={data.ruleflowGroup ? `group: ${data.ruleflowGroup}` : 'Drools Ruleflow-Group'}
      icon={Workflow}
      color="#7c3aed"
      selected={selected}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="caption" sx={{ fontWeight: 600, color: '#6d28d9' }}>
            Salience Priority:
          </Typography>
          <Chip label="Salience 100" size="small" sx={{ height: 18, fontSize: '0.65rem', bgcolor: '#ede9fe', color: '#5b21b6' }} />
        </Box>
        <Typography variant="caption" sx={{ color: '#64748b' }} noWrap>
          Rules: {data.rulesCount || 2} active LHS/RHS rules
        </Typography>
        <Typography variant="caption" sx={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '0.7rem' }}>
          Agenda group evaluation
        </Typography>
      </Box>
    </BaseNodeContainer>
    <Handle type="source" position={Position.Right} style={{ background: '#7c3aed', width: 10, height: 10 }} />
  </Box>
);

const DroolsDecisionTableNode = ({ data, selected }) => (
  <Box sx={{ position: 'relative' }}>
    <Handle type="target" position={Position.Left} style={{ background: '#0284c7', width: 10, height: 10 }} />
    <BaseNodeContainer
      title={data.label || 'Decision Table Matrix'}
      subtitle={data.tableCode || 'Coordinate Grid (DR_)'}
      icon={TableIcon}
      color="#0284c7"
      selected={selected}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="caption" sx={{ fontWeight: 600, color: '#0369a1' }}>
            Hit Policy:
          </Typography>
          <Chip label="FIRST_MATCH" size="small" sx={{ height: 18, fontSize: '0.65rem', bgcolor: '#e0f2fe', color: '#0369a1' }} />
        </Box>
        <Typography variant="caption" sx={{ color: '#64748b' }}>
          Table: {data.tableCode || 'DT_CYBER_POSTURE'}
        </Typography>
        <Typography variant="caption" sx={{ color: '#0284c7', fontWeight: 500, fontSize: '0.72rem' }}>
          4 Condition & Action Rows
        </Typography>
      </Box>
    </BaseNodeContainer>
    <Handle type="source" position={Position.Right} style={{ background: '#0284c7', width: 10, height: 10 }} />
  </Box>
);

const DroolsConditionalSplitNode = ({ data, selected }) => (
  <Box sx={{ position: 'relative' }}>
    <Handle type="target" position={Position.Left} style={{ background: '#d97706', width: 10, height: 10 }} />
    <BaseNodeContainer
      title={data.label || 'Conditional Switch'}
      subtitle="Fact Pattern Branching"
      icon={GitBranch}
      color="#d97706"
      selected={selected}
    >
      <Typography variant="caption" sx={{ color: '#b45309', fontWeight: 500 }}>
        Branches on MVEL / Drools LHS:
      </Typography>
      <Typography variant="caption" sx={{ display: 'block', color: '#64748b', fontSize: '0.7rem', mt: 0.5 }}>
        • Standard Binding (Low Risk)
      </Typography>
      <Typography variant="caption" sx={{ display: 'block', color: '#dc2626', fontSize: '0.7rem' }}>
        • Underwriter Referral (High Risk)
      </Typography>
    </BaseNodeContainer>
    <Handle type="source" position={Position.Right} id="branch-1" style={{ top: '35%', background: '#d97706', width: 10, height: 10 }} />
    <Handle type="source" position={Position.Right} id="branch-2" style={{ top: '65%', background: '#d97706', width: 10, height: 10 }} />
  </Box>
);

const DroolsFormApprovalNode = ({ data, selected }) => (
  <Box sx={{ position: 'relative' }}>
    <Handle type="target" position={Position.Left} style={{ background: '#4f46e5', width: 10, height: 10 }} />
    <BaseNodeContainer
      title={data.label || 'Forms State Approval Resolver'}
      subtitle="DOI Filing & SERFF Verification"
      icon={ShieldCheck}
      color="#4f46e5"
      selected={selected}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        <Typography variant="caption" sx={{ color: '#4338ca', fontWeight: 600 }}>
          State Catalog Integration:
        </Typography>
        <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.7rem' }}>
          Filters DR_FORM_STATE_APPROVAL by Target State & Effective Date.
        </Typography>
        <Chip label="DOI Verified Forms" size="small" sx={{ alignSelf: 'flex-start', mt: 0.5, height: 18, fontSize: '0.65rem', bgcolor: '#e0e7ff', color: '#3730a3' }} />
      </Box>
    </BaseNodeContainer>
    <Handle type="source" position={Position.Right} style={{ background: '#4f46e5', width: 10, height: 10 }} />
  </Box>
);

const DroolsActionScriptNode = ({ data, selected }) => (
  <Box sx={{ position: 'relative' }}>
    <Handle type="target" position={Position.Left} style={{ background: '#e11d48', width: 10, height: 10 }} />
    <BaseNodeContainer
      title={data.label || 'Underwriter Referral Gate'}
      subtitle="Consequence Script Execution"
      icon={Zap}
      color="#e11d48"
      selected={selected}
    >
      <Typography variant="caption" sx={{ color: '#be123c', fontWeight: 600 }}>
        RHS Consequence:
      </Typography>
      <Typography variant="caption" sx={{ display: 'block', color: '#64748b', fontFamily: 'monospace', fontSize: '0.7rem' }}>
        facts.referralRequired = true;
      </Typography>
    </BaseNodeContainer>
    <Handle type="source" position={Position.Right} style={{ background: '#e11d48', width: 10, height: 10 }} />
  </Box>
);

const DroolsEndNode = ({ data, selected }) => (
  <Box sx={{ position: 'relative' }}>
    <Handle type="target" position={Position.Left} style={{ background: '#0f172a', width: 10, height: 10 }} />
    <BaseNodeContainer
      title={data.label || 'Policy Binding Terminal'}
      subtitle="Final Rating & Forms Bound"
      icon={CheckCircle2}
      color="#0f172a"
      selected={selected}
    >
      <Typography variant="caption" sx={{ color: '#334155', fontWeight: 600 }}>
        Execution Complete:
      </Typography>
      <Typography variant="caption" sx={{ display: 'block', color: '#64748b', fontSize: '0.7rem' }}>
        Rated Premium + Approved Attached Policy Forms Package
      </Typography>
    </BaseNodeContainer>
  </Box>
);

const nodeTypes = {
  START: DroolsStartNode,
  RULEFLOW_GROUP: DroolsRuleGroupNode,
  DECISION_TABLE: DroolsDecisionTableNode,
  CONDITIONAL_SPLIT: DroolsConditionalSplitNode,
  FORM_APPROVAL: DroolsFormApprovalNode,
  ACTION_SCRIPT: DroolsActionScriptNode,
  END: DroolsEndNode
};

// ============================================================================
// 2. MAIN DROOLS RULEFLOW STUDIO COMPONENT
// ============================================================================

export default function DroolsRuleFlowStudio({ apiFetch, selectedTenantId }) {
  // Flows state
  const [flows, setFlows] = useState([]);
  const [selectedFlowId, setSelectedFlowId] = useState(null);
  const [fullFlow, setFullFlow] = useState(null);
  const [loading, setLoading] = useState(false);
  const [savingLayout, setSavingLayout] = useState(false);

  // React Flow state
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);

  // NODE EDITOR DRAWER STATE
  const [openNodeDrawer, setOpenNodeDrawer] = useState(false);
  const [nodeFormData, setNodeFormData] = useState({
    nodeKey: '',
    nodeName: '',
    nodeType: 'RULEFLOW_GROUP',
    ruleflowGroup: '',
    executionOrder: 1,
    configJson: '{}'
  });
  const [savingNode, setSavingNode] = useState(false);
  const [deletingNode, setDeletingNode] = useState(false);

  // RULE EDITOR MODAL FOR RULEFLOW GROUP
  const [openAddRuleModal, setOpenAddRuleModal] = useState(false);
  const [ruleFormData, setRuleFormData] = useState({
    ruleId: 0,
    ruleName: '',
    ruleflowGroup: '',
    salience: 50,
    noLoop: true,
    whenCondition: '$f : Map(this["revenue"] != null)',
    thenConsequence: '$f.put("evaluated", true);',
    effectiveDate: '2025-01-01',
    expirationDate: '2027-12-31'
  });

  // EDGE EDITOR DRAWER STATE
  const [openEdgeDrawer, setOpenEdgeDrawer] = useState(false);
  const [edgeFormData, setEdgeFormData] = useState({
    edgeKey: '',
    routingLabel: '',
    conditionExpression: '',
    sourceNodeKey: '',
    targetNodeKey: ''
  });

  // Modals & Drawers
  const [openDrlModal, setOpenDrlModal] = useState(false);
  const [drlCode, setDrlCode] = useState('');
  const [loadingDrl, setLoadingDrl] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // Forms State Approval Modal & Add/Edit State
  const [openFormsModal, setOpenFormsModal] = useState(false);
  const [formsList, setFormsList] = useState([]);
  const [formsProductFilter, setFormsProductFilter] = useState('TECH_EO');
  const [formsStateFilter, setFormsStateFilter] = useState('ALL');
  const [openFormEditModal, setOpenFormEditModal] = useState(false);
  const [formFormData, setFormFormData] = useState({
    formApprovalId: null,
    productCode: 'TECH_EO',
    stateCode: 'CA',
    formNumber: '',
    formName: '',
    formEdition: '01-25',
    attachmentType: 'MANDATORY',
    approvalStatus: 'APPROVED',
    doiFilingNumber: '',
    serffTrackingNo: '',
    effectiveDate: '2025-01-01',
    expirationDate: '',
    mandatoryCriteria: '',
    exclusionCriteria: ''
  });

  // Rating Plans Modal & Add/Edit State
  const [openRatingPlansModal, setOpenRatingPlansModal] = useState(false);
  const [ratingPlansList, setRatingPlansList] = useState([]);
  const [openPlanEditModal, setOpenPlanEditModal] = useState(false);
  const [planFormData, setPlanFormData] = useState({
    planConfigId: null,
    planCode: '',
    productCode: 'TECH_EO',
    stateCode: 'CA',
    planName: '',
    exposureUnit: '$1,000 Gross Revenue',
    baseLossCost: 10.0,
    minPremium: 1000,
    maxScheduleDebit: 0.25,
    maxScheduleCredit: 0.25,
    version: '2025.1',
    status: 'ACTIVE',
    effectiveDate: '2025-01-01',
    expirationDate: ''
  });

  // Edit Flow Header Modal State
  const [openEditFlowModal, setOpenEditFlowModal] = useState(false);
  const [editFlowData, setEditFlowData] = useState({
    flowName: '',
    description: '',
    productCode: '',
    planCode: '',
    stateCode: '',
    version: '',
    status: 'ACTIVE',
    effectiveDate: '2025-01-01',
    expirationDate: '',
    serffTrackingNo: ''
  });

  // Decision Table Coordinate Matrix Modal State
  const [openDecisionMatrixModal, setOpenDecisionMatrixModal] = useState(false);
  const [activeTableId, setActiveTableId] = useState(null);
  const [editingRowCells, setEditingRowCells] = useState({});
  const [openAddColModal, setOpenAddColModal] = useState(false);
  const [newColData, setNewColData] = useState({
    columnType: 'CONDITION',
    headerLabel: '',
    propertyPath: 'facts.mfaEnforced',
    operator: 'EQUALS',
    dataType: 'BOOLEAN',
    colIndex: 1
  });
  const [openTableConfigModal, setOpenTableConfigModal] = useState(false);
  const [tableConfigData, setTableConfigData] = useState({
    tableId: null,
    nodeId: null,
    tableCode: '',
    tableName: '',
    ruleflowGroup: '',
    hitPolicy: 'FIRST',
    description: ''
  });

  const [openCloneModal, setOpenCloneModal] = useState(false);
  const [cloneVersion, setCloneVersion] = useState('');
  const [cloneEffDate, setCloneEffDate] = useState('2025-07-01');
  const [cloneExpDate, setCloneExpDate] = useState('2027-12-31');

  const [openNewFlowModal, setOpenNewFlowModal] = useState(false);
  const [newFlowData, setNewFlowData] = useState({
    flowCode: 'DR_MED_MAL_RATING_FLOW',
    flowName: 'Medical Malpractice Primary Rating & Forms Approval Flow',
    description: 'Physicians & Surgeons professional liability rating with state MICRA endorsements.',
    productCode: 'MED_MAL',
    planCode: 'MED_MAL_PRIMARY',
    stateCode: 'ALL',
    version: '2025.1',
    effectiveDate: '2025-01-01',
    expirationDate: '2027-12-31',
    serffTrackingNo: 'SERFF-MED-2025-01'
  });

  // Simulation Drawer state
  const [openSimDrawer, setOpenSimDrawer] = useState(false);
  const [simRunning, setSimRunning] = useState(false);
  const [simResult, setSimResult] = useState(null);
  const [simFacts, setSimFacts] = useState({
    state: 'CA',
    productCode: 'TECH_EO',
    planCode: 'TECH_EO_COMMERCIAL',
    effectiveDate: '2025-03-01',
    revenue: 5000000,
    limit: 2000000,
    deductible: 25000,
    hasCyber: true,
    mfaEnforced: true,
    hasEDR: true,
    hasPriorActs: true,
    retroactiveDate: '2020-01-01',
    scheduleMod: 0.05
  });

  // --------------------------------------------------------------------------
  // API Fetch Utilities
  // --------------------------------------------------------------------------

  const loadFlows = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiFetch('/api/drools/flows');
      setFlows(res || []);
      if (res && res.length > 0 && !selectedFlowId) {
        setSelectedFlowId(res[0].flowId);
      }
    } catch (err) {
      console.error('Error loading Drools flows:', err);
    } finally {
      setLoading(false);
    }
  }, [apiFetch, selectedFlowId]);

  useEffect(() => {
    loadFlows();
  }, [loadFlows]);

  const loadFullFlow = useCallback(async (id) => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await apiFetch(`/api/drools/flows/${id}`);
      setFullFlow(data);

      let layoutMap = {};
      if (data.layoutJson) {
        try {
          const parsed = JSON.parse(data.layoutJson);
          if (parsed && typeof parsed === 'object') {
            layoutMap = parsed;
          }
        } catch (e) {
          console.warn('Failed to parse layoutJson', e);
        }
      }

      const rfNodes = (data.nodes || []).map((n, idx) => {
        let x = 100 + (idx * 260);
        let y = 200;
        if (n.configJson) {
          try {
            const cfg = JSON.parse(n.configJson);
            if (cfg.x !== undefined) x = cfg.x;
            if (cfg.y !== undefined) y = cfg.y;
          } catch (e) {}
        }
        if (layoutMap[n.nodeKey]) {
          x = layoutMap[n.nodeKey].x;
          y = layoutMap[n.nodeKey].y;
        }

        return {
          id: n.nodeKey,
          type: n.nodeType,
          position: { x, y },
          data: {
            label: n.nodeName,
            nodeType: n.nodeType,
            ruleflowGroup: n.ruleflowGroup,
            nodeId: n.nodeId,
            rulesCount: (data.rules || []).filter(r => r.ruleflowGroup === n.ruleflowGroup).length,
            configJson: n.configJson,
            executionOrder: n.executionOrder
          }
        };
      });

      const rfEdges = (data.edges || []).map(e => ({
        id: e.edgeKey,
        source: e.sourceNodeKey,
        target: e.targetNodeKey,
        sourceHandle: e.sourceHandle,
        targetHandle: e.targetHandle,
        label: e.routingLabel || (e.conditionExpression ? `[${e.conditionExpression}]` : ''),
        style: { stroke: e.routingLabel === 'Underwriter Referral' ? '#e11d48' : '#2563eb', strokeWidth: 2 },
        animated: e.routingLabel === 'Underwriter Referral',
        data: {
          conditionExpression: e.conditionExpression,
          routingLabel: e.routingLabel
        }
      }));

      setNodes(rfNodes);
      setEdges(rfEdges);
    } catch (err) {
      console.error('Error fetching full Drools flow:', err);
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    if (selectedFlowId) {
      loadFullFlow(selectedFlowId);
    }
  }, [selectedFlowId, loadFullFlow]);

  // ReactFlow event handlers
  const onNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );
  const onEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  const onConnect = useCallback(
    async (params) => {
      const edgeKey = `e-${Date.now().toString().slice(-6)}`;
      const newEdge = {
        id: edgeKey,
        source: params.source,
        target: params.target,
        sourceHandle: params.sourceHandle,
        targetHandle: params.targetHandle,
        style: { stroke: '#2563eb', strokeWidth: 2 }
      };
      setEdges((eds) => addEdge(newEdge, eds));

      if (selectedFlowId) {
        try {
          await apiFetch(`/api/drools/flows/${selectedFlowId}/edges`, {
            method: 'POST',
            body: JSON.stringify({
              edgeKey,
              sourceNodeKey: params.source,
              targetNodeKey: params.target,
              sourceHandle: params.sourceHandle,
              targetHandle: params.targetHandle,
              routingLabel: '',
              conditionExpression: ''
            })
          });
        } catch (err) {
          console.error('Failed to persist new edge:', err);
        }
      }
    },
    [apiFetch, selectedFlowId]
  );

  // CLICK NODE TO EDIT
  const onNodeClick = (_, node) => {
    setSelectedNode(node);
    setNodeFormData({
      nodeKey: node.id,
      nodeName: node.data.label || '',
      nodeType: node.type || 'RULEFLOW_GROUP',
      ruleflowGroup: node.data.ruleflowGroup || '',
      executionOrder: node.data.executionOrder || 1,
      configJson: node.data.configJson || '{}'
    });
    setOpenNodeDrawer(true);
  };

  // CLICK EDGE TO EDIT
  const onEdgeClick = (_, edge) => {
    setEdgeFormData({
      edgeKey: edge.id,
      routingLabel: edge.data?.routingLabel || edge.label || '',
      conditionExpression: edge.data?.conditionExpression || '',
      sourceNodeKey: edge.source,
      targetNodeKey: edge.target
    });
    setOpenEdgeDrawer(true);
  };

  // --------------------------------------------------------------------------
  // ADD & EDIT NODE ACTIONS (DR_RULE_NODE)
  // --------------------------------------------------------------------------

  const handleCreateNode = async (archetype) => {
    if (!selectedFlowId) return;
    try {
      setLoading(true);
      const uniqueSuffix = Date.now().toString().slice(-4);
      const nodeKey = `node-${uniqueSuffix}`;

      let defaultName = 'New Rule Node';
      let defaultGroup = '';
      if (archetype === 'RULEFLOW_GROUP') {
        defaultName = `Ruleset Gate ${uniqueSuffix}`;
        defaultGroup = `Group_${uniqueSuffix}`;
      } else if (archetype === 'DECISION_TABLE') {
        defaultName = `Relativity Matrix ${uniqueSuffix}`;
        defaultGroup = `Matrix_Group_${uniqueSuffix}`;
      } else if (archetype === 'CONDITIONAL_SPLIT') {
        defaultName = 'Branching Decision Switch';
      } else if (archetype === 'FORM_APPROVAL') {
        defaultName = 'State DOI Form Attachment Gate';
        defaultGroup = 'Forms_State_Approval_Group';
      } else if (archetype === 'ACTION_SCRIPT') {
        defaultName = 'Referral Action Consequence';
      } else if (archetype === 'END') {
        defaultName = 'Terminal Policy Binding';
      }

      const x = 300 + (nodes.length * 40);
      const y = 200 + (nodes.length % 3 * 60);
      const configJson = JSON.stringify({ x, y });

      const payload = {
        nodeKey,
        nodeName: defaultName,
        nodeType: archetype,
        ruleflowGroup: defaultGroup,
        executionOrder: nodes.length + 1,
        configJson
      };

      await apiFetch(`/api/drools/flows/${selectedFlowId}/nodes`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      await loadFullFlow(selectedFlowId);

      // Open drawer immediately to edit new node
      setNodeFormData(payload);
      setOpenNodeDrawer(true);
    } catch (err) {
      console.error('Error creating node:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNodeChanges = async () => {
    if (!selectedFlowId || !nodeFormData.nodeKey) return;
    try {
      setSavingNode(true);
      await apiFetch(`/api/drools/flows/${selectedFlowId}/nodes`, {
        method: 'POST',
        body: JSON.stringify(nodeFormData)
      });
      await loadFullFlow(selectedFlowId);
      setOpenNodeDrawer(false);
    } catch (err) {
      console.error('Error updating node:', err);
    } finally {
      setSavingNode(false);
    }
  };

  const handleDeleteNode = async () => {
    if (!selectedFlowId || !nodeFormData.nodeKey) return;
    try {
      setDeletingNode(true);
      await apiFetch(`/api/drools/flows/${selectedFlowId}/nodes/${nodeFormData.nodeKey}`, {
        method: 'DELETE'
      });
      setOpenNodeDrawer(false);
      await loadFullFlow(selectedFlowId);
    } catch (err) {
      console.error('Error deleting node:', err);
    } finally {
      setDeletingNode(false);
    }
  };

  // --------------------------------------------------------------------------
  // ADD & EDIT RULE ACTIONS (DR_RULE_DEFINITION)
  // --------------------------------------------------------------------------

  const handleSaveRule = async () => {
    if (!selectedFlowId) return;
    try {
      await apiFetch(`/api/drools/flows/${selectedFlowId}/rules`, {
        method: 'POST',
        body: JSON.stringify(ruleFormData)
      });
      setOpenAddRuleModal(false);
      await loadFullFlow(selectedFlowId);
    } catch (err) {
      console.error('Error saving rule:', err);
    }
  };

  const handleDeleteRule = async (ruleId) => {
    if (!selectedFlowId || !ruleId) return;
    try {
      await apiFetch(`/api/drools/flows/${selectedFlowId}/rules/${ruleId}`, {
        method: 'DELETE'
      });
      await loadFullFlow(selectedFlowId);
    } catch (err) {
      console.error('Error deleting rule:', err);
    }
  };

  // --------------------------------------------------------------------------
  // EDGE ACTIONS (DR_RULE_ROUTING_EDGE)
  // --------------------------------------------------------------------------

  const handleSaveEdgeChanges = async () => {
    if (!selectedFlowId || !edgeFormData.edgeKey) return;
    try {
      await apiFetch(`/api/drools/flows/${selectedFlowId}/edges`, {
        method: 'POST',
        body: JSON.stringify(edgeFormData)
      });
      setOpenEdgeDrawer(false);
      await loadFullFlow(selectedFlowId);
    } catch (err) {
      console.error('Error saving edge:', err);
    }
  };

  const handleDeleteEdge = async () => {
    if (!selectedFlowId || !edgeFormData.edgeKey) return;
    try {
      await apiFetch(`/api/drools/flows/${selectedFlowId}/edges/${edgeFormData.edgeKey}`, {
        method: 'DELETE'
      });
      setOpenEdgeDrawer(false);
      await loadFullFlow(selectedFlowId);
    } catch (err) {
      console.error('Error deleting edge:', err);
    }
  };

  // --------------------------------------------------------------------------
  // Layout Persistence (DR_RULE_FLOW.LAYOUT_JSON)
  // --------------------------------------------------------------------------

  const handleSaveLayout = async () => {
    if (!selectedFlowId) return;
    try {
      setSavingLayout(true);
      const layoutMap = {};
      nodes.forEach(n => {
        layoutMap[n.id] = { x: n.position.x, y: n.position.y };
      });
      await apiFetch(`/api/drools/flows/${selectedFlowId}/layout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ layoutJson: JSON.stringify(layoutMap) })
      });
    } catch (err) {
      console.error('Error saving layout:', err);
    } finally {
      setSavingLayout(false);
    }
  };

  // --------------------------------------------------------------------------
  // Drools DRL Generation View
  // --------------------------------------------------------------------------

  const handleOpenDrl = async () => {
    if (!selectedFlowId) return;
    try {
      setLoadingDrl(true);
      setOpenDrlModal(true);
      const res = await apiFetch(`/api/drools/flows/${selectedFlowId}/drl`);
      setDrlCode(res.drlContent || '');
    } catch (err) {
      console.error('Error fetching DRL:', err);
    } finally {
      setLoadingDrl(false);
    }
  };

  const handleCopyDrl = () => {
    navigator.clipboard.writeText(drlCode);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleDownloadDrl = () => {
    const blob = new Blob([drlCode], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fullFlow?.header?.flowCode || 'drools_rules'}.drl`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // --------------------------------------------------------------------------
  // Forms State Approval Management (DR_FORM_STATE_APPROVAL)
  // --------------------------------------------------------------------------

  const loadFormApprovals = async () => {
    try {
      const res = await apiFetch(`/api/drools/form-approvals?productCode=${formsProductFilter}&stateCode=${formsStateFilter}`);
      setFormsList(res || []);
    } catch (err) {
      console.error('Error loading form approvals:', err);
    }
  };

  const handleOpenForms = () => {
    setOpenFormsModal(true);
    loadFormApprovals();
  };

  const handleOpenAddForm = () => {
    setFormFormData({
      formApprovalId: null,
      productCode: fullFlow?.header?.productCode || 'TECH_EO',
      stateCode: fullFlow?.header?.stateCode || 'CA',
      formNumber: '',
      formName: '',
      formEdition: '01-25',
      attachmentType: 'MANDATORY',
      approvalStatus: 'APPROVED',
      doiFilingNumber: '',
      serffTrackingNo: fullFlow?.header?.serffTrackingNo || '',
      effectiveDate: fullFlow?.header?.effectiveDate || '2025-01-01',
      expirationDate: fullFlow?.header?.expirationDate || '',
      mandatoryCriteria: '',
      exclusionCriteria: ''
    });
    setOpenFormEditModal(true);
  };

  const handleOpenEditForm = (form) => {
    setFormFormData({
      formApprovalId: form.formApprovalId,
      productCode: form.productCode || 'TECH_EO',
      stateCode: form.stateCode || 'CA',
      formNumber: form.formNumber || '',
      formName: form.formName || '',
      formEdition: form.formEdition || '01-25',
      attachmentType: form.attachmentType || 'MANDATORY',
      approvalStatus: form.approvalStatus || 'APPROVED',
      doiFilingNumber: form.doiFilingNumber || '',
      serffTrackingNo: form.serffTrackingNo || '',
      effectiveDate: form.effectiveDate || '2025-01-01',
      expirationDate: form.expirationDate || '',
      mandatoryCriteria: form.mandatoryCriteria || '',
      exclusionCriteria: form.exclusionCriteria || ''
    });
    setOpenFormEditModal(true);
  };

  const handleSaveFormApproval = async () => {
    try {
      await apiFetch('/api/drools/form-approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formFormData)
      });
      setOpenFormEditModal(false);
      await loadFormApprovals();
    } catch (err) {
      console.error('Error saving form approval:', err);
      alert('Failed to save form approval: ' + (err.message || err));
    }
  };

  const handleDeleteFormApproval = async (id) => {
    if (!window.confirm('Are you sure you want to delete this State DOI form approval?')) return;
    try {
      await apiFetch(`/api/drools/form-approvals/${id}`, { method: 'DELETE' });
      await loadFormApprovals();
    } catch (err) {
      console.error('Error deleting form approval:', err);
      alert('Failed to delete form approval: ' + (err.message || err));
    }
  };

  // --------------------------------------------------------------------------
  // Professional Liability Rating Plans (DR_RATING_PLAN_CONFIG)
  // --------------------------------------------------------------------------

  const loadRatingPlans = useCallback(async () => {
    try {
      const res = await apiFetch('/api/drools/rating-plans');
      setRatingPlansList(res || []);
    } catch (err) {
      console.error('Error loading rating plans:', err);
    }
  }, [apiFetch]);

  const handleOpenRatingPlans = async () => {
    setOpenRatingPlansModal(true);
    await loadRatingPlans();
  };

  const handleOpenAddRatingPlan = () => {
    setPlanFormData({
      planConfigId: null,
      planCode: (fullFlow?.header?.productCode || 'TECH_EO') + '_' + (fullFlow?.header?.stateCode || 'CA'),
      productCode: fullFlow?.header?.productCode || 'TECH_EO',
      stateCode: fullFlow?.header?.stateCode || 'CA',
      planName: (fullFlow?.header?.productCode || 'Professional Liability') + ' Rating Plan',
      exposureUnit: '$1,000 Gross Revenue',
      baseLossCost: 10.0,
      minPremium: 1000,
      maxScheduleDebit: 0.25,
      maxScheduleCredit: 0.25,
      version: fullFlow?.header?.version || '2025.1',
      status: 'ACTIVE',
      effectiveDate: fullFlow?.header?.effectiveDate || '2025-01-01',
      expirationDate: fullFlow?.header?.expirationDate || ''
    });
    setOpenPlanEditModal(true);
  };

  const handleOpenEditRatingPlan = (plan) => {
    setPlanFormData({
      planConfigId: plan.planConfigId,
      planCode: plan.planCode || '',
      productCode: plan.productCode || 'TECH_EO',
      stateCode: plan.stateCode || 'CA',
      planName: plan.planName || '',
      exposureUnit: plan.exposureUnit || '$1,000 Gross Revenue',
      baseLossCost: plan.baseLossCost ?? 10.0,
      minPremium: plan.minPremium ?? 1000,
      maxScheduleDebit: plan.maxScheduleDebit ?? 0.25,
      maxScheduleCredit: plan.maxScheduleCredit ?? 0.25,
      version: plan.version || '2025.1',
      status: plan.status || 'ACTIVE',
      effectiveDate: plan.effectiveDate || '2025-01-01',
      expirationDate: plan.expirationDate || ''
    });
    setOpenPlanEditModal(true);
  };

  const handleSaveRatingPlan = async () => {
    try {
      await apiFetch('/api/drools/rating-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(planFormData)
      });
      setOpenPlanEditModal(false);
      await loadRatingPlans();
      if (selectedFlowId) await loadFullFlow(selectedFlowId);
    } catch (err) {
      console.error('Error saving rating plan:', err);
      alert('Failed to save rating plan: ' + (err.message || err));
    }
  };

  const handleDeleteRatingPlan = async (id) => {
    if (!window.confirm('Are you sure you want to delete this Professional Liability rating plan?')) return;
    try {
      await apiFetch(`/api/drools/rating-plans/${id}`, { method: 'DELETE' });
      await loadRatingPlans();
      if (selectedFlowId) await loadFullFlow(selectedFlowId);
    } catch (err) {
      console.error('Error deleting rating plan:', err);
      alert('Failed to delete rating plan: ' + (err.message || err));
    }
  };

  // --------------------------------------------------------------------------
  // RuleFlow Header Edit & Delete
  // --------------------------------------------------------------------------

  const handleOpenEditFlow = () => {
    if (!currentHeader) return;
    setEditFlowData({
      flowName: currentHeader.flowName || '',
      description: currentHeader.description || '',
      productCode: currentHeader.productCode || 'TECH_EO',
      planCode: currentHeader.planCode || '',
      stateCode: currentHeader.stateCode || 'ALL',
      version: currentHeader.version || '2025.1',
      status: currentHeader.status || 'ACTIVE',
      effectiveDate: currentHeader.effectiveDate || '2025-01-01',
      expirationDate: currentHeader.expirationDate || '',
      serffTrackingNo: currentHeader.serffTrackingNo || ''
    });
    setOpenEditFlowModal(true);
  };

  const handleSaveEditFlow = async () => {
    if (!selectedFlowId) return;
    try {
      await apiFetch(`/api/drools/flows/${selectedFlowId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editFlowData)
      });
      setOpenEditFlowModal(false);
      await loadFlows();
      await loadFullFlow(selectedFlowId);
    } catch (err) {
      console.error('Error updating flow:', err);
      alert('Failed to update flow header: ' + (err.message || err));
    }
  };

  const handleDeleteCurrentFlow = async () => {
    if (!selectedFlowId || !currentHeader) return;
    const confirmed = window.confirm(
      `Are you sure you want to delete RuleFlow '${currentHeader.flowCode}' (v${currentHeader.version})?\n\nAll associated nodes, edges, rules, and decision matrix tables will be permanently deleted from Helios_Rating_DB.`
    );
    if (!confirmed) return;
    try {
      setLoading(true);
      await apiFetch(`/api/drools/flows/${selectedFlowId}`, { method: 'DELETE' });
      const remainingFlows = await apiFetch('/api/drools/flows');
      setFlows(remainingFlows || []);
      if (remainingFlows && remainingFlows.length > 0) {
        setSelectedFlowId(remainingFlows[0].flowId);
      } else {
        setSelectedFlowId(null);
        setFullFlow(null);
        setNodes([]);
        setEdges([]);
      }
    } catch (err) {
      console.error('Error deleting flow:', err);
      alert('Failed to delete flow: ' + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------------------------------
  // Decision Table Coordinate Matrix CRUD
  // --------------------------------------------------------------------------

  const handleOpenDecisionMatrix = (dt) => {
    let target = dt;
    if (!target) {
      target = fullFlow?.decisionTables?.[0];
    }
    if (target) {
      setActiveTableId(target.tableId);
      // Initialize row cells buffer
      const cellMap = {};
      (target.rows || []).forEach(r => {
        cellMap[r.rowId] = { ...(r.cells || {}) };
      });
      setEditingRowCells(cellMap);
      setOpenDecisionMatrixModal(true);
    } else {
      // Prompt to create a decision table
      handleOpenNewTable();
    }
  };

  const handleCellChange = (rowId, columnId, value) => {
    setEditingRowCells(prev => ({
      ...prev,
      [rowId]: {
        ...(prev[rowId] || {}),
        [String(columnId)]: value
      }
    }));
  };

  const handleSaveRow = async (tableId, row) => {
    try {
      const cellsToSave = editingRowCells[row.rowId] || row.cells || {};
      await apiFetch(`/api/drools/decision-tables/${tableId}/rows`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rowId: row.rowId,
          rowOrder: row.rowOrder,
          isActive: row.isActive,
          description: row.description,
          cells: cellsToSave
        })
      });
      await loadFullFlow(selectedFlowId);
    } catch (err) {
      console.error('Error saving row:', err);
      alert('Failed to save row: ' + (err.message || err));
    }
  };

  const handleToggleRowActive = async (tableId, row) => {
    try {
      const cellsToSave = editingRowCells[row.rowId] || row.cells || {};
      await apiFetch(`/api/drools/decision-tables/${tableId}/rows`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rowId: row.rowId,
          rowOrder: row.rowOrder,
          isActive: !row.isActive,
          description: row.description,
          cells: cellsToSave
        })
      });
      await loadFullFlow(selectedFlowId);
    } catch (err) {
      console.error('Error toggling row active:', err);
    }
  };

  const handleDeleteRow = async (tableId, rowId) => {
    if (!window.confirm('Delete this rule row from the decision matrix?')) return;
    try {
      await apiFetch(`/api/drools/decision-tables/rows/${rowId}`, { method: 'DELETE' });
      await loadFullFlow(selectedFlowId);
    } catch (err) {
      console.error('Error deleting row:', err);
      alert('Failed to delete row: ' + (err.message || err));
    }
  };

  const handleAddRow = async (tableId) => {
    try {
      const targetTable = fullFlow?.decisionTables?.find(t => t.tableId === tableId);
      const nextOrder = (targetTable?.rows?.length || 0) + 1;
      const initialCells = {};
      (targetTable?.columns || []).forEach(c => {
        initialCells[String(c.columnId)] = c.dataType === 'BOOLEAN' ? 'true' : (c.dataType === 'NUMERIC' ? '1.0' : '');
      });
      await apiFetch(`/api/drools/decision-tables/${tableId}/rows`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rowOrder: nextOrder,
          isActive: true,
          description: `Rule Row ${nextOrder}`,
          cells: initialCells
        })
      });
      await loadFullFlow(selectedFlowId);
    } catch (err) {
      console.error('Error adding row:', err);
      alert('Failed to add row: ' + (err.message || err));
    }
  };

  const handleOpenAddCol = (colType, tableId) => {
    const targetTable = fullFlow?.decisionTables?.find(t => t.tableId === tableId);
    const nextColIdx = (targetTable?.columns?.length || 0) + 1;
    setNewColData({
      columnType: colType || 'CONDITION',
      headerLabel: colType === 'CONDITION' ? 'New Condition' : 'New Action Factor',
      propertyPath: colType === 'CONDITION' ? 'facts.property' : 'facts.outputFactor',
      operator: colType === 'CONDITION' ? 'EQUALS' : 'SET',
      dataType: 'STRING',
      colIndex: nextColIdx
    });
    setOpenAddColModal(true);
  };

  const handleSaveColumn = async () => {
    if (!activeTableId) return;
    try {
      await apiFetch(`/api/drools/decision-tables/${activeTableId}/columns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newColData)
      });
      setOpenAddColModal(false);
      await loadFullFlow(selectedFlowId);
    } catch (err) {
      console.error('Error saving column:', err);
      alert('Failed to save column: ' + (err.message || err));
    }
  };

  const handleDeleteColumn = async (tableId, colId) => {
    if (!window.confirm('Delete this column and its associated cell values?')) return;
    try {
      await apiFetch(`/api/drools/decision-tables/columns/${colId}`, { method: 'DELETE' });
      await loadFullFlow(selectedFlowId);
    } catch (err) {
      console.error('Error deleting column:', err);
      alert('Failed to delete column: ' + (err.message || err));
    }
  };

  const handleOpenNewTable = () => {
    setTableConfigData({
      tableId: null,
      nodeId: selectedNode?.data?.nodeId || null,
      tableCode: 'DT_' + Date.now().toString().slice(-6),
      tableName: 'Underwriting Relativity Matrix',
      ruleflowGroup: selectedNode?.data?.ruleflowGroup || 'Rating_Matrix_Group',
      hitPolicy: 'FIRST',
      description: 'Actuarial decision matrix for underwriting risk factors'
    });
    setOpenTableConfigModal(true);
  };

  const handleSaveTableConfig = async () => {
    if (!selectedFlowId) return;
    try {
      const created = await apiFetch(`/api/drools/flows/${selectedFlowId}/decision-tables`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tableConfigData)
      });
      setOpenTableConfigModal(false);
      await loadFullFlow(selectedFlowId);
      if (created && created.tableId) {
        setActiveTableId(created.tableId);
        setOpenDecisionMatrixModal(true);
      }
    } catch (err) {
      console.error('Error creating decision table:', err);
      alert('Failed to save decision table: ' + (err.message || err));
    }
  };

  const handleDeleteCurrentTable = async (tableId) => {
    if (!window.confirm('Are you sure you want to permanently delete this Decision Table and all its rows/columns?')) return;
    try {
      await apiFetch(`/api/drools/decision-tables/${tableId}`, { method: 'DELETE' });
      setOpenDecisionMatrixModal(false);
      await loadFullFlow(selectedFlowId);
    } catch (err) {
      console.error('Error deleting decision table:', err);
      alert('Failed to delete decision table: ' + (err.message || err));
    }
  };

  // --------------------------------------------------------------------------
  // Versioning: Clone Flow Version
  // --------------------------------------------------------------------------

  const handleCloneVersion = async () => {
    if (!selectedFlowId) return;
    try {
      setLoading(true);
      const res = await apiFetch(`/api/drools/flows/${selectedFlowId}/clone-version`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newVersion: cloneVersion,
          effectiveDate: cloneEffDate,
          expirationDate: cloneExpDate
        })
      });
      setOpenCloneModal(false);
      await loadFlows();
      if (res && res.flowId) {
        setSelectedFlowId(res.flowId);
      }
    } catch (err) {
      console.error('Error cloning flow version:', err);
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------------------------------
  // Create New RuleFlow
  // --------------------------------------------------------------------------

  const handleCreateNewFlow = async () => {
    try {
      setLoading(true);
      const created = await apiFetch('/api/drools/flows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newFlowData)
      });
      setOpenNewFlowModal(false);
      await loadFlows();
      if (created && created.flowId) {
        setSelectedFlowId(created.flowId);
      }
    } catch (err) {
      console.error('Error creating flow:', err);
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------------------------------
  // Drools Simulation Execution
  // --------------------------------------------------------------------------

  const handleRunSimulation = async () => {
    if (!selectedFlowId) return;
    try {
      setSimRunning(true);
      const res = await apiFetch(`/api/drools/flows/${selectedFlowId}/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ facts: simFacts })
      });
      setSimResult(res);
    } catch (err) {
      console.error('Simulation failed:', err);
    } finally {
      setSimRunning(false);
    }
  };

  const handleApplyPreset = (presetName) => {
    if (presetName === 'ca_preferred') {
      setSimFacts({
        state: 'CA',
        productCode: 'TECH_EO',
        planCode: 'TECH_EO_COMMERCIAL',
        effectiveDate: '2025-03-01',
        revenue: 5000000,
        limit: 2000000,
        deductible: 25000,
        hasCyber: true,
        mfaEnforced: true,
        hasEDR: true,
        hasPriorActs: true,
        retroactiveDate: '2020-01-01',
        scheduleMod: 0.05
      });
    } else if (presetName === 'ny_substandard') {
      setSimFacts({
        state: 'NY',
        productCode: 'TECH_EO',
        planCode: 'TECH_EO_COMMERCIAL',
        effectiveDate: '2025-03-01',
        revenue: 12000000,
        limit: 5000000,
        deductible: 50000,
        hasCyber: true,
        mfaEnforced: false,
        hasEDR: false,
        hasPriorActs: true,
        retroactiveDate: '2019-05-01',
        scheduleMod: 0.15
      });
    } else if (presetName === 'tx_surplus') {
      setSimFacts({
        state: 'TX',
        productCode: 'TECH_EO',
        planCode: 'TECH_EO_COMMERCIAL',
        effectiveDate: '2025-03-01',
        revenue: 2500000,
        limit: 1000000,
        deductible: 10000,
        hasCyber: false,
        mfaEnforced: true,
        hasEDR: false,
        hasPriorActs: false,
        retroactiveDate: null,
        scheduleMod: -0.10
      });
    }
  };

  const currentHeader = fullFlow?.header;
  const currentGroupRules = useMemo(() => {
    if (!fullFlow?.rules || !nodeFormData.ruleflowGroup) return [];
    return fullFlow.rules.filter(r => r.ruleflowGroup === nodeFormData.ruleflowGroup);
  }, [fullFlow, nodeFormData.ruleflowGroup]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)', bgcolor: '#f8fafc' }}>
      {/* ===================================================================== */}
      {/* HEADER & ACTION TOOLBAR */}
      {/* ===================================================================== */}
      <Paper
        elevation={1}
        sx={{
          p: 1.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          bgcolor: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          gap: 2,
          flexWrap: 'wrap'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ p: 0.8, bgcolor: '#eff6ff', borderRadius: '8px', color: '#2563eb' }}>
              <Zap size={22} />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1rem', color: '#0f172a', lineHeight: 1.2 }}>
                Drools RuleFlow Studio
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.72rem' }}>
                Helios_Rating_DB (DR_ Schema) • Professional Liability & Forms State Approval
              </Typography>
            </Box>
          </Box>

          <Divider orientation="vertical" flexItem sx={{ height: 28, my: 'auto' }} />

          {/* Flow Selector */}
          <FormControl size="small" sx={{ minWidth: 280 }}>
            <InputLabel id="flow-select-label">Active RuleFlow</InputLabel>
            <Select
              labelId="flow-select-label"
              value={selectedFlowId || ''}
              label="Active RuleFlow"
              onChange={(e) => setSelectedFlowId(e.target.value)}
            >
              {flows.map((f) => (
                <MenuItem key={f.flowId} value={f.flowId}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{f.flowCode}</Typography>
                    <Chip label={`v${f.version}`} size="small" sx={{ height: 18, fontSize: '0.65rem', bgcolor: '#f1f5f9' }} />
                    <Chip
                      label={f.status}
                      size="small"
                      color={f.status === 'ACTIVE' ? 'success' : f.status === 'DRAFT' ? 'warning' : 'default'}
                      sx={{ height: 18, fontSize: '0.65rem' }}
                    />
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Version & Date Badges */}
          {currentHeader && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Tooltip title="Regulatory SERFF Tracking Number">
                <Chip
                  icon={<Tag size={12} />}
                  label={currentHeader.serffTrackingNo || 'SERFF-US-2025'}
                  size="small"
                  sx={{ height: 24, fontSize: '0.72rem', bgcolor: '#f8fafc', border: '1px solid #cbd5e1' }}
                />
              </Tooltip>

              <Tooltip title="Filing Effective & Expiration Window">
                <Chip
                  icon={<Calendar size={12} />}
                  label={`Eff: ${currentHeader.effectiveDate} → ${currentHeader.expirationDate || 'Open'}`}
                  size="small"
                  sx={{ height: 24, fontSize: '0.72rem', bgcolor: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0' }}
                />
              </Tooltip>
            </Box>
          )}
        </Box>

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<Plus size={16} />}
            onClick={() => setOpenNewFlowModal(true)}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            New Flow
          </Button>

          <Button
            variant="outlined"
            size="small"
            startIcon={<GitFork size={16} />}
            onClick={() => {
              setCloneVersion(`${currentHeader?.version || '2025'}.2`);
              setOpenCloneModal(true);
            }}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            New Version
          </Button>

          <Button
            variant="outlined"
            size="small"
            startIcon={<ShieldCheck size={16} />}
            onClick={handleOpenForms}
            sx={{ textTransform: 'none', fontWeight: 600, color: '#4f46e5', borderColor: '#c7d2fe' }}
          >
            Forms Approvals
          </Button>

          <Button
            variant="outlined"
            size="small"
            startIcon={<Calculator size={16} />}
            onClick={handleOpenRatingPlans}
            sx={{ textTransform: 'none', fontWeight: 600, color: '#0369a1', borderColor: '#bae6fd' }}
          >
            Rating Plans
          </Button>

          <Button
            variant="outlined"
            size="small"
            startIcon={<TableIcon size={16} />}
            onClick={() => handleOpenDecisionMatrix()}
            sx={{ textTransform: 'none', fontWeight: 600, color: '#0284c7', borderColor: '#bae6fd' }}
          >
            Decision Matrix
          </Button>

          <Button
            variant="outlined"
            size="small"
            startIcon={<Edit3 size={15} />}
            onClick={handleOpenEditFlow}
            sx={{ textTransform: 'none', fontWeight: 600, color: '#334155', borderColor: '#cbd5e1' }}
          >
            Edit Flow
          </Button>

          <Button
            variant="outlined"
            size="small"
            startIcon={<Trash2 size={15} />}
            onClick={handleDeleteCurrentFlow}
            color="error"
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            Delete Flow
          </Button>

          <Button
            variant="outlined"
            size="small"
            startIcon={<Code2 size={16} />}
            onClick={handleOpenDrl}
            sx={{ textTransform: 'none', fontWeight: 600, color: '#7c3aed', borderColor: '#ddd6fe' }}
          >
            Drools DRL
          </Button>

          <Button
            variant="outlined"
            size="small"
            startIcon={<Save size={16} />}
            onClick={handleSaveLayout}
            disabled={savingLayout}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            {savingLayout ? 'Saving...' : 'Save Layout'}
          </Button>

          <Button
            variant="contained"
            size="small"
            startIcon={<Play size={16} />}
            onClick={() => setOpenSimDrawer(true)}
            sx={{
              textTransform: 'none',
              fontWeight: 700,
              bgcolor: '#059669',
              '&:hover': { bgcolor: '#047857' }
            }}
          >
            Simulate & Test
          </Button>
        </Box>
      </Paper>

      {/* ===================================================================== */}
      {/* MAIN REACT FLOW CANVAS WITH DYNAMIC NODE PALETTE */}
      {/* ===================================================================== */}
      <Box sx={{ flexGrow: 1, position: 'relative' }}>
        {loading ? (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 2 }}>
            <CircularProgress size={32} />
            <Typography variant="body2" sx={{ color: '#64748b' }}>Loading Drools RuleFlow from Helios_Rating_DB...</Typography>
          </Box>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onEdgeClick={onEdgeClick}
            nodeTypes={nodeTypes}
            fitView
          >
            <Background color="#cbd5e1" gap={18} size={1} />
            <Controls />
            <MiniMap
              nodeColor={(n) => {
                switch (n.type) {
                  case 'START': return '#059669';
                  case 'RULEFLOW_GROUP': return '#7c3aed';
                  case 'DECISION_TABLE': return '#0284c7';
                  case 'CONDITIONAL_SPLIT': return '#d97706';
                  case 'FORM_APPROVAL': return '#4f46e5';
                  case 'ACTION_SCRIPT': return '#e11d48';
                  case 'END': return '#0f172a';
                  default: return '#94a3b8';
                }
              }}
              style={{ borderRadius: 8, overflow: 'hidden' }}
            />

            {/* TOP PALETTE PANEL: ADD NEW DROOLS NODES DIRECTLY */}
            <Panel position="top-left">
              <Paper
                elevation={3}
                sx={{
                  p: 1.2,
                  bgcolor: '#ffffff',
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                }}
              >
                <Typography variant="caption" sx={{ fontWeight: 700, color: '#475569', mr: 0.5 }}>
                  ADD NODE:
                </Typography>
                <Button
                  size="small"
                  variant="contained"
                  onClick={() => handleCreateNode('RULEFLOW_GROUP')}
                  startIcon={<PlusCircle size={14} />}
                  sx={{ bgcolor: '#7c3aed', '&:hover': { bgcolor: '#6d28d9' }, textTransform: 'none', fontSize: '0.75rem', py: 0.4 }}
                >
                  RuleFlow Group
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  onClick={() => handleCreateNode('DECISION_TABLE')}
                  startIcon={<PlusCircle size={14} />}
                  sx={{ bgcolor: '#0284c7', '&:hover': { bgcolor: '#0369a1' }, textTransform: 'none', fontSize: '0.75rem', py: 0.4 }}
                >
                  Decision Table
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  onClick={() => handleCreateNode('CONDITIONAL_SPLIT')}
                  startIcon={<PlusCircle size={14} />}
                  sx={{ bgcolor: '#d97706', '&:hover': { bgcolor: '#b45309' }, textTransform: 'none', fontSize: '0.75rem', py: 0.4 }}
                >
                  Conditional Split
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  onClick={() => handleCreateNode('FORM_APPROVAL')}
                  startIcon={<PlusCircle size={14} />}
                  sx={{ bgcolor: '#4f46e5', '&:hover': { bgcolor: '#4338ca' }, textTransform: 'none', fontSize: '0.75rem', py: 0.4 }}
                >
                  Form Approval
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  onClick={() => handleCreateNode('ACTION_SCRIPT')}
                  startIcon={<PlusCircle size={14} />}
                  sx={{ bgcolor: '#e11d48', '&:hover': { bgcolor: '#be123c' }, textTransform: 'none', fontSize: '0.75rem', py: 0.4 }}
                >
                  Action Script
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  onClick={() => handleCreateNode('END')}
                  startIcon={<PlusCircle size={14} />}
                  sx={{ bgcolor: '#0f172a', '&:hover': { bgcolor: '#1e293b' }, textTransform: 'none', fontSize: '0.75rem', py: 0.4 }}
                >
                  End Terminal
                </Button>
              </Paper>
            </Panel>

            <Panel position="bottom-left">
              <Paper elevation={2} sx={{ p: 1, bgcolor: 'rgba(255,255,255,0.95)', borderRadius: 2, display: 'flex', gap: 1 }}>
                <Chip size="small" label="START" sx={{ bgcolor: '#059669', color: '#fff', fontSize: '0.65rem' }} />
                <Chip size="small" label="RULEFLOW_GROUP" sx={{ bgcolor: '#7c3aed', color: '#fff', fontSize: '0.65rem' }} />
                <Chip size="small" label="DECISION_TABLE" sx={{ bgcolor: '#0284c7', color: '#fff', fontSize: '0.65rem' }} />
                <Chip size="small" label="CONDITIONAL_SPLIT" sx={{ bgcolor: '#d97706', color: '#fff', fontSize: '0.65rem' }} />
                <Chip size="small" label="FORM_APPROVAL" sx={{ bgcolor: '#4f46e5', color: '#fff', fontSize: '0.65rem' }} />
                <Chip size="small" label="END" sx={{ bgcolor: '#0f172a', color: '#fff', fontSize: '0.65rem' }} />
              </Paper>
            </Panel>
          </ReactFlow>
        )}
      </Box>

      {/* ===================================================================== */}
      {/* NODE PROPERTY EDITOR DRAWER (EDIT & CONFIGURE NODE) */}
      {/* ===================================================================== */}
      <Drawer
        anchor="right"
        open={openNodeDrawer}
        onClose={() => setOpenNodeDrawer(false)}
        PaperProps={{ sx: { width: 440, p: 2.5, display: 'flex', flexDirection: 'column' } }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ p: 0.8, bgcolor: '#f1f5f9', borderRadius: '8px', color: '#2563eb' }}>
              <Edit3 size={20} />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1rem', lineHeight: 1.2 }}>
                Edit Drools Node
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748b', fontFamily: 'monospace' }}>
                Key: {nodeFormData.nodeKey}
              </Typography>
            </Box>
          </Box>
          <IconButton onClick={() => setOpenNodeDrawer(false)}>
            <X size={18} />
          </IconButton>
        </Box>

        <Divider sx={{ mb: 2 }} />

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, flexGrow: 1, overflowY: 'auto', pr: 0.5 }}>
          <TextField
            label="Node Label / Name"
            size="small"
            value={nodeFormData.nodeName}
            onChange={(e) => setNodeFormData({ ...nodeFormData, nodeName: e.target.value })}
            fullWidth
          />

          <FormControl size="small" fullWidth>
            <InputLabel>Node Archetype Type</InputLabel>
            <Select
              value={nodeFormData.nodeType}
              label="Node Archetype Type"
              onChange={(e) => setNodeFormData({ ...nodeFormData, nodeType: e.target.value })}
            >
              <MenuItem value="RULEFLOW_GROUP">RULEFLOW_GROUP (Drools Ruleset)</MenuItem>
              <MenuItem value="DECISION_TABLE">DECISION_TABLE (Coordinate Matrix)</MenuItem>
              <MenuItem value="CONDITIONAL_SPLIT">CONDITIONAL_SPLIT (Branching Logic)</MenuItem>
              <MenuItem value="FORM_APPROVAL">FORM_APPROVAL (State DOI Filings)</MenuItem>
              <MenuItem value="ACTION_SCRIPT">ACTION_SCRIPT (Consequence Action)</MenuItem>
              <MenuItem value="START">START (Fact Ingestion)</MenuItem>
              <MenuItem value="END">END (Binding Terminal)</MenuItem>
            </Select>
          </FormControl>

          <TextField
            label="RuleFlow-Group Name"
            size="small"
            value={nodeFormData.ruleflowGroup || ''}
            onChange={(e) => setNodeFormData({ ...nodeFormData, ruleflowGroup: e.target.value })}
            helperText="Matches 'ruleflow-group' clause in Drools rules"
            fullWidth
          />

          <TextField
            label="Execution Order"
            type="number"
            size="small"
            value={nodeFormData.executionOrder || 1}
            onChange={(e) => setNodeFormData({ ...nodeFormData, executionOrder: Number(e.target.value) })}
            fullWidth
          />

          {/* Archetype-Specific Configuration */}
          {nodeFormData.nodeType === 'RULEFLOW_GROUP' && (
            <Card variant="outlined" sx={{ bgcolor: '#faf5ff', borderColor: '#e9d5ff' }}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#6d28d9', fontSize: '0.85rem' }}>
                    Group Rules ({currentGroupRules.length}):
                  </Typography>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<Plus size={14} />}
                    onClick={() => {
                      setRuleFormData({
                        ruleId: 0,
                        ruleName: `R_${(nodeFormData.ruleflowGroup || 'RULE').toUpperCase()}_${Date.now().toString().slice(-4)}`,
                        ruleflowGroup: nodeFormData.ruleflowGroup,
                        salience: 50,
                        noLoop: true,
                        whenCondition: '$f : Map(this["revenue"] != null)',
                        thenConsequence: '$f.put("evaluated", true);',
                        effectiveDate: '2025-01-01',
                        expirationDate: '2027-12-31'
                      });
                      setOpenAddRuleModal(true);
                    }}
                    sx={{ textTransform: 'none', fontSize: '0.72rem', py: 0.2 }}
                  >
                    Add Rule
                  </Button>
                </Box>

                {currentGroupRules.length === 0 ? (
                  <Typography variant="caption" sx={{ color: '#8b5cf6', fontStyle: 'italic' }}>
                    No rules yet defined for group '{nodeFormData.ruleflowGroup}'. Click 'Add Rule' above.
                  </Typography>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {currentGroupRules.map((r) => (
                      <Paper key={r.ruleId} variant="outlined" sx={{ p: 1, bgcolor: '#ffffff' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="caption" sx={{ fontWeight: 700, color: '#4c1d95' }}>
                            {r.ruleName}
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                            <Chip label={`Salience ${r.salience}`} size="small" sx={{ height: 18, fontSize: '0.62rem' }} />
                            <IconButton size="small" onClick={() => handleDeleteRule(r.ruleId)} sx={{ color: '#ef4444', p: 0.2 }}>
                              <Trash2 size={14} />
                            </IconButton>
                          </Box>
                        </Box>
                        <Typography variant="caption" sx={{ display: 'block', color: '#64748b', fontSize: '0.68rem', mt: 0.5, fontFamily: 'monospace' }} noWrap>
                          when: {r.whenCondition}
                        </Typography>
                        <Typography variant="caption" sx={{ display: 'block', color: '#059669', fontSize: '0.68rem', fontFamily: 'monospace' }} noWrap>
                          then: {r.thenConsequence}
                        </Typography>
                      </Paper>
                    ))}
                  </Box>
                )}
              </CardContent>
            </Card>
          )}

          {nodeFormData.nodeType === 'DECISION_TABLE' && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Alert severity="info" sx={{ fontSize: '0.78rem' }}>
                Coordinate decision matrix connected to <b>{nodeFormData.ruleflowGroup || 'this node'}</b>.
                Evaluates condition/action matrix rows in FIRST_MATCH hit policy against quote facts.
              </Alert>
              <Button
                variant="contained"
                startIcon={<TableIcon size={16} />}
                onClick={() => {
                  const dt = fullFlow?.decisionTables?.find(t => t.nodeId === selectedNode?.data?.nodeId || t.ruleflowGroup === nodeFormData.ruleflowGroup) || fullFlow?.decisionTables?.[0];
                  handleOpenDecisionMatrix(dt);
                }}
                sx={{ bgcolor: '#0284c7', '&:hover': { bgcolor: '#0369a1' }, textTransform: 'none', fontWeight: 600 }}
              >
                Open Matrix Coordinate Grid
              </Button>
            </Box>
          )}

          {nodeFormData.nodeType === 'FORM_APPROVAL' && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Alert severity="info" sx={{ fontSize: '0.78rem' }}>
                Resolves mandatory and conditional policy form attachments from <b>DR_FORM_STATE_APPROVAL</b> by matching the quote's State and Policy Effective Date.
              </Alert>
              <Button
                variant="outlined"
                startIcon={<ShieldCheck size={16} />}
                onClick={handleOpenForms}
                sx={{ textTransform: 'none', fontWeight: 600, color: '#4f46e5', borderColor: '#c7d2fe' }}
              >
                Manage State Form Filings
              </Button>
            </Box>
          )}

          {nodeFormData.nodeType === 'ACTION_SCRIPT' && (
            <TextField
              label="Consequence Script (MVEL / RHS Action)"
              size="small"
              multiline
              rows={3}
              value={nodeFormData.configJson}
              onChange={(e) => setNodeFormData({ ...nodeFormData, configJson: e.target.value })}
              fullWidth
              helperText='e.g. {"script": "facts.referralRequired = true;"}'
            />
          )}

          <Box sx={{ display: 'flex', gap: 2, mt: 'auto', pt: 2 }}>
            <Button
              variant="contained"
              fullWidth
              onClick={handleSaveNodeChanges}
              disabled={savingNode}
              startIcon={savingNode ? <CircularProgress size={16} color="inherit" /> : <Save size={16} />}
              sx={{ bgcolor: '#2563eb', fontWeight: 600 }}
            >
              {savingNode ? 'Saving...' : 'Save Changes'}
            </Button>

            <Button
              variant="outlined"
              color="error"
              onClick={handleDeleteNode}
              disabled={deletingNode}
              startIcon={<Trash2 size={16} />}
              sx={{ minWidth: 110, fontWeight: 600 }}
            >
              {deletingNode ? 'Deleting...' : 'Delete'}
            </Button>
          </Box>
        </Box>
      </Drawer>

      {/* ===================================================================== */}
      {/* EDGE PROPERTY EDITOR DRAWER (EDIT ROUTING & CONDITIONS) */}
      {/* ===================================================================== */}
      <Drawer
        anchor="right"
        open={openEdgeDrawer}
        onClose={() => setOpenEdgeDrawer(false)}
        PaperProps={{ sx: { width: 380, p: 2.5, display: 'flex', flexDirection: 'column' } }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ p: 0.8, bgcolor: '#f1f5f9', borderRadius: '8px', color: '#2563eb' }}>
              <GitBranch size={20} />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1rem' }}>
              Edit Routing Transition
            </Typography>
          </Box>
          <IconButton onClick={() => setOpenEdgeDrawer(false)}>
            <X size={18} />
          </IconButton>
        </Box>

        <Divider sx={{ mb: 2 }} />

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, flexGrow: 1 }}>
          <TextField
            label="Routing Label"
            size="small"
            value={edgeFormData.routingLabel}
            onChange={(e) => setEdgeFormData({ ...edgeFormData, routingLabel: e.target.value })}
            placeholder="e.g. Standard Binding, Referral, Eligible"
            fullWidth
          />

          <TextField
            label="Drools / MVEL Condition Expression"
            size="small"
            multiline
            rows={3}
            value={edgeFormData.conditionExpression}
            onChange={(e) => setEdgeFormData({ ...edgeFormData, conditionExpression: e.target.value })}
            placeholder="e.g. facts.cyberRiskScore < 80 or facts.eligible == true"
            helperText="Leave empty for unconditional transition"
            fullWidth
          />

          <Box sx={{ display: 'flex', gap: 2, mt: 'auto', pt: 2 }}>
            <Button
              variant="contained"
              fullWidth
              onClick={handleSaveEdgeChanges}
              sx={{ bgcolor: '#2563eb', fontWeight: 600 }}
            >
              Save Edge
            </Button>
            <Button
              variant="outlined"
              color="error"
              onClick={handleDeleteEdge}
              sx={{ minWidth: 100, fontWeight: 600 }}
            >
              Delete
            </Button>
          </Box>
        </Box>
      </Drawer>

      {/* ===================================================================== */}
      {/* ADD DROOLS RULE MODAL */}
      {/* ===================================================================== */}
      <Dialog open={openAddRuleModal} onClose={() => setOpenAddRuleModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: '#4c1d95', color: '#fff' }}>
          <Workflow size={20} />
          <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 700 }}>
            Add Rule to Group: {ruleFormData.ruleflowGroup}
          </Typography>
        </DialogTitle>
        <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <TextField
            label="Rule Name"
            size="small"
            value={ruleFormData.ruleName}
            onChange={(e) => setRuleFormData({ ...ruleFormData, ruleName: e.target.value })}
            fullWidth
          />
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField
                label="Salience (Priority)"
                type="number"
                size="small"
                value={ruleFormData.salience}
                onChange={(e) => setRuleFormData({ ...ruleFormData, salience: Number(e.target.value) })}
                fullWidth
              />
            </Grid>
            <Grid item xs={6}>
              <FormControlLabel
                control={<Switch checked={ruleFormData.noLoop} onChange={(e) => setRuleFormData({ ...ruleFormData, noLoop: e.target.checked })} size="small" />}
                label={<Typography variant="body2" sx={{ fontSize: '0.8rem' }}>no-loop true</Typography>}
              />
            </Grid>
          </Grid>
          <TextField
            label="WHEN (LHS Pattern Condition)"
            size="small"
            multiline
            rows={3}
            value={ruleFormData.whenCondition}
            onChange={(e) => setRuleFormData({ ...ruleFormData, whenCondition: e.target.value })}
            fullWidth
            helperText='e.g. $f : Map(this["revenue"] != null, ((Number)this["revenue"]).doubleValue() <= 50000000.0)'
          />
          <TextField
            label="THEN (RHS Consequence Action)"
            size="small"
            multiline
            rows={3}
            value={ruleFormData.thenConsequence}
            onChange={(e) => setRuleFormData({ ...ruleFormData, thenConsequence: e.target.value })}
            fullWidth
            helperText='e.g. $f.put("eligible", true);'
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAddRuleModal(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveRule} sx={{ bgcolor: '#6d28d9' }}>
            Save Rule
          </Button>
        </DialogActions>
      </Dialog>

      {/* ===================================================================== */}
      {/* DROOLS DRL VIEWER MODAL */}
      {/* ===================================================================== */}
      <Dialog open={openDrlModal} onClose={() => setOpenDrlModal(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: '#1e1b4b', color: '#fff' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Code2 size={20} color="#a78bfa" />
            <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 700 }}>
              Drools Rule Language (DRL) Preview
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Button
              size="small"
              variant="outlined"
              onClick={handleCopyDrl}
              startIcon={<Copy size={14} />}
              sx={{ color: '#fff', borderColor: 'rgba(255,255,255,0.4)', textTransform: 'none' }}
            >
              {copySuccess ? 'Copied!' : 'Copy DRL'}
            </Button>
            <Button
              size="small"
              variant="contained"
              onClick={handleDownloadDrl}
              sx={{ bgcolor: '#6d28d9', '&:hover': { bgcolor: '#5b21b6' }, textTransform: 'none' }}
            >
              Download .drl
            </Button>
            <IconButton onClick={() => setOpenDrlModal(false)} sx={{ color: '#cbd5e1' }}>
              <X size={18} />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers sx={{ bgcolor: '#0f172a', p: 2 }}>
          {loadingDrl ? (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: '#fff' }}>
              <CircularProgress size={30} color="inherit" />
            </Box>
          ) : (
            <Box
              component="pre"
              sx={{
                color: '#38bdf8',
                fontFamily: 'Consolas, monospace',
                fontSize: '0.8rem',
                lineHeight: 1.5,
                margin: 0,
                overflowX: 'auto',
                whiteSpace: 'pre-wrap'
              }}
            >
              {drlCode}
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {/* ===================================================================== */}
      {/* FORMS STATE APPROVAL MANAGEMENT DIALOG (DR_FORM_STATE_APPROVAL) */}
      {/* ===================================================================== */}
      <Dialog open={openFormsModal} onClose={() => setOpenFormsModal(false)} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: '#312e81', color: '#fff' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ShieldCheck size={20} color="#818cf8" />
            <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 700 }}>
              Forms State Approval Management (DR_FORM_STATE_APPROVAL)
            </Typography>
          </Box>
          <IconButton onClick={() => setOpenFormsModal(false)} sx={{ color: '#cbd5e1' }}>
            <X size={18} />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>Product Line</InputLabel>
              <Select
                value={formsProductFilter}
                label="Product Line"
                onChange={(e) => {
                  setFormsProductFilter(e.target.value);
                  setTimeout(loadFormApprovals, 50);
                }}
              >
                <MenuItem value="ALL">All Products</MenuItem>
                <MenuItem value="TECH_EO">Technology Errors & Omissions</MenuItem>
                <MenuItem value="MED_MAL">Medical Malpractice</MenuItem>
                <MenuItem value="DNO">Directors & Officers</MenuItem>
                <MenuItem value="LAWYERS_PL">Lawyers Professional Liability</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>State</InputLabel>
              <Select
                value={formsStateFilter}
                label="State"
                onChange={(e) => {
                  setFormsStateFilter(e.target.value);
                  setTimeout(loadFormApprovals, 50);
                }}
              >
                <MenuItem value="ALL">All States</MenuItem>
                <MenuItem value="CA">California</MenuItem>
                <MenuItem value="NY">New York</MenuItem>
                <MenuItem value="TX">Texas</MenuItem>
                <MenuItem value="FL">Florida</MenuItem>
              </Select>
            </FormControl>

            <Chip
              label={`${formsList.length} Active DOI Approved Filings`}
              color="primary"
              size="small"
              sx={{ fontWeight: 600 }}
            />

            <Button
              variant="contained"
              size="small"
              startIcon={<Plus size={16} />}
              onClick={handleOpenAddForm}
              sx={{ bgcolor: '#4338ca', '&:hover': { bgcolor: '#3730a3' }, ml: 'auto', textTransform: 'none', fontWeight: 600 }}
            >
              + Add Approved Form Filing
            </Button>
          </Box>

          <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 420 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow sx={{ bgcolor: '#f1f5f9' }}>
                  <TableCell sx={{ fontWeight: 700 }}>Form #</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Form Name</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Edition</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>State</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>SERFF Tracking #</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Effective Window</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Criteria</TableCell>
                  <TableCell sx={{ fontWeight: 700, width: 80, textAlign: 'center' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {formsList.map((f) => (
                  <TableRow key={f.formApprovalId} hover>
                    <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600, color: '#1e40af' }}>
                      {f.formNumber}
                    </TableCell>
                    <TableCell>{f.formName}</TableCell>
                    <TableCell><Chip label={f.formEdition} size="small" sx={{ height: 20, fontSize: '0.7rem' }} /></TableCell>
                    <TableCell><Chip label={f.stateCode} size="small" color={f.stateCode === 'ALL' ? 'default' : 'primary'} sx={{ height: 20, fontSize: '0.7rem' }} /></TableCell>
                    <TableCell>
                      <Chip
                        label={f.attachmentType}
                        size="small"
                        color={f.attachmentType === 'MANDATORY' ? 'success' : 'warning'}
                        sx={{ height: 20, fontSize: '0.65rem' }}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip label={f.approvalStatus} size="small" color="success" sx={{ height: 20, fontSize: '0.65rem' }} />
                    </TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{f.serffTrackingNo || '-'}</TableCell>
                    <TableCell sx={{ fontSize: '0.75rem' }}>
                      {f.effectiveDate} → {f.expirationDate || 'Open'}
                    </TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.7rem', color: '#64748b' }}>
                      {f.mandatoryCriteria || 'None'}
                    </TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                        <Tooltip title="Edit Form Filing">
                          <IconButton size="small" onClick={() => handleOpenEditForm(f)} sx={{ color: '#2563eb', p: 0.5 }}>
                            <Edit3 size={15} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete Form Filing">
                          <IconButton size="small" onClick={() => handleDeleteFormApproval(f.formApprovalId)} sx={{ color: '#ef4444', p: 0.5 }}>
                            <Trash2 size={15} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
      </Dialog>

      {/* ===================================================================== */}
      {/* RATING PLANS CONFIG DIALOG (DR_RATING_PLAN_CONFIG) */}
      {/* ===================================================================== */}
      <Dialog open={openRatingPlansModal} onClose={() => setOpenRatingPlansModal(false)} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: '#0c4a6e', color: '#fff' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Calculator size={20} color="#7dd3fc" />
            <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 700 }}>
              Professional Liability Rating Plans Config (DR_RATING_PLAN_CONFIG)
            </Typography>
          </Box>
          <IconButton onClick={() => setOpenRatingPlansModal(false)} sx={{ color: '#cbd5e1' }}>
            <X size={18} />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, alignItems: 'center' }}>
            <Chip label={`${ratingPlansList.length} Active Professional Liability Plans`} color="primary" size="small" sx={{ fontWeight: 600 }} />
            <Button
              variant="contained"
              size="small"
              startIcon={<Plus size={16} />}
              onClick={handleOpenAddRatingPlan}
              sx={{ bgcolor: '#0284c7', '&:hover': { bgcolor: '#0369a1' }, textTransform: 'none', fontWeight: 600 }}
            >
              + Add Rating Plan
            </Button>
          </Box>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#f1f5f9' }}>
                  <TableCell sx={{ fontWeight: 700 }}>Plan Code</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Plan Name</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Product</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>State</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Exposure Unit</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Base Loss Cost</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Min Premium</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Max Sched Mod</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Version</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Effective Dates</TableCell>
                  <TableCell sx={{ fontWeight: 700, width: 80, textAlign: 'center' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {ratingPlansList.map((rp) => (
                  <TableRow key={rp.planConfigId} hover>
                    <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600 }}>{rp.planCode}</TableCell>
                    <TableCell>{rp.planName}</TableCell>
                    <TableCell><Chip label={rp.productCode} size="small" sx={{ height: 20 }} /></TableCell>
                    <TableCell><Chip label={rp.stateCode} size="small" color={rp.stateCode === 'ALL' ? 'default' : 'primary'} sx={{ height: 20 }} /></TableCell>
                    <TableCell>{rp.exposureUnit}</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#047857' }}>${rp.baseLossCost?.toFixed(2)}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>${rp.minPremium?.toLocaleString()}</TableCell>
                    <TableCell>±{(rp.maxScheduleDebit * 100).toFixed(0)}%</TableCell>
                    <TableCell><Chip label={`v${rp.version}`} size="small" sx={{ height: 20 }} /></TableCell>
                    <TableCell sx={{ fontSize: '0.75rem' }}>{rp.effectiveDate} → {rp.expirationDate || 'Open'}</TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                        <Tooltip title="Edit Rating Plan">
                          <IconButton size="small" onClick={() => handleOpenEditRatingPlan(rp)} sx={{ color: '#2563eb', p: 0.5 }}>
                            <Edit3 size={15} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete Rating Plan">
                          <IconButton size="small" onClick={() => handleDeleteRatingPlan(rp.planConfigId)} sx={{ color: '#ef4444', p: 0.5 }}>
                            <Trash2 size={15} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
      </Dialog>

      {/* ===================================================================== */}
      {/* VERSIONING CLONE MODAL */}
      {/* ===================================================================== */}
      <Dialog open={openCloneModal} onClose={() => setOpenCloneModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <GitFork size={20} color="#2563eb" />
          <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 700 }}>
            Create New RuleFlow Version
          </Typography>
        </DialogTitle>
        <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <Alert severity="info" sx={{ fontSize: '0.8rem' }}>
            Cloning will duplicate all nodes, rules, edges, and decision table matrices from version <b>{currentHeader?.version}</b>.
            The current version will be marked as SUPERSEDED as of the new effective date.
          </Alert>
          <TextField
            label="New Version Number"
            size="small"
            value={cloneVersion}
            onChange={(e) => setCloneVersion(e.target.value)}
            fullWidth
            placeholder="e.g. 2025.2 or 1.1.0"
          />
          <TextField
            label="New Effective Date"
            type="date"
            size="small"
            value={cloneEffDate}
            onChange={(e) => setCloneEffDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />
          <TextField
            label="New Expiration Date (Optional)"
            type="date"
            size="small"
            value={cloneExpDate}
            onChange={(e) => setCloneExpDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCloneModal(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCloneVersion} sx={{ bgcolor: '#2563eb' }}>
            Create Version
          </Button>
        </DialogActions>
      </Dialog>

      {/* ===================================================================== */}
      {/* CREATE NEW FLOW MODAL */}
      {/* ===================================================================== */}
      <Dialog open={openNewFlowModal} onClose={() => setOpenNewFlowModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Plus size={20} color="#059669" />
          <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 700 }}>
            Create New Drools RuleFlow
          </Typography>
        </DialogTitle>
        <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <TextField
            label="Flow Code"
            size="small"
            value={newFlowData.flowCode}
            onChange={(e) => setNewFlowData({ ...newFlowData, flowCode: e.target.value })}
            fullWidth
          />
          <TextField
            label="Flow Name"
            size="small"
            value={newFlowData.flowName}
            onChange={(e) => setNewFlowData({ ...newFlowData, flowName: e.target.value })}
            fullWidth
          />
          <TextField
            label="Description"
            size="small"
            multiline
            rows={2}
            value={newFlowData.description}
            onChange={(e) => setNewFlowData({ ...newFlowData, description: e.target.value })}
            fullWidth
          />
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <FormControl size="small" fullWidth>
                <InputLabel>Product Line</InputLabel>
                <Select
                  value={newFlowData.productCode}
                  label="Product Line"
                  onChange={(e) => setNewFlowData({ ...newFlowData, productCode: e.target.value })}
                >
                  <MenuItem value="TECH_EO">Tech Errors & Omissions</MenuItem>
                  <MenuItem value="MED_MAL">Medical Malpractice</MenuItem>
                  <MenuItem value="DNO">Directors & Officers</MenuItem>
                  <MenuItem value="LAWYERS_PL">Lawyers E&O</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Plan Code"
                size="small"
                value={newFlowData.planCode}
                onChange={(e) => setNewFlowData({ ...newFlowData, planCode: e.target.value })}
                fullWidth
              />
            </Grid>
          </Grid>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField
                label="Version"
                size="small"
                value={newFlowData.version}
                onChange={(e) => setNewFlowData({ ...newFlowData, version: e.target.value })}
                fullWidth
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="SERFF Filing #"
                size="small"
                value={newFlowData.serffTrackingNo}
                onChange={(e) => setNewFlowData({ ...newFlowData, serffTrackingNo: e.target.value })}
                fullWidth
              />
            </Grid>
          </Grid>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField
                label="Effective Date"
                type="date"
                size="small"
                value={newFlowData.effectiveDate}
                onChange={(e) => setNewFlowData({ ...newFlowData, effectiveDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Expiration Date"
                type="date"
                size="small"
                value={newFlowData.expirationDate}
                onChange={(e) => setNewFlowData({ ...newFlowData, expirationDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenNewFlowModal(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateNewFlow} sx={{ bgcolor: '#059669' }}>
            Create Flow
          </Button>
        </DialogActions>
      </Dialog>

      {/* ===================================================================== */}
      {/* SIMULATION & TESTING DRAWER */}
      {/* ===================================================================== */}
      <Drawer
        anchor="right"
        open={openSimDrawer}
        onClose={() => setOpenSimDrawer(false)}
        PaperProps={{ sx: { width: 480, p: 2.5, display: 'flex', flexDirection: 'column' } }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ p: 0.8, bgcolor: '#dcfce7', borderRadius: '8px', color: '#16a34a' }}>
              <Play size={20} />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1rem' }}>
              Drools Simulation Runner
            </Typography>
          </Box>
          <IconButton onClick={() => setOpenSimDrawer(false)}>
            <X size={18} />
          </IconButton>
        </Box>

        <Divider sx={{ mb: 2 }} />

        {/* Presets */}
        <Typography variant="caption" sx={{ fontWeight: 600, color: '#64748b', mb: 1, display: 'block' }}>
          LOAD TEST PRESET SCENARIO:
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
          <Chip
            label="CA Tech E&O (Preferred)"
            size="small"
            clickable
            onClick={() => handleApplyPreset('ca_preferred')}
            color="primary"
            variant="outlined"
          />
          <Chip
            label="NY Tech E&O (High Risk)"
            size="small"
            clickable
            onClick={() => handleApplyPreset('ny_substandard')}
            color="error"
            variant="outlined"
          />
          <Chip
            label="TX Surplus Lines"
            size="small"
            clickable
            onClick={() => handleApplyPreset('tx_surplus')}
            color="warning"
            variant="outlined"
          />
        </Box>

        {/* Input Form */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, flexGrow: 1, overflowY: 'auto', pr: 0.5 }}>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <FormControl size="small" fullWidth>
                <InputLabel>State</InputLabel>
                <Select
                  value={simFacts.state}
                  label="State"
                  onChange={(e) => setSimFacts({ ...simFacts, state: e.target.value })}
                >
                  <MenuItem value="CA">California (CA)</MenuItem>
                  <MenuItem value="NY">New York (NY)</MenuItem>
                  <MenuItem value="TX">Texas (TX)</MenuItem>
                  <MenuItem value="FL">Florida (FL)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Effective Date"
                type="date"
                size="small"
                value={simFacts.effectiveDate}
                onChange={(e) => setSimFacts({ ...simFacts, effectiveDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
            </Grid>
          </Grid>

          <TextField
            label="Gross Annual Revenue ($)"
            size="small"
            type="number"
            value={simFacts.revenue}
            onChange={(e) => setSimFacts({ ...simFacts, revenue: Number(e.target.value) })}
            fullWidth
          />

          <Grid container spacing={2}>
            <Grid item xs={6}>
              <FormControl size="small" fullWidth>
                <InputLabel>Limit</InputLabel>
                <Select
                  value={simFacts.limit}
                  label="Limit"
                  onChange={(e) => setSimFacts({ ...simFacts, limit: Number(e.target.value) })}
                >
                  <MenuItem value={1000000}>$1,000,000</MenuItem>
                  <MenuItem value={2000000}>$2,000,000</MenuItem>
                  <MenuItem value={3000000}>$3,000,000</MenuItem>
                  <MenuItem value={5000000}>$5,000,000</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl size="small" fullWidth>
                <InputLabel>Deductible</InputLabel>
                <Select
                  value={simFacts.deductible}
                  label="Deductible"
                  onChange={(e) => setSimFacts({ ...simFacts, deductible: Number(e.target.value) })}
                >
                  <MenuItem value={10000}>$10,000</MenuItem>
                  <MenuItem value={25000}>$25,000</MenuItem>
                  <MenuItem value={50000}>$50,000</MenuItem>
                  <MenuItem value={100000}>$100,000</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          {/* Cyber & Risk Controls */}
          <Paper variant="outlined" sx={{ p: 1.5, bgcolor: '#f8fafc', borderRadius: 2 }}>
            <Typography variant="caption" sx={{ fontWeight: 700, color: '#334155', display: 'block', mb: 1 }}>
              CYBER & SECURITY POSTURE (DECISION MATRIX)
            </Typography>
            <FormControlLabel
              control={<Switch checked={simFacts.hasCyber} onChange={(e) => setSimFacts({ ...simFacts, hasCyber: e.target.checked })} size="small" />}
              label={<Typography variant="body2" sx={{ fontSize: '0.8rem' }}>Include Cyber Liability Endorsement</Typography>}
            />
            <FormControlLabel
              control={<Switch checked={simFacts.mfaEnforced} onChange={(e) => setSimFacts({ ...simFacts, mfaEnforced: e.target.checked })} size="small" />}
              label={<Typography variant="body2" sx={{ fontSize: '0.8rem' }}>MFA Enforced on all Email & Admin Logins</Typography>}
            />
            <FormControlLabel
              control={<Switch checked={simFacts.hasEDR} onChange={(e) => setSimFacts({ ...simFacts, hasEDR: e.target.checked })} size="small" />}
              label={<Typography variant="body2" sx={{ fontSize: '0.8rem' }}>Endpoint Detection & Response (EDR) Active</Typography>}
            />
          </Paper>

          {/* Schedule Mod */}
          <Box sx={{ px: 1 }}>
            <Typography variant="caption" sx={{ fontWeight: 600, color: '#475569', display: 'flex', justifyContent: 'space-between' }}>
              <span>Underwriter Schedule Modification:</span>
              <span style={{ fontWeight: 700, color: simFacts.scheduleMod > 0 ? '#b91c1c' : simFacts.scheduleMod < 0 ? '#15803d' : '#334155' }}>
                {(simFacts.scheduleMod * 100).toFixed(0)}%
              </span>
            </Typography>
            <Slider
              value={simFacts.scheduleMod}
              min={-0.25}
              max={0.25}
              step={0.05}
              marks={[
                { value: -0.25, label: '-25%' },
                { value: 0, label: '0%' },
                { value: 0.25, label: '+25%' }
              ]}
              onChange={(_, val) => setSimFacts({ ...simFacts, scheduleMod: val })}
              size="small"
            />
          </Box>

          <Button
            variant="contained"
            fullWidth
            onClick={handleRunSimulation}
            disabled={simRunning}
            startIcon={simRunning ? <CircularProgress size={16} color="inherit" /> : <Play size={16} />}
            sx={{
              py: 1.2,
              fontWeight: 700,
              bgcolor: '#059669',
              '&:hover': { bgcolor: '#047857' }
            }}
          >
            {simRunning ? 'Executing Drools Engine...' : 'Run Drools Engine'}
          </Button>

          {/* SIMULATION RESULTS */}
          {simResult && (
            <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Alert
                severity={simResult.status === 'APPROVED_BOUND' ? 'success' : 'warning'}
                icon={simResult.status === 'APPROVED_BOUND' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
                sx={{ fontWeight: 600 }}
              >
                {simResult.status === 'APPROVED_BOUND' ? 'Policy Rated & Ready to Bind' : 'Underwriter Referral Required'}
              </Alert>

              {/* Final Premium Card */}
              <Card variant="outlined" sx={{ bgcolor: '#f0fdf4', borderColor: '#bbf7d0' }}>
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                  <Typography variant="caption" sx={{ color: '#166534', fontWeight: 600 }}>
                    TOTAL ANNUAL RATED PREMIUM:
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800, color: '#14532d', my: 0.5 }}>
                    ${simResult.finalPremium?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Typography>
                  {simResult.minPremiumApplied && (
                    <Chip label={`Minimum Premium Applied ($${simResult.minPremium})`} size="small" color="success" sx={{ fontSize: '0.68rem', height: 20 }} />
                  )}
                  <Typography variant="caption" sx={{ display: 'block', color: '#16a34a', mt: 0.5 }}>
                    Execution Duration: {simResult.executionDurationMs}ms (Audit #{simResult.auditId})
                  </Typography>
                </CardContent>
              </Card>

              {/* Attached DOI Approved Forms */}
              <Card variant="outlined">
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#312e81', mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ShieldCheck size={16} color="#4f46e5" />
                    Attached DOI-Approved Forms ({simResult.attachedForms?.length || 0}):
                  </Typography>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: '#f8fafc' }}>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem' }}>Form #</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem' }}>Form Name</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem' }}>Edition</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem' }}>SERFF #</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {simResult.attachedForms?.map((f, i) => (
                        <TableRow key={i}>
                          <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600, fontSize: '0.72rem', color: '#1e40af' }}>
                            {f.formNumber}
                          </TableCell>
                          <TableCell sx={{ fontSize: '0.72rem' }}>{f.formName}</TableCell>
                          <TableCell><Chip label={f.formEdition} size="small" sx={{ height: 18, fontSize: '0.65rem' }} /></TableCell>
                          <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.68rem' }}>{f.serffTrackingNo || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Drools Step Timeline */}
              <Card variant="outlined">
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0f172a', mb: 1 }}>
                    Drools Execution Step Timeline:
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {simResult.timeline?.map((step, idx) => (
                      <Paper key={idx} variant="outlined" sx={{ p: 1, bgcolor: '#f8fafc', fontSize: '0.75rem' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="caption" sx={{ fontWeight: 700, color: '#1e293b' }}>
                            Step {step.step}: {step.nodeName}
                          </Typography>
                          <Chip label={step.nodeType} size="small" sx={{ height: 18, fontSize: '0.6rem' }} />
                        </Box>
                        <Typography variant="caption" sx={{ display: 'block', color: '#64748b', mt: 0.5 }}>
                          {step.actionTaken}
                        </Typography>
                      </Paper>
                    ))}
                  </Box>
                </CardContent>
              </Card>
            </Box>
          )}
        </Box>
      </Drawer>

      {/* ===================================================================== */}
      {/* DECISION TABLE COORDINATE MATRIX MODAL */}
      {/* ===================================================================== */}
      <Dialog open={openDecisionMatrixModal} onClose={() => setOpenDecisionMatrixModal(false)} maxWidth="xl" fullWidth>
        {(() => {
          const currentTable = fullFlow?.decisionTables?.find(t => t.tableId === activeTableId) || fullFlow?.decisionTables?.[0];
          if (!currentTable) {
            return (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <Typography variant="h6" sx={{ mb: 2 }}>No Decision Table Found for This RuleFlow</Typography>
                <Button variant="contained" startIcon={<Plus size={16}/>} onClick={handleOpenNewTable} sx={{ textTransform: 'none' }}>
                  Create New Decision Table
                </Button>
              </Box>
            );
          }
          const condCols = (currentTable.columns || []).filter(c => c.columnType === 'CONDITION');
          const actCols = (currentTable.columns || []).filter(c => c.columnType === 'ACTION');

          return (
            <>
              <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: '#0369a1', color: '#fff', py: 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <TableIcon size={22} color="#7dd3fc" />
                  <Box>
                    <Typography variant="h6" sx={{ fontSize: '1.05rem', fontWeight: 700, lineHeight: 1.2 }}>
                      Decision Matrix: {currentTable.tableName} ({currentTable.tableCode})
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#e0f2fe' }}>
                      Drools Ruleflow-Group: <b>{currentTable.ruleflowGroup}</b> | Hit Policy: <b>{currentTable.hitPolicy}</b>
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {fullFlow?.decisionTables?.length > 1 && (
                    <Select
                      size="small"
                      value={currentTable.tableId}
                      onChange={(e) => setActiveTableId(Number(e.target.value))}
                      sx={{ bgcolor: '#fff', height: 32, fontSize: '0.8rem' }}
                    >
                      {fullFlow.decisionTables.map(t => (
                        <MenuItem key={t.tableId} value={t.tableId}>{t.tableName}</MenuItem>
                      ))}
                    </Select>
                  )}
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<Plus size={14} />}
                    onClick={handleOpenNewTable}
                    sx={{ color: '#fff', borderColor: 'rgba(255,255,255,0.6)', textTransform: 'none', fontSize: '0.75rem' }}
                  >
                    New Matrix
                  </Button>
                  <IconButton onClick={() => setOpenDecisionMatrixModal(false)} sx={{ color: '#e0f2fe' }}>
                    <X size={18} />
                  </IconButton>
                </Box>
              </DialogTitle>

              <DialogContent dividers sx={{ p: 2 }}>
                {/* Action Bar for Matrix */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip label={`Hit Policy: ${currentTable.hitPolicy}`} size="small" sx={{ bgcolor: '#e0f2fe', color: '#0369a1', fontWeight: 600 }} />
                    <Chip label={`${currentTable.rows?.length || 0} Rule Rows`} size="small" color="primary" sx={{ fontWeight: 600 }} />
                    <Typography variant="caption" sx={{ color: '#64748b' }}>
                      {currentTable.description || 'Evaluates row conditions in top-down priority. First match triggers consequence action.'}
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<Plus size={15} />}
                      onClick={() => handleOpenAddCol('CONDITION', currentTable.tableId)}
                      sx={{ textTransform: 'none', fontWeight: 600, color: '#0284c7', borderColor: '#7dd3fc' }}
                    >
                      + Condition Column
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<Plus size={15} />}
                      onClick={() => handleOpenAddCol('ACTION', currentTable.tableId)}
                      sx={{ textTransform: 'none', fontWeight: 600, color: '#16a34a', borderColor: '#86efac' }}
                    >
                      + Action Column
                    </Button>
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<Plus size={15} />}
                      onClick={() => handleAddRow(currentTable.tableId)}
                      sx={{ textTransform: 'none', fontWeight: 600, bgcolor: '#0284c7', '&:hover': { bgcolor: '#0369a1' } }}
                    >
                      + Add Rule Row
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      color="error"
                      startIcon={<Trash2 size={15} />}
                      onClick={() => handleDeleteCurrentTable(currentTable.tableId)}
                      sx={{ textTransform: 'none', fontWeight: 600 }}
                    >
                      Delete Matrix
                    </Button>
                  </Box>
                </Box>

                {/* Spreadsheet Coordinate Grid */}
                <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 520, borderRadius: '8px' }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      {/* Top Header Group: Conditions vs Actions */}
                      <TableRow>
                        <TableCell colSpan={2} sx={{ bgcolor: '#f1f5f9', fontWeight: 700, fontSize: '0.75rem', borderRight: '2px solid #cbd5e1' }}>
                          ROW PRIORITY
                        </TableCell>
                        <TableCell colSpan={condCols.length} sx={{ bgcolor: '#e0f2fe', color: '#0369a1', fontWeight: 700, fontSize: '0.8rem', textAlign: 'center', borderRight: '2px solid #94a3b8' }}>
                          CONDITIONS (WHEN) — FACT MATCHING CRITERIA
                        </TableCell>
                        <TableCell colSpan={actCols.length} sx={{ bgcolor: '#dcfce7', color: '#166534', fontWeight: 700, fontSize: '0.8rem', textAlign: 'center', borderRight: '2px solid #cbd5e1' }}>
                          ACTIONS (THEN) — RESULTING RATINGS & TIERS
                        </TableCell>
                        <TableCell colSpan={2} sx={{ bgcolor: '#f1f5f9', fontWeight: 700, fontSize: '0.75rem', textAlign: 'center' }}>
                          BUSINESS LOG & ACTIONS
                        </TableCell>
                      </TableRow>

                      {/* Sub-header: Column headers */}
                      <TableRow sx={{ bgcolor: '#f8fafc' }}>
                        <TableCell sx={{ fontWeight: 700, width: 50, fontSize: '0.72rem' }}>Order</TableCell>
                        <TableCell sx={{ fontWeight: 700, width: 70, fontSize: '0.72rem', borderRight: '2px solid #cbd5e1' }}>Active</TableCell>

                        {/* Condition columns */}
                        {condCols.map((c, idx) => (
                          <TableCell
                            key={c.columnId}
                            sx={{
                              bgcolor: '#f0f9ff',
                              fontWeight: 700,
                              fontSize: '0.75rem',
                              borderRight: idx === condCols.length - 1 ? '2px solid #94a3b8' : '1px solid #e2e8f0',
                              minWidth: 140
                            }}
                          >
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <Box>
                                <Typography variant="caption" sx={{ fontWeight: 700, color: '#0369a1', display: 'block' }}>
                                  {c.headerLabel}
                                </Typography>
                                <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.65rem', fontFamily: 'monospace' }}>
                                  {c.propertyPath} ({c.operator})
                                </Typography>
                              </Box>
                              <Tooltip title="Delete Column">
                                <IconButton size="small" onClick={() => handleDeleteColumn(currentTable.tableId, c.columnId)} sx={{ color: '#94a3b8', '&:hover': { color: '#ef4444' }, p: 0.2 }}>
                                  <Trash2 size={13} />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </TableCell>
                        ))}

                        {/* Action columns */}
                        {actCols.map((c, idx) => (
                          <TableCell
                            key={c.columnId}
                            sx={{
                              bgcolor: '#f0fdf4',
                              fontWeight: 700,
                              fontSize: '0.75rem',
                              borderRight: idx === actCols.length - 1 ? '2px solid #cbd5e1' : '1px solid #e2e8f0',
                              minWidth: 140
                            }}
                          >
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <Box>
                                <Typography variant="caption" sx={{ fontWeight: 700, color: '#166534', display: 'block' }}>
                                  {c.headerLabel}
                                </Typography>
                                <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.65rem', fontFamily: 'monospace' }}>
                                  {c.propertyPath} =
                                </Typography>
                              </Box>
                              <Tooltip title="Delete Column">
                                <IconButton size="small" onClick={() => handleDeleteColumn(currentTable.tableId, c.columnId)} sx={{ color: '#94a3b8', '&:hover': { color: '#ef4444' }, p: 0.2 }}>
                                  <Trash2 size={13} />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </TableCell>
                        ))}

                        <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem', minWidth: 160 }}>Rule Description</TableCell>
                        <TableCell sx={{ fontWeight: 700, width: 80, fontSize: '0.72rem', textAlign: 'center' }}>Action</TableCell>
                      </TableRow>
                    </TableHead>

                    <TableBody>
                      {(currentTable.rows || []).map((row, rIdx) => {
                        const rowCells = editingRowCells[row.rowId] || row.cells || {};
                        return (
                          <TableRow key={row.rowId} hover sx={{ opacity: row.isActive ? 1 : 0.6, bgcolor: row.isActive ? 'inherit' : '#fafafa' }}>
                            <TableCell sx={{ fontWeight: 600, color: '#64748b', fontSize: '0.75rem' }}>
                              #{row.rowOrder || (rIdx + 1)}
                            </TableCell>

                            <TableCell sx={{ borderRight: '2px solid #cbd5e1' }}>
                              <Switch
                                size="small"
                                checked={Boolean(row.isActive)}
                                onChange={() => handleToggleRowActive(currentTable.tableId, row)}
                              />
                            </TableCell>

                            {/* Condition Cells */}
                            {condCols.map((c, cIdx) => (
                              <TableCell
                                key={c.columnId}
                                sx={{
                                  borderRight: cIdx === condCols.length - 1 ? '2px solid #94a3b8' : '1px solid #f1f5f9',
                                  p: 0.8
                                }}
                              >
                                <TextField
                                  size="small"
                                  variant="outlined"
                                  value={rowCells[String(c.columnId)] ?? ''}
                                  onChange={(e) => handleCellChange(row.rowId, c.columnId, e.target.value)}
                                  placeholder="e.g. true, 1.25"
                                  sx={{
                                    '& .MuiInputBase-input': {
                                      fontSize: '0.78rem',
                                      py: 0.6,
                                      px: 1,
                                      bgcolor: '#fff',
                                      borderRadius: '4px'
                                    }
                                  }}
                                  fullWidth
                                />
                              </TableCell>
                            ))}

                            {/* Action Cells */}
                            {actCols.map((c, cIdx) => (
                              <TableCell
                                key={c.columnId}
                                sx={{
                                  borderRight: cIdx === actCols.length - 1 ? '2px solid #cbd5e1' : '1px solid #f1f5f9',
                                  p: 0.8
                                }}
                              >
                                <TextField
                                  size="small"
                                  variant="outlined"
                                  value={rowCells[String(c.columnId)] ?? ''}
                                  onChange={(e) => handleCellChange(row.rowId, c.columnId, e.target.value)}
                                  placeholder="e.g. 0.90, PREFERRED"
                                  sx={{
                                    '& .MuiInputBase-input': {
                                      fontSize: '0.78rem',
                                      py: 0.6,
                                      px: 1,
                                      bgcolor: '#fff',
                                      fontWeight: 600,
                                      color: '#15803d',
                                      borderRadius: '4px'
                                    }
                                  }}
                                  fullWidth
                                />
                              </TableCell>
                            ))}

                            {/* Description Cell */}
                            <TableCell sx={{ p: 0.8 }}>
                              <TextField
                                size="small"
                                variant="standard"
                                value={row.description || ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  row.description = val;
                                }}
                                placeholder="Actuarial note / reason"
                                sx={{ '& .MuiInputBase-input': { fontSize: '0.75rem', color: '#475569' } }}
                                fullWidth
                              />
                            </TableCell>

                            {/* Action Buttons */}
                            <TableCell sx={{ textAlign: 'center', p: 0.8 }}>
                              <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                                <Tooltip title="Save Row Values to Database">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleSaveRow(currentTable.tableId, row)}
                                    sx={{ color: '#059669', p: 0.4, bgcolor: '#ecfdf5', '&:hover': { bgcolor: '#d1fae5' } }}
                                  >
                                    <Check size={15} />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Delete Row">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleDeleteRow(currentTable.tableId, row.rowId)}
                                    sx={{ color: '#ef4444', p: 0.4, bgcolor: '#fef2f2', '&:hover': { bgcolor: '#fee2e2' } }}
                                  >
                                    <Trash2 size={15} />
                                  </IconButton>
                                </Tooltip>
                              </Box>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </DialogContent>
            </>
          );
        })()}
      </Dialog>

      {/* ===================================================================== */}
      {/* ADD DECISION TABLE COLUMN MODAL */}
      {/* ===================================================================== */}
      <Dialog open={openAddColModal} onClose={() => setOpenAddColModal(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TableIcon size={18} color="#0284c7" />
          <Typography variant="h6" sx={{ fontSize: '0.95rem', fontWeight: 700 }}>
            Add Decision Table Column
          </Typography>
        </DialogTitle>
        <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <FormControl size="small" fullWidth>
            <InputLabel>Column Role</InputLabel>
            <Select
              value={newColData.columnType}
              label="Column Role"
              onChange={(e) => setNewColData({ ...newColData, columnType: e.target.value })}
            >
              <MenuItem value="CONDITION">Condition (LHS Fact Criteria)</MenuItem>
              <MenuItem value="ACTION">Action (RHS Result / Modification)</MenuItem>
            </Select>
          </FormControl>

          <TextField
            label="Header Label"
            size="small"
            value={newColData.headerLabel}
            onChange={(e) => setNewColData({ ...newColData, headerLabel: e.target.value })}
            placeholder="e.g. MFA Enforced, Pricing Tier"
            fullWidth
          />

          <TextField
            label="Property Path (Quote Fact Key)"
            size="small"
            value={newColData.propertyPath}
            onChange={(e) => setNewColData({ ...newColData, propertyPath: e.target.value })}
            placeholder="e.g. facts.mfaEnforced, facts.cyberRelativity"
            helperText="Key in quote working memory"
            fullWidth
          />

          <Grid container spacing={1}>
            <Grid item xs={6}>
              <FormControl size="small" fullWidth>
                <InputLabel>Operator</InputLabel>
                <Select
                  value={newColData.operator}
                  label="Operator"
                  onChange={(e) => setNewColData({ ...newColData, operator: e.target.value })}
                >
                  <MenuItem value="EQUALS">EQUALS (==)</MenuItem>
                  <MenuItem value="NOT_EQUALS">NOT EQUALS (!=)</MenuItem>
                  <MenuItem value="GREATER_THAN">GREATER THAN (&gt;)</MenuItem>
                  <MenuItem value="LESS_THAN">LESS THAN (&lt;)</MenuItem>
                  <MenuItem value="SET">SET (=)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl size="small" fullWidth>
                <InputLabel>Data Type</InputLabel>
                <Select
                  value={newColData.dataType}
                  label="Data Type"
                  onChange={(e) => setNewColData({ ...newColData, dataType: e.target.value })}
                >
                  <MenuItem value="STRING">STRING</MenuItem>
                  <MenuItem value="BOOLEAN">BOOLEAN</MenuItem>
                  <MenuItem value="NUMERIC">NUMERIC</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenAddColModal(false)} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveColumn} sx={{ textTransform: 'none', bgcolor: '#0284c7' }}>
            Add Column
          </Button>
        </DialogActions>
      </Dialog>

      {/* ===================================================================== */}
      {/* CREATE NEW DECISION TABLE MODAL */}
      {/* ===================================================================== */}
      <Dialog open={openTableConfigModal} onClose={() => setOpenTableConfigModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TableIcon size={18} color="#0284c7" />
          <Typography variant="h6" sx={{ fontSize: '0.95rem', fontWeight: 700 }}>
            Create New Decision Matrix Table
          </Typography>
        </DialogTitle>
        <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <TextField
            label="Table Code"
            size="small"
            value={tableConfigData.tableCode}
            onChange={(e) => setTableConfigData({ ...tableConfigData, tableCode: e.target.value })}
            placeholder="e.g. DT_SCHEDULE_MOD"
            fullWidth
          />
          <TextField
            label="Table Name"
            size="small"
            value={tableConfigData.tableName}
            onChange={(e) => setTableConfigData({ ...tableConfigData, tableName: e.target.value })}
            placeholder="e.g. Schedule Modification & Underwriter Discretion Matrix"
            fullWidth
          />
          <TextField
            label="RuleFlow Group"
            size="small"
            value={tableConfigData.ruleflowGroup}
            onChange={(e) => setTableConfigData({ ...tableConfigData, ruleflowGroup: e.target.value })}
            placeholder="e.g. Schedule_Mod_Group"
            fullWidth
          />
          <FormControl size="small" fullWidth>
            <InputLabel>Hit Policy</InputLabel>
            <Select
              value={tableConfigData.hitPolicy}
              label="Hit Policy"
              onChange={(e) => setTableConfigData({ ...tableConfigData, hitPolicy: e.target.value })}
            >
              <MenuItem value="FIRST">FIRST (First matching row fires)</MenuItem>
              <MenuItem value="UNIQUE">UNIQUE (Only exactly one row must match)</MenuItem>
              <MenuItem value="RULE_ORDER">RULE_ORDER (All matching rows fire in order)</MenuItem>
              <MenuItem value="COLLECT">COLLECT (Accumulate all matching row values)</MenuItem>
            </Select>
          </FormControl>
          <TextField
            label="Description"
            size="small"
            multiline
            rows={2}
            value={tableConfigData.description}
            onChange={(e) => setTableConfigData({ ...tableConfigData, description: e.target.value })}
            placeholder="Actuarial rating rules description"
            fullWidth
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenTableConfigModal(false)} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveTableConfig} sx={{ textTransform: 'none', bgcolor: '#0284c7' }}>
            Save Table
          </Button>
        </DialogActions>
      </Dialog>

      {/* ===================================================================== */}
      {/* ADD / EDIT FORM APPROVAL MODAL */}
      {/* ===================================================================== */}
      <Dialog open={openFormEditModal} onClose={() => setOpenFormEditModal(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: '#312e81', color: '#fff', py: 1.5 }}>
          <ShieldCheck size={20} color="#818cf8" />
          <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 700 }}>
            {formFormData.formApprovalId ? 'Edit Form State Approval Filing' : 'Add New Form State Approval Filing'}
          </Typography>
        </DialogTitle>
        <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField
                label="Form Number"
                size="small"
                value={formFormData.formNumber}
                onChange={(e) => setFormFormData({ ...formFormData, formNumber: e.target.value })}
                placeholder="e.g. TECH-CYBER-001"
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Form Edition"
                size="small"
                value={formFormData.formEdition}
                onChange={(e) => setFormFormData({ ...formFormData, formEdition: e.target.value })}
                placeholder="e.g. 04-25"
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Form Name"
                size="small"
                value={formFormData.formName}
                onChange={(e) => setFormFormData({ ...formFormData, formName: e.target.value })}
                placeholder="e.g. Cyber Security & Cloud Coverage Endorsement"
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={6}>
              <FormControl size="small" fullWidth>
                <InputLabel>Product Line</InputLabel>
                <Select
                  value={formFormData.productCode}
                  label="Product Line"
                  onChange={(e) => setFormFormData({ ...formFormData, productCode: e.target.value })}
                >
                  <MenuItem value="TECH_EO">Technology Errors & Omissions</MenuItem>
                  <MenuItem value="MED_MAL">Medical Malpractice</MenuItem>
                  <MenuItem value="DNO">Directors & Officers</MenuItem>
                  <MenuItem value="LAWYERS_PL">Lawyers Professional Liability</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl size="small" fullWidth>
                <InputLabel>State</InputLabel>
                <Select
                  value={formFormData.stateCode}
                  label="State"
                  onChange={(e) => setFormFormData({ ...formFormData, stateCode: e.target.value })}
                >
                  <MenuItem value="ALL">All States (Nationwide)</MenuItem>
                  <MenuItem value="CA">California</MenuItem>
                  <MenuItem value="NY">New York</MenuItem>
                  <MenuItem value="TX">Texas</MenuItem>
                  <MenuItem value="FL">Florida</MenuItem>
                  <MenuItem value="IL">Illinois</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl size="small" fullWidth>
                <InputLabel>Attachment Type</InputLabel>
                <Select
                  value={formFormData.attachmentType}
                  label="Attachment Type"
                  onChange={(e) => setFormFormData({ ...formFormData, attachmentType: e.target.value })}
                >
                  <MenuItem value="MANDATORY">MANDATORY (Always Attached)</MenuItem>
                  <MenuItem value="CONDITIONAL">CONDITIONAL (Based on Criteria)</MenuItem>
                  <MenuItem value="OPTIONAL">OPTIONAL (Underwriter Selected)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl size="small" fullWidth>
                <InputLabel>DOI Approval Status</InputLabel>
                <Select
                  value={formFormData.approvalStatus}
                  label="DOI Approval Status"
                  onChange={(e) => setFormFormData({ ...formFormData, approvalStatus: e.target.value })}
                >
                  <MenuItem value="APPROVED">APPROVED (State DOI Cleared)</MenuItem>
                  <MenuItem value="PENDING_DOI">PENDING_DOI (Under Review)</MenuItem>
                  <MenuItem value="FILED">FILED</MenuItem>
                  <MenuItem value="WITHDRAWN">WITHDRAWN</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="SERFF Tracking #"
                size="small"
                value={formFormData.serffTrackingNo}
                onChange={(e) => setFormFormData({ ...formFormData, serffTrackingNo: e.target.value })}
                placeholder="e.g. SERFF-CA-2025-9988"
                fullWidth
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="DOI Filing Number"
                size="small"
                value={formFormData.doiFilingNumber}
                onChange={(e) => setFormFormData({ ...formFormData, doiFilingNumber: e.target.value })}
                placeholder="e.g. CA-DOI-2025-8841"
                fullWidth
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Effective Date"
                type="date"
                size="small"
                InputLabelProps={{ shrink: true }}
                value={formFormData.effectiveDate}
                onChange={(e) => setFormFormData({ ...formFormData, effectiveDate: e.target.value })}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Expiration Date"
                type="date"
                size="small"
                InputLabelProps={{ shrink: true }}
                value={formFormData.expirationDate}
                onChange={(e) => setFormFormData({ ...formFormData, expirationDate: e.target.value })}
                fullWidth
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Mandatory Criteria / Rule Expression"
                size="small"
                value={formFormData.mandatoryCriteria}
                onChange={(e) => setFormFormData({ ...formFormData, mandatoryCriteria: e.target.value })}
                placeholder="e.g. facts.hasCyber == true or facts.hasPriorActs == true"
                helperText="MVEL expression evaluated by Drools engine to determine if form should attach"
                fullWidth
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenFormEditModal(false)} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveFormApproval} sx={{ textTransform: 'none', bgcolor: '#312e81' }}>
            Save Form Approval
          </Button>
        </DialogActions>
      </Dialog>

      {/* ===================================================================== */}
      {/* ADD / EDIT RATING PLAN MODAL */}
      {/* ===================================================================== */}
      <Dialog open={openPlanEditModal} onClose={() => setOpenPlanEditModal(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: '#0c4a6e', color: '#fff', py: 1.5 }}>
          <Calculator size={20} color="#7dd3fc" />
          <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 700 }}>
            {planFormData.planConfigId ? 'Edit Rating Plan Configuration' : 'Add New Rating Plan Configuration'}
          </Typography>
        </DialogTitle>
        <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField
                label="Plan Code"
                size="small"
                value={planFormData.planCode}
                onChange={(e) => setPlanFormData({ ...planFormData, planCode: e.target.value })}
                placeholder="e.g. TECH_EO_CA"
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Plan Name"
                size="small"
                value={planFormData.planName}
                onChange={(e) => setPlanFormData({ ...planFormData, planName: e.target.value })}
                placeholder="e.g. California Tech E&O Rating Plan"
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={6}>
              <FormControl size="small" fullWidth>
                <InputLabel>Product Line</InputLabel>
                <Select
                  value={planFormData.productCode}
                  label="Product Line"
                  onChange={(e) => setPlanFormData({ ...planFormData, productCode: e.target.value })}
                >
                  <MenuItem value="TECH_EO">Technology Errors & Omissions</MenuItem>
                  <MenuItem value="MED_MAL">Medical Malpractice</MenuItem>
                  <MenuItem value="DNO">Directors & Officers</MenuItem>
                  <MenuItem value="LAWYERS_PL">Lawyers Professional Liability</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl size="small" fullWidth>
                <InputLabel>State</InputLabel>
                <Select
                  value={planFormData.stateCode}
                  label="State"
                  onChange={(e) => setPlanFormData({ ...planFormData, stateCode: e.target.value })}
                >
                  <MenuItem value="ALL">All States (Nationwide)</MenuItem>
                  <MenuItem value="CA">California</MenuItem>
                  <MenuItem value="NY">New York</MenuItem>
                  <MenuItem value="TX">Texas</MenuItem>
                  <MenuItem value="FL">Florida</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Exposure Unit"
                size="small"
                value={planFormData.exposureUnit}
                onChange={(e) => setPlanFormData({ ...planFormData, exposureUnit: e.target.value })}
                placeholder="e.g. $1,000 Gross Revenue"
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Base Loss Cost ($)"
                type="number"
                size="small"
                value={planFormData.baseLossCost}
                onChange={(e) => setPlanFormData({ ...planFormData, baseLossCost: parseFloat(e.target.value) || 0 })}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Minimum Premium ($)"
                type="number"
                size="small"
                value={planFormData.minPremium}
                onChange={(e) => setPlanFormData({ ...planFormData, minPremium: parseFloat(e.target.value) || 0 })}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={3}>
              <TextField
                label="Max Schedule Debit (e.g. 0.25)"
                type="number"
                size="small"
                value={planFormData.maxScheduleDebit}
                onChange={(e) => setPlanFormData({ ...planFormData, maxScheduleDebit: parseFloat(e.target.value) || 0 })}
                fullWidth
              />
            </Grid>
            <Grid item xs={3}>
              <TextField
                label="Max Schedule Credit (e.g. 0.25)"
                type="number"
                size="small"
                value={planFormData.maxScheduleCredit}
                onChange={(e) => setPlanFormData({ ...planFormData, maxScheduleCredit: parseFloat(e.target.value) || 0 })}
                fullWidth
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                label="Version"
                size="small"
                value={planFormData.version}
                onChange={(e) => setPlanFormData({ ...planFormData, version: e.target.value })}
                placeholder="e.g. 2025.1"
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={4}>
              <FormControl size="small" fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={planFormData.status}
                  label="Status"
                  onChange={(e) => setPlanFormData({ ...planFormData, status: e.target.value })}
                >
                  <MenuItem value="ACTIVE">ACTIVE</MenuItem>
                  <MenuItem value="DRAFT">DRAFT</MenuItem>
                  <MenuItem value="SUPERSEDED">SUPERSEDED</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={4}>
              <TextField
                label="Effective Date"
                type="date"
                size="small"
                InputLabelProps={{ shrink: true }}
                value={planFormData.effectiveDate}
                onChange={(e) => setPlanFormData({ ...planFormData, effectiveDate: e.target.value })}
                fullWidth
                required
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenPlanEditModal(false)} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveRatingPlan} sx={{ textTransform: 'none', bgcolor: '#0c4a6e' }}>
            Save Rating Plan
          </Button>
        </DialogActions>
      </Dialog>

      {/* ===================================================================== */}
      {/* EDIT FLOW DETAILS MODAL */}
      {/* ===================================================================== */}
      <Dialog open={openEditFlowModal} onClose={() => setOpenEditFlowModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: '#1e293b', color: '#fff', py: 1.5 }}>
          <Edit3 size={18} color="#38bdf8" />
          <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 700 }}>
            Edit RuleFlow Properties
          </Typography>
        </DialogTitle>
        <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <TextField
            label="Flow Name"
            size="small"
            value={editFlowData.flowName}
            onChange={(e) => setEditFlowData({ ...editFlowData, flowName: e.target.value })}
            fullWidth
            required
          />
          <TextField
            label="Description"
            size="small"
            multiline
            rows={2}
            value={editFlowData.description}
            onChange={(e) => setEditFlowData({ ...editFlowData, description: e.target.value })}
            fullWidth
          />
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <FormControl size="small" fullWidth>
                <InputLabel>Product Line</InputLabel>
                <Select
                  value={editFlowData.productCode}
                  label="Product Line"
                  onChange={(e) => setEditFlowData({ ...editFlowData, productCode: e.target.value })}
                >
                  <MenuItem value="TECH_EO">Technology Errors & Omissions</MenuItem>
                  <MenuItem value="MED_MAL">Medical Malpractice</MenuItem>
                  <MenuItem value="DNO">Directors & Officers</MenuItem>
                  <MenuItem value="LAWYERS_PL">Lawyers Professional Liability</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl size="small" fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={editFlowData.status}
                  label="Status"
                  onChange={(e) => setEditFlowData({ ...editFlowData, status: e.target.value })}
                >
                  <MenuItem value="ACTIVE">ACTIVE</MenuItem>
                  <MenuItem value="DRAFT">DRAFT</MenuItem>
                  <MenuItem value="RETIRED">RETIRED</MenuItem>
                  <MenuItem value="SUPERSEDED">SUPERSEDED</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Version"
                size="small"
                value={editFlowData.version}
                onChange={(e) => setEditFlowData({ ...editFlowData, version: e.target.value })}
                fullWidth
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="SERFF Tracking #"
                size="small"
                value={editFlowData.serffTrackingNo}
                onChange={(e) => setEditFlowData({ ...editFlowData, serffTrackingNo: e.target.value })}
                fullWidth
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Effective Date"
                type="date"
                size="small"
                InputLabelProps={{ shrink: true }}
                value={editFlowData.effectiveDate}
                onChange={(e) => setEditFlowData({ ...editFlowData, effectiveDate: e.target.value })}
                fullWidth
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Expiration Date"
                type="date"
                size="small"
                InputLabelProps={{ shrink: true }}
                value={editFlowData.expirationDate}
                onChange={(e) => setEditFlowData({ ...editFlowData, expirationDate: e.target.value })}
                fullWidth
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenEditFlowModal(false)} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveEditFlow} sx={{ textTransform: 'none', bgcolor: '#2563eb' }}>
            Save Flow Details
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
}
