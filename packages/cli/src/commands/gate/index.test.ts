import {
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import type { CommandContext, GlobalOptions } from '@app/command-context';
import {
  createLoggerCapture,
  type LoggerCapture,
} from '@commands/__tests__/helpers';
import { BUILTIN_EXEC_TARGETS, type ExecTarget } from '@config/oat-config';
import { resolveEffectiveConfig, resolveExecTargets } from '@config/resolve';
import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createGateCommand, selectExecTarget } from './index';

interface HarnessOptions {
  cwd: string;
  home: string;
  processEnv?: NodeJS.ProcessEnv;
  runProcess?: ProcessRunner;
}

interface ProcessCall {
  command: string;
  args: string[];
  purpose: 'host-detection' | 'availability' | 'execute';
  stdio: 'ignore' | 'inherit';
  timeoutMs: number;
}

type ProcessRunner = (
  command: string,
  args: string[],
  options: {
    cwd: string;
    env: NodeJS.ProcessEnv;
    purpose: ProcessCall['purpose'];
    stdio: ProcessCall['stdio'];
    timeoutMs: number;
  },
) => Promise<{ exitCode: number; timedOut?: boolean }>;

type ProcessCallInput = ProcessCall & {
  cwd: string;
};

let lastExecutePrompt = '';

function createHarness(options: HarnessOptions): {
  capture: LoggerCapture;
  command: Command;
} {
  const capture = createLoggerCapture();

  const overrides = {
    buildCommandContext: (globalOptions: GlobalOptions): CommandContext => ({
      scope: (globalOptions.scope ?? 'project') as 'project' | 'user' | 'all',
      dryRun: false,
      verbose: globalOptions.verbose ?? false,
      json: globalOptions.json ?? false,
      cwd: globalOptions.cwd ?? options.cwd,
      home: options.home,
      interactive: !(globalOptions.json ?? false),
      logger: capture.logger,
    }),
    resolveProjectRoot: vi.fn(async () => options.cwd),
    processEnv: options.processEnv ?? {},
    ...(options.runProcess ? { runProcess: options.runProcess } : {}),
  } as Parameters<typeof createGateCommand>[0];

  const command = createGateCommand(overrides);

  return { capture, command };
}

async function runCommand(
  command: Command,
  commandArgs: string[],
  globalArgs: string[] = ['--json'],
): Promise<void> {
  const program = new Command()
    .name('oat')
    .option('--json')
    .option('--verbose')
    .option('--scope <scope>')
    .option('--cwd <path>')
    .exitOverride();

  program.addCommand(command);
  await program.parseAsync([...globalArgs, 'gate', ...commandArgs], {
    from: 'user',
  });
}

async function runGateCommand(
  root: string,
  home: string,
  commandArgs: string[],
  globalArgs: string[] = ['--json'],
): Promise<LoggerCapture> {
  process.exitCode = undefined;
  const { command, capture } = createHarness({ cwd: root, home });
  await runCommand(command, commandArgs, globalArgs);
  return capture;
}

async function readJsonFile(path: string): Promise<unknown> {
  return JSON.parse(await readFile(path, 'utf8'));
}

async function readResolvedTargets(root: string, home: string) {
  const effective = await resolveEffectiveConfig(root, join(home, '.oat'), {});
  return resolveExecTargets(effective);
}

function processKey(command: string, args: string[]): string {
  return [command, ...args].join(' ');
}

function targetCommandKey(target: ExecTarget): string {
  return processKey(target.baseCommand[0] ?? '', target.baseCommand.slice(1));
}

function createProcessRunner(
  options: {
    availableTargets?: Iterable<string>;
    executeExitCode?: number;
    executeTimedOut?: boolean;
    onExecute?: (call: ProcessCallInput) => Promise<void> | void;
  } = {},
): { calls: ProcessCall[]; runProcess: ProcessRunner } {
  const calls: ProcessCall[] = [];
  const availableTargets = new Set(
    options.availableTargets ?? [
      'codex-default',
      'claude-default',
      'cursor-default',
    ],
  );
  const commandToTarget = new Map(
    Object.entries(BUILTIN_EXEC_TARGETS).flatMap(([id, target]) => [
      [targetCommandKey(target), id],
      target.availabilityCommand
        ? [
            processKey(
              target.availabilityCommand[0] ?? '',
              target.availabilityCommand.slice(1),
            ),
            id,
          ]
        : [targetCommandKey(target), id],
    ]),
  );

  const runProcess: ProcessRunner = async (command, args, runOptions) => {
    calls.push({
      command,
      args: [...args],
      purpose: runOptions.purpose,
      stdio: runOptions.stdio,
      timeoutMs: runOptions.timeoutMs,
    });

    if (runOptions.purpose === 'host-detection') {
      const script = args[1] ?? '';
      if (script.includes('CLAUDECODE')) {
        return { exitCode: runOptions.env.CLAUDECODE ? 0 : 1 };
      }
      if (
        script.includes('CODEX_THREAD_ID') ||
        script.includes('CODEX_SESSION_ID')
      ) {
        return {
          exitCode:
            runOptions.env.CODEX_THREAD_ID || runOptions.env.CODEX_SESSION_ID
              ? 0
              : 1,
        };
      }
      if (script.includes('CURSOR_AGENT')) {
        return { exitCode: runOptions.env.CURSOR_AGENT ? 0 : 1 };
      }
      return { exitCode: 1 };
    }

    if (runOptions.purpose === 'availability') {
      const targetId = commandToTarget.get(processKey(command, args));
      return { exitCode: targetId && availableTargets.has(targetId) ? 0 : 1 };
    }

    if (runOptions.purpose === 'execute') {
      lastExecutePrompt = args.at(-1) ?? '';
      await options.onExecute?.({
        command,
        args: [...args],
        purpose: runOptions.purpose,
        stdio: runOptions.stdio,
        cwd: runOptions.cwd,
      });
    }

    return {
      exitCode: options.executeTimedOut ? 124 : (options.executeExitCode ?? 0),
      ...(options.executeTimedOut ? { timedOut: true } : {}),
    };
  };

  return { calls, runProcess };
}

async function runCrossProviderExec(options: {
  root: string;
  home: string;
  processEnv?: NodeJS.ProcessEnv;
  runProcess: ProcessRunner;
  args?: string[];
  globalArgs?: string[];
}): Promise<LoggerCapture> {
  process.exitCode = undefined;
  const { command, capture } = createHarness({
    cwd: options.root,
    home: options.home,
    processEnv: options.processEnv,
    runProcess: options.runProcess,
  });
  await runCommand(
    command,
    ['cross-provider-exec', ...(options.args ?? ['Run', 'review'])],
    options.globalArgs,
  );
  return capture;
}

async function runReviewGate(options: {
  root: string;
  home: string;
  processEnv?: NodeJS.ProcessEnv;
  runProcess: ProcessRunner;
  args?: string[];
  globalArgs?: string[];
}): Promise<LoggerCapture> {
  process.exitCode = undefined;
  const { command, capture } = createHarness({
    cwd: options.root,
    home: options.home,
    processEnv: options.processEnv,
    runProcess: options.runProcess,
  });
  await runCommand(
    command,
    [
      'review',
      ...(options.args ?? [
        '--target',
        'codex-default',
        'Review',
        'the',
        'current',
        'project',
      ]),
    ],
    options.globalArgs,
  );
  return capture;
}

describe('oat gate', () => {
  const tempDirs: string[] = [];
  let originalExitCode: number | undefined;

  beforeEach(() => {
    originalExitCode = process.exitCode;
    process.exitCode = undefined;
    lastExecutePrompt = '';
  });

  afterEach(async () => {
    process.exitCode = originalExitCode;
    await Promise.all(
      tempDirs.map(async (dir) => rm(dir, { recursive: true, force: true })),
    );
    tempDirs.length = 0;
  });

  async function setup(): Promise<{ root: string; home: string }> {
    const root = await mkdtemp(join(tmpdir(), 'oat-gate-command-'));
    const home = await mkdtemp(join(tmpdir(), 'oat-gate-home-'));
    tempDirs.push(root, home);
    await mkdir(join(root, '.oat'), { recursive: true });
    return { root, home };
  }

  async function writeProject(
    root: string,
    projectPath = '.oat/projects/shared/demo',
  ): Promise<string> {
    await mkdir(join(root, projectPath), { recursive: true });
    await writeFile(
      join(root, projectPath, 'state.md'),
      ['---', 'oat_kind: implementation', '---', '', '# State'].join('\n'),
      'utf8',
    );
    return projectPath;
  }

  async function writeActiveProject(
    root: string,
    projectPath: string,
  ): Promise<void> {
    await writeFile(
      join(root, '.oat', 'config.local.json'),
      `${JSON.stringify({ version: 1, activeProject: projectPath })}\n`,
      'utf8',
    );
  }

  async function writeImplementation(
    root: string,
    projectPath: string,
    dispatchLine: string,
  ): Promise<void> {
    await writeFile(
      join(root, projectPath, 'implementation.md'),
      ['# Implementation', '', '#### Dispatch Notes', '', dispatchLine].join(
        '\n',
      ),
      'utf8',
    );
  }

  async function writeReviewArtifact(options: {
    root: string;
    projectPath: string;
    fileName?: string;
    generatedAt?: string;
    reviewScope?: string;
    finding?: 'important' | 'minor' | 'clean';
    omitMediumSection?: boolean;
    counts?: {
      critical: number;
      important: number;
      medium: number;
      minor: number;
    };
    reviewInvocation?: 'gate' | 'manual' | 'auto' | null;
    omitGateInvocation?: boolean;
    gateInvocationOverrides?: Partial<{
      oat_gate_run_id: string;
      oat_gate_target: string;
      oat_gate_runtime: string;
      oat_invocation_model: string;
      oat_invocation_reasoning_effort: string;
      oat_invocation_source: string;
    }>;
  }): Promise<string> {
    const relativePath = `${options.projectPath}/reviews/${options.fileName ?? 'p01-review.md'}`;
    await mkdir(join(options.root, dirname(relativePath)), {
      recursive: true,
    });
    const importantContent =
      options.finding === 'important'
        ? ['- Important finding that should block.']
        : ['None.'];
    const minorContent =
      options.finding === 'minor'
        ? ['- Minor finding that still needs disposition.']
        : ['None.'];
    const countLines = options.counts
      ? [
          `oat_review_critical_count: ${options.counts.critical}`,
          `oat_review_important_count: ${options.counts.important}`,
          `oat_review_medium_count: ${options.counts.medium}`,
          `oat_review_minor_count: ${options.counts.minor}`,
        ]
      : [];
    const mediumSection = options.omitMediumSection
      ? []
      : ['### Medium', '', 'None', ''];
    const gateInvocationKeys = [
      'oat_gate_run_id',
      'oat_gate_target',
      'oat_gate_runtime',
      'oat_invocation_model',
      'oat_invocation_reasoning_effort',
      'oat_invocation_source',
    ] as const;
    const gateInvocationLines = options.omitGateInvocation
      ? []
      : gateInvocationKeys.map((key) => {
          const override = options.gateInvocationOverrides?.[key];
          const promptValue = lastExecutePrompt.match(
            new RegExp(`^${key}: (.+)$`, 'm'),
          )?.[1];
          return `${key}: ${override ?? promptValue ?? 'unknown'}`;
        });
    await writeFile(
      join(options.root, relativePath),
      [
        '---',
        'oat_generated: true',
        `oat_generated_at: ${options.generatedAt ?? '2026-06-01T00:00:00Z'}`,
        'oat_review_type: code',
        `oat_review_scope: ${options.reviewScope ?? 'p01'}`,
        ...(options.reviewInvocation === null
          ? []
          : [`oat_review_invocation: ${options.reviewInvocation ?? 'gate'}`]),
        `oat_project: ${options.projectPath}`,
        ...gateInvocationLines,
        ...countLines,
        '---',
        '',
        '# Review',
        '',
        '## Findings',
        '',
        '### Critical',
        '',
        'None',
        '',
        '### Important',
        '',
        ...importantContent,
        '',
        ...mediumSection,
        '### Minor',
        '',
        ...minorContent,
      ].join('\n'),
      'utf8',
    );
    return relativePath;
  }

  async function writeAdhocReviewArtifact(options: {
    root: string;
    fileName?: string;
    generatedAt?: string;
    finding?: 'important' | 'clean';
  }): Promise<string> {
    const relativePath = `.oat/repo/reviews/${options.fileName ?? 'ad-hoc-review.md'}`;
    await mkdir(join(options.root, dirname(relativePath)), {
      recursive: true,
    });
    const importantContent =
      options.finding === 'important'
        ? ['- Important finding that should not be accepted by project gate.']
        : ['None.'];
    await writeFile(
      join(options.root, relativePath),
      [
        '---',
        'oat_generated: true',
        `oat_generated_at: ${options.generatedAt ?? '2026-06-01T00:00:00Z'}`,
        'oat_review_type: code',
        'oat_review_scope: ad-hoc',
        'oat_review_invocation: gate',
        'oat_project: null',
        '---',
        '',
        '# Review',
        '',
        '## Findings',
        '',
        '### Critical',
        '',
        'None',
        '',
        '### Important',
        '',
        ...importantContent,
      ].join('\n'),
      'utf8',
    );
    return relativePath;
  }

  function expectSingleReviewPrompt(
    call: ProcessCall | undefined,
    expected: {
      command: string;
      baseArgs: string[];
      promptSnippets: string[];
    },
  ): void {
    expect(call).toMatchObject({
      command: expected.command,
      purpose: 'execute',
      stdio: 'inherit',
    });
    expect(call?.args.slice(0, expected.baseArgs.length)).toEqual(
      expected.baseArgs,
    );
    expect(call?.args).toHaveLength(expected.baseArgs.length + 1);
    const prompt = call?.args.at(-1) ?? '';
    for (const snippet of expected.promptSnippets) {
      expect(prompt).toContain(snippet);
    }
  }

  it('resolves a configured gate as JSON and exits zero', async () => {
    const { root, home } = await setup();
    await writeFile(
      join(root, '.oat', 'config.json'),
      `${JSON.stringify({
        version: 1,
        workflow: {
          gates: {
            skills: {
              'oat-project-plan': {
                command: 'pnpm test',
                description: 'Run the test suite before finishing.',
                onFailure: 'block',
                maxAttempts: 3,
              },
            },
          },
        },
      })}\n`,
      'utf8',
    );

    const { command, capture } = createHarness({ cwd: root, home });
    await runCommand(command, ['resolve', 'oat-project-plan']);

    expect(capture.jsonPayloads[0]).toEqual({
      command: 'pnpm test',
      description: 'Run the test suite before finishing.',
      onFailure: 'block',
      maxAttempts: 3,
    });
    expect(process.exitCode).toBe(0);
  });

  it('prints null and exits zero when a gate is absent', async () => {
    const { root, home } = await setup();

    const { command, capture } = createHarness({ cwd: root, home });
    await runCommand(command, ['resolve', 'oat-project-plan']);

    expect(capture.jsonPayloads[0]).toBeNull();
    expect(process.exitCode).toBe(0);
  });

  it('prints null and exits zero when a gate is disabled', async () => {
    const { root, home } = await setup();
    await writeFile(
      join(root, '.oat', 'config.json'),
      `${JSON.stringify({
        version: 1,
        workflow: {
          gates: {
            skills: {
              'oat-project-plan': null,
            },
          },
        },
      })}\n`,
      'utf8',
    );

    const { command, capture } = createHarness({ cwd: root, home });
    await runCommand(command, ['resolve', 'oat-project-plan']);

    expect(capture.jsonPayloads[0]).toBeNull();
    expect(process.exitCode).toBe(0);
  });

  it('prints null and exits zero for an unknown skill', async () => {
    const { root, home } = await setup();
    await writeFile(
      join(root, '.oat', 'config.json'),
      `${JSON.stringify({
        version: 1,
        workflow: {
          gates: {
            skills: {
              'oat-project-implement': {
                command: 'pnpm lint',
                onFailure: 'warn',
              },
            },
          },
        },
      })}\n`,
      'utf8',
    );

    const { command, capture } = createHarness({ cwd: root, home });
    await runCommand(command, ['resolve', 'oat-project-plan']);

    expect(capture.jsonPayloads[0]).toBeNull();
    expect(process.exitCode).toBe(0);
  });

  it('sets, disables, and unsets skill gates', async () => {
    const { root, home } = await setup();

    await runGateCommand(root, home, [
      'set',
      'oat-project-plan',
      '--command',
      'pnpm test',
      '--description',
      'Run tests before finishing.',
      '--on-failure',
      'block',
      '--max-attempts',
      '4',
      '--layer',
      'shared',
    ]);

    let capture = await runGateCommand(root, home, [
      'resolve',
      'oat-project-plan',
    ]);
    expect(capture.jsonPayloads[0]).toEqual({
      command: 'pnpm test',
      description: 'Run tests before finishing.',
      onFailure: 'block',
      maxAttempts: 4,
    });
    expect(process.exitCode).toBe(0);

    await runGateCommand(root, home, [
      'set',
      'oat-project-plan',
      '--disable',
      '--layer',
      'shared',
    ]);
    capture = await runGateCommand(root, home, ['resolve', 'oat-project-plan']);
    expect(capture.jsonPayloads[0]).toBeNull();
    expect(process.exitCode).toBe(0);

    await runGateCommand(root, home, [
      'unset',
      'oat-project-plan',
      '--layer',
      'shared',
    ]);
    const shared = (await readJsonFile(join(root, '.oat', 'config.json'))) as {
      workflow?: { gates?: { skills?: Record<string, unknown> } };
    };
    expect(
      shared.workflow?.gates?.skills?.['oat-project-plan'],
    ).toBeUndefined();
    expect(process.exitCode).toBe(0);
  });

  it('does not warn for durable oat gate command references', async () => {
    const { root, home } = await setup();

    const capture = await runGateCommand(
      root,
      home,
      [
        'set',
        'oat-project-plan',
        '--command',
        'oat gate review --target codex-default Review the plan',
        '--on-failure',
        'block',
      ],
      [],
    );

    expect(capture.warn).toHaveLength(0);
    expect(process.exitCode).toBe(0);
  });

  it('does not warn for unrelated absolute paths inside provider command strings', async () => {
    const { root, home } = await setup();

    const capture = await runGateCommand(
      root,
      home,
      [
        'set',
        'oat-project-plan',
        '--command',
        'claude -p "node /repo/packages/cli/dist/index.js gate review"',
        '--on-failure',
        'block',
      ],
      [],
    );

    expect(capture.warn).toHaveLength(0);
    expect(process.exitCode).toBe(0);
  });

  it('warns non-fatally in human output for obvious dev-build absolute gate commands', async () => {
    const { root, home } = await setup();

    const capture = await runGateCommand(
      root,
      home,
      [
        'set',
        'oat-project-plan',
        '--command',
        'node /repo/packages/cli/dist/index.js gate review --target codex-default Review the plan',
        '--on-failure',
        'block',
      ],
      [],
    );

    expect(capture.warn[0]).toContain(
      'Durable docs/config should reference `oat gate ...`',
    );
    expect(capture.warn[0]).toContain(
      'absolute dev-build paths are reserved for local development of unmerged behavior',
    );
    expect(process.exitCode).toBe(0);
  });

  it('includes non-fatal warnings in JSON output for dev-build absolute gate commands', async () => {
    const { root, home } = await setup();

    const capture = await runGateCommand(root, home, [
      'set',
      'oat-project-plan',
      '--command',
      'node /repo/packages/cli/dist/index.js gate review --target codex-default Review the plan',
      '--on-failure',
      'block',
    ]);

    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'ok',
      warnings: [
        expect.stringContaining(
          'Durable docs/config should reference `oat gate ...`',
        ),
      ],
    });
    expect(process.exitCode).toBe(0);
  });

  it('rejects invalid skill gate inputs with actionable errors', async () => {
    const { root, home } = await setup();

    let capture = await runGateCommand(root, home, [
      'set',
      'oat-project-plan',
      '--command',
      '',
      '--on-failure',
      'block',
    ]);
    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'error',
      message: expect.stringContaining('--command must be a non-empty string'),
    });
    expect(process.exitCode).toBe(1);

    capture = await runGateCommand(root, home, [
      'set',
      'oat-project-plan',
      '--command',
      'pnpm test',
      '--on-failure',
      'explode',
    ]);
    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'error',
      message: expect.stringContaining(
        '--on-failure must be one of block | prompt | warn',
      ),
    });
    expect(process.exitCode).toBe(1);
  });

  it('sets exec targets and preserves provider flags in JSON argv inputs', async () => {
    const { root, home } = await setup();

    await runGateCommand(root, home, [
      'target',
      'set',
      'claude-opus',
      '--runtime',
      'claude',
      '--base-command-json',
      '["claude","-p","--model","opus"]',
      '--host-detection-json',
      '["sh","-c","test -n \\"$CLAUDECODE\\""]',
      '--availability-json',
      '["claude","--version"]',
      '--invocation-model',
      'fable',
      '--invocation-reasoning-effort',
      'provider-default',
      '--priority',
      '50',
    ]);
    await runGateCommand(root, home, [
      'target',
      'set',
      'cursor-composer',
      '--runtime',
      'cursor',
      '--base-command-json',
      '["cursor-agent","-p","--model","composer-2.5"]',
    ]);
    await runGateCommand(root, home, [
      'target',
      'set',
      'codex-gpt',
      '--runtime',
      'codex',
      '--base-command-json',
      '["codex","exec","-m","gpt-5.5","--effort","high"]',
    ]);

    const targets = await readResolvedTargets(root, home);
    expect(targets['claude-opus']).toEqual({
      runtime: 'claude',
      baseCommand: ['claude', '-p', '--model', 'opus'],
      hostDetectionCommand: ['sh', '-c', 'test -n "$CLAUDECODE"'],
      availabilityCommand: ['claude', '--version'],
      invocation: {
        model: 'fable',
        reasoningEffort: 'provider-default',
      },
      priority: 50,
    });
    expect(targets['cursor-composer']?.baseCommand).toEqual([
      'cursor-agent',
      '-p',
      '--model',
      'composer-2.5',
    ]);
    expect(targets['codex-gpt']?.baseCommand).toEqual([
      'codex',
      'exec',
      '-m',
      'gpt-5.5',
      '--effort',
      'high',
    ]);
    expect(process.exitCode).toBe(0);
  });

  it('preserves existing priority and invocation fields when target set omits flags', async () => {
    const { root, home } = await setup();

    await runGateCommand(root, home, [
      'target',
      'set',
      'codex-reviewer',
      '--runtime',
      'codex',
      '--base-command-json',
      '["codex","exec"]',
      '--invocation-model',
      'gpt-5.6-sol',
      '--invocation-reasoning-effort',
      'max',
      '--priority',
      '75',
      '--layer',
      'shared',
    ]);
    await runGateCommand(root, home, [
      'target',
      'set',
      'codex-reviewer',
      '--runtime',
      'codex',
      '--base-command-json',
      '["codex","exec","--quiet"]',
      '--invocation-model',
      'gpt-5.6-terra',
      '--layer',
      'shared',
    ]);

    expect((await readResolvedTargets(root, home))['codex-reviewer']).toEqual({
      runtime: 'codex',
      baseCommand: ['codex', 'exec', '--quiet'],
      invocation: {
        model: 'gpt-5.6-terra',
        reasoningEffort: 'max',
      },
      priority: 75,
    });
  });

  it('lists resolved targets with origin, enablement, availability, and invocation metadata', async () => {
    const { root, home } = await setup();
    await writeFile(
      join(root, '.oat', 'config.json'),
      `${JSON.stringify({
        version: 1,
        workflow: {
          gates: {
            execTargets: {
              'codex-default': {
                invocation: {
                  model: 'gpt-5.6-sol',
                  reasoningEffort: 'max',
                },
              },
              'claude-default': null,
              'custom-reviewer': {
                runtime: 'custom',
                baseCommand: ['custom-review'],
                priority: 10,
              },
            },
          },
        },
      })}\n`,
      'utf8',
    );
    const runner = createProcessRunner({
      availableTargets: ['codex-default'],
    });
    const { command, capture } = createHarness({
      cwd: root,
      home,
      runProcess: runner.runProcess,
    });

    await runCommand(command, ['target', 'list']);

    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'ok',
      targets: expect.arrayContaining([
        {
          id: 'codex-default',
          runtime: 'codex',
          origin: 'shared',
          explicitlyConfigured: true,
          enabled: true,
          available: true,
          invocation: {
            model: 'gpt-5.6-sol',
            reasoningEffort: 'max',
            source: 'exec-target-config',
          },
        },
        {
          id: 'claude-default',
          runtime: 'claude',
          origin: 'shared',
          explicitlyConfigured: true,
          enabled: false,
          available: false,
          invocation: {
            model: 'provider-default',
            reasoningEffort: 'provider-default',
            source: 'exec-target-config',
          },
        },
        {
          id: 'cursor-default',
          runtime: 'cursor',
          origin: 'builtin',
          explicitlyConfigured: false,
          enabled: true,
          available: false,
          invocation: {
            model: 'provider-default',
            reasoningEffort: 'provider-default',
            source: 'exec-target-config',
          },
        },
        {
          id: 'custom-reviewer',
          runtime: 'custom',
          origin: 'shared',
          explicitlyConfigured: true,
          enabled: true,
          available: true,
          invocation: {
            model: 'unknown',
            reasoningEffort: 'unknown',
            source: 'unknown',
          },
        },
      ]),
    });
    expect(runner.calls.filter((call) => call.purpose === 'execute')).toEqual(
      [],
    );
    expect(
      runner.calls.filter((call) => call.purpose === 'availability'),
    ).toHaveLength(2);
  });

  it('isolates rejected availability probes while listing other targets', async () => {
    const { root, home } = await setup();
    await writeFile(
      join(root, '.oat', 'config.json'),
      `${JSON.stringify({
        version: 1,
        workflow: {
          gates: {
            execTargets: {
              'missing-reviewer': {
                runtime: 'missing',
                baseCommand: ['missing-reviewer'],
                availabilityCommand: ['missing-reviewer', '--version'],
                priority: 20,
              },
              'available-reviewer': {
                runtime: 'available',
                baseCommand: ['available-reviewer'],
                availabilityCommand: ['available-reviewer', '--version'],
                priority: 10,
              },
            },
          },
        },
      })}\n`,
      'utf8',
    );
    const calls: ProcessCall[] = [];
    const runProcess: ProcessRunner = async (command, args, options) => {
      calls.push({
        command,
        args: [...args],
        purpose: options.purpose,
        stdio: options.stdio,
        timeoutMs: options.timeoutMs,
      });
      if (options.purpose === 'execute') {
        throw new Error('target list must not execute a reviewer');
      }
      if (
        options.purpose === 'availability' &&
        command === 'missing-reviewer'
      ) {
        throw new Error('spawn missing-reviewer ENOENT');
      }
      return {
        exitCode:
          options.purpose === 'availability' && command === 'available-reviewer'
            ? 0
            : 1,
      };
    };
    const { command, capture } = createHarness({
      cwd: root,
      home,
      runProcess,
    });

    await runCommand(command, ['target', 'list']);

    expect(capture.jsonPayloads[0]).toMatchObject({ status: 'ok' });
    expect(capture.jsonPayloads[0]?.targets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'missing-reviewer',
          available: false,
        }),
        expect.objectContaining({
          id: 'available-reviewer',
          available: true,
        }),
      ]),
    );
    expect(calls.filter((call) => call.purpose === 'execute')).toEqual([]);
  });

  it('normalizes exec target models from config', async () => {
    const { root, home } = await setup();
    await writeFile(
      join(root, '.oat', 'config.json'),
      `${JSON.stringify({
        version: 1,
        workflow: {
          gates: {
            execTargets: {
              'cursor-reviewer': {
                runtime: 'cursor',
                baseCommand: ['cursor-agent', '-p'],
                models: ['gpt-5.5', 'composer-2.5'],
                priority: 150,
              },
            },
          },
        },
      })}\n`,
      'utf8',
    );

    const targets = await readResolvedTargets(root, home);
    expect(targets['cursor-reviewer']).toEqual({
      runtime: 'cursor',
      baseCommand: ['cursor-agent', '-p'],
      models: ['gpt-5.5', 'composer-2.5'],
      priority: 150,
    });
  });

  it('disables and unsets exec targets', async () => {
    const { root, home } = await setup();

    await runGateCommand(root, home, [
      'target',
      'set',
      'codex-default',
      '--disable',
      '--layer',
      'shared',
    ]);
    let targets = await readResolvedTargets(root, home);
    expect(targets['codex-default']).toBeUndefined();

    await runGateCommand(root, home, [
      'target',
      'unset',
      'codex-default',
      '--layer',
      'shared',
    ]);
    targets = await readResolvedTargets(root, home);
    expect(targets['codex-default']).toEqual(
      BUILTIN_EXEC_TARGETS['codex-default'],
    );
    expect(process.exitCode).toBe(0);
  });

  it('uses command discovery for the built-in cursor target availability check', () => {
    expect(BUILTIN_EXEC_TARGETS['cursor-default']?.availabilityCommand).toEqual(
      ['sh', '-c', 'command -v cursor-agent || command -v agent'],
    );
  });

  it('rejects malformed target JSON and non-array argv inputs', async () => {
    const { root, home } = await setup();

    let capture = await runGateCommand(root, home, [
      'target',
      'set',
      'bad-json',
      '--runtime',
      'claude',
      '--base-command-json',
      'not-json',
    ]);
    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'error',
      message: expect.stringContaining(
        '--base-command-json must be valid JSON',
      ),
    });
    expect(process.exitCode).toBe(1);

    capture = await runGateCommand(root, home, [
      'target',
      'set',
      'bad-argv',
      '--runtime',
      'claude',
      '--base-command-json',
      '{"cmd":"claude"}',
    ]);
    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'error',
      message: expect.stringContaining(
        '--base-command-json must be a non-empty JSON array of strings',
      ),
    });
    expect(process.exitCode).toBe(1);
  });

  it('writes the selected layer and preserves sibling gate config', async () => {
    const { root, home } = await setup();
    await writeFile(
      join(root, '.oat', 'config.json'),
      `${JSON.stringify({
        version: 1,
        workflow: {
          gates: {
            skills: {
              existing: {
                command: 'pnpm lint',
                onFailure: 'warn',
              },
            },
            execTargets: {
              existing: {
                runtime: 'custom',
                baseCommand: ['custom-review'],
                priority: 5,
              },
            },
          },
        },
      })}\n`,
      'utf8',
    );

    await runGateCommand(root, home, [
      'set',
      'oat-project-plan',
      '--command',
      'pnpm test',
      '--on-failure',
      'prompt',
      '--layer',
      'shared',
    ]);
    await runGateCommand(root, home, [
      'target',
      'set',
      'local-reviewer',
      '--runtime',
      'local',
      '--base-command-json',
      '["local-reviewer"]',
      '--layer',
      'local',
    ]);
    await runGateCommand(root, home, [
      'set',
      'user-skill',
      '--command',
      'pnpm build',
      '--on-failure',
      'warn',
      '--layer',
      'user',
    ]);

    const shared = (await readJsonFile(join(root, '.oat', 'config.json'))) as {
      workflow?: {
        gates?: {
          skills?: Record<string, unknown>;
          execTargets?: Record<string, unknown>;
        };
      };
    };
    const local = (await readJsonFile(
      join(root, '.oat', 'config.local.json'),
    )) as {
      workflow?: { gates?: { execTargets?: Record<string, unknown> } };
    };
    const user = (await readJsonFile(join(home, '.oat', 'config.json'))) as {
      workflow?: { gates?: { skills?: Record<string, unknown> } };
    };

    expect(shared.workflow?.gates?.skills).toMatchObject({
      existing: { command: 'pnpm lint', onFailure: 'warn', maxAttempts: 2 },
      'oat-project-plan': {
        command: 'pnpm test',
        onFailure: 'prompt',
        maxAttempts: 2,
      },
    });
    expect(shared.workflow?.gates?.execTargets?.existing).toEqual({
      runtime: 'custom',
      baseCommand: ['custom-review'],
      priority: 5,
    });
    expect(local.workflow?.gates?.execTargets?.['local-reviewer']).toEqual({
      runtime: 'local',
      baseCommand: ['local-reviewer'],
      priority: 0,
    });
    expect(user.workflow?.gates?.skills?.['user-skill']).toEqual({
      command: 'pnpm build',
      onFailure: 'warn',
      maxAttempts: 2,
    });
    expect(process.exitCode).toBe(0);
  });

  it('rejects auto and invalid write layers', async () => {
    const { root, home } = await setup();

    let capture = await runGateCommand(root, home, [
      'set',
      'oat-project-plan',
      '--command',
      'pnpm test',
      '--on-failure',
      'block',
      '--layer',
      'auto',
    ]);
    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'error',
      message: expect.stringContaining(
        '--layer must be one of shared | local | user',
      ),
    });
    expect(process.exitCode).toBe(1);

    capture = await runGateCommand(root, home, [
      'target',
      'set',
      'reviewer',
      '--runtime',
      'codex',
      '--base-command-json',
      '["codex","exec"]',
      '--layer',
      'global',
    ]);
    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'error',
      message: expect.stringContaining(
        '--layer must be one of shared | local | user',
      ),
    });
    expect(process.exitCode).toBe(1);
  });

  it('accepts same-family avoidance and defaults to it', async () => {
    const { root, home } = await setup();
    const runner = createProcessRunner();

    await runCrossProviderExec({
      root,
      home,
      processEnv: { CLAUDECODE: '1' },
      runProcess: runner.runProcess,
      args: ['--avoid', 'same-family', 'Run', 'review'],
    });

    expect(runner.calls.at(-1)).toMatchObject({
      command: 'codex',
      args: ['exec', 'Run', 'review'],
      purpose: 'execute',
    });
    expect(process.exitCode).toBe(0);

    const defaultRunner = createProcessRunner();
    await runCrossProviderExec({
      root,
      home,
      processEnv: { CLAUDECODE: '1' },
      runProcess: defaultRunner.runProcess,
    });

    expect(defaultRunner.calls.at(-1)).toMatchObject({
      command: 'codex',
      args: ['exec', 'Run', 'review'],
      purpose: 'execute',
    });
    expect(process.exitCode).toBe(0);
  });

  it('keeps same-runtime avoidance supported explicitly', async () => {
    const { root, home } = await setup();
    const runner = createProcessRunner();

    await runCrossProviderExec({
      root,
      home,
      processEnv: { CURSOR_AGENT: '1' },
      runProcess: runner.runProcess,
      args: ['--avoid', 'same-runtime', 'Run', 'review'],
    });

    expect(runner.calls.at(-1)).toMatchObject({
      command: 'claude',
      args: ['-p', 'Run', 'review'],
      purpose: 'execute',
    });
    expect(process.exitCode).toBe(0);
  });

  it('expands target models and appends the selected model before the prompt', async () => {
    const { root, home } = await setup();
    await writeFile(
      join(root, '.oat', 'config.json'),
      `${JSON.stringify({
        version: 1,
        workflow: {
          gates: {
            execTargets: {
              'cursor-reviewer': {
                runtime: 'cursor',
                baseCommand: ['cursor-agent', '-p'],
                models: ['gpt-5.5', 'composer-2.5'],
                priority: 150,
              },
              'claude-reviewer': {
                runtime: 'claude',
                baseCommand: ['claude', '-p', '--model', 'sonnet'],
                priority: 120,
              },
            },
          },
        },
      })}\n`,
      'utf8',
    );
    const runner = createProcessRunner();

    await runCrossProviderExec({
      root,
      home,
      runProcess: runner.runProcess,
      args: ['--avoid', 'none', 'Run', 'review'],
    });

    expect(runner.calls.at(-1)).toMatchObject({
      command: 'cursor-agent',
      args: ['-p', '--model', 'gpt-5.5', 'Run', 'review'],
      purpose: 'execute',
    });
    expect(process.exitCode).toBe(0);
  });

  it('keeps targets without models as one implicit candidate', async () => {
    const { root, home } = await setup();
    await writeFile(
      join(root, '.oat', 'config.json'),
      `${JSON.stringify({
        version: 1,
        workflow: {
          gates: {
            execTargets: {
              'plain-reviewer': {
                runtime: 'custom',
                baseCommand: ['plain-reviewer', 'run'],
                priority: 150,
              },
            },
          },
        },
      })}\n`,
      'utf8',
    );
    const runner = createProcessRunner();

    await runCrossProviderExec({
      root,
      home,
      runProcess: runner.runProcess,
      args: ['--avoid', 'none', 'Run', 'review'],
    });

    expect(runner.calls.at(-1)).toMatchObject({
      command: 'plain-reviewer',
      args: ['run', 'Run', 'review'],
      purpose: 'execute',
    });
    expect(process.exitCode).toBe(0);
  });

  it('treats long-form pinned model args as the candidate model without duplicating them', async () => {
    const { root, home } = await setup();
    await writeFile(
      join(root, '.oat', 'config.json'),
      `${JSON.stringify({
        version: 1,
        workflow: {
          gates: {
            execTargets: {
              'cursor-composer': {
                runtime: 'cursor',
                baseCommand: ['cursor-agent', '-p', '--model', 'composer-2.5'],
                priority: 150,
              },
            },
          },
        },
      })}\n`,
      'utf8',
    );
    const runner = createProcessRunner();

    await runCrossProviderExec({
      root,
      home,
      runProcess: runner.runProcess,
      args: ['--avoid', 'none', 'Run', 'review'],
    });

    expect(runner.calls.at(-1)).toMatchObject({
      command: 'cursor-agent',
      args: ['-p', '--model', 'composer-2.5', 'Run', 'review'],
      purpose: 'execute',
    });
    expect(
      runner.calls.at(-1)?.args.filter((arg) => arg === '--model'),
    ).toHaveLength(1);
    expect(process.exitCode).toBe(0);
  });

  it('lets a pinned model override a conflicting models list', async () => {
    const { root, home } = await setup();
    const projectPath = await writeProject(root);
    await writeActiveProject(root, projectPath);
    await writeFile(
      join(root, '.oat', 'config.json'),
      `${JSON.stringify({
        version: 1,
        workflow: {
          gates: {
            execTargets: {
              'cursor-pinned': {
                runtime: 'cursor',
                baseCommand: ['cursor-agent', '-p', '--model', 'gpt-5.5'],
                models: ['composer-2.5'],
                priority: 150,
              },
            },
          },
        },
      })}\n`,
      'utf8',
    );
    const runner = createProcessRunner({
      onExecute: async () => {
        await writeReviewArtifact({ root, projectPath, finding: 'clean' });
      },
    });

    const capture = await runReviewGate({
      root,
      home,
      runProcess: runner.runProcess,
      args: [
        '--avoid',
        'none',
        '--producer-identity',
        'composer-2.5:declared',
        'Review',
      ],
    });

    expect(runner.calls.at(-1)).toMatchObject({
      command: 'cursor-agent',
      args: ['-p', '--model', 'gpt-5.5', expect.stringContaining('Review')],
      purpose: 'execute',
    });
    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'ok',
      diversity: {
        reviewer: {
          target: 'cursor-pinned',
          model: 'gpt-5.5',
          family: 'openai',
        },
      },
    });
    expect(
      runner.calls.at(-1)?.args.filter((arg) => arg === '--model'),
    ).toHaveLength(1);
    expect(process.exitCode).toBe(0);
  });

  it('filters modeled candidates by producer family while keeping diverse models from the same target', async () => {
    const { root, home } = await setup();
    await writeFile(
      join(root, '.oat', 'config.json'),
      `${JSON.stringify({
        version: 1,
        workflow: {
          gates: {
            execTargets: {
              'cursor-reviewer': {
                runtime: 'cursor',
                baseCommand: ['cursor-agent', '-p'],
                models: ['gpt-5.5', 'composer-2.5'],
                priority: 150,
              },
            },
          },
        },
      })}\n`,
      'utf8',
    );
    const runner = createProcessRunner();

    await runCrossProviderExec({
      root,
      home,
      runProcess: runner.runProcess,
      args: ['--producer-identity', 'gpt-5.5-xhigh:declared', 'Run', 'review'],
    });

    expect(runner.calls.at(-1)).toMatchObject({
      command: 'cursor-agent',
      args: ['-p', '--model', 'composer-2.5', 'Run', 'review'],
      purpose: 'execute',
    });
    expect(process.exitCode).toBe(0);
  });

  it('uses producer identity from implementation stamps when no flag is supplied', async () => {
    const { root, home } = await setup();
    const projectPath = await writeProject(root);
    await writeActiveProject(root, projectPath);
    await writeImplementation(
      root,
      projectPath,
      'Dispatch: scope=p04 action=implementation role=implementer producer=gpt-5.5-xhigh provenance=declared model_axis=inherited effort_axis=selected:xhigh dispatch_policy=high dispatch_ceiling=xhigh target=oat-phase-implementer-xhigh',
    );
    await writeFile(
      join(root, '.oat', 'config.json'),
      `${JSON.stringify({
        version: 1,
        workflow: {
          gates: {
            execTargets: {
              'cursor-reviewer': {
                runtime: 'cursor',
                baseCommand: ['cursor-agent', '-p'],
                models: ['gpt-5.5', 'composer-2.5'],
                priority: 150,
              },
            },
          },
        },
      })}\n`,
      'utf8',
    );
    const runner = createProcessRunner({
      onExecute: async () => {
        await writeReviewArtifact({
          root,
          projectPath,
          finding: 'clean',
        });
      },
    });

    await runReviewGate({
      root,
      home,
      runProcess: runner.runProcess,
      args: ['--review-scope', 'p04', 'Review'],
    });

    expect(runner.calls.at(-1)).toMatchObject({
      command: 'cursor-agent',
      args: expect.arrayContaining(['--model', 'composer-2.5']),
      purpose: 'execute',
    });
    expect(process.exitCode).toBe(0);
  });

  it('aggregates producer families from implementation stamps for final review scope', async () => {
    const { root, home } = await setup();
    const projectPath = await writeProject(root);
    await writeActiveProject(root, projectPath);
    await writeImplementation(
      root,
      projectPath,
      [
        'Dispatch: scope=p02 action=implementation role=implementer producer=gpt-5.5-xhigh provenance=declared model_axis=inherited effort_axis=selected:xhigh dispatch_policy=high dispatch_ceiling=xhigh target=oat-phase-implementer-xhigh',
        'Dispatch: scope=p03 action=fix role=fix producer=claude-opus-4-8 provenance=declared model_axis=selected:opus effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=opus target=claude',
      ].join('\n'),
    );
    await writeFile(
      join(root, '.oat', 'config.json'),
      `${JSON.stringify({
        version: 1,
        workflow: {
          gates: {
            execTargets: {
              'codex-default': null,
              'claude-default': null,
              'cursor-default': null,
              'openai-reviewer': {
                runtime: 'cursor',
                baseCommand: ['cursor-agent', '-p'],
                models: ['gpt-5.5'],
                priority: 300,
              },
              'claude-reviewer': {
                runtime: 'claude',
                baseCommand: ['claude', '-p'],
                priority: 250,
              },
              'composer-reviewer': {
                runtime: 'cursor',
                baseCommand: ['cursor-agent', '-p'],
                models: ['composer-2.5'],
                priority: 100,
              },
            },
          },
        },
      })}\n`,
      'utf8',
    );
    const runner = createProcessRunner({
      onExecute: async () => {
        await writeReviewArtifact({
          root,
          projectPath,
          reviewScope: 'final',
          finding: 'clean',
        });
      },
    });

    const capture = await runReviewGate({
      root,
      home,
      runProcess: runner.runProcess,
      args: ['--review-scope', 'final', 'Review'],
    });

    expect(runner.calls.at(-1)).toMatchObject({
      command: 'cursor-agent',
      args: ['-p', '--model', 'composer-2.5', expect.any(String)],
      purpose: 'execute',
    });
    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'ok',
      diversity: {
        achieved: 'different-family',
        producer: {
          value: 'claude-opus-4-8',
          family: 'claude',
          source: 'stamp',
          avoidFamilies: expect.arrayContaining(['openai', 'claude']),
        },
        reviewer: {
          target: 'composer-reviewer',
          model: 'composer-2.5',
          family: 'composer',
        },
      },
    });
    expect(process.exitCode).toBe(0);
  });

  it('filters an unpinned Cursor target that would inherit the producer family', async () => {
    const { root, home } = await setup();
    await writeFile(
      join(root, '.oat', 'config.json'),
      `${JSON.stringify({
        version: 1,
        workflow: {
          gates: {
            execTargets: {
              'cursor-default': {
                runtime: 'cursor',
                baseCommand: ['cursor-agent', '-p'],
                priority: 150,
              },
            },
          },
        },
      })}\n`,
      'utf8',
    );
    const runner = createProcessRunner();

    await runCrossProviderExec({
      root,
      home,
      runProcess: runner.runProcess,
      args: ['--producer-identity', 'gpt-5.5-xhigh:declared', 'Run', 'review'],
    });

    expect(runner.calls.at(-1)).toMatchObject({
      command: 'claude',
      args: ['-p', 'Run', 'review'],
      purpose: 'execute',
    });
    expect(process.exitCode).toBe(0);
  });

  it('keeps unknown producer identity runnable without claiming family diversity', async () => {
    const { root, home } = await setup();
    await writeFile(
      join(root, '.oat', 'config.json'),
      `${JSON.stringify({
        version: 1,
        workflow: {
          gates: {
            execTargets: {
              'cursor-reviewer': {
                runtime: 'cursor',
                baseCommand: ['cursor-agent', '-p'],
                models: ['gpt-5.5'],
                priority: 150,
              },
            },
          },
        },
      })}\n`,
      'utf8',
    );
    const runner = createProcessRunner();

    await runCrossProviderExec({
      root,
      home,
      runProcess: runner.runProcess,
      args: ['--producer-identity', 'unknown:unknown', 'Run', 'review'],
    });

    expect(runner.calls.at(-1)).toMatchObject({
      command: 'cursor-agent',
      args: ['-p', '--model', 'gpt-5.5', 'Run', 'review'],
      purpose: 'execute',
    });
    expect(process.exitCode).toBe(0);
  });

  it('uses same-runtime filtering as the floor for unknown producer identity', async () => {
    const { root, home } = await setup();
    await writeFile(
      join(root, '.oat', 'config.json'),
      `${JSON.stringify({
        version: 1,
        workflow: {
          gates: {
            execTargets: {
              'claude-default': null,
              'cursor-reviewer': {
                runtime: 'cursor',
                baseCommand: ['cursor-agent', '-p'],
                models: ['gpt-5.5'],
                priority: 150,
              },
              'codex-reviewer': {
                runtime: 'codex',
                baseCommand: ['codex', 'exec'],
                priority: 100,
              },
            },
          },
        },
      })}\n`,
      'utf8',
    );
    const runner = createProcessRunner();

    await runCrossProviderExec({
      root,
      home,
      processEnv: { CURSOR_AGENT: '1' },
      runProcess: runner.runProcess,
      args: ['--producer-identity', 'unknown:unknown', 'Run', 'review'],
    });

    expect(runner.calls.at(-1)).toMatchObject({
      command: 'codex',
      args: ['exec', 'Run', 'review'],
      purpose: 'execute',
    });
    expect(process.exitCode).toBe(0);
  });

  it('falls back to same-runtime targets for unknown producer identity when no floor target is eligible', async () => {
    const { root, home } = await setup();
    await writeFile(
      join(root, '.oat', 'config.json'),
      `${JSON.stringify({
        version: 1,
        workflow: {
          gates: {
            execTargets: {
              'codex-default': null,
              'claude-default': null,
              'cursor-reviewer': {
                runtime: 'cursor',
                baseCommand: ['cursor-agent', '-p'],
                models: ['gpt-5.5'],
                priority: 150,
              },
            },
          },
        },
      })}\n`,
      'utf8',
    );
    const runner = createProcessRunner();

    await runCrossProviderExec({
      root,
      home,
      processEnv: { CURSOR_AGENT: '1' },
      runProcess: runner.runProcess,
      args: ['--producer-identity', 'unknown:unknown', 'Run', 'review'],
    });

    expect(runner.calls.at(-1)).toMatchObject({
      command: 'cursor-agent',
      args: ['-p', '--model', 'gpt-5.5', 'Run', 'review'],
      purpose: 'execute',
    });
    expect(process.exitCode).toBe(0);
  });

  it('records different-family diversity metadata in gate review JSON output', async () => {
    const { root, home } = await setup();
    const projectPath = await writeProject(root);
    await writeActiveProject(root, projectPath);
    await writeImplementation(
      root,
      projectPath,
      'Dispatch: scope=p04 action=implementation role=implementer producer=gpt-5.5-xhigh provenance=declared model_axis=inherited effort_axis=selected:xhigh dispatch_policy=high dispatch_ceiling=xhigh target=oat-phase-implementer-xhigh',
    );
    await writeFile(
      join(root, '.oat', 'config.json'),
      `${JSON.stringify({
        version: 1,
        workflow: {
          gates: {
            execTargets: {
              'cursor-reviewer': {
                runtime: 'cursor',
                baseCommand: ['cursor-agent', '-p'],
                models: ['gpt-5.5', 'composer-2.5'],
                priority: 150,
              },
            },
          },
        },
      })}\n`,
      'utf8',
    );
    const runner = createProcessRunner({
      onExecute: async () => {
        await writeReviewArtifact({ root, projectPath, finding: 'clean' });
      },
    });

    const capture = await runReviewGate({
      root,
      home,
      runProcess: runner.runProcess,
      args: ['--review-scope', 'p04', 'Review'],
    });

    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'ok',
      diversity: {
        achieved: 'different-family',
        producer: {
          value: 'gpt-5.5-xhigh',
          provenance: 'declared',
          confidence: 'medium',
          family: 'openai',
          source: 'stamp',
        },
        reviewer: {
          target: 'cursor-reviewer',
          runtime: 'cursor',
          model: 'composer-2.5',
          family: 'composer',
        },
      },
    });
    expect(process.exitCode).toBe(0);
  });

  it('warns and runs when no different-family target is available', async () => {
    const { root, home } = await setup();
    await writeFile(
      join(root, '.oat', 'config.json'),
      `${JSON.stringify({
        version: 1,
        workflow: {
          gates: {
            execTargets: {
              'claude-default': null,
              'cursor-default': null,
              'codex-default': {
                runtime: 'codex',
                baseCommand: ['codex', 'exec', '--model', 'gpt-5.3-codex'],
                priority: 100,
              },
            },
          },
        },
      })}\n`,
      'utf8',
    );
    const runner = createProcessRunner();

    const capture = await runCrossProviderExec({
      root,
      home,
      runProcess: runner.runProcess,
      args: ['--producer-identity', 'gpt-5.5-xhigh:declared', 'Run', 'review'],
      globalArgs: [],
    });

    expect(runner.calls.at(-1)).toMatchObject({
      command: 'codex',
      args: ['exec', '--model', 'gpt-5.3-codex', 'Run', 'review'],
      purpose: 'execute',
    });
    expect(capture.warn[0]).toContain(
      'No different-family gate target was available',
    );
    expect(capture.info.join('\n')).toContain(
      'achieved=degraded-to-different-slug',
    );
    expect(process.exitCode).toBe(0);
  });

  it('records same-family no-diverse metadata when fallback target family is unknown', async () => {
    const { root, home } = await setup();
    const projectPath = await writeProject(root);
    await writeActiveProject(root, projectPath);
    await writeFile(
      join(root, '.oat', 'config.json'),
      `${JSON.stringify({
        version: 1,
        workflow: {
          gates: {
            execTargets: {
              'codex-default': null,
              'claude-default': null,
              'cursor-default': {
                runtime: 'cursor',
                baseCommand: ['cursor-agent', '-p'],
                priority: 150,
              },
            },
          },
        },
      })}\n`,
      'utf8',
    );
    const runner = createProcessRunner({
      onExecute: async () => {
        await writeReviewArtifact({ root, projectPath, finding: 'clean' });
      },
    });

    const capture = await runReviewGate({
      root,
      home,
      runProcess: runner.runProcess,
      args: ['--producer-identity', 'gpt-5.5-xhigh:declared', 'Review'],
    });

    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'ok',
      diversity: {
        achieved: 'same-family - no diverse target available',
        warning: expect.stringContaining(
          'No different-family gate target was available',
        ),
        reviewer: {
          target: 'cursor-default',
          runtime: 'cursor',
          family: 'unknown',
        },
      },
    });
    expect(process.exitCode).toBe(0);
  });

  it('records unknown-producer diversity metadata', async () => {
    const { root, home } = await setup();
    const projectPath = await writeProject(root);
    await writeActiveProject(root, projectPath);
    const runner = createProcessRunner({
      onExecute: async () => {
        await writeReviewArtifact({ root, projectPath, finding: 'clean' });
      },
    });

    const capture = await runReviewGate({
      root,
      home,
      runProcess: runner.runProcess,
      args: [
        '--producer-identity',
        'unknown:unknown',
        '--target',
        'codex-default',
        'Review',
      ],
    });

    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'ok',
      diversity: {
        achieved: 'unknown-producer',
        producer: {
          value: 'unknown',
          provenance: 'unknown',
          confidence: 'unknown',
          family: 'unknown',
          source: 'flag',
        },
      },
    });
    expect(process.exitCode).toBe(0);
  });

  it('records a warning when unknown-producer fallback abandons the same-runtime floor', async () => {
    const { root, home } = await setup();
    const projectPath = await writeProject(root);
    await writeActiveProject(root, projectPath);
    await writeFile(
      join(root, '.oat', 'config.json'),
      `${JSON.stringify({
        version: 1,
        workflow: {
          gates: {
            execTargets: {
              'codex-default': null,
              'claude-default': null,
              'cursor-reviewer': {
                runtime: 'cursor',
                baseCommand: ['cursor-agent', '-p'],
                models: ['gpt-5.5'],
                priority: 150,
              },
            },
          },
        },
      })}\n`,
      'utf8',
    );
    const runner = createProcessRunner({
      onExecute: async () => {
        await writeReviewArtifact({ root, projectPath, finding: 'clean' });
      },
    });

    const capture = await runReviewGate({
      root,
      home,
      processEnv: { CURSOR_AGENT: '1' },
      runProcess: runner.runProcess,
      args: ['--producer-identity', 'unknown:unknown', 'Review'],
    });

    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'ok',
      diversity: {
        achieved: 'unknown-producer',
        warning: expect.stringContaining(
          'No different-family gate target was available',
        ),
        reviewer: {
          target: 'cursor-reviewer',
          runtime: 'cursor',
          family: 'openai',
          model: 'gpt-5.5',
        },
      },
    });
    expect(process.exitCode).toBe(0);
  });

  it('lists every supported avoidance mode in validation errors', async () => {
    const { root, home } = await setup();
    const runner = createProcessRunner();

    const capture = await runCrossProviderExec({
      root,
      home,
      runProcess: runner.runProcess,
      args: ['--avoid', 'explode', 'Run', 'review'],
    });

    expect(runner.calls).toHaveLength(0);
    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'error',
      message: expect.stringContaining(
        '--avoid must be one of same-family | same-runtime | none',
      ),
    });
    expect(process.exitCode).toBe(1);
  });

  it('selects targets by descending priority and lexicographic id', () => {
    const selected = selectExecTarget(
      {
        'codex-default': {
          runtime: 'codex',
          baseCommand: ['codex', 'exec'],
          priority: 100,
        },
        'claude-default': {
          runtime: 'claude',
          baseCommand: ['claude', '-p'],
          priority: 100,
        },
        'cursor-default': {
          runtime: 'cursor',
          baseCommand: ['cursor-agent', '-p'],
          priority: 70,
        },
      },
      'cursor',
      'same-family',
    );

    expect(selected).toEqual({
      id: 'claude-default',
      family: 'claude',
      target: {
        runtime: 'claude',
        baseCommand: ['claude', '-p'],
        priority: 100,
      },
    });
  });

  it('detects built-in runtimes and applies same-runtime floor for unknown producer defaults', async () => {
    const cases: Array<{
      name: string;
      env: NodeJS.ProcessEnv;
      expectedCommand: string;
      expectedArgs: string[];
      expectedDetectionCount: number;
    }> = [
      {
        name: 'claude',
        env: { CLAUDECODE: '1' },
        expectedCommand: 'codex',
        expectedArgs: ['exec', 'Run', 'review'],
        expectedDetectionCount: 1,
      },
      {
        name: 'codex thread',
        env: { CODEX_THREAD_ID: 'thread-1' },
        expectedCommand: 'claude',
        expectedArgs: ['-p', 'Run', 'review'],
        expectedDetectionCount: 2,
      },
      {
        name: 'codex session',
        env: { CODEX_SESSION_ID: 'session-1' },
        expectedCommand: 'claude',
        expectedArgs: ['-p', 'Run', 'review'],
        expectedDetectionCount: 2,
      },
      {
        name: 'cursor',
        env: { CURSOR_AGENT: '1' },
        expectedCommand: 'claude',
        expectedArgs: ['-p', 'Run', 'review'],
        expectedDetectionCount: 3,
      },
    ];

    for (const testCase of cases) {
      const { root, home } = await setup();
      const runner = createProcessRunner();

      await runCrossProviderExec({
        root,
        home,
        processEnv: testCase.env,
        runProcess: runner.runProcess,
      });

      expect(
        runner.calls.filter((call) => call.purpose === 'host-detection'),
        testCase.name,
      ).toHaveLength(testCase.expectedDetectionCount);
      expect(runner.calls.at(-1), testCase.name).toMatchObject({
        command: testCase.expectedCommand,
        args: testCase.expectedArgs,
        purpose: 'execute',
        stdio: 'inherit',
      });
      expect(process.exitCode).toBe(0);
    }
  });

  it('does not read ambient OAT runtime or target env vars', async () => {
    let setupResult = await setup();
    let runner = createProcessRunner({
      availableTargets: ['claude-default'],
    });

    await runCrossProviderExec({
      root: setupResult.root,
      home: setupResult.home,
      processEnv: { OAT_CURRENT_RUNTIME: 'claude' },
      runProcess: runner.runProcess,
    });

    expect(runner.calls.at(-1)).toMatchObject({
      command: 'claude',
      args: ['-p', 'Run', 'review'],
      purpose: 'execute',
    });
    expect(process.exitCode).toBe(0);

    setupResult = await setup();
    runner = createProcessRunner({
      availableTargets: ['codex-default'],
    });

    await runCrossProviderExec({
      root: setupResult.root,
      home: setupResult.home,
      processEnv: { CODEX_COMPANION_SESSION_ID: 'companion-1' },
      runProcess: runner.runProcess,
    });

    expect(runner.calls.at(-1)).toMatchObject({
      command: 'codex',
      args: ['exec', 'Run', 'review'],
      purpose: 'execute',
    });
    expect(process.exitCode).toBe(0);

    setupResult = await setup();
    runner = createProcessRunner();

    await runCrossProviderExec({
      root: setupResult.root,
      home: setupResult.home,
      processEnv: {
        CURSOR_AGENT: '1',
        OAT_GATE_EXEC_TARGET: 'codex-default',
      },
      runProcess: runner.runProcess,
    });

    expect(runner.calls.at(-1)).toMatchObject({
      command: 'claude',
      args: ['-p', 'Run', 'review'],
      purpose: 'execute',
    });
    expect(process.exitCode).toBe(0);
  });

  it('honors --current-runtime as an explicit detection override', async () => {
    const { root, home } = await setup();
    const runner = createProcessRunner();

    await runCrossProviderExec({
      root,
      home,
      processEnv: { CLAUDECODE: '1' },
      runProcess: runner.runProcess,
      args: ['--current-runtime', 'codex', 'Run', 'review'],
    });

    expect(
      runner.calls.filter((call) => call.purpose === 'host-detection'),
    ).toHaveLength(0);
    expect(runner.calls.at(-1)).toMatchObject({
      command: 'claude',
      args: ['-p', 'Run', 'review'],
      purpose: 'execute',
    });
    expect(process.exitCode).toBe(0);
  });

  it('runs an explicit --target and skips detection and avoidance', async () => {
    const { root, home } = await setup();
    const runner = createProcessRunner({ availableTargets: [] });

    await runCrossProviderExec({
      root,
      home,
      processEnv: { CLAUDECODE: '1' },
      runProcess: runner.runProcess,
      args: ['--target', 'claude-default', 'Run', 'review'],
    });

    expect(
      runner.calls.filter((call) => call.purpose !== 'execute'),
    ).toHaveLength(0);
    expect(runner.calls.at(-1)).toMatchObject({
      command: 'claude',
      args: ['-p', 'Run', 'review'],
      purpose: 'execute',
    });
    expect(process.exitCode).toBe(0);
  });

  it('fails with an actionable error for an unknown explicit target', async () => {
    const { root, home } = await setup();
    const runner = createProcessRunner();

    const capture = await runCrossProviderExec({
      root,
      home,
      runProcess: runner.runProcess,
      args: ['--target', 'missing-target', 'Run', 'review'],
    });

    expect(runner.calls).toHaveLength(0);
    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'error',
      message: expect.stringContaining('Unknown exec target "missing-target"'),
    });
    expect(process.exitCode).toBe(1);
  });

  it('supports --avoid none to keep same-runtime targets eligible', async () => {
    const { root, home } = await setup();
    const runner = createProcessRunner();

    await runCrossProviderExec({
      root,
      home,
      processEnv: { CLAUDECODE: '1' },
      runProcess: runner.runProcess,
      args: ['--avoid', 'none', 'Run', 'review'],
    });

    expect(runner.calls.at(-1)).toMatchObject({
      command: 'claude',
      args: ['-p', 'Run', 'review'],
      purpose: 'execute',
    });
    expect(process.exitCode).toBe(0);
  });

  it('fails when no eligible non-current runtime is available under explicit same-runtime avoidance', async () => {
    const { root, home } = await setup();
    await writeFile(
      join(root, '.oat', 'config.json'),
      `${JSON.stringify({
        version: 1,
        workflow: {
          gates: {
            execTargets: {
              'codex-default': null,
              'cursor-default': null,
            },
          },
        },
      })}\n`,
      'utf8',
    );
    const runner = createProcessRunner();

    const capture = await runCrossProviderExec({
      root,
      home,
      processEnv: { CLAUDECODE: '1' },
      runProcess: runner.runProcess,
      args: ['--avoid', 'same-runtime', 'Run', 'review'],
    });

    expect(
      runner.calls.filter((call) => call.purpose === 'execute'),
    ).toHaveLength(0);
    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'error',
      message: expect.stringContaining('No eligible gate exec target'),
    });
    expect(process.exitCode).toBe(1);
  });

  it('checks availability in deterministic order and runs the first available target', async () => {
    const { root, home } = await setup();
    const runner = createProcessRunner({
      availableTargets: ['codex-default'],
    });

    await runCrossProviderExec({
      root,
      home,
      processEnv: { CURSOR_AGENT: '1' },
      runProcess: runner.runProcess,
    });

    const availabilityCalls = runner.calls.filter(
      (call) => call.purpose === 'availability',
    );
    expect(availabilityCalls).toMatchObject([
      { command: 'claude', args: ['--version'] },
      { command: 'codex', args: ['--version'] },
    ]);
    expect(runner.calls.at(-1)).toMatchObject({
      command: 'codex',
      args: ['exec', 'Run', 'review'],
      purpose: 'execute',
    });
    expect(process.exitCode).toBe(0);
  });

  it('passes prompt args to the child command and exits with the child status', async () => {
    const { root, home } = await setup();
    const runner = createProcessRunner({ executeExitCode: 7 });

    await runCrossProviderExec({
      root,
      home,
      processEnv: { CLAUDECODE: '1' },
      runProcess: runner.runProcess,
      args: ['--avoid', 'same-runtime', 'Review', 'the', 'current', 'project'],
    });

    expect(runner.calls.at(-1)).toMatchObject({
      command: 'codex',
      args: ['exec', 'Review', 'the', 'current', 'project'],
      purpose: 'execute',
      stdio: 'inherit',
    });
    expect(process.exitCode).toBe(7);
  });

  it('keeps cross-provider-exec generic and does not inspect review artifacts', async () => {
    const { root, home } = await setup();
    await mkdir(join(root, '.oat', 'projects', 'shared', 'demo', 'reviews'), {
      recursive: true,
    });
    await writeFile(
      join(
        root,
        '.oat',
        'projects',
        'shared',
        'demo',
        'reviews',
        'p01-review.md',
      ),
      [
        '---',
        'oat_generated_at: 2026-06-01T00:00:00Z',
        'oat_review_type: code',
        'oat_review_scope: p01',
        '---',
        '',
        '## Findings',
        '',
        '### Important',
        '',
        '- Blocking finding that generic execution must ignore.',
      ].join('\n'),
      'utf8',
    );
    const runner = createProcessRunner({ executeExitCode: 0 });

    await runCrossProviderExec({
      root,
      home,
      runProcess: runner.runProcess,
      args: ['Review', 'the', 'current', 'project'],
    });

    expect(runner.calls.at(-1)).toMatchObject({
      purpose: 'execute',
      stdio: 'inherit',
    });
    expect(process.exitCode).toBe(0);
  });

  it('runs gate review through an explicit target, annotates the prompt, and blocks on Important findings', async () => {
    const { root, home } = await setup();
    const projectPath = await writeProject(root);
    await writeActiveProject(root, projectPath);
    let artifactPath = '';
    const runner = createProcessRunner({
      onExecute: async () => {
        artifactPath = await writeReviewArtifact({
          root,
          projectPath,
          finding: 'important',
        });
      },
    });

    const capture = await runReviewGate({
      root,
      home,
      runProcess: runner.runProcess,
      args: [
        '--target',
        'codex-default',
        '--review-scope',
        'plan',
        '--review-type',
        'artifact',
        '--exit-nonzero-on',
        'important',
        'Use oat-project-review-provide artifact plan.',
      ],
    });

    expect(runner.calls).toHaveLength(1);
    expectSingleReviewPrompt(runner.calls[0], {
      command: 'codex',
      baseArgs: ['exec'],
      promptSnippets: [
        'This review is gate-originated. If you run `oat-project-review-provide`, set `oat_review_invocation: gate` in the review artifact.',
        `Resolved OAT project path: ${projectPath}. Run the review for this project path.`,
        'Review type: artifact.',
        'Review scope: plan.',
        'Use oat-project-review-provide artifact plan.',
      ],
    });
    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'blocked',
      project: projectPath,
      artifactPath,
      threshold: 'important',
      counts: { critical: 0, important: 1 },
      handoff: expect.stringContaining('oat-project-review-receive'),
      corroboration: {
        run: 'matched',
        invocation: 'matched',
      },
    });
    expect(process.exitCode).toBe(1);
  });

  it('rejects gate artifacts missing configured invocation metadata', async () => {
    const { root, home } = await setup();
    const projectPath = await writeProject(root);
    await writeActiveProject(root, projectPath);
    const runner = createProcessRunner({
      onExecute: async () => {
        await writeReviewArtifact({
          root,
          projectPath,
          finding: 'clean',
          omitGateInvocation: true,
        });
      },
    });

    const capture = await runReviewGate({
      root,
      home,
      runProcess: runner.runProcess,
    });

    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'artifact_validation_failed',
      message: expect.stringContaining('invocation metadata'),
      corroboration: {
        run: 'missing',
        invocation: 'missing',
      },
    });
    expect(process.exitCode).toBe(1);
  });

  it.each([
    ['missing', null],
    ['manual', 'manual'],
    ['auto', 'auto'],
  ] as const)(
    'rejects %s gate artifact invocation markers before severity evaluation',
    async (_label, reviewInvocation) => {
      const { root, home } = await setup();
      const projectPath = await writeProject(root);
      await writeActiveProject(root, projectPath);
      const runner = createProcessRunner({
        onExecute: async () => {
          await writeReviewArtifact({
            root,
            projectPath,
            finding: 'clean',
            reviewInvocation,
          });
        },
      });

      const capture = await runReviewGate({
        root,
        home,
        runProcess: runner.runProcess,
      });

      expect(capture.jsonPayloads[0]).toMatchObject({
        status: 'artifact_validation_failed',
        message: expect.stringContaining('gate invocation marker'),
        corroboration: {
          run: 'matched',
          invocation: 'matched',
        },
      });
      expect(process.exitCode).toBe(1);
    },
  );

  it('rejects mismatched configured invocation metadata before severity evaluation', async () => {
    const { root, home } = await setup();
    const projectPath = await writeProject(root);
    await writeActiveProject(root, projectPath);
    const runner = createProcessRunner({
      onExecute: async () => {
        await writeReviewArtifact({
          root,
          projectPath,
          finding: 'clean',
          gateInvocationOverrides: {
            oat_invocation_model: 'self-reported-different-model',
          },
        });
      },
    });

    const capture = await runReviewGate({
      root,
      home,
      runProcess: runner.runProcess,
    });

    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'artifact_validation_failed',
      message: expect.stringContaining('does not match'),
      corroboration: {
        run: 'matched',
        invocation: 'mismatched',
        actual: {
          invocation: {
            model: 'self-reported-different-model',
          },
        },
      },
    });
    expect(process.exitCode).toBe(1);
  });

  it.each([
    {
      target: 'codex-default',
      command: 'codex',
      baseArgs: ['exec'],
    },
    {
      target: 'claude-default',
      command: 'claude',
      baseArgs: ['-p'],
    },
    {
      target: 'cursor-default',
      command: 'cursor-agent',
      baseArgs: ['-p'],
    },
  ])(
    'passes one assembled review prompt to $target',
    async ({ target, command, baseArgs }) => {
      const { root, home } = await setup();
      const projectPath = await writeProject(root);
      await writeActiveProject(root, projectPath);
      const runner = createProcessRunner({
        onExecute: async () => {
          await writeReviewArtifact({
            root,
            projectPath,
            finding: 'clean',
          });
        },
      });

      const capture = await runReviewGate({
        root,
        home,
        runProcess: runner.runProcess,
        args: [
          '--target',
          target,
          '--review-scope',
          'plan',
          '--review-type',
          'artifact',
          '--exit-nonzero-on',
          'important',
          'Use oat-project-review-provide artifact plan.',
        ],
      });

      expect(runner.calls).toHaveLength(1);
      expectSingleReviewPrompt(runner.calls[0], {
        command,
        baseArgs,
        promptSnippets: [
          'This review is gate-originated. If you run `oat-project-review-provide`, set `oat_review_invocation: gate` in the review artifact.',
          `Resolved OAT project path: ${projectPath}. Run the review for this project path.`,
          'Review type: artifact.',
          'Review scope: plan.',
          'Use oat-project-review-provide artifact plan.',
        ],
      });
      expect(capture.jsonPayloads[0]).toMatchObject({
        status: 'ok',
        project: projectPath,
        blocking: false,
      });
      expect(process.exitCode).toBe(0);
    },
  );

  it.each([
    {
      target: 'codex-configured',
      runtime: 'codex',
      baseCommand: ['codex', 'exec'],
      invocation: {
        model: 'gpt-5.6-sol',
        reasoningEffort: 'max',
      },
      expected: {
        model: 'gpt-5.6-sol',
        reasoningEffort: 'max',
        source: 'exec-target-config',
      },
    },
    {
      target: 'claude-configured',
      runtime: 'claude',
      baseCommand: ['claude', '-p'],
      invocation: {
        model: 'fable',
        reasoningEffort: 'provider-default',
      },
      expected: {
        model: 'fable',
        reasoningEffort: 'provider-default',
        source: 'exec-target-config',
      },
    },
    {
      target: 'cursor-sol',
      runtime: 'cursor',
      baseCommand: ['cursor-agent', '-p'],
      invocation: {
        model: 'gpt-5.6-sol-max',
        reasoningEffort: 'provider-default',
      },
      expected: {
        model: 'gpt-5.6-sol-max',
        reasoningEffort: 'provider-default',
        source: 'exec-target-config',
      },
    },
    {
      target: 'cursor-fable',
      runtime: 'cursor',
      baseCommand: ['cursor-agent', '-p'],
      invocation: {
        model: 'claude-fable-5-xhigh',
        reasoningEffort: 'provider-default',
      },
      expected: {
        model: 'claude-fable-5-xhigh',
        reasoningEffort: 'provider-default',
        source: 'exec-target-config',
      },
    },
    {
      target: 'unknown-configured',
      runtime: 'custom',
      baseCommand: ['custom-review'],
      invocation: undefined,
      expected: {
        model: 'unknown',
        reasoningEffort: 'unknown',
        source: 'unknown',
      },
    },
  ])(
    'emits immutable gate invocation metadata for $target without parsing its command',
    async ({ target, runtime, baseCommand, invocation, expected }) => {
      const { root, home } = await setup();
      const projectPath = await writeProject(root);
      await writeActiveProject(root, projectPath);
      await writeFile(
        join(root, '.oat', 'config.json'),
        `${JSON.stringify({
          version: 1,
          workflow: {
            gates: {
              execTargets: {
                [target]: {
                  runtime,
                  baseCommand,
                  ...(invocation ? { invocation } : {}),
                  priority: 200,
                },
              },
            },
          },
        })}\n`,
        'utf8',
      );
      const runner = createProcessRunner({
        onExecute: async () => {
          await writeReviewArtifact({ root, projectPath, finding: 'clean' });
        },
      });

      const capture = await runReviewGate({
        root,
        home,
        runProcess: runner.runProcess,
        args: ['--target', target, 'Review'],
      });

      const payload = capture.jsonPayloads[0] as {
        gateInvocation: {
          runId: string;
          targetId: string;
          runtime: string;
          model: string;
          reasoningEffort: string;
          source: string;
        };
      };
      expect(payload.gateInvocation).toMatchObject({
        runId: expect.any(String),
        targetId: target,
        runtime,
        ...expected,
      });
      const prompt = runner.calls.at(-1)?.args.at(-1) ?? '';
      expect(prompt).toContain(
        `oat_gate_run_id: ${payload.gateInvocation.runId}`,
      );
      expect(prompt).toContain(`oat_gate_target: ${target}`);
      expect(prompt).toContain(`oat_gate_runtime: ${runtime}`);
      expect(prompt).toContain(`oat_invocation_model: ${expected.model}`);
      expect(prompt).toContain(
        `oat_invocation_reasoning_effort: ${expected.reasoningEffort}`,
      );
      expect(prompt).toContain(`oat_invocation_source: ${expected.source}`);
    },
  );

  it('defaults to cross-provider target selection and returns zero for clean gate review artifacts', async () => {
    const { root, home } = await setup();
    const projectPath = await writeProject(root);
    await writeActiveProject(root, projectPath);
    const runner = createProcessRunner({
      onExecute: async () => {
        await writeReviewArtifact({
          root,
          projectPath,
          finding: 'clean',
        });
      },
    });

    const capture = await runReviewGate({
      root,
      home,
      processEnv: { CLAUDECODE: '1' },
      runProcess: runner.runProcess,
      args: ['--avoid', 'same-runtime', 'Review'],
    });

    expect(
      runner.calls.filter((call) => call.purpose === 'host-detection'),
    ).toHaveLength(1);
    expect(runner.calls.at(-1)).toMatchObject({
      command: 'codex',
      purpose: 'execute',
    });
    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'ok',
      project: projectPath,
      blocking: false,
      counts: { critical: 0, important: 0 },
      runId: expect.any(String),
      generatedAt: '2026-06-01T00:00:00Z',
    });
    // The completion envelope carries a non-empty run id and the produced
    // artifact's oat_generated_at so callers can correlate result to artifact.
    expect(capture.jsonPayloads[0]?.runId).toMatch(/[0-9a-f-]{8,}/i);
    expect(process.exitCode).toBe(0);
  });

  it('normalizes a gate review artifact missing only a zero-count Medium heading', async () => {
    const { root, home } = await setup();
    const projectPath = await writeProject(root);
    await writeActiveProject(root, projectPath);
    let artifactPath = '';
    const runner = createProcessRunner({
      onExecute: async () => {
        artifactPath = await writeReviewArtifact({
          root,
          projectPath,
          reviewScope: 'final',
          finding: 'clean',
          omitMediumSection: true,
          counts: {
            critical: 0,
            important: 0,
            medium: 0,
            minor: 0,
          },
        });
      },
    });

    const capture = await runReviewGate({
      root,
      home,
      runProcess: runner.runProcess,
      args: [
        '--target',
        'codex-default',
        '--review-scope',
        'final',
        '--review-type',
        'code',
        '--exit-nonzero-on',
        'important',
        'Use oat-project-review-provide code final.',
      ],
    });

    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'ok',
      outcome: 'review_completed_artifact_normalized_gate_passed',
      artifactPath,
      blocking: false,
      counts: {
        critical: 0,
        important: 0,
        medium: 0,
        minor: 0,
      },
      normalization: {
        insertedSeverities: ['medium'],
      },
    });
    const artifactContent = await readFile(join(root, artifactPath), 'utf8');
    expect(artifactContent).toMatch(
      /### Important[\s\S]*None[\s\S]*### Medium\s+None[\s\S]*### Minor/i,
    );
    await expect(readdir(join(root, projectPath, 'reviews'))).resolves.toEqual([
      'p01-review.md',
    ]);
    expect(process.exitCode).toBe(0);
  });

  it('reports artifact validation failure when a missing severity has nonzero findings', async () => {
    const { root, home } = await setup();
    const projectPath = await writeProject(root);
    await writeActiveProject(root, projectPath);
    let artifactPath = '';
    const runner = createProcessRunner({
      onExecute: async () => {
        artifactPath = await writeReviewArtifact({
          root,
          projectPath,
          reviewScope: 'final',
          finding: 'clean',
          omitMediumSection: true,
          counts: {
            critical: 0,
            important: 0,
            medium: 1,
            minor: 0,
          },
        });
      },
    });

    const capture = await runReviewGate({
      root,
      home,
      runProcess: runner.runProcess,
      args: ['--target', 'codex-default', 'Review'],
    });

    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'artifact_validation_failed',
      outcome: 'review_completed_artifact_validation_failed',
      artifactPath,
      message: expect.stringContaining('cannot be safely normalized'),
      recovery: expect.stringContaining('oat-project-review-receive'),
      gateInvocation: {
        runId: expect.any(String),
        targetId: 'codex-default',
        runtime: 'codex',
        model: 'provider-default',
        reasoningEffort: 'provider-default',
        source: 'exec-target-config',
      },
    });
    expect(process.exitCode).toBe(1);
  });

  it('keeps final-scope Minor-only gate success tied to review-receive disposition', async () => {
    const { root, home } = await setup();
    const projectPath = await writeProject(root);
    await writeActiveProject(root, projectPath);
    let artifactPath = '';
    const runner = createProcessRunner({
      onExecute: async () => {
        artifactPath = await writeReviewArtifact({
          root,
          projectPath,
          reviewScope: 'final',
          finding: 'minor',
        });
      },
    });

    const capture = await runReviewGate({
      root,
      home,
      runProcess: runner.runProcess,
      args: [
        '--target',
        'codex-default',
        '--review-scope',
        'final',
        '--review-type',
        'code',
        '--exit-nonzero-on',
        'important',
        'Review',
      ],
    });

    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'ok',
      outcome: 'review_completed_gate_passed',
      artifactPath,
      blocking: false,
      counts: {
        critical: 0,
        important: 0,
        medium: 0,
        minor: 1,
      },
      handoff: expect.stringContaining(
        'final review still contains non-blocking findings',
      ),
    });
    expect(capture.jsonPayloads[0]).toMatchObject({
      handoff: expect.stringContaining(
        'before marking the final review row passed',
      ),
    });
    expect(process.exitCode).toBe(0);
  });

  it('keeps final-scope Important findings in handoff text when only Critical blocks', async () => {
    const { root, home } = await setup();
    const projectPath = await writeProject(root);
    await writeActiveProject(root, projectPath);
    let artifactPath = '';
    const runner = createProcessRunner({
      onExecute: async () => {
        artifactPath = await writeReviewArtifact({
          root,
          projectPath,
          reviewScope: 'final',
          finding: 'important',
        });
      },
    });

    const capture = await runReviewGate({
      root,
      home,
      runProcess: runner.runProcess,
      args: [
        '--target',
        'codex-default',
        '--review-scope',
        'final',
        '--review-type',
        'code',
        '--exit-nonzero-on',
        'critical',
        'Review',
      ],
    });

    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'ok',
      outcome: 'review_completed_gate_passed',
      artifactPath,
      blocking: false,
      counts: {
        critical: 0,
        important: 1,
        medium: 0,
        minor: 0,
      },
      handoff: expect.stringContaining('important=1'),
    });
    expect(capture.jsonPayloads[0]).toMatchObject({
      handoff: expect.stringContaining(
        'before marking the final review row passed',
      ),
    });
    expect(process.exitCode).toBe(0);
  });

  it('detects a same-day lower-rank review produced when a higher-rank review already exists', async () => {
    const { root, home } = await setup();
    const projectPath = await writeProject(root);
    await writeActiveProject(root, projectPath);
    await writeReviewArtifact({
      root,
      projectPath,
      fileName: 'final-review.md',
      generatedAt: '2026-06-29',
      reviewScope: 'final',
      finding: 'clean',
    });
    let artifactPath = '';
    const runner = createProcessRunner({
      onExecute: async () => {
        artifactPath = await writeReviewArtifact({
          root,
          projectPath,
          fileName: 'p01-review.md',
          generatedAt: '2026-06-29',
          reviewScope: 'p01',
          finding: 'important',
        });
      },
    });

    const capture = await runReviewGate({
      root,
      home,
      runProcess: runner.runProcess,
      args: ['--target', 'codex-default', 'Review'],
    });

    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'blocked',
      project: projectPath,
      artifactPath,
      counts: { critical: 0, important: 1 },
    });
    expect(process.exitCode).toBe(1);
  });

  it('preserves nonzero child exit codes without masking them with artifact parsing', async () => {
    const { root, home } = await setup();
    const projectPath = await writeProject(root);
    await writeActiveProject(root, projectPath);
    const runner = createProcessRunner({ executeExitCode: 7 });

    await runReviewGate({
      root,
      home,
      runProcess: runner.runProcess,
    });

    expect(runner.calls.at(-1)).toMatchObject({
      purpose: 'execute',
      stdio: 'inherit',
    });
    expect(process.exitCode).toBe(7);
  });

  it('reports review target timeouts with structured failure metadata', async () => {
    const { root, home } = await setup();
    const projectPath = await writeProject(root);
    await writeActiveProject(root, projectPath);
    const runner = createProcessRunner({ executeTimedOut: true });

    const capture = await runReviewGate({
      root,
      home,
      processEnv: { OAT_GATE_EXEC_TIMEOUT_MS: '1234' },
      runProcess: runner.runProcess,
    });

    expect(runner.calls.at(-1)).toMatchObject({
      purpose: 'execute',
      stdio: 'inherit',
      timeoutMs: 1234,
    });
    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'review_failed',
      outcome: 'review_did_not_complete',
      exitCode: 124,
      timedOut: true,
      timeoutMs: 1234,
      message: expect.stringContaining('timed out after 1234ms'),
      gateInvocation: {
        runId: expect.any(String),
        targetId: expect.any(String),
        runtime: expect.any(String),
        model: expect.any(String),
        reasoningEffort: expect.any(String),
        source: expect.any(String),
      },
    });
    expect(process.exitCode).toBe(124);
  });

  it('accepts an explicit project name when no active project is configured', async () => {
    const { root, home } = await setup();
    const projectPath = await writeProject(root, '.oat/projects/shared/named');
    const runner = createProcessRunner({
      onExecute: async () => {
        await writeReviewArtifact({
          root,
          projectPath,
          finding: 'clean',
        });
      },
    });

    const capture = await runReviewGate({
      root,
      home,
      runProcess: runner.runProcess,
      args: ['--project', 'named', '--target', 'codex-default', 'Review'],
    });

    expect(runner.calls[0]?.args.at(-1)).toContain(
      `Resolved OAT project path: ${projectPath}. Run the review for this project path.`,
    );
    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'ok',
      project: projectPath,
    });
    expect(process.exitCode).toBe(0);
  });

  it('passes an explicit project path to the child even when a different active project is configured', async () => {
    const { root, home } = await setup();
    const activeProjectPath = await writeProject(
      root,
      '.oat/projects/shared/active',
    );
    const explicitProjectPath = await writeProject(
      root,
      '.oat/projects/shared/explicit',
    );
    await writeActiveProject(root, activeProjectPath);
    const runner = createProcessRunner({
      onExecute: async () => {
        await writeReviewArtifact({
          root,
          projectPath: explicitProjectPath,
          finding: 'clean',
        });
      },
    });

    const capture = await runReviewGate({
      root,
      home,
      runProcess: runner.runProcess,
      args: [
        '--project',
        explicitProjectPath,
        '--target',
        'codex-default',
        'Review',
      ],
    });

    expect(runner.calls[0]?.args.at(-1)).toContain(
      `Resolved OAT project path: ${explicitProjectPath}. Run the review for this project path.`,
    );
    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'ok',
      project: explicitProjectPath,
    });
    expect(process.exitCode).toBe(0);
  });

  it('rejects ad-hoc-only artifacts produced after gate dispatch', async () => {
    const { root, home } = await setup();
    const projectPath = await writeProject(root);
    await writeActiveProject(root, projectPath);
    const runner = createProcessRunner({
      onExecute: async () => {
        await writeAdhocReviewArtifact({
          root,
          finding: 'clean',
        });
      },
    });

    const capture = await runReviewGate({
      root,
      home,
      runProcess: runner.runProcess,
    });

    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'artifact_validation_failed',
      outcome: 'review_completed_artifact_validation_failed',
      message: expect.stringContaining('No new review artifact was detected'),
    });
    expect(process.exitCode).toBe(1);
  });

  it('rejects archived-only project artifacts produced after gate dispatch', async () => {
    const { root, home } = await setup();
    const projectPath = await writeProject(root);
    await writeActiveProject(root, projectPath);
    const runner = createProcessRunner({
      onExecute: async () => {
        await writeReviewArtifact({
          root,
          projectPath,
          fileName: 'archived/p01-review.md',
          finding: 'clean',
        });
      },
    });

    const capture = await runReviewGate({
      root,
      home,
      runProcess: runner.runProcess,
    });

    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'artifact_validation_failed',
      outcome: 'review_completed_artifact_validation_failed',
      message: expect.stringContaining('No new review artifact was detected'),
    });
    expect(process.exitCode).toBe(1);
  });

  it('fails clearly before dispatch when no project can be resolved', async () => {
    const { root, home } = await setup();
    const runner = createProcessRunner();

    const capture = await runReviewGate({
      root,
      home,
      runProcess: runner.runProcess,
    });

    expect(runner.calls).toHaveLength(0);
    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'error',
      message: expect.stringContaining('No OAT project could be resolved'),
    });
    expect(process.exitCode).toBe(1);
  });

  it('fails clearly before dispatch when multiple projects are plausible', async () => {
    const { root, home } = await setup();
    await writeProject(root, '.oat/projects/shared/alpha');
    await writeProject(root, '.oat/projects/shared/beta');
    const runner = createProcessRunner();

    const capture = await runReviewGate({
      root,
      home,
      runProcess: runner.runProcess,
    });

    expect(runner.calls).toHaveLength(0);
    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'error',
      message: expect.stringContaining(
        'Multiple OAT projects could be resolved',
      ),
    });
    expect(process.exitCode).toBe(1);
  });
});
