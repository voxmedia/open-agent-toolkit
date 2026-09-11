---
id: DR-260910-restore-economical-recon
title: Restore economical recon routing and caller-owned judgment
date: 2026-09-10
status: accepted
legacy_id: null
---

# Restore economical recon routing and caller-owned judgment

## Context

Issue #274 requires economical per-wave recon without weakening approval or
evidence boundaries. Applying one homogeneous target to every worker makes a
bounded evidence pass inherit the cost and capability of the hardest assignment
in the run. That conflicts with the independent authority and capability axes in
DR-260719-separate-recon-authority-from and obscures the caller-owned judgment
boundary established by DR-260719-keep-final-judgment.

## Decision

Select each recon wave independently from current provider guidance, beginning
with the most economical target and provider-native controls qualified for its
bounded assignment. One explicit user approval binds the complete envelope:
every required, redundant, and conditional wave's exact intended target,
authority, topology, scope, limits, and selection reason.

Keep evidence acquisition, citation checks, counterexample searches, and
mechanical dossier assembly economical when their concrete assignments permit
it. A judgment-bearing assignment may use a stronger approved target without
raising unrelated waves. Conditional escalation must be predeclared with an
exact target, concrete evidence trigger, bounded scope, and finite activation and
execution limits; it cannot become an automatic retry or an unapproved target
substitution.

The calling agent owns decomposition, the approval conversation, evidence
sufficiency, implications, and final conclusions. The packet records approved
intended routing. It may claim constructed invocation, accepted execution, or
observed runtime identity only when the responsible launcher provides that
evidence; controller-authored data is not actual-launch proof.

## Consequences

This decision supersedes DR-260831-approval-bound-homogeneous. Recon no longer
uses a run-wide maximum or one homogeneous target across unlike waves, while
homogeneity within a single wave remains available when its lanes share one
assignment and capability floor. Valid legacy approvals retain their original
meaning.

DR-260904-remove-dispatch-receipt-chain remains in force: approval integrity and
evidence invariants stay fail-closed, but recon does not recreate unsupported
launch receipts or treat approved intent as runtime proof. Current orchestration
guidance remains the source of provider qualifications and target selection;
recon does not add a second model ladder.

`DR-260911-use-session-local-recon` partially supersedes the legacy-approval
compatibility clause above and replaces durable fingerprint binding with
session-local approval followed by immediate exact-target launch.
