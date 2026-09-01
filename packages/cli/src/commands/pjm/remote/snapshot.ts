import {
  containsSensitiveContentSignal,
  containsSensitiveContentSignalInValue,
} from './credential-safety';
import {
  MAX_PROVIDER_EXTENSION_BYTES,
  MAX_SNAPSHOT_SUPPRESSION_EVIDENCE,
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
  suppressedCoreFields?: readonly CoreSnapshotField[];
  suppressedFields?: readonly SnapshotRedaction['field'][];
}

const CORE_SNAPSHOT_FIELD_COUNT = 4;
const MAX_ALLOWED_EXTENSION_KEYS =
  MAX_SNAPSHOT_SUPPRESSION_EVIDENCE - CORE_SNAPSHOT_FIELD_COUNT;
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
  const pairedSuppression = validateSuppressedFieldReferences(
    options.suppressedFields ?? [],
    options.allowedExtensionKeys ?? [],
  );
  const suppressedCoreFields = validateSuppressedCoreFields([
    ...(options.suppressedCoreFields ?? []),
    ...pairedSuppression.core,
  ]);
  const issue = {
    title: sanitizeCoreField(
      'title',
      input.issue.title,
      redactions,
      suppressedCoreFields,
    ),
    description: sanitizeCoreField(
      'description',
      input.issue.description,
      redactions,
      suppressedCoreFields,
    ),
    priority:
      input.issue.priority === null
        ? null
        : sanitizeCoreField(
            'priority',
            input.issue.priority,
            redactions,
            suppressedCoreFields,
          ),
    status: sanitizeCoreField(
      'status',
      input.issue.status,
      redactions,
      suppressedCoreFields,
    ),
  };

  const extensions = sanitizeExtensions(
    input.provider,
    input.extensions,
    options.allowedExtensionKeys ?? [],
    redactions,
    pairedSuppression.extensions,
  );

  return RemoteSnapshotRecordSchema.parse({
    recordType: 'snapshot',
    schemaVersion: 2,
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
  suppressedCoreFields: ReadonlySet<CoreSnapshotField>,
): string {
  if (suppressedCoreFields.has(field)) {
    if (value !== WHOLE_FIELD_SUPPRESSION_MARKER) {
      throw new Error(
        `Suppressed snapshot field '${field}' must contain only the suppression marker.`,
      );
    }
    redactions.push({
      field: { kind: 'core', name: field },
      reason: 'sensitive-content',
      representation: 'whole-field-marker',
    });
    return value;
  }
  if (!containsSensitiveContentSignal(value)) return value;

  redactions.push({
    field: { kind: 'core', name: field },
    reason: 'sensitive-content',
    representation: 'whole-field-marker',
  });
  return WHOLE_FIELD_SUPPRESSION_MARKER;
}

function validateSuppressedCoreFields(
  fields: readonly CoreSnapshotField[],
): ReadonlySet<CoreSnapshotField> {
  const allowed = new Set<CoreSnapshotField>([
    'title',
    'description',
    'priority',
    'status',
  ]);
  if (
    fields.length > CORE_SNAPSHOT_FIELD_COUNT ||
    new Set(fields).size !== fields.length ||
    fields.some((field) => !allowed.has(field))
  ) {
    throw new Error(
      'Suppressed snapshot fields must be unique bounded core fields.',
    );
  }
  return new Set(fields);
}

function validateSuppressedFieldReferences(
  fields: readonly SnapshotRedaction['field'][],
  allowedExtensionKeys: readonly string[],
): { core: CoreSnapshotField[]; extensions: Set<string> } {
  if (fields.length > MAX_SNAPSHOT_SUPPRESSION_EVIDENCE) {
    throw new Error('Suppression evidence exceeds the bounded field limit.');
  }
  const identities = fields.map((field) =>
    field.kind === 'core' ? `core:${field.name}` : `extension:${field.key}`,
  );
  if (new Set(identities).size !== identities.length) {
    throw new Error('Suppression evidence must consume each field once.');
  }
  const allowed = new Set(allowedExtensionKeys);
  const extensions = fields.flatMap((field) =>
    field.kind === 'extension' ? [field.key] : [],
  );
  if (extensions.some((key) => !allowed.has(key))) {
    throw new Error(
      'Suppressed adapter extensions must be present in the adapter allowlist.',
    );
  }
  return {
    core: fields.flatMap((field) =>
      field.kind === 'core' ? [field.name] : [],
    ),
    extensions: new Set(extensions),
  };
}

function sanitizeExtensions(
  provider: RemoteSnapshotRecord['provider'],
  extensions: Record<string, unknown> | undefined,
  allowedKeys: readonly string[],
  redactions: RemoteSnapshotRecord['redactions'],
  suppressedExtensions: ReadonlySet<string>,
): RemoteSnapshotRecord['extensions'] {
  validateExtensionAllowlist(allowedKeys);
  if (!extensions || allowedKeys.length === 0) return undefined;

  const retained: Record<string, unknown> = {};
  for (const key of allowedKeys) {
    if (!Object.hasOwn(extensions, key)) continue;

    const value = extensions[key];
    if (suppressedExtensions.has(key)) {
      if (value !== WHOLE_FIELD_SUPPRESSION_MARKER) {
        throw new Error(
          `Suppressed adapter extension '${key}' must contain only the suppression marker.`,
        );
      }
      retained[key] = value;
      redactions.push({
        field: { kind: 'extension', key },
        reason: 'sensitive-content',
        representation: 'whole-field-marker',
      });
      continue;
    }
    if (containsSensitiveContentSignalInValue(value)) {
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
