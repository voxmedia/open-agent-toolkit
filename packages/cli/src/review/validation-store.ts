import { randomUUID } from 'node:crypto';
import { constants } from 'node:fs';
import {
  chmod,
  lstat,
  mkdir,
  open,
  readFile,
  realpath,
  rename,
  rm,
  stat,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

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

  private async withLock<T>(operation: () => Promise<T>): Promise<T> {
    await this.ensureRoot();
    const lockPath = join(this.root, '.store.lock');
    let handle;
    for (let attempt = 0; attempt < 100; attempt++) {
      try {
        handle = await open(lockPath, EXCLUSIVE_WRITE, 0o600);
        break;
      } catch (error) {
        if (
          typeof error !== 'object' ||
          error === null ||
          !('code' in error) ||
          error.code !== 'EEXIST'
        ) {
          throw error;
        }
        await delay(10);
      }
    }
    if (!handle) throw new Error('validation store lock timeout');
    try {
      return await operation();
    } finally {
      await handle.close();
      await rm(lockPath, { force: true });
    }
  }

  private runDirectory(runId: string): string {
    if (!/^[A-Za-z0-9_-]{16,128}$/.test(runId)) {
      throw new Error('validation run ID is malformed');
    }
    return join(this.root, `run-${runId}`);
  }

  private correlationPath(gateRunId: string, launchAttemptId: string): string {
    if (
      !/^[A-Za-z0-9_-]{1,128}$/.test(gateRunId) ||
      !/^[A-Za-z0-9_-]{1,128}$/.test(launchAttemptId)
    ) {
      throw new Error('gate correlation IDs are malformed');
    }
    return join(this.root, `correlation-${gateRunId}-${launchAttemptId}.json`);
  }

  async createRun(input: {
    preparation: ReviewPreparationV1;
    artifactDraft: boolean;
  }): Promise<StoredValidationRun> {
    await this.ensureRoot();
    if (!/^[A-Za-z0-9_-]{16,128}$/.test(input.preparation.runId)) {
      throw new Error('validation run ID is malformed');
    }
    const runDirectory = this.runDirectory(input.preparation.runId);
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
      await readFile(join(this.runDirectory(runId), 'state.json'), 'utf8'),
    ) as unknown;
  }

  async readRun(runId: string, now = new Date()): Promise<StoredValidationRun> {
    const runDirectory = this.runDirectory(runId);
    const statePath = join(runDirectory, 'state.json');
    const handle = await open(statePath, constants.O_RDONLY | NOFOLLOW);
    let source: string;
    try {
      const info = await handle.stat();
      if (!info.isFile() || info.nlink !== 1 || info.mode & 0o077) {
        throw new Error('validation state identity or permissions are unsafe');
      }
      source = await handle.readFile('utf8');
    } finally {
      await handle.close();
    }
    const state = JSON.parse(source) as ValidationRunState;
    if (
      state.schemaVersion !== 1 ||
      state.preparation?.schemaVersion !== 1 ||
      state.preparation.runId !== runId
    ) {
      throw new Error('validation state schema or identity mismatch');
    }
    if (Date.parse(state.preparation.expiresAt) <= now.getTime()) {
      throw new Error('validation state has expired');
    }
    if (state.draft !== null) {
      const draftInfo = await lstat(state.draft.path);
      if (
        !draftInfo.isFile() ||
        draftInfo.isSymbolicLink() ||
        draftInfo.nlink !== 1 ||
        draftInfo.dev !== state.draft.device ||
        draftInfo.ino !== state.draft.inode ||
        draftInfo.mode & 0o077
      ) {
        throw new Error('artifact draft identity mismatch');
      }
    }
    return {
      runId,
      runDirectory,
      statePath,
      artifactDraftPath: state.draft?.path ?? null,
      draftDevice: state.draft?.device ?? null,
      draftInode: state.draft?.inode ?? null,
      state,
    };
  }

  async updateRun(
    runId: string,
    update: (state: ValidationRunState) => ValidationRunState,
  ): Promise<StoredValidationRun> {
    return this.withLock(async () => {
      const current = await this.readRun(runId);
      const next = update(structuredClone(current.state));
      if (
        next.schemaVersion !== 1 ||
        next.preparation.runId !== runId ||
        next.preparation.expiresAt !== current.state.preparation.expiresAt
      ) {
        throw new Error('validation update changed immutable identity');
      }
      const temporaryPath = join(
        current.runDirectory,
        `.state-${randomUUID()}.tmp`,
      );
      await writeExclusive(temporaryPath, `${JSON.stringify(next)}\n`);
      await rename(temporaryPath, current.statePath);
      return this.readRun(runId);
    });
  }

  async bindGateCorrelation(
    gateRunId: string,
    launchAttemptId: string,
    runId: string,
  ): Promise<void> {
    await this.withLock(async () => {
      const run = await this.readRun(runId);
      if (
        run.state.preparation.correlation.gateRunId !== gateRunId ||
        run.state.preparation.correlation.launchAttemptId !== launchAttemptId
      ) {
        throw new Error('gate correlation does not match validation state');
      }
      await writeExclusive(
        this.correlationPath(gateRunId, launchAttemptId),
        `${JSON.stringify({ schemaVersion: 1, runId })}\n`,
      );
    });
  }

  async resolveGateCorrelation(
    gateRunId: string,
    launchAttemptId: string,
  ): Promise<string> {
    const path = this.correlationPath(gateRunId, launchAttemptId);
    const handle = await open(path, constants.O_RDONLY | NOFOLLOW);
    try {
      const info = await handle.stat();
      if (!info.isFile() || info.nlink !== 1 || info.mode & 0o077) {
        throw new Error('gate correlation identity is unsafe');
      }
      const record = JSON.parse(await handle.readFile('utf8')) as {
        schemaVersion?: unknown;
        runId?: unknown;
      };
      if (record.schemaVersion !== 1 || typeof record.runId !== 'string') {
        throw new Error('gate correlation schema is invalid');
      }
      await this.readRun(record.runId);
      return record.runId;
    } finally {
      await handle.close();
    }
  }

  async deleteRun(runId: string): Promise<void> {
    await this.withLock(async () => {
      const run = await this.readRun(runId);
      const correlation = run.state.preparation.correlation;
      if (correlation.gateRunId !== null) {
        await rm(
          this.correlationPath(
            correlation.gateRunId,
            correlation.launchAttemptId,
          ),
          { force: true },
        );
      }
      await rm(run.runDirectory, { recursive: true, force: true });
    });
  }
}
