-- Copy seed data from MSTR_DATA to HELIOS_RATING_DB
USE HELIOS_RATING_DB;
GO
SET QUOTED_IDENTIFIER ON;
GO

SET IDENTITY_INSERT dbo.RuleFlows ON;
INSERT INTO dbo.RuleFlows (FlowId, TenantId, FlowCode, FlowName, Description, ProductCode, PlanCode, Version, Status, CreatedBy, CreatedDt, UpdatedBy, UpdatedDt)
SELECT FlowId, TenantId, FlowCode, FlowName, Description, ProductCode, PlanCode, Version, Status, CreatedBy, CreatedDt, UpdatedBy, UpdatedDt
FROM MSTR_DATA.dbo.RuleFlows
WHERE FlowId NOT IN (SELECT FlowId FROM dbo.RuleFlows);
SET IDENTITY_INSERT dbo.RuleFlows OFF;

SET IDENTITY_INSERT dbo.RuleFlowCanvasLayouts ON;
INSERT INTO dbo.RuleFlowCanvasLayouts (LayoutId, FlowId, ViewportZoom, ViewportX, ViewportY, LayoutJson, LastSavedDt)
SELECT LayoutId, FlowId, ViewportZoom, ViewportX, ViewportY, LayoutJson, LastSavedDt
FROM MSTR_DATA.dbo.RuleFlowCanvasLayouts
WHERE LayoutId NOT IN (SELECT LayoutId FROM dbo.RuleFlowCanvasLayouts);
SET IDENTITY_INSERT dbo.RuleFlowCanvasLayouts OFF;

SET IDENTITY_INSERT dbo.RuleNodes ON;
INSERT INTO dbo.RuleNodes (NodeId, FlowId, ClientNodeKey, NodeType, NodeName, IsEntryNode, IsTerminalNode, PayloadScript, ConfigurationJson, CreatedDt)
SELECT NodeId, FlowId, ClientNodeKey, NodeType, NodeName, IsEntryNode, IsTerminalNode, PayloadScript, ConfigurationJson, CreatedDt
FROM MSTR_DATA.dbo.RuleNodes
WHERE NodeId NOT IN (SELECT NodeId FROM dbo.RuleNodes);
SET IDENTITY_INSERT dbo.RuleNodes OFF;

SET IDENTITY_INSERT dbo.RuleRoutingEdges ON;
INSERT INTO dbo.RuleRoutingEdges (EdgeId, FlowId, ClientEdgeKey, SourceNodeId, TargetNodeId, SourceHandle, RoutingCondition, EvaluationOrder, IsDefaultBranch)
SELECT EdgeId, FlowId, ClientEdgeKey, SourceNodeId, TargetNodeId, SourceHandle, RoutingCondition, EvaluationOrder, IsDefaultBranch
FROM MSTR_DATA.dbo.RuleRoutingEdges
WHERE EdgeId NOT IN (SELECT EdgeId FROM dbo.RuleRoutingEdges);
SET IDENTITY_INSERT dbo.RuleRoutingEdges OFF;

SET IDENTITY_INSERT dbo.DecisionTables ON;
INSERT INTO dbo.DecisionTables (TableId, NodeId, TableCode, TableName, HitPolicy, AggregationField, CreatedDt)
SELECT TableId, NodeId, TableCode, TableName, HitPolicy, AggregationField, CreatedDt
FROM MSTR_DATA.dbo.DecisionTables
WHERE TableId NOT IN (SELECT TableId FROM dbo.DecisionTables);
SET IDENTITY_INSERT dbo.DecisionTables OFF;

SET IDENTITY_INSERT dbo.DecisionTableColumns ON;
INSERT INTO dbo.DecisionTableColumns (ColumnId, TableId, ColumnType, AttributeKey, DisplayName, DataType, DisplayOrder)
SELECT ColumnId, TableId, ColumnType, AttributeKey, DisplayName, DataType, DisplayOrder
FROM MSTR_DATA.dbo.DecisionTableColumns
WHERE ColumnId NOT IN (SELECT ColumnId FROM dbo.DecisionTableColumns);
SET IDENTITY_INSERT dbo.DecisionTableColumns OFF;

SET IDENTITY_INSERT dbo.DecisionTableRows ON;
INSERT INTO dbo.DecisionTableRows (RowId, TableId, RowIndex, RuleDescription, IsActive)
SELECT RowId, TableId, RowIndex, RuleDescription, IsActive
FROM MSTR_DATA.dbo.DecisionTableRows
WHERE RowId NOT IN (SELECT RowId FROM dbo.DecisionTableRows);
SET IDENTITY_INSERT dbo.DecisionTableRows OFF;

SET IDENTITY_INSERT dbo.DecisionTableCells ON;
INSERT INTO dbo.DecisionTableCells (CellId, RowId, ColumnId, ExpressionValue)
SELECT CellId, RowId, ColumnId, ExpressionValue
FROM MSTR_DATA.dbo.DecisionTableCells
WHERE CellId NOT IN (SELECT CellId FROM dbo.DecisionTableCells);
SET IDENTITY_INSERT dbo.DecisionTableCells OFF;

PRINT 'Seed data copied to HELIOS_RATING_DB successfully.';
GO
