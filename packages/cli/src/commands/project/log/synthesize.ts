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
  PROJECT_LOG_FILENAME,
  SYNTHESIS_COMPLETE_HEADING,
  SYNTHESIS_PENDING_HEADING,
} from './check';

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
}

export interface ProjectLogSynthesizeCommandDependencies extends SynthesizeProjectLogDependencies {
  buildCommandContext: (options: GlobalOptions) => CommandContext;
  resolveProjectRoot: (cwd: string) => Promise<string>;
  readStdin: () => Promise<string>;
}

const DEFAULT_SYNTHESIZE_DEPENDENCIES: SynthesizeProjectLogDependencies = {
  resolveActiveProject,
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

  const projectPath = await resolveTargetProject(input, dependencies);
  const logPath = join(projectPath, PROJECT_LOG_FILENAME);
  if (!(await fileExists(logPath))) {
    throw new Error(
      `Project log does not exist: ${logPath}. Append an entry before synthesizing.`,
    );
  }

  const content = await readFile(logPath, 'utf8');
  const pendingIndex = content.indexOf(SYNTHESIS_PENDING_HEADING);
  if (pendingIndex < 0) {
    if (content.includes(`${SYNTHESIS_COMPLETE_HEADING}\n`)) {
      throw new Error(
        'End-of-run synthesis is already written; append a correction judgment instead of replacing it.',
      );
    }
    throw new Error(
      'Project log is missing the pending synthesis marker and cannot be synthesized safely.',
    );
  }

  const nextContent = `${content.slice(
    0,
    pendingIndex,
  )}${SYNTHESIS_COMPLETE_HEADING}\n\n${body}\n`;
  await writeFile(logPath, nextContent, 'utf8');
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
