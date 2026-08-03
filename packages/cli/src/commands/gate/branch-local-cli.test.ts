import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  createBranchLocalGateCli,
  currentGateCliLaunch,
  readGateRouteReceipt,
  removeBranchLocalGateCli,
  resolveCurrentLoaderArgs,
  validateGateRouteEnvelope,
  type BranchLocalGateCli,
} from './branch-local-cli';

const shims: BranchLocalGateCli[] = [];

afterEach(async () => {
  await Promise.all(shims.splice(0).map(removeBranchLocalGateCli));
});

describe('branch-local gate CLI', () => {
  it('preserves and resolves the active loader arguments', () => {
    const loaderArgs = resolveCurrentLoaderArgs([
      '--import',
      'tsx',
      '--require=commander',
    ]);
    expect(loaderArgs[0]).toBe('--import');
    expect(loaderArgs[1]).not.toBe('tsx');
    expect(loaderArgs[2]).toMatch(/^--require=.+commander/);
    expect(
      currentGateCliLaunch({
        argv: ['node', '/checkout/packages/cli/src/index.ts'],
        execArgv: ['--import', 'tsx'],
        execPath: '/runtime/node',
        cwd: '/checkout',
      }),
    ).toEqual({
      command: '/runtime/node',
      args: ['--import', loaderArgs[1], '/checkout/packages/cli/src/index.ts'],
      cwd: '/checkout',
    });
    expect(
      currentGateCliLaunch({
        argv: ['node', '/checkout/packages/cli/src/index.ts'],
        execPath: '/runtime/node',
        cwd: 'relative-checkout',
      }).cwd,
    ).toBe(resolve('relative-checkout'));
  });

  it('creates an executable shim for the exact running checkout launch', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-gate-cli-test-'));
    const fixture = join(root, 'fixture.mjs');
    await writeFile(
      fixture,
      'process.stdout.write(JSON.stringify({ argv: process.argv.slice(2) }));\n',
    );
    const shim = await createBranchLocalGateCli({
      runId: 'run-1',
      launch: { command: process.execPath, args: [fixture] },
      cliRoot: '/expected/checkout',
      tempRoot: root,
    });
    shims.push(shim);

    expect(await readFile(shim.cliPath, 'utf8')).toContain(fixture);
    expect(
      spawnSync(shim.cliPath, ['gate', 'route'], { encoding: 'utf8' }),
    ).toMatchObject({
      status: 0,
      stdout: '{"argv":["gate","route"]}',
    });
    expect(shim.cliRoot).toBe('/expected/checkout');
  });

  it.each([
    ['', 'did not return JSON'],
    ['Usage: oat gate [options] [command]', 'did not return JSON'],
    ['{"version":"0.1.65"}', 'invalid decision envelope'],
    [
      '{"route":"inline","reason":"matched","cliRoot":"/installed"}',
      'outside the expected checkout',
    ],
  ])('rejects unusable route output %#', (output, message) => {
    expect(() => validateGateRouteEnvelope(output, '/checkout')).toThrow(
      message,
    );
  });

  it('accepts a correlated branch-local route envelope', () => {
    expect(
      validateGateRouteEnvelope(
        '{"route":"inline","reason":"matched","cliRoot":"/checkout"}',
        '/checkout',
      ),
    ).toEqual({
      route: 'inline',
      reason: 'matched',
      cliRoot: '/checkout',
    });
  });

  it('validates the runtime in the mechanical child route receipt', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-gate-cli-receipt-'));
    const path = join(root, 'receipt.json');
    await writeFile(
      path,
      '{"route":"inline","reason":"matched","cliRoot":"/checkout","runtime":"cursor"}',
    );
    await expect(
      readGateRouteReceipt(path, '/checkout', 'cursor'),
    ).resolves.toMatchObject({ route: 'inline', runtime: 'cursor' });
    await expect(
      readGateRouteReceipt(path, '/checkout', 'claude'),
    ).rejects.toThrow('runtime did not match');
  });
});
