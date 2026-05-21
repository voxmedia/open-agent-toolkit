---
oat_generated: true
oat_generated_at: 2026-05-20
oat_review_scope: plan
oat_review_type: artifact
oat_review_invocation: manual
oat_project: .oat/projects/shared/oat-project-split
---

# Artifact Re-Review: plan (v3)

**Reviewed:** 2026-05-20
**Scope:** `artifact plan` re-review
**Files reviewed:** 8
**Commits:** N/A (artifact review)

## Summary

The v2 fixes resolved the earlier phase-ordering, command-registration, and stale list-test-path findings: `p01-t06` now only exposes pure-logic subcommands, `p02-t07` owns `run`, and the list/dashboard integration path is under the current project command tree. The plan is still not ready for implementation because three write-time contracts remain under-specified or incorrect, and one detection-hook surface now drifts from the accepted architecture.

## Findings

### Critical

None.

### Important

1. **`oat project split run --plan-file` cannot enforce declared-vs-detected non-interactive behavior after the plan is normalized.** The design's `SplitPayload` carries both `origin` and `interactive` ([design.md:175](../design.md), [design.md:184](../design.md)), while `ChildPlan` starts at `parentSlug`/`children`/`initialActiveChild` and does not retain those fields ([design.md:188](../design.md), [design.md:199](../design.md)). The plan also says all inputs normalize to one `ChildPlan` before writes ([plan.md:275](../plan.md)). But `p02-t07` defines `oat project split run --plan-file <path> [--non-interactive]` as the command that decides "declared proceeds" versus "detected writes `## Detected Split Recommendation` and exits non-zero" ([plan.md:539](../plan.md)). At that boundary, the command only has the normalized plan, so it cannot know whether the request was declared or detected. Fix by either keeping the non-interactive detected fail-fast entirely in the entry hooks before `run`, passing a payload file/metadata that preserves `origin` + `interactive`, or adding those fields to the file schema consumed by `run`. Add tests at the actual command boundary for declared+non-interactive and detected+non-interactive.

2. **`finalizeSplit` writes the active project as a slug, but OAT stores `activeProject` as a repo-relative project path.** `p02-t04` says `finalizeSplit(plan, ctx)` should call `oat config set activeProject <plan.initialActiveChild>` ([plan.md:477](../plan.md)). In the current CLI, project activation stores paths such as `.oat/projects/shared/demo`: `oat project open` resolves the slug to `projectPath = join(projectsRoot, projectName)` before calling `setActiveProject` ([index.ts:131](../../../../../packages/cli/src/commands/project/open/index.ts), [index.ts:169](../../../../../packages/cli/src/commands/project/open/index.ts)), and active-project resolution later joins the stored value directly to the repo root ([oat-config.ts:505](../../../../../packages/cli/src/config/oat-config.ts), [oat-config.ts:515](../../../../../packages/cli/src/config/oat-config.ts)). Passing only `plan.initialActiveChild` would store a bare slug and make the next OAT command look for `<repo>/<slug>/state.md`. Fix `finalizeSplit` to activate the repo-relative child project path or call `oat project open <child-slug>`, and add a test that `.oat/config.local.json.activeProject` equals `.oat/projects/<scope>/<initialActiveChild>` after finalization.

3. **Resume cannot recreate a missing child from the on-disk data the plan persists.** `p02-t05` requires `detectPartialSplit` to reconstruct a `ChildPlan` from a parent whose `oat_children` lists `['a', 'b', 'c']` while only `a/` and `b/` exist, then `resumeSplit` should create missing `c` ([plan.md:491](../plan.md), [plan.md:495](../plan.md)). But the parent writer only records `oat_children` slugs/order in `state.md` and broad context/integration sketch in `discovery.md` ([plan.md:431](../plan.md), [plan.md:433](../plan.md)); the designed parent state model likewise only stores `oat_children: string[]` ([design.md:345](../design.md), [design.md:349](../design.md)). `seedChildren` needs child-specific data from `ChildPlan` such as inherited context, known dependencies, order, foundation child, and initial active child ([design.md:188](../design.md), [design.md:199](../design.md)). If a split fails before a child discovery is written, the documented on-disk parent does not contain enough information to seed the missing child deterministically. Fix by persisting the normalized `ChildPlan` or an equivalent child registry with required seed data before the first child write, or narrow resume to only states where that durable plan exists. Add a resume fixture that proves a missing child receives its original inherited context and dependencies.

4. **The detection evaluator surface drifts from the accepted architecture and from installed skill command conventions.** The design says the codified-signal evaluator is small hook logic that lives inside `oat-project-discover` and is not a separate tool ([design.md:64](../design.md), [design.md:68](../design.md), [design.md:269](../design.md), [design.md:272](../design.md)). The plan instead adds a public-ish `oat project split evaluate-signals` CLI subcommand ([plan.md:321](../plan.md), [plan.md:335](../plan.md)) and tells `oat-project-discover/SKILL.md` to invoke it via `pnpm run cli -- project split evaluate-signals` ([plan.md:661](../plan.md), [plan.md:664](../plan.md)). Existing shipped skills call the installed `oat` CLI for workflow actions and use `pnpm run cli -- ...` only as a local fallback pattern, not as canonical skill prose. Fix by choosing one contract: either update the design to bless a CLI-backed evaluator and write the skill command as `oat project split evaluate-signals` with an explicit local-dev fallback, or remove the evaluator subcommand and keep the signal scoring inline inside the discover hook as designed.

### Medium

None.

### Minor

None.

## Prior Findings Disposition

| Prior finding                                                         | Status   | Notes                                                                                                                   |
| --------------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------- |
| `p01-t06` scheduled `run` before its helpers and omitted registration | Resolved | `p01-t06` now covers only `evaluate-signals` + `validate-plan`; `p02-t07` adds `run`; command registration is explicit. |
| State-validation tasks targeted the wrong validation surface          | Resolved | The plan now introduces `packages/cli/src/validation/project-state.ts` and keeps `frontmatter.ts` out of validation.    |
| Stale `packages/cli/src/projects/list/` path in `p03-t03`             | Resolved | `p03-t03` now creates `packages/cli/src/commands/project/list.integration.test.ts`.                                     |

## Spec/Design Alignment

### Requirements Coverage

| Requirement                                                               | Status  | Notes                                                                                                        |
| ------------------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------ |
| Standalone `oat-project-split` skill invoked from discover and brainstorm | Partial | The handoff exists in plan form, but non-interactive origin handling is lost at the normalized run boundary. |
| Coordination parent with no executable-phase files                        | Covered | Parent file invariant remains explicitly tested in p02-t02/p02-t06.                                          |
| Seeded child discovery with mandatory inherited-context revalidation      | Partial | Initial seeding is planned, but resume cannot recreate missing child seed data from persisted parent state.  |
| Parent/listing/dashboard behavior                                         | Partial | Listing/dashboard paths are corrected, but activation writes the wrong shape into `activeProject`.           |
| Detection hook semantics                                                  | Partial | The plan currently creates a CLI evaluator despite the design calling for inline hook logic.                 |

### Extra Work

- `oat project split evaluate-signals` is extra command surface relative to the current design unless the design is updated to bless it.

## Verification Commands

Commands run during re-review:

```bash
git status --short
pnpm run cli -- project validate-plan --project-path .oat/projects/shared/oat-project-split
```

Result: working tree was clean before this re-review artifact was written, and plan validation passed.

Suggested verification after fixes:

```bash
pnpm run cli -- project validate-plan --project-path .oat/projects/shared/oat-project-split
pnpm lint && pnpm type-check
```

## Recommended Next Step

Run `oat-project-review-receive` again to convert these remaining Important findings into plan fixes before starting `oat-project-implement`.
