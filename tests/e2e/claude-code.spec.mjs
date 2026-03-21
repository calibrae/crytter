// @ts-check
import { test, expect } from '@playwright/test';

const HERMYTT_HOST = 'localhost';
const HERMYTT_PORT = 7777;
const TOKEN = 'hermytt-test-token';

async function openTerminal(page) {
  await page.goto(`/www/index.html?host=${HERMYTT_HOST}&port=${HERMYTT_PORT}&token=${TOKEN}`);
  await page.waitForFunction(
    () => document.getElementById('term-info')?.textContent?.includes('connected'),
    null,
    { timeout: 10_000 },
  );
  await page.waitForTimeout(500);
}

test.describe('claude-code in crytter', () => {
  test.beforeEach(async ({ request }) => {
    try {
      const resp = await request.get(`http://${HERMYTT_HOST}:${HERMYTT_PORT}/info`, {
        headers: { 'X-Hermytt-Key': TOKEN },
      });
      if (resp.status() !== 200) test.skip();
    } catch {
      test.skip();
    }
  });

  test('claude --help renders', async ({ page }) => {
    test.setTimeout(30_000);
    await openTerminal(page);

    // Type claude --help
    await page.keyboard.type('claude --help');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(5000);

    // Check canvas has content
    const hasContent = await page.evaluate(() => {
      const canvas = document.querySelector('#terminal-container canvas');
      if (!canvas) return false;
      const ctx = canvas.getContext('2d');
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const pixels = imageData.data;
      let nonBg = 0;
      for (let i = 0; i < pixels.length; i += 4) {
        if (pixels[i] > 50 || pixels[i + 1] > 50 || pixels[i + 2] > 50) nonBg++;
      }
      return nonBg > 100; // plenty of rendered text
    });
    expect(hasContent).toBe(true);
  });

  test('claude interactive launch', async ({ page }) => {
    test.setTimeout(60_000);
    await openTerminal(page);

    // Launch claude
    await page.keyboard.type('claude');
    await page.keyboard.press('Enter');

    // Wait for it to start — look for content rendering over time
    await page.waitForTimeout(10_000);

    // Take a screenshot for debugging
    await page.screenshot({ path: 'test-results/claude-launch.png' });

    // Check terminal is still alive (didn't crash/hang)
    const info = await page.evaluate(() =>
      document.getElementById('term-info')?.textContent || ''
    );
    expect(info).toContain('×');
    expect(info).toContain('connected');

    // Check canvas has content
    const hasContent = await page.evaluate(() => {
      const canvas = document.querySelector('#terminal-container canvas');
      if (!canvas) return false;
      const ctx = canvas.getContext('2d');
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const pixels = imageData.data;
      let nonBg = 0;
      for (let i = 0; i < pixels.length; i += 4) {
        if (pixels[i] > 50 || pixels[i + 1] > 50 || pixels[i + 2] > 50) nonBg++;
      }
      return nonBg > 100;
    });
    expect(hasContent).toBe(true);

    // Try to quit — Ctrl+C then exit
    await page.keyboard.press('Control+c');
    await page.waitForTimeout(2000);
  });
});
