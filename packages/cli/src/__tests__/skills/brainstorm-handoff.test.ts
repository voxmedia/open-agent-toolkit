import { describe, expect, it } from 'vitest';

import {
  SPLIT_HANDOFF_TARGET,
  runBrainstormPickerFixture,
  runDeclaredBrainstormFixture,
  type TranscriptFixture,
} from './split-flow-fixtures';

const children = [
  {
    slug: 'workflow-foundation',
    description: 'Shared workflow foundation',
    inheritedContext: 'Brainstorm captured shared workflow context.',
    foundation: true,
  },
  {
    slug: 'adapter-followup',
    description: 'Provider adapter follow-up',
    inheritedContext: 'Brainstorm captured adapter follow-up context.',
    knownDependencies: ['workflow-foundation'],
  },
];

function fixtureFor(
  transcript: TranscriptFixture['transcript'],
): TranscriptFixture {
  return {
    transcript,
    parentSlug: 'umbrella-workflow',
    children,
    inheritedContext: 'Brainstorm session note with umbrella context.',
    integrationSketch: 'Foundation should land before adapter follow-up.',
  };
}

describe('oat-brainstorm transcript split handoff hooks', () => {
  it('hands declared multi-project brainstorming to oat-project-split with declared origin', () => {
    const outcome = runDeclaredBrainstormFixture(
      fixtureFor([
        {
          speaker: 'user',
          text: 'I want this to be an umbrella project with multiple projects underneath it.',
        },
        {
          speaker: 'assistant',
          text: 'We can frame it as parent context plus child projects.',
        },
      ]),
      { 'declared-brainstorm-boundary': 'children-known' },
    );

    expect(outcome.asked).toHaveLength(1);
    expect(outcome.asked[0]).toMatchObject({
      id: 'declared-brainstorm-boundary',
      response: 'children-known',
    });
    expect(outcome.asked[0]?.prompt).toContain(
      'already know the child projects',
    );
    expect(outcome.handoffTarget).toEqual(SPLIT_HANDOFF_TARGET);
    expect(outcome.payload).toMatchObject({
      origin: 'declared',
      parentSlug: 'umbrella-workflow',
      interactive: true,
    });
    expect(
      outcome.payload?.declaredChildren?.map((child) => child.slug),
    ).toEqual(['workflow-foundation', 'adapter-followup']);
    expect(outcome.document).toMatchObject({
      origin: 'declared',
      plan: {
        parentSlug: 'umbrella-workflow',
        foundationChild: 'workflow-foundation',
        initialActiveChild: 'workflow-foundation',
      },
    });
    expect(outcome.document?.plan.children.map((child) => child.slug)).toEqual([
      'workflow-foundation',
      'adapter-followup',
    ]);
  });

  it('does not hand off ambiguous exploratory brainstorming as declared mode', () => {
    const outcome = runDeclaredBrainstormFixture(
      fixtureFor([
        {
          speaker: 'user',
          text: 'Help me think through a broad thing that might get big.',
        },
      ]),
      {},
    );

    expect(outcome.asked).toEqual([]);
    expect(outcome.payload).toBeUndefined();
    expect(outcome.handoffTarget.skill).toBe('oat-project-split');
  });

  it('adds the N-project picker option only when brainstorm transcript signals trigger', () => {
    const triggered = runBrainstormPickerFixture(
      fixtureFor([
        {
          speaker: 'user',
          text: 'These can ship independently and probably need separate PRs.',
        },
      ]),
      { 'brainstorm-terminal-state': 'promote-n-projects' },
    );
    const below = runBrainstormPickerFixture(
      fixtureFor([
        {
          speaker: 'user',
          text: 'This touches one distinct subsystem but is still one project.',
        },
      ]),
      { 'brainstorm-terminal-state': 'inline-only' },
    );

    expect(triggered.options).toContain('promote-n-projects');
    expect(triggered.payload?.origin).toBe('brainstorm-picker');
    expect(below.options).not.toContain('promote-n-projects');
    expect(below.payload).toBeUndefined();
  });

  it('hands brainstorm-picker selection to oat-project-split with inferred children', () => {
    const outcome = runBrainstormPickerFixture(
      fixtureFor([
        {
          speaker: 'user',
          text: 'We have independently shippable work with no shared design surface.',
        },
        {
          speaker: 'assistant',
          text: 'The likely children are a workflow foundation and an adapter follow-up.',
        },
      ]),
      { 'brainstorm-terminal-state': 'promote-n-projects' },
    );

    expect(outcome.asked).toHaveLength(1);
    expect(outcome.asked[0]).toMatchObject({
      id: 'brainstorm-terminal-state',
      response: 'promote-n-projects',
    });
    expect(outcome.handoffTarget).toMatchObject({
      skill: 'oat-project-split',
      hookCreatesProjects: false,
    });
    expect(outcome.handoffTarget.responsibilities).toEqual([
      'normalize-split-plan',
      'write-coordination-parent',
      'scaffold-children',
      'activate-initial-child',
    ]);
    expect(outcome.payload).toMatchObject({
      origin: 'brainstorm-picker',
      parentSlug: 'umbrella-workflow',
      interactive: true,
      priorDiscovery: {
        path: 'brainstorm/umbrella-workflow',
      },
    });
    expect(
      outcome.payload?.inferredChildren?.map((child) => child.slug),
    ).toEqual(['workflow-foundation', 'adapter-followup']);
    expect(outcome.document).toMatchObject({
      origin: 'brainstorm-picker',
      plan: {
        parentSlug: 'umbrella-workflow',
        foundationChild: 'workflow-foundation',
        initialActiveChild: 'workflow-foundation',
        integrationSketch: 'Foundation should land before adapter follow-up.',
      },
    });
    expect(outcome.document?.plan.children.map((child) => child.slug)).toEqual([
      'workflow-foundation',
      'adapter-followup',
    ]);
  });
});
