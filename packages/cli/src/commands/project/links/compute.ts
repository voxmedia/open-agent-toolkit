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
  ref?: string;
}

export async function computeLinksInput(
  target: SyncTarget,
  git: GitRunner,
  options: ComputeLinksOptions,
): Promise<LinksInput> {
  const selectedRef = options.ref ?? target.ref;
  await git.run(['fetch', target.remote, `+${selectedRef}:${selectedRef}`], {
    cwd: target.repoRoot,
  });
  const [sha, tree, origin] = await Promise.all([
    git.run(['rev-parse', selectedRef], { cwd: target.repoRoot }),
    git.run(['ls-tree', '--name-only', selectedRef], { cwd: target.repoRoot }),
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
    ref: selectedRef,
    originUrl: origin.stdout,
    present,
    ...(options.durableSummaryPath
      ? { durableSummaryPath: options.durableSummaryPath }
      : {}),
    pinnedAt: options.now.toISOString().slice(0, 10),
  };
}
