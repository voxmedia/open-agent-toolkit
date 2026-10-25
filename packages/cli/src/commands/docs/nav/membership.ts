import { readdir, readFile, stat } from 'node:fs/promises';
import { extname, join, posix } from 'node:path';

import YAML from 'yaml';

import { buildDocsNavTree } from './contents';
import {
  FUMADOCS_LINK,
  FUMADOCS_REST_ITEMS,
  FUMADOCS_SEPARATOR,
  hasImplicitIndex,
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
  /** Author-owned `pagesIndex`, when it is a string. */
  pagesIndex?: string;
  /** The parsed metadata, for the loader's index rules (`root`, `pagesIndex`). */
  metadata: Record<string, unknown>;
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
    const pagesIndex = (parsed as Record<string, unknown>).pagesIndex;
    actuals.push({
      file,
      dir,
      source,
      metadata: parsed as Record<string, unknown>,
      ...(typeof pagesIndex === 'string' && pagesIndex.trim()
        ? { pagesIndex: pagesIndex.trim() }
        : {}),
      items: (pages as string[]).map((raw) => ({
        raw,
        item: classify(dir, raw),
      })),
    });
  }

  const resolveTarget = createTargetResolver(docsRoot);
  for (const actual of actuals)
    for (const { raw, item } of actual.items) {
      if (item.kind !== 'path') continue;
      if (!(await resolveTarget(item.key)).exists)
        issues.push({
          path: actual.file.path,
          kind: 'dangling',
          message: `Missing target: pages entry "${raw}" names no page or folder; remove it or restore the page.`,
          line: lineOf(actual.source, JSON.stringify(raw)),
        });
    }

  // Walk the sidebar the way fumadocs-core 16.10.2 `buildFolder` does, from
  // the docs root through attached folders only: a meta.json in a folder the
  // tree never attaches contributes nothing, and a URL link to a folder's
  // landing page reaches that page but does not attach the folder.
  const reachedIds = new Set<string>();
  const reachedUrls = new Set<string>();
  const byDir = new Map(actuals.map((actual) => [actual.dir, actual]));
  const visited = new Set<string>();
  const stripPage = (key: string): string => key.replace(/\.mdx?$/, '');
  const pagesMetaFor = async (dir: string) => {
    const known = byDir.get(dir);
    if (known) return known;
    let parsed: unknown;
    try {
      parsed = JSON.parse(
        await readFile(join(docsRoot, dir, 'meta.json'), 'utf8'),
      );
    } catch {
      return undefined;
    }
    const pages = isPlainObject(parsed) ? parsed.pages : undefined;
    if (!Array.isArray(pages) || pages.some((p) => typeof p !== 'string'))
      return undefined;
    const pagesIndex = (parsed as Record<string, unknown>).pagesIndex;
    return {
      metadata: parsed as Record<string, unknown>,
      items: (pages as string[]).map((raw) => ({
        raw,
        item: classify(dir, raw),
      })),
      ...(typeof pagesIndex === 'string' && pagesIndex.trim()
        ? { pagesIndex: pagesIndex.trim() }
        : {}),
    };
  };
  const visit = async (dir: string): Promise<void> => {
    if (visited.has(dir)) return;
    visited.add(dir);
    reachedIds.add(`folder:${dir}`);
    const meta = await pagesMetaFor(dir);
    const excludedKeys = new Set(
      (meta?.items ?? []).flatMap(({ item }) =>
        item.kind === 'exclude' ? [stripPage(item.key)] : [],
      ),
    );
    const excluded = (key: string): boolean => excludedKeys.has(stripPage(key));
    // Folder index: a path-form pagesIndex attaches that page unless pages
    // excludes it; a link-form one routes the folder to its URL (compared
    // like any link item). Without pagesIndex, only a folder the generator
    // also treats as non-root (hasImplicitIndex: not the docs root, no `root`)
    // attaches index. The docs root's own index never enters the sidebar
    // tree (the loader drops the root folder's index), so the root reaches
    // its landing page only through pages, a rest entry or a link.
    if (meta?.pagesIndex !== undefined) {
      if (dir === '.') {
        // Dropped by the loader with the root folder node.
      } else {
        const index = classify(dir, meta.pagesIndex);
        if (index.kind === 'link' && index.url) reachedUrls.add(index.url);
        else if (index.kind === 'path') {
          const target = await resolveTarget(index.key);
          if (target.exists && !excluded(index.key)) reachedIds.add(target.id);
        }
      }
    } else if (hasImplicitIndex(dir, meta?.metadata ?? null)) {
      const key = posix.join(dir, 'index');
      const landing = await resolveTarget(key);
      if (landing.exists && !excluded(key)) reachedIds.add(landing.id);
    }
    const reachAll = async (): Promise<void> => {
      let entries;
      try {
        entries = await readdir(join(docsRoot, dir), { withFileTypes: true });
      } catch {
        return;
      }
      for (const entry of entries) {
        if (entry.name.startsWith('.') || entry.name === 'node_modules')
          continue;
        const key = posix.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (!excluded(key)) await visit(key);
        } else if (
          entry.isFile() &&
          PAGE_EXTENSIONS.includes(extname(entry.name)) &&
          !excluded(key)
        )
          reachedIds.add(`page:${stripPage(key)}`);
      }
    };
    if (!meta) {
      await reachAll();
      return;
    }
    for (const { item } of meta.items) {
      if (item.kind === 'rest') await reachAll();
      else if (item.kind === 'link' && item.url) reachedUrls.add(item.url);
      else if (item.kind === 'path') {
        const target = await resolveTarget(item.key);
        if (!target.exists) continue;
        if (target.folder) await visit(item.key);
        else reachedIds.add(target.id);
      }
    }
  };
  await visit('.');

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
        (!target.folder && reachedUrls.has(target.url))
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
  // A page two Contents maps list appears twice in generated nav; compare
  // first occurrences on both sides.
  const expected = flattenNav(
    await buildDocsNavTree({
      docsRoot: options.docsRoot,
      nonReaderPaths: options.nonReaderPaths,
    }),
  ).filter((path, index, all) => all.indexOf(path) === index);
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
