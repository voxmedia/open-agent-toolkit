import { readFile } from 'node:fs/promises';

import {
  buildCommandContext,
  type CommandContext,
  type GlobalOptions,
} from '@app/command-context';
import { readGlobalOptions } from '@commands/shared/shared.utils';
import { resolveProjectRoot } from '@fs/paths';
import { Command } from 'commander';

import { createCanonicalRoleCommand } from './canonical-role';
import {
  recordProjectDispatch,
  redactDispatchMessage,
  type DispatchRecordRuntimeIdentity,
} from './record';

interface DispatchRecordCommandOptions {
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
  try {
    repoRoot = await dependencies.resolveProjectRoot(context.cwd);
    const content =
      options.eventFile === '-'
        ? await dependencies.readStdin()
        : await dependencies.readFile(options.eventFile);
    // Hand the raw event to the recorder; it owns the single authoritative
    // parse, and parsing twice would relabel the provenance of its own output.
    const raw = await recordProjectDispatch({ input: JSON.parse(content) });
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
                repo: repoRoot,
                home: context.home,
              }),
      },
    };
    if (context.json) {
      context.logger.json(result);
    } else {
      context.logger.info('Dispatch evidence is valid; nothing was written.');
      for (const line of runtimeIdentityLines(result.runtimeIdentity)) {
        context.logger.info(line);
      }
    }
    process.exitCode = 0;
  } catch (error) {
    // Single redaction boundary for every failure this command can surface.
    const message = redactDispatchMessage(
      error instanceof Error ? error.message : String(error),
      { repo: repoRoot, home: context.home },
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
    .description('Validate project dispatch provenance')
    .addCommand(
      new Command('record')
        .description(
          'Validate one generic dispatch plus namespaced OAT evidence (writes nothing)',
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
    )
    .addCommand(createCanonicalRoleCommand(dependencies));
}
