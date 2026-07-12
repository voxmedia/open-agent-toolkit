import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';
import { promisify } from 'node:util';

import { evaluateEvidence } from './assertions.mjs';
import {
  collectEvidence,
  EvidenceCollectionError,
  normalizeRuntimeIdentity,
  parseCollectorArgs,
} from './collect.mjs';
import { writeDispatchRecord, writeStateTransitionRecord } from './record.mjs';
import { checkEvidenceReport, emitEvidenceReport } from './report.mjs';

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
    join(evidenceDirectory, '../fixture/project/plan.md'),
    join(fixtureProjectPath, 'plan.md'),
  );
  await cp(
    join(evidenceDirectory, '../fixture/project/state.md'),
    join(fixtureProjectPath, 'state.md'),
  );
  await cp(
    join(goldenDirectory, 'workspace'),
    join(worktreePath, 'workspace'),
    {
      recursive: true,
    },
  );
  const gateDirectory = join(worktreePath, 'workspace/evidence/gates');
  await mkdir(gateDirectory, { recursive: true });
  await writeFile(
    join(gateDirectory, 'p03.json'),
    `${JSON.stringify(
      {
        artifactPath: '.oat/projects/smoke-fixture/reviews/p03-review.md',
        blocking: false,
        corroboration: {
          actual: {
            artifactProject: 'smoke-fixture',
            invocation: {
              model: 'fable',
              reasoningEffort: 'provider-default',
              runId: 'golden-gate-run',
              runtime: 'claude',
              source: 'exec-target-config',
              targetId: 'claude-fable-skip-permissions',
            },
            normalizedArtifactProject: 'smoke-fixture',
          },
          expected: {
            invocation: {
              model: 'fable',
              reasoningEffort: 'provider-default',
              runId: 'golden-gate-run',
              runtime: 'claude',
              source: 'exec-target-config',
              targetId: 'claude-fable-skip-permissions',
            },
            project: '.oat/projects/smoke-fixture',
          },
          invocation: 'matched',
          project: 'matched',
          run: 'matched',
        },
        gateInvocation: {
          model: 'fable',
          reasoningEffort: 'provider-default',
          runId: 'golden-gate-run',
          runtime: 'claude',
          source: 'exec-target-config',
          targetId: 'claude-fable-skip-permissions',
        },
        invocation: 'gate',
        outcome: 'review_completed_gate_passed',
        project: '.oat/projects/smoke-fixture',
        receiveEligible: true,
        runId: 'golden-gate-run',
        scope: 'p03',
        status: 'ok',
        target: 'claude-fable-skip-permissions',
      },
      null,
      2,
    )}\n`,
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

test('runtime identity requires independently observed provenance', () => {
  assert.deepEqual(
    normalizeRuntimeIdentity({
      confidence: 'low',
      model: 'claimed-model',
      producer: 'claimed-producer',
      provenance: 'self-reported',
    }),
    {
      confidence: 'not-reported',
      effort: null,
      model: null,
      producer: null,
      provenance: 'not-reported',
      status: 'not-reported',
    },
  );
});

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
      'p01-t03',
      'p02-t01',
      'p02-t02',
      'p02-t03',
      'p03-t01',
      'p03-t02',
      'p03-t03',
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
      provenance: 'runtime-observed',
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
          oat_project: 'smoke-fixture',
          oat_review_invocation: 'gate',
          oat_review_scope: 'p03',
          oat_review_type: 'code',
        },
        path: 'reviews/p03-review.md',
      },
    ]);
    assert.deepEqual(bundle.gates, [
      {
        artifactPath: 'reviews/p03-review.md',
        blocking: false,
        configuredInvocation: {
          effort: 'provider-default',
          model: 'fable',
          source: 'exec-target-config',
        },
        corroboration: {
          invocation: 'matched',
          project: 'matched',
          run: 'matched',
        },
        invocation: 'gate',
        invocationConsistent: true,
        outcome: 'review_completed_gate_passed',
        projectName: 'smoke-fixture',
        projectPath: '.oat/projects/smoke-fixture',
        receiveEligible: true,
        runId: 'golden-gate-run',
        runtime: 'claude',
        scope: 'p03',
        status: 'ok',
        target: 'claude-fable-skip-permissions',
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

test('collector output drives nine-task assertions and a bound report', async () => {
  const run = await createGoldenRun();
  const outputDirectory = join(run.repository, 'pipeline-evidence');
  const taskIds = [
    'p01-t01',
    'p01-t02',
    'p01-t03',
    'p02-t01',
    'p02-t02',
    'p02-t03',
    'p03-t01',
    'p03-t02',
    'p03-t03',
  ];
  const reviewDirectory = join(run.fixtureProjectPath, 'reviews');
  const gateDirectory = join(run.worktreePath, 'workspace/evidence/gates');

  try {
    await rm(join(run.worktreePath, 'workspace/evidence/dispatch.jsonl'));
    for (const taskId of taskIds) {
      if (taskId === 'p03-t01') {
        for (const child of run.children) {
          await git(
            ['merge', '--no-ff', child.branch, '-m', `merge ${child.branch}`],
            run.worktreePath,
          );
        }
      }
      const taskWorktree = taskId.startsWith('p01')
        ? run.children[0].path
        : taskId.startsWith('p02')
          ? run.children[1].path
          : run.worktreePath;
      const logPath = join(
        taskWorktree,
        `workspace/logs/${taskId.slice(0, 3)}.log`,
      );
      await writeFile(
        logPath,
        `${await readFile(logPath, 'utf8')}${taskId} completed\n`,
      );
      await git(
        ['add', '--', `workspace/logs/${taskId.slice(0, 3)}.log`],
        taskWorktree,
      );
      await git(
        ['commit', '-m', `feat(${taskId}): append fixture marker`],
        taskWorktree,
      );

      const inputPath = join(run.repository, `${taskId}-dispatch.json`);
      await writeFile(
        inputPath,
        JSON.stringify({
          action: 'implementation',
          attempt: 1,
          configuredInvocation: {
            ceiling: 'fixture-cursor-opaque-high',
            effortAxis: 'not-applicable',
            modelAxis: 'selected:fixture-cursor-opaque-medium',
            policy: 'high',
            target: 'fixture-cursor-opaque-medium',
          },
          launch: {
            mechanism: 'cursor-cli',
            outcome: 'completed',
            status: 'accepted',
          },
          role: 'implementer',
          runtimeIdentity: null,
          schemaVersion: 1,
          scope: taskId,
          selection: {
            atOrBelowCeiling: true,
            candidatesConsidered: ['fixture-cursor-opaque-medium'],
            reason: 'native-catalog-unsatisfying',
          },
        }),
      );
      await writeDispatchRecord({
        inputPath,
        worktreePath: run.worktreePath,
      });
    }

    for (const scope of ['p01', 'p02']) {
      const runId = `${scope}-gate-run`;
      const target = 'claude-fable-skip-permissions';
      const reviewPath = join(reviewDirectory, `${scope}-review.md`);
      await writeFile(
        reviewPath,
        `---\noat_review_scope: ${scope}\noat_review_type: code\noat_review_invocation: gate\noat_project: smoke-fixture\noat_gate_run_id: ${runId}\noat_gate_target: ${target}\noat_gate_runtime: claude\noat_invocation_model: fable\noat_invocation_reasoning_effort: provider-default\noat_invocation_source: exec-target-config\n---\n\n# ${scope} Review\n`,
      );
      await writeFile(
        join(gateDirectory, `${scope}.json`),
        JSON.stringify({
          artifactPath: `.oat/projects/smoke-fixture/reviews/${scope}-review.md`,
          blocking: false,
          corroboration: {
            actual: {
              artifactProject: 'smoke-fixture',
              invocation: {
                model: 'fable',
                reasoningEffort: 'provider-default',
                runId,
                runtime: 'claude',
                source: 'exec-target-config',
                targetId: target,
              },
              normalizedArtifactProject: 'smoke-fixture',
            },
            expected: {
              invocation: {
                model: 'fable',
                reasoningEffort: 'provider-default',
                runId,
                runtime: 'claude',
                source: 'exec-target-config',
                targetId: target,
              },
              project: '.oat/projects/smoke-fixture',
            },
            invocation: 'matched',
            project: 'matched',
            run: 'matched',
          },
          gateInvocation: {
            model: 'fable',
            reasoningEffort: 'provider-default',
            runId,
            runtime: 'claude',
            source: 'exec-target-config',
            targetId: target,
          },
          invocation: 'gate',
          outcome: 'review_completed_gate_passed',
          project: '.oat/projects/smoke-fixture',
          receiveEligible: true,
          runId,
          scope,
          status: 'ok',
          target,
        }),
      );
    }
    let plan = await readFile(join(run.fixtureProjectPath, 'plan.md'), 'utf8');
    for (const scope of ['p01', 'p02', 'p03']) {
      plan = plan.replace(
        new RegExp(
          `^\\| ${scope}\\s+\\| code\\s+\\| pending \\| -\\s+\\| -\\s+\\|$`,
          'mu',
        ),
        `| ${scope} | code | passed | 2026-07-11 | reviews/${scope}-review.md |`,
      );
    }
    await writeFile(join(run.fixtureProjectPath, 'plan.md'), plan);
    await git(
      [
        'add',
        '--',
        '.oat/projects/smoke-fixture/plan.md',
        '.oat/projects/smoke-fixture/reviews',
      ],
      run.worktreePath,
    );
    await git(
      ['commit', '-m', 'chore: receive fixture phase reviews'],
      run.worktreePath,
    );

    const { bundle, outputPath } = await collectEvidence({
      manifestPath: run.manifestPath,
      outDirectory: outputDirectory,
      worktreePath: run.worktreePath,
    });
    const assessment = evaluateEvidence(bundle);
    assert.equal(
      assessment.status,
      'passed',
      JSON.stringify(
        assessment.assertions.filter((entry) => entry.status === 'failed'),
        null,
        2,
      ),
    );
    assert.equal(assessment.summary.failed, 0);

    const result = await emitEvidenceReport({
      bundlePath: outputPath,
      outDirectory: outputDirectory,
    });
    assert.equal(result.report.status, 'passed');
    assert.equal(
      await checkEvidenceReport(result.jsonPath, {
        expectedProfile: 'implement',
      }),
      true,
    );
  } finally {
    await cleanupGoldenRun(run);
  }
});

test('collector corroborates transition states from committed artifact contents', async () => {
  const run = await createGoldenRun();
  const outputDirectory = join(run.repository, 'transition-evidence');
  const planPath = join(run.fixtureProjectPath, 'plan.md');
  const statePath = join(run.fixtureProjectPath, 'state.md');
  const reviewPath = join(run.fixtureProjectPath, 'reviews/plan-review.md');
  const gatePath = join(run.worktreePath, 'workspace/evidence/gates/plan.json');

  try {
    const runId = 'plan-gate-run';
    const target = 'claude-fable-skip-permissions';
    await writeFile(
      reviewPath,
      `---\noat_review_scope: plan\noat_review_type: artifact\noat_review_invocation: gate\noat_project: smoke-fixture\noat_gate_run_id: ${runId}\noat_gate_target: ${target}\noat_gate_runtime: claude\noat_invocation_model: fable\noat_invocation_reasoning_effort: provider-default\noat_invocation_source: exec-target-config\n---\n\n# Plan Review\n`,
    );
    await writeFile(
      gatePath,
      JSON.stringify({
        artifactPath: '.oat/projects/smoke-fixture/reviews/plan-review.md',
        blocking: false,
        corroboration: {
          actual: {
            artifactProject: 'smoke-fixture',
            invocation: {
              model: 'fable',
              reasoningEffort: 'provider-default',
              runId,
              runtime: 'claude',
              source: 'exec-target-config',
              targetId: target,
            },
            normalizedArtifactProject: 'smoke-fixture',
          },
          expected: {
            invocation: {
              model: 'fable',
              reasoningEffort: 'provider-default',
              runId,
              runtime: 'claude',
              source: 'exec-target-config',
              targetId: target,
            },
            project: '.oat/projects/smoke-fixture',
          },
          invocation: 'matched',
          project: 'matched',
          run: 'matched',
        },
        gateInvocation: {
          model: 'fable',
          reasoningEffort: 'provider-default',
          runId,
          runtime: 'claude',
          source: 'exec-target-config',
          targetId: target,
        },
        invocation: 'gate',
        outcome: 'review_completed_gate_passed',
        project: '.oat/projects/smoke-fixture',
        receiveEligible: true,
        runId,
        scope: 'plan',
        status: 'ok',
        target,
      }),
    );

    let plan = await readFile(planPath, 'utf8');
    plan = plan.replace(
      /^\| plan\s+\| artifact \| pending \| -\s+\| -\s+\|$/mu,
      '| plan | artifact | passed | 2026-07-11 | reviews/plan-review.md |',
    );
    await writeFile(planPath, plan);
    await writeFile(
      statePath,
      `${await readFile(statePath, 'utf8')}\nPlan review received.\n`,
    );
    await git(
      [
        'add',
        '--',
        '.oat/projects/smoke-fixture/plan.md',
        '.oat/projects/smoke-fixture/state.md',
        '.oat/projects/smoke-fixture/reviews/plan-review.md',
      ],
      run.worktreePath,
    );
    await git(
      ['commit', '-m', 'chore: record reviewed fixture plan'],
      run.worktreePath,
    );
    const reviewedSha = await git(['rev-parse', 'HEAD'], run.worktreePath);

    plan = (await readFile(planPath, 'utf8'))
      .replace(/^oat_status: in_progress$/mu, 'oat_status: complete')
      .replace(
        /^oat_ready_for: null$/mu,
        'oat_ready_for: oat-project-implement',
      );
    let state = await readFile(statePath, 'utf8');
    state = state.replace(/^oat_phase: plan$/mu, 'oat_phase: implement');
    await writeFile(planPath, plan);
    await writeFile(statePath, `${state}\nImplementation ready.\n`);
    await git(
      [
        'add',
        '--',
        '.oat/projects/smoke-fixture/plan.md',
        '.oat/projects/smoke-fixture/state.md',
      ],
      run.worktreePath,
    );
    await git(
      ['commit', '-m', 'chore: mark fixture implementation ready'],
      run.worktreePath,
    );
    const readySha = await git(['rev-parse', 'HEAD'], run.worktreePath);

    for (const [sequence, from, to, commitSha] of [
      [1, 'pre-review', 'reviewed', reviewedSha],
      [2, 'reviewed', 'implementation-ready', readySha],
    ]) {
      const inputPath = join(run.repository, `transition-${sequence}.json`);
      await writeFile(
        inputPath,
        JSON.stringify({
          commitSha,
          event: 'state-transition',
          from,
          schemaVersion: 1,
          sequence,
          to,
        }),
      );
      await writeStateTransitionRecord({
        inputPath,
        worktreePath: run.worktreePath,
      });
    }

    const manifest = {
      ...run.manifest,
      appliedScenario: 'plan-review',
    };
    await writeFile(run.manifestPath, JSON.stringify(manifest));
    const { bundle } = await collectEvidence({
      manifestPath: run.manifestPath,
      outDirectory: outputDirectory,
      worktreePath: run.worktreePath,
    });
    assert.deepEqual(
      bundle.orchestrationEvents
        .filter((event) => event.event === 'state-transition')
        .map((event) => [
          event.observedFrom,
          event.observedTo,
          event.reachableFromHead,
          event.contentChanged,
        ]),
      [
        ['pre-review', 'reviewed', true, true],
        ['reviewed', 'implementation-ready', true, true],
      ],
    );
    assert.equal(evaluateEvidence(bundle).status, 'passed');
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

test('rejects symlink input escapes and invalid Git identifiers', async () => {
  const run = await createGoldenRun();
  const dispatchPath = join(
    run.worktreePath,
    'workspace/evidence/dispatch.jsonl',
  );
  const outsidePath = join(run.repository, 'outside-dispatch.jsonl');

  try {
    await rm(dispatchPath);
    await writeFile(outsidePath, '{}\n');
    await symlink(outsidePath, dispatchPath);
    await assert.rejects(
      () =>
        collectEvidence({
          manifestPath: run.manifestPath,
          outDirectory: join(run.repository, 'escaped-evidence'),
          worktreePath: run.worktreePath,
        }),
      /escaped its allowed root/,
    );

    await rm(dispatchPath);
    const invalidManifest = { ...run.manifest, branch: '--all' };
    await writeFile(run.manifestPath, `${JSON.stringify(invalidManifest)}\n`);
    await assert.rejects(
      () =>
        collectEvidence({
          manifestPath: run.manifestPath,
          outDirectory: join(run.repository, 'invalid-ref-evidence'),
          worktreePath: run.worktreePath,
        }),
      /Invalid manifest branch/,
    );
  } finally {
    await cleanupGoldenRun(run);
  }
});
