-- ======================================================================================
-- Helios BRMS: Visual RuleFlow & Coordinate Matrix Decision Table Schema
-- SQL Server 2019/2022/2025 Production DDL
-- ======================================================================================

USE MSTR_DATA;
GO

-- 1. Rule Flow Definitions
IF OBJECT_ID('dbo.RuleFlows', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.RuleFlows (
        FlowId BIGINT IDENTITY(10001, 1) NOT NULL,
        TenantId INT NOT NULL DEFAULT 1,
        FlowCode VARCHAR(64) NOT NULL,
        FlowName NVARCHAR(128) NOT NULL,
        Description NVARCHAR(512) NULL,
        ProductCode VARCHAR(50) NULL,
        PlanCode VARCHAR(50) NULL,
        Version INT NOT NULL DEFAULT 1,
        Status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
        CreatedBy VARCHAR(64) NOT NULL DEFAULT 'SYSTEM',
        CreatedDt DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
        UpdatedBy VARCHAR(64) NOT NULL DEFAULT 'SYSTEM',
        UpdatedDt DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
        CONSTRAINT PK_RuleFlows PRIMARY KEY CLUSTERED (FlowId),
        CONSTRAINT UQ_RuleFlows_Tenant_Code_Ver UNIQUE (TenantId, FlowCode, Version)
    );

    CREATE NONCLUSTERED INDEX IX_RuleFlows_Lookup 
        ON dbo.RuleFlows (TenantId, FlowCode, Status) 
        INCLUDE (FlowId, Version);

    CREATE NONCLUSTERED INDEX IX_RuleFlows_Product_Plan 
        ON dbo.RuleFlows (TenantId, ProductCode, PlanCode, Status) 
        INCLUDE (FlowId, FlowCode, Version);
    PRINT 'Created dbo.RuleFlows';
END;
GO

-- 2. Canvas Visual Layout State (React Flow Viewport & Position JSON)
IF OBJECT_ID('dbo.RuleFlowCanvasLayouts', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.RuleFlowCanvasLayouts (
        LayoutId BIGINT IDENTITY(1, 1) NOT NULL,
        FlowId BIGINT NOT NULL,
        ViewportZoom FLOAT NOT NULL DEFAULT 1.0,
        ViewportX FLOAT NOT NULL DEFAULT 0.0,
        ViewportY FLOAT NOT NULL DEFAULT 0.0,
        LayoutJson NVARCHAR(MAX) NOT NULL,
        LastSavedDt DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
        CONSTRAINT PK_RuleFlowCanvasLayouts PRIMARY KEY CLUSTERED (LayoutId),
        CONSTRAINT FK_CanvasLayout_Flow FOREIGN KEY (FlowId) 
            REFERENCES dbo.RuleFlows(FlowId) ON DELETE CASCADE,
        CONSTRAINT UQ_CanvasLayout_Flow UNIQUE (FlowId)
    );
    PRINT 'Created dbo.RuleFlowCanvasLayouts';
END;
GO

-- 3. Logical Graph Rule Nodes
IF OBJECT_ID('dbo.RuleNodes', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.RuleNodes (
        NodeId BIGINT IDENTITY(50001, 1) NOT NULL,
        FlowId BIGINT NOT NULL,
        ClientNodeKey VARCHAR(64) NOT NULL,
        NodeType VARCHAR(32) NOT NULL,
        NodeName NVARCHAR(128) NOT NULL,
        IsEntryNode BIT NOT NULL DEFAULT 0,
        IsTerminalNode BIT NOT NULL DEFAULT 0,
        PayloadScript NVARCHAR(MAX) NULL,
        ConfigurationJson NVARCHAR(MAX) NULL,
        CreatedDt DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
        CONSTRAINT PK_RuleNodes PRIMARY KEY CLUSTERED (NodeId),
        CONSTRAINT FK_RuleNodes_Flow FOREIGN KEY (FlowId) 
            REFERENCES dbo.RuleFlows(FlowId) ON DELETE CASCADE,
        CONSTRAINT UQ_RuleNodes_Flow_ClientKey UNIQUE (FlowId, ClientNodeKey)
    );

    CREATE NONCLUSTERED INDEX IX_RuleNodes_Flow_Entry 
        ON dbo.RuleNodes (FlowId, IsEntryNode) 
        INCLUDE (NodeId, NodeType, ClientNodeKey);
    PRINT 'Created dbo.RuleNodes';
END;
GO

-- 4. Directed Routing Graph Edges
IF OBJECT_ID('dbo.RuleRoutingEdges', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.RuleRoutingEdges (
        EdgeId BIGINT IDENTITY(1, 1) NOT NULL,
        FlowId BIGINT NOT NULL,
        ClientEdgeKey VARCHAR(64) NOT NULL,
        SourceNodeId BIGINT NOT NULL,
        TargetNodeId BIGINT NOT NULL,
        SourceHandle VARCHAR(64) NULL,
        RoutingCondition NVARCHAR(1024) NULL,
        EvaluationOrder INT NOT NULL DEFAULT 1,
        IsDefaultBranch BIT NOT NULL DEFAULT 0,
        CONSTRAINT PK_RuleRoutingEdges PRIMARY KEY CLUSTERED (EdgeId),
        CONSTRAINT FK_RoutingEdges_Flow FOREIGN KEY (FlowId) 
            REFERENCES dbo.RuleFlows(FlowId) ON DELETE NO ACTION,
        CONSTRAINT FK_RoutingEdges_Source FOREIGN KEY (SourceNodeId) 
            REFERENCES dbo.RuleNodes(NodeId) ON DELETE NO ACTION,
        CONSTRAINT FK_RoutingEdges_Target FOREIGN KEY (TargetNodeId) 
            REFERENCES dbo.RuleNodes(NodeId) ON DELETE NO ACTION
    );

    CREATE NONCLUSTERED INDEX IX_RuleRoutingEdges_Traverse 
        ON dbo.RuleRoutingEdges (SourceNodeId, EvaluationOrder) 
        INCLUDE (TargetNodeId, RoutingCondition, IsDefaultBranch);

    CREATE NONCLUSTERED INDEX IX_RuleRoutingEdges_Flow 
        ON dbo.RuleRoutingEdges (FlowId) 
        INCLUDE (SourceNodeId, TargetNodeId);
    PRINT 'Created dbo.RuleRoutingEdges';
END;
GO

-- 5. Coordinate Matrix Decision Tables
IF OBJECT_ID('dbo.DecisionTables', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.DecisionTables (
        TableId BIGINT IDENTITY(1001, 1) NOT NULL,
        NodeId BIGINT NOT NULL,
        TableCode VARCHAR(64) NOT NULL,
        TableName NVARCHAR(128) NOT NULL,
        HitPolicy VARCHAR(20) NOT NULL DEFAULT 'FIRST_HIT',
        AggregationField VARCHAR(64) NULL,
        CreatedDt DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
        CONSTRAINT PK_DecisionTables PRIMARY KEY CLUSTERED (TableId),
        CONSTRAINT FK_DecisionTables_Node FOREIGN KEY (NodeId) 
            REFERENCES dbo.RuleNodes(NodeId) ON DELETE CASCADE,
        CONSTRAINT UQ_DecisionTables_Node UNIQUE (NodeId)
    );
    PRINT 'Created dbo.DecisionTables';
END;
GO

-- 6. Decision Table Attribute Columns (Inputs & Outputs)
IF OBJECT_ID('dbo.DecisionTableColumns', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.DecisionTableColumns (
        ColumnId BIGINT IDENTITY(1, 1) NOT NULL,
        TableId BIGINT NOT NULL,
        ColumnType VARCHAR(16) NOT NULL,
        AttributeKey VARCHAR(64) NOT NULL,
        DisplayName NVARCHAR(128) NOT NULL,
        DataType VARCHAR(20) NOT NULL,
        DisplayOrder INT NOT NULL,
        CONSTRAINT PK_DecisionTableColumns PRIMARY KEY CLUSTERED (ColumnId),
        CONSTRAINT FK_DecisionTableColumns_Table FOREIGN KEY (TableId) 
            REFERENCES dbo.DecisionTables(TableId) ON DELETE CASCADE,
        CONSTRAINT UQ_DecisionTableColumns_Order UNIQUE (TableId, ColumnType, DisplayOrder)
    );

    CREATE NONCLUSTERED INDEX IX_DecisionTableColumns_Table 
        ON dbo.DecisionTableColumns (TableId, ColumnType, DisplayOrder) 
        INCLUDE (ColumnId, AttributeKey, DataType);
    PRINT 'Created dbo.DecisionTableColumns';
END;
GO

-- 7. Decision Table Rule Rows
IF OBJECT_ID('dbo.DecisionTableRows', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.DecisionTableRows (
        RowId BIGINT IDENTITY(1, 1) NOT NULL,
        TableId BIGINT NOT NULL,
        RowIndex INT NOT NULL,
        RuleDescription NVARCHAR(256) NULL,
        IsActive BIT NOT NULL DEFAULT 1,
        CONSTRAINT PK_DecisionTableRows PRIMARY KEY CLUSTERED (RowId),
        CONSTRAINT FK_DecisionTableRows_Table FOREIGN KEY (TableId) 
            REFERENCES dbo.DecisionTables(TableId) ON DELETE CASCADE,
        CONSTRAINT UQ_DecisionTableRows_Index UNIQUE (TableId, RowIndex)
    );

    CREATE NONCLUSTERED INDEX IX_DecisionTableRows_Eval 
        ON dbo.DecisionTableRows (TableId, IsActive, RowIndex) 
        INCLUDE (RowId);
    PRINT 'Created dbo.DecisionTableRows';
END;
GO

-- 8. Coordinate Matrix Cell Intersections (Row x Column = Expression Value)
IF OBJECT_ID('dbo.DecisionTableCells', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.DecisionTableCells (
        CellId BIGINT IDENTITY(1, 1) NOT NULL,
        RowId BIGINT NOT NULL,
        ColumnId BIGINT NOT NULL,
        ExpressionValue NVARCHAR(1024) NOT NULL,
        CONSTRAINT PK_DecisionTableCells PRIMARY KEY CLUSTERED (CellId),
        CONSTRAINT FK_DecisionTableCells_Row FOREIGN KEY (RowId) 
            REFERENCES dbo.DecisionTableRows(RowId) ON DELETE CASCADE,
        CONSTRAINT FK_DecisionTableCells_Column FOREIGN KEY (ColumnId) 
            REFERENCES dbo.DecisionTableColumns(ColumnId) ON DELETE NO ACTION,
        CONSTRAINT UQ_DecisionTableCells_Coord UNIQUE (RowId, ColumnId)
    );

    CREATE NONCLUSTERED INDEX IX_DecisionTableCells_Row 
        ON dbo.DecisionTableCells (RowId) 
        INCLUDE (ColumnId, ExpressionValue);
    PRINT 'Created dbo.DecisionTableCells';
END;
GO

-- 9. Regulatory Compliance Execution Audit Log
IF OBJECT_ID('dbo.RuleFlowExecutionAudits', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.RuleFlowExecutionAudits (
        AuditId BIGINT IDENTITY(1, 1) NOT NULL,
        FlowId BIGINT NOT NULL,
        ExecutionCorrelationId VARCHAR(64) NOT NULL,
        TenantId INT NOT NULL,
        ExecutionStatus VARCHAR(20) NOT NULL,
        TotalExecutionTimeMs BIGINT NOT NULL,
        InitialFactsJson NVARCHAR(MAX) NOT NULL,
        FinalFactsJson NVARCHAR(MAX) NOT NULL,
        ExecutionTraceJson NVARCHAR(MAX) NOT NULL,
        ExecutedDt DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
        CONSTRAINT PK_RuleFlowExecutionAudits PRIMARY KEY CLUSTERED (AuditId)
    );

    CREATE NONCLUSTERED INDEX IX_Audits_Search 
        ON dbo.RuleFlowExecutionAudits (FlowId, ExecutedDt DESC) 
        INCLUDE (ExecutionCorrelationId, ExecutionStatus);
    PRINT 'Created dbo.RuleFlowExecutionAudits';
END;
GO

