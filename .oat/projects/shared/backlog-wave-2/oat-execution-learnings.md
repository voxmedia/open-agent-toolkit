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
