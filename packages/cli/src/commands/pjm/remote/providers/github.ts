import {
  semanticDigest,
  type NormalizedRemoteIssue,
  type ProviderAdapter,
  type SanitizedProviderObservation,
} from '@commands/pjm/remote/provider';

export interface GitHubIssueReference {
  host?: string;
  owner: string;
  name: string;
  number: number;
  alias: string;
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

export const githubAdapter: ProviderAdapter = {
  provider: 'github',
  normalize: normalizeGitHubIssueObservation,
  plan(operation, input) {
    return { provider: 'github', operation, context: {}, intent: input };
  },
  validateObservation() {
    return { valid: true, reasons: [] };
  },
  verificationFields() {
    return [];
  },
  verify() {
    return [];
  },
};

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
