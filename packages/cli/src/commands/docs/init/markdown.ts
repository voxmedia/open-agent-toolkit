import {
  lstat,
  open,
  realpath,
  readdir,
  readFile,
  stat,
} from 'node:fs/promises';
import { basename, dirname, join, relative, resolve } from 'node:path';

import { createExclusionMatcher } from '@commands/docs/index-generate/generator';
import type { OatDocumentationConfig } from '@config/oat-config';
import { dirExists, ensureDir } from '@fs/io';
import { normalizeToPosixPath, validatePathWithinScope } from '@fs/paths';
import { parse as parseYaml } from 'yaml';

import {
  humanizeAppName,
  type DocsInitResolvedOptions,
} from './resolve-options';

/** Validate a dedicated Markdown root, including existing symlink ancestors. */
export async function validateMarkdownTarget(
  repoRoot: string,
  targetDir: string,
): Promise<string> {
  const target = validatePathWithinScope(
    resolve(repoRoot, targetDir),
    repoRoot,
  );
  const relativeTarget = relative(resolve(repoRoot), target);
  if (!relativeTarget)
    throw new Error(
      'Markdown docs require a dedicated directory; the repository root is unsafe.',
    );
  const canonicalRoot = await realpath(repoRoot);
  let ancestor = target;
  while (true) {
    try {
      await lstat(ancestor);
      break;
    } catch (error) {
      if (
        !(error instanceof Error && 'code' in error && error.code === 'ENOENT')
      )
        throw error;
      ancestor = dirname(ancestor);
    }
  }
  const canonicalAncestor = await realpath(ancestor);
  const canonicalTarget = resolve(
    canonicalAncestor,
    relative(ancestor, target),
  );
  validatePathWithinScope(canonicalTarget, canonicalRoot);
  if (canonicalTarget === canonicalRoot)
    throw new Error(
      'Markdown docs require a dedicated directory; target resolves to the repository root.',
    );
  if (
    ancestor === target &&
    !(await lstat(target)).isDirectory() &&
    !(await lstat(target)).isSymbolicLink()
  ) {
    throw new Error(`Markdown docs target must be a directory: ${target}`);
  }
  return normalizeToPosixPath(relativeTarget);
}

function renderMarkdownTemplate(
  template: string,
  options: DocsInitResolvedOptions,
  contents: string,
): string {
  const replacements: Record<string, string> = {
    "'{{TITLE_METADATA}}'": JSON.stringify(options.siteName),
    "'{{DESCRIPTION_METADATA}}'": JSON.stringify(options.siteDescription),
    '{{SITE_NAME}}': options.siteName,
    '{{REPO_NAME}}': basename(options.repoRoot),
    '{{CONTENTS}}': contents,
    '{{LINT_MODE}}': options.lint,
    '{{FORMAT_MODE}}': options.format,
  };
  return Object.entries(replacements).reduce(
    (content, [token, value]) => content.replaceAll(token, value),
    template,
  );
}

export interface MarkdownDocsOptions extends DocsInitResolvedOptions {
  assetsRoot: string;
  documentation?: OatDocumentationConfig;
}

export interface MarkdownDocsPlan {
  repoRoot: string;
  targetDir: string;
  appRoot: string;
  files: { name: string; content: string }[];
  preservedFiles: string[];
  auditAdvice: string[];
  documentationConfig: OatDocumentationConfig;
  configChanged: boolean;
}

export interface MarkdownDocsResult {
  appRoot: string;
  createdFiles: string[];
  incompleteFiles: string[];
  preservedFiles: string[];
  auditAdvice: string[];
  documentationConfig: OatDocumentationConfig;
}

export class MarkdownDocsWriteError extends Error {
  constructor(
    message: string,
    readonly result: MarkdownDocsResult,
    cause: unknown,
  ) {
    super(message, { cause });
  }
}

export function validateMarkdownConfig(
  repoRoot: string,
  targetDir: string,
  declared?: OatDocumentationConfig,
): void {
  if (
    (declared?.tooling &&
      declared.tooling.trim().toLowerCase() !== 'markdown') ||
    (declared?.root &&
      resolve(repoRoot, declared.root) !== resolve(repoRoot, targetDir)) ||
    (declared?.index &&
      resolve(repoRoot, declared.index) !==
        resolve(repoRoot, targetDir, 'index.md')) ||
    declared?.config
  ) {
    throw new Error(
      'Existing documentation config is incompatible with Markdown setup. Preserve it and choose adoption or framework replacement explicitly.',
    );
  }
}

function isMissing(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT';
}

async function readBaseline(
  repoRoot: string,
  path: string,
): Promise<string | null> {
  try {
    await lstat(path);
  } catch (error) {
    if (isMissing(error)) return null;
    throw error;
  }
  // Existing symlinks are preserved, but may not point outside the repository.
  validatePathWithinScope(await realpath(path), await realpath(repoRoot));
  if (!(await stat(path)).isFile())
    throw new Error(
      `Markdown baseline entrypoint must be a readable file: ${path}`,
    );
  return readFile(path, 'utf8');
}

function indexAdvice(content: string): string[] {
  const advice: string[] = [];
  try {
    const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(content);
    const metadata = frontmatter
      ? (parseYaml(frontmatter[1]!) as Record<string, unknown> | null)
      : null;
    if (
      !metadata ||
      typeof metadata.title !== 'string' ||
      !metadata.title.trim() ||
      typeof metadata.description !== 'string' ||
      !metadata.description.trim()
    ) {
      advice.push(
        'Existing index.md needs title/description metadata; it was preserved.',
      );
    }
  } catch {
    advice.push('Existing index.md has malformed metadata; it was preserved.');
  }
  const contents = /^## Contents\s*\r?\n([\s\S]*?)(?=^## |$(?![\s\S]))/m.exec(
    content,
  )?.[1];
  if (!contents || !/\[[^\]]+\]\([^)]+\.md(?:#[^)]*)?\)/.test(contents)) {
    advice.push(
      'Existing index.md needs a populated Contents map; it was preserved.',
    );
  }
  return advice;
}

function link(label: string, path: string): string {
  const safeLabel = label.replace(/[\r\n]/g, ' ').replace(/([[\]\\])/g, '\\$1');
  const href = path
    .split('/')
    .map((segment) =>
      encodeURIComponent(segment).replaceAll('(', '%28').replaceAll(')', '%29'),
    )
    .join('/');
  return `- [${safeLabel}](${href})`;
}

async function buildContents(
  appRoot: string,
  excludes: string[],
  advice: string[],
): Promise<string> {
  const matcher = createExclusionMatcher(excludes);
  const entries = (
    (await dirExists(appRoot))
      ? await readdir(appRoot, { withFileTypes: true })
      : []
  ).sort((a, b) => a.name.localeCompare(b.name, 'en'));
  const links: string[] = [];
  async function hasMarkdown(
    directory: string,
    prefix: string,
  ): Promise<boolean> {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = `${prefix}/${entry.name}`;
      if (
        entry.isFile() &&
        /\.md$/i.test(entry.name) &&
        !matcher.excludesFile(path)
      )
        return true;
      if (
        entry.isDirectory() &&
        !matcher.excludesDirectory(path) &&
        (await hasMarkdown(join(directory, entry.name), path))
      )
        return true;
    }
    return false;
  }
  for (const entry of entries) {
    if (
      entry.isFile() &&
      /\.md$/i.test(entry.name) &&
      !['index.md', 'contributing.md', 'AGENTS.md', 'CLAUDE.md'].includes(
        entry.name,
      ) &&
      !matcher.excludesFile(entry.name)
    ) {
      links.push(
        link(humanizeAppName(entry.name.replace(/\.md$/i, '')), entry.name),
      );
    } else if (entry.isDirectory() && !matcher.excludesDirectory(entry.name)) {
      const indexPath = `${entry.name}/index.md`;
      if (matcher.excludesFile(indexPath)) continue;
      const index = await readBaseline(appRoot, join(appRoot, indexPath));
      if (index !== null) {
        links.push(link(humanizeAppName(entry.name), indexPath));
      } else if (await hasMarkdown(join(appRoot, entry.name), entry.name)) {
        advice.push(
          `${entry.name}/ has Markdown but no authored index.md; run oat-docs-analyze for repair recommendations.`,
        );
      }
    }
  }
  if (!matcher.excludesFile('contributing.md'))
    links.push(link('Contributing', 'contributing.md'));
  return links.join('\n');
}

/** Read-only inspection used by both adoption and CLI dry-run. */
export async function planMarkdownDocs(
  options: MarkdownDocsOptions,
): Promise<MarkdownDocsPlan> {
  const targetDir = await validateMarkdownTarget(
    options.repoRoot,
    options.targetDir,
  );
  validateMarkdownConfig(options.repoRoot, targetDir, options.documentation);
  const appRoot = resolve(options.repoRoot, targetDir);
  if (
    !options.adopt &&
    (await dirExists(appRoot)) &&
    (await readdir(appRoot)).length > 0
  ) {
    throw new Error(
      `Markdown docs target is not empty: ${targetDir}. Use --adopt to preserve existing docs, then run oat-docs-analyze for content gaps.`,
    );
  }
  const documentationConfig = {
    ...options.documentation,
    root: targetDir,
    tooling: 'markdown',
    index: `${targetDir}/index.md`,
  };
  const configChanged =
    options.documentation?.root !== targetDir ||
    options.documentation?.tooling !== 'markdown' ||
    options.documentation?.index !== `${targetDir}/index.md`;
  const existing = new Map<string, string | null>();
  for (const name of ['index.md', 'contributing.md'])
    existing.set(
      name,
      await readBaseline(options.repoRoot, join(appRoot, name)),
    );
  const auditAdvice: string[] = [];
  const index = existing.get('index.md');
  if (index !== null && index !== undefined)
    auditAdvice.push(...indexAdvice(index));
  const contents =
    index == null
      ? await buildContents(
          appRoot,
          options.documentation?.excludes ?? [],
          auditAdvice,
        )
      : '';
  if (options.adopt)
    auditAdvice.push(
      'Adoption preserves existing content. Run oat-docs-analyze to audit context, metadata, navigation, and local instructions; use oat-docs-apply for approved repairs.',
    );
  const files: MarkdownDocsPlan['files'] = [];
  const preservedFiles: string[] = [];
  for (const [name, content] of existing) {
    if (content !== null) {
      preservedFiles.push(name);
      continue;
    }
    const template = await readFile(
      join(options.assetsRoot, 'templates', 'docs-markdown', name),
      'utf8',
    );
    files.push({
      name,
      content: renderMarkdownTemplate(template, options, contents),
    });
  }
  return {
    repoRoot: options.repoRoot,
    targetDir,
    appRoot,
    files,
    preservedFiles,
    auditAdvice,
    documentationConfig,
    configChanged,
  };
}

/** Adds missing baseline files exclusively; config is persisted by the caller. */
export async function applyMarkdownDocsPlan(
  plan: MarkdownDocsPlan,
): Promise<MarkdownDocsResult> {
  const result: MarkdownDocsResult = {
    appRoot: plan.appRoot,
    createdFiles: [],
    incompleteFiles: [],
    preservedFiles: [...plan.preservedFiles],
    auditAdvice: plan.auditAdvice,
    documentationConfig: plan.documentationConfig,
  };
  try {
    await validateMarkdownTarget(plan.repoRoot, plan.targetDir);
    if (plan.files.length) await ensureDir(plan.appRoot);
    for (const { name, content } of plan.files) {
      await validateMarkdownTarget(plan.repoRoot, plan.targetDir);
      try {
        const handle = await open(join(plan.appRoot, name), 'wx');
        result.createdFiles.push(name);
        try {
          await handle.writeFile(content, 'utf8');
        } catch (error) {
          result.incompleteFiles.push(name);
          throw error;
        } finally {
          await handle.close();
        }
      } catch (error) {
        if (
          error instanceof Error &&
          'code' in error &&
          error.code === 'EEXIST' &&
          (await readBaseline(plan.repoRoot, join(plan.appRoot, name))) !== null
        ) {
          result.preservedFiles.push(name);
        } else throw error;
      }
    }
    if (
      (await readBaseline(plan.repoRoot, join(plan.appRoot, 'index.md'))) ===
      null
    )
      throw new Error(
        'Authored Markdown index is unavailable; configuration was not persisted.',
      );
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new MarkdownDocsWriteError(message, result, error);
  }
}
