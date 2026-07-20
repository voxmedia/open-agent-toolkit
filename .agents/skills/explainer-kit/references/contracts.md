# Core run contract

`scripts/run.mjs` is the config-blind orchestration entry point. It reads only
the explicit `ExplainerRunRequestV1`, bundled skill assets, and source paths
named by that request. It does not search for `.oat`, user configuration,
provider configuration, vaults, or destinations.

## Invocation

Programmatic callers import `runExplainer(request, options)`. Command-line
callers use:

```bash
node scripts/run.mjs --request request.json
```

Federated runs require a provider-neutral critic callback. A command-line
caller supplies one with `--critic-module critic.mjs`; the module exports
`critic(request)` or a default function. The callback receives reconciled
claims, sources, overrides, and the freshness policy. It returns:

```json
{
  "criticId": "skeptical-pass",
  "executedAt": "2026-07-17T20:00:00Z",
  "findings": []
}
```

No provider name, command, credential, or dispatch protocol is part of this
contract.

Every unattended run also requires a provider-neutral author callback. An
in-process caller supplies `options.author(request)`; a JSON-only CLI caller
uses `--author-module author.mjs`. The core invokes it once per recipe artifact
with an `AuthorRequestV1` containing the exact narrative outline, reconciled
fact base, and bounded-discovery context. It must return an `AuthorResultV1`
with every required section in order, non-empty prose, and non-secret
provenance. The executable callback is never persisted in `run-request.json`.

## Explicit source forms

- `factBase.mode: supplied` points to a valid `FactBaseV1` JSON file. The core
  performs only the lightweight consistency and freshness check and never
  invokes the critic.
- `factBase.mode: federated` names explicit source bindings. File locators
  contain JSON with a `claims` array of
  `{ "id", "text", "locator"?, "sections"? }`. Optional `sections` values
  are recipe `requiredNarrative` IDs; untagged claims remain shared across
  every required section.
  Non-file bindings require a caller-supplied `sourceLoader(source)` callback.
  Every binding names its recipe `role` and `sourceSetId`. Multiple documents
  may share one source-set ID; recipe cardinality counts distinct sets, not
  documents. The core validates these bindings before loading facts, then
  reconciles the loaded claims and invokes the critic exactly once.

An unattended request asserts that its explicit source artifacts are already
approved. It does not prompt, and it fails before narrative serialization when
the author is absent, returns an invalid result, or copies excessive verbatim
source text. Interactive review and same-run approval/resume remain unchanged.

## Pipeline and retained package

The core executes:

1. validate request and recipe
2. reconcile or check the fact base
3. apply bounded discovery and obtain or create recipe content
4. resolve one theme
5. render typed artifacts
6. run structural and optional browser QA
7. write the manifest and build record

The run package retains the privacy-safe `run-request.json`,
`source/content-approval.json`, `source/fact-base.json`,
`source/fact-base.md`, `source/content/*.md`, optional structured
`source/author/*.json` results, `theme.resolved.json`, rendered `site/` files,
`manifest.json`, and `build-record.json` as far as each stage succeeds. A stage
failure records a structured error and recovery action without deleting earlier
outputs. Raw art direction is omitted unless the request explicitly opts in.

When a caller supplies `discover({ round, recipe, factBase })`, the callback
returns the findings added in that round. The core stops after two consecutive
empty rounds and always stops at the recipe's `maxRounds`.

## Optional seams

Durability and publishing are never implicit.

- `durability.strategy: none` invokes neither seam.
- `durability.strategy: commit` invokes the explicit `durability` callback.
  Caller-created commit evidence is subsequently verified with
  `record-durability.mjs`; the core never creates commits. The first evidence
  commit must contain every path and byte hash in `manifest.immutableHashes`:
  the privacy-safe request, content approval, fact-base JSON and Markdown,
  declared author results, all content Markdown, the resolved theme, and every
  built artifact retained in the package. Mutable `manifest.json` and
  `build-record.json` remain excluded for the separate evidence update.
  Schema-v1 manifests created before complete-package coverage are rejected
  with a legacy-manifest diagnostic and must be regenerated; validators never
  invent missing hashes.
- `durability.strategy: publish` invokes the explicit `publish` callback with
  the complete publish request. A verified receipt is subsequently recorded as
  durability evidence.

CLI callers provide these callbacks only with `--durability-module` and
`--publish-module`. Building remains `built-not-durable` until evidence is
verified. Publishing remains independently human-gated by the caller.

## Result

`runExplainer` returns the run root, manifest path, build-record path, outcome,
warnings, and bounded-discovery summary. Input validation and unsupported
recipes reject before output mutation. Failures after initialization return a
`failed` result with paths to the retained record and intermediates.

V1 readers reject unknown schema majors and unknown contract fields. Relative
record paths are run-root confined, hashes use `sha256:<hex>`, and command
metadata uses argv arrays rather than shell strings.
