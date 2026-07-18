export const OAT_MANAGED_CURSOR_COMMENT = '# oat-managed: true';
export const OAT_CURSOR_ROLE_COMMENT_PREFIX = '# oat-role: ';
export const OAT_CURSOR_OWNER_COMMENT_PREFIX = '# oat-owner: ';

export type CursorRoleOwner =
  | 'supported-catalogue'
  | 'user-config'
  | 'project-config';

interface CursorManagedRoleMarkers {
  roleName: string;
  owner: CursorRoleOwner;
}

const CURSOR_ROLE_NAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const CURSOR_ROLE_COMMENT_PATTERN = /^# oat-role: ([a-z0-9]+(?:-[a-z0-9]+)*)$/;
const CURSOR_OWNER_COMMENT_PATTERN =
  /^# oat-owner: (supported-catalogue|user-config|project-config)$/;

export function normalizeCursorRoleName(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/\.md$/i, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function buildCursorMaterializedRoleName(options: {
  agentName: string;
  ladderModelId: string;
}): string {
  return normalizeCursorRoleName(
    `${normalizeCursorRoleName(options.agentName)}-${normalizeCursorRoleName(options.ladderModelId)}`,
  );
}

export function renderCursorManagedComments(
  roleName: string,
  owner: CursorRoleOwner,
): string[] {
  const normalizedRoleName = normalizeCursorRoleName(roleName);
  if (
    normalizedRoleName !== roleName ||
    !CURSOR_ROLE_NAME_PATTERN.test(roleName)
  ) {
    throw new Error(`Invalid managed Cursor role name: ${roleName}`);
  }

  return [
    OAT_MANAGED_CURSOR_COMMENT,
    `${OAT_CURSOR_ROLE_COMMENT_PREFIX}${roleName}`,
    `${OAT_CURSOR_OWNER_COMMENT_PREFIX}${owner}`,
  ];
}

function frontmatterLines(content: string): string[] | null {
  const normalized = content.startsWith('\uFEFF') ? content.slice(1) : content;
  if (!normalized.startsWith('---\n')) {
    return null;
  }
  const end = normalized.indexOf('\n---', 4);
  if (end < 0) {
    return null;
  }
  return normalized.slice(4, end).split('\n');
}

function parseCursorManagedRoleMarkers(
  content: string,
): CursorManagedRoleMarkers | null {
  const lines = frontmatterLines(content);
  if (!lines) {
    return null;
  }

  const managedLines = lines.filter((line) =>
    line.startsWith('# oat-managed:'),
  );
  const roleLines = lines.filter((line) => line.startsWith('# oat-role:'));
  const ownerLines = lines.filter((line) => line.startsWith('# oat-owner:'));
  if (
    managedLines.length !== 1 ||
    roleLines.length !== 1 ||
    ownerLines.length !== 1 ||
    managedLines[0] !== OAT_MANAGED_CURSOR_COMMENT
  ) {
    return null;
  }

  const roleMatch = CURSOR_ROLE_COMMENT_PATTERN.exec(roleLines[0]!);
  const ownerMatch = CURSOR_OWNER_COMMENT_PATTERN.exec(ownerLines[0]!);
  if (!roleMatch || !ownerMatch) {
    return null;
  }

  return {
    roleName: roleMatch[1]!,
    owner: ownerMatch[1] as CursorRoleOwner,
  };
}

export function isOatManagedCursorRoleFile(
  content: string,
  roleName?: string,
): boolean {
  const markers = parseCursorManagedRoleMarkers(content);
  return (
    markers !== null &&
    (roleName === undefined || markers.roleName === roleName)
  );
}

export function readOatManagedCursorRoleName(content: string): string | null {
  return parseCursorManagedRoleMarkers(content)?.roleName ?? null;
}

export function readOatManagedCursorRoleOwner(
  content: string,
): CursorRoleOwner | null {
  return parseCursorManagedRoleMarkers(content)?.owner ?? null;
}
