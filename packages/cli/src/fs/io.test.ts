import { createHash } from 'node:crypto';
import {
  chmod,
  copyFile,
  lstat,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  readlink,
  rename,
  rm,
  stat,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { hostname as osHostname, tmpdir } from 'node:os';
import { dirname, isAbsolute, join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

const collectionCreationRace = vi.hoisted(() => ({
  beforePathBasedCreation: undefined as undefined | (() => Promise<void>),
  pathBasedCreationCalls: 0,
}));
const collectionRemovalRace = vi.hoisted(() => ({
  afterIdentityRead: undefined as undefined | (() => Promise<void>),
  pathBasedRemovalCalls: 0,
}));
const journalPublicationRace = vi.hoisted(() => ({
  afterLastAncestryCheck: undefined as undefined | (() => Promise<void>),
  beforePathBasedPublication: undefined as undefined | (() => Promise<void>),
  ancestryChecks: 0,
  publicationCalls: 0,
}));

vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs/promises')>();

  return {
    ...actual,
    symlink: async (...args: Parameters<typeof actual.symlink>) => {
      const [, linkPath] = args;
      if (
        collectionCreationRace.beforePathBasedCreation &&
        typeof linkPath === 'string' &&
        linkPath.endsWith('/.claude/skills')
      ) {
        collectionCreationRace.pathBasedCreationCalls += 1;
        await collectionCreationRace.beforePathBasedCreation();
      }
      return actual.symlink(...args);
    },
    readlink: async (...args: Parameters<typeof actual.readlink>) => {
      const linkText = await actual.readlink(...args);
      const [linkPath] = args;
      if (
        collectionRemovalRace.afterIdentityRead &&
        typeof linkPath === 'string' &&
        linkPath.endsWith('/.claude/skills')
      ) {
        const afterIdentityRead = collectionRemovalRace.afterIdentityRead;
        collectionRemovalRace.afterIdentityRead = undefined;
        await afterIdentityRead();
      }
      return linkText;
    },
    realpath: async (...args: Parameters<typeof actual.realpath>) => {
      const resolved = await actual.realpath(...args);
      const [target] = args;
      if (
        journalPublicationRace.afterLastAncestryCheck &&
        typeof target === 'string' &&
        target.endsWith('/dispatch')
      ) {
        journalPublicationRace.ancestryChecks += 1;
        // The first call establishes `realParent`; the second is the final
        // ancestry check immediately before path-based publication.
        if (journalPublicationRace.ancestryChecks === 2) {
          const barrier = journalPublicationRace.afterLastAncestryCheck;
          journalPublicationRace.afterLastAncestryCheck = undefined;
          await barrier();
        }
      }
      return resolved;
    },
    link: async (...args: Parameters<typeof actual.link>) => {
      if (journalPublicationRace.beforePathBasedPublication) {
        journalPublicationRace.publicationCalls += 1;
        const barrier = journalPublicationRace.beforePathBasedPublication;
        journalPublicationRace.beforePathBasedPublication = undefined;
        await barrier();
      }
      return actual.link(...args);
    },
    unlink: async (...args: Parameters<typeof actual.unlink>) => {
      const [linkPath] = args;
      if (
        typeof linkPath === 'string' &&
        linkPath.endsWith('/.claude/skills')
      ) {
        collectionRemovalRace.pathBasedRemovalCalls += 1;
      }
      return actual.unlink(...args);
    },
  };
});

import {
  atomicWriteJson,
  copyDirectory,
  createCollectionSymlinkNoClobber,
  createSymlink,
  dirExists,
  ensureDir,
  fileExists,
  publishContainedJsonRevision,
  removeCollectionSymlinkIfUnchanged,
  withContainedWriterLock,
} from './io';

describe('fs/io', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    collectionCreationRace.beforePathBasedCreation = undefined;
    collectionCreationRace.pathBasedCreationCalls = 0;
    collectionRemovalRace.afterIdentityRead = undefined;
    collectionRemovalRace.pathBasedRemovalCalls = 0;
    journalPublicationRace.afterLastAncestryCheck = undefined;
    journalPublicationRace.beforePathBasedPublication = undefined;
    journalPublicationRace.ancestryChecks = 0;
    journalPublicationRace.publicationCalls = 0;
    await Promise.all(
      tempDirs.map(async (dir) => {
        await rm(dir, { recursive: true, force: true });
      }),
    );
    tempDirs.length = 0;
  });

  it('createSymlink creates a directory symlink', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-io-'));
    tempDirs.push(root);
    const srcDir = join(root, 'src');
    const linkDir = join(root, 'target', 'link');
    await mkdir(srcDir, { recursive: true });

    const strategy = await createSymlink(srcDir, linkDir);

    const linkStat = await lstat(linkDir);
    expect(linkStat.isSymbolicLink()).toBe(true);
    expect(strategy).toBe('symlink');
  });

  it('fails closed when no securely guarded collection-link primitive is available', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-io-'));
    tempDirs.push(root);
    const canonical = join(root, '.agents', 'skills');
    const provider = join(root, '.claude', 'skills');
    await mkdir(canonical, { recursive: true });

    const parent = await lstat(root);
    await expect(
      createCollectionSymlinkNoClobber(canonical, provider, {
        scopeRoot: root,
        expectedParent: {
          device: String(parent.dev),
          inode: String(parent.ino),
        },
      }),
    ).rejects.toMatchObject({ code: 'E_COLLECTION_LINK_UNSAFE' });

    await expect(lstat(provider)).rejects.toMatchObject({ code: 'ENOENT' });
    await expect(lstat(dirname(provider))).rejects.toMatchObject({
      code: 'ENOENT',
    });
  });

  it('never reaches path-based final creation when ancestry could swap after validation', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-io-'));
    const outside = await mkdtemp(join(tmpdir(), 'oat-io-outside-'));
    tempDirs.push(root, outside);
    const canonical = join(root, '.agents', 'skills');
    const provider = join(root, '.claude', 'skills');
    await mkdir(canonical, { recursive: true });
    await mkdir(dirname(provider), { recursive: true });
    const parent = await lstat(dirname(provider));
    collectionCreationRace.beforePathBasedCreation = async () => {
      await rm(dirname(provider), { recursive: true, force: true });
      await symlink(outside, dirname(provider), 'dir');
    };

    await expect(
      createCollectionSymlinkNoClobber(canonical, provider, {
        scopeRoot: root,
        expectedParent: {
          device: String(parent.dev),
          inode: String(parent.ino),
        },
      }),
    ).rejects.toMatchObject({ code: 'E_COLLECTION_LINK_UNSAFE' });

    expect(collectionCreationRace.pathBasedCreationCalls).toBe(0);
    await expect(lstat(join(outside, 'skills'))).rejects.toMatchObject({
      code: 'ENOENT',
    });
  });

  it('preserves an EEXIST collection destination without fallback or removal', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-io-'));
    tempDirs.push(root);
    const canonical = join(root, '.agents', 'skills');
    const provider = join(root, '.claude', 'skills');
    await mkdir(canonical, { recursive: true });
    await mkdir(dirname(provider), { recursive: true });
    await writeFile(provider, 'foreign', 'utf8');
    const parent = await lstat(dirname(provider));

    await expect(
      createCollectionSymlinkNoClobber(canonical, provider, {
        scopeRoot: root,
        expectedParent: {
          device: String(parent.dev),
          inode: String(parent.ino),
        },
      }),
    ).rejects.toMatchObject({ code: 'EEXIST' });
    await expect(readFile(provider, 'utf8')).resolves.toBe('foreign');
  });

  it('refuses stale collection ancestry without creating through a replacement link', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-io-'));
    const outside = await mkdtemp(join(tmpdir(), 'oat-io-outside-'));
    tempDirs.push(root, outside);
    const canonical = join(root, '.agents', 'skills');
    const provider = join(root, '.claude', 'skills');
    await mkdir(canonical, { recursive: true });
    await mkdir(dirname(provider), { recursive: true });
    const expectedParent = await lstat(dirname(provider));
    await rm(dirname(provider), { recursive: true, force: true });
    await symlink(outside, dirname(provider), 'dir');

    await expect(
      createCollectionSymlinkNoClobber(canonical, provider, {
        scopeRoot: root,
        expectedParent: {
          device: String(expectedParent.dev),
          inode: String(expectedParent.ino),
        },
      }),
    ).rejects.toThrow(/ancestry/i);
    await expect(lstat(join(outside, 'skills'))).rejects.toMatchObject({
      code: 'ENOENT',
    });
  });

  it('preserves an unchanged collection link when guarded removal is unavailable', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-io-'));
    tempDirs.push(root);
    const canonical = join(root, '.agents', 'skills');
    const provider = join(root, '.claude', 'skills');
    await mkdir(canonical, { recursive: true });
    await mkdir(dirname(provider), { recursive: true });
    await symlink(canonical, provider, 'dir');
    const createdStat = await lstat(provider);
    const created = {
      linkText: await readlink(provider),
      device: String(createdStat.dev),
      inode: String(createdStat.ino),
    };

    await expect(
      removeCollectionSymlinkIfUnchanged(provider, created),
    ).resolves.toBe(false);
    expect((await lstat(provider)).isSymbolicLink()).toBe(true);
    expect(collectionRemovalRace.pathBasedRemovalCalls).toBe(0);
  });

  it('preserves a replacement swapped after the final identity read', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-io-'));
    tempDirs.push(root);
    const canonical = join(root, '.agents', 'skills');
    const provider = join(root, '.claude', 'skills');
    await mkdir(canonical, { recursive: true });
    await mkdir(dirname(provider), { recursive: true });
    await symlink(canonical, provider, 'dir');
    const createdStat = await lstat(provider);
    const created = {
      linkText: await readlink(provider),
      device: String(createdStat.dev),
      inode: String(createdStat.ino),
    };
    collectionRemovalRace.afterIdentityRead = async () => {
      await rm(provider);
      await writeFile(provider, 'user replacement', 'utf8');
    };

    await expect(
      removeCollectionSymlinkIfUnchanged(provider, created),
    ).resolves.toBe(false);

    expect(collectionRemovalRace.pathBasedRemovalCalls).toBe(0);
    await expect(readFile(provider, 'utf8')).resolves.toBe('user replacement');
  });

  it('createSymlink uses relative target when given absolute paths', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-io-'));
    tempDirs.push(root);
    const srcDir = join(root, 'canonical', 'agents');
    const linkDir = join(root, 'provider', 'agents', 'link');
    await mkdir(srcDir, { recursive: true });

    await createSymlink(srcDir, linkDir);

    const linkTarget = await readlink(linkDir);
    expect(isAbsolute(linkTarget)).toBe(false);
    // Verify the symlink still resolves correctly
    const linkStat = await lstat(linkDir);
    expect(linkStat.isSymbolicLink()).toBe(true);
  });

  it('createSymlink creates a file symlink with relative target', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-io-'));
    tempDirs.push(root);
    const srcFile = join(root, 'canonical', 'agent.md');
    const linkFile = join(root, 'provider', 'agent.md');
    await mkdir(join(root, 'canonical'), { recursive: true });
    await writeFile(srcFile, 'content', 'utf8');

    await createSymlink(srcFile, linkFile, undefined, true);

    const linkTarget = await readlink(linkFile);
    expect(isAbsolute(linkTarget)).toBe(false);
    // Verify the symlink resolves and content is readable
    expect(await readFile(linkFile, 'utf8')).toBe('content');
  });

  it('createSymlink with copy fallback copies directory when symlink fails', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-io-'));
    tempDirs.push(root);
    const srcDir = join(root, 'src');
    const linkDir = join(root, 'link');

    await mkdir(srcDir, { recursive: true });
    await writeFile(join(srcDir, 'a.txt'), 'copied', 'utf8');
    await writeFile(linkDir, 'existing-file', 'utf8');

    const onFallback = vi.fn();
    const strategy = await createSymlink(srcDir, linkDir, onFallback);

    const entries = await readdir(linkDir);
    expect(entries).toContain('a.txt');
    expect(await readFile(join(linkDir, 'a.txt'), 'utf8')).toBe('copied');
    expect(strategy).toBe('copy');
    expect(onFallback).toHaveBeenCalledTimes(1);
  });

  it('copyDirectory recursively copies all files', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-io-'));
    tempDirs.push(root);
    const srcDir = join(root, 'src');
    const destDir = join(root, 'dest');
    await mkdir(join(srcDir, 'nested'), { recursive: true });
    await writeFile(join(srcDir, 'root.txt'), 'root', 'utf8');
    await writeFile(join(srcDir, 'nested', 'child.txt'), 'child', 'utf8');

    await copyDirectory(srcDir, destDir);

    expect(await readFile(join(destDir, 'root.txt'), 'utf8')).toBe('root');
    expect(await readFile(join(destDir, 'nested', 'child.txt'), 'utf8')).toBe(
      'child',
    );
  });

  it('copyDirectory filters entries by source-relative path', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-io-'));
    tempDirs.push(root);
    const srcDir = join(root, 'src');
    const destDir = join(root, 'dest');
    await mkdir(join(srcDir, 'reviews'), { recursive: true });
    await writeFile(join(srcDir, '.git'), 'gitdir: elsewhere\n', 'utf8');
    await writeFile(join(srcDir, 'state.md'), 'state', 'utf8');
    await writeFile(join(srcDir, 'reviews', 'review.md'), 'review', 'utf8');

    await copyDirectory(
      srcDir,
      destDir,
      (_source, relativePath) =>
        relativePath !== '.git' && relativePath !== 'reviews',
    );

    expect(await readFile(join(destDir, 'state.md'), 'utf8')).toBe('state');
    await expect(readFile(join(destDir, '.git'), 'utf8')).rejects.toThrow();
    await expect(
      readFile(join(destDir, 'reviews', 'review.md'), 'utf8'),
    ).rejects.toThrow();
  });

  it('copyDirectory preserves executable mode on nested files', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-io-'));
    tempDirs.push(root);
    const srcDir = join(root, 'src');
    const destDir = join(root, 'dest');
    await mkdir(join(srcDir, 'scripts'), { recursive: true });
    await writeFile(join(srcDir, 'plain.md'), 'plain', 'utf8');
    await writeFile(
      join(srcDir, 'scripts', 'run.sh'),
      '#!/bin/sh\necho run\n',
      'utf8',
    );
    await chmod(join(srcDir, 'scripts', 'run.sh'), 0o755);

    await copyDirectory(srcDir, destDir);

    const scriptStat = await stat(join(destDir, 'scripts', 'run.sh'));
    expect(scriptStat.mode & 0o111).not.toBe(0);
  });

  it('atomicWriteJson writes to temp then renames', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-io-'));
    tempDirs.push(root);
    const output = join(root, 'data', 'output.json');

    await atomicWriteJson(output, { ok: true, count: 1 });

    const parsed = JSON.parse(await readFile(output, 'utf8'));
    expect(parsed).toEqual({ ok: true, count: 1 });
    await expect(readFile(`${output}.tmp`, 'utf8')).rejects.toThrow();
  });

  it('publishes immutable revisions and refuses to replace an existing name', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-io-json-'));
    tempDirs.push(root);
    const first = join(root, 'dispatch', 'request-1.json');
    const second = join(root, 'dispatch', 'request-1@0002.json');

    await publishContainedJsonRevision(first, { version: 1 }, root);
    await expect(readFile(first, 'utf8')).resolves.toContain('"version": 1');
    await publishContainedJsonRevision(second, { version: 2 }, root);
    await expect(readFile(second, 'utf8')).resolves.toContain('"version": 2');
    // Revision 1 is immutable; publication never replaces a published name.
    await expect(readFile(first, 'utf8')).resolves.toContain('"version": 1');

    await expect(
      publishContainedJsonRevision(first, { version: 99 }, root),
    ).rejects.toMatchObject({ code: 'EEXIST' });
    await expect(readFile(first, 'utf8')).resolves.toContain('"version": 1');

    await expect(
      publishContainedJsonRevision(join(root, '..', 'outside.json'), {}, root),
    ).rejects.toThrow(/outside/i);
  });

  it('rejects a symlinked journal directory without writing outside scope', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-io-json-'));
    const outside = await mkdtemp(join(tmpdir(), 'oat-io-json-outside-'));
    tempDirs.push(root, outside);
    await symlink(outside, join(root, 'dispatch'), 'dir');

    await expect(
      publishContainedJsonRevision(
        join(root, 'dispatch', 'request-1.json'),
        { safe: true },
        root,
      ),
    ).rejects.toThrow(/outside|symlink/i);
    await expect(
      readFile(join(outside, 'request-1.json'), 'utf8'),
    ).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('never emits an absolute path in a publication failure message', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-io-json-'));
    tempDirs.push(root);
    const file = join(root, 'dispatch', 'request-1.json');
    await publishContainedJsonRevision(file, { owner: 'first' }, root);

    const error = await publishContainedJsonRevision(
      file,
      { owner: 'second' },
      root,
    ).catch((raised: Error) => raised);

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).not.toContain(root);
    expect((error as Error).message).not.toContain(tmpdir());
    expect((error as Error).message).toContain('dispatch/request-1.json');
  });

  const VICTIM = '{"victim":"unrelated user data"}';

  async function journalFixture(options: { victim: boolean }) {
    const root = await mkdtemp(join(tmpdir(), 'oat-io-json-'));
    const outside = await mkdtemp(join(tmpdir(), 'oat-io-json-outside-'));
    tempDirs.push(root, outside);
    const dispatchDir = join(root, 'dispatch');
    const file = join(dispatchDir, 'request-1.json');
    await mkdir(dispatchDir, { recursive: true });
    await publishContainedJsonRevision(file, { owner: 'first' }, root);
    await writeFile(join(outside, 'keep.txt'), 'keep', 'utf8');
    if (options.victim) {
      await writeFile(join(outside, 'request-1@0002.json'), VICTIM, 'utf8');
    }
    const swapDispatchDirectory = async () => {
      await rename(dispatchDir, join(root, 'dispatch-real'));
      await symlink(outside, dispatchDir, 'dir');
    };
    return {
      root,
      outside,
      dispatchDir,
      // The next append-only revision, which is what an update publishes.
      next: join(dispatchDir, 'request-1@0002.json'),
      swapDispatchDirectory,
    };
  }

  async function expectVictimIntact(outside: string) {
    await expect(
      readFile(join(outside, 'request-1@0002.json'), 'utf8'),
    ).resolves.toBe(VICTIM);
    await expect(readFile(join(outside, 'keep.txt'), 'utf8')).resolves.toBe(
      'keep',
    );
  }

  it.each([true, false])(
    'fails closed when the journal directory is swapped right after the last ancestry check (victim: %s)',
    async (victim) => {
      const fixture = await journalFixture({ victim });
      journalPublicationRace.afterLastAncestryCheck =
        fixture.swapDispatchDirectory;

      await expect(
        publishContainedJsonRevision(
          fixture.next,
          { owner: 'second' },
          fixture.root,
        ),
      ).rejects.toThrow(/directory identity changed before publication/i);

      expect(journalPublicationRace.ancestryChecks).toBe(2);
      if (victim) await expectVictimIntact(fixture.outside);
      await expect(
        readFile(join(fixture.root, 'dispatch-real', 'request-1.json'), 'utf8'),
      ).resolves.toContain('"owner": "first"');
    },
  );

  it.each([true, false])(
    'never destroys out-of-scope content when the swap lands immediately before publication (victim: %s)',
    async (victim) => {
      const fixture = await journalFixture({ victim });
      journalPublicationRace.beforePathBasedPublication =
        fixture.swapDispatchDirectory;

      await expect(
        publishContainedJsonRevision(
          fixture.next,
          { owner: 'second' },
          fixture.root,
        ),
      ).rejects.toThrow();

      expect(journalPublicationRace.publicationCalls).toBe(1);
      if (victim) await expectVictimIntact(fixture.outside);
      await expect(
        readFile(join(fixture.root, 'dispatch-real', 'request-1.json'), 'utf8'),
      ).resolves.toContain('"owner": "first"');
    },
  );

  it.each([true, false])(
    'reports without removing anything when a publication lands outside the validated directory (victim: %s)',
    async (victim) => {
      const fixture = await journalFixture({ victim });
      journalPublicationRace.beforePathBasedPublication = async () => {
        // A privileged process that both stages this call's exact temporary
        // name inside a directory it controls and swaps the validated pathname,
        // so the create-only publication can succeed against foreign ancestry.
        const staged = (await readdir(fixture.dispatchDir)).find((name) =>
          name.endsWith('.tmp'),
        );
        if (staged) {
          await copyFile(
            join(fixture.dispatchDir, staged),
            join(fixture.outside, staged),
          );
        }
        await fixture.swapDispatchDirectory();
      };

      const error = await publishContainedJsonRevision(
        fixture.next,
        { owner: 'second' },
        fixture.root,
      ).catch((raised: Error) => raised);

      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).not.toContain(fixture.root);
      expect((error as Error).message).not.toContain(fixture.outside);
      if (victim) {
        // `link` cannot clobber, so the foreign file survives byte-for-byte.
        expect((error as Error).message).toMatch(/publication failed/i);
        await expectVictimIntact(fixture.outside);
      } else {
        // Documented residual: an unreferenced create outside the validated
        // directory. It is never removed, because this call cannot prove it
        // owns a name under ancestry it no longer controls.
        expect((error as Error).message).toMatch(
          /removed and replaced nothing/i,
        );
        await expect(
          readFile(join(fixture.outside, 'request-1@0002.json'), 'utf8'),
        ).resolves.toContain('"owner": "second"');
      }
      await expect(
        readFile(join(fixture.outside, 'keep.txt'), 'utf8'),
      ).resolves.toBe('keep');
      await expect(
        readFile(join(fixture.root, 'dispatch-real', 'request-1.json'), 'utf8'),
      ).resolves.toContain('"owner": "first"');
    },
  );

  it('wraps a raw publication ENOENT without leaking an absolute path', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-io-json-'));
    tempDirs.push(root);
    const dispatchDir = join(root, 'dispatch');
    await mkdir(dispatchDir, { recursive: true });
    journalPublicationRace.beforePathBasedPublication = async () => {
      const staged = (await readdir(dispatchDir)).find((name) =>
        name.endsWith('.tmp'),
      );
      if (staged) await rm(join(dispatchDir, staged));
    };

    const error = await publishContainedJsonRevision(
      join(dispatchDir, 'request-1.json'),
      { owner: 'first' },
      root,
    ).catch((raised: Error) => raised);

    expect(error).toMatchObject({ code: 'ENOENT' });
    expect((error as Error).message).not.toContain(root);
    expect((error as Error).message).toContain('dispatch/request-1.json');
  });

  const DEAD_PID = 999999;

  function holderJson(pid: number) {
    return `${JSON.stringify({
      hostId: createHash('sha256')
        .update(osHostname(), 'utf8')
        .digest('hex')
        .slice(0, 16),
      pid,
      processStartedAt: Date.now(),
      acquiredAt: new Date().toISOString(),
    })}\n`;
  }

  it('reclaims a lock whose recorded holder is no longer running', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-io-lock-'));
    tempDirs.push(root);
    const lock = join(root, '.dispatch-lock');
    await mkdir(lock);
    await writeFile(join(lock, 'holder.json'), holderJson(DEAD_PID), 'utf8');

    await expect(
      withContainedWriterLock(lock, root, async () => 'ran', {
        timeoutMs: 200,
        minReclaimMs: 0,
      }),
    ).resolves.toBe('ran');
    await expect(lstat(lock)).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('reclaims a lock past the staleness cap when the holder is unknown', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-io-lock-'));
    tempDirs.push(root);
    const lock = join(root, '.dispatch-lock');
    await mkdir(lock);

    await expect(
      withContainedWriterLock(lock, root, async () => 'ran', {
        timeoutMs: 200,
        minReclaimMs: 0,
        hardStaleMs: 0,
      }),
    ).resolves.toBe('ran');
  });

  it('never reclaims a live holder and reports a redacted lock path', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-io-lock-'));
    tempDirs.push(root);
    const lock = join(root, '.dispatch-lock');
    await mkdir(lock);
    await writeFile(join(lock, 'holder.json'), holderJson(process.pid), 'utf8');

    const error = await withContainedWriterLock(lock, root, async () => 'ran', {
      timeoutMs: 60,
      minReclaimMs: 0,
      hardStaleMs: 60_000,
    }).catch((raised: Error) => raised);

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toContain('.dispatch-lock');
    expect((error as Error).message).not.toContain(root);
    expect((error as Error).message).not.toContain(tmpdir());
    // The live holder's lock is left exactly as it was found.
    await expect(
      readFile(join(lock, 'holder.json'), 'utf8'),
    ).resolves.toContain(`"pid":${process.pid}`);
  });

  it('records non-identifying holder evidence while the lock is held', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-io-lock-'));
    tempDirs.push(root);
    const lock = join(root, '.dispatch-lock');

    const holder = await withContainedWriterLock(lock, root, async () =>
      JSON.parse(await readFile(join(lock, 'holder.json'), 'utf8')),
    );

    expect(holder).toMatchObject({ pid: process.pid });
    expect(holder.hostId).toMatch(/^[a-f0-9]{16}$/);
    expect(JSON.stringify(holder)).not.toContain(osHostname());
    await expect(lstat(lock)).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('ensureDir creates directory recursively', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-io-'));
    tempDirs.push(root);
    const nested = join(root, 'a', 'b', 'c');

    await ensureDir(nested);

    const dirStat = await lstat(nested);
    expect(dirStat.isDirectory()).toBe(true);
  });

  it('fileExists returns true for existing files and false when missing', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-io-'));
    tempDirs.push(root);
    const file = join(root, 'exists.txt');
    const dir = join(root, 'dir');
    await writeFile(file, 'present', 'utf8');
    await mkdir(dir, { recursive: true });

    await expect(fileExists(file)).resolves.toBe(true);
    await expect(fileExists(join(root, 'missing.txt'))).resolves.toBe(false);
    await expect(fileExists(dir)).resolves.toBe(false);
  });

  it('dirExists returns true for existing directories and false when missing', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-io-'));
    tempDirs.push(root);
    const dir = join(root, 'exists-dir');
    const file = join(root, 'file.txt');
    await mkdir(dir, { recursive: true });
    await writeFile(file, 'present', 'utf8');

    await expect(dirExists(dir)).resolves.toBe(true);
    await expect(dirExists(join(root, 'missing-dir'))).resolves.toBe(false);
    await expect(dirExists(file)).resolves.toBe(false);
  });
});
