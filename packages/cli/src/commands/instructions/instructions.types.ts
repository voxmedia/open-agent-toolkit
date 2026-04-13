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
}

export interface InstructionsScanOptions {
  strategy?: InstructionSyncStrategy;
  debug?: (message: string) => void;
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
