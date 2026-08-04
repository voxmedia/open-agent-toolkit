import { describe, expect, it, vi } from 'vitest';

import { createReviewAuthorityBrokerCommand } from './authority-broker';

describe('createReviewAuthorityBrokerCommand', () => {
  it('reads startup material from inherited channels and clears the key', async () => {
    const key = Buffer.alloc(32, 7);
    let close!: () => void;
    const closed = new Promise<void>((resolve) => {
      close = resolve;
    });
    const write = vi.fn();
    const start = vi.fn(async () => ({
      preparation: { preparation: { runId: 'run-1' } },
      closed,
    }));
    const command = createReviewAuthorityBrokerCommand({
      readStartup: vi.fn(async () => ({
        input: { repoRoot: '/repo' },
        launcherInvocation: {
          executable: '/node',
          argvPrefix: ['/oat'],
          cwd: '/branch',
        },
      })) as never,
      readKey: vi.fn(async () => key),
      readCoordinatorCapabilities: vi.fn(async () => ({
        schemaVersion: 1,
        bindToken: 'bind-capability-token',
        cleanupToken: 'cleanup-capability-token',
      })),
      write,
      start: start as never,
    });
    const running = command.parseAsync([
      'node',
      'oat',
      'authority-broker',
      '--socket',
      '/tmp/broker.sock',
    ]);
    await vi.waitFor(() => expect(write).toHaveBeenCalledOnce());
    expect(key).toEqual(Buffer.alloc(32, 7));
    close();
    await running;

    expect(start).toHaveBeenCalledWith(
      expect.objectContaining({
        socketPath: '/tmp/broker.sock',
        key,
        coordinatorCapabilities: {
          schemaVersion: 1,
          bindToken: 'bind-capability-token',
          cleanupToken: 'cleanup-capability-token',
        },
      }),
    );
    expect(key).toEqual(Buffer.alloc(32));
  });
});
