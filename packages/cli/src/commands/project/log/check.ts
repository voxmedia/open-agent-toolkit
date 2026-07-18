import { readFile } from 'node:fs/promises';
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
  findProjectLogSections,
  isProjectLogEntryMarker,
  JUDGMENT_HEADING_RE,
  PROJECT_LOG_TYPES,
  STRUCTURAL_HEADING_RE,
  type ProjectLogSection,
  type ProjectLogScope,
  type ProjectLogType,
} from './grammar';

export const PROJECT_LOG_FILENAME = 'project-log.md';
export const SYNTHESIS_PENDING_HEADING =
  '## End-of-run synthesis (pending — do not skip at project completion)';
export const SYNTHESIS_COMPLETE_HEADING = '## End-of-run synthesis';

export interface ProjectLogCheckResult {
  status: 'ok' | 'absent' | 'synthesis_pending';
  logPath: string | null;
  entryCounts: {
    structural: number;
    judgment: Record<ProjectLogType, number>;
  };
  scopeCounts: Record<ProjectLogScope, number>;
  lastEntryDate: string | null;
  synthesisPending: boolean;
  grammarViolations: string[];
}

export type ParsedProjectLogEntry =
  | {
      class: 'judgment';
      heading: string;
      date: string;
      scope: ProjectLogScope;
      type: ProjectLogType;
      area: string;
      body: string;
    }
  | {
      class: 'structural';
      heading: string;
      date: string;
      producer: string;
      ref: string;
      body: string;
    };

export interface ParsedProjectLog {
  entries: ParsedProjectLogEntry[];
  grammarViolations: string[];
}

export type ProjectLogSynthesisSection =
  | {
      status: 'pending';
      section: ProjectLogSection;
    }
  | {
      status: 'complete';
      section: ProjectLogSection;
    }
  | {
      status: 'missing';
    }
  | {
      status: 'ambiguous';
    };

export interface CheckProjectLogInput {
  repoRoot: string;
  project?: string;
}

export interface CheckProjectLogDependencies {
  resolveActiveProject: (repoRoot: string) => Promise<ActiveProjectResolution>;
}

export interface ProjectLogCheckCommandDependencies extends CheckProjectLogDependencies {
  buildCommandContext: (options: GlobalOptions) => CommandContext;
  resolveProjectRoot: (cwd: string) => Promise<string>;
}

const DEFAULT_CHECK_DEPENDENCIES: CheckProjectLogDependencies = {
  resolveActiveProject,
};

const DEFAULT_COMMAND_DEPENDENCIES: ProjectLogCheckCommandDependencies = {
  ...DEFAULT_CHECK_DEPENDENCIES,
  buildCommandContext,
  resolveProjectRoot,
};

function emptyCounts(): Pick<
  ProjectLogCheckResult,
  'entryCounts' | 'scopeCounts'
> {
  return {
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
  };
}

function entriesSection(content: string): string {
  const section = findProjectLogSections(content).find(
    ({ heading }) => heading === '## Entries',
  );
  if (!section) {
    return '';
  }
  return content.slice(section.start + section.heading.length, section.end);
}

export function findCanonicalProjectLogSynthesisSection(
  content: string,
): ProjectLogSynthesisSection {
  const candidates = findProjectLogSections(content).filter(
    ({ heading }) =>
      heading === SYNTHESIS_PENDING_HEADING ||
      heading === SYNTHESIS_COMPLETE_HEADING,
  );
  if (candidates.length === 0) {
    return { status: 'missing' };
  }
  if (candidates.length !== 1) {
    return { status: 'ambiguous' };
  }
  const section = candidates[0]!;
  return {
    status:
      section.heading === SYNTHESIS_PENDING_HEADING ? 'pending' : 'complete',
    section,
  };
}

export function parseProjectLogEntries(content: string): ParsedProjectLog {
  const lines = entriesSection(content).split('\n');
  const entries: ParsedProjectLogEntry[] = [];
  const grammarViolations: string[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const heading = lines[index];
    if (!heading || !isProjectLogEntryMarker(heading)) {
      continue;
    }

    const bodyLines: string[] = [];
    let cursor = index + 1;
    while (
      cursor < lines.length &&
      !isProjectLogEntryMarker(lines[cursor] ?? '')
    ) {
      bodyLines.push(lines[cursor] ?? '');
      cursor += 1;
    }
    const body = bodyLines.join('\n').trim();
    index = cursor - 1;

    const judgment = JUDGMENT_HEADING_RE.exec(heading);
    if (judgment) {
      entries.push({
        class: 'judgment',
        heading,
        date: judgment[1]!,
        scope: judgment[2] as ProjectLogScope,
        type: judgment[3] as ProjectLogType,
        area: judgment[4]!.trim(),
        body,
      });
      continue;
    }

    const structural = STRUCTURAL_HEADING_RE.exec(heading);
    if (structural) {
      entries.push({
        class: 'structural',
        heading,
        date: structural[1]!,
        producer: structural[2]!.trim(),
        ref: structural[3]!.trim(),
        body,
      });
      continue;
    }

    grammarViolations.push(heading);
  }

  return { entries, grammarViolations };
}

async function resolveTargetProject(
  input: CheckProjectLogInput,
  dependencies: CheckProjectLogDependencies,
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

export async function checkProjectLog(
  input: CheckProjectLogInput,
  overrides: Partial<CheckProjectLogDependencies> = {},
): Promise<ProjectLogCheckResult> {
  const dependencies = { ...DEFAULT_CHECK_DEPENDENCIES, ...overrides };
  const projectPath = await resolveTargetProject(input, dependencies);
  const logPath = join(projectPath, PROJECT_LOG_FILENAME);
  if (!(await fileExists(logPath))) {
    return {
      status: 'absent',
      logPath: null,
      ...emptyCounts(),
      lastEntryDate: null,
      synthesisPending: false,
      grammarViolations: [],
    };
  }

  const content = await readFile(logPath, 'utf8');
  const parsed = parseProjectLogEntries(content);
  const counts = emptyCounts();
  for (const entry of parsed.entries) {
    if (entry.class === 'structural') {
      counts.entryCounts.structural += 1;
    } else {
      counts.entryCounts.judgment[entry.type] += 1;
      counts.scopeCounts[entry.scope] += 1;
    }
  }
  const synthesisPending = findProjectLogSections(content).some(
    ({ heading }) => heading === SYNTHESIS_PENDING_HEADING,
  );

  return {
    status: synthesisPending ? 'synthesis_pending' : 'ok',
    logPath,
    ...counts,
    lastEntryDate: parsed.entries.at(-1)?.date ?? null,
    synthesisPending,
    grammarViolations: parsed.grammarViolations,
  };
}

interface CheckCommandOptions {
  project?: string;
  requireSynthesis?: boolean;
}

async function runCheckCommand(
  options: CheckCommandOptions,
  context: CommandContext,
  dependencies: ProjectLogCheckCommandDependencies,
): Promise<void> {
  try {
    const repoRoot = await dependencies.resolveProjectRoot(context.cwd);
    const result = await checkProjectLog(
      { repoRoot, project: options.project },
      dependencies,
    );
    if (context.json) {
      context.logger.json(result);
    } else {
      context.logger.info(
        result.status === 'absent'
          ? 'Project log: absent'
          : `Project log: ${result.status}; entries: ${
              result.entryCounts.structural +
              PROJECT_LOG_TYPES.reduce(
                (total, type) => total + result.entryCounts.judgment[type],
                0,
              )
            }`,
      );
    }
    process.exitCode =
      options.requireSynthesis && result.synthesisPending ? 1 : 0;
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

export function createProjectLogCheckCommand(
  overrides: Partial<ProjectLogCheckCommandDependencies> = {},
): Command {
  const dependencies = { ...DEFAULT_COMMAND_DEPENDENCIES, ...overrides };
  return new Command('check')
    .description('Inspect project-log entries and synthesis status')
    .option(
      '--project <path>',
      'Explicit project path; defaults to the active project',
    )
    .option(
      '--require-synthesis',
      'Exit 1 when the project log still has pending synthesis',
    )
    .action(async (options: CheckCommandOptions, command: Command) => {
      const context = dependencies.buildCommandContext(
        readGlobalOptions(command),
      );
      await runCheckCommand(options, context, dependencies);
    });
}
