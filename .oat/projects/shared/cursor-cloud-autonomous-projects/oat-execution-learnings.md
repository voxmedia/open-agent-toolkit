---
oat_generated: false
oat_append_only: true
---

# Autonomous Execution Learnings

Append-only observations from autonomous execution and environment verification.

## 2026-07-13T21:16:00Z - environment-limited - User-scope skill loading probe

**Observation:** Created the uniquely named probe
`~/.agents/skills/oat-user-scope-probe-20260713-2116/SKILL.md`. The source CLI
command `pnpm run cli:source -- tools list --scope user --json` discovered it as
a user-scope custom skill at version `1.0.0` with status `not-bundled`. The
current Cursor Cloud agent's startup-provided available-skills surface was
created before the probe and offered no in-session refresh mechanism. A fresh
cloud run was explicitly unavailable for this task, so direct model
auto-surfacing from `~/.agents/skills/` could not be verified.

**Impact:** OAT-level canonical user-scope discovery is verified, but Cursor
Cloud's direct loading of a newly added canonical user-scope skill is not.
Treating the latter as proven would overstate the evidence.

**Recommendation:** Activate the planned contingency in p02-t03: in Cursor
Cloud, resolve and read the selected user-scope skill and companion assets by
absolute path as the primary mechanism. Provider auto-surfacing remains a
convenience only until a fresh-run probe verifies it. Keep user scope as the
execution source under the user-always-wins precedence rule.
