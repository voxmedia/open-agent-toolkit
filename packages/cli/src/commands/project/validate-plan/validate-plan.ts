import { extractPhaseIds } from './profiles';

export {
  parseFrontmatterFromContent,
  type FrontmatterResult,
} from './frontmatter';
export {
  extractPhaseIds,
  resolvePlanProfile,
  validateLitePlan,
  validatePlanForProfile,
  type LitePlanValidationResult,
  type PlanProfile,
  type ValidationContext,
  type ValidationIssue,
} from './profiles';

export type ValidationResult =
  | { valid: true }
  | { valid: false; errors: string[] };

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

/** Task-profile phase ids: unique task-heading phase ids, sorted. */
export function extractPhaseIdsFromPlan(planContent: string): string[] {
  return extractPhaseIds(planContent, 'task');
}
