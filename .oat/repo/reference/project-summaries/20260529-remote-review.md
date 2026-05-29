---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-05-29
oat_generated: true
oat_template: false
oat_summary_last_task: p06-t03
oat_summary_revision_count: 0
oat_summary_includes_revisions: []
---

# Summary: remote-review

## Overview

OAT's review skill set covered four of six positions in the local-vs-remote × provide-vs-receive matrix: both ad-hoc and project rails could _provide_ a local review and _receive_ a review (including receiving a remote GitHub PR review), but neither rail could _provide_ a review remotely. The practical gap: when one agent opens a PR, an agent on a different machine had no first-class way to review that PR and post findings back — it had to improvise by running `oat-review-provide` and hand-layering the GitHub-posting shape from the receive-remote skills. This project closes that gap.

## What Was Implemented

- **Two new skills.** `oat-review-provide-remote` (ad-hoc rail) and `oat-project-review-provide-remote` (project rail) let an agent on one machine fetch a GitHub PR opened from another machine, review it, and post the findings back as a single GitHub PR review. They mirror the existing `*-receive-remote` skills, completing the review matrix.
- **GitHub as the source of truth.** The reviewing machine writes no local artifact and (on the project rail) makes no `plan.md`/bookkeeping mutations — the originating machine's `*-receive-remote` owns those. The posted review carries HTML-comment metadata markers (`oat_provide_remote`, `oat_review_head_sha`, and on the project rail `oat_project` + `oat_review_scope`) so a later provide-remote pass can find the prior review for re-review narrowing.
- **Hybrid read strategy.** Default is a full-context review from an ephemeral, repo-scoped git worktree (`git -C "$repo_root" worktree add --detach` + `gh pr checkout`); falls back to diff-only (`gh pr diff`, or when `--no-checkout` is set / checkout fails) with a degraded-context warning.
- **Single posted review via `gh api`.** Findings post as one PR review with inline `comments[]` built as a JSON payload piped through `gh api --input -`. Verdict is `REQUEST_CHANGES` when any Critical/Important finding exists, else `COMMENT` (including clean reviews — never auto-`APPROVE`). Findings whose line is outside the PR diff are downgraded into a top-level "Findings outside the PR diff" body section rather than dropped.
- **Project-aware but read-only project rail.** Resolves the project by scanning the PR diff for `.oat/projects/*/*/state.md` (with a `--project` override), reads project artifacts to drive mode-aware review, and uses Tier 1/2/3 dispatch — Tier 1 invokes `oat-reviewer` in a new structured-output mode. The ad-hoc rail runs inline.
- **Eight shared helper modules** under `packages/cli/src/review-remote/` (marker parser, posted-review-body builder + verdict mapper, inline-comment line mapper, re-review narrowing with stale-SHA guard, project resolver, `agent-reviews` capability probe, ephemeral worktree lifecycle, `oat-reviewer` Tier-1 dispatch wrapper), each with focused tests + integration coverage (102 tests).
- **Disposition policy change across all four receive skills.** Minor findings now default to `convert` (fix inline) instead of `defer`, and `defer`/`dismiss` at any severity requires a recorded rationale — aligning the manual receive path with the auto-review path, which already converts minors.
- **`bl-9fb8` updated** to record provide-remote shipped; `respond-remote` and `summarize-remote` (both rails) remain open as scoped follow-ups.

## Key Decisions

- **Symmetric, GitHub-only remote rail.** Rather than mirror plan.md bookkeeping across machines (concurrent-write risk), the reviewing machine only posts to GitHub; the PR-owning machine's receive-remote flow owns all plan/task mutations. This keeps a single writer per source of truth.
- **`gh api` is the posting backend.** The bundled `agent-reviews@1.0.2` CLI is read/reply-only with no review-posting flow (resolved empirically during implementation, closing a design open question). The skills probe for a posting capability (forward-compatible) and fall through to `gh api`.
- **Single PR review, not per-finding comments.** One review with an umbrella body + inline comments matches how human reviewers leave reviews and gives receive-remote one well-formed unit to fetch.
- **`oat_output_mode: structured` reviewer extension.** The project rail's Tier-1 dispatch reuses the existing `oat-reviewer` agent via an additive structured-output mode (returns `StructuredFindings`, writes no artifact); the default review path is unchanged so phase-gate reviews are unaffected.
- **Re-review narrowing scoped by `(project, scope)`** with a stale-SHA existence+ancestry guard, so a force-push or a different-scope prior review can't produce a misleading partial range.

## Design Deltas

- **`agent-reviews` posting capability (design open question).** Design left open whether `agent-reviews` could post reviews; it cannot (read/reply only), so `gh api` is the authoritative posting path. The capability probe ships forward-compatible.
- **Skill install/bundle registration.** Registering the two new skills in the install manifest (`skill-manifest.ts`) and `bundle-assets.sh` was implied by p04 but not an explicit task; it was completed during p06 when a `bundle-consistency.test.ts` failure surfaced it (a real release-blocking gap — the skills would not have been bundled/installed otherwise).
- **`receive-remote` marker parsing is out of scope.** The posted markers are forward-compatible routing metadata; `receive-remote` was not modified to parse them beyond the minor-default flip.

## Notable Challenges

- **Review-ledger reconciliation.** An independent manual final review caught that the lifecycle review ledger had drifted (a `pending` p06 row, a `received` plan-artifact row pointing at an already-archived file, and superseded first-pass review artifacts left top-level) such that `oat project status` kept routing back to review-receive. Resolved by archiving all consumed review artifacts and reconciling the Reviews table. The same independent pass also caught that the body-builder lacked a structured out-of-diff path (the "never drop" guarantee was documented but unimplementable) — fixed with `BuildInput.outOfDiffFindings` + tests.

## Integration Notes

- The remote provide/receive loop is the intended cross-machine workflow: an agent runs a `*-provide-remote` skill to post a review to a PR; an agent on the PR's own machine runs the matching `*-receive-remote` skill to turn it into fix tasks. The shared helpers live under `packages/cli/src/review-remote/` and are reused by both new skills.
- The receive-skill minor-default flip changes behavior for all four receive skills (ad-hoc + project, local + remote): minors are fixed inline by default; deferring any finding now requires a stated rationale.

## Follow-up Items

- `bl-9fb8`: the remaining four remote review skills — `oat-review-respond-remote`, `oat-project-review-respond-remote`, `oat-review-summarize-remote`, `oat-project-review-summarize-remote` — remain open.

## Associated Issues

- `bl-9fb8` (`pr-review-skill-set`) — partially satisfied (provide-remote rails shipped; respond/summarize remain).
