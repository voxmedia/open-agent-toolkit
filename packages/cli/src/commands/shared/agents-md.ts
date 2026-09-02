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
}

async function readPlannedContent(
  plan: AgentsMdPlan,
  fileSystem: AgentsMdFileSystem,
): Promise<string> {
  if (plan.kind === 'missing') return '';
  return fileSystem.readFile(plan.targetPath, 'utf8');
}

async function writePlannedContent(
  plan: AgentsMdPlan,
  content: string,
  fileSystem: AgentsMdFileSystem,
): Promise<void> {
  const tempPath = join(
    dirname(plan.targetPath),
    `.${basename(plan.targetPath)}.${process.pid}.${randomUUID()}.tmp`,
  );
  let tempExists = false;
  try {
    await fileSystem.writeFile(tempPath, content, {
      encoding: 'utf8',
      flag: 'wx',
      mode: plan.targetMode ?? 0o666,
    });
    tempExists = true;
    await assertPlanUnchanged(plan, fileSystem);

    if (plan.kind === 'missing') {
      await fileSystem.link(tempPath, plan.targetPath);
      await fileSystem.rm(tempPath, { force: true });
      tempExists = false;
      return;
    }

    await fileSystem.rename(tempPath, plan.targetPath);
    tempExists = false;
  } finally {
    if (tempExists) {
      await fileSystem.rm(tempPath, { force: true });
    }
  }
}

export interface UpsertSectionResult {
  action: 'created' | 'updated' | 'no-change';
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

  let updatedContent: string;
  if (managed) {
    const existingSection = content.slice(managed.start, managed.end);
    if (existingSection === section) return { action: 'no-change' };
    updatedContent = `${content.slice(0, managed.start)}${section}${content.slice(managed.end)}`;
  } else if (plan.kind === 'missing') {
    updatedContent = `${section}\n`;
  } else {
    const separator = content.endsWith('\n') ? '\n' : '\n\n';
    updatedContent = `${content}${separator}${section}\n`;
  }

  await writePlannedContent(plan, updatedContent, fileSystem);
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
): Promise<boolean> {
  const fileSystem = options.fileSystem ?? defaultFileSystem;
  const plan = await planAgentsMd(repoRoot, fileSystem);
  if (plan.kind === 'missing') return false;

  const content = await readPlannedContent(plan, fileSystem);
  const managed = findManagedSection(content, key);
  if (!managed) return false;

  const before = content.slice(0, managed.start);
  const after = content.slice(managed.end);
  const cleaned = (before + after).replace(/\n{3,}/g, '\n\n');
  await writePlannedContent(plan, cleaned, fileSystem);
  return true;
}
