# Backlog & Roadmap Review

<!-- markdownlint-disable MD013 -->

**Date:** 2026-08-19 (America/Chicago)
**Scope:** All 44 active records under `.oat/repo/pjm/backlog/items/`
**Roadmap:** `.oat/repo/pjm/roadmap.md` (included after the interactive prompt
returned no selection; this review uses the recommended inclusive scope)
**Codebase baseline:** `origin/main` at `6f443c0843d75b704168b8ca739b5bcf7f406f07`
**Purpose:** Prioritize by value and effort, surface dependencies, and recommend
an execution sequence

> No priority-alignment companion existed when this review was written. The
> optional collaborative walkthrough can create
> [`priority-alignment.md`](./priority-alignment.md) after the operator confirms
> capacity, calendar constraints, and a kickoff stack.

---

## 1. Executive Summary

The backlog contains **44 active items** across three broad themes:

| Theme                                              | Count | Key observation                                                                                                                 |
| -------------------------------------------------- | ----: | ------------------------------------------------------------------------------------------------------------------------------- |
| Review, gate, and lifecycle integrity              |    15 | The highest-value work is a sequence of narrow reliability foundations, not one large review rewrite.                           |
| Orchestration, sync, skills, and wave tooling      |    16 | Several quick contract fixes are ready; the broker, pinned-agent, and wave-CLI initiatives lack an urgent consumer.             |
| Docs, Explainer Kit, release, and test reliability |    13 | Four small release/test fixes are ready in parallel; protected publication and additional visual workflows should remain gated. |

### Quadrant distribution

| Quadrant      | Count | Interpretation                                                                            |
| ------------- | ----: | ----------------------------------------------------------------------------------------- |
| Quick Win     |     4 | High value and low effort; start immediately in independent lanes.                        |
| Strategic     |    11 | High value with medium or high effort; sequence around the receipt/lifecycle foundations. |
| Fill-in       |    14 | Useful bounded maintenance; schedule around the strategic lanes.                          |
| Avoid / Defer |    15 | Obsolete, externally blocked, demand-gated, or too costly for current value.              |

### Top-line recommendations

1. Finish **`BL-260729-implement-reviewplan-first` — Implement ReviewPlan-first
   reviewer workflow** through draft PR #190. Reconcile the dirty merge state,
   refresh dogfood evidence and checks, and compare the Stage A result with the
   full backlog acceptance criteria before closing or narrowing the record.
2. In the second available lane, start **`BL-260718-warn-when-oat-sync-uses` —
   Warn when oat sync uses a different producing CLI version**. The current sync
   path detects version skew but silently restamps it; this work does not overlap
   the ReviewPlan PR.
3. Queue **`BL-260820-bind-each-gate-review` — Bind each gate review disposition
   to its exact received ledger event** immediately after PR #190 is reconciled.
   It closes the silent multi-round ledger ambiguity from GitHub issue #194 and
   should build on, rather than conflict with, the in-flight review changes.

### Session triage provenance

These markers distinguish records created or newly linked during this session
from the backlog that existed before the review.

| Marker                             | Backlog item                                                                                                                               | Session action                                                                         |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| **NEW — skills corpus**            | **`BL-260819-repair-verified-bundled-skill` — Repair verified bundled skill contract drift**                                               | Created from four verified bundled-skill contract mismatches.                          |
| **NEW — skills corpus**            | **`BL-260819-refresh-codex-skill-model` — Refresh codex-skill model routing and repository-check policy**                                  | Created from verified stale model-routing and overly broad bypass guidance.            |
| **NEW — skills corpus**            | **`BL-260819-classify-canonical-skills-by` — Classify canonical skills by distribution, lifecycle, and tenant scope**                      | Created from the verified canonical-versus-bundled inventory ambiguity.                |
| **NEW — GitHub #194**              | **`BL-260820-bind-each-gate-review` — Bind each gate review disposition to its exact received ledger event**                               | Created and linked to the open issue.                                                  |
| **NEW — GitHub #201**              | **`BL-260820-track-pr-closeout-evidence` — Track PR-closeout evidence freshness against the current head**                                 | Created and linked to the open issue.                                                  |
| **NEW — GitHub #202**              | **`BL-260820-emit-source-qualified` — Emit source-qualified provenance envelopes for review and gate receipts**                            | Created and linked to the open issue.                                                  |
| **EXISTING — linked #197**         | **`BL-260711-add-activity-aware-gate` — Add activity-aware gate timeouts**                                                                 | Existing record confirmed as the owner of the issue's remaining adaptive-timeout work. |
| **EXISTING — linked/refined #200** | **`BL-260818-distinguish-operator-directed` — Distinguish operator-directed review rounds from failed fix cycles in the review-cycle cap** | Existing record linked and narrowed to bounded, finding-scoped authorization.          |

---

## 2. Item Catalog

### Rating key

| Rating     | Value                                                                  | Effort                                       |
| ---------- | ---------------------------------------------------------------------- | -------------------------------------------- |
| **High**   | Unblocks other work, affects a daily workflow, or protects a milestone | More than 3 days or broad/cross-cutting work |
| **Medium** | Improves consistency, quality, or a bounded operational path           | 1–3 days with moderate complexity            |
| **Low**    | Narrow, speculative, obsolete, or demand-gated                         | Less than 1 day and isolated                 |

Quadrants are derived as follows: high-value/low-effort is **Quick Win**;
high-value work above low effort is **Strategic**; bounded medium-value work is
**Fill-in**; low-value, externally blocked, or medium-value/high-effort work is
**Avoid / Defer**.

| Item                                                                                                                                       | Session provenance             | Current priority | Value | Effort | Quadrant      | Rationale; dependencies and impact                                                                                                                                                                                                   |
| ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------ | ---------------- | ----- | ------ | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **`BL-260706-front-load-recurring-gate` — Front-load recurring gate-finding classes into implementer briefs**                              | —                              | Medium           | M     | H      | Avoid / Defer | Valuable only after a stable finding taxonomy; requires a new ledger, dispatch injection, final sweep, and promotion policy. Soft dependency D6; blocks no current delivery.                                                         |
| **`BL-260708-verify-cursor-gpt-5-6-subagent` — Verify Cursor GPT-5.6 subagent model slugs**                                                | —                              | Medium           | L     | L      | Fill-in       | The 2026-08-08 recheck is overdue, but work is externally blocked until Cursor exposes Task evidence. Soft dependency D5; blocks only trustworthy Cursor GPT-5.6 subagent pins.                                                      |
| **`BL-260711-add-activity-aware-gate` — Add activity-aware gate timeouts**                                                                 | Existing — linked #197         | High             | H     | M      | Strategic     | Hard budgets and liveness diagnostics shipped, but adaptive idle-kill, early artifact creation, and distinct outcomes remain. Paired in D2; blocks reliable long-running gates.                                                      |
| **`BL-260711-add-root-owned-dispatch-broker` — Add root-owned dispatch broker for exact OAT subagent launches**                            | —                              | High             | M     | H      | Avoid / Defer | Phase-direct fallback works; the broker is justified only by a concrete three-tier consumer and fresh host support. Soft dependency D8; blocks only exact coordinator-to-worker topology.                                            |
| **`BL-260711-skip-re-review-for-bookkeeping` — Skip re-review for bookkeeping-only review findings**                                       | —                              | High             | H     | M      | Strategic     | Classification exists but intentionally does not skip reviews. Soft dependency D6; blocks reviewer-capacity savings and faster deterministic bookkeeping remediation.                                                                |
| **`BL-260712-per-project-override` — Per-project override to disable configured external gates**                                           | —                              | Medium           | M     | M      | Fill-in       | A useful scoped exception, but not a current reliability blocker. Soft dependency D7; enables project-local control without mutating shared configuration.                                                                           |
| **`BL-260713-root-agent-judgment-logging` — Root-agent judgment logging responsibility for project log**                                   | —                              | Medium           | M     | L      | Fill-in       | The CLI contract exists; root workflow guidance still records structural events rather than judgment signals. No hard dependency; improves retro evidence.                                                                           |
| **`BL-260714-executable-backstops` — Executable backstops for contract claims — authoring guidance**                                       | —                              | Medium           | M     | L      | Fill-in       | Generalizes proven contract-test precedents into authoring guidance. No hard dependency; prevents prose-only invariant drift.                                                                                                        |
| **`BL-260718-add-generated-runbook` — Add generated-runbook verification command pass**                                                    | —                              | Medium           | M     | H      | Avoid / Defer | Needs discovery for a structured command source and safety model before executing generated prose. Blocks no listed item.                                                                                                            |
| **`BL-260718-add-oat-wave-lifecycle-cli` — Add oat wave lifecycle CLI command family**                                                     | —                              | High             | M     | H      | Avoid / Defer | Existing skills own the lifecycle and no second consumer has triggered a stable CLI contract. Hard dependency D4; blocks only CLI-native wave management.                                                                            |
| **`BL-260718-document-execution-program` — Document execution-program artifact as stable OAT contract**                                    | —                              | Medium           | L     | M      | Avoid / Defer | Current docs deliberately keep the artifact descriptive. Requires a concrete second consumer; dependency D4.                                                                                                                         |
| **`BL-260718-fix-oat-docs-generate-index` — Fix oat docs generate-index cwd-relative defaults in monorepos**                               | —                              | Medium           | M     | M      | Fill-in       | The CLI still resolves defaults from the current directory; repo scripts work around it explicitly. No hard dependency; acceptance criteria and size need normalization.                                                             |
| **`BL-260718-harden-full-surface-gate` — Harden full-surface gate reviews against budget and recursive dispatch**                          | —                              | High             | H     | M      | Strategic     | Recursion prevention shipped, but large-surface budget reliability remains. Paired in D2; blocks dependable plan and whole-range gates.                                                                                              |
| **`BL-260718-mandatory-skill-load-clause` — Mandatory skill-load clause for lifecycle steps that name skills**                             | —                              | High             | H     | L      | Quick Win     | Current closeout text names skills without uniformly requiring a fresh load. Soft dependency D3; prevents silent workflow-step omission.                                                                                             |
| **`BL-260718-rewrite-worktree-bootstrap` — Rewrite worktree bootstrap-group as tested TypeScript command**                                 | —                              | Medium           | L     | M      | Avoid / Defer | The shipped Bash helper works and a rewrite should wait for the wave CLI trigger. Soft dependency D4; blocks no current workflow.                                                                                                    |
| **`BL-260718-support-fumadocs-in-oat-docs` — Support Fumadocs in oat docs nav sync (currently MkDocs-only)**                               | —                              | Medium           | L     | L      | Avoid / Defer | The goal is obsolete because Fumadocs intentionally uses index generation rather than MkDocs nav sync. Close or rewrite as a narrow wrong-command diagnostic; criteria and size are missing.                                         |
| **`BL-260718-warn-when-oat-sync-uses` — Warn when oat sync uses a different producing CLI version**                                        | —                              | High             | H     | L      | Quick Win     | Sync already detects and restamps producer skew but emits no warning. No hard dependency; prevents recurring stale-tool diagnosis.                                                                                                   |
| **`BL-260719-add-pinned-recon-agents` — Add pinned recon agents for reusable orchestration**                                               | —                              | Medium           | M     | H      | Avoid / Defer | Reviewer-local reconnaissance exists; reusable pinned roles need a generic materialization contract and demonstrated consumers. Soft dependency D8.                                                                                  |
| **`BL-260719-evaluate-broader-final-gate` — Evaluate broader final-gate freshness policy after narrow optimization**                       | —                              | Low              | L     | M      | Avoid / Defer | This is an evidence-gated decision checkpoint, not delivery work. Dependency D1 now overlaps the stronger closeout-freshness record; consider folding it there.                                                                      |
| **`BL-260720-add-oat-project-complete-auto` — Add oat-project-complete-auto companion skill for autonomous closeouts**                     | —                              | High             | H     | M      | Strategic     | The companion is still absent and safe autonomous closeout needs it, but literal acceptance placeholders must be resolved first. Hard dependency D3.                                                                                 |
| **`BL-260724-support-provider-directory` — Support provider directory symlinks as full collection sync**                                   | —                              | Medium           | M     | H      | Avoid / Defer | Current ancestry safety deliberately rejects provider symlinks; safe adoption is cross-cutting and existing non-alias installs work. Blocks only alias-based collections.                                                            |
| **`BL-260725-classify-general-sync-owned` — Classify general sync-owned dirt in project-start preflight**                                  | —                              | Low              | L     | H      | Avoid / Defer | The item's own design found prompting safest beyond the already-shipped manifest-only case. Archive as `wont_do` unless a new repeated incident exists.                                                                              |
| **`BL-260726-validate-cursor-pin-effort` — Validate Cursor pin effort rungs at sync time**                                                 | —                              | Medium           | M     | M      | Fill-in       | Current materialization validates syntax, not real family/rung support. Dependency D5; protects against silent wrong-model fallback once authoritative data exists.                                                                  |
| **`BL-260726-validate-structured-output` — Validate structured-output contract in gate skill commands**                                    | —                              | Medium           | M     | L      | Fill-in       | Missing `--json` is still accepted and fails later in consumers. Soft dependency D7; proposed size S should be confirmed.                                                                                                            |
| **`BL-260727-make-explainer-run-durability` — Make explainer run durability survive ephemeral environments**                               | —                              | High             | H     | H      | Strategic     | Current finalization reports `built-not-durable` but cannot make ephemeral output survive. Requires a persistence policy; blocks safe cloud/autonomous recap delivery.                                                               |
| **`BL-260728-additional-visual-workflows` — Additional visual workflows**                                                                  | —                              | Low              | L     | H      | Avoid / Defer | Golden recovery is complete and no demand evidence justifies another broad workflow expansion. Blocks nothing.                                                                                                                       |
| **`BL-260729-implement-reviewplan-first` — Implement ReviewPlan-first reviewer workflow**                                                  | In flight — draft PR #190      | High             | H     | H      | Strategic     | Stage A is implemented in draft PR #190; its last checks passed, but GitHub reports a dirty merge state. Finish/reconcile it before overlapping review-skill changes, then compare the shipped slice with the full backlog criteria. |
| **`BL-260806-fail-closed-when-configured` — Fail closed when configured closeout snapshot is absent**                                      | —                              | High             | H     | M      | Strategic     | Existing routing handles an incomplete snapshot, not the configured-plus-absent invariant. Hard dependency D3; blocks safe autonomous completion.                                                                                    |
| **`BL-260817-decide-and-pin-the-system` — Decide and pin the system-Chromium requirement introduced by test:skills on the merge path**     | —                              | Medium           | M     | L      | Fill-in       | CI has no browser provisioning policy. Hard dependency D9; blocks the RC end-to-end CI item and needs acceptance cleanup.                                                                                                            |
| **`BL-260817-detect-branch-behind-published` — Detect branch-behind-published-main package versions in CI**                                | —                              | Medium           | H     | L      | Quick Win     | Release validation compares with the merge base but not current published main. No hard dependency; prevents long-lived branch version collisions.                                                                                   |
| **`BL-260817-drop-explainer-kit-publish` — Drop explainer-kit publish-request/v1 in a future minor**                                       | —                              | Medium           | L     | M      | Avoid / Defer | V2 is current, but removal is correctly gated on an external wrapper and a future minor. Blocks only legacy cleanup; acceptance needs normalization.                                                                                 |
| **`BL-260817-let-resolveassetsroot-honor` — Let resolveAssetsRoot honor OAT_ASSETS_DIR and make smoke asset reads hermetic**               | —                              | Medium           | H     | L      | Quick Win     | Bundling honors the isolated assets root while readers still use the shared path. No hard dependency; removes a real parallel-smoke race after criteria cleanup.                                                                     |
| **`BL-260817-run-the-rc-explainer-end` — Run the RC explainer end-to-end test in CI with a provisioned browser**                           | —                              | Medium           | H     | M      | Strategic     | The integration test is skipped without its repo variable and CI provisions no browser. Hard dependency D9; supplies real release proof after criteria cleanup.                                                                      |
| **`BL-260817-verify-protected-mode-public` — Verify protected-mode public URLs with an authenticated end-to-end GET**                      | —                              | Medium           | M     | H      | Avoid / Defer | Adds host-bound credential handling to a path that currently discloses, rather than overclaims, verification. Requires security design; criteria need normalization.                                                                 |
| **`BL-260818-bound-the-smoke-cleanup` — Bound the smoke cleanup SIGTERM harness with a timeout**                                           | —                              | Medium           | M     | L      | Fill-in       | The harness can wait indefinitely after SIGTERM. No hard dependency; prevents suite wedges, but its duplicate placeholder criteria must be removed.                                                                                  |
| **`BL-260818-distinguish-operator-directed` — Distinguish operator-directed review rounds from failed fix cycles in the review-cycle cap** | Existing — linked/refined #200 | Medium           | M     | M      | Fill-in       | Current receive flow has no bounded finding-scoped authorization record. Soft dependency D7; preserves the cap while allowing explicit continuation.                                                                                 |
| **`BL-260818-extend-guarded-prose-contract` — Extend guarded-prose contract tests to docs-app mirrors**                                    | —                              | Medium           | M     | L      | Fill-in       | Current guard covers only the canonical skill reference, not the docs mirror. No hard dependency; duplicate placeholder criteria must be removed.                                                                                    |
| **`BL-260818-require-repo-wide-call-site` — Require repo-wide call-site sweeps for cross-cutting options in phase-implementer guidance**   | —                              | Medium           | M     | L      | Fill-in       | Current scope rules lack a repo-wide call-site and widen-or-stop obligation. No hard dependency; duplicate placeholder criteria must be removed.                                                                                     |
| **`BL-260819-classify-canonical-skills-by` — Classify canonical skills by distribution, lifecycle, and tenant scope**                      | New — skills corpus            | Medium           | M     | H      | Avoid / Defer | The inventory ambiguity is real, but resolving lifecycle, distribution, and tenant policy across 79 canonical directories is broad. Soft dependency D10; plan after immediate contract fixes.                                        |
| **`BL-260819-refresh-codex-skill-model` — Refresh codex-skill model routing and repository-check policy**                                  | New — skills corpus            | Medium           | M     | L      | Fill-in       | The repo-only skill hard-codes compatibility-era models and a blanket bypass. No hard dependency; a bounded correctness and safety fix.                                                                                              |
| **`BL-260819-repair-verified-bundled-skill` — Repair verified bundled skill contract drift**                                               | New — skills corpus            | Medium           | M     | M      | Fill-in       | All four mismatches remain reproducible; grouping them avoids repeated release bumps. No hard dependency; schedule as one release-shaped batch.                                                                                      |
| **`BL-260820-bind-each-gate-review` — Bind each gate review disposition to its exact received ledger event**                               | New — GitHub #194              | High             | H     | M      | Strategic     | Current handoff lacks immutable event identity across repeated rounds. Dependency D1; blocks trustworthy consumption and later receipt reconciliation.                                                                               |
| **`BL-260820-emit-source-qualified` — Emit source-qualified provenance envelopes for review and gate receipts**                            | New — GitHub #202              | High             | H     | M      | Strategic     | Useful fields exist in separate outputs, but no common source-qualified receipt schema exists. Dependency D1; blocks integrated freshness and corroboration.                                                                         |
| **`BL-260820-track-pr-closeout-evidence` — Track PR-closeout evidence freshness against the current head**                                 | New — GitHub #201              | High             | H     | H      | Strategic     | Existing review freshness is narrower than integrated PR, CI, bot, gate, and approval freshness. Hard dependency D1; blocks proof that terminal evidence covers current head.                                                        |

### Readiness defects found during cataloging

- **11 active records** retain literal `{Outcome 1}` / `{Outcome 2}`
  placeholders; three of those also duplicate the `## Acceptance Criteria`
  heading. They can be prioritized, but should not enter implementation until
  their substantive criteria are normalized.
- **Three active records** have no `scope_estimate`: the docs index default,
  Fumadocs nav-sync, and structured gate-output validation records. This review
  estimates them as M, L, and L effort respectively; the backlog metadata
  should be confirmed before kickoff.
- `oat pjm doctor` reports **`BL-260817-let-resolveassetsroot-honor` — Let
  resolveAssetsRoot honor OAT_ASSETS_DIR and make smoke asset reads hermetic** as
  completed because its ID appears in another item's completion summary. The
  record is not complete; this is a detector false positive, not an archive
  instruction.

---

## 3. Dependency Graph

```text
Legend:  ──▶  hard dependency (must complete first)
         - -▶  soft dependency (beneficial sequencing)

D1  BL-260820-bind-each-gate-review
      - -▶ BL-260820-emit-source-qualified
      ──▶ BL-260820-track-pr-closeout-evidence
    BL-260820-emit-source-qualified
      ──▶ BL-260820-track-pr-closeout-evidence

D2  BL-260711-add-activity-aware-gate
      - -▶ BL-260718-harden-full-surface-gate
      - -▶ BL-260729-implement-reviewplan-first

D3  BL-260806-fail-closed-when-configured
      ──▶ BL-260720-add-oat-project-complete-auto
    BL-260718-mandatory-skill-load-clause
      - -▶ BL-260720-add-oat-project-complete-auto

D4  BL-260718-document-execution-program
      ──▶ BL-260718-add-oat-wave-lifecycle-cli
    BL-260718-rewrite-worktree-bootstrap
      - -▶ BL-260718-add-oat-wave-lifecycle-cli

D5  BL-260708-verify-cursor-gpt-5-6-subagent
      - -▶ BL-260726-validate-cursor-pin-effort

D6  BL-260729-implement-reviewplan-first
      - -▶ BL-260706-front-load-recurring-gate
      - -▶ BL-260711-skip-re-review-for-bookkeeping

D7  BL-260726-validate-structured-output
      - -▶ BL-260712-per-project-override
    BL-260820-bind-each-gate-review
      - -▶ BL-260818-distinguish-operator-directed

D8  BL-260719-add-pinned-recon-agents
      - -▶ BL-260711-add-root-owned-dispatch-broker

D9  BL-260817-decide-and-pin-the-system
      ──▶ BL-260817-run-the-rc-explainer-end

D10 BL-260819-classify-canonical-skills-by
      - -▶ future catalog and provider-sync policy work

Independent active items:
BL-260713-root-agent-judgment-logging
BL-260714-executable-backstops
BL-260718-add-generated-runbook
BL-260718-fix-oat-docs-generate-index
BL-260718-support-fumadocs-in-oat-docs
BL-260718-warn-when-oat-sync-uses
BL-260719-evaluate-broader-final-gate
BL-260724-support-provider-directory
BL-260725-classify-general-sync-owned
BL-260727-make-explainer-run-durability
BL-260728-additional-visual-workflows
BL-260817-detect-branch-behind-published
BL-260817-drop-explainer-kit-publish
BL-260817-let-resolveassetsroot-honor
BL-260817-verify-protected-mode-public
BL-260818-bound-the-smoke-cleanup
BL-260818-extend-guarded-prose-contract
BL-260818-require-repo-wide-call-site
BL-260819-refresh-codex-skill-model
BL-260819-repair-verified-bundled-skill
```

### ID legend

| ID                                       | Title                                                                                      |
| ---------------------------------------- | ------------------------------------------------------------------------------------------ |
| BL-260706-front-load-recurring-gate      | Front-load recurring gate-finding classes into implementer briefs                          |
| BL-260708-verify-cursor-gpt-5-6-subagent | Verify Cursor GPT-5.6 subagent model slugs                                                 |
| BL-260711-add-activity-aware-gate        | Add activity-aware gate timeouts                                                           |
| BL-260711-add-root-owned-dispatch-broker | Add root-owned dispatch broker for exact OAT subagent launches                             |
| BL-260711-skip-re-review-for-bookkeeping | Skip re-review for bookkeeping-only review findings                                        |
| BL-260712-per-project-override           | Per-project override to disable configured external gates                                  |
| BL-260713-root-agent-judgment-logging    | Root-agent judgment logging responsibility for project log                                 |
| BL-260714-executable-backstops           | Executable backstops for contract claims — authoring guidance                              |
| BL-260718-add-generated-runbook          | Add generated-runbook verification command pass                                            |
| BL-260718-add-oat-wave-lifecycle-cli     | Add oat wave lifecycle CLI command family                                                  |
| BL-260718-document-execution-program     | Document execution-program artifact as stable OAT contract                                 |
| BL-260718-fix-oat-docs-generate-index    | Fix oat docs generate-index cwd-relative defaults in monorepos                             |
| BL-260718-harden-full-surface-gate       | Harden full-surface gate reviews against budget and recursive dispatch                     |
| BL-260718-mandatory-skill-load-clause    | Mandatory skill-load clause for lifecycle steps that name skills                           |
| BL-260718-rewrite-worktree-bootstrap     | Rewrite worktree bootstrap-group as tested TypeScript command                              |
| BL-260718-support-fumadocs-in-oat-docs   | Support Fumadocs in oat docs nav sync (currently MkDocs-only)                              |
| BL-260718-warn-when-oat-sync-uses        | Warn when oat sync uses a different producing CLI version                                  |
| BL-260719-add-pinned-recon-agents        | Add pinned recon agents for reusable orchestration                                         |
| BL-260719-evaluate-broader-final-gate    | Evaluate broader final-gate freshness policy after narrow optimization                     |
| BL-260720-add-oat-project-complete-auto  | Add oat-project-complete-auto companion skill for autonomous closeouts                     |
| BL-260724-support-provider-directory     | Support provider directory symlinks as full collection sync                                |
| BL-260725-classify-general-sync-owned    | Classify general sync-owned dirt in project-start preflight                                |
| BL-260726-validate-cursor-pin-effort     | Validate Cursor pin effort rungs at sync time                                              |
| BL-260726-validate-structured-output     | Validate structured-output contract in gate skill commands                                 |
| BL-260727-make-explainer-run-durability  | Make explainer run durability survive ephemeral environments                               |
| BL-260728-additional-visual-workflows    | Additional visual workflows                                                                |
| BL-260729-implement-reviewplan-first     | Implement ReviewPlan-first reviewer workflow                                               |
| BL-260806-fail-closed-when-configured    | Fail closed when configured closeout snapshot is absent                                    |
| BL-260817-decide-and-pin-the-system      | Decide and pin the system-Chromium requirement introduced by test:skills on the merge path |
| BL-260817-detect-branch-behind-published | Detect branch-behind-published-main package versions in CI                                 |
| BL-260817-drop-explainer-kit-publish     | Drop explainer-kit publish-request/v1 in a future minor                                    |
| BL-260817-let-resolveassetsroot-honor    | Let resolveAssetsRoot honor OAT_ASSETS_DIR and make smoke asset reads hermetic             |
| BL-260817-run-the-rc-explainer-end       | Run the RC explainer end-to-end test in CI with a provisioned browser                      |
| BL-260817-verify-protected-mode-public   | Verify protected-mode public URLs with an authenticated end-to-end GET                     |
| BL-260818-bound-the-smoke-cleanup        | Bound the smoke cleanup SIGTERM harness with a timeout                                     |
| BL-260818-distinguish-operator-directed  | Distinguish operator-directed review rounds from failed fix cycles in the review-cycle cap |
| BL-260818-extend-guarded-prose-contract  | Extend guarded-prose contract tests to docs-app mirrors                                    |
| BL-260818-require-repo-wide-call-site    | Require repo-wide call-site sweeps for cross-cutting options in phase-implementer guidance |
| BL-260819-classify-canonical-skills-by   | Classify canonical skills by distribution, lifecycle, and tenant scope                     |
| BL-260819-refresh-codex-skill-model      | Refresh codex-skill model routing and repository-check policy                              |
| BL-260819-repair-verified-bundled-skill  | Repair verified bundled skill contract drift                                               |
| BL-260820-bind-each-gate-review          | Bind each gate review disposition to its exact received ledger event                       |
| BL-260820-emit-source-qualified          | Emit source-qualified provenance envelopes for review and gate receipts                    |
| BL-260820-track-pr-closeout-evidence     | Track PR-closeout evidence freshness against the current head                              |

---

## 4. Parallel Lanes

### Lane A: Lifecycle and review correctness

Start with exact review-event binding and configured-closeout enforcement. Run
the gate-execution pair beside them, then add the common receipt envelope before
attempting integrated head freshness.

**Items:** **`BL-260820-bind-each-gate-review` — Bind each gate review
disposition to its exact received ledger event**; **`BL-260806-fail-closed-when-configured`
— Fail closed when configured closeout snapshot is absent**;
**`BL-260711-add-activity-aware-gate` — Add activity-aware gate timeouts**;
**`BL-260718-harden-full-surface-gate` — Harden full-surface gate reviews
against budget and recursive dispatch**; **`BL-260820-emit-source-qualified` —
Emit source-qualified provenance envelopes for review and gate receipts**; and
**`BL-260820-track-pr-closeout-evidence` — Track PR-closeout evidence freshness
against the current head**.

**Total estimated effort:** High. **Cross-lane dependency:** none; release bumps
may conflict with Lane B skill edits.

### Lane B: Skill and sync contracts

Land the small guidance and warning changes first, batch the four verified skill
repairs into one release, then decide whether the broad skill-classification
contract warrants a dedicated project.

**Items:** **`BL-260718-mandatory-skill-load-clause` — Mandatory skill-load
clause for lifecycle steps that name skills**; **`BL-260718-warn-when-oat-sync-uses`
— Warn when oat sync uses a different producing CLI version**;
**`BL-260819-refresh-codex-skill-model` — Refresh codex-skill model routing and
repository-check policy**; **`BL-260819-repair-verified-bundled-skill` — Repair
verified bundled skill contract drift**; and **`BL-260819-classify-canonical-skills-by`
— Classify canonical skills by distribution, lifecycle, and tenant scope**.

**Total estimated effort:** High. **Cross-lane dependency:** serialize PRs that
touch the same canonical skills or lockstep public-package versions.

### Lane C: Release, smoke, and Explainer reliability

The branch-version check, hermetic asset reader, smoke timeout, and browser
policy are independent quick maintenance. The browser decision unlocks the RC
end-to-end job; run durability is a separate strategic project.

**Items:** **`BL-260817-detect-branch-behind-published` — Detect
branch-behind-published-main package versions in CI**;
**`BL-260817-let-resolveassetsroot-honor` — Let resolveAssetsRoot honor
OAT_ASSETS_DIR and make smoke asset reads hermetic**;
**`BL-260818-bound-the-smoke-cleanup` — Bound the smoke cleanup SIGTERM harness
with a timeout**; **`BL-260817-decide-and-pin-the-system` — Decide and pin the
system-Chromium requirement introduced by test:skills on the merge path**;
**`BL-260817-run-the-rc-explainer-end` — Run the RC explainer end-to-end test in
CI with a provisioned browser**; and **`BL-260727-make-explainer-run-durability`
— Make explainer run durability survive ephemeral environments**.

**Total estimated effort:** High. **Cross-lane dependency:** none.

### Lane D: Workflow and documentation maintenance

Use remaining capacity for bounded guidance/docs fixes. Keep the wave CLI,
dispatch broker, ReviewPlan redesign, protected publication, and visual
expansion outside the kickoff set until their explicit triggers are met.

**Items:** **`BL-260713-root-agent-judgment-logging` — Root-agent judgment
logging responsibility for project log**; **`BL-260714-executable-backstops` —
Executable backstops for contract claims — authoring guidance**;
**`BL-260818-require-repo-wide-call-site` — Require repo-wide call-site sweeps
for cross-cutting options in phase-implementer guidance**;
**`BL-260718-fix-oat-docs-generate-index` — Fix oat docs generate-index
cwd-relative defaults in monorepos**; and **`BL-260818-extend-guarded-prose-contract`
— Extend guarded-prose contract tests to docs-app mirrors**.

**Total estimated effort:** Medium. **Cross-lane dependency:** batch overlapping
skill version bumps with Lane B where practical.

---

## 5. Recommended Execution Order

### Finishing / in flight

| Order | Item                                                                                      | Effort | Next action                                                                                                                                                                          |
| ----- | ----------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| F1    | **`BL-260729-implement-reviewplan-first` — Implement ReviewPlan-first reviewer workflow** | High   | Finish draft PR #190: reconcile its dirty merge state, refresh Stage A dogfood evidence and checks, then determine whether the full backlog record closes or retains residual scope. |

Assumed capacity is two parallel lanes. Until PR #190 lands, start only work
that does not overlap its review and project-implementation skill surfaces.

### Wave 0: Backlog hygiene and decisions

| Order | Item                                                                                                                   | Action                                                                                                                 |
| ----- | ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| 0a    | **`BL-260718-support-fumadocs-in-oat-docs` — Support Fumadocs in oat docs nav sync (currently MkDocs-only)**           | Close as obsolete or rewrite to a narrow Fumadocs wrong-command diagnostic.                                            |
| 0b    | **`BL-260725-classify-general-sync-owned` — Classify general sync-owned dirt in project-start preflight**              | Archive as `wont_do` unless a fresh incident contradicts its own conservative conclusion.                              |
| 0c    | **`BL-260708-verify-cursor-gpt-5-6-subagent` — Verify Cursor GPT-5.6 subagent model slugs**                            | Perform one conditional recheck only if Cursor now exposes qualifying Task evidence; otherwise set a new trigger date. |
| 0d    | **`BL-260720-add-oat-project-complete-auto` — Add oat-project-complete-auto companion skill for autonomous closeouts** | Replace literal acceptance placeholders before scheduling.                                                             |

Also normalize the other ten placeholder-bearing records and the three missing
size estimates as one backlog-maintenance pass.

### Wave 1: Immediate integrity and reliability

| Order | Item                                                                                                                                                                                           | Effort          | Rationale                                                                          |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- | ---------------------------------------------------------------------------------- |
| 1a    | **`BL-260718-mandatory-skill-load-clause` — Mandatory skill-load clause for lifecycle steps that name skills**                                                                                 | Low             | Highest-confidence workflow-integrity quick win.                                   |
| 1b    | **`BL-260820-bind-each-gate-review` — Bind each gate review disposition to its exact received ledger event**                                                                                   | Medium          | Removes silent multi-round lifecycle ambiguity.                                    |
| 1c    | **`BL-260806-fail-closed-when-configured` — Fail closed when configured closeout snapshot is absent**                                                                                          | Medium          | Establishes the invariant required by safe autonomous completion.                  |
| 1d    | **`BL-260711-add-activity-aware-gate` — Add activity-aware gate timeouts** + **`BL-260718-harden-full-surface-gate` — Harden full-surface gate reviews against budget and recursive dispatch** | Medium + Medium | Share gate-execution context and address the remaining reliability scope together. |
| 1e    | **`BL-260718-warn-when-oat-sync-uses` — Warn when oat sync uses a different producing CLI version**                                                                                            | Low             | Turns silent stale-producer skew into an actionable diagnosis.                     |
| 1f    | **`BL-260817-detect-branch-behind-published` — Detect branch-behind-published-main package versions in CI**                                                                                    | Low             | Prevents predictable release-version collisions.                                   |
| 1g    | **`BL-260817-let-resolveassetsroot-honor` — Let resolveAssetsRoot honor OAT_ASSETS_DIR and make smoke asset reads hermetic**                                                                   | Low             | Closes a real parallel test race.                                                  |

**Parallelism:** 1a/1e, 1b/1c, the 1d gate pair, and 1f/1g are four
independent implementation tracks. Serialize overlapping release bumps.

### Wave 2: Receipt and autonomous-closeout foundations

| Order | Item                                                                                                                                                                                                     | Effort       | Rationale                                                                         |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ | --------------------------------------------------------------------------------- |
| 2a    | **`BL-260820-emit-source-qualified` — Emit source-qualified provenance envelopes for review and gate receipts**                                                                                          | Medium       | Creates the shared evidence contract required by integrated freshness.            |
| 2b    | **`BL-260720-add-oat-project-complete-auto` — Add oat-project-complete-auto companion skill for autonomous closeouts**                                                                                   | Medium       | Safe after configured-plus-absent fail-closed behavior and criteria cleanup.      |
| 2c    | **`BL-260819-repair-verified-bundled-skill` — Repair verified bundled skill contract drift** + **`BL-260819-refresh-codex-skill-model` — Refresh codex-skill model routing and repository-check policy** | Medium + Low | One release-shaped skills pass, with the repo-only Codex fix kept scope-distinct. |
| 2d    | **`BL-260817-decide-and-pin-the-system` — Decide and pin the system-Chromium requirement introduced by test:skills on the merge path**                                                                   | Low          | Unlocks CI browser work.                                                          |
| 2e    | **`BL-260727-make-explainer-run-durability` — Make explainer run durability survive ephemeral environments**                                                                                             | High         | Strategic, independent durability project.                                        |

**Parallelism:** receipt schema, completion companion, skills repair, browser
policy, and durability can proceed in separate worktrees; shared package-version
files make merge order explicit.

### Wave 3: Policy and maintenance

| Order | Item                                                                                                                                                                                                                                                                                                                                                     | Effort       | Rationale                                                                                            |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ | ---------------------------------------------------------------------------------------------------- |
| 3a    | **`BL-260711-skip-re-review-for-bookkeeping` — Skip re-review for bookkeeping-only review findings**                                                                                                                                                                                                                                                     | Medium       | Use the stabilized event/receipt taxonomy rather than inventing another one.                         |
| 3b    | **`BL-260818-distinguish-operator-directed` — Distinguish operator-directed review rounds from failed fix cycles in the review-cycle cap**                                                                                                                                                                                                               | Medium       | Add bounded finding-scoped authorization after exact event consumption is stable.                    |
| 3c    | **`BL-260726-validate-structured-output` — Validate structured-output contract in gate skill commands** + **`BL-260712-per-project-override` — Per-project override to disable configured external gates**                                                                                                                                               | Low + Medium | Improve gate configuration before adding scoped overrides.                                           |
| 3d    | **`BL-260817-run-the-rc-explainer-end` — Run the RC explainer end-to-end test in CI with a provisioned browser**                                                                                                                                                                                                                                         | Medium       | Follows the Wave 2 browser decision.                                                                 |
| 3e    | **`BL-260713-root-agent-judgment-logging` — Root-agent judgment logging responsibility for project log**; **`BL-260714-executable-backstops` — Executable backstops for contract claims — authoring guidance**; **`BL-260818-require-repo-wide-call-site` — Require repo-wide call-site sweeps for cross-cutting options in phase-implementer guidance** | Low each     | Bounded workflow-authoring improvements that can share one release window if scopes do not conflict. |
| 3f    | **`BL-260718-fix-oat-docs-generate-index` — Fix oat docs generate-index cwd-relative defaults in monorepos** + **`BL-260818-extend-guarded-prose-contract` — Extend guarded-prose contract tests to docs-app mirrors**                                                                                                                                   | Medium + Low | Independent docs/tooling maintenance.                                                                |

### Wave 4: Dedicated strategic projects

| Order | Item                                                                                                                  | Effort | Rationale                                                                                                      |
| ----- | --------------------------------------------------------------------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------- |
| 4a    | **`BL-260820-track-pr-closeout-evidence` — Track PR-closeout evidence freshness against the current head**            | High   | Implement after the source-qualified receipt contract; absorb or resolve the older broad-freshness evaluation. |
| 4b    | **`BL-260819-classify-canonical-skills-by` — Classify canonical skills by distribution, lifecycle, and tenant scope** | High   | Needs explicit policy design before catalog and sync changes.                                                  |

### Deferred

| Item                                                                                                                  | Re-entry condition                                                                              |
| --------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| **`BL-260706-front-load-recurring-gate` — Front-load recurring gate-finding classes into implementer briefs**         | Stable finding taxonomy plus evidence that recurring-invariant promotion is worth a new ledger. |
| **`BL-260711-add-root-owned-dispatch-broker` — Add root-owned dispatch broker for exact OAT subagent launches**       | Concrete three-tier consumer and fresh host support evidence.                                   |
| **`BL-260718-add-generated-runbook` — Add generated-runbook verification command pass**                               | Safe structured command source and bounded execution design.                                    |
| **`BL-260718-add-oat-wave-lifecycle-cli` — Add oat wave lifecycle CLI command family**                                | Second consumer and stable execution-program contract.                                          |
| **`BL-260718-document-execution-program` — Document execution-program artifact as stable OAT contract**               | Concrete second consumer.                                                                       |
| **`BL-260718-rewrite-worktree-bootstrap` — Rewrite worktree bootstrap-group as tested TypeScript command**            | Wave CLI initiative becomes active.                                                             |
| **`BL-260719-add-pinned-recon-agents` — Add pinned recon agents for reusable orchestration**                          | Demonstrated non-review consumers and generic materialization contract.                         |
| **`BL-260719-evaluate-broader-final-gate` — Evaluate broader final-gate freshness policy after narrow optimization**  | Usage evidence not already subsumed by current-head closeout work.                              |
| **`BL-260724-support-provider-directory` — Support provider directory symlinks as full collection sync**              | Demand justifies the cross-cutting safety work.                                                 |
| **`BL-260726-validate-cursor-pin-effort` — Validate Cursor pin effort rungs at sync time**                            | Authoritative Cursor Task/rung evidence.                                                        |
| **`BL-260728-additional-visual-workflows` — Additional visual workflows**                                             | Observed user demand after golden recovery.                                                     |
| **`BL-260817-drop-explainer-kit-publish` — Drop explainer-kit publish-request/v1 in a future minor**                  | External wrapper confirms V2 and a suitable minor release is scheduled.                         |
| **`BL-260817-verify-protected-mode-public` — Verify protected-mode public URLs with an authenticated end-to-end GET** | Host-bound authentication design and security review.                                           |

---

## 6. Roadmap Alignment

The roadmap names 20 backlog IDs: **19 are still active, one is archived, and
25 active backlog items are not represented**. Most orphans are correctly
standalone maintenance, but six high-priority strategic records now deserve
roadmap placement.

### How active backlog maps to roadmap horizons

| Roadmap horizon | Assessment                          | Backlog items and recommendation                                                                                                                                                                                                                                                                                                                                                                                                                |
| --------------- | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Now             | Partially stale                     | Keep **`BL-260711-add-activity-aware-gate` — Add activity-aware gate timeouts**. Move **`BL-260711-add-root-owned-dispatch-broker` — Add root-owned dispatch broker for exact OAT subagent launches** out of Now until a concrete consumer appears. **`BL-260708-verify-cursor-gpt-5-6-subagent` — Verify Cursor GPT-5.6 subagent model slugs** is overdue but externally blocked; change it from active commitment to a trigger-based recheck. |
| Next            | Broadly aligned, with one stale row | **`BL-260806-fail-closed-when-configured` — Fail closed when configured closeout snapshot is absent**, **`BL-260718-mandatory-skill-load-clause` — Mandatory skill-load clause for lifecycle steps that name skills**, **`BL-260711-skip-re-review-for-bookkeeping` — Skip re-review for bookkeeping-only review findings**, and the release quick wins remain credible. The grouped wave initiative should retain its explicit trigger.        |
| Later           | Aligned                             | **`BL-260706-front-load-recurring-gate` — Front-load recurring gate-finding classes into implementer briefs**, **`BL-260719-add-pinned-recon-agents` — Add pinned recon agents for reusable orchestration**, and **`BL-260728-additional-visual-workflows` — Additional visual workflows** are correctly directional.                                                                                                                           |

### Roadmap gaps and stale references

| Finding                                                                                                                                                            | Recommendation                                                                                                                                                                                                                                                                                                                                                                                                  |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`BL-260718-remove-post-w6-reviews-row` — Remove post-W6 reviews-row restore watch** remains in the Next wave-workflow group even though it closed on 2026-07-20. | Remove the stale roadmap reference.                                                                                                                                                                                                                                                                                                                                                                             |
| No live roadmap initiative lacks a backlog record.                                                                                                                 | No new item is required solely for roadmap coverage.                                                                                                                                                                                                                                                                                                                                                            |
| The roadmap does not reflect the newly accepted lifecycle reliability work.                                                                                        | Add **`BL-260820-bind-each-gate-review` — Bind each gate review disposition to its exact received ledger event**, **`BL-260820-emit-source-qualified` — Emit source-qualified provenance envelopes for review and gate receipts**, and **`BL-260820-track-pr-closeout-evidence` — Track PR-closeout evidence freshness against the current head** in dependency order.                                          |
| Three other high-priority orphans are operationally material.                                                                                                      | Add **`BL-260718-harden-full-surface-gate` — Harden full-surface gate reviews against budget and recursive dispatch**, **`BL-260720-add-oat-project-complete-auto` — Add oat-project-complete-auto companion skill for autonomous closeouts**, and **`BL-260727-make-explainer-run-durability` — Make explainer run durability survive ephemeral environments** after their readiness conditions are addressed. |

### Orphans: active backlog items not on the roadmap

| Recommendation                                      | Backlog items                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Add to Now/Next after readiness cleanup             | **`BL-260718-harden-full-surface-gate` — Harden full-surface gate reviews against budget and recursive dispatch**; **`BL-260720-add-oat-project-complete-auto` — Add oat-project-complete-auto companion skill for autonomous closeouts**; **`BL-260727-make-explainer-run-durability` — Make explainer run durability survive ephemeral environments**; **`BL-260820-bind-each-gate-review` — Bind each gate review disposition to its exact received ledger event**; **`BL-260820-emit-source-qualified` — Emit source-qualified provenance envelopes for review and gate receipts**; **`BL-260820-track-pr-closeout-evidence` — Track PR-closeout evidence freshness against the current head**.                                                                                                                                                                                                                                                                                                                                                                                                       |
| Keep as standalone maintenance                      | **`BL-260713-root-agent-judgment-logging` — Root-agent judgment logging responsibility for project log**; **`BL-260714-executable-backstops` — Executable backstops for contract claims — authoring guidance**; **`BL-260718-fix-oat-docs-generate-index` — Fix oat docs generate-index cwd-relative defaults in monorepos**; **`BL-260718-warn-when-oat-sync-uses` — Warn when oat sync uses a different producing CLI version**; **`BL-260726-validate-structured-output` — Validate structured-output contract in gate skill commands**; **`BL-260818-bound-the-smoke-cleanup` — Bound the smoke cleanup SIGTERM harness with a timeout**; **`BL-260818-extend-guarded-prose-contract` — Extend guarded-prose contract tests to docs-app mirrors**; **`BL-260818-require-repo-wide-call-site` — Require repo-wide call-site sweeps for cross-cutting options in phase-implementer guidance**; **`BL-260819-refresh-codex-skill-model` — Refresh codex-skill model routing and repository-check policy**; **`BL-260819-repair-verified-bundled-skill` — Repair verified bundled skill contract drift**. |
| Add to Now as in-flight                             | **`BL-260729-implement-reviewplan-first` — Implement ReviewPlan-first reviewer workflow**; finish draft PR #190 and reconcile Stage A with the full backlog criteria.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Add only if promoted to a committed initiative      | **`BL-260718-add-generated-runbook` — Add generated-runbook verification command pass**; **`BL-260724-support-provider-directory` — Support provider directory symlinks as full collection sync**; **`BL-260726-validate-cursor-pin-effort` — Validate Cursor pin effort rungs at sync time**; **`BL-260818-distinguish-operator-directed` — Distinguish operator-directed review rounds from failed fix cycles in the review-cycle cap**; **`BL-260819-classify-canonical-skills-by` — Classify canonical skills by distribution, lifecycle, and tenant scope**.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Merge, rewrite, or archive before roadmap placement | **`BL-260718-support-fumadocs-in-oat-docs` — Support Fumadocs in oat docs nav sync (currently MkDocs-only)**; **`BL-260719-evaluate-broader-final-gate` — Evaluate broader final-gate freshness policy after narrow optimization**; **`BL-260725-classify-general-sync-owned` — Classify general sync-owned dirt in project-start preflight**.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |

---

## 7. Observations & Recommendations

### Strategic observations

1. The backlog is large but not unhealthy: **15 of 44 items are intentionally
   deferred**, and most have sensible re-entry triggers. The problem is that
   active-file status does not distinguish committed work from parked options.
2. **`BL-260729-implement-reviewplan-first` — Implement ReviewPlan-first
   reviewer workflow** is already in flight through draft PR #190, so finishing
   and reconciling it outranks starting another overlapping review project.
3. The newest GitHub conversions form one dependency chain rather than three
   parallel projects: exact event binding, then common receipt provenance, then
   integrated closeout freshness.
4. The three skills-corpus records are not equal in urgency. The Codex guidance
   refresh is a bounded safety fix, the four verified mismatches are a release
   batch, and the catalog classification is policy-heavy discovery.
5. A backlog-maintenance pass will create more execution value than starting a
   twelfth project: normalize 11 placeholder criteria, set three estimates,
   remove one stale roadmap row, and decide two obsolete/deferred records.
6. Operator capacity is scope-weighted rather than lane-count-based: ReviewPlan
   completion and OAT plugin discovery are the two large in-flight commitments.
   Until one clears, prioritize recently encountered S/M defects and avoid new
   large feature starts.

### Risks

| Risk                                                                                   | Mitigation                                                                                                |
| -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Large strategic records start before their narrower foundations and duplicate schemas. | Follow D1–D3 and require the receipt/event contracts to be reused.                                        |
| Placeholder acceptance criteria permit scope drift during implementation.              | Complete Wave 0 before generating kickoff handoffs for affected items.                                    |
| Multiple skill changes collide on version bumps and lockstep public-package files.     | Sequence those PRs or intentionally batch compatible changes into one release-shaped project.             |
| Roadmap “Now” overstates externally blocked or fallback-covered work.                  | Move broker work to conditional Later and make the Cursor probe trigger-based.                            |
| The PJM doctor false-positive could archive a still-open asset-race item.              | Treat completion-log IDs as record keys only in the canonical entry field, not anywhere in summary prose. |

### Quick wins to tackle immediately

1. **`BL-260718-mandatory-skill-load-clause` — Mandatory skill-load clause for
   lifecycle steps that name skills** (Low effort; workflow-integrity guard).
2. **`BL-260718-warn-when-oat-sync-uses` — Warn when oat sync uses a different
   producing CLI version** (Low effort; recurring stale-tool diagnosis).
3. **`BL-260817-detect-branch-behind-published` — Detect
   branch-behind-published-main package versions in CI** (Low effort; release
   collision prevention).
4. **`BL-260817-let-resolveassetsroot-honor` — Let resolveAssetsRoot honor
   OAT_ASSETS_DIR and make smoke asset reads hermetic** (Low effort after
   criteria cleanup; real parallel-test race).
