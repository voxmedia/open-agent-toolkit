import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
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

function validSkillContent(): string {
  return [
    '---',
    'name: oat-demo',
    'description: demo',
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
        'name: oat-demo',
        'description: demo',
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
        'name: oat-demo',
        'description: demo',
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
        'name: oat-demo',
        'description: demo',
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
    await createSkillFile(root, 'oat-valid-one', validSkillContent());
    await createSkillFile(root, 'oat-valid-two', validSkillContent());
    await createSkillFile(root, 'non-oat-dir', '# ignored');

    const result = await validateOatSkills(root);
    expect(result.validatedSkillCount).toBe(2);
    expect(result.findings).toEqual([]);
  });
});
