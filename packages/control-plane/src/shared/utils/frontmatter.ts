import YAML from 'yaml';

// Both delimiters accept `\r\n`: the opening `\s*` already consumes a `\r`,
// and `\r?` before the closing fence keeps a CRLF block's last line free of a
// trailing `\r`, which would otherwise break a quoted final scalar. LF input
// matches exactly as before.
const FRONTMATTER_PATTERN = /^---\s*\n([\s\S]*?)\r?\n---\s*(?:\n|$)/;

export function extractFrontmatter(content: string): string | null {
  const match = content.match(FRONTMATTER_PATTERN);
  return match?.[1] ?? null;
}

export function parseFrontmatterRecord(
  content: string,
): Record<string, unknown> {
  const frontmatter = extractFrontmatter(content);
  if (frontmatter == null) {
    return {};
  }

  try {
    const parsed = YAML.parse(frontmatter);
    return isRecord(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
