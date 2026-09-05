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

export interface JiraIssueReference {
  host?: string;
  key: string;
  alias: string;
}

export type JiraSemanticField =
  | 'stable-identity'
  | 'title'
  | 'description-adf'
  | 'status'
  | 'priority'
  | 'revision'
  | 'project-context'
  | 'metadata'
  | 'transitions';

export interface JiraHostCapabilityObservation {
  provider: 'jira';
  context: ProviderContext;
  availability:
    | 'available'
    | 'unavailable'
    | 'authorization-required'
    | 'rate-limited';
  accountId: string;
  siteId: string;
  projectId: string;
  operations: SemanticOperation[];
  observableFields: JiraSemanticField[];
  evidenceDigest: string;
}

export interface JiraReadPlanInput {
  context: ProviderContext;
  hostCapability: JiraHostCapabilityObservation;
  stableId: string;
  issueId: string;
  currentKey: string | null;
  stepId: string;
}

export interface JiraMetadataReadPlanInput {
  context: ProviderContext;
  hostCapability: JiraHostCapabilityObservation;
  purpose: 'create' | 'update' | 'transition';
  issueId?: string;
}

export interface JiraDiscussionReadPlanInput {
  context: ProviderContext;
  hostCapability: JiraHostCapabilityObservation;
  stableId: string;
  cursor: string | null;
  limit: number;
}

export type JiraMutationField =
  | 'title'
  | 'description'
  | 'priority'
  | 'status'
  | 'annotation';

export interface JiraNormalizedMetadata {
  evidenceDigest: string;
  writableFields: JiraMutationField[];
  transitions: string[];
}

export interface JiraMutationPreviewInput {
  operation: 'create' | 'update' | 'transition' | 'annotate';
  context: ProviderContext;
  hostCapability: JiraHostCapabilityObservation;
  normalizedMetadata: JiraNormalizedMetadata;
  bindingId: string;
  stableId?: string;
  provenance?: { bindingId: string; origin: string };
  fieldMask: readonly string[];
  projection: OutboundProjection;
  outboundSafety: OutboundProjectionSafetyResult;
}

export interface JiraMutationPlanInput extends JiraMutationPreviewInput {
  approvedPreviewDigest: string;
}

export interface JiraMutationPreview {
  previewDigest: string;
  executionEvidence: {
    capabilityEvidenceDigest: string;
    metadataEvidenceDigest: string;
    projectionDigest: string;
    outboundSafetyResultDigest: string;
  };
}

export interface JiraReadObservationInput {
  action: SemanticAction;
  hostCapability: JiraHostCapabilityObservation;
  observedAt: string;
  outcome: 'found' | 'not-found' | 'temporary-failure';
  observation?: SanitizedProviderObservation;
}

export interface JiraReadResult {
  classification:
    | 'current'
    | 'moved'
    | 'partial'
    | 'inaccessible'
    | 'temporarily-unavailable';
  issue: NormalizedRemoteIssue | null;
  preservePriorEvidence: boolean;
  reasons: string[];
}

export interface JiraMetadataObservation {
  provider: 'jira';
  context: ProviderContext;
  capabilityEvidenceDigest: string;
  purpose: 'create' | 'update' | 'transition';
  availability: 'available' | 'authorization-required' | 'partial';
  metadataEvidenceDigest: string;
  writableFields: JiraMutationField[];
  transitions: string[];
}

export interface JiraDiscussionObservation {
  provider: 'jira';
  context: ProviderContext;
  stableId: string;
  availability: 'available' | 'rate-limited' | 'permission-denied';
  capabilityEvidenceDigest: string;
  requestedCursor: string | null;
  nextCursor: string | null;
  items: Array<{ id: string; body: string; observedAt: string }>;
}

export interface JiraMutationVerificationInput {
  action: SemanticAction;
  attempt: {
    count: number;
    outcome: 'accepted' | 'rejected' | 'unknown';
    capabilityEvidenceDigest: string;
    metadataEvidenceDigest: string;
  };
  hostCapability: JiraHostCapabilityObservation;
  normalizedMetadata: JiraNormalizedMetadata;
  readback: SanitizedProviderObservation | null;
}

export interface JiraMutationVerificationResult {
  classification: 'verified' | 'partial' | 'rejected' | 'uncertain';
  reason: string;
  fields: FieldVerification[];
  retryAllowed: false;
}

export interface JiraDuplicateSearchPlanInput {
  context: ProviderContext;
  hostCapability: JiraHostCapabilityObservation;
  provenanceToken: string;
  reservedBindingId: string;
  historicalKeys: string[];
  maxResults: number;
}

export interface JiraDuplicateCandidate {
  issueId: string;
  stableId: string;
  keys: string[];
  context: ProviderContext;
  matchedBy: 'provenance' | 'reserved-binding' | 'historical-key';
  matchedProvenanceToken?: string;
  matchedReservedBindingId?: string;
  matchedHistoricalKey?: string;
  stableIdentityVerified: boolean;
  contextVerified: boolean;
}

export interface JiraDuplicateSearchObservation {
  provider: 'jira';
  context: ProviderContext;
  availability: 'available' | 'unavailable' | 'lagging';
  capabilityEvidenceDigest: string;
  queryDigest: string;
  observedAt: string;
  results: JiraDuplicateCandidate[];
}

export interface JiraDuplicateSearchValidationResult {
  accepted: boolean;
  classification:
    | 'no-match'
    | 'one-verified-match'
    | 'ambiguous'
    | 'unavailable'
    | 'lagging'
    | 'invalid';
  stableId: string | null;
  reasons: string[];
}

const ISSUE_KEY = /^[A-Z][A-Z0-9_]*-[1-9][0-9]*$/;
const ISSUE_ID = /^[1-9][0-9]*$/;
const URL_REFERENCE =
  /^https:\/\/([^/]+)\/browse\/([A-Z][A-Z0-9_]*-[1-9][0-9]*)(?:[?#].*)?$/;
const JIRA_EXTENSION_KEYS = ['issueType', 'priorityId', 'statusId'] as const;

export const JIRA_DISCUSSION_LIMITS = {
  maxItems: 100,
  maxIdBytes: 256,
  maxBodyBytes: 16_384,
  maxCursorBytes: 512,
  maxPageBytes: 65_536,
} as const;

export function parseJiraIssueReference(
  reference: string,
): JiraIssueReference | null {
  const value = reference.trim();
  const url = URL_REFERENCE.exec(value);
  if (url) return { host: url[1]!.toLowerCase(), key: url[2]!, alias: value };
  if (!ISSUE_KEY.test(value)) return null;
  return { key: value, alias: value };
}

export function normalizeJiraIssueObservation(
  observation: SanitizedProviderObservation,
): NormalizedRemoteIssue {
  assertJiraObservation(observation);
  const siteId = requiredContext(observation, 'siteId');
  const projectId = requiredContext(observation, 'projectId');
  const issueId = requiredString(observation.fields, 'issueId');
  if (!ISSUE_ID.test(issueId)) throw new Error('Jira issue ID is invalid.');
  const stableId = canonicalJiraStableId(siteId, issueId);
  if (
    observation.identity.stableId !== issueId &&
    observation.identity.stableId !== stableId
  ) {
    throw new Error(
      'Jira observation stable identity does not match issue ID.',
    );
  }
  if (
    observation.fields.siteId !== siteId ||
    observation.fields.projectId !== projectId
  ) {
    throw new Error('Jira observation context does not match.');
  }
  const key = requiredString(observation.fields, 'key');
  if (!ISSUE_KEY.test(key)) throw new Error('Jira issue key is invalid.');
  const historicalKeys = stringArray(observation.fields.historicalKeys).filter(
    (item) => item !== key,
  );
  if (historicalKeys.some((item) => !ISSUE_KEY.test(item))) {
    throw new Error('Jira historical issue key is invalid.');
  }
  const historicalProjectIds = stringArray(
    observation.fields.historicalProjectIds,
  ).filter((item) => item !== projectId);
  const suppressedFields: string[] = [];
  const title = suppressInboundText(
    requiredString(observation.fields, 'title'),
    'title',
    suppressedFields,
  );
  const description = suppressNullableInboundText(
    observation.fields.descriptionText,
    'description',
    suppressedFields,
  );
  const extensions: Record<string, unknown> = {
    issueId,
    siteId,
    projectId,
    currentKey: key,
    historicalKeys,
    historicalProjectIds,
    descriptionAdf: observation.fields.descriptionAdf ?? null,
    lifecycle: nullableString(observation.fields.lifecycle),
    capabilityEvidenceDigest: observation.capabilityEvidenceDigest,
    suppressedFields,
  };
  for (const extension of JIRA_EXTENSION_KEYS) {
    const value = observation.fields[extension];
    if (value === null || typeof value === 'string')
      extensions[extension] = value;
  }
  if (isRecord(observation.fields.mutationEvidence)) {
    extensions.mutationEvidence = observation.fields.mutationEvidence;
  }
  if (isRecord(observation.fields.createProvenance)) {
    extensions.createProvenance = observation.fields.createProvenance;
  }
  if (Array.isArray(observation.fields.annotations)) {
    extensions.annotations = stringArray(observation.fields.annotations);
  }
  return {
    provider: 'jira',
    context: observation.context,
    stableId,
    aliases: uniqueStrings([
      key,
      ...historicalKeys,
      ...observation.identity.aliases,
    ]),
    title,
    description,
    priority: nullableString(observation.fields.priority),
    status: requiredString(observation.fields, 'status'),
    revisionDigest: semanticDigest(observation.revision),
    extensions,
  };
}

export function validateJiraHostCapability(
  operation: SemanticOperation,
  context: ProviderContext,
  observed: JiraHostCapabilityObservation,
  requiredFields: JiraSemanticField[] = [],
): ObservationValidation {
  const reasons: string[] = [];
  if (observed.provider !== 'jira') reasons.push('provider-mismatch');
  if (observed.availability !== 'available')
    reasons.push(observed.availability);
  if (
    !hasPinnedJiraContext(context) ||
    !contextsEqual(context, observed.context)
  ) {
    reasons.push('context-mismatch');
  }
  if (context.accountId !== observed.accountId)
    reasons.push('account-mismatch');
  if (context.siteId !== observed.siteId) reasons.push('site-mismatch');
  if (context.projectId !== observed.projectId)
    reasons.push('project-mismatch');
  if (!observed.operations.includes(operation))
    reasons.push(`capability-missing:${operation}`);
  for (const field of requiredFields) {
    if (!observed.observableFields.includes(field))
      reasons.push(`semantic-field-missing:${field}`);
  }
  if (!observed.evidenceDigest) reasons.push('capability-evidence-missing');
  return { valid: reasons.length === 0, reasons };
}

export function planJiraRead(input: JiraReadPlanInput): SemanticAction {
  if (
    !hasPinnedJiraContext(input.context) ||
    !ISSUE_ID.test(input.issueId) ||
    input.stableId !==
      canonicalJiraStableId(input.context.siteId!, input.issueId) ||
    (input.currentKey !== null && !ISSUE_KEY.test(input.currentKey)) ||
    !input.stepId ||
    Buffer.byteLength(input.stepId, 'utf8') > 128
  ) {
    throw new Error('Jira read plan requires pinned identity and context.');
  }
  requireJiraCapability(input.hostCapability, input.context, 'read', [
    'stable-identity',
    'title',
    'status',
    'revision',
    'project-context',
  ]);
  return jiraAction('read', input.context, {
    kind: 'issue',
    stableId: input.stableId,
    issueId: input.issueId,
    currentKey: input.currentKey,
    stepId: input.stepId,
    capabilityEvidenceDigest: input.hostCapability.evidenceDigest,
    resultContract: {
      requireStableIdentity: true,
      requireExactContext: true,
      allowedFields: [
        'issueId',
        'key',
        'historicalKeys',
        'siteId',
        'projectId',
        'historicalProjectIds',
        'title',
        'descriptionText',
        'descriptionAdf',
        'status',
        'priority',
        'lifecycle',
        ...JIRA_EXTENSION_KEYS,
      ],
    },
  });
}

export function planJiraMetadataRead(
  input: JiraMetadataReadPlanInput,
): SemanticAction {
  requireJiraCapability(input.hostCapability, input.context, 'read', [
    'metadata',
    ...(input.purpose === 'transition'
      ? (['transitions'] as JiraSemanticField[])
      : []),
  ]);
  if (input.issueId !== undefined && !ISSUE_ID.test(input.issueId)) {
    throw new Error('Jira metadata read issue identity is invalid.');
  }
  return jiraAction('read', input.context, {
    kind: 'metadata',
    purpose: input.purpose,
    issueId: input.issueId ?? null,
    capabilityEvidenceDigest: input.hostCapability.evidenceDigest,
    resultContract: {
      normalizedOnly: true,
      requireExactContext: true,
      fields:
        input.purpose === 'transition'
          ? ['transitions']
          : ['fields', 'issueTypes'],
    },
  });
}

export function planJiraDiscussionRead(
  input: JiraDiscussionReadPlanInput,
): SemanticAction {
  requireJiraCapability(input.hostCapability, input.context, 'read-discussion');
  if (
    !validJiraStableIdForContext(input.stableId, input.context) ||
    !Number.isInteger(input.limit) ||
    input.limit < 1 ||
    input.limit > JIRA_DISCUSSION_LIMITS.maxItems ||
    (input.cursor !== null &&
      Buffer.byteLength(input.cursor, 'utf8') >
        JIRA_DISCUSSION_LIMITS.maxCursorBytes)
  ) {
    throw new Error('Jira discussion read bounds are invalid.');
  }
  return jiraAction('read-discussion', input.context, {
    stableId: input.stableId,
    cursor: input.cursor,
    limit: input.limit,
    capabilityEvidenceDigest: input.hostCapability.evidenceDigest,
    resultContract: {
      maxItems: input.limit,
      maxIdBytes: JIRA_DISCUSSION_LIMITS.maxIdBytes,
      maxBodyBytes: JIRA_DISCUSSION_LIMITS.maxBodyBytes,
      maxCursorBytes: JIRA_DISCUSSION_LIMITS.maxCursorBytes,
      maxPageBytes: JIRA_DISCUSSION_LIMITS.maxPageBytes,
      persistable: false,
      contentPolicy: 'sanitized-whole-field-suppression',
    },
  });
}

export function previewJiraMutation(
  input: JiraMutationPreviewInput,
): JiraMutationPreview {
  requireJiraCapability(input.hostCapability, input.context, input.operation);
  assertJiraMutationIdentity(input);
  const fieldMask = normalizeJiraMutationFieldMask(input);
  requireCurrentOutboundSafety(input.projection, input.outboundSafety);
  assertJiraMetadataSupports(input, fieldMask);
  const executionEvidence = {
    capabilityEvidenceDigest: input.hostCapability.evidenceDigest,
    metadataEvidenceDigest: input.normalizedMetadata.evidenceDigest,
    projectionDigest: input.outboundSafety.projectionDigest,
    outboundSafetyResultDigest: input.outboundSafety.resultDigest,
  };
  return {
    previewDigest: semanticDigest({
      provider: 'jira',
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

export function planJiraMutation(input: JiraMutationPlanInput): SemanticAction {
  const preview = previewJiraMutation(input);
  if (input.approvedPreviewDigest !== preview.previewDigest) {
    throw new Error('Jira mutation approval does not match its preview.');
  }
  const fieldMask = normalizeJiraMutationFieldMask(input);
  const baseIntent = {
    bindingId: input.bindingId,
    stableId: input.stableId ?? null,
    provenance: input.provenance ?? null,
    fieldMask,
    projection: { ...input.projection },
    postconditions: { ...input.projection },
    capabilityEvidenceDigest: input.hostCapability.evidenceDigest,
    metadataEvidenceDigest: input.normalizedMetadata.evidenceDigest,
    outboundSafety: {
      projectionDigest: input.outboundSafety.projectionDigest,
      resultDigest: input.outboundSafety.resultDigest,
    },
    outboundSafetyEvidence: { ...input.outboundSafety },
    previewDigest: preview.previewDigest,
    approvalDigest: input.approvedPreviewDigest,
    readbackContract: {
      pinned: true,
      requireStableIdentity: true,
      requireExactContext: true,
      fields: fieldMask,
    },
  };
  const actionDigest = semanticDigest({
    provider: 'jira',
    operation: input.operation,
    context: input.context,
    intent: baseIntent,
    executionEvidence: preview.executionEvidence,
  });
  return {
    provider: 'jira',
    operation: input.operation,
    context: input.context,
    intent: {
      ...baseIntent,
      actionDigest,
      executionEvidence: {
        ...preview.executionEvidence,
        previewDigest: preview.previewDigest,
        approvalDigest: input.approvedPreviewDigest,
        actionDigest,
      },
    },
  };
}

export function classifyJiraReadObservation(
  input: JiraReadObservationInput,
): JiraReadResult {
  if (
    !validJiraActionDigest(input.action) ||
    input.action.intent.kind !== 'issue'
  ) {
    return unavailableJiraRead('inaccessible', ['read-action-invalid']);
  }
  if (!Number.isFinite(Date.parse(input.observedAt))) {
    throw new Error('Jira read classification requires a valid timestamp.');
  }
  const capability = validateJiraHostCapability(
    'read',
    input.action.context,
    input.hostCapability,
    ['stable-identity', 'title', 'status', 'revision', 'project-context'],
  );
  if (
    !capability.valid ||
    input.action.intent.capabilityEvidenceDigest !==
      input.hostCapability.evidenceDigest
  ) {
    return unavailableJiraRead('inaccessible', [
      ...capability.reasons,
      ...(input.action.intent.capabilityEvidenceDigest !==
      input.hostCapability.evidenceDigest
        ? ['capability-evidence-mismatch']
        : []),
    ]);
  }
  if (input.outcome === 'temporary-failure') {
    return unavailableJiraRead('temporarily-unavailable', [
      'temporary-host-failure',
    ]);
  }
  if (input.outcome === 'not-found' || !input.observation) {
    return unavailableJiraRead('inaccessible', [
      input.outcome === 'not-found'
        ? 'absence-not-authoritative'
        : 'read-observation-missing',
    ]);
  }
  const observation = input.observation;
  if (
    observation.provider !== 'jira' ||
    !contextsEqual(input.action.context, observation.context) ||
    observation.capabilityEvidenceDigest !==
      input.action.intent.capabilityEvidenceDigest ||
    observation.fields.issueId !== input.action.intent.issueId
  ) {
    return unavailableJiraRead('inaccessible', [
      'observation-attribution-mismatch',
    ]);
  }
  let issue: NormalizedRemoteIssue;
  try {
    issue = normalizeJiraIssueObservation(observation);
  } catch {
    return unavailableJiraRead('partial', ['read-observation-incomplete']);
  }
  if (issue.stableId !== input.action.intent.stableId) {
    return unavailableJiraRead('inaccessible', [
      'observation-identity-mismatch',
    ]);
  }
  const currentKey = input.action.intent.currentKey;
  const moved =
    typeof currentKey === 'string' &&
    observation.fields.key !== currentKey &&
    Array.isArray(observation.fields.historicalKeys) &&
    observation.fields.historicalKeys.includes(currentKey);
  const revisionWeak =
    !observation.revision.token && !observation.revision.updatedAt;
  return {
    classification: moved ? 'moved' : 'current',
    issue,
    preservePriorEvidence: false,
    reasons: revisionWeak ? ['revision-evidence-weak'] : [],
  };
}

export function validateJiraMetadataObservation(input: {
  action: SemanticAction;
  hostCapability: JiraHostCapabilityObservation;
  observation: JiraMetadataObservation;
}): ObservationValidation {
  const reasons: string[] = [];
  if (
    !validJiraActionDigest(input.action) ||
    input.action.operation !== 'read' ||
    input.action.intent.kind !== 'metadata'
  ) {
    reasons.push('metadata-action-invalid');
  }
  const capability = validateJiraHostCapability(
    'read',
    input.action.context,
    input.hostCapability,
    [
      'metadata',
      ...(input.action.intent.purpose === 'transition'
        ? (['transitions'] as JiraSemanticField[])
        : []),
    ],
  );
  reasons.push(...capability.reasons);
  if (
    input.observation.provider !== 'jira' ||
    !contextsEqual(input.action.context, input.observation.context)
  ) {
    reasons.push('observation-context-mismatch');
  }
  if (
    input.observation.capabilityEvidenceDigest !==
      input.action.intent.capabilityEvidenceDigest ||
    input.hostCapability.evidenceDigest !==
      input.action.intent.capabilityEvidenceDigest
  ) {
    reasons.push('capability-evidence-mismatch');
  }
  if (input.observation.purpose !== input.action.intent.purpose)
    reasons.push('metadata-purpose-mismatch');
  if (input.observation.availability !== 'available')
    reasons.push(input.observation.availability);
  if (!input.observation.metadataEvidenceDigest)
    reasons.push('metadata-evidence-missing');
  if (
    input.observation.writableFields.some(
      (field) =>
        !['title', 'description', 'priority', 'status', 'annotation'].includes(
          field,
        ),
    )
  ) {
    reasons.push('metadata-field-invalid');
  }
  return { valid: reasons.length === 0, reasons: uniqueStrings(reasons) };
}

export function validateJiraDiscussionReadObservation(input: {
  action: SemanticAction;
  hostCapability: JiraHostCapabilityObservation;
  observation: JiraDiscussionObservation;
}): {
  classification: 'page' | 'rate-limited' | 'permission-denied' | 'invalid';
  page: {
    items: Array<{
      id: string;
      body: string;
      observedAt: string;
      contentSuppressed: boolean;
    }>;
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
    !validJiraActionDigest(input.action) ||
    input.action.operation !== 'read-discussion' ||
    input.observation.provider !== 'jira' ||
    !contextsEqual(input.action.context, input.observation.context) ||
    input.observation.stableId !== input.action.intent.stableId ||
    input.observation.capabilityEvidenceDigest !==
      input.action.intent.capabilityEvidenceDigest ||
    input.hostCapability.evidenceDigest !==
      input.action.intent.capabilityEvidenceDigest ||
    input.observation.requestedCursor !== input.action.intent.cursor
  ) {
    return invalid(['discussion-evidence-mismatch']);
  }
  if (input.observation.availability !== 'available') {
    return {
      classification: input.observation.availability,
      page: null,
      persistable: false,
      reasons: [input.observation.availability],
    };
  }
  const limit = Number(input.action.intent.limit);
  const pageBytes = input.observation.items.reduce(
    (total, item) => total + Buffer.byteLength(item.id + item.body, 'utf8'),
    0,
  );
  if (
    input.observation.items.length > limit ||
    pageBytes > JIRA_DISCUSSION_LIMITS.maxPageBytes ||
    input.observation.items.some(
      (item) =>
        !item.id ||
        Buffer.byteLength(item.id, 'utf8') >
          JIRA_DISCUSSION_LIMITS.maxIdBytes ||
        Buffer.byteLength(item.body, 'utf8') >
          JIRA_DISCUSSION_LIMITS.maxBodyBytes ||
        !Number.isFinite(Date.parse(item.observedAt)),
    ) ||
    (input.observation.nextCursor !== null &&
      Buffer.byteLength(input.observation.nextCursor, 'utf8') >
        JIRA_DISCUSSION_LIMITS.maxCursorBytes)
  ) {
    return invalid(['discussion-page-out-of-bounds']);
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

export function verifyJiraMutationObservation(
  input: JiraMutationVerificationInput,
): JiraMutationVerificationResult {
  const fields = mutationVerificationFields(input.action);
  const terminal = (
    classification: JiraMutationVerificationResult['classification'],
    reason: string,
    statuses: FieldVerification[] = fields.map((field) => ({
      field,
      status: 'unavailable',
    })),
  ): JiraMutationVerificationResult => ({
    classification,
    reason,
    fields: statuses,
    retryAllowed: false,
  });
  if (!validJiraMutationAction(input.action))
    return terminal('uncertain', 'mutation-action-invalid');
  if (input.attempt.count !== 1)
    return terminal('uncertain', 'attempt-count-invalid');
  if (input.attempt.outcome === 'rejected')
    return terminal('rejected', 'provider-rejected');
  if (input.attempt.outcome === 'unknown' || !input.readback) {
    return terminal('uncertain', 'authoritative-readback-required');
  }
  if (
    input.attempt.capabilityEvidenceDigest !==
      input.action.intent.capabilityEvidenceDigest ||
    input.hostCapability.evidenceDigest !==
      input.action.intent.capabilityEvidenceDigest ||
    input.attempt.metadataEvidenceDigest !==
      input.action.intent.metadataEvidenceDigest ||
    input.normalizedMetadata.evidenceDigest !==
      input.action.intent.metadataEvidenceDigest
  ) {
    return terminal('uncertain', 'execution-evidence-mismatch');
  }
  const publicValidation = jiraAdapter.validateObservation(
    input.action,
    input.readback,
  );
  if (!publicValidation.valid)
    return terminal('uncertain', publicValidation.reasons.join(','));
  let issue: NormalizedRemoteIssue;
  try {
    issue = normalizeJiraIssueObservation(input.readback);
  } catch {
    return terminal('uncertain', 'readback-invalid');
  }
  if (
    input.action.operation !== 'create' &&
    issue.stableId !== input.action.intent.stableId
  ) {
    return terminal('uncertain', 'readback-identity-mismatch');
  }
  const postconditions = input.action.intent.postconditions as Record<
    string,
    unknown
  >;
  const statuses = fields.map((field) => {
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
        ? observed.includes(postconditions[field])
        : semanticValuesEqual(observed, postconditions[field]);
    return {
      field,
      status: verified ? ('verified' as const) : ('mismatch' as const),
    };
  });
  return statuses.every((field) => field.status === 'verified')
    ? terminal('verified', 'authoritative-readback-matched', statuses)
    : terminal('partial', 'postcondition-mismatch', statuses);
}

export function planJiraDuplicateSearch(
  input: JiraDuplicateSearchPlanInput,
): SemanticAction {
  requireJiraCapability(
    input.hostCapability,
    input.context,
    'search-duplicates',
    ['stable-identity', 'project-context'],
  );
  if (
    !input.provenanceToken ||
    Buffer.byteLength(input.provenanceToken, 'utf8') > 512 ||
    !input.reservedBindingId ||
    Buffer.byteLength(input.reservedBindingId, 'utf8') > 128 ||
    input.historicalKeys.length > 64 ||
    new Set(input.historicalKeys).size !== input.historicalKeys.length ||
    input.historicalKeys.some((key) => !ISSUE_KEY.test(key)) ||
    !Number.isInteger(input.maxResults) ||
    input.maxResults < 1 ||
    input.maxResults > 100
  ) {
    throw new Error('Jira duplicate search bounds are invalid.');
  }
  const query = {
    provenanceToken: input.provenanceToken,
    reservedBindingId: input.reservedBindingId,
    historicalKeys: [...input.historicalKeys],
    siteId: input.context.siteId,
    projectId: input.context.projectId,
  };
  return jiraAction('search-duplicates', input.context, {
    query,
    queryDigest: semanticDigest(query),
    capabilityEvidenceDigest: input.hostCapability.evidenceDigest,
    resultContract: {
      maxResults: input.maxResults,
      classifications: ['no-match', 'one-match', 'ambiguous'],
      requireStableIssueId: true,
      requireExactContext: true,
      matchStatus: 'evidence-until-identity-and-context-verified',
    },
  });
}

export function validateJiraDuplicateSearchObservation(input: {
  action: SemanticAction;
  hostCapability: JiraHostCapabilityObservation;
  observation: JiraDuplicateSearchObservation;
}): JiraDuplicateSearchValidationResult {
  const invalid = (
    classification: JiraDuplicateSearchValidationResult['classification'],
    reasons: string[],
  ): JiraDuplicateSearchValidationResult => ({
    accepted: classification === 'no-match',
    classification,
    stableId: null,
    reasons,
  });
  if (!validJiraDuplicateAction(input.action)) {
    return invalid('invalid', ['search-action-invalid']);
  }
  const capability = validateJiraHostCapability(
    'search-duplicates',
    input.action.context,
    input.hostCapability,
    ['stable-identity', 'project-context'],
  );
  if (
    !capability.valid ||
    input.hostCapability.evidenceDigest !==
      input.action.intent.capabilityEvidenceDigest ||
    input.observation.provider !== 'jira' ||
    !contextsEqual(input.observation.context, input.action.context) ||
    input.observation.capabilityEvidenceDigest !==
      input.action.intent.capabilityEvidenceDigest ||
    input.observation.queryDigest !== input.action.intent.queryDigest ||
    !Number.isFinite(Date.parse(input.observation.observedAt))
  ) {
    return invalid('invalid', [
      'search-evidence-mismatch',
      ...capability.reasons,
    ]);
  }
  if (input.observation.availability === 'unavailable') {
    return invalid('unavailable', ['search-unavailable']);
  }
  if (input.observation.availability === 'lagging') {
    return invalid('lagging', ['search-result-lag']);
  }
  const maxResults = Number(
    (input.action.intent.resultContract as Record<string, unknown>).maxResults,
  );
  if (input.observation.results.length > maxResults) {
    return invalid('invalid', ['search-results-out-of-bounds']);
  }
  const query = input.action.intent.query as Record<string, unknown>;
  const historicalKeys = query.historicalKeys as string[];
  for (const candidate of input.observation.results) {
    if (
      !ISSUE_ID.test(candidate.issueId) ||
      candidate.stableId !==
        canonicalJiraStableId(
          input.action.context.siteId!,
          candidate.issueId,
        ) ||
      candidate.keys.length > 64 ||
      new Set(candidate.keys).size !== candidate.keys.length ||
      candidate.keys.some((key) => !ISSUE_KEY.test(key)) ||
      !candidate.stableIdentityVerified ||
      !candidate.contextVerified ||
      !contextsEqual(candidate.context, input.action.context)
    ) {
      return invalid('invalid', ['candidate-identity-or-context-unverified']);
    }
    const matched =
      (candidate.matchedBy === 'provenance' &&
        candidate.matchedProvenanceToken === query.provenanceToken) ||
      (candidate.matchedBy === 'reserved-binding' &&
        candidate.matchedReservedBindingId === query.reservedBindingId) ||
      (candidate.matchedBy === 'historical-key' &&
        typeof candidate.matchedHistoricalKey === 'string' &&
        historicalKeys.includes(candidate.matchedHistoricalKey) &&
        candidate.keys.includes(candidate.matchedHistoricalKey));
    if (!matched) {
      return invalid('invalid', ['candidate-match-evidence-invalid']);
    }
  }
  if (input.observation.results.length === 0) return invalid('no-match', []);
  if (input.observation.results.length > 1) {
    return invalid('ambiguous', ['multiple-matches']);
  }
  return {
    accepted: true,
    classification: 'one-verified-match',
    stableId: input.observation.results[0]!.stableId,
    reasons: [],
  };
}

export const jiraAdapter: ProviderAdapter = {
  provider: 'jira',
  normalize: normalizeJiraIssueObservation,
  plan(
    operation: SemanticOperation,
    input: Record<string, unknown>,
  ): SemanticAction {
    if (['create', 'update', 'transition', 'annotate'].includes(operation)) {
      if (input.operation !== operation) {
        throw new Error('Jira mutation operation selector does not match.');
      }
      return planJiraMutation(input as unknown as JiraMutationPlanInput);
    }
    if (operation === 'read' && input.kind === 'metadata') {
      return planJiraMetadataRead(
        input as unknown as JiraMetadataReadPlanInput,
      );
    }
    if (operation === 'read')
      return planJiraRead(input as unknown as JiraReadPlanInput);
    if (operation === 'read-discussion') {
      return planJiraDiscussionRead(
        input as unknown as JiraDiscussionReadPlanInput,
      );
    }
    if (operation === 'search-duplicates') {
      return planJiraDuplicateSearch(
        input as unknown as JiraDuplicateSearchPlanInput,
      );
    }
    return {
      provider: 'jira',
      operation,
      context: (input.context ?? {}) as ProviderContext,
      intent: input,
    };
  },
  validateObservation(action, observation): ObservationValidation {
    const reasons: string[] = [];
    if (
      action.operation === 'read-discussion' ||
      action.operation === 'search-duplicates'
    ) {
      return {
        valid: false,
        reasons: [`typed-validator-required:${action.operation}`],
      };
    }
    const mutation = ['create', 'update', 'transition', 'annotate'].includes(
      action.operation,
    );
    if (
      mutation
        ? !validJiraMutationAction(action)
        : !validJiraActionDigest(action)
    ) {
      reasons.push('action-evidence-invalid');
    }
    if (action.provider !== 'jira' || observation.provider !== 'jira')
      reasons.push('provider-mismatch');
    if (!contextsEqual(action.context, observation.context))
      reasons.push('context-mismatch');
    const capability = parseJiraHostCapability(
      observation.fields.hostCapability,
    );
    if (!capability) reasons.push('capability-evidence-missing');
    else {
      const requiredFields: JiraSemanticField[] =
        action.operation === 'read' && action.intent.kind === 'issue'
          ? [
              'stable-identity',
              'title',
              'status',
              'revision',
              'project-context',
            ]
          : action.operation === 'read' && action.intent.kind === 'metadata'
            ? [
                'metadata',
                ...(action.intent.purpose === 'transition'
                  ? (['transitions'] as JiraSemanticField[])
                  : []),
              ]
            : [];
      const validation = validateJiraHostCapability(
        action.operation,
        action.context,
        capability,
        requiredFields,
      );
      reasons.push(...validation.reasons);
      if (
        observation.capabilityEvidenceDigest !==
          action.intent.capabilityEvidenceDigest ||
        capability.evidenceDigest !== action.intent.capabilityEvidenceDigest
      ) {
        reasons.push('capability-evidence-mismatch');
      }
    }
    if (action.operation === 'read' && action.intent.kind === 'issue') {
      try {
        const issue = normalizeJiraIssueObservation(observation);
        if (issue.stableId !== action.intent.stableId)
          reasons.push('observation-identity-mismatch');
      } catch {
        reasons.push('observation-invalid');
      }
    }
    if (
      action.operation === 'read' &&
      action.intent.kind === 'metadata' &&
      typeof observation.fields.metadataEvidenceDigest !== 'string'
    ) {
      reasons.push('metadata-evidence-missing');
    }
    if (mutation) {
      if (
        !semanticValuesEqual(
          observation.fields.mutationEvidence,
          action.intent.executionEvidence,
        )
      ) {
        reasons.push('mutation-evidence-mismatch');
      }
      if (
        action.operation === 'create' &&
        !semanticValuesEqual(
          observation.fields.createProvenance,
          action.intent.provenance,
        )
      ) {
        reasons.push('create-provenance-mismatch');
      }
      try {
        const issue = normalizeJiraIssueObservation(observation);
        if (
          action.operation !== 'create' &&
          issue.stableId !== action.intent.stableId
        ) {
          reasons.push('observation-identity-mismatch');
        }
      } catch {
        reasons.push('observation-invalid');
      }
    }
    return { valid: reasons.length === 0, reasons: uniqueStrings(reasons) };
  },
  verificationFields(action): string[] {
    if (action.operation === 'search-duplicates')
      return ['typed:search-duplicates'];
    return action.operation === 'read'
      ? ['stable-identity']
      : mutationVerificationFields(action);
  },
  verify(action, issue): FieldVerification[] {
    if (action.operation === 'search-duplicates') {
      return [{ field: 'typed:search-duplicates', status: 'unavailable' }];
    }
    if (
      ['create', 'update', 'transition', 'annotate'].includes(action.operation)
    ) {
      const fields = mutationVerificationFields(action);
      if (
        !validJiraMutationAction(action) ||
        issue.provider !== 'jira' ||
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
        return fields.map((field) => ({ field, status: 'unavailable' }));
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
        };
      });
    }
    return this.verificationFields(action).map((field) => ({
      field,
      status:
        validJiraActionDigest(action) &&
        action.operation === 'read' &&
        action.intent.kind === 'issue' &&
        issue.provider === 'jira' &&
        contextsEqual(action.context, issue.context) &&
        issue.stableId === action.intent.stableId &&
        issue.extensions.capabilityEvidenceDigest ===
          action.intent.capabilityEvidenceDigest
          ? 'verified'
          : 'unavailable',
    }));
  },
};

function canonicalJiraStableId(siteId: string, issueId: string): string {
  return `jira:${siteId}:${issueId}`;
}

function hasPinnedJiraContext(context: ProviderContext): boolean {
  return ['accountId', 'siteId', 'projectId'].every(
    (key) => typeof context[key] === 'string' && context[key]!.length > 0,
  );
}

function validJiraStableIdForContext(
  stableId: string,
  context: ProviderContext,
): boolean {
  if (!hasPinnedJiraContext(context)) return false;
  const prefix = `jira:${context.siteId}:`;
  return (
    stableId.startsWith(prefix) && ISSUE_ID.test(stableId.slice(prefix.length))
  );
}

function requireJiraCapability(
  capability: JiraHostCapabilityObservation,
  context: ProviderContext,
  operation: SemanticOperation,
  fields: JiraSemanticField[] = [],
): void {
  const validation = validateJiraHostCapability(
    operation,
    context,
    capability,
    fields,
  );
  if (!validation.valid) {
    throw new Error(
      `Jira semantic capability is unavailable: ${validation.reasons.join(',')}`,
    );
  }
}

function assertJiraMutationIdentity(input: JiraMutationPreviewInput): void {
  if (!hasPinnedJiraContext(input.context) || !input.bindingId) {
    throw new Error('Jira mutation requires a binding and pinned context.');
  }
  if (input.operation === 'create') {
    if (
      input.stableId !== undefined ||
      input.provenance?.bindingId !== input.bindingId ||
      !input.provenance.origin
    ) {
      throw new Error('Jira create requires exact creation provenance.');
    }
  } else if (
    !input.stableId ||
    !validJiraStableIdForContext(input.stableId, input.context)
  ) {
    throw new Error('Jira mutation requires a stable issue identity.');
  }
}

function normalizeJiraMutationFieldMask(
  input: JiraMutationPreviewInput,
): JiraMutationField[] {
  const allowed: Record<
    JiraMutationPreviewInput['operation'],
    JiraMutationField[]
  > = {
    create: ['title', 'description', 'priority'],
    update: ['title', 'description', 'priority'],
    transition: ['status'],
    annotate: ['annotation'],
  };
  if (
    input.fieldMask.length === 0 ||
    new Set(input.fieldMask).size !== input.fieldMask.length ||
    input.fieldMask.some(
      (field) => !allowed[input.operation].includes(field as JiraMutationField),
    ) ||
    Object.keys(input.projection).length !== input.fieldMask.length ||
    Object.keys(input.projection).some(
      (field) => !input.fieldMask.includes(field),
    )
  ) {
    throw new Error('Jira mutation projection or field mask is invalid.');
  }
  return [...input.fieldMask] as JiraMutationField[];
}

function assertJiraMetadataSupports(
  input: JiraMutationPreviewInput,
  fieldMask: JiraMutationField[],
): void {
  if (!input.normalizedMetadata.evidenceDigest) {
    throw new Error('Jira normalized metadata evidence is missing.');
  }
  if (
    fieldMask.some(
      (field) => !input.normalizedMetadata.writableFields.includes(field),
    )
  ) {
    throw new Error(
      'Jira normalized metadata does not allow requested fields.',
    );
  }
  if (
    input.operation === 'transition' &&
    !input.normalizedMetadata.transitions.includes(
      String(input.projection.status),
    )
  ) {
    throw new Error('Jira transition is unavailable in normalized metadata.');
  }
}

function jiraAction(
  operation: SemanticOperation,
  context: ProviderContext,
  intent: Record<string, unknown>,
): SemanticAction {
  return {
    provider: 'jira',
    operation,
    context,
    intent: {
      ...intent,
      actionDigest: semanticDigest({
        provider: 'jira',
        operation,
        context,
        intent,
      }),
    },
  };
}

function mutationVerificationFields(action: SemanticAction): string[] {
  return Array.isArray(action.intent.fieldMask)
    ? action.intent.fieldMask.filter(
        (field): field is string => typeof field === 'string',
      )
    : [];
}

function validJiraMutationAction(action: SemanticAction): boolean {
  if (
    action.provider !== 'jira' ||
    !['create', 'update', 'transition', 'annotate'].includes(
      action.operation,
    ) ||
    !hasPinnedJiraContext(action.context)
  ) {
    return false;
  }
  const intent = action.intent;
  if (
    typeof intent.bindingId !== 'string' ||
    !intent.bindingId ||
    !Array.isArray(intent.fieldMask) ||
    !isRecord(intent.projection) ||
    !isRecord(intent.postconditions) ||
    !semanticValuesEqual(intent.projection, intent.postconditions) ||
    typeof intent.capabilityEvidenceDigest !== 'string' ||
    typeof intent.metadataEvidenceDigest !== 'string' ||
    !isRecord(intent.outboundSafety) ||
    !isRecord(intent.outboundSafetyEvidence) ||
    !isRecord(intent.executionEvidence) ||
    typeof intent.previewDigest !== 'string' ||
    intent.approvalDigest !== intent.previewDigest ||
    typeof intent.actionDigest !== 'string'
  ) {
    return false;
  }
  const operation = action.operation as JiraMutationPreviewInput['operation'];
  const projection = intent.projection;
  const safety =
    intent.outboundSafetyEvidence as unknown as OutboundProjectionSafetyResult;
  try {
    normalizeJiraMutationFieldMask({
      operation,
      context: action.context,
      hostCapability: {} as JiraHostCapabilityObservation,
      normalizedMetadata: {} as JiraNormalizedMetadata,
      bindingId: intent.bindingId,
      fieldMask: intent.fieldMask as string[],
      projection,
      outboundSafety: safety,
    });
    requireCurrentOutboundSafety(projection, safety);
  } catch {
    return false;
  }
  if (
    !semanticValuesEqual(intent.outboundSafety, {
      projectionDigest: safety.projectionDigest,
      resultDigest: safety.resultDigest,
    })
  ) {
    return false;
  }
  if (operation === 'create') {
    if (
      intent.stableId !== null ||
      !isRecord(intent.provenance) ||
      intent.provenance.bindingId !== intent.bindingId ||
      typeof intent.provenance.origin !== 'string' ||
      !intent.provenance.origin
    ) {
      return false;
    }
  } else if (
    intent.provenance !== null ||
    typeof intent.stableId !== 'string' ||
    !validJiraStableIdForContext(intent.stableId, action.context)
  ) {
    return false;
  }
  const fieldMask = intent.fieldMask as JiraMutationField[];
  const baseExecutionEvidence = {
    capabilityEvidenceDigest: intent.capabilityEvidenceDigest,
    metadataEvidenceDigest: intent.metadataEvidenceDigest,
    projectionDigest: safety.projectionDigest,
    outboundSafetyResultDigest: safety.resultDigest,
  };
  const expectedPreviewDigest = semanticDigest({
    provider: 'jira',
    operation,
    context: action.context,
    bindingId: intent.bindingId,
    stableId: intent.stableId,
    provenance: intent.provenance,
    fieldMask,
    projection,
    postconditions: projection,
    executionEvidence: baseExecutionEvidence,
  });
  const {
    actionDigest: _actionDigest,
    executionEvidence: _executionEvidence,
    ...baseIntent
  } = intent;
  const expectedActionDigest = semanticDigest({
    provider: 'jira',
    operation,
    context: action.context,
    intent: baseIntent,
    executionEvidence: baseExecutionEvidence,
  });
  return (
    intent.previewDigest === expectedPreviewDigest &&
    intent.actionDigest === expectedActionDigest &&
    semanticValuesEqual(intent.executionEvidence, {
      ...baseExecutionEvidence,
      previewDigest: expectedPreviewDigest,
      approvalDigest: expectedPreviewDigest,
      actionDigest: expectedActionDigest,
    }) &&
    semanticValuesEqual(intent.readbackContract, {
      pinned: true,
      requireStableIdentity: true,
      requireExactContext: true,
      fields: fieldMask,
    })
  );
}

function validJiraDuplicateAction(action: SemanticAction): boolean {
  if (
    action.provider !== 'jira' ||
    action.operation !== 'search-duplicates' ||
    !hasPinnedJiraContext(action.context) ||
    !isRecord(action.intent.query) ||
    !isRecord(action.intent.resultContract) ||
    typeof action.intent.capabilityEvidenceDigest !== 'string' ||
    !validJiraActionDigest(action)
  ) {
    return false;
  }
  const query = action.intent.query;
  const historicalKeys = query.historicalKeys;
  const maxResults = Number(action.intent.resultContract.maxResults);
  if (
    typeof query.provenanceToken !== 'string' ||
    !query.provenanceToken ||
    Buffer.byteLength(query.provenanceToken, 'utf8') > 512 ||
    typeof query.reservedBindingId !== 'string' ||
    !query.reservedBindingId ||
    Buffer.byteLength(query.reservedBindingId, 'utf8') > 128 ||
    !Array.isArray(historicalKeys) ||
    historicalKeys.length > 64 ||
    new Set(historicalKeys).size !== historicalKeys.length ||
    historicalKeys.some(
      (key) => typeof key !== 'string' || !ISSUE_KEY.test(key),
    ) ||
    query.siteId !== action.context.siteId ||
    query.projectId !== action.context.projectId ||
    !Number.isInteger(maxResults) ||
    maxResults < 1 ||
    maxResults > 100
  ) {
    return false;
  }
  const expectedQuery = {
    provenanceToken: query.provenanceToken,
    reservedBindingId: query.reservedBindingId,
    historicalKeys,
    siteId: action.context.siteId,
    projectId: action.context.projectId,
  };
  return (
    semanticValuesEqual(query, expectedQuery) &&
    action.intent.queryDigest === semanticDigest(expectedQuery) &&
    semanticValuesEqual(action.intent.resultContract, {
      maxResults,
      classifications: ['no-match', 'one-match', 'ambiguous'],
      requireStableIssueId: true,
      requireExactContext: true,
      matchStatus: 'evidence-until-identity-and-context-verified',
    })
  );
}

function validJiraActionDigest(action: SemanticAction): boolean {
  if (action.provider !== 'jira' || !hasPinnedJiraContext(action.context))
    return false;
  const { actionDigest, ...intent } = action.intent;
  return (
    typeof actionDigest === 'string' &&
    actionDigest ===
      semanticDigest({
        provider: 'jira',
        operation: action.operation,
        context: action.context,
        intent,
      })
  );
}

function semanticValuesEqual(left: unknown, right: unknown): boolean {
  try {
    return semanticDigest(left) === semanticDigest(right);
  } catch {
    return false;
  }
}

function unavailableJiraRead(
  classification: 'partial' | 'inaccessible' | 'temporarily-unavailable',
  reasons: string[],
): JiraReadResult {
  return { classification, issue: null, preservePriorEvidence: true, reasons };
}

function parseJiraHostCapability(
  value: unknown,
): JiraHostCapabilityObservation | null {
  if (
    !isRecord(value) ||
    value.provider !== 'jira' ||
    !isRecord(value.context) ||
    !Array.isArray(value.operations) ||
    !Array.isArray(value.observableFields) ||
    typeof value.accountId !== 'string' ||
    typeof value.siteId !== 'string' ||
    typeof value.projectId !== 'string' ||
    typeof value.evidenceDigest !== 'string'
  ) {
    return null;
  }
  return value as unknown as JiraHostCapabilityObservation;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function assertJiraObservation(
  observation: SanitizedProviderObservation,
): void {
  if (observation.provider !== 'jira')
    throw new Error('Expected a Jira observation.');
  if (!observation.capabilityEvidenceDigest)
    throw new Error('Jira capability evidence is missing.');
}

function requiredContext(
  observation: SanitizedProviderObservation,
  key: string,
): string {
  const value = observation.context[key];
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Jira observation context '${key}' is missing.`);
  }
  return value;
}

function requiredString(fields: Record<string, unknown>, key: string): string {
  const value = fields[key];
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Jira observation field '${key}' is invalid.`);
  }
  return value;
}

function nullableString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string')
    throw new Error('Jira optional text field is invalid.');
  return value;
}

function stringArray(value: unknown): string[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new Error('Jira observation alias list is invalid.');
  }
  return uniqueStrings(value);
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
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
