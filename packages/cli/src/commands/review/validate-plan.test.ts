import { Readable } from 'node:stream';

import type { ReviewPlanV1 } from '@review/types';
import { describe, expect, it, vi } from 'vitest';

import { createReviewValidatePlanCommand } from './validate-plan';

const plan = { schemaVersion: 1, runId: 'run-1' } as ReviewPlanV1;

describe('createReviewValidatePlanCommand', () => {
  it('returns a receipt for a valid plan', async () => {
    const write = vi.fn();
    const validate = vi.fn(async () => ({
      valid: true as const,
      receipt: { token: 'receipt-1' },
    }));
    const command = createReviewValidatePlanCommand({
      stdin: Readable.from([
        JSON.stringify({
          validationRunId: 'run-1',
          commandToken: 'plan-token',
          plan,
        }),
      ]),
      write,
      setExitCode: vi.fn(),
      validate: validate as never,
      lifecycle: {} as never,
    });

    await command.parseAsync(['node', 'oat', 'validate-plan']);

    expect(validate).toHaveBeenCalledWith(
      { runId: 'run-1', commandToken: 'plan-token', plan },
      {},
    );
    expect(JSON.parse(write.mock.calls[0]?.[0] as string)).toMatchObject({
      ok: true,
      result: { valid: true, receipt: { token: 'receipt-1' } },
    });
  });

  it('emits validation failure with result and exit one', async () => {
    const write = vi.fn();
    const setExitCode = vi.fn();
    const command = createReviewValidatePlanCommand({
      stdin: Readable.from([
        JSON.stringify({
          validationRunId: 'run-1',
          commandToken: 'plan-token',
          plan,
        }),
      ]),
      write,
      setExitCode,
      validate: vi.fn(async () => ({
        valid: false,
        errors: [
          { code: 'missing-path-owner', pointer: '/lanes', message: 'missing' },
        ],
      })),
      lifecycle: {} as never,
    });

    await command.parseAsync(['node', 'oat', 'validate-plan']);

    expect(setExitCode).toHaveBeenCalledWith(1);
    expect(JSON.parse(write.mock.calls[0]?.[0] as string)).toMatchObject({
      ok: false,
      error: { category: 'validation', code: 'invalid-review-plan' },
      result: { valid: false, errors: [{ code: 'missing-path-owner' }] },
    });
  });
});
