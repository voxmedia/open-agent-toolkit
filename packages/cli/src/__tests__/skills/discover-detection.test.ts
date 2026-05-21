import { describe, expect, it } from 'vitest';

import {
  runDiscoverDetectionFixture,
  type TranscriptFixture,
} from './split-flow-fixtures';

const baseChildren = [
  {
    slug: 'workflow-foundation',
    description: 'Shared workflow foundation',
    inheritedContext: 'Discovery captured shared workflow context.',
    foundation: true,
  },
  {
    slug: 'docs-followup',
    description: 'Docs follow-up',
    inheritedContext: 'Discovery captured docs rollout context.',
    knownDependencies: ['workflow-foundation'],
  },
];

function fixtureFor(
  transcript: TranscriptFixture['transcript'],
): TranscriptFixture {
  return {
    transcript,
    parentSlug: 'broad-discovery',
    discoveryPath: '.oat/projects/shared/broad-discovery',
    children: baseChildren,
    inheritedContext: 'Shared parent context from discovery.',
    integrationSketch: 'Foundation ships before docs follow-up.',
  };
}

describe('oat-project-discover transcript split detection hook', () => {
  it('uses high-confidence wording when the transcript fires both load-bearing signals', () => {
    const outcome = runDiscoverDetectionFixture(
      fixtureFor([
        {
          speaker: 'user',
          text: 'This has two independently shippable tracks.',
        },
        {
          speaker: 'assistant',
          text: 'The tracks have no shared design surface.',
        },
      ]),
      { 'discover-split-offer': 'broad-first' },
    );

    expect(outcome.confidence).toBe('high');
    expect(outcome.triggered).toBe(true);
    expect(outcome.decision).toBe('broad-first');
    expect(outcome.asked).toHaveLength(1);
    expect(outcome.asked[0]).toMatchObject({
      id: 'discover-split-offer',
      response: 'broad-first',
    });
    expect(outcome.asked[0]?.prompt).toContain(
      'looks like multiple independent projects',
    );
    expect(outcome.payload).toBeUndefined();
  });

  it('uses soft wording when the transcript fires non-load-bearing signals', () => {
    const outcome = runDiscoverDetectionFixture(
      fixtureFor([
        {
          speaker: 'user',
          text: 'Reviewers will probably expect separate PRs.',
        },
        {
          speaker: 'assistant',
          text: 'The work spans distinct subsystems in different packages.',
        },
      ]),
      { 'discover-split-offer': 'keep-one-project' },
    );

    expect(outcome.confidence).toBe('soft');
    expect(outcome.triggered).toBe(true);
    expect(outcome.decision).toBe('keep-one-project');
    expect(outcome.asked[0]?.prompt).toContain('may be multiple projects');
    expect(outcome.payload).toBeUndefined();
  });

  it('does not ask for a split decision below the signal threshold', () => {
    const outcome = runDiscoverDetectionFixture(
      fixtureFor([
        {
          speaker: 'user',
          text: 'This touches a distinct subsystem, but the rest is one workflow.',
        },
      ]),
      {},
    );

    expect(outcome.confidence).toBe('below');
    expect(outcome.triggered).toBe(false);
    expect(outcome.asked).toEqual([]);
    expect(outcome.payload).toBeUndefined();
    expect(outcome.document).toBeUndefined();
  });

  it('turns a stubbed split response into a detected mid-stream SplitPlanDocument', () => {
    const outcome = runDiscoverDetectionFixture(
      fixtureFor([
        {
          speaker: 'user',
          text: 'The workflow foundation and docs rollout can ship independently.',
        },
        {
          speaker: 'assistant',
          text: 'They have no shared design surface and should become separate PRs.',
        },
      ]),
      { 'discover-split-offer': 'split-now' },
    );

    expect(outcome.decision).toBe('split-now');
    expect(outcome.payload).toMatchObject({
      origin: 'detected-mid-stream',
      interactive: true,
      priorDiscovery: {
        path: '.oat/projects/shared/broad-discovery',
      },
    });
    expect(
      outcome.payload?.inferredChildren?.map((child) => child.slug),
    ).toEqual(['workflow-foundation', 'docs-followup']);
    expect(outcome.document).toMatchObject({
      origin: 'detected-mid-stream',
      interactive: true,
      plan: {
        parentSlug: 'broad-discovery',
        foundationChild: 'workflow-foundation',
        initialActiveChild: 'workflow-foundation',
        integrationSketch: 'Foundation ships before docs follow-up.',
      },
    });
    expect(outcome.document?.plan.children.map((child) => child.slug)).toEqual([
      'workflow-foundation',
      'docs-followup',
    ]);
  });
});
