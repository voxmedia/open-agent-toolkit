# NOTICES

This file records attribution for externally-sourced prose incorporated
into this repository. When you adapt or lift prose from an external
project into a skill, template, or doc, add an entry here — do not
add attribution footers to the skill files themselves.

## Obra Superpowers

**Source:** https://github.com/obra/superpowers
**License:** MIT
**Version referenced:** 5.0.7

### `brainstorming` skill

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

Source files: `skills/brainstorming/scripts/{server.cjs, start-server.sh,
  stop-server.sh, frame-template.html, helper.js}` and
`skills/brainstorming/visual-companion.md`.

Files lifted into OAT (under `.agents/skills/oat-brainstorm/`):

- `scripts/server.cjs`, `scripts/stop-server.sh`, `scripts/frame-template.html`,
  `scripts/helper.js` — verbatim from upstream.
- `scripts/start-server.sh` — verbatim except for default persistence-path
  changes (`.superpowers/brainstorm/` → OAT-managed prefixes:
  `<project>/.oat/brainstorm/`, `<repo-root>/.oat/brainstorm/`,
  `~/.oat/brainstorm/`).
- `references/visual-companion.md` — adapted prose: persistence paths and
  example invocations updated to OAT conventions.

Consumer OAT skills: `oat-brainstorm`.

The MIT license does not require in-derived-work attribution notices;
this record is kept for transparency and to make the provenance
discoverable without reading the `oat-project-design` history.
