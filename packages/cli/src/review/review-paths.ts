const WINDOWS_ABSOLUTE = /^[A-Za-z]:[\\/]/;

export function normalizeReviewPath(input: string): string {
  if (input.length === 0 || input.includes('\0')) {
    throw new Error('review path must be non-empty and contain no NUL bytes');
  }
  if (
    input.startsWith('/') ||
    input.startsWith('\\') ||
    WINDOWS_ABSOLUTE.test(input)
  ) {
    throw new Error('review path must be repository-relative');
  }

  const parts: string[] = [];
  for (const part of input.replaceAll('\\', '/').split('/')) {
    if (part === '' || part === '.') continue;
    if (part === '..') {
      if (parts.length === 0) {
        throw new Error('review path escapes the repository');
      }
      parts.pop();
      continue;
    }
    parts.push(part);
  }
  if (parts.length === 0) {
    throw new Error('review path resolves to an empty path');
  }
  return parts.join('/');
}

export function normalizeReviewPaths(inputs: readonly string[]): string[] {
  const normalized = inputs.map(normalizeReviewPath);
  const unique = new Set(normalized);
  if (unique.size !== normalized.length) {
    throw new Error('review paths contain duplicate normalized paths');
  }
  return [...unique].sort();
}
