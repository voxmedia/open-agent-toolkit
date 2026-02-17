import type { ScopeSyncPlan } from './sync.types';

export function countPlannedOperations(scopePlans: ScopeSyncPlan[]): number {
  return scopePlans.reduce((total, scopePlan) => {
    return (
      total +
      [...scopePlan.plan.entries, ...scopePlan.plan.removals].filter(
        (entry) => entry.operation !== 'skip',
      ).length
    );
  }, 0);
}
