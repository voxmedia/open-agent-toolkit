---
title: Explainer Kit
description: 'Generate one source-grounded visual explainer directly or from OAT lifecycle artifacts.'
---

# Explainer Kit

Explainer Kit turns approved source material into one standalone visual
explainer. The host agent writes the page; the kit prepares evidence and checks
that the result stays faithful to it.

The public explainer family has two layers:

- `explainer-kit` is the destination-neutral core. It reads only explicit
  inputs and never reads OAT, user, vault, or destination configuration.
- `oat-explainer-kit` adapts OAT projects and programs to the core. It resolves
  lifecycle intent, approved artifacts, theme defaults, and canonical output
  roots.

## The generation flow

Every run follows the same five stages:

1. **Bundle** — collect allowlisted inputs into a cited fact base and bounded
   anchor ledger, and resolve the recipe and theme.
2. **Author** — the host agent reads the recipe brief, fact base, ledger,
   theme, and recipe shell, then writes exactly one standalone
   `site/index.html`.
3. **Verify** — run browser-free safety and traceability checks plus the
   highest available browser rung.
4. **Record** — write the terminal manifest and freeze the package.
5. **Consume** — return the run path, run ID, and outcome to the caller.

If bundling reports `reuse: true`, the caller returns that already-satisfied
package without authoring or recording it again. Nothing may write into a run
root after recording.

## Recipes and required narratives

The core ships four recipes. Each produces one HTML page from one recipe shell.

| Recipe              | Intended use                               | Required narrative                                               |
| ------------------- | ------------------------------------------ | ---------------------------------------------------------------- |
| `project-explainer` | Working explanation after project planning | architecture, decisions, risks, phases, and validation           |
| `project-recap`     | Final implementation recap                 | outcome, architecture, decisions, validation, changes, follow-up |
| `program-recap`     | Bird's-eye view of a multi-wave program    | wave map, outcomes, conventions, metrics, and follow-up          |
| `engineer-tour`     | Engineer-facing orientation to a codebase  | orientation, architecture, flow, key code, and validation        |

Recipe briefs carry the audience, voice, section intent, and depth
expectations. The author preserves every recipe-required section ID, uses only
the supplied source material, and keeps CSS and approved scripts inline.
External requests are not allowed.

## Direct core usage

Choose one recipe and exactly one input mode:

```bash
node scripts/bundle.mjs \
  --recipe project-recap \
  --project /path/to/project \
  --theme /path/to/theme.resolved.json \
  --out /path/to/run-root
```

Supported input modes are:

- `--project <dir>` for a project recap or project explainer;
- `--program <artifact> --summaries <dir> --archive <dir>` for a program
  recap;
- `--inputs <file|dir>...` for ordinary documents; or
- `--fact-base <path>` for an already-supplied fact base.

Bundling fails before authoring if an input escapes its declared root or if
different inputs resolve to the same document locator.

After the host agent authors `site/index.html`, verify and record it:

```bash
node scripts/verify.mjs \
  --run-root /path/to/run-root \
  --recipe project-recap

node scripts/record.mjs \
  --run-root /path/to/run-root \
  --recipe project-recap \
  --slug project-recap \
  --mode interactive \
  --theme /path/to/run-root/theme.resolved.json
```

Direct front-door runs record as `interactive`; OAT lifecycle callers use
`unattended`.

Always pass `--recipe`, `--theme`, and `--out` to the bundle stage. Direct
callers choose their output root; OAT callers use the adapter's canonical
project or repository path.

## OAT lifecycle callers

The adapter binds lifecycle artifacts to recipe source roles and runs the same
flow in unattended mode:

- Planning can generate `project-explainer` after plan review, the configured
  plan gate, and the plan commit.
- Implementation closeout can generate `project-recap` after final review and
  configured pre-approval steps but before final approval.
- Project completion can reuse or generate the final recap before lifecycle
  mutation and pass a selected satisfied package to archive.
- Wave program and execution closeout can generate `program-recap` from the
  reconciled program artifact and selected wave summaries.

Lifecycle generation never prompts. A persisted skip ends the flow before
manifest discovery, bundling, or authoring. A persisted generate decision
reuses a fresh satisfied package when one exists.

If a run is `failed` or `incomplete`, interactive completion requires an
explicit retry or skip. Autonomous closeout retries once; if the retry is also
unsatisfied, it persists `skip/failed_attempt`, re-reads that decision, and
continues without another generation pass.

Project explainer and project recap preferences resolve independently from
`workflow.explainers.projectExplainer` and
`workflow.explainers.projectRecap`. Each accepts `always`, `ask`, or `never`;
the built-in default is `ask`. A valid project decision already persisted in
`state.md` has higher precedence.

## Verification ladder

Verification always runs browser-free checks for:

- standalone HTML structure and external assets;
- excessive source copying;
- recipe-required narrative sections;
- shell-script integrity;
- ledger-to-page claim coverage; and
- page-to-ledger claim traceability.

The browser ladder uses the first available rung:

1. host browser capture and inspection at 320, 768, and 1440 pixels;
2. the bundled Playwright probe; or
3. the browser-free `none` rung.

Browser evidence is bound to the exact artifact hash. A missing browser does
not discard otherwise usable output; it records a review-needed outcome.

## Run package

Before recording, the run root contains:

- `source/fact-base.json` and `source/fact-base.md`;
- `source/ledger.json`;
- `theme.resolved.json`;
- the authored `site/index.html`; and
- verification output under `qa/`, including `qa/result.json`, which records
  the browser rung and visual-check results.

Recording adds `manifest.json` with schema
`explainer-kit.manifest/v2`. The manifest is an exact inventory of the
completed package and carries the run ID, recipe, source hashes, warnings, and
outcome.

The project archive command may copy one selected satisfied project recap into
the tracked reference export. That archive export is the durable completion
copy; generation itself does not publish or create a separate durability
record.

## Outcomes

| Outcome              | Meaning                                                                  |
| -------------------- | ------------------------------------------------------------------------ |
| `built`              | Browser and visual checks passed                                         |
| `built-needs-review` | The page is usable, but the browser rung was unavailable or found issues |
| `failed`             | Generation or verification failed                                        |
| `incomplete`         | The package did not reach a terminal satisfied build                     |

`built` and `built-needs-review` satisfy generate intent.
`built-needs-review` is also a valid archive candidate when the complete
package guard and freshness checks pass; it remains visible in summaries as
needing a human look. `failed` and `incomplete` do not satisfy generation.

## Installation boundary

The core belongs to the `utility` tool pack and the OAT adapter belongs to
`workflows`. Install the core before using the adapter:

```bash
oat tools install utility --scope user
oat tools install workflows
```

The adapter checks the installed canonical core path and compatible version
before reading OAT configuration. It never falls back to a source checkout.

## explainer-kit

**Invocation:** Ask, “Use explainer-kit with the engineer-tour recipe,
`--inputs docs/architecture.md src/api`, and `--out explainers/api-tour`.”
Replace the paths with sources you own. This is an agent instruction, not a
shell command; providers may use `/explainer-kit`, and Codex uses
`$explainer-kit`. The core requires explicit inputs and an output destination:
choose one source mode, `--project`, `--inputs`, or `--fact-base`, rather than
relying on an OAT active-project pointer.

**Prerequisites:** The installed canonical core, accessible inputs, a recipe,
and a writable output destination. An existing OAT project is not required.
If you supply a fact base, it must contain the evidence the explainer needs;
the renderer is not a substitute for missing research. Theme selection is
resolved before the artifact bundle is materialized.

**Example scenario:** A teammate will take over an API module next week. Give
the skill the architecture document and relevant source directory so it can
produce an engineer tour with source-backed explanations of the main flows.
Choose an output folder you can review before sharing; generating an HTML
file is not permission to publish it.

**Expected output:** A self-contained HTML explainer and its supporting fact
base, claim ledger, resolved theme, and verification record. Inspect the
verification outcome, not just whether the file opens. `built` means the
browser and visual checks passed; `built-needs-review` means
the usable artifact still needs review. Missing visual capability or a
failed verification must not be reported as a visual pass.

**Next step:** Review the content and available verification evidence, resolve
remaining issues, then share the artifact through an explicitly chosen
channel. For OAT artifact binding and repository defaults, use the adapter
below rather than making the core infer local configuration.

## oat-explainer-kit

**Invocation:** Ask, “Use oat-explainer-kit to generate a project explainer
from this project's approved planning artifacts.” Use the skill by name,
`/oat-explainer-kit`, or Codex's `$oat-explainer-kit`; this request is not a
terminal command or a promise of a particular CLI flag.

**Prerequisites:** The installed compatible `explainer-kit` core and accessible
OAT sources. Project-bound recipes require the relevant existing project and
its artifacts. Repository-bound or explicitly supplied fact-base usage does
not universally require an active project. The adapter's project
applicability is therefore conditional, not a blanket prerequisite for all
of its entry points.

**Example scenario:** A project has approved planning artifacts, and you need
to explain the chosen scope and approach to a teammate before implementation
starts. Let the adapter bind those OAT artifacts and repository defaults,
then use the core to generate the explainer. Do not ask it to present planned
capabilities as already shipped.

The adapter checks the installed core before resolving OAT configuration.
It owns source binding, intent, output placement, and defaults; the core owns
the reusable artifact-generation pipeline. This boundary keeps a project
explainer grounded in its planning evidence and a recap grounded in its
actual implementation evidence rather than treating the two as equivalent.

**Expected output:** The core explainer bundle in the OAT-resolved project or
repository destination, with its verification outcome preserved. A lifecycle
call can produce it without an interactive prompt, but unattended generation
does not erase missing evidence or upgrade a needs-review outcome.

**Next step:** Inspect the explainer and verification record, then return to
the relevant planning, implementation, or closeout workflow. An explainer
helps communicate a decision or outcome; it does not itself approve a plan,
complete a project, or publish a recap.
