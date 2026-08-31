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
    purposes: ['source'],
    policyRestrictions: {},
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
    metadataUpdatedAt: timestamp,
    snapshot: null,
    baseline: null,
    lifecycle: 'active',
    activeOperationIds: [],
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
    bindingId,
    operationClass: 'update-fields',
    state: 'planned',
    createdAt: timestamp,
    updatedAt: timestamp,
    transport: null,
    steps: [],
    outcome: { classification: 'pending', message: null, verifiedAt: null },
  };
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
    await store.writeBindingMetadata(metadata());
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
      store.writeBindingMetadata({
        ...metadata(),
        bindingId: '../escape',
      } as RemoteBindingMetadata),
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
});
