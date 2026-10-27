# Helios BRMS Rule Flow Studio — Comprehensive Practitioner & Authoring Guide

> **Enterprise Business Rules Management System (BRMS)**  
> *Visual Workflow Orchestration, Coordinate-Based Decision Tables, Dynamic Rating Rules & Regulatory Audit Trails*  
> **Audience**: Insurance Underwriters, Actuaries, Business Analysts, Rule Authors, and Integration Engineers  
> **Platform Version**: Helios Suite v2025.1 / HeliosAdmin 2.0  

---

## Table of Contents
- [Helios BRMS Rule Flow Studio — Comprehensive Practitioner \& Authoring Guide](#helios-brms-rule-flow-studio--comprehensive-practitioner--authoring-guide)
  - [Table of Contents](#table-of-contents)
  - [1. Executive Overview \& System Architecture](#1-executive-overview--system-architecture)
    - [Architectural Blueprint](#architectural-blueprint)
    - [Key Architectural Tenets](#key-architectural-tenets)
  - [2. Core Concepts: Facts, Memory, and the DAG State Machine](#2-core-concepts-facts-memory-and-the-dag-state-machine)
    - [Working Memory (`facts`)](#working-memory-facts)
    - [How Facts Propagate](#how-facts-propagate)
  - [3. The 4 Node Archetypes](#3-the-4-node-archetypes)
    - [3.1 RULESET Node](#31-ruleset-node)
      - [Authoring Best Practices for Rulesets](#authoring-best-practices-for-rulesets)
    - [3.2 CONDITIONAL\_SWITCH Node](#32-conditional_switch-node)
      - [Edge Routing Modes](#edge-routing-modes)
    - [3.3 DECISION\_TABLE Node (Coordinate Matrix)](#33-decision_table-node-coordinate-matrix)
      - [Coordinate Table Structure](#coordinate-table-structure)
      - [Example: Cyber Posture Relativity Matrix (`DT_CYBER_RISK`)](#example-cyber-posture-relativity-matrix-dt_cyber_risk)
    - [3.4 UI\_ADJUSTMENT Node](#34-ui_adjustment-node)
      - [Example: Schedule Rating Bounds](#example-schedule-rating-bounds)
  - [4. Navigating Rule Flow Studio](#4-navigating-rule-flow-studio)
    - [4.1 The Rule Flow Catalog \& Inventory](#41-the-rule-flow-catalog--inventory)
    - [4.2 Creating a New Rule Flow](#42-creating-a-new-rule-flow)
    - [4.3 Visual Canvas Controls \& Palette Drawer](#43-visual-canvas-controls--palette-drawer)
    - [4.4 Node Property Editor \& Edge Condition Inspector](#44-node-property-editor--edge-condition-inspector)
    - [4.5 Topological Validation (Cycle Prevention)](#45-topological-validation-cycle-prevention)
    - [4.6 Interactive Simulation \& Quick Test Drawer](#46-interactive-simulation--quick-test-drawer)
  - [5. Hands-On Lab: Authoring the Tech E\&O Dynamic Cyber Flow](#5-hands-on-lab-authoring-the-tech-eo-dynamic-cyber-flow)
    - [Step 1: Create Flow \& Metadata](#step-1-create-flow--metadata)
    - [Step 2: Add Entry Ruleset (Exposure Normalization)](#step-2-add-entry-ruleset-exposure-normalization)
    - [Step 3: Build the Cyber Risk Decision Table](#step-3-build-the-cyber-risk-decision-table)
    - [Step 4: Configure Branching with Conditional Switch](#step-4-configure-branching-with-conditional-switch)
    - [Step 5: Define Standard vs Referral Terminal Nodes](#step-5-define-standard-vs-referral-terminal-nodes)
    - [Step 6: Route Edges \& Conditions](#step-6-route-edges--conditions)
    - [Step 7: Validate \& Test with Live Facts](#step-7-validate--test-with-live-facts)
  - [6. Portal Rating \& Production Execution](#6-portal-rating--production-execution)
    - [6.1 RatingQuoteDialog in Helios Portal](#61-ratingquotedialog-in-helios-portal)
    - [6.2 Audit Trail \& Regulatory Compliance (`dbo.UW_QUOTE`)](#62-audit-trail--regulatory-compliance-dbouw_quote)
    - [6.3 Programmatic REST APIs](#63-programmatic-rest-apis)
      - [Execute Flow by ID:](#execute-flow-by-id)
      - [Execute Active Flow by Rating Plan:](#execute-active-flow-by-rating-plan)
  - [7. MVEL Language Syntax \& Range Operator Cheat Sheet](#7-mvel-language-syntax--range-operator-cheat-sheet)
    - [Common Arithmetic \& Assignments](#common-arithmetic--assignments)
    - [Decision Table Coordinate Range Notation](#decision-table-coordinate-range-notation)
  - [8. Actuarial Governance \& Troubleshooting FAQ](#8-actuarial-governance--troubleshooting-faq)
    - [Q1: What happens if an actuary creates a loop between two nodes?](#q1-what-happens-if-an-actuary-creates-a-loop-between-two-nodes)
    - [Q2: Why does MVEL throw `unresolvable property or identifier: facts`?](#q2-why-does-mvel-throw-unresolvable-property-or-identifier-facts)
    - [Q3: How do we retire a ruleflow when a new state filing version is approved?](#q3-how-do-we-retire-a-ruleflow-when-a-new-state-filing-version-is-approved)
    - [Q4: How fast does a typical ruleflow execute?](#q4-how-fast-does-a-typical-ruleflow-execute)

---

## 1. Executive Overview & System Architecture

Helios BRMS Rule Flow Studio provides enterprise-grade visual rule orchestration modeled after leading systems such as **FICO Blaze Advisor** and **Red Hat Drools**. Designed specifically for commercial insurance rating, conditional form orchestration, dynamic underwriting referrals, and schedule mod adjustments, Rule Flow Studio bridges the gap between actuarial rules authoring and mission-critical runtime execution.

### Architectural Blueprint

```
                      HELIOS ADMIN STUDIO (Port 8090 / 8082)
    +-------------------------------------------------------------------------+
    |  React Flow Canvas (UI)             Topological Graph Validator         |
    |  - Node Palette & Drag-and-Drop     - Kahn's Cycle-Detection Algorithm  |
    |  - Coordinate Matrix Grid Editor    - Dead-end & Unreachable Checks     |
    +-------------------------------------------------------------------------+
                                      |
                      PERSISTENCE LAYER (SQL Server: MSTR_DATA)
    +-------------------------------------------------------------------------+
    |  dbo.RuleFlows                      dbo.RuleNodes                       |
    |  dbo.RuleFlowCanvasLayouts          dbo.RuleRoutingEdges                |
    |  dbo.DecisionTables                 dbo.DecisionTableRows               |
    |  dbo.DecisionTableColumns           dbo.DecisionTableCells              |
    |  dbo.RuleFlowExecutionAudits        dbo.RuleFlowExecutionAuditSteps     |
    +-------------------------------------------------------------------------+
                                      |
                       RUNTIME ENGINE (Spring Boot / Java 21)
    +-------------------------------------------------------------------------+
    |  RuleFlowExecutor                   DecisionTableEngine (MVEL)          |
    |  - Topological Step Dispatcher      - Range & Operator Parser           |
    |  - State Snapshot History           - Coordinate Relational Matcher     |
    +-------------------------------------------------------------------------+
                                      ^
                                      | (Reverse Proxy on Port 80 /api/brms/)
    +-------------------------------------------------------------------------+
    |  HELIOS SUBMISSIONS & RATING PORTAL (Port 80)                           |
    |  - Live Rating & Quote Dialog with Dual Engine (BRMS vs SERFF)          |
    |  - Regulatory Compliance Audit Trail Persisted in dbo.UW_QUOTE          |
    +-------------------------------------------------------------------------+
```

### Key Architectural Tenets
1. **Zero Dynamic Schema Alterations**: Instead of mutating SQL table definitions dynamically whenever an actuary adds a column to a decision table, Helios uses a **Coordinate Relational Matrix** ($Row \times Column \rightarrow Cell$).
2. **Deterministic Topological Execution**: Ruleflows are Directed Acyclic Graphs (DAGs). Every commit is guarded by **Kahn's Algorithm** to mathematically guarantee no infinite loops or cyclic routing deadlocks exist.
3. **Regulatory Audit Trail (DOI / SERFF Compliance)**: Every rule fired, every node transition, every fact delta, and every MVEL evaluation duration is captured in microsecond detail and committed to database audit logs for rate filing compliance.
4. **High Financial Precision**: All numeric equations and calculations run through `BigDecimal` wrappers in Java 21 to prevent floating-point rounding drifts.

---

## 2. Core Concepts: Facts, Memory, and the DAG State Machine

Rule Flow Studio evaluates a set of **Facts** that propagate through an orchestrated graph of rule nodes.

### Working Memory (`facts`)
Working memory is a key-value hash map representing the current state of an insured submission during rating:

```json
{
  "productCode": "TECH_EO",
  "stateCode": "CA",
  "exposureValue": 10000000,
  "exposureUnits": 10000,
  "occurrenceLimit": 5000000,
  "retentionAmount": 50000,
  "cyberScore": 45,
  "priorLossesCount": 0,
  "scheduleMod": 0.90
}
```

### How Facts Propagate
1. **Entry**: The caller invokes a flow with initial `inputFacts`.
2. **Step Execution**: The engine invokes the starting node. Any variable mutated or added (e.g. `facts.riskFactor = 1.25;`) is stored directly into working memory.
3. **Transition Routing**: Outgoing edges evaluate boolean predicates against the current state of working memory.
4. **Snapshots**: At each node step, before-and-after snapshots are recorded to provide a chronological audit trail.
5. **Exit**: The terminal node sets output fields (e.g., `finalAnnualPremium`, `ratingStatus`, `attachedForms`).

---

## 3. The 4 Node Archetypes

| Node Archetype | Color Indicator | Primary Use Case | Execution Engine |
| :--- | :---: | :--- | :--- |
| **`RULESET`** | **Sky Blue** | Multi-line calculation scripts, base loss cost formulas, factor normalization | MVEL Scripting Engine |
| **`CONDITIONAL_SWITCH`** | **Amber / Orange** | Decision routing, limits checking, senior underwriter referral gates | Boolean MVEL Evaluator |
| **`DECISION_TABLE`** | **Purple** | Coordinate matrix lookup tables (credit tiers, territory factors, cyber relativity) | Coordinate Relational Engine |
| **`UI_ADJUSTMENT`** | **Green** | Discretionary underwriter credits/debits, schedule rating modifiers | Bounded Modifier Logic |

---

### 3.1 RULESET Node

A **RULESET** node executes a sequence of MVEL statements that perform calculations and enrich facts.

```
+-----------------------------------------------------+
| [RULESET] 1. Normalize Exposure & Base Rate         |
| Expression:                                         |
|   facts.exposureUnits = facts.exposureValue / 1000; |
|   facts.baseLossCost = 1.85;                        |
|   facts.basePremium = exposureUnits * baseLossCost; |
+-----------------------------------------------------+
```

#### Authoring Best Practices for Rulesets
- Access variables either via `facts.propertyName` or directly by `propertyName`.
- Always verify divisor values are non-zero before dividing.
- Use explicit numeric formats (e.g., `1000.0` or `BigDecimal.valueOf(...)`).

---

### 3.2 CONDITIONAL_SWITCH Node

A **CONDITIONAL_SWITCH** evaluates branching predicates against working memory to determine which outbound edge to traverse.

```
                           +--------------------------------------+
                           | [SWITCH] 3. High Limit / Risk Route  |
                           +--------------------------------------+
                                      /                \
           facts.occurrenceLimit > 5000000          [Default / Else]
                                    /                    \
                                   v                      v
                       [Node 4a: UW Referral]   [Node 4b: Standard Rate]
```

#### Edge Routing Modes
- **Conditional Edge**: Fires if its MVEL expression evaluates to `true` (e.g., `facts.cyberScore < 50 || facts.occurrenceLimit > 5000000`).
- **Default (Else) Edge**: Fires if no conditional edge matches. Every conditional switch node should have exactly one `isDefault` edge to avoid execution deadlocks.

---

### 3.3 DECISION_TABLE Node (Coordinate Matrix)

Unlike legacy systems that require creating new SQL tables for every underwriting matrix, Helios uses a **Coordinate Relational Schema**:

$$\text{DecisionTableCell} = \text{Coordinate}(\text{RowId}, \text{ColumnId}) \rightarrow \text{ExpressionValue}$$

#### Coordinate Table Structure
- **Columns**: Defined as `INPUT` (conditions evaluated against facts) or `OUTPUT` (actions written to facts).
- **Rows**: Evaluated in `RowIndex` order.
- **Hit Policies**:
  - `FIRST_HIT`: Evaluates rows from top to bottom; stops at the first row whose conditions all match.
  - `ALL_HITS`: Evaluates all rows; applies all matched actions sequentially.

#### Example: Cyber Posture Relativity Matrix (`DT_CYBER_RISK`)

| Row | Condition 1: `priorLossesCount` | Condition 2: `exposureValue` | Action: `riskFactor` | Rule Description |
| :---: | :---: | :---: | :---: | :--- |
| **1** | `0` | `<= 2000000` | `0.90` | Low revenue, spotless loss history |
| **2** | `0` | `[2000001..10000000]` | `1.00` | Mid-market standard cyber posture |
| **3** | `0` | `> 10000000` | `1.20` | Large enterprise exposure surcharge |
| **4** | `> 0` | `-` *(Any)* | `1.45` | Adverse loss history surcharge |

---

### 3.4 UI_ADJUSTMENT Node

A **UI_ADJUSTMENT** node manages underwriter discretionary schedule credits or debits within regulatory boundaries filed with state Departments of Insurance (DOI).

#### Example: Schedule Rating Bounds
- **Minimum Allowed**: `0.75` (-25% credit)
- **Maximum Allowed**: `1.25` (+25% debit)
- **Default**: `1.00` (neutral)

---

## 4. Navigating Rule Flow Studio

Rule Flow Studio is accessible in the Helios Admin application (`http://10.1.10.56:8090/` or port 8082).

### 4.1 The Rule Flow Catalog & Inventory

When entering the Rule Flow module, the **Catalog View** is presented:

```
+----------------------------------------------------------------------------------------------------+
| HELIOS SUITE  |  Rule Flow Studio                                 [+ Create New Rule Flow] [Help]  |
+----------------------------------------------------------------------------------------------------+
|  [ 2 Total Flows ]    [ 2 Active Production ]    [ 2 Decision Tables ]    [ 24ms Avg Execution ]   |
+----------------------------------------------------------------------------------------------------+
| Search flows: [ Filter by flow code, product or plan...               ]   Product: [ All Products v ]
+----------------------------------------------------------------------------------------------------+
| +--------------------------------------------------+ +-------------------------------------------+ |
| | COMMERCIAL_AUTO_RATING                 [ ACTIVE ]| | TECH_EO_RATING_FLOW              [ ACTIVE ]| |
| | Commercial Fleet & Driver Rules Engine           | | Tech E&O Dynamic Cyber & Revenue Surcharge | |
| | Product: COMMERCIAL_AUTO | Plan: AUTO_FLEET      | | Product: TECH_EO | Plan: TECH_EO_COMMERCIAL| |
| | 4 Nodes | 3 Edges | Decision Table: DT_FLEET_REL | | 5 Nodes | 4 Edges | Decision Table: DT_CYBER   | |
| | [Open Visual Studio]          [Quick Simulation] | | [Open Visual Studio]   [Quick Simulation]  | |
| +--------------------------------------------------+ +-------------------------------------------+ |
+----------------------------------------------------------------------------------------------------+
```

- Click **Open Visual Studio** on any card to load that flow onto the visual canvas.
- Click **Quick Simulation** to open the side drawer and run mock facts without opening the canvas.

---

### 4.2 Creating a New Rule Flow

Click the **+ Create New Rule Flow** button in the catalog toolbar:

1. **Flow Code**: Unique uppercase snake_case identifier (e.g. `CYBER_LIABILITY_RATING`).
2. **Flow Name**: Human-readable name (e.g. `Cyber Liability Posture & Surcharge Flow`).
3. **Product Line**: Target product (`TECH_EO`, `COMMERCIAL_AUTO`, `MED_MAL`, `DNO`).
4. **Rating Plan Code**: Target plan code (e.g. `CYBER_COMMERCIAL_V1`).
5. **Starter Template**:
   - *Standard Underwriting Referral & Decision Matrix*: Generates a 4-node starter flow with Entry Ruleset, Decision Table, Conditional Switch, and Terminal Nodes.
   - *Empty Starter Canvas*: Generates a single Entry Ruleset node ready for custom layout.

---

### 4.3 Visual Canvas Controls & Palette Drawer

When a flow is opened, the full interactive canvas renders:

```
+----------------------------------------------------------------------------------------------------+
| [<- All Flows] | Flow: TECH_EO_RATING_FLOW [Active] | Product: TECH_EO | Plan: TECH_EO_COMMERCIAL |
+----------------------------------------------------------------------------------------------------+
| [Palette Drawer]   |                                                                  [MiniMap]    |
| +----------------+ |  [Node: 1. Normalize] -> [Node: 2. Cyber DT] -> [Node: 3. Switch]             |
| | + RULESET      | |                                                      /       \                |
| | + SWITCH       | |                                                     v         v               |
| | + TABLE        | |                                            [Node: 4a]     [Node: 4b]          |
| | + ADJUSTMENT   | |                                                                               |
| +----------------+ |                                                                               |
+----------------------------------------------------------------------------------------------------+
| Controls: [+] [-] [Fit View] [Lock Canvas] | [Validate Flow] [Test Runner] [Save & Commit]         |
+----------------------------------------------------------------------------------------------------+
```

- **Drag-and-Drop**: Drag a node type from the left palette and drop it anywhere onto the canvas.
- **Connecting Edges**: Click and drag from an output handle (circle on the right of a node) to an input handle (circle on the left of another node).
- **Canvas Navigation**: Use mouse wheel to zoom; click and drag canvas background to pan; click **Fit View** to center all nodes.

---

### 4.4 Node Property Editor & Edge Condition Inspector

- **Select a Node**: Clicking on any node opens the **Node Properties Drawer** on the right side:
  - Edit **Node Label / Name** and **Description**.
  - Edit the MVEL execution script or configure the Decision Table coordinate matrix.
- **Select an Edge**: Clicking on a routing edge opens the **Edge Condition Inspector**:
  - Specify the **Routing Condition** MVEL expression (e.g., `facts.cyberScore < 50`).
  - Toggle **Is Default Route** (`true`/`false`).
  - Specify **Evaluation Order** priority.

---

### 4.5 Topological Validation (Cycle Prevention)

Before any RuleFlow is committed, Rule Flow Studio runs **Kahn's Topological Sort Algorithm** via `GraphValidationService.java`:

$$\text{InDegree}(v) = 0 \implies \text{Enqueue}(v)$$

- **Loop Detection**: If an edge introduces a cycle (e.g. $A \rightarrow B \rightarrow C \rightarrow A$), validation fails immediately with the exact cycle path identified.
- **Isolated Node Detection**: Flags nodes that have no incoming or outgoing connections.
- **Commit Guard**: The **Save & Commit** button warns you if validation errors exist, preventing broken ruleflows from ever reaching production.

---

### 4.6 Interactive Simulation & Quick Test Drawer

Click **Test Runner** on the canvas toolbar to test your ruleflow instantly:

1. **Input Facts JSON**: Provide test values:
   ```json
   {
     "priorLossesCount": 0,
     "exposureValue": 10000000,
     "productCode": "TECH_EO"
   }
   ```
2. **Click "Run Test Execution"**: The backend executes the flow in real time.
3. **Execution Summary Card**:
   - Total latency in milliseconds (typically 10ms - 35ms).
   - Total graph steps executed.
   - Status (`RATED`, `REFERRAL`, `DECLINED`).
4. **Step-by-Step Audit Trace**: Inspect each node step with facts before, facts after, and duration in nanoseconds.

---

## 5. Hands-On Lab: Authoring the Tech E&O Dynamic Cyber Flow

In this end-to-end lab, you will author the production rating flow for Technology Errors & Omissions.

### Step 1: Create Flow & Metadata
1. Go to Rule Flow Studio catalog.
2. Click **+ Create New Rule Flow**.
3. Enter:
   - **Flow Code**: `TECH_EO_RATING_FLOW`
   - **Flow Name**: `Tech E&O Dynamic Cyber & Revenue Surcharge Flow`
   - **Product Line**: `TECH_EO`
   - **Rating Plan**: `TECH_EO_COMMERCIAL`
   - **Template**: *Empty Starter Canvas*
4. Click **Create Flow**.

---

### Step 2: Add Entry Ruleset (Exposure Normalization)
1. Drag a **RULESET** node onto the canvas.
2. Set Node Key: `node-entry`.
3. Set Node Name: `1. Normalize Exposure & Base Rate`.
4. Enter the MVEL script:
   ```java
   facts.exposureUnits = facts.exposureValue / 1000.0;
   facts.baseLossCost = 1.85;
   facts.preliminaryPremium = facts.exposureUnits * facts.baseLossCost;
   ```

---

### Step 3: Build the Cyber Risk Decision Table
1. Drag a **DECISION_TABLE** node onto the canvas.
2. Set Node Key: `node-matrix`.
3. Set Node Name: `2. Cyber Risk Rating Matrix`.
4. Configure Columns:
   - Column 1: Attribute `priorLossesCount`, Type `INPUT`, Display `Prior Losses`
   - Column 2: Attribute `exposureValue`, Type `INPUT`, Display `Exposure ($)`
   - Column 3: Attribute `riskFactor`, Type `OUTPUT`, Display `Cyber Factor`
5. Configure Rows:
   - Row 1: `priorLossesCount: 0`, `exposureValue: <= 2000000` $\rightarrow$ `riskFactor: 0.90`
   - Row 2: `priorLossesCount: 0`, `exposureValue: [2000001..10000000]` $\rightarrow$ `riskFactor: 1.00`
   - Row 3: `priorLossesCount: 0`, `exposureValue: > 10000000` $\rightarrow$ `riskFactor: 1.20`
   - Row 4: `priorLossesCount: > 0`, `exposureValue: -` $\rightarrow$ `riskFactor: 1.45`

---

### Step 4: Configure Branching with Conditional Switch
1. Drag a **CONDITIONAL_SWITCH** node onto the canvas.
2. Set Node Key: `node-switch`.
3. Set Node Name: `3. High Limit / Risk Route`.

---

### Step 5: Define Standard vs Referral Terminal Nodes
1. Drag two **RULESET** nodes for the outcomes:
   - **Node 4a (Referral)**:
     - Name: `4a. Referral to Senior Underwriter`
     - Script:
       ```java
       facts.finalAnnualPremium = facts.preliminaryPremium * (facts.riskFactor != null ? facts.riskFactor : 1.0) * 1.15;
       facts.ratingStatus = "REFERRAL";
       facts.referralReason = "Risk factor or limit exceeds automated branch authority.";
       facts.attachedForm = "EO-2025-REFERRAL-NOTICE";
       ```
   - **Node 4b (Standard Issuance)**:
     - Name: `4b. Standard Policy Rating & Issuance`
     - Script:
       ```java
       facts.finalAnnualPremium = facts.preliminaryPremium * (facts.riskFactor != null ? facts.riskFactor : 1.0);
       facts.ratingStatus = "RATED";
       facts.attachedForm = "EO-2025-BASE";
       ```

---

### Step 6: Route Edges & Conditions
1. Connect `node-entry` $\rightarrow$ `node-matrix`.
2. Connect `node-matrix` $\rightarrow$ `node-switch`.
3. Connect `node-switch` $\rightarrow$ `node-4a` (Referral):
   - Condition: `facts.riskFactor > 1.20 || facts.occurrenceLimit > 5000000`
   - Is Default: `false`
4. Connect `node-switch` $\rightarrow$ `node-4b` (Standard):
   - Condition: *(blank)*
   - Is Default: `true`

---

### Step 7: Validate & Test with Live Facts
1. Click **Validate Flow**: Verify banner turns green: *"Topological graph is valid. No cycles or dead-ends detected."*
2. Click **Test Runner** and run with:
   ```json
   { "exposureValue": 10000000, "priorLossesCount": 0, "productCode": "TECH_EO" }
   ```
3. Observe:
   - Step 1: Exposure normalized to `10000` units, preliminary premium = `$18,500.00`.
   - Step 2: Decision Table matches Row 2 (`riskFactor = 1.00`).
   - Step 3: Switch routes to `4b. Standard Policy Rating & Issuance`.
   - Final Premium: `$18,500.00` | Status: `RATED`.

---

## 6. Portal Rating & Production Execution

Once saved and marked `ACTIVE`, ruleflows are automatically accessible across the entire Helios ecosystem.

### 6.1 RatingQuoteDialog in Helios Portal

When an underwriter opens **Quotes & Rating $\rightarrow$ Rate & Issue New Quote** in the main portal:
1. Select **Technology Errors & Omissions** (or **Commercial Automobile & Fleet**).
2. The **Rating Orchestration Engine** card appears:
   - Toggle **⚡ BRMS Rule Flow**.
   - The dropdown automatically pre-selects the associated active flow (`TECH_EO_RATING_FLOW` or `COMMERCIAL_AUTO_RATING`).
3. Click **Execute BRMS RuleFlow Graph**.
4. The calculation executes via `/api/brms/flows/{id}/execute` in under 30 milliseconds.
5. The result card displays:
   - Calculated annual premium.
   - Status badge (`Quoted` or `Under Review`).
   - Attached mandatory policy forms and endorsements.
   - Full chronological audit trace showing each graph transition.

---

### 6.2 Audit Trail & Regulatory Compliance (`dbo.UW_QUOTE`)

When the quote is saved, the complete calculation trace is committed to SQL Server:
- **Table**: `dbo.UW_QUOTE`
- **Columns**: `BASE_RATE`, `LIMIT_AMT`, `RETENTION_AMT`, `SCHEDULE_MOD`, `CALC_TRACE` (JSON-encoded audit trace array), `SERFF_TRACKING_NBR`.

This guarantees that state insurance department rate examiners can reproduce every quote calculation down to the exact rule and factor.

---

### 6.3 Programmatic REST APIs

External ingestion systems, rating portals, or batch rating services can invoke ruleflows directly:

#### Execute Flow by ID:
```http
POST /api/brms/flows/10002/execute HTTP/1.1
Host: apptst.ad.ortaleza.com
Content-Type: application/json
X-Tenant-ID: 1

{
  "inputFacts": {
    "exposureValue": 10000000,
    "priorLossesCount": 0,
    "productCode": "TECH_EO"
  }
}
```

#### Execute Active Flow by Rating Plan:
```http
POST /api/brms/execute-by-plan HTTP/1.1
Host: apptst.ad.ortaleza.com
Content-Type: application/json

{
  "productCode": "COMMERCIAL_AUTO",
  "planCode": "AUTO_FLEET",
  "tenantId": 1,
  "inputFacts": {
    "fleetSize": 15,
    "driversUnder25": 1,
    "priorAccidents": 0,
    "lossRatio": 0.25,
    "telematicsScore": 88
  }
}
```

---

## 7. MVEL Language Syntax & Range Operator Cheat Sheet

### Common Arithmetic & Assignments
```java
// Basic math
facts.exposureUnits = facts.exposureValue / 1000.0;
facts.basePremium = facts.exposureUnits * facts.baseLossCost;

// Ternary logic
facts.multiplier = (facts.riskFactor != null) ? facts.riskFactor : 1.0;

// String assignments
facts.ratingStatus = "RATED";
facts.attachedForm = "EO-2025-BASE";

// Rounding to 2 decimal places
facts.finalAnnualPremium = Math.round(facts.subtotal * 100.0) / 100.0;
```

### Decision Table Coordinate Range Notation
| Range Expression | Mathematical Meaning | Example Matches |
| :--- | :--- | :--- |
| `[min..max]` | Inclusive on both bounds: $min \le x \le max$ | `[0..100]` matches `0`, `50`, `100` |
| `(min..max]` | Exclusive min, inclusive max: $min < x \le max$ | `(0..100]` matches `0.1`, `50`, `100` |
| `[min..max)` | Inclusive min, exclusive max: $min \le x < max$ | `[0..100)` matches `0`, `99.9` |
| `> N` | Strictly greater than $N$ | `> 10000000` matches `10000001` |
| `>= N` | Greater than or equal to $N$ | `>= 50000` matches `50000`, `75000` |
| `< N` | Strictly less than $N$ | `< 25` matches `24`, `0` |
| `<= N` | Less than or equal to $N$ | `<= 2000000` matches `2000000` |
| `== 'VALUE'` | Exact string match | `== 'CA'` matches `'CA'` |
| `!= 'VALUE'` | Exact inequality match | `!= 'DECLINED'` |
| `-` or `ANY` | Wildcard: unconditionally matches any value | Always evaluates to `true` |

---

## 8. Actuarial Governance & Troubleshooting FAQ

### Q1: What happens if an actuary creates a loop between two nodes?
**A**: Kahn's cycle-detection algorithm flags the loop during validation and disables the Save & Commit action. The exact cycle path (e.g. `node-matrix -> node-switch -> node-matrix`) is highlighted with actionable diagnostics.

### Q2: Why does MVEL throw `unresolvable property or identifier: facts`?
**A**: The engine injects working memory both at the root level and as a nested self-reference `workingMemory.put("facts", workingMemory)`. You can write either `exposureUnits = 100` or `facts.exposureUnits = 100`. If referencing an undeclared property in an expression, ensure the fact was initialized or use null-safe checks: `(facts.riskFactor != null ? facts.riskFactor : 1.0)`.

### Q3: How do we retire a ruleflow when a new state filing version is approved?
**A**:
1. Open the existing ruleflow and update its status from `ACTIVE` to `SUPERSEDED` or `ARCHIVED`.
2. Create the new ruleflow with version `2` (e.g. `TECH_EO_RATING_FLOW_2026`) and link it to the same product and plan code with status `ACTIVE`.
3. The routing engine (`/api/brms/execute-by-plan`) will automatically resolve the latest active version.

### Q4: How fast does a typical ruleflow execute?
**A**: In production testing on SQL Server and Tomcat 11:
- Commercial Fleet & Driver Flow (`10001`, 4 nodes): **9 milliseconds**
- Tech E&O Dynamic Cyber Flow (`10002`, 5 nodes + Decision Table): **22–28 milliseconds**

---
*Document Version: 1.0.0 — Approved for Helios Suite Enterprise Deployments*

