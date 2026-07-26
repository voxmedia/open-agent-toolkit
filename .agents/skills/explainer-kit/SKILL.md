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
- Render neutral, self-contained artifacts from bundled recipes and templates.
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
discovery, theme resolution, rendering, QA, and manifest/build-record
persistence. It runs without OAT files or ambient configuration. Supplied fact
bases receive only lightweight consistency/freshness checks. Federated inputs
require a provider-neutral critic callback and invoke it exactly once.
Optional claim `sections` tags route facts to matching recipe narrative
sections; untagged claims remain shared context for every required section.

Unattended calls use explicit, already-approved source artifacts and require a
provider-neutral author callback once per recipe artifact. In-process callers
supply `options.author`; JSON-only CLI callers supply `--author-module`. The
core validates exact narrative sections and non-secret author provenance,
rejects excessive verbatim source overlap, retains each validated result under
`source/author/`, persists review provenance in
`source/content-approval.json`, and never prompts. Keep executable callback
references out of the persisted run request.

Interactive runs stop with an `incomplete` outcome after writing
`source/content/*.md`. Review and correct that Markdown, then provide an
explicit JSON decision and rerun the same request:

```bash
node scripts/run.mjs \
  --request /path/to/request.json \
  --reviewed-source /path/to/content-review.json
```

An approval decision resumes the existing run at theme/render; a rejection
persists its correction list and leaves downstream stages pending. Approval
does not authorize publishing: a publish request still requires the separate
human-gated publisher callback. See `references/contracts.md` for source
formats, callback modules, retained intermediates, and result semantics.

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
