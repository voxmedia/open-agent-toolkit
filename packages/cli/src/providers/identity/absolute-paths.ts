/**
 * The single absolute-path detector.
 *
 * NFR1 requires that home paths and user-specific absolute paths stay redacted
 * in durable output. Before this module there were two independent notions of
 * "looks like a path": a regex inside `redactDispatchMessage`, which only
 * scrubbed error text, and nothing at all on the persistence boundary. The
 * durable journal is committed to a shared repository, so a username or local
 * layout that reaches it is in git history permanently.
 *
 * Message redaction and record sanitization now share this detector, because
 * the gap between them is precisely what allowed paths to be scrubbed from a
 * message and written verbatim into the record in the same command.
 */

/**
 * Two detectors, because one regex cannot serve both jobs.
 *
 * `/dashboard` is a URL route, `/foo/bar/` is a regex literal, and
 * `path:/Users/alice` is a real disclosure. Three rounds of tuning a single
 * delimiter-sensitive pattern traded a leak for a mangled value each time, so
 * the detectors are now split by what the field can legitimately contain.
 *
 * IDENTITY fields (caller, scope, selectors, routes, guidance references,
 * authority, catalog snapshot, candidates, fallback) admit no URL, no regex and
 * no path, so ambiguity there is resolved by rejecting. Its lookbehind includes
 * `:` so `cwd:/Users/alice` is caught.
 *
 * PROSE fields carry human text and quoted evidence, where a URL or a regex is
 * legitimate content. Redaction there is deliberately conservative and
 * best-effort — see {@link redactAbsolutePaths}.
 */
const IDENTITY_PATH_PATTERN =
  /(?<=^|[\s'"`([{<=,;|:])(?:file:\/\/[^\s'"`;,)\]}]*|\\\\[^\s'"`;,)\]}]+|[A-Za-z]:[\\/][^\s'"`;,)\]}]*|\/(?!\/)[^\s'"`;,)\]}]+)/g;

/** As above, minus `:`, which is what makes URLs and regexes distinguishable. */
const PROSE_PATH_PATTERN =
  /(?<=^|[\s'"`([{<=,;|])(?:file:\/\/[^\s'"`;,)\]}]*|\\\\[^\s'"`;,)\]}]+|[A-Za-z]:[\\/][^\s'"`;,)\]}]*|\/(?!\/)[^\s'"`;,)\]}]+)/g;

/** Spans of an http(s) URL, whose internal slashes are routes, not paths. */
const HTTP_URL_PATTERN = /https?:\/\/[^\s'"`)\]}]*/g;

/** The stable stand-in, matching the `<tier>/agents/<role>.md` precedent. */
export const REDACTED_PATH = '<redacted-path>';

function fresh(pattern: RegExp): RegExp {
  return new RegExp(pattern.source, 'g');
}

/**
 * Identity-field detector. Rejects on ambiguity by design.
 */
export function containsAbsolutePath(value: string): boolean {
  return fresh(IDENTITY_PATH_PATTERN).test(value);
}

function httpUrlSpans(value: string): readonly (readonly [number, number])[] {
  const spans: [number, number][] = [];
  const pattern = fresh(HTTP_URL_PATTERN);
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(value)) !== null) {
    spans.push([match.index, match.index + match[0].length]);
  }
  return spans;
}

/**
 * Best-effort prose redaction. NOT a guarantee.
 *
 * Known limits, stated so they are visible rather than assumed away:
 * - A colon-prefixed path (`cwd:/Users/alice`) survives, because `:` cannot be
 *   treated as a path delimiter without mangling every URL.
 * - A candidate inside an http(s) URL is left alone, so a path-shaped route
 *   such as `?next=/dashboard` survives.
 * - A candidate ending in `/` is left alone, because `/foo/bar/` is far more
 *   often a regex literal than a directory in prose.
 * - Any path shape the pattern does not match survives.
 *
 * The bias is deliberate. A path leaked into prose is a disclosure; a mangled
 * URL or regex is corrupted evidence, and corrupted evidence is worse in a
 * provenance record. Identity and control fields carry the enforceable half of
 * the guarantee via {@link containsAbsolutePath}.
 */
export function redactAbsolutePaths(value: string): string {
  const spans = httpUrlSpans(value);
  return value.replace(fresh(PROSE_PATH_PATTERN), (match, offset: number) => {
    if (match.endsWith('/')) return match;
    const inUrl = spans.some(([from, to]) => offset >= from && offset < to);
    return inUrl ? match : REDACTED_PATH;
  });
}

/**
 * Recursively redact every string in a JSON value. Used for prose and nested
 * evidence containers, where a path is plausible incidental content rather than
 * a malformed identifier.
 */
export function redactAbsolutePathsDeep<T>(value: T): T {
  if (typeof value === 'string') return redactAbsolutePaths(value) as T;
  if (Array.isArray(value)) {
    return value.map((entry) => redactAbsolutePathsDeep(entry)) as T;
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
        key,
        redactAbsolutePathsDeep(entry),
      ]),
    ) as T;
  }
  return value;
}

/**
 * Recursively reject any absolute path. Used for identity and control fields,
 * where a path is never a legitimate value and silently rewriting one would
 * corrupt the identifier it claims to be.
 */
export function assertNoAbsolutePath(value: unknown, path: string): void {
  if (typeof value === 'string') {
    if (containsAbsolutePath(value)) {
      throw new Error(
        `A dispatch record must not carry an absolute filesystem path at ${path}.`,
      );
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) =>
      assertNoAbsolutePath(entry, `${path}[${index}]`),
    );
    return;
  }
  if (value === null || typeof value !== 'object') return;
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    assertNoAbsolutePath(entry, `${path}.${key}`);
  }
}

/**
 * The publication postcondition, scoped to what is actually guaranteed.
 *
 * It hard-fails on a path in an identity or control field, which is the half of
 * NFR1 that is enforceable. It deliberately does **not** claim that no absolute
 * path remains anywhere in the revision: prose redaction is best-effort, and a
 * postcondition that asserted more than the sanitizer can deliver would be a
 * false guarantee rather than a check.
 */
export function assertJournalIdentityHasNoAbsolutePath(
  identityFields: Readonly<Record<string, unknown>>,
): void {
  for (const [field, value] of Object.entries(identityFields)) {
    assertNoAbsolutePath(value, `<journal>.${field}`);
  }
}
