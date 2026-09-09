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
  carriesProjectLogSealKey,
  containsAmbiguousProjectLogMarker,
  findProjectLogSealHeadingLine,
  findProjectLogSections,
  isProjectLogEntryMarker,
  isProjectLogSealEntry,
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

/**
 * The completion seal a project log already carries.
 *
 * `count` is reported rather than collapsed so a log double-sealed before the
 * seal append became idempotent stays legible instead of looking like a normal
 * single-sealed log; `heading` is always the **first** seal, which is the one
 * that actually closed the log.
 */
export interface ProjectLogSeal {
  heading: string;
  date: string;
  keyed: boolean;
  count: number;
}

export interface ProjectLogCheckResult {
  /**
   * A *sealed* log deliberately keeps its ordinary status and carries `sealed`
   * alongside it, because it is a healthy log that must keep routing normally —
   * a distinct value there would break every `status: "ok"` route in
   * `oat-project-complete/SKILL.md` and `oat-project-summary/SKILL.md`.
   *
   * `ambiguous` is the opposite case and is the one value that may join them.
   * The log's markers have two readings, so no verdict below can be computed
   * honestly: every other field is zeroed and must be treated as unknown, not as
   * a finding. Breaking the routing is the point — both mutators already refuse
   * this file, and `check` answering `ok` while they refuse is what let the
   * completion gate trust a reader that disagreed with every writer.
   */
  status: 'ok' | 'absent' | 'synthesis_pending' | 'ambiguous';
  /** Why the log has two readings, or null when it has one. */
  ambiguity: string | null;
  sealed: boolean;
  seal: ProjectLogSeal | null;
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

/** The heading that opens the region entries are parsed from. */
const ENTRIES_HEADING = '## Entries';

function entriesSection(content: string): string {
  const section = findProjectLogSections(content).find(
    ({ heading }) => heading === ENTRIES_HEADING,
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

/**
 * Parses the entries region into typed entries.
 *
 * The split is `/\r?\n/`, not `'\n'`. With a bare LF split every line of a
 * CRLF log keeps a trailing `\r`, which no heading pattern can match — their
 * `$` sits after a `[^·\r\n]+` run — so a CRLF log parsed to zero entries and
 * an existing completion seal was invisible to `check` and to the append guard.
 * A *lone* CR is still not a boundary, which is what keeps a body from forging
 * a heading; only the CRLF pair is folded in.
 */
export function parseProjectLogEntries(content: string): ParsedProjectLog {
  const lines = entriesSection(content).split(/\r?\n/);
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

/**
 * Summarizes the completion seal carried by already-parsed entries.
 *
 * Seal identity is `isProjectLogSealEntry` and nothing else, so `check` and
 * `append` cannot drift apart on what "sealed" means.
 */
export function summarizeProjectLogSeal(
  entries: readonly ParsedProjectLogEntry[],
): ProjectLogSeal | null {
  const seals = entries.filter(
    (entry) => entry.class === 'structural' && isProjectLogSealEntry(entry),
  );
  const first = seals[0];
  if (first === undefined) {
    return null;
  }
  return {
    heading: first.heading,
    date: first.date,
    keyed: carriesProjectLogSealKey(first.body),
    count: seals.length,
  };
}

/**
 * Finds the completion seal in raw project-log content.
 *
 * `append` uses this so its refusal and `check`'s report are the same reading
 * of the same file.
 */
/**
 * Explains a refusal caused by a seal the entries parser cannot reach, naming
 * the actual obstruction.
 *
 * The first version of this message assumed the only way to hide a seal was to
 * place it outside `## Entries`, and offered that remedy for a CRLF log whose
 * seal sat exactly where it belonged — a remedy that did not apply and could
 * not be followed, on the one path a completion run cannot get past.
 *
 * Shared by both mutators so one file cannot produce two different accounts of
 * why it was refused.
 */
export function unreachableProjectLogSealError(
  logPath: string,
  content: string,
  seal: { line: string; index: number },
): Error {
  // Compared by offset, not by substring membership: prose inside `## Entries`
  // can quote a seal heading verbatim, and a membership test would then report a
  // seal that really sits under a later section as correctly placed, sending the
  // operator to rewrite line terminators that were never the obstruction.
  const entries = findProjectLogSections(content).find(
    ({ heading }) => heading === ENTRIES_HEADING,
  );
  const outsideEntries =
    entries === undefined ||
    seal.index < entries.start ||
    seal.index >= entries.end;
  return new Error(
    `Project log ${logPath} already carries the completion-seal heading '${seal.line.trim()}', but the entries parser cannot reach it, so nothing may be written without risking a change past the seal. ${
      outsideEntries
        ? `The seal sits outside the '${ENTRIES_HEADING}' section; move it under that heading, then retry.`
        : 'The seal is under the correct heading, so the obstruction is its line terminators; rewrite the log with line feeds, then retry.'
    }`,
  );
}

export function findProjectLogSeal(content: string): ProjectLogSeal | null {
  return summarizeProjectLogSeal(parseProjectLogEntries(content).entries);
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
      ambiguity: null,
      sealed: false,
      seal: null,
      logPath: null,
      ...emptyCounts(),
      lastEntryDate: null,
      synthesisPending: false,
      grammarViolations: [],
    };
  }

  const content = await readFile(logPath, 'utf8');

  // Fail closed, exactly as both mutators do on this same file. `check` used to
  // be the one reader that always produced a confident verdict: on a
  // `preamble<U+2028>## Entries` log it answered `sealed` and count fields the
  // writers refused to act on, and the completion gate keys on those fields.
  if (containsAmbiguousProjectLogMarker(content)) {
    return {
      status: 'ambiguous',
      ambiguity: `Project log ${logPath} has a '## ' or '### ' heading starting a line after a carriage return, U+2028, or U+2029 rather than a line feed, so its structure has two readings and no seal or count can be reported honestly. Replace those line terminators with line feeds.`,
      sealed: false,
      seal: null,
      logPath,
      ...emptyCounts(),
      lastEntryDate: null,
      synthesisPending: false,
      grammarViolations: [],
    };
  }

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

  const seal = summarizeProjectLogSeal(parsed.entries);

  // A seal that is plainly in the file but that the parser cannot reach is the
  // same disagreement in a different shape: a reader grepping the log sees a
  // completion seal, this function would report `sealed: false`, and both
  // mutators refuse to write. Reporting it as ambiguous keeps all three readers
  // saying one thing about one file.
  if (seal === null) {
    const unreachableSeal = findProjectLogSealHeadingLine(content);
    if (unreachableSeal !== undefined) {
      return {
        status: 'ambiguous',
        ambiguity: `Project log ${logPath} carries the completion-seal heading '${unreachableSeal.line.trim()}', but it lies outside the parseable '## Entries' region, so whether the log is sealed has two answers. Move the seal under '## Entries' with line-feed endings, then retry.`,
        sealed: false,
        seal: null,
        logPath,
        ...emptyCounts(),
        lastEntryDate: null,
        synthesisPending: false,
        grammarViolations: [],
      };
    }
  }

  return {
    status: synthesisPending ? 'synthesis_pending' : 'ok',
    ambiguity: null,
    sealed: seal !== null,
    seal,
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
    } else if (result.status === 'ambiguous') {
      context.logger.error(result.ambiguity ?? 'Project log has two readings.');
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
            }${
              result.seal
                ? `; sealed${
                    result.seal.count > 1
                      ? ` (${result.seal.count} seal entries)`
                      : ''
                  }`
                : ''
            }`,
      );
    }
    // An ambiguous log exits non-zero whether or not synthesis was required: a
    // caller that only checks the exit status must not read this as a clean log,
    // and both mutators refuse the same file.
    process.exitCode =
      result.status === 'ambiguous' ||
      (options.requireSynthesis === true && result.synthesisPending)
        ? 1
        : 0;
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
