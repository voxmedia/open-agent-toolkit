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
import { isDeepStrictEqual } from 'node:util';

import type { z } from 'zod';

import {
  parseExternalAction,
  type ExternalActionEnvelope,
} from './external-action';
import { transitionRemoteOperation } from './operation-state';
import {
  PlannedBindingCreateSchema,
  RemoteBatchRecordSchema,
  RemoteBindingMetadataSchema,
  RemoteBindingStateSchema,
  RemoteOperationRecordSchema,
  VerifiedDurableRemoteIdentitySchema,
  assertRecordIdMatchesFilename,
  type RemoteBatchRecord,
  type RemoteBindingMetadata,
  type RemoteBindingState,
  type RemoteOperationOutcome,
  type RemoteOperationRecord,
  type RemoteOperationStep,
  type FieldVerification,
  type PlannedBindingCreate,
  type VerifiedDurableRemoteIdentity,
} from './schema';
import {
  parseSharedStoragePreview,
  type SharedStoragePreview,
} from './shared-storage';
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
  approval?: RemoteOperationRecord['approval'];
  selectedExecution?: RemoteOperationRecord['selectedExecution'];
  outcome?: RemoteOperationOutcome;
  appendStep?: RemoteOperationStep;
  verification?: FieldVerification[];
  lastSafeStep?: RemoteOperationRecord['lastSafeStep'];
  retryDisposition?: RemoteOperationRecord['retryDisposition'];
  appendAttempt?: RemoteOperationRecord['attempts'][number];
  completeAttempt?: {
    attemptId: string;
    completedAt: string;
    receiptDigest: string;
  };
  appendObservation?: RemoteOperationRecord['observations'][number];
  appendMaterializationStep?: NonNullable<
    RemoteOperationRecord['materializationSteps']
  >[number];
  materializationPlan?: NonNullable<
    RemoteOperationRecord['materializationPlan']
  >;
  verificationHandoff?: NonNullable<
    RemoteOperationRecord['verificationHandoff']
  >;
  currentAction?: NonNullable<RemoteOperationRecord['currentAction']>;
}

export interface ConcurrentOperationIntentInspection {
  bindingState: RemoteBindingState | null;
  activeOperations: RemoteOperationRecord[];
  hasConcurrentIntents: boolean;
}

const ACTIVE_OPERATION_STATES: ReadonlySet<RemoteOperationState> = new Set([
  'planned',
  'pending',
  'authorized',
  'attempt-started',
  'verification-pending',
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

  async materializeVerifiedBinding(
    operationId: string,
    record: RemoteBindingMetadata,
    verification: VerifiedDurableRemoteIdentity,
  ): Promise<void> {
    const parsed = RemoteBindingMetadataSchema.parse(record);
    assertVerifiedDurableRemoteIdentity(parsed, verification);
    const operation = await this.readOperation(operationId);
    assertMaterializationMatchesCreateIntent(
      operationId,
      operation,
      parsed,
      verification,
    );
    const path = join(
      this.locations.portable.bindingsDir,
      `${parsed.bindingId}.json`,
    );
    assertRecordIdMatchesFilename(path, parsed.bindingId);
    const existing = await this.readBindingMetadata(parsed.bindingId);
    if (existing) {
      if (!isDeepStrictEqual(existing, parsed)) {
        throw new Error(
          `Binding metadata '${parsed.bindingId}' conflicts with its materialization plan.`,
        );
      }
      return;
    }
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

  async readCurrentAction(
    operationId: string,
  ): Promise<ExternalActionEnvelope | null> {
    const operation = await this.readOperation(operationId);
    if (operation?.currentAction) {
      return parseExternalAction(operation.currentAction);
    }
    try {
      return parseExternalAction(
        JSON.parse(
          await this.#dependencies.filesystem.readFile(
            join(
              this.locations.operational.operationsDir,
              `${operationId}.action`,
            ),
            'utf8',
          ),
        ),
      );
    } catch (error) {
      if (isFilesystemError(error, 'ENOENT')) return null;
      throw error;
    }
  }

  async writeCurrentAction(
    operationId: string,
    action: ExternalActionEnvelope,
  ): Promise<void> {
    const parsed = await this.writeActionEvidence(operationId, action);
    await this.#atomicWrite(
      join(this.locations.operational.operationsDir, `${operationId}.action`),
      parsed,
    );
  }

  async writeActionEvidence(
    operationId: string,
    action: ExternalActionEnvelope,
  ): Promise<ExternalActionEnvelope> {
    const parsed = parseExternalAction(action);
    if (parsed.operationId !== operationId) {
      throw new Error(
        'External action operationId does not match its durable path.',
      );
    }
    const evidencePath = join(
      this.locations.operational.operationsDir,
      `${operationId}.${parsed.stepId}.action`,
    );
    try {
      await this.#exclusiveWrite(evidencePath, parsed);
    } catch (error) {
      const existing = await this.readAction(operationId, parsed.stepId);
      if (!existing || !isDeepStrictEqual(existing, parsed)) throw error;
    }
    return parsed;
  }

  async retireCurrentAction(
    operationId: string,
    expectedAction: ExternalActionEnvelope,
  ): Promise<void> {
    const parsed = parseExternalAction(expectedAction);
    if (parsed.operationId !== operationId) {
      throw new Error(
        'External action operationId does not match its durable path.',
      );
    }
    const pointerPath = join(
      this.locations.operational.operationsDir,
      `${operationId}.action`,
    );
    let current: ExternalActionEnvelope;
    try {
      current = parseExternalAction(
        JSON.parse(
          await this.#dependencies.filesystem.readFile(pointerPath, 'utf8'),
        ),
      );
    } catch (error) {
      if (isFilesystemError(error, 'ENOENT')) {
        throw new Error(
          'Durable current action pointer is missing before verification handoff.',
          { cause: error },
        );
      }
      throw error;
    }
    if (!isDeepStrictEqual(current, parsed)) {
      throw new Error(
        'Durable current action pointer contradicts the accepted mutation.',
      );
    }
    await this.#dependencies.filesystem.unlink(pointerPath);
    await this.#dependencies.filesystem.syncDirectory(
      this.locations.operational.operationsDir,
    );
  }

  async readAction(
    operationId: string,
    stepId: string,
  ): Promise<ExternalActionEnvelope | null> {
    try {
      return parseExternalAction(
        JSON.parse(
          await this.#dependencies.filesystem.readFile(
            join(
              this.locations.operational.operationsDir,
              `${operationId}.${stepId}.action`,
            ),
            'utf8',
          ),
        ),
      );
    } catch (error) {
      if (isFilesystemError(error, 'ENOENT')) return null;
      throw error;
    }
  }

  async readSharedStoragePreview(): Promise<SharedStoragePreview | null> {
    try {
      return parseSharedStoragePreview(
        JSON.parse(
          await this.#dependencies.filesystem.readFile(
            join(
              this.locations.operational.root,
              'shared-storage-preview.json',
            ),
            'utf8',
          ),
        ),
      );
    } catch (error) {
      if (isFilesystemError(error, 'ENOENT')) return null;
      throw error;
    }
  }

  async writeSharedStoragePreview(
    preview: SharedStoragePreview,
  ): Promise<void> {
    await this.#atomicWrite(
      join(this.locations.operational.root, 'shared-storage-preview.json'),
      parseSharedStoragePreview(preview),
    );
  }

  async materializeIntakeBinding(record: RemoteBindingMetadata): Promise<void> {
    const parsed = RemoteBindingMetadataSchema.parse(record);
    const path = join(
      this.locations.portable.bindingsDir,
      `${parsed.bindingId}.json`,
    );
    assertRecordIdMatchesFilename(path, parsed.bindingId);
    try {
      await this.#exclusiveWrite(path, parsed);
    } catch (error) {
      const existing = await this.readBindingMetadata(parsed.bindingId);
      if (!existing || !isDeepStrictEqual(existing, parsed)) throw error;
    }
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

  async createBindingIntent(intent: PlannedBindingCreate): Promise<void> {
    const parsed = PlannedBindingCreateSchema.parse(intent);
    await this.createOperation({
      recordType: 'operation',
      schemaVersion: 2,
      operationId: parsed.operationId,
      correlationId: parsed.operationId,
      bindingId: parsed.bindingId,
      provider: parsed.provider,
      providerContext: parsed.providerContext,
      lifecycleOperation: 'publish',
      operationClass: 'create',
      state: 'planned',
      reason: null,
      lastSafeStep: 'planned',
      preview: {
        digest: parsed.provenanceToken,
        bindingId: parsed.bindingId,
        provider: parsed.provider,
        providerContext: parsed.providerContext,
        capabilityEvidenceDigest: 'unprobed',
        revisionDigest: 'unbound',
        policyDigest: parsed.provenanceToken,
      },
      authority: {
        effective:
          parsed.policyRestrictions.authority?.operations?.create ??
          parsed.policyRestrictions.authority?.default ??
          'read-only',
        sourceDigest: parsed.provenanceToken,
      },
      approval: null,
      createdAt: parsed.createdAt,
      updatedAt: parsed.createdAt,
      selectedExecution: null,
      attempts: [],
      observations: [],
      verification: [],
      retryDisposition: 'safe-before-attempt',
      steps: [],
      outcome: {
        classification: 'pending',
        message: null,
        verifiedAt: null,
      },
      createIntent: parsed,
    });
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
    if (
      current.operationClass !== null &&
      update.state !== current.state &&
      (current.attempts.length > 0 ||
        update.appendAttempt !== undefined ||
        update.appendObservation !== undefined)
    ) {
      transitionRemoteOperation(current.state, update.state);
    }
    if (
      update.appendAttempt &&
      current.attempts.some(
        (attempt) => attempt.attemptId === update.appendAttempt!.attemptId,
      )
    ) {
      throw new Error('Remote operation attempt evidence is a duplicate.');
    }
    if (
      update.appendObservation?.actionDigest &&
      current.observations.some(
        (item) => item.actionDigest === update.appendObservation!.actionDigest,
      )
    ) {
      throw new Error('Remote operation observation evidence is a duplicate.');
    }
    if (
      update.appendMaterializationStep &&
      (current.materializationSteps ?? []).some(
        (item) => item.step === update.appendMaterializationStep!.step,
      )
    ) {
      throw new Error('Remote operation materialization step is a duplicate.');
    }
    if (
      update.materializationPlan &&
      current.materializationPlan &&
      !isDeepStrictEqual(
        update.materializationPlan,
        current.materializationPlan,
      )
    ) {
      throw new Error('Remote operation materialization plan is immutable.');
    }
    if (
      update.verificationHandoff &&
      current.verificationHandoff &&
      !isDeepStrictEqual(
        update.verificationHandoff,
        current.verificationHandoff,
      )
    ) {
      throw new Error('Remote operation verification handoff is immutable.');
    }
    if (
      update.currentAction &&
      current.currentAction &&
      !isDeepStrictEqual(update.currentAction, current.currentAction)
    ) {
      throw new Error(
        'Remote operation canonical current action is immutable.',
      );
    }
    let attempts = update.appendAttempt
      ? [...current.attempts, update.appendAttempt]
      : current.attempts;
    if (update.completeAttempt) {
      const index = attempts.findIndex(
        (attempt) => attempt.attemptId === update.completeAttempt!.attemptId,
      );
      if (index < 0 || attempts[index]!.completedAt) {
        throw new Error('Remote operation attempt completion is stale.');
      }
      attempts = attempts.map((attempt, attemptIndex) =>
        attemptIndex === index
          ? {
              ...attempt,
              completedAt: update.completeAttempt!.completedAt,
              receiptDigest: update.completeAttempt!.receiptDigest,
            }
          : attempt,
      );
    }
    const next = RemoteOperationRecordSchema.parse({
      ...current,
      state: update.state,
      updatedAt: update.updatedAt,
      ...(update.selectedExecution !== undefined
        ? { selectedExecution: update.selectedExecution }
        : {}),
      ...(update.outcome !== undefined ? { outcome: update.outcome } : {}),
      ...(update.approval !== undefined ? { approval: update.approval } : {}),
      ...(update.verification !== undefined
        ? { verification: update.verification }
        : {}),
      ...(update.lastSafeStep !== undefined
        ? { lastSafeStep: update.lastSafeStep }
        : {}),
      ...(update.retryDisposition !== undefined
        ? { retryDisposition: update.retryDisposition }
        : {}),
      attempts,
      observations: update.appendObservation
        ? [...current.observations, update.appendObservation]
        : current.observations,
      steps: update.appendStep
        ? [...current.steps, update.appendStep]
        : current.steps,
      materializationSteps: update.appendMaterializationStep
        ? [
            ...(current.materializationSteps ?? []),
            update.appendMaterializationStep,
          ]
        : current.materializationSteps,
      ...(update.materializationPlan !== undefined
        ? { materializationPlan: update.materializationPlan }
        : {}),
      ...(update.verificationHandoff !== undefined
        ? { verificationHandoff: update.verificationHandoff }
        : {}),
      ...(update.currentAction !== undefined
        ? { currentAction: update.currentAction }
        : {}),
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

function assertVerifiedDurableRemoteIdentity(
  record: RemoteBindingMetadata,
  verification: VerifiedDurableRemoteIdentity | undefined,
): void {
  const result = VerifiedDurableRemoteIdentitySchema.safeParse(verification);
  if (
    !result.success ||
    result.data.provider !== record.provider ||
    result.data.stableId !== record.remoteIdentity.stableId
  ) {
    throw new Error(
      'Portable binding metadata requires a verified durable remote identity.',
    );
  }
}

function assertMaterializationMatchesCreateIntent(
  operationId: string,
  operation: RemoteOperationRecord | null,
  record: RemoteBindingMetadata,
  verification: VerifiedDurableRemoteIdentity,
): void {
  if (!operation?.createIntent || operation.operationClass !== 'create') {
    throw new Error(
      `Create operation journal '${operationId}' does not contain binding intent.`,
    );
  }
  if (
    !['pending', 'verification-pending', 'partial', 'verified'].includes(
      operation.state,
    ) ||
    !['partial', 'verified'].includes(operation.outcome.classification) ||
    !operation.verification.some(
      (item) =>
        item.field === 'remoteIdentity' &&
        item.status === 'verified' &&
        item.observedHash === verification.evidenceDigest,
    )
  ) {
    throw new Error(
      `Create operation journal '${operationId}' is not in a verified materialization state.`,
    );
  }
  const intent = operation.createIntent;
  const mismatches: string[] = [];
  if (operation.bindingId !== record.bindingId) mismatches.push('bindingId');
  if (operation.provider !== record.provider) mismatches.push('provider');
  if (!isDeepStrictEqual(intent.target, record.target))
    mismatches.push('target');
  if (
    !isDeepStrictEqual(intent.providerContext, record.remoteIdentity.context)
  ) {
    mismatches.push('providerContext');
  }
  if (!isDeepStrictEqual(intent.purposes, record.purposes)) {
    mismatches.push('purposes');
  }
  if (
    !isDeepStrictEqual(intent.policyRestrictions, record.policyRestrictions)
  ) {
    mismatches.push('policyRestrictions');
  }
  if (
    !isDeepStrictEqual(
      intent.publicationProjection,
      record.publicationProjection,
    )
  ) {
    mismatches.push('publicationProjection');
  }
  if (intent.provenanceToken !== record.provenanceToken) {
    mismatches.push('provenance');
  }
  if (
    intent.target.kind === 'project' &&
    (intent.projectionStatus !== 'complete' ||
      intent.localProjection?.source !== 'explicit-project-publication')
  ) {
    mismatches.push('localProjection');
  }
  if (mismatches.length > 0) {
    throw new Error(
      `Binding metadata does not match create intent fields: ${mismatches.join(', ')}.`,
    );
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
