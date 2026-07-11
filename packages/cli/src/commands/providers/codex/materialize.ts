import { readFile, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, join, resolve } from 'node:path';

import { parseCanonicalAgentFile } from '@agents/canonical';
import { buildCommandContext, type CommandContext } from '@app/command-context';
import type {
  CodexMaterializeResult,
  ProvidersCodexMaterializeDependencies,
} from '@commands/providers/providers.types';
import { readGlobalOptions } from '@commands/shared/shared.utils';
import { CliError } from '@errors/index';
import { ensureDir, fileExists } from '@fs/io';
import { resolveProjectRoot, resolveScopeRoot } from '@fs/paths';
import {
  mergeCodexConfigForRole,
  readCodexMaxDepth,
} from '@providers/codex/codec/config-merge';
import type { CodexRoleExport } from '@providers/codex/codec/export-to-codex';
import { materializeCodexRole } from '@providers/codex/codec/materialize';
import { withOatManagedCodexRoleOwner } from '@providers/codex/codec/shared';
import type { ConcreteScope } from '@shared/types';
import { Command, Option } from 'commander';

interface CodexMaterializeOptions {
  model?: string;
  effort?: string;
  roleName?: string;
  agentPath?: string;
  scope: ConcreteScope;
}

interface CodexMaterializePlan {
  configChanged: boolean;
  mergedConfigContent: string;
  result: CodexMaterializeResult;
  role: CodexRoleExport;
  roleChanged: boolean;
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

async function buildCodexMaterializePlan(
  agentName: string,
  options: CodexMaterializeOptions,
  context: CommandContext,
  dependencies: ProvidersCodexMaterializeDependencies,
): Promise<CodexMaterializePlan> {
  const model = requireOption(options.model, '--model');
  const effort = requireOption(options.effort, '--effort');
  const scope = options.scope;
  const scopeRoot = await dependencies.resolveScopeRoot(scope, context);
  const agentPath = resolveAgentPath(agentName, options, scopeRoot);
  const agent = await dependencies.parseCanonicalAgentFile(agentPath);
  const materializedRole = dependencies.materializeCodexRole({
    agent,
    model,
    effort,
    roleName: options.roleName,
  });
  const role = {
    ...materializedRole,
    content: withOatManagedCodexRoleOwner(
      materializedRole.content,
      scope === 'user' ? 'user-config' : 'project-config',
    ),
  };
  const rolePath = join(scopeRoot, '.codex', role.configFile);
  const configPath = join(scopeRoot, '.codex', 'config.toml');
  const existingRoleContent = await readOptionalFile(rolePath);
  const existingConfigContent = await readOptionalFile(configPath);
  let inheritedMaxDepth: number | undefined;

  if (scope === 'project') {
    const userScopeRoot = await dependencies.resolveScopeRoot('user', context);
    const userConfigContent = await readOptionalFile(
      join(userScopeRoot, '.codex', 'config.toml'),
    );
    inheritedMaxDepth = readCodexMaxDepth(userConfigContent) ?? undefined;
  }

  const mergedConfig = mergeCodexConfigForRole({
    existingContent: existingConfigContent,
    role: {
      roleName: role.roleName,
      description: role.description,
      configFile: role.configFile,
    },
    inheritedMaxDepth,
  });

  return {
    configChanged: mergedConfig.changed,
    mergedConfigContent: mergedConfig.mergedContent,
    role,
    roleChanged:
      existingRoleContent === null ||
      existingRoleContent.trimEnd() !== role.content.trimEnd(),
    result: {
      status: context.dryRun ? 'preview' : 'written',
      dryRun: context.dryRun,
      scope,
      agentPath,
      roleName: role.roleName,
      rolePath,
      configPath,
      configFile: role.configFile,
      tomlPreview: role.content,
    },
  };
}

async function readOptionalFile(filePath: string): Promise<string | null> {
  if (!(await fileExists(filePath))) {
    return null;
  }

  return readFile(filePath, 'utf8');
}

async function applyCodexMaterializePlan({
  configChanged,
  mergedConfigContent,
  result,
  role,
  roleChanged,
}: CodexMaterializePlan): Promise<void> {
  if (roleChanged) {
    await ensureDir(dirname(result.rolePath));
    await writeFile(result.rolePath, role.content, 'utf8');
  }

  if (configChanged) {
    await ensureDir(dirname(result.configPath));
    await writeFile(result.configPath, mergedConfigContent, 'utf8');
  }
}

async function runCodexMaterializeCommand(
  agentName: string,
  options: CodexMaterializeOptions,
  context: CommandContext,
  dependencies: ProvidersCodexMaterializeDependencies,
): Promise<void> {
  try {
    const plan = await buildCodexMaterializePlan(
      agentName,
      options,
      context,
      dependencies,
    );

    if (!context.dryRun) {
      await applyCodexMaterializePlan(plan);
    }

    const { result } = plan;
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
