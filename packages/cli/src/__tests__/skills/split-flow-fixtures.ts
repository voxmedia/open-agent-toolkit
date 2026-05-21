import {
  buildSplitPlanDocument,
  type SplitChildInput,
  type SplitPayload,
  type SplitPlanDocument,
} from '../../projects/split/child-plan';
import { evaluateSignals, type Signal } from '../../projects/split/signals';

export type TranscriptSpeaker = 'assistant' | 'user';

export interface TranscriptTurn {
  speaker: TranscriptSpeaker;
  text: string;
}

export type StubbedUserChoice =
  | 'broad-first'
  | 'children-known'
  | 'decompose-children'
  | 'inline-only'
  | 'keep-one-project'
  | 'promote-n-projects'
  | 'split-now';

export interface StubbedQuestion {
  id: string;
  prompt: string;
  options: string[];
  response: StubbedUserChoice;
}

export interface TranscriptFixture {
  transcript: TranscriptTurn[];
  parentSlug: string;
  children: SplitChildInput[];
  discoveryPath?: string;
  inheritedContext?: string;
  integrationSketch?: string;
}

export const SPLIT_HANDOFF_TARGET = {
  skill: 'oat-project-split',
  hookCreatesProjects: false,
  responsibilities: [
    'normalize-split-plan',
    'write-coordination-parent',
    'scaffold-children',
    'activate-initial-child',
  ],
} as const;

class AskUserQuestionStub {
  readonly asked: StubbedQuestion[] = [];

  constructor(private readonly responses: Record<string, StubbedUserChoice>) {}

  ask(id: string, prompt: string, options: string[]): StubbedUserChoice {
    const response = this.responses[id];
    if (!response) {
      throw new Error(`Missing stubbed response for AskUserQuestion ${id}`);
    }

    this.asked.push({ id, prompt, options, response });
    return response;
  }
}

function transcriptText(transcript: TranscriptTurn[]): string {
  return transcript.map((turn) => `${turn.speaker}: ${turn.text}`).join('\n');
}

export function inferSplitSignals(transcript: TranscriptTurn[]): Signal[] {
  const text = transcriptText(transcript).toLowerCase();
  const signals = new Set<Signal>();

  if (
    text.includes('independently shippable') ||
    text.includes('ship independently')
  ) {
    signals.add('independently-shippable');
  }

  if (
    text.includes('no shared design surface') ||
    text.includes('separate design surfaces')
  ) {
    signals.add('no-shared-design-surface');
  }

  if (text.includes('separate pr') || text.includes('separate pull request')) {
    signals.add('expect-separate-prs');
  }

  if (
    text.includes('distinct subsystem') ||
    text.includes('different package') ||
    text.includes('different packages')
  ) {
    signals.add('distinct-subsystems');
  }

  return [...signals];
}

export function runDiscoverDetectionFixture(
  fixture: TranscriptFixture,
  responses: Record<string, StubbedUserChoice>,
): {
  asked: StubbedQuestion[];
  confidence: 'below' | 'high' | 'soft';
  decision?: StubbedUserChoice;
  document?: SplitPlanDocument;
  payload?: SplitPayload;
  triggered: boolean;
} {
  const evaluation = evaluateSignals({
    fired: inferSplitSignals(fixture.transcript),
  });
  const askUser = new AskUserQuestionStub(responses);

  if (!evaluation.triggered) {
    return {
      asked: askUser.asked,
      confidence: evaluation.confidence,
      triggered: false,
    };
  }

  const prompt =
    evaluation.confidence === 'high'
      ? 'This looks like multiple independent projects. Split now, do one round of broad cross-cutting discovery first, or keep this as one project?'
      : 'This may be multiple projects. Split, do one round of broad cross-cutting discovery first, or keep it as one project?';
  const decision = askUser.ask('discover-split-offer', prompt, [
    'split-now',
    'broad-first',
    'keep-one-project',
  ]);

  if (decision !== 'split-now') {
    return {
      asked: askUser.asked,
      confidence: evaluation.confidence,
      decision,
      triggered: true,
    };
  }

  const payload: SplitPayload = {
    origin: 'detected-mid-stream',
    interactive: true,
    inferredChildren: fixture.children,
    priorDiscovery: {
      path:
        fixture.discoveryPath ?? `.oat/projects/shared/${fixture.parentSlug}`,
      inheritedContext: fixture.inheritedContext,
      integrationSketch: fixture.integrationSketch,
    },
  };

  return {
    asked: askUser.asked,
    confidence: evaluation.confidence,
    decision,
    document: buildSplitPlanDocument(payload),
    payload,
    triggered: true,
  };
}

export function runDeclaredBrainstormFixture(
  fixture: TranscriptFixture,
  responses: Record<string, StubbedUserChoice>,
): {
  asked: StubbedQuestion[];
  document?: SplitPlanDocument;
  handoffTarget: typeof SPLIT_HANDOFF_TARGET;
  payload?: SplitPayload;
} {
  const text = transcriptText(fixture.transcript).toLowerCase();
  const declared =
    text.includes('multiple projects') ||
    text.includes('umbrella project') ||
    text.includes('several sub-projects');
  if (!declared) {
    return { asked: [], handoffTarget: SPLIT_HANDOFF_TARGET };
  }

  const askUser = new AskUserQuestionStub(responses);
  const decision = askUser.ask(
    'declared-brainstorm-boundary',
    'Do you already know the child projects, or should we decompose the scope together?',
    ['children-known', 'decompose-children'],
  );

  if (decision !== 'children-known') {
    return { asked: askUser.asked, handoffTarget: SPLIT_HANDOFF_TARGET };
  }

  const payload: SplitPayload = {
    origin: 'declared',
    parentSlug: fixture.parentSlug,
    declaredChildren: fixture.children,
    interactive: true,
    integrationSketch: fixture.integrationSketch,
  };

  return {
    asked: askUser.asked,
    document: buildSplitPlanDocument(payload),
    handoffTarget: SPLIT_HANDOFF_TARGET,
    payload,
  };
}

export function runBrainstormPickerFixture(
  fixture: TranscriptFixture,
  responses: Record<string, StubbedUserChoice>,
): {
  asked: StubbedQuestion[];
  document?: SplitPlanDocument;
  handoffTarget: typeof SPLIT_HANDOFF_TARGET;
  options: string[];
  payload?: SplitPayload;
} {
  const evaluation = evaluateSignals({
    fired: inferSplitSignals(fixture.transcript),
  });
  const options = ['inline-only', 'doc-to-path', 'promote-to-new-oat-project'];

  if (evaluation.triggered) {
    options.push('promote-n-projects');
  }

  const askUser = new AskUserQuestionStub(responses);
  const decision = askUser.ask(
    'brainstorm-terminal-state',
    'Where should this brainstorm land?',
    options,
  );

  if (decision !== 'promote-n-projects' || !evaluation.triggered) {
    return {
      asked: askUser.asked,
      handoffTarget: SPLIT_HANDOFF_TARGET,
      options,
    };
  }

  const payload: SplitPayload = {
    origin: 'brainstorm-picker',
    parentSlug: fixture.parentSlug,
    inferredChildren: fixture.children,
    interactive: true,
    priorDiscovery: {
      path: `brainstorm/${fixture.parentSlug}`,
      inheritedContext: fixture.inheritedContext,
      integrationSketch: fixture.integrationSketch,
    },
  };

  return {
    asked: askUser.asked,
    document: buildSplitPlanDocument(payload),
    handoffTarget: SPLIT_HANDOFF_TARGET,
    options,
    payload,
  };
}
