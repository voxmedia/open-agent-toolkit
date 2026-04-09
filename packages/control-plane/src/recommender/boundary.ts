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

function normalizeNullableString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return value == null ? null : String(value);
  }

  const normalized = value.trim();
  return normalized && normalized !== 'null' ? normalized : null;
}

function parseBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') {
      return true;
    }
  }

  return false;
}
