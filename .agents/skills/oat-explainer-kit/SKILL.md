---
name: oat-explainer-kit
version: 1.0.5
description: Use when building project explainers or recaps from OAT configuration, state, and lifecycle artifacts.
disable-model-invocation: false
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
- Resolve one provider-neutral set planner for unattended project recaps.
- Require lifecycle callers to construct a brief-aware author seam.
- Require first-class browser-evidence and whole-set visual-review providers
  for unattended project recaps.

## Dependency Direction

This adapter depends on `explainer-kit`; the core never depends on this adapter.
Fail closed when the compatible installed core is unavailable. Do not copy core
runtime logic into the adapter.

Private wrappers use the core's frozen pre-resolution/request/core-run/manifest/
post-run seam directly; they do not route presets, vaults, Google Docs, Stoa, or
personal destinations through this adapter. For the release-candidate sequence,
rollback, and operator-owned real-wrapper gate, use `references/migration.md`.

Before reading OAT config or invoking the core, call
`scripts/check-core.mjs#checkCoreCompatibility` with this installed skill
directory and minimum core version `2.1.0`. Continue only when it returns
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

1. checks the user-scoped installed core at minimum version `2.1.0`;
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

New project-recap requests select immutable `project-recap@2`: one
navigational hub is the floor, while a diagram, walkthrough deck, or deep dive
is selected only when the planner can state its distinct reader question,
source evidence, and medium rationale. The installed core continues reading
`project-recap@1` for replay; the adapter never rewrites a retained request's
recipe selector.

Before invocation, read `references/author-callback.md`. Unattended
`project-recap` runs require exactly one provider-neutral set planner:
in-process callers supply `planSet`, while JSON/CLI callers supply
`planSetModulePath` naming a module with a `planSet` function export. The
adapter resolves this executable capability and passes only the callback to the
core. It never persists provider configuration or module paths.

Construct exactly one provider-neutral author seam in both modes: in-process
callers supply `author`, while JSON/CLI callers supply `authorModulePath` naming
a module with an `author` function export. The core invokes that callback once
per planned artifact. Every request carries the immutable shared `setContext`,
the matching `plannedArtifact`, the recipe brief, theme, and any
recipe-selected artistic shell. Those bundled inputs are the required
medium-specific guidance; an optional visual-explainer installation may enhance
provider execution but is never required. The adapter validates and resolves
executable inputs before passing them to `core.runExplainer`; callbacks and
module paths never enter the persisted run request.

Also read `references/visual-review-callback.md`. Unattended `project-recap`
runs require exactly one trusted launched-Chromium browser session and one
whole-set visual critic. In-process callers supply a branded `browserSession`
created by the compatible core and `visualCritic`; JSON/CLI callers supply
`browserSessionModulePath` and `visualCriticModulePath`, naming modules with
matching exports. Bare browser callbacks and caller-authored runtime metadata
are rejected. These are first-class adapter inputs; do not place either
provider in `coreOptions`.

The adapter resolves all executable providers before core invocation, enforces
direct-versus-module mutual exclusion, and requires distinct identities for
authoring, fact criticism, browser evidence, and visual criticism. A missing,
forged, or deterministic fixture session fails production validation before the
core runs. A runtime browser or visual-review failure is retained by the core
as `built-needs-review`, never as a successful durability or publication
outcome.

Unattended project runs pass `approved-oat-artifacts` provenance to the core's
content-approval seam and never prompt. Automated completion and
implementation-tail recaps always use `mode: unattended`.

Federated runs still require an explicit provider-neutral critic callback.
In-process callers may supply `critic` (or `coreOptions.critic` for
compatibility); JSON/CLI callers supply `criticModulePath` naming a module whose
`critic` export implements the same provider-neutral request/result contract.
Supply exactly one critic seam. Approval provenance does not bypass fact
reconciliation. Do not read private presets, vault files, provider
configuration, or ambient destination configuration.

## Progress Indicators (User-Facing)

For interactive runs, show a concise banner and adapter stage updates:

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OAT ▸ EXPLAINER KIT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Report compatibility, config, intent, source-binding, core-run, and finalization
stages. Lifecycle-triggered unattended runs must not prompt.
