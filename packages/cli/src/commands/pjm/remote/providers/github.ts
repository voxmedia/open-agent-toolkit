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
  authoritativeDeletion?: boolean;
  deletionEvidenceDigest?: string;
}

export type GitHubMutationField = 'title' | 'description' | 'priority';

export interface GitHubMutationPlanInput {
  operation: 'create' | 'update';
  context: ProviderContext;
  bindingId: string;
  stableId?: string;
  provenance?: { bindingId: string; origin: string };
  fieldMask: GitHubMutationField[];
  descriptionMode: 'managed-section' | 'replace' | 'none';
  currentBody?: string;
  projection: OutboundProjection;
  outboundSafety: OutboundProjectionSafetyResult;
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
  stableIdentityVerified: boolean;
  contextVerified: boolean;
  historicalRepositoryIds: string[];
}

export interface GitHubDuplicateSearchObservation {
  provider: 'github';
  context: ProviderContext;
  availability: 'available' | 'unavailable';
  capabilityEvidenceDigest: string;
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
  const currentShortAlias = `${owner}/${name}#${number}`;

  return {
    provider: 'github',
    context: observation.context,
    stableId: `github:${host}:${repositoryId}:${nodeId}`,
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
    extensions: { databaseId, nodeId, pullRequests },
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
  if (input.outcome === 'temporary-failure') {
    return unavailableReadResult('temporarily-unavailable', [
      'temporary-host-failure',
    ]);
  }
  if (input.outcome === 'not-found') {
    const deleted =
      input.authoritativeDeletion === true && !!input.deletionEvidenceDigest;
    return unavailableReadResult(deleted ? 'deleted' : 'inaccessible', [
      deleted ? 'authoritative-deletion' : 'absence-not-authoritative',
    ]);
  }
  if (!input.observation) {
    return unavailableReadResult('temporarily-unavailable', [
      'read-observation-missing',
    ]);
  }

  const issue = normalizeGitHubIssueObservation(input.observation);
  const expectedNodeId = input.action.intent.stableNodeId;
  if (
    typeof expectedNodeId === 'string' &&
    input.observation.fields.nodeId !== expectedNodeId
  ) {
    return unavailableReadResult('inaccessible', ['stable-identity-mismatch']);
  }
  const expectedRepositoryId = input.action.context.repositoryId;
  const observedRepositoryId = input.observation.context.repositoryId;
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

export function planGitHubMutation(
  input: GitHubMutationPlanInput,
): SemanticAction {
  assertMutationIdentity(input);
  const fieldMask = normalizeMutationFieldMask(input.fieldMask);
  const projection = buildMutationProjection(input, fieldMask);
  requireCurrentOutboundSafety(projection, input.outboundSafety);
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
      outboundSafety: {
        projectionDigest: input.outboundSafety.projectionDigest,
        resultDigest: input.outboundSafety.resultDigest,
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
  const stableId = input.action.intent.stableId;
  if (
    typeof stableId === 'string' &&
    stableId !== input.readback.identity.stableId &&
    stableId !== normalizeGitHubIssueObservation(input.readback).stableId
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
  return {
    provider: 'github',
    operation: 'search-duplicates',
    context: input.context,
    intent: {
      query: {
        provenanceToken: input.provenanceToken,
        reservedBindingId: input.reservedBindingId,
        historicalAliases: uniqueStrings(input.historicalAliases),
        repository: {
          host: requiredContextValue(input.context, 'host'),
          repositoryId: requiredContextValue(input.context, 'repositoryId'),
          owner: requiredContextValue(input.context, 'owner'),
          name: requiredContextValue(input.context, 'name'),
        },
      },
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
    input.observation.provider !== 'github' ||
    !contextsEqual(input.action.context, input.observation.context) ||
    input.observation.capabilityEvidenceDigest !==
      input.hostCapability.evidenceDigest
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
    candidate.matchedBy !== 'alias' ||
    candidate.aliases.some((alias) => aliases.includes(alias));
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

export const githubAdapter: ProviderAdapter = {
  provider: 'github',
  normalize: normalizeGitHubIssueObservation,
  plan(operation, input) {
    const { context, ...intent } = input;
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
    return validateGitHubHostCapability(
      {
        operation: action.operation,
        context: action.context,
        requiredFields:
          action.operation === 'read' ? requiredFieldsForRead() : [],
      },
      hostCapability,
    );
  },
  verificationFields() {
    return [];
  },
  verify() {
    return [];
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

function assertMutationIdentity(input: GitHubMutationPlanInput): void {
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
    throw new Error('GitHub update requires stable identity.');
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
  fieldMask: readonly GitHubMutationField[],
): GitHubMutationField[] {
  const allowed = new Set<GitHubMutationField>([
    'title',
    'description',
    'priority',
  ]);
  if (
    fieldMask.length === 0 ||
    new Set(fieldMask).size !== fieldMask.length ||
    fieldMask.some((field) => !allowed.has(field))
  ) {
    throw new Error('Unsupported GitHub mutation field.');
  }
  return ['title', 'description', 'priority'].filter((field) =>
    fieldMask.includes(field as GitHubMutationField),
  ) as GitHubMutationField[];
}

function buildMutationProjection(
  input: GitHubMutationPlanInput,
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
  return projection;
}

function buildDescriptionProjection(
  input: GitHubMutationPlanInput,
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
