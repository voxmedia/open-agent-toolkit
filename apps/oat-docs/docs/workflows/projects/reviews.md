---
title: Reviews
description: 'Review request/receive loop, status progression, severity policy, and quality gates.'
---

# Reviews

Review loop:

1. Request review (`oat-project-review-provide`)
2. Receive review and convert findings into tasks (`oat-project-review-receive`)
3. Implement fixes (`oat-project-implement`)
4. Re-review until passing status

## Storage contract

- New project review artifacts are written to tracked `reviews/` directories.
- `oat-project-review-receive` consumes the active top-level review artifact, updates project bookkeeping, then archives that artifact to `reviews/archived/`.
- `reviews/archived/` is the local-only historical surface. Active `reviews/` content is not gitignored by default.
- Ad-hoc review artifacts still default to local-only orphan storage under `.oat/projects/local/orphan-reviews/`.

## Bookkeeping commits (required)

Both `oat-project-review-receive` and `oat-project-review-receive-remote` conclude with a required atomic commit of `plan.md`, `implementation.md`, `state.md`, and the archived review artifact (when tracked). This is the safety net that prevents cross-agent bookkeeping drift: when a subagent runs a receive skill in isolation, the commit ensures the original agent sees a clean checkout on return.

The commit is scoped and explicit — it stages only the project's tracking files and the project's `reviews/` directory. It never uses `git add -A` or repo-wide glob patterns. Deferring this commit requires explicit user approval and must be recorded in the receive skill's summary so the original agent knows state is uncommitted.

## Project vs ad-hoc

**Provide** (request a review):

- `oat-project-review-provide` is project-scoped and requires active project state (resolved via `oat config get activeProject` / `.oat/config.local.json`) plus project `state.md`.
- `oat-review-provide` is for non-project commit-range reviews (ad-hoc, no project state required).
- `oat-project-review-provide-remote` reviews a GitHub PR from a different machine within project context and posts the review back to GitHub (see [Remote provide](#remote-provide)).
- `oat-review-provide-remote` reviews a GitHub PR from a different machine in ad-hoc mode and posts the review back to GitHub.

**Receive** (process review findings):

- `oat-project-review-receive` processes local review artifacts within a project context (converts findings to plan tasks).
- `oat-project-review-receive-remote` processes GitHub PR comment feedback within a project context (converts findings to plan tasks with stable `pNN-tNN` IDs).
- `oat-review-receive` processes local review artifacts in ad-hoc mode (standalone task-list output, no project state mutation).
- `oat-review-receive-remote` processes GitHub PR comment feedback in ad-hoc mode (standalone task-list output, optional reply posting).

The `*-provide-remote` and `*-receive-remote` skills are the two halves of the cross-machine loop: one agent posts a review to a PR; an agent on the PR's own machine receives it and turns it into fix tasks.

## Remote provide

`oat-review-provide-remote` (ad-hoc) and `oat-project-review-provide-remote` (project-scoped) let an agent on one machine review a GitHub PR opened from another machine and post the review back to GitHub. They mirror the existing `*-receive-remote` skills, closing the local-vs-remote × provide-vs-receive matrix.

- **GitHub is the source of truth.** No local review artifact is written on the reviewing machine, and the project rail makes no `plan.md`/bookkeeping mutations there — the originating machine's `*-receive-remote` owns those. The posted PR review carries metadata markers (`oat_provide_remote`, `oat_review_head_sha`, and on the project rail `oat_project` + `oat_review_scope`) so a subsequent provide-remote pass can find the prior review for re-review narrowing.
- **Hybrid read strategy.** The skill checks the PR out into an ephemeral worktree for full-context review by default, and falls back to diff-only mode (`gh pr diff`, or when `--no-checkout` is set / checkout fails) with a degraded-context warning.
- **Single posted review.** Findings are posted as one PR review via `gh api` with inline `comments[]`; the verdict is `REQUEST_CHANGES` when any Critical/Important finding exists, otherwise `COMMENT` (including clean reviews — never an automatic `APPROVE`). Findings whose line is outside the PR diff are downgraded into the top-level review body rather than dropped.
- **Project rail is project-aware but read-only.** It resolves the project by scanning the PR diff for `.oat/projects/*/*/state.md` (with a `--project <path>` override), reads project artifacts to drive mode-aware review quality, and uses Tier 1/2/3 dispatch (`oat-reviewer` structured-output mode → fresh session → inline). The ad-hoc rail runs inline only.
- **Re-review narrowing** scopes a follow-up pass to commits since the prior matching review, guarded against a stale/force-pushed prior SHA (existence + ancestry checks; falls back to full scope when the prior SHA is unreachable). Project-rail narrowing matches on the `(project, scope)` tuple so a `p02` re-review never narrows against a prior `final` review.

> The posting backend is `gh api` directly: the bundled `agent-reviews` CLI is read/reply-only and has no review-posting flow, so the skills probe for a posting capability (forward-compatible) and fall through to `gh api`.

## Status model

Status progression in `plan.md` Reviews table:

- `pending`
- `received`
- `fixes_added`
- `fixes_completed`
- `passed`

## Current policy

- Critical/Important: address before pass.
- Medium: address by default; defer only with explicit approval and recorded rationale/disposition.
- Minor: **default to `convert`** (fix inline). Small non-blocking findings are usually cheaper to fix than to track as backlog items, so the receive skills convert them by default rather than deferring.
- Deferring (or dismissing) a finding **at any severity, including minor**, requires a concrete recorded rationale (duplicate, blocked dependency, explicit out-of-scope follow-up, or disproportionate churn now). This brings the manual receive path in line with the auto-review path, which already converts minors.
- Minor (final scope): still require explicit per-finding user disposition after a plain-language explanation, with `convert` as the recommended default.

## Auto-review at HiLL checkpoints

When `workflow.autoReviewAtHillCheckpoints` is enabled (for example, `oat config set workflow.autoReviewAtHillCheckpoints true --user`) or per-project `plan.md` frontmatter sets `oat_auto_review_at_hill_checkpoints`, completing a HiLL checkpoint automatically runs the extra lifecycle review. The review scope covers every implementation phase not already covered by a passed whole-phase code review, through the just-completed checkpoint. Mid-implementation multi-phase checkpoint reviews use inclusive phase-range scopes such as `p02-p03`. The final phase checkpoint triggers a `code final` review.

This is separate from Tier 1 phase gate reviews. Tier 1 implementation always runs `oat-reviewer` after each phase; `workflow.autoReviewAtHillCheckpoints` only controls the additional lifecycle review when a HiLL checkpoint is reached. Legacy `autoReviewAtCheckpoints` and `oat_auto_review_at_checkpoints` are still read as fallbacks.

Auto-triggered reviews use `oat_review_invocation: auto` in the review artifact frontmatter. In auto mode, `oat-project-review-receive` auto-converts all findings to fix tasks without user prompts (Minor findings that are clearly out of scope are deferred with a note).

This feature is opt-in and disabled by default. When disabled, the manual `oat-project-review-provide` workflow applies.

## Re-review scope narrowing

When re-reviewing after fix tasks have been applied, `oat-project-review-provide` detects completed `(review)` fix tasks and offers to narrow the re-review scope to just the fix-task commits. This avoids re-examining already-approved code.

The behavior can be set as a default via `workflow.autoNarrowReReviewScope`:

- `true` — automatically narrow to fix commits, no prompt
- `false` — always use the full scope, no prompt
- unset (default) — prompt the user on each re-review

Typically set at user scope since it's a personal workflow preference:

```bash
oat config set workflow.autoNarrowReReviewScope true --user
```

The preference only applies when there are completed fix tasks to narrow to. Initial reviews (before any fix tasks exist) always use the full scope regardless of the preference. See [Workflow preferences in the Configuration guide](../../cli-utilities/configuration.md#workflow-preferences-workflow) for the full list of preference keys.

## Phase and final review

Use phase-scoped review artifacts during implementation (`p01`, `p02`, etc), then run final review before project closeout.

Final review `passed` gate requires:

- No unresolved Critical/Important/Medium findings.
- Deferred Medium findings resurfaced and explicitly dispositioned.
- Minor findings explicitly dispositioned (after plain-language explanation).

## Subagent Compatibility

`oat-project-review-provide` uses provider-aware subagent dispatch when available:

- Claude Code: dispatch `oat-reviewer` with `subagent_type` (resolved from `.claude/agents/oat-reviewer.md`).
- Cursor: dispatch `oat-reviewer` via explicit `/oat-reviewer` invocation or natural mention (resolved from `.cursor/agents/oat-reviewer.md`; `.claude/agents/oat-reviewer.md` is also supported for compatibility).
- Codex multi-agent runtimes: Codex can auto-decide when to spawn agents, or you can explicitly request agent spawning (optionally with `agent_type`).
  - Requires Codex config prerequisites:
    - `[features] multi_agent = true`
    - If explicit role pinning is used, role must be built-in (`default`/`worker`/`explorer`) or configured under `[agents.<name>]`.
  - Project-scope Codex role files are generated from canonical `.agents/agents/*.md` during `oat sync --scope project`.
  - User-scope Codex role generation (`~/.codex`) is intentionally deferred.
  - Some Codex hosts require explicit user authorization before the skill may call `spawn_agent`. In those hosts, `oat-project-review-provide` should ask whether to delegate to `oat-reviewer` instead of reporting the reviewer as unresolved.
- If subagent dispatch is unavailable, follow the existing fallback path (fresh session preferred, inline reset as fallback).

## Reference artifacts

- `.oat/projects/<scope>/<project>/plan.md` (`## Reviews`)
- `.oat/projects/<scope>/<project>/reviews/` (active tracked review artifacts)
- `.oat/projects/<scope>/<project>/reviews/archived/` (local-only historical review artifacts)
- `.oat/projects/local/orphan-reviews/` (default local-only storage for ad-hoc review artifacts)
- `.oat/repo/reviews/` (tracked storage convention when explicitly desired)
- `.agents/skills/oat-review-provide/SKILL.md`
- `.agents/skills/oat-review-provide-remote/SKILL.md`
- `.agents/skills/oat-review-receive/SKILL.md`
- `.agents/skills/oat-review-receive-remote/SKILL.md`
- `.agents/skills/oat-project-review-provide/SKILL.md`
- `.agents/skills/oat-project-review-provide-remote/SKILL.md`
- `.agents/skills/oat-project-review-receive/SKILL.md`
- `.agents/skills/oat-project-review-receive-remote/SKILL.md`
