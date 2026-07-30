import { normalizeReviewPath } from './review-paths';
import type { ChangeFileV1, ChangeStatus } from './types';

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
