import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { CliError } from '@errors/index';
import { afterEach, describe, expect, it, vi } from 'vitest';

// Counts reads so the capture invariant below can be asserted directly rather
// than inferred from the shape of the implementation. Everything else passes
// straight through to the real module.
const fsProbe = vi.hoisted(() => ({ readFileCalls: [] as string[] }));
vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs/promises')>();
  return {
    ...actual,
    readFile: (...args: Parameters<typeof actual.readFile>) => {
      fsProbe.readFileCalls.push(String(args[0]));
      return actual.readFile(...args);
    },
  };
});

import {
  computeContentHash,
  computeDirectoryDigests,
  computeDirectoryHash,
  computeFileHash,
  computeStringHash,
} from './hash';

describe('computeStringHash', () => {
  it('produces deterministic SHA-256 for a string', () => {
    const first = computeStringHash('rendered provider content');
    const second = computeStringHash('rendered provider content');

    expect(first).toMatch(/^[a-f0-9]{64}$/);
    expect(first).toBe(second);
  });

  it('hash changes when string content changes', () => {
    expect(computeStringHash('one')).not.toBe(computeStringHash('two'));
  });
});

describe('computeDirectoryHash', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tempDirs.map(async (dir) => {
        await rm(dir, { recursive: true, force: true });
      }),
    );
    tempDirs.length = 0;
  });

  it('produces deterministic SHA-256 for a directory', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'oat-hash-'));
    tempDirs.push(dir);
    await mkdir(join(dir, 'nested'), { recursive: true });
    await writeFile(join(dir, 'a.txt'), 'alpha', 'utf8');
    await writeFile(join(dir, 'nested', 'b.txt'), 'beta', 'utf8');

    const first = await computeDirectoryHash(dir);
    const second = await computeDirectoryHash(dir);

    expect(first).toMatch(/^[a-f0-9]{64}$/);
    expect(first).toBe(second);
  });

  it('hash changes when file content changes', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'oat-hash-'));
    tempDirs.push(dir);
    await writeFile(join(dir, 'value.txt'), 'one', 'utf8');

    const before = await computeDirectoryHash(dir);
    await writeFile(join(dir, 'value.txt'), 'two', 'utf8');
    const after = await computeDirectoryHash(dir);

    expect(before).not.toBe(after);
  });

  it('hash is stable regardless of filesystem readdir order', async () => {
    const dirA = await mkdtemp(join(tmpdir(), 'oat-hash-a-'));
    const dirB = await mkdtemp(join(tmpdir(), 'oat-hash-b-'));
    tempDirs.push(dirA, dirB);

    await mkdir(join(dirA, 'nested'), { recursive: true });
    await mkdir(join(dirB, 'nested'), { recursive: true });

    await writeFile(join(dirA, 'z.txt'), 'zeta', 'utf8');
    await writeFile(join(dirA, 'nested', 'a.txt'), 'alpha', 'utf8');

    await writeFile(join(dirB, 'nested', 'a.txt'), 'alpha', 'utf8');
    await writeFile(join(dirB, 'z.txt'), 'zeta', 'utf8');

    const hashA = await computeDirectoryHash(dirA);
    const hashB = await computeDirectoryHash(dirB);

    expect(hashA).toBe(hashB);
  });

  it('distinguishes file sets that the unframed digest collided', async () => {
    // The wave-7 final review's collision witness. Before length framing the
    // digest was an unframed `relPath \0 content \0 …` stream; relative paths
    // cannot contain NUL but file *content* can, so a two-file set and a
    // one-file set whose content replays the delimiters produced the identical
    // stream and therefore the identical digest
    // (`2bb17da7d373d82dd09024613a5bc31764837c2590441dfbc0eda55d3bcd283c`).
    // That is what let a forged provider view drop `SKILL.md` and still match.
    const twoFiles = await mkdtemp(join(tmpdir(), 'oat-hash-two-'));
    const oneFile = await mkdtemp(join(tmpdir(), 'oat-hash-one-'));
    tempDirs.push(twoFiles, oneFile);

    await mkdir(join(twoFiles, 'references'), { recursive: true });
    await writeFile(join(twoFiles, 'references', 'p.md'), 'P', 'utf8');
    await writeFile(join(twoFiles, 'references', 'q.md'), 'Q', 'utf8');

    await mkdir(join(oneFile, 'references'), { recursive: true });
    await writeFile(
      join(oneFile, 'references', 'p.md'),
      'P\0references/q.md\0Q',
      'utf8',
    );

    expect(await computeDirectoryHash(twoFiles)).not.toBe(
      await computeDirectoryHash(oneFile),
    );
  });

  it('distinguishes an empty-file set that the unframed digest collided', async () => {
    // A second shape of the same ambiguity: an empty file contributes only its
    // two delimiters, so `{a.md: "", b.md: "X"}` and the single file
    // `{a.md: "\0b.md\0X"}` also produced the identical unframed stream. Length
    // framing separates them because the byte counts differ.
    const left = await mkdtemp(join(tmpdir(), 'oat-hash-left-'));
    const right = await mkdtemp(join(tmpdir(), 'oat-hash-right-'));
    tempDirs.push(left, right);

    await writeFile(join(left, 'a.md'), '', 'utf8');
    await writeFile(join(left, 'b.md'), 'X', 'utf8');
    await writeFile(join(right, 'a.md'), '\0b.md\0X', 'utf8');

    expect(await computeDirectoryHash(left)).not.toBe(
      await computeDirectoryHash(right),
    );
  });

  it('agrees with the framed digest computed by computeDirectoryDigests', async () => {
    // `computeDirectoryHash` streams and `computeDirectoryDigests` captures, so
    // the two implementations must be pinned against each other.
    const dir = await mkdtemp(join(tmpdir(), 'oat-hash-agree-'));
    tempDirs.push(dir);
    await mkdir(join(dir, 'references'), { recursive: true });
    await writeFile(join(dir, 'SKILL.md'), '# skill\n', 'utf8');
    await writeFile(join(dir, 'references', 'notes.md'), '# notes\n', 'utf8');
    await writeFile(join(dir, 'z'), '', 'utf8');

    const { framed } = await computeDirectoryDigests(dir);

    expect(await computeDirectoryHash(dir)).toBe(framed);
  });

  it('never produces a framed digest equal to a legacy digest', async () => {
    // Domain separation: the framed stream opens with a NUL byte and a legacy
    // stream opens with a relative path, which cannot contain NUL. Without it
    // the two encodings share a value space, and a recorded `contentHash`
    // carries no version to tell them apart.
    const dir = await mkdtemp(join(tmpdir(), 'oat-hash-domain-'));
    tempDirs.push(dir);
    await writeFile(join(dir, '8'), 'SKILL.md26\0# evil\n', 'utf8');
    await writeFile(join(dir, 'SKILL.md'), '# skill\n', 'utf8');

    const forged = await mkdtemp(join(tmpdir(), 'oat-hash-domain-forged-'));
    tempDirs.push(forged);
    await writeFile(
      join(forged, 'SKILL.md'),
      '# evil\n\0SKILL.md\0# skill\n\0',
      'utf8',
    );

    const { legacy } = await computeDirectoryDigests(dir);

    expect(await computeDirectoryHash(forged)).not.toBe(legacy);
  });

  it('reads each file exactly once so both digests describe one captured tree', async () => {
    // Two separate traversals would let the tree change between them, and the
    // pre-framing bridge in `drift/detector.ts` would then be able to pair a
    // `framed` digest taken from one canonical state with a `legacy` digest
    // taken from another — accepting a provider view the pre-framing detector
    // rejected. Both digests must be folded from one captured file set.
    const dir = await mkdtemp(join(tmpdir(), 'oat-hash-capture-'));
    tempDirs.push(dir);
    await mkdir(join(dir, 'references'), { recursive: true });
    await writeFile(join(dir, 'SKILL.md'), '# skill\n', 'utf8');
    await writeFile(join(dir, 'references', 'notes.md'), '# notes\n', 'utf8');

    fsProbe.readFileCalls.length = 0;
    await computeDirectoryDigests(dir);
    const reads = fsProbe.readFileCalls.filter((path) => path.startsWith(dir));

    expect(reads).toHaveLength(2);
    expect(new Set(reads).size).toBe(2);
  });

  it('throws CliError when directory does not exist', async () => {
    const missing = join(tmpdir(), 'oat-hash-missing-does-not-exist');

    await expect(computeDirectoryHash(missing)).rejects.toBeInstanceOf(
      CliError,
    );
  });
});

describe('computeFileHash', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tempDirs.map(async (dir) => {
        await rm(dir, { recursive: true, force: true });
      }),
    );
    tempDirs.length = 0;
  });

  it('produces deterministic SHA-256 for a file', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'oat-hash-file-'));
    tempDirs.push(dir);
    const filePath = join(dir, 'agent.md');
    await writeFile(filePath, '# My Agent\n', 'utf8');

    const first = await computeFileHash(filePath);
    const second = await computeFileHash(filePath);

    expect(first).toMatch(/^[a-f0-9]{64}$/);
    expect(first).toBe(second);
  });

  it('hash changes when file content changes', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'oat-hash-file-'));
    tempDirs.push(dir);
    const filePath = join(dir, 'agent.md');
    await writeFile(filePath, 'version one', 'utf8');

    const before = await computeFileHash(filePath);
    await writeFile(filePath, 'version two', 'utf8');
    const after = await computeFileHash(filePath);

    expect(before).not.toBe(after);
  });

  it('throws CliError when file does not exist', async () => {
    const missing = join(tmpdir(), 'oat-hash-file-missing-does-not-exist.md');

    await expect(computeFileHash(missing)).rejects.toBeInstanceOf(CliError);
  });
});

describe('computeContentHash', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tempDirs.map(async (dir) => {
        await rm(dir, { recursive: true, force: true });
      }),
    );
    tempDirs.length = 0;
  });

  it('dispatches to computeFileHash for file entries', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'oat-hash-content-'));
    tempDirs.push(dir);
    const filePath = join(dir, 'agent.md');
    await writeFile(filePath, '# Agent\n', 'utf8');

    const contentHash = await computeContentHash(filePath, true);
    const fileHash = await computeFileHash(filePath);

    expect(contentHash).toBe(fileHash);
  });

  it('dispatches to computeDirectoryHash for directory entries', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'oat-hash-content-'));
    tempDirs.push(dir);
    await writeFile(join(dir, 'file.txt'), 'content', 'utf8');

    const contentHash = await computeContentHash(dir, false);
    const dirHash = await computeDirectoryHash(dir);

    expect(contentHash).toBe(dirHash);
  });
});
