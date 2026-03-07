import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  getAgentVersion,
  getFrontmatterBlock,
  getFrontmatterField,
  getSkillVersion,
  parseFrontmatterField,
} from './frontmatter';

describe('frontmatter', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tempDirs.map((dir) => rm(dir, { recursive: true, force: true })),
    );
    tempDirs.length = 0;
  });

  describe('getFrontmatterBlock', () => {
    it('extracts content between --- markers', () => {
      const content = '---\nfoo: bar\nbaz: 42\n---\n# Body';
      expect(getFrontmatterBlock(content)).toBe('foo: bar\nbaz: 42');
    });

    it('returns null when no frontmatter present', () => {
      expect(getFrontmatterBlock('# Just a heading')).toBeNull();
    });

    it('returns null for empty content', () => {
      expect(getFrontmatterBlock('')).toBeNull();
    });

    it('handles frontmatter with no body after', () => {
      const content = '---\nfoo: bar\n---';
      expect(getFrontmatterBlock(content)).toBe('foo: bar');
    });
  });

  describe('getFrontmatterField', () => {
    it('extracts a simple field value', () => {
      expect(getFrontmatterField('foo: bar\nbaz: 42', 'foo')).toBe('bar');
    });

    it('strips inline comments', () => {
      expect(getFrontmatterField('foo: bar # this is a comment', 'foo')).toBe(
        'bar',
      );
    });

    it('returns null for missing field', () => {
      expect(getFrontmatterField('foo: bar', 'missing')).toBeNull();
    });

    it('handles quoted values', () => {
      expect(getFrontmatterField('foo: "hello world"', 'foo')).toBe(
        '"hello world"',
      );
    });

    it('returns null for empty frontmatter', () => {
      expect(getFrontmatterField('', 'foo')).toBeNull();
    });
  });

  describe('parseFrontmatterField', () => {
    it('reads a field from a file with frontmatter', async () => {
      const dir = await mkdtemp(join(tmpdir(), 'oat-fm-'));
      tempDirs.push(dir);
      const filePath = join(dir, 'test.md');
      await writeFile(filePath, '---\noat_phase: implement\n---\n# Body');

      expect(await parseFrontmatterField(filePath, 'oat_phase')).toBe(
        'implement',
      );
    });

    it('returns empty string for non-existent file', async () => {
      expect(
        await parseFrontmatterField('/nonexistent/path.md', 'oat_phase'),
      ).toBe('');
    });

    it('returns empty string for missing field', async () => {
      const dir = await mkdtemp(join(tmpdir(), 'oat-fm-'));
      tempDirs.push(dir);
      const filePath = join(dir, 'test.md');
      await writeFile(filePath, '---\nfoo: bar\n---\n# Body');

      expect(await parseFrontmatterField(filePath, 'missing')).toBe('');
    });

    it('returns empty string for file without frontmatter', async () => {
      const dir = await mkdtemp(join(tmpdir(), 'oat-fm-'));
      tempDirs.push(dir);
      const filePath = join(dir, 'test.md');
      await writeFile(filePath, '# Just a heading');

      expect(await parseFrontmatterField(filePath, 'oat_phase')).toBe('');
    });
  });

  describe('getSkillVersion', () => {
    it('returns the version when present in SKILL.md frontmatter', async () => {
      const dir = await mkdtemp(join(tmpdir(), 'oat-skill-'));
      tempDirs.push(dir);
      const skillPath = join(dir, 'SKILL.md');
      await writeFile(
        skillPath,
        '---\nname: oat-demo\nversion: 1.2.3\n---\n# Body',
      );

      expect(await getSkillVersion(dir)).toBe('1.2.3');
    });

    it('returns null when version is missing', async () => {
      const dir = await mkdtemp(join(tmpdir(), 'oat-skill-'));
      tempDirs.push(dir);
      const skillPath = join(dir, 'SKILL.md');
      await writeFile(skillPath, '---\nname: oat-demo\n---\n# Body');

      expect(await getSkillVersion(dir)).toBeNull();
    });

    it('returns null when SKILL.md has no frontmatter', async () => {
      const dir = await mkdtemp(join(tmpdir(), 'oat-skill-'));
      tempDirs.push(dir);
      const skillPath = join(dir, 'SKILL.md');
      await writeFile(skillPath, '# Body only');

      expect(await getSkillVersion(dir)).toBeNull();
    });

    it('returns null when SKILL.md is missing', async () => {
      const dir = await mkdtemp(join(tmpdir(), 'oat-skill-'));
      tempDirs.push(dir);

      await expect(getSkillVersion(dir)).resolves.toBeNull();
    });
  });

  describe('getAgentVersion', () => {
    it('returns the version from agent .md frontmatter', async () => {
      const dir = await mkdtemp(join(tmpdir(), 'oat-agent-'));
      tempDirs.push(dir);
      const agentPath = join(dir, 'oat-reviewer.md');
      await writeFile(
        agentPath,
        '---\nname: oat-reviewer\nversion: 1.0.0\n---\n## Role',
      );

      expect(await getAgentVersion(agentPath)).toBe('1.0.0');
    });

    it('returns null when version is missing', async () => {
      const dir = await mkdtemp(join(tmpdir(), 'oat-agent-'));
      tempDirs.push(dir);
      const agentPath = join(dir, 'oat-reviewer.md');
      await writeFile(agentPath, '---\nname: oat-reviewer\n---\n## Role');

      expect(await getAgentVersion(agentPath)).toBeNull();
    });

    it('returns null for non-existent file', async () => {
      await expect(
        getAgentVersion('/nonexistent/agent.md'),
      ).resolves.toBeNull();
    });
  });
});
