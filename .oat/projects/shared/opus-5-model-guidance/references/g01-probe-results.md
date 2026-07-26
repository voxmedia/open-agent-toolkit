---
oat_generated: false
oat_status: complete
---

# G01 Pin Probe Results

**Status:** COMPLETE — all six subjects pass. Raw payloads preserved at
`g01-probe-hooks.jsonl` (40 events).

Three fields in those payloads were redacted before commit: `user_email`,
`workspace_roots`, and the machine portion of `transcript_path`. None carries
probe evidence — resolution is read from `subagent_model` — and all 40 events,
including both negative-control fallbacks, are otherwise intact.

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

The subagent card label was also ruled out as a channel. It cannot distinguish
thinking from non-thinking: the card renders `Opus 5 Extra High` even though the
catalog carries only `claude-opus-5-thinking-xhigh` at that rung and displays it
as `Opus 5 1M Extra High Thinking`. The label is built from the requested
bracket parameters and drops the thinking qualifier.

## Evidence channel

Project hooks at `.cursor/hooks.json` invoked `.cursor/hooks/g01-capture.sh`,
appending every raw payload to `/tmp/g01-probe/hooks.jsonl`.

Two independent hook events agree on every row:

- `subagentStart.subagent_model` — "Model the subagent will use", the
  authoritative field per Cursor's hooks reference.
- `preToolUse.model` — captured from inside each subagent's own tool call.

`model_params` (which would carry an explicit `thinking` flag) was empty in
Cursor 3.12.30, and `model_id` was absent. Thinking is therefore established by
the resolved slug itself, which is sound: the catalog carries distinct
non-thinking IDs at low, medium, and high, and none were selected.

## Why the catalog alone was insufficient

The live catalog (`cursor-agent models`) carries both a thinking and a
non-thinking flat ID at low, medium, and high:

| Rung   | Non-thinking ID        | Thinking ID                     | Resolved to |
| ------ | ---------------------- | ------------------------------- | ----------- |
| low    | `claude-opus-5-low`    | `claude-opus-5-thinking-low`    | thinking    |
| medium | `claude-opus-5-medium` | `claude-opus-5-thinking-medium` | thinking    |
| high   | `claude-opus-5-high`   | `claude-opus-5-thinking-high`   | thinking    |
| xhigh  | _none_                 | `claude-opus-5-thinking-xhigh`  | thinking    |
| max    | _none_                 | `claude-opus-5-thinking-max`    | thinking    |

xhigh and max were unambiguous from the catalog alone. Low, medium, and high
required the probe, and all three resolved to the thinking variant.

## Subjects

| Probe agent                 | Bracket form submitted          | Expected                         | `subagent_model` observed        | Verdict |
| --------------------------- | ------------------------------- | -------------------------------- | -------------------------------- | ------- |
| `zz-pin-probe-opus5-low`    | `claude-opus-5[effort=low]`     | `claude-opus-5-thinking-low`     | `claude-opus-5-thinking-low`     | pass    |
| `zz-pin-probe-opus5-medium` | `claude-opus-5[effort=medium]`  | `claude-opus-5-thinking-medium`  | `claude-opus-5-thinking-medium`  | pass    |
| `zz-pin-probe-opus5-high`   | `claude-opus-5[effort=high]`    | `claude-opus-5-thinking-high`    | `claude-opus-5-thinking-high`    | pass    |
| `zz-pin-probe-opus5-xhigh`  | `claude-opus-5[effort=xhigh]`   | `claude-opus-5-thinking-xhigh`   | `claude-opus-5-thinking-xhigh`   | pass    |
| `zz-pin-probe-opus5-max`    | `claude-opus-5[effort=max]`     | `claude-opus-5-thinking-max`     | `claude-opus-5-thinking-max`     | pass    |
| `zz-pin-probe-opus48-xhigh` | `claude-opus-4-8[effort=xhigh]` | `claude-opus-4-8-thinking-xhigh` | `claude-opus-4-8-thinking-xhigh` | pass    |

All ten subagents reported `status: completed`.

## Controls

Controls exist because six subjects all reporting their intended model would be
equally consistent with a hook that reports true resolution and a hook that
merely echoes the request.

| Probe agent                     | Bracket form                   | Observed                        | Outcome                                                                                                                                                                                    |
| ------------------------------- | ------------------------------ | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `zz-pin-probe-ctl-sonnet-high`  | `claude-sonnet-5[effort=high]` | `claude-sonnet-5-thinking-high` | Reproduces the prior project's hook-verified result. Harness validated.                                                                                                                    |
| `zz-pin-probe-ctl-bogus-family` | `claude-opus-9[effort=high]`   | `cursor-grok-4.5-high-fast`     | **Decisive.** A nonexistent family silently resolved to an unrelated model with no error. An echoing channel would have reported `claude-opus-9`. Proves the hook reports true resolution. |
| `zz-pin-probe-ctl-bogus-effort` | `claude-opus-5[effort=ultra]`  | `claude-opus-5-thinking-high`   | **Defect found.** An invalid effort rung falls back to the family default rung rather than erroring.                                                                                       |
| `zz-pin-probe-ctl-fable-xhigh`  | `claude-fable-5[effort=xhigh]` | `claude-fable-5-thinking-xhigh` | Premise was wrong; see below.                                                                                                                                                              |

### Correction: the Fable control premise

This control was designed on the assumption that Fable is entitlement-blocked
for this account, because every Fable catalog entry is tagged `(NO ZDR)` and the
org runs `privacyMode=2`. An earlier run on the `opus-5-sa-test` branch had
shown a Fable pin falling back to `gpt-5.6-terra-medium`.

That assumption was incorrect. Fable resolved cleanly here, so the earlier
fallback had a different and still-unidentified cause.

The gate rule originally written into this file — that a Fable-resolving control
voids the channel — rested on that bad premise and is withdrawn. The purpose it
served, discriminating echo from resolution, is satisfied decisively and
independently by `ctl-bogus-family`.

## Gate rule (as applied)

The channel is trustworthy: `ctl-bogus-family` demonstrates it reports
resolution rather than the request, and `ctl-sonnet-high` reproduces a
previously verified result. All six subject rows are `pass` and are promoted to
`disposition: 'approved'` mappings.

## Findings carried forward

### 1. Unresolvable selector components fall back to defaults, silently

Both negative controls exhibit one mechanism rather than two. Cursor does not
reject a malformed pin; it substitutes a default for the component it cannot
resolve, with no error or warning.

- Unknown family → default model. `claude-opus-9[effort=high]` resolved to
  `cursor-grok-4.5-high-fast`.
- Unknown effort → family default rung. `claude-opus-5[effort=ultra]` resolved
  to `claude-opus-5-thinking-high`.

The default rung is family-specific. In the live catalog exactly one rung per
family carries an unqualified display label, which marks it as the default:

| Family   | Default rung | Unqualified label | Contrast                 |
| -------- | ------------ | ----------------- | ------------------------ |
| Opus 5   | high         | `Opus 5 1M`       | `Opus 5 1M Medium`       |
| Opus 4.8 | high         | `Opus 4.8 1M`     | `Opus 4.8 1M Extra High` |
| Sonnet 5 | high         | `Sonnet 5 1M`     | `Sonnet 5 1M Max`        |
| Fable 5  | high         | `Fable 5 1M`      | `Fable 5 1M Extra High`  |
| Opus 4.7 | **xhigh**    | `Opus 4.7 1M`     | `Opus 4.7 1M High`       |

Opus 4.7 is the disconfirming case for a naive "high is always the default"
reading, and confirms the label rule instead.

Backlog candidate: validate effort values against the known rung set at sync
time so a typo fails loudly rather than tracking a vendor-side default.

### 2. The `high` subject row is individually confounded

Because `high` is the Opus 5 default rung, the observation
`claude-opus-5[effort=high]` → `claude-opus-5-thinking-high` is equally
consistent with the effort parameter being honored and with it being ignored in
favor of the default. That row cannot stand on its own evidence.

It is rescued by its neighbors: `low`, `medium`, `xhigh`, and `max` each
resolved to their requested non-default rungs, which demonstrates the effort
parameter is genuinely honored for this family. The mapping is therefore sound,
but by inference across the rung set rather than from its own row.

General rule for future probes: always verify at least one non-default rung per
family, or a default-rung result proves nothing about the selector.

### 3. Fable fallback on `opus-5-sa-test` is unexplained

Not reproduced by this run; Fable resolved normally here.

## Environment

- **Probed at:** 2026-07-25T22:03:32Z
- **Cursor version:** 3.12.30
- **Runtime:** Cursor desktop Agent Chat, Task-tool subagents, no model override
- **Account:** thomas.stang@voxmedia.com
- **Events captured:** 10 `subagentStart`, 10 `subagentStop`, 20 `preToolUse`
