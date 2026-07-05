import { execFile } from 'node:child_process';
import { access, readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';

import {
  getFrontmatterBlock,
  getFrontmatterField,
} from '@commands/shared/frontmatter';

import { regenerateBacklogIndex } from './regenerate-index';
import {
  BACKLOG_ITEM_STATUSES,
  type BacklogItemStatus,
  extractBacklogStatus,
  isValidBacklogStatus,
} from './shared/item-status';

const execFileAsync = promisify(execFile);

const COMPLETED_HEADING = '## Completed Items';
const TODO_SUMMARY = 'TODO: summarize outcome';

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

async function isInsideGitWorkTree(cwd: string): Promise<boolean> {
  try {
    await execFileAsync('git', ['rev-parse', '--is-inside-work-tree'], { cwd });
    return true;
  } catch {
    return false;
  }
}

function unquoteTitle(raw: string | null): string {
  if (!raw) {
    return '';
  }
  return raw.replace(/^['"]|['"]$/g, '').trim();
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

async function moveItemFile(
  backlogRoot: string,
  fromPath: string,
  toPath: string,
  warnings: string[],
): Promise<void> {
  if (await isInsideGitWorkTree(backlogRoot)) {
    try {
      await execFileAsync('git', ['mv', fromPath, toPath], {
        cwd: backlogRoot,
      });
      return;
    } catch {
      warnings.push(
        `\`git mv\` failed for ${fromPath}; falling back to a plain filesystem rename (the move is no longer staged).`,
      );
    }
  }
  await rename(fromPath, toPath);
}

/**
 * Atomic backlog close-out. Validates the current status, sets the terminal
 * status and `updated`, records a canonical `completed.md` entry, moves the
 * item file into `archived/`, and regenerates the index. Idempotent when the
 * item is already archived.
 */
export async function archiveBacklogItem(
  backlogRoot: string,
  id: string,
  options: ArchiveBacklogItemOptions = {},
): Promise<ArchiveBacklogItemResult> {
  const itemsPath = join(backlogRoot, 'items', `${id}.md`);
  const archivedPath = join(backlogRoot, 'archived', `${id}.md`);
  const warnings: string[] = [];

  // Idempotent no-op: already archived.
  if (await pathExists(archivedPath)) {
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
      `Backlog item ${id} is already archived at ${archivedPath}; nothing to do.`,
    );
    return {
      id,
      result: 'noop',
      status,
      completedEntry: 'skipped',
      movedTo: archivedPath,
      indexRegenerated: false,
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
  const now = options.now ?? new Date();
  const updatedIso = now.toISOString().replace(/\.\d{3}Z$/, 'Z');
  const entryDate = updatedIso.slice(0, 10);

  const frontmatterBlock = getFrontmatterBlock(content);
  const title = unquoteTitle(
    frontmatterBlock ? getFrontmatterField(frontmatterBlock, 'title') : null,
  );

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
  const shouldWriteEntry =
    targetStatus === 'closed' || Boolean(options.summary);
  if (shouldWriteEntry) {
    const summary = options.summary?.trim()
      ? options.summary.trim()
      : TODO_SUMMARY;
    const entryLine = `- ${entryDate} — ${id} — ${title} — ${summary}`;

    const completedPath = join(backlogRoot, 'completed.md');
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

  // 6. Move items/<id>.md -> archived/<id>.md (git mv with rename fallback).
  await moveItemFile(backlogRoot, itemsPath, archivedPath, warnings);

  // 7. Regenerate the index via the exported core.
  const regeneration = await regenerateBacklogIndex(backlogRoot);
  warnings.push(...regeneration.warnings);

  return {
    id,
    result: 'archived',
    status: targetStatus,
    completedEntry,
    movedTo: archivedPath,
    indexRegenerated: true,
    warnings,
  };
}
