---
id: BL-260925-add-grok-4-7-cursor-pin
title: Add Grok 4.7 Cursor pin mappings
status: open
priority: low
scope: task
scope_estimate: S
labels:
  - cursor
  - model-dispatch
  - grok
  - pin-probe
assignee: null
created: 2026-09-25T22:34:15.410Z
updated: 2026-09-25T22:34:15.410Z
associated_issues: []
external_plans: []
---

## Description

A 2026-09-25 Cursor desktop 3.21.18 native pin probe found that Grok 4.7 ignores every bracket selector tried (grok-4.7[effort=...] with and without fast, reasoning=, and grok-4-7[...]): each silently fell back to the account default grok-4.7-high-fast, the same model the unknown-family control received. Only bare flat IDs (grok-4.7-low, -medium, -high, -xhigh) resolved exactly. DR-260718-explicit-cursor-pin-mapping requires bracket-form mappings, and both Cursor materialization guards (providers/cursor/codec/materialize.ts and sync-extension.ts) enforce a bracket segment, so no Grok 4.7 mapping shipped with the Grok 4.6 and Fable 5.1 mappings. The work is deferred until there is more evidence on Grok 4.7 quality versus 4.6: xAI's benchmarks show gains, but some reports describe a regression. Evidence: packages/cli/src/providers/cursor/codec/**fixtures**/cursor-pin-probe-2026-09-25.jsonl and -events.jsonl (rounds 2 and 3 cover the Grok 4.7 spellings).

## Acceptance Criteria

- Grok 4.7 quality versus Grok 4.6 is assessed from evidence beyond xAI's own benchmarks (independent evaluations or a local workload comparison), and the result decides whether it should enter the bundled Cursor ladder or stay explicit-only.
- `DR-260718-explicit-cursor-pin-mapping` is revised or superseded to allow probe-backed bare flat-ID mappings for families that ignore bracket selectors, without allowing derived or undocumented syntax.
- The catalog gains a bare flat-ID syntax family whose `frontmatterModel` equals its `ladderModelId`, and both materialization guards accept it only for that family.
- Four `grok-4.7-{low,medium,high,xhigh}` mappings carry probe records pointing at the 2026-09-25 evidence (re-probed if Cursor has changed since), and catalog tests cover the new family, including that bracket-family mappings still require a bracket segment.
