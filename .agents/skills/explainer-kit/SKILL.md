---
name: explainer-kit
description: Use when building destination-neutral visual explainer artifacts from explicit, versioned inputs.
user-invocable: true
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, Agent, mcp__*
metadata:
  version: 3.0.0
---

# Explainer Kit

Build one destination-neutral visual explainer from explicit inputs without
reading OAT, user, vault, or destination configuration.

## Responsibilities

- Collect only allowlisted inputs and create a cited fact base plus bounded
  anchor ledger.
- Give the host agent the selected recipe brief, authoring mechanics, theme,
  and one recipe shell.
- Verify required sections, source discipline, script safety, and both
  directions of machine-checkable claim traceability.
- Use the highest available browser rung without blocking browser-less hosts.
- Record one exact-inventory `explainer-kit.manifest/v2` run package.

## Asset Resolution

Resolve schemas, recipes, templates, scripts, and references relative to this
installed skill directory. Never resolve runtime assets from a source checkout
or from absolute operator-specific paths.

## Run

Choose one recipe and one input mode, then prepare the run:

```bash
node scripts/bundle.mjs \
  --recipe project-recap \
  --project /path/to/project \
  --theme /path/to/theme.resolved.json \
  --out /path/to/run-root
```

Use exactly one of the supported input modes:

- `--project <dir>` for a project recap or project explainer;
- `--program <artifact> --summaries <dir> --archive <dir>` for a program
  recap;
- `--inputs <file|dir>...` for documents; or
- `--fact-base <path>` for a supplied fact base.

### Front door

When a person invokes this skill directly, ask them to name the recipe, choose
`--out <dir>`, and provide exactly one direct input mode:

- `--project <dir>` for an OAT project;
- `--inputs <file|dir>...` for documents; or
- `--fact-base <path>` for a prepared fact base.

Run from the installed skill directory. If the person does not supply a
resolved theme, materialize the deterministic `clean-neutral` default before
bundling:

```bash
node --input-type=module --eval '
  import { writeFile } from "node:fs/promises";
  import { resolveTheme } from "./scripts/lib/theme.mjs";
  const { theme } = await resolveTheme({ style: "clean-neutral" });
  await writeFile(process.argv[1], `${JSON.stringify(theme, null, 2)}\n`);
' /path/to/theme.resolved.json
```

Pass that file as `--theme /path/to/theme.resolved.json`. After bundling,
propose the bounded input scope and show a concise summary of the prepared fact
base so the person can correct the scope or source facts before authoring. This
is a lightweight interactive confirmation, not a project gate or approval
workflow.

Always pass `--recipe`, `--theme`, and `--out`. `bundle.mjs` writes
`source/fact-base.json`, `source/fact-base.md`, `source/ledger.json`, and
`theme.resolved.json`. If it reports `reuse: true`, return the existing
satisfied run without changing it.

The host agent then reads the selected recipe's `floor[0].briefRef`,
`references/recap-authoring.md`, the fact base, anchor ledger, and resolved
theme. Copy the recipe's shell from `templates/` and author exactly one
standalone `site/index.html`. Preserve every required narrative section ID,
keep all CSS and approved scripts inline, make no external requests, and spell
every machine-checkable fact as the fact base spells it. Unattended runs never
prompt.

Run browser-free verification and the highest available browser rung. Record a
direct front-door run as interactive:

```bash
node scripts/verify.mjs --run-root /path/to/run-root --recipe project-recap
node scripts/record.mjs \
  --run-root /path/to/run-root \
  --recipe project-recap \
  --slug project-recap \
  --mode interactive \
  --theme /path/to/run-root/theme.resolved.json
```

Lifecycle callers use `--mode unattended` instead and never prompt.

The ladder is host browser capture and inspection, then the bundled Playwright
probe, then the browser-free `none` rung. Host evidence uses 320, 768, and 1440
pixel screenshots bound to the exact artifact hash and an explicit visual
verdict. Browser-free structure, source-dumping, shell-script, ledger-to-page,
and page-to-ledger checks run at every rung.

`record.mjs` writes `explainer-kit.manifest/v2`. `built` means browser and
visual checks passed. `built-needs-review` is a usable artifact whose browser
rung was unavailable or found issues. `failed` and `incomplete` do not satisfy
generation. Do not write into the run root after recording.

## Progress Indicators

For interactive runs, show a concise banner and stage updates:

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EXPLAINER KIT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Report bundle, authoring, verification, browser rung, recording, and outcome
stages as they begin and complete. Keep unattended output structured and
non-interactive.
