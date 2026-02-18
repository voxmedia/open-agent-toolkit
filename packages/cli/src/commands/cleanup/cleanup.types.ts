export type CleanupStatus = 'ok' | 'drift' | 'error';

export type CleanupMode = 'dry-run' | 'apply';

export type CleanupActionType =
  | 'delete'
  | 'archive'
  | 'create'
  | 'update'
  | 'clear'
  | 'regenerate'
  | 'skip'
  | 'block';

export type CleanupActionResult = 'planned' | 'applied' | 'skipped' | 'blocked';

export interface CleanupSummary {
  scanned: number;
  issuesFound: number;
  planned: number;
  applied: number;
  skipped: number;
  blocked: number;
}

export interface CleanupActionRecord {
  type: CleanupActionType;
  target: string;
  reason: string;
  phase: string;
  result: CleanupActionResult;
}

export interface CleanupJsonPayload {
  // Stable output contract for cleanup subcommands.
  status: CleanupStatus;
  mode: CleanupMode;
  summary: CleanupSummary;
  actions: CleanupActionRecord[];
}
