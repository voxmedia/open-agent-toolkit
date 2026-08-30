import { mkdir, mkdtemp, realpath, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { CliError } from '@errors/index';
import { afterEach, describe, expect, it } from 'vitest';

import {
  normalizeToPosixPath,
  resolveManagedScopeRoots,
  resolveProjectRoot,
  resolveScopeRoot,
  toPosixPath,
  validatePathWithinScope,
  validateManagedPath,
  validateRealPathWithinScope,
} from './paths';

describe('fs/paths', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tempDirs.map(async (dir) => {
        await rm(dir, { recursive: true, force: true });
      }),
    );
    tempDirs.length = 0;
  });

  it('resolveProjectRoot finds nearest .git parent', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-paths-'));
    tempDirs.push(root);
    const nested = join(root, 'packages', 'cli', 'src');
    await mkdir(join(root, '.git'), { recursive: true });
    await mkdir(nested, { recursive: true });

    const projectRoot = await resolveProjectRoot(nested);

    expect(projectRoot).toBe(root);
  });

  it('resolveProjectRoot throws system-error exit code when no .git is found', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-paths-'));
    tempDirs.push(root);

    await expect(resolveProjectRoot(root)).rejects.toMatchObject({
      exitCode: 2,
    });
  });

  it('resolveScopeRoot returns cwd for project, homedir for user', () => {
    const cwd = '/tmp/project-root';
    const home = '/tmp/home-root';

    expect(resolveScopeRoot('project', cwd, home)).toBe(cwd);
    expect(resolveScopeRoot('user', cwd, home)).toBe(home);
  });

  it('validatePathWithinScope rejects paths outside scope root', () => {
    const scopeRoot = '/tmp/scope-root';
    const outsidePath = '/tmp/other-root/file';

    expect(() => validatePathWithinScope(outsidePath, scopeRoot)).toThrow(
      CliError,
    );
  });

  it('validatePathWithinScope returns resolved path for in-scope values', () => {
    const scopeRoot = '/tmp/scope-root';
    const insidePath = '/tmp/scope-root/child/file';

    const resolved = validatePathWithinScope(insidePath, scopeRoot);

    expect(resolved).toBe(insidePath);
  });

  it('validateRealPathWithinScope rejects missing and symlink-escaping paths', async () => {
    const scopeRoot = await mkdtemp(join(tmpdir(), 'oat-paths-scope-'));
    const outsideRoot = await mkdtemp(join(tmpdir(), 'oat-paths-outside-'));
    tempDirs.push(scopeRoot, outsideRoot);
    const escapingLink = join(scopeRoot, 'external-project');
    await symlink(outsideRoot, escapingLink, 'dir');

    await expect(
      validateRealPathWithinScope(join(scopeRoot, 'missing'), scopeRoot),
    ).rejects.toThrow(/real path/i);
    await expect(
      validateRealPathWithinScope(escapingLink, scopeRoot),
    ).rejects.toThrow(/outside scope root/i);
  });

  it('validateRealPathWithinScope canonicalizes an in-scope symlink to its in-scope real target', async () => {
    const scopeRoot = await mkdtemp(join(tmpdir(), 'oat-paths-scope-'));
    tempDirs.push(scopeRoot);
    const projectsRoot = join(scopeRoot, 'projects');
    const realProject = join(projectsRoot, 'real-project');
    const linkedProject = join(projectsRoot, 'linked-project');
    await mkdir(realProject, { recursive: true });
    await symlink('real-project', linkedProject, 'dir');

    await expect(
      validateRealPathWithinScope(linkedProject, scopeRoot),
    ).resolves.toEqual({
      realScopeRoot: await realpath(scopeRoot),
      realPath: await realpath(realProject),
    });
  });

  it('supports symlinked managed roots and fresh nested destinations', async () => {
    const scopeRoot = await mkdtemp(join(tmpdir(), 'oat-managed-scope-'));
    const externalAgents = await mkdtemp(join(tmpdir(), 'oat-managed-agents-'));
    tempDirs.push(scopeRoot, externalAgents);
    await symlink(externalAgents, join(scopeRoot, '.agents'), 'dir');
    await mkdir(join(externalAgents, 'skills'), { recursive: true });

    const roots = await resolveManagedScopeRoots(scopeRoot);
    await expect(
      validateManagedPath(
        join(scopeRoot, '.agents', 'skills', 'new-skill'),
        roots['.agents'],
      ),
    ).resolves.toEqual({
      realManagedRoot: await realpath(externalAgents),
      realPath: join(await realpath(externalAgents), 'skills', 'new-skill'),
    });
    await expect(
      validateManagedPath(
        join(scopeRoot, '.oat', 'templates', 'new-template.md'),
        roots['.oat'],
      ),
    ).resolves.toEqual({
      realManagedRoot: join(await realpath(scopeRoot), '.oat'),
      realPath: join(
        await realpath(scopeRoot),
        '.oat',
        'templates',
        'new-template.md',
      ),
    });
  });

  it('rejects nested managed-path symlink escapes with recovery details', async () => {
    const scopeRoot = await mkdtemp(join(tmpdir(), 'oat-managed-scope-'));
    const outsideRoot = await mkdtemp(join(tmpdir(), 'oat-managed-outside-'));
    tempDirs.push(scopeRoot, outsideRoot);
    await mkdir(join(scopeRoot, '.agents'), { recursive: true });
    await symlink(outsideRoot, join(scopeRoot, '.agents', 'skills'), 'dir');
    const candidate = join(scopeRoot, '.agents', 'skills', 'oat-brainstorm');
    const roots = await resolveManagedScopeRoots(scopeRoot);

    await expect(
      validateManagedPath(candidate, roots['.agents']),
    ).rejects.toThrow(
      new RegExp(
        `managed path.*${candidate.replaceAll('/', '\\/')}.*repoint`,
        'i',
      ),
    );
  });

  it('toPosixPath converts windows separators to posix separators', () => {
    expect(toPosixPath('folder\\child\\file')).toBe('folder/child/file');
  });

  it('normalizeToPosixPath normalizes segments and separators', () => {
    expect(normalizeToPosixPath('folder\\..\\child\\.\\file')).toBe(
      'child/file',
    );
  });
});
