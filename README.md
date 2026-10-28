# Helios2 — Multi-Tenant Spring Boot & React JS Framework

## Overview
**Helios2** is the next-generation enterprise modernization of the legacy Jakarta EE / JSP **Helios** application. It uses a **Spring Boot 3.5.16** and **Java 25** backend, a **React (Vite)** frontend, and **Microsoft SQL Server 2025** with dynamic multi-tenant database routing powered by **`MSTR_DATA`** and tenant catalogs (**`HELIOS2_TST`**, **`HELIOS_TST`**, etc.).

Link to live dev build:

- **Application**: https://app.netyx.net
- **Administration**: https://admin.netyx.net

---

## Environment & Version Confirmation

| Component | Verified Running Version | Build Target / Platform | Notes |
| :--- | :--- | :--- | :--- |
| **Spring Boot** | **`3.5.16`** | `spring-boot-starter-parent:3.5.16` | Standardized across all Helios microservices (`Helios2`, `helios-document`, `helios-admin`, `helios-rating`, `helios-docgen`). Verified in live startup logs (`:: Spring Boot :: (v3.5.16)`). |
| **Java Runtime (JVM)** | **`Java 25.0.4.1`** | `Eclipse Adoptium jdk-25.0.4.1-hotspot` | Live JVM executing Tomcat 11 services on `apptst.ad.ortaleza.com`. |
| **Java Language Target** | **`Java 25`** | `<java.version>25</java.version>` | Full virtual threads (`Loom`) and pattern matching support. Secondary Adoptium JDK 21 installed for backward-compatible javac staging. |
| **Application Server** | **Apache Tomcat 11.0.3** | `Tomcat11`, `Tomcat11Document`, `Tomcat11Admin`, `Tomcat11Rating`, `Tomcat11Docgen` | High-performance multi-instance procrun architecture with Nginx reverse proxy. |
| **Database** | **Microsoft SQL Server 2025** | `dbtst.ad.ortaleza.com:1433` | Windows Integrated Authentication (`mssql-jdbc_auth-13.6.0.x64.dll`). |
| **Document Engine** | **Aspose.Words for Java** | Word (`.docx`) DOM Manipulation & Direct PDF Generation | Tabular row cloning, dynamic tag replacement, blank line suppression, and native PDF rendering. |

---

## Declaration Page Template Engine & Document Generation Studio

Helios 2 features an enterprise-grade document ingestion and generation engine for insurance Declaration Pages:

1. **Word Template (.docx) Ingestion**:
   - Single-request multipart upload submitting form metadata (`form_id`, `form_revision`, `form_name`, `effective_date`, `product_id`) and template file.
   - Dual-pass Aspose.Words scanning (`IReplacingCallback` + paragraph/table scanner) extracting all `<<field_names>>` into `dbo.dec_page_template_field`.
   - Physical template files securely stored under `C:\helios-storage\templates\dec-pages\`.

2. **Aspose Document Generation & Variable Coverage Table Strategy**:
   - Accepts test field values and mock coverage rows.
   - **Dual Coverage Strategy**: Supports both dynamic 2nd-row template deep cloning (for unnumbered `<<Coverage_Name>>` tables) and slot-based replacement (`<<Coverage_1_Name>>` to `<<Coverage_20_...>>`).
   - **Blank Row Suppression**: Automatically eliminates blank lines in tables by detecting empty/unused coverage rows and calling `row.remove()` on the table DOM.
   - **Direct PDF Export**: Direct conversion to PDF (`doc.save(out, SaveFormat.PDF)`) returning `application/pdf`.

3. **Universal Document Inbox Viewer**:
   - Centralized `openDocumentViewer` utility powering the detached 2nd-screen/tab document previewer (`#/document-preview`).
   - Unified support across test Dec Pages, formal policy documents, and incoming inbox intake files.
   - Real-time cross-window synchronization via `localStorage`, `BroadcastChannel`, and `window.opener`.

---

## Architecture & Multi-Tenancy

1. **Master Multi-Tenant Registry (`MSTR_DATA`)**
   - Table: `dbo.TENANT_DB_CONFIG`
   - Columns:
     - `TENANT_ID` (`INT`, Primary Key)
     - `TENANT_NAME` (`VARCHAR(100)`)
     - `DB_SERVER_NM` (`VARCHAR(100)`)
     - `DB_CATALOG_NM` (`VARCHAR(100)`)
   - Configured Tenants:
     - **Tenant 1 (Default)**: `HELIOS2_TST` on `dbtst.ad.ortaleza.com`
     - **Tenant 2 (Legacy)**: `HELIOS_TST` on `dbtst.ad.ortaleza.com`

2. **Dynamic Tenant Routing (Spring Boot)**
   - `TenantFilter` intercepts incoming HTTP requests and extracts the `X-Tenant-ID` header (or `?tenantId=` query parameter, defaulting to Tenant `1`).
   - `TenantContext` stores the active tenant ID in a `ThreadLocal`.
   - `TenantRoutingDataSource` (extending Spring's `AbstractRoutingDataSource`) looks up the tenant's target SQL Server and catalog via `TenantRegistryService` (`MSTR_DATA.dbo.TENANT_DB_CONFIG`), lazily creates a dedicated `HikariDataSource` pool per tenant, and caches it for subsequent requests.
   - `SqlServerDataSourceFactory` automatically configures **Windows Integrated Authentication** (`mssql-jdbc_auth-13.6.0.x64.dll`) on Windows and **`JavaKerberos` (JAAS)** on macOS/Linux.

3. **Tenant Database Schema (`HELIOS2_TST`)**
   - `dbo.PT_PARTY`:
     - `PARTY_ID` (`INT IDENTITY(1,1) PRIMARY KEY`)
     - `ORG_NM` (`VARCHAR(100) NOT NULL`)
   - `dbo.UW_SUBMSN`:
     - `SUBMSN_ID` (`INT IDENTITY(100000,1) PRIMARY KEY`)
     - `SUBMSN_NBR` (`VARCHAR(50) NOT NULL`)
     - `INSURED_PID` (`INT NOT NULL REFERENCES dbo.PT_PARTY(PARTY_ID)`)
   - `dbo.dec_page_template` & `dbo.dec_page_template_field`:
     - Parent/child tables storing template metadata, disk storage paths, and extracted tag schemas.

---

## REST API Endpoints

### Core Policy & Tenant Endpoints (`/api`)
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/tenants` | Lists all tenants configured in `MSTR_DATA.dbo.TENANT_DB_CONFIG`. |
| `POST` | `/api/tenants` | Registers or updates a tenant in `MSTR_DATA.dbo.TENANT_DB_CONFIG`. |
| `GET` | `/api/submissions` | Lists submissions (`UW_SUBMSN` joined with `PT_PARTY`) from the active tenant DB. |
| `POST` | `/api/submissions` | Creates a new submission for `{ "partyId": <id> }` in the active tenant DB. |
| `GET` | `/api/parties?q=...` | Searches organizations (`PT_PARTY`) in the active tenant DB. |
| `POST` | `/api/parties` | Creates a new organization `{ "orgName": "..." }` in `PT_PARTY`. |
| `GET` | `/api/diagnostics` | Returns runtime info and live SQL Server connection status for both `MSTR_DATA` and the active tenant catalog. |

### Dec Page Template Endpoints (`/document-api/dec-page-templates`)
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/document-api/dec-page-templates` | Lists all ingested Dec Page templates for the tenant. |
| `GET` | `/document-api/dec-page-templates/{id}` | Fetches template details and all extracted `<<field_names>>`. |
| `POST` | `/document-api/dec-page-templates` | Multipart upload and ingestion of a Word (.docx) template. |
| `POST` | `/document-api/dec-page-templates/{id}/generate-test` | Generates a test Dec Page as a populated PDF with row cloning. |
| `DELETE` | `/document-api/dec-page-templates/{id}` | Deletes template record, extracted fields, and physical disk file. |

---

## Business Rules Management System (BRMS) & Rule Flow Studio

Helios Suite features an enterprise-grade visual Rule Flow Visualizer & Execution Platform modeled after FICO Blaze Advisor and Red Hat Drools.

- **Visual Orchestrator (`HeliosAdmin:8090`)**: React Flow canvas with custom nodes (`RULESET`, `CONDITIONAL_SWITCH`, `DECISION_TABLE`, `UI_ADJUSTMENT`), topological validation (Kahn's cycle detection), and simulation drawers.
- **Coordinate-Based Decision Matrix**: Coordinate relational model ($Row \times Column \rightarrow Cell$) with custom insurance mathematical range parser (`[Min..Max]`, `< / >`, `<= / >=`).
- **Live Portal Rating Integration (`Helios2:80`)**: `RatingQuoteDialog` features dual-engine execution, auto-matching active RuleFlows by product/plan code and persisting microsecond audit trails to `dbo.UW_QUOTE`.
- **Comprehensive Training Manual**: See [`docs/RULE_FLOW_STUDIO_TRAINING_GUIDE.md`](docs/RULE_FLOW_STUDIO_TRAINING_GUIDE.md) for detailed tutorials, architectural diagrams, MVEL cheat sheets, and hands-on labs.

### BRMS REST Endpoints (`/api/brms/`)
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/brms/flows` | Lists RuleFlows, optional `?productCode=` filter. |
| `POST` | `/api/brms/flows` | Creates a new RuleFlow with starter nodes and layout. |
| `GET` | `/api/brms/flows/{id}` | Fetches full RuleFlow definition with nodes, edges, coordinate tables, and layout. |
| `PUT` | `/api/brms/flows/{id}` | Updates flow metadata, product/plan associations, and status. |
| `POST` | `/api/brms/flows/{id}/execute` | Executes a specific flow against input facts with audit snapshot trail. |
| `POST` | `/api/brms/execute-by-plan` | Resolves and executes the active flow matching `{ productCode, planCode }`. |
| `POST` | `/api/brms/validate` | Runs Kahn's topological sort for loop detection and DAG validation. |

---

## Running Locally

### Backend (Spring Boot on port `8081` / Tomcat `8080`)
```powershell
cd c:\DEV\Helios2
mvn spring-boot:run
```

### Document Service (Tomcat port `8086`)
```powershell
cd c:\DEV\Helios2\helios-document
mvn spring-boot:run
```

### Frontend (React + Vite on port `5173`)
```powershell
cd c:\DEV\Helios2\frontend
npm.cmd install
npm.cmd run dev
```
