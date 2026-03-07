import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { buildCommandContext } from '@app/command-context';
import {
  getFrontmatterBlock,
  getFrontmatterField,
  parseFrontmatterField,
} from '@commands/shared/frontmatter';
import { readGlobalOptions } from '@commands/shared/shared.utils';
import { scanTools } from '@commands/tools/shared/scan-tools';
import type { ToolInfo } from '@commands/tools/shared/types';
import { resolveAssetsRoot } from '@fs/assets';
import { fileExists } from '@fs/io';
import { resolveProjectRoot, resolveScopeRoot } from '@fs/paths';
import { Command } from 'commander';
import {
  type InfoToolDependencies,
  runInfoTool,
  type ToolDetail,
} from './info-tool';

async function getToolDetail(
  tool: ToolInfo,
  scopeRoot: string,
): Promise<Omit<ToolDetail, keyof ToolInfo>> {
  if (tool.type === 'skill') {
    const skillDir = join(scopeRoot, '.agents', 'skills', tool.name);
    const skillMdPath = join(skillDir, 'SKILL.md');
    const exists = await fileExists(skillMdPath);
    if (!exists) {
      return {
        description: null,
        argumentHint: null,
        allowedTools: null,
        userInvocable: false,
      };
    }

    const content = await readFile(skillMdPath, 'utf8');
    const block = getFrontmatterBlock(content);
    if (!block) {
      return {
        description: null,
        argumentHint: null,
        allowedTools: null,
        userInvocable: false,
      };
    }

    return {
      description: getFrontmatterField(block, 'description'),
      argumentHint: getFrontmatterField(block, 'argument-hint'),
      allowedTools: getFrontmatterField(block, 'allowed-tools'),
      userInvocable: getFrontmatterField(block, 'user-invocable') === 'true',
    };
  }

  // Agent
  const agentPath = join(scopeRoot, '.agents', 'agents', `${tool.name}.md`);
  const description = await parseFrontmatterField(agentPath, 'description');
  return {
    description: description || null,
    argumentHint: null,
    allowedTools: null,
    userInvocable: false,
  };
}

const defaultDependencies: InfoToolDependencies = {
  scanTools,
  resolveScopeRoot: async (scope, cwd, home) => {
    if (scope === 'project') return resolveProjectRoot(cwd);
    return resolveScopeRoot(scope, cwd, home);
  },
  resolveAssetsRoot,
  getToolDetail,
};

export function createToolsInfoCommand(
  dependencies: InfoToolDependencies = defaultDependencies,
): Command {
  return new Command('info')
    .description('Show details for an installed tool')
    .argument('<name>', 'Tool name')
    .action(async (name: string, _opts, command) => {
      const globalOptions = readGlobalOptions(command);
      const context = buildCommandContext(globalOptions);
      const result = await runInfoTool(context, name, dependencies);
      if (!result.found) {
        process.exitCode = 1;
      }
    });
}
