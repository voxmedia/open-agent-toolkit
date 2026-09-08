import type { ProviderScopeContext } from '@providers/shared/registry';
import type { ConcreteScope } from '@shared/types';

import {
  packScopeFactsFromInventory,
  projectPackEvidence,
  unavailablePackScopeFacts,
  type PackEvidenceDiagnostic,
  type ToolPackEvidence,
} from './pack-evidence';
import type { PackInventory } from './pack-inventory';
import { formatPackPath, type PackPathRoots } from './pack-paths';
import { packProviderEvidence } from './pack-provider-evidence';
import type { PackName } from './types';

export interface PackEvidenceBlockV1 {
  schemaVersion: 1;
  status: 'ok' | 'partial' | 'error';
  items: readonly ToolPackEvidence[];
  diagnostics: readonly PackEvidenceDiagnostic[];
}

export function unavailablePackEvidence(input: {
  pack: PackName;
  scopes: readonly ConcreteScope[];
  reason: string;
  roots?: PackPathRoots;
}): ToolPackEvidence {
  const reason = redactPackText(input.reason, input.roots ?? {});
  const facts = input.scopes.map((scope) =>
    unavailablePackScopeFacts({
      scope,
      reason,
      intent: {
        pack: input.pack,
        scope,
        enabled: false,
        direct: false,
        requiredBy: [],
        state: 'absent',
        source: 'none',
        configPath: `${scope === 'project' ? '<project>' : '~'}/.oat/config.json`,
        diagnostics: [],
      },
    }),
  );
  return projectPackEvidence({ canonical: null, scopes: facts });
}

function redactPackText(text: string, roots: PackPathRoots): string {
  let redacted = text;
  const replacements = [
    ...(roots.projectRoot ? [[roots.projectRoot, '.'] as const] : []),
    ...(roots.userRoot ? [[roots.userRoot, '~'] as const] : []),
  ].sort(([left], [right]) => right.length - left.length);
  for (const [root, replacement] of replacements) {
    redacted = redacted
      .replaceAll(`${root}/`, `${replacement}/`)
      .replaceAll(root, replacement);
  }
  return redacted;
}

function redactPackInventory(
  inventory: PackInventory,
  roots: PackPathRoots,
): PackInventory {
  return {
    ...inventory,
    scopes: inventory.scopes.map((scoped) => ({
      ...scoped,
      intent: {
        ...scoped.intent,
        configPath: formatPackPath(scoped.intent.configPath, roots),
      },
      assets: scoped.assets.map((asset) => ({
        ...asset,
        path: formatPackPath(asset.path, roots),
      })),
      diagnostics: scoped.diagnostics.map((diagnostic) => ({
        ...diagnostic,
        paths: diagnostic.paths.map((path) => formatPackPath(path, roots)),
      })),
    })),
    diagnostics: inventory.diagnostics.map((diagnostic) => ({
      ...diagnostic,
      paths: diagnostic.paths.map((path) => formatPackPath(path, roots)),
    })),
  };
}

/**
 * Projects a renderable pack evidence item.
 *
 * `providerContexts` is the config-aware provider context per scope. When it
 * is supplied, provider reachability is mapped from the registry and the
 * resulting `provider-materialization-missing` diagnostics name the provider.
 * When it is absent — a surface that could not resolve a sync config — the
 * unattributed inventory-derived diagnostic is emitted instead, so the
 * warning is never silently lost.
 */
export function projectRenderablePackEvidence(
  canonical: PackInventory,
  roots: PackPathRoots,
  providerContexts?: readonly ProviderScopeContext[],
): ToolPackEvidence {
  const redacted = redactPackInventory(canonical, roots);
  const providers =
    providerContexts && providerContexts.length > 0
      ? packProviderEvidence({
          pack: redacted.pack,
          scopedInventories: redacted.scopes,
          providerContexts,
          mode: 'inventory',
        })
      : [];
  const evidence = projectPackEvidence({
    canonical: redacted,
    scopes: redacted.scopes.map(packScopeFactsFromInventory),
    providers,
    providerMode: 'inventory',
  });
  // Assets a provider row already reports as missing are covered by the
  // named diagnostic. Anything left over has no responsible active provider,
  // so the unattributed pack-level warning is still the only report of it and
  // must not be dropped just because provider rows exist.
  const attributedAssets = new Set(
    providers
      .filter(({ materialization }) => materialization.state === 'missing')
      .flatMap(({ assets }) => assets),
  );
  const legacyDiagnostics: PackEvidenceDiagnostic[] = redacted.scopes.flatMap(
    (scoped) =>
      scoped.diagnostics
        .filter(
          ({ code, paths }) =>
            code === 'user-agent-unmaterialized' &&
            paths.some((path) => !attributedAssets.has(path)),
        )
        .map((diagnostic) => ({
          code: 'provider-materialization-missing' as const,
          severity: 'warning' as const,
          pack: redacted.pack,
          scope: scoped.scope,
          contentKind: 'agent' as const,
          affectedAssets: diagnostic.paths,
          source: 'pack-inventory',
          detail: diagnostic.message,
          recovery: [
            {
              code: 'install-project-scope',
              command: `oat tools install ${redacted.pack} --scope project`,
              message:
                'Install the pack at project scope for native provider materialization.',
            },
          ],
        })),
  );
  return {
    ...evidence,
    diagnostics: [...evidence.diagnostics, ...legacyDiagnostics],
  };
}

export function packEvidenceBlock(
  items: readonly ToolPackEvidence[],
): PackEvidenceBlockV1 {
  const diagnostics = items.flatMap(({ diagnostics: values }) => values);
  // Severity, never the diagnostic count, decides the block status. `info`
  // rows (an inactive provider, an unsupported content kind, a host that
  // needs a catalog refresh) are reportable facts about a healthy install,
  // so counting them would turn every correctly configured host `partial`.
  const actionable = diagnostics.some(
    ({ severity }) => severity === 'warning' || severity === 'error',
  );
  return {
    schemaVersion: 1,
    status: actionable ? 'partial' : 'ok',
    items,
    diagnostics,
  };
}

function versionEvidence(
  installed: string | null,
  bundled: string | null,
): string {
  if (installed === null && bundled === null) return '';
  return `; versions=${installed ?? '-'} -> ${bundled ?? '-'}`;
}

export function formatPackEvidenceDetails(
  evidence: ToolPackEvidence,
  indent = '  ',
): string[] {
  const lines = [`${indent}Realized placement: ${evidence.realizedPlacement}`];
  for (const scoped of evidence.scopes) {
    lines.push(
      `${indent}${scoped.scope}: ${scoped.realization}; completeness=${scoped.completeness}; health=${scoped.health}; intent=${scoped.intent.source}`,
    );
    if (scoped.inventory.reason) {
      lines.push(`${indent}  Inventory: ${scoped.inventory.reason}`);
    }
  }
  // Human output names the provider; the structured evidence stays in JSON.
  for (const provider of evidence.providers) {
    lines.push(
      `${indent}${provider.provider} [${provider.scope} ${provider.contentKind}]: ${provider.activation.state}; capability=${provider.capability.support}; projection=${provider.projection.state}; materialization=${provider.materialization.state}; visibility=${provider.visibility.state}`,
    );
  }
  for (const diagnostic of evidence.diagnostics) {
    lines.push(
      `${indent}${diagnostic.code}${diagnostic.provider ? ` [${diagnostic.provider}]` : ''}: ${diagnostic.detail}`,
      ...(diagnostic.affectedAssets.length > 0
        ? [`${indent}  Affected: ${diagnostic.affectedAssets.join(', ')}`]
        : []),
      ...diagnostic.recovery.map(
        ({ command, message }) =>
          `${indent}  Fix: ${message}${command ? ` (${command})` : ''}`,
      ),
    );
  }
  return lines;
}

export function formatPackInventoryDetails(
  inventory: PackInventory,
  indent = '  ',
): string[] {
  const lines: string[] = [];
  for (const scoped of inventory.scopes) {
    lines.push(
      `${indent}${scoped.scope}: ${scoped.completeness}; intent=${scoped.intent.source}`,
    );
    for (const asset of scoped.assets) {
      lines.push(
        `${indent}  ${asset.definition.id} [${asset.definition.kind}] ${asset.status}; path=${asset.path}${versionEvidence(asset.installedVersion, asset.bundledVersion)}`,
      );
    }
  }
  for (const diagnostic of inventory.diagnostics) {
    lines.push(
      `${indent}diagnostic ${diagnostic.code}: ${diagnostic.message}; paths=${diagnostic.paths.join(', ') || '-'}`,
    );
    if (diagnostic.versions) {
      lines.push(
        `${indent}  versions=${diagnostic.versions.map((version) => version ?? '-').join(', ')}`,
      );
    }
  }
  return lines;
}
