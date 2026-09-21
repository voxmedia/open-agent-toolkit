import { createHash } from 'node:crypto';
import { lstat, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { basename, dirname, join, relative, resolve, sep } from 'node:path';

import { parseCanonicalAgentFile } from '@agents/canonical';
import {
  normalizeDispatchMatrix,
  walkDispatchMatrix,
  type WorkflowDispatchProviderValue,
} from '@config/dispatch-matrix';
import { normalizeProjectPath, resolveActiveProject } from '@config/oat-config';
import { resolveEffectiveConfig } from '@config/resolve';
import {
  materializationCanonicalPathAllowed,
  type CanonicalEntry,
} from '@engine/index';
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
import type { MaterializationOperationResult } from '@providers/shared/materialization-extension';
import YAML from 'yaml';

import {
  assertNoUnmanagedClaudeAgentCollisions,
  materializeClaudeAgents,
  readOatManagedClaudeRole,
  type ClaudeMaterializationTarget,
  type ClaudeRoleOwner,
} from './materialize';

const SUPPORTED_BASE_ROLES = ['oat-phase-implementer', 'oat-reviewer'] as const;
type SupportedBaseRole = (typeof SUPPORTED_BASE_ROLES)[number];

export interface ClaudeMaterializationTargetOptions {
  userConfigDir?: string;
  projectPath?: string | null;
  env?: NodeJS.ProcessEnv;
  enabled?: boolean;
}

export interface ClaudeExtensionPlan extends MaterializationPlan<
  'claude',
  'role',
  { cleanupOwners: ClaudeRoleOwner[]; isPartialSync: boolean }
> {
  operations: (MaterializationWriteOperation<'claude', 'role'> & {
    roleName?: string;
  })[];
}

function hash(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

function isUserScope(
  scopeRoot: string,
  options: ClaudeMaterializationTargetOptions,
): boolean {
  return Boolean(
    options.userConfigDir &&
    resolve(scopeRoot) === resolve(options.userConfigDir, '..'),
  );
}

function collectTargets(
  value: WorkflowDispatchProviderValue | undefined,
  owner: ClaudeRoleOwner,
  targets: Map<string, ClaudeMaterializationTarget>,
): void {
  if (value === undefined || typeof value === 'string') return;
  for (const ref of walkDispatchMatrix(
    { claude: value },
    {
      source: owner === 'user-config' ? 'user-config' : 'repo-config',
      pathPrefix: 'workflow.dispatchCeiling.providers',
    },
  )) {
    const target = ref.target;
    if (
      !target?.model ||
      !target.effort ||
      (target.harness ?? 'claude') !== 'claude'
    ) {
      continue;
    }
    targets.set(`${target.model}\0${target.effort}`, {
      model: target.model,
      effort: target.effort,
      owner,
    });
  }
}

function frontmatter(content: string): Record<string, unknown> | null {
  const match = /^---\n([\s\S]*?)\n---(?:\n|$)/.exec(content);
  if (!match?.[1]) return null;
  const parsed = YAML.parse(match[1]) as unknown;
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
    ? (parsed as Record<string, unknown>)
    : null;
}

async function collectProjectStateTargets(
  scopeRoot: string,
  options: ClaudeMaterializationTargetOptions,
  targets: Map<string, ClaudeMaterializationTarget>,
): Promise<void> {
  const candidate =
    options.projectPath === undefined
      ? (await resolveActiveProject(scopeRoot)).path
      : options.projectPath;
  if (!candidate) return;
  const normalized = normalizeProjectPath(scopeRoot, candidate);
  if (!normalized) return;
  let projectRoot: string;
  try {
    projectRoot = (
      await validateRealPathWithinScope(join(scopeRoot, normalized), scopeRoot)
    ).realPath;
  } catch {
    return;
  }
  const statePath = join(projectRoot, 'state.md');
  if (!(await fileExists(statePath))) return;
  const parsed = frontmatter(await readFile(statePath, 'utf8'));
  const policy = parsed?.['oat_dispatch_policy'];
  if (!policy || typeof policy !== 'object' || Array.isArray(policy)) return;
  const matrix = normalizeDispatchMatrix(
    (policy as Record<string, unknown>)['matrix'],
    {
      pathPrefix: 'oat_dispatch_policy.matrix',
      compatibilityMode: 'project-state',
    },
  );
  collectTargets(matrix.providers.claude, 'project-config', targets);
}

async function readTargets(
  scopeRoot: string,
  options: ClaudeMaterializationTargetOptions,
): Promise<ClaudeMaterializationTarget[]> {
  const config = await resolveEffectiveConfig(
    scopeRoot,
    options.userConfigDir ?? join(scopeRoot, '.oat', '__no-user-config__'),
    options.env,
  );
  const targets = new Map<string, ClaudeMaterializationTarget>();
  if (isUserScope(scopeRoot, options)) {
    collectTargets(
      config.user.workflow?.dispatchCeiling?.providers?.claude,
      'user-config',
      targets,
    );
  } else {
    collectTargets(
      config.shared.workflow?.dispatchCeiling?.providers?.claude,
      'project-config',
      targets,
    );
    collectTargets(
      config.local.workflow?.dispatchCeiling?.providers?.claude,
      'project-config',
      targets,
    );
    await collectProjectStateTargets(scopeRoot, options, targets);
  }
  return [...targets.values()].sort((left, right) =>
    `${left.model}/${left.effort}`.localeCompare(
      `${right.model}/${right.effort}`,
    ),
  );
}

async function optionalFile(path: string): Promise<string | null> {
  return (await fileExists(path)) ? readFile(path, 'utf8') : null;
}

async function staleRoles(
  scopeRoot: string,
  desired: Set<string>,
  owners: ClaudeRoleOwner[],
  baseRoles?: ReadonlySet<SupportedBaseRole>,
): Promise<string[]> {
  let files: string[] = [];
  try {
    files = await readdir(join(scopeRoot, '.claude', 'agents'));
  } catch {
    // The managed directory does not exist before the first materialization.
  }
  const stale: string[] = [];
  for (const file of files) {
    if (!file.endsWith('.md')) continue;
    const roleName = basename(file, '.md');
    if (desired.has(roleName)) continue;
    const content = await optionalFile(
      join(scopeRoot, '.claude', 'agents', file),
    );
    const managed = content ? readOatManagedClaudeRole(content) : null;
    const matchesBaseRole =
      !baseRoles ||
      [...baseRoles].some((baseRole) =>
        roleName.startsWith(`${baseRole}-claude-`),
      );
    if (
      matchesBaseRole &&
      managed?.roleName === roleName &&
      owners.includes(managed.owner)
    )
      stale.push(roleName);
  }
  return stale.sort();
}

function removedSupportedBaseRoles(
  entries: CanonicalEntry[],
  allowedCanonicalPaths?: string[],
): Set<SupportedBaseRole> {
  if (!allowedCanonicalPaths?.length) return new Set();
  const present = new Set(
    entries
      .filter((entry) => entry.type === 'agent' && entry.isFile)
      .map((entry) => entry.name.replace(/\.md$/, '')),
  );
  return new Set(
    SUPPORTED_BASE_ROLES.filter(
      (role) =>
        allowedCanonicalPaths.includes(`.agents/agents/${role}.md`) &&
        !present.has(role),
    ),
  );
}

export async function computeClaudeProjectExtensionPlan(
  scopeRoot: string,
  canonicalEntries: CanonicalEntry[],
  allowedCanonicalPaths?: string[],
  options: ClaudeMaterializationTargetOptions = {},
): Promise<ClaudeExtensionPlan> {
  const partial = Boolean(allowedCanonicalPaths?.length);
  const cleanupOwners: ClaudeRoleOwner[] = isUserScope(scopeRoot, options)
    ? ['user-config']
    : ['project-config'];
  const empty = (): ClaudeExtensionPlan => ({
    provider: 'claude',
    operations: [],
    managedEntries: [],
    aggregateHash: hash(''),
    metadata: { cleanupOwners, isPartialSync: partial },
  });
  if (options.enabled === false) return empty();
  const entries = canonicalEntries.filter((entry) =>
    materializationCanonicalPathAllowed(
      scopeRoot,
      entry,
      allowedCanonicalPaths,
    ),
  );
  const removedBaseRoles = removedSupportedBaseRoles(
    entries,
    allowedCanonicalPaths,
  );
  if (partial && entries.length === 0 && removedBaseRoles.size === 0)
    return empty();
  const targets = await readTargets(scopeRoot, options);
  const agents = [];
  for (const entry of entries) {
    if (entry.type !== 'agent' || !entry.isFile || !entry.name.endsWith('.md'))
      continue;
    const agent = await parseCanonicalAgentFile(entry.canonicalPath);
    if (SUPPORTED_BASE_ROLES.includes(agent.name as never)) agents.push(agent);
  }
  if (!partial && isUserScope(scopeRoot, options) && targets.length > 0) {
    const present = new Set(agents.map(({ name }) => name));
    const missing = SUPPORTED_BASE_ROLES.filter((name) => !present.has(name));
    if (missing.length > 0) {
      throw new CliError(
        `Bundled managed Claude role definitions are unavailable for user sync: ${missing.join(', ')}. Refusing stale user-role cleanup.`,
      );
    }
  }
  const roles = materializeClaudeAgents({ agents, targets });
  const desired = new Set(roles.map(({ roleName }) => roleName));
  await assertNoUnmanagedClaudeAgentCollisions(scopeRoot, desired);
  const stale = partial
    ? await staleRoles(scopeRoot, desired, cleanupOwners, removedBaseRoles)
    : await staleRoles(scopeRoot, desired, cleanupOwners);
  const operations: ClaudeExtensionPlan['operations'] = [];
  for (const role of roles) {
    const relativePath = `.claude/agents/${role.fileName}`;
    const existing = await optionalFile(join(scopeRoot, relativePath));
    if (existing === null) {
      operations.push({
        provider: 'claude',
        action: 'create',
        target: 'role',
        path: relativePath,
        reason: 'managed Claude effort variant missing',
        entryName: role.roleName,
        roleName: role.roleName,
        content: role.content,
      });
      continue;
    }
    const managed = readOatManagedClaudeRole(existing);
    if (
      !managed ||
      managed.roleName !== role.roleName ||
      !cleanupOwners.includes(managed.owner)
    ) {
      throw new CliError(
        `Refusing to update Claude role ${role.roleName}: existing file is unmanaged or has incompatible ownership.`,
      );
    }
    const current = existing.trimEnd() === role.content.trimEnd();
    operations.push({
      provider: 'claude',
      action: current ? 'skip' : 'update',
      target: 'role',
      path: relativePath,
      reason: current
        ? 'managed Claude effort variant already in sync'
        : 'managed Claude effort variant differs from desired state',
      entryName: role.roleName,
      roleName: role.roleName,
      ...(current ? {} : { content: role.content }),
    });
  }
  for (const roleName of stale) {
    operations.push({
      provider: 'claude',
      action: 'remove',
      target: 'role',
      path: `.claude/agents/${roleName}.md`,
      reason: 'stale managed Claude effort variant removed',
      entryName: roleName,
      roleName,
    });
  }
  return {
    provider: 'claude',
    operations,
    managedEntries: [...desired, ...stale],
    aggregateHash: hash(roles.map(({ content }) => content).join('\0')),
    metadata: { cleanupOwners, isPartialSync: partial },
  };
}

async function stats(path: string) {
  try {
    return await lstat(path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
}

async function assertSafePath(scopeRoot: string, path: string): Promise<void> {
  const root = resolve(scopeRoot);
  const rel = relative(root, path);
  if (
    rel === '..' ||
    rel.startsWith(`..${sep}`) ||
    resolve(root, rel) !== path
  ) {
    throw new CliError(
      `Claude materialization path escapes the sync scope: ${path}`,
    );
  }
  let current = root;
  for (const part of rel.replaceAll('\\', '/').split('/').slice(0, -1)) {
    current = join(current, part);
    const value = await stats(current);
    if (!value) break;
    if (value.isSymbolicLink() || !value.isDirectory()) {
      throw new CliError(
        `Claude materialization parent is unsafe: ${relative(root, current)}`,
      );
    }
  }
  if ((await stats(path))?.isSymbolicLink()) {
    throw new CliError(
      `Claude materialization target is a symbolic link: ${rel}`,
    );
  }
}

export async function applyClaudeProjectExtensionPlan(
  scopeRoot: string,
  plan: ClaudeExtensionPlan,
): Promise<MaterializationApplyResult> {
  const operations: MaterializationOperationResult[] = [];
  for (const operation of plan.operations) {
    if (operation.action === 'skip') {
      operations.push({ ...operation, status: 'current' });
      continue;
    }
    const path = resolve(scopeRoot, operation.path);
    try {
      await assertSafePath(scopeRoot, path);
      if (operation.action === 'remove') await rm(path, { force: true });
      else {
        await ensureDir(dirname(path));
        await writeFile(path, operation.content ?? '', 'utf8');
      }
      operations.push({ ...operation, status: 'changed' });
    } catch {
      operations.push({
        ...operation,
        status: 'failed',
        failure:
          'Materialization failed; inspect local verbose diagnostics and retry sync.',
      });
    }
  }
  return {
    applied: operations.filter(({ status }) => status === 'changed').length,
    failed: operations.filter(({ status }) => status === 'failed').length,
    skipped: operations.filter(({ status }) => status === 'current').length,
    operations,
  };
}

export function hasClaudeExtensionChanges(plan: ClaudeExtensionPlan): boolean {
  return hasMaterializationChanges(plan);
}

export function summarizeClaudeExtension(plan: ClaudeExtensionPlan) {
  return summarizeMaterializationPlan(plan);
}

export function toClaudeExtensionOperations(
  plan: ClaudeExtensionPlan,
): MaterializationOperation[] {
  return toMaterializationOperations(plan);
}

export const claudeMaterializationExtension: MaterializationExtension<
  ClaudeExtensionPlan,
  MaterializationContext<ClaudeMaterializationTargetOptions>
> = {
  provider: 'claude',
  computePlan(context) {
    return computeClaudeProjectExtensionPlan(
      context.scopeRoot,
      context.canonicalEntries,
      context.allowedCanonicalPaths,
      context.options,
    );
  },
  applyPlan: applyClaudeProjectExtensionPlan,
};
