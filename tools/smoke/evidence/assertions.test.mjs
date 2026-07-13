import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { promisify } from 'node:util';

import { evaluateEvidence, EvidenceAssertionError } from './assertions.mjs';
import {
  checkEvidenceReport,
  emitEvidenceReport,
  parseReportArgs,
  renderMarkdown,
} from './report.mjs';

const execFileAsync = promisify(execFile);
const goldenDirectory = join(import.meta.dirname, 'golden/bundles');
const reportPath = join(import.meta.dirname, 'report.mjs');
const taskIds = ['p01-t01', 'p01-t02', 'p02-t01', 'p02-t02', 'p03-t01'];

function reviewEvidence(scope) {
  const runId = `${scope}-gate`;
  const activePath = `reviews/${scope}-review.md`;
  const path = `reviews/archived/${scope}-review.md`;
  const contentHash = `${scope}-review-hash`;
  return {
    gate: {
      activeArtifactPath: activePath,
      archived: true,
      artifactPath: path,
      artifactHash: contentHash,
      blocking: false,
      committedArtifact: {
        commitSha: `artifact-${scope}`,
        contentHash,
        matchesArchived: true,
      },
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
      projectPath: '.oat/projects/smoke-fixture',
      receiveCommit: { rowMatched: true, sha: `receive-${scope}` },
      receiveEligible: true,
      runId,
      runtime: 'claude',
      scope,
      status: 'ok',
      target: 'claude-fable',
    },
    review: {
      contentHash,
      frontmatter: {
        oat_gate_run_id: runId,
        oat_gate_runtime: 'claude',
        oat_gate_target: 'claude-fable',
        oat_invocation_model: 'fable',
        oat_invocation_reasoning_effort: 'provider-default',
        oat_invocation_source: 'exec-target-config',
        oat_project: '.oat/projects/smoke-fixture',
        oat_review_invocation: 'gate',
        oat_review_scope: scope,
        oat_review_type: 'code',
      },
      path,
    },
    row: {
      artifact: path,
      date: '2026-07-11',
      scope,
      status: 'passed',
      type: 'code',
    },
  };
}

function productionShape(bundle) {
  const scenario = bundle.scenario;
  const rootRequestId = 'smoke-root-request';
  const reviewScopes = [
    ...(scenario === 'plan-review' || scenario === 'full' ? ['plan'] : []),
    ...(scenario === 'implement' || scenario === 'full' ? ['final'] : []),
  ];
  const evidence = reviewScopes.map(reviewEvidence);
  const taskCommits = taskIds.map((taskId, index) => {
    const phase = taskId.slice(0, 3);
    const parent =
      taskId === 'p01-t02'
        ? 'task-1'
        : taskId === 'p02-t02'
          ? 'task-3'
          : phase === 'p03'
            ? 'merge-p02'
            : 'baseline';
    return {
      files: [`workspace/logs/${phase}.log`],
      parents: [parent],
      sha: `task-${index + 1}`,
      subject: `feat(${taskId}): append fixture marker`,
    };
  });
  const artifactCommits = evidence.map((entry) => ({
    files: [`.oat/projects/smoke-fixture/${entry.gate.activeArtifactPath}`],
    parents: [],
    sha: entry.gate.committedArtifact.commitSha,
    subject: `chore: record ${entry.review.frontmatter.oat_review_scope} review`,
  }));
  const receiveCommits = evidence.map((entry) => ({
    files: [
      `.oat/projects/smoke-fixture/${entry.gate.activeArtifactPath}`,
      '.oat/projects/smoke-fixture/plan.md',
    ],
    parents: [],
    sha: `receive-${entry.review.frontmatter.oat_review_scope}`,
    subject: `chore: receive ${entry.review.frontmatter.oat_review_scope} review`,
  }));
  const transitionCommits = [
    {
      files: [
        '.oat/projects/smoke-fixture/plan.md',
        '.oat/projects/smoke-fixture/state.md',
        '.oat/projects/smoke-fixture/implementation.md',
      ],
      parents: [],
      sha: 'transition-reviewed',
      subject: 'chore: record reviewed state',
    },
    {
      files: [
        '.oat/projects/smoke-fixture/plan.md',
        '.oat/projects/smoke-fixture/state.md',
        '.oat/projects/smoke-fixture/implementation.md',
      ],
      parents: [],
      sha: 'transition-ready',
      subject: 'chore: record implementation-ready state',
    },
  ];
  const mergeCommits = [
    {
      files: [],
      parents: ['baseline', 'task-2'],
      sha: 'merge-p01',
      subject: 'merge p01',
    },
    {
      files: [],
      parents: ['merge-p01', 'task-4'],
      sha: 'merge-p02',
      subject: 'merge p02',
    },
  ];
  const currentTaskCommits = [
    ...taskCommits.slice(0, 2),
    mergeCommits[0],
    ...taskCommits.slice(2, 4),
    mergeCommits[1],
    ...taskCommits.slice(4),
  ];

  return {
    ...bundle,
    kind: 'workflow',
    dispatches:
      scenario === 'plan-review'
        ? []
        : ['p01', 'p02', 'p03'].flatMap((phase) =>
            ['phase-implementer', 'reviewer'].map((role) => ({
              action: role === 'reviewer' ? 'review' : 'implementation',
              attempt: 1,
              configuredInvocation: {
                ceiling: 'sol',
                candidateTier: 'high',
                ceilingEffortAxis: 'not-applicable',
                ceilingModelAxis: 'selected:sol',
                effortAxis: 'not-applicable',
                modelAxis: 'selected:sol',
                policy: 'high',
                target: 'sol',
              },
              launch: {
                accepted: true,
                outcome: 'completed',
                status: 'accepted',
              },
              ownership: {
                launcherRole: 'project-root',
                parentRequestId: rootRequestId,
                parentScope: 'project',
              },
              requestId: `${phase}-${role}-request`,
              role,
              runtimeIdentity: { status: 'not-reported' },
              schemaVersion: 2,
              scope: phase,
              selection: {
                atOrBelowCeiling: true,
                candidatesConsidered: ['sol'],
                reason: 'native-catalog',
              },
            })),
          ),
    fixture: {
      baselineSubstantivePlanHash: 'substantive',
      dispatchPolicy: {
        ceilingCandidates: [{ effort: null, model: 'sol', tier: 'high' }],
        eligibleCandidates: [
          { effort: null, model: 'terra', tier: 'balanced' },
          { effort: null, model: 'sol', tier: 'high' },
        ],
        policy: 'high',
        provider: 'cursor',
      },
      headPlanHash: 'current',
      headStateHash: 'state',
      planHash: 'current',
      reviewRows: evidence.map((entry) => entry.row),
      substantivePlanHash: 'substantive',
      stateHash: 'state',
      taskIds,
    },
    fixtureLogs: ['p01', 'p02', 'p03'].map((phase) => ({
      lines: taskIds
        .filter((taskId) => taskId.startsWith(phase))
        .map((taskId, index) => ({
          line: `${taskId} completed`,
          sequence: index + 1,
        })),
      phase,
    })),
    gates: evidence.map((entry) => entry.gate),
    git: {
      branchHistories: [
        {
          ancestorBranches: [],
          branch: 'smoke-p01',
          commits: taskCommits.slice(0, 2),
          head: 'task-2',
          mergeBase: 'baseline',
          start: { parent: 'baseline', sha: 'task-1' },
        },
        {
          ancestorBranches: [],
          branch: 'smoke-p02',
          commits: taskCommits.slice(2, 4),
          head: 'task-4',
          mergeBase: 'baseline',
          start: { parent: 'baseline', sha: 'task-3' },
        },
      ],
      commits: [
        ...taskCommits,
        ...mergeCommits,
        ...artifactCommits,
        ...receiveCommits,
        ...transitionCommits,
      ],
      currentBranchCommits: [
        ...currentTaskCommits,
        ...artifactCommits,
        ...receiveCommits,
        ...transitionCommits,
      ],
    },
    manifest: {
      ...bundle.manifest,
      baselineCommitSha: 'baseline',
      ownershipJournal: {
        resources: [{ branch: 'smoke-p01' }, { branch: 'smoke-p02' }],
      },
      runIdentity: rootRequestId,
    },
    orchestrationEvents:
      scenario === 'plan-review' || scenario === 'full'
        ? [
            {
              commitSha: 'transition-reviewed',
              contentChanged: true,
              event: 'state-transition',
              from: 'pre-review',
              fromCommitSha: 'baseline',
              observedFrom: 'pre-review',
              observedTo: 'reviewed',
              reachableFromHead: true,
              sequence: 1,
              to: 'reviewed',
            },
            {
              commitSha: 'transition-ready',
              contentChanged: true,
              event: 'state-transition',
              from: 'reviewed',
              fromCommitSha: 'transition-reviewed',
              observedFrom: 'reviewed',
              observedTo: 'implementation-ready',
              reachableFromHead: true,
              sequence: 2,
              to: 'implementation-ready',
            },
          ]
        : [],
    reviews: evidence.map((entry) => entry.review),
    schemaVersion: 1,
  };
}

async function readGolden(name) {
  return productionShape(
    JSON.parse(await readFile(join(goldenDirectory, `${name}.json`), 'utf8')),
  );
}

function failedIds(report) {
  return report.assertions
    .filter((entry) => entry.status === 'failed')
    .map((entry) => entry.id);
}

test('scenario profiles pass their complete golden evidence', async () => {
  const expectations = {
    'plan-review': 5,
    implement: 9,
    full: 13,
  };

  for (const [scenario, assertionCount] of Object.entries(expectations)) {
    const report = evaluateEvidence(await readGolden(scenario));
    assert.equal(report.scenario, scenario);
    assert.equal(report.status, 'passed');
    assert.equal(report.summary.failed, 0);
    assert.equal(report.summary.total, assertionCount);
    assert.equal(
      new Set(report.assertions.map((entry) => entry.id)).size,
      assertionCount,
    );
  }
});

test('plan-review profile detects plan drift, missing durability, and non-atomic transitions', async () => {
  const bundle = await readGolden('plan-review');
  bundle.fixture.substantivePlanHash = 'drifted';
  bundle.git.currentBranchCommits.splice(
    bundle.git.currentBranchCommits.findIndex(
      (commit) => commit.sha === 'receive-plan',
    ),
    1,
  );
  bundle.orchestrationEvents[0].contentChanged = false;

  assert.deepEqual(failedIds(evaluateEvidence(bundle)), [
    'plan-review-substantive-plan-stable',
    'review-disposition-durable-plan',
    'plan-review-state-transitions',
  ]);
});

test('implement profile detects incomplete dispatch, ceiling, isolation, fan-in, review, and identity evidence', async () => {
  const bundle = await readGolden('implement');
  bundle.dispatches.pop();
  bundle.dispatches[0].configuredInvocation.target = 'above-ceiling';
  bundle.dispatches[0].configuredInvocation.modelAxis =
    'selected:above-ceiling';
  bundle.dispatches[0].selection.candidatesConsidered = ['above-ceiling'];
  bundle.dispatches[1].runtimeIdentity.status = 'unknown';
  bundle.fixtureLogs[0].lines.pop();
  bundle.manifest.ownershipJournal.resources[0].branch = 'nested/p01';
  const mergeP02 = bundle.git.currentBranchCommits.splice(
    bundle.git.currentBranchCommits.findIndex(
      (commit) => commit.sha === 'merge-p02',
    ),
    1,
  )[0];
  bundle.git.currentBranchCommits.push(mergeP02);
  bundle.gates[0].corroboration = {};
  bundle.git.currentBranchCommits.splice(
    bundle.git.currentBranchCommits.findIndex(
      (commit) => commit.sha === 'receive-p01',
    ),
    1,
  );

  assert.deepEqual(failedIds(evaluateEvidence(bundle)), [
    'implement-dispatch-completeness',
    'implement-exact-target-within-ceiling',
    'implement-fixture-markers-and-commits',
    'implement-parallel-isolation',
    'implement-fan-in-reconciliation',
    'review-gate-corroborated-implementation',
    'review-disposition-durable-implementation',
    'implement-runtime-identity-status',
  ]);
});

test('provider-specific targets preserve Codex roles and model axes separately', async () => {
  const cases = [
    {
      ceiling: { effort: null, model: 'opus', tier: 'high' },
      effortAxis: 'not-applicable',
      harness: 'claude',
      model: 'sonnet',
      provider: 'claude',
      target: 'sonnet',
    },
    {
      ceiling: { effort: 'high', model: 'gpt-5.6-sol', tier: 'high' },
      effortAxis: 'selected:medium',
      harness: 'codex',
      model: 'gpt-5.6-terra',
      provider: 'codex',
      target: 'oat-phase-implementer-gpt-5-6-terra-medium',
    },
    {
      ceiling: { effort: null, model: 'sol', tier: 'high' },
      effortAxis: 'not-applicable',
      harness: 'cursor-ide',
      model: 'terra',
      provider: 'cursor',
      target: 'terra',
    },
    {
      ceiling: { effort: null, model: 'sol', tier: 'high' },
      effortAxis: 'not-applicable',
      harness: 'cursor-cli',
      model: 'terra',
      provider: 'cursor',
      target: 'terra',
    },
  ];

  for (const entry of cases) {
    const bundle = await readGolden('implement');
    bundle.manifest.harness = entry.harness;
    bundle.fixture.dispatchPolicy = {
      ceilingCandidates: [entry.ceiling],
      eligibleCandidates: [
        {
          effort: entry.provider === 'codex' ? 'medium' : null,
          model: entry.model,
          tier: 'balanced',
        },
        entry.ceiling,
      ],
      policy: 'high',
      provider: entry.provider,
    };
    for (const dispatch of bundle.dispatches) {
      const reviewer = dispatch.role === 'reviewer';
      const model = reviewer ? entry.ceiling.model : entry.model;
      const effort = reviewer
        ? entry.ceiling.effort
        : entry.provider === 'codex'
          ? 'medium'
          : null;
      const target =
        entry.provider === 'codex'
          ? `${reviewer ? 'oat-reviewer' : 'oat-phase-implementer'}-${model.replaceAll('.', '-')}-${effort}`
          : model;
      dispatch.configuredInvocation = {
        candidateTier: reviewer ? 'high' : 'balanced',
        ceiling: `surface:${entry.ceiling.model}`,
        ceilingEffortAxis:
          entry.ceiling.effort === null
            ? 'not-applicable'
            : `selected:${entry.ceiling.effort}`,
        ceilingModelAxis: `selected:${entry.ceiling.model}`,
        effortAxis: effort === null ? 'not-applicable' : `selected:${effort}`,
        modelAxis: `selected:${model}`,
        policy: 'high',
        target,
      };
      dispatch.selection.candidatesConsidered = [target];
    }
    const targetAssertion = evaluateEvidence(bundle).assertions.find(
      (assertion) => assertion.id === 'implement-exact-target-within-ceiling',
    );
    assert.equal(targetAssertion.status, 'passed', entry.harness);
    if (entry.provider === 'codex') {
      bundle.dispatches[0].configuredInvocation.target =
        'oat-phase-implementer-unrelated-medium';
      bundle.dispatches[0].selection.candidatesConsidered = [
        'oat-phase-implementer-unrelated-medium',
      ];
      assert.equal(
        evaluateEvidence(bundle).assertions.find(
          (assertion) =>
            assertion.id === 'implement-exact-target-within-ceiling',
        ).status,
        'failed',
      );
    }
  }
});

test('optional nested dispatch is validated when present but not required', async () => {
  const bundle = await readGolden('implement');
  assert.equal(evaluateEvidence(bundle).status, 'passed');

  const optional = structuredClone(bundle.dispatches[0]);
  optional.role = 'task-worker';
  optional.scope = 'p01-t01';
  optional.ownership = {
    launcherRole: 'phase-agent',
    parentRequestId: 'p01-phase-implementer-request',
    parentScope: 'p01',
  };
  optional.requestId = 'p01-t01-task-worker-request';
  optional.configuredInvocation = {
    ...optional.configuredInvocation,
    candidateTier: 'balanced',
    modelAxis: 'selected:terra',
    target: 'terra',
  };
  optional.selection.candidatesConsidered = ['terra'];
  bundle.dispatches.push(optional);
  assert.equal(evaluateEvidence(bundle).status, 'passed');

  optional.configuredInvocation.target = 'above-ceiling';
  optional.configuredInvocation.modelAxis = 'selected:above-ceiling';
  optional.selection.candidatesConsidered = ['above-ceiling'];
  assert.equal(
    evaluateEvidence(bundle).assertions.find(
      (assertion) => assertion.id === 'implement-exact-target-within-ceiling',
    ).status,
    'failed',
  );
});

test('implement profile rejects phase-agent-owned or missing reviewer ownership', async () => {
  const phaseOwned = await readGolden('implement');
  const reviewer = phaseOwned.dispatches.find(
    (dispatch) => dispatch.scope === 'p01' && dispatch.role === 'reviewer',
  );
  reviewer.ownership = {
    launcherRole: 'phase-agent',
    parentRequestId: 'p01-phase-implementer-request',
    parentScope: 'p01',
  };
  assert.equal(
    evaluateEvidence(phaseOwned).assertions.find(
      (assertion) => assertion.id === 'implement-dispatch-completeness',
    ).status,
    'failed',
  );

  const missing = await readGolden('implement');
  delete missing.dispatches[0].ownership;
  assert.equal(
    evaluateEvidence(missing).assertions.find(
      (assertion) => assertion.id === 'implement-dispatch-completeness',
    ).status,
    'failed',
  );
});

test('retained schema-v1 implement evidence stays valid without claiming root ownership', async () => {
  const legacy = await readGolden('implement');
  for (const dispatch of legacy.dispatches) {
    delete dispatch.ownership;
    delete dispatch.requestId;
    delete dispatch.schemaVersion;
  }
  const completeness = evaluateEvidence(legacy).assertions.find(
    (assertion) => assertion.id === 'implement-dispatch-completeness',
  );
  assert.equal(completeness.status, 'passed');
  assert.equal(
    completeness.evidence.ownershipEvidence,
    'unavailable-schema-v1',
  );
  assert.match(
    completeness.description,
    /does not prove direct-root ownership/,
  );
});

test('parallel proof rejects serial ancestry, single-parent integration, and broad task commits', async () => {
  const serial = await readGolden('implement');
  serial.git.branchHistories[1].ancestorBranches.push('smoke-p01');
  assert.equal(
    evaluateEvidence(serial).assertions.find(
      (assertion) => assertion.id === 'implement-parallel-isolation',
    ).status,
    'failed',
  );

  const fastForward = await readGolden('implement');
  fastForward.git.currentBranchCommits.find(
    (commit) => commit.sha === 'merge-p01',
  ).parents = ['task-3'];
  assert.equal(
    evaluateEvidence(fastForward).assertions.find(
      (assertion) => assertion.id === 'implement-parallel-isolation',
    ).status,
    'failed',
  );

  const broadWrite = await readGolden('implement');
  broadWrite.git.commits
    .find((commit) => commit.subject.startsWith('feat(p03-t01)'))
    .files.push('unexpected.txt');
  assert.equal(
    evaluateEvidence(broadWrite).assertions.find(
      (assertion) => assertion.id === 'implement-fixture-markers-and-commits',
    ).status,
    'failed',
  );
});

test('terminal review proof rejects changed archive bytes and missing receive commits', async () => {
  const changedArchive = await readGolden('implement');
  changedArchive.gates[0].committedArtifact.matchesArchived = false;
  assert.deepEqual(
    failedIds(evaluateEvidence(changedArchive)).filter((id) =>
      id.startsWith('review-'),
    ),
    [
      'review-gate-corroborated-implementation',
      'review-disposition-durable-implementation',
    ],
  );

  const missingReceive = await readGolden('implement');
  missingReceive.git.currentBranchCommits.splice(
    missingReceive.git.currentBranchCommits.findIndex(
      (commit) => commit.sha === 'receive-final',
    ),
    1,
  );
  assert.ok(
    failedIds(evaluateEvidence(missingReceive)).includes(
      'review-disposition-durable-implementation',
    ),
  );
});

test('full profile is the deduplicated union of plan-review and implement', async () => {
  const bundle = await readGolden('full');
  const report = evaluateEvidence(bundle);
  const ids = report.assertions.map((entry) => entry.id);

  assert.equal(report.status, 'passed');
  assert.ok(ids.includes('plan-review-substantive-plan-stable'));
  assert.ok(ids.includes('implement-dispatch-completeness'));
  assert.ok(ids.includes('review-gate-corroborated-plan'));
  assert.ok(ids.includes('review-gate-corroborated-full'));
});

test('rejects unknown or malformed evidence bundles', () => {
  assert.throws(() => evaluateEvidence(null), EvidenceAssertionError);
  assert.throws(
    () => evaluateEvidence({ kind: 'control', scenario: 'implement' }),
    /schemaVersion 1/,
  );
  assert.throws(
    () =>
      evaluateEvidence({
        kind: 'workflow',
        scenario: 'unknown',
        schemaVersion: 1,
      }),
    /Unknown evidence scenario/,
  );
  assert.throws(
    () =>
      evaluateEvidence({
        kind: 'control',
        scenario: 'implement',
        schemaVersion: 1,
        control: { kind: 'unknown' },
      }),
    /Unknown negative control/,
  );
});

test('unavailable-target control proves preflight exited without provisioning', async () => {
  const bundle = JSON.parse(
    await readFile(
      join(goldenDirectory, '../negative/unavailable-target.json'),
      'utf8',
    ),
  );
  const passed = evaluateEvidence(bundle);
  assert.equal(passed.status, 'passed');
  assert.equal(
    passed.assertions[0].id,
    'negative-unavailable-target-no-provisioning',
  );
  assert.equal(passed.assertions[0].severity, 'critical');

  bundle.provisioningEvidence.manifests.push('leaked-manifest.json');
  const failed = evaluateEvidence(bundle);
  assert.equal(failed.status, 'failed');
  assert.deepEqual(failedIds(failed), [
    'negative-unavailable-target-no-provisioning',
  ]);
});

test('post-acceptance failure control rejects a second pinned launch', async () => {
  const bundle = JSON.parse(
    await readFile(
      join(goldenDirectory, '../negative/post-acceptance-failure.json'),
      'utf8',
    ),
  );
  const passed = evaluateEvidence(bundle);
  assert.equal(passed.status, 'passed');
  assert.equal(
    passed.assertions[0].id,
    'negative-no-fallback-after-acceptance',
  );
  assert.equal(passed.assertions[0].severity, 'critical');

  bundle.dispatches[0].attempt = 2;
  bundle.dispatches.unshift({
    ...structuredClone(bundle.dispatches[0]),
    attempt: 1,
    launch: {
      accepted: false,
      outcome: 'rejected',
      status: 'pre-start-rejected',
    },
  });
  assert.equal(evaluateEvidence(bundle).status, 'passed');

  bundle.dispatches.push({
    ...structuredClone(bundle.dispatches[0]),
    attempt: 3,
    configuredInvocation: {
      modelAxis: 'selected:gpt-5.6-terra-medium',
      target: 'cursor-cli:gpt-5.6-terra-medium',
    },
    launch: { accepted: true, outcome: 'completed' },
  });
  const failed = evaluateEvidence(bundle);
  assert.equal(failed.status, 'failed');
  assert.deepEqual(failedIds(failed), [
    'negative-no-fallback-after-acceptance',
  ]);
});

test('report emitters are deterministic and check mode reflects assertion status', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'oat-smoke-report-'));
  const bundlePath = join(directory, 'bundle.json');
  const outputDirectory = join(directory, 'report');

  try {
    await writeFile(
      bundlePath,
      `${JSON.stringify(await readGolden('full'), null, 2)}\n`,
    );
    const first = await emitEvidenceReport({
      bundlePath,
      outDirectory: outputDirectory,
    });
    const firstJson = await readFile(first.jsonPath, 'utf8');
    const firstMarkdown = await readFile(first.markdownPath, 'utf8');
    const second = await emitEvidenceReport({
      bundlePath,
      outDirectory: outputDirectory,
    });

    assert.equal(await readFile(second.jsonPath, 'utf8'), firstJson);
    assert.equal(await readFile(second.markdownPath, 'utf8'), firstMarkdown);
    assert.equal(renderMarkdown(first.report), firstMarkdown);
    assert.match(firstMarkdown, /\*\*Status:\*\* passed/u);
    assert.equal(
      await checkEvidenceReport(first.jsonPath, {
        expectedProfile: 'full',
      }),
      true,
    );
    assert.equal(
      await checkEvidenceReport(first.jsonPath, {
        expectedProfile: 'implement',
      }),
      false,
    );

    await execFileAsync(process.execPath, [
      reportPath,
      '--check',
      first.jsonPath,
      '--expect-profile',
      'full',
    ]);

    const fabricatedPath = join(outputDirectory, 'fabricated-report.json');
    await writeFile(
      fabricatedPath,
      JSON.stringify({
        assertions: [{ status: 'passed' }],
        bundle: first.report.bundle,
        schemaVersion: 1,
        status: 'passed',
      }),
    );
    assert.equal(
      await checkEvidenceReport(fabricatedPath, {
        expectedProfile: 'full',
      }),
      false,
    );

    const failedReport = {
      ...first.report,
      assertions: first.report.assertions.map((entry, index) =>
        index === 0 ? { ...entry, status: 'failed' } : entry,
      ),
      status: 'failed',
    };
    const failedPath = join(directory, 'failed-report.json');
    await writeFile(failedPath, JSON.stringify(failedReport));
    assert.equal(
      await checkEvidenceReport(failedPath, { expectedProfile: 'full' }),
      false,
    );
    await assert.rejects(
      () =>
        execFileAsync(process.execPath, [
          reportPath,
          '--check',
          failedPath,
          '--expect-profile',
          'full',
        ]),
      (error) => error.code === 1,
    );
  } finally {
    await rm(directory, { force: true, recursive: true });
  }
});

test('report CLI argument parsing fails closed', () => {
  assert.deepEqual(
    parseReportArgs([
      '--check',
      'report.json',
      '--expect-profile',
      'implement',
    ]),
    {
      checkPath: join(process.cwd(), 'report.json'),
      expectedProfile: 'implement',
      mode: 'check',
    },
  );
  assert.throws(() => parseReportArgs(['--check']), /Usage/);
  assert.throws(() => parseReportArgs(['--bundle', 'bundle.json']), /Usage/);
  assert.throws(
    () =>
      parseReportArgs([
        '--bundle',
        'bundle.json',
        '--out',
        'out',
        '--extra',
        'value',
      ]),
    /Unknown report argument/,
  );
});
