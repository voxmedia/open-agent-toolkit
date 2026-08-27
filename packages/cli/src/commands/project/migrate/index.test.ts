import { execFileSync } from 'node:child_process';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { CommandContext, GlobalOptions } from '@app/command-context';
import { createLoggerCapture } from '@commands/__tests__/helpers';
import { defaultGitRunner } from '@commands/project/sync/git';
import {
  buildSyncTarget,
  migrateSharedToSynced,
} from '@commands/project/sync/ref-sync';
import { readOatLocalConfig, writeOatLocalConfig } from '@config/oat-config';
import { createSyncedFixture } from '@shared/../__tests__/synced-fixture';
import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createProjectMigrateCommand } from './index';

async function run(command: Command, args: string[]): Promise<void> {
  const program = new Command().name('oat').option('--json').exitOverride();
  const project = new Command('project');
  project.addCommand(command);
  program.addCommand(project);
  await program.parseAsync(['project', 'migrate', ...args], { from: 'user' });
}

describe('createProjectMigrateCommand', () => {
  let previousExitCode: number | undefined;
  beforeEach(() => {
    previousExitCode = process.exitCode;
    process.exitCode = undefined;
  });
  afterEach(() => {
    process.exitCode = previousExitCode;
  });

  it('rejects migration targets other than synced', async () => {
    const capture = createLoggerCapture();
    const command = createProjectMigrateCommand({
      buildCommandContext: (options: GlobalOptions): CommandContext => ({
        scope: 'project',
        dryRun: false,
        verbose: false,
        json: options.json ?? false,
        cwd: '/repo',
        home: '/home',
        interactive: false,
        logger: capture.logger,
      }),
      resolveProjectRoot: async () => '/repo',
      resolveProjectsRoot: async () => '.oat/projects/shared',
      processEnv: {},
    });
    await run(command, ['.oat/projects/shared/demo', '--to', 'shared']);
    expect(capture.error[0]).toContain('not supported in v1');
    expect(process.exitCode).toBe(1);
  });

  it('migrates a tracked shared project in exactly one parent commit', async () => {
    const fixture = await createSyncedFixture();
    try {
      const source = join(fixture.cloneA, '.oat/projects/shared/legacy');
      await mkdir(source, { recursive: true });
      await writeFile(join(source, 'state.md'), '# legacy\n', 'utf8');
      execFileSync('git', ['add', '.oat/projects/shared/legacy'], {
        cwd: fixture.cloneA,
      });
      execFileSync('git', ['commit', '-m', 'add legacy'], {
        cwd: fixture.cloneA,
      });
      await writeOatLocalConfig(fixture.cloneA, {
        version: 1,
        activeProject: '.oat/projects/shared/legacy',
      });
      const before = execFileSync('git', ['rev-parse', 'HEAD'], {
        cwd: fixture.cloneA,
        encoding: 'utf8',
      }).trim();
      const capture = createLoggerCapture();
      const command = createProjectMigrateCommand({
        buildCommandContext: (options: GlobalOptions): CommandContext => ({
          scope: 'project',
          dryRun: false,
          verbose: false,
          json: options.json ?? false,
          cwd: fixture.cloneA,
          home: '/home',
          interactive: false,
          logger: capture.logger,
        }),
        resolveProjectRoot: async () => fixture.cloneA,
        resolveProjectsRoot: async () => '.oat/projects/shared',
        processEnv: {},
        now: () => new Date('2026-08-27T12:00:00Z'),
      });

      await run(command, ['.oat/projects/shared/legacy', '--to', 'synced']);

      expect(capture.error).toEqual([]);
      expect(process.exitCode).toBe(0);
      expect(
        execFileSync('git', ['rev-list', '--count', `${before}..HEAD`], {
          cwd: fixture.cloneA,
          encoding: 'utf8',
        }).trim(),
      ).toBe('1');
      await expect(access(source)).rejects.toThrow();
      await expect(
        readFile(
          join(fixture.cloneA, '.oat/projects/synced/legacy/state.md'),
          'utf8',
        ),
      ).resolves.toBe('# legacy\n');
      expect(await readOatLocalConfig(fixture.cloneA)).toMatchObject({
        activeProject: '.oat/projects/synced/legacy',
      });
      expect(
        execFileSync(
          'git',
          ['ls-remote', 'origin', 'refs/oat/projects/legacy'],
          { cwd: fixture.cloneA, encoding: 'utf8' },
        ),
      ).toContain('refs/oat/projects/legacy');
    } finally {
      await fixture.cleanup();
    }
  });

  it('fully rolls back a failure after the branch commit and preserves unrelated staged work', async () => {
    const fixture = await createSyncedFixture();
    try {
      const source = join(fixture.cloneA, '.oat/projects/shared/rollback');
      await mkdir(source, { recursive: true });
      await writeFile(join(source, 'state.md'), '# rollback\n', 'utf8');
      execFileSync('git', ['add', '.oat/projects/shared/rollback'], {
        cwd: fixture.cloneA,
      });
      execFileSync('git', ['commit', '-m', 'add rollback source'], {
        cwd: fixture.cloneA,
      });
      await mkdir(join(fixture.cloneA, 'src'), { recursive: true });
      await writeFile(
        join(fixture.cloneA, 'src/unrelated.ts'),
        'export const unrelated = true;\n',
        'utf8',
      );
      execFileSync('git', ['add', 'src/unrelated.ts'], {
        cwd: fixture.cloneA,
      });
      const before = execFileSync('git', ['rev-parse', 'HEAD'], {
        cwd: fixture.cloneA,
        encoding: 'utf8',
      }).trim();
      const target = buildSyncTarget(
        fixture.cloneA,
        '.oat/projects/shared',
        'rollback',
      );

      await expect(
        migrateSharedToSynced(target, defaultGitRunner, {
          sourcePath: source,
          commit: true,
          now: new Date('2026-08-27T12:00:00Z'),
          afterBranchCommit: async () => {
            throw new Error('injected active pointer failure');
          },
        }),
      ).rejects.toThrow('injected active pointer failure');

      expect(
        execFileSync('git', ['rev-parse', 'HEAD'], {
          cwd: fixture.cloneA,
          encoding: 'utf8',
        }).trim(),
      ).toBe(before);
      await expect(readFile(join(source, 'state.md'), 'utf8')).resolves.toBe(
        '# rollback\n',
      );
      await expect(access(target.projectPath)).rejects.toThrow();
      await expect(
        access(join(target.syncedRoot, 'rollback.json')),
      ).rejects.toThrow();
      expect(
        execFileSync('git', ['status', '--porcelain'], {
          cwd: fixture.cloneA,
          encoding: 'utf8',
        }),
      ).toContain('A  src/unrelated.ts');
      expect(
        execFileSync('git', ['ls-remote', 'origin', target.ref], {
          cwd: fixture.cloneA,
          encoding: 'utf8',
        }).trim(),
      ).toBe('');

      await expect(
        migrateSharedToSynced(target, defaultGitRunner, {
          sourcePath: source,
          commit: true,
          now: new Date('2026-08-27T12:00:00Z'),
        }),
      ).resolves.toMatchObject({ status: 'migrated' });
    } finally {
      await fixture.cleanup();
    }
  });
});
