import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
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
import type { RemoteBindingMetadata } from '../commands/pjm/remote/schema';
import { createProductionRemoteRunner } from '../commands/pjm/remote/service';
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
              description: 'none',
              authority: { default: 'user-approved' },
            },
            storage: { state: 'local' },
          },
        },
      })}\n`,
    );
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
          id: 'shared/e2e-cross-provider',
          path: 'shared/e2e-cross-provider',
        },
        remoteIdentity: {
          stableId: `${provider}-issue-1`,
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
        provenanceToken: `oat-binding:${provider}-e2e-001`,
        lifecycle: 'active',
        createdAt: '2026-09-05T12:00:00.000Z',
        updatedAt: '2026-09-05T12:00:00.000Z',
      };
      await store.materializeIntakeBinding(metadata);
    }
    const runner = createProductionRemoteRunner({
      now: () => '2026-09-05T12:00:00.000Z',
      randomId: (() => {
        let sequence = 0;
        return () => `e2e-closeout-${(sequence += 1)}`;
      })(),
      readObservationStdin: async () =>
        providers.map(([provider, context]) => ({
          provider,
          context,
          surfaceKind: 'connector',
          availability: 'available',
          semanticCapabilities: ['annotate'],
          evidenceDigest: `sha256:${provider}-e2e-capability`,
          observedAt: '2026-09-05T12:00:00.000Z',
        })),
    });
    const result = await runRemoteCommand(
      [
        'closeout',
        '--project',
        'shared/e2e-cross-provider',
        '--capability-evidence-stdin',
      ],
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
