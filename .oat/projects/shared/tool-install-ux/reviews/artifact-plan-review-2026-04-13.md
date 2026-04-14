---
oat_generated: true
oat_generated_at: 2026-04-13
oat_review_scope: plan
oat_review_type: artifact
oat_review_invocation: manual
oat_project: /Users/thomas.stang/.codex/worktrees/8074/open-agent-toolkit/.oat/projects/shared/tool-install-ux
---

# Artifact Review: plan

**Reviewed:** 2026-04-13
**Scope:** plan.md (quick-mode project)
**Files reviewed:** 2 (plan.md, discovery.md)
**Commits:** N/A (artifact review)

## Summary

The plan is well-scoped, mode-appropriate for quick workflow, and traces cleanly back to discovery's Key Decisions, Constraints, and Success Criteria across four tasks in two phases. Task structure follows RED -> GREEN -> Refactor -> Verify -> Commit and every step names concrete files and runnable Vitest commands. A few items weaken executability: the RED steps for `p01-t02` and `p02-t02` are missing explicit "Run/Expected fails" lines, the Reviews table still has `spec`/`design` rows flagged as expected review subjects for a quick-mode project, and the `scan-tools.ts` edit is conditional ("only if") which pushes a design decision into implementation time.

## Findings

### Critical

None

### Important

- **RED step missing runnable command in `p01-t02`** (`plan.md:85-89`)
  - Issue: Step 1 for `p01-t02` describes what to test ("Add regressions showing that...") but omits the required `Run:` / `Expected: Test fails (RED)` lines that every other RED step in the plan includes. This breaks consistency with the TDD template and removes the evidence pointer an executor needs to prove red-state before moving to GREEN.
  - Fix: Add explicit `Run: pnpm test packages/cli/src/commands/init/tools/index.test.ts packages/cli/src/commands/tools/install/index.test.ts` and `Expected: Test fails (RED)` lines to Step 1 of `p01-t02`, matching the pattern used in `p01-t01` (`plan.md:48-49`) and `p02-t01` (`plan.md:127-128`).

- **Conditional file target pushes a design decision into implementation** (`plan.md:42`)
  - Issue: `packages/cli/src/commands/tools/shared/scan-tools.ts` is listed as "Modify: ... (only if pack-state aggregation belongs there)". Discovery decided that pack state should be derived from on-disk scans (Option B chosen, `discovery.md:66-81`) and Key Decision 2 commits to inferring from canonical content, so the plan should commit to a placement decision rather than deferring it. Leaving this conditional leaves an executor without a clear answer for where the aggregation helper lives and which test surface proves it.
  - Fix: Either (a) move the new aggregation helper into a dedicated module under `packages/cli/src/commands/init/tools/` (the installer's domain-local location per CLI ownership rules) and remove the conditional from the files list, or (b) commit to extending `scan-tools.ts` and add `packages/cli/src/commands/tools/shared/scan-tools.test.ts` to both the files list and the Verify commands. Either way, remove the "only if" hedge.

- **Missing Run/Expected lines on Refactor and Verify steps for `p02-t02`** (`plan.md:178-184`)
  - Issue: Step 4 (Verify) in `p02-t02` has a `Run:` / `Expected:` pair, which is correct, but Step 3 (Refactor) is prose-only. More importantly, Step 1 (RED) again omits the `Run:`/`Expected:` pair even though the narrative references tests that will be added. This makes it harder to check red-state before the implement step.
  - Fix: Add `Run: pnpm test packages/cli/src/commands/init/tools/index.test.ts packages/cli/src/commands/tools/install/index.test.ts` and `Expected: Test fails (RED)` to Step 1 of `p02-t02`, paralleling `p02-t01` (`plan.md:127-128`).

### Medium

- **Reviews table includes `spec` and `design` rows for a quick-mode project** (`plan.md:201-207`)
  - Issue: `oat_plan_source: quick` (`plan.md:8`) and the References block (`plan.md:236-237`) both explicitly state spec and design are not used. Yet the Reviews table still lists `spec` and `design` as artifact rows with `pending` status. For a quick-mode project with no spec/design, those rows will never progress past `pending` and mislead review bookkeeping.
  - Fix: Either remove the `spec` and `design` rows for this quick-mode project (the comment in `plan.md:199` says "do not delete `spec` or `design`" - that guidance is generic scaffolding and should be relaxed for quick mode), or mark their status as `n/a` with a note like "not applicable in quick mode" to avoid status drift.

- **`p01-t02` does not clearly cover the "both scopes" preservation question** (`plan.md:76-106`)
  - Issue: Discovery's Open Question "Mixed scope packs" (`discovery.md:115`) asks whether to preserve packs installed in both scopes or normalize them. The plan's Key Decision 1 answers this for _migrations_ (migrate, not additive), but `p01-t02` only exercises "user reselects... into the opposite scope" and does not explicitly require a test for the case where a pack is _already_ installed in both scopes and the user selects one side. Without this case, the migration behavior could silently delete intentionally-both-installed canonical content - which is exactly the "False migration cleanup" risk called out in `discovery.md:125-128`.
  - Fix: Extend Step 1 of `p01-t02` to require a regression covering an already-`both`-installed pack; either (a) preserve the other scope and only update the selected one, or (b) explicitly report removal of the opposite-scope canonical copy. Wire the chosen answer into the summary that `p02-t02` now owns.

- **Commit scope convention collides with phase IDs** (`plan.md:25`)
  - Issue: The Commit Convention example uses `feat(p01-t01): ...`, and every task's commit snippet follows that shape (e.g., `plan.md:71`, `plan.md:105`). This matches the plan's own guidance but diverges from the repo's typical Conventional Commit scopes seen in recent history (e.g., `feat: add strategy-aware...`, `fix: repair global cli entrypoint`). If this plan is merged via PR, reviewers may need to squash/rename commits to match the repo's house style, or this convention should be documented as an intentional OAT project deviation.
  - Fix: Either adopt the repo's conventional scopes (`fix(cli): ...`, `feat(cli): ...`) and keep the `p0N-t0N` reference in the body or trailer, or add a one-liner in plan.md justifying the `p0N-t0N` scope for OAT project traceability so PR authors are not surprised when merging.

### Minor

- **`p01-t02` "Create or modify" is ambiguous for an existing directory without a test file** (`plan.md:81`)
  - Issue: `packages/cli/src/commands/tools/install/` currently contains only `index.ts` - there is no `index.test.ts`. "Create or modify" leaves the choice to the executor; in practice this task must _create_ that file. Listing it as `Create or modify` is not wrong, just less precise than the other tasks.
  - Suggestion: Change to `Create: packages/cli/src/commands/tools/install/index.test.ts` to match the concrete, creatable state reflected on disk today.

- **Task count and phase summary drift from actual content** (`plan.md:223-229`)
  - Issue: The "Implementation Complete" block says "Ready for code review and merge" and describes 4 tasks. That blurb is appropriate for an _end-of-project_ state but appears while the project status is still `ready_for: oat-project-implement`. It is stylistic, but it could confuse a reader into thinking the work is done.
  - Suggestion: Rename the "Implementation Complete" section to "Plan Summary" (or similar) and drop "Ready for code review and merge" until the implementation artifact reflects completion.

- **Verify steps frequently repeat the RED `Run:` line verbatim** (`plan.md:64-65`, `plan.md:142-143`)
  - Issue: Step 4 (Verify) often re-runs the exact same command as Step 1 (RED) and Step 2 (GREEN). That is acceptable, but if the intent is "no regressions in the broader install surface," adding a wider command (`pnpm --filter @open-agent-toolkit/cli test`) in the Verify step would provide stronger guarantees per the CLI package's completion checks.
  - Suggestion: In the final task of each phase, make the Verify step run the filtered package tests (`pnpm --filter @open-agent-toolkit/cli test`) to catch cross-file regressions.

- **`Tech Stack` omits the test framework specifics** (`plan.md:23`)
  - Issue: The plan names "Vitest command tests" in tech stack, which is accurate, but does not mention that the CLI uses domain-local test conventions (`<command>.ts` / `<command>.test.ts`) per `packages/cli/AGENTS.md`. An executor may otherwise invent a different test file layout.
  - Suggestion: Add "Follow `packages/cli/AGENTS.md` conventions (domain-local tests, no `../` imports, named command files)." to Tech Stack or Architecture.

- **Commit message types are mixed (`fix` vs `feat`) but not justified** (`plan.md:71`, `plan.md:105`, `plan.md:150`, `plan.md:190`)
  - Issue: `p01-t01`/`p01-t02` use `fix(...)`, `p02-t01`/`p02-t02` use `feat(...)`. The plan does not explain the distinction. Discovery positions this whole project as a bugfix ("quick bugfix", `discovery.md:62`), so Phase 2's `feat` tags may be inaccurate.
  - Suggestion: Either justify the `feat` tags (e.g., prompt prepopulation is genuinely a new UX capability) in the task narrative, or unify all four commits under `fix(...)` to match discovery's framing.

## Requirements/Design Alignment

**Evidence sources used:**

- `discovery.md` (quick-mode requirements source)
- `plan.md` (target of review)
- `implementation.md` (scaffold only; not used as requirements source)
- Ambient code context verified: `packages/cli/src/commands/init/tools/index.ts`, `packages/cli/src/commands/tools/install/index.ts`, `packages/cli/src/commands/tools/shared/scan-tools.ts`, `packages/cli/src/commands/tools/shared/` contents, `packages/cli/AGENTS.md`.

### Requirements Coverage

Quick-mode requirements are sourced from discovery's Key Decisions and Success Criteria rather than FR/NFR IDs. Using those as the coverage matrix:

| Requirement (source)                                                                                            | Status      | Notes                                                                                                                                   |
| --------------------------------------------------------------------------------------------------------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Key Decision 1: Scope change = migration (`discovery.md:85`)                                                    | implemented | Covered by `p01-t02`. See Medium finding about the `both`-installed case being only partially exercised.                                |
| Key Decision 2: Current scope inferred from disk, not config (`discovery.md:86`)                                | implemented | Covered by `p01-t01`. See Important finding about conditional `scan-tools.ts` placement.                                                |
| Key Decision 3: Prompt shows location, indicates installed, preselects (`discovery.md:87`)                      | implemented | Covered by `p02-t01`.                                                                                                                   |
| Success Criterion: Plan covers root cause of "user scope installed at project level anyway" (`discovery.md:98`) | implemented | Combined coverage in `p01-t01` + `p01-t02`.                                                                                             |
| Success Criterion: Plan surfaces current install location and already-installed state (`discovery.md:99`)       | implemented | `p02-t01` addresses this explicitly.                                                                                                    |
| Success Criterion: Regression coverage for scope migration and prompt prepopulation (`discovery.md:100`)        | implemented | Regression assertions land across `p01-t02`, `p02-t01`, and `p02-t02`.                                                                  |
| Open Question: Mixed-scope pack handling (`discovery.md:115`)                                                   | partial     | See Medium finding: migration path covered, but preserve-both or normalize-now for an _existing_ both-install is not explicitly tested. |
| Open Question: Summary output - per-pack final scopes vs. changed-only (`discovery.md:116`)                     | implemented | `p02-t02` commits to per-pack, accurate outcome reporting.                                                                              |
| Constraint: Keep `core` user-only; `workflows`/`project-management` project-only (`discovery.md:94`)            | implemented | Reinforced in `p01-t02` refactor step ("keep project-only packs untouched").                                                            |
| Constraint: No config/manifest format changes unless blocked (`discovery.md:93`)                                | implemented | Plan avoids config schema work entirely.                                                                                                |
| Out of Scope: Cross-pack provider-view deletion bug (`discovery.md:104`)                                        | respected   | No task touches that bug.                                                                                                               |
| Out of Scope: Broad install/sync refactors (`discovery.md:105`)                                                 | respected   | Plan keeps diffs inside the interactive installer and its tests.                                                                        |
| Out of Scope: Config schema changes (`discovery.md:106`)                                                        | respected   | No config file listed in any task's Files block.                                                                                        |

### Extra Work (not in declared requirements)

None. Every task maps to at least one discovery decision or success criterion, and no task introduces work in the `Out of Scope` list.

## Verification Commands

Run these to spot-check the plan locally:

```bash
# Confirm all plan-referenced file paths exist (or are intended to be created)
ls packages/cli/src/commands/init/tools/index.ts
ls packages/cli/src/commands/init/tools/index.test.ts
ls packages/cli/src/commands/tools/shared/scan-tools.ts
ls packages/cli/src/commands/tools/install/index.ts
# Expected: the install command directory has no index.test.ts yet - plan p01-t02 must create it.
ls packages/cli/src/commands/tools/install/index.test.ts 2>&1 || echo 'install test missing (as planned)'

# Dry-run the test commands the plan itself prescribes
pnpm --filter @open-agent-toolkit/cli test packages/cli/src/commands/init/tools/index.test.ts
pnpm --filter @open-agent-toolkit/cli lint
pnpm --filter @open-agent-toolkit/cli type-check
```

## Recommended Next Step

Run the `oat-project-review-receive` skill to convert these findings into plan tasks before executing `oat-project-implement`.
