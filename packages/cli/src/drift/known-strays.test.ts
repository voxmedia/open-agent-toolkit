import { describe, expect, it } from 'vitest';

import type { DriftReport } from './drift.types';
import { filterKnownStrays } from './known-strays';

interface TestCandidate {
  provider: string;
  report: DriftReport;
}

function stray(providerPath: string, provider = 'cursor'): DriftReport {
  return {
    canonical: null,
    provider,
    providerPath,
    state: { status: 'stray' },
  };
}

function candidate(report: DriftReport): TestCandidate {
  return {
    provider: report.provider,
    report,
  };
}

describe('filterKnownStrays', () => {
  it('merges project and user known strays', () => {
    const projectStray = stray('.cursor/skills/cloud-environment-setup');
    const userStray = stray('.claude/skills/local-only', 'claude');
    const unknownStray = stray('.cursor/skills/actionable');

    const result = filterKnownStrays({
      reports: [projectStray, userStray, unknownStray],
      candidates: [
        candidate(projectStray),
        candidate(userStray),
        candidate(unknownStray),
      ],
      knownStrays: {
        project: ['.cursor/skills/cloud-environment-setup'],
        user: ['.claude/skills/local-only'],
      },
    });

    expect(result.reports).toEqual([unknownStray]);
    expect(result.candidates).toEqual([candidate(unknownStray)]);
  });

  it('suppresses exact normalized provider-path matches', () => {
    const knownStray = stray('.cursor/skills/cloud-environment-setup');
    const result = filterKnownStrays({
      reports: [knownStray],
      candidates: [candidate(knownStray)],
      knownStrays: {
        project: ['./.cursor\\skills\\cloud-environment-setup/'],
      },
    });

    expect(result.reports).toEqual([]);
    expect(result.candidates).toEqual([]);
  });

  it('does not suppress sibling paths', () => {
    const siblingStray = stray('.cursor/skills/cloud-environment-setup-extra');
    const result = filterKnownStrays({
      reports: [siblingStray],
      candidates: [candidate(siblingStray)],
      knownStrays: {
        project: ['.cursor/skills/cloud-environment-setup'],
      },
    });

    expect(result.reports).toEqual([siblingStray]);
    expect(result.candidates).toEqual([candidate(siblingStray)]);
  });

  it('handles empty or missing config as no suppressions', () => {
    const report = stray('.cursor/skills/actionable');

    expect(
      filterKnownStrays({
        reports: [report],
        candidates: [candidate(report)],
      }),
    ).toEqual({
      reports: [report],
      candidates: [candidate(report)],
    });

    expect(
      filterKnownStrays({
        reports: [report],
        candidates: [candidate(report)],
        knownStrays: {},
      }),
    ).toEqual({
      reports: [report],
      candidates: [candidate(report)],
    });
  });
});
