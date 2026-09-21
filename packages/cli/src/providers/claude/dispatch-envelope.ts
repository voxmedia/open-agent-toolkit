import {
  parseGenericDispatchRecord,
  type GenericDispatchRecord,
} from '@providers/identity/generic-dispatch-record';
import YAML from 'yaml';
import { z } from 'zod';

import { readOatManagedClaudeRole } from './codec/materialize';
import {
  buildClaudeEffortVariantName,
  validateClaudeDispatchCapability,
} from './targets';

const targetSchema = z
  .object({
    model: z.string().min(1),
    effort: z.string().min(1),
    resolvedModel: z.string().min(1),
    crossHarness: z.literal(false),
  })
  .passthrough();

const providerResolutionSchema = z
  .object({
    value: z.string().min(1),
    mode: z.literal('enforced'),
    mechanism: z.literal('pinned-variant'),
    dispatchArgs: z.object({ variant: z.string().min(1) }).strict(),
    modelAxis: z.string().min(1),
    effortAxis: z.string().min(1),
    target: targetSchema,
    selection: z
      .object({
        role: z.enum(['implementer', 'reviewer']),
        policyMode: z.literal('managed'),
        policy: z.string().min(1),
        target: targetSchema,
      })
      .passthrough(),
  })
  .passthrough();

const resolutionSchema = z
  .object({
    status: z.literal('resolved'),
    provider: z.literal('claude'),
    policyMode: z.literal('managed'),
    policy: z.string().min(1),
    providers: z.object({ claude: providerResolutionSchema }).passthrough(),
  })
  .passthrough();

const launchPayloadSchema = z
  .object({
    variant: z.string().min(1),
    model: z.string().min(1).optional(),
  })
  .strict();

const PROTECTED_RECORD_FIELDS = [
  'provider',
  'dispatch_policy',
  'dispatch_ceiling',
  'role_name',
  'role_selector',
  'model_selector',
  'model_selector_granularity',
  'effort_selector',
  'selection_source',
  'candidates_considered',
  'selection_reason',
  'selected_route',
  'payload',
  'configured_invocation_evidence',
] as const;

export interface AcceptedClaudeLaunchEnvelope {
  schemaVersion: 1;
  provider: 'claude';
  resolverRole: 'implementer' | 'reviewer';
  baseRole: 'oat-phase-implementer' | 'oat-reviewer';
  variant: string;
  model: string;
  resolvedModel: string;
  effort: string;
  policy: string;
  ceiling: string;
  payload: {
    variant: string;
    model?: string;
  };
}

function definitionFrontmatter(content: string): Record<string, unknown> {
  const match = /^---\n([\s\S]*?)\n---(?:\n|$)/u.exec(content);
  if (!match?.[1]) {
    throw new Error('Generated Claude definition has no YAML frontmatter.');
  }
  const parsed = YAML.parse(match[1]) as unknown;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Generated Claude definition frontmatter is not a map.');
  }
  return parsed as Record<string, unknown>;
}

function assertSameTarget(
  left: { model: string; effort: string },
  right: { model: string; effort: string },
): void {
  if (left.model !== right.model || left.effort !== right.effort) {
    throw new Error(
      'Claude resolver target and selection target disagree on model or effort.',
    );
  }
}

/**
 * Validate the managed resolver result against the generated provider role and
 * the exact payload that will be launched. This is the production boundary
 * used by the project dispatch-record producer for managed Claude dispatches.
 */
export function acceptClaudeLaunchEnvelope(input: {
  resolution: unknown;
  definition: string;
  launch: unknown;
}): AcceptedClaudeLaunchEnvelope {
  const resolution = resolutionSchema.parse(input.resolution);
  const provider = resolution.providers.claude;
  const launch = launchPayloadSchema.parse(input.launch);
  assertSameTarget(provider.target, provider.selection.target);

  const validation = validateClaudeDispatchCapability(
    provider.selection.target,
  );
  if (!validation.valid) {
    throw new Error(
      validation.reason ?? 'Resolver selected an invalid Claude target.',
    );
  }

  const baseRole =
    provider.selection.role === 'reviewer'
      ? 'oat-reviewer'
      : 'oat-phase-implementer';
  const expectedVariant = buildClaudeEffortVariantName({
    agentName: baseRole,
    model: provider.selection.target.model,
    effort: provider.selection.target.effort,
  });
  if (provider.dispatchArgs.variant !== expectedVariant) {
    throw new Error(
      `Managed Claude resolver variant ${provider.dispatchArgs.variant} does not match selected target ${expectedVariant}.`,
    );
  }
  if (launch.variant !== expectedVariant) {
    throw new Error(
      `Claude launch variant ${launch.variant} does not match resolver-selected variant ${expectedVariant}.`,
    );
  }

  const managed = readOatManagedClaudeRole(input.definition);
  if (!managed || managed.roleName !== expectedVariant) {
    throw new Error(
      `Generated Claude definition ${expectedVariant} is absent or is not the matching OAT-managed role.`,
    );
  }
  if (managed.resolvedModel !== provider.selection.target.resolvedModel) {
    throw new Error(
      `Generated Claude definition resolved model does not match selected capability ${provider.selection.target.resolvedModel}.`,
    );
  }
  const frontmatter = definitionFrontmatter(input.definition);
  if (frontmatter.name !== expectedVariant) {
    throw new Error(
      `Generated Claude definition name does not match ${expectedVariant}.`,
    );
  }
  if (frontmatter.model !== provider.selection.target.model) {
    throw new Error(
      `Generated Claude definition model does not match selected model ${provider.selection.target.model}.`,
    );
  }
  if (frontmatter.effort !== provider.selection.target.effort) {
    throw new Error(
      `Generated Claude definition effort does not match selected effort ${provider.selection.target.effort}.`,
    );
  }
  if (
    launch.model !== undefined &&
    launch.model !== provider.selection.target.model
  ) {
    throw new Error(
      `Per-call Claude model ${launch.model} conflicts with generated definition model ${provider.selection.target.model}.`,
    );
  }
  if (provider.modelAxis !== `selected:${provider.selection.target.model}`) {
    throw new Error('Claude resolver model axis disagrees with its target.');
  }
  if (provider.effortAxis !== `selected:${provider.selection.target.effort}`) {
    throw new Error('Claude resolver effort axis disagrees with its target.');
  }

  return {
    schemaVersion: 1,
    provider: 'claude',
    resolverRole: provider.selection.role,
    baseRole,
    variant: expectedVariant,
    model: provider.selection.target.model,
    resolvedModel: provider.selection.target.resolvedModel,
    effort: provider.selection.target.effort,
    policy: resolution.policy,
    ceiling: provider.value,
    payload: launch,
  };
}

function recordBase(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(
      'Managed Claude dispatch recordBase must be a JSON object.',
    );
  }
  const base = value as Record<string, unknown>;
  for (const field of PROTECTED_RECORD_FIELDS) {
    if (Object.hasOwn(base, field)) {
      throw new Error(
        `Managed Claude dispatch recordBase must omit derived field ${field}.`,
      );
    }
  }
  return base;
}

/** Build configured invocation evidence only from an accepted launch envelope. */
export function buildClaudeDispatchRecord(input: {
  envelope: AcceptedClaudeLaunchEnvelope;
  recordBase: unknown;
}): GenericDispatchRecord {
  const base = recordBase(input.recordBase);
  const action = base.action;
  if (
    (input.envelope.resolverRole === 'reviewer' && action !== 'review') ||
    (input.envelope.resolverRole === 'implementer' &&
      action !== 'implementation' &&
      action !== 'fix')
  ) {
    throw new Error(
      `Managed Claude resolver role ${input.envelope.resolverRole} conflicts with record action ${String(action)}.`,
    );
  }

  return parseGenericDispatchRecord({
    ...base,
    provider: 'claude',
    dispatch_policy: input.envelope.policy,
    dispatch_ceiling: input.envelope.ceiling,
    role_name: input.envelope.baseRole,
    role_selector: input.envelope.variant,
    model_selector: input.envelope.model,
    model_selector_granularity: 'exact-native-model-choice',
    effort_selector: input.envelope.effort,
    selection_source: 'policy-resolved',
    candidates_considered: [input.envelope.variant],
    selection_reason: 'native-catalog',
    selected_route: 'native',
    payload: input.envelope.payload,
    configured_invocation_evidence: [
      {
        source: 'accepted-claude-launch-envelope',
        schemaVersion: input.envelope.schemaVersion,
        variant: input.envelope.variant,
        model: input.envelope.model,
        resolvedModel: input.envelope.resolvedModel,
        effort: input.envelope.effort,
      },
    ],
  });
}
