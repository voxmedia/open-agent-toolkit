import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  closeoutBindings,
  type CloseoutJournal,
  type CloseoutStore,
} from '../closeout';
import type { RemoteBatchRecord } from '../schema';
import type { RemoteBindingMetadata } from '../schema';
import { createProductionRemoteRunner } from '../service';
import { resolveRemoteStorageLocations } from '../storage-locator';
import { RemoteSyncStore } from '../store';

type Provider = 'github' | 'linear' | 'jira';
type Purpose = 'source' | 'planning' | 'delivery';
const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.map((path) =>
      rm(path, { recursive: true, force: true }),
    ),
  );
  temporaryDirectories.length = 0;
});

interface BindingFixture {
  bindingId: string;
  provider: Provider;
  remoteId: string;
  purposes: Purpose[];
  extensions: Record<string, unknown>;
  transitionAuthority?: 'read-only' | 'autonomous';
}

class WorkflowFixture {
  readonly bindings: BindingFixture[] = [];
  readonly publications: Array<{ from: string; to: string }> = [];

  intake(binding: BindingFixture) {
    this.bindings.push(structuredClone(binding));
  }

  publish(fromBindingId: string, binding: BindingFixture) {
    if (
      !this.bindings.some((candidate) => candidate.bindingId === fromBindingId)
    ) {
      throw new Error(`Unknown publication source '${fromBindingId}'.`);
    }
    if (
      this.bindings.some(
        (candidate) => candidate.bindingId === binding.bindingId,
      )
    ) {
      throw new Error(`Duplicate binding '${binding.bindingId}'.`);
    }
    this.bindings.push(structuredClone(binding));
    this.publications.push({ from: fromBindingId, to: binding.bindingId });
  }

  async closeout() {
    const operations = new Map<string, CloseoutJournal>();
    let batch: RemoteBatchRecord | null = null;
    const store: CloseoutStore = {
      async readOperation(operationId) {
        return operations.get(operationId) ?? null;
      },
      async writeOperation(operation) {
        operations.set(operation.operationId, operation);
      },
      async writeBatch(value) {
        batch = value;
      },
    };
    const result = await closeoutBindings(
      {
        batchId: 'batch_cross_provider_001',
        projectPath: 'shared/cross-provider',
        now: '2026-09-05T12:00:00.000Z',
        plans: this.bindings.map((binding, index) => ({
          bindingId: binding.bindingId,
          operationId: `op_cross_provider_00${index + 1}`,
          provider: binding.provider,
          purposes: binding.purposes,
          providerAutomation: binding.purposes.includes('delivery'),
          ...(binding.purposes.includes('source')
            ? {
                annotation: {
                  authority: 'autonomous' as const,
                  sourceDigest: 'sha256:annotation-policy',
                  previewDigest: 'sha256:annotation-preview',
                },
              }
            : {}),
          ...(binding.purposes.includes('planning')
            ? {
                transition: {
                  authority: binding.transitionAuthority ?? 'autonomous',
                  sourceDigest: 'sha256:transition-policy',
                  previewDigest: 'sha256:transition-preview',
                },
              }
            : {}),
        })),
      },
      store,
    );
    expect(batch).toEqual(result.batch);
    return result;
  }
}

function sourceBinding(): BindingFixture {
  return {
    bindingId: 'bnd_github_source_001',
    provider: 'github',
    remoteId: 'issue-1',
    purposes: ['source'],
    extensions: { milestone: 'M1' },
  };
}

describe('representative cross-provider workflows', () => {
  it('previews independent production closeout actions without transitive mirroring', async () => {
    const repository = await mkdtemp(join(tmpdir(), 'oat-p07-cross-provider-'));
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
              description: 'none',
              authority: { default: 'user-approved' },
            },
            storage: { state: 'local' },
          },
        },
      })}\n`,
    );
    const projectPath = '.oat/projects/shared/cross-provider';
    await mkdir(join(repository, projectPath), { recursive: true });
    const store = new RemoteSyncStore(
      resolveRemoteStorageLocations({
        repoRoot: repository,
        gitCommonDir: join(repository, '.git'),
        repositoryIdentity: `local-repository:${resolve(repository)}`,
        stateStorage: 'local',
        target: { kind: 'backlog', scope: 'shared', path: null },
      }),
    );
    const bindings: RemoteBindingMetadata[] = (
      [
        ['github', { repositoryId: 'repository-1' }],
        ['linear', { workspaceId: 'workspace-1' }],
        ['jira', { siteId: 'site-1', projectId: 'project-1' }],
      ] as const
    ).map(([provider, context], index) => ({
      recordType: 'binding-metadata',
      schemaVersion: 1,
      bindingId: `bnd_${provider}_production_001`,
      provider,
      target: {
        kind: 'project',
        scope: 'shared',
        id: 'cross-provider',
        path: projectPath,
      },
      remoteIdentity: {
        stableId: `${provider}-issue-${index + 1}`,
        context,
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
      provenanceToken: `oat-binding:${provider}-production-001`,
      lifecycle: 'active',
      createdAt: '2026-09-05T12:00:00.000Z',
      updatedAt: '2026-09-05T12:00:00.000Z',
    }));
    for (const binding of bindings)
      await store.materializeIntakeBinding(binding);
    let sequence = 0;
    const runner = createProductionRemoteRunner({
      now: () => '2026-09-05T12:00:00.000Z',
      randomId: () => `cross_${(sequence += 1)}`,
      readObservationStdin: async () =>
        bindings.map((binding) => ({
          provider: binding.provider,
          context: binding.remoteIdentity.context,
          surfaceKind: 'connector',
          availability: 'available',
          semanticCapabilities: ['read', 'annotate'],
          evidenceDigest: `sha256:${binding.provider}-capability`,
          observedAt: '2026-09-05T12:00:00.000Z',
        })),
    });

    const preview = await runner({
      operation: 'closeout',
      projectRoot: repository,
      projectPath,
      capabilityEvidenceStdin: true,
    });

    expect(preview.results.map((result) => result.provider).sort()).toEqual([
      'github',
      'jira',
      'linear',
    ]);
    expect(await store.listBindingMetadata()).toHaveLength(3);
    expect(await readdir(store.locations.operational.batchesDir)).toHaveLength(
      1,
    );
  });
  it('uses one GitHub binding for combined source and planning purposes', async () => {
    const flow = new WorkflowFixture();
    flow.intake({ ...sourceBinding(), purposes: ['source', 'planning'] });
    const result = await flow.closeout();
    expect(flow.bindings).toHaveLength(1);
    expect(result.batch.members).toHaveLength(1);
    expect(flow.bindings[0]?.extensions).toEqual({ milestone: 'M1' });
  });

  it.each([
    ['linear', { opaquePlanningEvidence: 'fixture-a' }],
    ['jira', { opaquePlanningEvidence: 'fixture-b' }],
  ] as const)(
    'publishes GitHub source explicitly to %s planning without transitive mirroring',
    async (provider, extensions) => {
      const flow = new WorkflowFixture();
      flow.intake(sourceBinding());
      flow.publish('bnd_github_source_001', {
        bindingId: `bnd_${provider}_planning_001`,
        provider,
        remoteId: `${provider}-1`,
        purposes: ['planning'],
        extensions,
      });

      expect(flow.publications).toEqual([
        { from: 'bnd_github_source_001', to: `bnd_${provider}_planning_001` },
      ]);
      expect(flow.bindings.map((binding) => binding.provider)).toEqual([
        'github',
        provider,
      ]);
      expect(flow.bindings[1]?.extensions).toEqual(extensions);
      const result = await flow.closeout();
      expect(result.batch.members).toHaveLength(2);
      expect(result.batch.outcomes.op_cross_provider_002).toBe('pending');
    },
  );

  it('retains provider-managed delivery automation as an independent outcome', async () => {
    const flow = new WorkflowFixture();
    flow.intake(sourceBinding());
    flow.publish('bnd_github_source_001', {
      bindingId: 'bnd_linear_delivery_001',
      provider: 'linear',
      remoteId: 'linear-2',
      purposes: ['delivery'],
      extensions: { estimate: 5 },
    });
    const result = await flow.closeout();
    expect(result.batch.outcomes.op_cross_provider_002).toBe('verified');
    expect(result.batch.outcomes.op_cross_provider_001).toBe('pending');
  });
});
