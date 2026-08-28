import { relative } from 'node:path';

import { normalizeToPosixPath } from '@fs/paths';
import type { ConcreteScope } from '@shared/types';

import type { PackName } from './types';

/**
 * Path presentation for managed pack diagnostics. `oat status` and `oat doctor`
 * both render the same inventory model, and this is the code that implements
 * the "diagnostics never echo unrelated home content" guarantee, so it lives in
 * one place rather than being duplicated per command.
 */
export interface PackPathRoots {
  projectRoot?: string;
  userRoot?: string;
}

export const MAX_REPORTED_PACK_PATHS = 3;

/**
 * Renders a managed path relative to the scope root that owns it. User-scope
 * paths collapse to `~/...` so diagnostics never echo unrelated home content.
 */
export function formatPackPath(path: string, roots: PackPathRoots): string {
  const normalized = normalizeToPosixPath(path);
  for (const [root, prefix] of [
    [roots.projectRoot, ''],
    [roots.userRoot, '~/'],
  ] as const) {
    if (!root) continue;
    const normalizedRoot = normalizeToPosixPath(root);
    if (
      normalized === normalizedRoot ||
      normalized.startsWith(`${normalizedRoot}/`)
    ) {
      return `${prefix}${normalizeToPosixPath(relative(root, path))}`;
    }
  }
  return normalized;
}

export function formatPackPaths(paths: string[], roots: PackPathRoots): string {
  const shown = paths
    .slice(0, MAX_REPORTED_PACK_PATHS)
    .map((path) => formatPackPath(path, roots));
  const remaining = paths.length - shown.length;
  return remaining > 0
    ? `${shown.join(', ')}, +${remaining} more`
    : shown.join(', ');
}

export function updatePackRecovery(
  pack: PackName,
  scope: ConcreteScope,
): string {
  return `oat tools update --pack ${pack} --scope ${scope}`;
}
