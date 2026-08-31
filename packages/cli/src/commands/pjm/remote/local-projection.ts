import { createHash } from 'node:crypto';

import {
  getFrontmatterBlock,
  parseFrontmatterScalarFields,
} from '@commands/shared/frontmatter';

export interface LocalProjection {
  title: string;
  description: string | null;
  priority: string | null;
  source: 'backlog-description' | 'explicit-project-publication';
  sourceRevision: string;
  observedAt: string;
}

interface BacklogProjectionTarget {
  kind: 'backlog';
  path: string;
  content: string;
}

interface ProjectPublication {
  title: string;
  description: string | null;
  priority: string | null;
}

interface ProjectProjectionTarget {
  kind: 'project';
  path: string;
  publication: ProjectPublication;
}

export interface ResolveLocalProjectionInput {
  target: BacklogProjectionTarget | ProjectProjectionTarget;
  observedAt: string;
}

export function resolveLocalProjection(
  input: ResolveLocalProjectionInput,
): LocalProjection {
  assertObservedAt(input.observedAt);
  if (!input.target.path.trim()) {
    throw new Error('Local projection source path must not be empty.');
  }

  if (input.target.kind === 'backlog') {
    return resolveBacklogProjection(input.target, input.observedAt);
  }
  if (input.target.kind === 'project') {
    return resolveProjectProjection(input.target, input.observedAt);
  }

  throw new Error('Unsupported local projection target kind.');
}

function resolveBacklogProjection(
  target: BacklogProjectionTarget,
  observedAt: string,
): LocalProjection {
  const frontmatter = getFrontmatterBlock(target.content);
  if (!frontmatter) {
    throw new Error(
      `Backlog projection '${target.path}' requires frontmatter.`,
    );
  }
  const parsed = parseFrontmatterScalarFields(frontmatter, [
    'title',
    'priority',
  ]);
  if (!parsed.valid || !parsed.values.title) {
    throw new Error(
      `Backlog projection '${target.path}' requires valid frontmatter with one string title.`,
    );
  }

  const description = extractDescriptionSection(target.content, target.path);
  const selected = {
    targetKind: target.kind,
    sourcePath: target.path,
    title: parsed.values.title,
    description,
    priority: parsed.values.priority ?? null,
    source: 'backlog-description' as const,
  };

  return {
    title: selected.title,
    description: selected.description,
    priority: selected.priority,
    source: selected.source,
    sourceRevision: hashSelectedProjection(selected),
    observedAt,
  };
}

function resolveProjectProjection(
  target: ProjectProjectionTarget,
  observedAt: string,
): LocalProjection {
  const title = target.publication.title.trim();
  if (!title) {
    throw new Error('An explicit project publication requires a title.');
  }
  const selected = {
    targetKind: target.kind,
    sourcePath: target.path,
    title,
    description: normalizeOptionalValue(target.publication.description),
    priority: normalizeOptionalValue(target.publication.priority),
    source: 'explicit-project-publication' as const,
  };

  return {
    title: selected.title,
    description: selected.description,
    priority: selected.priority,
    source: selected.source,
    sourceRevision: hashSelectedProjection(selected),
    observedAt,
  };
}

function extractDescriptionSection(
  content: string,
  sourcePath: string,
): string | null {
  const headings = [...content.matchAll(/^##[ \t]+Description[ \t]*$/gm)];
  if (headings.length !== 1) {
    throw new Error(
      `Backlog projection '${sourcePath}' requires exactly one level-two Description section.`,
    );
  }
  const heading = headings[0]!;
  const sectionStart = heading.index! + heading[0].length;
  const remaining = content.slice(sectionStart).replace(/^\r?\n/, '');
  const nextOwnedHeading = /^#{1,2}[ \t]+[^\r\n]+$/m.exec(remaining);
  const section = (
    nextOwnedHeading ? remaining.slice(0, nextOwnedHeading.index) : remaining
  ).trim();
  return section || null;
}

function normalizeOptionalValue(value: string | null): string | null {
  if (value === null) return null;
  const normalized = value.trim();
  return normalized || null;
}

function hashSelectedProjection(value: object): string {
  return `sha256:${createHash('sha256')
    .update(JSON.stringify(value))
    .digest('hex')}`;
}

function assertObservedAt(value: string): void {
  if (!Number.isFinite(Date.parse(value))) {
    throw new Error(`Invalid projection observation time '${value}'.`);
  }
}
