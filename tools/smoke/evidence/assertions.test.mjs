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

function reviewEvidence(scope) {
  const runId = `${scope}-gate`;
  const path = `reviews/${scope}-review.md`;
  return {
    gate: {
      artifactPath: path,
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
      outcome: 'review_completed_gate_passed',
      project: 'smoke-fixture',
      runId,
      runtime: 'claude',
      scope,
      status: 'ok',
      target: 'claude-fable',
    },
    review: {
      frontmatter: {
        oat_gate_run_id: runId,
        oat_gate_runtime: 'claude',
        oat_gate_target: 'claude-fable',
        oat_invocation_model: 'fable',
        oat_invocation_reasoning_effort: 'provider-default',
        oat_invocation_source: 'exec-target-config',
        oat_project: 'smoke-fixture',
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
      status: 'received',
      type: 'code',
    },
  };
}

function productionShape(bundle) {
  const scenario = bundle.scenario;
  const reviewScopes = [
    ...(scenario === 'plan-review' || scenario === 'full' ? ['plan'] : []),
    ...(scenario === 'implement' || scenario === 'full'
      ? ['p01', 'p02', 'p03']
      : []),
    ...(scenario === 'full' ? ['final'] : []),
  ];
  const evidence = reviewScopes.map(reviewEvidence);
  const taskCommits = taskIds.map((taskId, index) => ({
    files: [`workspace/logs/${taskId.slice(0, 3)}.log`],
    parents: index === 0 ? [] : [`task-${index}`],
    sha: `task-${index + 1}`,
    subject: `feat(${taskId}): append fixture marker`,
  }));
  const reviewCommits = evidence.map((entry, index) => ({
    files: [
      `.oat/projects/smoke-fixture/${entry.review.path}`,
      '.oat/projects/smoke-fixture/plan.md',
    ],
    parents: [],
    sha: `review-${index + 1}`,
    subject: `chore: receive ${entry.review.frontmatter.oat_review_scope} review`,
  }));
  const transitionCommits = [
    {
      files: [
        '.oat/projects/smoke-fixture/plan.md',
        '.oat/projects/smoke-fixture/state.md',
      ],
      parents: [],
      sha: 'transition-reviewed',
      subject: 'chore: record reviewed state',
    },
    {
      files: [
        '.oat/projects/smoke-fixture/plan.md',
        '.oat/projects/smoke-fixture/state.md',
      ],
      parents: [],
      sha: 'transition-ready',
      subject: 'chore: record implementation-ready state',
    },
  ];

  return {
    ...bundle,
    dispatches:
      scenario === 'plan-review'
        ? []
        : taskIds.map((taskId) => ({
            action: 'implementation',
            attempt: 1,
            configuredInvocation: {
              ceiling: 'sol',
              modelAxis: 'selected:terra',
              target: 'cursor-cli:terra',
            },
            launch: {
              accepted: true,
              outcome: 'completed',
              status: 'accepted',
            },
            runtimeIdentity: { status: 'not-reported' },
            scope: taskId,
            selection: { atOrBelowCeiling: true },
          })),
    fixture: {
      baselineSubstantivePlanHash: 'substantive',
      headPlanHash: 'current',
      planHash: 'current',
      reviewRows: evidence.map((entry) => entry.row),
      substantivePlanHash: 'substantive',
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
      commits: [...taskCommits, ...reviewCommits, ...transitionCommits],
      currentBranchCommits: taskCommits,
    },
    manifest: {
      ...bundle.manifest,
      ownershipJournal: {
        resources: [{ branch: 'smoke-p01' }, { branch: 'smoke-p02' }],
      },
    },
    orchestrationEvents:
      scenario === 'plan-review' || scenario === 'full'
        ? [
            {
              commitSha: 'transition-reviewed',
              event: 'state-transition',
              sequence: 1,
              to: 'reviewed',
            },
            {
              commitSha: 'transition-ready',
              event: 'state-transition',
              sequence: 2,
              to: 'implementation-ready',
            },
          ]
        : [],
    reviews: evidence.map((entry) => entry.review),
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
  bundle.git.commits.find((commit) => commit.sha === 'review-1').files = [];
  bundle.git.commits.find(
    (commit) => commit.sha === 'transition-reviewed',
  ).files = [];

  assert.deepEqual(failedIds(evaluateEvidence(bundle)), [
    'plan-review-substantive-plan-stable',
    'review-disposition-durable-plan',
    'plan-review-state-transitions',
  ]);
});

test('implement profile detects incomplete dispatch, ceiling, isolation, fan-in, review, and identity evidence', async () => {
  const bundle = await readGolden('implement');
  bundle.dispatches.pop();
  bundle.dispatches[0].selection.atOrBelowCeiling = false;
  bundle.dispatches[1].runtimeIdentity.status = 'unknown';
  bundle.fixtureLogs[0].lines.pop();
  bundle.manifest.ownershipJournal.resources[0].branch = 'nested/p01';
  bundle.git.currentBranchCommits.unshift(
    bundle.git.currentBranchCommits.pop(),
  );
  bundle.gates[0].corroboration = {};
  bundle.git.commits.find((commit) => commit.sha === 'review-1').files = [];

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
    () => evaluateEvidence({ scenario: 'unknown' }),
    /Unknown evidence scenario/,
  );
  assert.throws(
    () =>
      evaluateEvidence({
        scenario: 'implement',
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
    assert.equal(await checkEvidenceReport(first.jsonPath), true);

    await execFileAsync(process.execPath, [
      reportPath,
      '--check',
      first.jsonPath,
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
    assert.equal(await checkEvidenceReport(fabricatedPath), false);

    const failedReport = {
      ...first.report,
      assertions: first.report.assertions.map((entry, index) =>
        index === 0 ? { ...entry, status: 'failed' } : entry,
      ),
      status: 'failed',
    };
    const failedPath = join(directory, 'failed-report.json');
    await writeFile(failedPath, JSON.stringify(failedReport));
    assert.equal(await checkEvidenceReport(failedPath), false);
    await assert.rejects(
      () =>
        execFileAsync(process.execPath, [reportPath, '--check', failedPath]),
      (error) => error.code === 1,
    );
  } finally {
    await rm(directory, { force: true, recursive: true });
  }
});

test('report CLI argument parsing fails closed', () => {
  assert.deepEqual(parseReportArgs(['--check', 'report.json']), {
    checkPath: join(process.cwd(), 'report.json'),
    mode: 'check',
  });
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
