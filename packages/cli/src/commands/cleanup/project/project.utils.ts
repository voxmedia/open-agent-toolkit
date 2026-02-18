import type {
  ProjectCleanupFinding,
  ProjectCleanupScanResult,
} from './project.types';

export function createProjectCleanupScanResult(
  scanned: number,
  findings: ProjectCleanupFinding[],
): ProjectCleanupScanResult {
  return {
    scanned,
    findings,
  };
}
