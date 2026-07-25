---
oat_generated: true
oat_generated_at: 2026-07-25T19:10:42Z
oat_review_scope: plan
oat_review_type: artifact
oat_review_invocation: gate
oat_project: .oat/projects/shared/explainer-authoring-redesign
oat_gate_headless: true
oat_gate_run_id: b4dd888e-cccb-4436-b1a7-9fff0242d3e6
oat_gate_target: cursor-gpt-5-6-sol-max
oat_gate_runtime: cursor
oat_invocation_model: gpt-5.6-sol-max
oat_invocation_reasoning_effort: provider-default
oat_invocation_source: exec-target-config
---

# Artifact Review: plan

**Reviewed:** 2026-07-25T19:10:42Z
**Scope:** Implementation plan readiness and upstream alignment for the quick-mode project
**Files reviewed:** 5 project artifacts plus targeted repository evidence
**Commits:** Not applicable (artifact review)

## Review Scope

**Primary artifact:** `.oat/projects/shared/explainer-authoring-redesign/plan.md`
**Upstream artifacts:** `discovery.md`, `design.md`
**Supporting project artifacts:** `state.md`, `implementation.md`
**Workflow mode:** quick
**Dispatch Profile advisory:** No `## Dispatch Profile` section is present. Its omission is permitted; no explicit ceiling rows were evaluated.
**Gate route:** inline (runtime=cursor, cliRoot=`/Users/thomas.stang/Code/vox/open-agent-toolkit`)

Dispatch: scope=plan action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=gpt-5.6-sol-high target=oat-reviewer-gpt-5-6-sol-high

## Summary

The revised plan closes the prior review's stated gaps, but four Important contract-boundary gaps still make it unsafe to implement as written. Expansion requests remain under-specified, the recipe-v2 transition is not executable across the planned commits or complete across consumers, the supposedly unchanged manifest cannot represent planned outputs, and the real lifecycle callers still do not own author construction. The render-QA warning path also needs an explicit integration task.

Findings: 0 critical, 4 important, 1 medium, 0 minor

## Findings

### Critical

None

### Important

- **Make expansion policy—not the author response—select authoring, briefs, and shells** (`plan.md:33`)
  - Issue: The floor result may propose `{id, type, authoring, rationale}`, while recipes declare only `expansion.allowedTypes[]` and limits (`plan.md:33-41`, `plan.md:87-93`). That lets an author choose the rendering path even though discovery and design say the artifact type/recipe selects it (`discovery.md:48-54`, `design.md:19-25`). More immediately, the pipeline cannot construct the required follow-up `author-request/v2`: accepted expansion entries have no declared `briefRef` or shell/template mapping, even though the request requires a brief and artistic artifacts require a shell. The plan also omits cross-proposal identity checks, so duplicate IDs or collisions with floor IDs can overwrite content paths or create duplicate manifest identities.
  - Fix: Change the expansion declaration to map each allowed type/profile to its fixed `authoring`, `briefRef`, and optional shell/template reference. Make proposals reference that declared profile rather than choose `authoring`; validate safe unique IDs, floor/proposal collisions, and authoring/type consistency before issuing follow-up requests. Add contract, recipe, pipeline, and end-to-end fixtures for those cases.
  - Requirement: Discovery decisions 1 and 9; Design components 1, 2, 4, and 7.

- **Stage recipe v2 so every intermediate commit passes and every consumer migrates** (`plan.md:80`)
  - Issue: p01-t02 replaces `artifacts[]` validation in `recipes.mjs` but does not modify the four v1 recipe files loaded and validated at module import, so its own `recipes.test.mjs` verification cannot pass unless dual-version support is added—yet coexistence is not specified. After p01-t03 rewrites the recipes, the core still iterates `recipe.artifacts` in `scripts/run.mjs`, and many tests/callers still request or assert recipe v1. p06-t03 inventories only `author-request/v1|author-result/v1`; it therefore misses recipe consumers such as the OAT adapter's `resolve-config.mjs`, `oat-wave-program`, core render/run tests, and release/RC fixtures. Full validation is deferred to p08, too late to make p01-p07 independently green.
  - Fix: Define either a dual-version recipe registry through p06 or an atomic recipe/code migration that keeps every task commit executable. Expand p06-t03's inventory and file scope to cover `explainer-kit.recipe/v1`, recipe version callers, and `recipe.artifacts` consumers across `.agents`, `tools`, and `packages`; include the affected core, adapter, archive, smoke, and release tests.
  - Requirement: Design recipe-v2 migration and same-release consumer promise.

- **Resolve planned outputs against the frozen manifest contract** (`plan.md:20`)
  - Issue: The plan says the manifest rail stays unchanged (`plan.md:20-26`), but p01-t03 introduces `page` artifacts (`plan.md:121-130`) while `manifest/v1` permits only `hub`, `diagram`, `explainer`, `deck`, and `catalog` (`.agents/skills/explainer-kit/schemas/manifest.schema.json:170-177`). p06-t02 also promises to surface approval marking in the manifest context (`plan.md:473-490`), but the manifest is `additionalProperties: false` and has no approval/marking field (`.agents/skills/explainer-kit/schemas/manifest.schema.json:5-20`). No task changes the manifest schema or the archive/export validators that enforce its exact v1 shape, so implementation must either fail manifest validation or omit required behavior.
  - Fix: Make an explicit boundary decision in the plan and design: reuse an existing artifact type such as `hub` or version the manifest to admit `page`; keep marking only in the approval record/run result or version the manifest to carry it. If the manifest changes, add its schema, contract tests, archive/export validation, fixtures, and compatibility migration to the task/file inventory.
  - Requirement: Discovery decisions 8 and 9; Design approval/marking and recipe components.

- **Assign author construction to the actual interactive and completion callers** (`plan.md:210`)
  - Issue: p02-t02 says it closes the lifecycle author-callback gap, but its file scope changes only `oat-explainer-kit` documentation (`plan.md:210-233`). The actual completion instructions invoke `runOatExplainer` in unattended mode and mention only the critic callback (`.agents/skills/oat-project-complete/SKILL.md:281-285`), while the adapter already rejects unattended calls without an author (`.agents/skills/oat-explainer-kit/scripts/run.mjs:168-175`). p06-t02 passes callbacks through the adapter but still does not update those callers. Interactive ownership is also unresolved: p06-t01 removes synthetic `createContentModel`, promises drafts at the approval gate, but only defines missing-author behavior for unattended runs (`plan.md:444-459`).
  - Fix: List and edit the real lifecycle caller instructions and tests—at minimum `oat-project-complete` and implementation-tail closeout—to construct and pass the brief-aware author callback/module for unattended recap runs. Define whether interactive runs also require that callback or accept a separate explicit draft input, and test both interactive and unattended behavior. Refresh provider views and include all changed canonical skills in the final single-bump task.
  - Requirement: Discovery decisions 10 and 11; Design author-brief and approval components.

### Medium

- **Wire guideline and render-QA findings into run warnings instead of hard failures** (`plan.md:378`)
  - Issue: p05 says its helpers emit stable findings into manifest `warnings[]` and never block, but its file scopes include only `qa.mjs`, `render-qa.mjs`, and helper tests (`plan.md:378-428`). The current run path throws `E_QA` whenever `auditArtifactSet().valid` is false and never appends report issues to `state.warnings` (`.agents/skills/explainer-kit/scripts/run.mjs:169-190`). Although p06-t01 modifies `run.mjs`, it specifies author/render routing without assigning this warning conversion or a manifest-level integration test.
  - Fix: Assign the run-stage integration explicitly to p05 or p06: separate safety hard errors from editorial/layout warnings, append stable warning IDs (including the no-headless-runtime skip), and add run-integration assertions that warnings persist in a successful manifest in both modes.
  - Requirement: Discovery decisions 2 and 5; Design guideline-checker and render-QA components.

### Minor

None

## Requirements/Design Alignment

**Evidence sources used:** `discovery.md`, `design.md`, `plan.md`, `state.md`, `implementation.md`, plus targeted current contracts, callers, validators, and tests.

### Requirements Coverage

| Requirement / decision                     | Status  | Notes                                                                                    |
| ------------------------------------------ | ------- | ---------------------------------------------------------------------------------------- |
| Two first-class authoring paths            | partial | Floor paths are covered; expansion lets author responses select an under-specified path. |
| Prose briefs carry quality                 | partial | Brief tasks exist, but expansion and actual lifecycle callers lack deterministic wiring. |
| Floor plus content-driven expansion        | partial | The two-step protocol exists, but accepted proposals lack policy-owned request metadata. |
| Guidelines become manifest warnings        | partial | Helpers are planned; run-stage warning conversion and manifest integration are not.      |
| Render QA in every mode                    | partial | Probe work is planned, but current hard-fail behavior is not explicitly replaced.        |
| Auto-drafted versus human-approved marking | partial | Approval v2 is covered; the promised manifest representation is incompatible with v1.    |
| Same-release v1 clean break                | partial | Author-contract consumers are inventoried; recipe-v1 consumers are not.                  |
| Dependency-light rich narrative renderer   | covered | Parser, block renderer, diagrams, and anti-regression fixtures are assigned.             |
| Artistic HTML safety                       | covered | Parse-level validation, fixtures, shells, and pipeline routing are assigned.             |
| Repository release guardrails              | covered | Docs precede the final single-bump and release-validation task.                          |
| Declared parallelism                       | covered | p02-p04 now declare disjoint write sets and ordered downstream integration.              |

### Extra Work (not in declared requirements)

None

## Verification Commands

After revising the plan:

```bash
pnpm exec oxfmt --check ".oat/projects/shared/explainer-authoring-redesign/plan.md"
pnpm run cli -- project status --project-path ".oat/projects/shared/explainer-authoring-redesign" --json
```

Then rerun the gate-originated artifact plan review.

## Recommended Next Step

Run the `oat-project-review-receive` skill to convert the blocking findings into plan fix tasks before implementation.
