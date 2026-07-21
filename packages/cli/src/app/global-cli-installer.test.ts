import { describe, expect, it } from 'vitest';

import {
  detectGlobalCliPackageManager,
  formatGlobalCliInstallCommand,
  resolveGlobalCliInstallerInvocation,
} from './global-cli-installer';

describe('detectGlobalCliPackageManager', () => {
  it.each([
    [
      'pnpm global store',
      [
        '/Users/me/Library/pnpm/oat',
        '/Users/me/Library/pnpm/global/5/node_modules/@open-agent-toolkit/cli/dist/index.js',
      ],
      {},
      'pnpm',
    ],
    [
      'pnpm home wrapper',
      ['/Users/me/Library/pnpm/bin/oat'],
      { PNPM_HOME: '/Users/me/Library/pnpm' },
      'pnpm',
    ],
    [
      'bun global install',
      [
        '/Users/me/.bun/install/global/node_modules/@open-agent-toolkit/cli/dist/index.js',
      ],
      {},
      'bun',
    ],
    [
      'yarn global install',
      [
        '/Users/me/.config/yarn/global/node_modules/@open-agent-toolkit/cli/dist/index.js',
      ],
      {},
      'yarn',
    ],
    [
      'npm global install',
      [
        '/Users/me/.nvm/versions/node/v22.17.0/bin/node',
        '/Users/me/.nvm/versions/node/v22.17.0/lib/node_modules/@open-agent-toolkit/cli/dist/index.js',
      ],
      {},
      'npm',
    ],
  ] satisfies Array<[string, string[], NodeJS.ProcessEnv, string]>)(
    'detects %s',
    (_name, argv, env, expected) => {
      expect(detectGlobalCliPackageManager(argv, env)).toBe(expected);
    },
  );
});

describe('formatGlobalCliInstallCommand', () => {
  it('formats pnpm and npm commands from the running entrypoint', () => {
    expect(
      formatGlobalCliInstallCommand(
        '@open-agent-toolkit/cli@1.2.3',
        ['/Users/me/Library/pnpm/oat'],
        {},
      ),
    ).toBe('pnpm add -g @open-agent-toolkit/cli@1.2.3');
    expect(
      formatGlobalCliInstallCommand(
        '@open-agent-toolkit/cli@latest',
        [
          '/Users/me/.nvm/versions/node/v22.17.0/bin/node',
          '/Users/me/.nvm/versions/node/v22.17.0/lib/node_modules/@open-agent-toolkit/cli/dist/index.js',
        ],
        {},
      ),
    ).toBe('npm install --global @open-agent-toolkit/cli@latest');
  });
});

describe('resolveGlobalCliInstallerInvocation', () => {
  it('uses pnpm on POSIX when the running CLI is pnpm-managed', () => {
    expect(
      resolveGlobalCliInstallerInvocation('@open-agent-toolkit/cli@1.2.3', {
        argv: ['/Users/me/Library/pnpm/oat'],
        env: {},
        platform: 'linux',
        nodeExecutable: '/usr/bin/node',
        fileExists: () => false,
      }),
    ).toEqual({
      file: 'pnpm',
      args: ['add', '-g', '@open-agent-toolkit/cli@1.2.3'],
    });
  });

  it('uses npm on POSIX when the running CLI is npm-managed', () => {
    expect(
      resolveGlobalCliInstallerInvocation('@open-agent-toolkit/cli@1.2.3', {
        argv: ['/usr/bin/node', '/opt/oat/dist/index.js'],
        env: {},
        platform: 'linux',
        nodeExecutable: '/usr/bin/node',
        fileExists: () => false,
      }),
    ).toEqual({
      file: 'npm',
      args: ['install', '--global', '@open-agent-toolkit/cli@1.2.3'],
    });
  });

  it('launches the npm JavaScript CLI through Node on Windows', () => {
    const npmCliPath = 'C:\\npm\\node_modules\\npm\\bin\\npm-cli.js';
    expect(
      resolveGlobalCliInstallerInvocation('@open-agent-toolkit/cli@1.2.3', {
        argv: ['/usr/bin/node', 'C:\\opt\\oat\\dist\\index.js'],
        env: { npm_execpath: npmCliPath },
        platform: 'win32',
        nodeExecutable: 'C:\\Program Files\\nodejs\\node.exe',
        fileExists: (path) => path === npmCliPath,
      }),
    ).toEqual({
      file: 'C:\\Program Files\\nodejs\\node.exe',
      args: [
        npmCliPath,
        'install',
        '--global',
        '@open-agent-toolkit/cli@1.2.3',
      ],
    });
  });

  it('uses pnpm.cmd on Windows when the running CLI is pnpm-managed', () => {
    expect(
      resolveGlobalCliInstallerInvocation('@open-agent-toolkit/cli@1.2.3', {
        argv: ['C:\\Users\\me\\AppData\\Local\\pnpm\\oat.cmd'],
        env: {},
        platform: 'win32',
        nodeExecutable: 'C:\\Program Files\\nodejs\\node.exe',
        fileExists: () => false,
      }),
    ).toEqual({
      file: 'pnpm.cmd',
      args: ['add', '-g', '@open-agent-toolkit/cli@1.2.3'],
    });
  });
});
