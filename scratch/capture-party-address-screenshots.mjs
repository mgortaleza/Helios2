import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const OUT_DIR = 'C:\\DEV\\helios2\\deploy\\screenshots';
fs.mkdirSync(OUT_DIR, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function run() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const userDataDir = 'C:\\DEV\\helios2\\chrome_temp_profile';
  fs.mkdirSync(userDataDir, { recursive: true });

  const chrome = spawn(chromePath, [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--remote-debugging-port=19223',
    '--remote-debugging-address=127.0.0.1',
    `--user-data-dir=${userDataDir}`,
    'about:blank'
  ]);

  let wsBrowserUrl = null;
  for (let i = 0; i < 20; i++) {
    await sleep(400);
    try {
      const res = await fetch('http://127.0.0.1:19223/json/version');
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
  console.log('Connecting to Chrome CDP...');

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

  const { targetId } = await cdpCall('Target.createTarget', { url: 'http://10.1.10.56/' });
  const { sessionId } = await cdpCall('Target.attachToTarget', { targetId, flatten: true });

  await cdpCall('Page.enable', {}, sessionId);
  await cdpCall('Runtime.enable', {}, sessionId);
  await cdpCall('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false
  }, sessionId);

  const evalInPage = async (expr) => {
    return cdpCall(
      'Runtime.evaluate',
      { expression: expr, awaitPromise: true, returnByValue: true },
      sessionId
    );
  };

  const capture = async (filename) => {
    const res = await cdpCall('Page.captureScreenshot', { format: 'png' }, sessionId);
    const buf = Buffer.from(res.data, 'base64');
    const dest = path.join(OUT_DIR, filename);
    fs.writeFileSync(dest, buf);
    console.log(`Saved screenshot: ${dest}`);
  };

  await sleep(2500);

  // Navigate to Submissions view
  console.log('Navigating to Submissions view...');
  await evalInPage(`
    const items = Array.from(document.querySelectorAll('.MuiListItemButton-root'));
    const s = items.find(el => el.textContent.includes('Submissions'));
    if (s) s.click();
  `);
  await sleep(1500);

  // Switch to Party & Address Registry Tab (SubTab 1)
  console.log('Switching to Party & Address Registry tab...');
  await evalInPage(`
    const tabs = Array.from(document.querySelectorAll('.MuiTab-root'));
    const partyTab = tabs.find(t => t.textContent.includes('Party') || t.textContent.includes('Registry'));
    if (partyTab) partyTab.click();
  `);
  await sleep(1500);

  await capture('party-address-registry.png');

  // Open "Add Party / Organization" Dialog
  console.log('Opening Add Party dialog...');
  await evalInPage(`
    const btns = Array.from(document.querySelectorAll('button'));
    const addBtn = btns.find(b => b.textContent.includes('Add Party'));
    if (addBtn) addBtn.click();
  `);
  await sleep(1000);

  await capture('party-add-modal.png');

  // Close Add Party Dialog
  await evalInPage(`
    const btns = Array.from(document.querySelectorAll('button'));
    const cancelBtn = btns.find(b => b.textContent.trim() === 'Cancel');
    if (cancelBtn) cancelBtn.click();
  `);
  await sleep(800);

  // Open Address History for Summit Health Group (or first party with history)
  console.log('Opening Address History dialog...');
  await evalInPage(`
    const rows = Array.from(document.querySelectorAll('tbody tr'));
    const targetRow = rows.find(r => r.textContent.includes('Summit Health Group') || r.textContent.includes('Acme'));
    if (targetRow) {
      const histBtn = targetRow.querySelector('button');
      if (histBtn) histBtn.click();
    }
  `);
  await sleep(1500);

  await capture('party-address-history.png');

  // Test form reset on reopen:
  console.log('Testing: Clicking "+ Record New Address"...');
  await evalInPage(`
    const btns = Array.from(document.querySelectorAll('button'));
    const recBtn = btns.find(b => b.textContent && b.textContent.includes('Record New Address'));
    if (recBtn) recBtn.click();
  `);
  await sleep(1000);

  const allInputs = await evalInPage(`
    Array.from(document.querySelectorAll('input')).map(i => ({ placeholder: i.placeholder, id: i.id, value: i.value }))
  `);
  console.log('All inputs on page after clicking + Record New Address:', allInputs.result?.value);

  console.log('Entering test address and ZIP data...');
  await evalInPage(`
    const inputs = Array.from(document.querySelectorAll('input'));
    const line1 = inputs.find(i => i.placeholder && i.placeholder.includes('100 Corporate Blvd'));
    if (line1) {
      line1.value = '777 Persistence Testing Blvd';
      line1.dispatchEvent(new Event('input', { bubbles: true }));
      line1.dispatchEvent(new Event('change', { bubbles: true }));
    }
    const zip = inputs.find(i => i.placeholder && i.placeholder.includes('02115'));
    if (zip) {
      zip.value = '60611';
      zip.dispatchEvent(new Event('input', { bubbles: true }));
      zip.dispatchEvent(new Event('change', { bubbles: true }));
    }
  `);
  await sleep(1000);

  const dirtyValues = await evalInPage(`
    (() => {
      const inputs = Array.from(document.querySelectorAll('input'));
      const line1 = inputs.find(i => i.placeholder && i.placeholder.includes('100 Corporate Blvd'));
      const zip = inputs.find(i => i.placeholder && i.placeholder.includes('02115'));
      return { line1: line1 ? line1.value : null, zip: zip ? zip.value : null };
    })()
  `);
  console.log('Dirty values entered into form:', dirtyValues.result?.value);

  await capture('party-address-dirty.png');

  console.log('Closing Address History dialog...');
  await evalInPage(`
    const btns = Array.from(document.querySelectorAll('button'));
    const closeBtn = btns.find(b => b.textContent && b.textContent.trim() === 'Close');
    if (closeBtn) closeBtn.click();
  `);
  await sleep(1000);

  console.log('Reopening Address History dialog...');
  await evalInPage(`
    const rows = Array.from(document.querySelectorAll('tbody tr'));
    const targetRow = rows.find(r => r.textContent.includes('Summit Health Group') || r.textContent.includes('Acme'));
    if (targetRow) {
      const histBtn = targetRow.querySelector('button');
      if (histBtn) histBtn.click();
    }
  `);
  await sleep(1500);

  console.log('Opening "+ Record New Address" on reopened dialog...');
  await evalInPage(`
    const btns = Array.from(document.querySelectorAll('button'));
    const recBtn = btns.find(b => b.textContent && b.textContent.includes('Record New Address'));
    if (recBtn) recBtn.click();
  `);
  await sleep(1000);

  const cleanValues = await evalInPage(`
    (() => {
      const inputs = Array.from(document.querySelectorAll('input'));
      const line1 = inputs.find(i => i.placeholder && i.placeholder.includes('100 Corporate Blvd'));
      const zip = inputs.find(i => i.placeholder && i.placeholder.includes('02115'));
      const city = inputs.find(i => i.placeholder && i.placeholder.includes('Boston'));
      return {
        line1: line1 ? line1.value : null,
        zip: zip ? zip.value : null,
        city: city ? city.value : null
      };
    })()
  `);
  console.log('Clean values on reopen:', cleanValues.result?.value);

  await capture('party-address-clean-reopen.png');

  const res = cleanValues.result?.value;
  if (res && res.line1 === '' && res.zip === '' && res.city === '') {
    console.log('VERIFICATION CONFIRMED: All fields reset to empty on reopen!');
  } else {
    throw new Error('Values persisted! ' + JSON.stringify(res));
  }

  chrome.kill();
  console.log('All screenshots and tests completed successfully!');
  process.exit(0);
}

run().catch((err) => {
  console.error('Error running screenshots:', err);
  process.exit(1);
});

