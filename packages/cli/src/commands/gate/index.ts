import { join } from 'node:path';

import {
  buildCommandContext,
  type CommandContext,
  type GlobalOptions,
} from '@app/command-context';
import { readGlobalOptions } from '@commands/shared/shared.utils';
import {
  resolveEffectiveConfig,
  resolveGate,
  type ResolvedConfig,
} from '@config/resolve';
import { resolveProjectRoot } from '@fs/paths';
import { Command } from 'commander';

interface GateCommandDependencies {
  buildCommandContext: (options: GlobalOptions) => CommandContext;
  resolveProjectRoot: (cwd: string) => Promise<string>;
  resolveEffectiveConfig: (
    repoRoot: string,
    userConfigDir: string,
    env: NodeJS.ProcessEnv,
  ) => Promise<ResolvedConfig>;
  processEnv: NodeJS.ProcessEnv;
}

const DEFAULT_DEPENDENCIES: GateCommandDependencies = {
  buildCommandContext,
  resolveProjectRoot,
  resolveEffectiveConfig,
  processEnv: process.env,
};

function writeJsonValue(context: CommandContext, payload: unknown): void {
  if (context.json) {
    context.logger.json(payload);
    return;
  }

  context.logger.info(JSON.stringify(payload, null, 2));
}

async function readEffectiveConfig(
  context: CommandContext,
  dependencies: GateCommandDependencies,
): Promise<ResolvedConfig> {
  const repoRoot = await dependencies.resolveProjectRoot(context.cwd);
  const userConfigDir = join(context.home, '.oat');
  return dependencies.resolveEffectiveConfig(
    repoRoot,
    userConfigDir,
    dependencies.processEnv,
  );
}

async function runResolve(
  skillName: string,
  context: CommandContext,
  dependencies: GateCommandDependencies,
): Promise<void> {
  try {
    const effective = await readEffectiveConfig(context, dependencies);
    writeJsonValue(context, resolveGate(effective, skillName));
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

export function createGateCommand(
  overrides: Partial<GateCommandDependencies> = {},
): Command {
  const dependencies: GateCommandDependencies = {
    ...DEFAULT_DEPENDENCIES,
    ...overrides,
  };

  const cmd = new Command('gate').description(
    'Resolve and manage workflow gate configuration',
  );

  cmd
    .command('resolve')
    .description('Print the resolved gate configuration for a skill')
    .argument('<skill>', 'Gate-aware skill name')
    .action(async (skillName: string, _options: unknown, command: Command) => {
      const context = dependencies.buildCommandContext(
        readGlobalOptions(command),
      );
      await runResolve(skillName, context, dependencies);
    });

  return cmd;
}
