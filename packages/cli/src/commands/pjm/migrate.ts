import {
  access,
  mkdir,
  readdir,
  readFile,
  rename,
  stat,
  writeFile,
} from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';

import { initializeBacklog } from '@commands/backlog/init';
import { regenerateBacklogIndex } from '@commands/backlog/regenerate-index';
import { generateBacklogId } from '@commands/backlog/shared/generate-id';
import { initializeDecisionRecords } from '@commands/decision/init';
import {
  migrateDecisionRecords,
  type DecisionMigrationMapping,
} from '@commands/decision/migrate';
import { stripTemplateFrontmatter } from '@commands/shared/strip-template-frontmatter';
import YAML from 'yaml';

import type { PjmAdoption } from './adoption';
import { initializeRepoReference } from './init';

export type PjmMigrationActionType =
  | 'move'
  | 'create'
  | 'migrate-backlog'
  | 'migrate-decisions'
  | 'propose';

export type PjmMigrationActionResult = 'planned' | 'applied' | 'skipped';

export interface PjmMigrationAction {
  type: PjmMigrationActionType;
  result: PjmMigrationActionResult;
  source?: string;
  target?: string;
  reason?: string;
}

export interface PjmBacklogMigrationMapping {
  legacyId: string;
  id: string;
  title: string;
  filePath: string;
}

export interface PjmMigrationResult {
  repoRoot: string;
  status: 'skipped' | 'dry-run' | 'already-migrated' | 'migrated';
  reason?: string;
  dryRun: boolean;
  actions: PjmMigrationAction[];
  backlogMappings: PjmBacklogMigrationMapping[];
  decisionMappings: DecisionMigrationMapping[];
  written: string[];
}

export interface PjmMigrationOptions {
  repoRoot: string;
  assetsRoot: string;
  templatesRoot?: string;
  home?: string;
  adoption: PjmAdoption;
  apply?: boolean;
}

interface PreparedBacklogMigration {
  mapping: PjmBacklogMigrationMapping;
  sourcePath: string;
  targetPath: string;
  content: string;
}

const ACTIVE_MOVES = [
  { source: 'reference/current-state.md', target: 'pjm/current-state.md' },
  { source: 'reference/roadmap.md', target: 'pjm/roadmap.md' },
  { source: 'reference/backlog', target: 'pjm/backlog' },
] as const;

const JUDGMENT_TARGETS = [
  'reference/backlog.md',
  'reference/backlog-completed.md',
] as const;

const LEGACY_MIGRATION_PATHS = [
  ...ACTIVE_MOVES.map((move) => move.source),
  'reference/decision-record.md',
] as const;

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch (error) {
    const code =
      error && typeof error === 'object' && 'code' in error
        ? String(error.code)
        : null;

    if (code !== 'ENOENT') {
      throw error;
    }

    return false;
  }
}

async function listMarkdownFiles(path: string): Promise<string[]> {
  try {
    const entries = await readdir(path, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
      .map((entry) => join(path, entry.name))
      .sort();
  } catch (error) {
    const code =
      error && typeof error === 'object' && 'code' in error
        ? String(error.code)
        : null;

    if (code !== 'ENOENT') {
      throw error;
    }

    return [];
  }
}

function stripMarkdownExtension(path: string): string {
  return basename(path, '.md');
}

function relativeToRepo(repoRoot: string, path: string): string {
  return path.startsWith(`${repoRoot}/`)
    ? path.slice(repoRoot.length + 1)
    : path;
}

function parseFrontmatter(
  content: string,
  filePath: string,
): { frontmatter: Record<string, unknown>; body: string } | null {
  const match = content.match(/^---\n([\s\S]*?)\n---(\r?\n[\s\S]*)?$/);
  if (!match) {
    return null;
  }

  const parsed = YAML.parse(match[1] ?? '');
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`Frontmatter in ${filePath} must be a YAML object.`);
  }

  return {
    frontmatter: parsed as Record<string, unknown>,
    body: match[2] ?? '\n',
  };
}

function renderFrontmatterRecord(
  frontmatter: Record<string, unknown>,
  body: string,
): string {
  return `---\n${YAML.stringify(frontmatter).trimEnd()}\n---${body}`;
}

async function createdAtForBacklogRecord(
  frontmatter: Record<string, unknown>,
  filePath: string,
): Promise<string> {
  const created = frontmatter.created;
  if (typeof created === 'string' && created.trim()) {
    return created;
  }

  return (await stat(filePath)).mtime.toISOString();
}

function withNumericSuffix(id: string, suffix: number): string {
  return `${id}-${suffix}`;
}

async function allocateBacklogId(
  initialId: string,
  currentPath: string,
  targetDir: string,
  plannedTargets: Set<string>,
): Promise<{ id: string; targetPath: string }> {
  let id = initialId;
  let suffix = 2;
  let targetPath = join(targetDir, `${id}.md`);
  while (
    plannedTargets.has(targetPath) ||
    (targetPath !== currentPath && (await pathExists(targetPath)))
  ) {
    id = withNumericSuffix(initialId, suffix);
    targetPath = join(targetDir, `${id}.md`);
    suffix += 1;
  }

  plannedTargets.add(targetPath);
  return { id, targetPath };
}

async function prepareBacklogMigrations(
  backlogRoot: string,
): Promise<PreparedBacklogMigration[]> {
  const prepared: PreparedBacklogMigration[] = [];
  const plannedTargets = new Set<string>();

  for (const bucket of ['items', 'archived'] as const) {
    const bucketRoot = join(backlogRoot, bucket);
    const files = await listMarkdownFiles(bucketRoot);
    for (const sourcePath of files) {
      const content = await readFile(sourcePath, 'utf8');
      const parsed = parseFrontmatter(content, sourcePath);
      if (!parsed) {
        continue;
      }

      const legacyId = String(
        parsed.frontmatter.id ?? stripMarkdownExtension(sourcePath),
      );
      const title = String(parsed.frontmatter.title ?? legacyId);
      const createdAt = await createdAtForBacklogRecord(
        parsed.frontmatter,
        sourcePath,
      );
      const initialId = generateBacklogId(title, createdAt);
      const { id, targetPath } = await allocateBacklogId(
        initialId,
        sourcePath,
        bucketRoot,
        plannedTargets,
      );

      if (id === legacyId && targetPath === sourcePath) {
        continue;
      }

      const nextFrontmatter: Record<string, unknown> = {
        ...parsed.frontmatter,
        id,
      };
      // Migrated items are instantiated records, never raw templates. Drop the
      // template-marker keys a legacy item may still carry so `pjm doctor`
      // (prev2-t05) does not flag the migrated record. The shared
      // `stripTemplateFrontmatter` defines which markers identify a raw
      // template; mirror that key set here rather than re-parsing.
      delete nextFrontmatter.oat_template;
      delete nextFrontmatter.oat_template_name;
      if (nextFrontmatter.legacy_id === undefined) {
        nextFrontmatter.legacy_id = legacyId;
      }

      // Defense-in-depth: run the rebuilt record through the shared helper so any
      // residual template frontmatter is stripped with the same rules doctor and
      // `decision new` use. It is a no-op once the marker keys above are removed.
      const migratedContent = stripTemplateFrontmatter(
        renderFrontmatterRecord(nextFrontmatter, parsed.body),
      );

      prepared.push({
        sourcePath,
        targetPath,
        content: migratedContent,
        mapping: {
          legacyId,
          id,
          title,
          filePath: targetPath,
        },
      });
    }
  }

  return prepared;
}

async function applyBacklogMigrations(
  preparedMigrations: PreparedBacklogMigration[],
): Promise<string[]> {
  const written: string[] = [];
  for (const migration of preparedMigrations) {
    await mkdir(dirname(migration.targetPath), { recursive: true });
    await writeFile(migration.sourcePath, migration.content, 'utf8');
    if (migration.sourcePath !== migration.targetPath) {
      await rename(migration.sourcePath, migration.targetPath);
    }
    written.push(migration.targetPath);
  }

  return written;
}

async function planActiveMoves(
  repoRoot: string,
): Promise<PjmMigrationAction[]> {
  const actions: PjmMigrationAction[] = [];
  for (const move of ACTIVE_MOVES) {
    const sourcePath = join(repoRoot, move.source);
    const targetPath = join(repoRoot, move.target);
    const sourceExists = await pathExists(sourcePath);
    const targetExists = await pathExists(targetPath);
    if (sourceExists && !targetExists) {
      actions.push({ type: 'move', ...move, result: 'planned' });
    } else if (sourceExists && targetExists) {
      actions.push({
        type: 'move',
        ...move,
        result: 'skipped',
        reason: 'target already exists; leaving source for manual review',
      });
    }
  }

  return actions;
}

async function applyActiveMoves(
  repoRoot: string,
  actions: PjmMigrationAction[],
): Promise<string[]> {
  const moved: string[] = [];
  for (const action of actions) {
    if (
      action.type !== 'move' ||
      action.result !== 'planned' ||
      !action.source ||
      !action.target
    ) {
      continue;
    }

    const sourcePath = join(repoRoot, action.source);
    const targetPath = join(repoRoot, action.target);
    await mkdir(dirname(targetPath), { recursive: true });
    await rename(sourcePath, targetPath);
    action.result = 'applied';
    moved.push(targetPath);
  }

  return moved;
}

async function collectJudgmentProposals(
  repoRoot: string,
): Promise<PjmMigrationAction[]> {
  const actions: PjmMigrationAction[] = [];
  for (const target of JUDGMENT_TARGETS) {
    if (await pathExists(join(repoRoot, target))) {
      actions.push({
        type: 'propose',
        source: target,
        result: 'planned',
        reason: 'legacy backlog file retirement requires explicit review',
      });
    }
  }

  const referenceRoot = join(repoRoot, 'reference');
  for (const filePath of await listMarkdownFiles(referenceRoot)) {
    const name = basename(filePath);
    if (name !== 'roadmap.md' && name.toLowerCase().includes('roadmap')) {
      actions.push({
        type: 'propose',
        source: relativeToRepo(repoRoot, filePath),
        result: 'planned',
        reason: 'second roadmap disposition requires explicit review',
      });
    }
  }

  return actions;
}

async function hasRecognizedLegacySources(repoRoot: string): Promise<boolean> {
  for (const legacyPath of LEGACY_MIGRATION_PATHS) {
    if (await pathExists(join(repoRoot, legacyPath))) {
      return true;
    }
  }

  return (await collectJudgmentProposals(repoRoot)).length > 0;
}

async function isAlreadyMigrated(repoRoot: string): Promise<boolean> {
  const hasPjm = await pathExists(join(repoRoot, 'pjm'));
  const hasDecisions = await pathExists(
    join(repoRoot, 'reference', 'decisions'),
  );
  if (!hasPjm || !hasDecisions) {
    return false;
  }

  for (const legacyPath of [
    'reference/current-state.md',
    'reference/roadmap.md',
    'reference/backlog',
    'reference/decision-record.md',
  ]) {
    if (await pathExists(join(repoRoot, legacyPath))) {
      return false;
    }
  }

  return true;
}

async function collectDecisionMappings(
  repoRoot: string,
): Promise<DecisionMigrationMapping[]> {
  const referenceRoot = join(repoRoot, 'reference');
  const legacyPath = join(referenceRoot, 'decision-record.md');
  if (!(await pathExists(legacyPath))) {
    return [];
  }

  return (
    await migrateDecisionRecords({
      referenceRoot,
      dryRun: true,
    })
  ).mappings;
}

/**
 * Preflights the decision-migration step without mutating anything.
 *
 * Runs the same guards the apply step will run, including the destructive
 * delete-safety guard (`deleteLegacy: true`), but in dry-run mode so it writes
 * and deletes nothing. This is the failure-prone precondition surfaced by
 * dogfooding: an unparseable `decision-record.md` previously aborted only after
 * mechanical moves had already happened. Validating it up front keeps
 * `--apply` atomic — any decision-parse problem fails before the tree changes.
 */
async function preflightDecisionMigration(repoRoot: string): Promise<void> {
  const referenceRoot = join(repoRoot, 'reference');
  const legacyPath = join(referenceRoot, 'decision-record.md');
  if (!(await pathExists(legacyPath))) {
    return;
  }

  await migrateDecisionRecords({
    referenceRoot,
    deleteLegacy: true,
    dryRun: true,
  });
}

async function migrateDecisions(
  repoRoot: string,
): Promise<{ mappings: DecisionMigrationMapping[]; written: string[] }> {
  const referenceRoot = join(repoRoot, 'reference');
  const legacyPath = join(referenceRoot, 'decision-record.md');
  if (!(await pathExists(legacyPath))) {
    await initializeDecisionRecords(join(referenceRoot, 'decisions'));
    return { mappings: [], written: [] };
  }

  const result = await migrateDecisionRecords({
    referenceRoot,
    deleteLegacy: true,
  });
  return { mappings: result.mappings, written: result.written };
}

function buildEmptyResult(
  options: PjmMigrationOptions,
  status: PjmMigrationResult['status'],
  reason?: string,
): PjmMigrationResult {
  return {
    repoRoot: options.repoRoot,
    status,
    reason,
    dryRun: !options.apply,
    actions: [],
    backlogMappings: [],
    decisionMappings: [],
    written: [],
  };
}

export async function migratePjmRepo(
  options: PjmMigrationOptions,
): Promise<PjmMigrationResult> {
  const hasLegacySources = await hasRecognizedLegacySources(options.repoRoot);
  if (!hasLegacySources && (await isAlreadyMigrated(options.repoRoot))) {
    return buildEmptyResult(options, 'already-migrated');
  }

  if (!hasLegacySources) {
    const reason =
      options.adoption.state === 'partial-initialization'
        ? 'PJM initialization is partial and no recognized legacy migration input was found; run oat pjm init to complete initialization'
        : 'No recognized PJM migration input was found; run oat pjm init to initialize this repository';
    return buildEmptyResult(options, 'skipped', reason);
  }

  const apply = options.apply ?? false;
  const activeMoves = await planActiveMoves(options.repoRoot);
  const judgmentProposals = await collectJudgmentProposals(options.repoRoot);
  const legacyBacklogRoot = join(options.repoRoot, 'reference', 'backlog');
  const pjmBacklogRoot = join(options.repoRoot, 'pjm', 'backlog');
  const backlogRoot = (await pathExists(legacyBacklogRoot))
    ? legacyBacklogRoot
    : pjmBacklogRoot;
  const preparedBacklogMigrations = await prepareBacklogMigrations(backlogRoot);
  const decisionMappings = await collectDecisionMappings(options.repoRoot);
  const backlogMappings = preparedBacklogMigrations.map(
    (migration) => migration.mapping,
  );

  const migrationActions: PjmMigrationAction[] = [];
  if (backlogMappings.length > 0) {
    migrationActions.push({
      type: 'migrate-backlog',
      source: relativeToRepo(options.repoRoot, backlogRoot),
      target: 'pjm/backlog',
      result: 'planned',
    });
  }
  if (decisionMappings.length > 0) {
    migrationActions.push({
      type: 'migrate-decisions',
      source: 'reference/decision-record.md',
      target: 'reference/decisions',
      result: 'planned',
    });
  }

  const actions = [...activeMoves, ...migrationActions, ...judgmentProposals];

  if (!apply) {
    return {
      repoRoot: options.repoRoot,
      status: 'dry-run',
      dryRun: true,
      actions,
      backlogMappings,
      decisionMappings,
      written: [],
    };
  }

  // Preflight every failure-prone precondition BEFORE any mechanical mutation so
  // `--apply` is atomic: if a step would fail, we abort here with the tree
  // unchanged. The decision-record parse is the dogfood-surfaced failure mode —
  // an unparseable source previously aborted only after files had already moved,
  // leaving a half-migrated tree.
  await preflightDecisionMigration(options.repoRoot);

  const written: string[] = [];
  written.push(...(await applyActiveMoves(options.repoRoot, activeMoves)));
  await initializeRepoReference({
    repoRoot: options.repoRoot,
    assetsRoot: options.assetsRoot,
    templatesRoot: options.templatesRoot,
    home: options.home,
  });

  const preparedAfterMove = await prepareBacklogMigrations(pjmBacklogRoot);
  written.push(...(await applyBacklogMigrations(preparedAfterMove)));
  if (await pathExists(join(pjmBacklogRoot, 'index.md'))) {
    await regenerateBacklogIndex(pjmBacklogRoot);
    written.push(join(pjmBacklogRoot, 'index.md'));
  } else {
    await initializeBacklog(pjmBacklogRoot);
  }

  const decisionResult = await migrateDecisions(options.repoRoot);
  written.push(...decisionResult.written);
  for (const action of migrationActions) {
    action.result = 'applied';
  }

  return {
    repoRoot: options.repoRoot,
    status: 'migrated',
    dryRun: false,
    actions: [...activeMoves, ...migrationActions, ...judgmentProposals],
    backlogMappings: preparedAfterMove.map((migration) => migration.mapping),
    decisionMappings: decisionResult.mappings,
    written,
  };
}

export async function readPjmMigrationPrompt(
  assetsRoot: string,
): Promise<string> {
  return readFile(join(assetsRoot, 'migration', 'pjm-restructure.md'), 'utf8');
}
