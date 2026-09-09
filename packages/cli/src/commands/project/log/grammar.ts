export const PROJECT_LOG_TYPES = [
  'bug',
  'friction',
  'worked-well',
  'feedback',
] as const;
export const PROJECT_LOG_SCOPES = ['project', 'general'] as const;

export type ProjectLogType = (typeof PROJECT_LOG_TYPES)[number];
export type ProjectLogScope = (typeof PROJECT_LOG_SCOPES)[number];

export const PROJECT_LOG_AREA_MAX_LENGTH = 120;
export const PROJECT_LOG_HEADING_DELIMITER = '·';

export const JUDGMENT_HEADING_RE =
  /^### (\d{4}-\d{2}-\d{2}) · (project|general) · (bug|friction|worked-well|feedback) · ([^·\r\n]+)$/;
export const STRUCTURAL_HEADING_RE =
  /^### (\d{4}-\d{2}-\d{2}) · structural · ([^·\r\n]+) · ([^·\r\n]+)$/;

export interface ProjectLogSection {
  heading: string;
  start: number;
  end: number;
}

export function isProjectLogSectionMarker(line: string): boolean {
  return /^## .+$/.test(line);
}

export function isProjectLogEntryMarker(line: string): boolean {
  return /^### .+$/.test(line);
}

export function findProjectLogSections(content: string): ProjectLogSection[] {
  const matches = [...content.matchAll(/^## [^\r\n]+/gm)];
  return matches.map((match, index) => ({
    heading: match[0],
    start: match.index!,
    end: matches[index + 1]?.index ?? content.length,
  }));
}

export function composeJudgmentHeading(input: {
  date: string;
  scope: ProjectLogScope;
  type: ProjectLogType;
  area: string;
}): string {
  return `### ${input.date} · ${input.scope} · ${input.type} · ${input.area}`;
}

export function composeStructuralHeading(input: {
  date: string;
  producer: string;
  ref: string;
}): string {
  return `### ${input.date} · structural · ${input.producer} · ${input.ref}`;
}

/**
 * The producer and ref that together identify the completion seal — the last
 * entry a project log may ever receive.
 *
 * Both fields are required. A `seal` ref from another producer is an ordinary
 * structural entry, and an `oat-project-complete` entry with another ref is an
 * ordinary lifecycle entry; treating either as a seal would let a foreign
 * append freeze a log that was never completed.
 */
export const PROJECT_LOG_SEAL_PRODUCER = 'oat-project-complete';
export const PROJECT_LOG_SEAL_REF = 'seal';

/**
 * The prefix of the seal's idempotency token (`oat-seal:<project>`).
 *
 * The token is what makes a replayed seal recognize its own entry, so it is
 * prefixed rather than bare: a project name alone could occur in ordinary prose
 * and match an unrelated body.
 */
export const PROJECT_LOG_SEAL_KEY_PREFIX = 'oat-seal:';

/**
 * The single definition of "this entry is the completion seal", shared by the
 * `check` probe and the `append` guard.
 *
 * Both callers route on this one predicate on purpose: two definitions of
 * sealed is the regression that lets a log report itself unsealed to one
 * command and sealed to the other.
 */
export function isProjectLogSealEntry(entry: {
  producer: string;
  ref: string;
}): boolean {
  return (
    entry.producer === PROJECT_LOG_SEAL_PRODUCER &&
    entry.ref === PROJECT_LOG_SEAL_REF
  );
}

/**
 * Whether a seal body carries the canonical stand-alone seal token.
 *
 * `idempotencyToken` records the whole whitespace-delimited word containing a
 * key, so a key glued to the varying completion timestamp never matches its own
 * earlier append. A seal written before this convention carries no token at
 * all, which is exactly why the seal is also recognized structurally.
 */
export function carriesProjectLogSealKey(body: string): boolean {
  return body
    .split(/\s+/)
    .some(
      (word) =>
        word.startsWith(PROJECT_LOG_SEAL_KEY_PREFIX) &&
        word.length > PROJECT_LOG_SEAL_KEY_PREFIX.length,
    );
}
