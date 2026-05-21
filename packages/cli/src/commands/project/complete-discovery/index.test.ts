import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { CommandContext, GlobalOptions } from '@app/command-context';
import {
  createLoggerCapture,
  type LoggerCapture,
} from '@commands/__tests__/helpers';
import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createProjectCompleteDiscoveryCommand } from './index';

function buildDiscoveryContent(
  frontmatter: Record<string, unknown> = {},
): string {
  const lines = Object.entries({
    oat_status: 'in_progress',
    oat_ready_for: null,
    ...frontmatter,
  }).map(([key, value]) =>
    value === null ? `${key}: null` : `${key}: ${String(value)}`,
  );

  return [
    '---',
    ...lines,
    '---',
    '',
    '# Discovery',
    '',
    'Discovery body.',
    '',
  ].join('\n');
}

function buildStateContent(frontmatter: Record<string, unknown>): string {
  return [
    '---',
    ...Object.entries(frontmatter).map(([key, value]) =>
      Array.isArray(value)
        ? `${key}: [${value.join(', ')}]`
        : `${key}: ${String(value)}`,
    ),
    '---',
    '',
    '# State',
    '',
  ].join('\n');
}

function createHarness(cwd: string): {
  capture: LoggerCapture;
  command: Command;
} {
  const capture = createLoggerCapture();
  const command = createProjectCompleteDiscoveryCommand({
    buildCommandContext: (globalOptions: GlobalOptions): CommandContext => ({
      scope: (globalOptions.scope ?? 'project') as 'project' | 'user' | 'all',
      dryRun: false,
      verbose: globalOptions.verbose ?? false,
      json: globalOptions.json ?? false,
      cwd: globalOptions.cwd ?? cwd,
      home: '/tmp/home',
      interactive: !(globalOptions.json ?? false),
      logger: capture.logger,
    }),
    resolveProjectRoot: vi.fn(async () => cwd),
    now: () => new Date('2026-05-21T14:30:00.000Z'),
  } as never);

  return { capture, command };
}

async function runCommand(
  command: Command,
  commandArgs: string[],
): Promise<void> {
  const program = new Command().name('oat').option('--json').exitOverride();
  const project = new Command('project');
  project.addCommand(command);
  program.addCommand(project);

  await program.parseAsync(['project', 'complete-discovery', ...commandArgs], {
    from: 'user',
  });
}

describe('oat project complete-discovery', () => {
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

  async function createRepoRoot(): Promise<string> {
    const root = await mkdtemp(join(tmpdir(), 'oat-complete-discovery-'));
    tempDirs.push(root);
    await mkdir(join(root, '.oat', 'projects', 'shared'), { recursive: true });
    return root;
  }

  it('marks discovery complete with the requested next skill', async () => {
    const root = await createRepoRoot();
    const projectPath = join(root, '.oat', 'projects', 'shared', 'demo');
    await mkdir(projectPath, { recursive: true });
    await writeFile(
      join(projectPath, 'discovery.md'),
      buildDiscoveryContent(),
      'utf8',
    );

    const { command } = createHarness(root);
    await runCommand(command, [
      '.oat/projects/shared/demo',
      '--ready-for',
      'oat-project-plan',
    ]);

    const discovery = await readFile(join(projectPath, 'discovery.md'), 'utf8');
    expect(discovery).toContain('oat_status: complete');
    expect(discovery).toContain('oat_ready_for: oat-project-plan');
    expect(discovery).toContain('oat_last_updated: 2026-05-21');
    expect(process.exitCode).toBe(0);
  });

  it('rejects child discovery completion when inherited context has not been revalidated', async () => {
    const root = await createRepoRoot();
    const projectsRoot = join(root, '.oat', 'projects', 'shared');
    const projectPath = join(projectsRoot, 'child');
    await mkdir(projectPath, { recursive: true });
    await mkdir(join(projectsRoot, 'parent'), { recursive: true });
    await writeFile(
      join(projectsRoot, 'parent', 'state.md'),
      buildStateContent({
        oat_kind: 'coordination',
        oat_children: ['child'],
      }),
      'utf8',
    );
    await writeFile(
      join(projectPath, 'discovery.md'),
      buildDiscoveryContent({
        oat_parent: 'parent',
        oat_inherited_context_revalidated: false,
      }),
      'utf8',
    );

    const { command, capture } = createHarness(root);
    await runCommand(command, ['.oat/projects/shared/child']);

    const discovery = await readFile(join(projectPath, 'discovery.md'), 'utf8');
    expect(capture.error[0]).toContain(
      'child discovery cannot complete until oat_inherited_context_revalidated is true',
    );
    expect(discovery).toContain('oat_status: in_progress');
    expect(process.exitCode).toBe(1);
  });
});
