import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { constants } from 'node:fs';
import {
  access,
  lstat,
  mkdir,
  mkdtemp,
  open,
  readFile,
  readlink,
  realpath,
  rename,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { promisify } from 'node:util';

const exec = promisify(execFile);
export interface ExactPathCommitInput {
  repoRoot: string;
  paths: readonly string[];
  message: string;
  identity: string;
}
export interface ExactPathCommitResult {
  outcome: 'committed' | 'already-matching' | 'nothing' | 'blocked' | 'failed';
  committed: boolean;
  attempts: number;
  commit?: string;
  receipt?: string;
  error?: string;
  lockClass?: 'transient-index-lock' | 'persistent-index-lock' | 'other';
  resumable?: boolean;
}
export interface ExactPathCommitDependencies {
  attempts: number;
  retryDelaysMs: readonly number[];
  sleep: (ms: number) => Promise<void>;
}
interface Receipt {
  identity: string;
  paths: string[];
  parent: string;
  commit?: string;
  tree?: string;
}
const defaults: ExactPathCommitDependencies = {
  attempts: 3,
  retryDelaysMs: [100, 300],
  sleep: (ms) => new Promise((done) => setTimeout(done, ms)),
};
function digest(value: string | Buffer): string {
  return createHash('sha256').update(value).digest('hex');
}
function environment(index?: string): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    LANG: 'C',
    LC_ALL: 'C',
    LANGUAGE: 'C',
  };
  for (const key of [
    'GIT_DIR',
    'GIT_WORK_TREE',
    'GIT_INDEX_FILE',
    'GIT_COMMON_DIR',
    'GIT_OBJECT_DIRECTORY',
    'GIT_ALTERNATE_OBJECT_DIRECTORIES',
    'GIT_NAMESPACE',
  ])
    delete env[key];
  if (index) env.GIT_INDEX_FILE = index;
  return env;
}
async function git(
  root: string,
  args: string[],
  index?: string,
): Promise<string> {
  const { stdout } = await exec('git', ['--literal-pathspecs', ...args], {
    cwd: root,
    env: environment(index),
    maxBuffer: 64 * 1024 * 1024,
  });
  return stdout.trimEnd();
}
async function bytes(path: string): Promise<Buffer | undefined> {
  try {
    return await readFile(path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
    throw error;
  }
}
async function fileIdentity(path: string): Promise<string> {
  try {
    const info = await lstat(path);
    if (info.isSymbolicLink()) return `symlink:${await readlink(path)}`;
    return `${info.mode}:${digest(await readFile(path))}`;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return 'absent';
    throw error;
  }
}
async function writeReceipt(
  path: string,
  receipt: Receipt | undefined,
): Promise<void> {
  const temporary = `${path}.${process.pid}.tmp`;
  await writeFile(temporary, JSON.stringify(receipt));
  await rename(temporary, path);
}
function detail(error: unknown): string {
  const failure = error as { stderr?: string; message?: string };
  return failure.stderr?.trim() || failure.message || String(error);
}
async function exactPaths(
  root: string,
  supplied: readonly string[],
  receiptPaths: readonly string[] = [],
): Promise<string[]> {
  if (!supplied.length) throw new Error('Supply at least one exact file path.');
  const paths: string[] = [];
  for (const value of supplied) {
    if (!value || value.includes('\0'))
      throw new Error('File paths must be nonblank literal paths.');
    const absolute = resolve(root, value);
    const path = relative(root, absolute);
    if (
      !path ||
      path === '..' ||
      path.startsWith('../') ||
      isAbsolute(path) ||
      path.split('/').includes('.git')
    )
      throw new Error(`Path is outside repository ownership: ${value}`);
    let ancestor = dirname(absolute);
    while (
      !(await access(ancestor).then(
        () => true,
        () => false,
      ))
    )
      ancestor = dirname(ancestor);
    const physical = relative(root, await realpath(ancestor));
    if (physical === '..' || physical.startsWith('../'))
      throw new Error(
        `Path traverses a symlink outside the repository: ${value}`,
      );
    const info = await lstat(absolute).catch((error: NodeJS.ErrnoException) => {
      if (error.code === 'ENOENT') return undefined;
      throw error;
    });
    if (info?.isDirectory())
      throw new Error(`Directories are not exact file paths: ${value}`);
    if (
      !info &&
      !receiptPaths.includes(path) &&
      !(await git(root, ['ls-files', '--error-unmatch', '--', path]).then(
        () => true,
        () => false,
      ))
    )
      throw new Error(`Absent path is not a tracked removal: ${value}`);
    const entry = await git(root, ['ls-files', '--stage', '--', path]);
    if (/^160000 /m.test(entry) || / [123]\t/.test(entry))
      throw new Error(
        `Unmerged paths and submodules require explicit resolution: ${value}`,
      );
    paths.push(path);
  }
  return [...new Set(paths)].sort();
}

/** Use an isolated index for enabled hooks; publish only owned entries under Git's lock.
 * The real lock is held during hooks, so ordinary competing Git writers cannot lose
 * their changes. A byte comparison also detects writers bypassing that protocol.
 * Never restore a snapshot over current user data, and never remove a foreign lock.
 */
export async function commitExactPaths(
  input: ExactPathCommitInput,
  overrides: Partial<ExactPathCommitDependencies> = {},
): Promise<ExactPathCommitResult> {
  const policy = { ...defaults, ...overrides };
  let receiptPath: string | undefined;
  let commit: string | undefined;
  let attempts = 0;
  let root: string;
  let indexPath: string;
  let paths: string[];
  try {
    if (!input.identity.trim() || !input.message.trim())
      throw new Error('Message and operation identity must be nonblank.');
    root = await realpath(
      (await git(input.repoRoot, ['rev-parse', '--show-toplevel'])).trim(),
    );
    indexPath = resolve(
      root,
      (await git(root, ['rev-parse', '--git-path', 'index'])).trim(),
    );
    const receipts = join(dirname(indexPath), 'oat-exact-path-commits');
    receiptPath = join(receipts, `${digest(input.identity)}.json`);
    const prior = await bytes(receiptPath);
    const priorPaths = prior
      ? (JSON.parse(prior.toString()) as Receipt).paths
      : [];
    paths = await exactPaths(root, input.paths, priorPaths);
    await mkdir(receipts, { recursive: true });
  } catch (error) {
    return {
      outcome: 'failed',
      committed: false,
      attempts,
      error: detail(error),
      lockClass: 'other',
    };
  }
  const lockPath = `${indexPath}.lock`;
  let firstMtime: number | undefined;
  while (attempts < policy.attempts) {
    attempts++;
    let lock: Awaited<ReturnType<typeof open>>;
    try {
      lock = await open(lockPath, 'wx');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST')
        return {
          outcome: 'failed',
          committed: false,
          attempts,
          error: detail(error),
        };
      const current = await stat(lockPath).catch(() => undefined);
      if (attempts === 1) firstMtime = current?.mtimeMs;
      if (attempts < policy.attempts) {
        await policy.sleep(policy.retryDelaysMs[attempts - 1] ?? 0);
        continue;
      }
      return {
        outcome: 'blocked',
        committed: false,
        attempts,
        receipt: receiptPath,
        resumable: true,
        lockClass:
          firstMtime !== undefined && firstMtime === current?.mtimeMs
            ? 'persistent-index-lock'
            : 'transient-index-lock',
        error: `Git index lock remains at ${lockPath}. Its owner must finish; retry the same identity. No lock was removed.`,
      };
    }
    const ownedLock = await lock.stat();
    const stillOwnLock = async (): Promise<boolean> => {
      const current = await stat(lockPath).catch(() => undefined);
      return current?.ino === ownedLock.ino && current.dev === ownedLock.dev;
    };
    let temporary: string | undefined;
    let published = false;
    try {
      const snapshot = await bytes(indexPath);
      const head = await git(root, ['rev-parse', '--verify', 'HEAD']).catch(
        () => '',
      );
      const receiptBytes = await bytes(receiptPath);
      let receipt: Receipt | undefined = receiptBytes
        ? (JSON.parse(receiptBytes.toString()) as Receipt)
        : undefined;
      if (
        receipt &&
        (receipt.identity !== input.identity ||
          JSON.stringify(receipt.paths) !== JSON.stringify(paths))
      )
        throw new Error(
          'Operation identity already names different owned paths; supply a distinct identity.',
        );
      if (receipt?.commit) {
        commit = receipt.commit;
        if (
          (await git(root, ['rev-parse', `${commit}^{tree}`])) !==
            receipt.tree ||
          !(await git(root, ['show', '-s', '--format=%B', commit])).includes(
            `Oat-Operation: ${digest(input.identity)}`,
          )
        )
          throw new Error(
            'Receipt does not positively match the committed artifact.',
          );
        await git(root, ['merge-base', '--is-ancestor', commit, 'HEAD']);
        if (
          (
            await git(root, [
              'diff',
              '--name-only',
              commit,
              'HEAD',
              '--',
              ...paths,
            ])
          ).length
        )
          throw new Error(
            'Owned artifact changed since this operation committed; use a new identity.',
          );
      } else if (receipt) {
        // Recover the window after Git wrote the commit but before receipt publication.
        const candidates = (
          await git(root, [
            'log',
            '--format=%H',
            '--fixed-strings',
            `--grep=Oat-Operation: ${digest(input.identity)}`,
          ])
        )
          .split('\n')
          .filter(Boolean);
        for (const candidate of candidates) {
          if (
            (await git(root, ['rev-parse', `${candidate}^`]).catch(
              () => '',
            )) === receipt.parent
          ) {
            commit = candidate;
            break;
          }
        }
        if (commit)
          receipt = {
            ...receipt,
            commit,
            tree: await git(root, ['rev-parse', `${commit}^{tree}`]),
          };
      }
      const resuming = commit !== undefined;
      temporary = await mkdtemp(join(dirname(indexPath), 'oat-commit-'));
      const isolated = join(temporary, 'index');
      if (!commit) {
        await git(
          root,
          head ? ['read-tree', head] : ['read-tree', '--empty'],
          isolated,
        );
        await git(root, ['add', '-A', '--', ...paths], isolated);
        if (!(await git(root, ['diff', '--cached', '--name-only'], isolated)))
          return { outcome: 'nothing', committed: false, attempts };
        const unrelated = (
          await git(root, [
            'ls-files',
            '-z',
            '--cached',
            '--others',
            '--exclude-standard',
          ])
        )
          .split('\0')
          .filter((path) => path && !paths.includes(path));
        const worktree = Object.fromEntries(
          await Promise.all(
            [...new Set(unrelated)].map(async (path) => [
              path,
              await fileIdentity(join(root, path)),
            ]),
          ),
        );
        const configured = await git(root, [
          'config',
          '--get',
          'core.hooksPath',
        ]).catch(() => '');
        const originalHooks = configured
          ? resolve(root, configured)
          : resolve(
              root,
              await git(root, ['rev-parse', '--git-path', 'hooks']),
            );
        const hooks = join(temporary, 'hooks');
        await mkdir(hooks);
        // Delegate original executable hooks, then guard the emitted tree before
        // Git accepts it. Hooks see their original argv and the isolated index.
        for (const name of [
          'pre-commit',
          'prepare-commit-msg',
          'commit-msg',
          'post-commit',
        ]) {
          const source = join(originalHooks, name);
          const executable = await access(source, constants.X_OK).then(
            () => true,
            () => false,
          );
          if (!executable && name === 'post-commit') continue;
          const script = `#!/usr/bin/env node\nconst {spawnSync}=require('node:child_process');const fs=require('node:fs');const crypto=require('node:crypto');const path=require('node:path');\n${executable ? `const hook=spawnSync(${JSON.stringify(source)},process.argv.slice(2),{stdio:'inherit'});if(hook.error||hook.status!==0)process.exit(hook.status||1);` : ''}\n${name !== 'post-commit' ? `const owned=${JSON.stringify(paths)};const staged=spawnSync('git',['diff','--cached','--name-only','-z'],{encoding:'utf8'});if(staged.status!==0||staged.stdout.split('\\0').some(p=>p&&!owned.includes(p))){process.stderr.write('Exact-path ownership guard: hook staged an unowned path.\\n');process.exit(1);}const before=${JSON.stringify(worktree)};for(const [p,expected]of Object.entries(before)){let actual;try{const full=path.resolve(p);const info=fs.lstatSync(full);actual=info.isSymbolicLink()?'symlink:'+fs.readlinkSync(full):info.mode+':'+crypto.createHash('sha256').update(fs.readFileSync(full)).digest('hex');}catch(e){if(e.code!=='ENOENT')throw e;actual='absent';}if(actual!==expected){process.stderr.write('Exact-path preservation guard: unowned worktree path changed: '+p+'\\n');process.exit(1);}}` : ''}\n`;
          await writeFile(join(hooks, name), script, { mode: 0o700 });
        }
        receipt = { identity: input.identity, paths, parent: head };
        await writeReceipt(receiptPath, receipt);
        await git(
          root,
          [
            '-c',
            `core.hooksPath=${hooks}`,
            'commit',
            '-m',
            `${input.message}\n\nOat-Operation: ${digest(input.identity)}`,
          ],
          isolated,
        );
        commit = await git(root, ['rev-parse', 'HEAD']);
        if (
          (await git(root, ['rev-parse', `${commit}^`]).catch(() => '')) !==
            head ||
          !(await git(root, ['show', '-s', '--format=%B', commit])).includes(
            `Oat-Operation: ${digest(input.identity)}`,
          )
        )
          throw new Error('Commit identity/parent could not be verified.');
        for (const [path, before] of Object.entries(worktree)) {
          if ((await fileIdentity(join(root, path))) !== before)
            throw new Error(
              `Unowned worktree path changed during hooks: ${path}; current bytes preserved for inspection.`,
            );
        }
        receipt = {
          ...receipt,
          commit,
          tree: await git(root, ['rev-parse', `${commit}^{tree}`]),
        };
      }
      const emitted = (
        await git(root, [
          'diff-tree',
          '--root',
          '--no-commit-id',
          '-r',
          '--no-renames',
          '--name-only',
          '-z',
          commit,
        ])
      )
        .split('\0')
        .filter(Boolean);
      if (emitted.some((path) => !paths.includes(path)))
        throw new Error(
          'Committed artifact contains unowned paths; manual inspection required.',
        );
      await writeReceipt(receiptPath, receipt);
      // Copy current index into a disposable merge, never into the live index.
      // Only owned entries are reset to the verified hook-final tree.
      const merged = join(temporary, 'merged');
      if (snapshot) await writeFile(merged, snapshot);
      else await git(root, ['read-tree', '--empty'], merged);
      await git(root, ['reset', '--quiet', commit, '--', ...paths], merged);
      if (
        (
          await git(
            root,
            ['diff', '--name-only', commit, '--', ...paths],
            merged,
          )
        ).length
      )
        throw new Error(
          'Committed owned bytes differ from the worktree; inspect changes before retrying.',
        );
      if (
        !(await bytes(indexPath))?.equals(snapshot ?? Buffer.alloc(0)) &&
        (snapshot !== undefined || (await bytes(indexPath)) !== undefined)
      )
        return {
          outcome: 'blocked',
          committed: true,
          commit,
          attempts,
          receipt: receiptPath,
          resumable: true,
          error:
            'Concurrent real-index change detected. The verified commit exists; current index was preserved. Retry the same identity to finalize owned entries.',
        };
      if (!(await stillOwnLock()))
        throw new Error(
          'Owned index lock was replaced; current index and foreign lock preserved. Retry after inspection.',
        );
      await lock.writeFile(await readFile(merged));
      await lock.close();
      await rename(lockPath, indexPath);
      published = true;
      return {
        outcome: resuming ? 'already-matching' : 'committed',
        committed: true,
        commit,
        attempts,
        receipt: receiptPath,
      };
    } catch (error) {
      return {
        outcome: 'failed',
        committed: commit !== undefined,
        commit,
        attempts,
        receipt: receiptPath,
        resumable: true,
        error: detail(error),
        lockClass: 'other',
      };
    } finally {
      if (!published) {
        await lock.close().catch(() => undefined);
        if (await stillOwnLock()) await rm(lockPath, { force: true });
      }
      if (temporary) await rm(temporary, { recursive: true, force: true });
    }
  }
  return {
    outcome: 'blocked',
    committed: false,
    attempts,
    resumable: true,
    error: 'Commit attempt budget must be positive.',
  };
}
