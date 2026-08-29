import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { defaultGitRunner } from '@commands/project/sync/git';
import { afterEach, describe, expect, it } from 'vitest';

import {
  applyOatCoreGitignore,
  ensureScopedRootGitignore,
  isSyncedRuleApplied,
} from './gitignore';

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'oat-gitignore-'));
  tempDirs.push(dir);
  return dir;
}

describe('applyOatCoreGitignore', () => {
  afterEach(async () => {
    await Promise.all(
      tempDirs.map((dir) => rm(dir, { recursive: true, force: true })),
    );
    tempDirs.length = 0;
  });

  it('creates .gitignore with core section when none exists', async () => {
    const root = await makeTempDir();

    const result = await applyOatCoreGitignore(root);

    expect(result.action).toBe('created');
    expect(result.entries).toContain('.oat/config.local.json');
    const content = await readFile(join(root, '.gitignore'), 'utf8');
    expect(content).toContain('# OAT core');
    expect(content).toContain('.oat/config.local.json');
    expect(content).toContain('!.oat/projects/local/.gitkeep');
    expect(content).toContain('# END OAT core');
  });

  it('appends core section to existing .gitignore', async () => {
    const root = await makeTempDir();
    await writeFile(join(root, '.gitignore'), 'node_modules\n', 'utf8');

    const result = await applyOatCoreGitignore(root);

    expect(result.action).toBe('updated');
    const content = await readFile(join(root, '.gitignore'), 'utf8');
    expect(content).toContain('node_modules');
    expect(content).toContain('# OAT core');
    expect(content).toContain('.oat/state.md');
  });

  it('returns no-change on idempotent re-run', async () => {
    const root = await makeTempDir();

    await applyOatCoreGitignore(root);
    const result = await applyOatCoreGitignore(root);

    expect(result.action).toBe('no-change');
  });

  it('untracks generated dashboard when repairing gitignore in a git repo', async () => {
    const root = await makeTempDir();
    execFileSync('git', ['init', '-q'], { cwd: root });
    mkdirSync(join(root, '.oat'), { recursive: true });
    await writeFile(join(root, '.oat', 'state.md'), '# dashboard\n', 'utf8');
    execFileSync('git', ['add', '.oat/state.md'], { cwd: root });

    const result = await applyOatCoreGitignore(root);

    expect(result.stateDashboardIndexAction).toBe('untracked');
    expect(existsSync(join(root, '.oat', 'state.md'))).toBe(true);
    expect(
      execFileSync('git', ['ls-files', '.oat/state.md'], {
        cwd: root,
        encoding: 'utf8',
      }).trim(),
    ).toBe('');
  });

  it('reports not-tracked when generated dashboard is already outside the index', async () => {
    const root = await makeTempDir();
    execFileSync('git', ['init', '-q'], { cwd: root });

    const result = await applyOatCoreGitignore(root);

    expect(result.stateDashboardIndexAction).toBe('not-tracked');
  });

  it('updates existing section when entries differ', async () => {
    const root = await makeTempDir();
    await writeFile(
      join(root, '.gitignore'),
      '# OAT core\n.oat/config.local.json\n# END OAT core\n',
      'utf8',
    );

    const result = await applyOatCoreGitignore(root);

    expect(result.action).toBe('updated');
    const content = await readFile(join(root, '.gitignore'), 'utf8');
    expect(content).toContain('.oat/state.md');
    expect(content).toContain('.oat/projects/local/**');
  });

  it('upgrades the prior core section with the synced directory-only rule', async () => {
    const root = await makeTempDir();
    await writeFile(
      join(root, '.gitignore'),
      [
        '# OAT core',
        '.oat/config.local.json',
        '.oat/state.md',
        '.oat/projects/local/**',
        '.oat/projects/archived/**',
        '!.oat/projects/local/.gitkeep',
        '!.oat/projects/archived/.gitkeep',
        '# END OAT core',
        '',
      ].join('\n'),
      'utf8',
    );

    const updated = await applyOatCoreGitignore(root);
    const repeated = await applyOatCoreGitignore(root);

    expect(updated.action).toBe('updated');
    expect(updated.entries).toContain('.oat/projects/synced/*/');
    expect(repeated.action).toBe('no-change');
  });

  it('ignores synced project directories but not sibling record files', async () => {
    const root = await makeTempDir();
    execFileSync('git', ['init', '-q'], { cwd: root });
    await applyOatCoreGitignore(root);

    expect(
      execFileSync(
        'git',
        ['check-ignore', '--no-index', '.oat/projects/synced/x/'],
        { cwd: root, stdio: 'ignore' },
      ),
    ).toBeNull();
    expect(() =>
      execFileSync(
        'git',
        ['check-ignore', '--no-index', '.oat/projects/synced/x.json'],
        { cwd: root, stdio: 'ignore' },
      ),
    ).toThrow();
    await expect(isSyncedRuleApplied(root)).resolves.toBe(true);
  });

  it('coexists with OAT local paths section', async () => {
    const root = await makeTempDir();
    const existing = [
      'node_modules',
      '',
      '# OAT local paths',
      '.oat/ideas/',
      '.oat/projects/**/pr/',
      '.oat/projects/**/reviews/archived/',
      '# END OAT local paths',
      '',
    ].join('\n');
    await writeFile(join(root, '.gitignore'), existing, 'utf8');

    const result = await applyOatCoreGitignore(root);

    expect(result.action).toBe('updated');
    const content = await readFile(join(root, '.gitignore'), 'utf8');
    expect(content).toContain('# OAT core');
    expect(content).toContain('# OAT local paths');
    expect(content).toContain('.oat/ideas/');
  });

  it.each([
    ['local', '/.oat/custom/local/**'],
    ['synced', '/.oat/custom/synced/*/'],
  ] as const)(
    'manages a custom %s root rule idempotently inside the core block',
    async (scope, expectedRule) => {
      const root = await makeTempDir();
      execFileSync('git', ['init', '-q'], { cwd: root });
      const scopeRoot = join(root, '.oat', 'custom', scope);

      const first = await ensureScopedRootGitignore(
        root,
        scopeRoot,
        scope,
        defaultGitRunner,
      );
      const repeated = await ensureScopedRootGitignore(
        root,
        scopeRoot,
        scope,
        defaultGitRunner,
      );

      expect(first.changed).toBe(true);
      expect(repeated.changed).toBe(false);
      const content = await readFile(join(root, '.gitignore'), 'utf8');
      expect(content.split(expectedRule)).toHaveLength(2);
      expect(content.indexOf(expectedRule)).toBeGreaterThan(
        content.indexOf('# OAT core'),
      );
      expect(content.indexOf(expectedRule)).toBeLessThan(
        content.indexOf('# END OAT core'),
      );
      if (scope === 'synced') {
        expect(content).toContain('/.oat/custom/archived/**');
      }
    },
  );

  it('moves a legacy custom rule into the managed core block', async () => {
    const root = await makeTempDir();
    execFileSync('git', ['init', '-q'], { cwd: root });
    const legacyRule = '/.oat/custom/synced/*/';
    await writeFile(join(root, '.gitignore'), `${legacyRule}\n`, 'utf8');
    execFileSync('git', ['add', '.gitignore'], { cwd: root });
    execFileSync(
      'git',
      [
        '-c',
        'user.name=OAT Test',
        '-c',
        'user.email=oat@example.com',
        'commit',
        '-q',
        '-m',
        'seed legacy gitignore',
      ],
      { cwd: root },
    );

    await ensureScopedRootGitignore(
      root,
      join(root, '.oat', 'custom', 'synced'),
      'synced',
      defaultGitRunner,
    );

    const content = await readFile(join(root, '.gitignore'), 'utf8');
    expect(content.split(legacyRule)).toHaveLength(2);
    expect(content.indexOf(legacyRule)).toBeGreaterThan(
      content.indexOf('# OAT core'),
    );
    expect(content.indexOf(legacyRule)).toBeLessThan(
      content.indexOf('# END OAT core'),
    );
  });

  it('repairs an unterminated managed block without treating its rules as managed', async () => {
    const root = await makeTempDir();
    execFileSync('git', ['init', '-q'], { cwd: root });
    const userRule = 'keep-user-rule';
    await writeFile(
      join(root, '.gitignore'),
      [
        '# OAT core',
        userRule,
        '/.oat/custom/synced/*/',
        '/.oat/custom/archived/**',
        '',
      ].join('\n'),
      'utf8',
    );
    execFileSync('git', ['add', '.gitignore'], { cwd: root });
    execFileSync(
      'git',
      [
        '-c',
        'user.name=OAT Test',
        '-c',
        'user.email=oat@example.com',
        'commit',
        '-q',
        '-m',
        'seed malformed gitignore',
      ],
      { cwd: root },
    );

    const result = await ensureScopedRootGitignore(
      root,
      join(root, '.oat', 'custom', 'synced'),
      'synced',
      defaultGitRunner,
    );

    expect(result.changed).toBe(true);
    const content = await readFile(join(root, '.gitignore'), 'utf8');
    expect(content.startsWith(`# OAT core\n${userRule}\n`)).toBe(true);
    expect(content).toContain('# END OAT core');
  });
});
