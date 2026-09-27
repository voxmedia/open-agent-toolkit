---
oat_generated: false
---

# Execution Learnings: triage-correctness-wave

Append-only log of reusable observations from this autonomous run.

## 2026-09-27T04:05:00Z - gotcha - Scaffold commit leaves state.md hook-reformatted but uncommitted

**Observation:** `oat project new --mode quick` committed the scaffold, then the lint-staged pre-commit hook re-quoted two timestamps in `state.md`, leaving the file `MM` (staged and unstaged) after a successful commit.
**Impact:** The worktree was dirty immediately after scaffolding; this is the hook-modified exact-path commit gap tracked in `BL-260927-share-one-hook-safe-exact-path` (GitHub #306).
**Recommendation:** Restore the committed CLI output (`git restore --staged --worktree`) and verify a clean tree after every CLI-owned commit until the shared commit primitive lands.

## 2026-09-27T04:05:00Z - decision - Wave setup choices

**Observation:** The operator approved the tackle-backlog wave (nine items plus reconciling `BL-260908-restore-recon-s-cheap-fan-out`), Claude phase implementers, the `codex-6-sol-xhigh` independent reviewer, phase gates on all phases, and project dispatch policy `managed/high`. Gate routing needed no config change: targets are tried in descending priority with same-family avoidance, so `claude-opus-5-5-high` (180) is skipped and `codex-6-sol-xhigh` (170) is selected ahead of both Cursor targets.
**Impact:** Plan, phase, and final gates are cross-family without an execution-time `--target`.
**Recommendation:** Re-verify the selected gate target in each gate result's structured output.

## 2026-09-27T04:05:00Z - environment-limited - External-integration research

**Observation:** Every wave item is internal to this repository (CLI source, bundled skills, tests); no external service, protocol, or adjacent repository is implicated.
**Impact:** Step 3 research is limited to checked-out sources and the verified triage record `.oat/repo/pjm/triage/2026-09-26-untriaged-issues.md`.
**Recommendation:** None.

## 2026-09-27T05:10:00Z - efficiency - Managed Claude dispatch record built from the real resolver in one pass

**Observation:** The mandatory validation-only `oat project dispatch record` input (documented only with placeholders) validated on the first try when built by a small script that combined the real resolver JSON, the generated definition under `~/.claude/agents/`, the `record.test.ts` record-base fields, and a canonical-role event computed with the built `resolveCanonicalRole`.
**Impact:** This is the manual workaround for GitHub #326; `BL-260927-make-the-managed-claude` (p03) replaces it with a producer and a published example.
**Recommendation:** Until p03 ships, reuse `.oat/repo/analysis/tackle-2026-09-26/managed-input.mjs` for managed Claude launches.

## 2026-09-27T05:10:00Z - decision - Worktree bootstrap used the repository init without all-scope sync

**Observation:** `oat-worktree-bootstrap-auto` Step 4 runs `oat sync --scope all`, which rewrites user-scope provider directories. The p01 and p02 worktrees were bootstrapped with the repository-declared `pnpm run worktree:init` (which runs project sync) and the sync-manifest version refresh was restored, leaving both worktrees clean at the expected base.
**Impact:** No user-scope provider state was changed by phase bootstrap.
**Recommendation:** Consider scoping the bootstrap skill's sync to `--scope project` for phase worktrees.

## 2026-09-27T05:20:00Z - gotcha - Root hand-expanded a short SHA into the phase scope

**Observation:** The root copied the expected base as a hand-expanded 40-character SHA instead of the value from `git rev-parse`, so both phase briefs named a nonexistent commit. The p02 implementer correctly blocked at its base check; the root corrected both briefs through the accepted handles as a context-only continuation.
**Impact:** One wasted p02 round trip; no work lost.
**Recommendation:** Populate `phase_base_head` and `expected_base_sha` only by pasting `git rev-parse HEAD` output (or reading a file written by it).

## 2026-09-27T05:45:00Z - environment-limited - Phase gates run the released CLI, not the branch build

**Observation:** `oat gate review` resolves through the globally installed CLI 0.3.7 (gate route `cliRoot` is the global pnpm store), so the new `gate_dispatch_audit_mismatched` check from p01-t03 is not enforced during this wave's own gates. The user-scope `oat-project-review-provide` copy is 1.5.10 while the branch ships 1.5.11.
**Impact:** The plan's M2 rollout risk (stale installed review-provide failing this wave's gates) does not materialize here; the new check first applies once the released CLI includes it.
**Recommendation:** After release, refresh installed skills (`oat tools update`) before running gates, so reviewers write the `**Dispatch audit (policy view):**` label the new CLI expects.

## 2026-09-27T05:55:00Z - gotcha - Gate reviewer skipped the headless route step, so the gate failed after a clean review

**Observation:** The p02 phase gate's Codex reviewer read review-provide Step 6.1 but never ran `"$OAT_GATE_CLI_PATH" gate route --json`, so no route receipt was written. The gate then failed at `postSelection.step: target-dispatch` ("Branch-local gate route did not return JSON.") even though the reviewer had completed with 0 findings and committed its artifact and `received` row. The p01 gate, with the same setup, ran the route command and passed.
**Impact:** A clean review became `review_failed` and left a non-receive-eligible `received` row; one identical-payload gate retry was required.
**Recommendation:** The post-selection recovery (#232 class) could recognize a missing route receipt as its own named cause, and the gate prompt could restate the route step, so reviewer non-compliance is diagnosed directly instead of as a JSON parse failure.

## 2026-09-27T08:00:00Z - gotcha - Non-canonical Artifact cell blocked PR-final

**Observation:** The root recorded the structured (in-memory) plan artifact review with `structured (no artifact)` in the `## Reviews` Artifact cell. `oat-project-pr-final` gate PRFINAL-05 treats every non-`-` Artifact cell as a path and stopped the PR step.
**Impact:** One extra PR-final round trip late in closeout.
**Recommendation:** Always record a no-artifact review event with `-` in the Artifact cell and explain it in prose under the table.
