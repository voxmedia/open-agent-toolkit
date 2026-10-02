import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { CommandContext, GlobalOptions } from '@app/command-context';
import {
  createLoggerCapture,
  type LoggerCapture,
} from '@commands/__tests__/helpers';
import { Command } from 'commander';

/** Shared closeout fixtures for the closeout-check and complete-state suites. */

export const PROJECT_REL = '.oat/projects/shared/demo';

export interface SnapshotFixture {
  status?: string;
  source?: string | null;
  preApproval?: string[];
  preApprovalCompleted?: string[];
  approval?: string;
  approvalSource?: string | null;
  postApproval?: string[];
  postApprovalCompleted?: string[];
  failure?: string | null;
}

function yamlList(values: string[]): string {
  return `[${values.join(', ')}]`;
}

export function snapshotYaml(snapshot: SnapshotFixture): string[] {
  return [
    'oat_post_implement_sequence:',
    `  status: ${snapshot.status ?? 'pre_approval'}`,
    ...(snapshot.source === undefined
      ? ['  source: configured']
      : snapshot.source === null
        ? []
        : [`  source: ${snapshot.source}`]),
    '  final_phase: p01',
    `  pre_approval: ${yamlList(snapshot.preApproval ?? ['summary', 'document', 'pr'])}`,
    `  pre_approval_completed: ${yamlList(snapshot.preApprovalCompleted ?? [])}`,
    `  approval: ${snapshot.approval ?? 'pending'}`,
    `  approval_source: ${snapshot.approvalSource ?? 'null'}`,
    `  post_approval: ${yamlList(snapshot.postApproval ?? [])}`,
    `  post_approval_completed: ${yamlList(snapshot.postApprovalCompleted ?? [])}`,
    `  failure: ${snapshot.failure ?? 'null'}`,
  ];
}

export function buildState(
  options: {
    workflowMode?: string;
    snapshotLines?: string[];
  } = {},
): string {
  return [
    '---',
    'oat_current_task: null',
    'oat_phase: implement',
    'oat_phase_status: complete',
    `oat_workflow_mode: ${options.workflowMode ?? 'quick'}`,
    ...(options.snapshotLines ?? []),
    'oat_project_completed: null',
    'oat_project_state_updated: "2026-10-01T00:00:00.000Z"',
    'oat_generated: false',
    '---',
    '',
    '# Project State: demo',
    '',
    '**Status:** Implementation Complete',
    '**Started:** 2026-10-01',
    '**Last Updated:** 2026-10-01',
    '',
    '## Current Phase',
    '',
    'Closeout.',
    '',
    '## Progress',
    '',
    '- ✓ Implementation complete',
    '',
    '## Next Milestone',
    '',
    'Closeout.',
    '',
  ].join('\n');
}

export interface ProjectFixture {
  root: string;
  home: string;
  projectPath: string;
  statePath: string;
}

export async function createProjectFixture(
  tempDirs: string[],
  options: { configured?: unknown; state?: string } = {},
): Promise<ProjectFixture> {
  const root = await mkdtemp(join(tmpdir(), 'oat-closeout-check-'));
  const home = await mkdtemp(join(tmpdir(), 'oat-closeout-home-'));
  tempDirs.push(root, home);
  const projectPath = join(root, PROJECT_REL);
  await mkdir(projectPath, { recursive: true });
  if (options.configured !== undefined) {
    await writeConfig(root, options.configured);
  }
  const statePath = join(projectPath, 'state.md');
  await writeFile(statePath, options.state ?? buildState(), 'utf8');
  return { root, home, projectPath, statePath };
}

export async function writeConfig(
  root: string,
  postImplementSequence: unknown,
): Promise<void> {
  await mkdir(join(root, '.oat'), { recursive: true });
  await writeFile(
    join(root, '.oat', 'config.json'),
    JSON.stringify(
      {
        version: 1,
        ...(postImplementSequence === null
          ? {}
          : { workflow: { postImplementSequence } }),
      },
      null,
      2,
    ),
    'utf8',
  );
}

export function contextFactory(
  fixture: Pick<ProjectFixture, 'root' | 'home'>,
  capture: LoggerCapture,
) {
  return (globalOptions: GlobalOptions): CommandContext => ({
    scope: 'project',
    dryRun: false,
    verbose: false,
    json: globalOptions.json ?? false,
    cwd: fixture.root,
    home: fixture.home,
    interactive: false,
    logger: capture.logger,
  });
}

export async function runProjectSubcommand(
  command: Command,
  name: string,
  commandArgs: string[],
  globalArgs: string[] = [],
): Promise<void> {
  const program = new Command()
    .name('oat')
    .option('--json')
    .option('--verbose')
    .option('--cwd <path>')
    .exitOverride();
  const project = new Command('project');
  project.addCommand(command);
  program.addCommand(project);
  await program.parseAsync([...globalArgs, 'project', name, ...commandArgs], {
    from: 'user',
  });
}

export { createLoggerCapture, type LoggerCapture };
