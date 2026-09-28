import {
  lstat,
  readdir,
  readFile,
  readlink,
  realpath,
  stat,
} from 'node:fs/promises';
import { basename, dirname, join, posix, relative, resolve } from 'node:path';

import {
  DEFAULT_INSTRUCTION_SYNC_STRATEGY,
  readOatConfig,
  resolveDocumentationContentRoot,
} from '@config/oat-config';

import type {
  ClaudeMdBlocksShimRemovalWarning,
  ClaudeMdHidesAgentsMdWarning,
  InstructionSyncStrategy,
  InstructionActionRecord,
  InstructionEntry,
  InstructionsJsonPayload,
  InstructionsMode,
  InstructionPointerExclusions,
  InstructionsScanOptions,
  InstructionsScanDependencies,
  InstructionsStatus,
  InstructionsSummary,
  InstructionsWarning,
  InstructionStatus,
  ManagedShimRecord,
} from './instructions.types';

export const EXPECTED_CLAUDE_CONTENT = '@AGENTS.md\n';
export { DEFAULT_INSTRUCTION_SYNC_STRATEGY };

const ROOT_EXCLUDED_DIRECTORIES = new Set(['.git', '.oat', '.worktrees']);
const GLOBAL_EXCLUDED_DIRECTORIES = new Set(['node_modules']);

// The only excluded-subtree re-entry points: a root-level directory is excluded
// wholesale, but a named subdirectory holds tracked instruction files that
// sync/validate must manage, so it is carved back into the scan. `.oat` is
// excluded at the repo root, yet `.oat/repo/**` carries AGENTS.md/CLAUDE.md
// pairs; `.oat/templates`, `.oat/projects`, and `.oat/sync` stay unscanned.
const ROOT_EXCLUDED_DIRECTORY_CARVE_INS = new Map<string, string>([
  ['.oat', 'repo'],
]);

interface BuildInstructionsPayloadArgs {
  mode: InstructionsMode;
  strategy: InstructionSyncStrategy;
  warnings?: InstructionsWarning[];
  entries: InstructionEntry[];
  actions: InstructionActionRecord[];
  excludedPaths?: string[];
  effectiveExcludedPaths?: string[];
  exclusionWarnings?: string[];
}

interface InstructionDirectoryEntry {
  agentsPath?: string;
  brokenAgentsPath?: string;
  brokenAgentsErrorCode?: string;
  brokenClaudePath?: string;
  brokenClaudeErrorCode?: string;
  claudePath?: string;
}

async function directoryExists(
  dependencies: InstructionsScanDependencies,
  directoryPath: string,
): Promise<boolean> {
  try {
    const stats = await dependencies.stat(directoryPath);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

function getErrorCode(error: unknown): string | null {
  return error && typeof error === 'object' && 'code' in error
    ? String(error.code)
    : null;
}

function normalizeLineEndings(content: string): string {
  return content.replaceAll('\r\n', '\n');
}

function readFileBytesDefault(path: string): Promise<Buffer> {
  return readFile(path);
}

/**
 * The exact pointer files OAT writes: `@AGENTS.md` and a newline, with the
 * CRLF form a Windows checkout produces. Nothing else is a managed pointer --
 * not trailing whitespace, not a missing newline, not extra lines.
 */
const MANAGED_POINTER_BYTES = [
  Buffer.from(EXPECTED_CLAUDE_CONTENT, 'utf8'),
  Buffer.from('@AGENTS.md\r\n', 'utf8'),
];

/** The filesystem reads managed-shim classification needs. */
export interface ManagedShimInspectionDependencies {
  lstat: InstructionsScanDependencies['lstat'];
  readlink: InstructionsScanDependencies['readlink'];
  readFileBytes: InstructionsScanDependencies['readFileBytes'];
  realpath: InstructionsScanDependencies['realpath'];
}

export type ManagedShimInspection =
  | { kind: 'managed'; record: ManagedShimRecord }
  | { kind: 'absent' }
  | { kind: 'unmanaged'; detail: string }
  | { kind: 'unreadable'; detail: string };

/**
 * Classify one CLAUDE.md against the exact shapes OAT writes, beside its
 * sibling AGENTS.md. This is the single definition of "OAT-managed" that both
 * planning (the scan) and apply-time re-verification use, so the two can never
 * disagree about what may be deleted.
 *
 * Anything that is not provably one of the three shapes is `unmanaged`, which
 * is never deleted: a CLAUDE.md not named exactly `CLAUDE.md`, one inside a
 * `.claude` directory, a symlink whose target is not the sibling AGENTS.md,
 * and any regular file whose bytes are not exactly a pointer or an exact copy.
 */
export async function inspectManagedShim(
  claudePath: string,
  agentsPath: string,
  dependencies: ManagedShimInspectionDependencies,
): Promise<ManagedShimInspection> {
  const directoryPath = dirname(claudePath);
  if (
    basename(claudePath) !== 'CLAUDE.md' ||
    basename(directoryPath) === '.claude' ||
    agentsPath !== join(directoryPath, 'AGENTS.md')
  ) {
    return {
      kind: 'unmanaged',
      detail: 'not a CLAUDE.md beside its AGENTS.md; kept',
    };
  }

  let claudeStats: Awaited<
    ReturnType<ManagedShimInspectionDependencies['lstat']>
  >;
  try {
    claudeStats = await dependencies.lstat(claudePath);
  } catch (error) {
    const errorCode = getErrorCode(error);
    return errorCode === 'ENOENT'
      ? { kind: 'absent' }
      : {
          kind: 'unreadable',
          detail: `unable to read CLAUDE.md (${errorCode ?? 'unknown error'})`,
        };
  }

  const identity = { dev: claudeStats.dev, ino: claudeStats.ino };

  if (claudeStats.isSymbolicLink()) {
    let linkTarget: string;
    try {
      linkTarget = await dependencies.readlink(claudePath);
    } catch (error) {
      return {
        kind: 'unreadable',
        detail: `unable to read CLAUDE.md symlink target (${getErrorCode(error) ?? 'unknown error'})`,
      };
    }
    // Lexical, not realpath: only a link that names the sibling AGENTS.md is
    // the shape OAT writes. A link that merely resolves to the same file
    // through another path was made by someone else.
    if (resolve(directoryPath, linkTarget) !== agentsPath) {
      return {
        kind: 'unmanaged',
        detail: `CLAUDE.md symlink targets ${JSON.stringify(linkTarget)}, not the sibling AGENTS.md; kept`,
      };
    }
    return {
      kind: 'managed',
      record: { shape: 'symlink', ...identity, linkTarget },
    };
  }

  if (!claudeStats.isFile()) {
    return {
      kind: 'unmanaged',
      detail: 'CLAUDE.md is not a regular file or symlink; kept',
    };
  }

  // A regular CLAUDE.md that the sibling AGENTS.md resolves to -- the
  // Claude-first `ln -s CLAUDE.md AGENTS.md` layout, or a hard link -- holds
  // the only copy of the instructions. Comparing the two would compare the
  // file with itself, so it is never a managed shape of any kind.
  let agentsStats: Awaited<
    ReturnType<ManagedShimInspectionDependencies['lstat']>
  >;
  try {
    agentsStats = await dependencies.lstat(agentsPath);
  } catch (error) {
    return {
      kind: 'unreadable',
      detail: `unable to read AGENTS.md (${getErrorCode(error) ?? 'unknown error'})`,
    };
  }
  let agentsResolvesToClaude =
    agentsStats.dev === claudeStats.dev && agentsStats.ino === claudeStats.ino;
  if (agentsStats.isSymbolicLink()) {
    try {
      const [realAgents, realClaude] = await Promise.all([
        dependencies.realpath(agentsPath),
        dependencies.realpath(claudePath),
      ]);
      agentsResolvesToClaude = realAgents === realClaude;
    } catch (error) {
      return {
        kind: 'unreadable',
        detail: `unable to resolve AGENTS.md (${getErrorCode(error) ?? 'unknown error'})`,
      };
    }
  }
  if (agentsResolvesToClaude) {
    return {
      kind: 'unmanaged',
      detail:
        'AGENTS.md resolves to this CLAUDE.md, so CLAUDE.md holds the instructions ' +
        '(replace the AGENTS.md link with its content before removing CLAUDE.md); kept',
    };
  }

  let claudeBytes: Buffer;
  try {
    claudeBytes = await dependencies.readFileBytes(claudePath);
  } catch (error) {
    return {
      kind: 'unreadable',
      detail: `unable to read CLAUDE.md (${getErrorCode(error) ?? 'unknown error'})`,
    };
  }

  if (MANAGED_POINTER_BYTES.some((pointer) => pointer.equals(claudeBytes))) {
    return { kind: 'managed', record: { shape: 'pointer', ...identity } };
  }

  // The copy shape is only ever judged against a distinct regular AGENTS.md:
  // identical bytes behind a symlink prove nothing about who wrote CLAUDE.md.
  if (!agentsStats.isFile()) {
    return {
      kind: 'unmanaged',
      detail:
        'AGENTS.md is not a regular file, so CLAUDE.md is not a managed copy; kept',
    };
  }

  let agentsBytes: Buffer;
  try {
    agentsBytes = await dependencies.readFileBytes(agentsPath);
  } catch (error) {
    return {
      kind: 'unreadable',
      detail: `unable to read AGENTS.md (${getErrorCode(error) ?? 'unknown error'})`,
    };
  }

  if (agentsBytes.equals(claudeBytes)) {
    return { kind: 'managed', record: { shape: 'copy', ...identity } };
  }

  return {
    kind: 'unmanaged',
    detail: 'hand-written or modified CLAUDE.md; kept',
  };
}

/** The filesystem reads link-chain resolution needs. */
export interface LinkResolutionDependencies {
  lstat: InstructionsScanDependencies['lstat'];
  readlink: InstructionsScanDependencies['readlink'];
  realpath: InstructionsScanDependencies['realpath'];
}

/**
 * The path of a directory entry itself, with its parent directories resolved
 * but the entry not followed, so a link and the file it names compare by the
 * node they occupy rather than by spelling.
 */
async function canonicalNodePath(
  path: string,
  dependencies: LinkResolutionDependencies,
): Promise<string | null> {
  try {
    return join(await dependencies.realpath(dirname(path)), basename(path));
  } catch {
    return null;
  }
}

const MAX_LINK_HOPS = 40;

/**
 * The candidates whose symlink chain passes through `targetPath`: removing
 * `targetPath` would leave each of them dangling. Every hop is followed, so a
 * link to a link to the target counts, and a link to the target that is
 * itself a symlink counts too. Regular files and hard links never dangle, so
 * they are never reported.
 */
export async function findLinksThrough(
  targetPath: string,
  candidates: readonly string[],
  dependencies: LinkResolutionDependencies,
): Promise<string[]> {
  const targetNode = await canonicalNodePath(targetPath, dependencies);
  if (targetNode === null) {
    return [];
  }

  const linkers: string[] = [];
  for (const candidate of new Set(candidates)) {
    if (
      candidate === targetPath ||
      (await canonicalNodePath(candidate, dependencies)) === targetNode
    ) {
      continue;
    }
    let current = candidate;
    for (let hop = 0; hop < MAX_LINK_HOPS; hop += 1) {
      let stats: Awaited<ReturnType<LinkResolutionDependencies['lstat']>>;
      try {
        stats = await dependencies.lstat(current);
      } catch {
        break;
      }
      if (!stats.isSymbolicLink()) {
        break;
      }
      let linkTarget: string;
      try {
        linkTarget = await dependencies.readlink(current);
      } catch {
        break;
      }
      const next = resolve(dirname(current), linkTarget);
      if ((await canonicalNodePath(next, dependencies)) === targetNode) {
        linkers.push(candidate);
        break;
      }
      current = next;
    }
  }
  return linkers.sort((left, right) => left.localeCompare(right));
}

/** `a` / `a and b` / `a, b, and c`, repository-relative. */
function describeLinkers(repoRoot: string, linkers: readonly string[]): string {
  const paths = linkers.map((path) => toPosixPath(relative(repoRoot, path)));
  if (paths.length <= 2) {
    return paths.join(' and ');
  }
  return `${paths.slice(0, -1).join(', ')}, and ${paths.at(-1)}`;
}

/**
 * Re-verify, immediately before deletion, that a CLAUDE.md planned for removal
 * is still the exact managed shim the scan recorded: same `lstat` identity
 * (device and inode, so a replaced file is caught even with identical bytes),
 * same shape, same symlink target, and still an exact managed shape now.
 *
 * Returns null when removal may proceed, or the reason it must not.
 */
export async function verifyManagedShimUnchanged(
  claudePath: string,
  agentsPath: string,
  planned: ManagedShimRecord,
  dependencies: ManagedShimInspectionDependencies,
): Promise<string | null> {
  const current = await inspectManagedShim(
    claudePath,
    agentsPath,
    dependencies,
  );
  if (current.kind === 'absent') {
    return 'CLAUDE.md no longer exists';
  }
  if (current.kind !== 'managed') {
    return current.detail.replace(/; kept$/, '');
  }
  if (
    current.record.dev !== planned.dev ||
    current.record.ino !== planned.ino
  ) {
    return 'CLAUDE.md was replaced by a different file';
  }
  if (current.record.shape !== planned.shape) {
    return `CLAUDE.md changed from a ${planned.shape} shim to a ${current.record.shape} shim`;
  }
  if (current.record.linkTarget !== planned.linkTarget) {
    return 'CLAUDE.md symlink target changed';
  }
  return null;
}

function describeManagedShim(record: ManagedShimRecord): string {
  switch (record.shape) {
    case 'symlink':
      return 'OAT-managed CLAUDE.md symlink';
    case 'copy':
      return 'OAT-managed CLAUDE.md hard copy';
    default:
      return 'OAT-managed CLAUDE.md pointer file';
  }
}

/**
 * Classify one scanned directory under strategy `none`, where no CLAUDE.md is
 * wanted: an absent CLAUDE.md is correct, an exact managed shim is drift that
 * sync removes, and anything else is kept and reported, never deleted.
 */
async function classifyWithoutShims(
  directoryPath: string,
  directoryEntry: InstructionDirectoryEntry,
  dependencies: InstructionsScanDependencies,
): Promise<InstructionEntry> {
  const agentsPath = directoryEntry.agentsPath ?? null;
  const claudePath =
    directoryEntry.claudePath ?? join(directoryPath, 'CLAUDE.md');
  const hasClaude =
    directoryEntry.claudePath !== undefined ||
    directoryEntry.brokenClaudePath !== undefined;

  const entry = (
    status: InstructionStatus,
    detail: string,
  ): InstructionEntry => ({ agentsPath, claudePath, status, detail });

  // `.claude/CLAUDE.md` is Claude Code's alternate project instruction file,
  // not a shim for an AGENTS.md in `.claude`, so it is never adopted or removed.
  if (basename(directoryPath) === '.claude' && hasClaude) {
    return entry(
      'unmanaged',
      '.claude/CLAUDE.md is not managed by instruction sync; kept',
    );
  }

  if (directoryEntry.brokenClaudePath) {
    const errorCode = directoryEntry.brokenClaudeErrorCode ?? 'unknown error';
    return entry(
      'unmanaged',
      errorCode === 'ENOENT'
        ? 'broken CLAUDE.md symlink; kept'
        : `unreadable CLAUDE.md symlink target (${errorCode}); kept`,
    );
  }

  if (!agentsPath) {
    try {
      await dependencies.readFile(claudePath, 'utf8');
    } catch (error) {
      return entry(
        'content_mismatch',
        `unable to read CLAUDE.md (${getErrorCode(error) ?? 'unknown'})`,
      );
    }
    return entry('stray', 'CLAUDE.md found without AGENTS.md');
  }

  if (!hasClaude) {
    return entry('ok', 'no CLAUDE.md');
  }

  const inspection = await inspectManagedShim(
    claudePath,
    agentsPath,
    dependencies,
  );
  switch (inspection.kind) {
    case 'absent':
      return entry('ok', 'no CLAUDE.md');
    case 'unreadable':
      return entry('content_mismatch', inspection.detail);
    case 'unmanaged':
      return entry('unmanaged', inspection.detail);
    case 'managed':
      return {
        ...entry(
          'managed_shim',
          `${describeManagedShim(inspection.record)}; sync removes it under strategy none`,
        ),
        managedShim: inspection.record,
      };
  }
}

/**
 * The effective strategy for one run: the `--strategy` flag, then the
 * repository's `instructions.claude.shims`, then the built-in
 * default. The flag only ever overrides a single run; it never rewrites config.
 */
export function resolveInstructionSyncStrategy(
  flagStrategy?: InstructionSyncStrategy,
  configuredStrategy?: InstructionSyncStrategy,
): InstructionSyncStrategy {
  return (
    flagStrategy ?? configuredStrategy ?? DEFAULT_INSTRUCTION_SYNC_STRATEGY
  );
}

/**
 * Read `instructions.claude.shims` from the shared config. A
 * malformed value fails closed in the config normalizer rather than reading as
 * unset, so a typo can never silently select the built-in default.
 */
export async function readConfiguredInstructionSyncStrategy(
  repoRoot: string,
): Promise<InstructionSyncStrategy | undefined> {
  const config = await readOatConfig(repoRoot);
  return config.instructions?.claude?.shims;
}

function getValidInstructionDetail(strategy: InstructionSyncStrategy): string {
  switch (strategy) {
    case 'none':
      return 'no CLAUDE.md';
    case 'symlink':
      return 'symlink valid';
    case 'copy':
      return 'copy valid';
    default:
      return 'pointer valid';
  }
}

function getInvalidInstructionDetail(
  strategy: InstructionSyncStrategy,
): string {
  switch (strategy) {
    case 'none':
      return 'expected no CLAUDE.md';
    case 'symlink':
      return 'expected symlink to AGENTS.md';
    case 'copy':
      return 'expected hard copy of AGENTS.md content';
    default:
      return `expected ${JSON.stringify(EXPECTED_CLAUDE_CONTENT)}`;
  }
}

function toPosixPath(pathValue: string): string {
  return pathValue.replaceAll('\\', '/');
}

function normalizeEntries(entries: InstructionEntry[]): InstructionEntry[] {
  return [...entries].sort((left, right) => {
    const leftSortPath = left.agentsPath ?? left.claudePath;
    const rightSortPath = right.agentsPath ?? right.claudePath;
    return (
      leftSortPath.localeCompare(rightSortPath) ||
      left.claudePath.localeCompare(right.claudePath) ||
      left.status.localeCompare(right.status) ||
      left.detail.localeCompare(right.detail)
    );
  });
}

function normalizeActions(
  actions: InstructionActionRecord[],
): InstructionActionRecord[] {
  return [...actions].sort((left, right) => {
    return (
      left.target.localeCompare(right.target) ||
      left.type.localeCompare(right.type) ||
      left.result.localeCompare(right.result) ||
      left.reason.localeCompare(right.reason)
    );
  });
}

function recordInstructionFile(
  directoryEntries: Map<string, InstructionDirectoryEntry>,
  directoryPath: string,
  entryName: 'AGENTS.md' | 'CLAUDE.md',
  entryPath: string,
): void {
  const current = directoryEntries.get(directoryPath) ?? {};
  if (entryName === 'AGENTS.md') {
    current.agentsPath = entryPath;
    current.brokenAgentsPath = undefined;
    current.brokenAgentsErrorCode = undefined;
  } else {
    current.claudePath = entryPath;
    current.brokenClaudePath = undefined;
    current.brokenClaudeErrorCode = undefined;
  }
  directoryEntries.set(directoryPath, current);
}

/**
 * Canonicalize repo-relative exclusion entries into the exact form the scan
 * compares against: POSIX separators, collapsed `.` and `..` segments and
 * duplicate slashes, no trailing slash, de-duplicated, order-preserving.
 *
 * Full normalization is what makes the comparison trustworthy. The scan tests
 * an exclusion against `relative(repoRoot, entryPath)`, which is always
 * already-normalized, so an un-normalized entry like `apps/./docs` or
 * `apps//docs` would silently never match and quietly fail open.
 *
 * Two classes of entry are dropped rather than normalized:
 *
 * - anything resolving to the repository root (`.`, `` , `./`), because
 *   excluding the root would silence the entire scan — including the
 *   `.oat/repo` carve-in — from one stray config value; and
 * - absolute paths and entries escaping the repository (`..`, `../x`), which
 *   can never name a directory inside the tree being scanned. Dropping them
 *   keeps a malformed value from masquerading as a matchable exclusion.
 */
export function normalizeExcludedPaths(
  excludedPaths: readonly string[] = [],
): string[] {
  const normalized: string[] = [];

  for (const candidate of excludedPaths) {
    const trimmed = toPosixPath(candidate.trim());
    if (!trimmed || posix.isAbsolute(trimmed)) {
      continue;
    }

    const posixPath = posix.normalize(trimmed).replace(/\/+$/, '');
    if (
      !posixPath ||
      posixPath === '.' ||
      posixPath === '..' ||
      posixPath.startsWith('../')
    ) {
      continue;
    }

    if (!normalized.includes(posixPath)) {
      normalized.push(posixPath);
    }
  }

  return normalized;
}

/**
 * Paths the carve-in queues directly, which therefore never reach the exclusion
 * predicate and can never be excluded however the config asks. An opt-out
 * naming one of these is inert and must be reported as such rather than
 * silently listed as protection.
 *
 * Matched exactly, never by prefix: only the carve-in root itself bypasses the
 * predicate. Its *descendants* are reached by ordinary traversal out of the
 * queued directory, so `.oat/repo/pjm` is excludable even though `.oat/repo`
 * is not, and treating it as inert would be a false warning about an exclusion
 * that really does protect its tree.
 */
const UNEXCLUDABLE_PATHS = new Set(
  [...ROOT_EXCLUDED_DIRECTORY_CARVE_INS].map(
    ([directory, carveIn]) => `${directory}/${carveIn}`,
  ),
);

/**
 * How a configured exclusion path resolves on disk.
 *
 * The scan compares directories against `relative(repoRoot, ...)`, which always
 * yields the true on-disk path, so an entry is only effective when it resolves
 * to itself. That test is unchanged. What is split out here is *why* it failed:
 * "there is nothing there" and "there is something there, but it is really
 * somewhere else" are different operator problems, and only the second has a
 * target worth naming.
 */
type ExclusionDirectoryProbe =
  | { kind: 'exact' }
  | { kind: 'absent' }
  | { kind: 'resolved-elsewhere'; resolvedPath: string; caseOnly: boolean };

/**
 * Whether `relativePath` names a real directory whose on-disk spelling matches
 * exactly, and when it does not, where it actually leads.
 *
 * The case check is the point. On a case-insensitive filesystem (APFS, NTFS) a
 * plain existence test accepts `Apps/Docsapp/docs` for a directory really named
 * `apps/docsapp/docs`, but the scan compares against `relative(repoRoot, ...)`,
 * which always yields the true on-disk case. The exclusion would then be
 * reported as applied while matching nothing — issue #238 recurring silently on
 * the default developer platform. Resolving through `realpath` and comparing
 * the result to the requested spelling catches that, and reports a path that
 * does not exist at all as `absent`.
 *
 * `repoRoot` is realpath'd too, so a symlinked checkout (`/tmp` on macOS) does
 * not make every entry look like a mismatch.
 *
 * `caseOnly` is derived from the resolved path rather than from the platform: a
 * case-insensitive host is not the only way to land on a differing spelling,
 * and a platform check would attach the case-sensitivity hint to symlinks,
 * where it is false.
 */
async function probeExclusionDirectory(
  dependencies: InstructionsScanDependencies,
  repoRoot: string,
  relativePath: string,
): Promise<ExclusionDirectoryProbe> {
  try {
    const realRoot = await dependencies.realpath(repoRoot);
    const candidate = join(realRoot, relativePath);
    if (!(await directoryExists(dependencies, candidate))) {
      return { kind: 'absent' };
    }
    const realCandidate = await dependencies.realpath(candidate);
    const resolved = toPosixPath(relative(realRoot, realCandidate));
    if (resolved === relativePath) {
      return { kind: 'exact' };
    }
    // A target outside the repository reads as a plain absolute path; a `../`
    // chain relative to a root the operator never typed would be worse than no
    // target at all. An empty `resolved` means the entry landed on the
    // repository root itself, which is equally unhelpful as a relative path.
    const resolvedInsideRepository =
      resolved.length > 0 && resolved !== '..' && !resolved.startsWith('../');
    return {
      kind: 'resolved-elsewhere',
      resolvedPath: resolvedInsideRepository
        ? resolved
        : toPosixPath(realCandidate),
      caseOnly: resolved.toLowerCase() === relativePath.toLowerCase(),
    };
  } catch {
    return { kind: 'absent' };
  }
}

/**
 * The directories `oat instructions sync` and `oat instructions validate` skip:
 * the derived documentation content root first, then the explicit
 * `instructions.claude.excludes` opt-outs.
 *
 * Both commands resolve exclusions through this one function. That is the
 * property that matters: if they computed exclusions separately, validate
 * could report drift in a directory sync refuses to touch, and the repository
 * would have no clean state to reach.
 *
 * Every configured entry is classified rather than trusted. An entry that is
 * dropped during normalization, names an unexcludable carve-in root, or does
 * not resolve to a real case-exact directory is reported as a warning and kept
 * out of `effective`, so no caller can mistake a typo for protection.
 *
 * `effective` answers "is this tree protected from pointer writes?", not "did
 * the exclusion predicate fire for it". An entry that names an already-skipped
 * built-in root (`.git`, `node_modules`) or sits beneath another exclusion is
 * still effective, because the operator's intent holds; warning about those
 * would be a false alarm about exclusions that do work.
 *
 * Nothing here deletes or rewrites an existing pointer. Excluding a directory
 * only stops it being reported and written; a `CLAUDE.md` already inside an
 * excluded tree is left exactly as it is.
 */
export async function resolveInstructionPointerExcludes(
  repoRoot: string,
  overrides: Partial<InstructionsScanDependencies> = {},
): Promise<InstructionPointerExclusions> {
  const dependencies: InstructionsScanDependencies = {
    lstat,
    realpath,
    readdir,
    readFile,
    readFileBytes: readFileBytesDefault,
    readlink,
    stat,
    ...overrides,
  };

  const config = await readOatConfig(repoRoot);
  const contentRoot = await resolveDocumentationContentRoot(repoRoot, config, {
    // Probe through the injected `stat` so a simulated filesystem (tests) and
    // the real one agree on whether `<root>/docs` exists.
    dirExists: async (path) => {
      try {
        return (await dependencies.stat(path)).isDirectory();
      } catch {
        return false;
      }
    },
  });

  const requested: Array<{ raw: string; source: string }> = [
    ...(contentRoot === null
      ? []
      : [{ raw: contentRoot, source: 'documentation.root' }]),
    ...(config.instructions?.claude?.excludes ?? []).map((raw) => ({
      raw,
      source: 'instructions.claude.excludes',
    })),
  ];

  const configured: string[] = [];
  const effective: string[] = [];
  const warnings: string[] = [];

  for (const { raw, source } of requested) {
    const [normalizedPath] = normalizeExcludedPaths([raw]);

    if (!normalizedPath) {
      warnings.push(
        `Ignoring ${source} entry ${JSON.stringify(raw)}: exclusions must be repository-relative paths inside the repository.`,
      );
      continue;
    }

    if (configured.includes(normalizedPath)) {
      continue;
    }
    configured.push(normalizedPath);

    if (UNEXCLUDABLE_PATHS.has(normalizedPath)) {
      warnings.push(
        `${source} entry ${JSON.stringify(normalizedPath)} has no effect: ${normalizedPath} is always scanned.`,
      );
      continue;
    }

    const probe = await probeExclusionDirectory(
      dependencies,
      repoRoot,
      normalizedPath,
    );

    if (probe.kind === 'exact') {
      effective.push(normalizedPath);
      continue;
    }

    if (probe.kind === 'absent') {
      warnings.push(
        `${source} entry ${JSON.stringify(normalizedPath)} matches no directory in this repository (matching is case-sensitive), so it excludes nothing.`,
      );
      continue;
    }

    // Stated, not left implied by elimination, and without a catch-all
    // `default` that would silently absorb a future variant: this annotation
    // stops compiling the moment `ExclusionDirectoryProbe` grows a variant with
    // no branch above — including one that happens to carry the same fields and
    // would otherwise inherit a message written for a different situation.
    const resolvedElsewhere: Extract<
      ExclusionDirectoryProbe,
      { kind: 'resolved-elsewhere' }
    > = probe;

    warnings.push(
      resolvedElsewhere.caseOnly
        ? `${source} entry ${JSON.stringify(normalizedPath)} matches no directory in this repository (matching is case-sensitive; the directory on disk is ${JSON.stringify(resolvedElsewhere.resolvedPath)}), so it excludes nothing.`
        : `${source} entry ${JSON.stringify(normalizedPath)} resolves to ${JSON.stringify(resolvedElsewhere.resolvedPath)}, not to itself, so the scan never matches it and it excludes nothing. Point the entry at the resolved directory, or remove the symlink.`,
    );
  }

  return { configured, effective, warnings };
}

/**
 * A directory below the repository root that holds its own `.git` (a
 * directory, or the gitdir file of a submodule or linked worktree such as
 * `.claude/worktrees/<name>`) is a separate checkout. Its own
 * `oat instructions` run owns it: the parent never scans, rewrites, removes,
 * or warns about anything inside it.
 */
function isNestedCheckout(
  repoRoot: string,
  directoryPath: string,
  entries: ReadonlyArray<{ name: string }>,
): boolean {
  return (
    directoryPath !== repoRoot && entries.some((entry) => entry.name === '.git')
  );
}

async function scanInstructionDirectories(
  repoRoot: string,
  dependencies: InstructionsScanDependencies,
  debug?: (message: string) => void,
  excludedPaths: ReadonlySet<string> = new Set<string>(),
): Promise<Map<string, InstructionDirectoryEntry>> {
  const queue = [repoRoot];
  const directoryEntries = new Map<string, InstructionDirectoryEntry>();

  while (queue.length > 0) {
    const currentDirectory = queue.shift();
    if (!currentDirectory) {
      continue;
    }

    let entries: Awaited<ReturnType<InstructionsScanDependencies['readdir']>>;
    try {
      entries = await dependencies.readdir(currentDirectory, {
        withFileTypes: true,
      });
    } catch (error) {
      const errorCode = getErrorCode(error);
      debug?.(
        `Skipping directory scan for ${toPosixPath(currentDirectory)} (${errorCode ?? 'unknown error'})`,
      );
      continue;
    }

    if (isNestedCheckout(repoRoot, currentDirectory, entries)) {
      debug?.(
        `Skipping nested git checkout ${toPosixPath(relative(repoRoot, currentDirectory))}`,
      );
      continue;
    }

    for (const entry of entries) {
      const entryPath = join(currentDirectory, entry.name);
      const isRootLevel = currentDirectory === repoRoot;

      if (entry.isDirectory()) {
        if (GLOBAL_EXCLUDED_DIRECTORIES.has(entry.name)) {
          continue;
        }
        if (isRootLevel && ROOT_EXCLUDED_DIRECTORIES.has(entry.name)) {
          const carveIn = ROOT_EXCLUDED_DIRECTORY_CARVE_INS.get(entry.name);
          if (carveIn) {
            const carveInPath = join(entryPath, carveIn);
            if (await directoryExists(dependencies, carveInPath)) {
              queue.push(carveInPath);
            }
          }
          continue;
        }
        // Deliberately after the carve-in above, never before it: the carve-in
        // path is already queued by the time a configured exclusion is tested,
        // so excluding `.oat` (or any documentation root that happens to
        // contain one) still leaves `.oat/repo/**` scanned. Skipping the
        // directory here also skips its whole subtree, because a directory
        // that is never queued is never read.
        if (excludedPaths.size > 0) {
          const relativePath = toPosixPath(relative(repoRoot, entryPath));
          if (excludedPaths.has(relativePath)) {
            debug?.(`Skipping excluded directory ${relativePath}`);
            continue;
          }
        }
        queue.push(entryPath);
        continue;
      }

      if (entry.isFile()) {
        if (entry.name === 'AGENTS.md' || entry.name === 'CLAUDE.md') {
          recordInstructionFile(
            directoryEntries,
            currentDirectory,
            entry.name,
            entryPath,
          );
        }
        continue;
      }

      if (!entry.isSymbolicLink()) {
        continue;
      }

      let entryStats: Awaited<ReturnType<InstructionsScanDependencies['stat']>>;
      try {
        entryStats = await dependencies.stat(entryPath);
      } catch (error) {
        const errorCode = getErrorCode(error);
        if (entry.name === 'CLAUDE.md') {
          const current = directoryEntries.get(currentDirectory) ?? {};
          current.claudePath = entryPath;
          current.brokenClaudePath = entryPath;
          current.brokenClaudeErrorCode = errorCode ?? 'unknown error';
          directoryEntries.set(currentDirectory, current);
          continue;
        }
        if (entry.name === 'AGENTS.md') {
          const current = directoryEntries.get(currentDirectory) ?? {};
          current.brokenAgentsPath = entryPath;
          current.brokenAgentsErrorCode = errorCode ?? 'unknown error';
          directoryEntries.set(currentDirectory, current);
          continue;
        }
        debug?.(
          `Skipping symlink target stat for ${toPosixPath(entryPath)} (${errorCode ?? 'unknown error'})`,
        );
        continue;
      }

      if (entryStats.isDirectory()) {
        continue;
      }

      if (
        entryStats.isFile() &&
        (entry.name === 'AGENTS.md' || entry.name === 'CLAUDE.md')
      ) {
        recordInstructionFile(
          directoryEntries,
          currentDirectory,
          entry.name,
          entryPath,
        );
      }
    }
  }

  return directoryEntries;
}

export async function scanInstructionFiles(
  repoRoot: string,
  options: InstructionsScanOptions = {},
  overrides: Partial<InstructionsScanDependencies> = {},
): Promise<InstructionEntry[]> {
  const strategy = resolveInstructionSyncStrategy(options.strategy);
  const dependencies: InstructionsScanDependencies = {
    lstat,
    realpath,
    readdir,
    readFile,
    readFileBytes: readFileBytesDefault,
    readlink,
    stat,
    ...overrides,
  };

  const instructionDirectories = await scanInstructionDirectories(
    repoRoot,
    dependencies,
    options.debug,
    new Set(normalizeExcludedPaths(options.excludedPaths)),
  );
  const entries: InstructionEntry[] = [];

  for (const [directoryPath, directoryEntry] of instructionDirectories) {
    const agentsPath = directoryEntry.agentsPath ?? null;
    const brokenAgentsPath = directoryEntry.brokenAgentsPath ?? null;
    const brokenAgentsErrorCode =
      directoryEntry.brokenAgentsErrorCode ?? 'unknown error';

    if (strategy === 'none' && (agentsPath || !brokenAgentsPath)) {
      entries.push(
        await classifyWithoutShims(directoryPath, directoryEntry, dependencies),
      );
      continue;
    }
    const brokenClaudePath = directoryEntry.brokenClaudePath ?? null;
    const brokenClaudeErrorCode =
      directoryEntry.brokenClaudeErrorCode ?? 'unknown error';
    const claudePath =
      directoryEntry.claudePath ?? join(directoryPath, 'CLAUDE.md');

    if (!agentsPath && brokenAgentsPath) {
      entries.push({
        agentsPath: brokenAgentsPath,
        claudePath,
        status: 'content_mismatch',
        detail:
          brokenAgentsErrorCode === 'ENOENT'
            ? 'broken AGENTS.md symlink'
            : `unreadable AGENTS.md symlink target (${brokenAgentsErrorCode})`,
      });
      continue;
    }

    if (brokenClaudePath) {
      entries.push({
        agentsPath,
        claudePath,
        status: 'content_mismatch',
        detail:
          brokenClaudeErrorCode === 'ENOENT'
            ? 'broken CLAUDE.md symlink'
            : `unreadable CLAUDE.md symlink target (${brokenClaudeErrorCode})`,
      });
      continue;
    }

    if (!agentsPath) {
      try {
        await dependencies.readFile(claudePath, 'utf8');
      } catch (error) {
        entries.push({
          agentsPath: null,
          claudePath,
          status: 'content_mismatch',
          detail: `unable to read CLAUDE.md (${getErrorCode(error) ?? 'unknown'})`,
        });
        continue;
      }
      entries.push({
        agentsPath: null,
        claudePath,
        status: 'stray',
        detail: 'CLAUDE.md found without AGENTS.md',
      });
      continue;
    }

    let claudeStats;
    try {
      claudeStats = await dependencies.lstat(claudePath);
    } catch (error) {
      const errorCode = getErrorCode(error);
      if (errorCode === 'ENOENT') {
        entries.push({
          agentsPath,
          claudePath,
          status: 'missing',
          detail: 'CLAUDE.md missing',
        });
      } else {
        entries.push({
          agentsPath,
          claudePath,
          status: 'content_mismatch',
          detail: `unable to read CLAUDE.md (${errorCode ?? 'unknown error'})`,
        });
      }
      continue;
    }

    if (strategy === 'symlink') {
      if (!claudeStats.isSymbolicLink()) {
        entries.push({
          agentsPath,
          claudePath,
          status: 'content_mismatch',
          detail: getInvalidInstructionDetail(strategy),
        });
        continue;
      }

      let claudeTarget: string;
      try {
        claudeTarget = await dependencies.readlink(claudePath);
      } catch (error) {
        const errorCode = getErrorCode(error);
        entries.push({
          agentsPath,
          claudePath,
          status: 'content_mismatch',
          detail: `unable to read CLAUDE.md symlink target (${errorCode ?? 'unknown error'})`,
        });
        continue;
      }

      const resolvedTarget = resolve(dirname(claudePath), claudeTarget);
      const [canonicalTarget, canonicalAgentsPath] = await Promise.all([
        dependencies.realpath(resolvedTarget).catch(() => resolvedTarget),
        dependencies.realpath(agentsPath).catch(() => agentsPath),
      ]);

      if (canonicalTarget === canonicalAgentsPath) {
        entries.push({
          agentsPath,
          claudePath,
          status: 'ok',
          detail: getValidInstructionDetail(strategy),
        });
      } else {
        entries.push({
          agentsPath,
          claudePath,
          status: 'content_mismatch',
          detail: getInvalidInstructionDetail(strategy),
        });
      }
      continue;
    }

    if (claudeStats.isSymbolicLink()) {
      entries.push({
        agentsPath,
        claudePath,
        status: 'content_mismatch',
        detail: getInvalidInstructionDetail(strategy),
      });
      continue;
    }

    let claudeContent: string;
    try {
      claudeContent = await dependencies.readFile(claudePath, 'utf8');
    } catch (error) {
      const errorCode = getErrorCode(error);
      if (errorCode === 'ENOENT') {
        entries.push({
          agentsPath,
          claudePath,
          status: 'missing',
          detail: 'CLAUDE.md missing',
        });
      } else {
        entries.push({
          agentsPath,
          claudePath,
          status: 'content_mismatch',
          detail: `unable to read CLAUDE.md (${errorCode ?? 'unknown error'})`,
        });
      }
      continue;
    }

    const expectedContent =
      strategy === 'copy'
        ? await (async () => {
            try {
              return await dependencies.readFile(agentsPath, 'utf8');
            } catch (error) {
              const errorCode = getErrorCode(error);
              entries.push({
                agentsPath,
                claudePath,
                status: 'content_mismatch',
                detail: `unable to read AGENTS.md (${errorCode ?? 'unknown error'})`,
              });
              return null;
            }
          })()
        : EXPECTED_CLAUDE_CONTENT;

    if (expectedContent === null) {
      continue;
    }

    if (
      normalizeLineEndings(claudeContent) ===
      normalizeLineEndings(expectedContent)
    ) {
      entries.push({
        agentsPath,
        claudePath,
        status: 'ok',
        detail: getValidInstructionDetail(strategy),
      });
    } else {
      entries.push({
        agentsPath,
        claudePath,
        status: 'content_mismatch',
        detail: getInvalidInstructionDetail(strategy),
      });
    }
  }

  if (strategy === 'none') {
    return normalizeEntries(
      await keepLinkedClaudeFiles(
        repoRoot,
        entries,
        instructionDirectories,
        dependencies,
      ),
    );
  }

  return normalizeEntries(entries);
}

/**
 * Under `none`, a CLAUDE.md that any scanned instruction file links to --
 * `pkg/AGENTS.md -> ../CLAUDE.md`, say -- is never removed or adopted, even
 * when it has an exact managed shape: deleting it would leave that link
 * dangling. It is reported as `unmanaged`, naming the links.
 */
async function keepLinkedClaudeFiles(
  repoRoot: string,
  entries: InstructionEntry[],
  instructionDirectories: Map<string, InstructionDirectoryEntry>,
  dependencies: InstructionsScanDependencies,
): Promise<InstructionEntry[]> {
  const candidates = [...instructionDirectories.values()].flatMap(
    (directoryEntry) =>
      [
        directoryEntry.agentsPath,
        directoryEntry.brokenAgentsPath,
        directoryEntry.claudePath,
        directoryEntry.brokenClaudePath,
      ].filter((path): path is string => path !== undefined),
  );

  const kept: InstructionEntry[] = [];
  for (const entry of entries) {
    if (entry.status !== 'managed_shim' && entry.status !== 'stray') {
      kept.push(entry);
      continue;
    }
    const linkers = await findLinksThrough(
      entry.claudePath,
      candidates,
      dependencies,
    );
    if (linkers.length === 0) {
      kept.push(entry);
      continue;
    }
    kept.push({
      agentsPath: entry.agentsPath,
      claudePath: entry.claudePath,
      status: 'unmanaged',
      detail: `${describeLinkers(repoRoot, linkers)} ${linkers.length === 1 ? 'links' : 'link'} to this CLAUDE.md, so removing it would break ${linkers.length === 1 ? 'that link' : 'those links'} (replace ${linkers.length === 1 ? 'the link' : 'each link'} with its content first); kept`,
    });
  }
  return kept;
}

// Exact-case names only. A case-insensitive match would flag ordinary
// documents such as a provider page named `claude.md` (this repository has
// two) with advice to delete them, on the unverified premise that Claude
// Code's plugin would treat them as CLAUDE.md; case variants are therefore
// neither reported nor ever removed.
const LEFTOVER_CLAUDE_FILE_NAMES = new Set(['CLAUDE.md', 'CLAUDE.local.md']);

/** A leftover file and the `AGENTS.md` links that pass through it. */
export interface LeftoverClaudeFile {
  path: string;
  /** Absolute paths of every `AGENTS.md` whose symlink chain reaches `path`. */
  linkedBy: string[];
  /**
   * Whether the file is an exact OAT shim of its sibling AGENTS.md (pointer,
   * sibling symlink, or identical copy), judged by `inspectManagedShim`. Any
   * other file -- `CLAUDE.local.md`, `.claude/CLAUDE.md`, a hand-written or
   * modified `CLAUDE.md`, one without a sibling AGENTS.md, or one that cannot
   * be read -- has content of its own.
   */
  exactShim: boolean;
}

/**
 * Every `CLAUDE.md` (including `.claude/CLAUDE.md`) and `CLAUDE.local.md` in
 * the repository (exact case), sorted, as absolute paths, each with the
 * `AGENTS.md` files that link to it.
 *
 * A separate, read-only walk on purpose. The instruction scan skips the
 * documentation content root and `instructions.claude.excludes`,
 * but those only limit what OAT may change: Claude Code's `agents-md` plugin
 * stands down whichever directory the file is in. Only `.git`, `node_modules`,
 * the root `.worktrees`, and nested git checkouts (separate repositories) are
 * skipped, and symlinked directories are not followed. A symlink named like
 * an instruction file counts, broken or not. Each directory entry is read
 * once, so one file is never reported twice, even on a case-insensitive
 * filesystem.
 */
export async function findLeftoverClaudeFiles(
  repoRoot: string,
  overrides: Partial<
    Pick<
      InstructionsScanDependencies,
      'readdir' | 'lstat' | 'readlink' | 'realpath' | 'readFileBytes'
    >
  > = {},
): Promise<LeftoverClaudeFile[]> {
  const readDirectory = overrides.readdir ?? readdir;
  const linkDependencies: LinkResolutionDependencies = {
    lstat: overrides.lstat ?? lstat,
    readlink: overrides.readlink ?? readlink,
    realpath: overrides.realpath ?? realpath,
  };
  const inspectionDependencies: ManagedShimInspectionDependencies = {
    ...linkDependencies,
    readFileBytes: overrides.readFileBytes ?? readFileBytesDefault,
  };
  const queue = [repoRoot];
  const found: string[] = [];
  const agentsFiles: string[] = [];

  while (queue.length > 0) {
    const currentDirectory = queue.shift();
    if (!currentDirectory) {
      continue;
    }

    let entries: Awaited<ReturnType<InstructionsScanDependencies['readdir']>>;
    try {
      entries = await readDirectory(currentDirectory, { withFileTypes: true });
    } catch {
      continue;
    }

    if (isNestedCheckout(repoRoot, currentDirectory, entries)) {
      continue;
    }

    for (const entry of entries) {
      const entryPath = join(currentDirectory, entry.name);
      if (entry.isDirectory()) {
        if (
          entry.name === '.git' ||
          GLOBAL_EXCLUDED_DIRECTORIES.has(entry.name) ||
          (currentDirectory === repoRoot && entry.name === '.worktrees')
        ) {
          continue;
        }
        queue.push(entryPath);
        continue;
      }
      if (entry.name === 'AGENTS.md') {
        agentsFiles.push(entryPath);
      }
      if (LEFTOVER_CLAUDE_FILE_NAMES.has(entry.name)) {
        found.push(entryPath);
      }
    }
  }

  const leftovers: LeftoverClaudeFile[] = [];
  for (const path of found.sort((left, right) => left.localeCompare(right))) {
    // `inspectManagedShim` already refuses `CLAUDE.local.md` and anything in
    // `.claude`, so it alone decides. A file that vanished since the walk
    // (`absent`) holds nothing and cannot block anything.
    const inspection = await inspectManagedShim(
      path,
      join(dirname(path), 'AGENTS.md'),
      inspectionDependencies,
    );
    leftovers.push({
      path,
      linkedBy: await findLinksThrough(path, agentsFiles, linkDependencies),
      exactShim: inspection.kind === 'managed' || inspection.kind === 'absent',
    });
  }
  return leftovers;
}

/**
 * Where the docs explain why any CLAUDE.md makes Claude Code ignore AGENTS.md.
 * Absolute, because the message is read in terminals and JSON consumers that
 * cannot resolve a repository-relative docs path.
 */
export const CLAUDE_CODE_AGENTS_MD_DOCS_URL =
  'https://github.com/voxmedia/open-agent-toolkit/blob/main/apps/oat-docs/docs/provider-sync/instruction-sync.md#claude-code-and-agentsmd';

/**
 * Under strategy `none`, removal is all or nothing: the leftover files with
 * content of their own (anything but an exact OAT shim) that hold back every
 * CLAUDE.md removal while they exist.
 *
 * A stray the scan will adopt (a lone `CLAUDE.md` with no sibling AGENTS.md)
 * never blocks: its content moves into a new AGENTS.md, so it is not left
 * behind. Every other file counts wherever it is, including excluded and
 * documentation trees, because Claude Code's walk does not honor OAT's
 * exclusions. An unreadable file counts too: blocking is the safe direction.
 */
export function findShimRemovalBlockers(
  entries: readonly InstructionEntry[],
  leftovers: readonly LeftoverClaudeFile[],
): string[] {
  const adoptedStrays = new Set(
    entries
      .filter((entry) => entry.status === 'stray')
      .map((entry) => entry.claudePath),
  );
  return leftovers
    .filter((leftover) => !leftover.exactShim)
    .map((leftover) => leftover.path)
    .filter((path) => !adoptedStrays.has(path));
}

/** The CLAUDE.md files strategy `none` removes: managed shims and adopted strays. */
export function listShimRemovals(
  entries: readonly InstructionEntry[],
): string[] {
  return entries
    .filter(
      (entry) => entry.status === 'managed_shim' || entry.status === 'stray',
    )
    .map((entry) => entry.claudePath)
    .sort((left, right) => left.localeCompare(right));
}

/** `a` / `a and b` / `a, b, and c`. */
function joinList(items: readonly string[]): string {
  if (items.length <= 2) {
    return items.join(' and ');
  }
  return `${items.slice(0, -1).join(', ')}, and ${items.at(-1)}`;
}

/** The skip reason sync records for each removal the block holds back. */
export function describeShimRemovalBlock(
  repoRoot: string,
  blockers: readonly string[],
): string {
  const paths = blockers.map((path) => toPosixPath(relative(repoRoot, path)));
  return (
    `kept: strategy none removes no CLAUDE.md while ${joinList(paths)} ` +
    `${paths.length === 1 ? 'has' : 'have'} content (see warnings)`
  );
}

/**
 * The single finding for a blocked removal: which shims the configuration
 * would remove, that none were removed and which files are why, why any
 * CLAUDE.md matters, and what to do next.
 */
export function buildShimRemovalBlockWarning(
  repoRoot: string,
  blockers: readonly string[],
  wouldRemove: readonly string[],
  mode: InstructionsMode,
): ClaudeMdBlocksShimRemovalWarning {
  const paths = blockers.map((path) => toPosixPath(relative(repoRoot, path)));
  const removals = wouldRemove.map((path) =>
    toPosixPath(relative(repoRoot, path)),
  );
  const one = paths.length === 1;
  return {
    code: 'claude_md_blocks_shim_removal',
    paths,
    wouldRemove: removals,
    message:
      `Strategy none would remove ${removals.length} OAT-managed CLAUDE.md ` +
      `${removals.length === 1 ? 'shim' : 'shims'} (${removals.join(', ')}), ` +
      `but ${mode === 'apply' ? 'none were removed' : 'none will be removed'} ` +
      `because ${joinList(paths)} ${one ? 'has' : 'have'} content that is not an OAT shim. ` +
      'Any CLAUDE.md makes Claude Code ignore AGENTS.md ' +
      `(${CLAUDE_CODE_AGENTS_MD_DOCS_URL}), so OAT keeps every shim until no ` +
      'CLAUDE.md with content remains rather than leave a mix. ' +
      `To finish, remove ${joinList(paths)} or move ${one ? 'its' : 'their'} content into an AGENTS.md ` +
      'and rerun `oat instructions sync`, or set instructions.claude.shims to a shim strategy ' +
      '(pointer, symlink, or copy) to keep CLAUDE.md files.',
  };
}

/**
 * Restate each managed shim's detail while the block holds: sync will not
 * remove it, so "sync removes it" would be false.
 */
export function markBlockedShimEntries(
  entries: readonly InstructionEntry[],
): InstructionEntry[] {
  return entries.map((entry) =>
    entry.status === 'managed_shim' && entry.managedShim
      ? {
          ...entry,
          detail: `${describeManagedShim(entry.managedShim)}; not removed while another CLAUDE.md has content`,
        }
      : entry,
  );
}

/**
 * The directory whose sessions a leftover file affects: its own directory,
 * except that `.claude/CLAUDE.md` belongs to the directory holding `.claude`.
 * `.` for the project root.
 */
function leftoverScopeDirectory(relativePath: string): string {
  const directory = posix.dirname(relativePath);
  return posix.basename(directory) === '.claude'
    ? posix.dirname(directory)
    : directory;
}

/**
 * One warning per leftover file, naming exactly two ways out: remove the
 * file, or opt back into shims and let sync add them everywhere.
 *
 * When an `AGENTS.md` links to the file, removing it would break that link
 * and lose the only copy of the instructions, so the first option becomes
 * "replace the link with the file's content, then remove the file", and
 * `linkedBy` names the links.
 *
 * Claude Code's plugin stands down when such a file sits in the session's
 * working directory or any directory above it up to the project root, so a
 * root file affects every session and a nested one only sessions started in
 * its directory or below.
 */
export function buildLeftoverClaudeWarnings(
  repoRoot: string,
  leftovers: readonly Pick<LeftoverClaudeFile, 'path' | 'linkedBy'>[],
): ClaudeMdHidesAgentsMdWarning[] {
  return leftovers.map(({ path, linkedBy }) => {
    const relativePath = toPosixPath(relative(repoRoot, path));
    const scopeDirectory = leftoverScopeDirectory(relativePath);
    const scope =
      scopeDirectory === '.'
        ? ', whatever directory a session starts in'
        : ` for Claude Code sessions started in ${scopeDirectory}/ or below`;
    const firstOption =
      linkedBy.length === 0
        ? `Either remove ${relativePath}`
        : `Either replace ${describeLinkers(repoRoot, linkedBy)} (${linkedBy.length === 1 ? 'a link' : 'links'} to ${relativePath}) with the content of ${relativePath} and then remove ${relativePath}`;
    return {
      code: 'claude_md_hides_agents_md',
      path: relativePath,
      linkedBy: linkedBy.map((linker) =>
        toPosixPath(relative(repoRoot, linker)),
      ),
      message:
        `${relativePath} makes Claude Code ignore every AGENTS.md in this project${scope}: ` +
        "its default agents-md mode stands down while any CLAUDE.md, .claude/CLAUDE.md, or CLAUDE.local.md exists in the session's working directory or any directory above it, up to the project root. " +
        `${firstOption}, or set instructions.claude.shims in .oat/config.json ` +
        'to a shim strategy (pointer, symlink, or copy) and rerun `oat instructions sync` to add shims back.',
    };
  });
}

export function buildInstructionsSummary(
  entries: InstructionEntry[],
  actions: InstructionActionRecord[],
): InstructionsSummary {
  const normalizedEntries = normalizeEntries(entries);
  const normalizedActions = normalizeActions(actions);

  return {
    scanned: normalizedEntries.length,
    ok: normalizedEntries.filter((entry) => entry.status === 'ok').length,
    missing: normalizedEntries.filter((entry) => entry.status === 'missing')
      .length,
    contentMismatch: normalizedEntries.filter(
      (entry) => entry.status === 'content_mismatch',
    ).length,
    stray: normalizedEntries.filter((entry) => entry.status === 'stray').length,
    managedShim: normalizedEntries.filter(
      (entry) => entry.status === 'managed_shim',
    ).length,
    unmanaged: normalizedEntries.filter((entry) => entry.status === 'unmanaged')
      .length,
    created: normalizedActions.filter((action) => action.type === 'create')
      .length,
    updated: normalizedActions.filter((action) => action.type === 'update')
      .length,
    removed: normalizedActions.filter((action) => action.type === 'remove')
      .length,
    skipped: normalizedActions.filter((action) => action.result === 'skipped')
      .length,
  };
}

function deriveInstructionsStatus(
  entries: InstructionEntry[],
  actions: InstructionActionRecord[],
): InstructionsStatus {
  // An `unmanaged` CLAUDE.md is reported but is not drift: sync never removes
  // it, so counting it would leave the repository no clean state to reach.
  if (
    entries.some(
      (entry) => entry.status !== 'ok' && entry.status !== 'unmanaged',
    ) ||
    actions.some((action) => action.result === 'skipped')
  ) {
    return 'drift';
  }

  return 'ok';
}

export function buildInstructionsPayload({
  mode,
  strategy,
  warnings,
  entries,
  actions,
  excludedPaths,
  effectiveExcludedPaths,
  exclusionWarnings,
}: BuildInstructionsPayloadArgs): InstructionsJsonPayload {
  const normalizedEntries = normalizeEntries(entries);
  const normalizedActions = normalizeActions(actions);
  const normalizedExcludedPaths = normalizeExcludedPaths(excludedPaths);
  const normalizedEffectivePaths = normalizeExcludedPaths(
    effectiveExcludedPaths,
  );

  return {
    mode,
    status: deriveInstructionsStatus(normalizedEntries, normalizedActions),
    strategy,
    summary: buildInstructionsSummary(normalizedEntries, normalizedActions),
    // The planning identity is an apply-time safety input, not output.
    entries: normalizedEntries.map(
      ({ managedShim: _managedShim, ...entry }) => entry,
    ),
    actions: normalizedActions,
    // Both omitted when nothing is configured, so a repository with no
    // documentation root keeps its existing payload shape exactly. Once
    // `excludedPaths` is present its effective counterpart always is too, even
    // when empty: "configured three, protected none" is precisely the state a
    // consumer must be able to see, and omitting the field would hide it.
    ...(normalizedExcludedPaths.length > 0
      ? {
          excludedPaths: normalizedExcludedPaths,
          effectiveExcludedPaths: normalizedEffectivePaths,
        }
      : {}),
    // Independent of the two fields above: an entry rejected during
    // normalization produces a warning but no configured path, and that is
    // exactly the case a JSON consumer must still be able to see.
    ...(exclusionWarnings !== undefined && exclusionWarnings.length > 0
      ? { exclusionWarnings }
      : {}),
    ...(warnings !== undefined && warnings.length > 0 ? { warnings } : {}),
  };
}

export function formatInstructionsReport(
  payload: InstructionsJsonPayload,
  repoRoot?: string,
): string {
  const lines = [
    `instructions ${payload.mode}`,
    `status: ${payload.status}`,
    `strategy: ${payload.strategy}`,
    `summary: scanned=${payload.summary.scanned}, ok=${payload.summary.ok}, missing=${payload.summary.missing}, content_mismatch=${payload.summary.contentMismatch}, stray=${payload.summary.stray}, managed_shim=${payload.summary.managedShim}, unmanaged=${payload.summary.unmanaged}, created=${payload.summary.created}, updated=${payload.summary.updated}, removed=${payload.summary.removed}, skipped=${payload.summary.skipped}`,
  ];

  if (payload.entries.length === 0) {
    lines.push('entries: none');
  } else {
    lines.push('entries:');
    for (const entry of payload.entries) {
      const displayPath = entry.agentsPath ?? entry.claudePath;
      const relativePath = repoRoot
        ? toPosixPath(relative(repoRoot, displayPath)) || '.'
        : toPosixPath(displayPath);
      lines.push(`- ${relativePath} -> ${entry.status} (${entry.detail})`);
    }
  }

  if (payload.actions.length === 0) {
    lines.push('actions: none');
  } else {
    lines.push('actions:');
    for (const action of payload.actions) {
      const target = repoRoot
        ? toPosixPath(relative(repoRoot, action.target)) || '.'
        : toPosixPath(action.target);
      lines.push(
        `- ${action.type} ${target} (${action.reason}) [${action.result}]`,
      );
    }
  }

  return lines.join('\n');
}
