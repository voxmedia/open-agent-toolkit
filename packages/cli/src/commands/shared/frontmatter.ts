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
  'oat_implement_exit_gate',
  'oat_skill_gate_overrides',
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

const hasOwnProperty = Object.prototype.hasOwnProperty;

export const SKILL_GATE_OVERRIDE_FIELD = 'oat_skill_gate_overrides';
export const SKILL_GATE_OVERRIDE_DISABLED = 'disabled';
export const SKILL_GATE_OVERRIDE_SOURCE = `state.md:${SKILL_GATE_OVERRIDE_FIELD}`;

/**
 * Canonical gate-aware lifecycle skills: exactly the skills declaring
 * `oat_gateable: true` in their frontmatter, which is the only set a configured
 * gate may target. An override key outside this set can never disable anything,
 * so accepting one would silently record an inert instruction.
 *
 * `skills.test.ts` pins this constant against the live `oat_gateable: true`
 * declarations so the two cannot drift apart.
 */
export const GATE_AWARE_SKILLS = [
  'oat-project-implement',
  'oat-project-import-plan',
  'oat-project-plan',
  'oat-project-quick-start',
] as const;

export type SkillGateOverrideValue = typeof SKILL_GATE_OVERRIDE_DISABLED;

export interface ProjectSkillGateOverrides {
  /** False when the key is absent entirely: absence means follow configuration. */
  present: boolean;
  overrides: Record<string, SkillGateOverrideValue>;
}

function skillGateOverrideError(statePath: string, detail: string): Error {
  return new Error(
    `${statePath}: \`${SKILL_GATE_OVERRIDE_FIELD}\` ${detail}. Use a map of gate-aware skill names to the literal value \`${SKILL_GATE_OVERRIDE_DISABLED}\`, or remove the key to follow configured gates.`,
  );
}

/**
 * Strict parser for the per-project gate override map.
 *
 * Absence is not an error and never fabricates configuration. Every rejection
 * names the offending project state path so the operator can repair it.
 */
export function parseSkillGateOverrides(
  frontmatter: string,
  statePath: string,
): ProjectSkillGateOverrides {
  const document = YAML.parseDocument(frontmatter, { uniqueKeys: true });
  if (document.errors.length > 0) {
    throw skillGateOverrideError(
      statePath,
      `cannot be read because the frontmatter is malformed (${document.errors[0]?.message ?? 'YAML parse error'})`,
    );
  }

  // A scalar or sequence root is malformed project state, not "no overrides":
  // returning an empty map here would silently launch a disabled gate.
  if (!isMap(document.contents)) {
    throw skillGateOverrideError(
      statePath,
      'cannot be read because the frontmatter root is not a YAML map',
    );
  }

  const matches = document.contents.items.filter(
    (pair) =>
      isScalar(pair.key) && pair.key.value === SKILL_GATE_OVERRIDE_FIELD,
  );
  if (matches.length === 0) {
    return { present: false, overrides: {} };
  }
  // `uniqueKeys` already rejects a duplicate top-level key above; this stays as
  // a fail-closed guard rather than silently reading the first of several.
  if (matches.length > 1) {
    throw skillGateOverrideError(statePath, 'is declared more than once');
  }

  const value = matches[0]?.value;
  // An explicitly null or empty map is a deliberate "no overrides" statement.
  if (value === null || (isScalar(value) && value.value === null)) {
    return { present: true, overrides: {} };
  }
  if (!isMap(value)) {
    throw skillGateOverrideError(
      statePath,
      'must be a map of skill names to `disabled`',
    );
  }

  const overrides: Record<string, SkillGateOverrideValue> = {};
  for (const pair of value.items) {
    if (!isScalar(pair.key) || typeof pair.key.value !== 'string') {
      throw skillGateOverrideError(statePath, 'has a non-string skill key');
    }
    // Exact spelling only: a padded or decorated key is not the skill name.
    const skill = pair.key.value;
    if (!skill) {
      throw skillGateOverrideError(statePath, 'has an empty skill key');
    }
    if (pair.key.anchor !== undefined || pair.key.tag !== undefined) {
      throw skillGateOverrideError(
        statePath,
        `decorates the key \`${skill}\` with a YAML anchor or tag`,
      );
    }
    if (!(GATE_AWARE_SKILLS as readonly string[]).includes(skill)) {
      throw skillGateOverrideError(
        statePath,
        `names \`${skill}\`, which is not a gate-aware skill`,
      );
    }
    if (hasOwnProperty.call(overrides, skill)) {
      throw skillGateOverrideError(
        statePath,
        `declares \`${skill}\` more than once`,
      );
    }

    const entry = pair.value;
    if (
      !isScalar(entry) ||
      entry.anchor !== undefined ||
      entry.tag !== undefined ||
      typeof entry.value !== 'string' ||
      entry.value !== SKILL_GATE_OVERRIDE_DISABLED
    ) {
      throw skillGateOverrideError(
        statePath,
        `sets \`${skill}\` to an unsupported value`,
      );
    }

    overrides[skill] = SKILL_GATE_OVERRIDE_DISABLED;
  }

  return { present: true, overrides };
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
