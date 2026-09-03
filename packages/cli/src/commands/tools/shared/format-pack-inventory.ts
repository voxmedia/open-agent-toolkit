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

export function projectRenderablePackEvidence(
  canonical: PackInventory,
  roots: PackPathRoots,
): ToolPackEvidence {
  const redacted = redactPackInventory(canonical, roots);
  const evidence = projectPackEvidence({
    canonical: redacted,
    scopes: redacted.scopes.map(packScopeFactsFromInventory),
  });
  const providerDiagnostics: PackEvidenceDiagnostic[] = redacted.scopes.flatMap(
    (scoped) =>
      scoped.diagnostics
        .filter(({ code }) => code === 'user-agent-unmaterialized')
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
    diagnostics: [...evidence.diagnostics, ...providerDiagnostics],
  };
}

export function packEvidenceBlock(
  items: readonly ToolPackEvidence[],
): PackEvidenceBlockV1 {
  const diagnostics = items.flatMap(({ diagnostics: values }) => values);
  return {
    schemaVersion: 1,
    status: diagnostics.length > 0 ? 'partial' : 'ok',
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
  for (const diagnostic of evidence.diagnostics) {
    lines.push(
      `${indent}${diagnostic.code}: ${diagnostic.detail}`,
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
