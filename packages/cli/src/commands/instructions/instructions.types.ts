import type { Dirent, Stats } from 'node:fs';
import type { CommandContext, GlobalOptions } from '@app/command-context';

export type InstructionStatus = 'ok' | 'missing' | 'content_mismatch';

export type InstructionsStatus = 'ok' | 'drift';

export interface InstructionEntry {
  agentsPath: string;
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

export interface InstructionsScanDependencies {
  readdir: (
    path: string,
    options: { withFileTypes: true },
  ) => Promise<Dirent[]>;
  readFile: (path: string, encoding: 'utf8') => Promise<string>;
  stat: (path: string) => Promise<Stats>;
  debug?: (message: string) => void;
}

export interface InstructionsValidateCommandDependencies {
  buildCommandContext: (options: GlobalOptions) => CommandContext;
  resolveProjectRoot: (cwd: string) => Promise<string>;
  scanInstructionFiles: (
    repoRoot: string,
    overrides?: Partial<InstructionsScanDependencies>,
  ) => Promise<InstructionEntry[]>;
}

export interface InstructionsSyncCommandDependencies
  extends InstructionsValidateCommandDependencies {
  writeFile: (path: string, content: string, encoding: 'utf8') => Promise<void>;
}
