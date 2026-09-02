import { Readable } from 'node:stream';

import { describe, expect, it, vi } from 'vitest';

import { createReviewBindAcceptedContinuationCommand } from './bind-accepted-continuation';

describe('createReviewBindAcceptedContinuationCommand', () => {
  it('forwards exact bounded continuation JSON to the private broker', async () => {
    const request = vi.fn(async () => ({
      validationRunId: 'abcdefghijklmnop',
      acceptedHandleDigest: 'a'.repeat(64),
    }));
    const write = vi.fn();
    const command = createReviewBindAcceptedContinuationCommand({
      stdin: Readable.from([
        JSON.stringify({ schemaVersion: 1, handleId: 'opaque-host-handle' }),
      ]),
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
      '--stdin',
      '--json',
    ]);

    expect(request).toHaveBeenCalledWith('/tmp/broker.sock', {
      action: 'bind-accepted-continuation',
      runId: 'abcdefghijklmnop',
      coordinatorToken: 'coordinator-capability',
      handleId: 'opaque-host-handle',
    });
    expect(JSON.parse(write.mock.calls[0]?.[0] as string)).toMatchObject({
      ok: true,
      result: { acceptedHandleDigest: 'a'.repeat(64) },
    });
  });

  it.each([
    { schemaVersion: 1, handleId: '' },
    { schemaVersion: 1, handleId: 'handle', extra: true },
    { schemaVersion: 2, handleId: 'handle' },
  ])('rejects non-exact input %#', async (input) => {
    const request = vi.fn();
    const write = vi.fn();
    const command = createReviewBindAcceptedContinuationCommand({
      stdin: Readable.from([JSON.stringify(input)]),
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
      '--stdin',
      '--json',
    ]);
    expect(request).not.toHaveBeenCalled();
    expect(JSON.parse(write.mock.calls[0]?.[0] as string)).toMatchObject({
      ok: false,
      error: { code: 'invalid-accepted-continuation-input' },
    });
  });
});
