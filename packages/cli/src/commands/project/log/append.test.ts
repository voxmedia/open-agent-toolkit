import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import type { CommandContext, GlobalOptions } from '@app/command-context';
import {
  createLoggerCapture,
  type LoggerCapture,
} from '@commands/__tests__/helpers';
import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  commitProjectLog,
  PROJECT_LOG_COMMIT_ATTEMPTS,
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

      expect(result).toMatchObject({ outcome: 'failed', attempts: 0 });
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

      expect(result).toMatchObject({ outcome: 'failed', attempts: 0 });
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
