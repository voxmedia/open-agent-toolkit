import { access } from 'node:fs/promises';
import { basename, relative, resolve } from 'node:path';

import { appendKnownStray } from '@config/sync-config';
import { CliError } from '@errors/index';
import { toPosixPath } from '@fs/paths';
import type { Manifest } from '@manifest/manifest.types';
import type { PathMapping } from '@providers/shared/adapter.types';

import { adoptStrayToCanonical } from './adopt-stray';

export type NativeSkillDisposition = 'adopt' | 'keep';

export interface NativeSkillCandidate {
  provider: string;
  report: {
    providerPath: string;
  };
  mapping: PathMapping;
}

export interface NativeSkillProviderDetails {
  displayName: string;
  sourceDir: string;
}

interface ApplyNativeSkillDispositionOptions {
  replaceCanonical?: boolean;
}

const NATIVE_SKILL_PROVIDER_DISPLAY_NAMES: Readonly<Record<string, string>> = {
  copilot: 'Copilot',
  cursor: 'Cursor',
};

export function getNativeSkillProviderDetails(
  candidate: NativeSkillCandidate,
): NativeSkillProviderDetails | null {
  if (
    candidate.mapping.contentType !== 'skill' ||
    !candidate.mapping.nativeRead
  ) {
    return null;
  }

  const providerPath = toPosixPath(candidate.report.providerPath);
  const sourceDir = candidate.mapping.adoptionSourceDirs?.find(
    (directory) =>
      providerPath === directory || providerPath.startsWith(`${directory}/`),
  );
  if (!sourceDir) {
    return null;
  }

  const displayName =
    NATIVE_SKILL_PROVIDER_DISPLAY_NAMES[candidate.provider] ??
    formatProviderName(candidate.provider);
  return { displayName, sourceDir };
}

function formatProviderName(provider: string): string {
  return provider.length === 0
    ? 'Provider'
    : `${provider.charAt(0).toUpperCase()}${provider.slice(1)}`;
}

export function isNativeSkillCandidate(
  candidate: NativeSkillCandidate,
): boolean {
  return getNativeSkillProviderDetails(candidate) !== null;
}

export async function applyNativeSkillDisposition(
  scopeRoot: string,
  candidate: NativeSkillCandidate,
  manifest: Manifest,
  disposition: NativeSkillDisposition,
  syncConfigPath: string,
  options: ApplyNativeSkillDispositionOptions = {},
): Promise<Manifest> {
  const provider = getNativeSkillProviderDetails(candidate);
  if (!provider) {
    throw new CliError(
      `Cannot apply a native skill disposition to ${candidate.report.providerPath}.`,
    );
  }

  if (disposition === 'adopt') {
    return adoptStrayToCanonical(scopeRoot, candidate, manifest, options);
  }

  await assertProviderOnlyNameAvailable(scopeRoot, candidate, provider);
  await appendKnownStray(syncConfigPath, candidate.report.providerPath);
  return manifest;
}

async function assertProviderOnlyNameAvailable(
  scopeRoot: string,
  candidate: NativeSkillCandidate,
  provider: NativeSkillProviderDetails,
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
    `Cannot keep ${candidate.report.providerPath} ${provider.displayName}-only because canonical skill ${toPosixPath(
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
