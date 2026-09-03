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

import {
  recordProjectDispatch,
  redactDispatchMessage,
  type DispatchRecordRuntimeIdentity,
} from './record';

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

function axes(values: readonly (readonly [string, string | null])[]): string {
  return values
    .map(([name, value]) => `${name}=${value ?? 'not-reported'}`)
    .join(' ');
}

/**
 * Render the two layers separately. Configured invocation is launcher-owned and
 * immutable; runtime observation is optional per-run corroboration. They are
 * never combined into one "effective" identity, because a mismatch must stay
 * legible as a mismatch rather than silently overwrite either side.
 */
function runtimeIdentityLines(
  identity: DispatchRecordRuntimeIdentity,
): string[] {
  const { configured, observed } = identity;
  return [
    `Configured invocation (immutable): ${axes([
      ['role', configured.roleName],
      ['role_selector', configured.roleSelector],
      ['model', configured.model],
      ['effort', configured.effort],
      ['service_tier', configured.serviceTier],
    ])}`,
    observed === null
      ? `Observed runtime identity: not reported${
          identity.reason === null ? '' : ` (${identity.reason})`
        } (corroboration only; the configured invocation is unchanged).`
      : `Observed runtime identity (${observed.source}, ${identity.match} on ${
          identity.comparedAxes.length === 0
            ? 'no comparable axis'
            : identity.comparedAxes.join('+')
        }): ${axes([
          ['lineage', observed.childLineage],
          ['role', observed.role],
          ['model', observed.model],
          ['effort', observed.effort],
          ['service_tier', observed.serviceTier],
        ])}`,
  ];
}

async function runRecordCommand(
  options: DispatchRecordCommandOptions,
  context: CommandContext,
  dependencies: ProjectDispatchCommandDependencies,
): Promise<void> {
  let repoRoot: string | null = null;
  let projectPath: string | null = null;
  try {
    repoRoot = await dependencies.resolveProjectRoot(context.cwd);
    projectPath = await resolveProjectPath(repoRoot, options.project);
    const content =
      options.eventFile === '-'
        ? await dependencies.readStdin()
        : await dependencies.readFile(options.eventFile);
    // Hand the raw event to the recorder; it owns the single authoritative
    // parse, and parsing twice would relabel the provenance of its own output.
    const raw = await recordProjectDispatch({
      projectPath,
      input: JSON.parse(content),
    });
    // The degradation reason is caller-influenced text on the success path, so
    // it goes through the same single redaction boundary as every failure
    // message. Producing a message that skips this boundary is exactly the
    // per-producer regression this command was restructured to prevent.
    const result: typeof raw = {
      ...raw,
      runtimeIdentity: {
        ...raw.runtimeIdentity,
        reason:
          raw.runtimeIdentity.reason === null
            ? null
            : redactDispatchMessage(raw.runtimeIdentity.reason, {
                project: projectPath,
                repo: repoRoot,
                home: context.home,
              }),
      },
    };
    if (context.json) {
      context.logger.json(result);
    } else {
      if (result.status === 'persisted') {
        context.logger.success(`Recorded project dispatch: ${result.path}`);
      } else {
        context.logger.info(
          'Dispatch evidence is valid; no project path was supplied, so nothing was persisted.',
        );
      }
      for (const line of runtimeIdentityLines(result.runtimeIdentity)) {
        context.logger.info(line);
      }
    }
    process.exitCode = 0;
  } catch (error) {
    // Single redaction boundary for every failure this command can surface.
    const message = redactDispatchMessage(
      error instanceof Error ? error.message : String(error),
      { project: projectPath, repo: repoRoot, home: context.home },
    );
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
