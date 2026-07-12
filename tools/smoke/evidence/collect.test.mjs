import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';
import { promisify } from 'node:util';

import {
  collectEvidence,
  EvidenceCollectionError,
  parseCollectorArgs,
} from './collect.mjs';

const execFileAsync = promisify(execFile);
const evidenceDirectory = import.meta.dirname;
const goldenDirectory = join(evidenceDirectory, 'golden');
const collectorPath = join(evidenceDirectory, 'collect.mjs');

async function git(args, cwd) {
  const { stdout } = await execFileAsync('git', args, {
    cwd,
    encoding: 'utf8',
  });
  return stdout.trim();
}

async function commitFile(repository, file, contents, message) {
  await writeFile(join(repository, file), contents);
  await git(['add', '--', file], repository);
  await git(['commit', '-m', message], repository);
  return git(['rev-parse', 'HEAD'], repository);
}

async function createGoldenRun() {
  const repository = await mkdtemp(join(tmpdir(), 'oat-smoke-collect-'));
  await git(['init', '--initial-branch=main'], repository);
  await git(['config', 'user.email', 'smoke@example.test'], repository);
  await git(['config', 'user.name', 'Smoke Test'], repository);
  const sourceCommitSha = await commitFile(
    repository,
    'README.md',
    'golden evidence host\n',
    'initial',
  );

  const runDirectory = join(repository, '.smoke-runs/smoke-golden');
  const worktreePath = join(runDirectory, 'worktree');
  await mkdir(runDirectory, { recursive: true });
  await git(
    ['worktree', 'add', '-b', 'smoke-golden', worktreePath, sourceCommitSha],
    repository,
  );
  const fixtureProjectPath = join(worktreePath, '.oat/projects/smoke-fixture');
  await mkdir(join(worktreePath, '.oat/projects'), { recursive: true });
  await cp(join(goldenDirectory, 'project'), fixtureProjectPath, {
    recursive: true,
  });
  await cp(
    join(goldenDirectory, 'workspace'),
    join(worktreePath, 'workspace'),
    {
      recursive: true,
    },
  );
  await git(['add', '.oat/projects/smoke-fixture', 'workspace'], worktreePath);
  await git(['commit', '-m', 'test: establish golden baseline'], worktreePath);
  const baselineCommitSha = await git(['rev-parse', 'HEAD'], worktreePath);

  const history = JSON.parse(
    await readFile(join(goldenDirectory, 'git-history.json'), 'utf8'),
  );
  const children = [];
  for (const entry of history) {
    const childPath = join(repository, '.children', entry.branch);
    await mkdir(resolve(childPath, '..'), { recursive: true });
    await git(
      ['worktree', 'add', '-b', entry.branch, childPath, baselineCommitSha],
      repository,
    );
    const head = await commitFile(
      childPath,
      entry.file,
      `${entry.branch}\n`,
      entry.message,
    );
    children.push({ ...entry, head, path: childPath });
  }

  const commonGitDir = await realpath(join(repository, '.git'));
  const manifestPath = join(runDirectory, 'provisioning-manifest.json');
  const manifest = {
    appliedScenario: 'implement',
    baselineCommitSha,
    branch: 'smoke-golden',
    branchOwnership: {
      baseCommitSha: sourceCommitSha,
      baselineCommitSha,
      branch: 'smoke-golden',
      createdByRun: true,
      runIdentity: 'smoke-golden',
    },
    commonGitDir,
    effectiveCloseoutPolicy: {
      source: 'local',
      value: { postApproval: [], preApproval: [] },
    },
    fixtureProjectPath,
    harness: 'cursor-cli',
    manifestPath,
    ownershipJournal: {
      resources: children.map((child) => ({
        baselineCommitSha,
        branch: child.branch,
        commonGitDir,
        registeredAt: '2026-07-11T20:00:00Z',
        runIdentity: 'smoke-golden',
        worktreePath: child.path,
      })),
      schemaVersion: 1,
    },
    provisioningState: 'ready',
    readiness: { status: 'ready' },
    runIdentity: 'smoke-golden',
    sourceCommitSha,
    worktreePath,
    writableRoots: [],
  };
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  return {
    baselineCommitSha,
    children,
    fixtureProjectPath,
    manifest,
    manifestPath,
    repository,
    sourceCommitSha,
    worktreePath,
  };
}

async function cleanupGoldenRun(run) {
  if (!run) {
    return;
  }
  await rm(run.repository, { force: true, recursive: true });
}

test('collects a deterministic normalized evidence bundle', async () => {
  const run = await createGoldenRun();
  const outputDirectory = join(run.repository, 'evidence');

  try {
    const { bundle, outputPath } = await collectEvidence({
      manifestPath: run.manifestPath,
      outDirectory: outputDirectory,
      worktreePath: run.worktreePath,
    });

    assert.equal(
      outputPath,
      join(await realpath(run.repository), 'evidence/bundle.json'),
    );
    assert.deepEqual(JSON.parse(await readFile(outputPath, 'utf8')), bundle);
    assert.equal(bundle.schemaVersion, 1);
    assert.equal(bundle.scenario, 'implement');
    assert.deepEqual(bundle.fixture.taskIds, [
      'p01-t01',
      'p01-t02',
      'p02-t01',
      'p03-t01',
    ]);
    assert.match(bundle.fixture.planHash, /^[0-9a-f]{64}$/u);
    assert.deepEqual(
      bundle.dispatches.map((dispatch) => dispatch.scope),
      ['p01-t01', 'p01-t02'],
    );
    assert.equal(bundle.dispatches[0].selection.atOrBelowCeiling, true);
    assert.deepEqual(bundle.dispatches[0].runtimeIdentity, {
      confidence: 'high',
      effort: 'xhigh',
      model: 'gpt-5.6-sol-xhigh',
      producer: 'gpt-5.6-sol-xhigh',
      provenance: 'observed',
      status: 'reported',
    });
    assert.deepEqual(bundle.dispatches[1].runtimeIdentity, {
      confidence: 'not-reported',
      effort: null,
      model: null,
      producer: null,
      provenance: 'not-reported',
      status: 'not-reported',
    });
    assert.equal(
      bundle.dispatches[1].configuredInvocation.target,
      'cursor-cli:gpt-5.6-terra-medium',
    );
    assert.deepEqual(
      bundle.orchestrationEvents.map((event) => event.sequence),
      [1, 2, 3],
    );
    assert.equal(
      bundle.orchestrationEvents.some((event) =>
        Object.hasOwn(event, 'timestamp'),
      ),
      false,
    );
    assert.deepEqual(
      bundle.fixtureLogs.map((log) => log.phase),
      ['p01', 'p02', 'p03'],
    );
    assert.deepEqual(bundle.reviews, [
      {
        corroboration: {
          oat_corroboration_status: 'confirmed',
          oat_gate_run_id: 'golden-gate-run',
          oat_gate_runtime: 'claude',
          oat_gate_target: 'claude-fable-skip-permissions',
        },
        frontmatter: {
          oat_corroboration_status: 'confirmed',
          oat_gate_run_id: 'golden-gate-run',
          oat_gate_runtime: 'claude',
          oat_gate_target: 'claude-fable-skip-permissions',
          oat_invocation_model: 'fable',
          oat_invocation_reasoning_effort: 'provider-default',
          oat_invocation_source: 'exec-target-config',
          oat_review_invocation: 'gate',
          oat_review_scope: 'p03',
          oat_review_type: 'code',
        },
        path: 'reviews/p03-review.md',
      },
    ]);
    assert.equal(bundle.git.branch, 'smoke-golden');
    assert.equal(bundle.git.head, run.baselineCommitSha);
    assert.deepEqual(
      new Set(bundle.git.commits.map((commit) => commit.sha)),
      new Set([
        run.baselineCommitSha,
        ...run.children.map((child) => child.head),
      ]),
    );
    assert.deepEqual(
      bundle.git.worktrees.map((worktree) => worktree.path),
      ['<worktree>', 'journal:smoke-golden-p01', 'journal:smoke-golden-p02'],
    );
    assert.equal(
      JSON.stringify(bundle).includes(run.repository),
      true,
      'raw source paths remain explicit',
    );
    assert.equal(
      JSON.stringify({
        ...bundle,
        source: null,
      }).includes(run.repository),
      false,
      'normalized sections do not leak absolute temp paths',
    );
  } finally {
    await cleanupGoldenRun(run);
  }
});

test('CLI writes only the external bundle path', async () => {
  const run = await createGoldenRun();
  const outputDirectory = join(run.repository, 'cli-evidence');

  try {
    const { stdout } = await execFileAsync(
      process.execPath,
      [
        collectorPath,
        '--worktree',
        run.worktreePath,
        '--manifest',
        run.manifestPath,
        '--out',
        outputDirectory,
      ],
      { encoding: 'utf8' },
    );
    assert.equal(
      stdout.trim(),
      join(await realpath(run.repository), 'cli-evidence/bundle.json'),
    );
    assert.equal(
      JSON.parse(await readFile(join(outputDirectory, 'bundle.json'), 'utf8'))
        .scenario,
      'implement',
    );
  } finally {
    await cleanupGoldenRun(run);
  }
});

test('rejects invalid arguments and unsafe output locations', async () => {
  assert.throws(
    () => parseCollectorArgs(['--worktree', '/tmp/example']),
    /Missing required --manifest/,
  );
  assert.throws(
    () =>
      parseCollectorArgs([
        '--worktree',
        '/tmp/example',
        '--worktree',
        '/tmp/other',
      ]),
    /Repeated collector argument/,
  );
  assert.throws(
    () =>
      parseCollectorArgs([
        '--worktree',
        '/tmp/example',
        '--manifest',
        '/tmp/manifest',
        '--out',
        '/tmp/out',
        '--unknown',
        'value',
      ]),
    /Unknown collector argument/,
  );

  const run = await createGoldenRun();
  try {
    await assert.rejects(
      () =>
        collectEvidence({
          manifestPath: run.manifestPath,
          outDirectory: join(run.worktreePath, 'evidence'),
          worktreePath: run.worktreePath,
        }),
      EvidenceCollectionError,
    );

    const mismatchedManifest = {
      ...run.manifest,
      worktreePath: join(run.repository, 'not-the-worktree'),
    };
    await writeFile(
      run.manifestPath,
      `${JSON.stringify(mismatchedManifest)}\n`,
    );
    await assert.rejects(
      () =>
        collectEvidence({
          manifestPath: run.manifestPath,
          outDirectory: join(run.repository, 'evidence'),
          worktreePath: run.worktreePath,
        }),
      /Manifest worktreePath (?:is not readable|does not match --worktree)/,
    );
  } finally {
    await cleanupGoldenRun(run);
  }
});
