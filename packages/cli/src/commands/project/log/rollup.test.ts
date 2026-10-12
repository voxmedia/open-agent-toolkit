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

import { createProjectLogCommand } from './index';
import { rollupProjectLog } from './rollup';

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
      readStdin: async () => '',
    }),
  };
}

async function runCommand(command: Command, args: string[]): Promise<void> {
  const program = new Command()
    .name('oat')
    .option('--json')
    .option('--verbose')
    .option('--cwd <path>')
    .exitOverride();
  const project = new Command('project');
  project.addCommand(command);
  program.addCommand(project);
  await program.parseAsync(['--json', 'project', 'log', 'rollup', ...args], {
    from: 'user',
  });
}

/** The digest report for the default fixture log: two judgments, one structural. */
const DEFAULT_DIGEST = {
  maxEntries: 12,
  maxLines: 60,
  rendered: 2,
  omitted: { overBound: 0, structural: 1, malformed: 0 },
  omittedEntries: [],
  byProducer: {
    'oat-project-implement': { rendered: 0, omitted: 1 },
    unattributed: { rendered: 2, omitted: 0 },
  },
};

describe('oat project log rollup', () => {
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
    options: {
      withLog?: boolean;
      withSummary?: boolean;
      referenceLayer?: boolean;
      explicitLedgerPath?: string;
      siblingArtifact?: boolean;
      digest?: { maxEntries?: number; maxLines?: number };
    } = {},
  ): Promise<{
    root: string;
    projectPath: string;
    logPath: string;
    summaryPath: string;
    ledgerPath: string;
  }> {
    const {
      withLog = true,
      withSummary = true,
      referenceLayer = true,
      explicitLedgerPath,
      siblingArtifact = false,
      digest,
    } = options;
    const root = await mkdtemp(join(tmpdir(), 'oat-project-log-rollup-'));
    tempDirs.push(root);
    const relativeProject = '.oat/projects/shared/demo';
    const projectPath = join(root, relativeProject);
    const logPath = join(projectPath, 'project-log.md');
    const summaryPath = join(projectPath, 'summary.md');
    const ledgerPath = join(
      root,
      explicitLedgerPath ?? '.oat/repo/reference/project-observations.md',
    );
    await mkdir(projectPath, { recursive: true });
    await writeFile(join(projectPath, 'state.md'), '---\n---\n', 'utf8');
    await writeFile(
      join(root, '.oat', 'config.local.json'),
      `${JSON.stringify({
        version: 1,
        activeProject: relativeProject,
        ...(explicitLedgerPath || digest
          ? {
              workflow: {
                ...(explicitLedgerPath
                  ? { projectLogLedgerPath: explicitLedgerPath }
                  : {}),
                ...(digest ? { projectLogDigest: digest } : {}),
              },
            }
          : {}),
      })}\n`,
      'utf8',
    );
    if (referenceLayer) {
      await mkdir(join(root, '.oat/repo/reference'), { recursive: true });
    }
    if (withSummary) {
      await writeFile(
        summaryPath,
        '# Project Summary\n\n## Outcome\n\nShipped.\n',
        'utf8',
      );
    }
    if (withLog) {
      await writeFile(
        logPath,
        `# Project Log: demo

## Entries

### 2026-07-16 · general · friction · review retries

Repeated reviews obscured the actionable result.

### 2026-07-17 · project · worked-well · task commits

One commit per task made rollback straightforward.

### 2026-07-17 · structural · oat-project-implement · p01

Phase completed with six commits.

## End-of-run synthesis

Verdict: adopt the task commit discipline.
`,
        'utf8',
      );
    }
    if (siblingArtifact) {
      await writeFile(
        join(projectPath, 'oat-execution-learnings.md'),
        '### 1999-01-01 · general · bug · sibling-only\n\nIgnore me.\n',
        'utf8',
      );
    }
    return { root, projectPath, logPath, summaryPath, ledgerPath };
  }

  it('writes the summary section, appends the ledger, and emits the envelope', async () => {
    const { root, summaryPath, ledgerPath } = await createRepo();
    const { command, capture } = createHarness(root);

    await runCommand(command, []);

    expect(capture.jsonPayloads[0]).toEqual({
      status: 'ok',
      summarySection: 'written',
      ledgerOutcome: 'appended',
      entriesRolledUp: 3,
      digest: DEFAULT_DIGEST,
    });
    await expect(readFile(summaryPath, 'utf8')).resolves.toBe(
      [
        '# Project Summary',
        '',
        '## Outcome',
        '',
        'Shipped.',
        '',
        '## Workflow Observations',
        '',
        '- **2026-07-17 · worked-well · task commits** (project) `oat-project:demo#2026-07-17-worked-well-task-commits-1`',
        '  One commit per task made rollback straightforward.',
        '- **2026-07-16 · friction · review retries** (general) `oat-project:demo#2026-07-16-friction-review-retries-1`',
        '  Repeated reviews obscured the actionable result.',
        '',
      ].join('\n'),
    );
    const ledger = await readFile(ledgerPath, 'utf8');
    expect(ledger).toContain('review retries');
    expect(ledger).not.toContain('task commits');
    expect(process.exitCode).toBe(0);
  });

  it('updates the summary and deduplicates ledger entries idempotently', async () => {
    const { root, summaryPath, ledgerPath } = await createRepo();
    const first = await rollupProjectLog({
      repoRoot: root,
      home: join(root, 'home'),
    });
    const second = await rollupProjectLog({
      repoRoot: root,
      home: join(root, 'home'),
    });

    expect(first).toMatchObject({
      summarySection: 'written',
      ledgerOutcome: 'appended',
    });
    expect(second).toEqual({
      status: 'ok',
      summarySection: 'updated',
      ledgerOutcome: 'deduplicated',
      entriesRolledUp: 3,
      digest: DEFAULT_DIGEST,
    });
    const summary = await readFile(summaryPath, 'utf8');
    expect(summary.match(/## Workflow Observations/g)).toHaveLength(1);
    const ledger = await readFile(ledgerPath, 'utf8');
    expect(ledger.match(/review retries/g)).toHaveLength(1);
  });

  it('preserves only the first same-key candidate in the initial ledger batch', async () => {
    const { root, logPath, ledgerPath } = await createRepo();
    await writeFile(
      logPath,
      `# Project Log: demo

## Entries

### 2026-07-17 · general · friction · duplicate area

First candidate is authoritative.

### 2026-07-17 · general · feedback · duplicate area

Second candidate must be omitted.

## End-of-run synthesis

Complete.
`,
      'utf8',
    );

    const first = await rollupProjectLog({
      repoRoot: root,
      home: join(root, 'home'),
    });
    const second = await rollupProjectLog({
      repoRoot: root,
      home: join(root, 'home'),
    });

    expect(first.ledgerOutcome).toBe('appended');
    expect(second.ledgerOutcome).toBe('deduplicated');
    const ledger = await readFile(ledgerPath, 'utf8');
    expect(ledger.match(/· duplicate area/g)).toHaveLength(1);
    expect(ledger).toContain('First candidate is authoritative.');
    expect(ledger).not.toContain('Second candidate must be omitted.');
  });

  it('rolls up complete safe multiline judgment bodies', async () => {
    const { root, logPath, summaryPath, ledgerPath } = await createRepo();
    await writeFile(
      logPath,
      `# Project Log: demo

## Entries

### 2026-07-17 · general · feedback · serialization boundary

Observation: Safe multiline bodies remain within one entry.
Impact: Roll-up retains the complete judgment.
Recommendation: Keep command-owned headings out of bodies.

## End-of-run synthesis

Complete.
`,
      'utf8',
    );

    await expect(
      rollupProjectLog({ repoRoot: root, home: join(root, 'home') }),
    ).resolves.toMatchObject({
      status: 'ok',
      ledgerOutcome: 'appended',
      entriesRolledUp: 1,
    });
    // The ledger keeps the complete judgment; the digest renders the first
    // observation sentence and, for an uncategorized entry, the recommendation.
    const ledger = await readFile(ledgerPath, 'utf8');
    expect(ledger).toContain(
      'Observation: Safe multiline bodies remain within one entry.',
    );
    expect(ledger).toContain('Impact: Roll-up retains the complete judgment.');
    expect(ledger).toContain(
      'Recommendation: Keep command-owned headings out of bodies.',
    );
    const summary = await readFile(summaryPath, 'utf8');
    expect(summary).toContain(
      '  Safe multiline bodies remain within one entry.',
    );
    expect(summary).toContain(
      '  Recommendation: Keep command-owned headings out of bodies.',
    );
    expect(summary).not.toContain('Impact:');
  });

  it('permits a skipped ledger when the default reference layer is absent', async () => {
    const { root, ledgerPath } = await createRepo({ referenceLayer: false });

    await expect(
      rollupProjectLog({ repoRoot: root, home: join(root, 'home') }),
    ).resolves.toEqual({
      status: 'ok',
      summarySection: 'written',
      ledgerOutcome: 'skipped_permitted',
      entriesRolledUp: 3,
      digest: DEFAULT_DIGEST,
    });
    await expect(readFile(ledgerPath, 'utf8')).rejects.toThrow();
  });

  it('returns failed when an explicit ledger path is unwritable', async () => {
    const { root } = await createRepo({
      referenceLayer: false,
      explicitLedgerPath: 'blocked/project-observations.md',
    });
    await writeFile(join(root, 'blocked'), 'not a directory', 'utf8');

    await expect(
      rollupProjectLog({ repoRoot: root, home: join(root, 'home') }),
    ).resolves.toEqual({
      status: 'failed',
      summarySection: 'written',
      ledgerOutcome: 'failed',
      entriesRolledUp: 3,
      digest: DEFAULT_DIGEST,
    });
  });

  it('errors without creating summary.md when it is absent', async () => {
    const { root, summaryPath } = await createRepo({ withSummary: false });
    const { command, capture } = createHarness(root);

    await runCommand(command, []);

    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'error',
      message: expect.stringContaining('summary.md does not exist'),
    });
    await expect(readFile(summaryPath, 'utf8')).rejects.toThrow();
    expect(process.exitCode).toBe(1);
  });

  it('errors when no project log exists', async () => {
    const { root } = await createRepo({ withLog: false });
    const { command, capture } = createHarness(root);

    await runCommand(command, []);

    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'error',
      message: expect.stringContaining('Project log does not exist'),
    });
    expect(process.exitCode).toBe(1);
  });

  it('ignores sibling artifacts entirely', async () => {
    const { root, summaryPath, ledgerPath } = await createRepo({
      siblingArtifact: true,
    });

    await rollupProjectLog({ repoRoot: root, home: join(root, 'home') });

    await expect(readFile(summaryPath, 'utf8')).resolves.not.toContain(
      'sibling-only',
    );
    await expect(readFile(ledgerPath, 'utf8')).resolves.not.toContain(
      'sibling-only',
    );
  });

  it('keeps the artifact target parameterizable only through the module API', async () => {
    const { root, projectPath } = await createRepo({ withLog: false });
    await writeFile(
      join(projectPath, 'custom-log.md'),
      `# Custom Log

## Entries

### 2026-07-17 · general · feedback · custom target

The internal target is reusable.
`,
      'utf8',
    );

    const result = await rollupProjectLog({
      repoRoot: root,
      home: join(root, 'home'),
      artifactTarget: { filename: 'custom-log.md' },
    });

    expect(result).toMatchObject({ entriesRolledUp: 1 });
    expect(createProjectLogCommand().helpInformation()).not.toContain(
      '--artifact-target',
    );
  });

  describe('ambiguous log', () => {
    it.each([
      ['a lone carriage return', '\r'],
      ['U+2028', '\u2028'],
      ['U+2029', '\u2029'],
    ])(
      'refuses to roll up a log whose `## Entries` follows %s',
      async (_name, terminator) => {
        const { root, logPath, summaryPath } = await createRepo();
        await writeFile(
          logPath,
          `preamble${terminator}## Entries\n\n### 2026-07-17 · project · bug · gate exit\n\nThe gate returned the wrong exit code.\n`,
          'utf8',
        );
        const summaryBefore = await readFile(summaryPath, 'utf8');
        const { command, capture } = createHarness(root);

        await runCommand(command, []);

        // `rollup` was the one surface without the guard: it rewrote
        // `summary.md` and reported `status: "ok"` with `entriesRolledUp: 0`,
        // byte-identical to the clean-empty-log result, so nothing
        // distinguished "the log is empty" from "the log is unreadable".
        expect(capture.jsonPayloads[0]).toMatchObject({
          status: 'ambiguous',
          ambiguity: expect.stringContaining('two readings'),
        });
        expect(capture.jsonPayloads[0]).not.toHaveProperty('entriesRolledUp');
        expect(process.exitCode).toBe(1);
        await expect(readFile(summaryPath, 'utf8')).resolves.toBe(
          summaryBefore,
        );
      },
    );

    it('refuses a log whose seal lies outside the parseable region', async () => {
      const { root, logPath, summaryPath } = await createRepo();
      await writeFile(
        logPath,
        '# Project Log: demo\n\n### 2026-07-17 · structural · oat-project-complete · seal\n\nCompletion sealed. oat-seal:demo\n',
        'utf8',
      );
      const summaryBefore = await readFile(summaryPath, 'utf8');
      const { command, capture } = createHarness(root);

      await runCommand(command, []);

      expect(capture.jsonPayloads[0]).toMatchObject({
        status: 'ambiguous',
        ambiguity: expect.stringContaining('two answers'),
      });
      expect(process.exitCode).toBe(1);
      await expect(readFile(summaryPath, 'utf8')).resolves.toBe(summaryBefore);
    });

    it('still rolls up a clean empty log, omitting the section', async () => {
      const { root, logPath, summaryPath } = await createRepo();
      await writeFile(logPath, '# Project Log: demo\n\n## Entries\n', 'utf8');
      const summaryBefore = await readFile(summaryPath, 'utf8');
      const { command, capture } = createHarness(root);

      await runCommand(command, []);

      // The control the ambiguous result used to be indistinguishable from:
      // an empty log reads successfully and has no durable lesson to digest.
      expect(capture.jsonPayloads[0]).toMatchObject({
        status: 'ok',
        summarySection: 'omitted',
        entriesRolledUp: 0,
      });
      expect(process.exitCode).toBe(0);
      await expect(readFile(summaryPath, 'utf8')).resolves.toBe(summaryBefore);
    });
  });

  describe('bounded observations digest', () => {
    /** The renderer this digest replaced: every entry, verbatim. */
    function legacyRender(log: string): string {
      const entries = /^## Entries$/m.exec(log)!;
      return log
        .slice(entries.index + entries[0].length)
        .split('\n## ')[0]!
        .trim();
    }

    function workflowObservations(summary: string): string {
      const start = summary.indexOf('## Workflow Observations');
      if (start < 0) return '';
      const rest = summary.slice(start + '## Workflow Observations'.length);
      const next = rest.search(/^## /m);
      return (next < 0 ? rest : rest.slice(0, next)).trim();
    }

    /**
     * The projection regression. Named guard `digest-bounded-projection`: with
     * the bound neutralized the rendered section carries every judgment entry,
     * and this unchanged assertion fails on the item count and line bound.
     */
    function assertBoundedDigest(
      section: string,
      bounds: { maxEntries: number; maxLines: number },
    ): void {
      expect(section, 'structural entries are provenance').not.toMatch(
        /· structural ·/,
      );
      expect(section, 'live project paths are removed').not.toMatch(
        /\.oat\/projects\/(?:shared|local|synced)\//,
      );
      const items = section
        .split('\n')
        .filter((line) => line.startsWith('- **'));
      expect(items.length, 'entry bound').toBeLessThanOrEqual(
        bounds.maxEntries,
      );
      expect(section.split('\n').length, 'line bound').toBeLessThanOrEqual(
        bounds.maxLines,
      );
    }

    const OVER_BOUND_LOG = `# Project Log: demo

## Entries

### 2026-07-10 · structural · oat gate review · p01

target=x status=ok artifact=.oat/projects/shared/demo/reviews/p01-review.md

### 2026-07-11 · project · friction · cache misses

**Category:** gotcha
**Source:** obs-1
**Origin:** oat-project-autonomous
**Recorded:** 2026-07-11T10:00:00Z

Observation: The cache missed on every run. It cost minutes.
Impact: Builds were slow.
Recommendation: Warm the cache first.

### 2026-07-12 · general · feedback · review paths

Reviews cited .oat/projects/shared/demo/reviews/final.md, which is local only.
Recommendation: Cite review paths as local-only.

### 2026-07-12 · project · worked-well · task commits

**Category:** efficiency
**Source:** obs-2

One commit per task kept rollback simple.
Uncertainty: Only measured on this project.

### 2026-07-13 · general · friction · gate retries

**Category:** decision
**Source:** obs-3
**Origin:** oat-project-goal

We decided to cap gate reruns at three.
Limitations: Not tested on goal mode.

### 2026-07-13 · project · bug · exit codes

The gate exited zero on failure.

### 2026-07-14 · structural · oat-project-implement · p02

verdict=pass

## End-of-run synthesis

Done.
`;

    it('bounds, orders and sanitizes the digest, and rejects the old verbatim output', async () => {
      const bounds = { maxEntries: 3, maxLines: 60 };
      const { root, logPath, summaryPath, ledgerPath } = await createRepo({
        digest: { maxEntries: 3 },
      });
      await writeFile(logPath, OVER_BOUND_LOG, 'utf8');
      const { command, capture } = createHarness(root);

      await runCommand(command, []);

      // Command success, reported separately from the projection assertion.
      expect(capture.jsonPayloads[0]).toMatchObject({
        status: 'ok',
        summarySection: 'written',
      });
      expect(process.exitCode).toBe(0);
      const section = workflowObservations(await readFile(summaryPath, 'utf8'));
      assertBoundedDigest(section, bounds);
      // The JSON report: counts by producer and omitted identities, no bodies.
      expect(capture.jsonPayloads[0]).toEqual({
        status: 'ok',
        summarySection: 'written',
        ledgerOutcome: 'appended',
        entriesRolledUp: 7,
        digest: {
          maxEntries: 3,
          maxLines: 60,
          rendered: 3,
          omitted: { overBound: 2, structural: 2, malformed: 0 },
          omittedEntries: [
            'oat-project:demo#2026-07-12-worked-well-task-commits-1',
            'oat-project:demo#2026-07-11-friction-cache-misses-1',
          ],
          byProducer: {
            'oat gate review': { rendered: 0, omitted: 1 },
            'oat-project-implement': { rendered: 0, omitted: 1 },
            'oat-project-goal': { rendered: 1, omitted: 0 },
            unattributed: { rendered: 2, omitted: 1 },
            'oat-project-autonomous': { rendered: 0, omitted: 1 },
          },
        },
      });
      expect(section).toBe(
        [
          '- **2026-07-13 · friction · gate retries** (general, decision) `oat-project:demo#2026-07-13-friction-gate-retries-1`',
          '  We decided to cap gate reruns at three.',
          '  Limitation: Not tested on goal mode.',
          '- **2026-07-13 · bug · exit codes** (project) `oat-project:demo#2026-07-13-bug-exit-codes-1`',
          '  The gate exited zero on failure.',
          '- **2026-07-12 · feedback · review paths** (general) `oat-project:demo#2026-07-12-feedback-review-paths-1`',
          '  Reviews cited (project file reviews/final.md), which is local only.',
          '  Recommendation: Cite review paths as local-only.',
          '',
          '_2 more judgment entries are omitted by the digest bound (3 entries, 60 lines); the archived project log keeps every entry._',
          '',
          'Synthesized recommendations for categorized learnings are in the Autonomous Execution Learnings section.',
        ].join('\n'),
      );

      // The same assertion rejects the old output for the reasons it names.
      expect(() =>
        assertBoundedDigest(legacyRender(OVER_BOUND_LOG), bounds),
      ).toThrow();

      // Ledger graduation still sees the complete judgment set.
      const ledger = await readFile(ledgerPath, 'utf8');
      expect(ledger).toContain(
        '### 2026-07-12 · general · feedback · review paths',
      );
      expect(ledger).toContain(
        '### 2026-07-13 · general · friction · gate retries',
      );
    });

    it('renders an uncategorized recommendation and labels live paths', async () => {
      const { root, logPath, summaryPath } = await createRepo();
      await writeFile(logPath, OVER_BOUND_LOG, 'utf8');

      await rollupProjectLog({ repoRoot: root, home: join(root, 'home') });

      const section = workflowObservations(await readFile(summaryPath, 'utf8'));
      assertBoundedDigest(section, { maxEntries: 12, maxLines: 60 });
      expect(section).toContain(
        '  Reviews cited (project file reviews/final.md), which is local only.',
      );
      expect(section).toContain(
        '  Recommendation: Cite review paths as local-only.',
      );
      // A categorized entry's recommendation belongs to the summary skill.
      expect(section).not.toContain('Warm the cache first');
      expect(section).toContain('  The cache missed on every run.');
      expect(section).toContain(
        '  Uncertainty: Only measured on this project.',
      );
      expect(section).not.toContain('**Source:**');
    });

    it('keeps the line bound, counting the trailer and cross-reference', async () => {
      const { root, logPath, summaryPath } = await createRepo({
        digest: { maxLines: 8 },
      });
      await writeFile(logPath, OVER_BOUND_LOG, 'utf8');

      const result = await rollupProjectLog({
        repoRoot: root,
        home: join(root, 'home'),
      });

      const section = workflowObservations(await readFile(summaryPath, 'utf8'));
      assertBoundedDigest(section, { maxEntries: 12, maxLines: 8 });
      expect(result).toMatchObject({
        digest: { maxLines: 8, rendered: 1, omitted: { overBound: 4 } },
      });
    });

    it('renders no item when maxLines is below the first item plus the reserve', async () => {
      // The first item here is three lines and the trailer and cross-reference
      // reserve four, so 5 lines cannot hold it: the documented minimum edge.
      const { root, logPath, summaryPath } = await createRepo({
        digest: { maxLines: 5 },
      });
      await writeFile(logPath, OVER_BOUND_LOG, 'utf8');

      const result = await rollupProjectLog({
        repoRoot: root,
        home: join(root, 'home'),
      });

      expect(result).toMatchObject({
        status: 'ok',
        summarySection: 'written',
        digest: { maxLines: 5, rendered: 0, omitted: { overBound: 5 } },
      });
      const section = workflowObservations(await readFile(summaryPath, 'utf8'));
      assertBoundedDigest(section, { maxEntries: 12, maxLines: 5 });
      expect(section).toBe(
        [
          '_5 more judgment entries are omitted by the digest bound (12 entries, 5 lines); the archived project log keeps every entry._',
          '',
          'Synthesized recommendations for categorized learnings are in the Autonomous Execution Learnings section.',
        ].join('\n'),
      );
    });

    it.each([1, 2, 3, 5, 60])(
      'never exceeds maxLines %i for one categorized entry, trailer and cross-reference included',
      async (maxLines) => {
        const { root, logPath, summaryPath, ledgerPath } = await createRepo({
          digest: { maxLines },
        });
        await writeFile(
          logPath,
          `# Project Log: demo

## Entries

### 2026-07-11 · general · friction · cache misses

**Category:** gotcha
**Source:** obs-1
**Origin:** oat-project-autonomous
**Recorded:** 2026-07-11T10:00:00Z

Observation: The cache missed on every run.
Recommendation: Warm the cache first.
`,
          'utf8',
        );

        const result = await rollupProjectLog({
          repoRoot: root,
          home: join(root, 'home'),
        });

        const section = workflowObservations(
          await readFile(summaryPath, 'utf8'),
        );
        assertBoundedDigest(section, { maxEntries: 12, maxLines });
        expect(result).toMatchObject({
          status: 'ok',
          digest: { maxLines, rendered: maxLines >= 5 ? 1 : 0 },
        });
        if (maxLines >= 3) {
          expect(section).toContain(
            'Synthesized recommendations for categorized learnings are in the Autonomous Execution Learnings section.',
          );
        }
        // Ledger graduation reads the full set regardless of what renders.
        await expect(readFile(ledgerPath, 'utf8')).resolves.toContain(
          'cache misses',
        );
      },
    );

    it('is within bounds on a small log in both versions (accepted neighbor)', async () => {
      const { root, summaryPath } = await createRepo();

      await rollupProjectLog({ repoRoot: root, home: join(root, 'home') });

      const section = workflowObservations(await readFile(summaryPath, 'utf8'));
      assertBoundedDigest(section, { maxEntries: 12, maxLines: 60 });
    });

    it('gives same-date, same-type, same-area entries distinct ids', async () => {
      const { root, logPath, summaryPath } = await createRepo();
      await writeFile(
        logPath,
        `# Project Log: demo

## Entries

### 2026-07-17 · project · friction · gate handoff

First.

### 2026-07-17 · general · friction · Gate Handoff

Second.
`,
        'utf8',
      );

      await rollupProjectLog({ repoRoot: root, home: join(root, 'home') });

      const section = workflowObservations(await readFile(summaryPath, 'utf8'));
      expect(section).toContain(
        '`oat-project:demo#2026-07-17-friction-gate-handoff-1`',
      );
      expect(section).toContain(
        '`oat-project:demo#2026-07-17-friction-gate-handoff-2`',
      );
      expect(section).not.toMatch(/\]\(/);
    });

    it('omits the section for a structural-only real archived log', async () => {
      const { root, logPath, summaryPath } = await createRepo();
      const fixture = await readFile(
        join(
          import.meta.dirname,
          '__tests__',
          'fixtures',
          'lite-workflow-mode-project-log.md',
        ),
        'utf8',
      );
      await writeFile(logPath, fixture, 'utf8');
      const summaryBefore = await readFile(summaryPath, 'utf8');

      const result = await rollupProjectLog({
        repoRoot: root,
        home: join(root, 'home'),
      });

      expect(result).toMatchObject({
        status: 'ok',
        summarySection: 'omitted',
        entriesRolledUp: 10,
        digest: { rendered: 0, omitted: { structural: 10, overBound: 0 } },
      });
      await expect(readFile(summaryPath, 'utf8')).resolves.toBe(summaryBefore);
      // The old renderer copied every structural entry and its live paths.
      expect(legacyRender(fixture)).toMatch(/· structural ·/);
      expect(legacyRender(fixture)).toContain('.oat/projects/shared/');
    });

    it('removes an existing Workflow Observations section when nothing qualifies', async () => {
      const { root, logPath, summaryPath } = await createRepo();
      await writeFile(
        summaryPath,
        '# Project Summary\n\n## Outcome\n\nShipped.\n\n## Workflow Observations\n\n### 2026-07-17 · structural · oat-project-implement · p01\n\nOld copy.\n\n## Follow-ups\n\nNone.\n',
        'utf8',
      );
      await writeFile(
        logPath,
        '# Project Log: demo\n\n## Entries\n\n### 2026-07-17 · structural · oat-project-implement · p01\n\nOld copy.\n',
        'utf8',
      );
      const { command, capture } = createHarness(root);

      await runCommand(command, []);

      expect(capture.jsonPayloads[0]).toMatchObject({
        status: 'ok',
        summarySection: 'omitted',
      });
      await expect(readFile(summaryPath, 'utf8')).resolves.toBe(
        '# Project Summary\n\n## Outcome\n\nShipped.\n\n## Follow-ups\n\nNone.\n',
      );
    });

    it('reports an individually malformed heading without dropping the rest', async () => {
      const { root, logPath } = await createRepo();
      await writeFile(
        logPath,
        '# Project Log: demo\n\n## Entries\n\n### not a valid heading\n\nx\n\n### 2026-07-17 · project · bug · kept\n\nKept.\n',
        'utf8',
      );

      await expect(
        rollupProjectLog({ repoRoot: root, home: join(root, 'home') }),
      ).resolves.toMatchObject({
        summarySection: 'written',
        digest: { rendered: 1, omitted: { malformed: 1 } },
      });
    });

    /**
     * Named guard `digest-ledger-graduation-intact`: feeding the ledger the
     * digest selection instead of the complete judgment set drops the general
     * lesson beyond the bound, and this assertion fails.
     */
    it('graduates a general judgment that the digest bound omits', async () => {
      const { root, logPath, ledgerPath, summaryPath } = await createRepo({
        digest: { maxEntries: 1 },
      });
      await writeFile(
        logPath,
        `# Project Log: demo

## Entries

### 2026-07-10 · general · friction · older general lesson

Older lesson beyond the bound.

### 2026-07-17 · general · feedback · newest general lesson

Newest lesson inside the bound.
`,
        'utf8',
      );

      const result = await rollupProjectLog({
        repoRoot: root,
        home: join(root, 'home'),
      });

      expect(result).toMatchObject({
        ledgerOutcome: 'appended',
        digest: { rendered: 1, omitted: { overBound: 1 } },
      });
      const section = workflowObservations(await readFile(summaryPath, 'utf8'));
      expect(section).not.toContain('older general lesson');
      const ledger = await readFile(ledgerPath, 'utf8');
      expect(ledger).toContain(
        '### 2026-07-10 · general · friction · older general lesson',
      );
      expect(ledger).toContain(
        '### 2026-07-17 · general · feedback · newest general lesson',
      );
    });

    it('states a categorized recommendation once, in Autonomous Execution Learnings', async () => {
      const { root, logPath, summaryPath } = await createRepo();
      // The summary skill authored its section first; roll-up runs in Step 6.
      await writeFile(
        summaryPath,
        '# Project Summary\n\n## Autonomous Execution Learnings\n\n- Warm the cache first. `oat-project:demo#2026-07-11-friction-cache-misses-1`\n',
        'utf8',
      );
      await writeFile(
        logPath,
        `# Project Log: demo

## Entries

### 2026-07-11 · project · friction · cache misses

**Category:** gotcha
**Source:** obs-1

Observation: The cache missed on every run.
Recommendation: Warm the cache first.
`,
        'utf8',
      );

      await rollupProjectLog({ repoRoot: root, home: join(root, 'home') });

      const summary = await readFile(summaryPath, 'utf8');
      expect(summary.match(/Warm the cache first/g)).toHaveLength(1);
      expect(summary.match(/The cache missed on every run/g)).toHaveLength(1);
      expect(
        summary.match(/oat-project:demo#2026-07-11-friction-cache-misses-1/g),
      ).toHaveLength(2);
    });
  });
});
