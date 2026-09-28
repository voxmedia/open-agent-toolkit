import { execFile } from 'node:child_process';
import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, join, relative, resolve, sep } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

/** Characters that end a path-like token when scanning Markdown text. */
const TOKEN_DELIMITERS = new Set([
  ' ',
  '\t',
  '\n',
  '\r',
  '(',
  ')',
  '[',
  ']',
  '<',
  '>',
  '"',
  "'",
  '`',
  '|',
  ',',
  '=',
]);

const SKIPPED_DIRECTORIES = new Set(['.git', 'node_modules']);

/** Result of {@link rewriteInboundReferences}. */
export interface RewriteInboundReferencesResult {
  /** Files whose content was rewritten, relative to the repository root. */
  rewritten: string[];
  /** One warning per reference that names the item but cannot be resolved. */
  warnings: string[];
}

/** Options for {@link rewriteInboundReferences}. */
export interface RewriteInboundReferencesOptions {
  /**
   * Rebase the moved item's own relative links from `items/` to `archived/`.
   * Defaults to `true`; a retry on an already-archived item passes `false`
   * because its links were rebased (or written) against `archived/` already.
   */
  rebaseMovedItem?: boolean;
}

interface ScanLayout {
  /** Directory whose Markdown files are scanned (`.oat/repo`). */
  scanRoot: string;
  /** Repository root for repo-root path strings, when the layout is canonical. */
  repoRoot: string | null;
}

function toPosix(path: string): string {
  return path.split(sep).join('/');
}

/**
 * Derive the scan layout from the backlog root. The canonical backlog lives at
 * `<repo>/.oat/repo/pjm/backlog`; a non-canonical `--backlog-root` scans only
 * the backlog root itself.
 */
function resolveLayout(backlogRoot: string): ScanLayout {
  const backlog = resolve(backlogRoot);
  const pjm = dirname(backlog);
  if (basename(backlog) !== 'backlog' || basename(pjm) !== 'pjm') {
    return { scanRoot: backlog, repoRoot: null };
  }
  const scanRoot = dirname(pjm);
  const oatDir = dirname(scanRoot);
  const repoRoot =
    basename(scanRoot) === 'repo' && basename(oatDir) === '.oat'
      ? dirname(oatDir)
      : null;
  return { scanRoot, repoRoot };
}

async function isInsideGitWorkTree(cwd: string): Promise<boolean> {
  try {
    const { stdout } = await execFileAsync(
      'git',
      ['rev-parse', '--is-inside-work-tree'],
      { cwd },
    );
    return stdout.trim() === 'true';
  } catch {
    return false;
  }
}

async function isFile(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isFile();
  } catch {
    return false;
  }
}

async function walkMarkdown(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      if (!SKIPPED_DIRECTORIES.has(entry.name)) {
        files.push(...(await walkMarkdown(path)));
      }
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(path);
    }
  }
  return files;
}

/**
 * List Markdown files under the scan root: tracked plus untracked-but-not-
 * ignored files inside a Git work tree, or a filesystem walk outside Git.
 */
async function listMarkdownFiles(scanRoot: string): Promise<string[]> {
  if (await isInsideGitWorkTree(scanRoot)) {
    const { stdout } = await execFileAsync(
      'git',
      [
        'ls-files',
        '-z',
        '--cached',
        '--others',
        '--exclude-standard',
        '--',
        '*.md',
      ],
      { cwd: scanRoot, maxBuffer: 64 * 1024 * 1024 },
    );
    const unique = [...new Set(stdout.split('\0').filter(Boolean))];
    const files: string[] = [];
    for (const relativePath of unique) {
      const path = join(scanRoot, relativePath);
      if (await isFile(path)) {
        files.push(path);
      }
    }
    return files;
  }
  return walkMarkdown(scanRoot);
}

function isRelativeTarget(target: string): boolean {
  return (
    target.length > 0 &&
    !target.startsWith('/') &&
    !target.startsWith('#') &&
    !/^[A-Za-z][A-Za-z0-9+.-]*:/u.test(target)
  );
}

/** Render `absolute` relative to `fromDirectory`, keeping a leading `./` style. */
function relativeFrom(
  fromDirectory: string,
  absolute: string,
  original: string,
): string {
  const next = toPosix(relative(fromDirectory, absolute));
  return original.startsWith('./') && !next.startsWith('..')
    ? `./${next}`
    : next;
}

interface RewriteContext {
  layout: ScanLayout;
  itemsPath: string;
  archivedPath: string;
  fileName: string;
  /** Directory the file's relative references were written against. */
  baseDirectory: string;
  /** Directory the file lives in after the archive move. */
  currentDirectory: string;
  warnings: string[];
}

/**
 * Rewrite one path token that ends in `<id>.md`. Returns the replacement, or
 * `null` when the token does not refer to the moved item.
 */
function rewriteItemToken(
  token: string,
  context: RewriteContext,
): string | null {
  const { layout, itemsPath, archivedPath } = context;
  const itemFile = basename(itemsPath);

  if (isRelativeTarget(token)) {
    if (resolve(context.baseDirectory, token) === itemsPath) {
      return relativeFrom(context.currentDirectory, archivedPath, token);
    }
    for (const base of [layout.repoRoot, layout.scanRoot]) {
      if (base !== null && resolve(base, token) === itemsPath) {
        return toPosix(relative(base, archivedPath));
      }
    }
  }

  // Canonical backlog layout: `archived/` is a sibling of `items/`, so any
  // `.../backlog/items/<id>.md` form keeps its base when the segment swaps.
  // Only `/`-separated forms are recognized: the token scan requires `/` or a
  // delimiter before the file name, so backslash paths never reach here.
  const itemsSuffix = `items/${itemFile}`;
  if (
    token === `backlog/${itemsSuffix}` ||
    token.endsWith(`/backlog/${itemsSuffix}`)
  ) {
    return `${token.slice(0, -itemsSuffix.length)}archived/${itemFile}`;
  }

  if (token === itemsSuffix || token.endsWith(`/${itemsSuffix}`)) {
    context.warnings.push(
      `${context.fileName} references \`${token}\`, which names archived backlog item ${basename(itemFile, '.md')} but does not resolve to its old items/ path; update it by hand.`,
    );
  }
  return null;
}

/**
 * Split Markdown into prose and code segments. Fenced code blocks (``` or ~~~,
 * closed by a same-character run at least as long, or running to the end of
 * the file) and inline code spans (a backtick run closed by a run of the same
 * length) are code; everything else is prose.
 */
export function splitMarkdownCode(
  content: string,
): Array<{ code: boolean; text: string }> {
  const segments: Array<{ code: boolean; text: string }> = [];
  const push = (code: boolean, text: string) => {
    if (text.length === 0) {
      return;
    }
    const last = segments.at(-1);
    if (last && last.code === code) {
      last.text += text;
    } else {
      segments.push({ code, text });
    }
  };

  const pushProse = (text: string) => {
    let cursor = 0;
    const opener = /`+/gu;
    let match: RegExpExecArray | null;
    while ((match = opener.exec(text)) !== null) {
      const run = match[0];
      const closer = new RegExp(`(?<!\`)${run}(?!\`)`, 'u');
      const rest = text.slice(match.index + run.length);
      const close = closer.exec(rest);
      if (!close) {
        continue;
      }
      const end = match.index + run.length + close.index + run.length;
      push(false, text.slice(cursor, match.index));
      push(true, text.slice(match.index, end));
      cursor = end;
      opener.lastIndex = end;
    }
    push(false, text.slice(cursor));
  };

  const lines = content.split(/(?<=\n)/u);
  let prose = '';
  let fence: { char: string; length: number } | null = null;
  let code = '';
  for (const line of lines) {
    if (fence) {
      code += line;
      const close = /^ {0,3}(`{3,}|~{3,})[ \t]*\r?\n?$/u.exec(line);
      if (
        close &&
        close[1]![0] === fence.char &&
        close[1]!.length >= fence.length
      ) {
        push(true, code);
        code = '';
        fence = null;
      }
      continue;
    }
    const open = /^ {0,3}(`{3,}|~{3,})/u.exec(line);
    if (open) {
      pushProse(prose);
      prose = '';
      fence = { char: open[1]![0]!, length: open[1]!.length };
      code = line;
      continue;
    }
    prose += line;
  }
  pushProse(prose);
  push(true, code);
  return segments;
}

/** Apply `transform` to prose only, leaving code spans and fences untouched. */
function mapProse(
  content: string,
  transform: (text: string) => string,
): string {
  return splitMarkdownCode(content)
    .map((segment) => (segment.code ? segment.text : transform(segment.text)))
    .join('');
}

/** Rewrite every token in `content` that ends in the item's file name. */
function rewriteItemTokens(content: string, context: RewriteContext): string {
  const itemFile = basename(context.itemsPath);
  let output = '';
  let cursor = 0;
  let index = content.indexOf(itemFile);
  while (index !== -1) {
    const end = index + itemFile.length;
    const before = index === 0 ? '' : content[index - 1]!;
    const after = content[end] ?? '';
    const boundedBefore =
      before === '' || before === '/' || TOKEN_DELIMITERS.has(before);
    const boundedAfter = after === '' || !/[A-Za-z0-9_-]/u.test(after);
    if (boundedBefore && boundedAfter) {
      let start = index;
      while (start > cursor && !TOKEN_DELIMITERS.has(content[start - 1]!)) {
        start -= 1;
      }
      const token = content.slice(start, end);
      const replacement = rewriteItemToken(token, context);
      if (replacement !== null && replacement !== token) {
        output += content.slice(cursor, start) + replacement;
        cursor = end;
      }
    }
    index = content.indexOf(itemFile, end);
  }
  return output + content.slice(cursor);
}

/** Rebase one relative link target of the moved item, or return it as-is. */
function rebaseTarget(target: string, context: RewriteContext): string {
  if (!isRelativeTarget(target)) {
    return target;
  }
  const absolute = resolve(context.baseDirectory, target);
  if (
    absolute === context.itemsPath ||
    resolve(context.currentDirectory, target) === absolute
  ) {
    return target;
  }
  return relativeFrom(context.currentDirectory, absolute, target);
}

/**
 * Rebase the moved item's own relative Markdown link targets — inline
 * `[text](target)` links and reference-style `[label]: target` definitions —
 * from `items/` to `archived/` so links to siblings and other files keep
 * resolving.
 */
function rebaseMovedItemLinks(
  content: string,
  context: RewriteContext,
): string {
  return content
    .replace(
      /\]\(([^)\s#]+)((?:#[^)\s]*)?(?:\s+"[^"]*")?)\)/gu,
      (_match, target: string, rest: string) =>
        `](${rebaseTarget(target, context)}${rest})`,
    )
    .replace(
      /^( {0,3}\[[^\]\n]+\]:[ \t]*<?)([^\s>#]+)/gmu,
      (_match, prefix: string, target: string) =>
        `${prefix}${rebaseTarget(target, context)}`,
    );
}

/**
 * After `items/<id>.md` moved to `archived/<id>.md`, rewrite every reference
 * to the old path in Markdown under `.oat/repo/**` (links and repository-root
 * path strings such as `oat_external_plan_sources` frontmatter). Text inside
 * inline code spans and fenced code blocks is never rewritten, so a recorded
 * command keeps its meaning. References that name the item's `items/` path
 * but cannot be resolved are reported as warnings and left untouched. The
 * rewrite is idempotent, so a re-run on an already-archived item is safe.
 */
export async function rewriteInboundReferences(
  backlogRoot: string,
  itemsPath: string,
  archivedPath: string,
  options: RewriteInboundReferencesOptions = {},
): Promise<RewriteInboundReferencesResult> {
  const rebaseMovedItem = options.rebaseMovedItem ?? true;
  const layout = resolveLayout(backlogRoot);
  const absoluteItemsPath = resolve(itemsPath);
  const absoluteArchivedPath = resolve(archivedPath);
  const displayRoot = layout.repoRoot ?? layout.scanRoot;
  const rewritten: string[] = [];
  const warnings: string[] = [];

  // The moved item goes first, so a failure on a later file never leaves its
  // own links half-rebased: a retry (which skips the rebase) stays correct.
  const files = (await listMarkdownFiles(layout.scanRoot)).sort(
    (left, right) =>
      Number(resolve(right) === absoluteArchivedPath) -
        Number(resolve(left) === absoluteArchivedPath) ||
      left.localeCompare(right),
  );
  for (const file of files) {
    const absoluteFile = resolve(file);
    const moved = rebaseMovedItem && absoluteFile === absoluteArchivedPath;
    const content = await readFile(absoluteFile, 'utf8');
    const context: RewriteContext = {
      layout,
      itemsPath: absoluteItemsPath,
      archivedPath: absoluteArchivedPath,
      fileName: toPosix(relative(displayRoot, absoluteFile)),
      baseDirectory: moved ? dirname(absoluteItemsPath) : dirname(absoluteFile),
      currentDirectory: dirname(absoluteFile),
      warnings,
    };
    let next = content.includes(basename(absoluteItemsPath))
      ? mapProse(content, (text) => rewriteItemTokens(text, context))
      : content;
    if (moved) {
      next = mapProse(next, (text) => rebaseMovedItemLinks(text, context));
    }
    if (next !== content) {
      await writeFile(absoluteFile, next, 'utf8');
      rewritten.push(context.fileName);
    }
  }

  return { rewritten, warnings };
}
