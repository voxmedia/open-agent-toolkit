import { randomUUID } from 'node:crypto';
import {
  link,
  lstat,
  readFile,
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
  link: typeof link;
  lstat: typeof lstat;
  readFile: typeof readFile;
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
  link,
  lstat,
  readFile,
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

async function writePlannedContent(
  plan: AgentsMdPlan,
  previousContent: string,
  content: string,
  fileSystem: AgentsMdFileSystem,
): Promise<'published' | 'recovery-required'> {
  const tempPath = join(
    dirname(plan.targetPath),
    `.${basename(plan.targetPath)}.${process.pid}.${randomUUID()}.tmp`,
  );
  const recoveryPath = join(
    dirname(plan.targetPath),
    `.${basename(plan.targetPath)}.${process.pid}.${randomUUID()}.recovery`,
  );
  let tempExists = false;
  let recoveryExists = false;
  let published = false;
  try {
    await fileSystem.writeFile(tempPath, content, {
      encoding: 'utf8',
      flag: 'wx',
      mode: plan.targetMode ?? 0o666,
    });
    tempExists = true;
    const tempStat = await fileSystem.lstat(tempPath);
    const tempIdentity = identityOf(tempStat);
    await assertPlanUnchanged(plan, fileSystem, previousContent);

    if (plan.kind === 'missing') {
      await fileSystem.link(tempPath, plan.targetPath);
      await fileSystem.rm(tempPath, { force: true });
      tempExists = false;
      return 'published';
    }

    // Node does not expose a conditional replace primitive. Keep the live
    // public path present, preserve the original inode under a private hard
    // link, revalidate the one planned snapshot, and then replace the public
    // path atomically. The preserved inode is never removed after publication:
    // an editor may still hold a descriptor and write to it later.
    await fileSystem.link(plan.targetPath, recoveryPath);
    recoveryExists = true;
    const recoveryStat = await fileSystem.lstat(recoveryPath);
    if (
      !recoveryStat.isFile() ||
      recoveryStat.isSymbolicLink() ||
      !hasIdentity(recoveryStat, plan.targetIdentity) ||
      (await fileSystem.readFile(recoveryPath, 'utf8')) !== previousContent
    ) {
      throw new Error('AGENTS.md content changed before mutation.');
    }
    await assertPlanUnchanged(plan, fileSystem, previousContent);

    await fileSystem.rename(tempPath, plan.targetPath);
    tempExists = false;
    published = true;
    try {
      await assertPublishedPlan(plan, tempIdentity, content, fileSystem);
    } catch (error) {
      throw new Error(
        'AGENTS.md was atomically updated, but its prior version was preserved beside it and requires recovery review.',
        { cause: error },
      );
    }
    return 'recovery-required';
  } finally {
    if (tempExists) {
      await fileSystem.rm(tempPath, { force: true });
    }
    if (recoveryExists && !published) {
      await fileSystem.rm(recoveryPath, { force: true });
    }
  }
}

export interface UpsertSectionResult {
  action: 'created' | 'updated' | 'no-change' | 'recovery-required';
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
    updatedContent = edits
      .reduce(
        (current, edit) =>
          `${current.slice(0, edit.start)}${edit.replacement}${current.slice(edit.end)}`,
        content,
      )
      .replace(/\n{3,}/g, '\n\n');
  } else {
    const removedContent = removalSections
      .sort((left, right) => right.start - left.start)
      .reduce(
        (current, remove) =>
          `${current.slice(0, remove.start)}${current.slice(remove.end)}`,
        content,
      )
      .replace(/\n{3,}/g, '\n\n');
    const migratedContent =
      removalSections.length === 0
        ? removedContent
        : removedContent.trim().length === 0
          ? ''
          : removedContent.replace(/\n+$/g, '\n');
    if (plan.kind === 'missing') {
      updatedContent = `${section}\n`;
    } else if (migratedContent.length === 0) {
      updatedContent = `${section}\n`;
    } else {
      const separator = migratedContent.endsWith('\n') ? '\n' : '\n\n';
      updatedContent = `${migratedContent}${separator}${section}\n`;
    }
  }

  const publication = await writePlannedContent(
    plan,
    content,
    updatedContent,
    fileSystem,
  );
  if (publication === 'recovery-required') {
    return { action: 'recovery-required' };
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
  const managed = findManagedSection(content, key);
  if (!managed) return false;

  const before = content.slice(0, managed.start);
  const after = content.slice(managed.end);
  const cleaned = (before + after).replace(/\n{3,}/g, '\n\n');
  const publication = await writePlannedContent(
    plan,
    content,
    cleaned,
    fileSystem,
  );
  return publication === 'recovery-required' ? 'recovery-required' : true;
}
