---
oat_generated: true
oat_generated_at: 2026-07-18T14:24:03Z
oat_review_scope: plan
oat_review_type: artifact
oat_review_invocation: gate
oat_project: .oat/projects/shared/wave-skills-promotion
oat_gate_run_id: c0bb9b70-86f6-4247-abef-95c94623a290
oat_gate_target: codex-5-6-sol-max
oat_gate_runtime: codex
oat_invocation_model: gpt-5.6-sol
oat_invocation_reasoning_effort: max
oat_invocation_source: exec-target-config
---

# Artifact Review: plan

**Reviewed:** 2026-07-18T14:24:03Z
**Scope:** Spec-driven plan completeness, upstream alignment, and implementation readiness
**Files reviewed:** 3 primary artifacts; 10 supporting artifacts/contracts
**Commits:** Not applicable (artifact review)
**Evidence sources used:** `.oat/projects/shared/wave-skills-promotion/plan.md`, `.oat/projects/shared/wave-skills-promotion/spec.md`, `.oat/projects/shared/wave-skills-promotion/design.md`, `.oat/projects/shared/wave-skills-promotion/discovery.md`, `.oat/projects/shared/wave-skills-promotion/implementation.md`, `.oat/projects/shared/wave-skills-promotion/state.md`, `.oat/projects/shared/wave-skills-promotion/references/2026-07-17-wave-skills-promotion-packet.md`, `.oat/projects/shared/wave-skills-promotion/references/2026-07-17-wave-signal-ledger.md`, `.oat/projects/shared/wave-skills-promotion/references/2026-07-17-program-retrospective.md`, `AGENTS.md`, `.oat/repo/pjm/AGENTS.md`, `apps/oat-docs/AGENTS.md`, and `.oat/templates/plan.md`
**Dispatch audit:** `Dispatch: scope=plan action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-gpt-5-6-sol-high`
**Dispatch Profile advisory:** No `## Dispatch Profile` is present; omission is valid and is not a finding.

## Summary

The plan is structurally valid, uses stable monotonic task IDs, preserves required canonical sections, and covers every requirement at least partially. It is not implementation-ready because two P0 acceptance paths are absent: the supposed fresh-install task never installs the pack, and the separately merged Phase 6 skill changes omit the repository's mandatory lockstep package bump and final release validation. Additional task-scope, evidence, navigation, portability, and artifact-alignment gaps should be resolved before implementation begins.

Findings: 2 critical, 4 important, 4 medium, 0 minor

## Findings

### Critical

- **The fresh-install task never performs an install** (`.oat/projects/shared/wave-skills-promotion/plan.md:136`)
  - Issue: FR1 is P0 and requires a fresh workflow-pack install to materialize both skills, their assets, and an executable script. Task p01-t05 only runs the bundle script and inspects `packages/cli/assets/`; p01-t04 checks only the two Claude view paths at line 124, so neither fresh installation nor all-provider materialization is verified. A broken installer/sync path could therefore pass the plan's release gates.
  - Fix: Make p01-t05 materialize an isolated temporary repo/home using the branch-local CLI, install/update the workflow pack, enable the configured providers, run sync, and assert both skill trees, assets, executable bits, and every enabled provider view. Keep the direct bundle inspection as a separate lower-level check.
  - Requirement: FR1, NFR4

- **The separately merged Phase 6 has no lockstep public-package release step** (`.oat/projects/shared/wave-skills-promotion/plan.md:685`)
  - Issue: The plan states that p06 merges separately (frontmatter line 11) and p06-t02 changes canonical skill assets, bumps skill versions, and re-syncs views. Repository policy requires any `.agents/skills` change to bump all five public packages together and run `pnpm release:validate` before finishing (`AGENTS.md:52-54`), but the only package bump and release validation occur in p05 before these Phase 6 changes. NFR2 is therefore not covered for the Phase 6 merge.
  - Fix: Add a final Phase 6 release-readiness task, or extend the Phase 6 choreography, to bump the five lockstep packages after all p06 shipped-asset changes, run `pnpm release:validate` plus relevant gates, and commit those exact package files. If p06 is not a separate PR, still rerun release validation after its final asset change.
  - Requirement: FR10, NFR2

### Important

- **FR2's required traceability artifact is edited but neither declared nor committed** (`.oat/projects/shared/wave-skills-promotion/plan.md:348`)
  - Issue: p02-t08 requires a six-row queue-item-to-commit table in `implementation.md`, but its Files list includes only the two skill files, its format/verification step never checks the table, and its `git add` at line 360 omits `implementation.md`. The P0 6/6 traceability evidence can be left uncommitted while the task reports success.
  - Fix: Add `implementation.md` to the task's file scope and exact staging command, format it, and verify six distinct queue-item rows with resolvable SHAs or rejection rationales before committing.
  - Requirement: FR2

- **The closed backlog disposition contradicts the repository backlog lifecycle** (`.oat/projects/shared/wave-skills-promotion/plan.md:442`)
  - Issue: p03-t02 calls the tracked-config rejection a “closed rejection record,” expects five new items, and verifies with `ls` plus formatting. The PJM contract reserves `backlog/items/` for active work and requires rejected work to use terminal `wont_do`, move to `backlog/archived/`, update the completed ledger when summarized, and regenerate the index through `oat backlog archive` (`.oat/repo/pjm/AGENTS.md:7-31`). The current steps can leave a terminal item in the active directory and do not actually run index regeneration or doctor validation.
  - Fix: Specify `oat backlog new` for each record, then archive the rejected guard with `oat backlog archive <id> --wont-do --summary <rationale>`. Verify active versus archived locations, the generated index/completed ledger as applicable, and run `oat pjm doctor`; stage only the produced files.
  - Requirement: FR7

- **The docs phase omits the authored navigation contract** (`.oat/projects/shared/wave-skills-promotion/plan.md:494`)
  - Issue: p04-t01 creates only a leaf page, and p04-t02 regenerates only the machine index. The docs contract requires minimum frontmatter, a link in the nearest authored `index.md` `## Contents`, and `oat docs nav sync`; without those edits the page is effectively invisible to navigation even if the generated root index and build pass.
  - Fix: Add the chosen leaf path and nearest authored index file to p04-t01, require `title`/`description` frontmatter and a `.md`-suffixed Contents link, run `oat docs nav sync`, then regenerate `apps/oat-docs/index.md` and build. Stage the exact leaf, authored index, and generated outputs rather than all of `apps/oat-docs/`.
  - Requirement: FR8

- **The portability checks do not prove bash 3.2 execution** (`.oat/projects/shared/wave-skills-promotion/plan.md:225`)
  - Issue: NFR3 requires the bootstrap changes and fixture to run under macOS system bash 3.2. Tasks p02-t03 and p05-t01 invoke whatever `bash` appears first on `PATH`; `bash -n` plus grepping only `mapfile|declare -A` cannot detect other newer-shell syntax or runtime incompatibilities. A Homebrew bash can make the required P0 portability check pass falsely.
  - Fix: Use `/bin/bash` for syntax and execution on macOS, assert/log its major/minor version before the check, and run both the parity path and mini-wave dry-run with that interpreter. If CI is not macOS, document the required macOS verification owner and stored evidence.
  - Requirement: NFR3

### Medium

- **The gated Phase 6 task bodies are placeholders, not executable tasks** (`.oat/projects/shared/wave-skills-promotion/plan.md:665`)
  - Issue: The gate is explicit and appropriately prevents premature execution, but p06-t01 has no concrete path or runnable command, and p06-t03 delegates its entire file scope to a future migration runbook at line 693. These tasks cannot yet satisfy the plan contract of bounded files, runnable verification, and independently committable work.
  - Fix: Encode a mandatory plan-revision gate before p06 execution, and do not mark p06 implementation-ready until the frozen RC supplies exact paths, commands, ownership boundaries, and expected evidence. Preserve the current task IDs when refining them.

- **Several commit commands stage directories or globs wider than their declared task scope** (`.oat/projects/shared/wave-skills-promotion/plan.md:631`)
  - Issue: p05-t04 declares five package files but stages `packages/*/package.json`; p04-t01 stages all of `apps/oat-docs/`; and p03 tasks stage all of `.oat/repo/pjm/`. In a dirty or concurrent worktree, these commands can absorb unrelated changes and defeat task atomicity.
  - Fix: Replace broad staging with the exact declared files and explicitly enumerated generated outputs. For dynamically named backlog records, resolve and inspect the created paths first, then stage only those paths plus the index/archive ledger files produced by the command.

- **The Reviews contract can mark unresolved Medium findings as passed** (`.oat/projects/shared/wave-skills-promotion/plan.md:727`)
  - Issue: The plan defines `passed` as no Critical/Important, while the current receive-review contract requires no unresolved Critical/Important/Medium. The existing plan artifact row is also already `passed` with no artifact or provenance note at line 716, unlike the documented external design review immediately below it. This can cause premature gate bookkeeping and leaves the prior plan event unauditable.
  - Fix: Update the status meaning to include Medium, preserve the existing row, and add its review provenance if it represents a real external review. Record this gate run as a distinct append-ordered event bound to its artifact rather than overwriting the prior row.

- **The specification is stale relative to the accepted design amendments that the plan follows** (`.oat/projects/shared/wave-skills-promotion/spec.md:168`)
  - Issue: The plan defensibly follows design.md's accepted changes: the tracked-config guard is a closed rejection and the sync-version-stamp candidate creates a tenth disposition. The spec still requires five deferred active backlog items, reports only 5+4 items, and leaves versioning/W6 handoff as open questions at lines 328 and 359-365. This upstream drift makes requirement-level plan review ambiguous.
  - Fix: Align the spec's FR7 acceptance criteria, success metrics, requirement index, and open questions with the approved design amendment. Clarify that the fifth FR7 outcome is a durable `wont_do`/archived disposition and that the new sync-version-stamp candidate brings the total to ten.

### Minor

None

## Requirements/Design Alignment

The plan follows the design's six-phase architecture and correctly keeps p03/p04 sequential after the operator declined parallel execution. The Phase 6 RC gate and provider dispatch policy are represented without pinning provider models; omission of a Dispatch Profile is valid. Coverage is partial where the task bodies or verification commands cannot prove the upstream acceptance criteria.

### Requirements Coverage

| Requirement | Status  | Notes                                                                                                      |
| ----------- | ------- | ---------------------------------------------------------------------------------------------------------- |
| FR1         | partial | Port, manifest, bundle, sync, and smoke tasks exist; fresh install and all-provider assertions are absent. |
| FR2         | partial | Six queue tasks exist; the required traceability table is not staged or verified.                          |
| FR3         | covered | Genericization inventory and equivalence checklist are assigned to p02-t07.                                |
| FR4         | covered | Verbatim port plus equivalence review preserve ownership/log disciplines.                                  |
| FR5         | covered | Validate-plan RED/GREEN task covers error and help surfaces.                                               |
| FR6         | covered | Four-item current-main triage plus durable disposition is planned.                                         |
| FR7         | partial | Five outcomes are named, but the rejected record does not follow PJM terminal lifecycle.                   |
| FR8         | partial | Page and build are planned; authored navigation and nav sync are missing.                                  |
| FR9         | covered | Fixture, documented happy/unhappy procedure, execution, and stored results are planned.                    |
| FR10        | partial | RC gate and boundaries exist; exact tasks and release choreography remain incomplete.                      |
| NFR1        | covered | Equivalence checklist, fixture dry-run, and W6 handoff are represented.                                    |
| NFR2        | partial | Phase 5 has lockstep bump/validation, but Phase 6's separate shipped-asset change does not.                |
| NFR3        | partial | Syntax and banned-construct checks exist, but the required bash 3.2 runtime is not pinned.                 |
| NFR4        | partial | Sync tasks exist, but verification checks only Claude paths and no fresh installed views.                  |

### Design Coverage

All eight design components map to plan phases: ported skills and pack integration (p01), queue/genericization (p02), validate-plan and backlog dispositions (p03), docs (p04), fixture/release/W6 handoff (p05), and RC-gated explainer integration (p06). The design-backed tenth backlog candidate is not scope creep; the stale specification should be aligned to it.

### Extra Work (not in declared requirements)

None. The sync-version-stamp backlog candidate is an accepted design-review amendment, not unauthorized implementation scope.

## Verification Commands

Run these after revising the plan and upstream spec:

```bash
pnpm exec tsx --tsconfig packages/cli/tsconfig.json packages/cli/src/index.ts -- project validate-plan --project-path .oat/projects/shared/wave-skills-promotion --json
rg -n "fresh|/bin/bash|oat backlog archive|oat pjm doctor|oat docs nav sync|release:validate|implementation.md" .oat/projects/shared/wave-skills-promotion/plan.md
git diff --check -- .oat/projects/shared/wave-skills-promotion/plan.md .oat/projects/shared/wave-skills-promotion/spec.md
```

## Recommended Next Step

Run the `oat-project-review-receive` skill to convert findings into plan tasks and artifact-alignment work.
