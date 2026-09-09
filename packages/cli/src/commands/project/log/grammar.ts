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

/**
 * Every character JavaScript treats as a LineTerminator, and therefore every
 * character a multiline `^` anchors after: LF, CR, U+2028 LINE SEPARATOR, and
 * U+2029 PARAGRAPH SEPARATOR. VT, FF, and U+0085 NEL are deliberately absent —
 * ECMAScript does not count them, so `^` does not match after them either.
 *
 * The set is exported rather than inlined because the append validator and this
 * parser must enumerate exactly the same characters. A validator that split on
 * fewer terminators than the parser anchored after is precisely how a body
 * could smuggle a `## ` past validation and have it become a real section
 * boundary, silently truncating the parsed entries region and voiding the
 * completion seal.
 */
export const PROJECT_LOG_LINE_TERMINATOR_RE = /[\n\r\u2028\u2029]/;

/**
 * A line terminator other than LF: CR, U+2028, or U+2029.
 *
 * Bodies are legitimately multi-line, so LF is allowed; the other three are
 * not. LF is the only boundary `findProjectLogSections` and
 * `parseProjectLogEntries` recognize, so admitting a terminator they do not
 * would put a character in the file that some reader treats as a line break and
 * others do not — the disagreement that let a body forge a section heading.
 */
export const PROJECT_LOG_NON_LINE_FEED_TERMINATOR_RE = /[\r\u2028\u2029]/;

/**
 * Splits on every LineTerminator, treating CRLF as one boundary.
 *
 * Validators use this rather than a `/\r?\n/` split so that a lone CR, a
 * U+2028, or a U+2029 starts a new line for validation just as it would for a
 * regular expression's multiline `^`.
 */
export function splitProjectLogLines(content: string): string[] {
  return content.split(/\r\n|[\n\r\u2028\u2029]/);
}

/**
 * The log's `## ` section boundaries, where a boundary is a `## ` that begins
 * the content or directly follows a line feed.
 *
 * LF is the only boundary on purpose. The previous `/^## [^\r\n]+/gm` anchored
 * after all four LineTerminators while the append validator only split on
 * `/\r?\n/`, so a judgment body reading `carrier<CR>## Injected` passed
 * validation and then became a real section boundary — truncating `## Entries`
 * so `check` reported an already-written seal as `sealed: false` and appends
 * kept succeeding onto a sealed log. Anchoring on LF alone keeps this parser
 * and `parseProjectLogEntries`, which splits its section on `'\n'`, reading the
 * same file the same way, and it holds for a log written by hand as well as one
 * the command wrote.
 */
export function findProjectLogSections(content: string): ProjectLogSection[] {
  const matches = [...content.matchAll(/(?<=^|\n)## [^\r\n]+/g)];
  return matches.map((match, index) => ({
    heading: match[0],
    start: match.index!,
    end: matches[index + 1]?.index ?? content.length,
  }));
}

/**
 * The judgment-heading scan a `^…$/m` reader performs — the same pattern
 * `rollup.ts` uses to key its ledger.
 *
 * Declared here so `containsAmbiguousProjectLogMarker` can ask the competing
 * reader what *it* would see, rather than approximating it. `matchAll` builds a
 * fresh regex per call, so the `g` flag's `lastIndex` is never shared.
 */
const JUDGMENT_HEADING_SCAN_RE =
  /^### (\d{4}-\d{2}-\d{2}) \u00b7 (project|general) \u00b7 (bug|friction|worked-well|feedback) \u00b7 ([^\u00b7\r\n]+)$/gm;

/**
 * Whether the log contains a heading that a `^…$/m` reader starts a line at but
 * an LF-only reader does not — that is, whether the file has two readings.
 *
 * The two competing readers are enumerated rather than approximated: the
 * pre-fix section scan `/^## [^\r\n]+/gm`, and `rollup.ts`'s ledger scan, which
 * recognizes only the complete dated judgment grammar. A `### ` line that
 * neither recognizes — `carrier<CR>### Notes` — is body text to every reader and
 * is deliberately *not* flagged; refusing it would strand logs a previous
 * release could legitimately have written.
 *
 * Mutators consult this and refuse rather than guess, because a file with two
 * readings cannot answer "is this sealed?". Tightening the section parser to LF
 * alone would otherwise silently *widen* such logs: a hand-written
 * `preamble<U+2028>## Entries` used to parse, so its seal was found and a
 * replayed seal was deduplicated, and under an LF-only reading the same file has
 * no entries region, reports unsealed, and accepts a second seal. Refusing is
 * the only resolution that is not weaker than the reading it replaces.
 *
 * CRLF is deliberately not caught: the character immediately before a marker on
 * a `\r\n`-terminated line is the LF, so such a log has exactly one reading.
 */
export function containsAmbiguousProjectLogMarker(content: string): boolean {
  if (/(?<=[\r\u2028\u2029])## [^\r\n]+/.test(content)) {
    return true;
  }
  for (const match of content.matchAll(JUDGMENT_HEADING_SCAN_RE)) {
    const preceding = content[match.index - 1];
    if (
      preceding !== undefined &&
      PROJECT_LOG_NON_LINE_FEED_TERMINATOR_RE.test(preceding)
    ) {
      return true;
    }
  }
  return false;
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
 * Whether a composed or parsed entry *heading* is the completion seal's.
 *
 * The heading-level counterpart of `isProjectLogSealEntry`, and it delegates to
 * it rather than restating the rule. One predicate serves both directions —
 * "is this request the seal?" and "does this already-appended heading name a
 * seal?" — so the two can never drift into disagreeing about what a seal
 * heading is. It reads the producer and ref back out of the heading text rather
 * than from a caller's flags, which is the same normalization
 * `parseProjectLogEntries` applies.
 */
export function isProjectLogSealHeading(heading: string): boolean {
  const parsed = STRUCTURAL_HEADING_RE.exec(heading);
  return (
    parsed !== null &&
    isProjectLogSealEntry({
      producer: parsed[2]!.trim(),
      ref: parsed[3]!.trim(),
    })
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
