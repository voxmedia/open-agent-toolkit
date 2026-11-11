---
oat_template: false
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-11-10
oat_phase: plan
oat_phase_status: complete
oat_auto_review_at_hill_checkpoints: false # brief: no checkpoints
oat_plan_hill_phases: [] # [] = none for brief modes
oat_plan_parallel_groups: [] # groups of phases that run concurrently in worktrees; [] = fully sequential
oat_plan_source: brief
oat_import_reference: null
oat_import_source_path: null
oat_import_provider: null
oat_generated: false
---

# Project Brief: complete-after-merge-and-state-parse

## Goal

Make completion work after a project's PR has already merged, and catch invalid YAML immediately after manual lifecycle state writes. Deliver the two observed workflow fixes from goal-delivery-freshness retro UP-02 and UP-03 together.

## Outcomes

1. **Merged PRs receive truthful completion bookkeeping on a deliverable branch.** Before completion writes, observe the tracked PR live. If merged, record `oat_pr_status: merged`, keep its identity, prepare a fresh branch from the updated base, and deliver bookkeeping through a follow-up PR within existing authority. Do not sync the body of the merged PR. Evidence: exercise a stale stored `open` status with a live merged PR, verify the new branch's base and exact completion changes, and retain a valid open-PR completion control.
2. **Malformed manual state writes stop immediately.** Every canonical lifecycle skill that directs a manual `state.md` frontmatter write invokes one shared strict check after the write and before committing or continuing the workflow. Invalid YAML is reported and the workflow stops until repaired; valid frontmatter remains usable. Evidence: a malformed fixture derived from the recorded incident, a valid commented-frontmatter control, the actual shipped check's exit results, and a reviewed inventory mapping manual write sites to the check.

## Approach

### Shared frontmatter check

Expose one supported, read-only, shell-callable check backed by the existing YAML parsing dependency. Check the frontmatter block and YAML mapping, without validating lifecycle semantics or rewriting the file. Reuse existing strict parsing where practical; do not use `validate-plan` or dashboard refresh as substitutes, because they tolerate malformed state.

Require the check at each manual lifecycle state-write boundary, including shared instructions used by multiple skills. Start with the candidate inventory in `references/research/manual-state-writers.md` and confirm all actual manual write sites during p01. Record the final per-write-site coverage mapping there, explaining additions, exclusions, and shared-contract coverage; the initial 21 skills are a starting inventory, not an exhaustive count. CLI-owned writes remain owned by their commands. A nonzero result stops subsequent workflow effects; repair and recheck before resuming. A portable installed invocation is required, with no dependence on this repository's development dependencies or working directory.

### Completion after merge

In `oat-project-complete`, observe the tracked PR with GitHub before the first completion write. Resolve the target base from the PR/repository instead of hardcoding `main`; this repository uses `main`. Capture the merged delivery PR separately from the follow-up bookkeeping PR so the original status and identity remain truthful.

For a merged PR, fetch the base and prepare the fresh bookkeeping branch before the first completion write, including Step 3.x summary, recap, and project-log outputs. This ordering avoids producing completion changes on the old branch and then treating them as unrelated dirty work. Use the current checkout when safe. If uncommitted or unmerged work cannot be preserved safely while moving to the base, explain the conflict and stop for recovery rather than dropping work. Reuse an already prepared follow-up when resuming; do not knowingly open a duplicate. Apply the shared parse check to manual state updates and continue through the existing completion, archive, exact-path commit, and PR routines. A failed live observation is not evidence that a PR is open or merged.

Respect existing task authority when preparing, publishing, and landing the follow-up PR. Do not ask again for already authorized actions. Missing authority still requires the corresponding operator decision. Preserve existing open-PR completion behavior and its archive-aware PR-body sync; skip that sync for the merged original.

Goal mode uses this same reuse-of-existing-authority rule. Replace completion Step 2's requirement for a new explicit bookkeeping-PR request in every run; existing authority must cover the action, and missing authority still requires an operator decision. `workflow.createPrOnComplete` (`PR_ON_COMPLETE`) alone does not authorize a goal bookkeeping PR; that existing exclusion is preserved. Preserve goal delivery coverage as satisfying the delivery PR step. The separate completion bookkeeping PR is never registered in `oat_deliveries` or counted toward coverage, and it must not replace the projected original delivery PR identity.

### Verification and release

The observable boundaries are the shared parse-check invocation, lifecycle skill instructions at manual-write boundaries, and completion's Git/PR workflow. Use real local Git repositories and state files for branch and parsing behavior; substitute only external GitHub responses where needed. Reuse existing tests before adding coverage for a distinct uncovered failure. Instruction checks may verify required workflow ordering, but do not substitute them for executable parsing and branch probes.

Preserve a reproducible before/after negative control for each observed failure and a valid accepted control. For UP-02 demonstrate the prior stale-status/current-branch behavior and the corrected live-status/fresh-base behavior. For UP-03 use the recorded malformed write when recoverable, otherwise label the fixture as a reconstruction of the documented incident. Do not claim prose checks prove agent execution.

Run the repository Definition of Done in its required order, plus the mandated lint, format, and isolated skill-contract checks for changed skill prose. Record exact tested revision/uncommitted inputs, base, commands, exit codes, runtime, cache reuse, and unavailable checks in the journal. Update affected human documentation and instruction coverage in the same PR, bump each changed skill once, and bump the five public packages together. Format changed artifacts with `pnpm exec oxfmt --write <exact changed paths>` using the repository's documented formatter.

## Constraints and Out of Scope

- Preserve completion, archive durability, exact-path commit, and review/gate contracts already present on the integration base, except for the explicitly approved replacement of goal mode's per-run bookkeeping-PR request rule with reuse of existing authority.
- This check guarantees parseable frontmatter, not valid lifecycle transitions, receipt provenance, or correctness of field values.
- No migration of all writes to CLI setters; no template-comment cleanup, general state editor, transactional rewrite framework, or new concurrency protocol.
- UP-01 (exit-gate waiver writer), broader gate-freshness redesign, and reopening completed goal projects are out of scope.
- Do not alter unrelated workspace changes or global dispatch/gate configuration.

## Decisions

- **Brief workflow, one delivery:** selected by the operator; one agreed design with phases of intent and evidence fits these related workflow fixes without an up-front task list. Separate UP-02 and UP-03 projects/deliveries were not selected; the retro disposition groups them together.
- **Reuse existing authority:** operator accepted automatic fresh-branch/follow-up preparation within existing authority on 2026-11-10; rejected always asking before branch preparation.
- **Goal-mode authority realignment:** after review M1, the operator explicitly selected reuse of existing authority for goal completion too on 2026-11-10, replacing the per-run explicit-request exception. Rejected retaining that extra prompt. Bookkeeping PRs remain outside delivery registration and coverage.
- **Shared strict parse check:** operator accepted a common check with stop-on-failure on 2026-11-10; rejected the larger migration to CLI setters. Semantic validation and template cleanup are excluded.
- **Exact model choices:** operator selected GPT-6.1 Sol high for implementation and Claude Opus 5.5 high for reviews. Rejected default parent inheritance and automatic model choice in favor of these explicit selections. Do not silently substitute another model or effort.
- **Review posture (2026-11-10):** operator disabled additional phase gates and kept both configured lifecycle gates (`oat-project-brief` and `oat-project-implement`). Built-in phase reviews and final integrated review still run, using Opus 5.5 high.
- **Sequential delivery:** establish the shared check first, then use it in the completion change; both phases touch completion instructions and release assets. Parallel p01/p02 execution is rejected because of those shared files and the dependency on the check.

## Known Unknowns

- **KU1 — Installed entry point and coverage:** choose the smallest supported shared check entry point, confirm the complete manual-writer inventory and shared-reference bundling, and distinguish manual writes from CLI-owned writes. Settled by p01 within the agreed parse-only contract.
- **KU2 — Post-merge resume and project scope:** reconcile the fresh-base branch path with existing shared/synced/local completion and archive-resume contracts, including goal-mode completion under the authority decision above. Confirm that the merged base contains the project inputs before mutation; preserve/report any divergent local inputs. Settle the phase-local handling of failed live observation and no tracked PR, and record evidence for both alongside merged/open controls; neither case establishes an observed open or merged state. Settled by p02, reusing existing recovery conventions.
- **KU3 — Incident reproduction:** locate the malformed state at historical commit `a323ee7ce` and preserve only the smallest relevant probe input; document unavailable historical objects. Settled by p01.

## Delivery endpoint and authority

- **Brief approved:** 2026-11-10 by user at 0a0bc8e0d525c886ed10738ee42737cc2199cde3.

- **Endpoint:** merged — this project's PR is merged into the repository base after checks and reviews pass.
- **Authority:** the operator approves the reviewed brief once. After that approval, the agent may implement within these boundaries, accept phases after required evidence/reviews, open and update the PR, address in-scope findings, and merge after checks and reviews pass. The operator granted merge authority on 2026-11-10; brief approval is recorded above.
- **Product authority:** materially changed outcomes, approach, exclusions, or new hardening return to the operator. No gate or freshness waiver is implied by merge authority.
- **Execution:** implementation uses `gpt-6.1-sol` with high reasoning effort; reviews use `claude-opus-5-5` with high effort. Root orchestration retains integration and user decisions. Model unavailability is reported without substitution.

## Milestones

## Phase p01: Validate manual lifecycle state writes

**Intent:** ship one reusable strict frontmatter check and require it after manual state writes throughout the canonical lifecycle skills, addressing the recorded invalid-YAML incident without a state-writer redesign.
**Exit evidence:** installed check rejects the incident-derived malformed input for a parse reason and accepts valid commented frontmatter; nonzero status prevents continuation in the representative calling sequence; the manual-writer inventory identifies each covered boundary; affected contracts, documentation, version bumps, and required checks pass.
**Provisional:** no

## Phase p02: Deliver completion bookkeeping after merge

**Intent:** make completion observe the original PR live, prepare the follow-up branch from the updated base before mutation, retain truthful original-PR state, and land bookkeeping through a follow-up PR under existing authority.
**Exit evidence:** failed tracked-PR observation stops before completion writes; no-tracked-PR control retains the existing completion path without claiming an observed status; merged-PR reproduction confirms live `merged` status, fresh-base ancestry, completion-only changes and follow-up PR routing with no merged-body sync; open-PR control retains its existing behavior; the resulting state passes p01's check; a goal-mode case proves existing authority permits the follow-up without a new per-run request while bookkeeping stays outside delivery registration and coverage; applicable scope/resume cases and full required repository gates pass; integrated review is settled.
**Provisional:** no

**Phase-local design:** perform live observation and any merged-PR branch preparation before the first normal-path completion mutation, including Step 3.3 documentation-skip metadata and Step 3.x outputs. Derive the base from live PR/repository data; keep original identity/status separate from follow-up branch/PR identity. A safe existing follow-up is reused on resume. Preserve shared/synced/local artifact ownership and existing receipt-resume routes; confirm needed project inputs are available on the updated base or their existing retained authority before switching, and stop with recoverable diagnostics if divergent or dirty inputs cannot be preserved. Do not replay completed archive mutations to prepare a branch. Use the current completion helpers and smallest cohesive executable seam for real Git probes; no general transaction framework. Evidence includes shared/synced/local applicability, resume reuse, preserved inputs or refusal, original merged body unchanged, and the goal-mode PR_ON_COMPLETE-only exclusion. Phase-local choices and limitations are recorded in the journal.

## Parallelism

No parallel phase groups. The completion skill, shared instructions, and package versions overlap. Bounded read-only reconnaissance may run independently; each implementation phase has one committing owner.

## Reviews

| Scope | Type     | Status          | Date       | Artifact                                                                              | Reviewed Head                            | Invocation | Gate Target                              |
| ----- | -------- | --------------- | ---------- | ------------------------------------------------------------------------------------- | ---------------------------------------- | ---------- | ---------------------------------------- |
| plan  | artifact | fixes_completed | 2026-11-10 | structured (no artifact); receipt in implementation.md                                | 303910aa99c0eb63dde0cae121ce17d36576a5ab | auto       | oat-reviewer-claude-claude-opus-5-5-high |
| plan  | artifact | fixes_completed | 2026-11-10 | structured (no artifact); round 2; L1 clarified locally; receipt in implementation.md | aa04c4605e81ca88823accfca56a7cf80c4f081b | auto       | oat-reviewer-claude-claude-opus-5-5-high |
| plan  | artifact | fixes_completed | 2026-11-10 | reviews/archived/artifact-plan-review-2026-11-10T215917Z.md                           | -                                        | -          | -                                        |
| p01   | code     | fixes_completed | 2026-11-11 | reviews/archived/p01-review-2026-11-11T003543Z.md                                     | 3b260ccf51a395362ab7d832d22d5b780ffd0c3b | auto       | -                                        |
| p02   | code     | fixes_completed | 2026-11-11 | reviews/archived/p02-review-2026-11-11T012506Z.md                                     | 5d5e6caef9128835562047de5212839f45b6c8e1 | auto       | -                                        |
| p02   | code     | fixes_completed | 2026-11-11 | reviews/archived/p02-review-2026-11-11T021549Z.md                                     | a3514dc6e8746557e925444478fb9c85f58340d5 | auto       | -                                        |
| final | code     | fixes_completed | 2026-11-11 | reviews/archived/final-review-2026-11-11T023618Z.md                                   | 52d9aeb9719a4bbbdc2e529799d1618d76c7c4c1 | auto       | -                                        |
| final | code     | fixes_completed | 2026-11-11 | reviews/archived/final-review-2026-11-11T025843Z.md                                   | 0b917cb216c3487d47e9a2cc99732ee519829022 | auto       | -                                        |
| final | code     | passed          | 2026-11-11 | reviews/archived/final-review-2026-11-11T031418Z.md                                   | a689912f74742a654e936b7fe1ba19f24c58c519 | auto       | -                                        |
| final | code     | received        | 2026-11-11 | reviews/final-review-2026-11-11T032431Z.md                                            | a689912f74742a654e936b7fe1ba19f24c58c519 | gate       | claude-opus-5-5-high                     |
| final | code     | passed          | 2026-11-11 | reviews/archived/final-review-2026-11-11T042030Z.md                                   | 09d08130659962709b68e2a8f5bcfe05f34ae725 | auto       | -                                        |
| final | code     | passed          | 2026-11-11 | reviews/archived/final-review-2026-11-11T042616Z.md                                   | 09d08130659962709b68e2a8f5bcfe05f34ae725 | gate       | claude-opus-5-5-high                     |
| final | code     | passed          | 2026-11-11 | reviews/archived/final-review-2026-11-11T050024Z.md                                   | 0e404f79d786cf469b2a3c65ec697686d5083584 | gate       | claude-opus-5-5-high                     |

| remote-pr-421 | code | fixes_completed | 2026-11-11 | reviews/archived/remote-pr-421-review-2026-11-11T051622Z.md | fc007d4841d07864783a8cc6b3a16d540ed7ca5b | - | - |

| final | code | fixes_completed | 2026-11-11 | reviews/archived/final-review-2026-11-11T055350Z.md | 128dd5163cb27c920f94b58efc49960dfdf07dc6 | auto | - |

| final | code | passed | 2026-11-11 | reviews/archived/final-review-2026-11-11T060748Z.md | 1dd8a790bbb3095ae7c1fdcc39a8046365066af2 | auto | - |

| final | code | fixes_completed | 2026-11-11 | reviews/archived/final-review-2026-11-11T061345Z.md | 1dd8a790bbb3095ae7c1fdcc39a8046365066af2 | gate | claude-opus-5-5-high |

| final | code | passed | 2026-11-11 | reviews/archived/final-review-2026-11-11T062455Z.md | 703da345153aa455a7dfed2c70107e34eefb821e | auto | - |
| final | code | received | 2026-11-11 | reviews/final-review-2026-11-11T062926Z.md | 703da345153aa455a7dfed2c70107e34eefb821e | gate | claude-opus-5-5-high |

Preserve existing event rows. Future artifact rows use a review path or `-` in Artifact and `-` in the three code-only metadata columns. The gate passed its threshold; its three Low notes are dispositioned in the journal, without claiming a clean re-review.

## Implementation Complete

- p01 accepted: shared strict state parse check and reviewed manual-writer coverage.
- p02 accepted: merged-later receipt resume and delivered recap-link preservation are verified and independently reviewed.
- Total: 2/2 phases accepted. Final confirmation passes at703da345; fresh configured gate, updated closeout and new-head CI precede the authorized merge.

## References

- Journal: `implementation.md`
- Research: `references/research/`
- Project log: `project-log.md` when enabled
- Candidate writer inventory and p01 coverage mapping: `references/research/manual-state-writers.md`
- Tracked source: `.oat/repo/reference/project-summaries/20261109-goal-delivery-freshness.md`
- Source retro: `.oat/projects/archived/goal-delivery-freshness/references/project-retro.md`, UP-02 and UP-03 (local archive; the two problem statements and accepted direction are carried above)
- Completion workflow: `.agents/skills/oat-project-complete/SKILL.md`
- Existing strict parser: `packages/cli/src/validation/project-state.ts`
- Brief contract: `.agents/skills/oat-project-brief/references/brief-contract.md`
