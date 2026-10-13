---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-10-13
oat_generated: true
oat_template: false
oat_summary_last_task: p04-t29
oat_summary_revision_count: 0
oat_summary_includes_revisions: []
oat_summary_learnings_fingerprint: none
---

# Summary: artifact-cleanup

## Overview

An audit of all 102 archived OAT projects found the lifecycle artifacts hard to read: `summary.md` copied the whole project log verbatim, `implementation.md` journals were inconsistent or unfinished, dispatch payloads sat in fenced blocks, learnings lived in a separate file the readers ignored, and archive retries created timestamp-suffixed twins. This quick-mode project fixed the writers rather than the names (D1–D14 in `discovery.md`, design revision 3): a bounded observations digest, one canonical journal format with a shared reader and a mode-aware validator at three lifecycle boundaries, a producer-made one-line run record, fixed journal slots, `state.md` as the owner of gate transitions, learnings written into `project-log.md` by every producer, archive retries that cannot create twins, and explicit archive generations. Four sequential phases, 60 tasks (39 planned plus 21 from reviews, an external PR review and the exit gate), shipped on branch `feat/artifact-cleanup` at lockstep 0.3.22 as PR #365.

## What Was Implemented

- **Phase 1, log and summary contract:** judgment entries carry `**Category:**`, `**Source:**`, `**Origin:**` and `**Recorded:**` head fields with six validated categories; `log append --category/--source/--origin` reuses `--idempotency-key`; `log check` reports `learnings: legacy`; `workflow.projectLogDigest.{maxEntries,maxLines}` (12/60); roll-up renders a bounded, ordered digest with non-link `oat-project:<slug>#<entry-id>` locators and omits the section when empty; slimmer project-log and summary templates; the summary and retro skills read the unified log first and the legacy file second with proven-twin deduplication, and the summary gains a staged invocation contract and learning-driven freshness.
- **Phase 2, journal and lifecycle enforcement:** a heading-only journal record reader in the control plane (ownership, fence exclusion, identity normalization) adopted by task-mode progress; `dispatch record --format line` run records; the journal evaluator and `oat project journal check` at `implement-preflight|review|completion` (task and brief/goal rules, placement, run-line terminality, override line grammar, status and `oat_ready_for` agreement, placeholder residue); `complete-state` rechecks the closeout invariant and the evaluator and writes nothing on refusal, including `journal-missing` for a planned project without a journal; journal templates gain `## Reviews and Gates` and `## Deferred Findings` and drop the implementation log and test table; sixteen writer skills target the slots; the complete skill runs summary staged, validates, then resumes roll-up, and writes `oat_pr_status_observed_at`.
- **Phase 3, learning producers and archive identity:** the autonomous, cloud and goal producers share one `oat_record_learning` function that writes categorized log entries and never creates `oat-execution-learnings.md` (a disabled log stops creation and warns; an existing log keeps accepting learnings, D14 as amended); archive retry identity by a manifest hash over retained bytes, shared by apply and dry-run, with deterministic scope-qualified local paths, thirteen `archive-*` reason codes, locator finalization to `oat-archive:` tokens at export, a rehash of the existing archive before any retry is adopted, and `--new-generation <reason>` with predecessor binding.
- **Phase 4, acceptance:** fresh lifecycle probes across quick, lite, brief and goal (229 assertions, protected surfaces byte-identical, eleven named guards run by real test title); the documentation audit; ten decision records and six backlog items; 21 skill bumps, lockstep 0.3.22 and the full Definition-of-Done gate run green.
- **Post-PR fix round (p04-t13–p04-t29):** answers an external PR review (eight confirmed defects) and two exit-gate attempts. Archives retain neither `reviews/` nor `pr/`, with one exclusion set shared by the local copy, the manifest, the S3 upload and hydration, and `oat-project-complete` carries the PR body across the archive itself; archive-owned entries are never copied from the source; by-name `oat repo archive sync` resolves `<project>[-gN][-<scope>]` names to the latest generation; successor paths are scope-qualified; plan progress reads tasks through the fence-masked record reader; the journal check refuses run lines without a valid request id, template placeholders in inline-code slots, and duplicate or misplaced plan tasks; the disabled-log skill prose matches the CLI. A per-write ownership protocol for simultaneous archive runs, built across four fix rounds, was then deleted by operator decision (p04-t29, +147/-377).

## Key Decisions

- **Writers-only fresh output measurement:** fix the producers and measure only projects archived after the change; no history rewrite (D1).
- **Reviews are not archived:** review artifacts stay local-only noise; journals must stand alone (D2).
- **No artifact renames:** `project-log.md`, `project-retro.md` and the rest keep their names; the new learnings writer is retired losslessly instead (D3).
- **Summary observations digest:** the summary carries a bounded digest of judgment entries, never a verbatim log copy; structural entries are excluded and general-ledger graduation is unchanged (D4).
- **Canonical journal format and validator:** one journal grammar read by a shared record reader and checked by a mode-aware evaluator at three boundaries (D5, D6).
- **Journal slots and state-owned gates:** receipts, fix tasks and deferrals have fixed slots; `state.md` owns gate transitions and the journal records one terminal line per gate run (D7, D8).
- **Closeout refresh and prose rewrite:** completion validates the journal before roll-up, refreshes the summary on a learning-only change, and rewrites the Final Summary from observed facts (D9, D10).
- **Archive retry identity and generations:** identical retries reuse the snapshot, export and S3 destination; conflicts refuse with a reason code; explicit generations bind a predecessor (D11).
- **Archived PR status is an observation:** `oat_pr_status_observed_at` records when the status was last observed (D12).
- **No protection for simultaneous archive runs:** every archive caller is sequential and no contract source asks for concurrent safety; the partial ownership protocol was deleted and the docs say so (operator `simplify` disposition after a complexity review).
- **One archive retention set:** `pr/` joins `reviews/` as process evidence excluded from local archives and S3, keeping the S3 footprint policy rather than uploading PR material.
- **Learnings in the project log:** every producer writes categorized learnings into `project-log.md`; the legacy file is read, never written (D3, D14).

## Design Deltas

- `dispatch record --format line` takes a `--dispatch-stamp <line>` flag because the generic record carries no `Dispatch:` stamp; the caller owns the resolver's stamp (code and `cli-reference.md` are authoritative).
- The pure journal evaluator does not re-check delivery coverage or the goal sequence; `closeout-check` keeps that invariant and `complete-state` runs both.
- A project with `plan.md` but no `implementation.md` is refused (`journal-missing`); plan-less fixtures keep the old journal-less behavior.
- Archive identity: the snapshot metadata key is `generationRequest` (camelCase, recorded as the request witness; the manifest match decides replay); same-slug archives from another scope get a scope-qualified identity whenever another archive holds the base path; a non-empty metadata-less occupant refuses with an inspect/remove/retry hint; `.git` is excluded from every scope's copy; `--new-generation` with unchanged content resolves to the latest generation with a warning.
- Three extra skills (`oat-project-document`, `-lite`, `-quick-start`) were bumped because they vendor the shared `autonomy-contract.md`.
- D14 amended after review: the CLI's recorded contract (`DR-260718-automatic-create-on-first`) keeps an existing log writable, so a disabled `workflow.projectLog` stops creation only; the producers' prose and `DR-261012-learnings-in-the-project-log` were aligned to it rather than changing the CLI.
- Archived projects no longer keep `pr/`, so `oat-wrap-up`'s sibling `pr/` scan and a resumed completion's PR-body sync lose their source (both filed as follow-ups).
- The stray-occupant check runs before the pending marker is written, and a resumed allocation found already completed refuses `archive-retry-conflict`.

## Notable Challenges

- **The exit gate found a real data-loss path.** The configured cross-family exit gate (`codex-6-sol-xhigh`) blocked attempt 1 with a High: the retry evaluator trusted the recorded manifest hash, so a retry against a damaged archive skipped the copy and removed the intact source. p04-t08 rehashes the archive's retained bytes before any retry is adopted and refuses `archive-retry-candidate-damaged`; attempt 2 passed clean.
- **Reviews kept finding adjacent edges in the archive identity work:** three p03 rounds plus the gate added eleven fix tasks (reason codes, deterministic paths, replay warnings, empty-directory rules, review-link export). Each was small; the pattern is that an identity contract has many boundary cases and the probes only cover the ones someone names.
- **This project's own journal was refused by the validator it shipped** (template residue from the pre-change scaffold, a misplaced final receipt). Fixing it in place was the acceptance test for the slot and placement rules.
- **An external PR review found eight defects every lifecycle review missed,** most of them producer–consumer composition gaps: the manifest hashed `pr/` while S3 excluded it, the writer emitted generation names the parser read as slugs, plan progress and validation read the plan two ways. All eight were reproduced before fixing; one fix (dropping `pr/`) then broke the complete skill's PR-body read, caught by the next round.
- **The exit gate pulled the run into hardening an unrequested guarantee.** Generation 2 reported races between two simultaneous archive runs of one project; each fix exposed the next interleaving across four rounds. A complexity review at gate exhaustion classed the family as new hardening, the operator chose deletion, and gate generation 3 passed clean.
- A load-sensitive contract test timed out in CI three times (fixed with a per-test timeout), and one final review round ran on Sol instead of Fable after an account session limit.
- Two post-commit recovery attempts in p02 (both test re-pins after docs wording changes); `commit-paths` refuses a tracked file under the ignored `packages/cli/assets/*` tree (filed as `BL-261012-commit-paths-should-accept`).

## Tradeoffs Made

- The journal validator refuses rather than normalizes: approved deferrals, failed records and override lines are accepted only in their declared shapes, so legacy journals must be converted by hand (`BL-261012-convert-legacy-journals`).
- The digest bound is a hard whole-section limit; tiny `maxLines` values render only the bounded subset rather than refusing the configuration.
- Archive refusals favor the operator inspecting a directory over the tool guessing: an empty directory is reused, a non-empty metadata-less one refuses with a code and a hint.
- Concurrency left unsupported rather than half-protected: two simultaneous archive runs of one project can still collide, but the retained cleanup adds no deletion path that main lacked.
- `--new-generation` was kept although no incident asked for it, because removing a shipped and reviewed option would cost about a phase.

## Integration Notes

- Lockstep 0.3.21 → 0.3.22 across the five public packages and `public-package-versions.json`; 21 bundled skills bumped once against `origin/main`.
- Consumers: `oat-wave-execute` still writes its synthesis into the summary's observations section that roll-up now owns (`BL-261012-oat-wave-execute-writes-into`); `complete-state` JSON refusals are a follow-up (`BL-261012-complete-state-json-refusals`).
- Project-scope projections were regenerated with `oat sync --scope project`; user-scope installs pick the changes up with `oat tools update`.

## Follow-up Items

- `BL-261012-read-only-journal-lint`: a read-only lint over archived journals.
- `BL-261012-convert-legacy-journals`: convert pre-change journals to the slot format.
- `BL-261012-rename-the-project-retro`: revisit the retro artifact name later (D3 kept names now).
- `BL-261012-commit-paths-should-accept`: `commit-paths` should accept tracked files under ignored directories.
- `BL-261012-oat-wave-execute-writes-into`: wave synthesis must not write into the roll-up-owned observations section.
- `BL-261012-complete-state-json-refusals`: structured refusal output for `complete-state`.
- `BL-261012-wrap-up-pr-cross-reference`: wrap-up's PR cross-reference without a `pr/` directory.
- `BL-261012-regenerate-the-archive-aware`: regenerate the archive-aware PR body on a resumed archive run.
- `BL-261012-archive-metadata-reads-map`: distinguish EACCES from a missing archive marker.
- `BL-261013-classify-review-findings` and `BL-261013-documentation-sync-after`: from the project retro (classify findings at every receive; docs sync after closeout stales the gate).

## Explainer Outcome

- **project-recap:** skipped — interactive

## Exit-Gate Waivers

- `83a8486cd..cb61b448d` (effective-delta-v2) waived by Thomas Stang at 2026-10-12T17:33:05Z: A contract test that spawns several CLI processes timed out in CI three times under load; do not let a test cause friction. Test-only change: an explicit 120s timeout for that one test.
- `3c1ae6be0..5f8b679a7` (effective-delta-v2) waived by Thomas Stang at 2026-10-13T01:35:02Z: Docs-only commit from oat-project-document after the gate: two sentences in cli-reference.md describing the new journal checks and by-name archive sync resolution.
- `f1ebfb900..13a851b73` (effective-delta-v2) waived by Thomas Stang at 2026-10-13T03:58:16Z: Instruction-only commit from oat-project-retro after the gate: two AGENTS.md paragraphs (classify findings against the contract; run contract suites after skill edits).
