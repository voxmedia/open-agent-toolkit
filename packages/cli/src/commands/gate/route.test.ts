import type { CommandContext, GlobalOptions } from '@app/command-context';
import { createLoggerCapture } from '@commands/__tests__/helpers';
import { Command } from 'commander';
import { describe, expect, it } from 'vitest';

import {
  createGateRouteCommand,
  resolveGateRoute,
  type GateRouteDecision,
} from './route';

describe('oat gate route', () => {
  it.each([
    ['claude', { CLAUDECODE: '1' }],
    ['cursor', { CURSOR_AGENT: '1' }],
    ['codex', { CODEX_THREAD_ID: 'thread-1' }],
  ])('routes an unambiguous matching %s runtime inline', (runtime, env) => {
    expect(
      resolveGateRoute({
        expectRuntime: runtime,
        expectModel: 'expected-model',
        canAwait: false,
        env,
      }),
    ).toMatchObject({ route: 'inline', reason: expect.any(String) });
  });

  it.each([
    [{ CLAUDECODE: '1' }, true, 'delegate-sync'],
    [{ CLAUDECODE: '1' }, false, 'refuse'],
    [{}, true, 'delegate-sync'],
    [{}, false, 'refuse'],
    [{ CLAUDECODE: '1', CURSOR_AGENT: '1' }, true, 'delegate-sync'],
    [{ CLAUDECODE: '1', CURSOR_AGENT: '1' }, false, 'refuse'],
  ] as const)(
    'never routes ambiguous or mismatched evidence inline (%j, canAwait=%s)',
    (env, canAwait, route) => {
      expect(
        resolveGateRoute({
          expectRuntime: 'cursor',
          expectModel: 'expected-model',
          canAwait,
          env,
        }),
      ).toMatchObject({ route, reason: expect.any(String) });
    },
  );

  it.each([
    [true, 'delegate-sync'],
    [false, 'refuse'],
  ] as const)(
    'never routes contradictory model evidence inline (canAwait=%s)',
    (canAwait, route) => {
      expect(
        resolveGateRoute({
          expectRuntime: 'cursor',
          expectModel: 'expected-model',
          canAwait,
          env: {
            CURSOR_AGENT: '1',
            OAT_CURRENT_MODEL: 'different-model',
          },
        }),
      ).toMatchObject({ route, reason: expect.stringContaining('model') });
    },
  );

  it('pins the executable JSON envelope shape', async () => {
    const capture = createLoggerCapture();
    const program = new Command().name('oat').option('--json').exitOverride();
    const gate = new Command('gate');
    gate.addCommand(
      createGateRouteCommand({
        processEnv: { CURSOR_AGENT: '1' },
        buildCommandContext: (options: GlobalOptions): CommandContext => ({
          scope: 'project',
          dryRun: false,
          verbose: false,
          json: options.json ?? false,
          cwd: process.cwd(),
          home: process.cwd(),
          interactive: false,
          logger: capture.logger,
        }),
      }),
    );
    program.addCommand(gate);

    await program.parseAsync(
      [
        'gate',
        'route',
        '--json',
        '--expect-runtime',
        'cursor',
        '--expect-model',
        'expected-model',
        '--can-await',
        'false',
      ],
      { from: 'user' },
    );

    expect(capture.jsonPayloads).toEqual<GateRouteDecision[]>([
      {
        route: 'inline',
        reason:
          'Exactly one provider runtime marker matches cursor; model evidence is unavailable.',
      },
    ]);
  });
});
