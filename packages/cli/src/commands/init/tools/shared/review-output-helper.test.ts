import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

import { afterEach, describe, expect, it } from 'vitest';

const execFileAsync = promisify(execFile);

const repoRoot = join(import.meta.dirname, '../../../../../../../');
const helperPath = join(
  repoRoot,
  '.agents',
  'skills',
  'oat-review-provide',
  'scripts',
  'resolve-review-output.sh',
);

async function initGitRepo(root: string): Promise<void> {
  await execFileAsync('git', ['init', '-q'], { cwd: root });
}

async function runHelper(
  root: string,
  args: readonly string[] = ['--mode', 'auto'],
): Promise<Record<string, string>> {
  const { stdout } = await execFileAsync('bash', [helperPath, ...args], {
    cwd: root,
  });

  return Object.fromEntries(
    stdout
      .trim()
      .split('\n')
      .map((line) => {
        const [key, ...valueParts] = line.split('=');
        return [key, valueParts.join('=')];
      }),
  );
}

describe('resolve-review-output.sh', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tempDirs.map((dir) => rm(dir, { recursive: true, force: true })),
    );
    tempDirs.length = 0;
  });

  async function createRepo(): Promise<string> {
    const root = await mkdtemp(join(tmpdir(), 'oat-review-output-'));
    tempDirs.push(root);
    await initGitRepo(root);
    return root;
  }

  it('uses tracked review output when new files in .oat/repo/reviews are trackable', async () => {
    const root = await createRepo();
    await mkdir(join(root, '.oat', 'repo', 'reviews'), { recursive: true });

    await expect(runHelper(root)).resolves.toMatchObject({
      review_mode: 'file',
      output_dir: '.oat/repo/reviews',
      output_kind: 'tracked',
      output_gitignored: 'false',
      reason: 'existing_tracked_dir',
    });
  });

  it('falls back to local review output when files under .oat/repo/reviews are ignored', async () => {
    const root = await createRepo();
    await mkdir(join(root, '.oat', 'repo', 'reviews'), { recursive: true });
    await writeFile(
      join(root, '.gitignore'),
      ['.oat/repo/reviews/**', '.oat/projects/local/**', ''].join('\n'),
      'utf8',
    );

    await expect(runHelper(root)).resolves.toMatchObject({
      review_mode: 'file',
      output_dir: '.oat/projects/local/orphan-reviews',
      output_kind: 'local',
      output_gitignored: 'true',
      reason: 'default_local_only',
    });
  });

  it('reports ignored status for forced tracked review output without overriding it', async () => {
    const root = await createRepo();
    await mkdir(join(root, '.oat', 'repo', 'reviews'), { recursive: true });
    await writeFile(
      join(root, '.gitignore'),
      ['.oat/repo/reviews/**', ''].join('\n'),
      'utf8',
    );

    await expect(runHelper(root, ['--mode', 'tracked'])).resolves.toMatchObject(
      {
        review_mode: 'file',
        output_dir: '.oat/repo/reviews',
        output_kind: 'tracked',
        output_gitignored: 'true',
        reason: 'forced_tracked',
      },
    );
  });
});
