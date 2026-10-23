/**
 * Adapt OAT's bounded exclusion grammar to collection globs. Only `*` and a
 * whole-segment `**` are operators; every other glob metacharacter is literal.
 * Negative patterns cover descendants too because matching a directory prunes it.
 */
export function collectionFiles(
  patterns: readonly string[],
  extensions: string[],
): string[] {
  const files = [`**/*.{${extensions.join(',')}}`];
  for (const raw of patterns) {
    const trimmed = raw.trim();
    const directoryOnly = trimmed.endsWith('/');
    const path = trimmed
      .replace(/\/+$/, '')
      .replace(/^\.\//, '')
      .replace(/^\/+/, '');
    if (!path) continue;
    const segments = path.split('/');
    const glob = segments
      .map((segment) =>
        segment === '**'
          ? '**'
          : segment.replace(/\*+/g, '*').replace(/[?[\]{}()!+@|\\]/g, '\\$&'),
      )
      .join('/');
    if (directoryOnly) {
      // A globstar may consume zero segments, but a pruned directory must
      // consume at least one, followed by an actual descendant file.
      const directoryGlob = segments.every((segment) => segment === '**')
        ? '*'
        : glob;
      files.push(`!${directoryGlob}/**/*`);
    } else {
      files.push(`!${glob}`, `!${glob}/**`);
    }
  }
  return files;
}
