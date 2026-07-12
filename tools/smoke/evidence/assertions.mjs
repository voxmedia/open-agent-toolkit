const SCENARIOS = new Set(['plan-review', 'implement', 'full']);
const EXPECTED_TASK_IDS = [
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

export class EvidenceAssertionError extends Error {
  constructor(message) {
    super(message);
    this.name = 'EvidenceAssertionError';
  }
}

function isPlainObject(value) {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

function assertion(id, description, passed, evidence, severity = 'important') {
  return {
    description,
    evidence,
    id,
    severity,
    status: passed ? 'passed' : 'failed',
  };
}

function events(bundle, name) {
  return (bundle.orchestrationEvents ?? []).filter(
    (event) => event.event === name,
  );
}

function matchingGate(bundle, review) {
  const fields = review.frontmatter ?? {};
  return (bundle.gates ?? []).find(
    (gate) =>
      gate.runId === fields.oat_gate_run_id &&
      gate.target === fields.oat_gate_target &&
      gate.runtime === fields.oat_gate_runtime &&
      gate.project === fields.oat_project &&
      gate.scope === fields.oat_review_scope &&
      gate.invocation === fields.oat_review_invocation &&
      gate.configuredInvocation?.model === fields.oat_invocation_model &&
      gate.configuredInvocation?.effort ===
        fields.oat_invocation_reasoning_effort &&
      gate.configuredInvocation?.source === fields.oat_invocation_source &&
      gate.artifactPath === review.path &&
      gate.corroboration?.run === 'matched' &&
      gate.corroboration?.project === 'matched' &&
      gate.corroboration?.invocation === 'matched',
  );
}

function reviewAssertions(bundle, requiredScopes, suffix) {
  const reviews = bundle.reviews ?? [];
  const reviewRows = bundle.fixture?.reviewRows ?? [];
  const matchedScopes = requiredScopes.filter((scope) => {
    const review = reviews.find(
      (candidate) =>
        candidate.frontmatter?.oat_review_scope === scope &&
        candidate.frontmatter?.oat_review_invocation === 'gate',
    );
    return review && matchingGate(bundle, review);
  });
  const durableScopes = requiredScopes.filter((scope) => {
    const review = reviews.find(
      (candidate) => candidate.frontmatter?.oat_review_scope === scope,
    );
    const row = reviewRows.find((candidate) => candidate.scope === scope);
    const committed = (bundle.git?.commits ?? []).some((commit) =>
      commit.files?.some((file) => file.endsWith(review?.path ?? '\0')),
    );
    return (
      review &&
      row &&
      bundle.fixture?.headPlanHash === bundle.fixture?.planHash &&
      ['passed', 'received'].includes(row.status) &&
      row.artifact !== '-' &&
      committed
    );
  });
  return [
    assertion(
      `review-gate-corroborated-${suffix}`,
      'Every required gate review exactly matches gate-owned invocation and corroboration evidence.',
      matchedScopes.length === requiredScopes.length,
      { matchedScopes, requiredScopes },
    ),
    assertion(
      `review-disposition-durable-${suffix}`,
      'Every required review has a durable artifact commit and terminal plan row.',
      durableScopes.length === requiredScopes.length,
      { durableScopes, requiredScopes },
    ),
  ];
}

function planReviewAssertions(bundle) {
  const transitions = events(bundle, 'state-transition').sort(
    (left, right) => left.sequence - right.sequence,
  );
  const observedStates = transitions.map((event) => event.to);
  const expectedStates = ['reviewed', 'implementation-ready'];
  const planStable =
    bundle.fixture?.baselineSubstantivePlanHash ===
      bundle.fixture?.substantivePlanHash &&
    JSON.stringify(bundle.fixture?.taskIds) ===
      JSON.stringify(EXPECTED_TASK_IDS);
  const commits = new Map(
    (bundle.git?.commits ?? []).map((commit) => [commit.sha, commit]),
  );
  const transitionsAtomic =
    JSON.stringify(observedStates) === JSON.stringify(expectedStates) &&
    transitions.every((event) => {
      const commit = commits.get(event.commitSha);
      return (
        commit &&
        commit.files.some((file) => file.endsWith('/plan.md')) &&
        commit.files.some((file) => file.endsWith('/state.md'))
      );
    });

  return [
    assertion(
      'plan-review-substantive-plan-stable',
      'Plan hash, task IDs, and parallel groups are unchanged across resume.',
      planStable,
      {
        baselineSubstantivePlanHash:
          bundle.fixture?.baselineSubstantivePlanHash ?? null,
        substantivePlanHash: bundle.fixture?.substantivePlanHash ?? null,
        taskIds: bundle.fixture?.taskIds ?? [],
      },
    ),
    ...reviewAssertions(bundle, ['plan'], 'plan'),
    assertion(
      'plan-review-state-transitions',
      'Pre-review state advances atomically through reviewed to implementation-ready.',
      transitionsAtomic,
      { expectedStates, transitions },
    ),
  ];
}

function implementAssertions(bundle, { includeFinal = false } = {}) {
  const taskIds = bundle.fixture?.taskIds ?? [];
  const implementationDispatches = (bundle.dispatches ?? []).filter(
    (dispatch) => dispatch.action === 'implementation',
  );
  const launchFailures = [];
  const targetSelectionFailures = [];
  for (const taskId of EXPECTED_TASK_IDS) {
    const attempts = implementationDispatches
      .filter((dispatch) => dispatch.scope === taskId)
      .sort((left, right) => left.attempt - right.attempt);
    const accepted = attempts.filter(
      (dispatch) => dispatch.launch?.accepted === true,
    );
    const acceptedIndex = attempts.findIndex(
      (dispatch) => dispatch.launch?.accepted === true,
    );
    if (
      accepted.length !== 1 ||
      accepted[0]?.launch?.outcome !== 'completed' ||
      attempts.slice(acceptedIndex + 1).length > 0 ||
      attempts
        .slice(0, Math.max(acceptedIndex, 0))
        .some(
          (dispatch) =>
            dispatch.launch?.status !== 'pre-start-rejected' ||
            dispatch.launch?.outcome !== 'rejected',
        )
    ) {
      launchFailures.push(taskId);
    }
    const selected = accepted[0];
    if (
      !selected ||
      selected.selection?.atOrBelowCeiling !== true ||
      !selected.configuredInvocation?.target ||
      !selected.configuredInvocation?.modelAxis ||
      !selected.configuredInvocation?.ceiling
    ) {
      targetSelectionFailures.push(taskId);
    }
  }
  const invalidRuntimeIdentity = implementationDispatches
    .filter(
      (dispatch) =>
        !['reported', 'not-reported'].includes(
          dispatch.runtimeIdentity?.status,
        ),
    )
    .map((dispatch) => dispatch.scope);
  const markers = new Map(
    (bundle.fixtureLogs ?? []).map((log) => [
      log.phase,
      log.lines.map((line) => line.line),
    ]),
  );
  const markerFailures = EXPECTED_TASK_IDS.filter((taskId) => {
    const phase = taskId.slice(0, 3);
    return (
      markers.get(phase)?.filter((line) => line === `${taskId} completed`)
        .length !== 1
    );
  });
  const commitFailures = EXPECTED_TASK_IDS.filter((taskId) => {
    const matches = (bundle.git?.commits ?? []).filter(
      (commit) =>
        commit.subject === `feat(${taskId}): append fixture marker` &&
        commit.files?.includes(`workspace/logs/${taskId.slice(0, 3)}.log`),
    );
    return matches.length !== 1;
  });
  const journalBranches =
    bundle.manifest?.ownershipJournal?.resources?.map(
      (resource) => resource.branch,
    ) ?? [];
  const isolation =
    journalBranches.length >= 2 &&
    new Set(journalBranches).size === journalBranches.length &&
    journalBranches.every(
      (branch) => typeof branch === 'string' && !branch.includes('/'),
    );
  const currentSubjects = (bundle.git?.currentBranchCommits ?? []).map(
    (commit) => commit.subject,
  );
  const indexes = Object.fromEntries(
    EXPECTED_TASK_IDS.map((taskId) => [
      taskId,
      currentSubjects.indexOf(`feat(${taskId}): append fixture marker`),
    ]),
  );
  const dependencyIndexes = EXPECTED_TASK_IDS.filter(
    (taskId) => !taskId.startsWith('p03'),
  ).map((taskId) => indexes[taskId]);
  const fanInIndexes = EXPECTED_TASK_IDS.filter((taskId) =>
    taskId.startsWith('p03'),
  ).map((taskId) => indexes[taskId]);
  const fanIn =
    [...dependencyIndexes, ...fanInIndexes].every((index) => index >= 0) &&
    Math.max(...dependencyIndexes) < Math.min(...fanInIndexes);
  const requiredReviewScopes = includeFinal
    ? ['p01', 'p02', 'p03', 'final']
    : ['p01', 'p02', 'p03'];

  return [
    assertion(
      'implement-dispatch-completeness',
      'Every one of the nine fixture tasks has exactly one accepted completed launch.',
      JSON.stringify(taskIds) === JSON.stringify(EXPECTED_TASK_IDS) &&
        launchFailures.length === 0,
      { failingTasks: launchFailures, taskIds },
    ),
    assertion(
      'implement-exact-target-within-ceiling',
      'Every task records an exact selected target at or below the named ceiling.',
      implementationDispatches.length > 0 &&
        targetSelectionFailures.length === 0,
      { failingScopes: targetSelectionFailures },
    ),
    assertion(
      'implement-fixture-markers-and-commits',
      'Every task has exactly one fixture marker and one exact task commit.',
      markerFailures.length === 0 && commitFailures.length === 0,
      { commitFailures, markerFailures },
    ),
    assertion(
      'implement-parallel-isolation',
      'Parallel phases used disjoint writes, separate worktrees, and flat branch names.',
      isolation,
      { journalBranches },
    ),
    assertion(
      'implement-fan-in-reconciliation',
      'Fan-in completed after all declared dependencies.',
      fanIn,
      { indexes },
    ),
    ...reviewAssertions(
      bundle,
      requiredReviewScopes,
      includeFinal ? 'full' : 'implementation',
    ),
    assertion(
      'implement-runtime-identity-status',
      'Runtime identity is recorded or explicitly marked not-reported.',
      implementationDispatches.length > 0 &&
        invalidRuntimeIdentity.length === 0,
      { invalidScopes: invalidRuntimeIdentity },
    ),
  ];
}

function commonAssertions(bundle) {
  return [
    assertion(
      'manifest-ready',
      'Provisioning manifest is ready for the selected scenario.',
      bundle.manifest?.provisioningState === 'ready' &&
        bundle.manifest?.readiness?.status === 'ready' &&
        bundle.manifest?.appliedScenario === bundle.scenario,
      {
        appliedScenario: bundle.manifest?.appliedScenario ?? null,
        provisioningState: bundle.manifest?.provisioningState ?? null,
        readiness: bundle.manifest?.readiness ?? null,
      },
    ),
  ];
}

function negativeControlAssertions(bundle) {
  const kind = bundle.control?.kind;
  if (kind === 'unavailable-target') {
    const harness = bundle.control.harness;
    const selectedHarnessStatus =
      bundle.preflight?.harnesses?.[harness]?.installed?.result ??
      bundle.preflight?.selectedHarnessStatus;
    const provisioningEvidence = bundle.provisioningEvidence ?? {
      branches: [],
      manifests: bundle.manifest ? ['present'] : [],
      worktrees: [],
    };
    const noProvisioning =
      bundle.preflight?.status === 'blocked' &&
      bundle.preflight?.selectedHarness === harness &&
      selectedHarnessStatus === 'unavailable' &&
      provisioningEvidence.branches?.length === 0 &&
      provisioningEvidence.manifests?.length === 0 &&
      provisioningEvidence.worktrees?.length === 0;
    return [
      assertion(
        'negative-unavailable-target-no-provisioning',
        'An unavailable selected target exits before provisioning.',
        noProvisioning,
        {
          preflight: bundle.preflight ?? null,
          provisioningEvidence,
        },
        'critical',
      ),
    ];
  }

  if (kind === 'post-acceptance-failure') {
    const taskScope = bundle.control?.taskScope;
    const launches = (bundle.dispatches ?? [])
      .filter(
        (dispatch) =>
          dispatch.scope === taskScope && dispatch.action === 'implementation',
      )
      .sort((left, right) => left.attempt - right.attempt);
    const acceptedFailureIndex = launches.findIndex(
      (dispatch) =>
        dispatch.launch?.accepted === true &&
        dispatch.launch?.outcome === 'failed' &&
        dispatch.launch?.status === 'accepted',
    );
    const priorAttemptsValid = launches
      .slice(0, Math.max(acceptedFailureIndex, 0))
      .every(
        (dispatch) =>
          dispatch.launch?.accepted === false &&
          dispatch.launch?.status === 'pre-start-rejected' &&
          dispatch.launch?.outcome === 'rejected',
      );
    const noLaterLaunch = launches.slice(acceptedFailureIndex + 1).length === 0;
    return [
      assertion(
        'negative-no-fallback-after-acceptance',
        'An accepted child that later fails is not relaunched with another pinned target.',
        acceptedFailureIndex >= 0 && priorAttemptsValid && noLaterLaunch,
        {
          acceptedFailureIndex,
          launches: launches.map((dispatch) => ({
            accepted: dispatch.launch?.accepted ?? null,
            outcome: dispatch.launch?.outcome ?? null,
            target: dispatch.configuredInvocation?.target ?? null,
          })),
          taskScope,
        },
        'critical',
      ),
    ];
  }

  throw new EvidenceAssertionError(`Unknown negative control: ${String(kind)}`);
}

export function evaluateEvidence(bundle) {
  if (!isPlainObject(bundle)) {
    throw new EvidenceAssertionError('Evidence bundle must be an object.');
  }
  if (!SCENARIOS.has(bundle.scenario)) {
    throw new EvidenceAssertionError(
      `Unknown evidence scenario: ${String(bundle.scenario)}`,
    );
  }

  const assertions = [];
  if (bundle.control?.kind) {
    assertions.push(...negativeControlAssertions(bundle));
  } else {
    assertions.push(...commonAssertions(bundle));
    if (bundle.scenario === 'plan-review' || bundle.scenario === 'full') {
      assertions.push(...planReviewAssertions(bundle));
    }
    if (bundle.scenario === 'implement' || bundle.scenario === 'full') {
      assertions.push(
        ...implementAssertions(bundle, {
          includeFinal: bundle.scenario === 'full',
        }),
      );
    }
  }
  const uniqueAssertions = [
    ...new Map(assertions.map((entry) => [entry.id, entry])).values(),
  ];
  const failed = uniqueAssertions.filter((entry) => entry.status === 'failed');

  return {
    assertions: uniqueAssertions,
    scenario: bundle.scenario,
    schemaVersion: 1,
    status: failed.length === 0 ? 'passed' : 'failed',
    summary: {
      failed: failed.length,
      passed: uniqueAssertions.length - failed.length,
      total: uniqueAssertions.length,
    },
  };
}
