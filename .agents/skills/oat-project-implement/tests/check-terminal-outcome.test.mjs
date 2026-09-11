import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { promisify } from 'node:util';

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

test('implementation closeout accepts only terminal generated recap outcomes', () => {
  for (const outcome of ['built', 'built-needs-review']) {
    assert.deepEqual(checkTerminalOutcome({ intent: 'generate', outcome }), {
      ok: true,
      intent: 'generate',
      outcome,
    });
  }

  for (const outcome of [
    undefined,
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

test('implementation closeout requires evidence for skip failed_attempt', async () => {
  const root = await mkdtemp(join(tmpdir(), 'recap-outcome-implement-'));
  try {
    const failedManifest = join(root, 'failed.json');
    const incompleteManifest = join(root, 'incomplete.json');
    const builtManifest = join(root, 'built.json');
    const failure = join(root, 'failure.json');
    await writeFile(failedManifest, '{"outcome":"failed"}\n');
    await writeFile(incompleteManifest, '{"outcome":"incomplete"}\n');
    await writeFile(builtManifest, '{"outcome":"built"}\n');
    await writeFile(
      failure,
      '{"stage":"verify","cause":"interrupted","at":"2026-09-11T14:45:00.000Z"}\n',
    );

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

    for (const evidenceArgs of [[], ['--manifest', builtManifest]]) {
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
