import { readFile, writeFile } from 'node:fs/promises';
import { isAbsolute, join, resolve } from 'node:path';

import {
  buildCommandContext,
  type CommandContext,
  type GlobalOptions,
} from '@app/command-context';
import { readGlobalOptions } from '@commands/shared/shared.utils';
import {
  resolveActiveProject,
  type ActiveProjectResolution,
} from '@config/oat-config';
import { dirExists, fileExists } from '@fs/io';
import { resolveProjectRoot } from '@fs/paths';
import { Command } from 'commander';

import {
  ProjectLogSealedError,
  type ProjectLogLockDependencies,
  withProjectLogLock,
} from './append';
import {
  findCanonicalProjectLogSynthesisSection,
  findProjectLogSeal,
  PROJECT_LOG_FILENAME,
  SYNTHESIS_COMPLETE_HEADING,
  SYNTHESIS_PENDING_HEADING,
} from './check';
import {
  containsAmbiguousProjectLogMarker,
  PROJECT_LOG_NON_LINE_FEED_TERMINATOR_RE,
  splitProjectLogLines,
} from './grammar';

export interface SynthesizeProjectLogInput {
  repoRoot: string;
  project?: string;
  body?: string;
}

export interface ProjectLogSynthesizeResult {
  status: 'synthesized';
  logPath: string;
}

export interface SynthesizeProjectLogDependencies {
  resolveActiveProject: (repoRoot: string) => Promise<ActiveProjectResolution>;
  /**
   * The log's own read/write primitives, mirroring `appendProjectLog`.
   * Injectable so a test can hold this writer inside its rewrite window while
   * another enters, which is the only way to prove the serialization rather
   * than assert it.
   */
  readLog: (path: string) => Promise<string>;
  writeLog: (path: string, content: string) => Promise<void>;
  /** Advisory-lock overrides for the synthesis window. */
  lock: Partial<ProjectLogLockDependencies>;
}

export interface ProjectLogSynthesizeCommandDependencies extends SynthesizeProjectLogDependencies {
  buildCommandContext: (options: GlobalOptions) => CommandContext;
  resolveProjectRoot: (cwd: string) => Promise<string>;
  readStdin: () => Promise<string>;
}

const DEFAULT_SYNTHESIZE_DEPENDENCIES: SynthesizeProjectLogDependencies = {
  resolveActiveProject,
  readLog: async (path: string): Promise<string> => readFile(path, 'utf8'),
  writeLog: async (path: string, content: string): Promise<void> => {
    await writeFile(path, content, 'utf8');
  },
  lock: {},
};

const DEFAULT_COMMAND_DEPENDENCIES: ProjectLogSynthesizeCommandDependencies = {
  ...DEFAULT_SYNTHESIZE_DEPENDENCIES,
  buildCommandContext,
  resolveProjectRoot,
  readStdin: async () => {
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks).toString('utf8');
  },
};

async function resolveTargetProject(
  input: SynthesizeProjectLogInput,
  dependencies: SynthesizeProjectLogDependencies,
): Promise<string> {
  if (input.project) {
    const projectPath = isAbsolute(input.project)
      ? resolve(input.project)
      : resolve(input.repoRoot, input.project);
    if (
      !(await dirExists(projectPath)) ||
      !(await fileExists(join(projectPath, 'state.md')))
    ) {
      throw new Error(
        `Project path is missing or invalid: ${input.project}. Pass --project <path> for a directory containing state.md.`,
      );
    }
    return projectPath;
  }

  const active = await dependencies.resolveActiveProject(input.repoRoot);
  if (active.status !== 'active' || !active.path) {
    throw new Error(
      'No active project resolves. Set activeProject or pass --project <path>.',
    );
  }
  return resolve(input.repoRoot, active.path);
}

export async function synthesizeProjectLog(
  input: SynthesizeProjectLogInput,
  overrides: Partial<SynthesizeProjectLogDependencies> = {},
): Promise<ProjectLogSynthesizeResult> {
  const dependencies = {
    ...DEFAULT_SYNTHESIZE_DEPENDENCIES,
    ...overrides,
  };
  const body = input.body?.trim();
  if (!body) {
    throw new Error('--body is required and must contain non-whitespace text.');
  }
  // Same rule the judgment bodies follow: LF is the only line break a project
  // log may contain, because it is the only boundary its readers agree on.
  if (PROJECT_LOG_NON_LINE_FEED_TERMINATOR_RE.test(body)) {
    throw new Error(
      '--body must break lines with line feeds only; carriage returns and the U+2028 and U+2029 separators are not accepted.',
    );
  }
  if (
    splitProjectLogLines(body).some(
      (line) =>
        line === SYNTHESIS_PENDING_HEADING ||
        line === SYNTHESIS_COMPLETE_HEADING,
    )
  ) {
    throw new Error(
      '--body must not recreate command-owned project-log synthesis markers.',
    );
  }

  const projectPath = await resolveTargetProject(input, dependencies);
  const logPath = join(projectPath, PROJECT_LOG_FILENAME);
  if (!(await fileExists(logPath))) {
    throw new Error(
      `Project log does not exist: ${logPath}. Append an entry before synthesizing.`,
    );
  }

  // The read, the seal consultation, and the whole-file rewrite are one
  // critical section under the log's own advisory lock — the same lock
  // `appendProjectLog` takes, because this rewrite and a concurrent append race
  // each other exactly as two appends do, and the loser's entry is simply gone.
  return withProjectLogLock(logPath, dependencies.lock, 'required', async () =>
    synthesizeLockedProjectLog(logPath, body, dependencies),
  );
}

async function synthesizeLockedProjectLog(
  logPath: string,
  body: string,
  dependencies: SynthesizeProjectLogDependencies,
): Promise<ProjectLogSynthesizeResult> {
  const content = await dependencies.readLog(logPath);

  // Refuse a log whose markers two readers resolve differently, before any
  // routing decision reads them. `synthesize` replaces a whole section chosen by
  // that reading, so a hidden second pending marker — `carrier<CR>## End-of-run
  // synthesis (pending …)` — used to make the log ambiguous and be refused, and
  // under an LF-only reading it becomes invisible and its content is consumed by
  // the rewrite.
  if (containsAmbiguousProjectLogMarker(content)) {
    throw new Error(
      `Project log ${logPath} has a '## ' or '### ' marker starting a line after a carriage return, U+2028, or U+2029 rather than a line feed. Readers disagree about where its sections begin, so it cannot be synthesized safely. Replace those line terminators with line feeds.`,
    );
  }

  // A sealed log is closed to this rewrite as much as to an append. The seal is
  // the log's last entry by contract, so replacing the synthesis section after
  // it would mutate a record the completion flow has already declared final.
  // The refusal is the same typed error `append` raises, so both commands
  // report `status: "sealed"` with a non-zero exit from one shape.
  const seal = findProjectLogSeal(content);
  if (seal !== null) {
    throw new ProjectLogSealedError(logPath, seal, 'synthesis rewrite');
  }

  const synthesis = findCanonicalProjectLogSynthesisSection(content);
  if (synthesis.status === 'complete') {
    throw new Error(
      'End-of-run synthesis is already written; append a correction judgment instead of replacing it.',
    );
  }
  if (synthesis.status === 'ambiguous') {
    throw new Error(
      'Project log must contain one unique canonical end-of-run synthesis section and cannot be synthesized safely.',
    );
  }
  if (synthesis.status === 'missing') {
    throw new Error(
      'Project log is missing the pending synthesis marker and cannot be synthesized safely.',
    );
  }

  const suffix = content.slice(synthesis.section.end);
  const nextContent = `${content.slice(
    0,
    synthesis.section.start,
  )}${SYNTHESIS_COMPLETE_HEADING}\n\n${body}\n${suffix ? '\n' : ''}${suffix}`;
  // Never write a log this command would refuse to read. The body reaches the
  // file verbatim, so this is the backstop behind the body validation above.
  if (containsAmbiguousProjectLogMarker(nextContent)) {
    throw new Error(
      '--body would leave a heading after a carriage return, U+2028, or U+2029, producing a log with two readings that no later command could safely mutate.',
    );
  }
  await dependencies.writeLog(logPath, nextContent);
  return { status: 'synthesized', logPath };
}

interface SynthesizeCommandOptions {
  project?: string;
  body?: string;
}

async function runSynthesizeCommand(
  options: SynthesizeCommandOptions,
  context: CommandContext,
  dependencies: ProjectLogSynthesizeCommandDependencies,
): Promise<void> {
  try {
    const repoRoot = await dependencies.resolveProjectRoot(context.cwd);
    const body =
      options.body === '-' ? await dependencies.readStdin() : options.body;
    const result = await synthesizeProjectLog(
      { repoRoot, project: options.project, body },
      dependencies,
    );
    if (context.json) {
      context.logger.json(result);
    } else {
      context.logger.success(`Wrote project log synthesis: ${result.logPath}`);
    }
    process.exitCode = 0;
  } catch (error) {
    // A sealed log is a terminal refusal, reported in the same shape `append`
    // uses so a caller reading JSON can tell it from a malformed request.
    if (error instanceof ProjectLogSealedError) {
      if (context.json) {
        context.logger.json({
          status: 'sealed',
          logPath: error.logPath,
          heading: error.seal.heading,
          message: error.message,
        });
      } else {
        context.logger.error(error.message);
      }
      process.exitCode = 1;
      return;
    }
    const message = error instanceof Error ? error.message : String(error);
    if (context.json) {
      context.logger.json({ status: 'error', message });
    } else {
      context.logger.error(message);
    }
    process.exitCode = 1;
  }
}

export function createProjectLogSynthesizeCommand(
  overrides: Partial<ProjectLogSynthesizeCommandDependencies> = {},
): Command {
  const dependencies = { ...DEFAULT_COMMAND_DEPENDENCIES, ...overrides };
  return new Command('synthesize')
    .description('Complete the project log end-of-run synthesis')
    .option('--body <text>', 'Synthesis body, or - to read from stdin')
    .option(
      '--project <path>',
      'Explicit project path; defaults to the active project',
    )
    .action(async (options: SynthesizeCommandOptions, command: Command) => {
      const context = dependencies.buildCommandContext(
        readGlobalOptions(command),
      );
      await runSynthesizeCommand(options, context, dependencies);
    });
}
