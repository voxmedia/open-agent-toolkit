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

Every run, interactive or unattended, also requires a provider-neutral author
callback; a run without one fails `E_AUTHOR_REQUIRED`. An in-process caller
supplies `options.author(request)`; a JSON-only CLI caller uses
`--author-module author.mjs`. The core invokes it once per resolved artifact
with an `explainer-kit.author-request/v2` payload containing the artifact
identity and type, the artifact's authoring path, the inlined brief, the
reconciled fact base, the resolved theme, the shell source for artistic
artifacts, the required narrative sections for narrative floor artifacts, and
bounded-discovery context. It must return an `explainer-kit.author-result/v2`
carrying exactly one of `content.markdown` or `content.html`, matching the
artifact's declared authoring path, plus non-secret provenance. A floor result
may also carry `proposedArtifacts` of `{id, profileId, rationale}`; the
referenced expansion profile supplies the type, authoring path, brief, and
shell. The executable callback is never persisted in `run-request.json`.

Unknown profile IDs and unsafe, duplicate, or floor-colliding artifact IDs are
hard errors. Proposals beyond a profile's `maxCount` or the recipe's
`expansion.limits.maxArtifacts` are rejected with a warning and the run
continues.

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
source text. It auto-approves with `auto-drafted` marking once the artifacts are
built and checked.

## Pipeline and retained package

The core executes:

1. validate request and recipe
2. reconcile or check the fact base
3. apply bounded discovery
4. resolve one theme
5. author each floor artifact against its brief, evaluate expansion proposals,
   and author each accepted expansion artifact
6. render typed artifacts through the narrative renderer or validate
   agent-composed HTML, per each artifact's declared authoring path
7. run structural, guideline, and optional browser QA
8. resolve content approval — the interactive gate pauses here, after render and
   QA and before anything is published or persisted externally
9. write the manifest and build record

The run package retains the privacy-safe `run-request.json`,
`source/content-approval.json`, `source/fact-base.json`,
`source/fact-base.md`, authored content under `source/content/*.md` and
`source/content/*.html`, structured `source/author/*.json` results,
`theme.resolved.json`, rendered `site/` files, `manifest.json`, and
`build-record.json` as far as each stage succeeds. A stage failure records a
structured error and recovery action without deleting earlier outputs. Raw art
direction is omitted unless the request explicitly opts in.

Build-record stages are terminal once `passed` or `warned`. A rejected run that
is later approved reopens the render and QA stages through a narrowly guarded
record-level reset so the corrected sources are re-rendered and re-validated,
leaving an auditable trail rather than approving stale artifacts.

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
  declared author results, all authored content, the resolved theme, and every
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
warnings, approval status and marking, and bounded-discovery summary. The
marking rides in the result and the approval record only; `manifest/v1` stays
frozen and carries no marking field. Input validation and unsupported
recipes reject before output mutation. Failures after initialization return a
`failed` result with paths to the retained record and intermediates.

V1 readers reject unknown schema majors and unknown contract fields. Relative
record paths are run-root confined, hashes use `sha256:<hex>`, and command
metadata uses argv arrays rather than shell strings.
