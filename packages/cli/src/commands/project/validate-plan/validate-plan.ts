import YAML from 'yaml';

const FRONTMATTER_PATTERN = /^---\s*\n([\s\S]*?)\n---\s*(?:\n|$)/;

export type FrontmatterResult =
  | { kind: 'ok'; data: Record<string, unknown> }
  | { kind: 'no-frontmatter'; data: Record<string, unknown> }
  | { kind: 'invalid'; message: string };

export function parseFrontmatterFromContent(
  content: string,
): FrontmatterResult {
  const match = content.match(FRONTMATTER_PATTERN);
  if (!match?.[1]) {
    return { kind: 'no-frontmatter', data: {} };
  }
  try {
    const parsed: unknown = YAML.parse(match[1]);
    if (
      parsed !== null &&
      typeof parsed === 'object' &&
      !Array.isArray(parsed)
    ) {
      return { kind: 'ok', data: parsed as Record<string, unknown> };
    }
    return {
      kind: 'invalid',
      message: 'Frontmatter did not parse as an object',
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      kind: 'invalid',
      message: `Malformed YAML in frontmatter: ${message}`,
    };
  }
}

export type ValidationResult =
  | { valid: true }
  | { valid: false; errors: string[] };

export type LitePlanValidationResult =
  | { ok: true }
  | {
      ok: false;
      code:
        | 'lite-multi-phase'
        | 'lite-parallel-groups'
        | 'lite-criterion-without-command';
      message: string;
    };

function validationCriteria(planContent: string): string[] | null {
  const heading = /^## Validation Criteria[ \t]*$/m.exec(planContent);
  if (!heading) return null;
  const bodyStart = heading.index + heading[0].length;
  const remaining = planContent.slice(bodyStart);
  const nextHeading = /^##\s+/m.exec(remaining);
  const body = remaining.slice(0, nextHeading?.index ?? remaining.length);
  return body
    .split('\n')
    .filter((line) => /^\s*-\s+/.test(line))
    .map((line) => line.replace(/^\s*-\s+(?:\[[ xX]\]\s*)?/, '').trim());
}

export function validateLitePlan(
  planContent: string,
  workflowMode: string | null | undefined,
): LitePlanValidationResult {
  if (workflowMode !== 'lite') {
    return { ok: true };
  }

  const phaseCount = planContent.match(/^## Phase\b.*$/gm)?.length ?? 0;
  if (phaseCount !== 1) {
    return {
      ok: false,
      code: 'lite-multi-phase',
      message: `Lite plans must contain exactly one phase; found ${phaseCount}.`,
    };
  }

  const frontmatter = parseFrontmatterFromContent(planContent);
  const groups =
    frontmatter.kind === 'invalid'
      ? undefined
      : frontmatter.data['oat_plan_parallel_groups'];
  if (
    groups !== undefined &&
    groups !== null &&
    !(Array.isArray(groups) && groups.length === 0)
  ) {
    return {
      ok: false,
      code: 'lite-parallel-groups',
      message: 'Lite plans must declare no parallel groups.',
    };
  }

  const criteria = validationCriteria(planContent);
  const invalidCriterion = criteria?.find(
    (criterion) =>
      !criterion.startsWith('manual:') && !/`[^`\n]+`/.test(criterion),
  );
  if (!criteria || criteria.length === 0 || invalidCriterion !== undefined) {
    return {
      ok: false,
      code: 'lite-criterion-without-command',
      message:
        'Every lite Validation Criteria bullet must name a command in backticks or start with manual: after the bullet marker.',
    };
  }

  return { ok: true };
}

export function validateParallelGroups(
  groups: unknown,
  phaseIds: readonly string[],
): ValidationResult {
  // Missing or empty → valid (sequential execution, no parallelism declared)
  if (groups === undefined || groups === null) {
    return { valid: true };
  }
  if (Array.isArray(groups) && groups.length === 0) {
    return { valid: true };
  }

  const errors: string[] = [];

  if (!Array.isArray(groups)) {
    return {
      valid: false,
      errors: [
        'oat_plan_parallel_groups must be an array of arrays of phase IDs',
      ],
    };
  }

  const seen = new Set<string>();

  for (const [i, group] of groups.entries()) {
    if (!Array.isArray(group)) {
      errors.push(`group[${i}] must be an array of phase IDs`);
      continue;
    }
    if (group.length < 2) {
      errors.push(
        `group[${i}] must contain at least 2 phase IDs (singleton groups are not allowed — run a solo lane as an ungrouped phase (ungrouped phases execute sequentially in plan order))`,
      );
    }
    for (const phaseId of group) {
      if (typeof phaseId !== 'string') {
        errors.push(`group[${i}] contains a non-string value`);
        continue;
      }
      if (!phaseIds.includes(phaseId)) {
        errors.push(`group[${i}] references unknown phase: ${phaseId}`);
      }
      if (seen.has(phaseId)) {
        errors.push(`phase ${phaseId} appears in multiple groups`);
      }
      seen.add(phaseId);
    }
  }

  return errors.length > 0 ? { valid: false, errors } : { valid: true };
}

export function extractPhaseIdsFromPlan(planContent: string): string[] {
  const matches = planContent.match(/### Task (p\d+)-t\d+/g) ?? [];
  const ids = matches.map((m) => {
    const parts = m.split(' ');
    return parts[2]!.split('-')[0]!;
  });
  return Array.from(new Set(ids)).sort();
}
