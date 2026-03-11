import { OAT_MARKER_PREFIX } from '@engine/markers';
import YAML from 'yaml';

import type { CanonicalRuleFrontmatter } from './types';

function normalizeBody(body: string): string {
  return body.startsWith('\n') ? body.slice(1) : body;
}

function buildMarker(canonicalPath: string): string {
  return `${OAT_MARKER_PREFIX} Source: ${canonicalPath} -->`;
}

export function renderMarkdownWithFrontmatter(
  frontmatter: Record<string, unknown> | null,
  body: string,
): string {
  const normalizedBody = normalizeBody(body);

  if (!frontmatter || Object.keys(frontmatter).length === 0) {
    return normalizedBody;
  }

  const frontmatterYaml = YAML.stringify(frontmatter).trimEnd();
  return `---\n${frontmatterYaml}\n---\n\n${normalizedBody}`;
}

export function appendGeneratedMarker(
  content: string,
  canonicalPath?: string,
): string {
  if (!canonicalPath) {
    return content;
  }

  return `${content.trimEnd()}\n\n${buildMarker(canonicalPath)}\n`;
}

export function renderCanonicalRuleMarkdown(
  frontmatter: CanonicalRuleFrontmatter,
  body: string,
): string {
  const orderedFrontmatter: CanonicalRuleFrontmatter = {
    ...(frontmatter.description !== undefined
      ? { description: frontmatter.description }
      : {}),
    ...(frontmatter.globs !== undefined ? { globs: frontmatter.globs } : {}),
    activation: frontmatter.activation,
  };

  return renderMarkdownWithFrontmatter(orderedFrontmatter, body);
}
