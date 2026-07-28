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

### Upstream MIT license

```text
MIT License

Copyright (c) 2025 Jesse Vincent

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

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

## shadcn/improve

**Source:** https://github.com/shadcn/improve/tree/main/skills/improve
**License:** MIT
**Version referenced:** `main` (retrieved 2026-07-12)

### `improve` skill

Source files: `skills/improve/SKILL.md` and
`skills/improve/references/{audit-playbook.md,closing-the-loop.md,plan-template.md}`.

Files copied into `.agents/skills/oat-repo-improve/`; the skill identifier,
heading, invocation examples, and generated-plan attribution were renamed for
the OAT repository namespace.

### Upstream MIT license

```text
MIT License

Copyright (c) 2026 shadcn

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## visual-explainer

**Source:** `visual-explainer` plugin by nicobailon
**License:** MIT
**Version referenced:** 0.8.1

### Explainer templates and render QA

Visual presentation and QA patterns were adapted into
`.agents/skills/explainer-kit/`, including self-contained HTML shells,
responsive navigation, slide-deck interaction and print behavior, overflow
containment, reduced-motion handling, and structural/render checks.

The OAT implementation replaces upstream branding, destinations, invocation
commands, and example content with destination-neutral contracts, themes,
templates, and fixtures. Consumer OAT skill: `explainer-kit`.

### Upstream MIT license

```text
MIT License

Copyright (c) 2025 Nico Bailon

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
