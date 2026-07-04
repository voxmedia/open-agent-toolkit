# NOTICES

This file records attribution for externally-sourced prose incorporated
into this repository. When you adapt or lift prose from an external
project into a skill, template, or doc, add an entry here — do not
add attribution footers to the skill files themselves.

## Obra Superpowers

**Source:** https://github.com/obra/superpowers
**License:** MIT

### `brainstorming` skill

**Version referenced:** 5.0.7

Source file: `skills/brainstorming/SKILL.md`

Passages adapted or lifted verbatim into OAT:

- "Exploring approaches" (4 lines) — used in `oat-project-design` Component 3.5 (approach reaffirmation)
- "Presenting the design" (5 lines) — used in `oat-project-design` Component 4 (section iterator)
- "Design for isolation and clarity" (4 lines) — used as a principle in `oat-project-design`
- Self-review four-check template — used in `oat-project-design` Component 6
- User-review gate phrasing — used in `oat-project-design` Component 7

Consumer OAT skills: `oat-project-design`, `oat-project-quick-start`
(via lightweight-design mode choice inheriting the same prose).

### `brainstorming` skill — visual companion

**Version referenced:** 6.0.3

Source files: `skills/brainstorming/scripts/{server.cjs, start-server.sh,
  stop-server.sh, frame-template.html, helper.js}` and
`skills/brainstorming/visual-companion.md`.

Files adapted into OAT (under `.agents/skills/oat-brainstorm/`) — this is a
security/resilience-parity port from the v6.0.3 tag, not a byte-for-byte
carry-over of any single upstream file:

- `scripts/server.cjs` — v6.0.3 session-key auth (HTTP + WebSocket), sandboxed
  `/files/` serving (no symlinks/dotfiles/traversal), security headers,
  WebSocket max-frame guard, and configurable idle timeout; adapted to OAT's
  `CONTENT_DIR`/`STATE_DIR` layout and existing JSON log events, with
  upstream telemetry/branding hooks omitted.
- `scripts/helper.js`, `scripts/frame-template.html` — v6.0.3 client
  resilience (status pill, exponential-backoff reconnect, paused overlay,
  keyed reload) merged alongside OAT's pre-existing indicator-bar UI (kept,
  not removed, unlike upstream v6.0.3); header rebranded to "OAT Brainstorm".
- `scripts/start-server.sh` — v6.0.3 launcher flags (`--open`,
  `--idle-timeout-minutes`, `umask 077`, per-start server-instance-id,
  Windows-shell handling) merged into OAT's three-tier persistence
  resolution (`--project-dir` → repo walk-up → `~/.oat/brainstorm/`),
  replacing the prior `.superpowers/brainstorm/`-style defaults.
- `scripts/stop-server.sh` — v6.0.3 instance-ID verification before
  signaling a PID, adapted to retain OAT's persistent (non-`/tmp`) session
  directories rather than deleting them.
- `references/visual-companion.md` — adapted prose: session-key URL,
  `--open`, restart/port reuse, idle default, and OAT persistence-path
  examples.

Consumer OAT skills: `oat-brainstorm`.

The MIT license does not require in-derived-work attribution notices;
this record is kept for transparency and to make the provenance
discoverable without reading the `oat-project-design` history.
