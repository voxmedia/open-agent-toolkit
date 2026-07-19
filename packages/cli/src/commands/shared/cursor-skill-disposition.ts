import { access } from 'node:fs/promises';
import { basename, relative, resolve } from 'node:path';

import { appendKnownStray } from '@config/sync-config';
import { CliError } from '@errors/index';
import { toPosixPath } from '@fs/paths';
import type { Manifest } from '@manifest/manifest.types';
import type { PathMapping } from '@providers/shared/adapter.types';

import { adoptStrayToCanonical } from './adopt-stray';

export type CursorSkillDisposition = 'adopt' | 'keep';

export interface CursorSkillCandidate {
  provider: string;
  report: {
    providerPath: string;
  };
  mapping: PathMapping;
}

interface ApplyCursorSkillDispositionOptions {
  replaceCanonical?: boolean;
}

export function isCursorSkillCandidate(
  candidate: CursorSkillCandidate,
): boolean {
  const providerPath = toPosixPath(candidate.report.providerPath);
  return (
    candidate.provider === 'cursor' &&
    candidate.mapping.contentType === 'skill' &&
    candidate.mapping.nativeRead &&
    (providerPath === '.cursor/skills' ||
      providerPath.startsWith('.cursor/skills/'))
  );
}

export async function applyCursorSkillDisposition(
  scopeRoot: string,
  candidate: CursorSkillCandidate,
  manifest: Manifest,
  disposition: CursorSkillDisposition,
  syncConfigPath: string,
  options: ApplyCursorSkillDispositionOptions = {},
): Promise<Manifest> {
  if (!isCursorSkillCandidate(candidate)) {
    throw new CliError(
      `Cannot apply a Cursor skill disposition to ${candidate.report.providerPath}.`,
    );
  }

  if (disposition === 'adopt') {
    return adoptStrayToCanonical(scopeRoot, candidate, manifest, options);
  }

  await assertCursorOnlyNameAvailable(scopeRoot, candidate);
  await appendKnownStray(syncConfigPath, candidate.report.providerPath);
  return manifest;
}

async function assertCursorOnlyNameAvailable(
  scopeRoot: string,
  candidate: CursorSkillCandidate,
): Promise<void> {
  const canonicalPath = resolve(
    scopeRoot,
    candidate.mapping.canonicalDir,
    basename(candidate.report.providerPath),
  );
  if (!(await pathExists(canonicalPath))) {
    return;
  }

  throw new CliError(
    `Cannot keep ${candidate.report.providerPath} Cursor-only because canonical skill ${toPosixPath(
      relative(scopeRoot, canonicalPath),
    )} has the same name. Rename one skill, then run the command again.`,
  );
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}
