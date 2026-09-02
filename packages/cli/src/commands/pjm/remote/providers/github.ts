import { containsSensitiveContentSignal } from '@commands/pjm/remote/credential-safety';
import {
  inspectManagedMarkdown,
  insertManagedMarkdown,
  replaceManagedMarkdown,
} from '@commands/pjm/remote/managed-markdown';
import {
  requireCurrentOutboundSafety,
  type OutboundProjection,
  type OutboundProjectionSafetyResult,
} from '@commands/pjm/remote/outbound-projection-safety';
import {
  contextsEqual,
  semanticDigest,
  type NormalizedRemoteIssue,
  type ObservationValidation,
  type FieldVerification,
  type ProviderAdapter,
  type ProviderContext,
  type SanitizedProviderObservation,
  type SemanticAction,
  type SemanticOperation,
} from '@commands/pjm/remote/provider';
import { WHOLE_FIELD_SUPPRESSION_MARKER } from '@commands/pjm/remote/schema';

import {
  requireCurrentGitHubPublicationSafety,
  type GitHubPublicationSafetyResult,
} from './github-publication-safety';

export interface GitHubIssueReference {
  host?: string;
  owner: string;
  name: string;
  number: number;
  alias: string;
}

export type GitHubSemanticField =
  | 'stable-identity'
  | 'title'
  | 'body'
  | 'state'
  | 'priority'
  | 'revision';

export interface GitHubHostCapabilityObservation {
  provider: 'github';
  context: ProviderContext;
  availability:
    | 'available'
    | 'unavailable'
    | 'authorization-required'
    | 'rate-limited';
  accountId: string;
  repositoryId: string;
  operations: SemanticOperation[];
  observableFields: GitHubSemanticField[];
  evidenceDigest: string;
}

export interface GitHubCapabilityExpectation {
  operation: SemanticOperation;
  context: ProviderContext;
  requiredFields?: GitHubSemanticField[];
}

export type GitHubReadLifecycle =
  | 'current'
  | 'renamed'
  | 'transferred'
  | 'archived'
  | 'inaccessible'
  | 'deleted'
  | 'temporarily-unavailable';

export interface GitHubReadResult {
  classification: GitHubReadLifecycle;
  issue: NormalizedRemoteIssue | null;
  freshness: {
    observedAt: string;
    revisionStrength: 'strong' | 'weak';
  } | null;
  preservePriorEvidence: boolean;
  reasons: string[];
}

export interface GitHubReadObservationInput {
  action: SemanticAction;
  hostCapability: GitHubHostCapabilityObservation;
  observedAt: string;
  outcome: 'found' | 'not-found' | 'temporary-failure';
  observation?: SanitizedProviderObservation;
  archived?: boolean;
  deletionEvidence?: {
    provider: 'github';
    stableId: string;
    context: ProviderContext;
    capabilityEvidenceDigest: string;
    observedAt: string;
    evidenceDigest: string;
  };
}

export type GitHubMutationField =
  | 'title'
  | 'description'
  | 'priority'
  | 'status'
  | 'annotation';

export interface GitHubMutationPreviewInput {
  operation: 'create' | 'update' | 'transition' | 'annotate';
  context: ProviderContext;
  bindingId: string;
  stableId?: string;
  provenance?: { bindingId: string; origin: string };
  fieldMask: GitHubMutationField[];
  descriptionMode: 'managed-section' | 'replace' | 'none';
  currentBody?: string;
  projection: OutboundProjection;
  outboundSafety: OutboundProjectionSafetyResult;
  hostCapability: GitHubHostCapabilityObservation;
  publicationSafety: GitHubPublicationSafetyResult;
}

export interface GitHubMutationPlanInput extends GitHubMutationPreviewInput {
  approvedPreviewDigest: string;
}

export interface GitHubMutationPreview {
  previewDigest: string;
  executionEvidence: {
    capabilityEvidenceDigest: string;
    projectionDigest: string;
    outboundSafetyResultDigest: string;
    publicationSafetyResultDigest: string;
    visibilityEvidenceDigest: string;
  };
}

export type GitHubMutationVerificationClassification =
  | 'verified'
  | 'partial'
  | 'rejected'
  | 'uncertain';

export interface GitHubMutationVerificationInput {
  action: SemanticAction;
  attempt: {
    count: number;
    outcome: 'accepted' | 'rejected' | 'unknown';
    capabilityEvidenceDigest: string;
  };
  hostCapability: GitHubHostCapabilityObservation;
  readback: SanitizedProviderObservation | null;
}

export interface GitHubMutationVerificationResult {
  classification: GitHubMutationVerificationClassification;
  reason: string;
  fields: FieldVerification[];
  retryAllowed: false;
}

export interface GitHubDuplicateSearchPlanInput {
  context: ProviderContext;
  hostCapability: GitHubHostCapabilityObservation;
  provenanceToken: string;
  reservedBindingId: string;
  historicalAliases: string[];
  maxResults: number;
}

export interface GitHubDuplicateCandidate {
  stableId: string;
  aliases: string[];
  context: ProviderContext;
  matchedBy: 'provenance' | 'reserved-binding' | 'alias';
  matchedProvenanceToken?: string;
  matchedReservedBindingId?: string;
  matchedAlias?: string;
  stableIdentityVerified: boolean;
  contextVerified: boolean;
  historicalRepositoryIds: string[];
}

export interface GitHubDuplicateSearchObservation {
  provider: 'github';
  context: ProviderContext;
  availability: 'available' | 'unavailable';
  capabilityEvidenceDigest: string;
  queryDigest: string;
  results: GitHubDuplicateCandidate[];
}

export interface GitHubDuplicateSearchValidationInput {
  action: SemanticAction;
  hostCapability: GitHubHostCapabilityObservation;
  observation: GitHubDuplicateSearchObservation;
}

export interface GitHubDuplicateSearchValidationResult {
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

export interface GitHubDiscussionReadPlanInput {
  context: ProviderContext;
  hostCapability: GitHubHostCapabilityObservation;
  stableId: string;
  evidenceKind: 'comments' | 'activity';
  cursor: string | null;
  limit: number;
}

export interface GitHubDiscussionItemObservation {
  id: string;
  kind: 'comment' | 'activity';
  body: string;
  observedAt: string;
}

export interface GitHubDiscussionReadObservation {
  provider: 'github';
  context: ProviderContext;
  stableId: string;
  availability: 'available' | 'rate-limited' | 'permission-denied';
  capabilityEvidenceDigest: string;
  requestedCursor: string | null;
  nextCursor: string | null;
  items: GitHubDiscussionItemObservation[];
}

export interface GitHubDiscussionReadValidationInput {
  action: SemanticAction;
  hostCapability: GitHubHostCapabilityObservation;
  observation: GitHubDiscussionReadObservation;
}

export interface GitHubDiscussionReadValidationResult {
  classification: 'page' | 'rate-limited' | 'permission-denied' | 'invalid';
  page: {
    items: Array<
      GitHubDiscussionItemObservation & { contentSuppressed: boolean }
    >;
    nextCursor: string | null;
  } | null;
  persistable: false;
  reasons: string[];
}

const URL_REFERENCE =
  /^https:\/\/([^/]+)\/([^/]+)\/([^/]+)\/issues\/(\d+)(?:[/?#].*)?$/;
const SHORT_REFERENCE = /^([^/\s]+)\/([^#\s]+)#(\d+)$/;

export function parseGitHubIssueReference(
  reference: string,
): GitHubIssueReference | null {
  const value = reference.trim();
  const url = URL_REFERENCE.exec(value);
  if (url) {
    return {
      host: url[1]!.toLowerCase(),
      owner: url[2]!,
      name: url[3]!,
      number: Number(url[4]),
      alias: value,
    };
  }
  const short = SHORT_REFERENCE.exec(value);
  if (!short) return null;
  return {
    owner: short[1]!,
    name: short[2]!,
    number: Number(short[3]),
    alias: value,
  };
}

export function normalizeGitHubIssueObservation(
  observation: SanitizedProviderObservation,
): NormalizedRemoteIssue {
  assertGitHubObservation(observation);
  const host = requiredContext(observation, 'host').toLowerCase();
  const repositoryId = requiredContext(observation, 'repositoryId');
  const nodeId = requiredString(observation.fields, 'nodeId');
  const owner = requiredString(observation.fields, 'owner');
  const name = requiredString(observation.fields, 'name');
  const number = requiredPositiveInteger(observation.fields, 'number');
  const url = requiredString(observation.fields, 'url');
  const title = requiredString(observation.fields, 'title');
  const description = nullableString(observation.fields, 'body');
  const priority = nullableString(observation.fields, 'priority');
  const status = requiredString(observation.fields, 'state');
  const databaseId = requiredPositiveInteger(observation.fields, 'databaseId');
  const pullRequests = uniqueStrings(observation.fields.pullRequests);
  const historicalRepositoryIds = optionalStringArray(
    observation.fields.historicalRepositoryIds,
  );
  const currentShortAlias = `${owner}/${name}#${number}`;

  return {
    provider: 'github',
    context: observation.context,
    stableId: canonicalGitHubStableId(host, nodeId),
    aliases: uniqueStrings([
      currentShortAlias,
      url,
      ...observation.identity.aliases,
    ]),
    title,
    description,
    priority,
    status,
    revisionDigest: semanticDigest(observation.revision),
    extensions: {
      databaseId,
      nodeId,
      repositoryId,
      historicalRepositoryIds,
      pullRequests,
    },
  };
}

export function validateGitHubHostCapability(
  expected: GitHubCapabilityExpectation,
  observed: GitHubHostCapabilityObservation,
): ObservationValidation {
  const reasons: string[] = [];
  if (observed.provider !== 'github') reasons.push('provider-mismatch');
  if (observed.availability === 'unavailable')
    reasons.push('access-unavailable');
  if (observed.availability === 'authorization-required')
    reasons.push('authorization-required');
  if (observed.availability === 'rate-limited') reasons.push('rate-limited');
  if (
    expected.context.accountId &&
    observed.accountId !== expected.context.accountId
  ) {
    reasons.push('account-mismatch');
  }
  if (
    expected.context.repositoryId &&
    observed.repositoryId !== expected.context.repositoryId
  ) {
    reasons.push('repository-mismatch');
  }
  if (!contextsEqual(expected.context, observed.context)) {
    const accountOrRepositoryMismatch = reasons.some((reason) =>
      ['account-mismatch', 'repository-mismatch'].includes(reason),
    );
    if (!accountOrRepositoryMismatch) reasons.push('context-mismatch');
  }
  if (!observed.operations.includes(expected.operation)) {
    reasons.push(`capability-missing:${expected.operation}`);
  }
  for (const field of expected.requiredFields ?? requiredFieldsForRead()) {
    if (!observed.observableFields.includes(field)) {
      reasons.push(`semantic-field-missing:${field}`);
    }
  }
  if (!observed.evidenceDigest) reasons.push('capability-evidence-missing');
  return { valid: reasons.length === 0, reasons };
}

export function classifyGitHubReadObservation(
  input: GitHubReadObservationInput,
): GitHubReadResult {
  if (input.action.provider !== 'github' || input.action.operation !== 'read') {
    throw new Error(
      'GitHub read classification requires a GitHub read action.',
    );
  }
  if (!Number.isFinite(Date.parse(input.observedAt))) {
    throw new Error('GitHub read classification requires a valid timestamp.');
  }
  const capability = validateGitHubHostCapability(
    {
      operation: 'read',
      context: input.action.context,
      requiredFields: requiredFieldsForRead(),
    },
    input.hostCapability,
  );
  if (!capability.valid) {
    return unavailableReadResult(
      capability.reasons.includes('rate-limited')
        ? 'temporarily-unavailable'
        : 'inaccessible',
      capability.reasons,
    );
  }
  const plannedCapabilityDigest = input.action.intent.capabilityEvidenceDigest;
  const plannedStableId = input.action.intent.stableId;
  const plannedNodeId = input.action.intent.stableNodeId;
  if (
    typeof plannedCapabilityDigest !== 'string' ||
    plannedCapabilityDigest !== input.hostCapability.evidenceDigest ||
    typeof plannedStableId !== 'string' ||
    typeof plannedNodeId !== 'string'
  ) {
    return unavailableReadResult('inaccessible', [
      'planned-read-evidence-missing-or-mismatched',
    ]);
  }
  if (input.outcome === 'temporary-failure') {
    return unavailableReadResult('temporarily-unavailable', [
      'temporary-host-failure',
    ]);
  }
  if (input.outcome === 'not-found') {
    const deleted = validDeletionEvidence(
      input.deletionEvidence,
      input.action,
      input.hostCapability.evidenceDigest,
    );
    return unavailableReadResult(deleted ? 'deleted' : 'inaccessible', [
      deleted ? 'authoritative-deletion' : 'absence-not-authoritative',
    ]);
  }
  if (!input.observation) {
    return unavailableReadResult('temporarily-unavailable', [
      'read-observation-missing',
    ]);
  }
  const observedNodeId = input.observation.fields.nodeId;
  const observedHost = input.observation.context.host;
  if (input.observation.provider !== 'github') {
    return unavailableReadResult('inaccessible', [
      'observation-provider-mismatch',
    ]);
  }
  if (input.observation.capabilityEvidenceDigest !== plannedCapabilityDigest) {
    return unavailableReadResult('inaccessible', [
      'observation-capability-mismatch',
    ]);
  }
  if (observedHost !== input.action.context.host) {
    return unavailableReadResult('inaccessible', ['observation-host-mismatch']);
  }
  if (
    input.observation.context.owner !== input.observation.fields.owner ||
    input.observation.context.name !== input.observation.fields.name
  ) {
    return unavailableReadResult('inaccessible', [
      'observation-context-mismatch',
    ]);
  }
  if (
    input.observation.context.accountId !== undefined &&
    input.observation.context.accountId !== input.action.context.accountId
  ) {
    return unavailableReadResult('inaccessible', [
      'observation-account-mismatch',
    ]);
  }
  if (
    observedNodeId !== plannedNodeId ||
    !observationIdentityMatches(
      input.observation.identity.stableId,
      plannedStableId,
      plannedNodeId,
    )
  ) {
    return unavailableReadResult('inaccessible', [
      'observation-identity-mismatch',
    ]);
  }
  const expectedRepositoryId = input.action.context.repositoryId;
  const observedRepositoryId = input.observation.context.repositoryId;
  if (
    expectedRepositoryId &&
    observedRepositoryId !== expectedRepositoryId &&
    !validTransferEvidence(
      input.observation.fields.transferEvidence,
      plannedStableId,
      expectedRepositoryId,
      observedRepositoryId,
      plannedCapabilityDigest,
      input.observedAt,
    )
  ) {
    return unavailableReadResult('inaccessible', [
      'transfer-evidence-missing-or-invalid',
    ]);
  }
  let issue: NormalizedRemoteIssue;
  try {
    issue = normalizeGitHubIssueObservation(input.observation);
  } catch {
    return unavailableReadResult('inaccessible', ['read-observation-invalid']);
  }
  const currentAlias = `${requiredString(input.observation.fields, 'owner')}/${requiredString(input.observation.fields, 'name')}#${requiredPositiveInteger(input.observation.fields, 'number')}`;
  const expectedAlias = input.action.intent.currentAlias;
  const classification: GitHubReadLifecycle = input.archived
    ? 'archived'
    : expectedRepositoryId && observedRepositoryId !== expectedRepositoryId
      ? 'transferred'
      : typeof expectedAlias === 'string' && currentAlias !== expectedAlias
        ? 'renamed'
        : 'current';
  return {
    classification,
    issue,
    freshness: {
      observedAt: input.observedAt,
      revisionStrength: input.observation.revision.token ? 'strong' : 'weak',
    },
    preservePriorEvidence: false,
    reasons: [],
  };
}

export function previewGitHubMutation(
  input: GitHubMutationPreviewInput,
): GitHubMutationPreview {
  assertMutationIdentity(input);
  const capability = validateGitHubHostCapability(
    { operation: input.operation, context: input.context, requiredFields: [] },
    input.hostCapability,
  );
  if (!capability.valid) {
    throw new Error('GitHub mutation capability is unavailable.');
  }
  const fieldMask = normalizeMutationFieldMask(
    input.operation,
    input.fieldMask,
  );
  const projection = buildMutationProjection(input, fieldMask);
  requireCurrentOutboundSafety(projection, input.outboundSafety);
  requireCurrentGitHubPublicationSafety({
    context: input.context,
    capabilityEvidenceDigest: input.hostCapability.evidenceDigest,
    projection,
    outboundSafety: input.outboundSafety,
    result: input.publicationSafety,
  });
  const executionEvidence = {
    capabilityEvidenceDigest: input.hostCapability.evidenceDigest,
    projectionDigest: input.outboundSafety.projectionDigest,
    outboundSafetyResultDigest: input.outboundSafety.resultDigest,
    publicationSafetyResultDigest: input.publicationSafety.resultDigest,
    visibilityEvidenceDigest:
      input.publicationSafety.preview.visibilityEvidenceDigest,
  };
  const previewDigest = semanticDigest({
    provider: 'github',
    operation: input.operation,
    context: input.context,
    bindingId: input.bindingId,
    stableId: input.stableId ?? null,
    provenance: input.provenance ?? null,
    fieldMask,
    projection,
    postconditions: projection,
    executionEvidence,
  });
  return { previewDigest, executionEvidence };
}

export function planGitHubMutation(
  input: GitHubMutationPlanInput,
): SemanticAction {
  const preview = previewGitHubMutation(input);
  if (input.approvedPreviewDigest !== preview.previewDigest) {
    throw new Error('GitHub mutation approval does not match its preview.');
  }
  const fieldMask = normalizeMutationFieldMask(
    input.operation,
    input.fieldMask,
  );
  const projection = buildMutationProjection(input, fieldMask);
  const actionDigest = semanticDigest({
    provider: 'github',
    operation: input.operation,
    context: input.context,
    previewDigest: preview.previewDigest,
    approvalDigest: input.approvedPreviewDigest,
    executionEvidence: preview.executionEvidence,
  });
  return {
    provider: 'github',
    operation: input.operation,
    context: input.context,
    intent: {
      bindingId: input.bindingId,
      stableId: input.stableId ?? null,
      provenance: input.provenance ?? null,
      fieldMask,
      projection,
      postconditions: { ...projection },
      capabilityEvidenceDigest: input.hostCapability.evidenceDigest,
      outboundSafety: {
        projectionDigest: input.outboundSafety.projectionDigest,
        resultDigest: input.outboundSafety.resultDigest,
      },
      publicationSafety: {
        resultDigest: input.publicationSafety.resultDigest,
        visibilityEvidenceDigest:
          input.publicationSafety.preview.visibilityEvidenceDigest,
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
    },
  };
}

export function verifyGitHubMutationObservation(
  input: GitHubMutationVerificationInput,
): GitHubMutationVerificationResult {
  if (
    input.action.provider !== 'github' ||
    !['create', 'update', 'transition', 'annotate'].includes(
      input.action.operation,
    )
  ) {
    throw new Error('GitHub mutation verification requires a mutation action.');
  }
  if (input.attempt.count !== 1) {
    throw new Error(
      'GitHub mutation verification accepts exactly one attempt.',
    );
  }
  if (!validMutationActionEvidence(input.action)) {
    return mutationResult('uncertain', 'action-evidence-invalid');
  }
  const capability = validateGitHubHostCapability(
    {
      operation: input.action.operation,
      context: input.action.context,
      requiredFields: [],
    },
    input.hostCapability,
  );
  if (
    !capability.valid ||
    input.action.intent.capabilityEvidenceDigest !==
      input.hostCapability.evidenceDigest ||
    input.attempt.capabilityEvidenceDigest !==
      input.hostCapability.evidenceDigest
  ) {
    return mutationResult('uncertain', 'attempt-capability-mismatch');
  }
  if (input.attempt.outcome === 'rejected') {
    return mutationResult('rejected', 'provider-rejected');
  }
  if (input.attempt.outcome === 'unknown') {
    return mutationResult('uncertain', 'unknown-after-attempt');
  }
  if (!input.readback) {
    return mutationResult('uncertain', 'readback-missing');
  }
  if (
    input.readback.capabilityEvidenceDigest !==
    input.attempt.capabilityEvidenceDigest
  ) {
    return mutationResult('uncertain', 'readback-surface-mismatch');
  }
  if (
    input.readback.provider !== 'github' ||
    !contextsEqual(input.action.context, input.readback.context)
  ) {
    return mutationResult('uncertain', 'readback-context-mismatch');
  }
  if (
    !semanticValuesEqual(
      input.readback.fields.mutationEvidence,
      input.action.intent.executionEvidence,
    )
  ) {
    return mutationResult('uncertain', 'readback-action-evidence-mismatch');
  }
  if (
    input.action.operation === 'create' &&
    !semanticValuesEqual(
      input.readback.fields.createProvenance,
      input.action.intent.provenance,
    )
  ) {
    return mutationResult('uncertain', 'readback-create-provenance-mismatch');
  }
  let normalizedReadback: NormalizedRemoteIssue;
  try {
    normalizedReadback = normalizeGitHubIssueObservation(input.readback);
  } catch {
    return mutationResult('uncertain', 'readback-invalid');
  }
  const readbackNodeId = String(input.readback.fields.nodeId ?? '');
  if (
    !observationIdentityMatches(
      input.readback.identity.stableId,
      normalizedReadback.stableId,
      readbackNodeId,
    )
  ) {
    return mutationResult('uncertain', 'readback-identity-mismatch');
  }
  const stableId = input.action.intent.stableId;
  if (
    typeof stableId === 'string' &&
    stableId !== input.readback.identity.stableId &&
    stableId !== normalizedReadback.stableId
  ) {
    return mutationResult('uncertain', 'readback-identity-mismatch');
  }
  const postconditions = parsePostconditions(
    input.action.intent.postconditions,
  );
  const fields = Object.entries(postconditions).map(([field, expected]) => ({
    field,
    status: verifyMutationField(input.readback!, field, expected),
  })) satisfies FieldVerification[];
  const verifiedCount = fields.filter(
    (field) => field.status === 'verified',
  ).length;
  if (verifiedCount === fields.length) {
    return mutationResult('verified', 'postconditions-verified', fields);
  }
  if (verifiedCount > 0) {
    return mutationResult('partial', 'postconditions-partial', fields);
  }
  return mutationResult('uncertain', 'postconditions-unverified', fields);
}

export function planDuplicateSearch(
  input: GitHubDuplicateSearchPlanInput,
): SemanticAction {
  const capability = validateGitHubHostCapability(
    {
      operation: 'search-duplicates',
      context: input.context,
      requiredFields: [],
    },
    input.hostCapability,
  );
  if (!capability.valid) {
    throw new Error('GitHub duplicate search capability is unavailable.');
  }
  if (
    !input.provenanceToken ||
    !input.reservedBindingId ||
    !Number.isInteger(input.maxResults) ||
    input.maxResults < 1 ||
    input.maxResults > 100 ||
    input.historicalAliases.length > 64
  ) {
    throw new Error('GitHub duplicate search bounds are invalid.');
  }
  const query = {
    provenanceToken: input.provenanceToken,
    reservedBindingId: input.reservedBindingId,
    historicalAliases: uniqueStrings(input.historicalAliases),
    repository: {
      host: requiredContextValue(input.context, 'host'),
      repositoryId: requiredContextValue(input.context, 'repositoryId'),
      owner: requiredContextValue(input.context, 'owner'),
      name: requiredContextValue(input.context, 'name'),
    },
  };
  return {
    provider: 'github',
    operation: 'search-duplicates',
    context: input.context,
    intent: {
      query,
      queryDigest: semanticDigest(query),
      resultContract: {
        maxResults: input.maxResults,
        classifications: ['no-match', 'one-match', 'ambiguous'],
        matchStatus: 'evidence-until-identity-and-context-verified',
      },
      capabilityEvidenceDigest: input.hostCapability.evidenceDigest,
    },
  };
}

export function validateDuplicateSearchObservation(
  input: GitHubDuplicateSearchValidationInput,
): GitHubDuplicateSearchValidationResult {
  if (
    input.action.provider !== 'github' ||
    input.action.operation !== 'search-duplicates'
  ) {
    throw new Error('GitHub duplicate validation requires a search action.');
  }
  const capability = validateGitHubHostCapability(
    {
      operation: 'search-duplicates',
      context: input.action.context,
      requiredFields: [],
    },
    input.hostCapability,
  );
  if (!capability.valid || input.observation.availability === 'unavailable') {
    return duplicateValidationResult(false, 'unavailable', null, [
      ...capability.reasons,
      ...(input.observation.availability === 'unavailable'
        ? ['search-unavailable']
        : []),
    ]);
  }
  if (
    input.action.intent.capabilityEvidenceDigest !==
      input.hostCapability.evidenceDigest ||
    input.observation.provider !== 'github' ||
    !contextsEqual(input.action.context, input.observation.context) ||
    input.observation.capabilityEvidenceDigest !==
      input.action.intent.capabilityEvidenceDigest ||
    input.observation.queryDigest !== input.action.intent.queryDigest
  ) {
    return duplicateValidationResult(false, 'invalid', null, [
      'observation-context-or-capability-mismatch',
    ]);
  }
  const resultContract = recordValue(
    input.action.intent.resultContract,
    'GitHub duplicate result contract is missing.',
  );
  const maxResults = resultContract.maxResults;
  if (
    !Number.isInteger(maxResults) ||
    Number(maxResults) < 1 ||
    input.observation.results.length > Number(maxResults)
  ) {
    return duplicateValidationResult(false, 'invalid', null, [
      'result-bound-exceeded',
    ]);
  }
  if (input.observation.results.length === 0) {
    return duplicateValidationResult(true, 'no-match', null, []);
  }
  if (input.observation.results.length > 1) {
    return duplicateValidationResult(false, 'ambiguous', null, [
      'multiple-candidates',
    ]);
  }
  const candidate = input.observation.results[0]!;
  const query = recordValue(
    input.action.intent.query,
    'GitHub duplicate query contract is missing.',
  );
  const repository = recordValue(
    query.repository,
    'GitHub duplicate repository contract is missing.',
  );
  const expectedRepositoryId = String(repository.repositoryId ?? '');
  const aliases = Array.isArray(query.historicalAliases)
    ? query.historicalAliases.filter(
        (alias): alias is string => typeof alias === 'string',
      )
    : [];
  const contextMatches =
    candidate.context.repositoryId === expectedRepositoryId ||
    candidate.historicalRepositoryIds.includes(expectedRepositoryId);
  const matchEvidenceValid =
    candidate.matchedBy === 'provenance'
      ? candidate.matchedProvenanceToken === query.provenanceToken
      : candidate.matchedBy === 'reserved-binding'
        ? candidate.matchedReservedBindingId === query.reservedBindingId
        : typeof candidate.matchedAlias === 'string' &&
          aliases.includes(candidate.matchedAlias) &&
          candidate.aliases.includes(candidate.matchedAlias);
  if (
    !candidate.stableId ||
    !candidate.stableIdentityVerified ||
    !candidate.contextVerified ||
    !contextMatches ||
    !matchEvidenceValid
  ) {
    return duplicateValidationResult(false, 'ambiguous', null, [
      'candidate-not-fully-verified',
    ]);
  }
  return duplicateValidationResult(
    true,
    'one-verified-match',
    candidate.stableId,
    [],
  );
}

export function planDiscussionRead(
  input: GitHubDiscussionReadPlanInput,
): SemanticAction {
  const capability = validateGitHubHostCapability(
    {
      operation: 'read-discussion',
      context: input.context,
      requiredFields: [],
    },
    input.hostCapability,
  );
  if (!capability.valid) {
    throw new Error('GitHub discussion read capability is unavailable.');
  }
  if (
    !input.stableId ||
    !Number.isInteger(input.limit) ||
    input.limit < 1 ||
    input.limit > 100 ||
    !validDiscussionCursor(input.cursor)
  ) {
    throw new Error('GitHub discussion read bounds are invalid.');
  }
  return {
    provider: 'github',
    operation: 'read-discussion',
    context: input.context,
    intent: {
      stableId: input.stableId,
      evidenceKind: input.evidenceKind,
      cursor: input.cursor,
      limit: input.limit,
      resultContract: {
        maxItems: input.limit,
        content: 'sanitized-non-persistent-evidence',
      },
      capabilityEvidenceDigest: input.hostCapability.evidenceDigest,
    },
  };
}

export function validateDiscussionReadObservation(
  input: GitHubDiscussionReadValidationInput,
): GitHubDiscussionReadValidationResult {
  if (
    input.action.provider !== 'github' ||
    input.action.operation !== 'read-discussion'
  ) {
    throw new Error(
      'GitHub discussion validation requires a discussion action.',
    );
  }
  const capability = validateGitHubHostCapability(
    {
      operation: 'read-discussion',
      context: input.action.context,
      requiredFields: [],
    },
    input.hostCapability,
  );
  if (!capability.valid) {
    return discussionResult('invalid', null, capability.reasons);
  }
  if (input.observation.availability !== 'available') {
    return discussionResult(input.observation.availability, null, [
      input.observation.availability,
    ]);
  }
  if (
    input.action.intent.capabilityEvidenceDigest !==
      input.hostCapability.evidenceDigest ||
    input.observation.provider !== 'github' ||
    !contextsEqual(input.action.context, input.observation.context) ||
    input.observation.capabilityEvidenceDigest !==
      input.action.intent.capabilityEvidenceDigest ||
    input.observation.stableId !== input.action.intent.stableId ||
    input.observation.requestedCursor !== input.action.intent.cursor
  ) {
    return discussionResult('invalid', null, [
      'discussion-context-or-cursor-mismatch',
    ]);
  }
  const contract = recordValue(
    input.action.intent.resultContract,
    'GitHub discussion result contract is missing.',
  );
  const maxItems = Number(contract.maxItems);
  if (
    !Number.isInteger(maxItems) ||
    input.observation.items.length > maxItems ||
    !validDiscussionCursor(input.observation.nextCursor)
  ) {
    return discussionResult('invalid', null, ['discussion-bound-exceeded']);
  }
  const items: NonNullable<
    GitHubDiscussionReadValidationResult['page']
  >['items'] = [];
  for (const item of input.observation.items) {
    if (
      !item.id ||
      item.id.length > 256 ||
      !['comment', 'activity'].includes(item.kind) ||
      typeof item.body !== 'string' ||
      Buffer.byteLength(item.body, 'utf8') > 16_384 ||
      !Number.isFinite(Date.parse(item.observedAt))
    ) {
      return discussionResult('invalid', null, ['discussion-item-invalid']);
    }
    const contentSuppressed = containsSensitiveContentSignal(item.body);
    items.push({
      id: item.id,
      kind: item.kind,
      body: contentSuppressed ? WHOLE_FIELD_SUPPRESSION_MARKER : item.body,
      observedAt: item.observedAt,
      contentSuppressed,
    });
  }
  return discussionResult(
    'page',
    { items, nextCursor: input.observation.nextCursor },
    [],
  );
}

export const githubAdapter: ProviderAdapter = {
  provider: 'github',
  normalize: normalizeGitHubIssueObservation,
  plan(operation, input) {
    if (['create', 'update', 'transition', 'annotate'].includes(operation)) {
      if (!isCompleteMutationInput(operation, input)) {
        throw new Error(
          'GitHub adapter requires complete GitHub mutation input.',
        );
      }
      return planGitHubMutation(input as unknown as GitHubMutationPlanInput);
    }
    const { context, ...intent } = input;
    if (operation === 'read') {
      if (
        !isProviderContext(context) ||
        typeof intent.stableId !== 'string' ||
        typeof intent.stableNodeId !== 'string' ||
        typeof intent.capabilityEvidenceDigest !== 'string'
      ) {
        throw new Error(
          'GitHub read plan requires pinned identity and capability.',
        );
      }
    }
    return {
      provider: 'github',
      operation,
      context: isProviderContext(context) ? context : {},
      intent,
    };
  },
  validateObservation(action, observation) {
    const hostCapability = parseHostCapability(
      observation.fields.hostCapability,
    );
    if (!hostCapability) {
      return { valid: false, reasons: ['capability-evidence-missing'] };
    }
    const capability = validateGitHubHostCapability(
      {
        operation: action.operation,
        context: action.context,
        requiredFields:
          action.operation === 'read' ? requiredFieldsForRead() : [],
      },
      hostCapability,
    );
    if (!capability.valid) return capability;
    if (
      typeof action.intent.capabilityEvidenceDigest === 'string' &&
      (observation.capabilityEvidenceDigest !==
        action.intent.capabilityEvidenceDigest ||
        hostCapability.evidenceDigest !==
          action.intent.capabilityEvidenceDigest)
    ) {
      return { valid: false, reasons: ['capability-evidence-mismatch'] };
    }
    return { valid: true, reasons: [] };
  },
  verificationFields(action) {
    return Object.keys(parsePostconditions(action.intent.postconditions));
  },
  verify(action, issue) {
    if (!validMutationActionEvidence(action)) {
      return this.verificationFields(action).map((field) => ({
        field,
        status: 'unavailable' as const,
      }));
    }
    const postconditions = parsePostconditions(action.intent.postconditions);
    return Object.entries(postconditions).map(([field, expected]) => {
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
            ? observed.includes(expected)
              ? 'verified'
              : 'mismatch'
            : observed === expected
              ? 'verified'
              : 'mismatch',
      } satisfies FieldVerification;
    });
  },
};

function requiredFieldsForRead(): GitHubSemanticField[] {
  return ['stable-identity', 'title', 'state', 'revision'];
}

function unavailableReadResult(
  classification: Extract<
    GitHubReadLifecycle,
    'inaccessible' | 'deleted' | 'temporarily-unavailable'
  >,
  reasons: string[],
): GitHubReadResult {
  return {
    classification,
    issue: null,
    freshness: null,
    preservePriorEvidence: true,
    reasons,
  };
}

function assertMutationIdentity(input: GitHubMutationPreviewInput): void {
  if (!input.bindingId)
    throw new Error('GitHub mutation requires a binding ID.');
  if (input.operation === 'create') {
    if (
      input.provenance?.bindingId !== input.bindingId ||
      !input.provenance.origin
    ) {
      throw new Error('GitHub create requires explicit binding provenance.');
    }
  } else if (!input.stableId) {
    throw new Error('GitHub mutation requires stable identity.');
  }
}

function mutationResult(
  classification: GitHubMutationVerificationClassification,
  reason: string,
  fields: FieldVerification[] = [],
): GitHubMutationVerificationResult {
  return { classification, reason, fields, retryAllowed: false };
}

function parsePostconditions(value: unknown): Record<string, string | null> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('GitHub mutation requires explicit postconditions.');
  }
  const entries = Object.entries(value);
  const allowed = new Set([
    'title',
    'description',
    'priority',
    'status',
    'annotation',
  ]);
  if (
    entries.length === 0 ||
    entries.some(
      ([field, expected]) =>
        !allowed.has(field) ||
        (expected !== null && typeof expected !== 'string'),
    )
  ) {
    throw new Error('GitHub mutation postconditions are unsupported.');
  }
  return Object.fromEntries(entries) as Record<string, string | null>;
}

function verifyMutationField(
  observation: SanitizedProviderObservation,
  field: string,
  expected: string | null,
): FieldVerification['status'] {
  const observed =
    field === 'description'
      ? observation.fields.body
      : field === 'status'
        ? observation.fields.state
        : field === 'annotation'
          ? observation.fields.annotations
          : observation.fields[field];
  if (field === 'annotation') {
    if (!Array.isArray(observed)) return 'unavailable';
    return observed.includes(expected) ? 'verified' : 'mismatch';
  }
  if (observed === undefined) return 'unavailable';
  return observed === expected ? 'verified' : 'mismatch';
}

function normalizeMutationFieldMask(
  operation: GitHubMutationPreviewInput['operation'],
  fieldMask: readonly GitHubMutationField[],
): GitHubMutationField[] {
  const fieldsByOperation: Record<
    GitHubMutationPreviewInput['operation'],
    GitHubMutationField[]
  > = {
    create: ['title', 'description', 'priority'],
    update: ['title', 'description', 'priority'],
    transition: ['status'],
    annotate: ['annotation'],
  };
  const ordered = fieldsByOperation[operation];
  const allowed = new Set<GitHubMutationField>(ordered);
  if (
    fieldMask.length === 0 ||
    new Set(fieldMask).size !== fieldMask.length ||
    fieldMask.some((field) => !allowed.has(field))
  ) {
    throw new Error('Unsupported GitHub mutation field.');
  }
  return ordered.filter((field) => fieldMask.includes(field));
}

function buildMutationProjection(
  input: GitHubMutationPreviewInput,
  fieldMask: readonly GitHubMutationField[],
): OutboundProjection {
  const projectionKeys = Object.keys(input.projection);
  if (
    projectionKeys.length !== fieldMask.length ||
    projectionKeys.some(
      (key) => !fieldMask.includes(key as GitHubMutationField),
    )
  ) {
    throw new Error(
      'GitHub mutation projection must exactly match its field mask.',
    );
  }
  const projection: OutboundProjection = {};
  if (fieldMask.includes('title')) {
    if (typeof input.projection.title !== 'string')
      throw new Error('GitHub title projection must be a string.');
    projection.title = input.projection.title;
  }
  if (fieldMask.includes('priority')) {
    if (
      input.projection.priority !== null &&
      !['low', 'medium', 'high', 'urgent'].includes(
        String(input.projection.priority),
      )
    ) {
      throw new Error('Unsupported GitHub priority.');
    }
    projection.priority = input.projection.priority;
  }
  if (fieldMask.includes('description')) {
    projection.description = buildDescriptionProjection(input);
  }
  if (fieldMask.includes('status')) {
    if (!['open', 'closed'].includes(String(input.projection.status))) {
      throw new Error('Unsupported GitHub status transition.');
    }
    projection.status = input.projection.status;
  }
  if (fieldMask.includes('annotation')) {
    if (
      typeof input.projection.annotation !== 'string' ||
      input.projection.annotation.length === 0
    ) {
      throw new Error('GitHub annotation projection must be text.');
    }
    projection.annotation = input.projection.annotation;
  }
  return projection;
}

function buildDescriptionProjection(
  input: GitHubMutationPreviewInput,
): string | null {
  if (input.descriptionMode === 'none') {
    throw new Error('GitHub description updates are disabled by policy.');
  }
  const description = input.projection.description;
  if (input.descriptionMode === 'replace') {
    if (description !== null && typeof description !== 'string') {
      throw new Error('GitHub description projection must be nullable text.');
    }
    return description ?? null;
  }
  if (typeof description !== 'string') {
    throw new Error('Managed GitHub description content must be text.');
  }
  const currentBody = input.currentBody ?? '';
  const inspection = inspectManagedMarkdown(currentBody, input.bindingId);
  const update =
    inspection.status === 'absent'
      ? insertManagedMarkdown(currentBody, input.bindingId, description)
      : inspection.status === 'managed'
        ? replaceManagedMarkdown(currentBody, input.bindingId, description)
        : inspection;
  if (update.status !== 'updated') {
    throw new Error(`GitHub managed body requires choice: ${update.reason}.`);
  }
  return update.body;
}

function isCompleteMutationInput(
  operation: SemanticOperation,
  input: Record<string, unknown>,
): boolean {
  return (
    ['create', 'update', 'transition', 'annotate'].includes(operation) &&
    input.operation === operation &&
    isProviderContext(input.context) &&
    typeof input.bindingId === 'string' &&
    Array.isArray(input.fieldMask) &&
    !!input.projection &&
    typeof input.projection === 'object' &&
    !!input.outboundSafety &&
    typeof input.outboundSafety === 'object' &&
    !!input.hostCapability &&
    typeof input.hostCapability === 'object' &&
    !!input.publicationSafety &&
    typeof input.publicationSafety === 'object' &&
    typeof input.approvedPreviewDigest === 'string'
  );
}

function validMutationActionEvidence(action: SemanticAction): boolean {
  try {
    const fieldMask = action.intent.fieldMask;
    const projection = recordValue(
      action.intent.projection,
      'GitHub action projection is missing.',
    );
    const postconditions = recordValue(
      action.intent.postconditions,
      'GitHub action postconditions are missing.',
    );
    const execution = recordValue(
      action.intent.executionEvidence,
      'GitHub action execution evidence is missing.',
    );
    if (
      !['create', 'update', 'transition', 'annotate'].includes(
        action.operation,
      ) ||
      typeof action.intent.bindingId !== 'string'
    ) {
      return false;
    }
    const operation =
      action.operation as GitHubMutationPreviewInput['operation'];
    const normalizedMask = normalizeMutationFieldMask(
      operation,
      fieldMask as GitHubMutationField[],
    );
    if (
      !semanticValuesEqual(normalizedMask, fieldMask) ||
      !semanticValuesEqual(Object.keys(projection), fieldMask)
    ) {
      return false;
    }
    if (operation === 'create') {
      const provenance = recordValue(
        action.intent.provenance,
        'GitHub create provenance is missing.',
      );
      if (
        action.intent.stableId !== null ||
        provenance.bindingId !== action.intent.bindingId ||
        typeof provenance.origin !== 'string' ||
        provenance.origin.length === 0
      ) {
        return false;
      }
    } else if (typeof action.intent.stableId !== 'string') {
      return false;
    }
    parsePostconditions(postconditions);
    if (
      !Array.isArray(fieldMask) ||
      !semanticValuesEqual(projection, postconditions) ||
      action.intent.previewDigest !== action.intent.approvalDigest ||
      action.intent.previewDigest !== execution.previewDigest ||
      action.intent.approvalDigest !== execution.approvalDigest ||
      action.intent.actionDigest !== execution.actionDigest ||
      action.intent.capabilityEvidenceDigest !==
        execution.capabilityEvidenceDigest
    ) {
      return false;
    }
    const outboundSafety = recordValue(
      action.intent.outboundSafety,
      'GitHub outbound evidence is missing.',
    );
    const publicationSafety = recordValue(
      action.intent.publicationSafety,
      'GitHub publication evidence is missing.',
    );
    if (
      outboundSafety.projectionDigest !== execution.projectionDigest ||
      outboundSafety.resultDigest !== execution.outboundSafetyResultDigest ||
      publicationSafety.resultDigest !==
        execution.publicationSafetyResultDigest ||
      publicationSafety.visibilityEvidenceDigest !==
        execution.visibilityEvidenceDigest ||
      semanticDigest(projection) !== execution.projectionDigest
    ) {
      return false;
    }
    const executionBase = {
      capabilityEvidenceDigest: execution.capabilityEvidenceDigest,
      projectionDigest: execution.projectionDigest,
      outboundSafetyResultDigest: execution.outboundSafetyResultDigest,
      publicationSafetyResultDigest: execution.publicationSafetyResultDigest,
      visibilityEvidenceDigest: execution.visibilityEvidenceDigest,
    };
    const expectedPreview = semanticDigest({
      provider: 'github',
      operation: action.operation,
      context: action.context,
      bindingId: action.intent.bindingId,
      stableId: action.intent.stableId,
      provenance: action.intent.provenance,
      fieldMask,
      projection,
      postconditions,
      executionEvidence: executionBase,
    });
    if (expectedPreview !== action.intent.previewDigest) return false;
    return (
      semanticDigest({
        provider: 'github',
        operation: action.operation,
        context: action.context,
        previewDigest: action.intent.previewDigest,
        approvalDigest: action.intent.approvalDigest,
        executionEvidence: executionBase,
      }) === action.intent.actionDigest
    );
  } catch {
    return false;
  }
}

function observationIdentityMatches(
  declared: string,
  canonical: string,
  nodeId: string,
): boolean {
  return declared === canonical || declared === nodeId;
}

function canonicalGitHubStableId(host: string, nodeId: string): string {
  return `github:${host.toLowerCase()}:${nodeId}`;
}

function validTransferEvidence(
  value: unknown,
  stableId: string,
  fromRepositoryId: string,
  toRepositoryId: string | undefined,
  capabilityEvidenceDigest: string,
  observedAt: string,
): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const evidence = value as Record<string, unknown>;
  if (
    evidence.provider !== 'github' ||
    evidence.stableId !== stableId ||
    evidence.fromRepositoryId !== fromRepositoryId ||
    evidence.toRepositoryId !== toRepositoryId ||
    evidence.capabilityEvidenceDigest !== capabilityEvidenceDigest ||
    evidence.observedAt !== observedAt
  ) {
    return false;
  }
  const { evidenceDigest, ...content } = evidence;
  return evidenceDigest === semanticDigest(content);
}

function validDeletionEvidence(
  value: GitHubReadObservationInput['deletionEvidence'],
  action: SemanticAction,
  capabilityEvidenceDigest: string,
): boolean {
  if (!value || value.provider !== 'github') return false;
  if (
    value.stableId !== action.intent.stableId ||
    !contextsEqual(value.context, action.context) ||
    value.capabilityEvidenceDigest !== capabilityEvidenceDigest ||
    !Number.isFinite(Date.parse(value.observedAt))
  ) {
    return false;
  }
  return (
    semanticDigest({
      provider: value.provider,
      stableId: value.stableId,
      context: value.context,
      capabilityEvidenceDigest: value.capabilityEvidenceDigest,
      observedAt: value.observedAt,
    }) === value.evidenceDigest
  );
}

function semanticValuesEqual(left: unknown, right: unknown): boolean {
  if (left === undefined || right === undefined) return false;
  try {
    return semanticDigest(left) === semanticDigest(right);
  } catch {
    return false;
  }
}

function isProviderContext(value: unknown): value is ProviderContext {
  return (
    !!value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.values(value).every(
      (entry) => entry === undefined || typeof entry === 'string',
    )
  );
}

function parseHostCapability(
  value: unknown,
): GitHubHostCapabilityObservation | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const candidate = value as Partial<GitHubHostCapabilityObservation>;
  if (
    candidate.provider !== 'github' ||
    !isProviderContext(candidate.context) ||
    ![
      'available',
      'unavailable',
      'authorization-required',
      'rate-limited',
    ].includes(String(candidate.availability)) ||
    typeof candidate.accountId !== 'string' ||
    typeof candidate.repositoryId !== 'string' ||
    !Array.isArray(candidate.operations) ||
    !Array.isArray(candidate.observableFields) ||
    typeof candidate.evidenceDigest !== 'string'
  ) {
    return null;
  }
  return candidate as GitHubHostCapabilityObservation;
}

function assertGitHubObservation(
  observation: SanitizedProviderObservation,
): void {
  if (observation.provider !== 'github') {
    throw new Error('GitHub adapter requires a GitHub observation.');
  }
}

function requiredContext(
  observation: SanitizedProviderObservation,
  key: string,
): string {
  const value = observation.context[key];
  if (!value) throw new Error(`GitHub context requires '${key}'.`);
  return value;
}

function requiredContextValue(context: ProviderContext, key: string): string {
  const value = context[key];
  if (!value) throw new Error(`GitHub context requires '${key}'.`);
  return value;
}

function duplicateValidationResult(
  accepted: boolean,
  classification: GitHubDuplicateSearchValidationResult['classification'],
  stableId: string | null,
  reasons: string[],
): GitHubDuplicateSearchValidationResult {
  return { accepted, classification, stableId, reasons };
}

function recordValue(value: unknown, message: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(message);
  }
  return value as Record<string, unknown>;
}

function validDiscussionCursor(cursor: string | null): boolean {
  return (
    cursor === null ||
    (cursor.length > 0 &&
      cursor.length <= 512 &&
      [...cursor].every((character) => {
        const code = character.charCodeAt(0);
        return code >= 32 && code !== 127;
      }))
  );
}

function discussionResult(
  classification: GitHubDiscussionReadValidationResult['classification'],
  page: GitHubDiscussionReadValidationResult['page'],
  reasons: string[],
): GitHubDiscussionReadValidationResult {
  return { classification, page, persistable: false, reasons };
}

function requiredString(fields: Record<string, unknown>, key: string): string {
  const value = fields[key];
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`GitHub observation requires string field '${key}'.`);
  }
  return value;
}

function nullableString(
  fields: Record<string, unknown>,
  key: string,
): string | null {
  const value = fields[key];
  if (value === null) return null;
  if (typeof value !== 'string') {
    throw new Error(`GitHub observation requires nullable string '${key}'.`);
  }
  return value;
}

function requiredPositiveInteger(
  fields: Record<string, unknown>,
  key: string,
): number {
  const value = fields[key];
  if (!Number.isSafeInteger(value) || Number(value) <= 0) {
    throw new Error(`GitHub observation requires positive integer '${key}'.`);
  }
  return Number(value);
}

function uniqueStrings(value: unknown): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new Error('GitHub aliases and pull requests must be string arrays.');
  }
  return [...new Set(value)];
}

function optionalStringArray(value: unknown): string[] {
  return value === undefined ? [] : uniqueStrings(value);
}
