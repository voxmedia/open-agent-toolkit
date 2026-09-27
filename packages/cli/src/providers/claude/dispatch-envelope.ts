import { collectAbsolutePathViolations } from '@providers/identity/absolute-paths';
import {
  collectSensitiveDispatchContent,
  genericDispatchRecordBaseSchema,
  identityFieldsOf,
  parseGenericDispatchRecord,
  refineGenericDispatchRecord,
  type GenericDispatchRecord,
} from '@providers/identity/generic-dispatch-record';
import YAML from 'yaml';
import { z } from 'zod';

import { readOatManagedClaudeRole } from './codec/materialize';
import {
  buildClaudeEffortVariantName,
  type ClaudeCapabilityEvidence,
  validateClaudeDispatchCapability,
} from './targets';

const generationSchema = z.enum([
  'fable-5-1',
  'fable-5',
  'opus-5-5',
  'sonnet-5',
  'opus-4-7',
  'opus-4-6',
  'sonnet-4-6',
]);

const capabilityEvidenceSchema = z
  .object({
    source: z.enum([
      'explicit-model-id',
      'family-pin-model-id',
      'family-pin-declaration',
      'alias-capability-equivalence',
    ]),
    modelReference: z.string().min(1),
    exactModel: z.boolean(),
    generation: generationSchema.optional(),
    possibleGenerations: z.array(generationSchema).optional(),
    capabilitiesSource: z.string().min(1),
    supportedEfforts: z.array(z.string().min(1)).min(1),
  })
  .strict();

const targetSchema = z
  .object({
    model: z.string().min(1),
    effort: z.string().min(1),
    capabilityEvidence: capabilityEvidenceSchema,
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
  capabilityEvidence: ClaudeCapabilityEvidence;
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

type ParsedResolution = z.infer<typeof resolutionSchema>;
type LaunchPayload = z.infer<typeof launchPayloadSchema>;
type ResolverRole = AcceptedClaudeLaunchEnvelope['resolverRole'];

/**
 * One violation found while validating a managed Claude dispatch input.
 * `stage` is the top-level input key it belongs to (`claudeLaunch`,
 * `recordBase`, or `event`); `path` locates it inside that stage.
 * Messages name fields and expected forms; they are still routed through the
 * command's redaction boundary because a few echo caller-supplied selectors.
 */
export interface ManagedClaudeViolation {
  stage: string;
  path: string;
  message: string;
}

interface LocatedMessage {
  path: string;
  message: string;
}

/** Render a Zod issue path as `a.b[0].c`, or `<root>` when empty. */
export function formatIssuePath(
  prefix: string | null,
  path: readonly (string | number)[],
): string {
  let rendered = prefix ?? '';
  for (const segment of path) {
    rendered +=
      typeof segment === 'number'
        ? `[${segment}]`
        : rendered === ''
          ? segment
          : `.${segment}`;
  }
  return rendered === '' ? '<root>' : rendered;
}

export function zodIssueViolations(
  stage: string,
  prefix: string | null,
  error: z.ZodError,
): ManagedClaudeViolation[] {
  return error.issues.map((issue) => ({
    stage,
    path: formatIssuePath(prefix, issue.path),
    message: issue.message,
  }));
}

/**
 * The launch consistency checks, in the order the throwing boundary has always
 * applied them, so its first reported error is unchanged. A check that needs
 * an input which did not parse — the launch payload, the managed role marker,
 * or the definition frontmatter — is skipped rather than guessed at.
 */
function launchConsistencyViolations(
  resolution: ParsedResolution,
  launch: LaunchPayload | null,
  definition: string,
): LocatedMessage[] {
  const violations: LocatedMessage[] = [];
  const provider = resolution.providers.claude;
  const selected = provider.selection.target;
  if (
    provider.target.model !== selected.model ||
    provider.target.effort !== selected.effort ||
    JSON.stringify(provider.target.capabilityEvidence) !==
      JSON.stringify(selected.capabilityEvidence)
  ) {
    violations.push({
      path: 'resolution.providers.claude.target',
      message:
        'Claude resolver target and selection target disagree on model, effort, or capability evidence.',
    });
  }

  const validation = validateClaudeDispatchCapability(selected);
  if (!validation.valid) {
    violations.push({
      path: 'resolution.providers.claude.selection.target',
      message:
        validation.reason ?? 'Resolver selected an invalid Claude target.',
    });
  }

  const baseRole =
    provider.selection.role === 'reviewer'
      ? 'oat-reviewer'
      : 'oat-phase-implementer';
  const expectedVariant = buildClaudeEffortVariantName({
    agentName: baseRole,
    model: selected.model,
    effort: selected.effort,
  });
  if (provider.dispatchArgs.variant !== expectedVariant) {
    violations.push({
      path: 'resolution.providers.claude.dispatchArgs.variant',
      message: `Managed Claude resolver variant ${provider.dispatchArgs.variant} does not match selected target ${expectedVariant}.`,
    });
  }
  if (launch !== null && launch.variant !== expectedVariant) {
    violations.push({
      path: 'payload.variant',
      message: `Claude launch variant ${launch.variant} does not match resolver-selected variant ${expectedVariant}.`,
    });
  }

  const managed = readOatManagedClaudeRole(definition);
  if (!managed || managed.roleName !== expectedVariant) {
    violations.push({
      path: 'definition',
      message: `Generated Claude definition ${expectedVariant} is absent or is not the matching OAT-managed role.`,
    });
  }
  if (
    managed &&
    JSON.stringify(managed.capabilityEvidence) !==
      JSON.stringify(selected.capabilityEvidence)
  ) {
    violations.push({
      path: 'definition',
      message:
        'Generated Claude definition capability evidence does not match the resolver-selected capability.',
    });
  }

  let frontmatter: Record<string, unknown> | null = null;
  try {
    frontmatter = definitionFrontmatter(definition);
  } catch (error) {
    violations.push({
      path: 'definition',
      message: error instanceof Error ? error.message : String(error),
    });
  }
  if (frontmatter !== null) {
    if (frontmatter.name !== expectedVariant) {
      violations.push({
        path: 'definition',
        message: `Generated Claude definition name does not match ${expectedVariant}.`,
      });
    }
    if (frontmatter.model !== selected.model) {
      violations.push({
        path: 'definition',
        message: `Generated Claude definition model does not match selected model ${selected.model}.`,
      });
    }
    if (frontmatter.effort !== selected.effort) {
      violations.push({
        path: 'definition',
        message: `Generated Claude definition effort does not match selected effort ${selected.effort}.`,
      });
    }
  }

  if (
    launch !== null &&
    launch.model !== undefined &&
    launch.model !== selected.model
  ) {
    violations.push({
      path: 'payload.model',
      message: `Per-call Claude model ${launch.model} conflicts with generated definition model ${selected.model}.`,
    });
  }
  if (provider.modelAxis !== `selected:${selected.model}`) {
    violations.push({
      path: 'resolution.providers.claude.modelAxis',
      message: 'Claude resolver model axis disagrees with its target.',
    });
  }
  if (provider.effortAxis !== `selected:${selected.effort}`) {
    violations.push({
      path: 'resolution.providers.claude.effortAxis',
      message: 'Claude resolver effort axis disagrees with its target.',
    });
  }
  return violations;
}

/**
 * Validate the managed resolver result against the generated provider role and
 * the exact payload that will be launched. This is the production boundary
 * used by the project dispatch-record producer for managed Claude dispatches.
 * It stops at the first failure; {@link collectClaudeLaunchViolations} reports
 * every failure for a caller building its input.
 */
export function acceptClaudeLaunchEnvelope(input: {
  resolution: unknown;
  definition: string;
  launch: unknown;
}): AcceptedClaudeLaunchEnvelope {
  const resolution = resolutionSchema.parse(input.resolution);
  const provider = resolution.providers.claude;
  const launch = launchPayloadSchema.parse(input.launch);
  const [first] = launchConsistencyViolations(
    resolution,
    launch,
    input.definition,
  );
  if (first) throw new Error(first.message);

  const baseRole =
    provider.selection.role === 'reviewer'
      ? 'oat-reviewer'
      : 'oat-phase-implementer';
  return {
    schemaVersion: 1,
    provider: 'claude',
    resolverRole: provider.selection.role,
    baseRole,
    variant: buildClaudeEffortVariantName({
      agentName: baseRole,
      model: provider.selection.target.model,
      effort: provider.selection.target.effort,
    }),
    model: provider.selection.target.model,
    capabilityEvidence: provider.selection.target.capabilityEvidence,
    effort: provider.selection.target.effort,
    policy: resolution.policy,
    ceiling: provider.value,
    payload: launch,
  };
}

const LAUNCH_CONSISTENCY_SKIPPED =
  'claudeLaunch consistency checks (need a parsed resolution)';
const ACTION_ROLE_SKIPPED =
  'recordBase action/role check (needs a parsed resolution)';

/**
 * Report every `claudeLaunch` violation in one pass: each schema issue in the
 * resolution and the payload, then every consistency check the parsed inputs
 * allow. Consistency checks depend on a parsed resolution, and the two payload
 * checks on a parsed payload; those are skipped and named in `skipped` rather
 * than reported against a value that failed to parse.
 */
export function collectClaudeLaunchViolations(claudeLaunch: unknown): {
  resolverRole: ResolverRole | null;
  violations: ManagedClaudeViolation[];
  skipped: string[];
} {
  if (
    !claudeLaunch ||
    typeof claudeLaunch !== 'object' ||
    Array.isArray(claudeLaunch)
  ) {
    return {
      resolverRole: null,
      violations: [
        {
          stage: 'claudeLaunch',
          path: '<root>',
          message:
            'Managed Claude claudeLaunch must be a JSON object with resolution, definition, and payload.',
        },
      ],
      skipped: [LAUNCH_CONSISTENCY_SKIPPED],
    };
  }
  const launchInput = claudeLaunch as Record<string, unknown>;
  const violations: ManagedClaudeViolation[] = [];
  const resolution = resolutionSchema.safeParse(launchInput.resolution);
  if (!resolution.success) {
    violations.push(
      ...zodIssueViolations('claudeLaunch', 'resolution', resolution.error),
    );
  }
  const launch = launchPayloadSchema.safeParse(launchInput.payload);
  if (!launch.success) {
    violations.push(
      ...zodIssueViolations('claudeLaunch', 'payload', launch.error),
    );
  }
  if (!resolution.success) {
    return {
      resolverRole: null,
      violations,
      skipped: [LAUNCH_CONSISTENCY_SKIPPED],
    };
  }
  violations.push(
    ...launchConsistencyViolations(
      resolution.data,
      launch.success ? launch.data : null,
      String(launchInput.definition ?? ''),
    ).map((violation) => ({ stage: 'claudeLaunch', ...violation })),
  );
  return {
    resolverRole: resolution.data.providers.claude.selection.role,
    violations,
    skipped: [],
  };
}

const PROTECTED_FIELD_MASK = Object.fromEntries(
  PROTECTED_RECORD_FIELDS.map((field) => [field, true]),
) as { [K in (typeof PROTECTED_RECORD_FIELDS)[number]]: true };

/**
 * The caller-authored half of a managed record: the closed generic field set
 * with every derived field omitted, plus the same cross-field rules. Its
 * refinements only run once the object itself parses, so a cross-field rule
 * is reported on the run after a missing or mistyped field is fixed.
 */
const managedRecordBaseSchema = genericDispatchRecordBaseSchema
  .omit(PROTECTED_FIELD_MASK)
  .superRefine(refineGenericDispatchRecord);

function actionConflict(
  resolverRole: ResolverRole,
  action: unknown,
): string | null {
  return (resolverRole === 'reviewer' && action !== 'review') ||
    (resolverRole === 'implementer' &&
      action !== 'implementation' &&
      action !== 'fix')
    ? `Managed Claude resolver role ${resolverRole} conflicts with record action ${String(action)}.`
    : null;
}

/**
 * Report every `recordBase` violation in one pass: each derived field that is
 * present, the action/role check, every missing, mistyped, or unknown field,
 * every absolute path in an identity or control field, and every sensitive key
 * or value. The action/role check needs a parsed resolution and is skipped
 * without one.
 */
export function collectClaudeRecordBaseViolations(
  candidate: unknown,
  resolverRole: ResolverRole | null,
): { violations: ManagedClaudeViolation[]; skipped: string[] } {
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
    return {
      violations: [
        {
          stage: 'recordBase',
          path: '<root>',
          message: 'Managed Claude dispatch recordBase must be a JSON object.',
        },
      ],
      skipped: [],
    };
  }
  const base = candidate as Record<string, unknown>;
  const protectedFields = new Set<string>(PROTECTED_RECORD_FIELDS);
  const violations: ManagedClaudeViolation[] = [];
  for (const field of PROTECTED_RECORD_FIELDS) {
    if (Object.hasOwn(base, field)) {
      violations.push({
        stage: 'recordBase',
        path: field,
        message: `Managed Claude dispatch recordBase must omit derived field ${field}.`,
      });
    }
  }

  const skipped: string[] = [];
  if (resolverRole === null) {
    skipped.push(ACTION_ROLE_SKIPPED);
  } else {
    const conflict = actionConflict(resolverRole, base.action);
    if (conflict !== null) {
      violations.push({
        stage: 'recordBase',
        path: 'action',
        message: conflict,
      });
    }
  }

  const callerOwned = Object.fromEntries(
    Object.entries(base).filter(([key]) => !protectedFields.has(key)),
  );
  const parsed = managedRecordBaseSchema.safeParse(callerOwned);
  if (!parsed.success) {
    violations.push(...zodIssueViolations('recordBase', null, parsed.error));
  }
  for (const [field, value] of Object.entries(
    identityFieldsOf(callerOwned as GenericDispatchRecord),
  )) {
    violations.push(
      ...collectAbsolutePathViolations(value, field).map((violation) => ({
        stage: 'recordBase',
        ...violation,
      })),
    );
  }
  violations.push(
    ...collectSensitiveDispatchContent(base, 'recordBase').map((violation) => ({
      stage: 'recordBase',
      path: violation.path.slice('recordBase.'.length) || '<root>',
      message: violation.message,
    })),
  );
  return { violations, skipped };
}

/**
 * One error for a whole validation run: a header, then one
 * `stage path: message` line per violation, then the checks that were skipped
 * because they depend on a stage that failed to parse.
 */
export class ManagedClaudeDispatchValidationError extends Error {
  readonly violations: readonly ManagedClaudeViolation[];
  readonly skipped: readonly string[];

  constructor(
    violations: readonly ManagedClaudeViolation[],
    skipped: readonly string[] = [],
  ) {
    const lines = [
      `Managed Claude dispatch input has ${violations.length} violation${violations.length === 1 ? '' : 's'}:`,
      ...violations.map(
        ({ stage, path, message }) => `${stage} ${path}: ${message}`,
      ),
    ];
    if (skipped.length > 0) {
      lines.push(`Skipped until the above are fixed: ${skipped.join('; ')}.`);
    }
    super(lines.join('\n'));
    this.name = 'ManagedClaudeDispatchValidationError';
    this.violations = violations;
    this.skipped = skipped;
  }
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
  const conflict = actionConflict(input.envelope.resolverRole, base.action);
  if (conflict !== null) throw new Error(conflict);

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
        capabilitySource: input.envelope.capabilityEvidence.source,
        capabilityModelReference:
          input.envelope.capabilityEvidence.modelReference,
        capabilityExactModel: input.envelope.capabilityEvidence.exactModel,
        capabilityGeneration:
          input.envelope.capabilityEvidence.generation ?? null,
        capabilityPossibleGenerations:
          input.envelope.capabilityEvidence.possibleGenerations?.join(',') ??
          null,
        capabilityDeclarationSource:
          input.envelope.capabilityEvidence.capabilitiesSource,
        capabilitySupportedEfforts:
          input.envelope.capabilityEvidence.supportedEfforts.join(','),
        effort: input.envelope.effort,
      },
    ],
  });
}
