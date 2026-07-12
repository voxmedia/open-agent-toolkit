import assert from 'node:assert/strict';
import {
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
  DispatchRecordError,
  normalizeDispatchRecord,
  normalizeStateTransitionRecord,
  writeDispatchRecord,
  writeStateTransitionRecord,
} from './record.mjs';

function validRecord(overrides = {}) {
  return {
    action: 'implementation',
    attempt: 1,
    configuredInvocation: {
      candidateTier: 'balanced',
      ceiling: 'gpt-5.6-sol-xhigh',
      ceilingEffortAxis: 'not-applicable',
      ceilingModelAxis: 'selected:gpt-5.6-sol-xhigh',
      effortAxis: 'not-applicable',
      modelAxis: 'selected:gpt-5.6-terra-medium',
      policy: 'high',
      target: 'gpt-5.6-terra-medium',
    },
    launch: {
      mechanism: 'cursor-cli',
      outcome: 'completed',
      status: 'accepted',
    },
    role: 'implementer',
    runtimeIdentity: null,
    schemaVersion: 1,
    scope: 'p01-t01',
    selection: {
      atOrBelowCeiling: true,
      candidatesConsidered: ['gpt-5.6-terra-medium', 'gpt-5.6-sol-xhigh'],
      reason: 'native-catalog-unsatisfying',
    },
    ...overrides,
  };
}

test('normalizes a launcher-owned dispatch record', () => {
  const record = normalizeDispatchRecord(validRecord());
  assert.equal(record.launch.accepted, true);
  assert.equal(record.launch.status, 'accepted');
  assert.equal(record.attempt, 1);
  assert.deepEqual(record.selection.candidatesConsidered, [
    'gpt-5.6-terra-medium',
    'gpt-5.6-sol-xhigh',
  ]);
});

test('writes immutable attempt files and rejects duplicate attempts', async () => {
  const root = await mkdtemp(join(tmpdir(), 'oat-dispatch-record-'));
  const worktreePath = join(root, 'worktree');
  const inputPath = join(root, 'record.json');
  await mkdir(worktreePath);
  await writeFile(inputPath, JSON.stringify(validRecord()));

  try {
    const targetPath = await writeDispatchRecord({
      inputPath,
      worktreePath,
    });
    assert.equal(
      targetPath,
      join(
        await realpath(worktreePath),
        'workspace/evidence/dispatch/p01-t01-001.json',
      ),
    );
    assert.equal(
      JSON.parse(await readFile(targetPath, 'utf8')).launch.accepted,
      true,
    );
    await assert.rejects(
      () => writeDispatchRecord({ inputPath, worktreePath }),
      DispatchRecordError,
    );
  } finally {
    await rm(root, { force: true, recursive: true });
  }
});

test('rejects inconsistent, unsupported, or incomplete records', () => {
  assert.throws(
    () =>
      normalizeDispatchRecord(
        validRecord({
          launch: {
            mechanism: 'cursor-cli',
            outcome: 'completed',
            status: 'pre-start-rejected',
          },
        }),
      ),
    /inconsistent/,
  );
  assert.throws(
    () => normalizeDispatchRecord(validRecord({ scope: '../escape' })),
    /Invalid dispatch scope/,
  );
  assert.throws(
    () =>
      normalizeDispatchRecord(
        validRecord({
          selection: {
            atOrBelowCeiling: true,
            candidatesConsidered: [],
            reason: 'fallback',
          },
        }),
      ),
    /Invalid selection reason/,
  );
  assert.throws(
    () =>
      normalizeDispatchRecord(
        validRecord({
          selection: {
            atOrBelowCeiling: true,
            candidatesConsidered: ['gate-reviewer'],
            reason: 'gate-target',
          },
        }),
      ),
    /Invalid selection reason: gate-target/,
  );
});

test('writes commit-bound state transition evidence', async () => {
  const root = await mkdtemp(join(tmpdir(), 'oat-transition-record-'));
  const worktreePath = join(root, 'worktree');
  const inputPath = join(root, 'transition.json');
  await mkdir(worktreePath);
  const record = {
    commitSha: 'a'.repeat(40),
    event: 'state-transition',
    from: 'reviewed',
    schemaVersion: 1,
    sequence: 2,
    to: 'implementation-ready',
  };
  await writeFile(inputPath, JSON.stringify(record));

  try {
    assert.deepEqual(normalizeStateTransitionRecord(record), record);
    const targetPath = await writeStateTransitionRecord({
      inputPath,
      worktreePath,
    });
    assert.equal(
      targetPath,
      join(
        await realpath(worktreePath),
        'workspace/evidence/orchestration/002-state-transition.json',
      ),
    );
    assert.deepEqual(JSON.parse(await readFile(targetPath, 'utf8')), record);
  } finally {
    await rm(root, { force: true, recursive: true });
  }
});
