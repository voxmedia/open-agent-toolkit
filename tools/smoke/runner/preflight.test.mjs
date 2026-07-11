import assert from 'node:assert/strict';
import { mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
  PreflightError,
  formatReadinessReport,
  runPreflight,
} from './preflight.mjs';
import { runSmoke } from './run-smoke.mjs';

const harnesses = ['codex', 'claude', 'cursor-ide', 'cursor-cli'];

function readyProbes(overrides = {}) {
  return {
    auth: async (harness) => ({
      command: `${harness} auth status`,
      result: 'authenticated',
    }),
    fixture: async () => ({ result: 'valid' }),
    oat: async () => ({
      globalPath: '/repo/packages/cli/dist/index.js',
      localPath: '/repo/packages/cli/dist/index.js',
      result: 'local',
    }),
    runtime: async (harness) => ({
      command: `${harness} --version`,
      result: 'installed',
    }),
    ...overrides,
  };
}

async function assertNoFilesCreated(action) {
  const directory = await mkdtemp(join(tmpdir(), 'oat-smoke-preflight-'));

  try {
    await action(directory);
    assert.deepEqual(await readdir(directory), []);
  } finally {
    await rm(directory, { force: true, recursive: true });
  }
}

test('reports installed and authenticated readiness for every distinct harness', async () => {
  const report = await runPreflight(
    { harness: 'codex' },
    { probes: readyProbes() },
  );

  assert.equal(report.status, 'ready');
  assert.deepEqual(Object.keys(report.harnesses), harnesses);
  for (const harness of harnesses) {
    assert.equal(report.harnesses[harness].installed.result, 'installed');
    assert.equal(
      report.harnesses[harness].authenticated.result,
      'authenticated',
    );
    assert.match(report.harnesses[harness].installed.command, /--version$/);
    assert.match(
      report.harnesses[harness].authenticated.command,
      /auth status$/,
    );
  }
});

test('fails closed for an unavailable selected harness without creating files', async () => {
  await assertNoFilesCreated(async () => {
    await assert.rejects(
      () =>
        runPreflight(
          { harness: 'claude' },
          {
            probes: readyProbes({
              runtime: async (harness) => ({
                command: `${harness} --version`,
                result: harness === 'claude' ? 'unavailable' : 'installed',
              }),
            }),
          },
        ),
      PreflightError,
    );
  });
});

test('fails closed for an installed but unauthenticated selected harness', async () => {
  await assertNoFilesCreated(async () => {
    await assert.rejects(
      () =>
        runPreflight(
          { harness: 'cursor-cli' },
          {
            probes: readyProbes({
              auth: async (harness) => ({
                command: `${harness} auth status`,
                result:
                  harness === 'cursor-cli'
                    ? 'unauthenticated'
                    : 'authenticated',
              }),
            }),
          },
        ),
      PreflightError,
    );
  });
});

test('fails closed when a stale global oat shadows the repository build', async () => {
  await assertNoFilesCreated(async () => {
    await assert.rejects(
      () =>
        runPreflight(
          { harness: 'codex' },
          {
            probes: readyProbes({
              oat: async () => ({
                globalPath: '/usr/local/bin/oat',
                localPath: '/repo/packages/cli/dist/index.js',
                result: 'stale-global',
              }),
            }),
          },
        ),
      PreflightError,
    );
  });
});

test('fails closed for an invalid fixture before provisioning', async () => {
  await assertNoFilesCreated(async () => {
    await assert.rejects(
      () =>
        runPreflight(
          { harness: 'codex' },
          {
            probes: readyProbes({
              fixture: async () => ({
                reason: 'fixture project plan is missing',
                result: 'invalid',
              }),
            }),
          },
        ),
      PreflightError,
    );
  });
});

test('scopes forced unavailability to exactly the named harness', async () => {
  const report = await runPreflight(
    { harness: 'codex' },
    {
      env: { OAT_SMOKE_FORCE_UNAVAILABLE: 'cursor-ide' },
      probes: readyProbes(),
    },
  );

  assert.equal(report.harnesses['cursor-ide'].installed.result, 'unavailable');
  assert.equal(report.harnesses.codex.installed.result, 'installed');
  assert.equal(report.status, 'ready');
});

test('emits deterministic human and JSON reports without secrets', async () => {
  const report = await runPreflight(
    { harness: 'codex' },
    { probes: readyProbes() },
  );
  const human = formatReadinessReport(report);
  const json = JSON.stringify(report);

  assert.match(
    human,
    /codex: installed=installed, authenticated=authenticated/,
  );
  assert.match(json, /"status":"ready"/);
  assert.doesNotMatch(human, /token|secret|password/i);
  assert.doesNotMatch(json, /token|secret|password/i);
});

test('runs preflight before any later stage handler', async () => {
  const calls = [];

  await runSmoke(
    { harness: 'codex', stages: ['prepare'] },
    {
      handlers: { prepare: async () => calls.push('prepare') },
      preflight: async () => calls.push('preflight'),
    },
  );

  assert.deepEqual(calls, ['preflight', 'prepare']);
});

test('does not run later stages when preflight fails', async () => {
  await assertNoFilesCreated(async (directory) => {
    await assert.rejects(
      () =>
        runSmoke(
          { harness: 'codex', stages: ['prepare'] },
          {
            handlers: {
              prepare: async () =>
                writeFile(join(directory, 'provisioned'), ''),
            },
            preflight: async () => {
              throw new PreflightError({ status: 'blocked' });
            },
          },
        ),
      PreflightError,
    );
  });
});
