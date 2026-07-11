# Dispatching Subagents Reference Package

This directory is the staging area for evidence and draft material that Phase
p04 will reconcile before promoting the canonical `oat-dispatch-subagents`
skill.

## Current Status

The existing dispatch drafts and verification prompt remain at their original
flat paths under the parent `references/` directory while the Phase 1 external
gate is active. Move those files and update every embedded prompt and plan link
in one atomic follow-up change after the gate bookkeeping lands.

## Intended Layout

- `contract-draft.md` — provider-neutral draft contract.
- `providers/` — Cursor, Codex, and Claude draft harness references.
- `verification/protocol.md` — bounded cross-harness verification protocol.
- `verification/claims.md` — stable claim IDs and required probes.
- `verification/prompts.md` — copy-paste prompts for fresh root sessions.
- `verification/summary.md` — reconciled verdicts and promotion readiness.
- `verification/runs/` — immutable timestamped evidence packets by harness.

Pre-p04 capability verification belongs here. Phase p05 live workflow smoke
reports remain under `tools/smoke/reports/<harness>/`; link to them instead of
duplicating them.
