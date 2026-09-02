import { ReviewDomainError } from '@review/errors';
import { describe, expect, it, vi } from 'vitest';

import { createReviewBeginEvidenceCommand } from './begin-evidence';

describe('createReviewBeginEvidenceCommand', () => {
  it('passes exact receipt identity and returns evidence_started', async () => {
    const write = vi.fn();
    const begin = vi.fn(async () => ({
      validationRunId: 'run-1',
      phase: 'evidence_started' as const,
    }));
    const setExitCode = vi.fn();
    const command = createReviewBeginEvidenceCommand({
      write,
      setExitCode,
      begin,
      lifecycle: {} as never,
    });

    await command.parseAsync([
      'node',
      'oat',
      'begin-evidence',
      '--run-id',
      'run-1',
      '--receipt',
      'receipt-1',
      '--json',
    ]);

    expect(begin).toHaveBeenCalledWith(
      { runId: 'run-1', receipt: 'receipt-1' },
      {},
    );
    expect(setExitCode).toHaveBeenCalledWith(0);
    expect(JSON.parse(write.mock.calls[0]?.[0] as string)).toEqual({
      ok: true,
      result: { validationRunId: 'run-1', phase: 'evidence_started' },
    });
  });

  it('requires the exact trusted argv contract', async () => {
    const begin = vi.fn();
    const command = createReviewBeginEvidenceCommand({
      write: vi.fn(),
      setExitCode: vi.fn(),
      begin,
      lifecycle: {} as never,
    }).exitOverride();

    await expect(
      command.parseAsync([
        'node',
        'oat',
        'begin-evidence',
        '--run-id',
        'run-1',
        '--json',
      ]),
    ).rejects.toMatchObject({ code: 'commander.missingMandatoryOptionValue' });

    expect(begin).not.toHaveBeenCalled();
  });

  it('maps receipt rejection to a safe exit-one envelope', async () => {
    const write = vi.fn();
    const setExitCode = vi.fn();
    const command = createReviewBeginEvidenceCommand({
      write,
      setExitCode,
      begin: vi.fn(async () => {
        throw new ReviewDomainError({
          category: 'validation',
          code: 'plan-receipt-identity-mismatch',
          message: 'plan receipt identity mismatch',
        });
      }),
      lifecycle: {} as never,
    });
    await command.parseAsync([
      'node',
      'oat',
      'begin-evidence',
      '--run-id',
      'run-1',
      '--receipt',
      'mismatch',
      '--json',
    ]);

    expect(setExitCode).toHaveBeenCalledWith(1);
    expect(JSON.parse(write.mock.calls[0]?.[0] as string)).toMatchObject({
      ok: false,
      error: {
        category: 'validation',
        code: 'plan-receipt-identity-mismatch',
      },
    });
  });
});
