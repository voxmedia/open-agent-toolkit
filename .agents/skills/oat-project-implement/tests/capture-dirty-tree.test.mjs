import assert from 'node:assert/strict';
import { execFile as execFileCallback } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  appendFile,
  chmod,
  copyFile,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import {
  captureDirtyTree,
  parsePorcelainStatus,
  proveArtifactRoundTrip,
} from '../scripts/capture-dirty-tree.mjs';

const execFile = promisify(execFileCallback);
const scriptPath = fileURLToPath(
  new URL('../scripts/capture-dirty-tree.mjs', import.meta.url),
);
const scratchRoots = [];

after(async () => {
  for (const root of scratchRoots.splice(0)) {
    await rm(root, { recursive: true, force: true });
  }
});

async function git(cwd, ...args) {
  const { stdout } = await execFile('git', args, { cwd, encoding: 'utf8' });
  return stdout;
}

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

async function initRepository(root, name) {
  const repo = join(root, name);
  await mkdir(repo, { recursive: true });
  await git(root, 'init', '--quiet', '--initial-branch=main', repo);
  await git(repo, 'config', 'user.name', 'OAT Test');
  await git(repo, 'config', 'user.email', 'oat@example.com');
  return repo;
}

const STAGED_BINARY = Buffer.from([0x00, 0xde, 0xad, 0xbe, 0xef, 0x00, 0x80]);
const WORKTREE_BINARY = Buffer.from([0xff, 0x00, 0xfe, 0x01, 0x00, 0x7f, 0x02]);

/**
 * A fresh repository holding every component the plan calls supported: a text
 * file with a staged hunk plus a further unstaged hunk in the same path, a
 * staged binary change, an unstaged binary change, a file staged as new (with
 * no `HEAD` content to restore from), an untracked file in a nested directory,
 * and an untracked executable. That is the mixture issue #234 describes and the
 * mixture a `git diff --cached`-only recipe silently mangles.
 */
async function createDirtyRepository() {
  const root = await mkdtemp(join(tmpdir(), 'oat-capture-'));
  scratchRoots.push(root);
  const repo = await initRepository(root, 'repo');

  await writeFile(join(repo, 'text.txt'), 'line1\nline2\nline3\n');
  await writeFile(join(repo, 'staged.bin'), Buffer.from([0x00, 0x01, 0x02]));
  await writeFile(join(repo, 'worktree.bin'), Buffer.from([0x03, 0x00, 0x04]));
  await git(repo, 'add', 'text.txt', 'staged.bin', 'worktree.bin');
  await git(repo, 'commit', '--quiet', '-m', 'base');

  await writeFile(join(repo, 'text.txt'), 'line1\nSTAGED\nline3\n');
  await writeFile(join(repo, 'staged.bin'), STAGED_BINARY);
  await writeFile(join(repo, 'added.txt'), 'staged-as-new\n');
  await git(repo, 'add', 'text.txt', 'staged.bin', 'added.txt');

  await writeFile(join(repo, 'text.txt'), 'line1\nSTAGED\nline3\nUNSTAGED\n');
  await writeFile(join(repo, 'worktree.bin'), WORKTREE_BINARY);
  await mkdir(join(repo, 'nested'), { recursive: true });
  await writeFile(join(repo, 'nested/new.txt'), 'untracked-content\n');
  await writeFile(join(repo, 'tool.sh'), '#!/bin/sh\necho untracked\n');
  await chmod(join(repo, 'tool.sh'), 0o755);

  return {
    root,
    repo,
    artifactDir: join(root, 'artifact'),
    contentPaths: [
      'text.txt',
      'staged.bin',
      'worktree.bin',
      'added.txt',
      'nested/new.txt',
      'tool.sh',
    ],
  };
}

async function fingerprintRepository(fixture) {
  const prints = {
    head: (await git(fixture.repo, 'rev-parse', 'HEAD')).trim(),
    status: await git(fixture.repo, 'status', '--porcelain=v2'),
    worktrees: (await git(fixture.repo, 'worktree', 'list')).trim().split('\n')
      .length,
    files: {},
  };
  for (const path of fixture.contentPaths) {
    const absolute = join(fixture.repo, path);
    const entry = await lstat(absolute).catch(() => null);
    prints.files[path] = entry
      ? `${sha256(await readFile(absolute))}|${(entry.mode & 0o777).toString(8)}`
      : 'absent';
  }
  return prints;
}

async function runScript(args) {
  try {
    const { stdout, stderr } = await execFile('node', [scriptPath, ...args], {
      encoding: 'utf8',
    });
    return { code: 0, stdout, stderr };
  } catch (error) {
    return {
      code: error.code,
      stdout: error.stdout ?? '',
      stderr: error.stderr ?? '',
    };
  }
}

async function capture(fixture, options = {}) {
  return await captureDirtyTree({
    worktree: fixture.repo,
    artifactDir: fixture.artifactDir,
    writerIdentity: 'handle:phase-child-lost',
    quiesceIntervalMs: 25,
    ...options,
  });
}

async function readManifest(fixture) {
  return JSON.parse(
    await readFile(join(fixture.artifactDir, 'manifest.json'), 'utf8'),
  );
}

/**
 * The caller-owned restore, driven by the manifest's own restore plan exactly
 * as the root and child contracts prescribe. The script never performs it.
 */
async function restoreToCleanBase(fixture, manifest) {
  for (const entry of manifest.restorePlan) {
    if (entry.action === 'restore-from-head') {
      await git(
        fixture.repo,
        'restore',
        '--staged',
        '--worktree',
        '--source=HEAD',
        '--',
        entry.path,
      );
    } else if (entry.action === 'unstage-and-remove') {
      await git(fixture.repo, 'restore', '--staged', '--', entry.path);
      await rm(join(fixture.repo, entry.path), { force: true });
    } else {
      await rm(join(fixture.repo, entry.path), { force: true });
    }
  }
  assert.equal(await git(fixture.repo, 'status', '--porcelain'), '');
}

async function reapplyArtifact(fixture, manifest) {
  await git(
    fixture.repo,
    'apply',
    '--index',
    join(fixture.artifactDir, 'index.patch'),
  );
  await git(fixture.repo, 'apply', join(fixture.artifactDir, 'worktree.patch'));
  for (const path of manifest.untrackedPaths) {
    const mirrored = join('untracked', path);
    await mkdir(dirname(join(fixture.repo, path)), { recursive: true });
    await copyFile(
      join(fixture.artifactDir, mirrored),
      join(fixture.repo, path),
    );
    const recorded = manifest.files.find((file) => file.path === mirrored);
    await chmod(join(fixture.repo, path), recorded.executable ? 0o755 : 0o644);
  }
}

test('captures every supported component and leaves the worktree untouched', async () => {
  const fixture = await createDirtyRepository();
  const before = await fingerprintRepository(fixture);

  const result = await capture(fixture);

  assert.deepEqual(result.components, ['index', 'worktree', 'untracked']);
  assert.deepEqual(result.affectedPaths, [
    'added.txt',
    'nested/new.txt',
    'staged.bin',
    'text.txt',
    'tool.sh',
    'worktree.bin',
  ]);
  assert.deepEqual(
    result.restorePlan.filter((entry) => entry.action !== 'restore-from-head'),
    [
      { path: 'added.txt', action: 'unstage-and-remove' },
      { path: 'nested/new.txt', action: 'remove-untracked' },
      { path: 'tool.sh', action: 'remove-untracked' },
    ],
  );

  // Immediately after capture and before any restore, the source of truth must
  // be bit-for-bit what it was: HEAD, raw status, bytes, modes, and the set of
  // registered worktrees.
  assert.deepEqual(await fingerprintRepository(fixture), before);

  const manifestBytes = await readFile(
    join(fixture.artifactDir, 'manifest.json'),
  );
  const manifest = JSON.parse(manifestBytes.toString('utf8'));
  assert.equal(result.manifestDigest, sha256(manifestBytes));
  assert.equal(manifest.head, before.head);
  assert.match(manifest.stat, /text\.txt/);

  let total = manifestBytes.length;
  for (const file of manifest.files) {
    const bytes = await readFile(join(fixture.artifactDir, file.path));
    assert.equal(sha256(bytes), file.sha256, `${file.path} digest`);
    assert.equal(bytes.length, file.bytes, `${file.path} size`);
    total += bytes.length;
  }
  assert.equal(result.size, total, 'aggregate size covers every artifact byte');

  const seal = JSON.parse(
    await readFile(join(fixture.artifactDir, 'round-trip.proof'), 'utf8'),
  );
  assert.equal(seal.manifestDigest, result.manifestDigest);
  assert.equal(seal.size, result.size);

  await restoreToCleanBase(fixture, manifest);
  await reapplyArtifact(fixture, manifest);
  assert.deepEqual(await fingerprintRepository(fixture), before);
});

test('keeps the unstaged same-path hunk that an index-only capture would drop', async () => {
  const fixture = await createDirtyRepository();
  await capture(fixture);

  const indexPatch = await readFile(
    join(fixture.artifactDir, 'index.patch'),
    'utf8',
  );
  const worktreePatch = await readFile(
    join(fixture.artifactDir, 'worktree.patch'),
    'utf8',
  );

  assert.match(indexPatch, /\+STAGED/);
  assert.ok(
    !indexPatch.includes('+UNSTAGED'),
    'the index patch alone cannot carry the unstaged hunk',
  );
  assert.match(
    worktreePatch,
    /\+UNSTAGED/,
    'the worktree patch must carry the unstaged same-path hunk',
  );
});

test('captures staged and unstaged binary changes as binary payloads', async () => {
  const fixture = await createDirtyRepository();
  await capture(fixture);

  const indexPatch = await readFile(
    join(fixture.artifactDir, 'index.patch'),
    'utf8',
  );
  const worktreePatch = await readFile(
    join(fixture.artifactDir, 'worktree.patch'),
    'utf8',
  );
  assert.match(
    indexPatch,
    /staged\.bin[\s\S]*GIT binary patch/,
    'the staged binary change needs a binary payload in the index patch',
  );
  assert.match(
    worktreePatch,
    /worktree\.bin[\s\S]*GIT binary patch/,
    'the unstaged binary change needs a binary payload in the worktree patch',
  );

  const manifest = await readManifest(fixture);
  await restoreToCleanBase(fixture, manifest);
  await reapplyArtifact(fixture, manifest);
  assert.deepEqual(
    await readFile(join(fixture.repo, 'staged.bin')),
    STAGED_BINARY,
  );
  assert.deepEqual(
    await readFile(join(fixture.repo, 'worktree.bin')),
    WORKTREE_BINARY,
  );
});

test('captures untracked files, including their executable bit', async () => {
  const fixture = await createDirtyRepository();
  const result = await capture(fixture);

  assert.ok(result.components.includes('untracked'));
  assert.equal(
    await readFile(
      join(fixture.artifactDir, 'untracked', 'nested/new.txt'),
      'utf8',
    ),
    'untracked-content\n',
  );
  const mirrored = await lstat(
    join(fixture.artifactDir, 'untracked', 'tool.sh'),
  );
  assert.equal(
    mirrored.mode & 0o111,
    0o111,
    'the mirrored untracked copy keeps its executable bit',
  );

  const manifest = await readManifest(fixture);
  await restoreToCleanBase(fixture, manifest);
  await reapplyArtifact(fixture, manifest);
  const restored = await lstat(join(fixture.repo, 'tool.sh'));
  assert.equal(restored.mode & 0o111, 0o111);
});

test('rejects a tampered artifact in --verify mode', async () => {
  const fixture = await createDirtyRepository();
  const result = await capture(fixture);
  const verifyArgs = [
    '--verify',
    '--artifact-dir',
    fixture.artifactDir,
    '--manifest-digest',
    result.manifestDigest,
    '--size',
    String(result.size),
  ];

  const clean = await runScript(verifyArgs);
  assert.equal(clean.code, 0, clean.stderr);
  assert.match(clean.stdout, /"ok": true/);

  const patchPath = join(fixture.artifactDir, 'worktree.patch');
  const bytes = await readFile(patchPath);
  bytes[bytes.length - 2] ^= 0x01;
  await writeFile(patchPath, bytes);

  const tampered = await runScript(verifyArgs);
  assert.equal(tampered.code, 5);
  assert.match(tampered.stderr, /"reason":"artifact-verification-failed"/);
  assert.match(tampered.stderr, /worktree\.patch digest mismatch/);
});

test('rejects an unreadable artifact file in --verify mode', async () => {
  const fixture = await createDirtyRepository();
  const result = await capture(fixture);

  // Replacing the component with a directory is unreadable regardless of the
  // privileges the test process happens to hold.
  const patchPath = join(fixture.artifactDir, 'index.patch');
  await rm(patchPath);
  await mkdir(patchPath);

  const unreadable = await runScript([
    '--verify',
    '--artifact-dir',
    fixture.artifactDir,
    '--manifest-digest',
    result.manifestDigest,
    '--size',
    String(result.size),
  ]);
  assert.equal(unreadable.code, 5);
  assert.match(unreadable.stderr, /"reason":"artifact-verification-failed"/);
  assert.match(unreadable.stderr, /index\.patch is unreadable/);
});

test('refuses an artifact that carries no round-trip seal', async () => {
  const fixture = await createDirtyRepository();
  const result = await capture(fixture);
  await rm(join(fixture.artifactDir, 'round-trip.proof'));

  const unproven = await runScript([
    '--verify',
    '--artifact-dir',
    fixture.artifactDir,
    '--manifest-digest',
    result.manifestDigest,
    '--size',
    String(result.size),
  ]);
  assert.equal(unproven.code, 5);
  assert.match(unproven.stderr, /never proven to replay/);
});

test('rejects an artifact whose recorded executable bit was tampered with', async () => {
  const fixture = await createDirtyRepository();
  const result = await capture(fixture);
  const verifyArgs = [
    '--verify',
    '--artifact-dir',
    fixture.artifactDir,
    '--manifest-digest',
    result.manifestDigest,
    '--size',
    String(result.size),
  ];
  assert.equal((await runScript(verifyArgs)).code, 0);

  // Bytes are untouched; only the mode changes. A digest-only verifier would
  // accept this and replay the untracked file without its executable bit.
  await chmod(join(fixture.artifactDir, 'untracked', 'tool.sh'), 0o644);

  const tampered = await runScript(verifyArgs);
  assert.equal(tampered.code, 5);
  assert.match(tampered.stderr, /executable-bit mismatch/);
});

test('refuses to verify without both expected brief values', async () => {
  const fixture = await createDirtyRepository();
  const result = await capture(fixture);

  for (const args of [
    ['--verify', '--artifact-dir', fixture.artifactDir],
    [
      '--verify',
      '--artifact-dir',
      fixture.artifactDir,
      '--manifest-digest',
      result.manifestDigest,
    ],
    [
      '--verify',
      '--artifact-dir',
      fixture.artifactDir,
      '--size',
      String(result.size),
    ],
  ]) {
    const incomplete = await runScript(args);
    assert.equal(incomplete.code, 5, args.join(' '));
    assert.match(incomplete.stderr, /--manifest-digest and --size/);
  }

  const wrongSize = await runScript([
    '--verify',
    '--artifact-dir',
    fixture.artifactDir,
    '--manifest-digest',
    result.manifestDigest,
    '--size',
    String(result.size + 1),
  ]);
  assert.equal(wrongSize.code, 5);
  assert.match(wrongSize.stderr, /sealed size mismatch/);
});

test('refuses to capture while a writer is still touching the worktree', async () => {
  const fixture = await createDirtyRepository();
  const before = await fingerprintRepository(fixture);

  const writer = setTimeout(() => {
    void appendFile(join(fixture.repo, 'text.txt'), 'STILL-WRITING\n');
  }, 300);

  try {
    await assert.rejects(
      capture(fixture, { quiesceIntervalMs: 1500 }),
      (error) =>
        error.reason === 'active-writer' &&
        /quiescence snapshots/.test(error.message),
    );
  } finally {
    clearTimeout(writer);
  }

  assert.equal(
    await lstat(fixture.artifactDir).then(
      () => 'present',
      () => 'absent',
    ),
    'absent',
    'no artifact is written when quiescence fails',
  );
  const observed = await fingerprintRepository(fixture);
  assert.equal(observed.head, before.head);
  assert.equal(observed.worktrees, before.worktrees);
  for (const path of fixture.contentPaths.filter(
    (candidate) => candidate !== 'text.txt',
  )) {
    assert.equal(observed.files[path], before.files[path], path);
  }
});

test('refuses to capture while a named writer process is still alive', async () => {
  const fixture = await createDirtyRepository();

  await assert.rejects(
    capture(fixture, { writerIdentity: `pid:${process.pid}` }),
    (error) =>
      error.reason === 'active-writer' && /still running/.test(error.message),
  );
  await assert.rejects(
    capture(fixture, { writerIdentity: '' }),
    (error) =>
      error.reason === 'active-writer' &&
      /writer identity was not supplied/.test(error.message),
  );
});

test('refuses to capture during an in-progress merge', async () => {
  const root = await mkdtemp(join(tmpdir(), 'oat-capture-merge-'));
  scratchRoots.push(root);
  const repo = await initRepository(root, 'repo');
  await writeFile(join(repo, 'conflict.txt'), 'base\n');
  await git(repo, 'add', 'conflict.txt');
  await git(repo, 'commit', '--quiet', '-m', 'base');
  await git(repo, 'checkout', '--quiet', '-b', 'other');
  await writeFile(join(repo, 'conflict.txt'), 'other\n');
  await git(repo, 'commit', '--quiet', '-am', 'other');
  await git(repo, 'checkout', '--quiet', 'main');
  await writeFile(join(repo, 'conflict.txt'), 'main\n');
  await git(repo, 'commit', '--quiet', '-am', 'main');
  await assert.rejects(git(repo, 'merge', 'other'));
  assert.equal(
    await lstat(join(repo, '.git', 'MERGE_HEAD')).then(
      () => 'present',
      () => 'absent',
    ),
    'present',
  );

  const before = sha256(await readFile(join(repo, 'conflict.txt')));
  const merged = await runScript([
    '--worktree',
    repo,
    '--artifact-dir',
    join(root, 'artifact'),
    '--writer-identity',
    'handle:phase-child-lost',
    '--quiesce-interval-ms',
    '25',
  ]);
  assert.equal(merged.code, 3);
  assert.match(merged.stderr, /"reason":"unsupported-dirt"/);
  assert.match(merged.stderr, /in-progress MERGE_HEAD/);
  assert.equal(sha256(await readFile(join(repo, 'conflict.txt'))), before);
});

test('refuses to capture a staged rename it could not restore per path', async () => {
  const root = await mkdtemp(join(tmpdir(), 'oat-capture-rename-'));
  scratchRoots.push(root);
  const repo = await initRepository(root, 'repo');
  await writeFile(join(repo, 'old.txt'), 'a\nb\nc\nd\ne\nf\ng\nh\n');
  await git(repo, 'add', 'old.txt');
  await git(repo, 'commit', '--quiet', '-m', 'base');
  await git(repo, 'mv', 'old.txt', 'new.txt');

  const before = await git(repo, 'status', '--porcelain=v2');
  const bytes = sha256(await readFile(join(repo, 'new.txt')));

  await assert.rejects(
    captureDirtyTree({
      worktree: repo,
      artifactDir: join(root, 'artifact'),
      writerIdentity: 'handle:phase-child-lost',
      quiesceIntervalMs: 25,
    }),
    (error) =>
      error.reason === 'unsupported-dirt' &&
      /staged rename or copy/.test(error.message),
  );

  assert.equal(await git(repo, 'status', '--porcelain=v2'), before);
  assert.equal(sha256(await readFile(join(repo, 'new.txt'))), bytes);
  assert.equal(
    await lstat(join(root, 'artifact')).then(
      () => 'present',
      () => 'absent',
    ),
    'absent',
  );
});

test('refuses a path that is both a tracked change and an untracked file', async () => {
  const root = await mkdtemp(join(tmpdir(), 'oat-capture-overlap-'));
  scratchRoots.push(root);
  const repo = await initRepository(root, 'repo');
  await writeFile(join(repo, 'both.txt'), 'tracked\n');
  await git(repo, 'add', 'both.txt');
  await git(repo, 'commit', '--quiet', '-m', 'base');
  await git(repo, 'rm', '--cached', '--quiet', 'both.txt');

  await assert.rejects(
    captureDirtyTree({
      worktree: repo,
      artifactDir: join(root, 'artifact'),
      writerIdentity: 'handle:phase-child-lost',
      quiesceIntervalMs: 25,
    }),
    (error) =>
      error.reason === 'unsupported-dirt' &&
      /both a tracked change and an untracked file/.test(error.message),
  );
});

test('derives the restore plan from literal filenames, not Git pathspec magic', async () => {
  const root = await mkdtemp(join(tmpdir(), 'oat-capture-pathspec-'));
  scratchRoots.push(root);
  const repo = await initRepository(root, 'repo');
  // A literal filename that Git would otherwise read as `:(top)decoy.txt`,
  // resolving to a top-level `decoy.txt` that is not in HEAD at all.
  const magic = ':(top)decoy.txt';
  await writeFile(join(repo, magic), 'in-head\n');
  await git(repo, 'add', '-A', '.');
  await git(repo, 'commit', '--quiet', '-m', 'base');
  await writeFile(join(repo, magic), 'changed\n');

  const result = await captureDirtyTree({
    worktree: repo,
    artifactDir: join(root, 'artifact'),
    writerIdentity: 'handle:phase-child-lost',
    quiesceIntervalMs: 25,
  });
  assert.deepEqual(result.restorePlan, [
    { path: magic, action: 'restore-from-head' },
  ]);
});

test('rejects a status stream whose paths are not valid UTF-8', async () => {
  const record = Buffer.concat([
    Buffer.from('1 .M N... 100644 100644 100644 aaaa bbbb ', 'utf8'),
    Buffer.from([0xff, 0xfe]),
    Buffer.from([0x00]),
  ]);

  assert.throws(
    () => parsePorcelainStatus(record),
    (error) =>
      error.reason === 'unsupported-dirt' &&
      /not valid UTF-8/.test(error.message),
  );
});

test('refuses to capture dirt outside the phase bounded files', async () => {
  const fixture = await createDirtyRepository();

  await assert.rejects(
    capture(fixture, { boundedFiles: ['text.txt'] }),
    (error) =>
      error.reason === 'unsupported-dirt' &&
      /outside the phase bounded_files/.test(error.message) &&
      error.outOfBounds.includes('worktree.bin'),
  );
});

test('refuses to capture an untracked entry that is not a regular file', async () => {
  const fixture = await createDirtyRepository();
  await symlink('text.txt', join(fixture.repo, 'dangling-link'));

  await assert.rejects(
    capture(fixture),
    (error) =>
      error.reason === 'unsupported-dirt' &&
      /dangling-link is not a regular file/.test(error.message),
  );
});

test('refuses to hand over an artifact that does not replay', async () => {
  const fixture = await createDirtyRepository();
  await capture(fixture);
  const before = await fingerprintRepository(fixture);

  // Drop the unstaged component while leaving the manifest self-consistent:
  // the exact silent loss the naive index-only recipe produces.
  const manifestPath = join(fixture.artifactDir, 'manifest.json');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const emptied = Buffer.alloc(0);
  await writeFile(join(fixture.artifactDir, 'worktree.patch'), emptied);
  for (const file of manifest.files) {
    if (file.path !== 'worktree.patch') continue;
    file.sha256 = sha256(emptied);
    file.bytes = 0;
  }
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  await assert.rejects(
    proveArtifactRoundTrip({
      worktree: fixture.repo,
      artifactDir: fixture.artifactDir,
    }),
    (error) =>
      error.reason === 'round-trip-failed' &&
      /does not match the captured worktree/.test(error.message),
  );
  assert.deepEqual(await fingerprintRepository(fixture), before);
});

test('refuses an artifact directory inside the worktree or on top of existing state', async () => {
  const fixture = await createDirtyRepository();

  await assert.rejects(
    capture(fixture, { artifactDir: join(fixture.repo, 'artifact') }),
    (error) =>
      error.reason === 'invalid-usage' &&
      /outside the worktree/.test(error.message),
  );

  // A symlinked ancestor pointing back into the worktree must be refused too;
  // lexical containment alone would accept it.
  await mkdir(join(fixture.repo, 'inside'), { recursive: true });
  await symlink(join(fixture.repo, 'inside'), join(fixture.root, 'sneaky'));
  await assert.rejects(
    capture(fixture, { artifactDir: join(fixture.root, 'sneaky', 'artifact') }),
    (error) =>
      error.reason === 'invalid-usage' &&
      /resolve outside the worktree/.test(error.message),
  );

  await assert.rejects(
    capture(fixture, {
      artifactDir: join(fixture.root, 'absent-parent', 'artifact'),
    }),
    (error) =>
      error.reason === 'invalid-usage' &&
      /exclusively beneath an existing parent/.test(error.message),
  );

  await mkdir(join(fixture.root, 'preexisting'), { recursive: true });
  await writeFile(join(fixture.root, 'preexisting', 'keep.txt'), 'keep\n');
  await assert.rejects(
    capture(fixture, { artifactDir: join(fixture.root, 'preexisting') }),
    (error) =>
      error.reason === 'invalid-usage' &&
      /must not already exist/.test(error.message),
  );
  assert.equal(
    await readFile(join(fixture.root, 'preexisting', 'keep.txt'), 'utf8'),
    'keep\n',
  );
});

test('reports a successful capture as JSON on stdout with exit 0', async () => {
  const fixture = await createDirtyRepository();

  const captured = await runScript([
    '--worktree',
    fixture.repo,
    '--artifact-dir',
    fixture.artifactDir,
    '--writer-identity',
    'handle:phase-child-lost',
    '--quiesce-interval-ms',
    '25',
  ]);
  assert.equal(captured.code, 0, captured.stderr);

  const result = JSON.parse(captured.stdout);
  assert.equal(result.ok, true);
  assert.equal(result.artifact, fixture.artifactDir);
  assert.match(result.manifestDigest, /^[0-9a-f]{64}$/);
  assert.ok(result.size > 0);
  assert.deepEqual(result.components, ['index', 'worktree', 'untracked']);

  const verified = await runScript([
    '--verify',
    '--artifact-dir',
    fixture.artifactDir,
    '--manifest-digest',
    result.manifestDigest,
    '--size',
    String(result.size),
  ]);
  assert.equal(verified.code, 0, verified.stderr);
});

test('the root and child contracts describe the sequence this script implements', async () => {
  const phase = await readFile(
    new URL('../references/phase-execution.md', import.meta.url),
    'utf8',
  );
  const child = await readFile(
    new URL('../../../agents/oat-phase-implementer.md', import.meta.url),
    'utf8',
  );

  for (const [name, contract] of [
    ['root', phase],
    ['child', child],
  ]) {
    assert.match(
      contract,
      /scripts\/capture-dirty-tree\.mjs/,
      `${name} contract names the capture script`,
    );
    for (const reason of [
      'active-writer',
      'unsupported-dirt',
      'round-trip-failed',
      'artifact-verification-failed',
    ]) {
      assert.ok(
        contract.includes(reason),
        `${name} contract names the ${reason} stop`,
      );
    }
    assert.match(contract, /recovered_patch/, `${name} contract field`);
  }
});
