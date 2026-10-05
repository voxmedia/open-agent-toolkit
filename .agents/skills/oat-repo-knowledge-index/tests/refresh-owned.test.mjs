import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import {
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rename,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  prepareOwnedRefresh,
  verifyOwnedOutputs,
} from '../scripts/refresh-owned.mjs';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const cli = join(repo, 'packages/cli/dist/index.js');
const outputs = [
  'project-index.md',
  'stack.md',
  'architecture.md',
  'structure.md',
  'integrations.md',
  'testing.md',
  'conventions.md',
  'concerns.md',
];
const marked = (body) => `---\noat_generated: true\n---\n\n${body}\n`;
const git = (root, ...args) =>
  execFileSync('git', args, { cwd: root, encoding: 'utf8' });

async function shippedShell(step, nextStep) {
  const skill = await readFile(
    join(repo, '.agents/skills/oat-repo-knowledge-index/SKILL.md'),
    'utf8',
  );
  const section = skill.slice(skill.indexOf(step), skill.indexOf(nextStep));
  return section.match(/```bash\n([\s\S]*?)```/u)[1];
}

async function fixture(t) {
  const root = await realpath(
    await mkdtemp(join(tmpdir(), 'knowledge-owned-')),
  );
  t.after(() => rm(root, { recursive: true, force: true }));
  const knowledge = join(root, '.oat/repo/knowledge');
  await mkdir(knowledge, { recursive: true });
  await writeFile(
    join(knowledge, 'manual.md'),
    '# Authored note\n\nKEEP MANUAL literal.\n',
  );
  await writeFile(
    join(knowledge, 'old-generated.md'),
    marked('Old generated literal.'),
  );
  await writeFile(
    join(knowledge, 'stack.md'),
    '# Unmarked output-name collision\n\nKEEP COLLISION literal.\n',
  );
  await writeFile(join(root, 'user.txt'), 'BASE user literal\n');
  git(root, 'init', '-q');
  git(root, 'config', 'user.email', 'test@example.com');
  git(root, 'config', 'user.name', 'Test');
  git(root, 'add', '.');
  git(root, 'commit', '-qm', 'seed');
  await writeFile(join(root, 'user.txt'), 'STAGED user literal\n');
  git(root, 'add', 'user.txt');
  await writeFile(join(root, 'user.txt'), 'UNSTAGED user literal\n');
  return { root, knowledge };
}

async function generatedOutputs(knowledge) {
  // Literal local marker/output contract, with no model or provider calls.
  for (const name of outputs)
    await writeFile(join(knowledge, name), marked(`NEW ${name}`));
}

async function preservation(root, knowledge) {
  assert.equal(
    await readFile(join(knowledge, 'manual.md'), 'utf8'),
    '# Authored note\n\nKEEP MANUAL literal.\n',
  );
  assert.equal(git(root, 'show', ':user.txt'), 'STAGED user literal\n');
  assert.equal(git(root, 'show', 'HEAD:user.txt'), 'BASE user literal\n');
  assert.equal(
    await readFile(join(root, 'user.txt'), 'utf8'),
    'UNSTAGED user literal\n',
  );
  assert.equal(
    git(root, 'status', '--porcelain', '--', 'user.txt').trim(),
    'MM user.txt',
  );
}

test('unmarked output collision stops before any generated deletion or user index mutation', async (t) => {
  const { root, knowledge } = await fixture(t);
  const index = await readFile(join(root, '.git/index'));
  const prepareShell = await shippedShell('### Step 2:', '### Step 3:');
  assert.throws(
    () =>
      execFileSync('bash', ['-c', prepareShell], {
        cwd: root,
        env: {
          ...process.env,
          SKILL_DIR: join(repo, '.agents/skills/oat-repo-knowledge-index'),
        },
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      }),
    (error) => {
      assert.equal(error.status, 1);
      assert.equal(error.stdout, '');
      assert.match(error.stderr, /Unmarked knowledge output collision/u);
      return true;
    },
  );
  assert.equal(
    await readFile(join(knowledge, 'stack.md'), 'utf8'),
    '# Unmarked output-name collision\n\nKEEP COLLISION literal.\n',
  );
  assert.equal(
    await readFile(join(knowledge, 'old-generated.md'), 'utf8'),
    marked('Old generated literal.'),
  );
  assert.deepEqual(await readFile(join(root, '.git/index')), index);
  await preservation(root, knowledge);
});

test('actual owned refresh and helper CLI commit preserve manual bytes and unrelated staged work', async (t) => {
  const { root, knowledge } = await fixture(t);
  await rename(
    join(knowledge, 'stack.md'),
    join(knowledge, 'stack-authored.md'),
  );
  git(
    root,
    'add',
    '--',
    '.oat/repo/knowledge/stack.md',
    '.oat/repo/knowledge/stack-authored.md',
  );
  git(
    root,
    'commit',
    '-qm',
    'relocate collision',
    '--',
    '.oat/repo/knowledge/stack.md',
    '.oat/repo/knowledge/stack-authored.md',
  );
  const index = await readFile(join(root, '.git/index'));
  const skill = await readFile(
    join(repo, '.agents/skills/oat-repo-knowledge-index/SKILL.md'),
    'utf8',
  );
  // The executable deletion/commit guidance is itself the consumer contract.
  assert.doesNotMatch(skill, /rm -rf[^\n]*\.oat\/repo\/knowledge\/\*\.md/u);
  const prepareShell = await shippedShell('### Step 2:', '### Step 3:');
  const environment = {
    ...process.env,
    SKILL_DIR: join(repo, '.agents/skills/oat-repo-knowledge-index'),
    KNOWLEDGE_NODE: process.execPath,
    KNOWLEDGE_CLI: cli,
    COMMIT_IDENTITY: 'knowledge-refresh-keeper',
    MERGE_BASE_SHA: git(root, 'rev-parse', 'HEAD').trim(),
  };
  const result = JSON.parse(
    execFileSync('bash', ['-c', prepareShell], {
      cwd: root,
      env: environment,
      encoding: 'utf8',
    }),
  );
  assert.deepEqual(
    result.removedPaths.map((path) => relative(knowledge, path)),
    ['old-generated.md'],
  );
  assert.deepEqual(
    result.outputPaths.map((path) => relative(knowledge, path)).sort(),
    [...outputs].sort(),
  );
  assert.deepEqual(
    result.affectedPaths.map((path) => relative(knowledge, path)).sort(),
    [...outputs, 'old-generated.md'].sort(),
  );
  assert.deepEqual(await readFile(join(root, '.git/index')), index);
  await generatedOutputs(knowledge);
  await verifyOwnedOutputs(root);
  execFileSync(join(repo, 'node_modules/.bin/oxfmt'), [
    '--write',
    ...result.outputPaths,
  ]);
  const commitShell = await shippedShell('### Step 10:', '### Step 10b:');
  execFileSync(
    'bash',
    [
      '-c',
      `set -e\noat() { "$KNOWLEDGE_NODE" "$KNOWLEDGE_CLI" --cwd "$REPO_ROOT" "$@"; }\n${commitShell}`,
      'knowledge-commit',
      ...result.affectedPaths.map((path) => relative(root, path)),
    ],
    { cwd: root, env: environment, encoding: 'utf8' },
  );
  const expected = [...outputs, 'old-generated.md']
    .map((name) => `.oat/repo/knowledge/${name}`)
    .sort();
  assert.deepEqual(
    git(
      root,
      'diff-tree',
      '--no-commit-id',
      '--name-only',
      '--no-renames',
      '-r',
      'HEAD',
    )
      .trim()
      .split('\n')
      .sort(),
    expected,
  );
  assert.equal(
    await readFile(join(knowledge, 'stack-authored.md'), 'utf8'),
    '# Unmarked output-name collision\n\nKEEP COLLISION literal.\n',
  );
  await preservation(root, knowledge);
});

test('broad-delete baseline fails the independent manual preservation oracle', async (t) => {
  const { root, knowledge } = await fixture(t);
  execFileSync('bash', ['-c', 'rm -rf .oat/repo/knowledge/*.md'], {
    cwd: root,
  });
  await generatedOutputs(knowledge);
  await assert.rejects(preservation(root, knowledge), /ENOENT/);
});

test('broad-commit baseline fails the independent staged-user preservation oracle', async (t) => {
  const { root, knowledge } = await fixture(t);
  await rename(
    join(knowledge, 'stack.md'),
    join(knowledge, 'stack-authored.md'),
  );
  await prepareOwnedRefresh(root);
  await generatedOutputs(knowledge);
  git(root, 'add', '.oat/repo/knowledge/');
  git(root, 'commit', '-qm', 'broad staged-index commit');
  assert.equal(git(root, 'show', 'HEAD:user.txt'), 'STAGED user literal\n');
  await assert.rejects(preservation(root, knowledge), {
    name: 'AssertionError',
    code: 'ERR_ASSERTION',
    actual: 'STAGED user literal\n',
    expected: 'BASE user literal\n',
  });
});

test('symlinked knowledge ancestors and expected output links never follow outside content', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'knowledge-symlink-'));
  const outside = await mkdtemp(join(tmpdir(), 'knowledge-outside-'));
  t.after(() =>
    Promise.all([
      rm(root, { recursive: true, force: true }),
      rm(outside, { recursive: true, force: true }),
    ]),
  );
  await writeFile(join(outside, 'stack.md'), marked('OUTSIDE literal'));
  await symlink(outside, join(root, '.oat'));
  await assert.rejects(prepareOwnedRefresh(root), /not an owned directory/);
  assert.equal(
    await readFile(join(outside, 'stack.md'), 'utf8'),
    marked('OUTSIDE literal'),
  );
  await rm(join(root, '.oat'));
  await mkdir(join(root, '.oat/repo/knowledge'), { recursive: true });
  await symlink(
    join(outside, 'stack.md'),
    join(root, '.oat/repo/knowledge/stack.md'),
  );
  await assert.rejects(
    prepareOwnedRefresh(root),
    /Unmarked knowledge output collision/,
  );
  assert.equal(
    await readFile(join(outside, 'stack.md'), 'utf8'),
    marked('OUTSIDE literal'),
  );
});

test('output verification refuses absent or unmarked generated output before commit', async (t) => {
  const { root, knowledge } = await fixture(t);
  await assert.rejects(verifyOwnedOutputs(root), /ENOENT/);
  await generatedOutputs(knowledge);
  await writeFile(join(knowledge, 'stack.md'), '# Authored\n');
  await assert.rejects(
    verifyOwnedOutputs(root),
    /Expected marked generated knowledge output/,
  );
});
