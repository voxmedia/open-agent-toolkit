const SCENARIOS = new Set(['plan-review', 'implement', 'full']);

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

function hasGateCorroboration(review) {
  const fields = review?.corroboration ?? {};
  return (
    typeof fields.oat_gate_run_id === 'string' &&
    fields.oat_gate_run_id.length > 0 &&
    typeof fields.oat_gate_target === 'string' &&
    fields.oat_gate_target.length > 0 &&
    typeof fields.oat_gate_runtime === 'string' &&
    fields.oat_gate_runtime.length > 0
  );
}

function reviewAssertions(bundle) {
  const reviews = bundle.reviews ?? [];
  const disposition = events(bundle, 'review-disposition-committed');
  return [
    assertion(
      'review-gate-corroborated',
      'Review or gate evidence contains independent run/target/runtime corroboration.',
      reviews.some(hasGateCorroboration),
      {
        corroboratedReviews: reviews
          .filter(hasGateCorroboration)
          .map((review) => review.path),
      },
    ),
    assertion(
      'review-disposition-durable',
      'Review disposition was durably committed before continuation.',
      disposition.some(
        (event) => event.durable === true && event.committed === true,
      ),
      { events: disposition },
    ),
  ];
}

function planReviewAssertions(bundle) {
  const resume = events(bundle, 'plan-resume-verified')[0];
  const transitions = events(bundle, 'state-transition').sort(
    (left, right) => left.sequence - right.sequence,
  );
  const observedStates = transitions.map((event) => event.to);
  const expectedStates = ['reviewed', 'implementation-ready'];
  const planStable =
    isPlainObject(resume) &&
    typeof resume.beforeHash === 'string' &&
    resume.beforeHash === resume.afterHash &&
    resume.afterHash === bundle.fixture?.planHash &&
    JSON.stringify(resume.taskIdsBefore) ===
      JSON.stringify(resume.taskIdsAfter) &&
    JSON.stringify(resume.parallelGroupsBefore) ===
      JSON.stringify(resume.parallelGroupsAfter);
  const transitionsAtomic =
    JSON.stringify(observedStates) === JSON.stringify(expectedStates) &&
    transitions.every((event) => event.atomic === true);

  return [
    assertion(
      'plan-review-substantive-plan-stable',
      'Plan hash, task IDs, and parallel groups are unchanged across resume.',
      planStable,
      { fixturePlanHash: bundle.fixture?.planHash ?? null, resume },
    ),
    ...reviewAssertions(bundle),
    assertion(
      'plan-review-state-transitions',
      'Pre-review state advances atomically through reviewed to implementation-ready.',
      transitionsAtomic,
      { expectedStates, transitions },
    ),
  ];
}

function implementAssertions(bundle) {
  const taskIds = bundle.fixture?.taskIds ?? [];
  const implementationDispatches = (bundle.dispatches ?? []).filter(
    (dispatch) => dispatch.action === 'implementation',
  );
  const dispatchedScopes = new Set(
    implementationDispatches.map((dispatch) => dispatch.scope),
  );
  const missingTasks = taskIds.filter(
    (taskId) => !dispatchedScopes.has(taskId),
  );
  const targetSelectionFailures = implementationDispatches
    .filter(
      (dispatch) =>
        dispatch.selection?.atOrBelowCeiling !== true ||
        !dispatch.configuredInvocation?.target ||
        !dispatch.configuredInvocation?.modelAxis,
    )
    .map((dispatch) => dispatch.scope);
  const invalidRuntimeIdentity = implementationDispatches
    .filter(
      (dispatch) =>
        !['reported', 'not-reported'].includes(
          dispatch.runtimeIdentity?.status,
        ),
    )
    .map((dispatch) => dispatch.scope);
  const isolation = events(bundle, 'parallel-isolation-verified')[0];
  const fanIn = events(bundle, 'fan-in-completed')[0];

  return [
    assertion(
      'implement-dispatch-completeness',
      'Every fixture task has one implementation dispatch record.',
      taskIds.length > 0 && missingTasks.length === 0,
      { dispatchedScopes: [...dispatchedScopes].sort(), missingTasks, taskIds },
    ),
    assertion(
      'implement-exact-target-within-ceiling',
      'Every task records an exact selected target at or below the named ceiling.',
      implementationDispatches.length > 0 &&
        targetSelectionFailures.length === 0,
      { failingScopes: targetSelectionFailures },
    ),
    assertion(
      'implement-parallel-isolation',
      'Parallel phases used disjoint writes, separate worktrees, and flat branch names.',
      isolation?.disjointWrites === true &&
        isolation?.separateWorktrees === true &&
        isolation?.flatBranchNames === true,
      { event: isolation ?? null },
    ),
    assertion(
      'implement-fan-in-reconciliation',
      'Fan-in completed after all declared dependencies.',
      fanIn?.dependenciesComplete === true && fanIn?.reconciled === true,
      { event: fanIn ?? null },
    ),
    ...reviewAssertions(bundle),
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

export function evaluateEvidence(bundle) {
  if (!isPlainObject(bundle)) {
    throw new EvidenceAssertionError('Evidence bundle must be an object.');
  }
  if (!SCENARIOS.has(bundle.scenario)) {
    throw new EvidenceAssertionError(
      `Unknown evidence scenario: ${String(bundle.scenario)}`,
    );
  }

  const assertions = commonAssertions(bundle);
  if (bundle.scenario === 'plan-review' || bundle.scenario === 'full') {
    assertions.push(...planReviewAssertions(bundle));
  }
  if (bundle.scenario === 'implement' || bundle.scenario === 'full') {
    assertions.push(...implementAssertions(bundle));
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
