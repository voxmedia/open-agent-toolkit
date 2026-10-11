import { randomUUID } from 'node:crypto';
import {
  mkdir as defaultMkdir,
  readFile as defaultReadFile,
  rename as defaultRename,
  writeFile as defaultWriteFile,
} from 'node:fs/promises';
import { basename, isAbsolute, join, relative, resolve, sep } from 'node:path';

import {
  buildCommandContext,
  type CommandContext,
  type GlobalOptions,
} from '@app/command-context';
import { applyTemplateReplacements } from '@commands/project/new/scaffold';
import { defaultGitRunner, type GitRunner } from '@commands/project/sync/git';
import {
  buildSyncTarget,
  pushSynced as defaultPushSynced,
  type PushResult,
  type SyncTarget,
} from '@commands/project/sync/ref-sync';
import { parsePhaseHeadingLine } from '@commands/project/validate-plan/profiles';
import {
  commitExactPaths,
  type ExactPathCommitResult,
} from '@commands/shared/exact-path-commit';
import { getFrontmatterBlock } from '@commands/shared/frontmatter';
import { replaceFrontmatter } from '@commands/shared/frontmatter-write';
import { resolveProjectsRoot as defaultResolveProjectsRoot } from '@commands/shared/oat-paths';
import { resolveProjectScope } from '@commands/shared/project-scope';
import { readGlobalOptions } from '@commands/shared/shared.utils';
import { resolveTemplate as defaultResolveTemplate } from '@commands/shared/template-source';
import { resolveAssetsRoot } from '@fs/assets';
import { fileExists as defaultFileExists } from '@fs/io';
import { resolveProjectRoot } from '@fs/paths';
import {
  parsePhaseMarkers,
  parseTaskProgress,
  recordLineMask,
} from '@open-agent-toolkit/control-plane';
import { Command } from 'commander';
import YAML from 'yaml';

const PROMOTED_FILES = [
  'discovery.md',
  'references/lite-plan.md',
  'plan.md',
  'state.md',
] as const;

const LITE_SECTION_HEADINGS = [
  ['Summary', 'summary'],
  ['Decisions', 'decisions'],
  ['Assumptions', 'assumptions'],
  ['Out of Scope', 'outOfScope'],
  ['Validation Criteria', 'validationCriteria'],
] as const;

export interface LitePlanSections {
  summary: string;
  decisions: string;
  assumptions: string;
  outOfScope: string;
  validationCriteria: string;
  productBehavior?: string;
  technicalDesign?: string;
}

type PromotionReason =
  | 'promoted'
  | 'unsupported-target'
  | 'not-lite'
  | 'lite-plan-reference-exists'
  | 'invalid-lite-plan'
  | 'brief-archive-exists'
  | 'goal-milestone-active'
  | 'goal-delivery-unsettled'
  | 'goal-recovery-pending'
  | 'extracted-phases'
  | 'invalid-brief-plan'
  | 'missing-phase-head'
  | 'scope-unresolved'
  | 'project-unreadable'
  | 'template-unreadable'
  | 'write-failed'
  | 'persistence-failed';

interface PromotionRecovery extends ExactPathCommitResult {
  identity: string;
  message: string;
  paths: string[];
  command: string;
}

class PromotionPersistenceError extends Error {
  constructor(readonly recovery: PromotionRecovery) {
    super(
      `Exact-path promotion commit ${recovery.outcome}: ${recovery.error ?? 'unverified result'}`,
    );
  }
}

function shellQuote(value: string): string {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

export type PromotionResult =
  | {
      status: 'promoted';
      reason: 'promoted';
      files: string[];
    }
  | {
      status: 'refused';
      reason: Exclude<PromotionReason, 'promoted'>;
      files: string[];
      phases?: string[];
      /** Goal: the registry entries that are not yet settled. */
      deliveries?: string[];
      recovery?: PromotionRecovery;
    };

interface ProjectPromoteOptions {
  to: string;
}

export interface ProjectPromoteDependencies {
  buildCommandContext: (options: GlobalOptions) => CommandContext;
  resolveProjectRoot: (cwd: string) => Promise<string>;
  resolveProjectsRoot: (
    repoRoot: string,
    env: NodeJS.ProcessEnv,
  ) => Promise<string>;
  resolveTemplate: typeof defaultResolveTemplate;
  readFile: typeof defaultReadFile;
  writeFile: typeof defaultWriteFile;
  mkdir: typeof defaultMkdir;
  rename: typeof defaultRename;
  fileExists: typeof defaultFileExists;
  gitRunner: GitRunner;
  pushSynced: (
    target: SyncTarget,
    git: GitRunner,
    options: { message?: string },
  ) => Promise<PushResult>;
  processEnv: NodeJS.ProcessEnv;
  now: () => Date;
}

const DEFAULT_DEPENDENCIES: ProjectPromoteDependencies = {
  buildCommandContext,
  resolveProjectRoot,
  resolveProjectsRoot: defaultResolveProjectsRoot,
  resolveTemplate: defaultResolveTemplate,
  readFile: defaultReadFile,
  writeFile: defaultWriteFile,
  mkdir: defaultMkdir,
  rename: defaultRename,
  fileExists: defaultFileExists,
  gitRunner: defaultGitRunner,
  pushSynced: defaultPushSynced,
  processEnv: process.env,
  now: () => new Date(),
};

function extractSection(content: string, heading: string): string | null {
  const escapedHeading = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const headingMatch = new RegExp(`^## ${escapedHeading}[ \\t]*$`, 'm').exec(
    content,
  );
  if (!headingMatch) return null;

  const bodyStart = headingMatch.index + headingMatch[0].length;
  const remaining = content.slice(bodyStart);
  const nextHeading = /^##\s+/m.exec(remaining);
  const bodyEnd = nextHeading ? bodyStart + nextHeading.index : content.length;
  const body = content.slice(bodyStart, bodyEnd).trim();
  return body.length > 0 ? body : null;
}

function extractLitePlanSections(planContent: string): LitePlanSections | null {
  const sections: Partial<LitePlanSections> = {};
  for (const [heading, key] of LITE_SECTION_HEADINGS) {
    const body = extractSection(planContent, heading);
    if (!body) return null;
    sections[key] = body;
  }
  const productBehavior = extractSection(planContent, 'Product Behavior');
  const technicalDesign = extractSection(planContent, 'Technical Design');
  if (productBehavior) sections.productBehavior = productBehavior;
  if (technicalDesign) sections.technicalDesign = technicalDesign;
  return sections as LitePlanSections;
}

function containsUnresolvedTemplateContent(
  sections: LitePlanSections,
  templateSections: LitePlanSections,
): boolean {
  const containsTemplateMarkers = (key: keyof LitePlanSections): boolean => {
    const content = sections[key];
    const templateContent = templateSections[key];
    if (!content || !templateContent) return false;
    if (content === templateContent) return true;

    const markers =
      templateContent
        .match(/\[[^\]\n]+\]|\{[^{}\n]+\}/g)
        ?.filter((marker) => !/^\[\s*\]$/.test(marker)) ?? [];
    const instructionalComments =
      templateContent.match(/<!--[\s\S]*?-->/g) ?? [];
    return [...markers, ...instructionalComments].some((marker) =>
      content.includes(marker),
    );
  };

  return (
    LITE_SECTION_HEADINGS.some(([, key]) => containsTemplateMarkers(key)) ||
    (['productBehavior', 'technicalDesign'] as const).some((key) =>
      containsTemplateMarkers(key),
    )
  );
}

export function parseLitePlanSections(
  planContent: string,
  liteTemplateContent?: string,
): LitePlanSections | null {
  const sections = extractLitePlanSections(planContent);
  if (!sections || !liteTemplateContent) return sections;

  const templateSections = extractLitePlanSections(liteTemplateContent);
  if (
    !templateSections ||
    containsUnresolvedTemplateContent(sections, templateSections)
  ) {
    return null;
  }
  return sections;
}

function readObjectFrontmatter(
  content: string,
  filePath: string,
): Record<string, unknown> {
  const block = getFrontmatterBlock(content);
  if (!block) {
    throw new Error(`${filePath} is missing frontmatter`);
  }
  const parsed: unknown = YAML.parse(block);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`${filePath} frontmatter must be a YAML object`);
  }
  return parsed as Record<string, unknown>;
}

function replaceSection(
  content: string,
  heading: string,
  body: string,
): string {
  const escapedHeading = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const headingMatch = new RegExp(`^## ${escapedHeading}[ \\t]*$`, 'm').exec(
    content,
  );
  if (!headingMatch) {
    throw new Error(`discovery template is missing ## ${heading}`);
  }
  const bodyStart = headingMatch.index + headingMatch[0].length;
  const remaining = content.slice(bodyStart);
  const nextHeading = /^##\s+/m.exec(remaining);
  const bodyEnd = nextHeading ? bodyStart + nextHeading.index : content.length;
  const suffix = content.slice(bodyEnd).replace(/^\s*/, '');
  return `${content.slice(0, bodyStart)}\n\n${body.trim()}\n\n${suffix}`;
}

function renderDiscovery(
  template: string,
  projectName: string,
  today: string,
  nowUtc: string,
  sections: LitePlanSections,
): string {
  let rendered = applyTemplateReplacements(
    template,
    projectName,
    today,
    nowUtc,
    'quick',
  );
  const frontmatter = readObjectFrontmatter(rendered, 'rendered discovery.md');
  frontmatter['oat_ready_for'] = 'oat-project-quick-start';
  rendered = replaceFrontmatter(
    rendered,
    YAML.stringify(frontmatter).trimEnd(),
  );
  const successCriteria = sections.productBehavior
    ? `### Product Behavior (from Lite plan)\n\n${sections.productBehavior}\n\n### Validation Criteria (from Lite plan)\n\n${sections.validationCriteria}`
    : sections.validationCriteria;
  for (const [heading, body] of [
    ['Initial Request', sections.summary],
    ['Key Decisions', sections.decisions],
    ['Assumptions', sections.assumptions],
    ['Out of Scope', sections.outOfScope],
    ['Success Criteria', successCriteria],
  ] as const) {
    rendered = replaceSection(rendered, heading, body);
  }
  if (sections.technicalDesign) {
    const nextSteps = /^## Next Steps[ \t]*$/m.exec(rendered);
    if (!nextSteps) {
      throw new Error('discovery template is missing ## Next Steps');
    }
    const carriedForward = [
      '## Carried-Forward Technical Design',
      '',
      '> Prior implementation context carried forward from the Lite plan; this is not a new discovery deliverable.',
      '',
      sections.technicalDesign,
      '',
    ].join('\n');
    rendered = `${rendered.slice(0, nextSteps.index)}${carriedForward}${rendered.slice(nextSteps.index)}`;
  }
  return rendered;
}

function renderQuickState(
  stateContent: string,
  statePath: string,
  nowUtc: string,
): string {
  const frontmatter = readObjectFrontmatter(stateContent, statePath);
  frontmatter['oat_workflow_mode'] = 'quick';
  frontmatter['oat_phase'] = 'discovery';
  frontmatter['oat_phase_status'] = 'complete';
  frontmatter['oat_ready_for'] = 'oat-project-quick-start';
  frontmatter['oat_project_state_updated'] = nowUtc;
  return replaceFrontmatter(
    stateContent,
    YAML.stringify(frontmatter).trimEnd(),
  );
}

function repoRelativePath(repoRoot: string, path: string): string {
  return relative(repoRoot, path).split(sep).join('/');
}

async function persistPromotion(
  repoRoot: string,
  projectsRoot: string,
  projectRoot: string,
  projectName: string,
  scope: 'shared' | 'local' | 'synced',
  identity: string,
  dependencies: ProjectPromoteDependencies,
  files: readonly string[] = PROMOTED_FILES,
): Promise<void> {
  const message = `chore(oat): promote ${projectName} to quick`;
  if (scope === 'synced') {
    const target = buildSyncTarget(repoRoot, projectsRoot, projectName);
    const result = await dependencies.pushSynced(
      target,
      dependencies.gitRunner,
      { message },
    );
    if (result.status !== 'pushed' && result.status !== 'up-to-date') {
      throw new Error(`synced promotion push ${result.status}`);
    }
    return;
  }
  if (scope === 'local') {
    return;
  }

  const pathspecs = files.map((file) =>
    repoRelativePath(repoRoot, join(projectRoot, file)),
  );
  await dependencies.gitRunner.run(['rev-parse', '--is-inside-work-tree'], {
    cwd: repoRoot,
  });
  const result = await commitExactPaths({
    repoRoot,
    paths: pathspecs,
    message,
    identity,
  });
  if (!['committed', 'already-matching', 'nothing'].includes(result.outcome))
    throw new PromotionPersistenceError({
      ...result,
      identity,
      message,
      paths: pathspecs,
      command: `oat --cwd ${shellQuote(repoRoot)} internal commit-paths --identity ${shellQuote(identity)} --message ${shellQuote(message)} -- ${pathspecs.map(shellQuote).join(' ')}`,
    });
}

async function promoteProject(
  projectPath: string,
  options: ProjectPromoteOptions,
  context: CommandContext,
  dependencies: ProjectPromoteDependencies,
): Promise<PromotionResult> {
  if (options.to !== 'quick') {
    return { status: 'refused', reason: 'unsupported-target', files: [] };
  }

  const repoRoot = await dependencies.resolveProjectRoot(context.cwd);
  const projectRoot = isAbsolute(projectPath)
    ? resolve(projectPath)
    : resolve(repoRoot, projectPath);
  const projectName = basename(projectRoot);
  const statePath = join(projectRoot, 'state.md');
  const planPath = join(projectRoot, 'plan.md');
  const referencePath = join(projectRoot, 'references', 'lite-plan.md');

  let stateContent: string;
  let planContent: string;
  try {
    [stateContent, planContent] = await Promise.all([
      dependencies.readFile(statePath, 'utf8'),
      dependencies.readFile(planPath, 'utf8'),
    ]);
  } catch {
    return { status: 'refused', reason: 'project-unreadable', files: [] };
  }

  let stateFrontmatter: Record<string, unknown>;
  try {
    stateFrontmatter = readObjectFrontmatter(stateContent, statePath);
  } catch {
    return { status: 'refused', reason: 'project-unreadable', files: [] };
  }
  const mode = stateFrontmatter['oat_workflow_mode'];
  if (mode === 'brief' || mode === 'goal') {
    if (mode === 'goal') {
      const unsettled = goalPromotionRefusal(stateFrontmatter);
      if (unsettled !== null) return unsettled;
    }
    return promoteBriefProject(
      {
        repoRoot,
        projectRoot,
        projectName,
        statePath,
        planPath,
        stateContent,
        planContent,
        sourceMode: mode,
        stateFrontmatter,
      },
      context,
      dependencies,
    );
  }
  if (stateFrontmatter['oat_workflow_mode'] !== 'lite') {
    return { status: 'refused', reason: 'not-lite', files: [] };
  }
  if (await dependencies.fileExists(referencePath)) {
    return {
      status: 'refused',
      reason: 'lite-plan-reference-exists',
      files: [],
    };
  }

  const resolveProjectTemplate = async (name: string): Promise<string> =>
    (
      await dependencies.resolveTemplate({
        name,
        templatesRoot: join(repoRoot, '.oat', 'templates'),
        home: context.home,
        assetsRoot: () => resolveAssetsRoot(),
      })
    ).content;
  let liteTemplateContent: string;
  try {
    liteTemplateContent = await resolveProjectTemplate('plan-lite.md');
  } catch {
    return { status: 'refused', reason: 'template-unreadable', files: [] };
  }

  const sections = parseLitePlanSections(planContent, liteTemplateContent);
  if (!sections) {
    return { status: 'refused', reason: 'invalid-lite-plan', files: [] };
  }

  const projectsRoot = await dependencies.resolveProjectsRoot(
    repoRoot,
    dependencies.processEnv,
  );
  const scope = resolveProjectScope(projectRoot, projectsRoot, repoRoot);
  if (!scope) {
    return { status: 'refused', reason: 'scope-unresolved', files: [] };
  }

  const now = dependencies.now();
  const nowUtc = now.toISOString();
  const today = nowUtc.slice(0, 10);
  let discoveryContent: string;
  let quickPlanContent: string;
  let quickStateContent: string;
  try {
    const [discoveryTemplate, quickPlanTemplate] = await Promise.all([
      resolveProjectTemplate('discovery.md'),
      resolveProjectTemplate('plan.md'),
    ]);
    discoveryContent = renderDiscovery(
      discoveryTemplate,
      projectName,
      today,
      nowUtc,
      sections,
    );
    quickPlanContent = applyTemplateReplacements(
      quickPlanTemplate,
      projectName,
      today,
      nowUtc,
      'quick',
    );
    quickStateContent = renderQuickState(stateContent, statePath, nowUtc);
  } catch {
    return { status: 'refused', reason: 'template-unreadable', files: [] };
  }

  // Bind this generation before writes, and retain the exact identity in any
  // persistence recovery rather than deriving it again from the reusable slug.
  const identity = `promote:${projectRoot}:lite-to-quick:${randomUUID()}`;
  const writtenFiles: string[] = [];
  try {
    await dependencies.mkdir(join(projectRoot, 'references'), {
      recursive: true,
    });
    await dependencies.writeFile(
      join(projectRoot, 'discovery.md'),
      discoveryContent,
      'utf8',
    );
    writtenFiles.push('discovery.md');
    await dependencies.rename(planPath, referencePath);
    writtenFiles.push('references/lite-plan.md');
    await dependencies.writeFile(planPath, quickPlanContent, 'utf8');
    writtenFiles.push('plan.md');
    await dependencies.writeFile(statePath, quickStateContent, 'utf8');
    writtenFiles.push('state.md');
  } catch {
    return { status: 'refused', reason: 'write-failed', files: writtenFiles };
  }

  try {
    await persistPromotion(
      repoRoot,
      projectsRoot,
      projectRoot,
      projectName,
      scope,
      identity,
      dependencies,
    );
  } catch (error) {
    return {
      status: 'refused',
      reason: 'persistence-failed',
      files: writtenFiles,
      ...(error instanceof PromotionPersistenceError
        ? { recovery: error.recovery }
        : {}),
    };
  }

  return {
    status: 'promoted',
    reason: 'promoted',
    files: [...PROMOTED_FILES],
  };
}

// ---------------------------------------------------------------------------
// goal → quick: the settled delivery boundary (B3)
// ---------------------------------------------------------------------------

/** Registry statuses at which a delivery no longer needs goal machinery. */
const SETTLED_DELIVERY_STATUSES = new Set(['at_endpoint', 'superseded']);

/** The goal state carried verbatim into the promoted state and the archive. */
const GOAL_HISTORY_KEYS = [
  'oat_deliveries',
  'oat_milestone_gates',
  'oat_goal_outcome_audit',
] as const;

/**
 * A goal promotes only at a settled delivery boundary: the active milestone
 * is `delivered`, every registry entry is `at_endpoint` or `superseded` (none
 * `registering` or `open`; an empty registry is not settled), and no recovery
 * is pending. Extracted phases are
 * refused by the shared migration. Returns the refusal, or null when settled.
 */
export function goalPromotionRefusal(
  stateFrontmatter: Record<string, unknown>,
): PromotionResult | null {
  if (stateFrontmatter['oat_milestone_status'] !== 'delivered') {
    return { status: 'refused', reason: 'goal-milestone-active', files: [] };
  }
  const recovery = stateFrontmatter['oat_goal_recovery'];
  if (recovery !== null && recovery !== undefined) {
    return { status: 'refused', reason: 'goal-recovery-pending', files: [] };
  }
  const registry = stateFrontmatter['oat_deliveries'];
  const entries = Array.isArray(registry) ? registry : [];
  const unsettled = entries
    .filter(
      (entry: unknown) =>
        typeof entry !== 'object' ||
        entry === null ||
        !SETTLED_DELIVERY_STATUSES.has(
          String((entry as Record<string, unknown>)['status']),
        ),
    )
    .map((entry: unknown) =>
      typeof entry === 'object' && entry !== null
        ? String((entry as Record<string, unknown>)['delivery_id'] ?? '?')
        : '?',
    );
  // `delivered` means registered, open and review-ready (B4): a delivered
  // milestone with no registry entry is contradictory, never vacuously settled.
  if (
    !Array.isArray(registry) ||
    entries.length === 0 ||
    unsettled.length > 0
  ) {
    return {
      status: 'refused',
      reason: 'goal-delivery-unsettled',
      files: [],
      deliveries: unsettled,
    };
  }
  return null;
}

/**
 * The goal archive: the original brief followed by its delivery history, so
 * the registry, milestone gates and outcome audit survive under the archive
 * as well as in the promoted `state.md`.
 */
function renderGoalArchive(
  planContent: string,
  stateFrontmatter: Record<string, unknown>,
): string {
  const history: Record<string, unknown> = {};
  for (const key of GOAL_HISTORY_KEYS) {
    history[key] = stateFrontmatter[key] ?? null;
  }
  return `${planContent.trimEnd()}

## Delivery History (archived at promotion)

The goal's delivery registry, milestone gate carriers and outcome audit as
recorded in \`state.md\` when the project was promoted to quick.

\`\`\`yaml
${YAML.stringify(history).trimEnd()}
\`\`\`
`;
}

// ---------------------------------------------------------------------------
// brief → quick
// ---------------------------------------------------------------------------

const BRIEF_ARCHIVE_FILE = 'references/brief-archive.md';
const SYNTHESIZED_TASK_TITLE = 'Accepted via phase evidence';

/** Brief sections rendered into `discovery.md` and dropped from the quick plan. */
const BRIEF_ONLY_SECTIONS = [
  'goal',
  'outcomes',
  'approach',
  'constraints and out of scope',
  'constraints',
  'out of scope',
  'decisions',
  'known unknowns',
  'delivery endpoint and authority',
  'delivery authority',
  'milestones',
  'phases',
];

const TASK_RECORD_HEADING = /^### Task ((p-?rev\d+|p\d+)-t(\d+)): (.+)$/;
const RECORD_STATUS_LINE = /^\*\*Status:\*\*\s+(\S+)$/;
const RECORD_COMMIT_LINE = /^\*\*Commit:\*\*\s+(\S+)$/;
const RECORD_MARKER_LINE = /^\*\*(Status|Commit|Executor):\*\*/;
const SECTION_HEADING_LINE = /^#{1,2}[ \t]/;
const HEADING_LINE = /^#/;

export type BriefPhaseState = 'accepted' | 'active' | 'pending' | 'provisional';

/** The brief-family mode a promotion starts from. */
export type BriefSourceMode = 'brief' | 'goal';

interface BriefTaskRecord {
  taskId: string;
  ordinal: number;
  title: string;
  status: string | null;
  commit: string | null;
  body: string[];
}

interface BriefSection {
  heading: string | null;
  lines: string[];
}

export interface BriefMigration {
  plan: string;
  implementation: string;
  implementationChanged: boolean;
  pendingPhases: string[];
  phaseStates: Record<string, BriefPhaseState>;
}

export type BriefMigrationResult =
  | { ok: true; migration: BriefMigration }
  | { ok: false; reason: 'extracted-phases' | 'invalid-brief-plan' }
  | { ok: false; reason: 'missing-phase-head'; phases: string[] };

function stripFrontmatter(content: string): string {
  const match = /^---\n[\s\S]*?\n---[^\n]*(?:\n|$)/.exec(content);
  return match ? content.slice(match[0].length) : content;
}

function normalizeOrdinal(digits: string, width: number): string {
  return digits.replace(/^0+(?=\d)/, '').padStart(width, '0');
}

function taskPhaseId(prefix: string): string {
  const revision = /^p-?rev(\d+)$/.exec(prefix);
  if (revision?.[1]) return `p-rev${normalizeOrdinal(revision[1], 1)}`;
  return `p${normalizeOrdinal(prefix.slice(1), 2)}`;
}

function taskPrefixForPhase(phaseId: string): string {
  return phaseId.startsWith('p-rev') ? `prev${phaseId.slice(5)}` : phaseId;
}

/** Split markdown into `## ` sections, ignoring headings inside code. */
function splitSections(body: string): BriefSection[] {
  const lines = body.split('\n');
  const mask = recordLineMask(lines);
  const sections: BriefSection[] = [{ heading: null, lines: [] }];
  for (const [index, line] of lines.entries()) {
    if (mask[index] && /^##[ \t]/.test(line)) {
      sections.push({ heading: line, lines: [line] });
    } else {
      sections[sections.length - 1]!.lines.push(line);
    }
  }
  return sections;
}

function sectionTitle(heading: string): string {
  return heading.replace(/^##[ \t]+/, '').trim();
}

function sectionBody(section: BriefSection): string {
  return section.lines.slice(1).join('\n').trim();
}

function findBriefSection(
  sections: BriefSection[],
  matches: (title: string) => boolean,
): string | null {
  const section = sections.find(
    (candidate) =>
      candidate.heading != null &&
      matches(sectionTitle(candidate.heading).toLowerCase()),
  );
  const body = section ? sectionBody(section) : '';
  return body.length > 0 ? body : null;
}

/**
 * Execution records per journal phase section: `### Task` headings whose
 * normalized phase id matches the enclosing `## Phase` section. Also returns
 * each phase section's end line (exclusive) for appending records.
 */
function readJournalRecords(lines: string[]): {
  records: Map<string, BriefTaskRecord[]>;
  sectionEnds: Map<string, number>;
} {
  const mask = recordLineMask(lines);
  const records = new Map<string, BriefTaskRecord[]>();
  const sectionEnds = new Map<string, number>();
  let phaseId: string | null = null;
  let current: BriefTaskRecord | null = null;

  const closeSection = (end: number): void => {
    if (phaseId != null) sectionEnds.set(phaseId, end);
  };

  for (const [index, line] of lines.entries()) {
    if (!mask[index]) {
      current?.body.push(line);
      continue;
    }

    if (SECTION_HEADING_LINE.test(line)) {
      closeSection(index);
      current = null;
      phaseId = parsePhaseHeadingLine(line)?.phaseId ?? null;
      continue;
    }

    const task = TASK_RECORD_HEADING.exec(line);
    if (task && phaseId != null) {
      current = null;
      if (taskPhaseId(task[2]!) === phaseId) {
        current = {
          taskId: task[1]!,
          ordinal: Number.parseInt(task[3]!, 10),
          title: task[4]!,
          status: null,
          commit: null,
          body: [],
        };
        const list = records.get(phaseId) ?? [];
        list.push(current);
        records.set(phaseId, list);
      }
      continue;
    }

    if (HEADING_LINE.test(line)) {
      current = null;
      continue;
    }

    if (current == null) continue;
    const trimmed = line.trim();
    const status = RECORD_STATUS_LINE.exec(trimmed)?.[1];
    if (status !== undefined) {
      current.status ??= status;
      continue;
    }
    const commit = RECORD_COMMIT_LINE.exec(trimmed)?.[1];
    if (commit !== undefined) {
      current.commit ??= commit;
      continue;
    }
    if (!RECORD_MARKER_LINE.test(trimmed)) current.body.push(line);
  }
  closeSection(lines.length);

  return { records, sectionEnds };
}

/** Plan phase block lines owned by the phase heading (up to the first `#`). */
function ownedPhaseLines(section: BriefSection): string[] {
  const owned: string[] = [];
  const mask = recordLineMask(section.lines);
  for (const [index, line] of section.lines.slice(1).entries()) {
    if (mask[index + 1] && HEADING_LINE.test(line)) break;
    owned.push(line);
  }
  while (owned.length > 0 && owned[owned.length - 1]!.trim() === '') {
    owned.pop();
  }
  return owned;
}

function trimBlank(lines: string[]): string[] {
  let start = 0;
  let end = lines.length;
  while (start < end && lines[start]!.trim() === '') start += 1;
  while (end > start && lines[end - 1]!.trim() === '') end -= 1;
  return lines.slice(start, end);
}

/**
 * The brief's `## Reviews` section with every row left byte-identical (Scope,
 * Type and Artifact are review-event identity) and one provenance line under
 * the heading marking the rows recorded before promotion.
 */
function reviewsWithProvenance(
  section: BriefSection,
  today: string,
  sourceMode: BriefSourceMode,
): string[] {
  return [
    section.lines[0]!,
    '',
    `Rows dated on or before ${today} were recorded pre-promotion under workflow mode ${sourceMode}.`,
    '',
    ...trimBlank(section.lines.slice(1)),
  ];
}

function renderPlanTask(
  record: BriefTaskRecord,
  sourceMode: BriefSourceMode,
): string[] {
  const commit = record.commit && record.commit !== '-' ? record.commit : null;
  return [
    `### Task ${record.taskId}: ${record.title}`,
    '',
    `> Accepted before promotion (${sourceMode}). Execution record: \`implementation.md\`${commit ? ` (commit \`${commit}\`)` : ''}.`,
    ...(trimBlank(record.body).length > 0
      ? ['', ...trimBlank(record.body)]
      : []),
    '',
  ];
}

/**
 * Pure brief → quick migration. Phase states follow the phase-unit progress
 * contract: accepted (journal `completed`, not provisional), active (any other
 * started status), pending, or provisional. An extracted phase refuses.
 */
export function migrateBriefToQuick(input: {
  planContent: string;
  implementationContent: string;
  projectName: string;
  today: string;
  /** The actual source mode, named in provenance; defaults to `brief`. */
  sourceMode?: BriefSourceMode;
}): BriefMigrationResult {
  const { planContent, implementationContent, projectName, today } = input;
  const sourceMode = input.sourceMode ?? 'brief';
  const markers = parsePhaseMarkers(implementationContent);
  if ([...markers.values()].some((marker) => marker.status === 'extracted')) {
    return { ok: false, reason: 'extracted-phases' };
  }

  const progress = parseTaskProgress(planContent, implementationContent, {
    phaseUnits: true,
  });
  if (progress.phases.length === 0) {
    return { ok: false, reason: 'invalid-brief-plan' };
  }

  const phaseStates: Record<string, BriefPhaseState> = {};
  for (const phase of progress.phases) {
    const status = markers.get(phase.phaseId)?.status ?? 'pending';
    phaseStates[phase.phaseId] = phase.provisional
      ? 'provisional'
      : phase.completed === 1
        ? 'accepted'
        : status === 'pending'
          ? 'pending'
          : 'active';
  }
  const pendingPhases = progress.phases
    .map((phase) => phase.phaseId)
    .filter(
      (phaseId, index, all) =>
        phaseStates[phaseId] !== 'accepted' && all.indexOf(phaseId) === index,
    );

  const journalLines = implementationContent.split('\n');
  const { records, sectionEnds } = readJournalRecords(journalLines);
  const insertions: { at: number; lines: string[] }[] = [];

  // An accepted phase without a completed record is synthesized against its
  // phase head; without a head there is no evidence anchor, so refuse rather
  // than fabricate a completed record.
  const headless = progress.phases
    .map((phase) => phase.phaseId)
    .filter(
      (phaseId, index, all) =>
        all.indexOf(phaseId) === index &&
        phaseStates[phaseId] === 'accepted' &&
        !(records.get(phaseId) ?? []).some(
          (record) => record.status === 'completed',
        ) &&
        markers.get(phaseId)?.head == null,
    );
  if (headless.length > 0) {
    return { ok: false, reason: 'missing-phase-head', phases: headless };
  }

  const frontmatter = getFrontmatterBlock(planContent)
    ? readObjectFrontmatter(planContent, 'plan.md')
    : {};
  const sections = splitSections(stripFrontmatter(planContent));
  const goal = findBriefSection(sections, (title) => title === 'goal');

  const output: string[] = [
    `# Implementation Plan: ${projectName}`,
    '',
    `> Promoted from a ${sourceMode === 'goal' ? 'goal brief' : 'brief'} on ${today}. The original brief is archived at \`${BRIEF_ARCHIVE_FILE}\`; its outcomes, decisions, known unknowns and delivery authority are carried into \`discovery.md\`.`,
    '',
    `**Goal:** ${goal ? goal.split('\n\n')[0]!.replace(/\n/g, ' ') : '{Author from discovery}'}`,
    '',
    '**Commit Convention:** `{type}({scope}): {description}` - e.g., `feat(p01-t01): add user auth endpoint`',
    '',
  ];
  let referencesSeen = false;
  const seenPhases = new Set<string>();

  for (const section of sections) {
    if (section.heading == null) continue;
    const title = sectionTitle(section.heading);
    const phaseHeading = parsePhaseHeadingLine(section.heading);

    if (phaseHeading) {
      const { phaseId, name } = phaseHeading;
      if (seenPhases.has(phaseId)) continue;
      seenPhases.add(phaseId);
      const state = phaseStates[phaseId] ?? 'pending';
      const phaseRecords = records.get(phaseId) ?? [];
      const lines: string[] = [`## Phase ${phaseId}: ${name}`, ''];
      const owned = trimBlank(ownedPhaseLines(section));
      if (owned.length > 0) lines.push(...owned, '');

      if (state === 'accepted' || state === 'active') {
        const completed = phaseRecords.filter((r) => r.status === 'completed');
        const unfinished =
          state === 'active'
            ? phaseRecords.filter(
                (r) => r.status === 'pending' || r.status === 'in_progress',
              )
            : [];
        const historical = phaseRecords.filter(
          (r) => r.status !== 'completed' && !unfinished.includes(r),
        );
        if (historical.length > 0) {
          lines.push(
            `**Historical records:** ${historical
              .map((r) => `${r.taskId} (${r.status ?? 'unknown'})`)
              .join(', ')}`,
            '',
          );
        }
        if (unfinished.length > 0) {
          lines.push(
            `**Unfinished records:** ${unfinished
              .map((r) => `${r.taskId} (${r.status})`)
              .join(', ')}`,
            '',
          );
        }
        for (const record of completed) {
          lines.push(...renderPlanTask(record, sourceMode));
        }

        if (state === 'accepted' && completed.length === 0) {
          const next = Math.max(0, ...phaseRecords.map((r) => r.ordinal)) + 1;
          const taskId = `${taskPrefixForPhase(phaseId)}-t${String(next).padStart(2, '0')}`;
          const head = markers.get(phaseId)!.head!;
          lines.push(
            `### Task ${taskId}: ${SYNTHESIZED_TASK_TITLE}`,
            '',
            `> Synthesized at promotion: the phase was accepted on its exit evidence (head \`${head}\`) without a completed execution record.`,
            '',
          );
          const end = sectionEnds.get(phaseId) ?? journalLines.length;
          insertions.push({
            at: end,
            lines: [
              `### Task ${taskId}: ${SYNTHESIZED_TASK_TITLE}`,
              '',
              '**Status:** completed',
              `**Commit:** ${head}`,
              '**Executor:** reconciled',
              '',
              `Synthesized by \`oat project promote --to quick\` on ${today}: the phase was accepted on its exit evidence without a completed execution record.`,
              '',
            ],
          });
        }
      }
      output.push(...lines);
      continue;
    }

    if (BRIEF_ONLY_SECTIONS.includes(title.toLowerCase())) continue;
    if (/^delivery\b/i.test(title)) continue;

    if (title.toLowerCase() === 'reviews') {
      output.push(...reviewsWithProvenance(section, today, sourceMode), '');
      continue;
    }

    if (title.toLowerCase() === 'references') {
      referencesSeen = true;
      output.push(
        ...trimBlank(section.lines),
        `- Brief archive: \`${BRIEF_ARCHIVE_FILE}\``,
        '- Discovery: `discovery.md`',
        '',
      );
      continue;
    }

    output.push(...trimBlank(section.lines), '');
  }

  if (!referencesSeen) {
    output.push(
      '## References',
      '',
      `- Brief archive: \`${BRIEF_ARCHIVE_FILE}\``,
      '- Discovery: `discovery.md`',
      '',
    );
  }

  frontmatter['oat_status'] = 'in_progress';
  frontmatter['oat_ready_for'] = null;
  frontmatter['oat_last_updated'] = today;
  frontmatter['oat_template'] = true;
  frontmatter['oat_template_name'] = 'plan';
  frontmatter['oat_plan_source'] = 'quick';
  frontmatter['oat_promoted_from'] = sourceMode;
  frontmatter['oat_promotion_pending_phases'] = pendingPhases;

  const plan = `---\n${YAML.stringify(frontmatter)}---\n\n${output
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trimEnd()}\n`;

  const nextJournal = [...journalLines];
  for (const insertion of [...insertions].sort((a, b) => b.at - a.at)) {
    const before = nextJournal.slice(0, insertion.at);
    while (before.length > 0 && before[before.length - 1]!.trim() === '') {
      before.pop();
    }
    const after = nextJournal.slice(insertion.at);
    nextJournal.splice(
      0,
      nextJournal.length,
      ...before,
      '',
      ...insertion.lines,
      ...after,
    );
  }
  const implementation = nextJournal.join('\n');

  return {
    ok: true,
    migration: {
      plan,
      implementation,
      implementationChanged: insertions.length > 0,
      pendingPhases,
      phaseStates,
    },
  };
}

function upsertDiscoverySection(
  content: string,
  heading: string,
  body: string,
): string {
  const escapedHeading = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (new RegExp(`^## ${escapedHeading}[ \\t]*$`, 'm').test(content)) {
    return replaceSection(content, heading, body);
  }
  const section = `## ${heading}\n\n${body.trim()}\n\n`;
  const nextSteps = /^## Next Steps[ \t]*$/m.exec(content);
  return nextSteps
    ? `${content.slice(0, nextSteps.index)}${section}${content.slice(nextSteps.index)}`
    : `${content.trimEnd()}\n\n${section}`;
}

function renderBriefDiscovery(
  template: string,
  projectName: string,
  today: string,
  nowUtc: string,
  briefPlan: string,
): string {
  let rendered = applyTemplateReplacements(
    template,
    projectName,
    today,
    nowUtc,
    'quick',
  );
  const frontmatter = readObjectFrontmatter(rendered, 'rendered discovery.md');
  frontmatter['oat_ready_for'] = 'oat-project-quick-start';
  rendered = replaceFrontmatter(
    rendered,
    YAML.stringify(frontmatter).trimEnd(),
  );
  const sections = splitSections(stripFrontmatter(briefPlan));
  const carried: [string, string | null][] = [
    ['Initial Request', findBriefSection(sections, (t) => t === 'goal')],
    ['Success Criteria', findBriefSection(sections, (t) => t === 'outcomes')],
    ['Key Decisions', findBriefSection(sections, (t) => t === 'decisions')],
    [
      'Constraints',
      findBriefSection(sections, (t) => t.startsWith('constraints')),
    ],
    [
      'Open Questions',
      findBriefSection(sections, (t) => t === 'known unknowns'),
    ],
    [
      'Delivery Endpoint and Authority (from brief)',
      findBriefSection(sections, (t) => t.startsWith('delivery')),
    ],
  ];
  for (const [heading, body] of carried) {
    if (body) rendered = upsertDiscoverySection(rendered, heading, body);
  }
  const approach = findBriefSection(sections, (t) => t === 'approach');
  if (approach) rendered = renderChosenDirection(rendered, approach);
  return rendered;
}

/**
 * Carry the brief's `## Approach` into discovery's `## Solution Space` as the
 * `### Chosen Direction` body. Headings inside the approach (for example
 * `### Design`) are demoted one level so they stay under Chosen Direction;
 * lines inside fenced or indented code are left byte-for-byte.
 */
function renderChosenDirection(content: string, approach: string): string {
  const approachLines = approach.split('\n');
  const mask = recordLineMask(approachLines);
  const body = approachLines
    .map((line, index) =>
      mask[index] ? line.replace(/^(#{3,5})(?=[ \t])/, '#$1') : line,
    )
    .join('\n')
    .trim();
  const chosen = /^### Chosen Direction[ \t]*$/m.exec(content);
  if (chosen) {
    const bodyStart = chosen.index + chosen[0].length;
    const next = /^#{1,3}[ \t]/m.exec(content.slice(bodyStart));
    const bodyEnd = next ? bodyStart + next.index : content.length;
    return `${content.slice(0, bodyStart)}\n\n${body}\n\n${content.slice(bodyEnd).replace(/^\s*/, '')}`;
  }
  const solutionSpace = /^## Solution Space[ \t]*$/m.exec(content);
  if (solutionSpace) {
    const bodyStart = solutionSpace.index + solutionSpace[0].length;
    const next = /^##[ \t]/m.exec(content.slice(bodyStart));
    const at = next ? bodyStart + next.index : content.length;
    return `${content.slice(0, at).trimEnd()}\n\n### Chosen Direction\n\n${body}\n\n${content.slice(at)}`;
  }
  return upsertDiscoverySection(
    content,
    'Solution Space',
    `### Chosen Direction\n\n${body}`,
  );
}

function renderPromotedBriefState(
  stateContent: string,
  statePath: string,
  nowUtc: string,
): string {
  const frontmatter = readObjectFrontmatter(stateContent, statePath);
  frontmatter['oat_workflow_mode'] = 'quick';
  frontmatter['oat_phase'] = 'plan';
  frontmatter['oat_phase_status'] = 'in_progress';
  frontmatter['oat_ready_for'] = 'oat-project-quick-start';
  frontmatter['oat_project_state_updated'] = nowUtc;
  return replaceFrontmatter(
    stateContent,
    YAML.stringify(frontmatter).trimEnd(),
  );
}

interface BriefPromotionInput {
  repoRoot: string;
  projectRoot: string;
  projectName: string;
  statePath: string;
  planPath: string;
  stateContent: string;
  planContent: string;
  sourceMode: BriefSourceMode;
  stateFrontmatter: Record<string, unknown>;
}

async function promoteBriefProject(
  input: BriefPromotionInput,
  context: CommandContext,
  dependencies: ProjectPromoteDependencies,
): Promise<PromotionResult> {
  const { repoRoot, projectRoot, projectName, statePath, planPath } = input;
  const archivePath = join(projectRoot, BRIEF_ARCHIVE_FILE);
  const implementationPath = join(projectRoot, 'implementation.md');

  if (await dependencies.fileExists(archivePath)) {
    return { status: 'refused', reason: 'brief-archive-exists', files: [] };
  }

  let implementationContent = '';
  if (await dependencies.fileExists(implementationPath)) {
    try {
      implementationContent = await dependencies.readFile(
        implementationPath,
        'utf8',
      );
    } catch {
      return { status: 'refused', reason: 'project-unreadable', files: [] };
    }
  }

  const now = dependencies.now();
  const nowUtc = now.toISOString();
  const today = nowUtc.slice(0, 10);

  let migrated: BriefMigrationResult;
  try {
    migrated = migrateBriefToQuick({
      planContent: input.planContent,
      implementationContent,
      projectName,
      today,
      sourceMode: input.sourceMode,
    });
  } catch {
    return { status: 'refused', reason: 'invalid-brief-plan', files: [] };
  }
  if (!migrated.ok) {
    return {
      status: 'refused',
      reason: migrated.reason,
      files: [],
      ...(migrated.reason === 'missing-phase-head'
        ? { phases: migrated.phases }
        : {}),
    };
  }
  const { migration } = migrated;

  const projectsRoot = await dependencies.resolveProjectsRoot(
    repoRoot,
    dependencies.processEnv,
  );
  const scope = resolveProjectScope(projectRoot, projectsRoot, repoRoot);
  if (!scope) {
    return { status: 'refused', reason: 'scope-unresolved', files: [] };
  }

  let discoveryContent: string;
  let quickStateContent: string;
  try {
    const discoveryTemplate = (
      await dependencies.resolveTemplate({
        name: 'discovery.md',
        templatesRoot: join(repoRoot, '.oat', 'templates'),
        home: context.home,
        assetsRoot: () => resolveAssetsRoot(),
      })
    ).content;
    discoveryContent = renderBriefDiscovery(
      discoveryTemplate,
      projectName,
      today,
      nowUtc,
      input.planContent,
    );
    quickStateContent = renderPromotedBriefState(
      input.stateContent,
      statePath,
      nowUtc,
    );
  } catch {
    return { status: 'refused', reason: 'template-unreadable', files: [] };
  }

  const files = [
    'discovery.md',
    BRIEF_ARCHIVE_FILE,
    ...(migration.implementationChanged ? ['implementation.md'] : []),
    'plan.md',
    'state.md',
  ];
  const identity = `promote:${projectRoot}:${input.sourceMode}-to-quick:${randomUUID()}`;
  const writtenFiles: string[] = [];
  try {
    await dependencies.mkdir(join(projectRoot, 'references'), {
      recursive: true,
    });
    await dependencies.writeFile(
      join(projectRoot, 'discovery.md'),
      discoveryContent,
      'utf8',
    );
    writtenFiles.push('discovery.md');
    await dependencies.writeFile(
      archivePath,
      input.sourceMode === 'goal'
        ? renderGoalArchive(input.planContent, input.stateFrontmatter)
        : input.planContent,
      'utf8',
    );
    writtenFiles.push(BRIEF_ARCHIVE_FILE);
    if (migration.implementationChanged) {
      await dependencies.writeFile(
        implementationPath,
        migration.implementation,
        'utf8',
      );
      writtenFiles.push('implementation.md');
    }
    await dependencies.writeFile(planPath, migration.plan, 'utf8');
    writtenFiles.push('plan.md');
    await dependencies.writeFile(statePath, quickStateContent, 'utf8');
    writtenFiles.push('state.md');
  } catch {
    return { status: 'refused', reason: 'write-failed', files: writtenFiles };
  }

  try {
    await persistPromotion(
      repoRoot,
      projectsRoot,
      projectRoot,
      projectName,
      scope,
      identity,
      dependencies,
      files,
    );
  } catch (error) {
    return {
      status: 'refused',
      reason: 'persistence-failed',
      files: writtenFiles,
      ...(error instanceof PromotionPersistenceError
        ? { recovery: error.recovery }
        : {}),
    };
  }

  return { status: 'promoted', reason: 'promoted', files };
}

export function createProjectPromoteCommand(
  overrides: Partial<ProjectPromoteDependencies> = {},
): Command {
  const dependencies = { ...DEFAULT_DEPENDENCIES, ...overrides };
  return new Command('promote')
    .description(
      'Promote an authored lite, brief or settled goal project to the quick workflow',
    )
    .argument('<project-path>', 'Lite, brief or goal project path to promote')
    .requiredOption('--to <mode>', 'Target workflow mode')
    .action(
      async (
        projectPath: string,
        options: ProjectPromoteOptions,
        command: Command,
      ) => {
        const context = dependencies.buildCommandContext(
          readGlobalOptions(command),
        );
        const result = await promoteProject(
          projectPath,
          options,
          context,
          dependencies,
        );
        if (context.json) {
          context.logger.json(result);
        } else if (result.status === 'promoted') {
          context.logger.info(`Promoted ${projectPath} to quick.`);
        } else {
          context.logger.error(
            `Promotion refused: ${result.reason}${result.phases ? ` (${result.phases.join(', ')})` : ''}${result.deliveries ? ` (${result.deliveries.join(', ')})` : ''}.${result.recovery ? ` Exact-path persistence ${result.recovery.outcome}; attempts ${result.recovery.attempts}; lock ${result.recovery.lockClass ?? 'none'}; identity ${result.recovery.identity}; receipt ${result.recovery.receipt ?? 'unavailable'}. ${result.recovery.error ?? ''} Recover existing Quick artifacts with: ${result.recovery.command}` : ''}`,
          );
        }
        process.exitCode = result.status === 'promoted' ? 0 : 1;
      },
    );
}
