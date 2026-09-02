import { readFile } from 'node:fs/promises';
import { isAbsolute, join } from 'node:path';

import {
  buildCommandContext,
  type CommandContext,
  type GlobalOptions,
} from '@app/command-context';
import { readGlobalOptions } from '@commands/shared/shared.utils';
import { fileExists } from '@fs/io';
import { resolveProjectRoot, validateRealPathWithinScope } from '@fs/paths';
import { Command } from 'commander';

import { parseDispatchRecordInput, recordProjectDispatch } from './record';

interface DispatchRecordCommandOptions {
  project?: string;
  eventFile: string;
}

export interface ProjectDispatchCommandDependencies {
  buildCommandContext: (options: GlobalOptions) => CommandContext;
  resolveProjectRoot: (cwd: string) => Promise<string>;
  readFile: (path: string) => Promise<string>;
  readStdin: () => Promise<string>;
}

const DEFAULT_DEPENDENCIES: ProjectDispatchCommandDependencies = {
  buildCommandContext,
  resolveProjectRoot,
  readFile: (path) => readFile(path, 'utf8'),
  readStdin: async () => {
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks).toString('utf8');
  },
};

async function resolveProjectPath(
  repoRoot: string,
  project: string | undefined,
): Promise<string | null> {
  if (!project) return null;
  const candidate = isAbsolute(project) ? project : join(repoRoot, project);
  const validated = await validateRealPathWithinScope(candidate, repoRoot);
  if (!(await fileExists(join(validated.realPath, 'state.md')))) {
    throw new Error('Project path must contain a readable state.md.');
  }
  return validated.realPath;
}

async function runRecordCommand(
  options: DispatchRecordCommandOptions,
  context: CommandContext,
  dependencies: ProjectDispatchCommandDependencies,
): Promise<void> {
  try {
    const repoRoot = await dependencies.resolveProjectRoot(context.cwd);
    const projectPath = await resolveProjectPath(repoRoot, options.project);
    const content =
      options.eventFile === '-'
        ? await dependencies.readStdin()
        : await dependencies.readFile(options.eventFile);
    const input = parseDispatchRecordInput(JSON.parse(content));
    const result = await recordProjectDispatch({ projectPath, input });
    if (context.json) {
      context.logger.json(result);
    } else if (result.status === 'persisted') {
      context.logger.success(`Recorded project dispatch: ${result.path}`);
    } else {
      context.logger.info(
        'Dispatch evidence is valid; no project path was supplied, so nothing was persisted.',
      );
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

export function createProjectDispatchCommand(
  overrides: Partial<ProjectDispatchCommandDependencies> = {},
): Command {
  const dependencies = { ...DEFAULT_DEPENDENCIES, ...overrides };
  return new Command('dispatch')
    .description('Validate and persist project dispatch provenance')
    .addCommand(
      new Command('record')
        .description('Record one generic dispatch plus namespaced OAT evidence')
        .option(
          '--project <project-path>',
          'Project path; omit to validate without persistence',
        )
        .requiredOption(
          '--event-file <json-file-or-dash>',
          'Complete record and event JSON file, or - for standard input',
        )
        .action(
          async (
            options: DispatchRecordCommandOptions,
            command: Command,
          ): Promise<void> => {
            const context = dependencies.buildCommandContext(
              readGlobalOptions(command),
            );
            await runRecordCommand(options, context, dependencies);
          },
        ),
    );
}
