import { readFile, readdir, realpath, stat } from 'node:fs/promises';
import { dirname, join, relative, resolve, isAbsolute } from 'node:path';

import {
  createExclusionMatcher,
  isExcludedPath,
  type ExclusionMatcher,
} from '@commands/docs/shared/exclusions';
import {
  readOatConfig,
  resolveDocumentationContentRoot,
  type OatDocumentationConfig,
} from '@config/oat-config';
import { resolveProjectRoot } from '@fs/paths';

import { parsePage, type ParsedPage } from './markdown';

export function posix(path: string): string {
  return path.replaceAll('\\', '/');
}
export function inside(root: string, path: string): boolean {
  const rel = relative(root, path);
  return (
    rel !== '..' &&
    !rel.startsWith('../') &&
    !rel.startsWith('..\\') &&
    !isAbsolute(rel)
  );
}
export async function present(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch (error) {
    if (
      ['ENOENT', 'ENOTDIR'].includes(
        (error as NodeJS.ErrnoException).code ?? '',
      )
    )
      return false;
    throw error;
  }
}
export interface CheckTarget {
  repoRoot: string;
  appRoot: string;
  contentRoot: string;
  framework: 'markdown' | 'fumadocs' | 'mkdocs';
  documentation: OatDocumentationConfig;
  matcher: ExclusionMatcher;
}
export async function resolveCheckTarget(
  cwd: string,
  targetDir?: string,
): Promise<CheckTarget> {
  let repoRoot: string;
  try {
    repoRoot = await resolveProjectRoot(cwd);
  } catch {
    repoRoot = cwd;
  }
  repoRoot = await realpath(repoRoot);
  const config = await readOatConfig(repoRoot);
  const doc = config.documentation ?? {};
  const configured = doc.root ? resolve(repoRoot, doc.root) : undefined;
  const requested = resolve(
    cwd,
    targetDir ?? configured ?? join(repoRoot, 'docs'),
  );
  const appRoot = (await present(requested))
    ? await realpath(requested)
    : requested;
  const matching = configured === appRoot;
  const framework =
    matching && doc.tooling === 'markdown'
      ? 'markdown'
      : (await present(join(appRoot, 'mkdocs.yml')))
        ? 'mkdocs'
        : (
              await Promise.all(
                ['ts', 'mts', 'js', 'mjs'].map((ext) =>
                  present(join(appRoot, `source.config.${ext}`)),
                ),
              )
            ).some(Boolean)
          ? 'fumadocs'
          : matching && (doc.tooling === 'mkdocs' || doc.tooling === 'fumadocs')
            ? doc.tooling
            : 'markdown';
  // The established resolver owns configured nested docs semantics. An
  // unrelated explicit Markdown root remains literal, even with a docs child.
  const configuredContent = await resolveDocumentationContentRoot(
    repoRoot,
    config,
  );
  const contentRoot =
    matching && configuredContent
      ? resolve(repoRoot, configuredContent)
      : framework === 'markdown'
        ? appRoot
        : join(appRoot, 'docs');
  if (!(await present(contentRoot)))
    throw new Error(
      `Docs content directory does not exist: ${contentRoot}. Set documentation.root or pass --target-dir.`,
    );
  const matchesContent =
    configuredContent !== null &&
    resolve(repoRoot, configuredContent) === appRoot;
  const documentation = matching || matchesContent ? doc : {};
  return {
    repoRoot,
    appRoot,
    contentRoot: await realpath(contentRoot),
    framework,
    documentation,
    matcher: createExclusionMatcher(documentation.nonReaderPaths ?? []),
  };
}
export async function readerFiles(target: CheckTarget): Promise<string[]> {
  const files: string[] = [];
  const walk = async (dir: string): Promise<void> => {
    const entries = await readdir(join(target.contentRoot, dir), {
      withFileTypes: true,
    });
    for (const e of entries.sort((a, b) =>
      a.name < b.name ? -1 : a.name > b.name ? 1 : 0,
    )) {
      const path = posix(join(dir, e.name));
      if (e.isDirectory() && !isExcludedPath(target.matcher, path, true))
        await walk(path);
      else if (
        e.isFile() &&
        /\.mdx?$/.test(e.name) &&
        !isExcludedPath(target.matcher, path)
      )
        files.push(path);
    }
  };
  await walk('');
  return files;
}
export async function readPage(
  target: CheckTarget,
  path: string,
): Promise<ParsedPage> {
  return parsePage(
    path,
    await readFile(join(target.contentRoot, path), 'utf8'),
  );
}
/** Never follow a link outside its allowed root, including symlink escapes. */
export async function containedFile(
  root: string,
  path: string,
): Promise<boolean> {
  if (!inside(root, path) || !(await present(path))) return false;
  return (
    inside(await realpath(root), await realpath(path)) &&
    (await stat(path)).isFile()
  );
}
export function readerDirectories(paths: string[]): string[] {
  const dirs = new Set<string>(['.']);
  for (const path of paths) {
    let dir = dirname(path);
    while (dir !== '.') {
      dirs.add(posix(dir));
      dir = dirname(dir);
    }
  }
  return [...dirs].sort();
}
