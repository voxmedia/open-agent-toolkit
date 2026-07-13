import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { promisify } from 'node:util';

import {
  buildUnavailableControl,
  emitUnavailableControl,
} from './negative.mjs';
import { checkEvidenceReport } from './report.mjs';

const execFileAsync = promisify(execFile);

test('builds unavailable evidence from real preflight shape and empty inventory', async () => {
  const repository = await mkdtemp(join(tmpdir(), 'oat-negative-evidence-'));
  const runsDirectory = join(repository, 'tools/smoke/.runs');
  const preflightPath = join(repository, 'preflight.txt');
  const outDirectory = join(repository, 'report');
  await execFileAsync('git', ['init', '--initial-branch=main'], {
    cwd: repository,
  });
  const preflight = {
    fixture: { result: 'valid' },
    forcedUnavailable: 'codex',
    harnesses: {
      codex: {
        authenticated: { result: 'not-run' },
        installed: { result: 'unavailable' },
      },
    },
    oat: { result: 'local' },
    selectedHarness: 'codex',
    status: 'blocked',
  };
  await writeFile(
    preflightPath,
    `Smoke preflight: blocked\n${JSON.stringify(preflight)}\n`,
  );

  try {
    const bundle = await buildUnavailableControl({
      harness: 'codex',
      preflightPath,
      repository,
      runsDirectory,
    });
    assert.deepEqual(bundle.provisioningEvidence, {
      branches: [],
      manifests: [],
      worktrees: [],
    });

    const result = await emitUnavailableControl({
      harness: 'codex',
      outDirectory,
      preflightPath,
      repository,
      runsDirectory,
    });
    assert.equal(result.report.status, 'passed');
    assert.equal(
      await checkEvidenceReport(result.jsonPath, {
        expectedProfile: 'unavailable-target',
      }),
      true,
    );

    await mkdir(join(runsDirectory, 'smoke-leak'), { recursive: true });
    const leaked = await buildUnavailableControl({
      harness: 'codex',
      preflightPath,
      repository,
      runsDirectory,
    });
    assert.equal(leaked.provisioningEvidence.manifests.length, 1);
  } finally {
    await rm(repository, { force: true, recursive: true });
  }
});
