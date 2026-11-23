import {
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import type { CommandContext, GlobalOptions } from '@app/command-context';
import {
  createLoggerCapture,
  type LoggerCapture,
} from '@commands/__tests__/helpers';
import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { findProjectLogEntryByIdempotencyKey } from './append';
import { checkProjectLog, parseProjectLogEntries } from './check';
import { parseProjectLogStructuralHead } from './grammar';
import { createProjectLogCommand } from './index';

const CANONICAL_ASSETS_ROOT = resolve(
  import.meta.dirname,
  '../../../../../../.oat',
);
const FIXTURES = join(import.meta.dirname, '__tests__', 'fixtures');

/** The minimal state a freestyle scaffold writes: no lifecycle fields. */
const FREESTYLE_STATE = [
  '---',
  'oat_workflow_mode: freestyle',
  "oat_project_created: '2026-07-17T09:00:00.000Z'",
  "oat_project_state_updated: '2026-07-17T09:00:00.000Z'",
  'oat_generated: false',
  '---',
  '',
  '# Project State: demo',
  '',
].join('\n');

/** An existing (lifecycle) mode, for the controls freestyle must not change. */
const QUICK_STATE =
  '---\noat_workflow_mode: quick\noat_phase: implement\n---\n';

const PLAN = '# Plan\n\n## Phase P7: Native phase\n\nBody.\n';
const JOURNAL = '# Journal\n\n## Phase P7: Native phase\n\nNotes.\n';

type Variant = 'both' | 'neither' | 'plan only' | 'journal only';
const VARIANTS: readonly Variant[] = [
  'both',
  'neither',
  'plan only',
  'journal only',
];

interface Harness {
  capture: LoggerCapture;
  command: Command;
}

function createHarness(cwd: string, now: Date | readonly Date[]): Harness {
  const capture = createLoggerCapture();
  // A list gives each clock read the next reading, repeating the last one.
  const readings = Array.isArray(now) ? now : [now as Date];
  let reads = 0;
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
      readStdin: async () => '',
      now: () => readings[Math.min(reads++, readings.length - 1)] as Date,
    }),
  };
}

async function run(
  command: Command,
  subcommand: string,
  args: string[],
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
  await program.parseAsync(['--json', 'project', 'log', subcommand, ...args], {
    from: 'user',
  });
}

/**
 * The key a keyless freestyle append derived and added to the body (p11), as
 * the last `--json` payload reports it.
 */
function derivedKey(harness: Harness): string {
  const payload = harness.capture.jsonPayloads.at(-1) as {
    idempotencyKey?: string;
  };
  expect(payload.idempotencyKey).toMatch(/^log-[0-9a-f]{12}$/);
  return payload.idempotencyKey as string;
}

describe('project log on a freestyle project, by path', () => {
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

  /**
   * A freestyle project with no active-project config, so every command must
   * resolve it by `--project <path>`; `plan.md` and `implementation.md` are
   * written per variant.
   */
  async function createFreestyleProject(
    variant: Variant,
  ): Promise<{ root: string; projectPath: string; relative: string }> {
    const root = await mkdtemp(join(tmpdir(), 'oat-freestyle-log-'));
    tempDirs.push(root);
    const relative = join('.oat', 'projects', 'shared', 'demo');
    const projectPath = join(root, relative);
    await mkdir(projectPath, { recursive: true });
    await writeFile(join(projectPath, 'state.md'), FREESTYLE_STATE, 'utf8');
    if (variant === 'both' || variant === 'plan only') {
      await writeFile(join(projectPath, 'plan.md'), PLAN, 'utf8');
    }
    if (variant === 'both' || variant === 'journal only') {
      await writeFile(join(projectPath, 'implementation.md'), JOURNAL, 'utf8');
    }
    return { root, projectPath, relative };
  }

  it.each(VARIANTS)(
    'appends, checks and synthesizes with %s of plan.md and implementation.md',
    async (variant) => {
      const { root, projectPath, relative } =
        await createFreestyleProject(variant);
      const before = (await readdir(projectPath)).sort();
      const planBefore =
        variant === 'both' || variant === 'plan only'
          ? await readFile(join(projectPath, 'plan.md'), 'utf8')
          : null;
      const journalBefore =
        variant === 'both' || variant === 'journal only'
          ? await readFile(join(projectPath, 'implementation.md'), 'utf8')
          : null;
      const now = new Date('2026-07-17T14:05:09.123Z');

      const judgment = createHarness(root, now);
      await run(judgment.command, 'append', [
        '--project',
        relative,
        '--type',
        'friction',
        '--scope',
        'project',
        '--area',
        'lane dispatch',
        '--body',
        'A lane report arrived after its lane was superseded.',
      ]);
      expect(process.exitCode).toBe(0);
      expect(judgment.capture.jsonPayloads).toEqual([
        expect.objectContaining({ status: 'appended', created: true }),
      ]);

      const event = createHarness(root, now);
      await run(event.command, 'append', [
        '--project',
        projectPath,
        '--structural',
        '--producer',
        'orchestrator',
        '--ref',
        'merged',
        '--time',
        '--subject',
        'l07',
        '--source-project',
        'child-project',
        '--body',
        'Merged PR #12 into the integration branch; lanes.md update u0031.',
      ]);
      expect(process.exitCode).toBe(0);
      expect(event.capture.jsonPayloads).toEqual([
        expect.objectContaining({
          status: 'appended',
          created: false,
          heading: '### 2026-07-17 · structural · orchestrator · merged',
        }),
      ]);

      const pending = createHarness(root, now);
      await run(pending.command, 'check', ['--project', relative]);
      expect(process.exitCode).toBe(0);
      expect(pending.capture.jsonPayloads).toEqual([
        expect.objectContaining({
          status: 'synthesis_pending',
          entryCounts: {
            structural: 1,
            judgment: { bug: 0, friction: 1, 'worked-well': 0, feedback: 0 },
          },
          grammarViolations: [],
          lastEntryDate: '2026-07-17',
        }),
      ]);

      const synthesize = createHarness(root, now);
      await run(synthesize.command, 'synthesize', [
        '--project',
        relative,
        '--body',
        'Lane reports need a superseded check before filing.',
      ]);
      expect(process.exitCode).toBe(0);
      expect(synthesize.capture.jsonPayloads).toEqual([
        expect.objectContaining({ status: 'synthesized' }),
      ]);

      const done = createHarness(root, now);
      await run(done.command, 'check', ['--project', relative]);
      expect(process.exitCode).toBe(0);
      expect(done.capture.jsonPayloads).toEqual([
        expect.objectContaining({ status: 'ok', synthesisPending: false }),
      ]);

      // The log commands read and write only the log: the variant's documents
      // are untouched and the only new file is project-log.md.
      expect((await readdir(projectPath)).sort()).toEqual(
        [...before, 'project-log.md'].sort(),
      );
      if (planBefore !== null) {
        expect(await readFile(join(projectPath, 'plan.md'), 'utf8')).toBe(
          planBefore,
        );
      }
      if (journalBefore !== null) {
        expect(
          await readFile(join(projectPath, 'implementation.md'), 'utf8'),
        ).toBe(journalBefore);
      }
    },
  );

  it('rolls up into a summary chosen with --summary-path and refuses without summary.md', async () => {
    const { root, projectPath, relative } =
      await createFreestyleProject('neither');
    const now = new Date('2026-07-17T14:05:09.000Z');
    const append = createHarness(root, now);
    await run(append.command, 'append', [
      '--project',
      relative,
      '--type',
      'worked-well',
      '--scope',
      'project',
      '--area',
      'lane ledger',
      '--body',
      'The ledger named the lane handle after compaction.',
    ]);
    expect(process.exitCode).toBe(0);

    const refused = createHarness(root, now);
    await run(refused.command, 'rollup', ['--project', relative]);
    expect(process.exitCode).toBe(1);
    expect(refused.capture.jsonPayloads).toEqual([
      {
        status: 'error',
        message: `summary.md does not exist: ${join(projectPath, 'summary.md')}. Author the project summary before roll-up.`,
      },
    ]);

    const summaryPath = join(relative, 'notes', 'outcome.md');
    await mkdir(join(projectPath, 'notes'));
    await writeFile(join(root, summaryPath), '# Outcome\n', 'utf8');
    const rolled = createHarness(root, now);
    await run(rolled.command, 'rollup', [
      '--project',
      relative,
      '--summary-path',
      summaryPath,
    ]);
    expect(process.exitCode).toBe(0);
    expect(rolled.capture.jsonPayloads).toEqual([
      expect.objectContaining({ status: 'ok', summarySection: 'written' }),
    ]);
    expect(await readFile(join(root, summaryPath), 'utf8')).toContain(
      '## Workflow Observations',
    );
  });
});

describe('idempotency identity of stored entries', () => {
  const log = [
    '# Project Log',
    '',
    '### 2026-07-17 · project · friction · review',
    '',
    '**Source:** gate-k1',
    '',
    'The gate was slow.',
    '',
    '### 2026-07-17 · structural · orchestrator · launched',
    '',
    '**Subject:** done-l07',
    '',
    'Launched lane 7.',
    '',
    '### 2026-07-17 · structural · orchestrator · merged',
    '',
    'Merged PR #12; merge-k2',
    '',
  ].join('\n');

  it("skips a structural entry's parsed event head but reads its body", () => {
    expect(
      findProjectLogEntryByIdempotencyKey(
        log,
        'done-l07',
        'Completed done-l07',
      ),
    ).toBeUndefined();
    expect(
      findProjectLogEntryByIdempotencyKey(
        log,
        'merge-k2',
        'Merged PR #12; merge-k2',
      ),
    ).toBe('### 2026-07-17 · structural · orchestrator · merged');
  });

  it("keeps reading a judgment entry's head lines, Source included, as before", () => {
    expect(
      findProjectLogEntryByIdempotencyKey(log, 'gate-k1', 'Retry gate-k1'),
    ).toBe('### 2026-07-17 · project · friction · review');
  });
});

describe('structural event fields', () => {
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

  async function createProject(
    state = FREESTYLE_STATE,
  ): Promise<{ root: string; projectPath: string; logPath: string }> {
    const root = await mkdtemp(join(tmpdir(), 'oat-log-event-'));
    tempDirs.push(root);
    const projectPath = join(root, '.oat', 'projects', 'shared', 'demo');
    await mkdir(projectPath, { recursive: true });
    await writeFile(join(projectPath, 'state.md'), state, 'utf8');
    return { root, projectPath, logPath: join(projectPath, 'project-log.md') };
  }

  const eventArgs = (
    projectPath: string,
    extra: string[],
    body = 'Merged PR #12; lanes.md update u0031.',
  ): string[] => [
    '--project',
    projectPath,
    '--structural',
    '--producer',
    'orchestrator',
    '--ref',
    'merged',
    ...extra,
    '--body',
    body,
  ];

  it('writes the time of day, subject and source project as a head above the one-line body', async () => {
    const { root, projectPath, logPath } = await createProject();
    const harness = createHarness(root, new Date('2026-07-17T14:05:09.123Z'));
    await run(
      harness.command,
      'append',
      eventArgs(projectPath, [
        '--time',
        '--subject',
        'l07',
        '--source-project',
        'child-project',
      ]),
    );
    expect(process.exitCode).toBe(0);
    const key = derivedKey(harness);

    const content = await readFile(logPath, 'utf8');
    expect(content).toContain(
      [
        '### 2026-07-17 · structural · orchestrator · merged',
        '',
        '**Time:** 14:05:09Z',
        '**Subject:** l07',
        '**Source project:** child-project',
        '',
        `Merged PR #12; lanes.md update u0031. key:${key}`,
        '',
      ].join('\n'),
    );
    expect(parseProjectLogEntries(content)).toEqual({
      entries: [
        {
          class: 'structural',
          heading: '### 2026-07-17 · structural · orchestrator · merged',
          date: '2026-07-17',
          producer: 'orchestrator',
          ref: 'merged',
          body: `**Time:** 14:05:09Z\n**Subject:** l07\n**Source project:** child-project\n\nMerged PR #12; lanes.md update u0031. key:${key}`,
          time: '14:05:09Z',
          subject: 'l07',
          sourceProject: 'child-project',
        },
      ],
      grammarViolations: [],
    });
  });

  it('takes the heading date and the time of day from one UTC clock reading', async () => {
    const { root, projectPath, logPath } = await createProject();
    // A second clock read would cross midnight into the next day.
    const harness = createHarness(root, [
      new Date('2026-07-17T23:59:59.999Z'),
      new Date('2026-07-18T00:00:00.000Z'),
    ]);
    await run(harness.command, 'append', eventArgs(projectPath, ['--time']));
    expect(process.exitCode).toBe(0);
    const [entry] = parseProjectLogEntries(
      await readFile(logPath, 'utf8'),
    ).entries;
    expect(entry).toMatchObject({ date: '2026-07-17', time: '23:59:59Z' });
    expect(entry).not.toHaveProperty('subject');
    expect(entry).not.toHaveProperty('sourceProject');
  });

  it('writes only the fields passed, in head order', async () => {
    const { root, projectPath, logPath } = await createProject();
    const harness = createHarness(root, new Date('2026-07-17T14:05:09.000Z'));
    await run(
      harness.command,
      'append',
      eventArgs(projectPath, ['--source-project', 'child', '--subject', 'p03']),
    );
    expect(process.exitCode).toBe(0);
    expect(await readFile(logPath, 'utf8')).toContain(
      `### 2026-07-17 · structural · orchestrator · merged\n\n**Subject:** p03\n**Source project:** child\n\nMerged PR #12; lanes.md update u0031. key:${derivedKey(harness)}\n`,
    );
  });

  it('keeps a structural entry without event flags byte-identical (existing-mode control)', async () => {
    const { root, projectPath, logPath } = await createProject(
      '---\noat_workflow_mode: quick\noat_phase: implement\n---\n',
    );
    const harness = createHarness(root, new Date('2026-07-17T14:05:09.000Z'));
    await run(harness.command, 'append', [
      '--project',
      projectPath,
      '--structural',
      '--producer',
      'oat-project-implement',
      '--ref',
      'p01',
      '--body',
      'Phase p01 accepted.',
    ]);
    expect(process.exitCode).toBe(0);
    const content = await readFile(logPath, 'utf8');
    expect(content).toContain(
      '\n### 2026-07-17 · structural · oat-project-implement · p01\n\nPhase p01 accepted.\n',
    );
    expect(content).not.toContain('**Time:**');
    expect(parseProjectLogEntries(content).entries).toEqual([
      {
        class: 'structural',
        heading: '### 2026-07-17 · structural · oat-project-implement · p01',
        date: '2026-07-17',
        producer: 'oat-project-implement',
        ref: 'p01',
        body: 'Phase p01 accepted.',
      },
    ]);
  });

  it('replays a keyed event as already-appended', async () => {
    const { root, projectPath, logPath } = await createProject();
    const args = [
      ...eventArgs(
        projectPath,
        ['--time', '--subject', 'l07', '--idempotency-key', 'merge-l07-u0031'],
        'Merged PR #12; merge-l07-u0031',
      ),
    ];
    const first = createHarness(root, new Date('2026-07-17T14:05:09.000Z'));
    await run(first.command, 'append', args);
    expect(process.exitCode).toBe(0);
    const replay = createHarness(root, new Date('2026-07-17T14:09:00.000Z'));
    await run(replay.command, 'append', args);
    expect(process.exitCode).toBe(0);
    expect(replay.capture.jsonPayloads).toEqual([
      expect.objectContaining({ status: 'already-appended' }),
    ]);
    expect(
      parseProjectLogEntries(await readFile(logPath, 'utf8')).entries,
    ).toHaveLength(1);
  });

  it("does not read a key named in another entry's event head as a prior append", async () => {
    // The launch entry names `done-l07` only as its subject; the completion
    // append keyed `done-l07` is a different event and must be written.
    const { root, projectPath, logPath } = await createProject();
    const launch = createHarness(root, new Date('2026-07-17T14:00:00.000Z'));
    await run(launch.command, 'append', [
      '--project',
      projectPath,
      '--structural',
      '--producer',
      'orchestrator',
      '--ref',
      'launched',
      '--subject',
      'done-l07',
      '--body',
      'Launched lane 7.',
    ]);
    expect(process.exitCode).toBe(0);
    const completionArgs = [
      '--project',
      projectPath,
      '--structural',
      '--producer',
      'orchestrator',
      '--ref',
      'completed',
      '--idempotency-key',
      'done-l07',
      '--body',
      'Completed lane 7: done-l07',
    ];
    const completion = createHarness(
      root,
      new Date('2026-07-17T15:00:00.000Z'),
    );
    await run(completion.command, 'append', completionArgs);
    expect(process.exitCode).toBe(0);
    expect(completion.capture.jsonPayloads).toEqual([
      expect.objectContaining({ status: 'appended' }),
    ]);
    // Control: replaying the completion itself is still recognized.
    const replay = createHarness(root, new Date('2026-07-17T15:05:00.000Z'));
    await run(replay.command, 'append', completionArgs);
    expect(replay.capture.jsonPayloads).toEqual([
      expect.objectContaining({ status: 'already-appended' }),
    ]);
    expect(
      parseProjectLogEntries(await readFile(logPath, 'utf8')).entries.map(
        (entry) => entry.heading,
      ),
    ).toEqual([
      '### 2026-07-17 · structural · orchestrator · launched',
      '### 2026-07-17 · structural · orchestrator · completed',
    ]);
  });

  it.each([
    [
      'a judgment entry with --time',
      ['--time'],
      'Judgment entries cannot use structural event flags --time, --subject, or --source-project; add --structural or remove those flags.',
    ],
    [
      'a judgment entry with --subject',
      ['--subject', 'l07'],
      'Judgment entries cannot use structural event flags --time, --subject, or --source-project; add --structural or remove those flags.',
    ],
    [
      'a judgment entry with --source-project',
      ['--source-project', 'child'],
      'Judgment entries cannot use structural event flags --time, --subject, or --source-project; add --structural or remove those flags.',
    ],
  ])('refuses %s', async (_label, extra, message) => {
    const { root, projectPath, logPath } = await createProject();
    const harness = createHarness(root, new Date('2026-07-17T14:05:09.000Z'));
    await run(harness.command, 'append', [
      '--project',
      projectPath,
      '--type',
      'bug',
      '--scope',
      'project',
      '--area',
      'merge',
      ...extra,
      '--body',
      'A judgment.',
    ]);
    expect(process.exitCode).toBe(1);
    expect(harness.capture.jsonPayloads).toEqual([
      { status: 'error', message },
    ]);
    await expect(readFile(logPath, 'utf8')).rejects.toThrow();
  });

  it.each([
    [
      ['--subject', 'lane 07'],
      '--subject must be one word without whitespace.',
    ],
    [
      ['--source-project', 'child project'],
      '--source-project must be one word without whitespace.',
    ],
    [
      ['--subject', 'l07\n## Injected'],
      '--subject must be a single line without newline characters.',
    ],
  ])('refuses event field %j', async (extra, message) => {
    const { root, projectPath, logPath } = await createProject();
    const harness = createHarness(root, new Date('2026-07-17T14:05:09.000Z'));
    await run(harness.command, 'append', eventArgs(projectPath, extra));
    expect(process.exitCode).toBe(1);
    expect(harness.capture.jsonPayloads).toEqual([
      { status: 'error', message },
    ]);
    await expect(readFile(logPath, 'utf8')).rejects.toThrow();
  });

  it('reads no event head from a judgment body and none past a malformed time', () => {
    expect(
      parseProjectLogStructuralHead('**Time:** 2pm\n**Subject:** l07\n\nBody.'),
    ).toEqual({
      head: {},
      rest: '**Time:** 2pm\n**Subject:** l07\n\nBody.',
    });
    const content = [
      '## Entries',
      '',
      '### 2026-07-17 · project · bug · merge',
      '',
      '**Subject:** l07',
      '',
      'A judgment that opens with a subject-like line.',
      '',
    ].join('\n');
    const [entry] = parseProjectLogEntries(content).entries;
    expect(entry).toEqual({
      class: 'judgment',
      heading: '### 2026-07-17 · project · bug · merge',
      date: '2026-07-17',
      scope: 'project',
      type: 'bug',
      area: 'merge',
      body: '**Subject:** l07\n\nA judgment that opens with a subject-like line.',
    });
  });
});

describe('review round 1 fixes (p03-t04)', () => {
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

  async function createProject(state = FREESTYLE_STATE): Promise<{
    root: string;
    projectPath: string;
    logPath: string;
  }> {
    const root = await mkdtemp(join(tmpdir(), 'oat-log-fixes-'));
    tempDirs.push(root);
    const projectPath = join(root, '.oat', 'projects', 'shared', 'demo');
    await mkdir(projectPath, { recursive: true });
    await writeFile(join(projectPath, 'state.md'), state, 'utf8');
    return { root, projectPath, logPath: join(projectPath, 'project-log.md') };
  }

  const NOW = new Date('2026-07-17T14:05:09.000Z');
  const structural = (projectPath: string, extra: string[]): string[] => [
    '--project',
    projectPath,
    '--structural',
    '--producer',
    'orchestrator',
    '--ref',
    'merged',
    ...extra,
  ];

  // L1: the reader is exactly as strict as the writer.
  it('reads no event fields from a flagless body that opens with a head-like line (review repro)', async () => {
    const { root, projectPath, logPath } = await createProject();
    const harness = createHarness(root, NOW);
    await run(
      harness.command,
      'append',
      structural(projectPath, ['--body', '**Subject:** fake rest']),
    );
    expect(process.exitCode).toBe(0);
    const [entry] = parseProjectLogEntries(
      await readFile(logPath, 'utf8'),
    ).entries;
    expect(entry).toEqual({
      class: 'structural',
      heading: '### 2026-07-17 · structural · orchestrator · merged',
      date: '2026-07-17',
      producer: 'orchestrator',
      ref: 'merged',
      body: `**Subject:** fake rest key:${derivedKey(harness)}`,
    });
  });

  it('still round-trips a written event entry (control)', async () => {
    const { root, projectPath, logPath } = await createProject();
    const harness = createHarness(root, NOW);
    await run(
      harness.command,
      'append',
      structural(projectPath, [
        '--time',
        '--subject',
        'l07',
        '--source-project',
        'child',
        '--body',
        'Merged PR #12.',
      ]),
    );
    expect(process.exitCode).toBe(0);
    const [entry] = parseProjectLogEntries(
      await readFile(logPath, 'utf8'),
    ).entries;
    expect(entry).toMatchObject({
      time: '14:05:09Z',
      subject: 'l07',
      sourceProject: 'child',
    });
    expect(
      parseProjectLogStructuralHead((entry as { body: string }).body),
    ).toEqual({
      head: { time: '14:05:09Z', subject: 'l07', sourceProject: 'child' },
      rest: `Merged PR #12. key:${derivedKey(harness)}`,
    });
  });

  it.each([
    ['a value with whitespace', '**Subject:** fake rest\n\nBody.'],
    ['no blank line after the head', '**Subject:** l07\nBody.'],
    ['no body after the head', '**Subject:** l07'],
    ['a blank body after the head', '**Subject:** l07\n\n   '],
    [
      'fields out of writing order',
      '**Subject:** l07\n**Time:** 10:00:00Z\n\nBody.',
    ],
    ['a repeated field', '**Subject:** l07\n**Subject:** l08\n\nBody.'],
    ['a time without seconds', '**Time:** 10:00Z\n\nBody.'],
    ['a time without the UTC suffix', '**Time:** 10:00:00\n\nBody.'],
  ])('reads no head from %s', (_label, body) => {
    expect(parseProjectLogStructuralHead(body)).toEqual({
      head: {},
      rest: body,
    });
  });

  it('reads a partial head written in order', () => {
    expect(
      parseProjectLogStructuralHead(
        '**Time:** 10:00:00Z\n**Source project:** child\n\nBody.',
      ),
    ).toEqual({
      head: { time: '10:00:00Z', sourceProject: 'child' },
      rest: 'Body.',
    });
  });

  // L2: a value given to --time is refused, not silently dropped.
  it('refuses a value given to --time', async () => {
    const { root, projectPath, logPath } = await createProject();
    const harness = createHarness(root, NOW);
    await run(
      harness.command,
      'append',
      structural(projectPath, ['--time', '10:00', '--body', 'Merged PR #12.']),
    );
    expect(process.exitCode).toBe(1);
    expect(harness.capture.jsonPayloads).toEqual([
      {
        status: 'error',
        message:
          "--time takes no value (got 10:00); it records the append's own UTC time of day. Put an event's own time in --body.",
      },
    ]);
    await expect(readFile(logPath, 'utf8')).rejects.toThrow();
  });

  it('still accepts a stray operand when --time is absent (existing-flag control)', async () => {
    const { root, projectPath } = await createProject();
    const harness = createHarness(root, NOW);
    await run(harness.command, 'append', [
      '--project',
      projectPath,
      '--type',
      'bug',
      '--scope',
      'project',
      '--area',
      'merge',
      '--body',
      'A judgment.',
      'stray',
    ]);
    expect(process.exitCode).toBe(0);
    expect(harness.capture.jsonPayloads).toEqual([
      expect.objectContaining({ status: 'appended' }),
    ]);
  });

  // L3: a structural key must appear in the caller's --body.
  // A freestyle project now writes the missing key into the body (p11-t02);
  // every other mode still refuses it.
  it('refuses a structural idempotency key that appears only in the event head (review repro, existing mode)', async () => {
    const { root, projectPath, logPath } = await createProject(QUICK_STATE);
    const harness = createHarness(root, NOW);
    await run(
      harness.command,
      'append',
      structural(projectPath, [
        '--subject',
        'k1',
        '--idempotency-key',
        'k1',
        '--body',
        'no key here',
      ]),
    );
    expect(process.exitCode).toBe(1);
    expect(harness.capture.jsonPayloads).toEqual([
      {
        status: 'error',
        message:
          '--idempotency-key must appear in --body so a replayed append can recognize its own entry.',
      },
    ]);
    await expect(readFile(logPath, 'utf8')).rejects.toThrow();
  });

  it('keeps the documented judgment rule: a --source equal to the key satisfies it (control)', async () => {
    const { root, projectPath } = await createProject();
    const args = [
      '--project',
      projectPath,
      '--type',
      'friction',
      '--scope',
      'project',
      '--area',
      'merge',
      '--category',
      'gotcha',
      '--source',
      'k1',
      '--idempotency-key',
      'k1',
      '--body',
      'no key here',
    ];
    const first = createHarness(root, NOW);
    await run(first.command, 'append', args);
    expect(process.exitCode).toBe(0);
    const replay = createHarness(root, NOW);
    await run(replay.command, 'append', args);
    expect(process.exitCode).toBe(0);
    expect(replay.capture.jsonPayloads).toEqual([
      expect.objectContaining({ status: 'already-appended' }),
    ]);
  });
});

describe('a derived key in a freestyle project (p11)', () => {
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

  async function createProject(state = FREESTYLE_STATE): Promise<{
    root: string;
    projectPath: string;
    logPath: string;
  }> {
    const root = await mkdtemp(join(tmpdir(), 'oat-log-key-'));
    tempDirs.push(root);
    const projectPath = join(root, '.oat', 'projects', 'shared', 'demo');
    await mkdir(projectPath, { recursive: true });
    await writeFile(join(projectPath, 'state.md'), state, 'utf8');
    return { root, projectPath, logPath: join(projectPath, 'project-log.md') };
  }

  // Each run reads a later clock, so a key taken from the date, the --time
  // value or **Recorded:** would differ between runs.
  let minute = 0;
  async function append(root: string, args: string[]) {
    minute += 1;
    const harness = createHarness(
      root,
      new Date(Date.UTC(2026, 10, 23, 9, minute, 7)),
    );
    await run(harness.command, 'append', args);
    expect(process.exitCode).toBe(0);
    return harness.capture.jsonPayloads.at(-1) as {
      status: string;
      idempotencyKey?: string;
    };
  }

  async function entries(logPath: string) {
    return parseProjectLogEntries(await readFile(logPath, 'utf8')).entries;
  }

  const event = (
    projectPath: string,
    change: { body?: string; ref?: string; sourceProject?: string } = {},
  ): string[] => [
    '--project',
    projectPath,
    '--structural',
    '--producer',
    'orchestrator',
    '--ref',
    change.ref ?? 'merged',
    '--time',
    '--subject',
    'l07',
    '--source-project',
    change.sourceProject ?? 'child',
    '--body',
    change.body ?? 'Merged PR #12.',
  ];

  it('appends the same keyless entry once, writing the derived key into the body', async () => {
    const { root, projectPath, logPath } = await createProject();
    const first = await append(root, event(projectPath));
    expect(first.status).toBe('appended');
    const key = first.idempotencyKey as string;
    expect(key).toMatch(/^log-[0-9a-f]{12}$/);
    const replay = await append(root, event(projectPath));
    expect(replay).toMatchObject({
      status: 'already-appended',
      idempotencyKey: key,
    });
    const written = await entries(logPath);
    expect(written).toHaveLength(1);
    expect(
      parseProjectLogStructuralHead((written[0] as { body: string }).body).rest,
    ).toBe(`Merged PR #12. key:${key}`);
  });

  it('dedupes a keyless judgment entry whose **Recorded:** time differs', async () => {
    const { root, projectPath, logPath } = await createProject();
    const args = [
      '--project',
      projectPath,
      '--type',
      'friction',
      '--scope',
      'project',
      '--area',
      'merge',
      '--category',
      'gotcha',
      '--source',
      'l07-d02',
      '--body',
      'Rebase before merging.',
    ];
    expect((await append(root, args)).status).toBe('appended');
    expect((await append(root, args)).status).toBe('already-appended');
    expect(await entries(logPath)).toHaveLength(1);
  });

  it.each([
    ['the body', { body: 'Merged PR #13.' }],
    ['the ref', { ref: 'reverted' }],
    ['--source-project', { sourceProject: 'other-child' }],
  ])(
    'appends again when only %s changes, and its replay appends nothing',
    async (_label, change) => {
      const { root, projectPath, logPath } = await createProject();
      const first = await append(root, event(projectPath));
      const changed = await append(root, event(projectPath, change));
      expect(changed.status).toBe('appended');
      expect(changed.idempotencyKey).not.toBe(first.idempotencyKey);
      expect(await entries(logPath)).toHaveLength(2);
      expect((await append(root, event(projectPath, change))).status).toBe(
        'already-appended',
      );
      expect(await entries(logPath)).toHaveLength(2);
    },
  );

  it('uses a given key instead of a derived one and writes it into a body that lacks it', async () => {
    const { root, projectPath, logPath } = await createProject();
    const keyed = (body: string) => [
      ...event(projectPath, { body }),
      '--idempotency-key',
      'merge-l07-u0031',
    ];
    const first = await append(root, keyed('Merged PR #12.'));
    expect(first).toMatchObject({
      status: 'appended',
      idempotencyKey: 'merge-l07-u0031',
    });
    // The given key decides: a different body under it is the same entry.
    expect((await append(root, keyed('Merged PR #12 again.'))).status).toBe(
      'already-appended',
    );
    const written = await entries(logPath);
    expect(written).toHaveLength(1);
    expect((written[0] as { body: string }).body).toMatch(
      /\n\nMerged PR #12\. key:merge-l07-u0031$/,
    );
  });

  it('leaves a body that already carries the given key as it is', async () => {
    const { root, projectPath, logPath } = await createProject();
    await append(root, [
      ...event(projectPath, { body: 'Merged PR #12; merge-l07-u0031' }),
      '--idempotency-key',
      'merge-l07-u0031',
    ]);
    expect((await readFile(logPath, 'utf8')).includes('key:')).toBe(false);
  });

  it('keeps an existing mode unchanged: a keyless append is not deduped and a missing key is refused', async () => {
    const { root, projectPath, logPath } = await createProject(QUICK_STATE);
    const args = [
      '--project',
      projectPath,
      '--structural',
      '--producer',
      'oat-project-implement',
      '--ref',
      'p01',
      '--body',
      'Phase p01 accepted.',
    ];
    const first = await append(root, args);
    expect(first.status).toBe('appended');
    expect(first).not.toHaveProperty('idempotencyKey');
    expect((await append(root, args)).status).toBe('appended');
    const written = await entries(logPath);
    expect(written.map((entry) => (entry as { body: string }).body)).toEqual([
      'Phase p01 accepted.',
      'Phase p01 accepted.',
    ]);

    const harness = createHarness(root, new Date('2026-11-23T10:00:00Z'));
    await run(harness.command, 'append', [
      ...args,
      '--idempotency-key',
      'k-missing',
    ]);
    expect(process.exitCode).toBe(1);
    expect(harness.capture.jsonPayloads).toEqual([
      {
        status: 'error',
        message:
          '--idempotency-key must appear in --body so a replayed append can recognize its own entry.',
      },
    ]);
    expect(await entries(logPath)).toHaveLength(2);
  });
});

describe('real committed project logs still parse', () => {
  it.each([
    {
      fixture: 'freestyle-projects-project-log.md',
      structural: 3,
      judgment: { bug: 0, friction: 4, 'worked-well': 0, feedback: 0 },
      categorized: 4,
      sealed: false,
    },
    {
      fixture: 'lite-workflow-mode-project-log.md',
      structural: 10,
      judgment: { bug: 0, friction: 0, 'worked-well': 0, feedback: 0 },
      categorized: 0,
      sealed: true,
    },
  ])(
    '$fixture parses every entry with no event fields',
    async ({ fixture, structural, judgment, categorized, sealed }) => {
      const content = await readFile(join(FIXTURES, fixture), 'utf8');
      const parsed = parseProjectLogEntries(content);
      expect(parsed.grammarViolations).toEqual([]);
      const headings = content
        .slice(content.indexOf('\n## Entries'))
        .split('\n')
        .filter((line) => line.startsWith('### 20'));
      expect(parsed.entries.map((entry) => entry.heading)).toEqual(headings);

      const structuralEntries = parsed.entries.filter(
        (entry) => entry.class === 'structural',
      );
      expect(structuralEntries).toHaveLength(structural);
      for (const entry of structuralEntries) {
        expect(entry).not.toHaveProperty('time');
        expect(entry).not.toHaveProperty('subject');
        expect(entry).not.toHaveProperty('sourceProject');
        expect(parseProjectLogStructuralHead(entry.body).rest).toBe(entry.body);
      }
      const judgmentEntries = parsed.entries.filter(
        (entry) => entry.class === 'judgment',
      );
      expect(
        judgmentEntries.filter((entry) => entry.category !== undefined),
      ).toHaveLength(categorized);

      const root = await mkdtemp(join(tmpdir(), 'oat-real-log-'));
      try {
        const projectPath = join(root, 'project');
        await mkdir(projectPath);
        await writeFile(join(projectPath, 'state.md'), '---\n---\n', 'utf8');
        await writeFile(join(projectPath, 'project-log.md'), content, 'utf8');
        const result = await checkProjectLog({
          repoRoot: root,
          project: projectPath,
        });
        expect(result).toMatchObject({
          entryCounts: { structural, judgment },
          sealed,
          grammarViolations: [],
        });
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    },
  );
});
