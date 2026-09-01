import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import type { RemoteCommandRequest } from './index';
import type { RemoteBindingMetadata, RemoteBindingState } from './schema';
import {
  createProductionRemoteRunner,
  planProductionMutationProjection,
} from './service';
import { sanitizeRemoteSnapshot } from './snapshot';

const timestamp = '2026-08-31T12:00:00.000Z';
const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.map((path) =>
      rm(path, { recursive: true, force: true }),
    ),
  );
  temporaryDirectories.length = 0;
});

function binding(
  purposes: RemoteBindingMetadata['purposes'] = ['planning'],
): RemoteBindingMetadata {
  return {
    recordType: 'binding-metadata',
    schemaVersion: 1,
    bindingId: 'bnd_service_001',
    provider: 'linear',
    target: {
      kind: 'backlog',
      scope: 'shared',
      id: 'item-1',
      path: '.oat/repo/pjm/backlog/items/item-1.md',
    },
    remoteIdentity: {
      stableId: 'issue-1',
      context: { workspaceId: 'workspace-1' },
      aliases: [],
    },
    identityHistory: [],
    purposes,
    policyRestrictions: {},
    publicationProjection: {
      title: 'frontmatter',
      description: 'description-section',
      priority: 'frontmatter',
    },
    provenanceToken: 'oat-binding:bnd_service_001',
    lifecycle: 'active',
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function state(
  overrides: Partial<RemoteBindingState> = {},
): RemoteBindingState {
  const metadata = binding();
  return {
    recordType: 'binding-state',
    schemaVersion: 2,
    bindingId: metadata.bindingId,
    provider: metadata.provider,
    metadataUpdatedAt: timestamp,
    localProjection: {
      title: 'Local title',
      description: 'Local managed description',
      priority: 'high',
      source: 'backlog-description',
      sourceRevision: 'sha256:local',
      observedAt: timestamp,
    },
    snapshot: sanitizeRemoteSnapshot({
      snapshotId: 'snap_service_001',
      bindingId: metadata.bindingId,
      provider: metadata.provider,
      observedAt: timestamp,
      observedBy: {
        provider: metadata.provider,
        surfaceKind: 'connector',
        context: metadata.remoteIdentity.context,
        evidenceDigest: 'sha256:capability',
        semanticCapabilities: ['read'],
      },
      identity: metadata.remoteIdentity,
      revision: {
        strength: 'hash-only',
        token: null,
        updatedAt: timestamp,
        contentHash: 'sha256:remote',
      },
      issue: {
        title: 'Remote title',
        description: 'Remote prose',
        priority: null,
        status: 'open',
      },
      lifecycle: 'active',
    }),
    baseline: null,
    capability: null,
    contentRedacted: false,
    lifecycle: 'active',
    lifecycleCondition: 'active',
    activeOperationIds: [],
    createdAt: timestamp,
    updatedAt: timestamp,
    ...overrides,
  };
}

describe('production lifecycle composition', () => {
  it.each(['source', 'delivery', 'reference'] as const)(
    'blocks the empty outbound intersection for %s bindings',
    (purpose) => {
      expect(() =>
        planProductionMutationProjection({
          metadata: binding([purpose]),
          state: state(),
          descriptionMode: 'replace',
          operation: 'publish',
          priorityMapping: true,
        }),
      ).toThrow(/permit no outbound fields/i);
    },
  );

  it('derives the exact planning mask for every description mode', () => {
    const none = planProductionMutationProjection({
      metadata: binding(),
      state: state(),
      descriptionMode: 'none',
      operation: 'publish',
      priorityMapping: true,
    });
    expect(none).toEqual({ title: 'Local title', priority: 'high' });

    const replaced = planProductionMutationProjection({
      metadata: binding(),
      state: state(),
      descriptionMode: 'replace',
      operation: 'publish',
      priorityMapping: true,
    });
    expect(replaced.description).toBe('Local managed description');

    const managed = planProductionMutationProjection({
      metadata: binding(),
      state: state(),
      descriptionMode: 'managed-section',
      operation: 'publish',
      priorityMapping: true,
    });
    expect(managed.description).toContain('Remote prose');
    expect(managed.description).toContain('Local managed description');
    expect(managed.description).toContain('OAT-MANAGED:bnd_service_001');
  });

  it('blocks a same-field conflict before constructing an action', () => {
    const current = state();
    expect(() =>
      planProductionMutationProjection({
        metadata: binding(),
        state: state({
          ...current,
          baseline: {
            recordType: 'baseline',
            schemaVersion: 1,
            baselineId: 'base_service_001',
            bindingId: 'bnd_service_001',
            agreedAt: timestamp,
            acceptedByOperationId: 'op_service_001',
            localProjectionRevision: 'sha256:base',
            remoteRevision: current.snapshot!.revision,
            fields: {
              title: { value: 'Base title', hash: 'sha256:base-title' },
              description: {
                value: 'Remote prose',
                hash: 'sha256:base-description',
              },
              priority: { value: null, hash: 'sha256:base-priority' },
            },
          },
        }),
        descriptionMode: 'replace',
        operation: 'reconcile',
        priorityMapping: true,
      }),
    ).toThrow(/same-field reconciliation conflict/i);
  });

  it('uses only an explicit project publication in the default runner', async () => {
    const repository = await mkdtemp(join(tmpdir(), 'oat-remote-service-'));
    temporaryDirectories.push(repository);
    execFileSync('git', ['init', '--quiet'], { cwd: repository });
    await mkdir(join(repository, '.oat'), { recursive: true });
    await writeFile(
      join(repository, '.oat', 'config.json'),
      `${JSON.stringify({
        version: 1,
        pjm: {
          initialized: true,
          schemaVersion: 1,
          remote: {
            schemaVersion: 1,
            policy: {
              description: 'replace',
              authority: {
                default: 'read-only',
                operations: { create: 'user-authorized' },
              },
            },
          },
        },
      })}\n`,
    );
    const authorityPath = join(repository, '.oat', 'invocation.json');
    await writeFile(
      authorityPath,
      `${JSON.stringify({
        schemaVersion: 1,
        kind: 'interactive',
        sourceId: 'host-session-1',
        invocationId: 'invocation-1',
        issuedAt: '2026-08-31T11:59:00.000Z',
        expiresAt: '2026-08-31T12:05:00.000Z',
        instruction: {
          operationClass: 'create',
          targetId: 'project:project-1',
          evidenceDigest: 'sha256:instruction',
        },
        approval: null,
      })}\n`,
    );
    const runner = createProductionRemoteRunner({
      now: () => timestamp,
      randomId: () => 'service-project',
      readObservationStdin: async () => ({
        provider: 'linear',
        context: { workspaceId: 'workspace-1' },
        surfaceKind: 'connector',
        availability: 'available',
        semanticCapabilities: ['create'],
        evidenceDigest: 'sha256:create-capability',
        observedAt: timestamp,
      }),
    });
    const request = {
      operation: 'publish',
      projectRoot: repository,
      createTarget: {
        provider: 'linear',
        localKind: 'project',
        localId: 'project-1',
        publication: {
          title: 'Published project',
          description: 'Explicit summary',
          priority: 'high',
        },
      },
      capabilityEvidenceStdin: true,
      authorityEvidenceFile: authorityPath,
    } as RemoteCommandRequest & {
      createTarget: NonNullable<RemoteCommandRequest['createTarget']> & {
        publication: {
          title: string;
          description: string;
          priority: string;
        };
      };
    };

    await expect(runner(request)).resolves.toMatchObject({
      status: 'pending',
      externalAction: {
        semanticOperation: 'create',
        intent: {
          fields: {
            title: 'Published project',
            description: 'Explicit summary',
            priority: 'high',
          },
        },
      },
    });
  });
});
