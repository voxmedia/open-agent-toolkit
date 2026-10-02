import {
  link,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readlink,
  rename,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { CommandContext, GlobalOptions } from '@app/command-context';
import { createProgram } from '@app/create-program';
import { createLoggerCapture } from '@commands/__tests__/helpers';
import type { InstructionsSyncCommandDependencies } from '@commands/instructions/instructions.types';
import { EXPECTED_CLAUDE_CONTENT } from '@commands/instructions/instructions.utils';
import { createInstructionsSyncCommand } from '@commands/instructions/sync/sync';
import { Command } from 'commander';
import { afterEach, describe, expect, it } from 'vitest';

import { registerCommands } from '../index';

interface CliResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

async function createWorkspace(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'oat-instructions-int-'));
  await mkdir(join(root, '.git'), { recursive: true });
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
    // instructions sync/validate hardcode project scope and do not accept
    // --scope; it is no longer a global option so must not be passed here.
    await program.parseAsync(['--cwd', root, ...globalArgs, ...args], {
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

describe('instructions command integration', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tempDirs.map(async (dir) => {
        await rm(dir, { recursive: true, force: true });
      }),
    );
    tempDirs.length = 0;
  });

  it('missing CLAUDE.md -> sync creates pointer -> validate passes', async () => {
    const root = await createWorkspace();
    tempDirs.push(root);

    await writeFile(join(root, 'AGENTS.md'), '# root instructions\n', 'utf8');

    const before = await runCli(
      root,
      ['instructions', 'validate', '--strategy', 'pointer', '--json'],
      ['--json'],
    );
    expect(before.exitCode).toBe(1);
    const beforePayload = JSON.parse(before.stdout);
    expect(beforePayload.summary.missing).toBe(1);

    const syncApply = await runCli(root, [
      'instructions',
      'sync',
      '--strategy',
      'pointer',
    ]);
    expect(syncApply.exitCode).toBe(0);

    await expect(lstat(join(root, 'CLAUDE.md'))).resolves.toBeDefined();
    await expect(readFile(join(root, 'CLAUDE.md'), 'utf8')).resolves.toBe(
      EXPECTED_CLAUDE_CONTENT,
    );

    const after = await runCli(
      root,
      ['instructions', 'validate', '--strategy', 'pointer', '--json'],
      ['--json'],
    );
    expect(after.exitCode).toBe(0);
    const afterPayload = JSON.parse(after.stdout);
    expect(afterPayload.status).toBe('ok');
    expect(afterPayload.summary.ok).toBe(1);
  });

  it('mismatch requires --force in dry-run and apply modes', async () => {
    const root = await createWorkspace();
    tempDirs.push(root);

    await writeFile(join(root, 'AGENTS.md'), '# root instructions\n', 'utf8');
    await writeFile(join(root, 'CLAUDE.md'), 'custom\n', 'utf8');

    const dryRun = await runCli(
      root,
      ['instructions', 'sync', '--strategy', 'pointer', '--dry-run', '--json'],
      ['--json'],
    );
    expect(dryRun.exitCode).toBe(1);
    const dryRunPayload = JSON.parse(dryRun.stdout);
    expect(dryRunPayload.mode).toBe('dry-run');
    expect(dryRunPayload.actions).toHaveLength(1);
    expect(dryRunPayload.actions[0]).toMatchObject({
      type: 'skip',
      result: 'skipped',
    });

    const applyNoForce = await runCli(
      root,
      ['instructions', 'sync', '--strategy', 'pointer', '--json'],
      ['--json'],
    );
    expect(applyNoForce.exitCode).toBe(1);
    const applyNoForcePayload = JSON.parse(applyNoForce.stdout);
    expect(applyNoForcePayload.mode).toBe('apply');
    expect(applyNoForcePayload.actions[0]).toMatchObject({
      type: 'skip',
      result: 'skipped',
    });

    const applyForce = await runCli(root, [
      'instructions',
      'sync',
      '--strategy',
      'pointer',
      '--force',
    ]);
    expect(applyForce.exitCode).toBe(0);
    await expect(readFile(join(root, 'CLAUDE.md'), 'utf8')).resolves.toBe(
      EXPECTED_CLAUDE_CONTENT,
    );
  });

  // A shim strategy with --force must never overwrite a CLAUDE.md that an
  // AGENTS.md resolves to: that CLAUDE.md holds the only copy of the
  // instructions behind the link.
  describe('--force keeps a CLAUDE.md that an AGENTS.md resolves to', () => {
    async function syncForce(
      root: string,
      strategy: 'pointer' | 'symlink' | 'copy',
      extra: string[] = [],
    ): Promise<{
      exitCode: number;
      actions: Array<{ type: string; target: string; reason: string }>;
    }> {
      const result = await runCli(
        root,
        [
          'instructions',
          'sync',
          '--strategy',
          strategy,
          '--force',
          ...extra,
          '--json',
        ],
        ['--json'],
      );
      return {
        exitCode: result.exitCode,
        actions: JSON.parse(result.stdout).actions,
      };
    }

    function expectKept(
      actions: Array<{ type: string; target: string; reason: string }>,
      claudePath: string,
      linker: string,
    ): void {
      const action = actions.find(
        (candidate) => candidate.target === claudePath,
      );
      expect(action).toMatchObject({ type: 'skip', result: 'skipped' });
      expect(action?.reason).toContain(`${linker} resolves to this CLAUDE.md`);
      expect(action?.reason).toMatch(/; kept$/);
    }

    for (const strategy of ['pointer', 'symlink'] as const) {
      it(`keeps the CLAUDE.md behind AGENTS.md -> CLAUDE.md under --strategy ${strategy}`, async () => {
        const root = await createWorkspace();
        tempDirs.push(root);
        await writeFile(join(root, 'CLAUDE.md'), '# real instructions\n');
        await symlink('CLAUDE.md', join(root, 'AGENTS.md'));

        const dryRun = await syncForce(root, strategy, ['--dry-run']);
        expectKept(dryRun.actions, join(root, 'CLAUDE.md'), 'AGENTS.md');

        const apply = await syncForce(root, strategy);
        expect(apply.exitCode).toBe(1);
        expectKept(apply.actions, join(root, 'CLAUDE.md'), 'AGENTS.md');
        expect((await lstat(join(root, 'CLAUDE.md'))).isFile()).toBe(true);
        await expect(readFile(join(root, 'AGENTS.md'), 'utf8')).resolves.toBe(
          '# real instructions\n',
        );
      });
    }

    it('keeps the CLAUDE.md at the end of a symlink chain', async () => {
      const root = await createWorkspace();
      tempDirs.push(root);
      await mkdir(join(root, 'docs'), { recursive: true });
      await writeFile(join(root, 'CLAUDE.md'), '# real instructions\n');
      await symlink('../CLAUDE.md', join(root, 'docs', 'instructions.md'));
      await symlink('docs/instructions.md', join(root, 'AGENTS.md'));

      const apply = await syncForce(root, 'pointer');
      expect(apply.exitCode).toBe(1);
      expectKept(apply.actions, join(root, 'CLAUDE.md'), 'AGENTS.md');
      await expect(readFile(join(root, 'AGENTS.md'), 'utf8')).resolves.toBe(
        '# real instructions\n',
      );
    });

    it('keeps a CLAUDE.md that is a hard link of AGENTS.md', async () => {
      const root = await createWorkspace();
      tempDirs.push(root);
      await writeFile(join(root, 'CLAUDE.md'), '# shared inode\n');
      await link(join(root, 'CLAUDE.md'), join(root, 'AGENTS.md'));

      const apply = await syncForce(root, 'pointer');
      expect(apply.exitCode).toBe(1);
      expectKept(apply.actions, join(root, 'CLAUDE.md'), 'AGENTS.md');
      await expect(readFile(join(root, 'CLAUDE.md'), 'utf8')).resolves.toBe(
        '# shared inode\n',
      );
    });

    it('keeps a CLAUDE.md that an AGENTS.md in another directory links to', async () => {
      const root = await createWorkspace();
      tempDirs.push(root);
      await mkdir(join(root, 'pkg'), { recursive: true });
      await writeFile(join(root, 'AGENTS.md'), '# root instructions\n');
      await writeFile(join(root, 'CLAUDE.md'), '# hand-written\n');
      await symlink('../CLAUDE.md', join(root, 'pkg', 'AGENTS.md'));

      const apply = await syncForce(root, 'pointer');
      expectKept(apply.actions, join(root, 'CLAUDE.md'), 'pkg/AGENTS.md');
      await expect(
        readFile(join(root, 'pkg', 'AGENTS.md'), 'utf8'),
      ).resolves.toBe('# hand-written\n');
    });

    // A symlinked AGENTS.md whose endpoint is a hard link of CLAUDE.md: the
    // realpaths differ, so only the endpoint's device and inode show the link.
    for (const strategy of ['pointer', 'symlink', 'copy'] as const) {
      it(`keeps a CLAUDE.md that a symlinked AGENTS.md reaches through a hard link under --strategy ${strategy}`, async () => {
        const root = await createWorkspace();
        tempDirs.push(root);
        await mkdir(join(root, 'pkg'), { recursive: true });
        await writeFile(join(root, 'AGENTS.md'), '# root instructions\n');
        await writeFile(join(root, 'CLAUDE.md'), '# shared instructions\n');
        await link(join(root, 'CLAUDE.md'), join(root, 'alias.md'));
        await symlink('../alias.md', join(root, 'pkg', 'AGENTS.md'));
        const before = await lstat(join(root, 'CLAUDE.md'));

        const apply = await syncForce(root, strategy);
        expectKept(apply.actions, join(root, 'CLAUDE.md'), 'pkg/AGENTS.md');
        const after = await lstat(join(root, 'CLAUDE.md'));
        expect(after.isFile()).toBe(true);
        expect(after.ino).toBe(before.ino);
        await expect(readFile(join(root, 'CLAUDE.md'), 'utf8')).resolves.toBe(
          '# shared instructions\n',
        );
      });
    }

    it('still overwrites a CLAUDE.md that no AGENTS.md resolves to', async () => {
      const root = await createWorkspace();
      tempDirs.push(root);
      await mkdir(join(root, 'pkg'), { recursive: true });
      await writeFile(join(root, 'AGENTS.md'), '# root instructions\n');
      await writeFile(join(root, 'CLAUDE.md'), '# hand-written\n');
      // The reverse shape: CLAUDE.md links to a regular AGENTS.md.
      await writeFile(join(root, 'pkg', 'AGENTS.md'), '# pkg instructions\n');
      await symlink('AGENTS.md', join(root, 'pkg', 'CLAUDE.md'));

      const apply = await syncForce(root, 'pointer');
      expect(apply.exitCode).toBe(0);
      expect(apply.actions.map((action) => action.type)).toEqual([
        'update',
        'update',
      ]);
      for (const directory of ['.', 'pkg']) {
        await expect(
          readFile(join(root, directory, 'CLAUDE.md'), 'utf8'),
        ).resolves.toBe(EXPECTED_CLAUDE_CONTENT);
      }
      await expect(
        readFile(join(root, 'pkg', 'AGENTS.md'), 'utf8'),
      ).resolves.toBe('# pkg instructions\n');
    });
  });

  it('discovers nested AGENTS.md and excludes node_modules', async () => {
    const root = await createWorkspace();
    tempDirs.push(root);

    await mkdir(join(root, 'packages', 'foo'), { recursive: true });
    await mkdir(join(root, 'packages', 'foo', 'node_modules', 'dep'), {
      recursive: true,
    });

    await writeFile(
      join(root, 'packages', 'foo', 'AGENTS.md'),
      '# include\n',
      'utf8',
    );
    await writeFile(
      join(root, 'packages', 'foo', 'node_modules', 'dep', 'AGENTS.md'),
      '# exclude\n',
      'utf8',
    );

    const result = await runCli(
      root,
      ['instructions', 'validate', '--strategy', 'pointer', '--json'],
      ['--json'],
    );
    expect(result.exitCode).toBe(1);

    const payload = JSON.parse(result.stdout);
    expect(payload.summary.scanned).toBe(1);
    expect(payload.entries[0].agentsPath).toContain('packages/foo/AGENTS.md');
  });

  it('accepts CRLF pointer content', async () => {
    const root = await createWorkspace();
    tempDirs.push(root);

    await writeFile(join(root, 'AGENTS.md'), '# root\n', 'utf8');
    await writeFile(join(root, 'CLAUDE.md'), '@AGENTS.md\r\n', 'utf8');

    const result = await runCli(
      root,
      ['instructions', 'validate', '--strategy', 'pointer', '--json'],
      ['--json'],
    );

    expect(result.exitCode).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload.status).toBe('ok');
  });

  it('skips directory symlink cycles while scanning', async () => {
    const root = await createWorkspace();
    tempDirs.push(root);

    await mkdir(join(root, 'pkg'), { recursive: true });
    await writeFile(join(root, 'pkg', 'AGENTS.md'), '# pkg\n', 'utf8');
    await symlink(root, join(root, 'loop')); // directory symlink back to root

    const result = await runCli(
      root,
      ['instructions', 'validate', '--strategy', 'pointer', '--json'],
      ['--json'],
    );

    expect(result.exitCode).toBe(1);
    const payload = JSON.parse(result.stdout);
    expect(payload.summary.scanned).toBe(1);
  });

  it('adopts stray CLAUDE.md into AGENTS.md and rewrites Claude as a pointer', async () => {
    const root = await createWorkspace();
    tempDirs.push(root);

    await mkdir(join(root, 'docs'), { recursive: true });
    await writeFile(
      join(root, 'docs', 'CLAUDE.md'),
      '# stray claude instructions\n',
      'utf8',
    );

    const before = await runCli(
      root,
      ['instructions', 'validate', '--strategy', 'pointer', '--json'],
      ['--json'],
    );
    expect(before.exitCode).toBe(1);
    const beforePayload = JSON.parse(before.stdout);
    expect(beforePayload.summary.stray).toBe(1);

    const syncApply = await runCli(root, [
      'instructions',
      'sync',
      '--strategy',
      'pointer',
    ]);
    expect(syncApply.exitCode).toBe(0);

    await expect(
      readFile(join(root, 'docs', 'AGENTS.md'), 'utf8'),
    ).resolves.toBe('# stray claude instructions\n');
    await expect(
      readFile(join(root, 'docs', 'CLAUDE.md'), 'utf8'),
    ).resolves.toBe(EXPECTED_CLAUDE_CONTENT);

    const after = await runCli(
      root,
      ['instructions', 'validate', '--strategy', 'pointer', '--json'],
      ['--json'],
    );
    expect(after.exitCode).toBe(0);
    const afterPayload = JSON.parse(after.stdout);
    expect(afterPayload.status).toBe('ok');
  });

  it('adopts stray CLAUDE.md into AGENTS.md and rewrites Claude as a symlink', async () => {
    const root = await createWorkspace();
    tempDirs.push(root);

    await mkdir(join(root, 'docs'), { recursive: true });
    await writeFile(
      join(root, 'docs', 'CLAUDE.md'),
      '# stray claude instructions\n',
      'utf8',
    );

    const syncApply = await runCli(root, [
      'instructions',
      'sync',
      '--strategy',
      'symlink',
    ]);
    expect(syncApply.exitCode).toBe(0);

    await expect(
      readFile(join(root, 'docs', 'AGENTS.md'), 'utf8'),
    ).resolves.toBe('# stray claude instructions\n');
    await expect(lstat(join(root, 'docs', 'CLAUDE.md'))).resolves.toMatchObject(
      {
        isSymbolicLink: expect.any(Function),
      },
    );
    expect(
      (await lstat(join(root, 'docs', 'CLAUDE.md'))).isSymbolicLink(),
    ).toBe(true);

    const validate = await runCli(
      root,
      ['instructions', 'validate', '--strategy', 'symlink', '--json'],
      ['--json'],
    );
    expect(validate.exitCode).toBe(0);
    const payload = JSON.parse(validate.stdout);
    expect(payload.status).toBe('ok');
  });

  it('adopts stray CLAUDE.md into AGENTS.md and rewrites Claude as a hard copy', async () => {
    const root = await createWorkspace();
    tempDirs.push(root);

    await mkdir(join(root, 'docs'), { recursive: true });
    await writeFile(
      join(root, 'docs', 'CLAUDE.md'),
      '# stray claude instructions\n',
      'utf8',
    );

    const syncApply = await runCli(root, [
      'instructions',
      'sync',
      '--strategy',
      'copy',
    ]);
    expect(syncApply.exitCode).toBe(0);

    await expect(
      readFile(join(root, 'docs', 'AGENTS.md'), 'utf8'),
    ).resolves.toBe('# stray claude instructions\n');
    await expect(
      readFile(join(root, 'docs', 'CLAUDE.md'), 'utf8'),
    ).resolves.toBe('# stray claude instructions\n');
    expect(
      (await lstat(join(root, 'docs', 'CLAUDE.md'))).isSymbolicLink(),
    ).toBe(false);

    const validate = await runCli(
      root,
      ['instructions', 'validate', '--strategy', 'copy', '--json'],
      ['--json'],
    );
    expect(validate.exitCode).toBe(0);
    const payload = JSON.parse(validate.stdout);
    expect(payload.status).toBe('ok');
  });

  it('syncs a nested mixed-state project tree while excluding node_modules', async () => {
    const root = await createWorkspace();
    tempDirs.push(root);

    await mkdir(join(root, 'packages', 'valid', 'deep'), { recursive: true });
    await mkdir(join(root, 'packages', 'missing'), { recursive: true });
    await mkdir(join(root, 'packages', 'mismatch'), { recursive: true });
    await mkdir(join(root, 'packages', 'stray', 'nested'), { recursive: true });
    await mkdir(join(root, 'packages', 'ignored', 'node_modules', 'dep'), {
      recursive: true,
    });

    await writeFile(join(root, 'AGENTS.md'), '# root\n', 'utf8');
    await writeFile(join(root, 'CLAUDE.md'), EXPECTED_CLAUDE_CONTENT, 'utf8');

    await writeFile(
      join(root, 'packages', 'valid', 'deep', 'AGENTS.md'),
      '# valid\n',
      'utf8',
    );
    await writeFile(
      join(root, 'packages', 'valid', 'deep', 'CLAUDE.md'),
      EXPECTED_CLAUDE_CONTENT,
      'utf8',
    );

    await writeFile(
      join(root, 'packages', 'missing', 'AGENTS.md'),
      '# missing\n',
      'utf8',
    );

    await writeFile(
      join(root, 'packages', 'mismatch', 'AGENTS.md'),
      '# mismatch\n',
      'utf8',
    );
    await writeFile(
      join(root, 'packages', 'mismatch', 'CLAUDE.md'),
      'custom mismatch\n',
      'utf8',
    );

    await writeFile(
      join(root, 'packages', 'stray', 'nested', 'CLAUDE.md'),
      '# stray nested\n',
      'utf8',
    );

    await writeFile(
      join(root, 'packages', 'ignored', 'node_modules', 'dep', 'AGENTS.md'),
      '# ignored\n',
      'utf8',
    );

    const before = await runCli(
      root,
      ['instructions', 'validate', '--strategy', 'pointer', '--json'],
      ['--json'],
    );
    expect(before.exitCode).toBe(1);
    const beforePayload = JSON.parse(before.stdout);
    expect(beforePayload.summary).toMatchObject({
      scanned: 5,
      ok: 2,
      missing: 1,
      contentMismatch: 1,
      stray: 1,
    });

    const apply = await runCli(root, [
      'instructions',
      'sync',
      '--strategy',
      'pointer',
      '--force',
    ]);
    expect(apply.exitCode).toBe(0);

    await expect(
      readFile(join(root, 'packages', 'missing', 'CLAUDE.md'), 'utf8'),
    ).resolves.toBe(EXPECTED_CLAUDE_CONTENT);
    await expect(
      readFile(join(root, 'packages', 'mismatch', 'CLAUDE.md'), 'utf8'),
    ).resolves.toBe(EXPECTED_CLAUDE_CONTENT);
    await expect(
      readFile(join(root, 'packages', 'stray', 'nested', 'AGENTS.md'), 'utf8'),
    ).resolves.toBe('# stray nested\n');
    await expect(
      readFile(join(root, 'packages', 'stray', 'nested', 'CLAUDE.md'), 'utf8'),
    ).resolves.toBe(EXPECTED_CLAUDE_CONTENT);
    await expect(
      readFile(
        join(root, 'packages', 'ignored', 'node_modules', 'dep', 'AGENTS.md'),
        'utf8',
      ),
    ).resolves.toBe('# ignored\n');

    const after = await runCli(
      root,
      ['instructions', 'validate', '--strategy', 'pointer', '--json'],
      ['--json'],
    );
    expect(after.exitCode).toBe(0);
    const afterPayload = JSON.parse(after.stdout);
    expect(afterPayload.summary).toMatchObject({
      scanned: 5,
      ok: 5,
      missing: 0,
      contentMismatch: 0,
      stray: 0,
    });
  });

  for (const strategy of ['pointer', 'symlink', 'copy'] as const) {
    it(`sync --dry-run plans CLAUDE.md creations for .oat/repo instruction files (${strategy})`, async () => {
      const root = await createWorkspace();
      tempDirs.push(root);

      await mkdir(join(root, '.oat', 'repo', 'pjm'), { recursive: true });
      await mkdir(join(root, '.oat', 'templates'), { recursive: true });
      await writeFile(
        join(root, '.oat', 'repo', 'AGENTS.md'),
        '# repo instructions\n',
        'utf8',
      );
      await writeFile(
        join(root, '.oat', 'repo', 'pjm', 'AGENTS.md'),
        '# repo pjm instructions\n',
        'utf8',
      );
      await writeFile(
        join(root, '.oat', 'templates', 'AGENTS.md'),
        '# ignored\n',
        'utf8',
      );

      const dryRun = await runCli(
        root,
        ['instructions', 'sync', '--dry-run', '--strategy', strategy, '--json'],
        ['--json'],
      );

      // Planned creations are not drift-blocking (only skipped actions exit 1),
      // so a dry-run that merely lists new pointers exits 0.
      expect(dryRun.exitCode).toBe(0);
      const payload = JSON.parse(dryRun.stdout);
      expect(payload.mode).toBe('dry-run');

      const plannedCreateTargets = payload.actions
        .filter(
          (action: { type: string; result: string }) =>
            action.type === 'create' && action.result === 'planned',
        )
        .map((action: { target: string }) => action.target);

      expect(
        plannedCreateTargets.some((target: string) =>
          target.endsWith(join('.oat', 'repo', 'CLAUDE.md')),
        ),
      ).toBe(true);
      expect(
        plannedCreateTargets.some((target: string) =>
          target.endsWith(join('.oat', 'repo', 'pjm', 'CLAUDE.md')),
        ),
      ).toBe(true);

      // The rest of .oat stays excluded — no action touches .oat/templates.
      expect(
        payload.actions.some((action: { target: string }) =>
          action.target.includes(join('.oat', 'templates')),
        ),
      ).toBe(false);

      // dry-run never writes.
      await expect(
        lstat(join(root, '.oat', 'repo', 'CLAUDE.md')),
      ).rejects.toThrow();
    });
  }

  it('validate reports drift for a hand-edited .oat/repo CLAUDE.md', async () => {
    const root = await createWorkspace();
    tempDirs.push(root);

    await mkdir(join(root, '.oat', 'repo', 'pjm'), { recursive: true });
    await writeFile(
      join(root, '.oat', 'repo', 'pjm', 'AGENTS.md'),
      '# repo pjm instructions\n',
      'utf8',
    );
    await writeFile(
      join(root, '.oat', 'repo', 'pjm', 'CLAUDE.md'),
      '# hand-edited drift\n',
      'utf8',
    );

    const result = await runCli(
      root,
      ['instructions', 'validate', '--strategy', 'pointer', '--json'],
      ['--json'],
    );

    expect(result.exitCode).toBe(1);
    const payload = JSON.parse(result.stdout);
    expect(payload.status).toBe('drift');
    expect(payload.summary.scanned).toBe(1);
    expect(payload.summary.contentMismatch).toBe(1);
    expect(payload.entries[0].agentsPath).toContain(
      join('.oat', 'repo', 'pjm', 'AGENTS.md'),
    );
    expect(payload.entries[0].status).toBe('content_mismatch');
  });

  describe('documentation content root exclusion', () => {
    async function pathExists(candidate: string): Promise<boolean> {
      try {
        await lstat(candidate);
        return true;
      } catch {
        return false;
      }
    }

    async function writeDocumentationConfig(
      root: string,
      {
        claudeExcludes,
        ...documentation
      }: { root?: string; tooling?: string; claudeExcludes?: unknown },
    ): Promise<void> {
      await mkdir(join(root, '.oat'), { recursive: true });
      await writeFile(
        join(root, '.oat', 'config.json'),
        JSON.stringify(
          {
            version: 1,
            documentation,
            ...(claudeExcludes === undefined
              ? {}
              : { instructions: { claude: { excludes: claudeExcludes } } }),
          },
          null,
          2,
        ),
        'utf8',
      );
    }

    async function seedRepoCarveIn(root: string): Promise<void> {
      await mkdir(join(root, '.oat', 'repo'), { recursive: true });
      await writeFile(
        join(root, '.oat', 'repo', 'AGENTS.md'),
        '# repo instructions\n',
        'utf8',
      );
    }

    it.each(['docs', 'handbook'])(
      'excludes the entire Markdown root %s, including local guidance and nested docs',
      async (contentRoot) => {
        const root = await createWorkspace();
        tempDirs.push(root);
        await seedRepoCarveIn(root);
        await writeDocumentationConfig(root, {
          root: contentRoot,
          tooling: 'markdown',
        });
        const local =
          '# Local documentation instructions\n\nKeep authored context.\n';
        const existingClaude = '# Local Claude documentation guidance\n';
        for (const part of ['', 'guides', 'docs']) {
          const directory = join(root, contentRoot, part);
          await mkdir(directory, { recursive: true });
          await writeFile(join(directory, 'AGENTS.md'), local);
        }
        await writeFile(join(root, contentRoot, 'CLAUDE.md'), existingClaude);

        const synced = await runCli(
          root,
          ['instructions', 'sync', '--strategy', 'pointer', '--json'],
          ['--json'],
        );
        const payload = JSON.parse(synced.stdout);
        expect(payload.excludedPaths).toEqual([contentRoot]);
        expect(synced.exitCode).toBe(0);
        expect(
          payload.actions.some((action: { target: string }) =>
            action.target.includes(join(root, contentRoot)),
          ),
        ).toBe(false);
        for (const part of ['', 'guides', 'docs']) {
          await expect(
            readFile(join(root, contentRoot, part, 'AGENTS.md'), 'utf8'),
          ).resolves.toBe(local);
        }
        await expect(
          readFile(join(root, contentRoot, 'CLAUDE.md'), 'utf8'),
        ).resolves.toBe(existingClaude);
        for (const part of ['guides', 'docs']) {
          await expect(
            pathExists(join(root, contentRoot, part, 'CLAUDE.md')),
          ).resolves.toBe(false);
        }
        const validated = await runCli(
          root,
          ['instructions', 'validate', '--strategy', 'pointer', '--json'],
          ['--json'],
        );
        expect(validated.exitCode).toBe(0);
        expect(JSON.parse(validated.stdout).excludedPaths).toEqual([
          contentRoot,
        ]);
        expect(
          JSON.parse(validated.stdout).entries.some(
            (entry: { agentsPath: string }) =>
              entry.agentsPath.includes(join(root, contentRoot)),
          ),
        ).toBe(false);
      },
    );

    it('(a) skips the docs child while still pointing the app root, idempotently', async () => {
      const root = await createWorkspace();
      tempDirs.push(root);

      await mkdir(join(root, 'apps', 'oat-docs', 'docs', 'guides'), {
        recursive: true,
      });
      await seedRepoCarveIn(root);
      await writeDocumentationConfig(root, { root: 'apps/oat-docs' });

      await writeFile(
        join(root, 'apps', 'oat-docs', 'AGENTS.md'),
        '# docs app instructions\n',
        'utf8',
      );
      await writeFile(
        join(root, 'apps', 'oat-docs', 'docs', 'AGENTS.md'),
        '# docs landing page\n',
        'utf8',
      );
      await writeFile(
        join(root, 'apps', 'oat-docs', 'docs', 'guides', 'AGENTS.md'),
        '# nested docs page\n',
        'utf8',
      );

      const first = await runCli(
        root,
        ['instructions', 'sync', '--strategy', 'pointer', '--json'],
        ['--json'],
      );
      expect(first.exitCode).toBe(0);

      // The app-level instruction file is not a documentation page.
      await expect(
        readFile(join(root, 'apps', 'oat-docs', 'CLAUDE.md'), 'utf8'),
      ).resolves.toBe(EXPECTED_CLAUDE_CONTENT);
      // The content tree stays pointer-free.
      await expect(
        pathExists(join(root, 'apps', 'oat-docs', 'docs', 'CLAUDE.md')),
      ).resolves.toBe(false);
      await expect(
        pathExists(
          join(root, 'apps', 'oat-docs', 'docs', 'guides', 'CLAUDE.md'),
        ),
      ).resolves.toBe(false);
      // Excluding a documentation root never strands the carve-in.
      await expect(
        readFile(join(root, '.oat', 'repo', 'CLAUDE.md'), 'utf8'),
      ).resolves.toBe(EXPECTED_CLAUDE_CONTENT);

      const firstPayload = JSON.parse(first.stdout);
      expect(firstPayload.excludedPaths).toEqual(['apps/oat-docs/docs']);

      const second = await runCli(
        root,
        ['instructions', 'sync', '--strategy', 'pointer', '--json'],
        ['--json'],
      );
      expect(second.exitCode).toBe(0);
      const secondPayload = JSON.parse(second.stdout);
      expect(secondPayload.status).toBe('ok');
      expect(secondPayload.summary.created).toBe(0);
      expect(secondPayload.actions).toEqual([]);

      // Validate agrees with sync on the same tree.
      const validated = await runCli(
        root,
        ['instructions', 'validate', '--strategy', 'pointer', '--json'],
        ['--json'],
      );
      expect(validated.exitCode).toBe(0);
      expect(JSON.parse(validated.stdout).status).toBe('ok');
    });

    it('(b) excludes the whole root when it has no docs child, idempotently', async () => {
      const root = await createWorkspace();
      tempDirs.push(root);

      await mkdir(join(root, 'content', 'guides'), { recursive: true });
      await mkdir(join(root, 'packages', 'app'), { recursive: true });
      await seedRepoCarveIn(root);
      await writeDocumentationConfig(root, { root: 'content' });

      await writeFile(
        join(root, 'content', 'AGENTS.md'),
        '# content landing page\n',
        'utf8',
      );
      await writeFile(
        join(root, 'content', 'guides', 'AGENTS.md'),
        '# nested content page\n',
        'utf8',
      );
      await writeFile(
        join(root, 'packages', 'app', 'AGENTS.md'),
        '# app instructions\n',
        'utf8',
      );

      const first = await runCli(
        root,
        ['instructions', 'sync', '--strategy', 'pointer', '--json'],
        ['--json'],
      );
      expect(first.exitCode).toBe(0);

      await expect(
        pathExists(join(root, 'content', 'CLAUDE.md')),
      ).resolves.toBe(false);
      await expect(
        pathExists(join(root, 'content', 'guides', 'CLAUDE.md')),
      ).resolves.toBe(false);
      await expect(
        readFile(join(root, 'packages', 'app', 'CLAUDE.md'), 'utf8'),
      ).resolves.toBe(EXPECTED_CLAUDE_CONTENT);
      await expect(
        readFile(join(root, '.oat', 'repo', 'CLAUDE.md'), 'utf8'),
      ).resolves.toBe(EXPECTED_CLAUDE_CONTENT);

      expect(JSON.parse(first.stdout).excludedPaths).toEqual(['content']);

      const second = await runCli(
        root,
        ['instructions', 'sync', '--strategy', 'pointer', '--json'],
        ['--json'],
      );
      expect(second.exitCode).toBe(0);
      const secondPayload = JSON.parse(second.stdout);
      expect(secondPayload.status).toBe('ok');
      expect(secondPayload.summary.created).toBe(0);
      expect(secondPayload.actions).toEqual([]);

      const validated = await runCli(
        root,
        ['instructions', 'validate', '--strategy', 'pointer', '--json'],
        ['--json'],
      );
      expect(validated.exitCode).toBe(0);
      expect(JSON.parse(validated.stdout).status).toBe('ok');
    });

    it('honors an explicit opt-out that includes the docs app root', async () => {
      const root = await createWorkspace();
      tempDirs.push(root);

      await mkdir(join(root, 'apps', 'oat-docs', 'docs'), { recursive: true });
      await mkdir(join(root, 'vendor'), { recursive: true });
      await seedRepoCarveIn(root);
      await writeDocumentationConfig(root, {
        root: 'apps/oat-docs',
        claudeExcludes: ['apps/oat-docs', 'vendor'],
      });

      await writeFile(
        join(root, 'apps', 'oat-docs', 'AGENTS.md'),
        '# docs app instructions\n',
        'utf8',
      );
      await writeFile(
        join(root, 'apps', 'oat-docs', 'docs', 'AGENTS.md'),
        '# docs landing page\n',
        'utf8',
      );
      await writeFile(
        join(root, 'vendor', 'AGENTS.md'),
        '# vendored\n',
        'utf8',
      );

      const result = await runCli(
        root,
        ['instructions', 'sync', '--strategy', 'pointer', '--json'],
        ['--json'],
      );
      expect(result.exitCode).toBe(0);

      await expect(
        pathExists(join(root, 'apps', 'oat-docs', 'CLAUDE.md')),
      ).resolves.toBe(false);
      await expect(pathExists(join(root, 'vendor', 'CLAUDE.md'))).resolves.toBe(
        false,
      );
      await expect(
        readFile(join(root, '.oat', 'repo', 'CLAUDE.md'), 'utf8'),
      ).resolves.toBe(EXPECTED_CLAUDE_CONTENT);

      expect(JSON.parse(result.stdout).excludedPaths).toEqual([
        'apps/oat-docs/docs',
        'apps/oat-docs',
        'vendor',
      ]);
    });

    it('does not report an inert exclusion as protection', async () => {
      const root = await createWorkspace();
      tempDirs.push(root);

      await mkdir(join(root, 'apps', 'docsapp', 'docs', 'guide'), {
        recursive: true,
      });
      await seedRepoCarveIn(root);
      // `Apps/Docsapp` resolves on a case-insensitive filesystem but the scan
      // compares the real on-disk case, so this exclusion protects nothing.
      // The pre-fix payload claimed it was applied while the page below
      // reverted to `missing` -- issue #238 recurring behind a false report.
      await writeDocumentationConfig(root, {
        root: 'Apps/Docsapp',
        claudeExcludes: ['nonexistent-dir', '/etc'],
      });

      await writeFile(
        join(root, 'apps', 'docsapp', 'docs', 'guide', 'AGENTS.md'),
        '# docs page\n',
        'utf8',
      );

      const result = await runCli(
        root,
        ['instructions', 'validate', '--strategy', 'pointer', '--json'],
        ['--json'],
      );

      const payload = JSON.parse(result.stdout);
      // Whatever the configured list says, nothing is claimed as effective.
      expect(payload.effectiveExcludedPaths).toEqual([]);
      const guide = payload.entries.find((entry: { agentsPath: string }) =>
        entry.agentsPath?.includes('docs/guide'),
      );
      // The page really is still scanned; the payload no longer contradicts it.
      expect(guide).toBeDefined();
    });

    it('reports effective exclusions when the configuration is correct', async () => {
      const root = await createWorkspace();
      tempDirs.push(root);

      await mkdir(join(root, 'apps', 'docsapp', 'docs'), { recursive: true });
      await mkdir(join(root, 'vendor'), { recursive: true });
      await seedRepoCarveIn(root);
      await writeDocumentationConfig(root, {
        root: 'apps/docsapp',
        claudeExcludes: ['vendor'],
      });

      await writeFile(
        join(root, 'apps', 'docsapp', 'docs', 'AGENTS.md'),
        '# docs page\n',
        'utf8',
      );
      await writeFile(
        join(root, 'vendor', 'AGENTS.md'),
        '# vendored\n',
        'utf8',
      );

      const result = await runCli(
        root,
        ['instructions', 'validate', '--strategy', 'pointer', '--json'],
        ['--json'],
      );

      const payload = JSON.parse(result.stdout);
      expect(payload.excludedPaths).toEqual(['apps/docsapp/docs', 'vendor']);
      expect(payload.effectiveExcludedPaths).toEqual([
        'apps/docsapp/docs',
        'vendor',
      ]);
      expect(payload).not.toHaveProperty('exclusionWarnings');

      // The report is only worth anything if the trees really were pruned.
      const scanned = payload.entries.map(
        (entry: { agentsPath: string }) => entry.agentsPath,
      );
      expect(
        scanned.some((path: string) => path.includes('docsapp/docs')),
      ).toBe(false);
      expect(scanned.some((path: string) => path.includes('vendor'))).toBe(
        false,
      );
      // ...and that the carve-in still is not.
      expect(scanned.some((path: string) => path.includes('.oat/repo'))).toBe(
        true,
      );
    });

    it('surfaces inert exclusions to --json consumers, where warnings are suppressed', async () => {
      const root = await createWorkspace();
      tempDirs.push(root);

      await seedRepoCarveIn(root);
      // Absolute entries are rejected during normalization, so they reach
      // neither excludedPaths nor effectiveExcludedPaths. Without
      // exclusionWarnings a --json consumer would see no trace of them at all.
      await writeDocumentationConfig(root, {
        claudeExcludes: ['/etc'],
      });

      const result = await runCli(
        root,
        ['instructions', 'validate', '--strategy', 'pointer', '--json'],
        ['--json'],
      );

      const payload = JSON.parse(result.stdout);
      expect(payload).not.toHaveProperty('excludedPaths');
      expect(payload.exclusionWarnings).toHaveLength(1);
      expect(payload.exclusionWarnings[0]).toContain('/etc');
    });

    it('fails closed on a malformed opt-out list instead of syncing anyway', async () => {
      const root = await createWorkspace();
      tempDirs.push(root);

      await mkdir(join(root, 'apps', 'oat-docs', 'docs'), { recursive: true });
      await writeDocumentationConfig(root, {
        root: 'apps/oat-docs',
        // A typo'd opt-out must not degrade into "no extra exclusions" and
        // quietly write pointers the operator believed were suppressed.
        claudeExcludes: 'vendor',
      });

      await writeFile(join(root, 'AGENTS.md'), '# root instructions\n', 'utf8');

      const result = await runCli(root, ['instructions', 'sync']);

      expect(result.exitCode).toBe(2);
      expect(result.stderr + result.stdout).toContain(
        'Invalid instructions.claude.excludes',
      );
      // Nothing was written: the command aborted before scanning.
      await expect(pathExists(join(root, 'CLAUDE.md'))).resolves.toBe(false);
    });

    it('fails closed on a malformed opt-out list during validate too', async () => {
      const root = await createWorkspace();
      tempDirs.push(root);

      await writeDocumentationConfig(root, {
        claudeExcludes: ['vendor', ''],
      });
      await writeFile(join(root, 'AGENTS.md'), '# root instructions\n', 'utf8');

      const result = await runCli(root, ['instructions', 'validate']);

      expect(result.exitCode).toBe(2);
      expect(result.stderr + result.stdout).toContain(
        'Invalid instructions.claude.excludes',
      );
    });

    it('leaves an existing pointer inside an excluded tree untouched', async () => {
      const root = await createWorkspace();
      tempDirs.push(root);

      await mkdir(join(root, 'apps', 'oat-docs', 'docs'), { recursive: true });
      await writeDocumentationConfig(root, { root: 'apps/oat-docs' });

      await writeFile(
        join(root, 'apps', 'oat-docs', 'docs', 'AGENTS.md'),
        '# docs landing page\n',
        'utf8',
      );
      // A legitimate content file that a naive deletion sweep would destroy.
      await writeFile(
        join(root, 'apps', 'oat-docs', 'docs', 'CLAUDE.md'),
        '# a documentation page about CLAUDE.md\n',
        'utf8',
      );

      const result = await runCli(
        root,
        ['instructions', 'sync', '--strategy', 'pointer', '--json'],
        ['--json'],
      );

      expect(result.exitCode).toBe(0);
      await expect(
        readFile(join(root, 'apps', 'oat-docs', 'docs', 'CLAUDE.md'), 'utf8'),
      ).resolves.toBe('# a documentation page about CLAUDE.md\n');
    });
  });

  describe('configured instruction sync strategy', () => {
    async function writeStrategyConfig(
      root: string,
      shims: unknown,
    ): Promise<void> {
      await mkdir(join(root, '.oat'), { recursive: true });
      await writeFile(
        join(root, '.oat', 'config.json'),
        JSON.stringify(
          { version: 1, instructions: { claude: { shims } } },
          null,
          2,
        ),
        'utf8',
      );
    }

    // Fails before the config-aware resolver: Commander filled `--strategy`
    // with its own default, so the configured value could never be seen.
    it('sync and validate apply and report the configured strategy with no flag', async () => {
      const root = await createWorkspace();
      tempDirs.push(root);
      await writeStrategyConfig(root, 'copy');
      await writeFile(join(root, 'AGENTS.md'), '# root instructions\n', 'utf8');

      const dryRun = await runCli(
        root,
        ['instructions', 'sync', '--dry-run', '--json'],
        ['--json'],
      );
      expect(dryRun.exitCode).toBe(0);
      const dryRunPayload = JSON.parse(dryRun.stdout);
      expect(dryRunPayload.strategy).toBe('copy');
      expect(dryRunPayload.actions).toEqual([
        expect.objectContaining({
          type: 'create',
          reason: 'missing CLAUDE.md hard copy',
        }),
      ]);

      const validate = await runCli(
        root,
        ['instructions', 'validate', '--json'],
        ['--json'],
      );
      expect(JSON.parse(validate.stdout).strategy).toBe('copy');
    });

    it('--strategy overrides the configured strategy for one run', async () => {
      const root = await createWorkspace();
      tempDirs.push(root);
      await writeStrategyConfig(root, 'copy');
      await writeFile(join(root, 'AGENTS.md'), '# root instructions\n', 'utf8');

      const dryRun = await runCli(
        root,
        [
          'instructions',
          'sync',
          '--dry-run',
          '--json',
          '--strategy',
          'symlink',
        ],
        ['--json'],
      );
      expect(JSON.parse(dryRun.stdout).strategy).toBe('symlink');

      const validate = await runCli(
        root,
        ['instructions', 'validate', '--json', '--strategy', 'symlink'],
        ['--json'],
      );
      expect(JSON.parse(validate.stdout).strategy).toBe('symlink');

      // The override is one run only: config is unchanged.
      await expect(
        readFile(join(root, '.oat', 'config.json'), 'utf8'),
      ).resolves.toContain('"shims": "copy"');
    });

    it('fails closed on an unknown configured strategy instead of using the default', async () => {
      const root = await createWorkspace();
      tempDirs.push(root);
      await writeStrategyConfig(root, 'Pointer');
      await writeFile(join(root, 'AGENTS.md'), '# root instructions\n', 'utf8');

      const sync = await runCli(root, ['instructions', 'sync']);
      expect(sync.exitCode).toBe(2);
      expect(sync.stderr + sync.stdout).toContain(
        'Invalid instructions.claude.shims',
      );
      await expect(lstat(join(root, 'CLAUDE.md'))).rejects.toMatchObject({
        code: 'ENOENT',
      });

      const validate = await runCli(root, ['instructions', 'validate']);
      expect(validate.exitCode).toBe(2);
    });
  });

  describe('strategy none (the default)', () => {
    async function pathExists(candidate: string): Promise<boolean> {
      try {
        await lstat(candidate);
        return true;
      } catch {
        return false;
      }
    }

    async function writeSharedConfig(
      root: string,
      config: Record<string, unknown>,
    ): Promise<void> {
      await mkdir(join(root, '.oat'), { recursive: true });
      await writeFile(
        join(root, '.oat', 'config.json'),
        JSON.stringify({ version: 1, ...config }, null, 2),
        'utf8',
      );
    }

    async function writePair(
      root: string,
      directory: string,
      claude: string | { link: string } | null,
      agents = `# ${directory} instructions\n`,
    ): Promise<void> {
      const dir = join(root, directory);
      await mkdir(dir, { recursive: true });
      await writeFile(join(dir, 'AGENTS.md'), agents, 'utf8');
      if (claude === null) {
        return;
      }
      if (typeof claude === 'string') {
        await writeFile(join(dir, 'CLAUDE.md'), claude, 'utf8');
      } else {
        await symlink(claude.link, join(dir, 'CLAUDE.md'));
      }
    }

    it('plans nothing for an AGENTS.md without a CLAUDE.md, and validate passes', async () => {
      const root = await createWorkspace();
      tempDirs.push(root);
      await writeFile(join(root, 'AGENTS.md'), '# root instructions\n', 'utf8');
      await writePair(root, 'packages/app', null);

      const dryRun = await runCli(
        root,
        ['instructions', 'sync', '--dry-run', '--json'],
        ['--json'],
      );
      expect(dryRun.exitCode).toBe(0);
      const dryRunPayload = JSON.parse(dryRun.stdout);
      expect(dryRunPayload.strategy).toBe('none');
      expect(dryRunPayload.status).toBe('ok');
      expect(dryRunPayload.actions).toEqual([]);

      const apply = await runCli(root, ['instructions', 'sync']);
      expect(apply.exitCode).toBe(0);
      await expect(pathExists(join(root, 'CLAUDE.md'))).resolves.toBe(false);
      await expect(
        pathExists(join(root, 'packages', 'app', 'CLAUDE.md')),
      ).resolves.toBe(false);

      const validate = await runCli(
        root,
        ['instructions', 'validate', '--json'],
        ['--json'],
      );
      expect(validate.exitCode).toBe(0);
      const payload = JSON.parse(validate.stdout);
      expect(payload.status).toBe('ok');
      expect(payload.summary).toMatchObject({ scanned: 2, ok: 2, missing: 0 });
    });

    it('lists every exact managed shim on --dry-run and removes them on apply', async () => {
      const root = await createWorkspace();
      tempDirs.push(root);
      await writePair(root, 'pointer', EXPECTED_CLAUDE_CONTENT);
      await writePair(root, 'crlf', '@AGENTS.md\r\n');
      await writePair(root, 'linked', { link: 'AGENTS.md' });
      await writePair(
        root,
        'copied',
        '# copied instructions\n',
        '# copied instructions\n',
      );

      const dryRun = await runCli(
        root,
        ['instructions', 'sync', '--dry-run', '--json'],
        ['--json'],
      );
      const dryRunPayload = JSON.parse(dryRun.stdout);
      expect(dryRunPayload.summary).toMatchObject({
        managedShim: 4,
        removed: 4,
      });
      expect(
        dryRunPayload.actions.map(
          (action: { type: string; target: string; result: string }) => [
            action.type,
            action.target.slice(root.length + 1),
            action.result,
          ],
        ),
      ).toEqual([
        ['remove', 'copied/CLAUDE.md', 'planned'],
        ['remove', 'crlf/CLAUDE.md', 'planned'],
        ['remove', 'linked/CLAUDE.md', 'planned'],
        ['remove', 'pointer/CLAUDE.md', 'planned'],
      ]);
      // The planning identity never leaks into the public payload.
      for (const entry of dryRunPayload.entries) {
        expect(entry).not.toHaveProperty('managedShim');
      }
      for (const directory of ['pointer', 'crlf', 'linked', 'copied']) {
        await expect(
          pathExists(join(root, directory, 'CLAUDE.md')),
        ).resolves.toBe(true);
      }

      const before = await runCli(
        root,
        ['instructions', 'validate', '--json'],
        ['--json'],
      );
      expect(before.exitCode).toBe(1);

      const apply = await runCli(
        root,
        ['instructions', 'sync', '--json'],
        ['--json'],
      );
      expect(apply.exitCode).toBe(0);
      expect(JSON.parse(apply.stdout).status).toBe('ok');
      for (const directory of ['pointer', 'crlf', 'linked', 'copied']) {
        await expect(
          pathExists(join(root, directory, 'CLAUDE.md')),
        ).resolves.toBe(false);
        await expect(
          pathExists(join(root, directory, 'AGENTS.md')),
        ).resolves.toBe(true);
      }
      await expect(
        readFile(join(root, 'linked', 'AGENTS.md'), 'utf8'),
      ).resolves.toBe('# linked instructions\n');

      const after = await runCli(
        root,
        ['instructions', 'validate', '--json'],
        ['--json'],
      );
      expect(after.exitCode).toBe(0);
    });

    it('never deletes a hand-written or modified CLAUDE.md, even with --force', async () => {
      const root = await createWorkspace();
      tempDirs.push(root);
      const kept: Record<string, string> = {
        'hand/CLAUDE.md': '# my own Claude notes\n',
        'extended/CLAUDE.md': '@AGENTS.md\n\nAlso read docs/style.md\n',
        'no-newline/CLAUDE.md': '@AGENTS.md',
        'spaced/CLAUDE.md': '@AGENTS.md \n',
        'near-copy/CLAUDE.md': '# near-copy instructions!\n',
      };
      for (const [path, content] of Object.entries(kept)) {
        await writePair(root, path.split('/')[0]!, content);
      }

      const apply = await runCli(
        root,
        ['instructions', 'sync', '--force', '--json'],
        ['--json'],
      );
      expect(apply.exitCode).toBe(0);
      const payload = JSON.parse(apply.stdout);
      expect(payload.actions).toEqual([]);
      expect(payload.summary).toMatchObject({ unmanaged: 5, removed: 0 });
      for (const entry of payload.entries) {
        expect(entry.status).toBe('unmanaged');
        expect(entry.detail).toContain('kept');
      }
      for (const [path, content] of Object.entries(kept)) {
        await expect(readFile(join(root, path), 'utf8')).resolves.toBe(content);
      }

      // Reported, but not drift: sync will never remove them, so validate must
      // not demand a state sync cannot reach.
      const validate = await runCli(
        root,
        ['instructions', 'validate', '--json'],
        ['--json'],
      );
      expect(validate.exitCode).toBe(0);
    });

    it('keeps a CLAUDE.md symlink whose target is not the sibling AGENTS.md', async () => {
      const root = await createWorkspace();
      tempDirs.push(root);
      await writePair(root, 'other', null);
      await writePair(root, 'foreign', { link: '../other/AGENTS.md' });
      await mkdir(join(root, 'notes'), { recursive: true });
      await writeFile(join(root, 'notes', 'CLAUDE-NOTES.md'), '# notes\n');
      await writePair(root, 'elsewhere', { link: '../notes/CLAUDE-NOTES.md' });

      const apply = await runCli(
        root,
        ['instructions', 'sync', '--json'],
        ['--json'],
      );
      expect(apply.exitCode).toBe(0);
      const payload = JSON.parse(apply.stdout);
      expect(payload.actions).toEqual([]);
      await expect(readlink(join(root, 'foreign', 'CLAUDE.md'))).resolves.toBe(
        '../other/AGENTS.md',
      );
      await expect(
        readlink(join(root, 'elsewhere', 'CLAUDE.md')),
      ).resolves.toBe('../notes/CLAUDE-NOTES.md');
      expect(
        payload.entries
          .filter((entry: { status: string }) => entry.status === 'unmanaged')
          .map((entry: { detail: string }) => entry.detail),
      ).toEqual([
        'CLAUDE.md symlink targets "../notes/CLAUDE-NOTES.md", not the sibling AGENTS.md; kept',
        'CLAUDE.md symlink targets "../other/AGENTS.md", not the sibling AGENTS.md; kept',
      ]);
    });

    it('never removes CLAUDE.local.md or .claude/CLAUDE.md, whatever they contain', async () => {
      const root = await createWorkspace();
      tempDirs.push(root);
      await writeFile(join(root, 'AGENTS.md'), '# root instructions\n', 'utf8');
      await writeFile(join(root, 'CLAUDE.local.md'), EXPECTED_CLAUDE_CONTENT);
      await mkdir(join(root, '.claude'), { recursive: true });
      await writeFile(
        join(root, '.claude', 'CLAUDE.md'),
        EXPECTED_CLAUDE_CONTENT,
      );
      await writePair(root, 'pkg/.claude', EXPECTED_CLAUDE_CONTENT);

      const apply = await runCli(
        root,
        ['instructions', 'sync', '--json'],
        ['--json'],
      );
      expect(apply.exitCode).toBe(0);
      expect(JSON.parse(apply.stdout).actions).toEqual([]);
      for (const path of [
        'CLAUDE.local.md',
        '.claude/CLAUDE.md',
        'pkg/.claude/CLAUDE.md',
      ]) {
        await expect(readFile(join(root, path), 'utf8')).resolves.toBe(
          EXPECTED_CLAUDE_CONTENT,
        );
      }
      // `.claude/CLAUDE.md` is not a stray to adopt either.
      await expect(
        pathExists(join(root, '.claude', 'AGENTS.md')),
      ).resolves.toBe(false);
    });

    it('never removes a pointer inside an excluded directory or the documentation tree', async () => {
      const root = await createWorkspace();
      tempDirs.push(root);
      await writeSharedConfig(root, {
        documentation: { root: 'docs-site' },
        instructions: { claude: { excludes: ['vendor'] } },
      });
      await writePair(root, 'docs-site', EXPECTED_CLAUDE_CONTENT);
      await writePair(root, 'vendor/lib', EXPECTED_CLAUDE_CONTENT);

      const apply = await runCli(
        root,
        ['instructions', 'sync', '--json'],
        ['--json'],
      );
      expect(apply.exitCode).toBe(0);
      expect(JSON.parse(apply.stdout).actions).toEqual([]);
      for (const path of ['docs-site/CLAUDE.md', 'vendor/lib/CLAUDE.md']) {
        await expect(readFile(join(root, path), 'utf8')).resolves.toBe(
          EXPECTED_CLAUDE_CONTENT,
        );
      }
    });

    describe('changed between planning and removal', () => {
      // Drives the real scan and the real filesystem, but intercepts the
      // apply path's first `lstat` of the target -- the re-verification --
      // to change the file exactly between planning and deletion.
      async function syncWithChange(
        root: string,
        target: string,
        change: () => Promise<void>,
      ): Promise<{ payload: Record<string, unknown>; exitCode: number }> {
        const capture = createLoggerCapture();
        let changed = false;
        const command = createInstructionsSyncCommand({
          buildCommandContext: (
            globalOptions: GlobalOptions,
          ): CommandContext => ({
            scope: 'project',
            dryRun: false,
            verbose: false,
            json: true,
            cwd: globalOptions.cwd ?? root,
            home: root,
            interactive: false,
            logger: capture.logger,
          }),
          resolveProjectRoot: async () => root,
          lstat: async (path: string) => {
            if (path === target && !changed) {
              changed = true;
              await change();
            }
            return lstat(path);
          },
        } satisfies Partial<InstructionsSyncCommandDependencies>);

        const program = new Command()
          .name('oat')
          .option('--json')
          .option('--cwd <path>')
          .exitOverride();
        program.addCommand(command);
        const previousExitCode = process.exitCode;
        process.exitCode = undefined;
        await program.parseAsync(['--json', 'sync'], { from: 'user' });
        const exitCode = process.exitCode ?? 0;
        process.exitCode = previousExitCode;
        expect(changed).toBe(true);
        return {
          payload: capture.jsonPayloads[0] as Record<string, unknown>,
          exitCode,
        };
      }

      it('keeps a shim rewritten with hand-written content, byte-identical', async () => {
        const root = await createWorkspace();
        tempDirs.push(root);
        await writePair(root, 'pkg', EXPECTED_CLAUDE_CONTENT);
        const target = join(root, 'pkg', 'CLAUDE.md');

        const { payload, exitCode } = await syncWithChange(root, target, () =>
          writeFile(target, '# now hand-written\n', 'utf8'),
        );

        await expect(readFile(target, 'utf8')).resolves.toBe(
          '# now hand-written\n',
        );
        expect(exitCode).toBe(1);
        expect(payload.actions).toEqual([
          {
            type: 'skip',
            target,
            reason:
              'CLAUDE.md changed since planning (hand-written or modified CLAUDE.md); kept',
            result: 'skipped',
          },
        ]);
      });

      it('keeps a shim replaced by a symlink', async () => {
        const root = await createWorkspace();
        tempDirs.push(root);
        await writePair(root, 'pkg', EXPECTED_CLAUDE_CONTENT);
        const target = join(root, 'pkg', 'CLAUDE.md');

        // Even a symlink to the sibling AGENTS.md -- itself a managed shape --
        // is a different file from the one planned, so it is kept.
        const { payload, exitCode } = await syncWithChange(
          root,
          target,
          async () => {
            await rm(target);
            await symlink('AGENTS.md', target);
          },
        );

        await expect(readlink(target)).resolves.toBe('AGENTS.md');
        expect(exitCode).toBe(1);
        expect(payload.actions).toEqual([
          expect.objectContaining({
            type: 'skip',
            target,
            result: 'skipped',
          }),
        ]);
        expect(
          (payload.actions as Array<{ reason: string }>)[0]!.reason,
        ).toMatch(/^CLAUDE\.md changed since planning \(.+\); kept$/);
      });

      it('keeps a shim replaced by a different file with identical bytes', async () => {
        const root = await createWorkspace();
        tempDirs.push(root);
        await writePair(root, 'pkg', EXPECTED_CLAUDE_CONTENT);
        const target = join(root, 'pkg', 'CLAUDE.md');

        // Written beside the original and renamed over it, so the two files
        // exist at once and cannot share an inode number.
        const { payload } = await syncWithChange(root, target, async () => {
          const staged = join(root, 'pkg', 'CLAUDE.md.staged');
          await writeFile(staged, EXPECTED_CLAUDE_CONTENT, 'utf8');
          await rename(staged, target);
        });

        await expect(pathExists(target)).resolves.toBe(true);
        expect(payload.actions).toEqual([
          expect.objectContaining({
            type: 'skip',
            reason:
              'CLAUDE.md changed since planning (CLAUDE.md was replaced by a different file); kept',
          }),
        ]);
      });
      it('keeps a planned copy whose AGENTS.md became a symlink to it', async () => {
        const root = await createWorkspace();
        tempDirs.push(root);
        await writePair(root, 'pkg', '# pkg notes\n', '# pkg notes\n');
        const target = join(root, 'pkg', 'CLAUDE.md');
        const agents = join(root, 'pkg', 'AGENTS.md');

        // Planned as a byte-identical copy; before removal AGENTS.md is
        // replaced by a link to CLAUDE.md, so CLAUDE.md now holds the only
        // copy of the instructions. The re-check must not let it compare
        // with itself.
        const { payload } = await syncWithChange(root, target, async () => {
          await rm(agents);
          await symlink('CLAUDE.md', agents);
        });

        await expect(readFile(target, 'utf8')).resolves.toBe('# pkg notes\n');
        await expect(readFile(agents, 'utf8')).resolves.toBe('# pkg notes\n');
        expect(payload.actions).toEqual([
          expect.objectContaining({ type: 'skip', target, result: 'skipped' }),
        ]);
      });

      it('keeps a planned copy that an AGENTS.md in another directory now links to', async () => {
        const root = await createWorkspace();
        tempDirs.push(root);
        await writePair(root, '.', '# root notes\n', '# root notes\n');
        await writePair(root, 'pkg', null);
        const target = join(root, 'CLAUDE.md');
        const pkgAgents = join(root, 'pkg', 'AGENTS.md');

        const { payload, exitCode } = await syncWithChange(
          root,
          target,
          async () => {
            await rm(pkgAgents);
            await symlink('../CLAUDE.md', pkgAgents);
          },
        );

        expect(exitCode).toBe(1);
        await expect(readFile(pkgAgents, 'utf8')).resolves.toBe(
          '# root notes\n',
        );
        expect(payload.actions).toEqual([
          expect.objectContaining({
            type: 'skip',
            target,
            result: 'skipped',
            reason: expect.stringContaining('pkg/AGENTS.md'),
          }),
        ]);
      });
    });

    describe('AGENTS.md that resolves to CLAUDE.md', () => {
      async function writeLinkedPair(
        root: string,
        directory: string,
        claude: string,
        makeAgents: (dir: string) => Promise<void>,
      ): Promise<void> {
        const dir = join(root, directory);
        await mkdir(dir, { recursive: true });
        await writeFile(join(dir, 'CLAUDE.md'), claude, 'utf8');
        await makeAgents(dir);
      }

      const linkToClaude = (dir: string) =>
        symlink('CLAUDE.md', join(dir, 'AGENTS.md'));

      // The Claude-first layout (`ln -s CLAUDE.md AGENTS.md`): CLAUDE.md is
      // the only copy of the instructions and must never be deleted.
      it('keeps a hand-written CLAUDE.md that AGENTS.md links to, at the command level', async () => {
        const root = await createWorkspace();
        tempDirs.push(root);
        await writeLinkedPair(root, '.', '# real instructions\n', linkToClaude);
        await writeLinkedPair(
          root,
          'pkg',
          '# pkg instructions\n',
          linkToClaude,
        );

        const validate = await runCli(
          root,
          ['instructions', 'validate', '--json'],
          ['--json'],
        );
        expect(validate.exitCode).toBe(0);
        const validatePayload = JSON.parse(validate.stdout);
        expect(validatePayload.summary).toMatchObject({
          managedShim: 0,
          unmanaged: 2,
        });

        const sync = await runCli(
          root,
          ['instructions', 'sync', '--json'],
          ['--json'],
        );
        expect(sync.exitCode).toBe(0);
        const payload = JSON.parse(sync.stdout);
        expect(payload.actions).toEqual([]);
        for (const entry of payload.entries) {
          expect(entry.status).toBe('unmanaged');
          expect(entry.detail).toContain(
            'AGENTS.md resolves to this CLAUDE.md',
          );
        }
        expect(
          payload.warnings.map((warning: { path: string }) => warning.path),
        ).toEqual(['CLAUDE.md', 'pkg/CLAUDE.md']);
        await expect(readFile(join(root, 'CLAUDE.md'), 'utf8')).resolves.toBe(
          '# real instructions\n',
        );
        await expect(
          readFile(join(root, 'pkg', 'AGENTS.md'), 'utf8'),
        ).resolves.toBe('# pkg instructions\n');
      });

      it('keeps a pointer-shaped CLAUDE.md that AGENTS.md links to', async () => {
        const root = await createWorkspace();
        tempDirs.push(root);
        await writeLinkedPair(
          root,
          'pkg',
          EXPECTED_CLAUDE_CONTENT,
          linkToClaude,
        );

        const sync = await runCli(
          root,
          ['instructions', 'sync', '--json'],
          ['--json'],
        );
        expect(JSON.parse(sync.stdout).actions).toEqual([]);
        await expect(
          readFile(join(root, 'pkg', 'CLAUDE.md'), 'utf8'),
        ).resolves.toBe(EXPECTED_CLAUDE_CONTENT);
      });

      it('keeps a CLAUDE.md that is a hard link of AGENTS.md', async () => {
        const root = await createWorkspace();
        tempDirs.push(root);
        await writeLinkedPair(root, 'pkg', '# shared inode\n', (dir) =>
          link(join(dir, 'CLAUDE.md'), join(dir, 'AGENTS.md')),
        );

        const sync = await runCli(
          root,
          ['instructions', 'sync', '--json'],
          ['--json'],
        );
        expect(JSON.parse(sync.stdout).actions).toEqual([]);
        await expect(
          readFile(join(root, 'pkg', 'CLAUDE.md'), 'utf8'),
        ).resolves.toBe('# shared inode\n');
      });

      it('compares the copy shape only against a distinct regular AGENTS.md', async () => {
        const root = await createWorkspace();
        tempDirs.push(root);
        await mkdir(join(root, 'shared'), { recursive: true });
        await writeFile(join(root, 'shared', 'NOTES.md'), '# shared\n');
        // AGENTS.md is a link elsewhere; CLAUDE.md has identical bytes but is
        // not provably an OAT copy, so it is kept.
        await writeLinkedPair(root, 'pkg', '# shared\n', (dir) =>
          symlink('../shared/NOTES.md', join(dir, 'AGENTS.md')),
        );

        const sync = await runCli(
          root,
          ['instructions', 'sync', '--json'],
          ['--json'],
        );
        expect(JSON.parse(sync.stdout).actions).toEqual([]);
        await expect(
          readFile(join(root, 'pkg', 'CLAUDE.md'), 'utf8'),
        ).resolves.toBe('# shared\n');
      });

      it('still removes the reverse shape, a CLAUDE.md symlink to a regular AGENTS.md', async () => {
        const root = await createWorkspace();
        tempDirs.push(root);
        await writePair(root, 'pkg', { link: 'AGENTS.md' });

        const sync = await runCli(root, ['instructions', 'sync']);
        expect(sync.exitCode).toBe(0);
        await expect(pathExists(join(root, 'pkg', 'CLAUDE.md'))).resolves.toBe(
          false,
        );
        await expect(
          readFile(join(root, 'pkg', 'AGENTS.md'), 'utf8'),
        ).resolves.toBe('# pkg instructions\n');
      });

      // Layout A: the root CLAUDE.md is an exact copy of the root AGENTS.md,
      // but pkg/AGENTS.md links to it, so removing it would dangle the link.
      it('keeps a managed-shaped CLAUDE.md that an AGENTS.md in another directory links to', async () => {
        const root = await createWorkspace();
        tempDirs.push(root);
        await writePair(root, '.', '# same\n', '# same\n');
        await mkdir(join(root, 'pkg'), { recursive: true });
        await symlink('../CLAUDE.md', join(root, 'pkg', 'AGENTS.md'));

        const sync = await runCli(
          root,
          ['instructions', 'sync', '--json'],
          ['--json'],
        );
        expect(sync.exitCode).toBe(0);
        const payload = JSON.parse(sync.stdout);
        expect(payload.actions).toEqual([]);
        const rootEntry = payload.entries.find(
          (entry: { claudePath: string }) =>
            entry.claudePath === join(root, 'CLAUDE.md'),
        );
        expect(rootEntry.status).toBe('unmanaged');
        expect(rootEntry.detail).toContain('pkg/AGENTS.md');
        await expect(readFile(join(root, 'CLAUDE.md'), 'utf8')).resolves.toBe(
          '# same\n',
        );
        await expect(
          readFile(join(root, 'pkg', 'AGENTS.md'), 'utf8'),
        ).resolves.toBe('# same\n');
      });

      // Layout B: the root CLAUDE.md is the only copy (a stray) and
      // pkg/AGENTS.md links to it: adopting and deleting it would dangle the
      // link, so it is neither adopted nor removed.
      it('keeps a stray CLAUDE.md that an AGENTS.md in another directory links to', async () => {
        const root = await createWorkspace();
        tempDirs.push(root);
        await writeFile(join(root, 'CLAUDE.md'), '# only copy\n');
        await mkdir(join(root, 'pkg'), { recursive: true });
        await symlink('../CLAUDE.md', join(root, 'pkg', 'AGENTS.md'));

        const sync = await runCli(
          root,
          ['instructions', 'sync', '--json'],
          ['--json'],
        );
        expect(sync.exitCode).toBe(0);
        const payload = JSON.parse(sync.stdout);
        expect(payload.actions).toEqual([]);
        await expect(readFile(join(root, 'CLAUDE.md'), 'utf8')).resolves.toBe(
          '# only copy\n',
        );
        await expect(
          readFile(join(root, 'pkg', 'AGENTS.md'), 'utf8'),
        ).resolves.toBe('# only copy\n');
        await expect(pathExists(join(root, 'AGENTS.md'))).resolves.toBe(false);
        expect(payload.warnings).toEqual([
          expect.objectContaining({
            path: 'CLAUDE.md',
            linkedBy: ['pkg/AGENTS.md'],
          }),
        ]);
      });

      it('warns to replace the linking AGENTS.md before removing the file it links to', async () => {
        const root = await createWorkspace();
        tempDirs.push(root);
        await writeLinkedPair(root, 'pkg', '# pkg only\n', linkToClaude);
        await writePair(root, 'plain', '# hand-written\n');

        const validate = await runCli(
          root,
          ['instructions', 'validate', '--json'],
          ['--json'],
        );
        const byPath = Object.fromEntries(
          JSON.parse(validate.stdout).warnings.map(
            (warning: { path: string }) => [warning.path, warning],
          ),
        );
        expect(byPath['pkg/CLAUDE.md'].linkedBy).toEqual(['pkg/AGENTS.md']);
        expect(byPath['pkg/CLAUDE.md'].message).toContain(
          'Either replace pkg/AGENTS.md (a link to pkg/CLAUDE.md) with the content of pkg/CLAUDE.md and then remove pkg/CLAUDE.md, or set',
        );
        expect(byPath['plain/CLAUDE.md'].linkedBy).toEqual([]);
        expect(byPath['plain/CLAUDE.md'].message).toContain(
          'Either remove plain/CLAUDE.md, or set',
        );

        const human = await runCli(root, ['instructions', 'validate']);
        expect(human.stderr).toContain(
          'Either replace pkg/AGENTS.md (a link to pkg/CLAUDE.md)',
        );
      });
    });

    describe('case variants', () => {
      // Deliberately neither warned about nor removed: exact-case matching
      // keeps ordinary documents such as a provider page named `claude.md`
      // out of the delete-this advice (see instruction-sync.md).
      it('never removes or warns about case variants of CLAUDE.md and CLAUDE.local.md', async () => {
        const root = await createWorkspace();
        tempDirs.push(root);
        await writePair(root, 'pkg', null);
        await writeFile(
          join(root, 'pkg', 'claude.md'),
          EXPECTED_CLAUDE_CONTENT,
        );
        await writePair(root, 'p', null);
        await writeFile(join(root, 'p', 'CLAUDE.MD'), '# shouting\n');
        await writeFile(join(root, 'Claude.Local.md'), '# personal\n');

        const sync = await runCli(
          root,
          ['instructions', 'sync', '--json'],
          ['--json'],
        );
        expect(sync.exitCode).toBe(0);
        const payload = JSON.parse(sync.stdout);
        expect(payload.actions).toEqual([]);
        expect(payload).not.toHaveProperty('warnings');
        await expect(
          readFile(join(root, 'pkg', 'claude.md'), 'utf8'),
        ).resolves.toBe(EXPECTED_CLAUDE_CONTENT);
        await expect(
          readFile(join(root, 'p', 'CLAUDE.MD'), 'utf8'),
        ).resolves.toBe('# shouting\n');
        await expect(
          readFile(join(root, 'Claude.Local.md'), 'utf8'),
        ).resolves.toBe('# personal\n');
      });
    });

    describe('nested git checkouts', () => {
      it('never plans, removes, or warns about CLAUDE.md inside a nested checkout', async () => {
        const root = await createWorkspace();
        tempDirs.push(root);
        // A Claude Code worktree (gitdir file) and a submodule-style checkout
        // (.git directory), each with a managed pointer and a hand-written file.
        await writePair(root, '.claude/worktrees/wt', EXPECTED_CLAUDE_CONTENT);
        await writeFile(
          join(root, '.claude', 'worktrees', 'wt', '.git'),
          'gitdir: /elsewhere/.git/worktrees/wt\n',
        );
        await writePair(root, 'sub', EXPECTED_CLAUDE_CONTENT);
        await mkdir(join(root, 'sub', '.git'), { recursive: true });
        await writePair(root, 'sub/deeper', '# hand-written\n');
        // A sibling outside any nested checkout is still managed.
        await writePair(root, 'pkg', EXPECTED_CLAUDE_CONTENT);

        const dryRun = await runCli(
          root,
          ['instructions', 'sync', '--dry-run', '--json'],
          ['--json'],
        );
        const dryRunPayload = JSON.parse(dryRun.stdout);
        expect(
          dryRunPayload.actions.map((action: { target: string }) =>
            action.target.slice(root.length + 1),
          ),
        ).toEqual(['pkg/CLAUDE.md']);
        expect(dryRunPayload).not.toHaveProperty('warnings');

        const apply = await runCli(
          root,
          ['instructions', 'sync', '--json'],
          ['--json'],
        );
        expect(apply.exitCode).toBe(0);
        expect(JSON.parse(apply.stdout)).not.toHaveProperty('warnings');
        for (const path of [
          '.claude/worktrees/wt/CLAUDE.md',
          'sub/CLAUDE.md',
          'sub/deeper/CLAUDE.md',
        ]) {
          await expect(pathExists(join(root, path))).resolves.toBe(true);
        }

        const validate = await runCli(
          root,
          ['instructions', 'validate', '--json'],
          ['--json'],
        );
        expect(validate.exitCode).toBe(0);
        const validatePayload = JSON.parse(validate.stdout);
        expect(validatePayload.summary.scanned).toBe(1);
        expect(validatePayload).not.toHaveProperty('warnings');
      });
    });

    describe('leftover CLAUDE.md warnings', () => {
      const WARNING_TEXT =
        'makes Claude Code ignore every AGENTS.md in this project';

      function expectTwoOptions(message: string, path: string): void {
        expect(message).toContain(path);
        expect(message).toContain(WARNING_TEXT);
        expect(message).toContain(`Either remove ${path}, or set`);
        expect(message).toContain(
          'instructions.claude.shims in .oat/config.json to a shim strategy',
        );
        expect(message).toContain('rerun `oat instructions sync`');
        // Exactly two options: remove the file, or opt back into shims.
        expect(message.match(/Either /g)).toHaveLength(1);
        expect(message.match(/, or set /g)).toHaveLength(1);
      }

      async function seedLeftovers(root: string): Promise<void> {
        await writePair(root, 'hand', '# my own notes\n');
        await writeFile(join(root, 'AGENTS.md'), '# root instructions\n');
        await writeFile(join(root, 'CLAUDE.local.md'), '# personal\n');
        await mkdir(join(root, '.claude'), { recursive: true });
        await writeFile(join(root, '.claude', 'CLAUDE.md'), '# project\n');
      }

      const LEFTOVERS = [
        '.claude/CLAUDE.md',
        'CLAUDE.local.md',
        'hand/CLAUDE.md',
      ];

      it('warns once per remaining file on sync, in human and --json output, without failing', async () => {
        const root = await createWorkspace();
        tempDirs.push(root);
        await seedLeftovers(root);

        const human = await runCli(root, ['instructions', 'sync']);
        expect(human.exitCode).toBe(0);
        const humanWarnings = human.stderr
          .split('\n')
          .filter((line) => line.includes(WARNING_TEXT));
        expect(humanWarnings).toHaveLength(3);
        for (const path of LEFTOVERS) {
          const line = humanWarnings.find((warning) =>
            warning.startsWith(`${path} `),
          );
          expect(line, path).toBeDefined();
          expectTwoOptions(line!, path);
        }

        const json = await runCli(
          root,
          ['instructions', 'sync', '--json'],
          ['--json'],
        );
        expect(json.exitCode).toBe(0);
        const payload = JSON.parse(json.stdout);
        expect(
          payload.warnings.map((warning: { code: string; path: string }) => [
            warning.code,
            warning.path,
          ]),
        ).toEqual(LEFTOVERS.map((path) => ['claude_md_hides_agents_md', path]));
        for (const warning of payload.warnings) {
          expectTwoOptions(warning.message, warning.path);
        }
      });

      it('scopes a nested file to sessions started in its directory or below', async () => {
        const root = await createWorkspace();
        tempDirs.push(root);
        await seedLeftovers(root);
        await mkdir(join(root, 'pkg', '.claude'), { recursive: true });
        await writeFile(join(root, 'pkg', '.claude', 'CLAUDE.md'), '# pkg\n');

        const json = await runCli(
          root,
          ['instructions', 'validate', '--json'],
          ['--json'],
        );
        const byPath = Object.fromEntries(
          JSON.parse(json.stdout).warnings.map(
            (warning: { path: string; message: string }) => [
              warning.path,
              warning.message,
            ],
          ),
        );
        expect(byPath['hand/CLAUDE.md']).toContain(
          'in this project for Claude Code sessions started in hand/ or below:',
        );
        // `.claude/CLAUDE.md` belongs to the directory that holds `.claude`.
        expect(byPath['pkg/.claude/CLAUDE.md']).toContain(
          'for Claude Code sessions started in pkg/ or below:',
        );
        for (const rootFile of ['CLAUDE.local.md', '.claude/CLAUDE.md']) {
          expect(byPath[rootFile]).toContain(
            `${rootFile} ${WARNING_TEXT}, whatever directory a session starts in:`,
          );
          expect(byPath[rootFile]).not.toContain('sessions started in');
        }
      });

      it('validate reports the same warnings and keeps its exit code', async () => {
        const root = await createWorkspace();
        tempDirs.push(root);
        await seedLeftovers(root);

        const validate = await runCli(
          root,
          ['instructions', 'validate', '--json'],
          ['--json'],
        );
        expect(validate.exitCode).toBe(0);
        const payload = JSON.parse(validate.stdout);
        expect(payload.status).toBe('ok');
        expect(
          payload.warnings.map((warning: { path: string }) => warning.path),
        ).toEqual(LEFTOVERS);

        const human = await runCli(root, ['instructions', 'validate']);
        expect(human.exitCode).toBe(0);
        expect(
          human.stderr
            .split('\n')
            .filter((line) => line.includes(WARNING_TEXT)),
        ).toHaveLength(3);
      });

      it('warns about leftovers in excluded directories and the documentation tree too', async () => {
        const root = await createWorkspace();
        tempDirs.push(root);
        await writeSharedConfig(root, {
          documentation: { root: 'docs-site' },
          instructions: { claude: { excludes: ['vendor'] } },
        });
        await writePair(root, 'docs-site', '# a page about CLAUDE.md\n');
        await writePair(root, 'vendor/lib', EXPECTED_CLAUDE_CONTENT);
        const expected = ['docs-site/CLAUDE.md', 'vendor/lib/CLAUDE.md'];

        const human = await runCli(root, ['instructions', 'sync']);
        expect(human.exitCode).toBe(0);
        for (const path of expected) {
          expect(human.stderr).toContain(`${path} ${WARNING_TEXT}`);
        }

        const sync = await runCli(
          root,
          ['instructions', 'sync', '--json'],
          ['--json'],
        );
        expect(
          JSON.parse(sync.stdout).warnings.map(
            (warning: { path: string }) => warning.path,
          ),
        ).toEqual(expected);

        const validate = await runCli(
          root,
          ['instructions', 'validate', '--json'],
          ['--json'],
        );
        expect(validate.exitCode).toBe(0);
        expect(
          JSON.parse(validate.stdout).warnings.map(
            (warning: { path: string }) => warning.path,
          ),
        ).toEqual(expected);

        // Warned about, never touched: the exclusions still limit removal.
        await expect(
          readFile(join(root, 'vendor', 'lib', 'CLAUDE.md'), 'utf8'),
        ).resolves.toBe(EXPECTED_CLAUDE_CONTENT);
      });

      it('is silent when no CLAUDE.md remains (negative control)', async () => {
        const root = await createWorkspace();
        tempDirs.push(root);
        await writeFile(join(root, 'AGENTS.md'), '# root instructions\n');
        // A managed shim sync removes, so nothing remains afterwards.
        await writePair(root, 'pkg', EXPECTED_CLAUDE_CONTENT);

        const dryRun = await runCli(
          root,
          ['instructions', 'sync', '--dry-run', '--json'],
          ['--json'],
        );
        expect(JSON.parse(dryRun.stdout)).not.toHaveProperty('warnings');

        const human = await runCli(root, ['instructions', 'sync']);
        expect(human.exitCode).toBe(0);
        expect(human.stderr).not.toContain(WARNING_TEXT);

        const validate = await runCli(
          root,
          ['instructions', 'validate', '--json'],
          ['--json'],
        );
        expect(JSON.parse(validate.stdout)).not.toHaveProperty('warnings');
      });

      it('is silent under a configured shim strategy', async () => {
        const root = await createWorkspace();
        tempDirs.push(root);
        await writeSharedConfig(root, {
          instructions: { claude: { shims: 'pointer' } },
        });
        await seedLeftovers(root);

        const sync = await runCli(
          root,
          ['instructions', 'sync', '--json'],
          ['--json'],
        );
        expect(JSON.parse(sync.stdout)).not.toHaveProperty('warnings');
        const validate = await runCli(
          root,
          ['instructions', 'validate', '--json'],
          ['--json'],
        );
        expect(JSON.parse(validate.stdout)).not.toHaveProperty('warnings');
      });
    });

    describe('all or nothing: a CLAUDE.md with content blocks every removal', () => {
      const BLOCK_CODE = 'claude_md_blocks_shim_removal';
      const DOCS_LINK =
        'https://github.com/voxmedia/open-agent-toolkit/blob/main/apps/oat-docs/docs/provider-sync/instruction-sync.md#claude-code-and-agentsmd';

      interface BlockWarning {
        code: string;
        paths: string[];
        wouldRemove: string[];
        linkedBy: Record<string, string[]>;
        message: string;
      }

      /** Every warning as `[code, path or paths]`, in payload order. */
      function warningSet(payload: {
        warnings?: Array<{ code: string; path?: string; paths?: string[] }>;
      }): Array<[string, string | string[] | undefined]> {
        return (payload.warnings ?? []).map((warning) => [
          warning.code,
          warning.path ?? warning.paths,
        ]);
      }

      function blockWarning(payload: {
        warnings?: Array<{ code: string }>;
      }): BlockWarning | undefined {
        return payload.warnings?.find(
          (warning): warning is BlockWarning => warning.code === BLOCK_CODE,
        );
      }

      async function seedShims(root: string): Promise<void> {
        await writePair(root, 'pkg/pointer', EXPECTED_CLAUDE_CONTENT);
        await writePair(root, 'pkg/linked', { link: 'AGENTS.md' });
      }

      const SHIMS = ['pkg/linked/CLAUDE.md', 'pkg/pointer/CLAUDE.md'];

      async function expectShimsKept(root: string): Promise<void> {
        await expect(
          readFile(join(root, 'pkg', 'pointer', 'CLAUDE.md'), 'utf8'),
        ).resolves.toBe(EXPECTED_CLAUDE_CONTENT);
        await expect(
          readlink(join(root, 'pkg', 'linked', 'CLAUDE.md')),
        ).resolves.toBe('AGENTS.md');
      }

      it('removes nothing while a root CLAUDE.md has content, and says why', async () => {
        const root = await createWorkspace();
        tempDirs.push(root);
        await writePair(root, '.', '# the real project instructions\n');
        await seedShims(root);

        const dryRun = await runCli(
          root,
          ['instructions', 'sync', '--dry-run', '--json'],
          ['--json'],
        );
        const dryRunPayload = JSON.parse(dryRun.stdout);
        expect(
          dryRunPayload.actions.map(
            (action: { type: string; target: string; result: string }) => [
              action.type,
              action.target.slice(root.length + 1),
              action.result,
            ],
          ),
        ).toEqual(SHIMS.map((path) => ['skip', path, 'skipped']));
        expect(blockWarning(dryRunPayload)?.wouldRemove).toEqual(SHIMS);
        // The block finding names the kept shims; no per-shim "remove it"
        // advice may contradict it, only the blocker's own leftover warning.
        const expectedWarnings = [
          [BLOCK_CODE, ['CLAUDE.md']],
          ['claude_md_hides_agents_md', 'CLAUDE.md'],
        ];
        expect(warningSet(dryRunPayload)).toEqual(expectedWarnings);

        const apply = await runCli(
          root,
          ['instructions', 'sync', '--json'],
          ['--json'],
        );
        expect(apply.exitCode).toBe(1);
        const payload = JSON.parse(apply.stdout);
        await expectShimsKept(root);
        await expect(readFile(join(root, 'CLAUDE.md'), 'utf8')).resolves.toBe(
          '# the real project instructions\n',
        );
        expect(payload.summary).toMatchObject({ removed: 0, skipped: 2 });
        for (const action of payload.actions) {
          expect(action.reason).toContain('CLAUDE.md has content');
        }

        // The warning is first and carries the whole explanation.
        expect(payload.warnings[0].code).toBe(BLOCK_CODE);
        const warning = blockWarning(payload)!;
        expect(warning.paths).toEqual(['CLAUDE.md']);
        expect(warning.wouldRemove).toEqual(SHIMS);
        expect(warning.linkedBy).toEqual({ 'CLAUDE.md': [] });
        expect(warningSet(payload)).toEqual(expectedWarnings);
        expect(warning.message).toContain(
          `would remove 2 CLAUDE.md files (${SHIMS.join(', ')})`,
        );
        expect(warning.message).not.toContain('OAT-managed');
        expect(warning.message).toContain(
          'none were removed because CLAUDE.md has content',
        );
        expect(warning.message).toContain(
          'Any CLAUDE.md makes Claude Code ignore AGENTS.md',
        );
        expect(warning.message).toContain(DOCS_LINK);
        expect(warning.message).toContain(
          'remove CLAUDE.md or move its content into an AGENTS.md and rerun `oat instructions sync`',
        );
        expect(warning.message).toContain(
          'set instructions.claude.shims to a shim strategy (pointer, symlink, or copy) to keep CLAUDE.md files',
        );

        const human = await runCli(root, ['instructions', 'sync']);
        expect(human.exitCode).toBe(1);
        expect(human.stderr).toContain(warning.message);
        for (const shim of SHIMS) {
          expect(human.stderr).not.toContain(`Either remove ${shim}`);
        }
        await expectShimsKept(root);

        const validate = await runCli(
          root,
          ['instructions', 'validate', '--json'],
          ['--json'],
        );
        expect(warningSet(JSON.parse(validate.stdout))).toEqual(
          expectedWarnings,
        );
      });

      it('never offers plain removal of a blocker that an AGENTS.md links to', async () => {
        const root = await createWorkspace();
        tempDirs.push(root);
        // Claude-first root: AGENTS.md is a link to the only copy, CLAUDE.md.
        await writeFile(join(root, 'CLAUDE.md'), '# real\n', 'utf8');
        await symlink('CLAUDE.md', join(root, 'AGENTS.md'));
        await writePair(root, 'pkg', EXPECTED_CLAUDE_CONTENT);

        for (const args of [
          ['instructions', 'validate', '--json'],
          ['instructions', 'sync', '--dry-run', '--json'],
          ['instructions', 'sync', '--json'],
        ]) {
          const label = args.join(' ');
          const result = await runCli(root, args, ['--json']);
          expect(result.exitCode, label).toBe(1);
          const warning = blockWarning(JSON.parse(result.stdout))!;
          expect(warning.paths, label).toEqual(['CLAUDE.md']);
          expect(warning.wouldRemove, label).toEqual(['pkg/CLAUDE.md']);
          expect(warning.linkedBy, label).toEqual({
            'CLAUDE.md': ['AGENTS.md'],
          });
          expect(warning.message, label).toContain(
            'To finish, replace AGENTS.md with the content of CLAUDE.md, then remove CLAUDE.md and rerun `oat instructions sync`',
          );
          expect(warning.message, label).not.toMatch(
            /remove CLAUDE\.md or move/,
          );
          expect(warningSet(JSON.parse(result.stdout)), label).toEqual([
            [BLOCK_CODE, ['CLAUDE.md']],
            ['claude_md_hides_agents_md', 'CLAUDE.md'],
          ]);
        }
        await expect(readFile(join(root, 'AGENTS.md'), 'utf8')).resolves.toBe(
          '# real\n',
        );
        await expect(
          readFile(join(root, 'pkg', 'CLAUDE.md'), 'utf8'),
        ).resolves.toBe(EXPECTED_CLAUDE_CONTENT);
      });

      it('reports the same finding from validate, without the misleading fix line', async () => {
        const root = await createWorkspace();
        tempDirs.push(root);
        await writePair(root, '.', '# the real project instructions\n');
        await seedShims(root);

        const json = await runCli(
          root,
          ['instructions', 'validate', '--json'],
          ['--json'],
        );
        expect(json.exitCode).toBe(1);
        const payload = JSON.parse(json.stdout);
        const warning = blockWarning(payload)!;
        expect(warning.paths).toEqual(['CLAUDE.md']);
        expect(warning.wouldRemove).toEqual(SHIMS);
        expect(warning.message).toContain('none will be removed');
        for (const entry of payload.entries.filter(
          (candidate: { status: string }) =>
            candidate.status === 'managed_shim',
        )) {
          expect(entry.detail).toContain(
            'not removed while another CLAUDE.md has content',
          );
        }

        const human = await runCli(root, ['instructions', 'validate']);
        expect(human.exitCode).toBe(1);
        expect(human.stderr).toContain(warning.message);
        expect(human.stdout).not.toContain('Fix with: oat instructions sync');
      });

      it('treats a content-bearing CLAUDE.local.md or .claude/CLAUDE.md the same way', async () => {
        for (const blocker of ['CLAUDE.local.md', '.claude/CLAUDE.md']) {
          const root = await createWorkspace();
          tempDirs.push(root);
          await writeFile(join(root, 'AGENTS.md'), '# root instructions\n');
          await mkdir(join(root, '.claude'), { recursive: true });
          await writeFile(join(root, blocker), '# personal notes\n');
          await seedShims(root);

          const apply = await runCli(
            root,
            ['instructions', 'sync', '--json'],
            ['--json'],
          );
          expect(apply.exitCode, blocker).toBe(1);
          await expectShimsKept(root);
          const warning = blockWarning(JSON.parse(apply.stdout));
          expect(warning?.paths, blocker).toEqual([blocker]);
        }
      });

      it('counts a content-bearing CLAUDE.md in an excluded tree too', async () => {
        const root = await createWorkspace();
        tempDirs.push(root);
        await writeSharedConfig(root, {
          instructions: { claude: { excludes: ['vendor'] } },
        });
        await writePair(root, 'vendor/lib', '# vendored notes\n');
        await seedShims(root);

        const apply = await runCli(
          root,
          ['instructions', 'sync', '--json'],
          ['--json'],
        );
        expect(apply.exitCode).toBe(1);
        await expectShimsKept(root);
        expect(blockWarning(JSON.parse(apply.stdout))?.paths).toEqual([
          'vendor/lib/CLAUDE.md',
        ]);
      });

      it('adopts a stray but keeps its CLAUDE.md while another file blocks removal', async () => {
        const root = await createWorkspace();
        tempDirs.push(root);
        await writePair(root, '.', '# the real project instructions\n');
        await mkdir(join(root, 'lone'), { recursive: true });
        await writeFile(join(root, 'lone', 'CLAUDE.md'), '# lone notes\n');

        const apply = await runCli(
          root,
          ['instructions', 'sync', '--json'],
          ['--json'],
        );
        expect(apply.exitCode).toBe(1);
        await expect(
          readFile(join(root, 'lone', 'AGENTS.md'), 'utf8'),
        ).resolves.toBe('# lone notes\n');
        await expect(
          readFile(join(root, 'lone', 'CLAUDE.md'), 'utf8'),
        ).resolves.toBe('# lone notes\n');
        const warning = blockWarning(JSON.parse(apply.stdout))!;
        // The stray itself never blocks: it is adopted, not left behind.
        expect(warning.paths).toEqual(['CLAUDE.md']);
        expect(warning.wouldRemove).toEqual(['lone/CLAUDE.md']);
      });

      it('negative control: with only exact shims, removal proceeds and nothing blocks', async () => {
        const root = await createWorkspace();
        tempDirs.push(root);
        await writePair(root, '.', EXPECTED_CLAUDE_CONTENT);
        await seedShims(root);
        await mkdir(join(root, 'lone'), { recursive: true });
        await writeFile(join(root, 'lone', 'CLAUDE.md'), '# lone notes\n');

        const apply = await runCli(
          root,
          ['instructions', 'sync', '--json'],
          ['--json'],
        );
        expect(apply.exitCode).toBe(0);
        const payload = JSON.parse(apply.stdout);
        expect(payload).not.toHaveProperty('warnings');
        expect(payload.summary).toMatchObject({ removed: 4, skipped: 0 });
        for (const path of ['CLAUDE.md', ...SHIMS, 'lone/CLAUDE.md']) {
          await expect(pathExists(join(root, path)), path).resolves.toBe(false);
        }
      });
    });

    describe('stray adoption', () => {
      it('adopts a lone CLAUDE.md into AGENTS.md and leaves no CLAUDE.md behind', async () => {
        const root = await createWorkspace();
        tempDirs.push(root);
        await mkdir(join(root, 'pkg'), { recursive: true });
        await writeFile(join(root, 'pkg', 'CLAUDE.md'), '# lone notes\n');

        const dryRun = await runCli(
          root,
          ['instructions', 'sync', '--dry-run', '--json'],
          ['--json'],
        );
        expect(
          JSON.parse(dryRun.stdout).actions.map(
            (action: { type: string; target: string }) => [
              action.type,
              action.target.slice(root.length + 1),
            ],
          ),
        ).toEqual([
          ['create', 'pkg/AGENTS.md'],
          ['remove', 'pkg/CLAUDE.md'],
        ]);
        await expect(pathExists(join(root, 'pkg', 'AGENTS.md'))).resolves.toBe(
          false,
        );

        const apply = await runCli(
          root,
          ['instructions', 'sync', '--json'],
          ['--json'],
        );
        expect(apply.exitCode).toBe(0);
        const payload = JSON.parse(apply.stdout);
        expect(payload).not.toHaveProperty('warnings');
        await expect(
          readFile(join(root, 'pkg', 'AGENTS.md'), 'utf8'),
        ).resolves.toBe('# lone notes\n');
        await expect(pathExists(join(root, 'pkg', 'CLAUDE.md'))).resolves.toBe(
          false,
        );
      });

      it('keeps and reports a stray whose content changed during adoption', async () => {
        const root = await createWorkspace();
        tempDirs.push(root);
        await mkdir(join(root, 'pkg'), { recursive: true });
        const claudePath = join(root, 'pkg', 'CLAUDE.md');
        await writeFile(claudePath, '# lone notes\n');

        const capture = createLoggerCapture();
        const command = createInstructionsSyncCommand({
          buildCommandContext: (
            globalOptions: GlobalOptions,
          ): CommandContext => ({
            scope: 'project',
            dryRun: false,
            verbose: false,
            json: true,
            cwd: globalOptions.cwd ?? root,
            home: root,
            interactive: false,
            logger: capture.logger,
          }),
          resolveProjectRoot: async () => root,
          // The adoption write is the seam: the stray is edited right after
          // its content was copied into AGENTS.md.
          writeFile: async (path: string, content: string) => {
            await writeFile(path, content, 'utf8');
            await writeFile(claudePath, '# edited meanwhile\n', 'utf8');
          },
        } satisfies Partial<InstructionsSyncCommandDependencies>);
        const program = new Command()
          .name('oat')
          .option('--json')
          .exitOverride();
        program.addCommand(command);
        const previousExitCode = process.exitCode;
        process.exitCode = undefined;
        await program.parseAsync(['--json', 'sync'], { from: 'user' });
        const exitCode = process.exitCode ?? 0;
        process.exitCode = previousExitCode;

        expect(exitCode).toBe(1);
        await expect(readFile(claudePath, 'utf8')).resolves.toBe(
          '# edited meanwhile\n',
        );
        const payload = capture.jsonPayloads[0] as {
          actions: unknown[];
          warnings: Array<{ path: string }>;
        };
        expect(payload.actions).toContainEqual({
          type: 'skip',
          target: claudePath,
          reason:
            'CLAUDE.md kept after adoption into AGENTS.md (its content differs from the adopted AGENTS.md)',
          result: 'skipped',
        });
        expect(payload.warnings.map((warning) => warning.path)).toEqual([
          'pkg/CLAUDE.md',
        ]);
      });
    });

    describe('negative control: a configured shim strategy is unchanged', () => {
      it('pointer still reports a missing CLAUDE.md as drift and creates it', async () => {
        const root = await createWorkspace();
        tempDirs.push(root);
        await writeSharedConfig(root, {
          instructions: { claude: { shims: 'pointer' } },
        });
        await writeFile(join(root, 'AGENTS.md'), '# root instructions\n');
        await writePair(root, 'kept', EXPECTED_CLAUDE_CONTENT);

        const before = await runCli(
          root,
          ['instructions', 'validate', '--json'],
          ['--json'],
        );
        expect(before.exitCode).toBe(1);
        expect(JSON.parse(before.stdout).summary).toMatchObject({
          missing: 1,
          ok: 1,
        });

        const apply = await runCli(root, ['instructions', 'sync']);
        expect(apply.exitCode).toBe(0);
        await expect(readFile(join(root, 'CLAUDE.md'), 'utf8')).resolves.toBe(
          EXPECTED_CLAUDE_CONTENT,
        );
        // An existing pointer is correct under `pointer`, never removed.
        await expect(
          readFile(join(root, 'kept', 'CLAUDE.md'), 'utf8'),
        ).resolves.toBe(EXPECTED_CLAUDE_CONTENT);
      });

      it('symlink and copy still create their shims', async () => {
        for (const strategy of ['symlink', 'copy'] as const) {
          const root = await createWorkspace();
          tempDirs.push(root);
          await writeSharedConfig(root, {
            instructions: { claude: { shims: strategy } },
          });
          await writeFile(join(root, 'AGENTS.md'), '# root instructions\n');

          const apply = await runCli(root, ['instructions', 'sync']);
          expect(apply.exitCode).toBe(0);
          const claudeStats = await lstat(join(root, 'CLAUDE.md'));
          expect(claudeStats.isSymbolicLink()).toBe(strategy === 'symlink');
          await expect(readFile(join(root, 'CLAUDE.md'), 'utf8')).resolves.toBe(
            '# root instructions\n',
          );
        }
      });
    });
  });

  it('produces unchanged output when .oat/repo is absent', async () => {
    const root = await createWorkspace();
    tempDirs.push(root);

    await writeFile(join(root, 'AGENTS.md'), '# root instructions\n', 'utf8');
    await writeFile(join(root, 'CLAUDE.md'), EXPECTED_CLAUDE_CONTENT, 'utf8');
    await mkdir(join(root, '.oat', 'templates'), { recursive: true });
    await writeFile(
      join(root, '.oat', 'templates', 'AGENTS.md'),
      '# ignored\n',
      'utf8',
    );

    const result = await runCli(
      root,
      ['instructions', 'validate', '--strategy', 'pointer', '--json'],
      ['--json'],
    );

    expect(result.exitCode).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload.status).toBe('ok');
    expect(payload.summary.scanned).toBe(1);
    expect(payload.summary.ok).toBe(1);
  });
});
