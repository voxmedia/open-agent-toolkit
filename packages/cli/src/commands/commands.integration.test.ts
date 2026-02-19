import {
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createProgram } from '@app/create-program';
import { afterEach, describe, expect, it } from 'vitest';
import { registerCommands } from './index';

interface CliResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

async function createWorkspace(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'oat-cli-int-'));
  await mkdir(join(root, '.git'), { recursive: true });
  await mkdir(join(root, '.claude'), { recursive: true });
  await mkdir(join(root, '.cursor'), { recursive: true });
  await mkdir(join(root, '.codex'), { recursive: true });
  return root;
}

async function runCli(
  root: string,
  args: string[],
  globalArgs: string[] = [],
): Promise<CliResult> {
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
    await program.parseAsync(
      ['--cwd', root, '--scope', 'project', ...globalArgs, ...args],
      { from: 'user' },
    );
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

async function seedCanonical(root: string): Promise<void> {
  await mkdir(join(root, '.agents', 'skills', 'skill-one'), {
    recursive: true,
  });
  await writeFile(
    join(root, '.agents', 'skills', 'skill-one', 'SKILL.md'),
    'skill one',
    'utf8',
  );
  await mkdir(join(root, '.agents', 'agents', 'agent-one'), {
    recursive: true,
  });
  await writeFile(
    join(root, '.agents', 'agents', 'agent-one', 'AGENT.md'),
    'agent one',
    'utf8',
  );
}

async function seedValidOatSkill(
  root: string,
  skillName: string,
): Promise<void> {
  await mkdir(join(root, '.agents', 'skills', skillName), { recursive: true });
  await writeFile(
    join(root, '.agents', 'skills', skillName, 'SKILL.md'),
    [
      '---',
      `name: ${skillName}`,
      'description: Use when validating internal CLI skill checks. Provides a valid oat-* fixture for integration tests.',
      'disable-model-invocation: true',
      'user-invocable: true',
      'allowed-tools: Read, Write',
      '---',
      '',
      '# Skill',
      '',
      '## Progress Indicators (User-Facing)',
      '',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      ' OAT ▸ TEST',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      '',
      'Body',
    ].join('\n'),
    'utf8',
  );
}

async function seedProjectTemplates(root: string): Promise<void> {
  await mkdir(join(root, '.oat', 'templates'), { recursive: true });
  for (const template of [
    'state.md',
    'discovery.md',
    'spec.md',
    'design.md',
    'plan.md',
    'implementation.md',
    'project-index.md',
  ]) {
    await writeFile(
      join(root, '.oat', 'templates', template),
      [
        '---',
        'oat_template: true',
        `oat_template_name: ${template.replace('.md', '')}`,
        '---',
        '',
        `# {Project Name} ${template}`,
        'Date: YYYY-MM-DD',
      ].join('\n'),
      'utf8',
    );
  }
}

describe('CLI command integration', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tempDirs.map(async (dir) => {
        await rm(dir, { recursive: true, force: true });
      }),
    );
    tempDirs.length = 0;
  });

  it('init → status → sync → status: full workflow', async () => {
    const root = await createWorkspace();
    tempDirs.push(root);

    await runCli(root, ['init']);
    await seedCanonical(root);

    const before = await runCli(root, ['status', '--json'], ['--json']);
    expect(before.exitCode).toBe(1);
    const beforePayload = JSON.parse(before.stdout);
    expect(beforePayload.summary.missing).toBeGreaterThan(0);

    const sync = await runCli(root, ['sync', '--apply']);
    expect(sync.exitCode).toBe(0);

    const after = await runCli(root, ['status', '--json'], ['--json']);
    expect(after.exitCode).toBe(0);
    const payload = JSON.parse(after.stdout);
    expect(payload.summary.drifted).toBe(0);
    expect(payload.summary.missing).toBe(0);
    expect(payload.summary.stray).toBe(0);
    expect(payload.summary.inSync).toBeGreaterThan(0);
  });

  it('init on empty repo creates directories and empty manifest', async () => {
    const root = await createWorkspace();
    tempDirs.push(root);

    const result = await runCli(root, ['init']);
    expect(result.exitCode).toBe(0);

    await expect(lstat(join(root, '.agents', 'skills'))).resolves.toBeDefined();
    await expect(lstat(join(root, '.agents', 'agents'))).resolves.toBeDefined();
    const manifestRaw = await readFile(
      join(root, '.oat', 'sync', 'manifest.json'),
      'utf8',
    );
    const manifest = JSON.parse(manifestRaw);
    expect(manifest.entries).toEqual([]);
  });

  it('sync --apply creates symlinks for detected providers', async () => {
    const root = await createWorkspace();
    tempDirs.push(root);
    await runCli(root, ['init']);
    await seedCanonical(root);

    const result = await runCli(root, ['sync', '--apply']);
    expect(result.exitCode).toBe(0);

    const claudeSkillStat = await lstat(
      join(root, '.claude', 'skills', 'skill-one'),
    );
    const cursorSkillStat = await lstat(
      join(root, '.cursor', 'skills', 'skill-one'),
    );
    const claudeAgentStat = await lstat(
      join(root, '.claude', 'agents', 'agent-one'),
    );
    const cursorAgentStat = await lstat(
      join(root, '.cursor', 'agents', 'agent-one'),
    );

    expect(claudeSkillStat.isSymbolicLink()).toBe(true);
    expect(cursorSkillStat.isSymbolicLink()).toBe(true);
    expect(claudeAgentStat.isSymbolicLink()).toBe(true);
    expect(cursorAgentStat.isSymbolicLink()).toBe(true);
  });

  it('status --json outputs valid JSON with no prompts', async () => {
    const root = await createWorkspace();
    tempDirs.push(root);
    await runCli(root, ['init']);
    await seedCanonical(root);

    const result = await runCli(root, ['status', '--json'], ['--json']);
    expect(() => JSON.parse(result.stdout)).not.toThrow();
    expect(result.stderr).not.toContain('Adopt stray');
  });

  it('doctor on healthy setup reports all pass', async () => {
    const root = await createWorkspace();
    tempDirs.push(root);
    await runCli(root, ['init']);
    await seedCanonical(root);
    await runCli(root, ['sync', '--apply']);

    const result = await runCli(root, ['doctor', '--json'], ['--json']);
    const payload = JSON.parse(result.stdout);
    expect(
      payload.checks.every(
        (check: { status: string }) => check.status === 'pass',
      ),
    ).toBe(true);
    expect(result.exitCode).toBe(0);
  });

  it('providers list shows all registered adapters', async () => {
    const root = await createWorkspace();
    tempDirs.push(root);

    const result = await runCli(
      root,
      ['providers', 'list', '--json'],
      ['--json'],
    );
    const payload = JSON.parse(result.stdout);
    const names = payload.map((item: { name: string }) => item.name);
    expect(names).toEqual(
      expect.arrayContaining(['claude', 'cursor', 'codex']),
    );
  });

  it('providers set writes provider enablement to sync config', async () => {
    const root = await createWorkspace();
    tempDirs.push(root);

    const result = await runCli(root, [
      'providers',
      'set',
      '--enabled',
      'claude,cursor',
      '--disabled',
      'codex',
    ]);

    expect(result.exitCode).toBe(0);

    const configRaw = await readFile(
      join(root, '.oat', 'sync', 'config.json'),
      'utf8',
    );
    const config = JSON.parse(configRaw);
    expect(config.providers.claude.enabled).toBe(true);
    expect(config.providers.cursor.enabled).toBe(true);
    expect(config.providers.codex.enabled).toBe(false);
  });

  it('idempotency: init + sync twice produces same state', async () => {
    const root = await createWorkspace();
    tempDirs.push(root);
    await runCli(root, ['init']);
    await seedCanonical(root);
    await runCli(root, ['sync', '--apply']);

    const manifestPath = join(root, '.oat', 'sync', 'manifest.json');
    const before = await readFile(manifestPath, 'utf8');

    await runCli(root, ['init']);
    await runCli(root, ['sync', '--apply']);

    const after = await readFile(manifestPath, 'utf8');
    expect(after).toBe(before);
  });

  it('internal validate-oat-skills succeeds for valid oat-* skills', async () => {
    const root = await createWorkspace();
    tempDirs.push(root);
    await seedValidOatSkill(root, 'oat-sample');

    const result = await runCli(root, ['internal', 'validate-oat-skills']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('OK: validated 1 oat-* skills');
  });

  it('project new creates quick-mode scaffold artifacts', async () => {
    const root = await createWorkspace();
    tempDirs.push(root);
    await seedProjectTemplates(root);

    const result = await runCli(root, [
      'project',
      'new',
      'quick-smoke',
      '--mode',
      'quick',
      '--no-dashboard',
    ]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Created/updated OAT project: quick-smoke');
    expect(result.stdout).not.toContain('Dashboard generated: .oat/state.md');

    for (const file of [
      'state.md',
      'discovery.md',
      'plan.md',
      'implementation.md',
    ]) {
      await expect(
        readFile(
          join(root, '.oat', 'projects', 'shared', 'quick-smoke', file),
          'utf8',
        ),
      ).resolves.toContain('quick-smoke');
    }

    for (const file of ['spec.md', 'design.md']) {
      await expect(
        readFile(
          join(root, '.oat', 'projects', 'shared', 'quick-smoke', file),
          'utf8',
        ),
      ).rejects.toThrow();
    }
  });

  it('cleanup subcommands parse successfully', async () => {
    const root = await createWorkspace();
    tempDirs.push(root);

    const projectResult = await runCli(root, ['cleanup', 'project']);
    const artifactsResult = await runCli(root, ['cleanup', 'artifacts']);

    expect(projectResult.exitCode).toBe(0);
    expect(artifactsResult.exitCode).toBe(0);
  });

  it('cleanup artifacts --json emits stable contract fields', async () => {
    const root = await createWorkspace();
    tempDirs.push(root);
    await mkdir(join(root, '.oat', 'repo', 'reviews'), { recursive: true });
    await mkdir(join(root, '.oat', 'repo', 'reference', 'external-plans'), {
      recursive: true,
    });
    await writeFile(join(root, '.oat', 'repo', 'reviews', 'r1.md'), '# r1');
    await writeFile(
      join(root, '.oat', 'repo', 'reference', 'external-plans', 'p1.md'),
      '# p1',
    );

    const result = await runCli(
      root,
      ['cleanup', 'artifacts', '--json'],
      ['--json'],
    );

    expect(result.exitCode).toBe(1);
    const payload = JSON.parse(result.stdout);
    expect(payload).toEqual(
      expect.objectContaining({
        status: 'drift',
        mode: 'dry-run',
        summary: expect.any(Object),
        actions: expect.any(Array),
      }),
    );
    expect(payload.summary).toEqual(
      expect.objectContaining({
        scanned: 2,
        issuesFound: 2,
      }),
    );
    expect(payload.actions.length).toBeGreaterThan(0);
  });

  it('cleanup project --json emits stable contract fields', async () => {
    const root = await createWorkspace();
    tempDirs.push(root);
    await mkdir(join(root, '.oat', 'projects', 'shared', 'demo'), {
      recursive: true,
    });
    await writeFile(
      join(root, '.oat', 'projects', 'shared', 'demo', 'plan.md'),
      '# plan',
      'utf8',
    );

    const result = await runCli(
      root,
      ['cleanup', 'project', '--json'],
      ['--json'],
    );

    expect(result.exitCode).toBe(1);
    const payload = JSON.parse(result.stdout);
    expect(payload).toEqual(
      expect.objectContaining({
        status: 'drift',
        mode: expect.any(String),
        summary: expect.any(Object),
        actions: expect.any(Array),
      }),
    );
  });
});
