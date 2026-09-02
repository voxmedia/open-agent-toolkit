import assert from 'node:assert/strict';
import { execFile as execFileCallback } from 'node:child_process';
import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { promisify } from 'node:util';

import {
  continueSyncedArchiveCompletion,
  executeSyncedArchiveEntry,
} from '../scripts/execute-synced-archive-entry.mjs';
import {
  finalizeSyncedArchive,
  validateSyncedArchiveTerminalReport,
} from '../scripts/finalize-synced-archive.mjs';
import { parseSyncedArchiveResumeFields } from '../scripts/parse-synced-archive-resume-fields.mjs';
import { recoverArchivedRecapEvidenceReceipt } from '../scripts/recover-completion-receipts.mjs';
import { resolveSyncedArchiveEntry } from '../scripts/resolve-synced-archive-entry.mjs';

const execFile = promisify(execFileCallback);
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

async function git(cwd, ...args) {
  const result = await execFile('git', args, { cwd, encoding: 'utf8' });
  return result.stdout.trim();
}

async function createArchivedRecapEvidenceFixture({ pushEvidence }) {
  const root = await mkdtemp(join(tmpdir(), 'oat-archive-evidence-'));
  const repoRoot = join(root, 'repo');
  const remoteRoot = join(root, 'remote.git');
  await git(root, 'init', '--bare', remoteRoot);
  await git(root, 'init', repoRoot);
  await git(repoRoot, 'config', 'user.name', 'OAT Test');
  await git(repoRoot, 'config', 'user.email', 'oat@example.com');
  await git(repoRoot, 'checkout', '-b', 'completion');
  await git(repoRoot, 'remote', 'add', 'origin', remoteRoot);
  await writeFile(join(repoRoot, 'base.txt'), 'base\n');
  await git(repoRoot, 'add', 'base.txt');
  await git(repoRoot, 'commit', '-m', 'base');
  await git(repoRoot, 'push', '-u', 'origin', 'completion');

  const exportRoot = join(
    repoRoot,
    '.oat',
    'repo',
    'reference',
    'project-recaps',
    'demo',
    'final',
  );
  await mkdir(exportRoot, { recursive: true });
  await writeFile(join(exportRoot, 'manifest.json'), '{"stage":"archive"}\n');
  await writeFile(
    join(exportRoot, 'build-record.json'),
    '{"stage":"archive"}\n',
  );
  await git(repoRoot, 'add', '.oat/repo/reference/project-recaps');
  await git(repoRoot, 'commit', '-m', 'chore(oat): archive synced project');
  const lifecycleCommit = await git(repoRoot, 'rev-parse', 'HEAD');

  await writeFile(join(exportRoot, 'manifest.json'), '{"stage":"durable"}\n');
  await writeFile(
    join(exportRoot, 'build-record.json'),
    '{"stage":"durable"}\n',
  );
  await git(repoRoot, 'add', '.oat/repo/reference/project-recaps');
  await git(repoRoot, 'commit', '-m', 'chore(oat): attest final project recap');
  const evidenceCommit = await git(repoRoot, 'rev-parse', 'HEAD');
  if (pushEvidence) await git(repoRoot, 'push');

  return {
    root,
    repoRoot,
    exportRoot,
    lifecycleCommit,
    evidenceCommit,
    evidencePaths: [
      '.oat/repo/reference/project-recaps/demo/final/manifest.json',
      '.oat/repo/reference/project-recaps/demo/final/build-record.json',
    ],
  };
}

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

for (const pushEvidence of [false, true]) {
  test(`recordless recap retry recovers exact evidence ${pushEvidence ? 'after' : 'before'} push`, async () => {
    const fixture = await createArchivedRecapEvidenceFixture({ pushEvidence });
    try {
      const receipt = await recoverArchivedRecapEvidenceReceipt({
        repoRoot: fixture.repoRoot,
        lifecycleCommit: fixture.lifecycleCommit,
        evidencePaths: fixture.evidencePaths,
      });
      assert.deepEqual(receipt, {
        status: 'recovered',
        evidenceCommit: fixture.evidenceCommit,
        evidencePushRequired: !pushEvidence,
        evidencePaths: fixture.evidencePaths,
      });

      const headBefore = await git(fixture.repoRoot, 'rev-parse', 'HEAD');
      const projectPath = join(
        fixture.repoRoot,
        '.oat',
        'projects',
        'synced',
        'demo',
      );
      const result = await executeSyncedArchiveEntry({
        record: null,
        projectName: 'demo',
        projectPath,
        repoRoot: fixture.repoRoot,
        pullProject: async () => assert.fail('recordless retry must not pull'),
        runActiveWorkflowSteps: async () =>
          assert.fail('recordless retry must not replay active steps'),
        archiveProject: async () => ({
          status: 'ok',
          mode: 'apply',
          archivePath: '/archive/demo',
          snapshotId: baseRecord.archiveSnapshot,
          lifecycleCommit: fixture.lifecycleCommit,
          completedRef: 'refs/oat/completed/demo',
          verifiedSourceSha: sourceSha,
          activeAliasDisposition: 'removed',
          recordRetired: true,
          projectRecapExport: {
            sourceRunRoot: join(projectPath, 'explainers', 'final'),
            exportRoot: fixture.exportRoot,
            manifest: { relativePath: 'manifest.json' },
          },
        }),
        validateArchive: async ({ archiveReport, projectName }) =>
          validateSyncedArchiveTerminalReport(archiveReport, projectName),
      });
      const fields = parseSyncedArchiveResumeFields(result);
      assert.equal(fields.EVIDENCE_COMMIT, fixture.evidenceCommit);
      assert.equal(fields.EVIDENCE_PUSH_REQUIRED, String(!pushEvidence));
      assert.equal(fields.EXPORTED_MANIFEST_PATH, fixture.evidencePaths[0]);
      assert.equal(fields.EXPORTED_BUILD_RECORD_PATH, fixture.evidencePaths[1]);
      let attestationCount = 0;
      await continueSyncedArchiveCompletion({
        executionResult: result,
        finalizeLinks: async () => undefined,
        refreshDashboard: async () => undefined,
        attestRecap: async () => {
          attestationCount += 1;
        },
        pushBookkeeping: async (continuation) => {
          assert.equal(continuation.evidenceCommit, fixture.evidenceCommit);
          if (continuation.evidencePushRequired) {
            await git(fixture.repoRoot, 'push');
          }
          assert.equal(
            await git(fixture.repoRoot, 'rev-parse', '@{u}^{commit}'),
            fixture.evidenceCommit,
          );
        },
        closeoutPr: async () => undefined,
        clearPointer: async () => undefined,
        confirmCompletion: async () => undefined,
      });
      assert.equal(attestationCount, 0);
      assert.equal(
        await git(fixture.repoRoot, 'rev-parse', 'HEAD'),
        headBefore,
      );
    } finally {
      await rm(fixture.root, { recursive: true, force: true });
    }
  });
}

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
  let confirmationCount = 0;
  const executeRecordlessRetry = () =>
    executeSyncedArchiveEntry({
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

  const failedResult = await executeRecordlessRetry();
  await assert.rejects(
    continueSyncedArchiveCompletion({
      executionResult: failedResult,
      finalizeLinks: async () => undefined,
      refreshDashboard: async () => undefined,
      pushBookkeeping: async () => undefined,
      closeoutPr: async () => {
        throw new Error('injected tracked PR closeout failure');
      },
      clearPointer: async () => {
        clearCount += 1;
      },
      confirmCompletion: async () => {
        confirmationCount += 1;
      },
    }),
    /tracked PR closeout failure/,
  );
  assert.equal(clearCount, 0);
  assert.equal(confirmationCount, 0);

  const result = await executeRecordlessRetry();
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
    confirmCompletion: async () => {
      confirmationCount += 1;
    },
  });
  assert.equal(clearCount, 1);
  assert.equal(confirmationCount, 1);
});

test('recordless retry accepts an explicit null recap receipt without attestation', async () => {
  let attestationCount = 0;
  let closeoutCount = 0;
  const result = await executeSyncedArchiveEntry({
    record: null,
    projectName: 'demo',
    projectPath: '/missing/active/demo',
    repoRoot: '/repo',
    pullProject: async () => assert.fail('recordless retry must not pull'),
    runActiveWorkflowSteps: async () =>
      assert.fail('recordless retry must not replay active steps'),
    archiveProject: async (_projectPath, identity) => {
      assert.deepEqual(identity, { recordless: true });
      return {
        status: 'ok',
        mode: 'apply',
        archivePath: '/archive/demo',
        snapshotId: baseRecord.archiveSnapshot,
        lifecycleCommit: 'b'.repeat(40),
        completedRef: 'refs/oat/completed/demo',
        verifiedSourceSha: sourceSha,
        activeAliasDisposition: 'removed',
        recordRetired: true,
        projectRecapExport: null,
      };
    },
    validateArchive: async ({ archiveReport, projectName }) =>
      validateSyncedArchiveTerminalReport(archiveReport, projectName),
  });

  const fields = parseSyncedArchiveResumeFields(result);
  assert.equal(fields.SELECTED_PROJECT_RECAP_RUN, '');
  assert.equal(fields.PROJECT_RECAP_EXPORT_JSON, 'null');
  assert.equal(fields.EXPORTED_MANIFEST_PATH, '');
  assert.equal(fields.EXPORTED_BUILD_RECORD_PATH, '');
  assert.equal(fields.EVIDENCE_COMMIT, '');
  assert.equal(fields.EVIDENCE_PUSH_REQUIRED, 'false');

  await continueSyncedArchiveCompletion({
    executionResult: result,
    finalizeLinks: async () => undefined,
    refreshDashboard: async () => undefined,
    attestRecap: async () => {
      attestationCount += 1;
    },
    pushBookkeeping: async (continuation) => {
      assert.equal(continuation.selectedProjectRecapRun, '');
      assert.equal(continuation.projectRecapExport, null);
      assert.equal(continuation.exportedManifestPath, '');
      assert.equal(continuation.exportedBuildRecordPath, '');
      assert.equal(continuation.evidenceCommit, '');
    },
    closeoutPr: async () => {
      closeoutCount += 1;
    },
    clearPointer: async () => undefined,
    confirmCompletion: async () => undefined,
  });
  assert.equal(attestationCount, 0);
  assert.equal(closeoutCount, 1);
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

test('skill reuses recovered recap evidence and fails closed on tracked PR closeout', async () => {
  const guidance = await readFile(
    new URL('../SKILL.md', import.meta.url),
    'utf8',
  );
  const recoveredEvidence = guidance.indexOf(
    'synced archive-resume executor restored `EVIDENCE_COMMIT`',
  );
  const exactUpstream = guidance.indexOf(
    'BOOKKEEPING_UPSTREAM_COMMIT',
    recoveredEvidence,
  );
  const prCloseout = guidance.indexOf('### Step 11.5:', exactUpstream);
  const missingGh = guidance.indexOf('if ! command -v gh', prCloseout);
  const failedEdit = guidance.indexOf('elif ! gh pr edit', missingGh);
  const finalConfirmation = guidance.indexOf(
    '### Step 12: Confirm to User',
    failedEdit,
  );
  const closeoutBranch = guidance.slice(missingGh, finalConfirmation);
  assert.ok(recoveredEvidence > 0);
  assert.ok(exactUpstream > recoveredEvidence);
  assert.ok(prCloseout > exactUpstream);
  assert.ok(missingGh > prCloseout);
  assert.ok(failedEdit > missingGh);
  assert.ok(finalConfirmation > failedEdit);
  assert.match(closeoutBranch, /PROJECT_SCOPE.*synced/s);
  assert.match(closeoutBranch, /SHOULD_ARCHIVE.*true/s);
  assert.equal(closeoutBranch.match(/exit 1/g)?.length, 2);
});
