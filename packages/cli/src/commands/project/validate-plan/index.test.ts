import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { CommandContext, GlobalOptions } from '@app/command-context';
import {
  createLoggerCapture,
  type LoggerCapture,
} from '@commands/__tests__/helpers';
import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createProjectValidatePlanCommand } from './index';

function createHarness(options: { json?: boolean } = {}): {
  capture: LoggerCapture;
  command: Command;
} {
  const capture = createLoggerCapture();
  const defaultJson = options.json ?? false;
  const command = createProjectValidatePlanCommand({
    buildCommandContext: (globalOptions: GlobalOptions): CommandContext => ({
      scope: 'all',
      dryRun: false,
      verbose: false,
      json: globalOptions.json ?? defaultJson,
      cwd: globalOptions.cwd ?? process.cwd(),
      home: '/tmp/home',
      interactive: !(globalOptions.json ?? defaultJson),
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
  project.addCommand(command);
  program.addCommand(project);

  await program.parseAsync(
    [...globalArgs, 'project', 'validate-plan', ...args],
    { from: 'user' },
  );
}

describe('oat project validate-plan', () => {
  const tempDirs: string[] = [];
  let originalExitCode: number | undefined;

  beforeEach(() => {
    originalExitCode = process.exitCode;
    process.exitCode = undefined;
  });

  afterEach(async () => {
    process.exitCode = originalExitCode;
    await Promise.all(
      tempDirs.map(async (dir) => rm(dir, { recursive: true, force: true })),
    );
    tempDirs.length = 0;
  });

  async function writeValidPlan(): Promise<string> {
    const dir = await mkdtemp(join(tmpdir(), 'oat-vplan-'));
    tempDirs.push(dir);
    await writeFile(
      join(dir, 'plan.md'),
      [
        '---',
        'oat_plan_parallel_groups: []',
        '---',
        '',
        '### Task p01-t01: Do something',
      ].join('\n'),
      'utf8',
    );
    return dir;
  }

  async function writeInvalidPlan(): Promise<string> {
    const dir = await mkdtemp(join(tmpdir(), 'oat-vplan-'));
    tempDirs.push(dir);
    await writeFile(
      join(dir, 'plan.md'),
      [
        '---',
        'oat_plan_parallel_groups: [[p01, p99]]',
        '---',
        '',
        '### Task p01-t01: Do something',
      ].join('\n'),
      'utf8',
    );
    return dir;
  }

  describe('--json mode', () => {
    it('emits { valid: true } when the plan is valid', async () => {
      const dir = await writeValidPlan();
      const { command, capture } = createHarness({ json: true });

      await runCommand(command, ['--project-path', dir], ['--json']);

      expect(capture.jsonPayloads[0]).toEqual({ valid: true });
      expect(process.exitCode).toBe(0);
    });

    it('emits { valid: false, errors: [...] } for invalid parallel groups', async () => {
      const dir = await writeInvalidPlan();
      const { command, capture } = createHarness({ json: true });

      await runCommand(command, ['--project-path', dir], ['--json']);

      expect(capture.jsonPayloads[0]).toMatchObject({
        valid: false,
        errors: expect.arrayContaining([expect.stringContaining('p99')]),
      });
      expect(process.exitCode).toBe(1);
    });

    it('emits { valid: false, errors: [...] } when plan.md cannot be read', async () => {
      const { command, capture } = createHarness({ json: true });

      await runCommand(
        command,
        ['--project-path', '/does-not-exist-oat-test'],
        ['--json'],
      );

      expect(capture.jsonPayloads[0]).toMatchObject({
        valid: false,
        errors: expect.arrayContaining([expect.any(String)]),
      });
      expect(process.exitCode).toBe(2);
    });
  });

  describe('human output mode', () => {
    it('logs success message without JSON payload when plan is valid', async () => {
      const dir = await writeValidPlan();
      const { command, capture } = createHarness();

      await runCommand(command, ['--project-path', dir]);

      expect(capture.jsonPayloads).toHaveLength(0);
      expect(capture.success.join('\n')).toContain('Plan validation passed');
      expect(process.exitCode).toBe(0);
    });

    it('logs error messages without JSON payload when plan is invalid', async () => {
      const dir = await writeInvalidPlan();
      const { command, capture } = createHarness();

      await runCommand(command, ['--project-path', dir]);

      expect(capture.jsonPayloads).toHaveLength(0);
      expect(capture.error.join('\n')).toContain('Plan validation failed');
      expect(process.exitCode).toBe(1);
    });
  });
});
