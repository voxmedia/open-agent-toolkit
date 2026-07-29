/**
 * Tests for the Tier-1 `oat-reviewer` structured-output dispatch wrapper
 * (p04-t01). See design.md → Data Models → StructuredFindings and
 * `.agents/agents/oat-reviewer.md` → Structured-Output Mode for the contract
 * this wrapper exercises.
 */

import { describe, expect, it } from 'vitest';

import {
  STRUCTURED_OUTPUT_MODE_FLAG,
  StructuredFindingsError,
  buildDispatchPayload,
  dispatchStructuredReview,
  type Dispatcher,
  type ReviewDispatchContext,
  type StructuredFindings,
} from './reviewer-dispatch';

const HEAD_SHA = 'a1b2c3d4e5f60718293a4b5c6d7e8f9012345678';

function context(
  overrides: Partial<ReviewDispatchContext> = {},
): ReviewDispatchContext {
  return {
    projectPath: '.oat/projects/foo/bar',
    scope: 'p02',
    headSha: HEAD_SHA,
    reviewScopeMetadata:
      '## Review Scope\n\n**Project:** .oat/projects/foo/bar',
    postedBodySchemaRef: 'design.md → Data Models → Posted-review-body',
    narrowing: { kind: 'full-scope-fallback', reason: 'no-prior-review' },
    ...overrides,
  };
}

function wellFormedFindings(): StructuredFindings {
  return {
    summary: 'Reviewed the p02 phase. One important robustness gap found.',
    findings: [
      {
        id: 'I1',
        severity: 'important',
        title: 'Missing error handling on checkout failure',
        file: 'src/foo.ts',
        line: 42,
        body: 'The checkout path does not surface the gh exit code.',
        fix_guidance: 'Capture and report the exit code.',
      },
      {
        id: 'm1',
        severity: 'minor',
        title: 'Stale comment',
        file: null,
        line: null,
        body: 'A comment references the old flag name.',
        fix_guidance: null,
      },
    ],
    verification_commands: ['pnpm test', 'pnpm lint'],
  };
}

/** A dispatcher whose spawn returns a fixed response and records its payload. */
function stubDispatcher(response: unknown): {
  dispatcher: Dispatcher;
  payloads: Record<string, unknown>[];
} {
  const payloads: Record<string, unknown>[] = [];
  const dispatcher: Dispatcher = {
    async spawn(payload) {
      payloads.push(payload);
      return { findings: response };
    },
  };
  return { dispatcher, payloads };
}

describe('buildDispatchPayload', () => {
  it('sets the structured-output mode flag exactly as p03 wired it', () => {
    expect(STRUCTURED_OUTPUT_MODE_FLAG).toBe('oat_output_mode');
    const payload = buildDispatchPayload(context());
    expect(payload[STRUCTURED_OUTPUT_MODE_FLAG]).toBe('structured');
  });

  it('threads the review context into the payload', () => {
    const payload = buildDispatchPayload(
      context({ scope: 'final', projectPath: '.oat/projects/x/y' }),
    );
    expect(payload['oat_project']).toBe('.oat/projects/x/y');
    expect(payload['oat_review_scope']).toBe('final');
    expect(payload['oat_review_head_sha']).toBe(HEAD_SHA);
    expect(payload['review_scope_metadata']).toContain('Review Scope');
    expect(payload['posted_body_schema_ref']).toContain('Posted-review-body');
  });

  it('records the resolved narrowing range when one was chosen', () => {
    const payload = buildDispatchPayload(
      context({
        narrowing: {
          kind: 'narrow-range',
          priorSha: '0'.repeat(40),
          headSha: HEAD_SHA,
        },
      }),
    );
    expect(payload['narrowing_range']).toBe(`${'0'.repeat(40)}..${HEAD_SHA}`);
  });

  it('omits the narrowing range on a full-scope review', () => {
    const payload = buildDispatchPayload(context());
    expect(payload['narrowing_range']).toBeNull();
  });
});

describe('dispatchStructuredReview', () => {
  it('returns well-formed StructuredFindings unchanged', async () => {
    const findings = wellFormedFindings();
    const { dispatcher, payloads } = stubDispatcher(findings);

    const result = await dispatchStructuredReview(context(), dispatcher);

    expect(result).toEqual(findings);
    // The wrapper actually built and forwarded the structured-mode payload.
    expect(payloads).toHaveLength(1);
    expect(payloads[0]?.[STRUCTURED_OUTPUT_MODE_FLAG]).toBe('structured');
  });

  it('surfaces dispatcher errors without retry (Tier 2/3 fallback lives in the skill)', async () => {
    let calls = 0;
    const dispatcher: Dispatcher = {
      async spawn() {
        calls += 1;
        throw new Error('subagent unavailable');
      },
    };

    await expect(
      dispatchStructuredReview(context(), dispatcher),
    ).rejects.toThrow('subagent unavailable');
    // No retry — the wrapper calls spawn exactly once.
    expect(calls).toBe(1);
  });

  it('raises a typed error when findings is not an object', async () => {
    const { dispatcher } = stubDispatcher('not an object');
    await expect(
      dispatchStructuredReview(context(), dispatcher),
    ).rejects.toBeInstanceOf(StructuredFindingsError);
  });

  it('raises a typed error when a finding has an invalid severity', async () => {
    const bad = wellFormedFindings();
    // @ts-expect-error — intentionally invalid severity for the test.
    bad.findings[0]!.severity = 'blocker';
    const { dispatcher } = stubDispatcher(bad);
    await expect(
      dispatchStructuredReview(context(), dispatcher),
    ).rejects.toBeInstanceOf(StructuredFindingsError);
  });

  it('raises a typed error when file/line are not both set or both null', async () => {
    const bad = wellFormedFindings();
    bad.findings[0]!.file = 'src/foo.ts';
    bad.findings[0]!.line = null; // file set, line null → invalid pairing.
    const { dispatcher } = stubDispatcher(bad);
    await expect(
      dispatchStructuredReview(context(), dispatcher),
    ).rejects.toBeInstanceOf(StructuredFindingsError);
  });

  it('raises a typed error when verification_commands is not a string array', async () => {
    const bad = wellFormedFindings();
    // @ts-expect-error — intentionally wrong type for the test.
    bad.verification_commands = 'pnpm test';
    const { dispatcher } = stubDispatcher(bad);
    await expect(
      dispatchStructuredReview(context(), dispatcher),
    ).rejects.toBeInstanceOf(StructuredFindingsError);
  });

  it('raises a typed error when summary is missing', async () => {
    const bad = wellFormedFindings() as Record<string, unknown>;
    delete bad['summary'];
    const { dispatcher } = stubDispatcher(bad);
    await expect(
      dispatchStructuredReview(context(), dispatcher),
    ).rejects.toBeInstanceOf(StructuredFindingsError);
  });

  it('accepts a clean review with zero findings', async () => {
    const clean: StructuredFindings = {
      summary: 'No issues found.',
      findings: [],
      verification_commands: [],
    };
    const { dispatcher } = stubDispatcher(clean);
    const result = await dispatchStructuredReview(context(), dispatcher);
    expect(result.findings).toEqual([]);
  });
});
