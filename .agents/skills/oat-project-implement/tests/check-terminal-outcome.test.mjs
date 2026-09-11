import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import { writeFailure } from '../../explainer-kit/scripts/bundle.mjs';
import { runRecord } from '../../explainer-kit/scripts/record.mjs';
import { checkTerminalOutcome } from '../../oat-explainer-kit/scripts/check-terminal-outcome.mjs';

const route = new URL(
  '../references/completion-and-closeout.md',
  import.meta.url,
);
const guardScript = new URL(
  '../../oat-explainer-kit/scripts/check-terminal-outcome.mjs',
  import.meta.url,
);
const execFileAsync = promisify(execFile);
const here = dirname(fileURLToPath(import.meta.url));
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

function recordArgs(root) {
  return [
    '--run-root',
    root,
    '--recipe',
    'project-recap',
    '--slug',
    'failed-recap',
    '--mode',
    'unattended',
    '--theme',
    join(root, 'theme.resolved.json'),
    '--run-id',
    'failed-recap',
    '--created-at',
    '2026-09-11T14:45:00.000Z',
  ];
}

function runGenerateGuard(manifestPath) {
  return execFileAsync(process.execPath, [
    guardScript.pathname,
    '--intent',
    'generate',
    '--manifest',
    manifestPath,
  ]);
}

test('implementation closeout rejects outcome-only generated recap claims', () => {
  for (const outcome of [
    undefined,
    'built',
    'built-needs-review',
    'failed',
    'incomplete',
    'built-durable',
    'built-not-durable',
  ]) {
    assert.throws(
      () => checkTerminalOutcome({ intent: 'generate', outcome }),
      (error) =>
        error?.code === 'E_RECAP_OUTCOME' &&
        /terminal recap outcome/i.test(error.message),
    );
  }
  assert.deepEqual(checkTerminalOutcome({ intent: 'skip' }), {
    ok: true,
    intent: 'skip',
    outcome: null,
    reason: null,
  });
  assert.deepEqual(
    checkTerminalOutcome({ intent: 'skip', reason: 'capability_probe' }),
    {
      ok: true,
      intent: 'skip',
      outcome: null,
      reason: 'capability_probe',
    },
  );
  for (const invalid of [
    { intent: 'skip', reason: 'seams-unavailable' },
    { intent: 'generate', outcome: 'failed', reason: 'capability_probe' },
  ]) {
    assert.throws(
      () => checkTerminalOutcome(invalid),
      (error) => error?.code === 'E_RECAP_OUTCOME',
    );
  }
});

test('implementation closeout accepts a complete recorded project-recap package', async () => {
  const { stdout } = await runGenerateGuard(
    join(packageFixture, 'manifest.json'),
  );
  assert.deepEqual(JSON.parse(stdout), {
    ok: true,
    intent: 'generate',
    outcome: 'built-needs-review',
  });
});

test('implementation closeout rejects a partial built manifest', async () => {
  const root = await mkdtemp(join(tmpdir(), 'recap-partial-built-implement-'));
  try {
    const manifestPath = join(root, 'manifest.json');
    await writeFile(manifestPath, '{"outcome":"built"}\n');
    await assert.rejects(runGenerateGuard(manifestPath));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('implementation closeout rejects corrupted package bytes', async () => {
  const root = await mkdtemp(join(tmpdir(), 'recap-corrupt-implement-'));
  try {
    await cp(packageFixture, root, { recursive: true });
    await writeFile(join(root, 'site/index.html'), 'corrupted');
    await assert.rejects(runGenerateGuard(join(root, 'manifest.json')));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('implementation closeout rejects partial failed-attempt objects', async () => {
  const root = await mkdtemp(
    join(tmpdir(), 'recap-outcome-partial-implement-'),
  );
  try {
    const partialManifest = join(root, 'partial-manifest.json');
    const partialFailure = join(root, 'failure.json');
    await writeFile(partialManifest, '{"outcome":"failed"}\n');
    await writeFile(
      partialFailure,
      '{"stage":"verify","cause":"interrupted","at":"2026-09-11T14:45:00.000Z"}\n',
    );
    for (const evidenceArgs of [
      ['--manifest', partialManifest],
      ['--failure', partialFailure],
    ]) {
      await assert.rejects(
        execFileAsync(process.execPath, [
          guardScript.pathname,
          '--intent',
          'skip',
          '--skip-reason',
          'failed_attempt',
          ...evidenceArgs,
        ]),
      );
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('implementation closeout requires evidence for skip failed_attempt', async () => {
  const root = await mkdtemp(join(tmpdir(), 'recap-outcome-implement-'));
  try {
    const failedRoot = join(root, 'failed');
    const incompleteRoot = join(root, 'incomplete');
    const failureRoot = join(root, 'flow-failure');
    await cp(packageFixture, failedRoot, { recursive: true });
    await rm(join(failedRoot, 'manifest.json'));
    const qa = JSON.parse(
      await readFile(join(failedRoot, 'qa/result.json'), 'utf8'),
    );
    qa.checks.structure = { status: 'fail', cause: 'interrupted' };
    await writeFile(
      join(failedRoot, 'qa/result.json'),
      `${JSON.stringify(qa)}\n`,
    );
    await runRecord(recordArgs(failedRoot), { log() {} });

    await cp(packageFixture, incompleteRoot, { recursive: true });
    await rm(join(incompleteRoot, 'manifest.json'));
    await rm(join(incompleteRoot, 'qa/result.json'));
    await runRecord(recordArgs(incompleteRoot), { log() {} });

    await writeFailure(failureRoot, 'interrupted', 'operator stopped the flow');
    const failedManifest = join(failedRoot, 'manifest.json');
    const incompleteManifest = join(incompleteRoot, 'manifest.json');
    const builtManifest = join(packageFixture, 'manifest.json');
    const failure = join(failureRoot, 'failure.json');

    for (const evidenceArgs of [
      ['--manifest', failedManifest],
      ['--manifest', incompleteManifest],
      ['--failure', failure],
    ]) {
      const { stdout } = await execFileAsync(process.execPath, [
        guardScript.pathname,
        '--intent',
        'skip',
        '--skip-reason',
        'failed_attempt',
        ...evidenceArgs,
      ]);
      assert.deepEqual(JSON.parse(stdout), {
        ok: true,
        intent: 'skip',
        outcome: null,
        reason: 'failed_attempt',
      });
    }

    const unknownFailure = JSON.parse(await readFile(failure, 'utf8'));
    unknownFailure.stage = 'unknown-stage';
    await writeFile(failure, `${JSON.stringify(unknownFailure)}\n`);
    await assert.rejects(
      execFileAsync(process.execPath, [
        guardScript.pathname,
        '--intent',
        'skip',
        '--skip-reason',
        'failed_attempt',
        '--failure',
        failure,
      ]),
      (error) =>
        error?.code === 1 &&
        /failed_attempt requires a failed or incomplete manifest or failure\.json/.test(
          error.stderr,
        ),
    );
    await assert.rejects(
      writeFailure(join(root, 'unknown-writer'), 'unknown-stage', 'invalid'),
      /Unsupported failure stage/,
    );

    const partialManifest = join(root, 'partial-manifest.json');
    const partialFailure = join(root, 'failure.json');
    await writeFile(partialManifest, '{"outcome":"failed"}\n');
    await writeFile(
      partialFailure,
      '{"stage":"verify","cause":"interrupted","at":"2026-09-11T14:45:00.000Z"}\n',
    );
    for (const evidenceArgs of [
      [],
      ['--manifest', builtManifest],
      ['--manifest', partialManifest],
      ['--failure', partialFailure],
    ]) {
      await assert.rejects(
        execFileAsync(process.execPath, [
          guardScript.pathname,
          '--intent',
          'skip',
          '--skip-reason',
          'failed_attempt',
          ...evidenceArgs,
        ]),
        (error) =>
          error?.code === 1 &&
          /failed_attempt requires a failed or incomplete manifest or failure\.json/.test(
            error.stderr,
          ),
      );
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('implementation closeout invokes the shared guard before final approval', async () => {
  const guidance = await readFile(route, 'utf8');
  const guard = guidance.indexOf('scripts/check-terminal-outcome.mjs');
  const approval = guidance.indexOf('approval: approved', guard);

  assert.notEqual(guard, -1);
  assert.ok(approval > guard);
  assert.match(
    guidance.slice(guard, approval),
    /built-durable.*built-not-durable.*built-needs-review.*failed/s,
  );
});
