import { z } from 'zod';

const requestIdSchema = z
  .string()
  .regex(
    /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/,
    'request_id must be a stable contained identifier',
  );

const catalogSnapshotSchema = z
  .object({
    id: z.string().min(1),
    source: z.string().min(1),
    observed_at: z.string().datetime(),
  })
  .strict();

const genericFallbackSchema = z
  .object({
    mode: z.string().min(1),
    target: z.string().min(1).optional(),
    allow_below_task_class_floor: z.boolean().optional(),
  })
  .strict();

const optionalSelector = z.string().min(1).nullable();

/**
 * `payload` carries configured sandbox/tool controls only. It is validated as a
 * closed, bounded JSON projection so that prompt bodies, transcripts, and other
 * free-form content cannot ride into a durable journal through an unbounded
 * `unknown` value.
 */
const MAX_PAYLOAD_DEPTH = 4;
const MAX_PAYLOAD_STRING_LENGTH = 512;

function payloadProjectionViolation(
  value: unknown,
  path: string,
  depth: number,
): string | null {
  if (
    value === null ||
    typeof value === 'boolean' ||
    typeof value === 'number'
  ) {
    return null;
  }
  if (typeof value === 'string') {
    return value.length > MAX_PAYLOAD_STRING_LENGTH
      ? `${path} exceeds the ${MAX_PAYLOAD_STRING_LENGTH}-character control projection limit`
      : null;
  }
  if (typeof value !== 'object') {
    return `${path} is not a JSON control value`;
  }
  if (depth >= MAX_PAYLOAD_DEPTH) {
    return `${path} exceeds the ${MAX_PAYLOAD_DEPTH}-level control projection depth`;
  }
  if (Array.isArray(value)) {
    for (const [index, entry] of value.entries()) {
      const violation = payloadProjectionViolation(
        entry,
        `${path}[${index}]`,
        depth + 1,
      );
      if (violation) return violation;
    }
    return null;
  }
  for (const [key, entry] of Object.entries(value)) {
    const violation = payloadProjectionViolation(
      entry,
      `${path}.${key}`,
      depth + 1,
    );
    if (violation) return violation;
  }
  return null;
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
    caller: z.string().min(1),
    scope: z.string().min(1),
    objective: z.string().min(1),
    action: z.string().min(1),
    role_name: z.string().min(1),
    role_class: z.string().min(1),
    provider: z.string().min(1),
    dispatch_context: z.string().min(1),
    dispatch_policy: z.string().min(1).nullable().optional(),
    dispatch_ceiling: z.string().min(1).nullable().optional(),
    catalog_snapshot: catalogSnapshotSchema,
    authority: z.string().min(1),
    role_selector: optionalSelector,
    model_selector: optionalSelector,
    model_selector_granularity: z.string().min(1).nullable(),
    effort_selector: optionalSelector,
    reasoning_mode_selector: optionalSelector.optional(),
    service_tier_selector: optionalSelector.optional(),
    guidance_reference: z.string().min(1).optional(),
    guidance_version: z.string().min(1).optional(),
    guidance_verified_at: z.string().min(1).optional(),
    guidance_status: z.enum(['fresh', 'review-required', 'stale']).optional(),
    selection_source: z.enum([
      'native-default',
      'policy-resolved',
      'explicit-user',
    ]),
    candidates_considered: z.array(z.string().min(1)),
    selection_reason: z.enum([
      'native-catalog',
      'native-catalog-unsatisfying',
      'pre-start-rejection',
      'inherit',
      'gate-target',
    ]),
    selected_route: z.string().min(1),
    deadline_seconds: z.number().int().nonnegative(),
    retry_limit: z.number().int().nonnegative(),
    payload: z.record(z.unknown()),
    launch_status: z.enum(['planned', 'accepted', 'blocked-before-start']),
    child_outcome: z.string().min(1).nullable(),
    configured_invocation_evidence: z.array(z.unknown()),
    runtime_confirmation: z.string().min(1),
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
    model_class_floor: z.string().min(1).optional(),
    classification_source: z.literal('caller').optional(),
    classification_reason: z.string().min(1).optional(),
    floor_satisfaction: z.enum(['satisfied', 'unsatisfied']).optional(),
    authorization_scope: z.string().min(1).optional(),
    expected_output: z.string().min(1).optional(),
    verification_evidence: z.string().min(1).optional(),
    escalate_when: z.array(z.string().min(1)).optional(),
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

    const payloadViolation = payloadProjectionViolation(
      record.payload,
      'payload',
      1,
    );
    if (payloadViolation) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Dispatch payload must stay inside the closed control projection: ${payloadViolation}.`,
        path: ['payload'],
      });
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
 * Sensitive-key classification normalizes spelling, case, and separators before
 * matching so that `api_key`, `apiKey`, `API-KEY`, and `ApiKey` all collapse to
 * the same classified token. Matching is deliberately family-based rather than
 * an exact-spelling denylist.
 */
export function normalizeDispatchKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, '');
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
];

/**
 * Generic content words that are only sensitive as a complete key. They are
 * matched exactly so that `contentDigest`, `expected_output`, and
 * `authorization_scope` stay legal.
 */
const SENSITIVE_KEY_EXACT: ReadonlySet<string> = new Set([
  'auth',
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

const SENSITIVE_VALUE_PATTERNS: readonly RegExp[] = [
  /authorization\s*:\s*bearer\s+\S+/i,
  /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY-----/i,
  /\bsk-[A-Za-z0-9_-]{16,}/,
  /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{20,}/,
  /\bgithub_pat_[A-Za-z0-9_]{20,}/,
  /\bxox[abprs]-[A-Za-z0-9-]{10,}/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\./,
];

export function isSensitiveDispatchKey(key: string): boolean {
  const normalized = normalizeDispatchKey(key);
  if (normalized === '') return false;
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

export function parseGenericDispatchRecord(
  value: unknown,
): GenericDispatchRecord {
  assertNoSensitiveDispatchContent(value);
  return genericDispatchRecordSchema.parse(value);
}
