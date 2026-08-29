import { join } from 'node:path';

import {
  applyManagedBlock,
  type ApplyManagedBlockResult,
} from './managed-block';

const GITATTRIBUTES_ENTRIES = [
  '.oat/projects/shared/** linguist-generated=true',
];

export type ApplyOatCoreGitattributesResult = ApplyManagedBlockResult;

export async function applyOatCoreGitattributes(
  repoRoot: string,
): Promise<ApplyOatCoreGitattributesResult> {
  return applyManagedBlock(join(repoRoot, '.gitattributes'), {
    start: '# OAT core',
    end: '# END OAT core',
    entries: GITATTRIBUTES_ENTRIES,
  });
}
