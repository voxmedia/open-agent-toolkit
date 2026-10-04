import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { Command } from 'commander';
import { expect, it } from 'vitest';

import { createCommitPathsCommand } from './commit-paths';

it('exposes the real exact-path primitive and categorical exit status through the internal command', async () => {
  const root = await mkdtemp(join(tmpdir(), 'oat-commit-command-'));
  const previous = process.exitCode;
  const git = (args: string[]) =>
    execFileSync('git', args, {
      cwd: root,
      encoding: 'utf8',
      stdio: 'pipe',
    }).trim();
  try {
    git(['init', '-q']);
    git(['config', 'user.name', 'OAT']);
    git(['config', 'user.email', 'oat@example.com']);
    await writeFile(join(root, 'owned.md'), 'base\n');
    await writeFile(join(root, 'other.md'), 'base other\n');
    git(['add', '.']);
    git(['commit', '-qm', 'base']);
    await writeFile(join(root, 'other.md'), 'staged literal\n');
    git(['add', 'other.md']);
    await writeFile(join(root, 'other.md'), 'unstaged literal\n');
    await writeFile(join(root, 'owned.md'), 'owned literal\n');
    const program = () =>
      new Command()
        .option('--cwd <path>')
        .option('--json')
        .addCommand(
          new Command('internal').addCommand(createCommitPathsCommand()),
        );
    await program().parseAsync(
      [
        '--cwd',
        root,
        'internal',
        'commit-paths',
        '-m',
        'feat: command',
        '--identity',
        'cli-one',
        '--',
        'owned.md',
      ],
      { from: 'user' },
    );
    expect(process.exitCode).toBe(0);
    expect(git(['show', ':other.md'])).toBe('staged literal');
    expect(await readFile(join(root, 'other.md'), 'utf8')).toBe(
      'unstaged literal\n',
    );
    await program().parseAsync(
      [
        '--cwd',
        root,
        'internal',
        'commit-paths',
        '-m',
        'feat: reject',
        '--identity',
        'cli-bad',
        '--',
        '.',
      ],
      { from: 'user' },
    );
    expect(process.exitCode).toBe(2);
  } finally {
    process.exitCode = previous;
    await rm(root, { recursive: true, force: true });
  }
});
