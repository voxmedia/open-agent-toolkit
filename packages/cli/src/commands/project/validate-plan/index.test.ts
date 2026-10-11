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
  const program = new Command()
    .name('oat')
    .option('--json')
    .option('--cwd <path>')
    .exitOverride();
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

  async function writePlanWithDistinctReviewEvents(): Promise<string> {
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
        '',
        '## Reviews',
        '',
        '| Scope | Type | Status   | Date       | Artifact                        |',
        '| ----- | ---- | -------- | ---------- | ------------------------------- |',
        '| final | code | passed   | 2026-04-09 | reviews/final-root-review.md    |',
        '| final | code | received | 2026-04-10 | reviews/final-gate-review-v2.md |',
      ].join('\n'),
      'utf8',
    );
    return dir;
  }

  async function writeModeAwarePlan(options: {
    mode: 'lite' | 'quick';
    phases: number;
    groups?: string;
  }): Promise<string> {
    const dir = await mkdtemp(join(tmpdir(), 'oat-vplan-'));
    tempDirs.push(dir);
    await writeFile(
      join(dir, 'state.md'),
      ['---', `oat_workflow_mode: ${options.mode}`, '---', '', '# State'].join(
        '\n',
      ),
      'utf8',
    );
    await writeFile(
      join(dir, 'plan.md'),
      [
        '---',
        `oat_plan_parallel_groups: ${options.groups ?? '[]'}`,
        '---',
        '',
        '## Validation Criteria',
        '',
        '- [ ] Plan validation passes — Check: `pnpm test`',
        '',
        ...Array.from({ length: options.phases }, (_, index) => [
          `## Phase ${index + 1}: Phase ${index + 1}`,
          '',
          `### Task p${String(index + 1).padStart(2, '0')}-t01: Task`,
        ]).flat(),
      ].join('\n'),
      'utf8',
    );
    return dir;
  }

  async function writeBriefProject(options: {
    phases: string[][];
    groups?: string;
  }): Promise<string> {
    const dir = await mkdtemp(join(tmpdir(), 'oat-vplan-'));
    tempDirs.push(dir);
    await writeFile(
      join(dir, 'state.md'),
      ['---', 'oat_workflow_mode: brief', '---', '', '# State'].join('\n'),
      'utf8',
    );
    await writeFile(
      join(dir, 'plan.md'),
      [
        '---',
        'oat_plan_source: brief',
        `oat_plan_parallel_groups: ${options.groups ?? '[]'}`,
        '---',
        '',
        '# Project Brief',
        '',
        ...options.phases.flat(),
      ].join('\n'),
      'utf8',
    );
    return dir;
  }

  function briefPhase(id: string, extra: string[] = []): string[] {
    return [
      `## Phase ${id}: Phase ${id}`,
      '',
      '**Intent:** Do the work.',
      '**Exit evidence:** Tests pass.',
      '',
      ...extra,
    ];
  }

  describe('brief profile', () => {
    it('validates a parallel group of two taskless phases', async () => {
      const dir = await writeBriefProject({
        phases: [briefPhase('p01'), briefPhase('p02'), briefPhase('p03')],
        groups: '[[p02, p03]]',
      });
      const { command, capture } = createHarness({ json: true });

      await runCommand(command, ['--project-path', dir], ['--json']);

      expect(capture.jsonPayloads[0]).toEqual({ valid: true });
      expect(process.exitCode).toBe(0);
    });

    it('rejects a group naming a phase the brief does not declare', async () => {
      const dir = await writeBriefProject({
        phases: [briefPhase('p01'), briefPhase('p02')],
        groups: '[[p02, p09]]',
      });
      const { command, capture } = createHarness({ json: true });

      await runCommand(command, ['--project-path', dir], ['--json']);

      expect(capture.jsonPayloads[0]).toMatchObject({
        valid: false,
        errors: [expect.stringContaining('p09')],
      });
      expect(process.exitCode).toBe(1);
    });

    it('reports brief error codes', async () => {
      const dir = await writeBriefProject({
        phases: [['## Phase p01: Missing markers', '']],
      });
      const { command, capture } = createHarness({ json: true });

      await runCommand(command, ['--project-path', dir], ['--json']);

      expect(capture.jsonPayloads[0]).toEqual({
        valid: false,
        errors: [
          expect.stringContaining('brief-phase-missing-intent'),
          expect.stringContaining('brief-phase-missing-exit-evidence'),
        ],
      });
      expect(process.exitCode).toBe(1);
    });

    it('passes with the task-headings warning in JSON and human output', async () => {
      const dir = await writeBriefProject({
        phases: [briefPhase('p01', ['### Task p01-t01: Authored', ''])],
      });
      const json = createHarness({ json: true });

      await runCommand(json.command, ['--project-path', dir], ['--json']);

      expect(json.capture.jsonPayloads[0]).toEqual({
        valid: true,
        warnings: [expect.stringContaining('brief-task-headings-ignored')],
      });
      expect(process.exitCode).toBe(0);

      const human = createHarness();
      await runCommand(human.command, ['--project-path', dir]);

      expect(human.capture.warn.join('\n')).toContain(
        'brief-task-headings-ignored',
      );
      expect(human.capture.success).toContain('Plan validation passed.');
    });
  });

  describe('goal profile', () => {
    async function writeGoalProject(journal: string | null): Promise<string> {
      const dir = await mkdtemp(join(tmpdir(), 'oat-vplan-'));
      tempDirs.push(dir);
      await writeFile(
        join(dir, 'state.md'),
        ['---', 'oat_workflow_mode: goal', '---', '', '# State'].join('\n'),
        'utf8',
      );
      await writeFile(
        join(dir, 'plan.md'),
        [
          '---',
          'oat_plan_source: goal',
          'oat_plan_parallel_groups: []',
          '---',
          '',
          '# Project Brief',
          '',
          '## Milestones',
          '',
          '| Milestone | Phases |',
          '| --------- | ------ |',
          '| m01 | p01 |',
          '',
          ...briefPhase('p01'),
          ...briefPhase('p02'),
        ].join('\n'),
        'utf8',
      );
      if (journal !== null) {
        await writeFile(join(dir, 'implementation.md'), journal, 'utf8');
      }
      return dir;
    }

    it('reads the journal so an extracted phase needs no milestone', async () => {
      const unextracted = await writeGoalProject(null);
      const first = createHarness({ json: true });
      await runCommand(
        first.command,
        ['--project-path', unextracted],
        ['--json'],
      );
      expect(first.capture.jsonPayloads[0]).toEqual({
        valid: false,
        errors: [expect.stringContaining('goal-phase-without-milestone')],
      });
      expect(process.exitCode).toBe(1);

      const extracted = await writeGoalProject(
        [
          '## Phase p02: Phase p02',
          '',
          '**Status:** extracted',
          '**Extracted to:** child-project',
          '',
        ].join('\n'),
      );
      const second = createHarness({ json: true });
      await runCommand(
        second.command,
        ['--project-path', extracted],
        ['--json'],
      );
      expect(second.capture.jsonPayloads[0]).toEqual({ valid: true });
      expect(process.exitCode).toBe(0);
    });

    it('reads the journal from the --cwd-resolved project path', async () => {
      const extracted = await writeGoalProject(
        [
          '## Phase p02: Phase p02',
          '',
          '**Status:** extracted',
          '**Extracted to:** child-project',
          '',
        ].join('\n'),
      );
      // A relative --project-path from a foreign process cwd: only the
      // --cwd-resolved journal excuses the extracted phase.
      expect(process.cwd()).not.toBe(extracted);
      const { command, capture } = createHarness({ json: true });
      await runCommand(
        command,
        ['--project-path', '.'],
        ['--json', '--cwd', extracted],
      );
      expect(capture.jsonPayloads[0]).toEqual({ valid: true });
      expect(process.exitCode ?? 0).toBe(0);
    });
  });

  describe('--json mode', () => {
    it('emits { valid: true } when the plan is valid', async () => {
      const dir = await writeValidPlan();
      const { command, capture } = createHarness({ json: true });

      await runCommand(command, ['--project-path', dir], ['--json']);

      expect(capture.jsonPayloads[0]).toEqual({ valid: true });
      expect(process.exitCode).toBe(0);
    });

    it('accepts duplicate-scope Reviews rows for distinct artifacts', async () => {
      const dir = await writePlanWithDistinctReviewEvents();
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

  describe('--cwd resolution', () => {
    it('resolves a relative --project-path against the command cwd, not the process cwd', async () => {
      const dir = await writeValidPlan();
      const { command, capture } = createHarness({ json: true });

      await runCommand(
        command,
        ['--project-path', '.'],
        ['--json', '--cwd', dir],
      );

      expect(capture.jsonPayloads[0]).toEqual({ valid: true });
      expect(process.exitCode ?? 0).toBe(0);
    });
  });

  describe('human output mode', () => {
    it('accepts a lite project with exactly one phase', async () => {
      const dir = await writeModeAwarePlan({ mode: 'lite', phases: 1 });
      const { command, capture } = createHarness();

      await runCommand(command, ['--project-path', dir]);

      expect(capture.success).toContain('Plan validation passed.');
      expect(process.exitCode).toBe(0);
    });

    it('rejects a lite project with two phases using the lite invariant', async () => {
      const dir = await writeModeAwarePlan({ mode: 'lite', phases: 2 });
      const { command, capture } = createHarness();

      await runCommand(command, ['--project-path', dir]);

      expect(capture.error.join('\n')).toContain('exactly one phase');
      expect(process.exitCode).toBe(1);
    });

    it('reports the lite parallel-groups error before the singleton-group rule', async () => {
      const dir = await writeModeAwarePlan({
        mode: 'lite',
        phases: 1,
        groups: '[[p01]]',
      });
      const { command, capture } = createHarness();

      await runCommand(command, ['--project-path', dir]);

      expect(capture.error.join('\n')).toContain('no parallel groups');
      expect(capture.error.join('\n')).not.toContain('singleton');
      expect(process.exitCode).toBe(1);
    });

    it('continues to accept a quick project with two phases', async () => {
      const dir = await writeModeAwarePlan({ mode: 'quick', phases: 2 });
      const { command, capture } = createHarness();

      await runCommand(command, ['--project-path', dir]);

      expect(capture.success).toContain('Plan validation passed.');
      expect(process.exitCode).toBe(0);
    });

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
