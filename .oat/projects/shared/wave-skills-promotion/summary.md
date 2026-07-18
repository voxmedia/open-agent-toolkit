---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-07-18
oat_generated: false
oat_summary_last_task: p05-t05
oat_summary_revision_count: 0
oat_summary_includes_revisions: []
---

# Summary: wave-skills-promotion

_Covers the phases 1–5 mergeable delta. Phase 6 (explainer-kit integration)
is RC-gated and will extend this summary when it ships._

## Overview

The stoa repo dogfooded two wave-orchestration skills — `oat-wave-execute`
and `oat-wave-program` — across a six-PR, 48-plan execution program (waves
0–5), hardening them until every standing rule was evidence-cited in a
signal ledger. This project upstreamed both skills into the OAT toolkit's
workflow pack so any repo can install them, applying the queued
evidence-backed change backlog and dispositioning the CLI-absorption list,
under a zero-regression bar: stoa's wave 6 runs on the promoted skills as
acceptance evidence.

## What Was Implemented

- **`oat-wave-execute` 1.5.0 and `oat-wave-program` 1.1.0** as canonical
  workflow-pack skills: verbatim port (byte-verified) followed by three
  traceable edit passes — the six §2 queue items (one commit each: scaffold
  verify-only, pre-merge cwd/branch asserts, provider-view parity guard +
  sync-commit inspection, named fan-in gate rule, stored verification
  records for fix dispositions, resumed-handle preference), a
  genericization pass under a 75-row behavioral-equivalence checklist, and
  toolkit-convention alignment recording the 1.4.1+1.5.0 release-collapse.
- **Toolkit integration:** pack manifest + bundle registration, provider
  views (claude/cursor symlinks; codex native-read), and a real installer
  bug fix the port exposed — `copyDirectory` now preserves file modes
  (fresh installs previously stripped execute bits from nested skill
  scripts; two regression tests).
- **Asset-level genericization:** the bundled wrapper/orchestration-log
  templates use instantiation placeholders (stoa commands kept as labeled
  examples) and `bootstrap-group.sh` gained conditional env setup plus
  `OAT_WAVE_BOOTSTRAP_CMD`/`OAT_WAVE_BASELINE_CMD` hooks with pnpm-shaped
  detection — validated in pnpm-shaped, hook-set, and non-pnpm fixture legs.
- **Dispositions:** validate-plan documents the singleton-group rule +
  ungrouped alternative; 12 durable backlog dispositions covering every
  packet §3 row, upstream-feedback triage (2 closed-as-fixed after
  independent verification, 3 filed with fresh evidence), and 2 docs-CLI
  defects found live during execution.
- **Docs:** a wave-workflow page (program layer, mechanical/judgment split,
  lifecycle composition, descriptive-not-contract artifact format).
- **Validation + release:** a bash-3.2 mini-wave fixture with a
  toggleable-fail DoD gate, an executed dry-run (happy + unhappy legs, zero
  promoted-skill defects), lockstep 0.1.73 → 0.2.0 public-package bumps,
  and a W6 handoff mini-runbook (version pin, migration sequence, row-stomp
  observation task, regression protocol).

## Key Decisions

- **Port-first, defer-heavy:** the wave CLI command family and a TypeScript
  bootstrap-group rewrite were deferred to owned backlog items so stoa W6
  validates one change (packaged skills), not two.
- **Neutral-phrasing genericization** (no config schema): rules refer to
  "the repo's DoD gates / formatter / env setup" with stoa specifics as
  cited evidence; asset templates use instantiation placeholders.
- **Names kept** (`oat-wave-*`): "wave" is its own domain above the
  per-project lifecycle; artifact format documented descriptively with
  contract status deferred to a second consumer.
- **Versioning continues stoa's lineage** (1.5.0/1.1.0) so signal-ledger
  citations resolve; the queued 1.4.1+1.5.0 collapse is recorded.
- **HiLL `final` interpreted per mergeable delta** (`['p05','p06']`) since
  the plan-final p06 is RC-gated and cannot complete in this run.
- **Tracked-config guard rejected** (archived `wont_do`): the sync-thrash
  class was root-caused to a stale locally-resolved CLI shadowing the
  global; dependency hygiene in the consuming repo is the cure.

## Design Deltas

- p02-t09 re-sync was a verified no-op — provider views are symlinks, so
  skill-text edits flow through without view diffs.
- The equivalence checklist was originally prose-scoped; the final review
  caught stoa-toolchain requirements surviving in bundled assets (Critical)
  and the checklist was extended with six asset rows (EX-A01..A06).
- 24 oat-managed cursor dispatch-variant roles (supported-catalogue
  materializations from `oat sync` on CLI 0.1.73) ride this branch as
  managed sync state, disclosed in the Final Summary.

## Notable Challenges

- **Independent review caught what self-checks missed, five for five:**
  every phase failed round 1 on exactly one finding — installer
  mode-stripping (implementer's own execute-bit check had validated the
  bundle copy, not the installed copy), an over-deleted provenance
  citation, missing backlog owners, a judgment-attribution error in docs,
  and a root-side bookkeeping gap. All fixed via resumed-handle
  continuations; round 2 passed cleanly each time.
- **Gate-tooling friction generated its own evidence:** full-surface plan
  gates exceeded the 900s budget at max effort (delta-scoping was the fix)
  and a gate prompt naming a reviewer-dispatching skill recursed into
  concurrent nested runs — both folded into the filed gate-hardening
  backlog item.

## Follow-up Items

- `BL-260718-add-oat-wave-lifecycle-cli` — wave CLI family (grouped with →)
- `BL-260718-document-execution-program` — artifact format as stable
  contract (trigger: second consumer)
- `BL-260718-rewrite-worktree-bootstrap` — TypeScript bootstrap-group
- `BL-260718-remove-post-w6-reviews-row` — closes on W6 observation
- `BL-260718-harden-full-surface-gate`, `BL-260718-add-generated-runbook`,
  `BL-260718-warn-when-oat-sync-uses` — upstream triage outcomes
- `BL-260718-fix-oat-docs-generate-index`,
  `BL-260718-support-fumadocs-in-oat-docs` — docs-CLI defects found live
- Phase 6 (explainer integration, 4 tasks) — blocked on the explainer-kit
  v1 RC; gate-open contract: plan revision + phase re-review, merge-order
  coordination with explainer-kit Phase 3, separate minor version bumps.
- Stoa W6 acceptance run per `references/w6-handoff-runbook.md` after the
  0.2.0 release (operator-coordinated).
- Pre-existing `oat pjm doctor` baseline failure (10 older records,
  template frontmatter) — observed, out of scope, not yet filed.
