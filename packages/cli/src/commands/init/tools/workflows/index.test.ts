import type { CommandContext, GlobalOptions } from '@app/command-context';
import { createLoggerCapture } from '@commands/__tests__/helpers';
import type { Scope } from '@shared/types';
import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createInitToolsWorkflowsCommand } from './index';

interface HarnessOptions {
  scope?: Scope;
  interactive?: boolean;
  confirmResponses?: boolean[];
  result?: {
    copiedSkills: string[];
    updatedSkills: string[];
    skippedSkills: string[];
    copiedAgents: string[];
    updatedAgents: string[];
    skippedAgents: string[];
    copiedTemplates: string[];
    updatedTemplates: string[];
    skippedTemplates: string[];
    copiedScripts: string[];
    updatedScripts: string[];
    skippedScripts: string[];
    projectsRootInitialized: boolean;
  };
  guidanceWriteActions?: Array<'created' | 'updated' | 'no-change'>;
  guidanceError?: Error;
}

function createHarness(options: HarnessOptions = {}) {
  const capture = createLoggerCapture();
  const confirmResponses = [...(options.confirmResponses ?? [])];

  const resolveProjectRoot = vi.fn(async () => '/tmp/workspace');
  const resolveScopeRoot = vi.fn(() => '/tmp/home');
  const resolveAssetsRoot = vi.fn(async () => '/tmp/assets');
  const installedWorkflowScopes = new Set<Scope>();
  const installWorkflows = vi.fn(async () => {
    installedWorkflowScopes.add(
      installWorkflows.mock.calls.at(-1)?.[0].scope ?? 'user',
    );
    return (
      options.result ?? {
        copiedSkills: ['oat-project-new'],
        updatedSkills: [],
        skippedSkills: [],
        copiedAgents: ['oat-codebase-mapper.md'],
        updatedAgents: [],
        skippedAgents: ['oat-reviewer.md'],
        copiedTemplates: ['state.md'],
        updatedTemplates: [],
        skippedTemplates: [
          'discovery.md',
          'spec.md',
          'design.md',
          'plan.md',
          'implementation.md',
        ],
        copiedScripts: ['generate-oat-state.sh'],
        updatedScripts: [],
        skippedScripts: ['generate-thin-index.sh'],
        projectsRootInitialized: true,
      }
    );
  });
  const confirmAction = vi.fn(async () => confirmResponses.shift() ?? false);
  const scanTools = vi.fn(async ({ scope }: { scope: 'project' | 'user' }) => [
    ...(scope === 'project'
      ? [
          {
            name: 'oat-docs',
            type: 'skill' as const,
            scope,
            version: '1.0.0',
            bundledVersion: '1.0.0',
            pack: 'docs' as const,
            status: 'current' as const,
          },
        ]
      : [
          {
            name: 'oat-doctor',
            type: 'skill' as const,
            scope,
            version: '1.0.0',
            bundledVersion: '1.0.0',
            pack: 'core' as const,
            status: 'current' as const,
          },
        ]),
    ...(installedWorkflowScopes.has(scope)
      ? [
          {
            name: 'oat-project-new',
            type: 'skill' as const,
            scope,
            version: '1.0.0',
            bundledVersion: '1.0.0',
            pack: 'workflows' as const,
            status: 'current' as const,
          },
        ]
      : []),
  ]);
  const guidanceWriteActions = [
    ...(options.guidanceWriteActions ?? ['updated']),
  ];
  const upsertAgentsMdSection = vi.fn(async () => {
    if (options.guidanceError) throw options.guidanceError;
    return {
      action: guidanceWriteActions.shift() ?? 'no-change',
      path: '/tmp/workspace/AGENTS.md',
    };
  });
  const removeAgentsMdSection = vi.fn(async () => false);

  const command = createInitToolsWorkflowsCommand({
    buildCommandContext: (globalOptions: GlobalOptions): CommandContext => ({
      scope: (globalOptions.scope ?? options.scope ?? 'all') as Scope,
      dryRun: false,
      verbose: globalOptions.verbose ?? false,
      json: globalOptions.json ?? false,
      cwd: globalOptions.cwd ?? '/tmp/workspace',
      home: '/tmp/home',
      interactive: options.interactive ?? !(globalOptions.json ?? false),
      logger: capture.logger,
    }),
    resolveProjectRoot,
    resolveScopeRoot,
    resolveAssetsRoot,
    installWorkflows,
    confirmAction,
    scanTools,
    upsertAgentsMdSection,
    removeAgentsMdSection,
  });

  return {
    capture,
    command,
    resolveProjectRoot,
    resolveScopeRoot,
    resolveAssetsRoot,
    installWorkflows,
    confirmAction,
    scanTools,
    upsertAgentsMdSection,
    removeAgentsMdSection,
  };
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

  const init = new Command('init');
  const tools = new Command('tools');
  tools.addCommand(command);
  init.addCommand(tools);
  program.addCommand(init);

  await program.parseAsync(
    [...globalArgs, 'init', 'tools', 'workflows', ...args],
    {
      from: 'user',
    },
  );
}

describe('createInitToolsWorkflowsCommand', () => {
  let originalExitCode: number | undefined;

  beforeEach(() => {
    originalExitCode = process.exitCode;
    process.exitCode = undefined;
  });

  afterEach(() => {
    process.exitCode = originalExitCode;
  });

  it('default scope (all) resolves to the manifest user default', async () => {
    const { command, resolveProjectRoot, installWorkflows } = createHarness({
      scope: 'all',
    });

    await runCommand(command);

    expect(resolveProjectRoot).not.toHaveBeenCalled();
    expect(installWorkflows).toHaveBeenCalledWith(
      expect.objectContaining({ targetRoot: '/tmp/home', scope: 'user' }),
    );
  });

  it('--scope user installs the full workflows pack under the user root', async () => {
    const {
      command,
      capture,
      resolveProjectRoot,
      resolveScopeRoot,
      installWorkflows,
    } = createHarness();

    await runCommand(command, [], ['--scope', 'user']);

    expect(process.exitCode).toBe(0);
    expect(resolveScopeRoot).toHaveBeenCalledWith(
      'user',
      '/tmp/workspace',
      '/tmp/home',
    );
    expect(resolveProjectRoot).not.toHaveBeenCalled();
    expect(installWorkflows).toHaveBeenCalledWith({
      assetsRoot: '/tmp/assets',
      targetRoot: '/tmp/home',
      scope: 'user',
      force: undefined,
    });
    expect(capture.info.at(-1)).toContain('oat sync --scope user');
  });

  it('--force with interactive confirms before overwriting', async () => {
    const { command, confirmAction, installWorkflows } = createHarness({
      interactive: true,
      confirmResponses: [false],
    });

    await runCommand(command, ['--force'], ['--scope', 'project']);

    expect(confirmAction).toHaveBeenCalledTimes(1);
    expect(installWorkflows).not.toHaveBeenCalled();
    expect(process.exitCode).toBe(0);
  });

  it('text and JSON output shapes', async () => {
    const { command, capture } = createHarness();

    await runCommand(command, [], ['--scope', 'project']);
    expect(capture.info[0]).toContain('Installed workflows tool pack');
    expect(capture.info.at(-1)).toContain('oat sync --scope project');

    const jsonHarness = createHarness();
    await runCommand(jsonHarness.command, [], ['--scope', 'project', '--json']);
    expect(jsonHarness.capture.jsonPayloads[0]).toMatchObject({
      status: 'ok',
      scope: 'project',
      targetRoot: '/tmp/workspace',
      assetsRoot: '/tmp/assets',
      result: {
        copiedSkills: ['oat-project-new'],
      },
    });

    const userJsonHarness = createHarness();
    await runCommand(
      userJsonHarness.command,
      [],
      ['--scope', 'user', '--json'],
    );
    expect(userJsonHarness.capture.jsonPayloads[0]).toMatchObject({
      status: 'ok',
      scope: 'user',
      targetRoot: '/tmp/home',
      projectGuidance: {
        action: 'not-requested',
      },
    });
  });

  it.each(['project', 'user'] as const)(
    'applies accepted project guidance without changing %s capability placement',
    async (scope) => {
      const {
        command,
        capture,
        installWorkflows,
        upsertAgentsMdSection,
        removeAgentsMdSection,
      } = createHarness();

      await runCommand(command, ['--project-guidance'], ['--scope', scope]);

      expect(installWorkflows).toHaveBeenCalledWith(
        expect.objectContaining({ scope }),
      );
      expect(upsertAgentsMdSection).toHaveBeenCalledWith(
        '/tmp/workspace',
        'tools',
        expect.stringMatching(
          /\*\*core\*\*[\s\S]*\*\*docs\*\*[\s\S]*\*\*workflows\*\*/,
        ),
      );
      expect(removeAgentsMdSection).toHaveBeenCalledWith(
        '/tmp/workspace',
        'workflows',
      );
      expect(capture.info.join('\n')).toContain('Project guidance: update');
      expect(process.exitCode).toBe(0);
    },
  );

  it('keeps explicit decline and non-interactive default write-free', async () => {
    const declined = createHarness({ interactive: true });
    await runCommand(
      declined.command,
      ['--no-project-guidance'],
      ['--scope', 'project'],
    );
    expect(declined.upsertAgentsMdSection).not.toHaveBeenCalled();
    expect(declined.removeAgentsMdSection).not.toHaveBeenCalled();
    expect(declined.capture.info.join('\n')).toContain(
      'Project guidance: declined',
    );

    const nonInteractive = createHarness({ interactive: false });
    await runCommand(nonInteractive.command, [], ['--scope', 'project']);
    expect(nonInteractive.upsertAgentsMdSection).not.toHaveBeenCalled();
    expect(nonInteractive.removeAgentsMdSection).not.toHaveBeenCalled();
    expect(nonInteractive.capture.info.join('\n')).toContain(
      'Re-run with --project-guidance',
    );
    expect(process.exitCode).toBe(0);
  });

  it('prompts once for guidance and reports repeated accepted updates', async () => {
    const harness = createHarness({
      interactive: true,
      confirmResponses: [true, true],
      guidanceWriteActions: ['created', 'no-change'],
    });

    await runCommand(harness.command, [], ['--scope', 'project']);
    await runCommand(harness.command, [], ['--scope', 'project']);

    expect(harness.confirmAction).toHaveBeenCalledTimes(2);
    expect(harness.upsertAgentsMdSection).toHaveBeenCalledTimes(2);
    expect(harness.capture.info.join('\n')).toContain(
      'Project guidance: create',
    );
    expect(harness.capture.info.join('\n')).toContain(
      'Project guidance: no-change',
    );
  });

  it('rejects conflicting project guidance flags before writing', async () => {
    const { command, installWorkflows, upsertAgentsMdSection } =
      createHarness();

    await expect(
      runCommand(
        command,
        ['--project-guidance', '--no-project-guidance'],
        ['--scope', 'project'],
      ),
    ).rejects.toThrow(
      '--project-guidance and --no-project-guidance cannot be used together.',
    );

    expect(installWorkflows).not.toHaveBeenCalled();
    expect(upsertAgentsMdSection).not.toHaveBeenCalled();
  });

  it('reports blocked guidance without coupling it to capability installation', async () => {
    const { command, capture, installWorkflows } = createHarness({
      guidanceError: new Error('unsafe AGENTS.md target'),
    });

    await runCommand(
      command,
      ['--project-guidance'],
      ['--scope', 'project', '--json'],
    );

    expect(installWorkflows).toHaveBeenCalledTimes(1);
    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'partial',
      scope: 'project',
      projectGuidance: {
        action: 'blocked',
        reason: expect.stringContaining('unsafe AGENTS.md target'),
      },
    });
    expect(process.exitCode).toBe(1);
  });
});
