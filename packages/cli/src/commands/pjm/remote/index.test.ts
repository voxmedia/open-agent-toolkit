import { execFileSync } from 'node:child_process';
import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { readOatConfig } from '@config/oat-config';
import { Command } from 'commander';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createPjmRemoteCommand, type RemoteCommandRequest } from './index';
import { resolveLocalProjection } from './local-projection';
import type { RemoteBindingMetadata, RemoteBindingState } from './schema';
import { createProductionRemoteRunner } from './service';
import { sanitizeRemoteSnapshot } from './snapshot';
import { resolveRemoteStorageLocations } from './storage-locator';
import { RemoteSyncStore } from './store';

const previousExitCode = process.exitCode;
const tempDirs: string[] = [];
afterEach(async () => {
  process.exitCode = previousExitCode;
  vi.restoreAllMocks();
  await Promise.all(
    tempDirs.map((path) => rm(path, { recursive: true, force: true })),
  );
  tempDirs.length = 0;
});

async function adoptedRepository() {
  const repo = await mkdtemp(join(tmpdir(), 'oat-remote-live-'));
  tempDirs.push(repo);
  execFileSync('git', ['init', '--quiet'], { cwd: repo });
  await mkdir(join(repo, '.oat'), { recursive: true });
  await writeFile(
    join(repo, '.oat', 'config.json'),
    `${JSON.stringify({ pjm: { initialized: true } })}\n`,
  );
  const locations = resolveRemoteStorageLocations({
    repoRoot: repo,
    gitCommonDir: join(repo, '.git'),
    repositoryIdentity: `local-repository:${resolve(repo)}`,
    stateStorage: 'local',
    target: { kind: 'backlog', scope: 'shared', path: null },
  });
  return { repo, store: new RemoteSyncStore(locations), locations };
}

async function writeAuthorityEvidence(
  repo: string,
  evidence: Record<string, unknown>,
): Promise<string> {
  const path = join(repo, '.oat', 'current-remote-invocation.json');
  await writeFile(path, `${JSON.stringify(evidence)}\n`);
  return path;
}

function interactiveAuthority(
  operationClass: 'create' | 'update-fields',
  targetId: string,
  approval: Record<string, unknown> | null = null,
) {
  return {
    schemaVersion: 1,
    kind: 'interactive',
    sourceId: 'host-session-1',
    invocationId: 'invocation-1',
    issuedAt: '2026-08-31T11:58:00.000Z',
    expiresAt: '2026-08-31T12:05:00.000Z',
    instruction: {
      operationClass,
      targetId,
      evidenceDigest: 'sha256:exact-user-instruction',
    },
    approval,
  };
}

async function materializeFixtureBinding(store: RemoteSyncStore) {
  const timestamp = '2026-08-31T12:00:00.000Z';
  const metadata: RemoteBindingMetadata = {
    recordType: 'binding-metadata',
    schemaVersion: 1,
    bindingId: 'bnd_live_001',
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
    purposes: ['planning'],
    policyRestrictions: {},
    publicationProjection: {
      title: 'frontmatter',
      description: 'description-section',
      priority: 'frontmatter',
    },
    provenanceToken: 'oat-binding:bnd_live_001',
    lifecycle: 'active',
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  const operationId = 'op_create_live_001';
  await store.createBindingIntent({
    schemaVersion: 1,
    bindingId: metadata.bindingId,
    operationId,
    provider: metadata.provider,
    target: metadata.target,
    publicationProjection: metadata.publicationProjection,
    providerContext: metadata.remoteIdentity.context,
    purposes: metadata.purposes,
    policyRestrictions: metadata.policyRestrictions,
    provenanceToken: metadata.provenanceToken,
    createdAt: timestamp,
  });
  await store.transitionOperation(operationId, 'planned', {
    state: 'verified',
    updatedAt: timestamp,
    verification: [
      {
        field: 'remoteIdentity',
        expectedHash: 'sha256:verified',
        observedHash: 'sha256:verified',
        status: 'verified',
      },
    ],
    outcome: {
      classification: 'verified',
      message: 'verified',
      verifiedAt: timestamp,
    },
  });
  await store.materializeVerifiedBinding(operationId, metadata, {
    provider: 'linear',
    stableId: 'issue-1',
    verifiedAt: timestamp,
    evidenceDigest: 'sha256:verified',
  });
  const state: RemoteBindingState = {
    recordType: 'binding-state',
    schemaVersion: 2,
    bindingId: metadata.bindingId,
    provider: metadata.provider,
    metadataUpdatedAt: timestamp,
    localProjection: {
      title: 'Local title',
      description: 'Local description',
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
  };
  await store.writeBindingState(state);
}

async function prepareMutableBinding(
  repo: string,
  store: RemoteSyncStore,
  authority: 'read-only' | 'user-approved' | 'user-authorized' | 'autonomous',
) {
  await materializeFixtureBinding(store);
  const targetPath = join(
    repo,
    '.oat',
    'repo',
    'pjm',
    'backlog',
    'items',
    'item-1.md',
  );
  await mkdir(join(targetPath, '..'), { recursive: true });
  const content =
    '---\ntitle: Local title\npriority: high\nassociated_issues: []\n---\n\n## Description\n\nLocal description\n';
  await writeFile(targetPath, content);
  const state = (await store.readBindingState('bnd_live_001'))!;
  const localProjection = resolveLocalProjection({
    target: {
      kind: 'backlog',
      path: '.oat/repo/pjm/backlog/items/item-1.md',
      content,
    },
    observedAt: '2026-08-31T12:00:00.000Z',
  });
  await store.writeBindingState({
    ...state,
    localProjection,
    snapshot: sanitizeRemoteSnapshot({
      snapshotId: 'snap_live_001',
      bindingId: 'bnd_live_001',
      provider: 'linear',
      observedAt: '2026-08-31T12:00:00.000Z',
      observedBy: {
        provider: 'linear',
        surfaceKind: 'connector',
        context: { workspaceId: 'workspace-1' },
        evidenceDigest: 'sha256:prior-read',
        semanticCapabilities: ['read'],
      },
      identity: {
        stableId: 'issue-1',
        context: { workspaceId: 'workspace-1' },
        aliases: [],
      },
      revision: {
        strength: 'hash-only',
        token: null,
        updatedAt: '2026-08-31T11:57:00.000Z',
        contentHash: 'sha256:remote-current',
      },
      issue: {
        title: 'Remote title',
        description: 'Remote description',
        priority: null,
        status: 'open',
      },
      lifecycle: 'active',
    }),
  });
  await writeFile(
    join(repo, '.oat', 'config.json'),
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
              operations: { 'update-fields': authority },
            },
          },
        },
      },
    })}\n`,
  );
  return { localProjection };
}

function updateCapabilityEvidence() {
  return {
    provider: 'linear',
    context: { workspaceId: 'workspace-1' },
    surfaceKind: 'connector',
    availability: 'available',
    semanticCapabilities: ['read', 'update'],
    evidenceDigest: 'sha256:live-update-capability',
    observedAt: '2026-08-31T11:59:00.000Z',
  };
}

function harness(adoption: 'complete' | 'partial' | 'absent' = 'complete') {
  const requests: RemoteCommandRequest[] = [];
  const root = new Command().name('oat').option('--json');
  root.exitOverride();
  root.addCommand(
    createPjmRemoteCommand({
      resolveProjectRoot: async () => '/repo',
      checkAdoption: async () => adoption,
      run: async (request) => {
        requests.push(request);
        return {
          schemaVersion: 1,
          status: 'pending',
          operation: request.operation,
          projectRoot: request.projectRoot,
          persisted: true,
          results: [],
          externalAction: null,
          recovery: [],
        };
      },
    }),
  );
  vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  return { root, requests };
}

describe('pjm remote command family', () => {
  it('documents every lifecycle and continuation command', () => {
    const { root } = harness();
    const remote = root.commands.find(
      (command) => command.name() === 'remote',
    )!;
    expect(remote.helpInformation()).toMatch(/intake/);
    expect(remote.helpInformation()).toMatch(/publish/);
    expect(remote.helpInformation()).toMatch(/refresh/);
    expect(remote.helpInformation()).toMatch(/reconcile/);
    expect(remote.helpInformation()).toMatch(/operation/);
  });

  it('injects intake, refresh, and operation-continuation services', async () => {
    const intake = harness();
    await intake.root.parseAsync([
      'node',
      'oat',
      'remote',
      'intake',
      'provider:issue',
      '--to-backlog',
      'item-1',
    ]);
    expect(intake.requests[0]).toMatchObject({
      operation: 'intake',
      providerRef: 'provider:issue',
      backlogId: 'item-1',
    });
    const refresh = harness();
    await refresh.root.parseAsync([
      'node',
      'oat',
      'remote',
      'refresh',
      '--binding',
      'bnd-1',
    ]);
    expect(refresh.requests[0]).toMatchObject({
      operation: 'refresh',
      bindingId: 'bnd-1',
    });
    const continuation = harness();
    await continuation.root.parseAsync([
      'node',
      'oat',
      'remote',
      'operation',
      'continue',
      '--operation',
      'op-1',
    ]);
    expect(continuation.requests[0]).toMatchObject({
      operation: 'operation-continue',
      operationId: 'op-1',
      observationStdin: false,
    });
  });

  it('resumes a no-handle direct create through Commander without a second operation or action', async () => {
    const { repo, store, locations } = await adoptedRepository();
    const targetPath = join(
      repo,
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
      join(repo, '.oat', 'config.json'),
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
    const authorityEvidenceFile = await writeAuthorityEvidence(
      repo,
      interactiveAuthority('create', 'backlog:item-1'),
    );
    const capability = {
      provider: 'linear',
      context: { workspaceId: 'workspace-1' },
      surfaceKind: 'connector',
      availability: 'available',
      semanticCapabilities: ['create'],
      evidenceDigest: 'sha256:create-capability',
      observedAt: '2026-08-31T11:59:00.000Z',
    };
    const commandArguments = [
      'remote',
      'publish',
      '--provider',
      'linear',
      '--to-backlog',
      'item-1',
      '--capability-evidence-stdin',
      '--authority-evidence-file',
      authorityEvidenceFile,
    ];
    const runCommand = async (
      runner: ReturnType<typeof createProductionRemoteRunner>,
      arguments_: string[],
    ) => {
      const stdout: string[] = [];
      const root = new Command().name('oat').option('--json');
      root.exitOverride();
      root.addCommand(
        createPjmRemoteCommand({
          resolveProjectRoot: async () => repo,
          checkAdoption: async () => 'complete',
          run: runner,
        }),
      );
      const stdoutSpy = vi
        .spyOn(process.stdout, 'write')
        .mockImplementation((chunk) => {
          stdout.push(String(chunk));
          return true;
        });
      const stderrSpy = vi
        .spyOn(process.stderr, 'write')
        .mockImplementation(() => true);
      await root.parseAsync(['node', 'oat', '--json', ...arguments_]);
      stdoutSpy.mockRestore();
      stderrSpy.mockRestore();
      process.exitCode = undefined;
      return stdout.length === 0
        ? null
        : (JSON.parse(stdout.join()) as Awaited<ReturnType<typeof runner>>);
    };
    const interrupted = createProductionRemoteRunner({
      now: () => '2026-08-31T12:01:00.000Z',
      readObservationStdin: async () => capability,
      crash: (point) => {
        if (point === 'before-create-envelope') throw new Error('interrupted');
      },
    });
    expect(await runCommand(interrupted, commandArguments)).toMatchObject({
      status: 'failed',
      message: 'interrupted',
    });

    const operationFiles = (
      await readdir(locations.operational.operationsDir)
    ).filter((path) => path.endsWith('.json'));
    expect(operationFiles).toHaveLength(1);
    const operationId = operationFiles[0]!.slice(0, -'.json'.length);
    const firstAction = await store.readCurrentAction(operationId);
    const firstActionFiles = (
      await readdir(locations.operational.operationsDir)
    ).filter((path) => path.endsWith('.action'));

    const restarted = createProductionRemoteRunner({
      now: () => '2026-08-31T12:01:00.000Z',
      readObservationStdin: async () => capability,
    });
    const retried = await runCommand(restarted, commandArguments);
    const continued = await runCommand(restarted, [
      'remote',
      'operation',
      'continue',
      '--operation',
      operationId,
    ]);
    await writeFile(
      targetPath,
      '---\ntitle: Drifted title\npriority: high\nassociated_issues: []\n---\n\n## Description\n\nLocal description\n',
    );
    const driftedRetry = await runCommand(restarted, commandArguments);

    expect(retried?.externalAction).toEqual(firstAction);
    expect(continued?.externalAction).toEqual(firstAction);
    expect(driftedRetry).toMatchObject({
      status: 'failed',
      message: expect.stringMatching(/preview.*drift/i),
    });
    expect(
      (await readdir(locations.operational.operationsDir)).filter((path) =>
        path.endsWith('.json'),
      ),
    ).toEqual(operationFiles);
    expect(
      (await readdir(locations.operational.operationsDir)).filter((path) =>
        path.endsWith('.action'),
      ),
    ).toEqual(firstActionFiles);
    expect(await store.readOperation(operationId)).toMatchObject({
      state: 'attempt-started',
      attempts: [
        {
          attemptId: firstAction!.stepId,
          requestDigest: firstAction!.actionDigest,
        },
      ],
    });

    const createObservation = {
      schemaVersion: 1,
      operationId,
      stepId: firstAction!.stepId,
      actionDigest: firstAction!.actionDigest,
      observedAt: '2026-08-31T12:02:00.000Z',
      surfaceKind: 'connector' as const,
      capabilityEvidenceDigest: 'sha256:create-capability',
      provider: 'linear' as const,
      context: { workspaceId: 'workspace-1' },
      outcome: {
        classification: 'observed' as const,
        identity: { stableId: 'issue-restart-1', aliases: ['RESTART-1'] },
        fields: firstAction!.intent.fields,
        revisionDigest: 'sha256:create-observation',
        diagnosticCode: null,
      },
    };
    const interruptedVerification = createProductionRemoteRunner({
      now: () => '2026-08-31T12:02:00.000Z',
      randomId: () => 'commander-verification',
      readObservationStdin: async () => createObservation,
      crash: (point) => {
        if (point === 'before-verification-envelope') {
          throw new Error('commander verification handoff interrupted');
        }
      },
    });
    await expect(
      runCommand(interruptedVerification, [
        'remote',
        'operation',
        'continue',
        '--operation',
        operationId,
        '--observation-stdin',
      ]),
    ).resolves.toMatchObject({
      status: 'failed',
      message: 'commander verification handoff interrupted',
    });

    const recoveredVerification = await runCommand(
      createProductionRemoteRunner({
        now: () => '2026-08-31T12:03:00.000Z',
        readObservationStdin: async () => {
          throw new Error('restart must not repeat the create action');
        },
      }),
      ['remote', 'operation', 'continue', '--operation', operationId],
    );
    expect(recoveredVerification?.externalAction).toMatchObject({
      semanticOperation: 'read',
      intent: { stableId: 'issue-restart-1' },
    });
    expect(
      (await readdir(locations.operational.operationsDir)).filter((path) =>
        path.endsWith('.json'),
      ),
    ).toEqual(operationFiles);
  });

  it('does not accept caller-self-attested mutation authority fields', async () => {
    const { root, requests } = harness();
    await expect(
      root.parseAsync([
        'node',
        'oat',
        'remote',
        'publish',
        '--binding',
        'bnd-1',
        '--instruction-digest',
        'sha256:self-attested',
      ]),
    ).rejects.toThrow(/unknown option|process\.exit/);
    expect(requests).toEqual([]);
  });

  it('wires only the closed caller authority source through mutation commands', async () => {
    const publish = harness();
    await publish.root.parseAsync([
      'node',
      'oat',
      'remote',
      'publish',
      '--binding',
      'bnd-1',
      '--authority-evidence-file',
      '/tmp/current-invocation.json',
    ]);
    expect(publish.requests[0]).toMatchObject({
      authorityEvidenceFile: '/tmp/current-invocation.json',
    });
    const continuation = harness();
    await continuation.root.parseAsync([
      'node',
      'oat',
      'remote',
      'operation',
      'continue',
      '--operation',
      'op-1',
      '--observation-stdin',
      '--authority-evidence-file',
      '/tmp/current-invocation.json',
    ]);
    expect(continuation.requests[0]).toMatchObject({
      authorityEvidenceFile: '/tmp/current-invocation.json',
    });
  });

  it('fails closed under read-only authority without caller evidence', async () => {
    const { repo, store } = await adoptedRepository();
    await prepareMutableBinding(repo, store, 'read-only');
    const runner = createProductionRemoteRunner({
      now: () => '2026-08-31T12:01:00.000Z',
      readObservationStdin: async () => updateCapabilityEvidence(),
    });
    await expect(
      runner({
        operation: 'publish',
        projectRoot: repo,
        bindingId: 'bnd_live_001',
        capabilityEvidenceStdin: true,
      }),
    ).rejects.toThrow(/read-only/i);
  });

  it('rejects absent, stale, and mismatched production caller evidence', async () => {
    const { repo, store } = await adoptedRepository();
    await prepareMutableBinding(repo, store, 'user-authorized');
    const runner = createProductionRemoteRunner({
      now: () => '2026-08-31T12:01:00.000Z',
      readObservationStdin: async () => updateCapabilityEvidence(),
    });
    const request = {
      operation: 'publish' as const,
      projectRoot: repo,
      bindingId: 'bnd_live_001',
      capabilityEvidenceStdin: true,
    };
    await expect(runner(request)).rejects.toThrow(/invocation evidence/i);
    for (const evidence of [
      {
        ...interactiveAuthority('update-fields', 'bnd_live_001'),
        expiresAt: '2026-08-31T12:00:30.000Z',
      },
      interactiveAuthority('update-fields', 'bnd_other_001'),
      interactiveAuthority('create', 'bnd_live_001'),
    ]) {
      const authorityEvidenceFile = await writeAuthorityEvidence(
        repo,
        evidence,
      );
      await expect(
        runner({ ...request, authorityEvidenceFile }),
      ).rejects.toThrow(/expired|authorize/i);
    }
  });

  it('accepts preview-bound approval and autonomous workflow evidence', async () => {
    const approved = await adoptedRepository();
    await prepareMutableBinding(approved.repo, approved.store, 'user-approved');
    const approvedRunner = createProductionRemoteRunner({
      now: () => '2026-08-31T12:01:00.000Z',
      readObservationStdin: async () => updateCapabilityEvidence(),
    });
    const runApprovedCommand = async (extraArguments: string[]) => {
      let envelope: Awaited<ReturnType<typeof approvedRunner>> | undefined;
      const stdout: string[] = [];
      const root = new Command().name('oat').option('--json');
      root.exitOverride();
      root.addCommand(
        createPjmRemoteCommand({
          resolveProjectRoot: async () => approved.repo,
          checkAdoption: async () => 'complete',
          run: async (request) => {
            envelope = await approvedRunner(request);
            return envelope;
          },
        }),
      );
      const stdoutSpy = vi
        .spyOn(process.stdout, 'write')
        .mockImplementation((chunk) => {
          stdout.push(String(chunk));
          return true;
        });
      const stderrSpy = vi
        .spyOn(process.stderr, 'write')
        .mockImplementation(() => true);
      await root.parseAsync([
        'node',
        'oat',
        '--json',
        'remote',
        'publish',
        '--binding',
        'bnd_live_001',
        '--capability-evidence-stdin',
        '--authority-evidence-file',
        approvalPath,
        ...extraArguments,
      ]);
      stdoutSpy.mockRestore();
      stderrSpy.mockRestore();
      process.exitCode = undefined;
      return {
        envelope: envelope!,
        output: JSON.parse(stdout.join()) as Awaited<
          ReturnType<typeof approvedRunner>
        >,
      };
    };
    const approvalPath = await writeAuthorityEvidence(
      approved.repo,
      interactiveAuthority('update-fields', 'bnd_live_001'),
    );
    const preview = await runApprovedCommand([]);
    expect(preview.output).toMatchObject({
      status: 'needs-review',
      persisted: true,
      externalAction: null,
      approvalPreview: {
        operationId: expect.stringMatching(/^op_/),
        digest: expect.stringMatching(/^sha256:/),
        operationClass: 'update-fields',
        fieldMask: ['title', 'description', 'priority'],
        renderedFields: {
          title: { kind: 'value' },
          description: { kind: 'hash' },
          priority: { kind: 'value' },
        },
        authority: 'user-approved',
        revision: {
          digest: expect.stringMatching(/^sha256:/),
          evidenceDigest: expect.stringMatching(/^sha256:/),
          source: 'remote',
          strength: 'hash-only',
          updatedAt: '2026-08-31T11:57:00.000Z',
          observedAt: '2026-08-31T12:00:00.000Z',
        },
      },
    });
    const emittedPreview = preview.output.approvalPreview!;
    const previewDigest = emittedPreview.digest;
    expect(preview.output.recovery).toEqual(
      expect.arrayContaining([
        {
          code: 'preview-operation',
          instruction: emittedPreview.operationId,
        },
        { code: 'preview-digest', instruction: previewDigest },
        expect.objectContaining({ code: 'preview-approval-required' }),
      ]),
    );
    expect(previewDigest).toMatch(/^sha256:/);
    await writeAuthorityEvidence(
      approved.repo,
      interactiveAuthority('update-fields', 'bnd_live_001', {
        previewDigest,
        operationClass: 'update-fields',
        approvedAt: '2026-08-31T12:01:00.000Z',
        actor: 'operator-1',
        source: 'interactive-preview',
      }),
    );
    const approvalTarget = join(
      approved.repo,
      '.oat',
      'repo',
      'pjm',
      'backlog',
      'items',
      'item-1.md',
    );
    const approvedContent = await readFile(approvalTarget, 'utf8');
    await writeFile(
      approvalTarget,
      approvedContent.replace('Local description', 'Drifted description'),
    );
    await expect(
      approvedRunner({
        operation: 'publish',
        projectRoot: approved.repo,
        bindingId: 'bnd_live_001',
        capabilityEvidenceStdin: true,
        authorityEvidenceFile: approvalPath,
        previewOperationId: emittedPreview.operationId,
      }),
    ).rejects.toThrow(/preview|drift/i);
    await writeFile(approvalTarget, approvedContent);
    await expect(
      runApprovedCommand(['--apply-preview', emittedPreview.operationId]),
    ).resolves.toMatchObject({ envelope: { status: 'pending' } });
    await expect(
      approvedRunner({
        operation: 'publish',
        projectRoot: approved.repo,
        bindingId: 'bnd_live_001',
        capabilityEvidenceStdin: true,
        authorityEvidenceFile: approvalPath,
        previewOperationId: emittedPreview.operationId,
      }),
    ).rejects.toThrow(/safely applicable/i);

    const autonomous = await adoptedRepository();
    const { localProjection } = await prepareMutableBinding(
      autonomous.repo,
      autonomous.store,
      'autonomous',
    );
    const workflowPath = await writeAuthorityEvidence(autonomous.repo, {
      schemaVersion: 1,
      kind: 'workflow',
      sourceId: 'workflow-engine-1',
      invocationId: 'workflow-invocation-1',
      issuedAt: '2026-08-31T11:59:00.000Z',
      expiresAt: '2026-08-31T12:05:00.000Z',
      operationClass: 'update-fields',
      targetId: 'bnd_live_001',
      workflowId: 'item-1',
      revision: localProjection.sourceRevision,
    });
    const autonomousRunner = createProductionRemoteRunner({
      now: () => '2026-08-31T12:01:00.000Z',
      readObservationStdin: async () => updateCapabilityEvidence(),
    });
    await expect(
      autonomousRunner({
        operation: 'publish',
        projectRoot: autonomous.repo,
        bindingId: 'bnd_live_001',
        capabilityEvidenceStdin: true,
        authorityEvidenceFile: workflowPath,
      }),
    ).resolves.toMatchObject({ status: 'pending' });
  });

  it.each([
    ['--to-backlog', 'item-1', 'backlog', []],
    [
      '--to-project',
      'project-1',
      'project',
      ['--project-publication-file', '.oat/project-publication.json'],
    ],
  ] as const)(
    'routes an unbound %s publish through the create-binding lifecycle',
    async (targetOption, localId, localKind, extraArguments) => {
      const { root, requests } = harness();
      await root.parseAsync([
        'node',
        'oat',
        'remote',
        'publish',
        '--provider',
        'provider-a',
        targetOption,
        localId,
        ...extraArguments,
      ]);
      expect(requests[0]).toMatchObject({
        operation: 'publish',
        bindingId: undefined,
        createTarget: {
          provider: 'provider-a',
          localKind,
          localId,
          ...(localKind === 'project'
            ? { publicationFile: '.oat/project-publication.json' }
            : {}),
        },
      });
    },
  );

  it('fails closed for ambiguous or incomplete unbound publish targets', async () => {
    const ambiguous = harness();
    await expect(
      ambiguous.root.parseAsync([
        'node',
        'oat',
        'remote',
        'publish',
        '--binding',
        'bnd-1',
        '--provider',
        'provider-a',
        '--to-backlog',
        'item-1',
      ]),
    ).rejects.toThrow(/exactly one/);
    const missingProvider = harness();
    await expect(
      missingProvider.root.parseAsync([
        'node',
        'oat',
        'remote',
        'publish',
        '--to-project',
        'project-1',
      ]),
    ).rejects.toThrow(/requires a provider/);
    const missingPublication = harness();
    await expect(
      missingPublication.root.parseAsync([
        'node',
        'oat',
        'remote',
        'publish',
        '--provider',
        'provider-a',
        '--to-project',
        'project-1',
      ]),
    ).rejects.toThrow(/project-publication-file/i);
    const misplacedPublication = harness();
    await expect(
      misplacedPublication.root.parseAsync([
        'node',
        'oat',
        'remote',
        'publish',
        '--provider',
        'provider-a',
        '--to-backlog',
        'item-1',
        '--project-publication-file',
        '.oat/publication.json',
      ]),
    ).rejects.toThrow(/only valid with --to-project/i);
  });

  it('fails closed for absent adoption', async () => {
    const absent = harness('absent');
    await absent.root.parseAsync([
      'node',
      'oat',
      'remote',
      'refresh',
      '--binding',
      'bnd-1',
    ]);
    expect(absent.requests).toEqual([]);
    expect(process.exitCode).toBe(2);
  });

  it('uses JSON dependencies from global options', async () => {
    const { root } = harness();
    await root.parseAsync([
      'node',
      'oat',
      '--json',
      'remote',
      'refresh',
      '--binding',
      'bnd-1',
    ]);
    expect(process.stdout.write).toHaveBeenCalledWith(
      expect.stringContaining('"status":"pending"'),
    );
  });

  it('uses the production runner and truthfully rejects a nonexistent binding', async () => {
    const { repo } = await adoptedRepository();
    const root = new Command().name('oat').option('--json');
    root.exitOverride();
    root.addCommand(
      createPjmRemoteCommand({ resolveProjectRoot: async () => repo }),
    );
    const stdout = vi
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true);
    await root.parseAsync([
      'node',
      'oat',
      '--json',
      'remote',
      'refresh',
      '--binding',
      'bnd_missing_001',
    ]);
    expect(process.exitCode).toBe(2);
    expect(stdout).toHaveBeenCalledWith(
      expect.stringContaining('does not exist'),
    );
    expect(stdout).not.toHaveBeenCalledWith(
      expect.stringContaining('"persisted":true'),
    );
  });

  it('uses the production runner to persist a semantic refresh handoff', async () => {
    const { repo, store } = await adoptedRepository();
    await materializeFixtureBinding(store);
    const root = new Command().name('oat').option('--json');
    root.exitOverride();
    root.addCommand(
      createPjmRemoteCommand({
        resolveProjectRoot: async () => repo,
        run: createProductionRemoteRunner({
          now: () => '2026-08-31T12:00:00.000Z',
          readObservationStdin: async () => ({
            provider: 'linear',
            context: { workspaceId: 'workspace-1' },
            surfaceKind: 'connector',
            availability: 'available',
            semanticCapabilities: ['read'],
            evidenceDigest: 'sha256:live-capability',
            observedAt: '2026-08-31T12:00:00.000Z',
          }),
        }),
      }),
    );
    const stdout = vi
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true);
    await root.parseAsync([
      'node',
      'oat',
      '--json',
      'remote',
      'refresh',
      '--binding',
      'bnd_live_001',
      '--capability-evidence-stdin',
    ]);
    const rendered = String(stdout.mock.calls.at(-1)?.[0]);
    expect(rendered).toContain('"status":"pending"');
    expect(rendered).toContain('"semanticOperation":"read"');
    expect(rendered).toContain('"persisted":true');
    const active = await store.listActiveOperations('bnd_live_001');
    expect(active).toHaveLength(1);
    const action = await store.readCurrentAction(active[0]!.operationId);
    expect(action).toMatchObject({ semanticOperation: 'read' });
    const runner = createProductionRemoteRunner({
      now: () => '2026-08-31T12:02:00.000Z',
      readObservationStdin: async () => ({
        schemaVersion: 1,
        operationId: action!.operationId,
        stepId: action!.stepId,
        actionDigest: action!.actionDigest,
        observedAt: '2026-08-31T12:01:00.000Z',
        surfaceKind: 'connector',
        capabilityEvidenceDigest: 'sha256:live-capability',
        provider: 'linear',
        context: { workspaceId: 'workspace-1' },
        outcome: {
          classification: 'observed',
          identity: { stableId: 'issue-1', aliases: ['ITEM-1'] },
          fields: {
            title: 'Remote title',
            description: 'Authorization: Bearer refresh-private-tail',
            priority: null,
            status: 'open',
          },
          revisionDigest: 'sha256:remote-revision',
          diagnosticCode: null,
        },
      }),
    });
    await expect(
      runner({
        operation: 'operation-continue',
        projectRoot: repo,
        operationId: action!.operationId,
        observationStdin: true,
      }),
    ).resolves.toMatchObject({
      status: 'ok',
      persisted: true,
      externalAction: null,
    });
    await expect(store.readBindingState('bnd_live_001')).resolves.toMatchObject(
      {
        snapshot: {
          issue: {
            title: 'Remote title',
            description: '[SUPPRESSED:SENSITIVE-CONTENT]',
          },
          contentRedacted: true,
        },
      },
    );
  });

  it('persists an intake target before emitting its semantic read action', async () => {
    const { repo, store } = await adoptedRepository();
    const readObservationStdin = vi.fn().mockResolvedValue({
      provider: 'linear',
      context: { workspaceId: 'workspace-1' },
      surfaceKind: 'connector',
      availability: 'available',
      semanticCapabilities: ['read'],
      evidenceDigest: 'sha256:intake-capability',
      observedAt: '2026-08-31T12:00:00.000Z',
    });
    const runner = createProductionRemoteRunner({
      now: () => '2026-08-31T12:00:00.000Z',
      randomId: vi
        .fn()
        .mockReturnValueOnce('intake-operation')
        .mockReturnValueOnce('intake-binding')
        .mockReturnValueOnce('intake-step')
        .mockReturnValueOnce('intake-snapshot'),
      readObservationStdin,
    });
    const result = await runner({
      operation: 'intake',
      projectRoot: repo,
      providerRef: 'linear:issue-1',
      backlogId: 'item-1',
      capabilityEvidenceStdin: true,
    });
    expect(result).toMatchObject({
      status: 'pending',
      persisted: true,
      externalAction: {
        semanticOperation: 'read',
        intent: { localTarget: { id: 'item-1' } },
      },
    });
    const action = result.externalAction!;
    expect(action.context).toEqual({ workspaceId: 'workspace-1' });
    readObservationStdin.mockResolvedValueOnce({
      schemaVersion: 1,
      operationId: action.operationId,
      stepId: action.stepId,
      actionDigest: action.actionDigest,
      observedAt: '2026-08-31T12:01:00.000Z',
      surfaceKind: 'connector',
      capabilityEvidenceDigest: 'sha256:intake-capability',
      provider: 'linear',
      context: { workspaceId: 'workspace-1' },
      outcome: {
        classification: 'observed',
        identity: { stableId: 'issue-1', aliases: ['ITEM-1'] },
        fields: {
          title: 'Intake title',
          description: 'api key intake-private-tail',
          priority: null,
          status: 'open',
        },
        revisionDigest: 'sha256:intake-revision',
        diagnosticCode: null,
      },
    });
    await expect(
      runner({
        operation: 'operation-continue',
        projectRoot: repo,
        operationId: action.operationId,
        observationStdin: true,
      }),
    ).resolves.toMatchObject({ status: 'ok', persisted: true });
    await expect(
      store.readBindingState('bnd_intake-binding'),
    ).resolves.toMatchObject({
      snapshot: {
        issue: { description: '[SUPPRESSED:SENSITIVE-CONTENT]' },
        contentRedacted: true,
      },
    });
    await expect(
      store.readOperation('op_intake-operation'),
    ).resolves.toMatchObject({
      lifecycleOperation: 'intake',
      bindingId: 'bnd_intake-binding',
      state: 'verified',
    });
  });

  it('uses the production runner for create, authoritative read-back, and binding materialization', async () => {
    const { repo, store } = await adoptedRepository();
    await mkdir(join(repo, '.oat', 'repo', 'pjm', 'backlog', 'items'), {
      recursive: true,
    });
    const backlogPath = join(
      repo,
      '.oat',
      'repo',
      'pjm',
      'backlog',
      'items',
      'item-live.md',
    );
    await writeFile(
      backlogPath,
      '---\ntitle: Live item\npriority: high\nassociated_issues: []\n---\n\n## Description\n\nPublish me.\n',
    );
    await writeFile(
      join(repo, '.oat', 'config.json'),
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
    const readObservationStdin = vi.fn().mockResolvedValue({
      provider: 'linear',
      context: { workspaceId: 'workspace-1' },
      surfaceKind: 'connector',
      availability: 'available',
      semanticCapabilities: ['create'],
      evidenceDigest: 'sha256:live-create-capability',
      observedAt: '2026-08-31T12:00:00.000Z',
    });
    const randomId = vi
      .fn()
      .mockReturnValueOnce('create-operation')
      .mockReturnValueOnce('create-binding')
      .mockReturnValueOnce('create-step')
      .mockReturnValueOnce('verify-step')
      .mockReturnValueOnce('association-write');
    const authorityEvidenceFile = await writeAuthorityEvidence(
      repo,
      interactiveAuthority('create', 'backlog:item-live'),
    );
    const runner = createProductionRemoteRunner({
      now: () => '2026-08-31T12:00:00.000Z',
      randomId,
      readObservationStdin,
    });
    const created = await runner({
      operation: 'publish',
      projectRoot: repo,
      createTarget: {
        provider: 'linear',
        localKind: 'backlog',
        localId: 'item-live',
      },
      capabilityEvidenceStdin: true,
      authorityEvidenceFile,
    });
    expect(created).toMatchObject({
      status: 'pending',
      externalAction: { semanticOperation: 'create' },
    });
    const createAction = created.externalAction!;
    const fields = createAction.intent.fields as Record<string, string | null>;
    readObservationStdin.mockResolvedValueOnce({
      schemaVersion: 1,
      operationId: createAction.operationId,
      stepId: createAction.stepId,
      actionDigest: createAction.actionDigest,
      observedAt: '2026-08-31T12:01:00.000Z',
      surfaceKind: 'connector',
      capabilityEvidenceDigest: 'sha256:live-create-capability',
      provider: 'linear',
      context: { workspaceId: 'workspace-1' },
      outcome: {
        classification: 'observed',
        identity: { stableId: 'issue-live-1', aliases: ['LIVE-1'] },
        fields,
        revisionDigest: 'sha256:create-attempt',
        diagnosticCode: null,
      },
    });
    const pendingRead = await runner({
      operation: 'operation-continue',
      projectRoot: repo,
      operationId: createAction.operationId,
      observationStdin: true,
    });
    expect(pendingRead.externalAction).toMatchObject({
      semanticOperation: 'read',
      intent: { stableId: 'issue-live-1' },
    });
    const readAction = pendingRead.externalAction!;
    await expect(
      store.readAction(createAction.operationId, createAction.stepId),
    ).resolves.toEqual(createAction);
    await expect(
      store.readAction(readAction.operationId, readAction.stepId),
    ).resolves.toEqual(readAction);
    readObservationStdin.mockResolvedValue({
      schemaVersion: 1,
      operationId: readAction.operationId,
      stepId: readAction.stepId,
      actionDigest: readAction.actionDigest,
      observedAt: '2026-08-31T12:02:00.000Z',
      surfaceKind: 'connector',
      capabilityEvidenceDigest: 'sha256:live-create-capability',
      provider: 'linear',
      context: { workspaceId: 'workspace-1' },
      outcome: {
        classification: 'observed',
        identity: { stableId: 'issue-live-1', aliases: ['LIVE-1'] },
        fields,
        revisionDigest: 'sha256:authoritative-read',
        diagnosticCode: null,
      },
    });
    await expect(
      runner({
        operation: 'operation-continue',
        projectRoot: repo,
        operationId: readAction.operationId,
        observationStdin: true,
      }),
    ).resolves.toMatchObject({ status: 'ok', persisted: true });
    await expect(
      runner({
        operation: 'operation-continue',
        projectRoot: repo,
        operationId: readAction.operationId,
        observationStdin: true,
      }),
    ).rejects.toThrow(/terminal|replay/i);
    await expect(
      store.readBindingMetadata('bnd_create-binding'),
    ).resolves.toMatchObject({
      remoteIdentity: { stableId: 'issue-live-1' },
    });
    await expect(readFile(backlogPath, 'utf8')).resolves.toContain(
      'binding: bnd_create-binding',
    );
  });

  it('uses a live pre-read before constructing a production update action', async () => {
    const { repo, store } = await adoptedRepository();
    await materializeFixtureBinding(store);
    const targetPath = join(
      repo,
      '.oat',
      'repo',
      'pjm',
      'backlog',
      'items',
      'item-1.md',
    );
    await mkdir(join(targetPath, '..'), { recursive: true });
    const content =
      '---\ntitle: Local title\npriority: high\nassociated_issues: []\n---\n\n## Description\n\nLocal description\n';
    await writeFile(targetPath, content);
    const state = (await store.readBindingState('bnd_live_001'))!;
    const localProjection = resolveLocalProjection({
      target: {
        kind: 'backlog',
        path: '.oat/repo/pjm/backlog/items/item-1.md',
        content,
      },
      observedAt: '2026-08-31T12:00:00.000Z',
    });
    await store.writeBindingState({
      ...state,
      localProjection,
      snapshot: sanitizeRemoteSnapshot({
        snapshotId: 'snap_live_001',
        bindingId: 'bnd_live_001',
        provider: 'linear',
        observedAt: '2026-08-31T12:00:00.000Z',
        observedBy: {
          provider: 'linear',
          surfaceKind: 'connector',
          context: { workspaceId: 'workspace-1' },
          evidenceDigest: 'sha256:prior-read',
          semanticCapabilities: ['read'],
        },
        identity: {
          stableId: 'issue-1',
          context: { workspaceId: 'workspace-1' },
          aliases: [],
        },
        revision: {
          strength: 'hash-only',
          token: null,
          updatedAt: '2026-08-31T12:00:00.000Z',
          contentHash: 'sha256:remote-current',
        },
        issue: {
          title: 'Remote title',
          description: 'Remote description',
          priority: null,
          status: 'open',
        },
        lifecycle: 'active',
      }),
    });
    await writeFile(
      join(repo, '.oat', 'config.json'),
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
    const readObservationStdin = vi.fn().mockResolvedValue({
      provider: 'linear',
      context: { workspaceId: 'workspace-1' },
      surfaceKind: 'connector',
      availability: 'available',
      semanticCapabilities: ['read', 'update'],
      evidenceDigest: 'sha256:live-update-capability',
      observedAt: '2026-08-31T12:00:00.000Z',
    });
    const runner = createProductionRemoteRunner({
      now: () => '2026-08-31T12:00:00.000Z',
      randomId: vi
        .fn()
        .mockReturnValueOnce('update-operation')
        .mockReturnValueOnce('preread-step')
        .mockReturnValueOnce('mutation-step')
        .mockReturnValueOnce('verification-step'),
      readObservationStdin,
      crash: (point) => {
        if (point === 'after-baseline') throw new Error(`crash:${point}`);
      },
    });
    const authorityEvidenceFile = await writeAuthorityEvidence(
      repo,
      interactiveAuthority('update-fields', 'bnd_live_001'),
    );
    const prepared = await runner({
      operation: 'publish',
      projectRoot: repo,
      bindingId: 'bnd_live_001',
      capabilityEvidenceStdin: true,
      authorityEvidenceFile,
    });
    expect(prepared.externalAction).toMatchObject({
      semanticOperation: 'read',
    });
    const readAction = prepared.externalAction!;
    readObservationStdin.mockResolvedValue({
      schemaVersion: 1,
      operationId: readAction.operationId,
      stepId: readAction.stepId,
      actionDigest: readAction.actionDigest,
      observedAt: '2026-08-31T12:01:00.000Z',
      surfaceKind: 'connector',
      capabilityEvidenceDigest: 'sha256:live-update-capability',
      provider: 'linear',
      context: { workspaceId: 'workspace-1' },
      outcome: {
        classification: 'observed',
        identity: { stableId: 'issue-1', aliases: ['LIVE-1'] },
        fields: {
          title: 'Remote title',
          description: 'Remote description',
          priority: null,
          status: 'open',
        },
        revisionDigest: 'sha256:remote-current',
        diagnosticCode: null,
      },
    });
    await writeAuthorityEvidence(repo, {
      ...interactiveAuthority('update-fields', 'bnd_live_001'),
      sourceId: 'drifted-host-session',
    });
    await expect(
      runner({
        operation: 'operation-continue',
        projectRoot: repo,
        operationId: readAction.operationId,
        observationStdin: true,
        authorityEvidenceFile,
      }),
    ).rejects.toThrow(/authority evidence drifted/i);
    await writeAuthorityEvidence(
      repo,
      interactiveAuthority('update-fields', 'bnd_live_001'),
    );
    await writeFile(
      join(repo, '.oat', 'config.json'),
      `${JSON.stringify({
        version: 1,
        pjm: {
          initialized: true,
          schemaVersion: 1,
          remote: {
            schemaVersion: 1,
            policy: {
              description: 'managed-section',
              authority: { default: 'read-only' },
            },
          },
        },
      })}\n`,
    );
    await expect(
      runner({
        operation: 'operation-continue',
        projectRoot: repo,
        operationId: readAction.operationId,
        observationStdin: true,
        authorityEvidenceFile,
      }),
    ).rejects.toThrow(/policy or authority drifted/i);
    await writeFile(
      join(repo, '.oat', 'config.json'),
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
    const mutation = await runner({
      operation: 'operation-continue',
      projectRoot: repo,
      operationId: readAction.operationId,
      observationStdin: true,
      authorityEvidenceFile,
    });
    expect(mutation).toMatchObject({
      status: 'pending',
      externalAction: { semanticOperation: 'update' },
    });
    const updateAction = mutation.externalAction!;
    const updatedFields = updateAction.intent.fields as Record<
      string,
      string | null
    >;
    readObservationStdin.mockResolvedValue({
      schemaVersion: 1,
      operationId: updateAction.operationId,
      stepId: updateAction.stepId,
      actionDigest: updateAction.actionDigest,
      observedAt: '2026-08-31T12:02:00.000Z',
      surfaceKind: 'connector',
      capabilityEvidenceDigest: 'sha256:live-update-capability',
      provider: 'linear',
      context: { workspaceId: 'workspace-1' },
      outcome: {
        classification: 'observed',
        identity: { stableId: 'issue-1', aliases: ['LIVE-1'] },
        fields: updatedFields,
        revisionDigest: 'sha256:update-receipt',
        diagnosticCode: null,
      },
    });
    const verificationPending = await runner({
      operation: 'operation-continue',
      projectRoot: repo,
      operationId: updateAction.operationId,
      observationStdin: true,
    });
    const verificationAction = verificationPending.externalAction!;
    readObservationStdin.mockResolvedValue({
      schemaVersion: 1,
      operationId: verificationAction.operationId,
      stepId: verificationAction.stepId,
      actionDigest: verificationAction.actionDigest,
      observedAt: '2026-08-31T12:03:00.000Z',
      surfaceKind: 'connector',
      capabilityEvidenceDigest: 'sha256:live-update-capability',
      provider: 'linear',
      context: { workspaceId: 'workspace-1' },
      outcome: {
        classification: 'observed',
        identity: { stableId: 'issue-1', aliases: ['LIVE-1'] },
        fields: { ...updatedFields, status: 'open' },
        revisionDigest: 'sha256:update-authoritative-read',
        diagnosticCode: null,
      },
    });
    await expect(
      runner({
        operation: 'operation-continue',
        projectRoot: repo,
        operationId: updateAction.operationId,
        observationStdin: true,
      }),
    ).rejects.toThrow(/crash:after-baseline/);
    let repeatedHostAction = false;
    const restarted = createProductionRemoteRunner({
      now: () => '2026-08-31T12:04:00.000Z',
      readObservationStdin: async () => {
        repeatedHostAction = true;
        throw new Error('unexpected repeated host action');
      },
    });
    await expect(
      restarted({
        operation: 'operation-continue',
        projectRoot: repo,
        operationId: updateAction.operationId,
      }),
    ).resolves.toMatchObject({ status: 'ok' });
    expect(repeatedHostAction).toBe(false);
    await expect(store.readBindingState('bnd_live_001')).resolves.toMatchObject(
      {
        snapshot: {
          revision: { contentHash: 'sha256:update-authoritative-read' },
        },
        baseline: {
          acceptedByOperationId: updateAction.operationId,
          remoteRevision: {
            contentHash: 'sha256:update-authoritative-read',
          },
          localProjectionRevision: localProjection.sourceRevision,
          fields: {
            title: { value: localProjection.title },
            description: { value: localProjection.description },
            priority: { value: localProjection.priority },
          },
        },
      },
    );
    await expect(
      store.readOperation(updateAction.operationId),
    ).resolves.toMatchObject({
      state: 'verified',
      attempts: [{ requestDigest: updateAction.actionDigest }],
      materializationSteps: expect.arrayContaining([
        expect.objectContaining({ step: 'baseline' }),
      ]),
    });
    await expect(
      restarted({
        operation: 'operation-continue',
        projectRoot: repo,
        operationId: updateAction.operationId,
      }),
    ).rejects.toThrow(/terminal|replay/i);
  });

  it('persists and freshly approves a production shared-storage preview', async () => {
    const { repo, store } = await adoptedRepository();
    let current = '2026-08-31T12:00:00.000Z';
    const runner = createProductionRemoteRunner({ now: () => current });
    const storage = {
      repositoryFingerprint: store.locations.repositoryFingerprint,
      configTarget: '.oat/config.json',
      currentMode: 'local' as const,
      proposedPaths: ['.oat/repo/pjm/remote/state'],
      apply: false,
    };
    await expect(
      runner({
        operation: 'storage-transition',
        projectRoot: repo,
        storage: { ...storage, configTarget: 'caller-selected.json' },
      }),
    ).rejects.toThrow(/repository-owned target/i);
    await expect(
      runner({
        operation: 'storage-transition',
        projectRoot: repo,
        storage: { ...storage, proposedPaths: ['caller-selected-state'] },
      }),
    ).rejects.toThrow(/repository-owned storage paths/i);
    await expect(
      runner({ operation: 'storage-transition', projectRoot: repo, storage }),
    ).resolves.toMatchObject({ status: 'needs-review', persisted: true });
    const preview = await store.readSharedStoragePreview();
    expect(preview?.digest).toMatch(/^sha256:/);
    current = '2026-08-31T12:01:00.000Z';
    await expect(
      runner({
        operation: 'storage-transition',
        projectRoot: repo,
        storage: { ...storage, apply: true },
        storageApprovalDigest: preview!.digest,
      }),
    ).resolves.toMatchObject({ status: 'ok', persisted: true });
    await expect(readOatConfig(repo)).resolves.toMatchObject({
      pjm: { remote: { storage: { state: 'shared' } } },
    });
  });

  it('wires shared-storage preview and approved apply requests', async () => {
    const preview = harness();
    const common = [
      'node',
      'oat',
      'remote',
      'storage',
      'shared',
      '--repository-fingerprint',
      'sha256:repository',
      '--config-target',
      '.oat/config.json',
      '--current-mode',
      'local',
      '--proposed-path',
      '.oat/repo/pjm/remote',
    ];
    await preview.root.parseAsync(common);
    expect(preview.requests[0]).toMatchObject({
      operation: 'storage-transition',
      storage: { apply: false },
    });
    const apply = harness();
    await apply.root.parseAsync([
      ...common,
      '--apply',
      '--approval-digest',
      'sha256:preview',
    ]);
    expect(apply.requests[0]).toMatchObject({
      storageApprovalDigest: 'sha256:preview',
      storage: { apply: true },
    });
  });
});
