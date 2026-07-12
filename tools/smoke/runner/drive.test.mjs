import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
  DriveError,
  collectSmoke,
  createInvocationPlan,
  driveSmoke,
  loadPreparedManifest,
  loadProtocol,
  publishReportDirectory,
  reportRootFor,
} from './drive.mjs';

const harnessExecutables = {
  deterministic: process.execPath,
  claude: 'claude',
  codex: 'codex',
  'cursor-cli': 'cursor-agent',
  'cursor-ide': 'cursor',
};

function options(overrides = {}) {
  return {
    driveMode: 'automated',
    dryRun: true,
    harness: 'codex',
    keep: false,
    scenario: 'plan-review',
    stages: ['drive'],
    ...overrides,
  };
}

async function createManifest(runDirectory, overrides = {}) {
  const manifestPath = join(runDirectory, 'provisioning-manifest.json');
  const manifest = {
    appliedScenario: 'plan-review',
    commonGitDir: join(runDirectory, 'git'),
    createdPaths: [manifestPath],
    driveMode: 'automated',
    harness: 'codex',
    manifestPath,
    readiness: { status: 'ready' },
    reportRoot: join(runDirectory, 'reports'),
    worktreePath: join(runDirectory, 'worktree'),
    ...overrides,
  };
  await writeFile(manifestPath, `${JSON.stringify(manifest)}\n`);
  return manifest;
}

test('selects one protocol and invocation shape for every harness', async () => {
  for (const [harness, executable] of Object.entries(harnessExecutables)) {
    const protocol = await loadProtocol({
      harness,
      scenario: 'implement',
    });
    assert.match(protocol.path, new RegExp(`${harness}\\.md$`));
    assert.match(protocol.prompt, /scenario implement/);
    assert.doesNotMatch(protocol.prompt, /\{\{/);
    assert.match(
      protocol.prompt,
      /exactly one external final code gate after p03/,
    );
    assert.match(
      protocol.prompt,
      /one root-owned phase review per phase|Phase self-reviews\s+still run once per phase from the root/,
    );
    assert.doesNotMatch(protocol.prompt, /coordinator-owned self-review/);
    assert.match(protocol.prompt, /Gate count is fixed:/);

    const automated = createInvocationPlan({
      driveMode: 'automated',
      gitMetadataPath: '/tmp/smoke-git',
      harness,
      prompt: protocol.prompt,
      runMetadataPath: '/tmp/smoke-run',
      worktreePath: '/tmp/smoke-worktree',
    });
    const operator =
      harness === 'deterministic'
        ? null
        : createInvocationPlan({
            driveMode: 'operator',
            gitMetadataPath: '/tmp/smoke-git',
            harness,
            prompt: protocol.prompt,
            runMetadataPath: '/tmp/smoke-run',
            worktreePath: '/tmp/smoke-worktree',
          });
    assert.equal(automated.executable, executable);
    if (operator) {
      assert.equal(operator.executable, executable);
      assert.equal(operator.operator, true);
    }
    if (harness === 'cursor-ide') {
      assert.equal(automated.manualOnly, true);
    }
    if (harness === 'deterministic') {
      assert.throws(
        () =>
          createInvocationPlan({
            driveMode: 'operator',
            harness,
            prompt: protocol.prompt,
            worktreePath: '/tmp/smoke-worktree',
          }),
        /automated drive mode only/,
      );
    }
    if (harness === 'codex') {
      for (const plan of [automated, operator]) {
        assert.deepEqual(
          plan.args.slice(
            plan.args.indexOf('--add-dir'),
            plan.args.indexOf('--add-dir') + 2,
          ),
          ['--add-dir', '/tmp/smoke-git'],
        );
        assert.deepEqual(
          plan.args.slice(
            plan.args.lastIndexOf('--add-dir'),
            plan.args.lastIndexOf('--add-dir') + 2,
          ),
          ['--add-dir', '/tmp/smoke-run'],
        );
      }
    }
  }
});

test('plan-review prompt preserves the three-commit transition boundary', async () => {
  const protocol = await loadProtocol({
    harness: 'codex',
    scenario: 'plan-review',
  });
  assert.match(protocol.prompt, /do not journal the gate received-row commit/);
  assert.match(protocol.prompt, /pre-review → reviewed/);
  assert.match(protocol.prompt, /reviewed → implementation-ready/);
});

test('refuses to drive when selected-harness preflight is not ready', async () => {
  await assert.rejects(
    () =>
      driveSmoke(options(), {
        manifest: {},
        results: { preflight: { status: 'blocked' } },
      }),
    (error) =>
      error instanceof DriveError && error.message.includes('preflight'),
  );
});

test('dry-run records the selected protocol stub in the manifest', async () => {
  const runDirectory = await mkdtemp(join(tmpdir(), 'oat-drive-test-'));
  try {
    const manifest = await createManifest(runDirectory);
    const reports = [];
    const result = await driveSmoke(
      options(),
      {
        manifest,
        results: { preflight: { status: 'ready' } },
      },
      {
        execute: async () => {
          throw new Error('dry-run must not execute');
        },
        reporter: (value) => reports.push(value),
      },
    );
    const persisted = JSON.parse(await readFile(manifest.manifestPath, 'utf8'));

    assert.equal(result.record.status, 'dry-run-stub');
    assert.equal(persisted.drive.protocol, 'tools/smoke/protocols/codex.md');
    assert.equal(persisted.drive.invocation.executable, 'codex');
    assert.equal(reports.length, 1);
    assert.match(reports[0], /OAT_SMOKE_LOCAL_CLI=/);
    assert.match(reports[0], /cursor-broker-launch\.mjs/);
  } finally {
    await rm(runDirectory, { force: true, recursive: true });
  }
});

test('operator mode prints a handoff and never executes noninteractive drive', async () => {
  const runDirectory = await mkdtemp(join(tmpdir(), 'oat-drive-test-'));
  try {
    const manifest = await createManifest(runDirectory, {
      driveMode: 'operator',
    });
    let executions = 0;
    const result = await driveSmoke(
      options({ driveMode: 'operator', dryRun: false }),
      {
        manifest,
        results: { preflight: { status: 'ready' } },
      },
      {
        execute: async () => {
          executions += 1;
        },
        reporter: () => {},
      },
    );

    assert.equal(executions, 0);
    assert.equal(result.record.status, 'awaiting-operator');
    assert.notEqual(
      reportRootFor(options(), '/repo'),
      reportRootFor(options({ driveMode: 'operator' }), '/repo'),
    );
  } finally {
    await rm(runDirectory, { force: true, recursive: true });
  }
});

test('publishes a complete staged report directory in one replacement', async () => {
  const runDirectory = await mkdtemp(join(tmpdir(), 'oat-drive-publish-'));
  try {
    const stagingDirectory = join(runDirectory, 'staging');
    const reportDirectory = join(runDirectory, 'reports', 'codex');
    await mkdir(stagingDirectory, { recursive: true });
    await mkdir(reportDirectory, { recursive: true });
    await writeFile(join(stagingDirectory, 'bundle.json'), '{"new":true}\n');
    await writeFile(
      join(stagingDirectory, 'report.json'),
      '{"status":"passed"}\n',
    );
    await writeFile(join(reportDirectory, 'report.json'), '{"status":"old"}\n');

    await publishReportDirectory(stagingDirectory, reportDirectory);

    assert.equal(
      await readFile(join(reportDirectory, 'bundle.json'), 'utf8'),
      '{"new":true}\n',
    );
    assert.equal(
      await readFile(join(reportDirectory, 'report.json'), 'utf8'),
      '{"status":"passed"}\n',
    );
    await assert.rejects(
      () => readFile(join(stagingDirectory, 'bundle.json')),
      {
        code: 'ENOENT',
      },
    );
  } finally {
    await rm(runDirectory, { force: true, recursive: true });
  }
});

test('drive completion preserves ownership registered by child worktrees', async () => {
  const runDirectory = await mkdtemp(join(tmpdir(), 'oat-drive-test-'));
  try {
    const manifest = await createManifest(runDirectory, {
      ownershipJournal: { resources: [], schemaVersion: 1 },
    });
    await driveSmoke(
      options({ dryRun: false }),
      {
        manifest,
        results: { preflight: { status: 'ready' } },
      },
      {
        execute: async () => {
          const latest = JSON.parse(
            await readFile(manifest.manifestPath, 'utf8'),
          );
          latest.ownershipJournal.resources.push({
            branch: 'smoke-child-p01',
          });
          await writeFile(manifest.manifestPath, `${JSON.stringify(latest)}\n`);
          return { code: 0, signal: null, stderr: '', stdout: '' };
        },
        reporter: () => {},
      },
    );
    const persisted = JSON.parse(await readFile(manifest.manifestPath, 'utf8'));

    assert.deepEqual(persisted.ownershipJournal.resources, [
      { branch: 'smoke-child-p01' },
    ]);
    assert.equal(persisted.drive.status, 'completed');
  } finally {
    await rm(runDirectory, { force: true, recursive: true });
  }
});

test('loads only the matching prepared drive mode identity', async () => {
  const runsDirectory = await mkdtemp(join(tmpdir(), 'oat-drive-runs-'));
  try {
    const automatedDirectory = join(runsDirectory, 'smoke-automated-one');
    const operatorDirectory = join(runsDirectory, 'smoke-operator-one');
    await Promise.all([
      mkdir(automatedDirectory, { recursive: true }),
      mkdir(operatorDirectory, { recursive: true }),
    ]);
    await createManifest(automatedDirectory);
    await createManifest(operatorDirectory, { driveMode: 'operator' });

    const loaded = await loadPreparedManifest(
      options({ driveMode: 'operator' }),
      { runsDirectory },
    );
    assert.equal(loaded.driveMode, 'operator');
  } finally {
    await rm(runsDirectory, { force: true, recursive: true });
  }
});

test('stages then publishes a passing report while preserving concurrent metadata', async () => {
  const runDirectory = await mkdtemp(join(tmpdir(), 'oat-drive-test-'));
  try {
    const repository = join(runDirectory, 'repository');
    const operatorOptions = options({
      driveMode: 'operator',
      dryRun: false,
    });
    const reportRoot = reportRootFor(operatorOptions, repository);
    const manifest = await createManifest(runDirectory, {
      drive: { status: 'awaiting-operator' },
      driveMode: 'operator',
      reportRoot,
    });
    const calls = [];
    const result = await collectSmoke(
      operatorOptions,
      {
        manifest,
        results: { preflight: { status: 'ready' } },
      },
      {
        collect: async (received) => {
          calls.push(received);
          const latest = JSON.parse(
            await readFile(manifest.manifestPath, 'utf8'),
          );
          latest.concurrentOwner = { retained: true };
          await writeFile(manifest.manifestPath, `${JSON.stringify(latest)}\n`);
          return { outputPath: join(received.outDirectory, 'bundle.json') };
        },
        emitReport: async (received) => {
          calls.push(received);
          return {
            jsonPath: join(received.outDirectory, 'report.json'),
            markdownPath: join(received.outDirectory, 'report.md'),
            report: { status: 'passed', summary: { failed: 0 } },
          };
        },
        publish: async (stagingDirectory, destination) => {
          calls.push({ destination, stagingDirectory });
        },
        repository,
      },
    );
    const persisted = JSON.parse(await readFile(manifest.manifestPath, 'utf8'));

    assert.match(calls[0].outDirectory, /report-staging-/);
    assert.equal(calls[2].stagingDirectory, calls[0].outDirectory);
    assert.equal(calls[2].destination, reportRoot);
    assert.equal(result.report.jsonPath, join(reportRoot, 'report.json'));
    assert.equal(persisted.drive.status, 'operator-returned');
    assert.equal(persisted.collection.status, 'completed');
    assert.deepEqual(persisted.concurrentOwner, { retained: true });
  } finally {
    await rm(runDirectory, { force: true, recursive: true });
  }
});

test('persists and rejects a failed evidence report', async () => {
  const runDirectory = await mkdtemp(join(tmpdir(), 'oat-drive-test-'));
  try {
    const repository = join(runDirectory, 'repository');
    const automatedOptions = options({ dryRun: false });
    const reportRoot = reportRootFor(automatedOptions, repository);
    const manifest = await createManifest(runDirectory, {
      drive: { status: 'completed' },
      reportRoot,
    });
    let publications = 0;

    await assert.rejects(
      () =>
        collectSmoke(
          automatedOptions,
          {
            manifest,
            results: { preflight: { status: 'ready' } },
          },
          {
            collect: async (received) => ({
              outputPath: join(received.outDirectory, 'bundle.json'),
            }),
            emitReport: async (received) => ({
              jsonPath: join(received.outDirectory, 'report.json'),
              report: { status: 'failed', summary: { failed: 2 } },
            }),
            publish: async () => {
              publications += 1;
            },
            repository,
          },
        ),
      /failed 2 assertion/,
    );
    const persisted = JSON.parse(await readFile(manifest.manifestPath, 'utf8'));
    assert.equal(persisted.collection.status, 'failed');
    assert.match(persisted.collection.stagingDirectory, /report-staging-/);
    assert.equal(publications, 0);
  } finally {
    await rm(runDirectory, { force: true, recursive: true });
  }
});

test('records collection failures in run-local staging without publication', async () => {
  const runDirectory = await mkdtemp(join(tmpdir(), 'oat-drive-test-'));
  try {
    const repository = join(runDirectory, 'repository');
    const automatedOptions = options({ dryRun: false });
    const reportRoot = reportRootFor(automatedOptions, repository);
    const manifest = await createManifest(runDirectory, {
      drive: { status: 'completed' },
      reportRoot,
    });
    let publications = 0;

    await assert.rejects(
      () =>
        collectSmoke(
          automatedOptions,
          {
            manifest,
            results: { preflight: { status: 'ready' } },
          },
          {
            collect: async () => {
              throw new Error('injected collection interruption');
            },
            publish: async () => {
              publications += 1;
            },
            repository,
          },
        ),
      /injected collection interruption/,
    );

    const persisted = JSON.parse(await readFile(manifest.manifestPath, 'utf8'));
    assert.equal(persisted.collection.status, 'failed');
    assert.match(persisted.collection.stagingDirectory, /report-staging-/);
    assert.equal(publications, 0);
  } finally {
    await rm(runDirectory, { force: true, recursive: true });
  }
});
