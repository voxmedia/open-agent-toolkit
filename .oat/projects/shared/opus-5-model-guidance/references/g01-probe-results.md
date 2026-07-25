---
oat_generated: false
oat_status: pending
---

# G01 Pin Probe Results

**Status:** PENDING — awaiting an operator probe run from the Cursor desktop app.

## Why this file exists

`DR-260718-explicit-cursor-pin-mapping` requires mapping-specific, native-launch
evidence before a Cursor pin mapping may be marked `approved`. Structural
validation is not evidence, and neither is an agent's claim about its own
identity. This file records what Cursor itself reported.

## Why the first run failed

The first attempt ran through the `cursor-agent` CLI / remote runtime. Agent
lifecycle hooks do not fire there, so no resolved model was ever emitted and
every row recorded `not-reported`. This was re-tested and confirmed: a Task
subagent launched from that runtime produced zero hook events.

A second channel was also ruled out. Cursor's subagent card label cannot
distinguish thinking from non-thinking. The card rendered `Opus 5 Extra High`
even though the catalog carries only `claude-opus-5-thinking-xhigh` at that
rung and displays it as `Opus 5 1M Extra High Thinking`. The card label is
built from the requested bracket parameters, so it may echo the request rather
than report the resolution. It is not admissible as identity evidence.

## Evidence channel

Project hooks at `.cursor/hooks.json` invoke `.cursor/hooks/g01-capture.sh`,
which appends every raw payload to `/tmp/g01-probe/hooks.jsonl`.

The authoritative field is `subagentStart.subagent_model` — "Model the subagent
will use", per Cursor's hooks reference. Each probe also runs one `echo`, so
`preToolUse` fires and may additionally carry `model_params` with explicit
`thinking` and `effort` entries.

## Why the catalog alone is insufficient

The live catalog (`cursor-agent models`) carries both a thinking and a
non-thinking flat ID at low, medium, and high:

| Rung   | Non-thinking ID        | Thinking ID                     |
| ------ | ---------------------- | ------------------------------- |
| low    | `claude-opus-5-low`    | `claude-opus-5-thinking-low`    |
| medium | `claude-opus-5-medium` | `claude-opus-5-thinking-medium` |
| high   | `claude-opus-5-high`   | `claude-opus-5-thinking-high`   |
| xhigh  | _none_                 | `claude-opus-5-thinking-xhigh`  |
| max    | _none_                 | `claude-opus-5-thinking-max`    |

xhigh and max are therefore unambiguous. Low, medium, and high are not, and a
wrong guess there ships a role that silently runs non-thinking with no error.

## Subjects

| Probe agent                 | Bracket form submitted          | Expected resolution              | `subagent_model` observed | `thinking` param | Verdict |
| --------------------------- | ------------------------------- | -------------------------------- | ------------------------- | ---------------- | ------- |
| `zz-pin-probe-opus5-low`    | `claude-opus-5[effort=low]`     | `claude-opus-5-thinking-low`     |                           |                  |         |
| `zz-pin-probe-opus5-medium` | `claude-opus-5[effort=medium]`  | `claude-opus-5-thinking-medium`  |                           |                  |         |
| `zz-pin-probe-opus5-high`   | `claude-opus-5[effort=high]`    | `claude-opus-5-thinking-high`    |                           |                  |         |
| `zz-pin-probe-opus5-xhigh`  | `claude-opus-5[effort=xhigh]`   | `claude-opus-5-thinking-xhigh`   |                           |                  |         |
| `zz-pin-probe-opus5-max`    | `claude-opus-5[effort=max]`     | `claude-opus-5-thinking-max`     |                           |                  |         |
| `zz-pin-probe-opus48-xhigh` | `claude-opus-4-8[effort=xhigh]` | `claude-opus-4-8-thinking-xhigh` |                           |                  |         |

## Controls

Controls exist because six subjects all reporting their intended model would be
equally consistent with a hook that reports true resolution and a hook that
merely echoes the request. The controls discriminate between those two worlds.

| Probe agent                     | Bracket form                   | Class            | Discriminates                                                                                                                                                                                                                                    |
| ------------------------------- | ------------------------------ | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `zz-pin-probe-ctl-sonnet-high`  | `claude-sonnet-5[effort=high]` | positive control | Reproduces the prior project's hook-verified result `claude-sonnet-5-thinking-high`. Validates the harness itself.                                                                                                                               |
| `zz-pin-probe-ctl-fable-xhigh`  | `claude-fable-5[effort=xhigh]` | negative control | Fable is tagged `(NO ZDR)` and this org runs `privacyMode=2`, so it is entitlement-blocked and previously fell back to `gpt-5.6-terra-medium`. **If the hook reports Fable anyway, the hook echoes the request and the entire channel is void.** |
| `zz-pin-probe-ctl-bogus-family` | `claude-opus-9[effort=high]`   | negative control | Nonexistent family. Distinguishes hard rejection from silent fallback.                                                                                                                                                                           |
| `zz-pin-probe-ctl-bogus-effort` | `claude-opus-5[effort=ultra]`  | negative control | Invalid effort value on a real family. Tests whether an unparseable rung degrades silently.                                                                                                                                                      |

| Probe agent                     | `subagent_model` observed | Behaved as expected? |
| ------------------------------- | ------------------------- | -------------------- |
| `zz-pin-probe-ctl-sonnet-high`  |                           |                      |
| `zz-pin-probe-ctl-fable-xhigh`  |                           |                      |
| `zz-pin-probe-ctl-bogus-family` |                           |                      |
| `zz-pin-probe-ctl-bogus-effort` |                           |                      |

**Verdict values:** `pass` (resolved model matches intent with thinking on) /
`fail-fallback` (silently resolved to another model) / `fail-nonthinking`
(resolved to the non-thinking twin) / `fail-rejected` (definition not accepted).

## Gate rule

The controls gate the subjects. If `ctl-fable-xhigh` reports Fable, or
`ctl-sonnet-high` fails to reproduce `claude-sonnet-5-thinking-high`, the
channel is not trustworthy and **no** subject row may be promoted regardless of
what it reports.

Only `pass` subject rows become mappings. Any dropped rung also loses its
recommendation tier slot; adjust the expected catalog and recommendation counts
downward rather than forcing them.

## Environment

- **Probed at:** _(RFC3339 timestamp)_
- **Cursor version:** _(Cursor > About)_
- **Runtime:** _(must be Cursor desktop Agent Chat; the CLI runtime emits no hooks)_
- **Account plan:** _(plan constraints can force fallback)_

## Notes

_(Anything surprising: rejected syntax, UI discrepancies, differences between
the agent picker and the run record.)_
