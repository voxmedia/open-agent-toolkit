import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { checkStaleInvocations } from './stale-invocations';

const STALE_SCOPE_SYNC = ['oat', '--scope', 'all', 'sync'].join(' ');

describe('checkStaleInvocations', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tempDirs
        .splice(0)
        .map((path) => rm(path, { recursive: true, force: true })),
    );
  });

  async function createRepo(): Promise<string> {
    const root = await mkdtemp(join(tmpdir(), 'oat-stale-invocations-'));
    tempDirs.push(root);
    return root;
  }

  it('passes when bounded script and documentation surfaces are clean', async () => {
    const root = await createRepo();
    await mkdir(join(root, 'scripts'), { recursive: true });
    await mkdir(join(root, 'docs'), { recursive: true });
    await writeFile(
      join(root, 'scripts', 'bootstrap.sh'),
      'oat sync --scope all\n',
      'utf8',
    );
    await writeFile(
      join(root, 'docs', 'upgrade.md'),
      'Run `oat doctor --scope project` after upgrading.\n',
      'utf8',
    );

    const check = await checkStaleInvocations(root);

    expect(check).toMatchObject({
      name: 'project:stale_invocations',
      status: 'pass',
    });
    expect(check.message).toContain('No known-stale CLI invocations found');
  });

  it.each([
    ['space-delimited scope', STALE_SCOPE_SYNC],
    ['equals-delimited scope', 'oat --scope=all sync'],
  ])(
    'reports %s with file and line migration evidence',
    async (_label, stale) => {
      const root = await createRepo();
      const scriptPath = join(root, 'scripts', 'bootstrap.sh');
      await mkdir(join(root, 'scripts'), { recursive: true });
      await writeFile(
        scriptPath,
        ['#!/usr/bin/env bash', 'echo preparing', stale, 'echo done'].join(
          '\n',
        ),
        'utf8',
      );

      const check = await checkStaleInvocations(root);

      expect(check).toMatchObject({
        name: 'project:stale_invocations',
        status: 'warn',
        fix: expect.stringContaining('oat sync --scope all'),
      });
      expect(check.message).toContain('scripts/bootstrap.sh:3');
      expect(check.message).toContain(stale);
    },
  );

  it('excludes dependencies, build output, projects, archives, and generated provider views', async () => {
    const root = await createRepo();
    const excludedFiles = [
      'node_modules/tool/README.md',
      'dist/generated.js',
      'build/generated.sh',
      '.oat/projects/shared/demo/discovery.md',
      '.oat/repo/backlog/archived/old.md',
      '.claude/skills/generated/SKILL.md',
      '.cursor/rules/generated.mdc',
      '.codex/agents/generated.toml',
      '.github/agents/generated.md',
    ];
    await Promise.all(
      excludedFiles.map(async (relativePath) => {
        const absolutePath = join(root, relativePath);
        await mkdir(join(absolutePath, '..'), { recursive: true });
        await writeFile(absolutePath, `${STALE_SCOPE_SYNC}\n`, 'utf8');
      }),
    );

    const check = await checkStaleInvocations(root);

    expect(check.status).toBe('pass');
  });

  it('excludes nested worktrees, project artifacts, and generated provider views', async () => {
    const root = await createRepo();
    const primaryScript = join(root, 'scripts', 'bootstrap.sh');
    await mkdir(join(root, 'scripts'), { recursive: true });
    await writeFile(primaryScript, 'oat sync --scope all\n', 'utf8');

    const nestedExcludedFiles = [
      '.worktrees/demo/p06/.oat/projects/shared/demo/plan.md',
      '.worktrees/demo/p06/.cursor/rules/generated.mdc',
      'fixtures/nested-repo/.oat/projects/shared/demo/discovery.md',
      'fixtures/nested-repo/.oat/sync/manifest.json',
      'fixtures/nested-repo/.claude/skills/generated/SKILL.md',
      'fixtures/nested-repo/.codex/agents/generated.toml',
      'fixtures/nested-repo/.cursor/rules/generated.mdc',
      'fixtures/nested-repo/.gemini/commands/generated.toml',
      'fixtures/nested-repo/.github/agents/generated.md',
      'fixtures/nested-repo/.github/instructions/generated.instructions.md',
      'fixtures/nested-repo/.github/prompts/generated.md',
      'fixtures/nested-repo/.github/skills/generated/SKILL.md',
      'fixtures/nested-repo/.github/copilot-instructions.md',
    ];
    await Promise.all(
      nestedExcludedFiles.map(async (relativePath) => {
        const absolutePath = join(root, relativePath);
        await mkdir(join(absolutePath, '..'), { recursive: true });
        await writeFile(absolutePath, `${STALE_SCOPE_SYNC}\n`, 'utf8');
      }),
    );

    const check = await checkStaleInvocations(root);

    expect(check).toMatchObject({
      status: 'pass',
      message: expect.stringContaining('No known-stale CLI invocations found'),
    });
    expect(check.message).not.toContain('.worktrees');
    expect(check.message).not.toContain('nested-repo');
  });

  it('allows an intentional migration example marked on the same line', async () => {
    const root = await createRepo();
    await mkdir(join(root, 'docs'), { recursive: true });
    await writeFile(
      join(root, 'docs', 'migration.md'),
      `**Before:** \`${STALE_SCOPE_SYNC}\` <!-- oat-doctor: allow-stale-invocation -->\n`,
      'utf8',
    );

    const check = await checkStaleInvocations(root);

    expect(check.status).toBe('pass');
  });
});
