/**
 * Captured-shape fixture derived from `oat --json gate review`'s
 * `writeReviewGateResult` payload and the retained 2026-11-01 goal-plan gate
 * artifact. Values are deterministic test identities; field names and nesting
 * follow production output rather than a verifier-owned proof format.
 */
export function gateReviewResult(options: {
  runId: string;
  target: string;
  artifactPath: string;
  generatedAt: string;
  project: string;
  scope: string;
}): Record<string, unknown> {
  return {
    outcome: 'review_completed_gate_passed',
    status: 'ok',
    runId: options.runId,
    target: options.target,
    project: options.project,
    projectResolutionSource: 'explicit',
    artifactPath: options.artifactPath,
    generatedAt: options.generatedAt,
    threshold: 'high',
    blocking: false,
    counts: { critical: 0, high: 0, medium: 0, low: 1 },
    reviewType: 'code',
    scope: options.scope,
    invocation: 'gate',
    handoff: 'Run oat-project-review-receive.',
    receiveEligible: true,
  };
}
