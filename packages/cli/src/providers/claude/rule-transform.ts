import {
  appendGeneratedMarker,
  parseCanonicalRuleMarkdown,
  parseMarkdownFrontmatter,
  renderCanonicalRuleMarkdown,
  renderMarkdownWithFrontmatter,
} from '@rules/canonical/index';

function parsePaths(value: unknown): string[] | undefined {
  if (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((path) => typeof path === 'string' && path.trim() !== '')
  ) {
    return value.map((path) => path.trim());
  }

  return undefined;
}

export function transformCanonicalToClaudeRule(
  canonicalContent: string,
  canonicalPath?: string,
): string {
  const rule = parseCanonicalRuleMarkdown(canonicalContent);
  const frontmatter =
    rule.activation === 'glob' && rule.globs ? { paths: rule.globs } : null;

  return appendGeneratedMarker(
    renderMarkdownWithFrontmatter(frontmatter, rule.body),
    canonicalPath,
  );
}

export function parseClaudeRuleToCanonical(providerContent: string): string {
  const { frontmatter, body } = parseMarkdownFrontmatter(providerContent);
  const globs = parsePaths(frontmatter?.paths);

  return renderCanonicalRuleMarkdown(
    {
      ...(globs ? { globs } : {}),
      activation: globs ? 'glob' : 'always',
    },
    body,
  );
}
