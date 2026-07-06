// Single source of truth for backlog item statuses. Kept dependency-free so
// cross-directory consumers (archive, regenerate-index, pjm doctor) can import
// it via the `@commands/...` alias without pulling in a dependency chain.

export const BACKLOG_ITEM_STATUSES = [
  'open',
  'in_progress',
  'closed',
  'wont_do',
] as const;

export type BacklogItemStatus = (typeof BACKLOG_ITEM_STATUSES)[number];

export const TERMINAL_BACKLOG_STATUSES: readonly BacklogItemStatus[] = [
  'closed',
  'wont_do',
];

export function isValidBacklogStatus(
  value: string,
): value is BacklogItemStatus {
  return (BACKLOG_ITEM_STATUSES as readonly string[]).includes(value);
}

export function isTerminalBacklogStatus(value: string): boolean {
  return (TERMINAL_BACKLOG_STATUSES as readonly string[]).includes(value);
}

/**
 * Extract the `status` value from backlog item content. Accepts either full
 * item content (with `---` fences) or a bare frontmatter block. Inline enum
 * comments (`status: closed # ...`) are stripped. Returns `null` when no
 * `status` field is present.
 */
export function extractBacklogStatus(
  frontmatterContent: string,
): string | null {
  const fenced = frontmatterContent.match(/^---\n([\s\S]*?)\n---/);
  const block = fenced ? fenced[1]! : frontmatterContent;

  const match = block.match(/^status:\s*(.+)$/m);
  if (!match) {
    return null;
  }

  return match[1]!.replace(/\s*#.*$/, '').trim();
}
