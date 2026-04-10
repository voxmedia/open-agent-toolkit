import { readdir } from 'node:fs/promises';
import { join } from 'node:path';

import { isMissingFileError } from '../shared/utils/errors';
import type { ReviewStatus } from '../types';

const REVIEWS_HEADING = '## Reviews';

export function parseReviewTable(planContent: string): ReviewStatus[] {
  const reviewsSection = extractReviewsSection(planContent);
  if (reviewsSection == null) {
    return [];
  }

  const rows = reviewsSection
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('|'));

  return rows
    .slice(2)
    .map(parseTableRow)
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

function extractReviewsSection(planContent: string): string | null {
  const startIndex = planContent.indexOf(REVIEWS_HEADING);
  if (startIndex === -1) {
    return null;
  }

  const remaining = planContent.slice(startIndex + REVIEWS_HEADING.length);
  const nextHeadingIndex = remaining.search(/\n## /);
  if (nextHeadingIndex === -1) {
    return remaining.trim();
  }

  return remaining.slice(0, nextHeadingIndex).trim();
}

function parseTableRow(line: string): ReviewStatus | null {
  const cells = line
    .split('|')
    .slice(1, -1)
    .map((cell) => cell.trim());

  if (cells.length !== 5) {
    return null;
  }

  const [scope, type, status, date, artifact] = cells;
  if (!scope || !type || !status || !date || !artifact) {
    return null;
  }

  return { scope, type, status, date, artifact };
}
