import { execFile } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { constants as fsConstants, lstatSync } from 'node:fs';
import {
  lstat,
  open as openFile,
  readdir,
  realpath,
  rename,
  unlink,
} from 'node:fs/promises';
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

/**
 * True only for a regular file (never a symlink) whose real path stays inside
 * `realScanRoot`, so the scan can never read or write outside `.oat/repo`.
 */
async function isRegularFileInside(
  path: string,
  realScanRoot: string,
): Promise<boolean> {
  try {
    if (!(await lstat(path)).isFile()) {
      return false;
    }
    const real = await realpath(path);
    return real === realScanRoot || real.startsWith(`${realScanRoot}${sep}`);
  } catch {
    return false;
  }
}

/** True when anything (file, directory, or link) exists at `path`. */
function pathExistsSync(path: string): boolean {
  try {
    lstatSync(path);
    return true;
  } catch {
    return false;
  }
}

/** `O_NOFOLLOW` where the platform has it: refuse to open through a symlink. */
const NO_FOLLOW = fsConstants.O_NOFOLLOW ?? 0;

/** Identity of the inode a file was read from. */
interface FileIdentity {
  dev: number;
  ino: number;
  mode: number;
}

async function readNoFollow(
  path: string,
): Promise<{ content: string; identity: FileIdentity }> {
  const handle = await openFile(path, fsConstants.O_RDONLY | NO_FOLLOW);
  try {
    const info = await handle.stat();
    return {
      content: await handle.readFile('utf8'),
      identity: { dev: info.dev, ino: info.ino, mode: info.mode },
    };
  } finally {
    await handle.close();
  }
}

/**
 * Replace `path` with `content` without ever writing to its existing inode:
 * write a temporary file in the same (already verified, in-tree) directory,
 * then rename it over the original. Truncating in place would write through
 * every other hard link to the same inode, including one outside `.oat/repo`.
 * Immediately before the rename, the target must still be the regular,
 * non-symlink file that was read (same device and inode); otherwise the
 * replacement is abandoned. The original permission bits are preserved.
 */
async function replaceAtomically(
  path: string,
  content: string,
  identity: FileIdentity,
): Promise<void> {
  const temporary = join(
    dirname(path),
    `.${basename(path)}.oat-rewrite-${process.pid}-${randomBytes(6).toString('hex')}.tmp`,
  );
  const permissions = identity.mode & 0o7777;
  const handle = await openFile(
    temporary,
    fsConstants.O_WRONLY | fsConstants.O_CREAT | fsConstants.O_EXCL | NO_FOLLOW,
    permissions,
  );
  try {
    try {
      await handle.writeFile(content, 'utf8');
      // The creation mode is masked by the umask; set the exact bits.
      await handle.chmod(permissions);
    } finally {
      await handle.close();
    }
    const current = await lstat(path);
    if (
      !current.isFile() ||
      current.dev !== identity.dev ||
      current.ino !== identity.ino
    ) {
      throw new Error(
        `${path} changed while its references were being rewritten; it was left untouched. Re-run \`oat backlog archive\` to retry.`,
      );
    }
    await rename(temporary, path);
  } catch (error) {
    await unlink(temporary).catch(() => undefined);
    throw error;
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
  const realScanRoot = await realpath(scanRoot);
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
      if (await isRegularFileInside(path, realScanRoot)) {
        files.push(path);
      }
    }
    return files;
  }
  const walked: string[] = [];
  for (const path of await walkMarkdown(scanRoot)) {
    if (await isRegularFileInside(path, realScanRoot)) {
      walked.push(path);
    }
  }
  return walked;
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
    const fromFile = resolve(context.baseDirectory, token);
    if (fromFile === itemsPath) {
      return relativeFrom(context.currentDirectory, archivedPath, token);
    }
    // A token that already resolves to a different, existing file is a
    // working link: never repoint it through a fallback base.
    if (pathExistsSync(fromFile)) {
      return null;
    }
    for (const base of [layout.repoRoot, layout.scanRoot]) {
      if (base !== null && resolve(base, token) === itemsPath) {
        return toPosix(relative(base, archivedPath));
      }
    }
  }

  // Only a token that resolves to the former items/ path is rewritten. URLs
  // (any scheme) are never touched or reported; an unresolved local form that
  // still names `items/<id>.md` is reported for a manual fix. Only
  // `/`-separated forms are recognized: the token scan requires `/` or a
  // delimiter before the file name, so backslash paths never reach here.
  const itemsSuffix = `items/${itemFile}`;
  if (/^[A-Za-z][A-Za-z0-9+.-]*:/u.test(token)) {
    return null;
  }
  if (token === itemsSuffix || token.endsWith(`/${itemsSuffix}`)) {
    context.warnings.push(
      `${context.fileName} references \`${token}\`, which names archived backlog item ${basename(itemFile, '.md')} but does not resolve to its old items/ path; update it by hand.`,
    );
  }
  return null;
}

/** A Markdown segment: prose, an inline code span, or a fenced code block. */
export interface MarkdownSegment {
  kind: 'prose' | 'span' | 'fence';
  text: string;
}

/**
 * Split Markdown into prose, inline code spans, and fenced code blocks.
 * Fences (``` or ~~~) close on a same-character run at least as long, or run
 * to the end of the file. Inline code spans pair a backtick run with the next
 * run of the same length inside one paragraph (a blank line ends it), so a
 * stray backtick never swallows later paragraphs.
 */
export function splitMarkdownCode(content: string): MarkdownSegment[] {
  const segments: MarkdownSegment[] = [];
  const push = (kind: MarkdownSegment['kind'], text: string) => {
    if (text.length === 0) {
      return;
    }
    const last = segments.at(-1);
    if (last && last.kind === kind && kind === 'prose') {
      last.text += text;
    } else {
      segments.push({ kind, text });
    }
  };

  const pushParagraph = (text: string) => {
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
      push('prose', text.slice(cursor, match.index));
      push('span', text.slice(match.index, end));
      cursor = end;
      opener.lastIndex = end;
    }
    push('prose', text.slice(cursor));
  };

  const pushProse = (text: string) => {
    // Blank lines end a paragraph; the separators stay prose.
    for (const part of text.split(/(\r?\n[ \t]*\r?\n)/u)) {
      pushParagraph(part);
    }
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
        push('fence', code);
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
  push('fence', code);
  return segments;
}

/** Report every `items/<id>.md` occurrence left inside code as written. */
function warnCodeOccurrences(text: string, context: RewriteContext): void {
  const itemFile = basename(context.itemsPath);
  const needle = `items/${itemFile}`;
  let index = text.indexOf(needle);
  while (index !== -1) {
    const after = text[index + needle.length] ?? '';
    if (after === '' || !/[A-Za-z0-9_-]/u.test(after)) {
      context.warnings.push(
        `${context.fileName} mentions \`${needle}\` inside code, which is left as written; update it by hand if it is a live reference to archived backlog item ${basename(itemFile, '.md')}.`,
      );
    }
    index = text.indexOf(needle, index + needle.length);
  }
}

/**
 * Rewrite an inline code span whose whole content is one path (optionally
 * with a `#anchor`) that resolves to the moved item — the external-plan
 * "Source artifact or scope" citation form. Any other span naming the item is
 * left as written with a warning, so recorded commands keep their meaning.
 */
function rewriteCodeSpan(span: string, context: RewriteContext): string {
  const run = /^`+/u.exec(span)![0];
  const inner = span.slice(run.length, span.length - run.length);
  const single = /^(\s*)([^\s`]+)(\s*)$/u.exec(inner);
  if (single) {
    const [, leading, token, trailing] = single;
    const hash = token!.indexOf('#');
    const path = hash === -1 ? token! : token!.slice(0, hash);
    const anchor = hash === -1 ? '' : token!.slice(hash);
    const itemFile = basename(context.itemsPath);
    if (path === itemFile || path.endsWith(`/${itemFile}`)) {
      const replacement = rewriteItemToken(path, context);
      return replacement === null || replacement === path
        ? span
        : `${run}${leading}${replacement}${anchor}${trailing}${run}`;
    }
  }
  warnCodeOccurrences(inner, context);
  return span;
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

/**
 * Rebase one relative link target of the moved item, or return it as-is.
 * Only a target that existed relative to `items/` is rebased, so prose or an
 * already-broken target is never rewritten into a new broken path.
 */
function rebaseTarget(target: string, context: RewriteContext): string {
  if (!isRelativeTarget(target)) {
    return target;
  }
  const absolute = resolve(context.baseDirectory, target);
  if (
    absolute === context.itemsPath ||
    resolve(context.currentDirectory, target) === absolute ||
    !pathExistsSync(absolute)
  ) {
    return target;
  }
  return relativeFrom(context.currentDirectory, absolute, target);
}

/** Rebase `path?query#anchor`, keeping the query and anchor as written. */
function rebaseWithAnchor(target: string, context: RewriteContext): string {
  const split = target.search(/[?#]/u);
  const path = split === -1 ? target : target.slice(0, split);
  const suffix = split === -1 ? '' : target.slice(split);
  return path.length === 0 ? target : `${rebaseTarget(path, context)}${suffix}`;
}

/** A CommonMark link title: `"…"`, `'…'`, or `(…)`. */
const LINK_TITLE = String.raw`(?:"[^"\n]*"|'[^'\n]*'|\([^)\n]*\))`;

const INLINE_LINK = new RegExp(
  String.raw`\]\((?:<([^<>\n]*)>|([^)\s<]+))((?:\s+${LINK_TITLE})?)\)`,
  'gu',
);

const REFERENCE_DEFINITION = new RegExp(
  String.raw`^( {0,3}\[(?!\^)[^\]\n]+\]:[ \t]*)(?:<([^<>\n]*)>|([^\s<>]+))((?:[ \t]+${LINK_TITLE})?[ \t]*\r?)$`,
  'gmu',
);

/**
 * Rebase the moved item's inline `[text](target "title")` links (angle
 * destinations and every title form) from `items/` to `archived/`.
 */
function rebaseMovedItemInlineLinks(
  content: string,
  context: RewriteContext,
): string {
  return content.replace(
    INLINE_LINK,
    (_match, angled: string | undefined, bare: string | undefined, title) =>
      angled !== undefined
        ? `](<${rebaseWithAnchor(angled, context)}>${title})`
        : `](${rebaseWithAnchor(bare!, context)}${title})`,
  );
}

/**
 * Rebase the moved item's reference definitions (`[label]: <dest> "title"`)
 * outside fenced code. Footnotes (`[^n]:`) and `[label]: prose` lines — a
 * destination followed by anything but a title — are not definitions and are
 * left untouched.
 */
function rebaseMovedItemDefinitions(
  content: string,
  context: RewriteContext,
): string {
  const segments = splitMarkdownCode(content);
  return segments
    .map((segment, index) => {
      // Code spans and fences stay exactly as written.
      if (segment.kind !== 'prose') {
        return segment.text;
      }
      // A prose segment that follows a code span mid-line does not start a
      // line, so a match at its offset 0 is not a definition.
      const previous = index === 0 ? null : segments[index - 1]!.text;
      const startsLine = previous === null || previous.endsWith('\n');
      return segment.text.replace(
        REFERENCE_DEFINITION,
        (
          match: string,
          prefix: string,
          angled: string | undefined,
          bare: string | undefined,
          rest: string,
          offset: number,
        ) => {
          if (offset === 0 && !startsLine) {
            return match;
          }
          return angled !== undefined
            ? `${prefix}<${rebaseWithAnchor(angled, context)}>${rest}`
            : `${prefix}${rebaseWithAnchor(bare!, context)}${rest}`;
        },
      );
    })
    .join('');
}

/** Rewrite one file's content: prose tokens, citation spans, moved links. */
function rewriteContent(
  content: string,
  context: RewriteContext,
  moved: boolean,
): string {
  const itemFile = basename(context.itemsPath);
  let next = content;
  if (content.includes(itemFile)) {
    next = splitMarkdownCode(content)
      .map((segment) => {
        if (segment.kind === 'prose') {
          return rewriteItemTokens(segment.text, context);
        }
        if (segment.kind === 'span') {
          return rewriteCodeSpan(segment.text, context);
        }
        warnCodeOccurrences(segment.text, context);
        return segment.text;
      })
      .join('');
  }
  if (moved) {
    next = splitMarkdownCode(next)
      .map((segment) =>
        segment.kind === 'prose'
          ? rebaseMovedItemInlineLinks(segment.text, context)
          : segment.text,
      )
      .join('');
    next = rebaseMovedItemDefinitions(next, context);
  }
  return next;
}

/**
 * After `items/<id>.md` moved to `archived/<id>.md`, rewrite every reference
 * to the old path in Markdown under `.oat/repo/**` (links and repository-root
 * path strings such as `oat_external_plan_sources` frontmatter). An inline code
 * span is rewritten only when its whole content is a path to the item (the
 * external-plan citation form); other spans and fenced code are left as
 * written with a warning, so a recorded command keeps its meaning. References that name the item's `items/` path
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
    const { content, identity } = await readNoFollow(absoluteFile);
    const context: RewriteContext = {
      layout,
      itemsPath: absoluteItemsPath,
      archivedPath: absoluteArchivedPath,
      fileName: toPosix(relative(displayRoot, absoluteFile)),
      baseDirectory: moved ? dirname(absoluteItemsPath) : dirname(absoluteFile),
      currentDirectory: dirname(absoluteFile),
      warnings,
    };
    const next = rewriteContent(content, context, moved);
    if (next !== content) {
      await replaceAtomically(absoluteFile, next, identity);
      rewritten.push(context.fileName);
    }
  }

  return { rewritten, warnings };
}
