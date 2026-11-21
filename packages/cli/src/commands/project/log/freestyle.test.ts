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

function createHarness(cwd: string, now: Date): Harness {
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
      readStdin: async () => '',
      now: () => now,
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

    const content = await readFile(logPath, 'utf8');
    expect(content).toContain(
      [
        '### 2026-07-17 · structural · orchestrator · merged',
        '',
        '**Time:** 14:05:09Z',
        '**Subject:** l07',
        '**Source project:** child-project',
        '',
        'Merged PR #12; lanes.md update u0031.',
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
          body: '**Time:** 14:05:09Z\n**Subject:** l07\n**Source project:** child-project\n\nMerged PR #12; lanes.md update u0031.',
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
    const harness = createHarness(root, new Date('2026-07-17T23:59:59.999Z'));
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
      '### 2026-07-17 · structural · orchestrator · merged\n\n**Subject:** p03\n**Source project:** child\n\nMerged PR #12; lanes.md update u0031.\n',
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

  it('reads no event head from a judgment body and ignores a malformed time', () => {
    expect(
      parseProjectLogStructuralHead('**Time:** 2pm\n**Subject:** l07\n\nBody.'),
    ).toEqual({ head: { subject: 'l07' }, rest: 'Body.' });
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
