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

import { validateChangedSkillVersionBumps, validateOatSkills } from './skills';

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

function validGateableSkillContent(skillName: string): string {
  return [
    '---',
    `name: ${skillName}`,
    'description: Use when validating oat skill structure. Provides a valid fixture for validator tests.',
    'disable-model-invocation: true',
    'user-invocable: true',
    'allowed-tools: Read, Write',
    'oat_gateable: true',
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

async function readRepoFile(relativePath: string): Promise<string> {
  return readFile(join(process.cwd(), '..', '..', relativePath), 'utf8');
}

function getFrontmatterForTest(content: string): string {
  return content.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? '';
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

  it('does not warn when a configured gate targets a gateable skill', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-validate-'));
    tempDirs.push(root);
    await createSkillFile(
      root,
      'oat-gateable',
      validGateableSkillContent('oat-gateable'),
    );

    const result = await validateOatSkills(root, {
      gateSkillNames: ['oat-gateable'],
    });

    expect(result.validatedSkillCount).toBe(1);
    expect(result.findings).toEqual([]);
  });

  it('warns when a configured gate targets a skill without oat_gateable true', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-validate-'));
    tempDirs.push(root);
    const skillPath = await createSkillFile(
      root,
      'oat-not-gateable',
      validSkillContent('oat-not-gateable'),
    );

    const result = await validateOatSkills(root, {
      gateSkillNames: ['oat-not-gateable'],
    });

    expect(result.findings).toEqual([
      expect.objectContaining({
        file: skillPath,
        message: 'Configured gate targets skill without oat_gateable: true',
        severity: 'warning',
      }),
    ]);
  });

  it('warns when a configured gate targets an unknown skill', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-validate-'));
    tempDirs.push(root);
    await mkdir(join(root, '.agents', 'skills'), { recursive: true });

    const result = await validateOatSkills(root, {
      gateSkillNames: ['oat-unknown'],
    });

    expect(result.validatedSkillCount).toBe(0);
    expect(result.findings).toEqual([
      expect.objectContaining({
        file: join(root, '.agents', 'skills', 'oat-unknown', 'SKILL.md'),
        message: 'Configured gate targets unknown skill: oat-unknown',
        severity: 'warning',
      }),
    ]);
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

  it('documents gate review provenance in review-provide and keeps model invocation gated', async () => {
    const content = await readRepoFile(
      '.agents/skills/oat-project-review-provide/SKILL.md',
    );

    expect(content).toMatch(/^disable-model-invocation:\s*false$/m);
    expect(content).toMatch(/## Model Invocation Gate/);
    expect(content).toMatch(/explicit review asks/i);
    expect(content).toMatch(
      /confirms? a previously offered project-review step/i,
    );
    expect(content).toMatch(
      /oat_review_invocation:\s*\{\s*manual\|auto\|gate\s*\}/,
    );
    expect(content).toMatch(/`gate`/);
    expect(content).toMatch(/normal stateful review-provide behavior/i);
  });

  it('allows review-provide to run the full stateful review workflow', async () => {
    const content = await readRepoFile(
      '.agents/skills/oat-project-review-provide/SKILL.md',
    );
    const allowedTools = content.match(/^allowed-tools:\s*(.+)$/m)?.[1] ?? '';

    for (const requiredTool of [
      'Read',
      'Glob',
      'Grep',
      'Write',
      'Edit',
      'Bash(git:*)',
      'Bash(oat:*)',
      'Bash(pnpm:*)',
    ]) {
      expect(allowedTools).toContain(requiredTool);
    }
  });

  it('documents gate invocation as autonomous receive disposition', async () => {
    const content = await readRepoFile(
      '.agents/skills/oat-project-review-receive/SKILL.md',
    );

    expect(content).toMatch(/oat_review_invocation/);
    expect(content).toMatch(/gate/);
    // A blocking gate is received autonomously (auto-disposition); a passing
    // gate runs the non-pausing judgment sweep. Neither is "standard/manual".
    expect(content).toMatch(/auto-disposition mode/i);
    expect(content).toMatch(/judgment-sweep mode/i);
  });

  it('requires reviewer artifacts to expose gate-parseable findings counts or sections', async () => {
    const content = await readRepoFile('.agents/agents/oat-reviewer.md');

    expect(content).toMatch(
      /oat_review_invocation:\s*\{\s*manual\|auto\|gate\s*\}/,
    );
    expect(content).toMatch(
      /Findings:\s*\{N\} critical,\s*\{N\} important,\s*\{N\} medium,\s*\{N\} minor/,
    );
    expect(content).toMatch(/standard `## Findings` sections/i);
    expect(content).toMatch(/`oat gate review`/);
  });

  it('requires gate review guidance to copy configured invocation metadata without inference', async () => {
    for (const path of [
      '.agents/agents/oat-reviewer.md',
      '.agents/skills/oat-project-review-provide/SKILL.md',
    ]) {
      const content = await readRepoFile(path);
      for (const field of [
        'oat_gate_run_id',
        'oat_gate_target',
        'oat_gate_runtime',
        'oat_invocation_model',
        'oat_invocation_reasoning_effort',
        'oat_invocation_source',
      ]) {
        expect(content, `${path} gate field ${field}`).toContain(field);
      }
      expect(content, `${path} exact-copy contract`).toMatch(
        /copy.*(?:exact|verbatim)/i,
      );
      expect(content, `${path} no command inference`).toMatch(
        /do not (?:parse|derive)[\s\S]{0,180}(?:command|baseCommand)/i,
      );
      expect(content, `${path} self-report separation`).toMatch(
        /self-report(?:ed)?[\s\S]{0,120}non-authoritative/i,
      );
    }
  });

  it('marks quick-start and import-plan as gateable lifecycle skills', async () => {
    for (const skillName of [
      'oat-project-quick-start',
      'oat-project-import-plan',
    ]) {
      const content = await readRepoFile(
        `.agents/skills/${skillName}/SKILL.md`,
      );
      const frontmatter = getFrontmatterForTest(content);

      expect(frontmatter, `${skillName} frontmatter`).toMatch(
        /^oat_gateable:\s*true$/m,
      );
    }
  });

  it('adds Gate Execution steps to quick-start and import-plan', async () => {
    for (const skillName of [
      'oat-project-quick-start',
      'oat-project-import-plan',
    ]) {
      const content = await readRepoFile(
        `.agents/skills/${skillName}/SKILL.md`,
      );

      expect(content, `${skillName} gate section`).toMatch(
        /^### Gate Execution$/m,
      );
      expect(content, `${skillName} gate command`).toMatch(/oat gate /);
    }
  });

  it('routes lifecycle gate handoff only for receive-eligible corroborated results', async () => {
    for (const skillName of [
      'oat-project-plan',
      'oat-project-implement',
      'oat-project-quick-start',
      'oat-project-import-plan',
    ]) {
      const content = await readRepoFile(
        `.agents/skills/${skillName}/SKILL.md`,
      );
      const gateSection = content.slice(
        content.lastIndexOf('### Gate Execution'),
      );

      expect(gateSection, `${skillName} positive statuses`).toMatch(
        /status.*`ok`.*`blocked`/is,
      );
      expect(gateSection, `${skillName} corroborated handoff`).toMatch(
        /non-null `handoff`.*corroborat/is,
      );
      expect(gateSection, `${skillName} explicit eligibility`).toContain(
        '`receiveEligible: true`',
      );
      expect(gateSection, `${skillName} conjunctive eligibility`).toMatch(
        /all three conditions hold:.*status.*`ok`.*`blocked`.*`receiveEligible: true`.*non-null `handoff`/is,
      );
      expect(gateSection, `${skillName} hard stop`).toContain(
        '`receiveEligible: false`',
      );
      expect(gateSection, `${skillName} targeting failure`).toContain(
        '`targeting_correlation_failed`',
      );
      expect(gateSection, `${skillName} validation failure`).toMatch(
        /`artifact_validation_failed`.*correct.*revalidat/is,
      );
      expect(gateSection, `${skillName} no artifact-path shortcut`).toMatch(
        /artifact path.*never authorizes|never authorize.*artifact path/is,
      );
      expect(
        gateSection,
        `${skillName} no unsafe unconditional handoff`,
      ).not.toContain(
        'regardless of whether the gate ultimately exits zero or nonzero',
      );
      expect(content, `${skillName} durable gate examples`).not.toMatch(
        /dist\/index\.js|node\s+.*\/dist\//,
      );
    }

    const implement = await readRepoFile(
      '.agents/skills/oat-project-implement/SKILL.md',
    );
    const phaseGateSection = implement.slice(
      implement.indexOf('### Optional External Phase Review Gate'),
      implement.indexOf('### Parallel Group Execution'),
    );
    expect(phaseGateSection).toMatch(
      /all three receive-eligibility conditions must hold:.*status.*`ok`.*`blocked`.*`receiveEligible: true`.*`handoff` is non-null/is,
    );
  });

  it('documents the complete gate result union and receive-eligibility contract', async () => {
    const workflowGates = await readRepoFile(
      'apps/oat-docs/docs/cli-utilities/workflow-gates.md',
    );
    const cliReference = await readRepoFile(
      'apps/oat-docs/docs/reference/cli-reference.md',
    );
    const projectReviews = await readRepoFile(
      'apps/oat-docs/docs/workflows/projects/reviews.md',
    );

    for (const [name, content] of [
      ['workflow gates', workflowGates],
      ['CLI reference', cliReference],
    ] as const) {
      for (const status of [
        'ok',
        'blocked',
        'review_failed',
        'artifact_validation_failed',
        'targeting_correlation_failed',
      ]) {
        expect(content, `${name} ${status}`).toContain(status);
      }
      expect(content, `${name} positive eligibility`).toMatch(
        /receiveEligible(?:: true|` is `true)|receive-eligible/is,
      );
      expect(content, `${name} conjunctive eligibility`).toMatch(
        /all three conditions hold:.*status.*`ok`.*`blocked`.*`receiveEligible` is `true`.*`handoff` is\s+non-null/is,
      );
      expect(content, `${name} targeting hard stop`).toMatch(
        /targeting_correlation_failed[\s\S]{0,600}(?:do not|must not).*review-receive/i,
      );
      expect(content, `${name} validation revalidation`).toMatch(
        /artifact_validation_failed[\s\S]{0,800}(?:correct|fix)[\s\S]{0,300}revalidat/i,
      );
    }

    expect(projectReviews, 'phase gate conjunctive eligibility').toMatch(
      /all three eligibility conditions:.*status.*`ok`.*`blocked`.*`receiveEligible` is `true`.*`handoff` is\s+non-null/is,
    );
  });

  it('requires lifecycle review gates to declare the exported project and remain target-neutral', async () => {
    for (const skillName of [
      'oat-project-plan',
      'oat-project-implement',
      'oat-project-quick-start',
      'oat-project-import-plan',
    ]) {
      const content = await readRepoFile(
        `.agents/skills/${skillName}/SKILL.md`,
      );
      const gateSection = content.slice(
        content.lastIndexOf('### Gate Execution'),
      );

      expect(gateSection, `${skillName} exports PROJECT_PATH`).toContain(
        'export PROJECT_PATH',
      );
      expect(gateSection, `${skillName} declares the review project`).toContain(
        '--project "$PROJECT_PATH"',
      );
      expect(
        gateSection,
        `${skillName} validates stored review commands`,
      ).toMatch(
        /configured review command[\s\S]{0,300}must (?:already )?(?:contain|include)[\s\S]{0,120}--project/i,
      );
      expect(
        gateSection,
        `${skillName} executes the stored command unchanged`,
      ).toMatch(/execute[\s\S]{0,160}exactly as configured/i);
      expect(gateSection, `${skillName} forbids reusable target pins`).toMatch(
        /must not (?:contain|include|add)[\s\S]{0,100}--target/i,
      );
    }
  });

  it('documents lifecycle review-project migration without provider target pins', async () => {
    const workflowGates = await readRepoFile(
      'apps/oat-docs/docs/cli-utilities/workflow-gates.md',
    );
    const contributingSkills = await readRepoFile(
      'apps/oat-docs/docs/contributing/skills.md',
    );

    for (const [path, content] of [
      ['workflow-gates.md', workflowGates],
      ['contributing/skills.md', contributingSkills],
    ] as const) {
      expect(content, `${path} project declaration`).toContain(
        '--project "$PROJECT_PATH"',
      );
      expect(content, `${path} exported project path`).toContain(
        'export PROJECT_PATH',
      );
      expect(content, `${path} target neutrality`).toMatch(
        /(?:omit|must not (?:contain|include|add))[\s\S]{0,120}--target/i,
      );
    }

    expect(workflowGates).toMatch(
      /migrat[\s\S]{0,500}current project[\s\S]{0,500}--project "\$PROJECT_PATH"/i,
    );
    const reusableReviewCommands = [
      ...workflowGates.matchAll(/--command '([^']*oat gate review[^']*)'/g),
    ].map((match) => match[1] ?? '');
    expect(reusableReviewCommands.length).toBeGreaterThan(0);
    for (const command of reusableReviewCommands) {
      expect(command).toContain('--project "$PROJECT_PATH"');
      expect(command).not.toContain('--target');
    }
    expect(workflowGates).toContain('projectResolutionSource: declared');
    expect(workflowGates).toContain('active-project');
    expect(workflowGates).toContain('single-candidate');
    expect(workflowGates).toMatch(/targeting_correlation_failed/);
    expect(workflowGates).toMatch(/receiveEligible:\s*false/);
  });

  it('tracks the p02 oat-project-implement contract version', async () => {
    const content = await readRepoFile(
      '.agents/skills/oat-project-implement/SKILL.md',
    );

    expect(content.match(/^version:\s*(.+)$/m)?.[1]?.trim()).toBe('2.0.34');
  });

  it('makes native Codex dispatch and launcher-owned provenance authoritative', async () => {
    const content = await readRepoFile(
      '.agents/skills/oat-project-implement/SKILL.md',
    );

    expect(content).toMatch(
      /resolver-returned Codex variant[\s\S]{0,240}first[\s\S]{0,160}native[\s\S]{0,80}`agent_type`/i,
    );
    expect(content).toMatch(
      /spawn acceptance[\s\S]{0,180}launcher payload[\s\S]{0,180}configured invocation evidence/i,
    );
    expect(content).toMatch(
      /For every coordinator, task-worker, fix, and review launch,[\s\S]{0,100}record `target`,\s*`model_axis`, and `effort_axis` from resolver output and the actual launcher\s+payload after payload construction/i,
    );
    expect(content).toMatch(
      /missing (?:runtime )?telemetry[\s\S]{0,160}(?:missing )?(?:agent )?self-report[\s\S]{0,200}not[\s\S]{0,100}(?:role )?unavailability/i,
    );
    expect(content).toMatch(
      /self-report[\s\S]{0,180}(?:cannot|must not)[\s\S]{0,180}(?:populate|overwrite)[\s\S]{0,260}launcher-owned/i,
    );
    expect(content).toMatch(
      /native role-selection rejection[\s\S]{0,500}explicit[\s\S]{0,220}`agent_type`[\s\S]{0,220}before[\s\S]{0,120}(?:child|agent)[\s\S]{0,80}start/i,
    );
    expect(content).toMatch(
      /fresh\s+(?:pinned\s+)?(?:Codex\s+)?child[\s\S]{0,260}only after[\s\S]{0,240}native role-selection rejection/i,
    );
    expect(content).toMatch(
      /accepted child[\s\S]{0,220}`BLOCKED`[\s\S]{0,260}(?:cannot|must not)[\s\S]{0,180}(?:fallback|fresh child)/i,
    );
    expect(content).toMatch(/launcher-selected\/config-declared/i);
  });

  it('blocks accepted reviewer BLOCKED terminals without invoking fallback', async () => {
    const coordinator = await readRepoFile(
      '.agents/agents/oat-phase-implementer.md',
    );
    const implement = await readRepoFile(
      '.agents/skills/oat-project-implement/SKILL.md',
    );
    const phaseReview = implement.slice(
      implement.indexOf('### Per-Phase Review'),
      implement.indexOf('### Optional External Phase Review Gate'),
    );
    const finalReview = implement.slice(
      implement.indexOf('### Step 14: Trigger Final Review'),
      implement.indexOf('### Step 15: Prompt for Next Steps'),
    );

    expect(coordinator).toMatch(
      /accepted\s+terminal\s+results[\s\S]{0,160}`BLOCKED`[\s\S]{0,180}never\s+trigger fallback/i,
    );
    for (const [name, content] of [
      ['phase reviewer', phaseReview],
      ['final reviewer', finalReview],
    ] as const) {
      expect(content, `${name} BLOCKED gate`).toMatch(
        /accepted reviewer[\s\S]{0,100}`BLOCKED`[\s\S]{0,180}(?:blocks|must block)[\s\S]{0,120}review/i,
      );
      expect(content, `${name} no fallback`).toMatch(
        /`BLOCKED`[\s\S]{0,240}(?:does not|cannot|must not)[\s\S]{0,100}(?:invoke|trigger)[\s\S]{0,80}fallback/i,
      );
      expect(content, `${name} no absent-findings pass`).toMatch(
        /(?:absent|no) findings[\s\S]{0,200}(?:cannot|must not)[\s\S]{0,160}(?:parse|interpret|treat)[\s\S]{0,100}pass|(?:cannot|must not)[\s\S]{0,160}(?:parse|interpret|treat)[\s\S]{0,100}pass[\s\S]{0,200}(?:absent|no) findings/i,
      );
    }
  });

  it('defines one fail-closed managed dispatch contract for every plan writer', async () => {
    const shared = await readRepoFile(
      '.agents/skills/oat-project-plan-writing/SKILL.md',
    );

    expect(shared).toMatch(/Managed Dispatch Readiness and Review Contract/);
    expect(shared).toMatch(/active-provider[\s\S]*unresolved/i);
    expect(shared).toMatch(/re-run the resolver/i);
    expect(shared).toMatch(
      /complete\s+(?:recommended\s+defaults|bundled\s+recommendation)/i,
    );
    expect(shared).toMatch(/exact registered.*variant/i);
    expect(shared).toMatch(/fresh Codex child/i);
    expect(shared).toMatch(
      /explicit\s+model.*reasoning\s+effort.*canonical\s+role\s+instructions/is,
    );
    expect(shared).toMatch(/must not require.*restart.*hot reload/i);
    expect(shared).toMatch(/never.*managed base role/i);

    for (const skillName of [
      'oat-project-plan',
      'oat-project-quick-start',
      'oat-project-import-plan',
    ]) {
      const content = await readRepoFile(
        `.agents/skills/${skillName}/SKILL.md`,
      );
      expect(content, `${skillName} shared contract`).toMatch(
        /Managed\s+Dispatch\s+Readiness\s+and\s+Review\s+Contract/,
      );
      expect(content, `${skillName} reviewer resolver`).toMatch(
        /--role reviewer.*--preflight.*--json/,
      );
      expect(content, `${skillName} rerun`).toMatch(/re-run the resolver/i);
    }
  });

  it('requires complete dispatch-ladder adoption in an explicit ownership scope', async () => {
    const shared = await readRepoFile(
      '.agents/skills/oat-project-plan-writing/SKILL.md',
    );

    expect(shared).toMatch(/Complete Dispatch Ladder Adoption Contract/);
    expect(shared).toContain('dispatch-matrix-recommendation.json');
    expect(shared).toMatch(
      /Codex[\s\S]{0,500}Luna\/low[\s\S]{0,120}Luna\/medium[\s\S]{0,120}Luna\/high[\s\S]{0,500}Terra\/xhigh[\s\S]{0,500}Sol\/max/i,
    );
    expect(shared).toMatch(
      /Claude[\s\S]{0,300}haiku[\s\S]{0,120}sonnet[\s\S]{0,120}opus[\s\S]{0,120}fable/i,
    );
    for (const cursorTarget of [
      'gpt-5.6-luna-low',
      'gpt-5.6-terra-medium',
      'gpt-5.6-sol-high',
      'gpt-5.6-sol-max',
    ]) {
      expect(
        shared,
        `complete Cursor recommendation ${cursorTarget}`,
      ).toContain(cursorTarget);
    }
    for (const scopeFlag of ['--shared', '--local', '--user']) {
      expect(shared, `explicit ownership scope ${scopeFlag}`).toContain(
        `oat config adopt dispatch-matrix ${scopeFlag}`,
      );
    }
    expect(shared).toMatch(
      /ask[\s\S]{0,240}(?:owning|ownership) scope[\s\S]{0,320}before[\s\S]{0,120}(?:write|adopt)/i,
    );
    expect(shared).toMatch(
      /adoption preserves explicit[\s\S]{0,260}re-run[\s\S]{0,260}(?:incomplete|missing)[\s\S]{0,180}(?:block|not implementation-ready)/i,
    );
    expect(shared).toMatch(
      /non-interactive[\s\S]{0,300}(?:incomplete|missing) ladder[\s\S]{0,220}(?:block|not implementation-ready)/i,
    );
    expect(shared).toMatch(
      /project-specific[\s\S]{0,120}(?:active )?(?:policy|ceiling)[\s\S]{0,220}(?:must not|do not|never)[\s\S]{0,120}(?:user|~\/\.oat)/i,
    );
  });

  it('adopts ladders and records named maximum ceilings in every planning path', async () => {
    const paths = [
      [
        'spec-driven',
        await readRepoFile('.agents/skills/oat-project-plan/SKILL.md'),
      ],
      [
        'quick-start',
        await readRepoFile('.agents/skills/oat-project-quick-start/SKILL.md'),
      ],
      [
        'import-plan',
        await readRepoFile('.agents/skills/oat-project-import-plan/SKILL.md'),
      ],
    ] as const;

    for (const [name, content] of paths) {
      expect(content, `${name} shared adoption contract`).toMatch(
        /Complete Dispatch Ladder Adoption Contract/,
      );
      expect(content, `${name} explicit scope adoption`).toMatch(
        /oat config adopt dispatch-matrix[\s\S]{0,160}(?:--shared|--local|--user)/,
      );
      expect(content, `${name} named maximum`).toMatch(
        /named (?:tier|ceiling)[\s\S]{0,220}(?:maximum|max)[\s\S]{0,220}(?:lower|beneath|at or below)/i,
      );
      expect(content, `${name} project-state persistence`).toMatch(
        /oat_dispatch_policy:[\s\S]{0,140}mode:\s*managed[\s\S]{0,140}policy:\s*(?:economy|balanced|high|frontier)/i,
      );
      expect(
        content,
        `${name} no exact provider pin in project policy`,
      ).not.toMatch(/oat_dispatch_policy:[\s\S]{0,220}providers:/i);
      expect(content, `${name} no user policy leakage`).toMatch(
        /(?:project-specific|active project)[\s\S]{0,160}(?:policy|ceiling)[\s\S]{0,220}(?:must not|do not|never)[\s\S]{0,120}(?:user|~\/\.oat)/i,
      );
      expect(content, `${name} incomplete ladder blocks readiness`).toMatch(
        /(?:incomplete|missing) ladder[\s\S]{0,260}(?:block|not .*ready|do not .*ready)/i,
      );
    }

    expect(paths[2][1]).toMatch(
      /provider-plan-via-import[\s\S]{0,600}(?:same|inherits)[\s\S]{0,220}(?:adoption|ceiling)/i,
    );
  });

  it('treats project and phase tiers as candidate maxima rather than exact family preferences', async () => {
    const shared = await readRepoFile(
      '.agents/skills/oat-project-plan-writing/SKILL.md',
    );
    const dispatchProfile = shared.slice(
      shared.indexOf('### Dispatch Profile Overrides'),
      shared.indexOf('### Stable Task IDs'),
    );

    expect(dispatchProfile).toContain('| Phase | Named ceiling');
    expect(dispatchProfile).toContain(
      'economy\\|balanced\\|high\\|frontier\\|auto',
    );
    expect(dispatchProfile).toMatch(
      /maximum[\s\S]{0,220}(?:not|never)[\s\S]{0,180}(?:exact model|model-family|effort)/i,
    );
    expect(dispatchProfile).toMatch(
      /High[\s\S]{0,240}(?:Economy|economy)[\s\S]{0,120}(?:Balanced|balanced)[\s\S]{0,120}(?:High|high)[\s\S]{0,160}(?:available|eligible)/,
    );
    expect(dispatchProfile).not.toContain('Claude model');
    expect(dispatchProfile).not.toContain('Codex effort');
  });

  it('keeps reviewers at their configured ceiling and lifecycle gates target-neutral', async () => {
    const planWriting = await readRepoFile(
      '.agents/skills/oat-project-plan-writing/SKILL.md',
    );
    const reviewProvide = await readRepoFile(
      '.agents/skills/oat-project-review-provide/SKILL.md',
    );
    const artifactReview = planWriting.slice(
      planWriting.indexOf('## Managed Dispatch Readiness and Review Contract'),
      planWriting.indexOf('## Shared Phase-Review Setup Contract'),
    );
    const projectReview = reviewProvide.slice(
      reviewProvide.indexOf(
        '**Step 6.0: Resolve the managed reviewer target**',
      ),
      reviewProvide.indexOf('**Step 6a: Probe Subagent Availability**'),
    );

    for (const [name, content] of [
      ['artifact review', artifactReview],
      ['project review', projectReview],
    ] as const) {
      expect(content, `${name} reviewer ceiling`).toMatch(
        /reviewer[\s\S]{0,260}(?:final candidate|configured review ceiling|ceiling candidate)/i,
      );
      expect(content, `${name} reviewed lowering exception`).toMatch(
        /lower candidate[\s\S]{0,260}(?:separate|separately)[\s\S]{0,180}reviewed contract/i,
      );
      expect(content, `${name} no ephemeral candidate flags`).not.toMatch(
        /--candidate-(?:model|effort)/,
      );
      expect(content, `${name} Claude payload`).toContain(
        'providers.claude.dispatchArgs.model',
      );
      expect(content, `${name} Cursor payload`).toContain(
        'providers.cursor.dispatchArgs.model',
      );
      expect(content, `${name} exact payload retry`).toMatch(
        /(?:timeout|retry|re-dispatch)[\s\S]{0,420}(?:same|exact)[\s\S]{0,260}(?:payload|model argument)/i,
      );
    }

    for (const skillName of [
      'oat-project-plan',
      'oat-project-quick-start',
      'oat-project-import-plan',
    ]) {
      const content = await readRepoFile(
        `.agents/skills/${skillName}/SKILL.md`,
      );
      const gateSection = content.slice(
        content.lastIndexOf('### Gate Execution'),
      );
      expect(gateSection, `${skillName} lifecycle target neutrality`).toMatch(
        /must not (?:contain|include|add)[\s\S]{0,100}--target/i,
      );
    }
  });

  it('coordinates one exact serial task worker per plan task', async () => {
    const agent = await readRepoFile('.agents/agents/oat-phase-implementer.md');
    const implement = await readRepoFile(
      '.agents/skills/oat-project-implement/SKILL.md',
    );

    expect(agent.match(/^version:\s*(.+)$/m)?.[1]?.trim()).toBe('1.0.5');
    expect(agent.match(/^description:\s*(.+)$/m)?.[1]).toMatch(
      /phase coordinator/i,
    );
    expect(agent.match(/^tools:\s*(.+)$/m)?.[1]).toContain('Task');
    expect(implement.match(/^version:\s*(.+)$/m)?.[1]?.trim()).toBe('2.0.34');

    const coordinator = agent.slice(
      agent.indexOf('### Mode: Phase Coordinator'),
      agent.indexOf('### Mode: Task Worker'),
    );
    const worker = agent.slice(agent.indexOf('### Mode: Task Worker'));

    expect(coordinator).toMatch(
      /must not implement ordinary plan tasks (?:itself|in its own context)/i,
    );
    expect(coordinator).toMatch(/one exact task worker at a time/i);
    expect(coordinator).toMatch(
      /serial(?:ly)?[\s\S]{0,180}(?:same|one) worktree/i,
    );
    expect(coordinator).toMatch(
      /parallel[\s\S]{0,240}plan-declared[\s\S]{0,180}(?:phase|worktree)/i,
    );
    expect(coordinator).toContain('--ceiling-tier');
    expect(coordinator).toContain('--candidate-model');
    expect(coordinator).toContain('providers.codex.dispatchArgs.variant');
    expect(coordinator).toContain('providers.claude.dispatchArgs.model');
    expect(coordinator).toContain('providers.cursor.dispatchArgs.model');
    expect(coordinator).toMatch(
      /Codex[\s\S]{0,180}(?:attempt|dispatch)[\s\S]{0,180}exact materialized `agent_type` first/i,
    );
    expect(coordinator).toMatch(
      /only explicit\s+pre-start native role-selection rejection[\s\S]{0,260}(?:permits|allows)[\s\S]{0,160}fresh pinned fallback/i,
    );
    expect(coordinator).toMatch(
      /launcher-owned `target`, `model_axis`, and `effort_axis`[\s\S]{0,260}(?:immutable|must not)[\s\S]{0,180}(?:worker )?self-report/i,
    );
    expect(coordinator).toMatch(
      /missing telemetry[\s\S]{0,180}accepted\s+terminal\s+results[\s\S]{0,120}`BLOCKED`[\s\S]{0,180}never\s+trigger fallback/i,
    );
    expect(coordinator).toMatch(
      /Cursor[\s\S]{0,260}(?:byte-for-byte|opaque)[\s\S]{0,220}(?:actual|invocation)/i,
    );
    expect(coordinator).toMatch(
      /(?:missing|absent)[\s\S]{0,180}(?:above|exceeds)[\s\S]{0,220}(?:cannot|unable)[\s\S]{0,220}(?:fail closed|BLOCKED)/i,
    );
    expect(coordinator).toMatch(
      /(?:do not|never)[\s\S]{0,180}(?:coordinator target|base role|provider default)[\s\S]{0,240}(?:downgrade|fallback|substitute)/i,
    );
    expect(coordinator).toMatch(
      /verify[\s\S]{0,160}(?:reported )?commit[\s\S]{0,180}(?:HEAD|git)/i,
    );
    expect(coordinator).toMatch(
      /Task Dispatch Summary[\s\S]{0,260}Exact target[\s\S]{0,120}Result[\s\S]{0,120}Commit/i,
    );

    for (const field of [
      'task_id',
      'file_boundary',
      'verification',
      'commit_convention',
    ]) {
      expect(worker, `bounded Task Scope field ${field}`).toContain(field);
    }
    expect(worker).toMatch(/exactly one task/i);
    expect(worker).toMatch(
      /must not dispatch another\s+(?:coordinator|worker)/i,
    );

    const perPhase = implement.slice(
      implement.indexOf('### Step 5: Per-Phase Execution'),
      implement.indexOf('### Per-Phase Review'),
    );
    expect(perPhase).toContain('--ceiling-tier');
    expect(perPhase).toMatch(/project or phase named ceiling/i);
    expect(perPhase).toMatch(/one exact task worker/i);
    expect(perPhase).toMatch(/Task Scope[\s\S]{0,500}task_id:/i);
    expect(perPhase).toMatch(
      /same worktree[\s\S]{0,220}serial|serial[\s\S]{0,220}same worktree/i,
    );
    expect(perPhase).toMatch(
      /(?:missing|absent|exceeds|above)[\s\S]{0,320}(?:fail closed|block)/i,
    );
  });

  it('documents adaptive named ceilings and exact task-worker dispatch', async () => {
    const configuration = await readRepoFile(
      'apps/oat-docs/docs/cli-utilities/configuration.md',
    );
    const dispatch = await readRepoFile(
      'apps/oat-docs/docs/workflows/projects/dispatch-ceiling.md',
    );
    const providers = await readRepoFile(
      'apps/oat-docs/docs/provider-sync/providers.md',
    );
    const execution = await readRepoFile(
      'apps/oat-docs/docs/workflows/projects/implementation-execution.md',
    );

    for (const [name, content] of [
      ['configuration', configuration],
      ['dispatch policy', dispatch],
      ['provider sync', providers],
      ['implementation execution', execution],
    ] as const) {
      expect(content, `${name} named maximum`).toMatch(
        /named (?:tier|ceiling|maximum)[\s\S]{0,220}maximum/i,
      );
      expect(content, `${name} ordered candidates`).toMatch(
        /ordered (?:provider )?candidate|candidate ladder/i,
      );
    }

    for (const scope of ['--shared', '--local', '--user']) {
      expect(configuration, `configuration adoption ${scope}`).toContain(
        `oat config adopt dispatch-matrix ${scope}`,
      );
    }
    expect(configuration).toMatch(
      /project-specific[\s\S]{0,160}(?:policy|ceiling)[\s\S]{0,220}(?:must not|do not|never)[\s\S]{0,120}(?:user|~\/\.oat)/i,
    );
    expect(configuration).toContain('--ceiling-tier');
    expect(configuration).toContain('source: invocation');
    expect(configuration).toContain('cellSource');

    expect(dispatch).toMatch(
      /High[\s\S]{0,260}Economy[\s\S]{0,140}Balanced[\s\S]{0,140}High[\s\S]{0,180}(?:eligible|available)/,
    );
    expect(dispatch).toContain('candidates');
    expect(dispatch).toContain('--ceiling-tier');
    expect(dispatch).toContain('--candidate-model');
    expect(dispatch).toContain('--candidate-effort');
    expect(dispatch).not.toMatch(
      /oat_dispatch_policy:[\s\S]{0,220}providers:/i,
    );

    expect(providers).toMatch(
      /project-config[\s\S]{0,260}(?:tracked|version-controlled)[\s\S]{0,260}user-config[\s\S]{0,180}~\/\.codex/i,
    );
    expect(providers).toMatch(/phase coordinator[\s\S]{0,220}task worker/i);
    expect(providers).toContain('providers.claude.dispatchArgs.model');
    expect(providers).toContain('providers.cursor.dispatchArgs.model');
    expect(providers).toMatch(/Cursor[\s\S]{0,220}(?:opaque|byte-for-byte)/i);

    expect(execution).toMatch(/phase coordinator/i);
    expect(execution).toMatch(/one exact task worker (?:per task|at a time)/i);
    expect(execution).toMatch(/Task Scope[\s\S]{0,600}task_id:/i);
    expect(execution).toMatch(
      /serial(?:ly)?[\s\S]{0,220}(?:same|one) worktree/i,
    );
    expect(execution).toMatch(
      /(?:must not|does not|never)[\s\S]{0,160}implement ordinary (?:plan )?tasks/i,
    );
    expect(execution).toContain('--ceiling-tier');
    expect(execution).toContain('providers.codex.dispatchArgs.variant');
    expect(execution).toContain('providers.claude.dispatchArgs.model');
    expect(execution).toContain('providers.cursor.dispatchArgs.model');

    for (const [name, content] of [
      ['dispatch policy', dispatch],
      ['implementation execution', execution],
    ] as const) {
      expect(content, `${name} no exact-family policy mapping`).not.toContain(
        'min(preferred, cap)',
      );
      expect(content, `${name} no whole-phase executor`).not.toMatch(
        /phase implementer executes all tasks in the phase/i,
      );
    }
  });

  it('defines the canonical shared phase-review setup after stable phase IDs', async () => {
    const shared = await readRepoFile(
      '.agents/skills/oat-project-plan-writing/SKILL.md',
    );

    expect(shared).toMatch(/Shared Phase-Review Setup Contract/);
    expect(shared).toMatch(
      /after[\s\S]{0,160}stable phase IDs[\s\S]{0,240}before[\s\S]{0,160}plan artifact review/i,
    );
    expect(shared).toMatch(/explicit[\s\S]{0,80}`oat_phase_review_gate`/i);
    expect(shared).toMatch(
      /preserve the complete value[\s\S]{0,100}unchanged/i,
    );
    expect(shared).toMatch(
      /do not probe targets, prompt, or mutate the setting/i,
    );
    expect(shared).toContain('oat gate target list --json');
    expect(shared).toMatch(
      /explicitlyConfigured[\s\S]{0,160}enabled[\s\S]{0,160}available/,
    );
    expect(shared).toMatch(
      /explicitlyConfigured\s*===?\s*true[\s\S]{0,200}enabled\s*===?\s*true[\s\S]{0,200}available\s*===?\s*true/,
    );
  });

  it('defines canonical phase-review choices and stable phase serialization', async () => {
    const shared = await readRepoFile(
      '.agents/skills/oat-project-plan-writing/SKILL.md',
    );

    expect(shared).toMatch(/all phases/i);
    expect(shared).toMatch(/selected phases/i);
    expect(shared).toMatch(/disabled/i);
    expect(shared).toMatch(
      /oat_phase_review_gate:[\s\S]{0,180}enabled:\s*true[\s\S]{0,180}phases:\s*\[\][\s\S]{0,180}review_type:\s*code[\s\S]{0,180}exit_nonzero_on:\s*important/,
    );
    expect(shared).toMatch(
      /selected phase IDs[\s\S]{0,220}(?:actual|known|stable) phase IDs[\s\S]{0,220}plan order/i,
    );
    expect(shared).toMatch(/independent[\s\S]{0,180}HiLL checkpoints/i);
    expect(shared).toMatch(
      /never[\s\S]{0,160}(?:provider|model)[\s\S]{0,160}--target|must not[\s\S]{0,160}--target/i,
    );
  });

  it('keeps phase review disabled when setup cannot make an interactive choice', async () => {
    const shared = await readRepoFile(
      '.agents/skills/oat-project-plan-writing/SKILL.md',
    );

    expect(shared).toMatch(
      /probe fail[\s\S]{0,260}phase review remains disabled/i,
    );
    expect(shared).toMatch(
      /no qualifying target[\s\S]{0,260}phase review remains disabled/i,
    );
    expect(shared).toMatch(
      /non-interactive[\s\S]{0,320}phase review remains disabled/i,
    );
    expect(shared).toMatch(
      /(?:declines|chooses disabled)[\s\S]{0,260}phase review remains disabled/i,
    );
    expect(shared).toMatch(/Warning: phase review target probe failed/);
    expect(shared).toMatch(/Phase review: disabled/);
    expect(shared).toMatch(/do not invent enablement/i);
  });

  it('routes every workflow review through exact roles or pinned fresh children', async () => {
    for (const skillName of [
      'oat-project-implement',
      'oat-project-review-provide',
    ]) {
      const content = await readRepoFile(
        `.agents/skills/${skillName}/SKILL.md`,
      );
      expect(content, `${skillName} exact role`).toMatch(
        /exact registered.*(?:role|variant)/i,
      );
      expect(content, `${skillName} fresh child`).toMatch(/fresh Codex child/i);
      expect(content, `${skillName} explicit controls`).toMatch(
        /explicit\s+model.*reasoning\s+effort.*canonical\s+role\s+instructions/is,
      );
      expect(content, `${skillName} no managed base fallback`).toMatch(
        /never.*managed base role|managed base role.*forbidden/i,
      );
      expect(content, `${skillName} no reload dependency`).toMatch(
        /must not require[\s\S]*restart.*hot reload/i,
      );
    }
  });

  it('rejects unpinned managed Codex availability and timeout fallbacks', async () => {
    const planWriting = await readRepoFile(
      '.agents/skills/oat-project-plan-writing/SKILL.md',
    );
    const implement = await readRepoFile(
      '.agents/skills/oat-project-implement/SKILL.md',
    );
    const reviewProvide = await readRepoFile(
      '.agents/skills/oat-project-review-provide/SKILL.md',
    );

    for (const [skillName, content] of [
      ['oat-project-plan-writing', planWriting],
      ['oat-project-implement', implement],
      ['oat-project-review-provide', reviewProvide],
    ] as const) {
      expect(content, `${skillName} target-first precedence`).toMatch(
        /concrete managed Codex target[\s\S]{0,500}(?:before|takes precedence over)[\s\S]{0,200}(?:tier|availability)/i,
      );
      expect(content, `${skillName} unavailable-role route`).toMatch(
        /(?:unavailable|cannot select|native role-selection rejection)[\s\S]{0,500}fresh Codex child[\s\S]{0,500}(?:block|fail closed)/i,
      );
      expect(content, `${skillName} inline control guard`).toMatch(
        /inline[\s\S]{0,300}verified equivalent current-host[\s\S]{0,300}(?:model|controls)/i,
      );
    }

    expect(planWriting).not.toMatch(
      /Tier 1 is unavailable or declined,\s*run the same reviewer prompt inline/i,
    );
    expect(planWriting).not.toMatch(/lowest available tier\/model\/effort/i);

    expect(implement).not.toMatch(
      /If Tier 2 is selected,[\s\S]{0,240}Execute that process yourself/i,
    );
    expect(implement).not.toMatch(
      /reviewer still does not conclude,[\s\S]{0,180}perform the review inline/i,
    );
    expect(implement).not.toMatch(
      /degrade the (?:entire|whole) group to sequential inline execution/i,
    );

    expect(reviewProvide).not.toMatch(
      /If subagent dispatch is unavailable,\s*run the review inline/i,
    );
    expect(reviewProvide).not.toMatch(/If explicit role pinning is desired/i);
    expect(reviewProvide).not.toMatch(/optionally pin `agent_type`/i);
    expect(reviewProvide).not.toMatch(
      /REVIEW_INVOCATION=gate[\s\S]{0,220}use \*\*Tier 3\*\* inline/i,
    );
    expect(reviewProvide).not.toMatch(
      /REVIEW_INVOCATION=gate[\s\S]{0,220}run Tier 3 inline instead/i,
    );
  });

  it('keeps every artifact-review caller on its resolved target', async () => {
    const callers = [
      [
        'spec-driven plan',
        await readRepoFile('.agents/skills/oat-project-plan/SKILL.md'),
      ],
      [
        'quick-start plan',
        await readRepoFile('.agents/skills/oat-project-quick-start/SKILL.md'),
      ],
      [
        'import-plan',
        await readRepoFile('.agents/skills/oat-project-import-plan/SKILL.md'),
      ],
      [
        'implementation execution docs',
        await readRepoFile(
          'apps/oat-docs/docs/workflows/projects/implementation-execution.md',
        ),
      ],
    ] as const;

    for (const [name, content] of callers) {
      expect(content, `${name} exact or pinned route`).toMatch(
        /exact (?:resolver-returned |registered )*(?:reviewer )?(?:role|variant)[\s\S]{0,500}(?:fresh|new) Codex child[\s\S]{0,300}pinned/i,
      );
      expect(content, `${name} guarded inline route`).toMatch(
        /inline[\s\S]{0,320}verified equivalent current-host[\s\S]{0,240}(?:model|effort|controls)/i,
      );
      expect(content, `${name} explicit base exceptions`).toMatch(
        /explicit inherit[\s\S]{0,240}managed-uncapped/i,
      );
      expect(content, `${name} target-preserving timeout retry`).toMatch(
        /(?:timeout|does not conclude)[\s\S]{0,500}retry[\s\S]{0,320}(?:same exact|pinned)[\s\S]{0,320}(?:fail closed|block)/i,
      );
      expect(content, `${name} no unconditional tier fallback`).not.toMatch(
        /Tier 2 inline fallback otherwise/i,
      );
      expect(content, `${name} no timeout inline downgrade`).not.toMatch(
        /(?:timeout|does not conclude)[\s\S]{0,240}fall(?:ing)? back inline/i,
      );
    }
  });

  it('binds concrete managed reviewer models across provider invocations', async () => {
    const planWriting = await readRepoFile(
      '.agents/skills/oat-project-plan-writing/SKILL.md',
    );
    const reviewProvide = await readRepoFile(
      '.agents/skills/oat-project-review-provide/SKILL.md',
    );
    const implement = await readRepoFile(
      '.agents/skills/oat-project-implement/SKILL.md',
    );
    const artifactReview = planWriting.slice(
      planWriting.indexOf('## Managed Dispatch Readiness and Review Contract'),
      planWriting.indexOf('## Shared Phase-Review Setup Contract'),
    );
    const projectReview = reviewProvide.slice(
      reviewProvide.indexOf(
        '**Step 6.0: Resolve the managed reviewer target**',
      ),
      reviewProvide.indexOf('### Step 7: Determine Review Artifact Path'),
    );
    const phaseReview = implement.slice(
      implement.indexOf('### Per-Phase Review'),
      implement.indexOf('**Verdict outcomes:**'),
    );
    const finalReview = implement.slice(
      implement.indexOf('**Workflow preference check (before prompting):**'),
      implement.indexOf('**Fresh-session guidance block'),
    );

    for (const [name, content] of [
      ['artifact review', artifactReview],
      ['project review', projectReview],
      ['phase review', phaseReview],
      ['final review', finalReview],
    ] as const) {
      expect(content, `${name} Claude payload`).toContain(
        'providers.claude.dispatchArgs.model',
      );
      expect(content, `${name} Cursor payload`).toContain(
        'providers.cursor.dispatchArgs.model',
      );
      expect(content, `${name} actual model argument`).toMatch(
        /actual\s+(?:(?:provider|host)\s+)?invocation[\s\S]{0,280}(?:model|dispatchArgs\.model)/i,
      );
      expect(content, `${name} target-preserving retry`).toMatch(
        /(?:timeout|retry|re-dispatch)[\s\S]{0,500}(?:same|exact)[\s\S]{0,300}(?:model|payload|dispatch argument)/i,
      );
      expect(content, `${name} unsupported model binding`).toMatch(
        /(?:cannot|unable to) (?:apply|pass|bind)[\s\S]{0,280}(?:fail closed|block)/i,
      );
    }

    const configuration = await readRepoFile(
      'apps/oat-docs/docs/cli-utilities/configuration.md',
    );
    for (const model of [
      'gpt-5.6-luna-high',
      'gpt-5.6-terra-xhigh',
      'gpt-5.6-sol-high',
      'gpt-5.6-sol-max',
    ]) {
      expect(planWriting, `artifact contract preserves ${model}`).toContain(
        model,
      );
      expect(configuration, `configuration preserves ${model}`).toContain(
        model,
      );
    }

    const lifecycle = await readRepoFile(
      'apps/oat-docs/docs/workflows/projects/lifecycle.md',
    );
    const artifacts = await readRepoFile(
      'apps/oat-docs/docs/workflows/projects/artifacts.md',
    );
    for (const [name, content] of [
      ['lifecycle', lifecycle],
      ['artifacts', artifacts],
      ['configuration', configuration],
    ] as const) {
      expect(content, `${name} target-preserving Tier 2`).toMatch(
        /Tier 2[\s\S]{0,600}target-preserving/i,
      );
      expect(content, `${name} guarded inline`).toMatch(
        /inline[\s\S]{0,360}verified equivalent[\s\S]{0,260}(?:inherit|managed-uncapped|base-role)/i,
      );
    }
  });

  it('covers spec, quick, import, and provider-plan-via-import planning paths', async () => {
    const plan = await readRepoFile('.agents/skills/oat-project-plan/SKILL.md');
    const quick = await readRepoFile(
      '.agents/skills/oat-project-quick-start/SKILL.md',
    );
    const imported = await readRepoFile(
      '.agents/skills/oat-project-import-plan/SKILL.md',
    );

    expect(plan).toMatch(/spec-driven/i);
    expect(quick).toMatch(/quick/i);
    expect(imported).toMatch(/provider-plan-via-import/i);
    expect(imported).toMatch(/provider plan[\s\S]*inherits.*import/i);
  });

  it('invokes shared phase-review setup before artifact review in every plan path', async () => {
    const paths = [
      {
        name: 'spec-driven',
        content: await readRepoFile('.agents/skills/oat-project-plan/SKILL.md'),
        stableMarker: '### Step 10.1: Keep Reviews Table Rows',
        reviewMarker: '### Step 12.5: Run Plan Artifact Review Loop',
      },
      {
        name: 'quick-start',
        content: await readRepoFile(
          '.agents/skills/oat-project-quick-start/SKILL.md',
        ),
        stableMarker: '### Step 3: Generate Plan Directly',
        reviewMarker: '### Step 3.6: Run Plan Artifact Review Loop',
      },
      {
        name: 'import-plan',
        content: await readRepoFile(
          '.agents/skills/oat-project-import-plan/SKILL.md',
        ),
        stableMarker: '### Step 3: Normalize Into Canonical OAT plan.md',
        reviewMarker:
          '### Step 4.5: Run Import-Aware Plan Artifact Review Loop',
      },
    ];

    for (const { name, content, stableMarker, reviewMarker } of paths) {
      const stableIndex = content.indexOf(stableMarker);
      const setupOffset = content
        .slice(stableIndex)
        .search(/Shared Phase-Review\s+Setup\s+Contract/);
      const setupIndex =
        setupOffset < 0 || stableIndex < 0 ? -1 : stableIndex + setupOffset;
      const reviewIndex = content.indexOf(reviewMarker);

      expect(stableIndex, `${name} stable phase IDs`).toBeGreaterThanOrEqual(0);
      expect(setupIndex, `${name} setup invocation`).toBeGreaterThan(
        stableIndex,
      );
      expect(reviewIndex, `${name} artifact review`).toBeGreaterThan(
        setupIndex,
      );
      expect(content, `${name} explicit preservation`).toMatch(
        /explicit `oat_phase_review_gate`[\s\S]{0,260}(?:without|do not)[\s\S]{0,160}(?:probe|prompt|mutat)/i,
      );
      expect(content, `${name} disabled fallback`).toMatch(
        /(?:probe fails|no target qualifies|user declines)[\s\S]{0,320}(?:disabled|do not add)/i,
      );
      expect(content, `${name} HiLL independence`).toMatch(
        /phase-review setup[\s\S]{0,320}independent[\s\S]{0,160}HiLL/i,
      );
      expect(content, `${name} target neutrality`).toMatch(
        /phase-review setup[\s\S]{0,480}(?:must not|do not)[\s\S]{0,100}--target/i,
      );
    }
  });

  it('preserves complete explicit phase-review settings across every plan rewrite', async () => {
    const paths = [
      {
        name: 'spec-driven overwrite',
        content: await readRepoFile('.agents/skills/oat-project-plan/SKILL.md'),
        snapshotMarker:
          '### Step 4.9: Snapshot Explicit Phase-Review Setting Before Plan Overwrite',
        rewriteMarker:
          '**Overwrite**: replace with a fresh copy of the template',
        setupMarker: '### Step 12.25: Configure Optional Phase Review',
      },
      {
        name: 'quick-start',
        content: await readRepoFile(
          '.agents/skills/oat-project-quick-start/SKILL.md',
        ),
        snapshotMarker:
          '### Step 2.9: Snapshot Explicit Phase-Review Setting Before Plan Rewrite',
        rewriteMarker:
          'Create/update `"$PROJECT_PATH/plan.md"` from `.oat/templates/plan.md`.',
        setupMarker: '### Step 3.55: Configure Optional Phase Review',
      },
      {
        name: 'import-plan',
        content: await readRepoFile(
          '.agents/skills/oat-project-import-plan/SKILL.md',
        ),
        snapshotMarker:
          '### Step 2.5: Snapshot Explicit Phase-Review Setting Before Plan Normalization',
        rewriteMarker:
          'Create/update `"$PROJECT_PATH/plan.md"` using `.oat/templates/plan.md`',
        setupMarker: '### Step 4.25: Configure Optional Phase Review',
      },
    ];

    for (const {
      name,
      content,
      snapshotMarker,
      rewriteMarker,
      setupMarker,
    } of paths) {
      const snapshotIndex = content.indexOf(snapshotMarker);
      const rewriteIndex = content.indexOf(rewriteMarker);
      const setupIndex = content.indexOf(setupMarker);
      const restoreIndex = content.indexOf(
        'Restore the exact snapshot into the resulting `plan.md` frontmatter',
      );

      expect(
        snapshotIndex,
        `${name} snapshot instruction`,
      ).toBeGreaterThanOrEqual(0);
      expect(rewriteIndex, `${name} rewrite boundary`).toBeGreaterThan(
        snapshotIndex,
      );
      expect(restoreIndex, `${name} restore after rewrite`).toBeGreaterThan(
        rewriteIndex,
      );
      expect(setupIndex, `${name} restore before setup`).toBeGreaterThan(
        restoreIndex,
      );

      const preservationContract = content.slice(snapshotIndex, setupIndex);
      expect(preservationContract, `${name} key-presence snapshot`).toMatch(
        /key presence/i,
      );
      expect(preservationContract, `${name} complete-value snapshot`).toMatch(
        /complete explicit value/i,
      );
      expect(
        preservationContract,
        `${name} presence is not truthiness`,
      ).toMatch(
        /presence[\s\S]{0,120}(?:not truthiness|regardless of validity)/i,
      );
      expect(preservationContract, `${name} complete value cases`).toMatch(
        /enabled[\s\S]{0,80}disabled[\s\S]{0,80}selected-phase[\s\S]{0,80}`null`[\s\S]{0,80}malformed/i,
      );
      expect(preservationContract, `${name} no explicit re-probe`).toMatch(
        /explicit presence[\s\S]{0,180}(?:must not|do not)[\s\S]{0,100}(?:probe|re-prompt)/i,
      );
      expect(preservationContract, `${name} absent key stays absent`).toMatch(
        /key was absent[\s\S]{0,300}do not\s+invent/i,
      );
    }

    expect(paths[0].content).toMatch(/overwrite[\s\S]{0,220}exact snapshot/i);
    expect(paths[1].content).toMatch(/resumed explicit value/i);
    expect(paths[2].content).toMatch(
      /resumed[\s\S]{0,120}imported[\s\S]{0,180}complete explicit value/i,
    );
  });

  it('makes provider native plan mode inherit phase-review setup from import', async () => {
    const imported = await readRepoFile(
      '.agents/skills/oat-project-import-plan/SKILL.md',
    );

    expect(imported).toMatch(
      /provider-plan-via-import[\s\S]{0,500}Shared Phase-Review\s+Setup\s+Contract/i,
    );
    expect(imported).toMatch(
      /provider native plan mode[\s\S]{0,300}(?:inherits|uses)[\s\S]{0,220}(?:same|import)/i,
    );
    expect(imported).toMatch(
      /resumed\s+or\s+imported\s+explicit[\s\S]{0,220}(?:without|do not)[\s\S]{0,120}(?:re-prompt|prompt)/i,
    );
  });

  it('keeps quick and imported plans non-ready until review disposition is durable', async () => {
    const quick = await readRepoFile(
      '.agents/skills/oat-project-quick-start/SKILL.md',
    );
    const imported = await readRepoFile(
      '.agents/skills/oat-project-import-plan/SKILL.md',
    );
    const next = await readRepoFile('.agents/skills/oat-project-next/SKILL.md');

    const paths = [
      {
        name: 'quick-start',
        content: quick,
        draftStart: '### Step 3: Generate Plan Directly',
        reviewStart: '### Step 3.6: Run Plan Artifact Review Loop',
        completionEnd: '### Step 4: Sync Project State',
      },
      {
        name: 'import-plan',
        content: imported,
        draftStart: '### Step 4: Update Plan Metadata',
        reviewStart: '### Step 4.5: Run Import-Aware Plan Artifact Review Loop',
        completionEnd: '### Step 5: Update Project State',
      },
    ] as const;

    for (const {
      name,
      content,
      draftStart,
      reviewStart,
      completionEnd,
    } of paths) {
      const draftStartIndex = content.indexOf(draftStart);
      const reviewStartIndex = content.indexOf(reviewStart);
      const completionEndIndex = content.indexOf(
        completionEnd,
        reviewStartIndex,
      );
      const draft = content.slice(draftStartIndex, reviewStartIndex);
      const completion = content.slice(reviewStartIndex, completionEndIndex);

      expect(draftStartIndex, `${name} draft boundary`).toBeGreaterThanOrEqual(
        0,
      );
      expect(reviewStartIndex, `${name} review boundary`).toBeGreaterThan(
        draftStartIndex,
      );
      expect(completionEndIndex, `${name} completion boundary`).toBeGreaterThan(
        reviewStartIndex,
      );
      expect(draft, `${name} draft status`).toContain(
        '`oat_status: in_progress`',
      );
      expect(draft, `${name} draft readiness`).toContain(
        '`oat_ready_for: null`',
      );
      expect(draft, `${name} current-phase marker`).toContain(
        '`oat_template: true`',
      );
      expect(draft, `${name} interrupted routing`).toMatch(
        /oat-project-next[\s\S]{0,260}(?:current|same)[\s\S]{0,120}(?:plan|planning)[\s\S]{0,180}(?:must not|cannot)[\s\S]{0,120}(?:implement|advance)/i,
      );

      const outcomeIndex = completion.search(
        /durably record[\s\S]{0,160}(?:review (?:outcome|disposition)|explicit skip)/i,
      );
      const readyIndex = completion.indexOf(
        '`oat_ready_for: oat-project-implement`',
        outcomeIndex,
      );
      const completeIndex = completion.indexOf(
        '`oat_status: complete`',
        outcomeIndex,
      );
      const nonTemplateIndex = completion.indexOf(
        '`oat_template: false`',
        outcomeIndex,
      );

      expect(
        outcomeIndex,
        `${name} durable review disposition`,
      ).toBeGreaterThanOrEqual(0);
      expect(readyIndex, `${name} final readiness`).toBeGreaterThan(
        outcomeIndex,
      );
      expect(completeIndex, `${name} final status`).toBeGreaterThan(
        outcomeIndex,
      );
      expect(nonTemplateIndex, `${name} final template marker`).toBeGreaterThan(
        outcomeIndex,
      );
      expect(completion, `${name} no output-only disposition`).toMatch(
        /(?:review row|Reviews section)[\s\S]{0,260}plan\.md/i,
      );
    }

    expect(next).toMatch(
      /oat_template\s*==\s*true[\s\S]{0,220}(?:CURRENT|current) phase/i,
    );
    expect(imported).toMatch(
      /provider-plan-via-import[\s\S]{0,520}inherits[\s\S]{0,220}(?:readiness|completion)[\s\S]{0,220}(?:review|disposition)/i,
    );
  });

  it('routes interrupted tier-3 plans to their mode-specific planning workflow', async () => {
    const next = await readRepoFile('.agents/skills/oat-project-next/SKILL.md');
    const specTable = next.slice(
      next.indexOf('**Spec-Driven Mode**'),
      next.indexOf('**Quick Mode:**'),
    );
    const quickTable = next.slice(
      next.indexOf('**Quick Mode:**'),
      next.indexOf('**Import Mode:**'),
    );
    const importTable = next.slice(
      next.indexOf('**Import Mode:**'),
      next.indexOf('### Step 4:'),
    );
    const planTier3Row = (table: string): string | undefined =>
      table
        .split('\n')
        .find(
          (line) =>
            line.includes('| plan') &&
            line.includes('| in_progress') &&
            line.includes('| tier 3'),
        );

    expect(next).toMatch(
      /\*\*Tier 3 \(Template\/Empty\):\*\*[\s\S]{0,220}`oat_template == true`/,
    );
    expect(planTier3Row(quickTable)).toContain('`oat-project-quick-start`');
    expect(planTier3Row(specTable)).toContain('`oat-project-plan`');
    expect(planTier3Row(importTable)).toContain('`oat-project-import-plan`');
    expect(next.match(/^version:\s*(.+)$/m)?.[1]?.trim()).toBe('1.0.6');
  });

  it('documents phase-review setup across project workflow references', async () => {
    const artifacts = await readRepoFile(
      'apps/oat-docs/docs/workflows/projects/artifacts.md',
    );
    const reviews = await readRepoFile(
      'apps/oat-docs/docs/workflows/projects/reviews.md',
    );
    const lifecycle = await readRepoFile(
      'apps/oat-docs/docs/workflows/projects/lifecycle.md',
    );

    for (const [name, content] of [
      ['artifacts', artifacts],
      ['reviews', reviews],
      ['lifecycle', lifecycle],
    ] as const) {
      expect(content, `${name} setup timing`).toMatch(
        /stable\s+phase\s+IDs[\s\S]{0,300}before[\s\S]{0,180}plan\s+artifact\s+review/i,
      );
      expect(content, `${name} target eligibility`).toMatch(
        /explicitly\s+configured[\s\S]{0,160}enabled[\s\S]{0,160}available/i,
      );
      expect(content, `${name} choices`).toMatch(
        /all\s+phases[\s\S]{0,200}selected\s+phases[\s\S]{0,200}disabled/i,
      );
      expect(content, `${name} preservation`).toMatch(
        /explicit[\s\S]{0,120}`oat_phase_review_gate`[\s\S]{0,240}(?:preserv|unchanged)[\s\S]{0,180}(?:without|no)[\s\S]{0,100}(?:prompt|re-prompt)/i,
      );
    }

    expect(lifecycle).toMatch(/provider native plan mode[\s\S]*import/i);
  });

  it('aligns dispatch readiness, cursor enforcement, and codex output ownership', async () => {
    const lifecycle = await readRepoFile(
      'apps/oat-docs/docs/workflows/projects/lifecycle.md',
    );
    const dispatchPolicy = await readRepoFile(
      'apps/oat-docs/docs/workflows/projects/dispatch-ceiling.md',
    );
    const execution = await readRepoFile(
      'apps/oat-docs/docs/workflows/projects/implementation-execution.md',
    );
    const scope = await readRepoFile(
      'apps/oat-docs/docs/provider-sync/scope-and-surface.md',
    );
    const providers = await readRepoFile(
      'apps/oat-docs/docs/provider-sync/providers.md',
    );
    const implement = await readRepoFile(
      '.agents/skills/oat-project-implement/SKILL.md',
    );

    expect(lifecycle).toMatch(
      /non-interactive planning[\s\S]{0,220}not implementation-ready[\s\S]{0,220}(?:block|resolver succeeds)/i,
    );
    expect(lifecycle).not.toMatch(
      /non-interactive planning leaves it unresolved[\s\S]{0,160}implementation preflight/i,
    );
    expect(dispatchPolicy).toMatch(
      /Codex[\s\S]{0,240}Luna[\s\S]{0,80}`low`[\s\S]{0,80}`medium`[\s\S]{0,80}`high`[\s\S]{0,80}`xhigh`[\s\S]{0,240}Sol[\s\S]{0,140}`max`/i,
    );

    for (const [name, content] of [
      ['canonical implement skill', implement],
      ['implementation execution docs', execution],
    ] as const) {
      expect(content, `${name} cursor model arg`).toMatch(
        /Cursor[\s\S]{0,320}opaque[\s\S]{0,240}enforced[\s\S]{0,200}model arg/i,
      );
      expect(
        content,
        `${name} no stale cursor unsupported example`,
      ).not.toMatch(/cursor, unsupported — no adapter; informational/i);
    }

    expect(scope).toMatch(
      /\.codex\/config\.toml[\s\S]{0,320}(?:every|all) generated project[\s\S]{0,240}(?:repository-owned|version-controlled)[\s\S]{0,240}no automatic ignore/i,
    );
    expect(scope).toMatch(/user[\s\S]{0,180}~\/\.codex/i);
    expect(scope).not.toMatch(/user-scope role generation remains.*deferred/i);

    expect(providers).toMatch(
      /Project sync (?:writes|maintains)[\s\S]{0,120}version-controlled[\s\S]{0,320}26 pinned variants/i,
    );
    expect(providers).not.toMatch(
      /Project sync commits the supported catalogue/i,
    );
    expect(providers).toMatch(
      /project-generated[\s\S]{0,180}(?:repository-owned|version-controlled)[\s\S]{0,200}(?:never|no)[\s\S]{0,80}(?:auto-ignore|automatic ignore)/i,
    );
  });

  it('documents shipped user Codex materialization ownership in the review guide', async () => {
    const reviews = await readRepoFile(
      'apps/oat-docs/docs/workflows/projects/reviews.md',
    );

    expect(reviews).toMatch(
      /user-config[^\n]{0,100}(?:roles? )?materialize[^\n]{0,100}`~\/\.codex`/i,
    );
    expect(reviews).toMatch(
      /project-config[^\n]{0,100}supported-catalogue[^\n]{0,180}project-scoped[^\n]{0,100}version-controlled/i,
    );
    expect(reviews).not.toMatch(
      /user-scope Codex role generation[^\n]{0,120}(?:deferred|not (?:implemented|available))/i,
    );
  });

  it('tracks the p04 planning skill contract versions', async () => {
    const expectedVersions = [
      ['oat-project-plan-writing', '1.2.8'],
      ['oat-project-plan', '1.3.12'],
      ['oat-project-quick-start', '2.1.13'],
      ['oat-project-import-plan', '1.4.4'],
      ['oat-project-review-provide', '1.3.13'],
    ] as const;

    for (const [skillName, expectedVersion] of expectedVersions) {
      const content = await readRepoFile(
        `.agents/skills/${skillName}/SKILL.md`,
      );
      expect(content.match(/^version:\s*(.+)$/m)?.[1]?.trim(), skillName).toBe(
        expectedVersion,
      );
    }
  });

  it('tracks Dispatch Report V1 workflow contract versions and provenance boundaries', async () => {
    const expectedVersions = [
      ['oat-project-implement', '2.0.34'],
      ['oat-project-review-provide', '1.3.13'],
      ['oat-project-review-provide-remote', '1.0.3'],
    ] as const;

    for (const [skillName, expectedVersion] of expectedVersions) {
      const content = await readRepoFile(
        `.agents/skills/${skillName}/SKILL.md`,
      );
      expect(content.match(/^version:\s*(.+)$/m)?.[1]?.trim(), skillName).toBe(
        expectedVersion,
      );
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
        `${skillName} actionable resolver invocations`,
      ).toBeGreaterThan(0);
      for (const invocation of invocations) {
        expect(invocation, `${skillName} report scope`).toMatch(
          /--report-scope\s+\S+/,
        );
        expect(invocation, `${skillName} literal report action`).toMatch(
          /--report-action\s+(implementation|fix|review)(?:\s|$)/,
        );
      }
      expect(content, `${skillName} versioned report`).toContain(
        'dispatchReport.schemaVersion: 1',
      );
      expect(content, `${skillName} report renderer`).toContain(
        'formatDispatchReport(dispatchReport)',
      );
      expect(content, `${skillName} report-derived stamp`).toContain(
        'formatDispatchStamp(dispatchReport)',
      );
      expect(content, `${skillName} target retention`).toMatch(
        /providers\.<provider>\.dispatchArgs[\s\S]{0,220}providers\.<provider>\.selection\.target/,
      );
      expect(content, `${skillName} configured provenance`).toMatch(
        /configured/i,
      );
      expect(content, `${skillName} producer provenance`).toMatch(
        /(?:diversity|producer)/i,
      );
      expect(content, `${skillName} runtime provenance`).toMatch(
        /runtime(?:Identity|\s+identity)/i,
      );
    }
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

    expect(content.match(/^version:\s*(.+)$/m)?.[1]?.trim()).toBe('2.1.13');
  });

  it('documents quick-start selective config fallback to collaborative', async () => {
    const repoRoot = join(process.cwd(), '..', '..');
    const skillPath = join(
      repoRoot,
      '.agents',
      'skills',
      'oat-project-quick-start',
      'SKILL.md',
    );
    const content = await readFile(skillPath, 'utf8');

    expect(
      content,
      'quick-start must accept workflow.designMode=selective from config',
    ).toMatch(/\$CONFIG_MODE" = "selective"/);
    expect(
      content,
      'quick-start must treat selective as collaborative for lightweight design',
    ).toMatch(/treating as collaborative for lightweight design/i);
    expect(
      content,
      'quick-start must point users to full oat-project-design for Selective Collaborative',
    ).toMatch(
      /Selective Collaborative is only available in full oat-project-design/,
    );
  });

  it('preserves the selective collaborative review-pass contract', async () => {
    const repoRoot = join(process.cwd(), '..', '..');
    const skillPath = join(
      repoRoot,
      '.agents',
      'skills',
      'oat-project-design',
      'SKILL.md',
    );
    const referencePath = join(
      repoRoot,
      '.agents',
      'skills',
      'oat-project-design',
      'references',
      'selective-review-pass.md',
    );
    const skillContent = await readFile(skillPath, 'utf8');
    const referenceContent = await readFile(referencePath, 'utf8');

    expect(
      skillContent,
      'oat-project-design selective-mode contract version must stay explicit',
    ).toMatch(/^version:\s*2\.1\.0$/m);
    expect(
      skillContent,
      'Step 4a heading must remain present for selective review-pass flow',
    ).toMatch(/### Step 4a: Selective Review Pass/);
    expect(skillContent, 'Step 4a must name routine classifications').toMatch(
      /`routine`/,
    );
    expect(
      skillContent,
      'Step 4a must name needs-eyes classifications',
    ).toMatch(/`needs-eyes`/);
    expect(
      skillContent,
      'Step 4a must preserve the conservative-bias rule',
    ).toMatch(/any one needs-eyes signal marks the section `needs-eyes`/i);
    expect(
      skillContent,
      'Step 4a must force at least one live review section',
    ).toMatch(/force `Overview \+ Architecture` to `needs-eyes`/i);
    expect(
      skillContent,
      'Step 4a must reveal the Section Review Plan before drafting',
    ).toMatch(/Section Review Plan|Section review plan/);
    expect(
      skillContent,
      'Step 4a must point maintainers to the selective review-pass reference',
    ).toMatch(/references\/selective-review-pass\.md/);
    expect(
      skillContent,
      'Step 1.5 picker copy must use canonical selective wording',
    ).toMatch(/high-risk sections live/);
    expect(
      skillContent,
      'Step 1.5 picker copy must use canonical draft review wording',
    ).toMatch(/you review the committed file/);
    expect(referenceContent).toMatch(/^## Signal Set$/m);
    expect(referenceContent).toMatch(/^## Adequate Grounding$/m);
    expect(referenceContent).toMatch(/^## Recommendation Rules$/m);
    expect(referenceContent).toMatch(/^## Edge Cases$/m);
    expect(referenceContent).toMatch(/^## Dogfood Notes$/m);
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
      expect.objectContaining({
        file: skillPath,
        message:
          'Quick-start must treat a bare project name as insufficient input, ask for a project description, and avoid inferring scope from the repo',
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
        'A bare project name alone is not enough context to start discovery.',
        'Ask the user for a short project description when only the project name was provided.',
        'Do not infer requirements from the repo before that description is available.',
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

  it('allows brand-new canonical skills that do not exist at the base ref', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-validate-'));
    tempDirs.push(root);

    await createSkillFile(
      root,
      'oat-brand-new-skill',
      currentSkillContent(
        'oat-brand-new-skill',
        '1.0.0',
        'Brand-new skill content.',
      ),
    );

    const result = await validateChangedSkillVersionBumps(
      root,
      { baseRef: 'origin/main' },
      {
        gitExecFile: async (_file, args) => {
          if (args[0] === 'diff') {
            return {
              stdout: '.agents/skills/oat-brand-new-skill/SKILL.md\n',
              stderr: '',
            };
          }

          if (
            args[0] === 'show' &&
            args[1] ===
              'origin/main:.agents/skills/oat-brand-new-skill/SKILL.md'
          ) {
            throw new Error('not found');
          }

          throw new Error(`Unexpected command: git ${args.join(' ')}`);
        },
      },
    );

    expect(result).toEqual({
      validatedSkillCount: 1,
      findings: [],
    });
  });

  it('skips version-bump enforcement when a changed skill lacks a version key', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-validate-'));
    tempDirs.push(root);

    await createSkillFile(
      root,
      'oat-no-version-enforcement',
      validSkillContent('oat-no-version-enforcement'),
    );

    const result = await validateChangedSkillVersionBumps(
      root,
      { baseRef: 'origin/main' },
      {
        gitExecFile: async (_file, args) => {
          if (args[0] === 'diff') {
            return {
              stdout: '.agents/skills/oat-no-version-enforcement/SKILL.md\n',
              stderr: '',
            };
          }

          if (
            args[0] === 'show' &&
            args[1] ===
              'origin/main:.agents/skills/oat-no-version-enforcement/SKILL.md'
          ) {
            return {
              stdout: currentSkillContent(
                'oat-no-version-enforcement',
                '1.2.3',
                'Previous versioned content.',
              ),
              stderr: '',
            };
          }

          throw new Error(`Unexpected command: git ${args.join(' ')}`);
        },
      },
    );

    expect(result).toEqual({
      validatedSkillCount: 1,
      findings: [],
    });
  });
});
