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
 * Absolute paths in every spelling the boundary must catch.
 *
 * Anchors, in order: `file://` URLs; UNC shares (`\\server\share`); Windows
 * drive paths (`C:\...`, `C:/...`); and POSIX absolute paths. The POSIX arm
 * requires only one leading separator plus a single character, so a root-level
 * path such as `/secret` is caught — the previous pattern demanded a second
 * separator and let those through.
 *
 * The lookbehind admits a match only at a token start, so relative text such as
 * `and/or`, `dispatch/request-1.json` and a date like `2026/09/03` are not
 * paths. `>` is deliberately excluded from it so the canonical redacted role
 * form `<user>/agents/<role>.md` survives untouched.
 */
const ABSOLUTE_PATH_PATTERN =
  /(?<=^|[\s'"`([{<])(?:file:\/\/[^\s'"`;,)\]}]*|\\\\[^\s'"`;,)\]}]+|[A-Za-z]:[\\/][^\s'"`;,)\]}]*|\/[^\s'"`;,)\]}]+)/g;

/** The stable stand-in, matching the `<tier>/agents/<role>.md` precedent. */
export const REDACTED_PATH = '<redacted-path>';

export function containsAbsolutePath(value: string): boolean {
  // A global regex carries lastIndex; construct per call rather than share it.
  return new RegExp(ABSOLUTE_PATH_PATTERN.source, 'g').test(value);
}

export function redactAbsolutePaths(value: string): string {
  return value.replace(
    new RegExp(ABSOLUTE_PATH_PATTERN.source, 'g'),
    REDACTED_PATH,
  );
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
 * The publication postcondition. Runs on the exact value about to be written,
 * so no combination of fields, providers or future call sites can put a path
 * into the journal even if an earlier stage is bypassed.
 */
export function assertJournalHasNoAbsolutePath(value: unknown): void {
  const serialized = JSON.stringify(value) ?? '';
  if (containsAbsolutePath(serialized)) {
    const found = serialized.match(
      new RegExp(ABSOLUTE_PATH_PATTERN.source, 'g'),
    );
    throw new Error(
      `Refusing to publish a dispatch journal revision containing an absolute filesystem path: ${found?.[0] ?? 'unknown'}.`,
    );
  }
}
