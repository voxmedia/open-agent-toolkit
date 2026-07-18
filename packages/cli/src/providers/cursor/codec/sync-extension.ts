import { createHash } from 'node:crypto';
import { lstat, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import {
  basename,
  dirname,
  isAbsolute,
  join,
  relative,
  resolve,
  sep,
} from 'node:path';

import { parseCanonicalAgentFile } from '@agents/canonical';
import {
  normalizeDispatchMatrix,
  walkDispatchMatrix,
  type DispatchMatrixSource,
  type WorkflowDispatchProviderValue,
} from '@config/dispatch-matrix';
import { normalizeProjectPath, resolveActiveProject } from '@config/oat-config';
import { resolveEffectiveConfig } from '@config/resolve';
import type { CanonicalEntry } from '@engine/index';
import { CliError } from '@errors/index';
import { ensureDir, fileExists } from '@fs/io';
import { validateRealPathWithinScope } from '@fs/paths';
import {
  hasMaterializationChanges,
  summarizeMaterializationPlan,
  toMaterializationOperations,
  type MaterializationApplyResult,
  type MaterializationContext,
  type MaterializationExtension,
  type MaterializationOperation,
  type MaterializationPlan,
  type MaterializationWriteOperation,
} from '@providers/shared';
import YAML from 'yaml';

import {
  CURSOR_MODEL_PIN_MAPPINGS,
  SUPPORTED_CURSOR_BASE_ROLES,
  SUPPORTED_CURSOR_ROLE_TARGETS,
  type CursorModelPinMapping,
} from './catalog';
import {
  assertNoUnmanagedCursorAgentCollisions,
  materializeCursorAgent,
  type CursorMaterializedAgent,
} from './materialize';
import {
  isOatManagedCursorRoleFile,
  readOatManagedCursorRoleOwner,
  readOatManagedCursorRoleName,
  type CursorRoleOwner,
} from './shared';

export type CursorExtensionTarget = 'role';

export interface CursorExtensionOperation extends MaterializationOperation<
  'cursor',
  CursorExtensionTarget
> {
  roleName?: string;
}

export interface CursorExtensionWriteOperation extends MaterializationWriteOperation<
  'cursor',
  CursorExtensionTarget
> {
  roleName?: string;
}

export interface CursorExtensionPlanMetadata {
  cleanupOwners: CursorRoleOwner[];
  isPartialSync: boolean;
}

export interface CursorExtensionPlan extends MaterializationPlan<
  'cursor',
  CursorExtensionTarget,
  CursorExtensionPlanMetadata
> {
  operations: CursorExtensionWriteOperation[];
}

export type CursorExtensionApplyResult = MaterializationApplyResult;

interface CursorMaterializationTarget {
  mapping: CursorModelPinMapping;
  owner: CursorRoleOwner;
  source: string;
}

export interface CursorMaterializationTargetOptions {
  userConfigDir?: string;
  projectPath?: string | null;
  env?: NodeJS.ProcessEnv;
  enabled?: boolean;
  modelMappings?: readonly CursorModelPinMapping[];
  supportedTargets?: readonly CursorModelPinMapping[];
}

const OWNER_PRECEDENCE: Record<CursorRoleOwner, number> = {
  'supported-catalogue': 0,
  'user-config': 1,
  'project-config': 2,
};

function hashContent(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

function toRelativePath(scopeRoot: string, absolutePath: string): string {
  return relative(scopeRoot, absolutePath).replaceAll('\\', '/');
}

function isUserCursorScope(
  scopeRoot: string,
  options: CursorMaterializationTargetOptions,
): boolean {
  return Boolean(
    options.userConfigDir &&
    resolve(scopeRoot) === resolve(options.userConfigDir, '..'),
  );
}

function assertApprovedMapping(mapping: CursorModelPinMapping): void {
  if (
    mapping.gateEvidence.gate !== 'g01' ||
    mapping.gateEvidence.disposition !== 'approved' ||
    !mapping.gateEvidence.probeName.trim()
  ) {
    throw new CliError(
      `Cannot materialize Cursor model ${mapping.ladderModelId}: mapping-specific gate g01 approval is required.`,
    );
  }
  if (!/\[[^\]]+\]$/.test(mapping.frontmatterModel)) {
    throw new CliError(
      `Cannot materialize Cursor model ${mapping.ladderModelId}: approved mapping must include a non-empty bracket segment.`,
    );
  }
}

function addCursorTarget(
  ladderModelId: string,
  owner: CursorRoleOwner,
  source: string,
  targets: Map<string, CursorMaterializationTarget>,
  mappings: readonly CursorModelPinMapping[],
): void {
  const mapping = mappings.find(
    (candidate) => candidate.ladderModelId === ladderModelId,
  );
  if (!mapping) {
    throw new CliError(
      `Cannot materialize unknown Cursor model mapping "${ladderModelId}" from ${source}. Add mapping-specific gate g01 evidence before using this target.`,
    );
  }
  assertApprovedMapping(mapping);

  const existing = targets.get(ladderModelId);
  if (
    !existing ||
    OWNER_PRECEDENCE[owner] >= OWNER_PRECEDENCE[existing.owner]
  ) {
    targets.set(ladderModelId, { mapping, owner, source });
  }
}

function collectCursorTargetsFromProvider(
  providerValue: WorkflowDispatchProviderValue | undefined,
  source: DispatchMatrixSource,
  pathPrefix: string,
  owner: CursorRoleOwner,
  targets: Map<string, CursorMaterializationTarget>,
  mappings: readonly CursorModelPinMapping[],
): void {
  if (providerValue === undefined) {
    return;
  }
  const refs = walkDispatchMatrix(
    { cursor: providerValue },
    { source, pathPrefix },
  );
  for (const ref of refs) {
    if (ref.value) {
      addCursorTarget(
        ref.value,
        owner,
        `${ref.source}:${ref.path}`,
        targets,
        mappings,
      );
      continue;
    }
    if (
      ref.target &&
      (ref.target.harness ?? 'cursor') === 'cursor' &&
      ref.target.model
    ) {
      addCursorTarget(
        ref.target.model,
        owner,
        `${ref.source}:${ref.path}`,
        targets,
        mappings,
      );
    }
  }
}

function frontmatterBlock(content: string): string | null {
  const normalized = content.startsWith('\uFEFF') ? content.slice(1) : content;
  const match = /^---\n([\s\S]*?)\n---(?:\n|$)/.exec(normalized);
  return match?.[1] ?? null;
}

async function readOptionalFile(path: string): Promise<string | null> {
  return (await fileExists(path)) ? readFile(path, 'utf8') : null;
}

async function collectProjectStateCursorTargets(
  scopeRoot: string,
  options: CursorMaterializationTargetOptions,
  targets: Map<string, CursorMaterializationTarget>,
  mappings: readonly CursorModelPinMapping[],
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
        `Project-scoped Cursor materialization path must be repo-relative or inside repo root: ${projectPathCandidate}`,
      );
    }
    return;
  }

  let realProjectPath: string;
  try {
    realProjectPath = (
      await validateRealPathWithinScope(join(scopeRoot, projectPath), scopeRoot)
    ).realPath;
  } catch {
    if (options.projectPath !== undefined) {
      throw new CliError(
        `Project-scoped Cursor materialization path must be repo-relative or inside repo root: ${projectPathCandidate}`,
      );
    }
    return;
  }

  const stateContent = await readOptionalFile(
    join(realProjectPath, 'state.md'),
  );
  const rawFrontmatter = stateContent ? frontmatterBlock(stateContent) : null;
  if (!rawFrontmatter) {
    return;
  }
  const parsed = YAML.parse(rawFrontmatter) as unknown;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return;
  }
  const policy = (parsed as Record<string, unknown>)['oat_dispatch_policy'];
  if (!policy || typeof policy !== 'object' || Array.isArray(policy)) {
    return;
  }
  const matrix = (policy as Record<string, unknown>)['matrix'];
  const normalized = normalizeDispatchMatrix(matrix, {
    pathPrefix: 'oat_dispatch_policy.matrix',
    compatibilityMode: 'project-state',
  });
  collectCursorTargetsFromProvider(
    normalized.providers.cursor,
    'project-state',
    'oat_dispatch_policy.matrix',
    'project-config',
    targets,
    mappings,
  );
}

async function readCursorMaterializationTargets(
  scopeRoot: string,
  options: CursorMaterializationTargetOptions,
): Promise<CursorMaterializationTarget[]> {
  const mappings = options.modelMappings ?? CURSOR_MODEL_PIN_MAPPINGS;
  const supportedTargets =
    options.supportedTargets ?? SUPPORTED_CURSOR_ROLE_TARGETS;
  const targets = new Map<string, CursorMaterializationTarget>();
  const effectiveConfig = await resolveEffectiveConfig(
    scopeRoot,
    options.userConfigDir ?? join(scopeRoot, '.oat', '__no-user-config__'),
    options.env,
  );

  if (isUserCursorScope(scopeRoot, options)) {
    collectCursorTargetsFromProvider(
      effectiveConfig.user.workflow?.dispatchCeiling?.providers?.cursor,
      'user-config',
      'workflow.dispatchCeiling.providers',
      'user-config',
      targets,
      mappings,
    );
  } else {
    for (const target of supportedTargets) {
      addCursorTarget(
        target.ladderModelId,
        'supported-catalogue',
        'supported-catalogue',
        targets,
        mappings,
      );
    }
    collectCursorTargetsFromProvider(
      effectiveConfig.shared.workflow?.dispatchCeiling?.providers?.cursor,
      'repo-config',
      'workflow.dispatchCeiling.providers',
      'project-config',
      targets,
      mappings,
    );
    collectCursorTargetsFromProvider(
      effectiveConfig.local.workflow?.dispatchCeiling?.providers?.cursor,
      'local-config',
      'workflow.dispatchCeiling.providers',
      'project-config',
      targets,
      mappings,
    );
    await collectProjectStateCursorTargets(
      scopeRoot,
      options,
      targets,
      mappings,
    );
  }

  return [...targets.values()].sort((left, right) =>
    left.mapping.ladderModelId.localeCompare(right.mapping.ladderModelId),
  );
}

function canonicalPathAllowed(
  scopeRoot: string,
  canonicalEntry: CanonicalEntry,
  allowedCanonicalPaths?: string[],
): boolean {
  if (!allowedCanonicalPaths?.length) {
    return true;
  }
  return new Set(allowedCanonicalPaths).has(
    toRelativePath(scopeRoot, canonicalEntry.canonicalPath),
  );
}

async function desiredRolesFromCanonical(
  canonicalEntries: CanonicalEntry[],
  targets: CursorMaterializationTarget[],
): Promise<CursorMaterializedAgent[]> {
  const desired: CursorMaterializedAgent[] = [];
  for (const entry of canonicalEntries) {
    if (
      entry.type !== 'agent' ||
      !entry.isFile ||
      !entry.name.endsWith('.md')
    ) {
      continue;
    }
    const agent = await parseCanonicalAgentFile(entry.canonicalPath);
    if (
      !SUPPORTED_CURSOR_BASE_ROLES.includes(
        agent.name as (typeof SUPPORTED_CURSOR_BASE_ROLES)[number],
      )
    ) {
      continue;
    }
    for (const target of targets) {
      desired.push(
        materializeCursorAgent({
          agent,
          mapping: target.mapping,
          owner: target.owner,
        }),
      );
    }
  }

  const names = new Set<string>();
  for (const role of desired) {
    if (names.has(role.roleName)) {
      throw new CliError(
        `Distinct Cursor targets produced the same Cursor role name ${role.roleName}. Refusing ambiguous role writes.`,
      );
    }
    names.add(role.roleName);
  }
  return desired.sort((left, right) =>
    left.roleName.localeCompare(right.roleName),
  );
}

async function collectStaleManagedRoles(
  scopeRoot: string,
  desiredNames: Set<string>,
  cleanupOwners: readonly CursorRoleOwner[],
): Promise<string[]> {
  let files: string[];
  try {
    files = await readdir(join(scopeRoot, '.cursor', 'agents'));
  } catch {
    files = [];
  }
  const stale: string[] = [];
  for (const file of files) {
    if (!file.endsWith('.md')) {
      continue;
    }
    const roleName = basename(file, '.md');
    if (desiredNames.has(roleName)) {
      continue;
    }
    const content = await readOptionalFile(
      join(scopeRoot, '.cursor', 'agents', file),
    );
    if (!content || !isOatManagedCursorRoleFile(content, roleName)) {
      continue;
    }
    const owner = readOatManagedCursorRoleOwner(content);
    if (owner && cleanupOwners.includes(owner)) {
      stale.push(roleName);
    }
  }
  return stale.sort((left, right) => left.localeCompare(right));
}

function emptyPlan(
  isPartialSync: boolean,
  cleanupOwners: CursorRoleOwner[],
): CursorExtensionPlan {
  return {
    provider: 'cursor',
    operations: [],
    managedEntries: [],
    aggregateHash: hashContent(''),
    metadata: { cleanupOwners, isPartialSync },
  };
}

export async function computeCursorProjectExtensionPlan(
  scopeRoot: string,
  canonicalEntries: CanonicalEntry[],
  allowedCanonicalPaths?: string[],
  options: CursorMaterializationTargetOptions = {},
): Promise<CursorExtensionPlan> {
  const isPartialSync =
    allowedCanonicalPaths !== undefined && allowedCanonicalPaths.length > 0;
  const cleanupOwners: CursorRoleOwner[] = isUserCursorScope(scopeRoot, options)
    ? ['user-config']
    : ['supported-catalogue', 'project-config'];
  if (options.enabled === false) {
    return emptyPlan(isPartialSync, cleanupOwners);
  }

  const scopedCanonicalEntries = canonicalEntries.filter((entry) =>
    canonicalPathAllowed(scopeRoot, entry, allowedCanonicalPaths),
  );
  if (isPartialSync && scopedCanonicalEntries.length === 0) {
    return emptyPlan(true, cleanupOwners);
  }
  const targets = await readCursorMaterializationTargets(scopeRoot, options);
  if (
    !isPartialSync &&
    isUserCursorScope(scopeRoot, options) &&
    targets.length > 0
  ) {
    const canonicalBaseRoles = new Set(
      canonicalEntries
        .filter((entry) => entry.type === 'agent' && entry.isFile)
        .map((entry) => entry.name.replace(/\.md$/i, '')),
    );
    const missingBaseRoles = SUPPORTED_CURSOR_BASE_ROLES.filter(
      (role) => !canonicalBaseRoles.has(role),
    );
    if (missingBaseRoles.length > 0) {
      throw new CliError(
        `Bundled managed Cursor role definitions are unavailable for user sync: ${missingBaseRoles.join(', ')}. Refusing stale user-role cleanup.`,
      );
    }
  }
  const desiredRoles = await desiredRolesFromCanonical(
    scopedCanonicalEntries,
    targets,
  );
  const desiredNames = new Set(desiredRoles.map((role) => role.roleName));
  await assertNoUnmanagedCursorAgentCollisions(scopeRoot, desiredNames);

  const staleRoles = isPartialSync
    ? []
    : await collectStaleManagedRoles(scopeRoot, desiredNames, cleanupOwners);
  const operations: CursorExtensionWriteOperation[] = [];
  for (const role of desiredRoles) {
    const rolePath = join(scopeRoot, '.cursor', 'agents', role.fileName);
    const existingContent = await readOptionalFile(rolePath);
    if (existingContent === null) {
      operations.push({
        provider: 'cursor',
        action: 'create',
        target: 'role',
        path: toRelativePath(scopeRoot, rolePath),
        reason: 'managed Cursor role file missing',
        entryName: role.roleName,
        roleName: role.roleName,
        content: role.content,
      });
      continue;
    }

    const existingOwner = readOatManagedCursorRoleOwner(existingContent);
    const existingRoleName = readOatManagedCursorRoleName(existingContent);
    if (
      existingRoleName !== role.roleName ||
      !existingOwner ||
      !cleanupOwners.includes(existingOwner)
    ) {
      throw new CliError(
        `Refusing to update Cursor role ${role.roleName}: existing file is unmanaged or owned by ${existingOwner ?? 'unknown'}.`,
      );
    }
    operations.push({
      provider: 'cursor',
      action:
        existingContent.trimEnd() === role.content.trimEnd()
          ? 'skip'
          : 'update',
      target: 'role',
      path: toRelativePath(scopeRoot, rolePath),
      reason:
        existingContent.trimEnd() === role.content.trimEnd()
          ? 'managed Cursor role file already in sync'
          : 'managed Cursor role file differs from desired state',
      entryName: role.roleName,
      roleName: role.roleName,
      ...(existingContent.trimEnd() === role.content.trimEnd()
        ? {}
        : { content: role.content }),
    });
  }
  for (const roleName of staleRoles) {
    operations.push({
      provider: 'cursor',
      action: 'remove',
      target: 'role',
      path: `.cursor/agents/${roleName}.md`,
      reason: 'stale managed Cursor role removed',
      entryName: roleName,
      roleName,
    });
  }

  return {
    provider: 'cursor',
    operations,
    managedEntries: [...desiredNames, ...staleRoles],
    aggregateHash: hashContent(
      desiredRoles.map((role) => role.content).join('\0'),
    ),
    metadata: { cleanupOwners, isPartialSync },
  };
}

async function readMutationPathStats(path: string) {
  try {
    return await lstat(path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

async function assertSafeCursorMutationPath(
  scopeRoot: string,
  absolutePath: string,
): Promise<void> {
  const resolvedScopeRoot = resolve(scopeRoot);
  const relativePath = relative(resolvedScopeRoot, absolutePath);
  if (
    relativePath === '..' ||
    relativePath.startsWith(`..${sep}`) ||
    isAbsolute(relativePath) ||
    resolve(resolvedScopeRoot, relativePath) !== absolutePath
  ) {
    throw new CliError(
      `Cursor materialization path escapes the sync scope: ${absolutePath}`,
    );
  }

  let currentPath = resolvedScopeRoot;
  const parentParts = relativePath
    .replaceAll('\\', '/')
    .split('/')
    .slice(0, -1);
  for (const part of parentParts) {
    currentPath = join(currentPath, part);
    const stats = await readMutationPathStats(currentPath);
    if (!stats) {
      break;
    }
    if (stats.isSymbolicLink()) {
      throw new CliError(
        `Cursor materialization parent is a symbolic link: ${toRelativePath(resolvedScopeRoot, currentPath)}`,
      );
    }
    if (!stats.isDirectory()) {
      throw new CliError(
        `Cursor materialization parent is not a directory: ${toRelativePath(resolvedScopeRoot, currentPath)}`,
      );
    }
  }

  const targetStats = await readMutationPathStats(absolutePath);
  if (targetStats?.isSymbolicLink()) {
    throw new CliError(
      `Cursor materialization target is a symbolic link: ${relativePath.replaceAll('\\', '/')}`,
    );
  }
}

export async function applyCursorProjectExtensionPlan(
  scopeRoot: string,
  plan: CursorExtensionPlan,
): Promise<CursorExtensionApplyResult> {
  const result: CursorExtensionApplyResult = {
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
      await assertSafeCursorMutationPath(scopeRoot, absolutePath);
      if (operation.action === 'remove') {
        await rm(absolutePath, { force: true });
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

export function hasCursorExtensionChanges(plan: CursorExtensionPlan): boolean {
  return hasMaterializationChanges(plan);
}

export function summarizeCursorExtension(plan: CursorExtensionPlan): {
  plannedOperations: number;
  skipped: number;
} {
  return summarizeMaterializationPlan(plan);
}

export function toCursorExtensionOperations(
  plan: CursorExtensionPlan,
): CursorExtensionOperation[] {
  const operations = toMaterializationOperations(plan);
  return operations.map((operation, index) => ({
    ...operation,
    roleName: plan.operations[index]?.roleName,
  }));
}

export const cursorMaterializationExtension: MaterializationExtension<
  CursorExtensionPlan,
  MaterializationContext<CursorMaterializationTargetOptions>
> = {
  provider: 'cursor',
  computePlan(context) {
    return computeCursorProjectExtensionPlan(
      context.scopeRoot,
      context.canonicalEntries,
      context.allowedCanonicalPaths,
      context.options,
    );
  },
  applyPlan: applyCursorProjectExtensionPlan,
};
