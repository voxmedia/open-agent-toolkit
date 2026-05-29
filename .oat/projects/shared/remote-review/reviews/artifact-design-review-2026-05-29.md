---
oat_generated: true
oat_generated_at: 2026-05-29
oat_review_scope: design
oat_review_type: artifact
oat_review_invocation: manual
oat_project: .oat/projects/shared/remote-review
---

# Artifact Review: design

**Reviewed:** 2026-05-29
**Scope:** quick-mode lightweight design for `remote-review`
**Files reviewed:** 2
**Commits:** N/A (artifact review)

## Summary

The design is mostly aligned with the discovery decisions and is materially better than a bare quick-mode sketch: it covers the remote review contract, project-vs-ad-hoc rail split, GitHub marker schema, line-mapping failure mode, re-review narrowing, and receive-side minor-default change. I found one Important issue in the concrete worktree mechanics that should be corrected before plan generation, plus one Medium gap around re-review narrowing safety and two Minor artifact polish issues.

## Findings

### Critical

None

### Important

- **Ephemeral worktree creation is not specified as a runnable repo-scoped command** (`.oat/projects/shared/remote-review/design.md:140`)
  - Issue: The design says to create the worktree with `git worktree add --detach <ephemeral-path>` "from a temporary directory." If implemented literally outside a git repository, this command fails before the default rich-context path can run. If interpreted as "create a path under a temp directory," the artifact still leaves out the repo-scoped command shape needed to avoid mutating the caller's worktree.
  - Fix: Make the design explicit: resolve `repo_root`, create a temp directory path, then run the command from the repository context, for example `git -C "$repo_root" worktree add --detach "$ephemeral_path" HEAD` before running `gh pr checkout <N>` inside `"$ephemeral_path"`. If `oat-worktree-bootstrap-auto` is reused instead, state the exact invocation contract the plan should verify.
  - Requirement: Discovery decision 2, "hybrid read strategy," and success criterion "both skills honor the hybrid read strategy with a working diff-only fallback."

### Medium

- **Re-review narrowing lacks a stale-SHA / force-push guard** (`.oat/projects/shared/remote-review/design.md:190`)
  - Issue: The design narrows subsequent reviews to `<that_review.oat_review_head_sha>..HEAD` but does not say what happens when the saved review SHA is no longer present in the checked-out PR history, is not an ancestor of the current PR head, or cannot be resolved in diff-only mode. That can happen after a rebase or force-push. In those cases, blindly narrowing can fail or create a misleading partial review range.
  - Fix: Add a guard to the narrowing algorithm: verify the prior SHA resolves and is an ancestor of current PR HEAD before using it. If the check fails, warn and fall back to full PR review scope, or prompt unless `--narrow` was explicitly forced.
  - Requirement: Discovery decision 9, "re-review narrowing."

### Minor

- **Manual verification asks for a wrong-path override to verify a success path** (`.oat/projects/shared/remote-review/design.md:634`)
  - Issue: The design says to re-run `oat-project-review-provide-remote` with `--project <wrong-path>` to verify that the override path works. A wrong path should be an error-path test, not evidence that override works.
  - Suggestion: Split this into two manual checks: one with `--project <valid-project-path>` confirming override precedence, and one with `--project <wrong-path>` confirming validation fails clearly.

- **Project state prose is stale after the design-complete boundary** (`.oat/projects/shared/remote-review/state.md:34`)
  - Issue: The state frontmatter correctly says `oat_phase: design` and `oat_phase_status: complete`, but the body still says `Status: Discovery`, `Current Phase: Discovery`, and `Design: N/A`. This does not invalidate the design artifact, but it is confusing for humans resuming the project and should be aligned before the next lifecycle handoff.
  - Suggestion: Update the state body to match the frontmatter when processing this review or before generating the final plan.

## Spec/Design Alignment

### Requirements Coverage

| Requirement / Decision                                                        | Status  | Notes                                                                                                   |
| ----------------------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------- |
| Ship only `oat-review-provide-remote` and `oat-project-review-provide-remote` | Covered | Design preserves the scoped two-skill deliverable and keeps respond/summarize remote work on `bl-9fb8`. |
| Hybrid read strategy                                                          | Partial | Strategy is present, but the worktree creation command needs to be made runnable and repo-scoped.       |
| GitHub-only remote review record                                              | Covered | Design consistently avoids local artifacts/bookkeeping on machine B.                                    |
| Project rail read-only boundary                                               | Covered | Design assigns plan/bookkeeping mutation to machine A's receive flow.                                   |
| Re-review narrowing                                                           | Partial | Scope filters are good; stale-SHA handling is missing.                                                  |
| Receive-skill minor-default flip                                              | Covered | Design covers all four receive skills and rationale-gated deferral.                                     |
| Release/version guardrails                                                    | Covered | Design includes skill version bumps and lockstep public package validation.                             |

### Extra Work (not in requirements)

The design includes provisional implementation phases and parallelism notes. That is acceptable as design-to-plan scaffolding as long as `plan.md` becomes the authoritative execution artifact and the final plan re-validates dependencies/write sets.

## Verification Commands

Artifact review only; no implementation tests were run.

Commands used for review context:

```bash
oat project status --project-path .oat/projects/shared/remote-review --json
git status --short
```

## Recommended Next Step

Run `oat-project-review-receive` to convert the Important and Medium findings into plan/design fix tasks before moving to plan generation.
