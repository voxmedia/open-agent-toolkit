import { createHash } from 'node:crypto';

import type { SharedRemoteField } from './purpose-policy';

export interface PostconditionVerificationInput {
  operationId: string;
  requested: {
    fieldMask: SharedRemoteField[];
    expected: Partial<Record<SharedRemoteField, string | null>>;
  };
  providerOutcome: 'accepted' | 'rejected' | 'ambiguous';
  commandExitCode: number | null;
  revisionEvidence: {
    attemptedRevisionDigest: string;
    readbackBaseRevisionDigest: string;
  };
  readback: {
    values: Partial<Record<SharedRemoteField, string | null>>;
    unavailableFields: SharedRemoteField[];
  } | null;
  priorVerification: {
    requestDigest: string;
    classification: 'verified';
  } | null;
}

export interface PostconditionFieldVerification {
  field: SharedRemoteField;
  expectedHash: string;
  observedHash: string | null;
  status: 'verified' | 'mismatch' | 'unavailable';
}

export type PostconditionClassification =
  | 'verified'
  | 'already-verified'
  | 'partial'
  | 'uncertain'
  | 'rejected';

export interface PostconditionVerificationResult {
  classification: PostconditionClassification;
  reason: string;
  requestDigest: string;
  fields: PostconditionFieldVerification[];
  retryDisposition: 'not-applicable' | 'reconcile-required';
  requiresReconciliation: boolean;
}

const FIELD_ORDER: readonly SharedRemoteField[] = [
  'title',
  'description',
  'priority',
];

export function buildVerificationRequestDigest(
  input: Pick<
    PostconditionVerificationInput,
    'operationId' | 'requested' | 'revisionEvidence'
  >,
): string {
  const fieldMask = normalizeFieldMask(input.requested.fieldMask);
  return hashCanonical({
    operationId: input.operationId,
    fieldMask,
    expected: Object.fromEntries(
      fieldMask.map((field) => [field, input.requested.expected[field]]),
    ),
    attemptedRevisionDigest: input.revisionEvidence.attemptedRevisionDigest,
  });
}

export function verifyRemotePostconditions(
  input: PostconditionVerificationInput,
): PostconditionVerificationResult {
  const fieldMask = normalizeFieldMask(input.requested.fieldMask);
  for (const field of fieldMask) {
    if (!Object.hasOwn(input.requested.expected, field)) {
      throw new Error(`Requested field '${field}' has no expected value.`);
    }
  }
  const requestDigest = buildVerificationRequestDigest(input);
  if (
    input.priorVerification?.classification === 'verified' &&
    input.priorVerification.requestDigest === requestDigest
  ) {
    return result(
      'already-verified',
      'durable-verification-match',
      requestDigest,
      [],
      false,
    );
  }

  if (input.providerOutcome === 'rejected') {
    return result(
      'rejected',
      'provider-rejected',
      requestDigest,
      unavailableFields(input, fieldMask),
      false,
    );
  }
  if (input.providerOutcome === 'ambiguous') {
    return result(
      'uncertain',
      'ambiguous-provider-outcome',
      requestDigest,
      unavailableFields(input, fieldMask),
      true,
    );
  }
  if (
    input.revisionEvidence.readbackBaseRevisionDigest !==
    input.revisionEvidence.attemptedRevisionDigest
  ) {
    return result(
      'uncertain',
      'revision-drift',
      requestDigest,
      unavailableFields(input, fieldMask),
      true,
    );
  }
  if (!input.readback) {
    return result(
      'uncertain',
      'missing-readback',
      requestDigest,
      unavailableFields(input, fieldMask),
      true,
    );
  }

  const fields = fieldMask.map((field) =>
    verifyField(field, input.requested.expected[field]!, input.readback!),
  );
  const verifiedCount = fields.filter(
    (field) => field.status === 'verified',
  ).length;
  const unavailableCount = fields.filter(
    (field) => field.status === 'unavailable',
  ).length;
  if (verifiedCount === fields.length) {
    return result(
      'verified',
      'postconditions-verified',
      requestDigest,
      fields,
      false,
    );
  }
  if (verifiedCount > 0) {
    return result(
      'partial',
      'partial-postconditions',
      requestDigest,
      fields,
      true,
    );
  }
  if (unavailableCount > 0) {
    return result(
      'uncertain',
      'incomplete-readback',
      requestDigest,
      fields,
      true,
    );
  }
  return result(
    'rejected',
    'postconditions-not-applied',
    requestDigest,
    fields,
    false,
  );
}

function verifyField(
  field: SharedRemoteField,
  expected: string | null,
  readback: NonNullable<PostconditionVerificationInput['readback']>,
): PostconditionFieldVerification {
  const expectedHash = hashCanonical(expected);
  if (
    readback.unavailableFields.includes(field) ||
    !Object.hasOwn(readback.values, field)
  ) {
    return { field, expectedHash, observedHash: null, status: 'unavailable' };
  }
  const observed = readback.values[field]!;
  return {
    field,
    expectedHash,
    observedHash: hashCanonical(observed),
    status: observed === expected ? 'verified' : 'mismatch',
  };
}

function unavailableFields(
  input: PostconditionVerificationInput,
  fieldMask: readonly SharedRemoteField[],
): PostconditionFieldVerification[] {
  return fieldMask.map((field) => ({
    field,
    expectedHash: hashCanonical(input.requested.expected[field]),
    observedHash: null,
    status: 'unavailable',
  }));
}

function result(
  classification: PostconditionClassification,
  reason: string,
  requestDigest: string,
  fields: PostconditionFieldVerification[],
  requiresReconciliation: boolean,
): PostconditionVerificationResult {
  return {
    classification,
    reason,
    requestDigest,
    fields,
    retryDisposition: requiresReconciliation
      ? 'reconcile-required'
      : 'not-applicable',
    requiresReconciliation,
  };
}

function normalizeFieldMask(
  fieldMask: readonly SharedRemoteField[],
): SharedRemoteField[] {
  const unique = new Set(fieldMask);
  if (fieldMask.length === 0 || unique.size !== fieldMask.length) {
    throw new Error('Verification field mask must be non-empty and unique.');
  }
  return FIELD_ORDER.filter((field) => unique.has(field));
}

function hashCanonical(value: unknown): string {
  return `sha256:${createHash('sha256')
    .update(JSON.stringify(value))
    .digest('hex')}`;
}
