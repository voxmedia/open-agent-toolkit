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
// Preserve the lexical missing-path diagnostic, but compare existing aliases by identity.
async function canonicalPath(path: string): Promise<string> {
  return (await present(path)) ? realpath(path) : path;
}
export interface CheckTarget {
  repoRoot: string;
  appRoot: string;
  contentRoot: string;
  framework: 'markdown' | 'fumadocs' | 'mkdocs';
  documentation: OatDocumentationConfig;
  matcher: ExclusionMatcher;
  /** Human notices about how an explicit target was interpreted. */
  notices: string[];
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
  const configured = doc.root
    ? await canonicalPath(resolve(repoRoot, doc.root))
    : undefined;
  const requested = resolve(
    cwd,
    targetDir ?? configured ?? join(repoRoot, 'docs'),
  );
  const appRoot = await canonicalPath(requested);
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
  const configuredContentPath = configuredContent
    ? await canonicalPath(resolve(repoRoot, configuredContent))
    : undefined;
  const contentRoot =
    matching && configuredContentPath
      ? configuredContentPath
      : framework === 'markdown'
        ? appRoot
        : join(appRoot, 'docs');
  if (!(await present(contentRoot)))
    throw new Error(
      `Docs content directory does not exist: ${contentRoot}. Set documentation.root or pass --target-dir.`,
    );
  const matchesContent =
    configuredContentPath !== undefined && configuredContentPath === appRoot;
  const documentation = matching || matchesContent ? doc : {};
  const notices: string[] = [];
  if (targetDir !== undefined && configured && doc.root && !matching) {
    const configuredTooling =
      doc.tooling === 'fumadocs' || doc.tooling === 'mkdocs'
        ? doc.tooling
        : undefined;
    if (matchesContent && configuredTooling && framework === 'markdown')
      notices.push(
        `Notice: --target-dir ${targetDir} is the content directory of the configured ${configuredTooling} app ${doc.root}; it is checked as Markdown, so navigation is skipped. Pass --target-dir ${doc.root} to include navigation.`,
      );
    else if (!matchesContent)
      notices.push(
        `Notice: --target-dir ${targetDir} is not the configured documentation.root (${doc.root}); checking it as ${framework === 'markdown' ? 'a literal Markdown root' : `a ${framework} app`} without the configured documentation policy. Omit --target-dir to check ${doc.root}.`,
      );
  }
  return {
    repoRoot,
    appRoot,
    contentRoot: await realpath(contentRoot),
    framework,
    documentation,
    matcher: createExclusionMatcher(documentation.nonReaderPaths ?? []),
    notices,
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
      // Installed dependencies and hidden tool state (.git, .oat, .next, ...)
      // are never reader content, even under a broad explicit target.
      if (
        e.isDirectory() &&
        (e.name === 'node_modules' || e.name.startsWith('.'))
      )
        continue;
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
