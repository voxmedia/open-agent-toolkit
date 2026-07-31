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
        launcherInvocation: { executable: '/node', argvPrefix: ['/oat'] },
      })) as never,
      readKey: vi.fn(async () => key),
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
    close();
    await running;

    expect(start).toHaveBeenCalledWith(
      expect.objectContaining({
        socketPath: '/tmp/broker.sock',
        key,
      }),
    );
    expect(key).toEqual(Buffer.alloc(32));
  });
});
