import { mkdir, mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

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
    schemaVersion: 1,
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
    schemaVersion: 1,
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
      capabilityDigest: 'sha256:capability',
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
    transport: null,
    selectedTransport: null,
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

  it('creates operation journals exclusively', async () => {
    const { store } = await createStore();
    await store.createOperation(operation());
    await expect(store.createOperation(operation())).rejects.toThrow(
      /already exists/i,
    );
  });

  it('requires expected state transitions and rejects duplicate steps', async () => {
    const { store } = await createStore();
    await store.createOperation(operation());
    await expect(
      store.transitionOperation('op_operation_123', 'authorized', {
        state: 'attempt-started',
        updatedAt: '2026-08-31T00:01:00.000Z',
      }),
    ).rejects.toThrow(/expected.*authorized.*found.*planned/i);

    const step = {
      stepId: 'step_update_123',
      semanticOperation: 'update-fields' as const,
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
  });
});
