/**
 * Builder for the posted-review-body (see design.md → Data Models →
 * Posted-review-body) and the verdict mapper that decides the GitHub review
 * `event`.
 *
 * The body is the durable handoff to `*-receive-remote`: a leading
 * HTML-comment marker block (parsed back by {@link parseMarkerBlock}) followed
 * by human-readable prose (summary, severity counts, optional minor-fix nudge,
 * optional verification commands).
 */

import { MARKER_BLOCK_OPEN, type ReviewInvocation } from './marker-parser';

export type ReviewVerdict = 'REQUEST_CHANGES' | 'COMMENT';

export type FindingSeverity = 'critical' | 'important' | 'medium' | 'minor';

/** Minimal finding shape the builder needs — only severity is required. */
export interface BuilderFinding {
  severity: FindingSeverity;
}

/**
 * A finding whose `file:line` is NOT present in the PR diff and therefore
 * cannot be posted as a GitHub inline comment (see design.md → Error Handling →
 * Inline-comment line mapping). Such findings must NOT be dropped — they are
 * downgraded into the top-level body via a "Findings outside the PR diff"
 * subsection carrying the original `file:line` reference and finding body.
 *
 * Field names mirror the `StructuredFindings` finding shape (design.md → Data
 * Models → StructuredFindings) so callers can pass entries through unchanged;
 * `line` is `number | null` because a reviewer-level finding may be file-scoped
 * with no specific line.
 */
export interface OutOfDiffFinding {
  /** Repo-relative path the original finding referenced. */
  file: string;
  /** 1-based line the original finding referenced, or `null` if file-scoped. */
  line: number | null;
  severity: FindingSeverity;
  /** Optional short title carried from the structured finding. */
  title?: string;
  /** Finding description / rationale — preserved verbatim, never dropped. */
  body: string;
}

interface BuildInputBase {
  /** Full 40-char hex SHA of the reviewed PR HEAD. */
  headSha: string;
  /** Scope token (`pNN`, `final`, …) or the `ad-hoc` sentinel. */
  scope: string;
  /** Project path — set only on the project rail; omitted on ad-hoc. */
  project?: string;
  /** 2-3 sentence human-readable summary. */
  summary: string;
  findings: BuilderFinding[];
  /**
   * Findings whose `file:line` is not in the PR diff, downgraded into the body
   * instead of posted inline. Omitted/empty renders no subsection (the body is
   * byte-identical to a build without the field).
   *
   * Count contract: these findings MUST also appear in {@link BuildInput.findings}
   * so the severity counts stay complete. This field only drives body rendering
   * — the builder never re-derives severity counts from it.
   */
  outOfDiffFindings?: OutOfDiffFinding[];
  /** Commands the user can run to verify fixes; omitted when absent/empty. */
  verificationCommands?: string[];
}

interface LifecycleBuildInput {
  invocation: Exclude<ReviewInvocation, 'gate'>;
  gateTarget?: never;
}

interface GateBuildInput {
  invocation: 'gate';
  /** Exact non-empty target that owns this gate review lineage. */
  gateTarget: string;
}

export type BuildInput = BuildInputBase &
  (LifecycleBuildInput | GateBuildInput);

/**
 * Map a finding set to the GitHub review verdict: `REQUEST_CHANGES` when any
 * critical or important finding is present, otherwise `COMMENT` (including the
 * zero-findings clean-review case). Never auto-`APPROVE`.
 */
export function mapVerdict(findings: BuilderFinding[]): ReviewVerdict {
  const hasBlocking = findings.some(
    (f) => f.severity === 'critical' || f.severity === 'important',
  );
  return hasBlocking ? 'REQUEST_CHANGES' : 'COMMENT';
}

interface SeverityCounts {
  critical: number;
  important: number;
  medium: number;
  minor: number;
}

function countSeverities(findings: BuilderFinding[]): SeverityCounts {
  const counts: SeverityCounts = {
    critical: 0,
    important: 0,
    medium: 0,
    minor: 0,
  };
  for (const f of findings) {
    counts[f.severity] += 1;
  }
  return counts;
}

/**
 * Emit the leading marker block. Mirrors the parser's expected single-line
 * scalar shape so {@link parseMarkerBlock} round-trips a built body cleanly.
 * `oat_project` is emitted only when present (key-omitted on the ad-hoc rail).
 */
function buildMarkerBlock(input: BuildInput): string {
  const lines = [
    'oat_provide_remote: true',
    `oat_review_head_sha: ${input.headSha}`,
    `oat_review_scope: ${input.scope}`,
  ];
  if (input.project !== undefined && input.project !== '') {
    lines.push(`oat_project: ${input.project}`);
  }
  lines.push(`oat_review_invocation: ${input.invocation}`);
  if (input.invocation === 'gate') {
    if (
      input.gateTarget.trim() === '' ||
      input.gateTarget.trim() !== input.gateTarget
    ) {
      throw new Error('gate invocation requires an exact non-empty gateTarget');
    }
    lines.push(`oat_gate_target: ${input.gateTarget}`);
  } else if (
    'gateTarget' in input &&
    (input as { gateTarget?: unknown }).gateTarget !== undefined
  ) {
    throw new Error('lifecycle invocation must not include gateTarget');
  }
  return `<!-- ${MARKER_BLOCK_OPEN}\n${lines.join('\n')}\n-->`;
}

/**
 * Render the "Findings outside the PR diff" subsection (design.md → Error
 * Handling → Inline-comment line mapping). Each entry shows its original
 * `file:line` reference followed by the preserved finding body. A `null` line
 * renders the bare file path (file-scoped finding). Returns `null` when there
 * are no out-of-diff findings so no empty heading is emitted.
 */
function buildOutOfDiffSection(
  findings: OutOfDiffFinding[] | undefined,
): string | null {
  if (!findings || findings.length === 0) {
    return null;
  }
  const entries = findings.map((f) => {
    const reference = f.line === null ? f.file : `${f.file}:${f.line}`;
    const heading = f.title ? `${reference} — ${f.title}` : reference;
    return `- **${heading}**\n\n  ${f.body}`;
  });
  return ['## Findings outside the PR diff', '', ...entries].join('\n');
}

const MINOR_FIX_NUDGE =
  'Minor findings are included inline. We recommend fixing minors during ' +
  'this cycle rather than tracking them as backlog items — they are usually ' +
  'faster to just resolve than to manage.';

/**
 * Build the posted-review body and compute its verdict.
 */
export function buildReviewBody(input: BuildInput): {
  body: string;
  verdict: ReviewVerdict;
} {
  const counts = countSeverities(input.findings);
  const verdict = mapVerdict(input.findings);

  const sections: string[] = [
    buildMarkerBlock(input),
    `## Summary\n\n${input.summary}`,
    [
      '## Severity Counts',
      '',
      `- Critical: ${counts.critical}`,
      `- Important: ${counts.important}`,
      `- Medium: ${counts.medium}`,
      `- Minor: ${counts.minor}`,
    ].join('\n'),
  ];

  const outOfDiffSection = buildOutOfDiffSection(input.outOfDiffFindings);
  if (outOfDiffSection !== null) {
    sections.push(outOfDiffSection);
  }

  if (counts.minor > 0) {
    sections.push(`## Notes\n\n${MINOR_FIX_NUDGE}`);
  }

  if (input.verificationCommands && input.verificationCommands.length > 0) {
    const commands = input.verificationCommands
      .map((cmd) => `- \`${cmd}\``)
      .join('\n');
    sections.push(`## Verification\n\n${commands}`);
  }

  return { body: sections.join('\n\n'), verdict };
}
