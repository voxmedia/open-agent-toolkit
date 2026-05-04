import { CliError } from '@errors/index';
import {
  appendGeneratedMarker,
  parseCanonicalRuleMarkdown,
  parseMarkdownFrontmatter,
  renderCanonicalRuleMarkdown,
  renderMarkdownWithFrontmatter,
} from '@rules/canonical/index';

function parseDescription(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim() !== '') {
    return value.trim();
  }
  return undefined;
}

function containsComma(value: string): boolean {
  return value.includes(',');
}

function assertCopilotGlobsAreRepresentable(globs: string[]): void {
  const unsupportedGlob = globs.find(containsComma);
  if (!unsupportedGlob) {
    return;
  }

  throw new CliError(
    `Copilot rule applyTo cannot represent globs containing commas: ${unsupportedGlob}`,
  );
}

function parseApplyTo(value: unknown): string[] | undefined {
  if (typeof value !== 'string' || value.trim() === '') {
    return undefined;
  }

  if (containsComma(value) && value.includes('{')) {
    throw new CliError(
      `Copilot rule applyTo cannot be losslessly parsed when a glob contains commas: ${value}`,
    );
  }

  const globs = value
    .split(',')
    .map((glob) => glob.trim())
    .filter(Boolean);

  return globs.length > 0 ? globs : undefined;
}

function isRepoWideApplyTo(globs: string[] | undefined): boolean {
  return globs?.length === 1 && globs[0] === '**';
}

export function transformCanonicalToCopilotRule(
  canonicalContent: string,
  canonicalPath?: string,
): string {
  const rule = parseCanonicalRuleMarkdown(canonicalContent);
  if (rule.activation === 'glob' && rule.globs) {
    assertCopilotGlobsAreRepresentable(rule.globs);
  }
  const frontmatter =
    rule.activation === 'glob' && rule.globs
      ? {
          ...(rule.description !== undefined
            ? { description: rule.description }
            : {}),
          applyTo: rule.globs.join(','),
        }
      : rule.activation === 'always'
        ? {
            ...(rule.description !== undefined
              ? { description: rule.description }
              : {}),
            applyTo: '**',
          }
        : rule.description !== undefined
          ? { description: rule.description }
          : null;

  return appendGeneratedMarker(
    renderMarkdownWithFrontmatter(frontmatter, rule.body),
    canonicalPath,
  );
}

export function parseCopilotRuleToCanonical(providerContent: string): string {
  const { frontmatter, body } = parseMarkdownFrontmatter(providerContent);
  const description = parseDescription(frontmatter?.description);
  const globs = parseApplyTo(frontmatter?.applyTo);

  return renderCanonicalRuleMarkdown(
    {
      ...(description !== undefined ? { description } : {}),
      ...(globs !== undefined && !isRepoWideApplyTo(globs) ? { globs } : {}),
      activation: globs && !isRepoWideApplyTo(globs) ? 'glob' : 'always',
    },
    body,
  );
}
