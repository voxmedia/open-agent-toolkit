import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import type { RemoteCommandRequest } from './index';
import type { RemoteBindingMetadata, RemoteBindingState } from './schema';
import {
  createProductionRemoteRunner,
  planProductionMutationProjection,
} from './service';
import { sanitizeRemoteSnapshot } from './snapshot';
import { resolveRemoteStorageLocations } from './storage-locator';
import { RemoteSyncStore } from './store';

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

  it.each([
    'after-journal',
    'after-target',
    'after-metadata',
    'after-state',
    'after-snapshot',
    'after-baseline',
    'after-association',
    'after-terminal',
  ] as const)(
    'resumes intake after %s without another host read',
    async (crashPoint) => {
      const repository = await mkdtemp(join(tmpdir(), 'oat-intake-resume-'));
      temporaryDirectories.push(repository);
      execFileSync('git', ['init', '--quiet'], { cwd: repository });
      await mkdir(join(repository, '.oat'), { recursive: true });
      await writeFile(
        join(repository, '.oat', 'config.json'),
        `${JSON.stringify({ pjm: { initialized: true } })}\n`,
      );
      const intakeTargetPath = join(
        repository,
        '.oat',
        'repo',
        'pjm',
        'backlog',
        'items',
        'item-1.md',
      );
      if (crashPoint === 'after-association') {
        await mkdir(join(intakeTargetPath, '..'), { recursive: true });
        await writeFile(
          intakeTargetPath,
          '---\ntitle: Existing title\npriority: low\nassociated_issues: []\n---\n\n## Description\n\nExisting deliberate description\n',
        );
      }
      const ids = [
        'intake-operation',
        'intake-binding',
        'intake-step',
        'intake-snapshot',
      ];
      let currentObservation: unknown = {
        provider: 'linear',
        context: { workspaceId: 'workspace-1' },
        surfaceKind: 'connector',
        availability: 'available',
        semanticCapabilities: ['read'],
        evidenceDigest: 'sha256:intake-capability',
        observedAt: timestamp,
      };
      const runner = createProductionRemoteRunner({
        now: () => timestamp,
        randomId: () => ids.shift() ?? 'unused',
        readObservationStdin: async () => currentObservation,
        crash: (point) => {
          if (point === crashPoint) throw new Error(`crash:${point}`);
        },
      });
      const prepared = await runner({
        operation: 'intake',
        projectRoot: repository,
        providerRef: 'linear:issue-1',
        backlogId: 'item-1',
        capabilityEvidenceStdin: true,
      });
      const action = prepared.externalAction!;
      currentObservation = {
        schemaVersion: 1,
        operationId: action.operationId,
        stepId: action.stepId,
        actionDigest: action.actionDigest,
        observedAt: timestamp,
        surfaceKind: 'connector',
        capabilityEvidenceDigest: 'sha256:intake-capability',
        provider: 'linear',
        context: { workspaceId: 'workspace-1' },
        outcome: {
          classification: 'observed',
          identity: { stableId: 'issue-1', aliases: ['ITEM-1'] },
          fields: {
            title: 'Intake title',
            description: 'Intake description',
            priority: null,
            status: 'open',
          },
          revisionDigest: 'sha256:intake-revision',
          diagnosticCode: null,
        },
      };
      await expect(
        runner({
          operation: 'operation-continue',
          projectRoot: repository,
          operationId: action.operationId,
          observationStdin: true,
        }),
      ).rejects.toThrow(`crash:${crashPoint}`);

      let unexpectedRead = false;
      const restarted = createProductionRemoteRunner({
        now: () => timestamp,
        randomId: () => 'restart-unused',
        readObservationStdin: async () => {
          unexpectedRead = true;
          throw new Error('unexpected host read');
        },
      });
      if (crashPoint === 'after-terminal') {
        await expect(
          restarted({
            operation: 'operation-continue',
            projectRoot: repository,
            operationId: action.operationId,
          }),
        ).rejects.toThrow(/terminal|replay/i);
      } else {
        await expect(
          restarted({
            operation: 'operation-continue',
            projectRoot: repository,
            operationId: action.operationId,
          }),
        ).resolves.toMatchObject({ status: 'ok', persisted: true });
      }
      expect(unexpectedRead).toBe(false);

      const store = new RemoteSyncStore(
        resolveRemoteStorageLocations({
          repoRoot: repository,
          gitCommonDir: join(repository, '.git'),
          repositoryIdentity: `local-repository:${resolve(repository)}`,
          stateStorage: 'local',
          target: { kind: 'backlog', scope: 'shared', path: null },
        }),
      );
      await expect(
        store.readOperation(action.operationId),
      ).resolves.toMatchObject({
        state: 'verified',
        materializationSteps: expect.arrayContaining([
          expect.objectContaining({ step: 'journal' }),
          expect.objectContaining({ step: 'metadata' }),
          expect.objectContaining({ step: 'state' }),
          expect.objectContaining({ step: 'snapshot' }),
          expect.objectContaining({ step: 'baseline' }),
          expect.objectContaining({ step: 'association' }),
        ]),
      });
      await expect(
        store.readBindingState('bnd_intake-binding'),
      ).resolves.toMatchObject({
        snapshot: { issue: { title: 'Intake title' } },
        baseline: { acceptedByOperationId: 'op_intake-operation' },
      });
      expect(await readFile(intakeTargetPath, 'utf8')).toContain(
        'binding: bnd_intake-binding',
      );
      if (crashPoint === 'after-association') {
        expect(await readFile(intakeTargetPath, 'utf8')).toContain(
          'Existing deliberate description',
        );
      }
    },
  );

  it.each([
    'after-journal',
    'after-metadata',
    'after-state',
    'after-snapshot',
    'after-baseline',
    'after-association',
    'after-terminal',
  ] as const)(
    'resumes create after %s without repeating the remote effect',
    async (crashPoint) => {
      const repository = await mkdtemp(join(tmpdir(), 'oat-create-resume-'));
      temporaryDirectories.push(repository);
      execFileSync('git', ['init', '--quiet'], { cwd: repository });
      const targetPath = join(
        repository,
        '.oat',
        'repo',
        'pjm',
        'backlog',
        'items',
        'item-1.md',
      );
      await mkdir(join(targetPath, '..'), { recursive: true });
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
      await writeFile(
        targetPath,
        '---\ntitle: Local title\npriority: high\nassociated_issues: []\n---\n\n## Description\n\nLocal description\n',
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
            targetId: 'backlog:item-1',
            evidenceDigest: 'sha256:instruction',
          },
          approval: null,
        })}\n`,
      );
      const ids = [
        'create-operation',
        'create-binding',
        'create-step',
        'verify-step',
      ];
      let currentObservation: unknown = {
        provider: 'linear',
        context: { workspaceId: 'workspace-1' },
        surfaceKind: 'connector',
        availability: 'available',
        semanticCapabilities: ['create'],
        evidenceDigest: 'sha256:create-capability',
        observedAt: timestamp,
      };
      const runner = createProductionRemoteRunner({
        now: () => timestamp,
        randomId: () => ids.shift() ?? 'unused',
        readObservationStdin: async () => currentObservation,
        crash: (point) => {
          if (point === crashPoint) throw new Error(`crash:${point}`);
        },
      });
      const prepared = await runner({
        operation: 'publish',
        projectRoot: repository,
        createTarget: {
          provider: 'linear',
          localKind: 'backlog',
          localId: 'item-1',
        },
        capabilityEvidenceStdin: true,
        authorityEvidenceFile: authorityPath,
      });
      const createAction = prepared.externalAction!;
      const fields = createAction.intent.fields as Record<string, unknown>;
      currentObservation = {
        schemaVersion: 1,
        operationId: createAction.operationId,
        stepId: createAction.stepId,
        actionDigest: createAction.actionDigest,
        observedAt: timestamp,
        surfaceKind: 'connector',
        capabilityEvidenceDigest: 'sha256:create-capability',
        provider: 'linear',
        context: { workspaceId: 'workspace-1' },
        outcome: {
          classification: 'observed',
          identity: { stableId: 'issue-1', aliases: ['ITEM-1'] },
          fields,
          revisionDigest: 'sha256:create-receipt',
          diagnosticCode: null,
        },
      };
      const pendingRead = await runner({
        operation: 'operation-continue',
        projectRoot: repository,
        operationId: createAction.operationId,
        observationStdin: true,
      });
      const readAction = pendingRead.externalAction!;
      currentObservation = {
        schemaVersion: 1,
        operationId: readAction.operationId,
        stepId: readAction.stepId,
        actionDigest: readAction.actionDigest,
        observedAt: timestamp,
        surfaceKind: 'connector',
        capabilityEvidenceDigest: 'sha256:create-capability',
        provider: 'linear',
        context: { workspaceId: 'workspace-1' },
        outcome: {
          classification: 'observed',
          identity: { stableId: 'issue-1', aliases: ['ITEM-1'] },
          fields: { ...fields, status: 'open' },
          revisionDigest: 'sha256:create-readback',
          diagnosticCode: null,
        },
      };
      await expect(
        runner({
          operation: 'operation-continue',
          projectRoot: repository,
          operationId: readAction.operationId,
          observationStdin: true,
        }),
      ).rejects.toThrow(`crash:${crashPoint}`);

      let unexpectedRead = false;
      const restarted = createProductionRemoteRunner({
        now: () => timestamp,
        readObservationStdin: async () => {
          unexpectedRead = true;
          throw new Error('unexpected host read');
        },
      });
      const continuation = restarted({
        operation: 'operation-continue',
        projectRoot: repository,
        operationId: readAction.operationId,
      });
      if (crashPoint === 'after-terminal') {
        await expect(continuation).rejects.toThrow(/terminal|replay/i);
      } else {
        await expect(continuation).resolves.toMatchObject({ status: 'ok' });
      }
      expect(unexpectedRead).toBe(false);
      expect(await readFile(targetPath, 'utf8')).toContain(
        'binding: bnd_create-binding',
      );
    },
  );

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
