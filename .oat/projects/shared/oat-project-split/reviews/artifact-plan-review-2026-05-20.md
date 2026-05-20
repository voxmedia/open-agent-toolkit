---
oat_generated: true
oat_generated_at: 2026-05-20
oat_review_scope: plan
oat_review_type: artifact
oat_review_invocation: manual
oat_project: .oat/projects/shared/oat-project-split
---

# Artifact Review: plan

**Reviewed:** 2026-05-20
**Scope:** `artifact plan`
**Files reviewed:** 3
**Commits:** N/A (artifact review)

## Summary

The plan captures the settled `oat-project-split` shape and has a coherent phase decomposition, including a valid `oat_plan_parallel_groups` declaration. It is not ready for implementation yet: several tasks point at speculative/non-existent repo paths, one core helper surface has no planned production invocation path from the skills that are supposed to use it, and the seeded-child discovery flag is assigned to the shared discovery template instead of a split-specific seed path.

## Findings

### Critical

None.

### Important

1. **Missing production invocation path for split helpers and signal evaluator.** The plan creates pure TypeScript modules for split behavior such as `signals.ts` and `child-plan.ts` ([plan.md:148](../plan.md), [plan.md:218](../plan.md)), and later tasks expect skill prose to call the signal evaluator from `oat-project-discover` and `oat-brainstorm` ([plan.md:529](../plan.md), [plan.md:569](../plan.md)). However, no task registers a CLI command, script, or skill-local executable that those Markdown skills can invoke at runtime. As written, implementation can produce tested helper modules while leaving the actual skills with no concrete production path to execute them. Add an explicit integration task that exposes the split operations and signal evaluation through a supported surface, such as `oat project split ...`, a generated skill script, or a documented `pnpm run cli -- ...` command, then update the discover/brainstorm tasks to call that surface.

2. **Several task file paths are speculative or wrong, so the plan is not directly runnable.** Phase 1 points at `packages/cli/src/state/schema.ts` and a `src/state/__tests__/schema.test.ts` runner ([plan.md:68](../plan.md), [plan.md:90](../plan.md)), but the current repo has state handling under `packages/cli/src/commands/state/` and no `packages/cli/src/state/schema.ts`. Phase 3 similarly points at `packages/cli/src/projects/list/command.ts` and `packages/cli/src/state/dashboard/render.ts` ([plan.md:450](../plan.md), [plan.md:481](../plan.md)), while the current repo uses paths such as `packages/cli/src/commands/project/list.ts` and `packages/cli/src/commands/state/generate.ts`. The plan includes "or equivalent - confirm path", but an implementation-ready OAT plan should not leave core target files and scoped test commands unresolved. Add a short repo-mapping task before implementation, or update the affected tasks now with the actual file paths and verification commands.

3. **The seeded-child revalidation flag is assigned to the global discovery template.** The plan tells p01-t02 to modify `.oat/templates/discovery.md` to add `oat_inherited_context_revalidated: false` ([plan.md:117](../plan.md), [plan.md:118](../plan.md)). The design defines that field as a frontmatter addition on each split-created child discovery only ([design.md:416](../design.md), [design.md:436](../design.md)), and ordinary single-project discovery changes are explicitly out of scope ([discovery.md:269](../discovery.md), [discovery.md:271](../discovery.md)). The current repo has only one shared `.oat/templates/discovery.md`, so implementing this literally would leak split-specific revalidation state into every new discovery. Move this requirement to the child seeder task or introduce a dedicated seeded-child template, and leave the standard discovery template unchanged unless the broader lifecycle intentionally supports that flag for all projects.

### Medium

None.

### Minor

None.

## Spec/Design Alignment

### Requirements Coverage

| Requirement                                                               | Status  | Notes                                                                                                                       |
| ------------------------------------------------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------- |
| Standalone `oat-project-split` skill invoked from discover and brainstorm | Partial | Planned, but the plan lacks a concrete invocation surface for helper modules used by those skill hooks.                     |
| Coordination parent with no executable-phase files                        | Covered | p02-t02 includes explicit invariant checks for absent `spec.md` / `design.md` / `plan.md` / `implementation.md`.            |
| Seeded child discovery with mandatory inherited-context revalidation      | Partial | Covered conceptually, but currently routed through the shared discovery template instead of split-created child seeds only. |
| Parent/listing/dashboard behavior                                         | Covered | p03 covers default filtering, `--include-coordination`, and dashboard `## Decompositions`.                                  |
| Dogfood declared/detected/resume paths                                    | Covered | p05 includes all three dogfood scenarios.                                                                                   |

### Extra Work

None beyond scope. The main concern is that some planned work needs a sharper production surface and exact repo path mapping before implementation begins.

## Verification Commands

Commands run during review:

```bash
git status --short
pnpm run cli -- project validate-plan --project-path .oat/projects/shared/oat-project-split
```

Result: working tree was clean before the review artifact was written, and plan parallelism validation passed.

Suggested verification after fixes:

```bash
pnpm run cli -- project validate-plan --project-path .oat/projects/shared/oat-project-split
pnpm lint && pnpm type-check
```

## Recommended Next Step

Run `oat-project-review-receive` to convert the Important findings into plan fix tasks before starting `oat-project-implement`.
