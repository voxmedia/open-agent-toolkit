import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import type { SplitPayload } from '../../projects/split/child-plan';

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
});
