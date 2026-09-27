---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-09-27
oat_generated: true
oat_summary_last_task: p04-t04
oat_summary_revision_count: 0
oat_summary_includes_revisions: []
---

# Summary: triage-correctness-wave

## Overview

A full review of the 114 active backlog items on 2026-09-26 selected nine
already-verified correctness defects and bounded enhancements that each had
explicit acceptance criteria and triage evidence. The operator approved them as
one wave on `wave/2026-09-26-backlog`, shipped as a single PR, plus archiving
`BL-260908-restore-recon-s-cheap-fan-out`, whose close condition (PR #285) had
already been met.

## What Was Implemented

Four phases, 23 tasks. p01 and p02 ran in parallel worktrees because their
write sets did not overlap. p03 and p04 ran after them, one at a time.

- **Provider detection script:** `resolve-providers.sh` no longer exits 1 with
  no output when the last auto-detect test is false, which happened in any
  repository without `.cline/` or a sync config. Interactive mode now survives
  end of input.
- **Retro final report:** `oat-project-retro` requires a per-item walkthrough
  of the register in its final report, including non-interactive runs and an
  empty register.
- **Gate dispatch audit line:** gate-originated reviews label the resolver
  stamp `**Dispatch audit (policy view):**`. `oat gate review` rejects an
  unlabeled stamp that disagrees with the gate frontmatter
  (`gate_dispatch_audit_mismatched`). It finds the stamp by its shape and
  ignores finding sections.
- **Canonical rules:** parse errors name the repository-relative file in all
  three provider transforms, and one sync run reports every invalid rule.
  `alwaysApply: true` is accepted as an alias for `activation: always`.
- **Sync reporting:** `oat sync --scope all` never prints
  `No changes required.` next to a failed scope, and sync evidence validates
  catalog-refresh policy states against the registry instead of casting.
- **Config writes:** `.oat/config.json` writes keep the existing key order,
  and a write that changes nothing leaves the file byte-identical. The strict
  `pjm.remote` reader rejects wrong-typed nested values.
- **Managed Claude dispatch record:** `oat project dispatch record` reports
  every independent input violation in one run, covering derived, missing,
  forbidden, unredacted, event, and runtime-observation errors. It names any
  checks it had to skip, states the expected pattern for path and digest
  errors, and scrubs secret-shaped values from every violation line. A new
  read-only `oat project dispatch canonical-role` command produces
  canonical-role-resolution evidence. `oat-dispatch-subagents` now ships a
  validated `managed-claude-example.json` for the implementer and reviewer
  roles, and a test pins it. `oat-project-implement` points to the command and
  the example instead of placeholders.
- **Release and backlog:** all five lockstep public packages went to 0.3.8,
  and ten backlog items were archived with `oat backlog archive`.

The full Definition of Done, plus `lint` and `format`, passed at `a90da4f49`
with each exit code captured; forced tests under an isolated HOME ran CLI 7685,
smoke 163, and skills 657.

## Key Decisions

- **Accept `alwaysApply` as a canonical rule activation alias:** canonical rule
  parsing treats `alwaysApply: true` as `activation: always`, matching the
  existing Cursor importer. Every other parse error names the file. This was
  chosen over warn-and-skip because the alias keeps a rule the author clearly
  meant to apply, and errors that name the file cover rules that are actually
  invalid.
- **Label the gate dispatch audit stamp as the policy view:** gate-originated
  reviews label the resolver's stamp `**Dispatch audit (policy view):**`
  rather than building a second stamp from the gate invocation. Validation
  rejects an unlabeled stamp that disagrees with the gate. The label keeps the
  `Dispatch:` token, so only one extraction path exists.
- **Preserve config key order and skip no-op writes:** `.oat/config.json`
  writes keep the existing key order. A write that changes nothing leaves the
  file untouched. A real change must not reorder keys it did not touch.
- **Report dispatch-record violations in one redacted message:** managed
  Claude dispatch-record validation collects every violation into a single
  scrubbed multi-line error instead of adding a new `violations` JSON field.
  The published example is pinned by validating it as-is. Whether to keep the
  per-dispatch journal stays with `BL-260909-give-the-dispatch-record`.

## Design Deltas

- **Audit-line recognition widened:** p01-t03 used the backlog item's labeling
  branch. Review then widened stamp recognition to every section that is not a
  finding section (p01-t04, p01-t05).
- **Dead `failed === 0` conjunct removed:** after p02-t02, no output depended
  on the conjunct in sync `restampOnly`, so p02-t06 (L1) removed it.
  `BL-260909-make-oat-sync-scope-all-report` AC2 ("a test pins the conjunct")
  is met by a multi-scope outcome test plus the removal, not literally. A test
  that cannot fail is not a pin.
- **Registry export outside the p02 write set:** `providers/shared/registry.ts`
  now exports `isValidCatalogRefreshPolicy`, so sync evidence reuses the
  registry's validation instead of a weaker copy (p02-t06 L3). p01 never
  touched the file, so the parallel group still had no overlapping writes.
- **Scrub moved to the error-class owner:** the p03-t07 fix scrubs each
  violation before joining. It lives in `providers/claude/dispatch-envelope.ts`,
  outside the task's listed files.

## Notable Challenges

- **Secret echo in the new single-run report:** the p03 review found a High.
  Rejected enum values such as `recordBase.launch_status` could echo a `ghp_`
  token into the combined error. p03-t06 added scrubbing in the shared
  redaction step, and removing it fails 6 tests. p03-t07 then scrubbed each
  line separately so an unterminated private key cannot hide later lines.
- **Composition recovery p03-rec-01:** a `record-schema.md` field-list line
  naming `runtime_confirmation` matched the autonomy-gate inventory's
  prompt-site scan in the full CLI suite. One recovery attempt (`c4ef806fb`)
  mapped it as `NG` in `.agents/docs/autonomy-contract.md`.
- **Plan gate convergence:** the auto plan review ran three rounds. The Codex
  quick-start gate then needed three attempts: two Mediums were received, a
  complexity review simplified four tasks, and the gate re-ran because those
  were material plan changes. The p02 phase gate and the mistyped base SHA are
  covered under Autonomous Execution Learnings.

## Tradeoffs Made

- **No repair reader for `pjm.remote`:** config reads fail closed (exit 1) on
  wrong-typed leaves, as they already did for unknown keys. The repair is to
  edit the file. The complexity review dropped a dedicated repair path.
- **Rollout coupling:** once released, `gate_dispatch_audit_mismatched` can
  fail gate reviews from older installed `oat-project-review-provide` copies
  until `oat tools update` runs; this wave's own gates were not subject to it.

## Autonomous Execution Learnings

### Agent-instruction updates

- Scope `oat-worktree-bootstrap-auto` Step 4 sync to `--scope project` for
  phase worktrees. Its `oat sync --scope all` rewrites user-scope provider
  directories, and the repository's `pnpm run worktree:init` was enough.
  ([2026-09-27T05:10:00Z — decision — Worktree bootstrap used the repository init without all-scope sync](oat-execution-learnings.md))
- Fill `phase_base_head` and `expected_base_sha` only by pasting
  `git rev-parse HEAD` output. A hand-expanded short SHA named a nonexistent
  commit and cost one p02 round trip.
  ([2026-09-27T05:20:00Z — gotcha — Root hand-expanded a short SHA into the phase scope](oat-execution-learnings.md))

### Code follow-ups

- Have gate post-selection recovery report a missing route receipt as its own
  named cause, and have the gate prompt restate the route step. Right now,
  when the reviewer skips the step, the failure surfaces as "Branch-local gate
  route did not return JSON." Workflow Observations holds the matching p02
  structural entry.
  ([2026-09-27T05:55:00Z — gotcha — Gate reviewer skipped the headless route step, so the gate failed after a clean review](oat-execution-learnings.md))
- Land the shared hook-safe exact-path commit primitive
  (`BL-260927-share-one-hook-safe-exact-path`, GitHub #306). Scaffold commits
  still leave `state.md` reformatted by the hook but uncommitted. Until it
  lands, verify the tree is clean after every commit the CLI makes.
  ([2026-09-27T04:05:00Z — gotcha — Scaffold commit leaves state.md hook-reformatted but uncommitted](oat-execution-learnings.md))

### Workflow issues

- After the release, run `oat tools update` before running gates, so reviewers
  write the policy-view label the new audit check expects. This is
  environment-limited: this wave's gates resolved through the global 0.3.7 CLI.
  ([2026-09-27T05:45:00Z — environment-limited — Phase gates run the released CLI, not the branch build](oat-execution-learnings.md))
- Check the selected gate target in each gate result's structured output.
  Cross-family routing here depended on priority order and same-family
  avoidance, not on an explicit `--target`.
  ([2026-09-27T04:05:00Z — decision — Wave setup choices](oat-execution-learnings.md))

## Follow-up Items

- **Linux CI:** the util-linux `script` branch of the resolve-providers EOF
  test has not run locally. It first runs on the PR's Linux CI. If it fails
  there, restrict it to macOS rather than weakening the assertion.
- **Deferred audit-line Low (p01-t05):** two shapes are still read as audit
  lines: a blockquote line containing a backtick-wrapped stamp, and a bullet
  under a flat `## High` heading. A probe of 137 local gate artifacts found no
  false failures. Revisit this if a real artifact trips on either shape.
- **Dispatch journal:** whether to keep or remove the per-dispatch journal is
  still owned by `BL-260909-give-the-dispatch-record`.

## Associated Issues

Archived in p04-t02 (`a90da4f49`):

- `BL-260927-stop-resolve-providers-sh-from` (GitHub #324)
- `BL-260927-make-the-managed-claude` (GitHub #326)
- `BL-260927-name-the-file-in-canonical` (GitHub #316)
- `BL-260927-derive-or-label-the-dispatch` (GitHub #325)
- `BL-260927-require-a-per-item-walkthrough` (GitHub #313, #297)
- `BL-260927-preserve-oat-config-json-key` (GitHub #329, #311)
- `BL-260909-reject-malformed-nested-values`
- `BL-260909-make-oat-sync-scope-all-report`
- `BL-260908-validate-the-catalog-refresh`
- `BL-260908-restore-recon-s-cheap-fan-out` (reconciled; shipped by PR #285)

## Explainer Outcome

- Project recap: `built` (host browser rung, visual verdict pass), run
  `78ed8b36-8c9f-432b-8c46-38061c180065`, package
  `explainers/triage-correctness-wave-recap/manifest.json`.

## Workflow Observations

### 2026-09-27 · structural · oat gate review · plan

target=codex-6-sol-xhigh threshold=high findings=critical:0,high:0,medium:2,low:0 exit=0 status=ok artifact=.oat/projects/shared/triage-correctness-wave/reviews/artifact-plan-review-2026-09-27T043735Z.md run=cfbed9d4-31b9-4c43-b9b6-ab39c958f7d9

### 2026-09-27 · structural · oat gate review · plan

target=codex-6-sol-xhigh threshold=high findings=critical:0,high:0,medium:0,low:0 exit=0 status=ok artifact=.oat/projects/shared/triage-correctness-wave/reviews/artifact-plan-review-2026-09-27T044626Z.md run=6f15dc62-3341-4492-a28b-20f304d4c79d

### 2026-09-27 · structural · oat gate review · plan

target=codex-6-sol-xhigh threshold=high findings=critical:0,high:0,medium:0,low:0 exit=0 status=ok artifact=.oat/projects/shared/triage-correctness-wave/reviews/artifact-plan-review-2026-09-27T045257Z.md run=7eea2a8f-4bd2-4aba-a786-621c59a9bf71

### 2026-09-27 · structural · oat gate review · p01

target=codex-6-sol-xhigh threshold=high findings=critical:0,high:0,medium:0,low:0 exit=0 status=ok artifact=.oat/projects/shared/triage-correctness-wave/reviews/p01-review-2026-09-27T053801Z.md run=2d553f20-46af-49e9-bb41-e979d2e1425e

### 2026-09-27 · structural · oat gate review · p02

target=codex-6-sol-xhigh threshold=high exit=1 status=review_failed run=ee0f0803-ba85-415f-9e55-719351c330a7

### 2026-09-27 · structural · oat gate review · p02

target=codex-6-sol-xhigh threshold=high findings=critical:0,high:0,medium:0,low:0 exit=0 status=ok artifact=.oat/projects/shared/triage-correctness-wave/reviews/p02-review-2026-09-27T054914Z.md run=4bd88e02-140b-4a6a-bfaa-7363d2102e87

### 2026-09-27 · structural · oat gate review · p03

target=codex-6-sol-xhigh threshold=high findings=critical:0,high:0,medium:1,low:0 exit=0 status=ok artifact=.oat/projects/shared/triage-correctness-wave/reviews/p03-review-2026-09-27T064005Z.md run=010e23d8-6317-4ca5-b397-73346cf8caf1

### 2026-09-27 · structural · oat gate review · p04

target=codex-6-sol-xhigh threshold=high findings=critical:0,high:0,medium:0,low:0 exit=0 status=ok artifact=.oat/projects/shared/triage-correctness-wave/reviews/p04-review-2026-09-27T070131Z.md run=5b4674f7-7d07-47cb-a565-016f403199ef

### 2026-09-27 · structural · oat gate review · final

target=codex-6-sol-xhigh threshold=high findings=critical:0,high:0,medium:0,low:1 exit=0 status=ok artifact=.oat/projects/shared/triage-correctness-wave/reviews/final-review-2026-09-27T071850Z.md run=3d23848e-208f-4b8f-96a9-9ea83c666bbf
