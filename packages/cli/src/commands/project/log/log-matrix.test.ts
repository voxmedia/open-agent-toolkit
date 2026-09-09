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

/**
 * The project-log behavior matrix, as a test rather than as a claim.
 *
 * Every earlier round of this work justified itself with a differential corpus
 * that lived only in a report: the shapes were named in prose, the arithmetic
 * did not close, and no reviewer could re-derive the result from the
 * repository. The individual guards are pinned in `append`, `check`,
 * `grammar`, `rollup` and `synthesize`; what was missing is the one place that
 * says how every surface answers every shape, so a change to one surface that
 * silently disagrees with the others fails here.
 *
 * Nine shapes x {sealed, open} = 18 fixtures, each scored on five surfaces =
 * 90 cells. The assertion per cell is categorical — accepted, refused for
 * ambiguity, refused because sealed — not an exact message, so the matrix
 * documents the contract without pinning prose.
 */

type Outcome =
  /** The surface acted on the log. */
  | 'accepted'
  /** Refused: the log's structure has two readings. */
  | 'ambiguous'
  /** Refused: the log is sealed and this write would follow the seal. */
  | 'sealed'
  /** Recognized an existing seal and wrote nothing. */
  | 'already-sealed';

interface Shape {
  name: string;
  /** Builds the log body lines; the terminator is applied by the fixture. */
  terminator: string;
  /** Rewrites the joined content, for shapes that are not a plain join. */
  transform?: (content: string) => string;
  /** Drops the `## Entries` heading. */
  withoutEntries?: boolean;
}

const SEAL_HEADING =
  '### 2026-07-17 · structural · oat-project-complete · seal';
const JUDGMENT_HEADING = '### 2026-07-17 · project · bug · gate exit';
const PENDING_SYNTHESIS =
  '## End-of-run synthesis (pending — do not skip at project completion)';

const SHAPES: readonly Shape[] = [
  { name: 'lf', terminator: '\n' },
  { name: 'crlf', terminator: '\r\n' },
  { name: 'lone-cr', terminator: '\r' },
  { name: 'ls', terminator: '\u2028' },
  { name: 'ps', terminator: '\u2029' },
  {
    name: 'injected-cr',
    terminator: '\n',
    transform: (content) =>
      content.replace(
        'The gate returned the wrong exit code.',
        'carrier\r## Injected',
      ),
  },
  {
    name: 'preamble-ls',
    terminator: '\n',
    transform: (content) =>
      `preamble\u2028${content.slice(content.indexOf('## Entries'))}`,
  },
  {
    // No reader treats an undated `### ` line as a heading, so this shape must
    // stay ordinary: it is the control that keeps the ambiguity guard from
    // being written as "any `### ` after a terminator".
    name: 'undated-h3-cr',
    terminator: '\n',
    transform: (content) =>
      content.replace(
        'The gate returned the wrong exit code.',
        'carrier\r### Notes',
      ),
  },
  { name: 'no-entries', terminator: '\n', withoutEntries: true },
];

function buildLog(shape: Shape, sealed: boolean): string {
  const lines = [
    '# Project Log: demo',
    '',
    ...(shape.withoutEntries ? [] : ['## Entries']),
    '',
    JUDGMENT_HEADING,
    '',
    'The gate returned the wrong exit code.',
    '',
    ...(sealed
      ? [SEAL_HEADING, '', 'Completion sealed. oat-seal:demo', '']
      : []),
    PENDING_SYNTHESIS,
    '',
    'Summarize before archive.',
    '',
  ];
  const joined = lines.join(shape.terminator);
  return shape.transform ? shape.transform(joined) : joined;
}

/**
 * The expected outcome per shape, for an open log and a sealed one.
 *
 * `check` is listed separately from the writers because it reports rather than
 * mutates: on a healthy log it accepts whether or not the log is sealed.
 */
const EXPECTED: Record<
  string,
  {
    open: Record<
      'check' | 'judgment' | 'seal' | 'synthesize' | 'rollup',
      Outcome
    >;
    sealed: Record<
      'check' | 'judgment' | 'seal' | 'synthesize' | 'rollup',
      Outcome
    >;
  }
> = {
  lf: {
    open: {
      check: 'accepted',
      judgment: 'accepted',
      seal: 'accepted',
      synthesize: 'accepted',
      rollup: 'accepted',
    },
    sealed: {
      check: 'accepted',
      judgment: 'sealed',
      seal: 'already-sealed',
      synthesize: 'sealed',
      rollup: 'accepted',
    },
  },
  // The restoration: a CRLF log reads exactly as its line-feed twin does.
  crlf: {
    open: {
      check: 'accepted',
      judgment: 'accepted',
      seal: 'accepted',
      synthesize: 'accepted',
      rollup: 'accepted',
    },
    sealed: {
      check: 'accepted',
      judgment: 'sealed',
      seal: 'already-sealed',
      synthesize: 'sealed',
      rollup: 'accepted',
    },
  },
  'lone-cr': {
    open: {
      check: 'ambiguous',
      judgment: 'ambiguous',
      seal: 'ambiguous',
      synthesize: 'ambiguous',
      rollup: 'ambiguous',
    },
    sealed: {
      check: 'ambiguous',
      judgment: 'ambiguous',
      seal: 'ambiguous',
      synthesize: 'ambiguous',
      rollup: 'ambiguous',
    },
  },
  ls: {
    open: {
      check: 'ambiguous',
      judgment: 'ambiguous',
      seal: 'ambiguous',
      synthesize: 'ambiguous',
      rollup: 'ambiguous',
    },
    sealed: {
      check: 'ambiguous',
      judgment: 'ambiguous',
      seal: 'ambiguous',
      synthesize: 'ambiguous',
      rollup: 'ambiguous',
    },
  },
  ps: {
    open: {
      check: 'ambiguous',
      judgment: 'ambiguous',
      seal: 'ambiguous',
      synthesize: 'ambiguous',
      rollup: 'ambiguous',
    },
    sealed: {
      check: 'ambiguous',
      judgment: 'ambiguous',
      seal: 'ambiguous',
      synthesize: 'ambiguous',
      rollup: 'ambiguous',
    },
  },
  'injected-cr': {
    open: {
      check: 'ambiguous',
      judgment: 'ambiguous',
      seal: 'ambiguous',
      synthesize: 'ambiguous',
      rollup: 'ambiguous',
    },
    sealed: {
      check: 'ambiguous',
      judgment: 'ambiguous',
      seal: 'ambiguous',
      synthesize: 'ambiguous',
      rollup: 'ambiguous',
    },
  },
  'preamble-ls': {
    open: {
      check: 'ambiguous',
      judgment: 'ambiguous',
      seal: 'ambiguous',
      synthesize: 'ambiguous',
      rollup: 'ambiguous',
    },
    sealed: {
      check: 'ambiguous',
      judgment: 'ambiguous',
      seal: 'ambiguous',
      synthesize: 'ambiguous',
      rollup: 'ambiguous',
    },
  },
  // Ordinary throughout: no reader sees `### Notes` as a heading, so a lone CR
  // before it does not make the file ambiguous to anyone.
  'undated-h3-cr': {
    open: {
      check: 'accepted',
      judgment: 'accepted',
      seal: 'accepted',
      synthesize: 'accepted',
      rollup: 'accepted',
    },
    sealed: {
      check: 'accepted',
      judgment: 'sealed',
      seal: 'already-sealed',
      synthesize: 'sealed',
      rollup: 'accepted',
    },
  },
  // Without `## Entries` nothing parses. Open, that is an ordinary empty log;
  // sealed, the seal is plainly present but unreachable, which every surface
  // must refuse rather than answer.
  'no-entries': {
    open: {
      check: 'accepted',
      judgment: 'accepted',
      seal: 'accepted',
      synthesize: 'accepted',
      rollup: 'accepted',
    },
    sealed: {
      check: 'ambiguous',
      judgment: 'ambiguous',
      seal: 'ambiguous',
      synthesize: 'ambiguous',
      rollup: 'ambiguous',
    },
  },
};

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

async function runCommand(
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
 * Reduces a surface's JSON envelope to the categorical outcome.
 *
 * Anything unrecognized throws rather than defaulting. Mapping an unknown
 * failure to `accepted` would let a broken command satisfy an `accepted` cell
 * without performing the operation at all — `summary.md does not exist` is an
 * error envelope, and a fixture that stopped creating the summary would then
 * pass this matrix while doing nothing.
 */
function classify(payload: unknown): Outcome {
  const result = payload as { status?: string; message?: string };
  switch (result.status) {
    case 'ambiguous':
      return 'ambiguous';
    case 'sealed':
      return 'sealed';
    case 'already-appended':
      return 'already-sealed';
    // Every envelope a surface emits when it did produce a verdict or a write:
    // the two writers, `synthesize`, `rollup`, and `check`'s healthy statuses.
    case 'appended':
    case 'synthesized':
    case 'ok':
    case 'absent':
    case 'synthesis_pending':
      return 'accepted';
    case 'error': {
      // `append` and `synthesize` report an ambiguous structure or an
      // unreachable seal through the generic error envelope; only those reasons
      // count as a refusal this matrix knows about.
      if (
        /two readings|two answers|cannot reach it/.test(result.message ?? '')
      ) {
        return 'ambiguous';
      }
      throw new Error(
        `Unexpected error from a matrix surface: ${result.message ?? '(no message)'}`,
      );
    }
    default:
      throw new Error(
        `Unclassifiable envelope from a matrix surface: ${JSON.stringify(payload)}`,
      );
  }
}

describe('project log behavior matrix', () => {
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

  async function createFixture(content: string): Promise<{
    root: string;
    logPath: string;
    summaryPath: string;
  }> {
    const root = await mkdtemp(join(tmpdir(), 'oat-project-log-matrix-'));
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
    const logPath = join(projectPath, 'project-log.md');
    const summaryPath = join(projectPath, 'summary.md');
    await writeFile(logPath, content, 'utf8');
    await writeFile(summaryPath, '# Summary\n\nPlaceholder.\n', 'utf8');
    return { root, logPath, summaryPath };
  }

  const cases = SHAPES.flatMap((shape) =>
    [true, false].map((sealed) => ({
      shape,
      sealed,
      label: `${shape.name} / ${sealed ? 'sealed' : 'open'}`,
    })),
  );

  it('covers nine shapes in both sealed and open form', () => {
    expect(SHAPES).toHaveLength(9);
    expect(cases).toHaveLength(18);
    expect(Object.keys(EXPECTED).sort()).toEqual(
      SHAPES.map(({ name }) => name).sort(),
    );
  });

  it.each(cases)('$label', async ({ shape, sealed }) => {
    const content = buildLog(shape, sealed);
    const expected = EXPECTED[shape.name]![sealed ? 'sealed' : 'open'];

    // `check` — reports rather than mutates.
    {
      const { root } = await createFixture(content);
      const { command, capture } = createHarness(root);
      await runCommand(command, 'check', []);
      expect(classify(capture.jsonPayloads[0])).toBe(expected.check);
    }

    // A judgment append — ordinary new content.
    {
      const { root, logPath } = await createFixture(content);
      const before = await readFile(logPath, 'utf8');
      const { command, capture } = createHarness(root);
      await runCommand(command, 'append', [
        '--type',
        'bug',
        '--scope',
        'general',
        '--area',
        'matrix',
        '--body',
        'Content offered to the log.',
      ]);
      expect(classify(capture.jsonPayloads[0])).toBe(expected.judgment);
      if (expected.judgment !== 'accepted') {
        await expect(readFile(logPath, 'utf8')).resolves.toBe(before);
      }
    }

    // The completion seal.
    {
      const { root, logPath } = await createFixture(content);
      const before = await readFile(logPath, 'utf8');
      const { command, capture } = createHarness(root);
      await runCommand(command, 'append', [
        '--structural',
        '--producer',
        'oat-project-complete',
        '--ref',
        'seal',
        '--idempotency-key',
        'oat-seal:demo',
        '--body',
        'Completion sealed. oat-seal:demo',
      ]);
      expect(classify(capture.jsonPayloads[0])).toBe(expected.seal);
      if (expected.seal !== 'accepted') {
        // Neither a refusal nor a recognized replay may write.
        await expect(readFile(logPath, 'utf8')).resolves.toBe(before);
      }
    }

    // The synthesis rewrite.
    {
      const { root, logPath } = await createFixture(content);
      const before = await readFile(logPath, 'utf8');
      const { command, capture } = createHarness(root);
      await runCommand(command, 'synthesize', ['--body', 'Verdict: keep.']);
      expect(classify(capture.jsonPayloads[0])).toBe(expected.synthesize);
      if (expected.synthesize !== 'accepted') {
        await expect(readFile(logPath, 'utf8')).resolves.toBe(before);
      }
    }

    // The roll-up, which writes `summary.md` rather than the log.
    {
      const { root, summaryPath } = await createFixture(content);
      const before = await readFile(summaryPath, 'utf8');
      const { command, capture } = createHarness(root);
      await runCommand(command, 'rollup', []);
      expect(classify(capture.jsonPayloads[0])).toBe(expected.rollup);
      if (expected.rollup !== 'accepted') {
        await expect(readFile(summaryPath, 'utf8')).resolves.toBe(before);
      }
    }
  });

  it('never reports a shape as ambiguous to one surface and clean to another', () => {
    // The invariant every round of this work has been converging on: one file,
    // one answer. A surface that disagrees is the defect, whichever way it
    // disagrees, so this is asserted over the table rather than per shape.
    for (const [name, forms] of Object.entries(EXPECTED)) {
      for (const [form, surfaces] of Object.entries(forms)) {
        const values = Object.values(surfaces);
        const ambiguous = values.filter(
          (value) => value === 'ambiguous',
        ).length;
        expect(
          ambiguous === 0 || ambiguous === values.length,
          `${name}/${form} splits ${ambiguous}/${values.length} on ambiguity`,
        ).toBe(true);
      }
    }
  });
});
