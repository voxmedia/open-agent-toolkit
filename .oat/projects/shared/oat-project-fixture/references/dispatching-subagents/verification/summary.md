# Dispatch Verification Summary

> **Status:** in progress. No provider is promotion-ready from this package yet.

## Readiness Matrix

| Harness    | Latest evidence                                       | Status            | Promotion eligible | Next action                    |
| ---------- | ----------------------------------------------------- | ----------------- | ------------------ | ------------------------------ |
| Claude     | `runs/claude/2026-07-11T201120Z/`                     | Pilot complete    | No                 | Fresh canonical run against v2 |
| Codex      | `runs/codex/2026-07-11T202208Z/`                      | Pilot complete    | No                 | Fresh canonical run against v2 |
| Cursor IDE | Flat execution log and catalog findings; no v2 packet | Baseline evidence | No                 | Fresh canonical run against v2 |
| Cursor CLI | Prior probes only; no v2 packet                       | Baseline evidence | No                 | Fresh canonical run against v2 |

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

## Codex Pilot

The Codex packet is also `pilot/noncanonical`: the root session authored v2 and
therefore was not fresh. It used committed v2 inputs at `101075ca`.

Key findings:

- A generic depth-1 topology child launched with explicit Terra/low controls;
  its explicit Luna/low depth-2 leaf returned
  `OAT_CODEX_NESTED_SENTINEL_OK`.
- Agent type, model, reasoning effort, service tier, and fork context are
  independent payload fields. Full-history fork compatibility must be recorded
  rather than assumed (`COD-M08`).
- Effective `agents.max_depth` was 3, sufficient for the tested depth-2 path.
- The ephemeral read-only `codex exec` sentinel returned
  `OAT_CODEX_CLI_SENTINEL_OK`. JSON output did not independently corroborate
  runtime model identity.
- A nonfatal MCP authorization diagnostic appeared during the successful CLI
  control; diagnostics therefore remain separate from launch status and child
  outcome.
- The topology child compressed role families in its report. Canonical prompts
  now forbid shorthand and require verbatim selector arrays.

Pilot artifacts:

- `runs/codex/2026-07-11T202208Z/report.md`
- `runs/codex/2026-07-11T202208Z/evidence.json`

## Next Promotion Steps

1. Review protocol v2 and the stable claims ledger against the Claude pilot.
2. Review the final v2 amendments derived from both pilots.
3. Run fresh canonical Claude and Codex sessions against immutable v2 inputs.
4. Run separate fresh Cursor IDE and Cursor CLI sessions against their distinct
   v2 prompts, retaining inconclusive CLI-native results when structured Task
   evidence remains unavailable.
5. Promote only confirmed mechanisms; retain snapshots, contradictions, and
   inconclusive claims in provider references.
