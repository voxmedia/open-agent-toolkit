---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-09-14
oat_current_task_id: p01-t01
oat_generated: false
---

# Implementation: oat-doctor-router

**Started:** 2026-09-14
**Last Updated:** 2026-09-14

> This document is used to resume interrupted implementation sessions.
>
> Conventions:
>
> - `oat_current_task_id` always points at the **next plan task to do** (not the last completed task).
> - When all plan tasks are complete, set `oat_current_task_id: null`.
> - Reviews are **not** plan tasks. Track review status in `plan.md` under `## Reviews` (e.g., `| final | code | passed | ... |`).
> - Keep phase/task statuses consistent with the Progress Overview table so restarts resume correctly.
> - Before running the `oat-project-pr-final` skill, ensure `## Final Summary (for PR/docs)` is filled with what was actually implemented.

## Progress Overview

| Phase   | Status      | Tasks | Completed |
| ------- | ----------- | ----- | --------- |
| Phase 1 | in_progress | N     | 0/N       |
| Phase 2 | pending     | N     | 0/N       |

**Total:** 0/{N} tasks completed

---

## Phase 1: {Phase Name}

**Status:** in_progress
**Started:** 2026-09-14

### Phase Summary (fill when phase is complete)

**Outcome (what changed):**

- {2-5 bullets describing user-visible / behavior-level changes delivered in this phase}

**Key files touched:**

- `{path}` - {why}

**Verification:**

- Run: `{command(s)}`
- Result: {pass/fail + notes}

**Notes / Decisions:**

- {trade-offs or deviations discovered during implementation}

### Task p01-t01: {Task Name}

**Status:** completed / in_progress / pending / blocked
**Commit:** {sha} (if completed)

**Outcome (required when completed):**

- {what materially changed (not “did task”, but “system now does X”)}

**Files changed:**

- `{path}` - {why}

**Verification:**

- Run: `{command(s)}`
- Result: {pass/fail + notes}

**Notes / Decisions:**

- {gotchas, trade-offs, design deltas, important context for future sessions}

**Issues Encountered:**

- {Issue and resolution}

---

### Task p01-t02: {Task Name}

**Status:** pending
**Commit:** -

**Notes:**

- {Notes will be added during implementation}

---

## Phase 2: {Phase Name}

**Status:** pending
**Started:** -

### Task p02-t01: {Task Name}

**Status:** pending
**Commit:** -

---

## Orchestration Runs

_Each run from `oat-project-implement` appends an entry below with:_
_- Run header (number, timestamp, branch, tier, policy, phase counts)_
_- Phase Outcomes table_
_- Parallel Groups list_
_- Outstanding Items_

<!-- orchestration-runs-start -->

_Orchestration runs from `oat-project-implement` are appended here, most-recent-first within the file but append-only at the bottom of the log._

<!-- orchestration-runs-end -->

---

## Implementation Log

Chronological log of implementation progress.

### 2026-09-14

**Session Start:** {time}

- [x] p01-t01: {Task name} - {commit sha}
- [ ] p01-t02: {Task name} - in progress

**What changed (high level):**

- {short bullets suitable for PR/docs}

**Decisions:**

- {Decision made and rationale}

**Follow-ups / TODO:**

- {anything discovered during implementation that should be captured for later}

**Blockers:**

- {Blocker description} - {status: resolved/pending}

**Session End:** {time}

---

### 2026-09-14

**Session Start:** {time}

{Continue log...}

---

## Deviations from Plan / Design

Document any intentional deviations from the original plan, spec, or design. Include accepted review findings where the shipped implementation is source of truth and a lifecycle artifact needs alignment.

| Task / Review | Source Artifact | Planned / Documented | Actual / Accepted | Reason | Source of Truth | Follow-up |
| ------------- | --------------- | -------------------- | ----------------- | ------ | --------------- | --------- |
| -             | -               | -                    | -                 | -      | -               | -         |

## Test Results

Track test execution during implementation.

| Phase | Tests Run | Passed | Failed | Coverage |
| ----- | --------- | ------ | ------ | -------- |
| 1     | -         | -      | -      | -        |
| 2     | -         | -      | -      | -        |

## Final Summary (for PR/docs)

**What shipped:**

- {capability 1}
- {capability 2}

**Behavioral changes (user-facing):**

- {bullet}

**Key files / modules:**

- `{path}` - {purpose}

**Verification performed:**

- {tests/lint/typecheck/build/manual steps}

**Design deltas (if any):**

- {what changed vs design.md and why}

## References

- Plan: `plan.md`
- Design: `design.md`
- Spec: `spec.md`

### 2026-09-14 — Plan artifact review received (round 1, structured)

- 0 critical, 4 important, 8 medium, 5 minor — CHANGES REQUESTED. All 17 applied to `plan.md` (and the design where it was the stale copy), received inline: the `pjm:*` id set is derived from the CLI source at test time (21 ids incl. the nine remote checks), not pinned; every sweep call projects to named fields (`oat doctor --json` is ~410 KB raw); a command is failed only when its stdout is not JSON (both doctors exit 1 on a healthy repo); the read-only invariant is settled as a one-fix carve-out (run exactly the named command after explicit approval) and pinned in the contract test; five deprecated entries not six; the legacy table is exported under its own name and referenced, not copied; the group walk iterates every describe group; per-area finding rules enumerated in p02-t01; Error Handling rule 4 assigned; the contract test validates sweep commands against the built CLI and drops the self-pinning assertions; live verification reads the branch skill by absolute path and never installs at user scope; grep guards and docs anchors corrected; design `:118` path and phrase list aligned.

### 2026-09-14 — Plan artifact review received (round 2, structured)

- 0 critical, 4 important, 6 medium, 6 minor — CHANGES REQUESTED; every round-1 disposition verified closed. 15 applied: the command probe asserts the `Usage: oat <path>` line and named flags (Commander exits 0 for unknown subcommands) and covers every fix command the skill may run; the instructions rule uses the entry literal `content_mismatch`; `oat doctor` checks map to config/tools with `pjm:*` suppressed against `oat pjm doctor`; design and discovery aligned to the one-fix carve-out; design `:55` to five entries and the four-phrase matcher; the self-pinning assertion removed; a fourth file check for the two sync config files; `dispatch-matrix` adoption detected via `workflow.dispatchCeiling.recommendationVersion`; `oat pjm init` (no `--guidance`); rounds recorded in `## Reviews`; the 626 KB figure, the `:125` docs bullets, the run-time tools expectation, prefix heading matching, and Error Handling rule 2 assigned and pinned. Not applied: `oat_template: true` is the quick-start's interruption-safe pre-completion state (`oat-project-quick-start/SKILL.md:619-626`) and flips at Step 3.7.

### 2026-09-14 — Plan artifact review received (round 3, structured, final)

- 0 critical, 1 important, 5 medium, 4 minor — CHANGES REQUESTED on the Important only; every round-2 disposition verified closed. All 10 applied: the `oat doctor` check mapping is a semantic map (dispatch matrix and synced checkouts → config; manifest, providers, symlinks, codex, skill versions, pack state → tools; stale invocations → docs; anything else → info) in the plan and both design table rows; the live-verification expectation names every non-passing check and its area; the design's contract-test bullet no longer asks for the area/severity assertion; the three docs citations restored; the deprecation test claim softened to the catalog's phrasings; the Mode Assertion assertion specified as an exact command-stem set; docs lines `:126-127`; prefix-only citation rule; the stale `oat --scope all sync` invocation folded into p02-t03. Retry bound exhausted; plan marked complete.

## Live verification (p02-t04)

Run 2026-09-14 by the implementing agent following `.agents/skills/oat-doctor/SKILL.md` at this branch by absolute path, with the branch-built CLI (`packages/cli/dist/index.js`, 0.2.75) and `--cwd` pointing at each repository. Nothing was installed or synced at user scope. First screens as the skill's rules produce them from the projected sweep:

**This repository** (`.oat/config.json` documentation set, PJM `declared`)

```text
OAT ▸ DOCTOR
Config (2 warnings, 5 info)
  ⚠ project:synced_gate-execution-contract-hardening_checkout: synced checkout is absent   [oat doctor]
    → oat project pull .oat/projects/synced/gate-execution-contract-hardening
  ⚠ project:dispatch_matrix: dispatch matrix recommendation not adopted                     [oat doctor]
    → oat config adopt dispatch-matrix --shared
PJM (1 warning)
  ⚠ pjm:backlog_completed_unarchived                                                      [oat pjm doctor]
    → oat backlog archive <id> for each named item, then oat backlog regenerate-index
Agent instructions (1 warning)
  ⚠ AGENTS.md has no "## Tool Packs" section although packs are installed at project scope   [AGENTS.md]
    → oat tools install <pack> --project-guidance   (this repo carries a hand-written skills block instead)
Docs (ok)
Tools (8 warnings)
  ⚠ 5 outdated at user scope (explainer-kit, oat-doctor, oat-project-complete, oat-project-review-receive, oat-reviewer)
    → oat tools update --scope user
  ⚠ project:pack_state, user:pack_state, packs:scope_duplication                            [oat doctor]
    → oat tools migrate --pack <pack> --from project --to user
Where do you want to dive? [config / pjm / instructions / tools / all / done]
```

Both `oat doctor` and `oat pjm doctor` exited 1 and were parsed as findings, as the sweep rule requires. Every `project:*` warning landed in the area the semantic map assigns; none fell into config by prefix.

**`~/code/vox/pntr`** (root `docs/`, no `documentation` config, PJM `partial-initialization`)

```text
OAT ▸ DOCTOR
Config (2 warnings, 6 info)
  ⚠ project:synced_gitignore   → see message; ⚠ project:dispatch_matrix → oat config adopt dispatch-matrix --shared
PJM (3 errors, 2 warnings)
  ✖ adoption is partial-initialization: declared but canonical files are missing   → oat pjm init
  ✖ pjm:canonical_files   → oat pjm init
  ✖ pjm:backlog_terminal_in_items   → oat backlog archive <id> for each named item
  ⚠ pjm:top_level_layout   → move the unknown top-level entries (backlog-lifecycle.md § Catching lifecycle drift)
  ⚠ pjm:backlog_completed_unarchived   → oat backlog archive <id>, then oat backlog regenerate-index
Agent instructions (2 warnings)
  ⚠ AGENTS.md has no "### Project Management" / "### Decision Records" although PJM is declared   → oat pjm init
Docs (1 warning)
  ⚠ docs/ exists but .oat/config.json has no documentation section   → run oat-docs-bootstrap; it detects the surface and offers the audit
Tools (66 warnings)
  ⚠ 62 outdated at project scope, 5 at user scope   → oat tools update --scope project
  ⚠ project:skill_versions, project:pack_state, user:pack_state, packs:scope_duplication
Where do you want to dive? [config / pjm / instructions / docs / tools / all / done]
```

Read-only: nothing in that repository was changed. The docs warning is the case `BL-260911-make-docs-bootstrap-a-front` exists for.

**Scratch repository** (`git init` under `mktemp -d`, no `.oat/`)

```text
OAT ▸ DOCTOR
Config (1 warning, 9 info)
  ⚠ project:dispatch_matrix   → oat config adopt dispatch-matrix --shared
PJM (1 error)
  ✖ adoption is none: PJM is not adopted here   → oat pjm init
Agent instructions (ok)   (no instruction files scanned; no packs at project scope, so no heading rule fires)
Docs (ok)
Tools (4 warnings)
  ⚠ project:canonical_directories, project:manifest, project:providers: no OAT project setup   → oat init, then oat tools install <pack>
  ⚠ user:pack_state; 5 outdated at user scope   → oat tools update --scope user
Where do you want to dive? [config / pjm / tools / all / done]
```

Every area offers its bootstrap. With `OAT_NON_INTERACTIVE=1` the same run ends after the report line above the prompt; no `AskUserQuestion` is issued and no fix is run.

Corrections made during verification: the CLI's adoption states are `declared`, `inferred-legacy`, `partial-initialization`, `none` (`packages/cli/src/commands/pjm/adoption.ts:8`), not the `absent`/`partial` the design assumed; the PJM rule and dive now use the CLI's literals.

Pre-existing failures on `origin/main` observed at the Phase 1 gate, not caused by this project: (1) `review-skill-contracts.test.ts` pinned the old literal guard path after #299 switched `oat-project-complete` to `"$RECAP_TERMINAL_GUARD"` — repinned in this branch (`4e4a47480`) because it kept every PR's CI red; (2) `.agents/skills/explainer-kit/tests/flow.e2e.test.mjs` "real program material passes …" fails `ledgerToPage` (`cohesion-claim-unobserved` for `numericClaims.wave-1` … `wave-4`): the authored fixture page no longer observes the live program material's wave numbers — the recap project's own test drifting against real inputs; left for a follow-up item.
