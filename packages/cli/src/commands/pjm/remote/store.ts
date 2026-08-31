import { randomUUID } from 'node:crypto';
import {
  mkdir,
  open,
  readFile,
  readdir,
  rename,
  unlink,
  type FileHandle,
} from 'node:fs/promises';
import { dirname, join } from 'node:path';

import type { z } from 'zod';

import {
  RemoteBatchRecordSchema,
  RemoteBindingMetadataSchema,
  RemoteBindingStateSchema,
  RemoteOperationRecordSchema,
  assertRecordIdMatchesFilename,
  type RemoteBatchRecord,
  type RemoteBindingMetadata,
  type RemoteBindingState,
  type RemoteOperationOutcome,
  type RemoteOperationRecord,
  type RemoteOperationStep,
} from './schema';
import type { RemoteStorageLocations } from './storage-locator';

export interface RemoteStoreFileHandle {
  writeFile(data: string): Promise<unknown>;
  sync(): Promise<void>;
  close(): Promise<void>;
}

export interface RemoteStoreFilesystem {
  mkdir(
    path: string,
    options: { recursive: true; mode: number },
  ): Promise<unknown>;
  open(
    path: string,
    flags: string,
    mode?: number,
  ): Promise<RemoteStoreFileHandle>;
  readFile(path: string, encoding: 'utf8'): Promise<string>;
  readdir(path: string): Promise<string[]>;
  rename(from: string, to: string): Promise<void>;
  unlink(path: string): Promise<void>;
  syncDirectory(path: string): Promise<void>;
}

async function syncDirectory(path: string): Promise<void> {
  let handle: FileHandle | undefined;
  try {
    handle = await open(path, 'r');
    await handle.sync();
  } catch (error) {
    if (
      !isFilesystemError(error, 'EINVAL') &&
      !isFilesystemError(error, 'ENOTSUP')
    ) {
      throw error;
    }
  } finally {
    await handle?.close();
  }
}

export const defaultRemoteStoreFilesystem: RemoteStoreFilesystem = {
  mkdir,
  open,
  readFile,
  readdir,
  rename,
  unlink,
  syncDirectory,
};

export interface RemoteSyncStoreDependencies {
  filesystem: RemoteStoreFilesystem;
  randomId: () => string;
}

const DEFAULT_DEPENDENCIES: RemoteSyncStoreDependencies = {
  filesystem: defaultRemoteStoreFilesystem,
  randomId: randomUUID,
};

export type RemoteOperationState = RemoteOperationRecord['state'];

export interface RemoteOperationTransition {
  state: RemoteOperationState;
  updatedAt: string;
  transport?: RemoteOperationRecord['transport'];
  outcome?: RemoteOperationOutcome;
  appendStep?: RemoteOperationStep;
}

export interface ConcurrentOperationIntentInspection {
  bindingState: RemoteBindingState | null;
  activeOperations: RemoteOperationRecord[];
  hasConcurrentIntents: boolean;
}

const ACTIVE_OPERATION_STATES: ReadonlySet<RemoteOperationState> = new Set([
  'planned',
  'authorized',
  'attempt-started',
  'partial',
  'uncertain',
]);

export class RemoteSyncStore {
  readonly #dependencies: RemoteSyncStoreDependencies;

  constructor(
    readonly locations: RemoteStorageLocations,
    dependencies: Partial<RemoteSyncStoreDependencies> = {},
  ) {
    this.#dependencies = { ...DEFAULT_DEPENDENCIES, ...dependencies };
  }

  async readBindingMetadata(
    bindingId: string,
  ): Promise<RemoteBindingMetadata | null> {
    return this.#readRecord(
      join(this.locations.portable.bindingsDir, `${bindingId}.json`),
      bindingId,
      RemoteBindingMetadataSchema,
    );
  }

  async writeBindingMetadata(record: RemoteBindingMetadata): Promise<void> {
    const parsed = RemoteBindingMetadataSchema.parse(record);
    const path = join(
      this.locations.portable.bindingsDir,
      `${parsed.bindingId}.json`,
    );
    assertRecordIdMatchesFilename(path, parsed.bindingId);
    await this.#atomicWrite(path, parsed);
  }

  async listBindingMetadata(): Promise<RemoteBindingMetadata[]> {
    return this.#listRecords(
      this.locations.portable.bindingsDir,
      RemoteBindingMetadataSchema,
      (record) => record.bindingId,
    );
  }

  async readBindingState(
    bindingId: string,
  ): Promise<RemoteBindingState | null> {
    return this.#readRecord(
      join(this.locations.operational.bindingsDir, `${bindingId}.json`),
      bindingId,
      RemoteBindingStateSchema,
    );
  }

  async writeBindingState(record: RemoteBindingState): Promise<void> {
    const parsed = RemoteBindingStateSchema.parse(record);
    const path = join(
      this.locations.operational.bindingsDir,
      `${parsed.bindingId}.json`,
    );
    assertRecordIdMatchesFilename(path, parsed.bindingId);
    await this.#atomicWrite(path, parsed);
  }

  async readOperation(
    operationId: string,
  ): Promise<RemoteOperationRecord | null> {
    return this.#readRecord(
      join(this.locations.operational.operationsDir, `${operationId}.json`),
      operationId,
      RemoteOperationRecordSchema,
    );
  }

  async createOperation(record: RemoteOperationRecord): Promise<void> {
    const parsed = RemoteOperationRecordSchema.parse(record);
    const path = join(
      this.locations.operational.operationsDir,
      `${parsed.operationId}.json`,
    );
    assertRecordIdMatchesFilename(path, parsed.operationId);
    await this.#exclusiveWrite(path, parsed);
  }

  async listActiveOperations(
    bindingId: string,
  ): Promise<RemoteOperationRecord[]> {
    const operations = await this.#listRecords(
      this.locations.operational.operationsDir,
      RemoteOperationRecordSchema,
      (record) => record.operationId,
    );
    return operations.filter(
      (operation) =>
        operation.bindingId === bindingId &&
        ACTIVE_OPERATION_STATES.has(operation.state),
    );
  }

  async detectConcurrentOperationIntents(
    bindingId: string,
  ): Promise<ConcurrentOperationIntentInspection> {
    const bindingState = await this.readBindingState(bindingId);
    const activeOperations = await this.listActiveOperations(bindingId);
    return {
      bindingState,
      activeOperations,
      hasConcurrentIntents: activeOperations.length > 1,
    };
  }

  async transitionOperation(
    operationId: string,
    expectedState: RemoteOperationState,
    update: RemoteOperationTransition,
  ): Promise<RemoteOperationRecord> {
    const current = await this.readOperation(operationId);
    if (!current) {
      throw new Error(`Remote operation '${operationId}' does not exist.`);
    }
    if (current.state !== expectedState) {
      throw new Error(
        `Remote operation '${operationId}' expected state '${expectedState}' but found '${current.state}'.`,
      );
    }
    const next = RemoteOperationRecordSchema.parse({
      ...current,
      state: update.state,
      updatedAt: update.updatedAt,
      ...(update.transport !== undefined
        ? { transport: update.transport }
        : {}),
      ...(update.outcome !== undefined ? { outcome: update.outcome } : {}),
      steps: update.appendStep
        ? [...current.steps, update.appendStep]
        : current.steps,
    });
    await this.#atomicWrite(
      join(this.locations.operational.operationsDir, `${operationId}.json`),
      next,
    );
    return next;
  }

  async readBatch(batchId: string): Promise<RemoteBatchRecord | null> {
    return this.#readRecord(
      join(this.locations.operational.batchesDir, `${batchId}.json`),
      batchId,
      RemoteBatchRecordSchema,
    );
  }

  async createBatch(record: RemoteBatchRecord): Promise<void> {
    const parsed = RemoteBatchRecordSchema.parse(record);
    const path = join(
      this.locations.operational.batchesDir,
      `${parsed.batchId}.json`,
    );
    assertRecordIdMatchesFilename(path, parsed.batchId);
    await this.#exclusiveWrite(path, parsed);
  }

  async updateBatch(record: RemoteBatchRecord): Promise<void> {
    const parsed = RemoteBatchRecordSchema.parse(record);
    const existing = await this.readBatch(parsed.batchId);
    if (!existing) {
      throw new Error(`Remote batch '${parsed.batchId}' does not exist.`);
    }
    await this.#atomicWrite(
      join(this.locations.operational.batchesDir, `${parsed.batchId}.json`),
      parsed,
    );
  }

  async #readRecord<T>(
    path: string,
    expectedId: string,
    schema: z.ZodType<T>,
  ): Promise<T | null> {
    try {
      const parsed = schema.parse(
        JSON.parse(await this.#dependencies.filesystem.readFile(path, 'utf8')),
      );
      assertRecordIdMatchesFilename(path, expectedId);
      return parsed;
    } catch (error) {
      if (isFilesystemError(error, 'ENOENT')) return null;
      throw error;
    }
  }

  async #listRecords<T>(
    directory: string,
    schema: z.ZodType<T>,
    id: (record: T) => string,
  ): Promise<T[]> {
    let filenames: string[];
    try {
      filenames = await this.#dependencies.filesystem.readdir(directory);
    } catch (error) {
      if (isFilesystemError(error, 'ENOENT')) return [];
      throw error;
    }
    const records: T[] = [];
    for (const filename of filenames
      .filter((name) => name.endsWith('.json'))
      .sort()) {
      const path = join(directory, filename);
      const record = schema.parse(
        JSON.parse(await this.#dependencies.filesystem.readFile(path, 'utf8')),
      );
      assertRecordIdMatchesFilename(path, id(record));
      records.push(record);
    }
    return records;
  }

  async #atomicWrite(path: string, value: unknown): Promise<void> {
    const filesystem = this.#dependencies.filesystem;
    const directory = dirname(path);
    await filesystem.mkdir(directory, { recursive: true, mode: 0o700 });
    const tempPath = `${path}.${this.#dependencies.randomId()}.tmp`;
    const handle = await filesystem.open(tempPath, 'wx', 0o600);
    try {
      await handle.writeFile(serializeRecord(value));
      await handle.sync();
    } finally {
      await handle.close();
    }
    try {
      await filesystem.rename(tempPath, path);
      await filesystem.syncDirectory(directory);
    } catch (error) {
      await ignoreMissing(() => filesystem.unlink(tempPath));
      throw error;
    }
  }

  async #exclusiveWrite(path: string, value: unknown): Promise<void> {
    const filesystem = this.#dependencies.filesystem;
    const directory = dirname(path);
    await filesystem.mkdir(directory, { recursive: true, mode: 0o700 });
    let handle: RemoteStoreFileHandle;
    try {
      handle = await filesystem.open(path, 'wx', 0o600);
    } catch (error) {
      if (isFilesystemError(error, 'EEXIST')) {
        throw new Error(`Remote record '${path}' already exists.`, {
          cause: error,
        });
      }
      throw error;
    }
    try {
      await handle.writeFile(serializeRecord(value));
      await handle.sync();
      await handle.close();
      await filesystem.syncDirectory(directory);
    } catch (error) {
      await handle.close().catch(() => undefined);
      await ignoreMissing(() => filesystem.unlink(path));
      throw error;
    }
  }
}

function serializeRecord(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function isFilesystemError(error: unknown, code: string): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === code
  );
}

async function ignoreMissing(action: () => Promise<void>): Promise<void> {
  try {
    await action();
  } catch (error) {
    if (!isFilesystemError(error, 'ENOENT')) throw error;
  }
}
