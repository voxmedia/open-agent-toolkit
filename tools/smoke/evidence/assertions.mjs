const SCENARIOS = new Set(['plan-review', 'implement', 'full']);
export const EXPECTED_TASK_IDS = [
  'p01-t01',
  'p01-t02',
  'p02-t01',
  'p02-t02',
  'p03-t01',
];
export const EXPECTED_PHASE_IDS = ['p01', 'p02', 'p03'];

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
  if (!review) {
    return undefined;
  }
  const fields = review.frontmatter ?? {};
  return (bundle.gates ?? []).find(
    (gate) =>
      gate.runId === fields.oat_gate_run_id &&
      gate.target === fields.oat_gate_target &&
      (!bundle.manifest?.gateTarget ||
        gate.target === bundle.manifest.gateTarget) &&
      (!bundle.manifest?.gateRuntime ||
        gate.runtime === bundle.manifest.gateRuntime) &&
      gate.runtime === fields.oat_gate_runtime &&
      gate.projectPath === fields.oat_project &&
      gate.invocationConsistent === true &&
      gate.scope === fields.oat_review_scope &&
      gate.invocation === fields.oat_review_invocation &&
      gate.configuredInvocation?.model === fields.oat_invocation_model &&
      gate.configuredInvocation?.effort ===
        fields.oat_invocation_reasoning_effort &&
      gate.configuredInvocation?.source === fields.oat_invocation_source &&
      gate.archived === true &&
      gate.artifactPath === review.path &&
      gate.artifactHash === review.contentHash &&
      gate.committedArtifact?.matchesArchived === true &&
      gate.receiveCommit?.rowMatched === true &&
      gate.status === 'ok' &&
      gate.blocking === false &&
      gate.receiveEligible === true &&
      [
        'review_completed_gate_passed',
        'review_completed_artifact_normalized_gate_passed',
      ].includes(gate.outcome) &&
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
        candidate.frontmatter?.oat_review_invocation === 'gate' &&
        matchingGate(bundle, candidate),
    );
    return Boolean(review);
  });
  const durableScopes = requiredScopes.filter((scope) => {
    const row = reviewRows.find((candidate) => candidate.scope === scope);
    const review = reviews.find(
      (candidate) =>
        candidate.frontmatter?.oat_review_scope === scope &&
        candidate.path === row?.artifact &&
        matchingGate(bundle, candidate),
    );
    const gate = matchingGate(bundle, review);
    const currentCommits = bundle.git?.currentBranchCommits ?? [];
    const artifactIndex = currentCommits.findIndex(
      (commit) => commit.sha === gate?.committedArtifact?.commitSha,
    );
    const receiveIndex = currentCommits.findIndex(
      (commit) => commit.sha === gate?.receiveCommit?.sha,
    );
    return (
      review &&
      row &&
      bundle.fixture?.headPlanHash === bundle.fixture?.planHash &&
      row.status === 'passed' &&
      row.artifact === review.path &&
      artifactIndex >= 0 &&
      receiveIndex > artifactIndex
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
  const transitionIndexes = transitions.map((event) =>
    (bundle.git?.currentBranchCommits ?? []).findIndex(
      (commit) => commit.sha === event.commitSha,
    ),
  );
  const transitionsAtomic =
    JSON.stringify(observedStates) === JSON.stringify(expectedStates) &&
    JSON.stringify(transitions.map((event) => event.from)) ===
      JSON.stringify(['pre-review', 'reviewed']) &&
    transitions.every(
      (event) =>
        event.reachableFromHead === true &&
        event.contentChanged === true &&
        event.from === event.observedFrom &&
        event.to === event.observedTo,
    ) &&
    new Set(transitions.map((event) => event.commitSha)).size === 2 &&
    transitions[0]?.fromCommitSha === bundle.manifest?.baselineCommitSha &&
    transitions[1]?.fromCommitSha === transitions[0]?.commitSha &&
    transitionIndexes.every((index) => index >= 0) &&
    transitionIndexes[0] < transitionIndexes[1];

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
      { expectedStates, transitionIndexes, transitions },
    ),
  ];
}

function phaseReviewAcceptanceAssertion(bundle, phaseReviewDispatches) {
  const reviews = bundle.reviews ?? [];
  const rows = bundle.fixture?.reviewRows ?? [];
  const currentCommits = bundle.git?.currentBranchCommits ?? [];
  const failures = [];
  const legacyOwnershipEvidence = phaseReviewDispatches.every(
    (dispatch) => (dispatch.schemaVersion ?? 1) === 1,
  );

  for (const phase of EXPECTED_PHASE_IDS) {
    const dispatches = phaseReviewDispatches.filter(
      (dispatch) =>
        dispatch.scope === phase &&
        dispatch.launch?.accepted === true &&
        dispatch.launch?.outcome === 'completed',
    );
    const phaseRows = rows.filter((row) => row.scope === phase);
    const phaseReviews = reviews.filter(
      (review) => review.frontmatter?.oat_review_scope === phase,
    );
    const row = phaseRows[0];
    const review = phaseReviews[0];
    const repositoryPath = review
      ? `.oat/projects/smoke-fixture/${review.path}`
      : null;
    const artifactCommit = currentCommits.find(
      (commit) => commit.sha === review?.committedHistory?.commitSha,
    );
    const directRoot =
      dispatches[0]?.schemaVersion !== 2 ||
      (dispatches[0]?.ownership?.launcherRole === 'project-root' &&
        dispatches[0]?.ownership?.parentScope === 'project' &&
        dispatches[0]?.ownership?.parentRequestId ===
          bundle.manifest?.runIdentity);
    const committedHistory = review?.committedHistory;
    const reasons = [];
    if (dispatches.length !== 1) {
      reasons.push('dispatch-count');
    }
    if (!directRoot) {
      reasons.push('dispatch-ownership');
    }
    if (phaseRows.length !== 1) {
      reasons.push('row-count');
    }
    if (row?.status !== 'passed') {
      reasons.push('row-status');
    }
    if (
      row?.type !== 'code' ||
      row?.type !== review?.frontmatter?.oat_review_type
    ) {
      reasons.push('review-type');
    }
    if (phaseReviews.length !== 1) {
      reasons.push('artifact-count');
    }
    if (
      row?.artifact !== review?.path ||
      !/^reviews\/(?:archived\/)?[^/]+\.md$/u.test(review?.path ?? '')
    ) {
      reasons.push('artifact-path');
    }
    if (
      review?.frontmatter?.oat_project !== '.oat/projects/smoke-fixture' ||
      review?.frontmatter?.oat_review_scope !== phase ||
      review?.frontmatter?.oat_review_invocation !== 'auto'
    ) {
      reasons.push('artifact-frontmatter');
    }
    if (
      !repositoryPath ||
      !artifactCommit?.files?.includes(repositoryPath) ||
      committedHistory?.contentHash !== review?.contentHash ||
      committedHistory?.matchesHead !== true ||
      committedHistory?.reachableFromHead !== true
    ) {
      reasons.push('committed-history');
    }
    if (reasons.length > 0) {
      failures.push({ phase, reasons });
    }
  }

  return assertion(
    'implement-phase-review-acceptance-bound',
    legacyOwnershipEvidence
      ? 'Every phase reviewer dispatch has exactly one passed row and scoped artifact bound byte-for-byte to reachable fixture history; retained schema-v1 evidence does not prove direct-root ownership.'
      : 'Every direct-root phase reviewer dispatch has exactly one passed row and scoped artifact bound byte-for-byte to reachable fixture history.',
    failures.length === 0,
    {
      failures,
      ownershipEvidence: legacyOwnershipEvidence
        ? 'unavailable-schema-v1'
        : 'required-schema-v2',
      requiredScopes: EXPECTED_PHASE_IDS,
    },
  );
}

function selectedAxis(axis) {
  return typeof axis === 'string' && axis.startsWith('selected:')
    ? axis.slice('selected:'.length)
    : null;
}

function dispatchMatchesCommittedPolicy(selected, dispatchPolicy) {
  if (
    !selected ||
    selected.configuredInvocation?.policy !== dispatchPolicy?.policy ||
    !selected.configuredInvocation?.ceiling ||
    !selected.selection?.candidatesConsidered?.includes(
      selected.configuredInvocation?.target,
    )
  ) {
    return false;
  }
  const invocation = selected.configuredInvocation;
  const model = selectedAxis(invocation.modelAxis);
  const effort =
    invocation.effortAxis === 'not-applicable'
      ? null
      : selectedAxis(invocation.effortAxis);
  const candidate = dispatchPolicy.eligibleCandidates?.find(
    (entry) =>
      entry.model === model &&
      entry.effort === effort &&
      entry.tier === invocation.candidateTier,
  );
  const ceilingModel = selectedAxis(invocation.ceilingModelAxis);
  const ceilingEffort =
    invocation.ceilingEffortAxis === 'not-applicable'
      ? null
      : selectedAxis(invocation.ceilingEffortAxis);
  const ceiling = dispatchPolicy.ceilingCandidates?.find(
    (entry) => entry.model === ceilingModel && entry.effort === ceilingEffort,
  );
  const codexRole =
    selected.role === 'reviewer' ? 'oat-reviewer' : 'oat-phase-implementer';
  const codexTarget =
    candidate && candidate.effort !== null
      ? `${codexRole}-${candidate.model.replaceAll('.', '-')}-${candidate.effort}`
      : null;
  const targetMatches =
    dispatchPolicy.provider === 'codex'
      ? invocation.target === codexTarget
      : invocation.target === candidate?.model;
  return Boolean(candidate && ceiling && targetMatches);
}

function implementAssertions(bundle) {
  const taskIds = bundle.fixture?.taskIds ?? [];
  const implementationDispatches = (bundle.dispatches ?? []).filter(
    (dispatch) =>
      dispatch.action === 'implementation' &&
      dispatch.role === 'phase-implementer',
  );
  const phaseReviewDispatches = (bundle.dispatches ?? []).filter(
    (dispatch) => dispatch.action === 'review' && dispatch.role === 'reviewer',
  );
  const optionalNestedDispatches = (bundle.dispatches ?? []).filter(
    (dispatch) =>
      dispatch.action === 'implementation' &&
      dispatch.role !== 'phase-implementer',
  );
  const dispatchPolicy = bundle.fixture?.dispatchPolicy;
  const launchFailures = [];
  const ownershipFailures = [];
  const targetSelectionFailures = [];
  const validateScope = (scope, role, dispatches) => {
    const attempts = dispatches
      .filter((dispatch) => dispatch.scope === scope)
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
      launchFailures.push(`${scope}:${role}`);
    }
    const selected = accepted[0];
    if (
      selected?.schemaVersion === 2 &&
      (!selected.requestId ||
        selected.ownership?.launcherRole !== 'project-root' ||
        selected.ownership?.parentScope !== 'project' ||
        selected.ownership?.parentRequestId !== bundle.manifest?.runIdentity)
    ) {
      ownershipFailures.push(`${scope}:${role}`);
    }
    if (
      !selected ||
      bundle.fixture?.headStateHash !== bundle.fixture?.stateHash ||
      !dispatchMatchesCommittedPolicy(selected, dispatchPolicy) ||
      (role === 'reviewer' &&
        selected.configuredInvocation?.candidateTier !== dispatchPolicy?.policy)
    ) {
      targetSelectionFailures.push(`${scope}:${role}`);
    }
  };
  for (const phase of EXPECTED_PHASE_IDS) {
    validateScope(phase, 'phase-implementer', implementationDispatches);
    validateScope(phase, 'reviewer', phaseReviewDispatches);
  }
  for (const dispatch of optionalNestedDispatches) {
    const parentPhase = dispatch.scope.slice(0, 3);
    const parent = implementationDispatches.find(
      (candidate) =>
        candidate.scope === parentPhase &&
        candidate.launch?.accepted === true &&
        candidate.launch?.outcome === 'completed',
    );
    if (
      dispatch.launch?.accepted !== true ||
      dispatch.launch?.outcome !== 'completed'
    ) {
      launchFailures.push(`${dispatch.scope}:${dispatch.role}`);
    }
    if (!dispatchMatchesCommittedPolicy(dispatch, dispatchPolicy)) {
      targetSelectionFailures.push(`${dispatch.scope}:${dispatch.role}`);
    }
    if (
      dispatch.schemaVersion === 2 &&
      (!dispatch.requestId ||
        dispatch.ownership?.launcherRole !== 'phase-agent' ||
        dispatch.ownership?.parentScope !== parentPhase ||
        !parent?.requestId ||
        dispatch.ownership?.parentRequestId !== parent.requestId)
    ) {
      ownershipFailures.push(`${dispatch.scope}:${dispatch.role}`);
    }
  }
  const requiredDispatches = [
    ...implementationDispatches,
    ...phaseReviewDispatches,
    ...optionalNestedDispatches,
  ];
  const dispatchSchemaVersions = new Set(
    requiredDispatches.map((dispatch) => dispatch.schemaVersion ?? 1),
  );
  const legacyOwnershipEvidence =
    dispatchSchemaVersions.size === 1 && dispatchSchemaVersions.has(1);
  if (
    !legacyOwnershipEvidence &&
    requiredDispatches.some((dispatch) => (dispatch.schemaVersion ?? 1) !== 2)
  ) {
    ownershipFailures.push('mixed-or-unsupported-dispatch-schema');
  }
  const invalidRuntimeIdentity = requiredDispatches
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
        commit.files?.length === 1 &&
        commit.files[0] === `workspace/logs/${taskId.slice(0, 3)}.log`,
    );
    return matches.length !== 1;
  });
  const journalBranches =
    bundle.manifest?.ownershipJournal?.resources?.map(
      (resource) => resource.branch,
    ) ?? [];
  const branchHistories = bundle.git?.branchHistories ?? [];
  const currentCommits = bundle.git?.currentBranchCommits ?? [];
  const currentSubjects = currentCommits.map((commit) => commit.subject);
  const phaseBranches = {};
  for (const phase of ['p01', 'p02']) {
    const expectedSubjects = EXPECTED_TASK_IDS.filter((taskId) =>
      taskId.startsWith(phase),
    ).map((taskId) => `feat(${taskId}): append fixture marker`);
    phaseBranches[phase] = branchHistories.find((history) => {
      if (history.branch === bundle.git?.branch) {
        return false;
      }
      const taskCommits = history.commits.filter((commit) =>
        expectedSubjects.includes(commit.subject),
      );
      return (
        taskCommits.length === expectedSubjects.length &&
        expectedSubjects.every((subject) =>
          taskCommits.some((commit) => commit.subject === subject),
        ) &&
        taskCommits.every(
          (commit) =>
            commit.files.length === 1 &&
            commit.files[0] === `workspace/logs/${phase}.log`,
        )
      );
    });
  }
  const phaseHeads = Object.fromEntries(
    Object.entries(phaseBranches).map(([phase, history]) => [
      phase,
      history?.head ?? null,
    ]),
  );
  const mergeIndexes = Object.fromEntries(
    Object.entries(phaseHeads).map(([phase, sha]) => [
      phase,
      currentCommits.findIndex(
        (commit) => commit.parents.length >= 2 && commit.parents.includes(sha),
      ),
    ]),
  );
  const baselineCommit = bundle.manifest?.baselineCommitSha;
  const phaseStarts = Object.fromEntries(
    Object.entries(phaseBranches).map(([phase, history]) => [
      phase,
      history?.start?.parent ?? null,
    ]),
  );
  const isolation =
    phaseBranches.p01 &&
    phaseBranches.p02 &&
    phaseBranches.p01.branch !== phaseBranches.p02.branch &&
    [phaseBranches.p01.branch, phaseBranches.p02.branch].every(
      (branch) =>
        journalBranches.includes(branch) &&
        typeof branch === 'string' &&
        !branch.includes('/'),
    ) &&
    Object.values(phaseBranches).every(
      (history) => history.mergeBase === baselineCommit,
    ) &&
    Object.values(phaseStarts).every((start) => start === baselineCommit) &&
    !phaseBranches.p01.ancestorBranches.includes(phaseBranches.p02.branch) &&
    !phaseBranches.p02.ancestorBranches.includes(phaseBranches.p01.branch) &&
    Object.values(phaseHeads).every(
      (sha) =>
        typeof sha === 'string' &&
        currentCommits.some((commit) => commit.sha === sha),
    ) &&
    Object.values(mergeIndexes).every((index) => index >= 0);
  const indexes = Object.fromEntries(
    EXPECTED_TASK_IDS.map((taskId) => [
      taskId,
      currentSubjects.indexOf(`feat(${taskId}): append fixture marker`),
    ]),
  );
  const fanInIndexes = EXPECTED_TASK_IDS.filter((taskId) =>
    taskId.startsWith('p03'),
  ).map((taskId) => indexes[taskId]);
  const fanIn =
    Object.values(mergeIndexes).every((index) => index >= 0) &&
    fanInIndexes.every((index) => index >= 0) &&
    Math.max(...Object.values(mergeIndexes)) < Math.min(...fanInIndexes);
  const requiredReviewScopes = ['final'];

  return [
    assertion(
      'implement-dispatch-completeness',
      legacyOwnershipEvidence
        ? 'Every phase has one accepted completed phase implementer and reviewer launch; retained schema-v1 evidence does not prove direct-root ownership.'
        : 'Every phase has one accepted completed phase implementer and one direct-root reviewer launch with launcher-owned parent evidence.',
      JSON.stringify(taskIds) === JSON.stringify(EXPECTED_TASK_IDS) &&
        launchFailures.length === 0 &&
        ownershipFailures.length === 0,
      {
        failingDispatches: launchFailures,
        ownershipEvidence: legacyOwnershipEvidence
          ? 'unavailable-schema-v1'
          : 'required-schema-v2',
        ownershipFailures,
        phaseIds: EXPECTED_PHASE_IDS,
        taskIds,
      },
    ),
    assertion(
      'implement-exact-target-within-ceiling',
      'Every phase implementer, reviewer, and optional nested launch records an exact target at or below the named ceiling.',
      requiredDispatches.length > 0 && targetSelectionFailures.length === 0,
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
      {
        journalBranches,
        mergeIndexes,
        phaseStarts,
        phaseBranches: Object.fromEntries(
          Object.entries(phaseBranches).map(([phase, history]) => [
            phase,
            history?.branch ?? null,
          ]),
        ),
      },
    ),
    assertion(
      'implement-fan-in-reconciliation',
      'Fan-in completed after all declared dependencies.',
      fanIn,
      { indexes },
    ),
    phaseReviewAcceptanceAssertion(bundle, phaseReviewDispatches),
    ...reviewAssertions(
      bundle,
      requiredReviewScopes,
      bundle.scenario === 'full' ? 'full' : 'implementation',
    ),
    assertion(
      'implement-runtime-identity-status',
      'Runtime identity is recorded or explicitly marked not-reported.',
      requiredDispatches.length > 0 && invalidRuntimeIdentity.length === 0,
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
  if (bundle.schemaVersion !== 1) {
    throw new EvidenceAssertionError(
      'Evidence bundle must use schemaVersion 1.',
    );
  }
  if (!SCENARIOS.has(bundle.scenario)) {
    throw new EvidenceAssertionError(
      `Unknown evidence scenario: ${String(bundle.scenario)}`,
    );
  }

  const assertions = [];
  if (bundle.control?.kind) {
    if (bundle.kind !== 'control') {
      throw new EvidenceAssertionError(
        'Negative controls require bundle kind control.',
      );
    }
    assertions.push(...negativeControlAssertions(bundle));
  } else {
    if (bundle.kind !== 'workflow') {
      throw new EvidenceAssertionError(
        'Workflow evidence requires bundle kind workflow.',
      );
    }
    assertions.push(...commonAssertions(bundle));
    if (bundle.scenario === 'plan-review' || bundle.scenario === 'full') {
      assertions.push(...planReviewAssertions(bundle));
    }
    if (bundle.scenario === 'implement' || bundle.scenario === 'full') {
      assertions.push(...implementAssertions(bundle));
    }
  }
  const uniqueAssertions = [
    ...new Map(assertions.map((entry) => [entry.id, entry])).values(),
  ];
  const failed = uniqueAssertions.filter((entry) => entry.status === 'failed');

  return {
    assertions: uniqueAssertions,
    bundleKind: bundle.kind,
    profile: bundle.control?.kind ?? bundle.scenario,
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
