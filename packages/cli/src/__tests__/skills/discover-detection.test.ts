import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { buildSplitPlanDocument } from '../../projects/split/child-plan';
import { evaluateSignals, type Signal } from '../../projects/split/signals';

const discoverSkillPath = fileURLToPath(
  new URL(
    '../../../../../.agents/skills/oat-project-discover/SKILL.md',
    import.meta.url,
  ),
);

function readDiscoverSkill(): string {
  return readFileSync(discoverSkillPath, 'utf8');
}

function simulateDiscoverDetection(
  fired: Signal[],
  options: { nonInteractive?: boolean } = {},
): { prompt: string | null; writesRecommendation: boolean; exitCode: number } {
  const evaluation = evaluateSignals({ fired });

  if (!evaluation.triggered) {
    return { prompt: null, writesRecommendation: false, exitCode: 0 };
  }

  if (options.nonInteractive) {
    return {
      prompt: null,
      writesRecommendation: true,
      exitCode: 1,
    };
  }

  return {
    prompt:
      evaluation.confidence === 'high'
        ? 'This looks like multiple independent projects. Split now?'
        : 'This may be multiple projects. Split, continue discovery, or keep one project?',
    writesRecommendation: false,
    exitCode: 0,
  };
}

function simulateDiscoverConvergence(
  fired: Signal[],
  options: { nonInteractive?: boolean } = {},
): {
  prompt: string | null;
  writesRecommendation: boolean;
  proceedsAsOneProject: boolean;
  exitCode: number;
} {
  const evaluation = evaluateSignals({ fired });

  if (options.nonInteractive) {
    return evaluation.triggered
      ? {
          prompt: null,
          writesRecommendation: true,
          proceedsAsOneProject: false,
          exitCode: 1,
        }
      : {
          prompt: null,
          writesRecommendation: false,
          proceedsAsOneProject: true,
          exitCode: 0,
        };
  }

  return {
    prompt:
      'This reads as one cohesive project — proceed, or split into multiple?',
    writesRecommendation: false,
    proceedsAsOneProject: evaluation.confidence === 'below',
    exitCode: 0,
  };
}

describe('oat-project-discover split detection hook', () => {
  it('allows the documented pnpm local-development fallback', () => {
    expect(readDiscoverSkill()).toContain('Bash(pnpm:*)');
    expect(readDiscoverSkill()).toContain(
      'pnpm run cli -- project split evaluate-signals',
    );
  });

  it('surfaces high-confidence wording when load-bearing signals 1 and 2 fire', () => {
    const outcome = simulateDiscoverDetection([
      'independently-shippable',
      'no-shared-design-surface',
    ]);

    expect(outcome.prompt).toContain(
      'looks like multiple independent projects',
    );
    expect(readDiscoverSkill()).toContain('high-confidence');
    expect(readDiscoverSkill()).toContain(
      'This looks like multiple independent projects',
    );
  });

  it('surfaces soft wording when only signals 3 and 4 fire', () => {
    const outcome = simulateDiscoverDetection([
      'expect-separate-prs',
      'distinct-subsystems',
    ]);

    expect(outcome.prompt).toContain('may be multiple projects');
    expect(readDiscoverSkill()).toContain('soft');
    expect(readDiscoverSkill()).toContain('This may be multiple projects');
  });

  it('does not surface a split offer when fewer than two signals fire', () => {
    expect(simulateDiscoverDetection([]).prompt).toBeNull();
    expect(
      simulateDiscoverDetection(['distinct-subsystems']).prompt,
    ).toBeNull();
    expect(readDiscoverSkill()).toContain(
      'Below 2 signals, do not surface a split offer',
    );
  });

  it('records a split recommendation and exits non-zero in non-interactive mode', () => {
    const outcome = simulateDiscoverDetection(
      ['independently-shippable', 'no-shared-design-surface'],
      { nonInteractive: true },
    );

    expect(outcome.prompt).toBeNull();
    expect(outcome.writesRecommendation).toBe(true);
    expect(outcome.exitCode).toBe(1);
    expect(readDiscoverSkill()).toContain('## Detected Split Recommendation');
    expect(readDiscoverSkill()).toContain('exit 1');
  });

  it('fails fast for non-interactive convergence detection before prompting', () => {
    const outcome = simulateDiscoverConvergence(
      ['expect-separate-prs', 'distinct-subsystems'],
      { nonInteractive: true },
    );

    expect(outcome.prompt).toBeNull();
    expect(outcome.writesRecommendation).toBe(true);
    expect(outcome.proceedsAsOneProject).toBe(false);
    expect(outcome.exitCode).toBe(1);
    expect(readDiscoverSkill()).toContain('Non-interactive convergence branch');
    expect(readDiscoverSkill()).toContain(
      'proceed as one cohesive project without prompting',
    );
  });

  it('can hand a detected mid-stream transcript to the split plan normalizer', () => {
    const document = buildSplitPlanDocument({
      origin: 'detected-mid-stream',
      interactive: true,
      parentSlug: 'broad-discovery',
      inferredChildren: [
        {
          slug: 'workflow-foundation',
          inheritedContext: 'Shared workflow context from discovery.',
          foundation: true,
        },
        {
          slug: 'docs-followup',
          inheritedContext: 'Docs context from discovery.',
          knownDependencies: ['workflow-foundation'],
        },
      ],
      integrationSketch: 'Foundation ships before docs follow-up.',
    });

    expect(document.origin).toBe('detected-mid-stream');
    expect(document.interactive).toBe(true);
    expect(document.plan.initialActiveChild).toBe('workflow-foundation');
    expect(document.plan.children.map((child) => child.slug)).toEqual([
      'workflow-foundation',
      'docs-followup',
    ]);
  });
});
