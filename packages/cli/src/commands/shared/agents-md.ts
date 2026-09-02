import { randomUUID } from 'node:crypto';
import {
  chmod,
  chown,
  link,
  lstat,
  readFile,
  readdir,
  readlink,
  realpath,
  rename,
  rm,
  writeFile,
} from 'node:fs/promises';
import {
  basename,
  dirname,
  isAbsolute,
  join,
  relative,
  resolve,
  sep,
} from 'node:path';

/**
 * Manages HTML-comment-delimited sections in AGENTS.md.
 *
 * Section markers follow the pattern:
 *   <!-- OAT <key> -->
 *   ... content ...
 *   <!-- END OAT <key> -->
 */

export interface AgentsMdFileSystem {
  chmod: typeof chmod;
  chown: typeof chown;
  link: typeof link;
  lstat: typeof lstat;
  readFile: typeof readFile;
  readdir: typeof readdir;
  readlink: typeof readlink;
  realpath: typeof realpath;
  rename: typeof rename;
  rm: typeof rm;
  writeFile: typeof writeFile;
}

export interface AgentsMdMutationOptions {
  fileSystem?: AgentsMdFileSystem;
  removeSectionKeys?: readonly string[];
}

const defaultFileSystem: AgentsMdFileSystem = {
  chmod,
  chown,
  link,
  lstat,
  readFile,
  readdir,
  readlink,
  realpath,
  rename,
  rm,
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
  targetMode?: number;
  targetUid?: number;
  targetGid?: number;
  kind: 'missing' | 'file' | 'symlink';
  agentsIdentity?: FileIdentity;
  targetIdentity?: FileIdentity;
  linkText?: string;
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

function isMissing(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'ENOENT'
  );
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
): { start: number; end: number } | undefined {
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
      `AGENTS.md section "${key}" must contain exactly one ordered marker pair before OAT can mutate it.`,
    );
  }

  return { start: starts[0], end: ends[0] + endMarker.length };
}

function assertManagedSectionsAreDisjoint(
  sections: readonly { start: number; end: number }[],
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
        'AGENTS.md managed sections must be mutually disjoint and non-crossing before OAT can mutate them.',
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
      targetMode: agentsStat.mode,
      targetUid: agentsStat.uid,
      targetGid: agentsStat.gid,
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
  let targetStat: Awaited<ReturnType<typeof lstat>>;
  let directTargetStat: Awaited<ReturnType<typeof lstat>>;
  try {
    directTargetStat = await fileSystem.lstat(lexicalTarget);
    targetPath = await fileSystem.realpath(lexicalTarget);
    targetStat = await fileSystem.lstat(targetPath);
  } catch (error) {
    if (
      isMissing(error) ||
      (typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'ELOOP')
    ) {
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
    targetMode: targetStat.mode,
    targetUid: targetStat.uid,
    targetGid: targetStat.gid,
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
  let currentRoot: string;
  let rootStat: Awaited<ReturnType<typeof lstat>>;
  try {
    currentRoot = await fileSystem.realpath(plan.repoRoot);
    rootStat = await fileSystem.lstat(currentRoot);
  } catch {
    throw new Error(
      'Repository or AGENTS.md identity changed before mutation.',
    );
  }
  if (
    currentRoot !== plan.repoRoot ||
    !rootStat.isDirectory() ||
    !hasIdentity(rootStat, plan.repoIdentity)
  ) {
    throw new Error(
      'Repository or AGENTS.md identity changed before mutation.',
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
      'Repository or AGENTS.md identity changed before mutation.',
    );
  }

  let agentsStat: Awaited<ReturnType<typeof lstat>>;
  try {
    agentsStat = await fileSystem.lstat(plan.agentsMdPath);
  } catch {
    throw new Error(
      'Repository or AGENTS.md identity changed before mutation.',
    );
  }
  if (!hasIdentity(agentsStat, plan.agentsIdentity)) {
    throw new Error(
      'Repository or AGENTS.md identity changed before mutation.',
    );
  }

  if (plan.kind === 'file') {
    if (!agentsStat.isFile() || agentsStat.isSymbolicLink()) {
      throw new Error(
        'Repository or AGENTS.md identity changed before mutation.',
      );
    }
    if (
      expectedContent !== undefined &&
      (await fileSystem.readFile(plan.targetPath, 'utf8')) !== expectedContent
    ) {
      throw new Error('AGENTS.md content changed before mutation.');
    }
    return;
  }

  let currentLinkText: string;
  let targetPath: string;
  let targetStat: Awaited<ReturnType<typeof lstat>>;
  try {
    currentLinkText = await fileSystem.readlink(plan.agentsMdPath);
    targetPath = await fileSystem.realpath(
      resolve(dirname(plan.agentsMdPath), currentLinkText),
    );
    targetStat = await fileSystem.lstat(targetPath);
  } catch {
    throw new Error(
      'Repository or AGENTS.md identity changed before mutation.',
    );
  }
  if (
    !agentsStat.isSymbolicLink() ||
    currentLinkText !== plan.linkText ||
    targetPath !== plan.targetPath ||
    !targetStat.isFile() ||
    targetStat.isSymbolicLink() ||
    !hasIdentity(targetStat, plan.targetIdentity)
  ) {
    throw new Error(
      'Repository or AGENTS.md identity changed before mutation.',
    );
  }
  if (
    expectedContent !== undefined &&
    (await fileSystem.readFile(plan.targetPath, 'utf8')) !== expectedContent
  ) {
    throw new Error('AGENTS.md content changed before mutation.');
  }
}

async function readPlannedContent(
  plan: AgentsMdPlan,
  fileSystem: AgentsMdFileSystem,
): Promise<string> {
  if (plan.kind === 'missing') return '';
  return fileSystem.readFile(plan.targetPath, 'utf8');
}

async function assertPublishedPlan(
  plan: AgentsMdPlan,
  publishedIdentity: FileIdentity,
  expectedContent: string,
  fileSystem: AgentsMdFileSystem,
): Promise<void> {
  if (plan.kind === 'missing') {
    throw new Error('Missing AGENTS.md cannot use replacement publication.');
  }
  const currentRoot = await fileSystem.realpath(plan.repoRoot);
  const rootStat = await fileSystem.lstat(currentRoot);
  if (
    currentRoot !== plan.repoRoot ||
    !rootStat.isDirectory() ||
    !hasIdentity(rootStat, plan.repoIdentity)
  ) {
    throw new Error(
      'Repository or AGENTS.md identity changed during mutation.',
    );
  }

  const agentsStat = await fileSystem.lstat(plan.agentsMdPath);
  if (plan.kind === 'file') {
    if (
      !agentsStat.isFile() ||
      agentsStat.isSymbolicLink() ||
      !hasIdentity(agentsStat, publishedIdentity)
    ) {
      throw new Error(
        'Repository or AGENTS.md identity changed during mutation.',
      );
    }
  } else {
    const currentLinkText = await fileSystem.readlink(plan.agentsMdPath);
    const targetPath = await fileSystem.realpath(
      resolve(dirname(plan.agentsMdPath), currentLinkText),
    );
    const targetStat = await fileSystem.lstat(targetPath);
    if (
      !agentsStat.isSymbolicLink() ||
      !hasIdentity(agentsStat, plan.agentsIdentity) ||
      currentLinkText !== plan.linkText ||
      targetPath !== plan.targetPath ||
      !targetStat.isFile() ||
      targetStat.isSymbolicLink() ||
      !hasIdentity(targetStat, publishedIdentity)
    ) {
      throw new Error(
        'Repository or AGENTS.md identity changed during mutation.',
      );
    }
  }

  if (
    (await fileSystem.readFile(plan.targetPath, 'utf8')) !== expectedContent
  ) {
    throw new Error('AGENTS.md publication changed during mutation.');
  }
}

export type AgentsMdMutationErrorCode =
  | 'target-create-failed'
  | 'temp-create-failed'
  | 'metadata-restore-failed'
  | 'recovery-link-failed'
  | 'revalidation-failed'
  | 'publish-failed'
  | 'publish-validation-failed'
  | 'cleanup-conflict';

export interface AgentsMdRecovery {
  code: 'recovery-required';
  target: string;
  identifiers: string[];
  action: string;
}

export class AgentsMdMutationError extends Error {
  readonly code: AgentsMdMutationErrorCode;
  readonly target: string;
  readonly action: string;

  constructor(
    code: AgentsMdMutationErrorCode,
    target: string,
    action: string,
    options?: ErrorOptions,
  ) {
    super(
      `AGENTS.md mutation blocked (${code}) for ${target}. ${action}`,
      options,
    );
    this.name = 'AgentsMdMutationError';
    this.code = code;
    this.target = target;
    this.action = action;
  }
}

export function formatAgentsMdMutationFailure(error: unknown): string {
  if (error instanceof AgentsMdMutationError) return error.message;
  if (
    error instanceof Error &&
    (/^AGENTS\.md section/.test(error.message) ||
      /^AGENTS\.md managed sections/.test(error.message) ||
      /^Repository-root AGENTS\.md/.test(error.message))
  ) {
    return error.message;
  }
  return 'AGENTS.md mutation blocked (unexpected-failure) for AGENTS.md. Inspect repository permissions and retained OAT artifacts, then rerun.';
}

function portableRelative(root: string, path: string): string {
  return relative(root, path).split(sep).join('/');
}

function targetIdentifier(plan: AgentsMdPlan): string {
  return portableRelative(plan.repoRoot, plan.targetPath) || 'AGENTS.md';
}

function mutationError(
  plan: AgentsMdPlan,
  code: AgentsMdMutationErrorCode,
  action: string,
  cause?: unknown,
): AgentsMdMutationError {
  return new AgentsMdMutationError(code, targetIdentifier(plan), action, {
    cause,
  });
}

function recoveryFilenamePrefix(plan: AgentsMdPlan): string {
  return `.${basename(plan.targetPath)}.oat-recovery-`;
}

async function discoverRecoveries(
  plan: AgentsMdPlan,
  fileSystem: AgentsMdFileSystem,
): Promise<string[]> {
  if (plan.kind === 'missing') return [];
  const directory = dirname(plan.targetPath);
  const prefix = recoveryFilenamePrefix(plan);
  let names: string[];
  try {
    names = await fileSystem.readdir(directory);
  } catch (error) {
    throw mutationError(
      plan,
      'revalidation-failed',
      'Inspect repository permissions and rerun.',
      error,
    );
  }

  const recoveries: string[] = [];
  for (const name of names.sort()) {
    if (!name.startsWith(prefix)) continue;
    const encoded = name.slice(prefix.length);
    const match = /^(\d+)-(\d+)(?:-(\d+))?$/.exec(encoded);
    if (!match) continue;
    const path = join(directory, name);
    try {
      const stat = await fileSystem.lstat(path);
      if (
        stat.isFile() &&
        !stat.isSymbolicLink() &&
        String(stat.dev) === match[1] &&
        String(stat.ino) === match[2]
      ) {
        recoveries.push(path);
      }
    } catch (error) {
      if (!isMissing(error)) {
        throw mutationError(
          plan,
          'revalidation-failed',
          'Inspect retained recovery evidence and rerun.',
          error,
        );
      }
    }
  }
  return recoveries;
}

function recoveryResult(
  plan: AgentsMdPlan,
  recoveryPaths: readonly string[],
): AgentsMdRecovery {
  const identifiers = recoveryPaths.map((path) =>
    portableRelative(plan.repoRoot, path),
  );
  return {
    code: 'recovery-required',
    target: targetIdentifier(plan),
    identifiers,
    action: `Review and remove ${identifiers.join(', ')} after reconciling retained content, then rerun.`,
  };
}

async function createRecoveryLink(
  plan: AgentsMdPlan,
  fileSystem: AgentsMdFileSystem,
): Promise<string> {
  if (!plan.targetIdentity) {
    throw mutationError(
      plan,
      'recovery-link-failed',
      'Retry after confirming the target is unchanged.',
    );
  }
  const base = `${recoveryFilenamePrefix(plan)}${plan.targetIdentity.device}-${plan.targetIdentity.inode}`;
  for (let ordinal = 1; ordinal <= 100; ordinal += 1) {
    const path = join(
      dirname(plan.targetPath),
      ordinal === 1 ? base : `${base}-${ordinal}`,
    );
    try {
      await fileSystem.link(plan.targetPath, path);
      return path;
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'EEXIST'
      ) {
        continue;
      }
      throw mutationError(
        plan,
        'recovery-link-failed',
        'Inspect repository permissions and retry.',
        error,
      );
    }
  }
  throw mutationError(
    plan,
    'recovery-link-failed',
    'Resolve retained recovery collisions before retrying.',
  );
}

async function writePlannedContent(
  plan: AgentsMdPlan,
  previousContent: string,
  content: string,
  fileSystem: AgentsMdFileSystem,
): Promise<
  | { status: 'published' }
  | { status: 'recovery-required'; recovery: AgentsMdRecovery }
> {
  if (plan.kind === 'missing') {
    try {
      await assertPlanUnchanged(plan, fileSystem, previousContent);
      await fileSystem.writeFile(plan.targetPath, content, {
        encoding: 'utf8',
        flag: 'wx',
        mode: 0o666,
      });
      return { status: 'published' };
    } catch (error) {
      throw mutationError(
        plan,
        'target-create-failed',
        'Inspect the repository target and retry.',
        error,
      );
    }
  }
  const tempPath = join(
    dirname(plan.targetPath),
    `.${basename(plan.targetPath)}.${process.pid}.${randomUUID()}.tmp`,
  );
  try {
    await fileSystem.writeFile(tempPath, content, {
      encoding: 'utf8',
      flag: 'wx',
      mode: plan.targetMode ?? 0o666,
    });
  } catch (error) {
    throw mutationError(
      plan,
      'temp-create-failed',
      'Inspect repository permissions and retry.',
      error,
    );
  }
  let tempStat: Awaited<ReturnType<typeof lstat>>;
  try {
    tempStat = await fileSystem.lstat(tempPath);
    const tempIdentity = identityOf(tempStat);
    await fileSystem.chmod(tempPath, (plan.targetMode ?? 0o666) & 0o7777);
    if (plan.targetUid !== undefined && plan.targetGid !== undefined) {
      await fileSystem.chown(tempPath, plan.targetUid, plan.targetGid);
    }
    tempStat = await fileSystem.lstat(tempPath);
    if (!hasIdentity(tempStat, tempIdentity)) {
      throw mutationError(
        plan,
        'cleanup-conflict',
        'Preserved an ambiguous temporary artifact; inspect retained OAT artifacts before retrying.',
      );
    }
  } catch (error) {
    if (error instanceof AgentsMdMutationError) throw error;
    throw mutationError(
      plan,
      'metadata-restore-failed',
      'Preserved the temporary artifact; inspect target metadata before retrying.',
      error,
    );
  }
  const tempIdentity = identityOf(tempStat);
  try {
    await assertPlanUnchanged(plan, fileSystem, previousContent);
  } catch (error) {
    throw mutationError(
      plan,
      'revalidation-failed',
      'Preserved the temporary artifact; reconcile concurrent changes and retry.',
      error,
    );
  }

  // Node does not expose a conditional replace primitive. Keep the live
  // public path present, preserve the original inode under a private hard
  // link, revalidate the one planned snapshot, and then replace the public
  // path atomically. The preserved inode is never removed after publication:
  // an editor may still hold a descriptor and write to it later.
  const recoveryPath = await createRecoveryLink(plan, fileSystem);
  let recoveryStat: Awaited<ReturnType<typeof lstat>>;
  try {
    recoveryStat = await fileSystem.lstat(recoveryPath);
    if (
      !recoveryStat.isFile() ||
      recoveryStat.isSymbolicLink() ||
      !hasIdentity(recoveryStat, plan.targetIdentity) ||
      (await fileSystem.readFile(recoveryPath, 'utf8')) !== previousContent
    ) {
      throw mutationError(
        plan,
        'cleanup-conflict',
        'Preserved the recovery pathname; inspect retained OAT artifacts before retrying.',
      );
    }
    await assertPlanUnchanged(plan, fileSystem, previousContent);
  } catch (error) {
    if (error instanceof AgentsMdMutationError) throw error;
    throw mutationError(
      plan,
      'revalidation-failed',
      'Preserved recovery evidence; reconcile concurrent changes and retry.',
      error,
    );
  }

  try {
    await fileSystem.rename(tempPath, plan.targetPath);
  } catch (error) {
    throw mutationError(
      plan,
      'publish-failed',
      'Preserved recovery evidence and the temporary artifact; inspect both before retrying.',
      error,
    );
  }
  try {
    await assertPublishedPlan(plan, tempIdentity, content, fileSystem);
  } catch (error) {
    throw mutationError(
      plan,
      'publish-validation-failed',
      'Preserved recovery evidence; inspect the published target before retrying.',
      error,
    );
  }
  return {
    status: 'recovery-required',
    recovery: recoveryResult(plan, [recoveryPath]),
  };
}

export interface UpsertSectionResult {
  action: 'created' | 'updated' | 'no-change' | 'recovery-required';
  recovery?: AgentsMdRecovery;
}

export interface AgentsMdSectionInput {
  key: string;
  body: string;
}

export async function upsertAgentsMdSections(
  repoRoot: string,
  sections: readonly AgentsMdSectionInput[],
  options: Pick<AgentsMdMutationOptions, 'fileSystem'> = {},
): Promise<Record<string, UpsertSectionResult>> {
  const fileSystem = options.fileSystem ?? defaultFileSystem;
  const plan = await planAgentsMd(repoRoot, fileSystem);
  const content = await readPlannedContent(plan, fileSystem);
  const unresolvedRecoveries = await discoverRecoveries(plan, fileSystem);
  if (unresolvedRecoveries.length > 0) {
    const result = {
      action: 'recovery-required',
      recovery: recoveryResult(plan, unresolvedRecoveries),
    } satisfies UpsertSectionResult;
    return Object.fromEntries(sections.map(({ key }) => [key, result]));
  }

  const planned = sections.map(({ key, body }) => ({
    key,
    section: buildSection(key, body),
    managed: findManagedSection(content, key),
  }));
  assertManagedSectionsAreDisjoint(
    planned.flatMap(({ managed }) => (managed ? [managed] : [])),
  );
  const edits = planned
    .flatMap(({ section, managed }) =>
      managed ? [{ ...managed, replacement: section }] : [],
    )
    .sort((left, right) => right.start - left.start);
  let updatedContent = edits.reduce(
    (current, edit) =>
      `${current.slice(0, edit.start)}${edit.replacement}${current.slice(edit.end)}`,
    content,
  );
  const additions = planned.filter(({ managed }) => !managed);
  if (additions.length > 0) {
    const addition = additions.map(({ section }) => section).join('\n\n');
    if (updatedContent.length === 0) updatedContent = `${addition}\n`;
    else {
      const separator = updatedContent.endsWith('\n') ? '\n' : '\n\n';
      updatedContent = `${updatedContent}${separator}${addition}\n`;
    }
  }
  if (updatedContent === content) {
    return Object.fromEntries(
      planned.map(({ key }) => [key, { action: 'no-change' }]),
    );
  }
  const publication = await writePlannedContent(
    plan,
    content,
    updatedContent,
    fileSystem,
  );
  const changedResult: UpsertSectionResult =
    publication.status === 'recovery-required'
      ? {
          action: 'recovery-required',
          recovery: publication.recovery,
        }
      : { action: plan.kind === 'missing' ? 'created' : 'updated' };
  return Object.fromEntries(
    planned.map(({ key, section, managed }) => [
      key,
      managed && content.slice(managed.start, managed.end) === section
        ? { action: 'no-change' }
        : changedResult,
    ]),
  );
}

/**
 * Insert or replace a managed section in AGENTS.md.
 *
 * A repository-root symlink is followed only when it remains an unchanged,
 * contained direct link to a regular file. Existing files are replaced
 * atomically after their identities and marker structure are revalidated.
 */
export async function upsertAgentsMdSection(
  repoRoot: string,
  key: string,
  body: string,
  options: AgentsMdMutationOptions = {},
): Promise<UpsertSectionResult> {
  const fileSystem = options.fileSystem ?? defaultFileSystem;
  const plan = await planAgentsMd(repoRoot, fileSystem);
  const section = buildSection(key, body);
  const content = await readPlannedContent(plan, fileSystem);
  const unresolvedRecoveries = await discoverRecoveries(plan, fileSystem);
  if (unresolvedRecoveries.length > 0) {
    return {
      action: 'recovery-required',
      recovery: recoveryResult(plan, unresolvedRecoveries),
    };
  }
  const managed = findManagedSection(content, key);
  const removalSections = [...new Set(options.removeSectionKeys ?? [])].flatMap(
    (removeKey) => {
      if (removeKey === key) return [];
      const sectionToRemove = findManagedSection(content, removeKey);
      return sectionToRemove ? [sectionToRemove] : [];
    },
  );
  assertManagedSectionsAreDisjoint([
    ...(managed ? [managed] : []),
    ...removalSections,
  ]);

  let updatedContent: string;
  if (managed) {
    const existingSection = content.slice(managed.start, managed.end);
    if (existingSection === section && removalSections.length === 0) {
      return { action: 'no-change' };
    }
    const edits = [
      { ...managed, replacement: section },
      ...removalSections.map((remove) => ({
        ...remove,
        replacement: '',
      })),
    ].sort((left, right) => right.start - left.start);
    updatedContent = edits.reduce(
      (current, edit) =>
        `${current.slice(0, edit.start)}${edit.replacement}${current.slice(edit.end)}`,
      content,
    );
  } else {
    if (removalSections.length > 0) {
      const [replacement, ...removals] = removalSections.sort(
        (left, right) => left.start - right.start,
      );
      const edits = [
        ...(replacement ? [{ ...replacement, replacement: section }] : []),
        ...removals.map((remove) => ({ ...remove, replacement: '' })),
      ].sort((left, right) => right.start - left.start);
      updatedContent = edits.reduce(
        (current, edit) =>
          `${current.slice(0, edit.start)}${edit.replacement}${current.slice(edit.end)}`,
        content,
      );
    } else if (plan.kind === 'missing') {
      updatedContent = `${section}\n`;
    } else if (content.length === 0) {
      updatedContent = `${section}\n`;
    } else {
      const separator = content.endsWith('\n') ? '\n' : '\n\n';
      updatedContent = `${content}${separator}${section}\n`;
    }
  }

  const publication = await writePlannedContent(
    plan,
    content,
    updatedContent,
    fileSystem,
  );
  if (publication.status === 'recovery-required') {
    return {
      action: 'recovery-required',
      recovery: publication.recovery,
    };
  }
  return { action: plan.kind === 'missing' ? 'created' : 'updated' };
}

/**
 * Remove a managed section from AGENTS.md if it exists.
 *
 * Returns true if the section was found and removed, false otherwise.
 */
export async function removeAgentsMdSection(
  repoRoot: string,
  key: string,
  options: AgentsMdMutationOptions = {},
): Promise<boolean | 'recovery-required'> {
  const fileSystem = options.fileSystem ?? defaultFileSystem;
  const plan = await planAgentsMd(repoRoot, fileSystem);
  if (plan.kind === 'missing') return false;

  const content = await readPlannedContent(plan, fileSystem);
  const unresolvedRecoveries = await discoverRecoveries(plan, fileSystem);
  if (unresolvedRecoveries.length > 0) return 'recovery-required';
  const managed = findManagedSection(content, key);
  if (!managed) return false;

  const before = content.slice(0, managed.start);
  const after = content.slice(managed.end);
  const cleaned = before + after;
  const publication = await writePlannedContent(
    plan,
    content,
    cleaned,
    fileSystem,
  );
  return publication.status === 'recovery-required'
    ? 'recovery-required'
    : true;
}
