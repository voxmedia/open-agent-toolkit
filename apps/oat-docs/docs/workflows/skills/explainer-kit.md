---
title: Explainer Kit
description: 'Build destination-neutral visual explainers directly or from OAT project lifecycle artifacts.'
---

# Explainer Kit

The public explainer family separates a destination-neutral core from an
OAT-aware adapter:

- `explainer-kit` validates explicit versioned inputs, reconciles one cited fact
  base, applies a recipe and theme, renders and checks the artifact set, and
  records a manifest and build outcome.
- `oat-explainer-kit` resolves OAT configuration, project intent, source
  artifacts, and canonical output paths before invoking the same core.

The core does not read OAT, user, vault, or destination configuration. Direct
callers provide a complete `ExplainerRunRequestV1` and an explicit output root.
OAT lifecycle callers use the adapter.

## Recipes

The v1 project recipes serve different lifecycle jobs:

| Recipe              | Lifecycle use                                      | Required narrative                                                                                                    |
| ------------------- | -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `project-explainer` | Working explanation after project planning         | planned architecture, decisions, risks, phases, and validation approach                                               |
| `project-recap`     | Final record after implementation and final review | original request, key agent decisions, as-built architecture, implementation record, validation evidence, and outcome |

Both recipes bind one project source set. The adapter binds `plan.md`,
`design.md`, and `spec.md` for a project explainer; a project recap can also
include `implementation.md` and `summary.md`.

## Themes

Every artifact set uses one resolved theme. The bundled defaults are the
`neutral` palette and `clean` visual profile. The core also ships the `ocean`,
`ember`, `forest`, and `violet` palettes plus `editorial` and `technical`
profiles.

A caller may select named palette/profile values, supply a validated theme
bundle, or provide per-run art direction. A supplied bundle takes precedence
over named selections. The resolved concrete bundle is retained with the run;
raw art-direction text is not retained by default. Themes contain validated
light and dark modes, while the render strategy chooses either the default mode
or a user-switchable result.

## Build, durability, and publish

Missing publish configuration means build-only. A completed build writes the
source package, resolved theme, `manifest.json`, `build-record.json`, and the
rendered `site/` tree. Rendering or publishing failures preserve successful
intermediates and recovery information.

Build success and durability are separate:

- `built-not-durable` means artifacts exist but verified commit or publish
  evidence is absent.
- `built-durable` requires verified evidence for every required
  non-rebuildable artifact.
- `failed` records a failed run without treating partial output as success.

The core verifies caller-supplied commit or publish evidence; it never creates
Git commits. Publishing is always explicitly requested and human-gated. The
public `s3-static` connector validates corresponding S3 and HTTPS roots with a
run-unique sentinel, uploads only manifest-declared `site/` files, verifies the
public URLs, and writes `publish-receipt.json`. It is additive and does not run
a root-wide destructive sync.

## OAT lifecycle policy

Interactive project explainer and recap preferences resolve independently from
`workflow.explainers.projectExplainer` and
`workflow.explainers.projectRecap`. Each accepts `always`, `ask`, or `never`;
the built-in default is `ask`. A resolved project decision in `state.md`
outranks those preferences.

Autonomous mode has stricter policy: it always attempts a project recap, while
a project explainer runs only when the kickoff request explicitly asks for
one. Lifecycle-triggered runs do not publish automatically, and recap failure
does not block project completion.

See [Project Artifacts](../projects/artifacts.md) for active and durable output
locations, and [Configuration](../../cli-utilities/configuration.md) for the
typed adapter settings.

## Private wrappers

Private integrations use the core boundary directly: resolve private inputs
before the run, construct one versioned request, invoke the core once, then
consume the versioned manifest and optional receipt after the run. Presets,
private source systems, external-document synchronization, and personal
destinations remain wrapper-owned.

V1 exposes no plugin registry or private mid-pipeline hook. Unsupported
contract majors and identity mismatches fail closed instead of being guessed
or coerced.
