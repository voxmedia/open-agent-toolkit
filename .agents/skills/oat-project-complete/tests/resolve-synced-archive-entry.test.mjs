import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

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

test('skill entry resolves terminal retry before deciding whether to pull', async () => {
  const guidance = await readFile(
    new URL('../SKILL.md', import.meta.url),
    'utf8',
  );
  const router = guidance.indexOf('resolve-synced-archive-entry.mjs');
  const pull = guidance.indexOf('oat project pull "$PROJECT_PATH"', router);
  assert.ok(router > 0);
  assert.ok(pull > router);
});
