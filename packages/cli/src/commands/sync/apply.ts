import type { CommandContext } from '@app/command-context';
import type { SyncOperationResult } from '@engine/engine.types';
import type { SyncPlan, SyncResult } from '@engine/index';
import type { MaterializationOperationResult } from '@providers/shared/materialization-extension';
import {
  getProviderRegistrations,
  type ManagedContentKind,
} from '@providers/shared/registry';
import {
  adviseProviderRefresh,
  type ProviderMaterializationState,
  type ProviderVisibilityEvidence,
} from '@providers/shared/restart-adviser';
import type { ConcreteScope } from '@shared/types';

import type {
  ScopeSyncPlan,
  SyncCommandDependencies,
  SyncSummary,
} from './sync.types';
import { countPlannedOperations } from './sync.utils';

interface ProviderRefreshAdvice {
  scope: ConcreteScope;
  provider: string;
  contentKind: ManagedContentKind;
  materialization: ProviderMaterializationState;
  visibility: ProviderVisibilityEvidence;
}

interface CoreApplyEvidence {
  plan: SyncPlan;
  operationResults: readonly SyncOperationResult[];
  aggregateOnly: boolean;
  aggregate: Pick<SyncResult, 'applied' | 'failed' | 'skipped'>;
}

function buildProviderRefreshAdvice(input: {
  operationResults: readonly SyncOperationResult[];
  extensionResults: readonly (MaterializationOperationResult & {
    scope: ConcreteScope;
  })[];
}): ProviderRefreshAdvice[] {
  const changed = [
    ...input.operationResults
      .filter(({ status }) => status === 'changed')
      .map(({ scope, provider, contentKind }) => ({
        scope,
        provider,
        contentKind,
      })),
    ...input.extensionResults
      .filter(({ status, target }) => status === 'changed' && target === 'role')
      .map(({ scope, provider }) => ({
        scope,
        provider,
        contentKind: 'agent' as const,
      })),
  ];
  const seen = new Set<string>();
  const registrations = getProviderRegistrations();

  return changed.flatMap(({ scope, provider, contentKind }) => {
    const key = `${scope}:${provider}:${contentKind}`;
    if (seen.has(key)) return [];
    seen.add(key);
    const policy = registrations
      .find(({ adapter }) => adapter.name === provider)
      ?.capabilities.find(
        (capability) =>
          capability.scope === scope && capability.contentKind === contentKind,
      )?.catalogRefresh ?? {
      state: 'unknown' as const,
      reason: 'Provider or capability is not registered',
    };
    return [
      {
        scope,
        provider,
        contentKind,
        materialization: 'changed' as const,
        visibility: adviseProviderRefresh({
          policy,
          materialization: 'changed',
        }),
      },
    ];
  });
}

function formatProviderRefreshAdvice(
  advice: readonly ProviderRefreshAdvice[],
): string {
  return advice
    .map(({ scope, provider, contentKind, visibility }) => {
      const recovery = visibility.recovery[0]?.message;
      return `Provider visibility [${scope}] ${provider}/${contentKind}: ${visibility.state} — ${recovery ?? visibility.reason}`;
    })
    .join('\n');
}

function countSkippedExtensionEntries(scopePlans: ScopeSyncPlan[]): number {
  return scopePlans.reduce((total, scopePlan) => {
    const extensionSkipped = scopePlan.materializationExtensions.reduce(
      (count, extension) =>
        count +
        extension.operations.filter((operation) => operation.action === 'skip')
          .length,
      0,
    );
    return total + extensionSkipped;
  }, 0);
}

function buildSummary(
  scopePlans: ScopeSyncPlan[],
  coreApplied: number,
  coreFailed: number,
  coreSkipped: number,
  extensionApplied: number,
  extensionFailed: number,
): SyncSummary {
  return {
    plannedOperations: countPlannedOperations(scopePlans),
    applied: coreApplied + extensionApplied,
    failed: coreFailed + extensionFailed,
    skipped: coreSkipped + countSkippedExtensionEntries(scopePlans),
  };
}

function normalizeOperationResults(
  plan: SyncPlan,
  result: SyncResult,
): SyncOperationResult[] {
  if (result.operations) {
    return result.operations;
  }

  const plannedOperations = [...plan.entries, ...plan.removals];
  return plannedOperations.map((operation) => {
    return {
      scope: plan.scope,
      provider: operation.provider,
      contentKind: operation.canonical.type,
      asset: operation.canonical.name,
      action: operation.operation,
      status: operation.operation === 'skip' ? 'current' : 'unknown',
    };
  });
}

function materializationOperationIdentity(operation: {
  provider: string;
  target: string;
  path: string;
  action: string;
  entryName?: string;
}): string {
  return JSON.stringify([
    operation.provider,
    operation.target,
    operation.path,
    operation.action,
    operation.entryName ?? null,
  ]);
}

function syncOperationIdentity(operation: {
  scope: string;
  provider: string;
  contentKind: string;
  asset: string;
  action: string;
}): string {
  return JSON.stringify([
    operation.scope,
    operation.provider,
    operation.contentKind,
    operation.asset,
    operation.action,
  ]);
}

function coreHumanStatus(
  status: SyncOperationResult['status'] | undefined,
): 'changed' | 'current' | 'failed' | 'missing' | 'unknown' {
  switch (status) {
    case 'changed':
    case 'current':
    case 'failed':
    case 'missing':
    case 'unknown':
      return status;
    default:
      return 'unknown';
  }
}

function formatCoreResults(
  plan: SyncPlan,
  evidence: CoreApplyEvidence | undefined,
  dependencies: SyncCommandDependencies,
): string {
  const operations = [...plan.entries, ...plan.removals];
  if (operations.length === 0) {
    return dependencies.formatSyncPlan(plan, true);
  }

  const resultsByIdentity = new Map(
    (evidence?.operationResults ?? []).map((result) => [
      syncOperationIdentity(result),
      result,
    ]),
  );
  const lines = operations.map((operation) => {
    const result = resultsByIdentity.get(
      syncOperationIdentity({
        scope: plan.scope,
        provider: operation.provider,
        contentKind: operation.canonical.type,
        asset: operation.canonical.name,
        action: operation.operation,
      }),
    );
    const status = coreHumanStatus(result?.status);
    const failure = result?.failure ? ` — ${result.failure}` : '';
    return `- ${plan.scope}:${operation.provider}:${operation.canonical.type}:${operation.operation} ${operation.canonical.name}\n  reason: ${operation.reason}\n  result: ${status}${failure}`;
  });
  const aggregate = evidence?.aggregateOnly
    ? `\nCore aggregate result: applied ${evidence.aggregate.applied}, failed ${evidence.aggregate.failed}, skipped ${evidence.aggregate.skipped}; non-skip named outcomes remain unknown.`
    : '';

  return `Core results${aggregate}\n${lines.join('\n')}`;
}

function formatAppliedOutput(
  scopePlans: ScopeSyncPlan[],
  coreApplyEvidence: readonly CoreApplyEvidence[],
  dependencies: SyncCommandDependencies,
): string {
  if (scopePlans.length === 0) {
    return dependencies.formatSyncPlan(
      {
        scope: 'project',
        entries: [],
        removals: [],
      },
      true,
    );
  }

  return scopePlans
    .map((scopePlan) => {
      const syncOutput = formatCoreResults(
        scopePlan.plan,
        coreApplyEvidence.find((evidence) => evidence.plan === scopePlan.plan),
        dependencies,
      );
      if (scopePlan.materializationExtensions.length === 0) {
        return `Scope: ${scopePlan.scope}\n${syncOutput}`;
      }

      const extensionSections = scopePlan.materializationExtensions.map(
        (extension) => {
          const resultsByIdentity = new Map(
            (extension.operationResults ?? []).map((result) => [
              materializationOperationIdentity(result),
              result,
            ]),
          );
          const lines = extension.operations.map((operation) => {
            const entry = operation.entryName
              ? ` (${operation.entryName})`
              : '';
            const result = resultsByIdentity.get(
              materializationOperationIdentity(operation),
            );
            const status = result?.status ?? 'unknown';
            const failure = result?.failure ? ` — ${result.failure}` : '';
            return `- ${operation.provider}:${operation.target}:${operation.action} ${operation.path}${entry}\n  reason: ${operation.reason}\n  result: ${status}${failure}`;
          });
          return `${extension.provider} extension results\n${lines.join('\n')}`;
        },
      );

      return `Scope: ${scopePlan.scope}\n${syncOutput}\n\n${extensionSections.join('\n\n')}`;
    })
    .join('\n\n');
}

export async function runSyncApply(
  context: CommandContext,
  scopePlans: ScopeSyncPlan[],
  dependencies: SyncCommandDependencies,
): Promise<void> {
  let extensionApplied = 0;
  let extensionFailed = 0;
  let coreApplied = 0;
  let coreFailed = 0;
  let coreSkipped = 0;
  const operationResults: SyncOperationResult[] = [];
  const coreApplyEvidence: CoreApplyEvidence[] = [];
  const extensionOperationResults: Array<
    MaterializationOperationResult & { scope: ConcreteScope }
  > = [];

  for (const scopePlan of scopePlans) {
    const hasSyncEntries =
      scopePlan.plan.entries.length > 0 || scopePlan.plan.removals.length > 0;
    const hasExtensionPlannedOperations =
      scopePlan.materializationExtensionPlans.some((plan) =>
        plan.operations.some((operation) => operation.action !== 'skip'),
      );
    // Derived from the same diagnostic that produced the pre-mutation advisory
    // (`detectVersionSkew` in ./index), so the restamp and the warning cannot
    // drift apart: this manifest is only ever restamped when sync has already
    // reported the provenance the restamp is about to overwrite.
    const shouldRefreshManifestVersion = scopePlan.versionSkew !== undefined;

    if (
      !hasSyncEntries &&
      !hasExtensionPlannedOperations &&
      !shouldRefreshManifestVersion
    ) {
      continue;
    }

    if (hasSyncEntries || shouldRefreshManifestVersion) {
      const result = await dependencies.executeSyncPlan(
        scopePlan.plan,
        scopePlan.manifest,
        scopePlan.manifestPath,
      );
      coreApplied += result.applied;
      coreFailed += result.failed;
      coreSkipped += result.skipped;
      const normalizedResults = normalizeOperationResults(
        scopePlan.plan,
        result,
      );
      operationResults.push(...normalizedResults);
      coreApplyEvidence.push({
        plan: scopePlan.plan,
        operationResults: normalizedResults,
        aggregateOnly: result.operations === undefined,
        aggregate: result,
      });
    }

    for (const plan of scopePlan.materializationExtensionPlans) {
      if (!plan.operations.some((operation) => operation.action !== 'skip')) {
        continue;
      }
      const extension = dependencies
        .getMaterializationExtensions()
        .find((candidate) => candidate.provider === plan.provider);
      if (!extension) {
        throw new Error(
          `Materialization extension ${plan.provider} disappeared before apply.`,
        );
      }
      const result = await dependencies.applyMaterializationExtensionPlan(
        extension,
        scopePlan.scopeRoot,
        plan,
      );
      extensionApplied += result.applied;
      extensionFailed += result.failed;
      extensionOperationResults.push(
        ...(result.operations ?? []).map((operation) => ({
          ...operation,
          scope: scopePlan.scope,
        })),
      );
      const summary = scopePlan.materializationExtensions.find(
        (candidate) => candidate.provider === plan.provider,
      );
      if (summary) {
        summary.applied = result.applied;
        summary.failed = result.failed;
        summary.skipped = result.skipped;
        summary.operationResults = result.operations;
      }
    }
  }

  const summary = buildSummary(
    scopePlans,
    coreApplied,
    coreFailed,
    coreSkipped,
    extensionApplied,
    extensionFailed,
  );
  const providerMismatches = scopePlans
    .map((scopePlan) => scopePlan.providerMismatches)
    .filter((mismatch) => mismatch !== undefined);
  const versionSkew = scopePlans
    .map((scopePlan) => scopePlan.versionSkew)
    .filter((skew) => skew !== undefined);
  const materializationExtensions = scopePlans.flatMap(
    (scopePlan) => scopePlan.materializationExtensions,
  );
  const codexExtensions = materializationExtensions
    .filter((extension) => extension.provider === 'codex')
    .map((extension) => ({
      operations: extension.operations.map((operation) => ({
        action: operation.action,
        target: operation.target as 'role' | 'config',
        path: operation.path,
        reason: operation.reason,
        roleName: operation.entryName,
      })),
      managedRoles: extension.managedEntries,
      aggregateConfigHash: extension.aggregateHash,
      applied: extension.applied,
      failed: extension.failed,
      skipped: extension.skipped,
    }));
  const providerRefreshAdvice = buildProviderRefreshAdvice({
    operationResults,
    extensionResults: extensionOperationResults,
  });
  if (context.json) {
    context.logger.json({
      scope: context.scope,
      dryRun: false,
      plans: scopePlans.map((scopePlan) => scopePlan.plan),
      summary,
      providerMismatches,
      versionSkew,
      materializationExtensions,
      operationResults,
      codexExtensions,
      providerRefreshAdvice,
    });
  } else {
    context.logger.info(
      formatAppliedOutput(scopePlans, coreApplyEvidence, dependencies),
    );
    if (summary.plannedOperations === 0) {
      context.logger.info('\nNo changes required.');
    } else if (summary.failed > 0) {
      context.logger.warn('\nSync completed with partial failures.');
    } else {
      context.logger.success('\nSync applied successfully.');
    }
    if (providerRefreshAdvice.length > 0) {
      context.logger.info(
        `\n${formatProviderRefreshAdvice(providerRefreshAdvice)}`,
      );
    }
  }

  process.exitCode = summary.failed > 0 ? 1 : 0;
}
