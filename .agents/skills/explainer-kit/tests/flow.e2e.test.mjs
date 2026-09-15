import assert from 'node:assert/strict';
import {
  cp,
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { runBundle } from '../scripts/bundle.mjs';
import { resolveTheme } from '../scripts/lib/theme.mjs';
import { runRecord } from '../scripts/record.mjs';
import { runVerify } from '../scripts/verify.mjs';

const here = dirname(fileURLToPath(import.meta.url));
// Tracked byte copies of the live PJM artifacts; see fixtures/flow/inputs/PROVENANCE.md.
const flowInputs = join(here, 'fixtures', 'flow', 'inputs');
const programPath = join(flowInputs, '2026-08-31-execution-program.md');
const summariesRoot = join(flowInputs, 'summaries');
const authoredPage = join(here, 'fixtures', 'flow', 'program-recap.html');
const projectFixture = join(here, 'fixtures', 'bundle', 'project');
const projectPage = join(here, 'fixtures', 'verify', 'valid.html');

async function prepareRun(name) {
  const root = await mkdtemp(join(tmpdir(), `explainer-flow-${name}-`));
  const summaries = join(root, 'summaries');
  const runRoot = join(root, 'run');
  const themePath = join(root, 'theme.json');
  await mkdir(summaries);

  for (const summary of await readdir(summariesRoot)) {
    await copyFile(join(summariesRoot, summary), join(summaries, summary));
  }

  const { theme } = await resolveTheme({ style: 'clean-neutral' });
  await writeFile(themePath, `${JSON.stringify(theme, null, 2)}\n`);
  const bundleArgs = [
    '--recipe',
    'program-recap',
    '--program',
    programPath,
    '--summaries',
    summaries,
    '--theme',
    themePath,
    '--out',
    runRoot,
  ];
  const bundle = await runBundle(bundleArgs, { log() {} });
  assert.equal(bundle.reuse, false);
  await mkdir(join(runRoot, 'site'));
  await copyFile(authoredPage, join(runRoot, 'site/index.html'));
  return { root, runRoot, themePath, bundleArgs };
}

async function prepareProjectRun(name) {
  const root = await mkdtemp(join(tmpdir(), `explainer-project-${name}-`));
  const project = join(root, 'project');
  const runRoot = join(root, 'run');
  const themePath = join(root, 'theme.json');
  await cp(projectFixture, project, { recursive: true });
  const { theme } = await resolveTheme({ style: 'clean-neutral' });
  await writeFile(themePath, `${JSON.stringify(theme, null, 2)}\n`);
  const bundleArgs = [
    '--recipe',
    'project-recap',
    '--project',
    project,
    '--theme',
    themePath,
    '--out',
    runRoot,
  ];
  await runBundle(bundleArgs, { log() {} });
  await mkdir(join(runRoot, 'site'));
  await copyFile(projectPage, join(runRoot, 'site/index.html'));
  await runVerify(
    ['--run-root', runRoot, '--recipe', 'project-recap', '--rung', 'none'],
    { log() {} },
  );
  await runRecord(
    [
      '--run-root',
      runRoot,
      '--recipe',
      'project-recap',
      '--slug',
      'multi-file-project',
      '--mode',
      'unattended',
      '--theme',
      themePath,
      '--run-id',
      'p06-t01-multi-file-project',
      '--created-at',
      '2026-09-12T12:45:00.000Z',
    ],
    { log() {} },
  );
  return { root, project, runRoot, bundleArgs };
}

async function packageSnapshot(root, relativeRoot = '') {
  const snapshot = {};
  for (const entry of await readdir(join(root, relativeRoot), {
    withFileTypes: true,
  })) {
    const path = relativeRoot ? `${relativeRoot}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      Object.assign(snapshot, await packageSnapshot(root, path));
      continue;
    }
    const [bytes, metadata] = await Promise.all([
      readFile(join(root, path)),
      stat(join(root, path), { bigint: true }),
    ]);
    snapshot[path] = {
      bytes: bytes.toString('base64'),
      mtimeNs: metadata.mtimeNs.toString(),
    };
  }
  return snapshot;
}

function recordArgs(runRoot, themePath) {
  return [
    '--run-root',
    runRoot,
    '--recipe',
    'program-recap',
    '--slug',
    'execution-program',
    '--mode',
    'unattended',
    '--theme',
    themePath,
    '--run-id',
    'p01-t09-real-material',
    '--created-at',
    '2026-09-11T14:45:00.000Z',
  ];
}

test('recorded multi-file project reuse ignores hash key order without touching the package', async () => {
  const fixture = await prepareProjectRun('reuse');
  try {
    const manifestPath = join(fixture.runRoot, 'manifest.json');
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    manifest.source.inputHashes = Object.fromEntries(
      Object.entries(manifest.source.inputHashes).reverse(),
    );
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    const before = await packageSnapshot(fixture.runRoot);

    const reuse = await runBundle(fixture.bundleArgs, { log() {} });

    assert.equal(reuse.reuse, true);
    assert.equal(reuse.runRoot, fixture.runRoot);
    assert.deepEqual(await packageSnapshot(fixture.runRoot), before);

    await writeFile(
      join(fixture.project, 'summary.md'),
      '# Alpha migration\n\nThe Alpha migration changed.\n',
    );
    const changed = await runBundle(fixture.bundleArgs, { log() {} });
    assert.equal(changed.reuse, false);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test('swapped latest-wave task counts fail page-to-ledger tracing', async () => {
  const fixture = await prepareRun('swapped');
  try {
    const pagePath = join(fixture.runRoot, 'site/index.html');
    const page = await readFile(pagePath, 'utf8');
    await writeFile(
      pagePath,
      page
        .replace(
          '<td>W6</td>\n                  <td>5</td>',
          '<td>W6</td>\n                  <td>20</td>',
        )
        .replace(
          '<td>W7</td>\n                  <td>20</td>',
          '<td>W7</td>\n                  <td>5</td>',
        ),
    );

    const qa = await runVerify(
      [
        '--run-root',
        fixture.runRoot,
        '--recipe',
        'program-recap',
        '--rung',
        'none',
      ],
      { log() {} },
    );
    assert.equal(qa.checks.pageToLedger.status, 'fail');
    assert.match(qa.checks.pageToLedger.cause, /verify-claim-untraced:W6:20/);
    assert.match(qa.checks.pageToLedger.cause, /verify-claim-untraced:W7:5/);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test('record rejects QA evidence for different authored HTML bytes', async () => {
  const fixture = await prepareRun('stale');
  try {
    await runVerify(
      [
        '--run-root',
        fixture.runRoot,
        '--recipe',
        'program-recap',
        '--rung',
        'none',
      ],
      { log() {} },
    );
    await writeFile(
      join(fixture.runRoot, 'site/index.html'),
      `${await readFile(join(fixture.runRoot, 'site/index.html'), 'utf8')}\n`,
    );

    await assert.rejects(
      runRecord(recordArgs(fixture.runRoot, fixture.themePath), { log() {} }),
      { code: 'record-qa-stale' },
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});
