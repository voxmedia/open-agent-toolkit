import { createHash } from 'node:crypto';
import { readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';

import { parseCanonicalAgentFile } from '@agents/canonical';
import type { CanonicalEntry } from '@engine/index';
import { ensureDir, fileExists } from '@fs/io';
import TOML from '@iarna/toml';

import { type CodexManagedRoleConfig, mergeCodexConfig } from './config-merge';
import { exportCanonicalAgentToCodexRole } from './export-to-codex';
import { isOatManagedCodexRoleFile } from './shared';

export type CodexExtensionAction = 'create' | 'update' | 'remove' | 'skip';
export type CodexExtensionTarget = 'role' | 'config';

export interface CodexExtensionOperation {
  action: CodexExtensionAction;
  target: CodexExtensionTarget;
  path: string;
  reason: string;
  roleName?: string;
}

export interface CodexExtensionWriteOperation extends CodexExtensionOperation {
  content?: string;
}

export interface CodexExtensionPlan {
  operations: CodexExtensionWriteOperation[];
  managedRoles: string[];
  aggregateConfigHash: string;
}

export interface CodexExtensionApplyResult {
  applied: number;
  failed: number;
  skipped: number;
}

interface DesiredCodexRole {
  roleName: string;
  description: string;
  configFile: string;
  rolePath: string;
  content: string;
}

function hashContent(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

function configPath(scopeRoot: string): string {
  return join(scopeRoot, '.codex', 'config.toml');
}

function toRelativePath(scopeRoot: string, absolutePath: string): string {
  return relative(scopeRoot, absolutePath).replaceAll('\\', '/');
}

async function readOptionalFile(path: string): Promise<string | null> {
  if (!(await fileExists(path))) {
    return null;
  }

  return readFile(path, 'utf8');
}

function normalizeManagedRolesConfig(
  desiredRoles: DesiredCodexRole[],
): CodexManagedRoleConfig[] {
  return desiredRoles.map((role) => ({
    roleName: role.roleName,
    description: role.description,
    configFile: role.configFile,
  }));
}

async function desiredRolesFromCanonical(
  canonicalEntries: CanonicalEntry[],
  scopeRoot: string,
): Promise<DesiredCodexRole[]> {
  const roles: DesiredCodexRole[] = [];

  for (const entry of canonicalEntries) {
    if (
      entry.type !== 'agent' ||
      !entry.isFile ||
      !entry.name.endsWith('.md')
    ) {
      continue;
    }

    const parsed = await parseCanonicalAgentFile(entry.canonicalPath);
    const exported = exportCanonicalAgentToCodexRole(parsed);

    roles.push({
      roleName: exported.roleName,
      description: exported.description,
      configFile: exported.configFile,
      rolePath: join(scopeRoot, '.codex', exported.configFile),
      content: exported.content,
    });
  }

  return roles.sort((left, right) =>
    left.roleName.localeCompare(right.roleName),
  );
}

function parseConfigAgentTable(
  content: string | null,
): Record<string, Record<string, unknown>> {
  if (!content || content.trim() === '') {
    return {};
  }

  try {
    const parsed = TOML.parse(content) as Record<string, unknown>;
    const agents = parsed.agents;

    if (!agents || typeof agents !== 'object' || Array.isArray(agents)) {
      return {};
    }

    const normalized: Record<string, Record<string, unknown>> = {};
    for (const [roleName, roleConfig] of Object.entries(agents)) {
      if (
        !roleConfig ||
        typeof roleConfig !== 'object' ||
        Array.isArray(roleConfig)
      ) {
        continue;
      }
      normalized[roleName] = roleConfig as Record<string, unknown>;
    }

    return normalized;
  } catch {
    return {};
  }
}

async function collectStaleManagedRoles(
  scopeRoot: string,
  existingConfigContent: string | null,
  desiredRoleNames: Set<string>,
): Promise<string[]> {
  const agents = parseConfigAgentTable(existingConfigContent);
  const stale: string[] = [];

  for (const [roleName, roleConfig] of Object.entries(agents)) {
    if (desiredRoleNames.has(roleName)) {
      continue;
    }

    const configFile = roleConfig.config_file;
    if (typeof configFile !== 'string' || !configFile.startsWith('agents/')) {
      continue;
    }

    const rolePath = join(scopeRoot, '.codex', configFile);
    const roleContent = await readOptionalFile(rolePath);
    if (!roleContent || !isOatManagedCodexRoleFile(roleContent, roleName)) {
      continue;
    }

    stale.push(roleName);
  }

  return stale.sort((left, right) => left.localeCompare(right));
}

export async function computeCodexProjectExtensionPlan(
  scopeRoot: string,
  canonicalEntries: CanonicalEntry[],
): Promise<CodexExtensionPlan> {
  const desiredRoles = await desiredRolesFromCanonical(
    canonicalEntries,
    scopeRoot,
  );
  const desiredRoleNames = new Set(desiredRoles.map((role) => role.roleName));
  const existingConfigPath = configPath(scopeRoot);
  const existingConfigContent = await readOptionalFile(existingConfigPath);
  const staleRoles = await collectStaleManagedRoles(
    scopeRoot,
    existingConfigContent,
    desiredRoleNames,
  );

  const operations: CodexExtensionWriteOperation[] = [];

  for (const role of desiredRoles) {
    const existingRoleContent = await readOptionalFile(role.rolePath);
    if (existingRoleContent === null) {
      operations.push({
        action: 'create',
        target: 'role',
        path: toRelativePath(scopeRoot, role.rolePath),
        reason: 'managed role file missing',
        roleName: role.roleName,
        content: role.content,
      });
      continue;
    }

    if (existingRoleContent.trimEnd() !== role.content.trimEnd()) {
      operations.push({
        action: 'update',
        target: 'role',
        path: toRelativePath(scopeRoot, role.rolePath),
        reason: 'managed role file differs from canonical export',
        roleName: role.roleName,
        content: role.content,
      });
      continue;
    }

    operations.push({
      action: 'skip',
      target: 'role',
      path: toRelativePath(scopeRoot, role.rolePath),
      reason: 'managed role file already in sync',
      roleName: role.roleName,
    });
  }

  for (const staleRole of staleRoles) {
    const staleRolePath = join(
      scopeRoot,
      '.codex',
      'agents',
      `${staleRole}.toml`,
    );
    const staleRoleContent = await readOptionalFile(staleRolePath);

    if (
      staleRoleContent &&
      isOatManagedCodexRoleFile(staleRoleContent, staleRole)
    ) {
      operations.push({
        action: 'remove',
        target: 'role',
        path: toRelativePath(scopeRoot, staleRolePath),
        reason: 'stale managed role removed',
        roleName: staleRole,
      });
    }
  }

  const configMerge = mergeCodexConfig({
    existingContent: existingConfigContent,
    desiredRoles: normalizeManagedRolesConfig(desiredRoles),
    staleManagedRoles: staleRoles,
  });

  operations.push({
    action:
      existingConfigContent === null
        ? 'create'
        : configMerge.changed
          ? 'update'
          : 'skip',
    target: 'config',
    path: '.codex/config.toml',
    reason:
      existingConfigContent === null
        ? 'codex config missing'
        : configMerge.changed
          ? 'codex config differs from desired managed state'
          : 'codex config already in sync',
    content: configMerge.mergedContent,
  });

  return {
    operations,
    managedRoles: desiredRoles.map((role) => role.roleName),
    aggregateConfigHash: hashContent(configMerge.mergedContent),
  };
}

export async function applyCodexProjectExtensionPlan(
  scopeRoot: string,
  plan: CodexExtensionPlan,
): Promise<CodexExtensionApplyResult> {
  const result: CodexExtensionApplyResult = {
    applied: 0,
    failed: 0,
    skipped: 0,
  };

  for (const operation of plan.operations) {
    if (operation.action === 'skip') {
      result.skipped += 1;
      continue;
    }

    const absolutePath = resolve(scopeRoot, operation.path);

    try {
      if (operation.action === 'remove') {
        await rm(absolutePath, { recursive: true, force: true });
      } else {
        await ensureDir(dirname(absolutePath));
        await writeFile(absolutePath, operation.content ?? '', 'utf8');
      }
      result.applied += 1;
    } catch {
      result.failed += 1;
    }
  }

  return result;
}

export function hasCodexExtensionChanges(plan: CodexExtensionPlan): boolean {
  return plan.operations.some((operation) => operation.action !== 'skip');
}

export function summarizeCodexExtension(plan: CodexExtensionPlan): {
  plannedOperations: number;
  skipped: number;
} {
  let plannedOperations = 0;
  let skipped = 0;

  for (const operation of plan.operations) {
    if (operation.action === 'skip') {
      skipped += 1;
      continue;
    }
    plannedOperations += 1;
  }

  return { plannedOperations, skipped };
}

export function toCodexExtensionOperations(
  plan: CodexExtensionPlan,
): CodexExtensionOperation[] {
  return plan.operations.map((operation) => ({
    action: operation.action,
    target: operation.target,
    path: operation.path,
    reason: operation.reason,
    roleName: operation.roleName,
  }));
}
