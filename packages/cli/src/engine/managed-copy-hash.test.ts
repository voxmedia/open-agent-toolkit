import { cp, mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { computeDirectoryHash } from '@manifest/hash';
import { afterEach, describe, expect, it } from 'vitest';

import { computeManagedDirectoryCopyHash } from './managed-copy-hash';
import {
  insertMarker,
  OAT_DIRECTORY_SENTINEL,
  OAT_MARKER_PREFIX,
  writeDirectorySentinel,
} from './markers';

interface Fixture {
  root: string;
  canonicalPath: string;
  providerPath: string;
}

describe('computeManagedDirectoryCopyHash', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tempDirs.map(async (dir) => {
        await rm(dir, { recursive: true, force: true });
      }),
    );
    tempDirs.length = 0;
  });

  /**
   * Seeds a canonical skill directory and copies it to the provider path the
   * way `execute-plan.ts` does: `copyDirectory`, then `applyCopyMarker` (the
   * sentinel plus the banner), using the same absolute canonical path string
   * the reader later passes back in.
   */
  async function seedManagedCopy(): Promise<Fixture> {
    const root = await mkdtemp(join(tmpdir(), 'oat-managed-copy-hash-'));
    tempDirs.push(root);
    const canonicalPath = join(root, '.agents', 'skills', 'skill-one');
    const providerPath = join(root, '.claude', 'skills', 'skill-one');

    await mkdir(join(canonicalPath, 'reference'), { recursive: true });
    await writeFile(
      join(canonicalPath, 'SKILL.md'),
      '---\nname: skill-one\n---\n\n# skill one\n',
      'utf8',
    );
    await writeFile(
      join(canonicalPath, 'reference', 'notes.md'),
      '# nested notes\n',
      'utf8',
    );

    await mkdir(join(providerPath, '..'), { recursive: true });
    await cp(canonicalPath, providerPath, { recursive: true });
    await writeDirectorySentinel(providerPath, canonicalPath);
    await insertMarker(join(providerPath, 'SKILL.md'), canonicalPath);

    return { root, canonicalPath, providerPath };
  }

  it('equals computeDirectoryHash of the canonical directory for a faithful managed copy', async () => {
    const { canonicalPath, providerPath } = await seedManagedCopy();

    const managedHash = await computeManagedDirectoryCopyHash(
      providerPath,
      canonicalPath,
      'skill',
    );

    // The load-bearing property: the digest the readers compare is exactly the
    // canonical directory hash `execute-plan.ts` records as `contentHash`.
    expect(managedHash).not.toBeNull();
    expect(managedHash).toBe(await computeDirectoryHash(canonicalPath));
  });

  it('returns null when the sentinel is absent', async () => {
    const { canonicalPath, providerPath } = await seedManagedCopy();
    await rm(join(providerPath, OAT_DIRECTORY_SENTINEL));

    await expect(
      computeManagedDirectoryCopyHash(providerPath, canonicalPath, 'skill'),
    ).resolves.toBeNull();
  });

  it('returns null when the sentinel names a different canonical path', async () => {
    const { root, canonicalPath, providerPath } = await seedManagedCopy();
    // A sentinel forged for some other absolute path must not buy a digest,
    // even though every byte of the copied content is faithful.
    await writeDirectorySentinel(
      providerPath,
      join(root, '.agents', 'skills', 'other-skill'),
    );

    await expect(
      computeManagedDirectoryCopyHash(providerPath, canonicalPath, 'skill'),
    ).resolves.toBeNull();
  });

  it('returns null when the sentinel has trailing content', async () => {
    const { canonicalPath, providerPath } = await seedManagedCopy();
    await writeFile(
      join(providerPath, OAT_DIRECTORY_SENTINEL),
      `${OAT_MARKER_PREFIX} Source: ${canonicalPath} -->\ntrailing\n`,
      'utf8',
    );

    await expect(
      computeManagedDirectoryCopyHash(providerPath, canonicalPath, 'skill'),
    ).resolves.toBeNull();
  });

  it('returns null when the marker file does not start with the expected banner', async () => {
    const { canonicalPath, providerPath } = await seedManagedCopy();
    await writeFile(
      join(providerPath, 'SKILL.md'),
      '# skill one without its banner\n',
      'utf8',
    );

    await expect(
      computeManagedDirectoryCopyHash(providerPath, canonicalPath, 'skill'),
    ).resolves.toBeNull();
  });

  it('returns null when the provider tree contains a symlink or other non-regular entry', async () => {
    const { canonicalPath, providerPath } = await seedManagedCopy();
    await symlink(
      join(canonicalPath, 'SKILL.md'),
      join(providerPath, 'linked.md'),
    );

    await expect(
      computeManagedDirectoryCopyHash(providerPath, canonicalPath, 'skill'),
    ).resolves.toBeNull();
  });

  it('returns null when the sentinel is a symlink to a file holding the exact marker', async () => {
    const { root, canonicalPath, providerPath } = await seedManagedCopy();
    // The sentinel used to be skipped by pathname before its type was checked,
    // and read through a symlink-following `readFile`, so this shape produced
    // the canonical digest and read as in_sync.
    const side = join(root, 'side-sentinel');
    await writeFile(
      side,
      `${OAT_MARKER_PREFIX} Source: ${canonicalPath} -->\n`,
      'utf8',
    );
    await rm(join(providerPath, OAT_DIRECTORY_SENTINEL));
    await symlink(side, join(providerPath, OAT_DIRECTORY_SENTINEL));

    await expect(
      computeManagedDirectoryCopyHash(providerPath, canonicalPath, 'skill'),
    ).resolves.toBeNull();
  });

  it('returns null when the provider root is a symlink to a faithful decorated tree', async () => {
    const { root, canonicalPath, providerPath } = await seedManagedCopy();
    // A symlinked root used to be traversed by `readdir` as if it were the
    // real provider directory.
    const linkedRoot = join(root, '.claude', 'skills', 'linked-skill');
    await symlink(providerPath, linkedRoot);

    await expect(
      computeManagedDirectoryCopyHash(linkedRoot, canonicalPath, 'skill'),
    ).resolves.toBeNull();
  });

  it('returns a different digest when any copied file body differs', async () => {
    const { canonicalPath, providerPath } = await seedManagedCopy();
    await writeFile(
      join(providerPath, 'reference', 'notes.md'),
      '# nested notes, edited by hand\n',
      'utf8',
    );

    const managedHash = await computeManagedDirectoryCopyHash(
      providerPath,
      canonicalPath,
      'skill',
    );

    // A tampered copy still hashes — it just must never produce the canonical
    // digest, so its caller keeps reporting drift.
    expect(managedHash).not.toBeNull();
    expect(managedHash).not.toBe(await computeDirectoryHash(canonicalPath));
  });
});
