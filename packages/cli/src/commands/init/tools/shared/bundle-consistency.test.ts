import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { CORE_SKILLS } from '../core/install-core';
import { DOCS_SKILLS } from '../docs/install-docs';
import { IDEA_SKILLS } from '../ideas/install-ideas';
import { PROJECT_MANAGEMENT_SKILLS } from '../project-management/install-project-management';
import { RESEARCH_SKILLS } from '../research/install-research';
import { UTILITY_SKILLS } from '../utility/install-utility';
import {
  WORKFLOW_AGENTS,
  WORKFLOW_SKILLS,
} from '../workflows/install-workflows';
import { BRAINSTORM_SKILLS, RESEARCH_AGENTS } from './skill-manifest';

const BUNDLE_ASSETS_TEST_TIMEOUT_MS = 15_000;

/**
 * Parse the SKILLS=(...) bash array from bundle-assets.sh.
 *
 * This catches drift between the build-time bundler and the runtime
 * installer arrays. When a new skill is added to any pack, it must
 * also appear in bundle-assets.sh — otherwise the build will nuke
 * the bundled asset on the next `pnpm build`.
 */
function parseBundleSkills(): string[] {
  const content = readFileSync(getBundleScriptPath(), 'utf8');
  const match = content.match(/SKILLS=\(\s*([\s\S]*?)\)/);
  if (!match)
    throw new Error('Could not parse SKILLS array from bundle-assets.sh');
  return match[1]
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'));
}

function parseBundleAgents(): string[] {
  const content = readFileSync(getBundleScriptPath(), 'utf8');
  const match = content.match(/for agent in ([\s\S]*?); do/);
  if (!match)
    throw new Error('Could not parse agent list from bundle-assets.sh');
  return match[1]
    .split(/\s+/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function parseBundleTemplates(): string[] {
  const content = readFileSync(getBundleScriptPath(), 'utf8');
  const match = content.match(/for template in ([\s\S]*?); do/);
  if (!match)
    throw new Error('Could not parse template list from bundle-assets.sh');
  return match[1]
    .split(/\s+/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function getBundleScriptPath(): string {
  return join(import.meta.dirname, '../../../../../scripts/bundle-assets.sh');
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
  const bundleAgents = parseBundleAgents();
  const bundleTemplates = parseBundleTemplates();
  const repoSkillsRoot = join(
    import.meta.dirname,
    '../../../../../../../.agents/skills',
  );
  const repoTemplatesRoot = join(
    import.meta.dirname,
    '../../../../../../../.oat/templates',
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

  it('bundles every docs skill', () => {
    const missing = DOCS_SKILLS.filter(
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

  it('bundles every core skill', () => {
    const missing = CORE_SKILLS.filter(
      (skill) => !bundleSkills.includes(skill),
    );
    expect(
      missing,
      `Missing from bundle-assets.sh SKILLS array: ${missing.join(', ')}`,
    ).toEqual([]);
  });

  it('bundles every project-management skill', () => {
    const missing = PROJECT_MANAGEMENT_SKILLS.filter(
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

  it('bundles every brainstorm skill', () => {
    const missing = BRAINSTORM_SKILLS.filter(
      (skill) => !bundleSkills.includes(skill),
    );
    expect(
      missing,
      `Missing from bundle-assets.sh SKILLS array: ${missing.join(', ')}`,
    ).toEqual([]);
  });

  it('bundles every workflow agent', () => {
    const missing = WORKFLOW_AGENTS.filter(
      (agent) => !bundleAgents.includes(agent),
    );
    expect(
      missing,
      `Missing from bundle-assets.sh agent list: ${missing.join(', ')}`,
    ).toEqual([]);
  });

  it('bundles every research agent', () => {
    const missing = RESEARCH_AGENTS.filter(
      (agent) => !bundleAgents.includes(agent),
    );
    expect(
      missing,
      `Missing from bundle-assets.sh agent list: ${missing.join(', ')}`,
    ).toEqual([]);
  });

  it('bundles the current p01 template set', () => {
    expect(bundleTemplates).toEqual(
      expect.arrayContaining([
        'decision.md',
        'repo-agents.md',
        'pjm-agents.md',
        'reference-agents.md',
      ]),
    );
    expect(bundleTemplates).not.toContain('decision-record.md');
  });

  it('only bundles templates that exist in the repo template root', () => {
    const missing = bundleTemplates.filter(
      (template) => !existsSync(join(repoTemplatesRoot, template)),
    );
    expect(
      missing,
      `Templates listed in bundle-assets.sh but missing from .oat/templates: ${missing.join(', ')}`,
    ).toEqual([]);
  });

  it('does not bundle skills that belong to no pack', () => {
    const allPackSkills = new Set<string>([
      ...CORE_SKILLS,
      ...WORKFLOW_SKILLS,
      ...IDEA_SKILLS,
      ...DOCS_SKILLS,
      ...UTILITY_SKILLS,
      ...PROJECT_MANAGEMENT_SKILLS,
      ...RESEARCH_SKILLS,
      ...BRAINSTORM_SKILLS,
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

  it(
    'does not bundle skill test directories',
    () => {
      const assetsRoot = mkdtempSync(join(tmpdir(), 'oat-assets-'));

      try {
        execFileSync('bash', [getBundleScriptPath()], {
          env: { ...process.env, OAT_ASSETS_DIR: assetsRoot },
          stdio: 'pipe',
        });

        expect(
          existsSync(
            join(assetsRoot, 'skills', 'oat-project-implement', 'tests'),
          ),
        ).toBe(false);
        expect(
          existsSync(
            join(assetsRoot, 'skills', 'oat-project-implement', 'SKILL.md'),
          ),
        ).toBe(true);
      } finally {
        rmSync(assetsRoot, { recursive: true, force: true });
      }
    },
    BUNDLE_ASSETS_TEST_TIMEOUT_MS,
  );
});
