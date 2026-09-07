import { serializeJsonDocument } from '@fs/io';
import { z } from 'zod';

import {
  assertNoAbsolutePath,
  redactAbsolutePathsDeep,
} from './absolute-paths';

/**
 * Length bounds for caller-authored text. `identifier` covers names, selectors,
 * routes, and statuses; `reason` covers a single explanatory sentence; `prose`
 * covers the longest legitimate free-form field. Nothing in a dispatch record
 * is a narrative document.
 */
const MAX_IDENTIFIER_LENGTH = 256;
const MAX_REASON_LENGTH = 512;
const MAX_PROSE_LENGTH = 1024;

const identifier = () => z.string().min(1).max(MAX_IDENTIFIER_LENGTH);
const reasonText = () => z.string().min(1).max(MAX_REASON_LENGTH);
const proseText = () => z.string().min(1).max(MAX_PROSE_LENGTH);

const requestIdSchema = z
  .string()
  .regex(
    /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/,
    'request_id must be a stable contained identifier',
  );

const catalogSnapshotSchema = z
  .object({
    id: identifier(),
    source: identifier(),
    observed_at: z.string().datetime(),
  })
  .strict();

const genericFallbackSchema = z
  .object({
    mode: identifier(),
    target: identifier().optional(),
    allow_below_task_class_floor: z.boolean().optional(),
  })
  .strict();

const optionalSelector = identifier().nullable();

/**
 * Every generic container field is validated as a closed, bounded JSON
 * projection so prompt bodies, transcripts, and other free-form content cannot
 * ride into a durable journal through an unbounded `unknown` value. `payload`
 * carries configured sandbox/tool controls; `candidates_considered`,
 * `configured_invocation_evidence`, `continuation_events`, `diagnostics`, and
 * `escalate_when` carry short references and identifiers, not narrative text.
 *
 * The projection bounds four independent axes so that no single one can be
 * defeated by trading against another: nesting depth, per-string length, node
 * count (which closes chunking into many short strings), and serialized bytes
 * per field. `assertBoundedDispatchRecordSize` adds a whole-record ceiling on
 * top, so the sum of every bounded and unbounded field is capped too.
 */
const BOUNDED_PROJECTION_FIELDS = [
  'payload',
  'candidates_considered',
  'configured_invocation_evidence',
  'continuation_events',
  'diagnostics',
  'escalate_when',
] as const;
const MAX_PROJECTION_DEPTH = 4;
const MAX_PROJECTION_STRING_LENGTH = 512;
const MAX_PROJECTION_NODES = 512;
const MAX_PROJECTION_BYTES = 16 * 1024;
const MAX_RECORD_BYTES = 64 * 1024;

function boundedProjectionViolation(
  value: unknown,
  path: string,
  depth: number,
): string | null {
  if (value === undefined) {
    // An absent optional field has nothing to project.
    return null;
  }
  if (
    value === null ||
    typeof value === 'boolean' ||
    typeof value === 'number'
  ) {
    return null;
  }
  if (typeof value === 'string') {
    return value.length > MAX_PROJECTION_STRING_LENGTH
      ? `${path} exceeds the ${MAX_PROJECTION_STRING_LENGTH}-character control projection limit`
      : null;
  }
  if (typeof value !== 'object') {
    return `${path} is not a JSON control value`;
  }
  if (depth >= MAX_PROJECTION_DEPTH) {
    return `${path} exceeds the ${MAX_PROJECTION_DEPTH}-level control projection depth`;
  }
  if (Array.isArray(value)) {
    for (const [index, entry] of value.entries()) {
      const violation = boundedProjectionViolation(
        entry,
        `${path}[${index}]`,
        depth + 1,
      );
      if (violation) return violation;
    }
    return null;
  }
  for (const [key, entry] of Object.entries(value)) {
    const violation = boundedProjectionViolation(
      entry,
      `${path}.${key}`,
      depth + 1,
    );
    if (violation) return violation;
  }
  return null;
}

function serializedByteLength(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value) ?? 'null').length;
}

/**
 * Bytes as published. The whole-record ceiling constrains a file on disk, so it
 * measures the writer's own serialization rather than a compact approximation
 * of it. Per-field projection bounds below stay compact: they bound the shape
 * of a field, not the size of a file.
 */
function publishedByteLength(value: unknown): number {
  return new TextEncoder().encode(serializeJsonDocument(value)).length;
}

function projectionNodeCount(value: unknown): number {
  if (value === null || typeof value !== 'object') return 1;
  if (Array.isArray(value)) {
    return value.reduce<number>(
      (total, entry) => total + projectionNodeCount(entry),
      1,
    );
  }
  return Object.values(value).reduce<number>(
    (total, entry) => total + projectionNodeCount(entry),
    1,
  );
}

/**
 * Breadth and aggregate bound. Depth and per-string limits alone are defeated
 * by chunking one large body into many small values, so a field is also capped
 * by how many nodes it contains and how many bytes it serializes to.
 */
function projectionAggregateViolation(
  value: unknown,
  path: string,
): string | null {
  if (value === undefined) return null;
  const nodes = projectionNodeCount(value);
  if (nodes > MAX_PROJECTION_NODES) {
    return `${path} holds ${nodes} values, above the ${MAX_PROJECTION_NODES}-value control projection limit`;
  }
  const bytes = serializedByteLength(value);
  if (bytes > MAX_PROJECTION_BYTES) {
    return `${path} serializes to ${bytes} bytes, above the ${MAX_PROJECTION_BYTES}-byte control projection limit`;
  }
  return null;
}

/**
 * Whole-record ceiling, applied at every parse entry point so no combination
 * of individually legal fields can produce an unbounded journal revision.
 */
export function assertBoundedDispatchRecordSize(value: unknown): void {
  const bytes = publishedByteLength(value);
  if (bytes > MAX_RECORD_BYTES) {
    throw new Error(
      `A dispatch record serializes to ${bytes} bytes, above the ${MAX_RECORD_BYTES}-byte record limit.`,
    );
  }
}

const TASK_CLASS_FIELDS = [
  'task_class',
  'model_class_floor',
  'classification_source',
  'classification_reason',
  'floor_satisfaction',
] as const;

export const genericDispatchRecordSchema = z
  .object({
    request_id: requestIdSchema,
    caller: identifier(),
    scope: identifier(),
    objective: proseText(),
    action: identifier(),
    role_name: identifier(),
    role_class: identifier(),
    provider: identifier(),
    dispatch_context: identifier(),
    dispatch_policy: identifier().nullable().optional(),
    dispatch_ceiling: identifier().nullable().optional(),
    catalog_snapshot: catalogSnapshotSchema,
    authority: identifier(),
    role_selector: optionalSelector,
    model_selector: optionalSelector,
    model_selector_granularity: identifier().nullable(),
    effort_selector: optionalSelector,
    reasoning_mode_selector: optionalSelector.optional(),
    service_tier_selector: optionalSelector.optional(),
    guidance_reference: identifier().optional(),
    guidance_version: identifier().optional(),
    guidance_verified_at: identifier().optional(),
    guidance_status: z.enum(['fresh', 'review-required', 'stale']).optional(),
    selection_source: z.enum([
      'native-default',
      'policy-resolved',
      'explicit-user',
    ]),
    candidates_considered: z.array(identifier()),
    selection_reason: z.enum([
      'native-catalog',
      'native-catalog-unsatisfying',
      'pre-start-rejection',
      'inherit',
      'gate-target',
    ]),
    selected_route: identifier(),
    deadline_seconds: z.number().int().nonnegative(),
    retry_limit: z.number().int().nonnegative(),
    payload: z.record(z.unknown()),
    launch_status: z.enum(['planned', 'accepted', 'blocked-before-start']),
    child_outcome: identifier().nullable(),
    configured_invocation_evidence: z.array(z.unknown()),
    runtime_confirmation: identifier(),
    diagnostics: z.array(z.string()),
    continuation_events: z.array(z.unknown()),
    fallback: genericFallbackSchema.optional(),
    task_class: z
      .enum([
        'mechanical-recon',
        'intelligent-recon',
        'default-implementation',
        'hard-reasoning',
        'consequential',
      ])
      .optional(),
    model_class_floor: identifier().optional(),
    classification_source: z.literal('caller').optional(),
    classification_reason: reasonText().optional(),
    floor_satisfaction: z.enum(['satisfied', 'unsatisfied']).optional(),
    authorization_scope: identifier().optional(),
    expected_output: proseText().optional(),
    verification_evidence: proseText().optional(),
    escalate_when: z.array(reasonText()).optional(),
  })
  .strict()
  .superRefine((record, context) => {
    if (record.launch_status === 'accepted' && record.child_outcome === null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'An accepted dispatch must report a child outcome.',
        path: ['child_outcome'],
      });
    }

    for (const field of BOUNDED_PROJECTION_FIELDS) {
      const violation =
        boundedProjectionViolation(record[field], field, 1) ??
        projectionAggregateViolation(record[field], field);
      if (violation) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Dispatch ${field} must stay inside the closed control projection: ${violation}.`,
          path: [field],
        });
      }
    }

    const presentClassFields = TASK_CLASS_FIELDS.filter(
      (field) => record[field] !== undefined,
    );
    if (
      presentClassFields.length !== 0 &&
      presentClassFields.length !== TASK_CLASS_FIELDS.length
    ) {
      const missing = TASK_CLASS_FIELDS.filter(
        (field) => record[field] === undefined,
      );
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `A class-constrained dispatch record requires every task-class field; missing ${missing.join(', ')}. A legacy record omits all five.`,
        path: [missing[0] ?? 'task_class'],
      });
      return;
    }
    if (presentClassFields.length === 0) {
      return;
    }
    if (record.classification_source !== 'caller') {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Task-class classification_source must be caller.',
        path: ['classification_source'],
      });
    }
    if (record.model_class_floor !== record.task_class) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'model_class_floor must equal the requested task_class; a floor may never be recorded below the requested class.',
        path: ['model_class_floor'],
      });
    }
  });

export type GenericDispatchRecord = z.infer<typeof genericDispatchRecordSchema>;

/**
 * Latin look-alikes from other scripts, folded to their Latin counterpart so a
 * homoglyph spelling classifies as the token it imitates. This map is a
 * convenience for common cases, not the safety boundary: anything it does not
 * cover is reported as unrecognized and fails closed.
 */
const CONFUSABLE_FOLDING: ReadonlyMap<string, string> = new Map([
  ['\u0430', 'a'],
  ['\u0432', 'b'],
  ['\u0441', 'c'],
  ['\u0501', 'd'],
  ['\u0435', 'e'],
  ['\u0433', 'r'],
  ['\u043d', 'h'],
  ['\u0456', 'i'],
  ['\u0458', 'j'],
  ['\u043a', 'k'],
  ['\u043c', 'm'],
  ['\u043e', 'o'],
  ['\u0440', 'p'],
  ['\u0455', 's'],
  ['\u0442', 't'],
  ['\u0443', 'y'],
  ['\u0445', 'x'],
  ['\u04bb', 'h'],
  ['\u03b1', 'a'],
  ['\u03b5', 'e'],
  ['\u03b3', 'y'],
  ['\u03b9', 'i'],
  ['\u03ba', 'k'],
  ['\u03bc', 'm'],
  ['\u03bd', 'v'],
  ['\u03bf', 'o'],
  ['\u03c1', 'p'],
  ['\u03c4', 't'],
  ['\u03c7', 'x'],
  ['\u0261', 'g'],
  ['\u0131', 'i'],
  ['\u026a', 'i'],
  ['\u0269', 'i'],
  ['\u2113', 'l'],
  ['\u0578', 'n'],
]);

/**
 * Recognized separators: ASCII punctuation and space. Anything outside
 * `[a-z0-9]` and this set survives folding as an unrecognized character.
 */
const RECOGNIZED_SEPARATOR = /[\x20-\x2f\x3a-\x40\x5b-\x60\x7b-\x7e]/;

interface FoldedDispatchKey {
  normalized: string;
  unrecognized: boolean;
}

/**
 * Fold a key to its classified token.
 *
 * NFKC collapses full-width and mathematical alphanumerics; case folding
 * collapses spelling; NFKD plus combining-mark removal collapses diacritics
 * (`pàssword`); the confusable map collapses cross-script look-alikes
 * (Cyrillic-a `apiKey`). Whatever survives that and is neither `[a-z0-9]` nor a
 * recognized separator is reported as unrecognized, because silently deleting
 * it would unmask nothing and let spellings such as small-capital `ᴘᴀssᴡᴏʀᴅ`
 * evade the family list. Callers fail closed on it rather than growing the map
 * indefinitely.
 */
function foldDispatchKey(key: string): FoldedDispatchKey {
  const decomposed = key
    .normalize('NFKC')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/\p{M}/gu, '');
  let normalized = '';
  let unrecognized = false;
  for (const character of decomposed) {
    const folded = CONFUSABLE_FOLDING.get(character) ?? character;
    if (/^[a-z0-9]$/.test(folded)) {
      normalized += folded;
    } else if (!RECOGNIZED_SEPARATOR.test(folded)) {
      unrecognized = true;
    }
  }
  return { normalized, unrecognized };
}

export function normalizeDispatchKey(key: string): string {
  return foldDispatchKey(key).normalized;
}

/**
 * Credential, token, prompt/message, transcript, and role-content families.
 * Every entry is checked as a substring of the normalized key, so no entry may
 * be a substring of a legitimate record key (for example `content` cannot live
 * here because `contentDigest` is legitimate).
 */
const SENSITIVE_KEY_FAMILIES: readonly string[] = [
  'credential',
  'secret',
  'password',
  'passwd',
  'passphrase',
  'token',
  'apikey',
  'accesskey',
  'privatekey',
  'sessionkey',
  'signingkey',
  'encryptionkey',
  'bearer',
  'cookie',
  'prompt',
  'message',
  'transcript',
  'conversation',
  'chatlog',
  'chathistory',
  'rolecontent',
  'systemcontent',
  'usercontent',
  'assistantcontent',
  'messagecontent',
  'instructiontext',
  'instructionbody',
  'instruction',
  'assistanttext',
  'usertext',
  'systemtext',
  'pwd',
  'privkey',
  'sshkey',
  'gpgkey',
  'cred',
  'oauth',
  'session',
];

/**
 * Evidence keys that legitimately collide with a denied family. `roleInstructions`
 * carries canonical role identity (dependency, tier, path, version, digest) and
 * never role content, so it is admitted explicitly rather than by relying on the
 * family list happening to miss it.
 */
const SENSITIVE_KEY_ALLOWLIST: ReadonlySet<string> = new Set([
  'roleinstructions',
]);

/**
 * Generic content words that are only sensitive as a complete key. They are
 * matched exactly so that `contentDigest`, `expected_output`, and
 * `authorization_scope` stay legal.
 */
const SENSITIVE_KEY_EXACT: ReadonlySet<string> = new Set([
  'auth',
  'pass',
  'authorization',
  'body',
  'content',
  'contents',
  'jwt',
  'key',
  'keys',
  'otp',
  'pat',
  'pin',
  'salt',
  'session',
  'signature',
  'text',
]);

/**
 * Best-effort second layer only. Key-family classification above is the primary
 * defence; value shapes change constantly and this list will never be complete.
 */
const SENSITIVE_VALUE_PATTERNS: readonly RegExp[] = [
  /authorization\s*:\s*bearer\s+\S+/i,
  /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY-----/i,
  /\bsk-[A-Za-z0-9_-]{16,}/,
  /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{20,}/,
  /\bgithub_pat_[A-Za-z0-9_]{20,}/,
  /\bxox[abprs]-[A-Za-z0-9-]{10,}/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\./,
  /\bAIzaSy[A-Za-z0-9_-]{20,}/,
  /\bglpat-[A-Za-z0-9_-]{16,}/,
  /\bdop_v1_[a-f0-9]{32,}/,
  /\bnpm_[A-Za-z0-9]{30,}/,
  /\b[a-z][a-z0-9+.-]*:\/\/[^\s:/?#@]+:[^\s:/?#@]+@/i,
];

export function isSensitiveDispatchKey(key: string): boolean {
  const { normalized, unrecognized } = foldDispatchKey(key);
  // Fail closed: a key this normalizer cannot fully account for is treated as
  // sensitive rather than classified on a partial token.
  if (unrecognized) return true;
  if (normalized === '') return false;
  if (SENSITIVE_KEY_ALLOWLIST.has(normalized)) return false;
  if (SENSITIVE_KEY_EXACT.has(normalized)) return true;
  return SENSITIVE_KEY_FAMILIES.some((family) => normalized.includes(family));
}

export function assertNoSensitiveDispatchContent(
  value: unknown,
  path = '<record>',
): void {
  if (typeof value === 'string') {
    if (SENSITIVE_VALUE_PATTERNS.some((pattern) => pattern.test(value))) {
      throw new Error(`Sensitive dispatch content is forbidden at ${path}.`);
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) =>
      assertNoSensitiveDispatchContent(entry, `${path}[${index}]`),
    );
    return;
  }
  if (value === null || typeof value !== 'object') {
    return;
  }
  for (const [key, entry] of Object.entries(value)) {
    if (isSensitiveDispatchKey(key)) {
      throw new Error(
        `Sensitive dispatch content is forbidden at ${path}.${key}.`,
      );
    }
    assertNoSensitiveDispatchContent(entry, `${path}.${key}`);
  }
}

/**
 * Fields where an absolute path is incidental content rather than a malformed
 * identifier: free-form prose a human wrote, and the nested evidence containers
 * that quote commands and diagnostics. A path here is redacted, because the
 * surrounding text is still meaningful without it.
 *
 * Every other field in the record is identity or control — a caller, a scope, a
 * selector, a route, a guidance reference. A path is never a legitimate value
 * for those, and rewriting one in place would silently corrupt the identifier
 * it claims to be, so those are rejected instead.
 */
const PATH_REDACTED_FIELDS = [
  'objective',
  'expected_output',
  'verification_evidence',
  'classification_reason',
  'escalate_when',
  'payload',
  'diagnostics',
  'configured_invocation_evidence',
  'continuation_events',
] as const satisfies readonly (keyof GenericDispatchRecord)[];

/**
 * The persistence-boundary path sanitizer for the generic record.
 *
 * NFR1 is enforced here rather than in each producer, for the same reason
 * redaction became a boundary in Phase 6: a guarantee implemented as a
 * per-producer obligation regresses the moment a call site is added.
 */
export function identityFieldsOf(
  record: GenericDispatchRecord,
): Record<string, unknown> {
  const redacted = new Set<string>(PATH_REDACTED_FIELDS);
  return Object.fromEntries(
    Object.entries(record).filter(([key]) => !redacted.has(key)),
  );
}

export function sanitizeDispatchRecordPaths(
  record: GenericDispatchRecord,
): GenericDispatchRecord {
  const redacted = new Set<string>(PATH_REDACTED_FIELDS);
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    if (redacted.has(key)) {
      sanitized[key] = redactAbsolutePathsDeep(value);
      continue;
    }
    assertNoAbsolutePath(value, key);
    sanitized[key] = value;
  }
  return sanitized as GenericDispatchRecord;
}

export function parseGenericDispatchRecord(
  value: unknown,
): GenericDispatchRecord {
  assertNoSensitiveDispatchContent(value);
  assertBoundedDispatchRecordSize(value);
  const sanitized = sanitizeDispatchRecordPaths(
    genericDispatchRecordSchema.parse(value),
  );
  // Redaction is a transform that runs after validation, and `<redacted-path>`
  // is far longer than a short path like `/a`, so it can only grow a record.
  // Bounds are therefore re-run on the transform's output: a postcondition
  // checked against pre-transform data is not a postcondition.
  const revalidated = genericDispatchRecordSchema.parse(sanitized);
  assertBoundedDispatchRecordSize(revalidated);
  return revalidated;
}
