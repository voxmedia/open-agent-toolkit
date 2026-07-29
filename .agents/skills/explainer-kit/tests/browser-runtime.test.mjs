import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import {
  createBrowserProbeSession,
  probeRenderedPage,
} from '../scripts/lib/browser-runtime.mjs';
import { decodeBrowserPng } from '../scripts/lib/png.mjs';

const animatedFixture = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <style>
      @keyframes pulse { from { opacity: 0.2; } to { opacity: 1; } }
      #animated {
        animation: pulse 2s infinite;
        transition: opacity 180ms ease;
      }
    </style>
  </head>
  <body><main><h1>Probe controls</h1><div id="animated">Moving</div></main></body>
</html>`;

test('probe applies injected CSS and neutralizes non-gated motion', async (t) => {
  const session = await createBrowserProbeSession();
  if (!session.available) {
    t.skip(`headless runtime unavailable: ${session.reason}`);
    return;
  }

  const root = await mkdtemp(join(tmpdir(), 'explainer-browser-real-png-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const screenshotPath = join(root, 'probe.png');
  try {
    const result = await session.probe({
      artifact: {
        id: 'animation-controls',
        type: 'explainer',
        html: animatedFixture,
      },
      scenario: 'default',
      viewport: { width: 768, height: 900 },
      reducedMotion: 'reduce',
      disableAnimations: true,
      injectedCss: ':root { --probe-injected: present; }',
      screenshotPath,
      evaluate: () => {
        const animated = getComputedStyle(document.querySelector('#animated'));
        return {
          pageOverflowX: false,
          clippedX: [],
          viewportClipped: [],
          unreadableHeadings: [],
          animationsDisabled:
            animated.animationName === 'none' &&
            animated.transitionDuration === '0s',
          reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
          injectedMarker: getComputedStyle(document.documentElement)
            .getPropertyValue('--probe-injected')
            .trim(),
        };
      },
      keyboard: { tab: true },
    });

    assert.equal(result.injectedMarker, 'present');
    assert.equal(result.animationsDisabled, true);
    const decoded = decodeBrowserPng(await readFile(screenshotPath));
    assert.deepEqual(
      { width: decoded.width, height: decoded.height },
      { width: 768, height: 900 },
    );
  } finally {
    await session.close();
  }
});

test('probe rejects unrecognized request fields', async () => {
  await assert.rejects(
    probeRenderedPage(
      {
        newPage() {
          throw new Error('must reject before opening a page');
        },
      },
      'https://example.invalid/probe',
      {
        artifact: { id: 'unknown-field', type: 'explainer', html: '' },
        scenario: 'default',
        viewport: { width: 768, height: 900 },
        evaluate: () => ({}),
        keyboard: { tab: true },
        unsupportedControl: true,
      },
    ),
    /unsupported.*unsupportedControl/i,
  );
});

test('session identity comes from the launched browser instance', async () => {
  let browserTypeReads = 0;
  const browser = {
    browserType() {
      browserTypeReads += 1;
      return { name: () => 'chromium' };
    },
    version() {
      return '123.0.6312.0';
    },
    async close() {},
  };
  const session = await createBrowserProbeSession({
    loadDriver: async () => ({
      chromium: {
        executablePath: () => '/opt/test-chromium',
        launch: async () => browser,
      },
    }),
    fileExists: (path) => path === '/opt/test-chromium',
    env: {},
  });

  try {
    assert.equal(session.available, true);
    assert.deepEqual(session.runtime, {
      kind: 'launched',
      name: 'chromium',
      version: '123.0.6312.0',
    });
    assert.match(session.captureIdentity, /^sha256:[a-f0-9]{64}$/);
    assert.equal(browserTypeReads, 1);
  } finally {
    await session.close();
  }
});

test('plain objects cannot forge a trusted browser session brand', async () => {
  const { assertBrowserProbeSession } =
    await import('../scripts/lib/browser-runtime.mjs');
  assert.equal(typeof assertBrowserProbeSession, 'function');
  assert.throws(
    () =>
      assertBrowserProbeSession({
        available: true,
        runtime: {
          kind: 'launched',
          name: 'chromium',
          version: 'forged',
        },
        captureIdentity: `sha256:${'0'.repeat(64)}`,
        probe: async () => ({}),
        close: async () => {},
      }),
    /trusted browser session brand/i,
  );
});

test('probe writes deterministic viewport screenshot evidence', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'explainer-browser-evidence-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const screenshotPath = join(root, 'qa/browser/hub/mobile.png');
  const screenshots = [];
  const page = {
    async route() {},
    async goto() {},
    async evaluate(evaluate) {
      if (typeof evaluate === 'function') {
        return true;
      }
      return {
        pageOverflowX: false,
        clippedX: [],
        reducedMotion: true,
        keyboard: { tab: true },
      };
    },
    async bringToFront() {},
    mouse: { async click() {} },
    keyboard: { async press() {} },
    async screenshot(options) {
      screenshots.push(options);
    },
    async close() {},
  };

  await probeRenderedPage(
    {
      async newPage() {
        return page;
      },
    },
    'https://example.invalid/probe',
    {
      artifact: { id: 'hub', type: 'hub', html: animatedFixture },
      scenario: 'default',
      viewport: { width: 320, height: 640 },
      reducedMotion: 'reduce',
      evaluate: 'metrics',
      keyboard: { tab: true },
      screenshotPath,
    },
  );

  assert.deepEqual(screenshots, [{ path: screenshotPath, fullPage: false }]);
});
