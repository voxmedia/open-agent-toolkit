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

import { createTemplateCommand } from './index';
import { normalizeTemplateName } from './resolve';

interface Fixture {
  assetsRoot: string;
  home: string;
  repoRoot: string;
}

const tempDirs: string[] = [];

async function createFixture(): Promise<Fixture> {
  const root = await mkdtemp(join(tmpdir(), 'oat-template-resolve-'));
  tempDirs.push(root);
  const repoRoot = join(root, 'repo');
  // `resolveProjectRoot` only needs a `.git` entry to recognize the repo.
  await mkdir(join(repoRoot, '.git'), { recursive: true });
  const home = join(root, 'home');
  await mkdir(home, { recursive: true });
  return { assetsRoot: join(root, 'assets'), home, repoRoot };
}

async function seed(path: string, content: string): Promise<void> {
  await mkdir(join(path, '..'), { recursive: true });
  await writeFile(path, content, 'utf8');
}

async function run(
  fixture: Fixture,
  args: string[],
  globalArgs: string[] = [],
): Promise<LoggerCapture> {
  const capture = createLoggerCapture();
  const program = new Command()
    .name('oat')
    .option('--json')
    .option('--verbose')
    .option('--cwd <path>')
    .exitOverride();
  program.addCommand(
    createTemplateCommand({
      buildCommandContext: (options: GlobalOptions): CommandContext => ({
        scope: 'all',
        dryRun: false,
        verbose: false,
        json: options.json ?? false,
        cwd: options.cwd ?? fixture.repoRoot,
        home: fixture.home,
        interactive: false,
        logger: capture.logger,
      }),
      resolveAssetsRoot: vi.fn(async () => fixture.assetsRoot),
    }),
  );
  await program.parseAsync([...globalArgs, 'template', 'resolve', ...args], {
    from: 'user',
  });
  return capture;
}

describe('normalizeTemplateName', () => {
  it('accepts a bare name or a .md file name', () => {
    expect(normalizeTemplateName('plan')).toBe('plan.md');
    expect(normalizeTemplateName('plan.md')).toBe('plan.md');
    expect(normalizeTemplateName('plan-lite')).toBe('plan-lite.md');
  });

  it.each(['../plan', '..', 'ideas/plan', 'ideas\\plan', '/plan.md', ''])(
    'rejects %j',
    (name) => {
      expect(() => normalizeTemplateName(name)).toThrow(
        /Invalid template name/,
      );
    },
  );
});

describe('oat template resolve', () => {
  let originalExitCode: typeof process.exitCode;

  beforeEach(() => {
    originalExitCode = process.exitCode;
    process.exitCode = undefined;
  });

  afterEach(async () => {
    process.exitCode = originalExitCode;
    await Promise.all(
      tempDirs.map((dir) => rm(dir, { recursive: true, force: true })),
    );
    tempDirs.length = 0;
  });

  it('reports the repository tier and its path in JSON', async () => {
    const fixture = await createFixture();
    const repoTemplate = join(fixture.repoRoot, '.oat', 'templates', 'plan.md');
    await seed(repoTemplate, 'repository');
    await seed(join(fixture.home, '.oat', 'templates', 'plan.md'), 'user');

    const capture = await run(fixture, ['plan'], ['--json']);

    expect(capture.jsonPayloads).toEqual([
      {
        status: 'ok',
        name: 'plan.md',
        found: true,
        tier: 'repository',
        path: repoTemplate,
        output: null,
      },
    ]);
    expect(process.exitCode).toBe(0);
  });

  it('reports the user tier with a path in human output', async () => {
    const fixture = await createFixture();
    const userTemplate = join(fixture.home, '.oat', 'templates', 'plan.md');
    await seed(userTemplate, 'user');

    const capture = await run(fixture, ['plan.md']);

    expect(capture.info).toEqual([
      'Template: plan.md',
      'Found: yes',
      'Tier: user',
      `Path: ${userTemplate}`,
    ]);
    expect(process.exitCode).toBe(0);
  });

  it('reports the bundle tier without a path', async () => {
    const fixture = await createFixture();
    await seed(join(fixture.assetsRoot, 'templates', 'plan.md'), 'bundle');

    const json = await run(fixture, ['plan'], ['--json']);
    expect(json.jsonPayloads).toEqual([
      {
        status: 'ok',
        name: 'plan.md',
        found: true,
        tier: 'bundle',
        path: null,
        output: null,
      },
    ]);

    const human = await run(fixture, ['plan']);
    expect(human.info).toContain('Tier: bundle');
    expect(human.info).toContain('Path: none (bundled with the CLI)');
    expect(human.info.join('\n')).not.toContain(fixture.assetsRoot);
  });

  it('rejects a name with a separator or parent segment', async () => {
    const fixture = await createFixture();

    const capture = await run(fixture, ['../plan'], ['--json']);

    expect(capture.jsonPayloads).toEqual([
      {
        status: 'error',
        name: '../plan',
        found: false,
        tier: null,
        path: null,
        output: null,
        message: expect.stringContaining('Invalid template name: ../plan'),
      },
    ]);
    expect(process.exitCode).toBe(1);
  });

  it('copies the resolved content to --output, replacing an existing file', async () => {
    const fixture = await createFixture();
    await seed(join(fixture.repoRoot, '.oat', 'templates', 'plan.md'), 'repo');
    const dest = join(fixture.repoRoot, 'out', 'plan.md');
    await seed(dest, 'stale content');

    const capture = await run(
      fixture,
      ['plan', '--output', 'out/plan.md'],
      ['--json'],
    );

    await expect(readFile(dest, 'utf8')).resolves.toBe('repo');
    expect(capture.jsonPayloads).toEqual([
      expect.objectContaining({
        status: 'ok',
        tier: 'repository',
        output: dest,
      }),
    ]);
    expect(process.exitCode).toBe(0);
  });

  it('does not create missing parent directories for --output', async () => {
    const fixture = await createFixture();
    await seed(join(fixture.repoRoot, '.oat', 'templates', 'plan.md'), 'repo');
    const dest = join(fixture.repoRoot, 'missing', 'dir', 'plan.md');

    const capture = await run(fixture, ['plan', '--output', dest]);

    await expect(readFile(dest, 'utf8')).rejects.toMatchObject({
      code: 'ENOENT',
    });
    expect(capture.error.join('\n')).toContain(
      `Output directory does not exist: ${join(fixture.repoRoot, 'missing', 'dir')}`,
    );
    expect(process.exitCode).toBe(1);
  });

  it('exits 1 naming the three tiers when no tier has the template', async () => {
    const fixture = await createFixture();
    await mkdir(join(fixture.assetsRoot, 'templates'), { recursive: true });

    const json = await run(fixture, ['missing'], ['--json']);
    expect(json.jsonPayloads).toEqual([
      {
        status: 'error',
        name: 'missing.md',
        found: false,
        tier: null,
        path: null,
        output: null,
        message:
          'Template missing.md was not found in repository, user, or bundled templates.',
      },
    ]);
    expect(process.exitCode).toBe(1);

    process.exitCode = undefined;
    const human = await run(fixture, ['missing']);
    const message = human.error.join('\n');
    expect(message).toBe(
      'Template missing.md was not found in repository, user, or bundled templates.',
    );
    expect(message).not.toContain(fixture.assetsRoot);
    expect(message).not.toContain('node_modules');
    expect(process.exitCode).toBe(1);
  });

  it('resolves and copies the user tier in a repository without .oat/templates (issue #296)', async () => {
    const fixture = await createFixture();
    const userTemplate = join(fixture.home, '.oat', 'templates', 'plan.md');
    await seed(userTemplate, '# User-scope plan template\n');
    await seed(join(fixture.assetsRoot, 'templates', 'plan.md'), 'bundle');
    const projectDir = join(fixture.repoRoot, '.oat', 'projects', 'p');
    await mkdir(projectDir, { recursive: true });

    const capture = await run(
      fixture,
      ['plan', '--output', join(projectDir, 'plan.md')],
      ['--json'],
    );

    expect(capture.jsonPayloads).toEqual([
      {
        status: 'ok',
        name: 'plan.md',
        found: true,
        tier: 'user',
        path: userTemplate,
        output: join(projectDir, 'plan.md'),
      },
    ]);
    await expect(readFile(join(projectDir, 'plan.md'), 'utf8')).resolves.toBe(
      '# User-scope plan template\n',
    );
    expect(process.exitCode).toBe(0);
  });
});
