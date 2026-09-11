---
id: DR-260911-use-session-local-recon
title: Use session-local recon approval
date: 2026-09-11
status: accepted
legacy_id: null
---

# Use session-local recon approval

## Context

Recon currently persists an approval fingerprint across packet changes and supports legacy manifest v1, but the operator does not require backward compatibility and wants the smallest approval contract that preserves explicit consent and exact launch targeting.

## Decision

Keep the approval flow as proposal → explicit user approval → immediate exact
launch. Persist only `{ type: "explicit-user-approval", approvedAt }` in the
manifest. Approval is valid only in the same uninterrupted controller flow that
presented the proposal. A resume, reload, or any proposal change before launch
removes approval, returns the run to `awaiting-approval`, and requires a fresh
preview and approval.

Immediately before each launch, compare the constructed provider-native target
with the current wave's exact proposed target. Reject mismatches. Do not add a
fingerprint, receipt chain, or other controller-authored proof of approval
integrity. Accept only packet-manifest schema version 2; evidence artifact kinds
remain independently versioned and may continue at version 1.

## Consequences

The approval implementation and tests become substantially smaller, and the
packet does not imply that persisted controller data independently proves what a
user saw. Approval cannot be carried across an interrupted session or reused
after edits. Controllers must keep proposal, approval, and launch adjacent and
must reapprove any changed or resumed run.

This supersedes only the fingerprint and legacy-manifest compatibility clauses
in `DR-260904-remove-dispatch-receipt-chain` and
`DR-260910-restore-economical-recon`; their receipt-removal, economical per-wave
routing, exact-target, and caller-owned judgment decisions remain in force.
