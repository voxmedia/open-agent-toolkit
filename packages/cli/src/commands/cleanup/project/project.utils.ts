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

export function renderProjectStateTemplate(
  templateContent: string,
  projectName: string,
  today: string,
): string {
  return templateContent
    .replaceAll('{Project Name}', projectName)
    .replaceAll('YYYY-MM-DD', today)
    .replaceAll(/\n?oat_template:\s*true\s*\n/gi, '\n')
    .replaceAll(/\n?oat_template_name:\s*[^\n]*\n/gi, '\n');
}

export function upsertLifecycleCompleteFrontmatter(content: string): string {
  const hasFrontmatter = content.startsWith('---\n');
  if (!hasFrontmatter) {
    return ['---', 'oat_lifecycle: complete', '---', '', content].join('\n');
  }

  const blockEnd = content.indexOf('\n---', 4);
  if (blockEnd === -1) {
    return ['---', 'oat_lifecycle: complete', '---', '', content].join('\n');
  }

  const frontmatter = content.slice(4, blockEnd);
  const rest = content.slice(blockEnd + 4);
  const updatedFrontmatter = /^oat_lifecycle:\s*.+$/m.test(frontmatter)
    ? frontmatter.replace(/^oat_lifecycle:\s*.+$/m, 'oat_lifecycle: complete')
    : `${frontmatter}\noat_lifecycle: complete`;

  return `---\n${updatedFrontmatter}\n---${rest}`;
}
