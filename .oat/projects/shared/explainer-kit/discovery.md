---
oat_status: complete
oat_ready_for: oat-project-design
oat_blockers: []
oat_last_updated: 2026-07-16
oat_generated: false
---

# Discovery: explainer-kit

## Initial Request

Adopt and evolve the **explainer-kit skill family** — a refactor of the
operator's `oat-explainer-kit` 0.4.1 (personal skill, laptop user scope) into
two public deliverables: a generic core and an OAT adapter. Preserve the
operator's run-anywhere personal functionality through a private user-scoped
wrapper over a documented core extension contract; that wrapper is reference
material, not a deliverable of this project. Brainstorm the public skills'
future in the OAT ecosystem: packaging as a pack skill, config schema, palette
system, and integration with the wave/program-close lifecycle. Drafts of the
core, OAT adapter, and prior personal wrapper are attached under
`references/skill-drafts/`; this project starts from working material, not a
blank page.

## What the kit is

A guided, gated pipeline that turns a project's federated sources (repo docs,
OAT project artifacts, live `gh` PR state, session context) into a published
visual explainer set: reconciled cited fact base → adversarial critic loop →
markdown-draft human gate → self-contained HTML built on shared shells →
structural + render QA → publish (S3 mirror + self-verify). Codifies a real
production run; the operational wisdom is the asset.

## The agreed refactor (operator-confirmed; drafts require revision)

1. **`explainer-kit` (core, v1.0.0)** — destination-blind engine. Interface =
   environment variables or invocation arguments only. Reads NO config files;
   runs anywhere, including with zero OAT presence. Its stable compatibility
   seam is inputs in and a stable artifact tree plus machine-readable artifact
   manifest out. Private integrations orchestrate before and after the core;
   v1 does not add a plugin registry or mid-workflow hooks without evidence
   that pre/post orchestration is insufficient.
2. **`oat-explainer-kit` (wrapper, v1.0.0)** — resolves the typed
   `explainers.*` and `workflow.explainers.*` values through the `oat config`
   CLI surface, applies adapter-owned cross-field validation, maps the result
   to explicit core inputs, and invokes core. It is what project lifecycle
   callers use, typically also passing a reconciled fact base.
3. **Private personal compatibility wrapper (not shipped here)** — remains
   user-scoped and migrates to the core extension contract. It preserves named
   presets, vault authoring, Google Docs sync, and personal destinations
   without becoming a third public project deliverable. Before invocation it
   resolves presets, vault placement, and destination settings; after invocation
   it consumes the manifest to create companion notes, sync Google Docs, and
   maintain published links.

Design principles locked with the operator: the vault is an authoring
surface, not a destination ("the vault is where I think; publish targets are
where audiences read"); core must survive with no `.oat` config anywhere;
every line of 0.4.1's operational wisdom traces into exactly one draft
(verified — nothing dropped).

## Validation already done

The engine's output shape was validated on a real deliverable this week: a
15-slide program explainer for the stoa repo-improvement program (5 waves,
48 plans), built from the kit's shells by an opus builder against a
reconciled fact base, structural QA clean. Published as a private preview;
S3/CloudFront publish pending operator bucket setup
(`tkstang-open-agent-toolkit`, prefix `explainers/`, CloudFront + OAC on the
existing private bucket — policy scoped to the prefix).

## Brainstorm agenda (why this project exists)

1. **Palette and art-direction system.** Replace the current single
   "Executive light" token set with a two-layer contract. Selection inputs are
   a named semantic palette, a named visual profile, and optional natural-
   language art direction. Core ships one neutral zero-config default, a tiny
   curated palette set (target 3–5), and a tiny curated profile set (target
   2–3), all behind AA-contrast and cross-template render-QA acceptance bars.
   Palette roles include surface/ink/accent/status/diagram-series, with
   light/dark as modes of one palette. Profiles cover typography, spacing,
   geometry, shadows, density, motion, and diagram treatment. Selection is
   artifact-set-scoped; explicit per-artifact deviation emits a cohesion
   warning.

   Named selections, a schema-validated supplied override, or an interactive
   instruction such as "clean corporate" or "edgy editorial" compile into one
   validated resolved theme bundle consumed by every template/recipe.
   Natural-language direction is compile-time input, not stable preset
   identity: persist the concrete bundle beside the artifacts and replay that
   bundle rather than reinterpreting the adjective. Public manifests record a
   derived flag, instruction hash, and resolved-bundle hash by default, not raw
   instruction text. A derived bundle can become a named preset only after
   passing the same acceptance bar. Adapters/private wrappers can supply
   additional named selections or resolved bundles without core changes.

2. **Packaging.** Use the existing neutral-engine/lifecycle-adapter split:
   `explainer-kit`, including all templates and scripts required by its artifact
   contract, ships in the `utility` pack; `oat-explainer-kit` ships in the
   `workflows` pack. Distribution through OAT does not create an OAT runtime
   dependency for the core. The adapter fails closed when core is absent or
   below its minimum compatible version and reports the actionable utility-pack
   install/update command. Core must install cleanly at user scope; the adapter
   follows normal workflows-pack scope rules. The private wrapper depends only
   on the packaged core, and release validation exercises wrapper compatibility
   plus layout integrity against the packaged utility artifact, not the source
   tree. The public seam freezes in a packaged release candidate; the private
   wrapper migrates against that RC, and only a passing operator-executed E2E
   promotes it to release. Reconsider a dedicated communications pack only
   after at least three coherent public communications skills exist or the family develops a
   materially independent asset footprint/release cadence.
3. **Config schema and artifact roots.** `explainers.*` becomes a typed,
   documented OAT adapter surface with v1 `oat config get/set/describe`
   awareness; it is build/publish plumbing, while `workflow.explainers.*`
   remains lifecycle policy. The public fields are:
   - `explainers.defaults.palette` and `.visualProfile` (all config scopes);
   - `explainers.defaults.themeBundlePath` (shared repo-relative path or local
     checkout/absolute override; not user scope);
   - `explainers.publish.provider` (closed v1 enum: `s3-static`), `.s3Uri`,
     `.publicBaseUrl`, and `.awsRegion` (shared team facts);
   - `explainers.publish.awsProfile` (local/user only; reject it in shared
     config). Raw credentials remain environment concerns.

   Resolution follows runtime input, then local, shared, user, and built-in
   defaults where each key's allowed scopes apply. A theme bundle path wins
   over named defaults with a warning. Recipe, slug, fact-base path,
   per-invocation palette/profile, natural-language art direction, and an
   explicit resolved bundle remain runtime inputs rather than config. The CLI
   owns scalar typing/discoverability; the adapter owns cross-field validation
   such as publish-block completeness and theme precedence. Public config
   excludes private-wrapper concerns such as personal lanes, vault placement,
   Google Docs accounts, and personal destination presets.

   Artifact placement is scope-derived, not configured: project-specific sets
   always live at `<resolved-project-path>/explainers/` (normally
   `.oat/projects/<shared|local>/<project>/explainers/`); non-project OAT sets
   always live at `.oat/repo/explainers/` in v1. The destination-blind core
   still requires callers outside OAT to pass an explicit output root.

   The tracked artifact package contains the source/content model, manifest,
   resolved theme, and privacy-safe build record. The manifest classifies each
   rendered artifact as `rebuildable: true|false`; true claims include the
   deterministic command and input hashes and receive release-validation spot
   checks. Rebuildable rendered output may be ignored. A successful
   non-rebuildable output is durable only after commit or verified publish; if
   durability cannot be achieved, the recap records `built-not-durable` rather
   than reporting success, while project completion continues. Publishing
   connectors consume the artifact tree + manifest and produce a stable
   verified-URL receipt, making the public `s3-static` connector and private
   wrapper connectors peers on one extension seam. Deterministic baseline
   rendering is not a v1 requirement; v1 prioritizes stable inputs, tracked
   intermediates, honest rebuildability claims, and durable outcome records so
   renderer improvements can remain additive.

4. **Lifecycle integration.** V1 requires project-lifecycle integration.
   Wave/program-close hooks may integrate if their callers are available in
   time, but they do not gate this project and otherwise remain a follow-up.
   Freeze the composable seam now: canonical recipe IDs `project-explainer`
   and `project-recap`, versioned fact-base input, versioned manifest output,
   and source-set parameterization so later callers can reuse the recipes
   without hardcoded project-only inputs. Product shape:
   **project explainer**
   (post-plan/review) and **project recap** (post-implementation/final review)
   are explicit named recipes/modes within `oat-explainer-kit`. Lifecycle
   callers select the recipe; the wrapper does not infer it from project phase,
   and no additional public skills are introduced. Reusable source-set,
   narrative, and template definitions use the generic core's recipe format;
   `oat-explainer-kit` contributes the OAT artifact bindings, named public
   exposure, and lifecycle checkpoint behavior.

   Lifecycle policy (superseding the earlier all-product opt-in model):
   - In an autonomous project run, attempting the baseline-scope project recap
     is mandatory, automatic, and non-suppressible. The project explainer
     builds only when the kickoff request explicitly asks for it. Neither case
     auto-publishes.
   - In an interactive project, project-specific intent can be recorded at
     discovery or any later point through planning. With no recorded intent,
     `workflow.explainers.projectExplainer` and
     `workflow.explainers.projectRecap` resolve independently as
     `always | ask | never`; `ask` offers once at the appropriate gate.
   - Resolved project intent lives in two closed typed `state.md` fields:
     `oat_project_explainer` and `oat_project_recap`. Each is absent/null or
     `{decision: generate|skip, source:
interactive|kickoff_prompt|autonomous_policy, decided_at: <ISO-8601>}`.
     `generate` means build only. Workflow-preference fall-through is not
     persisted; artifact completion and freshness belong in the manifest.
   - Resolution precedence is mode policy, then project state, then workflow
     preference, then built-in default. Autonomous kickoff persists
     recap=`generate` with source `autonomous_policy`, so the requirement
     survives session loss or a later interactive resume. Interactive attempts
     to record recap=`skip` for an autonomous run are rejected. A stale lower-
     precedence conflict found during unattended execution is forced to the
     autonomous policy, warned when possible, and recorded in the summary and
     manifest without halting the run.
   - Explicit invocation remains available at any time. Each manifest binds
     the output to source commit/artifact hashes so revised inputs trigger
     regeneration or a visible stale state. Publishing is always human-gated.
   - The recap attempt and structured outcome record are mandatory, not a
     successful render. Build or render failure emits a warning and a durable
     failure record with cause and regeneration instructions, preserves every
     successful tracked intermediate, and never blocks project completion.
     Recap status is independent of project-run completion:
     `built-durable`, `built-not-durable`, or `failed`.
   - Every project recap covers, at minimum, the original request, key agent
     decisions, as-built architecture, implementation record, validation
     evidence, and outcome.

5. **Publish mechanics.** Use a topology-independent corresponding-roots
   contract. `s3Uri` already includes the writable publish prefix, and
   `publicBaseUrl` is the served URL corresponding to that exact root. For
   every relative artifact path `P`, upload to `<s3Uri>/P` and link/verify
   `<publicBaseUrl>/P`. Normalize stored roots without trailing slashes and
   reject leading slashes in `P`. The connector uploads and verifies a sentinel
   before bulk transfer, with root-correspondence/CDN-origin-path diagnostics
   on failure. `references/destination-contract.md` must show both
   prefix-visible and CDN-`originPath`-hidden examples. Explicit `index.html`
   URLs are the portable default; a directory-style canonical URL is emitted
   only when the connector verifies that route.
6. **Template neutrality.** Production templates are fully neutral: tokenize
   or remove organization-specific URLs, bucket names, and branding. Keep
   worked examples in `examples/` or reference fixtures outside production
   output paths, point to them from template headers, and use RFC 2606 domains
   such as `example.com`. Structural QA and release validation check both
   unresolved template tokens and a configurable denylist seeded with known
   core-repo organization strings; a seeded-leak test proves the guard works.
   Caller branding enters through palette/profile/theme/catalog inputs, so the
   guard does not reject intentional downstream branding. Defer brand packs;
   they would duplicate the v1 theme-bundle mechanism and remain additive
   later. Keep required external-pattern attribution in `NOTICES.md`.
7. **Extension boundary.** Define the smallest generic contract that lets the
   private personal wrapper retain presets, companion notes, vault authoring,
   Google Docs sync, and personal destinations without importing those
   assumptions into the public core. Direction confirmed: stable inputs plus
   artifact-tree/manifest outputs, with wrapper-owned pre/post orchestration.
   No public Google Docs lane is required in v1.

## Dependency provenance and disposition

- **`visual-explainer` 0.8.1** is an external MIT-licensed plugin by
  `nicobailon`. Adapt only the template and QA patterns the core needs, record
  attribution in repo-root `NOTICES.md`, and remove references to installed
  `visual-explainer:*` commands from the core.
- **`skeptic` 0.2.0** is a user-scope personal skill. The adversarial
  verification method is a prompt pattern that belongs directly in the core;
  the public skill does not depend on `skeptic`.
- **`engineering-explainer` 1.0.0** is operator-authored user-scope material.
  Absorb selected sticky-map, scroll-highlighting, and expandable-snippet
  patterns as an optional engineer-tour template/recipe in the generic kit.
  Do not retain a skill dependency or copy its S3 mechanics into the core.
- **`ovm-gdoc-sync` 1.2.0** is operator-authored vault code. It remains a
  private-wrapper implementation detail and is not a public core dependency.

## Constraints

- The three drafts in `references/skill-drafts/` are the starting point —
  evolve, don't restart. The personal draft is compatibility reference
  material, not an in-scope public deliverable. Traceability of 0.4.1's wisdom
  remains the quality bar.
- Core keeps zero config-file reads and zero OAT dependency.
- Personal functionality must remain available through the private wrapper;
  removing it from public scope does not authorize dropping its behavior.
- The repo must carry a wrapper-compatibility fixture or equivalent contract
  check as a development guard. Before the new core is considered shippable,
  the operator's separately owned migrated personal wrapper must pass an
  operator-executed E2E against the packaged release candidate, with durable
  run evidence. The project owns the frozen contract, packaged RC, fixture,
  and migration runbook; the operator and their other agent own wrapper
  migration. Any E2E failure blocks release until resolved, but this
  release-candidate gate does not block discovery, design, or initial
  implementation.
- V1 completion requires one live `s3-static` acceptance run against the
  operator-provisioned S3/CloudFront destination: verify the sentinel first,
  publish at least one real artifact through the corresponding-roots contract,
  verify its public URL, and retain the publish receipt. This one-time gate
  does not change the rule that runtime publishing remains human-gated.
- `oat-explainer-kit` 0.4.1 stays untouched on the operator's machines until
  the operator installs the new set (install runbook exists in
  `references/skill-drafts/MIGRATION.md`; the operator's other agent handles
  installation separately — not this project's job).
- Templates' component vocabulary and the render-QA gotchas are
  battle-tested; changes there need explicit justification.

## Open Questions

The brainstorm agenda, recap requirements, and v1 external acceptance gates
are decided. Design/spec work still needs to resolve:

- rebuildable-artifact spot-check mechanics and cost;
- detailed schemas for the resolved theme, artifact manifest, publish receipt,
  and private-wrapper compatibility fixture.

## Source Material

- `references/skill-drafts/` — the three complete skill packages + MIGRATION.md
- Original: `~/.claude/skills/oat-explainer-kit/` 0.4.1 (on the LAPTOP — thomas.stang; not present on this machine)
- Operator context: the stoa program explainer run (private artifact) proved
  the pipeline end-to-end minus the S3 publish leg
