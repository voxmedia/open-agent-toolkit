import type { ConcreteScope } from '@shared/types';

export type PackName =
  | 'core'
  | 'ideas'
  | 'docs'
  | 'workflows'
  | 'utility'
  | 'project-management'
  | 'research'
  | 'brainstorm';

export type PackAssetKind =
  | 'skill'
  | 'agent'
  | 'template'
  | 'script'
  | 'directory'
  | 'seed';

export type PackAssetOwnership = 'managed' | 'seed-if-missing';

export interface PackAssetDefinition {
  id: string;
  kind: PackAssetKind;
  source: string;
  destination: string;
  scopes: readonly ConcreteScope[];
  ownership: Partial<Record<ConcreteScope, PackAssetOwnership>>;
  executable?: boolean;
}

export interface PackDefinition {
  name: PackName;
  allowedScopes: readonly ConcreteScope[];
  defaultScope: ConcreteScope;
  assets: readonly PackAssetDefinition[];
}

export type PackAssetStatus =
  | 'missing'
  | 'current'
  | 'outdated'
  | 'newer'
  | 'present';

export type PackCompleteness = 'complete' | 'partial' | 'absent';

export interface ToolInfo {
  name: string;
  type: 'skill' | 'agent';
  scope: ConcreteScope;
  version: string | null;
  bundledVersion: string | null;
  pack: PackName | 'custom';
  status: 'current' | 'outdated' | 'newer' | 'not-bundled';
}
