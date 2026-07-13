import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { win32 } from 'node:path';

import { resolveUpdateAvailability } from '@app/update-notifier';
import { confirmAction } from '@commands/shared/shared.prompts';
import { CliError } from '@errors/index';
import type { Command } from 'commander';

import type { UpdateNotifierOptions } from './update-notifier';

const CLI_PACKAGE = '@open-agent-toolkit/cli';

export interface RerunCommandDisplay {
  shell: 'POSIX shell' | 'PowerShell';
  command: string;
}

export interface ToolBundleUpdateGuardOptions extends UpdateNotifierOptions {
  commandPath: string;
  dryRun: boolean;
  rerunCommand: RerunCommandDisplay;
}

interface InstallerOptions {
  shell: false;
  stdio: 'inherit';
}

export interface ToolBundleUpdateGuardDependencies {
  resolveUpdateAvailability: (
    options: UpdateNotifierOptions,
  ) => Promise<string | null>;
  confirmAction: (
    message: string,
    context: { interactive: boolean },
  ) => Promise<boolean>;
  installCli: (
    file: string,
    args: string[],
    options: InstallerOptions,
  ) => Promise<void>;
  platform: NodeJS.Platform;
  nodeExecutable: string;
  fileExists: (path: string) => boolean;
}

function installCli(
  file: string,
  args: string[],
  options: InstallerOptions,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(file, args, options);
    child.once('error', reject);
    child.once('close', (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(
        new Error(
          signal
            ? `${file} exited after signal ${signal}`
            : `${file} exited with code ${code ?? 'unknown'}`,
        ),
      );
    });
  });
}

const DEFAULT_DEPENDENCIES: ToolBundleUpdateGuardDependencies = {
  resolveUpdateAvailability,
  confirmAction,
  installCli,
  platform: process.platform,
  nodeExecutable: process.execPath,
  fileExists: existsSync,
};

function getCommandPath(command: Command): string[] {
  const path: string[] = [];
  let current: Command | null = command;
  while (current) {
    path.unshift(current.name());
    current = current.parent;
  }
  return path;
}

export function formatCommandPath(command: Command): string {
  return getCommandPath(command).join(' ');
}

function quotePosixArgument(argument: string): string {
  if (/^[a-zA-Z0-9_@+=:,./-]+$/.test(argument)) {
    return argument;
  }
  return `'${argument.replaceAll("'", `'"'"'`)}'`;
}

function quotePowerShellArgument(argument: string): string {
  if (/^[a-zA-Z0-9_:,./-]+$/.test(argument)) {
    return argument;
  }
  return `'${argument.replaceAll("'", "''")}'`;
}

export function formatRerunCommand(
  argv: string[],
  platform: NodeJS.Platform = process.platform,
): RerunCommandDisplay {
  const windows = platform === 'win32';
  const quoteArgument = windows ? quotePowerShellArgument : quotePosixArgument;
  return {
    shell: windows ? 'PowerShell' : 'POSIX shell',
    command: ['oat', ...argv.slice(2)].map(quoteArgument).join(' '),
  };
}

export function isBundledToolMutationCommand(command: Command): boolean {
  const [, ...path] = getCommandPath(command);
  if (path[0] === 'init') {
    return true;
  }
  return path[0] === 'tools' && (path[1] === 'install' || path[1] === 'update');
}

interface InstallerInvocation {
  file: string;
  args: string[];
}

function resolveInstallerInvocation(
  options: ToolBundleUpdateGuardOptions,
  dependencies: ToolBundleUpdateGuardDependencies,
  packageVersion: string,
): InstallerInvocation | null {
  const npmArgs = ['install', '--global', packageVersion];
  if (dependencies.platform !== 'win32') {
    return { file: 'npm', args: npmArgs };
  }

  const environmentPath = options.env.npm_execpath?.trim();
  const standardPath = win32.join(
    win32.dirname(dependencies.nodeExecutable),
    'node_modules',
    'npm',
    'bin',
    'npm-cli.js',
  );
  const npmCliPath = [environmentPath, standardPath].find(
    (candidate) =>
      candidate !== undefined &&
      win32.isAbsolute(candidate) &&
      win32.basename(candidate).toLowerCase() === 'npm-cli.js' &&
      dependencies.fileExists(candidate),
  );
  if (!npmCliPath) {
    return null;
  }

  return {
    file: dependencies.nodeExecutable,
    args: [npmCliPath, ...npmArgs],
  };
}

export async function guardBundledToolMutation(
  options: ToolBundleUpdateGuardOptions,
  overrides: Partial<ToolBundleUpdateGuardDependencies> = {},
): Promise<boolean> {
  if (options.dryRun) {
    return false;
  }

  const dependencies = { ...DEFAULT_DEPENDENCIES, ...overrides };
  const availableVersion =
    await dependencies.resolveUpdateAvailability(options);
  if (!availableVersion) {
    return false;
  }

  options.logger.warn(
    `OAT CLI ${availableVersion} is available. ${options.commandPath} copies tools ` +
      `bundled with the currently running CLI ${options.currentVersion}, which ` +
      'can only install its own bundled tool versions. The available CLI may ' +
      'bundle newer tool versions.',
  );
  const installCommand = `npm install --global ${CLI_PACKAGE}@${availableVersion}`;
  let accepted = false;
  try {
    accepted = await dependencies.confirmAction(
      `Update the OAT CLI to ${availableVersion} before running ${options.commandPath}?`,
      { interactive: options.interactive },
    );
  } catch {
    options.logger.warn(
      'Could not open the OAT CLI update prompt. Skipping the automatic CLI ' +
        `update. To update manually, run: ${installCommand}`,
    );
  }

  if (!accepted) {
    options.logger.warn(
      `Continuing ${options.commandPath} with the current CLI's bundle. Its tool ` +
        'versions may be older than those bundled with the available CLI.',
    );
    return false;
  }

  const invocation = resolveInstallerInvocation(
    options,
    dependencies,
    `${CLI_PACKAGE}@${availableVersion}`,
  );
  if (!invocation) {
    throw new CliError(
      'Could not locate npm-cli.js for a shell-free Windows update. ' +
        `No tools were changed. Run this command manually: ${installCommand}`,
      2,
    );
  }
  try {
    await dependencies.installCli(invocation.file, invocation.args, {
      shell: false,
      stdio: 'inherit',
    });
  } catch {
    throw new CliError(
      `Failed to update the OAT CLI to ${availableVersion}. ` +
        `No tools were changed. Fix the npm installation issue and run: ${installCommand}`,
      2,
    );
  }

  options.logger.info(
    `Updated the OAT CLI to ${availableVersion}. To let the new CLI install ` +
      `its bundled tools, rerun in ${options.rerunCommand.shell}:\n${options.rerunCommand.command}`,
  );
  return true;
}
