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

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const IDENTIFIER = /^[A-Z][A-Z0-9]*-[1-9][0-9]*$/;
const URL_REFERENCE =
  /^https:\/\/([^/]+)\/[^/]+\/issue\/([A-Z][A-Z0-9]*-[1-9][0-9]*)(?:\/[^/?#]+)?(?:[?#].*)?$/;
const LINEAR_EXTENSION_KEYS = ['estimate', 'cycleId', 'projectId'] as const;

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
    !input.stableId ||
    !UUID.test(input.uuid) ||
    !input.stepId
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
    !input.stableId ||
    !Number.isInteger(input.limit) ||
    input.limit < 1 ||
    input.limit > 100 ||
    (input.cursor !== null &&
      (typeof input.cursor !== 'string' || input.cursor.length > 512))
  ) {
    throw new Error('Linear discussion read bounds are invalid.');
  }
  return {
    provider: 'linear',
    operation: 'read-discussion',
    context: input.context,
    intent: {
      stableId: input.stableId,
      cursor: input.cursor,
      limit: input.limit,
      resultContract: {
        maxItems: input.limit,
        persistable: false,
        contentPolicy: 'sanitized-whole-field-suppression',
      },
      capabilityEvidenceDigest: input.hostCapability.evidenceDigest,
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
    previewDigest: semanticDigest({
      provider: 'linear',
      operation: input.operation,
      context: input.context,
      bindingId: input.bindingId,
      stableId: input.stableId ?? null,
      provenance: input.provenance ?? null,
      fieldMask,
      projection: input.projection,
      postconditions: input.projection,
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
  const actionDigest = semanticDigest({
    provider: 'linear',
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
  if (input.action.provider !== 'linear' || input.action.operation !== 'read') {
    throw new Error(
      'Linear read classification requires a Linear read action.',
    );
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
    input.action.provider !== 'linear' ||
    input.action.operation !== 'read-discussion' ||
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
  if (!capability.valid) return invalid(capability.reasons);
  if (input.observation.availability !== 'available') {
    return {
      classification: input.observation.availability,
      page: null,
      persistable: false,
      reasons: [input.observation.availability],
    };
  }
  const maxItems = Number(
    (input.action.intent.resultContract as Record<string, unknown> | undefined)
      ?.maxItems,
  );
  if (
    !Number.isInteger(maxItems) ||
    input.observation.items.length > maxItems ||
    input.observation.items.some(
      (item) =>
        !item.id ||
        typeof item.body !== 'string' ||
        !Number.isFinite(Date.parse(item.observedAt)),
    ) ||
    (input.observation.nextCursor !== null &&
      (typeof input.observation.nextCursor !== 'string' ||
        input.observation.nextCursor.length > 512))
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
    !validLinearMutationActionEvidence(input.action) ||
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
      if (!validLinearMutationActionEvidence(action)) {
        return { valid: false, reasons: ['action-evidence-invalid'] };
      }
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
    return mutationVerificationFields(action);
  },
  verify(action, issue) {
    const fields = mutationVerificationFields(action);
    if (
      !validLinearMutationActionEvidence(action) ||
      issue.provider !== 'linear' ||
      !contextsEqual(action.context, issue.context) ||
      (action.operation !== 'create' &&
        issue.stableId !== action.intent.stableId) ||
      issue.extensions.capabilityEvidenceDigest !==
        action.intent.capabilityEvidenceDigest ||
      !semanticValuesEqual(
        issue.extensions.mutationEvidence,
        action.intent.executionEvidence,
      )
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

function validLinearMutationActionEvidence(action: SemanticAction): boolean {
  const evidence = action.intent.executionEvidence;
  return (
    typeof action.intent.capabilityEvidenceDigest === 'string' &&
    typeof action.intent.previewDigest === 'string' &&
    action.intent.approvalDigest === action.intent.previewDigest &&
    typeof action.intent.actionDigest === 'string' &&
    isRecord(evidence) &&
    evidence.capabilityEvidenceDigest ===
      action.intent.capabilityEvidenceDigest &&
    evidence.previewDigest === action.intent.previewDigest &&
    evidence.approvalDigest === action.intent.approvalDigest &&
    evidence.actionDigest === action.intent.actionDigest &&
    isRecord(action.intent.postconditions) &&
    mutationVerificationFields(action).length > 0
  );
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
