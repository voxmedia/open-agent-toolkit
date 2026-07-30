import type {
  JsonValue,
  ReviewCliEnvelope,
  ReviewErrorCategory,
  ReviewInvocation,
  ReviewProgress,
  ReviewSink,
} from '@review/index';
import { describe, expect, it } from 'vitest';

describe('common review contracts', () => {
  it('accepts exact success and error envelopes', () => {
    const success = {
      ok: true,
      result: { phase: 'evidence_started' },
    } satisfies ReviewCliEnvelope<{ phase: ReviewProgress }>;
    const failure = {
      ok: false,
      error: {
        category: 'validation',
        code: 'invalid-plan',
        message: 'The plan is invalid.',
        details: { pointers: ['/lanes/0'] },
      },
    } satisfies ReviewCliEnvelope<JsonValue>;

    expect(success.result.phase).toBe('evidence_started');
    expect(failure.error.code).toBe('invalid-plan');
  });

  it('pins invocation, sink, progress, and error-category unions', () => {
    const invocations: ReviewInvocation[] = ['manual', 'auto', 'gate'];
    const sinks: ReviewSink[] = ['artifact', 'structured'];
    const progress: ReviewProgress[] = [
      'prepared',
      'artifacts_loaded',
      'plan_validated',
      'evidence_started',
      'accounting_repair',
      'accepted',
      'terminal',
    ];
    const categories: ReviewErrorCategory[] = [
      'input',
      'contract',
      'validation',
      'system',
    ];

    expect({ invocations, sinks, progress, categories }).toEqual({
      invocations: ['manual', 'auto', 'gate'],
      sinks: ['artifact', 'structured'],
      progress: [
        'prepared',
        'artifacts_loaded',
        'plan_validated',
        'evidence_started',
        'accounting_repair',
        'accepted',
        'terminal',
      ],
      categories: ['input', 'contract', 'validation', 'system'],
    });
  });
});
