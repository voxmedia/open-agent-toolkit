import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  cp,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
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
import { runRecord } from '../scripts/record.mjs';
import { runVerify } from '../scripts/verify.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const fixtures = join(here, 'fixtures', 'bundle');
const script = join(here, '..', 'scripts', 'bundle.mjs');
const checkedPackage = join(
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
      'orchestration-log.md',
    ],
  );
  assert.equal(
    recap.some(({ text }) =>
      text.includes('state-only-sentinel-must-not-be-bundled'),
    ),
    false,
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

test('collectInputs selects latest canonical archive wrappers and only Final Summary', async () => {
  const { root, path } = await temporaryFixture('program');
  const archive = join(root, 'archive');
  for (const [name, summary] of [
    ['20260908-wave-1-execution', 'old wave one'],
    ['20260910-wave-1-execution', 'latest wave one'],
    ['20260909-wave-2-execution', 'latest wave two'],
    ['20260911-project-other', 'not a wave wrapper'],
  ]) {
    const wrapper = join(archive, name);
    await mkdir(wrapper, { recursive: true });
    await writeFile(
      join(wrapper, 'implementation.md'),
      `# Implementation\n\nSecret preamble for ${name}.\n\n## Final Summary\n\n${summary}.\n\n## Afterword\n\nSecret trailer.\n`,
    );
  }
  await mkdir(join(archive, '20260912-wave-3-execution'));

  const collected = await collectInputs(loadRecipe('program-recap', '1'), {
    program: join(path, '2026-08-31-execution-program.md'),
    archive,
  });
  const wrappers = collected.filter(({ locator }) =>
    locator.endsWith('/implementation.md'),
  );
  assert.deepEqual(
    wrappers.map(({ locator }) => locator),
    [
      '20260909-wave-2-execution/implementation.md',
      '20260910-wave-1-execution/implementation.md',
    ],
  );
  assert.deepEqual(
    wrappers.map(({ text }) => text.trim()),
    [
      '## Final Summary\n\nlatest wave two.',
      '## Final Summary\n\nlatest wave one.',
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

test('supplied fact base preserves identity through verify, record, and reuse', async () => {
  const root = await mkdtemp(join(tmpdir(), 'explainer-supplied-flow-'));
  const suppliedPath = join(root, 'facts.json');
  const out = join(root, 'run');
  const theme = await themeFile(root);
  await writeFile(
    suppliedPath,
    `${JSON.stringify({
      schemaVersion: 'explainer-kit.fact-base/v1',
      generatedAt: '2026-09-11T12:00:00.000Z',
      mode: 'supplied',
      freshnessPolicy: 'live-wins',
      sources: [
        {
          id: 'operator-source',
          kind: 'file',
          locator: 'operator.md',
          hash: `sha256:${'a'.repeat(64)}`,
        },
      ],
      claims: [
        {
          id: 'operator-claim',
          text: 'p01 is complete with 17 tasks on 2026-09-11.',
          status: 'confirmed',
          citations: [
            { sourceId: 'operator-source', locator: 'operator.md:1-1' },
          ],
        },
      ],
      unresolvedClaims: [],
      overrides: [],
    })}\n`,
  );
  const args = [
    '--recipe',
    'program-recap',
    '--fact-base',
    suppliedPath,
    '--theme',
    theme,
    '--out',
    out,
  ];
  const bundle = await runBundle(args, { log() {} });
  await mkdir(join(out, 'site'));
  const shell = await readFile(
    join(here, '..', 'templates', 'house-style.html'),
    'utf8',
  );
  const content = `
<section id="program-overview"><h2>Program overview</h2><p>program-recap evidence.</p><p>p01: 17 tasks, complete on 2026-09-11.</p></section>
<section id="wave-map"><h2>Wave map</h2><p>Delivery sequence.</p></section>
<section id="per-wave-outcomes"><h2>Per-wave outcomes</h2><p>Recorded results.</p></section>
<section id="convention-evolution"><h2>Convention evolution</h2><p>Shared conventions.</p></section>
<section id="aggregate-numbers"><h2>Aggregate totals</h2><p>See the overview.</p></section>
<section id="follow-up-ledger"><h2>Follow-up ledger</h2><p>No pending action.</p></section>`;
  const page = Object.entries({
    THEME_CSS: '',
    TITLE: 'Program recap',
    DESCRIPTION: 'Supplied facts',
    EYEBROW: 'Program',
    NAVIGATION: '',
    CONTENT: content,
    FOOTER: 'End',
  }).reduce(
    (html, [name, replacement]) => html.replaceAll(`{{${name}}}`, replacement),
    shell,
  );
  await writeFile(join(out, 'site/index.html'), page);
  const qa = await runVerify(
    ['--run-root', out, '--recipe', 'program-recap', '--rung', 'none'],
    { log() {} },
  );
  assert.equal(
    Object.values(qa.checks).every(({ status }) => status === 'pass'),
    true,
    JSON.stringify(qa.checks),
  );
  const manifest = await runRecord(
    [
      '--run-root',
      out,
      '--recipe',
      'program-recap',
      '--slug',
      'supplied-flow',
      '--mode',
      'interactive',
      '--theme',
      theme,
      '--run-id',
      'supplied-flow',
      '--created-at',
      '2026-09-11T12:30:00.000Z',
    ],
    { log() {} },
  );
  assert.deepEqual(manifest.source.inputHashes, bundle.inputHashes);
  assert.equal((await runBundle(args, { log() {} })).reuse, true);
});

test('input hashes are deterministic and mutation-sensitive', async () => {
  const { path } = await temporaryFixture('project');
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

  await writeFile(join(path, 'summary.md'), '# Changed\n');
  const changed = await collectInputs(recipe, { project: path });
  const changedHashes = Object.fromEntries(
    changed.map((item) => [item.locator, item.hash]),
  );
  assert.notEqual(changedHashes['summary.md'], firstHashes['summary.md']);
});

test('reuse requires a valid byte-bound canonical recorded package', async () => {
  const root = await mkdtemp(join(tmpdir(), 'explainer-reuse-'));
  const recipe = loadRecipe('project-recap', '2');
  const pristine = join(root, 'pristine');
  await cp(checkedPackage, pristine, { recursive: true });
  const pristineManifest = JSON.parse(
    await readFile(join(pristine, 'manifest.json'), 'utf8'),
  );
  const inputHashes = pristineManifest.source.inputHashes;
  assert.equal(await findReusableRun(pristine, recipe, inputHashes), pristine);

  for (const [name, mutate] of [
    [
      'malformed-manifest',
      async (runRoot) => {
        const manifest = JSON.parse(
          await readFile(join(runRoot, 'manifest.json'), 'utf8'),
        );
        delete manifest.runId;
        await writeFile(
          join(runRoot, 'manifest.json'),
          JSON.stringify(manifest),
        );
      },
    ],
    [
      'missing-artifact',
      async (runRoot) => rm(join(runRoot, 'site/index.html')),
    ],
    [
      'modified-artifact',
      async (runRoot) => writeFile(join(runRoot, 'site/index.html'), 'changed'),
    ],
    [
      'extra-file',
      async (runRoot) =>
        writeFile(join(runRoot, 'self-authorized.txt'), 'extra'),
    ],
    [
      'qa-binding',
      async (runRoot) => {
        const qa = JSON.parse(
          await readFile(join(runRoot, 'qa/result.json'), 'utf8'),
        );
        qa.artifactSha256 =
          'sha256:ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
        await writeFile(join(runRoot, 'qa/result.json'), JSON.stringify(qa));
      },
    ],
  ]) {
    const runRoot = join(root, name);
    await cp(checkedPackage, runRoot, { recursive: true });
    await mutate(runRoot);
    assert.equal(
      await findReusableRun(runRoot, recipe, inputHashes),
      null,
      name,
    );
  }
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
