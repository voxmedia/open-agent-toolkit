import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { buildExternalAction } from './external-action';
import { assessOutboundProjectionSafety } from './outbound-projection-safety';
import type {
  RemoteBindingMetadata,
  RemoteBindingState,
  RemoteOperationRecord,
} from './schema';
import {
  RemoteSyncStore,
  defaultRemoteStoreFilesystem,
  type RemoteStoreFilesystem,
} from './store';

const timestamp = '2026-08-31T00:00:00.000Z';
const verification = {
  provider: 'github' as const,
  stableId: 'issue-node-123',
  verifiedAt: '2026-08-31T00:01:00.000Z',
  evidenceDigest: 'sha256:verified-readback',
};

function metadata(bindingId = 'bnd_binding_123'): RemoteBindingMetadata {
  return {
    recordType: 'binding-metadata',
    schemaVersion: 1,
    bindingId,
    provider: 'github',
    target: {
      kind: 'backlog',
      scope: 'shared',
      id: 'item-123',
      path: '.oat/repo/pjm/backlog/item-123.md',
    },
    remoteIdentity: {
      stableId: 'issue-node-123',
      context: { host: 'github.com', repositoryId: 'repo-123' },
      aliases: [],
    },
    identityHistory: [],
    purposes: ['source'],
    policyRestrictions: {},
    publicationProjection: {
      title: 'frontmatter',
      description: 'description-section',
      priority: 'frontmatter',
    },
    provenanceToken: `oat-binding:${bindingId}`,
    lifecycle: 'active',
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function bindingState(bindingId = 'bnd_binding_123'): RemoteBindingState {
  return {
    recordType: 'binding-state',
    schemaVersion: 2,
    bindingId,
    provider: 'github',
    metadataUpdatedAt: timestamp,
    localProjection: {
      title: 'Local title',
      description: 'Local description',
      priority: null,
      source: 'backlog-description',
      sourceRevision: 'sha256:local-revision',
      observedAt: timestamp,
    },
    snapshot: null,
    baseline: null,
    capability: null,
    contentRedacted: false,
    lifecycle: 'active',
    lifecycleCondition: 'active',
    activeOperationIds: [],
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function operation(
  operationId = 'op_operation_123',
  bindingId = 'bnd_binding_123',
): RemoteOperationRecord {
  return {
    recordType: 'operation',
    schemaVersion: 2,
    operationId,
    correlationId: `corr_${operationId}`,
    bindingId,
    provider: 'github',
    providerContext: { host: 'github.com', repositoryId: 'repo-123' },
    lifecycleOperation: 'reconcile',
    operationClass: 'update-fields',
    state: 'planned',
    reason: null,
    lastSafeStep: 'planned',
    preview: {
      digest: `sha256:${operationId}`,
      bindingId,
      provider: 'github',
      providerContext: { host: 'github.com', repositoryId: 'repo-123' },
      capabilityEvidenceDigest: 'sha256:capability',
      revisionDigest: 'sha256:revision',
      policyDigest: 'sha256:policy',
    },
    authority: {
      effective: 'user-approved',
      sourceDigest: 'sha256:policy',
    },
    approval: null,
    createdAt: timestamp,
    updatedAt: timestamp,
    selectedExecution: null,
    attempts: [],
    observations: [],
    verification: [],
    retryDisposition: 'safe-before-attempt',
    steps: [],
    outcome: { classification: 'pending', message: null, verifiedAt: null },
  };
}

async function createVerifiedBinding(
  store: RemoteSyncStore,
  record: RemoteBindingMetadata,
): Promise<void> {
  const operationId = `op_${record.bindingId}`;
  await store.createBindingIntent({
    schemaVersion: 1,
    bindingId: record.bindingId,
    operationId,
    provider: record.provider,
    target: record.target,
    publicationProjection: record.publicationProjection,
    providerContext: record.remoteIdentity.context,
    purposes: record.purposes,
    policyRestrictions: record.policyRestrictions,
    provenanceToken: record.provenanceToken,
    createdAt: record.createdAt,
  });
  await store.transitionOperation(operationId, 'planned', {
    state: 'verified',
    updatedAt: verification.verifiedAt,
    verification: [
      {
        field: 'remoteIdentity',
        expectedHash: verification.evidenceDigest,
        observedHash: verification.evidenceDigest,
        status: 'verified',
      },
    ],
    outcome: {
      classification: 'verified',
      message: 'durable identity verified',
      verifiedAt: verification.verifiedAt,
    },
  });
  await store.materializeVerifiedBinding(operationId, record, verification);
}

describe('RemoteSyncStore', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tempDirs.map(async (dir) => rm(dir, { recursive: true, force: true })),
    );
    tempDirs.length = 0;
  });

  async function createStore(
    filesystem: RemoteStoreFilesystem = defaultRemoteStoreFilesystem,
  ): Promise<{ root: string; store: RemoteSyncStore }> {
    const root = await mkdtemp(join(tmpdir(), 'oat-remote-store-'));
    tempDirs.push(root);
    const portableBindingsDir = join(root, 'portable', 'bindings');
    const operationalRoot = join(root, 'operational');
    await mkdir(root, { recursive: true });
    return {
      root,
      store: new RemoteSyncStore(
        {
          repositoryFingerprint: 'fingerprint',
          portable: {
            storageClass: 'shared',
            bindingsDir: portableBindingsDir,
          },
          operational: {
            storageClass: 'local',
            root: operationalRoot,
            bindingsDir: join(operationalRoot, 'bindings'),
            operationsDir: join(operationalRoot, 'operations'),
            batchesDir: join(operationalRoot, 'batches'),
          },
        },
        { filesystem, randomId: () => `tmp_${crypto.randomUUID()}` },
      ),
    };
  }

  it('keeps portable metadata and operational binding state in separate classes', async () => {
    const { root, store } = await createStore();
    await createVerifiedBinding(store, metadata());
    await store.writeBindingState(bindingState());

    expect(await store.readBindingMetadata('bnd_binding_123')).toEqual(
      metadata(),
    );
    expect(await store.readBindingState('bnd_binding_123')).toEqual(
      bindingState(),
    );
    expect(
      JSON.parse(
        await readFile(
          join(root, 'portable', 'bindings', 'bnd_binding_123.json'),
          'utf8',
        ),
      ),
    ).toEqual(metadata());
  });

  it('uses unique temp files, restrictive modes, fsync, and rename', async () => {
    const events: string[] = [];
    let tempCounter = 0;
    const filesystem: RemoteStoreFilesystem = {
      ...defaultRemoteStoreFilesystem,
      open: async (...args) => {
        events.push(`open:${String(args[0])}:${String(args[1])}`);
        const handle = await defaultRemoteStoreFilesystem.open(...args);
        return {
          writeFile: async (data) => handle.writeFile(data),
          sync: async () => {
            events.push('sync:file');
            await handle.sync();
          },
          close: async () => handle.close(),
        };
      },
      rename: async (from, to) => {
        events.push(`rename:${from}:${to}`);
        await defaultRemoteStoreFilesystem.rename(from, to);
      },
      syncDirectory: async (path) => {
        events.push(`sync:dir:${path}`);
        await defaultRemoteStoreFilesystem.syncDirectory(path);
      },
    };
    const root = await mkdtemp(join(tmpdir(), 'oat-remote-store-'));
    tempDirs.push(root);
    const operationalRoot = join(root, 'operational');
    const store = new RemoteSyncStore(
      {
        repositoryFingerprint: 'fingerprint',
        portable: {
          storageClass: 'shared',
          bindingsDir: join(root, 'portable', 'bindings'),
        },
        operational: {
          storageClass: 'local',
          root: operationalRoot,
          bindingsDir: join(operationalRoot, 'bindings'),
          operationsDir: join(operationalRoot, 'operations'),
          batchesDir: join(operationalRoot, 'batches'),
        },
      },
      { filesystem, randomId: () => `temp_${++tempCounter}` },
    );

    await store.writeBindingState(bindingState());
    await store.writeBindingState({
      ...bindingState(),
      updatedAt: '2026-08-31T00:01:00.000Z',
    });

    expect(events.filter((event) => event.includes('.temp_'))).toEqual(
      expect.arrayContaining([
        expect.stringContaining('.temp_1'),
        expect.stringContaining('.temp_2'),
      ]),
    );
    expect(events).toContain('sync:file');
    expect(events.some((event) => event.startsWith('rename:'))).toBe(true);
    expect(events.some((event) => event.startsWith('sync:dir:'))).toBe(true);
    expect(
      (await stat(join(operationalRoot, 'bindings', 'bnd_binding_123.json')))
        .mode & 0o777,
    ).toBe(0o600);
  });

  it('validates schemas and filename identity before persistence', async () => {
    const { store } = await createStore();
    await expect(
      store.materializeVerifiedBinding(
        'op_operation_123',
        {
          ...metadata(),
          bindingId: '../escape',
        } as RemoteBindingMetadata,
        verification,
      ),
    ).rejects.toThrow();
  });

  it('rejects direct persistence of signaled canonical snapshot fields', async () => {
    const { store } = await createStore();
    const unsafeState = {
      ...bindingState(),
      snapshot: {
        recordType: 'snapshot',
        schemaVersion: 2,
        snapshotId: 'snap_snapshot_123',
        bindingId: 'bnd_binding_123',
        provider: 'github',
        observedAt: timestamp,
        observedBy: {
          provider: 'github',
          surfaceKind: 'connector',
          context: { host: 'github.com', repositoryId: 'repo-123' },
          evidenceDigest: 'sha256:capability',
          semanticCapabilities: ['read'],
        },
        identity: {
          stableId: 'issue-node-123',
          context: { host: 'github.com', repositoryId: 'repo-123' },
          aliases: [],
        },
        revision: {
          strength: 'hash-only',
          token: null,
          updatedAt: timestamp,
          contentHash: 'sha256:remote',
        },
        issue: {
          title: 'Remote title',
          description: 'password direct-store-private-tail',
          priority: null,
          status: 'open',
        },
        lifecycle: 'active',
        contentRedacted: false,
        redactionCount: 0,
        redactions: [],
      },
    } as unknown as RemoteBindingState;

    await expect(store.writeBindingState(unsafeState)).rejects.toThrow(
      /sensitive-content/i,
    );
  });

  it('migrates a prior schema-v1 snapshot before restart persistence', async () => {
    const { root, store } = await createStore();
    const bindingsDir = join(root, 'operational', 'bindings');
    await mkdir(bindingsDir, { recursive: true });
    await writeFile(
      join(bindingsDir, 'bnd_binding_123.json'),
      JSON.stringify({
        ...bindingState(),
        snapshot: {
          recordType: 'snapshot',
          schemaVersion: 1,
          snapshotId: 'snap_snapshot_legacy',
          bindingId: 'bnd_binding_123',
          provider: 'github',
          observedAt: timestamp,
          observedBy: {
            provider: 'github',
            transport: 'legacy-native-surface',
            context: { host: 'github.com', repositoryId: 'repo-123' },
            capabilityDigest: 'sha256:capability',
          },
          identity: {
            stableId: 'issue-node-123',
            context: { host: 'github.com', repositoryId: 'repo-123' },
            aliases: [],
          },
          revision: {
            strength: 'hash-only',
            token: null,
            updatedAt: timestamp,
            contentHash: 'sha256:remote',
          },
          issue: {
            title: 'Remote title',
            description: 'password=[REDACTED:CREDENTIAL] restart-private-tail',
            priority: null,
            status: 'open',
          },
          lifecycle: 'active',
          contentRedacted: true,
          redactionCount: 1,
          redactions: [{ field: 'description', reason: 'credential' }],
        },
        contentRedacted: true,
      }),
    );

    const migrated = await store.readBindingState('bnd_binding_123');
    expect(migrated?.snapshot).toMatchObject({
      schemaVersion: 2,
      issue: { description: '[SUPPRESSED:SENSITIVE-CONTENT]' },
      redactions: [
        {
          field: { kind: 'core', name: 'description' },
          reason: 'sensitive-content',
          representation: 'whole-field-marker',
        },
      ],
    });
    expect(JSON.stringify(migrated)).not.toContain('restart-private-tail');

    await store.writeBindingState(migrated!);
    const persisted = JSON.parse(
      await readFile(join(bindingsDir, 'bnd_binding_123.json'), 'utf8'),
    );
    expect(persisted.snapshot.schemaVersion).toBe(2);
    expect(persisted.snapshot.issue.description).toBe(
      '[SUPPRESSED:SENSITIVE-CONTENT]',
    );
    expect(JSON.stringify(persisted)).not.toContain('restart-private-tail');
  });

  it('creates operation journals exclusively', async () => {
    const { store } = await createStore();
    await store.createOperation(operation());
    await expect(store.createOperation(operation())).rejects.toThrow(
      /already exists/i,
    );
  });

  it('keeps actions and mutation evidence append-only across a filesystem restart', async () => {
    const { store } = await createStore();
    const action = buildExternalAction({
      operationId: 'op_operation_123',
      stepId: 'step_mutate_123',
      provider: 'github',
      semanticOperation: 'read',
      context: { host: 'github.com', repositoryId: 'repo-123' },
      intent: { stableId: 'issue-node-123' },
      expectedObservation: {
        fields: ['title'],
        requireIdentity: true,
        stableId: 'issue-node-123',
        capabilityEvidenceDigest: 'sha256:capability',
      },
      persistedPreview: {},
    });
    await store.createOperation({
      ...operation(),
      state: 'authorized',
      lastSafeStep: 'authorized',
      selectedExecution: {
        provider: 'github',
        surfaceKind: 'connector',
        context: { host: 'github.com', repositoryId: 'repo-123' },
        evidenceDigest: 'sha256:capability',
        semanticCapabilities: ['update'],
      },
    });
    await store.writeCurrentAction(action.operationId, action);
    await store.transitionOperation(action.operationId, 'authorized', {
      state: 'attempt-started',
      updatedAt: '2026-08-31T00:01:00.000Z',
      appendAttempt: {
        attemptId: action.stepId,
        startedAt: '2026-08-31T00:01:00.000Z',
        completedAt: null,
        execution: (await store.readOperation(action.operationId))!
          .selectedExecution!,
        requestDigest: action.actionDigest,
        receiptDigest: null,
      },
      lastSafeStep: 'attempt-started',
      retryDisposition: 'reconcile-required',
    });
    const observation = {
      observedAt: '2026-08-31T00:02:00.000Z',
      classification: 'committed' as const,
      evidenceDigest: 'sha256:receipt',
      actionDigest: action.actionDigest,
    };
    await store.transitionOperation(action.operationId, 'attempt-started', {
      state: 'verification-pending',
      updatedAt: observation.observedAt,
      appendObservation: observation,
      completeAttempt: {
        attemptId: action.stepId,
        completedAt: observation.observedAt,
        receiptDigest: observation.evidenceDigest,
      },
      lastSafeStep: 'verification-pending',
      retryDisposition: 'reconcile-required',
    });
    expect(await store.readAction(action.operationId, action.stepId)).toEqual(
      action,
    );
    await expect(
      store.transitionOperation(action.operationId, 'verification-pending', {
        state: 'verification-pending',
        updatedAt: observation.observedAt,
        appendObservation: observation,
      }),
    ).rejects.toThrow(/duplicate/i);
    await expect(
      store.readOperation(action.operationId),
    ).resolves.toMatchObject({
      lastSafeStep: 'verification-pending',
      retryDisposition: 'reconcile-required',
      attempts: [{ completedAt: observation.observedAt }],
      observations: [observation],
    });
  });

  it('repairs a failed current-action pointer from exact append-only action evidence', async () => {
    let failCurrentPointer = true;
    const filesystem: RemoteStoreFilesystem = {
      ...defaultRemoteStoreFilesystem,
      rename: async (from, to) => {
        if (failCurrentPointer && to.endsWith('op_operation_123.action')) {
          failCurrentPointer = false;
          throw new Error('injected current action pointer failure');
        }
        await defaultRemoteStoreFilesystem.rename(from, to);
      },
    };
    const { store } = await createStore(filesystem);
    const projection = { title: 'Safe title' };
    const outboundSafety = assessOutboundProjectionSafety(projection, {
      assessedAt: timestamp,
    });
    const action = buildExternalAction({
      operationId: 'op_operation_123',
      stepId: 'step_create_123',
      provider: 'github',
      semanticOperation: 'create',
      context: { host: 'github.com', repositoryId: 'repo-123' },
      intent: {
        target: { kind: 'backlog', scope: 'shared', id: 'item-123' },
        fields: projection,
        provenanceToken: 'oat-binding:bnd_binding_123',
      },
      expectedObservation: {
        fields: ['title'],
        requireIdentity: true,
        stableId: null,
        capabilityEvidenceDigest: 'sha256:capability',
      },
      persistedPreview: {
        projectionDigest: outboundSafety.projectionDigest,
        safetyResultDigest: outboundSafety.resultDigest,
      },
      projection,
      outboundSafety,
    });

    await expect(
      store.writeCurrentAction(action.operationId, action),
    ).rejects.toThrow(/current action pointer failure/i);
    await expect(
      store.readAction(action.operationId, action.stepId),
    ).resolves.toEqual(action);
    await expect(
      store.readCurrentAction(action.operationId),
    ).resolves.toBeNull();

    const restarted = new RemoteSyncStore(store.locations);
    await restarted.writeCurrentAction(action.operationId, action);
    await expect(
      restarted.readCurrentAction(action.operationId),
    ).resolves.toEqual(action);
  });

  it('atomically journals accepted identity and the exact verification action', async () => {
    const { store } = await createStore();
    const projection = { title: 'Safe title' };
    const outboundSafety = assessOutboundProjectionSafety(projection, {
      assessedAt: timestamp,
    });
    const createAction = buildExternalAction({
      operationId: 'op_operation_123',
      stepId: 'step_create_123',
      provider: 'github',
      semanticOperation: 'create',
      context: { host: 'github.com', repositoryId: 'repo-123' },
      intent: {
        target: { kind: 'backlog', scope: 'shared', id: 'item-123' },
        fields: projection,
        provenanceToken: 'oat-binding:bnd_binding_123',
      },
      expectedObservation: {
        fields: ['title'],
        requireIdentity: true,
        stableId: null,
        capabilityEvidenceDigest: 'sha256:capability',
      },
      persistedPreview: {
        projectionDigest: outboundSafety.projectionDigest,
        safetyResultDigest: outboundSafety.resultDigest,
      },
      projection,
      outboundSafety,
    });
    const verificationAction = buildExternalAction({
      operationId: createAction.operationId,
      stepId: 'verify_create_123',
      provider: 'github',
      semanticOperation: 'read',
      context: { host: 'github.com', repositoryId: 'repo-123' },
      intent: { stableId: 'issue-node-123' },
      expectedObservation: {
        fields: ['title'],
        requireIdentity: true,
        stableId: 'issue-node-123',
        capabilityEvidenceDigest: 'sha256:capability',
      },
      persistedPreview: {},
    });
    const selectedExecution = {
      provider: 'github' as const,
      surfaceKind: 'connector' as const,
      context: { host: 'github.com', repositoryId: 'repo-123' },
      evidenceDigest: 'sha256:capability',
      semanticCapabilities: ['create'],
    };
    await store.createOperation({
      ...operation(),
      lifecycleOperation: 'publish',
      operationClass: 'create',
      state: 'attempt-started',
      lastSafeStep: 'attempt-started',
      selectedExecution,
      attempts: [
        {
          attemptId: createAction.stepId,
          startedAt: timestamp,
          completedAt: null,
          execution: selectedExecution,
          requestDigest: createAction.actionDigest,
          receiptDigest: null,
        },
      ],
      retryDisposition: 'reconcile-required',
    });
    await store.writeCurrentAction(createAction.operationId, createAction);
    const observation = {
      observedAt: '2026-08-31T00:02:00.000Z',
      classification: 'committed' as const,
      evidenceDigest: 'sha256:accepted-observation',
      actionDigest: createAction.actionDigest,
    };
    await store.transitionOperation(
      createAction.operationId,
      'attempt-started',
      {
        state: 'verification-pending',
        updatedAt: observation.observedAt,
        appendObservation: observation,
        completeAttempt: {
          attemptId: createAction.stepId,
          completedAt: observation.observedAt,
          receiptDigest: observation.evidenceDigest,
        },
        lastSafeStep: 'verification-pending',
        retryDisposition: 'reconcile-required',
        verificationHandoff: {
          acceptedMutation: {
            actionDigest: createAction.actionDigest,
            observedAt: observation.observedAt,
            evidenceDigest: observation.evidenceDigest,
            stableId: 'issue-node-123',
          },
          verificationAction,
        },
      },
    );

    const restarted = new RemoteSyncStore(store.locations);
    await expect(
      restarted.readOperation(createAction.operationId),
    ).resolves.toMatchObject({
      state: 'verification-pending',
      verificationHandoff: {
        acceptedMutation: { stableId: 'issue-node-123' },
        verificationAction,
      },
      observations: [observation],
      attempts: [{ completedAt: observation.observedAt }],
    });
    await expect(
      restarted.readCurrentAction(createAction.operationId),
    ).resolves.toEqual(createAction);
  });

  it('requires expected state transitions and rejects duplicate steps', async () => {
    const { store } = await createStore();
    const annotationStep = {
      stepId: 'step_annotate_123',
      semanticOperation: 'annotate' as const,
      state: 'planned' as const,
      actionDigest: 'sha256:annotation-step',
      previewDigest: 'sha256:preview',
      authority: {
        effective: 'user-approved' as const,
        sourceDigest: 'sha256:policy',
      },
      approvalRequirement: 'fresh-approval' as const,
      approval: null,
      attempts: [],
      verification: [],
      retryDisposition: 'safe-before-attempt' as const,
    };
    await store.createOperation({
      ...operation(),
      lifecycleOperation: 'closeout',
      operationClass: 'composite',
      authority: null,
      steps: [annotationStep],
    });
    await expect(
      store.transitionOperation('op_operation_123', 'authorized', {
        state: 'attempt-started',
        updatedAt: '2026-08-31T00:01:00.000Z',
      }),
    ).rejects.toThrow(/expected.*authorized.*found.*planned/i);

    const step = {
      stepId: 'step_transition_123',
      semanticOperation: 'transition' as const,
      state: 'authorized' as const,
      actionDigest: 'sha256:step',
      previewDigest: 'sha256:preview',
      authority: {
        effective: 'user-approved' as const,
        sourceDigest: 'sha256:policy',
      },
      approvalRequirement: 'fresh-approval' as const,
      approval: null,
      attempts: [],
      verification: [],
      retryDisposition: 'safe-before-attempt' as const,
    };
    await store.transitionOperation('op_operation_123', 'planned', {
      state: 'authorized',
      updatedAt: '2026-08-31T00:01:00.000Z',
      appendStep: step,
    });
    await expect(
      store.transitionOperation('op_operation_123', 'authorized', {
        state: 'attempt-started',
        updatedAt: '2026-08-31T00:02:00.000Z',
        appendStep: step,
      }),
    ).rejects.toThrow(/duplicate stepId/i);
  });

  it('preserves simultaneous unique journals and derives concurrent-intent conflicts', async () => {
    const { store } = await createStore();
    await store.writeBindingState({
      ...bindingState(),
      activeOperationIds: ['op_operation_123'],
    });

    await Promise.all([
      store.createOperation({
        ...operation('op_operation_123'),
        state: 'pending',
      }),
      store.createOperation({
        ...operation('op_operation_456'),
        state: 'verification-pending',
      }),
    ]);

    expect(
      (await store.listActiveOperations('bnd_binding_123')).map(
        (record) => record.operationId,
      ),
    ).toEqual(['op_operation_123', 'op_operation_456']);
    await expect(
      store.detectConcurrentOperationIntents('bnd_binding_123'),
    ).resolves.toMatchObject({
      bindingState: { activeOperationIds: ['op_operation_123'] },
      hasConcurrentIntents: true,
      activeOperations: [
        { operationId: 'op_operation_123' },
        { operationId: 'op_operation_456' },
      ],
    });
  });

  it('persists pre-create intent before identity and materializes only after verification', async () => {
    const { store } = await createStore();
    const intent = {
      schemaVersion: 1 as const,
      bindingId: 'bnd_binding_789',
      operationId: 'op_operation_789',
      provider: 'github' as const,
      target: {
        kind: 'backlog' as const,
        scope: 'shared' as const,
        id: 'item-789',
        path: '.oat/repo/pjm/backlog/item-789.md',
      },
      publicationProjection: {
        title: 'frontmatter' as const,
        description: 'description-section' as const,
        priority: 'frontmatter' as const,
      },
      providerContext: {
        host: 'github.com',
        owner: 'voxmedia',
        repositoryId: 'repo-123',
      },
      purposes: ['planning' as const],
      policyRestrictions: { authority: { default: 'user-approved' as const } },
      provenanceToken: 'oat-create:item-789:bnd_binding_789',
      createdAt: timestamp,
    };

    await store.createBindingIntent(intent);
    expect(await store.readBindingMetadata(intent.bindingId)).toBeNull();
    expect(await store.readOperation(intent.operationId)).toMatchObject({
      bindingId: intent.bindingId,
      operationClass: 'create',
      state: 'planned',
      createIntent: intent,
    });

    await store.transitionOperation(intent.operationId, 'planned', {
      state: 'uncertain',
      updatedAt: '2026-08-31T00:02:00.000Z',
      outcome: {
        classification: 'uncertain',
        message: 'provider outcome unknown',
        verifiedAt: null,
      },
    });
    expect(await store.readBindingMetadata(intent.bindingId)).toBeNull();
    expect(await store.readOperation(intent.operationId)).toMatchObject({
      state: 'uncertain',
      createIntent: intent,
    });

    await expect(
      store.materializeVerifiedBinding(
        intent.operationId,
        metadata(),
        undefined as never,
      ),
    ).rejects.toThrow(/verified durable remote identity/i);
    await expect(
      store.materializeVerifiedBinding(
        intent.operationId,
        metadata(),
        verification,
      ),
    ).rejects.toThrow(/verified/i);
  });

  it('preserves incomplete project-create provenance across a restart', async () => {
    const { store } = await createStore();
    await store.createBindingIntent({
      schemaVersion: 1,
      bindingId: 'bnd_incomplete_project',
      operationId: 'op_incomplete_project',
      provider: 'linear',
      target: {
        kind: 'project',
        scope: 'shared',
        id: 'project-incomplete',
        path: '.oat/projects/shared/project-incomplete',
      },
      publicationProjection: {
        title: 'plan',
        description: 'summary',
        priority: 'plan',
      },
      providerContext: { workspaceId: 'workspace-1' },
      purposes: ['planning'],
      policyRestrictions: {},
      provenanceToken: 'oat-create:project-incomplete',
      createdAt: timestamp,
    });

    const restarted = new RemoteSyncStore(store.locations);
    await expect(
      restarted.readOperation('op_incomplete_project'),
    ).resolves.toMatchObject({
      createIntent: {
        target: { kind: 'project' },
        projectionStatus: 'reconcile-required',
      },
    });
  });

  it('requires materialization to match a retained verified create journal', async () => {
    const { store } = await createStore();
    const intent = {
      schemaVersion: 1 as const,
      bindingId: 'bnd_binding_789',
      operationId: 'op_operation_789',
      provider: 'github' as const,
      target: {
        kind: 'backlog' as const,
        scope: 'shared' as const,
        id: 'item-789',
        path: '.oat/repo/pjm/backlog/item-789.md',
      },
      publicationProjection: {
        title: 'frontmatter' as const,
        description: 'description-section' as const,
        priority: 'frontmatter' as const,
      },
      providerContext: {
        host: 'github.com',
        owner: 'voxmedia',
        repositoryId: 'repo-123',
      },
      purposes: ['planning' as const],
      policyRestrictions: { authority: { default: 'user-approved' as const } },
      provenanceToken: 'oat-create:item-789:bnd_binding_789',
      createdAt: timestamp,
    };
    const record = {
      ...metadata(intent.bindingId),
      target: intent.target,
      remoteIdentity: {
        stableId: verification.stableId,
        context: intent.providerContext,
        aliases: [],
      },
      purposes: intent.purposes,
      policyRestrictions: intent.policyRestrictions,
      publicationProjection: intent.publicationProjection,
      provenanceToken: intent.provenanceToken,
      identityHistory: [],
    };

    await expect(
      store.materializeVerifiedBinding('op_missing_123', record, verification),
    ).rejects.toThrow(/create operation|journal/i);
    await store.createBindingIntent(intent);
    await expect(
      store.materializeVerifiedBinding(
        intent.operationId,
        record,
        verification,
      ),
    ).rejects.toThrow(/verified/i);
    await store.transitionOperation(intent.operationId, 'planned', {
      state: 'verified',
      updatedAt: verification.verifiedAt,
      outcome: {
        classification: 'verified',
        message: 'durable identity verified',
        verifiedAt: verification.verifiedAt,
      },
      verification: [
        {
          field: 'remoteIdentity',
          expectedHash: verification.evidenceDigest,
          observedHash: verification.evidenceDigest,
          status: 'verified',
        },
      ],
    });
    await expect(
      store.materializeVerifiedBinding(
        intent.operationId,
        { ...record, provenanceToken: 'wrong-provenance' },
        verification,
      ),
    ).rejects.toThrow(/intent|provenance/i);

    await store.materializeVerifiedBinding(
      intent.operationId,
      record,
      verification,
    );
    expect(await store.readBindingMetadata(intent.bindingId)).toEqual(record);
    expect(await store.readOperation(intent.operationId)).toMatchObject({
      state: 'verified',
      createIntent: intent,
    });
    await expect(
      store.materializeVerifiedBinding(
        intent.operationId,
        record,
        verification,
      ),
    ).resolves.toBeUndefined();
    await expect(
      store.materializeVerifiedBinding(
        intent.operationId,
        { ...record, updatedAt: '2026-08-31T00:03:00.000Z' },
        verification,
      ),
    ).rejects.toThrow(/conflicts.*materialization plan/i);
  });

  it('makes exact intake metadata replay idempotent and rejects one-sided drift', async () => {
    const { store } = await createStore();
    const record = metadata('bnd_intake_123');
    await store.materializeIntakeBinding(record);
    await expect(
      store.materializeIntakeBinding(record),
    ).resolves.toBeUndefined();
    await expect(
      store.materializeIntakeBinding({
        ...record,
        updatedAt: '2026-08-31T00:04:00.000Z',
      }),
    ).rejects.toBeTruthy();
  });
});
