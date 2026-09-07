---
id: DR-260907-gate-log-receipts-live-under
title: Gate log receipts live under the project
date: 2026-09-07
status: accepted
legacy_id: null
---

# Gate log receipts live under the project

## Context

A gate that appends to project-log.md but cannot commit it leaves finalization half done. Finalization runs after the review envelope is flushed, so the receipt cannot live in the envelope, and the tmpdir() gate run marker dies with the process that wrote it, so it cannot carry work into the later run that has to finish the job.

## Decision

Write the partial-finalization receipt to <project>/gate-receipts/<runId>.json: durable, project-local, and gitignored through .oat/projects/\*\*/gate-receipts/. It carries the run id, project and worktree identity, the review artifact path and its sha256 signature, the append and commit disposition, the index-lock class, the attempt count, and the verbatim recovery command. The recovery path deletes the receipt once its commit succeeds; a receipt whose run id the log already carries is reported as stale at the next gate start and is cleared by the recovery command with already-appended status.

## Consequences

Finalization survives the process that started it, and a later run completes it from the receipt alone without invoking a reviewer or re-running the gate. Receipt identity is validated against the live tree before anything is appended, so a receipt replayed against a different project, worktree, or review artifact refuses and touches nothing. The receipt is untracked, so it never dirties a worktree or reaches review.
