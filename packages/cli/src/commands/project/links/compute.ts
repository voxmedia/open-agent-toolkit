import type { GitRunner } from '@commands/project/sync/git';
import type { SyncTarget } from '@commands/project/sync/ref-sync';

import {
  LINKABLE_ARTIFACTS,
  type LinkableArtifact,
  type LinksInput,
} from './render';

export interface ComputeLinksOptions {
  durableSummaryPath?: string;
  now: Date;
}

export async function computeLinksInput(
  target: SyncTarget,
  git: GitRunner,
  options: ComputeLinksOptions,
): Promise<LinksInput> {
  await git.run(['fetch', target.remote, `+${target.ref}:${target.ref}`], {
    cwd: target.repoRoot,
  });
  const [sha, tree, origin] = await Promise.all([
    git.run(['rev-parse', target.ref], { cwd: target.repoRoot }),
    git.run(['ls-tree', '--name-only', target.ref], { cwd: target.repoRoot }),
    git.run(['remote', 'get-url', target.remote], { cwd: target.repoRoot }),
  ]);
  const treeNames = new Set(
    tree.stdout
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean),
  );
  const present = LINKABLE_ARTIFACTS.filter((artifact) =>
    treeNames.has(artifact),
  ) as LinkableArtifact[];
  return {
    slug: target.slug,
    sha: sha.stdout,
    ref: target.ref,
    originUrl: origin.stdout,
    present,
    ...(options.durableSummaryPath
      ? { durableSummaryPath: options.durableSummaryPath }
      : {}),
    pinnedAt: options.now.toISOString().slice(0, 10),
  };
}
