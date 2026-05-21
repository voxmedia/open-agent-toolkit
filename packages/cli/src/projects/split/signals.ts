export type Signal =
  | 'independently-shippable'
  | 'no-shared-design-surface'
  | 'expect-separate-prs'
  | 'distinct-subsystems';

export interface SignalEvaluation {
  fired: Signal[];
  triggered: boolean;
  confidence: 'high' | 'soft' | 'below';
}

const LOAD_BEARING: ReadonlySet<Signal> = new Set([
  'independently-shippable',
  'no-shared-design-surface',
]);

export function evaluateSignals(input: { fired: Signal[] }): SignalEvaluation {
  const fired = [...new Set(input.fired)];
  const triggered = fired.length >= 2;
  const loadBearingCount = fired.filter((signal) =>
    LOAD_BEARING.has(signal),
  ).length;

  let confidence: SignalEvaluation['confidence'] = 'below';
  if (triggered) {
    confidence = loadBearingCount === LOAD_BEARING.size ? 'high' : 'soft';
  }

  return {
    fired,
    triggered,
    confidence,
  };
}
