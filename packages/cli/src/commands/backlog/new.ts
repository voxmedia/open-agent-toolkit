import { access, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import {
  parseAssociatedIssues,
  serializeAssociatedIssues,
  type SerializedAssociatedIssue,
} from '@commands/pjm/remote/association';
import {
  resolvePjmTemplate,
  type PjmTemplateTier,
} from '@commands/pjm/template-source';
import { stripTemplateFrontmatter } from '@commands/shared/strip-template-frontmatter';
import YAML from 'yaml';

import { initializeBacklog } from './init';
import {
  regenerateBacklogIndex,
  type RegenerateBacklogIndexResult,
} from './regenerate-index';
import { generateBacklogId } from './shared/generate-id';

const PRIORITIES = ['urgent', 'high', 'medium', 'low', 'none'] as const;
const SCOPES = ['idea', 'task', 'feature', 'initiative'] as const;
const SCOPE_ESTIMATES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'] as const;
const DESCRIPTION_PLACEHOLDER =
  '{Describe the problem, request, or capability tracked by this backlog item.}';

export interface CreateBacklogItemOptions {
  backlogRoot: string;
  assetsRoot: string;
  templatesRoot?: string;
  home?: string;
  title: string;
  priority?: string;
  scope?: string;
  scopeEstimate?: string;
  labels?: string[];
  description?: string;
  createdAt?: string;
  associatedIssues?: unknown;
}

export interface CreateBacklogItemResult {
  id: string;
  backlogRoot: string;
  filePath: string;
  templatePath: string;
  templateTier: PjmTemplateTier;
  index: RegenerateBacklogIndexResult;
}

export interface CreateBacklogItemDependencies {
  initializeBacklog: typeof initializeBacklog;
  regenerateBacklogIndex: typeof regenerateBacklogIndex;
}

const DEFAULT_DEPENDENCIES: CreateBacklogItemDependencies = {
  initializeBacklog,
  regenerateBacklogIndex,
};

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch (error) {
    const code =
      error && typeof error === 'object' && 'code' in error
        ? String(error.code)
        : null;
    if (code !== 'ENOENT') {
      throw error;
    }
    return false;
  }
}

function normalizeChoice(
  field: string,
  value: string | undefined,
  fallback: string,
  allowed: readonly string[],
  transform: (input: string) => string,
): string {
  const normalized = transform(value ?? fallback);
  if (!allowed.includes(normalized)) {
    throw new Error(
      `Invalid backlog ${field} "${value}". Valid values: ${allowed.join(', ')}.`,
    );
  }
  return normalized;
}

function normalizeInputs(options: CreateBacklogItemOptions): {
  title: string;
  timestamp: string;
  priority: string;
  scope: string;
  scopeEstimate: string | null;
  labels: string[];
  description?: string;
  associatedIssues: SerializedAssociatedIssue[];
} {
  const title = options.title.trim();
  if (
    !title ||
    title.includes('\r') ||
    title.includes('\n') ||
    title.includes('\0')
  ) {
    throw new Error('Backlog title must be a non-empty single line.');
  }

  const date = new Date(options.createdAt ?? new Date().toISOString());
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid backlog creation timestamp: ${options.createdAt}`);
  }

  const priority = normalizeChoice(
    'priority',
    options.priority,
    'medium',
    PRIORITIES,
    (value) => value.trim().toLowerCase(),
  );
  const scope = normalizeChoice(
    'scope',
    options.scope,
    'task',
    SCOPES,
    (value) => value.trim().toLowerCase(),
  );
  const scopeEstimate =
    options.scopeEstimate === undefined
      ? null
      : normalizeChoice(
          'scope estimate',
          options.scopeEstimate,
          '',
          SCOPE_ESTIMATES,
          (value) => value.trim().toUpperCase(),
        );

  const labels = (options.labels ?? []).map((label) => label.trim());
  if (
    labels.some(
      (label) =>
        !label ||
        label.includes('\r') ||
        label.includes('\n') ||
        label.includes('\0'),
    )
  ) {
    throw new Error('Backlog labels must be non-empty single-line values.');
  }

  if (
    options.description !== undefined &&
    (!options.description.trim() || options.description.includes('\0'))
  ) {
    throw new Error('Backlog description must contain non-empty text.');
  }

  return {
    title,
    timestamp: date.toISOString(),
    priority,
    scope,
    scopeEstimate,
    labels,
    description: options.description,
    associatedIssues: serializeAssociatedIssues(
      parseAssociatedIssues(options.associatedIssues ?? []),
    ),
  };
}

function renderBacklogItem(
  template: string,
  values: {
    id: string;
    title: string;
    timestamp: string;
    priority: string;
    scope: string;
    scopeEstimate: string | null;
    labels: string[];
    description?: string;
    associatedIssues: SerializedAssociatedIssue[];
  },
): string {
  let body = stripTemplateFrontmatter(template).replace(/^\r?\n+/, '');
  if (values.description !== undefined) {
    body = body.replace(DESCRIPTION_PLACEHOLDER, () => values.description!);
  }

  const frontmatter = YAML.stringify({
    id: values.id,
    title: values.title,
    status: 'open',
    priority: values.priority,
    scope: values.scope,
    scope_estimate: values.scopeEstimate,
    labels: values.labels,
    assignee: null,
    created: values.timestamp,
    updated: values.timestamp,
    associated_issues: values.associatedIssues,
    external_plans: [],
  }).trimEnd();

  return `---\n${frontmatter}\n---\n\n${body.trimEnd()}\n`;
}

export async function createBacklogItem(
  options: CreateBacklogItemOptions,
  overrides: Partial<CreateBacklogItemDependencies> = {},
): Promise<CreateBacklogItemResult> {
  const dependencies = { ...DEFAULT_DEPENDENCIES, ...overrides };
  const values = normalizeInputs(options);
  const id = generateBacklogId(values.title, values.timestamp);
  const filePath = join(options.backlogRoot, 'items', `${id}.md`);
  const archivedPath = join(options.backlogRoot, 'archived', `${id}.md`);

  if ((await pathExists(filePath)) || (await pathExists(archivedPath))) {
    throw new Error(
      `Backlog item ${id} already exists. Use a more specific title to disambiguate.`,
    );
  }

  const template = await resolvePjmTemplate({
    name: 'backlog-item.md',
    assetsRoot: options.assetsRoot,
    templatesRoot: options.templatesRoot,
    home: options.home,
  });
  const content = renderBacklogItem(template.content, { id, ...values });

  await dependencies.initializeBacklog(options.backlogRoot);
  const indexPath = join(options.backlogRoot, 'index.md');
  const originalIndex = await readFile(indexPath, 'utf8');

  await writeFile(filePath, content, { encoding: 'utf8', flag: 'wx' });
  let index: RegenerateBacklogIndexResult;
  try {
    index = await dependencies.regenerateBacklogIndex(options.backlogRoot);
  } catch (error) {
    const rollback = await Promise.allSettled([
      rm(filePath),
      writeFile(indexPath, originalIndex, 'utf8'),
    ]);
    const rollbackErrors = rollback
      .filter((result) => result.status === 'rejected')
      .map((result) => result.reason);
    if (rollbackErrors.length > 0) {
      const rollbackError = new AggregateError(
        [error, ...rollbackErrors],
        `Backlog item ${id} creation failed and rollback was incomplete.`,
      );
      rollbackError.cause = error;
      throw rollbackError;
    }
    throw error;
  }

  return {
    id,
    backlogRoot: options.backlogRoot,
    filePath,
    templatePath: template.path,
    templateTier: template.tier,
    index,
  };
}
