---
name: explainer-kit
version: 2.0.0
description: Use when building destination-neutral visual explainer artifacts from explicit, versioned inputs.
user-invocable: true
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, Agent, mcp__*
---

# Explainer Kit

Build visual explainer artifact sets from explicit inputs without reading OAT,
user, vault, or destination configuration.

## Responsibilities

- Validate versioned run, source, theme, artifact, durability, and publishing
  contracts.
- Reconcile one cited fact base before producing narrative content.
- Author every artifact against a bundled brief on one of two paths, and scale
  the artifact set with the content through recipe-declared expansion profiles.
- Render neutral, self-contained artifacts from bundled recipes and templates.
- Report editorial and layout findings as manifest warnings while keeping
  safety and provenance violations hard failures.
- Record build outcomes and verify caller-supplied durability evidence.
- Publish only through an explicitly requested, human-gated connector.

## Dependency Direction

This skill is the canonical core. It must not depend on `oat-explainer-kit` or
OAT project state. Adapters and private wrappers may construct a core run
request and consume its manifest, build record, and optional publish receipt.

## Wrapper Extension Seam

Wrappers own private pre-resolution and post-run work. They resolve presets,
vaults, external documents, and personal destinations before translating the
result into one `ExplainerRunRequestV1`; after the core run, they consume the
versioned manifest and optional receipt to create links or companion records.
They must not inject private work between core stages or expose private lanes as
public config. See `references/extension-contract.md` for the frozen sequence,
version policy, and compatibility fixture.

## Asset Resolution

Resolve schemas, recipes, templates, scripts, examples, and references relative
to this installed skill directory. Never resolve runtime assets from a source
checkout or from absolute operator-specific paths.

## Core Run

Construct a complete `ExplainerRunRequestV1`, then invoke the packaged core:

```bash
node scripts/run.mjs --request /path/to/request.json
```

The core composes validation, fact-base processing, bounded recipe/content
discovery, authoring, theme resolution, rendering, QA, approval, and
manifest/build-record persistence. It runs without OAT files or ambient
configuration. Supplied fact bases receive only lightweight
consistency/freshness checks. Federated inputs require a provider-neutral
critic callback and invoke it exactly once. Optional claim `sections` tags
route facts to matching recipe narrative sections; untagged claims remain
shared context for every required section.

## Authoring

Every run requires a provider-neutral author callback in **both** modes; there
is no synthetic content model. A run without one fails `E_AUTHOR_REQUIRED`.
In-process callers supply `options.author`; JSON-only CLI callers supply
`--author-module`. Keep executable callback references out of the persisted run
request.

The recipe — never the author — selects each artifact's authoring path. Floor
entries and expansion profiles declare `authoring: markdown` for the narrative
path or `authoring: html` for the artistic path. The core invokes the author
once per artifact with an `explainer-kit.author-request/v2` payload carrying the
artifact identity and type, its authoring path, the inlined brief from
`briefs/`, the reconciled fact base, the resolved theme, the shell source for
artistic artifacts, and the required narrative sections for narrative floor
artifacts. It accepts only a schema-valid
`explainer-kit.author-result/v2` with exactly one of `content.markdown` or
`content.html` plus non-secret provenance, rejects excessive verbatim source
overlap, retains each validated result under `source/author/` and its content
under `source/content/<artifact>.md` or `.html`, and never prompts.

Markdown content is parsed to a validated AST and rendered through the themed
block library, including GFM tables and task lists, GFM alert callouts, fenced
`timeline` blocks, and fenced `diagram` blocks rendered to inline SVG at build
time. HTML content is validated at the DOM level: the authored document's
scripts must match the declared core shell's ordered multiset of script hashes
exactly, and inline event handlers and external active content are rejected.
Non-script markup stays free within the allowlist.

A floor artifact may return `proposedArtifacts` of `{id, profileId, rationale}`
to grow the set when the content earns it. The referenced profile supplies the
type, authoring path, brief, and shell, so the author never chooses policy.
Unknown profiles and unsafe, duplicate, or floor-colliding IDs are hard errors;
proposals over a profile's `maxCount` or the recipe's
`expansion.limits.maxArtifacts` are rejected with a warning and the run
continues. Accepted expansion artifacts render to
`site/{directory}/{slug}/{artifactId}/index.html` and are linked from the floor
hub; floor artifacts keep their existing paths.

## Review, Approval, and Warnings

Approval runs after theme, render, safety validation, the guideline checker, and
render QA, immediately before publish and durability — so a reviewer approves
rendered artifacts and the complete warning set, not raw prose.

Interactive runs stop with an `incomplete` outcome once artifacts are built and
checked. Review the rendered `site/` tree, the sources under `source/content/`,
and the accumulated warnings, then provide an explicit JSON decision and rerun
the same request:

```bash
node scripts/run.mjs \
  --request /path/to/request.json \
  --reviewed-source /path/to/content-review.json
```

An approval decision resumes the existing run; a rejection persists its
correction list, and a later approval re-renders and re-runs QA against the
edited sources before proceeding. Approval does not authorize publishing: a
publish request still requires the separate human-gated publisher callback.

Review provenance persists in `source/content-approval.json` as an
`explainer-kit.content-approval/v2` record. It carries
`marking: human-approved` for interactive approval and `auto-drafted` for
unattended runs, surfaced in the run result and never written to the manifest,
plus the complete resolved artifact set so a paused expanded run rehydrates
without re-invoking the author.

Safety and provenance violations fail the run with `E_QA`. Editorial and layout
findings — narrative-coverage, architecture-diagram, and structured-depth
guideline misses, rejected over-limit proposals, and render-QA layout findings —
append stable warning IDs to the manifest's `warnings[]` and let the run
succeed.

Render QA is opt-in. It runs only against an injected `browserProbe`, and the
core never launches a browser of its own — reviewing the rendered output in a
browser is the generating agent's job. Without a probe the stage records
`render-qa-skipped-no-probe` and the run continues.

See `references/contracts.md` for source formats, callback modules, retained
intermediates, and result semantics.

Durability and publishing run only when the request selects them and the caller
supplies the matching callback. The core does not create commits, discover
destinations, or publish automatically. A successful build remains
`built-not-durable` until caller-supplied evidence is verified.

## Progress Indicators

For interactive runs, show a concise banner and stage updates:

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EXPLAINER KIT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Report validation, fact-base, content, theme, render, QA, durability, and
publish stages as they begin and complete. Keep unattended output structured
and non-interactive.
