# Cursor Opus 5.5 native pin probe

On 2026-09-23, Cursor desktop 3.20.14 ran eight temporary agent definitions with bracket-form `model:` frontmatter. The parent dispatched each agent through `Task`; each agent executed one `Shell` command, `echo PIN-PROBE <agent-name>`, and stopped. The temporary `subagentStart`, `preToolUse`, and `subagentStop` hooks captured Cursor's resolved model. The companion [redacted records](opus55-cursor-pin-probe.jsonl) retain the selector transcribed from each agent file, the native start, shell, and stop model values, timestamps, Cursor version, and the unique shell command. The [redacted native events](opus55-cursor-pin-probe-events.jsonl) retain all 32 lifecycle records in order, with stable pseudonymous call and parent/child session references linking Task, start, Shell, and stop. They omit user identity, filesystem paths, original session and call IDs, and unrelated transcript data from the local raw hook capture.

| Submitted frontmatter selector   | `subagentStart.subagent_model`  | `preToolUse` Shell `model`      | Outcome                 |
| -------------------------------- | ------------------------------- | ------------------------------- | ----------------------- |
| `claude-opus-5-5[effort=low]`    | `claude-opus-5-5-low`           | `claude-opus-5-5-low`           | Approved                |
| `claude-opus-5-5[effort=medium]` | `claude-opus-5-5-medium`        | `claude-opus-5-5-medium`        | Approved                |
| `claude-opus-5-5[effort=high]`   | `claude-opus-5-5-high`          | `claude-opus-5-5-high`          | Approved                |
| `claude-opus-5-5[effort=xhigh]`  | `claude-opus-5-5-xhigh`         | `claude-opus-5-5-xhigh`         | Approved                |
| `claude-opus-5-5[effort=max]`    | `claude-opus-5-5-max`           | `claude-opus-5-5-max`           | Approved                |
| `claude-sonnet-5[effort=high]`   | `claude-sonnet-5-thinking-high` | `claude-sonnet-5-thinking-high` | Positive control        |
| `claude-opus-9[effort=high]`     | `cursor-grok-4.6-high-fast`     | `cursor-grok-4.6-high-fast`     | Unknown-family fallback |
| `claude-opus-5-5[effort=ultra]`  | `claude-opus-5-5-medium`        | `claude-opus-5-5-medium`        | Unknown-effort fallback |

All eight agents produced matching start, shell, and stop identities. The five Opus selectors resolved to distinct expected IDs, including non-default rungs. The Sonnet positive control resolved to `claude-sonnet-5-thinking-high`, correcting the previous catalog entry `claude-sonnet-5-high` for the same submitted selector. The unknown effort fell back to this family's medium rung; the unknown family fell back to the then-current Cursor default. Neither fallback is an approved pin. These observations approve the five listed Opus 5.5 mappings and the corrected Sonnet 5 mapping in this Cursor desktop snapshot. A separate CLI `cursor-agent -p --mode ask --model 'claude-opus-5-5[effort=low]'` call returned `Cannot use this model`; it did not emit native subagent lifecycle events and does not contradict the desktop probe.
