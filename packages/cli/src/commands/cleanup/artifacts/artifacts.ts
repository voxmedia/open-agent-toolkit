import { Command } from 'commander';
import type { CleanupActionRecord } from '../cleanup.types';
import { findDuplicateChains, selectLatestFromChain } from './artifacts.utils';

export function planDuplicatePruneActions(
  candidates: string[],
): CleanupActionRecord[] {
  const actions: CleanupActionRecord[] = [];
  const chains = findDuplicateChains(candidates);

  for (const chain of chains) {
    const latest = selectLatestFromChain(chain);
    for (const entry of chain.entries) {
      if (entry.target === latest) {
        continue;
      }

      actions.push({
        type: 'delete',
        target: entry.target,
        reason: `duplicate chain prune (latest kept: ${latest})`,
        phase: 'duplicate-prune',
        result: 'planned',
      });
    }
  }

  return actions;
}

export function createCleanupArtifactsCommand(): Command {
  return new Command('artifacts').description(
    'Cleanup stale review and external-plan artifacts',
  );
}
