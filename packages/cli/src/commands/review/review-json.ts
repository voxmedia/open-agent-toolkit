import { canonicalizeJson } from '@review/canonical-json';
import { ReviewDomainError } from '@review/errors';
import type {
  JsonValue,
  ReviewCliEnvelope,
  ReviewErrorCategory,
} from '@review/types';

export const MAX_REVIEW_JSON_STDIN_BYTES = 1024 * 1024;

export class ReviewJsonCommandError<T = never> extends Error {
  readonly category: ReviewErrorCategory;
  readonly code: string;
  readonly details: JsonValue;
  readonly result?: T;

  constructor(input: {
    category: ReviewErrorCategory;
    code: string;
    message: string;
    details?: JsonValue;
    result?: T;
  }) {
    super(input.message);
    this.name = 'ReviewJsonCommandError';
    this.category = input.category;
    this.code = input.code;
    this.details = input.details ?? null;
    this.result = input.result;
  }
}

export async function readBoundedJsonStdin(
  input: AsyncIterable<Uint8Array | string>,
  maxBytes = MAX_REVIEW_JSON_STDIN_BYTES,
): Promise<unknown> {
  const chunks: Buffer[] = [];
  let bytes = 0;
  for await (const chunk of input) {
    const buffer =
      typeof chunk === 'string' ? Buffer.from(chunk) : Buffer.from(chunk);
    bytes += buffer.byteLength;
    if (bytes > maxBytes) {
      throw new ReviewJsonCommandError({
        category: 'input',
        code: 'review-json-stdin-too-large',
        message: `review JSON stdin exceeds ${maxBytes} bytes`,
        details: { maxBytes },
      });
    }
    chunks.push(buffer);
  }
  const source = new TextDecoder('utf-8', { fatal: true }).decode(
    Buffer.concat(chunks),
  );
  if (source.trim().length === 0) {
    throw new ReviewJsonCommandError({
      category: 'input',
      code: 'review-json-stdin-empty',
      message: 'review JSON stdin is empty',
    });
  }
  try {
    canonicalizeJson(source, { jsonText: true });
    return JSON.parse(source) as unknown;
  } catch (error) {
    throw new ReviewJsonCommandError({
      category: 'input',
      code: 'review-json-stdin-invalid',
      message:
        'review JSON stdin must contain exactly one strict JSON document',
      details: {
        cause: error instanceof Error ? error.message : String(error),
      },
    });
  }
}

export async function runReviewJsonCommand<T>(input: {
  operation: () => Promise<T>;
  write: (output: string) => void;
}): Promise<0 | 1 | 2> {
  let envelope: ReviewCliEnvelope<T>;
  let exitCode: 0 | 1 | 2;
  try {
    envelope = { ok: true, result: await input.operation() };
    exitCode = 0;
  } catch (error) {
    const known =
      error instanceof ReviewJsonCommandError ||
      error instanceof ReviewDomainError
        ? error
        : new ReviewJsonCommandError({
            category: 'system',
            code: 'review-json-system-error',
            message: 'review command failed unexpectedly',
          });
    const result =
      known instanceof ReviewJsonCommandError ? known.result : undefined;
    envelope = {
      ok: false,
      error: {
        category: known.category,
        code: known.code,
        message: known.message,
        details: known.details,
      },
      ...(result === undefined ? {} : { result: result as T }),
    };
    exitCode = known.category === 'system' ? 2 : 1;
  }
  input.write(`${JSON.stringify(envelope)}\n`);
  return exitCode;
}
