import assert from 'node:assert/strict';
import {
  chmod,
  cp,
  mkdtemp,
  readFile,
  readdir,
  rm,
  utimes,
  writeFile,
} from 'node:fs/promises';
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
const fixturePath = join(import.meta.dirname, '..', 'fixture');
const packagePath = join(
  import.meta.dirname,
  '..',
  '..',
  '..',
  'packages',
  'cli',
  'package.json',
);
const packageVersion = JSON.parse(await readFile(packagePath, 'utf8')).version;

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

test('probes authentication only for the selected harness', async () => {
  const authenticated = [];
  const report = await runPreflight(
    { harness: 'codex' },
    {
      probes: readyProbes({
        auth: async (harness) => {
          authenticated.push(harness);
          return { command: `${harness} auth status`, result: 'authenticated' };
        },
      }),
    },
  );

  assert.equal(report.status, 'ready');
  assert.deepEqual(Object.keys(report.harnesses), harnesses);
  assert.deepEqual(authenticated, ['codex']);
  for (const harness of harnesses) {
    assert.equal(report.harnesses[harness].installed.result, 'installed');
    assert.equal(
      report.harnesses[harness].authenticated.result,
      harness === 'codex' ? 'authenticated' : 'not-run',
    );
    assert.match(report.harnesses[harness].installed.command, /--version$/);
  }
  for (const harness of harnesses.filter((name) => name !== 'codex')) {
    assert.match(
      report.harnesses[harness].authenticated.reason,
      /only probed for the selected harness/,
    );
  }
});

test('uses the documented runtime and authentication argv for Cursor IDE', async () => {
  const commands = [];
  const report = await runPreflight(
    { harness: 'cursor-ide' },
    {
      probes: {
        command: async (executable, args) => {
          commands.push([executable, args]);
          if (executable === 'git') {
            return { code: 0, stdout: 'test-revision\n' };
          }
          return { code: 0, stdout: '0.1.52\n' };
        },
        fixture: async () => ({ result: 'valid' }),
        oat: async () => ({ result: 'local' }),
      },
    },
  );

  assert.equal(report.status, 'ready');
  assert.deepEqual(commands, [
    ['codex', ['--version']],
    ['claude', ['--version']],
    ['cursor', ['--version']],
    ['cursor', ['agent', 'status']],
    ['cursor-agent', ['--version']],
  ]);
  assert.equal(
    report.harnesses['cursor-ide'].authenticated.command,
    'cursor agent status',
  );
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

test('rejects an unknown forced-unavailable harness before running probes', async () => {
  let probesRun = 0;

  await assert.rejects(
    () =>
      runPreflight(
        { harness: 'codex' },
        {
          env: { OAT_SMOKE_FORCE_UNAVAILABLE: 'not-a-harness' },
          probes: readyProbes({
            auth: async () => {
              probesRun += 1;
              return { result: 'authenticated' };
            },
            fixture: async () => {
              probesRun += 1;
              return { result: 'valid' };
            },
            oat: async () => {
              probesRun += 1;
              return { result: 'local' };
            },
            runtime: async () => {
              probesRun += 1;
              return { result: 'installed' };
            },
          }),
        },
      ),
    PreflightError,
  );
  assert.equal(probesRun, 0);
});

test('runs fixture integrity validation against a corrupt copied fixture', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'oat-smoke-fixture-copy-'));
  const copiedFixture = join(directory, 'fixture');

  try {
    await cp(fixturePath, copiedFixture, { recursive: true });
    await writeFile(
      join(copiedFixture, 'project', 'plan.md'),
      'corrupted fixture plan\n',
    );
    const probes = readyProbes();
    delete probes.fixture;

    await assert.rejects(
      () =>
        runPreflight(
          { fixturePath: copiedFixture, harness: 'codex' },
          { probes },
        ),
      (error) => {
        assert.ok(error instanceof PreflightError);
        assert.equal(error.report.fixture.result, 'invalid');
        assert.match(error.report.fixture.reason, /contract/);
        return true;
      },
    );
  } finally {
    await rm(directory, { force: true, recursive: true });
  }
});

test('executes the local dist entrypoint and rejects a stale build', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'oat-smoke-local-cli-'));
  const localOatPath = join(directory, 'oat');
  const future = new Date(Date.now() + 60_000);
  const past = new Date(0);

  try {
    await writeFile(
      localOatPath,
      `#!/bin/sh\n[ "$1" = "--version" ] || exit 1\necho ${packageVersion}\n`,
    );
    await chmod(localOatPath, 0o755);
    await utimes(localOatPath, future, future);
    const probes = readyProbes();
    delete probes.oat;

    const report = await runPreflight(
      { harness: 'codex', localOatPath },
      { probes },
    );
    assert.equal(report.oat.result, 'local');
    assert.equal(report.oat.version, report.oat.expectedVersion);
    assert.equal(report.oat.freshness, 'current-source');

    await utimes(localOatPath, past, past);
    await assert.rejects(
      () => runPreflight({ harness: 'codex', localOatPath }, { probes }),
      (error) => {
        assert.ok(error instanceof PreflightError);
        assert.equal(error.report.oat.result, 'stale-global');
        assert.equal(error.report.oat.freshness, 'stale-dist');
        return true;
      },
    );
  } finally {
    await rm(directory, { force: true, recursive: true });
  }
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
