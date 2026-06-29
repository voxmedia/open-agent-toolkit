import { readFile } from 'node:fs/promises';

import { getFrontmatterBlock } from '@commands/shared/frontmatter';
import YAML from 'yaml';

export interface ReviewGateVerdict {
  artifactPath: string;
  reviewType: 'code' | 'artifact' | 'unknown';
  scope: string | null;
  invocation: string | null;
  counts: {
    critical: number;
    important: number;
    medium: number;
    minor: number;
  };
  blocking: boolean;
}

type Severity = keyof ReviewGateVerdict['counts'];

const SEVERITIES: readonly Severity[] = [
  'critical',
  'important',
  'medium',
  'minor',
];

const FRONTMATTER_COUNT_KEYS: Readonly<Record<Severity, readonly string[]>> = {
  critical: ['oat_review_critical_count', 'critical'],
  important: ['oat_review_important_count', 'important'],
  medium: ['oat_review_medium_count', 'medium'],
  minor: ['oat_review_minor_count', 'minor'],
};

function normalizeReviewType(value: unknown): ReviewGateVerdict['reviewType'] {
  return value === 'code' || value === 'artifact' ? value : 'unknown';
}

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function parseCountValue(value: unknown): number | null {
  const numberValue =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number(value.trim())
        : Number.NaN;

  if (!Number.isInteger(numberValue) || numberValue < 0) {
    return null;
  }
  return numberValue;
}

function readFrontmatterCounts(
  frontmatter: Record<string, unknown>,
): ReviewGateVerdict['counts'] | null {
  const nestedCounts =
    typeof frontmatter['oat_review_counts'] === 'object' &&
    frontmatter['oat_review_counts'] !== null &&
    !Array.isArray(frontmatter['oat_review_counts'])
      ? (frontmatter['oat_review_counts'] as Record<string, unknown>)
      : null;

  const counts: ReviewGateVerdict['counts'] = {
    critical: 0,
    important: 0,
    medium: 0,
    minor: 0,
  };

  for (const severity of SEVERITIES) {
    const candidateValues = [
      ...FRONTMATTER_COUNT_KEYS[severity].map((key) => frontmatter[key]),
      ...(nestedCounts
        ? FRONTMATTER_COUNT_KEYS[severity].map((key) => nestedCounts[key])
        : []),
    ].filter((value) => value !== undefined && value !== null);

    if (candidateValues.length === 0) {
      return null;
    }

    const parsedCount = candidateValues.reduce<number | null>(
      (parsed, value) => {
        if (parsed !== null) {
          return parsed;
        }
        return parseCountValue(value);
      },
      null,
    );

    if (parsedCount === null) {
      return null;
    }

    counts[severity] = parsedCount;
  }

  return counts;
}

function sectionContentIsEmpty(content: string): boolean {
  const cleaned = content
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !/^<!--.*-->$/.test(line))
    .join('\n')
    .trim();

  return cleaned.length === 0 || /^none\.?$/i.test(cleaned);
}

function countFindingsInSection(content: string): number {
  if (sectionContentIsEmpty(content)) {
    return 0;
  }

  return content
    .split('\n')
    .filter((line) => /^([-*+]\s+\S|\d+\.\s+\S)/.test(line)).length;
}

function normalizeHeading(value: string): Severity | null {
  const normalized = value.trim().toLowerCase();
  if ((SEVERITIES as readonly string[]).includes(normalized)) {
    return normalized as Severity;
  }
  return null;
}

function parseFindingsSectionCounts(
  content: string,
): ReviewGateVerdict['counts'] | null {
  const headingMatches = [...content.matchAll(/^#{3,6}\s+(.+?)\s*#*\s*$/gm)];
  const severityHeadings = headingMatches
    .map((match) => ({
      severity: normalizeHeading(match[1] ?? ''),
      index: match.index ?? 0,
      headingLength: match[0].length,
    }))
    .filter(
      (
        heading,
      ): heading is {
        severity: Severity;
        index: number;
        headingLength: number;
      } => heading.severity !== null,
    );

  if (severityHeadings.length === 0) {
    return null;
  }

  const counts: ReviewGateVerdict['counts'] = {
    critical: 0,
    important: 0,
    medium: 0,
    minor: 0,
  };

  for (const [offset, heading] of severityHeadings.entries()) {
    const nextHeading = severityHeadings[offset + 1];
    const sectionStart = heading.index + heading.headingLength;
    const sectionEnd = nextHeading?.index ?? content.length;
    counts[heading.severity] = countFindingsInSection(
      content.slice(sectionStart, sectionEnd),
    );
  }

  return counts;
}

function parseFrontmatterObject(
  frontmatter: string,
  artifactPath: string,
): Record<string, unknown> {
  try {
    const parsed: unknown = YAML.parse(frontmatter);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      !Array.isArray(parsed)
    ) {
      return parsed as Record<string, unknown>;
    }
    throw new Error('frontmatter must be a YAML object');
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Unable to parse review artifact frontmatter at ${artifactPath}: ${detail}`,
      { cause: error },
    );
  }
}

function hasBlockingFindings(counts: ReviewGateVerdict['counts']): boolean {
  return counts.critical > 0 || counts.important > 0;
}

export async function parseReviewGateVerdict(
  artifactPath: string,
): Promise<ReviewGateVerdict> {
  let content: string;
  try {
    content = await readFile(artifactPath, 'utf8');
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Unable to read review artifact at ${artifactPath}: ${detail}`,
      { cause: error },
    );
  }

  const frontmatterBlock = getFrontmatterBlock(content);
  const frontmatter = frontmatterBlock
    ? parseFrontmatterObject(frontmatterBlock, artifactPath)
    : {};
  const counts =
    readFrontmatterCounts(frontmatter) ?? parseFindingsSectionCounts(content);

  if (!counts) {
    throw new Error(
      `Review artifact at ${artifactPath} does not contain recognizable review findings or explicit verdict counts.`,
    );
  }

  return {
    artifactPath,
    reviewType: normalizeReviewType(frontmatter['oat_review_type']),
    scope: stringOrNull(frontmatter['oat_review_scope']),
    invocation: stringOrNull(frontmatter['oat_review_invocation']),
    counts,
    blocking: hasBlockingFindings(counts),
  };
}
