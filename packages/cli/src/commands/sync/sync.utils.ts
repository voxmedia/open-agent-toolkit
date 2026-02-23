import type { ScopeSyncPlan } from './sync.types';

export function countPlannedOperations(scopePlans: ScopeSyncPlan[]): number {
  return scopePlans.reduce((total, scopePlan) => {
    const codexOperations =
      scopePlan.codexExtension?.operations.filter(
        (entry) => entry.action !== 'skip',
      ).length ?? 0;
    return (
      total +
      [...scopePlan.plan.entries, ...scopePlan.plan.removals].filter(
        (entry) => entry.operation !== 'skip',
      ).length +
      codexOperations
    );
  }, 0);
}
