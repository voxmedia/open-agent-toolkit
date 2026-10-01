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

## 2026-10-01T06:36:47Z - decision - Plan gate exhausted with every finding resolved in the plan

**Observation:** The quick-start Codex gate blocked twice (attempt 1: 1 High, 2 Medium; attempt 2: 1 High, 1 Medium). Each round raised new, valid sequencing findings, and the last were fixed after the final allowed attempt. Wave 2's plan gate ended the same way.
**Impact:** QS-12 `block` with `maxAttempts: 2` stops autonomous readiness at a boundary even when the remaining findings are resolved.
**Recommendation:** For broad multi-item waves, expect the plan gate to need the operator's go-ahead after two attempts; record the post-gate fixes so the decision is cheap.

## 2026-10-01T13:12:23Z - gotcha - Another PR took the same skill and lockstep versions mid-wave

**Observation:** PR #334 merged to `main` during p03 and set lockstep 0.3.10, `oat-dispatch-subagents` 1.2.11, and `oat-project-implement` 2.3.15, the exact versions this branch had already bumped to. `check:skill-bumps` (which compares against `origin/main`) turned red at the p03 review head, though it was green when the implementer ran it.
**Impact:** Version bumps are relative to a moving base; a long wave branch must re-bump above `main` after each merge from `main`.
**Recommendation:** `git fetch origin main` before each phase review and run `check:skill-bumps`; when `main` moves, merge it, resolve pin conflicts, bump every collided skill one patch above `main`, and move the fan-in lockstep target.

## 2026-10-01T16:40:26Z - candidate-skill-content - Recompute-and-compare beats field-by-field integrity checks

**Observation:** p03 brief integrity was enforced one field at a time. Three adversarial review rounds each found an unlisted field (claims, adversarial and coverage entries, then questions and scope), and the per-clause neutralization rule multiplied the test cost of each new clause. A complexity review recommended rebuilding the brief with the production generator and comparing hashes, and found the omission-gap rule unsupported by any criterion.
**Impact:** Four fix rounds on one phase; the operator approved the simplification and deleted the omission rule.
**Recommendation:** For assurance-bearing integrity checks, prefer "recompute with the production helper and compare" over listing protected fields. When two review rounds raise a High in the same family, stop and run a complexity review before adding a clause.
