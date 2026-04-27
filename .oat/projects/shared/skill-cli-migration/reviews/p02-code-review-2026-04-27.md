---
oat_generated: true
oat_generated_at: 2026-04-27
oat_review_scope: p02
oat_review_type: code
oat_review_invocation: orchestrator
oat_project: .oat/projects/shared/skill-cli-migration
---

# Code Review: p02

**Reviewed:** 2026-04-27
**Scope:** Phase 2 — Migrate pure-read skills (`oat-project-progress`, `oat-project-pr-progress`) to consume `oat --json project status` via the canonical inline preamble.
**Workflow mode:** quick
**Files reviewed:** 2
**Commits:** 0b01b0c9..742092f7 (e80f1a58 refactor(p02-t01) + 742092f7 refactor(p02-t02))

## Summary

Both p02 tasks land cleanly. The canonical preamble (resolve `oat` with `command -v` branching, fall back to `npx @open-agent-toolkit/cli`, fetch JSON once, extract with `jq -r`) matches the source in `.agents/skills/create-oat-skill/SKILL.md` verbatim — no `// ""` defaults, no quoted-command-string anti-pattern. Versions are bumped on both skills. The two flagged concerns are real but cosmetic — both are **Minor** (cleanup opportunities), not blockers. No Critical, no Important findings.

## Findings

### Critical

None

### Important

None

### Minor

- **Unused bash variables `PHASE` / `PHASE_STATUS` / `WORKFLOW_MODE` inside the drift-detection block** (`.agents/skills/oat-project-progress/SKILL.md:210-212`)
  - Issue: The plan's p02-t01 Step 1 listed three example `grep | awk` lines (PHASE, PHASE_STATUS, WORKFLOW_MODE) that did not actually exist in the pre-scope skill — only `LAST_SHA` was a bash-level variable. The implementer faithfully followed the plan's literal instruction and added all three jq extractions, but inside this drift-detection bash block only `LAST_SHA` (line 222), `PLAN_TASKS`, `IMPL_COMPLETED`, and `UNTRACKED_COMMITS` are consumed. The three new variables go unused. The skill's prose at lines 152–157 and the routing matrix at lines 241–274 do reference `oat_phase`/`oat_phase_status`/`oat_workflow_mode`, but those are values the agent reads via the Read tool from `state.md`, not via these bash variables.
  - Reason flagged Minor (not Important): keeping the full canonical preamble intact has documentation/teaching value (it shows skill authors the complete pattern), and the unused vars are inert (no runtime side effect). Per YAGNI, however, they should arguably be trimmed to just the line(s) actually consumed.
  - Fix options (pick one):
    - **Trim** to just the preamble + `LAST_SHA` line: drop the three unused `jq -r` extractions for `PHASE`/`PHASE_STATUS`/`WORKFLOW_MODE` from this bash block. Add a comment pointing readers at `create-oat-skill` for the canonical full preamble.
    - **Keep** as-is and add a one-line comment above the unused trio: `# (PHASE/PHASE_STATUS/WORKFLOW_MODE retained for parity with the canonical preamble; not consumed by this block)`.
  - Verification: `grep -nE "^(PHASE|PHASE_STATUS|WORKFLOW_MODE)=" .agents/skills/oat-project-progress/SKILL.md` and confirm any retained vars have a matching consumer downstream in the same bash block.
  - Requirement: derived from plan p02-t01 Step 2 ("Keep variable names ... identical so downstream logic in the skill is untouched") — but downstream logic in this file does not consume them as bash vars, so the literal-following intent does not match the file's reality.

- **Dead `:-spec-driven` default after `jq -r '.project.workflowMode'`** (`.agents/skills/oat-project-pr-progress/SKILL.md:175-176`)
  - Issue: `jq -r` on a missing key or a null value emits the literal string `"null"` (not empty). Bash `${WORKFLOW_MODE:-spec-driven}` only substitutes when the variable is empty or unset, so with `WORKFLOW_MODE="null"` the `:-spec-driven` default never fires. Verified by `echo '{}' | jq -r '.project.workflowMode'` → `null`, and `WM=null; WM=${WM:-spec-driven}; echo "$WM"` → `null`.
  - Behavior delta vs pre-scope: previously `grep` on a missing line gave empty → defaulted to `spec-driven` → downstream "spec-driven mode" path. New code: missing or null → `WORKFLOW_MODE="null"` → trips the `WORKFLOW_MODE != spec-driven` branch at line 188, which "include[s] an explicit note in PR summary that spec-driven requirements/design artifacts are absent for this scope." This is a real (small) behavioral drift, but the plan explicitly accepts it as the "single sentinel `null` across success and error paths" contract (plan.md p02-t02 Step 2 + p01-t01 contract notes).
  - Reason flagged Minor (not Important): the contract is intentional and documented; the drift only affects the surfacing of an informational note in PR summaries, not blocking behavior. The line is misleading future readers (it implies a default that no longer exists).
  - Fix options (pick one):
    - **Remove** the dead line: delete `WORKFLOW_MODE=${WORKFLOW_MODE:-spec-driven}` and rely on the literal-`null` contract.
    - **Coerce** `null` → `spec-driven` explicitly with a guard if the prior default behavior is desired: `[ "$WORKFLOW_MODE" = "null" ] && WORKFLOW_MODE=spec-driven`. Note this would _re-introduce_ drift away from the plan's documented contract — only choose this if you also amend the plan.
    - **Keep** as-is and document inline: add a comment `# Defensive default for empty (not "null") values; jq -r never emits empty here, but kept for symmetry with prior behavior.`
  - Verification: `WM=$(echo '{}' | jq -r '.project.workflowMode'); WM=${WM:-spec-driven}; echo "$WM"` should print `null` today; whichever fix you apply, re-run with the same input and confirm the expected post-fix value.
  - Requirement: derived from plan p02-t02 Step 2 contract ("no `// ""` default") + p01-t01 Contract Notes ("single consistent sentinel across success and error paths").

## Requirements/Design Alignment

**Evidence sources used (quick mode):**

- `plan.md` (primary requirement source for p02)
- `implementation.md` (phase 1 outcome only — p02 not yet logged)
- `.agents/skills/create-oat-skill/SKILL.md` § "Reading project state" (canonical preamble source, landed in p01-t01)
- pre-scope baselines via `git show 0b01b0c9:...`
- `discovery.md` not loaded (not required for code-level requirement check at this scope)

### Requirements Coverage

| Requirement (plan task)                                                                                                                | Status      | Notes                                                                                                                                                                                                                                                                                                                                               |
| -------------------------------------------------------------------------------------------------------------------------------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| p02-t01: Insert canonical preamble in `oat-project-progress` once before the first field is needed                                     | implemented | Inserted at `.agents/skills/oat-project-progress/SKILL.md:197-212`, immediately above the drift-detection block that consumes `LAST_SHA`. Branching uses `command -v oat`, no quoted-command-string anti-pattern. Matches `.agents/skills/create-oat-skill/SKILL.md:181-197` byte-for-byte modulo variable order.                                   |
| p02-t01: Replace `LAST_SHA` grep with `jq -r '.project.lastCommit'` (no `// ""` default)                                               | implemented | `.agents/skills/oat-project-progress/SKILL.md:222`. No `// ""` default. Null-sentinel contract preserved.                                                                                                                                                                                                                                           |
| p02-t01: Plan-named `PHASE` / `PHASE_STATUS` / `WORKFLOW_MODE` migrations                                                              | partial     | Added at lines 210–212, but the source greps the plan referenced never existed in the pre-scope file (only `LAST_SHA` did). The added bash vars are inert in this block. See Minor finding #1. Plan-vs-reality mismatch is a plan-authoring artifact, not an implementation defect — implementer correctly followed the plan's literal instruction. |
| p02-t01: Leave out-of-scope greps untouched                                                                                            | implemented | `project-index.md` greps at lines 61–62 + `plan.md` and `implementation.md` greps at lines 216, 219 untouched.                                                                                                                                                                                                                                      |
| p02-t01: Bump `version:`                                                                                                               | implemented | `1.2.2 → 1.2.3` in frontmatter.                                                                                                                                                                                                                                                                                                                     |
| p02-t02: Insert canonical preamble in `oat-project-pr-progress` at the top of the bash block that needs `WORKFLOW_MODE`                | implemented | `.agents/skills/oat-project-pr-progress/SKILL.md:162-176`. Same branching, same byte-for-byte preamble.                                                                                                                                                                                                                                             |
| p02-t02: Replace `WORKFLOW_MODE` grep with `jq -r '.project.workflowMode'` (no `// ""` default)                                        | implemented | Line 175. No `// ""` default. Null-sentinel contract preserved per plan p02-t02 Step 2.                                                                                                                                                                                                                                                             |
| p02-t02: Bump `version:`                                                                                                               | implemented | `1.2.0 → 1.2.1` in frontmatter.                                                                                                                                                                                                                                                                                                                     |
| Canonical preamble parity with `create-oat-skill` (no `// ""` defaults, `command -v` branching, no quoted command-string anti-pattern) | implemented | Verified via diff: only structural differences are the fenced code block markers (expected — preambles are inline-pasted) and variable-order in `oat-project-progress` (`PHASE`, `PHASE_STATUS`, `WORKFLOW_MODE`) vs canonical (`WORKFLOW_MODE`, `PHASE`, `PHASE_STATUS`). Variable order does not affect behavior.                                 |
| No other files modified outside the two skill paths                                                                                    | implemented | `git diff --name-only 0b01b0c9..742092f7` returns exactly the two SKILL.md files.                                                                                                                                                                                                                                                                   |

### Extra Work (not in declared requirements)

- Three unused bash extractions in `oat-project-progress` (PHASE / PHASE_STATUS / WORKFLOW_MODE). Already covered as Minor finding #1. Not "scope creep" — implementer was following the plan's literal text — but is a candidate for trim.

## Verification Commands

Run from this worktree to verify the fixes (or current state if accepting the Minor findings as-is):

```bash
# 1. Confirm only the two intended files changed in scope
git diff --name-only 0b01b0c9..742092f7

# 2. Confirm version bumps
grep -E "^version:" .agents/skills/oat-project-progress/SKILL.md \
                    .agents/skills/oat-project-pr-progress/SKILL.md
# Expected: 1.2.3 and 1.2.1 respectively

# 3. Confirm canonical preamble parity (branching + no `// ""` defaults)
grep -n 'command -v oat' .agents/skills/oat-project-progress/SKILL.md \
                          .agents/skills/oat-project-pr-progress/SKILL.md
grep -n '// ""' .agents/skills/oat-project-progress/SKILL.md \
                .agents/skills/oat-project-pr-progress/SKILL.md
# Expected: branching present in each; no `// ""` matches

# 4. Confirm no remaining state.md greps in either skill
grep -n 'grep "\^oat_' .agents/skills/oat-project-progress/SKILL.md \
                       .agents/skills/oat-project-pr-progress/SKILL.md
# Expected: no matches against state.md fields (project-index.md greps are out of scope)

# 5. Live parity probe (per plan p02-t01 Step 3 + p02-t02 Step 3)
oat --json project status | jq -r '.project.phase, .project.phaseStatus, .project.workflowMode, .project.lastCommit'
grep -E "^oat_phase:|^oat_phase_status:|^oat_workflow_mode:|^oat_last_commit:" \
  .oat/projects/shared/skill-cli-migration/state.md

# 6. Reproduce the Minor #2 dead-code observation
WM=$(echo '{}' | jq -r '.project.workflowMode'); echo "raw: $WM"; WM=${WM:-spec-driven}; echo "after :- default: $WM"
# Expected today: raw: null / after :- default: null  (default never fires)
```

## Recommended Next Step

Two **Minor** findings only — zero Critical, zero Important. Per the orchestrator pass/fail rule (pass if zero Critical and zero Important), this review is a **pass**.

If the team wants to action the Minor findings, run the `oat-project-review-receive` skill to convert them into plan tasks (or fold them into the eventual p04 cleanup pass). Otherwise proceed to **p03** per the plan.
