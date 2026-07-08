import { createHash } from 'node:crypto';
import { readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { basename, dirname, join, relative, resolve } from 'node:path';

import { parseCanonicalAgentFile } from '@agents/canonical';
import {
  isCodexMaterializedRouteTarget,
  resolveActiveProject,
  validateDispatchRouteTarget,
  type WorkflowDispatchMatrixCell,
  type WorkflowDispatchProviderValue,
  type WorkflowDispatchRouteEntry,
  type WorkflowDispatchRouteTarget,
} from '@config/oat-config';
import { resolveEffectiveConfig } from '@config/resolve';
import type { CanonicalEntry } from '@engine/index';
import { ensureDir, fileExists } from '@fs/io';
import TOML from '@iarna/toml';
import YAML from 'yaml';

import { type CodexManagedRoleConfig, mergeCodexConfig } from './config-merge';
import { exportCanonicalAgentToCodexRole } from './export-to-codex';
import { materializeCodexRole } from './materialize';
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

interface CodexMaterializationTarget {
  model: string;
  effort: string;
}

interface CodexMaterializationTargetOptions {
  userConfigDir?: string;
  projectPath?: string | null;
  env?: NodeJS.ProcessEnv;
}

const CODEX_MATERIALIZED_BASE_ROLES = new Set([
  'oat-phase-implementer',
  'oat-reviewer',
]);

function hashContent(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

function configPath(scopeRoot: string): string {
  return join(scopeRoot, '.codex', 'config.toml');
}

function toRelativePath(scopeRoot: string, absolutePath: string): string {
  return relative(scopeRoot, absolutePath).replaceAll('\\', '/');
}

function canonicalPathAllowed(
  scopeRoot: string,
  canonicalEntry: CanonicalEntry,
  allowedCanonicalPaths?: string[],
): boolean {
  if (!allowedCanonicalPaths?.length) {
    return true;
  }

  const allowedSet = new Set(allowedCanonicalPaths);
  const relativeCanonicalPath = toRelativePath(
    scopeRoot,
    canonicalEntry.canonicalPath,
  );
  return allowedSet.has(relativeCanonicalPath);
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
  materializationTargets: CodexMaterializationTarget[],
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

    if (CODEX_MATERIALIZED_BASE_ROLES.has(exported.roleName)) {
      for (const target of materializationTargets) {
        const materialized = materializeCodexRole({
          agent: parsed,
          model: target.model,
          effort: target.effort,
        });
        roles.push({
          roleName: materialized.roleName,
          description: materialized.description,
          configFile: materialized.configFile,
          rolePath: join(scopeRoot, '.codex', materialized.configFile),
          content: materialized.content,
        });
      }
    }
  }

  return roles.sort((left, right) =>
    left.roleName.localeCompare(right.roleName),
  );
}

function collectCodexTargetFromEntry(
  entry: WorkflowDispatchRouteEntry,
  targets: Map<string, CodexMaterializationTarget>,
): void {
  if (typeof entry === 'string') {
    return;
  }

  if (!isCodexMaterializedRouteTarget('codex', entry)) {
    return;
  }

  const validation = validateDispatchRouteTarget('codex', entry);
  if (!validation.valid || !entry.model || !entry.effort) {
    return;
  }

  targets.set(`${entry.model}\0${entry.effort}`, {
    model: entry.model,
    effort: entry.effort,
  });
}

function collectCodexTargetsFromCell(
  cell: WorkflowDispatchMatrixCell,
  targets: Map<string, CodexMaterializationTarget>,
): void {
  if (typeof cell === 'string') {
    return;
  }

  for (const entry of cell) {
    collectCodexTargetFromEntry(entry, targets);
  }
}

function collectCodexMaterializationTargetsFromProvider(
  providerValue: WorkflowDispatchProviderValue | undefined,
  targets: Map<string, CodexMaterializationTarget>,
): void {
  if (providerValue === undefined || typeof providerValue === 'string') {
    return;
  }

  for (const cell of Object.values(providerValue)) {
    if (cell !== undefined) {
      collectCodexTargetsFromCell(cell, targets);
    }
  }
}

function sortCodexMaterializationTargets(
  targets: Map<string, CodexMaterializationTarget>,
): CodexMaterializationTarget[] {
  return [...targets.values()].sort((left, right) => {
    const modelOrder = left.model.localeCompare(right.model);
    return modelOrder === 0
      ? left.effort.localeCompare(right.effort)
      : modelOrder;
  });
}

function routeTargetFromUnknown(
  value: unknown,
): WorkflowDispatchRouteTarget | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const target: WorkflowDispatchRouteTarget = {};
  for (const key of ['harness', 'model', 'effort'] as const) {
    const rawValue = record[key];
    if (typeof rawValue === 'string' && rawValue.trim()) {
      target[key] = rawValue.trim();
    }
  }

  return Object.keys(target).length > 0 ? target : null;
}

function collectCodexTargetsFromUnknownCell(
  value: unknown,
  targets: Map<string, CodexMaterializationTarget>,
): void {
  if (typeof value === 'string' || !Array.isArray(value)) {
    return;
  }

  for (const entry of value) {
    if (typeof entry === 'string') {
      continue;
    }

    const target = routeTargetFromUnknown(entry);
    if (target) {
      collectCodexTargetFromEntry(target, targets);
    }
  }
}

function collectCodexTargetsFromUnknownProvider(
  value: unknown,
  targets: Map<string, CodexMaterializationTarget>,
): void {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return;
  }

  for (const cell of Object.values(value)) {
    collectCodexTargetsFromUnknownCell(cell, targets);
  }
}

function frontmatterBlock(content: string): string | null {
  const normalized = content.startsWith('\uFEFF') ? content.slice(1) : content;
  if (!normalized.startsWith('---\n')) {
    return null;
  }

  const end = normalized.indexOf('\n---', 4);
  return end > 0 ? normalized.slice(4, end) : null;
}

async function collectProjectStateCodexTargets(
  scopeRoot: string,
  options: CodexMaterializationTargetOptions,
  targets: Map<string, CodexMaterializationTarget>,
): Promise<void> {
  const projectPath =
    options.projectPath === undefined
      ? (await resolveActiveProject(scopeRoot)).path
      : options.projectPath;
  if (!projectPath) {
    return;
  }

  const statePath = join(resolve(scopeRoot, projectPath), 'state.md');
  const stateContent = await readOptionalFile(statePath);
  if (!stateContent) {
    return;
  }

  const frontmatter = frontmatterBlock(stateContent);
  if (!frontmatter) {
    return;
  }

  const parsed = YAML.parse(frontmatter) as unknown;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return;
  }

  const policy = (parsed as Record<string, unknown>)['oat_dispatch_policy'];
  if (!policy || typeof policy !== 'object' || Array.isArray(policy)) {
    return;
  }

  const matrix = (policy as Record<string, unknown>)['matrix'];
  if (!matrix || typeof matrix !== 'object' || Array.isArray(matrix)) {
    return;
  }

  collectCodexTargetsFromUnknownProvider(
    (matrix as Record<string, unknown>)['codex'],
    targets,
  );
}

async function readCodexMaterializationTargets(
  scopeRoot: string,
  options: CodexMaterializationTargetOptions = {},
): Promise<CodexMaterializationTarget[]> {
  const targets = new Map<string, CodexMaterializationTarget>();
  const effectiveConfig = await resolveEffectiveConfig(
    scopeRoot,
    options.userConfigDir ?? join(scopeRoot, '.oat', '__no-user-config__'),
    options.env,
  );

  for (const providerValue of [
    effectiveConfig.user.workflow?.dispatchCeiling?.providers?.codex,
    effectiveConfig.shared.workflow?.dispatchCeiling?.providers?.codex,
    effectiveConfig.local.workflow?.dispatchCeiling?.providers?.codex,
  ]) {
    collectCodexMaterializationTargetsFromProvider(providerValue, targets);
  }

  await collectProjectStateCodexTargets(scopeRoot, options, targets);

  return sortCodexMaterializationTargets(targets);
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
  const stale = new Set<string>();

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

    stale.add(roleName);
  }

  const agentsDir = join(scopeRoot, '.codex', 'agents');
  let roleFiles: string[];
  try {
    roleFiles = await readdir(agentsDir);
  } catch {
    roleFiles = [];
  }

  for (const roleFile of roleFiles) {
    if (!roleFile.endsWith('.toml')) {
      continue;
    }

    const roleName = basename(roleFile, '.toml');
    if (desiredRoleNames.has(roleName) || stale.has(roleName)) {
      continue;
    }

    const rolePath = join(agentsDir, roleFile);
    const roleContent = await readOptionalFile(rolePath);
    if (!roleContent || !isOatManagedCodexRoleFile(roleContent, roleName)) {
      continue;
    }

    stale.add(roleName);
  }

  return [...stale].sort((left, right) => left.localeCompare(right));
}

export async function computeCodexProjectExtensionPlan(
  scopeRoot: string,
  canonicalEntries: CanonicalEntry[],
  allowedCanonicalPaths?: string[],
  options: CodexMaterializationTargetOptions = {},
): Promise<CodexExtensionPlan> {
  const isPartialSync =
    allowedCanonicalPaths !== undefined && allowedCanonicalPaths.length > 0;
  const materializationTargets = await readCodexMaterializationTargets(
    scopeRoot,
    options,
  );
  const desiredRoles = await desiredRolesFromCanonical(
    canonicalEntries.filter((entry) =>
      canonicalPathAllowed(scopeRoot, entry, allowedCanonicalPaths),
    ),
    scopeRoot,
    materializationTargets,
  );
  const desiredRoleNames = new Set(desiredRoles.map((role) => role.roleName));
  const existingConfigPath = configPath(scopeRoot);
  const existingConfigContent = await readOptionalFile(existingConfigPath);
  const staleRoles = isPartialSync
    ? []
    : await collectStaleManagedRoles(
        scopeRoot,
        existingConfigContent,
        desiredRoleNames,
      );

  if (isPartialSync && desiredRoles.length === 0) {
    return {
      operations: [],
      managedRoles: [],
      aggregateConfigHash: hashContent(existingConfigContent ?? ''),
    };
  }

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
    managedRoles: [...desiredRoles.map((role) => role.roleName), ...staleRoles],
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
