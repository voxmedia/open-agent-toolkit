import { Readable } from 'node:stream';

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
      stdin: Readable.from([
        JSON.stringify({ validationRunId: 'run-1', receipt: 'receipt-1' }),
      ]),
      write,
      setExitCode,
      begin,
      lifecycle: {} as never,
    });

    await command.parseAsync(['node', 'oat', 'begin-evidence']);

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

  it('rejects missing receipt before the lifecycle boundary', async () => {
    const write = vi.fn();
    const begin = vi.fn();
    const command = createReviewBeginEvidenceCommand({
      stdin: Readable.from([JSON.stringify({ validationRunId: 'run-1' })]),
      write,
      setExitCode: vi.fn(),
      begin,
      lifecycle: {} as never,
    });

    await command.parseAsync(['node', 'oat', 'begin-evidence']);

    expect(begin).not.toHaveBeenCalled();
    expect(JSON.parse(write.mock.calls[0]?.[0] as string)).toMatchObject({
      ok: false,
      error: { category: 'input', code: 'invalid-begin-evidence-input' },
    });
  });
});
