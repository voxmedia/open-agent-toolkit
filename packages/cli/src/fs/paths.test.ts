import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { CliError } from '../errors';
import {
  resolveProjectRoot,
  resolveScopeRoot,
  validatePathWithinScope,
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
});
