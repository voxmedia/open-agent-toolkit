import TOML from '@iarna/toml';

export const OAT_MANAGED_ROLE_HEADER = '# oat-managed: true';
export const OAT_MANAGED_ROLE_NAME_PREFIX = '# oat-role: ';
export const OAT_MANAGED_ROLE_OWNER_PREFIX = '# oat-owner: ';

export type CodexRoleOwner =
  | 'supported-catalogue'
  | 'user-config'
  | 'project-config';

export function sanitizeCodexRoleName(input: string): string {
  return normalizeCodexRoleName(input.replace(/\.md$/i, ''));
}

export function normalizeCodexRoleName(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');
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

export function readOatManagedCodexRoleOwner(
  content: string,
): CodexRoleOwner | null {
  for (const owner of [
    'supported-catalogue',
    'user-config',
    'project-config',
  ] as const) {
    if (content.includes(`${OAT_MANAGED_ROLE_OWNER_PREFIX}${owner}`)) {
      return owner;
    }
  }
  return null;
}

export function withOatManagedCodexRoleOwner(
  content: string,
  owner: CodexRoleOwner,
): string {
  const lines = content.split('\n');
  const ownerLine = `${OAT_MANAGED_ROLE_OWNER_PREFIX}${owner}`;
  const existingOwnerIndex = lines.findIndex((line) =>
    line.startsWith(OAT_MANAGED_ROLE_OWNER_PREFIX),
  );
  if (existingOwnerIndex >= 0) {
    lines[existingOwnerIndex] = ownerLine;
    return lines.join('\n');
  }

  const roleIndex = lines.findIndex((line) =>
    line.startsWith(OAT_MANAGED_ROLE_NAME_PREFIX),
  );
  lines.splice(roleIndex >= 0 ? roleIndex + 1 : 0, 0, ownerLine);
  return lines.join('\n');
}

export function stringifyToml(object: Record<string, unknown>): string {
  return TOML.stringify(object as never);
}
