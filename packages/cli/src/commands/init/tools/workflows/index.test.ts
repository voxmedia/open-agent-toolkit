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
}

function createHarness(options: HarnessOptions = {}) {
  const capture = createLoggerCapture();
  const confirmResponses = [...(options.confirmResponses ?? [])];

  const resolveProjectRoot = vi.fn(async () => '/tmp/workspace');
  const resolveScopeRoot = vi.fn(() => '/tmp/home');
  const resolveAssetsRoot = vi.fn(async () => '/tmp/assets');
  const installWorkflows = vi.fn(async () => {
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
  const confirmAction = vi.fn(async () => confirmResponses.shift() ?? true);

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
  });

  return {
    capture,
    command,
    resolveProjectRoot,
    resolveScopeRoot,
    resolveAssetsRoot,
    installWorkflows,
    confirmAction,
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
    });
  });
});
