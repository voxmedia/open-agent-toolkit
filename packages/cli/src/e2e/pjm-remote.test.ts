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

const originalExitCode = process.exitCode;

afterEach(() => {
  process.exitCode = originalExitCode;
});

async function runRemoteCommand(
  args: string[],
  status: RemoteCommandStatus,
  json: boolean,
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
        resolveProjectRoot: async () => '/fixture-repository',
        checkAdoption: async () => 'complete',
        run: async (candidate) => {
          request = candidate;
          return envelopeFor(candidate, status);
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
