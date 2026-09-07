import type { CanonicalEntry } from '@engine/index';

export type MaterializationAction = 'create' | 'update' | 'remove' | 'skip';

export interface MaterializationOperation<
  TProvider extends string = string,
  TTarget extends string = string,
> {
  provider: TProvider;
  action: MaterializationAction;
  target: TTarget;
  path: string;
  reason: string;
  entryName?: string;
}

export interface MaterializationWriteOperation<
  TProvider extends string = string,
  TTarget extends string = string,
> extends MaterializationOperation<TProvider, TTarget> {
  content?: string;
}

export interface MaterializationPlan<
  TProvider extends string = string,
  TTarget extends string = string,
  TMetadata = unknown,
> {
  provider: TProvider;
  operations: MaterializationWriteOperation<TProvider, TTarget>[];
  managedEntries: string[];
  aggregateHash: string;
  metadata: TMetadata;
}

export interface MaterializationApplyResult {
  applied: number;
  failed: number;
  skipped: number;
  /** Additive per-operation evidence; optional for legacy extensions. */
  operations?: MaterializationOperationResult[];
}

export type MaterializationOperationStatus =
  | 'changed'
  | 'current'
  | 'missing'
  | 'failed'
  | 'unsupported'
  | 'unknown';

export interface MaterializationOperationResult {
  provider: string;
  target: string;
  path: string;
  entryName?: string;
  action: MaterializationAction;
  status: MaterializationOperationStatus;
  failure?: string;
}

export interface MaterializationContext<TOptions = undefined> {
  scopeRoot: string;
  canonicalEntries: CanonicalEntry[];
  allowedCanonicalPaths?: string[];
  options: TOptions;
}

export interface MaterializationExtension<
  TPlan extends MaterializationPlan = MaterializationPlan,
  TContext extends MaterializationContext<unknown> =
    MaterializationContext<unknown>,
> {
  provider: TPlan['provider'];
  computePlan(context: TContext): Promise<TPlan>;
  applyPlan(
    scopeRoot: string,
    plan: TPlan,
  ): Promise<MaterializationApplyResult>;
}

export interface MaterializationPlanSummary {
  plannedOperations: number;
  skipped: number;
}

export function hasMaterializationChanges(plan: MaterializationPlan): boolean {
  return plan.operations.some((operation) => operation.action !== 'skip');
}

export function summarizeMaterializationPlan(
  plan: MaterializationPlan,
): MaterializationPlanSummary {
  let plannedOperations = 0;
  let skipped = 0;

  for (const operation of plan.operations) {
    if (operation.action === 'skip') {
      skipped += 1;
    } else {
      plannedOperations += 1;
    }
  }

  return { plannedOperations, skipped };
}

export function toMaterializationOperations<
  TProvider extends string,
  TTarget extends string,
>(
  plan: MaterializationPlan<TProvider, TTarget, unknown>,
): MaterializationOperation<TProvider, TTarget>[] {
  return plan.operations.map((operation) => ({
    provider: operation.provider,
    action: operation.action,
    target: operation.target,
    path: operation.path,
    reason: operation.reason,
    entryName: operation.entryName,
  }));
}
