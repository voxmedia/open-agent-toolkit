// Shared helper for content-idempotent managed-index regeneration.
//
// Managed index files (decision + backlog) contain a CLI-managed block bounded
// by a start/end marker pair. The block holds a markdown table whose rows are
// rebuilt from the per-record files on each `regenerate-index` run.
//
// External formatters (oxfmt/prettier/etc.) frequently re-pad the table cells
// to align columns. Without an idempotence gate, the next `regenerate-index`
// rewrites the formatter's padding back to CLI padding, producing churn and
// noise in the "resolve a merge conflict by re-running regenerate" story.
//
// This helper compares the EXISTING managed block against the freshly rendered
// target block by their LOGICAL content (each table cell trimmed of surrounding
// whitespace), ignoring column padding. When the logical content matches it
// preserves the on-disk bytes verbatim; only a genuine content change (added,
// removed, reordered, or changed record) triggers a rewrite. It makes no
// assumptions about any specific formatter.

// A markdown table delimiter cell (e.g. `---`, `:---`, `:---:`, `-----`).
// Formatters freely re-pad the dash count, so any delimiter cell normalizes to
// a single canonical token and dash-width differences never count as a change.
const DELIMITER_CELL = /^:?-+:?$/;

function normalizeCell(cell: string): string {
  const trimmed = cell.trim();
  return DELIMITER_CELL.test(trimmed) ? '---' : trimmed;
}

/**
 * Parse a managed block's text into a normalized list of rows, where each row
 * is a list of cells trimmed of surrounding whitespace. The marker lines and
 * any blank lines are ignored so that formatter-introduced blank lines or
 * column padding never count as a logical difference.
 */
function parseManagedRows(blockText: string): string[][] {
  return blockText
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .filter((line) => !line.startsWith('<!--'))
    .map((line) => {
      // A markdown table row is `| cell | cell | ... |`. Drop the leading and
      // trailing pipe, then split on unescaped pipes and normalize each cell.
      const inner = line.replace(/^\|/, '').replace(/\|$/, '');
      return inner.split('|').map((cell) => normalizeCell(cell));
    });
}

function rowsEqual(a: string[][], b: string[][]): boolean {
  if (a.length !== b.length) {
    return false;
  }

  for (let rowIndex = 0; rowIndex < a.length; rowIndex += 1) {
    const rowA = a[rowIndex]!;
    const rowB = b[rowIndex]!;
    if (rowA.length !== rowB.length) {
      return false;
    }
    for (let cellIndex = 0; cellIndex < rowA.length; cellIndex += 1) {
      if (rowA[cellIndex] !== rowB[cellIndex]) {
        return false;
      }
    }
  }

  return true;
}

export interface ManagedIndexUpdate {
  /**
   * The full file content to write, or `null` when the existing managed block
   * is already content-equal to the target (callers must skip the write to
   * preserve the on-disk bytes, including any external formatter's padding).
   */
  content: string | null;
}

/**
 * Compute the content-idempotent result of regenerating a managed index block.
 *
 * @param existingContent Current on-disk file content (already known to contain
 *   the marker pair; bounds are passed in to avoid re-scanning).
 * @param startIndex Index of the start marker within `existingContent`.
 * @param endMarkerEnd Index just past the end marker within `existingContent`.
 * @param renderedBlock Freshly rendered managed block (start marker ... end
 *   marker) built from the record files.
 * @returns `{ content: null }` when the logical rows match (skip the write), or
 *   `{ content: <full file text> }` when the block must be rewritten.
 */
export function computeManagedIndexUpdate(
  existingContent: string,
  startIndex: number,
  endMarkerEnd: number,
  renderedBlock: string,
): ManagedIndexUpdate {
  const existingBlock = existingContent.slice(startIndex, endMarkerEnd);

  if (
    rowsEqual(parseManagedRows(existingBlock), parseManagedRows(renderedBlock))
  ) {
    return { content: null };
  }

  const before = existingContent.slice(0, startIndex);
  const after = existingContent.slice(endMarkerEnd);
  return { content: `${before}${renderedBlock}${after}` };
}
