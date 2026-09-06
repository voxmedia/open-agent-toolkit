import { execFileSync } from 'node:child_process';
import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  unlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { Command } from 'commander';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { buildExternalAction } from './external-action';
import { createPjmRemoteCommand, type RemoteCommandRequest } from './index';
import { resolveLocalProjection } from './local-projection';
import { semanticDigest } from './provider';
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
  it.each([
    ['closeout', { operation: 'closeout', projectPath: 'shared/example' }],
    [
      'discussion',
      {
        operation: 'discussion',
        bindingId: 'bnd_missing_001',
        discussionLimit: 5,
      },
    ],
    [
      'resolve',
      {
        operation: 'resolve',
        bindingId: 'bnd_missing_001',
        resolutionKind: 'detach',
      },
    ],
    ['doctor', { operation: 'doctor' }],
    ['migrate', { operation: 'migrate', migrationMode: 'check' }],
  ] as const)(
    'routes the production %s family without shared-storage fallthrough',
    async (_family, partialRequest) => {
      const repository = await mkdtemp(join(tmpdir(), 'oat-p07-routing-'));
      temporaryDirectories.push(repository);
      execFileSync('git', ['init', '--quiet'], { cwd: repository });
      await mkdir(join(repository, '.oat'), { recursive: true });
      await writeFile(
        join(repository, '.oat', 'config.json'),
        `${JSON.stringify({ pjm: { initialized: true } })}\n`,
      );
      const runner = createProductionRemoteRunner({ now: () => timestamp });
      try {
        await runner({
          ...partialRequest,
          projectRoot: repository,
        } as RemoteCommandRequest);
      } catch (error) {
        expect(error).not.toMatchObject({
          message: expect.stringContaining(
            'Shared-storage request is incomplete',
          ),
        });
      }
    },
  );

  it('persists closeout and resolution previews while keeping read-only services bounded', async () => {
    const repository = await mkdtemp(join(tmpdir(), 'oat-p07-bridges-'));
    temporaryDirectories.push(repository);
    execFileSync('git', ['init', '--quiet'], { cwd: repository });
    await mkdir(join(repository, '.oat'), { recursive: true });
    await writeFile(
      join(repository, '.oat', 'config.json'),
      `${JSON.stringify({
        pjm: {
          initialized: true,
          remote: {
            schemaVersion: 1,
            policy: { authority: { default: 'user-approved' } },
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
    const projectBinding: RemoteBindingMetadata = {
      ...binding(['source', 'planning']),
      target: {
        kind: 'project',
        scope: 'shared',
        id: 'shared/example',
        path: 'shared/example',
      },
    };
    await store.materializeIntakeBinding(projectBinding);
    await store.writeBindingState(state());
    const migrationPath = '.oat/repo/pjm/backlog/items/migrate.md';
    await mkdir(join(repository, '.oat', 'repo', 'pjm', 'backlog', 'items'), {
      recursive: true,
    });
    await writeFile(
      join(repository, migrationPath),
      '---\ntitle: Migration fixture\nassociated_issues:\n  - linear:issue-legacy\n---\n\n## Description\n\nUnrelated content remains unchanged.\n',
    );
    const associationOnlyMigrationPath =
      '.oat/repo/pjm/backlog/items/association-only.md';
    await writeFile(
      join(repository, associationOnlyMigrationPath),
      '---\ntitle: Association-only fixture\nassociated_issues:\n  - linear:association-only\n---\n\n## Description\n\nNo binding metadata exists for this fixture.\n',
    );
    const migrationBinding: RemoteBindingMetadata = {
      ...binding(['source']),
      bindingId: 'bnd_migrate_001',
      target: {
        kind: 'backlog',
        scope: 'shared',
        id: 'migrate',
        path: migrationPath,
      },
      remoteIdentity: {
        stableId: 'issue-legacy',
        context: { workspaceId: 'workspace-1' },
        aliases: [],
      },
      provenanceToken: 'oat-binding:bnd_migrate_001',
    };
    await store.materializeIntakeBinding(migrationBinding);
    await store.writeBindingState({
      ...state({ snapshot: null }),
      bindingId: migrationBinding.bindingId,
    });
    let sequence = 0;
    const capability = {
      provider: 'linear' as const,
      context: { workspaceId: 'workspace-1' },
      surfaceKind: 'connector' as const,
      availability: 'available' as const,
      semanticCapabilities: ['read', 'annotate', 'transition'],
      evidenceDigest: 'sha256:closeout-capability',
      observedAt: timestamp,
    };
    let runnerInput: unknown = capability;
    const runner = createProductionRemoteRunner({
      now: () => timestamp,
      randomId: () => `routing_${(sequence += 1)}`,
      readObservationStdin: async () => runnerInput,
    });

    const closeout = await runner({
      operation: 'closeout',
      projectRoot: repository,
      projectPath: 'shared/example',
      capabilityEvidenceStdin: true,
    });
    expect(closeout).toMatchObject({
      status: 'needs-review',
      persisted: true,
      results: [
        {
          bindingId: projectBinding.bindingId,
          authority: 'user-approved',
        },
      ],
    });
    expect(closeout.recovery[0]?.instruction).toMatch(
      /target=sha256:.* capability=sha256:.* policy=sha256:.* projection=sha256:.* safety=sha256:.* action=sha256:/,
    );
    await expect(
      readdir(store.locations.operational.batchesDir),
    ).resolves.toHaveLength(1);
    const closeoutBatchFile = (
      await readdir(store.locations.operational.batchesDir)
    )[0]!;
    const closeoutBatchId = closeoutBatchFile.replace(/\.json$/, '');
    const closeoutBatch = await store.readBatch(closeoutBatchId);
    const closeoutOperationId = closeoutBatch!.members[0]!.operationId;
    let closeoutOperation = await store.readOperation(closeoutOperationId);
    const authorityPath = join(repository, 'resolution-authority.json');
    const writeInteractiveAuthority = async (
      operationClass: 'annotate' | 'transition',
      previewDigest: string,
    ) =>
      writeFile(
        authorityPath,
        JSON.stringify({
          schemaVersion: 1,
          kind: 'interactive',
          sourceId: 'synthetic-test',
          invocationId: `${operationClass}-invocation`,
          issuedAt: timestamp,
          expiresAt: '2026-08-31T12:05:00.000Z',
          instruction: {
            operationClass,
            targetId: projectBinding.bindingId,
            evidenceDigest: `sha256:${operationClass}-instruction`,
          },
          approval: {
            previewDigest,
            operationClass,
            approvedAt: timestamp,
            actor: 'synthetic-reviewer',
            source: 'synthetic-test-approval',
          },
        }),
      );
    const completeCloseoutAction = async (
      action: NonNullable<typeof closeout.externalAction>,
    ) => {
      runnerInput = {
        schemaVersion: 1,
        operationId: action.operationId,
        stepId: action.stepId,
        actionDigest: action.actionDigest,
        observedAt: timestamp,
        surfaceKind: 'connector',
        capabilityEvidenceDigest: 'sha256:closeout-capability',
        provider: 'linear',
        context: { workspaceId: 'workspace-1' },
        outcome: {
          classification: 'observed',
          identity: { stableId: 'issue-1', aliases: [] },
          fields:
            action.semanticOperation === 'transition'
              ? { status: 'completed' }
              : {},
          revisionDigest: `sha256:${action.semanticOperation}-receipt`,
          diagnosticCode: null,
        },
      };
      const verificationHandoff = await runner({
        operation: 'operation-continue',
        projectRoot: repository,
        operationId: closeoutOperationId,
        observationStdin: true,
      });
      expect(verificationHandoff.externalAction).toMatchObject({
        semanticOperation: 'read',
      });
      const readAction = verificationHandoff.externalAction!;
      runnerInput = {
        schemaVersion: 1,
        operationId: readAction.operationId,
        stepId: readAction.stepId,
        actionDigest: readAction.actionDigest,
        observedAt: timestamp,
        surfaceKind: 'connector',
        capabilityEvidenceDigest: 'sha256:closeout-capability',
        provider: 'linear',
        context: { workspaceId: 'workspace-1' },
        outcome: {
          classification: 'observed',
          identity: { stableId: 'issue-1', aliases: [] },
          fields:
            action.semanticOperation === 'transition'
              ? { status: 'completed' }
              : {},
          ...(action.semanticOperation === 'annotate'
            ? {
                extensions: {
                  annotationDigest: semanticDigest(action.intent.body),
                },
              }
            : {}),
          revisionDigest: 'sha256:closeout-readback',
          diagnosticCode: null,
        },
      };
      return runner({
        operation: 'operation-continue',
        projectRoot: repository,
        operationId: closeoutOperationId,
        observationStdin: true,
      });
    };
    for (const operationClass of ['annotate', 'transition'] as const) {
      closeoutOperation = await store.readOperation(closeoutOperationId);
      const step = closeoutOperation!.steps.find(
        (candidate) => candidate.semanticOperation === operationClass,
      )!;
      await writeInteractiveAuthority(operationClass, step.previewDigest);
      runnerInput = capability;
      const actionHandoff = await runner({
        operation: 'closeout',
        projectRoot: repository,
        projectPath: 'shared/example',
        previewOperationId: closeoutBatchId,
        capabilityEvidenceStdin: true,
        authorityEvidenceFile: authorityPath,
      });
      expect(actionHandoff.externalAction).toMatchObject({
        semanticOperation: operationClass,
        outboundSafety: {
          projectionDigest: expect.stringMatching(/^sha256:/),
          resultDigest: expect.stringMatching(/^sha256:/),
        },
      });
      if (operationClass === 'annotate') {
        await unlink(
          join(
            store.locations.operational.operationsDir,
            `${closeoutOperationId}.action`,
          ),
        );
      }
      const completed = await completeCloseoutAction(
        actionHandoff.externalAction!,
      );
      expect(completed.status).toBe(
        operationClass === 'annotate' ? 'needs-review' : 'ok',
      );
    }
    expect(await store.readBatch(closeoutBatchId)).toMatchObject({
      state: 'complete',
      outcomes: { [closeoutOperationId]: 'verified' },
    });

    const discussion = await runner({
      operation: 'discussion',
      projectRoot: repository,
      bindingId: projectBinding.bindingId,
      discussionLimit: 5,
    });
    expect(discussion).toMatchObject({
      status: 'blocked',
      persisted: false,
      results: [{ diagnosticCode: 'discussion-capability-unavailable' }],
    });

    let discussionInput: unknown = {
      provider: 'linear',
      context: { workspaceId: 'workspace-1' },
      surfaceKind: 'connector',
      availability: 'available',
      semanticCapabilities: ['read-discussion'],
      evidenceDigest: 'sha256:discussion-capability',
      observedAt: timestamp,
    };
    const discussionRunner = createProductionRemoteRunner({
      now: () => timestamp,
      randomId: vi
        .fn()
        .mockReturnValueOnce('discussion-operation')
        .mockReturnValueOnce('discussion-step')
        .mockReturnValueOnce('discussion-next-step'),
      readObservationStdin: async () => discussionInput,
    });
    const discussionHandoff = await discussionRunner({
      operation: 'discussion',
      projectRoot: repository,
      bindingId: projectBinding.bindingId,
      discussionLimit: 2,
      capabilityEvidenceStdin: true,
    });
    expect(discussionHandoff).toMatchObject({
      status: 'pending',
      persisted: true,
      externalAction: { semanticOperation: 'read-discussion' },
    });
    const discussionAction = discussionHandoff.externalAction!;
    const syntheticSensitiveBody =
      'authorization: bearer synthetic_fixture_value_123456789';
    discussionInput = {
      schemaVersion: 1,
      operationId: discussionAction.operationId,
      stepId: discussionAction.stepId,
      actionDigest: discussionAction.actionDigest,
      observedAt: timestamp,
      provider: 'linear',
      context: { workspaceId: 'workspace-1' },
      capabilityEvidenceDigest: 'sha256:discussion-capability',
      availability: 'available',
      items: [
        { id: 'comment-1', body: syntheticSensitiveBody, createdAt: timestamp },
      ],
      nextCursor: 'page-2',
    };
    const discussionNext = await discussionRunner({
      operation: 'operation-continue',
      projectRoot: repository,
      operationId: discussionAction.operationId,
      observationStdin: true,
    });
    expect(discussionNext).toMatchObject({
      status: 'pending',
      externalAction: {
        semanticOperation: 'read-discussion',
        intent: { limit: 1, cursor: 'page-2' },
      },
      discussionEvidence: { persisted: false, truncated: true },
    });
    const discussionNextAction = discussionNext.externalAction!;
    discussionInput = {
      schemaVersion: 1,
      operationId: discussionNextAction.operationId,
      stepId: discussionNextAction.stepId,
      actionDigest: discussionNextAction.actionDigest,
      observedAt: timestamp,
      provider: 'linear',
      context: { workspaceId: 'workspace-1' },
      capabilityEvidenceDigest: 'sha256:discussion-capability',
      availability: 'available',
      items: [
        {
          id: 'comment-2',
          body: 'Bounded public discussion.',
          createdAt: timestamp,
        },
      ],
      nextCursor: null,
    };
    const discussionComplete = await discussionRunner({
      operation: 'operation-continue',
      projectRoot: repository,
      operationId: discussionAction.operationId,
      observationStdin: true,
    });
    expect(discussionComplete).toMatchObject({
      status: 'ok',
      discussionEvidence: {
        persisted: false,
        truncated: false,
        items: [{ id: 'comment-2', incomplete: false }],
      },
    });
    expect(
      await readFile(
        join(
          store.locations.operational.operationsDir,
          `${discussionAction.operationId}.json`,
        ),
        'utf8',
      ),
    ).not.toContain(syntheticSensitiveBody);

    const resolution = await runner({
      operation: 'resolve',
      projectRoot: repository,
      bindingId: migrationBinding.bindingId,
      resolutionKind: 'detach',
    });
    expect(resolution).toMatchObject({
      status: 'needs-review',
      persisted: true,
      results: [{ diagnosticCode: 'fresh-approval-and-evidence-required' }],
    });
    const resolutionOperationId = resolution.recovery[0]?.instruction.match(
      /preview (op_[A-Za-z0-9_-]+)/,
    )?.[1];
    expect(resolutionOperationId).toBeTruthy();
    const resolutionOperation = await store.readOperation(
      resolutionOperationId!,
    );
    await writeFile(
      authorityPath,
      JSON.stringify({
        schemaVersion: 1,
        kind: 'interactive',
        sourceId: 'synthetic-test',
        invocationId: 'detach-invocation',
        issuedAt: timestamp,
        expiresAt: '2026-08-31T12:05:00.000Z',
        instruction: {
          operationClass: 'detach',
          targetId: migrationBinding.bindingId,
          evidenceDigest: 'sha256:detach-instruction',
        },
        approval: {
          previewDigest: resolutionOperation!.preview.digest,
          operationClass: 'detach',
          approvedAt: timestamp,
          actor: 'synthetic-reviewer',
          source: 'synthetic-test-approval',
        },
      }),
    );
    const detached = await runner({
      operation: 'resolve',
      projectRoot: repository,
      bindingId: migrationBinding.bindingId,
      resolutionKind: 'detach',
      previewOperationId: resolutionOperationId,
      authorityEvidenceFile: authorityPath,
    });
    expect(detached).toMatchObject({ status: 'ok', persisted: true });
    expect(
      await store.readBindingMetadata(migrationBinding.bindingId),
    ).toMatchObject({ lifecycle: 'tombstoned' });

    const relinkPreview = await runner({
      operation: 'resolve',
      projectRoot: repository,
      bindingId: migrationBinding.bindingId,
      resolutionKind: 'relink',
      providerRef: 'linear:issue-relocated',
    });
    const relinkOperationId = relinkPreview.recovery[0]?.instruction.match(
      /preview (op_[A-Za-z0-9_-]+)/,
    )?.[1];
    const relinkOperation = await store.readOperation(relinkOperationId!);
    await writeFile(
      authorityPath,
      JSON.stringify({
        schemaVersion: 1,
        kind: 'interactive',
        sourceId: 'synthetic-test',
        invocationId: 'relink-invocation',
        issuedAt: timestamp,
        expiresAt: '2026-08-31T12:05:00.000Z',
        instruction: {
          operationClass: 'relink',
          targetId: migrationBinding.bindingId,
          evidenceDigest: 'sha256:relink-instruction',
        },
        approval: {
          previewDigest: relinkOperation!.preview.digest,
          operationClass: 'relink',
          approvedAt: timestamp,
          actor: 'synthetic-reviewer',
          source: 'synthetic-test-approval',
        },
      }),
    );
    runnerInput = {
      provider: 'linear',
      context: { workspaceId: 'workspace-1' },
      surfaceKind: 'connector',
      availability: 'available',
      semanticCapabilities: ['read'],
      evidenceDigest: 'sha256:resolution-capability',
      observedAt: timestamp,
    };
    const relinkHandoff = await runner({
      operation: 'resolve',
      projectRoot: repository,
      bindingId: migrationBinding.bindingId,
      resolutionKind: 'relink',
      providerRef: 'linear:issue-relocated',
      previewOperationId: relinkOperationId,
      capabilityEvidenceStdin: true,
      authorityEvidenceFile: authorityPath,
    });
    const relinkAction = relinkHandoff.externalAction!;
    runnerInput = {
      schemaVersion: 1,
      operationId: relinkAction.operationId,
      stepId: relinkAction.stepId,
      actionDigest: relinkAction.actionDigest,
      observedAt: timestamp,
      surfaceKind: 'connector',
      capabilityEvidenceDigest: 'sha256:resolution-capability',
      provider: 'linear',
      context: { workspaceId: 'workspace-1' },
      outcome: {
        classification: 'observed',
        identity: { stableId: 'issue-relocated', aliases: ['RELOCATED-1'] },
        fields: {
          title: 'Relocated issue',
          description: 'Relocated description',
          priority: 'high',
          status: 'open',
        },
        revisionDigest: 'sha256:relink-read',
        diagnosticCode: null,
      },
    };
    expect(
      await runner({
        operation: 'operation-continue',
        projectRoot: repository,
        operationId: relinkOperationId,
        observationStdin: true,
      }),
    ).toMatchObject({ status: 'ok' });
    expect(
      await store.readBindingMetadata(migrationBinding.bindingId),
    ).toMatchObject({
      lifecycle: 'active',
      remoteIdentity: { stableId: 'issue-relocated' },
    });

    const recreatePreview = await runner({
      operation: 'resolve',
      projectRoot: repository,
      bindingId: migrationBinding.bindingId,
      resolutionKind: 'recreate',
    });
    const recreateOperationId = recreatePreview.recovery[0]?.instruction.match(
      /preview (op_[A-Za-z0-9_-]+)/,
    )?.[1];
    const recreateOperation = await store.readOperation(recreateOperationId!);
    await writeFile(
      authorityPath,
      JSON.stringify({
        schemaVersion: 1,
        kind: 'interactive',
        sourceId: 'synthetic-test',
        invocationId: 'recreate-invocation',
        issuedAt: timestamp,
        expiresAt: '2026-08-31T12:05:00.000Z',
        instruction: {
          operationClass: 'recreate',
          targetId: migrationBinding.bindingId,
          evidenceDigest: 'sha256:recreate-instruction',
        },
        approval: {
          previewDigest: recreateOperation!.preview.digest,
          operationClass: 'recreate',
          approvedAt: timestamp,
          actor: 'synthetic-reviewer',
          source: 'synthetic-test-approval',
        },
      }),
    );
    runnerInput = {
      provider: 'linear',
      context: { workspaceId: 'workspace-1' },
      surfaceKind: 'connector',
      availability: 'available',
      semanticCapabilities: ['search-duplicates', 'create', 'read'],
      evidenceDigest: 'sha256:recreate-capability',
      observedAt: timestamp,
    };
    const recreateHandoff = await runner({
      operation: 'resolve',
      projectRoot: repository,
      bindingId: migrationBinding.bindingId,
      resolutionKind: 'recreate',
      previewOperationId: recreateOperationId,
      capabilityEvidenceStdin: true,
      authorityEvidenceFile: authorityPath,
    });
    const searchAction = recreateHandoff.externalAction!;
    runnerInput = {
      schemaVersion: 1,
      operationId: searchAction.operationId,
      stepId: searchAction.stepId,
      actionDigest: searchAction.actionDigest,
      observedAt: timestamp,
      surfaceKind: 'connector',
      capabilityEvidenceDigest: 'sha256:recreate-capability',
      provider: 'linear',
      context: { workspaceId: 'workspace-1' },
      outcome: {
        classification: 'observed',
        identity: null,
        fields: {},
        extensions: { duplicateSearchOutcome: 'no-match' },
        revisionDigest: 'sha256:recreate-search',
        diagnosticCode: null,
      },
    };
    const createPreview = await runner({
      operation: 'operation-continue',
      projectRoot: repository,
      operationId: recreateOperationId,
      observationStdin: true,
    });
    expect(createPreview).toMatchObject({
      status: 'needs-review',
      externalAction: null,
    });
    const createOperation = await store.readOperation(recreateOperationId!);
    await writeFile(
      authorityPath,
      JSON.stringify({
        schemaVersion: 1,
        kind: 'interactive',
        sourceId: 'synthetic-test',
        invocationId: 'recreate-create-invocation',
        issuedAt: timestamp,
        expiresAt: '2026-08-31T12:05:00.000Z',
        instruction: {
          operationClass: 'recreate',
          targetId: migrationBinding.bindingId,
          evidenceDigest: 'sha256:recreate-create-instruction',
        },
        approval: {
          previewDigest: createOperation!.preview.digest,
          operationClass: 'recreate',
          approvedAt: timestamp,
          actor: 'synthetic-reviewer',
          source: 'synthetic-test-approval',
        },
      }),
    );
    const createHandoff = await runner({
      operation: 'resolve',
      projectRoot: repository,
      bindingId: migrationBinding.bindingId,
      resolutionKind: 'recreate',
      previewOperationId: recreateOperationId,
      authorityEvidenceFile: authorityPath,
    });
    expect(createHandoff.externalAction).toMatchObject({
      semanticOperation: 'create',
      outboundSafety: {
        projectionDigest: expect.stringMatching(/^sha256:/),
        resultDigest: expect.stringMatching(/^sha256:/),
      },
    });
    const createAction = createHandoff.externalAction!;
    runnerInput = {
      schemaVersion: 1,
      operationId: createAction.operationId,
      stepId: createAction.stepId,
      actionDigest: createAction.actionDigest,
      observedAt: timestamp,
      surfaceKind: 'connector',
      capabilityEvidenceDigest: 'sha256:recreate-capability',
      provider: 'linear',
      context: { workspaceId: 'workspace-1' },
      outcome: {
        classification: 'observed',
        identity: { stableId: 'issue-recreated', aliases: ['RECREATED-1'] },
        fields: {
          title: 'Local title',
          priority: 'high',
        },
        revisionDigest: 'sha256:recreate-create',
        diagnosticCode: null,
      },
    };
    const recreateReadHandoff = await runner({
      operation: 'operation-continue',
      projectRoot: repository,
      operationId: recreateOperationId,
      observationStdin: true,
    });
    expect(recreateReadHandoff.externalAction).toMatchObject({
      semanticOperation: 'read',
    });
    const recreateReadAction = recreateReadHandoff.externalAction!;
    runnerInput = {
      schemaVersion: 1,
      operationId: recreateReadAction.operationId,
      stepId: recreateReadAction.stepId,
      actionDigest: recreateReadAction.actionDigest,
      observedAt: timestamp,
      surfaceKind: 'connector',
      capabilityEvidenceDigest: 'sha256:recreate-capability',
      provider: 'linear',
      context: { workspaceId: 'workspace-1' },
      outcome: {
        classification: 'observed',
        identity: { stableId: 'issue-recreated', aliases: ['RECREATED-1'] },
        fields: {
          title: 'Local title',
          description: 'Local managed description',
          priority: 'high',
          status: 'open',
        },
        revisionDigest: 'sha256:recreate-readback',
        diagnosticCode: null,
      },
    };
    expect(
      await runner({
        operation: 'operation-continue',
        projectRoot: repository,
        operationId: recreateOperationId,
        observationStdin: true,
      }),
    ).toMatchObject({ status: 'ok' });
    expect(
      await store.readBindingMetadata(migrationBinding.bindingId),
    ).toMatchObject({ remoteIdentity: { stableId: 'issue-recreated' } });

    const completedRecreate = await store.readOperation(recreateOperationId!);
    for (const [duplicateOutcome, expectedStatus] of [
      ['found-existing', 'pending'],
      ['search-unavailable', 'blocked'],
      ['ambiguous', 'blocked'],
    ] as const) {
      const operationId = `op_duplicate_${duplicateOutcome.replace('-', '_')}`;
      const search = buildExternalAction({
        operationId,
        stepId: `${operationId}_search`,
        provider: 'linear',
        semanticOperation: 'search-duplicates',
        context: { workspaceId: 'workspace-1' },
        intent: { query: 'Local title' },
        expectedObservation: {
          fields: ['title'],
          extensionFields: ['duplicateSearchOutcome', 'candidateCount'],
          requireIdentity: false,
          stableId: null,
          capabilityEvidenceDigest: 'sha256:recreate-capability',
        },
        persistedPreview: {},
      });
      await store.createOperation({
        ...completedRecreate!,
        operationId,
        correlationId: operationId,
        state: 'pending',
        reason: {
          code: 'resolution-recreate-observation-required',
          message: 'Provider-neutral resolution evidence is required.',
        },
        attempts: [],
        observations: [],
        verification: [],
        materializationPlan: undefined,
        materializationSteps: undefined,
        currentAction: undefined,
        verificationHandoff: undefined,
        lastSafeStep: 'planned',
        retryDisposition: 'safe-before-attempt',
        outcome: { classification: 'pending', message: null, verifiedAt: null },
      });
      await store.writeCurrentAction(operationId, search);
      runnerInput = {
        schemaVersion: 1,
        operationId,
        stepId: search.stepId,
        actionDigest: search.actionDigest,
        observedAt: timestamp,
        surfaceKind: 'connector',
        capabilityEvidenceDigest: 'sha256:recreate-capability',
        provider: 'linear',
        context: { workspaceId: 'workspace-1' },
        outcome: {
          classification: 'observed',
          identity:
            duplicateOutcome === 'found-existing'
              ? { stableId: 'issue-found', aliases: ['FOUND-1'] }
              : null,
          fields: {},
          extensions: {
            duplicateSearchOutcome: duplicateOutcome,
            ...(duplicateOutcome === 'ambiguous' ? { candidateCount: 2 } : {}),
          },
          revisionDigest: 'sha256:duplicate-search',
          diagnosticCode: null,
        },
      };
      expect(
        await runner({
          operation: 'operation-continue',
          projectRoot: repository,
          operationId,
          observationStdin: true,
        }),
      ).toMatchObject({ status: expectedStatus });
    }

    const uncertainAction = buildExternalAction({
      operationId: 'op_recreate_uncertain',
      stepId: 'op_recreate_uncertain_create',
      provider: createAction.provider,
      semanticOperation: 'create',
      context: createAction.context,
      intent: createAction.intent,
      expectedObservation: createAction.expectedObservation,
      persistedPreview: {
        projectionDigest: createAction.outboundSafety!.projectionDigest,
        safetyResultDigest: createAction.outboundSafety!.resultDigest,
      },
      projection: createAction.intent.fields as {
        title?: string;
        description?: string | null;
        priority?: string | null;
      },
      outboundSafety: {
        schemaVersion: 1,
        projectionDigest: createAction.outboundSafety!.projectionDigest,
        verdict: 'safe',
        resultDigest: createAction.outboundSafety!.resultDigest,
        reasons: [],
        assessedAt: timestamp,
      },
    });
    await store.createOperation({
      ...completedRecreate!,
      operationId: uncertainAction.operationId,
      correlationId: uncertainAction.operationId,
      state: 'attempt-started',
      reason: {
        code: 'recreate-create-attempt-started',
        message: 'Approved create substep handed off exactly once.',
      },
      approval: completedRecreate!.approval,
      attempts: [
        {
          attemptId: uncertainAction.stepId,
          startedAt: timestamp,
          completedAt: null,
          execution: completedRecreate!.selectedExecution!,
          requestDigest: uncertainAction.actionDigest,
          receiptDigest: null,
        },
      ],
      observations: [],
      verification: [],
      materializationPlan: undefined,
      materializationSteps: undefined,
      currentAction: undefined,
      verificationHandoff: undefined,
      lastSafeStep: 'attempt-started',
      retryDisposition: 'reconcile-required',
      outcome: { classification: 'pending', message: null, verifiedAt: null },
    });
    await store.writeCurrentAction(
      uncertainAction.operationId,
      uncertainAction,
    );
    runnerInput = {
      schemaVersion: 1,
      operationId: uncertainAction.operationId,
      stepId: uncertainAction.stepId,
      actionDigest: uncertainAction.actionDigest,
      observedAt: timestamp,
      surfaceKind: 'connector',
      capabilityEvidenceDigest: 'sha256:recreate-capability',
      provider: 'linear',
      context: { workspaceId: 'workspace-1' },
      outcome: {
        classification: 'unknown',
        identity: null,
        fields: {},
        revisionDigest: null,
        diagnosticCode: 'unknown-create-result',
      },
    };
    expect(
      await runner({
        operation: 'operation-continue',
        projectRoot: repository,
        operationId: uncertainAction.operationId,
        observationStdin: true,
      }),
    ).toMatchObject({ status: 'uncertain' });
    expect(
      await store.readBindingMetadata(migrationBinding.bindingId),
    ).toMatchObject({ lifecycle: 'blocked' });
    expect(
      await store.readBindingState(migrationBinding.bindingId),
    ).toMatchObject({
      lifecycle: 'blocked',
      lifecycleCondition: 'temporarily-unavailable',
    });
    await expect(
      runner({
        operation: 'operation-continue',
        projectRoot: repository,
        operationId: uncertainAction.operationId,
        observationStdin: true,
      }),
    ).rejects.toThrow(/terminal|replay/i);

    const doctor = await runner({
      operation: 'doctor',
      projectRoot: repository,
    });
    expect(doctor).toMatchObject({ status: 'blocked', persisted: true });
    runnerInput = {
      provider: 'linear',
      context: { workspaceId: 'workspace-1' },
      surfaceKind: 'connector',
      availability: 'available',
      semanticCapabilities: ['read'],
      evidenceDigest: 'sha256:doctor-capability',
      observedAt: timestamp,
    };
    const doctorWithEvidence = await runner({
      operation: 'doctor',
      projectRoot: repository,
      capabilityEvidenceStdin: true,
    });
    expect(doctorWithEvidence).toMatchObject({
      status: 'blocked',
      persisted: true,
    });
    expect(
      doctorWithEvidence.recovery.some((item) =>
        item.code.includes('host_capability'),
      ),
    ).toBe(false);

    const migration = await runner({
      operation: 'migrate',
      projectRoot: repository,
      migrationMode: 'check',
    });
    expect(migration).toMatchObject({
      status: 'needs-review',
      persisted: false,
    });
    const previewDigest =
      migration.recovery[0]?.instruction.match(/preview (\S+);/)?.[1];
    expect(previewDigest).toBeTruthy();
    const appliedMigration = await runner({
      operation: 'migrate',
      projectRoot: repository,
      migrationMode: 'apply',
      migrationApprovalDigest: previewDigest,
    });
    expect(appliedMigration).toMatchObject({ status: 'ok', persisted: true });
    expect(await readFile(join(repository, migrationPath), 'utf8')).toContain(
      'type: linear\n    ref: issue-legacy',
    );
    expect(
      await readFile(join(repository, associationOnlyMigrationPath), 'utf8'),
    ).toContain('type: linear\n    ref: association-only');
    await expect(
      readFile(
        join(store.locations.operational.root, 'shared-storage-preview.json'),
        'utf8',
      ),
    ).rejects.toMatchObject({ code: 'ENOENT' });
  });

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

  it.each([
    ['user-authorized', 'after-create-operation'],
    ['user-authorized', 'after-create-action'],
    ['user-authorized', 'after-create-authorization'],
    ['user-authorized', 'after-create-attempt'],
    ['user-authorized', 'before-create-envelope'],
    ['user-approved', 'after-create-operation'],
    ['user-approved', 'after-create-action'],
    ['user-approved', 'after-create-authorization'],
    ['user-approved', 'after-create-attempt'],
    ['user-approved', 'before-create-envelope'],
  ] as const)(
    'resumes or reconciles %s create handoff after %s without replay',
    async (authorityMode, crashPoint) => {
      const repository = await mkdtemp(join(tmpdir(), 'oat-create-handoff-'));
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
      await writeFile(
        targetPath,
        '---\ntitle: Local title\npriority: high\nassociated_issues: []\n---\n\n## Description\n\nLocal description\n',
      );
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
                  operations: { create: authorityMode },
                },
              },
            },
          },
        })}\n`,
      );
      const authorityPath = join(repository, '.oat', 'invocation.json');
      const invocation = (approval: Record<string, unknown> | null) => ({
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
        approval,
      });
      await writeFile(authorityPath, `${JSON.stringify(invocation(null))}\n`);
      const capability = {
        provider: 'linear',
        context: { workspaceId: 'workspace-1' },
        surfaceKind: 'connector',
        availability: 'available',
        semanticCapabilities: ['create'],
        evidenceDigest: 'sha256:create-capability',
        observedAt: timestamp,
      };
      const request: RemoteCommandRequest = {
        operation: 'publish',
        projectRoot: repository,
        createTarget: {
          provider: 'linear',
          localKind: 'backlog',
          localId: 'item-1',
        },
        capabilityEvidenceStdin: true,
        authorityEvidenceFile: authorityPath,
      };
      const runner = createProductionRemoteRunner({
        now: () => timestamp,
        randomId: vi
          .fn()
          .mockReturnValueOnce('handoff-operation')
          .mockReturnValueOnce('handoff-binding'),
        readObservationStdin: async () => capability,
        crash: (point) => {
          if (point === crashPoint) throw new Error(`crash:${point}`);
        },
      });
      const locations = resolveRemoteStorageLocations({
        repoRoot: repository,
        gitCommonDir: join(repository, '.git'),
        repositoryIdentity: `local-repository:${resolve(repository)}`,
        stateStorage: 'local',
        target: { kind: 'backlog', scope: 'shared', path: null },
      });
      const store = new RemoteSyncStore(locations);
      let operationId = 'op_handoff-operation';
      let applyRequest = request;

      if (authorityMode === 'user-approved') {
        let preview;
        if (crashPoint === 'after-create-operation') {
          await expect(runner(request)).rejects.toThrow(`crash:${crashPoint}`);
          const restartedPreview = createProductionRemoteRunner({
            now: () => timestamp,
            readObservationStdin: async () => capability,
          });
          preview = await restartedPreview({
            ...request,
            previewOperationId: operationId,
          });
        } else {
          preview = await runner(request);
        }
        const emitted = preview.approvalPreview!;
        expect(emitted).toMatchObject({
          operationId,
          operationClass: 'create',
          fieldMask: expect.arrayContaining([
            'title',
            'description',
            'priority',
          ]),
          authority: 'user-approved',
          revision: {
            source: 'local-source-unbound',
            strength: 'hash-only',
            updatedAt: null,
            observedAt: timestamp,
          },
        });
        expect(emitted.fieldMask).toHaveLength(3);
        await writeFile(
          authorityPath,
          `${JSON.stringify(
            invocation({
              previewDigest: emitted.digest,
              operationClass: emitted.operationClass,
              approvedAt: timestamp,
              actor: 'operator-1',
              source: 'emitted-public-preview',
            }),
          )}\n`,
        );
        applyRequest = { ...request, previewOperationId: emitted.operationId };
        if (crashPoint === 'after-create-operation') {
          const completed = await createProductionRemoteRunner({
            now: () => timestamp,
            readObservationStdin: async () => capability,
          })(applyRequest);
          expect(completed.externalAction).not.toBeNull();
        } else {
          await expect(runner(applyRequest)).rejects.toThrow(
            `crash:${crashPoint}`,
          );
        }
      } else {
        await expect(runner(request)).rejects.toThrow(`crash:${crashPoint}`);
        operationId = (await readdir(locations.operational.operationsDir))
          .find((path) => path.endsWith('.json'))!
          .slice(0, -'.json'.length);
      }

      const exposureUncertain =
        crashPoint === 'after-create-attempt' ||
        crashPoint === 'before-create-envelope';
      let resumed;
      if (
        authorityMode === 'user-authorized' &&
        crashPoint === 'after-create-operation'
      ) {
        resumed = await createProductionRemoteRunner({
          now: () => timestamp,
          readObservationStdin: async () => capability,
        })(request);
      } else if (
        !(
          authorityMode === 'user-approved' &&
          crashPoint === 'after-create-operation'
        )
      ) {
        const continuation = createProductionRemoteRunner({
          now: () => timestamp,
        })({
          operation: 'operation-continue',
          projectRoot: repository,
          operationId,
        });
        if (exposureUncertain) {
          await expect(continuation).rejects.toThrow(/reconcil/i);
        } else {
          resumed = await continuation;
        }
      }

      const operation = await store.readOperation(operationId);
      const durableAction = await store.readCurrentAction(operationId);
      expect(operation).toMatchObject({
        state: 'attempt-started',
        attempts: [
          {
            attemptId: durableAction!.stepId,
            requestDigest: durableAction!.actionDigest,
          },
        ],
      });
      if (resumed) {
        expect(resumed.externalAction).toEqual(durableAction);
      }
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

  it('ignores remote-owned prose changes around unchanged governed managed content without writing', () => {
    const current = state();
    const managedBody =
      'Remote owner changed this prefix.\n\n<!-- OAT-MANAGED:bnd_service_001:START -->\n## OAT-managed\n\nLocal managed description\n<!-- OAT-MANAGED:bnd_service_001:END -->\n\nRemote owner changed this suffix.';
    const unchanged = state({
      ...current,
      localProjection: {
        ...current.localProjection,
        title: 'Remote title',
        priority: null,
      },
      snapshot: sanitizeRemoteSnapshot({
        ...current.snapshot!,
        snapshotId: 'snap_service_surrounding_prose',
        issue: { ...current.snapshot!.issue, description: managedBody },
      }),
      baseline: {
        recordType: 'baseline',
        schemaVersion: 1,
        baselineId: 'base_service_managed',
        bindingId: 'bnd_service_001',
        agreedAt: timestamp,
        acceptedByOperationId: 'op_service_managed',
        localProjectionRevision: current.localProjection.sourceRevision,
        remoteRevision: current.snapshot!.revision,
        fields: {
          title: { value: 'Remote title', hash: 'sha256:title' },
          description: {
            value: 'Local managed description',
            hash: 'sha256:description',
          },
          priority: { value: null, hash: 'sha256:priority' },
        },
      },
    });

    expect(() =>
      planProductionMutationProjection({
        metadata: binding(),
        state: unchanged,
        descriptionMode: 'managed-section',
        operation: 'reconcile',
        priorityMapping: true,
      }),
    ).toThrow(/permit no outbound fields/i);
  });

  it('updates changed governed managed content while preserving remote-owned prose', () => {
    const current = state();
    const managedBody =
      'Remote owner prefix.\n\n<!-- OAT-MANAGED:bnd_service_001:START -->\n## OAT-managed\n\nPrevious managed description\n<!-- OAT-MANAGED:bnd_service_001:END -->\n\nRemote owner suffix.';
    const changed = state({
      ...current,
      localProjection: {
        ...current.localProjection,
        title: 'Remote title',
        priority: null,
      },
      snapshot: sanitizeRemoteSnapshot({
        ...current.snapshot!,
        snapshotId: 'snap_service_changed_managed_content',
        issue: { ...current.snapshot!.issue, description: managedBody },
      }),
      baseline: {
        recordType: 'baseline',
        schemaVersion: 1,
        baselineId: 'base_service_changed_managed_content',
        bindingId: 'bnd_service_001',
        agreedAt: timestamp,
        acceptedByOperationId: 'op_service_changed_managed_content',
        localProjectionRevision: current.localProjection.sourceRevision,
        remoteRevision: current.snapshot!.revision,
        fields: {
          title: { value: 'Remote title', hash: 'sha256:title' },
          description: {
            value: 'Previous managed description',
            hash: 'sha256:description',
          },
          priority: { value: null, hash: 'sha256:priority' },
        },
      },
    });

    expect(
      planProductionMutationProjection({
        metadata: binding(),
        state: changed,
        descriptionMode: 'managed-section',
        operation: 'reconcile',
        priorityMapping: true,
      }),
    ).toEqual({
      description:
        'Remote owner prefix.\n\n<!-- OAT-MANAGED:bnd_service_001:START -->\n## OAT-managed\n\nLocal managed description\n<!-- OAT-MANAGED:bnd_service_001:END -->\n\nRemote owner suffix.',
    });
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
          issue: { description: fields.description },
        },
        baseline: {
          acceptedByOperationId: mutation.operationId,
          localProjectionRevision: localProjection.sourceRevision,
          remoteRevision: { contentHash: 'sha256:update-authoritative' },
          fields: {
            title: { value: 'Local title' },
            description: { value: 'Local managed description' },
            priority: { value: 'high' },
          },
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

  it.each([
    'after-observation-acceptance',
    'after-verification-action-retired',
  ] as const)(
    'fails closed after %s before the verification journal is durable',
    async (handoffCrashPoint) => {
      const repository = await mkdtemp(join(tmpdir(), 'oat-create-observed-'));
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
      await writeFile(
        targetPath,
        '---\ntitle: Local title\npriority: high\nassociated_issues: []\n---\n\n## Description\n\nLocal description\n',
      );
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
            targetId: 'backlog:item-1',
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
      const ids = ['observed-operation', 'observed-binding', 'observed-create'];
      const prepared = await createProductionRemoteRunner({
        now: () => timestamp,
        randomId: () => ids.shift() ?? 'unused',
        readObservationStdin: async () => currentObservation,
      })({
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
          identity: { stableId: 'issue-observed-1', aliases: ['OBSERVED-1'] },
          fields: createAction.intent.fields,
          revisionDigest: 'sha256:create-observation',
          diagnosticCode: null,
        },
      };
      const interrupted = createProductionRemoteRunner({
        now: () => timestamp,
        randomId: () => 'observed-verification',
        readObservationStdin: async () => currentObservation,
        crash: (point) => {
          if (point === handoffCrashPoint) {
            throw new Error(`crash:${point}`);
          }
        },
      });
      await expect(
        interrupted({
          operation: 'operation-continue',
          projectRoot: repository,
          operationId: createAction.operationId,
          observationStdin: true,
        }),
      ).rejects.toThrow(`crash:${handoffCrashPoint}`);

      const restarted = createProductionRemoteRunner({
        now: () => timestamp,
        readObservationStdin: async () => {
          throw new Error('restart must not emit the create action');
        },
      });
      await expect(
        restarted({
          operation: 'operation-continue',
          projectRoot: repository,
          operationId: createAction.operationId,
        }),
      ).rejects.toThrow(/reconcil/i);
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
    const interrupted = createProductionRemoteRunner({
      now: () => timestamp,
      randomId: () => 'service-project-verify',
      readObservationStdin: async () => currentObservation,
      crash: (point) => {
        if (point === 'after-verification-handoff') {
          throw new Error('crash:after-verification-handoff');
        }
      },
    });
    await expect(
      interrupted({
        operation: 'operation-continue',
        projectRoot: repository,
        operationId: createAction.operationId,
        observationStdin: true,
      }),
    ).rejects.toThrow('crash:after-verification-handoff');
    const locations = resolveRemoteStorageLocations({
      repoRoot: repository,
      gitCommonDir: join(repository, '.git'),
      repositoryIdentity: `local-repository:${resolve(repository)}`,
      stateStorage: 'local',
      target: { kind: 'backlog', scope: 'shared', path: null },
    });
    const store = new RemoteSyncStore(locations);
    const durableOperation = await store.readOperation(
      createAction.operationId,
    );
    expect(durableOperation).not.toBeNull();
    expect(durableOperation!.currentAction).toEqual(
      durableOperation!.verificationHandoff!.verificationAction,
    );
    const restarted = createProductionRemoteRunner({
      now: () => timestamp,
      randomId: () => 'service-project-restarted',
      readObservationStdin: async () => currentObservation,
    });
    const pendingRead = await restarted({
      operation: 'operation-continue',
      projectRoot: repository,
      operationId: createAction.operationId,
    });
    const readAction = pendingRead.externalAction!;
    expect(readAction).toEqual(durableOperation!.currentAction);
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
      restarted({
        operation: 'operation-continue',
        projectRoot: repository,
        operationId: readAction.operationId,
        observationStdin: true,
      }),
    ).resolves.toMatchObject({ status: 'ok' });
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
        acceptedByOperationId: createAction.operationId,
        remoteRevision: { contentHash: 'sha256:project-readback' },
        fields: {
          title: { value: 'Published project' },
          description: { value: 'Explicit summary' },
          priority: { value: 'high' },
        },
      },
    });
  });

  it('fails closed before materializing an incomplete persisted project create', async () => {
    const repository = await mkdtemp(join(tmpdir(), 'oat-incomplete-create-'));
    temporaryDirectories.push(repository);
    execFileSync('git', ['init', '--quiet'], { cwd: repository });
    await mkdir(join(repository, '.oat'), { recursive: true });
    await writeFile(
      join(repository, '.oat', 'config.json'),
      `${JSON.stringify({ pjm: { initialized: true } })}\n`,
    );
    const locations = resolveRemoteStorageLocations({
      repoRoot: repository,
      gitCommonDir: join(repository, '.git'),
      repositoryIdentity: `local-repository:${resolve(repository)}`,
      stateStorage: 'local',
      target: { kind: 'backlog', scope: 'shared', path: null },
    });
    const store = new RemoteSyncStore(locations);
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
    await store.transitionOperation('op_incomplete_project', 'planned', {
      state: 'verification-pending',
      updatedAt: timestamp,
      lastSafeStep: 'verification-pending',
      retryDisposition: 'reconcile-required',
    });
    const readAction = buildExternalAction({
      operationId: 'op_incomplete_project',
      stepId: 'verify_incomplete_project',
      provider: 'linear',
      semanticOperation: 'read',
      context: { workspaceId: 'workspace-1' },
      intent: { stableId: 'issue-incomplete-project' },
      expectedObservation: {
        fields: ['title', 'description', 'priority', 'status'],
        requireIdentity: true,
        stableId: 'issue-incomplete-project',
        capabilityEvidenceDigest: 'sha256:capability',
      },
      persistedPreview: {},
    });
    await store.writeCurrentAction(readAction.operationId, readAction);
    const runner = createProductionRemoteRunner({
      now: () => timestamp,
      readObservationStdin: async () => ({
        schemaVersion: 1,
        operationId: readAction.operationId,
        stepId: readAction.stepId,
        actionDigest: readAction.actionDigest,
        observedAt: timestamp,
        surfaceKind: 'connector',
        capabilityEvidenceDigest: 'sha256:capability',
        provider: 'linear',
        context: { workspaceId: 'workspace-1' },
        outcome: {
          classification: 'observed',
          identity: {
            stableId: 'issue-incomplete-project',
            aliases: ['PROJECT-INCOMPLETE'],
          },
          fields: {
            title: 'Remote title must not become local',
            description: 'Remote description must not become local',
            priority: 'urgent',
            status: 'open',
          },
          revisionDigest: 'sha256:remote-readback',
          diagnosticCode: null,
        },
      }),
    });

    await expect(
      runner({
        operation: 'operation-continue',
        projectRoot: repository,
        operationId: readAction.operationId,
        observationStdin: true,
      }),
    ).rejects.toThrow(/local projection|reconcile/i);
    await expect(
      store.readBindingMetadata('bnd_incomplete_project'),
    ).resolves.toBeNull();
    await expect(
      store.readBindingState('bnd_incomplete_project'),
    ).resolves.toBeNull();

    const verificationDigest = 'sha256:legacy-verified-identity';
    await store.transitionOperation(
      'op_incomplete_project',
      'verification-pending',
      {
        state: 'verified',
        updatedAt: timestamp,
        verification: [
          {
            field: 'remoteIdentity',
            expectedHash: verificationDigest,
            observedHash: verificationDigest,
            status: 'verified',
          },
        ],
        outcome: {
          classification: 'verified',
          message: 'legacy materialization',
          verifiedAt: timestamp,
        },
        lastSafeStep: 'complete',
        retryDisposition: 'not-applicable',
      },
    );
    const metadata: RemoteBindingMetadata = {
      recordType: 'binding-metadata',
      schemaVersion: 1,
      bindingId: 'bnd_incomplete_project',
      provider: 'linear',
      target: {
        kind: 'project',
        scope: 'shared',
        id: 'project-incomplete',
        path: '.oat/projects/shared/project-incomplete',
      },
      remoteIdentity: {
        stableId: 'issue-incomplete-project',
        context: { workspaceId: 'workspace-1' },
        aliases: [],
      },
      identityHistory: [],
      purposes: ['planning'],
      policyRestrictions: {},
      publicationProjection: {
        title: 'plan',
        description: 'summary',
        priority: 'plan',
      },
      provenanceToken: 'oat-create:project-incomplete',
      lifecycle: 'active',
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await expect(
      store.materializeVerifiedBinding('op_incomplete_project', metadata, {
        provider: 'linear',
        stableId: 'issue-incomplete-project',
        verifiedAt: timestamp,
        evidenceDigest: verificationDigest,
      }),
    ).rejects.toThrow(/localProjection/i);
    await mkdir(locations.portable.bindingsDir, { recursive: true });
    await writeFile(
      join(locations.portable.bindingsDir, `${metadata.bindingId}.json`),
      `${JSON.stringify(metadata)}\n`,
    );
    await store.writeBindingState({
      recordType: 'binding-state',
      schemaVersion: 2,
      bindingId: metadata.bindingId,
      provider: metadata.provider,
      metadataUpdatedAt: timestamp,
      localProjection: {
        title: 'Remote title must not become local',
        description: 'Remote description must not become local',
        priority: 'urgent',
        source: 'explicit-project-publication',
        sourceRevision: 'sha256:legacy-synthesized',
        observedAt: timestamp,
      },
      snapshot: null,
      baseline: {
        recordType: 'baseline',
        schemaVersion: 1,
        baselineId: 'base_incomplete_project',
        bindingId: metadata.bindingId,
        agreedAt: timestamp,
        acceptedByOperationId: 'op_incomplete_project',
        localProjectionRevision: 'sha256:legacy-synthesized',
        remoteRevision: {
          strength: 'hash-only',
          token: null,
          updatedAt: timestamp,
          contentHash: 'sha256:remote-readback',
        },
        fields: {
          title: {
            value: 'Remote title must not become local',
            hash: 'sha256:title',
          },
          description: {
            value: 'Remote description must not become local',
            hash: 'sha256:description',
          },
          priority: { value: 'urgent', hash: 'sha256:priority' },
        },
      },
      capability: null,
      contentRedacted: false,
      lifecycle: 'active',
      lifecycleCondition: 'active',
      activeOperationIds: [],
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    await expect(
      runner({
        operation: 'publish',
        projectRoot: repository,
        bindingId: metadata.bindingId,
      }),
    ).rejects.toThrow(/provenance.*incomplete|reconcile or repair/i);
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
