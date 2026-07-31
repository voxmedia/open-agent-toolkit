import type { JsonValue, ReviewErrorCategory } from './types';

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
