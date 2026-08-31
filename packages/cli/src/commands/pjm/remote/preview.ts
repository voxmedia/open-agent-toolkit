import { createHash } from 'node:crypto';

import type {
  OatPjmRemoteOperationClass,
  OatPjmRemoteProvider,
} from '@config/oat-config';

import { containsCredentialAssignment } from './credential-safety';
import type { SharedRemoteField } from './purpose-policy';

export interface BuildBindingPreviewInput {
  binding: {
    bindingId: string;
    provider: OatPjmRemoteProvider;
    purposes: string[];
  };
  target: {
    stableId: string;
    context: Record<string, string>;
  };
  baseline: { baselineId: string; digest: string } | null;
  revision: {
    strength: string;
    token: string | null;
    updatedAt: string | null;
    contentHash: string;
  };
  capability: {
    transport: string;
    catalogFingerprint: string;
    context: Record<string, string>;
  };
  policy: Record<string, unknown>;
  projection: {
    title: string;
    description: string | null;
    priority: string | null;
    sourceRevision: string;
  };
  operationClass: OatPjmRemoteOperationClass;
  fieldMask: SharedRemoteField[];
  createdAt: string;
}

type RenderedField =
  | { kind: 'value'; value: string | null }
  | { kind: 'hash'; digest: string; bytes: number };

export interface BindingPreview {
  schemaVersion: 1;
  digest: string;
  bindingId: string;
  provider: OatPjmRemoteProvider;
  operationClass: OatPjmRemoteOperationClass;
  fieldMask: SharedRemoteField[];
  createdAt: string;
  componentDigests: {
    target: string;
    baseline: string;
    revision: string;
    capability: string;
    policy: string;
    projection: string;
  };
  renderedFields: Record<SharedRemoteField, RenderedField>;
}

export interface PreviewApproval {
  previewDigest: string;
  operationClass: OatPjmRemoteOperationClass;
  approvedAt: string;
  actor: string;
  source: string;
}

export type ApprovalValidationReason =
  | 'digest-mismatch'
  | 'operation-mismatch'
  | 'invalid-time'
  | 'approval-before-preview'
  | 'future-approval'
  | 'expired'
  | 'unsafe-evidence';

const FIELD_ORDER: readonly SharedRemoteField[] = [
  'title',
  'description',
  'priority',
];
const NON_ASSIGNMENT_CREDENTIAL_EVIDENCE =
  /(?:bearer\s+|github_pat_|gh[pousr]_|sk-)/i;

export function buildBindingPreview(
  input: BuildBindingPreviewInput,
): BindingPreview {
  assertTimestamp(input.createdAt, 'preview creation');
  if (
    canonicalJson(input.target.context) !==
    canonicalJson(input.capability.context)
  ) {
    throw new Error('Preview target and capability contexts must match.');
  }

  const fieldMask = normalizeFieldMask(input.fieldMask);
  const componentDigests = {
    target: hashCanonical(input.target),
    baseline: hashCanonical(input.baseline),
    revision: hashCanonical(input.revision),
    capability: hashCanonical(input.capability),
    policy: hashCanonical(input.policy),
    projection: hashCanonical(input.projection),
  };
  const digest = hashCanonical({
    schemaVersion: 1,
    binding: input.binding,
    operationClass: input.operationClass,
    fieldMask,
    createdAt: input.createdAt,
    componentDigests,
  });

  return {
    schemaVersion: 1,
    digest,
    bindingId: input.binding.bindingId,
    provider: input.binding.provider,
    operationClass: input.operationClass,
    fieldMask,
    createdAt: input.createdAt,
    componentDigests,
    renderedFields: {
      title: renderConcise(input.projection.title),
      description: renderBody(input.projection.description),
      priority: renderConcise(input.projection.priority),
    },
  };
}

export function validatePreviewApproval(
  preview: BindingPreview,
  approval: PreviewApproval,
  options: { now: string; maxAgeMs: number },
):
  | { valid: true; reason: null }
  | { valid: false; reason: ApprovalValidationReason } {
  if (approval.previewDigest !== preview.digest) {
    return { valid: false, reason: 'digest-mismatch' };
  }
  if (approval.operationClass !== preview.operationClass) {
    return { valid: false, reason: 'operation-mismatch' };
  }
  const approvedAt = Date.parse(approval.approvedAt);
  const previewCreatedAt = Date.parse(preview.createdAt);
  const now = Date.parse(options.now);
  if (
    !Number.isFinite(approvedAt) ||
    !Number.isFinite(previewCreatedAt) ||
    !Number.isFinite(now) ||
    !Number.isFinite(options.maxAgeMs) ||
    options.maxAgeMs < 0
  ) {
    return { valid: false, reason: 'invalid-time' };
  }
  if (approvedAt < previewCreatedAt) {
    return { valid: false, reason: 'approval-before-preview' };
  }
  if (approvedAt > now) return { valid: false, reason: 'future-approval' };
  if (now - approvedAt > options.maxAgeMs) {
    return { valid: false, reason: 'expired' };
  }
  if (!isSafeEvidence(approval.actor) || !isSafeEvidence(approval.source)) {
    return { valid: false, reason: 'unsafe-evidence' };
  }
  return { valid: true, reason: null };
}

function normalizeFieldMask(
  fieldMask: readonly SharedRemoteField[],
): SharedRemoteField[] {
  const unique = new Set(fieldMask);
  if (unique.size !== fieldMask.length || fieldMask.length === 0) {
    throw new Error('Preview field mask must be non-empty and unique.');
  }
  for (const field of unique) {
    if (!FIELD_ORDER.includes(field)) {
      throw new Error(`Unsupported preview field '${String(field)}'.`);
    }
  }
  return FIELD_ORDER.filter((field) => unique.has(field));
}

function renderConcise(value: string | null): RenderedField {
  if (value === null) return { kind: 'value', value: null };
  if (containsCredentialEvidence(value)) {
    return { kind: 'value', value: '[REDACTED:CREDENTIAL]' };
  }
  return {
    kind: 'value',
    value: value.length > 160 ? `${value.slice(0, 157)}...` : value,
  };
}

function renderBody(value: string | null): RenderedField {
  if (value === null) return { kind: 'value', value: null };
  return {
    kind: 'hash',
    digest: hashText(value),
    bytes: Buffer.byteLength(value, 'utf8'),
  };
}

function isSafeEvidence(value: string): boolean {
  return (
    value.length > 0 &&
    value.length <= 255 &&
    !/[\r\n]/.test(value) &&
    !value.includes('\0') &&
    !containsCredentialEvidence(value)
  );
}

function containsCredentialEvidence(value: string): boolean {
  return (
    containsCredentialAssignment(value) ||
    NON_ASSIGNMENT_CREDENTIAL_EVIDENCE.test(value)
  );
}

function hashCanonical(value: unknown): string {
  return hashText(canonicalJson(value));
}

function hashText(value: string): string {
  return `sha256:${createHash('sha256').update(value).digest('hex')}`;
}

function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

function canonicalize(value: unknown): unknown {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'boolean'
  ) {
    return value;
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value))
      throw new Error('Preview inputs must be finite.');
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
  throw new Error(`Unsupported preview input type '${typeof value}'.`);
}

function assertTimestamp(value: string, label: string): void {
  if (!Number.isFinite(Date.parse(value))) {
    throw new Error(`Invalid ${label} time '${value}'.`);
  }
}
