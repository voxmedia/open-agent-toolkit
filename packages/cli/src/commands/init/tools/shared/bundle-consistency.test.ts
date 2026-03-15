import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { IDEA_SKILLS } from '../ideas/install-ideas';
import { RESEARCH_SKILLS } from '../research/install-research';
import { UTILITY_SKILLS } from '../utility/install-utility';
import { WORKFLOW_SKILLS } from '../workflows/install-workflows';

/**
 * Parse the SKILLS=(...) bash array from bundle-assets.sh.
 *
 * This catches drift between the build-time bundler and the runtime
 * installer arrays. When a new skill is added to any pack, it must
 * also appear in bundle-assets.sh — otherwise the build will nuke
 * the bundled asset on the next `pnpm build`.
 */
function parseBundleSkills(): string[] {
  const scriptPath = join(
    import.meta.dirname,
    '../../../../../scripts/bundle-assets.sh',
  );
  const content = readFileSync(scriptPath, 'utf8');
  const match = content.match(/SKILLS=\(\s*([\s\S]*?)\)/);
  if (!match)
    throw new Error('Could not parse SKILLS array from bundle-assets.sh');
  return match[1]
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'));
}

function isUserInvocableSkill(skillName: string): boolean {
  const skillPath = join(
    import.meta.dirname,
    '../../../../../../../.agents/skills',
    skillName,
    'SKILL.md',
  );
  const content = readFileSync(skillPath, 'utf8');
  return /^user-invocable:\s*true$/m.test(content);
}

describe('bundle-assets.sh consistency', () => {
  const bundleSkills = parseBundleSkills();
  const repoSkillsRoot = join(
    import.meta.dirname,
    '../../../../../../../.agents/skills',
  );
  const workflowLifecycleSkills = readdirSync(repoSkillsRoot, {
    withFileTypes: true,
  })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter(
      (name) =>
        (name.startsWith('oat-project-') ||
          name.startsWith('oat-worktree-bootstrap')) &&
        isUserInvocableSkill(name),
    )
    .sort();

  it('bundles every workflow skill', () => {
    const missing = WORKFLOW_SKILLS.filter(
      (skill) => !bundleSkills.includes(skill),
    );
    expect(
      missing,
      `Missing from bundle-assets.sh SKILLS array: ${missing.join(', ')}`,
    ).toEqual([]);
  });

  it('bundles every idea skill', () => {
    const missing = IDEA_SKILLS.filter(
      (skill) => !bundleSkills.includes(skill),
    );
    expect(
      missing,
      `Missing from bundle-assets.sh SKILLS array: ${missing.join(', ')}`,
    ).toEqual([]);
  });

  it('bundles every utility skill', () => {
    const missing = UTILITY_SKILLS.filter(
      (skill) => !bundleSkills.includes(skill),
    );
    expect(
      missing,
      `Missing from bundle-assets.sh SKILLS array: ${missing.join(', ')}`,
    ).toEqual([]);
  });

  it('bundles every research skill', () => {
    const missing = RESEARCH_SKILLS.filter(
      (skill) => !bundleSkills.includes(skill),
    );
    expect(
      missing,
      `Missing from bundle-assets.sh SKILLS array: ${missing.join(', ')}`,
    ).toEqual([]);
  });

  it('does not bundle skills that belong to no pack', () => {
    const allPackSkills = new Set<string>([
      ...WORKFLOW_SKILLS,
      ...IDEA_SKILLS,
      ...UTILITY_SKILLS,
      ...RESEARCH_SKILLS,
    ]);
    const orphans = bundleSkills.filter((skill) => !allPackSkills.has(skill));
    expect(
      orphans,
      `Bundled but not in any pack: ${orphans.join(', ')}`,
    ).toEqual([]);
  });

  it('covers every user-facing workflow lifecycle skill in the workflow pack', () => {
    expect(
      [...WORKFLOW_SKILLS].sort(),
      `Workflow pack is missing lifecycle skills: ${workflowLifecycleSkills
        .filter((skill) => !WORKFLOW_SKILLS.includes(skill))
        .join(', ')}`,
    ).toEqual(expect.arrayContaining(workflowLifecycleSkills));
  });
});
