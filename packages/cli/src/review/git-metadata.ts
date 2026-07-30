import { normalizeReviewPath } from './review-paths';
import type { ChangeFileV1, ChangeStatus } from './types';

export interface NumstatEntry {
  path: string;
  previousPath?: string;
  additions: number | null;
  deletions: number | null;
  isBinary: boolean;
}

export interface MergedChangeMetadata {
  files: ChangeFileV1[];
  totals: {
    additions: number;
    deletions: number;
    binaryFiles: number;
    numstatChangedLines: number;
    numstatTokenDenialEstimate: number;
  };
}

function decode(output: Buffer): string {
  return new TextDecoder('utf-8', { fatal: true }).decode(output);
}

function baseFile(path: string, status: ChangeStatus): ChangeFileV1 {
  return {
    path,
    status,
    isBinary: false,
    additions: null,
    deletions: null,
    generatedHint: false,
    bookkeepingHint: false,
  };
}

export function parseNameStatusZ(output: Buffer): ChangeFileV1[] {
  if (output.length === 0) return [];
  const source = decode(output);
  if (!source.endsWith('\0')) {
    throw new Error('name-status output must end with NUL');
  }
  const fields = source.split('\0');
  fields.pop();
  const files: ChangeFileV1[] = [];
  const seen = new Set<string>();

  for (let index = 0; index < fields.length; ) {
    const code = fields[index++];
    if (!code) throw new Error('name-status row has an empty status');
    const kind = code[0];
    const status: ChangeStatus =
      kind === 'A'
        ? 'added'
        : kind === 'M'
          ? 'modified'
          : kind === 'D'
            ? 'deleted'
            : kind === 'R' && /^R\d{1,3}$/.test(code)
              ? 'renamed'
              : (() => {
                  throw new Error(`unsupported name-status code: ${code}`);
                })();

    const firstPath = fields[index++];
    if (!firstPath) throw new Error('name-status row is missing a path');
    let file: ChangeFileV1;
    if (status === 'renamed') {
      const currentPath = fields[index++];
      if (!currentPath) throw new Error('rename row is missing its new path');
      file = {
        ...baseFile(normalizeReviewPath(currentPath), status),
        previousPath: normalizeReviewPath(firstPath),
      };
    } else {
      file = baseFile(normalizeReviewPath(firstPath), status);
    }
    if (seen.has(file.path)) {
      throw new Error(`duplicate name-status path: ${file.path}`);
    }
    seen.add(file.path);
    files.push(file);
  }
  return files.sort((left, right) => left.path.localeCompare(right.path));
}

function parseCount(value: string, field: string): number {
  if (!/^(0|[1-9]\d*)$/.test(value)) {
    throw new Error(`invalid numstat ${field}: ${value}`);
  }
  const count = Number(value);
  if (!Number.isSafeInteger(count)) {
    throw new Error(`numstat ${field} exceeds safe integer range`);
  }
  return count;
}

export function parseNumstatZ(output: Buffer): NumstatEntry[] {
  if (output.length === 0) return [];
  const source = decode(output);
  if (!source.endsWith('\0')) {
    throw new Error('numstat output must end with NUL');
  }
  const fields = source.split('\0');
  fields.pop();
  const entries: NumstatEntry[] = [];
  const seen = new Set<string>();
  for (let index = 0; index < fields.length; ) {
    const row = fields[index++];
    const match = /^([^\t]+)\t([^\t]+)\t(.*)$/.exec(row ?? '');
    if (!match) throw new Error('malformed numstat row');
    const [, added = '', deleted = '', rawPath = ''] = match;
    const binary = added === '-' && deleted === '-';
    if (!binary && (added === '-' || deleted === '-')) {
      throw new Error('numstat binary markers must be paired');
    }

    let path: string;
    let previousPath: string | undefined;
    if (rawPath === '') {
      const oldPath = fields[index++];
      const newPath = fields[index++];
      if (!oldPath || !newPath) {
        throw new Error('numstat rename row is incomplete');
      }
      previousPath = normalizeReviewPath(oldPath);
      path = normalizeReviewPath(newPath);
    } else {
      path = normalizeReviewPath(rawPath);
    }
    if (seen.has(path)) throw new Error(`duplicate numstat path: ${path}`);
    seen.add(path);
    entries.push({
      path,
      ...(previousPath === undefined ? {} : { previousPath }),
      additions: binary ? null : parseCount(added, 'additions'),
      deletions: binary ? null : parseCount(deleted, 'deletions'),
      isBinary: binary,
    });
  }
  return entries.sort((left, right) => left.path.localeCompare(right.path));
}

function generatedHint(path: string): boolean {
  return (
    /(?:^|\/)(?:dist|build|vendor|generated)\//.test(path) ||
    /\.(?:min\.(?:js|css)|map)$/.test(path)
  );
}

function bookkeepingHint(path: string): boolean {
  return (
    path.startsWith('.oat/') ||
    /(?:^|\/)(?:pnpm-lock\.yaml|package-lock\.json|yarn\.lock)$/.test(path)
  );
}

export function mergeChangeMetadata(
  status: readonly ChangeFileV1[],
  numstat: readonly NumstatEntry[],
): MergedChangeMetadata {
  const rows = new Map(numstat.map((entry) => [entry.path, entry]));
  if (rows.size !== numstat.length) throw new Error('duplicate numstat paths');
  const files = status.map((file) => {
    const row = rows.get(file.path);
    if (!row) throw new Error(`missing numstat path: ${file.path}`);
    rows.delete(file.path);
    if (file.status === 'renamed' && row.previousPath !== file.previousPath) {
      throw new Error(`conflicting rename provenance for ${file.path}`);
    }
    if (file.status !== 'renamed' && row.previousPath !== undefined) {
      throw new Error(`unexpected rename numstat for ${file.path}`);
    }
    return {
      ...file,
      isBinary: row.isBinary,
      additions: row.additions,
      deletions: row.deletions,
      generatedHint: generatedHint(file.path),
      bookkeepingHint: bookkeepingHint(file.path),
    };
  });
  if (rows.size > 0) {
    throw new Error(
      `numstat contains unknown path: ${rows.keys().next().value}`,
    );
  }
  files.sort((left, right) => left.path.localeCompare(right.path));
  const additions = files.reduce((sum, file) => sum + (file.additions ?? 0), 0);
  const deletions = files.reduce((sum, file) => sum + (file.deletions ?? 0), 0);
  const numstatChangedLines = additions + deletions;
  return {
    files,
    totals: {
      additions,
      deletions,
      binaryFiles: files.filter((file) => file.isBinary).length,
      numstatChangedLines,
      numstatTokenDenialEstimate: Math.ceil(numstatChangedLines / 4),
    },
  };
}
