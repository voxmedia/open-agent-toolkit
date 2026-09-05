import { containsSensitiveContentSignal } from '@commands/pjm/remote/credential-safety';
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

export const jiraAdapter: ProviderAdapter = {
  provider: 'jira',
  normalize: normalizeJiraIssueObservation,
  plan(
    operation: SemanticOperation,
    input: Record<string, unknown>,
  ): SemanticAction {
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
    return {
      provider: 'jira',
      operation,
      context: (input.context ?? {}) as ProviderContext,
      intent: input,
    };
  },
  validateObservation(action, observation): ObservationValidation {
    const reasons: string[] = [];
    if (action.provider !== 'jira' || observation.provider !== 'jira')
      reasons.push('provider-mismatch');
    if (!contextsEqual(action.context, observation.context))
      reasons.push('context-mismatch');
    return { valid: reasons.length === 0, reasons };
  },
  verificationFields(action): string[] {
    return action.operation === 'read' ? ['stable-identity'] : [];
  },
  verify(action, issue): FieldVerification[] {
    return this.verificationFields(action).map((field) => ({
      field,
      status:
        issue.provider === 'jira' &&
        contextsEqual(action.context, issue.context)
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
