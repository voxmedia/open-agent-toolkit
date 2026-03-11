import { readFile } from 'node:fs/promises';

import { OAT_MARKER_PREFIX } from '@engine/markers';
import { CliError } from '@errors/index';
import YAML from 'yaml';

import type {
  CanonicalRuleDocument,
  CanonicalRuleFrontmatter,
  RuleActivation,
} from './types';
import { RULE_ACTIVATIONS } from './types';

const FRONTMATTER_PATTERN = /^---\n([\s\S]*?)\n---\n?/;
const OAT_MARKER_PATTERN = new RegExp(
  `\\n?${escapeRegExp(OAT_MARKER_PREFIX)}[\\s\\S]*?-->\\s*$`,
);

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseFrontmatterObject(
  raw: string,
  filePath: string,
): Record<string, unknown> {
  let parsed: unknown;
  try {
    parsed = YAML.parse(raw);
  } catch (error) {
    throw new CliError(
      `Invalid YAML frontmatter in ${filePath}: ${
        error instanceof Error ? error.message : 'unknown parse error'
      }`,
    );
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new CliError(`Frontmatter in ${filePath} must be a YAML object.`);
  }

  return parsed as Record<string, unknown>;
}

function parseDescription(
  value: unknown,
  filePath: string,
): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value === 'string' && value.trim() !== '') {
    return value.trim();
  }

  throw new CliError(
    `Frontmatter field "description" in ${filePath} must be a non-empty string when present.`,
  );
}

function parseGlobs(value: unknown, filePath: string): string[] | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((glob) => typeof glob === 'string' && glob.trim() !== '')
  ) {
    return value.map((glob) => glob.trim());
  }

  throw new CliError(
    `Frontmatter field "globs" in ${filePath} must be a non-empty string array when present.`,
  );
}

function isRuleActivation(value: unknown): value is RuleActivation {
  return (
    typeof value === 'string' &&
    RULE_ACTIVATIONS.includes(value as RuleActivation)
  );
}

function parseActivation(value: unknown, filePath: string): RuleActivation {
  if (isRuleActivation(value)) {
    return value;
  }

  throw new CliError(
    `Frontmatter field "activation" in ${filePath} must be one of ${RULE_ACTIVATIONS.join(
      ', ',
    )}.`,
  );
}

export function stripTrailingOatMarker(content: string): string {
  return content.replace(OAT_MARKER_PATTERN, '').trimEnd();
}

export function parseMarkdownFrontmatter(
  markdown: string,
  filePath = '<inline>',
): {
  frontmatter: Record<string, unknown> | null;
  body: string;
} {
  const withoutMarker = stripTrailingOatMarker(markdown);
  const match = withoutMarker.match(FRONTMATTER_PATTERN);

  if (!match || !match[1]) {
    return {
      frontmatter: null,
      body: withoutMarker,
    };
  }

  const body = withoutMarker.slice(match[0].length);

  return {
    frontmatter: parseFrontmatterObject(match[1], filePath),
    body: body.startsWith('\n') ? body.slice(1) : body,
  };
}

export function parseCanonicalRuleMarkdown(
  markdown: string,
  filePath = '<inline>',
): CanonicalRuleDocument {
  const { frontmatter, body } = parseMarkdownFrontmatter(markdown, filePath);

  if (!frontmatter) {
    throw new CliError('Rule markdown must include YAML frontmatter.');
  }

  const activation = parseActivation(frontmatter.activation, filePath);
  const description = parseDescription(frontmatter.description, filePath);
  const globs = parseGlobs(frontmatter.globs, filePath);

  if (activation === 'glob' && (!globs || globs.length === 0)) {
    throw new CliError(
      `Frontmatter field "globs" is required in ${filePath} when activation is glob.`,
    );
  }

  if (activation !== 'glob' && globs) {
    throw new CliError(
      `Frontmatter field "globs" in ${filePath} is only valid when activation is glob.`,
    );
  }

  const normalizedFrontmatter: CanonicalRuleFrontmatter = {
    ...(description !== undefined ? { description } : {}),
    ...(globs !== undefined ? { globs } : {}),
    activation,
  };

  return {
    filePath,
    body,
    frontmatter: normalizedFrontmatter,
    description,
    globs,
    activation,
  };
}

export async function parseCanonicalRuleFile(
  filePath: string,
): Promise<CanonicalRuleDocument> {
  const markdown = await readFile(filePath, 'utf8');
  return parseCanonicalRuleMarkdown(markdown, filePath);
}
