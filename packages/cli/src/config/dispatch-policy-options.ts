import {
  dispatchPolicyProviderTargets,
  type CappedManagedDispatchPolicy,
} from './dispatch-ceiling-preset';
import {
  VALID_MANAGED_DISPATCH_POLICIES,
  type WorkflowManagedDispatchPolicy,
} from './oat-config';

export type DispatchPolicyChoiceKind =
  | 'managed-capped'
  | 'managed-uncapped'
  | 'inherit'
  | 'unresolved';

export interface DispatchPolicyChoice {
  value: string;
  label: string;
  kind: DispatchPolicyChoiceKind;
  runtimePolicy: boolean;
  description: string;
  policy?: WorkflowManagedDispatchPolicy;
  providers?: {
    codex: string;
    claude: string;
  };
}

const MANAGED_POLICY_DESCRIPTIONS = {
  economy:
    'Managed capped policy for lower-cost implementation and review dispatch.',
  balanced:
    'Managed capped policy for normal implementation and review dispatch.',
  high: 'Managed capped policy for broad or higher-risk implementation and review dispatch.',
  frontier:
    'Managed capped policy for highest-tier implementation and review dispatch.',
  uncapped:
    'OAT still manages dispatch selection, but stores no maximum cap. The implementer can choose the preferred model/effort for the task. This is not host default behavior.',
} as const satisfies Record<WorkflowManagedDispatchPolicy, string>;

const MANAGED_POLICY_LABELS = {
  economy: 'Economy',
  balanced: 'Balanced',
  high: 'High',
  frontier: 'Frontier',
  uncapped: 'Uncapped',
} as const satisfies Record<WorkflowManagedDispatchPolicy, string>;

function isCappedManagedPolicy(
  policy: WorkflowManagedDispatchPolicy,
): policy is CappedManagedDispatchPolicy {
  return policy !== 'uncapped';
}

function managedChoice(
  policy: WorkflowManagedDispatchPolicy,
): DispatchPolicyChoice {
  if (isCappedManagedPolicy(policy)) {
    return {
      value: policy,
      label: MANAGED_POLICY_LABELS[policy],
      kind: 'managed-capped',
      runtimePolicy: true,
      description: MANAGED_POLICY_DESCRIPTIONS[policy],
      policy,
      providers: dispatchPolicyProviderTargets(policy),
    };
  }

  return {
    value: policy,
    label: MANAGED_POLICY_LABELS[policy],
    kind: 'managed-uncapped',
    runtimePolicy: true,
    description: MANAGED_POLICY_DESCRIPTIONS[policy],
    policy,
  };
}

export function getDispatchPolicyChoices(): DispatchPolicyChoice[] {
  return [
    ...VALID_MANAGED_DISPATCH_POLICIES.map(managedChoice),
    {
      value: 'inherit',
      label: 'Inherit Host Defaults',
      kind: 'inherit',
      runtimePolicy: true,
      description:
        'OAT does not choose model or effort. Subagents use the current host/provider default behavior, such as parent session model, base Codex role defaults, or provider config.',
    },
    {
      value: 'leave-unresolved',
      label: 'Leave Unresolved',
      kind: 'unresolved',
      runtimePolicy: false,
      description:
        'Planning records no policy as a planning/preflight deferral. Implementation preflight must block until a policy is configured or explicitly selected.',
    },
  ];
}

export function managedDispatchPolicyValueList(separator = ' | '): string {
  return VALID_MANAGED_DISPATCH_POLICIES.join(separator);
}

export function dispatchPolicyModeDescription(): string {
  return [
    'Dispatch policy mode.',
    '"managed" means OAT selects model/effort from workflow.dispatchPolicy.policy.',
    '"inherit" leaves dispatch controls to host/provider defaults.',
    'Resolution: local > shared > user > default.',
  ].join(' ');
}

export function dispatchPolicyPolicyDescription(): string {
  return [
    'Managed dispatch policy.',
    'economy, balanced, high, and frontier are capped managed policies.',
    'uncapped keeps OAT-managed preferred selection without provider caps.',
    'inherit leaves dispatch controls to host/provider defaults through workflow.dispatchPolicy.mode.',
    'Setting this key writes workflow.dispatchPolicy.mode=managed.',
    'Resolution: local > shared > user > default.',
  ].join(' ');
}

function providerSummary(choice: DispatchPolicyChoice): string {
  return choice.providers
    ? `Codex: ${choice.providers.codex}; Claude: ${choice.providers.claude}`
    : choice.kind === 'managed-uncapped'
      ? 'No stored maximum cap'
      : choice.kind === 'inherit'
        ? 'Host/provider defaults'
        : 'No runtime policy';
}

export function renderDispatchPolicyChoicesMarkdown(
  choices = getDispatchPolicyChoices(),
): string {
  return [
    'Set the dispatch policy - how OAT should choose subagent model/effort controls.',
    '',
    ...choices.map(
      (choice, index) =>
        `${index + 1}. ${choice.label} - ${providerSummary(choice)}. ${choice.description}`,
    ),
  ].join('\n');
}
