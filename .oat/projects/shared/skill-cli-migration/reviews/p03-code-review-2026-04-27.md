---
oat_generated: true
oat_generated_at: 2026-04-27
oat_review_scope: p03
oat_review_type: code
oat_project: .oat/projects/shared/skill-cli-migration
oat_review_invocation: orchestrator
---

# Code Review: p03 (mixed read/write skill migrations, read path only)

**Reviewed:** 2026-04-27
**Scope:** Phase 3 — migrate `state.md` read paths in five skills (`oat-project-plan`, `oat-project-pr-final`, `oat-project-review-provide`, `oat-project-reconcile`, `oat-project-complete`) from `grep | awk` to `oat --json project status` + `jq -r`. Read paths only.
**Files reviewed:** 5 SKILL.md files
**Commits:** d5e3f1d8..d613c425 (5 commits, p03-t01..t05)

## Summary

The phase cleanly migrates every shell-level `grep ... state.md` read in the five target skills to the canonical `oat --json project status` + `jq -r` preamble documented in `create-oat-skill/SKILL.md`. All five preambles match the canonical block verbatim, no write paths were touched, no out-of-scope greps were modified, every version field was bumped, and behavioral parity probes confirm `jq -r` and the prior `grep | awk` produce identical values for every migrated field (including the literal-`null` sentinel for `docsUpdated`).

The implementer's three flagged concerns are all assessed as non-defects (see Implementer Concerns section below). Zero Critical, zero Important findings.

## Findings

### Critical

None.

### Important

None.

### Minor

- **Inconsistent treatment of post-jq bash default across migrations** (`.agents/skills/oat-project-plan/SKILL.md:121`, `.agents/skills/oat-project-pr-final/SKILL.md:150`)
  - Issue: p03-t01 and p03-t02 dropped the trailing `WORKFLOW_MODE=${WORKFLOW_MODE:-spec-driven}` line, while the earlier p02-t02 migration of `oat-project-pr-progress` (line 176) preserved it. Both behaviors are functionally safe in normal operation because `state.md` always has a real value; the divergence only matters in the degenerate "CLI failed and JSON is `{}`" case, where the literal string `null` falls through. In that edge case `oat-project-pr-final` will skip both the `spec-driven` requirement block and the `quick`/`import` reduced-assurance branch (no spec/design check, no reduced-assurance note). This is consistent with the plan's "single null sentinel" contract, but the cross-skill inconsistency is a small maintainability paper-cut.
  - Suggestion: pick one rule project-wide (either always drop the bash default and rely on jq's `null` sentinel, or always preserve it as defense-in-depth) and sweep all migrated skills in a follow-up. The plan's intent reads as "drop it"; if so, p02-t02 should be cleaned up in a follow-up rather than this phase reverting.

- **Indented preamble in `oat-project-reconcile`** (`.agents/skills/oat-project-reconcile/SKILL.md:108-122`)
  - Issue: The preamble is indented by 3 spaces because it is nested inside a numbered list item. The block is still inside a fenced `bash` so the indentation is not interpreted by bash, but a copy-paste consumer who strips the fence and pastes the inner text into a shell would carry the leading spaces. Bash tolerates leading whitespace before a command, so this is functionally fine.
  - Suggestion: optional — none required. Markdown rendering and shell semantics are both correct as-is.

## Requirements/Design Alignment

**Evidence sources used:** `plan.md`, `implementation.md`, `.agents/skills/create-oat-skill/SKILL.md` (canonical preamble source), live `oat --json project status` probe against this worktree.

**Workflow mode:** quick (no `spec.md` / `design.md`; not a finding).

### Requirements Coverage

| Requirement (from plan)                                                                      | Status      | Notes                                                                                                                                                                                                                                                      |
| -------------------------------------------------------------------------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| p03-t01: migrate `oat-project-plan` read path                                                | implemented | One preamble + `WORKFLOW_MODE` jq replacement at lines 108-121. No write touched.                                                                                                                                                                          |
| p03-t02: migrate `oat-project-pr-final` read path                                            | implemented | One preamble + `WORKFLOW_MODE` jq at lines 137-150. Plan attributed `oat_docs_updated` to this skill but the actual grep was `oat_workflow_mode`; net coverage correct (see Implementer Concerns #1).                                                      |
| p03-t03: migrate `oat-project-review-provide` read path                                      | implemented | Two preambles in two distinct bash blocks (lines 125-145 and 263-275). All four `state.md` greps removed; `PHASE`, `PHASE_STATUS`, `WORKFLOW_MODE` extracted via jq. No `oat_last_commit` grep existed despite the plan mention (Implementer Concerns #2). |
| p03-t04: migrate `oat-project-reconcile` read path                                           | implemented | One preamble + `PHASE`/`PHASE_STATUS` jq at lines 108-122. Plan named `oat_last_commit` but it does not exist as a read in this skill — only inside a frontmatter write template at line 632 (Implementer Concerns #2).                                    |
| p03-t05: migrate `oat-project-complete` read path                                            | implemented | One preamble + `DOCS_UPDATED` jq at lines 186-198. `oat_pr_status`/`oat_pr_url`/`oat_project_completed` write paths untouched.                                                                                                                             |
| Canonical preamble matches `create-oat-skill` "Reading project state" verbatim               | satisfied   | All five preambles match the canonical body byte-for-byte (modulo list-nesting indentation in reconcile).                                                                                                                                                  |
| No write paths touched (frontmatter writes, oat_pr_status/oat_pr_url/oat_project_completed)  | satisfied   | Diff search for `^[+-].*(oat_pr_status\|oat_pr_url\|oat_project_completed\|oat_phase_status:)` returns no hunks.                                                                                                                                           |
| No out-of-scope greps modified (plan.md / implementation.md / project-index.md / summary.md) | satisfied   | Diff search confirms zero such hunks; `pr-final`'s `grep ... plan.md` for the final-review row at line 172 is preserved.                                                                                                                                   |
| `version:` bumped on every modified SKILL.md                                                 | satisfied   | plan 1.3.1→1.3.2, pr-final 1.3.3→1.3.4, review-provide 1.3.1→1.3.2, reconcile 1.0.0→1.0.1, complete 1.4.3→1.4.4.                                                                                                                                           |
| Behavioral parity between `jq -r` and prior `grep \| awk` for every migrated field           | satisfied   | Live probe: workflowMode=quick, phase=implement, phaseStatus=in_progress, docsUpdated=null, lastCommit=742092f7 — all 5/5 match.                                                                                                                           |
| Exactly one preamble per bash block (no cross-block state)                                   | satisfied   | review-provide has 2 distinct blocks each with their own preamble; the other four skills have single blocks.                                                                                                                                               |

### Extra Work (not in declared requirements)

None. Each diff is scoped to the canonical preamble + one or more `jq -r '.project.<field>'` extractions, plus a `version:` bump. No drive-by edits.

## Implementer Concerns Evaluation

### Concern #1 — Plan/actual scan mismatch (`oat_docs_updated` attributed to pr-final but actually lives in complete)

**Assessment:** Plan-bookkeeping issue, not a defect. Verified against pre-image at `d5e3f1d8`:

- `oat-project-pr-final` pre-image had a single `state.md` grep: `oat_workflow_mode` (line 137). Migrated under p03-t02. Correct.
- `oat-project-complete` pre-image had a single `state.md` grep: `oat_docs_updated` (line 187). Migrated under p03-t05. Correct.

Net effect: every actual `state.md` read in the five target skills is migrated exactly once, no out-of-scope writes touched. The plan's mapping table named the wrong skill for one field, but the implementer correctly migrated the actual greps. Recording as informational; no fix required in the code, no follow-up plan task needed.

### Concern #2 — Plan referenced `oat_last_commit` greps that don't exist

**Assessment:** Plan-bookkeeping issue, not a defect. Verified against pre-image:

- `oat-project-review-provide`: 4 actual `state.md` greps in pre-image — `oat_phase`, `oat_phase_status`, `oat_workflow_mode` (lines 125-127), and a second `oat_workflow_mode` (line 250). All four migrated; total grep count matches the plan's "four state.md grep lines" claim even though the field labels in the mapping table were off.
- `oat-project-reconcile`: 2 actual `state.md` greps in pre-image — `oat_phase`, `oat_phase_status` (lines 108-109). The only `oat_last_commit` mention in the file is at line 632, inside a frontmatter template (write), not a grep. Plan p03-t04 Step-1 sample bash showed `LAST_SHA=$(grep "^oat_last_commit:" ...)` which was misleading, but the implementer correctly migrated only the real greps.

Net coverage is correct in both skills. Recording as informational; no fix required.

### Concern #3 — Bash default `${WORKFLOW_MODE:-spec-driven}` removed in p03-t01 and p03-t02

**Assessment:** Within the contract; minor cross-skill inconsistency noted as Minor finding (above). The plan's canonical contract explicitly says "No `// ""` defaults: YAML `null` surfaces as the literal string `null` to match the prior `grep | awk` behavior." Removing the trailing bash `:-` default is consistent with that contract — the post-jq value will only be `null` if `STATUS_JSON='{}'` (CLI failure) or the field is genuinely YAML-null on disk; in either case the prior `grep | awk` would have emitted empty and the subsequent bash default _would have_ coerced to `spec-driven`. So strictly there is a CLI-failure-path divergence:

| Path                                           | Pre (grep+awk+default)        | Post (jq, no default) |
| ---------------------------------------------- | ----------------------------- | --------------------- |
| Normal: state has `quick`                      | `quick`                       | `quick` ✓             |
| Normal: state has `spec-driven`                | `spec-driven`                 | `spec-driven` ✓       |
| CLI failure (`{}`)                             | (jq path didn't exist)        | literal `null`        |
| Pre-migration CLI-N/A: `state.md` line missing | empty → coerced `spec-driven` | n/a (jq path)         |

The pre-migration default was protecting against a missing `oat_workflow_mode:` line, which `state.md` templates always include. In the post-migration CLI-failure path, downstream branching in `oat-project-plan` falls through to the spec-driven path (matches old behavior); in `oat-project-pr-final` the `null` value matches neither the `spec-driven` nor the `quick|import` block, leaving spec/design unrequired and no reduced-assurance note. That's a tiny degraded-environment divergence, not a regression for normal use.

Since p02-t02 (already merged) preserved the bash default, and p03-t01/t02 removed it, the project is now mixed. Captured as Minor with a sweep recommendation. **Not blocking for this phase.**

## Verification Commands

Run these to verify the implementation:

```bash
# 1. Confirm canonical preamble appears verbatim in all five skills
for f in .agents/skills/oat-project-plan/SKILL.md \
         .agents/skills/oat-project-pr-final/SKILL.md \
         .agents/skills/oat-project-review-provide/SKILL.md \
         .agents/skills/oat-project-reconcile/SKILL.md \
         .agents/skills/oat-project-complete/SKILL.md; do
  echo "=== $f ==="
  grep -c 'command -v oat' "$f"
done

# 2. Confirm zero remaining shell `grep ... state.md` reads in the five files
for f in .agents/skills/oat-project-plan/SKILL.md \
         .agents/skills/oat-project-pr-final/SKILL.md \
         .agents/skills/oat-project-review-provide/SKILL.md \
         .agents/skills/oat-project-reconcile/SKILL.md \
         .agents/skills/oat-project-complete/SKILL.md; do
  grep -nE 'grep[^|]*state\.md' "$f" || true
done

# 3. Behavioral parity probe (jq vs grep|awk) for every migrated field
STATE=.oat/projects/shared/skill-cli-migration/state.md
JSON=$(oat --json project status)
for pair in 'workflowMode|oat_workflow_mode' 'phase|oat_phase' 'phaseStatus|oat_phase_status' 'docsUpdated|oat_docs_updated' 'lastCommit|oat_last_commit'; do
  jq_field="${pair%|*}"; grep_field="${pair#*|}"
  jq_val=$(echo "$JSON" | jq -r ".project.${jq_field}")
  grep_val=$(grep "^${grep_field}:" "$STATE" | head -1 | awk '{print $2}')
  echo "$jq_field: jq=$jq_val  grep=$grep_val"
done

# 4. Lint
pnpm lint
```

## Recommended Next Step

Run the `oat-project-review-receive` skill to convert findings into plan tasks (or, since both Critical and Important counts are zero, mark the p03 review row as `passed` and proceed to p04).
