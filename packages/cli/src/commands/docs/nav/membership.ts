import { readFile, stat } from 'node:fs/promises';
import { extname, join, posix } from 'node:path';

import YAML from 'yaml';

import { buildDocsNavTree } from './contents';
import {
  FUMADOCS_LINK,
  FUMADOCS_REST_ITEMS,
  FUMADOCS_SEPARATOR,
  pageUrl,
  type FumadocsMetaFile,
} from './fumadocs';

/**
 * One way a hand-authored (or undeclared) sidebar disagrees with the authored
 * Contents maps. The comparison checks membership and relative order only:
 * separators, labels, link items, rest entries and pages borrowed from another
 * folder are the author's presentation and are never compared with generator
 * output.
 */
export interface NavMembershipIssue {
  /** Content-relative path of the meta.json, or `mkdocs.yml`. */
  path: string;
  kind: 'missing' | 'dangling' | 'order' | 'malformed' | 'unreadable';
  message: string;
  line?: number;
}

const PAGE_EXTENSIONS = ['.md', '.mdx'];
const URL_SCHEME = /^[a-z][a-z0-9+.-]*:/i;

function lineOf(source: string, needle: string): number | undefined {
  const index = source.indexOf(needle);
  return index < 0 ? undefined : source.slice(0, index).split('\n').length;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function entryType(
  docsRoot: string,
  path: string,
): Promise<'file' | 'dir' | null> {
  if (path === '' || path === '..' || path.startsWith('../')) return null;
  try {
    const info = await stat(join(docsRoot, path));
    return info.isDirectory() ? 'dir' : info.isFile() ? 'file' : null;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code ?? '';
    if (code === 'ENOENT' || code === 'ENOTDIR') return null;
    throw error;
  }
}

interface Target {
  /** Loader identity: an extensionless reference selects a folder first. */
  id: string;
  exists: boolean;
  folder: boolean;
  url: string;
}

function createTargetResolver(docsRoot: string) {
  const cache = new Map<string, Promise<Target>>();
  const resolveTarget = async (key: string): Promise<Target> => {
    const extension = extname(key);
    if (PAGE_EXTENSIONS.includes(extension)) {
      const flat = key.slice(0, -extension.length);
      return {
        id: `page:${flat}`,
        exists: (await entryType(docsRoot, key)) === 'file',
        folder: false,
        url: pageUrl(key),
      };
    }
    if ((await entryType(docsRoot, key)) === 'dir')
      return {
        id: `folder:${key}`,
        exists: true,
        folder: true,
        url: pageUrl(posix.join(key, 'index.md')),
      };
    let exists = false;
    for (const candidate of PAGE_EXTENSIONS)
      if ((await entryType(docsRoot, `${key}${candidate}`)) === 'file')
        exists = true;
    return {
      id: `page:${key}`,
      exists,
      folder: false,
      url: pageUrl(`${key}.md`),
    };
  };
  return (key: string): Promise<Target> => {
    let found = cache.get(key);
    if (!found) {
      found = resolveTarget(key);
      cache.set(key, found);
    }
    return found;
  };
}

type PagesItem =
  | { kind: 'presentation' }
  | { kind: 'rest' }
  | { kind: 'exclude'; key: string }
  | { kind: 'link'; url: string | null }
  | { kind: 'path'; key: string };

/** Read one `pages` item with the fumadocs-core page-tree grammar. */
function classify(dir: string, item: string): PagesItem {
  if (FUMADOCS_REST_ITEMS.has(item)) return { kind: 'rest' };
  if (FUMADOCS_SEPARATOR.test(item)) return { kind: 'presentation' };
  const link = FUMADOCS_LINK.exec(item);
  if (link) {
    const url = link.groups?.url ?? '';
    if (link.groups?.external || URL_SCHEME.test(url) || !url.startsWith('/'))
      return { kind: 'link', url: null };
    const path = url.replace(/[?#].*$/, '').replace(/(.)\/+$/, '$1');
    return { kind: 'link', url: path || '/' };
  }
  if (item.startsWith('!'))
    return { kind: 'exclude', key: posix.join(dir, item.slice(1)) };
  if (item.startsWith('...'))
    return { kind: 'path', key: posix.join(dir, item.slice(3)) };
  return { kind: 'path', key: posix.join(dir, item) };
}

interface ActualMeta {
  file: FumadocsMetaFile;
  dir: string;
  source: string;
  items: Array<{ raw: string; item: PagesItem }>;
}

/**
 * Compare present Fumadocs `meta.json` files with the Contents-derived
 * expectation in `metaFiles` (from a `check` run of nav sync).
 *
 * A Contents entry is reachable when its folder's `pages` lists it, a rest
 * entry shows it, any other `pages` entry borrows it, or a root-relative link
 * item points at its URL. An absent meta.json or one without `pages` uses the
 * loader's folder order and is skipped.
 */
export async function compareFumadocsMembership(
  docsRoot: string,
  metaFiles: readonly FumadocsMetaFile[],
): Promise<NavMembershipIssue[]> {
  const issues: NavMembershipIssue[] = [];
  const actuals: ActualMeta[] = [];
  for (const file of metaFiles) {
    let source: string;
    let parsed: unknown;
    try {
      source = await readFile(join(docsRoot, file.path), 'utf8');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') continue;
      source = '';
    }
    try {
      parsed = JSON.parse(source);
    } catch {
      issues.push({
        path: file.path,
        kind: 'unreadable',
        message:
          'Cannot read or parse meta.json; check file permissions and JSON syntax.',
      });
      continue;
    }
    if (isPlainObject(parsed) && !Object.hasOwn(parsed, 'pages')) continue;
    const pages = isPlainObject(parsed) ? parsed.pages : undefined;
    if (
      !Array.isArray(pages) ||
      pages.some((item) => typeof item !== 'string')
    ) {
      issues.push({
        path: file.path,
        kind: 'malformed',
        message:
          'meta.json "pages" must be an array of strings; fix it or remove "pages" to use folder order.',
        line: lineOf(source, '"pages"'),
      });
      continue;
    }
    const dir = posix.dirname(file.path);
    actuals.push({
      file,
      dir,
      source,
      items: (pages as string[]).map((raw) => ({
        raw,
        item: classify(dir, raw),
      })),
    });
  }

  const resolveTarget = createTargetResolver(docsRoot);
  const reachedIds = new Set<string>();
  const reachedUrls = new Set<string>();
  for (const actual of actuals) {
    for (const { raw, item } of actual.items) {
      if (item.kind === 'link' && item.url) reachedUrls.add(item.url);
      if (item.kind !== 'path') continue;
      const target = await resolveTarget(item.key);
      reachedIds.add(target.id);
      if (!target.exists)
        issues.push({
          path: actual.file.path,
          kind: 'dangling',
          message: `Missing target: pages entry "${raw}" names no page or folder; remove it or restore the page.`,
          line: lineOf(actual.source, JSON.stringify(raw)),
        });
    }
  }

  for (const actual of actuals) {
    const expected: Array<{ name: string; target: Target }> = [];
    for (const raw of actual.file.meta.pages) {
      const item = classify(actual.dir, raw);
      if (item.kind === 'path')
        expected.push({
          name: posix.relative(actual.dir, item.key) || item.key,
          target: await resolveTarget(item.key),
        });
    }
    const listed: string[] = [];
    const excluded = new Set<string>();
    let rest = false;
    for (const { item } of actual.items) {
      if (item.kind === 'rest') rest = true;
      else if (item.kind === 'exclude')
        excluded.add((await resolveTarget(item.key)).id);
      else if (item.kind === 'path')
        listed.push((await resolveTarget(item.key)).id);
    }
    const pagesLine = lineOf(actual.source, '"pages"');
    // A nested folder's landing page is implicit (never in generated pages),
    // so only an explicit exclusion can hide it.
    const landing = await resolveTarget(posix.join(actual.dir, 'index'));
    if (
      actual.dir !== '.' &&
      excluded.has(landing.id) &&
      !expected.some((entry) => entry.target.id === landing.id)
    )
      expected.unshift({ name: 'index', target: landing });
    for (const { name, target } of expected) {
      if (
        (listed.includes(target.id) && !excluded.has(target.id)) ||
        (rest && !excluded.has(target.id)) ||
        reachedIds.has(target.id) ||
        reachedUrls.has(target.url)
      )
        continue;
      issues.push({
        path: actual.file.path,
        kind: 'missing',
        message: `Missing reader ${target.folder ? 'folder' : 'page'}: "${name}" is listed in index.md Contents but no meta.json pages entry reaches it; add it to pages or remove it from Contents.`,
        line: pagesLine,
      });
    }
    const positions: number[] = [];
    for (const id of listed) {
      const position = expected.findIndex((entry) => entry.target.id === id);
      if (position >= 0 && !positions.includes(position))
        positions.push(position);
    }
    if (positions.some((position, index) => position < positions[index - 1]!))
      issues.push({
        path: actual.file.path,
        kind: 'order',
        message: `Order differs from authored Contents: expected ${[
          ...positions,
        ]
          .sort((a, b) => a - b)
          .map((position) => expected[position]!.name)
          .join(', ')}; found ${positions
          .map((position) => expected[position]!.name)
          .join(
            ', ',
          )}. Reorder pages or Contents (separators, labels and links are not compared).`,
        line: pagesLine,
      });
  }
  return issues;
}

function flattenNav(tree: unknown, out: string[] = []): string[] {
  if (!Array.isArray(tree)) return out;
  for (const item of tree) {
    if (typeof item === 'string') out.push(item);
    else if (isPlainObject(item))
      for (const value of Object.values(item)) {
        if (typeof value === 'string') out.push(value);
        else flattenNav(value, out);
      }
  }
  return out;
}

/**
 * Compare a hand-authored MkDocs `nav:` with the Contents maps: every
 * Contents page appears, every local nav page exists, and the entries of
 * each Contents map (pages and section landing pages) keep their order. Section labels, nesting and external
 * links are the author's. Returns no issues when `nav` is absent.
 */
export async function compareMkDocsMembership(options: {
  appRoot: string;
  docsRoot: string;
  nonReaderPaths?: readonly string[];
}): Promise<NavMembershipIssue[]> {
  const source = await readFile(join(options.appRoot, 'mkdocs.yml'), 'utf8');
  const config = YAML.parse(source) as { nav?: unknown } | null;
  if (!isPlainObject(config) || !Object.hasOwn(config, 'nav')) return [];
  const navLine = lineOf(source, 'nav:');
  if (!Array.isArray(config.nav))
    return [
      {
        path: 'mkdocs.yml',
        kind: 'malformed',
        message:
          'mkdocs.yml nav must be a list; fix it or remove nav to use the default page order.',
        line: navLine,
      },
    ];
  const expected = flattenNav(
    await buildDocsNavTree({
      docsRoot: options.docsRoot,
      nonReaderPaths: options.nonReaderPaths,
    }),
  );
  const actual: string[] = [];
  for (const entry of flattenNav(config.nav)) {
    if (
      URL_SCHEME.test(entry) ||
      entry.startsWith('/') ||
      entry.startsWith('#')
    )
      continue;
    const path = posix.normalize(entry);
    if (!actual.includes(path)) actual.push(path);
  }
  const issues: NavMembershipIssue[] = [];
  for (const path of expected)
    if (!actual.includes(path))
      issues.push({
        path: 'mkdocs.yml',
        kind: 'missing',
        message: `Missing reader page: "${path}" is listed in index.md Contents but not in mkdocs.yml nav; add it to nav or remove it from Contents.`,
        line: navLine,
      });
  for (const path of actual)
    if ((await entryType(options.docsRoot, path)) !== 'file')
      issues.push({
        path: 'mkdocs.yml',
        kind: 'dangling',
        message: `Missing target: nav entry "${path}" names no page; remove it or restore the page.`,
        line: lineOf(source, path) ?? navLine,
      });
  // A section landing page belongs to its parent's Contents map, so whole
  // sections keep the parent order; other pages group by their directory.
  const owner = (path: string): string =>
    /^index\.mdx?$/.test(posix.basename(path)) && posix.dirname(path) !== '.'
      ? posix.dirname(posix.dirname(path))
      : posix.dirname(path);
  const directories = [...new Set(expected.map(owner))];
  for (const directory of directories) {
    const want = expected.filter(
      (path) => owner(path) === directory && actual.includes(path),
    );
    const found = actual.filter((path) => want.includes(path));
    if (want.join('\n') !== found.join('\n'))
      issues.push({
        path: 'mkdocs.yml',
        kind: 'order',
        message: `Order differs from authored Contents in ${directory === '.' ? 'the docs root' : `${directory}/`}: expected ${want.join(', ')}; found ${found.join(', ')}. Reorder nav or Contents (section labels and links are not compared).`,
        line: navLine,
      });
  }
  return issues;
}
