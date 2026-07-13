---
oat_generated: true
oat_generated_at: 2026-07-13T23:37:54Z
oat_review_scope: plan
oat_review_type: artifact
oat_review_invocation: gate
oat_project: .oat/projects/shared/cli-scaffold-and-ergonomics-fixes
oat_gate_run_id: b57aa465-c9b4-4541-bcfb-d6c257d63587
oat_gate_target: codex-5-6-sol-max
oat_gate_runtime: codex
oat_invocation_model: gpt-5.6-sol
oat_invocation_reasoning_effort: max
oat_invocation_source: exec-target-config
---

# Artifact Review: plan

**Reviewed:** 2026-07-13T23:37:54Z
**Scope:** Revised quick-mode implementation plan, including wave-2 operator feedback item 4 and task `p05-t02`
**Files reviewed:** 2 primary artifacts
**Commits:** Not applicable (artifact review)

## Summary

The revised plan preserves its review history and maps wave-2 item 4 to a cohesive, bounded `p05-t02` that owns the expected command, tests, wiring, and canonical-skill migration. It is not ready to pass the gate: the planned skill migration can leave the managed index stale after required `scope_estimate` enrichment, the declared tests do not verify several explicit behaviors that make the new creator atomic and usable without a repo-local template, and the artifact still advertises implementation readiness despite its deliberately non-passed re-review state; additional verification gaps cover safe input serialization and the mandatory canonical-skill version bump.

Findings: 0 critical, 3 important, 2 medium, 0 minor

**Blocking findings exist:** Yes. The three Important findings block this gate threshold.

## Dispatch Audit

Dispatch: scope=plan action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-gpt-5-6-sol-high

## Findings

### Critical

None

### Important

- **The canonical-skill migration can leave `scope_estimate` stale in the managed index** (`.oat/projects/shared/cli-scaffold-and-ergonomics-fixes/plan.md:296`)
  - Issue: The new command regenerates the index before the plan's retained “post-create enrichment.” The current canonical skill requires the agent to propose and confirm `scope_estimate` (`.agents/skills/oat-pjm-add-backlog-item/SKILL.md:103`), while the index renderer reads that field into its Estimate column (`packages/cli/src/commands/backlog/regenerate-index.ts:55`). Because the minimum command surface deliberately does not expose `scope_estimate`, the skill must edit it after `oat backlog new`; unless it regenerates again afterward, the final item and index disagree. The planned skill-contract assertion only requires `oat backlog new` and rejects the old creation sequence (`plan.md:280`), so every declared check can pass while the migrated workflow violates the discovery criterion that the managed index is refreshed.
  - Fix: Require the migrated skill to preserve its acceptance-criteria and `scope_estimate` collection/enrichment contract, then run `oat backlog regenerate-index` after any post-create change to an index-visible field. Update the semantic skill test to distinguish that required post-enrichment refresh from the obsolete `generate-id` + hand-authored creation sequence, and assert that the final skill flow reports the confirmed estimate and refreshed index. Alternatively, expose and pass `scope_estimate` before the command's atomic regeneration, but that would expand the discovery-approved minimum CLI surface and should be an explicit artifact decision.

- **The test plan does not verify the fallback and failure paths that establish atomic creation** (`.oat/projects/shared/cli-scaffold-and-ergonomics-fixes/plan.md:273`)
  - Issue: Step 2 explicitly promises repo-local template precedence with bundled-assets fallback, removal of shipped `oat_template` metadata, priority/scope validation, exclusive creation, and deletion of the newly written item when index regeneration fails (`plan.md:287-294`). The RED/GREEN and final verification lists cover ordinary overrides, collisions, and successful index regeneration, but they never require cases for missing-local-template fallback/precedence, absence of both template-only keys, invalid priority or scope, or rollback after a forced regeneration failure (`plan.md:273-280`, `plan.md:298-308`). These are not incidental details: bundled fallback is the installed-CLI path, leaked template markers misclassify a generated record, and rollback is the behavior that makes the command's multi-file operation atomic. The adjacent decision creator demonstrates the repository's concrete convention with separate bundled-fallback and rollback tests (`packages/cli/src/commands/decision/new.test.ts:101`, `packages/cli/src/commands/decision/new.test.ts:177`).
  - Fix: Add explicit `new.test.ts` scenarios that (1) select the repo-local real template when present and the bundled real template when local is absent, (2) assert both `oat_template` and `oat_template_name` are absent from generated frontmatter, (3) reject every unsupported priority/scope before item or index mutation, (4) prove `wx`/collision behavior does not overwrite an active item, and (5) force `regenerateBacklogIndex` to fail after the write and assert the new item is removed while pre-existing files and index bytes are preserved. Name these behaviors in Step 1, Step 4, and the expected results so the implementation cannot satisfy the plan without them.

- **The revised plan still routes directly to implementation while its re-review is unresolved** (`.oat/projects/shared/cli-scaffold-and-ergonomics-fixes/plan.md:2`)
  - Issue: After adding wave-2 scope, the plan row was intentionally changed from `passed` to `fixes_completed` (`plan.md:459`) and state records that the revision awaits re-review (`state.md:60-71`), but the plan frontmatter remains `oat_status: complete`, `oat_ready_for: oat-project-implement`, and `oat_phase_status: complete` (`plan.md:2-7`). The quick-start lifecycle contract requires a non-passed review outcome to retain its actual status and forbids exposing a partially reviewed quick plan to implementation (`.agents/skills/oat-project-quick-start/SKILL.md:630-655`). Live `oat project status --json` consequently recommends `oat-project-implement` even though the plan row and state say review is pending, so a normal lifecycle continuation can bypass this gate.
  - Fix: When post-pass scope changes invalidate the plan review, revert plan readiness to the pre-review state (`oat_status: in_progress`, `oat_ready_for: null`, `oat_phase_status: in_progress`) and keep project state aligned until a clean gate outcome is durably recorded. After the revised plan actually passes, atomically restore complete/implementation-ready frontmatter together with the `plan` Reviews-row update. Add this downgrade/restore rule to the scope-revision bookkeeping path so future post-pass additions cannot leave contradictory routing state.

### Medium

- **User-controlled frontmatter values lack a YAML round-trip acceptance case** (`.oat/projects/shared/cli-scaffold-and-ergonomics-fixes/plan.md:277`)
  - Issue: The real backlog template single-quotes `{title}` (`.oat/templates/backlog-item.md:3`), and the command accepts arbitrary title and label text. A renderer that performs direct placeholder replacement can emit invalid YAML for a normal title such as `Don't drop labels`, while still passing the planned simple default/override assertions. The plan says to render the real template and write canonical frontmatter but does not require safe YAML serialization or parsing the generated record back to the original values.
  - Fix: Require structured YAML serialization for generated frontmatter and add a real-template test using YAML-significant title/label values (for example apostrophes, colons, or `#`). Parse the written frontmatter and assert exact value/array round trips, while also confirming description and Acceptance Criteria body content remains literal and the template-only metadata is absent.

- **The declared verification command does not enforce the required canonical-skill version bump** (`.oat/projects/shared/cli-scaffold-and-ergonomics-fixes/plan.md:307`)
  - Issue: The task correctly requires exactly one patch bump for `.agents/skills/oat-pjm-add-backlog-item/SKILL.md` (`plan.md:269`), matching the repository `AGENTS.md` contract. However, `pnpm oat:validate-skills` expands to `internal validate-oat-skills` without a base reference (`package.json:9`); the CLI only enables changed-skill version comparison when `--base-ref` is supplied (`packages/cli/src/commands/internal/validate-oat-skills.ts:168-173`). The task can therefore pass every local verification command with an unchanged version, leaving CI as the first enforcement point.
  - Fix: Add a base-relative version check to p05-t02 verification, such as `pnpm run cli -- internal validate-skill-version-bumps --base-ref origin/main` or `pnpm run cli -- internal validate-oat-skills --base-ref origin/main`, using the final integration base after the required rebase. Apply the same explicit check to p05-t01 or to the shared p07 completion gate so both canonical skill edits are covered.

### Minor

None

## Requirements/Discovery Alignment

**Evidence sources used:** primary quick-mode artifacts `.oat/projects/shared/cli-scaffold-and-ergonomics-fixes/plan.md` and `.oat/projects/shared/cli-scaffold-and-ergonomics-fixes/discovery.md`; lifecycle context from `state.md`, `implementation.md`, live `oat project status --json`, and the quick-start readiness contract; both archived plan-review artifacts for review-history intent; canonical plan rules from `.agents/skills/oat-project-plan-writing/SKILL.md`; the live backlog template, canonical `oat-pjm-add-backlog-item` skill, backlog init/ID/index primitives and tests, decision-creation fallback/rollback precedent, repository `AGENTS.md`, and release scripts. Spec and design artifacts are absent and optional in quick mode.

### Discovery Coverage

| Discovery requirement / constraint                       | Status  | Notes                                                                                                                                                                   |
| -------------------------------------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Scaffold placeholder repair and real-template regression | covered | `p01-t01` exercises real scaffold templates, expected types/values, and unresolved-token rejection.                                                                     |
| Non-TDD plan-shape guidance                              | covered | `p02-t01` preserves the TDD example while documenting the actual stable-ID, verification, and atomic-commit invariants.                                                 |
| Actionable no-args tools update behavior                 | covered | `p03-t01` selects the safe copy-pasteable error path.                                                                                                                   |
| No placeholder backlog summaries                         | covered | `p04-t01` validates a trimmed summary before mutation and preserves `--wont-do`.                                                                                        |
| Complete decision records and summary promotion          | covered | `p05-t01` owns CLI inputs, help, semantic skill verification, canonical skill versioning, and focused tests.                                                            |
| Wave-2 item 4: one-command backlog scaffolding           | partial | `p05-t02` has cohesive ownership and covers the main success path, but atomic fallback/failure verification and the final post-enrichment index refresh are incomplete. |
| Stale CLI grammar detection and release-callout policy   | covered | `p06-t01` owns bounded doctor detection plus semantic release-guidance verification.                                                                                    |
| Noninteractive gate stdin                                | covered | `p06-t02` is mapped in discovery and preserves output, timeout, liveness, and diagnostics.                                                                              |
| Lockstep package release and shipped assets              | covered | `p07-t01` owns all five versions, the generated version manifest, workspace/docs gates, and `release:validate`.                                                         |

### Canonical Plan Readiness

- Required frontmatter and `Reviews`, `Implementation Complete`, and `References` sections are present.
- Task IDs are stable and monotonic (`p01-t01` through `p07-t01`); the added task correctly uses `p05-t02`, and phase/task totals agree at nine.
- Existing Reviews rows and archived artifact references are preserved; no historical row deletion is recommended.
- `p05-t02` is independently committable and its file scope is cohesive. Its missing checks fit inside the already-owned `new.test.ts` and `skills.test.ts` files.
- The `p02`-`p06` parallel group remains coherent: phase write sets are disjoint, the two p05 tasks are explicitly sequential in one worktree, and p07 follows all merges.
- No `Dispatch Profile` is present; omission is normal and is not a finding.

### Extra Work (not in declared discovery)

None. The new backlog command and canonical-skill migration directly implement the approved wave-2 requirement; the existing release and gate tasks remain mapped to discovery.

## Verification Commands

Run these after revising the plan:

```bash
pnpm exec tsx --tsconfig packages/cli/tsconfig.json packages/cli/src/index.ts --json project validate-plan --project-path .oat/projects/shared/cli-scaffold-and-ergonomics-fixes
pnpm exec oxfmt --check .oat/projects/shared/cli-scaffold-and-ergonomics-fixes/plan.md .oat/projects/shared/cli-scaffold-and-ergonomics-fixes/discovery.md
rg -n 'bundled|precedence|invalid priority|invalid scope|rollback|scope_estimate|regenerate-index|YAML' .oat/projects/shared/cli-scaffold-and-ergonomics-fixes/plan.md
```

Current read-only results: the source CLI plan validator returned `{"valid":true}`, formatting passed for both primary artifacts, stable task/phase headings and all required sections were present, and the review artifact path was available before writing.

## Recommended Next Step

Run the `oat-project-review-receive` skill to convert the three Important and two Medium findings into artifact-local revisions, then re-run the plan gate review.
