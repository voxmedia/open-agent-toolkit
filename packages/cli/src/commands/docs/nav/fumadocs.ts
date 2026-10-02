import { lstat, readdir, readFile } from 'node:fs/promises';
import {
  basename,
  dirname,
  extname,
  isAbsolute,
  join,
  relative,
  resolve,
  sep,
} from 'node:path';

import YAML from 'yaml';

import { parseIndexContents, withoutFencedExamples } from './contents';
import { applyOwnedMetadata } from './ownership';

export interface FumadocsNavigationOptions {
  appRoot: string;
  check?: boolean;
  validateOnly?: boolean;
}

function containedPath(root: string, directory: string, href: string): string {
  const target = resolve(directory, href);
  const path = relative(root, target);
  if (
    isAbsolute(href) ||
    path === '..' ||
    path.startsWith(`..${sep}`) ||
    isAbsolute(path)
  ) {
    throw new Error(`Contents link "${href}" escapes the docs directory`);
  }
  return target;
}

function titleOf(markdown: string, path: string): string {
  const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(markdown);
  const data: unknown = frontmatter ? YAML.parse(frontmatter[1]!) : undefined;
  if (
    !data ||
    typeof data !== 'object' ||
    !('title' in data) ||
    typeof data.title !== 'string' ||
    !data.title.trim()
  ) {
    throw new Error(`Missing non-empty frontmatter title in ${path}`);
  }
  return data.title;
}

function anchorsOf(markdown: string): Set<string> {
  const anchors = new Set<string>();
  for (const match of withoutFencedExamples(markdown).matchAll(
    /^ {0,3}#{1,6}\s+(.+?)\s*#*\s*$/gm,
  )) {
    const base = match[1]!
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\p{M}\-_ ]/gu, '')
      .replaceAll(' ', '-');
    let anchor = base;
    let duplicate = 0;
    while (anchors.has(anchor)) anchor = `${base}-${++duplicate}`;
    anchors.add(anchor);
  }
  return anchors;
}

export async function syncFumadocsNavigation(
  options: FumadocsNavigationOptions,
): Promise<{ docsRoot: string; metadata: string[] }> {
  if (options.check && options.validateOnly)
    throw new Error('--check and --validate-only are mutually exclusive');
  const appRoot = resolve(options.appRoot);
  const docsRoot = join(appRoot, 'docs');
  const pages = new Map<string, { markdown: string; title: string }>();
  const directories: string[] = [];
  async function scan(directory: string): Promise<void> {
    if ((await lstat(directory)).isSymbolicLink())
      throw new Error(`Symlink docs directory is unsupported: ${directory}`);
    const entries = await readdir(directory, { withFileTypes: true });
    const hasPages = entries.some(
      (entry) => entry.isDirectory() || /\.mdx?$/.test(entry.name),
    );
    if (hasPages) directories.push(directory);
    for (const entry of entries.sort((left, right) =>
      left.name.localeCompare(right.name),
    )) {
      const path = join(directory, entry.name);
      if (entry.isSymbolicLink() && entry.name !== 'meta.json')
        throw new Error(`Symlink docs source is unsupported: ${path}`);
      if (entry.isDirectory()) await scan(path);
      else if (/\.mdx?$/.test(entry.name)) {
        if (extname(path) !== '.md')
          throw new Error(
            `Unsupported MDX navigation source ${path}; use ordinary Markdown file-derived routes`,
          );
        const markdown = await readFile(path, 'utf8');
        pages.set(path, { markdown, title: titleOf(markdown, path) });
      }
    }
  }
  await scan(docsRoot);
  const ownership = new Map<string, number>();
  const output = new Map<string, string>();
  for (const directory of directories) {
    const indexPath = join(directory, 'index.md');
    const index = pages.get(indexPath);
    if (!index) throw new Error(`Missing required index.md at ${indexPath}`);
    const identifiers = directory === docsRoot ? ['index'] : [];
    let selfEntries = 0;
    for (const entry of parseIndexContents(index.markdown, indexPath)) {
      if (
        /^[a-z][a-z\d+.-]*:/i.test(entry.href) ||
        entry.href.startsWith('//') ||
        entry.href.includes('?') ||
        entry.href.includes('\\')
      ) {
        throw new Error(
          `Unsupported Contents link "${entry.href}" in ${indexPath}; use relative Markdown links without queries`,
        );
      }
      const [href = '', encodedFragment, ...extra] = entry.href.split('#');
      if (extra.length || /[[\]\n]/.test(entry.title))
        throw new Error(
          `Unsupported Contents syntax in ${indexPath}: ${entry.href}`,
        );
      let target = containedPath(docsRoot, directory, href || 'index.md');
      if (!extname(target)) target = join(target, 'index.md');
      const page = pages.get(target);
      if (!page)
        throw new Error(
          `Contents link "${entry.href}" in ${indexPath} does not resolve to a Markdown file`,
        );
      if (
        encodedFragment !== undefined &&
        !anchorsOf(page.markdown).has(decodeURIComponent(encodedFragment))
      ) {
        throw new Error(`Missing fragment "${encodedFragment}" in ${target}`);
      }
      const self = target === indexPath && encodedFragment === undefined;
      const leaf =
        dirname(target) === directory &&
        basename(target) !== 'index.md' &&
        encodedFragment === undefined;
      const child =
        basename(target) === 'index.md' &&
        dirname(dirname(target)) === directory &&
        encodedFragment === undefined;
      if (self || leaf || child) {
        if (entry.title !== page.title)
          throw new Error(
            `Contents label "${entry.title}" does not match frontmatter title "${page.title}" in ${target}`,
          );
        if (self) {
          if (++selfEntries > 1)
            throw new Error(`Duplicate landing entry in ${indexPath}`);
          continue;
        }
        ownership.set(target, (ownership.get(target) ?? 0) + 1);
        identifiers.push(
          child ? basename(dirname(target)) : basename(target, '.md'),
        );
      }
    }
    output.set(
      relative(docsRoot, join(directory, 'meta.json')).replaceAll(sep, '/'),
      `${JSON.stringify({ title: index.title, pages: identifiers }, null, 2)}\n`,
    );
  }
  for (const path of pages.keys()) {
    if (path === join(docsRoot, 'index.md')) continue;
    const count = ownership.get(path) ?? 0;
    if (count !== 1)
      throw new Error(
        `${count ? 'Duplicate' : 'Missing physical-parent'} ownership for ${path}; add exactly one local Contents entry`,
      );
  }
  if (!options.validateOnly)
    await applyOwnedMetadata(appRoot, docsRoot, output, options.check ?? false);
  return { docsRoot, metadata: [...output.keys()] };
}
