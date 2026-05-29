import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { initializeBacklog } from '@commands/backlog/init';

export interface InitializeRepoReferenceOptions {
  referenceRoot: string;
  assetsRoot: string;
  templatesRoot?: string;
}

export interface RepoReferenceInitResult {
  referenceRoot: string;
  created: string[];
  skipped: string[];
}

const REFERENCE_TEMPLATES = [
  'current-state.md',
  'roadmap.md',
  'decision-record.md',
] as const;

const BACKLOG_PATHS = [
  'backlog/index.md',
  'backlog/completed.md',
  'backlog/items/.gitkeep',
  'backlog/archived/.gitkeep',
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
  name: (typeof REFERENCE_TEMPLATES)[number],
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

function stripTemplateFrontmatter(content: string): string {
  if (!content.startsWith('---\n')) {
    return content;
  }

  const end = content.indexOf('\n---', 4);
  if (end === -1) {
    return content;
  }

  const frontmatter = content.slice(4, end);
  if (
    !/\boat_template\s*:/i.test(frontmatter) &&
    !/\boat_template_name\s*:/i.test(frontmatter)
  ) {
    return content;
  }

  const afterFrontmatter = content.slice(end + '\n---'.length);
  return afterFrontmatter.replace(/^\r?\n/, '');
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

  for (const templateName of REFERENCE_TEMPLATES) {
    const targetPath = join(options.referenceRoot, templateName);
    if (await pathExists(targetPath)) {
      skipped.push(templateName);
      continue;
    }

    const template = await resolveTemplateContent(templateName, options);
    const status = await writeFileIfMissing(
      targetPath,
      stripTemplateFrontmatter(template),
    );
    if (status === 'created') {
      created.push(templateName);
    } else {
      skipped.push(templateName);
    }
  }

  const existingBacklogPaths = new Set<string>();
  for (const relativePath of BACKLOG_PATHS) {
    if (await pathExists(join(options.referenceRoot, relativePath))) {
      existingBacklogPaths.add(relativePath);
    }
  }

  await initializeBacklog(join(options.referenceRoot, 'backlog'));

  for (const relativePath of BACKLOG_PATHS) {
    if (existingBacklogPaths.has(relativePath)) {
      skipped.push(relativePath);
    } else {
      created.push(relativePath);
    }
  }

  return {
    referenceRoot: options.referenceRoot,
    created,
    skipped,
  };
}
