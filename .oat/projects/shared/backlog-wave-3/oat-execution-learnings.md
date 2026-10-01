---
oat_generated: false
---

# OAT Execution Learnings: backlog-wave-3

Append-only. Entries are UTC-dated and use the categories gotcha, efficiency,
documentation-gap, candidate-skill-content, decision, and environment-limited.

## 2026-10-01T05:48:16Z - decision - Wave setup reused the Wave 2 reviewer routes

**Observation:** The operator approved the batch and chose Claude Opus 5.5 high implementers, Codex `codex-6-sol-xhigh` as the independent reviewer with gates on every phase, and managed/high dispatch. The Codex target is reached through cross-family exclusion, because `claude-opus-5-5-high` has a higher priority (180) than `codex-6-sol-xhigh` (170) in the user gate config.
**Impact:** Gate runs need `OAT_GATE_PRODUCER_IDENTITY=claude-opus-5-5:declared` so the Codex target is selected.
**Recommendation:** Keep passing the producer identity on every gate run; do not inject `--target`.

## 2026-10-01T05:48:16Z - gotcha - Quick-start and autonomous skills are user-invocable only

**Observation:** The Skill tool refuses user-invocable-only skills, so the operator ran `/oat-project-autonomous` after the coordinator scaffolded the project and wrote the phase-gate setting.
**Impact:** Tackle-backlog waves need one operator hand-off between batch approval and planning.
**Recommendation:** Scaffold and write `oat_phase_review_gate` before handing off, as this wave did.

## 2026-10-01T06:07:46Z - environment-limited - The run loads user-scope lifecycle skills older than main

**Observation:** The slash commands load user-scope skills from `~/.agents/skills` (oat CLI 0.3.8 on PATH): `oat-project-implement` 2.3.12, which has no Step 7a pre-review bookkeeping commit. `origin/main` and the project-scope view (`.claude/skills` linked to the repo's `.agents/skills`) carry 2.3.14.
**Impact:** `BL-260829-order-phase-bookkeeping-before` needs a run that uses Step 7a, and this wave edits the implement skill in p01 and p04, so the working-tree copy changes mid-run.
**Recommendation:** Implementation follows `oat-project-implement` as of `origin/main` (2.3.14, read with `git show origin/main:<path>`) for the whole run, and records that version beside any BL-260829 evidence. Refresh user-scope skills with `oat tools update` after each release.
