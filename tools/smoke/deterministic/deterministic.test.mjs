import assert from 'node:assert/strict';
import {
  mkdtemp,
  readFile,
  readdir,
  realpath,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';

import { evaluateEvidence } from '../evidence/assertions.mjs';
import { collectEvidence } from '../evidence/collect.mjs';
import { writeStateTransitionRecord } from '../evidence/record.mjs';
import { cleanupSmoke } from '../runner/cleanup.mjs';
import { collectSmoke, driveSmoke } from '../runner/drive.mjs';
import { updateSmokeManifest } from '../runner/journal.mjs';
import { provisionSmoke } from '../runner/provision.mjs';
import { runDeterministicProvider } from './provider.mjs';

const repository = resolve(import.meta.dirname, '../../..');
const options = {
  driveMode: 'automated',
  dryRun: false,
  harness: 'deterministic',
  keep: false,
  scenario: 'implement',
};

async function provisionDeterministicRun(scenario = 'implement') {
  const root = await realpath(
    await mkdtemp(join(tmpdir(), 'oat-smoke-deterministic-')),
  );
  const runsDirectory = join(root, '.runs');
  const reportRepository = join(root, 'published');
  const manifest = await provisionSmoke(
    { ...options, scenario },
    {
      reportRepository,
      repository,
      runsDirectory,
    },
  );
  return { manifest, reportRepository, root, runsDirectory };
}

async function cleanupRun(run) {
  if (run.manifest) {
    const latestManifest = JSON.parse(
      await readFile(run.manifest.manifestPath, 'utf8'),
    );
    await cleanupSmoke(latestManifest, {
      repository,
      runsDirectory: run.runsDirectory,
    });
    const residue = await readdir(run.runsDirectory).catch((error) => {
      if (error?.code === 'ENOENT') {
        return [];
      }
      throw error;
    });
    assert.deepEqual(
      residue.filter((entry) => entry.startsWith('smoke-')),
      [],
    );
  }
  await rm(run.root, { force: true, recursive: true });
}

test('deterministic tier exercises production evidence paths without providers', async () => {
  const run = await provisionDeterministicRun();
  const context = {
    manifest: run.manifest,
    results: { preflight: { status: 'ready' } },
  };

  try {
    await driveSmoke(options, context);
    const result = await collectSmoke(options, context, {
      repository: run.reportRepository,
      runsDirectory: run.runsDirectory,
    });
    const bundle = JSON.parse(
      await readFile(result.collected.outputPath, 'utf8'),
    );

    assert.equal(result.report.report.status, 'passed');
    assert.deepEqual(
      bundle.dispatches
        .filter((dispatch) => dispatch.role === 'phase-implementer')
        .map((dispatch) => dispatch.scope)
        .sort(),
      ['p01', 'p02', 'p03'],
    );
    assert.equal(
      bundle.dispatches.some((dispatch) => dispatch.role === 'task-worker'),
      false,
    );
    assert.deepEqual(
      bundle.dispatches
        .filter((dispatch) => dispatch.role === 'reviewer')
        .map((dispatch) => dispatch.scope)
        .sort(),
      ['p01', 'p02', 'p03'],
    );
    assert.equal(
      bundle.dispatches.every(
        (dispatch) =>
          dispatch.ownership.launcherRole === 'project-root' &&
          dispatch.ownership.parentRequestId === bundle.manifest.runIdentity &&
          dispatch.ownership.parentScope === 'project',
      ),
      true,
    );
    assert.deepEqual(
      bundle.gates.map((gate) => gate.scope),
      ['final'],
    );
    assert.equal(bundle.manifest.ownershipJournal.resources.length, 2);
    assert.equal(bundle.manifest.harness, 'deterministic');
  } finally {
    await cleanupRun(run);
  }
});

test('deterministic child readiness failure is terminal before any launch', async () => {
  const run = await provisionDeterministicRun();

  try {
    await assert.rejects(
      () =>
        runDeterministicProvider({
          failureMode: 'bootstrap',
          worktreePath: run.manifest.worktreePath,
        }),
      /child readiness failure/,
    );
    const manifest = JSON.parse(
      await readFile(run.manifest.manifestPath, 'utf8'),
    );
    assert.equal(manifest.deterministic.status, 'failed');
    assert.equal(manifest.deterministic.failureMode, 'bootstrap');
    assert.equal(manifest.ownershipJournal.resources.length, 2);
    await assert.rejects(
      () =>
        readdir(join(run.manifest.worktreePath, 'workspace/evidence/dispatch')),
      (error) => error?.code === 'ENOENT',
    );
    await assert.rejects(
      () =>
        readdir(join(run.manifest.worktreePath, 'workspace/evidence/gates')),
      (error) => error?.code === 'ENOENT',
    );
  } finally {
    await cleanupRun(run);
  }
});

test('deterministic accepted failure is terminal and retained through recovery', async () => {
  const run = await provisionDeterministicRun();
  const context = {
    manifest: run.manifest,
    results: { preflight: { status: 'ready' } },
  };

  try {
    await Promise.all([
      updateSmokeManifest(run.manifest.manifestPath, (current) => ({
        ...current,
        deterministicProbe: {
          ...current.deterministicProbe,
          first: true,
        },
      })),
      updateSmokeManifest(run.manifest.manifestPath, (current) => ({
        ...current,
        deterministicProbe: {
          ...current.deterministicProbe,
          second: true,
        },
      })),
    ]);
    await assert.rejects(
      () =>
        driveSmoke(options, context, {
          execute: async () =>
            runDeterministicProvider({
              failureMode: 'post-acceptance',
              worktreePath: run.manifest.worktreePath,
            }),
        }),
      /accepted phase implementer failure/,
    );
    const manifest = JSON.parse(
      await readFile(run.manifest.manifestPath, 'utf8'),
    );
    assert.deepEqual(manifest.deterministicProbe, {
      first: true,
      second: true,
    });
    assert.equal(manifest.deterministic.status, 'failed');

    const dispatchDirectory = join(
      run.manifest.worktreePath,
      'workspace/evidence/dispatch',
    );
    const records = await Promise.all(
      (await readdir(dispatchDirectory)).map(async (name) =>
        JSON.parse(await readFile(join(dispatchDirectory, name), 'utf8')),
      ),
    );
    const failedPhaseLaunches = records.filter(
      (record) =>
        record.scope === 'p01' &&
        record.role === 'phase-implementer' &&
        record.action === 'implementation',
    );
    assert.equal(failedPhaseLaunches.length, 1);
    assert.equal(failedPhaseLaunches[0].launch.status, 'accepted');
    assert.equal(failedPhaseLaunches[0].launch.outcome, 'failed');
    assert.equal(
      records.some((record) => record.role === 'reviewer'),
      false,
    );
    await assert.rejects(
      () =>
        readdir(join(run.manifest.worktreePath, 'workspace/evidence/gates')),
      (error) => error?.code === 'ENOENT',
    );
    assert.equal(run.manifest.drive.status, 'failed');
    const recovery = await collectSmoke(
      { ...options, collectionMode: 'recovery' },
      context,
      {
        repository: run.reportRepository,
        runsDirectory: run.runsDirectory,
      },
    );
    const recoveredBundle = JSON.parse(
      await readFile(recovery.collected.outputPath, 'utf8'),
    );
    assert.equal(recovery.recovery.canonicalPublished, false);
    assert.equal(recovery.report.report.status, 'failed');
    assert.equal(recoveredBundle.dispatches.length, 1);
    assert.equal(recoveredBundle.dispatches[0].launch.outcome, 'failed');
    await assert.rejects(
      () => readdir(run.manifest.reportRoot),
      (error) => error?.code === 'ENOENT',
    );

    const latestManifest = JSON.parse(
      await readFile(run.manifest.manifestPath, 'utf8'),
    );
    await cleanupSmoke(latestManifest, {
      repository,
      runsDirectory: run.runsDirectory,
    });
    assert.equal(
      JSON.parse(await readFile(recovery.report.jsonPath, 'utf8')).status,
      'failed',
    );
    assert.deepEqual(
      (await readdir(run.runsDirectory)).filter((entry) =>
        entry.startsWith('smoke-'),
      ),
      [],
    );
    run.manifest = null;
  } finally {
    await cleanupRun(run);
  }
});

test('deterministic transition-order injection fails the production assertion', async () => {
  const run = await provisionDeterministicRun('plan-review');
  const inputPath = join(run.root, 'invalid-transition.json');
  const outputDirectory = join(run.root, 'transition-evidence');

  try {
    await writeFile(
      inputPath,
      `${JSON.stringify({
        commitSha: run.manifest.baselineCommitSha,
        event: 'state-transition',
        from: 'reviewed',
        schemaVersion: 1,
        sequence: 1,
        to: 'implementation-ready',
      })}\n`,
    );
    await writeStateTransitionRecord({
      inputPath,
      worktreePath: run.manifest.worktreePath,
    });
    const collected = await collectEvidence({
      manifestPath: run.manifest.manifestPath,
      outDirectory: outputDirectory,
      worktreePath: run.manifest.worktreePath,
    });
    const bundle = JSON.parse(await readFile(collected.outputPath, 'utf8'));
    const report = evaluateEvidence(bundle);
    assert.equal(report.status, 'failed');
    assert.equal(
      report.assertions.find(
        (entry) => entry.id === 'plan-review-state-transitions',
      )?.status,
      'failed',
    );
  } finally {
    await cleanupRun(run);
  }
});
