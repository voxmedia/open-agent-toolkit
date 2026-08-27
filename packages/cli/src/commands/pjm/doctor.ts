import { access, readdir, readFile } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';

import {
  BACKLOG_ITEM_STATUSES,
  extractBacklogStatus,
  isTerminalBacklogStatus,
  isValidBacklogStatus,
} from '@commands/backlog/shared/item-status';
import { getFrontmatterBlock } from '@commands/shared/frontmatter';
import type { DoctorCheck } from '@ui/output';

import { resolvePjmAdoption, type PjmAdoption } from './adoption';
import { CANONICAL_REPO_REFERENCE_PATHS } from './init';

const ALLOWED_TOP_LEVEL_DIRECTORIES = new Set([
  'pjm',
  'reference',
  'knowledge',
  'analysis',
  'reviews',
]);
// A human-facing `README.md` at the repo-reference root is benign, so it is an
// allowed top-level file alongside the canonical `AGENTS.md` (F5).
const ALLOWED_TOP_LEVEL_FILES = new Set(['AGENTS.md', 'README.md']);
const LEGACY_MONOLITHS = ['reference/decision-record.md'] as const;

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

async function readIfExists(path: string): Promise<string | null> {
  try {
    return await readFile(path, 'utf8');
  } catch (error) {
    const code =
      error && typeof error === 'object' && 'code' in error
        ? String(error.code)
        : null;

    if (code !== 'ENOENT') {
      throw error;
    }

    return null;
  }
}

async function listDirectoryNames(path: string): Promise<string[]> {
  try {
    return (await readdir(path, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory() || entry.isFile())
      .map((entry) => entry.name)
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

async function listMarkdownFiles(path: string): Promise<string[]> {
  try {
    return (await readdir(path, { withFileTypes: true }))
      .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
      .map((entry) => entry.name)
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

// Migrated record directories (relative to the repo-reference root) that hold
// per-record markdown files and must not retain raw template frontmatter after
// `oat pjm migrate`. `index.md` is the managed index, not an instantiated
// record, so it is excluded.
const MIGRATED_RECORD_DIRECTORIES = [
  'pjm/backlog/items',
  'pjm/backlog/archived',
  'reference/decisions',
] as const;

async function collectMigratedTemplateFrontmatterFiles(
  repoRoot: string,
): Promise<string[]> {
  const offenders: string[] = [];
  for (const relativeDir of MIGRATED_RECORD_DIRECTORIES) {
    const fileNames = await listMarkdownFiles(join(repoRoot, relativeDir));
    for (const fileName of fileNames) {
      if (fileName === 'index.md') {
        continue;
      }
      const relativePath = `${relativeDir}/${fileName}`;
      const content = await readIfExists(join(repoRoot, relativeDir, fileName));
      if (content && containsTemplateFrontmatter(content)) {
        offenders.push(relativePath);
      }
    }
  }
  return offenders;
}

function containsTemplateFrontmatter(content: string): boolean {
  const frontmatter = getFrontmatterBlock(content);
  return Boolean(
    frontmatter &&
    (/\boat_template\s*:/i.test(frontmatter) ||
      /\boat_template_name\s*:/i.test(frontmatter)),
  );
}

const BACKLOG_ITEMS_DIRECTORY = 'pjm/backlog/items';
const BACKLOG_ARCHIVED_DIRECTORY = 'pjm/backlog/archived';
const BACKLOG_COMPLETED_FILE = 'pjm/backlog/completed.md';
// Best-effort backlog id scan: `BL-YYMMDD-slug` (legacy lowercase `bl-`
// matched case-insensitively). The six-digit requirement keeps the literal
// `BL-YYMMDD-slug` format placeholder in `completed.md` from matching.
const BACKLOG_ID_PATTERN = /\bbl-\d{6}-[a-z0-9][a-z0-9-]*/gi;

interface BacklogItemRecord {
  directory: 'items' | 'archived';
  relativePath: string;
  id: string;
  status: string | null;
}

/**
 * Single frontmatter pass over both backlog directories. Every drift check
 * derives from this scan so the filesystem is walked once. `index.md` is the
 * managed index, not an item, so it is excluded.
 */
async function collectBacklogItems(
  repoRoot: string,
): Promise<BacklogItemRecord[]> {
  const records: BacklogItemRecord[] = [];
  const directories = [
    { directory: 'items' as const, relativeDir: BACKLOG_ITEMS_DIRECTORY },
    { directory: 'archived' as const, relativeDir: BACKLOG_ARCHIVED_DIRECTORY },
  ];
  for (const { directory, relativeDir } of directories) {
    const fileNames = await listMarkdownFiles(join(repoRoot, relativeDir));
    for (const fileName of fileNames) {
      if (fileName === 'index.md') {
        continue;
      }
      const content = await readIfExists(join(repoRoot, relativeDir, fileName));
      records.push({
        directory,
        relativePath: `${relativeDir}/${fileName}`,
        id: fileName.replace(/\.md$/, ''),
        status: content ? extractBacklogStatus(content) : null,
      });
    }
  }
  return records;
}

/** Best-effort scan of completed-log content for backlog item ids. */
function extractCompletedIds(content: string): string[] {
  return [...content.matchAll(BACKLOG_ID_PATTERN)].map((match) => match[0]!);
}

function checkStatus(missing: string[]): 'pass' | 'fail' {
  return missing.length === 0 ? 'pass' : 'fail';
}

function warnStatus(items: string[]): 'pass' | 'warn' {
  return items.length === 0 ? 'pass' : 'warn';
}

export interface PjmDoctorOptions {
  projectRoot?: string;
  adoption?: PjmAdoption;
}

export async function runPjmDoctorChecks(
  repoRoot: string,
  options: PjmDoctorOptions = {},
): Promise<DoctorCheck[]> {
  const repoParent = dirname(repoRoot);
  const projectRoot =
    options.projectRoot ??
    (basename(repoParent) === '.oat' ? dirname(repoParent) : repoParent);
  const adoption =
    options.adoption ?? (await resolvePjmAdoption({ repoRoot, projectRoot }));

  const adoptionCheck: DoctorCheck = {
    name: 'pjm:adoption',
    description: 'Repository PJM adoption',
    status:
      adoption.state === 'none'
        ? 'warn'
        : adoption.state === 'partial-initialization'
          ? 'fail'
          : 'pass',
    message:
      adoption.state === 'declared'
        ? 'Repository has explicit PJM adoption state.'
        : adoption.state === 'inferred-legacy'
          ? 'Repository has a complete legacy PJM scaffold without an explicit marker.'
          : adoption.state === 'partial-initialization'
            ? 'Repository has a partial PJM scaffold and is not adopted.'
            : 'Repository has not adopted PJM.',
    fix: adoption.recovery
      ? `Run \`${adoption.recovery}\` to initialize this repository.`
      : undefined,
  };

  if (adoption.state === 'none') {
    return [adoptionCheck];
  }

  const checks: DoctorCheck[] = [adoptionCheck];

  const missingCanonical: string[] = [];
  for (const relativePath of CANONICAL_REPO_REFERENCE_PATHS) {
    if (!(await pathExists(join(repoRoot, relativePath)))) {
      missingCanonical.push(relativePath);
    }
  }
  checks.push({
    name: 'pjm:canonical_files',
    description: 'PJM canonical file existence',
    status: checkStatus(missingCanonical),
    message:
      missingCanonical.length === 0
        ? 'Canonical PJM files are present.'
        : `Missing canonical PJM files: ${missingCanonical.join(', ')}`,
    fix:
      missingCanonical.length === 0
        ? undefined
        : 'Run `oat pjm init` to restore the canonical PJM scaffold.',
  });

  const templateFrontmatterFiles: string[] = [];
  for (const relativePath of CANONICAL_REPO_REFERENCE_PATHS) {
    if (!relativePath.endsWith('.md')) {
      continue;
    }
    const content = await readIfExists(join(repoRoot, relativePath));
    if (content && containsTemplateFrontmatter(content)) {
      templateFrontmatterFiles.push(relativePath);
    }
  }
  // Also scan migrated per-record files (backlog items/archived, decision
  // records). Dogfooding surfaced that `oat pjm migrate` could leave raw
  // `oat_template` frontmatter on migrated records while doctor only inspected
  // the canonical scaffold and reported a false `pass`.
  const migratedTemplateFiles =
    await collectMigratedTemplateFrontmatterFiles(repoRoot);
  for (const relativePath of migratedTemplateFiles) {
    if (!templateFrontmatterFiles.includes(relativePath)) {
      templateFrontmatterFiles.push(relativePath);
    }
  }
  checks.push({
    name: 'pjm:template_frontmatter',
    description: 'Instantiated PJM files are not raw templates',
    status: checkStatus(templateFrontmatterFiles),
    message:
      templateFrontmatterFiles.length === 0
        ? 'No template frontmatter found in canonical PJM files.'
        : `Template frontmatter still present in: ${templateFrontmatterFiles.join(', ')}`,
    fix:
      templateFrontmatterFiles.length === 0
        ? undefined
        : 'Regenerate or manually remove oat_template frontmatter from instantiated files.',
  });

  const topLevelNames = await listDirectoryNames(repoRoot);
  const unknownTopLevel = topLevelNames.filter(
    (name) =>
      !ALLOWED_TOP_LEVEL_DIRECTORIES.has(name) &&
      !ALLOWED_TOP_LEVEL_FILES.has(name),
  );
  checks.push({
    name: 'pjm:top_level_layout',
    description: 'PJM top-level repo-reference layout',
    status: warnStatus(unknownTopLevel),
    message:
      unknownTopLevel.length === 0
        ? 'No unknown top-level PJM folders or files found.'
        : `Unknown top-level PJM entries: ${unknownTopLevel.join(', ')}`,
    fix:
      unknownTopLevel.length === 0
        ? undefined
        : 'Move ad-hoc durable references under reference/ or document an allowed top-level folder.',
  });

  const legacyMonoliths: string[] = [];
  for (const relativePath of LEGACY_MONOLITHS) {
    if (await pathExists(join(repoRoot, relativePath))) {
      legacyMonoliths.push(relativePath);
    }
  }
  checks.push({
    name: 'pjm:legacy_monoliths',
    description: 'Legacy PJM monolith files',
    status: warnStatus(legacyMonoliths),
    message:
      legacyMonoliths.length === 0
        ? 'No legacy PJM monolith files found.'
        : `Legacy PJM monoliths still present: ${legacyMonoliths.join(', ')}`,
    fix:
      legacyMonoliths.length === 0
        ? undefined
        : 'Run `oat decision migrate` or keep the file explicitly documented as legacy.',
  });

  const referenceEntries = await listDirectoryNames(
    join(repoRoot, 'reference'),
  );
  const looseReferenceFiles = referenceEntries
    .filter((name) => name.endsWith('.md'))
    .filter(
      (name) =>
        name !== 'AGENTS.md' &&
        name !== 'decision-record.md' &&
        name !== 'roadmap.md' &&
        name !== 'current-state.md',
    )
    .map((name) => `reference/${name}`);
  checks.push({
    name: 'pjm:loose_reference_files',
    description: 'Loose reference files outside documented destinations',
    status: warnStatus(looseReferenceFiles),
    message:
      looseReferenceFiles.length === 0
        ? 'No loose reference files found.'
        : `Loose reference files found: ${looseReferenceFiles.join(', ')}`,
    fix:
      looseReferenceFiles.length === 0
        ? undefined
        : 'Move loose files into a documented reference subfolder or add a destination guide.',
  });

  const secondRoadmaps: string[] = [];
  for (const relativePath of [
    'reference/roadmap.md',
    'reference/current-state.md',
  ]) {
    if (await pathExists(join(repoRoot, relativePath))) {
      secondRoadmaps.push(relativePath);
    }
  }
  checks.push({
    name: 'pjm:second_roadmap',
    description: 'Duplicate active PJM files under reference',
    status: warnStatus(secondRoadmaps),
    message:
      secondRoadmaps.length === 0
        ? 'No duplicate roadmap/current-state files found under reference/.'
        : `Duplicate active PJM files under reference/: ${secondRoadmaps.join(', ')}`,
    fix:
      secondRoadmaps.length === 0
        ? undefined
        : 'Move active operational docs to pjm/ and leave reference/ for durable append-mostly artifacts.',
  });

  const backlogItems = await collectBacklogItems(repoRoot);

  const terminalInItems = backlogItems
    .filter(
      (item) =>
        item.directory === 'items' &&
        item.status !== null &&
        isTerminalBacklogStatus(item.status),
    )
    .map((item) => item.relativePath);
  checks.push({
    name: 'pjm:backlog_terminal_in_items',
    description: 'Terminal-status backlog items awaiting archive',
    status: checkStatus(terminalInItems),
    message:
      terminalInItems.length === 0
        ? 'No terminal-status backlog items remain under items/.'
        : `Terminal-status backlog items still under items/: ${terminalInItems.join(', ')}`,
    fix:
      terminalInItems.length === 0
        ? undefined
        : 'Run `oat backlog archive <id>` to move each closed/wont_do item into archived/.',
  });

  // A missing/empty `status:` is as much a drift as an out-of-enum value: the
  // `oat backlog archive` command rejects both, so `pjm doctor` must surface
  // both rather than leaving status-less items silently invisible.
  const missingStatusItems = backlogItems
    .filter((item) => item.status === null || item.status.trim() === '')
    .map((item) => item.relativePath);
  const outOfEnumStatusItems = backlogItems
    .filter(
      (item) =>
        item.status !== null &&
        item.status.trim() !== '' &&
        !isValidBacklogStatus(item.status),
    )
    .map((item) => item.relativePath);
  const invalidStatus = [...outOfEnumStatusItems, ...missingStatusItems];
  const invalidStatusDetails: string[] = [];
  if (outOfEnumStatusItems.length > 0) {
    invalidStatusDetails.push(
      `out-of-enum status: ${outOfEnumStatusItems.join(', ')}`,
    );
  }
  if (missingStatusItems.length > 0) {
    invalidStatusDetails.push(
      `missing status: ${missingStatusItems.join(', ')}`,
    );
  }
  checks.push({
    name: 'pjm:backlog_invalid_status',
    description: 'Backlog items with a missing or out-of-enum status',
    status: checkStatus(invalidStatus),
    message:
      invalidStatus.length === 0
        ? 'All backlog item statuses are within the valid enum.'
        : `Backlog items with an invalid status (${invalidStatusDetails.join('; ')}). Valid statuses: ${BACKLOG_ITEM_STATUSES.join(', ')}.`,
    fix:
      invalidStatus.length === 0
        ? undefined
        : `Set a valid status (${BACKLOG_ITEM_STATUSES.join(', ')}) on each listed item.`,
  });

  const archivedOpen = backlogItems
    .filter(
      (item) =>
        item.directory === 'archived' &&
        item.status !== null &&
        isValidBacklogStatus(item.status) &&
        !isTerminalBacklogStatus(item.status),
    )
    .map((item) => item.relativePath);
  checks.push({
    name: 'pjm:backlog_archived_open',
    description: 'Archived backlog items with a non-terminal status',
    status: warnStatus(archivedOpen),
    message:
      archivedOpen.length === 0
        ? 'No archived backlog items carry an open status.'
        : `Archived backlog items still marked open/in_progress: ${archivedOpen.join(', ')}`,
    fix:
      archivedOpen.length === 0
        ? undefined
        : 'Set a terminal status (closed/wont_do) on each archived item, or move it back under items/.',
  });

  // A single id must never live in both `items/` and `archived/`: the live copy
  // shadows the archived record and `oat backlog archive` refuses to reconcile
  // it automatically (auto-archiving would clobber the archived file). Derive
  // from the same single scan so the filesystem is not re-walked.
  const backlogPathsByIdAndDir = new Map<
    string,
    { items?: string; archived?: string }
  >();
  for (const item of backlogItems) {
    const key = item.id.toLowerCase();
    const entry = backlogPathsByIdAndDir.get(key) ?? {};
    entry[item.directory] = item.relativePath;
    backlogPathsByIdAndDir.set(key, entry);
  }
  const duplicateIdPairs: string[] = [];
  for (const entry of backlogPathsByIdAndDir.values()) {
    if (entry.items && entry.archived) {
      duplicateIdPairs.push(`${entry.items} + ${entry.archived}`);
    }
  }
  checks.push({
    name: 'pjm:backlog_duplicate_id',
    description: 'Backlog ids present in both items/ and archived/',
    status: checkStatus(duplicateIdPairs),
    message:
      duplicateIdPairs.length === 0
        ? 'No backlog id is present in both items/ and archived/.'
        : `Backlog ids present in both items/ and archived/: ${duplicateIdPairs.join('; ')}`,
    fix:
      duplicateIdPairs.length === 0
        ? undefined
        : 'Reconcile each duplicate manually: decide whether the active (items/) or archived copy is authoritative, remove the other, then re-run `oat backlog archive <id>` if the item still needs archiving.',
  });

  const itemPathsById = new Map<string, string>();
  for (const item of backlogItems) {
    if (item.directory === 'items') {
      itemPathsById.set(item.id.toLowerCase(), item.relativePath);
    }
  }
  const completedContent = await readIfExists(
    join(repoRoot, BACKLOG_COMPLETED_FILE),
  );
  const completedUnarchived: string[] = [];
  const seenUnarchived = new Set<string>();
  if (completedContent) {
    for (const completedId of extractCompletedIds(completedContent)) {
      const relativePath = itemPathsById.get(completedId.toLowerCase());
      if (relativePath && !seenUnarchived.has(relativePath)) {
        seenUnarchived.add(relativePath);
        completedUnarchived.push(relativePath);
      }
    }
  }
  checks.push({
    name: 'pjm:backlog_completed_unarchived',
    description: 'Completed-log entries whose item file is still under items/',
    status: warnStatus(completedUnarchived),
    message:
      completedUnarchived.length === 0
        ? 'No completed backlog entries reference an item still under items/.'
        : `Completed log references items still under items/: ${completedUnarchived.join(', ')}`,
    fix:
      completedUnarchived.length === 0
        ? undefined
        : 'Run `oat backlog archive <id>` to archive each completed item still under items/.',
  });

  return checks;
}
