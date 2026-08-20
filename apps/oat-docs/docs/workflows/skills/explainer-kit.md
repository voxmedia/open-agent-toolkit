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

The core ships four recipe families on the `explainer-kit.recipe/v2` file
schema. Most recipe selectors remain at version `"1"`. New project recaps use
immutable `project-recap@2`, while `project-recap@1` remains readable for replay.

A v2 recipe declares a **floor** — the artifacts every run must produce — plus
a licensed **expansion** set. Most recipes retain one floor artifact.
`project-recap@2` requires one complete navigational hub and plans any additional
artifact before an author runs.

| Recipe              | Use                                                    | Required floor                                                                                                    |
| ------------------- | ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| `project-explainer` | Working explanation after project planning             | one Markdown `hub` covering architecture, decisions, risks, phases, and validation                                |
| `project-recap`     | Final record after implementation and final review     | one HTML navigational hub; diagrams, decks, and deep dives are adaptive expansions                                |
| `program-recap`     | Bird's-eye record of a multi-wave delivery program     | one Markdown `hub` covering the wave map, outcomes, convention evolution, aggregate numbers, and follow-up ledger |
| `engineer-tour`     | Engineer-facing orientation to a codebase and its flow | one HTML-composed `explainer` covering orientation, architecture, execution flow, key code, and validation        |

The OAT project lifecycle owns `project-explainer` and `project-recap`. Both
bind one project source set. The adapter binds `plan.md`, `design.md`, and
`spec.md` for a project explainer; a project recap can also include
`implementation.md` and `summary.md`. Wave callers supply the program source
set for `program-recap`; direct core callers can use `engineer-tour` without
adding an OAT dependency.

### Project recap modes

Project recaps default to `recapMode: artistic`. This mode uses the shared set
plan and provider-neutral author seam to compose the required HTML hub plus any
source-backed expansion that answers a distinct reader question.

`recapMode: deterministic-markdown` is an explicit fallback for callers that
need deterministic output. It preserves the same planned artifact portfolio and
cardinality rather than collapsing the recap to one file. The runtime never
switches modes after an artistic author failure: changing modes requires a new
request, and a failed artistic run remains failed.

### Expansion profiles

Each recipe declares the expansion it licenses as a list of profiles. A profile
fixes everything the pipeline needs to build a follow-up author request —
artifact `type`, authoring path, brief, optional shell, and a mandatory
`maxCount`. Every recipe also carries a mandatory `expansion.limits.maxArtifacts`
that caps the whole expansion set; floor artifacts do not count against it.

| Recipe              | Profiles (max per profile)                                  | `maxArtifacts` |
| ------------------- | ----------------------------------------------------------- | -------------- |
| `project-recap@2`   | `supporting-diagram` 1, `walkthrough-deck` 1, `deep-dive` 3 | 5              |
| `program-recap`     | `supporting-diagram` 3, `project-page` 12                   | 12             |
| `project-explainer` | `supporting-diagram` 4                                      | 4              |
| `engineer-tour`     | `supporting-diagram` 4                                      | 4              |

For project recaps, every optional diagram, deck, or deep dive needs a distinct
reader question, supporting source evidence, and rationale for choosing that
medium. Other recipes retain their recipe-owned diagram and project-page
profiles. Every declared type stays inside the frozen `manifest/v1` enum.

## Content authoring and review

### Two authoring paths

Each artifact is authored on exactly one of two paths, and the **recipe**
chooses which — the author never does:

- **Narrative path** (`authoring: markdown`). The author writes Markdown. The
  core parses it to a validated AST and renders it deterministically through a
  themed block library: headings with anchors, GFM tables, lists including task
  lists, strikethrough, GFM alert callouts (`> [!NOTE]`, `> [!TIP]`,
  `> [!IMPORTANT]`, `> [!WARNING]`, `> [!CAUTION]`), fenced ` ```timeline `
  blocks, code blocks, and figures. Fenced ` ```diagram ` blocks are rendered to
  inline SVG at build time with no client-side script. Raw HTML passthrough and
  links that violate the publish contract are hard errors; style findings are
  warnings.
- **Artistic path** (`authoring: html`). The author composes a complete HTML
  document, starting from a curated shell delivered inside the request. The core
  validates the result at the DOM level rather than re-rendering it. Non-script
  markup is free within the allowlist, so decks, standalone diagrams, and tours
  keep full visual latitude.

Script safety on the artistic path is enforced by hash pinning rather than a
blanket ban, because the bundled shells legitimately contain scripts. The
validator derives an ordered multiset of script hashes from the declared core
shell and requires the authored document's scripts to match it exactly — same
hashes, same count, same order, compared over exact bytes. Missing, added,
duplicated, reordered, replaced, or mutated scripts all hard-fail, as do inline
event-handler attributes and external active content.

### Briefs carry the editorial bar

Quality expectations live in versioned prose briefs shipped with the core under
`briefs/`, not in the content schema. There is one brief per floor entry and one
per expansion profile. A brief states audience, voice, per-section intent, the
artifact's depth floors (for example "at least one high-level architecture
diagram"), and the expansion license. The core inlines the brief into every
author request, so an unattended author receives everything it needs in one
payload. Changing a brief changes output expectations with no contract
migration.

The bundled authoring prose covers typographic roles, hierarchy, composition,
density, medium leverage, template repetition, diagram semantics, and
cross-artifact cohesion. These remain editorial judgments rather than numeric
scores or deterministic layout checks.

### The planning and author seams

Before authoring, one provider-neutral `planSet` callback produces the complete
shared terminology, status, and number ledger plus the adaptive artifact
portfolio. Every run also requires one provider-neutral author callback, in
**both** modes — there is no synthetic content model to fall back on. A run
without one fails with `E_AUTHOR_REQUIRED`.

The core invokes the author once per planned artifact with an
`explainer-kit.author-request/v3` payload carrying the artifact identity and
type, its authoring path, the inlined brief, the reconciled fact base, the
resolved theme, the shell source for artistic artifacts, the immutable set
context, the matching planned artifact, canonical artifact links, and bundled
medium-specific authoring guidance. Version 2 requests remain readable for
replay. The installed skill is the complete unattended baseline; optional
provider capabilities can enhance composition but are not required. The core
accepts only a schema-valid `explainer-kit.author-result/v2` containing exactly
one of `content.markdown` or `content.html` plus non-secret provenance.
Authored content is still checked for excessive verbatim overlap with the fact
base.

Direct callbacks and module entry points are first-class but transient: they
never enter retained request contracts. See
[Explainer Provider Integration](explainer-kit-providers.md) for the exact
planner, author, browser-session, and visual-critic boundaries.

### Planner-owned adaptive sets

The set planner finalizes required and optional artifacts before authoring.
New project recaps always contain a navigational hub. The planner may add only
recipe-licensed optional diagrams, decks, or deep dives with a distinct reader
question, source evidence, and medium rationale. Recipe and per-profile limits
still bound the portfolio.
Undeclared sources, conflicting ledger values, duplicate IDs, and unjustified
optionals fail validation. Author results cannot add, remove, or replace
artifacts.

When the plan contains a non-linear graph, artistic output must preserve its
closed semantics exactly: direction, every node and label, every edge and
label, branching, fan-in, and cycles. Missing, extra, duplicated, rewired, or
semantically drifting observations fail topology validation before browser or
critic review.

### Approval and marking

The interactive approval gate sits **after** theme, render, safety validation,
the guideline checker, and render QA — immediately before publish and
durability. Rendering is local and non-destructive, and nothing leaves the
machine before approval, so the reviewer now approves the rendered artifacts and
the complete warning set instead of raw prose.

An interactive run therefore stops with an `incomplete` outcome once the
artifacts are built and checked. Review the rendered `site/` tree, the sources
under `source/content/`, and the accumulated warnings, then supply an explicit
JSON decision and rerun the same request. A rejection persists its correction
list; after the sources are edited, approving resumes the same run, which
re-renders and re-runs QA against the edited sources before approval is
processed rather than publishing the stale render.

Unattended runs — including recaps triggered by automated project completion —
flow through end-to-end and auto-approve content. The approval record
distinguishes the two honestly: `explainer-kit.content-approval/v2` carries
`marking: human-approved` for interactive approval and `auto-drafted` for an
unattended run.

Unattended project recaps also require a separate whole-set visual review.
The adapter supplies a branded session created by the compatible core, which
derives Chromium name and version from the launched browser rather than trusting
caller metadata. The browser captures each rendered artifact at exact 320, 768,
and 1440 viewports. The core validates decoded PNG dimensions and pixels, binds
screenshots and metrics to one capture identity, and sends only that confined
evidence to an independent critic. Fixture sessions are test-only and are
rejected in unattended production.

A `correct` disposition permits one bounded correction and exactly one final
review; there is no second correction or third review. The correction budget is
shared with the internal-link gate described below, so a `correct` disposition
is refused outright with `E_VISUAL_CORRECTION` when link validation already
spent the single bounded correction on this run. Missing, forged,
cross-record-mismatched, or invalid evidence, a failed critic, or an unresolved
correction ends as `built-needs-review`. Such output is retained for diagnosis
but cannot become durable, finalized, archived, or published.

The critic reviews the whole set for typography, hierarchy, composition,
density, medium leverage, template repetition, diagram semantics, and
cross-artifact cohesion. It returns the existing provider-neutral result:
`pass` when no required correction remains or `correct` with concrete,
artifact-scoped actions for the bounded correction round. No numeric design
threshold is part of the contract.

The approval record is also the durable source of truth for the resolved
artifact set. It records every floor and accepted expansion artifact for all
approval states, including pending and rejected, so a paused expanded run
rehydrates with stable artifact IDs, paths, hub links, and hashes without
re-invoking the author.

Content approval never authorizes publishing.

### Interactive resume security

An incomplete interactive run returns an opaque `approval.resumeToken`. Keep it
outside the package, then echo it as `reviewedSource.resumeToken` when resuming
the same request. Only fixed-format authenticated `ekrt2` tokens are accepted.
They bind the run ID, original canonical output root, exact retained
`run-request.json` bytes, and all retained set-plan records.

Before hydrating authored content or invoking planner, author, durability, or
publish callbacks, resume also compares the complete canonical current request
with the authenticated retained request. Changes to source binding, recipe,
mode, theme, render strategy, privacy, public URL, durability, or publish
destination fail with `E_APPROVAL_RESUME`. Intentionally non-retained art
direction is omitted from the persisted request projection; executable provider
seams are separately transient and never part of request equality.

Every legacy `ekrt1` token is rejected. A paused run created with the legacy
format must restart to receive an authenticated token; editing retained package
state cannot opt it into compatibility.

### Internal-link validation

Every internal reference in the rendered set must resolve to a
manifest-declared target before the run can reach browser review. The gate runs
after render and uses a bounded tokenizer rather than a general HTML parser.
Relative references resolve from the current explicit file and must bind
exactly to the manifest/site tree, and a referenced fragment must resolve to
exactly one ID in its target document. Directory references, path traversal,
missing targets, missing fragments, ambiguous fragments, and unsafe schemes all
fail with `E_INTERNAL_REFERENCE`.

A failure gets one bounded correction round, re-rendered and revalidated. That
round is the same single budget the visual-review `correct` disposition uses —
whichever gate reaches it first consumes it. Once it is exhausted the run fails
hard: the QA stage is recorded `failed` with code-only evidence and the scrubbed
message `The qa stage failed.`, and the run is neither durability- nor
publication-eligible. No finding is retained, so nothing in the durable record
names the broken reference; the failure is attributed to the `link-validation`
evidence stage.

## Warnings and QA severity

QA findings are split by severity, and the split is what lets thin content ship
visibly instead of failing a run. Safety and provenance violations — unsafe DOM
or AST content, external assets, link-form violations, unresolved tokens,
denylisted strings, tag imbalance, cohesion breaks, and source dumping — still
throw `E_QA` and fail the run. Editorial and layout findings append stable
warning identifiers to the manifest's `warnings[]` array and let the run
succeed in both modes.

| Warning ID                               | Meaning                                                         |
| ---------------------------------------- | --------------------------------------------------------------- |
| `guideline-narrative-coverage-missing`   | A required narrative section is not covered by the artifact     |
| `guideline-architecture-diagram-missing` | No architecture diagram, inline or standalone, was produced     |
| `guideline-structured-depth-missing`     | The artifact lacks the structured blocks its floor expects      |
| `expansion-profile-limit-exceeded`       | A proposal was rejected against its profile's `maxCount`        |
| `expansion-artifact-limit-exceeded`      | A proposal was rejected against `expansion.limits.maxArtifacts` |
| `render-qa-document-overflow`            | The document overflows the viewport at a probed width           |
| `render-qa-inner-container-overflow`     | An inner container overflows horizontally                       |
| `render-qa-viewport-clipping`            | Content is clipped and unreachable                              |
| `render-qa-heading-unreadable`           | A heading fails the readability probe                           |
| `render-qa-animations-enabled`           | Animation remained active where it should be suppressed         |
| `render-qa-reduced-motion`               | The reduced-motion preference was not honored                   |
| `render-qa-keyboard-navigation`          | Keyboard navigation did not reach expected targets              |
| `render-qa-theme-toggle`                 | The theme toggle did not behave as expected                     |
| `render-qa-deck-no-js-layout`            | A deck degrades incorrectly without JavaScript                  |
| `render-qa-deck-print-layout`            | A deck degrades incorrectly in print layout                     |
| `render-qa-skipped-no-probe`             | Render QA was skipped because no browser probe was supplied     |

When a caller supplies a browser provider, the stage serves the built site
directory, loads each artifact with animations disabled, and runs the
layout-probe battery. Viewport clipping deliberately exempts content inside a
horizontally scrollable ancestor, so intentionally paged deck slides are not
reported as clipped while genuinely unreachable content still is. The core
never launches a browser implicitly; the caller creates and closes an explicit
session, and the OAT adapter validates it before core invocation. For ordinary
non-retaining runs, omitting a legacy probe records
`render-qa-skipped-no-probe` and continues. Unattended project recaps require
the branded browser session and visual critic described in
[Explainer Provider Integration](explainer-kit-providers.md); missing evidence
fails closed as `built-needs-review`.

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

Reviewed source and citation backlinks are absolute canonical GitHub blob URLs
pinned to the exact 40-character commit revision and line range, so they
survive project archival without resolving through a mutable branch or local
checkout. Each recap also emits
`site/initiatives/<slug>/catalog.json` from the finalized manifest, versioned
as `explainer-kit.initiative-catalog/v2`. Its artifact IDs, types, paths,
URLs, and source backlinks must remain in exact manifest parity; authors do
not hand-maintain the catalog. The catalog's `publicVerification` field is a
**policy marker, never an outcome**: `required` when the run's public access
policy calls for anonymous URL verification, `skipped-by-policy` for
protected destinations. It records what the publication policy was — the
per-artifact verification outcomes live in `publish-receipt.json`.
Compatibility is regenerate-only: consumers parse the declared version, and
no v1 read path exists because no released consumer could verify v1 catalog
evidence.

`manifest.immutableHashes` covers the exact retained bytes for
`run-request.json`, content approval, fact-base JSON and Markdown, declared
author results, authored content, the resolved theme, and every built
artifact. Canonical fact-base and theme hashes identify normalized objects;
they are intentionally distinct from serialized file-byte hashes. The mutable
manifest and build record are excluded from their own durability evidence and
are committed separately after verification. Older v1 manifests without
complete coverage fail with a legacy-manifest diagnostic and must be
regenerated.

Build success and durability are separate:

- `built-not-durable` means artifacts exist but verified commit or publish
  evidence is absent.
- `built-needs-review` means the required unattended visual-review chain did
  not finish with a pass; durability and publishing remain blocked.
- `built-durable` requires verified evidence for every required
  non-rebuildable artifact.
- `failed` records a failed run without treating partial output as success.

The core verifies caller-supplied commit or publish evidence; it never creates
Git commits. Publishing is always explicitly requested and human-gated. The
public `s3-static` connector validates each S3 and HTTPS root independently and
proves the destination with a run-unique sentinel, uploads only
manifest-declared `site/` files, and writes `publish-receipt.json`.
Verification depends on the declared `publicAccess` policy: in `public` mode
the connector anonymously fetches each published URL and compares content
type and SHA-256 response bytes; in `protected` mode it verifies object
integrity through authenticated S3 hashing instead, and every receipt entry
records `publicVerification: skipped-protected` so the skipped anonymous
check is visible rather than implied.

Root screening is strict on both roots: no credentials, queries, or
fragments; no whitespace, C0/C1 control characters, or backslashes; and the
gate applies to every publish-request and publish-receipt contract version
rather than being pinned to one version string. Public roots must be HTTPS
and must not address loopback, link-local, or private networks, and
verification fetches refuse redirects (`redirect: 'error'`) — see the
[publication environment variables](/docs/cli-utilities/configuration#explainer-publication-environment-variables)
for the explicit private-root opt-in and its durable receipt trace.
Publishing is additive and does not run a root-wide destructive sync.

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
the complete post-run `publish-receipt/v2`, verifies every manifest artifact
and the core run ID, and rejects foreign or stale receipts; `publish-receipt/v1`
remains readable for replay of older runs only. Presets, private source
systems, external-document synchronization, and personal destinations remain
wrapper-owned.

V1 exposes no plugin registry or private mid-pipeline hook. Unsupported
contract majors and identity mismatches fail closed instead of being guessed
or coerced.
