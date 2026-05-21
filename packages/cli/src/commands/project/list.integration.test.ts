import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createProgram } from '@app/create-program';
import { afterEach, describe, expect, it } from 'vitest';

import { registerCommands } from '../index';

interface CliResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

async function createWorkspace(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'oat-project-list-int-'));
  await mkdir(join(root, '.git'), { recursive: true });
  await mkdir(join(root, '.oat', 'projects', 'shared'), { recursive: true });
  return root;
}

async function writeStateFile(
  repoRoot: string,
  projectName: string,
  frontmatter: Record<string, string>,
): Promise<void> {
  const projectRoot = join(repoRoot, '.oat', 'projects', 'shared', projectName);
  await mkdir(projectRoot, { recursive: true });
  const fields = Object.entries(frontmatter)
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n');
  await writeFile(
    join(projectRoot, 'state.md'),
    ['---', fields, '---', '', `# Project State: ${projectName}`].join('\n'),
    'utf8',
  );
}

async function runCli(root: string, args: string[]): Promise<CliResult> {
  const program = createProgram();
  registerCommands(program);

  const stdoutChunks: string[] = [];
  const stderrChunks: string[] = [];
  const originalStdoutWrite = process.stdout.write.bind(process.stdout);
  const originalStderrWrite = process.stderr.write.bind(process.stderr);
  const previousExitCode = process.exitCode;
  process.exitCode = undefined;

  (process.stdout.write as unknown as (chunk: unknown) => boolean) = (
    chunk: unknown,
  ) => {
    stdoutChunks.push(String(chunk));
    return true;
  };
  (process.stderr.write as unknown as (chunk: unknown) => boolean) = (
    chunk: unknown,
  ) => {
    stderrChunks.push(String(chunk));
    return true;
  };

  try {
    await program.parseAsync(['--cwd', root, '--scope', 'project', ...args], {
      from: 'user',
    });
  } finally {
    process.stdout.write = originalStdoutWrite;
    process.stderr.write = originalStderrWrite;
  }

  const exitCode = process.exitCode ?? 0;
  process.exitCode = previousExitCode;

  return {
    stdout: stdoutChunks.join(''),
    stderr: stderrChunks.join(''),
    exitCode,
  };
}

describe('oat project list coordination integration', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tempDirs.map(async (dir) => rm(dir, { recursive: true, force: true })),
    );
    tempDirs.length = 0;
  });

  it('filters completed coordination parents from list and groups them in the dashboard', async () => {
    const root = await createWorkspace();
    tempDirs.push(root);

    await writeStateFile(root, 'platform-split', {
      oat_kind: 'coordination',
      oat_phase: 'decomposition',
      oat_phase_status: 'complete',
      oat_workflow_mode: 'quick',
    });
    for (const child of ['api-foundation', 'docs-refresh']) {
      await writeStateFile(root, child, {
        oat_kind: 'implementation',
        oat_phase: 'discovery',
        oat_phase_status: 'in_progress',
        oat_parent: 'platform-split',
        oat_workflow_mode: 'quick',
      });
    }

    const defaultList = await runCli(root, ['project', 'list']);
    expect(defaultList.exitCode).toBe(0);
    expect(defaultList.stdout).toContain('api-foundation');
    expect(defaultList.stdout).toContain('docs-refresh');
    expect(defaultList.stdout).not.toContain('platform-split');

    const fullList = await runCli(root, [
      'project',
      'list',
      '--include-coordination',
    ]);
    expect(fullList.exitCode).toBe(0);
    expect(fullList.stdout).toContain('platform-split');

    const refresh = await runCli(root, ['state', 'refresh']);
    expect(refresh.exitCode).toBe(0);

    const dashboard = await readFile(join(root, '.oat', 'state.md'), 'utf8');
    const activeProjects = dashboard.slice(
      dashboard.indexOf('## Available Projects'),
      dashboard.indexOf('## Decompositions'),
    );
    const decompositions = dashboard.slice(
      dashboard.indexOf('## Decompositions'),
    );

    expect(activeProjects).toContain('api-foundation');
    expect(activeProjects).toContain('docs-refresh');
    expect(activeProjects).not.toContain('platform-split');
    expect(decompositions).toContain('## Decompositions');
    expect(decompositions).toContain('platform-split');
  });
});
