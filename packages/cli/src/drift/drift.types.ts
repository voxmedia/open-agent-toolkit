export type DriftState =
  | { status: 'in_sync' }
  | { status: 'drifted'; reason: 'modified' | 'broken' | 'replaced' }
  | { status: 'missing' }
  | { status: 'stray' };

export interface DriftReport {
  canonical: string | null;
  provider: string;
  providerPath: string;
  state: DriftState;
}
