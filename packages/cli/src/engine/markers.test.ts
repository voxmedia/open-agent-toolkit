import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { hasMarker, insertMarker, OAT_MARKER_PREFIX } from './markers';

describe('generated view markers', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tempDirs.map(async (dir) => {
        await rm(dir, { recursive: true, force: true });
      }),
    );
    tempDirs.length = 0;
  });

  it('insertMarker adds OAT-managed comment to SKILL.md', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-marker-'));
    tempDirs.push(root);
    const skillPath = join(root, 'SKILL.md');
    await writeFile(skillPath, '# Skill\n\nBody\n', 'utf8');

    await insertMarker(skillPath, '/tmp/.agents/skills/example');

    const updated = await readFile(skillPath, 'utf8');
    expect(updated.startsWith('<!-- OAT-managed:')).toBe(true);
    expect(updated).toContain('# Skill');
  });

  it('hasMarker detects existing marker', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-marker-'));
    tempDirs.push(root);
    const skillPath = join(root, 'SKILL.md');
    await writeFile(
      skillPath,
      `${OAT_MARKER_PREFIX} Source: /tmp/example -->\n# Skill\n`,
      'utf8',
    );

    const detected = await hasMarker(skillPath);

    expect(detected).toBe(true);
  });

  it('marker text includes canonical source path', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-marker-'));
    tempDirs.push(root);
    await mkdir(join(root, 'skill'), { recursive: true });
    const skillPath = join(root, 'skill', 'SKILL.md');
    const canonicalPath = '/tmp/.agents/skills/example';
    await writeFile(skillPath, '# Skill\n', 'utf8');

    await insertMarker(skillPath, canonicalPath);

    const updated = await readFile(skillPath, 'utf8');
    expect(updated).toContain(canonicalPath);
  });
});
