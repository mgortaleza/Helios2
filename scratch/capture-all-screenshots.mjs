import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const OUT_DIR = 'c:\\DEV\\Helios2\\deploy\\screenshots';
fs.mkdirSync(OUT_DIR, { recursive: true });

const TENANTS = [
  {
    tenantId: 1,
    tenantName: 'Helios2 Default Tenant (HELIOS2_TST)',
    dbServerName: 'dbtst.ad.ortaleza.com',
    dbCatalogName: 'HELIOS2_TST',
    primaryColor: '#013a12',
    accentColor: '#f59e0b',
    brandTitle: 'Helios',
    brandSubtitle: 'INSURANCE MANAGEMENT SUITE',
    enabledModules: 'dashboard,policy,submissions,claims'
  },
  {
    tenantId: 2,
    tenantName: 'Helios Legacy Tenant (HELIOS_TST)',
    dbServerName: 'dbtst.ad.ortaleza.com',
    dbCatalogName: 'HELIOS_TST',
    primaryColor: '#0f172a',
    accentColor: '#38bdf8',
    brandTitle: 'Helios Legacy',
    brandSubtitle: 'ENTERPRISE UNDERWRITING PORTAL',
    enabledModules: 'dashboard,policy,submissions,claims'
  }
];

const ROLES = [
  {
    roleId: 1,
    tenantId: 1,
    roleCode: 'EXECUTIVE',
    roleName: 'Executive / Full Access',
    allowedModules: 'dashboard,policy,submissions,claims',
    defaultTaskFilter: '',
    canCreateSubmission: true,
    canAddOrganization: true,
    canReportClaim: true
  },
  {
    roleId: 2,
    tenantId: 1,
    roleCode: 'UNDERWRITER',
    roleName: 'Senior Underwriter',
    allowedModules: 'dashboard,policy,submissions',
    defaultTaskFilter: 'Underwriting',
    canCreateSubmission: true,
    canAddOrganization: true,
    canReportClaim: false
  },
  {
    roleId: 3,
    tenantId: 1,
    roleCode: 'CLAIMS_ADJUSTER',
    roleName: 'Claims Adjuster',
    allowedModules: 'dashboard,policy,claims',
    defaultTaskFilter: 'Claims',
    canCreateSubmission: false,
    canAddOrganization: false,
    canReportClaim: true
  },
  {
    roleId: 4,
    tenantId: 1,
    roleCode: 'AUDITOR',
    roleName: 'Read-Only Compliance Auditor',
    allowedModules: 'dashboard,policy,submissions,claims',
    defaultTaskFilter: '',
    canCreateSubmission: false,
    canAddOrganization: false,
    canReportClaim: false
  }
];

const TASKS = [
  { id: 1, title: 'Review Tech E&O Submission — TechSolutions Corp', type: 'Underwriting', subType: 'Risk Assessment', relatedRecord: 'SUB-2026-101', status: 'Pending', dueDate: '2026-10-25' },
  { id: 2, title: 'Initial Reserve Evaluation — Alleged Cloud Platform Outage', type: 'Claims', subType: 'Claim Triage', relatedRecord: 'CLM-26-001', status: 'In Progress', dueDate: '2026-10-26' },
  { id: 3, title: 'Prepare 60-Day Renewal Terms — Apex Healthcare Partners', type: 'Renewals', subType: 'Renewal Prep', relatedRecord: 'POL-2026-8833', status: 'Urgent', dueDate: '2026-10-24' },
  { id: 4, title: 'Audit Cyber Liability Endorsement Limits — Vanguard FinTech', type: 'Underwriting', subType: 'Endorsement', relatedRecord: 'POL-2026-8834', status: 'Pending', dueDate: '2026-10-28' },
  { id: 5, title: 'Defense Counsel Assignment — Diagnostic Misread Claim', type: 'Claims', subType: 'Legal Defense', relatedRecord: 'CLM-26-002', status: 'In Progress', dueDate: '2026-10-29' }
];

const POLICIES = [
  {
    id: 'POL-2026-8832',
    policyId: 1,
    insuredPid: 1,
    name: 'TechSolutions Corp',
    productType: 'Technology E&O',
    fileStatus: 'Active',
    address: '101 Innovation Blvd, San Francisco, CA 94107',
    industry: 'Enterprise SaaS & Cloud Infrastructure',
    agencyInfo: 'Acme Brokers Inc. - Agent: Sarah Jenkins',
    submissions: [
      {
        id: 'SUB-2026-101',
        submsnId: 100001,
        date: '2026-01-15',
        status: 'Bound',
        fileLevelInfo: {
          underwriter: 'Alex Morgan',
          effectiveDate: '2026-02-01',
          expirationDate: '2027-02-01',
          retroactiveDate: '2022-02-01',
          limit: '$5,000,000',
          retention: '$50,000'
        },
        quotes: [{ quoteId: 'Q-1092-A', premium: '$24,500', status: 'Bound', generated: '2026-01-20' }]
      }
    ]
  },
  {
    id: 'POL-2026-8833',
    policyId: 2,
    insuredPid: 2,
    name: 'Apex Healthcare Partners',
    productType: 'Medical Malpractice',
    fileStatus: 'Active',
    address: '450 Medical Center Pkwy, Boston, MA 02115',
    industry: 'Healthcare Systems & Hospital Networks',
    agencyInfo: 'Beacon Risk Advisors - Agent: David Ross',
    submissions: [
      {
        id: 'SUB-2026-102',
        submsnId: 100002,
        date: '2026-03-10',
        status: 'Under Review',
        fileLevelInfo: {
          underwriter: 'Elena Rostova',
          effectiveDate: '2026-04-01',
          expirationDate: '2027-04-01',
          retroactiveDate: '2021-04-01',
          limit: '$10,000,000',
          retention: '$100,000'
        },
        quotes: [{ quoteId: 'Q-1104-B', premium: '$48,200', status: 'Offered', generated: '2026-03-14' }]
      }
    ]
  },
  {
    id: 'POL-2026-8834',
    policyId: 3,
    insuredPid: 3,
    name: 'Vanguard Financial Group',
    productType: 'Directors & Officers',
    fileStatus: 'Pending Renewal',
    address: '88 Wall Street, Suite 1900, New York, NY 10005',
    industry: 'Financial Services & Asset Management',
    agencyInfo: 'Sterling Specialty Group - Agent: Marcus Vance',
    submissions: []
  }
];

const SUBMISSIONS = [
  {
    submsnId: 100001,
    submsnNbr: 'SUB-2026-101',
    insuredPid: 1,
    orgName: 'TechSolutions Corp',
    policyId: 1,
    policyNbr: 'POL-2026-8832',
    productType: 'Technology E&O',
    date: '2026-01-15',
    status: 'Bound',
    fileLevelInfo: {
      underwriter: 'Alex Morgan',
      effectiveDate: '2026-02-01',
      expirationDate: '2027-02-01',
      retroactiveDate: '2022-02-01',
      limit: '$5,000,000',
      retention: '$50,000'
    },
    quotes: [{ quoteId: 'Q-1092-A', premium: '$24,500', status: 'Bound', generated: '2026-01-20' }]
  },
  {
    submsnId: 100002,
    submsnNbr: 'SUB-2026-102',
    insuredPid: 2,
    orgName: 'Apex Healthcare Partners',
    policyId: 2,
    policyNbr: 'POL-2026-8833',
    productType: 'Medical Malpractice',
    date: '2026-03-10',
    status: 'Under Review',
    fileLevelInfo: {
      underwriter: 'Elena Rostova',
      effectiveDate: '2026-04-01',
      expirationDate: '2027-04-01',
      retroactiveDate: '2021-04-01',
      limit: '$10,000,000',
      retention: '$100,000'
    },
    quotes: [{ quoteId: 'Q-1104-B', premium: '$48,200', status: 'Offered', generated: '2026-03-14' }]
  },
  {
    submsnId: 100003,
    submsnNbr: 'SUB-2026-103',
    insuredPid: 3,
    orgName: 'Vanguard Financial Group',
    policyId: 3,
    policyNbr: 'POL-2026-8834',
    productType: 'Directors & Officers',
    date: '2026-05-18',
    status: 'Quoted',
    fileLevelInfo: {
      underwriter: 'Alex Morgan',
      effectiveDate: '2026-06-01',
      expirationDate: '2027-06-01',
      retroactiveDate: '2023-06-01',
      limit: '$5,000,000',
      retention: '$75,000'
    },
    quotes: [{ quoteId: 'Q-1129-A', premium: '$31,900', status: 'Offered', generated: '2026-05-20' }]
  }
];

const PARTIES = [
  { id: 1, name: 'TechSolutions Corp' },
  { id: 2, name: 'Apex Healthcare Partners' },
  { id: 3, name: 'Vanguard Financial Group' },
  { id: 4, name: 'Pacific Northwest Architects LLP' },
  { id: 5, name: 'Meridian Cyber Defense Inc' }
];

const CLAIMS = [
  {
    id: 1,
    claimNbr: 'CLM-26-001',
    policyNbr: 'POL-2026-8832',
    insuredName: 'TechSolutions Corp',
    productType: 'Technology E&O',
    lossDate: '2026-05-12',
    status: 'Open - Investigating',
    reserveAmt: '$125,000',
    description: 'Alleged software SLA downtime breach resulting in client revenue loss.'
  },
  {
    id: 2,
    claimNbr: 'CLM-26-002',
    policyNbr: 'POL-2026-8833',
    insuredName: 'Apex Healthcare Partners',
    productType: 'Medical Malpractice',
    lossDate: '2026-07-04',
    status: 'Legal Defense',
    reserveAmt: '$250,000',
    description: 'Diagnostic delay claim defended by appointed specialized medical defense counsel.'
  },
  {
    id: 3,
    claimNbr: 'CLM-26-003',
    policyNbr: 'POL-2026-8834',
    insuredName: 'Vanguard Financial Group',
    productType: 'Directors & Officers',
    lossDate: '2026-02-19',
    status: 'Closed - Paid',
    reserveAmt: '$45,000',
    description: 'SEC reporting audit defense reimbursement settled within retention.'
  }
];

function createServer(staticRoot) {
  return http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const tenantHeader = Number(req.headers['x-tenant-id'] || url.searchParams.get('tenantId') || 1);
    const activeTenant = TENANTS.find((t) => t.tenantId === tenantHeader) || TENANTS[0];

    if (url.pathname.startsWith('/api/')) {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Headers', '*');
      if (req.method === 'OPTIONS') {
        res.end();
        return;
      }
      if (url.pathname === '/api/tenants') {
        res.end(JSON.stringify(TENANTS));
      } else if (url.pathname === '/api/roles') {
        res.end(JSON.stringify(ROLES.map((r) => ({ ...r, tenantId: activeTenant.tenantId }))));
      } else if (url.pathname === '/api/tasks') {
        res.end(JSON.stringify(TASKS));
      } else if (url.pathname === '/api/policies') {
        res.end(JSON.stringify(POLICIES));
      } else if (url.pathname === '/api/submissions') {
        res.end(JSON.stringify(SUBMISSIONS));
      } else if (url.pathname === '/api/parties') {
        res.end(JSON.stringify(PARTIES));
      } else if (url.pathname === '/api/claims') {
        res.end(JSON.stringify(CLAIMS));
      } else if (url.pathname === '/api/diagnostics') {
        res.end(
          JSON.stringify({
            application: 'Helios2 Spring Boot Multi-Tenant Service',
            osAndArch: 'Windows Server 2022 (amd64)',
            javaRuntime: '21.0.2+13-LTS',
            processUser: 'AD\\mark',
            authMode: 'Windows Integrated Auth (Native DLL)',
            serverTime: new Date().toISOString(),
            activeTenantId: activeTenant.tenantId,
            activeTenantConfig: activeTenant,
            masterDatabase: {
              connected: true,
              databaseName: 'MSTR_DATA',
              serverName: 'dbtst.ad.ortaleza.com (DBTST)',
              authenticatedUser: 'AD\\mark',
              loginUser: 'AD\\mark',
              sqlVersion: 'Microsoft SQL Server 2025 (RTM) - 17.0.1000.7 (X64)'
            },
            tenantDatabase: {
              connected: true,
              databaseName: activeTenant.dbCatalogName,
              serverName: 'dbtst.ad.ortaleza.com (DBTST)',
              authenticatedUser: 'AD\\mark',
              loginUser: 'AD\\mark',
              sqlVersion: 'Microsoft SQL Server 2025 (RTM) - 17.0.1000.7 (X64)'
            }
          })
        );
      } else {
        res.end(JSON.stringify({ ok: true }));
      }
      return;
    }

    let filePath = path.join(staticRoot, url.pathname === '/' ? 'index.html' : url.pathname);
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(staticRoot, 'index.html');
    }
    const ext = path.extname(filePath);
    const mime =
      ext === '.html'
        ? 'text/html'
        : ext === '.js'
        ? 'application/javascript'
        : ext === '.css'
        ? 'text/css'
        : 'application/octet-stream';
    res.setHeader('Content-Type', mime);
    res.end(fs.readFileSync(filePath));
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const helios2Server = createServer('c:\\DEV\\Helios2\\frontend\\dist');
  const adminServer = createServer('c:\\DEV\\HeliosAdmin\\frontend\\dist');

  await new Promise((r) => helios2Server.listen(18080, '127.0.0.1', r));
  await new Promise((r) => adminServer.listen(18090, '127.0.0.1', r));
  console.log('Static servers listening on 18080 and 18090');

  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const userDataDir = 'c:\\DEV\\Helios2\\chrome_temp_profile';
  fs.mkdirSync(userDataDir, { recursive: true });

  const chrome = spawn(chromePath, [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--remote-debugging-port=19222',
    '--remote-debugging-address=127.0.0.1',
    `--user-data-dir=${userDataDir}`,
    'about:blank'
  ]);

  let wsBrowserUrl = null;
  for (let i = 0; i < 20; i++) {
    await sleep(400);
    try {
      const res = await fetch('http://127.0.0.1:19222/json/version');
      const v = await res.json();
      if (v.webSocketDebuggerUrl) {
        wsBrowserUrl = v.webSocketDebuggerUrl;
        break;
      }
    } catch {}
  }

  if (!wsBrowserUrl) {
    throw new Error('Failed to get browser WebSocket URL');
  }
  console.log('Connecting to Chrome CDP:', wsBrowserUrl);

  const ws = new WebSocket(wsBrowserUrl);
  await new Promise((r) => ws.addEventListener('open', r));

  let callId = 1;
  const cdpCall = (method, params = {}, sessionId = undefined) =>
    new Promise((resolve, reject) => {
      const id = callId++;
      const handler = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.id === id) {
          ws.removeEventListener('message', handler);
          if (msg.error) reject(new Error(msg.error.message));
          else resolve(msg.result);
        }
      };
      ws.addEventListener('message', handler);
      const payload = { id, method, params };
      if (sessionId) payload.sessionId = sessionId;
      ws.send(JSON.stringify(payload));
    });

  // Create page target for Helios2
  const { targetId } = await cdpCall('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await cdpCall('Target.attachToTarget', { targetId, flatten: true });

  await cdpCall('Page.enable', {}, sessionId);
  await cdpCall('DOM.enable', {}, sessionId);
  await cdpCall('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false
  }, sessionId);

  const capture = async (filename) => {
    await sleep(700);
    const { data } = await cdpCall('Page.captureScreenshot', { format: 'png' }, sessionId);
    const filePath = path.join(OUT_DIR, filename);
    fs.writeFileSync(filePath, Buffer.from(data, 'base64'));
    console.log('✓ Captured:', filePath, `(${Math.round(data.length * 0.75 / 1024)} KB)`);
  };

  const evalInPage = async (expr) => {
    const res = await cdpCall('Runtime.evaluate', { expression: expr, awaitPromise: true }, sessionId);
    await sleep(500);
    return res;
  };

  // 1. Helios2 Dashboard - Tenant 1 (HELIOS2_TST - Forest Green & Gold)
  console.log('Navigating to Helios2...');
  await cdpCall('Page.navigate', { url: 'http://127.0.0.1:18080/' }, sessionId);
  await sleep(1800);
  await capture('helios2-dashboard-tenant1.png');

  // 2. Helios2 Policies View (Expand first policy to show submissions & quotes)
  console.log('Switching to Policies view...');
  await evalInPage(`
    const items = Array.from(document.querySelectorAll('.MuiListItemButton-root'));
    const p = items.find(el => el.textContent.includes('Policies'));
    if (p) p.click();
  `);
  await sleep(600);
  await evalInPage(`
    const tr = document.querySelector('tbody tr');
    if (tr) tr.click();
  `);
  await capture('helios2-policies-view.png');

  // 3. Helios2 Submissions View & Create Submission Modal
  console.log('Opening Submissions & Search Organization modal...');
  await evalInPage(`
    const items = Array.from(document.querySelectorAll('.MuiListItemButton-root'));
    const s = items.find(el => el.textContent.includes('Submissions'));
    if (s) s.click();
  `);
  await sleep(600);
  await evalInPage(`
    const btns = Array.from(document.querySelectorAll('button'));
    const b = btns.find(el => el.textContent.includes('New Submission'));
    if (b) b.click();
  `);
  await capture('helios2-search-party.png');

  // 4. Helios2 Add Organization Modal
  console.log('Opening Add Organization modal...');
  await evalInPage(`
    const btns = Array.from(document.querySelectorAll('button'));
    const c = btns.find(el => el.textContent.trim() === 'Cancel');
    if (c) c.click();
  `);
  await sleep(300);
  await evalInPage(`
    const btns = Array.from(document.querySelectorAll('button'));
    const b = btns.find(el => el.textContent.includes('New Organization'));
    if (b) b.click();
  `);
  await capture('helios2-add-org.png');

  // 5. Helios2 Switch to Tenant 2 (Helios Legacy - Navy Theme)
  console.log('Switching to Tenant #2 (HELIOS_TST)...');
  await evalInPage(`
    const btns = Array.from(document.querySelectorAll('button'));
    const c = btns.find(el => el.textContent.trim() === 'Cancel');
    if (c) c.click();
  `);
  await sleep(300);
  await evalInPage(`
    const items = Array.from(document.querySelectorAll('.MuiListItemButton-root'));
    const d = items.find(el => el.textContent.includes('Dashboard'));
    if (d) d.click();
  `);
  await sleep(500);
  // Open tenant select
  await evalInPage(`
    const selects = Array.from(document.querySelectorAll('[role="combobox"]'));
    if (selects[0]) selects[0].dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
  `);
  await sleep(400);
  await evalInPage(`
    const opts = Array.from(document.querySelectorAll('[role="option"]'));
    const t2 = opts.find(o => o.textContent.includes('Tenant #2') || o.textContent.includes('HELIOS_TST'));
    if (t2) t2.click();
  `);
  await sleep(800);
  await capture('helios2-dashboard-tenant2.png');

  // 6. HeliosAdmin Control Plane - Tab 1: Tenant Customization
  console.log('Navigating to HeliosAdmin Control Plane...');
  await cdpCall('Page.navigate', { url: 'http://127.0.0.1:18090/' }, sessionId);
  await sleep(1800);
  await capture('helios-admin-tenants.png');

  // 7. HeliosAdmin Control Plane - Tab 2: Role & RBAC Manager
  console.log('Opening HeliosAdmin Role Manager...');
  await evalInPage(`
    const items = Array.from(document.querySelectorAll('.MuiListItemButton-root'));
    const r = items.find(el => el.textContent.includes('Role & RBAC Manager'));
    if (r) r.click();
  `);
  await sleep(600);
  await capture('helios-admin-roles.png');

  // 8. HeliosAdmin Control Plane - Tab 3: SQL & System Diagnostics
  console.log('Opening HeliosAdmin SQL Diagnostics...');
  await evalInPage(`
    const items = Array.from(document.querySelectorAll('.MuiListItemButton-root'));
    const diag = items.find(el => el.textContent.includes('SQL & System Diagnostics'));
    if (diag) diag.click();
  `);
  await sleep(600);
  await capture('helios2-diagnostics.png');

  ws.close();
  chrome.kill();
  helios2Server.close();
  adminServer.close();
  console.log('All screenshots captured successfully!');
  process.exit(0);
}

main().catch((err) => {
  console.error('ERROR:', err);
  process.exit(1);
});

