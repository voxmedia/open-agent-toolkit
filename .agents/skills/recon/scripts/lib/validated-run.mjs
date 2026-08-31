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

function normalizeTopology(topology) {
  return {
    requiredLanes: clone(topology.requiredLanes),
    stages: [...topology.stageByLane.entries()]
      .map(([laneId, stage]) => ({ laneId, stage: clone(stage) }))
      .sort((left, right) => left.laneId.localeCompare(right.laneId)),
    completeArtifactIdsByMode: Object.fromEntries(
      [...topology.completeArtifactIdsByMode.entries()]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([mode, ids]) => [mode, [...ids].sort()]),
    ),
  };
}

export function createValidatedRun({
  packetRoot,
  packetRootIdentity,
  manifest,
  ledger,
  artifactsById,
  exactEvidence,
  topology,
  achievedProfile,
  receiptedReviewIds,
  reconciliationContext,
}) {
  const run = {
    packetRoot,
    packetRootIdentity: clone(packetRootIdentity),
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
    topology: normalizeTopology(topology),
    achievedProfile,
    receiptedReviewIds: [...receiptedReviewIds].sort(),
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
