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

async function runCommand(command: Command, args: string[]): Promise<void> {
  const program = new Command().name('oat').option('--json').exitOverride();
  const project = new Command('project');
  const split = new Command('split');
  split.addCommand(command);
  project.addCommand(split);
  program.addCommand(project);

  await program.parseAsync(['project', 'split', 'evaluate-signals', ...args], {
    from: 'user',
  });
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

  it('emits JSON with confidence: high when both load-bearing signals fire', async () => {
    const { command, capture } = createHarness();

    await runCommand(command, [
      '--fired',
      'independently-shippable,no-shared-design-surface',
    ]);

    expect(capture.jsonPayloads[0]).toMatchObject({
      fired: ['independently-shippable', 'no-shared-design-surface'],
      triggered: true,
      confidence: 'high',
    });
    expect(process.exitCode).toBe(0);
  });

  it('exits non-zero on invalid signal names', async () => {
    const { command, capture } = createHarness();

    await runCommand(command, ['--fired', 'not-a-signal']);

    expect(capture.error[0]).toContain('Invalid signal');
    expect(process.exitCode).toBe(1);
  });

  it('deduplicates repeated signals before evaluating threshold', async () => {
    const { command, capture } = createHarness();

    await runCommand(command, [
      '--fired',
      'independently-shippable,independently-shippable',
    ]);

    expect(capture.jsonPayloads[0]).toMatchObject({
      fired: ['independently-shippable'],
      triggered: false,
      confidence: 'below',
    });
    expect(process.exitCode).toBe(0);
  });
});
