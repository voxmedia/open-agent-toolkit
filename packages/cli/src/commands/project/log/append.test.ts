import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { hostname, tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

import type { CommandContext, GlobalOptions } from '@app/command-context';
import {
  createLoggerCapture,
  type LoggerCapture,
} from '@commands/__tests__/helpers';
import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  appendProjectLog,
  commitProjectLog,
  PROJECT_LOG_COMMIT_ATTEMPTS,
  projectLogLockPath,
  ProjectLogSealedError,
  type AppendProjectLogDependencies,
  type GateProjectLogReceipt,
} from './append';
import { createProjectLogCommand } from './index';

const CANONICAL_ASSETS_ROOT = resolve(
  import.meta.dirname,
  '../../../../../../.oat',
);

interface Harness {
  capture: LoggerCapture;
  command: Command;
}

function createHarness(cwd: string, stdin = ''): Harness {
  const capture = createLoggerCapture();
  return {
    capture,
    command: createProjectLogCommand({
      buildCommandContext: (options: GlobalOptions): CommandContext => ({
        scope: 'project',
        dryRun: false,
        verbose: options.verbose ?? false,
        json: options.json ?? false,
        cwd: options.cwd ?? cwd,
        home: join(cwd, 'home'),
        interactive: !(options.json ?? false),
        logger: capture.logger,
      }),
      resolveProjectRoot: async () => cwd,
      resolveAssetsRoot: async () => CANONICAL_ASSETS_ROOT,
      readStdin: async () => stdin,
      now: () => new Date('2026-07-17T12:00:00.000Z'),
    }),
  };
}

async function runCommand(
  command: Command,
  args: string[],
  globalArgs: string[] = ['--json'],
): Promise<void> {
  const program = new Command()
    .name('oat')
    .option('--json')
    .option('--verbose')
    .option('--cwd <path>')
    .exitOverride();
  const project = new Command('project');
  project.addCommand(command);
  program.addCommand(project);
  await program.parseAsync(
    [...globalArgs, 'project', 'log', 'append', ...args],
    { from: 'user' },
  );
}

describe('oat project log append', () => {
  const tempDirs: string[] = [];
  let originalExitCode: number | undefined;

  beforeEach(() => {
    originalExitCode = process.exitCode;
    process.exitCode = undefined;
  });

  afterEach(async () => {
    process.exitCode = originalExitCode;
    await Promise.all(
      tempDirs.map(async (dir) => rm(dir, { recursive: true, force: true })),
    );
    tempDirs.length = 0;
  });

  async function createRepo(
    projectName = 'demo',
  ): Promise<{ root: string; projectPath: string; logPath: string }> {
    const root = await mkdtemp(join(tmpdir(), 'oat-project-log-'));
    tempDirs.push(root);
    const projectRelativePath = join('.oat', 'projects', 'shared', projectName);
    const projectPath = join(root, projectRelativePath);
    await mkdir(projectPath, { recursive: true });
    await writeFile(join(projectPath, 'state.md'), '---\n---\n', 'utf8');
    await writeFile(
      join(root, '.oat', 'config.local.json'),
      `${JSON.stringify({ version: 1, activeProject: projectRelativePath })}\n`,
      'utf8',
    );
    return {
      root,
      projectPath,
      logPath: join(projectPath, 'project-log.md'),
    };
  }

  const judgmentArgs = [
    '--type',
    'bug',
    '--scope',
    'project',
    '--area',
    'gate review',
    '--body',
    'The gate returned the wrong exit code.',
  ];

  it('creates from the template on first append under auto', async () => {
    const { root, logPath } = await createRepo();
    const { command, capture } = createHarness(root);

    await runCommand(command, judgmentArgs);

    const content = await readFile(logPath, 'utf8');
    expect(content).toContain('# Project Log: demo');
    expect(content).toContain('### 2026-07-17 · project · bug · gate review');
    expect(content).toContain('The gate returned the wrong exit code.');
    expect(content).not.toContain('oat_template: true');
    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'appended',
      created: true,
    });
    expect(process.exitCode).toBe(0);
  });

  it.each([false, true, 'auto'])(
    'artifact presence wins when config is %#',
    async (projectLog) => {
      const { root, logPath } = await createRepo();
      await writeFile(logPath, '# Existing\n\n## Entries\n', 'utf8');
      await writeFile(
        join(root, '.oat', 'config.local.json'),
        `${JSON.stringify({
          version: 1,
          activeProject: '.oat/projects/shared/demo',
          workflow: { projectLog },
        })}\n`,
        'utf8',
      );

      const { command } = createHarness(root);
      await runCommand(command, judgmentArgs);
      await expect(readFile(logPath, 'utf8')).resolves.toContain(
        '### 2026-07-17 · project · bug · gate review',
      );
    },
  );

  it('silently skips under false when no artifact exists', async () => {
    const { root, logPath } = await createRepo();
    await writeFile(
      join(root, '.oat', 'config.local.json'),
      `${JSON.stringify({
        version: 1,
        activeProject: '.oat/projects/shared/demo',
        workflow: { projectLog: false },
      })}\n`,
      'utf8',
    );
    const { command, capture } = createHarness(root);

    await runCommand(command, judgmentArgs);

    expect(capture.jsonPayloads[0]).toEqual({
      status: 'skipped',
      reason: 'projectLog=false',
    });
    await expect(readFile(logPath, 'utf8')).rejects.toMatchObject({
      code: 'ENOENT',
    });
    expect(process.exitCode).toBe(0);
  });

  it('composes structural headings and accepts stdin bodies', async () => {
    const { root, logPath } = await createRepo();
    const { command } = createHarness(root, 'Dispatch completed successfully.');

    await runCommand(command, [
      '--structural',
      '--producer',
      'oat-project-implement',
      '--ref',
      'p01',
      '--body',
      '-',
    ]);

    const content = await readFile(logPath, 'utf8');
    expect(content).toContain(
      '### 2026-07-17 · structural · oat-project-implement · p01',
    );
    expect(content).toContain('Dispatch completed successfully.');
  });

  it.each([
    ['performed', 'performed'],
    ['declined', 'declined'],
    ['skipped', 'skipped'],
    ['deferred', 'deferred'],
  ] as const)(
    'accepts the canonical retro receipt with %s outcomes',
    async (applyOutcome, filingOutcome) => {
      const { root, projectPath, logPath } = await createRepo();
      const { command, capture } = createHarness(root);
      const body =
        'retro artifact=.oat/projects/shared/demo/references/project-retro.md evidence_used=gate-receipts,project-log evidence_unavailable=archived-review-markdown promotions=2 upstream=1 ' +
        `apply=${applyOutcome} filing=${filingOutcome}`;

      await runCommand(command, [
        '--project',
        projectPath,
        '--structural',
        '--producer',
        'oat-project-retro',
        '--ref',
        'project-retro',
        '--body',
        body,
      ]);

      await expect(readFile(logPath, 'utf8')).resolves.toContain(
        '### 2026-07-17 · structural · oat-project-retro · project-retro',
      );
      await expect(readFile(logPath, 'utf8')).resolves.toContain(body);
      expect(capture.jsonPayloads[0]).toMatchObject({ status: 'appended' });
      expect(process.exitCode).toBe(0);
    },
  );

  it('accepts the full retro correction judgment invocation', async () => {
    const { root, projectPath, logPath } = await createRepo();
    const { command, capture } = createHarness(root);
    const body =
      'Retro correction id=RP-01 original=event-2026-07-16-review\nThe gate result was accepted after the retry.';

    await runCommand(command, [
      '--project',
      projectPath,
      '--type',
      'feedback',
      '--scope',
      'project',
      '--area',
      'retro correction RP-01',
      '--body',
      body,
    ]);

    await expect(readFile(logPath, 'utf8')).resolves.toContain(
      '### 2026-07-17 · project · feedback · retro correction RP-01',
    );
    await expect(readFile(logPath, 'utf8')).resolves.toContain(body);
    expect(capture.jsonPayloads[0]).toMatchObject({ status: 'appended' });
    expect(process.exitCode).toBe(0);
  });

  it('adds an optional version note clause', async () => {
    const { root, logPath } = await createRepo();
    const { command } = createHarness(root);

    await runCommand(command, [
      ...judgmentArgs,
      '--version-note',
      'oat 0.1.72',
    ]);

    await expect(readFile(logPath, 'utf8')).resolves.toContain(
      'The gate returned the wrong exit code. (observed on oat 0.1.72)',
    );
  });

  it.each([
    [['--type', 'unknown'], 'bug | friction | worked-well | feedback'],
    [['--scope', 'unknown'], 'project | general'],
    [['--area', 'line one\nline two'], 'single line'],
    [['--area', 'x'.repeat(121)], '120 characters'],
  ] as const)(
    'rejects invalid taxonomy or boundaries: %s',
    async (replacement, message) => {
      const { root } = await createRepo();
      const args = [...judgmentArgs];
      const option = replacement[0];
      const index = args.indexOf(option);
      args[index + 1] = replacement[1];
      const { command, capture } = createHarness(root);

      await runCommand(command, args);

      expect(capture.jsonPayloads[0]).toMatchObject({
        status: 'error',
        message: expect.stringContaining(message),
      });
      expect(process.exitCode).toBe(1);
    },
  );

  it.each([
    [
      [...judgmentArgs.slice(0, 5), 'gate · review', ...judgmentArgs.slice(6)],
      '--area',
      'heading delimiter',
    ],
    [
      [
        '--structural',
        '--producer',
        'oat · implement',
        '--ref',
        'p01',
        '--body',
        'Dispatched.',
      ],
      '--producer',
      'heading delimiter',
    ],
    [
      [
        '--structural',
        '--producer',
        'oat-project-implement',
        '--ref',
        'p01 · review',
        '--body',
        'Dispatched.',
      ],
      '--ref',
      'heading delimiter',
    ],
    [
      [...judgmentArgs, '--version-note', 'oat 0.1.72\ncommit abc'],
      '--version-note',
      'single line',
    ],
    [
      [
        '--structural',
        '--producer',
        'oat-project-implement',
        '--ref',
        'p01',
        '--body',
        'Started.\nFinished.',
      ],
      '--body',
      'one line',
    ],
    [
      [
        '--structural',
        '--producer',
        'oat-project-implement',
        '--ref',
        'p01',
        '--body',
        '## Entries',
      ],
      '--body',
      'level-two or level-three Markdown headings',
    ],
    [
      [
        '--structural',
        '--producer',
        'oat-project-implement',
        '--ref',
        'p01',
        '--body',
        '## End-of-run synthesis (pending — do not skip at project completion)',
      ],
      '--body',
      'level-two or level-three Markdown headings',
    ],
    [
      [
        ...judgmentArgs.slice(0, -1),
        'Observation recorded.\n## End-of-run synthesis',
      ],
      '--body',
      'level-two or level-three Markdown headings',
    ],
    [
      [
        ...judgmentArgs.slice(0, -1),
        'Observation recorded.\n### handwritten entry',
      ],
      '--body',
      'level-two or level-three Markdown headings',
    ],
  ])(
    'rejects serialization-boundary collision in %s',
    async (args, option, message) => {
      const { root } = await createRepo();
      const { command, capture } = createHarness(root);

      await runCommand(command, args);

      expect(capture.jsonPayloads[0]).toMatchObject({
        status: 'error',
        message: expect.stringContaining(option),
      });
      expect(capture.jsonPayloads[0]).toMatchObject({
        message: expect.stringContaining(message),
      });
      expect(process.exitCode).toBe(1);
    },
  );

  it.each([
    [['--scope', 'project', '--area', 'area', '--body', 'body'], '--type'],
    [['--type', 'bug', '--area', 'area', '--body', 'body'], '--scope'],
    [['--type', 'bug', '--scope', 'project', '--body', 'body'], '--area'],
    [['--structural', '--producer', 'producer', '--body', 'body'], '--ref'],
  ])('rejects missing required entry flags', async (args, missingFlag) => {
    const { root } = await createRepo();
    const { command, capture } = createHarness(root);

    await runCommand(command, args);

    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'error',
      message: expect.stringContaining(missingFlag),
    });
    expect(process.exitCode).toBe(1);
  });

  it.each([
    [
      [
        '--structural',
        '--producer',
        'producer',
        '--ref',
        'p01',
        '--type',
        'bug',
        '--body',
        'body',
      ],
      'judgment flags',
    ],
    [
      [
        '--type',
        'bug',
        '--scope',
        'project',
        '--area',
        'area',
        '--producer',
        'producer',
        '--body',
        'body',
      ],
      'structural flags',
    ],
  ])('rejects mixed entry-class flags', async (args, message) => {
    const { root } = await createRepo();
    const { command, capture } = createHarness(root);

    await runCommand(command, args);

    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'error',
      message: expect.stringContaining(message),
    });
    expect(process.exitCode).toBe(1);
  });

  it('preserves all prior bytes and emits format-stable appends', async () => {
    const { root, logPath } = await createRepo();
    const { command } = createHarness(root);
    await runCommand(command, judgmentArgs);
    const prior = await readFile(logPath, 'utf8');
    const priorEntry =
      '### 2026-07-17 · project · bug · gate review\n\nThe gate returned the wrong exit code.';
    const priorSynthesis = prior.slice(
      prior.indexOf('\n## End-of-run synthesis'),
    );

    await runCommand(command, [
      '--type',
      'worked-well',
      '--scope',
      'general',
      '--area',
      'command help',
      '--body',
      'The self-teaching contract prevented drift.',
    ]);

    const content = await readFile(logPath, 'utf8');
    expect(content).toContain(priorEntry);
    expect(content.endsWith(priorSynthesis)).toBe(true);
    execFileSync('pnpm', ['exec', 'oxfmt', '--check', logPath], {
      cwd: resolve(import.meta.dirname, '../../../../../..'),
      stdio: 'pipe',
    });
  });

  it('prefers explicit --project over the active project', async () => {
    const { root } = await createRepo('active');
    const explicitPath = join(root, '.oat', 'projects', 'shared', 'explicit');
    await mkdir(explicitPath, { recursive: true });
    await writeFile(join(explicitPath, 'state.md'), '---\n---\n', 'utf8');
    const { command } = createHarness(root);

    await runCommand(command, [
      ...judgmentArgs,
      '--project',
      '.oat/projects/shared/explicit',
    ]);

    await expect(
      readFile(join(explicitPath, 'project-log.md'), 'utf8'),
    ).resolves.toContain('· project · bug · gate review');
    await expect(
      readFile(
        join(root, '.oat', 'projects', 'shared', 'active', 'project-log.md'),
        'utf8',
      ),
    ).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('errors when no explicit or active project resolves', async () => {
    const { root } = await createRepo();
    await writeFile(
      join(root, '.oat', 'config.local.json'),
      '{"version":1}\n',
      'utf8',
    );
    const { command, capture } = createHarness(root);

    await runCommand(command, judgmentArgs);

    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'error',
      message: expect.stringContaining('No active project'),
    });
    expect(process.exitCode).toBe(1);
  });

  it('documents the complete entry contract in --help', () => {
    const { command } = createHarness('/repo');
    const appendCommand = command.commands.find(
      (subcommand) => subcommand.name() === 'append',
    )!;
    let help = '';
    appendCommand.configureOutput({
      writeOut: (text) => {
        help += text;
      },
    });
    appendCommand.outputHelp();

    for (const requiredText of [
      'breaks, surprises, workarounds, or notable successes',
      'worked-well',
      'Observation:',
      'Impact:',
      'Recommendation:',
      'reference artifacts by path',
      'Never record secret values',
      'never edited or struck through',
    ]) {
      expect(help).toContain(requiredText);
    }
  });

  const structuralArgs = (
    key: string,
    body = `gate finalization run=${key}`,
  ): string[] => [
    '--structural',
    '--producer',
    'oat gate review',
    '--ref',
    'p02',
    '--body',
    body,
  ];

  function initGitRepo(root: string): (args: string[]) => string {
    const git = (args: string[]): string =>
      execFileSync('git', args, {
        cwd: root,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      }).trim();
    git(['init', '-q', '--initial-branch=main']);
    git(['config', 'user.email', 'log@example.test']);
    git(['config', 'user.name', 'Log Test']);
    git(['config', 'commit.gpgsign', 'false']);
    git(['add', '-A']);
    git(['commit', '-q', '-m', 'baseline']);
    return git;
  }

  async function seedLog(logPath: string, entries = ''): Promise<void> {
    await writeFile(
      logPath,
      `# Project Log: demo\n\n## Entries\n${entries}`,
      'utf8',
    );
  }

  function countHeadings(content: string, key: string): number {
    return content
      .split('\n')
      .filter((line) => line.split(/\s+/).includes(`run=${key}`)).length;
  }

  describe('completion seal', () => {
    const SEAL_HEADING =
      '### 2026-07-17 · structural · oat-project-complete · seal';
    const sealKey = 'oat-seal:demo';

    function sealArgs(body: string, keyed = true): string[] {
      return [
        '--structural',
        '--producer',
        'oat-project-complete',
        '--ref',
        'seal',
        '--body',
        body,
        ...(keyed ? ['--idempotency-key', sealKey] : []),
      ];
    }

    function countSeals(content: string): number {
      return content.split(SEAL_HEADING).length - 1;
    }

    function sealedLogEntries(keyed: boolean): string {
      const token = keyed ? ` ${sealKey}` : '';
      return `\n${SEAL_HEADING}\n\nCompletion sealed at 2026-07-17T09:00:00Z; project-log roll-up status: ok.${token}\n`;
    }

    it('reports already-appended when the keyed seal is replayed', async () => {
      const { root, logPath } = await createRepo();
      await seedLog(logPath);

      const first = createHarness(root);
      await runCommand(
        first.command,
        sealArgs(
          `Completion sealed at 2026-07-17T10:00:00Z; project-log roll-up status: ok. ${sealKey}`,
        ),
      );
      expect(first.capture.jsonPayloads[0]).toMatchObject({
        status: 'appended',
      });
      const afterFirst = await readFile(logPath, 'utf8');

      // A replay differs only in the timestamp, exactly as a resumed
      // completion would.
      const second = createHarness(root);
      await runCommand(
        second.command,
        sealArgs(
          `Completion sealed at 2026-07-17T11:30:00Z; project-log roll-up status: ok. ${sealKey}`,
        ),
      );

      expect(second.capture.jsonPayloads[0]).toMatchObject({
        status: 'already-appended',
        heading: SEAL_HEADING,
        created: false,
      });
      await expect(readFile(logPath, 'utf8')).resolves.toBe(afterFirst);
      expect(countSeals(afterFirst)).toBe(1);
      expect(process.exitCode).toBe(0);
    });

    it('recognizes a pre-existing unkeyed seal that no key can match', async () => {
      const { root, logPath } = await createRepo();
      // A log sealed before the seal append carried a key: its body holds no
      // token, so key matching alone would append a second seal here.
      await seedLog(logPath, sealedLogEntries(false));
      const before = await readFile(logPath, 'utf8');

      const { command, capture } = createHarness(root);
      await runCommand(
        command,
        sealArgs(
          `Completion sealed at 2026-07-17T12:00:00Z; project-log roll-up status: ok. ${sealKey}`,
        ),
      );

      expect(capture.jsonPayloads[0]).toMatchObject({
        status: 'already-appended',
        heading: SEAL_HEADING,
      });
      await expect(readFile(logPath, 'utf8')).resolves.toBe(before);
      expect(countSeals(before)).toBe(1);
      expect(process.exitCode).toBe(0);
    });

    it('refuses a judgment append onto a sealed log', async () => {
      const { root, logPath } = await createRepo();
      await seedLog(logPath, sealedLogEntries(true));
      const before = await readFile(logPath, 'utf8');

      const { command, capture } = createHarness(root);
      await runCommand(command, [
        '--type',
        'friction',
        '--scope',
        'project',
        '--area',
        'retirement sweep',
        '--body',
        'A finding dispositioned after the seal.',
      ]);

      expect(capture.jsonPayloads[0]).toMatchObject({
        status: 'sealed',
        heading: SEAL_HEADING,
      });
      expect(
        (capture.jsonPayloads[0] as { message: string }).message,
      ).toContain('No project-log append may follow the completion seal');
      await expect(readFile(logPath, 'utf8')).resolves.toBe(before);
      expect(process.exitCode).toBe(1);
    });

    it('refuses a general-scope promotion onto a sealed log', async () => {
      const { root, logPath } = await createRepo();
      await seedLog(logPath, sealedLogEntries(true));
      const before = await readFile(logPath, 'utf8');

      // The oat-project-summary ledger-graduation path.
      const { command, capture } = createHarness(root);
      await runCommand(command, [
        '--type',
        'friction',
        '--scope',
        'general',
        '--area',
        'ledger graduation',
        '--body',
        'Promoting an observation after the seal.',
      ]);

      expect(capture.jsonPayloads[0]).toMatchObject({ status: 'sealed' });
      await expect(readFile(logPath, 'utf8')).resolves.toBe(before);
      expect(process.exitCode).toBe(1);
    });

    it('refuses a foreign structural append onto a sealed log', async () => {
      const { root, logPath } = await createRepo();
      await seedLog(logPath, sealedLogEntries(true));
      const before = await readFile(logPath, 'utf8');

      const { command, capture } = createHarness(root);
      await runCommand(command, [
        '--structural',
        '--producer',
        'oat-project-summary',
        '--ref',
        'seal',
        '--body',
        'A foreign producer reusing the seal ref.',
      ]);

      expect(capture.jsonPayloads[0]).toMatchObject({ status: 'sealed' });
      await expect(readFile(logPath, 'utf8')).resolves.toBe(before);
      expect(process.exitCode).toBe(1);
    });

    it('throws a typed refusal from the library entry point', async () => {
      const { root, projectPath, logPath } = await createRepo();
      await seedLog(logPath, sealedLogEntries(true));

      await expect(
        appendProjectLog({
          repoRoot: root,
          project: projectPath,
          type: 'bug',
          scope: 'project',
          area: 'post-seal',
          body: 'Refused.',
        }),
      ).rejects.toBeInstanceOf(ProjectLogSealedError);
    });

    it('still reports already-appended for a keyed entry written before the seal', async () => {
      const { root, logPath } = await createRepo();
      await seedLog(logPath);

      // A gate partial-finalization receipt lands while the log is open.
      const gateKey = '7f1c2d34-0000-4000-8000-abcdefabcdef';
      const gateArgs = [
        '--structural',
        '--producer',
        'oat gate review',
        '--ref',
        'p02',
        '--body',
        `Gate finalized run=${gateKey}`,
        '--idempotency-key',
        gateKey,
      ];
      const gate = createHarness(root);
      await runCommand(gate.command, gateArgs);
      expect(gate.capture.jsonPayloads[0]).toMatchObject({
        status: 'appended',
      });

      // The project is then completed and the log sealed.
      const sealing = createHarness(root);
      await runCommand(
        sealing.command,
        sealArgs(`Completion sealed. ${sealKey}`),
      );
      const afterSeal = await readFile(logPath, 'utf8');

      // The gate's recovery command replays that same append later. It writes
      // nothing — the entry is already there, from before the seal — so it must
      // stay an idempotent no-op rather than becoming a terminal refusal.
      const replay = createHarness(root);
      await runCommand(replay.command, gateArgs);

      expect(replay.capture.jsonPayloads[0]).toMatchObject({
        status: 'already-appended',
        heading: '### 2026-07-17 · structural · oat gate review · p02',
      });
      await expect(readFile(logPath, 'utf8')).resolves.toBe(afterSeal);
      expect(process.exitCode).toBe(0);
    });

    it('reports already-appended for a keyed replay whose token matches a pre-seal entry', async () => {
      const { root, logPath } = await createRepo();
      await seedLog(logPath);

      // A pre-seal entry whose body carries the token this later append will
      // key on.
      const collidingKey = 'target=x';
      const gate = createHarness(root);
      await runCommand(gate.command, [
        '--structural',
        '--producer',
        'oat-gate',
        '--ref',
        'review',
        '--body',
        `Gate finalized ${collidingKey}`,
        '--idempotency-key',
        collidingKey,
      ]);
      expect(gate.capture.jsonPayloads[0]).toMatchObject({
        status: 'appended',
      });

      const sealing = createHarness(root);
      await runCommand(
        sealing.command,
        sealArgs(`Completion sealed. ${sealKey}`),
      );
      const afterSeal = await readFile(logPath, 'utf8');

      // This is the documented boundary of the key carve-out: recognition runs
      // before the sealed guard, so a keyed append whose token already occurs
      // in a pre-seal entry is reported `already-appended` rather than refused
      // — even though its body is different content. It is not a hole in the
      // seal invariant, because recognition writes nothing; the log must come
      // back byte-identical. Anything that makes this case *append* has broken
      // the seal, and anything that makes it *refuse* has broken the gate's
      // recovery replay.
      const replay = createHarness(root);
      await runCommand(replay.command, [
        '--type',
        'friction',
        '--scope',
        'project',
        '--area',
        'post seal',
        '--body',
        `Post-seal finding that must not be written: ${collidingKey}`,
        '--idempotency-key',
        collidingKey,
      ]);

      expect(replay.capture.jsonPayloads[0]).toMatchObject({
        status: 'already-appended',
        heading: '### 2026-07-17 · structural · oat-gate · review',
      });
      await expect(readFile(logPath, 'utf8')).resolves.toBe(afterSeal);
      expect(process.exitCode).toBe(0);
    });

    it('leaves an unsealed log fully appendable', async () => {
      const { root, logPath } = await createRepo();
      // Seal identity is producer AND ref: neither of these entries seals.
      await seedLog(
        logPath,
        [
          '',
          '### 2026-07-16 · structural · oat-project-summary · seal',
          '',
          'A foreign producer using the seal ref.',
          '',
          '### 2026-07-16 · structural · oat-project-complete · retirement-sweep',
          '',
          'The seal producer using another ref.',
          '',
        ].join('\n'),
      );

      const { command, capture } = createHarness(root);
      await runCommand(command, [
        '--type',
        'friction',
        '--scope',
        'project',
        '--area',
        'still open',
        '--body',
        'An ordinary append onto an unsealed log.',
      ]);

      expect(capture.jsonPayloads[0]).toMatchObject({ status: 'appended' });
      expect(process.exitCode).toBe(0);
    });

    it('writes the seal when an earlier entry merely mentions the seal token', async () => {
      const { root, logPath } = await createRepo();
      await seedLog(logPath);

      // A retro or friction entry that discusses seal behavior. Nothing about
      // it is a seal, but its prose carries the exact token the seal keys on.
      const mention = createHarness(root);
      await runCommand(mention.command, [
        '--type',
        'feedback',
        '--scope',
        'general',
        '--area',
        'notes',
        '--body',
        `We will finalize with key ${sealKey} later.`,
      ]);
      expect(mention.capture.jsonPayloads[0]).toMatchObject({
        status: 'appended',
      });

      // The completion flow's verbatim seal command. Before the seal routed on
      // structure, the generic keyed short-circuit matched that feedback entry
      // and returned `already-appended` naming it: no seal was written, the log
      // stayed open, and the completing agent saw success.
      const sealing = createHarness(root);
      await runCommand(
        sealing.command,
        sealArgs(
          `Completion sealed at 2026-07-17T10:00:00Z; project-log roll-up status: ok. ${sealKey}`,
        ),
      );

      expect(sealing.capture.jsonPayloads[0]).toMatchObject({
        status: 'appended',
        heading: SEAL_HEADING,
      });
      const sealed = await readFile(logPath, 'utf8');
      expect(countSeals(sealed)).toBe(1);
      expect(process.exitCode).toBe(0);

      // The seal is real, so the log is now closed.
      const after = createHarness(root);
      await runCommand(after.command, [
        '--type',
        'bug',
        '--scope',
        'general',
        '--area',
        'post seal',
        '--body',
        'Brand new content after the seal.',
      ]);
      expect(after.capture.jsonPayloads[0]).toMatchObject({
        status: 'sealed',
        heading: SEAL_HEADING,
      });
      await expect(readFile(logPath, 'utf8')).resolves.toBe(sealed);
      expect(process.exitCode).toBe(1);
    });

    it('reports a seal heading for a replayed seal even when a token collides', async () => {
      const { root, logPath } = await createRepo();
      await seedLog(logPath);

      const mention = createHarness(root);
      await runCommand(mention.command, [
        '--type',
        'feedback',
        '--scope',
        'general',
        '--area',
        'notes',
        '--body',
        `Discussing ${sealKey} before completion.`,
      ]);

      const sealing = createHarness(root);
      await runCommand(
        sealing.command,
        sealArgs(`Completion sealed at 2026-07-17T10:00:00Z. ${sealKey}`),
      );
      const afterSeal = await readFile(logPath, 'utf8');

      // A resumed completion replays the seal. The colliding token is still in
      // the log, so this is exactly the input that used to answer with a
      // judgment heading; an `already-appended` seal must always name a seal.
      const replay = createHarness(root);
      await runCommand(
        replay.command,
        sealArgs(`Completion sealed at 2026-07-17T11:30:00Z. ${sealKey}`),
      );

      expect(replay.capture.jsonPayloads[0]).toMatchObject({
        status: 'already-appended',
        heading: SEAL_HEADING,
        created: false,
      });
      await expect(readFile(logPath, 'utf8')).resolves.toBe(afterSeal);
      expect(countSeals(afterSeal)).toBe(1);
      expect(process.exitCode).toBe(0);
    });
  });

  describe('line-terminator injection', () => {
    const SEAL_HEADING =
      '### 2026-07-17 · structural · oat-project-complete · seal';

    // Exactly the ECMAScript LineTerminator set apart from LF: every character
    // a multiline `^` anchors after, and therefore every character that could
    // turn body text into a `## ` section boundary the validator did not see.
    // A lone carriage return: CRLF is a legitimate line break and is accepted
    // and normalized, so only an unpaired CR belongs in this table.
    const terminators: readonly [string, string][] = [
      ['lone carriage return', '\r'],
      ['U+2028 line separator', '\u2028'],
      ['U+2029 paragraph separator', '\u2029'],
    ];

    it.each(terminators)(
      'rejects a %s that would forge a section marker in a judgment body',
      async (_name, terminator) => {
        const { root, logPath } = await createRepo();
        await seedLog(logPath);
        const before = await readFile(logPath, 'utf8');
        const { command, capture } = createHarness(root);

        await runCommand(command, [
          '--type',
          'feedback',
          '--scope',
          'general',
          '--area',
          'notes',
          '--body',
          `carrier${terminator}## Injected`,
        ]);

        expect(capture.jsonPayloads[0]).toMatchObject({
          status: 'error',
          message: expect.stringContaining('a lone carriage return'),
        });
        await expect(readFile(logPath, 'utf8')).resolves.toBe(before);
        expect(process.exitCode).toBe(1);
      },
    );

    it.each(terminators)(
      'rejects a %s in a structural body',
      async (_name, terminator) => {
        const { root, logPath } = await createRepo();
        await seedLog(logPath);
        const before = await readFile(logPath, 'utf8');
        const { command, capture } = createHarness(root);

        await runCommand(command, [
          '--structural',
          '--producer',
          'oat gate review',
          '--ref',
          'p02',
          '--body',
          `carrier${terminator}## Injected`,
        ]);

        expect(capture.jsonPayloads[0]).toMatchObject({
          status: 'error',
          message: expect.stringContaining('must be one line'),
        });
        await expect(readFile(logPath, 'utf8')).resolves.toBe(before);
        expect(process.exitCode).toBe(1);
      },
    );

    it.each(terminators)(
      'keeps the seal enforceable when a %s injection is attempted first',
      async (_name, terminator) => {
        const { root, logPath } = await createRepo();
        await seedLog(logPath);

        const injection = createHarness(root);
        await runCommand(injection.command, [
          '--type',
          'feedback',
          '--scope',
          'general',
          '--area',
          'notes',
          '--body',
          `carrier${terminator}## Injected`,
        ]);
        expect(injection.capture.jsonPayloads[0]).toMatchObject({
          status: 'error',
        });

        const sealing = createHarness(root);
        await runCommand(sealing.command, [
          '--structural',
          '--producer',
          'oat-project-complete',
          '--ref',
          'seal',
          '--body',
          'Completion sealed. oat-seal:demo',
          '--idempotency-key',
          'oat-seal:demo',
        ]);
        expect(sealing.capture.jsonPayloads[0]).toMatchObject({
          status: 'appended',
          heading: SEAL_HEADING,
        });
        const sealed = await readFile(logPath, 'utf8');

        // The invariant the injection defeated: a written seal must actually
        // close the log to new content.
        const after = createHarness(root);
        await runCommand(after.command, [
          '--type',
          'bug',
          '--scope',
          'general',
          '--area',
          'post seal',
          '--body',
          'Brand new content after the seal.',
        ]);
        expect(after.capture.jsonPayloads[0]).toMatchObject({
          status: 'sealed',
          heading: SEAL_HEADING,
        });
        await expect(readFile(logPath, 'utf8')).resolves.toBe(sealed);
        expect(process.exitCode).toBe(1);
      },
    );

    it('accepts a CRLF body and stores it with line feeds', async () => {
      const { root, logPath } = await createRepo();
      await seedLog(logPath);
      const { command, capture } = createHarness(root);

      // CRLF was accepted before this guard existed and must stay accepted: it
      // arrives from a file, tool output, or a pasted buffer through `--body -`.
      // It is stored as LF, and the result says so rather than normalizing
      // silently, because the bytes on disk then differ from the bytes passed.
      await runCommand(command, [
        '--type',
        'feedback',
        '--scope',
        'general',
        '--area',
        'notes',
        '--body',
        'line one\r\nline two',
      ]);

      expect(capture.jsonPayloads[0]).toMatchObject({
        status: 'appended',
        normalizedLineEndings: true,
      });
      expect(process.exitCode).toBe(0);
      const content = await readFile(logPath, 'utf8');
      expect(content).toContain('line one\nline two');
      expect(content).not.toContain('\r');
    });

    it.each([
      ['a lone carriage return followed by CRLF', 'a\r\r\nb'],
      ['CRLF followed by a lone carriage return', 'a\r\n\rb'],
    ])(
      'refuses %s rather than laundering it into CRLF',
      async (_name, body) => {
        const { root, logPath } = await createRepo();
        await seedLog(logPath);
        const before = await readFile(logPath, 'utf8');
        const { command, capture } = createHarness(root);

        // `\r\r\n` is the shape that decides the validate/normalize ordering:
        // one `replaceAll('\r\n', '\n')` pass turns it into `\r\n`, which
        // satisfies the lone-terminator rule while leaving a carriage return in
        // the bytes. Validating the supplied text first is what closes it.
        await runCommand(command, [
          '--type',
          'feedback',
          '--scope',
          'general',
          '--area',
          'notes',
          '--body',
          body,
        ]);

        expect(capture.jsonPayloads[0]).toMatchObject({
          status: 'error',
          message: expect.stringContaining('a lone carriage return'),
        });
        expect(process.exitCode).toBe(1);
        await expect(readFile(logPath, 'utf8')).resolves.toBe(before);
      },
    );

    it.each([
      ['a trailing lone carriage return', 'ab\r'],
      ['a leading lone carriage return', '\rabc'],
      ['a trailing U+2028', 'ab\u2028'],
    ])('refuses %s that trimming would otherwise hide', async (_name, body) => {
      const { root, logPath } = await createRepo();
      await seedLog(logPath);
      const before = await readFile(logPath, 'utf8');
      const { command, capture } = createHarness(root);

      // `String.prototype.trim` strips CR, LF, U+2028 and U+2029 as whitespace,
      // so a body terminated only at its edge never reached the rule and
      // appended with the terminator silently removed — while the error text
      // said such a body is refused. Testing the raw body makes the message
      // true. This narrows what is accepted, which is the safe direction.
      await runCommand(command, [
        '--type',
        'feedback',
        '--scope',
        'general',
        '--area',
        'notes',
        '--body',
        body,
      ]);

      expect(capture.jsonPayloads[0]).toMatchObject({
        status: 'error',
        message: expect.stringContaining('a lone carriage return'),
      });
      expect(process.exitCode).toBe(1);
      await expect(readFile(logPath, 'utf8')).resolves.toBe(before);
    });

    it.each([
      ['a trailing line feed, as stdin supplies', 'line one\nline two\n'],
      ['a trailing CRLF', 'line one\r\nline two\r\n'],
      ['trailing spaces', 'line one  '],
    ])('still accepts a body with %s', async (_name, body) => {
      const { root } = await createRepo();
      const { command, capture } = createHarness(root);

      await runCommand(command, [
        '--type',
        'feedback',
        '--scope',
        'general',
        '--area',
        'notes',
        '--body',
        body,
      ]);

      expect(capture.jsonPayloads[0]).toMatchObject({ status: 'appended' });
      expect(process.exitCode).toBe(0);
    });

    it('leaves no carriage return in the log for any accepted body', async () => {
      const { root, logPath } = await createRepo();
      await seedLog(logPath);

      for (const body of [
        'plain',
        'line one\nline two',
        'line one\r\nline two',
        'a\r\nb\r\nc',
      ]) {
        const { command, capture } = createHarness(root);
        await runCommand(command, [
          '--type',
          'feedback',
          '--scope',
          'general',
          '--area',
          'notes',
          '--body',
          body,
        ]);
        expect(capture.jsonPayloads[0]).toMatchObject({ status: 'appended' });
      }

      // The postcondition the whole "write strictly" half rests on: whatever a
      // caller passes, the file this command produces has one line terminator.
      const content = await readFile(logPath, 'utf8');
      expect(content).not.toContain('\r');
      expect(content).not.toContain('\u2028');
      expect(content).not.toContain('\u2029');
    });

    it('reports no normalization for an ordinary line-feed body', async () => {
      const { root } = await createRepo();
      const { command, capture } = createHarness(root);

      await runCommand(command, [
        '--type',
        'feedback',
        '--scope',
        'general',
        '--area',
        'notes',
        '--body',
        'line one\nline two',
      ]);

      expect(capture.jsonPayloads[0]).toMatchObject({ status: 'appended' });
      expect(capture.jsonPayloads[0]).not.toHaveProperty(
        'normalizedLineEndings',
      );
    });

    it('still accepts an ordinary multi-line judgment body', async () => {
      const { root, logPath } = await createRepo();
      await seedLog(logPath);
      const { command, capture } = createHarness(root);

      await runCommand(command, [
        '--type',
        'feedback',
        '--scope',
        'general',
        '--area',
        'notes',
        '--body',
        'Observation: the gate improved.\nImpact: fewer retries.',
      ]);

      expect(capture.jsonPayloads[0]).toMatchObject({ status: 'appended' });
      await expect(readFile(logPath, 'utf8')).resolves.toContain(
        'Observation: the gate improved.\nImpact: fewer retries.',
      );
      expect(process.exitCode).toBe(0);
    });

    it('still rejects a marker that follows a real line feed', async () => {
      const { root, logPath } = await createRepo();
      await seedLog(logPath);
      const { command, capture } = createHarness(root);

      await runCommand(command, [
        '--type',
        'feedback',
        '--scope',
        'general',
        '--area',
        'notes',
        '--body',
        'carrier\n## Injected',
      ]);

      expect(capture.jsonPayloads[0]).toMatchObject({
        status: 'error',
        message: expect.stringContaining('command-owned level-two'),
      });
      expect(process.exitCode).toBe(1);
    });

    it.each([
      ['carriage return', '\r'],
      ['U+2028 line separator', '\u2028'],
      ['U+2029 paragraph separator', '\u2029'],
    ])(
      'refuses a log whose `## Entries` follows a %s instead of appending past its seal',
      async (_name, terminator) => {
        const { root, logPath } = await createRepo();
        // A hand-written log that an `^…$/m` reader parses and an LF-only
        // reader does not. Tightening the parser must not turn it into an
        // unsealed log: under the pre-refusal patch this reported no seal and
        // wrote a second one.
        await writeFile(
          logPath,
          `preamble${terminator}## Entries\n\n${SEAL_HEADING}\n\nCompletion sealed at 2026-07-17T10:00:00Z.\n`,
          'utf8',
        );
        const before = await readFile(logPath, 'utf8');
        const { command, capture } = createHarness(root);

        await runCommand(command, [
          '--structural',
          '--producer',
          'oat-project-complete',
          '--ref',
          'seal',
          '--body',
          'Completion sealed at 2026-07-17T11:00:00Z. oat-seal:demo',
          '--idempotency-key',
          'oat-seal:demo',
        ]);

        expect(capture.jsonPayloads[0]).toMatchObject({
          status: 'error',
          message: expect.stringContaining('rather than a line feed'),
        });
        expect(process.exitCode).toBe(1);
        await expect(readFile(logPath, 'utf8')).resolves.toBe(before);
        expect(before.split(SEAL_HEADING).length - 1).toBe(1);
      },
    );

    it.each([
      ['--area', ['--type', 'bug', '--scope', 'project', '--area']],
      ['--producer', ['--structural', '--ref', 'p02', '--producer']],
      ['--ref', ['--structural', '--producer', 'oat gate review', '--ref']],
    ])('rejects a U+2028 inside %s', async (option, leading) => {
      const { root, logPath } = await createRepo();
      await seedLog(logPath);
      const before = await readFile(logPath, 'utf8');
      const { command, capture } = createHarness(root);

      // A separator here used to be written straight into the heading, where
      // `isProjectLogEntryMarker` — whose `.` does not match a separator — could
      // no longer see the entry at all, while an `^…$/m` reader still could.
      await runCommand(command, [
        ...leading,
        'no\u2028tes',
        '--body',
        'An ordinary body.',
      ]);

      expect(capture.jsonPayloads[0]).toMatchObject({
        status: 'error',
        message: expect.stringContaining(
          `${option} must be a single line without newline characters.`,
        ),
      });
      expect(process.exitCode).toBe(1);
      await expect(readFile(logPath, 'utf8')).resolves.toBe(before);
    });
  });

  describe('seal replay against an unparseable log', () => {
    const SEAL_HEADING =
      '### 2026-07-17 · structural · oat-project-complete · seal';
    const sealKey = 'oat-seal:demo';

    function sealArgs(body: string): string[] {
      return [
        '--structural',
        '--producer',
        'oat-project-complete',
        '--ref',
        'seal',
        '--body',
        body,
        '--idempotency-key',
        sealKey,
      ];
    }

    it('refuses rather than stack a second seal it cannot reach', async () => {
      const { root, logPath } = await createRepo();
      // No `## Entries` section, so `parseProjectLogEntries` reaches nothing and
      // the structural seal probe reports null — yet a real seal heading is
      // plainly there. Writing a second one is the outcome that must never
      // happen, and reporting the log sealed would contradict `check`, so the
      // append fails closed. The decoy ahead of the seal is what defeats any
      // first-match-wins keyed scan, which is why recognition is structural.
      await writeFile(
        logPath,
        [
          '# Project Log: demo',
          '',
          '### 2026-07-17 · general · feedback · notes',
          '',
          `Discussing ${sealKey} in ordinary prose.`,
          '',
          SEAL_HEADING,
          '',
          `Completion sealed at 2026-07-17T10:00:00Z. ${sealKey}`,
          '',
        ].join('\n'),
        'utf8',
      );
      const before = await readFile(logPath, 'utf8');
      const { command, capture } = createHarness(root);

      await runCommand(command, [
        '--structural',
        '--producer',
        'oat-project-complete',
        '--ref',
        'seal',
        '--body',
        `Completion sealed at 2026-07-17T11:00:00Z. ${sealKey}`,
        '--idempotency-key',
        sealKey,
      ]);

      // Refusing is not weaker than the reading it replaces: the pre-fix code
      // answered this log `already-appended` and wrote nothing. Both leave the
      // file untouched with exactly one seal; this one says so out loud.
      expect(capture.jsonPayloads[0]).toMatchObject({
        status: 'error',
        message: expect.stringContaining('cannot reach'),
      });
      expect(process.exitCode).toBe(1);
      await expect(readFile(logPath, 'utf8')).resolves.toBe(before);
      expect(before.split(SEAL_HEADING).length - 1).toBe(1);
    });

    it('recognizes an existing seal on a CRLF log instead of deadlocking', async () => {
      const { root, logPath } = await createRepo();
      const crlf = [
        '# Project Log: demo',
        '',
        '## Entries',
        '',
        '### 2026-07-17 · project · bug · gate exit',
        '',
        'The gate returned the wrong exit code.',
        '',
        SEAL_HEADING,
        '',
        'Completion sealed at 2026-07-17T10:00:00Z. oat-seal:demo',
        '',
      ].join('\r\n');
      await writeFile(logPath, crlf, 'utf8');
      const before = await readFile(logPath, 'utf8');

      // The seal is physically present and correctly placed; only the line
      // terminators hid it. Reporting it unreachable made the completion seal
      // hard-fail with a remedy that did not apply, while ordinary content
      // still appended past that same seal.
      const sealing = createHarness(root);
      await runCommand(
        sealing.command,
        sealArgs(`Completion sealed at 2026-07-17T11:00:00Z. ${sealKey}`),
      );
      expect(sealing.capture.jsonPayloads[0]).toMatchObject({
        status: 'already-appended',
        heading: SEAL_HEADING,
      });
      expect(process.exitCode).toBe(0);

      const ordinary = createHarness(root);
      await runCommand(ordinary.command, [
        '--type',
        'bug',
        '--scope',
        'general',
        '--area',
        'post seal',
        '--body',
        'Content that must not land past the seal.',
      ]);
      expect(ordinary.capture.jsonPayloads[0]).toMatchObject({
        status: 'sealed',
        heading: SEAL_HEADING,
      });
      expect(process.exitCode).toBe(1);
      await expect(readFile(logPath, 'utf8')).resolves.toBe(before);
    });

    it('names the line terminators, not the section, when a seal is correctly placed but unreachable', async () => {
      const { root, logPath } = await createRepo();
      // The seal sits under `## Entries`; only a lone carriage return inside its
      // own line hides it from the parser. Deliberately not an ambiguous-marker
      // fixture: that guard fires first and its message also mentions line
      // feeds, so such a fixture would pass even with this branch broken.
      await writeFile(
        logPath,
        `# Project Log: demo\n\n## Entries\n\n${SEAL_HEADING}\rtrailing text\n\nCompletion sealed. oat-seal:demo\n`,
        'utf8',
      );
      const { command, capture } = createHarness(root);

      await runCommand(command, sealArgs(`Completion sealed. ${sealKey}`));

      const payload = capture.jsonPayloads[0] as { message: string };
      expect(capture.jsonPayloads[0]).toMatchObject({ status: 'error' });
      expect(payload.message).toContain(
        'the obstruction is its line terminators',
      );
      expect(payload.message).not.toContain('move it under that heading');
      expect(process.exitCode).toBe(1);
    });

    it('blames the section when prose inside Entries merely quotes a seal heading', async () => {
      const { root, logPath } = await createRepo();
      // The entries region contains the seal heading's text inside prose, while
      // the real seal sits under a later section. A substring test would call
      // this correctly placed and send the operator to rewrite line terminators
      // that were never the obstruction.
      await writeFile(
        logPath,
        [
          '# Project Log: demo',
          '',
          '## Entries',
          '',
          `Prose quoting ${SEAL_HEADING} inside a sentence.`,
          '',
          '## Notes',
          '',
          SEAL_HEADING,
          '',
          'Completion sealed. oat-seal:demo',
          '',
        ].join('\n'),
        'utf8',
      );
      const { command, capture } = createHarness(root);

      await runCommand(command, sealArgs(`Completion sealed. ${sealKey}`));

      const payload = capture.jsonPayloads[0] as { message: string };
      expect(payload.message).toContain('move it under that heading');
      expect(payload.message).not.toContain(
        'the obstruction is its line terminators',
      );
      expect(process.exitCode).toBe(1);
    });

    it('refuses ordinary content on the same file the seal path refuses', async () => {
      const { root, logPath } = await createRepo();
      // No `## Entries` at all, so the seal is unreachable. Refusing the seal
      // while still accepting ordinary content is the two writers disagreeing
      // about one file, which is what let content land past a seal.
      await writeFile(
        logPath,
        `# Project Log: demo\n\n${SEAL_HEADING}\n\nCompletion sealed. oat-seal:demo\n`,
        'utf8',
      );
      const before = await readFile(logPath, 'utf8');

      const sealing = createHarness(root);
      await runCommand(
        sealing.command,
        sealArgs(`Completion sealed. ${sealKey}`),
      );
      expect(sealing.capture.jsonPayloads[0]).toMatchObject({
        status: 'error',
        message: expect.stringContaining('cannot reach it'),
      });

      const ordinary = createHarness(root);
      await runCommand(ordinary.command, [
        '--type',
        'bug',
        '--scope',
        'general',
        '--area',
        'post seal',
        '--body',
        'Content that must not land past the seal.',
      ]);
      expect(ordinary.capture.jsonPayloads[0]).toMatchObject({
        status: 'error',
        message: expect.stringContaining('cannot reach it'),
      });
      expect(process.exitCode).toBe(1);
      await expect(readFile(logPath, 'utf8')).resolves.toBe(before);
    });

    it('never creates a log it would then refuse to append to', async () => {
      // The project directory's basename is interpolated into the template's
      // title line, so this name would produce `# Project Log: demo<U+2028>##
      // Notes` — a file with two readings that the very next append refuses.
      // A mutator must never write content it would decline to read, so the
      // refusal happens at creation instead of stranding the project.
      const { root, projectPath, logPath } =
        await createRepo('demo\u2028## Notes');
      const { command, capture } = createHarness(root);

      await runCommand(command, judgmentArgs);

      expect(capture.jsonPayloads[0]).toMatchObject({
        status: 'error',
        message: expect.stringContaining('line feeds only'),
      });
      expect(process.exitCode).toBe(1);
      await expect(readFile(logPath, 'utf8')).rejects.toThrow();
      expect(projectPath).toContain('Notes');
    });
  });

  describe('idempotency key', () => {
    const key = '7f1c2d34-0000-4000-8000-abcdefabcdef';

    it('returns already-appended for a matching idempotency key', async () => {
      const { root, logPath } = await createRepo();
      await seedLog(logPath);
      const first = createHarness(root);
      await runCommand(first.command, [
        ...structuralArgs(key),
        '--idempotency-key',
        key,
      ]);
      const afterFirst = await readFile(logPath, 'utf8');

      const second = createHarness(root);
      await runCommand(second.command, [
        ...structuralArgs(key),
        '--idempotency-key',
        key,
      ]);

      expect(second.capture.jsonPayloads[0]).toMatchObject({
        status: 'already-appended',
        heading: '### 2026-07-17 · structural · oat gate review · p02',
      });
      await expect(readFile(logPath, 'utf8')).resolves.toBe(afterFirst);
      expect(countHeadings(afterFirst, key)).toBe(1);
      expect(process.exitCode).toBe(0);
    });

    it('does not confuse a key with an entry that only shares its prefix', async () => {
      const { root, logPath } = await createRepo();
      await seedLog(logPath);
      const longer = `${key}-second`;
      const first = createHarness(root);
      await runCommand(first.command, [
        ...structuralArgs(longer),
        '--idempotency-key',
        longer,
      ]);

      const second = createHarness(root);
      await runCommand(second.command, [
        ...structuralArgs(key),
        '--idempotency-key',
        key,
      ]);

      expect(second.capture.jsonPayloads[0]).toMatchObject({
        status: 'appended',
      });
      const content = await readFile(logPath, 'utf8');
      expect(countHeadings(content, longer)).toBe(1);
      expect(countHeadings(content, key)).toBe(1);
      expect(content).toContain(`run=${longer}`);
      expect(content.split(/\s+/)).toContain(`run=${key}`);
    });

    it('does not treat a punctuated suffix as a prior append', async () => {
      const { root, logPath } = await createRepo();
      await seedLog(logPath);
      const first = createHarness(root);
      await runCommand(first.command, [
        ...structuralArgs(key, `gate finalization run=${key}.partial`),
        '--idempotency-key',
        key,
      ]);

      const second = createHarness(root);
      await runCommand(second.command, [
        ...structuralArgs(key),
        '--idempotency-key',
        key,
      ]);

      expect(second.capture.jsonPayloads[0]).toMatchObject({
        status: 'appended',
      });
      const content = await readFile(logPath, 'utf8');
      expect(content).toContain(`run=${key}.partial`);
      expect(countHeadings(content, key)).toBe(1);
    });

    it('rejects an idempotency key the body does not carry', async () => {
      const { root, logPath } = await createRepo();
      await seedLog(logPath);
      const { command, capture } = createHarness(root);

      await runCommand(command, [
        ...structuralArgs(key, 'gate finalization without the key'),
        '--idempotency-key',
        key,
      ]);

      expect(capture.jsonPayloads[0]).toMatchObject({
        status: 'error',
        message: expect.stringContaining('must appear in --body'),
      });
      expect(process.exitCode).toBe(1);
      await expect(readFile(logPath, 'utf8')).resolves.not.toContain(key);
    });
  });

  describe('commit and index-lock retry', () => {
    const key = '5c9d1e20-1111-4000-8000-0123456789ab';

    it('commits the appended entry with --commit', async () => {
      const { root, projectPath, logPath } = await createRepo();
      await seedLog(logPath);
      const git = initGitRepo(root);
      const baseline = git(['rev-parse', 'HEAD']);
      const { command, capture } = createHarness(root);

      await runCommand(command, [
        ...structuralArgs(key),
        '--idempotency-key',
        key,
        '--commit',
      ]);

      expect(capture.jsonPayloads[0]).toMatchObject({
        status: 'appended',
        commit: { outcome: 'committed', committed: true, attempts: 1 },
      });
      expect(git(['rev-parse', 'HEAD'])).not.toBe(baseline);
      expect(git(['status', '--porcelain', '--', logPath])).toBe('');
      expect(git(['show', '--name-only', '--format=', 'HEAD'])).toBe(
        `${join('.oat', 'projects', 'shared', 'demo')}/project-log.md`,
      );
      expect(projectPath).toContain('demo');
      expect(process.exitCode).toBe(0);
    });

    it('retries and commits after a transient index lock clears', async () => {
      const { root, logPath } = await createRepo();
      await seedLog(logPath, '\n### seed\n\nseed entry\n');
      const git = initGitRepo(root);
      const baseline = git(['rev-parse', 'HEAD']);
      const lockPath = join(root, '.git', 'index.lock');
      await writeFile(lockPath, '', 'utf8');
      await writeFile(
        logPath,
        `${await readFile(logPath, 'utf8')}\nedit\n`,
        'utf8',
      );
      const sleep = vi.fn(async () => {
        await rm(lockPath, { force: true });
      });

      const result = await commitProjectLog(
        { repoRoot: root, logPath, message: 'chore(oat): retry probe' },
        { sleep },
      );

      expect(result).toMatchObject({
        outcome: 'committed',
        committed: true,
        attempts: 2,
      });
      expect(sleep).toHaveBeenCalledTimes(1);
      expect(sleep).toHaveBeenCalledWith(250);
      expect(git(['rev-parse', 'HEAD'])).not.toBe(baseline);
    });

    it('classifies a held index lock as persistent after exhausting retries and never deletes it', async () => {
      const { root, logPath } = await createRepo();
      await seedLog(logPath, '\n### seed\n\nseed entry\n');
      const git = initGitRepo(root);
      const baseline = git(['rev-parse', 'HEAD']);
      const lockPath = join(root, '.git', 'index.lock');
      await writeFile(lockPath, '', 'utf8');
      await writeFile(
        logPath,
        `${await readFile(logPath, 'utf8')}\nedit\n`,
        'utf8',
      );
      const sleep = vi.fn(async () => {});

      const result = await commitProjectLog(
        { repoRoot: root, logPath, message: 'chore(oat): persistent probe' },
        { sleep },
      );

      expect(result).toMatchObject({
        outcome: 'blocked-by-index-lock',
        committed: false,
        lockClass: 'persistent-index-lock',
        attempts: PROJECT_LOG_COMMIT_ATTEMPTS,
      });
      expect(result.attempts).toBe(3);
      // Three attempts means exactly two waits.
      expect(sleep).toHaveBeenCalledTimes(2);
      expect(sleep.mock.calls.map(([ms]) => ms)).toEqual([250, 500]);
      // The lock belongs to whoever took it; the retry never clears it.
      await expect(readFile(lockPath, 'utf8')).resolves.toBe('');
      expect(git(['rev-parse', 'HEAD'])).toBe(baseline);
      expect(git(['diff', '--cached', '--name-only'])).toBe('');
    });

    it('classifies a churning index lock as transient after exhausting retries', async () => {
      const { root, logPath } = await createRepo();
      await seedLog(logPath, '\n### seed\n\nseed entry\n');
      initGitRepo(root);
      const lockPath = join(root, '.git', 'index.lock');
      await writeFile(lockPath, '', 'utf8');
      await writeFile(
        logPath,
        `${await readFile(logPath, 'utf8')}\nedit\n`,
        'utf8',
      );
      let held = 0;
      const sleep = vi.fn(async () => {
        // A different holder each time: the lock never clears for us, but its
        // mtime moves, so the window is contention rather than a stuck lock.
        held += 1;
        await rm(lockPath, { force: true });
        await writeFile(lockPath, `holder-${held}`, 'utf8');
      });

      const result = await commitProjectLog(
        { repoRoot: root, logPath, message: 'chore(oat): churn probe' },
        { sleep },
      );

      expect(result).toMatchObject({
        outcome: 'blocked-by-index-lock',
        lockClass: 'transient-index-lock',
        attempts: 3,
      });
    });

    it('never retries a real commit failure', async () => {
      const { root, logPath } = await createRepo();
      await seedLog(logPath, '\n### seed\n\nseed entry\n');
      initGitRepo(root);
      await writeFile(
        join(root, '.git', 'hooks', 'pre-commit'),
        '#!/bin/sh\nexit 1\n',
        { encoding: 'utf8', mode: 0o755 },
      );
      await writeFile(
        logPath,
        `${await readFile(logPath, 'utf8')}\nedit\n`,
        'utf8',
      );
      const sleep = vi.fn(async () => {});

      const result = await commitProjectLog(
        { repoRoot: root, logPath, message: 'chore(oat): hook probe' },
        { sleep },
      );

      expect(result).toMatchObject({
        outcome: 'failed',
        committed: false,
        lockClass: 'other',
        attempts: 1,
      });
      expect(sleep).not.toHaveBeenCalled();
    });

    it('never retries a real failure whose output merely mentions index.lock', async () => {
      const { root, logPath } = await createRepo();
      await seedLog(logPath, '\n### seed\n\nseed entry\n');
      initGitRepo(root);
      await writeFile(
        join(root, '.git', 'hooks', 'pre-commit'),
        '#!/bin/sh\necho "policy: never delete .git/index.lock" >&2\nexit 1\n',
        { encoding: 'utf8', mode: 0o755 },
      );
      await writeFile(
        logPath,
        `${await readFile(logPath, 'utf8')}\nedit\n`,
        'utf8',
      );
      const sleep = vi.fn(async () => {});

      const result = await commitProjectLog(
        { repoRoot: root, logPath, message: 'chore(oat): lock-word probe' },
        { sleep },
      );

      expect(result).toMatchObject({
        outcome: 'failed',
        lockClass: 'other',
        attempts: 1,
      });
      expect(result.error).toContain('index.lock');
      expect(sleep).not.toHaveBeenCalled();
    });

    it("never retries a hook failure that echoes git's contention advice", async () => {
      const { root, logPath } = await createRepo();
      await seedLog(logPath, '\n### seed\n\nseed entry\n');
      initGitRepo(root);
      await writeFile(
        join(root, '.git', 'hooks', 'pre-commit'),
        '#!/bin/sh\necho "Another git process seems to be running in this repository" >&2\nexit 1\n',
        { encoding: 'utf8', mode: 0o755 },
      );
      await writeFile(
        logPath,
        `${await readFile(logPath, 'utf8')}\nedit\n`,
        'utf8',
      );
      const sleep = vi.fn(async () => {});

      const result = await commitProjectLog(
        { repoRoot: root, logPath, message: 'chore(oat): advice probe' },
        { sleep },
      );

      // Git never emits that advice without also naming the lock it could not
      // create, so the advice alone is not contention evidence.
      expect(result).toMatchObject({
        outcome: 'failed',
        lockClass: 'other',
        attempts: 1,
      });
      expect(sleep).not.toHaveBeenCalled();
    });

    it('refuses to call a clean log settled when it no longer carries the entry', async () => {
      const { root, logPath } = await createRepo();
      const identity = 'facade00-5555-4000-8000-0123456789ab';
      await seedLog(
        logPath,
        '\n### 2026-07-17 · structural · other · p01\n\nstatus=ok run=unrelated\n',
      );
      const git = initGitRepo(root);
      const baseline = git(['rev-parse', 'HEAD']);
      const sleep = vi.fn(async () => {});

      const result = await commitProjectLog(
        {
          repoRoot: root,
          logPath,
          message: 'chore(oat): clean-loss probe',
          identity: { key: identity, body: `status=ok run=${identity}` },
        },
        { sleep },
      );

      expect(result).toMatchObject({
        outcome: 'entry-missing-after-commit',
        attempts: 0,
      });
      expect(result.error).toContain(identity);
      expect(git(['rev-parse', 'HEAD'])).toBe(baseline);
    });

    it('does not accept a punctuated variant as the committed entry', async () => {
      const { root, logPath } = await createRepo();
      const identity = 'b0b0b0b0-6666-4000-8000-0123456789ab';
      await seedLog(
        logPath,
        `\n### 2026-07-17 · structural · oat gate review · p02\n\nstatus=ok run=${identity}.partial\n`,
      );
      const git = initGitRepo(root);
      const sleep = vi.fn(async () => {});

      const result = await commitProjectLog(
        {
          repoRoot: root,
          logPath,
          message: 'chore(oat): variant probe',
          identity: { key: identity, body: `status=ok run=${identity}` },
        },
        { sleep },
      );

      expect(result).toMatchObject({
        outcome: 'entry-missing-after-commit',
        attempts: 0,
      });
      expect(git(['status', '--porcelain', '--', logPath])).toBe('');
    });

    it('accepts a hook that reproduces both the advice and a lock mention as contention', async () => {
      const { root, logPath } = await createRepo();
      await seedLog(logPath, '\n### seed\n\nseed entry\n');
      initGitRepo(root);
      await writeFile(
        join(root, '.git', 'hooks', 'pre-commit'),
        '#!/bin/sh\necho "Another git process seems to be running in this repository, see .git/index.lock" >&2\nexit 1\n',
        { encoding: 'utf8', mode: 0o755 },
      );
      await writeFile(
        logPath,
        `${await readFile(logPath, 'utf8')}\nedit\n`,
        'utf8',
      );
      const git = (args: string[]): string =>
        execFileSync('git', args, {
          cwd: root,
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'pipe'],
        }).trim();
      const sleep = vi.fn(async () => {});

      const result = await commitProjectLog(
        { repoRoot: root, logPath, message: 'chore(oat): residual probe' },
        { sleep },
      );

      // Accepted residual, pinned so it cannot drift silently: output carrying
      // git's advice *and* an index-lock mention is read as contention and
      // retried. The cost is one wasted retry window and a misleading
      // `lockClass` — never a swallowed failure.
      expect(result).toMatchObject({
        outcome: 'blocked-by-index-lock',
        committed: false,
        attempts: 3,
      });
      expect(result.error).toContain('Another git process seems to be running');
      expect(sleep).toHaveBeenCalledTimes(2);
      // Nothing is swallowed and nothing is left staged.
      expect(git(['diff', '--cached', '--name-only'])).toBe('');
      expect(git(['status', '--porcelain', '--', logPath])).not.toBe('');
    });

    it('reports already-committed when a competing writer clears the lock and commits first', async () => {
      const { root, logPath } = await createRepo();
      const identity = 'c0ffee00-3333-4000-8000-0123456789ab';
      await seedLog(
        logPath,
        `\n### 2026-07-17 · structural · oat gate review · p02\n\nstatus=ok run=${identity}\n`,
      );
      const git = initGitRepo(root);
      const baseline = git(['rev-parse', 'HEAD']);
      const lockPath = join(root, '.git', 'index.lock');
      await writeFile(
        logPath,
        `${await readFile(logPath, 'utf8')}\nedit\n`,
        'utf8',
      );
      await writeFile(lockPath, '', 'utf8');
      const sleep = vi.fn(async () => {
        // The competing writer finishes and releases the lock, so our next
        // attempt fails with "nothing to commit" rather than lock contention.
        await rm(lockPath, { force: true });
        git(['add', '--', logPath]);
        git(['commit', '-q', '-m', 'other writer', '--', logPath]);
      });

      const result = await commitProjectLog(
        {
          repoRoot: root,
          logPath,
          message: 'chore(oat): race probe',
          identity: { key: identity, body: `status=ok run=${identity}` },
        },
        { sleep },
      );

      expect(result).toMatchObject({
        outcome: 'already-committed',
        committed: false,
        attempts: 2,
      });
      expect(result.error).toBeUndefined();
      expect(git(['rev-parse', 'HEAD'])).not.toBe(baseline);
    });

    it('refuses to call the work settled when the committed log lost the entry', async () => {
      const { root, logPath } = await createRepo();
      const identity = 'deadbee0-4444-4000-8000-0123456789ab';
      await seedLog(logPath);
      const git = initGitRepo(root);
      const lockPath = join(root, '.git', 'index.lock');
      await writeFile(
        logPath,
        `# Project Log: demo\n\n## Entries\n\n### 2026-07-17 · structural · oat gate review · p02\n\nstatus=ok run=${identity}\n`,
        'utf8',
      );
      await writeFile(lockPath, '', 'utf8');
      let cleared = false;
      const sleep = vi.fn(async () => {
        if (cleared) {
          return;
        }
        cleared = true;
        // A rewrite that drops our entry, committed by someone else: HEAD moved
        // and the log is clean, but the entry we appended is gone.
        await rm(lockPath, { force: true });
        await writeFile(
          logPath,
          '# Project Log: demo\n\n## Entries\n\n### 2026-07-17 · structural · other · p01\n\nstatus=ok run=unrelated\n',
          'utf8',
        );
        git(['add', '--', logPath]);
        git(['commit', '-q', '-m', 'rewrite', '--', logPath]);
        await writeFile(lockPath, '', 'utf8');
      });

      const result = await commitProjectLog(
        {
          repoRoot: root,
          logPath,
          message: 'chore(oat): lost entry probe',
          identity: { key: identity, body: `status=ok run=${identity}` },
        },
        { sleep },
      );

      // The disposition is preserved as blocked rather than silently settled.
      expect(result).toMatchObject({
        outcome: 'blocked-by-index-lock',
        // The lock churned, so the window is contention rather than a stuck
        // lock; the point is that the work is not called settled.
        lockClass: 'transient-index-lock',
        attempts: 3,
      });
    });

    it('reports already-committed when another writer commits inside the retry window', async () => {
      const { root, logPath } = await createRepo();
      await seedLog(logPath, '\n### seed\n\nseed entry\n');
      const git = initGitRepo(root);
      const baseline = git(['rev-parse', 'HEAD']);
      const lockPath = join(root, '.git', 'index.lock');
      await writeFile(
        logPath,
        `${await readFile(logPath, 'utf8')}\nedit\n`,
        'utf8',
      );
      await writeFile(lockPath, '', 'utf8');
      let wave = 0;
      const sleep = vi.fn(async () => {
        wave += 1;
        if (wave > 1) {
          return;
        }
        await rm(lockPath, { force: true });
        git(['add', '--', logPath]);
        git(['commit', '-q', '-m', 'other writer', '--', logPath]);
        await writeFile(lockPath, '', 'utf8');
      });

      const result = await commitProjectLog(
        { repoRoot: root, logPath, message: 'chore(oat): snapshot probe' },
        { sleep },
      );

      // Derived from the one pre-action snapshot: entry HEAD moved and the log
      // is clean again, so the work is settled rather than blocked.
      expect(result).toMatchObject({
        outcome: 'already-committed',
        committed: false,
        attempts: 3,
      });
      expect(result.error).toBeUndefined();
      expect(git(['rev-parse', 'HEAD'])).not.toBe(baseline);
    });
  });

  describe('overlapping writers', () => {
    const keyA = 'aaaaaaaa-7777-4000-8000-aaaaaaaaaaaa';
    const keyB = 'bbbbbbbb-7777-4000-8000-bbbbbbbbbbbb';

    function entry(key: string): {
      repoRoot: string;
      project: string;
      structural: boolean;
      producer: string;
      ref: string;
      body: string;
      idempotencyKey: string;
    } {
      return {
        repoRoot: '',
        project: '',
        structural: true,
        producer: 'oat gate review',
        ref: 'p02',
        body: `status=ok run=${key}`,
        idempotencyKey: key,
      };
    }

    it('serializes two overlapping finalizations so both run ids survive', async () => {
      const { root, projectPath, logPath } = await createRepo();
      const projectRelativePath = join('.oat', 'projects', 'shared', 'demo');
      // A log that already carries an end-of-run synthesis section: entries are
      // spliced in ahead of it, which is the read/modify/write window two
      // writers can overlap inside.
      await writeFile(
        logPath,
        '# Project Log: demo\n\n## Entries\n\n## End-of-run synthesis\n\nprior synthesis\n',
        'utf8',
      );
      const git = initGitRepo(root);

      // Deterministic interleave, no sleep race. Writer A is held inside its
      // window until writer B has demonstrably reached the same window --
      // either by entering it (no serialization) or by contending for the lock
      // (serialization working). Both signals resolve the same gate, so the
      // control fails fast when the lock is removed instead of hanging.
      let openWindow: () => void = () => {};
      const windowShared = new Promise<void>((settle) => {
        openWindow = settle;
      });
      const lockSleep = vi.fn(async (ms: number): Promise<void> => {
        openWindow();
        await new Promise((settle) => setTimeout(settle, ms));
      });

      const base: Partial<AppendProjectLogDependencies> = {
        resolveActiveProject: async () => ({
          status: 'active',
          path: projectRelativePath,
        }),
        resolveAssetsRoot: async () => CANONICAL_ASSETS_ROOT,
        now: () => new Date('2026-07-17T12:00:00.000Z'),
      };

      const writerA = appendProjectLog(
        { ...entry(keyA), repoRoot: root, project: projectRelativePath },
        {
          ...base,
          writeLog: async (path: string, content: string): Promise<void> => {
            await windowShared;
            await writeFile(path, content, 'utf8');
          },
          lock: { pollMs: 1, sleep: lockSleep },
        },
      );
      const writerB = appendProjectLog(
        { ...entry(keyB), repoRoot: root, project: projectRelativePath },
        {
          ...base,
          readLog: async (path: string): Promise<string> => {
            openWindow();
            return readFile(path, 'utf8');
          },
          lock: { pollMs: 1, sleep: lockSleep },
        },
      );
      const [resultA, resultB] = await Promise.all([writerA, writerB]);

      expect(resultA.status).toBe('appended');
      expect(resultB.status).toBe('appended');
      const content = await readFile(logPath, 'utf8');
      // Neither writer's entry was clobbered by the other's stale rewrite.
      expect(countHeadings(content, keyA)).toBe(1);
      expect(countHeadings(content, keyB)).toBe(1);
      // The windows really did overlap: B found the lock held rather than
      // sailing through an uncontended acquire.
      expect(lockSleep).toHaveBeenCalled();
      // Both entries are still spliced ahead of the synthesis section.
      expect(content.indexOf(`run=${keyA}`)).toBeLessThan(
        content.indexOf('## End-of-run synthesis'),
      );
      expect(content.indexOf(`run=${keyB}`)).toBeLessThan(
        content.indexOf('## End-of-run synthesis'),
      );

      // A same-id replay stays singular.
      const replay = await appendProjectLog(
        { ...entry(keyA), repoRoot: root, project: projectRelativePath },
        base,
      );
      expect(replay.status).toBe('already-appended');
      const afterReplay = await readFile(logPath, 'utf8');
      expect(countHeadings(afterReplay, keyA)).toBe(1);
      expect(countHeadings(afterReplay, keyB)).toBe(1);

      // Both finalizations settle, and each one's identity is in HEAD.
      for (const key of [keyA, keyB]) {
        const commit = await commitProjectLog({
          repoRoot: root,
          logPath,
          message: 'chore(oat): overlapping writers',
          identity: { key, body: `status=ok run=${key}` },
        });
        expect(['committed', 'nothing-to-commit']).toContain(commit.outcome);
      }
      const head = git([
        'show',
        `HEAD:${join(projectRelativePath, 'project-log.md')}`,
      ]);
      expect(countHeadings(head, keyA)).toBe(1);
      expect(countHeadings(head, keyB)).toBe(1);
      expect(git(['status', '--porcelain', '--', logPath])).toBe('');
      expect(projectPath).toBe(join(root, projectRelativePath));
    });

    it('refuses to rewrite the log when the advisory lock is unavailable', async () => {
      const { root, logPath } = await createRepo();
      const projectRelativePath = join('.oat', 'projects', 'shared', 'demo');
      await writeFile(
        logPath,
        '# Project Log: demo\n\n## Entries\n\n## End-of-run synthesis\n\nprior synthesis\n',
        'utf8',
      );

      let signalHolderInWindow: () => void = () => {};
      const holderInWindow = new Promise<void>((settle) => {
        signalHolderInWindow = settle;
      });
      let releaseHolder: () => void = () => {};
      const holderReleased = new Promise<void>((settle) => {
        releaseHolder = settle;
      });

      const base: Partial<AppendProjectLogDependencies> = {
        resolveActiveProject: async () => ({
          status: 'active',
          path: projectRelativePath,
        }),
        resolveAssetsRoot: async () => CANONICAL_ASSETS_ROOT,
        now: () => new Date('2026-07-17T12:00:00.000Z'),
      };

      const holder = appendProjectLog(
        { ...entry(keyA), repoRoot: root, project: projectRelativePath },
        {
          ...base,
          readLog: async (path: string): Promise<string> => {
            signalHolderInWindow();
            return readFile(path, 'utf8');
          },
          writeLog: async (path: string, content: string): Promise<void> => {
            await holderReleased;
            await writeFile(path, content, 'utf8');
          },
        },
      );

      // The holder is demonstrably inside its read/modify/write window, so the
      // second writer's bounded wait really does expire against a held lock.
      await holderInWindow;
      await expect(
        appendProjectLog(
          { ...entry(keyB), repoRoot: root, project: projectRelativePath },
          { ...base, lock: { waitMs: 0 } },
        ),
      ).rejects.toThrow(/Timed out waiting for the project log lock/);

      releaseHolder();
      await expect(holder).resolves.toMatchObject({ status: 'appended' });

      // The refusal wrote nothing: the holder's entry is intact and the
      // refused writer left no partial rewrite behind.
      const content = await readFile(logPath, 'utf8');
      expect(countHeadings(content, keyA)).toBe(1);
      expect(countHeadings(content, keyB)).toBe(0);
      expect(content).toContain('prior synthesis');
    });

    it('reclaims a lock abandoned by a crashed writer instead of wedging', async () => {
      const { root, logPath } = await createRepo();
      const projectRelativePath = join('.oat', 'projects', 'shared', 'demo');
      await writeFile(
        logPath,
        '# Project Log: demo\n\n## Entries\n\n## End-of-run synthesis\n\nprior synthesis\n',
        'utf8',
      );

      // A real pid that has already exited: the lock a killed gate leaves
      // behind. Nothing may wait for it, because it will never be released.
      const crashed = spawnSync(process.execPath, ['-e', '']).pid;
      expect(crashed).toBeGreaterThan(0);
      const lockPath = projectLogLockPath(logPath);
      await mkdir(dirname(lockPath), { recursive: true });
      await writeFile(
        lockPath,
        `${JSON.stringify({
          token: 'crashed-writer',
          pid: crashed,
          host: hostname(),
          acquiredAt: new Date().toISOString(),
        })}\n`,
        'utf8',
      );

      const result = await appendProjectLog(
        { ...entry(keyA), repoRoot: root, project: projectRelativePath },
        {
          resolveActiveProject: async () => ({
            status: 'active',
            path: projectRelativePath,
          }),
          resolveAssetsRoot: async () => CANONICAL_ASSETS_ROOT,
          now: () => new Date('2026-07-17T12:00:00.000Z'),
          // No waiting is permitted: the abandoned lock has to be reclaimed on
          // the spot, not outlived.
          lock: { waitMs: 0 },
        },
      );

      expect(result.status).toBe('appended');
      expect(countHeadings(await readFile(logPath, 'utf8'), keyA)).toBe(1);
      // The reclaimed lock is released again, and the reclamation slot is not
      // left behind to block the next writer.
      await expect(readFile(lockPath, 'utf8')).rejects.toThrow();
      await expect(readFile(`${lockPath}.reclaim`, 'utf8')).rejects.toThrow();
    });

    it('refuses to settle a commit it cannot read back from HEAD', async () => {
      const { root, logPath } = await createRepo();
      await seedLog(logPath);
      const git = initGitRepo(root);
      const baseline = git(['rev-parse', 'HEAD']);
      await writeFile(
        logPath,
        `# Project Log: demo\n\n## Entries\n\n### 2026-07-17 · structural · oat gate review · p02\n\nstatus=ok run=${keyA}\n`,
        'utf8',
      );

      const commit = await commitProjectLog(
        {
          repoRoot: root,
          logPath,
          message: 'chore(oat): unreadable verification',
          identity: { key: keyA, body: `status=ok run=${keyA}` },
        },
        {
          // The commit itself works; only the read back of the committed log
          // is unavailable, which is the state a buffer limit or a transient
          // git read error produces.
          runGit: (repoRoot: string, args: string[]): string => {
            if (args[0] === 'show') {
              throw new Error('fatal: unable to read object');
            }
            return execFileSync('git', args, {
              cwd: repoRoot,
              encoding: 'utf8',
              stdio: ['ignore', 'pipe', 'pipe'],
            }).trim();
          },
        },
      );

      // The commit landed, but unread evidence is not proof, so it does not
      // settle: the receipt and its idempotent recovery finish the job.
      expect(git(['rev-parse', 'HEAD'])).not.toBe(baseline);
      expect(commit).toMatchObject({
        outcome: 'commit-unverified',
        committed: false,
      });
      expect(commit.error).toContain(keyA);
    });

    it('refuses to settle a commit whose entry the committed log does not carry', async () => {
      const { root, logPath } = await createRepo();
      const projectRelativePath = join('.oat', 'projects', 'shared', 'demo');
      await seedLog(logPath);
      const git = initGitRepo(root);

      // The exact post-race state: our append is gone from the file, a
      // competing writer's entry is there instead, and the log is dirty, so the
      // commit below really does stage and commit -- successfully.
      await writeFile(
        logPath,
        `# Project Log: demo\n\n## Entries\n\n### 2026-07-17 · structural · oat gate review · p02\n\nstatus=ok run=${keyB}\n`,
        'utf8',
      );

      const commit = await commitProjectLog({
        repoRoot: root,
        logPath,
        message: 'chore(oat): identity verification',
        identity: { key: keyA, body: `status=ok run=${keyA}` },
      });

      // The commit itself succeeded -- HEAD moved and the tree is clean -- but
      // it did not carry the caller's run, so it is not settled work.
      expect(commit).toMatchObject({
        outcome: 'entry-missing-after-commit',
        committed: false,
      });
      expect(commit.error).toContain(keyA);
      expect(git(['status', '--porcelain', '--', logPath])).toBe('');
      const head = git([
        'show',
        `HEAD:${join(projectRelativePath, 'project-log.md')}`,
      ]);
      expect(countHeadings(head, keyB)).toBe(1);
      expect(countHeadings(head, keyA)).toBe(0);
    });
  });

  describe('gate receipt recovery', () => {
    const key = 'a1b2c3d4-2222-4000-8000-fedcbafedcba';

    async function writeReceipt(
      root: string,
      overrides: Partial<GateProjectLogReceipt> = {},
    ): Promise<{ receiptPath: string; artifactPath: string }> {
      const projectRelativePath = join('.oat', 'projects', 'shared', 'demo');
      const projectPath = join(root, projectRelativePath);
      const artifactRelativePath = join(
        projectRelativePath,
        'reviews',
        'code-p02.md',
      );
      await mkdir(join(projectPath, 'reviews'), { recursive: true });
      await writeFile(join(root, artifactRelativePath), '# Review\n', 'utf8');
      const artifactSignature = createHash('sha256')
        .update('# Review\n')
        .digest('hex');
      const worktreeRoot = execFileSync(
        'git',
        ['rev-parse', '--show-toplevel'],
        { cwd: root, encoding: 'utf8' },
      ).trim();
      const receipt: GateProjectLogReceipt = {
        runId: key,
        project: projectRelativePath,
        projectPath,
        worktreeRoot,
        logPath: join(projectPath, 'project-log.md'),
        artifactPath: artifactRelativePath,
        artifactSignature,
        appendStatus: 'appended',
        commitStatus: 'blocked-by-index-lock',
        lockClass: 'persistent-index-lock',
        attempts: 3,
        producer: 'oat gate review',
        ref: 'p02',
        body: `gate finalization run=${key}`,
        recovery: { command: 'oat project log append --commit' },
        ...overrides,
      };
      const receiptPath = join(projectPath, 'gate-receipts', `${key}.json`);
      await mkdir(join(projectPath, 'gate-receipts'), { recursive: true });
      await writeFile(
        receiptPath,
        `${JSON.stringify(receipt, null, 2)}\n`,
        'utf8',
      );
      return { receiptPath, artifactPath: join(root, artifactRelativePath) };
    }

    it('completes finalization and removes the receipt', async () => {
      const { root, logPath } = await createRepo();
      await seedLog(logPath);
      const git = initGitRepo(root);
      const { receiptPath } = await writeReceipt(root);
      const baseline = git(['rev-parse', 'HEAD']);
      const { command, capture } = createHarness(root);

      await runCommand(command, [
        ...structuralArgs(key),
        '--idempotency-key',
        key,
        '--commit',
      ]);

      expect(capture.jsonPayloads[0]).toMatchObject({
        status: 'appended',
        commit: { outcome: 'committed' },
        receipt: { path: receiptPath, removed: true },
      });
      expect(git(['rev-parse', 'HEAD'])).not.toBe(baseline);
      await expect(readFile(receiptPath, 'utf8')).rejects.toThrow();
      expect(process.exitCode).toBe(0);
    });

    it('appends nothing new when the recovery command runs twice', async () => {
      const { root, logPath } = await createRepo();
      await seedLog(logPath);
      initGitRepo(root);
      await writeReceipt(root);
      const first = createHarness(root);
      await runCommand(first.command, [
        ...structuralArgs(key),
        '--idempotency-key',
        key,
        '--commit',
      ]);
      const afterFirst = await readFile(logPath, 'utf8');
      const headAfterFirst = execFileSync('git', ['rev-parse', 'HEAD'], {
        cwd: root,
        encoding: 'utf8',
      }).trim();

      const second = createHarness(root);
      await runCommand(second.command, [
        ...structuralArgs(key),
        '--idempotency-key',
        key,
        '--commit',
      ]);

      expect(second.capture.jsonPayloads[0]).toMatchObject({
        status: 'already-appended',
        commit: { outcome: 'nothing-to-commit' },
      });
      await expect(readFile(logPath, 'utf8')).resolves.toBe(afterFirst);
      expect(countHeadings(afterFirst, key)).toBe(1);
      expect(
        execFileSync('git', ['rev-parse', 'HEAD'], {
          cwd: root,
          encoding: 'utf8',
        }).trim(),
      ).toBe(headAfterFirst);
      expect(process.exitCode).toBe(0);
    });

    it.each([
      {
        label: 'a changed review artifact',
        mutate: async (root: string, artifactPath: string): Promise<void> => {
          expect(root).toContain('oat-project-log-');
          await writeFile(artifactPath, '# Review (rewritten)\n', 'utf8');
        },
        overrides: {},
        expectedReason: /signature changed/,
      },
      {
        label: 'a foreign worktree root',
        mutate: async (): Promise<void> => {},
        overrides: { worktreeRoot: join('/tmp', 'not-this-worktree') },
        expectedReason: /worktree/,
      },
      {
        label: 'a missing review artifact',
        mutate: async (root: string, artifactPath: string): Promise<void> => {
          expect(root).toContain('oat-project-log-');
          await rm(artifactPath, { force: true });
        },
        overrides: {},
        expectedReason: /artifact is missing/,
      },
      {
        label: 'an artifact named without a signature',
        mutate: async (): Promise<void> => {},
        overrides: { artifactSignature: null },
        expectedReason: /without an artifact signature/,
      },
      {
        label: 'a different entry ref',
        mutate: async (): Promise<void> => {},
        overrides: { ref: 'p09' },
        expectedReason: /--ref does not match the receipt entry/,
      },
      {
        label: 'a different entry body',
        mutate: async (): Promise<void> => {},
        overrides: { body: 'a different finalization' },
        expectedReason: /--body does not match the receipt entry/,
      },
      {
        label: 'a different entry producer',
        mutate: async (): Promise<void> => {},
        overrides: { producer: 'someone else' },
        expectedReason: /--producer does not match the receipt entry/,
      },
      {
        label: 'a run id that is not the key naming the receipt file',
        mutate: async (): Promise<void> => {},
        overrides: { runId: 'a-different-run-id' },
        expectedReason: /receipt run id .* does not match --idempotency-key/,
      },
    ])(
      'refuses recovery for $label and touches nothing',
      async ({ mutate, overrides, expectedReason }) => {
        const { root, logPath } = await createRepo();
        await seedLog(logPath);
        const git = initGitRepo(root);
        const { receiptPath, artifactPath } = await writeReceipt(
          root,
          overrides,
        );
        await mutate(root, artifactPath);
        const before = await readFile(logPath, 'utf8');
        const baseline = git(['rev-parse', 'HEAD']);
        const { command, capture } = createHarness(root);

        await runCommand(command, [
          ...structuralArgs(key),
          '--idempotency-key',
          key,
          '--commit',
        ]);

        expect(capture.jsonPayloads[0]).toMatchObject({
          status: 'error',
          type: 'gate-project-log-receipt-mismatch',
          receiptPath,
          reason: expect.stringMatching(expectedReason),
        });
        expect(process.exitCode).toBe(1);
        await expect(readFile(logPath, 'utf8')).resolves.toBe(before);
        expect(git(['rev-parse', 'HEAD'])).toBe(baseline);
        await expect(readFile(receiptPath, 'utf8')).resolves.toContain(key);
      },
    );
  });
});
