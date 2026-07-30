import { constants } from 'node:fs';
import {
  chmod,
  lstat,
  mkdir,
  open,
  readFile,
  realpath,
  rm,
  stat,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type {
  HostTelemetryEvidenceV1,
  PlanValidationReceiptV1,
  PreparedReviewContextV1,
  ReviewPlanV1,
  ReviewPreparationV1,
  ReviewProgress,
  ValidatedAssignmentProjectionV1,
} from './types';

export interface ValidationRunState {
  schemaVersion: 1;
  preparation: ReviewPreparationV1;
  phase: ReviewProgress;
  draft: {
    path: string;
    device: number;
    inode: number;
  } | null;
  acceptedHandleDigest: string | null;
  capabilities: {
    checkpointDigest: string;
    planDigest: string;
    checkpointUsed: boolean;
    planUsed: boolean;
  } | null;
  telemetry: HostTelemetryEvidenceV1[];
  context: PreparedReviewContextV1 | null;
  plan: ReviewPlanV1 | null;
  assignment: ValidatedAssignmentProjectionV1 | null;
  receipt: PlanValidationReceiptV1 | null;
  planValidationAttempts: number;
}

export interface StoredValidationRun {
  runId: string;
  runDirectory: string;
  statePath: string;
  artifactDraftPath: string | null;
  draftDevice: number | null;
  draftInode: number | null;
  state: ValidationRunState;
}

const NOFOLLOW =
  'O_NOFOLLOW' in constants ? constants.O_NOFOLLOW : (0 as number);
const EXCLUSIVE_WRITE =
  constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY | NOFOLLOW;

async function writeExclusive(path: string, content: string): Promise<void> {
  const handle = await open(path, EXCLUSIVE_WRITE, 0o600);
  try {
    await handle.writeFile(content, 'utf8');
    await handle.sync();
  } finally {
    await handle.close();
  }
}

export class ValidationStore {
  readonly root: string;

  constructor(root = join(tmpdir(), 'oat-review-validation-v1')) {
    this.root = root;
  }

  private async ensureRoot(): Promise<void> {
    let info;
    try {
      info = await lstat(this.root);
    } catch (error) {
      if (
        typeof error !== 'object' ||
        error === null ||
        !('code' in error) ||
        error.code !== 'ENOENT'
      ) {
        throw error;
      }
      await mkdir(this.root, { mode: 0o700 });
      info = await lstat(this.root);
    }
    if (!info.isDirectory() || info.isSymbolicLink()) {
      throw new Error('validation store root must be a real directory');
    }
    await chmod(this.root, 0o700);
  }

  async createRun(input: {
    preparation: ReviewPreparationV1;
    artifactDraft: boolean;
  }): Promise<StoredValidationRun> {
    await this.ensureRoot();
    if (!/^[A-Za-z0-9_-]{16,128}$/.test(input.preparation.runId)) {
      throw new Error('validation run ID is malformed');
    }
    const runDirectory = join(this.root, `run-${input.preparation.runId}`);
    await mkdir(runDirectory, { mode: 0o700 });
    await chmod(runDirectory, 0o700);
    const resolvedRoot = await realpath(this.root);
    const resolvedRun = await realpath(runDirectory);
    if (!resolvedRun.startsWith(`${resolvedRoot}/`)) {
      throw new Error('validation run escaped the private root');
    }

    let draft: { path: string; device: number; inode: number } | null = null;
    try {
      if (input.artifactDraft) {
        const path = join(runDirectory, 'artifact-draft.md');
        await writeExclusive(path, '');
        const info = await stat(path);
        if (!info.isFile() || info.nlink !== 1) {
          throw new Error('artifact draft must be a single-link regular file');
        }
        draft = { path, device: info.dev, inode: info.ino };
      }
      const state: ValidationRunState = {
        schemaVersion: 1,
        preparation: structuredClone(input.preparation),
        phase: 'prepared',
        draft,
        acceptedHandleDigest: null,
        capabilities: null,
        telemetry: [],
        context: null,
        plan: null,
        assignment: null,
        receipt: null,
        planValidationAttempts: 0,
      };
      const statePath = join(runDirectory, 'state.json');
      await writeExclusive(statePath, `${JSON.stringify(state)}\n`);
      const stateInfo = await stat(statePath);
      if (!stateInfo.isFile() || stateInfo.mode & 0o077) {
        throw new Error('validation state permissions are unsafe');
      }
      return {
        runId: input.preparation.runId,
        runDirectory,
        statePath,
        artifactDraftPath: draft?.path ?? null,
        draftDevice: draft?.device ?? null,
        draftInode: draft?.inode ?? null,
        state,
      };
    } catch (error) {
      await rm(runDirectory, { recursive: true, force: true });
      throw error;
    }
  }

  async unsafeReadStateForTesting(runId: string): Promise<unknown> {
    return JSON.parse(
      await readFile(join(this.root, `run-${runId}`, 'state.json'), 'utf8'),
    ) as unknown;
  }
}
