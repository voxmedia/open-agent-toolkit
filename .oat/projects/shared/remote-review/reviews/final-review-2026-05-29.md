---
oat_generated: true
oat_generated_at: 2026-05-29
oat_review_scope: final
oat_review_type: code
oat_review_invocation: auto
oat_project: .oat/projects/shared/remote-review
---

# Code Review: final

**Reviewed:** 2026-05-29
**Scope:** final (whole-branch quality gate before PR)
**Files reviewed:** 23 shipped files (8 helpers + 8 colocated test files + 2 integration tests, 2 new skills, 1 agent, 4 receive skills, bundle/manifest registration, lockstep package.json bumps, backlog item)
**Commits:** f51a3d74..a3764df4 (merge-base origin/main..HEAD)

## Summary

The provide-remote capability ships end-to-end and is internally consistent across all cross-cutting seams: the marker schema round-trips writer→reader, the `oat_output_mode: structured` contract matches between producer (`reviewer-dispatch.ts`, project skill) and consumer (`oat-reviewer.md`), the posting contract (`gh api --input -` JSON with `comments[]`, verdict mapping, out-of-diff downgrade) is identical between the ad-hoc and project skills, and both new skills are correctly registered for bundling/install. All declared verification commands pass green (97 review-remote tests, 51 skills validated, lint/type-check clean, `release:validate` clean at 0.1.12 for all five public packages, bundle-consistency green). Zero Critical and zero Important findings; two Minor items are advisory artifact/skill-prose drift that do not block merge.

## Findings

### Critical

None

### Important

None

### Minor

- **Design overstates the receive-remote round-trip; consumer marker parsing is not in this scope** (`.oat/projects/shared/remote-review/design.md:185-189`)
  - Issue: design.md Data Flow says `*-receive-remote` "learns to recognize the `oat_provide_remote` markers ... when routing findings into plan tasks." The shipped receive-remote skills (`oat-review-receive-remote`, `oat-project-review-receive-remote`) still fetch via `npx agent-reviews --json --unresolved` and process comment bodies generically — they do NOT parse the `oat_provide_remote` / `oat_project` / `oat_review_scope` markers. This is consistent with discovery Key Decision #1 and Out of Scope (receive-side changes were scoped to the minor-default flip only), and the producer-side durable record (posted body + markers) is complete and correctly round-trips through `marker-parser`/`body-builder`. So this is stale design wording, not a shipped defect: the inline comments still flow to receive via `agent-reviews` regardless of marker awareness.
  - Suggestion: Align design.md — reframe lines 185-189 as future/optional work (marker-aware routing on receive is a follow-up, tracked alongside the open respond/summarize-remote skills on `bl-9fb8`), or add an explicit Out-of-Scope note that receive-remote marker parsing is deferred. No code change required.

- **Skill prose uses `$EPHEMERAL_PATH` for the stale-SHA guard in diff-only mode where that variable is unset** (`.agents/skills/oat-review-provide-remote/SKILL.md:154-155`, mirrored at `.agents/skills/oat-project-review-provide-remote/SKILL.md:197-198`)
  - Issue: Step 3/4 documents the guard as `git -C "$EPHEMERAL_PATH" cat-file -e <prior_sha>` and `git -C "$EPHEMERAL_PATH" merge-base ...`, with a parenthetical "(diff-only mode: `git fetch origin <prior_sha>:refs/oat-prior-review` first, then re-check)". In diff-only mode (`--no-checkout` or checkout failure) no worktree is acquired, so `$EPHEMERAL_PATH` is never set — the documented commands would run against an empty/stale path. The design Error Handling section (design.md:594-601) correctly distinguishes the diff-only path as running against `git ls-remote`/`git fetch` + diff metadata, and the tested `narrowing.ts` helper models this cleanly via the injected `GitInvoker` + `diffOnly`/`fetchRef`. The gap is only in the skill's executable prose, which an agent would likely adapt; flagging for precision.
  - Suggestion: In both skills, clarify the diff-only guard branch to run against `$REPO_ROOT` (the caller's repo) after the single-ref fetch, e.g. `git -C "$REPO_ROOT" cat-file -e <prior_sha>` / `git -C "$REPO_ROOT" merge-base --is-ancestor`, rather than `$EPHEMERAL_PATH`. Since both skill files were already version-bumped this branch, fold the wording fix in without an additional bump if done before merge.

## Requirements/Design Alignment

**Evidence sources used:** discovery.md, design.md, plan.md, implementation.md (quick mode — no spec.md; design.md present and used as the requirements oracle).

### Requirements Coverage

| Requirement (design decision / success criterion)                                           | Status      | Notes                                                                                                                                                                |
| ------------------------------------------------------------------------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `oat-review-provide-remote` exists, validates, posts single PR review (verdict mapping)     | implemented | SKILL.md v1.0.1; inline-only; `gh api --input -` JSON payload; verdict via `mapVerdict`. Validated by `oat:validate-skills` (51 skills).                             |
| `oat-project-review-provide-remote` exists, resolves project, mode-aware, posts             | implemented | SKILL.md v1.0.0; diff-scan + `--project` override; reads artifacts read-only; Tier 1/2/3 dispatch; project markers in body.                                          |
| Hybrid read strategy (worktree checkout primary, `gh pr diff` fallback, `--no-checkout`)    | implemented | `worktree.ts` (acquire/run/release, repo-scoped, leak-proof finally cleanup); both skills document fallback. Worktree tests exercise full lifecycle on a temp repo.  |
| Marker schema (`oat_provide_remote`/`oat_review_head_sha`/`oat_project`/`oat_review_scope`) | implemented | `marker-parser.ts` ↔ `body-builder.ts` round-trip proven by both integration tests; key-existence discriminates rail; 40-char SHA validation; forward-compat extras. |
| Verdict mapping (REQUEST_CHANGES if any C/I; COMMENT otherwise incl. clean; never APPROVE)  | implemented | `mapVerdict` + tests; consistent across both skills' Step 6/7.                                                                                                       |
| Inline line mapping (in-diff RIGHT/LEFT; out-of-diff downgrade, never drop/shift)           | implemented | `line-mapper.ts` (`parsePullFilesPatch` + `parseUnifiedDiff` + `classifyFinding`); rename + binary + out-of-diff edge cases tested.                                  |
| Re-review narrowing scoped by `(rail, project, scope)` with stale-SHA guard                 | implemented | `narrowing.ts` discriminated union; existence+ancestry guard; `--narrow` hard-error; auto-narrow no-prompt; diff-only fetch path. All branches tested.               |
| `oat-reviewer` structured-output mode (`oat_output_mode: structured`, no artifact)          | implemented | `oat-reviewer.md` v1.1.0 Structured-Output Mode section; default path byte-for-byte unchanged; flag matches `reviewer-dispatch.ts` constant exactly.                 |
| Tier-1 dispatch wrapper + StructuredFindings validation                                     | implemented | `reviewer-dispatch.ts`; hand-rolled validator (severity enum, file/line both-or-null, verification_commands array); no-retry contract; typed error. Tested.          |
| Project resolution (diff scan + `--project` override with validation)                       | implemented | `project-resolver.ts`; single/ambiguous/not-found/invalid-override union; trailing-slash + `state.md`-suffix tolerance.                                              |
| Capability probe (`agent-reviews` posting flow, `gh api` fallback, never fail)              | implemented | `capability-probe.ts`; supported/not-supported/unknown; cached; Open Question empirically resolved (`agent-reviews@1.0.2` has no posting flow).                      |
| Minor-default flip (`defer`→`convert`) across all four receive skills + rationale gate      | implemented | All four diffs verified; rationale gate extended to all severities incl. minor; auto-disposition branch preserved; final-scope explicit-disposition guard preserved. |
| Backlog `bl-9fb8` updated to record scope split                                             | implemented | provide-remote SHIPPED, respond/summarize-remote OPEN, `status: open` retained, dates updated, acceptance criteria re-scoped, index regenerated.                     |
| Lockstep public-package version bump + `release:validate`                                   | implemented | All five packages 0.1.11→0.1.12; `release:validate` passes for 5 packages.                                                                                           |
| Both new skills registered for bundling/install (p06 fix-up)                                | implemented | `skill-manifest.ts` (WORKFLOW_SKILLS + UTILITY_SKILLS) + `bundle-assets.sh` SKILLS array; `bundle-consistency.test.ts` passes (13 tests).                            |

### Extra Work (not in declared requirements)

None. Every shipped surface maps to a design decision or success criterion. Generated provider-view sync (`.claude/`, `.cursor/`, `.codex/`) faithfully reflects the canonical agent/skill changes and is out of review scope (bookkeeping).

## Carry-Forward Debt Disposition

Deferred-findings ledger was empty entering this final review (all phase-gate findings fixed or advisory minors). No carry-forward debt to disposition. The two Minor findings above are new at final scope and are both artifact/prose-alignment items, not implementation defects — recommend fixing the SKILL.md `$EPHEMERAL_PATH` wording before merge (cheap, no extra version bump needed) and aligning the design.md round-trip wording (or filing as a `bl-9fb8`-adjacent follow-up). Neither blocks merge.

## Verification Commands

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/review-remote/
pnpm --filter @open-agent-toolkit/cli exec vitest run bundle-consistency
pnpm oat:validate-skills
pnpm lint
pnpm type-check
pnpm release:validate
```

All six commands were run during this review and passed: 97 review-remote tests (10 files), 13 bundle-consistency tests, 51 skills validated, 0 lint warnings/errors, type-check clean, release validation passed for 5 public packages at 0.1.12.

## Recommended Next Step

Run the `oat-project-review-receive` skill to convert findings into plan tasks. Both findings are Minor artifact/prose alignment — convert the `$EPHEMERAL_PATH` skill-prose fix (cheap, pre-merge) and either align design.md's receive round-trip wording or defer it as `bl-9fb8` follow-up with rationale.
