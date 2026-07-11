import type { DispatchMatrixCellRef } from '@config/dispatch-matrix';

import {
  normalizeMatrixCellAvailability,
  probeCursorSubagentModel,
  resolveCursorModelCatalog,
  validateMatrixCell,
  type CursorCatalogResult,
  type CursorTaskProbeResult,
  type MatrixCellAvailability,
  type ValidateMatrixCellOptions,
} from './availability';

export type DispatchValidationEvidence =
  | 'task-probe'
  | 'subagent-allow-list'
  | 'catalog-only'
  | 'none';

export interface DispatchMatrixValidationResult {
  ref: DispatchMatrixCellRef;
  status: MatrixCellAvailability;
  evidence: DispatchValidationEvidence;
  catalogPresence: boolean | null;
  diagnostic: string;
}

export interface DispatchValidationPassOptions extends Omit<
  ValidateMatrixCellOptions,
  'detailed' | 'target'
> {
  validateMatrixCell?: typeof validateMatrixCell;
  probeCursorSubagentModel?: typeof probeCursorSubagentModel;
  resolveCursorModelCatalog?: typeof resolveCursorModelCatalog;
}

interface MemoizedCursorTaskProbe {
  result: CursorTaskProbeResult;
  diagnostic: string;
}

export interface DispatchValidationPassContext {
  cursorCatalog: Promise<CursorCatalogResult> | null;
  cursorTaskProbes: Map<string, Promise<MemoizedCursorTaskProbe>>;
  options: DispatchValidationPassOptions;
}

function errorDiagnostic(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function joinDiagnostics(
  ...diagnostics: Array<string | null | undefined>
): string {
  return diagnostics
    .map((diagnostic) => diagnostic?.trim() ?? '')
    .filter((diagnostic) => diagnostic.length > 0)
    .join('\n');
}

function availabilityRef(ref: DispatchMatrixCellRef): {
  provider: string;
  value: string;
  target: DispatchMatrixCellRef['target'];
} | null {
  if (ref.value !== null) {
    return { provider: ref.provider, value: ref.value, target: null };
  }
  if (ref.target === null) {
    return null;
  }

  const value = ref.target.model ?? ref.target.effort;
  if (!value) {
    return null;
  }
  return {
    provider: ref.target.harness ?? ref.provider,
    value,
    target: ref.target,
  };
}

function oracleOptions(
  context: DispatchValidationPassContext,
  target: DispatchMatrixCellRef['target'],
): ValidateMatrixCellOptions {
  return {
    cwd: context.options.cwd,
    ...(context.options.env ? { env: context.options.env } : {}),
    ...(context.options.dependencies
      ? { dependencies: context.options.dependencies }
      : {}),
    detailed: true,
    ...(target ? { target } : {}),
  };
}

function cursorCatalogDiagnostic(value: string, presence: boolean): string {
  return presence
    ? `Cursor's broad model catalog lists '${value}', but subagent Task dispatch could not be validated.`
    : `Cursor's broad model catalog does not list '${value}'.`;
}

function resolveCursorCatalogOnce(
  context: DispatchValidationPassContext,
): Promise<CursorCatalogResult> {
  if (context.cursorCatalog === null) {
    const resolver =
      context.options.resolveCursorModelCatalog ?? resolveCursorModelCatalog;
    context.cursorCatalog = resolver(context.options).catch(
      (error): CursorCatalogResult => ({
        status: 'failed',
        candidates: [],
        sourceCommand: null,
        diagnostic: errorDiagnostic(error),
      }),
    );
  }
  return context.cursorCatalog;
}

function probeCursorCandidateOnce(
  value: string,
  context: DispatchValidationPassContext,
): Promise<MemoizedCursorTaskProbe> {
  const cached = context.cursorTaskProbes.get(value);
  if (cached) {
    return cached;
  }

  const probe =
    context.options.probeCursorSubagentModel ?? probeCursorSubagentModel;
  const pending = probe(value, context.options)
    .then((result) => ({ result, diagnostic: '' }))
    .catch(
      (error): MemoizedCursorTaskProbe => ({
        result: {
          availability: 'unvalidated',
          decisive: false,
          evidence: 'none',
        },
        diagnostic: errorDiagnostic(error),
      }),
    );
  context.cursorTaskProbes.set(value, pending);
  return pending;
}

async function validateCursorRef(
  ref: DispatchMatrixCellRef,
  value: string,
  context: DispatchValidationPassContext,
): Promise<DispatchMatrixValidationResult> {
  const taskProbe = await probeCursorCandidateOnce(value, context);
  if (taskProbe.result.decisive) {
    return {
      ref,
      status: taskProbe.result.availability,
      evidence: taskProbe.result.evidence,
      catalogPresence: null,
      diagnostic: joinDiagnostics(
        taskProbe.diagnostic,
        taskProbe.result.message,
      ),
    };
  }

  const catalog = await resolveCursorCatalogOnce(context);
  if (catalog.status === 'resolved') {
    const catalogPresence = catalog.candidates.includes(value);
    return {
      ref,
      status: catalogPresence ? 'unvalidated' : 'unknown-value',
      evidence: 'catalog-only',
      catalogPresence,
      diagnostic: joinDiagnostics(
        taskProbe.diagnostic,
        cursorCatalogDiagnostic(value, catalogPresence),
      ),
    };
  }

  return {
    ref,
    status: 'unvalidated',
    evidence: 'none',
    catalogPresence: null,
    diagnostic: joinDiagnostics(taskProbe.diagnostic, catalog.diagnostic),
  };
}

async function validateRef(
  ref: DispatchMatrixCellRef,
  context: DispatchValidationPassContext,
): Promise<DispatchMatrixValidationResult> {
  const candidate = availabilityRef(ref);
  if (candidate === null) {
    return {
      ref,
      status: 'unvalidated',
      evidence: 'none',
      catalogPresence: null,
      diagnostic: 'No dispatch candidate value is available for validation.',
    };
  }

  if (candidate.provider.trim().toLowerCase() === 'cursor') {
    return validateCursorRef(ref, candidate.value, context);
  }

  const validator = context.options.validateMatrixCell ?? validateMatrixCell;
  try {
    const result = normalizeMatrixCellAvailability(
      await validator(
        candidate.provider,
        candidate.value,
        oracleOptions(context, candidate.target),
      ),
    );
    return {
      ref,
      status: result.availability,
      evidence: 'none',
      catalogPresence: null,
      diagnostic: result.message ?? '',
    };
  } catch (error) {
    return {
      ref,
      status: 'unvalidated',
      evidence: 'none',
      catalogPresence: null,
      diagnostic: errorDiagnostic(error),
    };
  }
}

export function createDispatchValidationPassContext(
  options: DispatchValidationPassOptions = { cwd: process.cwd() },
): DispatchValidationPassContext {
  return {
    cursorCatalog: null,
    cursorTaskProbes: new Map(),
    options,
  };
}

export async function validateDispatchMatrixRefs(
  refs: DispatchMatrixCellRef[],
  context: DispatchValidationPassContext,
): Promise<DispatchMatrixValidationResult[]> {
  return Promise.all(refs.map((ref) => validateRef(ref, context)));
}
