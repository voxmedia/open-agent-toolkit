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

import {
  DECISION_INDEX_END,
  DECISION_INDEX_START,
  renderDecisionManagedSection,
} from '@commands/decision/regenerate-index';
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

type BundleInventory = {
  skills: string[];
  agents: string[];
  templateFiles: string[];
  publicVersionPackages: string[];
};

function readBundleInventory(): BundleInventory {
  return JSON.parse(
    execFileSync(process.execPath, [getBundleInventoryPath(), '--json'], {
      encoding: 'utf8',
    }),
  ) as BundleInventory;
}

function parseBundleSkills(): string[] {
  return readBundleInventory().skills;
}

function parseBundleAgents(): string[] {
  return readBundleInventory().agents;
}

function parseBundleTemplates(): string[] {
  return readBundleInventory().templateFiles;
}

function getBundleScriptPath(): string {
  return join(import.meta.dirname, '../../../../../scripts/bundle-assets.sh');
}

function getBundleInventoryPath(): string {
  return join(import.meta.dirname, '../../../../../scripts/bundle-inputs.mjs');
}

function getMigrationPromptSourcePath(): string {
  return join(import.meta.dirname, '../../../../../config/pjm-restructure.md');
}

function getDispatchMatrixRecommendationSourcePath(): string {
  return join(
    import.meta.dirname,
    '../../../../../config/dispatch-matrix-recommendation.json',
  );
}

/**
 * Extract the canonical decision-index header row from the live CLI render
 * logic, so the regression assertion below pins the migration prompt asset to
 * the same source of truth used by `oat decision regenerate-index` instead of a
 * hardcoded second copy of the header string.
 */
function getCanonicalDecisionIndexHeader(): string {
  const managedSection = renderDecisionManagedSection([]);
  const headerRow = managedSection
    .split('\n')
    .find((line) => line.startsWith('| ID '));
  if (!headerRow) {
    throw new Error(
      'Could not derive decision-index header row from renderDecisionManagedSection.',
    );
  }
  return headerRow;
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

function readBundledSkillContract(
  assetsRoot: string,
  skillName: string,
): string {
  const skillRoot = join(assetsRoot, 'skills', skillName);
  const entry = readFileSync(join(skillRoot, 'SKILL.md'), 'utf8');
  if (skillName !== 'oat-project-implement') {
    return entry;
  }

  const referencesRoot = join(skillRoot, 'references');
  const references = readdirSync(referencesRoot)
    .filter((file) => file.endsWith('.md'))
    .sort()
    .map((file) => readFileSync(join(referencesRoot, file), 'utf8'));
  return [entry, ...references].join('\n');
}

describe('bundle asset inventory consistency', () => {
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
    expect(WORKFLOW_SKILLS).toContain('oat-explainer-kit');
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
    expect(UTILITY_SKILLS).toContain('explainer-kit');
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

  it(
    'bundles workflow skills with canonical dispatch policy prompt guidance',
    () => {
      const assetsRoot = mkdtempSync(join(tmpdir(), 'oat-assets-'));

      try {
        execFileSync('bash', [getBundleScriptPath()], {
          env: { ...process.env, OAT_ASSETS_DIR: assetsRoot },
          stdio: 'pipe',
        });

        for (const skill of [
          'oat-project-quick-start',
          'oat-project-implement',
        ]) {
          const content = readBundledSkillContract(assetsRoot, skill);

          expect(content).toContain(
            'oat project dispatch-ceiling choices --format markdown',
          );
          expect(content).toContain(
            'Do not hand-type the dispatch policy menu',
          );
          expect(content).not.toContain('Managed capped policies:');
        }
      } finally {
        rmSync(assetsRoot, { recursive: true, force: true });
      }
    },
    BUNDLE_ASSETS_TEST_TIMEOUT_MS,
  );

  it(
    'bundles implement skill with human-facing dispatch display guidance',
    () => {
      const assetsRoot = mkdtempSync(join(tmpdir(), 'oat-assets-'));

      try {
        execFileSync('bash', [getBundleScriptPath()], {
          env: { ...process.env, OAT_ASSETS_DIR: assetsRoot },
          stdio: 'pipe',
        });

        const content = readBundledSkillContract(
          assetsRoot,
          'oat-project-implement',
        );

        expect(content).toContain('Human-facing dispatch display rules');
        expect(content).toMatch(
          /Lead with route, OAT dispatch tier, requested controls, configured defaults, and runtime\s+confirmation/,
        );
        expect(content).toContain('Do not headline `producer=unknown`');
        const primaryDisplaySection =
          content.match(
            /Print before phase work:[\s\S]*?### Dispatch Policy Enforcement Log/,
          )?.[0] ?? '';
        expect(primaryDisplaySection).toContain('OAT Dispatch Tier: balanced');
        expect(primaryDisplaySection).toContain(
          'OAT Dispatch Tier: {economy | balanced | high | frontier | uncapped | inherit host defaults | legacy capped}',
        );
        expect(primaryDisplaySection).not.toMatch(/^Dispatch policy:/m);
        expect(content).toContain(
          'Dispatch stamp: Dispatch: scope=<phase-or-task> action=<implementation|fix|review> role=<implementer|fix|reviewer> producer=<slug|unknown>',
        );
      } finally {
        rmSync(assetsRoot, { recursive: true, force: true });
      }
    },
    BUNDLE_ASSETS_TEST_TIMEOUT_MS,
  );

  it(
    'bundles workflow report and derived-stamp guidance from canonical skills',
    () => {
      const assetsRoot = mkdtempSync(join(tmpdir(), 'oat-assets-'));

      try {
        execFileSync('bash', [getBundleScriptPath()], {
          env: { ...process.env, OAT_ASSETS_DIR: assetsRoot },
          stdio: 'pipe',
        });

        for (const skill of [
          'oat-project-implement',
          'oat-project-review-provide',
          'oat-project-review-provide-remote',
        ]) {
          const content = readBundledSkillContract(assetsRoot, skill);
          const invocations = [
            ...content
              .replace(/\\\r?\n\s*/g, ' ')
              .matchAll(
                /(?:pnpm run cli -- project|oat project) dispatch-ceiling resolve[^`\n]*/g,
              ),
          ]
            .map(([command]) => command.trim())
            .filter((command) => command.includes('--provider'));
          expect(
            invocations.length,
            `${skill} actionable resolver invocations`,
          ).toBeGreaterThan(0);
          for (const invocation of invocations) {
            expect(invocation, `${skill} report scope`).toMatch(
              /--report-scope\s+\S+/,
            );
            expect(invocation, `${skill} literal report action`).toMatch(
              /--report-action\s+(implementation|fix|review)(?:\s|$)/,
            );
          }
          expect(content, `${skill} versioned report`).toContain(
            'dispatchReport.schemaVersion: 1',
          );
          expect(content, `${skill} report renderer`).toContain(
            'formatDispatchReport(dispatchReport)',
          );
          expect(content, `${skill} derived stamp`).toContain(
            'formatDispatchStamp(dispatchReport)',
          );
        }
      } finally {
        rmSync(assetsRoot, { recursive: true, force: true });
      }
    },
    BUNDLE_ASSETS_TEST_TIMEOUT_MS,
  );

  it(
    'bundles the PJM migration prompt asset',
    () => {
      const assetsRoot = mkdtempSync(join(tmpdir(), 'oat-assets-'));

      try {
        execFileSync('bash', [getBundleScriptPath()], {
          env: { ...process.env, OAT_ASSETS_DIR: assetsRoot },
          stdio: 'pipe',
        });

        const promptPath = join(assetsRoot, 'migration', 'pjm-restructure.md');
        expect(existsSync(promptPath)).toBe(true);
        expect(readFileSync(promptPath, 'utf8')).toContain(
          'OAT PJM repo-reference migration',
        );
      } finally {
        rmSync(assetsRoot, { recursive: true, force: true });
      }
    },
    BUNDLE_ASSETS_TEST_TIMEOUT_MS,
  );

  it(
    'bundles the dispatch matrix recommendation asset',
    () => {
      const assetsRoot = mkdtempSync(join(tmpdir(), 'oat-assets-'));

      try {
        execFileSync('bash', [getBundleScriptPath()], {
          env: { ...process.env, OAT_ASSETS_DIR: assetsRoot },
          stdio: 'pipe',
        });

        const recommendationPath = join(
          assetsRoot,
          'config',
          'dispatch-matrix-recommendation.json',
        );
        const recommendation = JSON.parse(
          readFileSync(recommendationPath, 'utf8'),
        ) as {
          version?: unknown;
          providers?: Record<string, unknown>;
        };
        const sourceRecommendation = JSON.parse(
          readFileSync(getDispatchMatrixRecommendationSourcePath(), 'utf8'),
        ) as {
          version?: unknown;
          providers?: Record<string, unknown>;
        };

        expect(recommendation).toEqual(sourceRecommendation);
        expect(recommendation.providers?.codex).toBeDefined();
        expect(recommendation.providers?.claude).toBeDefined();
        expect(recommendation.providers?.cursor).toBeDefined();
      } finally {
        rmSync(assetsRoot, { recursive: true, force: true });
      }
    },
    BUNDLE_ASSETS_TEST_TIMEOUT_MS,
  );

  it(
    'derives bundled public package versions from the shared inventory',
    () => {
      const assetsRoot = mkdtempSync(join(tmpdir(), 'oat-assets-'));

      try {
        execFileSync('bash', [getBundleScriptPath()], {
          env: { ...process.env, OAT_ASSETS_DIR: assetsRoot },
          stdio: 'pipe',
        });

        const actual = JSON.parse(
          readFileSync(
            join(assetsRoot, 'public-package-versions.json'),
            'utf8',
          ),
        ) as Record<string, string>;
        const expected = Object.fromEntries(
          readBundleInventory().publicVersionPackages.map((name) => {
            const packageJson = JSON.parse(
              readFileSync(
                join(
                  import.meta.dirname,
                  '../../../../../../../packages',
                  name,
                  'package.json',
                ),
                'utf8',
              ),
            ) as { version: string };
            return [name, packageJson.version];
          }),
        );

        expect(actual).toEqual(expected);
      } finally {
        rmSync(assetsRoot, { recursive: true, force: true });
      }
    },
    BUNDLE_ASSETS_TEST_TIMEOUT_MS,
  );

  describe('migration prompt decision-index contract', () => {
    const promptContent = readFileSync(getMigrationPromptSourcePath(), 'utf8');

    it('teaches the canonical singular decision-index markers', () => {
      expect(promptContent).toContain(DECISION_INDEX_START);
      expect(promptContent).toContain(DECISION_INDEX_END);
    });

    it('does not teach the stale plural DECISIONS-INDEX markers', () => {
      // The live CLI (regenerate-index.ts) uses the SINGULAR marker pair.
      // A manual fallback that emits the plural markers would build an index
      // that `oat decision regenerate-index` cannot manage.
      expect(promptContent).not.toContain('OAT DECISIONS-INDEX');
    });

    it('teaches the canonical 5-column decision-index header (incl. Legacy)', () => {
      // Source the expected header from the live render logic so this asset
      // cannot silently drift from the CLI contract. The 4-column variant that
      // omits `Legacy` would drop migrated `legacy_id` values.
      expect(promptContent).toContain(getCanonicalDecisionIndexHeader());
      expect(promptContent).not.toContain('| ID | Date | Status | Decision |');
    });
  });
});
