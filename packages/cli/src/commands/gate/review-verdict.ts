import { readFile, writeFile } from 'node:fs/promises';

import { getFrontmatterBlock } from '@commands/shared/frontmatter';
import YAML from 'yaml';

export interface ReviewGateVerdict {
  artifactPath: string;
  reviewType: 'code' | 'artifact' | 'unknown';
  scope: string | null;
  invocation: string | null;
  project: string | null;
  gateInvocation?: ReviewArtifactGateInvocation;
  counts: {
    critical: number;
    important: number;
    medium: number;
    minor: number;
  };
  blocking: boolean;
  normalization?: {
    insertedSeverities: Severity[];
  };
}

export interface ReviewArtifactGateInvocation {
  runId: string | null;
  targetId: string | null;
  runtime: string | null;
  model: string | null;
  reasoningEffort: string | null;
  source: string | null;
}

export type Severity = keyof ReviewGateVerdict['counts'];

export interface ParseReviewGateVerdictOptions {
  normalizeMissingEmptySeveritySections?: boolean;
}

interface SeverityHeading {
  severity: Severity;
  index: number;
  headingLength: number;
}

interface FindingsSection {
  start: number;
  end: number;
  content: string;
}

interface MarkdownLine {
  text: string;
  start: number;
}

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

function readGateInvocation(
  frontmatter: Record<string, unknown>,
): ReviewArtifactGateInvocation | undefined {
  const keys = [
    'oat_gate_run_id',
    'oat_gate_target',
    'oat_gate_runtime',
    'oat_invocation_model',
    'oat_invocation_reasoning_effort',
    'oat_invocation_source',
  ] as const;
  if (!keys.some((key) => key in frontmatter)) {
    return undefined;
  }

  return {
    runId: stringOrNull(frontmatter['oat_gate_run_id']),
    targetId: stringOrNull(frontmatter['oat_gate_target']),
    runtime: stringOrNull(frontmatter['oat_gate_runtime']),
    model: stringOrNull(frontmatter['oat_invocation_model']),
    reasoningEffort: stringOrNull(
      frontmatter['oat_invocation_reasoning_effort'],
    ),
    source: stringOrNull(frontmatter['oat_invocation_source']),
  };
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

export function severityDisplayName(severity: Severity): string {
  return severity.charAt(0).toUpperCase() + severity.slice(1);
}

function markdownLines(content: string): MarkdownLine[] {
  const lines: MarkdownLine[] = [];
  let start = 0;

  while (start < content.length) {
    const newlineIndex = content.indexOf('\n', start);
    const end = newlineIndex === -1 ? content.length : newlineIndex;
    lines.push({
      text: content.slice(start, end),
      start,
    });
    start = newlineIndex === -1 ? content.length : newlineIndex + 1;
  }

  return lines;
}

function fenceMarker(
  line: string,
): { marker: '`' | '~'; length: number } | null {
  const match = line.match(/^\s*(`{3,}|~{3,})/);
  if (!match?.[1]) {
    return null;
  }

  return {
    marker: match[1].startsWith('`') ? '`' : '~',
    length: match[1].length,
  };
}

function linesOutsideFences(content: string): MarkdownLine[] {
  const outsideFenceLines: MarkdownLine[] = [];
  let activeFence: { marker: '`' | '~'; length: number } | null = null;

  for (const line of markdownLines(content)) {
    const marker = fenceMarker(line.text);
    if (marker) {
      if (!activeFence) {
        activeFence = marker;
      } else if (
        marker.marker === activeFence.marker &&
        marker.length >= activeFence.length
      ) {
        activeFence = null;
      }
      continue;
    }

    if (!activeFence) {
      outsideFenceLines.push(line);
    }
  }

  return outsideFenceLines;
}

function findFindingsSection(content: string): FindingsSection | null {
  const lines = linesOutsideFences(content);
  const findingsHeading = lines.find((line) =>
    /^##\s+Findings\s*#*\s*$/i.test(line.text),
  );
  if (!findingsHeading) {
    return null;
  }

  const start = findingsHeading.start + findingsHeading.text.length;
  const nextPeerHeading = lines.find(
    (line) =>
      line.start > findingsHeading.start &&
      /^#{1,2}\s+.+?\s*#*\s*$/.test(line.text),
  );
  const end = nextPeerHeading?.start ?? content.length;

  return {
    start,
    end,
    content: content.slice(start, end),
  };
}

function findSeverityHeadings(content: string): SeverityHeading[] {
  const findingsSection = findFindingsSection(content);
  const scanContent = findingsSection?.content ?? content;
  const offset = findingsSection?.start ?? 0;

  return linesOutsideFences(scanContent)
    .map((line) => {
      const match = line.text.match(/^#{3,6}\s+(.+?)\s*#*\s*$/);
      return {
        severity: normalizeHeading(match?.[1] ?? ''),
        index: offset + line.start,
        headingLength: line.text.length,
      };
    })
    .filter((heading): heading is SeverityHeading => heading.severity !== null);
}

function missingSeverityHeadings(
  severityHeadings: readonly SeverityHeading[],
): Severity[] {
  const seenSeverities = new Set(
    severityHeadings.map((heading) => heading.severity),
  );
  return SEVERITIES.filter((severity) => !seenSeverities.has(severity));
}

function parseFindingsSummaryCounts(
  content: string,
): ReviewGateVerdict['counts'] | null {
  const match = content.match(
    /^Findings:\s*(\d+)\s+critical,\s*(\d+)\s+important,\s*(\d+)\s+medium,\s*(\d+)\s+minor\s*$/im,
  );
  if (!match) {
    return null;
  }

  return {
    critical: Number.parseInt(match[1] ?? '0', 10),
    important: Number.parseInt(match[2] ?? '0', 10),
    medium: Number.parseInt(match[3] ?? '0', 10),
    minor: Number.parseInt(match[4] ?? '0', 10),
  };
}

function parseFindingsSectionCounts(
  content: string,
  artifactPath: string,
): ReviewGateVerdict['counts'] | null {
  const findingsSection = findFindingsSection(content);
  const severityHeadings = findSeverityHeadings(content);

  if (severityHeadings.length === 0) {
    return null;
  }

  const missingSeverities = missingSeverityHeadings(severityHeadings);
  if (missingSeverities.length > 0) {
    throw new Error(
      `Review artifact at ${artifactPath} has an incomplete Findings section; expected headings for Critical, Important, Medium, and Minor. Missing: ${missingSeverities.join(', ')}.`,
    );
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
    const sectionEnd =
      nextHeading?.index ?? findingsSection?.end ?? content.length;
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

function insertionTextForSeverity(severity: Severity): string {
  return `\n### ${severityDisplayName(severity)}\n\nNone\n`;
}

function insertionPointForMissingSeverity(
  content: string,
  missingSeverity: Severity,
): number {
  const findingsSection = findFindingsSection(content);
  const sectionEnd = findingsSection?.end ?? content.length;
  const severityHeadings = findSeverityHeadings(content);
  const missingSeverityRank = SEVERITIES.indexOf(missingSeverity);
  const nextHeading = severityHeadings.find(
    (heading) => SEVERITIES.indexOf(heading.severity) > missingSeverityRank,
  );

  return nextHeading?.index ?? sectionEnd;
}

function insertMissingSeveritySection(
  content: string,
  severity: Severity,
): string {
  const insertionPoint = insertionPointForMissingSeverity(content, severity);
  const insertion = insertionTextForSeverity(severity);
  const suffix = content.slice(insertionPoint);
  const needsTrailingBlank = suffix.length > 0 ? '\n' : '';

  return `${content.slice(0, insertionPoint)}${insertion}${needsTrailingBlank}${suffix}`;
}

async function normalizeMissingEmptySeveritySections(
  artifactPath: string,
  content: string,
  counts: ReviewGateVerdict['counts'],
): Promise<{ content: string; insertedSeverities: Severity[] }> {
  if (!findFindingsSection(content)) {
    throw new Error(
      `Review artifact at ${artifactPath} does not contain a ## Findings section, so missing severity headings cannot be safely normalized.`,
    );
  }

  let normalizedContent = content;
  const insertedSeverities: Severity[] = [];

  for (const severity of missingSeverityHeadings(
    findSeverityHeadings(content),
  )) {
    if (counts[severity] !== 0) {
      throw new Error(
        `Review artifact at ${artifactPath} is missing the ${severityDisplayName(severity)} Findings section, but structured counts report ${counts[severity]} ${severity} finding(s). This cannot be safely normalized.`,
      );
    }

    normalizedContent = insertMissingSeveritySection(
      normalizedContent,
      severity,
    );
    insertedSeverities.push(severity);
  }

  if (insertedSeverities.length > 0) {
    await writeFile(artifactPath, normalizedContent, 'utf8');
  }

  return { content: normalizedContent, insertedSeverities };
}

function resolveCounts(
  content: string,
  frontmatter: Record<string, unknown>,
): ReviewGateVerdict['counts'] | null {
  const frontmatterCounts = readFrontmatterCounts(frontmatter);
  if (frontmatterCounts) {
    return frontmatterCounts;
  }

  const summaryCounts = parseFindingsSummaryCounts(content);
  if (summaryCounts) {
    return summaryCounts;
  }

  return null;
}

export async function parseReviewGateVerdict(
  artifactPath: string,
  options: ParseReviewGateVerdictOptions = {},
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
  let counts = resolveCounts(content, frontmatter);
  let insertedSeverities: Severity[] = [];

  if (counts && options.normalizeMissingEmptySeveritySections) {
    const normalized = await normalizeMissingEmptySeveritySections(
      artifactPath,
      content,
      counts,
    );
    content = normalized.content;
    insertedSeverities = normalized.insertedSeverities;
  }

  if (!counts) {
    counts = parseFindingsSectionCounts(content, artifactPath);
  }

  if (!counts) {
    throw new Error(
      `Review artifact at ${artifactPath} does not contain recognizable review findings or explicit verdict counts.`,
    );
  }

  const gateInvocation = readGateInvocation(frontmatter);

  return {
    artifactPath,
    reviewType: normalizeReviewType(frontmatter['oat_review_type']),
    scope: stringOrNull(frontmatter['oat_review_scope']),
    invocation: stringOrNull(frontmatter['oat_review_invocation']),
    project: stringOrNull(frontmatter['oat_project']),
    ...(gateInvocation ? { gateInvocation } : {}),
    counts,
    blocking: hasBlockingFindings(counts),
    ...(insertedSeverities.length > 0
      ? {
          normalization: {
            insertedSeverities,
          },
        }
      : {}),
  };
}
