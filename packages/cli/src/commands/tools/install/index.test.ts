import type { CommandContext, GlobalOptions } from '@app/command-context';
import { createLoggerCapture } from '@commands/__tests__/helpers';
import type {
  MultiSelectChoice,
  SelectChoice,
} from '@commands/shared/shared.prompts';
import { setInstalledCanonicalPaths } from '@commands/tools/shared/install-sync-context';
import type { Scope } from '@shared/types';
import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createToolsInstallCommand } from './index';

function createHarness() {
  const capture = createLoggerCapture();
  const syncScopes: Scope[] = [];
  const selectManyWithAbort = vi.fn(
    async (_message: string, _choices: MultiSelectChoice<string>[]) => ['docs'],
  );
  const selectWithAbort = vi.fn(
    async (_message: string, _choices: SelectChoice<string>[]) => 'local',
  );
  const installCore = vi.fn(async () => ({
    copiedSkills: [],
    updatedSkills: [],
    skippedSkills: [],
    outdatedSkills: [],
    docsStatus: 'skipped' as const,
  }));
  const installDocs = vi.fn(async () => ({
    copiedSkills: ['oat-docs-analyze'],
    updatedSkills: [],
    skippedSkills: [],
    outdatedSkills: [],
  }));
  const installIdeas = vi.fn(async () => ({
    copiedSkills: [],
    updatedSkills: [],
    skippedSkills: [],
    outdatedSkills: [],
    copiedInfraFiles: [],
    updatedInfraFiles: [],
    skippedInfraFiles: [],
    copiedTemplates: [],
    updatedTemplates: [],
    skippedTemplates: [],
  }));
  const installWorkflows = vi.fn(async () => ({
    copiedSkills: [],
    updatedSkills: [],
    skippedSkills: [],
    outdatedSkills: [],
    copiedAgents: [],
    updatedAgents: [],
    skippedAgents: [],
    copiedTemplates: [],
    updatedTemplates: [],
    skippedTemplates: [],
    copiedScripts: [],
    updatedScripts: [],
    skippedScripts: [],
    projectsRootInitialized: false,
    resolvedProjectsRoot: '.oat/projects/shared',
  }));
  const installUtility = vi.fn(async () => ({
    copiedSkills: [],
    updatedSkills: [],
    skippedSkills: [],
    outdatedSkills: [],
  }));
  const installProjectManagement = vi.fn(async () => ({
    copiedSkills: [],
    updatedSkills: [],
    skippedSkills: [],
    outdatedSkills: [],
    copiedTemplates: [],
    updatedTemplates: [],
    skippedTemplates: [],
  }));
  const installResearch = vi.fn(async () => ({
    copiedSkills: [],
    updatedSkills: [],
    skippedSkills: [],
    outdatedSkills: [],
    copiedAgents: [],
    updatedAgents: [],
    skippedAgents: [],
  }));
  const command = createToolsInstallCommand(
    {
      runSync: async ({ scope }) => {
        syncScopes.push(scope);
      },
    },
    {
      buildCommandContext: (globalOptions: GlobalOptions): CommandContext => ({
        scope: (globalOptions.scope ?? 'all') as Scope,
        dryRun: false,
        verbose: globalOptions.verbose ?? false,
        json: globalOptions.json ?? false,
        cwd: globalOptions.cwd ?? '/tmp/workspace',
        home: '/tmp/home',
        interactive: true,
        logger: capture.logger,
      }),
      resolveProjectRoot: vi.fn(async () => '/tmp/workspace'),
      resolveScopeRoot: vi.fn((_scope: 'project' | 'user', _cwd, home) => home),
      resolveAssetsRoot: vi.fn(async () => '/tmp/assets'),
      scanTools: vi.fn(async ({ scope }: { scope: 'project' | 'user' }) =>
        scope === 'project'
          ? [
              {
                name: 'oat-docs-analyze',
                type: 'skill' as const,
                scope: 'project' as const,
                version: '1.0.0',
                bundledVersion: '1.0.0',
                pack: 'docs' as const,
                status: 'current' as const,
              },
            ]
          : [],
      ),
      selectManyWithAbort,
      selectWithAbort,
      installCore,
      installDocs,
      installIdeas,
      installWorkflows,
      installUtility,
      installProjectManagement,
      installResearch,
      copyDirWithStatus: vi.fn(async () => 'skipped' as const),
      removeDirectory: vi.fn(async () => {}),
      removeFile: vi.fn(async () => {}),
      addLocalPaths: vi.fn(async (_repoRoot: string, paths: string[]) => ({
        added: paths,
        all: paths,
      })),
      applyGitignore: vi.fn(async () => ({ action: 'updated' })),
      readOatConfig: vi.fn(async () => ({
        version: 1 as const,
        localPaths: [] as string[],
        tools: {},
      })),
      writeOatConfig: vi.fn(async () => {}),
      resolveLocalPaths: vi.fn(
        (config: { localPaths?: string[] }) => config.localPaths ?? [],
      ),
      upsertAgentsMdSection: vi.fn(async () => ({
        action: 'updated' as const,
      })),
      removeAgentsMdSection: vi.fn(async () => false),
    },
  );

  return { capture, command, syncScopes, installDocs };
}

async function runCommand(
  command: Command,
  args: string[] = [],
  globalArgs: string[] = [],
): Promise<void> {
  const program = new Command()
    .name('oat')
    .option('--json')
    .option('--verbose')
    .option('--scope <scope>')
    .option('--cwd <path>')
    .exitOverride();

  const tools = new Command('tools');
  tools.addCommand(command);
  program.addCommand(tools);

  await program.parseAsync([...globalArgs, 'tools', 'install', ...args], {
    from: 'user',
  });
}

describe('createToolsInstallCommand', () => {
  let originalExitCode: number | undefined;

  beforeEach(() => {
    originalExitCode = process.exitCode;
    process.exitCode = undefined;
  });

  afterEach(() => {
    process.exitCode = originalExitCode;
  });

  it('passes installed canonical paths from the action command into auto-sync', async () => {
    const runSync = vi.fn(async () => {});
    const command = createToolsInstallCommand(
      { runSync },
      {},
      () =>
        new Command('tools').addCommand(
          new Command('docs').action(
            async (_options, actionCommand: Command) => {
              setInstalledCanonicalPaths(actionCommand, [
                '.agents/skills/oat-docs-analyze',
              ]);
              process.exitCode = 0;
            },
          ),
        ),
    );

    const program = new Command()
      .name('oat')
      .option('--scope <scope>')
      .option('--cwd <path>')
      .exitOverride();
    program.addCommand(new Command('tools').addCommand(command));

    await program.parseAsync(
      ['--scope', 'project', 'tools', 'install', 'docs'],
      { from: 'user' },
    );

    expect(runSync).toHaveBeenCalledWith(
      expect.objectContaining({
        scope: 'project',
        installedCanonicalPaths: ['.agents/skills/oat-docs-analyze'],
      }),
    );
  });

  it('auto-syncs both the removed scope and target scope for pack migrations', async () => {
    const { capture, command, installDocs, syncScopes } = createHarness();

    await runCommand(command, [], ['--scope', 'user']);

    expect(installDocs).toHaveBeenCalledWith(
      expect.objectContaining({ targetRoot: '/tmp/home' }),
    );
    expect(capture.info.join('\n')).toContain(
      'Installed tool packs: docs (user)',
    );
    expect(syncScopes).toEqual(['project', 'user']);
  });
});
