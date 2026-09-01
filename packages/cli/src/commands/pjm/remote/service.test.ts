import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { Command } from 'commander';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createPjmRemoteCommand, type RemoteCommandRequest } from './index';
import { resolveLocalProjection } from './local-projection';
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
  process.exitCode = undefined;
  vi.restoreAllMocks();
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
                description: 'managed-section',
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

  it.each([
    'after-journal',
    'after-state',
    'after-snapshot',
    'after-baseline',
    'after-terminal',
  ] as const)(
    'resumes verified update after %s without repeating the remote effect',
    async (crashPoint) => {
      const repository = await mkdtemp(join(tmpdir(), 'oat-update-resume-'));
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
      const content =
        '---\ntitle: Local title\npriority: high\nassociated_issues: []\n---\n\n## Description\n\nLocal managed description\n';
      await writeFile(targetPath, content);
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
                description: 'managed-section',
                authority: {
                  default: 'read-only',
                  operations: { 'update-fields': 'user-authorized' },
                },
              },
            },
          },
        })}\n`,
      );
      const store = new RemoteSyncStore(
        resolveRemoteStorageLocations({
          repoRoot: repository,
          gitCommonDir: join(repository, '.git'),
          repositoryIdentity: `local-repository:${resolve(repository)}`,
          stateStorage: 'local',
          target: { kind: 'backlog', scope: 'shared', path: null },
        }),
      );
      const metadata = binding();
      await store.createBindingIntent({
        schemaVersion: 1,
        bindingId: metadata.bindingId,
        operationId: 'op_seed_update',
        provider: metadata.provider,
        target: metadata.target,
        publicationProjection: metadata.publicationProjection,
        providerContext: metadata.remoteIdentity.context,
        purposes: metadata.purposes,
        policyRestrictions: metadata.policyRestrictions,
        provenanceToken: metadata.provenanceToken,
        createdAt: timestamp,
      });
      await store.transitionOperation('op_seed_update', 'planned', {
        state: 'verified',
        updatedAt: timestamp,
        verification: [
          {
            field: 'remoteIdentity',
            expectedHash: 'sha256:identity',
            observedHash: 'sha256:identity',
            status: 'verified',
          },
        ],
        outcome: {
          classification: 'verified',
          message: 'seeded',
          verifiedAt: timestamp,
        },
      });
      await store.materializeVerifiedBinding('op_seed_update', metadata, {
        provider: metadata.provider,
        stableId: metadata.remoteIdentity.stableId,
        verifiedAt: timestamp,
        evidenceDigest: 'sha256:identity',
      });
      const localProjection = resolveLocalProjection({
        target: {
          kind: 'backlog',
          path: metadata.target.path,
          content,
        },
        observedAt: timestamp,
      });
      const initial = state({
        localProjection,
        baseline: {
          recordType: 'baseline',
          schemaVersion: 1,
          baselineId: 'base_update_initial',
          bindingId: metadata.bindingId,
          agreedAt: timestamp,
          acceptedByOperationId: 'op_seed_update',
          localProjectionRevision: localProjection.sourceRevision,
          remoteRevision: state().snapshot!.revision,
          fields: {
            title: { value: 'Remote title', hash: 'sha256:title' },
            description: {
              value: 'Remote prose',
              hash: 'sha256:description',
            },
            priority: { value: null, hash: 'sha256:priority' },
          },
        },
      });
      await store.writeBindingState(initial);
      const authorityPath = join(repository, '.oat', 'invocation.json');
      await writeFile(
        authorityPath,
        `${JSON.stringify({
          schemaVersion: 1,
          kind: 'interactive',
          sourceId: 'host-session-1',
          invocationId: 'invocation-1',
          issuedAt: timestamp,
          expiresAt: '2026-08-31T12:05:00.000Z',
          instruction: {
            operationClass: 'update-fields',
            targetId: metadata.bindingId,
            evidenceDigest: 'sha256:instruction',
          },
          approval: null,
        })}\n`,
      );
      let currentObservation: unknown = {
        provider: 'linear',
        context: metadata.remoteIdentity.context,
        surfaceKind: 'connector',
        availability: 'available',
        semanticCapabilities: ['read', 'update'],
        evidenceDigest: 'sha256:update-capability',
        observedAt: timestamp,
      };
      const ids = [
        'update-operation',
        'preread-step',
        'mutation-step',
        'verification-step',
      ];
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
        bindingId: metadata.bindingId,
        capabilityEvidenceStdin: true,
        authorityEvidenceFile: authorityPath,
      });
      const preRead = prepared.externalAction!;
      currentObservation = {
        schemaVersion: 1,
        operationId: preRead.operationId,
        stepId: preRead.stepId,
        actionDigest: preRead.actionDigest,
        observedAt: timestamp,
        surfaceKind: 'connector',
        capabilityEvidenceDigest: 'sha256:update-capability',
        provider: 'linear',
        context: metadata.remoteIdentity.context,
        outcome: {
          classification: 'observed',
          identity: { stableId: 'issue-1', aliases: [] },
          fields: {
            title: 'Remote title',
            description: 'Remote prose',
            priority: null,
            status: 'open',
          },
          revisionDigest: 'sha256:remote',
          diagnosticCode: null,
        },
      };
      const pendingMutation = await runner({
        operation: 'operation-continue',
        projectRoot: repository,
        operationId: preRead.operationId,
        observationStdin: true,
        authorityEvidenceFile: authorityPath,
      });
      const mutation = pendingMutation.externalAction!;
      const fields = mutation.intent.fields as Record<string, unknown>;
      currentObservation = {
        schemaVersion: 1,
        operationId: mutation.operationId,
        stepId: mutation.stepId,
        actionDigest: mutation.actionDigest,
        observedAt: timestamp,
        surfaceKind: 'connector',
        capabilityEvidenceDigest: 'sha256:update-capability',
        provider: 'linear',
        context: metadata.remoteIdentity.context,
        outcome: {
          classification: 'observed',
          identity: { stableId: 'issue-1', aliases: [] },
          fields,
          revisionDigest: 'sha256:update-receipt',
          diagnosticCode: null,
        },
      };
      const verificationPending = await runner({
        operation: 'operation-continue',
        projectRoot: repository,
        operationId: mutation.operationId,
        observationStdin: true,
      });
      const verification = verificationPending.externalAction!;
      currentObservation = {
        schemaVersion: 1,
        operationId: verification.operationId,
        stepId: verification.stepId,
        actionDigest: verification.actionDigest,
        observedAt: timestamp,
        surfaceKind: 'connector',
        capabilityEvidenceDigest: 'sha256:update-capability',
        provider: 'linear',
        context: metadata.remoteIdentity.context,
        outcome: {
          classification: 'observed',
          identity: { stableId: 'issue-1', aliases: [] },
          fields: { ...fields, status: 'open' },
          revisionDigest: 'sha256:update-authoritative',
          diagnosticCode: null,
        },
      };
      await expect(
        runner({
          operation: 'operation-continue',
          projectRoot: repository,
          operationId: mutation.operationId,
          observationStdin: true,
        }),
      ).rejects.toThrow(`crash:${crashPoint}`);
      let repeatedHostAction = false;
      const restarted = createProductionRemoteRunner({
        now: () => timestamp,
        readObservationStdin: async () => {
          repeatedHostAction = true;
          throw new Error('unexpected repeated host action');
        },
      });
      const continuation = restarted({
        operation: 'operation-continue',
        projectRoot: repository,
        operationId: mutation.operationId,
      });
      if (crashPoint === 'after-terminal') {
        await expect(continuation).rejects.toThrow(/terminal|replay/i);
      } else {
        await expect(continuation).resolves.toMatchObject({ status: 'ok' });
      }
      expect(repeatedHostAction).toBe(false);
      await expect(
        store.readBindingState(metadata.bindingId),
      ).resolves.toMatchObject({
        snapshot: {
          revision: { contentHash: 'sha256:update-authoritative' },
        },
        baseline: {
          acceptedByOperationId: mutation.operationId,
          localProjectionRevision: localProjection.sourceRevision,
          remoteRevision: { contentHash: 'sha256:update-authoritative' },
        },
      });
      await expect(
        store.readOperation(mutation.operationId),
      ).resolves.toMatchObject({
        state: 'verified',
        attempts: [{ requestDigest: mutation.actionDigest }],
      });
    },
  );

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
              description: 'managed-section',
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
      randomId: () => 'service-project',
      readObservationStdin: async () => currentObservation,
    });
    const publicationFile = join(
      repository,
      '.oat',
      'project-publication.json',
    );
    await writeFile(
      publicationFile,
      `${JSON.stringify({
        title: 'Published project',
        description: 'Explicit summary',
        priority: 'high',
      })}\n`,
    );
    let prepared: Awaited<ReturnType<typeof runner>> | undefined;
    const root = new Command().name('oat').option('--json');
    root.exitOverride();
    root.addCommand(
      createPjmRemoteCommand({
        resolveProjectRoot: async () => repository,
        checkAdoption: async () => 'complete',
        run: async (commandRequest) => {
          prepared = await runner(commandRequest);
          return prepared;
        },
      }),
    );
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    await root.parseAsync([
      'node',
      'oat',
      'remote',
      'publish',
      '--provider',
      'linear',
      '--to-project',
      'project-1',
      '--project-publication-file',
      publicationFile,
      '--capability-evidence-stdin',
      '--authority-evidence-file',
      authorityPath,
    ]);
    const preparedEnvelope = prepared!;
    expect(preparedEnvelope).toMatchObject({
      status: 'pending',
      externalAction: {
        semanticOperation: 'create',
        intent: {
          fields: {
            title: 'Published project',
            description: expect.stringContaining('Explicit summary'),
            priority: 'high',
          },
        },
      },
    });
    const createAction = preparedEnvelope.externalAction!;
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
        identity: { stableId: 'issue-project-1', aliases: ['PROJECT-1'] },
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
        identity: { stableId: 'issue-project-1', aliases: ['PROJECT-1'] },
        fields: { ...fields, status: 'open' },
        revisionDigest: 'sha256:project-readback',
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
    ).resolves.toMatchObject({ status: 'ok' });
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
      store.readBindingMetadata('bnd_service-project'),
    ).resolves.toMatchObject({
      target: { kind: 'project', id: 'project-1' },
      remoteIdentity: { stableId: 'issue-project-1' },
      publicationProjection: {
        title: 'plan',
        description: 'summary',
        priority: 'plan',
      },
    });
    await expect(
      store.readBindingState('bnd_service-project'),
    ).resolves.toMatchObject({
      localProjection: {
        source: 'explicit-project-publication',
        title: 'Published project',
        description: 'Explicit summary',
        priority: 'high',
      },
      snapshot: {
        revision: { contentHash: 'sha256:project-readback' },
      },
      baseline: {
        acceptedByOperationId: 'op_service-project',
        remoteRevision: { contentHash: 'sha256:project-readback' },
      },
    });
  });

  it.each([
    ['project', 'none', undefined],
    ['project', 'managed-section', 'managed'],
    ['project', 'replace', 'Explicit summary'],
    ['backlog', 'none', undefined],
    ['backlog', 'managed-section', 'managed'],
    ['backlog', 'replace', 'Explicit summary'],
  ] as const)(
    'applies the %s %s description policy to an unbound create projection',
    async (localKind, descriptionMode, expectedDescription) => {
      const repository = await mkdtemp(join(tmpdir(), 'oat-create-policy-'));
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
                description: descriptionMode,
                authority: {
                  default: 'read-only',
                  operations: { create: 'user-authorized' },
                },
              },
            },
          },
        })}\n`,
      );
      const publicationFile = join(repository, '.oat', 'publication.json');
      await writeFile(
        publicationFile,
        `${JSON.stringify({
          title: 'Published project',
          description: 'Explicit summary',
          priority: 'high',
        })}\n`,
      );
      if (localKind === 'backlog') {
        const backlogPath = join(
          repository,
          '.oat',
          'repo',
          'pjm',
          'backlog',
          'items',
          'item-1.md',
        );
        await mkdir(join(backlogPath, '..'), { recursive: true });
        await writeFile(
          backlogPath,
          '---\ntitle: Published project\npriority: high\nassociated_issues: []\n---\n\n## Description\n\nExplicit summary\n',
        );
      }
      const localId = localKind === 'project' ? 'project-1' : 'item-1';
      const authorityFile = join(repository, '.oat', 'invocation.json');
      const invocation = (approval: Record<string, unknown> | null) => ({
        schemaVersion: 1,
        kind: 'interactive',
        sourceId: 'host-session-1',
        invocationId: 'invocation-1',
        issuedAt: '2026-08-31T11:59:00.000Z',
        expiresAt: '2026-08-31T12:05:00.000Z',
        instruction: {
          operationClass: 'create',
          targetId: `${localKind}:${localId}`,
          evidenceDigest: 'sha256:instruction',
        },
        approval,
      });
      await writeFile(authorityFile, `${JSON.stringify(invocation(null))}\n`);
      const ids = ['mode-operation', 'mode-binding', 'mode-step'];
      const runner = createProductionRemoteRunner({
        now: () => timestamp,
        randomId: () => ids.shift() ?? 'unused',
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
      const request: RemoteCommandRequest = {
        operation: 'publish',
        projectRoot: repository,
        createTarget: {
          provider: 'linear',
          localKind,
          localId,
          ...(localKind === 'project' ? { publicationFile } : {}),
        },
        capabilityEvidenceStdin: true,
        authorityEvidenceFile: authorityFile,
      };
      let result = await runner(request);
      if (descriptionMode === 'replace') {
        expect(result).toMatchObject({
          status: 'needs-review',
          externalAction: null,
        });
        const store = new RemoteSyncStore(
          resolveRemoteStorageLocations({
            repoRoot: repository,
            gitCommonDir: join(repository, '.git'),
            repositoryIdentity: `local-repository:${resolve(repository)}`,
            stateStorage: 'local',
            target: { kind: 'backlog', scope: 'shared', path: null },
          }),
        );
        const operation = await store.readOperation('op_mode-operation');
        await writeFile(
          authorityFile,
          `${JSON.stringify(
            invocation({
              previewDigest: operation!.preview.digest,
              operationClass: 'create',
              approvedAt: timestamp,
              actor: 'operator-1',
              source: 'interactive-preview',
            }),
          )}\n`,
        );
        if (localKind === 'project') {
          await writeFile(
            publicationFile,
            `${JSON.stringify({
              title: 'Published project',
              description: 'Drifted summary',
              priority: 'high',
            })}\n`,
          );
          await expect(
            runner({
              ...request,
              previewOperationId: operation!.operationId,
            }),
          ).rejects.toThrow(/preview|drift/i);
          await writeFile(
            publicationFile,
            `${JSON.stringify({
              title: 'Published project',
              description: 'Explicit summary',
              priority: 'high',
            })}\n`,
          );
        }
        result = await runner({
          ...request,
          previewOperationId: operation!.operationId,
        });
      }
      const fields = result.externalAction!.intent.fields as Record<
        string,
        unknown
      >;
      expect(Object.keys(fields).sort()).toEqual(
        expectedDescription === undefined
          ? ['priority', 'title']
          : ['description', 'priority', 'title'],
      );
      if (expectedDescription === 'managed') {
        expect(fields.description).toBe(
          '<!-- OAT-MANAGED:bnd_mode-binding:START -->\n## OAT-managed\n\nExplicit summary\n<!-- OAT-MANAGED:bnd_mode-binding:END -->',
        );
      } else {
        expect(fields.description).toBe(expectedDescription);
      }
      expect(result.externalAction!.expectedObservation.fields.sort()).toEqual(
        Object.keys(fields).sort(),
      );
    },
  );
});
