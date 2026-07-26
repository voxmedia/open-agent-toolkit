---
title: Verifying Cursor Pins
description: 'Runbook for probe-verifying a Cursor model pin before shipping it: evidence channel, hook capture, subjects and controls, interpretation, and cleanup.'
---

# Verifying Cursor Pins

A Cursor model pin maps an OAT ladder model ID to the frontmatter selector that
materialized role files carry, for example `claude-opus-5-thinking-medium` to
`claude-opus-5[effort=medium]`. Adding one to
`packages/cli/src/providers/cursor/codec/catalog.ts` requires evidence that
Cursor actually resolves that selector to the intended model.

This runbook produces that evidence. Run it before adding any mapping.

## Why a probe is required

`DR-260718-explicit-cursor-pin-mapping` requires mapping-specific,
native-launch evidence before a mapping may be marked `approved`. Two things
that look like evidence are not:

- **Structural validation.** That a mapping is well-formed says nothing about
  what Cursor does with it.
- **Agent self-report.** A subagent asked to name its own model is not a
  reliable witness, and the probe agents in this runbook deliberately do not
  ask.

The catalog alone is also insufficient wherever a family carries both a
thinking and a non-thinking flat ID at the same rung. Opus 5 carries both at
low, medium, and high, so the bracket selector is genuinely ambiguous there and
only a probe can resolve it. At rungs where only one variant exists, the
catalog settles the question without a probe — but you still need the probe to
prove the effort parameter was honored at all.

## Evidence channel

Cursor's agent lifecycle hooks report resolution from Cursor itself. Two
independent events agree:

- `subagentStart.subagent_model` — the model the subagent will use, and the
  authoritative field per Cursor's hooks reference.
- `preToolUse.model` — observed from inside the subagent's own tool call.

Two channels that do **not** work:

- **The `cursor-agent` CLI and remote runtime.** Agent lifecycle hooks do not
  fire there. A Task subagent launched from that runtime produces zero hook
  events, and every row records as not-reported. Run probes from the Cursor
  desktop app's Agent Chat.
- **The subagent card label.** It is built from the requested bracket
  parameters and drops the thinking qualifier, so it cannot distinguish the
  thinking and non-thinking variants — precisely the distinction a probe exists
  to settle.

As of Cursor 3.12.30, `model_params` (which would carry an explicit `thinking`
flag) is empty and `model_id` is absent. Thinking is therefore established by
the resolved slug itself, which is sound because the non-thinking IDs are
distinct.

## Prerequisites

- Cursor desktop app, with the repository open as a workspace.
- The live catalog for the families you intend to pin:

```bash
cursor-agent models
```

Read the full output rather than truncating it. You need to see whether a
thinking and a non-thinking ID both exist at each rung, and which rung carries
the family's unqualified display label.

## Setting up capture

Both files are temporary. Delete them when the probe is done.

Create `.cursor/hooks/g01-capture.sh`:

```bash
#!/bin/bash
# TEMPORARY pin-probe capture hook. Delete after probing.
set -u

OUT_DIR="/tmp/g01-probe"
OUT="$OUT_DIR/hooks.jsonl"
mkdir -p "$OUT_DIR" 2>/dev/null || :

input=$(cat)
ts=$(date -u '+%Y-%m-%dT%H:%M:%SZ')

printf '{"captured_at":"%s","payload":%s}\n' "$ts" "$input" >>"$OUT" 2>/dev/null || :

event=$(printf '%s' "$input" |
  sed -n 's/.*"hook_event_name"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')

# Observe only. Never block, never fail closed.
case "$event" in
  subagentStop) printf '{}\n' ;;
  *) printf '{"permission":"allow"}\n' ;;
esac

exit 0
```

Make it executable, then register it in `.cursor/hooks.json` for
`subagentStart`, `subagentStop`, and `preToolUse`:

```json
{
  "version": 1,
  "hooks": {
    "subagentStart": [
      { "command": ".cursor/hooks/g01-capture.sh", "timeout": 10 }
    ],
    "subagentStop": [
      { "command": ".cursor/hooks/g01-capture.sh", "timeout": 10 }
    ],
    "preToolUse": [{ "command": ".cursor/hooks/g01-capture.sh", "timeout": 10 }]
  }
}
```

The hook must observe only. A capture hook that can block or fail closed can
change the behavior it is supposed to measure.

Restart Cursor or reload the window so the hooks register.

## Writing probe agents

One throwaway agent per selector, under `.cursor/agents/`. Keep them trivial:
the probe is the hook payload, not anything the agent produces.

```markdown
---
# TEMPORARY pin probe - not oat-managed. Delete after probing.
# Class: subject - expect claude-opus-5-thinking-medium
name: zz-pin-probe-opus5-medium
description: Temporary pin probe (subject) for claude-opus-5[effort=medium]. Delete after use.
model: claude-opus-5[effort=medium]
---

## Role

You are a throwaway pin probe. Run exactly one command and then stop:
```

echo PIN-PROBE zz-pin-probe-opus5-medium

```

Then reply with the single word `done`. Do not read files or use any
other tool.

Cursor's hook payload is the evidence for this probe. Your own claim about
your identity is not evidence and is deliberately not requested.
```

The `echo` exists to force a tool call, which is what produces the
corroborating `preToolUse` event.

### Subjects and controls

Probe every rung you intend to pin. Then add controls, which are what make the
subject results interpretable:

| Class            | Example selector               | Proves                                                           |
| ---------------- | ------------------------------ | ---------------------------------------------------------------- |
| Subject          | `claude-opus-5[effort=medium]` | The mapping resolves as intended                                 |
| Positive control | `claude-sonnet-5[effort=high]` | Reproduces an already-verified mapping                           |
| Negative control | `claude-opus-9[effort=high]`   | Unknown family — the channel reports resolution, not the request |
| Negative control | `claude-opus-5[effort=ultra]`  | Unknown effort — exposes rung-level fallback                     |

The negative controls carry most of the interpretive weight. Without them you
cannot distinguish a hook that reports what Cursor actually resolved from one
that merely echoes what you asked for. A bogus family that comes back as the
bogus family would invalidate the entire run.

## Running

Launch each probe agent from the Cursor desktop app's Agent Chat, as a subagent
with no model override, so Cursor resolves from the agent's frontmatter. Let
each finish before starting the next.

Then read the resolutions:

```bash
python3 - <<'PY'
import json
for line in open('/tmp/g01-probe/hooks.jsonl'):
    p = json.loads(line).get('payload', {})
    if p.get('hook_event_name') == 'subagentStart':
        print(p.get('subagent_name'), '->', p.get('subagent_model'))
PY
```

## Interpreting results

### Unresolvable components fall back silently

Cursor does not reject a malformed pin. It substitutes a default for whichever
component it cannot resolve, with no error or warning:

- An unknown **family** falls back to the account default model. Probing
  `claude-opus-9[effort=high]` resolved to `cursor-grok-4.5-high-fast`.
- An unknown **effort** falls back to that family's default rung. Probing
  `claude-opus-5[effort=ultra]` resolved to `claude-opus-5-thinking-high`.

This makes a typo in a selector more dangerous than a plain downgrade: the pin
silently tracks whatever Cursor currently designates as the default, so a
vendor-side change alters capability with no change in this repository.

### The default rung is family-specific

Exactly one rung per family carries an unqualified display label in the live
catalog, and that marks the default. It is not always `high`:

| Family   | Default rung | Unqualified label | Contrast                 |
| -------- | ------------ | ----------------- | ------------------------ |
| Opus 5   | high         | `Opus 5 1M`       | `Opus 5 1M Medium`       |
| Opus 4.8 | high         | `Opus 4.8 1M`     | `Opus 4.8 1M Extra High` |
| Opus 4.7 | **xhigh**    | `Opus 4.7 1M`     | `Opus 4.7 1M High`       |

Opus 4.7 is the disconfirming case for a naive "high is always the default"
reading.

### A default-rung result proves nothing on its own

If the rung you requested happens to be the family default, the observation is
equally consistent with the effort parameter being honored and with it being
ignored. That row cannot stand alone.

Always probe at least one non-default rung in the same family. A set of
non-default rungs that each resolve as requested is what demonstrates the
parameter is genuinely honored; a default-rung row is then sound by inference
across the set rather than from its own evidence.

## Recording the result

Add the mapping with a probe record, which ties it to the evidence that
approved it:

```ts
approvedMapping(
  'claude-opus-5-thinking-medium',
  'claude-opus-5[effort=medium]',
  'claude-effort',
  { probeName: 'zz-pin-probe-opus5-medium', verifiedAt: '2026-07-25', evidencePath: '...' },
),
```

The record asserts that `submittedSelector` equals the mapping's
`frontmatterModel` and `resolvedModel` equals its `ladderModelId`. A mapping
edited later without re-probing therefore fails its own consistency test rather
than inheriting an approval that never covered the new selector.

Retain the raw payloads alongside the summary. They are the primary evidence;
the summary is an interpretation of them.

## Cleanup

Delete every temporary artifact:

- `.cursor/hooks.json` and `.cursor/hooks/g01-capture.sh`
- all `zz-pin-probe-*` agent files
- the capture file under `/tmp`

Before committing retained payloads, redact machine and identity fields.
Cursor hook payloads carry `user_email`, `workspace_roots`, and an absolute
`transcript_path`. None carries probe evidence — resolution is read from
`subagent_model` — so removing them costs nothing and keeps private data out of
the repository.

Confirm the workspace is clean:

```bash
oat sync --scope project
```

## Related

- [Smoke Testing](smoke-testing.md) - Runbook for the live workflow smoke runner.
- [Dispatch Policy](../workflows/projects/dispatch-ceiling.md) - How pins reach the recommendation and role files.
- [Provider Sync](../provider-sync/providers.md) - Provider-specific sync behavior.
