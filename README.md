# Helios2 — Multi-Tenant Spring Boot & React JS Framework

## Overview
**Helios2** is the next-generation modernization of the legacy Jakarta EE / JSP **Helios** application. It uses a **Spring Boot 3.4 (Java 21)** backend, a **React 18 (Vite)** frontend, and **Microsoft SQL Server** with dynamic multi-tenant database routing powered by **`MSTR_DATA`** and **`HELIOS2_TST`**.

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

---

## REST API Endpoints (`http://localhost:8081/api`)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/tenants` | Lists all tenants configured in `MSTR_DATA.dbo.TENANT_DB_CONFIG`. |
| `POST` | `/api/tenants` | Registers or updates a tenant in `MSTR_DATA.dbo.TENANT_DB_CONFIG`. |
| `GET` | `/api/submissions` | Lists submissions (`UW_SUBMSN` joined with `PT_PARTY`) from the active tenant DB. |
| `POST` | `/api/submissions` | Creates a new submission for `{ "partyId": <id> }` in the active tenant DB. |
| `GET` | `/api/parties?q=...` | Searches organizations (`PT_PARTY`) in the active tenant DB. |
| `POST` | `/api/parties` | Creates a new organization `{ "orgName": "..." }` in `PT_PARTY`. |
| `GET` | `/api/diagnostics` | Returns runtime info and live SQL Server connection status for both `MSTR_DATA` and the active tenant catalog. |

---

## Running Locally

### Backend (Spring Boot on port `8081`)
```powershell
cd c:\DEV\Helios2
mvn spring-boot:run
```

### Frontend (React + Vite on port `5173`)
```powershell
cd c:\DEV\Helios2\frontend
npm.cmd install
npm.cmd run dev
```
