import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { Command } from 'commander';
import { afterEach, describe, expect, it } from 'vitest';

import {
  createPjmRemoteCommand,
  type RemoteCommandRequest,
} from '../commands/pjm/remote/index';
import type {
  RemoteCommandEnvelope,
  RemoteCommandStatus,
} from '../commands/pjm/remote/output';
import { semanticDigest } from '../commands/pjm/remote/provider';
import type {
  RemoteBindingMetadata,
  RemoteBindingState,
} from '../commands/pjm/remote/schema';
import { createProductionRemoteRunner } from '../commands/pjm/remote/service';
import { sanitizeRemoteSnapshot } from '../commands/pjm/remote/snapshot';
import { resolveRemoteStorageLocations } from '../commands/pjm/remote/storage-locator';
import { RemoteSyncStore } from '../commands/pjm/remote/store';

const originalExitCode = process.exitCode;
const temporaryDirectories: string[] = [];

afterEach(async () => {
  process.exitCode = originalExitCode;
  await Promise.all(
    temporaryDirectories.map((path) =>
      rm(path, { recursive: true, force: true }),
    ),
  );
  temporaryDirectories.length = 0;
});

async function runRemoteCommand(
  args: string[],
  status: RemoteCommandStatus,
  json: boolean,
  overrides: {
    projectRoot?: string;
    run?: (request: RemoteCommandRequest) => Promise<RemoteCommandEnvelope>;
  } = {},
): Promise<{
  request: RemoteCommandRequest;
  stdout: string;
  stderr: string;
  exitCode: number;
}> {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const previousStdout = process.stdout.write;
  const previousStderr = process.stderr.write;
  const previousExitCode = process.exitCode;
  let request: RemoteCommandRequest | undefined;
  process.stdout.write = captureWrite(stdout);
  process.stderr.write = captureWrite(stderr);
  process.exitCode = undefined;
  try {
    const root = new Command('oat').option('--json');
    root.addCommand(
      createPjmRemoteCommand({
        resolveProjectRoot: async () =>
          overrides.projectRoot ?? '/fixture-repository',
        checkAdoption: async () => 'complete',
        run: async (candidate) => {
          request = candidate;
          return overrides.run
            ? overrides.run(candidate)
            : envelopeFor(candidate, status);
        },
      }),
    );
    await root.parseAsync([...(json ? ['--json'] : []), 'remote', ...args], {
      from: 'user',
    });
    if (!request) throw new Error('Remote command did not reach its service.');
    return {
      request,
      stdout: stdout.join(''),
      stderr: stderr.join(''),
      exitCode: process.exitCode ?? 0,
    };
  } finally {
    process.stdout.write = previousStdout;
    process.stderr.write = previousStderr;
    process.exitCode = previousExitCode;
  }
}

describe('pjm remote end-to-end command workflows', () => {
  it.each([
    ['ok', 0],
    ['pending', 1],
    ['needs-review', 1],
    ['partial', 1],
    ['uncertain', 1],
    ['blocked', 1],
    ['rejected', 1],
    ['failed', 2],
  ] as const)(
    'keeps human and JSON exit/status parity for %s',
    async (status, exitCode) => {
      const human = await runRemoteCommand(['doctor'], status, false);
      const json = await runRemoteCommand(['doctor'], status, true);
      expect(human.exitCode).toBe(exitCode);
      expect(json.exitCode).toBe(exitCode);
      expect(human.stdout || human.stderr).toContain(`doctor: ${status}`);
      expect(JSON.parse(json.stdout || json.stderr)).toMatchObject({
        status,
        operation: 'doctor',
      });
    },
  );

  it.each([
    [
      [
        'operation',
        'continue',
        '--operation',
        'op_continue_001',
        '--observation-stdin',
      ],
      'operation-continue',
      'pending',
    ],
    [['closeout', '--project', 'shared/example'], 'closeout', 'needs-review'],
    [['closeout', '--project', 'shared/example'], 'closeout', 'partial'],
    [
      ['resolve', 'relink', '--binding', 'bnd_e2e_001', 'linear:new-1'],
      'resolve',
      'needs-review',
    ],
    [['resolve', 'detach', '--binding', 'bnd_e2e_001'], 'resolve', 'ok'],
    [
      ['resolve', 'recreate', '--binding', 'bnd_e2e_001'],
      'resolve',
      'uncertain',
    ],
    [
      ['discussion', '--binding', 'bnd_e2e_001', '--limit', '5'],
      'discussion',
      'ok',
    ],
    [['doctor'], 'doctor', 'blocked'],
  ] as const)(
    'executes %s through the shared envelope',
    async (args, operation, status) => {
      const result = await runRemoteCommand([...args], status, true);
      expect(result.request.operation).toBe(operation);
      expect(JSON.parse(result.stdout || result.stderr)).toMatchObject({
        operation,
        status,
      });
    },
  );

  it('runs doctor and migration through the real production runner in an isolated repository', async () => {
    const repository = await mkdtemp(join(tmpdir(), 'oat-p07-e2e-production-'));
    temporaryDirectories.push(repository);
    execFileSync('git', ['init', '--quiet'], { cwd: repository });
    await mkdir(join(repository, '.oat', 'repo', 'pjm', 'backlog', 'items'), {
      recursive: true,
    });
    await writeFile(
      join(repository, '.oat', 'config.json'),
      `${JSON.stringify({
        pjm: {
          initialized: true,
          remote: {
            schemaVersion: 1,
            policy: {
              description: 'none',
              authority: { default: 'read-only' },
            },
            storage: { state: 'local' },
          },
        },
      })}\n`,
    );
    const target = join(
      repository,
      '.oat',
      'repo',
      'pjm',
      'backlog',
      'items',
      'association-only.md',
    );
    await writeFile(
      target,
      '---\ntitle: Association-only\nassociated_issues:\n  - linear:fixture-1\n---\n',
    );
    const run = createProductionRemoteRunner({
      now: () => '2026-09-05T12:00:00.000Z',
      randomId: () => 'e2e-production',
    });

    const doctor = await runRemoteCommand(['doctor'], 'blocked', true, {
      projectRoot: repository,
      run,
    });
    expect(JSON.parse(doctor.stdout)).toMatchObject({
      operation: 'doctor',
      status: 'blocked',
    });
    const migration = await runRemoteCommand(
      ['migrate', '--check'],
      'needs-review',
      true,
      { projectRoot: repository, run },
    );
    const previewDigest = (
      JSON.parse(migration.stdout) as RemoteCommandEnvelope
    ).recovery[0]?.instruction.match(/preview (\S+);/)?.[1];
    expect(previewDigest).toMatch(/^sha256:/);
    const applied = await runRemoteCommand(
      ['migrate', '--apply', '--approval-digest', previewDigest!],
      'ok',
      true,
      { projectRoot: repository, run },
    );
    expect(JSON.parse(applied.stdout)).toMatchObject({
      operation: 'migrate',
      status: 'ok',
    });
  });

  it('publishes representative targets through the real CLI runner without transitive mirroring', async () => {
    const repository = await mkdtemp(join(tmpdir(), 'oat-p07-e2e-publish-'));
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
            policy: {
              description: 'managed-section',
              authority: {
                default: 'read-only',
                operations: { create: 'user-authorized' },
              },
            },
            storage: { state: 'local' },
          },
        },
      })}\n`,
    );
    const publicationPath = join(repository, 'project-publication.json');
    await writeFile(
      publicationPath,
      `${JSON.stringify({
        title: 'Published project',
        description: 'Explicit project publication',
        priority: 'high',
      })}\n`,
    );
    const providerFixtures = [
      ['github', { repositoryId: 'repository-1' }],
      ['linear', { workspaceId: 'workspace-1' }],
      ['jira', { siteId: 'site-1', projectId: 'project-1' }],
    ] as const;
    let runnerInput: unknown;
    let idSequence = 0;
    const runner = createProductionRemoteRunner({
      now: () => '2026-09-05T12:00:00.000Z',
      randomId: () => `e2e-publish-${(idSequence += 1)}`,
      readObservationStdin: async () => runnerInput,
    });

    for (const [provider, context] of providerFixtures) {
      const capabilityDigest = `sha256:${provider}-publish-capability`;
      runnerInput = {
        provider,
        context,
        surfaceKind: 'connector',
        availability: 'available',
        semanticCapabilities: ['create', 'read'],
        evidenceDigest: capabilityDigest,
        observedAt: '2026-09-05T12:00:00.000Z',
      };
      const authorityPath = join(repository, `${provider}-authority.json`);
      await writeFile(
        authorityPath,
        JSON.stringify({
          schemaVersion: 1,
          kind: 'interactive',
          sourceId: 'e2e-host',
          invocationId: `e2e-publish-${provider}`,
          issuedAt: '2026-09-05T11:59:00.000Z',
          expiresAt: '2026-09-05T12:05:00.000Z',
          instruction: {
            operationClass: 'create',
            targetId: 'project:shared:project-1',
            evidenceDigest: `sha256:${provider}-publish-instruction`,
          },
          approval: null,
        }),
      );
      const prepared = await runRemoteCommand(
        [
          'publish',
          '--provider',
          provider,
          '--to-project',
          'project-1',
          '--project-publication-file',
          publicationPath,
          '--capability-evidence-stdin',
          '--authority-evidence-file',
          authorityPath,
        ],
        'pending',
        true,
        { projectRoot: repository, run: runner },
      );
      const preparedEnvelope = JSON.parse(
        prepared.stdout,
      ) as RemoteCommandEnvelope;
      const createAction = preparedEnvelope.externalAction!;
      expect(createAction, JSON.stringify(preparedEnvelope)).toMatchObject({
        provider,
        semanticOperation: 'create',
      });
      const fields = createAction.intent.fields as Record<string, unknown>;
      runnerInput = {
        schemaVersion: 1,
        operationId: createAction.operationId,
        stepId: createAction.stepId,
        actionDigest: createAction.actionDigest,
        observedAt: '2026-09-05T12:00:00.000Z',
        surfaceKind: 'connector',
        capabilityEvidenceDigest: capabilityDigest,
        provider,
        context,
        outcome: {
          classification: 'observed',
          identity: {
            stableId: `${provider}-published-1`,
            aliases: [`${provider.toUpperCase()}-1`],
          },
          fields,
          revisionDigest: `sha256:${provider}-publish-receipt`,
          diagnosticCode: null,
        },
      };
      const verification = await runRemoteCommand(
        [
          'operation',
          'continue',
          '--operation',
          createAction.operationId,
          '--observation-stdin',
        ],
        'pending',
        true,
        { projectRoot: repository, run: runner },
      );
      const readAction = (
        JSON.parse(verification.stdout) as RemoteCommandEnvelope
      ).externalAction!;
      expect(readAction).toMatchObject({
        provider,
        semanticOperation: 'read',
      });
      runnerInput = {
        schemaVersion: 1,
        operationId: readAction.operationId,
        stepId: readAction.stepId,
        actionDigest: readAction.actionDigest,
        observedAt: '2026-09-05T12:00:00.000Z',
        surfaceKind: 'connector',
        capabilityEvidenceDigest: capabilityDigest,
        provider,
        context,
        outcome: {
          classification: 'observed',
          identity: {
            stableId: `${provider}-published-1`,
            aliases: [`${provider.toUpperCase()}-1`],
          },
          fields: { ...fields, status: 'open' },
          revisionDigest: `sha256:${provider}-publish-readback`,
          diagnosticCode: null,
        },
      };
      const completed = await runRemoteCommand(
        [
          'operation',
          'continue',
          '--operation',
          createAction.operationId,
          '--observation-stdin',
        ],
        'ok',
        true,
        { projectRoot: repository, run: runner },
      );
      expect(JSON.parse(completed.stdout)).toMatchObject({ status: 'ok' });
    }

    const published = await new RemoteSyncStore(
      resolveRemoteStorageLocations({
        repoRoot: repository,
        gitCommonDir: join(repository, '.git'),
        repositoryIdentity: `local-repository:${repository}`,
        stateStorage: 'local',
        target: { kind: 'backlog', scope: 'shared', path: null },
      }),
    ).listBindingMetadata();
    expect(published.map((binding) => binding.provider).sort()).toEqual([
      'github',
      'jira',
      'linear',
    ]);
    expect(published).toHaveLength(3);
  });

  it('drives representative provider-neutral closeout through the real CLI runner without mirroring', async () => {
    const repository = await mkdtemp(join(tmpdir(), 'oat-p07-e2e-closeout-'));
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
            policy: {
              description: 'managed-section',
              authority: { default: 'user-approved' },
            },
            storage: { state: 'local' },
          },
        },
      })}\n`,
    );
    const projectPath = '.oat/projects/shared/e2e-cross-provider';
    await mkdir(join(repository, projectPath), { recursive: true });
    const store = new RemoteSyncStore(
      resolveRemoteStorageLocations({
        repoRoot: repository,
        gitCommonDir: join(repository, '.git'),
        repositoryIdentity: `local-repository:${repository}`,
        stateStorage: 'local',
        target: { kind: 'backlog', scope: 'shared', path: null },
      }),
    );
    const providers = [
      ['github', { repositoryId: 'repository-1' }],
      ['linear', { workspaceId: 'workspace-1' }],
      ['jira', { siteId: 'site-1', projectId: 'project-1' }],
    ] as const;
    for (const [provider, context] of providers) {
      const metadata: RemoteBindingMetadata = {
        recordType: 'binding-metadata',
        schemaVersion: 1,
        bindingId: `bnd_${provider}_e2e_001`,
        provider,
        target: {
          kind: 'project',
          scope: 'shared',
          id: 'e2e-cross-provider',
          path: projectPath,
        },
        remoteIdentity: {
          stableId: `${provider}-issue-1`,
          context,
          aliases: [],
        },
        identityHistory: [],
        purposes: provider === 'github' ? ['planning'] : ['source'],
        policyRestrictions: {},
        publicationProjection: {
          title: 'frontmatter',
          description: 'description-section',
          priority: 'frontmatter',
        },
        provenanceToken: `oat-binding:${provider}-e2e-001`,
        lifecycle: 'active',
        createdAt: '2026-09-05T12:00:00.000Z',
        updatedAt: '2026-09-05T12:00:00.000Z',
      };
      await store.materializeIntakeBinding(metadata);
      const state: RemoteBindingState = {
        recordType: 'binding-state',
        schemaVersion: 2,
        bindingId: metadata.bindingId,
        provider,
        metadataUpdatedAt: metadata.updatedAt,
        localProjection: {
          title: `${provider} local title`,
          description: `${provider} local description`,
          priority: 'high',
          source: 'explicit-project-publication',
          sourceRevision: `sha256:${provider}-local`,
          observedAt: metadata.updatedAt,
        },
        snapshot: sanitizeRemoteSnapshot({
          snapshotId: `snap_${provider}_e2e_001`,
          bindingId: metadata.bindingId,
          provider,
          observedAt: metadata.updatedAt,
          observedBy: {
            provider,
            surfaceKind: 'connector',
            context,
            evidenceDigest: `sha256:${provider}-snapshot`,
            semanticCapabilities: ['read'],
          },
          identity: metadata.remoteIdentity,
          revision: {
            strength: 'hash-only',
            token: null,
            updatedAt: metadata.updatedAt,
            contentHash: `sha256:${provider}-remote`,
          },
          issue: {
            title: `${provider} remote title`,
            description: `${provider} remote description`,
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
        createdAt: metadata.createdAt,
        updatedAt: metadata.updatedAt,
      };
      await store.writeBindingState(state);
    }
    const capabilities = providers.map(([provider, context]) => ({
      provider,
      context,
      surfaceKind: 'connector' as const,
      availability: 'available' as const,
      semanticCapabilities: [
        'annotate',
        'transition',
        'read',
        'read-discussion',
        'search-duplicates',
        'create',
      ],
      evidenceDigest: `sha256:${provider}-e2e-capability`,
      observedAt: '2026-09-05T12:00:00.000Z',
    }));
    let runnerInput: unknown = capabilities;
    const runner = createProductionRemoteRunner({
      now: () => '2026-09-05T12:00:00.000Z',
      randomId: (() => {
        let sequence = 0;
        return () => `e2e-closeout-${(sequence += 1)}`;
      })(),
      readObservationStdin: async () => runnerInput,
    });
    const result = await runRemoteCommand(
      ['closeout', '--project', projectPath, '--capability-evidence-stdin'],
      'needs-review',
      true,
      { projectRoot: repository, run: runner },
    );
    const envelope = JSON.parse(result.stdout) as RemoteCommandEnvelope;
    expect(envelope.status).toBe('needs-review');
    expect(envelope.results.map((item) => item.provider).sort()).toEqual([
      'github',
      'jira',
      'linear',
    ]);
    expect(await store.listBindingMetadata()).toHaveLength(3);
    expect(result.exitCode).toBe(1);

    const batchId = (
      await readdir(store.locations.operational.batchesDir)
    )[0]!.replace(/\.json$/, '');
    const firstOperation = (
      await Promise.all(
        (await store.readBatch(batchId))!.members.map((member) =>
          store.readOperation(member.operationId),
        ),
      )
    ).find((operation) => operation!.steps[0]?.state === 'planned')!;
    const firstStep = firstOperation!.steps[0]!;
    const authorityPath = join(repository, 'closeout-authority.json');
    await writeFile(
      authorityPath,
      JSON.stringify({
        schemaVersion: 1,
        kind: 'interactive',
        sourceId: 'e2e-host',
        invocationId: 'e2e-closeout-approval',
        issuedAt: '2026-09-05T11:59:00.000Z',
        expiresAt: '2026-09-05T12:05:00.000Z',
        instruction: {
          operationClass: firstStep.semanticOperation,
          targetId: firstOperation!.bindingId,
          evidenceDigest: 'sha256:e2e-closeout-instruction',
        },
        approval: {
          previewDigest: firstStep.previewDigest,
          operationClass: firstStep.semanticOperation,
          approvedAt: '2026-09-05T12:00:00.000Z',
          actor: 'e2e-operator',
          source: 'e2e-approval',
        },
      }),
    );
    runnerInput = capabilities.find(
      (capability) => capability.provider === firstOperation!.provider,
    )!;
    const applied = await runRemoteCommand(
      [
        'closeout',
        '--project',
        projectPath,
        '--apply-preview',
        batchId,
        '--capability-evidence-stdin',
        '--authority-evidence-file',
        authorityPath,
      ],
      'pending',
      true,
      { projectRoot: repository, run: runner },
    );
    const appliedEnvelope = JSON.parse(applied.stdout) as RemoteCommandEnvelope;
    expect(appliedEnvelope.status, JSON.stringify(appliedEnvelope)).toBe(
      'pending',
    );
    expect(appliedEnvelope).toMatchObject({
      status: 'pending',
      externalAction: { semanticOperation: 'annotate' },
    });
    const action = appliedEnvelope.externalAction!;
    runnerInput = {
      schemaVersion: 1,
      operationId: action.operationId,
      stepId: action.stepId,
      actionDigest: action.actionDigest,
      observedAt: '2026-09-05T12:00:00.000Z',
      surfaceKind: 'connector',
      capabilityEvidenceDigest:
        action.expectedObservation.capabilityEvidenceDigest,
      provider: action.provider,
      context: action.context,
      outcome: {
        classification: 'observed',
        identity: {
          stableId: String(action.intent.stableId),
          aliases: [],
        },
        fields: {},
        revisionDigest: 'sha256:e2e-closeout-receipt',
        diagnosticCode: null,
      },
    };
    const verificationHandoff = await runRemoteCommand(
      [
        'operation',
        'continue',
        '--operation',
        action.operationId,
        '--observation-stdin',
      ],
      'pending',
      true,
      { projectRoot: repository, run: runner },
    );
    const readAction = (
      JSON.parse(verificationHandoff.stdout) as RemoteCommandEnvelope
    ).externalAction!;
    runnerInput = {
      schemaVersion: 1,
      operationId: readAction.operationId,
      stepId: readAction.stepId,
      actionDigest: readAction.actionDigest,
      observedAt: '2026-09-05T12:00:00.000Z',
      surfaceKind: 'connector',
      capabilityEvidenceDigest:
        readAction.expectedObservation.capabilityEvidenceDigest,
      provider: readAction.provider,
      context: readAction.context,
      outcome: {
        classification: 'observed',
        identity: {
          stableId: String(readAction.intent.stableId),
          aliases: [],
        },
        fields: {},
        extensions: {
          annotationDigest: semanticDigest(action.intent.body),
        },
        revisionDigest: 'sha256:e2e-closeout-readback',
        diagnosticCode: null,
      },
    };
    const partial = await runRemoteCommand(
      [
        'operation',
        'continue',
        '--operation',
        action.operationId,
        '--observation-stdin',
      ],
      'needs-review',
      true,
      { projectRoot: repository, run: runner },
    );
    expect(JSON.parse(partial.stdout)).toMatchObject({
      status: 'needs-review',
      persisted: true,
      approvalPreview: { operationClass: 'transition' },
    });
    expect(await store.readBatch(batchId)).toMatchObject({
      state: 'in-progress',
    });

    const transitionedOperation = await store.readOperation(action.operationId);
    const transitionStep = transitionedOperation!.steps.find(
      (step) => step.semanticOperation === 'transition',
    )!;
    await writeFile(
      authorityPath,
      JSON.stringify({
        schemaVersion: 1,
        kind: 'interactive',
        sourceId: 'e2e-host',
        invocationId: 'e2e-transition-approval',
        issuedAt: '2026-09-05T11:59:00.000Z',
        expiresAt: '2026-09-05T12:05:00.000Z',
        instruction: {
          operationClass: 'transition',
          targetId: transitionedOperation!.bindingId,
          evidenceDigest: 'sha256:e2e-transition-instruction',
        },
        approval: {
          previewDigest: transitionStep.previewDigest,
          operationClass: 'transition',
          approvedAt: '2026-09-05T12:00:00.000Z',
          actor: 'e2e-operator',
          source: 'e2e-approval',
        },
      }),
    );
    runnerInput = capabilities.find(
      (capability) => capability.provider === transitionedOperation!.provider,
    )!;
    const transitionApplied = await runRemoteCommand(
      [
        'closeout',
        '--project',
        projectPath,
        '--apply-preview',
        batchId,
        '--capability-evidence-stdin',
        '--authority-evidence-file',
        authorityPath,
      ],
      'pending',
      true,
      { projectRoot: repository, run: runner },
    );
    const transitionAction = (
      JSON.parse(transitionApplied.stdout) as RemoteCommandEnvelope
    ).externalAction!;
    runnerInput = {
      schemaVersion: 1,
      operationId: transitionAction.operationId,
      stepId: transitionAction.stepId,
      actionDigest: transitionAction.actionDigest,
      observedAt: '2026-09-05T12:00:00.000Z',
      surfaceKind: 'connector',
      capabilityEvidenceDigest:
        transitionAction.expectedObservation.capabilityEvidenceDigest,
      provider: transitionAction.provider,
      context: transitionAction.context,
      outcome: {
        classification: 'unknown',
        identity: {
          stableId: String(transitionAction.intent.stableId),
          aliases: [],
        },
        fields: {},
        revisionDigest: null,
        diagnosticCode: 'synthetic-uncertain-closeout',
      },
    };
    const uncertain = await runRemoteCommand(
      [
        'operation',
        'continue',
        '--operation',
        transitionAction.operationId,
        '--observation-stdin',
      ],
      'uncertain',
      true,
      { projectRoot: repository, run: runner },
    );
    expect(JSON.parse(uncertain.stdout)).toMatchObject({
      status: 'uncertain',
      persisted: true,
    });

    runnerInput = capabilities[0];
    const discussion = await runRemoteCommand(
      [
        'discussion',
        '--binding',
        'bnd_github_e2e_001',
        '--limit',
        '2',
        '--capability-evidence-stdin',
      ],
      'pending',
      true,
      { projectRoot: repository, run: runner },
    );
    const discussionAction = (
      JSON.parse(discussion.stdout) as RemoteCommandEnvelope
    ).externalAction!;
    runnerInput = {
      schemaVersion: 1,
      operationId: discussionAction.operationId,
      stepId: discussionAction.stepId,
      actionDigest: discussionAction.actionDigest,
      observedAt: '2026-09-05T12:00:00.000Z',
      provider: discussionAction.provider,
      context: discussionAction.context,
      capabilityEvidenceDigest:
        discussionAction.expectedObservation.capabilityEvidenceDigest,
      availability: 'available',
      items: [
        {
          id: 'discussion-1',
          body: 'First bounded page',
          createdAt: '2026-09-05T12:00:00.000Z',
        },
      ],
      nextCursor: 'page-2',
    };
    const page = await runRemoteCommand(
      [
        'operation',
        'continue',
        '--operation',
        discussionAction.operationId,
        '--observation-stdin',
      ],
      'pending',
      false,
      { projectRoot: repository, run: runner },
    );
    expect(page.stdout).toContain('discussion evidence: available');
    expect(page.exitCode).toBe(1);

    const detachPreview = await runRemoteCommand(
      ['resolve', 'detach', '--binding', 'bnd_linear_e2e_001'],
      'needs-review',
      true,
      { projectRoot: repository, run: runner },
    );
    const detachEnvelope = JSON.parse(
      detachPreview.stdout,
    ) as RemoteCommandEnvelope;
    const detachApprovalPreview = detachEnvelope.approvalPreview!;
    const detachOperationId = detachApprovalPreview.operationId;
    await writeFile(
      authorityPath,
      JSON.stringify({
        schemaVersion: 1,
        kind: 'interactive',
        sourceId: 'e2e-host',
        invocationId: 'e2e-detach-approval',
        issuedAt: '2026-09-05T11:59:00.000Z',
        expiresAt: '2026-09-05T12:05:00.000Z',
        instruction: {
          operationClass: 'detach',
          targetId: 'bnd_linear_e2e_001',
          evidenceDigest: 'sha256:e2e-detach-instruction',
        },
        approval: {
          previewDigest: detachApprovalPreview.digest,
          operationClass: 'detach',
          approvedAt: '2026-09-05T12:00:00.000Z',
          actor: 'e2e-operator',
          source: 'e2e-approval',
        },
      }),
    );
    const detached = await runRemoteCommand(
      [
        'resolve',
        'detach',
        '--binding',
        'bnd_linear_e2e_001',
        '--apply-preview',
        detachOperationId,
        '--authority-evidence-file',
        authorityPath,
      ],
      'ok',
      false,
      { projectRoot: repository, run: runner },
    );
    expect(detached.stdout).toContain('resolve: ok');
    const detachedMetadata =
      await store.readBindingMetadata('bnd_linear_e2e_001');
    const detachedState = await store.readBindingState('bnd_linear_e2e_001');
    expect(detachedMetadata).toMatchObject({ lifecycle: 'tombstoned' });
    expect(detachedState).toMatchObject({
      lifecycle: 'tombstoned',
      metadataUpdatedAt: detachedMetadata!.updatedAt,
    });

    const approveResolution = async (
      kind: 'relink' | 'recreate',
      bindingId: string,
      preview: { operationId: string; digest: string },
      suffix: string,
    ) => {
      await writeFile(
        authorityPath,
        JSON.stringify({
          schemaVersion: 1,
          kind: 'interactive',
          sourceId: 'e2e-host',
          invocationId: `e2e-${suffix}-approval`,
          issuedAt: '2026-09-05T11:59:00.000Z',
          expiresAt: '2026-09-05T12:05:00.000Z',
          instruction: {
            operationClass: kind,
            targetId: bindingId,
            evidenceDigest: `sha256:e2e-${suffix}-instruction`,
          },
          approval: {
            previewDigest: preview.digest,
            operationClass: kind,
            approvedAt: '2026-09-05T12:00:00.000Z',
            actor: 'e2e-operator',
            source: 'e2e-approval',
          },
        }),
      );
    };

    runnerInput = capabilities.find(
      (capability) => capability.provider === 'linear',
    )!;
    const relinkPreview = await runRemoteCommand(
      [
        'resolve',
        'relink',
        'linear:linear-relinked',
        '--binding',
        'bnd_linear_e2e_001',
        '--capability-evidence-stdin',
      ],
      'needs-review',
      false,
      { projectRoot: repository, run: runner },
    );
    const relinkPublicMatch = relinkPreview.stdout.match(
      /preview (op_[A-Za-z0-9_-]+): relink; digest=(sha256:[^;]+);/,
    );
    expect(relinkPublicMatch).not.toBeNull();
    const relinkApprovalPreview = {
      operationId: relinkPublicMatch![1]!,
      digest: relinkPublicMatch![2]!,
    };
    const relinkOperationId = relinkApprovalPreview.operationId;
    await approveResolution(
      'relink',
      'bnd_linear_e2e_001',
      relinkApprovalPreview,
      'relink',
    );
    runnerInput = capabilities.find(
      (capability) => capability.provider === 'linear',
    )!;
    const relinkHandoff = await runRemoteCommand(
      [
        'resolve',
        'relink',
        'linear:linear-relinked',
        '--binding',
        'bnd_linear_e2e_001',
        '--apply-preview',
        relinkOperationId,
        '--capability-evidence-stdin',
        '--authority-evidence-file',
        authorityPath,
      ],
      'pending',
      true,
      { projectRoot: repository, run: runner },
    );
    const relinkAction = (
      JSON.parse(relinkHandoff.stdout) as RemoteCommandEnvelope
    ).externalAction!;
    runnerInput = {
      schemaVersion: 1,
      operationId: relinkAction.operationId,
      stepId: relinkAction.stepId,
      actionDigest: relinkAction.actionDigest,
      observedAt: '2026-09-05T12:00:00.000Z',
      surfaceKind: 'connector',
      capabilityEvidenceDigest:
        relinkAction.expectedObservation.capabilityEvidenceDigest,
      provider: relinkAction.provider,
      context: relinkAction.context,
      outcome: {
        classification: 'observed',
        identity: { stableId: 'linear-relinked', aliases: ['REL-1'] },
        fields: {
          title: 'Relinked title',
          description: 'Relinked description',
          priority: 'high',
          status: 'open',
        },
        revisionDigest: 'sha256:e2e-relink-readback',
        diagnosticCode: null,
      },
    };
    const relinked = await runRemoteCommand(
      [
        'operation',
        'continue',
        '--operation',
        relinkOperationId,
        '--observation-stdin',
      ],
      'ok',
      true,
      { projectRoot: repository, run: runner },
    );
    expect(JSON.parse(relinked.stdout)).toMatchObject({ status: 'ok' });

    const relinkedMetadata =
      (await store.readBindingMetadata('bnd_linear_e2e_001'))!;
    await store.updateBindingMetadata({
      ...relinkedMetadata,
      purposes: ['planning'],
    });
    let recreateOperationId = '';
    let recreateCreateApprovalPreview:
      | { operationId: string; digest: string }
      | undefined;
    for (const lifecycleCondition of [
      'archived',
      'moved',
      'deleted-confirmed',
      'temporarily-unavailable',
      'missing-or-invisible',
    ] as const) {
      const anomalyMetadata =
        (await store.readBindingMetadata('bnd_linear_e2e_001'))!;
      await store.updateBindingMetadata({
        ...anomalyMetadata,
        lifecycle: 'blocked',
        publicationProjection: {
          ...anomalyMetadata.publicationProjection,
          priority: 'frontmatter',
        },
        providerMappingEvidence: {
          priority: {
            status:
              lifecycleCondition === 'missing-or-invisible'
                ? 'unavailable'
                : 'safe',
            evidenceDigest: `sha256:e2e-priority-mapping-${lifecycleCondition}`,
            observedAt: '2026-09-05T12:00:00.000Z',
          },
        },
      });
      const anomalyState =
        (await store.readBindingState('bnd_linear_e2e_001'))!;
      await store.writeBindingState({
        ...anomalyState,
        lifecycle: 'blocked',
        lifecycleCondition,
        snapshot: {
          ...anomalyState.snapshot!,
          lifecycle: lifecycleCondition,
        },
      });
      runnerInput = capabilities.find(
        (capability) => capability.provider === 'linear',
      )!;
      const recreatePreview = await runRemoteCommand(
        [
          'resolve',
          'recreate',
          '--binding',
          'bnd_linear_e2e_001',
          '--capability-evidence-stdin',
        ],
        'needs-review',
        true,
        { projectRoot: repository, run: runner },
      );
      recreateOperationId = (
        JSON.parse(recreatePreview.stdout) as RemoteCommandEnvelope
      ).approvalPreview!.operationId;
      const recreateSearchApprovalPreview = (
        JSON.parse(recreatePreview.stdout) as RemoteCommandEnvelope
      ).approvalPreview!;
      await approveResolution(
        'recreate',
        'bnd_linear_e2e_001',
        recreateSearchApprovalPreview,
        `recreate-search-${lifecycleCondition}`,
      );
      runnerInput = capabilities.find(
        (capability) => capability.provider === 'linear',
      )!;
      const searchHandoff = await runRemoteCommand(
        [
          'resolve',
          'recreate',
          '--binding',
          'bnd_linear_e2e_001',
          '--apply-preview',
          recreateOperationId,
          '--capability-evidence-stdin',
          '--authority-evidence-file',
          authorityPath,
        ],
        'pending',
        true,
        { projectRoot: repository, run: runner },
      );
      const searchAction = (
        JSON.parse(searchHandoff.stdout) as RemoteCommandEnvelope
      ).externalAction!;
      runnerInput = {
        schemaVersion: 1,
        operationId: searchAction.operationId,
        stepId: searchAction.stepId,
        actionDigest: searchAction.actionDigest,
        observedAt: '2026-09-05T12:00:00.000Z',
        surfaceKind: 'connector',
        capabilityEvidenceDigest:
          searchAction.expectedObservation.capabilityEvidenceDigest,
        provider: searchAction.provider,
        context: searchAction.context,
        outcome: {
          classification: 'observed',
          identity: null,
          fields: {},
          extensions: { duplicateSearchOutcome: 'no-match' },
          revisionDigest: `sha256:e2e-search-${lifecycleCondition}`,
          diagnosticCode: null,
        },
      };
      const createPreview = await runRemoteCommand(
        [
          'operation',
          'continue',
          '--operation',
          recreateOperationId,
          '--observation-stdin',
        ],
        'needs-review',
        true,
        { projectRoot: repository, run: runner },
      );
      const createPreviewEnvelope = JSON.parse(
        createPreview.stdout,
      ) as RemoteCommandEnvelope;
      expect(createPreviewEnvelope).toMatchObject({
        status: 'needs-review',
        approvalPreview: {
          operationClass: 'recreate',
          fieldMask:
            lifecycleCondition === 'missing-or-invisible'
              ? expect.arrayContaining(['title', 'description'])
              : expect.arrayContaining(['title', 'description', 'priority']),
        },
      });
      if (lifecycleCondition === 'missing-or-invisible') {
        expect(createPreviewEnvelope.approvalPreview!.fieldMask).not.toContain(
          'priority',
        );
      }
      recreateCreateApprovalPreview = createPreviewEnvelope.approvalPreview!;
    }
    await approveResolution(
      'recreate',
      'bnd_linear_e2e_001',
      recreateCreateApprovalPreview!,
      'recreate-create',
    );
    const createHandoff = await runRemoteCommand(
      [
        'resolve',
        'recreate',
        '--binding',
        'bnd_linear_e2e_001',
        '--apply-preview',
        recreateOperationId,
        '--authority-evidence-file',
        authorityPath,
      ],
      'pending',
      true,
      { projectRoot: repository, run: runner },
    );
    const createAction = (
      JSON.parse(createHandoff.stdout) as RemoteCommandEnvelope
    ).externalAction!;
    const createFields = createAction.intent.fields as Record<string, unknown>;
    runnerInput = {
      schemaVersion: 1,
      operationId: createAction.operationId,
      stepId: createAction.stepId,
      actionDigest: createAction.actionDigest,
      observedAt: '2026-09-05T12:00:00.000Z',
      surfaceKind: 'connector',
      capabilityEvidenceDigest:
        createAction.expectedObservation.capabilityEvidenceDigest,
      provider: createAction.provider,
      context: createAction.context,
      outcome: {
        classification: 'observed',
        identity: { stableId: 'linear-recreated', aliases: ['REC-1'] },
        fields: createFields,
        revisionDigest: 'sha256:e2e-create',
        diagnosticCode: null,
      },
    };
    const readHandoff = await runRemoteCommand(
      [
        'operation',
        'continue',
        '--operation',
        recreateOperationId,
        '--observation-stdin',
      ],
      'pending',
      true,
      { projectRoot: repository, run: runner },
    );
    const recreateRead = (
      JSON.parse(readHandoff.stdout) as RemoteCommandEnvelope
    ).externalAction!;
    runnerInput = {
      schemaVersion: 1,
      operationId: recreateRead.operationId,
      stepId: recreateRead.stepId,
      actionDigest: recreateRead.actionDigest,
      observedAt: '2026-09-05T12:00:00.000Z',
      surfaceKind: 'connector',
      capabilityEvidenceDigest:
        recreateRead.expectedObservation.capabilityEvidenceDigest,
      provider: recreateRead.provider,
      context: recreateRead.context,
      outcome: {
        classification: 'observed',
        identity: { stableId: 'linear-recreated', aliases: ['REC-1'] },
        fields: {
          ...createFields,
          priority: null,
          status: 'open',
        },
        revisionDigest: 'sha256:e2e-recreate-readback',
        diagnosticCode: null,
      },
    };
    const recreated = await runRemoteCommand(
      [
        'operation',
        'continue',
        '--operation',
        recreateOperationId,
        '--observation-stdin',
      ],
      'ok',
      false,
      { projectRoot: repository, run: runner },
    );
    expect(recreated.stderr || recreated.stdout).toContain(
      'operation-continue: ok',
    );
    expect(await store.listBindingMetadata()).toHaveLength(3);
  });
});

function envelopeFor(
  request: RemoteCommandRequest,
  status: RemoteCommandStatus,
): RemoteCommandEnvelope {
  return {
    schemaVersion: 1,
    status,
    operation: request.operation,
    projectRoot: request.projectRoot,
    persisted: true,
    results: [],
    externalAction: null,
    recovery: [],
  };
}

function captureWrite(chunks: string[]): typeof process.stdout.write {
  return ((chunk: string | Uint8Array) => {
    chunks.push(
      typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString('utf8'),
    );
    return true;
  }) as typeof process.stdout.write;
}
