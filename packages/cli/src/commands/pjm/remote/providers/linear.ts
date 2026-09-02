import { containsSensitiveContentSignal } from '@commands/pjm/remote/credential-safety';
import {
  requireCurrentOutboundSafety,
  type OutboundProjection,
  type OutboundProjectionSafetyResult,
} from '@commands/pjm/remote/outbound-projection-safety';
import {
  contextsEqual,
  semanticDigest,
  type FieldVerification,
  type NormalizedRemoteIssue,
  type ObservationValidation,
  type ProviderAdapter,
  type ProviderContext,
  type SanitizedProviderObservation,
  type SemanticAction,
  type SemanticOperation,
} from '@commands/pjm/remote/provider';
import { WHOLE_FIELD_SUPPRESSION_MARKER } from '@commands/pjm/remote/schema';

export interface LinearIssueReference {
  host?: string;
  identifier: string;
  alias: string;
}

export type LinearSemanticField =
  | 'stable-identity'
  | 'title'
  | 'description'
  | 'state'
  | 'priority'
  | 'revision'
  | 'team-context';

export interface LinearHostCapabilityObservation {
  provider: 'linear';
  context: ProviderContext;
  availability:
    | 'available'
    | 'unavailable'
    | 'authorization-required'
    | 'rate-limited';
  accountId: string;
  workspaceId: string;
  teamId: string;
  operations: SemanticOperation[];
  observableFields: LinearSemanticField[];
  evidenceDigest: string;
}

export interface LinearReadPlanInput {
  context: ProviderContext;
  hostCapability: LinearHostCapabilityObservation;
  stableId: string;
  uuid: string;
  currentIdentifier: string | null;
  stepId: string;
}

export interface LinearDiscussionReadPlanInput {
  context: ProviderContext;
  hostCapability: LinearHostCapabilityObservation;
  stableId: string;
  cursor: string | null;
  limit: number;
}

export type LinearMutationField =
  | 'title'
  | 'description'
  | 'priority'
  | 'status'
  | 'annotation';

export interface LinearMutationPreviewInput {
  operation: 'create' | 'update' | 'transition' | 'annotate';
  context: ProviderContext;
  hostCapability: LinearHostCapabilityObservation;
  bindingId: string;
  stableId?: string;
  provenance?: { bindingId: string; origin: string };
  fieldMask: readonly string[];
  projection: OutboundProjection;
  outboundSafety: OutboundProjectionSafetyResult;
}

export interface LinearMutationPlanInput extends LinearMutationPreviewInput {
  approvedPreviewDigest: string;
}

export interface LinearMutationPreview {
  previewDigest: string;
  executionEvidence: {
    capabilityEvidenceDigest: string;
    projectionDigest: string;
    outboundSafetyResultDigest: string;
  };
}

export type LinearReadClassification =
  | 'current'
  | 'moved'
  | 'archived'
  | 'partial'
  | 'inaccessible'
  | 'temporarily-unavailable';

export interface LinearReadObservationInput {
  action: SemanticAction;
  hostCapability: LinearHostCapabilityObservation;
  observedAt: string;
  outcome: 'found' | 'not-found' | 'temporary-failure';
  observation?: SanitizedProviderObservation;
}

export interface LinearReadResult {
  classification: LinearReadClassification;
  issue: NormalizedRemoteIssue | null;
  preservePriorEvidence: boolean;
  reasons: string[];
}

export interface LinearDiscussionItemObservation {
  id: string;
  body: string;
  observedAt: string;
}

export interface LinearDiscussionReadObservation {
  provider: 'linear';
  context: ProviderContext;
  stableId: string;
  availability: 'available' | 'rate-limited' | 'permission-denied';
  capabilityEvidenceDigest: string;
  requestedCursor: string | null;
  nextCursor: string | null;
  items: LinearDiscussionItemObservation[];
}

export interface LinearDiscussionReadValidationInput {
  action: SemanticAction;
  hostCapability: LinearHostCapabilityObservation;
  observation: LinearDiscussionReadObservation;
}

export interface LinearMutationVerificationInput {
  action: SemanticAction;
  attempt: {
    count: number;
    outcome: 'accepted' | 'rejected' | 'unknown';
    capabilityEvidenceDigest: string;
  };
  hostCapability: LinearHostCapabilityObservation;
  readback: SanitizedProviderObservation | null;
}

export interface LinearMutationVerificationResult {
  classification: 'verified' | 'partial' | 'rejected' | 'uncertain';
  reason: string;
  fields: FieldVerification[];
  retryAllowed: false;
}

export interface LinearDuplicateSearchPlanInput {
  context: ProviderContext;
  hostCapability: LinearHostCapabilityObservation;
  provenanceToken: string;
  reservedBindingId: string;
  historicalIdentifiers: string[];
  maxResults: number;
}

export interface LinearDuplicateCandidate {
  uuid: string;
  stableId: string;
  identifiers: string[];
  context: ProviderContext;
  matchedBy: 'provenance' | 'reserved-binding' | 'identifier';
  matchedProvenanceToken?: string;
  matchedReservedBindingId?: string;
  matchedIdentifier?: string;
  stableIdentityVerified: boolean;
  contextVerified: boolean;
}

export interface LinearDuplicateSearchObservation {
  provider: 'linear';
  context: ProviderContext;
  availability: 'available' | 'unavailable';
  capabilityEvidenceDigest: string;
  queryDigest: string;
  observedAt: string;
  results: LinearDuplicateCandidate[];
}

export interface LinearDuplicateSearchValidationInput {
  action: SemanticAction;
  hostCapability: LinearHostCapabilityObservation;
  observation: LinearDuplicateSearchObservation;
}

export interface LinearDuplicateSearchValidationResult {
  accepted: boolean;
  classification:
    | 'no-match'
    | 'one-verified-match'
    | 'ambiguous'
    | 'unavailable'
    | 'invalid';
  stableId: string | null;
  reasons: string[];
}

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const IDENTIFIER = /^[A-Z][A-Z0-9]*-[1-9][0-9]*$/;
const URL_REFERENCE =
  /^https:\/\/([^/]+)\/[^/]+\/issue\/([A-Z][A-Z0-9]*-[1-9][0-9]*)(?:\/[^/?#]+)?(?:[?#].*)?$/;
const LINEAR_EXTENSION_KEYS = ['estimate', 'cycleId', 'projectId'] as const;

/** Absolute UTF-8 bounds for one non-persisted Linear discussion page. */
export const LINEAR_DISCUSSION_LIMITS = {
  maxItems: 100,
  maxIdBytes: 256,
  maxBodyBytes: 16_384,
  maxCursorBytes: 512,
  maxPageBytes: 65_536,
} as const;

export function parseLinearIssueReference(
  reference: string,
): LinearIssueReference | null {
  const value = reference.trim();
  const url = URL_REFERENCE.exec(value);
  if (url) {
    return {
      host: url[1]!.toLowerCase(),
      identifier: url[2]!,
      alias: value,
    };
  }
  if (!IDENTIFIER.test(value)) return null;
  return { identifier: value, alias: value };
}

export function normalizeLinearIssueObservation(
  observation: SanitizedProviderObservation,
): NormalizedRemoteIssue {
  assertLinearObservation(observation);
  const workspaceId = requiredContext(observation, 'workspaceId');
  const teamId = requiredContext(observation, 'teamId');
  const uuid = requiredString(observation.fields, 'uuid').toLowerCase();
  if (!UUID.test(uuid)) throw new Error('Linear issue UUID is invalid.');
  if (
    observation.identity.stableId.toLowerCase() !== uuid &&
    observation.identity.stableId !== canonicalLinearStableId(workspaceId, uuid)
  ) {
    throw new Error('Linear observation stable identity does not match UUID.');
  }
  if (observation.fields.workspaceId !== workspaceId) {
    throw new Error('Linear observation workspace context does not match.');
  }
  if (observation.fields.teamId !== teamId) {
    throw new Error('Linear observation team context does not match.');
  }
  const identifier = requiredString(observation.fields, 'identifier');
  if (!IDENTIFIER.test(identifier)) {
    throw new Error('Linear issue identifier is invalid.');
  }
  const historicalIdentifiers = stringArray(
    observation.fields.historicalIdentifiers,
  ).filter((alias) => alias !== identifier);
  const historicalTeamIds = stringArray(
    observation.fields.historicalTeamIds,
  ).filter((historicalTeamId) => historicalTeamId !== teamId);
  const suppressedFields: string[] = [];
  const title = suppressInboundText(
    requiredString(observation.fields, 'title'),
    'title',
    suppressedFields,
  );
  const description = suppressNullableInboundText(
    observation.fields.description,
    'description',
    suppressedFields,
  );
  const extensions: Record<string, unknown> = {
    uuid,
    workspaceId,
    teamId,
    historicalTeamIds,
    currentIdentifier: identifier,
    historicalIdentifiers,
    archived: requiredBoolean(observation.fields, 'archived'),
  };
  for (const key of LINEAR_EXTENSION_KEYS) {
    const value = observation.fields[key];
    if (value !== undefined && isBoundedExtensionValue(value)) {
      extensions[key] = value;
    }
  }
  if (isRecord(observation.fields.mutationEvidence)) {
    extensions.capabilityEvidenceDigest = observation.capabilityEvidenceDigest;
    extensions.mutationEvidence = observation.fields.mutationEvidence;
  }
  if (isRecord(observation.fields.createProvenance)) {
    extensions.createProvenance = observation.fields.createProvenance;
  }
  if (Array.isArray(observation.fields.annotations)) {
    extensions.annotations = stringArray(observation.fields.annotations);
  }
  extensions.suppressedFields = suppressedFields;
  return {
    provider: 'linear',
    context: observation.context,
    stableId: canonicalLinearStableId(workspaceId, uuid),
    aliases: uniqueStrings([
      identifier,
      ...historicalIdentifiers,
      ...observation.identity.aliases,
    ]),
    title,
    description,
    priority: nullableString(observation.fields.priority),
    status: requiredString(observation.fields, 'state'),
    revisionDigest: semanticDigest(observation.revision),
    extensions,
  };
}

export function validateLinearHostCapability(
  operation: SemanticOperation,
  context: ProviderContext,
  observed: LinearHostCapabilityObservation,
  requiredFields: LinearSemanticField[] = [],
): ObservationValidation {
  const reasons: string[] = [];
  if (observed.provider !== 'linear') reasons.push('provider-mismatch');
  if (observed.availability === 'unavailable')
    reasons.push('access-unavailable');
  if (observed.availability === 'authorization-required')
    reasons.push('authorization-required');
  if (observed.availability === 'rate-limited') reasons.push('rate-limited');
  if (
    !hasPinnedLinearContext(context) ||
    !contextsEqual(context, observed.context)
  ) {
    reasons.push('context-mismatch');
  }
  if (context.accountId !== observed.accountId)
    reasons.push('account-mismatch');
  if (context.workspaceId !== observed.workspaceId)
    reasons.push('workspace-mismatch');
  if (context.teamId !== observed.teamId) reasons.push('team-mismatch');
  if (!observed.operations.includes(operation)) {
    reasons.push(`capability-missing:${operation}`);
  }
  for (const field of requiredFields) {
    if (!observed.observableFields.includes(field)) {
      reasons.push(`semantic-field-missing:${field}`);
    }
  }
  if (!observed.evidenceDigest) reasons.push('capability-evidence-missing');
  return { valid: reasons.length === 0, reasons };
}

export function planLinearRead(input: LinearReadPlanInput): SemanticAction {
  if (
    !hasPinnedLinearContext(input.context) ||
    !validLinearStableIdForContext(input.stableId, input.context) ||
    !UUID.test(input.uuid) ||
    input.stableId !==
      canonicalLinearStableId(input.context.workspaceId!, input.uuid) ||
    (input.currentIdentifier !== null &&
      !IDENTIFIER.test(input.currentIdentifier)) ||
    !input.stepId ||
    Buffer.byteLength(input.stepId, 'utf8') > 128
  ) {
    throw new Error('Linear read plan requires pinned identity and context.');
  }
  const capability = validateLinearHostCapability(
    'read',
    input.context,
    input.hostCapability,
    ['stable-identity', 'title', 'state', 'revision', 'team-context'],
  );
  if (!capability.valid) {
    throw new Error(
      `Linear read capability is unavailable: ${capability.reasons.join(',')}`,
    );
  }
  const intent = {
    stableId: input.stableId,
    uuid: input.uuid.toLowerCase(),
    currentIdentifier: input.currentIdentifier,
    stepId: input.stepId,
    capabilityEvidenceDigest: input.hostCapability.evidenceDigest,
    resultContract: {
      requireStableIdentity: true,
      requireExactContext: true,
      allowedFields: [
        'uuid',
        'identifier',
        'historicalIdentifiers',
        'workspaceId',
        'teamId',
        'historicalTeamIds',
        'title',
        'description',
        'state',
        'priority',
        'archived',
        ...LINEAR_EXTENSION_KEYS,
      ],
    },
  };
  return {
    provider: 'linear',
    operation: 'read',
    context: input.context,
    intent: {
      ...intent,
      actionDigest: semanticDigest({
        provider: 'linear',
        operation: 'read',
        context: input.context,
        intent,
      }),
    },
  };
}

export function planLinearDiscussionRead(
  input: LinearDiscussionReadPlanInput,
): SemanticAction {
  const capability = validateLinearHostCapability(
    'read-discussion',
    input.context,
    input.hostCapability,
  );
  if (!capability.valid) {
    throw new Error('Linear discussion read capability is unavailable.');
  }
  if (
    !validLinearStableIdForContext(input.stableId, input.context) ||
    !Number.isInteger(input.limit) ||
    input.limit < 1 ||
    input.limit > LINEAR_DISCUSSION_LIMITS.maxItems ||
    (input.cursor !== null &&
      (typeof input.cursor !== 'string' ||
        Buffer.byteLength(input.cursor, 'utf8') >
          LINEAR_DISCUSSION_LIMITS.maxCursorBytes))
  ) {
    throw new Error('Linear discussion read bounds are invalid.');
  }
  const intent = {
    stableId: input.stableId,
    cursor: input.cursor,
    limit: input.limit,
    resultContract: {
      maxItems: input.limit,
      maxIdBytes: LINEAR_DISCUSSION_LIMITS.maxIdBytes,
      maxBodyBytes: LINEAR_DISCUSSION_LIMITS.maxBodyBytes,
      maxCursorBytes: LINEAR_DISCUSSION_LIMITS.maxCursorBytes,
      maxPageBytes: LINEAR_DISCUSSION_LIMITS.maxPageBytes,
      persistable: false,
      contentPolicy: 'sanitized-whole-field-suppression',
    },
    capabilityEvidenceDigest: input.hostCapability.evidenceDigest,
  };
  return {
    provider: 'linear',
    operation: 'read-discussion',
    context: input.context,
    intent: {
      ...intent,
      actionDigest: semanticDigest({
        provider: 'linear',
        operation: 'read-discussion',
        context: input.context,
        intent,
      }),
    },
  };
}

export function previewLinearMutation(
  input: LinearMutationPreviewInput,
): LinearMutationPreview {
  const capability = validateLinearHostCapability(
    input.operation,
    input.context,
    input.hostCapability,
  );
  if (!capability.valid) {
    throw new Error('Linear mutation capability is unavailable.');
  }
  assertLinearMutationIdentity(input);
  const fieldMask = normalizeLinearMutationFieldMask(
    input.operation,
    input.fieldMask,
    input.projection,
  );
  requireCurrentOutboundSafety(input.projection, input.outboundSafety);
  const executionEvidence = {
    capabilityEvidenceDigest: input.hostCapability.evidenceDigest,
    projectionDigest: input.outboundSafety.projectionDigest,
    outboundSafetyResultDigest: input.outboundSafety.resultDigest,
  };
  return {
    previewDigest: linearMutationPreviewDigest({
      operation: input.operation,
      context: input.context,
      bindingId: input.bindingId,
      stableId: input.stableId ?? null,
      provenance: input.provenance ?? null,
      fieldMask,
      projection: input.projection,
      executionEvidence,
    }),
    executionEvidence,
  };
}

export function planLinearMutation(
  input: LinearMutationPlanInput,
): SemanticAction {
  const preview = previewLinearMutation(input);
  if (input.approvedPreviewDigest !== preview.previewDigest) {
    throw new Error('Linear mutation approval does not match its preview.');
  }
  const fieldMask = normalizeLinearMutationFieldMask(
    input.operation,
    input.fieldMask,
    input.projection,
  );
  const actionDigest = linearMutationActionDigest({
    operation: input.operation,
    context: input.context,
    bindingId: input.bindingId,
    stableId: input.stableId ?? null,
    provenance: input.provenance ?? null,
    fieldMask,
    projection: input.projection,
    previewDigest: preview.previewDigest,
    approvalDigest: input.approvedPreviewDigest,
    executionEvidence: preview.executionEvidence,
  });
  return {
    provider: 'linear',
    operation: input.operation,
    context: input.context,
    intent: {
      bindingId: input.bindingId,
      stableId: input.stableId ?? null,
      provenance: input.provenance ?? null,
      fieldMask,
      projection: { ...input.projection },
      postconditions: { ...input.projection },
      capabilityEvidenceDigest: input.hostCapability.evidenceDigest,
      outboundSafety: {
        projectionDigest: input.outboundSafety.projectionDigest,
        resultDigest: input.outboundSafety.resultDigest,
      },
      outboundSafetyEvidence: { ...input.outboundSafety },
      previewDigest: preview.previewDigest,
      approvalDigest: input.approvedPreviewDigest,
      actionDigest,
      executionEvidence: {
        ...preview.executionEvidence,
        previewDigest: preview.previewDigest,
        approvalDigest: input.approvedPreviewDigest,
        actionDigest,
      },
      readbackContract: {
        pinned: true,
        requireStableIdentity: true,
        requireExactContext: true,
        fields: fieldMask,
      },
    },
  };
}

export function classifyLinearReadObservation(
  input: LinearReadObservationInput,
): LinearReadResult {
  if (!validLinearReadAction(input.action)) {
    return unavailableLinearRead('inaccessible', ['read-action-invalid']);
  }
  if (!Number.isFinite(Date.parse(input.observedAt))) {
    throw new Error('Linear read classification requires a valid timestamp.');
  }
  const capability = validateLinearHostCapability(
    'read',
    input.action.context,
    input.hostCapability,
    ['stable-identity', 'title', 'state', 'revision', 'team-context'],
  );
  if (
    !capability.valid ||
    input.action.intent.capabilityEvidenceDigest !==
      input.hostCapability.evidenceDigest
  ) {
    return unavailableLinearRead('inaccessible', [
      ...capability.reasons,
      ...(input.action.intent.capabilityEvidenceDigest !==
      input.hostCapability.evidenceDigest
        ? ['capability-evidence-mismatch']
        : []),
    ]);
  }
  if (input.outcome === 'temporary-failure') {
    return unavailableLinearRead('temporarily-unavailable', [
      'temporary-host-failure',
    ]);
  }
  if (input.outcome === 'not-found' || !input.observation) {
    return unavailableLinearRead('inaccessible', [
      input.outcome === 'not-found'
        ? 'absence-not-authoritative'
        : 'read-observation-missing',
    ]);
  }
  const observation = input.observation;
  if (
    observation.provider !== 'linear' ||
    !contextsEqual(input.action.context, observation.context) ||
    observation.capabilityEvidenceDigest !==
      input.action.intent.capabilityEvidenceDigest ||
    observation.fields.uuid !== input.action.intent.uuid
  ) {
    return unavailableLinearRead('inaccessible', [
      'observation-attribution-mismatch',
    ]);
  }
  let issue: NormalizedRemoteIssue;
  try {
    issue = normalizeLinearIssueObservation(observation);
  } catch {
    return unavailableLinearRead('partial', ['read-observation-incomplete']);
  }
  if (issue.stableId !== input.action.intent.stableId) {
    return unavailableLinearRead('inaccessible', [
      'observation-identity-mismatch',
    ]);
  }
  const archived = observation.fields.archived === true;
  const moved =
    typeof input.action.intent.currentIdentifier === 'string' &&
    observation.fields.identifier !== input.action.intent.currentIdentifier &&
    Array.isArray(observation.fields.historicalIdentifiers) &&
    observation.fields.historicalIdentifiers.includes(
      input.action.intent.currentIdentifier,
    );
  return {
    classification: archived ? 'archived' : moved ? 'moved' : 'current',
    issue,
    preservePriorEvidence: false,
    reasons: [],
  };
}

export function validateLinearDiscussionReadObservation(
  input: LinearDiscussionReadValidationInput,
): {
  classification: 'page' | 'rate-limited' | 'permission-denied' | 'invalid';
  page: {
    items: Array<
      LinearDiscussionItemObservation & { contentSuppressed: boolean }
    >;
    nextCursor: string | null;
  } | null;
  persistable: false;
  reasons: string[];
} {
  const invalid = (reasons: string[]) => ({
    classification: 'invalid' as const,
    page: null,
    persistable: false as const,
    reasons,
  });
  if (
    !validLinearDiscussionAction(input.action) ||
    !contextsEqual(input.action.context, input.observation.context) ||
    input.observation.provider !== 'linear' ||
    input.observation.stableId !== input.action.intent.stableId ||
    input.observation.capabilityEvidenceDigest !==
      input.action.intent.capabilityEvidenceDigest ||
    input.observation.requestedCursor !== input.action.intent.cursor
  ) {
    return invalid(['discussion-observation-attribution-mismatch']);
  }
  const capability = validateLinearHostCapability(
    'read-discussion',
    input.action.context,
    input.hostCapability,
  );
  if (
    !capability.valid ||
    input.hostCapability.evidenceDigest !==
      input.action.intent.capabilityEvidenceDigest
  ) {
    return invalid([
      ...capability.reasons,
      ...(input.hostCapability.evidenceDigest !==
      input.action.intent.capabilityEvidenceDigest
        ? ['capability-evidence-mismatch']
        : []),
    ]);
  }
  if (input.observation.availability !== 'available') {
    return {
      classification: input.observation.availability,
      page: null,
      persistable: false,
      reasons: [input.observation.availability],
    };
  }
  const contract = input.action.intent.resultContract as Record<
    string,
    unknown
  >;
  const maxItems = Number(contract.maxItems);
  const pageBytes =
    Buffer.byteLength(input.observation.nextCursor ?? '', 'utf8') +
    input.observation.items.reduce(
      (total, item) =>
        total +
        Buffer.byteLength(item.id, 'utf8') +
        Buffer.byteLength(item.body, 'utf8'),
      0,
    );
  if (
    !Number.isInteger(maxItems) ||
    input.observation.items.length > maxItems ||
    pageBytes > LINEAR_DISCUSSION_LIMITS.maxPageBytes ||
    input.observation.items.some(
      (item) =>
        !item.id ||
        Buffer.byteLength(item.id, 'utf8') >
          LINEAR_DISCUSSION_LIMITS.maxIdBytes ||
        typeof item.body !== 'string' ||
        Buffer.byteLength(item.body, 'utf8') >
          LINEAR_DISCUSSION_LIMITS.maxBodyBytes ||
        !Number.isFinite(Date.parse(item.observedAt)),
    ) ||
    (input.observation.nextCursor !== null &&
      (typeof input.observation.nextCursor !== 'string' ||
        Buffer.byteLength(input.observation.nextCursor, 'utf8') >
          LINEAR_DISCUSSION_LIMITS.maxCursorBytes))
  ) {
    return invalid(['discussion-page-invalid']);
  }
  return {
    classification: 'page',
    page: {
      items: input.observation.items.map((item) => {
        const contentSuppressed = containsSensitiveContentSignal(item.body);
        return {
          ...item,
          body: contentSuppressed ? WHOLE_FIELD_SUPPRESSION_MARKER : item.body,
          contentSuppressed,
        };
      }),
      nextCursor: input.observation.nextCursor,
    },
    persistable: false,
    reasons: [],
  };
}

export function verifyLinearMutationObservation(
  input: LinearMutationVerificationInput,
): LinearMutationVerificationResult {
  const fields = mutationVerificationFields(input.action);
  const result = (
    classification: LinearMutationVerificationResult['classification'],
    reason: string,
    fieldResults: FieldVerification[] = fields.map((field) => ({
      field,
      status: 'unavailable',
    })),
  ): LinearMutationVerificationResult => ({
    classification,
    reason,
    fields: fieldResults,
    retryAllowed: false,
  });
  if (
    input.action.provider !== 'linear' ||
    !['create', 'update', 'transition', 'annotate'].includes(
      input.action.operation,
    ) ||
    !validLinearMutationAction(input.action) ||
    input.attempt.count !== 1 ||
    input.attempt.capabilityEvidenceDigest !==
      input.action.intent.capabilityEvidenceDigest
  ) {
    return result('uncertain', 'mutation-attribution-invalid');
  }
  if (input.attempt.outcome === 'rejected') {
    return result('rejected', 'provider-rejected-before-acceptance');
  }
  if (input.attempt.outcome === 'unknown' || !input.readback) {
    return result('uncertain', 'authoritative-readback-required');
  }
  const capability = validateLinearHostCapability(
    input.action.operation,
    input.action.context,
    input.hostCapability,
  );
  if (
    !capability.valid ||
    input.hostCapability.evidenceDigest !==
      input.action.intent.capabilityEvidenceDigest ||
    input.readback.provider !== 'linear' ||
    !contextsEqual(input.action.context, input.readback.context) ||
    input.readback.capabilityEvidenceDigest !==
      input.action.intent.capabilityEvidenceDigest ||
    !semanticValuesEqual(
      input.readback.fields.mutationEvidence,
      input.action.intent.executionEvidence,
    )
  ) {
    return result('uncertain', 'pinned-readback-evidence-mismatch');
  }
  let issue: NormalizedRemoteIssue;
  try {
    issue = normalizeLinearIssueObservation(input.readback);
  } catch {
    return result('uncertain', 'authoritative-readback-invalid');
  }
  if (
    input.action.operation !== 'create' &&
    issue.stableId !== input.action.intent.stableId
  ) {
    return result('uncertain', 'pinned-readback-identity-mismatch');
  }
  if (
    input.action.operation === 'create' &&
    !semanticValuesEqual(
      input.readback.fields.createProvenance,
      input.action.intent.provenance,
    )
  ) {
    return result('uncertain', 'create-provenance-mismatch');
  }
  const postconditions = input.action.intent.postconditions as Record<
    string,
    unknown
  >;
  const fieldResults = fields.map((field): FieldVerification => {
    const expected = postconditions[field];
    const observed =
      field === 'description'
        ? issue.description
        : field === 'status'
          ? issue.status
          : field === 'annotation'
            ? issue.extensions.annotations
            : issue[field as 'title' | 'priority'];
    const verified =
      field === 'annotation' && Array.isArray(observed)
        ? observed.includes(expected)
        : semanticValuesEqual(observed, expected);
    return { field, status: verified ? 'verified' : 'mismatch' };
  });
  return result(
    fieldResults.every((field) => field.status === 'verified')
      ? 'verified'
      : 'partial',
    fieldResults.every((field) => field.status === 'verified')
      ? 'authoritative-readback-matched'
      : 'authoritative-readback-postcondition-mismatch',
    fieldResults,
  );
}

export function planLinearDuplicateSearch(
  input: LinearDuplicateSearchPlanInput,
): SemanticAction {
  const capability = validateLinearHostCapability(
    'search-duplicates',
    input.context,
    input.hostCapability,
  );
  if (!capability.valid) {
    throw new Error('Linear duplicate search capability is unavailable.');
  }
  if (
    !input.provenanceToken ||
    input.provenanceToken.length > 512 ||
    !input.reservedBindingId ||
    input.reservedBindingId.length > 128 ||
    !Number.isInteger(input.maxResults) ||
    input.maxResults < 1 ||
    input.maxResults > 100 ||
    input.historicalIdentifiers.length > 64 ||
    new Set(input.historicalIdentifiers).size !==
      input.historicalIdentifiers.length ||
    input.historicalIdentifiers.some(
      (identifier) => !IDENTIFIER.test(identifier),
    )
  ) {
    throw new Error('Linear duplicate search bounds are invalid.');
  }
  const query = {
    provenanceToken: input.provenanceToken,
    reservedBindingId: input.reservedBindingId,
    historicalIdentifiers: [...input.historicalIdentifiers],
    workspaceId: input.context.workspaceId!,
    teamId: input.context.teamId!,
  };
  return {
    provider: 'linear',
    operation: 'search-duplicates',
    context: input.context,
    intent: {
      query,
      queryDigest: semanticDigest(query),
      resultContract: {
        maxResults: input.maxResults,
        classifications: ['no-match', 'one-match', 'ambiguous'],
        requireStableUuid: true,
        requireExactContext: true,
        matchStatus: 'evidence-until-identity-and-context-verified',
      },
      capabilityEvidenceDigest: input.hostCapability.evidenceDigest,
    },
  };
}

export function validateLinearDuplicateSearchObservation(
  input: LinearDuplicateSearchValidationInput,
): LinearDuplicateSearchValidationResult {
  const result = (
    accepted: boolean,
    classification: LinearDuplicateSearchValidationResult['classification'],
    stableId: string | null,
    reasons: string[],
  ): LinearDuplicateSearchValidationResult => ({
    accepted,
    classification,
    stableId,
    reasons,
  });
  if (
    !validLinearDuplicateAction(input.action) ||
    input.observation.provider !== 'linear' ||
    !contextsEqual(input.action.context, input.observation.context) ||
    input.observation.capabilityEvidenceDigest !==
      input.action.intent.capabilityEvidenceDigest ||
    input.observation.queryDigest !== input.action.intent.queryDigest ||
    !Number.isFinite(Date.parse(input.observation.observedAt))
  ) {
    return result(false, 'invalid', null, ['observation-attribution-mismatch']);
  }
  const capability = validateLinearHostCapability(
    'search-duplicates',
    input.action.context,
    input.hostCapability,
  );
  if (
    input.hostCapability.evidenceDigest !==
    input.action.intent.capabilityEvidenceDigest
  ) {
    return result(false, 'invalid', null, ['capability-evidence-mismatch']);
  }
  if (
    input.observation.availability === 'unavailable' ||
    input.hostCapability.availability !== 'available'
  ) {
    return result(false, 'unavailable', null, [
      ...capability.reasons,
      'search-unavailable',
    ]);
  }
  if (!capability.valid) {
    return result(false, 'invalid', null, capability.reasons);
  }
  const resultContract = input.action.intent.resultContract;
  const query = input.action.intent.query;
  if (!isRecord(resultContract) || !isRecord(query)) {
    return result(false, 'invalid', null, ['action-contract-invalid']);
  }
  const maxResults = Number(resultContract.maxResults);
  if (
    !Number.isInteger(maxResults) ||
    maxResults < 1 ||
    maxResults > 100 ||
    input.observation.results.length > maxResults
  ) {
    return result(false, 'invalid', null, ['result-bound-exceeded']);
  }
  if (input.observation.results.length === 0) {
    return result(true, 'no-match', null, []);
  }
  if (
    input.observation.results.some(
      (candidate) => !validLinearDuplicateCandidateBounds(candidate),
    )
  ) {
    return result(false, 'invalid', null, ['candidate-bound-invalid']);
  }
  if (input.observation.results.length > 1) {
    return result(false, 'ambiguous', null, ['multiple-candidates']);
  }
  const candidate = input.observation.results[0]!;
  const historicalIdentifiers = Array.isArray(query.historicalIdentifiers)
    ? query.historicalIdentifiers.filter(
        (identifier): identifier is string => typeof identifier === 'string',
      )
    : [];
  const matchEvidenceValid =
    candidate.matchedBy === 'provenance'
      ? candidate.matchedProvenanceToken === query.provenanceToken
      : candidate.matchedBy === 'reserved-binding'
        ? candidate.matchedReservedBindingId === query.reservedBindingId
        : typeof candidate.matchedIdentifier === 'string' &&
          historicalIdentifiers.includes(candidate.matchedIdentifier) &&
          candidate.identifiers.includes(candidate.matchedIdentifier);
  const expectedStableId = canonicalLinearStableId(
    String(query.workspaceId),
    candidate.uuid,
  );
  if (
    !candidate.stableIdentityVerified ||
    !candidate.contextVerified ||
    candidate.stableId !== expectedStableId ||
    !contextsEqual(candidate.context, input.action.context) ||
    candidate.context.workspaceId !== query.workspaceId ||
    candidate.context.teamId !== query.teamId ||
    !matchEvidenceValid
  ) {
    return result(false, 'ambiguous', null, ['candidate-not-fully-verified']);
  }
  return result(true, 'one-verified-match', candidate.stableId, []);
}

export const linearAdapter: ProviderAdapter = {
  provider: 'linear',
  normalize: normalizeLinearIssueObservation,
  plan(operation, input) {
    if (['create', 'update', 'transition', 'annotate'].includes(operation)) {
      if (!isCompleteLinearMutationInput(input)) {
        throw new Error('Linear adapter requires complete mutation input.');
      }
      return planLinearMutation(input as unknown as LinearMutationPlanInput);
    }
    if (operation === 'read') {
      if (!isCompleteLinearReadInput(input)) {
        throw new Error('Linear adapter requires complete read input.');
      }
      return planLinearRead(input as unknown as LinearReadPlanInput);
    }
    if (operation === 'read-discussion') {
      if (!isCompleteLinearDiscussionInput(input)) {
        throw new Error('Linear adapter requires complete discussion input.');
      }
      return planLinearDiscussionRead(
        input as unknown as LinearDiscussionReadPlanInput,
      );
    }
    if (operation === 'search-duplicates') {
      if (!isCompleteLinearDuplicateSearchInput(input)) {
        throw new Error(
          'Linear adapter requires complete duplicate search input.',
        );
      }
      return planLinearDuplicateSearch(
        input as unknown as LinearDuplicateSearchPlanInput,
      );
    }
    throw new Error(`Linear adapter does not support '${operation}' yet.`);
  },
  validateObservation(action, observation) {
    if (isLinearSpecializedOperation(action.operation)) {
      return {
        valid: false,
        reasons: [`typed-validator-required:${action.operation}`],
      };
    }
    if (action.operation === 'read' && !validLinearReadAction(action)) {
      return { valid: false, reasons: ['action-evidence-invalid'] };
    }
    if (
      ['create', 'update', 'transition', 'annotate'].includes(
        action.operation,
      ) &&
      !validLinearMutationAction(action)
    ) {
      return { valid: false, reasons: ['action-evidence-invalid'] };
    }
    if (
      action.provider !== 'linear' ||
      observation.provider !== 'linear' ||
      !contextsEqual(action.context, observation.context)
    ) {
      return { valid: false, reasons: ['observation-context-mismatch'] };
    }
    const capability = parseLinearHostCapability(
      observation.fields.hostCapability,
    );
    if (!capability) {
      return { valid: false, reasons: ['capability-evidence-missing'] };
    }
    const validation = validateLinearHostCapability(
      action.operation,
      action.context,
      capability,
      action.operation === 'read'
        ? ['stable-identity', 'title', 'state', 'revision', 'team-context']
        : [],
    );
    if (!validation.valid) return validation;
    if (
      observation.capabilityEvidenceDigest !==
        action.intent.capabilityEvidenceDigest ||
      capability.evidenceDigest !== action.intent.capabilityEvidenceDigest
    ) {
      return { valid: false, reasons: ['capability-evidence-mismatch'] };
    }
    if (
      ['create', 'update', 'transition', 'annotate'].includes(action.operation)
    ) {
      if (
        !semanticValuesEqual(
          observation.fields.mutationEvidence,
          action.intent.executionEvidence,
        )
      ) {
        return { valid: false, reasons: ['mutation-evidence-mismatch'] };
      }
      try {
        const issue = normalizeLinearIssueObservation(observation);
        if (
          action.operation !== 'create' &&
          issue.stableId !== action.intent.stableId
        ) {
          return { valid: false, reasons: ['observation-identity-mismatch'] };
        }
      } catch {
        return { valid: false, reasons: ['observation-invalid'] };
      }
    }
    return { valid: true, reasons: [] };
  },
  verificationFields(action) {
    if (isLinearSpecializedOperation(action.operation)) {
      return [`typed:${action.operation}`];
    }
    return mutationVerificationFields(action);
  },
  verify(action, issue) {
    if (isLinearSpecializedOperation(action.operation)) {
      return [
        {
          field: `typed:${action.operation}`,
          status: 'unavailable',
        },
      ];
    }
    const fields = mutationVerificationFields(action);
    if (
      !validLinearMutationAction(action) ||
      issue.provider !== 'linear' ||
      !contextsEqual(action.context, issue.context) ||
      (action.operation !== 'create' &&
        issue.stableId !== action.intent.stableId) ||
      issue.extensions.capabilityEvidenceDigest !==
        action.intent.capabilityEvidenceDigest ||
      !semanticValuesEqual(
        issue.extensions.mutationEvidence,
        action.intent.executionEvidence,
      ) ||
      (action.operation === 'create' &&
        !semanticValuesEqual(
          issue.extensions.createProvenance,
          action.intent.provenance,
        ))
    ) {
      return fields.map((field) => ({
        field,
        status: 'unavailable' as const,
      }));
    }
    const postconditions = action.intent.postconditions as Record<
      string,
      unknown
    >;
    return fields.map((field) => {
      const observed =
        field === 'description'
          ? issue.description
          : field === 'status'
            ? issue.status
            : field === 'annotation'
              ? issue.extensions.annotations
              : issue[field as 'title' | 'priority'];
      return {
        field,
        status:
          field === 'annotation' && Array.isArray(observed)
            ? observed.includes(postconditions[field])
              ? 'verified'
              : 'mismatch'
            : semanticValuesEqual(observed, postconditions[field])
              ? 'verified'
              : 'mismatch',
      } satisfies FieldVerification;
    });
  },
};

function canonicalLinearStableId(workspaceId: string, uuid: string): string {
  return `linear:${workspaceId}:${uuid.toLowerCase()}`;
}

function hasPinnedLinearContext(context: ProviderContext): boolean {
  return ['accountId', 'workspaceId', 'teamId'].every(
    (key) => typeof context[key] === 'string' && context[key]!.length > 0,
  );
}

function assertLinearMutationIdentity(input: LinearMutationPreviewInput): void {
  if (!hasPinnedLinearContext(input.context) || !input.bindingId) {
    throw new Error('Linear mutation requires a binding and pinned context.');
  }
  if (input.operation === 'create') {
    if (
      input.stableId !== undefined ||
      input.provenance?.bindingId !== input.bindingId ||
      !input.provenance.origin
    ) {
      throw new Error('Linear create requires exact creation provenance.');
    }
  } else if (!input.stableId) {
    throw new Error('Linear mutation requires a stable issue identity.');
  }
}

function unavailableLinearRead(
  classification: Extract<
    LinearReadClassification,
    'partial' | 'inaccessible' | 'temporarily-unavailable'
  >,
  reasons: string[],
): LinearReadResult {
  return {
    classification,
    issue: null,
    preservePriorEvidence: true,
    reasons,
  };
}

function normalizeLinearMutationFieldMask(
  operation: LinearMutationPreviewInput['operation'],
  fieldMask: readonly string[],
  projection: OutboundProjection,
): LinearMutationField[] {
  const allowedByOperation: Record<
    LinearMutationPreviewInput['operation'],
    LinearMutationField[]
  > = {
    create: ['title', 'description', 'priority'],
    update: ['title', 'description', 'priority'],
    transition: ['status'],
    annotate: ['annotation'],
  };
  if (
    fieldMask.length === 0 ||
    new Set(fieldMask).size !== fieldMask.length ||
    fieldMask.some(
      (field) =>
        !allowedByOperation[operation].includes(field as LinearMutationField),
    ) ||
    Object.keys(projection).length !== fieldMask.length ||
    Object.keys(projection).some((field) => !fieldMask.includes(field))
  ) {
    throw new Error('Linear mutation projection or field mask is invalid.');
  }
  return [...fieldMask] as LinearMutationField[];
}

function assertLinearObservation(
  observation: SanitizedProviderObservation,
): void {
  if (observation.provider !== 'linear') {
    throw new Error('Expected a Linear observation.');
  }
  if (!observation.capabilityEvidenceDigest) {
    throw new Error('Linear observation capability evidence is missing.');
  }
}

function requiredContext(
  observation: SanitizedProviderObservation,
  key: string,
): string {
  const value = observation.context[key];
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Linear observation context '${key}' is missing.`);
  }
  return value;
}

function requiredString(fields: Record<string, unknown>, key: string): string {
  const value = fields[key];
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Linear observation field '${key}' is invalid.`);
  }
  return value;
}

function nullableString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') {
    throw new Error('Linear optional text field is invalid.');
  }
  return value;
}

function requiredBoolean(
  fields: Record<string, unknown>,
  key: string,
): boolean {
  const value = fields[key];
  if (typeof value !== 'boolean') {
    throw new Error(`Linear observation field '${key}' is invalid.`);
  }
  return value;
}

function stringArray(value: unknown): string[] {
  if (value === undefined) return [];
  if (
    !Array.isArray(value) ||
    value.some((entry) => typeof entry !== 'string')
  ) {
    throw new Error('Linear observation alias list is invalid.');
  }
  return uniqueStrings(value);
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.filter((value) => value.length > 0))];
}

function suppressInboundText(
  value: string,
  field: string,
  suppressedFields: string[],
): string {
  if (!containsSensitiveContentSignal(value)) return value;
  suppressedFields.push(field);
  return WHOLE_FIELD_SUPPRESSION_MARKER;
}

function suppressNullableInboundText(
  value: unknown,
  field: string,
  suppressedFields: string[],
): string | null {
  const normalized = nullableString(value);
  return normalized === null
    ? null
    : suppressInboundText(normalized, field, suppressedFields);
}

function isBoundedExtensionValue(value: unknown): boolean {
  return (
    (typeof value === 'string' && value.length <= 256) ||
    (typeof value === 'number' && Number.isFinite(value)) ||
    typeof value === 'boolean' ||
    value === null
  );
}

function mutationVerificationFields(action: SemanticAction): string[] {
  return Array.isArray(action.intent.fieldMask)
    ? action.intent.fieldMask.filter(
        (field): field is string => typeof field === 'string',
      )
    : [];
}

function validLinearMutationAction(action: SemanticAction): boolean {
  if (
    action.provider !== 'linear' ||
    !['create', 'update', 'transition', 'annotate'].includes(
      action.operation,
    ) ||
    !hasPinnedLinearContext(action.context)
  ) {
    return false;
  }
  const operation = action.operation as LinearMutationPreviewInput['operation'];
  const intent = action.intent;
  const projection = intent.projection;
  const postconditions = intent.postconditions;
  const outboundSafety = intent.outboundSafety;
  const outboundSafetyEvidence = intent.outboundSafetyEvidence;
  const executionEvidence = intent.executionEvidence;
  if (
    typeof intent.bindingId !== 'string' ||
    intent.bindingId.length === 0 ||
    intent.bindingId.length > 128 ||
    !Array.isArray(intent.fieldMask) ||
    intent.fieldMask.some((field) => typeof field !== 'string') ||
    !isRecord(projection) ||
    !isRecord(postconditions) ||
    !semanticValuesEqual(projection, postconditions) ||
    typeof intent.capabilityEvidenceDigest !== 'string' ||
    intent.capabilityEvidenceDigest.length === 0 ||
    !isRecord(outboundSafety) ||
    !isRecord(outboundSafetyEvidence) ||
    !isRecord(executionEvidence) ||
    typeof intent.previewDigest !== 'string' ||
    intent.approvalDigest !== intent.previewDigest ||
    typeof intent.actionDigest !== 'string'
  ) {
    return false;
  }
  const stableId = intent.stableId;
  const provenance = intent.provenance;
  if (operation === 'create') {
    if (
      stableId !== null ||
      !isRecord(provenance) ||
      provenance.bindingId !== intent.bindingId ||
      typeof provenance.origin !== 'string' ||
      provenance.origin.length === 0 ||
      provenance.origin.length > 512 ||
      Object.keys(provenance).length !== 2
    ) {
      return false;
    }
  } else if (
    provenance !== null ||
    typeof stableId !== 'string' ||
    !validLinearStableIdForContext(stableId, action.context)
  ) {
    return false;
  }
  let fieldMask: LinearMutationField[];
  try {
    fieldMask = normalizeLinearMutationFieldMask(
      operation,
      intent.fieldMask as string[],
      projection,
    );
    requireCurrentOutboundSafety(
      projection,
      outboundSafetyEvidence as unknown as OutboundProjectionSafetyResult,
    );
  } catch {
    return false;
  }
  const safety =
    outboundSafetyEvidence as unknown as OutboundProjectionSafetyResult;
  if (
    outboundSafety.projectionDigest !== safety.projectionDigest ||
    outboundSafety.resultDigest !== safety.resultDigest ||
    semanticDigest(projection) !== safety.projectionDigest
  ) {
    return false;
  }
  const baseExecutionEvidence = {
    capabilityEvidenceDigest: intent.capabilityEvidenceDigest,
    projectionDigest: safety.projectionDigest,
    outboundSafetyResultDigest: safety.resultDigest,
  };
  const expectedPreviewDigest = linearMutationPreviewDigest({
    operation,
    context: action.context,
    bindingId: intent.bindingId,
    stableId: stableId as string | null,
    provenance: provenance as { bindingId: string; origin: string } | null,
    fieldMask,
    projection,
    executionEvidence: baseExecutionEvidence,
  });
  if (intent.previewDigest !== expectedPreviewDigest) return false;
  const expectedActionDigest = linearMutationActionDigest({
    operation,
    context: action.context,
    bindingId: intent.bindingId,
    stableId: stableId as string | null,
    provenance: provenance as { bindingId: string; origin: string } | null,
    fieldMask,
    projection,
    previewDigest: expectedPreviewDigest,
    approvalDigest: intent.approvalDigest,
    executionEvidence: baseExecutionEvidence,
  });
  const expectedExecutionEvidence = {
    ...baseExecutionEvidence,
    previewDigest: expectedPreviewDigest,
    approvalDigest: intent.approvalDigest,
    actionDigest: expectedActionDigest,
  };
  const expectedReadbackContract = {
    pinned: true,
    requireStableIdentity: true,
    requireExactContext: true,
    fields: fieldMask,
  };
  return (
    intent.actionDigest === expectedActionDigest &&
    semanticValuesEqual(executionEvidence, expectedExecutionEvidence) &&
    semanticValuesEqual(intent.readbackContract, expectedReadbackContract)
  );
}

function linearMutationPreviewDigest(input: {
  operation: LinearMutationPreviewInput['operation'];
  context: ProviderContext;
  bindingId: string;
  stableId: string | null;
  provenance: { bindingId: string; origin: string } | null;
  fieldMask: LinearMutationField[];
  projection: OutboundProjection;
  executionEvidence: {
    capabilityEvidenceDigest: string;
    projectionDigest: string;
    outboundSafetyResultDigest: string;
  };
}): string {
  return semanticDigest({
    provider: 'linear',
    operation: input.operation,
    context: input.context,
    bindingId: input.bindingId,
    stableId: input.stableId,
    provenance: input.provenance,
    fieldMask: input.fieldMask,
    projection: input.projection,
    postconditions: input.projection,
    executionEvidence: input.executionEvidence,
  });
}

function linearMutationActionDigest(input: {
  operation: LinearMutationPreviewInput['operation'];
  context: ProviderContext;
  bindingId: string;
  stableId: string | null;
  provenance: { bindingId: string; origin: string } | null;
  fieldMask: LinearMutationField[];
  projection: OutboundProjection;
  previewDigest: string;
  approvalDigest: unknown;
  executionEvidence: {
    capabilityEvidenceDigest: string;
    projectionDigest: string;
    outboundSafetyResultDigest: string;
  };
}): string {
  return semanticDigest({
    provider: 'linear',
    operation: input.operation,
    context: input.context,
    bindingId: input.bindingId,
    stableId: input.stableId,
    provenance: input.provenance,
    fieldMask: input.fieldMask,
    projection: input.projection,
    previewDigest: input.previewDigest,
    approvalDigest: input.approvalDigest,
    executionEvidence: input.executionEvidence,
  });
}

function validLinearReadAction(action: SemanticAction): boolean {
  if (
    action.provider !== 'linear' ||
    action.operation !== 'read' ||
    !hasPinnedLinearContext(action.context)
  ) {
    return false;
  }
  const intent = action.intent;
  if (
    typeof intent.uuid !== 'string' ||
    !UUID.test(intent.uuid) ||
    typeof intent.stableId !== 'string' ||
    intent.stableId !==
      canonicalLinearStableId(action.context.workspaceId!, intent.uuid) ||
    (intent.currentIdentifier !== null &&
      (typeof intent.currentIdentifier !== 'string' ||
        !IDENTIFIER.test(intent.currentIdentifier))) ||
    typeof intent.stepId !== 'string' ||
    intent.stepId.length === 0 ||
    Buffer.byteLength(intent.stepId, 'utf8') > 128 ||
    typeof intent.capabilityEvidenceDigest !== 'string' ||
    intent.capabilityEvidenceDigest.length === 0
  ) {
    return false;
  }
  const resultContract = {
    requireStableIdentity: true,
    requireExactContext: true,
    allowedFields: [
      'uuid',
      'identifier',
      'historicalIdentifiers',
      'workspaceId',
      'teamId',
      'historicalTeamIds',
      'title',
      'description',
      'state',
      'priority',
      'archived',
      ...LINEAR_EXTENSION_KEYS,
    ],
  };
  const readIntent = {
    stableId: intent.stableId,
    uuid: intent.uuid,
    currentIdentifier: intent.currentIdentifier,
    stepId: intent.stepId,
    capabilityEvidenceDigest: intent.capabilityEvidenceDigest,
    resultContract,
  };
  const actionDigest = semanticDigest({
    provider: 'linear',
    operation: 'read',
    context: action.context,
    intent: readIntent,
  });
  return semanticValuesEqual(action.intent, { ...readIntent, actionDigest });
}

function validLinearDiscussionAction(action: SemanticAction): boolean {
  if (
    action.provider !== 'linear' ||
    action.operation !== 'read-discussion' ||
    !hasPinnedLinearContext(action.context) ||
    typeof action.intent.stableId !== 'string' ||
    !validLinearStableIdForContext(action.intent.stableId, action.context) ||
    !Number.isInteger(action.intent.limit) ||
    Number(action.intent.limit) < 1 ||
    Number(action.intent.limit) > LINEAR_DISCUSSION_LIMITS.maxItems ||
    (action.intent.cursor !== null &&
      (typeof action.intent.cursor !== 'string' ||
        Buffer.byteLength(action.intent.cursor, 'utf8') >
          LINEAR_DISCUSSION_LIMITS.maxCursorBytes)) ||
    typeof action.intent.capabilityEvidenceDigest !== 'string' ||
    action.intent.capabilityEvidenceDigest.length === 0
  ) {
    return false;
  }
  const intent = {
    stableId: action.intent.stableId,
    cursor: action.intent.cursor,
    limit: action.intent.limit,
    resultContract: {
      maxItems: action.intent.limit,
      maxIdBytes: LINEAR_DISCUSSION_LIMITS.maxIdBytes,
      maxBodyBytes: LINEAR_DISCUSSION_LIMITS.maxBodyBytes,
      maxCursorBytes: LINEAR_DISCUSSION_LIMITS.maxCursorBytes,
      maxPageBytes: LINEAR_DISCUSSION_LIMITS.maxPageBytes,
      persistable: false,
      contentPolicy: 'sanitized-whole-field-suppression',
    },
    capabilityEvidenceDigest: action.intent.capabilityEvidenceDigest,
  };
  const actionDigest = semanticDigest({
    provider: 'linear',
    operation: 'read-discussion',
    context: action.context,
    intent,
  });
  return semanticValuesEqual(action.intent, { ...intent, actionDigest });
}

function validLinearDuplicateAction(action: SemanticAction): boolean {
  if (
    action.provider !== 'linear' ||
    action.operation !== 'search-duplicates' ||
    !hasPinnedLinearContext(action.context) ||
    !isRecord(action.intent.query) ||
    !isRecord(action.intent.resultContract) ||
    typeof action.intent.capabilityEvidenceDigest !== 'string' ||
    action.intent.capabilityEvidenceDigest.length === 0
  ) {
    return false;
  }
  const query = action.intent.query;
  const identifiers = query.historicalIdentifiers;
  const maxResults = Number(action.intent.resultContract.maxResults);
  if (
    typeof query.provenanceToken !== 'string' ||
    query.provenanceToken.length === 0 ||
    query.provenanceToken.length > 512 ||
    typeof query.reservedBindingId !== 'string' ||
    query.reservedBindingId.length === 0 ||
    query.reservedBindingId.length > 128 ||
    !Array.isArray(identifiers) ||
    identifiers.some(
      (identifier) =>
        typeof identifier !== 'string' || !IDENTIFIER.test(identifier),
    ) ||
    identifiers.length > 64 ||
    new Set(identifiers).size !== identifiers.length ||
    query.workspaceId !== action.context.workspaceId ||
    query.teamId !== action.context.teamId ||
    !Number.isInteger(maxResults) ||
    maxResults < 1 ||
    maxResults > 100
  ) {
    return false;
  }
  const expectedQuery = {
    provenanceToken: query.provenanceToken,
    reservedBindingId: query.reservedBindingId,
    historicalIdentifiers: identifiers,
    workspaceId: action.context.workspaceId,
    teamId: action.context.teamId,
  };
  const expectedContract = {
    maxResults,
    classifications: ['no-match', 'one-match', 'ambiguous'],
    requireStableUuid: true,
    requireExactContext: true,
    matchStatus: 'evidence-until-identity-and-context-verified',
  };
  return (
    semanticValuesEqual(query, expectedQuery) &&
    action.intent.queryDigest === semanticDigest(expectedQuery) &&
    semanticValuesEqual(action.intent.resultContract, expectedContract)
  );
}

function validLinearStableIdForContext(
  stableId: string,
  context: ProviderContext,
): boolean {
  if (typeof stableId !== 'string' || typeof context.workspaceId !== 'string') {
    return false;
  }
  const prefix = `linear:${context.workspaceId}:`;
  return (
    stableId.startsWith(prefix) && UUID.test(stableId.slice(prefix.length))
  );
}

function isLinearSpecializedOperation(operation: SemanticOperation): boolean {
  return operation === 'read-discussion' || operation === 'search-duplicates';
}

function semanticValuesEqual(left: unknown, right: unknown): boolean {
  try {
    return semanticDigest(left) === semanticDigest(right);
  } catch {
    return false;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function parseLinearHostCapability(
  value: unknown,
): LinearHostCapabilityObservation | null {
  if (
    !isRecord(value) ||
    value.provider !== 'linear' ||
    !isRecord(value.context) ||
    !Array.isArray(value.operations) ||
    !Array.isArray(value.observableFields) ||
    typeof value.availability !== 'string' ||
    typeof value.accountId !== 'string' ||
    typeof value.workspaceId !== 'string' ||
    typeof value.teamId !== 'string' ||
    typeof value.evidenceDigest !== 'string'
  ) {
    return null;
  }
  return value as unknown as LinearHostCapabilityObservation;
}

function isCompleteLinearMutationInput(
  input: Record<string, unknown>,
): boolean {
  return (
    typeof input.operation === 'string' &&
    isRecord(input.context) &&
    isRecord(input.hostCapability) &&
    typeof input.bindingId === 'string' &&
    Array.isArray(input.fieldMask) &&
    isRecord(input.projection) &&
    isRecord(input.outboundSafety) &&
    typeof input.approvedPreviewDigest === 'string'
  );
}

function isCompleteLinearReadInput(input: Record<string, unknown>): boolean {
  return (
    isRecord(input.context) &&
    isRecord(input.hostCapability) &&
    typeof input.stableId === 'string' &&
    typeof input.uuid === 'string' &&
    typeof input.stepId === 'string'
  );
}

function isCompleteLinearDiscussionInput(
  input: Record<string, unknown>,
): boolean {
  return (
    isRecord(input.context) &&
    isRecord(input.hostCapability) &&
    typeof input.stableId === 'string' &&
    Number.isInteger(input.limit) &&
    (input.cursor === null || typeof input.cursor === 'string')
  );
}

function isCompleteLinearDuplicateSearchInput(
  input: Record<string, unknown>,
): boolean {
  return (
    isRecord(input.context) &&
    isRecord(input.hostCapability) &&
    typeof input.provenanceToken === 'string' &&
    typeof input.reservedBindingId === 'string' &&
    Array.isArray(input.historicalIdentifiers) &&
    Number.isInteger(input.maxResults)
  );
}

function validLinearDuplicateCandidateBounds(
  candidate: LinearDuplicateCandidate,
): boolean {
  return (
    UUID.test(candidate.uuid) &&
    candidate.stableId.length > 0 &&
    candidate.stableId.length <= 512 &&
    candidate.identifiers.length <= 64 &&
    new Set(candidate.identifiers).size === candidate.identifiers.length &&
    candidate.identifiers.every((identifier) => IDENTIFIER.test(identifier)) &&
    ['provenance', 'reserved-binding', 'identifier'].includes(
      candidate.matchedBy,
    )
  );
}
