---
id: DR-261012-no-protection-for-simultaneous
title: No protection for simultaneous archive runs
date: 2026-10-12
status: accepted
legacy_id: null
---

# No protection for simultaneous archive runs

## Context

During artifact-cleanup the configured exit gate reported races between two simultaneous oat project archive runs of the same project, and four fix rounds built a per-write owner-token ownership protocol in response. No discovery, design or decision record asked for concurrent safety, and every archive caller is sequential: oat-project-complete archives the one active project, oat-wave-execute serializes its closeouts, and oat-project-complete-auto processes different projects in order. The gate's reproductions required injecting a scheduling barrier into the compiled module.

## Decision

OAT does not serialize or protect simultaneous archive runs of one project. The ownership protocol was deleted (p04-t29). Archive keeps only what sequential use needs: the pending allocation marker written before any copy or upload so an interrupted run resumes the same identity, a refusal when a stray non-archive occupant sits at the target path, and cleanup that touches only an allocation this run created and that is still pending.

## Consequences

Two archive runs of the same project at the same moment can still collide; project-artifacts.md states that this is unsupported. The retained cleanup adds no deletion path that main lacked, so the worst case remains a refused or duplicated archive rather than a deleted one. Reintroduce concurrency protection only if a real incident traces a twin or a lost archive to overlapping runs, and then as one exclusive per-project lock held for the whole operation rather than per-write ownership checks.
