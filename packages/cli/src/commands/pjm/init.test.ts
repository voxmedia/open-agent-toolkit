import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { initializeDecisionAgentsGuidance } from '@commands/decision/agents-guidance';
import { initializeDecisionRecords } from '@commands/decision/init';
import { afterEach, describe, expect, it } from 'vitest';

import { initializeRepoReference, INSTRUCTIONS_SYNC_HINT } from './init';

// Repo-root `.oat/templates/` directory. The synthetic `seedTemplate` fixtures
// below write stub bodies, so template *content* can only be asserted against
// the real source templates that ship in the bundle.
const REPO_TEMPLATES_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..',
  '..',
  '..',
  '.oat',
  'templates',
);

async function readRepoTemplate(name: string): Promise<string> {
  return readFile(join(REPO_TEMPLATES_DIR, name), 'utf8');
}

const TEMPLATE_NAMES = [
  'current-state.md',
  'roadmap.md',
  'repo-agents.md',
  'pjm-agents.md',
  'reference-agents.md',
  'repo-readme.md',
  'pjm-handoffs-readme.md',
] as const;

const EXPECTED_FILES = [
  'AGENTS.md',
  'pjm/AGENTS.md',
  'pjm/current-state.md',
  'pjm/roadmap.md',
  'reference/AGENTS.md',
  'README.md',
  'pjm/handoffs/README.md',
  'pjm/backlog/index.md',
  'pjm/backlog/completed.md',
  'pjm/backlog/items/.gitkeep',
  'pjm/backlog/archived/.gitkeep',
  'reference/decisions/AGENTS.md',
  'reference/decisions/index.md',
] as const;

async function seedTemplate(
  root: string,
  name: (typeof TEMPLATE_NAMES)[number],
  body = `# ${name}\n`,
): Promise<void> {
  await mkdir(root, { recursive: true });
  await writeFile(
    join(root, name),
    [
      '---',
      'oat_template: true',
      `oat_template_name: ${name.replace('.md', '')}`,
      '---',
      '',
      body,
    ].join('\n'),
    'utf8',
  );
}

async function seedTemplates(root: string): Promise<void> {
  for (const name of TEMPLATE_NAMES) {
    await seedTemplate(root, name);
  }
}

describe('initializeRepoReference', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tempDirs.map((dir) => rm(dir, { recursive: true, force: true })),
    );
    tempDirs.length = 0;
  });

  it('creates the canonical two-layer PJM scaffold for a fresh root', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-pjm-init-'));
    tempDirs.push(root);
    const assetsRoot = join(root, 'assets');
    const repoRoot = join(root, 'repo');
    await seedTemplates(join(assetsRoot, 'templates'));

    const result = await initializeRepoReference({ assetsRoot, repoRoot });

    expect(result.repoRoot).toBe(repoRoot);
    expect(result.created).toEqual(EXPECTED_FILES);
    expect(result.skipped).toEqual([]);

    for (const relativePath of EXPECTED_FILES) {
      await expect(
        access(join(repoRoot, relativePath)),
      ).resolves.toBeUndefined();
    }
    await expect(
      access(join(repoRoot, 'reference', 'decision-record.md')),
    ).rejects.toThrow();
    await expect(
      access(join(repoRoot, 'reference', 'backlog')),
    ).rejects.toThrow();
  });

  it('emits the human README and the pjm handoffs README', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-pjm-init-'));
    tempDirs.push(root);
    const assetsRoot = join(root, 'assets');
    const repoRoot = join(root, 'repo');
    await seedTemplates(join(assetsRoot, 'templates'));

    const result = await initializeRepoReference({ assetsRoot, repoRoot });

    expect(result.created).toContain('README.md');
    expect(result.created).toContain('pjm/handoffs/README.md');
    await expect(access(join(repoRoot, 'README.md'))).resolves.toBeUndefined();
    await expect(
      access(join(repoRoot, 'pjm', 'handoffs', 'README.md')),
    ).resolves.toBeUndefined();
  });

  it('backfills a deleted README/handoffs README without touching existing files', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-pjm-init-'));
    tempDirs.push(root);
    const assetsRoot = join(root, 'assets');
    const repoRoot = join(root, 'repo');
    await seedTemplates(join(assetsRoot, 'templates'));

    await initializeRepoReference({ assetsRoot, repoRoot });
    // Curate an existing file, then delete the two READMEs so the rerun must
    // backfill only the missing ones.
    const curated = '# Curated current state\n';
    await writeFile(join(repoRoot, 'pjm', 'current-state.md'), curated, 'utf8');
    await rm(join(repoRoot, 'README.md'));
    await rm(join(repoRoot, 'pjm', 'handoffs', 'README.md'));

    const second = await initializeRepoReference({ assetsRoot, repoRoot });

    expect(second.created).toEqual(['README.md', 'pjm/handoffs/README.md']);
    await expect(
      readFile(join(repoRoot, 'pjm', 'current-state.md'), 'utf8'),
    ).resolves.toBe(curated);
    expect(second.skipped).toContain('pjm/current-state.md');
  });

  it('exposes a sync next-step hint mentioning oat instructions sync and --dry-run', () => {
    expect(INSTRUCTIONS_SYNC_HINT).toContain('oat instructions sync');
    expect(INSTRUCTIONS_SYNC_HINT).toContain('--dry-run');
  });

  it('does not overwrite existing canonical docs and reports them as skipped', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-pjm-init-'));
    tempDirs.push(root);
    const assetsRoot = join(root, 'assets');
    const repoRoot = join(root, 'repo');
    const roadmapSentinel = '# Curated roadmap\n';
    const decisionGuidanceSentinel = '# Curated decision guidance\n';
    await seedTemplates(join(assetsRoot, 'templates'));
    await mkdir(join(repoRoot, 'pjm'), { recursive: true });
    await mkdir(join(repoRoot, 'reference', 'decisions'), { recursive: true });
    await writeFile(join(repoRoot, 'pjm', 'roadmap.md'), roadmapSentinel, {
      encoding: 'utf8',
      flag: 'wx',
    });
    await writeFile(
      join(repoRoot, 'reference', 'decisions', 'AGENTS.md'),
      decisionGuidanceSentinel,
      {
        encoding: 'utf8',
        flag: 'wx',
      },
    );

    const result = await initializeRepoReference({ assetsRoot, repoRoot });

    await expect(
      readFile(join(repoRoot, 'pjm', 'roadmap.md'), 'utf8'),
    ).resolves.toBe(roadmapSentinel);
    await expect(
      readFile(join(repoRoot, 'reference', 'decisions', 'AGENTS.md'), 'utf8'),
    ).resolves.toBe(decisionGuidanceSentinel);
    expect(result.skipped).toContain('pjm/roadmap.md');
    expect(result.skipped).toContain('reference/decisions/AGENTS.md');
    expect(result.created).not.toContain('pjm/roadmap.md');
    expect(result.created).not.toContain('reference/decisions/AGENTS.md');
  });

  it('is idempotent on rerun', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-pjm-init-'));
    tempDirs.push(root);
    const assetsRoot = join(root, 'assets');
    const repoRoot = join(root, 'repo');
    await seedTemplates(join(assetsRoot, 'templates'));

    await initializeRepoReference({ assetsRoot, repoRoot });
    const second = await initializeRepoReference({ assetsRoot, repoRoot });

    expect(second.created).toEqual([]);
    expect(second.skipped).toEqual(EXPECTED_FILES);
  });

  it('composes with an existing standalone decision scaffold', async () => {
    const projectRoot = await mkdtemp(join(tmpdir(), 'oat-pjm-init-'));
    tempDirs.push(projectRoot);
    const assetsRoot = join(projectRoot, 'assets');
    const repoRoot = join(projectRoot, '.oat', 'repo');
    const decisionsRoot = join(repoRoot, 'reference', 'decisions');
    await seedTemplates(join(assetsRoot, 'templates'));
    await initializeDecisionRecords(decisionsRoot);
    await initializeDecisionAgentsGuidance({
      projectRoot,
      decisionsRoot,
    });
    const standaloneGuidance = await readFile(
      join(decisionsRoot, 'AGENTS.md'),
      'utf8',
    );

    const result = await initializeRepoReference({ assetsRoot, repoRoot });

    expect(result.skipped).toContain('reference/decisions/AGENTS.md');
    expect(result.skipped).toContain('reference/decisions/index.md');
    await expect(
      readFile(join(decisionsRoot, 'AGENTS.md'), 'utf8'),
    ).resolves.toBe(standaloneGuidance);
    await expect(
      access(join(repoRoot, 'reference', 'AGENTS.md')),
    ).resolves.toBeUndefined();
    await expect(
      access(join(repoRoot, 'pjm', 'current-state.md')),
    ).resolves.toBeUndefined();
  });

  it('prefers repo-local templates and falls back to bundled assets', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-pjm-init-'));
    tempDirs.push(root);
    const assetsRoot = join(root, 'assets');
    const templatesRoot = join(root, '.oat', 'templates');
    const repoRoot = join(root, 'repo');
    await seedTemplates(join(assetsRoot, 'templates'));
    await seedTemplate(
      templatesRoot,
      'current-state.md',
      '# Local Current State\n',
    );

    await initializeRepoReference({ assetsRoot, repoRoot, templatesRoot });

    await expect(
      readFile(join(repoRoot, 'pjm', 'current-state.md'), 'utf8'),
    ).resolves.toContain('# Local Current State');
    await expect(
      readFile(join(repoRoot, 'pjm', 'roadmap.md'), 'utf8'),
    ).resolves.toContain('# roadmap.md');
  });

  it('strips template frontmatter from instantiated docs and AGENTS guides', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-pjm-init-'));
    tempDirs.push(root);
    const assetsRoot = join(root, 'assets');
    const repoRoot = join(root, 'repo');
    await seedTemplates(join(assetsRoot, 'templates'));

    await initializeRepoReference({ assetsRoot, repoRoot });

    for (const relativePath of [
      'AGENTS.md',
      'pjm/current-state.md',
      'reference/AGENTS.md',
    ]) {
      const content = await readFile(join(repoRoot, relativePath), 'utf8');
      expect(content).not.toContain('oat_template:');
      expect(content).not.toContain('oat_template_name:');
      expect(content.startsWith('# ')).toBe(true);
    }
  });

  it('throws an actionable error when a template is missing from both sources', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-pjm-init-'));
    tempDirs.push(root);
    const assetsRoot = join(root, 'assets');
    const templatesRoot = join(root, '.oat', 'templates');
    const repoRoot = join(root, 'repo');
    await seedTemplate(join(assetsRoot, 'templates'), 'current-state.md');
    await seedTemplate(join(assetsRoot, 'templates'), 'roadmap.md');
    await seedTemplate(join(assetsRoot, 'templates'), 'repo-agents.md');
    await seedTemplate(join(assetsRoot, 'templates'), 'pjm-agents.md');

    await expect(
      initializeRepoReference({ assetsRoot, repoRoot, templatesRoot }),
    ).rejects.toThrow(
      'Template reference-agents.md was not found in repo-local templates or bundled assets.',
    );
  });
});

describe('pjm instruction template source content', () => {
  it('bakes the backlog lifecycle and kickoff-handoff sections into pjm-agents.md', async () => {
    const content = await readRepoTemplate('pjm-agents.md');

    expect(content).toContain('## Backlog Lifecycle');
    expect(content).toContain('## Project Kickoff Handoffs');
    // Close-out is rewritten around the atomic command as the primary path.
    expect(content).toContain('oat backlog archive');
    // Skills-repo terminal-status clause is upstreamed verbatim.
    expect(content).toContain('never invent variants like `done`');
    // The handoffs section references the convention doc and its deletion rule.
    expect(content).toContain('handoffs/<BL-id>.md');
    expect(content).toContain('git rm');
  });

  it('defers the close-out workflow to ../pjm/AGENTS.md in reference-agents.md', async () => {
    const content = await readRepoTemplate('reference-agents.md');

    expect(content).toContain('../pjm/AGENTS.md');
    expect(content.toLowerCase()).toContain('source of truth');
  });

  it('points the repo AGENTS guide at the lifecycle section and the README', async () => {
    const content = await readRepoTemplate('repo-agents.md');

    expect(content).toContain('Backlog Lifecycle');
    expect(content).toContain('pjm/AGENTS.md');
    expect(content).toContain('README.md');
  });

  it('orients humans with a canonical layout table in repo-readme.md', async () => {
    const content = await readRepoTemplate('repo-readme.md');

    expect(content).toContain('## Layout');
    expect(content).toContain('`pjm/handoffs/`');
    expect(content).toContain('BL-YYMMDD-slug');
    expect(content).toContain('oat backlog archive');
  });

  it('documents the consumable handoffs convention in pjm-handoffs-readme.md', async () => {
    const content = await readRepoTemplate('pjm-handoffs-readme.md');

    expect(content).toContain('<BL-id>.md');
    expect(content).toContain('consumable');
    expect(content).toContain('git rm');
  });
});
