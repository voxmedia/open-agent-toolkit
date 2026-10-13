import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { CommandContext, GlobalOptions } from '@app/command-context';
import {
  createLoggerCapture,
  type LoggerCapture,
} from '@commands/__tests__/helpers';
import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { appendProjectLog } from './append';
import { checkProjectLog, parseProjectLogEntries } from './check';
import { createProjectLogCommand } from './index';

function createHarness(cwd: string): {
  capture: LoggerCapture;
  command: Command;
} {
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
    }),
  };
}

async function runCommand(
  command: Command,
  args: string[] = [],
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
    [...globalArgs, 'project', 'log', 'check', ...args],
    { from: 'user' },
  );
}

describe('oat project log check', () => {
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

  async function createRepo(): Promise<{
    root: string;
    projectPath: string;
    logPath: string;
  }> {
    const root = await mkdtemp(join(tmpdir(), 'oat-project-log-check-'));
    tempDirs.push(root);
    const relativeProject = '.oat/projects/shared/demo';
    const projectPath = join(root, relativeProject);
    await mkdir(projectPath, { recursive: true });
    await writeFile(join(projectPath, 'state.md'), '---\n---\n', 'utf8');
    await writeFile(
      join(root, '.oat', 'config.local.json'),
      `${JSON.stringify({ version: 1, activeProject: relativeProject })}\n`,
      'utf8',
    );
    return {
      root,
      projectPath,
      logPath: join(projectPath, 'project-log.md'),
    };
  }

  function logContent(
    entries: string,
    synthesisHeading = '## End-of-run synthesis (pending — do not skip at project completion)',
  ): string {
    return `# Project Log: demo

## Entries

${entries}

${synthesisHeading}

Synthesis content.
`;
  }

  it('returns the absent envelope when no project log exists', async () => {
    const { root } = await createRepo();
    const { command, capture } = createHarness(root);

    await runCommand(command);

    expect(capture.jsonPayloads[0]).toEqual({
      status: 'absent',
      ambiguity: null,
      sealed: false,
      seal: null,
      logPath: null,
      entryCounts: {
        structural: 0,
        judgment: {
          bug: 0,
          friction: 0,
          'worked-well': 0,
          feedback: 0,
        },
      },
      scopeCounts: { project: 0, general: 0 },
      lastEntryDate: null,
      synthesisPending: false,
      grammarViolations: [],
      learnings: 'none',
    });
    expect(process.exitCode).toBe(0);
  });

  it('reports counts, last date, and pending synthesis', async () => {
    const { root, logPath } = await createRepo();
    await writeFile(
      logPath,
      logContent(`### 2026-07-15 · project · bug · gate exit

First.

### 2026-07-16 · general · worked-well · command help

Second.

### 2026-07-17 · structural · oat-project-implement · p01

Third.`),
      'utf8',
    );
    const { command, capture } = createHarness(root);

    await runCommand(command);

    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'synthesis_pending',
      entryCounts: {
        structural: 1,
        judgment: {
          bug: 1,
          friction: 0,
          'worked-well': 1,
          feedback: 0,
        },
      },
      scopeCounts: { project: 1, general: 1 },
      lastEntryDate: '2026-07-17',
      synthesisPending: true,
      grammarViolations: [],
    });
    expect(process.exitCode).toBe(0);
  });

  it('reports completed synthesis and exits zero when required', async () => {
    const { root, logPath } = await createRepo();
    await writeFile(
      logPath,
      logContent(
        '### 2026-07-17 · project · feedback · lifecycle\n\nUseful.',
        '## End-of-run synthesis',
      ),
      'utf8',
    );
    const { command, capture } = createHarness(root);

    await runCommand(command, ['--require-synthesis']);

    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'ok',
      synthesisPending: false,
    });
    expect(process.exitCode).toBe(0);
  });

  it('exits one only when --require-synthesis sees pending synthesis', async () => {
    const { root, logPath } = await createRepo();
    await writeFile(logPath, logContent(''), 'utf8');
    const { command, capture } = createHarness(root);

    await runCommand(command, ['--require-synthesis']);

    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'synthesis_pending',
      synthesisPending: true,
    });
    expect(process.exitCode).toBe(1);
  });

  it('reports only invalid level-three headings under Entries', async () => {
    const { root, logPath } = await createRepo();
    await writeFile(
      logPath,
      logContent(`### 2026-07-17 · project · bug · valid

Valid.

### handwritten heading

Invalid.

### 2026-07-17 · structural · producer · ref

Valid structural.`),
      'utf8',
    );
    const { command, capture } = createHarness(root);

    await runCommand(command);

    expect(capture.jsonPayloads[0]).toMatchObject({
      grammarViolations: ['### handwritten heading'],
    });
    expect(process.exitCode).toBe(0);
  });

  it('parses a helper-written multiline judgment without boundary collisions', async () => {
    const { root, projectPath, logPath } = await createRepo();
    await writeFile(logPath, logContent(''), 'utf8');

    await appendProjectLog({
      repoRoot: root,
      project: projectPath,
      type: 'feedback',
      scope: 'project',
      area: 'serialization boundary',
      body: [
        'Observation: Safe multiline bodies remain within one entry.',
        'Impact: Check retains the complete judgment.',
        'Recommendation: Keep command-owned headings out of bodies.',
      ].join('\n'),
    });

    await expect(
      checkProjectLog({ repoRoot: root, project: projectPath }),
    ).resolves.toMatchObject({
      entryCounts: {
        structural: 0,
        judgment: {
          bug: 0,
          friction: 0,
          'worked-well': 0,
          feedback: 1,
        },
      },
      grammarViolations: [],
    });
  });

  it('reports a keyed completion seal', async () => {
    const { root, logPath } = await createRepo();
    await writeFile(
      logPath,
      logContent(`### 2026-07-17 · structural · oat-project-complete · seal

Completion sealed at 2026-07-17T10:00:00Z; project-log roll-up status: ok. oat-seal:demo`),
      'utf8',
    );
    const { command, capture } = createHarness(root);

    await runCommand(command);

    expect(capture.jsonPayloads[0]).toMatchObject({
      sealed: true,
      seal: {
        heading: '### 2026-07-17 · structural · oat-project-complete · seal',
        date: '2026-07-17',
        keyed: true,
        count: 1,
      },
      status: 'synthesis_pending',
    });
    expect(process.exitCode).toBe(0);
  });

  it('reports an unkeyed seal written before the key convention', async () => {
    const { root, logPath } = await createRepo();
    await writeFile(
      logPath,
      logContent(`### 2026-07-17 · structural · oat-project-complete · seal

Completion sealed at 2026-07-17T10:00:00Z; project-log roll-up status: ok.`),
      'utf8',
    );
    const { command, capture } = createHarness(root);

    await runCommand(command);

    expect(capture.jsonPayloads[0]).toMatchObject({
      sealed: true,
      seal: { keyed: false, count: 1 },
    });
  });

  it('reports an unsealed log as sealed: false with a null seal', async () => {
    const { root, logPath } = await createRepo();
    await writeFile(
      logPath,
      logContent(`### 2026-07-17 · structural · oat-project-implement · p01

Phase one.`),
      'utf8',
    );
    const { command, capture } = createHarness(root);

    await runCommand(command);

    expect(capture.jsonPayloads[0]).toMatchObject({
      sealed: false,
      seal: null,
      entryCounts: { structural: 1 },
    });
  });

  it('does not treat a foreign producer or a different ref as a seal', async () => {
    const { root, logPath } = await createRepo();
    await writeFile(
      logPath,
      logContent(`### 2026-07-17 · structural · oat-project-summary · seal

A different producer using the seal ref.

### 2026-07-18 · structural · oat-project-complete · retirement-sweep

The seal producer using a different ref.`),
      'utf8',
    );
    const { command, capture } = createHarness(root);

    await runCommand(command);

    // Seal identity is producer AND ref. Either half alone is an ordinary
    // structural entry, and treating it as a seal would freeze a log that was
    // never completed.
    expect(capture.jsonPayloads[0]).toMatchObject({
      sealed: false,
      seal: null,
      entryCounts: { structural: 2 },
    });
  });

  it('reports the first seal and the count for a doubly-sealed legacy log', async () => {
    const { root, logPath } = await createRepo();
    await writeFile(
      logPath,
      logContent(`### 2026-07-17 · structural · oat-project-complete · seal

Completion sealed at 2026-07-17T10:00:00Z; project-log roll-up status: ok.

### 2026-07-18 · structural · oat-project-complete · seal

Completion sealed at 2026-07-18T11:00:00Z; project-log roll-up status: ok.`),
      'utf8',
    );
    const { command, capture } = createHarness(root);

    await runCommand(command);

    expect(capture.jsonPayloads[0]).toMatchObject({
      sealed: true,
      seal: {
        heading: '### 2026-07-17 · structural · oat-project-complete · seal',
        date: '2026-07-17',
        count: 2,
      },
      status: 'synthesis_pending',
      entryCounts: { structural: 2 },
    });
  });

  it('keeps the status union and counts unchanged on a sealed log', async () => {
    const { root, logPath } = await createRepo();
    await writeFile(
      logPath,
      logContent(
        `### 2026-07-16 · project · bug · gate exit

A bug.

### 2026-07-17 · structural · oat-project-complete · seal

Completion sealed. oat-seal:demo`,
        '## End-of-run synthesis',
      ),
      'utf8',
    );
    const { command, capture } = createHarness(root);

    await runCommand(command, ['--require-synthesis']);

    // Sealing is additive: it never becomes a fourth status value, because both
    // consuming skills route on `status: "ok"`.
    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'ok',
      sealed: true,
      synthesisPending: false,
      entryCounts: { structural: 1, judgment: { bug: 1 } },
      scopeCounts: { project: 1, general: 0 },
    });
    expect(process.exitCode).toBe(0);
  });

  it('marks a sealed log in the human-readable line', async () => {
    const { root, logPath } = await createRepo();
    await writeFile(
      logPath,
      logContent(`### 2026-07-17 · structural · oat-project-complete · seal

Completion sealed. oat-seal:demo`),
      'utf8',
    );
    const { command, capture } = createHarness(root);

    await runCommand(command, [], []);

    expect(capture.info.join('\n')).toContain('sealed');
  });

  it('ignores sibling append-only artifacts entirely', async () => {
    const { root, projectPath } = await createRepo();
    await writeFile(
      join(projectPath, 'oat-execution-learnings.md'),
      '# Learnings\n\n### [2026-07-17] Different grammar\n',
      'utf8',
    );
    const { command, capture } = createHarness(root);

    await runCommand(command);

    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'absent',
      grammarViolations: [],
      learnings: 'legacy',
    });
    expect(capture.warn).toEqual([]);
    expect(process.exitCode).toBe(0);
  });

  it('reports a legacy learnings file beside a present log, and none without one', async () => {
    const { root, projectPath, logPath } = await createRepo();
    await writeFile(
      logPath,
      logContent('### 2026-07-17 · project · feedback · lifecycle\n\nUseful.'),
      'utf8',
    );

    const without = createHarness(root);
    await runCommand(without.command);
    expect(without.capture.jsonPayloads[0]).toMatchObject({
      status: 'synthesis_pending',
      learnings: 'none',
    });

    await writeFile(
      join(projectPath, 'oat-execution-learnings.md'),
      '# Learnings\n',
      'utf8',
    );
    const withLegacy = createHarness(root);
    await runCommand(withLegacy.command);
    expect(withLegacy.capture.jsonPayloads[0]).toMatchObject({
      status: 'synthesis_pending',
      learnings: 'legacy',
    });

    const human = createHarness(root);
    await runCommand(human.command, [], []);
    expect(human.capture.info.join('\n')).toContain('; learnings: legacy');
  });

  describe('judgment body head', () => {
    it('exposes category, source, origin and recorded from the head', () => {
      const parsed = parseProjectLogEntries(
        logContent(`### 2026-07-17 · project · feedback · docs

**Category:** documentation-gap
**Source:** obs-7
**Origin:** oat-cursor-cloud-projects
**Recorded:** 2026-07-17T12:00:00Z

Observation: the page omits the flag.`),
      );

      expect(parsed.entries[0]).toEqual({
        class: 'judgment',
        heading: '### 2026-07-17 · project · feedback · docs',
        date: '2026-07-17',
        scope: 'project',
        type: 'feedback',
        area: 'docs',
        body: '**Category:** documentation-gap\n**Source:** obs-7\n**Origin:** oat-cursor-cloud-projects\n**Recorded:** 2026-07-17T12:00:00Z\n\nObservation: the page omits the flag.',
        category: 'documentation-gap',
        source: 'obs-7',
        origin: 'oat-cursor-cloud-projects',
        recorded: '2026-07-17T12:00:00Z',
      });
    });

    it('does not report a hand-written category outside the six, or a head line below the body start', () => {
      const parsed = parseProjectLogEntries(
        logContent(`### 2026-07-17 · project · friction · a

**Category:** bogus
**Source:** obs-1

Body.

### 2026-07-17 · project · friction · b

Body first.
**Category:** gotcha`),
      );

      expect(parsed.entries[0]).toMatchObject({ source: 'obs-1' });
      expect(parsed.entries[0]).not.toHaveProperty('category');
      expect(parsed.entries[1]).not.toHaveProperty('category');
      expect(parsed.entries[1]).not.toHaveProperty('source');
    });
  });

  // Compatibility: a real archived log parses to the same entries it always did.
  describe('real archived log fixture (lite-workflow-mode)', () => {
    const fixturePath = join(
      import.meta.dirname,
      '__tests__',
      'fixtures',
      'lite-workflow-mode-project-log.md',
    );

    it('parses every entry with the pre-head shape and reports the seal', async () => {
      const content = await readFile(fixturePath, 'utf8');
      const parsed = parseProjectLogEntries(content);

      expect(parsed.grammarViolations).toEqual([]);
      expect(parsed.entries).toHaveLength(10);
      for (const entry of parsed.entries) {
        expect(Object.keys(entry).sort()).toEqual(
          ['body', 'class', 'date', 'heading', 'producer', 'ref'].sort(),
        );
      }
      expect(parsed.entries[0]).toEqual({
        class: 'structural',
        heading: '### 2026-09-04 · structural · oat gate review · plan',
        date: '2026-09-04',
        producer: 'oat gate review',
        ref: 'plan',
        body: 'target=cursor-gpt-5-6-sol-xhigh threshold=important findings=critical:0,important:3,medium:1,minor:1 exit=1 status=blocked artifact=.oat/projects/shared/lite-workflow-mode/reviews/artifact-plan-review-2026-09-04T231105Z.md',
      });
      expect(parsed.entries.at(-1)).toEqual({
        class: 'structural',
        heading: '### 2026-09-07 · structural · oat-project-complete · seal',
        date: '2026-09-07',
        producer: 'oat-project-complete',
        ref: 'seal',
        body: 'Completion sealed at 2026-09-07T03:52:36Z; project-log roll-up status: ok.',
      });
    });

    it('checks as a sealed log with no legacy learnings', async () => {
      const { root, logPath } = await createRepo();
      await writeFile(logPath, await readFile(fixturePath, 'utf8'), 'utf8');
      const { command, capture } = createHarness(root);

      await runCommand(command);

      expect(capture.jsonPayloads[0]).toMatchObject({
        status: 'ok',
        sealed: true,
        entryCounts: { structural: 10 },
        scopeCounts: { project: 0, general: 0 },
        lastEntryDate: '2026-09-07',
        grammarViolations: [],
        learnings: 'none',
      });
    });
  });

  describe('non-line-feed terminators are not section boundaries', () => {
    // A hand-written or externally edited log can carry these bytes even though
    // `append` now refuses to write them, so the parser has to hold on its own.
    // LF is the only boundary; a `## ` after a CR, U+2028, or U+2029 is body
    // text, exactly as it is to `parseProjectLogEntries`, which splits on '\n'.
    const terminators: readonly [string, string][] = [
      ['carriage return', '\r'],
      ['U+2028 line separator', '\u2028'],
      ['U+2029 paragraph separator', '\u2029'],
    ];

    it.each(terminators)(
      'refuses to report a verdict when a %s precedes an injected marker',
      async (_name, terminator) => {
        const { root, logPath } = await createRepo();
        await writeFile(
          logPath,
          logContent(`### 2026-07-17 · general · feedback · notes

carrier${terminator}## Injected

### 2026-07-17 · structural · oat-project-complete · seal

Completion sealed at 2026-07-17T10:00:00Z. oat-seal:demo`),
          'utf8',
        );
        const { command, capture } = createHarness(root);

        await runCommand(command);

        // Both mutators refuse this file. `check` reporting a confident
        // `sealed` and entry counts for it — as it did when only the writers
        // were guarded — is what let the completion gate trust a reader that
        // disagreed with every writer, so it now fails closed too.
        expect(capture.jsonPayloads[0]).toMatchObject({
          status: 'ambiguous',
          sealed: false,
          seal: null,
          entryCounts: { structural: 0 },
          ambiguity: expect.stringContaining('two readings'),
        });
        expect(process.exitCode).toBe(1);
      },
    );

    it('recognizes an existing seal and its entries on a CRLF log', async () => {
      const { root, logPath } = await createRepo();
      // A CRLF log parsed to zero entries at every earlier version, because no
      // heading pattern's `$` can match before a trailing `\r`. The seal was
      // therefore invisible, which is what deadlocked completion: this reader
      // said unsealed while the file plainly held a seal.
      await writeFile(
        logPath,
        [
          '# Project Log: demo',
          '',
          '## Entries',
          '',
          '### 2026-07-17 · project · bug · gate exit',
          '',
          'The gate returned the wrong exit code.',
          '',
          '### 2026-07-17 · structural · oat-project-complete · seal',
          '',
          'Completion sealed at 2026-07-17T10:00:00Z. oat-seal:demo',
          '',
        ].join('\r\n'),
        'utf8',
      );
      const { command, capture } = createHarness(root);

      await runCommand(command);

      expect(capture.jsonPayloads[0]).toMatchObject({
        status: 'ok',
        ambiguity: null,
        sealed: true,
        seal: {
          heading: '### 2026-07-17 · structural · oat-project-complete · seal',
          keyed: true,
          count: 1,
        },
        entryCounts: { structural: 1, judgment: { bug: 1 } },
        grammarViolations: [],
      });
      expect(process.exitCode).toBe(0);
    });

    it('reports a seal it cannot reach as ambiguous rather than as unsealed', async () => {
      const { root, logPath } = await createRepo();
      // The seal is plainly in the file but outside any parseable `## Entries`
      // region. Answering `sealed: false` here is the verdict both mutators
      // refuse to act on.
      await writeFile(
        logPath,
        '# Project Log: demo\n\n### 2026-07-17 · structural · oat-project-complete · seal\n\nCompletion sealed. oat-seal:demo\n',
        'utf8',
      );
      const { command, capture } = createHarness(root);

      await runCommand(command);

      expect(capture.jsonPayloads[0]).toMatchObject({
        status: 'ambiguous',
        sealed: false,
        seal: null,
        ambiguity: expect.stringContaining('two answers'),
      });
      expect(process.exitCode).toBe(1);
    });

    it('reports a lone-carriage-return log as ambiguous rather than clean', async () => {
      const { root, logPath } = await createRepo();
      // This file scored a *better* status than the base gave it once the
      // parser went line-feed-only: the pending-synthesis heading stopped being
      // found, so `check` upgraded it to `ok` while both writers refused it.
      await writeFile(
        logPath,
        [
          '# Project Log: demo',
          '',
          '## Entries',
          '',
          '### 2026-07-17 · project · bug · gate exit',
          '',
          'body',
          '',
          '## End-of-run synthesis (pending — do not skip at project completion)',
          '',
          'S.',
          '',
        ].join('\r'),
        'utf8',
      );
      const { command, capture } = createHarness(root);

      await runCommand(command);

      expect(capture.jsonPayloads[0]).toMatchObject({
        status: 'ambiguous',
        synthesisPending: false,
        ambiguity: expect.stringContaining('two readings'),
      });
      expect(process.exitCode).toBe(1);
    });

    it('still treats a marker after a real line feed as a section boundary', async () => {
      const { root, logPath } = await createRepo();
      await writeFile(
        logPath,
        logContent(`### 2026-07-17 · general · feedback · notes

carrier

## Injected

### 2026-07-17 · structural · oat-project-complete · seal

Completion sealed at 2026-07-17T10:00:00Z. oat-seal:demo`),
        'utf8',
      );
      const { command, capture } = createHarness(root);

      await runCommand(command);

      // An LF-preceded `## ` really does end `## Entries`, so the seal beneath it
      // is outside the entries region. Asserting only `sealed: false` here would
      // pass under the old confident verdict too, so the status, the reason and
      // the exit code are all pinned: this file is now reported as having two
      // answers rather than as an unsealed log.
      expect(capture.jsonPayloads[0]).toMatchObject({
        status: 'ambiguous',
        sealed: false,
        seal: null,
        entryCounts: { structural: 0 },
        ambiguity: expect.stringContaining('two answers'),
      });
      expect(process.exitCode).toBe(1);
    });
  });
});
