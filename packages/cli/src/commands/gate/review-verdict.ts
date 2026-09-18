import { createHash } from 'node:crypto';
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
    high: number;
    medium: number;
    low: number;
  };
  blocking: boolean;
  normalization?: {
    insertedSeverities: Severity[];
    persisted: boolean;
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

export interface ReviewGateArtifactSnapshot {
  readonly content: string;
  readonly signature: string;
}

export interface ParseReviewGateVerdictOptions {
  normalizeMissingEmptySeveritySections?: boolean;
  artifactSnapshot?: ReviewGateArtifactSnapshot;
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

interface FrontmatterCountSource {
  counts: ReviewGateVerdict['counts'];
  tiers: Severity[];
}

const SEVERITIES: readonly Severity[] = ['critical', 'high', 'medium', 'low'];

const FRONTMATTER_COUNT_KEYS: Readonly<Record<Severity, readonly string[]>> = {
  critical: ['oat_review_critical_count', 'critical'],
  high: ['oat_review_high_count', 'high'],
  medium: ['oat_review_medium_count', 'medium'],
  low: ['oat_review_low_count', 'low'],
};

function artifactContentSignature(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

async function assertArtifactContentCurrent(
  artifactPath: string,
  expectedContent: string,
): Promise<void> {
  let currentContent: string;
  try {
    currentContent = await readFile(artifactPath, 'utf8');
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Unable to verify review artifact snapshot at ${artifactPath}: ${detail}`,
      { cause: error },
    );
  }

  if (
    artifactContentSignature(currentContent) !==
    artifactContentSignature(expectedContent)
  ) {
    throw new Error(
      `Review artifact at ${artifactPath} changed after gate correlation; rerun the gate so correlation and verdict evaluation use one immutable snapshot.`,
    );
  }
}

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
  if (typeof value === 'string' && value.trim().length === 0) {
    return null;
  }

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
  artifactPath: string,
): FrontmatterCountSource | null {
  const hasNestedCounts = Object.hasOwn(frontmatter, 'oat_review_counts');
  if (
    hasNestedCounts &&
    (typeof frontmatter['oat_review_counts'] !== 'object' ||
      frontmatter['oat_review_counts'] === null ||
      Array.isArray(frontmatter['oat_review_counts']))
  ) {
    throw new Error(
      `Review artifact at ${artifactPath} declares an invalid oat_review_counts block; it must be an object of non-negative integer counts.`,
    );
  }

  const nestedCounts =
    typeof frontmatter['oat_review_counts'] === 'object' &&
    frontmatter['oat_review_counts'] !== null &&
    !Array.isArray(frontmatter['oat_review_counts'])
      ? (frontmatter['oat_review_counts'] as Record<string, unknown>)
      : null;

  const parsed = new Map<Severity, number>();

  // Validate every supplied alias before deciding whether the block is
  // complete. A partial block must not be able to hide a conflicting pair and
  // fall through to a summary line that reports fewer findings.
  for (const severity of SEVERITIES) {
    const candidateValues = [
      ...FRONTMATTER_COUNT_KEYS[severity].flatMap((key) =>
        Object.hasOwn(frontmatter, key) ? [frontmatter[key]] : [],
      ),
      ...(nestedCounts
        ? FRONTMATTER_COUNT_KEYS[severity].flatMap((key) =>
            Object.hasOwn(nestedCounts, key) ? [nestedCounts[key]] : [],
          )
        : []),
    ];

    const hasInvalidValue = candidateValues.some(
      (value) => parseCountValue(value) === null,
    );
    if (hasInvalidValue) {
      throw new Error(
        `Review artifact at ${artifactPath} declares an invalid ${severity} count; counts must be non-negative integers.`,
      );
    }

    const distinct = [
      ...new Set(
        candidateValues
          .map((value) => parseCountValue(value))
          .filter((value): value is number => value !== null),
      ),
    ];

    if (distinct.length > 1) {
      throw new Error(
        `Review artifact at ${artifactPath} declares conflicting ${severity} counts (${distinct.join(', ')}); resolve the frontmatter before the gate can evaluate the review.`,
      );
    }

    if (distinct.length === 1) {
      parsed.set(severity, distinct[0]!);
    }
  }

  if (parsed.size === 0) {
    return null;
  }

  return {
    counts: {
      critical: parsed.get('critical') ?? 0,
      high: parsed.get('high') ?? 0,
      medium: parsed.get('medium') ?? 0,
      low: parsed.get('low') ?? 0,
    },
    tiers: [...parsed.keys()],
  };
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
): { marker: '`' | '~'; length: number; trailing: string } | null {
  const match = line.match(/^\s*(`{3,}|~{3,})(.*)$/);
  if (!match?.[1]) {
    return null;
  }

  return {
    marker: match[1].startsWith('`') ? '`' : '~',
    length: match[1].length,
    trailing: match[2] ?? '',
  };
}

/**
 * Lines outside fenced code blocks.
 *
 * An opening fence may carry an info string (```ts), but a closing fence may
 * not: a marker run followed by other text is fence content, not a delimiter.
 * Treating such a line as a closer ends the fence early and exposes quoted
 * examples to the count scans, which is the failure the fence-awareness is
 * there to prevent.
 */
function linesOutsideFences(content: string): MarkdownLine[] {
  const outsideFenceLines: MarkdownLine[] = [];
  let activeFence: ReturnType<typeof fenceMarker> = null;

  for (const line of markdownLines(content)) {
    const marker = fenceMarker(line.text);
    if (marker) {
      if (!activeFence) {
        activeFence = marker;
      } else if (
        marker.marker === activeFence.marker &&
        marker.length >= activeFence.length &&
        marker.trailing.trim() === ''
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

const FINDINGS_SUMMARY_PATTERN =
  /^Findings by severity:\s*(\d+)\s+critical,\s*(\d+)\s+high,\s*(\d+)\s+medium,\s*(\d+)\s+low\s*$/i;

/**
 * Read the canonical count line. Only lines outside fenced code blocks count,
 * so a quoted example cannot be mistaken for the artifact's own counts, and two
 * disagreeing count lines are rejected rather than silently resolved in favor
 * of whichever appears first.
 */
function parseFindingsSummaryCounts(
  content: string,
  artifactPath: string,
): ReviewGateVerdict['counts'] | null {
  const found: ReviewGateVerdict['counts'][] = [];

  for (const line of linesOutsideFences(content)) {
    const match = FINDINGS_SUMMARY_PATTERN.exec(line.text.trim());
    if (!match) {
      continue;
    }
    found.push({
      critical: Number.parseInt(match[1] ?? '0', 10),
      high: Number.parseInt(match[2] ?? '0', 10),
      medium: Number.parseInt(match[3] ?? '0', 10),
      low: Number.parseInt(match[4] ?? '0', 10),
    });
  }

  if (found.length === 0) {
    return null;
  }

  const distinct = new Map(
    found.map((counts) => [JSON.stringify(counts), counts]),
  );
  if (distinct.size > 1) {
    throw new Error(
      `Review artifact at ${artifactPath} contains ${found.length} conflicting "Findings by severity" count lines; keep exactly one so the gate can evaluate the review.`,
    );
  }

  return found[0]!;
}

/**
 * Tier spellings retired by the severity rename. They are no longer read, and
 * detecting them fails the artifact with a migration error rather than letting
 * it parse. A retired heading that parsed alongside canonical ones would have
 * its findings attributed to whichever canonical section precedes it, which can
 * move a finding below the blocking threshold.
 */
function describeLegacySeverityUsage(
  content: string,
  frontmatter: Record<string, unknown>,
): string[] {
  const found = new Set<string>();
  const findingsSection = findFindingsSection(content);

  for (const line of linesOutsideFences(findingsSection?.content ?? '')) {
    if (/^#{1,6}\s+Important\s*#*\s*$/i.test(line.text)) {
      found.add('a `### Important` heading');
    }
    if (/^#{1,6}\s+Minor\s*#*\s*$/i.test(line.text)) {
      found.add('a `### Minor` heading');
    }
  }

  for (const line of linesOutsideFences(content)) {
    if (/^Findings:\s*\d+\s+critical,/i.test(line.text.trim())) {
      found.add('a legacy `Findings:` count line');
    }
  }

  const nested =
    typeof frontmatter['oat_review_counts'] === 'object' &&
    frontmatter['oat_review_counts'] !== null &&
    !Array.isArray(frontmatter['oat_review_counts'])
      ? (frontmatter['oat_review_counts'] as Record<string, unknown>)
      : {};
  for (const key of [...Object.keys(frontmatter), ...Object.keys(nested)]) {
    if (/^(oat_review_)?(important|minor)(_count)?$/.test(key)) {
      found.add(`the \`${key}\` count key`);
    }
  }

  return [...found];
}

function legacySeverityError(
  artifactPath: string,
  legacyUsage: readonly string[],
): Error | null {
  if (legacyUsage.length === 0) {
    return null;
  }
  return new Error(
    `Review artifact at ${artifactPath} uses retired severity tiers (${legacyUsage.join(', ')}). The tiers are now Critical, High, Medium, and Low: rename \`### Important\` to \`### High\` and \`### Minor\` to \`### Low\`, and \`oat_review_important_count\`/\`oat_review_minor_count\` to \`oat_review_high_count\`/\`oat_review_low_count\`, or re-run the review. If the reviewer that wrote this artifact still emits the retired tiers, its installed instructions are stale: run \`oat tools update\` to refresh the installed tools and their provider projections.`,
  );
}

/**
 * Per-tier counts for every severity heading the body actually has.
 *
 * Deliberately tolerant: it counts what is present without requiring the full
 * canonical heading set, so it can cross-check explicit counts without changing
 * how a body-only artifact is validated.
 */
function tallySeveritySections(
  content: string,
): ReviewGateVerdict['counts'] | null {
  const findingsSection = findFindingsSection(content);
  const severityHeadings = findSeverityHeadings(content);

  if (severityHeadings.length === 0) {
    return null;
  }

  const counts: ReviewGateVerdict['counts'] = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  };

  for (const [offset, heading] of severityHeadings.entries()) {
    const nextHeading = severityHeadings[offset + 1];
    const sectionStart = heading.index + heading.headingLength;
    const sectionEnd =
      nextHeading?.index ?? findingsSection?.end ?? content.length;
    // Accumulate rather than assign: a repeated heading for one tier must not
    // erase findings already counted under an earlier occurrence.
    counts[heading.severity] += countFindingsInSection(
      content.slice(sectionStart, sectionEnd),
    );
  }

  return counts;
}

function parseFindingsSectionCounts(
  content: string,
  artifactPath: string,
): ReviewGateVerdict['counts'] | null {
  const counts = tallySeveritySections(content);
  if (counts === null) {
    return null;
  }

  const missingSeverities = missingSeverityHeadings(
    findSeverityHeadings(content),
  );
  if (missingSeverities.length > 0) {
    throw new Error(
      `Review artifact at ${artifactPath} has an incomplete Findings section; expected headings for ${SEVERITIES.map(severityDisplayName).join(', ')}. Missing: ${missingSeverities.join(', ')}.`,
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
  return counts.critical > 0 || counts.high > 0;
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
  persist: boolean,
): Promise<{
  content: string;
  insertedSeverities: Severity[];
  persisted: boolean;
}> {
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

  if (insertedSeverities.length > 0 && persist) {
    await assertArtifactContentCurrent(artifactPath, content);
    await writeFile(artifactPath, normalizedContent, 'utf8');
    await assertArtifactContentCurrent(artifactPath, normalizedContent);
  }

  return {
    content: normalizedContent,
    insertedSeverities,
    persisted: insertedSeverities.length > 0 && persist,
  };
}

interface CountSource {
  name: string;
  counts: ReviewGateVerdict['counts'];
  tiers: readonly Severity[];
}

function formatCounts(counts: ReviewGateVerdict['counts']): string {
  return SEVERITIES.map((severity) => `${counts[severity]} ${severity}`).join(
    ', ',
  );
}

/**
 * Fail closed when two count sources disagree.
 *
 * No single source may win by precedence: a stale all-zero frontmatter block or
 * count line would otherwise mask real findings written in the body, and the
 * gate would pass a review that clearly reports a blocking finding.
 */
function assertAgreeingCounts(
  artifactPath: string,
  left: CountSource,
  right: CountSource,
  tiers: readonly Severity[] = SEVERITIES,
): void {
  const differing = tiers.filter(
    (severity) => left.counts[severity] !== right.counts[severity],
  );
  if (differing.length === 0) {
    return;
  }

  throw new Error(
    `Review artifact at ${artifactPath} contradicts itself about finding counts (${differing.join(', ')}): declared counts are ${formatCounts(left.counts)} (${left.name}) but ${formatCounts(right.counts)} (${right.name}). Reconcile them before the gate can evaluate the review.`,
  );
}

/**
 * Resolve the artifact's counts, cross-checking every source that is present.
 *
 * Returns `null` when only the body carries counts, so the caller keeps the
 * completeness-checked body path for body-only artifacts.
 */
function resolveCounts(
  content: string,
  frontmatter: Record<string, unknown>,
  artifactPath: string,
): ReviewGateVerdict['counts'] | null {
  const explicitSources: CountSource[] = [];

  const frontmatterCounts = readFrontmatterCounts(frontmatter, artifactPath);
  if (frontmatterCounts) {
    explicitSources.push({
      name: 'the frontmatter count fields',
      counts: frontmatterCounts.counts,
      tiers: frontmatterCounts.tiers,
    });
  }

  const summaryCounts = parseFindingsSummaryCounts(content, artifactPath);
  if (summaryCounts) {
    explicitSources.push({
      name: 'the "Findings by severity" count line',
      counts: summaryCounts,
      tiers: SEVERITIES,
    });
  }

  const [primarySource, ...otherSources] = explicitSources;
  for (const source of otherSources) {
    const comparableTiers = primarySource!.tiers.filter((severity) =>
      source.tiers.includes(severity),
    );
    assertAgreeingCounts(artifactPath, primarySource!, source, comparableTiers);
  }

  const bodyCounts = tallySeveritySections(content);
  if (bodyCounts) {
    // Only tiers the body actually has a heading for are comparable. A missing
    // heading is not a claim of zero findings, it is a malformed body, and the
    // completeness and normalization checks own that diagnosis.
    const bodyTiers = [
      ...new Set(
        findSeverityHeadings(content).map((heading) => heading.severity),
      ),
    ];
    const bodySource: CountSource = {
      name: 'the Findings sections',
      counts: bodyCounts,
      tiers: bodyTiers,
    };
    for (const source of explicitSources) {
      const comparableTiers = source.tiers.filter((severity) =>
        bodyTiers.includes(severity),
      );
      assertAgreeingCounts(artifactPath, source, bodySource, comparableTiers);
    }
  }

  return (
    explicitSources.find((source) => source.tiers.length === SEVERITIES.length)
      ?.counts ?? null
  );
}

export async function parseReviewGateVerdict(
  artifactPath: string,
  options: ParseReviewGateVerdictOptions = {},
): Promise<ReviewGateVerdict> {
  let content: string;
  if (options.artifactSnapshot) {
    content = options.artifactSnapshot.content;
    if (
      artifactContentSignature(content) !== options.artifactSnapshot.signature
    ) {
      throw new Error(
        `Review artifact snapshot signature at ${artifactPath} does not match its content.`,
      );
    }
    await assertArtifactContentCurrent(artifactPath, content);
  } else {
    try {
      content = await readFile(artifactPath, 'utf8');
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Unable to read review artifact at ${artifactPath}: ${detail}`,
        { cause: error },
      );
    }
  }

  const frontmatterBlock = getFrontmatterBlock(content);
  const frontmatter = frontmatterBlock
    ? parseFrontmatterObject(frontmatterBlock, artifactPath)
    : {};

  // Retired tiers fail the artifact outright rather than being ignored, and do
  // so before normalization can rewrite the file. Ignoring them is not safe: a
  // retired heading that parses alongside canonical ones has its findings
  // attributed to whichever canonical section precedes it.
  const retiredTierError = legacySeverityError(
    artifactPath,
    describeLegacySeverityUsage(content, frontmatter),
  );
  if (retiredTierError) {
    throw retiredTierError;
  }

  let counts = resolveCounts(content, frontmatter, artifactPath);
  let insertedSeverities: Severity[] = [];
  let normalizationPersisted = false;

  if (counts && options.normalizeMissingEmptySeveritySections) {
    const normalized = await normalizeMissingEmptySeveritySections(
      artifactPath,
      content,
      counts,
      !options.artifactSnapshot,
    );
    content = normalized.content;
    insertedSeverities = normalized.insertedSeverities;
    normalizationPersisted = normalized.persisted;
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

  if (options.artifactSnapshot) {
    await assertArtifactContentCurrent(
      artifactPath,
      options.artifactSnapshot.content,
    );
  }

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
            persisted: normalizationPersisted,
          },
        }
      : {}),
  };
}
