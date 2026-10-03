import { execFileSync } from 'node:child_process';
import {
  chmodSync,
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import {
  DECISION_INDEX_END,
  DECISION_INDEX_START,
  renderDecisionManagedSection,
} from '@commands/decision/regenerate-index';
import { expectDispatchStampFieldContract } from '@test-support/skills/dispatch-stamp-contract';
import { describe, expect, it } from 'vitest';

import { PACK_MANIFEST } from '../../../tools/shared/pack-manifest';
import { CORE_SKILLS } from '../core/install-core';
import { DOCS_SKILLS } from '../docs/install-docs';
import { IDEA_SKILLS } from '../ideas/install-ideas';
import { PROJECT_MANAGEMENT_SKILLS } from '../project-management/install-project-management';
import { RESEARCH_SKILLS } from '../research/install-research';
import { UTILITY_SKILLS } from '../utility/install-utility';
import {
  WORKFLOW_AGENTS,
  WORKFLOW_SKILLS,
  WORKFLOW_TEMPLATES,
} from '../workflows/install-workflows';
import { BRAINSTORM_SKILLS, RESEARCH_AGENTS } from './skill-manifest';

const BUNDLE_ASSETS_TEST_TIMEOUT_MS = 15_000;

type BundleInventory = {
  skills: string[];
  agents: string[];
  templateFiles: string[];
  templateDirectories: string[];
  oatScripts: string[];
  docsRoot: string;
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

function getDispatchMatrixRecommendationAssetPath(): string {
  return join(
    import.meta.dirname,
    '../../../../../assets/config/dispatch-matrix-recommendation.json',
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
    expect(UTILITY_SKILLS).toContain('oat-dispatch-subagents');
    expect(UTILITY_SKILLS).toContain('subagent-orchestration');
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

  it('packages project-management skill-local references', () => {
    const assetsRoot = mkdtempSync(join(tmpdir(), 'oat-pjm-assets-'));
    try {
      execFileSync('bash', [getBundleScriptPath()], {
        env: { ...process.env, OAT_ASSETS_DIR: assetsRoot },
        stdio: 'pipe',
      });

      for (const name of [
        'backlog-review-template.md',
        'priority-alignment-template.md',
      ]) {
        expect(
          existsSync(
            join(
              assetsRoot,
              'skills',
              'oat-pjm-review-backlog',
              'references',
              name,
            ),
          ),
          name,
        ).toBe(true);
      }
    } finally {
      rmSync(assetsRoot, { recursive: true, force: true });
    }
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

  it('bundles every workflow template, including the project log', () => {
    const missing = WORKFLOW_TEMPLATES.filter(
      (template) => !bundleTemplates.includes(template),
    );
    expect(
      missing,
      `Missing workflow templates from bundle-assets.sh: ${missing.join(', ')}`,
    ).toEqual([]);
    expect(WORKFLOW_TEMPLATES).toContain('project-log.md');
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

  it('maps every bundled managed asset into the canonical manifest', () => {
    const inventory = readBundleInventory();
    const sources = new Set(
      PACK_MANIFEST.flatMap(({ assets }) =>
        assets.flatMap(({ source }) => (source ? [source] : [])),
      ),
    );

    for (const skill of inventory.skills) {
      expect(sources, `manifest skill ${skill}`).toContain(`skills/${skill}`);
    }
    for (const agent of inventory.agents) {
      expect(sources, `manifest agent ${agent}`).toContain(`agents/${agent}`);
    }
    for (const template of inventory.templateFiles) {
      expect(sources, `manifest template ${template}`).toContain(
        `templates/${template}`,
      );
    }
    for (const template of inventory.templateDirectories) {
      const prefix = `templates/${template}`;
      expect(
        [...sources].some(
          (source) => source === prefix || source.startsWith(`${prefix}/`),
        ),
        `manifest template directory ${template}`,
      ).toBe(true);
    }
    for (const script of inventory.oatScripts) {
      expect(sources, `manifest script ${script}`).toContain(
        `scripts/${script}`,
      );
    }
    expect(sources).toContain(inventory.docsRoot.replace('apps/oat-docs/', ''));
  });

  it('resolves every manifest asset source to a bundled asset', () => {
    const inventory = readBundleInventory();
    const bundledDocsRoot = inventory.docsRoot.replace('apps/oat-docs/', '');
    const unresolved: string[] = [];

    for (const { name, assets } of PACK_MANIFEST) {
      for (const asset of assets) {
        if (!asset.source) {
          // Generated seeds have no bundled source by design.
          expect(asset.generation, `${name}/${asset.id}`).toBeDefined();
          continue;
        }
        const [kind, ...rest] = asset.source.split('/');
        const name_ = rest.join('/');
        const resolved =
          (kind === 'skills' && inventory.skills.includes(name_)) ||
          (kind === 'agents' && inventory.agents.includes(name_)) ||
          (kind === 'scripts' && inventory.oatScripts.includes(name_)) ||
          (kind === 'templates' &&
            (inventory.templateFiles.includes(name_) ||
              inventory.templateDirectories.some(
                (directory) =>
                  name_ === directory || name_.startsWith(`${directory}/`),
              ))) ||
          asset.source === bundledDocsRoot;
        if (!resolved) unresolved.push(`${name}/${asset.id} → ${asset.source}`);
      }
    }

    expect(
      unresolved,
      `Manifest assets without a bundled source: ${unresolved.join(', ')}`,
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
    'bundles recon runtime helpers and its managed worker without test fixtures',
    () => {
      const assetsRoot = mkdtempSync(join(tmpdir(), 'oat-recon-assets-'));

      try {
        execFileSync('bash', [getBundleScriptPath()], {
          env: { ...process.env, OAT_ASSETS_DIR: assetsRoot },
          stdio: 'pipe',
        });

        for (const path of [
          ['skills', 'recon', 'SKILL.md'],
          ['skills', 'recon', 'references', 'packet-contract.md'],
          ['skills', 'recon', 'scripts', 'prepare-routing.mjs'],
          ['skills', 'recon', 'scripts', 'validate-packet.mjs'],
          ['skills', 'recon', 'scripts', 'lib', 'contracts.mjs'],
          ['skills', 'recon', 'scripts', 'lib', 'routing.mjs'],
          ['agents', 'recon-worker.md'],
        ]) {
          expect(existsSync(join(assetsRoot, ...path)), path.join('/')).toBe(
            true,
          );
        }
        expect(existsSync(join(assetsRoot, 'skills', 'recon', 'tests'))).toBe(
          false,
        );
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
          expectDispatchStampFieldContract(content, skill);
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
        const checkedInAsset = JSON.parse(
          readFileSync(getDispatchMatrixRecommendationAssetPath(), 'utf8'),
        );

        expect(recommendation).toEqual(sourceRecommendation);
        expect(checkedInAsset).toEqual(sourceRecommendation);
        expect(recommendation.version).toBe('2026-10-01.1');
        expect(recommendation.providers?.codex).toBeDefined();
        expect(recommendation.providers?.claude).toBeDefined();
        expect(recommendation.providers?.cursor).toEqual({
          economy: {
            candidates: [
              'composer-2.5',
              'gpt-5.6-luna-high',
              'gpt-5.6-luna-xhigh',
            ],
          },
          balanced: {
            candidates: [
              'cursor-grok-4.6-medium',
              'gpt-5.6-terra-high',
              'claude-opus-5-5-low',
            ],
          },
          high: {
            candidates: [
              'gpt-5.6-sol-medium',
              'claude-opus-5-5-low',
              'gpt-5.6-sol-high',
              'claude-opus-5-5-medium',
              'claude-opus-5-5-high',
            ],
          },
          frontier: {
            candidates: [
              'gpt-5.6-sol-xhigh',
              'gpt-5.6-sol-max',
              'claude-opus-5-5-high',
              'claude-opus-5-5-xhigh',
              'claude-fable-5-1-thinking-high',
            ],
          },
        });
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
        expect(
          JSON.parse(
            readFileSync(join(assetsRoot, 'bundle-metadata.json'), 'utf8'),
          ),
        ).toEqual({
          schemaVersion: 1,
          oatVersion: expected.cli,
        });
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

type StubInventory = {
  skills: string[];
  agents: string[];
  templateFiles: string[];
  templateDirectories: string[];
  oatScripts: string[];
  publicVersionPackages: string[];
  docsRoot: string;
  migrationPrompt: string;
  dispatchMatrix: string;
};

const VALID_STUB_INVENTORY: StubInventory = {
  skills: ['demo-skill'],
  agents: ['demo-agent.md'],
  templateFiles: ['state.md'],
  templateDirectories: ['ideas'],
  oatScripts: ['demo.sh'],
  publicVersionPackages: ['cli'],
  docsRoot: 'apps/demo-docs/docs',
  migrationPrompt: 'packages/cli/config/migration.md',
  dispatchMatrix: 'packages/cli/config/matrix.json',
};

// Every command that can create, copy, move, or delete a tree. In `refuse`
// mode the shims record the call and exit without touching the filesystem, so
// a configuration that would recurse can never grow: the log is a trap-proof
// marker (the script's EXIT trap cannot erase it) that a rejection happened
// before staging was ever created.
const GUARDED_COMMANDS = ['cp', 'mkdir', 'mv', 'rm'];

type StubBundleTree = {
  scratch: string;
  repoRoot: string;
  scriptPath: string;
  logPath: string;
  binDir: string;
};

function writeTreeFile(path: string, content: string, mode?: number): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, mode === undefined ? undefined : { mode });
}

function stubInventorySource(inventory: StubInventory): string {
  return [
    `export const BUNDLE_INPUTS = ${JSON.stringify(inventory)};`,
    'const [command, name] = process.argv.slice(2);',
    "if (command === '--get') {",
    "  process.stdout.write(String(BUNDLE_INPUTS[name]) + '\\n');",
    "} else if (command === '--list') {",
    "  process.stdout.write(BUNDLE_INPUTS[name].join('\\n') + '\\n');",
    '}',
    '',
  ].join('\n');
}

/**
 * The real `bundle-inputs.mjs` with only its BUNDLE_INPUTS data swapped for the
 * stub inventory, so its entry check and lookup validation are the shipped ones.
 */
function realEntryInventorySource(inventory: StubInventory): string {
  const source = readFileSync(getBundleInventoryPath(), 'utf8');
  const startMarker = 'export const BUNDLE_INPUTS = Object.freeze({';
  const endMarker = '\n});\n';
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  return [
    source.slice(0, start),
    `export const BUNDLE_INPUTS = Object.freeze(${JSON.stringify(inventory)});\n`,
    source.slice(end + endMarker.length),
  ].join('');
}

/**
 * Build a tiny isolated repository whose `packages/cli/scripts/` holds a copy
 * of the real `bundle-assets.sh` next to a stub inventory, so the temporary
 * directory is the script's REPO_ROOT. The tree holds one file per inventory
 * category and nothing else, keeping any accidental copy bounded.
 */
function createStubBundleTree(
  inventory: StubInventory,
  options: { realInventoryEntry?: boolean } = {},
): StubBundleTree {
  const scratch = realpathSync(
    mkdtempSync(join(tmpdir(), 'oat-bundle-guard-')),
  );
  const repoRoot = join(scratch, 'repo');
  const scriptsDir = join(repoRoot, 'packages/cli/scripts');
  const binDir = join(scratch, 'bin');
  const logPath = join(scratch, 'guarded-commands.log');

  writeTreeFile(join(repoRoot, 'NOTICES.md'), '# Notices\n');
  writeTreeFile(
    join(repoRoot, '.agents/skills/demo-skill/SKILL.md'),
    '# demo\n',
  );
  writeTreeFile(
    join(repoRoot, '.agents/skills/demo-skill/tests/demo.test.mjs'),
    '\n',
  );
  writeTreeFile(join(repoRoot, '.agents/agents/demo-agent.md'), '# agent\n');
  writeTreeFile(join(repoRoot, '.oat/templates/state.md'), '# state\n');
  writeTreeFile(join(repoRoot, '.oat/templates/ideas/idea.md'), '# idea\n');
  writeTreeFile(join(repoRoot, '.oat/scripts/demo.sh'), '#!/bin/sh\n');
  writeTreeFile(join(repoRoot, 'apps/demo-docs/docs/index.md'), '# docs\n');
  writeTreeFile(
    join(repoRoot, 'packages/cli/config/migration.md'),
    '# migration\n',
  );
  writeTreeFile(join(repoRoot, 'packages/cli/config/matrix.json'), '{}\n');
  writeTreeFile(
    join(repoRoot, 'packages/cli/package.json'),
    `${JSON.stringify({ name: 'demo-cli', version: '9.9.9' })}\n`,
  );
  writeTreeFile(
    join(scriptsDir, 'bundle-inputs.mjs'),
    options.realInventoryEntry
      ? realEntryInventorySource(inventory)
      : stubInventorySource(inventory),
  );
  mkdirSync(scriptsDir, { recursive: true });
  copyFileSync(getBundleScriptPath(), join(scriptsDir, 'bundle-assets.sh'));

  for (const command of GUARDED_COMMANDS) {
    writeTreeFile(
      join(binDir, command),
      [
        '#!/bin/sh',
        `printf '%s %s\\n' '${command}' "$*" >> "$OAT_BUNDLE_GUARD_LOG"`,
        'if [ "$OAT_BUNDLE_GUARD_MODE" = refuse ]; then',
        '  exit 97',
        'fi',
        'PATH="$OAT_BUNDLE_GUARD_REAL_PATH"',
        'export PATH',
        `exec ${command} "$@"`,
        '',
      ].join('\n'),
      0o755,
    );
  }
  writeFileSync(logPath, '');

  return {
    scratch,
    repoRoot,
    scriptPath: join(scriptsDir, 'bundle-assets.sh'),
    logPath,
    binDir,
  };
}

type BundleRun = { status: number | null; stderr: string };

function runStubBundle(
  tree: StubBundleTree,
  options: {
    assetsDir?: string;
    mode: 'refuse' | 'allow';
    scriptPath?: string;
  },
): BundleRun {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    PATH: `${tree.binDir}:${process.env.PATH ?? ''}`,
    OAT_BUNDLE_GUARD_LOG: tree.logPath,
    OAT_BUNDLE_GUARD_MODE: options.mode,
    OAT_BUNDLE_GUARD_REAL_PATH: process.env.PATH ?? '',
  };
  delete env.OAT_ASSETS_DIR;
  if (options.assetsDir !== undefined) {
    env.OAT_ASSETS_DIR = options.assetsDir;
  }

  try {
    execFileSync('bash', [options.scriptPath ?? tree.scriptPath], {
      env,
      stdio: 'pipe',
      encoding: 'utf8',
      timeout: 10_000,
    });
    return { status: 0, stderr: '' };
  } catch (error) {
    const failure = error as { status: number | null; stderr?: string };
    return { status: failure.status, stderr: failure.stderr ?? '' };
  }
}

function readGuardedCommandLog(tree: StubBundleTree): string {
  return readFileSync(tree.logPath, 'utf8');
}

function expectRejectedBeforeAnyCopy(
  tree: StubBundleTree,
  run: BundleRun,
  message: RegExp,
): void {
  expect(run.status).toBe(1);
  expect(run.stderr).toMatch(message);
  expect(readGuardedCommandLog(tree)).toBe('');
}

/** Every path at or below `path` with its file contents, for before/after equality. */
function snapshotPath(path: string): Record<string, string> {
  const snapshot: Record<string, string> = {};
  const visit = (current: string, label: string): void => {
    if (lstatSync(current).isDirectory()) {
      snapshot[label] = '<dir>';
      for (const name of readdirSync(current).sort()) {
        visit(join(current, name), `${label}/${name}`);
      }
    } else {
      snapshot[label] = readFileSync(current, 'utf8');
    }
  };
  visit(path, '.');
  return snapshot;
}

describe('bundle-assets fail-closed guards', () => {
  it.each(['docsRoot', 'migrationPrompt', 'dispatchMatrix'] as const)(
    'rejects an empty %s lookup before staging is created',
    (key) => {
      const tree = createStubBundleTree({ ...VALID_STUB_INVENTORY, [key]: '' });
      try {
        const run = runStubBundle(tree, {
          assetsDir: join(tree.scratch, 'out'),
          mode: 'refuse',
        });

        expectRejectedBeforeAnyCopy(
          tree,
          run,
          new RegExp(`inventory lookup '${key}' printed nothing`),
        );
        expect(existsSync(join(tree.scratch, 'out'))).toBe(false);
      } finally {
        rmSync(tree.scratch, { recursive: true, force: true });
      }
    },
    BUNDLE_ASSETS_TEST_TIMEOUT_MS,
  );

  it.each([
    ['.', /inventory lookup 'docsRoot' resolves to the repository root/],
    ['./', /inventory lookup 'docsRoot' resolves to the repository root/],
    ['/etc', /inventory lookup 'docsRoot' returned an absolute path/],
    ['apps/../..', /inventory lookup 'docsRoot' contains a '\.\.' segment/],
  ])(
    'rejects a docsRoot lookup of %j that escapes or equals the repository root',
    (value, message) => {
      const tree = createStubBundleTree({
        ...VALID_STUB_INVENTORY,
        docsRoot: value,
      });
      try {
        const run = runStubBundle(tree, {
          assetsDir: join(tree.scratch, 'out'),
          mode: 'refuse',
        });

        expectRejectedBeforeAnyCopy(tree, run, message);
      } finally {
        rmSync(tree.scratch, { recursive: true, force: true });
      }
    },
    BUNDLE_ASSETS_TEST_TIMEOUT_MS,
  );

  it.each([
    ['a bundled skill directory', 'repo/.agents/skills/demo-skill/bundle'],
    ['a copied template directory', 'repo/.oat/templates/ideas/bundle'],
    ['the docs source', 'repo/apps/demo-docs/docs/bundle'],
  ])(
    'rejects an assets destination whose staging lands inside %s before any copy',
    (_label, relativeDestination) => {
      const tree = createStubBundleTree(VALID_STUB_INVENTORY);
      try {
        const run = runStubBundle(tree, {
          assetsDir: join(tree.scratch, relativeDestination),
          mode: 'refuse',
        });

        expectRejectedBeforeAnyCopy(tree, run, /refusing to build/);
      } finally {
        rmSync(tree.scratch, { recursive: true, force: true });
      }
    },
    BUNDLE_ASSETS_TEST_TIMEOUT_MS,
  );

  it(
    'rejects an assets destination reached through a symlink alias of a copied source',
    () => {
      const tree = createStubBundleTree(VALID_STUB_INVENTORY);
      try {
        const alias = join(tree.scratch, 'alias');
        symlinkSync(join(tree.repoRoot, '.agents/skills/demo-skill'), alias);

        const run = runStubBundle(tree, {
          assetsDir: join(alias, 'bundle'),
          mode: 'refuse',
        });

        expectRejectedBeforeAnyCopy(tree, run, /refusing to build/);
        expect(
          existsSync(join(tree.repoRoot, '.agents/skills/demo-skill/bundle')),
        ).toBe(false);
      } finally {
        rmSync(tree.scratch, { recursive: true, force: true });
      }
    },
    BUNDLE_ASSETS_TEST_TIMEOUT_MS,
  );

  // The kernel resolves `<symlink>/..` to the parent of the symlink's target,
  // while a logical `cd` trims the text instead. The guard must check the
  // directory mkdir, cp, and mv will actually write to.
  it.each([
    ['the docs source', 'repo/apps/demo-docs/docs/sub'],
    ['a bundled skill directory', 'repo/.agents/skills/demo-skill/sub'],
  ])(
    'rejects an assets destination written as <symlink>/.. that lands inside %s',
    (_label, aliasTarget) => {
      const tree = createStubBundleTree(VALID_STUB_INVENTORY);
      try {
        mkdirSync(join(tree.scratch, aliasTarget), { recursive: true });
        const alias = join(tree.scratch, 'alias');
        symlinkSync(join(tree.scratch, aliasTarget), alias);

        // Built by hand: `join` would collapse `alias/..` lexically.
        const run = runStubBundle(tree, {
          assetsDir: `${alias}/../bundle`,
          mode: 'refuse',
        });

        expectRejectedBeforeAnyCopy(tree, run, /refusing to build/);
      } finally {
        rmSync(tree.scratch, { recursive: true, force: true });
      }
    },
    BUNDLE_ASSETS_TEST_TIMEOUT_MS,
  );

  // Publishing renames whatever sits at the destination away and deletes it,
  // so an OAT_ASSETS_DIR override that is populated but is not a bundle is
  // refused, whatever it holds: a canonical source, the repository, or a file.
  it.each([
    ['a populated directory outside the repository', 'populated'],
    ['the agents directory', 'repo/.agents/agents'],
    ['the repository root', 'repo'],
    ['the notices file', 'repo/NOTICES.md'],
  ])(
    'rejects %s as an assets destination with its contents intact',
    (_label, relativeDestination) => {
      const tree = createStubBundleTree(VALID_STUB_INVENTORY);
      try {
        writeTreeFile(
          join(tree.scratch, 'populated/agent-instruction.md'),
          '# a\n',
        );
        writeTreeFile(join(tree.scratch, 'populated/nested/rules.md'), '# r\n');
        const destination = join(tree.scratch, relativeDestination);
        const before = snapshotPath(destination);

        const run = runStubBundle(tree, {
          assetsDir: destination,
          mode: 'refuse',
        });

        expectRejectedBeforeAnyCopy(
          tree,
          run,
          /remove it or choose an empty directory/,
        );
        expect(snapshotPath(destination)).toEqual(before);
        expect(Object.keys(before).length).toBeGreaterThan(0);
      } finally {
        rmSync(tree.scratch, { recursive: true, force: true });
      }
    },
    BUNDLE_ASSETS_TEST_TIMEOUT_MS,
  );

  // A textual listing captured by command substitution loses trailing
  // newlines, so a directory whose only entry is named with newlines would
  // read as empty and be renamed away. Emptiness must not depend on names.
  it.each([
    ['a single newline', '\n'],
    ['two newlines', '\n\n'],
  ])(
    'rejects an OAT_ASSETS_DIR whose only entry is named %s, with its contents intact',
    (_label, name) => {
      const tree = createStubBundleTree(VALID_STUB_INVENTORY);
      try {
        const destination = join(tree.scratch, 'newline-entry');
        mkdirSync(destination);
        writeFileSync(join(destination, name), 'keep\n');
        const before = snapshotPath(destination);

        const run = runStubBundle(tree, {
          assetsDir: destination,
          mode: 'refuse',
        });

        expectRejectedBeforeAnyCopy(
          tree,
          run,
          /neither an empty directory nor a previous bundle/,
        );
        expect(snapshotPath(destination)).toEqual(before);
        expect(readFileSync(join(destination, name), 'utf8')).toBe('keep\n');
      } finally {
        rmSync(tree.scratch, { recursive: true, force: true });
      }
    },
    BUNDLE_ASSETS_TEST_TIMEOUT_MS,
  );

  // A directory that cannot be listed is not known to be empty, so it is
  // refused rather than renamed away. Root can list any directory, so the
  // case only discriminates for an unprivileged user.
  it.skipIf(process.getuid?.() === 0)(
    'rejects an unreadable OAT_ASSETS_DIR instead of treating it as empty',
    () => {
      const tree = createStubBundleTree(VALID_STUB_INVENTORY);
      const locked = join(tree.scratch, 'locked');
      try {
        writeTreeFile(join(locked, 'user-data.txt'), 'keep\n');
        chmodSync(locked, 0o000);

        const run = runStubBundle(tree, { assetsDir: locked, mode: 'refuse' });

        expectRejectedBeforeAnyCopy(tree, run, /cannot be listed/);
        chmodSync(locked, 0o755);
        expect(snapshotPath(locked)).toEqual({
          '.': '<dir>',
          './user-data.txt': 'keep\n',
        });
      } finally {
        chmodSync(locked, 0o755);
        rmSync(tree.scratch, { recursive: true, force: true });
      }
    },
    BUNDLE_ASSETS_TEST_TIMEOUT_MS,
  );

  it.each([
    ['an existing bundle', true],
    ['an empty directory', false],
  ])(
    'rebuilds an OAT_ASSETS_DIR that is %s',
    (_label, isBundle) => {
      const tree = createStubBundleTree(VALID_STUB_INVENTORY);
      try {
        const assetsDir = join(tree.scratch, 'out');
        mkdirSync(assetsDir);
        if (isBundle) {
          writeFileSync(join(assetsDir, 'bundle-metadata.json'), '{}\n');
          writeFileSync(join(assetsDir, 'stale.txt'), 'old\n');
        }

        const run = runStubBundle(tree, { assetsDir, mode: 'allow' });

        expect(run).toEqual({ status: 0, stderr: '' });
        expect(readFileSync(join(assetsDir, 'docs/index.md'), 'utf8')).toBe(
          '# docs\n',
        );
        expect(existsSync(join(assetsDir, 'stale.txt'))).toBe(false);
      } finally {
        rmSync(tree.scratch, { recursive: true, force: true });
      }
    },
    BUNDLE_ASSETS_TEST_TIMEOUT_MS,
  );

  // A fresh checkout carries the tracked files of packages/cli/assets but no
  // bundle-metadata.json, so the default destination is exempt from the rule.
  it(
    'still builds into a default destination holding only tracked files',
    () => {
      const tree = createStubBundleTree(VALID_STUB_INVENTORY);
      try {
        const assetsDir = join(tree.repoRoot, 'packages/cli/assets');
        writeTreeFile(join(assetsDir, 'public-package-versions.json'), '{}\n');

        const run = runStubBundle(tree, { mode: 'allow' });

        expect(run).toEqual({ status: 0, stderr: '' });
        expect(existsSync(join(assetsDir, 'bundle-metadata.json'))).toBe(true);
      } finally {
        rmSync(tree.scratch, { recursive: true, force: true });
      }
    },
    BUNDLE_ASSETS_TEST_TIMEOUT_MS,
  );

  // The likely Wave 3 disk-fill trigger: through a symlinked checkout, node resolved
  // the inventory module to its real path while argv[1] kept the link, the
  // entry check never matched, and every lookup printed nothing.
  it(
    'builds through a symlinked checkout path with the shipped inventory entry check',
    () => {
      const tree = createStubBundleTree(VALID_STUB_INVENTORY, {
        realInventoryEntry: true,
      });
      try {
        const checkoutLink = join(tree.scratch, 'checkout-link');
        symlinkSync(tree.repoRoot, checkoutLink);
        const assetsDir = join(tree.scratch, 'out');

        const run = runStubBundle(tree, {
          assetsDir,
          mode: 'allow',
          scriptPath: join(
            checkoutLink,
            'packages/cli/scripts/bundle-assets.sh',
          ),
        });

        expect(run).toEqual({ status: 0, stderr: '' });
        expect(readFileSync(join(assetsDir, 'docs/index.md'), 'utf8')).toBe(
          '# docs\n',
        );
      } finally {
        rmSync(tree.scratch, { recursive: true, force: true });
      }
    },
    BUNDLE_ASSETS_TEST_TIMEOUT_MS,
  );

  // The repository-root check compares physical paths, so a symlink that names
  // the repository root is caught as well as `.` and `./`.
  // Invoked through a symlinked checkout, REPO_ROOT is only physical because of
  // `pwd -P`; the root check normalizes both sides so it holds on its own. The
  // destination sits outside the tree, so no recursion rule can stand in.
  it(
    'rejects a root-valued lookup run through a symlinked checkout path',
    () => {
      const tree = createStubBundleTree({
        ...VALID_STUB_INVENTORY,
        docsRoot: '.',
      });
      try {
        const checkoutLink = join(tree.scratch, 'checkout-link');
        symlinkSync(tree.repoRoot, checkoutLink);

        const run = runStubBundle(tree, {
          assetsDir: join(tree.scratch, 'out'),
          mode: 'refuse',
          scriptPath: join(
            checkoutLink,
            'packages/cli/scripts/bundle-assets.sh',
          ),
        });

        expectRejectedBeforeAnyCopy(
          tree,
          run,
          /inventory lookup 'docsRoot' resolves to the repository root/,
        );
      } finally {
        rmSync(tree.scratch, { recursive: true, force: true });
      }
    },
    BUNDLE_ASSETS_TEST_TIMEOUT_MS,
  );

  it(
    'rejects an inventory lookup that is a symlink to the repository root',
    () => {
      const tree = createStubBundleTree({
        ...VALID_STUB_INVENTORY,
        docsRoot: 'apps/root-link',
      });
      try {
        symlinkSync('..', join(tree.repoRoot, 'apps/root-link'));

        const run = runStubBundle(tree, {
          assetsDir: join(tree.scratch, 'out'),
          mode: 'refuse',
        });

        expectRejectedBeforeAnyCopy(
          tree,
          run,
          /inventory lookup 'docsRoot' resolves to the repository root/,
        );
      } finally {
        rmSync(tree.scratch, { recursive: true, force: true });
      }
    },
    BUNDLE_ASSETS_TEST_TIMEOUT_MS,
  );

  it(
    'still builds into a disjoint destination',
    () => {
      const tree = createStubBundleTree(VALID_STUB_INVENTORY);
      try {
        const assetsDir = join(tree.scratch, 'out/assets');
        const run = runStubBundle(tree, { assetsDir, mode: 'allow' });

        expect(run).toEqual({ status: 0, stderr: '' });
        expect(
          readFileSync(join(assetsDir, 'skills/demo-skill/SKILL.md'), 'utf8'),
        ).toBe('# demo\n');
        expect(existsSync(join(assetsDir, 'skills/demo-skill/tests'))).toBe(
          false,
        );
        expect(readFileSync(join(assetsDir, 'docs/index.md'), 'utf8')).toBe(
          '# docs\n',
        );
        expect(existsSync(join(assetsDir, 'templates/ideas/idea.md'))).toBe(
          true,
        );
        expect(readGuardedCommandLog(tree)).toMatch(/^cp /m);
      } finally {
        rmSync(tree.scratch, { recursive: true, force: true });
      }
    },
    BUNDLE_ASSETS_TEST_TIMEOUT_MS,
  );

  it(
    'still builds into the default destination',
    () => {
      const tree = createStubBundleTree(VALID_STUB_INVENTORY);
      try {
        const run = runStubBundle(tree, { mode: 'allow' });

        expect(run).toEqual({ status: 0, stderr: '' });
        const assetsDir = join(tree.repoRoot, 'packages/cli/assets');
        expect(
          JSON.parse(
            readFileSync(join(assetsDir, 'bundle-metadata.json'), 'utf8'),
          ),
        ).toEqual({ schemaVersion: 1, oatVersion: '9.9.9' });
        expect(existsSync(join(assetsDir, 'docs/index.md'))).toBe(true);
      } finally {
        rmSync(tree.scratch, { recursive: true, force: true });
      }
    },
    BUNDLE_ASSETS_TEST_TIMEOUT_MS,
  );

  describe('bundle-inputs.mjs path lookups', () => {
    const realDocsRootEntry = "docsRoot: 'apps/oat-docs/docs',";

    function runInventoryCopyWithDocsRoot(value: string): BundleRun {
      const scratch = realpathSync(
        mkdtempSync(join(tmpdir(), 'oat-bundle-inputs-')),
      );
      try {
        const source = readFileSync(getBundleInventoryPath(), 'utf8');
        expect(source).toContain(realDocsRootEntry);
        const inventoryCopy = join(scratch, 'bundle-inputs.mjs');
        writeFileSync(
          inventoryCopy,
          source.replace(
            realDocsRootEntry,
            `docsRoot: ${JSON.stringify(value)},`,
          ),
        );
        try {
          execFileSync(process.execPath, [inventoryCopy, '--get', 'docsRoot'], {
            stdio: 'pipe',
            encoding: 'utf8',
          });
          return { status: 0, stderr: '' };
        } catch (error) {
          const failure = error as { status: number | null; stderr?: string };
          return { status: failure.status, stderr: failure.stderr ?? '' };
        }
      } finally {
        rmSync(scratch, { recursive: true, force: true });
      }
    }

    it.each([
      ['', /docsRoot.*is empty/],
      ['/abs/docs', /docsRoot.*is an absolute path/],
      ['apps/../docs', /docsRoot.*contains a '\.\.' segment/],
    ])(
      'rejects a docsRoot value of %j with a non-zero exit',
      (value, message) => {
        const run = runInventoryCopyWithDocsRoot(value);

        expect(run.status).not.toBe(0);
        expect(run.stderr).toMatch(message);
      },
    );

    it('runs its CLI when invoked through a symlinked checkout path', () => {
      const scratch = realpathSync(
        mkdtempSync(join(tmpdir(), 'oat-bundle-inputs-link-')),
      );
      try {
        const checkoutLink = join(scratch, 'checkout-link');
        symlinkSync(
          join(dirname(getBundleInventoryPath()), '../../..'),
          checkoutLink,
        );

        expect(
          execFileSync(
            process.execPath,
            [
              join(checkoutLink, 'packages/cli/scripts/bundle-inputs.mjs'),
              '--get',
              'docsRoot',
            ],
            { encoding: 'utf8' },
          ),
        ).toBe('apps/oat-docs/docs\n');
      } finally {
        rmSync(scratch, { recursive: true, force: true });
      }
    });

    it('prints the real repository-relative docs root', () => {
      expect(
        execFileSync(
          process.execPath,
          [getBundleInventoryPath(), '--get', 'docsRoot'],
          { encoding: 'utf8' },
        ),
      ).toBe('apps/oat-docs/docs\n');
    });
  });
});
