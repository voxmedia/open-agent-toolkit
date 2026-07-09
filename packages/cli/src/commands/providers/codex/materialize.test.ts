import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { CommandContext, GlobalOptions } from '@app/command-context';
import {
  createLoggerCapture,
  type LoggerCapture,
} from '@commands/__tests__/helpers';
import TOML from '@iarna/toml';
import type { Scope } from '@shared/types';
import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createProvidersCodexCommand } from './index';

interface HarnessOptions {
  cwd: string;
  home?: string;
}

interface RunArgs {
  globalArgs?: string[];
  commandArgs?: string[];
}

function reviewerMarkdown(name = 'oat-reviewer'): string {
  return `---\nname: ${name}\ndescription: Reviewer\nreadonly: true\n---\n\nReview carefully.\n`;
}

async function writeAgent(
  root: string,
  name: string,
  content = reviewerMarkdown(name),
): Promise<string> {
  const agentPath = join(root, '.agents', 'agents', `${name}.md`);
  await mkdir(join(root, '.agents', 'agents'), { recursive: true });
  await writeFile(agentPath, content, 'utf8');
  return agentPath;
}

function createHarness({ cwd, home = join(cwd, 'home') }: HarnessOptions): {
  capture: LoggerCapture;
  command: Command;
  resolveScopeRoot: ReturnType<typeof vi.fn>;
} {
  const capture = createLoggerCapture();
  const resolveScopeRoot = vi.fn(async (scope: 'project' | 'user') =>
    scope === 'project' ? cwd : home,
  );
  const command = createProvidersCodexCommand({
    materialize: {
      buildCommandContext: (globalOptions: GlobalOptions): CommandContext => ({
        scope: (globalOptions.scope ?? 'project') as Scope,
        dryRun: globalOptions.dryRun ?? false,
        verbose: globalOptions.verbose ?? false,
        json: globalOptions.json ?? false,
        cwd: globalOptions.cwd ?? cwd,
        home,
        interactive: !(globalOptions.json ?? false),
        logger: capture.logger,
      }),
      resolveScopeRoot,
    },
  });

  return { capture, command, resolveScopeRoot };
}

async function runCommand(
  command: Command,
  { globalArgs = [], commandArgs = [] }: RunArgs = {},
): Promise<void> {
  const program = new Command()
    .name('oat')
    .option('--json')
    .option('--verbose')
    .option('--cwd <path>')
    .exitOverride();

  const providers = new Command('providers');
  providers.addCommand(command);
  program.addCommand(providers);

  await program.parseAsync(
    [...globalArgs, 'providers', 'codex', 'materialize', ...commandArgs],
    { from: 'user' },
  );
}

describe('oat providers codex materialize', () => {
  const tempDirs: string[] = [];
  let originalExitCode: number | undefined;

  beforeEach(() => {
    originalExitCode = process.exitCode;
    process.exitCode = undefined;
  });

  afterEach(async () => {
    process.exitCode = originalExitCode;
    await Promise.all(
      tempDirs.map(async (dir) => {
        await rm(dir, { recursive: true, force: true });
      }),
    );
    tempDirs.length = 0;
  });

  it('returns a JSON dry-run preview without writing files', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-codex-materialize-'));
    tempDirs.push(root);
    await writeAgent(root, 'oat-reviewer');
    const { command, capture } = createHarness({ cwd: root });

    await runCommand(command, {
      globalArgs: ['--cwd', root, '--json'],
      commandArgs: [
        'oat-reviewer',
        '--model',
        'gpt-5.6-sol',
        '--effort',
        'xhigh',
        '--dry-run',
      ],
    });

    expect(capture.jsonPayloads).toHaveLength(1);
    expect(capture.jsonPayloads[0]).toMatchObject({
      dryRun: true,
      roleName: 'oat-reviewer-gpt-5-6-sol-xhigh',
      rolePath: join(
        root,
        '.codex',
        'agents',
        'oat-reviewer-gpt-5-6-sol-xhigh.toml',
      ),
      configPath: join(root, '.codex', 'config.toml'),
    });
    expect(
      (capture.jsonPayloads[0] as { tomlPreview: string }).tomlPreview,
    ).toContain('model = "gpt-5.6-sol"');
    await expect(
      readFile(
        join(root, '.codex', 'agents', 'oat-reviewer-gpt-5-6-sol-xhigh.toml'),
        'utf8',
      ),
    ).rejects.toThrow();
  });

  it('resolves a named agent from .agents/agents', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-codex-materialize-'));
    tempDirs.push(root);
    const agentPath = await writeAgent(root, 'oat-reviewer');
    const { command, capture } = createHarness({ cwd: root });

    await runCommand(command, {
      globalArgs: ['--cwd', root, '--json'],
      commandArgs: [
        'oat-reviewer',
        '--model',
        'gpt-5.6-sol',
        '--effort',
        'xhigh',
        '--dry-run',
      ],
    });

    expect(capture.jsonPayloads[0]).toMatchObject({
      agentPath,
      roleName: 'oat-reviewer-gpt-5-6-sol-xhigh',
    });
  });

  it('supports --agent-path for custom canonical agents', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-codex-materialize-'));
    tempDirs.push(root);
    await writeAgent(root, 'custom');
    const { command, capture } = createHarness({ cwd: root });

    await runCommand(command, {
      globalArgs: ['--cwd', root, '--json'],
      commandArgs: [
        'ignored-name',
        '--agent-path',
        '.agents/agents/custom.md',
        '--model',
        'gpt-5.6-terra',
        '--effort',
        'high',
        '--dry-run',
      ],
    });

    expect(capture.jsonPayloads[0]).toMatchObject({
      agentPath: join(root, '.agents', 'agents', 'custom.md'),
      roleName: 'custom-gpt-5-6-terra-high',
    });
  });

  it('reports actionable errors for missing model or effort', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-codex-materialize-'));
    tempDirs.push(root);
    await writeAgent(root, 'oat-reviewer');
    const { command, capture } = createHarness({ cwd: root });

    await runCommand(command, {
      globalArgs: ['--cwd', root],
      commandArgs: ['oat-reviewer', '--effort', 'xhigh', '--dry-run'],
    });

    expect(process.exitCode).toBe(1);
    expect(capture.error[0]).toContain('--model');

    process.exitCode = undefined;
    const secondHarness = createHarness({ cwd: root });
    await runCommand(secondHarness.command, {
      globalArgs: ['--cwd', root],
      commandArgs: ['oat-reviewer', '--model', 'gpt-5.6-sol', '--dry-run'],
    });

    expect(process.exitCode).toBe(1);
    expect(secondHarness.capture.error[0]).toContain('--effort');
  });

  it('writes materialized role files and merges Codex config idempotently', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-codex-materialize-'));
    tempDirs.push(root);
    await writeAgent(root, 'oat-reviewer');
    await mkdir(join(root, '.codex'), { recursive: true });
    await writeFile(
      join(root, '.codex', 'config.toml'),
      `title = "Custom"\n[features]\ncustom = true\n[agents.custom]\ndescription = "Keep me"\nconfig_file = "agents/custom.toml"\n`,
      'utf8',
    );
    const { command, capture } = createHarness({ cwd: root });
    const commandArgs = [
      'oat-reviewer',
      '--model',
      'gpt-5.6-sol',
      '--effort',
      'xhigh',
    ];

    await runCommand(command, {
      globalArgs: ['--cwd', root, '--json'],
      commandArgs,
    });

    expect(process.exitCode).toBe(0);
    expect(capture.jsonPayloads[0]).toMatchObject({
      dryRun: false,
      status: 'written',
      roleName: 'oat-reviewer-gpt-5-6-sol-xhigh',
    });

    const rolePath = join(
      root,
      '.codex',
      'agents',
      'oat-reviewer-gpt-5-6-sol-xhigh.toml',
    );
    const configPath = join(root, '.codex', 'config.toml');
    const roleContent = await readFile(rolePath, 'utf8');
    const configContent = await readFile(configPath, 'utf8');
    const parsedConfig = TOML.parse(configContent) as Record<string, unknown>;
    const features = parsedConfig.features as Record<string, unknown>;
    const agents = parsedConfig.agents as Record<string, unknown>;
    const materializedAgent = agents[
      'oat-reviewer-gpt-5-6-sol-xhigh'
    ] as Record<string, unknown>;

    expect(roleContent).toContain('model = "gpt-5.6-sol"');
    expect(roleContent).toContain('model_reasoning_effort = "xhigh"');
    expect(parsedConfig.title).toBe('Custom');
    expect(features.custom).toBe(true);
    expect(features.multi_agent).toBe(true);
    expect(agents.custom).toBeDefined();
    expect(materializedAgent.description).toBe('Reviewer');
    expect(materializedAgent.config_file).toBe(
      'agents/oat-reviewer-gpt-5-6-sol-xhigh.toml',
    );

    process.exitCode = undefined;
    const secondHarness = createHarness({ cwd: root });
    await runCommand(secondHarness.command, {
      globalArgs: ['--cwd', root, '--json'],
      commandArgs,
    });

    expect(process.exitCode).toBe(0);
    expect(await readFile(rolePath, 'utf8')).toBe(roleContent);
    expect(await readFile(configPath, 'utf8')).toBe(configContent);
  });
});
