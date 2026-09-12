---
id: BL-260907-replace-the-default-project
title: Replace the default project recap with a direct agent-authored visual flow
status: open
priority: high
scope: feature
scope_estimate: M
labels:
  - explainer
  - lifecycle
  - simplification
assignee: null
created: 2026-09-07T13:44:01.781Z
updated: 2026-09-08T16:55:27.000Z
associated_issues: []
external_plans: []
---

## Description

Replace the implementation-tail project recap path with one dependable agent-authored HTML recap and browser-based visual verification. Keep advanced Explainer Kit recipes available, but stop requiring adaptive portfolio planning, five injected provider seams, multi-artifact expansion, and publish/durability machinery for the ordinary lifecycle recap. Relates to GitHub issue #230 and should reconcile or supersede BL-260902-make-autonomous-project-recap and BL-260904-add-recap-seam-config-keys before implementation.

## Triage amendments (2026-09-08)

- Program scope: the program-close recap path (`oat-wave-program` "Program-close explainer caller", recipe `program-recap` v1) adopts the same agent-authored single-artifact path with the six required program sections and the same generate/retry/skip semantics; its `runId`/`outcome` still lands in the program ledger; the duplicated caller in `oat-wave-execute` follows.
- Browser-less hosts: never discard an authored artifact; run the browser-free checks (parses, required sections present, every claim traces to the fact bundle by subject and value — the token-membership check is not sufficient) and record `built-needs-review` with the reason; `generate` is satisfied as "usable, visually unverified" (operator decision 2026-09-08).
- Keep from the existing kit: the fact-base schema (JSON canonical, Markdown derived), freshness and dedup by project/recipe identity and input hashes, subject-bound claim checking from the cohesion checker, the terminal-outcome guard as a concept with rewritten semantics (today it accepts `failed`), run identity and artifact/input hashes so the archive validator (`archive-utils.ts:958-1007`) keeps working. Drop from the default path: callback-module seams, set planning, expansion, publish/durability machinery. `probe-recap-seams.mjs` and the `capability_probe` skip source retire from the default path; the skip record shape stays for `check-terminal-outcome.mjs`.
- Migration scope also covers `oat-project-complete`'s recap gate and export path (`SKILL.md:489-568`) and `oat-project-summary`'s outcome mapping (`SKILL.md:257-283`).
- Reconcile clause corrected: supersede `BL-260904-add-recap-seam-config-keys` (closed at this triage); `BL-260902-make-autonomous-project-recap` already shipped (wave 5 p08) and needs no reconciliation.
- Run as its own spec-driven project (Codex critique and the operator agree), not a wave lane; wave 7 may close with a recorded `recap: not run` meanwhile.

## Acceptance Criteria

- The ordinary implementation-tail recap no longer depends on adaptive set planning,
  injected author/critic/browser/visual-critic module paths, multi-artifact expansion,
  or publish/durability machinery; advanced Explainer Kit recipes remain available
  through their explicit workflow.
- The active host agent receives an allowlisted fact bundle from approved project
  artifacts and produces one standalone, navigable HTML recap without requiring
  custom provider modules on a normally configured host.
- The recap is opened through an available browser surface and checked at
  representative narrow, medium, and wide viewport widths, with artifact and
  screenshot paths retained in a small result record.
- A `generate` decision is satisfied only when a usable visual artifact exists.
  Generation failure preserves a sanitized actionable cause and requires an explicit
  retry or skip decision instead of becoming a silent closeout warning.
- Focused tests exercise a fresh-host successful generation path and reproduction-grade
  negative controls for provider and browser failures, proving the failures remain
  visible while a valid accepted control still produces the recap.
- Before implementation, reconcile or supersede
  `BL-260902-make-autonomous-project-recap` and
  `BL-260904-add-recap-seam-config-keys` so the backlog does not simultaneously direct
  contributors to add the seam machinery this item removes from the default path.

## Amendment 2026-09-09 (rescope, project `agent-authored-recap`)

The operator rescoped the project after design round 2: the adapter's and the core's callback-driven orchestration cannot be run by anyone (author/critic/planner/browser/visual-critic seams need JavaScript callbacks; no host configures one; zero non-test runs since the seams shipped; the plan-time project explainer was declined 3 of 3 times), so the project now restores agent authoring for every caller — project recap, program recap, project explainer at plan approval, and a person invoking `explainer-kit` on any inputs — and retires the seam machinery, the durability/S3-publish path (one August 27 attestation, zero publishes), and the explainer release-candidate tooling. Manifest moves to v2 (`built` replaces the durability outcomes). Discovery § Amendment and spec FR10–FR12 carry the detail.
