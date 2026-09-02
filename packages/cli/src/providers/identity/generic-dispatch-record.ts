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
  });

export type GenericDispatchRecord = z.infer<typeof genericDispatchRecordSchema>;

const SENSITIVE_KEY =
  /^(?:prompt|prompts|message|messages|credential|credentials|transcript|transcript_body|access_token|auth_token|secret)$/i;
const SENSITIVE_VALUE =
  /(?:authorization\s*:\s*bearer\s+\S+|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----)/i;

export function assertNoSensitiveDispatchContent(
  value: unknown,
  path = '<record>',
): void {
  if (typeof value === 'string') {
    if (SENSITIVE_VALUE.test(value)) {
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
    if (SENSITIVE_KEY.test(key)) {
      throw new Error(`Sensitive dispatch content is forbidden at ${path}.`);
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
