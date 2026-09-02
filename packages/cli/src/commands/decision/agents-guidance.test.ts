import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  buildDecisionAgentsSectionBody,
  initializeDecisionAgentsGuidance,
} from './agents-guidance';

describe('decision AGENTS guidance', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tempDirs.map((dir) => rm(dir, { recursive: true, force: true })),
    );
    tempDirs.length = 0;
  });

  it('builds guidance that works with or without the PJM skill', () => {
    const body = buildDecisionAgentsSectionBody();

    expect(body).toContain('.oat/repo/reference/decisions/AGENTS.md');
    expect(body).toContain('.oat/repo/reference/decisions/index.md');
    expect(body).toContain('oat-pjm-decision');
    expect(body).toContain('otherwise use `oat decision new`');
    expect(body).toContain('oat decision regenerate-index');
  });

  it('routes a missing decision surface to adoption, not to a guarded init', () => {
    const body = buildDecisionAgentsSectionBody();

    // `oat decision init` is behind `requireRepositoryPjm()`, so recommending
    // it for a missing surface recommends a command that always fails.
    expect(body).not.toContain('oat decision init');
    expect(body).toContain('oat pjm doctor --json');
    expect(body).toContain('adoption.state');
    expect(body).toContain('oat pjm init');
  });

  it('creates root and decision-scoped managed guidance idempotently', async () => {
    const projectRoot = await mkdtemp(join(tmpdir(), 'oat-decision-agents-'));
    tempDirs.push(projectRoot);
    const decisionsRoot = join(
      projectRoot,
      '.oat',
      'repo',
      'reference',
      'decisions',
    );

    const first = await initializeDecisionAgentsGuidance({
      projectRoot,
      decisionsRoot,
    });
    const second = await initializeDecisionAgentsGuidance({
      projectRoot,
      decisionsRoot,
    });

    expect(first).toEqual({ root: 'created', scoped: 'created' });
    expect(second).toEqual({ root: 'no-change', scoped: 'no-change' });

    const rootGuidance = await readFile(join(projectRoot, 'AGENTS.md'), 'utf8');
    expect(rootGuidance).toContain('<!-- OAT decisions -->');
    expect(rootGuidance).toContain('`.oat/repo/reference/decisions/AGENTS.md`');

    const scopedGuidance = await readFile(
      join(decisionsRoot, 'AGENTS.md'),
      'utf8',
    );
    expect(scopedGuidance).toContain('<!-- OAT decisions -->');
    expect(scopedGuidance).toContain('# Decision Record Guidance');
  });

  it('points root guidance at a custom decisions directory', async () => {
    const projectRoot = await mkdtemp(join(tmpdir(), 'oat-decision-agents-'));
    tempDirs.push(projectRoot);
    const decisionsRoot = join(projectRoot, 'architecture', 'decisions');

    await initializeDecisionAgentsGuidance({ projectRoot, decisionsRoot });

    const rootGuidance = await readFile(join(projectRoot, 'AGENTS.md'), 'utf8');
    expect(rootGuidance).toContain('`architecture/decisions/AGENTS.md`');
    expect(rootGuidance).toContain('`architecture/decisions/index.md`');
  });

  it('preserves project-management guidance at the root', async () => {
    const projectRoot = await mkdtemp(join(tmpdir(), 'oat-decision-agents-'));
    tempDirs.push(projectRoot);
    const decisionsRoot = join(projectRoot, 'architecture', 'decisions');
    const pjmSection =
      '<!-- OAT project-management -->\nPJM guidance\n<!-- END OAT project-management -->\n';
    await writeFile(join(projectRoot, 'AGENTS.md'), pjmSection, 'utf8');

    await initializeDecisionAgentsGuidance({ projectRoot, decisionsRoot });

    const rootGuidance = await readFile(join(projectRoot, 'AGENTS.md'), 'utf8');
    expect(rootGuidance).toContain(pjmSection.trim());
    expect(rootGuidance).toContain('<!-- OAT decisions -->');
  });
});
