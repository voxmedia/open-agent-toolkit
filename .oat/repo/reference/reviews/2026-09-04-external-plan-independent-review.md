---
oat_generated: false
oat_review_record: true
subject: external-plan corpus (31 plans, W1–W6) in the 2026-08-31 execution program
reviewed_at: 2026-09-04
baseline: 6b9a15841 (origin/main after PR #259)
---

# Independent review of the external-plan corpus

The plans were authored by one model across several sessions. This review ran
after Cursor Bugbot caught the same seam defect three times on successive PRs
(a shared write surface recorded on only one side of a plan pair), so the
author was not trusted to self-review. Five read-only lanes ran in parallel
with one shared checklist: verify at least three evidence anchors per plan on
the working tree, check every verify command and pattern-test citation, judge
scope and STOP specificity, extract each plan's write surface and compare it
with sibling plans and the program's group placement, check
`oat_execution_status` and landing-event rows against draft PR #190's file
list, and judge whether each plan is one shippable outcome.

| Lane | Reviewer                        | Plans                                                                                                                                                                |
| ---- | ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A    | Codex (`codex exec`, read-only) | W1 and W4: docs-index paths, asset validation, asset errors, docs-index exclusions, gate override, manifest restamps, dispatch stamp                                 |
| B    | Codex                           | W2 and W3: bundled-skill repair, anaphora guard, docs-mirror guard, named-skill loading, patch-and-restore, call-site sweeps, smoke journaling, executable backstops |
| C    | Codex                           | W6: provider reachability, review-ledger paths, `__proto__` keys, skill version, provider-view diagnostic                                                            |
| D    | Claude                          | W5 groups 1–2: gate recovery, instruction-sync pointers, quick-resume routing, index-lock retry, config unset, skill-script validation                               |
| E    | Claude                          | W5 groups 3–5: readiness contract, autonomous recap, active-pointer deferral, terminal status, consolidation sweep                                                   |

A mechanical seam audit (every plan's in-scope files intersected pairwise
against the dependency tables) ran before the lanes and again after the
fixes; it found ten unrecorded pairs before and none after.

## Findings applied

- **Lockstep release files (every lane, Critical).** All 31 plans listed the
  five public package manifests and the lockfile as in-scope writes, which
  made every parallel group a shared-write violation. The program already
  said fan-in owns the bump; the plans now say it too: no lane edits the
  manifests, `packages/cli/assets/public-package-versions.json`, or
  `pnpm-lock.yaml`; the wave fan-in makes one bump.
- **Reciprocal never-parallel rows (all lanes).** Added on both sides for
  docs-index ↔ exclusions, readiness ↔ skill-script, recap ↔ consolidation,
  recover ↔ unset (`cli-reference.md`), instruction-sync ↔ unset,
  repair ↔ named-skill, named-skill ↔ patch-and-restore,
  patch-and-restore ↔ call-site sweeps, plus the ten pairs the audit found.
  The recover ↔ retry rows now name the `workflow-gates.md` tables as a
  non-disjoint seam.
- **Active-pointer deferral (lane E, Critical).** The plan told the guard to
  retain the pointer for local archive completions; local scope is never
  durable (`IS_DURABLE_PROJECT` is true only for shared and synced), so that
  would strand pointers. The guard now keys on
  `SHOULD_ARCHIVE && IS_DURABLE_PROJECT`, the test matrix expects local to
  clear, and the new validator is named so it cannot be confused with the
  existing `validate-nonarchive-lifecycle-receipt.mjs`.
- **Terminal status (lane E, Important).** Widening phase headings alone
  would not fix the cited `## Revision Phase p-revN:` case because task
  attribution also compares dialect and `parseTaskHeading` does not zero-pad.
  The plan now normalizes dialect and padding on both sides of the guard.
- **Docs-index paths (lane A, Critical).** The plan claimed config names
  `apps/oat-docs/docs`; the config sets `documentation.root` to
  `apps/oat-docs` while the reference example uses a docs source directory.
  The plan now pins a derivation rule (`<root>/docs` when it exists and
  `<root>` is not itself a docs tree), records it in output and docs, adds a
  STOP for an unresolvable root, and makes the wrapper propagate the
  `CliError` exit code it documents.
- **Recap plan (lane E, Medium).** Its optional config-key step was the sole
  source of three cross-lane seams; it moved to
  `BL-260904-add-recap-seam-config-keys`.
- **Consolidation sweep (lane E, Important).** The completion skill ships to
  repositories without PJM; the sweep now checks `oat pjm doctor` adoption and
  degrades, and autonomous completion records findings as warnings.
- **Decision-record steps (lane C, Important).** Every step that creates a
  decision record now names the PJM adoption precondition, the decisions
  guide, `oat decision new`, and index regeneration.
- **Review-ledger guard (lane C, Important).** Placed before Step 5 splits
  into its two `gh pr create` paths; the unrelated `:1538` pattern citation
  replaced; the autonomy-contract mirror is a symlink, so the landing row no
  longer asks for a copy.
- **Landing-event tables (lanes A, D, E).** Added to every 2026-08-30 plan
  with a PR #190 verdict; existing rows now list the in-scope docs pages
  and config command PR #190 also touches (`picking-up-projects.md`,
  `lifecycle.md`, `configuration.md`, `cli-reference.md`,
  `config/index.ts`).
- **Stale anchors (lanes B, D, E).** Refreshed after PRs #248 and #255 in
  the readiness, patch-and-restore, quick-resume, skill-script,
  instruction-sync, recap, active-pointer, terminal-status, repair, and
  restamp plans; where a file was rewritten, plans now say to resolve by
  symbol or test title.
- **Verify commands (lanes A, D, E).** Descriptive verify prose in the gate
  override and dispatch-stamp plans replaced with commands; the exclusions
  plan's commands now state their working directory and the array-key
  grammar is specified; the terminal-status bump step and readiness step 3
  gained gates; the asset-error plan lists its gate commands.
- **Scope corrections (lanes A, D).** `bundle-assets.sh` is evidence-only in
  the asset validator; the recover plan authorizes its two integration-test
  files; the unset plan adds `configuration.md` and corrects the subcommand
  list; the retry plan states the retry bound and sleep and conditions
  `.gitignore` on the receipt decision; the skill-script plan corrects the
  sweep count (five skills, not six); the docs-mirror plan narrows its
  shared-matrix claim.

## Findings dismissed, with reasons

- Lane C: "the diagnose plan cannot distinguish missing-from-view from
  unknown skill without a canonical scan dependency." `runInfoTool` already
  scans each scope's canonical skill directory before the not-found path;
  the plan now says so instead of adding a dependency.
- Lane C: "PR #190 shares no package manifests with the diagnose plan."
  PR #190's file list includes `packages/cli/package.json` and
  `public-package-versions.json`; the row was correct and is now moot because
  lanes no longer write manifests.
- Lanes B and C: "split the bundled-skill repair and the provider-reachability
  plans." Both were selected as cohesive batches; the repair plan records the
  batch rationale and the reachability plan explains why the list/info fix
  stays (one-argument change on the same seam step 5 rewires). Splitting
  would add lanes on already-contested files.
- Lane A: "the gate-override plan is project-sized." Kept as one plan with an
  explicit review-focus note to import it via `oat-project-import-plan` and
  split by contract if the lane cannot ship it as one reviewable change.
- Lane A: "the plan template forbids lifecycle bookkeeping such as
  `oat_execution_status`." Already owned by the readiness plan, which updates
  the template to permit the readiness contract.

## Verdict

With the fixes above, all 31 plans are executable cold by an engineer with no
session context. Group placement was already correct everywhere; the defects
were in what the plan contracts recorded, plus two implementation-level
errors (the local-scope guard and the dialect guard) that the author's
recon had not caught. The operator checkpoint on the program is unchanged.
