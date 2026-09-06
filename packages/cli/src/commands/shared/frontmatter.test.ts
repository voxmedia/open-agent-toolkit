import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';
import YAML from 'yaml';

import {
  isProjectStateFrontmatterField,
  isProjectStateKind,
  isProjectStatePhase,
  getAgentVersion,
  getFrontmatterBlock,
  getFrontmatterField,
  getSkillVersion,
  parseFrontmatterField,
  parseGeneratedTime,
  parseSkillGateOverrides,
  GATE_AWARE_SKILLS,
  SKILL_GATE_OVERRIDE_SOURCE,
} from './frontmatter';

describe('frontmatter', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tempDirs.map((dir) => rm(dir, { recursive: true, force: true })),
    );
    tempDirs.length = 0;
  });

  describe('parseGeneratedTime', () => {
    it('treats a Z-suffixed UTC timestamp as UTC', () => {
      expect(parseGeneratedTime('2026-07-05T11:16:01Z')).toBe(
        Date.parse('2026-07-05T11:16:01Z'),
      );
    });

    it('treats a bare date as UTC midnight', () => {
      expect(parseGeneratedTime('2026-07-05')).toBe(
        Date.parse('2026-07-05T00:00:00Z'),
      );
    });

    it('treats a datetime with no timezone as UTC, not local', () => {
      // Without the guard this would parse as local time and mis-order across
      // timezones. It must equal the explicit-UTC parse regardless of TZ.
      expect(parseGeneratedTime('2026-07-05T11:16:01')).toBe(
        Date.parse('2026-07-05T11:16:01Z'),
      );
    });

    it('respects an explicit numeric offset', () => {
      expect(parseGeneratedTime('2026-07-05T11:16:01+02:00')).toBe(
        Date.parse('2026-07-05T09:16:01Z'),
      );
    });

    it('orders a bare date before any same-day timestamp', () => {
      expect(parseGeneratedTime('2026-07-05')).toBeLessThan(
        parseGeneratedTime('2026-07-05T00:00:01Z'),
      );
    });

    it('returns NaN for unparseable input', () => {
      expect(Number.isNaN(parseGeneratedTime('not-a-date'))).toBe(true);
    });
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

  describe('project state recognition', () => {
    const implementExitGateFixtures = [
      {
        name: 'pending',
        frontmatter: `oat_implement_exit_gate:
  status: pending
  disposition: null`,
      },
      {
        name: 'allowed',
        frontmatter: `oat_implement_exit_gate:
  status: allowed
  disposition: passed`,
      },
      {
        name: 'blocked',
        frontmatter: `oat_implement_exit_gate:
  status: blocked
  disposition: null`,
      },
      {
        name: 'stale',
        frontmatter: `oat_implement_exit_gate:
  status: stale
  disposition: passed`,
      },
    ];

    it('recognizes the coordination kind field and values', () => {
      expect(isProjectStateFrontmatterField('oat_kind')).toBe(true);
      expect(isProjectStateFrontmatterField('oat_parent')).toBe(true);
      expect(isProjectStateFrontmatterField('oat_siblings')).toBe(true);
      expect(isProjectStateFrontmatterField('oat_depends_on')).toBe(true);
      expect(isProjectStateFrontmatterField('oat_children')).toBe(true);
      expect(
        isProjectStateFrontmatterField('oat_inherited_context_revalidated'),
      ).toBe(true);
      expect(isProjectStateKind('implementation')).toBe(true);
      expect(isProjectStateKind('coordination')).toBe(true);
      expect(isProjectStateKind('other')).toBe(false);
    });

    it('recognizes decomposition as a project state phase value', () => {
      expect(isProjectStatePhase('decomposition')).toBe(true);
      expect(isProjectStatePhase('discovery')).toBe(true);
      expect(isProjectStatePhase('unknown')).toBe(false);
    });

    it.each(implementExitGateFixtures)(
      'recognizes and preserves $name implementation exit-gate state',
      ({ frontmatter }) => {
        const parsed = YAML.parse(frontmatter) as Record<string, unknown>;
        const preserved = Object.fromEntries(
          Object.entries(parsed).filter(([field]) =>
            isProjectStateFrontmatterField(field),
          ),
        );

        expect(isProjectStateFrontmatterField('oat_implement_exit_gate')).toBe(
          true,
        );
        expect(preserved).toEqual(parsed);
      },
    );

    describe('parseSkillGateOverrides', () => {
      const STATE_PATH = '.oat/projects/shared/demo/state.md';

      it('treats an absent map as "follow configuration"', () => {
        expect(
          parseSkillGateOverrides('oat_phase: implement', STATE_PATH),
        ).toEqual({ present: false, overrides: {} });
      });

      it('parses a disabled override for each gate-aware skill', () => {
        expect(
          parseSkillGateOverrides(
            [
              'oat_phase: implement',
              'oat_skill_gate_overrides:',
              '  oat-project-implement: disabled',
              '  oat-project-plan: disabled',
            ].join('\n'),
            STATE_PATH,
          ),
        ).toEqual({
          present: true,
          overrides: {
            'oat-project-implement': 'disabled',
            'oat-project-plan': 'disabled',
          },
        });
      });

      it('treats an explicitly empty map as present with no overrides', () => {
        expect(
          parseSkillGateOverrides('oat_skill_gate_overrides:', STATE_PATH),
        ).toEqual({ present: true, overrides: {} });
      });

      it('keeps an override for a gate-aware skill with no configured gate', () => {
        // Visible in progress, but it must never fabricate configuration.
        expect(
          parseSkillGateOverrides(
            [
              'oat_skill_gate_overrides:',
              '  oat-project-quick-start: disabled',
            ].join('\n'),
            STATE_PATH,
          ).overrides,
        ).toEqual({ 'oat-project-quick-start': 'disabled' });
      });

      it('rejects a key that is not a gate-aware skill', () => {
        // An override on a non-gateable skill can never disable anything, so
        // accepting it would silently record an inert instruction.
        expect(() =>
          parseSkillGateOverrides(
            ['oat_skill_gate_overrides:', '  oat-project-spec: disabled'].join(
              '\n',
            ),
            STATE_PATH,
          ),
        ).toThrow(/not a gate-aware skill/);
      });

      it('accepts every canonical gate-aware skill', () => {
        const frontmatter = [
          'oat_skill_gate_overrides:',
          ...GATE_AWARE_SKILLS.map((skill) => `  ${skill}: disabled`),
        ].join('\n');

        expect(
          Object.keys(
            parseSkillGateOverrides(frontmatter, STATE_PATH).overrides,
          ),
        ).toEqual([...GATE_AWARE_SKILLS]);
      });

      it('exposes the durable override source string', () => {
        expect(SKILL_GATE_OVERRIDE_SOURCE).toBe(
          'state.md:oat_skill_gate_overrides',
        );
      });

      it.each([
        ['a sequence', 'oat_skill_gate_overrides:\n  - oat-project-implement'],
        ['a boolean', 'oat_skill_gate_overrides: true'],
        ['a bare string', 'oat_skill_gate_overrides: disabled'],
        [
          'a boolean value',
          'oat_skill_gate_overrides:\n  oat-project-implement: true',
        ],
        [
          'an enabled value',
          'oat_skill_gate_overrides:\n  oat-project-implement: enabled',
        ],
        [
          'a null value',
          'oat_skill_gate_overrides:\n  oat-project-implement: null',
        ],
        [
          'a nested map value',
          'oat_skill_gate_overrides:\n  oat-project-implement:\n    value: disabled',
        ],
        [
          'a sequence value',
          'oat_skill_gate_overrides:\n  oat-project-implement:\n    - disabled',
        ],
        [
          'an unqualified key',
          'oat_skill_gate_overrides:\n  implement: disabled',
        ],
        [
          'a duplicate skill key',
          'oat_skill_gate_overrides:\n  oat-project-implement: disabled\n  oat-project-implement: disabled',
        ],
        [
          'a padded value',
          'oat_skill_gate_overrides:\n  oat-project-implement: "disabled "',
        ],
        [
          'an anchored value',
          'oat_skill_gate_overrides:\n  oat-project-implement: &ref disabled',
        ],
        [
          'a tagged value',
          'oat_skill_gate_overrides:\n  oat-project-implement: !!str disabled',
        ],
        [
          'a duplicate map key',
          'oat_skill_gate_overrides:\n  oat-project-plan: disabled\noat_skill_gate_overrides:\n  oat-project-plan: disabled',
        ],
      ])('rejects %s with an actionable state path', (_name, frontmatter) => {
        expect(() => parseSkillGateOverrides(frontmatter, STATE_PATH)).toThrow(
          STATE_PATH,
        );
        expect(() => parseSkillGateOverrides(frontmatter, STATE_PATH)).toThrow(
          /oat_skill_gate_overrides/,
        );
      });

      it('round-trips through the preserved project-state field list', () => {
        const frontmatter = [
          'oat_phase: implement',
          'oat_skill_gate_overrides:',
          '  oat-project-implement: disabled',
        ].join('\n');
        const parsed = YAML.parse(frontmatter) as Record<string, unknown>;
        const preserved = Object.fromEntries(
          Object.entries(parsed).filter(([field]) =>
            isProjectStateFrontmatterField(field),
          ),
        );

        expect(isProjectStateFrontmatterField('oat_skill_gate_overrides')).toBe(
          true,
        );
        expect(preserved).toEqual(parsed);
        expect(
          parseSkillGateOverrides(frontmatter, STATE_PATH).overrides,
        ).toEqual({ 'oat-project-implement': 'disabled' });
      });

      it('preserves unrelated frontmatter fields alongside the map', () => {
        const frontmatter = [
          'oat_phase: implement',
          'associated_issues: []',
          'oat_skill_gate_overrides:',
          '  oat-project-implement: disabled',
        ].join('\n');

        expect(
          parseSkillGateOverrides(frontmatter, STATE_PATH).overrides,
        ).toEqual({ 'oat-project-implement': 'disabled' });
        expect(YAML.parse(frontmatter)).toHaveProperty('associated_issues');
      });
    });

    it('preserves legacy project state without adding an exit-gate field', () => {
      const parsed = YAML.parse('oat_phase: implement') as Record<
        string,
        unknown
      >;
      const preserved = Object.fromEntries(
        Object.entries(parsed).filter(([field]) =>
          isProjectStateFrontmatterField(field),
        ),
      );

      expect(preserved).toEqual(parsed);
      expect(preserved).not.toHaveProperty('oat_implement_exit_gate');
    });
  });
});
