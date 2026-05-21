import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export const PROJECT_STATE_KINDS = ['implementation', 'coordination'] as const;

export const PROJECT_STATE_PHASES = [
  'discovery',
  'spec',
  'design',
  'plan',
  'implement',
  'decomposition',
] as const;

export const PROJECT_STATE_FRONTMATTER_FIELDS = [
  'oat_kind',
  'oat_phase',
  'oat_phase_status',
  'oat_workflow_mode',
  'oat_lifecycle',
  'oat_current_task',
  'oat_last_commit',
  'oat_blockers',
  'oat_hill_checkpoints',
  'oat_hill_completed',
  'oat_parallel_execution',
  'oat_pr_status',
  'oat_pr_url',
  'oat_project_created',
  'oat_project_completed',
  'oat_project_state_updated',
  'oat_docs_updated',
  'oat_generated',
  'oat_template',
  'oat_template_name',
] as const;

export type ProjectStateKind = (typeof PROJECT_STATE_KINDS)[number];
export type ProjectStatePhase = (typeof PROJECT_STATE_PHASES)[number];
export type ProjectStateFrontmatterField =
  (typeof PROJECT_STATE_FRONTMATTER_FIELDS)[number];

export function isProjectStateKind(value: string): value is ProjectStateKind {
  return PROJECT_STATE_KINDS.includes(value as ProjectStateKind);
}

export function isProjectStatePhase(value: string): value is ProjectStatePhase {
  return PROJECT_STATE_PHASES.includes(value as ProjectStatePhase);
}

export function isProjectStateFrontmatterField(
  value: string,
): value is ProjectStateFrontmatterField {
  return PROJECT_STATE_FRONTMATTER_FIELDS.includes(
    value as ProjectStateFrontmatterField,
  );
}

export function getFrontmatterBlock(content: string): string | null {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  return match?.[1] ?? null;
}

export function getFrontmatterField(
  frontmatter: string,
  field: string,
): string | null {
  const regex = new RegExp(`^${field}:\\s*(.+)$`, 'm');
  const match = frontmatter.match(regex);
  if (!match) return null;
  return match[1]!.replace(/\s*#.*$/, '').trim();
}

export async function parseFrontmatterField(
  filePath: string,
  field: string,
): Promise<string> {
  try {
    const content = await readFile(filePath, 'utf8');
    const block = getFrontmatterBlock(content);
    if (!block) return '';
    return getFrontmatterField(block, field) ?? '';
  } catch {
    return '';
  }
}

export async function getSkillVersion(
  skillDir: string,
): Promise<string | null> {
  // parseFrontmatterField() returns '' when SKILL.md is missing or unreadable,
  // so read failures are normalized to null here.
  const version = await parseFrontmatterField(
    join(skillDir, 'SKILL.md'),
    'version',
  );
  return version.length > 0 ? version : null;
}

export async function getAgentVersion(
  agentPath: string,
): Promise<string | null> {
  const version = await parseFrontmatterField(agentPath, 'version');
  return version.length > 0 ? version : null;
}
