import {
  MAX_PROVIDER_EXTENSION_BYTES,
  MAX_REMOTE_DESCRIPTION_BYTES,
  RemoteSnapshotRecordSchema,
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

const QUOTED_CREDENTIAL_ASSIGNMENT =
  /(^|[\s{,[])(["']?)(password|passwd|api[_-]?key|access[_-]?token|secret|token|authorization)\2(\s*[:=]\s*)(["'])(.*?)\5/gim;
const CREDENTIAL_ASSIGNMENT =
  /(^|[\s{,[])(["']?)(password|passwd|api[_-]?key|access[_-]?token|secret|token|authorization)\2(\s*[:=]\s*)([^\s,;}]+)/gim;
const AUTHORIZATION_HEADER =
  /(\bAuthorization\s*:\s*(?:Bearer|Basic)\s+)([^\s]+)/gi;
const STANDALONE_CREDENTIAL =
  /\b(?:github_pat_[A-Za-z0-9_]{20,}|gh[pousr]_[A-Za-z0-9]{20,}|sk-[A-Za-z0-9_-]{20,}|AKIA[A-Z0-9]{16})\b/g;
const CREDENTIAL_KEY =
  /^(?:authorization|password|passwd|api[_-]?key|access[_-]?token|secret|token)$/i;
const REDACTION_MARKER = '[REDACTED:CREDENTIAL]';

export function sanitizeRemoteSnapshot(
  input: SanitizableRemoteSnapshot,
  options: SnapshotSanitizationOptions = {},
): RemoteSnapshotRecord {
  const descriptionBytes = Buffer.byteLength(input.issue.description, 'utf8');
  if (descriptionBytes > MAX_REMOTE_DESCRIPTION_BYTES) {
    throw new Error(
      `Remote description exceeds ${MAX_REMOTE_DESCRIPTION_BYTES} byte limit.`,
    );
  }

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

  const extensionResult = sanitizeExtensions(
    input.provider,
    input.extensions,
    options.allowedExtensionKeys ?? [],
  );
  const contentRedacted = redactions.length > 0 || extensionResult.redacted;

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
    contentRedacted,
    redactionCount: redactions.length,
    redactions,
    extensions: extensionResult.value,
  });
}

function sanitizeCoreField(
  field: RemoteSnapshotRecord['redactions'][number]['field'],
  value: string,
  redactions: RemoteSnapshotRecord['redactions'],
): string {
  const sanitized = redactCredentials(value);
  if (sanitized !== value) {
    redactions.push({ field, reason: 'credential' });
  }
  return sanitized;
}

function sanitizeExtensions(
  provider: RemoteSnapshotRecord['provider'],
  extensions: Record<string, unknown> | undefined,
  allowedKeys: readonly string[],
): {
  value: RemoteSnapshotRecord['extensions'];
  redacted: boolean;
} {
  if (!extensions || allowedKeys.length === 0) {
    return { value: undefined, redacted: false };
  }

  const selected = Object.fromEntries(
    allowedKeys
      .filter((key) => Object.hasOwn(extensions, key))
      .map((key) => [key, extensions[key]]),
  );
  if (
    Buffer.byteLength(JSON.stringify(selected), 'utf8') >
    MAX_PROVIDER_EXTENSION_BYTES
  ) {
    throw new Error(
      `Provider extension exceeds ${MAX_PROVIDER_EXTENSION_BYTES} byte limit.`,
    );
  }

  let redacted = false;
  const retained: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(selected)) {
    if (containsCredential(value, key)) {
      redacted = true;
      continue;
    }
    retained[key] = value;
  }

  if (Object.keys(retained).length === 0) {
    return { value: undefined, redacted };
  }
  return { value: { [provider]: retained }, redacted };
}

function redactCredentials(value: string): string {
  return value
    .replace(
      QUOTED_CREDENTIAL_ASSIGNMENT,
      (
        _match,
        leading: string,
        keyQuote: string,
        name: string,
        operator: string,
        valueQuote: string,
      ) =>
        `${leading}${keyQuote}${name}${keyQuote}${operator}${valueQuote}${REDACTION_MARKER}${valueQuote}`,
    )
    .replace(
      AUTHORIZATION_HEADER,
      (_match, prefix: string) => `${prefix}${REDACTION_MARKER}`,
    )
    .replace(
      CREDENTIAL_ASSIGNMENT,
      (
        _match,
        leading: string,
        keyQuote: string,
        name: string,
        operator: string,
      ) =>
        `${leading}${keyQuote}${name}${keyQuote}${operator}${REDACTION_MARKER}`,
    )
    .replace(STANDALONE_CREDENTIAL, REDACTION_MARKER);
}

function containsCredential(value: unknown, key?: string): boolean {
  if (key && CREDENTIAL_KEY.test(key)) return true;
  if (typeof value === 'string') return redactCredentials(value) !== value;
  if (Array.isArray(value)) {
    return value.some((entry) => containsCredential(entry));
  }
  if (value && typeof value === 'object') {
    return Object.entries(value).some(([entryKey, entry]) =>
      containsCredential(entry, entryKey),
    );
  }
  return false;
}
