import {
  normalizeNullableString,
  parseBoolean,
} from '../shared/utils/normalize';
import type { BoundaryTier } from '../types';

const TEMPLATE_PATTERNS = [
  /\{Project Name\}/,
  /\{Copy of/,
  /\{Clear description/,
];

export function detectBoundaryTier(
  frontmatter: Record<string, unknown>,
  content: string,
): BoundaryTier {
  const status = normalizeNullableString(frontmatter.oat_status);
  const isTemplate = parseBoolean(frontmatter.oat_template);

  if (status === 'complete') {
    return 1;
  }

  if (
    status === 'in_progress' &&
    !isTemplate &&
    !hasTemplatePlaceholders(content)
  ) {
    return 2;
  }

  return 3;
}

function hasTemplatePlaceholders(content: string): boolean {
  return TEMPLATE_PATTERNS.some((pattern) => pattern.test(content));
}
