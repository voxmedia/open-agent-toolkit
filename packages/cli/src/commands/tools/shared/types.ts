import type { ConcreteScope } from '@shared/types';

export type PackName = 'ideas' | 'workflows' | 'utility';

export interface ToolInfo {
  name: string;
  type: 'skill' | 'agent';
  scope: ConcreteScope;
  version: string | null;
  bundledVersion: string | null;
  pack: PackName | 'custom';
  status: 'current' | 'outdated' | 'newer' | 'not-bundled';
}
