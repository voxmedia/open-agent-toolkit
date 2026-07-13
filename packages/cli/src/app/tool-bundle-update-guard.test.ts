import { Command } from 'commander';
import { describe, expect, it, vi } from 'vitest';

import {
  formatRerunCommand,
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
    platform?: NodeJS.Platform;
    nodeExecutable?: string;
    existingPaths?: string[];
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
    platform: overrides.platform ?? 'linux',
    nodeExecutable: overrides.nodeExecutable ?? '/usr/bin/node',
    fileExists: vi.fn(
      (path) => overrides.existingPaths?.includes(path) ?? false,
    ),
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
    commandPath: 'oat tools update',
    rerunCommand: {
      shell: 'POSIX shell',
      command: 'oat tools update --all',
    },
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

describe('formatRerunCommand', () => {
  it('preserves normalized arguments with POSIX-safe quoting', () => {
    expect(
      formatRerunCommand(
        [
          '/usr/bin/node',
          '/opt/oat/dist/index.js',
          'tools',
          'update',
          'name with spaces',
          '$(touch /tmp/not-run)',
          "quote'value",
        ],
        'linux',
      ),
    ).toEqual({
      shell: 'POSIX shell',
      command:
        "oat tools update 'name with spaces' '$(touch /tmp/not-run)' 'quote'\"'\"'value'",
    });
  });

  it('uses explicitly labeled PowerShell-safe quoting for Windows arguments', () => {
    expect(
      formatRerunCommand(
        [
          'C:\\Program Files\\nodejs\\node.exe',
          'C:\\Program Files\\oat\\index.js',
          'init',
          '--cwd',
          'C:\\Program Files\\repo',
          "single'quote",
          'double"quote',
          'C:\\repo\\with\\backslashes',
          '$value',
          'left&right',
          'left|right',
          'left<right',
          'left>right',
          '100%',
          'bang!',
        ],
        'win32',
      ),
    ).toEqual({
      shell: 'PowerShell',
      command:
        "oat init --cwd 'C:\\Program Files\\repo' 'single''quote' 'double\"quote' " +
        "'C:\\repo\\with\\backslashes' '$value' 'left&right' 'left|right' " +
        "'left<right' 'left>right' '100%' 'bang!'",
    });
  });
});

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
      expect.stringContaining('oat tools update --all'),
    );
  });

  it.each([
    ['named update', 'oat tools update oat-project-implement'],
    ['pack update', 'oat tools update --pack workflows'],
    ['all update', 'oat tools update --all --scope user'],
    ['scoped install', 'oat tools install docs --scope project --no-sync'],
    ['init', 'oat init --scope project --no-hook --setup'],
  ])(
    'includes the runnable %s invocation in success guidance',
    async (_name, rerunCommand) => {
      const harness = createHarness({
        confirmed: true,
        options: {
          rerunCommand: { shell: 'POSIX shell', command: rerunCommand },
        },
      });

      await guardBundledToolMutation(harness.options, harness.dependencies);

      expect(harness.logger.info).toHaveBeenCalledWith(
        expect.stringContaining(`in POSIX shell:\n${rerunCommand}`),
      );
    },
  );

  it('launches the npm JavaScript CLI through Node on Windows', async () => {
    const npmCliPath = 'C:\\npm\\node_modules\\npm\\bin\\npm-cli.js';
    const standardNpmCli =
      'C:\\Program Files\\nodejs\\node_modules\\npm\\bin\\npm-cli.js';
    const harness = createHarness({
      confirmed: true,
      platform: 'win32',
      nodeExecutable: 'C:\\Program Files\\nodejs\\node.exe',
      existingPaths: [npmCliPath, standardNpmCli],
      options: {
        env: { npm_execpath: npmCliPath },
      },
    });

    await guardBundledToolMutation(harness.options, harness.dependencies);

    expect(harness.installCli).toHaveBeenCalledWith(
      'C:\\Program Files\\nodejs\\node.exe',
      [npmCliPath, 'install', '--global', '@open-agent-toolkit/cli@1.2.3'],
      { shell: false, stdio: 'inherit' },
    );
  });

  it('falls back to npm-cli.js relative to node.exe on Windows', async () => {
    const nodeExecutable = 'C:\\Node\\node.exe';
    const standardNpmCli = 'C:\\Node\\node_modules\\npm\\bin\\npm-cli.js';
    const harness = createHarness({
      confirmed: true,
      platform: 'win32',
      nodeExecutable,
      existingPaths: [standardNpmCli],
      options: {
        env: { npm_execpath: 'C:\\invalid\\npm.cmd' },
      },
    });

    await guardBundledToolMutation(harness.options, harness.dependencies);

    expect(harness.installCli).toHaveBeenCalledWith(
      nodeExecutable,
      [standardNpmCli, 'install', '--global', '@open-agent-toolkit/cli@1.2.3'],
      { shell: false, stdio: 'inherit' },
    );
  });

  it('fails actionably before mutation when Windows npm-cli.js cannot be resolved', async () => {
    const harness = createHarness({
      confirmed: true,
      platform: 'win32',
      nodeExecutable: 'C:\\Node\\node.exe',
      options: {
        env: { npm_execpath: 'C:\\Node\\npm.cmd' },
      },
    });

    await expect(
      guardBundledToolMutation(harness.options, harness.dependencies),
    ).rejects.toMatchObject({
      message: expect.stringMatching(
        /could not locate npm-cli\.js.*npm install --global @open-agent-toolkit\/cli@1\.2\.3/is,
      ),
      exitCode: 2,
    });

    expect(harness.installCli).not.toHaveBeenCalled();
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
