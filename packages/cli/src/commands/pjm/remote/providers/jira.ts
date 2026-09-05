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

const ISSUE_KEY = /^[A-Z][A-Z0-9_]*-[1-9][0-9]*$/;
const ISSUE_ID = /^[1-9][0-9]*$/;
const URL_REFERENCE =
  /^https:\/\/([^/]+)\/browse\/([A-Z][A-Z0-9_]*-[1-9][0-9]*)(?:[?#].*)?$/;
const JIRA_EXTENSION_KEYS = ['issueType', 'priorityId', 'statusId'] as const;

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

export const jiraAdapter: ProviderAdapter = {
  provider: 'jira',
  normalize: normalizeJiraIssueObservation,
  plan(
    operation: SemanticOperation,
    input: Record<string, unknown>,
  ): SemanticAction {
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
