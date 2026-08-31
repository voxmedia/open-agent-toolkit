import { createHash } from 'node:crypto';

export type RemoteProvider = 'github' | 'linear' | 'jira';
export type SemanticOperation =
  | 'read'
  | 'read-discussion'
  | 'search-duplicates'
  | 'create'
  | 'update'
  | 'transition'
  | 'annotate';

export interface ProviderContext {
  readonly [key: string]: string | undefined;
}

export interface SanitizedProviderObservation {
  provider: RemoteProvider;
  context: ProviderContext;
  identity: { stableId: string; aliases: string[] };
  fields: Record<string, unknown>;
  revision: { token?: string; updatedAt?: string; contentDigest: string };
  capabilityEvidenceDigest: string;
}

export interface NormalizedRemoteIssue {
  provider: RemoteProvider;
  context: ProviderContext;
  stableId: string;
  aliases: string[];
  title: string;
  description: string | null;
  priority: string | null;
  status: string;
  revisionDigest: string;
  extensions: Record<string, unknown>;
}

export interface SemanticAction {
  provider: RemoteProvider;
  operation: SemanticOperation;
  context: ProviderContext;
  intent: Record<string, unknown>;
}

export interface ObservationValidation {
  valid: boolean;
  reasons: string[];
}

export interface FieldVerification {
  field: string;
  status: 'verified' | 'mismatch' | 'unavailable';
}

export interface ProviderAdapter {
  readonly provider: RemoteProvider;
  normalize(observation: SanitizedProviderObservation): NormalizedRemoteIssue;
  plan(
    operation: SemanticOperation,
    input: Record<string, unknown>,
  ): SemanticAction;
  validateObservation(
    action: SemanticAction,
    observation: SanitizedProviderObservation,
  ): ObservationValidation;
  verificationFields(action: SemanticAction): string[];
  verify(
    action: SemanticAction,
    issue: NormalizedRemoteIssue,
  ): FieldVerification[];
}

export function semanticDigest(value: unknown): string {
  return `sha256:${createHash('sha256').update(canonicalJson(value)).digest('hex')}`;
}

export function contextsEqual(
  left: ProviderContext,
  right: ProviderContext,
): boolean {
  return canonicalJson(left) === canonicalJson(right);
}

function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

function canonicalize(value: unknown): unknown {
  if (value === null || ['string', 'boolean'].includes(typeof value))
    return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value))
      throw new Error('Semantic values must be finite.');
    return value;
  }
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, entry]) => entry !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, canonicalize(entry)]),
    );
  }
  throw new Error(`Unsupported semantic value '${typeof value}'.`);
}
