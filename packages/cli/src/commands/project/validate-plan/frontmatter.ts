import YAML from 'yaml';

const FRONTMATTER_PATTERN = /^---\s*\n([\s\S]*?)\n---\s*(?:\n|$)/;

export type FrontmatterResult =
  | { kind: 'ok'; data: Record<string, unknown> }
  | { kind: 'no-frontmatter'; data: Record<string, unknown> }
  | { kind: 'invalid'; message: string };

export function parseFrontmatterFromContent(
  content: string,
): FrontmatterResult {
  const match = content.match(FRONTMATTER_PATTERN);
  if (!match?.[1]) {
    return { kind: 'no-frontmatter', data: {} };
  }
  try {
    const parsed: unknown = YAML.parse(match[1]);
    if (
      parsed !== null &&
      typeof parsed === 'object' &&
      !Array.isArray(parsed)
    ) {
      return { kind: 'ok', data: parsed as Record<string, unknown> };
    }
    return {
      kind: 'invalid',
      message: 'Frontmatter did not parse as an object',
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      kind: 'invalid',
      message: `Malformed YAML in frontmatter: ${message}`,
    };
  }
}
