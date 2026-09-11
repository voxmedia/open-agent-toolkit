import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  cp,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  collectInputs,
  extractClaims,
  findReusableRun,
  indexClaims,
  runBundle,
  selectAnchorLedger,
} from '../scripts/bundle.mjs';
import { validateContract } from '../scripts/lib/contracts.mjs';
import { loadRecipe } from '../scripts/lib/recipes.mjs';
import { resolveTheme } from '../scripts/lib/theme.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const fixtures = join(here, 'fixtures', 'bundle');
const script = join(here, '..', 'scripts', 'bundle.mjs');

async function temporaryFixture(name) {
  const root = await mkdtemp(join(tmpdir(), `explainer-bundle-${name}-`));
  await cp(join(fixtures, name), join(root, name), { recursive: true });
  return { root, path: join(root, name) };
}

async function themeFile(root) {
  const { theme } = await resolveTheme({ style: 'clean-neutral' });
  const path = join(root, 'theme.json');
  await writeFile(path, `${JSON.stringify(theme, null, 2)}\n`);
  return path;
}

test('collectInputs enforces the project recipe allowlist', async () => {
  const { path } = await temporaryFixture('project');
  await writeFile(join(path, 'secret.txt'), 'must not enter the bundle');

  const recap = await collectInputs(loadRecipe('project-recap', '2'), {
    project: path,
  });
  assert.deepEqual(
    recap.map(({ locator }) => locator),
    [
      'summary.md',
      'implementation.md',
      'project-log.md',
      'plan.md',
      'state.md',
    ],
  );

  const explainer = await collectInputs(loadRecipe('project-explainer', '1'), {
    project: path,
  });
  assert.deepEqual(
    explainer.map(({ locator }) => locator),
    ['plan.md'],
  );
});

test('collectInputs selects only the newest program summary per wave', async () => {
  const { path } = await temporaryFixture('program');
  const collected = await collectInputs(loadRecipe('program-recap', '1'), {
    program: join(path, '2026-08-31-execution-program.md'),
    summaries: join(path, 'summaries'),
  });

  assert.deepEqual(
    collected.map(({ locator }) => locator),
    [
      '2026-08-31-execution-program.md',
      '20260909-wave-1-execution.md',
      '20260909-wave-2-execution.md',
    ],
  );
});

test('collectInputs follows document trees but refuses a symlink escape', async () => {
  const { root, path } = await temporaryFixture('documents');
  const outside = join(root, 'outside.md');
  await writeFile(outside, 'outside secret');
  await symlink(outside, join(path, 'escape.md'));

  await assert.rejects(
    collectInputs(loadRecipe('engineer-tour', '1'), { documents: [path] }),
    /escapes its declared root/,
  );
});

test('extractClaims emits schema citations and unresolved parse failures', async () => {
  const [input] = await collectInputs(loadRecipe('engineer-tour', '1'), {
    documents: [join(fixtures, 'documents', 'overview.md')],
  });
  const extracted = extractClaims(input);
  assert.ok(extracted.claims.length > 0);
  assert.deepEqual(Object.keys(extracted.claims[0].citations[0]).sort(), [
    'locator',
    'sourceId',
  ]);

  const unparseable = extractClaims({
    id: 'binary',
    locator: 'broken.txt',
    bytes: Buffer.from([0]),
    text: '\0',
  });
  assert.equal(unparseable.claims.length, 0);
  assert.equal(unparseable.unresolvedClaims.length, 1);
});

test('anchor ledger uses row and heading subjects and bounds groups', () => {
  const claims = Array.from({ length: 20 }, (_, index) => ({
    id: `claim-${index}`,
    text: `| p01-t${String(index).padStart(2, '0')} | ${index} | complete |`,
    status: 'confirmed',
    citations: [{ sourceId: 'source', locator: `plan.md:${index + 1}` }],
    _subject: `p01-t${String(index).padStart(2, '0')}`,
    _section: 'Tasks',
  }));
  const indexed = indexClaims(claims);
  assert.equal(indexed[0].subject, 'p01-t00');
  const ledger = selectAnchorLedger(claims, 'project-recap');
  assert.ok(ledger.terminology.length <= 12);
  assert.ok(ledger.numbers.length <= 12);
  assert.ok(ledger.statuses.length <= 12);
  assert.ok(ledger.claims.length > ledger.numbers.length);
});

test('all four input modes produce valid deterministic bundle sources', async () => {
  const project = await temporaryFixture('project');
  const program = await temporaryFixture('program');
  const documents = await temporaryFixture('documents');
  const supplied = await temporaryFixture('fact-base.json');
  const cases = [
    {
      recipe: 'project-recap',
      args: { project: project.path },
    },
    {
      recipe: 'program-recap',
      args: {
        program: join(program.path, '2026-08-31-execution-program.md'),
        summaries: join(program.path, 'summaries'),
      },
    },
    {
      recipe: 'engineer-tour',
      args: { inputs: [documents.path] },
    },
    {
      recipe: 'project-recap',
      args: { factBase: supplied.path },
    },
  ];

  for (const [index, fixture] of cases.entries()) {
    const out = join(project.root, `run-${index}`);
    const theme = await themeFile(project.root);
    const result = await runBundle(
      [
        '--recipe',
        fixture.recipe,
        ...(fixture.args.project ? ['--project', fixture.args.project] : []),
        ...(fixture.args.program
          ? [
              '--program',
              fixture.args.program,
              '--summaries',
              fixture.args.summaries,
            ]
          : []),
        ...(fixture.args.inputs ? ['--inputs', ...fixture.args.inputs] : []),
        ...(fixture.args.factBase
          ? ['--fact-base', fixture.args.factBase]
          : []),
        '--theme',
        theme,
        '--out',
        out,
      ],
      { log() {} },
    );
    assert.equal(result.reuse, false);
    const factBase = JSON.parse(
      await readFile(join(out, 'source', 'fact-base.json'), 'utf8'),
    );
    assert.equal(validateContract('fact-base', factBase).valid, true);
    assert.deepEqual(Object.keys(factBase).sort(), [
      'claims',
      'freshnessPolicy',
      'generatedAt',
      'mode',
      'overrides',
      'schemaVersion',
      'sources',
      'unresolvedClaims',
    ]);
    assert.ok(await lstat(join(out, 'theme.resolved.json')));
    assert.deepEqual(
      (await readdir(out)).filter((entry) => entry.startsWith('.bundle-')),
      [],
    );
  }
});

test('input hashes are deterministic, mutation-sensitive, and gate reuse', async () => {
  const { root, path } = await temporaryFixture('project');
  const recipe = loadRecipe('project-recap', '2');
  const first = await collectInputs(recipe, { project: path });
  const second = await collectInputs(recipe, { project: path });
  const firstHashes = Object.fromEntries(
    first.map((item) => [item.locator, item.hash]),
  );
  const secondHashes = Object.fromEntries(
    second.map((item) => [item.locator, item.hash]),
  );
  assert.deepEqual(firstHashes, secondHashes);

  const out = join(root, 'run');
  await writeFile(join(path, 'summary.md'), '# Changed\n');
  const changed = await collectInputs(recipe, { project: path });
  const changedHashes = Object.fromEntries(
    changed.map((item) => [item.locator, item.hash]),
  );
  assert.notEqual(changedHashes['summary.md'], firstHashes['summary.md']);

  await cp(join(fixtures, 'project', 'summary.md'), join(path, 'summary.md'));
  const theme = await themeFile(root);
  const args = [
    '--recipe',
    'project-recap',
    '--project',
    path,
    '--theme',
    theme,
    '--out',
    out,
  ];
  const built = await runBundle(args, { log() {} });
  await writeFile(
    join(out, 'manifest.json'),
    `${JSON.stringify({
      schemaVersion: 'explainer-kit.manifest/v2',
      recipe: { id: 'project-recap', version: '2' },
      source: { inputHashes: built.inputHashes },
      outcome: 'built',
    })}\n`,
  );
  assert.equal(await findReusableRun(out, recipe, built.inputHashes), out);
  assert.equal((await runBundle(args, { log() {} })).reuse, true);

  const manifest = JSON.parse(
    await readFile(join(out, 'manifest.json'), 'utf8'),
  );
  manifest.outcome = 'failed';
  await writeFile(join(out, 'manifest.json'), JSON.stringify(manifest));
  assert.equal(await findReusableRun(out, recipe, built.inputHashes), null);
});

test('retry removes stale failure and CLI refuses a missing --out', async () => {
  const { root, path } = await temporaryFixture('project');
  const out = join(root, 'run');
  const theme = await themeFile(root);
  await mkdir(out);
  await writeFile(join(out, 'failure.json'), '{"old":true}');

  await runBundle(
    [
      '--recipe',
      'project-recap',
      '--project',
      path,
      '--theme',
      theme,
      '--out',
      out,
    ],
    { log() {} },
  );
  await assert.rejects(lstat(join(out, 'failure.json')), { code: 'ENOENT' });

  const missingOut = spawnSync(
    process.execPath,
    [script, '--recipe', 'project-recap', '--project', path, '--theme', theme],
    { encoding: 'utf8' },
  );
  assert.notEqual(missingOut.status, 0);
  assert.match(missingOut.stderr, /--out/);
});

test('script source does not import a browser runtime', async () => {
  const source = await readFile(script, 'utf8');
  assert.doesNotMatch(source, /playwright|puppeteer|chromium/i);
});
