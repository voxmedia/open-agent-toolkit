---
oat_generated: false
purpose: autonomous-execution-learnings
append_only: true
oat_last_updated: 2026-08-26
---

# Autonomous Execution Learnings: wave-2-execution

Append-only, UTC-dated entries (categories: gotcha, efficiency,
documentation-gap, candidate-skill-content, decision, environment-limited).

## 2026-08-26T19:20:00Z - gotcha - worktree:init after scaffold resets activeProject

**Observation:** `scripts/worktree/init.sh` copies `.oat/config.local.json` from the primary checkout; running it after `oat project new` reset `activeProject` to null.
**Impact:** One extra `oat config set activeProject` before any lifecycle command.
**Recommendation:** Bootstrap before scaffolding (W1 order) or re-set the pointer; the wave skill should state the order explicitly.

## 2026-08-26T19:20:00Z - gotcha - Manifest restamp comes from the workspace CLI, not the global one

**Observation:** `worktree:init` runs `oat sync` via `pnpm run cli` (workspace source, 0.2.33) while the shell's global `oat` is 0.2.32, so `.oat/sync/manifest.json` was restamped 0.2.32 → 0.2.33 on a fresh branch.
**Impact:** A benign one-line restamp commit; it is precisely the producer/invoker skew this wave's lane surfaces.
**Recommendation:** After W2 ships, `oat sync` will warn about this; keep committing the restamp separately from lane work.
