import { isAbsolute, join, resolve } from 'node:path';

import { parseCanonicalAgentFile } from '@agents/canonical';
import { buildCommandContext, type CommandContext } from '@app/command-context';
import type {
  CodexMaterializeResult,
  ProvidersCodexMaterializeDependencies,
} from '@commands/providers/providers.types';
import { readGlobalOptions } from '@commands/shared/shared.utils';
import { CliError } from '@errors/index';
import { resolveProjectRoot, resolveScopeRoot } from '@fs/paths';
import { materializeCodexRole } from '@providers/codex/codec/materialize';
import type { ConcreteScope } from '@shared/types';
import { Command, Option } from 'commander';

interface CodexMaterializeOptions {
  model?: string;
  effort?: string;
  roleName?: string;
  agentPath?: string;
  scope: ConcreteScope;
}

function createDependencies(): ProvidersCodexMaterializeDependencies {
  return {
    buildCommandContext,
    async resolveScopeRoot(scope, context) {
      if (scope === 'project') {
        return resolveProjectRoot(context.cwd);
      }
      return resolveScopeRoot(scope, context.cwd, context.home);
    },
    parseCanonicalAgentFile,
    materializeCodexRole,
  };
}

function requireOption(value: string | undefined, optionName: string): string {
  const normalized = value?.trim() ?? '';
  if (!normalized) {
    throw new CliError(
      `Missing required ${optionName}. Pass ${optionName} <value>.`,
    );
  }
  return normalized;
}

function resolveAgentPath(
  agentName: string,
  options: CodexMaterializeOptions,
  scopeRoot: string,
): string {
  if (options.agentPath) {
    return isAbsolute(options.agentPath)
      ? options.agentPath
      : resolve(scopeRoot, options.agentPath);
  }

  const fileName = agentName.endsWith('.md') ? agentName : `${agentName}.md`;
  return join(scopeRoot, '.agents', 'agents', fileName);
}

export function formatCodexMaterializeResult(
  result: CodexMaterializeResult,
): string {
  return [
    result.dryRun
      ? 'Codex materialization preview'
      : 'Codex materialization complete',
    `Scope: ${result.scope}`,
    `Agent: ${result.agentPath}`,
    `Role: ${result.roleName}`,
    `Role file: ${result.rolePath}`,
    `Config file: ${result.configPath}`,
    'TOML preview:',
    result.tomlPreview.trimEnd(),
  ].join('\n');
}

async function buildCodexMaterializeResult(
  agentName: string,
  options: CodexMaterializeOptions,
  context: CommandContext,
  dependencies: ProvidersCodexMaterializeDependencies,
): Promise<CodexMaterializeResult> {
  const model = requireOption(options.model, '--model');
  const effort = requireOption(options.effort, '--effort');
  const scope = options.scope;
  const scopeRoot = await dependencies.resolveScopeRoot(scope, context);
  const agentPath = resolveAgentPath(agentName, options, scopeRoot);
  const agent = await dependencies.parseCanonicalAgentFile(agentPath);
  const role = dependencies.materializeCodexRole({
    agent,
    model,
    effort,
    roleName: options.roleName,
  });
  const rolePath = join(scopeRoot, '.codex', role.configFile);
  const configPath = join(scopeRoot, '.codex', 'config.toml');

  return {
    status: 'preview',
    dryRun: true,
    scope,
    agentPath,
    roleName: role.roleName,
    rolePath,
    configPath,
    configFile: role.configFile,
    tomlPreview: role.content,
  };
}

async function runCodexMaterializeCommand(
  agentName: string,
  options: CodexMaterializeOptions,
  context: CommandContext,
  dependencies: ProvidersCodexMaterializeDependencies,
): Promise<void> {
  try {
    if (!context.dryRun) {
      throw new CliError(
        'Writing materialized Codex roles is not implemented yet. Pass --dry-run to preview.',
      );
    }

    const result = await buildCodexMaterializeResult(
      agentName,
      options,
      context,
      dependencies,
    );

    if (context.json) {
      context.logger.json(result);
    } else {
      context.logger.info(formatCodexMaterializeResult(result));
    }
    process.exitCode = 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (context.json) {
      context.logger.json({ status: 'error', message });
    } else {
      context.logger.error(message);
    }
    process.exitCode = error instanceof CliError ? error.exitCode : 1;
  }
}

export function createCodexMaterializeCommand(
  overrides: Partial<ProvidersCodexMaterializeDependencies> = {},
): Command {
  const dependencies: ProvidersCodexMaterializeDependencies = {
    ...createDependencies(),
    ...overrides,
  };

  return new Command('materialize')
    .description('Materialize a canonical agent as a Codex role')
    .argument('<agent-name>', 'Canonical agent name')
    .addOption(
      new Option('--scope <scope>', 'Materialization scope')
        .choices(['project', 'user'])
        .default('project'),
    )
    .option('--model <model>', 'Codex model ID')
    .option('--effort <effort>', 'Codex reasoning effort')
    .option('--role-name <role>', 'Override generated Codex role name')
    .option('--agent-path <path>', 'Path to canonical agent markdown')
    .option('--dry-run', 'Preview files without writing')
    .action(
      async (
        agentName: string,
        options: CodexMaterializeOptions,
        command: Command,
      ) => {
        const context = dependencies.buildCommandContext(
          readGlobalOptions(command),
        );
        await runCodexMaterializeCommand(
          agentName,
          options,
          context,
          dependencies,
        );
      },
    );
}
