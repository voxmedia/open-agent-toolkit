---
id: BL-261002-offer-a-strict-gate-reviewer
title: Offer a strict gate-reviewer independence mode and align gate skill
  wording and decision records
status: open
priority: medium
scope: feature
scope_estimate: M
labels:
  - gates
  - reviews
  - skills
  - docs-overhaul-followup
assignee: null
created: 2026-10-02T18:40:59.560Z
updated: 2026-10-02T18:40:59.560Z
associated_issues: []
external_plans: []
---

## Description

Gate reviewer independence is weaker than its name suggests:

- The default `--avoid same-family` (`gate/index.ts:838`) falls back to the
  best available reviewer, including the same runtime, recording only a
  warning (`gate/index.ts:1882-1897`). Lifecycle gates run with `--json`, where
  no warning line is printed; it appears only as `diversity.warning` /
  `diversity.achieved` in the result. The per-phase gate command passes no
  `--avoid`, so it always uses `same-family`.
- `same-runtime` excludes only the detected host runtime; on an undetected
  host (plain shell, CI, any host without `CLAUDECODE`, `CODEX_*` or
  `CURSOR_AGENT`) it excludes nothing (`:1754-1757`) and never checks model
  family.
- There is no strict mode that fails when independence cannot be achieved.
- The `oat-project-plan`, `oat-project-quick-start` and
  `oat-project-import-plan` contracts send any non-zero gate exit (including
  launch failures, timeouts and invalid artifacts) to `onFailure`, so under
  `warn` an agent can continue past an operational failure, while
  `oat-project-implement` and `oat-project-lite` keep those blocked. The skills
  still say the reviewer "avoids the same runtime".
- **E17.** Decision records still marked `accepted` with no supersession link:
  `DR-260621-ship-workflow-gates-at-runtime` (line 38 says the default is
  `--avoid same-runtime`; the code default is now `same-family`) and
  `DR-260706-phase-review-gate-is-non` (line 26 says the verdict default is
  `important`; current vocabulary is `high`, which `important` still maps to,
  so only the wording is stale).

Why it matters: teams that rely on "independent review" for assurance can get
a same-runtime, same-family review with no visible signal, and an operational
failure can pass as a warning in three planning skills.

Confirmed by reading source and contracts (not run). Evidence:
`.oat/projects/shared/docs-improvement-overhaul/references/fable-lanes/verification/D-workflow-gates-reviews.verify.md`. Related,
not a duplicate: BL-260830-re-evaluate-same-target-gate (same-runtime
different-model execution).

Source: product defect list `.oat/projects/shared/docs-improvement-overhaul/references/product-defects-found.md` (docs-improvement-overhaul project, 2026-10-02), entry C4 and E17.

- The planning skills (`oat-project-plan`, `oat-project-quick-start`, `oat-project-import-plan`) apply `onFailure` to any failed gate run, so with `onFailure: warn` planning finishes and marks the plan ready even when no review ran at all (reviewer did not start, timed out, or returned an invalid artifact). Implement and lite keep such operational failures blocked. Align the planning skills so a gate that did not produce a review is never treated as an advisory finding. Read in the skill contracts (plan `SKILL.md:649-656` and the matching lines in the other two).

## Acceptance Criteria

- A strict independence option (config and `--avoid` value) makes a gate fail
  with a clear message when no reviewer meeting the requested independence is
  available, including on an undetected host.
- When independence is not achieved in the default mode, the lifecycle skill
  surfaces the fallback to the user (not only a JSON field).
- The plan, quick-start and import-plan skills keep launch failures, timeouts
  and invalid artifacts blocked regardless of `onFailure`, matching implement
  and lite; tests fail if they regress.
- Skill wording describes the actual `--avoid` behavior; changed skills get
  `metadata.version` bumps.
- DR-260621 and DR-260706 are superseded or amended through
  `oat-pjm-decision` / `oat decision new`, and the decision index is
  regenerated.
- The independence caveat on the docs branch `docs-overhaul-readme-visual`
  (`workflows/advanced/workflow-gates.md:21-25`) is updated to describe the
  strict option.
