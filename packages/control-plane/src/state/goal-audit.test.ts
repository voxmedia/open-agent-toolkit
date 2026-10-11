import { describe, expect, it } from 'vitest';

import { parseBriefOutcomes, validateGoalOutcomeAudit } from './goal-audit';
import { parseTaskProgress } from './tasks';

const PLAN = `# Project Brief: demo

## Outcomes

<!-- Number each outcome. -->

1. **Readers expose membership** — Evidence: reader tests
2. **Router routes goal milestones** — Evidence: router
   tests through the real readers

\`\`\`markdown
3. **Not an outcome** — inside a fence
\`\`\`

## Phase p01: Research

**Intent:** Learn.
**Exit evidence:** Notes.

## Phase p02: Build

**Intent:** Build.
**Exit evidence:** Tests.

## Phase p03: Later

**Intent:** Later.
**Exit evidence:** Later.
**Provisional:** yes

## Phase p-rev1: Correct p01

**Intent:** Fix.
**Exit evidence:** Fixed.
`;

const JOURNAL = `## Phase p01: Research

**Status:** completed

## Phase p02: Build

**Status:** extracted
**Extracted to:** build-child

## Phase p-rev1: Correct p01

**Status:** completed
`;

const OUTCOME_1 = '**Readers expose membership** — Evidence: reader tests';
const OUTCOME_2 =
  '**Router routes goal milestones** — Evidence: router tests through the real readers';

function inventory(journal = JOURNAL) {
  return parseTaskProgress(PLAN, journal, {
    phaseUnits: true,
    extractedUnits: true,
  }).phases;
}

function validAudit(): Record<string, unknown> {
  return {
    disposition: 'met_with_deferrals',
    decided_at: '2026-10-11T12:00:00Z',
    declaration_ref: 'project-log.md#declaration',
    brief_identity: 'plan.md@abc1234',
    phases: {
      p01: { disposition: 'accepted', reason: null, scope_decision_ref: null },
      p02: { disposition: 'extracted', reason: null, scope_decision_ref: null },
      p03: {
        disposition: 'deferred',
        reason: 'Out of budget for this goal',
        scope_decision_ref: 'decisions/DR-1',
      },
      'p-rev1': {
        disposition: 'accepted',
        reason: null,
        scope_decision_ref: null,
      },
    },
    outcomes: {
      1: {
        disposition: 'met',
        evidence_or_ref: 'reader tests',
        text: OUTCOME_1,
      },
      2: {
        disposition: 'extracted',
        evidence_or_ref: 'build-child',
        text: OUTCOME_2,
      },
    },
  };
}

function codes(audit: unknown, phases = inventory()) {
  return validateGoalOutcomeAudit(
    audit,
    phases,
    parseBriefOutcomes(PLAN),
  ).errors.map((error) => error.code);
}

describe('parseBriefOutcomes', () => {
  it('reads numbered outcomes with continuation lines, ignoring fences and comments', () => {
    expect(parseBriefOutcomes(PLAN)).toEqual([
      { number: '1', text: OUTCOME_1 },
      { number: '2', text: OUTCOME_2 },
    ]);
  });
});

describe('validateGoalOutcomeAudit', () => {
  it('accepts an exhaustive met_with_deferrals audit without fabricating phase completion', () => {
    const phases = inventory();
    const result = validateGoalOutcomeAudit(
      validAudit(),
      phases,
      parseBriefOutcomes(PLAN),
    );
    expect(result).toMatchObject({ valid: true, errors: [] });
    expect(result.audit?.phases.p03).toEqual({
      disposition: 'deferred',
      reason: 'Out of budget for this goal',
      scope_decision_ref: 'decisions/DR-1',
    });
    // The deferred provisional phase stays historically incomplete.
    expect(phases.find((phase) => phase.phaseId === 'p03')).toMatchObject({
      completed: 0,
      provisional: true,
    });
  });

  it('refuses a missing or malformed audit', () => {
    expect(codes(null)).toEqual(['audit-missing']);
    expect(codes(['met'])).toEqual(['audit-malformed']);
  });

  it('refuses missing declaration fields and an invalid disposition', () => {
    const audit = validAudit();
    audit.disposition = 'done';
    delete audit.declaration_ref;
    expect(codes(audit)).toEqual([
      'audit-disposition-invalid',
      'audit-field-missing',
    ]);
  });

  it('refuses an omitted phase, including a revision phase', () => {
    const audit = validAudit();
    delete (audit.phases as Record<string, unknown>)['p-rev1'];
    expect(codes(audit)).toEqual(['audit-phase-omitted']);
  });

  it('refuses unknown and duplicate phase references', () => {
    const audit = validAudit();
    const phases = audit.phases as Record<string, unknown>;
    phases.p09 = { disposition: 'accepted' };
    phases.p1 = { disposition: 'accepted' };
    expect(codes(audit)).toEqual([
      'audit-phase-unknown',
      'audit-phase-duplicate',
    ]);
  });

  it('refuses provisional work claimed accepted', () => {
    const audit = validAudit();
    (audit.phases as Record<string, unknown>).p03 = {
      disposition: 'accepted',
      reason: null,
      scope_decision_ref: null,
    };
    expect(codes(audit)).toEqual(['audit-phase-not-accepted']);
  });

  it('refuses a deferral without a reason or scope decision', () => {
    const audit = validAudit();
    (audit.phases as Record<string, unknown>).p03 = {
      disposition: 'retired',
      reason: 'Dropped',
      scope_decision_ref: null,
    };
    expect(codes(audit)).toEqual(['audit-deferral-reason-missing']);
  });

  it('refuses contradictory extraction claims in both directions', () => {
    const notExtracted = validAudit();
    (notExtracted.phases as Record<string, unknown>).p01 = {
      disposition: 'extracted',
    };
    expect(codes(notExtracted)).toEqual(['audit-phase-not-extracted']);

    const extractedAsAccepted = validAudit();
    (extractedAsAccepted.phases as Record<string, unknown>).p02 = {
      disposition: 'accepted',
    };
    expect(codes(extractedAsAccepted)).toEqual(['audit-phase-contradictory']);

    // An extracted marker without its target reads as pending, so an
    // "extracted" claim no longer holds.
    const withoutTarget = JOURNAL.replace(
      '**Extracted to:** build-child\n',
      '',
    );
    expect(codes(validAudit(), inventory(withoutTarget))).toEqual([
      'audit-phase-not-extracted',
    ]);
  });

  it('refuses an accepted phase claimed deferred', () => {
    const audit = validAudit();
    (audit.phases as Record<string, unknown>).p01 = {
      disposition: 'deferred',
      reason: 'Changed our mind',
      scope_decision_ref: 'decisions/DR-2',
    };
    expect(codes(audit)).toEqual(['audit-phase-contradictory']);
  });

  it('refuses omitted, unknown, renumbered and rewritten outcomes', () => {
    const omitted = validAudit();
    delete (omitted.outcomes as Record<string, unknown>)[2];
    expect(codes(omitted)).toEqual(['audit-outcome-omitted']);

    const renumbered = validAudit();
    const outcomes = renumbered.outcomes as Record<string, unknown>;
    outcomes[3] = outcomes[2];
    delete outcomes[2];
    expect(codes(renumbered)).toEqual([
      'audit-outcome-unknown',
      'audit-outcome-omitted',
    ]);

    const rewritten = validAudit();
    (rewritten.outcomes as Record<string, Record<string, unknown>>)[1]!.text =
      '**Readers expose something else** — Evidence: reader tests';
    expect(codes(rewritten)).toEqual(['audit-outcome-text-changed']);
  });

  it('refuses an outcome without evidence or a valid disposition', () => {
    const audit = validAudit();
    const outcomes = audit.outcomes as Record<string, Record<string, unknown>>;
    outcomes[1]!.evidence_or_ref = '';
    outcomes[2]!.disposition = 'partly';
    expect(codes(audit)).toEqual([
      'audit-outcome-evidence-missing',
      'audit-outcome-disposition-invalid',
    ]);
  });

  it('refuses met while an obligation is deferred', () => {
    const audit = validAudit();
    audit.disposition = 'met';
    expect(codes(audit)).toEqual(['audit-met-with-deferrals']);
  });
});
