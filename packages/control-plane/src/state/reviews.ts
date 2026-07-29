import { readdir } from 'node:fs/promises';
import { join } from 'node:path';

import { isMissingFileError } from '../shared/utils/errors';
import { parseFrontmatterRecord } from '../shared/utils/frontmatter';
import type { ReviewStatus } from '../types';

const REVIEWS_HEADING = '## Reviews';
const FULL_COMMIT_SHA = /^[0-9a-f]{40}$/i;

interface ReviewColumnIndices {
  scope: number;
  type: number;
  status: number;
  date: number;
  artifact: number;
  reviewedHead?: number;
  invocation?: number;
  gateTarget?: number;
}

export function parseReviewTable(planContent: string): ReviewStatus[] {
  const reviewsSection = extractReviewsSection(planContent);
  if (reviewsSection == null) {
    return [];
  }

  const rows = reviewsSection
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('|'));

  const columns = resolveReviewColumnIndices(parseTableCells(rows[0] ?? ''));
  if (columns == null) {
    return [];
  }

  return rows
    .slice(2)
    .map((line) => parseTableRow(line, columns))
    .filter((row): row is ReviewStatus => row !== null);
}

export async function scanUnprocessedReviews(
  projectPath: string,
): Promise<string[]> {
  const reviewsPath = join(projectPath, 'reviews');

  try {
    const entries = await readdir(reviewsPath, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
      .map((entry) => join(reviewsPath, entry.name))
      .sort();
  } catch (error) {
    if (isMissingFileError(error)) {
      return [];
    }

    throw error;
  }
}

export function parseReviewArtifactIdentity(
  content: string,
): { scope: string; type: string } | null {
  const frontmatter = parseFrontmatterRecord(content);
  const scope =
    typeof frontmatter.oat_review_scope === 'string'
      ? frontmatter.oat_review_scope.trim()
      : '';
  const type =
    typeof frontmatter.oat_review_type === 'string'
      ? frontmatter.oat_review_type.trim()
      : '';

  return scope && type ? { scope, type } : null;
}

function extractReviewsSection(planContent: string): string | null {
  const reviewsHeading = new RegExp(
    `^${REVIEWS_HEADING}[ \\t]*\\r?$`,
    'm',
  ).exec(planContent);
  if (!reviewsHeading) {
    return null;
  }

  const remaining = planContent.slice(
    reviewsHeading.index + reviewsHeading[0].length,
  );
  const nextHeadingIndex = remaining.search(/^##(?!#)[ \t]+\S.*\r?$/m);
  if (nextHeadingIndex === -1) {
    return remaining.trim();
  }

  return remaining.slice(0, nextHeadingIndex).trim();
}

function parseTableRow(
  line: string,
  columns: ReviewColumnIndices,
): ReviewStatus | null {
  const cells = parseTableCells(line);
  const scope = cells[columns.scope];
  const type = cells[columns.type];
  const status = cells[columns.status];
  const date = cells[columns.date];
  const artifact = cells[columns.artifact];
  if (!scope || !type || !status || !date || !artifact) {
    return null;
  }

  const reviewedHeadCell = optionalIndexedCell(cells, columns.reviewedHead);
  const invocationCell = optionalIndexedCell(cells, columns.invocation);
  const gateTargetCell = optionalIndexedCell(cells, columns.gateTarget);
  const reviewedHead =
    reviewedHeadCell && FULL_COMMIT_SHA.test(reviewedHeadCell)
      ? reviewedHeadCell
      : undefined;
  const invocation = optionalCell(invocationCell);
  const gateTarget = optionalCell(gateTargetCell);

  return {
    scope,
    type,
    status,
    date,
    artifact,
    ...(reviewedHead ? { reviewedHead } : {}),
    ...(invocation ? { invocation } : {}),
    ...(gateTarget ? { gateTarget } : {}),
  };
}

function parseTableCells(line: string): string[] {
  return line
    .split('|')
    .slice(1, -1)
    .map((cell) => cell.trim());
}

function resolveReviewColumnIndices(
  headerCells: string[],
): ReviewColumnIndices | null {
  const headerIndex = new Map(
    headerCells.map((cell, index) => [normalizeHeader(cell), index]),
  );
  const scope = headerIndex.get('scope');
  const type = headerIndex.get('type');
  const status = headerIndex.get('status');
  const date = headerIndex.get('date');
  const artifact = headerIndex.get('artifact');
  const reviewedHead = headerIndex.get('reviewed head');
  const invocation = headerIndex.get('invocation');
  const gateTarget = headerIndex.get('gate target');
  if (
    scope == null ||
    type == null ||
    status == null ||
    date == null ||
    artifact == null
  ) {
    return null;
  }

  return {
    scope,
    type,
    status,
    date,
    artifact,
    ...(reviewedHead == null ? {} : { reviewedHead }),
    ...(invocation == null ? {} : { invocation }),
    ...(gateTarget == null ? {} : { gateTarget }),
  };
}

function normalizeHeader(cell: string): string {
  return cell.trim().replace(/\s+/g, ' ').toLowerCase();
}

function optionalIndexedCell(
  cells: string[],
  index: number | undefined,
): string | undefined {
  return index == null ? undefined : cells[index];
}

function optionalCell(cell: string | undefined): string | undefined {
  return cell && cell !== '-' ? cell : undefined;
}
