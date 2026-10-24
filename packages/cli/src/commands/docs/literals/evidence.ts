import { lstat, readFile, readdir, realpath, stat } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';

import {
  containedFile,
  inside,
  posix,
  resolveCheckTarget,
} from '@commands/docs/check/files';
import { parsePage } from '@commands/docs/check/markdown';
import {
  createExclusionMatcher,
  isExcludedPath,
} from '@commands/docs/shared/exclusions';
import { decodeHTMLStrict } from 'entities';

export class LiteralInputError extends Error {}

export interface LiteralOptions {
  cwd: string;
  targetDir?: string;
  page: string[];
  sourceRoot: string[];
  sourceExclude: string[];
}
interface Candidate {
  path: string;
  line: number;
  literal: string;
  normalized: string;
  status: 'found' | 'not-found';
  source?: { path: string; line: number };
}
export interface LiteralResult {
  status: 'ok' | 'not-applicable';
  reason?: string;
  scope: {
    contentRoot: string;
    pages: string[];
    sourceRoots: string[];
    sourceExcludes: string[];
  };
  searched: string[];
  skipped: {
    path: string;
    reason: 'symlink' | 'binary' | 'non-utf8' | 'non-regular';
  }[];
  literals: Candidate[];
}

function inputPath(value: string, label: string, pattern = false): string {
  const path = value.trim().replace(/^\.\//, '');
  const parts = path.replace(/\/$/, '').split('/');
  if (
    !path ||
    path.startsWith('/') ||
    /^[A-Za-z]:/.test(path) ||
    path.includes('\\') ||
    [...path].some((c) => c.charCodeAt(0) < 32) ||
    parts.some((p) => !p || p === '.' || p === '..') ||
    (!pattern && path.includes('*'))
  )
    throw new LiteralInputError(
      `${label} must be a non-empty relative POSIX ${pattern ? 'pattern' : 'path'} without parent segments.`,
    );
  return pattern ? path : path.replace(/\/$/, '');
}
const unique = (values: string[]) => [...new Set(values)].sort();

async function selected<T>(
  label: string,
  operation: () => Promise<T>,
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (
      ['ENOENT', 'ENOTDIR', 'EACCES', 'EPERM', 'ELOOP', 'EISDIR'].includes(
        (error as NodeJS.ErrnoException).code ?? '',
      )
    )
      throw new LiteralInputError(
        `Cannot read ${label}; check that it exists and is readable.`,
      );
    throw error;
  }
}
function text(
  bytes: Buffer,
): { value: string } | { reason: 'binary' | 'non-utf8' } {
  if (bytes.includes(0)) return { reason: 'binary' };
  try {
    return { value: new TextDecoder('utf-8', { fatal: true }).decode(bytes) };
  } catch {
    return { reason: 'non-utf8' };
  }
}

export async function collectLiteralEvidence(
  options: LiteralOptions,
): Promise<LiteralResult> {
  const target = await selected('documentation target/config', async () => {
    try {
      return await resolveCheckTarget(options.cwd, options.targetDir);
    } catch (error) {
      if (!(error as NodeJS.ErrnoException).code)
        throw new LiteralInputError(
          'Cannot resolve documentation target/config; check .oat/config.json, documentation.root, documentation.ia and --target-dir.',
        );
      throw error;
    }
  });
  const result: LiteralResult = {
    status: 'not-applicable',
    scope: {
      contentRoot: posix(relative(target.repoRoot, target.contentRoot)) || '.',
      pages: [],
      sourceRoots: [],
      sourceExcludes: [],
    },
    searched: [],
    skipped: [],
    literals: [],
  };
  // Config is only the extraction gate. The skill separately reconciles authored acceptance.
  if (target.documentation.ia?.verification !== 'triad') {
    result.reason =
      'The matching documentation IA mirror does not declare verification: triad.';
    return result;
  }
  if (!inside(target.repoRoot, target.contentRoot))
    throw new LiteralInputError(
      'Docs content root must be inside the repository.',
    );
  if (!options.page.length || !options.sourceRoot.length)
    throw new LiteralInputError(
      'Provide at least one --page and one narrow --source-root.',
    );
  const pages = unique(options.page.map((p) => inputPath(p, '--page')));
  const roots = unique(
    options.sourceRoot.map((p) => inputPath(p, '--source-root')),
  );
  const excludes = unique(
    options.sourceExclude.map((p) => inputPath(p, '--source-exclude', true)),
  );
  result.scope = {
    contentRoot: result.scope.contentRoot,
    pages,
    sourceRoots: roots,
    sourceExcludes: excludes,
  };
  const matcher = createExclusionMatcher(excludes);
  const sources = new Set<string>();
  const skipped = new Map<string, LiteralResult['skipped'][number]['reason']>();
  // Inspect each component so an explicitly selected nested alias cannot bypass traversal policy.
  const symlinkComponent = async (
    root: string,
    path: string,
  ): Promise<boolean> => {
    const parts = path.split('/');
    for (let i = 1; i <= parts.length; i++) {
      if ((await lstat(join(root, ...parts.slice(0, i)))).isSymbolicLink())
        return true;
    }
    return false;
  };
  const walk = async (path: string): Promise<void> => {
    const absolute = join(target.repoRoot, path);
    const info = await selected(`source ${path}`, () => lstat(absolute));
    if (info.isSymbolicLink()) {
      skipped.set(path, 'symlink');
      return;
    }
    if (isExcludedPath(matcher, path, info.isDirectory())) return;
    if (info.isDirectory()) {
      const entries = await selected(`source directory ${path}`, () =>
        readdir(absolute),
      );
      for (const name of entries.sort()) await walk(`${path}/${name}`);
    } else if (info.isFile()) sources.add(path);
    else skipped.set(path, 'non-regular');
  };
  for (const path of roots) {
    await selected(`source root ${path}`, async () => {
      const absolute = resolve(target.repoRoot, path);
      if (!inside(target.repoRoot, absolute) || absolute === target.repoRoot)
        throw new LiteralInputError(
          'Source roots must be narrow directories inside the repository, never the repository root.',
        );
      if (await symlinkComponent(target.repoRoot, path)) {
        // An external alias is invalid input, even though it will never be read.
        if (!inside(target.repoRoot, await realpath(absolute)))
          throw new LiteralInputError(
            `Source root ${path} resolves outside the repository.`,
          );
        skipped.set(path, 'symlink');
        return;
      }
      if (
        !inside(target.repoRoot, await realpath(absolute)) ||
        !(await stat(absolute)).isDirectory()
      )
        throw new LiteralInputError(
          `Source root ${path} must be a contained directory.`,
        );
      await walk(path);
    });
  }
  const sourceLines: { path: string; lines: string[] }[] = [];
  for (const path of [...sources].sort()) {
    if (!(await containedFile(target.repoRoot, join(target.repoRoot, path))))
      throw new LiteralInputError(
        `Source ${path} is no longer a contained file; rerun with stable inputs.`,
      );
    const decoded = text(
      await selected(`source ${path}`, () =>
        readFile(join(target.repoRoot, path)),
      ),
    );
    if ('reason' in decoded) skipped.set(path, decoded.reason);
    else {
      result.searched.push(path);
      sourceLines.push({
        path,
        lines: decoded.value
          .split(/\r\n|\n|\r/)
          .map((line) => decodeHTMLStrict(line)),
      });
    }
  }
  if (!sourceLines.length)
    throw new LiteralInputError(
      `No readable UTF-8 source files remain after exclusions; correct --source-root/--source-exclude. Skipped: ${
        [...skipped]
          .sort()
          .map(([path, reason]) => `${path} (${reason})`)
          .join(', ') || 'none'
      }.`,
    );
  for (const path of pages) {
    await selected(`page ${path}`, async () => {
      const absolute = resolve(target.contentRoot, path);
      if (
        !/\.mdx?$/.test(path) ||
        isExcludedPath(target.matcher, path) ||
        (await symlinkComponent(target.contentRoot, path)) ||
        !(await containedFile(target.contentRoot, absolute))
      )
        throw new LiteralInputError(
          `Page ${path} must be readable reader Markdown inside the content root, outside nonReaderPaths, with no symlink components below the content root.`,
        );
      const canonical = posix(
        relative(await realpath(target.contentRoot), await realpath(absolute)),
      );
      if (canonical !== path)
        throw new LiteralInputError(
          `Page ${path} must use its canonical content-relative spelling: ${canonical}.`,
        );
      const decoded = text(await readFile(absolute));
      if ('reason' in decoded)
        throw new LiteralInputError(
          `Page ${path} must be UTF-8 Markdown text.`,
        );
      const page = parsePage(path, decoded.value);
      if (page.frontmatterError)
        throw new LiteralInputError(
          `Page ${path} has invalid YAML frontmatter.`,
        );
      for (const node of page.nodes) {
        if (node.type !== 'inlineCode') continue;
        const literal = node.value ?? '';
        const normalized = decodeHTMLStrict(literal);
        const candidate: Candidate = {
          path,
          line: node.position?.start.line ?? 1,
          literal,
          normalized,
          status: 'not-found',
        };
        for (const source of sourceLines) {
          const index = source.lines.findIndex((line) =>
            line.includes(normalized),
          );
          if (index >= 0) {
            candidate.status = 'found';
            candidate.source = { path: source.path, line: index + 1 };
            break;
          }
        }
        result.literals.push(candidate);
      }
    });
  }
  result.status = 'ok';
  result.skipped = [...skipped]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([path, reason]) => ({ path, reason }));
  return result;
}
