import { readFile } from 'node:fs/promises';

import { CliError } from '@errors/index';
import YAML from 'yaml';

import type {
  CanonicalAgentDocument,
  CanonicalAgentFrontmatter,
  CanonicalAgentTools,
} from './types';

const FRONTMATTER_PATTERN = /^---\n([\s\S]*?)\n---\n?/;
const SAFE_AGENT_NAME_PATTERN = /^[a-z0-9][a-z0-9_-]*$/;

function readFrontmatterAndBody(markdown: string): {
  frontmatterRaw: string;
  body: string;
} {
  const match = markdown.match(FRONTMATTER_PATTERN);
  if (!match || !match[1]) {
    throw new CliError('Agent markdown must include YAML frontmatter.');
  }

  const frontmatterRaw = match[1];
  const body = markdown.slice(match[0].length);
  return { frontmatterRaw, body };
}

function parseFrontmatterObject(
  raw: string,
  filePath: string,
): CanonicalAgentFrontmatter {
  let parsed: unknown;
  try {
    parsed = YAML.parse(raw);
  } catch (error) {
    throw new CliError(
      `Invalid YAML frontmatter in ${filePath}: ${error instanceof Error ? error.message : 'unknown parse error'}`,
    );
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new CliError(
      `Frontmatter in ${filePath} must be a YAML object with required fields.`,
    );
  }

  return parsed as CanonicalAgentFrontmatter;
}

function parseTools(
  tools: unknown,
  filePath: string,
): CanonicalAgentTools | undefined {
  if (tools === undefined) {
    return undefined;
  }

  if (typeof tools === 'string') {
    return tools;
  }

  if (
    Array.isArray(tools) &&
    tools.every((value) => typeof value === 'string')
  ) {
    return tools as string[];
  }

  throw new CliError(
    `Frontmatter field "tools" in ${filePath} must be a string or string array.`,
  );
}

function parseAgentName(name: unknown, filePath: string): string {
  if (typeof name !== 'string' || name.trim() === '') {
    throw new CliError(
      `Frontmatter field "name" is required in ${filePath} and must be a non-empty string.`,
    );
  }

  const normalized = name.trim();
  if (!SAFE_AGENT_NAME_PATTERN.test(normalized)) {
    throw new CliError(
      `Frontmatter field "name" in ${filePath} must match ${SAFE_AGENT_NAME_PATTERN.source}.`,
    );
  }

  return normalized;
}

function parseDescription(description: unknown, filePath: string): string {
  if (typeof description !== 'string' || description.trim() === '') {
    throw new CliError(
      `Frontmatter field "description" is required in ${filePath} and must be a non-empty string.`,
    );
  }

  return description.trim();
}

function parseOptionalString(
  value: unknown,
  fieldName: string,
  filePath: string,
): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value === 'string') {
    return value;
  }

  throw new CliError(
    `Frontmatter field "${fieldName}" in ${filePath} must be a string when present.`,
  );
}

function parseOptionalBoolean(
  value: unknown,
  fieldName: string,
  filePath: string,
): boolean | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  throw new CliError(
    `Frontmatter field "${fieldName}" in ${filePath} must be a boolean when present.`,
  );
}

function collectExtensions(
  frontmatter: CanonicalAgentFrontmatter,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(frontmatter).filter(([key]) => key.startsWith('x_')),
  );
}

export function parseCanonicalAgentMarkdown(
  markdown: string,
  filePath = '<inline>',
): CanonicalAgentDocument {
  const { frontmatterRaw, body } = readFrontmatterAndBody(markdown);
  const frontmatter = parseFrontmatterObject(frontmatterRaw, filePath);

  return {
    filePath,
    body,
    frontmatter,
    name: parseAgentName(frontmatter.name, filePath),
    description: parseDescription(frontmatter.description, filePath),
    tools: parseTools(frontmatter.tools, filePath),
    model: parseOptionalString(frontmatter.model, 'model', filePath),
    readonly: parseOptionalBoolean(frontmatter.readonly, 'readonly', filePath),
    color: parseOptionalString(frontmatter.color, 'color', filePath),
    extensions: collectExtensions(frontmatter),
  };
}

export async function parseCanonicalAgentFile(
  filePath: string,
): Promise<CanonicalAgentDocument> {
  const markdown = await readFile(filePath, 'utf8');
  return parseCanonicalAgentMarkdown(markdown, filePath);
}
