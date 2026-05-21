import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';
import YAML from 'yaml';

import type { ChildPlan } from '../child-plan';
import { finalizeSplit } from '../finalize';

function stateContent(frontmatter: Record<string, unknown>): string {
  return `---\n${YAML.stringify(frontmatter).trimEnd()}\n---\n# State\n`;
}

function readFrontmatter(content: string): Record<string, unknown> {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) {
    throw new Error('missing frontmatter');
  }
  return YAML.parse(match[1]) as Record<string, unknown>;
}

const plan: ChildPlan = {
  parentSlug: 'umbrella',
  children: [
    {
      slug: 'foundation',
      inheritedContext: 'Foundation context',
      knownDependencies: [],
      order: 1,
    },
  ],
  initialActiveChild: 'foundation',
};

describe('finalizeSplit', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tempDirs.map(async (dir) => {
        await rm(dir, { recursive: true, force: true });
      }),
    );
    tempDirs.length = 0;
  });

  it('marks the parent terminal and activates the initial child path', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'oat-split-finalize-'));
    tempDirs.push(repoRoot);
    const parentRoot = join(repoRoot, '.oat', 'projects', 'shared', 'umbrella');
    await mkdir(parentRoot, { recursive: true });
    await mkdir(join(repoRoot, '.oat', 'projects', 'shared', 'foundation'), {
      recursive: true,
    });
    await writeFile(
      join(parentRoot, 'state.md'),
      stateContent({
        oat_kind: 'coordination',
        oat_phase: 'discovery',
        oat_phase_status: 'in_progress',
      }),
      'utf8',
    );

    const result = await finalizeSplit(plan, { repoRoot });

    expect(result.activeProjectPath).toBe('.oat/projects/shared/foundation');
    const state = readFrontmatter(
      await readFile(join(parentRoot, 'state.md'), 'utf8'),
    );
    expect(state['oat_phase']).toBe('decomposition');
    expect(state['oat_phase_status']).toBe('complete');

    const localConfig = JSON.parse(
      await readFile(join(repoRoot, '.oat', 'config.local.json'), 'utf8'),
    ) as { activeProject: string };
    expect(localConfig.activeProject).toBe('.oat/projects/shared/foundation');
  });
});
