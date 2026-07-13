import { spawn } from 'node:child_process';

import { resolveUpdateAvailability } from '@app/update-notifier';
import { confirmAction } from '@commands/shared/shared.prompts';
import { CliError } from '@errors/index';
import type { Command } from 'commander';

import type { UpdateNotifierOptions } from './update-notifier';

const CLI_PACKAGE = '@open-agent-toolkit/cli';

export interface ToolBundleUpdateGuardOptions extends UpdateNotifierOptions {
  command: string;
  dryRun: boolean;
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

export function isBundledToolMutationCommand(command: Command): boolean {
  const [, ...path] = getCommandPath(command);
  if (path[0] === 'init') {
    return true;
  }
  return path[0] === 'tools' && (path[1] === 'install' || path[1] === 'update');
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
    `OAT CLI ${availableVersion} is available. ${options.command} copies tools ` +
      `bundled with the currently running CLI ${options.currentVersion}, which ` +
      'can only install its own bundled tool versions. The available CLI may ' +
      'bundle newer tool versions.',
  );
  const accepted = await dependencies.confirmAction(
    `Update the OAT CLI to ${availableVersion} before running ${options.command}?`,
    { interactive: options.interactive },
  );

  if (!accepted) {
    options.logger.warn(
      `Continuing ${options.command} with the current CLI's bundle. Its tool ` +
        'versions may be older than those bundled with the available CLI.',
    );
    return false;
  }

  const installCommand = `npm install --global ${CLI_PACKAGE}@${availableVersion}`;
  try {
    await dependencies.installCli(
      'npm',
      ['install', '--global', `${CLI_PACKAGE}@${availableVersion}`],
      { shell: false, stdio: 'inherit' },
    );
  } catch {
    throw new CliError(
      `Failed to update the OAT CLI to ${availableVersion}. ` +
        `No tools were changed. Fix the npm installation issue and run: ${installCommand}`,
      2,
    );
  }

  options.logger.info(
    `Updated the OAT CLI to ${availableVersion}; rerun \`${options.command}\` ` +
      'so the new CLI can install its bundled tools.',
  );
  return true;
}
