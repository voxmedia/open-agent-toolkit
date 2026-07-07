import type { CommandContext, GlobalOptions } from '@app/command-context';
import {
  createLoggerCapture,
  type LoggerCapture,
} from '@commands/__tests__/helpers';
import { Command } from 'commander';
import { describe, expect, it, vi } from 'vitest';

import {
  createCursorCurrentTargetCommand,
  probeCursorCurrentTarget,
  type CursorProbeDependencies,
} from './cursor-current-target';
import { createInternalCommand } from './index';

function createProbeDependencies(
  overrides: Partial<CursorProbeDependencies> = {},
): CursorProbeDependencies {
  return {
    runCursorAgent: vi.fn(async () => ({
      ok: false,
      stdout: '',
      stderr: 'not mocked',
    })),
    readFile: vi.fn(async () => {
      throw new Error('not mocked');
    }),
    env: {},
    ...overrides,
  };
}

describe('probeCursorCurrentTarget', () => {
  it('prefers cursor-agent models current marker and uses API key when present', async () => {
    const runCursorAgent = vi.fn(async () => ({
      ok: true,
      stdout: [
        'Available models',
        '',
        'composer-2.5 - Composer 2.5 (current)',
        'composer-2.5-fast - Composer 2.5 Fast (default)',
      ].join('\n'),
      stderr: '',
    }));

    const result = await probeCursorCurrentTarget({
      cwd: '/repo',
      home: '/home/user',
      dependencies: createProbeDependencies({
        runCursorAgent,
        env: { CURSOR_API_KEY: 'secret-key' },
      }),
    });

    expect(result).toMatchObject({
      value: 'composer-2.5',
      source: 'cursor-agent models',
      provenance: 'inferred',
      family: 'composer',
    });
    expect(runCursorAgent).toHaveBeenCalledTimes(1);
    expect(runCursorAgent).toHaveBeenCalledWith(
      ['--api-key', 'secret-key', 'models'],
      expect.objectContaining({ cwd: '/repo' }),
    );
  });

  it('falls back to --list-models current marker when models has no usable result', async () => {
    const runCursorAgent = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, stdout: '', stderr: 'keychain' })
      .mockResolvedValueOnce({
        ok: true,
        stdout: 'gpt-5.5-high - GPT 5.5 High (current)\n',
        stderr: '',
      });

    const result = await probeCursorCurrentTarget({
      cwd: '/repo',
      home: '/home/user',
      dependencies: createProbeDependencies({ runCursorAgent }),
    });

    expect(result).toMatchObject({
      value: 'gpt-5.5-high',
      source: '--list-models',
      provenance: 'inferred',
      family: 'openai',
    });
  });

  it('maps init-event display names through the live catalog on exact match', async () => {
    const runCursorAgent = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        stdout: 'composer-2.5-fast - Composer 2.5 Fast (default)\n',
        stderr: '',
      })
      .mockResolvedValueOnce({ ok: false, stdout: '', stderr: 'keychain' })
      .mockResolvedValueOnce({
        ok: true,
        stdout: [
          '{"type":"system","subtype":"init","model":"Composer 2.5 Fast"}',
          '{"type":"result","subtype":"success"}',
        ].join('\n'),
        stderr: '',
      });

    const result = await probeCursorCurrentTarget({
      cwd: '/repo',
      home: '/home/user',
      dependencies: createProbeDependencies({ runCursorAgent }),
    });

    expect(result).toMatchObject({
      value: 'composer-2.5-fast',
      rawValue: 'Composer 2.5 Fast',
      source: 'init-event',
      provenance: 'inferred',
      family: 'composer',
    });
  });

  it('uses cli-config .model after catalog and init-event sources fail', async () => {
    const runCursorAgent = vi.fn(async () => ({
      ok: false,
      stdout: '',
      stderr: 'not available',
    }));
    const readFile = vi.fn(async () =>
      JSON.stringify({ model: 'composer-2.5-fast' }),
    );

    const result = await probeCursorCurrentTarget({
      cwd: '/repo',
      home: '/home/user',
      dependencies: createProbeDependencies({ runCursorAgent, readFile }),
    });

    expect(result).toMatchObject({
      value: 'composer-2.5-fast',
      source: 'cli-config',
      provenance: 'inferred',
      family: 'composer',
    });
    expect(readFile).toHaveBeenCalledWith(
      '/home/user/.cursor/cli-config.json',
      'utf8',
    );
  });

  it('degrades display-name disagreements instead of normalizing variants', async () => {
    const runCursorAgent = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        stdout: 'composer-2.5-fast - Composer 2.5 Fast\n',
        stderr: '',
      })
      .mockResolvedValueOnce({ ok: false, stdout: '', stderr: 'keychain' })
      .mockResolvedValueOnce({
        ok: true,
        stdout: '{"type":"system","subtype":"init","model":"Composer 2.5"}\n',
        stderr: '',
      });

    const result = await probeCursorCurrentTarget({
      cwd: '/repo',
      home: '/home/user',
      dependencies: createProbeDependencies({ runCursorAgent }),
    });

    expect(result).toMatchObject({
      value: 'unknown',
      rawValue: 'Composer 2.5',
      source: 'init-event',
      provenance: 'inferred',
      family: 'unknown',
    });
  });

  it('degrades raw single-token mismatches when a catalog is available', async () => {
    const runCursorAgent = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        stdout: 'composer-2.5-fast - Composer 2.5 Fast\n',
        stderr: '',
      })
      .mockResolvedValueOnce({ ok: false, stdout: '', stderr: 'keychain' })
      .mockResolvedValueOnce({
        ok: false,
        stdout: '',
        stderr: 'not available',
      });
    const readFile = vi.fn(async () =>
      JSON.stringify({ model: 'composer-2.5' }),
    );

    const result = await probeCursorCurrentTarget({
      cwd: '/repo',
      home: '/home/user',
      dependencies: createProbeDependencies({ runCursorAgent, readFile }),
    });

    expect(result).toMatchObject({
      value: 'unknown',
      rawValue: 'composer-2.5',
      source: 'cli-config',
      provenance: 'inferred',
      family: 'unknown',
    });
  });

  it('returns unknown when every source fails', async () => {
    const result = await probeCursorCurrentTarget({
      cwd: '/repo',
      home: '/home/user',
      dependencies: createProbeDependencies(),
    });

    expect(result).toMatchObject({
      value: 'unknown',
      source: 'unknown',
      provenance: 'unknown',
      family: 'unknown',
    });
  });
});

function createCommandHarness(dependencies: CursorProbeDependencies): {
  capture: LoggerCapture;
  command: Command;
} {
  const capture = createLoggerCapture();
  const command = createCursorCurrentTargetCommand({
    buildCommandContext: (globalOptions: GlobalOptions): CommandContext => ({
      scope: (globalOptions.scope ?? 'project') as 'project' | 'user' | 'all',
      dryRun: false,
      verbose: globalOptions.verbose ?? false,
      json: globalOptions.json ?? false,
      cwd: '/repo',
      home: '/home/user',
      interactive: !(globalOptions.json ?? false),
      logger: capture.logger,
    }),
    ...dependencies,
  });
  return { capture, command };
}

async function runCommand(command: Command, args: string[] = []) {
  const program = new Command().name('oat').option('--json').exitOverride();
  const internal = new Command('internal');
  internal.addCommand(command);
  program.addCommand(internal);
  await program.parseAsync(['internal', 'cursor-current-target', ...args], {
    from: 'user',
  });
}

describe('createCursorCurrentTargetCommand', () => {
  it('emits JSON with value source and provenance', async () => {
    const { command, capture } = createCommandHarness(
      createProbeDependencies({
        runCursorAgent: vi.fn(async () => ({
          ok: true,
          stdout: 'composer-2.5 - Composer 2.5 (current)\n',
          stderr: '',
        })),
      }),
    );

    await runCommand(command, ['--json']);

    expect(capture.jsonPayloads[0]).toMatchObject({
      value: 'composer-2.5',
      source: 'cursor-agent models',
      provenance: 'inferred',
    });
  });

  it('is registered under oat internal', () => {
    expect(
      createInternalCommand().commands.map((command) => command.name()),
    ).toContain('cursor-current-target');
  });
});
