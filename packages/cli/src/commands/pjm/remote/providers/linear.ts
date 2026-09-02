import { containsSensitiveContentSignal } from '@commands/pjm/remote/credential-safety';
import {
  semanticDigest,
  type NormalizedRemoteIssue,
  type SanitizedProviderObservation,
} from '@commands/pjm/remote/provider';
import { WHOLE_FIELD_SUPPRESSION_MARKER } from '@commands/pjm/remote/schema';

export interface LinearIssueReference {
  host?: string;
  identifier: string;
  alias: string;
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

function canonicalLinearStableId(workspaceId: string, uuid: string): string {
  return `linear:${workspaceId}:${uuid.toLowerCase()}`;
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
