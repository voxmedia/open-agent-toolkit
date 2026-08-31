import { containsSensitiveContentSignal } from './credential-safety';
import {
  MAX_PROVIDER_EXTENSION_BYTES,
  RemoteSnapshotRecordSchema,
  WHOLE_FIELD_SUPPRESSION_MARKER,
  type RemoteSnapshotRecord,
} from './schema';

export interface SanitizableRemoteSnapshot {
  snapshotId: string;
  bindingId: string;
  provider: RemoteSnapshotRecord['provider'];
  observedAt: string;
  observedBy: RemoteSnapshotRecord['observedBy'];
  identity: RemoteSnapshotRecord['identity'];
  revision: RemoteSnapshotRecord['revision'];
  issue: {
    title: string;
    description: string;
    priority: string | null;
    status: string;
    [key: string]: unknown;
  };
  lifecycle: RemoteSnapshotRecord['lifecycle'];
  extensions?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface SnapshotSanitizationOptions {
  allowedExtensionKeys?: readonly string[];
}

const MAX_ALLOWED_EXTENSION_KEYS = 64;
const SCHEMA_SAFE_EXTENSION_KEY = /^[A-Za-z][A-Za-z0-9_-]{0,63}$/;

type SnapshotRedaction = RemoteSnapshotRecord['redactions'][number];
type CoreSnapshotField = Extract<
  SnapshotRedaction['field'],
  { kind: 'core' }
>['name'];

export function sanitizeRemoteSnapshot(
  input: SanitizableRemoteSnapshot,
  options: SnapshotSanitizationOptions = {},
): RemoteSnapshotRecord {
  const redactions: RemoteSnapshotRecord['redactions'] = [];
  const issue = {
    title: sanitizeCoreField('title', input.issue.title, redactions),
    description: sanitizeCoreField(
      'description',
      input.issue.description,
      redactions,
    ),
    priority:
      input.issue.priority === null
        ? null
        : sanitizeCoreField('priority', input.issue.priority, redactions),
    status: sanitizeCoreField('status', input.issue.status, redactions),
  };

  const extensions = sanitizeExtensions(
    input.provider,
    input.extensions,
    options.allowedExtensionKeys ?? [],
    redactions,
  );

  return RemoteSnapshotRecordSchema.parse({
    recordType: 'snapshot',
    schemaVersion: 1,
    snapshotId: input.snapshotId,
    bindingId: input.bindingId,
    provider: input.provider,
    observedAt: input.observedAt,
    observedBy: input.observedBy,
    identity: input.identity,
    revision: input.revision,
    issue,
    lifecycle: input.lifecycle,
    contentRedacted: redactions.length > 0,
    redactionCount: redactions.length,
    redactions,
    extensions,
  });
}

function sanitizeCoreField(
  field: CoreSnapshotField,
  value: string,
  redactions: RemoteSnapshotRecord['redactions'],
): string {
  if (!containsSensitiveContentSignal(value)) return value;

  redactions.push({
    field: { kind: 'core', name: field },
    reason: 'sensitive-content',
    representation: 'whole-field-marker',
  });
  return WHOLE_FIELD_SUPPRESSION_MARKER;
}

function sanitizeExtensions(
  provider: RemoteSnapshotRecord['provider'],
  extensions: Record<string, unknown> | undefined,
  allowedKeys: readonly string[],
  redactions: RemoteSnapshotRecord['redactions'],
): RemoteSnapshotRecord['extensions'] {
  validateExtensionAllowlist(allowedKeys);
  if (!extensions || allowedKeys.length === 0) return undefined;

  const retained: Record<string, unknown> = {};
  for (const key of allowedKeys) {
    if (!Object.hasOwn(extensions, key)) continue;

    const value = extensions[key];
    if (containsSensitiveExtensionContent(value)) {
      retained[key] = WHOLE_FIELD_SUPPRESSION_MARKER;
      redactions.push({
        field: { kind: 'extension', key },
        reason: 'sensitive-content',
        representation: 'whole-field-marker',
      });
      continue;
    }
    retained[key] = value;
  }

  if (Object.keys(retained).length === 0) return undefined;
  const result = { [provider]: retained };
  if (
    Buffer.byteLength(JSON.stringify(result), 'utf8') >
    MAX_PROVIDER_EXTENSION_BYTES
  ) {
    throw new Error(
      `Provider extension exceeds ${MAX_PROVIDER_EXTENSION_BYTES} byte limit.`,
    );
  }
  return result;
}

function validateExtensionAllowlist(allowedKeys: readonly string[]): void {
  if (
    allowedKeys.length > MAX_ALLOWED_EXTENSION_KEYS ||
    new Set(allowedKeys).size !== allowedKeys.length ||
    allowedKeys.some((key) => !SCHEMA_SAFE_EXTENSION_KEY.test(key))
  ) {
    throw new Error(
      'Adapter extension keys must be unique, bounded, and schema-safe.',
    );
  }
}

function containsSensitiveExtensionContent(value: unknown): boolean {
  if (typeof value === 'string') {
    return containsSensitiveContentSignal(value);
  }
  if (Array.isArray(value)) {
    return value.some((entry) => containsSensitiveExtensionContent(entry));
  }
  if (value && typeof value === 'object') {
    return Object.entries(value).some(
      ([key, entry]) =>
        containsSensitiveContentSignal(key) ||
        containsSensitiveExtensionContent(entry),
    );
  }
  return false;
}
