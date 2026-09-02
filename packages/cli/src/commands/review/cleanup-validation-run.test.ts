import { describe, expect, it, vi } from 'vitest';

import { createReviewCleanupValidationRunCommand } from './cleanup-validation-run';

describe('createReviewCleanupValidationRunCommand', () => {
  it('requests exact broker cleanup without stdin', async () => {
    const request = vi.fn(async () => ({
      validationRunId: 'abcdefghijklmnop',
      cleaned: true as const,
    }));
    const write = vi.fn();
    const command = createReviewCleanupValidationRunCommand({
      request,
      write,
      setExitCode: vi.fn(),
    });

    await command.parseAsync([
      'node',
      'oat',
      '--run-id',
      'abcdefghijklmnop',
      '--coordinator-token',
      'coordinator-capability',
      '--broker-socket',
      '/tmp/broker.sock',
      '--json',
    ]);

    expect(request).toHaveBeenCalledWith('/tmp/broker.sock', {
      action: 'cleanup-validation-run',
      runId: 'abcdefghijklmnop',
      coordinatorToken: 'coordinator-capability',
    });
    expect(JSON.parse(write.mock.calls[0]?.[0] as string)).toMatchObject({
      ok: true,
      result: { cleaned: true },
    });
  });
});
