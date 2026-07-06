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

## Latest review resolver

Use `oat review latest` when a skill or operator needs to resolve "the most recent review" without hand-selecting a file.

```bash
oat review latest --json
oat review latest --project .oat/projects/shared/example --json
```

The resolver orders candidates by `oat_generated_at` frontmatter, not filesystem mtime. With an active or explicit project, it scans the project's `reviews/` directory first, then `reviews/archived/`, then ad-hoc review locations (`.oat/repo/reviews/` and `.oat/projects/local/orphan-reviews/`). When candidates share the same generated time, active project reviews outrank archived and ad-hoc reviews, then lifecycle recency breaks remaining ties (`final` > higher phase/task scope > lower phase/task scope). The JSON response contains `path`, `scope`, `generatedAt`, `kind` (`project` or `adhoc`), `archived`, and `actionable`. Archived project reviews remain discoverable as history but return `actionable: false`; active top-level project reviews return `actionable: true`. If no review exists, those fields are `null`.

`oat-project-review-receive` uses this resolver when it is invoked from natural language and needs to offer the latest project review, or route an ad-hoc result to `oat-review-receive`.

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

## Model-invokable review skills

The project review skills are model-invokable only for explicit user asks and confirmation flows. They are not auto-invoked just because a phase completed, a review artifact exists, or a checkout looks ready for review.

- `oat-project-review-provide` handles explicit asks such as "review project" after resolving an active project and summarizing the inferred scope for confirmation.
- `oat-project-review-receive` handles explicit asks such as "receive review" or "process review" after resolving the latest review target. If the latest target is ad-hoc, it offers to route to `oat-review-receive`.
- `oat-project-progress` is also model-invokable for read-only status asks such as "check progress" or "what's next"; it reports before offering any next-step routing.
- `oat-project-discover` is model-invokable only when an active spec-driven project exists. Otherwise it declines and points to `oat-project-new`, `oat-project-quick-start`, or `oat-project-open`.

The common rule is offer-and-confirm: the model may recognize the request and propose the matching workflow skill, but must ask before mutating project artifacts or starting a review.

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

## Phase review gate

The phase review gate is an optional, **non-pausing** external review gate that runs after a phase's standard per-phase reviewer passes and the phase bookkeeping is committed. Where the Tier 1 reviewer is an in-session self-review, the gate calls `oat gate review` against the configured cross-provider target, adding an independent perspective before implementation moves to the next phase. It is enabled per-project through `plan.md` frontmatter (`oat_phase_review_gate`; see [Project Artifacts](artifacts.md#oat_phase_review_gate) for the field shape and validation).

It is independent of [HiLL checkpoints](hill-checkpoints.md): a passing gate does not pause, and the gate never touches `oat_hill_completed`, `oat_plan_hill_phases`, or `oat_auto_review_at_hill_checkpoints`.

Gate-produced review artifacts use `oat_review_invocation: gate` in frontmatter (the third invocation marker alongside `manual` and `auto`). The gate verdict — controlled by `exit_nonzero_on` (default `important`) — decides whether the **phase stops**; it does not decide whether sub-threshold findings are ignored. Either way the produced artifact is consumed by `oat-project-review-receive`, autonomously and without user prompts, so findings never evaporate:

- **Passing gate** (no findings at or above the threshold): receive runs a non-pausing **judgment sweep**. It makes a per-finding decision for each Medium/Minor — defer to final review (the default, recorded so [final review](#phase-and-final-review) resurfaces it), address now (only for small, contained, low-risk fixes, which do **not** re-trigger the standard reviewer or re-gate the phase), or reject with rationale — then archives the artifact. Address-now is an exception, not the norm; if such a fix reveals a Critical/Important concern it escalates to the blocking path.
- **Blocking gate** (one or more findings at or above the threshold): receive converts findings to fix tasks and implementation re-runs the standard reviewer and the gate for the phase. These block → fix → re-gate rounds are bounded by `oat_orchestration_retry_limit` (default `2`); exhausting the bound stops a sequential run or excludes the phase in a parallel group, matching the standard fix loop's terminal handling.

Gate-originated artifacts (`oat_review_invocation: gate`) are excluded from the same-scope review-cycle cap in `oat-project-review-receive`. The cap measures failed fix cycles of the standard review loop, so counting gate artifacts would trip it on artifact volume rather than real fix rounds.

When a phase is re-gated multiple times, each round produces a distinct review artifact — filenames and `oat_generated_at` are seconds-precision, so rounds never collide and `oat review latest` resolves the newest. An orchestrator should know a gate finished from the `oat --json gate review` result envelope on process exit (`status`, `runId`, `generatedAt`), not by watching the `reviews/` directory or the provider's log; see [Gate completion signal](../../cli-utilities/workflow-gates.md#gate-completion-signal).

This feature is opt-in and disabled by default (missing or `enabled: false`). For a parallel phase group, selected gates run after fan-in and bookkeeping, one per merged phase in plan order.

## Auto artifact-review loops

Generated planning and analysis artifacts have a separate review loop from code/phase reviews.

For plans, `oat-project-plan`, `oat-project-quick-start`, and `oat-project-import-plan` run a bounded `plan.md` artifact review before marking the plan ready for implementation. The loop dispatches `oat-reviewer` in structured-output artifact mode with `scope: plan`, applies unambiguous Critical and Important artifact-local fixes, offers Medium and Minor fixes, and re-runs until clean or the retry bound is exhausted. A clean result records the `plan` row in the plan's `## Reviews` table as `passed`.

For analysis artifacts, `oat-docs-analyze` and `oat-agent-instructions-analyze` run a bounded accuracy review after writing their severity-rated artifacts. The reviewer checks cited evidence, severity, and recommendations before the matching apply workflow consumes the artifact. The analysis loop updates tracking metadata to mark the artifact verified.

Both loops are default-on and controlled through:

```bash
oat config set workflow.autoArtifactReview.plan false
oat config set workflow.autoArtifactReview.analysis false
```

Only an explicit `false` skips a loop. The retry bound comes from `oat_orchestration_retry_limit` and defaults to `2`.

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
