---
oat_generated: true
oat_generated_at: 2026-07-18T14:19:52Z
oat_review_scope: plan
oat_review_type: artifact
oat_review_invocation: gate
oat_project: .oat/projects/shared/wave-skills-promotion
oat_gate_run_id: ef4e12da-9f1e-4f0f-a57c-08c0b6ece648
oat_gate_target: codex-5-6-sol-max
oat_gate_runtime: codex
oat_invocation_model: gpt-5.6-sol
oat_invocation_reasoning_effort: max
oat_invocation_source: exec-target-config
---

# Artifact Review: plan

**Reviewed:** 2026-07-18T14:19:52Z
**Scope:** Spec-driven plan readiness and alignment
**Files reviewed:** 3 in-scope artifacts
**Commits:** Not applicable (artifact review)
**Evidence sources used:** `.oat/projects/shared/wave-skills-promotion/plan.md`, `.oat/projects/shared/wave-skills-promotion/spec.md`, `.oat/projects/shared/wave-skills-promotion/design.md`, `.oat/projects/shared/wave-skills-promotion/implementation.md`, `.oat/projects/shared/wave-skills-promotion/state.md`, `AGENTS.md`, `apps/oat-docs/AGENTS.md`, `.oat/templates/plan.md`, `package.json`, `packages/cli/package.json`, and `packages/cli/scripts/bundle-assets.sh`
**Dispatch report schema:** 1
**Dispatch audit:** `Dispatch: scope=plan action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-gpt-5-6-sol-high`

## Summary

The plan is structurally valid and maps all fourteen requirements to phases, but it is not ready for implementation as written. Two P0 paths are incomplete: Phase 1 never performs the promised fresh workflow-pack install, and the separately merged Phase 6 changes shipped skill assets without the repository-mandated public-package release choreography. Several task-scope and verification omissions would also leave required evidence, navigation, or generated release assets uncommitted.

Findings: 2 critical, 3 important, 3 medium, 1 minor

## Findings

### Critical

- **The “fresh-install smoke check” never installs the workflow pack** (`.oat/projects/shared/wave-skills-promotion/plan.md:142`)
  - Issue: p01-t05 only runs the repository build/bundle script and inspects `packages/cli/assets/skills/`. That proves bundle generation, not FR1's P0 acceptance criterion that a fresh workflow-pack installation materializes both skills, their assets, and the executable script. The design explicitly calls for a fresh `oat init`-style install (`design.md:192-200`), while the plan never invokes the installer in its temporary directory.
  - Fix: Make p01-t05 materialize an empty temporary repo, invoke the locally built CLI's non-interactive workflows-pack install against that repo (for example the branch-local `init tools workflows` path with an explicit project scope/cwd), then assert the installed canonical files, all three templates, and the execute bit. Keep bundle inspection as a separate prerequisite, not the substitute for installation.
  - Requirement: FR1 (P0)

- **The separately merged Phase 6 omits mandatory package release work** (`.oat/projects/shared/wave-skills-promotion/plan.md:683`)
  - Issue: p06-t02 changes both canonical `SKILL.md` files, bumps their skill versions, and re-syncs provider views, but Phase 6 is described as separately mergeable and contains no lockstep bump of the five public packages or `pnpm release:validate`. Repository policy treats `.agents/skills` changes as shipped CLI functionality and requires those five bumps and release validation in the same PR (`AGENTS.md:51-54`). The current p05 release task cannot satisfy a later, separately merged p06 delta.
  - Fix: Add a Phase 6 release-readiness task (or expand p06-t02) that bumps all five public packages, regenerates/stages the CLI bundled assets, runs `pnpm release:validate`, and commits the complete release surface in the Phase 6 PR. If Phase 6 will not be a separate PR after all, align the plan/design merge statement explicitly and retain one final release task after all skill edits.
  - Requirement: NFR2 (P0), FR10 (P0 within gate)

### Important

- **FR2's required traceability table is edited but excluded from its task commit** (`.oat/projects/shared/wave-skills-promotion/plan.md:348`)
  - Issue: p02-t08 requires appending the six-row queue-item/commit table to `implementation.md`, but `implementation.md` is absent from the task's Files list and the commit stages only the two skill files (`plan.md:357-365`). This leaves the P0 verification artifact uncommitted until an unrelated later broad stage, breaking task atomicity and restart safety.
  - Fix: Add `implementation.md` to p02-t08's Files list, format it with the task's other files, stage it explicitly in p02-t08, and verify six distinct queue rows with non-placeholder SHA or rejection-rationale cells before committing.
  - Requirement: FR2 (P0)

- **The docs task omits the authored navigation contract** (`.oat/projects/shared/wave-skills-promotion/plan.md:494`)
  - Issue: p04-t01 scopes itself only to a new page, and p04-t02 regenerates only the root machine index. The docs contract requires adding every new page to the nearest authored `index.md` `## Contents` map; an unlisted page is effectively invisible to navigation tooling (`apps/oat-docs/AGENTS.md:9-15`). The explicit in-plan docs route must also preserve delta analysis and generated-index regeneration (`apps/oat-docs/AGENTS.md:39-47`).
  - Fix: Add the chosen parent `apps/oat-docs/docs/**/index.md` to p04-t01, require a `.md`-suffixed `## Contents` link and frontmatter with title/description, then run the Fumadocs-equivalent navigation/index generation plus `pnpm build:docs`. Stage the authored page, parent index, and generated root index in bounded commits.
  - Requirement: FR8 (P1)

- **The Phase 5 release commit omits a generated, published version asset** (`.oat/projects/shared/wave-skills-promotion/plan.md:619`)
  - Issue: `packages/cli/scripts/bundle-assets.sh` rewrites `packages/cli/assets/public-package-versions.json` from the public package versions (`bundle-assets.sh:103-123`), and the CLI publishes its `assets` directory (`packages/cli/package.json:19-22`). p05-t04 runs release validation, which rebuilds the packages, but its Files list and `git add packages/*/package.json` omit this tracked generated file. The task can therefore pass while leaving the release commit incomplete and the worktree dirty.
  - Fix: Add `packages/cli/assets/public-package-versions.json` to p05-t04's Files list and explicit staging set after release validation/bundling. Verify its recorded versions match the bumped package manifests and assert no expected release artifact remains unstaged.
  - Requirement: NFR2 (P0)

### Medium

- **Provider-view verification checks only Claude while claiming all configured providers** (`.oat/projects/shared/wave-skills-promotion/plan.md:124`)
  - Issue: p01-t04 runs `ls` only on `.claude/skills/...`, yet its expected result claims valid views for every configured provider. It does not inspect `.cursor` or the sync manifest, and the broad `git add ... 2>/dev/null || true` can suppress missing-path failures.
  - Fix: Derive expected linked views from `.oat/sync/manifest.json`, assert entries/targets for both new skills across every configured provider view, and fail explicitly on absent paths. Stage only the verified sync-managed paths; do not hide staging errors with `|| true`.
  - Requirement: FR1, NFR4

- **The Phase 6 task bodies are acknowledged placeholders, not executable canonical tasks** (`.oat/projects/shared/wave-skills-promotion/plan.md:665`)
  - Issue: p06-t01 has no concrete path or runnable verification command, p06-t02 has no stepwise verification/release command, and p06-t03 delegates its file scope to a future runbook. The plan says these bodies will be refined at gate-open, so the phase is not independently actionable under the canonical bounded-file/runnable-verification task contract.
  - Fix: Either add an explicit gate-open plan-revision/re-review checkpoint and keep Phase 6 formally blocked until it passes, or move Phase 6 into a follow-on project. Once the RC exists, replace every provisional path with concrete files and give each task an exact schema validation/E2E command and atomic staging set before implementation proceeds.
  - Requirement: FR10

- **Repeated “file-scoped” format steps actually run the repository-wide formatter** (`.oat/projects/shared/wave-skills-promotion/plan.md:172`)
  - Issue: tasks repeatedly use `pnpm format:fix <file-or-directory>` as though it were file-scoped. The root script first runs `turbo run format:fix` across the workspace and then runs oxfmt over global globs (`package.json:20-21`), with the supplied path merely appended. This can create unrelated formatting changes during otherwise atomic skill/backlog/docs tasks.
  - Fix: Replace the task-level invocations with the repository formatter's concrete file-scoped form, such as `pnpm exec oxfmt --write <explicit paths>`, where supported. Keep the full `pnpm format`/quality gate for phase or release verification rather than every atomic edit task.

### Minor

- **The existing plan-review row claims a pass without an artifact or provenance** (`.oat/projects/shared/wave-skills-promotion/plan.md:716`)
  - Issue: the `plan | artifact` row is `passed` with `Artifact: -`, while the same section defines `passed` as a recorded re-review outcome (`plan.md:720-727`). The design row documents its exceptional external no-artifact provenance; the plan row does not. This makes the append-ordered review history ambiguous.
  - Suggestion: Preserve the row, but add its actual external/structured-review provenance if one exists; otherwise correct its status through normal review bookkeeping. Append this gate artifact as a distinct review event rather than overwriting prior history.

## Requirements/Design Alignment

### Requirements Coverage

| Requirement | Status  | Notes                                                                                                                     |
| ----------- | ------- | ------------------------------------------------------------------------------------------------------------------------- |
| FR1         | Partial | Port/bundle/sync tasks exist, but the fresh-install acceptance path is missing and linked-view assertions are incomplete. |
| FR2         | Partial | Six queue tasks exist; the required traceability table is not included in its task commit.                                |
| FR3         | Covered | Genericization inventory and equivalence checklist are mapped to p02-t07.                                                 |
| FR4         | Covered | Ownership/log discipline is preserved through the verbatim port and equivalence review.                                   |
| FR5         | Covered | Message/help changes and tests are planned in p03-t01.                                                                    |
| FR6         | Covered | Four triage items are mapped to p03-t03 with file-or-close dispositions.                                                  |
| FR7         | Covered | Five deferred/disposition records are mapped to p03-t02.                                                                  |
| FR8         | Partial | Page/build/index work exists, but the authored `## Contents` navigation update is absent.                                 |
| FR9         | Covered | Fixture, procedure, happy/unhappy execution, and result recording are planned.                                            |
| FR10        | Partial | Gated boundaries are represented, but tasks need gate-open refinement and a compliant release step.                       |
| NFR1        | Covered | Equivalence checklist, fixture dry-run, and W6 handoff/runbook are represented.                                           |
| NFR2        | Partial | Phase 5 bumps omit the generated version asset; separately merged Phase 6 has no public-package release task.             |
| NFR3        | Covered | Bash-3.2 constraints and fixture exercise are explicit.                                                                   |
| NFR4        | Partial | Sync is planned, but verification does not prove every configured linked view.                                            |

### Extra Work (not in declared requirements)

None. The additional sync-version-stamp backlog candidate and W6 handoff runbook are explicit design-review amendments.

## Verification Commands

Run these after revising the plan:

```bash
pnpm run cli -- project validate-plan --project-path .oat/projects/shared/wave-skills-promotion
pnpm exec oxfmt --check .oat/projects/shared/wave-skills-promotion/plan.md
rg -n "init tools workflows|public-package-versions|## Contents|release:validate|implementation.md" .oat/projects/shared/wave-skills-promotion/plan.md
```

## Recommended Next Step

Run the `oat-project-review-receive` skill to convert findings into plan tasks.
