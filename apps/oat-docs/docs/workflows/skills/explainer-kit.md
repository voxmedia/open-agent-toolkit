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

The core ships four versioned recipes:

| Recipe              | Use                                                    | Required narrative                                                                                                    |
| ------------------- | ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| `project-explainer` | Working explanation after project planning             | planned architecture, decisions, risks, phases, and validation approach                                               |
| `project-recap`     | Final record after implementation and final review     | original request, key agent decisions, as-built architecture, implementation record, validation evidence, and outcome |
| `program-recap`     | Bird's-eye record of a multi-wave delivery program     | program overview, wave map and outcomes, convention evolution, aggregate numbers, and follow-up ledger                |
| `engineer-tour`     | Engineer-facing orientation to a codebase and its flow | orientation, architecture, execution flow, key code, and validation                                                   |

The OAT project lifecycle owns `project-explainer` and `project-recap`. Both
bind one project source set. The adapter binds `plan.md`, `design.md`, and
`spec.md` for a project explainer; a project recap can also include
`implementation.md` and `summary.md`. Wave callers supply the program source
set for `program-recap`; direct core callers can use `engineer-tour` without
adding an OAT dependency.

## Content authoring and review

Every unattended run requires one provider-neutral author. The core invokes
the author once per recipe artifact with the exact narrative outline,
reconciled fact base, and bounded-discovery context. It accepts only a
schema-valid result with the required section IDs, substantive prose, and
non-secret provenance. Each section is checked independently for excessive
verbatim overlap with the fact base so one copied section cannot be hidden by
otherwise original prose.

In-process core callers supply `options.author`; core CLI callers use
`--author-module`. The OAT adapter accepts either an in-process `author` or an
`authorModulePath` and rejects zero or two seams for unattended runs before it
invokes the core. Callback and module paths are transient. Validated results
are retained under `source/author/` and covered by the run's immutable hashes.

Interactive runs may omit an author. They pause after writing
`source/content/*.md`, require an explicit content-review decision, and resume
the same run only after approval. Content approval never authorizes publishing.

## Curated styles and themes

Every artifact set uses one resolved theme. The primary selection surface is
one of four complete curated styles:

- `clean-neutral` — restrained neutral default
- `business-corporate` — structured corporate presentation
- `navy-ocean` — navy-led technical and operational presentation
- `dark-edgy` — solid dark canvas with high-contrast editorial accents

A caller may select a style, supply a validated theme bundle, or provide
per-run art direction. A supplied bundle takes precedence over a style. Legacy
`palette` and `visualProfile` inputs remain nullable compatibility fields, but
an explicit style wins and legacy use emits a deprecation warning. When no
selection is explicit, the core uses `clean-neutral` and records the fallback.

The resolved concrete bundle is retained with the run; raw art-direction text
is not retained by default. Every bundle contains validated light and dark
modes. The render strategy chooses either the default mode or a user-switchable
result without changing the bundle identity.

## Build, durability, and publish

Missing publish configuration means build-only. A completed build writes the
privacy-safe request, content approval, fact base, author results, authored
content, resolved theme, `manifest.json`, `build-record.json`, and the rendered
`site/` tree. Rendering or publishing failures preserve successful
intermediates and recovery information.

`manifest.immutableHashes` covers the exact retained bytes for
`run-request.json`, content approval, fact-base JSON and Markdown, declared
author results, authored Markdown, the resolved theme, and every built
artifact. Canonical fact-base and theme hashes identify normalized objects;
they are intentionally distinct from serialized file-byte hashes. The mutable
manifest and build record are excluded from their own durability evidence and
are committed separately after verification. Older v1 manifests without
complete coverage fail with a legacy-manifest diagnostic and must be
regenerated.

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
content type and SHA-256 response bytes at public URLs, and writes
`publish-receipt.json`. Public roots cannot contain credentials, queries, or
fragments. Publishing is additive and does not run a root-wide destructive
sync.

Release validation drives the bounded curated-style/template matrix in a real
installed Chromium browser and retains machine-readable viewport, clipping,
motion, keyboard, no-JavaScript, and print measurements. The gate fails closed
when no supported browser executable is available.

Frozen RC runs require both the identity record and the explicit retained
tarball directory:

```bash
node tools/release/run-explainer-rc.mjs \
  --rc-manifest .oat/repo/reference/explainer-kit-acceptance/v1/rc.json \
  --artifacts-dir dist/explainer-kit-rc \
  --entry scripts/run.mjs \
  --record /path/to/sanitized-execution.json \
  -- --request /path/to/request.json
```

The packaged CLI emits one complete JSON result document; pretty-printed
multiline JSON is valid, while progress text and line-by-line guessing are not.
The resulting execution record binds the canonical request and child-reported
manifest to the core run ID without retaining private argument values.
Wrapper-created receipt evidence is produced only after core execution and is
validated separately against the immutable execution record and manifest.

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
publish or link the versioned manifest after the run. Wrapper acceptance reads
the complete post-run `PublishReceiptV1`, verifies every manifest artifact and
the core run ID, and rejects foreign or stale receipts. Presets, private source
systems, external-document synchronization, and personal destinations remain
wrapper-owned.

V1 exposes no plugin registry or private mid-pipeline hook. Unsupported
contract majors and identity mismatches fail closed instead of being guessed
or coerced.
