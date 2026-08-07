import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import type { CommandContext, GlobalOptions } from '@app/command-context';
import {
  createLoggerCapture,
  type LoggerCapture,
} from '@commands/__tests__/helpers';
import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

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
});
