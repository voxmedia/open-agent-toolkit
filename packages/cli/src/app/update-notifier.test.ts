import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  maybeNotifyAboutUpdate,
  resolveUpdateAvailability,
  type UpdateNotifierDependencies,
  type UpdateNotifierOptions,
} from './update-notifier';

const NOW = new Date('2026-07-13T12:00:00.000Z');
const DAY = 24 * 60 * 60 * 1000;

function createLogger() {
  return {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
    json: vi.fn(),
  };
}

function response(body: unknown, ok = true): Response {
  return {
    ok,
    json: vi.fn(async () => body),
  } as unknown as Response;
}

interface HarnessOverrides {
  options?: Partial<UpdateNotifierOptions>;
  cache?: unknown;
  readCacheError?: unknown;
  userConfig?: { version: number; updateNotifications?: boolean };
  readUserConfigError?: unknown;
  fetchImpl?: UpdateNotifierDependencies['fetch'];
  writeError?: unknown;
}

function createHarness(overrides: HarnessOverrides = {}) {
  const logger = createLogger();
  const timeoutSignal = new AbortController().signal;
  const readFile = overrides.readCacheError
    ? vi.fn(async () => {
        throw overrides.readCacheError;
      })
    : vi.fn(async () => JSON.stringify(overrides.cache ?? {}));
  const atomicWriteJson = overrides.writeError
    ? vi.fn(async () => {
        throw overrides.writeError;
      })
    : vi.fn(async () => undefined);
  const fetchImpl =
    overrides.fetchImpl ?? vi.fn(async () => response({ version: '1.1.0' }));
  const dependencies: UpdateNotifierDependencies = {
    now: () => NOW,
    readFile,
    atomicWriteJson,
    readUserConfig: overrides.readUserConfigError
      ? vi.fn(async () => {
          throw overrides.readUserConfigError;
        })
      : vi.fn(async () => overrides.userConfig ?? { version: 1 }),
    fetch: fetchImpl,
    createTimeoutSignal: vi.fn(() => timeoutSignal),
  };
  const options: UpdateNotifierOptions = {
    currentVersion: '1.0.0',
    home: '/home/tester',
    interactive: true,
    json: false,
    argv: ['/usr/bin/node', '/opt/oat/dist/index.js', 'status'],
    env: {},
    logger,
    ...overrides.options,
  };

  return {
    atomicWriteJson,
    dependencies,
    fetch: fetchImpl,
    logger,
    options,
    readFile,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('resolveUpdateAvailability', () => {
  it('returns the exact validated newer stable version without emitting a notice', async () => {
    const harness = createHarness({
      cache: {
        checkedAt: NOW.toISOString(),
        latestVersion: '1.2.3',
      },
    });

    await expect(
      resolveUpdateAvailability(harness.options, harness.dependencies),
    ).resolves.toBe('1.2.3');

    expect(harness.fetch).not.toHaveBeenCalled();
    expect(harness.logger.warn).not.toHaveBeenCalled();
    expect(harness.atomicWriteJson).not.toHaveBeenCalled();
  });

  it.each([
    ['current', {}, { currentVersion: '1.2.3' }],
    ['invalid current', {}, { currentVersion: 'development' }],
    ['unavailable', {}, {}],
    ['opted out', { version: 1, updateNotifications: false }, {}],
    ['JSON', { version: 1 }, { json: true }],
    ['non-interactive', { version: 1 }, { interactive: false }],
    ['CI', { version: 1 }, { env: { CI: '1' } }],
  ] satisfies Array<
    [
      string,
      { version?: number; updateNotifications?: boolean },
      Partial<UpdateNotifierOptions>,
    ]
  >)(
    'returns null when an update is %s or the invocation is suppressed',
    async (name, userConfig, options) => {
      const harness = createHarness({
        cache:
          name === 'unavailable'
            ? { checkedAt: NOW.toISOString() }
            : {
                checkedAt: NOW.toISOString(),
                latestVersion: '1.2.3',
              },
        userConfig: {
          version: userConfig.version ?? 1,
          updateNotifications: userConfig.updateNotifications,
        },
        options,
      });

      await expect(
        resolveUpdateAvailability(harness.options, harness.dependencies),
      ).resolves.toBeNull();
      expect(harness.logger.warn).not.toHaveBeenCalled();
    },
  );

  it('preserves refresh backoff when resolving availability for a guard', async () => {
    const harness = createHarness({
      fetchImpl: vi.fn(async () => {
        throw new Error('offline');
      }),
    });

    await expect(
      resolveUpdateAvailability(harness.options, harness.dependencies),
    ).resolves.toBeNull();

    expect(harness.atomicWriteJson).toHaveBeenCalledWith(
      '/home/tester/.oat/update-check.json',
      { checkedAt: NOW.toISOString() },
    );
  });
});

describe('maybeNotifyAboutUpdate', () => {
  it.each([
    ['non-interactive', { interactive: false }],
    ['JSON', { json: true }],
    ['CI', { env: { CI: '1' } }],
    ['test', { env: { NODE_ENV: 'test' } }],
    [
      'source-development',
      { argv: ['/usr/bin/node', '/repo/packages/cli/src/index.ts', 'status'] },
    ],
    [
      'ephemeral npm exec',
      {
        env: {
          npm_command: 'exec',
          npm_config_user_agent: 'npm/11.0.0 node/v22.17.0 linux x64',
        },
      },
    ],
    [
      'ephemeral npx executable',
      { env: { npm_execpath: '/usr/lib/node_modules/npm/bin/npx-cli.js' } },
    ],
    ['environment-opted-out', { env: { NO_UPDATE_NOTIFIER: '1' } }],
  ] satisfies Array<[string, Partial<UpdateNotifierOptions>]>)(
    'skips %s invocations before reading persistent state',
    async (_name, options) => {
      const harness = createHarness({ options });

      await expect(
        maybeNotifyAboutUpdate(harness.options, harness.dependencies),
      ).resolves.toBeUndefined();

      expect(harness.dependencies.readUserConfig).not.toHaveBeenCalled();
      expect(harness.readFile).not.toHaveBeenCalled();
      expect(harness.fetch).not.toHaveBeenCalled();
      expect(harness.logger.warn).not.toHaveBeenCalled();
    },
  );

  it('skips an invocation when the user preference is false', async () => {
    const harness = createHarness({
      userConfig: { version: 1, updateNotifications: false },
    });

    await maybeNotifyAboutUpdate(harness.options, harness.dependencies);

    expect(harness.dependencies.readUserConfig).toHaveBeenCalledWith(
      '/home/tester/.oat',
    );
    expect(harness.readFile).not.toHaveBeenCalled();
    expect(harness.fetch).not.toHaveBeenCalled();
  });

  it.each(['1.0.0-beta.1', 'v1.0.0', '1.0', 'not-a-version'])(
    'suppresses malformed or prerelease current version %s',
    async (currentVersion) => {
      const harness = createHarness({ options: { currentVersion } });

      await maybeNotifyAboutUpdate(harness.options, harness.dependencies);

      expect(harness.fetch).not.toHaveBeenCalled();
      expect(harness.logger.warn).not.toHaveBeenCalled();
    },
  );

  it('compares stable numeric version tuples rather than strings', async () => {
    const harness = createHarness({
      options: { currentVersion: '1.9.9' },
      cache: {
        checkedAt: NOW.toISOString(),
        latestVersion: '1.10.0',
      },
    });

    await maybeNotifyAboutUpdate(harness.options, harness.dependencies);

    expect(harness.fetch).not.toHaveBeenCalled();
    expect(harness.logger.warn).toHaveBeenCalledOnce();
  });

  it.each(['1.0.0', '0.99.99'])(
    'does not notify when cached latest %s is not newer',
    async (latestVersion) => {
      const harness = createHarness({
        cache: {
          checkedAt: NOW.toISOString(),
          latestVersion,
        },
      });

      await maybeNotifyAboutUpdate(harness.options, harness.dependencies);

      expect(harness.fetch).not.toHaveBeenCalled();
      expect(harness.logger.warn).not.toHaveBeenCalled();
    },
  );

  it('uses a fresh cache without contacting the registry', async () => {
    const harness = createHarness({
      cache: {
        checkedAt: new Date(NOW.getTime() - DAY + 1).toISOString(),
        latestVersion: '1.1.0',
      },
    });

    await maybeNotifyAboutUpdate(harness.options, harness.dependencies);

    expect(harness.fetch).not.toHaveBeenCalled();
    expect(harness.logger.warn).toHaveBeenCalledOnce();
  });

  it('refreshes at the 24-hour boundary with the encoded latest endpoint and timeout', async () => {
    const harness = createHarness({
      cache: {
        checkedAt: new Date(NOW.getTime() - DAY).toISOString(),
        latestVersion: '1.0.0',
      },
    });

    await maybeNotifyAboutUpdate(harness.options, harness.dependencies);

    expect(harness.dependencies.createTimeoutSignal).toHaveBeenCalledWith(1500);
    expect(harness.fetch).toHaveBeenCalledWith(
      'https://registry.npmjs.org/@open-agent-toolkit%2fcli/latest',
      expect.objectContaining({
        signal: expect.any(AbortSignal),
      }),
    );
    expect(harness.atomicWriteJson).toHaveBeenCalledWith(
      '/home/tester/.oat/update-check.json',
      {
        checkedAt: NOW.toISOString(),
        latestVersion: '1.1.0',
        lastNotifiedAt: NOW.toISOString(),
        lastNotifiedVersion: '1.1.0',
      },
    );
  });

  it.each([
    [
      'timeout',
      vi.fn(async () => {
        throw new DOMException('timed out', 'TimeoutError');
      }),
    ],
    [
      'network error',
      vi.fn(async () => {
        throw new Error('offline');
      }),
    ],
    ['non-success HTTP', vi.fn(async () => response({}, false))],
    [
      'malformed JSON',
      vi.fn(async () => {
        return {
          ok: true,
          json: async () => {
            throw new SyntaxError('bad json');
          },
        } as Response;
      }),
    ],
    [
      'invalid version',
      vi.fn(async () => response({ version: '2.0.0-beta.1' })),
    ],
    ['malformed version', vi.fn(async () => response({ version: 'latest' }))],
  ] satisfies Array<[string, UpdateNotifierDependencies['fetch']]>)(
    'records a failed %s refresh while preserving a trusted cached version',
    async (_name, fetchImpl) => {
      const harness = createHarness({
        cache: {
          checkedAt: new Date(NOW.getTime() - 2 * DAY).toISOString(),
          latestVersion: '1.0.5',
        },
        fetchImpl,
      });

      await expect(
        maybeNotifyAboutUpdate(harness.options, harness.dependencies),
      ).resolves.toBeUndefined();

      expect(harness.atomicWriteJson).toHaveBeenCalledWith(
        '/home/tester/.oat/update-check.json',
        {
          checkedAt: NOW.toISOString(),
          latestVersion: '1.0.5',
          lastNotifiedAt: NOW.toISOString(),
          lastNotifiedVersion: '1.0.5',
        },
      );
      expect(harness.logger.warn).toHaveBeenCalledOnce();
    },
  );

  it('backs off for 24 hours after a failed refresh attempt', async () => {
    let stored: unknown = {};
    const fetchImpl = vi.fn(async () => {
      throw new Error('offline');
    });
    const harness = createHarness({ fetchImpl });
    harness.dependencies.readFile = vi.fn(async () => JSON.stringify(stored));
    harness.dependencies.atomicWriteJson = vi.fn(async (_path, value) => {
      stored = value;
    });

    await maybeNotifyAboutUpdate(harness.options, harness.dependencies);
    await maybeNotifyAboutUpdate(harness.options, harness.dependencies);

    expect(fetchImpl).toHaveBeenCalledOnce();
    expect(stored).toEqual({ checkedAt: NOW.toISOString() });
  });

  it('suppresses the same version notice for 72 hours', async () => {
    const harness = createHarness({
      cache: {
        checkedAt: NOW.toISOString(),
        latestVersion: '1.1.0',
        lastNotifiedAt: new Date(NOW.getTime() - 3 * DAY + 1).toISOString(),
        lastNotifiedVersion: '1.1.0',
      },
    });

    await maybeNotifyAboutUpdate(harness.options, harness.dependencies);

    expect(harness.logger.warn).not.toHaveBeenCalled();
    expect(harness.atomicWriteJson).not.toHaveBeenCalled();
  });

  it('repeats the same version notice at the 72-hour boundary', async () => {
    const harness = createHarness({
      cache: {
        checkedAt: NOW.toISOString(),
        latestVersion: '1.1.0',
        lastNotifiedAt: new Date(NOW.getTime() - 3 * DAY).toISOString(),
        lastNotifiedVersion: '1.1.0',
      },
    });

    await maybeNotifyAboutUpdate(harness.options, harness.dependencies);

    expect(harness.logger.warn).toHaveBeenCalledOnce();
  });

  it('notifies immediately when a different newer version is cached', async () => {
    const harness = createHarness({
      cache: {
        checkedAt: NOW.toISOString(),
        latestVersion: '1.2.0',
        lastNotifiedAt: new Date(NOW.getTime() - DAY).toISOString(),
        lastNotifiedVersion: '1.1.0',
      },
    });

    await maybeNotifyAboutUpdate(harness.options, harness.dependencies);

    expect(harness.logger.warn).toHaveBeenCalledOnce();
  });

  it('emits the exact notice and atomically records the complete cache snapshot', async () => {
    const harness = createHarness({
      cache: {
        checkedAt: NOW.toISOString(),
        latestVersion: '2.0.0',
      },
    });

    await maybeNotifyAboutUpdate(harness.options, harness.dependencies);

    expect(harness.logger.warn).toHaveBeenCalledWith(
      'Update available: 1.0.0 → 2.0.0\n' +
        'Run: npm install -g @open-agent-toolkit/cli@latest',
    );
    expect(harness.atomicWriteJson).toHaveBeenCalledOnce();
    expect(harness.atomicWriteJson).toHaveBeenCalledWith(
      '/home/tester/.oat/update-check.json',
      {
        checkedAt: NOW.toISOString(),
        latestVersion: '2.0.0',
        lastNotifiedAt: NOW.toISOString(),
        lastNotifiedVersion: '2.0.0',
      },
    );
  });

  it('validates malformed cache fields independently', async () => {
    const harness = createHarness({
      cache: {
        checkedAt: 'yesterday',
        latestVersion: '2.0.0',
        lastNotifiedAt: 42,
        lastNotifiedVersion: '2.0.0-beta.1',
      },
      fetchImpl: vi.fn(async () => response({ version: 'invalid' })),
    });

    await maybeNotifyAboutUpdate(harness.options, harness.dependencies);

    expect(harness.atomicWriteJson).toHaveBeenCalledWith(
      '/home/tester/.oat/update-check.json',
      {
        checkedAt: NOW.toISOString(),
        latestVersion: '2.0.0',
        lastNotifiedAt: NOW.toISOString(),
        lastNotifiedVersion: '2.0.0',
      },
    );
  });

  it.each([
    ['user config read', { readUserConfigError: new Error('config denied') }],
    ['cache read', { readCacheError: new Error('cache denied') }],
    ['cache write', { writeError: new Error('disk full') }],
  ] satisfies Array<[string, HarnessOverrides]>)(
    'never throws when %s fails',
    async (_name, overrides) => {
      const harness = createHarness(overrides);

      await expect(
        maybeNotifyAboutUpdate(harness.options, harness.dependencies),
      ).resolves.toBeUndefined();
    },
  );

  it('contains logger failures', async () => {
    const harness = createHarness({
      cache: {
        checkedAt: NOW.toISOString(),
        latestVersion: '2.0.0',
      },
    });
    harness.logger.warn.mockImplementation(() => {
      throw new Error('logger unavailable');
    });

    await expect(
      maybeNotifyAboutUpdate(harness.options, harness.dependencies),
    ).resolves.toBeUndefined();
  });
});
