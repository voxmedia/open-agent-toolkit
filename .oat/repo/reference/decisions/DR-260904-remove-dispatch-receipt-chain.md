---
id: DR-260904-remove-dispatch-receipt-chain
title: Remove dispatch receipt chain from recon packet validation
date: 2026-09-04
status: accepted
legacy_id: null
---

# Remove dispatch receipt chain from recon packet validation

## Context

The recon packet validator required prepared, approved, accepted, and completed dispatch receipts, a catalog recheck, and typed stage records. Those records were specified only in prose added to oat-dispatch-subagents by the recon PR (#248) and had no producer in any live launcher; the sole emitter was the test fixture. Every real run failed publication (Ghostex standard run, 2026-09-04) after completing all worker and review artifacts. A complexity review on 2026-09-04 found the mechanism unsupported by the discovery contract and self-attested by the controller that writes the manifest.

## Decision

Remove the receipt chain and stage topology from the recon packet contract and revert the prepare/execute operations and approval-bound prepared record from oat-dispatch-subagents. Keep explicit user approval of one exact provider, model, effort, role, authority, limits, and wave/lane topology as a compact manifest execution envelope bound by a canonical fingerprint. Derive the achieved profile from complete typed same-run artifacts written by approved lanes; honest partials name each missing required pass with a material PASS_FAILED or PASS_OMITTED gap.

## Consequences

Recon publishes on launchers that only spawn workers and return results. The packet still rejects approval-axis drift, unapproved lanes, missing pass outcomes, malformed claim evidence links, and every source, locator, review, and reconciliation invariant. This supersedes DR-260831-canonical-validated-run; DR-260831-approval-bound-homogeneous remains in force. Reintroduce launcher-emitted receipts only when a launcher exists that produces them itself.
