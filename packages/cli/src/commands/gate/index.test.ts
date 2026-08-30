import { execFileSync, spawn as spawnProcess } from 'node:child_process';
import {
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import type { CommandContext, GlobalOptions } from '@app/command-context';
import {
  createLoggerCapture,
  type LoggerCapture,
} from '@commands/__tests__/helpers';
import {
  appendProjectLog as appendProjectLogFromDisk,
  instantiateProjectLogTemplate,
  type AppendProjectLogInput,
  type ProjectLogAppendResult,
} from '@commands/project/log/append';
import { BUILTIN_EXEC_TARGETS, type ExecTarget } from '@config/oat-config';
import { resolveEffectiveConfig, resolveExecTargets } from '@config/resolve';
import { resolveAssetsRoot } from '@fs/assets';
import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  GateActivityEvidence,
  GateActivityProbe,
  GateActivityProbeStatus,
} from './activity-probes';
import { currentGateCliRoot, type GateRouteReceipt } from './branch-local-cli';
import { extractStructuredRefusal } from './child-process';
import { createGateCommand, selectExecTarget } from './index';
import { parseReviewGateVerdict as parseReviewGateVerdictFromDisk } from './review-verdict';

interface HarnessOptions {
  cwd: string;
  home: string;
  processEnv?: NodeJS.ProcessEnv;
  createGateActivityProbe?: () => Promise<GateActivityProbe | null>;
  runProcess?: ProcessRunner;
  parseReviewGateVerdict?: typeof parseReviewGateVerdictFromDisk;
  writeDiagnostic?: (message: string) => void;
  writeGateRunMarker?: (
    path: string,
    marker: Record<string, unknown>,
    warn: (message: string) => void,
  ) => Promise<boolean>;
  removeGateRunMarker?: (
    path: string,
    warn: (message: string) => void,
  ) => Promise<void>;
  readGateRouteReceipt?: (
    path: string,
    expectedCliRoot: string,
    expectedRuntime: string,
  ) => Promise<GateRouteReceipt>;
  appendProjectLog?: (
    input: AppendProjectLogInput,
  ) => Promise<ProjectLogAppendResult>;
}

interface ProcessCall {
  activityProbe?: GateActivityProbe;
  command: string;
  args: string[];
  env: NodeJS.ProcessEnv;
  stdin: 'ignore' | 'inherit';
  livenessIntervalMs?: number;
  purpose: 'host-detection' | 'availability' | 'execute';
  stdio: 'ignore' | 'inherit' | 'pipe';
  stdoutDestination?: 'stdout' | 'stderr';
  timeoutMs: number;
}

interface LivenessSnapshot {
  elapsedMs: number;
  hardBudgetMs: number;
  idleMs: number;
  processAlive: boolean;
  activityProbeStatus?: GateActivityProbeStatus;
  lastActivityEvidence?: GateActivityEvidence;
}

type ProcessRunner = (
  command: string,
  args: string[],
  options: {
    activityProbe?: GateActivityProbe;
    cwd: string;
    env: NodeJS.ProcessEnv;
    livenessIntervalMs?: number;
    onLiveness?: (snapshot: LivenessSnapshot) => void;
    purpose: ProcessCall['purpose'];
    stdin: ProcessCall['stdin'];
    stdio: ProcessCall['stdio'];
    stdoutDestination?: ProcessCall['stdoutDestination'];
    timeoutMs: number;
  },
) => Promise<{
  activityEvidence?: GateActivityEvidence;
  exitCode: number;
  timedOut?: boolean;
  stdoutBytes: number;
  stderrBytes: number;
  refusal?: string;
}>;

type ProcessCallInput = ProcessCall & {
  cwd: string;
};

let lastExecutePrompt = '';

const EXPECTED_RUNTIME_ARTIFACT_HYGIENE_CONTRACT =
  "Artifact hygiene contract: Before finishing or committing, format every file you created or edited. Use the concrete write/fix formatting command supplied by the governing plan, task, or brief. If none is usable, discover the repository's documented write/fix command from applicable `AGENTS.md`/`CLAUDE.md` instructions and relevant package manifests; do not infer or hardcode a formatter. Prefer a file-scoped invocation when supported, and avoid rewriting unrelated files. If no command is discoverable, warn once with `no format command discovered in repo instructions; skipping`, then continue.";

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
    ...(options.createGateActivityProbe
      ? { createGateActivityProbe: options.createGateActivityProbe }
      : {}),
    ...(options.writeDiagnostic
      ? { writeDiagnostic: options.writeDiagnostic }
      : {}),
    readGateRouteReceipt:
      options.readGateRouteReceipt ??
      (async (_path, expectedCliRoot, expectedRuntime) => ({
        route: 'inline',
        reason: 'test route receipt',
        cliRoot: expectedCliRoot,
        runtime: expectedRuntime,
      })),
    ...(options.runProcess ? { runProcess: options.runProcess } : {}),
    ...(options.parseReviewGateVerdict
      ? { parseReviewGateVerdict: options.parseReviewGateVerdict }
      : {}),
    ...(options.writeGateRunMarker
      ? { writeGateRunMarker: options.writeGateRunMarker }
      : {}),
    ...(options.removeGateRunMarker
      ? { removeGateRunMarker: options.removeGateRunMarker }
      : {}),
    appendProjectLog:
      options.appendProjectLog ??
      (async () => ({ status: 'skipped', reason: 'projectLog=false' })),
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
    executeStderrBytes?: number;
    executeStdoutBytes?: number;
    executeOutput?: string;
    executeTimedOut?: boolean;
    executeActivityEvidence?: GateActivityEvidence;
    livenessSnapshots?: LivenessSnapshot[];
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
      ...(runOptions.activityProbe
        ? { activityProbe: runOptions.activityProbe }
        : {}),
      env: { ...runOptions.env },
      stdin: runOptions.stdin,
      livenessIntervalMs: runOptions.livenessIntervalMs,
      purpose: runOptions.purpose,
      stdio: runOptions.stdio,
      ...(runOptions.stdoutDestination
        ? { stdoutDestination: runOptions.stdoutDestination }
        : {}),
      timeoutMs: runOptions.timeoutMs,
    });

    if (runOptions.purpose === 'host-detection') {
      const script = args[1] ?? '';
      if (script.includes('CLAUDECODE')) {
        return {
          exitCode: runOptions.env.CLAUDECODE ? 0 : 1,
          stderrBytes: 0,
          stdoutBytes: 0,
        };
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
          stderrBytes: 0,
          stdoutBytes: 0,
        };
      }
      if (script.includes('CURSOR_AGENT')) {
        return {
          exitCode: runOptions.env.CURSOR_AGENT ? 0 : 1,
          stderrBytes: 0,
          stdoutBytes: 0,
        };
      }
      return { exitCode: 1, stderrBytes: 0, stdoutBytes: 0 };
    }

    if (runOptions.purpose === 'availability') {
      const targetId = commandToTarget.get(processKey(command, args));
      return {
        exitCode: targetId && availableTargets.has(targetId) ? 0 : 1,
        stderrBytes: 0,
        stdoutBytes: 0,
      };
    }

    if (runOptions.purpose === 'execute') {
      lastExecutePrompt = args.at(-1) ?? '';
      for (const snapshot of options.livenessSnapshots ?? []) {
        runOptions.onLiveness?.(snapshot);
      }
      await options.onExecute?.({
        command,
        args: [...args],
        purpose: runOptions.purpose,
        stdin: runOptions.stdin,
        stdio: runOptions.stdio,
        ...(runOptions.stdoutDestination
          ? { stdoutDestination: runOptions.stdoutDestination }
          : {}),
        cwd: runOptions.cwd,
      });
    }

    const executeRefusal = options.executeOutput
      ? extractStructuredRefusal(options.executeOutput)
      : undefined;
    return {
      exitCode: options.executeTimedOut ? 124 : (options.executeExitCode ?? 0),
      stderrBytes: options.executeStderrBytes ?? 0,
      stdoutBytes: options.executeStdoutBytes ?? 0,
      ...(executeRefusal ? { refusal: executeRefusal } : {}),
      ...(options.executeTimedOut ? { timedOut: true } : {}),
      ...(options.executeActivityEvidence
        ? { activityEvidence: options.executeActivityEvidence }
        : {}),
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
  parseReviewGateVerdict?: typeof parseReviewGateVerdictFromDisk;
  writeDiagnostic?: (message: string) => void;
  writeGateRunMarker?: HarnessOptions['writeGateRunMarker'];
  removeGateRunMarker?: HarnessOptions['removeGateRunMarker'];
  readGateRouteReceipt?: HarnessOptions['readGateRouteReceipt'];
  createGateActivityProbe?: HarnessOptions['createGateActivityProbe'];
  appendProjectLog?: HarnessOptions['appendProjectLog'];
  args?: string[];
  globalArgs?: string[];
}): Promise<LoggerCapture> {
  process.exitCode = undefined;
  const { command, capture } = createHarness({
    cwd: options.root,
    home: options.home,
    processEnv: options.processEnv,
    runProcess: options.runProcess,
    parseReviewGateVerdict: options.parseReviewGateVerdict,
    writeDiagnostic: options.writeDiagnostic,
    writeGateRunMarker: options.writeGateRunMarker,
    removeGateRunMarker: options.removeGateRunMarker,
    readGateRouteReceipt: options.readGateRouteReceipt,
    createGateActivityProbe: options.createGateActivityProbe,
    appendProjectLog: options.appendProjectLog,
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

  async function writeExistingProjectLog(
    root: string,
    projectPath: string,
  ): Promise<string> {
    // Explicit empty env: this helper wants the packaged root, and the
    // default binding would otherwise follow an ambient OAT_ASSETS_DIR.
    const assetsRoot = await resolveAssetsRoot({});
    const template = await readFile(
      join(assetsRoot, 'templates', 'project-log.md'),
      'utf8',
    );
    const logPath = join(root, projectPath, 'project-log.md');
    await writeFile(
      logPath,
      instantiateProjectLogTemplate(template, 'demo', '2026-07-17'),
      'utf8',
    );
    return logPath;
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
    generatedAt?: string | null;
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
    artifactProject?: string | null;
    omitGateInvocation?: boolean;
    omitGateRunId?: boolean;
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
    const promptGateInvocationLines = lastExecutePrompt
      .match(
        /Gate invocation metadata \(copy these exact values into the gate review artifact frontmatter\):\n([\s\S]*?)\n\n(?=Review(?: type:| scope:|\s|$))/,
      )?.[1]
      ?.split('\n');
    const gateInvocationLines = options.omitGateInvocation
      ? []
      : !options.gateInvocationOverrides &&
          !options.omitGateRunId &&
          promptGateInvocationLines
        ? promptGateInvocationLines
        : gateInvocationKeys
            .filter(
              (key) => !(options.omitGateRunId && key === 'oat_gate_run_id'),
            )
            .map((key) => {
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
        ...(options.generatedAt === null
          ? []
          : [
              `oat_generated_at: ${options.generatedAt ?? '2026-06-01T00:00:00Z'}`,
            ]),
        'oat_review_type: code',
        `oat_review_scope: ${options.reviewScope ?? 'p01'}`,
        ...(options.reviewInvocation === null
          ? []
          : [`oat_review_invocation: ${options.reviewInvocation ?? 'gate'}`]),
        ...(options.artifactProject === null
          ? []
          : [`oat_project: ${options.artifactProject ?? options.projectPath}`]),
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
      stdio: 'pipe',
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
      '--timeout-ms',
      '120000',
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
      timeoutMs: 120_000,
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

  it('rejects out-of-bounds and fractional target timeout values', async () => {
    const { root, home } = await setup();
    for (const value of ['999', '14400001', '1000.5']) {
      const capture = await runGateCommand(root, home, [
        'target',
        'set',
        'invalid-timeout',
        '--runtime',
        'custom',
        '--base-command-json',
        '["custom"]',
        '--timeout-ms',
        value,
      ]);
      expect(capture.jsonPayloads[0]).toMatchObject({
        status: 'error',
        message: expect.stringContaining(
          '--timeout-ms must be an integer between 1000 and 14400000',
        ),
      });
      expect(process.exitCode).toBe(1);
    }
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
        stdin: options.stdin,
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
        stdoutBytes: 0,
        stderrBytes: 0,
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

  it('closes stdin while capturing target stdout and stderr', async () => {
    const { root, home } = await setup();
    const runner = createProcessRunner({
      livenessSnapshots: [
        {
          elapsedMs: 30_000,
          hardBudgetMs: 900_000,
          idleMs: 2_000,
          processAlive: true,
        },
      ],
    });

    await runCrossProviderExec({
      root,
      home,
      processEnv: { CLAUDECODE: '1' },
      runProcess: runner.runProcess,
      args: ['--avoid', 'same-family', 'Review', 'the', 'change'],
    });

    expect(runner.calls.at(-1)).toMatchObject({
      command: 'codex',
      args: ['exec', 'Review', 'the', 'change'],
      purpose: 'execute',
      stdin: 'ignore',
      stdio: 'pipe',
      timeoutMs: 900_000,
      livenessIntervalMs: 30_000,
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

  it.each([
    {
      producer: 'gpt-5.6-sol-xhigh',
      sameFamilyModel: 'gpt-5.6-sol-max',
    },
    {
      producer: 'claude-fable-5-xhigh',
      sameFamilyModel: 'claude-fable-5-thinking-high',
    },
  ])(
    'selects Grok as a different-family target for producer $producer',
    async ({ producer, sameFamilyModel }) => {
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
                'cursor-default': null,
                'same-family-unavailable': {
                  runtime: 'cursor',
                  baseCommand: ['cursor-agent', '-p'],
                  models: [sameFamilyModel],
                  availabilityCommand: ['same-family-unavailable'],
                  priority: 300,
                },
                'grok-tertiary': {
                  runtime: 'cursor',
                  baseCommand: ['cursor-agent', '-p'],
                  models: ['cursor-grok-4.5-high'],
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
        args: ['--producer-identity', `${producer}:declared`, 'Run', 'review'],
        globalArgs: [],
      });

      expect(runner.calls.at(-1)).toMatchObject({
        command: 'cursor-agent',
        args: ['-p', '--model', 'cursor-grok-4.5-high', 'Run', 'review'],
        purpose: 'execute',
      });
      expect(capture.info.join('\n')).toContain(
        'Gate diversity: achieved=different-family',
      );
      expect(capture.info.join('\n')).toContain(
        'reviewer=grok-tertiary reviewer_family=xai',
      );
      expect(process.exitCode).toBe(0);
    },
  );

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

    const capture = await runReviewGate({
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
    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'ok',
      diversity: {
        producer: {
          value: 'gpt-5.5-xhigh',
          family: 'openai',
          source: 'stamp',
          avoidFamilies: ['openai'],
        },
      },
    });
    expect(capture.jsonPayloads[0]).not.toHaveProperty(
      'diversity.producer.contributingScopes',
    );
    expect(capture.jsonPayloads[0]).not.toHaveProperty(
      'diversity.producer.contributingStampCount',
    );
    expect(process.exitCode).toBe(0);
  });

  it('uses declared producer identity from the review-only environment bridge', async () => {
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
              'cursor-default': null,
              'cursor-reviewer': {
                runtime: 'cursor',
                baseCommand: ['cursor-agent', '-p'],
                models: ['gpt-5.6-sol-high', 'composer-2.5'],
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
          reviewScope: 'p04',
          finding: 'clean',
        });
      },
    });

    const capture = await runReviewGate({
      root,
      home,
      processEnv: {
        OAT_GATE_PRODUCER_IDENTITY: 'gpt-5.6-sol-xhigh:declared',
      },
      runProcess: runner.runProcess,
      args: ['--review-scope', 'p04', 'Review'],
    });

    expect(runner.calls.at(-1)).toMatchObject({
      command: 'cursor-agent',
      args: ['-p', '--model', 'composer-2.5', expect.any(String)],
      purpose: 'execute',
    });
    expect(runner.calls.at(-1)?.env).not.toHaveProperty(
      'OAT_GATE_PRODUCER_IDENTITY',
    );
    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'ok',
      diversity: {
        achieved: 'different-family',
        producer: {
          value: 'gpt-5.6-sol-xhigh',
          provenance: 'declared',
          family: 'openai',
          source: 'environment',
          avoidFamilies: ['openai'],
        },
      },
      dispatchReport: {
        runtimeIdentity: {
          producer: null,
          confidence: 'not-reported',
        },
      },
    });
    expect(process.exitCode).toBe(0);
  });

  it.each([
    { name: 'absent', value: undefined },
    { name: 'malformed', value: 'gpt-5.6-sol-xhigh' },
    { name: 'non-declared provenance', value: 'gpt-5.6-sol-xhigh:observed' },
  ])(
    'preserves unknown producer behavior for an $name environment bridge',
    async ({ value }) => {
      const { root, home } = await setup();
      const projectPath = await writeProject(root);
      await writeActiveProject(root, projectPath);
      const runner = createProcessRunner({
        onExecute: async () => {
          await writeReviewArtifact({
            root,
            projectPath,
            reviewScope: 'p04',
            finding: 'clean',
          });
        },
      });

      const capture = await runReviewGate({
        root,
        home,
        processEnv:
          value === undefined ? {} : { OAT_GATE_PRODUCER_IDENTITY: value },
        runProcess: runner.runProcess,
        args: ['--review-scope', 'p04', '--target', 'codex-default', 'Review'],
      });

      expect(capture.jsonPayloads[0]).toMatchObject({
        status: 'ok',
        diversity: {
          achieved: 'unknown-producer',
          producer: {
            value: 'unknown',
            provenance: 'unknown',
            family: 'unknown',
            source: 'unknown',
            avoidFamilies: [],
          },
        },
      });
      expect(process.exitCode).toBe(0);
    },
  );

  it('keeps explicit and stamped producer evidence stronger than the environment bridge', async () => {
    const { root, home } = await setup();
    const projectPath = await writeProject(root);
    await writeActiveProject(root, projectPath);
    await writeImplementation(
      root,
      projectPath,
      'Dispatch: scope=p04 action=implementation role=implementer producer=gpt-5.6-sol-xhigh provenance=declared model_axis=selected:gpt-5.6-sol-xhigh effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=gpt-5.6-sol-xhigh target=cursor',
    );
    const runner = createProcessRunner({
      onExecute: async () => {
        await writeReviewArtifact({
          root,
          projectPath,
          reviewScope: 'p04',
          finding: 'clean',
        });
      },
    });

    const stamped = await runReviewGate({
      root,
      home,
      processEnv: {
        OAT_GATE_PRODUCER_IDENTITY: 'composer-2.5:declared',
      },
      runProcess: runner.runProcess,
      args: ['--review-scope', 'p04', '--target', 'codex-default', 'Review'],
    });
    expect(stamped.jsonPayloads[0]).toHaveProperty(
      'diversity.producer.source',
      'stamp',
    );
    expect(stamped.jsonPayloads[0]).toHaveProperty(
      'diversity.producer.value',
      'gpt-5.6-sol-xhigh',
    );

    const explicit = await runReviewGate({
      root,
      home,
      processEnv: {
        OAT_GATE_PRODUCER_IDENTITY: 'composer-2.5:declared',
      },
      runProcess: runner.runProcess,
      args: [
        '--review-scope',
        'p04',
        '--producer-identity',
        'claude-fable-5-thinking-high:declared',
        '--target',
        'codex-default',
        'Review',
      ],
    });
    expect(explicit.jsonPayloads[0]).toHaveProperty(
      'diversity.producer.source',
      'flag',
    );
    expect(explicit.jsonPayloads[0]).toHaveProperty(
      'diversity.producer.value',
      'claude-fable-5-thinking-high',
    );
    expect(process.exitCode).toBe(0);
  });

  it('does not consume the review-only producer environment in generic execution', async () => {
    const { root, home } = await setup();
    const runner = createProcessRunner();

    const capture = await runCrossProviderExec({
      root,
      home,
      processEnv: {
        OAT_GATE_PRODUCER_IDENTITY: 'gpt-5.6-sol-xhigh:declared',
      },
      runProcess: runner.runProcess,
      args: ['--target', 'codex-default', 'Run'],
      globalArgs: [],
    });

    expect(capture.info.join('\n')).toContain(
      'achieved=unknown-producer producer=unknown',
    );
    expect(process.exitCode).toBe(0);
  });

  it.each([
    {
      name: 'legacy',
      stamp:
        'Dispatch: p04 implementation used model_axis=inherited, effort_axis=selected:high, dispatch_policy=balanced, dispatch_ceiling=high, target=oat-phase-implementer-high',
    },
    {
      name: 'modern unknown-provenance',
      stamp:
        'Dispatch: scope=p04 action=implementation role=implementer producer=gpt-5.5 provenance=unknown model_axis=selected:gpt-5.5 effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-phase-implementer-gpt-5-5-high',
    },
  ])(
    'preserves unknown producer compatibility for an exact $name stamp',
    async ({ stamp }) => {
      const { root, home } = await setup();
      const projectPath = await writeProject(root);
      await writeActiveProject(root, projectPath);
      await writeImplementation(root, projectPath, stamp);
      const runner = createProcessRunner({
        onExecute: async () => {
          await writeReviewArtifact({
            root,
            projectPath,
            reviewScope: 'p04',
            finding: 'clean',
          });
        },
      });

      const capture = await runReviewGate({
        root,
        home,
        runProcess: runner.runProcess,
        args: ['--review-scope', 'p04', '--target', 'codex-default', 'Review'],
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
            source: 'unknown',
            avoidFamilies: [],
          },
        },
      });
      expect(capture.jsonPayloads[0]).not.toHaveProperty(
        'diversity.producer.contributingScopes',
      );
      expect(capture.jsonPayloads[0]).not.toHaveProperty(
        'diversity.producer.contributingStampCount',
      );
      expect(process.exitCode).toBe(0);
    },
  );

  it.each([
    { name: 'exact', reviewScope: 'p02', aggregate: false },
    { name: 'final', reviewScope: 'final', aggregate: true },
    { name: 'range', reviewScope: 'p02-p03', aggregate: true },
  ])(
    'rejects incompatible modern stamps before $name producer resolution',
    async ({ reviewScope, aggregate }) => {
      const { root, home } = await setup();
      const projectPath = await writeProject(root);
      await writeActiveProject(root, projectPath);
      await writeImplementation(
        root,
        projectPath,
        [
          'Dispatch: scope=p02 action=implementation role=implementer producer=gpt-5.5-xhigh provenance=declared model_axis=inherited effort_axis=selected:xhigh dispatch_policy=high dispatch_ceiling=xhigh target=oat-phase-implementer-xhigh',
          'Dispatch: scope=p02 action=review role=implementer producer=claude-opus-4-8 provenance=declared model_axis=selected:opus effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=opus target=claude',
          'Dispatch: scope=p02 action=implementation role=reviewer producer=gemini-2.5-pro provenance=declared model_axis=selected:gemini effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=gemini target=gemini',
        ].join('\n'),
      );
      const runner = createProcessRunner({
        onExecute: async () => {
          await writeReviewArtifact({
            root,
            projectPath,
            reviewScope,
            finding: 'clean',
          });
        },
      });

      const capture = await runReviewGate({
        root,
        home,
        runProcess: runner.runProcess,
        args: [
          '--review-scope',
          reviewScope,
          '--target',
          'codex-default',
          'Review',
        ],
      });

      expect(capture.jsonPayloads[0]).toMatchObject({
        status: 'ok',
        diversity: {
          producer: aggregate
            ? {
                value: 'unknown',
                source: 'aggregated-stamps',
                avoidFamilies: ['openai'],
                contributingScopes: ['p02'],
                contributingStampCount: 1,
              }
            : {
                value: 'gpt-5.5-xhigh',
                family: 'openai',
                source: 'stamp',
                avoidFamilies: ['openai'],
              },
        },
      });
      expect(process.exitCode).toBe(0);
    },
  );

  it('aggregates producer families from implementation stamps for final review scope', async () => {
    const { root, home } = await setup();
    const projectPath = await writeProject(root);
    await writeActiveProject(root, projectPath);
    await writeImplementation(
      root,
      projectPath,
      [
        'Dispatch: scope=p00 action=implementation role=implementer producer=gemini-2.5-pro provenance=declared model_axis=selected:gemini effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=gemini target=gemini',
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
          value: 'unknown',
          family: 'unknown',
          source: 'aggregated-stamps',
          avoidFamilies: ['openai', 'claude'],
          contributingScopes: ['p00', 'p02', 'p03'],
          contributingStampCount: 3,
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

  it('falls back to a configured target family when an aggregate producer is unknown', async () => {
    const { root, home } = await setup();
    const projectPath = await writeProject(root);
    await writeActiveProject(root, projectPath);
    await writeImplementation(
      root,
      projectPath,
      'Dispatch: scope=p02 action=implementation role=implementer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=gpt-5.6-sol-high target=gpt-5.6-sol-high',
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
                models: ['gpt-5.6-sol-max'],
                priority: 300,
              },
              'claude-reviewer': {
                runtime: 'cursor',
                baseCommand: ['cursor-agent', '-p'],
                models: ['claude-fable-5-xhigh'],
                priority: 250,
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
      args: ['-p', '--model', 'claude-fable-5-xhigh', expect.any(String)],
      purpose: 'execute',
    });
    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'ok',
      diversity: {
        achieved: 'different-family',
        producer: {
          value: 'unknown',
          family: 'unknown',
          source: 'aggregated-stamps',
          avoidFamilies: ['openai'],
          contributingScopes: ['p02'],
          contributingStampCount: 1,
        },
        reviewer: {
          target: 'claude-reviewer',
          model: 'claude-fable-5-xhigh',
          family: 'claude',
        },
      },
    });
    expect(process.exitCode).toBe(0);
  });

  it('keeps a known aggregate producer authoritative over a conflicting configured target', async () => {
    const { root, home } = await setup();
    const projectPath = await writeProject(root);
    await writeActiveProject(root, projectPath);
    await writeImplementation(
      root,
      projectPath,
      'Dispatch: scope=p02 action=implementation role=implementer producer=claude-opus-4-8 provenance=declared model_axis=selected:gpt-5.6-sol-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=gpt-5.6-sol-high target=gpt-5.6-sol-high',
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
      args: ['--review-scope', 'final', '--target', 'codex-default', 'Review'],
    });

    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'ok',
      diversity: {
        producer: {
          value: 'unknown',
          family: 'unknown',
          source: 'aggregated-stamps',
          avoidFamilies: ['claude'],
          contributingScopes: ['p02'],
          contributingStampCount: 1,
        },
      },
    });
    expect(process.exitCode).toBe(0);
  });

  it('uses the configured target when a concrete aggregate producer is not claimable', async () => {
    const { root, home } = await setup();
    const projectPath = await writeProject(root);
    await writeActiveProject(root, projectPath);
    await writeImplementation(
      root,
      projectPath,
      'Dispatch: scope=p02 action=implementation role=implementer producer=gpt-5.6-sol-high provenance=unknown model_axis=selected:claude-fable-5-xhigh effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=claude-fable-5-xhigh target=claude-fable-5-xhigh',
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
      args: ['--review-scope', 'final', '--target', 'codex-default', 'Review'],
    });

    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'ok',
      diversity: {
        producer: {
          value: 'unknown',
          family: 'unknown',
          source: 'aggregated-stamps',
          avoidFamilies: ['claude'],
          contributingScopes: ['p02'],
          contributingStampCount: 1,
        },
      },
    });
    expect(process.exitCode).toBe(0);
  });

  it('aggregates every producer stamp in a contiguous review range in document order', async () => {
    const { root, home } = await setup();
    const projectPath = await writeProject(root);
    await writeActiveProject(root, projectPath);
    await writeImplementation(
      root,
      projectPath,
      [
        'Dispatch: scope=p01 action=implementation role=implementer producer=gemini-2.5-pro provenance=declared model_axis=selected:gemini effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=gemini target=gemini',
        'Dispatch: scope=p03 action=fix role=fix producer=claude-opus-4-8 provenance=declared model_axis=selected:opus effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=opus target=claude',
        'Dispatch: scope=p02 action=implementation role=implementer producer=gpt-5.5-xhigh provenance=declared model_axis=inherited effort_axis=selected:xhigh dispatch_policy=high dispatch_ceiling=xhigh target=oat-phase-implementer-xhigh',
        'Dispatch: scope=p03 action=implementation role=implementer producer=claude-sonnet-4-5 provenance=observed model_axis=selected:sonnet effort_axis=not-applicable dispatch_policy=balanced dispatch_ceiling=sonnet target=claude',
        'Dispatch: scope=p04 action=implementation role=implementer producer=composer-2.5 provenance=declared model_axis=selected:composer effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=composer target=cursor',
      ].join('\n'),
    );
    const runner = createProcessRunner({
      onExecute: async () => {
        await writeReviewArtifact({
          root,
          projectPath,
          reviewScope: 'p02-p03',
          finding: 'clean',
        });
      },
    });

    const capture = await runReviewGate({
      root,
      home,
      runProcess: runner.runProcess,
      args: [
        '--review-scope',
        'p02-p03',
        '--target',
        'codex-default',
        'Review',
      ],
    });

    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'ok',
      diversity: {
        producer: {
          value: 'unknown',
          provenance: 'unknown',
          confidence: 'unknown',
          family: 'unknown',
          source: 'aggregated-stamps',
          avoidFamilies: ['claude', 'openai'],
          contributingScopes: ['p03', 'p02'],
          contributingStampCount: 3,
        },
      },
    });
    expect(process.exitCode).toBe(0);
  });

  it('keeps an explicit producer flag authoritative over aggregate review stamps', async () => {
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
      args: [
        '--review-scope',
        'final',
        '--producer-identity',
        'composer-2.5:declared',
        '--target',
        'codex-default',
        'Review',
      ],
    });

    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'ok',
      diversity: {
        producer: {
          value: 'composer-2.5',
          family: 'composer',
          source: 'flag',
          avoidFamilies: ['composer'],
        },
      },
    });
    expect(capture.jsonPayloads[0]).not.toHaveProperty(
      'diversity.producer.contributingScopes',
    );
    expect(capture.jsonPayloads[0]).not.toHaveProperty(
      'diversity.producer.contributingStampCount',
    );
    expect(process.exitCode).toBe(0);
  });

  it('reports one unknown aggregate stamp without claiming a producer family', async () => {
    const { root, home } = await setup();
    const projectPath = await writeProject(root);
    await writeActiveProject(root, projectPath);
    await writeImplementation(
      root,
      projectPath,
      'Dispatch: scope=p02 action=implementation role=implementer producer=unknown provenance=unknown model_axis=host-auto effort_axis=host-auto dispatch_policy=unknown dispatch_ceiling=none target=unknown',
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
      args: ['--review-scope', 'final', '--target', 'codex-default', 'Review'],
    });

    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'ok',
      diversity: {
        achieved: 'unknown-producer',
        producer: {
          value: 'unknown',
          family: 'unknown',
          source: 'aggregated-stamps',
          avoidFamilies: [],
          contributingScopes: ['p02'],
          contributingStampCount: 1,
        },
      },
    });
    expect(process.exitCode).toBe(0);
  });

  it('reports unknown producer identity when an aggregate scope has no relevant stamps', async () => {
    const { root, home } = await setup();
    const projectPath = await writeProject(root);
    await writeActiveProject(root, projectPath);
    await writeImplementation(
      root,
      projectPath,
      'Dispatch: scope=p04 action=implementation role=implementer producer=gpt-5.5-xhigh provenance=declared model_axis=inherited effort_axis=selected:xhigh dispatch_policy=high dispatch_ceiling=xhigh target=oat-phase-implementer-xhigh',
    );
    const runner = createProcessRunner({
      onExecute: async () => {
        await writeReviewArtifact({
          root,
          projectPath,
          reviewScope: 'p02-p03',
          finding: 'clean',
        });
      },
    });

    const capture = await runReviewGate({
      root,
      home,
      runProcess: runner.runProcess,
      args: [
        '--review-scope',
        'p02-p03',
        '--target',
        'codex-default',
        'Review',
      ],
    });

    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'ok',
      diversity: {
        producer: {
          value: 'unknown',
          source: 'unknown',
          avoidFamilies: [],
        },
      },
    });
    expect(capture.jsonPayloads[0]).not.toHaveProperty(
      'diversity.producer.contributingScopes',
    );
    expect(capture.jsonPayloads[0]).not.toHaveProperty(
      'diversity.producer.contributingStampCount',
    );
    expect(process.exitCode).toBe(0);
  });

  it('counts non-claimable aggregate contributors while avoiding only known families', async () => {
    const { root, home } = await setup();
    const projectPath = await writeProject(root);
    await writeActiveProject(root, projectPath);
    await writeImplementation(
      root,
      projectPath,
      [
        'Dispatch: scope=p02 action=implementation role=implementer producer=unknown provenance=unknown model_axis=host-auto effort_axis=host-auto dispatch_policy=unknown dispatch_ceiling=none target=unknown',
        'Dispatch: scope=p03 action=implementation role=implementer producer=gpt-5.5-xhigh provenance=declared model_axis=inherited effort_axis=selected:xhigh dispatch_policy=high dispatch_ceiling=xhigh target=oat-phase-implementer-xhigh',
        'Dispatch: scope=p03-t02 action=fix role=fix producer=mystery-model provenance=unknown model_axis=host-auto effort_axis=host-auto dispatch_policy=unknown dispatch_ceiling=none target=unknown',
      ].join('\n'),
    );
    const runner = createProcessRunner({
      onExecute: async () => {
        await writeReviewArtifact({
          root,
          projectPath,
          reviewScope: 'p02-p03',
          finding: 'clean',
        });
      },
    });

    const capture = await runReviewGate({
      root,
      home,
      runProcess: runner.runProcess,
      args: [
        '--review-scope',
        'p02-p03',
        '--target',
        'codex-default',
        'Review',
      ],
    });

    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'ok',
      diversity: {
        producer: {
          source: 'aggregated-stamps',
          avoidFamilies: ['openai'],
          contributingScopes: ['p02', 'p03', 'p03-t02'],
          contributingStampCount: 3,
        },
      },
    });
    expect(process.exitCode).toBe(0);
  });

  it('preserves same-family fallback semantics for a one-stamp aggregate', async () => {
    const { root, home } = await setup();
    const projectPath = await writeProject(root);
    await writeActiveProject(root, projectPath);
    await writeImplementation(
      root,
      projectPath,
      'Dispatch: scope=p02 action=implementation role=implementer producer=gpt-5.5-xhigh provenance=declared model_axis=inherited effort_axis=selected:xhigh dispatch_policy=high dispatch_ceiling=xhigh target=oat-phase-implementer-xhigh',
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
              'cursor-default': {
                runtime: 'cursor',
                baseCommand: ['cursor-agent', '-p'],
                models: ['gpt-5.3-codex'],
                invocation: {
                  model: 'gpt-5.3-codex',
                  reasoningEffort: 'provider-default',
                },
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

    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'ok',
      diversity: {
        achieved: 'same-family - no diverse target available',
        producer: {
          value: 'unknown',
          family: 'unknown',
          source: 'aggregated-stamps',
          avoidFamilies: ['openai'],
          contributingScopes: ['p02'],
          contributingStampCount: 1,
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
      dispatchReport: {
        schemaVersion: 1,
        route: {
          scope: 'p04',
          action: 'review',
          role: 'reviewer',
          target: 'cursor-reviewer',
        },
        gateInvocation: {
          targetId: 'cursor-reviewer',
          runtime: 'cursor',
          model: 'composer-2.5',
        },
        runtimeIdentity: {
          producer: null,
          model: null,
          effort: null,
          provenance: 'unknown',
          confidence: 'not-reported',
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
      dispatchReport: {
        gateInvocation: {
          targetId: 'codex-default',
        },
        runtimeIdentity: {
          producer: null,
          provenance: 'unknown',
          confidence: 'not-reported',
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
        stdio: 'pipe',
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
      stdio: 'pipe',
      timeoutMs: 15 * 60 * 1_000,
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
      stdio: 'pipe',
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
        EXPECTED_RUNTIME_ARTIFACT_HYGIENE_CONTRACT,
        `Resolved OAT project path: ${projectPath}. Run the review for this project path.`,
        'Project resolution source: active-project.',
        'Review type: artifact.',
        'Review scope: plan.',
        'Use oat-project-review-provide artifact plan.',
      ],
    });
    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'blocked',
      receiveEligible: true,
      project: projectPath,
      projectResolutionSource: 'active-project',
      artifactPath,
      threshold: 'important',
      counts: { critical: 0, important: 1 },
      handoff: expect.stringContaining('oat-project-review-receive'),
      corroboration: {
        run: 'matched',
        project: 'ambient',
        invocation: 'matched',
      },
    });
    expect(process.exitCode).toBe(1);
  });

  it('treats gate artifacts missing all configured invocation metadata as uncorrelated runs', async () => {
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
      status: 'targeting_correlation_failed',
      projectResolutionSource: 'active-project',
      receiveEligible: false,
      corroboration: {
        run: 'missing',
        project: 'ambient',
        invocation: 'missing',
      },
    });
    expect(process.exitCode).toBe(1);
  });

  it('keeps missing invocation fields remediable when the gate run id correlates', async () => {
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
            oat_gate_target: '',
            oat_gate_runtime: '',
            oat_invocation_model: '',
            oat_invocation_reasoning_effort: '',
            oat_invocation_source: '',
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
      outcome: 'review_completed_artifact_validation_failed',
      recovery: expect.stringContaining(
        'Copy the exact gate invocation fields',
      ),
      corroboration: {
        run: 'matched',
        project: 'ambient',
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
        projectResolutionSource: 'active-project',
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
      projectResolutionSource: 'active-project',
      message: expect.stringContaining('does not match'),
      corroboration: {
        run: 'matched',
        project: 'ambient',
        invocation: 'mismatched',
        actual: {
          invocation: {
            model: 'self-reported-different-model',
          },
        },
      },
      dispatchReport: {
        gateInvocation: {
          model: 'provider-default',
        },
        runtimeIdentity: {
          producer: null,
          model: null,
          effort: null,
          provenance: 'unknown',
          confidence: 'not-reported',
        },
      },
    });
    expect(
      (
        capture.jsonPayloads[0] as {
          dispatchReport: { gateInvocation: { model: string } };
        }
      ).dispatchReport.gateInvocation.model,
    ).not.toBe('self-reported-different-model');
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
          EXPECTED_RUNTIME_ARTIFACT_HYGIENE_CONTRACT,
          `Resolved OAT project path: ${projectPath}. Run the review for this project path.`,
          'Review type: artifact.',
          'Review scope: plan.',
          'Use oat-project-review-provide artifact plan.',
        ],
      });
      expect(capture.jsonPayloads[0]).toMatchObject({
        status: 'ok',
        project: projectPath,
        projectResolutionSource: 'active-project',
        corroboration: {
          project: 'ambient',
        },
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
        dispatchReport: {
          gateInvocation: {
            runId: string;
            targetId: string;
            runtime: string;
            model: string;
            reasoningEffort: string;
            source: string;
          };
          selection: {
            cellSource: string | null;
          };
          runtimeIdentity: {
            producer: string | null;
            confidence: string;
          };
        };
      };
      expect(payload.gateInvocation).toMatchObject({
        runId: expect.any(String),
        targetId: target,
        runtime,
        ...expected,
      });
      expect(payload.dispatchReport.gateInvocation).toEqual(
        payload.gateInvocation,
      );
      expect(payload.dispatchReport.selection.cellSource).toBeNull();
      expect(payload.dispatchReport.gateInvocation.source).toBe(
        expected.source,
      );
      expect(payload.dispatchReport.runtimeIdentity).toMatchObject({
        producer: null,
        confidence: 'not-reported',
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

  it('stamps the exact non-first structured model selected for gate execution', async () => {
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
              'cursor-reviewer': {
                runtime: 'cursor',
                baseCommand: ['cursor-agent', '-p'],
                models: ['gpt-5.5', 'composer-2.5'],
                invocation: { reasoningEffort: 'provider-default' },
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
      args: ['--producer-identity', 'gpt-5.5-xhigh:declared', 'Review'],
    });

    const executeCall = runner.calls.find((call) => call.purpose === 'execute');
    expect(executeCall).toMatchObject({
      command: 'cursor-agent',
      args: ['-p', '--model', 'composer-2.5', expect.any(String)],
    });
    expect(executeCall?.args.at(-1)).toContain(
      'oat_invocation_model: composer-2.5',
    );
    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'ok',
      gateInvocation: {
        model: 'composer-2.5',
        reasoningEffort: 'provider-default',
        source: 'exec-target-config',
      },
      corroboration: { invocation: 'matched' },
      diversity: {
        reviewer: { target: 'cursor-reviewer', model: 'composer-2.5' },
      },
    });
    expect(process.exitCode).toBe(0);
  });

  it('rejects static invocation metadata that contradicts the selected structured model', async () => {
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
              'cursor-reviewer': {
                runtime: 'cursor',
                baseCommand: ['cursor-agent', '-p'],
                models: ['composer-2.5'],
                invocation: {
                  model: 'gpt-5.5',
                  reasoningEffort: 'provider-default',
                },
                priority: 200,
              },
            },
          },
        },
      })}\n`,
      'utf8',
    );
    const runner = createProcessRunner();

    const capture = await runReviewGate({
      root,
      home,
      runProcess: runner.runProcess,
      args: ['--target', 'cursor-reviewer', 'Review'],
    });

    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'error',
      message: expect.stringMatching(
        /invocation model gpt-5\.5.*selected model composer-2\.5/i,
      ),
    });
    expect(runner.calls.filter((call) => call.purpose === 'execute')).toEqual(
      [],
    );
    expect(process.exitCode).toBe(1);
  });

  it('stamps the exact model already pinned in the target command', async () => {
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
                baseCommand: ['cursor-agent', '-p', '--model', 'composer-2.5'],
                invocation: { reasoningEffort: 'provider-default' },
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
      args: ['--target', 'cursor-pinned', 'Review'],
    });

    const executeCall = runner.calls.find((call) => call.purpose === 'execute');
    expect(executeCall).toMatchObject({
      command: 'cursor-agent',
      args: ['-p', '--model', 'composer-2.5', expect.any(String)],
    });
    expect(
      executeCall?.args.filter((argument) => argument === '--model'),
    ).toHaveLength(1);
    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'ok',
      gateInvocation: {
        model: 'composer-2.5',
        reasoningEffort: 'provider-default',
        source: 'exec-target-config',
      },
      corroboration: { invocation: 'matched' },
    });
    expect(process.exitCode).toBe(0);
  });

  it('rejects invocation metadata that contradicts a model pinned in the command', async () => {
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
                baseCommand: ['cursor-agent', '-p', '--model', 'composer-2.5'],
                invocation: {
                  model: 'gpt-5.5',
                  reasoningEffort: 'provider-default',
                },
                priority: 200,
              },
            },
          },
        },
      })}\n`,
      'utf8',
    );
    const runner = createProcessRunner();

    const capture = await runReviewGate({
      root,
      home,
      runProcess: runner.runProcess,
      args: ['--target', 'cursor-pinned', 'Review'],
    });

    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'error',
      message: expect.stringMatching(
        /invocation model gpt-5\.5.*selected model composer-2\.5/i,
      ),
    });
    expect(runner.calls.filter((call) => call.purpose === 'execute')).toEqual(
      [],
    );
    expect(process.exitCode).toBe(1);
  });

  it.each([
    {
      label: 'numeric-like',
      target: '123',
      runtime: '456',
      model: '789',
      effort: '1011',
    },
    {
      label: 'boolean-like',
      target: 'true',
      runtime: 'false',
      model: 'TRUE',
      effort: 'False',
    },
    {
      label: 'null-like',
      target: 'null',
      runtime: 'Null',
      model: 'NULL',
      effort: '~',
    },
    {
      label: 'colon-containing',
      target: 'target: reviewer',
      runtime: 'runtime: custom',
      model: 'model: canary',
      effort: 'effort: max',
    },
    {
      label: 'hash-containing',
      target: 'target # canary',
      runtime: 'runtime # custom',
      model: 'model # canary',
      effort: 'effort # max',
    },
    {
      label: 'quote-like',
      target: '"target"',
      runtime: "'runtime'",
      model: '"model"',
      effort: "'effort'",
    },
    {
      label: 'newline-like',
      target: 'target\nreviewer',
      runtime: 'runtime\ncustom',
      model: 'model\ncanary',
      effort: 'effort\nmax',
    },
  ])(
    'round-trips $label configured invocation strings through gate YAML',
    async ({ target, runtime, model, effort }) => {
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
                  baseCommand: ['custom-review'],
                  invocation: {
                    model,
                    reasoningEffort: effort,
                  },
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

      expect(capture.jsonPayloads[0]).toMatchObject({
        status: 'ok',
        gateInvocation: {
          targetId: target,
          runtime,
          model,
          reasoningEffort: effort,
          source: 'exec-target-config',
        },
        corroboration: {
          run: 'matched',
          invocation: 'matched',
        },
      });
      expect(process.exitCode).toBe(0);
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
      receiveEligible: true,
      project: projectPath,
      projectResolutionSource: 'active-project',
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

  it('classifies a clean review target without an artifact as artifact missing', async () => {
    const { root, home } = await setup();
    const projectPath = await writeProject(root);
    await writeActiveProject(root, projectPath);
    const runner = createProcessRunner();

    const capture = await runReviewGate({
      root,
      home,
      runProcess: runner.runProcess,
    });

    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'artifact_missing',
      outcome: 'review_completed_artifact_missing',
      artifactPath: null,
      receiveEligible: false,
      remediable: false,
      handoff: null,
      message: expect.stringContaining(
        'completed without producing the required correlated review artifact',
      ),
      recovery: expect.stringMatching(
        /write and finalize the review artifact before the process exits.*new gate run/i,
      ),
    });
    expect(process.exitCode).toBe(1);
  });

  it.each([
    {
      outcome: 'success',
      childExitCode: 0,
      finding: 'clean' as const,
      expectedStatus: 'ok',
      expectedExitCode: 0,
      expectedArtifact: true,
      expectedCounts: true,
    },
    {
      outcome: 'blocking verdict',
      childExitCode: 0,
      finding: 'important' as const,
      expectedStatus: 'blocked',
      expectedExitCode: 1,
      expectedArtifact: true,
      expectedCounts: true,
    },
    {
      outcome: 'child failure',
      childExitCode: 3,
      expectedStatus: 'review_failed',
      expectedExitCode: 3,
      expectedArtifact: false,
      expectedCounts: false,
    },
    {
      outcome: 'timeout',
      childExitCode: 124,
      timedOut: true,
      expectedStatus: 'review_failed',
      expectedExitCode: 124,
      expectedArtifact: false,
      expectedCounts: false,
    },
    {
      outcome: 'artifact-missing failure',
      childExitCode: 0,
      expectedStatus: 'artifact_missing',
      expectedExitCode: 1,
      expectedArtifact: false,
      expectedCounts: false,
    },
    {
      outcome: 'artifact-validation failure',
      childExitCode: 0,
      finding: 'clean' as const,
      parseFailure: true,
      expectedStatus: 'artifact_validation_failed',
      expectedExitCode: 1,
      expectedArtifact: true,
      expectedCounts: false,
    },
  ])(
    'appends exactly one project log structural entry after $outcome',
    async ({
      childExitCode,
      expectedArtifact,
      expectedCounts,
      expectedExitCode,
      expectedStatus,
      finding,
      parseFailure,
      timedOut,
    }) => {
      const { root, home } = await setup();
      const projectPath = await writeProject(root);
      await writeActiveProject(root, projectPath);
      const appendProjectLog = vi.fn(
        async (
          _input: AppendProjectLogInput,
        ): Promise<ProjectLogAppendResult> => ({
          status: 'appended',
          logPath: join(root, projectPath, 'project-log.md'),
          heading: '### 2026-07-17 · structural · oat gate review · p02',
          created: false,
        }),
      );
      const runner = createProcessRunner({
        executeExitCode: childExitCode,
        executeTimedOut: timedOut,
        onExecute: finding
          ? async () => {
              await writeReviewArtifact({ root, projectPath, finding });
            }
          : undefined,
      });

      await runReviewGate({
        root,
        home,
        runProcess: runner.runProcess,
        appendProjectLog,
        parseReviewGateVerdict: parseFailure
          ? async () => {
              throw new Error('invalid artifact');
            }
          : undefined,
        args: ['--target', 'codex-default', '--review-scope', 'p02', 'Review'],
      });

      expect(appendProjectLog).toHaveBeenCalledTimes(1);
      const input = appendProjectLog.mock.calls[0]?.[0];
      expect(input).toMatchObject({
        repoRoot: root,
        home,
        project: projectPath,
        structural: true,
        producer: 'oat gate review',
        ref: 'p02',
      });
      expect(input?.body).toContain('target=codex-default');
      expect(input?.body).toContain('threshold=important');
      expect(input?.body).toContain(`exit=${expectedExitCode}`);
      expect(input?.body).toContain(`status=${expectedStatus}`);
      if (expectedCounts) {
        expect(input?.body).toContain('findings=critical:');
      } else {
        expect(input?.body).not.toContain('findings=');
      }
      if (expectedArtifact) {
        expect(input?.body).toContain('artifact=');
      } else {
        expect(input?.body).not.toContain('artifact=');
      }
    },
  );

  it('honors config false when no project log exists', async () => {
    const { root, home } = await setup();
    const projectPath = await writeProject(root);
    await writeActiveProject(root, projectPath);
    await writeFile(
      join(root, '.oat', 'config.json'),
      `${JSON.stringify({ workflow: { projectLog: false } })}\n`,
      'utf8',
    );
    const runner = createProcessRunner({
      onExecute: async () => {
        await writeReviewArtifact({ root, projectPath, finding: 'clean' });
      },
    });

    await runReviewGate({
      root,
      home,
      runProcess: runner.runProcess,
      appendProjectLog: appendProjectLogFromDisk,
    });

    await expect(
      readFile(join(root, projectPath, 'project-log.md'), 'utf8'),
    ).rejects.toMatchObject({ code: 'ENOENT' });
    expect(process.exitCode).toBe(0);
  });

  it('appends once to an existing project log even when config is false', async () => {
    const { root, home } = await setup();
    const projectPath = await writeProject(root);
    await writeActiveProject(root, projectPath);
    await writeFile(
      join(root, '.oat', 'config.json'),
      `${JSON.stringify({ workflow: { projectLog: false } })}\n`,
      'utf8',
    );
    const logPath = await writeExistingProjectLog(root, projectPath);
    const runner = createProcessRunner({
      onExecute: async () => {
        await writeReviewArtifact({ root, projectPath, finding: 'clean' });
      },
    });

    await runReviewGate({
      root,
      home,
      runProcess: runner.runProcess,
      appendProjectLog: appendProjectLogFromDisk,
      args: ['--target', 'codex-default', '--review-scope', 'p02', 'Review'],
    });

    const content = await readFile(logPath, 'utf8');
    expect(
      content.match(
        /^### \d{4}-\d{2}-\d{2} · structural · oat gate review · p02$/gm,
      ),
    ).toHaveLength(1);
    expect(process.exitCode).toBe(0);
  });

  it('creates the project log on the first gate append under auto config', async () => {
    const { root, home } = await setup();
    const projectPath = await writeProject(root);
    await writeActiveProject(root, projectPath);
    const runner = createProcessRunner({
      onExecute: async () => {
        await writeReviewArtifact({ root, projectPath, finding: 'clean' });
      },
    });

    await runReviewGate({
      root,
      home,
      runProcess: runner.runProcess,
      appendProjectLog: appendProjectLogFromDisk,
      args: ['--target', 'codex-default', '--review-scope', 'p02', 'Review'],
    });

    const content = await readFile(
      join(root, projectPath, 'project-log.md'),
      'utf8',
    );
    expect(content).toContain('# Project Log: demo');
    expect(
      content.match(
        /^### \d{4}-\d{2}-\d{2} · structural · oat gate review · p02$/gm,
      ),
    ).toHaveLength(1);
    expect(process.exitCode).toBe(0);
  });

  it('warns on project log append failure without changing the blocking gate result', async () => {
    const { root, home } = await setup();
    const projectPath = await writeProject(root);
    await writeActiveProject(root, projectPath);
    const runner = createProcessRunner({
      onExecute: async () => {
        await writeReviewArtifact({
          root,
          projectPath,
          finding: 'important',
        });
      },
    });

    const diagnostics: string[] = [];
    const capture = await runReviewGate({
      root,
      home,
      runProcess: runner.runProcess,
      writeDiagnostic: (message) => diagnostics.push(message),
      appendProjectLog: async () => {
        throw new Error('project log is unwritable');
      },
    });

    // JSON mode suppresses logger.warn, so the failure must reach automation
    // through the diagnostic channel instead.
    expect(capture.warn).toEqual([]);
    expect(diagnostics.map((line) => JSON.parse(line))).toContainEqual(
      expect.objectContaining({
        type: 'gate-project-log-append-failed',
        reason: expect.stringContaining('project log is unwritable'),
      }),
    );
    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'blocked',
      outcome: 'review_completed_blocking_findings',
      receiveEligible: true,
      handoff: expect.stringContaining('oat-project-review-receive'),
    });
    expect(process.exitCode).toBe(1);
  });

  function initGitRepo(root: string): (args: string[]) => string {
    const git = (args: string[]): string =>
      execFileSync('git', args, {
        cwd: root,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      }).trim();

    git(['init', '--initial-branch=main']);
    git(['config', 'user.email', 'gate@example.test']);
    git(['config', 'user.name', 'Gate Test']);
    git(['config', 'commit.gpgsign', 'false']);
    git(['add', '-A']);
    git(['commit', '-m', 'baseline']);
    return git;
  }

  it('commits its own project log append so the worktree stays clean', async () => {
    const { root, home } = await setup();
    const projectPath = await writeProject(root);
    await writeActiveProject(root, projectPath);
    const git = initGitRepo(root);
    const baseline = git(['rev-parse', 'HEAD']);

    const runner = createProcessRunner({
      onExecute: async () => {
        await writeReviewArtifact({ root, projectPath, finding: 'clean' });
      },
    });

    const capture = await runReviewGate({
      root,
      home,
      runProcess: runner.runProcess,
      appendProjectLog: appendProjectLogFromDisk,
      args: ['--target', 'codex-default', '--review-scope', 'p02', 'Review'],
    });

    expect(capture.warn).toEqual([]);
    expect(git(['rev-parse', 'HEAD'])).not.toBe(baseline);
    expect(
      git(['status', '--porcelain', '--', `${projectPath}/project-log.md`]),
    ).toBe('');
    expect(git(['show', '--name-only', '--format=', 'HEAD'])).toBe(
      `${projectPath}/project-log.md`,
    );
    expect(process.exitCode).toBe(0);
  });

  it('scopes the project log commit and leaves unrelated dirty files alone', async () => {
    const { root, home } = await setup();
    const projectPath = await writeProject(root);
    await writeActiveProject(root, projectPath);
    const git = initGitRepo(root);
    await writeFile(join(root, 'unrelated.md'), 'edited\n', 'utf8');

    const runner = createProcessRunner({
      onExecute: async () => {
        await writeReviewArtifact({ root, projectPath, finding: 'clean' });
      },
    });

    await runReviewGate({
      root,
      home,
      runProcess: runner.runProcess,
      appendProjectLog: appendProjectLogFromDisk,
      args: ['--target', 'codex-default', '--review-scope', 'p02', 'Review'],
    });

    expect(git(['show', '--name-only', '--format=', 'HEAD'])).toBe(
      `${projectPath}/project-log.md`,
    );
    expect(git(['status', '--porcelain', '--', 'unrelated.md'])).toContain(
      'unrelated.md',
    );
  });

  it('creates no commit when project logging is disabled', async () => {
    const { root, home } = await setup();
    const projectPath = await writeProject(root);
    await writeActiveProject(root, projectPath);
    await writeFile(
      join(root, '.oat', 'config.json'),
      `${JSON.stringify({ workflow: { projectLog: false } })}\n`,
      'utf8',
    );
    const git = initGitRepo(root);
    const baseline = git(['rev-parse', 'HEAD']);

    const runner = createProcessRunner({
      onExecute: async () => {
        await writeReviewArtifact({ root, projectPath, finding: 'clean' });
      },
    });

    await runReviewGate({
      root,
      home,
      runProcess: runner.runProcess,
      appendProjectLog: appendProjectLogFromDisk,
      args: ['--target', 'codex-default', '--review-scope', 'p02', 'Review'],
    });

    expect(git(['rev-parse', 'HEAD'])).toBe(baseline);
  });

  it('reports a staging failure without changing the gate result', async () => {
    const { root, home } = await setup();
    const projectPath = await writeProject(root);
    await writeActiveProject(root, projectPath);
    initGitRepo(root);
    // A held index lock fails staging while the append itself succeeds, which
    // isolates the commit failure path from the append failure path.
    await writeFile(join(root, '.git', 'index.lock'), '', 'utf8');

    const runner = createProcessRunner({
      onExecute: async () => {
        await writeReviewArtifact({
          root,
          projectPath,
          finding: 'important',
        });
      },
    });

    const diagnostics: string[] = [];
    const capture = await runReviewGate({
      root,
      home,
      runProcess: runner.runProcess,
      writeDiagnostic: (message) => diagnostics.push(message),
      appendProjectLog: appendProjectLogFromDisk,
      args: ['--target', 'codex-default', '--review-scope', 'p02', 'Review'],
    });

    expect(diagnostics.map((line) => JSON.parse(line))).toContainEqual(
      expect.objectContaining({ type: 'gate-project-log-commit-failed' }),
    );
    expect(capture.jsonPayloads[0]).toMatchObject({ status: 'blocked' });
    expect(process.exitCode).toBe(1);
  });

  it('unstages the log when the commit itself fails after staging', async () => {
    const { root, home } = await setup();
    const projectPath = await writeProject(root);
    await writeActiveProject(root, projectPath);
    const git = initGitRepo(root);
    // A failing pre-commit hook lets `git add` succeed and `git commit` fail,
    // which is the path the index.lock case cannot reach.
    await writeFile(
      join(root, '.git', 'hooks', 'pre-commit'),
      '#!/bin/sh\nexit 1\n',
      { encoding: 'utf8', mode: 0o755 },
    );

    const runner = createProcessRunner({
      onExecute: async () => {
        await writeReviewArtifact({ root, projectPath, finding: 'clean' });
      },
    });

    const diagnostics: string[] = [];
    await runReviewGate({
      root,
      home,
      runProcess: runner.runProcess,
      writeDiagnostic: (message) => diagnostics.push(message),
      appendProjectLog: appendProjectLogFromDisk,
      args: ['--target', 'codex-default', '--review-scope', 'p02', 'Review'],
    });

    expect(diagnostics.map((line) => JSON.parse(line))).toContainEqual(
      expect.objectContaining({ type: 'gate-project-log-commit-failed' }),
    );
    // Dirty is an acceptable outcome here; staged is not.
    expect(git(['diff', '--cached', '--name-only'])).toBe('');
    expect(
      git(['status', '--porcelain', '--', `${projectPath}/project-log.md`]),
    ).not.toBe('');
  });

  it('injects headless context and keeps JSON stdout envelope-only', async () => {
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
      processEnv: { CLAUDECODE: '1', EXISTING_VALUE: 'preserved' },
      runProcess: runner.runProcess,
      args: ['--target', 'codex-default', 'Review'],
    });

    const execute = runner.calls.find((call) => call.purpose === 'execute');
    const invocationPrompt = execute?.args.at(-1) ?? '';
    const promptRuntime = invocationPrompt.match(
      /^oat_gate_runtime: (.+)$/m,
    )?.[1];
    const promptModel = invocationPrompt.match(
      /^oat_invocation_model: (.+)$/m,
    )?.[1];
    expect(execute?.env).toMatchObject({
      CLAUDECODE: '1',
      EXISTING_VALUE: 'preserved',
      OAT_GATE_HEADLESS: '1',
      OAT_NON_INTERACTIVE: '1',
      OAT_GATE_RUN_ID: capture.jsonPayloads[0]?.runId,
      OAT_GATE_RUNTIME: promptRuntime,
      OAT_INVOCATION_MODEL: promptModel,
      OAT_GATE_CLI_PATH: expect.stringContaining('/oat-gate-runs/'),
      OAT_GATE_CLI_ROOT: currentGateCliRoot(),
    });
    expect(promptRuntime).toBe('codex');
    expect(promptModel).toBe('provider-default');
    expect(execute?.stdoutDestination).toBe('stderr');
    expect(execute?.args.at(-1)).toContain('oat_gate_headless: true');
    expect(
      runner.calls
        .filter((call) => call.purpose !== 'execute')
        .every(
          (call) =>
            call.env.OAT_GATE_HEADLESS === undefined &&
            call.env.OAT_NON_INTERACTIVE === undefined &&
            call.env.OAT_GATE_RUN_ID === undefined,
        ),
    ).toBe(true);
    expect(process.exitCode).toBe(0);
  });

  it.each([
    { outcome: 'completed', exitCode: 0, writeArtifact: true },
    { outcome: 'timeout', exitCode: 1, timedOut: true },
    { outcome: 'child failure', exitCode: 3 },
    { outcome: 'targeting failure', exitCode: 0 },
    {
      outcome: 'validation failure',
      exitCode: 0,
      writeArtifact: true,
      parseFailure: true,
    },
    { outcome: 'launch error', exitCode: 1, launchFailure: true },
  ])(
    'cleans the system-temp run marker exactly once after $outcome',
    async ({
      exitCode,
      launchFailure,
      outcome,
      parseFailure,
      timedOut,
      writeArtifact: shouldWriteArtifact,
    }) => {
      const { root, home } = await setup();
      const projectPath = await writeProject(root);
      await writeActiveProject(root, projectPath);
      let markerWritten = false;
      const markerWrites: Array<{
        path: string;
        marker: Record<string, unknown>;
      }> = [];
      const markerRemovals: string[] = [];
      const runner = createProcessRunner({
        executeExitCode: exitCode,
        executeTimedOut: timedOut,
        onExecute: async () => {
          expect(markerWritten).toBe(true);
          if (shouldWriteArtifact) {
            await writeReviewArtifact({ root, projectPath, finding: 'clean' });
          }
        },
      });
      const runProcess: ProcessRunner = launchFailure
        ? async (_command, _args, options) => {
            if (options.purpose === 'execute') {
              expect(markerWritten).toBe(true);
              throw new Error('launch failed');
            }
            return runner.runProcess(_command, _args, options);
          }
        : runner.runProcess;

      await runReviewGate({
        root,
        home,
        runProcess,
        parseReviewGateVerdict: parseFailure
          ? async () => {
              throw new Error('invalid artifact');
            }
          : undefined,
        writeGateRunMarker: async (path, marker) => {
          markerWritten = true;
          markerWrites.push({ path, marker });
          return true;
        },
        removeGateRunMarker: async (path) => {
          markerRemovals.push(path);
        },
        args: [
          '--target',
          'codex-default',
          '--review-type',
          'code',
          '--review-scope',
          'p02',
          'Review',
        ],
      });

      expect(markerWrites).toHaveLength(1);
      expect(markerWrites[0]?.path).toMatch(
        new RegExp(
          `^${tmpdir().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/oat-gate-runs/[^/]+\\.json$`,
        ),
      );
      expect(markerWrites[0]?.path.startsWith(root)).toBe(false);
      expect(markerWrites[0]?.marker).toMatchObject({
        runId: expect.any(String),
        targetId: 'codex-default',
        runtime: 'codex',
        reviewType: 'code',
        reviewScope: 'p02',
        project: projectPath,
        startedAt: expect.any(String),
        budgetMs: 1_800_000,
        budgetSource: 'scope-default',
      });
      expect(markerRemovals).toEqual([markerWrites[0]?.path]);
      expect(outcome).toBeTruthy();
    },
  );

  it('warns and continues when run marker writes fail', async () => {
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
      writeGateRunMarker: async (_path, _marker, warn) => {
        warn('Unable to write gate run marker: denied');
        return false;
      },
      args: ['--target', 'codex-default', 'Review'],
    });

    expect(capture.warn).toEqual([
      expect.stringContaining('Unable to write gate run marker'),
    ]);
    expect(capture.jsonPayloads[0]).toMatchObject({ status: 'ok' });
    expect(process.exitCode).toBe(0);
  });

  it('cleans a partially created run marker after the writer reports failure', async () => {
    const { root, home } = await setup();
    const projectPath = await writeProject(root);
    await writeActiveProject(root, projectPath);
    let markerPath = '';
    const cleanupAttempts: string[] = [];
    const runner = createProcessRunner({
      onExecute: async () => {
        await writeReviewArtifact({ root, projectPath, finding: 'clean' });
      },
    });

    const capture = await runReviewGate({
      root,
      home,
      runProcess: runner.runProcess,
      writeGateRunMarker: async (path, _marker, warn) => {
        markerPath = path;
        await mkdir(dirname(path), { recursive: true });
        await writeFile(path, '{"partial":', 'utf8');
        warn('Unable to finish gate run marker write');
        return false;
      },
      removeGateRunMarker: async (path) => {
        cleanupAttempts.push(path);
        await rm(path);
      },
      args: ['--target', 'codex-default', 'Review'],
    });

    expect(capture.warn).toEqual([
      expect.stringContaining('Unable to finish gate run marker write'),
    ]);
    expect(cleanupAttempts).toEqual([markerPath]);
    await expect(readFile(markerPath, 'utf8')).rejects.toMatchObject({
      code: 'ENOENT',
    });
    expect(capture.jsonPayloads[0]).toMatchObject({ status: 'ok' });
  });

  it.each([0, 7])(
    'classifies a structured refusal independently of child exit code %s',
    async (exitCode) => {
      const { root, home } = await setup();
      const projectPath = await writeProject(root);
      await writeActiveProject(root, projectPath);
      const runner = createProcessRunner({
        executeExitCode: exitCode,
        executeOutput: 'diagnostic\nOAT_GATE_REFUSAL: cannot await reviewer\n',
      });

      const capture = await runReviewGate({
        root,
        home,
        runProcess: runner.runProcess,
        args: ['--target', 'codex-default', 'Review'],
      });

      expect(capture.jsonPayloads[0]).toMatchObject({
        status: 'review_failed',
        outcome: 'review_did_not_complete',
        refusal: 'cannot await reviewer',
      });
      expect(capture.jsonPayloads[0]).not.toHaveProperty('receiveEligible');
      expect(process.exitCode).toBe(1);
    },
  );

  it('uses the first strict line-start refusal and ignores mid-line tokens', async () => {
    const { root, home } = await setup();
    const projectPath = await writeProject(root);
    await writeActiveProject(root, projectPath);
    const runner = createProcessRunner({
      executeOutput: [
        'prefix OAT_GATE_REFUSAL: incidental',
        'OAT_GATE_REFUSAL: first refusal',
        'OAT_GATE_REFUSAL: second refusal',
      ].join('\n'),
    });

    const capture = await runReviewGate({
      root,
      home,
      runProcess: runner.runProcess,
      args: ['--target', 'codex-default', 'Review'],
    });

    expect(capture.jsonPayloads[0]).toMatchObject({
      refusal: 'first refusal',
    });
  });

  it('lets a validated correlated artifact win over refusal output', async () => {
    const { root, home } = await setup();
    const projectPath = await writeProject(root);
    await writeActiveProject(root, projectPath);
    const runner = createProcessRunner({
      executeExitCode: 9,
      executeOutput: 'OAT_GATE_REFUSAL: stale child message\n',
      onExecute: async () => {
        await writeReviewArtifact({ root, projectPath, finding: 'clean' });
      },
    });

    const capture = await runReviewGate({
      root,
      home,
      runProcess: runner.runProcess,
      args: ['--target', 'codex-default', 'Review'],
    });

    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'ok',
      receiveEligible: true,
    });
    expect(capture.jsonPayloads[0]).not.toHaveProperty('refusal');
    expect(process.exitCode).toBe(0);
  });

  it('classifies refusal when duplicate correlated artifacts are present', async () => {
    const { root, home } = await setup();
    const projectPath = await writeProject(root);
    await writeActiveProject(root, projectPath);
    const runner = createProcessRunner({
      executeOutput: 'OAT_GATE_REFUSAL: duplicate review output\n',
      onExecute: async () => {
        await writeReviewArtifact({
          root,
          projectPath,
          fileName: 'first-review.md',
          finding: 'clean',
        });
        await writeReviewArtifact({
          root,
          projectPath,
          fileName: 'second-review.md',
          finding: 'clean',
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
      status: 'review_failed',
      refusal: 'duplicate review output',
    });
  });

  it.each(['malformed', 'invocation-mismatched'] as const)(
    'classifies refusal when the correlated artifact is %s',
    async (artifactFailure) => {
      const { root, home } = await setup();
      const projectPath = await writeProject(root);
      await writeActiveProject(root, projectPath);
      const runner = createProcessRunner({
        executeOutput: `OAT_GATE_REFUSAL: ${artifactFailure} review output\n`,
        onExecute: async () => {
          await writeReviewArtifact({
            root,
            projectPath,
            finding: 'clean',
            ...(artifactFailure === 'invocation-mismatched'
              ? {
                  gateInvocationOverrides: {
                    oat_gate_runtime: 'different-runtime',
                  },
                }
              : {}),
          });
        },
      });

      const capture = await runReviewGate({
        root,
        home,
        runProcess: runner.runProcess,
        parseReviewGateVerdict:
          artifactFailure === 'malformed'
            ? async () => {
                throw new Error('malformed verdict');
              }
            : undefined,
        args: ['--target', 'codex-default', 'Review'],
      });

      expect(capture.jsonPayloads[0]).toMatchObject({
        status: 'review_failed',
        refusal: `${artifactFailure} review output`,
      });
      expect(capture.jsonPayloads[0]).not.toHaveProperty('receiveEligible');
    },
  );

  it('keeps a killed gate run marker outside the repository status', async () => {
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
              sleeper: {
                runtime: 'test',
                baseCommand: [
                  process.execPath,
                  '-e',
                  'setTimeout(() => {}, 60000)',
                ],
                invocation: {
                  model: 'test-model',
                  reasoningEffort: 'test',
                },
              },
            },
          },
        },
      })}\n`,
      'utf8',
    );
    execFileSync('git', ['init', '-q'], { cwd: root });
    execFileSync('git', ['config', 'user.email', 'gate@example.test'], {
      cwd: root,
    });
    execFileSync('git', ['config', 'user.name', 'Gate Test'], { cwd: root });
    execFileSync('git', ['add', '.'], { cwd: root });
    execFileSync('git', ['commit', '-q', '-m', 'fixture'], { cwd: root });

    const repoRoot = join(process.cwd(), '..', '..');
    const child = spawnProcess(
      join(repoRoot, 'node_modules', '.bin', 'tsx'),
      [
        '--tsconfig',
        join(repoRoot, 'packages', 'cli', 'tsconfig.json'),
        join(repoRoot, 'packages', 'cli', 'src', 'index.ts'),
        '--cwd',
        root,
        '--json',
        'gate',
        'review',
        '--target',
        'sleeper',
        '--project',
        projectPath,
        'Review',
      ],
      {
        cwd: repoRoot,
        detached: true,
        env: { ...process.env, HOME: home },
        stdio: ['ignore', 'ignore', 'pipe'],
      },
    );
    let stderr = '';
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (chunk: string) => {
      stderr += chunk;
    });
    let childClosed = false;
    const closePromise = new Promise<void>((resolve) => {
      child.once('close', () => {
        childClosed = true;
        resolve();
      });
    });

    let markerPath: string | undefined;
    for (let attempt = 0; attempt < 400 && !markerPath; attempt += 1) {
      if (childClosed) break;
      const markerLine = stderr
        .split('\n')
        .find((line) => line.includes('"type":"gate-run-marker"'));
      if (markerLine) {
        markerPath = (JSON.parse(markerLine) as { path: string }).path;
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    if (child.pid && !childClosed) {
      process.kill(-child.pid, 'SIGKILL');
    }
    await closePromise;
    expect(markerPath, stderr).toBeTruthy();

    await expect(readFile(markerPath!, 'utf8')).resolves.toContain(
      '"targetId": "sleeper"',
    );
    expect(
      execFileSync('git', ['status', '--porcelain'], {
        cwd: root,
        encoding: 'utf8',
      }),
    ).toBe('');
    await rm(markerPath!, { force: true });
  });

  it('normalizes a gate review artifact missing only a zero-count Medium heading', async () => {
    const { root, home } = await setup();
    const projectPath = await writeProject(root);
    await writeActiveProject(root, projectPath);
    let artifactPath = '';
    let originalContent = '';
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
        originalContent = await readFile(join(root, artifactPath), 'utf8');
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
        persisted: false,
      },
    });
    const artifactContent = await readFile(join(root, artifactPath), 'utf8');
    expect(artifactContent).toBe(originalContent);
    expect(artifactContent).not.toMatch(/### Medium/i);
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
      projectResolutionSource: 'active-project',
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

    const capture = await runReviewGate({
      root,
      home,
      runProcess: runner.runProcess,
    });

    expect(runner.calls.at(-1)).toMatchObject({
      purpose: 'execute',
      stdio: 'pipe',
    });
    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'review_failed',
      projectResolutionSource: 'active-project',
    });
    expect(process.exitCode).toBe(7);
  });

  it('retains selected gate provenance when target launch rejects', async () => {
    const { root, home } = await setup();
    const projectPath = await writeProject(root);
    await writeActiveProject(root, projectPath);
    const runner = createProcessRunner({
      onExecute: async () => {
        throw new Error('spawn codex ENOENT');
      },
    });

    const capture = await runReviewGate({
      root,
      home,
      runProcess: runner.runProcess,
    });

    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'review_failed',
      outcome: 'unexpected_post_selection_failure',
      runId: expect.any(String),
      target: 'codex-default',
      project: projectPath,
      projectResolutionSource: 'active-project',
      gateInvocation: {
        runId: expect.any(String),
        targetId: 'codex-default',
        runtime: 'codex',
        model: 'provider-default',
        reasoningEffort: 'provider-default',
        source: 'exec-target-config',
      },
      message: expect.stringContaining('spawn codex ENOENT'),
    });
    expect(capture.jsonPayloads[0]?.runId).toBe(
      capture.jsonPayloads[0]?.gateInvocation.runId,
    );
    expect(process.exitCode).toBe(1);
  });

  it('retains selected gate provenance on post-selection review filesystem errors', async () => {
    const { root, home } = await setup();
    const projectPath = await writeProject(root);
    await writeActiveProject(root, projectPath);
    await writeFile(
      join(root, projectPath, 'reviews'),
      'not a review directory',
      'utf8',
    );
    const runner = createProcessRunner();

    const capture = await runReviewGate({
      root,
      home,
      runProcess: runner.runProcess,
    });

    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'review_failed',
      outcome: 'unexpected_post_selection_failure',
      runId: expect.any(String),
      target: 'codex-default',
      project: projectPath,
      projectResolutionSource: 'active-project',
      gateInvocation: {
        runId: expect.any(String),
        targetId: 'codex-default',
        runtime: 'codex',
        model: 'provider-default',
        reasoningEffort: 'provider-default',
        source: 'exec-target-config',
      },
      message: expect.any(String),
    });
    expect(capture.jsonPayloads[0]?.runId).toBe(
      capture.jsonPayloads[0]?.gateInvocation.runId,
    );
    expect(runner.calls.filter((call) => call.purpose === 'execute')).toEqual(
      [],
    );
    expect(process.exitCode).toBe(1);
  });

  it.each([
    {
      finding: 'clean' as const,
      expectedExitCode: 0,
      expectedOutcome: 'review_completed_gate_passed',
      expectedStatus: 'ok',
    },
    {
      finding: 'important' as const,
      expectedExitCode: 1,
      expectedOutcome: 'review_completed_blocking_findings',
      expectedStatus: 'blocked',
    },
  ])(
    'recovers a late $finding run-correlated review artifact after timeout',
    async ({ finding, expectedExitCode, expectedOutcome, expectedStatus }) => {
      const { root, home } = await setup();
      const projectPath = await writeProject(root);
      await writeActiveProject(root, projectPath);
      const runner = createProcessRunner({
        executeTimedOut: true,
        onExecute: async () => {
          await writeReviewArtifact({ root, projectPath, finding });
        },
      });

      const capture = await runReviewGate({
        root,
        home,
        runProcess: runner.runProcess,
      });

      expect(capture.jsonPayloads[0]).toMatchObject({
        status: expectedStatus,
        outcome: expectedOutcome,
        lateCompletion: true,
        receiveEligible: true,
        artifactPath: `${projectPath}/reviews/p01-review.md`,
        corroboration: {
          run: 'matched',
          project: 'ambient',
          invocation: 'matched',
        },
        handoff: expect.stringContaining('oat-project-review-receive'),
      });
      expect(capture.jsonPayloads[0]).not.toHaveProperty('noOutputProduced');
      expect(process.exitCode).toBe(expectedExitCode);
    },
  );

  it('reports zero-output review target timeouts with structured failure metadata', async () => {
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
      stdio: 'pipe',
      timeoutMs: 1234,
    });
    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'review_failed',
      outcome: 'review_did_not_complete',
      projectResolutionSource: 'active-project',
      exitCode: 124,
      timedOut: true,
      timeoutMs: 1234,
      noOutputProduced: true,
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
    expect(capture.jsonPayloads[0]).not.toHaveProperty('lateCompletion');
    expect(process.exitCode).toBe(124);
  });

  it('resolves review timeout precedence and reports its source', async () => {
    const { root, home } = await setup();
    const projectPath = await writeProject(root);
    await writeActiveProject(root, projectPath);
    await writeFile(
      join(root, '.oat', 'config.json'),
      `${JSON.stringify({
        version: 1,
        workflow: {
          gateTimeouts: { code: 1_200_000 },
          gates: {
            execTargets: { 'codex-default': { timeoutMs: 1_300_000 } },
          },
        },
      })}\n`,
      'utf8',
    );
    const runner = createProcessRunner({ executeTimedOut: true });
    const capture = await runReviewGate({
      root,
      home,
      processEnv: { OAT_GATE_EXEC_TIMEOUT_MS: '1100000' },
      runProcess: runner.runProcess,
      args: [
        '--target',
        'codex-default',
        '--review-type',
        'code',
        '--review-scope',
        'final',
        '--timeout-ms',
        '1400000',
        'Review',
      ],
    });

    expect(runner.calls.at(-1)).toMatchObject({ timeoutMs: 1_400_000 });
    expect(capture.jsonPayloads[0]).toMatchObject({
      timeoutMs: 1_400_000,
      timeoutSource: 'cli',
    });
  });

  it.each([
    ['final', 1_800_000],
    ['p01', 1_800_000],
    ['p01-p03', 1_800_000],
    ['p01-t02', 900_000],
  ])('uses the code scope default for %s', async (scope, expected) => {
    const { root, home } = await setup();
    const projectPath = await writeProject(root);
    await writeActiveProject(root, projectPath);
    const runner = createProcessRunner();
    await runReviewGate({
      root,
      home,
      runProcess: runner.runProcess,
      args: [
        '--target',
        'codex-default',
        '--review-type',
        'code',
        '--review-scope',
        scope,
        'Review',
      ],
    });
    expect(runner.calls.at(-1)).toMatchObject({ timeoutMs: expected });
  });

  it('uses config before env and env before scope defaults', async () => {
    const { root, home } = await setup();
    const projectPath = await writeProject(root);
    await writeActiveProject(root, projectPath);
    await writeFile(
      join(root, '.oat', 'config.json'),
      `${JSON.stringify({
        version: 1,
        workflow: { gateTimeouts: { code: 1_250_000 } },
      })}\n`,
      'utf8',
    );
    const configRunner = createProcessRunner();
    await runReviewGate({
      root,
      home,
      processEnv: { OAT_GATE_EXEC_TIMEOUT_MS: '1150000' },
      runProcess: configRunner.runProcess,
      args: [
        '--target',
        'codex-default',
        '--review-type',
        'code',
        '--review-scope',
        'final',
        'Review',
      ],
    });
    expect(configRunner.calls.at(-1)).toMatchObject({ timeoutMs: 1_250_000 });

    await writeFile(
      join(root, '.oat', 'config.json'),
      `${JSON.stringify({ version: 1 })}\n`,
      'utf8',
    );
    const envRunner = createProcessRunner();
    await runReviewGate({
      root,
      home,
      processEnv: { OAT_GATE_EXEC_TIMEOUT_MS: '1150000' },
      runProcess: envRunner.runProcess,
      args: [
        '--target',
        'codex-default',
        '--review-type',
        'code',
        '--review-scope',
        'final',
        'Review',
      ],
    });
    expect(envRunner.calls.at(-1)).toMatchObject({ timeoutMs: 1_150_000 });
  });

  it('warns once for an invalid env timeout and reports the startup source', async () => {
    const { root, home } = await setup();
    const projectPath = await writeProject(root);
    await writeActiveProject(root, projectPath);
    const runner = createProcessRunner();
    const capture = await runReviewGate({
      root,
      home,
      processEnv: { OAT_GATE_EXEC_TIMEOUT_MS: 'invalid' },
      runProcess: runner.runProcess,
      globalArgs: [],
      args: [
        '--target',
        'codex-default',
        '--review-type',
        'artifact',
        '--review-scope',
        'design',
        'Review',
      ],
    });
    expect(capture.warn).toEqual([
      expect.stringContaining('OAT_GATE_EXEC_TIMEOUT_MS'),
    ]);
    expect(capture.info).toContain(
      'Running gate target codex-default (codex); timeout=900000ms (source=scope-default).',
    );
  });

  it('warns once for malformed persisted target timeout before using workflow config', async () => {
    const { root, home } = await setup();
    const projectPath = await writeProject(root);
    await writeActiveProject(root, projectPath);
    await writeFile(
      join(root, '.oat', 'config.json'),
      `${JSON.stringify({
        version: 1,
        workflow: {
          gateTimeouts: { code: 1_250_000 },
          gates: {
            execTargets: {
              'codex-default': { timeoutMs: 'not-a-timeout' },
            },
          },
        },
      })}\n`,
      'utf8',
    );
    const runner = createProcessRunner();
    const capture = await runReviewGate({
      root,
      home,
      runProcess: runner.runProcess,
      args: [
        '--target',
        'codex-default',
        '--review-type',
        'code',
        '--review-scope',
        'final',
        'Review',
      ],
    });

    expect(runner.calls.at(-1)).toMatchObject({ timeoutMs: 1_250_000 });
    expect(
      capture.warn.filter((warning) => warning.includes('target.timeoutMs')),
    ).toEqual([expect.stringContaining('target.timeoutMs from shared config')]);
  });

  it.each([
    ['code', 'final', 1_350_000],
    ['artifact', 'design', 1_450_000],
  ])(
    'warns once per reached malformed persisted workflow %s layer',
    async (reviewType, reviewScope, expectedTimeout) => {
      const { root, home } = await setup();
      const projectPath = await writeProject(root);
      await mkdir(join(home, '.oat'), { recursive: true });
      await writeFile(
        join(root, '.oat', 'config.local.json'),
        `${JSON.stringify({
          version: 1,
          activeProject: projectPath,
          workflow: {
            gateTimeouts: { [reviewType]: 'invalid-local' },
          },
        })}\n`,
        'utf8',
      );
      await writeFile(
        join(root, '.oat', 'config.json'),
        `${JSON.stringify({
          version: 1,
          workflow: {
            gateTimeouts:
              reviewType === 'code'
                ? { code: 'invalid-shared' }
                : { artifact: expectedTimeout },
          },
        })}\n`,
        'utf8',
      );
      await writeFile(
        join(home, '.oat', 'config.json'),
        `${JSON.stringify({
          version: 1,
          workflow: { gateTimeouts: { [reviewType]: expectedTimeout } },
        })}\n`,
        'utf8',
      );
      const runner = createProcessRunner();
      const capture = await runReviewGate({
        root,
        home,
        runProcess: runner.runProcess,
        args: [
          '--target',
          'codex-default',
          '--review-type',
          reviewType,
          '--review-scope',
          reviewScope,
          'Review',
        ],
      });

      expect(runner.calls.at(-1)).toMatchObject({
        timeoutMs: expectedTimeout,
      });
      const warnings = capture.warn.filter((warning) =>
        warning.includes(`workflow.gateTimeouts.${reviewType}`),
      );
      expect(warnings).toHaveLength(reviewType === 'code' ? 2 : 1);
      expect(warnings[0]).toContain('local config');
      if (reviewType === 'code') {
        expect(warnings[1]).toContain('shared config');
      }
    },
  );

  it('reports nonzero-output review target timeouts without classifying them as zero-output', async () => {
    const { root, home } = await setup();
    const projectPath = await writeProject(root);
    await writeActiveProject(root, projectPath);
    const runner = createProcessRunner({
      executeTimedOut: true,
      executeStdoutBytes: 17,
      executeStderrBytes: 9,
    });

    const capture = await runReviewGate({
      root,
      home,
      runProcess: runner.runProcess,
    });

    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'review_failed',
      outcome: 'review_did_not_complete',
      exitCode: 124,
      timedOut: true,
      noOutputProduced: false,
    });
    expect(capture.jsonPayloads[0]).not.toHaveProperty('lateCompletion');
    expect(process.exitCode).toBe(124);
  });

  it('preserves duplicate run-id correlation failures after timeout', async () => {
    const { root, home } = await setup();
    const projectPath = await writeProject(root);
    const siblingProject = await writeProject(
      root,
      '.oat/projects/shared/sibling',
    );
    await writeActiveProject(root, projectPath);
    const runner = createProcessRunner({
      executeTimedOut: true,
      onExecute: async () => {
        await writeReviewArtifact({
          root,
          projectPath,
          fileName: 'first-review.md',
          finding: 'clean',
        });
        await writeReviewArtifact({
          root,
          projectPath: siblingProject,
          fileName: 'second-review.md',
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
      status: 'targeting_correlation_failed',
      outcome: 'review_completed_targeting_correlation_failed',
      corroboration: {
        run: 'mismatched',
        actual: {
          matchingArtifactPaths: [
            `${projectPath}/reviews/first-review.md`,
            `${siblingProject}/reviews/second-review.md`,
          ].sort(),
        },
      },
    });
    expect(process.exitCode).toBe(1);
  });

  it('preserves mismatched changed-artifact correlation failures after timeout', async () => {
    const { root, home } = await setup();
    const projectPath = await writeProject(root);
    await writeActiveProject(root, projectPath);
    const runner = createProcessRunner({
      executeTimedOut: true,
      onExecute: async () => {
        await writeReviewArtifact({
          root,
          projectPath,
          finding: 'clean',
          gateInvocationOverrides: {
            oat_gate_run_id: 'different-run-id',
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
      status: 'targeting_correlation_failed',
      outcome: 'review_completed_targeting_correlation_failed',
      artifactPath: `${projectPath}/reviews/p01-review.md`,
      corroboration: {
        run: 'mismatched',
        actual: { matchingArtifactPaths: [] },
      },
    });
    expect(process.exitCode).toBe(1);
  });

  it('emits elapsed, idle, and hard-budget gate liveness telemetry', async () => {
    const { root, home } = await setup();
    const projectPath = await writeProject(root);
    await writeActiveProject(root, projectPath);
    const diagnostics: string[] = [];
    const runner = createProcessRunner({
      livenessSnapshots: [
        {
          elapsedMs: 1_000,
          hardBudgetMs: 5_000,
          idleMs: 250,
          processAlive: true,
        },
        {
          elapsedMs: 2_000,
          hardBudgetMs: 5_000,
          idleMs: 1_250,
          processAlive: true,
        },
      ],
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
      processEnv: {
        OAT_GATE_EXEC_TIMEOUT_MS: '5000',
        OAT_GATE_LIVENESS_INTERVAL_MS: '250',
      },
      runProcess: runner.runProcess,
      writeDiagnostic: (message) => diagnostics.push(message),
    });

    expect(runner.calls.at(-1)).toMatchObject({
      livenessIntervalMs: 250,
      purpose: 'execute',
      stdio: 'pipe',
      timeoutMs: 5_000,
    });
    expect(diagnostics.map((message) => JSON.parse(message))).toEqual(
      expect.arrayContaining([
        {
          type: 'gate-start',
          target: 'codex-default',
          runtime: 'codex',
          timeoutMs: 5_000,
          timeoutSource: 'env',
        },
        {
          elapsedMs: 1_000,
          hardBudgetMs: 5_000,
          idleMs: 250,
          processAlive: true,
          target: 'codex-default',
          type: 'gate-liveness',
        },
        {
          elapsedMs: 2_000,
          hardBudgetMs: 5_000,
          idleMs: 1_250,
          processAlive: true,
          target: 'codex-default',
          type: 'gate-liveness',
        },
      ]),
    );
    expect(capture.jsonPayloads[0]).toMatchObject({ status: 'ok' });
  });

  it('distinguishes an absent transcript path from unchanged evidence', async () => {
    const { root, home } = await setup();
    const projectPath = await writeProject(root);
    await writeActiveProject(root, projectPath);
    const diagnostics: string[] = [];
    const activityProbeStatus: GateActivityProbeStatus = {
      status: 'path-absent',
      runtime: 'claude',
      scope: 'project-dir',
      attemptedPath: join(home, '.claude', 'projects', '-fixture'),
      observedAt: 2_000,
    };
    const runner = createProcessRunner({
      livenessSnapshots: [
        {
          elapsedMs: 2_000,
          hardBudgetMs: 5_000,
          idleMs: 2_000,
          processAlive: true,
          activityProbeStatus,
        },
      ],
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
      writeDiagnostic: (message) => diagnostics.push(message),
    });

    expect(diagnostics.map((message) => JSON.parse(message))).toContainEqual(
      expect.objectContaining({
        type: 'gate-liveness',
        activityProbeStatus,
      }),
    );
  });

  it('fails closed when the child does not leave a branch-local route receipt', async () => {
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
      readGateRouteReceipt: async () => {
        throw new Error('Branch-local gate route did not return JSON.');
      },
    });

    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'review_failed',
      outcome: 'unexpected_post_selection_failure',
      message: 'Branch-local gate route did not return JSON.',
    });
    expect(process.exitCode).toBe(1);
  });

  it('distinguishes a stdout-idle child with advancing transcript activity', async () => {
    const { root, home } = await setup();
    const projectPath = await writeProject(root);
    await writeActiveProject(root, projectPath);
    const diagnostics: string[] = [];
    const evidence: GateActivityEvidence = {
      source: 'transcript-dir',
      runtime: 'cursor',
      scope: 'project-dir',
      observedPath: join(home, '.cursor', 'projects', 'fixture'),
      lastChangeAt: 2_000,
      totalSizeBytes: 512,
      changedSinceBaseline: true,
      observedAt: 2_000,
    };
    const runner = createProcessRunner({
      livenessSnapshots: [
        {
          elapsedMs: 2_000,
          hardBudgetMs: 5_000,
          idleMs: 2_000,
          processAlive: true,
          lastActivityEvidence: evidence,
        },
      ],
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
      writeDiagnostic: (message) => diagnostics.push(message),
    });

    expect(diagnostics.map((message) => JSON.parse(message))).toContainEqual({
      elapsedMs: 2_000,
      hardBudgetMs: 5_000,
      idleMs: 2_000,
      processAlive: true,
      lastActivityEvidence: evidence,
      target: 'codex-default',
      type: 'gate-liveness',
    });
  });

  it('carries latest activity evidence in timeout and child-failure envelopes without changing outcomes', async () => {
    const evidence: GateActivityEvidence = {
      source: 'transcript-dir',
      runtime: 'codex',
      scope: 'ambient-runtime',
      observedPath: '/home/test/.codex/sessions/2026/07/15',
      lastChangeAt: 2_000,
      totalSizeBytes: 512,
      changedSinceBaseline: true,
      observedAt: 2_000,
    };

    const timedOut = await setup();
    const timeoutProject = await writeProject(timedOut.root);
    await writeActiveProject(timedOut.root, timeoutProject);
    const timeoutCapture = await runReviewGate({
      ...timedOut,
      runProcess: createProcessRunner({
        executeTimedOut: true,
        executeActivityEvidence: evidence,
      }).runProcess,
    });
    expect(timeoutCapture.jsonPayloads[0]).toMatchObject({
      status: 'review_failed',
      outcome: 'review_did_not_complete',
      exitCode: 124,
      timedOut: true,
      noOutputProduced: true,
      activityEvidence: evidence,
    });
    expect(timeoutCapture.jsonPayloads[0]).not.toHaveProperty(
      'receiveEligible',
    );

    const failed = await setup();
    const failedProject = await writeProject(failed.root);
    await writeActiveProject(failed.root, failedProject);
    const failureCapture = await runReviewGate({
      ...failed,
      runProcess: createProcessRunner({
        executeExitCode: 7,
        executeActivityEvidence: evidence,
      }).runProcess,
    });
    expect(failureCapture.jsonPayloads[0]).toMatchObject({
      status: 'review_failed',
      outcome: 'review_did_not_complete',
      exitCode: 7,
      timedOut: false,
      activityEvidence: evidence,
    });
    expect(failureCapture.jsonPayloads[0]).not.toHaveProperty(
      'receiveEligible',
    );
  });

  it('summarizes advancing project transcript activity in human timeout output', async () => {
    const { root, home } = await setup();
    const projectPath = await writeProject(root);
    await writeActiveProject(root, projectPath);
    const observedAt = Date.now();
    const evidence: GateActivityEvidence = {
      source: 'transcript-dir',
      runtime: 'cursor',
      scope: 'project-dir',
      observedPath: join(home, '.cursor', 'projects', 'fixture'),
      lastChangeAt: observedAt - 250,
      totalSizeBytes: 512,
      changedSinceBaseline: true,
      observedAt,
    };

    const capture = await runReviewGate({
      root,
      home,
      runProcess: createProcessRunner({
        executeTimedOut: true,
        executeActivityEvidence: evidence,
      }).runProcess,
      globalArgs: [],
    });

    expect(capture.error).toEqual([
      expect.stringContaining('timed out'),
      expect.stringMatching(
        /^Activity evidence: cursor project transcript metadata changed since baseline; observed \d+ms ago; latest transcript change was 250ms before observation\.$/u,
      ),
    ]);
    expect(process.exitCode).toBe(124);
  });

  it('labels ambient Codex evidence as non-attributable in human failure output', async () => {
    const { root, home } = await setup();
    const projectPath = await writeProject(root);
    await writeActiveProject(root, projectPath);
    const observedAt = Date.now();
    const evidence: GateActivityEvidence = {
      source: 'transcript-dir',
      runtime: 'codex',
      scope: 'ambient-runtime',
      observedPath: join(home, '.codex', 'sessions', '2026', '07', '15'),
      lastChangeAt: observedAt - 500,
      totalSizeBytes: 512,
      changedSinceBaseline: true,
      observedAt,
    };

    const capture = await runReviewGate({
      root,
      home,
      runProcess: createProcessRunner({
        executeExitCode: 7,
        executeActivityEvidence: evidence,
      }).runProcess,
      globalArgs: [],
    });

    expect(capture.error.join('\n')).toContain(
      'Activity evidence: codex ambient transcript metadata changed since baseline',
    );
    expect(capture.error.join('\n')).toContain(
      'This activity is not attributable to this gate child.',
    );
    expect(process.exitCode).toBe(7);
  });

  it('does not print activity diagnostics for a structured refusal', async () => {
    const { root, home } = await setup();
    const projectPath = await writeProject(root);
    await writeActiveProject(root, projectPath);
    const observedAt = Date.now();
    const evidence: GateActivityEvidence = {
      source: 'transcript-dir',
      runtime: 'cursor',
      scope: 'project-dir',
      observedPath: join(home, '.cursor', 'projects', 'fixture'),
      lastChangeAt: observedAt,
      totalSizeBytes: 512,
      changedSinceBaseline: true,
      observedAt,
    };

    const capture = await runReviewGate({
      root,
      home,
      runProcess: createProcessRunner({
        executeExitCode: 1,
        executeOutput: 'OAT_GATE_REFUSAL: unavailable headless route\n',
        executeActivityEvidence: evidence,
      }).runProcess,
      globalArgs: [],
    });

    expect(capture.error).toEqual([
      'Review did not complete: reviewer refused the headless route (unavailable headless route).',
    ]);
    expect(process.exitCode).toBe(1);
  });

  it('labels ambient Codex activity as non-attributable in human liveness output', async () => {
    const { root, home } = await setup();
    const projectPath = await writeProject(root);
    await writeActiveProject(root, projectPath);
    const evidence: GateActivityEvidence = {
      source: 'transcript-dir',
      runtime: 'codex',
      scope: 'ambient-runtime',
      observedPath: join(home, '.codex', 'sessions', '2026', '07', '15'),
      lastChangeAt: 2_000,
      totalSizeBytes: 512,
      changedSinceBaseline: true,
      observedAt: 2_000,
    };
    const runner = createProcessRunner({
      livenessSnapshots: [
        {
          elapsedMs: 2_000,
          hardBudgetMs: 5_000,
          idleMs: 2_000,
          processAlive: true,
          lastActivityEvidence: evidence,
        },
      ],
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
      globalArgs: [],
    });

    expect(capture.info.join('\n')).toContain(
      'ambient runtime activity (not attributable to this gate child)',
    );
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
    expect(runner.calls[0]?.args.at(-1)).toContain(
      'Project resolution source: declared.',
    );
    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'ok',
      project: projectPath,
      projectResolutionSource: 'declared',
      corroboration: {
        project: 'matched',
        expected: { project: projectPath },
        actual: {
          containingProject: projectPath,
          artifactProject: projectPath,
          normalizedArtifactProject: projectPath,
        },
      },
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
      projectResolutionSource: 'declared',
      corroboration: {
        project: 'matched',
      },
    });
    expect(process.exitCode).toBe(0);
  });

  it('rejects an explicit project symlink whose real target escapes the repo', async () => {
    const { root, home } = await setup();
    const externalProject = await mkdtemp(
      join(tmpdir(), 'oat-gate-external-project-'),
    );
    tempDirs.push(externalProject);
    await writeFile(
      join(externalProject, 'state.md'),
      ['---', 'oat_kind: implementation', '---'].join('\n'),
      'utf8',
    );
    const projectsRoot = join(root, '.oat', 'projects', 'shared');
    await mkdir(projectsRoot, { recursive: true });
    await symlink(externalProject, join(projectsRoot, 'external-link'), 'dir');
    const runner = createProcessRunner();

    const capture = await runReviewGate({
      root,
      home,
      runProcess: runner.runProcess,
      args: [
        '--project',
        '.oat/projects/shared/external-link',
        '--target',
        'codex-default',
        'Review',
      ],
    });

    expect(runner.calls).toHaveLength(0);
    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'error',
      message: expect.stringMatching(/inside.*repository|outside.*scope/i),
    });
    expect(process.exitCode).toBe(1);
  });

  it('accepts an explicit project symlink whose real target stays inside the repo', async () => {
    const { root, home } = await setup();
    const realProjectPath = await writeProject(
      root,
      '.oat/projects/shared/real-project',
    );
    await symlink(
      'real-project',
      join(root, '.oat', 'projects', 'shared', 'linked-project'),
      'dir',
    );
    const projectPath = '.oat/projects/shared/linked-project';
    const runner = createProcessRunner({
      onExecute: async () => {
        await writeReviewArtifact({
          root,
          projectPath: realProjectPath,
          finding: 'clean',
        });
      },
    });

    const capture = await runReviewGate({
      root,
      home,
      runProcess: runner.runProcess,
      args: ['--project', projectPath, '--target', 'codex-default', 'Review'],
    });

    expect(
      runner.calls.find((call) => call.purpose === 'execute')?.args.at(-1),
    ).toContain(`Resolved OAT project path: ${realProjectPath}.`);
    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'ok',
      project: realProjectPath,
      projectResolutionSource: 'declared',
    });
    expect(process.exitCode).toBe(0);
  });

  it('reports single-candidate project resolution in the prompt and result', async () => {
    const { root, home } = await setup();
    const projectPath = await writeProject(
      root,
      '.oat/projects/shared/only-project',
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
    });

    expect(runner.calls[0]?.args.at(-1)).toContain(
      'Project resolution source: single-candidate.',
    );
    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'ok',
      project: projectPath,
      projectResolutionSource: 'single-candidate',
      corroboration: {
        project: 'ambient',
      },
    });
    expect(process.exitCode).toBe(0);
  });

  it('rejects an active-project review artifact written only under a sibling project', async () => {
    const { root, home } = await setup();
    const projectPath = await writeProject(root, '.oat/projects/shared/active');
    const siblingProject = await writeProject(
      root,
      '.oat/projects/shared/sibling',
    );
    await writeActiveProject(root, projectPath);
    let artifactPath = '';
    const runner = createProcessRunner({
      onExecute: async () => {
        artifactPath = await writeReviewArtifact({
          root,
          projectPath: siblingProject,
          artifactProject: projectPath,
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
      status: 'targeting_correlation_failed',
      project: projectPath,
      projectResolutionSource: 'active-project',
      artifactPath,
      receiveEligible: false,
      remediable: false,
      handoff: null,
      corroboration: {
        project: 'ambient',
        actual: {
          containingProject: siblingProject,
          artifactProject: projectPath,
        },
      },
    });
    expect(process.exitCode).toBe(1);
  });

  it('rejects a single-candidate review artifact written only under a sibling project', async () => {
    const { root, home } = await setup();
    const projectPath = await writeProject(
      root,
      '.oat/projects/shared/only-project',
    );
    const siblingProject = '.oat/projects/shared/late-sibling';
    let artifactPath = '';
    const runner = createProcessRunner({
      onExecute: async () => {
        await writeProject(root, siblingProject);
        artifactPath = await writeReviewArtifact({
          root,
          projectPath: siblingProject,
          artifactProject: projectPath,
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
      status: 'targeting_correlation_failed',
      project: projectPath,
      projectResolutionSource: 'single-candidate',
      artifactPath,
      receiveEligible: false,
      remediable: false,
      handoff: null,
      corroboration: {
        project: 'ambient',
        actual: {
          containingProject: siblingProject,
          artifactProject: projectPath,
        },
      },
    });
    expect(process.exitCode).toBe(1);
  });

  it('finds a run-correlated artifact for an explicit project outside the configured shared root', async () => {
    const { root, home } = await setup();
    const projectPath = await writeProject(
      root,
      '.oat/projects/team/outside-shared-root',
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
      args: ['--project', projectPath, '--target', 'codex-default', 'Review'],
    });

    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'ok',
      project: projectPath,
      projectResolutionSource: 'declared',
      corroboration: {
        run: 'matched',
        project: 'matched',
      },
    });
    expect(process.exitCode).toBe(0);
  });

  it('rejects a run-correlated sibling-project write before invocation remediation or severity', async () => {
    const { root, home } = await setup();
    const declaredProject = await writeProject(
      root,
      '.oat/projects/shared/declared',
    );
    const siblingProject = await writeProject(
      root,
      '.oat/projects/shared/sibling',
    );
    let artifactPath = '';
    const runner = createProcessRunner({
      onExecute: async () => {
        artifactPath = await writeReviewArtifact({
          root,
          projectPath: siblingProject,
          artifactProject: declaredProject,
          finding: 'clean',
          gateInvocationOverrides: {
            oat_invocation_model: 'also-wrong-but-targeting-wins',
          },
        });
      },
    });

    const capture = await runReviewGate({
      root,
      home,
      runProcess: runner.runProcess,
      args: [
        '--project',
        declaredProject,
        '--target',
        'codex-default',
        'Review',
      ],
    });

    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'targeting_correlation_failed',
      outcome: 'review_completed_targeting_correlation_failed',
      artifactPath,
      receiveEligible: false,
      remediable: false,
      handoff: null,
      corroboration: {
        run: 'matched',
        project: 'mismatched',
        expected: { project: declaredProject },
        actual: {
          containingProject: siblingProject,
          artifactProject: declaredProject,
        },
      },
    });
    expect(process.exitCode).toBe(1);
  });

  it.each([
    ['missing', null, 'missing'],
    ['wrong', '.oat/projects/shared/sibling', 'mismatched'],
    ['outside-repo', '../../outside', 'mismatched'],
  ] as const)(
    'rejects %s oat_project for an explicitly declared review project',
    async (_label, artifactProject, expectedStatus) => {
      const { root, home } = await setup();
      const declaredProject = await writeProject(
        root,
        '.oat/projects/shared/declared',
      );
      await writeProject(root, '.oat/projects/shared/sibling');
      const runner = createProcessRunner({
        onExecute: async () => {
          await writeReviewArtifact({
            root,
            projectPath: declaredProject,
            artifactProject,
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
          declaredProject,
          '--target',
          'codex-default',
          'Review',
        ],
      });

      expect(capture.jsonPayloads[0]).toMatchObject({
        status: 'targeting_correlation_failed',
        receiveEligible: false,
        handoff: null,
        corroboration: {
          run: 'matched',
          project: expectedStatus,
          actual: {
            containingProject: declaredProject,
            artifactProject,
          },
        },
      });
      expect(process.exitCode).toBe(1);
    },
  );

  it.each([
    {
      label: 'malformed findings',
      counts: { critical: 0, important: 0, medium: 1, minor: 0 },
    },
    {
      label: 'normalizable missing heading',
      counts: { critical: 0, important: 0, medium: 0, minor: 0 },
    },
  ])(
    'rejects a declared-project mismatch before parsing $label',
    async ({ counts }) => {
      const { root, home } = await setup();
      const declaredProject = await writeProject(
        root,
        '.oat/projects/shared/declared',
      );
      const siblingProject = await writeProject(
        root,
        '.oat/projects/shared/sibling',
      );
      let artifactPath = '';
      let originalContent = '';
      const runner = createProcessRunner({
        onExecute: async () => {
          artifactPath = await writeReviewArtifact({
            root,
            projectPath: declaredProject,
            artifactProject: siblingProject,
            finding: 'clean',
            omitMediumSection: true,
            counts,
          });
          originalContent = await readFile(join(root, artifactPath), 'utf8');
        },
      });

      const capture = await runReviewGate({
        root,
        home,
        runProcess: runner.runProcess,
        args: [
          '--project',
          declaredProject,
          '--target',
          'codex-default',
          'Review',
        ],
      });

      expect(capture.jsonPayloads[0]).toMatchObject({
        status: 'targeting_correlation_failed',
        artifactPath,
        receiveEligible: false,
        remediable: false,
        handoff: null,
        corroboration: {
          run: 'matched',
          project: 'mismatched',
          actual: {
            containingProject: declaredProject,
            artifactProject: siblingProject,
          },
        },
      });
      await expect(readFile(join(root, artifactPath), 'utf8')).resolves.toBe(
        originalContent,
      );
      expect(process.exitCode).toBe(1);
    },
  );

  it.each([
    ['missing', true, undefined, 'missing'],
    ['wrong', false, '11111111-1111-4111-8111-111111111111', 'mismatched'],
  ] as const)(
    'rejects a %s gate run id as non-remediable targeting failure',
    async (_label, omitGateRunId, wrongRunId, expectedStatus) => {
      const { root, home } = await setup();
      const projectPath = await writeProject(root);
      const runner = createProcessRunner({
        onExecute: async () => {
          await writeReviewArtifact({
            root,
            projectPath,
            finding: 'clean',
            omitGateRunId,
            ...(wrongRunId
              ? {
                  gateInvocationOverrides: {
                    oat_gate_run_id: wrongRunId,
                  },
                }
              : {}),
          });
        },
      });

      const capture = await runReviewGate({
        root,
        home,
        runProcess: runner.runProcess,
        args: ['--project', projectPath, '--target', 'codex-default', 'Review'],
      });

      expect(capture.jsonPayloads[0]).toMatchObject({
        status: 'targeting_correlation_failed',
        receiveEligible: false,
        remediable: false,
        handoff: null,
        corroboration: {
          run: expectedStatus,
        },
      });
      expect(process.exitCode).toBe(1);
    },
  );

  it('rejects an artifact mutated between correlation and verdict evaluation', async () => {
    const { root, home } = await setup();
    const declaredProject = await writeProject(
      root,
      '.oat/projects/shared/declared',
    );
    const siblingProject = await writeProject(
      root,
      '.oat/projects/shared/sibling',
    );
    let artifactPath = '';
    let mutatedContent = '';
    const runner = createProcessRunner({
      onExecute: async () => {
        artifactPath = await writeReviewArtifact({
          root,
          projectPath: declaredProject,
          artifactProject: declaredProject,
          reviewScope: 'p01',
          finding: 'important',
          counts: { critical: 0, important: 1, medium: 0, minor: 0 },
          gateInvocationOverrides: {
            oat_invocation_model: 'stale-model',
          },
        });
      },
    });

    const capture = await runReviewGate({
      root,
      home,
      runProcess: runner.runProcess,
      parseReviewGateVerdict: async (absolutePath, options) => {
        mutatedContent = (await readFile(absolutePath, 'utf8'))
          .replace(
            `oat_project: ${declaredProject}`,
            `oat_project: ${siblingProject}`,
          )
          .replace('oat_review_scope: p01', 'oat_review_scope: final')
          .replace(
            'oat_invocation_model: stale-model',
            'oat_invocation_model: provider-default',
          )
          .replace(
            'oat_review_important_count: 1',
            'oat_review_important_count: 0',
          )
          .replace('- Important finding that should block.', 'None.');
        await writeFile(absolutePath, mutatedContent, 'utf8');
        return parseReviewGateVerdictFromDisk(absolutePath, options);
      },
      args: [
        '--project',
        declaredProject,
        '--target',
        'codex-default',
        'Review',
      ],
    });

    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'artifact_validation_failed',
      artifactPath,
      receiveEligible: false,
      handoff: null,
      message: expect.stringMatching(/changed|signature/i),
    });
    await expect(readFile(join(root, artifactPath), 'utf8')).resolves.toBe(
      mutatedContent,
    );
    expect(process.exitCode).toBe(1);
  });

  it('rejects duplicate direct artifacts carrying the same gate run id', async () => {
    const { root, home } = await setup();
    const declaredProject = await writeProject(
      root,
      '.oat/projects/shared/declared',
    );
    const siblingProject = await writeProject(
      root,
      '.oat/projects/shared/sibling',
    );
    const runner = createProcessRunner({
      onExecute: async () => {
        await writeReviewArtifact({
          root,
          projectPath: declaredProject,
          fileName: 'declared-review.md',
          finding: 'clean',
        });
        await writeReviewArtifact({
          root,
          projectPath: siblingProject,
          fileName: 'sibling-review.md',
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
        declaredProject,
        '--target',
        'codex-default',
        'Review',
      ],
    });

    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'targeting_correlation_failed',
      receiveEligible: false,
      corroboration: {
        run: 'mismatched',
        actual: {
          matchingArtifactPaths: expect.arrayContaining([
            `${declaredProject}/reviews/declared-review.md`,
            `${siblingProject}/reviews/sibling-review.md`,
          ]),
        },
      },
    });
    expect(process.exitCode).toBe(1);
  });

  it.each([
    ['single-quoted', "'2026-06-01T00:00:00Z'"],
    ['double-quoted', '"2026-06-01T00:00:00Z"'],
  ] as const)(
    'accepts a valid %s oat_generated_at scalar',
    async (_label, generatedAt) => {
      const { root, home } = await setup();
      const projectPath = await writeProject(root);
      const runner = createProcessRunner({
        onExecute: async () => {
          await writeReviewArtifact({
            root,
            projectPath,
            generatedAt,
            finding: 'clean',
          });
        },
      });

      const capture = await runReviewGate({
        root,
        home,
        runProcess: runner.runProcess,
        args: ['--project', projectPath, '--target', 'codex-default', 'Review'],
      });

      expect(capture.jsonPayloads[0]).toMatchObject({
        status: 'ok',
        generatedAt: '2026-06-01T00:00:00Z',
        corroboration: { run: 'matched' },
      });
      expect(process.exitCode).toBe(0);
    },
  );

  it('classifies uniquely correlated malformed YAML as artifact validation without mutating it', async () => {
    const { root, home } = await setup();
    const projectPath = await writeProject(root);
    let artifactPath = '';
    let malformedContent = '';
    const runner = createProcessRunner({
      onExecute: async () => {
        artifactPath = await writeReviewArtifact({
          root,
          projectPath,
          finding: 'clean',
        });
        malformedContent = (
          await readFile(join(root, artifactPath), 'utf8')
        ).replace(
          'oat_invocation_source: exec-target-config',
          'oat_invocation_source: [',
        );
        await writeFile(join(root, artifactPath), malformedContent, 'utf8');
      },
    });

    const capture = await runReviewGate({
      root,
      home,
      runProcess: runner.runProcess,
      args: ['--project', projectPath, '--target', 'codex-default', 'Review'],
    });

    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'artifact_validation_failed',
      artifactPath,
      generatedAt: '2026-06-01T00:00:00Z',
      corroboration: { run: 'matched', project: 'matched' },
      message: expect.stringMatching(/YAML|flow sequence/i),
    });
    await expect(readFile(join(root, artifactPath), 'utf8')).resolves.toBe(
      malformedContent,
    );
    expect(process.exitCode).toBe(1);
  });

  it('retains a malformed same-run artifact when detecting duplicate correlation', async () => {
    const { root, home } = await setup();
    const projectPath = await writeProject(root);
    const validPath = `${projectPath}/reviews/valid-review.md`;
    const malformedPath = `${projectPath}/reviews/malformed-review.md`;
    const runner = createProcessRunner({
      onExecute: async () => {
        await writeReviewArtifact({
          root,
          projectPath,
          fileName: 'valid-review.md',
          finding: 'clean',
        });
        const path = await writeReviewArtifact({
          root,
          projectPath,
          fileName: 'malformed-review.md',
          finding: 'clean',
        });
        const content = await readFile(join(root, path), 'utf8');
        await writeFile(
          join(root, path),
          content.replace(
            'oat_invocation_source: exec-target-config',
            'oat_invocation_source: [',
          ),
          'utf8',
        );
      },
    });

    const capture = await runReviewGate({
      root,
      home,
      runProcess: runner.runProcess,
      args: ['--project', projectPath, '--target', 'codex-default', 'Review'],
    });

    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'targeting_correlation_failed',
      receiveEligible: false,
      corroboration: {
        actual: {
          matchingArtifactPaths: [malformedPath, validPath].sort(),
        },
      },
    });
    expect(process.exitCode).toBe(1);
  });

  it('does not correlate malformed nested, comment, body, alias, or duplicate-key run-id spoofs', async () => {
    const { root, home } = await setup();
    const projectPath = await writeProject(root);
    const runner = createProcessRunner({
      onExecute: async () => {
        const runId = lastExecutePrompt.match(/^oat_gate_run_id: (.+)$/m)?.[1];
        expect(runId).toBeTruthy();
        const reviewsDir = join(root, projectPath, 'reviews');
        await mkdir(reviewsDir, { recursive: true });
        const cases = [
          `nested:\n  oat_gate_run_id: ${runId}\nbroken: [`,
          `# oat_gate_run_id: ${runId}\nbroken: [`,
          `anchor: &run ${runId}\noat_gate_run_id: *run\nbroken: [`,
          `oat_gate_run_id: ${runId}\noat_gate_run_id: ${runId}\nbroken: [`,
        ];
        await Promise.all(
          cases.map((frontmatter, index) =>
            writeFile(
              join(reviewsDir, `spoof-${index}.md`),
              `---\noat_generated: true\noat_generated_at: 2026-06-01T00:00:00Z\noat_review_scope: p01\n${frontmatter}\n---\n\n# Review\n\noat_gate_run_id: ${runId}\n`,
              'utf8',
            ),
          ),
        );
      },
    });

    const capture = await runReviewGate({
      root,
      home,
      runProcess: runner.runProcess,
      args: ['--project', projectPath, '--target', 'codex-default', 'Review'],
    });

    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'targeting_correlation_failed',
      corroboration: {
        run: 'missing',
        actual: { matchingArtifactPaths: [] },
      },
    });
    expect(process.exitCode).toBe(1);
  });

  it.each([
    ['missing', null],
    ['invalid', 'not-a-timestamp'],
  ] as const)(
    'retains a same-run duplicate with %s generation metadata',
    async (_label, generatedAt) => {
      const { root, home } = await setup();
      const declaredProject = await writeProject(
        root,
        '.oat/projects/shared/declared',
      );
      const siblingProject = await writeProject(
        root,
        '.oat/projects/shared/sibling',
      );
      const validPath = `${declaredProject}/reviews/valid-review.md`;
      const malformedPath = `${siblingProject}/reviews/malformed-review.md`;
      const runner = createProcessRunner({
        onExecute: async () => {
          await writeReviewArtifact({
            root,
            projectPath: declaredProject,
            fileName: 'valid-review.md',
            finding: 'clean',
          });
          await writeReviewArtifact({
            root,
            projectPath: siblingProject,
            fileName: 'malformed-review.md',
            generatedAt,
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
          declaredProject,
          '--target',
          'codex-default',
          'Review',
        ],
      });

      expect(capture.jsonPayloads[0]).toMatchObject({
        status: 'targeting_correlation_failed',
        receiveEligible: false,
        corroboration: {
          run: 'mismatched',
          actual: {
            matchingArtifactPaths: [validPath, malformedPath].sort(),
          },
        },
      });
      expect(process.exitCode).toBe(1);
    },
  );

  it.each([
    ['missing', null],
    ['invalid', 'not-a-timestamp'],
  ] as const)(
    'classifies a single run-correlated artifact with %s generation metadata as invalid format',
    async (_label, generatedAt) => {
      const { root, home } = await setup();
      const projectPath = await writeProject(root);
      let artifactPath = '';
      const runner = createProcessRunner({
        onExecute: async () => {
          artifactPath = await writeReviewArtifact({
            root,
            projectPath,
            generatedAt,
            finding: 'clean',
          });
        },
      });

      const capture = await runReviewGate({
        root,
        home,
        runProcess: runner.runProcess,
        args: ['--project', projectPath, '--target', 'codex-default', 'Review'],
      });

      expect(capture.jsonPayloads[0]).toMatchObject({
        status: 'artifact_validation_failed',
        outcome: 'review_completed_artifact_validation_failed',
        artifactPath,
        generatedAt,
        message: expect.stringContaining('oat_generated_at'),
      });
      expect(process.exitCode).toBe(1);
    },
  );

  it('uses the unique run-id match instead of a changed wrong-run diagnostic artifact', async () => {
    const { root, home } = await setup();
    const projectPath = await writeProject(root);
    let matchedArtifactPath = '';
    const runner = createProcessRunner({
      onExecute: async () => {
        await writeReviewArtifact({
          root,
          projectPath,
          fileName: 'wrong-run-review.md',
          finding: 'important',
          gateInvocationOverrides: {
            oat_gate_run_id: '11111111-1111-4111-8111-111111111111',
          },
        });
        matchedArtifactPath = await writeReviewArtifact({
          root,
          projectPath,
          fileName: 'matched-review.md',
          finding: 'clean',
        });
      },
    });

    const capture = await runReviewGate({
      root,
      home,
      runProcess: runner.runProcess,
      args: ['--project', projectPath, '--target', 'codex-default', 'Review'],
    });

    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'ok',
      artifactPath: matchedArtifactPath,
      corroboration: {
        run: 'matched',
        project: 'matched',
      },
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
      status: 'artifact_missing',
      outcome: 'review_completed_artifact_missing',
      receiveEligible: false,
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
      status: 'artifact_missing',
      outcome: 'review_completed_artifact_missing',
      receiveEligible: false,
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
