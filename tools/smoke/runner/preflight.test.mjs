import assert from 'node:assert/strict';
import {
  chmod,
  cp,
  mkdir,
  mkdtemp,
  readFile,
  realpath,
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

const harnesses = [
  'deterministic',
  'codex',
  'claude',
  'cursor-ide',
  'cursor-cli',
];
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
    [process.execPath, ['--version']],
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

test('requires only sanitized Cursor API key presence for Cursor execution', async () => {
  const gateOptions = {
    gateRuntime: 'cursor',
    gateTarget: 'cursor-default',
    harness: 'codex',
  };
  await assert.rejects(
    () =>
      runPreflight(gateOptions, {
        env: { ...process.env, CURSOR_API_KEY: '' },
        probes: readyProbes(),
      }),
    (error) => {
      assert.ok(error instanceof PreflightError);
      assert.deepEqual(error.report.cursorApiKey, {
        present: false,
        required: true,
      });
      return true;
    },
  );

  const report = await runPreflight(gateOptions, {
    env: { ...process.env, CURSOR_API_KEY: 'test-secret-value' },
    probes: readyProbes(),
  });
  assert.deepEqual(report.cursorApiKey, { present: true, required: true });
  assert.doesNotMatch(JSON.stringify(report), /test-secret-value/);
});

test('accepts the canonical fixture seed headers and presets', async () => {
  const probes = readyProbes();
  delete probes.fixture;

  const report = await runPreflight(
    { fixturePath, harness: 'codex' },
    { probes },
  );

  assert.equal(report.fixture.result, 'valid');
  assert.equal(report.status, 'ready');
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

test('rejects copied fixtures with preset or dispatch-matrix defects', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'oat-smoke-fixture-copy-'));

  try {
    for (const [name, path, replacement] of [
      [
        'preset',
        join('presets', 'implementation-ready.json'),
        '"oat_current_task": "p01-t01"',
      ],
      ['dispatch matrix', join('project', 'state.md'), 'gpt-5.6-sol-max'],
    ]) {
      const copiedFixture = join(directory, name);
      await cp(fixturePath, copiedFixture, { recursive: true });
      const target = join(copiedFixture, path);
      const source = await readFile(target, 'utf8');
      await writeFile(
        target,
        source.replace(
          replacement,
          name === 'preset'
            ? '"oat_current_task": "p99-t99"'
            : 'fixture-cursor-opaque-corrupt',
        ),
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
          return true;
        },
        `${name} corruption must fail preflight`,
      );
    }
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
      {
        env: { ...process.env, PATH: `${directory}:${process.env.PATH}` },
        probes,
      },
    );
    assert.equal(report.oat.result, 'local');
    assert.equal(report.oat.version, report.oat.expectedVersion);
    assert.equal(report.oat.freshness, 'current-source');

    await utimes(localOatPath, past, past);
    await assert.rejects(
      () =>
        runPreflight(
          { harness: 'codex', localOatPath },
          {
            env: { ...process.env, PATH: `${directory}:${process.env.PATH}` },
            probes,
          },
        ),
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

test('reports the local build probe error when the dist entrypoint is missing', async () => {
  const probes = readyProbes();
  delete probes.oat;

  await assert.rejects(
    () =>
      runPreflight(
        {
          harness: 'codex',
          localOatPath: join(tmpdir(), 'missing-oat-dist-entrypoint'),
        },
        { probes },
      ),
    (error) => {
      assert.ok(error instanceof PreflightError);
      assert.equal(error.report.oat.result, 'stale-global');
      assert.match(error.report.oat.reason, /ENOENT/);
      return true;
    },
  );
});

test('rejects a PATH oat executable that differs from the local dist entrypoint', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'oat-smoke-path-oat-'));
  const localOatPath = join(directory, 'local-oat');
  const binDirectory = join(directory, 'bin');
  const pathOat = join(binDirectory, 'oat');
  const future = new Date(Date.now() + 60_000);

  try {
    await writeFile(
      localOatPath,
      `#!/bin/sh\n[ "$1" = "--version" ] || exit 1\necho ${packageVersion}\n`,
    );
    await mkdir(binDirectory);
    await writeFile(pathOat, `#!/bin/sh\necho global\n`);
    await Promise.all([
      chmod(localOatPath, 0o755),
      chmod(pathOat, 0o755),
      utimes(localOatPath, future, future),
    ]);
    const probes = readyProbes();
    delete probes.oat;

    await assert.rejects(
      () =>
        runPreflight(
          { harness: 'codex', localOatPath },
          {
            env: {
              ...process.env,
              PATH: `${binDirectory}:${process.env.PATH}`,
            },
            probes,
          },
        ),
      (error) => {
        assert.ok(error instanceof PreflightError);
        assert.equal(error.report.oat.result, 'stale-global');
        assert.match(error.report.oat.commandPath, /\/bin\/oat$/);
        return true;
      },
    );
  } finally {
    await rm(directory, { force: true, recursive: true });
  }
});

test('accepts the repository-owned smoke OAT shim for local execution', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'oat-smoke-path-oat-'));
  const localOatPath = join(directory, 'local-oat');
  const binDirectory = join(directory, 'bin');
  const trustedOatCommandPath = join(binDirectory, 'oat');
  const future = new Date(Date.now() + 60_000);

  try {
    await mkdir(binDirectory);
    await Promise.all([
      writeFile(
        localOatPath,
        `#!/bin/sh\n[ "$1" = "--version" ] || exit 1\necho ${packageVersion}\n`,
      ),
      writeFile(trustedOatCommandPath, '#!/bin/sh\nexit 99\n'),
    ]);
    await Promise.all([
      chmod(localOatPath, 0o755),
      chmod(trustedOatCommandPath, 0o755),
      utimes(localOatPath, future, future),
    ]);
    const probes = readyProbes();
    delete probes.oat;

    const report = await runPreflight(
      { harness: 'codex', localOatPath, trustedOatCommandPath },
      {
        env: {
          ...process.env,
          PATH: `${binDirectory}:${process.env.PATH}`,
        },
        probes,
      },
    );

    assert.equal(report.oat.result, 'local');
    assert.equal(report.oat.commandPath, await realpath(trustedOatCommandPath));
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
