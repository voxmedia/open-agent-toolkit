# Dispatching Subagents Reference Package

This directory contains the verified evidence and reference layer Phase p04
uses to promote the canonical internal `oat-dispatch-subagents` skill.

## Current Status

Fresh canonical capability verification is complete for Claude, Codex, Cursor
IDE, and Cursor CLI. Confirmed provider-neutral mechanisms have been reconciled
into `contract.md`; provider-specific mechanics and inconclusive findings live
under `providers/`.

The flat `references/dispatching-subagents*-draft.md` files remain frozen input
artifacts. Do not update them with verified conclusions. Timestamped run
packets under `verification/runs/` are immutable evidence.

## Package Layout

- [contract.md](contract.md) — verified provider-neutral p04 promotion
  candidate.
- [providers/claude.md](providers/claude.md) — verified Claude surfaces,
  topology, and boundaries.
- [providers/codex.md](providers/codex.md) — verified Codex controls, topology,
  and boundaries.
- [providers/cursor.md](providers/cursor.md) — separate verified Cursor IDE and
  CLI behavior.
- [verification/protocol.md](verification/protocol.md) — bounded cross-harness
  capability protocol.
- [verification/claims.md](verification/claims.md) — stable claim IDs and
  evidence requirements.
- [verification/prompts.md](verification/prompts.md) — copy-paste prompts for
  fresh root sessions.
- [verification/summary.md](verification/summary.md) — reconciled verdicts,
  corrections, and promotion decisions.
- [verification/runs/](verification/runs/) — immutable timestamped packets by
  harness and flavor.

## Source Boundaries

Use the files in this order:

1. Read [contract.md](contract.md) for provider-neutral selection and evidence
   rules.
2. Read exactly the active provider reference under [providers/](providers/).
3. Use [verification/summary.md](verification/summary.md) for claim verdicts
   and qualifications.
4. Open a timestamped run packet only when exact evidence or provenance is
   needed.
5. Consult the flat drafts to understand the assertions that were tested, not
   as current guidance.

Pre-p04 capability verification belongs here. Phase p05 live workflow smoke
reports remain under `tools/smoke/reports/<harness>/`; link to those reports
instead of duplicating them.
