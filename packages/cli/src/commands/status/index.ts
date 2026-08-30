import { basename, join, relative } from 'node:path';

import {
  buildCommandContext,
  type CommandContext,
  type GlobalOptions,
} from '@app/command-context';
import {
  resolvePjmAdoption,
  type PjmAdoption,
  type ResolvePjmAdoptionOptions,
} from '@commands/pjm/adoption';
import {
  adoptStrayToCanonical,
  isAdoptionConflictError,
  isAdoptionSourceUnavailableError,
} from '@commands/shared/adopt-stray';
import {
  type CodexRoleStray,
  detectCodexRoleStrays,
  filterMaterializationManagedStrays,
  regenerateCodexAfterAdoption,
} from '@commands/shared/codex-strays';
import {
  applyNativeSkillDisposition,
  getNativeSkillProviderDetails,
  isNativeSkillCandidate,
  type NativeSkillDisposition,
} from '@commands/shared/native-skill-disposition';
import { withScopeOption } from '@commands/shared/scope-option';
import {
  confirmAction,
  type MultiSelectChoice,
  type PromptContext,
  type SelectChoice,
  selectManyWithAbort,
  selectWithAbort,
} from '@commands/shared/shared.prompts';
import {
  readGlobalOptions,
  resolveConcreteScopes,
} from '@commands/shared/shared.utils';
import {
  attributeSharedOwnerDiagnostics,
  hasScopedPackPlacementEvidence,
  inventoryPack,
  type InventoryPackInput,
  type PackDiagnostic,
  type PackInventory,
  type ScopedPackInventory,
} from '@commands/tools/shared/pack-inventory';
import { PACK_NAMES } from '@commands/tools/shared/pack-manifest';
import {
  formatPackPath,
  formatPackPaths,
  type PackPathRoots,
  updatePackRecovery,
} from '@commands/tools/shared/pack-paths';
import type { PackIntentSource } from '@commands/tools/shared/scoped-pack-intent';
import type { PackCompleteness, PackName } from '@commands/tools/shared/types';
import {
  DEFAULT_SYNC_CONFIG,
  loadSyncConfig,
  type SyncConfig,
} from '@config/index';
import { resolveUserSyncConfig } from '@config/user-sync-config';
import {
  type CopyTransform,
  type DriftReport,
  detectDrift,
  detectStrays,
  filterKnownStrays,
} from '@drift/index';
import {
  type CanonicalEntry,
  HOOK_DRIFT_WARNING,
  HOOK_STRAY_INFO,
  scanBundledManagedAgents,
  scanCanonical,
} from '@engine/index';
import { resolveAssetsRoot } from '@fs/assets';
import {
  normalizeToPosixPath,
  resolveProjectRoot,
  resolveScopeRoot,
} from '@fs/paths';
import type { Manifest } from '@manifest/index';
import { loadManifest, saveManifest } from '@manifest/manager';
import { claudeAdapter } from '@providers/claude';
import { codexAdapter } from '@providers/codex';
import {
  applyCodexProjectExtensionPlan,
  type CodexExtensionPlan,
  computeCodexProjectExtensionPlan,
} from '@providers/codex/codec/sync-extension';
import { copilotAdapter } from '@providers/copilot';
import { cursorAdapter } from '@providers/cursor';
import {
  applyCursorProjectExtensionPlan,
  computeCursorProjectExtensionPlan,
  type CursorExtensionPlan,
} from '@providers/cursor/codec/sync-extension';
import { geminiAdapter } from '@providers/gemini';
import {
  getConfigAwareAdapters,
  getSyncMappings,
  type PathMapping,
  type MaterializationPlan,
  type ProviderAdapter,
} from '@providers/shared';
import type { AdoptionSource } from '@providers/shared/adapter.types';
import { getAdoptionSources } from '@providers/shared/adapter.utils';
import {
  type ConcreteScope,
  type ContentType,
  SCOPE_CONTENT_TYPES,
  type Scope,
} from '@shared/types';
import { formatStatusTable } from '@ui/output';
import { Command } from 'commander';

const DEFAULT_REMEDIATION = 'Run "oat init" to adopt stray entries.';

interface StatusSummary {
  total: number;
  inSync: number;
  drifted: number;
  missing: number;
  stray: number;
}

interface StatusPackDiagnostic {
  code: PackDiagnostic['code'];
  message: string;
  paths: string[];
  recovery: string | null;
}

interface StatusPackScopeState {
  scope: ConcreteScope;
  intent: PackIntentSource;
  completeness: PackCompleteness;
  stale: number;
  newer: number;
  retainedOverrides: number;
  missing: string[];
  diagnostics: StatusPackDiagnostic[];
  recovery: string | null;
}

interface StatusPackState {
  pack: PackName;
  placement: PackInventory['placement'];
  scopes: StatusPackScopeState[];
  diagnostics: StatusPackDiagnostic[];
}

interface StatusPjmState {
  state: PjmAdoption['state'];
  repoRoot: string;
  recovery: string | null;
}

interface StatusPackReport {
  states: StatusPackState[];
  unavailableScopes: ConcreteScope[];
  pjm: StatusPjmState | null;
}

interface StatusJsonPayload {
  scope: Scope;
  reports: DriftReport[];
  summary: StatusSummary;
  packs: StatusPackReport;
  remediation?: string;
}

interface StatusDependencies {
  buildCommandContext: (options: GlobalOptions) => CommandContext;
  resolveScopeRoot: (
    scope: ConcreteScope,
    context: CommandContext,
  ) => Promise<string>;
  loadManifest: (manifestPath: string) => Promise<Manifest>;
  loadSyncConfig: (configPath: string) => Promise<SyncConfig>;
  resolveUserSyncConfig: (userConfigDir: string) => Promise<SyncConfig>;
  saveManifest: (manifestPath: string, manifest: Manifest) => Promise<void>;
  scanCanonical: (
    scopeRoot: string,
    scope: ConcreteScope,
  ) => Promise<CanonicalEntry[]>;
  scanBundledManagedAgents: () => Promise<CanonicalEntry[]>;
  getAdapters: () => ProviderAdapter[];
  getConfigAwareAdapters: (
    adapters: ProviderAdapter[],
    scopeRoot: string,
    config: SyncConfig,
  ) => Promise<{ activeAdapters: ProviderAdapter[] }>;
  getSyncMappings: (adapter: ProviderAdapter, scope: Scope) => PathMapping[];
  getAdoptionSources: (
    adapter: ProviderAdapter,
    scope: Scope,
  ) => AdoptionSource[];
  detectDrift: (
    entry: Manifest['entries'][number],
    scopeRoot: string,
    copyTransform?: CopyTransform,
  ) => Promise<DriftReport>;
  detectStrays: (
    provider: string,
    providerDir: string,
    manifest: Manifest,
    canonicalEntries: CanonicalEntry[],
    mapping?: Pick<
      PathMapping,
      'contentType' | 'nativeRead' | 'providerExtension'
    >,
  ) => Promise<DriftReport[]>;
  detectCodexRoleStrays: (
    scopeRoot: string,
    canonicalEntries: CanonicalEntry[],
    managedRoleNames?: Set<string>,
  ) => Promise<CodexRoleStray[]>;
  computeCodexProjectExtensionPlan: (
    scopeRoot: string,
    canonicalEntries: CanonicalEntry[],
    allowedCanonicalPaths?: string[],
    options?: { userConfigDir?: string; env?: NodeJS.ProcessEnv },
  ) => Promise<CodexExtensionPlan>;
  applyCodexProjectExtensionPlan: (
    scopeRoot: string,
    plan: CodexExtensionPlan,
  ) => Promise<unknown>;
  computeCursorProjectExtensionPlan: (
    scopeRoot: string,
    canonicalEntries: CanonicalEntry[],
    allowedCanonicalPaths?: string[],
    options?: { userConfigDir?: string; env?: NodeJS.ProcessEnv },
  ) => Promise<CursorExtensionPlan>;
  applyCursorProjectExtensionPlan: (
    scopeRoot: string,
    plan: CursorExtensionPlan,
  ) => Promise<unknown>;
  selectManyWithAbort: <T extends string>(
    message: string,
    choices: MultiSelectChoice<T>[],
    ctx: PromptContext,
  ) => Promise<T[] | null>;
  selectWithAbort: <T extends string>(
    message: string,
    choices: SelectChoice<T>[],
    ctx: PromptContext,
  ) => Promise<T | null>;
  confirmAction: (message: string, ctx: PromptContext) => Promise<boolean>;
  adoptStray: (
    scopeRoot: string,
    stray: StatusStrayCandidate,
    manifest: Manifest,
    options?: { replaceCanonical?: boolean },
  ) => Promise<Manifest>;
  applyNativeSkillDisposition: (
    scopeRoot: string,
    stray: StatusStrayCandidate,
    manifest: Manifest,
    disposition: NativeSkillDisposition,
    syncConfigPath: string,
    options?: { replaceCanonical?: boolean },
  ) => Promise<Manifest>;
  formatStatusTable: (reports: DriftReport[]) => string;
  resolveAssetsRoot: () => Promise<string>;
  inventoryPack: (input: InventoryPackInput) => Promise<PackInventory>;
  resolvePjmAdoption: (
    options: ResolvePjmAdoptionOptions,
  ) => Promise<PjmAdoption>;
}

interface StatusStrayCandidate {
  provider: string;
  report: DriftReport;
  mapping: PathMapping;
  adoption?: {
    kind: 'codex_role';
    roleName: string;
    description?: string;
  };
}

interface ScopeReportCollection {
  scope: ConcreteScope;
  scopeRoot: string;
  manifestPath: string;
  syncConfigPath: string;
  manifest: Manifest;
  reports: DriftReport[];
  strayCandidates: StatusStrayCandidate[];
  activeAdapterNames: string[];
}

const DEFAULT_DEPENDENCIES: StatusDependencies = {
  buildCommandContext,
  async resolveScopeRoot(scope, context) {
    if (scope === 'project') {
      return resolveProjectRoot(context.cwd);
    }

    return resolveScopeRoot(scope, context.cwd, context.home);
  },
  loadManifest,
  async loadSyncConfig(configPath) {
    return loadSyncConfig(configPath, DEFAULT_SYNC_CONFIG);
  },
  resolveUserSyncConfig,
  saveManifest,
  scanCanonical,
  scanBundledManagedAgents,
  getAdapters() {
    return [
      claudeAdapter,
      cursorAdapter,
      codexAdapter,
      copilotAdapter,
      geminiAdapter,
    ];
  },
  getConfigAwareAdapters,
  getSyncMappings,
  getAdoptionSources,
  detectDrift,
  detectStrays,
  detectCodexRoleStrays,
  computeCodexProjectExtensionPlan,
  applyCodexProjectExtensionPlan,
  computeCursorProjectExtensionPlan,
  applyCursorProjectExtensionPlan,
  selectManyWithAbort,
  selectWithAbort,
  confirmAction,
  adoptStray: adoptStrayDefault,
  applyNativeSkillDisposition,
  formatStatusTable,
  resolveAssetsRoot,
  inventoryPack,
  resolvePjmAdoption,
};

function entryInsideMapping(
  entryProviderPath: string,
  mappingProviderDir: string,
): boolean {
  const normalizedEntryPath = normalizeToPosixPath(entryProviderPath);
  const normalizedProviderDir = normalizeToPosixPath(mappingProviderDir);
  return (
    normalizedEntryPath === normalizedProviderDir ||
    normalizedEntryPath.startsWith(`${normalizedProviderDir}/`)
  );
}

function canonicalInsideMapping(
  canonicalPath: string,
  mappingCanonicalDir: string,
): boolean {
  const normalizedCanonicalPath = normalizeToPosixPath(canonicalPath);
  const normalizedCanonicalDir = normalizeToPosixPath(mappingCanonicalDir);
  return (
    normalizedCanonicalPath === normalizedCanonicalDir ||
    normalizedCanonicalPath.startsWith(`${normalizedCanonicalDir}/`)
  );
}

function contentTypeAllowed(
  contentType: ContentType,
  scope: ConcreteScope,
): boolean {
  return SCOPE_CONTENT_TYPES[scope].includes(contentType);
}

function summarizeReports(reports: DriftReport[]): StatusSummary {
  const summary: StatusSummary = {
    total: reports.length,
    inSync: 0,
    drifted: 0,
    missing: 0,
    stray: 0,
  };

  for (const report of reports) {
    if (report.state.status === 'in_sync') {
      summary.inSync += 1;
      continue;
    }

    if (report.state.status === 'drifted') {
      summary.drifted += 1;
      continue;
    }

    if (report.state.status === 'missing') {
      summary.missing += 1;
      continue;
    }

    summary.stray += 1;
  }

  return summary;
}

async function adoptStrayDefault(
  scopeRoot: string,
  stray: StatusStrayCandidate,
  manifest: Manifest,
  options?: { replaceCanonical?: boolean },
): Promise<Manifest> {
  return adoptStrayToCanonical(scopeRoot, stray, manifest, options);
}

function formatPathForScope(
  scope: ConcreteScope,
  providerPath: string,
): string {
  if (scope === 'project') {
    return providerPath;
  }
  if (providerPath.startsWith('./')) {
    return `~/${providerPath.slice(2)}`;
  }
  if (providerPath.startsWith('.')) {
    return `~/${providerPath}`;
  }
  return `~/${providerPath}`;
}

function formatStrayChoiceLabel(
  scope: ConcreteScope,
  providerPath: string,
  provider: string,
): string {
  return `[${scope}] ${basename(providerPath)} (${provider})`;
}

function packDiagnosticRecovery(
  pack: PackName,
  diagnostic: PackDiagnostic,
  scope: ConcreteScope | null,
): string | null {
  if (diagnostic.code === 'duplicate-scope') {
    return `oat tools migrate --pack ${pack} --from project --to user`;
  }
  if (diagnostic.code === 'legacy-false-conflict' && scope) {
    return updatePackRecovery(pack, scope);
  }
  return null;
}

function toStatusPackDiagnostic(
  pack: PackName,
  diagnostic: PackDiagnostic,
  scope: ConcreteScope | null,
  roots: PackPathRoots,
): StatusPackDiagnostic {
  return {
    code: diagnostic.code,
    message: diagnostic.message,
    paths: diagnostic.paths.map((path) => formatPackPath(path, roots)),
    recovery: packDiagnosticRecovery(pack, diagnostic, scope),
  };
}

function toStatusPackScopeState(
  pack: PackName,
  scoped: ScopedPackInventory,
  roots: PackPathRoots,
): StatusPackScopeState {
  const { scope } = scoped;
  const missing = scoped.assets.filter(
    (asset) =>
      asset.definition.ownership[scope] === 'managed' &&
      asset.status === 'missing',
  );
  const stale = scoped.assets.filter(({ status }) => status === 'outdated');
  const newer = scoped.assets.filter(({ status }) => status === 'newer');
  const retainedOverrides = scoped.assets.filter(
    (asset) =>
      asset.definition.ownership[scope] === 'seed-if-missing' &&
      asset.status === 'present',
  );
  const needsRepair = scoped.completeness !== 'complete' || stale.length > 0;
  return {
    scope,
    intent: scoped.intent.source,
    completeness: scoped.completeness,
    stale: stale.length,
    newer: newer.length,
    retainedOverrides: retainedOverrides.length,
    missing: missing.map(({ path }) => formatPackPath(path, roots)),
    diagnostics: scoped.diagnostics.map((diagnostic) =>
      toStatusPackDiagnostic(pack, diagnostic, scope, roots),
    ),
    recovery: needsRepair ? updatePackRecovery(pack, scope) : null,
  };
}

/**
 * Only scope-level diagnostics carry a known scope. Pack-level diagnostics
 * (cross-scope duplication, shared-owner observations) are reported once on
 * the pack itself so no diagnostic is silently dropped or double counted.
 */
function collectPackLevelDiagnostics(
  inventory: PackInventory,
  roots: PackPathRoots,
): StatusPackDiagnostic[] {
  const scopedMessages = new Set(
    inventory.scopes.flatMap(({ diagnostics }) =>
      diagnostics.map(({ message }) => message),
    ),
  );
  return inventory.diagnostics
    .filter(({ message }) => !scopedMessages.has(message))
    .map((diagnostic) =>
      toStatusPackDiagnostic(inventory.pack, diagnostic, null, roots),
    );
}

function toStatusPackState(
  inventory: PackInventory,
  roots: PackPathRoots,
): StatusPackState | null {
  const scopes = inventory.scopes.filter(hasScopedPackPlacementEvidence);
  const diagnostics = collectPackLevelDiagnostics(inventory, roots);
  if (scopes.length === 0 && diagnostics.length === 0) {
    return null;
  }
  return {
    pack: inventory.pack,
    placement: inventory.placement,
    scopes: scopes.map((scoped) =>
      toStatusPackScopeState(inventory.pack, scoped, roots),
    ),
    diagnostics,
  };
}

/**
 * Repository PJM adoption is only actionable when this repository shows PJM
 * intent. User-scope PJM capability is now the default, so an unadopted
 * repository with no project-scope PJM evidence is normal and stays silent.
 */
function shouldReportPjmAdoption(
  adoption: StatusPjmState,
  states: StatusPackState[],
): boolean {
  if (adoption.state === 'partial-initialization') {
    return true;
  }
  if (adoption.state !== 'none') {
    return false;
  }
  const pjm = states.find(({ pack }) => pack === 'project-management');
  return (pjm?.scopes ?? []).some(({ scope }) => scope === 'project');
}

async function collectPackReport(
  scopeRoots: Map<ConcreteScope, string>,
  unavailableScopes: ConcreteScope[],
  userManagedRoleMaterialization: boolean,
  dependencies: StatusDependencies,
): Promise<StatusPackReport> {
  const roots: PackPathRoots = {
    ...(scopeRoots.has('project')
      ? { projectRoot: scopeRoots.get('project')! }
      : {}),
    ...(scopeRoots.has('user') ? { userRoot: scopeRoots.get('user')! } : {}),
  };
  if (scopeRoots.size === 0) {
    return { states: [], unavailableScopes, pjm: null };
  }

  const assetsRoot = await dependencies.resolveAssetsRoot();
  const inventories = attributeSharedOwnerDiagnostics(
    await Promise.all(
      PACK_NAMES.map((pack) =>
        dependencies.inventoryPack({
          pack,
          assetsRoot,
          ...roots,
          ...(scopeRoots.has('user') ? { userManagedRoleMaterialization } : {}),
        }),
      ),
    ),
  );
  const states = inventories
    .map((inventory) => toStatusPackState(inventory, roots))
    .filter((state): state is StatusPackState => state !== null);

  const projectRoot = scopeRoots.get('project');
  if (!projectRoot) {
    return { states, unavailableScopes, pjm: null };
  }

  const adoption = await dependencies.resolvePjmAdoption({
    projectRoot,
    repoRoot: join(projectRoot, '.oat', 'repo'),
  });
  return {
    states,
    unavailableScopes,
    pjm: {
      state: adoption.state,
      // Every other path in this payload is redacted through `formatPackPath`;
      // the PJM repo root follows the same contract rather than emitting a raw
      // absolute path.
      repoRoot: formatPackPath(adoption.repoRoot, roots),
      recovery: adoption.recovery,
    },
  };
}

function describePackScope(state: StatusPackScopeState): string {
  const details: string[] = [state.completeness];
  if (state.missing.length > 0) {
    details.push(`${state.missing.length} missing`);
  }
  if (state.stale > 0) details.push(`${state.stale} stale`);
  if (state.newer > 0) details.push(`${state.newer} newer`);
  if (state.retainedOverrides > 0) {
    details.push(`${state.retainedOverrides} retained override(s)`);
  }
  return `${state.scope} (${details.join(', ')})`;
}

function formatPackReport(report: StatusPackReport): string | null {
  const lines: string[] = [];

  if (report.states.length > 0) {
    lines.push('Pack state:');
    for (const state of report.states) {
      const scopeSummary =
        state.scopes.length > 0
          ? state.scopes.map(describePackScope).join(', ')
          : 'no installed scope';
      lines.push(`  ${state.pack}: ${scopeSummary}`);
      for (const scope of state.scopes) {
        if (scope.missing.length > 0) {
          lines.push(`    Missing: ${formatPackPaths(scope.missing, {})}`);
        }
        for (const diagnostic of scope.diagnostics) {
          lines.push(`    ${diagnostic.code}: ${diagnostic.message}`);
          if (diagnostic.paths.length > 0) {
            lines.push(
              `    Affected: ${formatPackPaths(diagnostic.paths, {})}`,
            );
          }
          if (diagnostic.recovery) {
            lines.push(`    Fix: ${diagnostic.recovery}`);
          }
        }
        if (scope.recovery) {
          lines.push(`    Fix: ${scope.recovery}`);
        }
      }
      for (const diagnostic of state.diagnostics) {
        lines.push(`    ${diagnostic.code}: ${diagnostic.message}`);
        if (diagnostic.paths.length > 0) {
          lines.push(`    Affected: ${formatPackPaths(diagnostic.paths, {})}`);
        }
        if (diagnostic.recovery) {
          lines.push(`    Fix: ${diagnostic.recovery}`);
        }
      }
    }
  }

  for (const scope of report.unavailableScopes) {
    lines.push(
      `${scope} scope is unavailable here; pack state is reported for the remaining scope(s).`,
    );
  }

  if (report.pjm && shouldReportPjmAdoption(report.pjm, report.states)) {
    lines.push(
      report.pjm.state === 'partial-initialization'
        ? 'PJM: this repository has a partial PJM scaffold and has not adopted PJM.'
        : 'PJM: this repository has not adopted PJM.',
    );
    if (report.pjm.recovery) {
      lines.push(`  Fix: ${report.pjm.recovery}`);
    }
  }

  return lines.length > 0 ? lines.join('\n') : null;
}

async function collectScopeReports(
  scope: ConcreteScope,
  context: CommandContext,
  dependencies: StatusDependencies,
): Promise<ScopeReportCollection> {
  const scopeRoot = await dependencies.resolveScopeRoot(scope, context);
  const manifestPath = join(scopeRoot, '.oat', 'sync', 'manifest.json');
  const syncConfigPath = join(scopeRoot, '.oat', 'sync', 'config.json');
  const userConfigDir = join(context.home, '.oat');
  const [manifest, canonicalEntries, syncConfig, userSyncConfig] =
    await Promise.all([
      dependencies.loadManifest(manifestPath),
      dependencies.scanCanonical(scopeRoot, scope),
      dependencies.loadSyncConfig(syncConfigPath),
      dependencies.resolveUserSyncConfig(userConfigDir),
    ]);
  const adapters = dependencies.getAdapters();
  const { activeAdapters } = await dependencies.getConfigAwareAdapters(
    adapters,
    scopeRoot,
    scope === 'user' ? userSyncConfig : syncConfig,
  );
  const reports: DriftReport[] = [];
  const strayCandidates: StatusStrayCandidate[] = [];
  const trackedCanonicalByProvider = new Set(
    manifest.entries.map(
      (entry) =>
        `${entry.provider}|${normalizeToPosixPath(entry.canonicalPath)}`,
    ),
  );
  const activeProviderNames = new Set(
    activeAdapters.map((adapter) => adapter.name),
  );
  const extensionCanonicalEntries =
    scope === 'user' &&
    (activeProviderNames.has('codex') || activeProviderNames.has('cursor'))
      ? [
          ...canonicalEntries,
          ...(await dependencies.scanBundledManagedAgents()),
        ]
      : canonicalEntries;
  const codexExtensionPlan = activeProviderNames.has('codex')
    ? await dependencies.computeCodexProjectExtensionPlan(
        scopeRoot,
        extensionCanonicalEntries,
        undefined,
        { userConfigDir },
      )
    : undefined;
  const cursorExtensionPlan = activeProviderNames.has('cursor')
    ? await dependencies.computeCursorProjectExtensionPlan(
        scopeRoot,
        extensionCanonicalEntries,
        undefined,
        { userConfigDir },
      )
    : undefined;
  const materializationPlans: MaterializationPlan[] = [
    ...(codexExtensionPlan
      ? [
          {
            provider: 'codex',
            operations: codexExtensionPlan.operations.map((operation) => ({
              ...operation,
              provider: 'codex',
              entryName: operation.roleName,
            })),
            managedEntries: codexExtensionPlan.managedRoles,
            aggregateHash: codexExtensionPlan.aggregateConfigHash,
            metadata: codexExtensionPlan.metadata,
          },
        ]
      : []),
    ...(cursorExtensionPlan ? [cursorExtensionPlan] : []),
  ];

  for (const adapter of activeAdapters) {
    const mappings = dependencies.getSyncMappings(adapter, scope);
    const adoptionSources = dependencies.getAdoptionSources(adapter, scope);
    const mappingContentTypes = new Set(
      mappings.map((mapping) => mapping.contentType),
    );

    for (const entry of manifest.entries) {
      if (entry.provider !== adapter.name) {
        continue;
      }
      if (!mappingContentTypes.has(entry.contentType)) {
        continue;
      }
      if (!contentTypeAllowed(entry.contentType, scope)) {
        continue;
      }

      const matchedMapping = mappings.find(
        (mapping) =>
          mapping.contentType === entry.contentType &&
          entryInsideMapping(entry.providerPath, mapping.providerDir),
      );
      if (!matchedMapping) {
        continue;
      }

      const copyTransform = matchedMapping.transformCanonical
        ? { transformCanonical: matchedMapping.transformCanonical }
        : undefined;

      reports.push(
        await dependencies.detectDrift(entry, scopeRoot, copyTransform),
      );
    }

    for (const mapping of mappings) {
      for (const canonicalEntry of canonicalEntries) {
        if (canonicalEntry.type !== mapping.contentType) {
          continue;
        }

        const canonicalPath = normalizeToPosixPath(
          relative(scopeRoot, canonicalEntry.canonicalPath),
        );
        if (!canonicalInsideMapping(canonicalPath, mapping.canonicalDir)) {
          continue;
        }

        const trackedKey = `${adapter.name}|${canonicalPath}`;
        if (trackedCanonicalByProvider.has(trackedKey)) {
          continue;
        }

        reports.push({
          canonical: canonicalPath,
          provider: adapter.name,
          providerPath: normalizeToPosixPath(
            join(mapping.providerDir, canonicalEntry.name),
          ),
          state: { status: 'missing' },
        });
      }
    }

    for (const source of adoptionSources) {
      const providerDir = join(scopeRoot, source.directory);
      const strays = filterMaterializationManagedStrays(
        (
          await dependencies.detectStrays(
            adapter.name,
            providerDir,
            manifest,
            canonicalEntries,
            source.mapping,
          )
        ).map((report) => ({ provider: adapter.name, report })),
        materializationPlans,
      ).map((candidate) => candidate.report);
      reports.push(...strays);
      for (const stray of strays) {
        if (stray.state.status !== 'stray') {
          continue;
        }
        strayCandidates.push({
          provider: adapter.name,
          report: stray,
          mapping: source.mapping,
        });
      }
    }
  }

  for (const extensionPlan of materializationPlans) {
    for (const operation of extensionPlan.operations) {
      if (operation.action === 'skip') {
        continue;
      }
      if (operation.target === 'role') {
        reports.push({
          canonical: operation.entryName
            ? `.agents/agents/${operation.entryName}.md`
            : null,
          provider: extensionPlan.provider,
          providerPath: operation.path,
          state:
            operation.action === 'create'
              ? { status: 'missing' }
              : { status: 'drifted', reason: 'modified' },
        });
      } else {
        reports.push({
          canonical: null,
          provider: extensionPlan.provider,
          providerPath: operation.path,
          state: { status: 'drifted', reason: 'modified' },
        });
      }
    }
  }

  if (codexExtensionPlan) {
    const codexStrays = await dependencies.detectCodexRoleStrays(
      scopeRoot,
      canonicalEntries,
      new Set(codexExtensionPlan.managedRoles),
    );
    for (const codexStray of codexStrays) {
      const report: DriftReport = {
        canonical: null,
        provider: 'codex',
        providerPath: codexStray.providerPath,
        state: { status: 'stray' },
      };
      reports.push(report);
      strayCandidates.push({
        provider: 'codex',
        report,
        mapping: {
          contentType: 'agent',
          canonicalDir: '.agents/agents',
          providerDir: '.codex/agents',
          nativeRead: false,
        },
        adoption: {
          kind: 'codex_role',
          roleName: codexStray.roleName,
          description: codexStray.description,
        },
      });
    }
  }

  const filtered = filterKnownStrays({
    reports,
    candidates: strayCandidates,
    knownStrays: {
      project: syncConfig.knownStrays,
      user: userSyncConfig.knownStrays,
    },
  });

  return {
    scope,
    scopeRoot,
    manifestPath,
    syncConfigPath,
    manifest,
    reports: filtered.reports,
    strayCandidates: filtered.candidates,
    activeAdapterNames: activeAdapters.map((adapter) => adapter.name),
  };
}

async function runStatusCommand(
  context: CommandContext,
  dependencies: StatusDependencies,
  options: { hook?: boolean } = {},
): Promise<void> {
  const reports: DriftReport[] = [];
  const scopeCollections: ScopeReportCollection[] = [];
  const scopes = resolveConcreteScopes(context.scope);
  const scopeRoots = new Map<ConcreteScope, string>();
  const unavailableScopes: ConcreteScope[] = [];

  for (const scope of scopes) {
    let scopeReportCollection: ScopeReportCollection;
    try {
      scopeReportCollection = await collectScopeReports(
        scope,
        context,
        dependencies,
      );
    } catch (error) {
      // `--scope all` outside a Git repository still reports user scope; an
      // explicitly requested scope stays a hard failure.
      if (scope === 'project' && scopes.includes('user')) {
        unavailableScopes.push(scope);
        continue;
      }
      throw error;
    }
    reports.push(...scopeReportCollection.reports);
    scopeCollections.push(scopeReportCollection);
    scopeRoots.set(scope, scopeReportCollection.scopeRoot);
  }

  const summary = summarizeReports(reports);
  const hasIssues = summary.total > 0 && summary.inSync !== summary.total;

  if (options.hook) {
    if (summary.drifted > 0 || summary.missing > 0) {
      context.logger.warn(HOOK_DRIFT_WARNING);
      process.exitCode = 1;
    } else if (summary.stray > 0) {
      context.logger.info(HOOK_STRAY_INFO);
      process.exitCode = 0;
    } else {
      process.exitCode = 0;
    }
    return;
  }

  const packReport = await collectPackReport(
    scopeRoots,
    unavailableScopes,
    scopeCollections.some(
      ({ scope, activeAdapterNames }) =>
        scope === 'user' &&
        activeAdapterNames.some(
          (name) => name === 'codex' || name === 'cursor',
        ),
    ),
    dependencies,
  );

  if (context.json) {
    const payload: StatusJsonPayload = {
      scope: context.scope,
      reports,
      summary,
      packs: packReport,
    };
    if (!context.interactive && summary.stray > 0) {
      payload.remediation = DEFAULT_REMEDIATION;
    }
    context.logger.json(payload);
  } else {
    context.logger.info(dependencies.formatStatusTable(reports));
    const packSummary = formatPackReport(packReport);
    if (packSummary) {
      context.logger.info(packSummary);
    }
  }

  if (summary.stray > 0) {
    if (context.interactive) {
      let migrationAborted = false;
      for (const scopeCollection of scopeCollections) {
        if (scopeCollection.strayCandidates.length === 0) {
          continue;
        }

        let manifestChanged = false;
        let adoptedCount = 0;
        let codexStrayAdopted = false;
        const nativeSkillStrays = scopeCollection.strayCandidates.filter(
          isNativeSkillCandidate,
        );
        const ordinaryStrays = scopeCollection.strayCandidates.filter(
          (stray) => !isNativeSkillCandidate(stray),
        );

        for (const strayCandidate of nativeSkillStrays) {
          const provider = getNativeSkillProviderDetails(strayCandidate)!;
          const disposition = await dependencies.selectWithAbort(
            `Migrate ${provider.displayName} skill [${scopeCollection.scope}]: ${formatPathForScope(
              scopeCollection.scope,
              strayCandidate.report.providerPath,
            )}`,
            [
              {
                label: 'Adopt into canonical',
                value: 'adopt',
                description: `Move to ${strayCandidate.mapping.canonicalDir}.`,
              },
              {
                label: `Keep ${provider.displayName}-only`,
                value: 'keep',
                description: `Leave in ${provider.sourceDir} and remember this choice.`,
              },
            ],
            { interactive: context.interactive },
          );
          if (disposition === null) {
            migrationAborted = true;
            break;
          }

          try {
            scopeCollection.manifest =
              await dependencies.applyNativeSkillDisposition(
                scopeCollection.scopeRoot,
                strayCandidate,
                scopeCollection.manifest,
                disposition,
                scopeCollection.syncConfigPath,
              );
            if (disposition === 'adopt') {
              adoptedCount += 1;
            } else {
              context.logger.success(
                `Kept ${provider.displayName}-only [${scopeCollection.scope}]: ${formatPathForScope(
                  scopeCollection.scope,
                  strayCandidate.report.providerPath,
                )}.`,
              );
            }
          } catch (error) {
            if (isAdoptionSourceUnavailableError(error)) {
              context.logger.warn(error.message);
              continue;
            }
            if (
              error instanceof Error &&
              error.message.startsWith('Cannot keep ')
            ) {
              context.logger.warn(error.message);
              continue;
            }
            if (!isAdoptionConflictError(error) || disposition !== 'adopt') {
              throw error;
            }

            const shouldReplace = await dependencies.confirmAction(
              `Conflict detected for ${formatPathForScope(
                scopeCollection.scope,
                strayCandidate.report.providerPath,
              )}. Replace canonical with stray content?`,
              { interactive: context.interactive },
            );

            if (!shouldReplace) {
              context.logger.warn(
                `Skipped adopting conflicting ${provider.displayName} skill [${scopeCollection.scope}] ${formatPathForScope(
                  scopeCollection.scope,
                  strayCandidate.report.providerPath,
                )}.`,
              );
              continue;
            }

            scopeCollection.manifest =
              await dependencies.applyNativeSkillDisposition(
                scopeCollection.scopeRoot,
                strayCandidate,
                scopeCollection.manifest,
                disposition,
                scopeCollection.syncConfigPath,
                { replaceCanonical: true },
              );
            adoptedCount += 1;
          }
        }

        if (!migrationAborted && ordinaryStrays.length > 0) {
          const selectedValues = await dependencies.selectManyWithAbort(
            `Select stray entries to adopt [${scopeCollection.scope}]`,
            ordinaryStrays.map((strayCandidate, index) => ({
              label: formatStrayChoiceLabel(
                scopeCollection.scope,
                strayCandidate.report.providerPath,
                strayCandidate.provider,
              ),
              value: String(index),
              description: formatPathForScope(
                scopeCollection.scope,
                strayCandidate.report.providerPath,
              ),
            })),
            { interactive: context.interactive },
          );
          if (selectedValues === null) {
            migrationAborted = true;
          } else {
            const selectedIndices = new Set(
              selectedValues.map((value) => Number.parseInt(value, 10)),
            );
            for (const [index, strayCandidate] of ordinaryStrays.entries()) {
              if (!selectedIndices.has(index)) {
                continue;
              }

              try {
                scopeCollection.manifest = await dependencies.adoptStray(
                  scopeCollection.scopeRoot,
                  strayCandidate,
                  scopeCollection.manifest,
                );
                adoptedCount += 1;
                manifestChanged = true;
                codexStrayAdopted =
                  codexStrayAdopted || strayCandidate.provider === 'codex';
              } catch (error) {
                if (isAdoptionSourceUnavailableError(error)) {
                  context.logger.warn(error.message);
                  continue;
                }
                if (!isAdoptionConflictError(error)) {
                  throw error;
                }

                const shouldReplace = await dependencies.confirmAction(
                  `Conflict detected for ${formatPathForScope(
                    scopeCollection.scope,
                    strayCandidate.report.providerPath,
                  )}. Replace canonical with stray content?`,
                  { interactive: context.interactive },
                );

                if (!shouldReplace) {
                  context.logger.warn(
                    `Skipped adopting conflicting stray [${scopeCollection.scope}] ${formatPathForScope(
                      scopeCollection.scope,
                      strayCandidate.report.providerPath,
                    )}.`,
                  );
                  continue;
                }

                scopeCollection.manifest = await dependencies.adoptStray(
                  scopeCollection.scopeRoot,
                  strayCandidate,
                  scopeCollection.manifest,
                  { replaceCanonical: true },
                );
                adoptedCount += 1;
                manifestChanged = true;
                codexStrayAdopted =
                  codexStrayAdopted || strayCandidate.provider === 'codex';
              }
            }
          }
        }

        if (codexStrayAdopted && scopeCollection.scope === 'project') {
          await regenerateCodexAfterAdoption({
            scopeRoot: scopeCollection.scopeRoot,
            scanCanonical: async () =>
              dependencies.scanCanonical(
                scopeCollection.scopeRoot,
                scopeCollection.scope,
              ),
            computeExtensionPlan: dependencies.computeCodexProjectExtensionPlan,
            applyExtensionPlan: dependencies.applyCodexProjectExtensionPlan,
          });
          if (scopeCollection.activeAdapterNames.includes('cursor')) {
            const canonicalEntries = await dependencies.scanCanonical(
              scopeCollection.scopeRoot,
              scopeCollection.scope,
            );
            const cursorPlan =
              await dependencies.computeCursorProjectExtensionPlan(
                scopeCollection.scopeRoot,
                canonicalEntries,
                undefined,
                { userConfigDir: join(context.home, '.oat') },
              );
            await dependencies.applyCursorProjectExtensionPlan(
              scopeCollection.scopeRoot,
              cursorPlan,
            );
          }
        }

        if (manifestChanged) {
          await dependencies.saveManifest(
            scopeCollection.manifestPath,
            scopeCollection.manifest,
          );
        }
        if (adoptedCount > 0) {
          context.logger.success(
            `Adopted ${adoptedCount} stray entr${
              adoptedCount === 1 ? 'y' : 'ies'
            } [${scopeCollection.scope}].`,
          );
        } else if (!migrationAborted) {
          context.logger.info(
            `No stray entries adopted [${scopeCollection.scope}].`,
          );
        }
        if (migrationAborted) {
          break;
        }
      }
    } else if (!context.json) {
      context.logger.warn(DEFAULT_REMEDIATION);
    }
  }

  process.exitCode = hasIssues ? 1 : 0;
}

export function createStatusCommand(
  overrides: Partial<StatusDependencies> = {},
): Command {
  const dependencies: StatusDependencies = {
    ...DEFAULT_DEPENDENCIES,
    ...overrides,
  };

  return withScopeOption(new Command('status'))
    .description('Report provider sync and drift status')
    .option(
      '--hook',
      'Emit a minimal pre-commit message: warn on managed drift, info on strays',
    )
    .action(async (options: { hook?: boolean }, command: Command) => {
      const context = dependencies.buildCommandContext(
        readGlobalOptions(command),
      );
      await runStatusCommand(context, dependencies, {
        hook: Boolean(options.hook),
      });
    });
}
