import { execFile } from 'node:child_process';
import {
  appendFile,
  mkdir,
  readFile,
  rename,
  rm,
  writeFile,
} from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { promisify } from 'node:util';

import { writeDispatchRecord } from '../evidence/record.mjs';
import {
  registerNestedSmokeResource,
  updateSmokeManifest,
} from '../runner/journal.mjs';

const execFileAsync = promisify(execFile);
const PHASE_TASKS = Object.freeze({
  p01: ['p01-t01', 'p01-t02'],
  p02: ['p02-t01', 'p02-t02'],
  p03: ['p03-t01'],
});

async function git(args, cwd) {
  const { stdout } = await execFileAsync('git', args, {
    cwd,
    encoding: 'utf8',
  });
  return stdout.trim();
}

function invocationFor(role) {
  const optionalChild = role === 'task-worker' || role === 'recon';
  const target = optionalChild ? 'gpt-5.6-terra-medium' : 'gpt-5.6-sol-max';
  return {
    candidateTier: optionalChild ? 'balanced' : 'high',
    ceiling: 'gpt-5.6-sol-max',
    ceilingEffortAxis: 'not-applicable',
    ceilingModelAxis: 'selected:gpt-5.6-sol-max',
    effortAxis: 'not-applicable',
    modelAxis: `selected:${target}`,
    policy: 'high',
    target,
  };
}

async function recordDispatch({
  action = 'implementation',
  manifest,
  outcome = 'completed',
  role,
  scope,
}) {
  const configuredInvocation = invocationFor(role);
  const inputPath = join(
    dirname(manifest.manifestPath),
    `.deterministic-${scope}-${action}.json`,
  );
  await writeFile(
    inputPath,
    `${JSON.stringify(
      {
        action,
        attempt: 1,
        configuredInvocation,
        launch: {
          mechanism: 'deterministic-fake-provider',
          outcome,
          status: 'accepted',
        },
        ownership: {
          launcherRole: 'project-root',
          parentRequestId: manifest.runIdentity,
          parentScope: 'project',
        },
        requestId: `${manifest.runIdentity}:${scope}:${action}:${role}:1`,
        role,
        runtimeIdentity: {
          confidence: 'high',
          effort: null,
          model: configuredInvocation.target,
          producer: 'deterministic-fake-provider',
          provenance: 'runtime-observed',
        },
        schemaVersion: 2,
        scope,
        selection: {
          atOrBelowCeiling: true,
          candidatesConsidered: [configuredInvocation.target],
          reason: 'native-catalog',
        },
      },
      null,
      2,
    )}\n`,
  );
  try {
    return await writeDispatchRecord({
      inputPath,
      worktreePath: manifest.worktreePath,
    });
  } finally {
    await rm(inputPath, { force: true });
  }
}

async function createPhaseWorktree(manifest, phase) {
  const runPath = dirname(manifest.manifestPath);
  const worktreePath = join(runPath, `phase-${phase}`);
  const branch = `${manifest.branch}-${phase}`;
  await git(
    [
      '-c',
      'core.hooksPath=/dev/null',
      'worktree',
      'add',
      '-b',
      branch,
      worktreePath,
      manifest.baselineCommitSha,
    ],
    manifest.worktreePath,
  );
  await registerNestedSmokeResource({
    manifestPath: manifest.manifestPath,
    markerPath: join(worktreePath, '.oat/smoke-bootstrap.json'),
    worktreePath,
  });
  return { branch, phase, worktreePath };
}

async function commitTask(worktreePath, taskId) {
  const phase = taskId.slice(0, 3);
  const logPath = join(worktreePath, 'workspace/logs', `${phase}.log`);
  await appendFile(logPath, `${taskId} completed\n`);
  await git(['add', '--', relative(worktreePath, logPath)], worktreePath);
  await git(
    [
      '-c',
      'core.hooksPath=/dev/null',
      'commit',
      '-m',
      `feat(${taskId}): append fixture marker`,
    ],
    worktreePath,
  );
}

async function mergePhase(manifest, phaseWorktree) {
  await git(
    [
      '-c',
      'core.hooksPath=/dev/null',
      'merge',
      '--no-ff',
      phaseWorktree.branch,
      '-m',
      `merge ${phaseWorktree.phase}`,
    ],
    manifest.worktreePath,
  );
}

function gateRecord(manifest, runId) {
  const invocation = {
    model: 'deterministic-fake',
    reasoningEffort: 'provider-default',
    runId,
    runtime: manifest.gateRuntime,
    source: 'exec-target-config',
    targetId: manifest.gateTarget,
  };
  return {
    artifactPath: '.oat/projects/smoke-fixture/reviews/final-review.md',
    blocking: false,
    corroboration: {
      actual: {
        artifactProject: '.oat/projects/smoke-fixture',
        invocation,
        normalizedArtifactProject: '.oat/projects/smoke-fixture',
      },
      expected: {
        invocation,
        project: '.oat/projects/smoke-fixture',
      },
      invocation: 'matched',
      project: 'matched',
      run: 'matched',
    },
    dispatchReport: { gateInvocation: invocation },
    gateInvocation: invocation,
    invocation: 'gate',
    outcome: 'review_completed_gate_passed',
    project: '.oat/projects/smoke-fixture',
    receiveEligible: true,
    runId,
    scope: 'final',
    status: 'ok',
    target: manifest.gateTarget,
  };
}

async function completeFinalGate(manifest) {
  const runId = 'deterministic-final-gate';
  const reviewsPath = join(manifest.fixtureProjectPath, 'reviews');
  const activePath = join(reviewsPath, 'final-review.md');
  const archivedPath = join(reviewsPath, 'archived', 'final-review.md');
  const gateDirectory = join(manifest.worktreePath, 'workspace/evidence/gates');
  await mkdir(reviewsPath, { recursive: true });
  await mkdir(gateDirectory, { recursive: true });
  await writeFile(
    activePath,
    `---\noat_review_scope: final\noat_review_type: code\noat_review_invocation: gate\noat_project: .oat/projects/smoke-fixture\noat_gate_run_id: ${runId}\noat_gate_target: ${manifest.gateTarget}\noat_gate_runtime: ${manifest.gateRuntime}\noat_invocation_model: deterministic-fake\noat_invocation_reasoning_effort: provider-default\noat_invocation_source: exec-target-config\n---\n\n# Deterministic Final Review\n\nNo findings.\n`,
  );
  await writeFile(
    join(gateDirectory, 'final.json'),
    `${JSON.stringify(gateRecord(manifest, runId), null, 2)}\n`,
  );
  await git(
    ['add', '--', relative(manifest.worktreePath, activePath)],
    manifest.worktreePath,
  );
  await git(
    [
      '-c',
      'core.hooksPath=/dev/null',
      'commit',
      '-m',
      'chore: record deterministic final review',
    ],
    manifest.worktreePath,
  );

  await mkdir(dirname(archivedPath), { recursive: true });
  await rename(activePath, archivedPath);
  const planPath = join(manifest.fixtureProjectPath, 'plan.md');
  const plan = await readFile(planPath, 'utf8');
  const updatedPlan = plan.replace(
    /^\| final\s+\| code\s+\| pending \| -\s+\| -\s+\|$/mu,
    '| final | code | passed | 2026-07-12 | reviews/archived/final-review.md |',
  );
  if (updatedPlan === plan) {
    throw new Error(
      'Deterministic gate could not update the final review row.',
    );
  }
  await writeFile(planPath, updatedPlan);
  await git(
    ['add', '--', relative(manifest.worktreePath, planPath)],
    manifest.worktreePath,
  );
  await git(
    ['add', '-u', '--', relative(manifest.worktreePath, activePath)],
    manifest.worktreePath,
  );
  await git(
    [
      '-c',
      'core.hooksPath=/dev/null',
      'commit',
      '-m',
      'chore: receive deterministic final review',
    ],
    manifest.worktreePath,
  );
}

async function completePhaseReview(manifest, scope) {
  const reviewPath = join(
    manifest.fixtureProjectPath,
    'reviews',
    `${scope}-review.md`,
  );
  const planPath = join(manifest.fixtureProjectPath, 'plan.md');
  await mkdir(dirname(reviewPath), { recursive: true });
  await writeFile(
    reviewPath,
    `---\noat_review_scope: ${scope}\noat_review_type: code\noat_review_invocation: auto\noat_project: .oat/projects/smoke-fixture\n---\n\n# Deterministic ${scope} Review\n\nNo findings.\n`,
  );
  const plan = await readFile(planPath, 'utf8');
  const updatedPlan = plan.replace(
    new RegExp(
      `^\\| ${scope}\\s+\\| code\\s+\\| pending \\| -\\s+\\| -\\s+\\|$`,
      'mu',
    ),
    `| ${scope} | code | passed | 2026-07-12 | reviews/${scope}-review.md |`,
  );
  if (updatedPlan === plan) {
    throw new Error(
      `Deterministic phase review could not update the ${scope} row.`,
    );
  }
  await writeFile(planPath, updatedPlan);
  await git(
    [
      'add',
      '--',
      relative(manifest.worktreePath, reviewPath),
      relative(manifest.worktreePath, planPath),
    ],
    manifest.worktreePath,
  );
  await git(
    [
      '-c',
      'core.hooksPath=/dev/null',
      'commit',
      '-m',
      `chore: record deterministic ${scope} review`,
    ],
    manifest.worktreePath,
  );
}

export async function runDeterministicProvider({
  failureMode = process.env.OAT_SMOKE_DETERMINISTIC_FAILURE ?? null,
  worktreePath = process.cwd(),
} = {}) {
  const marker = JSON.parse(
    await readFile(join(worktreePath, '.oat/smoke-bootstrap.json'), 'utf8'),
  );
  let manifest = JSON.parse(await readFile(marker.manifestPath, 'utf8'));
  await updateSmokeManifest(marker.manifestPath, (current) => ({
    ...current,
    deterministic: { failureMode, status: 'running' },
  }));

  try {
    if (manifest.appliedScenario !== 'implement') {
      throw new Error(
        'Deterministic provider currently supports the implement scenario only.',
      );
    }
    const phaseWorktrees = await Promise.all(
      ['p01', 'p02'].map((phase) => createPhaseWorktree(manifest, phase)),
    );
    manifest = JSON.parse(await readFile(marker.manifestPath, 'utf8'));
    if (failureMode === 'bootstrap') {
      throw new Error('Injected deterministic child readiness failure.');
    }

    for (const phaseWorktree of phaseWorktrees) {
      const injectedFailure =
        failureMode === 'post-acceptance' && phaseWorktree.phase === 'p01';
      await recordDispatch({
        manifest,
        outcome: injectedFailure ? 'failed' : 'completed',
        role: 'phase-implementer',
        scope: phaseWorktree.phase,
      });
      if (injectedFailure) {
        throw new Error('Injected accepted phase implementer failure.');
      }
      for (const taskId of PHASE_TASKS[phaseWorktree.phase]) {
        await commitTask(phaseWorktree.worktreePath, taskId);
      }
    }
    for (const phaseWorktree of phaseWorktrees) {
      await mergePhase(manifest, phaseWorktree);
    }

    await recordDispatch({
      manifest,
      role: 'phase-implementer',
      scope: 'p03',
    });
    await commitTask(manifest.worktreePath, 'p03-t01');
    for (const scope of ['p01', 'p02', 'p03']) {
      await recordDispatch({
        action: 'review',
        manifest,
        role: 'reviewer',
        scope,
      });
      await completePhaseReview(manifest, scope);
    }
    await completeFinalGate(manifest);
    await updateSmokeManifest(marker.manifestPath, (current) => ({
      ...current,
      deterministic: { failureMode: null, status: 'completed' },
    }));
  } catch (error) {
    await updateSmokeManifest(marker.manifestPath, (current) => ({
      ...current,
      deterministic: {
        error: error instanceof Error ? error.message : String(error),
        failureMode,
        status: 'failed',
      },
    }));
    throw error;
  }
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  runDeterministicProvider().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : error}\n`);
    process.exitCode = 1;
  });
}
