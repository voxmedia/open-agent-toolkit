import { readdir, readFile, writeFile } from 'node:fs/promises';
import { basename, extname, join, posix } from 'node:path';
import { isDeepStrictEqual } from 'node:util';

import {
  getFrontmatterBlock,
  parseFrontmatterScalarFields,
} from '@commands/shared/frontmatter';
import { fileExists } from '@fs/io';

import { parseIndexContents, resolveEntryTarget } from './contents';

/**
 * The `meta.json` keys nav sync owns. Every other key (`icon`, `defaultOpen`,
 * `description`, ...) is left as the author wrote it.
 */
export interface FumadocsMeta {
  title?: string;
  pages: string[];
}

export interface FumadocsMetaFile {
  /** Docs-relative POSIX path of the `meta.json` file. */
  path: string;
  meta: FumadocsMeta;
  changed: boolean;
}

export interface SyncFumadocsNavigationResult {
  metaFiles: FumadocsMetaFile[];
  /** Docs-relative paths of the `meta.json` files this run wrote. */
  written: string[];
  /**
   * Docs-relative paths of the `meta.json` files that were missing or differed
   * by meaning before this run. Equal to `written` unless `check` was set.
   */
  stale: string[];
  /**
   * Docs-relative paths no Contents map places in the page tree. A folder is
   * reported once as `folder/` instead of once per page inside it.
   */
  unlisted: string[];
}

const PAGE_EXTENSIONS = ['.md', '.mdx'];
const GROUP_FOLDER = /^\(.+\)$/;
// The `pages` item grammar of the fumadocs-core 16.10.2 page-tree builder
// (`resolveFolderItem`): exact rest entries, separators, links, and the
// exclude and extract prefixes are checked before an item is read as a path.
const FUMADOCS_REST_ITEMS = new Set(['...', 'z...a']);
const FUMADOCS_SEPARATOR = /^---(?:\[(?<icon>[^\]]+)])?(?<name>.+)---|^---$/;
const FUMADOCS_LINK =
  /^(?<external>external:)?(?:\[(?<icon>[^\]]+)])?\[(?<name>[^\]]+)]\((?<url>[^)]+)\)$/;
const FUMADOCS_PREFIXES = ['!', '...'];
const H1 = /^#\s+(.+?)\s*#*\s*$/;
const FENCE = /^\s*(```|~~~)/;

interface DocsInventory {
  /** Docs-relative POSIX directory paths, `.` for the docs root. */
  directories: string[];
  /** Docs-relative POSIX page paths. */
  pages: string[];
}

function parentDir(path: string): string {
  return posix.dirname(path);
}

async function inventoryDocs(docsRoot: string): Promise<DocsInventory> {
  const directories: string[] = [];
  const pages: string[] = [];

  async function walk(relativeDir: string): Promise<void> {
    directories.push(relativeDir);
    const entries = await readdir(join(docsRoot, relativeDir), {
      withFileTypes: true,
    });
    for (const entry of entries) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules') {
        continue;
      }
      const entryPath = posix.join(relativeDir, entry.name);
      if (entry.isDirectory()) {
        await walk(entryPath);
      } else if (
        entry.isFile() &&
        PAGE_EXTENSIONS.includes(extname(entry.name))
      ) {
        pages.push(entryPath);
      }
    }
  }

  await walk('.');
  directories.sort();
  pages.sort();
  return { directories, pages };
}

/**
 * Reduce a Markdown heading to the plain text a sidebar shows: images and
 * links keep their text, code spans keep their content, and emphasis and
 * strikethrough markers are dropped.
 */
export function stripInlineMarkdown(text: string): string {
  return text
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/(`+)(.+?)\1/g, '$2')
    .replace(/(\*\*|__|~~)(.+?)\1/g, '$2')
    .replace(/(^|[^\w*])[*_]([^*_]+?)[*_](?=[^\w*]|$)/g, '$1$2')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Folder title: frontmatter `title`, else the first H1 outside code fences. */
export function resolveFolderTitle(markdown: string): string | undefined {
  const frontmatter = getFrontmatterBlock(markdown);
  if (frontmatter !== null) {
    const title = parseFrontmatterScalarFields(frontmatter, ['title']).values
      .title;
    if (title) {
      return title;
    }
  }

  const body =
    frontmatter === null
      ? markdown
      : markdown.slice(markdown.indexOf('\n---', 4) + 4);
  let fence: string | null = null;
  for (const line of body.split(/\r?\n/)) {
    const fenceMatch = line.match(FENCE);
    if (fenceMatch) {
      const marker = fenceMatch[1]!;
      if (fence === null) {
        fence = marker;
      } else if (fence === marker) {
        fence = null;
      }
      continue;
    }
    if (fence !== null) {
      continue;
    }
    const heading = line.match(H1);
    if (heading?.[1]) {
      return stripInlineMarkdown(heading[1]) || undefined;
    }
  }

  return undefined;
}

/**
 * The URL Fumadocs assigns a page, following `getSlugs` in fumadocs-core's
 * slugs plugin with the scaffolded `baseUrl: '/'`: group folders are dropped,
 * segments are URI-encoded, and an `index` file maps to its folder.
 */
function pageUrl(pagePath: string): string {
  const slugs = parentDir(pagePath)
    .split('/')
    .filter((segment) => segment.length > 0 && segment !== '.')
    .filter((segment) => !GROUP_FOLDER.test(segment))
    .map((segment) => encodeURI(segment));
  const name = basename(pagePath, extname(pagePath));
  if (name !== 'index') {
    slugs.push(encodeURI(name));
  }
  return `/${slugs.join('/')}`;
}

/** Whether the Fumadocs page-tree builder reads `item` as a directive, not a path. */
function isFumadocsDirective(item: string): boolean {
  return (
    FUMADOCS_REST_ITEMS.has(item) ||
    FUMADOCS_SEPARATOR.test(item) ||
    FUMADOCS_LINK.test(item) ||
    FUMADOCS_PREFIXES.some((prefix) => item.startsWith(prefix))
  );
}

/**
 * The `pages` item for a page or folder in the same directory. A name the
 * builder would read as a directive (`!hidden`, `z...a`, `---`, ...) is
 * written in the local-path form `./name`, which its path join resolves to
 * the same file; every other name is written as is.
 */
export function toFumadocsPageItem(name: string): string {
  return isFumadocsDirective(name) ? `./${name}` : name;
}

function hrefFragment(href: string): string {
  const hashIndex = href.indexOf('#');
  return hashIndex >= 0 ? href.slice(hashIndex) : '';
}

/**
 * Build one folder's `pages` from its index.md Contents map.
 *
 * A page in this folder or an immediate subfolder is referenced by name. Any
 * other target becomes a Fumadocs link entry, so no page is claimed by two
 * folders. There is never a `"..."` rest entry: pages the Contents map does
 * not list stay out of the tree and are reported instead.
 */
/**
 * Whether the fumadocs-core 16.10.2 page-tree builder supplies this folder's
 * `index` page on its own, given the folder's effective metadata.
 *
 * `buildFolder` attaches `<folder>/index` as the folder index only when the
 * folder is not a root folder (the docs root, or a preserved `root: true`)
 * and no `pagesIndex` names a different page. Otherwise the page is shown
 * only if `pages` lists it.
 */
function hasImplicitIndex(
  relativeDir: string,
  existing: Record<string, unknown> | null,
): boolean {
  if (relativeDir === '.' || existing?.root === true) {
    return false;
  }
  const pagesIndex = existing?.pagesIndex;
  return pagesIndex === undefined || pagesIndex === 'index';
}

async function buildFolderPages(
  docsRoot: string,
  relativeDir: string,
  markdown: string,
  implicitIndex: boolean,
): Promise<string[]> {
  const indexPath = join(docsRoot, relativeDir, 'index.md');
  const entries = parseIndexContents(markdown, indexPath);
  // A folder the loader gives no implicit index (the docs root, a `root: true`
  // folder) must list `index` to show its landing page. Elsewhere, listing
  // `index` would demote the folder index to an ordinary child, so it is left
  // implicit.
  const pages: string[] = implicitIndex ? [] : ['index'];

  for (const entry of entries) {
    const target = await resolveEntryTarget(
      docsRoot,
      join(docsRoot, relativeDir),
      relativeDir,
      entry,
      PAGE_EXTENSIONS,
    );
    const targetDir = parentDir(target.path);
    let item: string;

    if (target.kind === 'section' && targetDir === relativeDir) {
      continue;
    } else if (
      target.kind === 'section' &&
      parentDir(targetDir) === relativeDir
    ) {
      item = toFumadocsPageItem(basename(targetDir));
    } else if (target.kind === 'page' && targetDir === relativeDir) {
      item = toFumadocsPageItem(basename(target.path, extname(target.path)));
    } else {
      item = `[${entry.title}](${pageUrl(target.path)}${hrefFragment(entry.href)})`;
    }

    if (!pages.includes(item)) {
      pages.push(item);
    }
  }

  return pages;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function readExistingMeta(
  metaPath: string,
): Promise<Record<string, unknown> | null> {
  if (!(await fileExists(metaPath))) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(await readFile(metaPath, 'utf8'));
    return isPlainObject(parsed) ? parsed : null;
  } catch {
    // A generated file that no longer parses (for example after a merge
    // conflict) is regenerated rather than preserved.
    return null;
  }
}

function mergeMeta(
  existing: Record<string, unknown> | null,
  meta: FumadocsMeta,
): Record<string, unknown> {
  const { title: _title, pages: _pages, ...unowned } = existing ?? {};
  return {
    ...unowned,
    ...(meta.title === undefined ? {} : { title: meta.title }),
    pages: meta.pages,
  };
}

function collectUnlisted(
  inventory: DocsInventory,
  metas: Map<string, FumadocsMeta>,
  implicitIndexDirs: ReadonlySet<string>,
): string[] {
  const reachableDirs = new Set<string>();
  const reachablePages = new Set<string>();
  const pagesByFlattenPath = new Map(
    inventory.pages.map((page) => [
      page.slice(0, page.length - extname(page).length),
      page,
    ]),
  );

  function visit(relativeDir: string): void {
    reachableDirs.add(relativeDir);
    const meta = metas.get(relativeDir);
    if (!meta) {
      return;
    }
    // A landing page is reachable only when the loader attaches it as the
    // folder index or `pages` lists it, never just because the file exists.
    const index = pagesByFlattenPath.get(posix.join(relativeDir, 'index'));
    if (index && implicitIndexDirs.has(relativeDir)) {
      reachablePages.add(index);
    }
    for (const item of meta.pages) {
      // Read items the way the loader does: a directive (including a link
      // entry) names no local page, and `./name` joins to `name`.
      if (isFumadocsDirective(item)) {
        continue;
      }
      const itemPath = posix.join(relativeDir, item);
      if (metas.has(itemPath) && !reachableDirs.has(itemPath)) {
        visit(itemPath);
        continue;
      }
      const page = pagesByFlattenPath.get(itemPath);
      if (page) {
        reachablePages.add(page);
      }
    }
  }

  visit('.');

  const unlisted = new Set<string>();
  for (const page of inventory.pages) {
    if (reachablePages.has(page)) {
      continue;
    }
    let topmostHiddenDir: string | null = null;
    for (
      let dir = parentDir(page);
      dir !== '.' && dir.length > 0;
      dir = parentDir(dir)
    ) {
      if (!reachableDirs.has(dir)) {
        topmostHiddenDir = dir;
      }
    }
    unlisted.add(topmostHiddenDir === null ? page : `${topmostHiddenDir}/`);
  }

  return [...unlisted].sort();
}

/**
 * Write one strict `meta.json` per docs directory that has an index.md,
 * derived from that index's Contents map, and report every page the
 * resulting page tree leaves out.
 *
 * Existing files are compared by meaning (parsed and deep-equal), so a run
 * with no doc changes writes nothing even after a formatter rewrites them.
 */
export async function syncFumadocsNavigation(options: {
  docsRoot: string;
  /** Compute and compare only; never write. */
  check?: boolean;
}): Promise<SyncFumadocsNavigationResult> {
  const { docsRoot } = options;
  const inventory = await inventoryDocs(docsRoot);
  const metas = new Map<string, FumadocsMeta>();
  const existingMetas = new Map<string, Record<string, unknown> | null>();
  const implicitIndexDirs = new Set<string>();

  for (const relativeDir of inventory.directories) {
    const indexPath = join(docsRoot, relativeDir, 'index.md');
    if (!(await fileExists(indexPath))) {
      continue;
    }
    // Index handling depends on the effective metadata, which keeps the
    // author-owned `root` and `pagesIndex` keys of an existing meta.json.
    const existing = await readExistingMeta(
      join(docsRoot, relativeDir, 'meta.json'),
    );
    existingMetas.set(relativeDir, existing);
    const implicitIndex = hasImplicitIndex(relativeDir, existing);
    if (implicitIndex) {
      implicitIndexDirs.add(relativeDir);
    }
    const markdown = await readFile(indexPath, 'utf8');
    const title = resolveFolderTitle(markdown);
    metas.set(relativeDir, {
      ...(title === undefined ? {} : { title }),
      pages: await buildFolderPages(
        docsRoot,
        relativeDir,
        markdown,
        implicitIndex,
      ),
    });
  }

  if (!metas.has('.')) {
    throw new Error(
      `Missing required index.md at ${join(docsRoot, 'index.md')}`,
    );
  }

  const metaFiles: FumadocsMetaFile[] = [];
  for (const [relativeDir, meta] of metas) {
    const relativePath = posix.join(relativeDir, 'meta.json');
    const metaPath = join(docsRoot, relativePath);
    const existing = existingMetas.get(relativeDir) ?? null;
    const next = mergeMeta(existing, meta);
    const changed = existing === null || !isDeepStrictEqual(existing, next);
    if (changed && !options.check) {
      await writeFile(metaPath, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
    }
    metaFiles.push({ path: relativePath, meta, changed });
  }

  metaFiles.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));

  const stale = metaFiles
    .filter((file) => file.changed)
    .map((file) => file.path);

  return {
    metaFiles,
    written: options.check ? [] : stale,
    stale,
    unlisted: collectUnlisted(inventory, metas, implicitIndexDirs),
  };
}
