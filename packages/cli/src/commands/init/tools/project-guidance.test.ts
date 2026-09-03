import { describe, expect, it, vi } from 'vitest';

import {
  buildToolPacksSectionBody,
  parseProjectGuidanceFlags,
  planProjectGuidance,
} from './project-guidance';

const realizedPacks = [
  { pack: 'docs' as const, scope: 'project' as const },
  { pack: 'workflows' as const, scope: 'user' as const },
  { pack: 'utility' as const, scope: 'both' as const },
];

describe('parseProjectGuidanceFlags', () => {
  it('distinguishes explicit acceptance, decline, and no choice', () => {
    expect(parseProjectGuidanceFlags(['--project-guidance'])).toBe(true);
    expect(parseProjectGuidanceFlags(['--no-project-guidance'])).toBe(false);
    expect(parseProjectGuidanceFlags([])).toBeUndefined();
  });

  it('rejects conflicting explicit flags', () => {
    expect(() =>
      parseProjectGuidanceFlags([
        '--project-guidance',
        '--no-project-guidance',
      ]),
    ).toThrow('cannot be used together');
  });
});

describe('planProjectGuidance', () => {
  it('plans explicit accepted guidance from complete realized pack evidence', async () => {
    const confirmAction = vi.fn(async () => false);

    const plan = await planProjectGuidance({
      repoRoot: '/repo',
      packs: realizedPacks,
      explicitChoice: true,
      interactive: false,
      confirmAction,
    });

    expect(plan).toMatchObject({
      repoRoot: '/repo',
      target: '/repo/AGENTS.md',
      action: 'create',
      sectionKey: 'tools',
      legacySectionAction: 'remove',
      choice: { choice: 'accepted', source: 'flag' },
    });
    expect(plan.body).toContain('**docs**');
    expect(plan.body).toContain('**workflows**');
    expect(plan.body).toContain('**utility**');
    expect(confirmAction).not.toHaveBeenCalled();
  });

  it('plans an explicit decline without a mutation', async () => {
    const plan = await planProjectGuidance({
      repoRoot: '/repo',
      packs: realizedPacks,
      explicitChoice: false,
      interactive: true,
      confirmAction: vi.fn(async () => true),
    });

    expect(plan.action).toBe('declined');
    expect(plan.legacySectionAction).toBe('preserve');
    expect(plan.choice).toEqual({ choice: 'declined', source: 'flag' });
  });

  it('prompts exactly once and defaults to decline', async () => {
    const confirmAction = vi.fn(async () => false);

    const plan = await planProjectGuidance({
      repoRoot: '/repo',
      packs: realizedPacks,
      interactive: true,
      confirmAction,
    });

    expect(confirmAction).toHaveBeenCalledTimes(1);
    expect(confirmAction.mock.calls[0]?.[0]).toContain('AGENTS.md');
    expect(plan.action).toBe('declined');
    expect(plan.choice).toEqual({ choice: 'declined', source: 'prompt' });
  });

  it('defaults non-interactive use to no write with an actionable notice', async () => {
    const confirmAction = vi.fn(async () => true);

    const plan = await planProjectGuidance({
      repoRoot: '/repo',
      packs: realizedPacks,
      interactive: false,
      confirmAction,
    });

    expect(plan.action).toBe('not-requested');
    expect(plan.choice).toEqual({
      choice: 'not-requested',
      source: 'non-interactive-default',
    });
    expect(plan.reason).toContain('--project-guidance');
    expect(confirmAction).not.toHaveBeenCalled();
  });

  it('blocks explicit acceptance outside a repository', async () => {
    const plan = await planProjectGuidance({
      repoRoot: null,
      packs: realizedPacks,
      explicitChoice: true,
      interactive: false,
      confirmAction: vi.fn(async () => false),
    });

    expect(plan.action).toBe('blocked');
    expect(plan.reason).toContain('repository root');
  });
});

describe('buildToolPacksSectionBody', () => {
  it('keeps tool guidance independent of PJM adoption', () => {
    const body = buildToolPacksSectionBody(realizedPacks);

    expect(body).toContain('## Tool Packs');
    expect(body).toContain('Workflow Execution Continuation');
    expect(body).not.toContain('PJM');
    expect(body).not.toContain('project-management -->');
    expect(body).not.toContain('oat pjm init');
  });
});
