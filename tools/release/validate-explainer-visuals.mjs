#!/usr/bin/env node

import { randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, rename, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { chromium } from '@playwright/test';

import {
  runReleaseVisualMatrix,
  selectReleaseVisualMatrix,
} from '../../.agents/skills/explainer-kit/scripts/render-qa.mjs';

export async function runExplainerVisualValidation({
  matrix = selectReleaseVisualMatrix(),
  launchBrowser = launchInstalledChromium,
} = {}) {
  const browser = await launchBrowser();
  const pages = new Map();
  const server = createServer((request, response) => {
    const html = pages.get(request.url);
    if (html === undefined) {
      response.writeHead(404).end('not found');
      return;
    }
    response.writeHead(200, {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
    });
    response.end(html);
  });
  const address = await listen(server);
  const measurements = [];

  try {
    const report = await runReleaseVisualMatrix({
      matrix,
      browserProbe: async (request) => {
        const route = `/${randomBytes(12).toString('hex')}.html`;
        pages.set(route, request.artifact.html);
        try {
          const result = await probePage(
            browser,
            `http://127.0.0.1:${address.port}${route}`,
            request,
          );
          measurements.push({
            artifactId: request.artifact.id,
            artifactType: request.artifact.type,
            scenario: request.scenario,
            viewport: request.viewport,
            result,
          });
          return result;
        } finally {
          pages.delete(route);
        }
      },
    });
    return {
      schemaVersion: 'explainer-kit.visual-validation/v1',
      valid: report.valid,
      browser: {
        name: 'Chromium',
        version: browser.version(),
      },
      matrixCases: report.cases,
      measurements,
      issues: report.issues,
    };
  } finally {
    await Promise.allSettled([browser.close(), closeServer(server)]);
  }
}

export async function runExplainerVisualValidationCli(
  argv = process.argv.slice(2),
  options = {},
) {
  let output;
  try {
    output = parseArguments(argv).output;
    const result = await runExplainerVisualValidation(options);
    await writeJsonAtomic(resolve(output), result);
    process.stdout.write(
      `${JSON.stringify({
        valid: result.valid,
        output: resolve(output),
        measurements: result.measurements.length,
      })}\n`,
    );
    return result.valid ? 0 : 1;
  } catch (error) {
    if (output) {
      await rm(resolve(output), { force: true }).catch(() => {});
    }
    process.stderr.write(
      `${JSON.stringify({
        code: 'E_VISUAL_BROWSER',
        message:
          error instanceof Error
            ? `Real browser release validation failed: ${error.message}`
            : 'Real browser release validation failed.',
        ...(output && { output: resolve(output) }),
      })}\n`,
    );
    return 1;
  }
}

async function launchInstalledChromium() {
  const configured = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
  const bundled = chromium.executablePath();
  const executablePath = [
    configured,
    bundled,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ].find((candidate) => candidate && existsSync(candidate));
  if (!executablePath) {
    throw new Error(
      'No installed Playwright Chromium/Chrome executable is available.',
    );
  }
  return chromium.launch({ headless: true, executablePath });
}

async function probePage(browser, url, request) {
  const page = await browser.newPage({
    viewport: request.viewport,
    reducedMotion: 'reduce',
    javaScriptEnabled: request.javascriptEnabled !== false,
  });
  try {
    if (request.media === 'print') {
      await page.emulateMedia({ media: 'print', reducedMotion: 'reduce' });
    }
    await page.goto(url, { waitUntil: 'load' });
    if (request.wideContent) {
      await page.evaluate(({ containerSelector, width }) => {
        const container = document.querySelector(containerSelector);
        if (!container) return;
        const probe = document.createElement('div');
        probe.dataset.releaseWideContent = 'true';
        probe.style.width = `${width}px`;
        if (matchMedia('print').matches) probe.style.maxWidth = '100%';
        probe.style.height = '1px';
        container.append(probe);
      }, request.wideContent);
    }

    const layout = await page.evaluate(request.evaluate);
    const keyboard = await probeKeyboard(page, request);
    const themeToggle = request.themeToggle
      ? await probeThemeToggle(page, request.themeToggle)
      : layout.themeToggle;
    return {
      ...layout,
      keyboard,
      ...(themeToggle && { themeToggle }),
    };
  } finally {
    await page.close();
  }
}

async function probeKeyboard(page, request) {
  await page.keyboard.press('Tab');
  const tab = await page.evaluate(() => {
    const focused =
      document.activeElement !== document.body &&
      document.activeElement !== document.documentElement;
    const visibleFocusable = [
      ...document.querySelectorAll(
        'a[href], button, input, select, textarea, [tabindex]',
      ),
    ].some((element) => {
      const style = getComputedStyle(element);
      return (
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        element.getClientRects().length > 0
      );
    });
    return focused || !visibleFocusable;
  });
  if (!request.keyboard.arrows) return { tab };

  const arrows = {};
  for (const key of request.keyboard.arrows) {
    const positive = key === 'ArrowRight' || key === 'ArrowDown';
    const resetKey = positive ? 'ArrowLeft' : 'ArrowRight';
    for (let index = 0; index < 10; index += 1) {
      await page.keyboard.press(resetKey);
    }
    await page.waitForTimeout(10);
    const before = await deckCounter(page);
    await page.keyboard.press(key);
    await page.waitForTimeout(10);
    const after = await deckCounter(page);
    arrows[key] = positive ? after > before : after < before;
  }
  return { tab, arrows };
}

async function deckCounter(page) {
  return page.evaluate(() => {
    const text = document.querySelector('#deck-counter')?.textContent ?? '';
    return Number.parseInt(text.split('/')[0], 10);
  });
}

async function probeThemeToggle(page, themeToggle) {
  const locator = page.locator(themeToggle.selector);
  const present = (await locator.count()) === 1;
  if (!present) return { present: false };
  const initialMode = await page.evaluate(
    () => document.documentElement.dataset.themeMode,
  );
  await locator.focus();
  await page.keyboard.press('Enter');
  const toggledMode = await page.evaluate(
    () => document.documentElement.dataset.themeMode,
  );
  await page.reload({ waitUntil: 'load' });
  const persistedMode = await page.evaluate(
    () => document.documentElement.dataset.themeMode,
  );
  return {
    present: true,
    initialMode,
    toggledMode,
    keyboardOperable: toggledMode !== initialMode,
    persisted: persistedMode === toggledMode,
  };
}

function listen(server) {
  return new Promise((resolveListen, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      server.off('error', reject);
      resolveListen(server.address());
    });
  });
}

function closeServer(server) {
  return new Promise((resolveClose) => server.close(resolveClose));
}

function parseArguments(argv) {
  if (
    argv.length !== 2 ||
    argv[0] !== '--output' ||
    !argv[1] ||
    argv[1].startsWith('--')
  ) {
    throw new Error(
      'Usage: validate-explainer-visuals.mjs --output <results.json>',
    );
  }
  return { output: argv[1] };
}

async function writeJsonAtomic(path, value) {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.tmp-${process.pid}-${randomBytes(6).toString('hex')}`;
  try {
    await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, {
      flag: 'wx',
    });
    await rename(temporary, path);
  } catch (error) {
    await rm(temporary, { force: true });
    throw error;
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  process.exitCode = await runExplainerVisualValidationCli();
}
