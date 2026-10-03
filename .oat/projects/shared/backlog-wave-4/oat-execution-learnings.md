---
oat_generated: false
---

# Execution Learnings: backlog-wave-4

Append-only log of reusable observations from the autonomous run.

## 2026-10-02T12:33Z - decision - Reviewer target name is stale but resolves Sol 6.1

**Observation:** The operator asked for GPT-6.1 Sol as the reviewer. The configured user gate target `codex-6-sol-xhigh` already invokes `gpt-6.1-sol` with `model_reasoning_effort="xhigh"`, and Wave 3's gate receipts record `gpt-6.1-sol`.
**Impact:** No gate configuration change was needed; the target id no longer describes its model.
**Recommendation:** Rename the target id when the operator next edits user gate config, so receipts and reports name the model they ran.

## 2026-10-02T12:33Z - environment-limited - Installed CLI and user skills lag main

**Observation:** The global `oat` is 0.3.10 and user-scope lifecycle skills are one version behind the repository (0.3.12 is published). The operator did not authorize an update for this wave.
**Impact:** Lifecycle skills and gate reviews run the 0.3.10 behavior, not Wave 3's changes.
**Recommendation:** Update the global CLI and user-scope skills between waves.

## 2026-10-02T13:40Z - gotcha - Main moved during planning; the branch CLI build went stale

**Observation:** PR #335 merged to `main` (lockstep 0.3.13) after the wave branch was cut from 0.3.12. The plan artifact review caught it (H1). After merging `origin/main`, `node packages/cli/dist/index.js` refused PJM writes with "Bundled assets version mismatch: CLI 0.3.13, assets 0.3.12" until `pnpm --filter @open-agent-toolkit/cli build` re-ran.
**Impact:** The lockstep target moved to 0.3.14, and every branch-CLI step after a merge needs a rebuild first.
**Recommendation:** Re-fetch and compare `origin/main` versions at plan-gate time, and rebuild the branch CLI immediately after any merge from `main`.

## 2026-10-02T13:40Z - decision - Operator request mid-run kept out of the wave

**Observation:** The operator asked to stop committing project review files (gitignore `reviews/`). Sizing found staging sites in review-provide, review-receive, pr-final, and implement, `oat init` defaults, and a migration need.
**Impact:** Filed as `BL-261002-gitignore-project-review` (high); the operator chose a separate follow-up PR over folding it into Wave 4.
**Recommendation:** Lead the next PR with it.

## 2026-10-02T20:20Z - gotcha - A per-path denylist did not converge under review

**Observation:** p01 protected sources from a misdirected `OAT_ASSETS_DIR` by listing protected paths. Each review round (three root, two Codex gate) found the next unlisted path (`NOTICES.md`, a linked `NOTICES.md`, `.agents/docs` through skill symlinks). The complexity review at the cap classified six of nine findings as one family; replacing the list with one rule (publish only to an absent or empty directory, or an existing bundle) dissolved the family and cut `bundle-assets.sh` by 36 lines net.
**Impact:** Two extra review cycles and one operator decision before the simplification.
**Recommendation:** When a guard grows one entry per review round, stop and ask for the general rule before the next fix; the complexity review at the cap is the backstop, not the first check.

## 2026-10-02T20:20Z - candidate-skill-content - Root cause of the Wave 3 disk fill

**Observation:** `bundle-inputs.mjs` ran its CLI only when `import.meta.url` (the real path) equalled `pathToFileURL(process.argv[1])` (the invoked path). Through a symlinked checkout path such as macOS `/tmp`, the two differ, every lookup printed nothing with exit 0, and `bundle-assets.sh` collapsed a source path to the repository root. Fixed in p01-t07 (`pwd -P` plus a real-path entry check).
**Impact:** Explains the Wave 3 incident that `BL-261001-fail-closed-when-bundle-assets` was filed for.
**Recommendation:** Entry-point guards that compare module URL with `argv[1]` should compare real paths.

## 2026-10-02T20:20Z - gotcha - Reviewer artifact missing the reconnaissance signal

**Observation:** One `oat-reviewer` artifact (`bw4-p01-review-4`) omitted the required `**Reconnaissance:**` line although its report named the signal. The root failed closed, and the same reviewer handle added the line before receive.
**Impact:** One extra round trip; no bookkeeping was written from the incomplete artifact.
**Recommendation:** Keep the explicit "exactly one `**Reconnaissance:**` line in the artifact body (required)" sentence in every reviewer brief.

## 2026-10-03T01:00Z - gotcha - Main moved three times during one wave

**Observation:** `main` published 0.3.13 (#335) during planning, 0.3.14 (#342, a docs restructure that deleted two pages this wave edited) during closeout, and 0.3.15 (#350) while the post-merge Definition of Done was running. Each collision surfaced only at `release:check-versions`, and #350 also needed `pnpm install` before its new test suite could run.
**Impact:** Two extra merges, a docs port task (p07-t05), a re-bump to 0.3.16, and repeated full Definition of Done runs.
**Recommendation:** For long waves, fetch `origin/main` and compare versions at every phase boundary, run `pnpm install --frozen-lockfile` after every merge from `main`, and push immediately after the final bump.

## 2026-10-03T01:00Z - efficiency - The destination-safety family kept producing findings until the end

**Observation:** After p01's simplification, the exit gate still found two edge cases in the new destination rule (a newline-only filename defeating `ls -A`, and `find` not following a symlinked start path). Both were real and each was a one-line fix.
**Impact:** One exit gate attempt and one extra final re-review round.
**Recommendation:** For shell guards over user-supplied paths, test filename-safe enumeration and symlinked starting paths from the first implementation.
