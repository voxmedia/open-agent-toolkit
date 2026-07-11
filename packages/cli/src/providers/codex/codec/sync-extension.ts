import { createHash } from 'node:crypto';
import { readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { basename, dirname, join, relative, resolve } from 'node:path';

import { parseCanonicalAgentFile } from '@agents/canonical';
import {
  isCodexMaterializedRouteTarget,
  isWorkflowDispatchCandidateLadder,
  isWorkflowDispatchFallbackRoute,
  normalizeProjectPath,
  resolveActiveProject,
  validateDispatchRouteTarget,
  type WorkflowDispatchMatrixCell,
  type WorkflowDispatchProviderValue,
  type WorkflowDispatchRouteEntry,
  type WorkflowDispatchRouteTarget,
} from '@config/oat-config';
import { resolveEffectiveConfig } from '@config/resolve';
import type { CanonicalEntry } from '@engine/index';
import { CliError } from '@errors/index';
import { ensureDir, fileExists } from '@fs/io';
import { validateRealPathWithinScope } from '@fs/paths';
import TOML from '@iarna/toml';
import YAML from 'yaml';

import {
  SUPPORTED_CODEX_BASE_ROLES,
  SUPPORTED_CODEX_ROLE_TARGETS,
} from './catalog';
import {
  type CodexManagedRoleConfig,
  mergeCodexConfig,
  readCodexMaxDepth,
} from './config-merge';
import { exportCanonicalAgentToCodexRole } from './export-to-codex';
import { materializeCodexRole } from './materialize';
import {
  isOatManagedCodexRoleFile,
  readOatManagedCodexRoleOwner,
  withOatManagedCodexRoleOwner,
  type CodexRoleOwner,
} from './shared';

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
  owner: CodexRoleOwner;
}

interface CodexMaterializationTargetOptions {
  userConfigDir?: string;
  projectPath?: string | null;
  env?: NodeJS.ProcessEnv;
}

const CODEX_MATERIALIZED_BASE_ROLES = new Set<string>(
  SUPPORTED_CODEX_BASE_ROLES,
);

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
          content: withOatManagedCodexRoleOwner(
            materialized.content,
            target.owner,
          ),
        });
      }
    }
  }

  const roleContents = new Map<string, string>();
  for (const role of roles) {
    const existing = roleContents.get(role.roleName);
    if (existing !== undefined && existing !== role.content) {
      throw new CliError(
        `Distinct Codex targets produced the same role name ${role.roleName}. Refusing ambiguous role writes.`,
      );
    }
    roleContents.set(role.roleName, role.content);
  }

  return roles.sort((left, right) =>
    left.roleName.localeCompare(right.roleName),
  );
}

function collectCodexTargetFromEntry(
  entry: WorkflowDispatchRouteEntry,
  targets: Map<string, CodexMaterializationTarget>,
  owner: CodexRoleOwner,
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

  const key = `${entry.model}\0${entry.effort}`;
  if (!targets.has(key)) {
    targets.set(key, {
      model: entry.model,
      effort: entry.effort,
      owner,
    });
  }
}

function collectCodexTargetsFromCell(
  cell: WorkflowDispatchMatrixCell,
  targets: Map<string, CodexMaterializationTarget>,
  owner: CodexRoleOwner,
): void {
  if (typeof cell === 'string') {
    return;
  }

  if (isWorkflowDispatchCandidateLadder(cell)) {
    for (const candidate of cell.candidates) {
      if (isWorkflowDispatchFallbackRoute(candidate)) {
        for (const entry of candidate.route) {
          collectCodexTargetFromEntry(entry, targets, owner);
        }
        continue;
      }
      collectCodexTargetFromEntry(candidate, targets, owner);
    }
    return;
  }

  for (const entry of cell) {
    collectCodexTargetFromEntry(entry, targets, owner);
  }
}

function collectCodexMaterializationTargetsFromProvider(
  providerValue: WorkflowDispatchProviderValue | undefined,
  targets: Map<string, CodexMaterializationTarget>,
  owner: CodexRoleOwner,
): void {
  if (providerValue === undefined || typeof providerValue === 'string') {
    return;
  }

  for (const cell of Object.values(providerValue)) {
    if (cell !== undefined) {
      collectCodexTargetsFromCell(cell, targets, owner);
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
  owner: CodexRoleOwner,
): void {
  const collectCandidate = (candidate: unknown): void => {
    if (
      !candidate ||
      typeof candidate !== 'object' ||
      Array.isArray(candidate)
    ) {
      return;
    }

    const route = (candidate as Record<string, unknown>)['route'];
    if (Array.isArray(route)) {
      for (const entry of route) {
        const target = routeTargetFromUnknown(entry);
        if (target) {
          collectCodexTargetFromEntry(target, targets, owner);
        }
      }
      return;
    }

    const target = routeTargetFromUnknown(candidate);
    if (target) {
      collectCodexTargetFromEntry(target, targets, owner);
    }
  };

  if (Array.isArray(value)) {
    for (const entry of value) {
      collectCandidate(entry);
    }
    return;
  }

  if (!value || typeof value !== 'object') {
    return;
  }

  const candidates = (value as Record<string, unknown>)['candidates'];
  if (!Array.isArray(candidates)) {
    return;
  }

  for (const entry of candidates) {
    if (typeof entry === 'string') {
      continue;
    }
    collectCandidate(entry);
  }
}

function collectCodexTargetsFromUnknownProvider(
  value: unknown,
  targets: Map<string, CodexMaterializationTarget>,
  owner: CodexRoleOwner,
): void {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return;
  }

  for (const cell of Object.values(value)) {
    collectCodexTargetsFromUnknownCell(cell, targets, owner);
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
  const projectPathCandidate =
    options.projectPath === undefined
      ? (await resolveActiveProject(scopeRoot)).path
      : options.projectPath;
  if (!projectPathCandidate) {
    return;
  }

  const projectPath = normalizeProjectPath(scopeRoot, projectPathCandidate);
  if (!projectPath) {
    if (options.projectPath !== undefined) {
      throw new CliError(
        `Project-scoped Codex materialization path must be repo-relative or inside repo root: ${projectPathCandidate}`,
      );
    }
    return;
  }

  let realProjectPath: string;
  try {
    const validated = await validateRealPathWithinScope(
      join(scopeRoot, projectPath),
      scopeRoot,
    );
    realProjectPath = validated.realPath;
  } catch {
    if (options.projectPath !== undefined) {
      throw new CliError(
        `Project-scoped Codex materialization path must be repo-relative or inside repo root: ${projectPathCandidate}`,
      );
    }
    return;
  }

  const statePath = join(realProjectPath, 'state.md');
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
    'project-config',
  );
}

function isUserCodexScope(
  scopeRoot: string,
  options: CodexMaterializationTargetOptions,
): boolean {
  if (!options.userConfigDir) {
    return false;
  }
  return resolve(scopeRoot) === resolve(options.userConfigDir, '..');
}

async function readInheritedCodexMaxDepth(
  scopeRoot: string,
  options: CodexMaterializationTargetOptions,
): Promise<number | undefined> {
  if (!options.userConfigDir || isUserCodexScope(scopeRoot, options)) {
    return undefined;
  }

  const userScopeRoot = resolve(options.userConfigDir, '..');
  const userConfigContent = await readOptionalFile(configPath(userScopeRoot));
  return readCodexMaxDepth(userConfigContent) ?? undefined;
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

  if (isUserCodexScope(scopeRoot, options)) {
    collectCodexMaterializationTargetsFromProvider(
      effectiveConfig.user.workflow?.dispatchCeiling?.providers?.codex,
      targets,
      'user-config',
    );
    return sortCodexMaterializationTargets(targets);
  }

  for (const target of SUPPORTED_CODEX_ROLE_TARGETS) {
    targets.set(`${target.model}\0${target.effort}`, {
      ...target,
      owner: 'supported-catalogue',
    });
  }

  for (const providerValue of [
    effectiveConfig.shared.workflow?.dispatchCeiling?.providers?.codex,
    effectiveConfig.local.workflow?.dispatchCeiling?.providers?.codex,
  ]) {
    collectCodexMaterializationTargetsFromProvider(
      providerValue,
      targets,
      'project-config',
    );
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
  cleanupOwner: CodexRoleOwner,
  removeLegacyProjectRoles: boolean,
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

    const owner = readOatManagedCodexRoleOwner(roleContent);
    const legacyProjectRole =
      removeLegacyProjectRoles &&
      owner === null &&
      SUPPORTED_CODEX_BASE_ROLES.some((baseRole) =>
        roleName.startsWith(`${baseRole}-`),
      );
    if (owner !== cleanupOwner && !legacyProjectRole) {
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

    const owner = readOatManagedCodexRoleOwner(roleContent);
    const legacyProjectRole =
      removeLegacyProjectRoles &&
      owner === null &&
      SUPPORTED_CODEX_BASE_ROLES.some((baseRole) =>
        roleName.startsWith(`${baseRole}-`),
      );
    if (owner !== cleanupOwner && !legacyProjectRole) {
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
  if (
    !isPartialSync &&
    isUserCodexScope(scopeRoot, options) &&
    materializationTargets.length > 0
  ) {
    const canonicalBaseRoles = new Set(
      canonicalEntries
        .filter((entry) => entry.type === 'agent' && entry.isFile)
        .map((entry) => entry.name.replace(/\.md$/i, '')),
    );
    const missingBaseRoles = SUPPORTED_CODEX_BASE_ROLES.filter(
      (role) => !canonicalBaseRoles.has(role),
    );
    if (missingBaseRoles.length > 0) {
      throw new CliError(
        `Bundled managed Codex role definitions are unavailable for user sync: ${missingBaseRoles.join(', ')}. Refusing stale user-role cleanup.`,
      );
    }
  }
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

  if (isPartialSync && desiredRoles.length === 0) {
    return {
      operations: [],
      managedRoles: [],
      aggregateConfigHash: hashContent(existingConfigContent ?? ''),
    };
  }

  const inheritedMaxDepth = await readInheritedCodexMaxDepth(
    scopeRoot,
    options,
  );
  const staleRoles = isPartialSync
    ? []
    : await collectStaleManagedRoles(
        scopeRoot,
        existingConfigContent,
        desiredRoleNames,
        isUserCodexScope(scopeRoot, options) ? 'user-config' : 'project-config',
        !isUserCodexScope(scopeRoot, options),
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
    inheritedMaxDepth,
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
