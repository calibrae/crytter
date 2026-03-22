// @ts-check
import { test, expect } from '@playwright/test';
import { mkdirSync } from 'fs';

const HERMYTT_HOST = 'localhost';
const HERMYTT_PORT = 7777;
const TOKEN = 'hermytt-test-token';

test.describe('claude recording', () => {
  test.beforeEach(async ({ request }) => {
    try {
      const resp = await request.get(`http://${HERMYTT_HOST}:${HERMYTT_PORT}/info`, {
        headers: { 'X-Hermytt-Key': TOKEN },
      });
      if (resp.status() !== 200) test.skip();
    } catch { test.skip(); }
  });

  test('full claude session with screenshots every 250ms', async ({ page }) => {
    test.setTimeout(120_000);

    const dir = 'test-results/claude-recording';
    mkdirSync(dir, { recursive: true });

    let frame = 0;
    let recording = true;

    // Screenshot loop — 250ms interval
    const screenshotLoop = async () => {
      while (recording) {
        const name = `${dir}/frame-${String(frame).padStart(4, '0')}.png`;
        await page.screenshot({ path: name }).catch(() => {});
        frame++;
        await page.waitForTimeout(250);
      }
    };

    // Start recording in background
    const recorder = screenshotLoop();

    // Open terminal
    await page.goto(
      `/www/index.html?host=${HERMYTT_HOST}&port=${HERMYTT_PORT}&token=${TOKEN}`
    );
    await page.waitForFunction(
      () => document.getElementById('term-info')?.textContent?.includes('connected'),
      null,
      { timeout: 15_000 },
    );
    await page.waitForTimeout(1000);

    // Launch claude
    await page.keyboard.type('claude');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(6000);

    // Press 1 to trust folder
    await page.keyboard.press('1');
    await page.waitForTimeout(1000);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(8000);

    // Type "Hello" and wait for answer
    await page.keyboard.type('Hello');
    await page.waitForTimeout(500);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(20000);

    // Type "How are you?" and wait for answer
    await page.keyboard.type('How are you?');
    await page.waitForTimeout(500);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(20000);

    // Stop recording
    recording = false;
    await recorder;

    // Verify terminal survived
    const info = await page.evaluate(() =>
      document.getElementById('term-info')?.textContent || ''
    );
    expect(info).toContain('connected');

    console.log(`Captured ${frame} frames in ${dir}/`);

    // Ctrl+C to exit
    await page.keyboard.press('Control+c');
    await page.waitForTimeout(2000);
  });
});
