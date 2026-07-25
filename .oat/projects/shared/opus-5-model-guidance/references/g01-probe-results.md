---
oat_generated: false
oat_status: pending
---

# G01 Pin Probe Results

**Status:** PENDING — awaiting operator probe runs.

## Why this file exists

`assertApprovedMapping` validates only the _shape_ of a mapping's `gateEvidence`
(`packages/cli/src/providers/cursor/codec/materialize.ts:39-53`), so any mapping
declaring `gate: 'g01'` and `disposition: 'approved'` will materialize whether or
not it was ever verified. The actual authority lives outside the code:

- `apps/oat-docs/docs/workflows/projects/dispatch-ceiling.md:307` — mapping-specific
  native-launch evidence authorizes shipped mapping data.
- `:314-317` — Cursor can silently fall back when account, plan, or administration
  constraints prevent a pin, so accepting a variant is not model verification, and
  self-report must not be promoted into observed identity.

This file is that external evidence. Until it is filled in, no mapping may be added
in p02-t01.

## How to read the observed model

Record what **Cursor** reports for the run — the model shown in the agent/run UI.
Do **not** record what the agent says about itself. The probe bodies deliberately
do not ask.

## Results

| Probe agent                 | Bracket form submitted          | Observed model (Cursor-reported) | Accepted or fallback? | Thinking enabled? | Verdict |
| --------------------------- | ------------------------------- | -------------------------------- | --------------------- | ----------------- | ------- |
| `zz-pin-probe-opus5-low`    | `claude-opus-5[effort=low]`     |                                  |                       |                   |         |
| `zz-pin-probe-opus5-medium` | `claude-opus-5[effort=medium]`  |                                  |                       |                   |         |
| `zz-pin-probe-opus5-high`   | `claude-opus-5[effort=high]`    |                                  |                       |                   |         |
| `zz-pin-probe-opus5-xhigh`  | `claude-opus-5[effort=xhigh]`   |                                  |                       |                   |         |
| `zz-pin-probe-opus5-max`    | `claude-opus-5[effort=max]`     |                                  |                       |                   |         |
| `zz-pin-probe-opus48-xhigh` | `claude-opus-4-8[effort=xhigh]` |                                  |                       |                   |         |

**Verdict values:** `pass` (observed model matches intent, thinking enabled) /
`fail-fallback` (silently resolved to another model) / `fail-nonthinking`
(resolved to the non-thinking variant) / `fail-rejected` (definition not accepted).

## Environment

- **Probed at:** _(RFC3339 timestamp)_
- **Cursor version:** _(from Cursor > About)_
- **Account plan:** _(relevant because plan constraints can force fallback)_

## Consequences

Only `pass` rows become mappings in p02-t01.

- A `fail-nonthinking` row at medium or high is the specific risk flagged in
  `discovery.md`: the role would run at lower capability with no error surfaced.
- Any dropped rung also loses its recommendation tier slot in p02-t02. Adjust the
  expected counts down from 17 catalogued / 16 recommended rather than forcing
  those numbers.
- If `claude-opus-4-8[effort=xhigh]` fails, the cyber-sensitive Cursor route stays
  unmaterializable and `provider-cursor.md` must say so plainly instead of naming a
  route that cannot be dispatched.

## Notes

_(Anything surprising: rejected syntax, UI discrepancies, differences between the
agent picker and the run record.)_
