import { chmod, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { digestDirectory, digestFile } from './content-digest';

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'oat-content-digest-'));
  tempDirs.push(dir);
  return dir;
}

describe('content digests', () => {
  afterEach(async () => {
    await Promise.all(
      tempDirs.map((dir) => rm(dir, { recursive: true, force: true })),
    );
    tempDirs.length = 0;
  });

  it('distinguishes file bytes and executable mode', async () => {
    const root = await makeTempDir();
    const first = join(root, 'first');
    const second = join(root, 'second');
    await writeFile(first, 'same\n', { mode: 0o644 });
    await writeFile(second, 'same\n', { mode: 0o644 });

    await expect(digestFile(first)).resolves.toBe(await digestFile(second));

    await writeFile(second, 'different\n');
    await expect(digestFile(first)).resolves.not.toBe(await digestFile(second));

    await writeFile(second, 'same\n');
    await chmod(second, 0o755);
    await expect(digestFile(first)).resolves.not.toBe(await digestFile(second));
  });

  it('can normalize a bundled file to its manifest target mode', async () => {
    const root = await makeTempDir();
    const source = join(root, 'source.sh');
    const installed = join(root, 'installed.sh');
    await writeFile(source, '#!/bin/sh\n', { mode: 0o644 });
    await writeFile(installed, '#!/bin/sh\n', { mode: 0o755 });

    await expect(digestFile(source, 0o755)).resolves.toBe(
      await digestFile(installed),
    );
  });

  it('produces stable tree digests independent of creation order', async () => {
    const root = await makeTempDir();
    const first = join(root, 'first');
    const second = join(root, 'second');
    await mkdir(join(first, 'nested'), { recursive: true });
    await writeFile(join(first, 'z.txt'), 'z\n');
    await writeFile(join(first, 'nested', 'a.txt'), 'a\n');

    await mkdir(join(second, 'nested'), { recursive: true });
    await writeFile(join(second, 'nested', 'a.txt'), 'a\n');
    await writeFile(join(second, 'z.txt'), 'z\n');

    await expect(digestDirectory(first)).resolves.toBe(
      await digestDirectory(second),
    );

    await chmod(join(second, 'z.txt'), 0o755);
    await expect(digestDirectory(first)).resolves.not.toBe(
      await digestDirectory(second),
    );
  });
});
