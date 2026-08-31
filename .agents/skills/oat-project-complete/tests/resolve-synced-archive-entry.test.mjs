import assert from 'node:assert/strict';
import { access, mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import {
  continueSyncedArchiveCompletion,
  executeSyncedArchiveEntry,
} from '../scripts/execute-synced-archive-entry.mjs';
import {
  finalizeSyncedArchive,
  validateSyncedArchiveTerminalReport,
} from '../scripts/finalize-synced-archive.mjs';
import { parseSyncedArchiveResumeFields } from '../scripts/parse-synced-archive-resume-fields.mjs';
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
    let linkCount = 0;
    let refreshCount = 0;
    let pushCount = 0;
    let prCloseoutCount = 0;
    let confirmationCount = 0;
    const downstreamOrder = [];
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
        validateArchive: async ({ archiveReport, projectName }) =>
          validateSyncedArchiveTerminalReport(archiveReport, projectName),
      });

      assert.equal(result.route, 'archive-resumed');
      assert.equal(result.terminal, true);
      assert.equal(result.skippedActiveSteps, true);
      assert.equal(pullCount, 0);
      assert.equal(activeStepCount, 0);
      assert.equal(archiveCount, 1);
      assert.equal(clearCount, 0);
      const resumeFields = parseSyncedArchiveResumeFields(result);
      assert.equal(resumeFields.ARCHIVE_PATH, '/archive/demo');
      assert.equal(resumeFields.LIFECYCLE_COMMIT, 'b'.repeat(40));
      assert.equal(resumeFields.SHOULD_ARCHIVE, 'true');

      const completion = await continueSyncedArchiveCompletion({
        executionResult: result,
        finalizeLinks: async () => {
          downstreamOrder.push('links');
          linkCount += 1;
        },
        refreshDashboard: async () => {
          downstreamOrder.push('refresh');
          refreshCount += 1;
        },
        pushBookkeeping: async (continuation) => {
          assert.equal(continuation.lifecycleCommit, 'b'.repeat(40));
          downstreamOrder.push('push');
          pushCount += 1;
        },
        closeoutPr: async () => {
          downstreamOrder.push('pr');
          prCloseoutCount += 1;
        },
        clearPointer: async (archiveReport) => {
          downstreamOrder.push('clear');
          await finalizeSyncedArchive({
            projectName: 'demo',
            getArchiveReport: async () => archiveReport,
            clearActiveProject: async () => {
              clearCount += 1;
            },
          });
        },
        confirmCompletion: async () => {
          downstreamOrder.push('confirm');
          confirmationCount += 1;
        },
      });
      assert.equal(completion.route, 'completion-confirmed');
      assert.equal(linkCount, 1);
      assert.equal(refreshCount, 1);
      assert.equal(pushCount, 1);
      assert.equal(prCloseoutCount, 1);
      assert.equal(clearCount, 1);
      assert.equal(confirmationCount, 1);
      assert.deepEqual(downstreamOrder, [
        'links',
        'refresh',
        'push',
        'pr',
        'clear',
        'confirm',
      ]);
    } finally {
      await rm(repoRoot, { recursive: true, force: true });
    }
  });
}

test('post-archive link failure retains the pointer before bookkeeping push and confirmation', async () => {
  let clearCount = 0;
  let pushCount = 0;
  let confirmationCount = 0;
  await assert.rejects(
    continueSyncedArchiveCompletion({
      executionResult: {
        status: 'ok',
        route: 'archive-resumed',
        terminal: true,
        terminalReceiptValidated: true,
        archiveReport: {},
        continuation: {
          required: true,
          lifecycleCommit: 'b'.repeat(40),
        },
      },
      finalizeLinks: async () => {
        throw new Error('injected final-link failure');
      },
      refreshDashboard: async () => undefined,
      pushBookkeeping: async () => {
        pushCount += 1;
      },
      closeoutPr: async () => undefined,
      clearPointer: async () => {
        clearCount += 1;
      },
      confirmCompletion: async () => {
        confirmationCount += 1;
      },
    }),
    /injected final-link failure/,
  );
  assert.equal(clearCount, 0);
  assert.equal(pushCount, 0);
  assert.equal(confirmationCount, 0);
});

test('recordless retry resumes the same archive and completes downstream closeout without active steps', async () => {
  const archiveReport = {
    status: 'ok',
    mode: 'apply',
    archivePath: '/archive/demo',
    snapshotId: baseRecord.archiveSnapshot,
    lifecycleCommit: 'b'.repeat(40),
    completedRef: 'refs/oat/completed/demo',
    verifiedSourceSha: sourceSha,
    activeAliasDisposition: 'removed',
    recordRetired: true,
  };
  let pullCount = 0;
  let activeStepCount = 0;
  let clearCount = 0;
  const result = await executeSyncedArchiveEntry({
    record: null,
    projectName: 'demo',
    projectPath: '/missing/active/demo',
    repoRoot: '/repo',
    pullProject: async () => {
      pullCount += 1;
    },
    runActiveWorkflowSteps: async () => {
      activeStepCount += 1;
    },
    archiveProject: async (_projectPath, identity) => {
      assert.deepEqual(identity, { recordless: true });
      return archiveReport;
    },
    validateArchive: async ({ archiveReport: received, projectName }) =>
      validateSyncedArchiveTerminalReport(received, projectName),
  });

  assert.equal(result.archiveSnapshot, baseRecord.archiveSnapshot);
  assert.equal(pullCount, 0);
  assert.equal(activeStepCount, 0);
  await continueSyncedArchiveCompletion({
    executionResult: result,
    finalizeLinks: async () => undefined,
    refreshDashboard: async () => undefined,
    pushBookkeeping: async () => undefined,
    closeoutPr: async () => undefined,
    clearPointer: async (received) => {
      await finalizeSyncedArchive({
        projectName: 'demo',
        getArchiveReport: async () => received,
        clearActiveProject: async () => {
          clearCount += 1;
        },
      });
    },
    confirmCompletion: async () => undefined,
  });
  assert.equal(clearCount, 1);
});

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

test('skill defers synced archive pointer clearing until post-archive closeout', async () => {
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
  const bookkeepingPush = guidance.indexOf(
    'Completion bookkeeping pushed:',
    recapValidation,
  );
  const finalConfirmation = guidance.indexOf(
    '### Step 12: Confirm to User',
    bookkeepingPush,
  );
  const deferredClear = guidance.indexOf(
    'Synced archive terminal receipt verified; active project pointer cleared.',
    finalConfirmation,
  );
  assert.ok(archiveStep > 0);
  assert.ok(terminalValidation > archiveStep);
  assert.ok(recapValidation > terminalValidation);
  assert.ok(bookkeepingPush > recapValidation);
  assert.ok(finalConfirmation > bookkeepingPush);
  assert.ok(deferredClear > finalConfirmation);
});

test('skill entry skips active steps and rejoins the post-archive workflow', async () => {
  const guidance = await readFile(
    new URL('../SKILL.md', import.meta.url),
    'utf8',
  );
  const executor = guidance.indexOf('execute-synced-archive-entry.mjs');
  const terminalRoute = guidance.indexOf(
    'SYNCED_ARCHIVE_ENTRY_ROUTE" == "archive-resumed"',
    executor,
  );
  const resumeInstruction = guidance.indexOf(
    'continuing at Step 8.5',
    terminalRoute,
  );
  const stepTwo = guidance.indexOf('### Step 2:', resumeInstruction);
  const rejoin = guidance.indexOf('This is the explicit rejoin point', stepTwo);
  const finalLinks = guidance.indexOf('#### Step 8.6:', rejoin);
  const bookkeepingPush = guidance.indexOf(
    'Completion bookkeeping pushed:',
    finalLinks,
  );
  const finalConfirmation = guidance.indexOf(
    '### Step 12: Confirm to User',
    bookkeepingPush,
  );
  const activeBranch = guidance.slice(terminalRoute, stepTwo);
  assert.ok(executor > 0);
  assert.ok(terminalRoute > executor);
  assert.ok(resumeInstruction > terminalRoute);
  assert.ok(stepTwo > resumeInstruction);
  assert.ok(rejoin > stepTwo);
  assert.ok(finalLinks > rejoin);
  assert.ok(bookkeepingPush > finalLinks);
  assert.ok(finalConfirmation > bookkeepingPush);
  assert.doesNotMatch(activeBranch, /exit 0/);
});
