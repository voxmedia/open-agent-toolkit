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

Before reading OAT config or invoking the core, call
`scripts/check-core.mjs#checkCoreCompatibility` with this installed skill
directory and minimum core version `1.0.0`. Continue only when it returns
`ok: true`.

- Missing core: stop and show
  `oat tools install utility --scope user`.
- Incompatible core: stop and show
  `oat tools update --pack utility --scope user`.
- Never search a repository checkout or another noncanonical path as fallback.

## Asset Resolution

Resolve adapter scripts and references relative to this installed skill
directory. Resolve the core only from its installed canonical skill path. Never
fall back to a repository source checkout.

## Core Invocation

Call `scripts/run.mjs#runOatExplainer` with the repository root, project
invocation, active project path, recipe, slug, lifecycle mode, and any explicit
runtime overrides. The adapter:

1. checks the user-scoped installed core at minimum version `1.0.0`;
2. resolves only the public `explainers.*` and `workflow.explainers.*` keys;
3. derives the canonical project output root;
4. binds approved OAT artifacts to the recipe's single `project` source set;
5. creates one `ExplainerRunRequestV1`;
6. calls the installed core's `runExplainer(request, options)` export; and
7. consumes and returns the resulting `explainer-kit.manifest/v1`.

`project-explainer` binds `plan.md`, `design.md`, and `spec.md`.
`project-recap` additionally binds `implementation.md` and `summary.md`.
Missing optional artifacts are omitted, but at least one approved lifecycle
artifact is required. An explicit supplied fact-base path bypasses artifact
federation and is passed through as `factBase.mode: supplied`.

Unattended project runs pass `approved-oat-artifacts` provenance to the core's
content-approval seam and never prompt. Federated runs still require an
explicit provider-neutral critic callback in `coreOptions`; approval provenance
does not bypass fact reconciliation. Do not read private presets, vault files,
provider configuration, or ambient destination configuration.

## Progress Indicators

For interactive runs, show a concise banner and adapter stage updates:

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OAT ▸ EXPLAINER KIT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Report compatibility, config, intent, source-binding, core-run, and finalization
stages. Lifecycle-triggered unattended runs must not prompt.
