---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-08-06
oat_phase: plan
oat_phase_status: complete
oat_plan_hill_phases: ['p05'] # pause after the final phase
oat_auto_review_at_hill_checkpoints: true
oat_plan_parallel_groups: [] # fully sequential
oat_plan_source: quick
oat_import_reference: null
oat_import_source_path: null
oat_import_provider: null
oat_generated: false
oat_template: false
---

# Implementation Plan: explainer-improvements-v2

> Revised after p01 to use a thin executable safety kernel and a prose-led
> creative layer. Execute with `oat-project-implement`.

**Goal:** Preserve the core/adapter boundary while closing the Cyclone case
study's path, link, publication, and lifecycle integrity gaps. Raise the
authoring and review floor through skill/recipe prose rather than a new
structured renderer framework.

**Architecture:** `explainer-kit` owns destination-neutral contracts,
validation, durability, and publication. `oat-explainer-kit` owns OAT
topology, config, source binding, and per-invocation destination derivation.
Deterministic code is limited to trust-boundary invariants. Narrative,
typography, composition, artifact selection, diagram quality, and visual
critique remain judgment-oriented prose.

**Tech Stack:** Node.js 22 ESM, `node:test`, JSON Schema, existing browser and
visual-review providers, pnpm/Turborepo, S3 static publishing.

**Commit Convention:** `{type}({task-id}): {description}`

## Scope Revision

The operator approved this reduction on 2026-08-06 after p01:

- retain executable path, link, publication, credential, and lifecycle
  invariants;
- remove structured hub/deck/diagram schemas and renderer engines;
- remove semantic layout and deterministic visual-quality heuristics;
- add no new golden-test infrastructure;
- leave the existing 27-capture golden suite unchanged and track its
  simplification separately;
- express artifact strategy, typography, composition, diagram semantics, and
  visual-review judgment in recipe/brief/skill prose.

The original handoff remains the production evidence base. This approved scope
decision supersedes its prescribed implementation mechanisms where the revised
design explicitly says so.

## Execution

All phases are sequential. p01 is complete and independently reviewed. Before
p02 begins, this revised design and plan receive one delta-focused artifact
review for requirement coverage, safety, compatibility, and honest deferrals.
Only Critical/Important findings block execution.

RED/GREEN/Refactor is the default for executable behavior. Prose and contract
tasks use focused conformance checks. Each task has one atomic commit; bounded
review corrections remain append-only.

## Phase 1: Adapter paths and destination derivation

**Status:** completed
**Review:** passed

### Task p01-t01: Derive per-invocation publish destination (completed)

**Outcome:** Project runs append encoded `projects/<slug>`; repository/direct
runs retain repository roots.

**Commit:** `84a5b4a`

### Task p01-t02: Validate complete publish config (completed)

**Outcome:** Partial config is build-only; complete config and source-aware
`publicAccess` are validated through adapter and CLI surfaces.

**Commit:** `3a634e0`

### Task p01-t03: Accept repository explainer invocations (completed)

**Outcome:** Repository runs require a supplied reviewed fact base and never
fall back to an active project.

**Commit:** `ab12256`

### Task p01-t04: Reject double-nested output roots (completed)

**Outcome:** The core confinement boundary rejects roots that already end in
the run slug before directory creation.

**Commit:** `aa1ec2d`

### Task p01-t05: Thread derived roots into core requests (completed)

**Outcome:** Core requests receive only derived roots, without OAT topology or
premature `publicAccess`.

**Commit:** `a42a385`

### Task p01-t06: Reject credential-bearing publish roots (completed)

**Outcome:** Credential-bearing, malformed-authority, query, fragment, and
normalized-away delimiter forms fail before core invocation or request
persistence.

**Commits:** `fcc100f`, append-only review correction `c1d5a1b`

**Verification:** Focused adapter tests, full adapter suite, CLI tests, lint,
format, and focused re-review passed.

---

## Phase 2: Canonical links and hard validation

Write boundary: `.agents/skills/explainer-kit/**` plus the adapter completion
callback fixture that consumes author requests.

### Task p02-t01: Add canonical artifact links to author requests

**Files:**

- Core author-request construction and set-plan helpers
- New immutable `author-request/v3` schema and registry/docs
- Focused contract, schema, and run-integration tests
- Adapter completion callback acceptance fixture

**Step 1: Write tests (RED)**

Prove each planned artifact receives a site-relative path ending in explicit
`index.html` and each author receives correct relative links from its own
artifact location. Retain Markdown and HTML authoring. Existing v2 requests
must remain valid for replay.

**Step 2: Implement (GREEN)**

Create the complete v3 request once, add the canonical link table, register it,
and emit it for new runs. Do not add structured-authoring, theme, renderer, or
set-plan contracts.

**Step 3: Verify**

Run:
`node --test .agents/skills/explainer-kit/tests/contracts.test.mjs .agents/skills/explainer-kit/tests/schemas.test.mjs .agents/skills/explainer-kit/tests/run.integration.test.mjs .agents/skills/oat-explainer-kit/tests/completion.integration.test.mjs && pnpm lint && pnpm format`

**Step 4: Commit**

```bash
git commit -m "feat(p02-t01): provide canonical artifact links to authors"
```

### Task p02-t02: Enforce post-render internal-link validation

**Files:**

- New bounded internal-reference validator
- Render/run gate integration and existing correction seam
- Unit and integration tests plus contract guidance

**Step 1: Write tests (RED)**

Cover valid explicit-file links, relative links, fragments with existing
targets, `src`/`srcset`, and explicitly safe embedded references. Reject
directory-style links, traversal, missing files, missing fragments, malformed
references, and links that escape the site root.

Integration tests prove validation runs before browser/visual review and
durability. One correction may rerender and revalidate; exhaustion records the
finding and cannot become durability-eligible as clean.

**Step 2: Implement (GREEN)**

Use a bounded fail-closed tokenizer/classifier; do not add an HTML parser
dependency. Anchor resolution to the manifest and generated site tree.

**Step 3: Verify**

Run:
`node --test .agents/skills/explainer-kit/tests/link-validation.test.mjs .agents/skills/explainer-kit/tests/render.test.mjs .agents/skills/explainer-kit/tests/records.test.mjs .agents/skills/explainer-kit/tests/run.integration.test.mjs && pnpm lint && pnpm format`

**Step 4: Commit**

```bash
git commit -m "feat(p02-t02): gate rendered artifacts on valid internal links"
```

---

## Phase 3: Publication integrity

Write boundary: core publication contracts/connectors, adapter publication
threading and compatibility floor, lifecycle URL summaries, release/smoke
receipt consumers, and one cross-boundary acceptance fixture.

### Task p03-t01: Make public-access behavior explicit and verifiable

**Files:**

- New immutable `publish-request/v2` schema and registry/docs
- `run-request/v1` embedded publish-request v1/v2 compatibility
- Core version, adapter minimum-core floor, and compatibility tests/docs
- Core publisher and S3 connector
- Adapter request threading
- Focused core/adapter tests

**Step 1: Write tests (RED)**

Cover public and protected modes. Public mode requires exact object-byte
verification plus anonymous public fetch. Protected mode requires authenticated
service-computed checksum verification or authenticated download hashing and
records public fetch as skipped-protected. Undeclared 401/403 fails closed.
Credentials must never be persisted.

**Step 2: Implement (GREEN)**

Thread source-aware `publicAccess` only after the core accepts v2. Preserve v1
request replay, make `run-request/v1` accept embedded publish-request v1/v2,
and advance the core version plus adapter minimum floor before the adapter emits
v2. Keep the human publication gate and reject execution before upload when
required verification capability is unavailable.

**Step 3: Verify**

Run:
`node --test .agents/skills/explainer-kit/tests/contracts.test.mjs .agents/skills/explainer-kit/tests/schemas.test.mjs .agents/skills/explainer-kit/tests/s3-static.test.mjs .agents/skills/explainer-kit/tests/run.integration.test.mjs .agents/skills/oat-explainer-kit/tests/config-paths.test.mjs .agents/skills/oat-explainer-kit/tests/run.integration.test.mjs .agents/skills/oat-explainer-kit/tests/check-core.test.mjs && pnpm lint && pnpm format`

**Step 4: Commit**

```bash
git commit -m "feat(p03-t01): verify public and protected publish destinations"
```

### Task p03-t02: Emit complete exact-byte publication receipts

**Files:**

- New immutable `publish-receipt/v2` schema and registry/docs
- Publisher, connector, URL composition, and lifecycle summary seams
- Release validation, RC, and private-wrapper smoke receipt readers
- Shipped receipt consumers and focused tests

**Step 1: Write tests (RED)**

Require exact one-to-one receipt coverage for every manifest artifact and each
generated auxiliary object such as `catalog.json`. Record relative path, S3
URI, canonical public URL, manifest hash, content type, and separate
object/public verification facts. Public and protected modes must be
unambiguous. V1 remains readable.

**Step 2: Implement (GREEN)**

Upload finalized bytes unchanged, compare verification evidence to manifest
hashes, centralize URL/path composition, and expose complete artifact URL sets
to lifecycle summaries. Migrate release and smoke readers in the same commit
that first emits receipt v2.

**Step 3: Verify**

Run:
`node --test .agents/skills/explainer-kit/tests/*.test.mjs .agents/skills/oat-explainer-kit/tests/*.test.mjs && pnpm --filter @open-agent-toolkit/cli test && pnpm lint && pnpm format`

**Step 4: Commit**

```bash
git commit -m "feat(p03-t02): record complete exact-byte publish receipts"
```

### Task p03-t03: Prove the adapter-to-destination publication boundary

**Files:**

- One fake-destination acceptance test and minimal fixture support

**Step 1: Write acceptance test (RED)**

Exercise project and repository invocations across adapter and core. Assert
derived prefixes, explicit `index.html`, unchanged bytes, manifest/hash
equality, canonical URLs, protected/public verification behavior, catalog
coverage, and no credentials or topology leakage.

**Step 2: Implement only required fixture seams (GREEN)**

Avoid new production abstractions unless the acceptance test exposes a real
missing seam.

**Step 3: Verify**

Run:
`node --test .agents/skills/oat-explainer-kit/tests/publish-boundary.acceptance.test.mjs .agents/skills/explainer-kit/tests/s3-static.test.mjs .agents/skills/explainer-kit/tests/run.integration.test.mjs && pnpm lint && pnpm format`

**Step 4: Commit**

```bash
git commit -m "test(p03-t03): cover cross-boundary publication integrity"
```

---

## Phase 4: Lifecycle and bounded recovery

Write boundary: core request validation/records, correction and durability
seams, publisher entry points/connectors, adapter finalization, CLI archive
verification, and the two project completion routes.

### Task p04-t01: Validate `sourceIds` before content processing

**Files:**

- Set-plan request/callback and returned-plan validation seams
- Adapter callback fixture for the production request shape
- Regression unit and adapter-to-core integration tests

**Step 1: Reproduce (RED)**

Reproduce the exact failing callback/request shape before choosing the fix.
Determine whether the producer must supply top-level `sourceIds` or the callback
must consume `factBase.sources`, and pin that boundary in an adapter-to-core
regression. Also cover missing, scalar, null, and invalid source IDs in returned
plans with actionable rejection before content processing.

**Step 2: Implement (GREEN)**

Correct the observed producer/consumer mismatch at its owning boundary.
Validate only arrays in returned plans; do not silently coerce malformed input
or weaken provenance.

**Step 3: Verify**

Run:
`node --test .agents/skills/explainer-kit/tests/contracts.test.mjs .agents/skills/explainer-kit/tests/run.integration.test.mjs .agents/skills/explainer-kit/tests/e2e-recap.test.mjs .agents/skills/oat-explainer-kit/tests/run.integration.test.mjs && pnpm lint && pnpm format`

**Step 4: Commit**

```bash
git commit -m "fix(p04-t01): validate source IDs before content processing"
```

### Task p04-t02: Require a terminal recap outcome before approval

**Files:**

- Shared terminal-outcome guard
- Project implementation/completion lifecycle callers
- Route-level tests

**Step 1: Write tests (RED)**

When recap intent is `generate`, both completion routes must reject missing or
`incomplete` outcomes. Existing `built-durable`, `built-not-durable`,
`built-needs-review`, and `failed` outcomes are terminal. Approval waits for
the outcome record, not visual perfection.

**Step 2: Implement (GREEN)**

Use one shared guard invoked by both callers before final approval is recorded.
Do not duplicate lifecycle policy in prose-only call sites.

**Step 3: Verify**

Run:
`node --test .agents/skills/oat-project-implement/tests/check-terminal-outcome.test.mjs .agents/skills/oat-project-complete/tests/check-terminal-outcome.test.mjs && pnpm --filter @open-agent-toolkit/cli test && pnpm lint && pnpm format`

**Step 4: Commit**

```bash
git commit -m "feat(p04-t02): gate approval on terminal recap outcomes"
```

### Task p04-t03: Bound correction and retain compact failure evidence

**Files:**

- Existing correction/finalize/durability records
- Publisher denial checks
- Archive verification and lifecycle integration tests

**Step 1: Write tests (RED)**

Prove a flagged run gets at most one rebuild/review correction. A remaining
flag, failure, or superseded outcome retains a compact record with run identity,
manifest hash when available, findings/error, and evidence disposition.
Flagged/failed/superseded manifests are categorically rejected at every publish
entry point. `built-not-durable` is also unpublishable. Review-clean
`built-durable` runs remain publishable only through the human gate.

**Step 2: Implement (GREEN)**

Reuse existing records and correction machinery where possible. Add a new
failure-record version only if the existing durable shape cannot represent the
required facts without ambiguity. Do not add override records or credentials.

**Step 3: Verify**

Run:
`node --test .agents/skills/explainer-kit/tests/records.test.mjs .agents/skills/explainer-kit/tests/durability.test.mjs .agents/skills/explainer-kit/tests/s3-static.test.mjs .agents/skills/explainer-kit/tests/run.integration.test.mjs .agents/skills/oat-explainer-kit/tests/finalize-tracked-run.test.mjs .agents/skills/oat-explainer-kit/tests/completion.integration.test.mjs && pnpm --filter @open-agent-toolkit/cli test && pnpm lint && pnpm format`

**Step 4: Commit**

```bash
git commit -m "feat(p04-t03): bound recap correction and retain failure evidence"
```

---

## Phase 5: Prose-led authoring and release closure

Write boundary: canonical skill/recipe guidance, affected docs and consumers,
provider-linked views, and lockstep package versions.

### Task p05-t01: Ship the prose-led project recap recipe

**Files:**

- New immutable `project-recap@2` recipe and recipe registry
- Core and adapter skill/brief guidance
- Adapter recipe selection in `resolve-config.mjs`
- Focused recipe/replay and adapter tests

**Step 1: Write tests (RED)**

V2 requires a navigational hub. Diagram, deck, or deep-dive expansion requires
a distinct reader question, evidence, and rationale. V1 remains replayable.
New runs emit the final v2 shape atomically, including the live adapter recipe
selection that currently pins project recaps to v1.

**Step 2: Implement (GREEN)**

Put narrative purpose, typographic roles, hierarchy, slide archetypes, diagram
semantics, fit-to-content, density, repetition, and medium choice in prose.
Continue authoring with Markdown or HTML. Do not add structured content,
renderer, theme, layout, or anti-filler schemas/scripts.

**Step 3: Verify**

Run:
`node --test .agents/skills/explainer-kit/tests/recipes.test.mjs .agents/skills/explainer-kit/tests/contracts.test.mjs .agents/skills/explainer-kit/tests/e2e-recap.test.mjs .agents/skills/oat-explainer-kit/tests/config-paths.test.mjs .agents/skills/oat-explainer-kit/tests/run.integration.test.mjs && pnpm lint && pnpm format`

**Step 4: Commit**

```bash
git commit -m "feat(p05-t01): add prose-led project recap recipe"
```

### Task p05-t02: Strengthen visual-review judgment in prose

**Files:**

- Core/adapter critic and visual-authoring guidance
- Existing visual-review tests
- Targeted OAT docs pages and generated docs index

**Step 1: Write focused checks (RED)**

Require guidance to address typography, hierarchy, composition, density,
medium leverage, template repetition, diagram semantics, and cross-artifact
cohesion. Preserve the existing critic result contract and actionable
`pass`/`correct` behavior.

**Step 2: Implement (GREEN)**

Update critic/skill prose and docs. Do not encode design judgment as numeric
thresholds or deterministic geometry checks. Do not add or expand golden
fixtures. Document the separate golden-suite simplification follow-up.

**Step 3: Verify**

Run:
`node --test .agents/skills/explainer-kit/tests/qa.test.mjs .agents/skills/explainer-kit/tests/contracts.test.mjs .agents/skills/oat-explainer-kit/tests/run.integration.test.mjs && pnpm run cli -- docs generate-index && pnpm check && pnpm build:docs && pnpm lint && pnpm format`

**Step 4: Commit**

```bash
git commit -m "docs(p05-t02): strengthen prose-led visual review"
```

### Task p05-t03: Synchronize versions and validate release

**Files:**

- Changed canonical skill frontmatter versions
- Provider-linked skill views generated by `oat sync --scope all`
- Lockstep public package versions and release metadata
- Remaining shipped guidance/consumer compatibility assertions

**Step 1: Prepare release**

Bump each changed canonical skill once for the final PR diff. Synchronize
provider views. Bump all five public packages together because bundled skills
and docs are shipped CLI assets.

**Step 2: Verify compatibility**

Confirm old contract/recipe replay, new producer/consumer compatibility,
adapter minimum-core floor, bundled assets, and repository-wide references to
superseded versions.

**Step 3: Run completion gates**

Run, in order:

1. `pnpm check`
2. `pnpm type-check`
3. `pnpm test`
4. `pnpm build`
5. `pnpm lint`
6. `pnpm format`
7. `pnpm build:docs`
8. `pnpm release:validate`

**Step 4: Commit**

```bash
git commit -m "chore(p05-t03): synchronize explainer release versions"
```

---

## Reviews

| Scope         | Type     | Status          | Date       | Artifact                                                                                          | Reviewed Head                            | Invocation | Gate Target              |
| ------------- | -------- | --------------- | ---------- | ------------------------------------------------------------------------------------------------- | ---------------------------------------- | ---------- | ------------------------ |
| p01           | code     | passed          | 2026-08-06 | reviews/archived/p01-review-2026-08-06T172134Z.md                                                 | a42a38521b33fa1127ebdd1b462a16ed632728cb | manual     | -                        |
| p01-t06       | code     | fixes_completed | 2026-08-06 | reviews/archived/p01-t06-review-2026-08-06T173603Z.md                                             | fcc100f3f78984bc1ba285bd1fea099cda451a24 | manual     | -                        |
| p01-t06       | code     | passed          | 2026-08-06 | reviews/archived/p01-t06-review-2026-08-06T174423Z.md                                             | c1d5a1b0994e19abb2b349b776ba3235f8955b52 | manual     | -                        |
| p02           | code     | fixes_completed | 2026-08-06 | reviews/archived/p02-review-2026-08-06T201258Z.md                                                 | fde1437beb821c68f8fe972d4ac1c4425d20e7ef | manual     | -                        |
| p02           | code     | passed          | 2026-08-06 | reviews/archived/p02-review-2026-08-06T202708Z.md                                                 | 3f0dfe5e3131ee2ef12bd06cf4eb842566b50ca9 | manual     | -                        |
| p03           | code     | pending         | -          | -                                                                                                 | -                                        | -          | -                        |
| p04           | code     | pending         | -          | -                                                                                                 | -                                        | -          | -                        |
| p05           | code     | pending         | -          | -                                                                                                 | -                                        | -          | -                        |
| final         | code     | pending         | -          | -                                                                                                 | -                                        | -          | -                        |
| plan-revision | artifact | fixes_completed | 2026-08-06 | reviews/archived/artifact-plan-revision-review-2026-08-06T180042Z.md                              | c33edabc017369a629ca7a3a63757cbad3d9dab9 | manual     | -                        |
| plan-revision | artifact | passed          | 2026-08-06 | reviews/archived/artifact-plan-revision-review-2026-08-06T181021Z.md                              | a8e41bbc13c9aee38312d1680ac6aec13642cae7 | manual     | -                        |
| plan          | artifact | passed          | 2026-08-05 | inline (deliberate inheritance; 1 Important + 2 Medium fixed)                                     | -                                        | auto       | -                        |
| plan          | artifact | fixes_completed | 2026-08-06 | reviews/archived/artifact-plan-review-2026-08-06T002327Z.md (4 Important + 1 Medium resolved)     | -                                        | gate       | cursor-gpt-5-6-sol-xhigh |
| plan          | artifact | fixes_completed | 2026-08-06 | reviews/archived/artifact-plan-review-2026-08-06T004027Z.md (2 Important + 1 Medium resolved)     | -                                        | gate       | cursor-gpt-5-6-sol-xhigh |
| plan          | artifact | fixes_completed | 2026-08-06 | reviews/archived/artifact-plan-review-2026-08-06T005429Z.md (4 Important + 2 Medium resolved)     | -                                        | gate       | cursor-gpt-5-6-sol-xhigh |
| plan          | artifact | fixes_completed | 2026-08-06 | reviews/archived/artifact-plan-review-2026-08-06T012159Z.md (superseded rerun; findings resolved) | -                                        | gate       | cursor-gpt-5-6-sol-xhigh |
| plan          | artifact | fixes_completed | 2026-08-06 | reviews/archived/artifact-plan-review-2026-08-06T012720Z.md (3 Important + 1 Medium resolved)     | -                                        | gate       | cursor-gpt-5-6-sol-xhigh |
| plan          | artifact | fixes_completed | 2026-08-06 | reviews/archived/artifact-plan-review-2026-08-06T013953Z.md (2 Important + 2 Medium resolved)     | -                                        | gate       | cursor-gpt-5-6-sol-xhigh |
| plan          | artifact | fixes_completed | 2026-08-06 | reviews/archived/artifact-plan-review-2026-08-06T015212Z.md (2 Important resolved)                | -                                        | gate       | cursor-gpt-5-6-sol-xhigh |
| plan          | artifact | fixes_completed | 2026-08-06 | reviews/archived/artifact-plan-review-2026-08-06T021300Z.md (2 Important + 3 Medium resolved)     | -                                        | gate       | cursor-gpt-5-6-sol-xhigh |
| plan          | artifact | fixes_completed | 2026-08-06 | reviews/archived/artifact-plan-review-2026-08-06T023457Z.md (4 Important resolved)                | -                                        | gate       | cursor-gpt-5-6-sol-xhigh |
| plan          | artifact | fixes_completed | 2026-08-06 | reviews/archived/artifact-plan-review-2026-08-06T024804Z.md (4 Important resolved)                | -                                        | gate       | cursor-gpt-5-6-sol-xhigh |
| plan          | artifact | fixes_completed | 2026-08-06 | reviews/archived/artifact-plan-review-2026-08-06T031926Z.md (2 Important + 1 Medium resolved)     | -                                        | gate       | cursor-gpt-5-6-sol-xhigh |
| plan          | artifact | fixes_completed | 2026-08-06 | reviews/archived/artifact-plan-review-2026-08-06T033345Z.md (3 Important resolved)                | -                                        | gate       | cursor-gpt-5-6-sol-xhigh |
| plan          | artifact | fixes_completed | 2026-08-06 | reviews/archived/artifact-plan-review-2026-08-06T034831Z.md (2 Important resolved)                | -                                        | gate       | cursor-gpt-5-6-sol-xhigh |
| plan          | artifact | fixes_completed | 2026-08-06 | reviews/archived/artifact-plan-review-2026-08-06T040012Z.md (2 Important resolved)                | -                                        | gate       | cursor-gpt-5-6-sol-xhigh |
| plan          | artifact | fixes_completed | 2026-08-06 | reviews/archived/artifact-plan-review-2026-08-06T042235Z.md (3 Important + 2 Medium resolved)     | -                                        | gate       | cursor-gpt-5-6-sol-xhigh |
| plan          | artifact | fixes_completed | 2026-08-06 | reviews/archived/artifact-plan-review-2026-08-06T043754Z.md (2 Important + 1 Medium resolved)     | -                                        | gate       | cursor-gpt-5-6-sol-xhigh |
| plan          | artifact | passed          | 2026-08-06 | operator acceptance after attempt-15 fixes                                                        | -                                        | operator   | -                        |

**Status values:** `pending` → `received` → `fixes_added` →
`fixes_completed` → `passed`

## Implementation Complete

**Summary:**

- Phase 1: 6 tasks — adapter paths, destinations, and credential hygiene
- Phase 2: 2 tasks — canonical links and hard validation
- Phase 3: 3 tasks — publication verification and receipts
- Phase 4: 3 tasks — lifecycle ordering and bounded recovery
- Phase 5: 3 tasks — prose-led authoring, docs, and release closure

**Total: 17 tasks**

## References

- Design: `design.md` (revised lightweight design)
- Discovery: `discovery.md`
- Handoff: `references/handoff-cyclone-case-study.md` (production evidence)
- Implementation tracking: `implementation.md`
