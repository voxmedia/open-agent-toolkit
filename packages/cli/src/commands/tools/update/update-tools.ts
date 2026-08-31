import { join } from 'node:path';

import type { ApplyOatCoreGitattributesResult } from '@commands/init/gitattributes';
import type { ApplyOatCoreResult } from '@commands/init/gitignore';
import type { CopyStatus } from '@commands/init/tools/shared/copy-helpers';
import {
  hasScopedPackRealizationEvidence,
  packScopeFactsFromInventory,
  projectPackEvidence,
} from '@commands/tools/shared/pack-evidence';
import type {
  InventoryScopedPackInput,
  ScopedPackInventory,
} from '@commands/tools/shared/pack-inventory';
import { inventoryScopedPack } from '@commands/tools/shared/pack-inventory';
import {
  type PackLifecycleRequest,
  type PackLifecycleResult,
} from '@commands/tools/shared/pack-lifecycle';
import {
  evaluatePackLifecycleOutcome,
  resolveAdditivePackScopeSelection,
  type PackLifecycleOutcome,
} from '@commands/tools/shared/pack-lifecycle-outcome';
import { getPackDefinition } from '@commands/tools/shared/pack-manifest';
import type { PackReconcilePlan } from '@commands/tools/shared/pack-reconcile';
import type { ScanToolsOptions } from '@commands/tools/shared/scan-tools';
import type { PackName, ToolInfo } from '@commands/tools/shared/types';
import type { ConcreteScope } from '@shared/types';

export type UpdateTarget =
  | { kind: 'name'; name: string }
  | { kind: 'pack'; pack: PackName }
  | { kind: 'all' };

export interface PackAssetRefresh {
  name: string;
  type: 'template' | 'script' | 'directory' | 'seed';
  pack: PackName;
  scope: ConcreteScope;
  status: 'planned' | 'refreshed';
}

export interface UpdateResult {
  updated: ToolInfo[];
  current: ToolInfo[];
  newer: ToolInfo[];
  notInstalled: string[];
  notBundled: ToolInfo[];
  assetRefreshes: PackAssetRefresh[];
  plans: PackReconcilePlan[];
  lifecycle?: PackLifecycleOutcome[];
}

export interface UpdateToolsDependencies {
  scanTools: (options: ScanToolsOptions) => Promise<ToolInfo[]>;
  resolveScopeRoot: (
    scope: ConcreteScope,
    cwd: string,
    home: string,
  ) => Promise<string>;
  resolveAssetsRoot: () => Promise<string>;
  copyDirWithStatus: (
    source: string,
    destination: string,
    force: boolean,
  ) => Promise<CopyStatus>;
  copyFileWithStatus: (
    source: string,
    destination: string,
    force: boolean,
  ) => Promise<CopyStatus>;
  fileExists: (path: string) => Promise<boolean>;
  chmod: (path: string, mode: number) => Promise<void>;
  applyOatCoreGitignore?: (repoRoot: string) => Promise<ApplyOatCoreResult>;
  applyOatCoreGitattributes?: (
    repoRoot: string,
  ) => Promise<ApplyOatCoreGitattributesResult>;
  inventoryScopedPack?: (
    input: InventoryScopedPackInput,
  ) => Promise<ScopedPackInventory>;
  reconcilePacks?: (
    requests: readonly PackLifecycleRequest[],
    options?: { dryRun?: boolean },
  ) => Promise<PackLifecycleResult[]>;
}

interface ToolEntry {
  tool: ToolInfo;
  scopeRoot: string;
}

interface BundledPackMember {
  name: string;
  type: 'skill' | 'agent';
}

interface BundledPackAssets {
  templates: readonly string[];
  scripts: readonly string[];
}

function getBundledPackAssets(
  pack: PackName,
  scope: ConcreteScope,
): BundledPackAssets {
  const assets = getPackDefinition(pack).assets.filter(
    ({ scopes, ownership }) =>
      scopes.includes(scope) && ownership[scope] === 'managed',
  );
  return {
    templates: assets
      .filter(({ kind }) => kind === 'template')
      .flatMap(({ source }) =>
        source ? [source.replace(/^templates\//, '')] : [],
      ),
    scripts: assets
      .filter(({ kind }) => kind === 'script')
      .flatMap(({ source }) =>
        source ? [source.replace(/^scripts\//, '')] : [],
      ),
  };
}

interface PackAssetTarget {
  pack: PackName;
  scope: ConcreteScope;
  scopeRoot: string;
}

export async function updateTools(
  target: UpdateTarget,
  scopes: ConcreteScope[],
  cwd: string,
  home: string,
  dryRun: boolean,
  dependencies: UpdateToolsDependencies,
): Promise<UpdateResult> {
  const assetsRoot = await dependencies.resolveAssetsRoot();
  const result: UpdateResult = {
    updated: [],
    current: [],
    newer: [],
    notInstalled: [],
    notBundled: [],
    assetRefreshes: [],
    plans: [],
  };

  if (target.kind !== 'name' && dependencies.reconcilePacks) {
    const inventory = dependencies.inventoryScopedPack ?? inventoryScopedPack;
    const selectedDefinitions = getSelectedDefinitions(target);
    const requests: PackLifecycleRequest[] = [];
    for (const scope of scopes) {
      let scopeRoot: string;
      try {
        scopeRoot = await dependencies.resolveScopeRoot(scope, cwd, home);
      } catch (error) {
        if (scope === 'project' && scopes.includes('user')) continue;
        throw error;
      }
      for (const definition of selectedDefinitions) {
        if (!definition.allowedScopes.includes(scope)) continue;
        const before = await inventory({
          pack: definition.name,
          scope,
          scopeRoot,
          assetsRoot,
        });
        if (!hasScopedPackRealizationEvidence(before)) continue;
        requests.push({
          pack: definition.name,
          scope,
          scopeRoot,
          assetsRoot,
          action: 'update',
        });
      }
    }
    if (target.kind === 'pack' && requests.length === 0) {
      result.notInstalled.push(target.pack);
      return result;
    }
    const lifecycle = await dependencies.reconcilePacks(requests, { dryRun });
    result.lifecycle = updateLifecycleOutcomes(lifecycle);
    result.plans.push(...lifecycle.map(({ plan }) => plan));
    for (const entry of lifecycle) {
      const definition = getPackDefinition(entry.request.pack);
      const changed = new Set(entry.plan.changedCanonicalPaths);
      for (const asset of definition.assets) {
        if (!asset.scopes.includes(entry.request.scope)) continue;
        if (asset.kind === 'skill' || asset.kind === 'agent') {
          if (!changed.has(asset.destination)) continue;
          result.updated.push({
            name: asset.destination.split('/').at(-1)!.replace(/\.md$/, ''),
            type: asset.kind,
            scope: entry.request.scope,
            version: null,
            bundledVersion: null,
            pack: entry.request.pack,
            status: 'outdated',
          });
          continue;
        }
        if (
          entry.plan.operations.some(
            (operation) =>
              'assetId' in operation && operation.assetId === asset.id,
          )
        ) {
          result.assetRefreshes.push({
            name: asset.destination,
            type: asset.kind,
            pack: entry.request.pack,
            scope: entry.request.scope,
            status: dryRun ? 'planned' : 'refreshed',
          });
        }
      }
    }
    return result;
  }

  const allTools: ToolEntry[] = [];
  const scopedInventories: ScopedPackInventory[] = [];
  const scopeRoots = new Map<ConcreteScope, string>();

  for (const scope of scopes) {
    let scopeRoot: string;
    try {
      scopeRoot = await dependencies.resolveScopeRoot(scope, cwd, home);
    } catch (error) {
      if (scope === 'project' && scopes.includes('user')) continue;
      throw error;
    }
    scopeRoots.set(scope, scopeRoot);
    const tools = await dependencies.scanTools({
      scope,
      scopeRoot,
      assetsRoot,
    });
    for (const tool of tools) {
      allTools.push({ tool, scopeRoot });
    }
    if (dependencies.inventoryScopedPack) {
      for (const { name: pack } of [
        getPackDefinition('core'),
        getPackDefinition('ideas'),
        getPackDefinition('docs'),
        getPackDefinition('workflows'),
        getPackDefinition('utility'),
        getPackDefinition('project-management'),
        getPackDefinition('research'),
        getPackDefinition('brainstorm'),
      ]) {
        if (!getPackDefinition(pack).allowedScopes.includes(scope)) continue;
        scopedInventories.push(
          await dependencies.inventoryScopedPack({
            pack,
            scope,
            scopeRoot,
            assetsRoot,
          }),
        );
      }
    }
  }

  for (const inventory of scopedInventories) {
    const selected =
      target.kind === 'pack'
        ? target.pack === inventory.pack
        : target.kind === 'all';
    if (!selected || !inventory.intent.enabled) continue;
    const scopeRoot = scopeRoots.get(inventory.scope);
    if (!scopeRoot) continue;
    const existing = new Set(allTools.map(({ tool }) => buildEntryKey(tool)));
    for (const member of getBundledPackMembers(
      inventory.pack,
      inventory.scope,
    )) {
      const tool: ToolInfo = {
        name: member.name,
        type: member.type,
        scope: inventory.scope,
        version: null,
        bundledVersion: null,
        pack: inventory.pack,
        status: 'outdated',
      };
      if (!existing.has(buildEntryKey(tool)))
        allTools.push({ tool, scopeRoot });
    }
  }

  const targetEntries =
    target.kind === 'name'
      ? allTools
      : expandInstalledPackEntries(target, allTools);
  const targets = resolveTargets(
    target,
    targetEntries.map((t) => t.tool),
  );

  if (target.kind === 'name' && targets.length === 0) {
    result.notInstalled.push(target.name);
    return result;
  }

  for (const targetTool of targets) {
    const entry = targetEntries.find((t) => t.tool === targetTool);
    if (!entry) continue;

    const { tool, scopeRoot } = entry;

    if (tool.status === 'not-bundled') {
      result.notBundled.push(tool);
      continue;
    }

    if (tool.status === 'current') {
      result.current.push(tool);
      continue;
    }

    if (tool.status === 'newer') {
      result.newer.push(tool);
      continue;
    }

    // outdated — perform update
    if (!dryRun) {
      if (tool.type === 'skill') {
        const source = join(assetsRoot, 'skills', tool.name);
        const destination = join(scopeRoot, '.agents', 'skills', tool.name);
        await dependencies.copyDirWithStatus(source, destination, true);
      } else {
        const filename = `${tool.name}.md`;
        const source = join(assetsRoot, 'agents', filename);
        const destination = join(scopeRoot, '.agents', 'agents', filename);
        await dependencies.copyFileWithStatus(source, destination, true);
      }
    }

    result.updated.push(tool);
  }

  for (const assetTarget of resolvePackAssetTargets(target, allTools)) {
    const assets = getBundledPackAssets(assetTarget.pack, assetTarget.scope);

    for (const template of assets.templates) {
      const source = join(assetsRoot, 'templates', template);
      const destination = join(
        assetTarget.scopeRoot,
        '.oat',
        'templates',
        template,
      );
      if (!dryRun) {
        await dependencies.copyFileWithStatus(source, destination, true);
      }
      result.assetRefreshes.push({
        name: template,
        type: 'template',
        pack: assetTarget.pack,
        scope: assetTarget.scope,
        status: dryRun ? 'planned' : 'refreshed',
      });
    }

    for (const script of assets.scripts) {
      const source = join(assetsRoot, 'scripts', script);
      if (!(await dependencies.fileExists(source))) {
        continue;
      }
      const destination = join(
        assetTarget.scopeRoot,
        '.oat',
        'scripts',
        script,
      );
      if (!dryRun) {
        await dependencies.copyFileWithStatus(source, destination, true);
        await dependencies.chmod(destination, 0o755);
      }
      result.assetRefreshes.push({
        name: script,
        type: 'script',
        pack: assetTarget.pack,
        scope: assetTarget.scope,
        status: dryRun ? 'planned' : 'refreshed',
      });
    }
  }

  return result;
}

function updateLifecycleOutcomes(
  results: readonly PackLifecycleResult[],
): PackLifecycleOutcome[] {
  const verifiable = results.filter(
    ({ apply }) =>
      apply === null || ('inventory' in apply && apply.inventory !== undefined),
  );
  const packs = [...new Set(verifiable.map(({ request }) => request.pack))];
  return packs.map((pack) => {
    const lifecycle = verifiable.filter(({ request }) => request.pack === pack);
    const requestedScopes = lifecycle.map(({ request }) => request.scope);
    const finalScopes = lifecycle.map(
      ({ apply, before }) => apply?.inventory ?? before,
    );
    const finalEvidence = projectPackEvidence({
      canonical: null,
      scopes: finalScopes.map(packScopeFactsFromInventory),
    });
    const selection = resolveAdditivePackScopeSelection({
      pack,
      requested:
        requestedScopes.includes('project') && requestedScopes.includes('user')
          ? 'both'
          : requestedScopes[0]!,
      knownRealizedScopes: lifecycle
        .filter(({ before }) => hasScopedPackRealizationEvidence(before))
        .map(({ request }) => request.scope),
      unknownScopes: [],
    });
    if (lifecycle.every(({ apply }) => apply === null)) {
      return {
        schemaVersion: 1,
        selection,
        canonical: { status: 'unchanged', results: lifecycle },
        sync: { scopes: [], status: 'not-run', providers: [] },
        finalEvidence,
        status: 'complete',
        recovery: [],
      };
    }
    return evaluatePackLifecycleOutcome({
      selection,
      lifecycle,
      sync: { scopes: [], status: 'not-run', providers: [] },
      finalEvidence,
    });
  });
}

export function failedUpdateLifecycleOutcomes(
  target: Exclude<UpdateTarget, { kind: 'name' }>,
  scopes: readonly ConcreteScope[],
  error: unknown,
): PackLifecycleOutcome[] {
  const message = error instanceof Error ? error.message : String(error);
  return getSelectedDefinitions(target).map(({ name: pack }) => ({
    schemaVersion: 1,
    selection: {
      pack,
      requested:
        scopes.includes('project') && scopes.includes('user')
          ? 'both'
          : scopes[0]!,
      retainedRealizedScopes: [],
      targetScopes: scopes,
    },
    canonical: { status: 'failed', results: [] },
    sync: { scopes: [], status: 'not-run', providers: [] },
    finalEvidence: null,
    status: 'failed',
    recovery: [{ code: 'canonical-apply-failed', message }],
  }));
}

function getSelectedDefinitions(
  target: Exclude<UpdateTarget, { kind: 'name' }>,
) {
  return target.kind === 'pack'
    ? [getPackDefinition(target.pack)]
    : [
        getPackDefinition('core'),
        getPackDefinition('ideas'),
        getPackDefinition('docs'),
        getPackDefinition('workflows'),
        getPackDefinition('utility'),
        getPackDefinition('project-management'),
        getPackDefinition('research'),
        getPackDefinition('brainstorm'),
      ];
}

function expandInstalledPackEntries(
  target: Exclude<UpdateTarget, { kind: 'name' }>,
  installedEntries: ToolEntry[],
): ToolEntry[] {
  const entries = [...installedEntries];
  const seen = new Set(
    installedEntries.map((entry) => buildEntryKey(entry.tool)),
  );
  const entriesByScope = new Map<ConcreteScope, ToolEntry[]>();

  for (const entry of installedEntries) {
    const scopeEntries = entriesByScope.get(entry.tool.scope) ?? [];
    scopeEntries.push(entry);
    entriesByScope.set(entry.tool.scope, scopeEntries);
  }

  for (const [scope, scopeEntries] of entriesByScope) {
    const scopeRoot = scopeEntries[0]?.scopeRoot;
    if (!scopeRoot) continue;

    const installedPacks = new Set(
      scopeEntries
        .map((entry) => entry.tool.pack)
        .filter((pack): pack is PackName => pack !== 'custom'),
    );
    const packsToExpand =
      target.kind === 'pack'
        ? installedPacks.has(target.pack)
          ? [target.pack]
          : []
        : [...installedPacks];

    for (const pack of packsToExpand) {
      for (const member of getBundledPackMembers(pack, scope)) {
        const tool: ToolInfo = {
          name: member.name,
          type: member.type,
          scope,
          version: null,
          bundledVersion: null,
          pack,
          status: 'outdated',
        };
        const key = buildEntryKey(tool);
        if (seen.has(key)) continue;
        entries.push({ tool, scopeRoot });
        seen.add(key);
      }
    }
  }

  return entries;
}

function getBundledPackMembers(
  pack: PackName,
  scope: ConcreteScope,
): BundledPackMember[] {
  return getPackDefinition(pack).assets.flatMap((asset) => {
    if (
      !asset.scopes.includes(scope) ||
      asset.ownership[scope] !== 'managed' ||
      (asset.kind !== 'skill' && asset.kind !== 'agent')
    ) {
      return [];
    }
    return [
      {
        name:
          asset.kind === 'agent'
            ? asset.destination.split('/').at(-1)!.replace(/\.md$/, '')
            : asset.destination.split('/').at(-1)!,
        type: asset.kind,
      },
    ];
  });
}

function resolvePackAssetTargets(
  target: UpdateTarget,
  installedEntries: ToolEntry[],
): PackAssetTarget[] {
  if (target.kind === 'name') {
    return [];
  }

  const entriesByScope = new Map<ConcreteScope, ToolEntry[]>();

  for (const entry of installedEntries) {
    const scopeEntries = entriesByScope.get(entry.tool.scope) ?? [];
    scopeEntries.push(entry);
    entriesByScope.set(entry.tool.scope, scopeEntries);
  }

  const targets: PackAssetTarget[] = [];

  for (const [scope, scopeEntries] of entriesByScope) {
    const scopeRoot = scopeEntries[0]?.scopeRoot;
    if (!scopeRoot) continue;

    const installedPacks = new Set(
      scopeEntries
        .map((entry) => entry.tool.pack)
        .filter((pack): pack is PackName => pack !== 'custom'),
    );
    const packsToExpand =
      target.kind === 'pack'
        ? installedPacks.has(target.pack)
          ? [target.pack]
          : []
        : [...installedPacks];

    for (const pack of packsToExpand) {
      const assets = getBundledPackAssets(pack, scope);
      if (assets.templates.length === 0 && assets.scripts.length === 0) {
        continue;
      }
      targets.push({ pack, scope, scopeRoot });
    }
  }

  return targets;
}

function buildEntryKey(tool: ToolInfo): string {
  return [tool.scope, tool.type, tool.name].join(':');
}

function resolveTargets(target: UpdateTarget, tools: ToolInfo[]): ToolInfo[] {
  switch (target.kind) {
    case 'name':
      return tools.filter((t) => t.name === target.name);
    case 'pack':
      return tools.filter((t) => t.pack === target.pack);
    case 'all':
      return tools;
  }
}
