---
oat_generated: true
oat_generated_at: 2026-08-27T01:52:01Z
oat_review_scope: plan
oat_review_type: artifact
oat_review_invocation: gate
oat_project: .oat/projects/shared/user-scope-tool-packs
oat_gate_run_id: 64d3a6e3-43bd-4409-b3c4-00358807fa3e
oat_gate_target: claude-fable-skip-permissions
oat_gate_runtime: claude
oat_invocation_model: fable
oat_invocation_reasoning_effort: provider-default
oat_invocation_source: exec-target-config
---

# Artifact Review: plan

**Reviewed:** 2026-08-27T01:52:01Z
**Scope:** `plan.md` readiness and alignment with `spec.md` + `design.md`
(spec-driven mode)
**Files reviewed:** 3 (`plan.md`, `spec.md`, `design.md`), plus repository
verification of every `Create:`/`Modify:` path, package scripts, skill
manifests, and consumer skills referenced by the plan
**Commits:** n/a (artifact review)

Dispatch: route=inline; policy=inherit (project-state); selection=inherit-default;
model_axis=inherited; effort_axis=not-applicable; runtimeIdentity=not-reported.
Gate route: inline (runtime=claude, cliRoot validated against
`OAT_GATE_CLI_ROOT`).

## Summary

The plan is well-formed and executable: 33 stable `pNN-tNN` tasks, every
`Modify:` path exists in the repo and every `Create:` path is absent (the four
"missing" modify targets are files created by an earlier task in the same
plan), every RED/format/verify command resolves to a real script or vitest
target, phases are correctly sequential, the Reviews table is the widened
eight-column ledger, and all design components map to tasks. One Important
gap remains: the design's PJM adoption boundary requires the skills that
consume `oat tools has project-management` as an "is PJM enabled here" signal
(`oat-brainstorm`, `oat-project-document`, `oat-project-summary`) to preflight
repository adoption instead, and no task touches them — once PJM installs at
user scope, they will auto-run repository PJM writes in uninitialized repos
and hit the new fail-closed guard. Two Medium items cover a fifth
`resolve-tracking.sh` consumer missed by p04-t05 and a self-review row recorded
as `passed` without an artifact.

Findings: 0 critical, 1 important, 2 medium, 4 minor

## Findings

### Critical

None

### Important

- **Consumers of `oat tools has project-management` are not updated for
  user-scope PJM** (`.oat/projects/shared/user-scope-tool-packs/plan.md:950`,
  `design.md:305-309`, `design.md:473`)
  - Issue: `design.md` commits (Pack Inventory → `has --pack` rule, and PJM
    Adoption Guard → "Skills perform the CLI/read-only preflight before any
    write instruction") to updating the consuming workflow skills in the same
    release. Today three bundled skills use pack presence as a repository PJM
    adoption signal and then write repository PJM state automatically:
    `.agents/skills/oat-project-document/SKILL.md:165-172` (auto-invokes
    `oat-pjm-update-repo-reference`),
    `.agents/skills/oat-project-summary/SKILL.md:366-380` (auto-runs
    `oat decision init` / `oat decision new`), and
    `.agents/skills/oat-brainstorm/SKILL.md:219-221` plus
    `.agents/skills/oat-brainstorm/references/destinations.md:86` (offers PJM
    destinations). After FR1 (PJM installable at user scope) the check
    `oat tools has project-management` returns `true` in every repository on
    the machine, so these flows will attempt repository writes in
    uninitialized repos; after p04-t02
    those writes fail closed with a `CliError`, and `oat-project-summary`'s
    `oat decision init` fallback is explicitly removed as an adoption path
    (`design.md:468-470`). p04-t06 covers only the four `oat-pjm-*` skills;
    no task in the plan modifies these three skills, so the design decision is
    unmapped and the regression ships with the feature.
  - Fix: Add a task (e.g. `p04-t07`, after p04-t06) that (a) changes the three
    skills and `destinations.md` to gate repository PJM behavior on a
    read-only adoption preflight (the `resolvePjmAdoption()` state exposed via
    `oat pjm doctor --json` from p04-t01/p04-t02, or a documented equivalent)
    rather than on `oat tools has project-management`, keeping `tools has` only
    for capability checks; (b) bumps each changed skill's frontmatter
    `version:` once; (c) adds a contract test alongside
    `project-start-preflight-contracts.test.ts` asserting no bundled skill
    treats `tools has project-management` as an adoption signal; and (d) adds
    the task to FR6/FR9 in the `spec.md` Requirement Index and to the Phase 4
    verification command. Alternatively state explicitly in p04-t02 which
    read-only JSON field skills must consume so the three skill edits are
    unambiguous.
  - Requirement: FR6, FR9, NFR3

### Medium

- **A fifth `resolve-tracking.sh` consumer is outside p04-t05's scope**
  (`.oat/projects/shared/user-scope-tool-packs/plan.md:915-924`,
  `design.md:517-525`)
  - Issue: `.agents/skills/oat-repo-knowledge-index/SKILL.md:678` and `:682`
    invoke bare repo-relative `bash .oat/scripts/resolve-tracking.sh`. That
    skill is in the `workflows` pack (`skill-manifest.ts:75`), which is already
    user-eligible (`init/tools/index.ts:298-305`), and the script is declared
    in both `WORKFLOW_SCRIPTS` (`skill-manifest.ts:104`) and `DOCS_SCRIPTS`
    (`:132`). p04-t05 lists only the four docs skills and its RED step
    "reject[s] bare repo-relative `.oat/scripts/resolve-tracking.sh`": if the
    contract test sweeps bundled skills it fails on this file; if it is scoped
    to four skills, the design's scope-pairing rule ("Other shared
    templates/scripts use the same explicit scope-pairing rule") is silently
    unmet for the fifth consumer. `design.md:517` ("shared by four docs
    skills") is also stale on this point.
  - Fix: Add `.agents/skills/oat-repo-knowledge-index/SKILL.md` to p04-t05's
    Files, format command, and version-bump instruction, and make the RED step
    explicit that the contract test covers every bundled skill referencing
    `.oat/scripts/`. Note the design wording drift as an artifact-alignment
    update (five consumers across `docs` and `workflows`).

- **Plan self-review recorded as `passed` with no artifact**
  (`.oat/projects/shared/user-scope-tool-packs/plan.md:1219`)
  - Issue: The `plan`/`artifact` row with Status `passed`, Date 2026-08-27,
    Artifact `-`, and Invocation `manual` records the inline self-review as a
    completed review event. The ledger contract below the table
    (`plan.md:1221-1223`) and the review workflow reserve `passed` for a
    review that has an artifact and has been received with no unresolved
    Critical/Important/Medium findings; an artifact-less `passed` row can be
    read by routing/progress tooling as an already-cleared plan review and
    masks the configured gate. This gate review appends its own `received`
    row; the self-review row should not stand as `passed`.
  - Fix: During receive, treat the self-review row as a bookkeeping error:
    downgrade it to `pending` (it is unbound — Artifact `-` — so this does not
    regress a bound event) or annotate it in the Planning Checklist as an
    inline self-check rather than a review event. Do not delete the row.

### Minor

- **p05-t05 lists the wrong tracked artifacts for a lockstep bump**
  (`.oat/projects/shared/user-scope-tool-packs/plan.md:1139`, `:1148-1149`)
  - Issue: Prior lockstep bumps (`6f443c084`, `3a665b9c1`) did not touch
    `pnpm-lock.yaml` (workspace deps are `workspace:*` links) but did change
    tracked `packages/cli/assets/public-package-versions.json`, which
    `packages/cli/scripts/bundle-assets.sh:85` regenerates and `.gitignore:22`
    keeps tracked. The task omits that file and will leave it as an unexpected
    delta at p05-t06's `git status --short` check.
  - Suggestion: Replace `pnpm-lock.yaml` with
    `packages/cli/assets/public-package-versions.json` in the Files list and
    say it is regenerated by `pnpm build` (or `bundle-assets.sh`) and must be
    committed with the bump.

- **Requirement Index omits two mapped tasks** (`spec.md` Requirement Index;
  `plan.md:915`, `:1065`)
  - Issue: p04-t05 (skill-private / scope-paired resource resolution — FR2
    acceptance "Skill-private resources resolve relative to the installed
    skill directory") and p05-t03 (provider sync receives exact changed
    canonical paths — FR5 acceptance) appear in no `Planned Tasks` cell, so
    traceability from those acceptance criteria to tasks is broken.
  - Suggestion: Add p04-t05 to FR2 and p05-t03 to FR5 in the `spec.md`
    Requirement Index (artifact alignment, no plan change).

- **Task file lists and RED commands disagree in two tasks**
  (`.oat/projects/shared/user-scope-tool-packs/plan.md:886`, `:896`; `:574`,
  `:581`)
  - Issue: p04-t04 lists
    `install-project-management.test.ts` as modified but its RED command runs
    only `index.test.ts`; p02-t09's RED command runs
    `src/commands/tools/shared/auto-sync.test.ts` but the task's Files list
    does not include it.
  - Suggestion: Add `install-project-management.test.ts` to the p04-t04 RED
    command and `auto-sync.test.ts` to p02-t09's Files list so the implementer
    commits and runs the same set.

- **p05-t02 docs scope misses one page and the regenerated index**
  (`.oat/projects/shared/user-scope-tool-packs/plan.md:1031-1039`, `:1049-1050`)
  - Issue: `apps/oat-docs/docs/cli-utilities/configuration.md` documents the
    user/repo config split and already references `oat tools has`; the new
    user-config `tools` intent key and `pjm.initialized` marker belong there
    but the page is not listed. Also `apps/oat-docs/index.md` is
    auto-regenerated on `prebuild`/`predev` from page frontmatter; if any
    listed page's `description` changes, the regenerated index must be
    committed (the task only says not to hand-edit it).
  - Suggestion: Add `configuration.md` to the Files list and add a step to run
    `oat docs generate-index` (or rely on `pnpm build:docs`) and commit
    `apps/oat-docs/index.md` if it changes.

## Requirements/Design Alignment

**Evidence sources used:** `plan.md`, `spec.md` (Requirement Index), `design.md`
(component design, review disposition I1–m4), `state.md`, repository files
named by the plan (paths, `package.json` scripts, `skill-manifest.ts`,
`init/tools/index.ts`, `has-pack.ts`, `bundle-assets.sh`, consumer skills).

### Requirements Coverage

| Requirement | Status  | Notes                                                                                              |
| ----------- | ------- | -------------------------------------------------------------------------------------------------- |
| FR1         | planned | p01-t01/t02, p02-t03/t04 remove `USER_ELIGIBLE_PACKS` special-casing; PJM user scope in p04-t04    |
| FR2         | planned | Manifest, inventory, directory digest, portability tasks present; see M1 for fifth script consumer |
| FR3         | planned | p01-t04/t05, p02-t07 cover intent storage, legacy inference, evolving membership                   |
| FR4         | planned | p01-t06, p02-t05/t06, p05-t01                                                                      |
| FR5         | planned | p02-t01…t09; p05-t03 verifies exact sync paths but is missing from the index (m2)                  |
| FR6         | partial | p04-t01/t02/t04/t06 cover CLI guard and `oat-pjm-*` skills; consumer skills unplanned (I1)         |
| FR7         | planned | p04-t03 template resolver; p04-t04 override seeding                                                |
| FR8         | planned | p03-t01…t05 with injected-failure and non-interactive-stop coverage                                |
| FR9         | planned | p01-t05, p02-t03/t07/t08, p03-t05; consumer-skill behavior change also affects FR9 (I1)            |
| FR10        | planned | p05-t02 docs, p03-t04 help; see m4                                                                 |
| NFR1        | planned | p01-t07 real-path validation, p02-t02/t08, p03-t01…t03/t05                                         |
| NFR2        | planned | p01-t03 digests, p02-t01/t02 pure plan + apply, p05-t04 repeat no-op                               |
| NFR3        | planned | Compatibility adapters and legacy command parity tasks present                                     |
| NFR4        | planned | p02-t05/t06, p03-t04, p05-t01 human/JSON contracts                                                 |
| NFR5        | planned | p01-t03/t06/t07 canonical-path enumeration                                                         |

### Design Component Coverage

| Design component                    | Tasks                        |
| ----------------------------------- | ---------------------------- |
| Canonical Pack Manifest             | p01-t01, p01-t02             |
| Scoped Pack Intent Store            | p01-t04, p01-t05             |
| Pack Inventory                      | p01-t06, p01-t07             |
| Reconcile Planner and Executor      | p02-t01, p02-t02             |
| Lifecycle Command Adapters          | p02-t03 … p02-t09            |
| Scope Migration Command             | p03-t01 … p03-t05            |
| PJM Adoption Guard (CLI)            | p04-t01, p04-t02             |
| PJM Adoption Guard (skills)         | p04-t06 — incomplete, see I1 |
| PJM Template Resolver               | p04-t03                      |
| Skill-Local Resource Resolution     | p04-t05, p04-t06 — see M1    |
| Status/doctor diagnostics           | p05-t01                      |
| Docs, provider materialization      | p05-t02, p05-t03             |
| Acceptance matrix, release lockstep | p05-t04, p05-t05, p05-t06    |

### Plan-Specific Checklist

- Canonical format: frontmatter, Planning Checklist, phases, Reviews (8-column
  widened ledger), Implementation Complete, References — present.
- Stable task IDs: `pNN-tNN`, monotonic within each phase; no reuse.
- Task atomicity/verifiability: each task has bounded files, a runnable RED
  command against `@open-agent-toolkit/cli` vitest targets (`include:
src/**/*.test.ts` covers the new `*.integration.test.ts` files), a
  file-scoped `oxfmt --write` format step, and a conventional commit message.
- Parallelism: `oat_plan_parallel_groups: []` is consistent with the shared
  `tools/shared/*` file ownership across phases.
- Dispatch Profile: section absent — normal, no finding.
- Review-table preservation: existing rows preserved; gate row appended.

### Extra Work (not in declared requirements)

None

## Verification Commands

```bash
# I1: no bundled skill should treat `tools has project-management` as adoption
grep -rn "tools has project-management" .agents/skills/*/SKILL.md .agents/skills/*/references/*.md
# M1: all bare repo-relative script references, not just the four docs skills
grep -rn "\.oat/scripts/resolve-tracking.sh" .agents/skills/*/SKILL.md
# M2: plan review ledger rows
grep -n "^| plan " .oat/projects/shared/user-scope-tool-packs/plan.md
# m1: what a lockstep bump actually touches
git show --stat --format= 6f443c084 | grep -E "package.json|pnpm-lock|public-package-versions"
# m2: task IDs referenced by the Requirement Index
grep -o "p0[0-9]-t0[0-9]" .oat/projects/shared/user-scope-tool-packs/spec.md | sort -u
```

## Recommended Next Step

Run the `oat-project-review-receive` skill to convert findings into plan tasks.
