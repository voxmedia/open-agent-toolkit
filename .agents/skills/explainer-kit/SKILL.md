---
name: explainer-kit
version: 1.0.0
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

Unattended calls use explicit, already-approved source artifacts and never
prompt. Interactive content approval and resume are a separate lifecycle step.
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
