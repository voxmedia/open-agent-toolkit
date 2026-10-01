import {
  acceptClaudeLaunchEnvelope,
  buildClaudeDispatchRecord,
  collectClaudeLaunchViolations,
  collectClaudeRecordBaseViolations,
  ManagedClaudeDispatchValidationError,
  zodIssueViolations,
  type ManagedClaudeViolation,
} from '@providers/claude/dispatch-envelope';
import { redactAbsolutePaths } from '@providers/identity/absolute-paths';
import { CLAUDE_OBSERVATION_SOURCE } from '@providers/identity/claude-runtime-observation';
import { CODEX_OBSERVATION_SOURCE } from '@providers/identity/codex-runtime-observation';
import {
  assertNoSensitiveDispatchContent,
  collectSensitiveDispatchContent,
  parseGenericDispatchRecord,
  redactSensitiveValues,
  type GenericDispatchRecord,
} from '@providers/identity/generic-dispatch-record';
import {
  augmentDispatchRecord,
  compareObservedRuntimeMetadata,
  comparedObservationAxes,
  configuredInvocationForObservation,
  parseRuntimeObservation,
  safeParseOatDispatchEvidenceEvent,
  type OatDispatchEvidenceEvent,
  type ObservedRuntimeMetadata,
  type PersistedOatDispatchRecordV1,
  type RuntimeObservation,
} from '@providers/identity/oat-dispatch-record';
import {
  observationFromFacts,
  parseRuntimeObservationEnvelope,
  projectRuntimeObservation,
  providerSupportsRuntimeObservation,
} from '@providers/identity/runtime-observation';
import { ZodError } from 'zod';

/**
 * Hard redaction boundary. Producers redact their own messages, but this is the
 * last stop before a message reaches `--json`, so a future call site that
 * forgets cannot regress NFR1. Known roots become stable labels; anything else
 * that still looks like an absolute path is scrubbed.
 *
 * The detector is shared with the record sanitizer. Two independent notions of
 * "looks like a path" is how a path could be scrubbed from an error message and
 * emitted verbatim in the validated record by the same command.
 */
export function redactDispatchMessage(
  message: string,
  roots: {
    repo?: string | null;
    home?: string | null;
  } = {},
): string {
  // Secrets first: a rejected value is echoed by some validation messages (a
  // Zod enum issue repeats what it received), so a secret-shaped value must be
  // scrubbed here even though the same run also reports it as sensitive.
  let redacted = redactSensitiveValues(message);
  const labelled: readonly (readonly [string, string | null | undefined])[] = [
    ['<repo>', roots.repo],
    ['<home>', roots.home],
  ];
  // Longest root first so a repository inside home is not masked by home.
  for (const [label, root] of [...labelled].sort(
    ([, left], [, right]) => (right?.length ?? 0) - (left?.length ?? 0),
  )) {
    if (root) redacted = redacted.split(root).join(label);
  }
  return redactAbsolutePaths(redacted);
}

/**
 * Source strings that state provenance. A parser source is only ever written by
 * the projection path that actually parsed provider output; a caller-supplied
 * observation is always recorded as caller-asserted.
 */
const OBSERVATION_SOURCE_BY_PROVIDER: Readonly<Record<string, string>> = {
  codex: CODEX_OBSERVATION_SOURCE,
  claude: CLAUDE_OBSERVATION_SOURCE,
};
const CALLER_ASSERTED_OBSERVATION_SOURCE = 'caller-asserted';
/** A managed Claude record's provider is derived, and always this value. */
const MANAGED_CLAUDE_PROVIDER = 'claude';

export interface DispatchRecordInput {
  record: GenericDispatchRecord;
  event: OatDispatchEvidenceEvent;
  /** Why an observation degraded, when one did. Not durable evidence. */
  observationReason?: string | null;
}

/**
 * Configured and observed identity, reported side by side and never merged.
 * `configured` is the launcher-owned immutable selection; `observed` is
 * optional per-run corroboration that is `null` whenever the provider reported
 * nothing. A `match` of `mismatching` is evidence, not authorization.
 */
export interface DispatchRecordRuntimeIdentity {
  configured: {
    roleName: string;
    roleSelector: string | null;
    model: string | null;
    effort: string | null;
    serviceTier: string | null;
  };
  observed: {
    provider: string;
    source: string;
    observedAt: string;
    childLineage: string | null;
    role: string | null;
    model: string | null;
    effort: string | null;
    serviceTier: string | null;
  } | null;
  match: 'matching' | 'mismatching' | 'not-comparable' | null;
  /**
   * The axes `match` rests on. A `matching` verdict says nothing about an axis
   * absent from this list.
   */
  comparedAxes: readonly string[];
  /**
   * Why an observation is `not-reported`, so a caller attaching a 25 MB rollout
   * can tell that outcome from one attaching an empty array. A per-command
   * diagnostic, never durable evidence.
   */
  reason: string | null;
  status: 'reported' | 'not-reported';
}

/**
 * The command validates and never persists: nothing is written to disk, so
 * `validated-only` is the only success status.
 */
export type ProjectDispatchRecordResult = {
  status: 'validated-only';
  record: PersistedOatDispatchRecordV1;
  runtimeIdentity: DispatchRecordRuntimeIdentity;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Resolve a post-launch observation event.
 *
 * A caller may submit either a finished `observation` or the sanitized provider
 * `metadata` it was derived from. Submitting both is ambiguous and is refused
 * rather than silently preferring one.
 *
 * Both forms are validated here, at the recording boundary, rather than
 * being trusted from the producer. An earlier revision normalized only the
 * metadata form, which left the finished-observation form able to assert its
 * own `match`, name a provider the record does not use, and store values the
 * metadata path would have refused. That is the per-producer-obligation class
 * this boundary exists to prevent, so `match` is always derived and never read
 * from the caller, and the provider is always bound to the record's own.
 *
 * Value shape is enforced once more in `runtimeObservationSchema`, so both
 * forms converge on the same identifier rules without either path carrying its
 * own copy of them.
 */
function resolveObservationEvent(
  record: GenericDispatchRecord,
  event: Record<string, unknown>,
): Record<string, unknown> {
  if (event.kind !== 'runtime-observation') return event;
  if ('metadata' in event && 'observation' in event) {
    throw new Error(
      'A runtime observation event carries either observation or metadata, not both.',
    );
  }
  if ('metadata' in event) return event;

  const observation = event.observation;
  if (!isRecord(observation) || observation.status !== 'reported') {
    return event;
  }
  if (observation.provider !== record.provider) {
    throw new Error(
      'A runtime observation must name the same provider as its dispatch record.',
    );
  }
  if (!providerSupportsRuntimeObservation(record.provider)) {
    throw new Error(
      `Provider ${record.provider} has no runtime observation capability, so it cannot report an observation.`,
    );
  }
  return {
    ...event,
    observation: parseRuntimeObservation({
      ...observation,
      // Provenance is derived, never accepted: a hand-authored observation
      // cannot borrow a parser's source string and pass as a genuine parse.
      source: CALLER_ASSERTED_OBSERVATION_SOURCE,
      match: compareObservedRuntimeMetadata(
        observation as ObservedRuntimeMetadata,
        configuredInvocationForObservation(record),
      ),
      comparedAxes: comparedObservationAxes(
        observation as ObservedRuntimeMetadata,
        configuredInvocationForObservation(record),
      ),
    }),
  };
}

/**
 * Project a caller-form `runtime-observation` event onto the shape the event
 * schema checks, so the single-run pass reports its errors alongside every
 * other stage instead of on a later run.
 *
 * The caller controls the envelope (`kind`, `requestId`, `source`, unknown
 * keys) and either a finished `observation` or a `metadata` envelope, and
 * both are checked here. The recording path derives an observation's
 * `source`, `match`, and `comparedAxes` from the record, so those are filled
 * with valid stand-ins rather than demanded from the caller; the metadata
 * form's projection and request-correlation guard degrade to `not-reported`
 * rather than fail, so they contribute no violation. The provider binding is
 * checked directly: a managed record's provider is always `claude`.
 */
function runtimeObservationCallerForm(
  event: Record<string, unknown>,
  violations: ManagedClaudeViolation[],
): Record<string, unknown> {
  if ('metadata' in event) {
    if ('observation' in event) {
      violations.push({
        stage: 'event',
        path: '<root>',
        message:
          'A runtime observation event carries either observation or metadata, not both.',
      });
    }
    try {
      parseRuntimeObservationEnvelope(event.metadata);
    } catch (error) {
      if (error instanceof ZodError) {
        violations.push(...zodIssueViolations('event', 'metadata', error));
      } else {
        violations.push({
          stage: 'event',
          path: 'metadata',
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }
    const { metadata: _metadata, observation: _observation, ...rest } = event;
    return { ...rest, observation: { status: 'not-reported' } };
  }

  const observation = event.observation;
  if (!isRecord(observation) || observation.status !== 'reported') {
    return event;
  }
  if (observation.provider !== MANAGED_CLAUDE_PROVIDER) {
    violations.push({
      stage: 'event',
      path: 'observation.provider',
      message:
        'A runtime observation must name the same provider as its dispatch record.',
    });
  }
  return {
    ...event,
    observation: {
      ...observation,
      provider: MANAGED_CLAUDE_PROVIDER,
      source: CALLER_ASSERTED_OBSERVATION_SOURCE,
      match: 'not-comparable',
      comparedAxes: [],
    },
  };
}

/**
 * Event violations for a managed input: the event must be an object, carry no
 * sensitive content, satisfy the evidence-event schema, and name the same
 * request as `recordBase`. Raw provider `metadata` entries are exempt from the
 * sensitive walk exactly as on the recording path. A `runtime-observation`
 * event is validated here too: `runtimeObservationCallerForm` projects its
 * caller form onto the schema shape, filling the fields the recording path
 * derives (source, match, compared axes) with valid stand-ins, so its errors
 * join this single-run report.
 */
function collectManagedEventViolations(
  event: unknown,
  recordBase: unknown,
): ManagedClaudeViolation[] {
  if (!isRecord(event)) {
    return [
      {
        stage: 'event',
        path: '<root>',
        message: 'Dispatch record event must be a JSON object.',
      },
    ];
  }
  const violations: ManagedClaudeViolation[] = [];
  const walked = isRecord(event.metadata)
    ? { ...event, metadata: { ...event.metadata, entries: null } }
    : event;
  violations.push(
    ...collectSensitiveDispatchContent(walked, 'event').map((violation) => ({
      stage: 'event',
      path: violation.path.slice('event.'.length) || '<root>',
      message: violation.message,
    })),
  );
  const parsed = safeParseOatDispatchEvidenceEvent(
    event.kind === 'runtime-observation'
      ? runtimeObservationCallerForm(event, violations)
      : event,
  );
  if (!parsed.success) {
    violations.push(...zodIssueViolations('event', null, parsed.error));
  }
  const recordRequestId = isRecord(recordBase) ? recordBase.request_id : null;
  if (
    typeof event.requestId === 'string' &&
    typeof recordRequestId === 'string' &&
    event.requestId !== recordRequestId
  ) {
    violations.push({
      stage: 'event',
      path: 'requestId',
      message: 'OAT event request ID must match the generic record.',
    });
  }
  return violations;
}

/**
 * The single-run pass for a managed Claude input. Every stage is validated
 * independently and every violation is reported in one error, so a caller
 * assembling the input fixes it in one round instead of one field per run.
 * Checks that depend on a stage which failed to parse are skipped and named in
 * the error; the recording path below still runs every check afterwards, so
 * nothing this pass skips goes unchecked.
 */
function assertManagedClaudeInputValid(value: Record<string, unknown>): void {
  const launch = collectClaudeLaunchViolations(value.claudeLaunch);
  const base = collectClaudeRecordBaseViolations(
    value.recordBase,
    launch.resolverRole,
  );
  const violations = [
    ...launch.violations,
    ...base.violations,
    ...collectManagedEventViolations(value.event, value.recordBase),
  ];
  if (violations.length > 0) {
    throw new ManagedClaudeDispatchValidationError(violations, [
      ...launch.skipped,
      ...base.skipped,
    ]);
  }
}

export function parseDispatchRecordInput(value: unknown): DispatchRecordInput {
  if (!isRecord(value)) {
    throw new Error('Dispatch record input must be a JSON object.');
  }
  const keys = Object.keys(value).sort();
  const isGenericInput =
    keys.length === 2 && keys[0] === 'event' && keys[1] === 'record';
  const isManagedClaudeInput =
    keys.length === 3 &&
    keys[0] === 'claudeLaunch' &&
    keys[1] === 'event' &&
    keys[2] === 'recordBase';
  if (!isGenericInput && !isManagedClaudeInput) {
    throw new Error(
      'Dispatch record input accepts record and event, or claudeLaunch, event, and recordBase.',
    );
  }
  if (isManagedClaudeInput) {
    assertManagedClaudeInputValid(value);
  }
  if (!isRecord(value.event)) {
    throw new Error('Dispatch record event must be a JSON object.');
  }

  const record = isManagedClaudeInput
    ? buildClaudeDispatchRecord({
        envelope: acceptClaudeLaunchEnvelope({
          resolution: isRecord(value.claudeLaunch)
            ? value.claudeLaunch.resolution
            : undefined,
          definition: isRecord(value.claudeLaunch)
            ? String(value.claudeLaunch.definition ?? '')
            : '',
          launch: isRecord(value.claudeLaunch)
            ? value.claudeLaunch.payload
            : undefined,
        }),
        recordBase: value.recordBase,
      })
    : parseGenericDispatchRecord(value.record);
  const boundedInput = { record, event: value.event };

  // Raw provider metadata is the one input a caller may legitimately supply
  // unmodified, so it is projected through the owning parser's allowlist and
  // asserted as the projection. Everything else is asserted exactly as given.
  // Asserting the raw entries instead would refuse real rollouts outright —
  // a Codex `session_id` alone classifies as sensitive — which is what pushed
  // sanitization onto callers and invited a hand-rolled stripper.
  const rawMetadata = isRecord(value.event.metadata)
    ? value.event.metadata
    : null;
  assertNoSensitiveDispatchContent(
    rawMetadata === null
      ? boundedInput
      : {
          ...boundedInput,
          event: {
            ...value.event,
            metadata: { ...rawMetadata, entries: null },
          },
        },
  );

  if (rawMetadata !== null) {
    if ('observation' in value.event) {
      throw new Error(
        'A runtime observation event carries either observation or metadata, not both.',
      );
    }
    const envelope = parseRuntimeObservationEnvelope(rawMetadata);
    const projected =
      envelope.provider === record.provider
        ? projectRuntimeObservation(envelope.provider, envelope.entries)
        : {
            facts: null,
            reason: `observation metadata names provider ${envelope.provider}, but the record names ${record.provider}`,
          };
    const facts = projected.facts;
    assertNoSensitiveDispatchContent(facts, '<observation-metadata>');
    const { metadata: _metadata, ...rest } = value.event;
    // Built here from parsed provider output, so it carries a parser source and
    // must not be re-processed as if a caller had supplied it.
    const observation = observationFromFacts({
      record,
      provider: envelope.provider,
      source: OBSERVATION_SOURCE_BY_PROVIDER[envelope.provider] ?? 'unknown',
      observedAt: envelope.observedAt,
      facts,
    });
    return {
      record,
      event: { ...rest, observation } as OatDispatchEvidenceEvent,
      observationReason:
        observation.status === 'reported'
          ? null
          : // Facts can be produced and still be declined downstream, when the
            // session declares a different request than this record does.
            (projected.reason ??
            'observation metadata correlates to a different request'),
    };
  }

  return {
    record,
    event: resolveObservationEvent(
      record,
      value.event,
    ) as OatDispatchEvidenceEvent,
  };
}

function runtimeIdentityFor(
  record: PersistedOatDispatchRecordV1,
  reason: string | null = null,
): DispatchRecordRuntimeIdentity {
  const observation: RuntimeObservation = record.oat.runtimeObservation;
  return {
    configured: {
      roleName: record.role_name,
      roleSelector: record.role_selector,
      model: record.model_selector,
      effort: record.effort_selector,
      serviceTier: record.service_tier_selector ?? null,
    },
    observed:
      observation.status === 'reported'
        ? {
            provider: observation.provider,
            source: observation.source,
            observedAt: observation.observedAt,
            childLineage: observation.childLineage ?? null,
            role: observation.role ?? null,
            model: observation.model ?? null,
            effort: observation.effort ?? null,
            serviceTier: observation.serviceTier ?? null,
          }
        : null,
    match: observation.status === 'reported' ? observation.match : null,
    comparedAxes:
      observation.status === 'reported' ? (observation.comparedAxes ?? []) : [],
    reason: observation.status === 'reported' ? null : reason,
    status: observation.status,
  };
}

/**
 * Validate one dispatch record and event and return the augmented record. Parse
 * once, here. An earlier revision parsed in the command layer and again here;
 * because the metadata path resolves to a finished observation, the second
 * parse saw its own output as caller-supplied and overwrote the parser source
 * with `caller-asserted`. Parsing is not idempotent by design — provenance
 * depends on which input form arrived — so it must happen exactly once.
 */
export async function recordProjectDispatch(input: {
  input: unknown;
}): Promise<ProjectDispatchRecordResult> {
  const parsedInput = parseDispatchRecordInput(input.input);
  const record = augmentDispatchRecord(parsedInput);
  return {
    status: 'validated-only',
    record,
    runtimeIdentity: runtimeIdentityFor(
      record,
      parsedInput.observationReason ?? null,
    ),
  };
}
