import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  RUNTIME_UNAVAILABLE_REASONS,
  resolveHeadlessRuntime,
} from '../scripts/lib/browser-runtime.mjs';
import { recordRun } from '../scripts/record.mjs';
import {
  extractRenderedClaims,
  runVerify,
  verifyRun,
} from '../scripts/verify.mjs';
import { png } from './fixtures/png.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const fixtures = join(here, 'fixtures', 'verify');
const packageFixture = join(
  here,
  '..',
  '..',
  '..',
  '..',
  'packages',
  'cli',
  'src',
  'commands',
  'project',
  'archive',
  'fixtures',
  'v2-package',
);

async function runRoot(page = 'valid.html') {
  const root = await mkdtemp(join(tmpdir(), 'explainer-verify-'));
  await cp(packageFixture, root, { recursive: true });
  await rm(join(root, 'manifest.json'));
  await writeFile(
    join(root, 'site/index.html'),
    await readFile(join(fixtures, page)),
  );
  return root;
}

function allPass(result) {
  return Object.values(result.checks).every(({ status }) => status === 'pass');
}

async function pageHash(root) {
  return `sha256:${createHash('sha256')
    .update(await readFile(join(root, 'site/index.html')))
    .digest('hex')}`;
}

async function screenshotFixture(
  entries = [
    [320, png(320, 640)],
    [768, png(768, 1024)],
    [1440, png(1440, 900)],
  ],
) {
  const root = await mkdtemp(join(tmpdir(), 'explainer-host-screenshots-'));
  await Promise.all(
    entries.map(async ([width, bytes]) => {
      await writeFile(join(root, `${width}.png`), bytes);
    }),
  );
  return root;
}

function browserRuntimeOptions(layout = {}) {
  const browser = {
    browserType() {
      return { name: () => 'chromium' };
    },
    version() {
      return 'fixture-chromium';
    },
    async newPage({ viewport }) {
      return {
        async route() {},
        async goto() {},
        async evaluate(evaluate) {
          if (typeof evaluate === 'function') return true;
          return {
            pageOverflowX: false,
            clippedX: [],
            viewportClipped: [],
            unreadableHeadings: [],
            animationsDisabled: true,
            reducedMotion: true,
            ...layout,
          };
        },
        async bringToFront() {},
        mouse: { async click() {} },
        keyboard: { async press() {} },
        async screenshot({ path }) {
          await writeFile(path, png(viewport.width, viewport.height));
        },
        async close() {},
      };
    },
    async close() {},
  };
  return {
    loadDriver: async () => ({
      chromium: {
        executablePath: () => '/fixture/chromium',
        launch: async () => browser,
      },
    }),
    fileExists: (path) => path === '/fixture/chromium',
    env: {},
  };
}

test('extractRenderedClaims keys terms and normalized facts by subject', async () => {
  const html = await readFile(join(fixtures, 'valid.html'), 'utf8');
  const claims = extractRenderedClaims(html);

  assert.equal(claims.terminology['Alpha migration'], 'Alpha migration');
  assert.equal(claims.numericClaims['Alpha migration'], '17');
  assert.equal(claims.numericClaims.W1, '2026-09-08');
  assert.equal(claims.statuses.W2, 'parked');
  assert.ok(
    claims.claims.some(
      ({ subject, value, kind }) =>
        subject === 'Alpha migration' &&
        value === '2026-09-09' &&
        kind === 'date',
    ),
  );
});

test('none rung writes passing browser-free checks without externalRequests', async () => {
  const root = await runRoot();
  const result = await runVerify(
    ['--run-root', root, '--recipe', 'project-recap', '--rung', 'none'],
    { log() {} },
  );

  assert.equal(allPass(result), true);
  assert.equal(result.rung, 'none');
  assert.deepEqual(result.visual, { verdict: 'none' });
  assert.ok(Object.values(RUNTIME_UNAVAILABLE_REASONS).includes(result.reason));
  assert.equal('externalRequests' in result.checks, false);
  assert.deepEqual(
    JSON.parse(await readFile(join(root, 'qa/result.json'), 'utf8')),
    result,
  );
});

test('host rung binds inspected screenshots to the authored artifact', async () => {
  for (const visualVerdict of ['pass', 'findings']) {
    const root = await runRoot();
    const screenshots = await screenshotFixture();
    const result = await verifyRun({
      runRoot: root,
      recipe: 'project-recap',
      rung: 'host',
      screenshots,
      artifactSha256: await pageHash(root),
      visualVerdict,
      visualNotes: `${visualVerdict} inspection at all three widths`,
    });

    assert.equal(allPass(result), true);
    assert.equal(result.rung, 'host');
    assert.deepEqual(result.screenshots, [
      'qa/320.png',
      'qa/768.png',
      'qa/1440.png',
    ]);
    assert.deepEqual(result.visual, {
      verdict: visualVerdict,
      ...(visualVerdict === 'findings' && {
        findings: [`${visualVerdict} inspection at all three widths`],
      }),
      notes: `${visualVerdict} inspection at all three widths`,
    });
    const manifest = await recordRun({
      runRoot: root,
      recipe: 'project-recap',
      slug: `host-${visualVerdict}`,
      mode: 'unattended',
      themePath: join(root, 'theme.resolved.json'),
    });
    assert.equal(
      manifest.outcome,
      visualVerdict === 'pass' ? 'built' : 'built-needs-review',
    );
  }
});

test('host rung rejects capture without an inspection verdict', async () => {
  const root = await runRoot();
  const screenshots = await screenshotFixture();
  await assert.rejects(
    verifyRun({
      runRoot: root,
      recipe: 'project-recap',
      rung: 'host',
      screenshots,
      artifactSha256: await pageHash(root),
    }),
    { code: 'verify-host-visual-verdict-required' },
  );
});

test('host rung downgrades mismatched hashes and invalid screenshots', async () => {
  const cases = [
    {
      name: 'artifact hash',
      artifactSha256: `sha256:${'0'.repeat(64)}`,
      expectedReason: 'host-artifact-hash-mismatch',
    },
    {
      name: 'wrong width',
      entries: [
        [320, png(319, 640)],
        [768, png(768, 1024)],
        [1440, png(1440, 900)],
      ],
      expectedReason: 'host-screenshot-invalid',
    },
    {
      name: 'non-PNG',
      entries: [
        [320, Buffer.from('not a png')],
        [768, png(768, 1024)],
        [1440, png(1440, 900)],
      ],
      expectedReason: 'host-screenshot-invalid',
    },
  ];

  for (const fixture of cases) {
    const root = await runRoot();
    const screenshots = await screenshotFixture(fixture.entries);
    const result = await verifyRun({
      runRoot: root,
      recipe: 'project-recap',
      rung: 'host',
      screenshots,
      artifactSha256: fixture.artifactSha256 ?? (await pageHash(root)),
      visualVerdict: 'pass',
      visualNotes: 'inspection input must not survive failed binding',
    });

    assert.equal(result.rung, 'none', fixture.name);
    assert.equal(result.reason, fixture.expectedReason, fixture.name);
    assert.equal(result.screenshots, undefined, fixture.name);
    assert.deepEqual(result.visual, { verdict: 'none' }, fixture.name);
  }
});

test('playwright rung captures three probes and consumes layout findings', async () => {
  for (const fixture of [
    { name: 'clean', layout: {}, expectedVerdict: 'pass' },
    {
      name: 'fixed-width table',
      layout: { pageOverflowX: true },
      expectedVerdict: 'findings',
    },
  ]) {
    const root = await runRoot();
    const result = await verifyRun({
      runRoot: root,
      recipe: 'project-recap',
      rung: 'playwright',
      headlessRuntimeOptions: browserRuntimeOptions(fixture.layout),
    });

    assert.equal(allPass(result), true, fixture.name);
    assert.equal(result.rung, 'playwright', fixture.name);
    assert.deepEqual(result.screenshots, [
      'qa/320.png',
      'qa/768.png',
      'qa/1440.png',
    ]);
    assert.equal(result.visual.verdict, fixture.expectedVerdict, fixture.name);
    if (fixture.expectedVerdict === 'findings') {
      assert.ok(
        result.visual.findings.some((finding) =>
          finding.includes('viewport-overflow'),
        ),
      );
    }
    const manifest = await recordRun({
      runRoot: root,
      recipe: 'project-recap',
      slug: `playwright-${fixture.name.replaceAll(' ', '-')}`,
      mode: 'unattended',
      themePath: join(root, 'theme.resolved.json'),
    });
    assert.equal(
      manifest.outcome,
      fixture.expectedVerdict === 'pass' ? 'built' : 'built-needs-review',
      fixture.name,
    );
  }
});

test('playwright rung records disabled and launch-failure reasons', async () => {
  const disabledRoot = await runRoot();
  const disabled = await verifyRun({
    runRoot: disabledRoot,
    recipe: 'project-recap',
    rung: 'playwright',
    headlessRuntimeOptions: {
      env: { EXPLAINER_KIT_HEADLESS_PROBE: 'off' },
      loadDriver: async () => {
        throw new Error('disabled resolution must not load the driver');
      },
    },
  });
  assert.equal(disabled.rung, 'none');
  assert.equal(disabled.reason, RUNTIME_UNAVAILABLE_REASONS.disabled);
  assert.equal(allPass(disabled), true);

  const failureRoot = await runRoot();
  const launchFailure = await verifyRun({
    runRoot: failureRoot,
    recipe: 'project-recap',
    rung: 'playwright',
    headlessRuntimeOptions: {
      loadDriver: async () => ({
        chromium: {
          executablePath: () => '/fixture/non-executable',
          launch: async () => {
            throw new Error('spawn EACCES /fixture/non-executable');
          },
        },
      }),
      fileExists: (path) => path === '/fixture/non-executable',
      env: {},
    },
  });
  assert.equal(launchFailure.rung, 'none');
  assert.match(launchFailure.reason, /^playwright-launch-failed:/);
  assert.notEqual(launchFailure.reason, RUNTIME_UNAVAILABLE_REASONS.disabled);
  assert.equal(allPass(launchFailure), true);
});

test('installed Playwright runtime probes the authored page', async (t) => {
  const runtime = await resolveHeadlessRuntime();
  if (!runtime.available) {
    t.skip(`headless runtime unavailable: ${runtime.reason}`);
    return;
  }

  const root = await runRoot();
  const result = await verifyRun({
    runRoot: root,
    recipe: 'project-recap',
    rung: 'playwright',
  });
  assert.equal(result.rung, 'playwright');
  assert.equal(result.visual.verdict, 'pass');
  assert.deepEqual(result.screenshots, [
    'qa/320.png',
    'qa/768.png',
    'qa/1440.png',
  ]);

  const brokenRoot = await runRoot();
  const html = await readFile(join(brokenRoot, 'site/index.html'), 'utf8');
  await writeFile(
    join(brokenRoot, 'site/index.html'),
    html.replace(
      '</head>',
      '<style>table{width:1200px;min-width:1200px}</style></head>',
    ),
  );
  const broken = await verifyRun({
    runRoot: brokenRoot,
    recipe: 'project-recap',
    rung: 'playwright',
  });
  assert.equal(broken.rung, 'playwright');
  assert.equal(broken.visual.verdict, 'findings');
  assert.ok(
    broken.visual.findings.some((finding) =>
      finding.includes('viewport-overflow'),
    ),
  );
  const manifest = await recordRun({
    runRoot: brokenRoot,
    recipe: 'project-recap',
    slug: 'playwright-broken-layout',
    mode: 'unattended',
    themePath: join(brokenRoot, 'theme.resolved.json'),
  });
  assert.equal(manifest.outcome, 'built-needs-review');
});

test('fixture variants fail their owning browser-free check', async () => {
  const valid = await readFile(join(fixtures, 'valid.html'), 'utf8');
  const variants = JSON.parse(
    await readFile(join(fixtures, 'variants.json'), 'utf8'),
  );
  const expectations = {
    missingSection: ['requiredNarrative', /required-section/],
    foreignScript: ['shellScripts', /core-script/],
    externalSrc: ['structure', /external-asset/],
    untracedNumber: ['pageToLedger', /verify-claim-untraced/],
    missingLedgerAnchor: ['ledgerToPage', /cohesion-claim-unobserved/],
  };

  for (const [name, mutation] of Object.entries(variants)) {
    const root = await runRoot();
    await writeFile(
      join(root, 'site/index.html'),
      valid.replace(mutation.find, mutation.replace),
    );
    const result = await verifyRun({ runRoot: root, recipe: 'project-recap' });
    const [check, cause] = expectations[name];
    assert.equal(result.checks[check].status, 'fail', name);
    assert.match(result.checks[check].cause, cause, name);
  }
});

test('real-material counts pass and swapped W1/W2 counts are untraced', async () => {
  const root = await runRoot('program.html');
  await writeFile(
    join(root, 'source/ledger.json'),
    await readFile(join(fixtures, 'program-ledger.json')),
  );
  const correct = await verifyRun({ runRoot: root, recipe: 'program-recap' });
  assert.equal(allPass(correct), true);

  const page = await readFile(join(root, 'site/index.html'), 'utf8');
  await writeFile(
    join(root, 'site/index.html'),
    page
      .replace('<td>20260909 1</td>', '<td>20260909 SWAP</td>')
      .replace('<td>20260909 2</td>', '<td>20260909 1</td>')
      .replace('<td>20260909 SWAP</td>', '<td>20260909 2</td>'),
  );
  const swapped = await verifyRun({ runRoot: root, recipe: 'program-recap' });
  assert.equal(swapped.checks.pageToLedger.status, 'fail');
  assert.match(
    swapped.checks.pageToLedger.cause,
    /verify-claim-untraced:wave-1:2/,
  );
});

test('authoring absence and verification crashes write distinct failure stages', async () => {
  const missing = await runRoot();
  await rm(join(missing, 'site/index.html'));
  await assert.rejects(
    verifyRun({ runRoot: missing, recipe: 'project-recap' }),
    { code: 'verify-authoring-missing' },
  );
  assert.equal(
    JSON.parse(await readFile(join(missing, 'failure.json'), 'utf8')).stage,
    'authoring',
  );
  await assert.rejects(readFile(join(missing, 'qa/result.json')), {
    code: 'ENOENT',
  });

  const crash = await runRoot();
  await writeFile(join(crash, 'source/ledger.json'), '{not-json');
  await assert.rejects(
    verifyRun({ runRoot: crash, recipe: 'project-recap' }),
    SyntaxError,
  );
  assert.equal(
    JSON.parse(await readFile(join(crash, 'failure.json'), 'utf8')).stage,
    'verify',
  );
});

test('malformed authored HTML records failed checks instead of a failure file', async () => {
  const root = await runRoot();
  const html = await readFile(join(root, 'site/index.html'), 'utf8');
  await writeFile(join(root, 'site/index.html'), html.replace('</main>', ''));
  const result = await verifyRun({ runRoot: root, recipe: 'project-recap' });

  assert.equal(result.checks.parse.status, 'fail');
  await assert.rejects(readFile(join(root, 'failure.json')), {
    code: 'ENOENT',
  });
});
