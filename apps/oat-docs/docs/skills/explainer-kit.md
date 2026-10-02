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

**Invocation:** `/explainer-kit` is the reliable way to start it (Codex:
`$explainer-kit`); asking for the skill by name usually works too. Then give
it a recipe, inputs, and an output folder, for example: “Use explainer-kit
with the engineer-tour recipe,
`--inputs /abs/path/docs/architecture.md /abs/path/docs/api-flows.md`, and
`--out /abs/path/explainers/api-tour`.” Use absolute paths: the core's
scripts run from the installed skill directory, so a relative path would
resolve there instead of in your repository. This is an agent instruction,
not a shell command. The core requires explicit inputs and an output
destination: choose one source mode, `--project`, `--inputs`, or
`--fact-base`, rather than relying on an OAT active-project pointer.

**Prerequisites:** Node.js on your PATH (every stage runs the bundled `.mjs`
scripts) and the core installed from the `utility` tool pack
(`oat tools install utility --scope user`), plus accessible inputs, a
recipe, and a writable output destination. Needs an active OAT project: no.
`--inputs` reads only `.md`, `.txt`, `.html`, and `.json` files; any other
file in an input directory, such as `.ts` or `.py` source, is skipped without
a warning, and a directory holding only source code fails bundling because no
facts were collected. If you supply a fact base, it must be an explainer-kit fact-base
JSON file that passes the bundled schema and contains the evidence the
explainer needs; the renderer is not a substitute for missing research. Theme
selection is resolved before the artifact bundle is materialized; with no
theme, the skill writes the default `clean-neutral` theme file first.

**Example scenario:** A teammate will take over an API module next week. Give
the skill the module's architecture and design documents (Markdown, text,
HTML, or JSON) so it can produce an engineer tour grounded in those
documents. `--inputs` reads only `.md`, `.txt`, `.html`, and `.json` files;
source-code files in a directory are skipped, so describe the code in
documents or supply a prepared fact base. Choose an output folder you can
review before sharing; generating an HTML file is not permission to publish
it.

**What it does without asking:** It writes everything into the run folder you
named with `--out`: the fact base and claim ledger under `source/`, the
resolved theme, the authored `site/index.html`, verification results under
`qa/`, and finally `manifest.json`. After bundling, it shows a short summary
of the prepared facts so you can correct the scope before it writes the page.
Verification uses a host browser or the bundled Playwright probe when one is
available, to take screenshots. If bundling reports that a satisfied run
already exists (`reuse: true`), it returns that run unchanged. It does not
publish, commit, or push anything.

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

**Invocation:** `/oat-explainer-kit` is the reliable way to start it (Codex:
`$oat-explainer-kit`), for example: “/oat-explainer-kit generate a project
explainer from this project's approved planning artifacts.” Asking for the
skill by name usually works too. Name the recipe you want:
`project-explainer` (after planning), `project-recap` (after
implementation), or `program-recap` (for a multi-wave program). This request
is not a terminal command or a promise of a particular CLI flag. OAT
lifecycle skills also call the adapter automatically at the points listed in
[OAT lifecycle callers](#oat-lifecycle-callers).

**Prerequisites:** Node.js on your PATH, a compatible `explainer-kit` core
from the `utility` tool pack (`oat tools install utility --scope user`), and
this adapter from the `workflows` pack. If the core is missing or too old,
the adapter stops and prints the install or update command. Needs an active
OAT project: for `project-explainer` and `project-recap`, yes. Those recipes
require the project to be the active OAT project (`oat project open <name>`)
and read its lifecycle artifacts (planning files such as `plan.md`,
`design.md`, and `spec.md`; for a recap also the completion, summary, and
project-log records). A repository-level run with a fact base you supply needs no active
project; its output goes to `.oat/repo/reference/explainers/`.

**Example scenario:** A project has approved planning artifacts, and you need
to explain the chosen scope and approach to a teammate before implementation
starts. Make it the active project with `oat project open <name>`, then ask
for the `project-explainer` recipe. Let the adapter bind those OAT artifacts
and repository defaults, then use the core to generate the explainer; open
the resulting `site/index.html` under `<project>/explainers/<run-slug>/` and
check its verification outcome before sharing it. Do not ask it to present
planned capabilities as already shipped.

The adapter checks the installed core before resolving OAT configuration.
It owns source binding, intent, output placement, and defaults; the core owns
the reusable artifact-generation pipeline. This boundary keeps a project
explainer grounded in its planning evidence and a recap grounded in its
actual implementation evidence rather than treating the two as equivalent.

**What it does without asking:** It checks the installed core, then resolves
whether to generate. With the `workflow.explainers.*` preference set to
`always` or `never` it decides without asking; with the default `ask` it asks
once in an interactive run. Before generating, it records that generate or
skip decision in the project's `state.md` (the project's status file);
later runs reuse the recorded decision instead of asking again. It then
writes the run folder (fact base, page, verification results, and manifest)
under the output path below. If a run fails, an interactive run asks you to
retry or skip and records a skip in `state.md`. Lifecycle calls never prompt.
It does not commit, push, or publish the explainer.

**Expected output:** The core explainer bundle under
`<project>/explainers/<run-slug>/` (project recipes) or
`.oat/repo/reference/explainers/` (program or repository runs), with its
verification outcome preserved. The adapter also records the generate or
skip decision in the project's `state.md`; later runs reuse that decision
instead of asking again. A lifecycle call can produce it without an
interactive prompt, but unattended generation does not erase missing
evidence or upgrade a needs-review outcome.

**Next step:** Inspect the explainer and verification record, then return to
the relevant planning, implementation, or closeout workflow. An explainer
helps communicate a decision or outcome; it does not itself approve a plan,
complete a project, or publish a recap.
