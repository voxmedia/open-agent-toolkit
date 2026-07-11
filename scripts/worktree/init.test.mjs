import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import {
  access,
  cp,
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { promisify } from 'node:util';

import { cleanupSmoke } from '../../tools/smoke/runner/cleanup.mjs';
import { provisionSmoke } from '../../tools/smoke/runner/provision.mjs';

const execFileAsync = promisify(execFile);
const repositoryRoot = resolve(import.meta.dirname, '../..');
const fixturePath = join(repositoryRoot, 'tools/smoke/fixture');
const initScript = join(repositoryRoot, 'scripts/worktree/init.sh');
const journalScript = join(repositoryRoot, 'tools/smoke/runner/journal.mjs');

async function git(args, { cwd } = {}) {
  const { stdout } = await execFileAsync('git', args, {
    cwd,
    encoding: 'utf8',
  });
  return stdout.trim();
}

async function resolveLocalCloseoutPolicy(worktreePath, home) {
  const { stdout } = await execFileAsync(
    join(repositoryRoot, 'node_modules/.bin/tsx'),
    [
      '--tsconfig',
      join(repositoryRoot, 'packages/cli/tsconfig.json'),
      join(repositoryRoot, 'packages/cli/src/index.ts'),
      '--json',
      '--cwd',
      worktreePath,
      'config',
      'get',
      'workflow.postImplementSequence',
    ],
    {
      cwd: repositoryRoot,
      encoding: 'utf8',
      env: { ...process.env, HOME: home },
    },
  );
  return JSON.parse(stdout);
}

async function createRepository() {
  const directory = await mkdtemp(join(tmpdir(), 'oat-smoke-init-'));
  await git(['init', '--initial-branch=main'], { cwd: directory });
  await git(['config', 'user.email', 'smoke@example.test'], { cwd: directory });
  await git(['config', 'user.name', 'Smoke Test'], { cwd: directory });
  await mkdir(join(directory, '.oat'), { recursive: true });
  await mkdir(join(directory, 'scripts/worktree'), { recursive: true });
  await mkdir(join(directory, 'tools/smoke/runner'), { recursive: true });
  await cp(initScript, join(directory, 'scripts/worktree/init.sh'));
  await cp(journalScript, join(directory, 'tools/smoke/runner/journal.mjs'));
  await writeFile(
    join(directory, '.oat/config.json'),
    `${JSON.stringify(
      {
        workflow: {
          postImplementSequence: {
            postApproval: ['summary', 'document', 'pr'],
            preApproval: ['summary', 'document', 'pr'],
          },
        },
      },
      null,
      2,
    )}\n`,
  );
  await writeFile(join(directory, 'README.md'), 'smoke init host\n');
  await writeFile(
    join(directory, 'scripts/sync-archived-projects-from-s3.sh'),
    '#!/usr/bin/env bash\nprintf "s3\\n" >> "$SMOKE_FORBIDDEN_LOG"\n',
  );
  await git(
    [
      'add',
      '.oat/config.json',
      'README.md',
      'scripts/sync-archived-projects-from-s3.sh',
      'scripts/worktree/init.sh',
      'tools/smoke/runner/journal.mjs',
    ],
    { cwd: directory },
  );
  await git(['commit', '-m', 'initial'], { cwd: directory });

  await mkdir(join(directory, '.oat/projects/local'), { recursive: true });
  await mkdir(join(directory, '.oat/projects/archived'), { recursive: true });
  await writeFile(join(directory, '.env'), 'PRIMARY_SECRET=do-not-copy\n');
  await writeFile(join(directory, '.mcp.json'), '{"primary":true}\n');
  await writeFile(
    join(directory, '.oat/projects/local/private.txt'),
    'do not copy\n',
  );
  await writeFile(
    join(directory, '.oat/projects/archived/private.txt'),
    'do not copy\n',
  );

  return directory;
}

async function createFakeExecutables(binDirectory) {
  await mkdir(binDirectory, { recursive: true });
  await writeFile(
    join(binDirectory, 'pnpm'),
    `#!/bin/sh
printf '%s\\n' "$*" >> "$PNPM_RECORD"
case "$*" in
  "install --offline --frozen-lockfile --ignore-scripts"|"run build")
    exit 0
    ;;
  *)
    printf 'forbidden pnpm invocation: %s\\n' "$*" >&2
    exit 97
    ;;
esac
`,
    { mode: 0o755 },
  );
  for (const command of ['aws', 'curl', 'npm', 'yarn']) {
    await writeFile(
      join(binDirectory, command),
      `#!/bin/sh
printf '${command}\\n' >> "$SMOKE_FORBIDDEN_LOG"
exit 98
`,
      { mode: 0o755 },
    );
  }
}

async function exists(path) {
  return access(path)
    .then(() => true)
    .catch(() => false);
}

test('isolates nested smoke bootstrap from normal worktree initialization', async () => {
  const repository = await createRepository();
  const runsDirectory = join(repository, '.smoke-runs');
  const home = join(repository, 'test-control/home');
  const homeConfig = join(home, '.oat/config.json');
  const fakeBin = join(repository, 'test-control/bin');
  const pnpmRecord = join(repository, 'test-control/pnpm.log');
  const forbiddenLog = join(repository, 'test-control/forbidden.log');
  const childBranch = 'smoke-child-p02';
  let childWorktreePath;
  let manifest;

  await mkdir(dirname(homeConfig), { recursive: true });
  await writeFile(
    homeConfig,
    '{"workflow":{"postImplementSequence":"docs-pr"},"personal":true}\n',
  );
  const originalHomeConfig = await readFile(homeConfig);
  await createFakeExecutables(fakeBin);

  try {
    manifest = await provisionSmoke(
      { harness: 'codex', scenario: 'implement' },
      {
        clock: () => new Date('2026-07-11T20:30:45.123Z'),
        fixture: fixturePath,
        git,
        random: () => 'nested-init',
        repository,
        resolvePolicy: (worktreePath) =>
          resolveLocalCloseoutPolicy(worktreePath, home),
        runsDirectory,
      },
    );
    childWorktreePath = join(runsDirectory, `${manifest.branch}-child`);
    await git(
      [
        '-c',
        'core.hooksPath=/dev/null',
        'worktree',
        'add',
        '-b',
        childBranch,
        childWorktreePath,
        manifest.baselineCommitSha,
      ],
      { cwd: repository },
    );

    const childMarker = join(childWorktreePath, '.oat/smoke-bootstrap.json');
    const childConfig = join(childWorktreePath, '.oat/config.local.json');
    assert.deepEqual(
      await readFile(childMarker),
      await readFile(manifest.intendedSmokeBootstrap.markerPath),
    );
    assert.match(
      await readFile(
        join(childWorktreePath, '.oat/projects/smoke-fixture/plan.md'),
        'utf8',
      ),
      /oat_ready_for: oat-project-implement/,
    );
    assert.match(
      await readFile(join(childWorktreePath, 'workspace/logs/p01.log'), 'utf8'),
      /phase p01/,
    );
    await assert.rejects(() => readFile(childConfig), { code: 'ENOENT' });

    await execFileAsync('bash', ['scripts/worktree/init.sh'], {
      cwd: childWorktreePath,
      encoding: 'utf8',
      env: {
        ...process.env,
        HOME: home,
        PATH: `${fakeBin}:${process.env.PATH}`,
        PNPM_RECORD: pnpmRecord,
        SMOKE_FORBIDDEN_LOG: forbiddenLog,
      },
    });

    assert.deepEqual(
      await readFile(childConfig),
      await readFile(manifest.intendedSmokeBootstrap.configSource),
    );
    const journaledManifest = JSON.parse(
      await readFile(manifest.manifestPath, 'utf8'),
    );
    assert.equal(journaledManifest.ownershipJournal.resources.length, 1);
    assert.deepEqual(
      {
        branch: journaledManifest.ownershipJournal.resources[0].branch,
        runIdentity:
          journaledManifest.ownershipJournal.resources[0].runIdentity,
        worktreePath:
          journaledManifest.ownershipJournal.resources[0].worktreePath,
      },
      {
        branch: childBranch,
        runIdentity: manifest.runIdentity,
        worktreePath: await realpath(childWorktreePath),
      },
    );
    assert.deepEqual(
      await resolveLocalCloseoutPolicy(childWorktreePath, home),
      {
        key: 'workflow.postImplementSequence',
        source: 'local',
        status: 'ok',
        value: { postApproval: [], preApproval: [] },
      },
    );
    assert.equal(
      await readFile(pnpmRecord, 'utf8'),
      [
        'install --offline --frozen-lockfile --ignore-scripts',
        'run build',
        '',
      ].join('\n'),
    );
    for (const forbiddenPath of [
      '.env',
      '.mcp.json',
      '.oat/projects/local/private.txt',
      '.oat/projects/archived/private.txt',
    ]) {
      await assert.rejects(
        () => readFile(join(childWorktreePath, forbiddenPath)),
        { code: 'ENOENT' },
      );
    }
    await assert.rejects(() => readFile(forbiddenLog), { code: 'ENOENT' });
    assert.deepEqual(await readFile(homeConfig), originalHomeConfig);
    assert.equal(
      await git(['status', '--short', '--untracked-files=all'], {
        cwd: manifest.worktreePath,
      }),
      '?? .oat/config.local.json',
    );
    await writeFile(
      join(childWorktreePath, 'smoke-lifecycle.txt'),
      'nested lifecycle commit\n',
    );
    await git(['add', 'smoke-lifecycle.txt'], { cwd: childWorktreePath });
    await git(['commit', '-m', 'test: nested smoke lifecycle'], {
      cwd: childWorktreePath,
    });
    assert.equal(
      await git(['status', '--short', '--untracked-files=all'], {
        cwd: childWorktreePath,
      }),
      '?? .oat/config.local.json',
    );

    await rm(childConfig);
    await rm(pnpmRecord);
    const escapedConfig = join(repository, 'test-control/escaped-config.json');
    await writeFile(
      escapedConfig,
      await readFile(manifest.intendedSmokeBootstrap.configSource),
    );
    const escapedMarker = JSON.parse(await readFile(childMarker, 'utf8'));
    escapedMarker.configSource = escapedConfig;
    await writeFile(childMarker, `${JSON.stringify(escapedMarker, null, 2)}\n`);
    await assert.rejects(
      () =>
        execFileAsync('bash', ['scripts/worktree/init.sh'], {
          cwd: childWorktreePath,
          env: {
            ...process.env,
            HOME: home,
            PATH: `${fakeBin}:${process.env.PATH}`,
            PNPM_RECORD: pnpmRecord,
            SMOKE_FORBIDDEN_LOG: forbiddenLog,
          },
        }),
      /Invalid smoke bootstrap marker/,
    );
    await assert.rejects(() => readFile(childConfig), { code: 'ENOENT' });
    await assert.rejects(() => readFile(pnpmRecord), { code: 'ENOENT' });

    await rm(childMarker);
    await assert.rejects(
      () =>
        execFileAsync('bash', ['scripts/worktree/init.sh'], {
          cwd: childWorktreePath,
          env: {
            ...process.env,
            HOME: home,
            PATH: `${fakeBin}:${process.env.PATH}`,
            PNPM_RECORD: pnpmRecord,
            SMOKE_FORBIDDEN_LOG: forbiddenLog,
          },
        }),
      /tracked smoke bootstrap marker is missing or unsafe/,
    );
    await assert.rejects(() => readFile(childConfig), { code: 'ENOENT' });
    await assert.rejects(() => readFile(pnpmRecord), { code: 'ENOENT' });

    const cleanupResult = await cleanupSmoke(manifest.manifestPath, {
      git,
      repository,
      runsDirectory,
    });
    assert.equal(cleanupResult.status, 'cleaned');
    assert.equal(await exists(childWorktreePath), false);
    assert.equal(await exists(manifest.worktreePath), false);
    assert.equal(
      await git(['branch', '--list', childBranch], { cwd: repository }),
      '',
    );
    assert.equal(
      await git(['branch', '--list', manifest.branch], { cwd: repository }),
      '',
    );
  } finally {
    if (childWorktreePath) {
      await git(['worktree', 'remove', '--force', childWorktreePath], {
        cwd: repository,
      }).catch(() => {});
    }
    if (manifest) {
      await git(['worktree', 'remove', '--force', manifest.worktreePath], {
        cwd: repository,
      }).catch(() => {});
      await git(['branch', '--delete', '--force', manifest.branch], {
        cwd: repository,
      }).catch(() => {});
    }
    await rm(repository, { force: true, recursive: true });
  }
});
