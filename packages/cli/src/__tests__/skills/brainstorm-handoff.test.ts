import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  buildSplitPlanDocument,
  type SplitPayload,
} from '../../projects/split/child-plan';
import { evaluateSignals, type Signal } from '../../projects/split/signals';

const brainstormSkillPath = fileURLToPath(
  new URL(
    '../../../../../.agents/skills/oat-brainstorm/SKILL.md',
    import.meta.url,
  ),
);

function readBrainstormSkill(): string {
  return readFileSync(brainstormSkillPath, 'utf8');
}

function simulateDeclaredBrainstormHandoff(): {
  framing: string;
  question: string;
  payload: SplitPayload;
} {
  return {
    framing: 'umbrella framing',
    question:
      'Do you already know the child projects, or should we decompose the scope together?',
    payload: {
      origin: 'declared',
      parentSlug: 'umbrella-project',
      declaredChildren: [
        { slug: 'first-child', description: 'First bounded project' },
        { slug: 'second-child', description: 'Second bounded project' },
      ],
      interactive: true,
    },
  };
}

function simulateBrainstormPicker(fired: Signal[]): {
  options: string[];
  payload?: SplitPayload;
} {
  const evaluation = evaluateSignals({ fired });
  const options = ['Inline only', 'Doc-to-path', 'Promote to new OAT project'];

  if (!evaluation.triggered) {
    return { options };
  }

  return {
    options: [...options, 'Promote to N projects'],
    payload: {
      origin: 'brainstorm-picker',
      parentSlug: 'umbrella-project',
      inferredChildren: [{ slug: 'first-child' }, { slug: 'second-child' }],
      interactive: true,
    },
  };
}

describe('oat-brainstorm split handoff hooks', () => {
  it('enters declared multi-project mode with umbrella framing and origin declared', () => {
    const outcome = simulateDeclaredBrainstormHandoff();
    const skill = readBrainstormSkill();

    expect(outcome.framing).toBe('umbrella framing');
    expect(outcome.question).toContain('already know the child projects');
    expect(outcome.payload.origin).toBe('declared');
    expect(skill).toContain('Declared Multi-Project Mode');
    expect(skill).toContain(
      'Do you already know the child projects, or should we decompose the scope together?',
    );
    expect(skill).toContain('origin: "declared"');
  });

  it('keeps ambiguous exploratory phrasing on the soft path', () => {
    const skill = readBrainstormSkill();

    expect(skill).toContain('Soft Exploratory Path');
    expect(skill).toContain(
      'do not treat ambiguous exploratory phrasing as declared mode',
    );
  });

  it('adds a Promote to N projects picker option when split signals trigger', () => {
    const outcome = simulateBrainstormPicker([
      'independently-shippable',
      'no-shared-design-surface',
    ]);
    const skill = readBrainstormSkill();

    expect(outcome.options).toContain('Promote to N projects');
    expect(outcome.payload?.origin).toBe('brainstorm-picker');
    expect(skill).toContain('Promote to N projects');
    expect(skill).toContain('origin: "brainstorm-picker"');
    expect(skill).toContain('oat project split evaluate-signals');
  });

  it('does not show the N-projects picker option for small scope', () => {
    const outcome = simulateBrainstormPicker(['distinct-subsystems']);
    const skill = readBrainstormSkill();

    expect(outcome.options).not.toContain('Promote to N projects');
    expect(skill).toContain('Below 2 split signals, do not show this option');
  });

  it('normalizes the brainstorm picker payload before split execution', () => {
    const outcome = simulateBrainstormPicker([
      'expect-separate-prs',
      'distinct-subsystems',
    ]);

    expect(outcome.payload).toBeDefined();

    const document = buildSplitPlanDocument({
      ...outcome.payload!,
      inferredChildren: [
        {
          slug: 'foundation-child',
          inheritedContext: 'Shared brainstorm context.',
          foundation: true,
        },
        {
          slug: 'separate-followup',
          inheritedContext: 'Follow-up brainstorm context.',
          knownDependencies: ['foundation-child'],
        },
      ],
    });

    expect(document.origin).toBe('brainstorm-picker');
    expect(document.plan.initialActiveChild).toBe('foundation-child');
    expect(document.plan.children.map((child) => child.slug)).toEqual([
      'foundation-child',
      'separate-followup',
    ]);
  });
});
