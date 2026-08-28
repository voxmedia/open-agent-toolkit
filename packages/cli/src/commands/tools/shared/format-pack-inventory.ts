import type { PackInventory } from './pack-inventory';

function versionEvidence(
  installed: string | null,
  bundled: string | null,
): string {
  if (installed === null && bundled === null) return '';
  return `; versions=${installed ?? '-'} -> ${bundled ?? '-'}`;
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
