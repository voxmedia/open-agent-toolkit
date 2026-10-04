import { execFile, execFileSync } from 'node:child_process';
import {
  chmod,
  mkdir,
  mkdtemp,
  readFile,
  rename,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';

import { afterEach, describe, expect, it } from 'vitest';

import { commitExactPaths } from './exact-path-commit';

const exec = promisify(execFile);
const roots: string[] = [];
const workspace = resolve(import.meta.dirname, '../../../../..');
const lintStaged = join(
  workspace,
  'node_modules/lint-staged/bin/lint-staged.js',
);
function git(root: string, args: string[]): string {
  return execFileSync('git', args, {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, GIT_INDEX_FILE: undefined },
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trimEnd();
}
async function repo(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'oat-exact-'));
  roots.push(root);
  git(root, ['init', '-q']);
  git(root, ['config', 'user.name', 'OAT Test']);
  git(root, ['config', 'user.email', 'oat@example.com']);
  // The canonical repository declares ESM; generated Git hooks must also run
  // under that package boundary instead of relying on Node's default format.
  await writeFile(join(root, 'package.json'), '{"type":"module"}\n');
  await writeFile(join(root, 'owned.md'), 'base owned\n');
  await writeFile(join(root, 'unrelated.md'), 'base unrelated\n');
  await writeFile(join(root, 'deleted.md'), 'base deleted\n');
  await writeFile(join(root, 'old.md'), 'rename bytes\n');
  git(root, ['add', '.']);
  git(root, ['commit', '-qm', 'base']);
  await writeFile(join(root, 'unrelated.md'), 'STAGED unrelated literal\n');
  git(root, ['add', 'unrelated.md']);
  await writeFile(join(root, 'unrelated.md'), 'UNSTAGED unrelated literal\n');
  return root;
}
async function hook(root: string, content: string): Promise<void> {
  const path = join(root, '.git/hooks/pre-commit');
  await writeFile(path, `#!/bin/sh\nset -eu\n${content}\n`);
  await chmod(path, 0o700);
}
async function lintHook(root: string): Promise<void> {
  const format = join(root, '.git/format.cjs');
  await writeFile(
    format,
    "const fs=require('node:fs');for(const p of process.argv.slice(2)){fs.writeFileSync(p,fs.readFileSync(p,'utf8').trim()+'\\nHOOK FINAL\\n');}\n",
  );
  const config = join(root, '.git/lint-staged.json');
  await writeFile(
    config,
    JSON.stringify({ '*.md': `${process.execPath} ${format}` }),
  );
  await hook(
    root,
    `"${process.execPath}" "${lintStaged}" --config "${config}" --quiet`,
  );
}
function preservation(root: string) {
  expect(git(root, ['show', ':unrelated.md'])).toBe('STAGED unrelated literal');
  expect(git(root, ['show', 'HEAD:unrelated.md'])).toBe('base unrelated');
  expect(git(root, ['status', '--porcelain', '--', 'unrelated.md'])).toBe(
    'MM unrelated.md',
  );
}
afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

describe('commitExactPaths real Git boundary', () => {
  it('protects partially staged unrelated bytes and hook-final owned create/modify/delete/rename, with verified retry', async () => {
    const root = await repo();
    await lintHook(root);
    await writeFile(join(root, 'owned.md'), 'new owned  \n');
    await writeFile(join(root, 'created.md'), 'created  \n');
    await rm(join(root, 'deleted.md'));
    await rename(join(root, 'old.md'), join(root, 'new.md'));
    const paths = ['owned.md', 'created.md', 'deleted.md', 'old.md', 'new.md'];
    const input = {
      repoRoot: root,
      paths,
      message: 'feat: owned',
      identity: 'operation-one',
    };
    const result = await commitExactPaths(input);
    expect(result).toMatchObject({
      outcome: 'committed',
      committed: true,
      attempts: 1,
    });
    preservation(root);
    expect(await readFile(join(root, 'unrelated.md'), 'utf8')).toBe(
      'UNSTAGED unrelated literal\n',
    );
    expect(
      git(root, [
        'diff-tree',
        '--no-commit-id',
        '--name-only',
        '--no-renames',
        '-r',
        'HEAD',
      ])
        .split('\n')
        .sort(),
    ).toEqual(paths.sort());
    expect(git(root, ['status', '--porcelain', '--', ...paths])).toBe('');
    expect(await readFile(join(root, 'owned.md'), 'utf8')).toBe(
      'new owned\nHOOK FINAL\n',
    );
    const head = git(root, ['rev-parse', 'HEAD']);
    expect(await commitExactPaths(input)).toMatchObject({
      outcome: 'already-matching',
      commit: head,
    });
    expect(git(root, ['rev-parse', 'HEAD'])).toBe(head);
    await writeFile(join(root, 'owned.md'), 'different artifact\n');
    expect(await commitExactPaths(input)).toMatchObject({
      outcome: 'failed',
      committed: true,
      resumable: true,
    });
    expect(git(root, ['rev-parse', 'HEAD'])).toBe(head);
  }, 15000);

  it('reproduces broad staged leakage and pathspec hook dirt in the baseline', async () => {
    const broad = await repo();
    await writeFile(join(broad, 'owned.md'), 'changed\n');
    git(broad, ['add', 'owned.md']);
    git(broad, ['commit', '-qm', 'baseline broad']);
    expect(git(broad, ['show', 'HEAD:unrelated.md'])).toBe(
      'STAGED unrelated literal',
    );
    const scoped = await repo();
    await lintHook(scoped);
    await writeFile(join(scoped, 'owned.md'), 'changed  \n');
    git(scoped, ['add', 'owned.md']);
    git(scoped, ['commit', '-qm', 'baseline scoped', '--', 'owned.md']);
    expect(git(scoped, ['status', '--porcelain', '--', 'owned.md'])).not.toBe(
      '',
    );
  }, 15000);

  it('refuses literal directories, traversal and absent untracked paths without mutation', async () => {
    const root = await repo();
    await mkdir(join(root, 'dir'));
    const head = git(root, ['rev-parse', 'HEAD']);
    for (const path of ['dir', '../escape', 'missing', '.git/config'])
      expect(
        await commitExactPaths({
          repoRoot: root,
          paths: [path],
          message: 'feat: reject',
          identity: path,
        }),
      ).toMatchObject({ outcome: 'failed', attempts: 0 });
    expect(git(root, ['rev-parse', 'HEAD'])).toBe(head);
    preservation(root);
    await writeFile(join(root, '[literal].md'), 'literal\n');
    expect(
      await commitExactPaths({
        repoRoot: root,
        paths: ['[literal].md'],
        message: 'feat: literal',
        identity: 'literal',
      }),
    ).toMatchObject({ outcome: 'committed' });
    preservation(root);
  });

  it('preserves the real index and worktree on an actual lint-staged hook failure', async () => {
    const root = await repo();
    const config = join(root, '.git/lint-staged.json');
    await writeFile(
      config,
      JSON.stringify({ '*.md': `${process.execPath} -e process.exit(1)` }),
    );
    await hook(
      root,
      `"${process.execPath}" "${lintStaged}" --config "${config}" --quiet`,
    );
    await writeFile(join(root, 'owned.md'), 'owned before failure\n');
    const before = await readFile(join(root, '.git/index'));
    const head = git(root, ['rev-parse', 'HEAD']);
    expect(
      await commitExactPaths({
        repoRoot: root,
        paths: ['owned.md'],
        message: 'feat: failed',
        identity: 'hook-failure',
      }),
    ).toMatchObject({
      outcome: 'failed',
      committed: false,
      lockClass: 'other',
    });
    expect(await readFile(join(root, '.git/index'))).toEqual(before);
    expect(await readFile(join(root, 'owned.md'), 'utf8')).toBe(
      'owned before failure\n',
    );
    expect(await readFile(join(root, 'unrelated.md'), 'utf8')).toBe(
      'UNSTAGED unrelated literal\n',
    );
    expect(git(root, ['rev-parse', 'HEAD'])).toBe(head);
    preservation(root);
  }, 15000);

  it('rejects a hook staging unowned data before Git creates a commit', async () => {
    const root = await repo();
    await writeFile(join(root, 'owned.md'), 'changed\n');
    await hook(root, 'git add unrelated.md');
    const head = git(root, ['rev-parse', 'HEAD']);
    const result = await commitExactPaths({
      repoRoot: root,
      paths: ['owned.md'],
      message: 'feat: guarded',
      identity: 'guard',
    });
    expect(result.outcome).toBe('failed');
    expect(result.error).toContain('ownership guard');
    expect(git(root, ['rev-parse', 'HEAD'])).toBe(head);
    preservation(root);
  });

  it('inspects persistent and transient locks, never deletes the foreign lock, and resumes exhaustion', async () => {
    const root = await repo();
    await writeFile(join(root, 'owned.md'), 'changed\n');
    const lock = join(root, '.git/index.lock');
    await writeFile(lock, 'FOREIGN LOCK');
    const input = {
      repoRoot: root,
      paths: ['owned.md'],
      message: 'feat: locked',
      identity: 'locked',
    };
    expect(
      await commitExactPaths(input, { retryDelaysMs: [5, 5] }),
    ).toMatchObject({
      outcome: 'blocked',
      attempts: 3,
      lockClass: 'persistent-index-lock',
      resumable: true,
    });
    expect(await readFile(lock, 'utf8')).toBe('FOREIGN LOCK');
    preservation(root);
    const owner = exec(process.execPath, [
      '-e',
      `setTimeout(()=>require('node:fs').unlinkSync(${JSON.stringify(lock)}),40)`,
    ]);
    expect(
      await commitExactPaths(input, { retryDelaysMs: [150, 150] }),
    ).toMatchObject({ outcome: 'committed' });
    await owner;
    preservation(root);
  });

  it('blocks a real concurrent Git writer while hooks run and preserves its later staged bytes', async () => {
    const root = await repo();
    await writeFile(join(root, 'owned.md'), 'changed\n');
    const signal = join(root, '.git/hook-started');
    await hook(root, `touch "${signal}"\nsleep 0.3`);
    const pending = commitExactPaths({
      repoRoot: root,
      paths: ['owned.md'],
      message: 'feat: concurrent',
      identity: 'concurrent',
    });
    const writer = exec(process.execPath, [
      '-e',
      `const fs=require('node:fs'),cp=require('node:child_process');const tick=setInterval(()=>{if(!fs.existsSync(${JSON.stringify(signal)}))return;clearInterval(tick);const blocked=cp.spawnSync('git',['add','unrelated.md'],{cwd:${JSON.stringify(root)}});if(blocked.status===0)process.exit(2);const wait=setInterval(()=>{if(fs.existsSync(${JSON.stringify(join(root, '.git/index.lock'))}))return;clearInterval(wait);fs.writeFileSync(${JSON.stringify(join(root, 'unrelated.md'))},'CONCURRENT literal\\n');const staged=cp.spawnSync('git',['add','unrelated.md'],{cwd:${JSON.stringify(root)}});process.exit(staged.status);},5);},5);`,
    ]);
    const [result] = await Promise.all([pending, writer]);
    expect(result).toMatchObject({ outcome: 'committed' });
    expect(git(root, ['show', ':unrelated.md'])).toBe('CONCURRENT literal');
    expect(git(root, ['show', 'HEAD:unrelated.md'])).toBe('base unrelated');
    expect(git(root, ['status', '--porcelain', '--', 'owned.md'])).toBe('');
  });

  it('detects an index writer bypassing the lock and safely finishes the committed receipt on retry', async () => {
    const root = await repo();
    await writeFile(join(root, 'owned.md'), 'changed\n');
    const index = join(root, '.git/index');
    const altered = join(root, '.git/other-index');
    await writeFile(altered, await readFile(index));
    await writeFile(join(root, 'concurrent.md'), 'other writer literal\n');
    await exec('git', ['add', 'concurrent.md'], {
      cwd: root,
      env: { ...process.env, GIT_INDEX_FILE: altered },
    });
    await hook(root, `cp "${altered}" "${index}"`);
    const input = {
      repoRoot: root,
      paths: ['owned.md'],
      message: 'feat: collision',
      identity: 'collision',
    };
    const result = await commitExactPaths(input);
    expect(result).toMatchObject({
      outcome: 'blocked',
      committed: true,
      resumable: true,
    });
    expect(git(root, ['show', ':concurrent.md'])).toBe('other writer literal');
    expect(await commitExactPaths(input)).toMatchObject({
      outcome: 'already-matching',
      commit: result.commit,
    });
    expect(git(root, ['show', ':concurrent.md'])).toBe('other writer literal');
    expect(git(root, ['status', '--porcelain', '--', 'owned.md'])).toBe('');
    preservation(root);
  });
});
