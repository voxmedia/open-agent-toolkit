---
id: BL-260720-add-oat-project-complete-auto
title: Add oat-project-complete-auto companion skill for autonomous closeouts
status: open
priority: high
scope: task
scope_estimate: M
labels:
  - lifecycle-skills
  - autonomy
  - workflow-integrity
assignee: null
created: 2026-07-20T14:31:24.681Z
updated: 2026-07-20T14:31:24.681Z
associated_issues: []
external_plans: []
---

## Description

Structural gap found by the Orc wave program (first-run handoff signal 10, root-cause-sharpened 2026-07-20): oat-wave-execute closeout orders 'oat-project-complete BEFORE merge', but that skill is disable-model-invocation: true - deliberately invisible and uninvokable to the autonomous orchestrators the wave skill targets. Under that contradiction the orchestrator degraded to the nearest CLI command (oat project complete-state), leaving 4 wrapper projects lifecycle-complete but UNARCHIVED (no local move, no s3SyncOnComplete sync, active pointer set) until an operator audit. Precedent for the fix shape exists in-repo: oat-worktree-bootstrap-auto is the explicit non-interactive companion to oat-worktree-bootstrap. Build oat-project-complete-auto: resolves every batched question from config (archiveOnComplete/createPrOnComplete already auto-answer), skips PR steps when the PR is merged, hard-fails rather than prompts on unresolvable gates. Rejected alternatives (per the consumer's analysis): inlining the tail into wave-execute duplicates a moving process; flipping the interactive skill's flag loses the human gate where genuinely wanted. RELATED: BL-260718-mandatory-skill-load-clause - same class (lifecycle text naming skills that agents cannot load/invoke), interactive vs autonomous variants; fix both with one convention pass if practical. Interim mitigation ships in wave-execute 1.7.0 (prev3-t05): step 7 names the full tail explicitly + execute-the-skill-as-document guidance.

## Acceptance Criteria

- {Outcome 1}
- {Outcome 2}
