import TOML from '@iarna/toml';

export const OAT_MANAGED_ROLE_HEADER = '# oat-managed: true';
export const OAT_MANAGED_ROLE_NAME_PREFIX = '# oat-role: ';

export function sanitizeCodexRoleName(input: string): string {
  return input.trim().replace(/\.md$/i, '');
}

export function isOatManagedCodexRoleFile(
  content: string,
  roleName?: string,
): boolean {
  if (!content.includes(OAT_MANAGED_ROLE_HEADER)) {
    return false;
  }

  if (!roleName) {
    return true;
  }

  return content.includes(`${OAT_MANAGED_ROLE_NAME_PREFIX}${roleName}`);
}

export function withOatManagedCodexHeader(
  roleName: string,
  tomlBody: string,
): string {
  return `${OAT_MANAGED_ROLE_HEADER}\n${OAT_MANAGED_ROLE_NAME_PREFIX}${roleName}\n${tomlBody}`;
}

export function stringifyToml(object: Record<string, unknown>): string {
  return TOML.stringify(object as never);
}
