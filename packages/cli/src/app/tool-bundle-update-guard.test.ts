import { Command } from 'commander';
import { describe, expect, it, vi } from 'vitest';

import {
  guardBundledToolMutation,
  isBundledToolMutationCommand,
  type ToolBundleUpdateGuardDependencies,
  type ToolBundleUpdateGuardOptions,
} from './tool-bundle-update-guard';

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

function commandAtPath(path: string[]): Command {
  const root = new Command('oat');
  let parent = root;
  for (const name of path) {
    const child = new Command(name);
    parent.addCommand(child);
    parent = child;
  }
  return parent;
}

function createHarness(
  overrides: {
    availableVersion?: string | null;
    confirmed?: boolean;
    installError?: Error;
    options?: Partial<ToolBundleUpdateGuardOptions>;
  } = {},
) {
  const logger = createLogger();
  const resolveUpdateAvailability = vi.fn(async () =>
    overrides.availableVersion === undefined
      ? '1.2.3'
      : overrides.availableVersion,
  );
  const confirmAction = vi.fn(async () => overrides.confirmed ?? false);
  const installCli = overrides.installError
    ? vi.fn(async () => {
        throw overrides.installError;
      })
    : vi.fn(async () => undefined);
  const dependencies: ToolBundleUpdateGuardDependencies = {
    resolveUpdateAvailability,
    confirmAction,
    installCli,
  };
  const options: ToolBundleUpdateGuardOptions = {
    currentVersion: '1.0.0',
    home: '/home/tester',
    interactive: true,
    json: false,
    dryRun: false,
    argv: ['/usr/bin/node', '/opt/oat/dist/index.js', 'tools', 'update'],
    env: {},
    logger,
    command: 'oat tools update',
    ...overrides.options,
  };

  return {
    confirmAction,
    dependencies,
    installCli,
    logger,
    options,
    resolveUpdateAvailability,
  };
}

describe('isBundledToolMutationCommand', () => {
  it.each([
    [['init'], true],
    [['init', 'tools'], true],
    [['init', 'tools', 'core'], true],
    [['tools', 'install'], true],
    [['tools', 'install', 'docs'], true],
    [['tools', 'update'], true],
    [['tools', 'list'], false],
    [['tools', 'outdated'], false],
    [['docs', 'init'], false],
    [['decision', 'init'], false],
    [['status'], false],
  ] satisfies Array<[string[], boolean]>)(
    'classifies oat %s as guarded=%s',
    (path, guarded) => {
      expect(isBundledToolMutationCommand(commandAtPath(path))).toBe(guarded);
    },
  );
});

describe('guardBundledToolMutation', () => {
  it('installs the exact validated version and asks for the original command to be rerun', async () => {
    const harness = createHarness({ confirmed: true });

    await expect(
      guardBundledToolMutation(harness.options, harness.dependencies),
    ).resolves.toBe(true);

    expect(harness.resolveUpdateAvailability).toHaveBeenCalledOnce();
    expect(harness.resolveUpdateAvailability).toHaveBeenCalledWith(
      expect.objectContaining({
        currentVersion: '1.0.0',
        interactive: true,
        json: false,
      }),
    );
    expect(harness.confirmAction).toHaveBeenCalledWith(
      expect.stringContaining('1.2.3'),
      { interactive: true },
    );
    expect(harness.installCli).toHaveBeenCalledOnce();
    expect(harness.installCli).toHaveBeenCalledWith(
      'npm',
      ['install', '--global', '@open-agent-toolkit/cli@1.2.3'],
      { shell: false, stdio: 'inherit' },
    );
    expect(harness.logger.info).toHaveBeenCalledWith(
      expect.stringContaining('rerun `oat tools update`'),
    );
  });

  it.each([
    ['decline', false],
    ['prompt abort', false],
  ])('warns and continues with the current bundle after %s', async () => {
    const harness = createHarness({ confirmed: false });

    await expect(
      guardBundledToolMutation(harness.options, harness.dependencies),
    ).resolves.toBe(false);

    expect(harness.installCli).not.toHaveBeenCalled();
    expect(harness.logger.warn).toHaveBeenCalledWith(
      expect.stringMatching(
        /continuing.*current CLI.*bundle.*older.*available CLI/is,
      ),
    );
  });

  it.each([
    ['current CLI', null, {}],
    ['invalid CLI version', null, { currentVersion: 'development' }],
    ['unavailable metadata', null, {}],
    ['user opt-out', null, {}],
    ['JSON', null, { json: true }],
    ['non-interactive', null, { interactive: false }],
    ['source development', null, { argv: ['node', '/repo/src/index.ts'] }],
    ['test', null, { env: { NODE_ENV: 'test' } }],
    ['CI', null, { env: { CI: '1' } }],
    ['ephemeral runner', null, { env: { npm_command: 'exec' } }],
  ] satisfies Array<
    [string, string | null, Partial<ToolBundleUpdateGuardOptions>]
  >)(
    'does not prompt or install for a %s path',
    async (_name, availableVersion, options) => {
      const harness = createHarness({ availableVersion, options });

      await expect(
        guardBundledToolMutation(harness.options, harness.dependencies),
      ).resolves.toBe(false);

      expect(harness.confirmAction).not.toHaveBeenCalled();
      expect(harness.installCli).not.toHaveBeenCalled();
    },
  );

  it('does not resolve availability, prompt, or install during dry-run', async () => {
    const harness = createHarness({ options: { dryRun: true } });

    await expect(
      guardBundledToolMutation(harness.options, harness.dependencies),
    ).resolves.toBe(false);

    expect(harness.resolveUpdateAvailability).not.toHaveBeenCalled();
    expect(harness.confirmAction).not.toHaveBeenCalled();
    expect(harness.installCli).not.toHaveBeenCalled();
  });

  it('prevents mutation and surfaces an actionable installer failure', async () => {
    const harness = createHarness({
      confirmed: true,
      installError: new Error('permission denied'),
    });

    await expect(
      guardBundledToolMutation(harness.options, harness.dependencies),
    ).rejects.toMatchObject({
      message: expect.stringMatching(
        /failed to update.*npm install --global @open-agent-toolkit\/cli@1\.2\.3/is,
      ),
      exitCode: 2,
    });

    expect(harness.logger.info).not.toHaveBeenCalled();
  });
});
