import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import {
  createBrowserProbeSession,
  probeRenderedPage,
} from '../scripts/lib/browser-runtime.mjs';

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
      evaluate: () => {
        const animated = getComputedStyle(
          document.querySelector('#animated'),
        );
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
    { async newPage() { return page; } },
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
