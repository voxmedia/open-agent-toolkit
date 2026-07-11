# Dispatch Verification Summary

> **Status:** in progress. No provider is promotion-ready from this package yet.

## Readiness Matrix

| Harness | Latest evidence                                       | Status            | Promotion eligible | Next action                       |
| ------- | ----------------------------------------------------- | ----------------- | ------------------ | --------------------------------- |
| Claude  | `runs/claude/2026-07-11T201120Z/`                     | Pilot complete    | No                 | Fresh canonical run against v2    |
| Codex   | Legacy draft only                                     | Pending           | No                 | Pilot, then fresh canonical run   |
| Cursor  | Flat execution log and catalog findings; no v2 packet | Baseline evidence | No                 | Normalize or run supplementary v2 |

## Claude Pilot

The first Claude packet is intentionally `pilot/noncanonical`: the root session
was not fresh and verified the legacy flat inputs at commit `e7b63f02`, before
`claims.md` and protocol v2 existed. It is protocol-design evidence, not p04
promotion evidence.

Key findings:

- Depth-2 native nesting succeeded through a generic topology probe and an
  explicit-model leaf sentinel (`CLA-M04`, `CLA-M05`).
- The production `oat-phase-implementer` launch was accepted but returned
  `NEEDS_CONTEXT` because its role contract correctly rejects unrelated probe
  work (`CLA-M09`). Acceptance and cooperation therefore require separate
  fields.
- Native Agent model selectors are tier aliases; `claude -p --model` accepts an
  exact model ID. Granularity must be recorded per surface (`CLA-M01`,
  `CLA-M07`).
- Claude exposes three model-resolution sources: explicit call, named-agent
  definition, and parent inheritance (`CLA-M02`).
- Launcher-owned identity evidence is available through child records and CLI
  `modelUsage` (`CLA-M08`).
- Accepted children expose continuation handles. Continuation of the same child
  is distinct from replacement fallback (`CLA-M10`, `U-P09`).

Pilot artifacts:

- `runs/claude/2026-07-11T201120Z/report.md`
- `runs/claude/2026-07-11T201120Z/evidence.json`

## Pilot Schema Findings

The pilot intentionally exposed incompatibilities that v2 corrects:

1. A production coordinator role is not a safe diagnostic topology probe; use a
   generic child and leave production-role behavior to p05.
2. `launch_status` and `child_outcome` are independent.
3. A claim cannot be `confirmed` when its probe status is `not_run`. Schema and
   behavioral claims must be separate or use distinct evidence modes.
4. Model selector granularity differs by surface and cannot be collapsed into
   one "exact model" field.
5. Continuation events need explicit representation.

## Next Promotion Steps

1. Review protocol v2 and the stable claims ledger against the Claude pilot.
2. Run a Codex pilot to stress the same schema from a materially different
   role/model/effort surface.
3. Revise v2 once from both pilot results.
4. Run fresh canonical Claude and Codex sessions against immutable v2 inputs.
5. Normalize the existing Cursor evidence into claim IDs or run a bounded
   supplementary recheck.
6. Promote only confirmed mechanisms; retain snapshots, contradictions, and
   inconclusive claims in provider references.
