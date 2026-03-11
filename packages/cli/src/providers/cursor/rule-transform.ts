import {
  appendGeneratedMarker,
  parseCanonicalRuleMarkdown,
  parseMarkdownFrontmatter,
  renderCanonicalRuleMarkdown,
  renderMarkdownWithFrontmatter,
} from '@rules/canonical/index';
import type { RuleActivation } from '@rules/canonical/index';

function parseDescription(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim() !== '') {
    return value.trim();
  }
  return undefined;
}

function parseGlobs(value: unknown): string[] | undefined {
  if (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((glob) => typeof glob === 'string' && glob.trim() !== '')
  ) {
    return value.map((glob) => glob.trim());
  }
  return undefined;
}

function buildCursorFrontmatter(
  activation: RuleActivation,
  description?: string,
  globs?: string[],
): Record<string, unknown> | null {
  if (activation === 'manual') {
    return null;
  }

  return {
    ...(description !== undefined ? { description } : {}),
    alwaysApply: activation === 'always',
    ...(activation === 'glob' && globs ? { globs } : {}),
  };
}

export function transformCanonicalToCursorRule(
  canonicalContent: string,
  canonicalPath?: string,
): string {
  const rule = parseCanonicalRuleMarkdown(canonicalContent);
  const frontmatter = buildCursorFrontmatter(
    rule.activation,
    rule.description,
    rule.globs,
  );

  return appendGeneratedMarker(
    renderMarkdownWithFrontmatter(frontmatter, rule.body),
    canonicalPath,
  );
}

export function parseCursorRuleToCanonical(providerContent: string): string {
  const { frontmatter, body } = parseMarkdownFrontmatter(providerContent);

  if (!frontmatter) {
    return renderCanonicalRuleMarkdown({ activation: 'manual' }, body);
  }

  const description = parseDescription(frontmatter.description);
  const globs = parseGlobs(frontmatter.globs);
  const activation: RuleActivation =
    frontmatter.alwaysApply === true
      ? 'always'
      : globs
        ? 'glob'
        : 'agent-requested';

  return renderCanonicalRuleMarkdown(
    {
      ...(description !== undefined ? { description } : {}),
      ...(globs !== undefined ? { globs } : {}),
      activation,
    },
    body,
  );
}
