import {
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { validateOatSkills } from './skills';

async function createSkillFile(
  root: string,
  dirName: string,
  content: string,
): Promise<string> {
  const skillDir = join(root, '.agents', 'skills', dirName);
  await mkdir(skillDir, { recursive: true });
  const skillPath = join(skillDir, 'SKILL.md');
  await writeFile(skillPath, content, 'utf8');
  return skillPath;
}

function validSkillContent(skillName: string): string {
  return [
    '---',
    `name: ${skillName}`,
    'description: Use when validating oat skill structure. Provides a valid fixture for validator tests.',
    'disable-model-invocation: true',
    'user-invocable: true',
    'allowed-tools: Read, Write',
    '---',
    '',
    '# Demo',
    '',
    '## Progress Indicators (User-Facing)',
    '',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    ' OAT ▸ DEMO',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
  ].join('\n');
}

function currentSkillContent(
  skillName: string,
  version: string,
  body: string,
): string {
  return [
    '---',
    `name: ${skillName}`,
    `version: ${version}`,
    'description: Use when validating oat skill structure. Provides a valid fixture for validator tests.',
    'disable-model-invocation: true',
    'user-invocable: true',
    'allowed-tools: Read, Write',
    '---',
    '',
    '# Demo',
    '',
    '## Progress Indicators (User-Facing)',
    '',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    ' OAT ▸ DEMO',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    '',
    body,
  ].join('\n');
}

describe('validateOatSkills', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tempDirs.map(async (dir) => {
        await rm(dir, { recursive: true, force: true });
      }),
    );
    tempDirs.length = 0;
  });

  it('reports missing SKILL.md', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-validate-'));
    tempDirs.push(root);
    await mkdir(join(root, '.agents', 'skills', 'oat-missing'), {
      recursive: true,
    });

    const result = await validateOatSkills(root);
    expect(result.validatedSkillCount).toBe(1);
    expect(result.findings).toEqual([
      expect.objectContaining({
        file: join(root, '.agents', 'skills', 'oat-missing', 'SKILL.md'),
        message: 'Missing SKILL.md',
      }),
    ]);
  });

  it('reports missing frontmatter block', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-validate-'));
    tempDirs.push(root);
    const skillPath = await createSkillFile(
      root,
      'oat-no-frontmatter',
      '# demo\n\nbody',
    );

    const result = await validateOatSkills(root);
    expect(result.findings).toEqual([
      expect.objectContaining({
        file: skillPath,
        message: 'Missing frontmatter block (--- ... ---)',
      }),
    ]);
  });

  it('reports missing required frontmatter keys', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-validate-'));
    tempDirs.push(root);
    const skillPath = await createSkillFile(
      root,
      'oat-missing-keys',
      [
        '---',
        'name: oat-missing-keys',
        'description: Use when validating missing frontmatter keys. Provides fixture content for required-key checks.',
        'disable-model-invocation: true',
        '---',
        '',
        '# Demo',
        '',
        '## Progress Indicators (User-Facing)',
        '',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        ' OAT ▸ DEMO',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      ].join('\n'),
    );

    const result = await validateOatSkills(root);
    expect(result.findings).toEqual([
      expect.objectContaining({
        file: skillPath,
        message: 'Missing frontmatter key: user-invocable',
      }),
      expect.objectContaining({
        file: skillPath,
        message: 'Missing frontmatter key: allowed-tools',
      }),
    ]);
  });

  it('reports missing Progress Indicators heading', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-validate-'));
    tempDirs.push(root);
    const skillPath = await createSkillFile(
      root,
      'oat-no-progress-heading',
      [
        '---',
        'name: oat-no-progress-heading',
        'description: Use when validating missing progress heading behavior. Provides fixture content for heading checks.',
        'disable-model-invocation: true',
        'user-invocable: true',
        'allowed-tools: Read, Write',
        '---',
        '',
        '# Demo',
      ].join('\n'),
    );

    const result = await validateOatSkills(root);
    expect(result.findings).toEqual([
      expect.objectContaining({
        file: skillPath,
        message:
          'Missing section heading: ## Progress Indicators (User-Facing)',
      }),
    ]);
  });

  it('reports missing banner snippet when heading exists', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-validate-'));
    tempDirs.push(root);
    const skillPath = await createSkillFile(
      root,
      'oat-no-banner',
      [
        '---',
        'name: oat-no-banner',
        'description: Use when validating banner requirements. Provides fixture content for banner checks.',
        'disable-model-invocation: true',
        'user-invocable: true',
        'allowed-tools: Read, Write',
        '---',
        '',
        '# Demo',
        '',
        '## Progress Indicators (User-Facing)',
        '',
        'No banner here',
      ].join('\n'),
    );

    const result = await validateOatSkills(root);
    expect(result.findings).toEqual([
      expect.objectContaining({
        file: skillPath,
        message:
          'Progress Indicators section missing banner snippet (separator lines + "OAT ▸ ...")',
      }),
    ]);
  });

  it('passes for valid oat-* skills and ignores non-oat directories', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-validate-'));
    tempDirs.push(root);
    await createSkillFile(
      root,
      'oat-valid-one',
      validSkillContent('oat-valid-one'),
    );
    await createSkillFile(
      root,
      'oat-valid-two',
      validSkillContent('oat-valid-two'),
    );
    await createSkillFile(root, 'non-oat-dir', '# ignored');

    const result = await validateOatSkills(root);
    expect(result.validatedSkillCount).toBe(2);
    expect(result.findings).toEqual([]);
  });

  it('reports frontmatter name mismatch with directory', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-validate-'));
    tempDirs.push(root);
    const skillPath = await createSkillFile(
      root,
      'oat-name-mismatch',
      [
        '---',
        'name: oat-other-name',
        'description: Use when validating name matching behavior. Provides fixture content for name checks.',
        'disable-model-invocation: true',
        'user-invocable: true',
        'allowed-tools: Read, Write',
        '---',
        '',
        '# Demo',
        '',
        '## Progress Indicators (User-Facing)',
        '',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        ' OAT ▸ DEMO',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      ].join('\n'),
    );

    const result = await validateOatSkills(root);
    expect(result.findings).toEqual([
      expect.objectContaining({
        file: skillPath,
        message:
          'Frontmatter name must match directory name (expected: oat-name-mismatch, found: oat-other-name)',
      }),
    ]);
  });

  it('reports description that does not start with an allowed trigger stem', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-validate-'));
    tempDirs.push(root);
    const skillPath = await createSkillFile(
      root,
      'oat-bad-description-prefix',
      [
        '---',
        'name: oat-bad-description-prefix',
        'description: This description does not use the required prefix.',
        'disable-model-invocation: true',
        'user-invocable: true',
        'allowed-tools: Read, Write',
        '---',
        '',
        '# Demo',
        '',
        '## Progress Indicators (User-Facing)',
        '',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        ' OAT ▸ DEMO',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      ].join('\n'),
    );

    const result = await validateOatSkills(root);
    expect(result.findings).toEqual([
      expect.objectContaining({
        file: skillPath,
        message:
          'Frontmatter description must start with one of: "Use when", "Run when", "Trigger when"',
      }),
    ]);
  });

  it('accepts description that starts with Run when', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-validate-'));
    tempDirs.push(root);
    await createSkillFile(
      root,
      'oat-run-when-valid',
      [
        '---',
        'name: oat-run-when-valid',
        'description: Run when validating alternate trigger stems for frontmatter descriptions. Confirms validator flexibility.',
        'disable-model-invocation: true',
        'user-invocable: true',
        'allowed-tools: Read, Write',
        '---',
        '',
        '# Demo',
        '',
        '## Progress Indicators (User-Facing)',
        '',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        ' OAT ▸ DEMO',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      ].join('\n'),
    );

    const result = await validateOatSkills(root);
    expect(result.findings).toEqual([]);
  });

  it('accepts description that starts with Trigger when', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-validate-'));
    tempDirs.push(root);
    await createSkillFile(
      root,
      'oat-trigger-when-valid',
      [
        '---',
        'name: oat-trigger-when-valid',
        'description: Trigger when validating alternate trigger stems for frontmatter descriptions. Confirms validator flexibility.',
        'disable-model-invocation: true',
        'user-invocable: true',
        'allowed-tools: Read, Write',
        '---',
        '',
        '# Demo',
        '',
        '## Progress Indicators (User-Facing)',
        '',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        ' OAT ▸ DEMO',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      ].join('\n'),
    );

    const result = await validateOatSkills(root);
    expect(result.findings).toEqual([]);
  });

  it('accepts description that starts with Use when', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-validate-'));
    tempDirs.push(root);
    await createSkillFile(
      root,
      'oat-use-when-valid',
      [
        '---',
        'name: oat-use-when-valid',
        'description: Use when validating the default trigger stem for frontmatter descriptions. Confirms validator baseline.',
        'disable-model-invocation: true',
        'user-invocable: true',
        'allowed-tools: Read, Write',
        '---',
        '',
        '# Demo',
        '',
        '## Progress Indicators (User-Facing)',
        '',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        ' OAT ▸ DEMO',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      ].join('\n'),
    );

    const result = await validateOatSkills(root);
    expect(result.findings).toEqual([]);
  });

  it('rejects lowercase trigger stem even if wording matches', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-validate-'));
    tempDirs.push(root);
    const skillPath = await createSkillFile(
      root,
      'oat-lowercase-trigger',
      [
        '---',
        'name: oat-lowercase-trigger',
        'description: use when validating case-sensitive trigger stems. This should fail current validation.',
        'disable-model-invocation: true',
        'user-invocable: true',
        'allowed-tools: Read, Write',
        '---',
        '',
        '# Demo',
        '',
        '## Progress Indicators (User-Facing)',
        '',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        ' OAT ▸ DEMO',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      ].join('\n'),
    );

    const result = await validateOatSkills(root);
    expect(result.findings).toEqual([
      expect.objectContaining({
        file: skillPath,
        message:
          'Frontmatter description must start with one of: "Use when", "Run when", "Trigger when"',
      }),
    ]);
  });

  it('reports description longer than 500 characters', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-validate-'));
    tempDirs.push(root);
    const longDescription = `Use when validating description length enforcement. ${'x'.repeat(460)}`;
    const skillPath = await createSkillFile(
      root,
      'oat-description-too-long',
      [
        '---',
        'name: oat-description-too-long',
        `description: ${longDescription}`,
        'disable-model-invocation: true',
        'user-invocable: true',
        'allowed-tools: Read, Write',
        '---',
        '',
        '# Demo',
        '',
        '## Progress Indicators (User-Facing)',
        '',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        ' OAT ▸ DEMO',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      ].join('\n'),
    );

    const result = await validateOatSkills(root);
    expect(result.findings).toEqual([
      expect.objectContaining({
        file: skillPath,
        message: expect.stringContaining(
          'Frontmatter description exceeds 500 characters',
        ),
      }),
    ]);
  });

  it('accepts valid semver version frontmatter when present', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-validate-'));
    tempDirs.push(root);
    await createSkillFile(
      root,
      'oat-semver-valid',
      [
        '---',
        'name: oat-semver-valid',
        'version: 1.2.3',
        'description: Use when validating optional semver version metadata in frontmatter.',
        'disable-model-invocation: true',
        'user-invocable: true',
        'allowed-tools: Read, Write',
        '---',
        '',
        '# Demo',
        '',
        '## Progress Indicators (User-Facing)',
        '',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        ' OAT ▸ DEMO',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      ].join('\n'),
    );

    const result = await validateOatSkills(root);
    expect(result.findings).toEqual([]);
  });

  it('reports invalid semver version frontmatter', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-validate-'));
    tempDirs.push(root);
    const skillPath = await createSkillFile(
      root,
      'oat-semver-invalid',
      [
        '---',
        'name: oat-semver-invalid',
        'version: 1.2',
        'description: Use when validating invalid semver version metadata in frontmatter.',
        'disable-model-invocation: true',
        'user-invocable: true',
        'allowed-tools: Read, Write',
        '---',
        '',
        '# Demo',
        '',
        '## Progress Indicators (User-Facing)',
        '',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        ' OAT ▸ DEMO',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      ].join('\n'),
    );

    const result = await validateOatSkills(root);
    expect(result.findings).toEqual([
      expect.objectContaining({
        file: skillPath,
        message: 'Frontmatter version must be valid semver (e.g., 1.0.0)',
      }),
    ]);
  });

  it('requires bundled oat skill files to include valid semver versions', async () => {
    const repoRoot = join(process.cwd(), '..', '..');
    const bundleScriptPath = join(
      repoRoot,
      'packages',
      'cli',
      'scripts',
      'bundle-assets.sh',
    );
    const bundleScript = await readFile(bundleScriptPath, 'utf8');
    const lines = bundleScript.split('\n');

    const bundledSkills: string[] = [];
    let inSkillsBlock = false;
    for (const line of lines) {
      if (line.trim() === 'SKILLS=(') {
        inSkillsBlock = true;
        continue;
      }
      if (inSkillsBlock && line.trim() === ')') {
        break;
      }
      if (inSkillsBlock) {
        const name = line.trim();
        if (name.startsWith('oat-')) {
          bundledSkills.push(name);
        }
      }
    }

    expect(bundledSkills.length).toBeGreaterThan(0);

    for (const skillName of bundledSkills) {
      const skillPath = join(
        repoRoot,
        '.agents',
        'skills',
        skillName,
        'SKILL.md',
      );
      const content = await readFile(skillPath, 'utf8');
      const match = content.match(/^version:\s*(.+)$/m);
      expect(match?.[1]?.trim()).toMatch(/^\d+\.\d+\.\d+$/);
    }
  });

  it('requires all repo skill files to include valid semver versions', async () => {
    const repoRoot = join(process.cwd(), '..', '..');
    const skillsRoot = join(repoRoot, '.agents', 'skills');
    const entries = await readdir(skillsRoot, { withFileTypes: true });
    const skillDirs = entries
      .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
      .map((entry) => entry.name)
      .sort();

    expect(skillDirs.length).toBeGreaterThan(0);

    const invalidVersions: string[] = [];
    for (const skillName of skillDirs) {
      const skillPath = join(skillsRoot, skillName, 'SKILL.md');
      const content = await readFile(skillPath, 'utf8');
      const version = content.match(/^version:\s*(.+)$/m)?.[1]?.trim();
      if (!version || !/^\d+\.\d+\.\d+$/.test(version)) {
        invalidVersions.push(`${skillName}: ${version ?? '<missing>'}`);
      }
    }

    expect(invalidVersions).toEqual([]);
  });

  it('requires quick-start to describe session-context synthesis and discovery backfill', async () => {
    const repoRoot = join(process.cwd(), '..', '..');
    const skillPath = join(
      repoRoot,
      '.agents',
      'skills',
      'oat-project-quick-start',
      'SKILL.md',
    );
    const content = await readFile(skillPath, 'utf8');

    expect(content).toMatch(
      /synthesi(?:ze|s)\s+`?discovery\.md`?\s+from .*session context/i,
    );
    expect(content).toMatch(
      /backfill(?:s|ing)? .*discovery.*(discussion|q&a|decisions)/i,
    );
    expect(content).toMatch(
      /ask only (?:the )?minimum additional questions needed to remove blockers/i,
    );
  });

  it('tracks the quick-start skill contract version explicitly', async () => {
    const repoRoot = join(process.cwd(), '..', '..');
    const skillPath = join(
      repoRoot,
      '.agents',
      'skills',
      'oat-project-quick-start',
      'SKILL.md',
    );
    const content = await readFile(skillPath, 'utf8');

    expect(content.match(/^version:\s*(.+)$/m)?.[1]?.trim()).toBe('1.3.1');
  });

  it('reports missing quick-start-specific discovery guidance', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-validate-'));
    tempDirs.push(root);
    const skillPath = await createSkillFile(
      root,
      'oat-project-quick-start',
      [
        '---',
        'name: oat-project-quick-start',
        'description: Use when validating quick-start specific guardrails.',
        'disable-model-invocation: true',
        'user-invocable: true',
        'allowed-tools: Read, Write',
        '---',
        '',
        '# Quick Start',
        '',
        '## Progress Indicators (User-Facing)',
        '',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        ' OAT ▸ QUICK START',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        '',
        'Minimal body without the required quick-start discovery semantics.',
      ].join('\n'),
    );

    const result = await validateOatSkills(root);
    expect(result.findings).toEqual([
      expect.objectContaining({
        file: skillPath,
        message:
          'Quick-start must describe synthesizing discovery.md from session context when enough detail is already available',
      }),
      expect.objectContaining({
        file: skillPath,
        message:
          'Quick-start must describe backfilling discovery.md after startup Q&A before planning',
      }),
      expect.objectContaining({
        file: skillPath,
        message:
          'Quick-start must limit follow-up questions to the minimum needed to remove blockers',
      }),
    ]);
  });

  it('accepts equivalent quick-start wording for discovery synthesis guidance', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-validate-'));
    tempDirs.push(root);
    await createSkillFile(
      root,
      'oat-project-quick-start',
      [
        '---',
        'name: oat-project-quick-start',
        'version: 1.0.0',
        'description: Use when validating quick-start specific guardrails.',
        'disable-model-invocation: true',
        'user-invocable: true',
        'allowed-tools: Read, Write',
        '---',
        '',
        '# Quick Start',
        '',
        '## Progress Indicators (User-Facing)',
        '',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        ' OAT ▸ QUICK START',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        '',
        'Populate `discovery.md` from the current session context when enough detail already exists.',
        'Only ask the minimum follow-up questions required to unblock planning.',
        'If startup Q&A is needed, record that discussion and the resulting decisions back into discovery.md before finalizing plan.md.',
      ].join('\n'),
    );

    const result = await validateOatSkills(root);
    expect(result.findings).toEqual([]);
  });

  it('requires changed canonical skills to bump version relative to base ref', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-validate-'));
    tempDirs.push(root);

    const skillPath = await createSkillFile(
      root,
      'oat-version-check',
      currentSkillContent(
        'oat-version-check',
        '1.2.3',
        'Updated skill instructions without a version bump.',
      ),
    );

    const result = await validateOatSkills(
      root,
      { baseRef: 'origin/main' },
      {
        gitExecFile: async (_file, args) => {
          if (args[0] === 'diff') {
            return {
              stdout: '.agents/skills/oat-version-check/SKILL.md\n',
              stderr: '',
            };
          }

          if (
            args[0] === 'show' &&
            args[1] === 'origin/main:.agents/skills/oat-version-check/SKILL.md'
          ) {
            return {
              stdout: currentSkillContent(
                'oat-version-check',
                '1.2.3',
                'Previous skill instructions.',
              ),
              stderr: '',
            };
          }

          throw new Error(`Unexpected command: git ${args.join(' ')}`);
        },
      },
    );

    expect(result.findings).toContainEqual({
      file: skillPath,
      message:
        'Changed canonical skill must bump frontmatter version relative to origin/main (still 1.2.3)',
    });
  });

  it('requires changed canonical skills to increase version relative to base ref', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-validate-'));
    tempDirs.push(root);

    const skillPath = await createSkillFile(
      root,
      'oat-version-regression',
      currentSkillContent(
        'oat-version-regression',
        '1.2.2',
        'Updated skill instructions with a regressed version.',
      ),
    );

    const result = await validateOatSkills(
      root,
      { baseRef: 'origin/main' },
      {
        gitExecFile: async (_file, args) => {
          if (args[0] === 'diff') {
            return {
              stdout: '.agents/skills/oat-version-regression/SKILL.md\n',
              stderr: '',
            };
          }

          if (
            args[0] === 'show' &&
            args[1] ===
              'origin/main:.agents/skills/oat-version-regression/SKILL.md'
          ) {
            return {
              stdout: currentSkillContent(
                'oat-version-regression',
                '1.2.3',
                'Previous skill instructions.',
              ),
              stderr: '',
            };
          }

          throw new Error(`Unexpected command: git ${args.join(' ')}`);
        },
      },
    );

    expect(result.findings).toContainEqual({
      file: skillPath,
      message:
        'Changed canonical skill version must increase relative to origin/main (base 1.2.3, current 1.2.2)',
    });
  });

  it('allows changed canonical skills when the version increases', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-validate-'));
    tempDirs.push(root);

    await createSkillFile(
      root,
      'oat-version-bumped',
      currentSkillContent(
        'oat-version-bumped',
        '1.2.4',
        'Updated skill instructions with a version bump.',
      ),
    );

    const result = await validateOatSkills(
      root,
      { baseRef: 'origin/main' },
      {
        gitExecFile: async (_file, args) => {
          if (args[0] === 'diff') {
            return {
              stdout: '.agents/skills/oat-version-bumped/SKILL.md\n',
              stderr: '',
            };
          }

          if (
            args[0] === 'show' &&
            args[1] === 'origin/main:.agents/skills/oat-version-bumped/SKILL.md'
          ) {
            return {
              stdout: currentSkillContent(
                'oat-version-bumped',
                '1.2.3',
                'Previous skill instructions.',
              ),
              stderr: '',
            };
          }

          throw new Error(`Unexpected command: git ${args.join(' ')}`);
        },
      },
    );

    expect(result.findings).toEqual([]);
  });
});
