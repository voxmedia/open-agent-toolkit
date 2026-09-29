import type { Dirent, Stats } from 'node:fs';

import type { CommandContext, GlobalOptions } from '@app/command-context';
import type { InstructionSyncStrategy } from '@config/oat-config';

// One list shared with the `instructions.claude.shims` config
// normalizer and `oat config set`, so the commands can never accept a value
// the config rejects or the reverse.
export {
  INSTRUCTION_SYNC_STRATEGIES,
  type InstructionSyncStrategy,
} from '@config/oat-config';

/**
 * - `managed_shim`: under strategy `none`, a CLAUDE.md in the exact shape OAT
 *   writes (the `@AGENTS.md` pointer, a symlink to the sibling AGENTS.md, or a
 *   byte-identical copy). Drift: sync removes it.
 * - `unmanaged`: under strategy `none`, a CLAUDE.md that is not an exact
 *   managed shape (hand-written, modified, a symlink elsewhere). Never
 *   removed, and not drift.
 */
export type InstructionStatus =
  | 'ok'
  | 'missing'
  | 'content_mismatch'
  | 'stray'
  | 'managed_shim'
  | 'unmanaged';

export type ManagedShimShape = 'pointer' | 'symlink' | 'copy';

/**
 * What the scan observed about a managed shim, so removal can fail closed if
 * the file changed between planning and deletion. Internal to the sync apply
 * path; never serialized into the JSON payload.
 */
export interface ManagedShimRecord {
  shape: ManagedShimShape;
  /** `lstat` identity of the CLAUDE.md itself (the link for a symlink). */
  dev: number;
  ino: number;
  /** The raw `readlink` value, for the symlink shape only. */
  linkTarget?: string;
}

export type InstructionsStatus = 'ok' | 'drift';

export interface InstructionEntry {
  agentsPath: string | null;
  claudePath: string;
  status: InstructionStatus;
  detail: string;
  /** Present only for `managed_shim` entries. */
  managedShim?: ManagedShimRecord;
}

export type InstructionActionType = 'create' | 'update' | 'remove' | 'skip';

export type InstructionActionResult = 'planned' | 'applied' | 'skipped';

export interface InstructionActionRecord {
  type: InstructionActionType;
  target: string;
  reason: string;
  result: InstructionActionResult;
}

export type InstructionsMode = 'validate' | 'dry-run' | 'apply';

/**
 * A finding that never changes the exit code by itself.
 *
 * `claude_md_hides_agents_md`: under strategy `none`, a `CLAUDE.md`,
 * `.claude/CLAUDE.md`, or `CLAUDE.local.md` that makes Claude Code's default
 * `agents-md` mode ignore every AGENTS.md in the project while it exists.
 */
export interface ClaudeMdHidesAgentsMdWarning {
  code: 'claude_md_hides_agents_md';
  /** Repository-relative POSIX path. */
  path: string;
  /**
   * Repository-relative `AGENTS.md` paths whose symlink chain reaches `path`.
   * When non-empty, removing `path` would break them: replace each link with
   * the file's content first. Always present, possibly empty.
   */
  linkedBy: string[];
  message: string;
}

/**
 * `claude_md_blocks_shim_removal`: under strategy `none`, removal is all or
 * nothing. While any `CLAUDE.md`, `.claude/CLAUDE.md`, or `CLAUDE.local.md`
 * is not an exact OAT shim, sync removes no CLAUDE.md at all; this finding
 * names those files and the removals held back. Sync reports each held-back
 * removal as a skipped action, which is what sets its exit code.
 */
export interface ClaudeMdBlocksShimRemovalWarning {
  code: 'claude_md_blocks_shim_removal';
  /** Repository-relative POSIX paths of the files with their own content. */
  paths: string[];
  /** Repository-relative POSIX paths of the CLAUDE.md files kept because of them. */
  wouldRemove: string[];
  /**
   * For each path in `paths`, the repository-relative `AGENTS.md` paths whose
   * symlink chain reaches it. A non-empty list means that file holds the only
   * copy of those instructions: replace each link with its content before
   * removing it, never remove it plainly. Every path in `paths` has a key.
   */
  linkedBy: Record<string, string[]>;
  message: string;
}

export type InstructionsWarning =
  | ClaudeMdHidesAgentsMdWarning
  | ClaudeMdBlocksShimRemovalWarning;

export interface InstructionsSummary {
  scanned: number;
  ok: number;
  missing: number;
  contentMismatch: number;
  stray: number;
  managedShim: number;
  unmanaged: number;
  created: number;
  updated: number;
  removed: number;
  skipped: number;
}

export interface InstructionsJsonPayload {
  mode: InstructionsMode;
  status: InstructionsStatus;
  /**
   * The strategy this run applied or checked: `--strategy` when given, else
   * `instructions.claude.shims`, else the built-in default.
   */
  strategy: InstructionSyncStrategy;
  summary: InstructionsSummary;
  entries: InstructionEntry[];
  actions: InstructionActionRecord[];
  /**
   * The normalized repo-relative exclusions this scan was *configured* with, in
   * resolution order. An entry here is a statement of intent, not a guarantee:
   * it may name a directory that does not exist, differ in case from the real
   * path on a case-insensitive filesystem, or be shadowed by the `.oat/repo`
   * carve-in.
   *
   * Read `effectiveExcludedPaths` to learn what was actually protected.
   *
   * Additive and omitted entirely when nothing was configured, so payloads from
   * repositories without a documentation root are byte-identical to the
   * pre-exclusion shape.
   */
  excludedPaths?: string[];
  /**
   * The subset of `excludedPaths` that names a real, case-exact directory the
   * scan can actually prune. This is the field a consumer should trust when
   * deciding whether a tree is protected; every configured entry missing from
   * it was also reported as a warning on stderr.
   *
   * Present whenever `excludedPaths` is, including as an empty array when every
   * configured entry turned out to be inert; omitted only when nothing was
   * configured at all.
   */
  effectiveExcludedPaths?: string[];
  /**
   * One message per configured exclusion that will not protect anything, the
   * same text written to stderr in human mode.
   *
   * This field is why the JSON surface is complete. `logger.warn` is suppressed
   * under `--json`, and an entry rejected during normalization (an absolute
   * path, or one escaping the repository) never reaches `excludedPaths` either
   * — so without this a `--json` consumer would see no trace at all of an
   * exclusion that silently does nothing. Omitted when empty.
   */
  exclusionWarnings?: string[];
  /**
   * Structured warnings, the same text written to stderr in human mode.
   * Omitted when empty, so a clean repository's payload shape is unchanged.
   */
  warnings?: InstructionsWarning[];
}

/**
 * The resolved exclusion set, split so that intent and effect cannot be
 * confused. A configured entry that protects nothing is the failure mode this
 * split exists to surface: silently reporting it as applied would let an
 * operator believe a documentation tree is safe while pointers are written
 * into it.
 */
export interface InstructionPointerExclusions {
  /** Normalized entries exactly as configured, in resolution order. */
  configured: string[];
  /** The subset that names a real, case-exact, prunable directory. */
  effective: string[];
  /** One human-readable warning per configured entry that will do nothing. */
  warnings: string[];
}

export interface InstructionsScanOptions {
  strategy?: InstructionSyncStrategy;
  debug?: (message: string) => void;
  /**
   * Repo-root-relative directories whose subtrees are left out of the scan.
   * Applied after the excluded-root carve-in, so excluding a directory can
   * never strand a subtree the carve-in re-entered (`.oat/repo/**`).
   */
  excludedPaths?: string[];
}

export interface InstructionsScanDependencies {
  readdir: (
    path: string,
    options: { withFileTypes: true },
  ) => Promise<Dirent[]>;
  lstat: (path: string) => Promise<Stats>;
  realpath: (path: string) => Promise<string>;
  readFile: (path: string, encoding: 'utf8') => Promise<string>;
  /** Raw bytes, for the byte-exact managed-shim comparisons. */
  readFileBytes: (path: string) => Promise<Buffer>;
  readlink: (path: string) => Promise<string>;
  stat: (path: string) => Promise<Stats>;
}

export interface InstructionsValidateCommandDependencies {
  buildCommandContext: (options: GlobalOptions) => CommandContext;
  resolveProjectRoot: (cwd: string) => Promise<string>;
  /**
   * The repository's configured `instructions.claude.shims`, or
   * undefined when the key is absent. Sync inherits it from this interface so
   * both commands resolve the strategy through the same config read.
   */
  readConfiguredInstructionSyncStrategy: (
    repoRoot: string,
  ) => Promise<InstructionSyncStrategy | undefined>;
  /**
   * Every `CLAUDE.md` and `CLAUDE.local.md` in the repository (absolute
   * paths), from a read-only walk that ignores the mutation exclusions, each
   * classified as an exact OAT shim or not.
   */
  findLeftoverClaudeFiles: (
    repoRoot: string,
  ) => Promise<Array<{ path: string; linkedBy: string[]; exactShim: boolean }>>;
  /**
   * The single exclusion path both commands resolve through. Sync inherits it
   * from this interface rather than resolving its own, so validate can never
   * report drift that sync would refuse to fix.
   */
  resolveInstructionPointerExcludes: (
    repoRoot: string,
  ) => Promise<InstructionPointerExclusions>;
  scanInstructionFiles: (
    repoRoot: string,
    options?: InstructionsScanOptions,
    overrides?: Partial<InstructionsScanDependencies>,
  ) => Promise<InstructionEntry[]>;
}

export interface InstructionsSyncCommandDependencies extends InstructionsValidateCommandDependencies {
  lstat: (path: string) => Promise<Stats>;
  readFile: (path: string, encoding: 'utf8') => Promise<string>;
  /** Raw bytes, for the apply-time managed-shim re-verification. */
  readFileBytes: (path: string) => Promise<Buffer>;
  readlink: (path: string) => Promise<string>;
  realpath: (path: string) => Promise<string>;
  removeFile: (path: string) => Promise<void>;
  symlinkFile: (target: string, path: string) => Promise<void>;
  writeFile: (path: string, content: string, encoding: 'utf8') => Promise<void>;
}
