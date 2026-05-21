import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

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

describe('oat-project-discover split detection hook', () => {
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
});
