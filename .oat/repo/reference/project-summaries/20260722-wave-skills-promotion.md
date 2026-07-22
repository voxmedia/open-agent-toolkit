---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-07-21
oat_generated: false
oat_summary_last_task: prev5-t01
oat_summary_revision_count: 5
oat_summary_includes_revisions: [p-rev1, p-rev2, p-rev3, p-rev4, p-rev5]
---

# Summary: wave-skills-promotion

## Overview

The stoa repo dogfooded two wave-orchestration skills — `oat-wave-execute`
and `oat-wave-program` — across a six-PR, 48-plan execution program (waves
0–5), hardening them until every standing rule was evidence-cited in a
signal ledger. This project upstreamed both skills into the OAT toolkit's
workflow pack so any repo can install them, applying the queued
evidence-backed change backlog and dispositioning the CLI-absorption list,
under a zero-regression bar: stoa's wave 6 ran on the promoted skills and
returned a zero-regression acceptance pass (11/11 lanes), with an Orc
4-wave autonomous program as an independent second consumer.

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
- **Explainer integration (p06, RC-gated):** program-recap recipe
  (`explainer-kit.recipe/v1`), schema-exact optional close-callers in both
  skills (inert without the explainer), an installable
  personal-explainer-kit acceptance scaffold (six-gate `acceptance.mjs`,
  sanitized wrapper evidence), executed against the frozen then final RC —
  all six wrapper gates passed. The interim recipe copy was re-homed to the
  merged explainer registry once explainer-kit reached main.
- **Post-promotion hardening (five revision phases):** final skill versions
  `oat-wave-execute` 1.7.1 / `oat-wave-program` 1.3.1, lockstep 0.2.12,
  driven by three independent consumers (PR review, stoa W6, Orc 4-wave
  autonomous program) — see Revision History.

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
- **Program-scope recap, not per-wave:** recap generation defaults to
  program close from the reconciled program artifact; per-wave recaps are
  explicit-request only, with skip dispositions recorded so discretion is
  distinguishable from oversight.
- **Recap callers own prose authoring** (W6 evidence): the explainer
  pipeline validates structure and facts but nothing in it owns prose
  quality; unattended recap builds require a caller-supplied authoring
  path — now enforced upstream by the explainer author seam.
- **`-auto` companion deferred with a three-layer firing guard**
  (`BL-260720-add-oat-project-complete-auto`): autonomous closeout must be
  opt-in per program, human-checkpointed at program end, and never fire
  from task-completion alone.

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
- **The first live unattended recap pasted raw artifacts as deck prose**
  (stoa W6, run-19af6e55): every structural gate passed while
  implementation.md rode in verbatim, frontmatter included. Root cause: no
  seam owned prose quality. Fixed on both sides — caller-ownership rules in
  the wave skills (p-rev5) and an enforced author callback in the
  explainer core.
- **Cross-machine RC verification surfaced real nondeterminism:** a
  pristine rebuild of the explainer RC differed in exactly three generated
  `.d.ts` files (declaration ordering) and a commit hook reformatted the
  provenance copies; resolved with extension-neutral raw copies and
  acceptance pinned to recorded tarball bytes.

## Revision History

- **p-rev1 (PR #158 Bugbot, 4 Medium):** fixture grep tightening,
  sync-commit failure status, unquoted `$FILES` removal, stale p06 state
  prose — all root-fixed same day.
- **p-rev2 (stoa W6 migration report):** the real installer defect of the
  arc — `npm pack` strips file modes, so `oat tools update` installed
  `bootstrap-group.sh` non-executable; fixed with explicit `chmod 0755` on
  both install paths (RED→GREEN), runbook hardened, lockstep 0.2.1.
- **p-rev3 (Orc 4-wave autonomous program, signals 1–10):** gate rows are
  terminal only at `passed` (S8); same-shell compound merge guards,
  append-only fix rounds, `--no-commit` probe (S5/S7); worktree commit
  fallback, background gate posture, `pipefail`, single-writer artifacts
  (S1–S4); CI-waiver rule, optional-step disposition; versions 1.7.0/1.3.0.
- **p-rev4 (operator program-boundary design):** recap becomes
  program-scope with per-wave deferral dispositions recorded in the
  program ledger; autonomous archive-tail deferral with one human-gated
  program-end checkpoint; versions 1.7.1/1.3.1.
- **p-rev5 (W6 recap-defects handoff):** caller-owns-prose-authoring
  paragraphs in both recap-caller sections with live W6 evidence; the
  "seam pending upstream" citation was replaced with the concrete shipped
  author contract once explainer PR #170 merged.

## Explainer Outcome

- **project-recap:** built-not-durable —
  [.oat/repo/reference/project-recaps/20260722-wave-skills-promotion](https://github.com/voxmedia/open-agent-toolkit/tree/wave-skills-promotion/.oat/repo/reference/project-recaps/20260722-wave-skills-promotion) (run-ea0647db;
  Opus-authored via the enforced author seam; default clean-neutral style;
  durability attestation follows at completion bookkeeping)

## Follow-up Items

- `BL-260718-add-oat-wave-lifecycle-cli` — wave CLI family (grouped with
  `BL-260718-document-execution-program` and
  `BL-260718-rewrite-worktree-bootstrap`)
- `BL-260720-add-oat-project-complete-auto` — autonomous-closeout
  companion with the three-layer firing guard (priority demotion parked
  with the operator)
- `BL-260718-harden-full-surface-gate`, `BL-260718-add-generated-runbook`,
  `BL-260718-warn-when-oat-sync-uses` — upstream triage outcomes
- `BL-260718-fix-oat-docs-generate-index`,
  `BL-260718-support-fumadocs-in-oat-docs` — docs-CLI defects found live
- `BL-260718-mandatory-skill-load-clause` — lifecycle steps that name
  skills must load them (evidence-enriched during this project)
- npm publish of the promoted versions (publish-hold released with the
  final RC acceptance; publish is operator-owned)
- Pre-existing `oat pjm doctor` baseline failure (10 older records,
  template frontmatter) — observed, out of scope, not yet filed.

_Closed during the project:_ `BL-260718-remove-post-w6-reviews-row`
(W6 observation clean, watch retired), stoa W6 acceptance
(zero-regression pass, 11/11 lanes), explainer-kit RC promotion
(final RC fully accepted; both W6 recap defects fixed in the merged
explainer batch).
