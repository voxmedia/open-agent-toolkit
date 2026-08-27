import { access, mkdir, writeFile } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';

import { initializeBacklog } from '@commands/backlog/init';
import { initializeScopedDecisionAgentsGuidance } from '@commands/decision/agents-guidance';
import { initializeDecisionRecords } from '@commands/decision/init';
import { stripTemplateFrontmatter } from '@commands/shared/strip-template-frontmatter';
import { readOatConfig, writeOatConfig } from '@config/oat-config';

import { resolvePjmTemplate } from './template-source';

export interface InitializeRepoReferenceOptions {
  repoRoot: string;
  assetsRoot: string;
  templatesRoot?: string;
  projectRoot?: string;
  home?: string;
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

const DECISION_AGENTS_PATH = 'reference/decisions/AGENTS.md';
const DECISION_PATHS = [
  DECISION_AGENTS_PATH,
  'reference/decisions/index.md',
] as const;

export const CANONICAL_REPO_REFERENCE_PATHS = [
  ...TEMPLATE_TARGETS.map((target) => target.target),
  ...BACKLOG_PATHS,
  ...DECISION_PATHS,
] as const;

export const PJM_ADOPTION_SCHEMA_VERSION = 1;

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

    const template = await resolvePjmTemplate({
      name: target.template,
      assetsRoot: options.assetsRoot,
      templatesRoot: options.templatesRoot,
      home: options.home,
    });
    const status = await writeFileIfMissing(
      targetPath,
      stripTemplateFrontmatter(template.content),
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
  if (!existingDecisionPaths.has(DECISION_AGENTS_PATH)) {
    await initializeScopedDecisionAgentsGuidance(
      join(options.repoRoot, 'reference', 'decisions'),
    );
  }

  for (const relativePath of DECISION_PATHS) {
    if (existingDecisionPaths.has(relativePath)) {
      skipped.push(relativePath);
    } else {
      created.push(relativePath);
    }
  }

  for (const relativePath of CANONICAL_REPO_REFERENCE_PATHS) {
    if (!(await pathExists(join(options.repoRoot, relativePath)))) {
      throw new Error(
        `PJM scaffold verification failed: missing ${relativePath}.`,
      );
    }
  }

  const repoParent = dirname(options.repoRoot);
  const projectRoot =
    options.projectRoot ??
    (basename(repoParent) === '.oat' ? dirname(repoParent) : repoParent);
  const config = await readOatConfig(projectRoot);
  await writeOatConfig(projectRoot, {
    ...config,
    pjm: {
      initialized: true,
      schemaVersion: PJM_ADOPTION_SCHEMA_VERSION,
    },
  });

  return {
    repoRoot: options.repoRoot,
    created,
    skipped,
  };
}
