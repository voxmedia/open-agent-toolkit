import { canonicalJson } from './canonical-json.mjs';

const validatedRuns = new WeakSet();

function clone(value) {
  return JSON.parse(canonicalJson(value));
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) {
    return value;
  }
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function normalizePasses(passes) {
  return Object.fromEntries(
    [...passes.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([mode, ids]) => [mode, [...ids].sort()]),
  );
}

export function createValidatedRun({
  packetRoot,
  filesystemIdentities,
  canonicalByteDigests,
  manifest,
  ledger,
  artifactsById,
  exactEvidence,
  passes,
  achievedProfile,
  assuranceReviewIds,
  reconciliationContext,
}) {
  const run = {
    packetRoot,
    filesystemIdentities: [...filesystemIdentities.values()]
      .map((identity) => clone(identity))
      .sort((left, right) => left.path.localeCompare(right.path)),
    canonicalByteDigests: [...canonicalByteDigests.entries()]
      .map(([path, digest]) => ({ path, digest }))
      .sort((left, right) => left.path.localeCompare(right.path)),
    manifest: clone(manifest),
    ledger: clone(ledger),
    artifacts: [...artifactsById.entries()]
      .map(([id, artifact]) => ({
        id,
        reference: clone(artifact.reference),
        value: clone(artifact.value),
      }))
      .sort((left, right) => left.id.localeCompare(right.id)),
    exactEvidenceIds: [...exactEvidence].sort(),
    passes: normalizePasses(passes),
    achievedProfile,
    assuranceReviewIds: [...assuranceReviewIds].sort(),
    terminalReconciliation: reconciliationContext?.reconciliation
      ? clone(reconciliationContext.reconciliation)
      : null,
    priorLedger: reconciliationContext?.priorLedger
      ? clone(reconciliationContext.priorLedger)
      : null,
  };
  deepFreeze(run);
  validatedRuns.add(run);
  return run;
}

export function assertValidatedRun(value) {
  if (!value || !validatedRuns.has(value) || !Object.isFrozen(value)) {
    throw new TypeError('Expected an immutable ValidatedRun');
  }
  return value;
}

export function isValidatedRun(value) {
  return Boolean(value && validatedRuns.has(value) && Object.isFrozen(value));
}
