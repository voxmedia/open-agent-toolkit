import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, test } from 'node:test';

import { chromium } from '@playwright/test';

import { BROWSER_PROBE_EVALUATE } from '../../.agents/skills/explainer-kit/scripts/lib/qa.mjs';
import { selectReleaseVisualMatrix } from '../../.agents/skills/explainer-kit/scripts/render-qa.mjs';
import {
  probeArrowKey,
  pressTabFromDocument,
  primeKeyboardFocus,
  runExplainerVisualValidation,
  runExplainerVisualValidationCli,
} from './validate-explainer-visuals.mjs';

const tempRoots = [];

afterEach(async () => {
  await Promise.all(
    tempRoots
      .splice(0)
      .map((root) => rm(root, { recursive: true, force: true })),
  );
});

test('drives a real installed Chromium browser for every declared deck scenario', async () => {
  const matrix = [
    selectReleaseVisualMatrix().find(
      ({ artifact, renderStrategy }) =>
        artifact.type === 'deck' && renderStrategy === 'default-only',
    ),
  ].map((entry) => ({ ...entry, viewports: [320] }));

  const result = await runExplainerVisualValidation({ matrix });

  assert.equal(result.schemaVersion, 'explainer-kit.visual-validation/v1');
  assert.equal(result.valid, true, JSON.stringify(result.issues));
  assert.match(result.browser.name, /chrom|chrome/i);
  assert.deepEqual(
    new Set(result.measurements.map(({ scenario }) => scenario)),
    new Set(['default', 'no-js', 'print']),
  );
  assert.equal(result.measurements.length, 3);
  assert.ok(
    result.measurements.every(
      ({ viewport, result: measurement }) =>
        viewport.width === 320 &&
        typeof measurement.pageOverflowX === 'boolean' &&
        Array.isArray(measurement.clippedX),
    ),
  );
});

test('primes document focus without changing the body tab order', async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent('<button id="start">Start</button>');
    await page.locator('#start').focus();

    await primeKeyboardFocus(page);

    assert.deepEqual(
      await page.evaluate(() => ({
        activeTag: document.activeElement?.tagName,
        bodyTabIndex: document.body.getAttribute('tabindex'),
      })),
      { activeTag: 'BODY', bodyTabIndex: null },
    );
  } finally {
    await browser.close();
  }
});

test('accepts visible tabbable semantics when key transport stalls', async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent('<button id="start">Start</button>');
    await page.evaluate(() => {
      HTMLButtonElement.prototype.focus = () => {};
    });
    let presses = 0;

    const tab = await pressTabFromDocument(page, {
      pressTab: async () => {
        presses += 1;
      },
    });

    assert.equal(tab, true);
    assert.equal(presses, 2);
  } finally {
    await browser.close();
  }
});

test('rejects visible controls removed from the document tab order', async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent('<button tabindex="-1">Not tabbable</button>');

    const tab = await pressTabFromDocument(page, { pressTab: async () => {} });

    assert.equal(tab, false);
  } finally {
    await browser.close();
  }
});

test('retries a dropped deck arrow event', async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent('<span id="deck-counter">1 / 2</span>');
    await page.evaluate(() => {
      window.rightPresses = 0;
      addEventListener('keydown', (event) => {
        if (event.key === 'ArrowLeft') {
          document.querySelector('#deck-counter').textContent = '1 / 2';
        }
        if (event.key === 'ArrowRight') {
          window.rightPresses += 1;
          if (window.rightPresses > 1) {
            document.querySelector('#deck-counter').textContent = '2 / 2';
          }
        }
      });
    });

    assert.equal(await probeArrowKey(page, 'ArrowRight'), true);
    assert.equal(await page.evaluate(() => window.rightPresses), 2);
  } finally {
    await browser.close();
  }
});

test('fails closed and emits no successful report when Chromium is unavailable', async () => {
  await assert.rejects(
    runExplainerVisualValidation({
      matrix: [selectReleaseVisualMatrix()[0]],
      launchBrowser: async () => {
        throw new Error('browser executable missing');
      },
    }),
    /browser executable missing/i,
  );
});

test('CLI removes a stale successful report when Chromium is unavailable', async () => {
  const root = await mkdtemp(join(tmpdir(), 'explainer-visual-failure-'));
  tempRoots.push(root);
  const output = join(root, 'visual-results.json');
  await writeFile(output, '{"valid":true}\n');

  const exitCode = await runExplainerVisualValidationCli(['--output', output], {
    launchBrowser: async () => {
      throw new Error('browser executable missing');
    },
  });

  assert.equal(exitCode, 1);
  await assert.rejects(readFile(output), { code: 'ENOENT' });
});

test('CLI retains machine-readable browser measurements', async () => {
  const root = await mkdtemp(join(tmpdir(), 'explainer-visual-cli-'));
  tempRoots.push(root);
  const output = join(root, 'visual-results.json');
  const matrix = [
    {
      ...selectReleaseVisualMatrix()[0],
      viewports: [320],
    },
  ];

  const exitCode = await runExplainerVisualValidationCli(['--output', output], {
    matrix,
  });

  assert.equal(exitCode, 0);
  const retained = JSON.parse(await readFile(output, 'utf8'));
  assert.equal(retained.valid, true);
  assert.equal(retained.measurements.length, 1);
});

// The deck shell is a horizontal scroll-snap carousel, so its off-screen
// slides are reachable by design. Exempting them must not blind the probe to
// content that is genuinely unreachable.
test('viewport clipping distinguishes paged slides from unreachable content', async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 320, height: 600 } });
  const clipped = async (body) => {
    await page.setContent(`<body style="margin:0">${body}</body>`);
    const { viewportClipped } = await page.evaluate(BROWSER_PROBE_EVALUATE);
    return viewportClipped.map(({ selector }) => selector);
  };

  try {
    assert.deepEqual(
      await clipped(
        '<div style="display:flex;overflow-x:auto;width:320px">' +
          '<section id="first" style="min-width:320px">a</section>' +
          '<section id="second" style="min-width:320px">b</section></div>',
      ),
      [],
      'paged slides in a horizontal scroll container are reachable',
    );
    assert.deepEqual(
      await clipped(
        '<div style="width:320px;overflow:hidden">' +
          '<p id="wide" style="width:900px">x</p></div>',
      ),
      ['#wide'],
      'content clipped by an overflow-hidden ancestor is unreachable',
    );
    assert.deepEqual(
      await clipped('<p id="bleed" style="position:absolute;left:400px">y</p>'),
      ['#bleed'],
      'content positioned past the viewport is unreachable',
    );
  } finally {
    await browser.close();
  }
});
