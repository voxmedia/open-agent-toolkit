import type { JsonValue, ReviewErrorCategory } from './types';

export interface ReviewErrorEnvelopeV1 {
  schemaVersion: 1;
  category: ReviewErrorCategory;
  code: string;
  message: string;
  details: JsonValue;
}

export class ReviewDomainError extends Error {
  readonly category: ReviewErrorCategory;
  readonly code: string;
  readonly details: JsonValue;

  constructor(input: {
    category: Exclude<ReviewErrorCategory, 'system'>;
    code: string;
    message: string;
    details?: JsonValue;
  }) {
    super(input.message);
    this.name = 'ReviewDomainError';
    this.category = input.category;
    this.code = input.code;
    this.details = input.details ?? null;
  }
}

export function serializeReviewError(error: unknown): ReviewErrorEnvelopeV1 {
  const classified = classifyReviewBoundaryError(error);
  if (classified instanceof ReviewDomainError) {
    return {
      schemaVersion: 1,
      category: classified.category,
      code: classified.code,
      message: classified.message,
      details: classified.details,
    };
  }
  return {
    schemaVersion: 1,
    category: 'system',
    code: 'validation-authority-broker-system-error',
    message: 'validation authority broker failed unexpectedly',
    details: null,
  };
}

export function deserializeReviewError(value: unknown): Error {
  if (!isExactReviewErrorEnvelope(value)) {
    throw new Error('validation authority broker error envelope is invalid');
  }
  if (value.category === 'system') {
    return new Error(value.message);
  }
  return new ReviewDomainError({
    category: value.category,
    code: value.code,
    message: value.message,
    details: value.details,
  });
}

export function classifyReviewBoundaryError(error: unknown): unknown {
  if (error instanceof ReviewDomainError) return error;
  const message = error instanceof Error ? error.message : '';
  if (message === 'validation state has expired') {
    return new ReviewDomainError({
      category: 'validation',
      code: 'validation-state-expired',
      message: 'review validation state has expired',
    });
  }
  if (
    /^(?:invalid or consumed .* capability|accepted handle must be bound before mutation|command capabilities were not issued)$/.test(
      message,
    )
  ) {
    return new ReviewDomainError({
      category: 'contract',
      code: 'command-capability-rejected',
      message: 'review command capability was rejected',
    });
  }
  return error;
}

export async function mapReviewBoundaryErrors<T>(
  operation: () => Promise<T>,
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    throw classifyReviewBoundaryError(error);
  }
}

function isExactReviewErrorEnvelope(
  value: unknown,
): value is ReviewErrorEnvelopeV1 {
  if (!isRecord(value)) return false;
  if (
    Object.keys(value).sort().join(',') !==
      'category,code,details,message,schemaVersion' ||
    value.schemaVersion !== 1 ||
    !['input', 'contract', 'validation', 'system'].includes(
      String(value.category),
    ) ||
    typeof value.code !== 'string' ||
    value.code.length === 0 ||
    typeof value.message !== 'string' ||
    value.message.length === 0 ||
    !isJsonValue(value.details)
  ) {
    return false;
  }
  return true;
}

function isJsonValue(value: unknown): value is JsonValue {
  if (
    value === null ||
    typeof value === 'boolean' ||
    typeof value === 'string'
  ) {
    return true;
  }
  if (typeof value === 'number') return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(isJsonValue);
  return isRecord(value) && Object.values(value).every(isJsonValue);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
