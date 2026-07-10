import { createHash } from 'node:crypto';

import TOML from '@iarna/toml';

export const OAT_MANAGED_ROLE_HEADER = '# oat-managed: true';
export const OAT_MANAGED_ROLE_NAME_PREFIX = '# oat-role: ';
export const OAT_MANAGED_ROLE_OWNER_PREFIX = '# oat-owner: ';

export type CodexRoleOwner =
  | 'supported-catalogue'
  | 'user-config'
  | 'project-config';

interface CodexManagedRoleHeader {
  roleName: string;
  roleLineIndex: number;
  owner: CodexRoleOwner | null;
  ownerLineIndex: number | null;
}

const CODEX_ROLE_MARKER_PATTERN = /^# oat-role: ([a-zA-Z0-9_-]+)$/;
const CODEX_OWNER_MARKER_PATTERN =
  /^# oat-owner: (supported-catalogue|user-config|project-config)$/;

const STANDARD_SUPPORTED_CODEX_EFFORTS = [
  'low',
  'medium',
  'high',
  'xhigh',
] as const;

export const SUPPORTED_CODEX_ROLE_TARGETS = [
  ...STANDARD_SUPPORTED_CODEX_EFFORTS.map((effort) => ({
    model: 'gpt-5.6-luna',
    effort,
  })),
  ...STANDARD_SUPPORTED_CODEX_EFFORTS.map((effort) => ({
    model: 'gpt-5.6-terra',
    effort,
  })),
  ...[...STANDARD_SUPPORTED_CODEX_EFFORTS, 'max'].map((effort) => ({
    model: 'gpt-5.6-sol',
    effort,
  })),
] as const;

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

function isSupportedCodexRoleTarget(model: string, effort: string): boolean {
  return SUPPORTED_CODEX_ROLE_TARGETS.some(
    (supported) => supported.model === model && supported.effort === effort,
  );
}

export function buildCodexMaterializedTargetRoleName(options: {
  agentName: string;
  model: string;
  effort: string;
}): string {
  const normalizedAgentName = sanitizeCodexRoleName(options.agentName);
  const normalizedModel = normalizeCodexRoleName(options.model);
  const normalizedEffort = normalizeCodexRoleName(options.effort);
  const customTargetSuffix = isSupportedCodexRoleTarget(
    options.model,
    options.effort,
  )
    ? ''
    : `-${createHash('sha256')
        .update(`${options.model}\0${options.effort}`)
        .digest('hex')
        .slice(0, 10)}`;

  return normalizeCodexRoleName(
    `${normalizedAgentName}-${normalizedModel}-${normalizedEffort}${customTargetSuffix}`,
  );
}

function parseOatManagedCodexRoleHeader(
  content: string,
): CodexManagedRoleHeader | null {
  const lines = content
    .split('\n')
    .map((line) => (line.endsWith('\r') ? line.slice(0, -1) : line));
  const headerLines: string[] = [];
  for (const line of lines) {
    if (!line.startsWith('# oat-')) {
      break;
    }
    headerLines.push(line);
  }

  if (
    headerLines.length < 2 ||
    headerLines.length > 3 ||
    headerLines[0] !== OAT_MANAGED_ROLE_HEADER
  ) {
    return null;
  }

  const roleMatch = CODEX_ROLE_MARKER_PATTERN.exec(headerLines[1]!);
  if (!roleMatch) {
    return null;
  }

  let owner: CodexRoleOwner | null = null;
  let ownerLineIndex: number | null = null;
  if (headerLines.length === 3) {
    const ownerMatch = CODEX_OWNER_MARKER_PATTERN.exec(headerLines[2]!);
    if (!ownerMatch) {
      return null;
    }
    owner = ownerMatch[1] as CodexRoleOwner;
    ownerLineIndex = 2;
  }

  return {
    roleName: roleMatch[1]!,
    roleLineIndex: 1,
    owner,
    ownerLineIndex,
  };
}

export function isOatManagedCodexRoleFile(
  content: string,
  roleName?: string,
): boolean {
  const header = parseOatManagedCodexRoleHeader(content);
  if (!header) {
    return false;
  }

  return roleName === undefined || header.roleName === roleName;
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
  return parseOatManagedCodexRoleHeader(content)?.owner ?? null;
}

export function withOatManagedCodexRoleOwner(
  content: string,
  owner: CodexRoleOwner,
): string {
  const header = parseOatManagedCodexRoleHeader(content);
  if (!header) {
    return content;
  }

  const lines = content.split('\n');
  const ownerLine = `${OAT_MANAGED_ROLE_OWNER_PREFIX}${owner}`;
  const usesCarriageReturn =
    lines[header.roleLineIndex]?.endsWith('\r') ?? false;
  const encodedOwnerLine = `${ownerLine}${usesCarriageReturn ? '\r' : ''}`;
  if (header.ownerLineIndex !== null) {
    lines[header.ownerLineIndex] = encodedOwnerLine;
    return lines.join('\n');
  }

  lines.splice(header.roleLineIndex + 1, 0, encodedOwnerLine);
  return lines.join('\n');
}

export function stringifyToml(object: Record<string, unknown>): string {
  return TOML.stringify(object as never);
}
