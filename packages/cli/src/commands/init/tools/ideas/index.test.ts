import type { CommandContext, GlobalOptions } from '@app/command-context';
import {
  createLoggerCapture,
  type LoggerCapture,
} from '@commands/__tests__/helpers';
import type { Scope } from '@shared/types';
import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createInitToolsIdeasCommand } from './index';

interface HarnessOptions {
  scope?: Scope;
  interactive?: boolean;
  confirmResponses?: boolean[];
  result?: {
    copiedSkills: string[];
    updatedSkills: string[];
    skippedSkills: string[];
    copiedInfraFiles: string[];
    updatedInfraFiles: string[];
    skippedInfraFiles: string[];
    copiedTemplates: string[];
    updatedTemplates: string[];
    skippedTemplates: string[];
  };
}

function createHarness(options: HarnessOptions = {}): {
  capture: LoggerCapture;
  command: Command;
  resolveProjectRoot: ReturnType<typeof vi.fn>;
  resolveScopeRoot: ReturnType<typeof vi.fn>;
  resolveAssetsRoot: ReturnType<typeof vi.fn>;
  installIdeas: ReturnType<typeof vi.fn>;
  confirmAction: ReturnType<typeof vi.fn>;
} {
  const capture = createLoggerCapture();
  const confirmResponses = [...(options.confirmResponses ?? [])];

  const resolveProjectRoot = vi.fn(async () => '/tmp/workspace');
  const resolveScopeRoot = vi.fn(
    (_scope: 'project' | 'user', _cwd, home) => home,
  );
  const resolveAssetsRoot = vi.fn(async () => '/tmp/assets');
  const installIdeas = vi.fn(async () => {
    return (
      options.result ?? {
        copiedSkills: ['oat-idea-new'],
        updatedSkills: [],
        skippedSkills: [
          'oat-idea-ideate',
          'oat-idea-summarize',
          'oat-idea-scratchpad',
        ],
        copiedInfraFiles: ['.oat/ideas/backlog.md'],
        updatedInfraFiles: [],
        skippedInfraFiles: ['.oat/ideas/scratchpad.md'],
        copiedTemplates: ['.oat/templates/ideas/idea-discovery.md'],
        updatedTemplates: [],
        skippedTemplates: ['.oat/templates/ideas/idea-summary.md'],
      }
    );
  });
  const confirmAction = vi.fn(async () => confirmResponses.shift() ?? true);

  const command = createInitToolsIdeasCommand({
    buildCommandContext: (globalOptions: GlobalOptions): CommandContext => ({
      scope: (globalOptions.scope ?? options.scope ?? 'all') as Scope,
      apply: false,
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
    installIdeas,
    confirmAction,
  });

  return {
    capture,
    command,
    resolveProjectRoot,
    resolveScopeRoot,
    resolveAssetsRoot,
    installIdeas,
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

  await program.parseAsync([...globalArgs, 'init', 'tools', 'ideas', ...args], {
    from: 'user',
  });
}

describe('createInitToolsIdeasCommand', () => {
  let originalExitCode: number | undefined;

  beforeEach(() => {
    originalExitCode = process.exitCode;
    process.exitCode = undefined;
  });

  afterEach(() => {
    process.exitCode = originalExitCode;
  });

  it('forwards correct args to installIdeas', async () => {
    const { command, installIdeas } = createHarness();

    await runCommand(command, ['--force'], ['--scope', 'project']);

    expect(installIdeas).toHaveBeenCalledWith({
      assetsRoot: '/tmp/assets',
      targetRoot: '/tmp/workspace',
      force: true,
    });
  });

  it('default scope (all) resolves as project', async () => {
    const { command, resolveProjectRoot, resolveScopeRoot, installIdeas } =
      createHarness({ scope: 'all' });

    await runCommand(command);

    expect(resolveProjectRoot).toHaveBeenCalledTimes(1);
    expect(resolveScopeRoot).not.toHaveBeenCalled();
    expect(installIdeas).toHaveBeenCalledWith(
      expect.objectContaining({ targetRoot: '/tmp/workspace' }),
    );
  });

  it('--scope user installs to home directory', async () => {
    const { command, resolveScopeRoot, installIdeas } = createHarness();

    await runCommand(command, [], ['--scope', 'user']);

    expect(resolveScopeRoot).toHaveBeenCalledWith(
      'user',
      '/tmp/workspace',
      '/tmp/home',
    );
    expect(installIdeas).toHaveBeenCalledWith(
      expect.objectContaining({ targetRoot: '/tmp/home' }),
    );
  });

  it('--scope project installs to project root', async () => {
    const { command, resolveProjectRoot, installIdeas } = createHarness();

    await runCommand(command, [], ['--scope', 'project']);

    expect(resolveProjectRoot).toHaveBeenCalledWith('/tmp/workspace');
    expect(installIdeas).toHaveBeenCalledWith(
      expect.objectContaining({ targetRoot: '/tmp/workspace' }),
    );
  });

  it('--force with interactive confirms before overwriting', async () => {
    const { command, confirmAction, installIdeas, capture } = createHarness({
      interactive: true,
      confirmResponses: [false],
    });

    await runCommand(command, ['--force'], ['--scope', 'project']);

    expect(confirmAction).toHaveBeenCalledTimes(1);
    expect(installIdeas).not.toHaveBeenCalled();
    expect(capture.info.at(-1)).toContain('Cancelled');
    expect(process.exitCode).toBe(0);
  });

  it('text output shows counts and sync reminder', async () => {
    const { command, capture } = createHarness();

    await runCommand(command, [], ['--scope', 'project']);

    expect(capture.info[0]).toContain('Installed ideas tool pack');
    expect(capture.info.some((line) => line.includes('Skills: copied=1'))).toBe(
      true,
    );
    expect(capture.info.at(-1)).toContain('oat sync --scope project --apply');
    expect(process.exitCode).toBe(0);
  });

  it('json output emits full result', async () => {
    const { command, capture } = createHarness();

    await runCommand(command, [], ['--scope', 'project', '--json']);

    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'ok',
      scope: 'project',
      targetRoot: '/tmp/workspace',
      assetsRoot: '/tmp/assets',
      result: {
        copiedSkills: ['oat-idea-new'],
      },
    });
    expect(process.exitCode).toBe(0);
  });
});
