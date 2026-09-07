import type { Dirent, Stats } from 'node:fs';

import type { CommandContext, GlobalOptions } from '@app/command-context';

export const INSTRUCTION_SYNC_STRATEGIES = [
  'pointer',
  'symlink',
  'copy',
] as const;

export type InstructionSyncStrategy =
  (typeof INSTRUCTION_SYNC_STRATEGIES)[number];

export type InstructionStatus = 'ok' | 'missing' | 'content_mismatch' | 'stray';

export type InstructionsStatus = 'ok' | 'drift';

export interface InstructionEntry {
  agentsPath: string | null;
  claudePath: string;
  status: InstructionStatus;
  detail: string;
}

export type InstructionActionType = 'create' | 'update' | 'skip';

export type InstructionActionResult = 'planned' | 'applied' | 'skipped';

export interface InstructionActionRecord {
  type: InstructionActionType;
  target: string;
  reason: string;
  result: InstructionActionResult;
}

export type InstructionsMode = 'validate' | 'dry-run' | 'apply';

export interface InstructionsSummary {
  scanned: number;
  ok: number;
  missing: number;
  contentMismatch: number;
  stray: number;
  created: number;
  updated: number;
  skipped: number;
}

export interface InstructionsJsonPayload {
  mode: InstructionsMode;
  status: InstructionsStatus;
  summary: InstructionsSummary;
  entries: InstructionEntry[];
  actions: InstructionActionRecord[];
  /**
   * The normalized repo-relative exclusions applied to this scan, in the order
   * they were resolved. These are the configured exclusions, not a record of
   * directories actually skipped: the `.oat/repo` carve-in is queued before the
   * exclusion predicate runs, so listing `.oat` here still leaves `.oat/repo`
   * scanned.
   *
   * Additive and omitted entirely when nothing was excluded, so payloads from
   * repositories without a documentation root are byte-identical to the
   * pre-exclusion shape.
   */
  excludedPaths?: string[];
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
  readlink: (path: string) => Promise<string>;
  stat: (path: string) => Promise<Stats>;
}

export interface InstructionsValidateCommandDependencies {
  buildCommandContext: (options: GlobalOptions) => CommandContext;
  resolveProjectRoot: (cwd: string) => Promise<string>;
  /**
   * The single exclusion path both commands resolve through. Sync inherits it
   * from this interface rather than resolving its own, so validate can never
   * report drift that sync would refuse to fix.
   */
  resolveInstructionPointerExcludes: (repoRoot: string) => Promise<string[]>;
  scanInstructionFiles: (
    repoRoot: string,
    options?: InstructionsScanOptions,
    overrides?: Partial<InstructionsScanDependencies>,
  ) => Promise<InstructionEntry[]>;
}

export interface InstructionsSyncCommandDependencies extends InstructionsValidateCommandDependencies {
  lstat: (path: string) => Promise<Stats>;
  readFile: (path: string, encoding: 'utf8') => Promise<string>;
  removeFile: (path: string) => Promise<void>;
  symlinkFile: (target: string, path: string) => Promise<void>;
  writeFile: (path: string, content: string, encoding: 'utf8') => Promise<void>;
}
