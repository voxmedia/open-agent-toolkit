import { constants } from 'node:fs';
import {
  lstat,
  open,
  readFile,
  readlink,
  realpath,
  writeFile,
} from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';

/**
 * Plans repository AGENTS.md guidance without replacing existing paths.
 *
 * An absent root file may be created with one exclusive write. For an existing
 * file (or its contained symlink target), matching content returns no-change,
 * absent managed blocks are appended with one append-only write that never
 * truncates, renames, or rewrites existing bytes, and a present-but-different
 * block is returned as a zero-write, copy-pasteable manual patch.
 */

export interface AgentsMdFileSystem {
  lstat: typeof lstat;
  open: typeof open;
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
  open,
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
  /** Hard-link count of the planned target; above 1 never takes the append. */
  targetLinkCount?: number;
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
  /**
   * Present when OAT refused to append absent blocks (zero bytes written);
   * names the cause so callers do not claim an existing block differs.
   */
  appendRefusal?: string;
}

export interface AgentsMdBlocked {
  code: 'blocked';
  target: string;
  reason: string;
  action: string;
}

export interface UpsertSectionResult {
  action: 'created' | 'appended' | 'no-change' | 'manual-required' | 'blocked';
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

/**
 * Renders one managed block exactly as the writer creates or appends it, so
 * read-only surfaces print the same bytes the writer would produce.
 */
export function buildAgentsMdManagedBlock(key: string, body: string): string {
  return buildSection(key, body);
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
      targetLinkCount: Number(agentsStat.nlink),
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
    targetLinkCount: Number(targetStat.nlink),
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
    /^(Repository root|Repository-root AGENTS\.md|Repository or AGENTS\.md|AGENTS\.md section|AGENTS\.md managed sections|AGENTS\.md content|AGENTS\.md append)/.test(
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
  appendRefusal?: string,
): AgentsMdManualPatch {
  const target = targetIdentifier(plan);
  return {
    target,
    managedBlock: managedBlocks.join('\n\n'),
    legacyBlockAction: legacyKeys.length > 0 ? 'remove-manually' : 'preserve',
    ...(appendRefusal ? { appendRefusal } : {}),
    instructions: [
      ...(appendRefusal
        ? [
            `OAT did not append to ${target}: ${appendRefusal}. Nothing was written.`,
          ]
        : []),
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

/**
 * Open flags for the append-only write. A write access mode is required:
 * `O_APPEND | O_NOFOLLOW` alone opens read-only and the write fails with
 * `EBADF`. `O_NOFOLLOW` refuses a symlink swapped in at the final component,
 * and `O_NONBLOCK` makes a FIFO swapped in fail fast (`ENXIO`) instead of
 * hanging; it has no effect on regular-file writes.
 */
export const AGENTS_MD_APPEND_FLAGS =
  constants.O_WRONLY |
  constants.O_APPEND |
  constants.O_NOFOLLOW |
  constants.O_NONBLOCK;

const HARD_LINK_REFUSAL =
  'the file has more than one hard link, so an append could change another path';

type AppendOutcome =
  | { kind: 'appended' }
  /** Zero bytes written; fall back to the manual patch with this cause. */
  | { kind: 'refused'; cause: string }
  | { kind: 'blocked'; reason: string };

function describeErrorCode(error: unknown): string {
  switch (errorCode(error)) {
    case 'EACCES':
    case 'EPERM':
      return 'permission denied';
    case 'EROFS':
      return 'read-only file system';
    case 'ENOSPC':
      return 'no space left on device';
    case 'EDQUOT':
      return 'disk quota exceeded';
    case undefined:
      return 'unexpected error';
    default:
      return `error ${errorCode(error)}`;
  }
}

const IDENTITY_CHANGED =
  'Repository or AGENTS.md identity changed during planning.';

/**
 * Appends absent managed blocks to an existing, already-approved target.
 *
 * The opened handle's device/inode must equal the planned target identity, so
 * a target swapped in after planning (for example a hard link to a file
 * outside the repository renamed over AGENTS.md) is refused with zero bytes
 * written. A handle with more than one hard link is refused the same way, and
 * a non-regular file is blocked. The payload always starts with one newline,
 * so the first marker starts its own line however the file (or a concurrent
 * writer) ended, and `O_APPEND` places it after every byte already there.
 */
async function appendAbsentSections(
  plan: AgentsMdPlan,
  blocks: readonly string[],
  fileSystem: AgentsMdFileSystem,
): Promise<AppendOutcome> {
  let handle: Awaited<ReturnType<typeof open>>;
  try {
    handle = await fileSystem.open(plan.targetPath, AGENTS_MD_APPEND_FLAGS);
  } catch (error) {
    const code = errorCode(error);
    // The planned path was a regular file; any of these means something else
    // now sits at it (a symlink, a directory, or nothing), so it is an
    // identity change, not a write refusal. EMLINK is the BSD O_NOFOLLOW
    // error for a symlink.
    if (
      code === 'ELOOP' ||
      code === 'EMLINK' ||
      code === 'ENOENT' ||
      code === 'EISDIR' ||
      code === 'ENOTDIR'
    ) {
      return { kind: 'blocked', reason: IDENTITY_CHANGED };
    }
    if (code === 'ENXIO') {
      return {
        kind: 'blocked',
        reason: 'AGENTS.md append target is not a regular file.',
      };
    }
    return { kind: 'refused', cause: describeErrorCode(error) };
  }

  let outcome: AppendOutcome;
  let offset = 0;
  const payload = Buffer.from(`\n${blocks.join('\n\n')}\n`, 'utf8');
  try {
    const opened = await handle.stat();
    if (!opened.isFile()) {
      outcome = {
        kind: 'blocked',
        reason: 'AGENTS.md append target is not a regular file.',
      };
    } else if (!hasIdentity(opened, plan.targetIdentity)) {
      outcome = { kind: 'blocked', reason: IDENTITY_CHANGED };
    } else if (Number(opened.nlink) !== 1) {
      outcome = { kind: 'refused', cause: HARD_LINK_REFUSAL };
    } else {
      while (offset < payload.length) {
        const { bytesWritten } = await handle.write(
          payload,
          offset,
          payload.length - offset,
        );
        if (bytesWritten <= 0) {
          throw Object.assign(new Error('Append wrote no bytes.'), {
            code: 'EIO',
          });
        }
        offset += bytesWritten;
      }
      outcome = { kind: 'appended' };
    }
  } catch (error) {
    outcome =
      offset === 0
        ? { kind: 'refused', cause: describeErrorCode(error) }
        : {
            kind: 'blocked',
            reason: `AGENTS.md append stopped after writing part of the managed block (${describeErrorCode(error)}); the file may now end with a partial OAT block. Remove the partial block by hand, then rerun.`,
          };
  }
  try {
    await handle.close();
  } catch {
    // Every byte is already written (or the outcome is already a refusal); a
    // close error does not change what the file contains.
  }
  return outcome;
}

interface SectionClassification {
  results: Record<string, UpsertSectionResult>;
  absentBlocks: string[];
}

/** Read-only ownership/conflict classification shared by preview and mutation. */
function classifySections(
  plan: AgentsMdPlan,
  desired: readonly { key: string; block: string }[],
  content: string,
  removeSectionKeys: readonly string[],
  appendRefusal?: string,
): SectionClassification {
  if (plan.kind === 'missing') {
    return {
      results: Object.fromEntries(
        desired.map(({ key }) => [key, { action: 'created' }]),
      ),
      absentBlocks: [],
    };
  }

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
  const changed = managed.filter(
    ({ block, range }) =>
      !range || content.slice(range.start, range.end) !== block,
  );
  if (changed.length === 0 && legacy.length === 0) {
    return {
      results: Object.fromEntries(
        desired.map(({ key }) => [key, { action: 'no-change' }]),
      ),
      absentBlocks: [],
    };
  }

  // Appending cannot remove a legacy block, so any legacy block keeps the
  // whole request on the zero-write manual patch.
  if (legacy.length > 0) {
    const manualPatch = createManualPatch(
      plan,
      (changed.length > 0 ? changed : desired).map(({ block }) => block),
      legacy.map(({ key }) => key),
    );
    return {
      results: Object.fromEntries(
        managed.map(({ key }) => [
          key,
          { action: 'manual-required', manualPatch },
        ]),
      ),
      absentBlocks: [],
    };
  }

  const absent = managed.filter(({ range }) => !range);
  const different = managed.filter(
    ({ block, range }) =>
      range !== undefined && content.slice(range.start, range.end) !== block,
  );
  const refusal =
    appendRefusal ??
    (absent.length > 0 && plan.targetLinkCount !== 1
      ? HARD_LINK_REFUSAL
      : undefined);
  if (refusal !== undefined) {
    const manualPatch = createManualPatch(
      plan,
      changed.map(({ block }) => block),
      [],
      refusal,
    );
    return {
      results: Object.fromEntries(
        managed.map(({ key, range }) => [
          key,
          range && !different.some((entry) => entry.key === key)
            ? { action: 'no-change' }
            : { action: 'manual-required', manualPatch },
        ]),
      ),
      absentBlocks: [],
    };
  }
  const differentPatch =
    different.length > 0
      ? createManualPatch(
          plan,
          different.map(({ block }) => block),
          [],
        )
      : undefined;
  return {
    results: Object.fromEntries(
      managed.map(({ key, range }) => {
        if (!range) return [key, { action: 'appended' }];
        if (differentPatch && different.some((entry) => entry.key === key)) {
          return [
            key,
            { action: 'manual-required', manualPatch: differentPatch },
          ];
        }
        return [key, { action: 'no-change' }];
      }),
    ),
    absentBlocks: absent.map(({ block }) => block),
  };
}

interface InspectedSections {
  content: string;
  desired: { key: string; block: string }[];
  classification: SectionClassification;
}

/** Inspect current bytes and identity without opening a write handle. */
async function inspectSections(
  plan: AgentsMdPlan,
  sections: readonly AgentsMdSectionInput[],
  removeSectionKeys: readonly string[],
  fileSystem: AgentsMdFileSystem,
): Promise<InspectedSections> {
  const desired = sections.map(({ key, body }) => ({
    key,
    block: buildSection(key, body),
  }));
  const content =
    plan.kind === 'missing'
      ? ''
      : await fileSystem.readFile(plan.targetPath, 'utf8');
  const classification = classifySections(
    plan,
    desired,
    content,
    removeSectionKeys,
  );
  await assertPlanUnchanged(
    plan,
    fileSystem,
    plan.kind === 'missing' ? undefined : content,
  );
  return { content, desired, classification };
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

  try {
    const { desired, content, classification } = await inspectSections(
      plan,
      sections,
      removeSectionKeys,
      fileSystem,
    );
    if (plan.kind === 'missing') {
      const creation = await createMissingFile(
        plan,
        `${desired.map(({ block }) => block).join('\n\n')}\n`,
        fileSystem,
      );
      if (creation === 'created') return classification.results;
      if (creation === 'appeared' && allowReplan) {
        return upsertSectionsInternal(
          repoRoot,
          sections,
          removeSectionKeys,
          fileSystem,
          false,
        );
      }
      throw new Error(IDENTITY_CHANGED);
    }
    if (classification.absentBlocks.length > 0) {
      const appended = await appendAbsentSections(
        plan,
        classification.absentBlocks,
        fileSystem,
      );
      if (appended.kind === 'blocked') throw new Error(appended.reason);
      if (appended.kind === 'refused') {
        return classifySections(
          plan,
          desired,
          content,
          removeSectionKeys,
          appended.cause,
        ).results;
      }
    }
    return classification.results;
  } catch (error) {
    const blocked = blockedResult(error, targetIdentifier(plan));
    return Object.fromEntries(sections.map(({ key }) => [key, blocked]));
  }
}

/**
 * Predict managed guidance actions from current bytes without writing. This
 * advisory result does not establish write permission or guarantee a later
 * upsert; mutation independently rechecks path identity and opened handles.
 */
export async function previewAgentsMdSections(
  repoRoot: string,
  sections: readonly AgentsMdSectionInput[],
  options: Pick<AgentsMdMutationOptions, 'fileSystem'> = {},
): Promise<Record<string, UpsertSectionResult>> {
  if (sections.length === 0) return {};
  return previewSectionsInternal(
    repoRoot,
    sections,
    [],
    options.fileSystem ?? defaultFileSystem,
  );
}

async function previewSectionsInternal(
  repoRoot: string,
  sections: readonly AgentsMdSectionInput[],
  removeSectionKeys: readonly string[],
  fileSystem: AgentsMdFileSystem,
): Promise<Record<string, UpsertSectionResult>> {
  let plan: AgentsMdPlan | undefined;
  try {
    plan = await planAgentsMd(repoRoot, fileSystem);
    return (
      await inspectSections(plan, sections, removeSectionKeys, fileSystem)
    ).classification.results;
  } catch (error) {
    const blocked = blockedResult(
      error,
      plan ? targetIdentifier(plan) : 'AGENTS.md',
    );
    return Object.fromEntries(sections.map(({ key }) => [key, blocked]));
  }
}

export async function previewAgentsMdSection(
  repoRoot: string,
  key: string,
  body: string,
  options: AgentsMdMutationOptions = {},
): Promise<UpsertSectionResult> {
  const results = await previewSectionsInternal(
    repoRoot,
    [{ key, body }],
    options.removeSectionKeys ?? [],
    options.fileSystem ?? defaultFileSystem,
  );
  return results[key] ?? blockedResult(new Error('AGENTS.md guidance failed.'));
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
