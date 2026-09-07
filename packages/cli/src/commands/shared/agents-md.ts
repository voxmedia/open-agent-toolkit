import {
  lstat,
  readFile,
  readlink,
  realpath,
  writeFile,
} from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';

/**
 * Plans repository AGENTS.md guidance without replacing existing paths.
 *
 * An absent root file may be created with one exclusive write. Existing files
 * and contained symlinks are read only: matching content returns no-change and
 * every required change is returned as a copy-pasteable manual patch.
 */

export interface AgentsMdFileSystem {
  lstat: typeof lstat;
  readFile: typeof readFile;
  readlink: typeof readlink;
  realpath: typeof realpath;
  writeFile: typeof writeFile;
}

export interface AgentsMdMutationOptions {
  fileSystem?: AgentsMdFileSystem;
  removeSectionKeys?: readonly string[];
}

const defaultFileSystem: AgentsMdFileSystem = {
  lstat,
  readFile,
  readlink,
  realpath,
  writeFile,
};

interface FileIdentity {
  device: string;
  inode: string;
}

interface AgentsMdPlan {
  repoRoot: string;
  repoIdentity: FileIdentity;
  agentsMdPath: string;
  targetPath: string;
  kind: 'missing' | 'file' | 'symlink';
  agentsIdentity?: FileIdentity;
  targetIdentity?: FileIdentity;
  linkText?: string;
}

interface ManagedRange {
  key: string;
  start: number;
  end: number;
}

export interface AgentsMdManualPatch {
  target: string;
  managedBlock: string;
  legacyBlockAction: 'preserve' | 'remove-manually';
  instructions: readonly string[];
}

export interface AgentsMdBlocked {
  code: 'blocked';
  target: string;
  reason: string;
  action: string;
}

export interface UpsertSectionResult {
  action: 'created' | 'no-change' | 'manual-required' | 'blocked';
  manualPatch?: AgentsMdManualPatch;
  blocked?: AgentsMdBlocked;
}

export interface AgentsMdSectionInput {
  key: string;
  body: string;
}

function sectionStart(key: string): string {
  return `<!-- OAT ${key} -->`;
}

function sectionEnd(key: string): string {
  return `<!-- END OAT ${key} -->`;
}

function buildSection(key: string, body: string): string {
  return `${sectionStart(key)}\n${body}\n${sectionEnd(key)}`;
}

function identityOf(stat: Awaited<ReturnType<typeof lstat>>): FileIdentity {
  return { device: String(stat.dev), inode: String(stat.ino) };
}

function hasIdentity(
  stat: Awaited<ReturnType<typeof lstat>>,
  expected: FileIdentity | undefined,
): boolean {
  return (
    expected !== undefined &&
    String(stat.dev) === expected.device &&
    String(stat.ino) === expected.inode
  );
}

function errorCode(error: unknown): string | undefined {
  return typeof error === 'object' && error !== null && 'code' in error
    ? String(error.code)
    : undefined;
}

function isMissing(error: unknown): boolean {
  return errorCode(error) === 'ENOENT';
}

function isContained(root: string, candidate: string): boolean {
  const relativePath = relative(root, candidate);
  return (
    relativePath === '' ||
    (!isAbsolute(relativePath) &&
      relativePath !== '..' &&
      !relativePath.startsWith(`..${sep}`))
  );
}

function portableRelative(root: string, path: string): string {
  return relative(root, path).split(sep).join('/');
}

function targetIdentifier(plan: AgentsMdPlan): string {
  return portableRelative(plan.repoRoot, plan.targetPath) || 'AGENTS.md';
}

function markerIndices(content: string, marker: string): number[] {
  const indices: number[] = [];
  let offset = 0;
  while (offset <= content.length) {
    const index = content.indexOf(marker, offset);
    if (index === -1) break;
    indices.push(index);
    offset = index + marker.length;
  }
  return indices;
}

function findManagedSection(
  content: string,
  key: string,
): ManagedRange | undefined {
  const startMarker = sectionStart(key);
  const endMarker = sectionEnd(key);
  const starts = markerIndices(content, startMarker);
  const ends = markerIndices(content, endMarker);

  if (starts.length === 0 && ends.length === 0) return undefined;
  if (
    starts.length !== 1 ||
    ends.length !== 1 ||
    starts[0] === undefined ||
    ends[0] === undefined ||
    starts[0] + startMarker.length > ends[0]
  ) {
    throw new Error(
      `AGENTS.md section "${key}" must contain exactly one ordered marker pair before OAT can plan guidance.`,
    );
  }

  return {
    key,
    start: starts[0],
    end: ends[0] + endMarker.length,
  };
}

function assertManagedSectionsAreDisjoint(
  sections: readonly ManagedRange[],
): void {
  const ordered = [...sections].sort((left, right) => left.start - right.start);
  for (let index = 1; index < ordered.length; index += 1) {
    const previous = ordered[index - 1];
    const current = ordered[index];
    if (
      previous !== undefined &&
      current !== undefined &&
      previous.end > current.start
    ) {
      throw new Error(
        'AGENTS.md managed sections must be mutually disjoint and non-crossing before OAT can plan guidance.',
      );
    }
  }
}

async function planAgentsMd(
  repoRoot: string,
  fileSystem: AgentsMdFileSystem,
): Promise<AgentsMdPlan> {
  const resolvedRoot = await fileSystem.realpath(repoRoot);
  const rootStat = await fileSystem.lstat(resolvedRoot);
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) {
    throw new Error('Repository root must resolve to a real directory.');
  }

  const agentsMdPath = join(resolvedRoot, 'AGENTS.md');
  let agentsStat: Awaited<ReturnType<typeof lstat>>;
  try {
    agentsStat = await fileSystem.lstat(agentsMdPath);
  } catch (error) {
    if (!isMissing(error)) throw error;
    return {
      repoRoot: resolvedRoot,
      repoIdentity: identityOf(rootStat),
      agentsMdPath,
      targetPath: agentsMdPath,
      kind: 'missing',
    };
  }

  if (agentsStat.isFile() && !agentsStat.isSymbolicLink()) {
    return {
      repoRoot: resolvedRoot,
      repoIdentity: identityOf(rootStat),
      agentsMdPath,
      targetPath: agentsMdPath,
      kind: 'file',
      agentsIdentity: identityOf(agentsStat),
      targetIdentity: identityOf(agentsStat),
    };
  }

  if (!agentsStat.isSymbolicLink()) {
    throw new Error(
      'Repository-root AGENTS.md must be a regular file or a contained symlink to one.',
    );
  }

  const linkText = await fileSystem.readlink(agentsMdPath);
  const lexicalTarget = resolve(dirname(agentsMdPath), linkText);
  let targetPath: string;
  let directTargetStat: Awaited<ReturnType<typeof lstat>>;
  let targetStat: Awaited<ReturnType<typeof lstat>>;
  try {
    directTargetStat = await fileSystem.lstat(lexicalTarget);
    targetPath = await fileSystem.realpath(lexicalTarget);
    targetStat = await fileSystem.lstat(targetPath);
  } catch (error) {
    if (isMissing(error) || errorCode(error) === 'ELOOP') {
      throw new Error(
        'Repository-root AGENTS.md symlink target is broken or cyclic.',
        { cause: error },
      );
    }
    throw error;
  }

  if (!isContained(resolvedRoot, targetPath)) {
    throw new Error(
      'Repository-root AGENTS.md symlink target must stay inside the repository root.',
    );
  }
  if (
    !directTargetStat.isFile() ||
    directTargetStat.isSymbolicLink() ||
    !targetStat.isFile() ||
    targetStat.isSymbolicLink()
  ) {
    throw new Error(
      'Repository-root AGENTS.md symlink target must be a regular file.',
    );
  }

  return {
    repoRoot: resolvedRoot,
    repoIdentity: identityOf(rootStat),
    agentsMdPath,
    targetPath,
    kind: 'symlink',
    agentsIdentity: identityOf(agentsStat),
    targetIdentity: identityOf(targetStat),
    linkText,
  };
}

async function assertPlanUnchanged(
  plan: AgentsMdPlan,
  fileSystem: AgentsMdFileSystem,
  expectedContent?: string,
): Promise<void> {
  const currentRoot = await fileSystem.realpath(plan.repoRoot);
  const rootStat = await fileSystem.lstat(currentRoot);
  if (
    currentRoot !== plan.repoRoot ||
    !rootStat.isDirectory() ||
    rootStat.isSymbolicLink() ||
    !hasIdentity(rootStat, plan.repoIdentity)
  ) {
    throw new Error(
      'Repository or AGENTS.md identity changed during planning.',
    );
  }

  if (plan.kind === 'missing') {
    try {
      await fileSystem.lstat(plan.agentsMdPath);
    } catch (error) {
      if (isMissing(error)) return;
      throw error;
    }
    throw new Error(
      'Repository or AGENTS.md identity changed during planning.',
    );
  }

  const agentsStat = await fileSystem.lstat(plan.agentsMdPath);
  if (!hasIdentity(agentsStat, plan.agentsIdentity)) {
    throw new Error(
      'Repository or AGENTS.md identity changed during planning.',
    );
  }
  if (plan.kind === 'file') {
    if (!agentsStat.isFile() || agentsStat.isSymbolicLink()) {
      throw new Error(
        'Repository or AGENTS.md identity changed during planning.',
      );
    }
  } else {
    const currentLinkText = await fileSystem.readlink(plan.agentsMdPath);
    const currentTarget = await fileSystem.realpath(
      resolve(dirname(plan.agentsMdPath), currentLinkText),
    );
    const targetStat = await fileSystem.lstat(currentTarget);
    if (
      !agentsStat.isSymbolicLink() ||
      currentLinkText !== plan.linkText ||
      currentTarget !== plan.targetPath ||
      !targetStat.isFile() ||
      targetStat.isSymbolicLink() ||
      !hasIdentity(targetStat, plan.targetIdentity)
    ) {
      throw new Error(
        'Repository or AGENTS.md identity changed during planning.',
      );
    }
  }

  if (
    expectedContent !== undefined &&
    (await fileSystem.readFile(plan.targetPath, 'utf8')) !== expectedContent
  ) {
    throw new Error('AGENTS.md content changed during planning.');
  }
}

function safeReason(error: unknown): string {
  if (!(error instanceof Error)) {
    return 'AGENTS.md guidance could not be planned safely.';
  }
  if (
    /^(Repository root|Repository-root AGENTS\.md|Repository or AGENTS\.md|AGENTS\.md section|AGENTS\.md managed sections|AGENTS\.md content)/.test(
      error.message,
    )
  ) {
    return error.message;
  }
  return 'AGENTS.md guidance could not be planned safely.';
}

function blockedResult(
  error: unknown,
  target = 'AGENTS.md',
): UpsertSectionResult {
  return {
    action: 'blocked',
    blocked: {
      code: 'blocked',
      target,
      reason: safeReason(error),
      action:
        'Resolve the reported AGENTS.md path or marker issue, then rerun.',
    },
  };
}

export function formatAgentsMdMutationFailure(error: unknown): string {
  const reason = safeReason(error);
  return `AGENTS.md guidance blocked for AGENTS.md. ${reason} Resolve the reported path or marker issue, then rerun.`;
}

export function formatAgentsMdGuidanceResult(
  result: UpsertSectionResult,
): readonly string[] {
  if (result.action === 'manual-required' && result.manualPatch) {
    return [
      'Guidance status: manual-required',
      `Target: ${result.manualPatch.target}`,
      ...result.manualPatch.instructions,
      'Managed block:',
      result.manualPatch.managedBlock,
      `Legacy block action: ${result.manualPatch.legacyBlockAction}`,
    ];
  }
  if (result.action === 'blocked' && result.blocked) {
    return [
      'Guidance status: blocked',
      `Target: ${result.blocked.target}`,
      result.blocked.reason,
      result.blocked.action,
    ];
  }
  return [];
}

function createManualPatch(
  plan: AgentsMdPlan,
  managedBlocks: readonly string[],
  legacyKeys: readonly string[],
): AgentsMdManualPatch {
  const target = targetIdentifier(plan);
  return {
    target,
    managedBlock: managedBlocks.join('\n\n'),
    legacyBlockAction: legacyKeys.length > 0 ? 'remove-manually' : 'preserve',
    instructions: [
      `Open ${target}.`,
      'Replace each matching OAT managed block, or append each absent block, exactly as shown.',
      ...(legacyKeys.length > 0
        ? [
            `Remove the legacy ${legacyKeys.map((key) => `OAT ${key}`).join(', ')} managed block${legacyKeys.length === 1 ? '' : 's'} manually after applying the replacement block.`,
          ]
        : []),
      'Review and save the file, then rerun the command to confirm no-change.',
    ],
  };
}

async function createMissingFile(
  plan: AgentsMdPlan,
  content: string,
  fileSystem: AgentsMdFileSystem,
): Promise<'created' | 'appeared' | 'blocked'> {
  try {
    await assertPlanUnchanged(plan, fileSystem);
    await fileSystem.writeFile(plan.agentsMdPath, content, {
      encoding: 'utf8',
      flag: 'wx',
      mode: 0o666,
    });
    return 'created';
  } catch (error) {
    if (errorCode(error) === 'EEXIST') return 'appeared';
    return 'blocked';
  }
}

async function upsertSectionsInternal(
  repoRoot: string,
  sections: readonly AgentsMdSectionInput[],
  removeSectionKeys: readonly string[],
  fileSystem: AgentsMdFileSystem,
  allowReplan: boolean,
): Promise<Record<string, UpsertSectionResult>> {
  let plan: AgentsMdPlan;
  try {
    plan = await planAgentsMd(repoRoot, fileSystem);
  } catch (error) {
    const blocked = blockedResult(error);
    return Object.fromEntries(sections.map(({ key }) => [key, blocked]));
  }

  const desired = sections.map(({ key, body }) => ({
    key,
    block: buildSection(key, body),
  }));
  if (plan.kind === 'missing') {
    const content = `${desired.map(({ block }) => block).join('\n\n')}\n`;
    const creation = await createMissingFile(plan, content, fileSystem);
    if (creation === 'created') {
      return Object.fromEntries(
        desired.map(({ key }) => [key, { action: 'created' }]),
      );
    }
    if (creation === 'appeared' && allowReplan) {
      return upsertSectionsInternal(
        repoRoot,
        sections,
        removeSectionKeys,
        fileSystem,
        false,
      );
    }
    const blocked = blockedResult(
      new Error('Repository or AGENTS.md identity changed during planning.'),
      targetIdentifier(plan),
    );
    return Object.fromEntries(desired.map(({ key }) => [key, blocked]));
  }

  try {
    const content = await fileSystem.readFile(plan.targetPath, 'utf8');
    const managed = desired.map(({ key, block }) => ({
      key,
      block,
      range: findManagedSection(content, key),
    }));
    const legacy = [...new Set(removeSectionKeys)]
      .filter((key) => !desired.some((section) => section.key === key))
      .map((key) => ({ key, range: findManagedSection(content, key) }))
      .filter(
        (entry): entry is { key: string; range: ManagedRange } =>
          entry.range !== undefined,
      );
    assertManagedSectionsAreDisjoint([
      ...managed.flatMap(({ range }) => (range ? [range] : [])),
      ...legacy.map(({ range }) => range),
    ]);
    await assertPlanUnchanged(plan, fileSystem, content);

    const changed = managed.filter(
      ({ block, range }) =>
        !range || content.slice(range.start, range.end) !== block,
    );
    if (changed.length === 0 && legacy.length === 0) {
      return Object.fromEntries(
        desired.map(({ key }) => [key, { action: 'no-change' }]),
      );
    }

    const manualPatch = createManualPatch(
      plan,
      changed.length > 0
        ? changed.map(({ block }) => block)
        : desired.map(({ block }) => block),
      legacy.map(({ key }) => key),
    );
    return Object.fromEntries(
      managed.map(({ key, block, range }) => [
        key,
        range &&
        content.slice(range.start, range.end) === block &&
        legacy.length === 0
          ? { action: 'no-change' }
          : { action: 'manual-required', manualPatch },
      ]),
    );
  } catch (error) {
    const blocked = blockedResult(error, targetIdentifier(plan));
    return Object.fromEntries(desired.map(({ key }) => [key, blocked]));
  }
}

export async function upsertAgentsMdSections(
  repoRoot: string,
  sections: readonly AgentsMdSectionInput[],
  options: Pick<AgentsMdMutationOptions, 'fileSystem'> = {},
): Promise<Record<string, UpsertSectionResult>> {
  if (sections.length === 0) return {};
  return upsertSectionsInternal(
    repoRoot,
    sections,
    [],
    options.fileSystem ?? defaultFileSystem,
    true,
  );
}

export async function upsertAgentsMdSection(
  repoRoot: string,
  key: string,
  body: string,
  options: AgentsMdMutationOptions = {},
): Promise<UpsertSectionResult> {
  const result = await upsertSectionsInternal(
    repoRoot,
    [{ key, body }],
    options.removeSectionKeys ?? [],
    options.fileSystem ?? defaultFileSystem,
    true,
  );
  return result[key] ?? blockedResult(new Error('AGENTS.md guidance failed.'));
}

export async function removeAgentsMdSection(
  repoRoot: string,
  key: string,
  options: Pick<AgentsMdMutationOptions, 'fileSystem'> = {},
): Promise<boolean | 'manual-required' | 'blocked'> {
  const fileSystem = options.fileSystem ?? defaultFileSystem;
  try {
    const plan = await planAgentsMd(repoRoot, fileSystem);
    if (plan.kind === 'missing') return false;
    const content = await fileSystem.readFile(plan.targetPath, 'utf8');
    const managed = findManagedSection(content, key);
    await assertPlanUnchanged(plan, fileSystem, content);
    return managed ? 'manual-required' : false;
  } catch {
    return 'blocked';
  }
}
