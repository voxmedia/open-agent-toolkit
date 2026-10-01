# Cursor Opus 5.5 native pin probe

These redacted fixtures were captured from eight temporary Cursor desktop 3.20.14
subagents on 2026-09-23. Each subagent used bracket-form `model:` frontmatter,
ran one Shell command, and produced native `subagentStart`, `preToolUse`, and
`subagentStop` hook events. The JSONL summary records the submitted selector
and resolved model for each launch. The events JSONL retains all 32 correlated
lifecycle events, with stable pseudonymous call and session references; user
identity, original IDs, and local paths were removed. The original narrative
and historical copies live in the `claude-effort-levels` OAT project, which
moves to the ignored archive on completion. The test reads these package-owned
copies so the mapping evidence remains available after project archival.

# Cursor Grok 4.6, Fable 5.1, and Grok 4.7 native pin probe

`cursor-pin-probe-2026-09-25.jsonl` summarizes 28 temporary Cursor desktop
3.21.18 subagents launched on 2026-09-25 in three rounds from Agent Chat, using
the procedure in the Verifying Cursor Pins runbook.
`cursor-pin-probe-2026-09-25-events.jsonl` retains all 112 correlated
`preToolUse` (Task and Shell), `subagentStart`, and `subagentStop` events, with
stable pseudonymous call and session references and a `round` field. User
identity, original IDs, workspace roots, and transcript paths were removed.

- Round 1: Grok 4.6 and Fable 5.1 effort selectors at every catalog rung, Grok
  4.7 bracket selectors, Sonnet 5 and Grok 4.5 positive controls, and unknown
  family and effort controls. Grok 4.6 and Fable 5.1 resolved as requested;
  Fable 5.1 resolves to its `-thinking-` flat IDs. Every Grok 4.7 bracket
  selector resolved to `grok-4.7-high-fast`, the account default that the
  unknown-family control also received.
- Round 2: alternative Grok 4.7 spellings. No bracket form resolved; bare
  flat IDs `grok-4.7-low` and `grok-4.7-medium` did.
- Round 3: bare `grok-4.7-high` and `grok-4.7-xhigh` resolved as requested,
  and an unknown bare ID fell back to the account default.

Grok 4.7 mappings remain outside the shipped catalog. The 2026-10-01 revision
of `DR-260718-explicit-cursor-pin-mapping` permits verified exact-ID entries;
this historical probe does not itself add a catalog entry.

# Cursor Sonnet 5.5 native pin probe

`cursor-pin-probe-2026-10-01.jsonl` summarizes 16 temporary Cursor desktop
3.22.12 subagents launched from Agent Chat in two rounds on 2026-10-01.
`cursor-pin-probe-2026-10-01-events.jsonl` retains their 64 correlated native
Task, `subagentStart`, Shell `preToolUse`, and `subagentStop` events. The
observe-only hooks captured 41 events per round; nine incidental parent
discovery events in each round are excluded from these correlated records.

- Round 1 submitted `claude-sonnet-5-5[effort=...]` at low, medium, high,
  xhigh, and max. All five resolved to `grok-4.7-high-fast`, matching the
  unknown-family fallback. The Sonnet ultra control also fell back. The
  Opus 5.5 low positive control resolved to `claude-opus-5-5-low`.
- Round 2 submitted the exact IDs `claude-sonnet-5-5-low`,
  `claude-sonnet-5-5-medium`, `claude-sonnet-5-5-high`,
  `claude-sonnet-5-5-xhigh`, and `claude-sonnet-5-5-max`. Each matched in
  start, child Shell, and stop events. The positive Opus control reproduced;
  `claude-sonnet-5-5-ultra` and `claude-sonnet-9-high` fell back to
  `grok-4.7-high-fast`.

Native Task inputs omitted model overrides; the events record this explicitly.
The summary's submitted selectors were transcribed from the temporary agents'
frontmatter, not derived from resolved models. Task/start/Shell/stop correlation
was checked against original call and conversation IDs before replacing them
with stable pseudonymous references. Identity fields, absolute paths, original
IDs, task prose, and discovery payloads are omitted. The retained timestamps,
model fields, exact echo commands, and categorical controls are captured data.
