import { access, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { stripTemplateFrontmatter } from '@commands/shared/strip-template-frontmatter';
import YAML from 'yaml';

import {
  assertDecisionIndexScaffold,
  regenerateDecisionIndex,
} from './regenerate-index';
import { generateDecisionId } from './shared/generate-id';

export interface CreateDecisionRecordOptions {
  decisionsRoot: string;
  assetsRoot: string;
  templatesRoot?: string;
  title: string;
  status?: string;
  context?: string;
  createdAt?: string;
}

export interface CreateDecisionRecordResult {
  id: string;
  decisionsRoot: string;
  filePath: string;
}

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

async function resolveDecisionTemplate(
  assetsRoot: string,
  templatesRoot?: string,
): Promise<string> {
  if (templatesRoot) {
    const localTemplate = await readIfExists(
      join(templatesRoot, 'decision.md'),
    );
    if (localTemplate !== null) {
      return localTemplate;
    }
  }

  const bundledTemplate = await readIfExists(
    join(assetsRoot, 'templates', 'decision.md'),
  );
  if (bundledTemplate !== null) {
    return bundledTemplate;
  }

  throw new Error(
    'Template decision.md was not found in repo-local templates or bundled assets.',
  );
}

function normalizeCreatedAt(createdAt: string): {
  timestamp: string;
  date: string;
} {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid decision creation timestamp: ${createdAt}`);
  }

  const timestamp = date.toISOString();
  return {
    timestamp,
    date: timestamp.slice(0, 10),
  };
}

function replaceTemplatePlaceholders(
  content: string,
  replacements: Record<string, string>,
): string {
  return content.replace(
    /\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g,
    (match, key) => replacements[key] ?? match,
  );
}

function renderDecisionRecord(
  template: string,
  options: {
    id: string;
    title: string;
    date: string;
    status: string;
    context: string;
  },
): string {
  const bodyTemplate = stripTemplateFrontmatter(template).replace(
    /^\r?\n+/,
    '',
  );
  const body = replaceTemplatePlaceholders(bodyTemplate, {
    id: options.id,
    title: options.title,
    date: options.date,
    status: options.status,
    context: options.context,
    decision: 'TODO',
    consequences: 'TODO',
  });
  const frontmatter = YAML.stringify({
    id: options.id,
    title: options.title,
    date: options.date,
    status: options.status,
    legacy_id: null,
  }).trimEnd();

  return `---\n${frontmatter}\n---\n\n${body.trimEnd()}\n`;
}

export async function createDecisionRecord(
  options: CreateDecisionRecordOptions,
): Promise<CreateDecisionRecordResult> {
  const createdAt = normalizeCreatedAt(
    options.createdAt ?? new Date().toISOString(),
  );
  const status = options.status ?? 'proposed';
  const id = generateDecisionId(options.title, createdAt.timestamp);
  const filePath = join(options.decisionsRoot, `${id}.md`);

  if (await pathExists(filePath)) {
    throw new Error(
      `Decision record ${id} already exists. Use a more specific title to disambiguate.`,
    );
  }

  const template = await resolveDecisionTemplate(
    options.assetsRoot,
    options.templatesRoot,
  );
  const content = renderDecisionRecord(template, {
    id,
    title: options.title,
    date: createdAt.date,
    status,
    context: options.context ?? 'TODO',
  });

  await assertDecisionIndexScaffold(options.decisionsRoot);
  await mkdir(dirname(filePath), { recursive: true });
  let wroteRecord = false;
  try {
    await writeFile(filePath, content, { encoding: 'utf8', flag: 'wx' });
    wroteRecord = true;
    await regenerateDecisionIndex(options.decisionsRoot);
  } catch (error) {
    if (wroteRecord) {
      await rm(filePath, { force: true });
    }

    throw error;
  }

  return {
    id,
    decisionsRoot: options.decisionsRoot,
    filePath,
  };
}
