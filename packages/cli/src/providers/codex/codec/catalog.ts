import { buildCodexMaterializedRoleName } from './materialize';

export const SUPPORTED_CODEX_BASE_ROLES = [
  'oat-phase-implementer',
  'oat-reviewer',
] as const;

const STANDARD_EFFORTS = ['low', 'medium', 'high', 'xhigh'] as const;

export const SUPPORTED_CODEX_ROLE_TARGETS = [
  ...STANDARD_EFFORTS.map((effort) => ({
    model: 'gpt-5.6-luna',
    effort,
  })),
  ...STANDARD_EFFORTS.map((effort) => ({
    model: 'gpt-5.6-terra',
    effort,
  })),
  ...[...STANDARD_EFFORTS, 'max'].map((effort) => ({
    model: 'gpt-5.6-sol',
    effort,
  })),
] as const;

export interface SupportedCodexRoleCatalogueEntry {
  baseRole: (typeof SUPPORTED_CODEX_BASE_ROLES)[number];
  model: string;
  effort: string;
  roleName: string;
}

export function isSupportedCodexRoleTarget(target: {
  model: string;
  effort: string;
}): boolean {
  return SUPPORTED_CODEX_ROLE_TARGETS.some(
    (supported) =>
      supported.model === target.model && supported.effort === target.effort,
  );
}

export function expandSupportedCodexRoleCatalogue(): SupportedCodexRoleCatalogueEntry[] {
  return SUPPORTED_CODEX_BASE_ROLES.flatMap((baseRole) =>
    SUPPORTED_CODEX_ROLE_TARGETS.map((target) => ({
      baseRole,
      ...target,
      roleName: buildCodexMaterializedRoleName({
        agentName: baseRole,
        model: target.model,
        effort: target.effort,
      }),
    })),
  ).sort((left, right) => left.roleName.localeCompare(right.roleName));
}
