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
