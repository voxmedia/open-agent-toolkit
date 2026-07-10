import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import YAML, { isMap, isScalar } from 'yaml';

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
  'oat_parent',
  'oat_siblings',
  'oat_depends_on',
  'oat_children',
  'oat_inherited_context_revalidated',
  'oat_phase',
  'oat_phase_status',
  'oat_status',
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

export function parseFrontmatterScalarFields(
  frontmatter: string,
  fields: readonly string[],
): { valid: boolean; values: Record<string, string> } {
  const document = YAML.parseDocument(frontmatter, { uniqueKeys: true });
  const values: Record<string, string> = {};

  if (isMap(document.contents)) {
    for (const field of fields) {
      const matches = document.contents.items.filter(
        (pair) => isScalar(pair.key) && pair.key.value === field,
      );
      if (matches.length !== 1) {
        continue;
      }

      const valueNode = matches[0]?.value;
      if (
        !isScalar(valueNode) ||
        valueNode.anchor !== undefined ||
        valueNode.tag !== undefined ||
        typeof valueNode.value !== 'string' ||
        !valueNode.value.trim()
      ) {
        continue;
      }
      values[field] = valueNode.value.trim();
    }
  }

  return { valid: document.errors.length === 0, values };
}

/**
 * Parse an `oat_generated_at` value into a comparable epoch millisecond time.
 *
 * Review artifacts should carry a UTC, `Z`-suffixed timestamp
 * (`YYYY-MM-DDTHH:MM:SSZ`). A bare date (`YYYY-MM-DD`) already parses as UTC,
 * but a datetime with no timezone designator parses as *local* time, which
 * mis-orders artifacts written by agents in different timezones. Treat such a
 * value as UTC by appending `Z` so ordering is timezone-independent regardless
 * of what the writer emitted. Returns `NaN` for unparseable input.
 */
export function parseGeneratedTime(value: string): number {
  const hasTime = value.includes('T');
  const hasZone = /(?:[zZ]|[+-]\d{2}:?\d{2})$/.test(value);
  return Date.parse(hasTime && !hasZone ? `${value}Z` : value);
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
