import type { WorkflowDispatchMatrixTier } from '@config/dispatch-matrix';

import type { IdentityProvenance } from './provenance';
import type { DispatchAction, DispatchRole } from './stamp';

export type DispatchReportPolicyStatus = 'resolved' | 'unresolved' | 'blocked';
export type DispatchReportPolicyMode = 'managed' | 'inherit' | null;

export interface ResolvedDispatchTargetReport {
  harness: string;
  model?: string;
  effort?: string;
  crossHarness: boolean;
  routeIndex: number;
  routeLength: number;
}

export interface DispatchControlRequest {
  value: string | null;
  mechanism:
    | 'task-model-argument'
    | 'materialized-role'
    | 'base-role'
    | 'provider-default'
    | 'host-inherited'
    | 'not-applicable';
  reason: string;
}

export interface DispatchRequestedControls {
  model: DispatchControlRequest;
  effort: DispatchControlRequest;
}

export interface DispatchConfiguredDefaults {
  model: string | null;
  modelSource: string | null;
  effort: string | null;
  effortSource: string | null;
}

export interface DispatchGateInvocation {
  readonly runId: string;
  readonly targetId: string;
  readonly runtime: string;
  readonly model: string;
  readonly reasoningEffort: string;
  readonly source: 'exec-target-config' | 'unknown';
}

export interface DispatchRuntimeIdentity {
  producer: string | null;
  model: string | null;
  effort: string | null;
  provenance: IdentityProvenance;
  confidence: string;
}

export interface DispatchReportSelectionInput {
  role: DispatchRole;
  requestedCandidate: { model: string; effort?: string } | null;
  candidateTier: WorkflowDispatchMatrixTier | null;
  candidateIndex: number | null;
  ceilingTier: WorkflowDispatchMatrixTier | null;
  ceilingTarget: ResolvedDispatchTargetReport | null;
  selectedValue: string | null;
  selectionMode: string;
  selectionBranch: string;
  target: ResolvedDispatchTargetReport | null;
  cellSource: string | null;
}

export interface DispatchReportProviderResolution {
  dispatchArgs: { variant?: string; model?: string } | null;
  selection: DispatchReportSelectionInput;
}

export interface DispatchReportResolution {
  status: DispatchReportPolicyStatus;
  provider: string;
  value: string | null;
  policyMode: DispatchReportPolicyMode;
  policy: string | null;
  source: string | null;
  providers: Record<string, DispatchReportProviderResolution>;
}

export interface DispatchReportV1 {
  schemaVersion: 1;
  route: {
    scope: string;
    action: DispatchAction;
    role: DispatchRole;
    target: string;
  };
  policy: {
    status: DispatchReportPolicyStatus;
    mode: DispatchReportPolicyMode;
    name: string | null;
    source: string | null;
  };
  selection: {
    requestedCandidate: { model: string; effort?: string } | null;
    candidateTier: WorkflowDispatchMatrixTier | null;
    candidateIndex: number | null;
    ceilingTier: WorkflowDispatchMatrixTier | null;
    ceilingTarget: ResolvedDispatchTargetReport | null;
    selectedValue: string | null;
    exactSelectedTarget: ResolvedDispatchTargetReport | null;
    selectionMode: string;
    selectionBranch: string;
    cellSource: string | null;
  };
  requestedControls: DispatchRequestedControls;
  configuredDefaults: DispatchConfiguredDefaults;
  gateInvocation: Readonly<DispatchGateInvocation> | null;
  runtimeIdentity: DispatchRuntimeIdentity;
}

export interface DispatchReportInput {
  scope: string;
  action: DispatchAction;
  role: DispatchRole;
  resolution: DispatchReportResolution;
  requestedControls: DispatchRequestedControls;
  configuredDefaults: DispatchConfiguredDefaults;
  gateInvocation?: DispatchGateInvocation | null;
  runtimeIdentity?: DispatchRuntimeIdentity;
}

const ROLE_BY_ACTION: Record<DispatchAction, DispatchRole> = {
  implementation: 'implementer',
  fix: 'fix',
  review: 'reviewer',
};

const NOT_REPORTED_RUNTIME_IDENTITY: DispatchRuntimeIdentity = {
  producer: null,
  model: null,
  effort: null,
  provenance: 'unknown',
  confidence: 'not-reported',
};

function cloneTarget(
  target: ResolvedDispatchTargetReport | null,
): ResolvedDispatchTargetReport | null {
  return target ? { ...target } : null;
}

function invocationTarget(provider: DispatchReportProviderResolution): string {
  return (
    provider.dispatchArgs?.variant ?? provider.dispatchArgs?.model ?? 'unknown'
  );
}

function assertActionRole(action: DispatchAction, role: DispatchRole): void {
  if (ROLE_BY_ACTION[action] !== role) {
    throw new Error(
      `Invalid dispatch report action/role pair: ${action}/${role}`,
    );
  }
}

export function buildDispatchReport(
  input: DispatchReportInput,
): DispatchReportV1 {
  assertActionRole(input.action, input.role);

  const provider = input.resolution.providers[input.resolution.provider];
  if (!provider) {
    throw new Error(
      `Dispatch report resolution is missing provider data for "${input.resolution.provider}".`,
    );
  }

  const { selection } = provider;
  const gateInvocation = input.gateInvocation
    ? Object.freeze({ ...input.gateInvocation })
    : null;

  return {
    schemaVersion: 1,
    route: {
      scope: input.scope,
      action: input.action,
      role: input.role,
      target: invocationTarget(provider),
    },
    policy: {
      status: input.resolution.status,
      mode: input.resolution.policyMode,
      name: input.resolution.policy,
      source: input.resolution.source,
    },
    selection: {
      requestedCandidate: selection.requestedCandidate
        ? { ...selection.requestedCandidate }
        : null,
      candidateTier: selection.candidateTier,
      candidateIndex: selection.candidateIndex,
      ceilingTier: selection.ceilingTier,
      ceilingTarget: cloneTarget(selection.ceilingTarget),
      selectedValue: selection.selectedValue,
      exactSelectedTarget: cloneTarget(selection.target),
      selectionMode: selection.selectionMode,
      selectionBranch: selection.selectionBranch,
      cellSource: selection.cellSource,
    },
    requestedControls: {
      model: { ...input.requestedControls.model },
      effort: { ...input.requestedControls.effort },
    },
    configuredDefaults: { ...input.configuredDefaults },
    gateInvocation,
    runtimeIdentity: input.runtimeIdentity
      ? { ...input.runtimeIdentity }
      : { ...NOT_REPORTED_RUNTIME_IDENTITY },
  };
}
