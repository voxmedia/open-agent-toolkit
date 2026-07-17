---
name: oat-explainer-kit
version: 1.0.0
description: Use when building project explainers or recaps from OAT configuration, state, and lifecycle artifacts.
user-invocable: true
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, AskUserQuestion
---

# OAT Explainer Kit

Adapt OAT project context into the versioned request consumed by the canonical
`explainer-kit` core.

## Responsibilities

- Require a compatible installed `explainer-kit` core.
- Resolve typed OAT configuration with source attribution.
- Derive canonical project or repository output roots.
- Bind OAT lifecycle artifacts to generic recipe source roles.
- Resolve project explainer and recap intent before invoking the core.

## Dependency Direction

This adapter depends on `explainer-kit`; the core never depends on this adapter.
Fail closed when the compatible installed core is unavailable. Do not copy core
runtime logic into the adapter.

## Asset Resolution

Resolve adapter scripts and references relative to this installed skill
directory. Resolve the core only from its installed canonical skill path. Never
fall back to a repository source checkout.

## Progress Indicators

For interactive runs, show a concise banner and adapter stage updates:

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OAT ▸ EXPLAINER KIT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Report compatibility, config, intent, source-binding, core-run, and finalization
stages. Lifecycle-triggered unattended runs must not prompt.
