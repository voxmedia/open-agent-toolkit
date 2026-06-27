import type { CommandContext, GlobalOptions } from '@app/command-context';
import {
  createLoggerCapture,
  type LoggerCapture,
} from '@commands/__tests__/helpers';
import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createEvaluateSignalsCommand } from '../evaluate-signals';

function createHarness(): {
  capture: LoggerCapture;
  command: Command;
} {
  const capture = createLoggerCapture();
  const command = createEvaluateSignalsCommand({
    buildCommandContext: (globalOptions: GlobalOptions): CommandContext => ({
      scope: (globalOptions.scope ?? 'project') as 'project' | 'user' | 'all',
      dryRun: false,
      verbose: globalOptions.verbose ?? false,
      json: globalOptions.json ?? false,
      cwd: globalOptions.cwd ?? '/repo',
      home: '/tmp/home',
      interactive: !(globalOptions.json ?? false),
      logger: capture.logger,
    }),
  });

  return { capture, command };
}

async function runCommand(
  command: Command,
  args: string[],
  globalArgs: string[] = [],
): Promise<void> {
  const program = new Command().name('oat').option('--json').exitOverride();
  const project = new Command('project');
  const split = new Command('split');
  split.addCommand(command);
  project.addCommand(split);
  program.addCommand(project);

  await program.parseAsync(
    [...globalArgs, 'project', 'split', 'evaluate-signals', ...args],
    {
      from: 'user',
    },
  );
}

describe('oat project split evaluate-signals', () => {
  let originalExitCode: number | undefined;

  beforeEach(() => {
    originalExitCode = process.exitCode;
    process.exitCode = undefined;
  });

  afterEach(() => {
    process.exitCode = originalExitCode;
  });

  describe('--json mode', () => {
    it('emits JSON with confidence: high when both load-bearing signals fire', async () => {
      const { command, capture } = createHarness();

      await runCommand(
        command,
        ['--fired', 'independently-shippable,no-shared-design-surface'],
        ['--json'],
      );

      expect(capture.jsonPayloads[0]).toMatchObject({
        fired: ['independently-shippable', 'no-shared-design-surface'],
        triggered: true,
        confidence: 'high',
      });
      expect(process.exitCode).toBe(0);
    });

    it('deduplicates repeated signals before evaluating threshold', async () => {
      const { command, capture } = createHarness();

      await runCommand(
        command,
        ['--fired', 'independently-shippable,independently-shippable'],
        ['--json'],
      );

      expect(capture.jsonPayloads[0]).toMatchObject({
        fired: ['independently-shippable'],
        triggered: false,
        confidence: 'below',
      });
      expect(process.exitCode).toBe(0);
    });
  });

  describe('human output mode', () => {
    it('logs human-readable result without JSON payload', async () => {
      const { command, capture } = createHarness();

      await runCommand(command, [
        '--fired',
        'independently-shippable,no-shared-design-surface',
      ]);

      expect(capture.jsonPayloads).toHaveLength(0);
      expect(
        [...capture.info, ...capture.success, ...capture.warn].join('\n'),
      ).toBeTruthy();
      expect(process.exitCode).toBe(0);
    });

    it('logs human-readable result when threshold is not met', async () => {
      const { command, capture } = createHarness();

      await runCommand(command, ['--fired', 'independently-shippable']);

      expect(capture.jsonPayloads).toHaveLength(0);
      // Verify actual below-threshold output so deleting the else-branch fails.
      expect(capture.info.join('\n')).toContain('below threshold');
      expect(capture.info.join('\n')).toContain('independently-shippable');
      expect(process.exitCode).toBe(0);
    });
  });

  it('exits non-zero on invalid signal names', async () => {
    const { command, capture } = createHarness();

    await runCommand(command, ['--fired', 'not-a-signal']);

    expect(capture.error[0]).toContain('Invalid signal');
    expect(process.exitCode).toBe(1);
  });
});
