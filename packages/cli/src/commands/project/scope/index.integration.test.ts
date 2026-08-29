import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, it } from 'vitest';

const tempDirs: string[] = [];
const cliPath = fileURLToPath(
  new URL('../../../../dist/index.js', import.meta.url),
);

afterEach(async () => {
  await Promise.all(
    tempDirs
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe('project scope CLI boundary', () => {
  it('reports canonical path failures as stable path-specific CLI errors', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-scope-cli-'));
    tempDirs.push(root);
    await mkdir(join(root, '.git'));
    const blockedPath = join(root, 'blocked');
    await writeFile(blockedPath, 'not a directory\n', 'utf8');

    const result = spawnSync(
      process.execPath,
      [cliPath, '--cwd', root, '--json', 'project', 'scope', 'demo'],
      {
        encoding: 'utf8',
        env: {
          ...process.env,
          OAT_PROJECTS_ROOT: 'blocked/child',
        },
      },
    );

    expect(result.status).toBe(2);
    expect(result.stderr).toBe('');
    expect(JSON.parse(result.stdout)).toMatchObject({
      status: 'error',
      message: expect.stringContaining(
        `Unable to resolve canonical path \`${join(blockedPath, 'child')}\``,
      ),
    });
  });
});
