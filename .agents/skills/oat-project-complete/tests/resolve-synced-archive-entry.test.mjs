import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
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
const lifecycleCommit = 'b'.repeat(40);
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

function archiveReport(overrides = {}) {
  return {
    status: 'ok',
    mode: 'apply',
    archivePath: '/archive/demo',
    snapshotId: baseRecord.archiveSnapshot,
    lifecycleCommit,
    completedRef: 'refs/oat/completed/demo',
    verifiedSourceSha: sourceSha,
    activeAliasDisposition: 'removed',
    recordRetired: true,
    ...overrides,
  };
}

test('routes a retained terminal record directly to archive resume', async () => {
  const result = await resolveSyncedArchiveEntry({
    record: baseRecord,
    projectName: 'demo',
    repoRoot: '/repo',
    probeRefs: async () => ({
      activeSha: sourceSha,
      completedSha: sourceSha,
    }),
  });
  assert.equal(result.route, 'archive-resume');
  assert.equal(result.terminal, true);
  assert.equal(result.verifiedSourceSha, sourceSha);
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
        completedSha: 'c'.repeat(40),
      }),
    }),
    /does not match the authoritative terminal refs/i,
  );
});

test('archive continuation carries only the exported manifest receipt', async () => {
  const projectPath = '/repo/.oat/projects/synced/demo';
  const result = await executeSyncedArchiveEntry({
    record: null,
    projectName: 'demo',
    projectPath,
    repoRoot: '/repo',
    pullProject: async () => assert.fail('resume must not pull'),
    runActiveWorkflowSteps: async () =>
      assert.fail('resume must not replay active steps'),
    archiveProject: async () =>
      archiveReport({
        projectRecapExport: {
          sourceRunRoot: `${projectPath}/explainers/final`,
          exportRoot: '/repo/.oat/repo/reference/project-recaps/demo/final',
          manifest: { relativePath: 'manifest.json' },
        },
      }),
    validateArchive: async ({ archiveReport: value, projectName }) =>
      validateSyncedArchiveTerminalReport(value, projectName),
  });

  assert.deepEqual(
    Object.keys(result.continuation).sort(),
    [
      'archivePath',
      'exportedManifestPath',
      'exportedPagePath',
      'lifecycleCommit',
      'projectRecapExport',
      'rejoinStep',
      'required',
      's3Path',
      'selectedProjectRecapRun',
      'summaryExportFile',
    ].sort(),
  );
  const fields = parseSyncedArchiveResumeFields(result);
  assert.equal(
    fields.EXPORTED_MANIFEST_PATH,
    '.oat/repo/reference/project-recaps/demo/final/manifest.json',
  );
  assert.equal(fields.SELECTED_PROJECT_RECAP_RUN, 'explainers/final');
  assert.equal('EVIDENCE_COMMIT' in fields, false);
});

test('resume parser rejects retired evidence fields as unknown continuation state', () => {
  const result = {
    status: 'ok',
    route: 'archive-resumed',
    terminal: true,
    skippedActiveSteps: true,
    terminalReceiptValidated: true,
    archiveReport: archiveReport(),
    continuation: {
      required: true,
      rejoinStep: '8.5',
      archivePath: '/archive/demo',
      lifecycleCommit,
      projectRecapExport: null,
      selectedProjectRecapRun: '',
      exportedManifestPath: '',
      evidenceCommit: 'c'.repeat(40),
    },
  };
  assert.throws(
    () => parseSyncedArchiveResumeFields(result),
    /no verified post-archive continuation/,
  );
});

test('post-archive continuation has no recap attestation stage', async () => {
  const downstreamOrder = [];
  await continueSyncedArchiveCompletion({
    executionResult: {
      status: 'ok',
      route: 'archive-resumed',
      terminal: true,
      terminalReceiptValidated: true,
      archiveReport: archiveReport(),
      continuation: {
        required: true,
        lifecycleCommit,
      },
    },
    finalizeLinks: async () => downstreamOrder.push('links'),
    refreshDashboard: async () => downstreamOrder.push('refresh'),
    pushBookkeeping: async () => downstreamOrder.push('push'),
    closeoutPr: async () => downstreamOrder.push('pr'),
    clearPointer: async () => downstreamOrder.push('clear'),
    confirmCompletion: async () => downstreamOrder.push('confirm'),
  });
  assert.deepEqual(downstreamOrder, [
    'links',
    'refresh',
    'push',
    'pr',
    'clear',
    'confirm',
  ]);
});

test('post-archive failure retains the pointer before push and confirmation', async () => {
  let clearCount = 0;
  let pushCount = 0;
  await assert.rejects(
    continueSyncedArchiveCompletion({
      executionResult: {
        status: 'ok',
        route: 'archive-resumed',
        terminal: true,
        terminalReceiptValidated: true,
        archiveReport: archiveReport(),
        continuation: { required: true, lifecycleCommit },
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
      confirmCompletion: async () => undefined,
    }),
    /injected final-link failure/,
  );
  assert.equal(clearCount, 0);
  assert.equal(pushCount, 0);
});

test('finalizer clears the active pointer only after a verified report', async () => {
  let clearCount = 0;
  const result = await finalizeSyncedArchive({
    projectName: 'demo',
    getArchiveReport: async () => archiveReport(),
    clearActiveProject: async () => {
      clearCount += 1;
    },
  });
  assert.equal(clearCount, 1);
  assert.equal(result.pointerCleared, true);
});

test('skill keeps the synced archive resume route and one bookkeeping push', async () => {
  const guidance = await readFile(
    new URL('../SKILL.md', import.meta.url),
    'utf8',
  );
  const executor = guidance.indexOf('execute-synced-archive-entry.mjs');
  const terminalRoute = guidance.indexOf(
    'SYNCED_ARCHIVE_ENTRY_ROUTE" == "archive-resumed"',
    executor,
  );
  const rejoin = guidance.indexOf(
    'This is the explicit rejoin point',
    terminalRoute,
  );
  const bookkeeping = guidance.indexOf(
    '### Step 10: Commit + Push Bookkeeping',
    rejoin,
  );
  const confirmation = guidance.indexOf(
    '### Step 12: Confirm to User',
    bookkeeping,
  );
  assert.ok(executor > 0);
  assert.ok(terminalRoute > executor);
  assert.ok(rejoin > terminalRoute);
  assert.ok(bookkeeping > rejoin);
  assert.ok(confirmation > bookkeeping);
  assert.doesNotMatch(guidance, /EVIDENCE_COMMIT|attest final project recap/);
});

// The package is the existing p01 v2-package controlled fixture. The archive producer
// computes the recap report; terminal lifecycle metadata is a controlled seam.
// Full public CLI first-pass/recordless retry acceptance is recorded separately
// in the repeatable t02-real-producer probe using preserved Wave4 package bytes
// and actual local Git receipts. This fixture is not an original package capture.
test('consumes producer JSON flat-page identity and rejects mismatched continuation receipts', async () => {
  const { archiveProjectOnCompletion } =
    await import('../../../../packages/cli/dist/commands/project/archive/archive-utils.js');
  const repoRoot = await mkdtemp(join(tmpdir(), 'oat-flat-resume-'));
  try {
    const projectPath = join(repoRoot, '.oat/projects/shared/demo');
    const run = 'explainers/captured';
    await mkdir(join(projectPath, 'explainers'), { recursive: true });
    await cp(
      new URL(
        '../../../../packages/cli/src/commands/project/archive/fixtures/v2-package/',
        import.meta.url,
      ),
      join(projectPath, run),
      { recursive: true },
    );
    const produced = await archiveProjectOnCompletion(
      {
        repoRoot,
        projectPath,
        projectName: 'demo',
        projectsRoot: '.oat/projects/shared',
        projectRecapRun: run,
        s3SyncOnComplete: false,
      },
      { timestamp: () => '2026-08-31T00:00:00Z' },
    );
    const report = JSON.parse(
      JSON.stringify(
        archiveReport({
          ...produced,
          snapshotId: '20260831-demo',
          lifecycleCommit,
          completedRef: 'refs/oat/completed/demo',
          verifiedSourceSha: sourceSha,
          activeAliasDisposition: 'removed',
          recordRetired: true,
        }),
      ),
    );
    const consume = (value) =>
      executeSyncedArchiveEntry({
        record: null,
        projectName: 'demo',
        projectPath,
        repoRoot,
        archiveProject: async () => value,
        validateArchive: async ({ archiveReport: receipt }) =>
          validateSyncedArchiveTerminalReport(receipt, 'demo'),
      });
    for (const root of [
      produced.projectRecapExport.sourceRunRoot,
      join(produced.archivePath, run),
    ]) {
      report.projectRecapExport.sourceRunRoot = root;
      const result = await consume(report);
      const fields = parseSyncedArchiveResumeFields(
        JSON.parse(JSON.stringify(result)),
      );
      assert.equal(
        fields.EXPORTED_PAGE_PATH,
        '.oat/repo/reference/project-recaps/20260831-demo.html',
      );
      assert.equal(fields.EXPORTED_MANIFEST_PATH, '');
      for (const field of [
        'runId',
        'sourceRelativePath',
        'originalSha256',
        'exportedSha256',
      ]) {
        const bad = structuredClone(report);
        if (field === 'runId') bad.projectRecapExport.runId = 'foreign';
        else
          bad.projectRecapExport.page[field] =
            field === 'sourceRelativePath'
              ? 'site/foreign.html'
              : `sha256:${'0'.repeat(64)}`;
        await assert.rejects(consume(bad), /identity failed/);
        const saved = structuredClone(result);
        saved.continuation.projectRecapExport = bad.projectRecapExport;
        assert.throws(
          () => parseSyncedArchiveResumeFields(saved),
          /no verified/,
        );
      }
    }
    await writeFile(produced.projectRecapExport.exportRoot, 'foreign page');
    await assert.rejects(consume(report), /identity failed/);
  } finally {
    await rm(repoRoot, { recursive: true, force: true });
  }
});
