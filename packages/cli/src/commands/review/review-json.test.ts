import { Readable } from 'node:stream';

import { ReviewDomainError } from '@review/errors';
import { describe, expect, it, vi } from 'vitest';

import {
  readBoundedJsonStdin,
  ReviewJsonCommandError,
  runReviewJsonCommand,
} from './review-json';

describe('review JSON command boundary', () => {
  it('reads one bounded strict JSON document', async () => {
    await expect(
      readBoundedJsonStdin(Readable.from(['{"name":"review"}'])),
    ).resolves.toEqual({ name: 'review' });
    await expect(
      readBoundedJsonStdin(Readable.from(['{"a":1,"a":2}'])),
    ).rejects.toMatchObject({ code: 'review-json-stdin-invalid' });
    await expect(
      readBoundedJsonStdin(Readable.from(['{}{}'])),
    ).rejects.toMatchObject({ code: 'review-json-stdin-invalid' });
    await expect(
      readBoundedJsonStdin(Readable.from(['12345']), 4),
    ).rejects.toMatchObject({ code: 'review-json-stdin-too-large' });
  });

  it.each([
    {
      operation: async () => ({ validationRunId: 'run-1' }),
      exitCode: 0,
      envelope: { ok: true, result: { validationRunId: 'run-1' } },
    },
    {
      operation: async () => {
        throw new ReviewJsonCommandError({
          category: 'validation',
          code: 'invalid-review-plan',
          message: 'review plan is invalid',
          result: { valid: false },
        });
      },
      exitCode: 1,
      envelope: {
        ok: false,
        error: {
          category: 'validation',
          code: 'invalid-review-plan',
          message: 'review plan is invalid',
          details: null,
        },
        result: { valid: false },
      },
    },
    {
      operation: async () => {
        throw new ReviewDomainError({
          category: 'contract',
          code: 'capability-rejected',
          message: 'review capability was rejected',
        });
      },
      exitCode: 1,
      envelope: {
        ok: false,
        error: {
          category: 'contract',
          code: 'capability-rejected',
          message: 'review capability was rejected',
          details: null,
        },
      },
    },
    {
      operation: async () => {
        throw new Error('/private/store/state.json: disk failed');
      },
      exitCode: 2,
      envelope: {
        ok: false,
        error: {
          category: 'system',
          code: 'review-json-system-error',
          message: 'review command failed unexpectedly',
          details: null,
        },
      },
    },
  ])(
    'emits exactly one JSON envelope and maps exit $exitCode',
    async (fixture) => {
      const write = vi.fn();

      await expect(
        runReviewJsonCommand({ operation: fixture.operation, write }),
      ).resolves.toBe(fixture.exitCode);
      expect(write).toHaveBeenCalledTimes(1);
      const output = write.mock.calls[0]?.[0] as string;
      expect(output.endsWith('\n')).toBe(true);
      expect(JSON.parse(output)).toEqual(fixture.envelope);
    },
  );
});
