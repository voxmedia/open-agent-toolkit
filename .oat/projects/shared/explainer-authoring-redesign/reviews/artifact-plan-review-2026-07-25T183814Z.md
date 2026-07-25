---
oat_generated: true
oat_generated_at: 2026-07-25T18:38:14Z
oat_review_scope: plan
oat_review_type: artifact
oat_review_invocation: gate
oat_project: .oat/projects/shared/explainer-authoring-redesign
oat_gate_headless: true
oat_gate_run_id: 8fcfe216-631d-48ed-b4d2-063065928cb6
oat_gate_target: cursor-gpt-5-6-sol-max
oat_gate_runtime: cursor
oat_invocation_model: gpt-5.6-sol-max
oat_invocation_reasoning_effort: provider-default
oat_invocation_source: exec-target-config
---

# Artifact Review: plan

**Reviewed:** 2026-07-25T18:38:14Z
**Scope:** Implementation plan readiness and alignment for the quick-mode project
**Files reviewed:** 3 project artifacts plus targeted repository evidence
**Commits:** Not applicable (artifact review)

## Review Scope

**Primary artifact:** `.oat/projects/shared/explainer-authoring-redesign/plan.md`
**Upstream artifacts:** `discovery.md`, `design.md`
**Supporting evidence:** `state.md`, `implementation.md`, current explainer-kit contracts, callers, and tests
**Workflow mode:** quick
**Dispatch Profile advisory:** No `## Dispatch Profile` section is present. Its omission is permitted; no explicit ceiling rows were evaluated.
**Gate route:** inline (runtime=cursor, cliRoot=`/Users/thomas.stang/Code/vox/open-agent-toolkit`)

Dispatch: scope=plan action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=gpt-5.6-sol-high target=oat-reviewer-gpt-5-6-sol-high

## Summary

The plan covers the intended two-path authoring architecture, but it is not ready for implementation. Five Important findings block the plan: the v1/v2 schema transition is not executable as staged, expansion artifacts have no author protocol, known v1 consumers and compatibility fixtures are omitted, the declared parallel group has a shared write surface, and release validation occurs before the final shipped changes.

Findings: 0 critical, 5 important, 3 medium, 0 minor

## Findings

### Critical

None

### Important

- **Define an author protocol that can actually return expansion artifacts** (`plan.md:45-48`)
  - Issue: `author-result/v2` contains exactly one `artifactId` and one Markdown-or-HTML content payload, while p06-t01 says to “accept expansion artifacts the author returns” (`plan.md:395-403`). No task defines how an author proposes additional artifacts, assigns their IDs/types/briefs, or returns more than one result. This leaves the discovery/design requirement for content-driven set scaling unimplementable.
  - Fix: Choose and document an explicit expansion protocol—such as a set-planning response followed by per-artifact author calls, or a versioned multi-artifact result—and add schema, limit-validation, hub-linking, persistence, and end-to-end test work to the relevant tasks.
  - Requirement: Discovery decision 9; Design component 7.

- **Make the staged v1/v2 schema transition file-complete and internally possible** (`plan.md:40-53`)
  - Issue: p01-t01 marks the existing `author-request.schema.json` and `author-result.schema.json` paths as “Create” and simultaneously requires v1 and v2 to remain registered. Those paths currently contain v1 (`.agents/skills/explainer-kit/schemas/author-request.schema.json:3`, `.agents/skills/explainer-kit/schemas/author-result.schema.json:3`), and the registry currently maps each contract kind to one file (`.agents/skills/explainer-kit/scripts/lib/contracts.mjs:6-28`). Later, p06-t01 requires deleting v1 schemas and registrations but omits the schema files and `contracts.mjs` from both its file list and staging command (`plan.md:388-419`).
  - Fix: Specify distinct versioned schema paths and version-aware registration for coexistence, or defer the atomic swap until p06. In either case, list and stage every schema/registry/test file in the task that changes it so each intermediate commit can pass.
  - Requirement: Design author-contract migration.

- **Cover every known v1 caller and compatibility fixture in the clean-break migration** (`plan.md:388-419`)
  - Issue: The plan removes author v1 in p06 but scopes migration mainly to the core runner and OAT adapter. Canonical shipped guidance still requires `author-request/v1` → `author-result/v1` (`.agents/skills/oat-wave-execute/SKILL.md:413-425`), and existing schema, adapter, and wrapper smoke fixtures construct v1 results (`.agents/skills/explainer-kit/tests/schemas.test.mjs:21-22`, `.agents/skills/oat-explainer-kit/tests/run.integration.test.mjs:683-705`, `tools/smoke/explainer-kit/wrapper-compatibility.test.mjs:244-264`). The declared full-suite and release checks will fail, or a shipped caller will remain stale, if implementation follows the listed files.
  - Fix: Add an explicit same-release consumer-migration task that inventories canonical v1 references, updates the wave caller, core/adapter tests, package-layout and wrapper smoke fixtures, bumps every changed canonical skill once, and refreshes provider views with the repository’s sync command.
  - Requirement: Design migration promise that consumers move in the same release.

- **Remove the shared write surface from the declared parallel phase group** (`plan.md:522-535`)
  - Issue: Frontmatter declares p02, p03, and p04 parallel, and the narrative says their write sets are disjoint, but p03-t02 and p04-t02 both modify `.agents/skills/explainer-kit/tests/templates.test.mjs` (`plan.md:230-255`, `plan.md:309-330`). Calling the edits “append-oriented” and prescribing merge order does not make independently branched writes disjoint, so the orchestration claim can produce avoidable merge conflicts.
  - Fix: Split the narrative and shell tests into disjoint files, or encode a dependency and remove the overlapping phases/tasks from the parallel group. Update `oat_plan_parallel_groups` and the Parallelism section together.

- **Run release closure after all shipped docs and skill edits, with one bump per skill** (`plan.md:474-519`)
  - Issue: p07-t02 bumps versions and runs `pnpm release:validate`, but p08 then changes shipped docs and `explainer-kit/SKILL.md` without a final release validation. p02-t02 also requests an `oat-explainer-kit` version bump before p07-t02 requests another. Repository policy requires one PR-scoped bump per changed skill and requires release validation before finishing all bundled-asset/docs changes (`AGENTS.md:7-12`, `AGENTS.md:51-54`).
  - Fix: Move the version-bump/release-validation task after documentation, remove the earlier adapter bump, name the five lockstep package manifests explicitly, and make the final task run release validation against the complete tree.

### Medium

- **Specify the versioned approval-record migration, not only the new field** (`plan.md:120-141`)
  - Issue: p01-t04 says to add `marking` but does not say to emit `explainer-kit.content-approval/v2`, define read/resume compatibility, or update all version assertions. The design explicitly declares `content-approval/v2` (`design.md:224-239`), while the current implementation hard-codes v1 for new and resumed records (`.agents/skills/explainer-kit/scripts/lib/content-approval.mjs:28-55`, `.agents/skills/explainer-kit/scripts/lib/content-approval.mjs:82-93`).
  - Fix: Add explicit v2 emission and compatibility behavior to the task, with tests for new unattended, interactive, and resumed v1 records.

- **Restore the missing GFM strikethrough requirement in parser/render tests** (`plan.md:201-220`)
  - Issue: The design commits the narrative path to CommonMark plus GFM tables, task lists, and strikethrough (`design.md:136-153`), but the parser task lists only tables/task lists and no later task covers strikethrough rendering or fixtures.
  - Fix: Add strikethrough to the supported AST/render vocabulary and verification fixtures, or explicitly defer it and align the design before implementation.

- **Define `program-recap` v2 semantics and assert them** (`plan.md:95-111`)
  - Issue: p01-t03 lists all four recipes, but its implementation guidance defines floors/expansion only for `project-recap`, `project-explainer`, and `engineer-tour`; `program-recap` is omitted. The verification only checks that recipes load, so an arbitrary or accidentally unchanged program-recap shape could pass.
  - Fix: State the program recap’s floor, authoring path, brief, allowed expansion, and limits, then add semantic assertions rather than load-only coverage.

### Minor

None

## Requirements/Design Alignment

**Evidence sources used:** `discovery.md`, `design.md`, `plan.md`, plus targeted current-contract/caller/test evidence.

### Requirements Coverage

| Requirement / decision                         | Status  | Notes                                                                                         |
| ---------------------------------------------- | ------- | --------------------------------------------------------------------------------------------- |
| Two first-class authoring paths                | covered | p03, p04, and p06 map the narrative and artistic paths.                                       |
| Prose briefs carry quality                     | covered | p02 creates per-recipe briefs and lifecycle guidance.                                         |
| Floor plus content-driven expansion            | partial | Recipe tasks exist, but the author/result protocol cannot express expansion artifacts.        |
| Guidelines become manifest warnings            | covered | p05-t01 and p06 integration cover warning production.                                         |
| Render QA in every mode                        | covered | p05-t02 covers probes and graceful skip; p06 integrates the pipeline.                         |
| Auto-drafted versus human-approved marking     | partial | Behavior is planned, but the required v2 approval-record migration is underspecified.         |
| Same-release v1 clean break                    | partial | Known callers and compatibility fixtures are outside the listed migration scope.              |
| Dependency-light CommonMark/GFM narrative path | partial | Strikethrough is omitted from the plan.                                                       |
| Repository release guardrails                  | partial | Final shipped edits occur after release validation, and one skill is scheduled for two bumps. |

### Extra Work (not in declared requirements)

None

## Verification Commands

After revising the plan:

```bash
pnpm exec oxfmt --check ".oat/projects/shared/explainer-authoring-redesign/plan.md"
pnpm run cli -- project status --project-path ".oat/projects/shared/explainer-authoring-redesign"
```

Then rerun the gate-originated artifact plan review.

## Recommended Next Step

Run the `oat-project-review-receive` skill to convert the blocking findings into plan fix tasks before implementation.
