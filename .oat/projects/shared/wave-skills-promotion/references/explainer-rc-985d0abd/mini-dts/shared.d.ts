export declare const OAT_MANAGED_ROLE_HEADER = '# oat-managed: true';
export declare const OAT_MANAGED_ROLE_NAME_PREFIX = '# oat-role: ';
export declare const OAT_MANAGED_ROLE_OWNER_PREFIX = '# oat-owner: ';
export type CodexRoleOwner =
  | 'supported-catalogue'
  | 'user-config'
  | 'project-config';
export declare const SUPPORTED_CODEX_ROLE_TARGETS: readonly (
  | {
      model: string;
      effort: 'high' | 'low' | 'medium' | 'xhigh';
    }
  | {
      model: string;
      effort: 'high' | 'low' | 'medium' | 'xhigh';
    }
  | {
      model: string;
      effort: string;
    }
)[];
export declare function sanitizeCodexRoleName(input: string): string;
export declare function normalizeCodexRoleName(input: string): string;
export declare function buildCodexMaterializedTargetRoleName(options: {
  agentName: string;
  model: string;
  effort: string;
}): string;
export declare function isOatManagedCodexRoleFile(
  content: string,
  roleName?: string,
): boolean;
export declare function withOatManagedCodexHeader(
  roleName: string,
  tomlBody: string,
): string;
export declare function readOatManagedCodexRoleOwner(
  content: string,
): CodexRoleOwner | null;
export declare function withOatManagedCodexRoleOwner(
  content: string,
  owner: CodexRoleOwner,
): string;
export declare function stringifyToml(object: Record<string, unknown>): string;
//# sourceMappingURL=shared.d.ts.map
