import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { basename, dirname, isAbsolute, join, resolve } from 'node:path';

import {
  buildCommandContext,
  type CommandContext,
  type GlobalOptions,
} from '@app/command-context';
import { readGlobalOptions } from '@commands/shared/shared.utils';
import {
  DEFAULT_PROJECT_LOG_DIGEST_MAX_ENTRIES,
  DEFAULT_PROJECT_LOG_DIGEST_MAX_LINES,
  isValidProjectLogDigestBound,
  resolveActiveProject,
  type ActiveProjectResolution,
} from '@config/oat-config';
import { resolveEffectiveConfig, type ResolvedConfig } from '@config/resolve';
import { dirExists, fileExists } from '@fs/io';
import { resolveProjectRoot } from '@fs/paths';
import { Command } from 'commander';

import {
  findProjectLogAmbiguity,
  parseProjectLogEntries,
  PROJECT_LOG_FILENAME,
  type ParsedProjectLogEntry,
} from './check';
import { parseProjectLogBodyHead } from './grammar';

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

/**
 * What the Workflow Observations digest selected, reported under `--json`
 * without copying any entry body.
 */
export interface ProjectLogDigestReport {
  /** The bounds the digest was rendered under, after config resolution. */
  maxEntries: number;
  maxLines: number;
  /** Judgment entries rendered into the summary section. */
  rendered: number;
  omitted: {
    /** Judgment entries left out by the entry or line bound. */
    overBound: number;
    /** Structural entries, which are provenance and never rendered. */
    structural: number;
    /** `### ` headings that match neither grammar, skipped individually. */
    malformed: number;
  };
  /** Locator tokens of the over-bound judgment entries, in priority order. */
  omittedEntries: string[];
  /**
   * Rendered and omitted counts per producer: a judgment entry's `**Origin:**`
   * (or `unattributed`), a structural entry's producer.
   */
  byProducer: Record<string, { rendered: number; omitted: number }>;
}

/** The outcome of a roll-up that actually read the log. */
export interface ProjectLogRollupSuccess {
  status: 'ok' | 'failed';
  /**
   * `omitted` when the log has no judgment entry to digest: an existing
   * Workflow Observations section is removed and none is created.
   */
  summarySection: 'written' | 'updated' | 'omitted';
  ledgerOutcome: 'appended' | 'deduplicated' | 'skipped_permitted' | 'failed';
  /** Every entry read from the log, structural and judgment. */
  entriesRolledUp: number;
  digest: ProjectLogDigestReport;
}

export type ProjectLogRollupResult =
  | ProjectLogRollupSuccess
  /**
   * The log has two readings, so its entries cannot be rolled up honestly.
   *
   * A separate member rather than an extra field, because the success member's
   * counts would otherwise have to be filled in with zeros — and reporting
   * `entriesRolledUp: 0` for an unreadable log is exactly the conflation this
   * refusal exists to remove: it was byte-identical to the output for an empty
   * one.
   */
  | { status: 'ambiguous'; ambiguity: string };

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

type JudgmentEntry = Extract<ParsedProjectLogEntry, { class: 'judgment' }>;

/**
 * The prefix of the export-safe source locator a digest item and a summary
 * recommendation carry. It is a plain token, never a Markdown link: the log is
 * archived with the project and is not retrievable from a tracked export, so
 * the archive export (not this command) finalizes the token to the archive
 * identity.
 */
export const PROJECT_LOG_LOCATOR_PREFIX = 'oat-project:';

function slugifyArea(area: string): string {
  return (
    area
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'entry'
  );
}

/**
 * Assigns each judgment entry its collision-safe entry id:
 * `<date>-<type>-<area slug>-<n>`, where `n` counts, from 1 in log order, the
 * judgment entries sharing that date, type and area slug. The log is
 * append-only, so an id never changes once assigned.
 */
export function assignProjectLogEntryIds(
  entries: readonly ParsedProjectLogEntry[],
): Map<JudgmentEntry, string> {
  const ids = new Map<JudgmentEntry, string>();
  const ordinals = new Map<string, number>();
  for (const entry of entries) {
    if (entry.class !== 'judgment') continue;
    const stem = `${entry.date}-${entry.type}-${slugifyArea(entry.area)}`;
    const ordinal = (ordinals.get(stem) ?? 0) + 1;
    ordinals.set(stem, ordinal);
    ids.set(entry, `${stem}-${ordinal}`);
  }
  return ids;
}

/** `oat-project:<slug>#<entry-id>`. */
export function projectLogEntryLocator(slug: string, entryId: string): string {
  return `${PROJECT_LOG_LOCATOR_PREFIX}${slug}#${entryId}`;
}

const LIVE_PROJECT_PATH_RE =
  /(?:[^\s`'"()<>[\]]*\/)?\.oat\/projects\/(?:shared|local|synced)\/[^\s/`'"()<>[\]]+(?:\/([^\s`'"()<>[\]]*))?/g;

/**
 * Removes live project-directory paths from text bound for `summary.md`.
 *
 * A `.oat/projects/<scope>/<slug>/…` path stops resolving once the project is
 * archived, and the summary is the one artifact exported into the tracked
 * repository. The project-relative remainder is kept and labelled, so a review
 * file name or run artifact stays identifiable.
 */
export function sanitizeLiveProjectPaths(text: string): string {
  return text.replace(LIVE_PROJECT_PATH_RE, (_match, rest?: string) => {
    const trimmed = (rest ?? '').replace(/[.,;:]+$/, '');
    const trailing = (rest ?? '').slice(trimmed.length);
    return trimmed
      ? `(project file ${trimmed})${trailing}`
      : `(project directory)${trailing}`;
  });
}

function firstSentence(text: string): string {
  const collapsed = text.replace(/\s+/g, ' ').trim();
  const match = /^.*?[.!?](?=\s|$)/.exec(collapsed);
  return match ? match[0] : collapsed;
}

function labelledLine(lines: string[], labels: RegExp): string | undefined {
  for (const line of lines) {
    const match = labels.exec(line.trim());
    if (match) return match[1]!.trim();
  }
  return undefined;
}

const CATEGORY_PRIORITY: Record<string, number> = { decision: 0, gotcha: 1 };

function categoryRank(entry: JudgmentEntry): number {
  return entry.category === undefined
    ? 2
    : (CATEGORY_PRIORITY[entry.category] ?? 2);
}

/**
 * The digest's deterministic order: newest first, then `decision` and
 * `gotcha` ahead of every other category, then heading text, then entry id.
 */
function compareDigestEntries(
  ids: Map<JudgmentEntry, string>,
): (left: JudgmentEntry, right: JudgmentEntry) => number {
  return (left, right) =>
    right.date.localeCompare(left.date) ||
    categoryRank(left) - categoryRank(right) ||
    left.heading.localeCompare(right.heading) ||
    ids.get(left)!.localeCompare(ids.get(right)!);
}

/**
 * One concise digest item: a header line carrying date, type, area, scope,
 * category and the locator token, then the first observation sentence and any
 * limitation and uncertainty. A recommendation is rendered only for an
 * uncategorized entry; a categorized entry's synthesized recommendation is
 * owned by the summary's Autonomous Execution Learnings section, so rendering
 * it here too would state it twice.
 */
function renderDigestItem(entry: JudgmentEntry, locator: string): string[] {
  const { rest } = parseProjectLogBodyHead(entry.body);
  const lines = rest.split('\n');
  const observation =
    labelledLine(lines, /^Observation:\s*(.+)$/i) ??
    lines.find((line) => line.trim() !== '')?.trim() ??
    '';
  const meta = [entry.scope, ...(entry.category ? [entry.category] : [])];
  const item = [
    `- **${entry.date} · ${entry.type} · ${entry.area}** (${meta.join(', ')}) \`${locator}\``,
  ];
  if (observation) item.push(`  ${firstSentence(observation)}`);
  const limitation = labelledLine(
    lines,
    /^(?:Environment limitations?|Limitations?):\s*(.+)$/i,
  );
  if (limitation) item.push(`  Limitation: ${limitation}`);
  const uncertainty = labelledLine(lines, /^Uncertainty:\s*(.+)$/i);
  if (uncertainty) item.push(`  Uncertainty: ${uncertainty}`);
  if (entry.category === undefined) {
    const recommendation = labelledLine(lines, /^Recommendation:\s*(.+)$/i);
    if (recommendation) item.push(`  Recommendation: ${recommendation}`);
  }
  return item.map((line) => sanitizeLiveProjectPaths(line));
}

export interface ProjectLogDigest {
  /** The section body, or undefined when there is no judgment entry. */
  body: string | undefined;
  report: ProjectLogDigestReport;
}

/**
 * Projects the log into the bounded Workflow Observations digest.
 *
 * Only judgment entries are eligible; structural entries are provenance and
 * stay in the log. Items are taken in priority order while both bounds hold:
 * at most `maxEntries` items, and at most `maxLines` lines for the whole
 * section body including the omitted-count trailer and the cross-reference.
 * Selection never feeds the ledger, which graduates the complete judgment set.
 */
export function renderProjectLogDigest(
  parsed: { entries: ParsedProjectLogEntry[]; grammarViolations: string[] },
  slug: string,
  bounds: { maxEntries: number; maxLines: number },
): ProjectLogDigest {
  const ids = assignProjectLogEntryIds(parsed.entries);
  const judgments = parsed.entries
    .filter((entry): entry is JudgmentEntry => entry.class === 'judgment')
    .sort(compareDigestEntries(ids));
  const byProducer: ProjectLogDigestReport['byProducer'] = {};
  const tally = (producer: string, key: 'rendered' | 'omitted'): void => {
    byProducer[producer] ??= { rendered: 0, omitted: 0 };
    byProducer[producer][key] += 1;
  };
  let structural = 0;
  for (const entry of parsed.entries) {
    if (entry.class === 'structural') {
      structural += 1;
      tally(entry.producer, 'omitted');
    }
  }

  const hasCategorized = judgments.some(
    (entry) => entry.category !== undefined,
  );
  const crossReference =
    'Synthesized recommendations for categorized learnings are in the Autonomous Execution Learnings section.';
  const rendered: string[] = [];
  const omittedEntries: string[] = [];
  let renderedCount = 0;
  for (const entry of judgments) {
    const locator = projectLogEntryLocator(slug, ids.get(entry)!);
    const item = renderDigestItem(entry, locator);
    const remaining = judgments.length - renderedCount - 1;
    // Lines the section would need with this item: the items so far, this one,
    // and the trailer and cross-reference blocks (two lines each with their
    // blank separator) that would follow it.
    const reserved = (remaining > 0 ? 2 : 0) + (hasCategorized ? 2 : 0);
    const fits =
      omittedEntries.length === 0 &&
      renderedCount < bounds.maxEntries &&
      rendered.length + item.length + reserved <= bounds.maxLines;
    if (fits) {
      rendered.push(...item);
      renderedCount += 1;
      tally(entry.origin ?? 'unattributed', 'rendered');
    } else {
      omittedEntries.push(locator);
      tally(entry.origin ?? 'unattributed', 'omitted');
    }
  }

  const report: ProjectLogDigestReport = {
    maxEntries: bounds.maxEntries,
    maxLines: bounds.maxLines,
    rendered: renderedCount,
    omitted: {
      overBound: omittedEntries.length,
      structural,
      malformed: parsed.grammarViolations.length,
    },
    omittedEntries,
    byProducer,
  };
  if (judgments.length === 0) {
    return { body: undefined, report };
  }
  const blocks = rendered.length > 0 ? [rendered.join('\n')] : [];
  if (omittedEntries.length > 0) {
    blocks.push(
      `_${omittedEntries.length} more judgment ${
        omittedEntries.length === 1 ? 'entry is' : 'entries are'
      } omitted by the digest bound (${bounds.maxEntries} entries, ${bounds.maxLines} lines); the archived project log keeps every entry._`,
    );
  }
  if (hasCategorized) blocks.push(crossReference);
  return { body: blocks.join('\n\n'), report };
}

function writeSummarySection(
  content: string,
  heading: string,
  body: string | undefined,
): {
  content: string;
  outcome: ProjectLogRollupSuccess['summarySection'];
} {
  const escapedHeading = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const marker = new RegExp(`^${escapedHeading}\\s*$`, 'm').exec(content);
  if (body === undefined) {
    // No durable lesson: the section is never created, and an existing one —
    // empty, or a stale copy an earlier roll-up wrote — is removed, because
    // this command is its only writer.
    if (!marker) {
      return { content, outcome: 'omitted' };
    }
    const remainder = content.slice(marker.index + marker[0].length);
    const nextHeading = /^## .+$/m.exec(remainder);
    const end =
      nextHeading?.index === undefined
        ? content.length
        : marker.index + marker[0].length + nextHeading.index;
    const before = content.slice(0, marker.index).trimEnd();
    const after = content.slice(end).trimStart();
    return {
      content: after ? `${before}\n\n${after}` : `${before}\n`,
      outcome: 'omitted',
    };
  }
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

async function resolveDigestBounds(
  repoRoot: string,
  home: string,
  dependencies: Pick<RollupProjectLogDependencies, 'resolveEffectiveConfig'>,
): Promise<{ maxEntries: number; maxLines: number }> {
  const effective = await dependencies.resolveEffectiveConfig(
    repoRoot,
    join(home, '.oat'),
  );
  const maxEntries =
    effective.resolved['workflow.projectLogDigest.maxEntries']?.value;
  const maxLines =
    effective.resolved['workflow.projectLogDigest.maxLines']?.value;
  return {
    maxEntries: isValidProjectLogDigestBound(maxEntries)
      ? maxEntries
      : DEFAULT_PROJECT_LOG_DIGEST_MAX_ENTRIES,
    maxLines: isValidProjectLogDigestBound(maxLines)
      ? maxLines
      : DEFAULT_PROJECT_LOG_DIGEST_MAX_LINES,
  };
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
): Promise<ProjectLogRollupSuccess['ledgerOutcome']> {
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

  const content = await readFile(logPath, 'utf8');

  // The same question `check`, both append paths and `synthesize` ask, asked
  // before anything is written. `rollup` was the one surface without it: on a
  // log the other four refused it rewrote `summary.md` and reported
  // `status: "ok"` with `entriesRolledUp: 0`, indistinguishable from a clean
  // empty log. It is a public command an operator can run directly.
  const ambiguity = findProjectLogAmbiguity(content, logPath);
  if (ambiguity !== undefined) {
    return { status: 'ambiguous', ambiguity };
  }

  const parsed = parseProjectLogEntries(content);
  const digest = renderProjectLogDigest(
    parsed,
    basename(projectPath),
    await resolveDigestBounds(
      input.repoRoot,
      input.home ?? homedir(),
      dependencies,
    ),
  );
  const summaryBefore = await readFile(summaryPath, 'utf8');
  const summaryUpdate = writeSummarySection(
    summaryBefore,
    artifactTarget.summaryHeading ?? WORKFLOW_OBSERVATIONS_HEADING,
    digest.body,
  );
  if (summaryUpdate.content !== summaryBefore) {
    await writeFile(summaryPath, summaryUpdate.content, 'utf8');
  }

  // The ledger graduates the complete original judgment set, never the digest
  // selection: a general lesson beyond the digest bound still graduates.
  const ledgerOutcome = await rollupLedger(input, parsed.entries, dependencies);
  return {
    status: ledgerOutcome === 'failed' ? 'failed' : 'ok',
    summarySection: summaryUpdate.outcome,
    ledgerOutcome,
    entriesRolledUp: parsed.entries.length,
    digest: digest.report,
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
    if (result.status === 'ambiguous') {
      if (context.json) {
        context.logger.json(result);
      } else {
        context.logger.error(result.ambiguity);
      }
      process.exitCode = 1;
      return;
    }
    if (context.json) {
      context.logger.json(result);
    } else if (result.status === 'ok') {
      context.logger.success(
        `Rolled up ${result.entriesRolledUp} project log entries; Workflow Observations ${
          result.summarySection === 'omitted'
            ? 'omitted (no judgment entries)'
            : `digest renders ${result.digest.rendered}, omits ${result.digest.omitted.overBound} over the bound`
        }.`,
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
