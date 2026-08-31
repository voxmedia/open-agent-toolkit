import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { runRemoteDoctorChecks } from './doctor';

const timestamp = '2026-08-31T00:00:00.000Z';

function operationRecord(
  operationId: string,
  state: 'pending' | 'verification-pending',
) {
  const providerContext = { host: 'github.com', repositoryId: 'repo-123' };
  return {
    recordType: 'operation',
    schemaVersion: 1,
    operationId,
    correlationId: operationId,
    bindingId: 'bnd_binding_123',
    provider: 'github',
    providerContext,
    lifecycleOperation: 'reconcile',
    operationClass: 'update-fields',
    state,
    reason: null,
    lastSafeStep: 'planned',
    preview: {
      digest: `sha256:${operationId}`,
      bindingId: 'bnd_binding_123',
      provider: 'github',
      providerContext,
      capabilityDigest: 'sha256:capability',
      revisionDigest: 'sha256:revision',
      policyDigest: 'sha256:policy',
    },
    authority: null,
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

describe('runRemoteDoctorChecks', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tempDirs.map(async (dir) => rm(dir, { recursive: true, force: true })),
    );
    tempDirs.length = 0;
  });

  async function createPaths() {
    const root = await mkdtemp(join(tmpdir(), 'oat-remote-doctor-'));
    tempDirs.push(root);
    const paths = {
      portableBindingsDir: join(root, 'portable'),
      operationalBindingsDir: join(root, 'bindings'),
      operationsDir: join(root, 'operations'),
    };
    await Promise.all(
      Object.values(paths).map((path) => mkdir(path, { recursive: true })),
    );
    return paths;
  }

  it('is dormant when no remote records or policy exist', async () => {
    const paths = await createPaths();
    await expect(runRemoteDoctorChecks(paths)).resolves.toEqual([]);
  });

  it('reports schema/filename, dangling/duplicate identity, and metadata-state findings', async () => {
    const paths = await createPaths();
    const metadata = {
      recordType: 'binding-metadata',
      schemaVersion: 1,
      bindingId: 'bnd_binding_123',
      provider: 'github',
      target: {
        kind: 'backlog',
        scope: 'shared',
        id: 'item-123',
        path: '.oat/repo/pjm/backlog/item-123.md',
      },
      remoteIdentity: {
        stableId: 'same-remote-id',
        context: { host: 'github.com' },
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
      provenanceToken: 'oat-binding:bnd_binding_123',
      lifecycle: 'active',
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await writeFile(
      join(paths.portableBindingsDir, 'wrong-name.json'),
      JSON.stringify(metadata),
    );
    await writeFile(
      join(paths.portableBindingsDir, 'bnd_binding_456.json'),
      JSON.stringify({ ...metadata, bindingId: 'bnd_binding_456' }),
    );
    await writeFile(
      join(paths.operationalBindingsDir, 'bnd_binding_456.json'),
      JSON.stringify({
        recordType: 'binding-state',
        schemaVersion: 1,
        bindingId: 'bnd_binding_456',
        provider: 'github',
        metadataUpdatedAt: '2026-08-31T00:01:00.000Z',
        localProjection: {
          title: 'Local title',
          description: null,
          priority: null,
          source: 'backlog-description',
          sourceRevision: 'sha256:local',
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
      }),
    );

    const checks = await runRemoteDoctorChecks({
      ...paths,
      associatedBindingIds: ['bnd_binding_999'],
    });
    expect(
      checks.find((check) => check.name === 'pjm:remote_schema'),
    ).toMatchObject({
      status: 'fail',
      message: expect.stringContaining('wrong-name.json'),
    });
    expect(
      checks.find((check) => check.name === 'pjm:remote_binding_ids'),
    ).toMatchObject({
      status: 'fail',
      message: expect.stringMatching(/bnd_binding_999|duplicate/i),
    });
    expect(
      checks.find((check) => check.name === 'pjm:remote_metadata_state'),
    ).toMatchObject({
      status: 'fail',
      message: expect.stringContaining('bnd_binding_456'),
    });
  });

  it('reports forbidden portable content, invalid policy, and concurrent active intents', async () => {
    const paths = await createPaths();
    await writeFile(
      join(paths.portableBindingsDir, 'bnd_binding_123.json'),
      JSON.stringify({
        recordType: 'binding-metadata',
        schemaVersion: 1,
        bindingId: 'bnd_binding_123',
        provider: 'github',
        target: {
          kind: 'backlog',
          scope: 'shared',
          id: 'item-123',
          path: '.oat/repo/pjm/backlog/item-123.md',
        },
        remoteIdentity: {
          stableId: 'remote-123',
          context: { host: 'github.com' },
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
        provenanceToken: 'oat-binding:bnd_binding_123',
        lifecycle: 'active',
        createdAt: timestamp,
        updatedAt: timestamp,
        description: 'must not persist here',
      }),
    );
    for (const [operationId, state] of [
      ['op_operation_123', 'pending'],
      ['op_operation_456', 'verification-pending'],
    ] as const) {
      await writeFile(
        join(paths.operationsDir, `${operationId}.json`),
        JSON.stringify(operationRecord(operationId, state)),
      );
    }

    const checks = await runRemoteDoctorChecks({
      ...paths,
      policy: {
        schemaVersion: 1,
        storage: { state: 'local' },
        policy: {
          description: 'unsafe',
          authority: { default: 'autonomous' },
        },
      },
    });
    expect(
      checks.find((check) => check.name === 'pjm:remote_storage_content')
        ?.status,
    ).toBe('fail');
    expect(
      checks.find((check) => check.name === 'pjm:remote_policy')?.status,
    ).toBe('fail');
    expect(
      checks.find((check) => check.name === 'pjm:remote_concurrent_intents'),
    ).toMatchObject({
      status: 'fail',
      message: expect.stringContaining('bnd_binding_123'),
    });
  });

  it('diagnoses every malformed or unknown policy path without exposing values', async () => {
    const paths = await createPaths();
    const secret = 'ghp_policy_value_must_not_leak';
    const checks = await runRemoteDoctorChecks({
      ...paths,
      policy: {
        schemaVersion: 1,
        unknownRemoteKey: secret,
        policy: {
          description: 'replace',
          authority: {
            default: 'autonomous',
            operations: {
              'update-fields': 'misspelled-read-only',
              unknownOperation: 'autonomous',
            },
          },
          providers: {
            github: {
              description: 'unsafe-description',
              authority: { operations: { delete: 'misspelled-read-only' } },
              unknownProviderPolicy: true,
            },
            unknownProvider: { authority: { default: 'autonomous' } },
          },
          unknownPolicy: true,
        },
      },
    });
    const policy = checks.find((check) => check.name === 'pjm:remote_policy');
    expect(policy).toMatchObject({ status: 'fail' });
    expect(policy?.message).toMatch(
      /operations\.update-fields|unknownOperation/,
    );
    expect(JSON.stringify(policy)).not.toContain(secret);
  });

  it('never echoes credential-shaped values in findings', async () => {
    const paths = await createPaths();
    const secret = 'ghp_example_secret_value';
    await writeFile(
      join(paths.portableBindingsDir, 'bad.json'),
      JSON.stringify({ token: secret }),
    );
    const checks = await runRemoteDoctorChecks(paths);
    expect(JSON.stringify(checks)).not.toContain(secret);
  });
});
