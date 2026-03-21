// @ts-check
import { test, expect } from '@playwright/test';

/**
 * TUI stress tests — run real programs through crytter via hermytt.
 *
 * These tests require hermytt running on localhost:7777.
 * They verify crytter doesn't crash, renders pixels, and handles
 * complex escape sequences from real TUI applications.
 */

const HERMYTT_HOST = 'localhost';
const HERMYTT_PORT = 7777;
const TOKEN = 'hermytt-test-token';

/**
 * Open the main crytter page (connects to hermytt automatically).
 */
async function openTerminal(page) {
  await page.goto(`/www/index.html?host=${HERMYTT_HOST}&port=${HERMYTT_PORT}&token=${TOKEN}`);
  // Wait for WASM + WebSocket
  await page.waitForFunction(
    () => document.getElementById('term-info')?.textContent?.includes('connected'),
    null,
    { timeout: 10_000 },
  );
  // Give shell time to render prompt
  await page.waitForTimeout(500);
}

/**
 * Type a command and press Enter.
 */
async function runCommand(page, cmd) {
  for (const ch of cmd) {
    await page.keyboard.press(ch === ' ' ? 'Space' : ch);
    await page.waitForTimeout(10);
  }
  await page.keyboard.press('Enter');
}

/**
 * Check the canvas has non-background pixels (something rendered).
 */
async function canvasHasContent(page) {
  return page.evaluate(() => {
    const canvas = document.querySelector('#terminal-container canvas');
    if (!canvas) return false;
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;
    for (let i = 0; i < pixels.length; i += 4) {
      if (pixels[i] > 50 || pixels[i + 1] > 50 || pixels[i + 2] > 50) {
        return true;
      }
    }
    return false;
  });
}

/**
 * Verify terminal is still alive and responsive.
 */
async function terminalAlive(page) {
  const dims = await page.evaluate(() => {
    const t = window.__term || null;
    // The main page doesn't expose __term, check via info bar
    const info = document.getElementById('term-info')?.textContent || '';
    return info;
  });
  return dims.includes('×');
}

// ============================================================
// Real TUI app tests
// ============================================================

test.describe('TUI stress tests (requires hermytt)', () => {
  test.beforeEach(async ({ request }) => {
    // Skip if hermytt isn't running
    try {
      const resp = await request.get(`http://${HERMYTT_HOST}:${HERMYTT_PORT}/info`, {
        headers: { 'X-Hermytt-Key': TOKEN },
      });
      if (resp.status() !== 200) test.skip();
    } catch {
      test.skip();
    }
  });

  test('shell prompt renders', async ({ page }) => {
    await openTerminal(page);
    const hasContent = await canvasHasContent(page);
    expect(hasContent).toBe(true);
  });

  test('ls with colors', async ({ page }) => {
    await openTerminal(page);
    await runCommand(page, 'ls -la --color=always /');
    await page.waitForTimeout(500);
    const alive = await terminalAlive(page);
    expect(alive).toBe(true);
    const hasContent = await canvasHasContent(page);
    expect(hasContent).toBe(true);
  });

  test('vttest screen 1 — character sets', async ({ page }) => {
    test.setTimeout(15_000);
    await openTerminal(page);

    // Run vttest menu option 1 (character sets), auto-answer with Enter
    await runCommand(page, 'vttest');
    await page.waitForTimeout(1000);

    // Select option 1
    await page.keyboard.press('1');
    await page.waitForTimeout(2000);

    // Press Enter through the sub-tests
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Enter');
      await page.waitForTimeout(500);
    }

    const alive = await terminalAlive(page);
    expect(alive).toBe(true);

    // Exit vttest
    await page.keyboard.press('0');
    await page.waitForTimeout(500);
  });

  test('vttest screen 2 — cursor movements', async ({ page }) => {
    test.setTimeout(15_000);
    await openTerminal(page);

    await runCommand(page, 'vttest');
    await page.waitForTimeout(1000);

    // Select option 2 (cursor movements)
    await page.keyboard.press('2');
    await page.waitForTimeout(2000);

    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Enter');
      await page.waitForTimeout(500);
    }

    const alive = await terminalAlive(page);
    expect(alive).toBe(true);

    await page.keyboard.press('0');
    await page.waitForTimeout(500);
  });

  test('vim open and close', async ({ page }) => {
    test.setTimeout(10_000);
    await openTerminal(page);

    await runCommand(page, 'vim');
    await page.waitForTimeout(1500);

    // Should be in vim (alt screen, tildes)
    const hasContent = await canvasHasContent(page);
    expect(hasContent).toBe(true);

    // Quit vim
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
    await page.keyboard.type(':q!');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);

    const alive = await terminalAlive(page);
    expect(alive).toBe(true);
  });

  test('htop open and close', async ({ page }) => {
    test.setTimeout(10_000);
    await openTerminal(page);

    await runCommand(page, 'htop');
    await page.waitForTimeout(2000);

    const hasContent = await canvasHasContent(page);
    expect(hasContent).toBe(true);

    // Quit htop with 'q'
    await page.keyboard.press('q');
    await page.waitForTimeout(500);

    const alive = await terminalAlive(page);
    expect(alive).toBe(true);
  });

  test('rapid output stress — cat large file', async ({ page }) => {
    test.setTimeout(15_000);
    await openTerminal(page);

    // Generate and cat a large file
    await runCommand(page, 'seq 1 5000');
    await page.waitForTimeout(3000);

    const alive = await terminalAlive(page);
    expect(alive).toBe(true);
  });

  test('256-color test', async ({ page }) => {
    await openTerminal(page);

    // Print 256 color blocks
    await runCommand(page,
      'for i in $(seq 0 255); do printf "\\033[48;5;${i}m  "; done; printf "\\033[0m\\n"'
    );
    await page.waitForTimeout(1000);

    const hasContent = await canvasHasContent(page);
    expect(hasContent).toBe(true);
    const alive = await terminalAlive(page);
    expect(alive).toBe(true);
  });

  test('scroll region torture — top/less', async ({ page }) => {
    test.setTimeout(10_000);
    await openTerminal(page);

    // Use less with a long file
    await runCommand(page, 'seq 1 1000 | less');
    await page.waitForTimeout(1000);

    // Page down a few times
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Space');
      await page.waitForTimeout(300);
    }

    const alive = await terminalAlive(page);
    expect(alive).toBe(true);

    // Quit
    await page.keyboard.press('q');
    await page.waitForTimeout(500);
  });

  test('cursor shape changes', async ({ page }) => {
    await openTerminal(page);

    // Bar cursor
    await runCommand(page, 'printf "\\033[5 q"');
    await page.waitForTimeout(300);

    // Block cursor
    await runCommand(page, 'printf "\\033[1 q"');
    await page.waitForTimeout(300);

    const alive = await terminalAlive(page);
    expect(alive).toBe(true);
  });

  test('alternate screen — tmux-like toggle', async ({ page }) => {
    await openTerminal(page);

    // Switch to alt screen, write, switch back
    await runCommand(page,
      'printf "\\033[?1049h\\033[2J\\033[HOn alt screen\\033[?1049l"'
    );
    await page.waitForTimeout(500);

    const alive = await terminalAlive(page);
    expect(alive).toBe(true);
  });

  test('unicode and wide characters', async ({ page }) => {
    await openTerminal(page);

    // Use keyboard.type for unicode (press doesn't handle CJK)
    await page.keyboard.type('echo "Hello café"');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);

    const alive = await terminalAlive(page);
    expect(alive).toBe(true);
  });

  test('man page renders', async ({ page }) => {
    test.setTimeout(10_000);
    await openTerminal(page);

    await runCommand(page, 'man ls');
    await page.waitForTimeout(2000);

    const hasContent = await canvasHasContent(page);
    expect(hasContent).toBe(true);

    // Quit
    await page.keyboard.press('q');
    await page.waitForTimeout(500);

    const alive = await terminalAlive(page);
    expect(alive).toBe(true);
  });
});
