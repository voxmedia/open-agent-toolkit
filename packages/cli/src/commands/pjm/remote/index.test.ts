import { Command } from 'commander';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createPjmRemoteCommand, type RemoteCommandRequest } from './index';

const previousExitCode = process.exitCode;
afterEach(() => {
  process.exitCode = previousExitCode;
  vi.restoreAllMocks();
});

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
      '--observation-stdin',
    ]);
    expect(continuation.requests[0]).toMatchObject({
      operation: 'operation-continue',
      bindingId: 'op-1',
      observationStdin: true,
    });
  });

  it.each([
    [
      ['--instruction-digest', 'sha256:instruction'],
      { kind: 'explicit-instruction', digest: 'sha256:instruction' },
    ],
    [
      ['--approval-digest', 'sha256:approval'],
      { kind: 'fresh-approval', digest: 'sha256:approval' },
    ],
    [
      ['--workflow-id', 'workflow-1', '--workflow-revision', 'rev-1'],
      { kind: 'active-workflow', workflowId: 'workflow-1', revision: 'rev-1' },
    ],
  ] as const)(
    'passes exact mutation authority evidence %#',
    async (args, authority) => {
      const { root, requests } = harness();
      await root.parseAsync([
        'node',
        'oat',
        'remote',
        'publish',
        '--binding',
        'bnd-1',
        ...args,
      ]);
      expect(requests[0]?.authority).toEqual(authority);
    },
  );

  it('fails closed for absent adoption and missing mutation authority', async () => {
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
    const missing = harness();
    await expect(
      missing.root.parseAsync([
        'node',
        'oat',
        'remote',
        'publish',
        '--binding',
        'bnd-1',
      ]),
    ).rejects.toThrow(/exactly one/);
    expect(missing.requests).toEqual([]);
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
});
