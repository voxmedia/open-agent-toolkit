import { join } from 'node:path';

import {
  buildCommandContext,
  type CommandContext,
  type GlobalOptions,
} from '@app/command-context';
import { readGlobalOptions } from '@commands/shared/shared.utils';
import { resolveEffectiveConfig, type ResolvedConfig } from '@config/resolve';
import { resolveProjectRoot } from '@fs/paths';
import { Command } from 'commander';

interface ConfigDumpDependencies {
  buildCommandContext: (options: GlobalOptions) => CommandContext;
  resolveProjectRoot: (cwd: string) => Promise<string>;
  resolveEffectiveConfig: (
    repoRoot: string,
    userConfigDir: string,
    env: NodeJS.ProcessEnv,
  ) => Promise<ResolvedConfig>;
  processEnv: NodeJS.ProcessEnv;
}

const DEFAULT_DEPENDENCIES: ConfigDumpDependencies = {
  buildCommandContext,
  resolveProjectRoot,
  resolveEffectiveConfig,
  processEnv: process.env,
};

function formatConfigDump(result: ResolvedConfig): string[] {
  const lines: string[] = [];
  const grouped = new Map<string, string[]>();

  for (const [key, entry] of Object.entries(result.resolved).sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    const items = grouped.get(entry.source) ?? [];
    items.push(`${key} = ${String(entry.value)}`);
    grouped.set(entry.source, items);
  }

  for (const source of ['shared', 'local', 'user', 'env', 'default']) {
    const items = grouped.get(source);
    if (!items || items.length === 0) {
      continue;
    }

    if (lines.length > 0) {
      lines.push('');
    }
    lines.push(`${source}:`);
    for (const item of items) {
      lines.push(`  ${item}`);
    }
  }

  return lines;
}

async function runConfigDump(
  context: CommandContext,
  dependencies: ConfigDumpDependencies,
): Promise<void> {
  try {
    const repoRoot = await dependencies.resolveProjectRoot(context.cwd);
    const userConfigDir = join(context.home, '.oat');
    const result = await dependencies.resolveEffectiveConfig(
      repoRoot,
      userConfigDir,
      dependencies.processEnv,
    );

    if (context.json) {
      context.logger.json({
        status: 'ok',
        ...result,
      });
    } else {
      for (const line of formatConfigDump(result)) {
        context.logger.info(line);
      }
    }

    process.exitCode = 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (context.json) {
      context.logger.json({ status: 'error', message });
    } else {
      context.logger.error(message);
    }
    process.exitCode = 1;
  }
}

export function createConfigDumpCommand(
  overrides: Partial<ConfigDumpDependencies> = {},
): Command {
  const dependencies: ConfigDumpDependencies = {
    ...DEFAULT_DEPENDENCIES,
    ...overrides,
  };

  return new Command('dump')
    .description('Dump merged OAT config with source attribution')
    .action(async (_options, command: Command) => {
      const context = dependencies.buildCommandContext(
        readGlobalOptions(command),
      );
      await runConfigDump(context, dependencies);
    });
}
