export interface ProjectCleanupFinding {
  target: string;
  reason: string;
}

export interface ProjectCleanupScanResult {
  scanned: number;
  findings: ProjectCleanupFinding[];
}
