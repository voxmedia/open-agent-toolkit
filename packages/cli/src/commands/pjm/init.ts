import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { initializeBacklog } from '@commands/backlog/init';
import { initializeDecisionRecords } from '@commands/decision/init';
import { stripTemplateFrontmatter } from '@commands/shared/strip-template-frontmatter';

export interface InitializeRepoReferenceOptions {
  repoRoot: string;
  assetsRoot: string;
  templatesRoot?: string;
}

export interface RepoReferenceInitResult {
  repoRoot: string;
  created: string[];
  skipped: string[];
}

interface TemplateTarget {
  template: string;
  target: string;
}

const TEMPLATE_TARGETS = [
  { template: 'repo-agents.md', target: 'AGENTS.md' },
  { template: 'pjm-agents.md', target: 'pjm/AGENTS.md' },
  { template: 'current-state.md', target: 'pjm/current-state.md' },
  { template: 'roadmap.md', target: 'pjm/roadmap.md' },
  { template: 'reference-agents.md', target: 'reference/AGENTS.md' },
  { template: 'repo-readme.md', target: 'README.md' },
  { template: 'pjm-handoffs-readme.md', target: 'pjm/handoffs/README.md' },
] as const satisfies readonly TemplateTarget[];

// Next-step hint printed after init/backfill. `oat pjm init` never writes
// CLAUDE.md shims itself — strategy ownership stays with `oat instructions
// sync`, so we point the operator at it (with the `--dry-run` preview).
export const INSTRUCTIONS_SYNC_HINT =
  'Next step: run `oat instructions sync` to create CLAUDE.md shims for the ' +
  'repo-reference AGENTS.md files (preview with `oat instructions sync --dry-run`).';

const BACKLOG_PATHS = [
  'pjm/backlog/index.md',
  'pjm/backlog/completed.md',
  'pjm/backlog/items/.gitkeep',
  'pjm/backlog/archived/.gitkeep',
] as const;

const DECISION_PATHS = ['reference/decisions/index.md'] as const;

export const CANONICAL_REPO_REFERENCE_PATHS = [
  ...TEMPLATE_TARGETS.map((target) => target.target),
  ...BACKLOG_PATHS,
  ...DECISION_PATHS,
] as const;

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

async function readIfExists(path: string): Promise<string | null> {
  try {
    return await readFile(path, 'utf8');
  } catch (error) {
    const code =
      error && typeof error === 'object' && 'code' in error
        ? String(error.code)
        : null;

    if (code !== 'ENOENT') {
      throw error;
    }

    return null;
  }
}

async function resolveTemplateContent(
  name: string,
  options: InitializeRepoReferenceOptions,
): Promise<string> {
  if (options.templatesRoot) {
    const localTemplate = await readIfExists(join(options.templatesRoot, name));
    if (localTemplate !== null) {
      return localTemplate;
    }
  }

  const bundledTemplate = await readIfExists(
    join(options.assetsRoot, 'templates', name),
  );
  if (bundledTemplate !== null) {
    return bundledTemplate;
  }

  throw new Error(
    `Template ${name} was not found in repo-local templates or bundled assets.`,
  );
}

async function writeFileIfMissing(
  filePath: string,
  content: string,
): Promise<'created' | 'skipped'> {
  if (await pathExists(filePath)) {
    return 'skipped';
  }

  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, content, 'utf8');
  return 'created';
}

export async function initializeRepoReference(
  options: InitializeRepoReferenceOptions,
): Promise<RepoReferenceInitResult> {
  const created: string[] = [];
  const skipped: string[] = [];

  for (const target of TEMPLATE_TARGETS) {
    const targetPath = join(options.repoRoot, target.target);
    if (await pathExists(targetPath)) {
      skipped.push(target.target);
      continue;
    }

    const template = await resolveTemplateContent(target.template, options);
    const status = await writeFileIfMissing(
      targetPath,
      stripTemplateFrontmatter(template),
    );
    if (status === 'created') {
      created.push(target.target);
    } else {
      skipped.push(target.target);
    }
  }

  const existingBacklogPaths = new Set<string>();
  for (const relativePath of BACKLOG_PATHS) {
    if (await pathExists(join(options.repoRoot, relativePath))) {
      existingBacklogPaths.add(relativePath);
    }
  }

  await initializeBacklog(join(options.repoRoot, 'pjm', 'backlog'));

  for (const relativePath of BACKLOG_PATHS) {
    if (existingBacklogPaths.has(relativePath)) {
      skipped.push(relativePath);
    } else {
      created.push(relativePath);
    }
  }

  const existingDecisionPaths = new Set<string>();
  for (const relativePath of DECISION_PATHS) {
    if (await pathExists(join(options.repoRoot, relativePath))) {
      existingDecisionPaths.add(relativePath);
    }
  }

  await initializeDecisionRecords(
    join(options.repoRoot, 'reference', 'decisions'),
  );

  for (const relativePath of DECISION_PATHS) {
    if (existingDecisionPaths.has(relativePath)) {
      skipped.push(relativePath);
    } else {
      created.push(relativePath);
    }
  }

  return {
    repoRoot: options.repoRoot,
    created,
    skipped,
  };
}
