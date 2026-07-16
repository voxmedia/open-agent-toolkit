---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-07-16
oat_generated: true
oat_summary_last_task: p04-t03
oat_summary_revision_count: 0
oat_summary_includes_revisions: []
---

# Summary: gate-execution-hardening

## Overview

This project hardened headless `oat gate review` after consumer-app dogfood
exposed three coupled failure modes: unawaitable reviewer delegation, fixed
budgets that killed productive large reviews, and stdout-only liveness that
could not distinguish active transcript work from a hang. It also corrected
dispatch-resolution defects discovered while reviewing the design.

## What Was Implemented

- Added validated gate budget configuration at CLI, exec-target, workflow,
  environment, and scope-default layers. Final, phase, and range code reviews
  now default to 30 minutes; task code and artifact reviews retain 15-minute
  defaults, and every resolution reports its source.
- Added a mechanical headless contract: immutable runtime/model inputs,
  checkout-local `oat gate route`, strict route receipts, structured refusals,
  transient run markers, and inline or synchronously awaited execution only.
- Scoped route evidence to the active child runtime. Matching current-provider
  evidence takes precedence over inherited parent-provider markers. Generic
  parent model values are ignored; current-provider contradictions fail closed.
- Added bounded Claude, Codex, and Cursor transcript-metadata probes. Liveness
  and terminal envelopes now distinguish process state, stdout/stderr idleness,
  transcript activity, budget source, and no-output failures without changing
  pass/fail or receive eligibility.
- Added a deterministic seven-case subprocess matrix plus real Claude and
  Cursor completion-safety lanes. The final suite passed 3,001 CLI tests, 95
  other package tests, and 123 smoke tests.
- Distinguished missing dispatch policy from missing/incomplete reusable
  ladders through `unresolvedReason`, `ladderCompleteness`, and `missingCells`;
  pre-plan discovery/design/spec reviews can deliberately inherit when policy
  alone is absent.
- Updated canonical skills, provider views, user documentation, and all five
  public packages in lockstep to `0.1.72`.

## Key Decisions

- **Mechanical headless routing over prompt wording.** Gate children receive
  machine-readable invocation context and must execute the checkout-local route
  helper. Prompt instructions remain explanatory, not the completion-safety
  mechanism.
- **Strict fail-closed receipt validation.** Inline completion requires a route
  receipt whose decision shape, checkout root, runtime, and run correlation
  match gate-owned values. Missing or contradictory evidence delegates through
  an awaited route or refuses.
- **Scope-aware hard budgets, not activity-based extensions.** Configuration
  and review scope select the hard cap; liveness evidence never extends a
  timeout or changes the verdict.
- **Transcript metadata is observability, not health.** Probes inspect bounded
  filesystem mtime/size only. Claude and Cursor evidence is project-scoped;
  Codex evidence is explicitly labeled ambient and non-attributable.
- **Resolver owns policy/ladder diagnosis.** Planning consumes the resolver's
  merged effective matrix and whole-ladder completeness instead of inferring
  missing configuration from individual config reads.

## Design Deltas

- The Fumadocs site uses authored `## Contents` plus branch-local
  `docs generate-index`; the original MkDocs-only `docs nav sync` plan step was
  replaced.
- The initial exactly-one-provider-marker routing rule was superseded by
  current-target-marker precedence. This preserves valid cross-provider
  children while retaining fail-closed current-child model checks.
- Final review added immutable route input binding and canonical spawned-command
  coverage after exposing that the fixture had bypassed the skill's exact
  environment contract.

## Notable Challenges

- Independent reviews found malformed persisted-timeout warnings were
  unreachable after normalization, route evidence could reject valid
  cross-provider children, and the first real-provider fixtures were using an
  installed rather than checkout-local CLI. Each issue was fixed and re-reviewed.
- The subprocess matrix exposed load-sensitive default test timeouts; explicit
  15-second test-runner headroom stabilized repeated runs without weakening the
  intentionally short production budgets inside timeout cases.
- Several background reviewer response streams ended with
  `WritableIterable is closed` after artifacts or commits had already landed.
  Root orchestration verified Git and review artifacts directly rather than
  replaying completed work.

## Tradeoffs Made

- Transcript probes use directory-level metadata rather than session-precise
  parsing. This is resilient to provider schema churn but intentionally reports
  observable activity, not proof that the gate child is healthy.
- Run markers live in system temp rather than the repository. They cannot be
  swept into bookkeeping commits, but crashed-process residue requires
  out-of-repo inspection.
- Headless gates forbid fire-and-forget background dispatch. Interactive
  multi-minute work still prefers durable background handles where the host can
  await and resume them.

## Integration Notes

- Gate-aware callers should consume the terminal JSON envelope, not poll review
  directories or provider logs. Only `ok` or `blocked` with
  `receiveEligible: true` and a non-null handoff may proceed to review-receive.
- Canonical skill changes require one skill version bump and synchronized
  provider/bundled views. Shipped CLI asset changes require lockstep public
  package bumps and `pnpm release:validate`.
- The parked `orchestration-run-log` project was intentionally left untouched;
  its future finalization hook should preserve the cohesive gate envelope and
  marker boundaries established here.

## Follow-up Items

- `BL-260711-add-activity-aware-gate` remains open for adaptive idle-kill,
  early correlated artifact-template creation, and distinct idle-kill versus
  hard-cap outcomes. Scope-aware hard budgets, transcript liveness evidence,
  and correlated timeout recovery are already shipped.
