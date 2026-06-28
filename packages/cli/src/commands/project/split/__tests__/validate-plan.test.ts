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

import type { SplitPlanDocument } from '../../../../projects/split/child-plan';
import { createValidateSplitPlanCommand } from '../validate-plan';

function document(
  overrides: Partial<SplitPlanDocument> = {},
): SplitPlanDocument {
  return {
    origin: 'declared',
    interactive: true,
    plan: {
      parentSlug: 'umbrella',
      children: [
        {
          slug: 'foundation',
          inheritedContext: 'Shared context',
          knownDependencies: [],
          order: 1,
        },
        {
          slug: 'feature',
          inheritedContext: 'Feature context',
          knownDependencies: ['foundation'],
          order: 2,
        },
      ],
      foundationChild: 'foundation',
      initialActiveChild: 'foundation',
    },
    ...overrides,
  };
}

function createHarness(
  options: { existingSlugs?: string[]; cwd?: string } = {},
): {
  capture: LoggerCapture;
  command: Command;
} {
  const capture = createLoggerCapture();
  const command = createValidateSplitPlanCommand({
    buildCommandContext: (globalOptions: GlobalOptions): CommandContext => ({
      scope: (globalOptions.scope ?? 'project') as 'project' | 'user' | 'all',
      dryRun: false,
      verbose: globalOptions.verbose ?? false,
      json: globalOptions.json ?? false,
      cwd: globalOptions.cwd ?? options.cwd ?? '/repo',
      home: '/tmp/home',
      interactive: !(globalOptions.json ?? false),
      logger: capture.logger,
    }),
    resolveProjectRoot: async () => '/repo',
    resolveProjectsRoot: async () => '.oat/projects/shared',
    readdir: async () =>
      (options.existingSlugs ?? []).map((name) => ({
        name,
        isDirectory: () => true,
      })),
    processEnv: {},
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
    [...globalArgs, 'project', 'split', 'validate-plan', ...args],
    {
      from: 'user',
    },
  );
}

describe('oat project split validate-plan', () => {
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

  async function writePlanFile(payload: unknown): Promise<string> {
    const root = await mkdtemp(join(tmpdir(), 'oat-split-plan-'));
    tempDirs.push(root);
    const planFile = join(root, 'split-plan.json');
    await writeFile(planFile, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
    return planFile;
  }

  describe('--json mode', () => {
    it('returns ok: true for a well-formed SplitPlanDocument', async () => {
      const planFile = await writePlanFile(document());
      const { command, capture } = createHarness();

      await runCommand(command, ['--plan-file', planFile], ['--json']);

      expect(capture.jsonPayloads[0]).toEqual({ ok: true });
      expect(process.exitCode).toBe(0);
    });

    it('returns errors[] when origin or interactive metadata is missing', async () => {
      const planFile = await writePlanFile({ plan: document().plan });
      const { command, capture } = createHarness();

      await runCommand(command, ['--plan-file', planFile], ['--json']);

      expect(capture.jsonPayloads[0]).toMatchObject({
        ok: false,
        errors: [
          expect.objectContaining({ code: 'invalid-origin' }),
          expect.objectContaining({ code: 'invalid-interactive' }),
        ],
      });
      expect(process.exitCode).toBe(1);
    });

    it('returns errors[] for cycles in oat_depends_on', async () => {
      const planFile = await writePlanFile(
        document({
          plan: {
            parentSlug: 'umbrella',
            children: [
              {
                slug: 'a',
                inheritedContext: '',
                knownDependencies: ['b'],
                order: 1,
              },
              {
                slug: 'b',
                inheritedContext: '',
                knownDependencies: ['a'],
                order: 2,
              },
            ],
            initialActiveChild: 'a',
          },
        }),
      );
      const { command, capture } = createHarness();

      await runCommand(command, ['--plan-file', planFile], ['--json']);

      expect(capture.jsonPayloads[0]).toMatchObject({
        ok: false,
        errors: [expect.objectContaining({ code: 'dependency-cycle' })],
      });
      expect(process.exitCode).toBe(1);
    });

    it('returns errors[] when a child slug already exists', async () => {
      const planFile = await writePlanFile(document());
      const { command, capture } = createHarness({
        existingSlugs: ['feature'],
      });

      await runCommand(command, ['--plan-file', planFile], ['--json']);

      expect(capture.jsonPayloads[0]).toMatchObject({
        ok: false,
        errors: [
          expect.objectContaining({
            code: 'slug-collision-existing',
            slug: 'feature',
          }),
        ],
      });
      expect(process.exitCode).toBe(1);
    });

    it('returns errors[] when the parent slug already exists', async () => {
      const planFile = await writePlanFile(document());
      const { command, capture } = createHarness({
        existingSlugs: ['umbrella'],
      });

      await runCommand(command, ['--plan-file', planFile], ['--json']);

      expect(capture.jsonPayloads[0]).toMatchObject({
        ok: false,
        errors: [
          expect.objectContaining({
            code: 'slug-collision-existing',
            slug: 'umbrella',
          }),
        ],
      });
      expect(process.exitCode).toBe(1);
    });
  });

  describe('human output mode', () => {
    it('logs human-readable success without JSON payload for a valid plan', async () => {
      const planFile = await writePlanFile(document());
      const { command, capture } = createHarness();

      await runCommand(command, ['--plan-file', planFile]);

      expect(capture.jsonPayloads).toHaveLength(0);
      expect([...capture.info, ...capture.success].join('\n')).toBeTruthy();
      expect(process.exitCode).toBe(0);
    });

    it('logs human-readable errors without JSON payload for an invalid plan', async () => {
      const planFile = await writePlanFile({ plan: document().plan });
      const { command, capture } = createHarness();

      await runCommand(command, ['--plan-file', planFile]);

      expect(capture.jsonPayloads).toHaveLength(0);
      expect(capture.error.join('\n')).toBeTruthy();
      expect(process.exitCode).toBe(1);
    });
  });
});
