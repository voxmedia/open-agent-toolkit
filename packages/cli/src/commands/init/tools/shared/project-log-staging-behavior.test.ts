import { execFileSync } from 'node:child_process';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

const PROJECT_PATH = '.oat/projects/shared/demo';
const TRACKING_FILES = ['implementation.md', 'state.md', 'plan.md'] as const;

const tempDirs: string[] = [];

/**
 * Extracts the Step 7 phase-boundary bookkeeping block from the skill instead
 * of restating it, so this test fails when the documented sequence stops
 * staging the project log rather than when a copy of it drifts.
 */
function readPhaseBookkeepingBlock(): string {
  const content = readFileSync(
    join(
      import.meta.dirname,
      '../../../../../../../.agents/skills/oat-project-implement/references/phase-execution.md',
    ),
    'utf8',
  );
  const marker = content.indexOf('Bookkeeping is mandatory:');
  expect(marker).toBeGreaterThanOrEqual(0);

  const block = content.slice(marker).match(/```bash\n([\s\S]*?)```/);
  if (block?.[1] == null) {
    throw new Error('phase-execution.md is missing the bookkeeping block');
  }
  return block[1];
}

function instantiate(block: string): string {
  const sharedScopeStub = [
    'oat() {',
    '  if [ "$1" = "project" ] && [ "$2" = "scope" ]; then',
    '    printf "shared\\n"',
    '    return 0',
    '  fi',
    '  printf "unexpected oat invocation: %s\\n" "$*" >&2',
    '  return 127',
    '}',
  ].join('\n');

  const instantiatedBlock = block
    .split('\n')
    // `oat state refresh` writes a gitignored dashboard and is not on the
    // staging path under test.
    .filter((line) => !line.startsWith('oat state refresh'))
    .join('\n')
    .replaceAll('{PROJECT_PATH}', PROJECT_PATH)
    .replace('{pNN} {pass|fail}', 'p01 pass');

  return `${sharedScopeStub}\n${instantiatedBlock}`;
}

function git(cwd: string, ...args: string[]): string {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, LC_ALL: 'C' },
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function bash(cwd: string, script: string): void {
  execFileSync('bash', ['-c', script], {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, LC_ALL: 'C' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function status(cwd: string): string {
  return git(cwd, 'status', '--porcelain');
}

function setupProject(options: { withLog: boolean }): string {
  const root = mkdtempSync(join(tmpdir(), 'oat-project-log-staging-'));
  tempDirs.push(root);
  mkdirSync(join(root, PROJECT_PATH), { recursive: true });

  for (const file of TRACKING_FILES) {
    writeFileSync(join(root, PROJECT_PATH, file), `# ${file}\n`, 'utf8');
  }
  if (options.withLog) {
    writeFileSync(
      join(root, PROJECT_PATH, 'project-log.md'),
      '# Project Log: demo\n',
      'utf8',
    );
  }

  git(root, 'init', '--initial-branch=main');
  git(root, 'config', 'user.email', 'implementer@example.test');
  git(root, 'config', 'user.name', 'Implementer Test');
  git(root, 'config', 'commit.gpgsign', 'false');
  git(root, 'add', '-A');
  git(root, 'commit', '-m', 'baseline');
  return root;
}

/** Mirrors `oat project log append` writing to the tracked log. */
function appendLogEntry(root: string, body: string): void {
  const logPath = join(root, PROJECT_PATH, 'project-log.md');
  writeFileSync(
    logPath,
    `${readFileSync(logPath, 'utf8')}\n### 2026-07-25 · structural · ${body}\n`,
    'utf8',
  );
}

/** Mirrors a terminal path committing the log it appended. */
function commitLogOnly(root: string): void {
  git(root, 'add', '--', `${PROJECT_PATH}/project-log.md`);
  git(
    root,
    'commit',
    '-m',
    'chore(oat): record project log',
    '--',
    `${PROJECT_PATH}/project-log.md`,
  );
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe('project log staging behavior', () => {
  it('dirties the tracked worktree when an entry is appended', () => {
    const root = setupProject({ withLog: true });

    appendLogEntry(root, 'oat-project-implement · p01 dispatch');

    expect(status(root)).toContain('project-log.md');
  });

  it('leaves the worktree clean after the documented bookkeeping block', () => {
    const root = setupProject({ withLog: true });
    appendLogEntry(root, 'oat-project-implement · p01 outcome');
    writeFileSync(
      join(root, PROJECT_PATH, 'implementation.md'),
      '# implementation.md\n\n## p01\n',
      'utf8',
    );

    bash(root, instantiate(readPhaseBookkeepingBlock()));

    expect(status(root)).toBe('');
  });

  it('stays dirty when only the three original tracking artifacts are staged', () => {
    const root = setupProject({ withLog: true });
    appendLogEntry(root, 'oat-project-implement · p01 outcome');
    writeFileSync(
      join(root, PROJECT_PATH, 'implementation.md'),
      '# implementation.md\n\n## p01\n',
      'utf8',
    );

    // The pre-fix sequence: the guard this test exists to protect.
    bash(
      root,
      instantiate(readPhaseBookkeepingBlock())
        .split('\n')
        .filter((line) => !line.includes('project-log.md'))
        .join('\n'),
    );

    expect(status(root)).toContain('project-log.md');
  });

  it('commits cleanly for a project that has no log at all', () => {
    const root = setupProject({ withLog: false });
    writeFileSync(
      join(root, PROJECT_PATH, 'state.md'),
      '# state.md\n\nphase complete\n',
      'utf8',
    );

    bash(root, instantiate(readPhaseBookkeepingBlock()));

    expect(status(root)).toBe('');
    expect(git(root, 'show', '--name-only', '--format=', 'HEAD')).toBe(
      `${PROJECT_PATH}/state.md`,
    );
  });

  it('is clean at resume when a STOP append is committed by its terminal path', () => {
    const root = setupProject({ withLog: true });

    appendLogEntry(root, 'oat-project-implement · STOP checkpoint reached');
    commitLogOnly(root);

    // Resume dispatches a child, whose preflight requires a clean tree.
    expect(status(root)).toBe('');
  });

  it('is clean when a fix child is dispatched after a reviewer returns', () => {
    const root = setupProject({ withLog: true });

    // The reviewer's outcome is deferred to the terminal phase outcome, so
    // nothing is written between the reviewer returning and the fix dispatch.
    expect(status(root)).toBe('');

    appendLogEntry(root, 'oat-project-implement · p01 outcome fixes=1');
    commitLogOnly(root);

    expect(status(root)).toBe('');
  });
});
