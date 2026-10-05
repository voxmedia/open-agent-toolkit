import { execFile } from 'node:child_process';
import { access, readFile, rename, writeFile } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { promisify } from 'node:util';

import { getFrontmatterBlock } from '@commands/shared/frontmatter';
import YAML from 'yaml';

import { regenerateBacklogIndex } from './regenerate-index';
import { rewriteInboundReferences } from './rewrite-references';
import {
  BACKLOG_ITEM_STATUSES,
  type BacklogItemStatus,
  extractBacklogStatus,
  isValidBacklogStatus,
} from './shared/item-status';

const execFileAsync = promisify(execFile);

const COMPLETED_HEADING = '## Completed Items';

const STARTER_COMPLETED = [
  '# OAT Backlog Completed',
  '',
  '> Summary archive for completed backlog work. Keep newest entries first. Use `backlog/archived/` for full file-per-item historical records when a completed item still needs rich context.',
  '',
  '## Entry Format',
  '',
  '- `YYYY-MM-DD — BL-YYMMDD-slug — Title — one-line outcome summary`',
  '',
  COMPLETED_HEADING,
  '',
].join('\n');

/** Result of an {@link archiveBacklogItem} run. */
export interface ArchiveBacklogItemResult {
  id: string;
  result: 'archived' | 'noop';
  status: BacklogItemStatus | null;
  completedEntry: 'written' | 'scaffolded' | 'skipped';
  movedTo: string | null;
  indexRegenerated: boolean;
  /**
   * Markdown files under `.oat/repo/**` whose references to
   * `items/<id>.md` were rewritten to `archived/<id>.md`, relative to the
   * repository root.
   */
  rewrittenReferences: string[];
  /** Normalized absolute paths owned by this operation, including the old
   * item deletion and retry outputs. Archive never stages any of these paths. */
  affectedPaths: string[];
  warnings: string[];
}

export interface ArchiveBacklogItemOptions {
  wontDo?: boolean;
  summary?: string;
  /** Injectable clock for deterministic tests; defaults to the current time. */
  now?: Date;
}

/**
 * Actionable close-out failure (unknown id, invalid current status). The
 * command wrapper maps `exitCode` onto `process.exitCode` and logs `message`.
 */
export class BacklogArchiveError extends Error {
  readonly exitCode: 1 | 2;

  constructor(message: string, exitCode: 1 | 2 = 1) {
    super(message);
    this.name = 'BacklogArchiveError';
    this.exitCode = exitCode;
  }
}

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

/**
 * Read the item `title` from its frontmatter. Parses the YAML block (rather
 * than a line regex) so a legitimate `#` inside a quoted title — e.g.
 * `title: 'Fix #123 crash'` — is preserved instead of being stripped as an
 * inline comment.
 */
function readItemTitle(content: string): string {
  const block = getFrontmatterBlock(content);
  if (!block) {
    return '';
  }
  const parsed = YAML.parse(block);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return '';
  }
  return String((parsed as Record<string, unknown>).title ?? '').trim();
}

/**
 * Minimal-diff frontmatter rewrite: replace only the `status:` value (keeping
 * any inline enum comment) and the `updated:` value, leaving all surrounding
 * formatting untouched.
 */
function rewriteFrontmatter(
  content: string,
  status: BacklogItemStatus,
  updatedIso: string,
): string {
  let next = content.replace(
    /^(status:[ \t]*)(\S+)([ \t]*#.*)?$/m,
    (_match, prefix: string, _value: string, comment?: string) =>
      `${prefix}${status}${comment ?? ''}`,
  );
  next = next.replace(
    /^(updated:)[ \t]*.*$/m,
    (_match, prefix: string) => `${prefix} '${updatedIso}'`,
  );
  return next;
}

/**
 * Insert `entryLine` as the first bullet beneath the `## Completed Items`
 * heading. When the heading is absent it is scaffolded (with a warning). The
 * returned flag distinguishes a plain append from one that had to scaffold the
 * section.
 */
function insertCompletedEntry(
  completed: string,
  entryLine: string,
): { content: string; scaffolded: boolean; warning: string | null } {
  const lines = completed.split('\n');
  const headingIndex = lines.findIndex(
    (line) => line.trim() === COMPLETED_HEADING,
  );

  if (headingIndex === -1) {
    const trimmed = completed.replace(/\s*$/, '');
    const content = `${trimmed}\n\n${COMPLETED_HEADING}\n\n${entryLine}\n`;
    return {
      content,
      scaffolded: true,
      warning: `Completed log was missing a \`${COMPLETED_HEADING}\` heading; a new section was scaffolded and the entry appended.`,
    };
  }

  let insertAt = headingIndex + 1;
  while (insertAt < lines.length && lines[insertAt]!.trim() === '') {
    insertAt += 1;
  }
  lines.splice(insertAt, 0, entryLine);
  // Guarantee exactly one blank line between the heading and the first entry.
  if (lines[headingIndex + 1] !== '') {
    lines.splice(headingIndex + 1, 0, '');
  }

  let content = lines.join('\n');
  if (!content.endsWith('\n')) {
    content += '\n';
  }
  return { content, scaffolded: false, warning: null };
}

async function readHeadFile(
  backlogRoot: string,
  path: string,
): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync(
      'git',
      ['show', `HEAD:./${relative(resolve(backlogRoot), resolve(path))}`],
      { cwd: backlogRoot },
    );
    return stdout;
  } catch {
    // No Git/HEAD or absent path gives no evidence of a prior operation.
    return null;
  }
}

function hasCompletedEntry(content: string | null, id: string): boolean {
  return (
    content !== null &&
    content
      .split('\n')
      .some((line) => line.startsWith('- ') && line.includes(` — ${id} — `))
  );
}

function hasIndexEntry(content: string | null, id: string): boolean {
  return (
    content !== null &&
    content
      .split('\n')
      .some((line) => line.startsWith('|') && line.split('|')[1]?.trim() === id)
  );
}

function collectAffectedPaths(
  backlogRoot: string,
  id: string,
  references: string[],
  changes: { item: boolean; completed: boolean; index: boolean },
): string[] {
  const paths = [...references];
  if (changes.item)
    paths.push(
      resolve(backlogRoot, 'items', `${id}.md`),
      resolve(backlogRoot, 'archived', `${id}.md`),
    );
  if (changes.completed) paths.push(resolve(backlogRoot, 'completed.md'));
  if (changes.index) paths.push(resolve(backlogRoot, 'index.md'));
  return [...new Set(paths)].sort();
}

/**
 * Atomic backlog close-out. Validates the current status, sets the terminal
 * status and `updated`, records a canonical `completed.md` entry, moves the
 * item file into `archived/`, rewrites inbound `.oat/repo` references to the
 * moved file, and regenerates the index. Idempotent when the item is already
 * archived: that path writes no status, completed-log, or move changes and only
 * retries the reference rewrite and index regeneration.
 */
export async function archiveBacklogItem(
  backlogRoot: string,
  id: string,
  options: ArchiveBacklogItemOptions = {},
): Promise<ArchiveBacklogItemResult> {
  const itemsPath = join(backlogRoot, 'items', `${id}.md`);
  const archivedPath = join(backlogRoot, 'archived', `${id}.md`);
  const warnings: string[] = [];
  const completedPath = join(backlogRoot, 'completed.md');
  const indexPath = join(backlogRoot, 'index.md');

  // Already archived: no status, completed-log, or move writes; only the
  // idempotent reference rewrite and index regeneration are retried.
  if (await pathExists(archivedPath)) {
    // Conflicting duplicate: the same id lives in BOTH `items/` and
    // `archived/`. Treating this as a clean no-op would silently leave the live
    // `items/` copy unarchived, while auto-archiving would clobber the existing
    // archived record. Refuse and make the user reconcile the duplicate.
    if (await pathExists(itemsPath)) {
      throw new BacklogArchiveError(
        `Backlog item ${id} exists in both \`items/\` (${itemsPath}) and \`archived/\` (${archivedPath}). Auto-archiving would clobber the existing archived record, so this is left untouched. Fix: reconcile the duplicate manually — decide which of the two files is authoritative and remove the other — then re-run \`oat backlog archive ${id}\`.`,
      );
    }
    let status: BacklogItemStatus | null = null;
    try {
      const extracted = extractBacklogStatus(
        await readFile(archivedPath, 'utf8'),
      );
      status = extracted && isValidBacklogStatus(extracted) ? extracted : null;
    } catch {
      status = null;
    }
    warnings.push(
      `Backlog item ${id} is already archived at ${archivedPath}; re-checked inbound references and regenerated the index.`,
    );
    // Retry the idempotent tail of a close-out: a run that failed during the
    // reference rewrite (or an item archived before the rewrite existed)
    // still gets its inbound links repointed and the index regenerated.
    const [headItem, headArchived, headCompleted, headIndex] =
      await Promise.all([
        readHeadFile(backlogRoot, itemsPath),
        readHeadFile(backlogRoot, archivedPath),
        readHeadFile(backlogRoot, completedPath),
        readHeadFile(backlogRoot, indexPath),
      ]);
    const pendingMove = headItem !== null && headArchived === null;
    const indexBefore = await readFile(indexPath, 'utf8').catch(
      (error: NodeJS.ErrnoException) => {
        if (error.code === 'ENOENT') return null;
        throw error;
      },
    );
    const references = await rewriteInboundReferences(
      backlogRoot,
      itemsPath,
      archivedPath,
      { rebaseMovedItem: false, recoverPendingArchive: pendingMove },
    );
    warnings.push(...references.warnings);
    const regeneration = await regenerateBacklogIndex(backlogRoot);
    warnings.push(...regeneration.warnings);
    return {
      id,
      result: 'noop',
      status,
      completedEntry: 'skipped',
      movedTo: archivedPath,
      indexRegenerated: true,
      rewrittenReferences: references.rewritten,
      affectedPaths: collectAffectedPaths(
        backlogRoot,
        id,
        references.affectedPaths,
        {
          item: pendingMove,
          completed:
            pendingMove &&
            hasCompletedEntry(
              await readFile(completedPath, 'utf8').catch(
                (error: NodeJS.ErrnoException) => {
                  if (error.code === 'ENOENT') return '';
                  throw error;
                },
              ),
              id,
            ) &&
            !hasCompletedEntry(headCompleted, id),
          index:
            indexBefore !== (await readFile(indexPath, 'utf8')) ||
            (pendingMove &&
              hasIndexEntry(headIndex, id) &&
              !hasIndexEntry(await readFile(indexPath, 'utf8'), id)),
        },
      ),
      warnings,
    };
  }

  if (!(await pathExists(itemsPath))) {
    throw new BacklogArchiveError(
      `Backlog item ${id} not found at ${itemsPath}. Confirm the id and that the file lives under \`items/\`, then re-run \`oat backlog archive ${id}\`.`,
    );
  }

  const content = await readFile(itemsPath, 'utf8');
  const currentStatus = extractBacklogStatus(content);
  if (currentStatus === null || !isValidBacklogStatus(currentStatus)) {
    throw new BacklogArchiveError(
      `Backlog item ${itemsPath} has invalid status "${currentStatus ?? ''}". Valid statuses: ${BACKLOG_ITEM_STATUSES.join(', ')}. Fix: correct the \`status\` field manually, then re-run \`oat backlog archive ${id}\`.`,
    );
  }

  const targetStatus: BacklogItemStatus = options.wontDo ? 'wont_do' : 'closed';
  const summary = options.summary?.trim() ?? '';
  if (targetStatus === 'closed' && summary.length === 0) {
    throw new BacklogArchiveError(
      `Closing backlog item ${id} requires a non-empty outcome summary. Fix: rerun with \`--summary "<outcome>"\`.`,
    );
  }

  const now = options.now ?? new Date();
  const updatedIso = now.toISOString().replace(/\.\d{3}Z$/, 'Z');
  const entryDate = updatedIso.slice(0, 10);

  const title = readItemTitle(content);

  // 4. Rewrite frontmatter in place (before the move) so a crash leaves the
  //    detectable "terminal status still in items/" drift, never corruption.
  await writeFile(
    itemsPath,
    rewriteFrontmatter(content, targetStatus, updatedIso),
    'utf8',
  );

  // 5. completed.md entry — always for `closed`; only with a summary for
  //    `wont_do`.
  let completedEntry: ArchiveBacklogItemResult['completedEntry'] = 'skipped';
  const shouldWriteEntry = targetStatus === 'closed' || summary.length > 0;
  if (shouldWriteEntry) {
    const entryLine = `- ${entryDate} — ${id} — ${title} — ${summary}`;

    let scaffoldedFile = false;
    let existing: string;
    if (await pathExists(completedPath)) {
      existing = await readFile(completedPath, 'utf8');
    } else {
      existing = STARTER_COMPLETED;
      scaffoldedFile = true;
    }

    const inserted = insertCompletedEntry(existing, entryLine);
    if (inserted.warning) {
      warnings.push(inserted.warning);
    }
    await writeFile(completedPath, inserted.content, 'utf8');
    completedEntry =
      scaffoldedFile || inserted.scaffolded ? 'scaffolded' : 'written';
  }

  // 6. Filesystem-only move: the caller owns staging the complete operation.
  await rename(itemsPath, archivedPath);

  // 7. Rewrite inbound references so no `.oat/repo` link dangles at items/.
  const references = await rewriteInboundReferences(
    backlogRoot,
    itemsPath,
    archivedPath,
  );
  warnings.push(...references.warnings);

  // 8. Regenerate the index via the exported core.
  const regeneration = await regenerateBacklogIndex(backlogRoot);
  warnings.push(...regeneration.warnings);

  return {
    id,
    result: 'archived',
    status: targetStatus,
    completedEntry,
    movedTo: archivedPath,
    indexRegenerated: true,
    rewrittenReferences: references.rewritten,
    affectedPaths: collectAffectedPaths(
      backlogRoot,
      id,
      references.affectedPaths,
      { item: true, completed: shouldWriteEntry, index: true },
    ),
    warnings,
  };
}
