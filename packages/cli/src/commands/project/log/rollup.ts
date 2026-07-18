import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, isAbsolute, join, resolve } from 'node:path';

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
import { resolveEffectiveConfig, type ResolvedConfig } from '@config/resolve';
import { dirExists, fileExists } from '@fs/io';
import { resolveProjectRoot } from '@fs/paths';
import { Command } from 'commander';

import {
  parseProjectLogEntries,
  PROJECT_LOG_FILENAME,
  type ParsedProjectLogEntry,
} from './check';

const DEFAULT_LEDGER_PATH = '.oat/repo/reference/project-observations.md';
const WORKFLOW_OBSERVATIONS_HEADING = '## Workflow Observations';

export interface ProjectLogArtifactTarget {
  filename: string;
  summaryHeading?: string;
}

export const DEFAULT_PROJECT_LOG_ARTIFACT_TARGET: ProjectLogArtifactTarget = {
  filename: PROJECT_LOG_FILENAME,
  summaryHeading: WORKFLOW_OBSERVATIONS_HEADING,
};

export interface RollupProjectLogInput {
  repoRoot: string;
  home?: string;
  project?: string;
  summaryPath?: string;
  artifactTarget?: ProjectLogArtifactTarget;
}

export interface ProjectLogRollupResult {
  status: 'ok' | 'failed';
  summarySection: 'written' | 'updated';
  ledgerOutcome: 'appended' | 'deduplicated' | 'skipped_permitted' | 'failed';
  entriesRolledUp: number;
}

export interface RollupProjectLogDependencies {
  resolveActiveProject: (repoRoot: string) => Promise<ActiveProjectResolution>;
  resolveEffectiveConfig: (
    repoRoot: string,
    userConfigDir: string,
    env?: NodeJS.ProcessEnv,
  ) => Promise<ResolvedConfig>;
}

export interface ProjectLogRollupCommandDependencies extends RollupProjectLogDependencies {
  buildCommandContext: (options: GlobalOptions) => CommandContext;
  resolveProjectRoot: (cwd: string) => Promise<string>;
}

const DEFAULT_ROLLUP_DEPENDENCIES: RollupProjectLogDependencies = {
  resolveActiveProject,
  resolveEffectiveConfig,
};

const DEFAULT_COMMAND_DEPENDENCIES: ProjectLogRollupCommandDependencies = {
  ...DEFAULT_ROLLUP_DEPENDENCIES,
  buildCommandContext,
  resolveProjectRoot,
};

async function resolveTargetProject(
  input: RollupProjectLogInput,
  dependencies: RollupProjectLogDependencies,
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

function renderEntries(entries: ParsedProjectLogEntry[]): string {
  return entries
    .map((entry) =>
      entry.body ? `${entry.heading}\n\n${entry.body}` : entry.heading,
    )
    .join('\n\n');
}

function writeSummarySection(
  content: string,
  heading: string,
  body: string,
): {
  content: string;
  outcome: ProjectLogRollupResult['summarySection'];
} {
  const escapedHeading = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const marker = new RegExp(`^${escapedHeading}\\s*$`, 'm').exec(content);
  const section = `${heading}\n\n${body}\n`;
  if (!marker) {
    return {
      content: `${content.trimEnd()}\n\n${section}`,
      outcome: 'written',
    };
  }

  const remainder = content.slice(marker.index + marker[0].length);
  const nextHeading = /^## .+$/m.exec(remainder);
  const end =
    nextHeading?.index === undefined
      ? content.length
      : marker.index + marker[0].length + nextHeading.index;
  return {
    content: `${content.slice(0, marker.index)}${section}${
      end < content.length ? `\n${content.slice(end).trimStart()}` : ''
    }`,
    outcome: 'updated',
  };
}

interface ProjectLogLedgerTarget {
  path: string;
  explicitlyConfigured: boolean;
  defaultReferenceLayer: string;
}

export async function resolveProjectLogLedgerTarget(
  repoRoot: string,
  home: string,
  dependencies: Pick<
    RollupProjectLogDependencies,
    'resolveEffectiveConfig'
  > = DEFAULT_ROLLUP_DEPENDENCIES,
): Promise<ProjectLogLedgerTarget> {
  const effective = await dependencies.resolveEffectiveConfig(
    repoRoot,
    join(home, '.oat'),
  );
  const entry = effective.resolved['workflow.projectLogLedgerPath'];
  const configuredPath =
    typeof entry?.value === 'string' && entry.value.trim()
      ? entry.value.trim()
      : DEFAULT_LEDGER_PATH;
  return {
    path: isAbsolute(configuredPath)
      ? resolve(configuredPath)
      : resolve(repoRoot, configuredPath),
    explicitlyConfigured: entry?.source !== 'default',
    defaultReferenceLayer: resolve(repoRoot, dirname(DEFAULT_LEDGER_PATH)),
  };
}

function ledgerKey(
  entry: Extract<ParsedProjectLogEntry, { class: 'judgment' }>,
): string {
  return `${entry.date}\u0000${entry.area.toLowerCase()}`;
}

function existingLedgerKeys(content: string): Set<string> {
  const keys = new Set<string>();
  const headingPattern =
    /^### (\d{4}-\d{2}-\d{2}) · (?:project|general) · (?:bug|friction|worked-well|feedback) · ([^·\r\n]+)$/gm;
  for (const match of content.matchAll(headingPattern)) {
    keys.add(`${match[1]}\u0000${match[2]!.trim().toLowerCase()}`);
  }
  return keys;
}

async function rollupLedger(
  input: RollupProjectLogInput,
  entries: ParsedProjectLogEntry[],
  dependencies: RollupProjectLogDependencies,
): Promise<ProjectLogRollupResult['ledgerOutcome']> {
  const target = await resolveProjectLogLedgerTarget(
    input.repoRoot,
    input.home ?? homedir(),
    dependencies,
  );
  if (
    !target.explicitlyConfigured &&
    !(await dirExists(target.defaultReferenceLayer))
  ) {
    return 'skipped_permitted';
  }

  try {
    const existing = (await fileExists(target.path))
      ? await readFile(target.path, 'utf8')
      : '# Project Observations\n\n## Entries\n';
    const keys = existingLedgerKeys(existing);
    const candidates = entries.filter(
      (entry): entry is Extract<ParsedProjectLogEntry, { class: 'judgment' }> =>
        entry.class === 'judgment' && entry.scope === 'general',
    );
    const additions: typeof candidates = [];
    for (const entry of candidates) {
      const key = ledgerKey(entry);
      if (keys.has(key)) {
        continue;
      }
      keys.add(key);
      additions.push(entry);
    }
    if (additions.length === 0) {
      return 'deduplicated';
    }
    await mkdir(dirname(target.path), { recursive: true });
    await writeFile(
      target.path,
      `${existing.trimEnd()}\n\n${renderEntries(additions)}\n`,
      'utf8',
    );
    return 'appended';
  } catch {
    return 'failed';
  }
}

export async function rollupProjectLog(
  input: RollupProjectLogInput,
  overrides: Partial<RollupProjectLogDependencies> = {},
): Promise<ProjectLogRollupResult> {
  const dependencies = {
    ...DEFAULT_ROLLUP_DEPENDENCIES,
    ...overrides,
  };
  const artifactTarget = {
    ...DEFAULT_PROJECT_LOG_ARTIFACT_TARGET,
    ...input.artifactTarget,
  };
  const projectPath = await resolveTargetProject(input, dependencies);
  const logPath = join(projectPath, artifactTarget.filename);
  if (!(await fileExists(logPath))) {
    throw new Error(`Project log does not exist: ${logPath}.`);
  }

  const summaryPath = input.summaryPath
    ? isAbsolute(input.summaryPath)
      ? resolve(input.summaryPath)
      : resolve(input.repoRoot, input.summaryPath)
    : join(projectPath, 'summary.md');
  if (!(await fileExists(summaryPath))) {
    throw new Error(
      `summary.md does not exist: ${summaryPath}. Author the project summary before roll-up.`,
    );
  }

  const parsed = parseProjectLogEntries(await readFile(logPath, 'utf8'));
  const summaryUpdate = writeSummarySection(
    await readFile(summaryPath, 'utf8'),
    artifactTarget.summaryHeading ?? WORKFLOW_OBSERVATIONS_HEADING,
    renderEntries(parsed.entries),
  );
  await writeFile(summaryPath, summaryUpdate.content, 'utf8');

  const ledgerOutcome = await rollupLedger(input, parsed.entries, dependencies);
  return {
    status: ledgerOutcome === 'failed' ? 'failed' : 'ok',
    summarySection: summaryUpdate.outcome,
    ledgerOutcome,
    entriesRolledUp: parsed.entries.length,
  };
}

interface RollupCommandOptions {
  project?: string;
  summaryPath?: string;
}

async function runRollupCommand(
  options: RollupCommandOptions,
  context: CommandContext,
  dependencies: ProjectLogRollupCommandDependencies,
): Promise<void> {
  try {
    const repoRoot = await dependencies.resolveProjectRoot(context.cwd);
    const result = await rollupProjectLog(
      {
        repoRoot,
        home: context.home,
        project: options.project,
        summaryPath: options.summaryPath,
      },
      dependencies,
    );
    if (context.json) {
      context.logger.json(result);
    } else if (result.status === 'ok') {
      context.logger.success(
        `Rolled up ${result.entriesRolledUp} project log entries.`,
      );
      if (result.ledgerOutcome === 'skipped_permitted') {
        context.logger.warn(
          'Skipped the project-observations ledger because the default reference layer is absent.',
        );
      }
    } else {
      context.logger.error(
        'Project log summary was written, but the configured ledger write failed.',
      );
    }
    process.exitCode = result.status === 'ok' ? 0 : 1;
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

export function createProjectLogRollupCommand(
  overrides: Partial<ProjectLogRollupCommandDependencies> = {},
): Command {
  const dependencies = { ...DEFAULT_COMMAND_DEPENDENCIES, ...overrides };
  return new Command('rollup')
    .description(
      'Write project-log observations to summary and repository ledger',
    )
    .option(
      '--project <path>',
      'Explicit project path; defaults to the active project',
    )
    .option(
      '--summary-path <path>',
      'Summary path relative to the repository; defaults to project summary.md',
    )
    .action(async (options: RollupCommandOptions, command: Command) => {
      const context = dependencies.buildCommandContext(
        readGlobalOptions(command),
      );
      await runRollupCommand(options, context, dependencies);
    });
}
