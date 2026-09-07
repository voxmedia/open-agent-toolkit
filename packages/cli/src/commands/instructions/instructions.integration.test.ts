import {
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createProgram } from '@app/create-program';
import { EXPECTED_CLAUDE_CONTENT } from '@commands/instructions/instructions.utils';
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
      ['instructions', 'validate', '--json'],
      ['--json'],
    );
    expect(before.exitCode).toBe(1);
    const beforePayload = JSON.parse(before.stdout);
    expect(beforePayload.summary.missing).toBe(1);

    const syncApply = await runCli(root, ['instructions', 'sync']);
    expect(syncApply.exitCode).toBe(0);

    await expect(lstat(join(root, 'CLAUDE.md'))).resolves.toBeDefined();
    await expect(readFile(join(root, 'CLAUDE.md'), 'utf8')).resolves.toBe(
      EXPECTED_CLAUDE_CONTENT,
    );

    const after = await runCli(
      root,
      ['instructions', 'validate', '--json'],
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
      ['instructions', 'sync', '--dry-run', '--json'],
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
      ['instructions', 'sync', '--json'],
      ['--json'],
    );
    expect(applyNoForce.exitCode).toBe(1);
    const applyNoForcePayload = JSON.parse(applyNoForce.stdout);
    expect(applyNoForcePayload.mode).toBe('apply');
    expect(applyNoForcePayload.actions[0]).toMatchObject({
      type: 'skip',
      result: 'skipped',
    });

    const applyForce = await runCli(root, ['instructions', 'sync', '--force']);
    expect(applyForce.exitCode).toBe(0);
    await expect(readFile(join(root, 'CLAUDE.md'), 'utf8')).resolves.toBe(
      EXPECTED_CLAUDE_CONTENT,
    );
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
      ['instructions', 'validate', '--json'],
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
      ['instructions', 'validate', '--json'],
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
      ['instructions', 'validate', '--json'],
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
      ['instructions', 'validate', '--json'],
      ['--json'],
    );
    expect(before.exitCode).toBe(1);
    const beforePayload = JSON.parse(before.stdout);
    expect(beforePayload.summary.stray).toBe(1);

    const syncApply = await runCli(root, ['instructions', 'sync']);
    expect(syncApply.exitCode).toBe(0);

    await expect(
      readFile(join(root, 'docs', 'AGENTS.md'), 'utf8'),
    ).resolves.toBe('# stray claude instructions\n');
    await expect(
      readFile(join(root, 'docs', 'CLAUDE.md'), 'utf8'),
    ).resolves.toBe(EXPECTED_CLAUDE_CONTENT);

    const after = await runCli(
      root,
      ['instructions', 'validate', '--json'],
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
      ['instructions', 'validate', '--json'],
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

    const apply = await runCli(root, ['instructions', 'sync', '--force']);
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
      ['instructions', 'validate', '--json'],
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
      ['instructions', 'validate', '--json'],
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
      documentation: Record<string, unknown>,
    ): Promise<void> {
      await mkdir(join(root, '.oat'), { recursive: true });
      await writeFile(
        join(root, '.oat', 'config.json'),
        JSON.stringify({ version: 1, documentation }, null, 2),
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
        ['instructions', 'sync', '--json'],
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
        ['instructions', 'sync', '--json'],
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
        ['instructions', 'validate', '--json'],
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
        ['instructions', 'sync', '--json'],
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
        ['instructions', 'sync', '--json'],
        ['--json'],
      );
      expect(second.exitCode).toBe(0);
      const secondPayload = JSON.parse(second.stdout);
      expect(secondPayload.status).toBe('ok');
      expect(secondPayload.summary.created).toBe(0);
      expect(secondPayload.actions).toEqual([]);

      const validated = await runCli(
        root,
        ['instructions', 'validate', '--json'],
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
        instructionPointerExcludes: ['apps/oat-docs', 'vendor'],
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
        ['instructions', 'sync', '--json'],
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
        instructionPointerExcludes: ['nonexistent-dir', '/etc'],
      });

      await writeFile(
        join(root, 'apps', 'docsapp', 'docs', 'guide', 'AGENTS.md'),
        '# docs page\n',
        'utf8',
      );

      const result = await runCli(
        root,
        ['instructions', 'validate', '--json'],
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
        instructionPointerExcludes: ['vendor'],
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
        ['instructions', 'validate', '--json'],
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
        instructionPointerExcludes: ['/etc'],
      });

      const result = await runCli(
        root,
        ['instructions', 'validate', '--json'],
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
        instructionPointerExcludes: 'vendor',
      });

      await writeFile(join(root, 'AGENTS.md'), '# root instructions\n', 'utf8');

      const result = await runCli(root, ['instructions', 'sync']);

      expect(result.exitCode).toBe(2);
      expect(result.stderr + result.stdout).toContain(
        'Invalid documentation.instructionPointerExcludes',
      );
      // Nothing was written: the command aborted before scanning.
      await expect(pathExists(join(root, 'CLAUDE.md'))).resolves.toBe(false);
    });

    it('fails closed on a malformed opt-out list during validate too', async () => {
      const root = await createWorkspace();
      tempDirs.push(root);

      await writeDocumentationConfig(root, {
        instructionPointerExcludes: ['vendor', ''],
      });
      await writeFile(join(root, 'AGENTS.md'), '# root instructions\n', 'utf8');

      const result = await runCli(root, ['instructions', 'validate']);

      expect(result.exitCode).toBe(2);
      expect(result.stderr + result.stdout).toContain(
        'Invalid documentation.instructionPointerExcludes',
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
        ['instructions', 'sync', '--json'],
        ['--json'],
      );

      expect(result.exitCode).toBe(0);
      await expect(
        readFile(join(root, 'apps', 'oat-docs', 'docs', 'CLAUDE.md'), 'utf8'),
      ).resolves.toBe('# a documentation page about CLAUDE.md\n');
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
      ['instructions', 'validate', '--json'],
      ['--json'],
    );

    expect(result.exitCode).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload.status).toBe('ok');
    expect(payload.summary.scanned).toBe(1);
    expect(payload.summary.ok).toBe(1);
  });
});
