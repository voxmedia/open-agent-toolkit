import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createProgram } from '@app/create-program';
import { registerCommands } from '@commands/index';
import { afterEach, describe, expect, it } from 'vitest';

import { createPjmCommand } from './index';

interface CliResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

const EXPECTED_FILES = [
  'AGENTS.md',
  'pjm/AGENTS.md',
  'pjm/current-state.md',
  'pjm/roadmap.md',
  'reference/AGENTS.md',
  'README.md',
  'pjm/handoffs/README.md',
  'pjm/backlog/index.md',
  'pjm/backlog/completed.md',
  'pjm/backlog/items/.gitkeep',
  'pjm/backlog/archived/.gitkeep',
  'reference/decisions/AGENTS.md',
  'reference/decisions/index.md',
] as const;

const TEMPLATE_NAMES = [
  'current-state.md',
  'roadmap.md',
  'repo-agents.md',
  'pjm-agents.md',
  'reference-agents.md',
  'repo-readme.md',
  'pjm-handoffs-readme.md',
] as const;

async function seedTemplate(root: string, name: string): Promise<void> {
  await mkdir(root, { recursive: true });
  await writeFile(
    join(root, name),
    [
      '---',
      'oat_template: true',
      `oat_template_name: ${name.replace('.md', '')}`,
      '---',
      '',
      `# ${name}`,
      '',
    ].join('\n'),
    'utf8',
  );
}

async function createWorkspace(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'oat-pjm-command-'));
  await mkdir(join(root, '.git'), { recursive: true });
  for (const templateName of TEMPLATE_NAMES) {
    await seedTemplate(join(root, '.oat', 'templates'), templateName);
  }
  return root;
}

async function enableProjectManagement(root: string): Promise<void> {
  await mkdir(join(root, '.oat'), { recursive: true });
  await writeFile(
    join(root, '.oat', 'config.json'),
    JSON.stringify(
      { version: 1, tools: { 'project-management': true } },
      null,
      2,
    ),
    'utf8',
  );
}

async function runCli(
  root: string,
  args: string[],
  register: (
    program: ReturnType<typeof createProgram>,
  ) => void = registerCommands,
): Promise<CliResult> {
  const program = createProgram();
  register(program);

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
    await program.parseAsync(['--cwd', root, ...args], { from: 'user' });
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

describe('oat pjm', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tempDirs.map((dir) => rm(dir, { recursive: true, force: true })),
    );
    tempDirs.length = 0;
  });

  it('is reachable from the registered program and initializes the two-layer repo reference scaffold', async () => {
    const root = await createWorkspace();
    tempDirs.push(root);

    const result = await runCli(root, ['--json', 'pjm', 'init']);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    const payload = JSON.parse(result.stdout);
    const repoRoot = join(root, '.oat', 'repo');
    expect(payload).toEqual({
      status: 'ok',
      repoRoot,
      created: EXPECTED_FILES,
      skipped: [],
    });

    for (const relativePath of EXPECTED_FILES) {
      await expect(
        access(join(repoRoot, relativePath)),
      ).resolves.toBeUndefined();
    }
    await expect(
      readFile(join(repoRoot, 'pjm', 'current-state.md'), 'utf8'),
    ).resolves.not.toContain('oat_template:');
  });

  it('prints the instructions sync next-step hint after init', async () => {
    const root = await createWorkspace();
    tempDirs.push(root);

    const result = await runCli(root, ['pjm', 'init']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('oat instructions sync');
    expect(result.stdout).toContain('--dry-run');
  });

  it('supports a repo root override', async () => {
    const root = await createWorkspace();
    tempDirs.push(root);

    const result = await runCli(root, [
      '--json',
      'pjm',
      'init',
      '--repo-root',
      'custom/repo',
    ]);

    expect(result.exitCode).toBe(0);
    const payload = JSON.parse(result.stdout);
    const repoRoot = join(root, 'custom', 'repo');
    expect(payload.repoRoot).toBe(repoRoot);
    await expect(
      access(join(repoRoot, 'pjm', 'current-state.md')),
    ).resolves.toBeUndefined();
  });

  it('runs focused PJM doctor checks with JSON output', async () => {
    const root = await createWorkspace();
    tempDirs.push(root);
    await enableProjectManagement(root);
    await runCli(root, ['--json', 'pjm', 'init']);

    const result = await runCli(root, ['--json', 'pjm', 'doctor']);

    expect(result.exitCode).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload).toMatchObject({
      status: 'ok',
      repoRoot: join(root, '.oat', 'repo'),
      adoption: {
        state: 'declared',
        repoRoot: join(root, '.oat', 'repo'),
        recovery: null,
      },
      checks: expect.arrayContaining([
        expect.objectContaining({
          name: 'pjm:canonical_files',
          status: 'pass',
        }),
      ]),
    });
  });

  it('reports absent repository adoption independently of pack availability', async () => {
    const root = await createWorkspace();
    tempDirs.push(root);

    const result = await runCli(root, ['--json', 'pjm', 'doctor']);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toBe('');
    const payload = JSON.parse(result.stdout);
    expect(payload).toMatchObject({
      status: 'warn',
      repoRoot: join(root, '.oat', 'repo'),
      adoption: {
        state: 'none',
        repoRoot: join(root, '.oat', 'repo'),
        recovery: 'oat pjm init',
      },
      checks: expect.arrayContaining([
        expect.objectContaining({
          name: 'pjm:adoption',
          status: 'warn',
        }),
      ]),
    });
  });

  it('prints the bundled migration prompt without running migration', async () => {
    const root = await createWorkspace();
    tempDirs.push(root);

    const result = await runCli(
      root,
      ['pjm', 'migrate', '--print-prompt'],
      (program) => {
        program.addCommand(
          createPjmCommand({
            readPjmMigrationPrompt: async () =>
              '# OAT PJM repo-reference migration\n',
            migratePjmRepo: async () => {
              throw new Error('migration should not run');
            },
          }),
        );
      },
    );

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toContain('# OAT PJM repo-reference migration');
  });

  it('resolves adoption once and supplies it to the migration core', async () => {
    const root = await createWorkspace();
    tempDirs.push(root);
    const repoRoot = join(root, '.oat', 'repo');
    const adoption = {
      state: 'declared' as const,
      repoRoot,
      recovery: null,
    };
    let receivedAdoption: unknown;
    let resolveCalls = 0;

    const result = await runCli(
      root,
      ['--json', 'pjm', 'migrate'],
      (program) => {
        program.addCommand(
          createPjmCommand({
            resolvePjmAdoption: async () => {
              resolveCalls += 1;
              return adoption;
            },
            migratePjmRepo: async (options) => {
              receivedAdoption = options.adoption;
              return {
                repoRoot,
                status: 'dry-run',
                dryRun: true,
                actions: [],
                backlogMappings: [],
                decisionMappings: [],
                written: [],
              };
            },
          }),
        );
      },
    );

    expect(result.exitCode).toBe(0);
    expect(resolveCalls).toBe(1);
    expect(receivedAdoption).toEqual(adoption);
  });

  it('preserves JSON error output and exit code 1 when templates are missing', async () => {
    const root = await createWorkspace();
    tempDirs.push(root);
    const message =
      'Template current-state.md was not found in repo-local templates or bundled assets.';

    const result = await runCli(root, ['--json', 'pjm', 'init'], (program) => {
      program.addCommand(
        createPjmCommand({
          initializeRepoReference: async () => {
            throw new Error(message);
          },
        }),
      );
    });

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toBe('');
    expect(JSON.parse(result.stdout)).toEqual({
      status: 'error',
      message,
    });
  });
});
