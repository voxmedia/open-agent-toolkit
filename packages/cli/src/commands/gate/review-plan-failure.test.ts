import { ephemeralValidationStoreAuthority } from '@review/validation-store-authority';
import { describe, expect, it, vi } from 'vitest';

import {
  createReviewPlanFailureStore,
  resolveReviewPlanFailure,
} from './review-plan-failure';

describe('review plan failure translation', () => {
  it('constructs the resolver store with explicit authority', () => {
    const root = vi.fn(() => '/private/launcher-validation');
    const authority = vi.fn(() => ephemeralValidationStoreAuthority());

    const store = createReviewPlanFailureStore({ root, authority });

    expect(root).toHaveBeenCalledOnce();
    expect(authority).toHaveBeenCalledOnce();
    expect(store.root).toBe('/private/launcher-validation');
  });

  it('translates an exact accounting-invalid receipt and retains diagnostics', async () => {
    const receipt = {
      schemaVersion: 1 as const,
      gateRunId: 'gate-run',
      launchAttemptId: 'launch-attempt',
      validationRunId: 'validation-run',
      validationAttempts: 3,
      repairAttempts: 2,
    };
    const store = {
      resolveAccountingInvalidTerminal: vi.fn(async () => receipt),
      retainTerminalDiagnostic: vi.fn(
        async () => '/private/diagnostic-receipt.json',
      ),
    };

    await expect(
      resolveReviewPlanFailure(
        {
          gateRunId: receipt.gateRunId,
          launchAttemptId: receipt.launchAttemptId,
        },
        store,
      ),
    ).resolves.toEqual({
      status: 'review_failed',
      failure: {
        kind: 'review_complete_accounting_invalid',
        gateRunId: 'gate-run',
        launchAttemptId: 'launch-attempt',
        validationRunId: 'validation-run',
        validationAttempts: 3,
        repairAttempts: 2,
        diagnosticPath: '/private/diagnostic-receipt.json',
      },
      artifactPath: null,
      receiveEligible: false,
      handoff: null,
    });
    expect(store.resolveAccountingInvalidTerminal).toHaveBeenCalledWith(
      'gate-run',
      'launch-attempt',
    );
    expect(store.retainTerminalDiagnostic).toHaveBeenCalledWith(receipt);
  });

  it('preserves existing terminal handling when the exact receipt is absent', async () => {
    const error = Object.assign(new Error('missing'), { code: 'ENOENT' });
    const store = {
      resolveAccountingInvalidTerminal: vi.fn(async () => {
        throw error;
      }),
      retainTerminalDiagnostic: vi.fn(),
    };

    await expect(
      resolveReviewPlanFailure(
        { gateRunId: 'gate-run', launchAttemptId: 'launch-attempt' },
        store,
      ),
    ).resolves.toBeNull();
    expect(store.retainTerminalDiagnostic).not.toHaveBeenCalled();
  });

  it('rejects unsafe or mismatched terminal receipts', async () => {
    const store = {
      resolveAccountingInvalidTerminal: vi.fn(async () => {
        throw new Error('accounting-invalid terminal receipt is invalid');
      }),
      retainTerminalDiagnostic: vi.fn(),
    };

    await expect(
      resolveReviewPlanFailure(
        { gateRunId: 'gate-run', launchAttemptId: 'wrong-attempt' },
        store,
      ),
    ).rejects.toThrow(/terminal receipt is invalid/);
    expect(store.retainTerminalDiagnostic).not.toHaveBeenCalled();
  });
});
