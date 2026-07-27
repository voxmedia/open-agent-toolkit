import { randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import { createServer } from 'node:http';

// Locations a headless Chromium may already exist at on a developer or CI
// machine. The core never installs a browser; it only uses one that is there.
const CHROMIUM_CANDIDATES = Object.freeze([
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
]);
const PROBE_REQUEST_FIELDS = new Set([
  'artifact',
  'disableAnimations',
  'evaluate',
  'injectedCss',
  'javascriptEnabled',
  'keyboard',
  'media',
  'reducedMotion',
  'scenario',
  'themeToggle',
  'viewport',
  'wideContent',
]);
const DISABLE_ANIMATIONS_CSS = `*, *::before, *::after {
  animation: none !important;
  animation-duration: 0s !important;
  transition: none !important;
  transition-duration: 0s !important;
  scroll-behavior: auto !important;
}`;

export const RUNTIME_UNAVAILABLE_REASONS = Object.freeze({
  driverMissing: 'browser-driver-not-installed',
  executableMissing: 'no-installed-chromium-executable',
  disabled: 'disabled-by-configuration',
});

export const HEADLESS_PROBE_ENV = 'EXPLAINER_KIT_HEADLESS_PROBE';

/**
 * Operators may switch probe resolution off for hermetic unit runs. The opt-out
 * is reported separately from a capability failure so it never reads as
 * "no runtime exists here".
 */
export function headlessProbeDisabled(env = process.env) {
  return ['off', 'false', '0'].includes(
    String(env[HEADLESS_PROBE_ENV] ?? '').toLowerCase(),
  );
}

/**
 * Detect whether this machine can actually drive a headless browser. The
 * driver import is dynamic so the bundled core stays installable without it.
 */
export async function resolveHeadlessRuntime({
  loadDriver = () => import('@playwright/test'),
  fileExists = existsSync,
  env = process.env,
} = {}) {
  if (headlessProbeDisabled(env)) {
    return { available: false, reason: RUNTIME_UNAVAILABLE_REASONS.disabled };
  }

  let chromium;
  try {
    ({ chromium } = await loadDriver());
  } catch {
    return {
      available: false,
      reason: RUNTIME_UNAVAILABLE_REASONS.driverMissing,
    };
  }
  if (
    typeof chromium?.launch !== 'function' ||
    typeof chromium?.executablePath !== 'function'
  ) {
    return {
      available: false,
      reason: RUNTIME_UNAVAILABLE_REASONS.driverMissing,
    };
  }

  let bundled;
  try {
    bundled = chromium.executablePath();
  } catch {
    bundled = undefined;
  }
  const executablePath = [
    env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    bundled,
    ...CHROMIUM_CANDIDATES,
  ].find((candidate) => candidate && fileExists(candidate));
  if (!executablePath) {
    return {
      available: false,
      reason: RUNTIME_UNAVAILABLE_REASONS.executableMissing,
    };
  }

  return {
    available: true,
    name: 'chromium',
    executablePath,
    launch: () => chromium.launch({ headless: true, executablePath }),
  };
}

export async function launchInstalledChromium(options = {}) {
  const runtime = await resolveHeadlessRuntime(options);
  if (!runtime.available) {
    throw new Error(
      `No headless browser runtime is available (${runtime.reason}).`,
    );
  }
  return runtime.launch();
}

/**
 * Materialize a browser probe callback backed by a real headless browser.
 * Returns an unavailable descriptor instead of throwing when no runtime
 * exists, so callers can record an accurate capability skip.
 */
export async function createBrowserProbeSession(options = {}) {
  const runtime = await resolveHeadlessRuntime(options);
  if (!runtime.available) {
    return { available: false, reason: runtime.reason };
  }

  const browser = await runtime.launch();
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

  let address;
  try {
    address = await listen(server);
  } catch (cause) {
    await Promise.allSettled([browser.close(), closeServer(server)]);
    throw cause;
  }

  return {
    available: true,
    runtime: { name: runtime.name, version: browser.version() },
    probe: async (probeRequest) => {
      const route = `/${randomBytes(12).toString('hex')}.html`;
      pages.set(route, probeRequest.artifact.html);
      try {
        return await probeRenderedPage(
          browser,
          `http://127.0.0.1:${address.port}${route}`,
          probeRequest,
        );
      } finally {
        pages.delete(route);
      }
    },
    close: async () => {
      await Promise.allSettled([browser.close(), closeServer(server)]);
    },
  };
}

export async function probeRenderedPage(browser, url, request) {
  assertProbeRequestFields(request);
  const page = await browser.newPage({
    viewport: request.viewport,
    reducedMotion: request.reducedMotion ?? 'reduce',
    javaScriptEnabled: request.javascriptEnabled !== false,
  });
  try {
    if (request.media === 'print') {
      await page.emulateMedia({
        media: 'print',
        reducedMotion: request.reducedMotion ?? 'reduce',
      });
    }
    const stylesheet = probeStylesheet(request);
    if (stylesheet) {
      await page.route(url, async (route) => {
        const response = await route.fetch();
        const html = await response.text();
        await route.fulfill({
          response,
          body: injectStylesheet(html, stylesheet),
        });
      });
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

function assertProbeRequestFields(request) {
  if (!request || typeof request !== 'object' || Array.isArray(request)) {
    throw new TypeError('Browser probe request must be an object.');
  }
  const unsupported = Object.keys(request).filter(
    (field) => !PROBE_REQUEST_FIELDS.has(field),
  );
  if (unsupported.length > 0) {
    throw new TypeError(
      `Browser probe request has unsupported fields: ${unsupported.join(', ')}.`,
    );
  }
  if (
    request.disableAnimations !== undefined &&
    typeof request.disableAnimations !== 'boolean'
  ) {
    throw new TypeError('Browser probe disableAnimations must be a boolean.');
  }
  if (
    request.injectedCss !== undefined &&
    typeof request.injectedCss !== 'string'
  ) {
    throw new TypeError('Browser probe injectedCss must be a string.');
  }
}

function probeStylesheet(request) {
  return [
    request.injectedCss?.trim(),
    request.disableAnimations ? DISABLE_ANIMATIONS_CSS : undefined,
  ]
    .filter(Boolean)
    .join('\n');
}

function injectStylesheet(html, stylesheet) {
  const style = `<style data-explainer-probe-controls>${stylesheet}</style>`;
  return /<\/head\s*>/i.test(html)
    ? html.replace(/<\/head\s*>/i, `${style}</head>`)
    : `${style}${html}`;
}

export async function primeKeyboardFocus(page) {
  await page.bringToFront();
  await page.mouse.click(1, 1);
  await page.evaluate(() => {
    window.focus();
    const body = document.body;
    const originalTabIndex = body.getAttribute('tabindex');
    try {
      body.setAttribute('tabindex', '-1');
      body.focus({ preventScroll: true });
    } finally {
      if (originalTabIndex === null) {
        body.removeAttribute('tabindex');
      } else {
        body.setAttribute('tabindex', originalTabIndex);
      }
    }
  });
}

export async function pressTabFromDocument(
  page,
  { pressTab = () => page.keyboard.press('Tab') } = {},
) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    await primeKeyboardFocus(page);
    await pressTab();
    const advanced = await page.evaluate(() => {
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
    if (advanced) return true;
    await page.waitForTimeout(25);
  }
  return page.evaluate(() => {
    const visibleControls = [
      ...document.querySelectorAll(
        'a[href], button, input, select, textarea, [tabindex]',
      ),
    ].filter((element) => {
      if (!(element instanceof HTMLElement) || element.matches(':disabled')) {
        return false;
      }
      const style = getComputedStyle(element);
      return style.display !== 'none' && style.visibility !== 'hidden';
    });
    return (
      visibleControls.length === 0 ||
      visibleControls.some((element) => element.tabIndex >= 0)
    );
  });
}

export async function probeArrowKey(page, key) {
  const positive = key === 'ArrowRight' || key === 'ArrowDown';
  const makeRoomKey = positive ? 'ArrowLeft' : 'ArrowRight';
  await page.bringToFront();
  let before = await deckPosition(page);
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const hasRoom = positive
      ? before.current < before.total
      : before.current > 1;
    if (hasRoom) break;
    await page.keyboard.press(makeRoomKey);
    before = await deckPosition(page);
    if (positive ? before.current < before.total : before.current > 1) {
      break;
    }
    await page.waitForTimeout(25);
    before = await deckPosition(page);
  }
  if (positive ? before.current >= before.total : before.current <= 1) {
    return false;
  }
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await page.keyboard.press(key);
    let after = await deckPosition(page);
    if (
      positive ? after.current > before.current : after.current < before.current
    ) {
      return true;
    }
    await page.waitForTimeout(25);
    after = await deckPosition(page);
    if (
      positive ? after.current > before.current : after.current < before.current
    ) {
      return true;
    }
  }
  return false;
}

async function probeKeyboard(page, request) {
  const tab = await pressTabFromDocument(page);
  if (!request.keyboard?.arrows) return { tab };

  const arrows = {};
  for (const key of request.keyboard.arrows) {
    arrows[key] = await probeArrowKey(page, key);
  }
  return { tab, arrows };
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

async function deckPosition(page) {
  return page.evaluate(() => {
    const text = document.querySelector('#deck-counter')?.textContent ?? '';
    const [current, total] = text
      .split('/')
      .map((value) => Number.parseInt(value, 10));
    return { current, total };
  });
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
