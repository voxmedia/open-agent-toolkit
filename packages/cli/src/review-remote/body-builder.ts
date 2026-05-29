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

export interface BuildInput {
  /** Full 40-char hex SHA of the reviewed PR HEAD. */
  headSha: string;
  /** Scope token (`pNN`, `final`, …) or the `ad-hoc` sentinel. */
  scope: string;
  /** Project path — set only on the project rail; omitted on ad-hoc. */
  project?: string;
  /** How the review was invoked. */
  invocation: ReviewInvocation;
  /** 2-3 sentence human-readable summary. */
  summary: string;
  findings: BuilderFinding[];
  /** Commands the user can run to verify fixes; omitted when absent/empty. */
  verificationCommands?: string[];
}

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
  return `<!-- ${MARKER_BLOCK_OPEN}\n${lines.join('\n')}\n-->`;
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
