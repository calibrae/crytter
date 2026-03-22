// @ts-check
import { test, expect } from '@playwright/test';

const HERMYTT_HOST = 'localhost';
const HERMYTT_PORT = 7777;
const TOKEN = 'hermytt-test-token';

test('dump claude grid state', async ({ page, request }) => {
  test.setTimeout(90_000);

  try {
    const resp = await request.get(`http://${HERMYTT_HOST}:${HERMYTT_PORT}/info`, {
      headers: { 'X-Hermytt-Key': TOKEN },
    });
    if (resp.status() !== 200) test.skip();
  } catch { test.skip(); }

  // Load test.html for the bare terminal
  await page.goto('/www/test.html');
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 10_000 });

  // Connect WS to default session, log all raw messages
  await page.evaluate(({ host, port, token }) => {
    window.__rawMsgs = [];
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(`ws://${host}:${port}/ws`);
      window.__ws = ws;
      ws.onopen = () => ws.send(token);
      ws.onmessage = (e) => {
        if (e.data === 'auth:ok') {
          ws.send(JSON.stringify({ resize: [window.__term.cols, window.__term.rows] }));
          resolve();
          return;
        }
        window.__rawMsgs.push(e.data);
        const response = window.__term.write(e.data);
        if (response && ws.readyState === 1) ws.send(response);
      };
      ws.onerror = () => reject(new Error('WS error'));
      setTimeout(() => reject(new Error('WS timeout')), 10000);
    });
  }, { host: HERMYTT_HOST, port: HERMYTT_PORT, token: TOKEN });

  await page.waitForTimeout(1000);

  // Launch claude
  await page.evaluate(() => { for (const c of 'claude\r') window.__ws.send(c); });
  await page.waitForTimeout(6000);

  // Trust folder
  await page.evaluate(() => window.__ws.send('1'));
  await page.waitForTimeout(500);
  await page.evaluate(() => window.__ws.send('\r'));
  await page.waitForTimeout(8000);

  // Type "Hello"
  await page.evaluate(() => { for (const c of 'Hello\r') window.__ws.send(c); });
  await page.waitForTimeout(15000);

  // Force render
  await page.evaluate(() => window.__term.render());
  await page.waitForTimeout(100);

  // Dump grid
  const grid = await page.evaluate(() => window.__term.dumpGrid());
  const lines = grid.split('\n');

  console.log('\n=== GRID STATE (first 25 lines) ===');
  for (let i = 0; i < Math.min(25, lines.length); i++) {
    console.log(`${String(i).padStart(2)}: |${lines[i]}|`);
  }

  // Find "66" in grid
  console.log('\n=== Lines containing "66" ===');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('66')) {
      console.log(`Line ${i}: |${lines[i]}|`);
      const idx = lines[i].indexOf('66');
      const context = lines[i].substring(Math.max(0, idx - 5), idx + 10);
      const hex = Array.from(context).map(c =>
        `${c}(${c.charCodeAt(0).toString(16)})`
      ).join(' ');
      console.log(`  Hex context: ${hex}`);
    }
  }

  // Find spinner remnants
  console.log('\n=== Spinner remnants ===');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].match(/arinat|hunder|erebr|ransmut|neading/i)) {
      console.log(`Line ${i}: |${lines[i]}|`);
    }
  }

  // Dump raw messages around "Ideating" to see the erase sequence
  const ideatingAnalysis = await page.evaluate(() => {
    const hexify = (s) => Array.from(s).map(c => {
      const code = c.charCodeAt(0);
      if (code === 0x1b) return '\\e';
      if (code < 32) return `\\x${code.toString(16).padStart(2, '0')}`;
      return c;
    }).join('');

    // Find index of message containing "deat" (Ideating)
    const idx = window.__rawMsgs.findIndex(m => m.includes('deat'));
    if (idx === -1) return { found: false };

    // Get messages around it
    const start = Math.max(0, idx - 2);
    const end = Math.min(window.__rawMsgs.length, idx + 10);
    const context = [];
    for (let i = start; i < end; i++) {
      context.push({
        i,
        hex: hexify(window.__rawMsgs[i]).substring(0, 500),
        hasErase: window.__rawMsgs[i].includes('\x1b[2K'),
        hasCursorUp: window.__rawMsgs[i].includes('\x1b[1A'),
      });
    }
    return { found: true, ideatingIdx: idx, context };
  });

  console.log('\n=== Raw messages around "Ideating" ===');
  if (ideatingAnalysis.found) {
    console.log(`Ideating at message index: ${ideatingAnalysis.ideatingIdx}`);
    for (const entry of ideatingAnalysis.context) {
      const markers = [];
      if (entry.hasErase) markers.push('ERASE');
      if (entry.hasCursorUp) markers.push('CUR_UP');
      console.log(`[${entry.i}] ${markers.join('+')} | ${entry.hex}`);
    }
  } else {
    console.log('No "Ideating" found in raw messages');
  }

  await page.screenshot({ path: 'test-results/debug-deep.png' });
});
