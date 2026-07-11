import type { WorkflowDispatchMatrixTier } from '@config/dispatch-matrix';

import type { IdentityProvenance } from './provenance';
import type {
  DispatchAction,
  DispatchRole,
  DispatchStampRecord,
} from './stamp';

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

function orderedTarget(
  target: ResolvedDispatchTargetReport | null,
): ResolvedDispatchTargetReport | null {
  if (!target) {
    return null;
  }
  return {
    harness: target.harness,
    ...(target.model === undefined ? {} : { model: target.model }),
    ...(target.effort === undefined ? {} : { effort: target.effort }),
    crossHarness: target.crossHarness,
    routeIndex: target.routeIndex,
    routeLength: target.routeLength,
  };
}

function orderedReport(report: DispatchReportV1): DispatchReportV1 {
  return {
    schemaVersion: 1,
    route: {
      scope: report.route.scope,
      action: report.route.action,
      role: report.route.role,
      target: report.route.target,
    },
    policy: {
      status: report.policy.status,
      mode: report.policy.mode,
      name: report.policy.name,
      source: report.policy.source,
    },
    selection: {
      requestedCandidate: report.selection.requestedCandidate
        ? {
            model: report.selection.requestedCandidate.model,
            ...(report.selection.requestedCandidate.effort === undefined
              ? {}
              : { effort: report.selection.requestedCandidate.effort }),
          }
        : null,
      candidateTier: report.selection.candidateTier,
      candidateIndex: report.selection.candidateIndex,
      ceilingTier: report.selection.ceilingTier,
      ceilingTarget: orderedTarget(report.selection.ceilingTarget),
      selectedValue: report.selection.selectedValue,
      exactSelectedTarget: orderedTarget(report.selection.exactSelectedTarget),
      selectionMode: report.selection.selectionMode,
      selectionBranch: report.selection.selectionBranch,
      cellSource: report.selection.cellSource,
    },
    requestedControls: {
      model: {
        value: report.requestedControls.model.value,
        mechanism: report.requestedControls.model.mechanism,
        reason: report.requestedControls.model.reason,
      },
      effort: {
        value: report.requestedControls.effort.value,
        mechanism: report.requestedControls.effort.mechanism,
        reason: report.requestedControls.effort.reason,
      },
    },
    configuredDefaults: {
      model: report.configuredDefaults.model,
      modelSource: report.configuredDefaults.modelSource,
      effort: report.configuredDefaults.effort,
      effortSource: report.configuredDefaults.effortSource,
    },
    gateInvocation: report.gateInvocation
      ? {
          runId: report.gateInvocation.runId,
          targetId: report.gateInvocation.targetId,
          runtime: report.gateInvocation.runtime,
          model: report.gateInvocation.model,
          reasoningEffort: report.gateInvocation.reasoningEffort,
          source: report.gateInvocation.source,
        }
      : null,
    runtimeIdentity: {
      producer: report.runtimeIdentity.producer,
      model: report.runtimeIdentity.model,
      effort: report.runtimeIdentity.effort,
      provenance: report.runtimeIdentity.provenance,
      confidence: report.runtimeIdentity.confidence,
    },
  };
}

function display(value: string | number | null): string {
  return value === null ? 'none' : String(value);
}

function formatTarget(target: ResolvedDispatchTargetReport | null): string {
  if (!target) {
    return 'none';
  }
  return [
    `harness=${target.harness}`,
    target.model === undefined ? null : `model=${target.model}`,
    target.effort === undefined ? null : `effort=${target.effort}`,
    `crossHarness=${String(target.crossHarness)}`,
    `routeIndex=${target.routeIndex}`,
    `routeLength=${target.routeLength}`,
  ]
    .filter((part): part is string => part !== null)
    .join(' ');
}

function formatCandidate(
  candidate: DispatchReportV1['selection']['requestedCandidate'],
): string {
  if (!candidate) {
    return 'none';
  }
  return [
    `model=${candidate.model}`,
    candidate.effort === undefined ? null : `effort=${candidate.effort}`,
  ]
    .filter((part): part is string => part !== null)
    .join(' ');
}

function formatControl(name: string, control: DispatchControlRequest): string {
  return `  ${name}: ${display(control.value)} (${control.mechanism}) — ${control.reason}`;
}

function controlAxis(control: DispatchControlRequest): string {
  if (
    control.mechanism === 'task-model-argument' ||
    control.mechanism === 'materialized-role'
  ) {
    return control.value ? `selected:${control.value}` : 'unknown';
  }
  if (control.mechanism === 'host-inherited') {
    return 'inherited';
  }
  if (
    control.mechanism === 'base-role' ||
    control.mechanism === 'provider-default'
  ) {
    return 'provider-default';
  }
  return 'not-applicable';
}

function dispatchPolicy(report: DispatchReportV1): string {
  if (report.policy.name) {
    return report.policy.name;
  }
  return report.policy.mode === 'inherit' ? 'inherit-host-defaults' : 'unknown';
}

function dispatchCeiling(report: DispatchReportV1): string {
  return (
    report.selection.ceilingTarget?.effort ??
    report.selection.ceilingTarget?.model ??
    'none'
  );
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

export function serializeDispatchReport(report: DispatchReportV1): string {
  return JSON.stringify(orderedReport(report), null, 2);
}

export function formatDispatchReport(report: DispatchReportV1): string {
  const runtimeNotReported =
    report.runtimeIdentity.producer === null &&
    report.runtimeIdentity.model === null &&
    report.runtimeIdentity.effort === null &&
    report.runtimeIdentity.confidence === 'not-reported';
  const runtimeValue = (value: string | null): string =>
    value === null ? 'not reported' : value;
  const gateLines = report.gateInvocation
    ? [
        `  Run ID: ${report.gateInvocation.runId}`,
        `  Target ID: ${report.gateInvocation.targetId}`,
        `  Runtime: ${report.gateInvocation.runtime}`,
        `  Model: ${report.gateInvocation.model}`,
        `  Reasoning effort: ${report.gateInvocation.reasoningEffort}`,
        `  Source: ${report.gateInvocation.source}`,
      ]
    : ['  Not configured'];

  return [
    'Dispatch Report V1',
    'Route',
    `  Scope: ${report.route.scope}`,
    `  Action / role: ${report.route.action} / ${report.route.role}`,
    `  Invocation target: ${report.route.target}`,
    'Policy',
    `  Status: ${report.policy.status}`,
    `  Mode / name: ${display(report.policy.mode)} / ${display(report.policy.name)}`,
    `  Source: ${display(report.policy.source)}`,
    'Selection',
    `  Requested candidate: ${formatCandidate(report.selection.requestedCandidate)}`,
    `  Candidate tier / index: ${display(report.selection.candidateTier)} / ${display(report.selection.candidateIndex)}`,
    `  Ceiling tier: ${display(report.selection.ceilingTier)}`,
    `  Ceiling target: ${formatTarget(report.selection.ceilingTarget)}`,
    `  Selected value: ${display(report.selection.selectedValue)}`,
    `  Exact selected target: ${formatTarget(report.selection.exactSelectedTarget)}`,
    `  Mode / branch: ${report.selection.selectionMode} / ${report.selection.selectionBranch}`,
    `  Cell source: ${display(report.selection.cellSource)}`,
    'Requested controls',
    formatControl('Model', report.requestedControls.model),
    formatControl('Effort', report.requestedControls.effort),
    'Configured defaults (not runtime observations)',
    `  Model: ${display(report.configuredDefaults.model)}`,
    `  Model source: ${display(report.configuredDefaults.modelSource)}`,
    `  Effort: ${display(report.configuredDefaults.effort)}`,
    `  Effort source: ${display(report.configuredDefaults.effortSource)}`,
    'Gate invocation (configured, immutable)',
    ...gateLines,
    'Runtime identity (observed/reported separately)',
    ...(runtimeNotReported ? ['  Runtime identity was not reported.'] : []),
    `  Producer: ${runtimeValue(report.runtimeIdentity.producer)}`,
    `  Model: ${runtimeValue(report.runtimeIdentity.model)}`,
    `  Effort: ${runtimeValue(report.runtimeIdentity.effort)}`,
    `  Provenance: ${report.runtimeIdentity.provenance}`,
    `  Confidence: ${report.runtimeIdentity.confidence}`,
  ].join('\n');
}

export function toDispatchStampRecord(
  report: DispatchReportV1,
): DispatchStampRecord {
  const runtimeReported = report.runtimeIdentity.producer !== null;
  return {
    scope: report.route.scope,
    action: report.route.action,
    role: report.route.role,
    producer: report.runtimeIdentity.producer ?? 'unknown',
    provenance: runtimeReported ? report.runtimeIdentity.provenance : 'unknown',
    modelAxis: controlAxis(report.requestedControls.model),
    effortAxis: controlAxis(report.requestedControls.effort),
    dispatchPolicy: dispatchPolicy(report),
    dispatchCeiling: dispatchCeiling(report),
    target: report.route.target,
  };
}
