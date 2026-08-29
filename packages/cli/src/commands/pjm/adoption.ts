import { access } from 'node:fs/promises';
import { join } from 'node:path';

import { readOatConfig, type OatConfig } from '@config/oat-config';

import { CANONICAL_REPO_REFERENCE_PATHS } from './init';

export type PjmAdoptionState =
  | 'declared'
  | 'inferred-legacy'
  | 'partial-initialization'
  | 'none';

export interface PjmAdoption {
  state: PjmAdoptionState;
  repoRoot: string;
  recovery: 'oat pjm init' | null;
}

export interface ResolvePjmAdoptionOptions {
  projectRoot: string;
  repoRoot: string;
  config?: OatConfig;
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch (error) {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === 'ENOENT'
    ) {
      return false;
    }
    throw error;
  }
}

export async function resolvePjmAdoption(
  options: ResolvePjmAdoptionOptions,
): Promise<PjmAdoption> {
  const config = options.config ?? (await readOatConfig(options.projectRoot));
  if (config.pjm?.initialized === true) {
    return {
      state: 'declared',
      repoRoot: options.repoRoot,
      recovery: null,
    };
  }

  let present = 0;
  for (const relativePath of CANONICAL_REPO_REFERENCE_PATHS) {
    if (await pathExists(join(options.repoRoot, relativePath))) {
      present += 1;
    }
  }

  if (present === CANONICAL_REPO_REFERENCE_PATHS.length) {
    return {
      state: 'inferred-legacy',
      repoRoot: options.repoRoot,
      recovery: null,
    };
  }

  return {
    state: present > 0 ? 'partial-initialization' : 'none',
    repoRoot: options.repoRoot,
    recovery: 'oat pjm init',
  };
}
