import {
  type AccountingInvalidTerminalReceipt,
  ValidationStore,
} from '@review/validation-store';
import {
  launcherValidationStoreAuthority,
  launcherValidationStoreRoot,
  type ValidationStoreAuthority,
} from '@review/validation-store-authority';

export interface ReviewAccountingInvalidFailure {
  status: 'review_failed';
  failure: {
    kind: 'review_complete_accounting_invalid';
    gateRunId: string;
    launchAttemptId: string;
    validationRunId: string;
    validationAttempts: number;
    repairAttempts: number;
    diagnosticPath: string;
  };
  artifactPath: null;
  receiveEligible: false;
  handoff: null;
}

interface AccountingInvalidTerminalStore {
  resolveAccountingInvalidTerminal: (
    gateRunId: string,
    launchAttemptId: string,
  ) => Promise<AccountingInvalidTerminalReceipt>;
  retainTerminalDiagnostic: (
    receipt: AccountingInvalidTerminalReceipt,
  ) => Promise<string>;
}

function isMissingTerminalReceipt(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'ENOENT'
  );
}

export function createReviewPlanFailureStore(
  dependencies: {
    root: () => string;
    authority: () => ValidationStoreAuthority;
  } = {
    root: launcherValidationStoreRoot,
    authority: launcherValidationStoreAuthority,
  },
): ValidationStore {
  return new ValidationStore(dependencies.root(), dependencies.authority());
}

export async function resolveReviewPlanFailure(
  input: { gateRunId: string; launchAttemptId: string },
  store: AccountingInvalidTerminalStore = createReviewPlanFailureStore(),
): Promise<ReviewAccountingInvalidFailure | null> {
  let receipt: AccountingInvalidTerminalReceipt;
  try {
    receipt = await store.resolveAccountingInvalidTerminal(
      input.gateRunId,
      input.launchAttemptId,
    );
  } catch (error) {
    if (isMissingTerminalReceipt(error)) return null;
    throw error;
  }
  const diagnosticPath = await store.retainTerminalDiagnostic(receipt);
  return {
    status: 'review_failed',
    failure: {
      kind: 'review_complete_accounting_invalid',
      gateRunId: receipt.gateRunId,
      launchAttemptId: receipt.launchAttemptId,
      validationRunId: receipt.validationRunId,
      validationAttempts: receipt.validationAttempts,
      repairAttempts: receipt.repairAttempts,
      diagnosticPath,
    },
    artifactPath: null,
    receiveEligible: false,
    handoff: null,
  };
}
