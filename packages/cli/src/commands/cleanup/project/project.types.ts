export type ProjectCleanupFindingType =
  | 'invalid_active_project'
  | 'missing_state'
  | 'missing_lifecycle_complete';

export interface ProjectCleanupFinding {
  type: ProjectCleanupFindingType;
  target: string;
  reason: string;
}

export interface ProjectCleanupScanResult {
  scanned: number;
  findings: ProjectCleanupFinding[];
}
