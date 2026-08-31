import assert from 'node:assert/strict';
import { access, mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import { executeSyncedArchiveEntry } from '../scripts/execute-synced-archive-entry.mjs';
import { finalizeSyncedArchive } from '../scripts/finalize-synced-archive.mjs';
import { resolveSyncedArchiveEntry } from '../scripts/resolve-synced-archive-entry.mjs';

const sourceSha = 'a'.repeat(40);
const baseRecord = {
  schemaVersion: 1,
  slug: 'demo',
  scope: 'synced',
  ref: 'refs/oat/projects/demo',
  remote: 'origin',
  status: 'active',
  archiveSnapshot: '20260831-demo',
  archiveSourceRefSha: sourceSha,
};

test('routes a retained-record terminal interruption directly to archive resume', async () => {
  const result = await resolveSyncedArchiveEntry({
    record: baseRecord,
    projectName: 'demo',
    repoRoot: '/repo',
    probeRefs: async () => ({
      activeSha: sourceSha,
      completedSha: sourceSha,
    }),
  });
  assert.deepEqual(result, {
    status: 'ok',
    route: 'archive-resume',
    terminal: true,
    archiveSnapshot: '20260831-demo',
    verifiedSourceSha: sourceSha,
    completedRef: 'refs/oat/completed/demo',
    activeAliasDisposition: 'retained',
  });
});

test('keeps an ordinary active synced project on the pull route', async () => {
  const result = await resolveSyncedArchiveEntry({
    record: {
      ...baseRecord,
      archiveSnapshot: undefined,
      archiveSourceRefSha: undefined,
    },
    projectName: 'demo',
    repoRoot: '/repo',
  });
  assert.deepEqual(result, { status: 'ok', route: 'pull', terminal: false });
});

test('rejects a persisted identity whose completed ref differs', async () => {
  await assert.rejects(
    resolveSyncedArchiveEntry({
      record: baseRecord,
      projectName: 'demo',
      repoRoot: '/repo',
      probeRefs: async () => ({
        activeSha: sourceSha,
        completedSha: 'b'.repeat(40),
      }),
    }),
    /does not match the authoritative terminal refs/i,
  );
});

for (const [checkoutState, activeSha] of [
  ['present after ref retirement', sourceSha],
  ['absent after checkout removal', null],
]) {
  test(`executes terminal archive resume with checkout ${checkoutState} without replaying active steps`, async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'oat-archive-resume-'));
    const projectPath = join(repoRoot, 'demo');
    if (checkoutState.startsWith('present')) {
      await mkdir(projectPath);
    }
    let pullCount = 0;
    let activeStepCount = 0;
    let archiveCount = 0;
    let clearCount = 0;
    try {
      const result = await executeSyncedArchiveEntry({
        record: baseRecord,
        projectName: 'demo',
        projectPath,
        repoRoot,
        probeRefs: async () => ({ activeSha, completedSha: sourceSha }),
        pullProject: async () => {
          pullCount += 1;
        },
        runActiveWorkflowSteps: async () => {
          activeStepCount += 1;
        },
        archiveProject: async (receivedPath, persistedIdentity) => {
          archiveCount += 1;
          assert.equal(receivedPath, projectPath);
          assert.deepEqual(persistedIdentity, {
            archiveSnapshot: baseRecord.archiveSnapshot,
            verifiedSourceSha: sourceSha,
          });
          if (checkoutState.startsWith('present')) {
            await access(projectPath);
          } else {
            await assert.rejects(access(projectPath));
          }
          return {
            status: 'ok',
            mode: 'apply',
            archivePath: '/archive/demo',
            snapshotId: baseRecord.archiveSnapshot,
            lifecycleCommit: 'b'.repeat(40),
            completedRef: 'refs/oat/completed/demo',
            verifiedSourceSha: sourceSha,
            activeAliasDisposition: activeSha === null ? 'removed' : 'retained',
            recordRetired: true,
          };
        },
        finalizeArchive: async ({ archiveReport, projectName }) =>
          finalizeSyncedArchive({
            projectName,
            getArchiveReport: async () => archiveReport,
            clearActiveProject: async () => {
              clearCount += 1;
            },
          }),
      });

      assert.equal(result.route, 'archive-resumed');
      assert.equal(result.terminal, true);
      assert.equal(result.skippedActiveSteps, true);
      assert.equal(pullCount, 0);
      assert.equal(activeStepCount, 0);
      assert.equal(archiveCount, 1);
      assert.equal(clearCount, 1);
    } finally {
      await rm(repoRoot, { recursive: true, force: true });
    }
  });
}

test('retains the active pointer when the synced archive attempt fails', async () => {
  let clearCount = 0;
  await assert.rejects(
    finalizeSyncedArchive({
      projectName: 'demo',
      getArchiveReport: async () => {
        throw new Error('configured S3 sync failed');
      },
      clearActiveProject: async () => {
        clearCount += 1;
      },
    }),
    /configured S3 sync failed/i,
  );
  assert.equal(clearCount, 0);
});

test('clears the active pointer only after a verified terminal report', async () => {
  let clearCount = 0;
  const result = await finalizeSyncedArchive({
    projectName: 'demo',
    getArchiveReport: async () => ({
      status: 'ok',
      mode: 'apply',
      archivePath: '/archive/demo',
      lifecycleCommit: 'b'.repeat(40),
      completedRef: 'refs/oat/completed/demo',
      verifiedSourceSha: sourceSha,
      activeAliasDisposition: 'removed',
      recordRetired: true,
    }),
    clearActiveProject: async () => {
      clearCount += 1;
    },
  });
  assert.equal(clearCount, 1);
  assert.equal(result.pointerCleared, true);
});

test('skill defers synced archive pointer clearing until terminal report validation', async () => {
  const guidance = await readFile(
    new URL('../SKILL.md', import.meta.url),
    'utf8',
  );
  const archiveStep = guidance.indexOf('### Step 8: Archive Project');
  const terminalValidation = guidance.indexOf(
    '`recordRetired` to be exactly `true`',
    archiveStep,
  );
  const recapValidation = guidance.indexOf(
    'When `SELECTED_PROJECT_RECAP_RUN` is non-empty',
    terminalValidation,
  );
  const deferredClear = guidance.indexOf(
    'Synced archive terminal receipt verified; active project pointer cleared.',
    recapValidation,
  );
  assert.ok(archiveStep > 0);
  assert.ok(terminalValidation > archiveStep);
  assert.ok(recapValidation > terminalValidation);
  assert.ok(deferredClear > recapValidation);
});

test('skill entry exits terminal archive resume before Step 2', async () => {
  const guidance = await readFile(
    new URL('../SKILL.md', import.meta.url),
    'utf8',
  );
  const executor = guidance.indexOf('execute-synced-archive-entry.mjs');
  const terminalRoute = guidance.indexOf(
    'SYNCED_ARCHIVE_ENTRY_ROUTE" == "archive-resumed"',
    executor,
  );
  const earlyExit = guidance.indexOf('exit 0', terminalRoute);
  const stepTwo = guidance.indexOf('### Step 2:', earlyExit);
  assert.ok(executor > 0);
  assert.ok(terminalRoute > executor);
  assert.ok(earlyExit > terminalRoute);
  assert.ok(stepTwo > earlyExit);
});
