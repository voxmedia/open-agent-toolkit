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

const LIFECYCLE_ARTIFACTS = [
  'discovery.md',
  'spec.md',
  'design.md',
  'plan.md',
  'implementation.md',
] as const;

export function hasLifecycleArtifacts(fileNames: Iterable<string>): boolean {
  const files = new Set(fileNames);
  return LIFECYCLE_ARTIFACTS.some((entry) => files.has(entry));
}

export function projectNeedsStateFile(fileNames: Iterable<string>): boolean {
  const files = new Set(fileNames);
  return !files.has('state.md') && hasLifecycleArtifacts(files);
}

export function projectPlanMarksComplete(planContent: string): boolean {
  return /\|\s*final\s*\|\s*code\s*\|\s*passed\s*\|/i.test(planContent);
}

export function stateLifecycleIsComplete(stateContent: string): boolean {
  return /^oat_lifecycle:\s*complete$/m.test(stateContent);
}

export function projectNeedsLifecycleComplete(
  planContent: string,
  stateContent: string,
): boolean {
  return (
    projectPlanMarksComplete(planContent) &&
    !stateLifecycleIsComplete(stateContent)
  );
}
