import { describe, expect, it } from 'vitest';

import {
  selectHostExecution,
  type HostCapabilityEvidence,
} from './host-execution';

const base: HostCapabilityEvidence = {
  provider: 'linear',
  context: { workspaceId: 'workspace-1', teamId: 'team-1' },
  surfaceKind: 'connector',
  availability: 'available',
  semanticCapabilities: ['read', 'update'],
  evidenceDigest: 'sha256:evidence',
  observedAt: '2026-08-31T12:00:00.000Z',
};

const select = (candidates: HostCapabilityEvidence[], attemptStarted = false) =>
  selectHostExecution({
    provider: 'linear',
    context: base.context,
    operation: 'update',
    candidates,
    attemptStarted,
  });

describe('selectHostExecution', () => {
  it('prefers a live connector and permits configured CLI fallback before an attempt', () => {
    const fallback = { ...base, surfaceKind: 'configured-cli' as const };
    expect(select([fallback])).toEqual({
      selected: true,
      evidence: fallback,
      fallbackUsed: true,
    });
    expect(select([fallback, base])).toEqual({
      selected: true,
      evidence: base,
      fallbackUsed: false,
    });
  });

  it.each([
    [[], 'unavailable'],
    [
      [{ ...base, availability: 'authorization-required' as const }],
      'authorization-required',
    ],
    [[{ ...base, context: { workspaceId: 'other' } }], 'context-mismatch'],
    [
      [{ ...base, semanticCapabilities: ['read' as const] }],
      'capability-missing',
    ],
    [[{ ...base, availability: 'disabled' as const }], 'disabled'],
  ])('fails closed for bounded evidence %#', (candidates, reason) => {
    expect(select(candidates as HostCapabilityEvidence[])).toEqual({
      selected: false,
      reason,
    });
  });

  it('pins execution after the first attempt', () => {
    expect(select([base], true)).toEqual({
      selected: false,
      reason: 'attempt-started',
    });
  });
});
