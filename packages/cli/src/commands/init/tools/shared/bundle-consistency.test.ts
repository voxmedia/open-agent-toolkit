import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { IDEA_SKILLS } from '../ideas/install-ideas';
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

describe('bundle-assets.sh consistency', () => {
  const bundleSkills = parseBundleSkills();

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

  it('does not bundle skills that belong to no pack', () => {
    const allPackSkills = new Set<string>([
      ...WORKFLOW_SKILLS,
      ...IDEA_SKILLS,
      ...UTILITY_SKILLS,
    ]);
    const orphans = bundleSkills.filter((skill) => !allPackSkills.has(skill));
    expect(
      orphans,
      `Bundled but not in any pack: ${orphans.join(', ')}`,
    ).toEqual([]);
  });
});
