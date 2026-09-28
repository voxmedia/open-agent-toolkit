---
oat_generated: false
---

# Execution Learnings: backlog-wave-2

Append-only log of reusable observations from the autonomous run. Entries are
UTC-dated and never record secrets or active autonomy signals.

## 2026-09-27T14:35Z - efficiency - Lifecycle skills are user-invocation-only from the Skill tool

**Observation:** `tackle-backlog`, `oat-project-quick-start`, and `oat-project-autonomous` declare `disable-model-invocation`, so the coordinator could not chain from tackle-backlog into quick-start; the operator had to type `/oat-project-autonomous`. Once running, autonomy loads lifecycle skills by reading their `SKILL.md`.
**Impact:** One extra operator round trip between batch approval and planning.
**Recommendation:** Tell the operator at batch approval to run `/oat-project-autonomous` next, instead of attempting the Skill tool first.

## 2026-09-27T15:25Z - decision - Plan gate exhausted on a one-flag finding

**Observation:** The quick-start plan gate (`maxAttempts: 2`, `onFailure: block`) blocked twice. Attempt 1 raised two real shim-safety Highs and a Medium; attempt 2 raised one High (missing `O_WRONLY` in the append open flags). All were resolved in the plan, but the attempt budget was spent, so autonomy stopped at the QS-12 boundary.
**Impact:** One operator round trip before implementation for a fix already applied.
**Recommendation:** This is the exact case `BL-260818-distinguish-operator-directed` (budget-exhausted decision point) targets; record the operator's disposition in the plan's Reviews notes until that ships.

## 2026-09-27T15:25Z - efficiency - Structured artifact review converged in three attempts

**Observation:** The automatic Opus plan review found 17, then 11, then 2 findings, all valid; a separate complexity review then removed about a dozen proof and pin additions the review rounds had introduced.
**Impact:** Review rounds add precision and machinery at the same time.
**Recommendation:** Run complexity-review after artifact review rounds, before the gate, so the gate sees the trimmed plan.

## 2026-09-28T01:45Z - gotcha - Commitlint rejects silently after lint-staged prints success

**Observation:** A `git commit -qm` whose body had lines over 100 characters was rejected by the commit-msg hook, but `| tail -1` showed only lint-staged's "[COMPLETED] Cleaning up temporary files..." line, so the failure went unnoticed and the staged files were swept into the next (bookkeeping) commit.
**Impact:** A code fix landed inside a bookkeeping commit; pushed history could not be cleanly corrected.
**Recommendation:** Check the commit exit code (and `git log -1`) after every commit instead of tailing hook output; wrap commit bodies at 100 characters.
