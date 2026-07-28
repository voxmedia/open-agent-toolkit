---
oat_plan_source: imported
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-07-28
oat_phase: plan
oat_phase_status: complete
oat_plan_parallel_groups: []
oat_plan_hill_phases: ['p05']
oat_auto_review_at_hill_checkpoints: true
oat_import_reference: references/imported-plan.md
oat_import_source_path: /Users/thomas.stang/.cursor/plans/golden-visual-quality-33154d65.plan.md
oat_import_provider: cursor
oat_generated: false
oat_template: false
---

# Implementation Plan: explainer-improvements

> Execute with `oat-project-implement`. The five phases are sequential because
> later runtime, critic, and conformance work consumes contracts and evidence
> established by earlier phases.

**Goal:** Restore unattended golden-quality project recaps by making set-level
visual planning, skilled composition, real-browser evidence, independent visual
criticism, and a hard one-correction limit part of the shipped runtime.

**Architecture:** Preserve the merged fact-base, recipe, safety, approval, and
durability foundations. Add versioned set-plan and visual-review contracts
around the existing core, route every recap artifact from one shared plan, run
the complete adaptive set through browser capture and an independent critic,
and publish only a passing set. The OAT adapter supplies provider callbacks and
lifecycle state without leaking OAT concerns into the generic core.

**Tech Stack:** Node.js 22 ESM, JSON Schema, Playwright/Chromium, `node:test`,
TypeScript 6, pnpm/Turborepo, S3 static publishing.

**Scope correction:** PR #179 merged as `1151a0d7` before this import. Phase 1
therefore treats its missing notice payload as an immediate post-merge
compliance repair. It does not reopen the merged mechanical architecture.

**Loop cap:** By operator override on 2026-07-28, phase/code review remediation
permits up to three bounded block-fix-review retries. The runtime still permits
one visual correction pass followed by one final review. No recursive or
open-ended review loop is allowed.

**Commit convention:** `{type}({task-id}): {description}`.

## Planning Checklist

- [x] Preserved the external source verbatim in `references/imported-plan.md`
- [x] Corrected stale merge ordering without changing the source artifact
- [x] Evaluated phase parallelism; retained sequential execution because contracts overlap
- [x] Confirmed HiLL checkpoints from `workflow.hillCheckpointDefault: final`
- [x] Set `oat_plan_hill_phases` in frontmatter

HiLL selection was resolved during implementation preflight from the configured
final-phase workflow preference.

---

## Phase 1: Compliance and bounded quality baseline

### Task p01-t01: Ship complete MIT notices in affected package payloads

**Files:**

- Modify: `NOTICES.md`
- Modify: `packages/cli/scripts/bundle-assets.sh`
- Modify: `packages/cli/src/release/public-package-contract.ts`
- Modify: `packages/cli/src/release/public-package-contract.test.ts`
- Modify: `tools/release/validate-public-packages.ts`
- Modify: `packages/cli/package.json`
- Modify: `packages/control-plane/package.json`
- Modify: `packages/docs-config/package.json`
- Modify: `packages/docs-theme/package.json`
- Modify: `packages/docs-transforms/package.json`
- Modify: `pnpm-lock.yaml`

**Steps:**

1. Add the complete upstream MIT copyright and permission text for every
   adapted source currently summarized in `NOTICES.md`, retaining source URL
   and version provenance.
2. Add a failing package-contract test proving every public package that ships
   adapted content contains the notice in its packed tarball; verify against
   `pnpm pack` output, not the working tree.
3. Bundle the notice into the CLI package and extend release validation to
   inspect the packed content and required text.
4. Bump all five public packages in lockstep and update `pnpm-lock.yaml` before
   release validation because bundled assets are shipped CLI functionality.
5. Run `pnpm format:fix`, then
   `pnpm --filter @open-agent-toolkit/cli test -- public-package-contract.test.ts`
   and `pnpm release:validate`.
6. Commit as `fix(p01-t01): ship complete third-party notices`.

**Acceptance:** The packed CLI includes the complete required license texts;
release validation fails if the notice is absent or reduced to attribution
summaries.

---

### Task p01-t02: Replace the visual XL backlog item with ordered outcomes

**Files:**

- Modify: `.oat/repo/pjm/backlog/items/BL-260727-close-the-explainer-kit-visual.md`
- Archive: `.oat/repo/pjm/backlog/items/BL-260727-ship-mit-notices-inside.md` to `.oat/repo/pjm/backlog/archived/BL-260727-ship-mit-notices-inside.md`
- Create: `.oat/repo/pjm/backlog/items/BL-260728-unattended-visual-author-critic.md`
- Create: `.oat/repo/pjm/backlog/items/BL-260728-cohesive-adaptive-recap-set.md`
- Create: `.oat/repo/pjm/backlog/items/BL-260728-non-linear-diagram-routing.md`
- Create: `.oat/repo/pjm/backlog/items/BL-260728-durable-backlinks-catalog.md`
- Create: `.oat/repo/pjm/backlog/items/BL-260728-additional-visual-workflows.md`
- Modify: `.oat/repo/pjm/backlog/completed.md`
- Regenerate: `.oat/repo/pjm/backlog/index.md`

**Steps:**

1. After p01-t01 passes, run
   `pnpm run cli:source -- backlog archive BL-260727-ship-mit-notices-inside --summary "Complete MIT notices now ship in affected package payloads and are enforced by release validation."`
   and require exit 0 with the archived item, completed ledger, and index updated.
2. Retain the XL visual item as the umbrella and create the five exact successor
   IDs listed above: P0 author/critic, P0 adaptive recap, P1 non-linear routing,
   P1 durable backlink/catalog, and P2 additional workflows.
3. Correct the diagram criteria: the inline renderer may reject and reroute
   unsupported topology; it must never silently flatten topology.
4. Run `pnpm run cli:source -- backlog regenerate-index` and require exit 0
   with all five successor IDs linked from the umbrella, then run
   `pnpm format:fix`.
5. Commit as `docs(p01-t02): split explainer visual outcomes`.

**Acceptance:** Each successor has explicit dependencies, acceptance evidence,
and a disposition in or out of this project's critical path.

---

### Task p01-t03: Establish the golden conformance fixture and rubric contract

**Files:**

- Create: `.agents/skills/explainer-kit/tests/fixtures/golden/simple/`
- Create: `.agents/skills/explainer-kit/tests/fixtures/golden/non-linear/`
- Create: `.agents/skills/explainer-kit/tests/fixtures/golden/explainer-authoring-redesign/`
- Create: `.agents/skills/explainer-kit/references/golden-conformance.md`
- Create: `.agents/skills/explainer-kit/tests/golden-conformance.test.mjs`

**Steps:**

1. Import stable source inputs for a simple project, a branched/cyclic
   architecture, and the archived explainer-authoring-redesign recap.
2. Define a machine-readable rubric covering adaptive minimum set, first
   viewport, hierarchy, representation choice, legibility, cohesion, source
   coverage, interactions, topology preservation, catalog parity, and bounded
   correction.
3. Record personal-kit comparison outputs as checked-in reference evidence;
   tests must not depend on the operator's home-directory plugin at runtime.
4. Add RED tests that load all three fixture descriptors and reject missing
   rubric fields or machine-local paths.
5. Run `pnpm format:fix` and
   `node --test .agents/skills/explainer-kit/tests/golden-conformance.test.mjs`;
   commit as `test(p01-t03): define golden recap benchmarks`.

**Acceptance:** Three portable benchmark inputs and one explicit quality oracle
are committed before runtime changes begin; pixel identity is not required.

---

### Task p01-t04: Synchronize the generated public-package version asset

**Files:**

- Modify: `packages/cli/assets/public-package-versions.json`

**Steps:**

1. Add a RED assertion comparing every key in the generated asset with its
   source public-package manifest; require it to fail against the stale asset.
2. Run `bash packages/cli/scripts/bundle-assets.sh` to regenerate the asset from
   the source manifests.
3. Re-run the assertion and require exact `0.2.22` parity for every asset key.
4. Run `pnpm --filter @open-agent-toolkit/cli build` and require exit 0 with no
   subsequent asset diff.
5. Commit as `fix(p01-t04): sync bundled public package versions`.

**Acceptance:** A clean CLI build no longer dirties the tracked public-package
version asset after the lockstep manifest bump.

---

### Task p01-t05: Validate packaged notice provenance

**Files:**

- Modify: `NOTICES.md`
- Modify: `packages/cli/src/release/public-package-contract.ts`
- Modify: `packages/cli/src/release/public-package-contract.test.ts`

**Steps:**

1. Add a RED packed-payload test requiring the canonical source URL and version
   marker for each adapted upstream project in addition to its complete MIT
   body.
2. Replace the visual-explainer plugin label with the canonical
   `https://github.com/nicobailon/visual-explainer` source URL while retaining
   author and version provenance.
3. Extend release notice validation so an omitted URL or version fails against
   the real packed CLI artifact.
4. Run
   `pnpm --filter @open-agent-toolkit/cli exec vitest run src/release/public-package-contract.test.ts`
   and `pnpm release:validate`; require both to exit 0.
5. Commit as `fix(p01-t05): validate packaged notice provenance`.

**Acceptance:** The archived notice acceptance contract is true for every
adapted source and cannot regress while real package validation remains green.

---

### Task p01-t06: Ground golden references in retained evidence

**Files:**

- Modify: `.agents/skills/explainer-kit/tests/fixtures/golden/simple/`
- Modify: `.agents/skills/explainer-kit/tests/fixtures/golden/non-linear/`
- Modify: `.agents/skills/explainer-kit/tests/fixtures/golden/explainer-authoring-redesign/`
- Modify: `.agents/skills/explainer-kit/tests/golden-conformance.test.mjs`
- Modify: `.agents/skills/explainer-kit/references/golden-conformance.md`

**Steps:**

1. Add RED tests proving label-only `reference-met` summaries, missing evidence
   files, hash mismatches, unknown source IDs, invalid graph endpoints,
   unsupported fixture claims, wrong adaptive minimum membership, and missing
   producer metadata cannot pass.
2. Retain representative personal-kit reference outputs and evidence, or
   immutable content-addressed repository evidence, for hub, architecture, and
   deck in every case. Descriptors must enumerate repository-relative files,
   SHA-256 hashes, producer version, generation timestamp, and source IDs.
3. Make rubric evidence pointers resolve to retained artifacts; validate claim
   grounding, exact minimum-set membership, topology node/edge integrity, and
   browser evidence metadata.
4. Remove or source the unsupported simple-case threshold/recovery-task claim.
   Reject POSIX, Windows drive, and UNC absolute machine paths while allowing
   repository-relative paths and supported network URLs.
5. Run
   `node --test .agents/skills/explainer-kit/tests/golden-conformance.test.mjs`
   and require every negative mutation plus all three valid fixtures to pass.
6. Commit as `fix(p01-t06): ground golden conformance evidence`.

**Acceptance:** The benchmark oracle derives from retained, hash-verified,
source-grounded evidence rather than self-attested labels or machine-local
paths.

---

### Task p01-t07: Align the explainer skill version contract

**Files:**

- Modify: `packages/cli/src/validation/skills.test.ts`
- Modify: `tools/smoke/explainer-kit/wrapper-compatibility.test.mjs`

**Steps:**

1. Preserve the RED root-verification evidence showing the version contract
   expected explainer-kit `2.0.0` after p01-t06 correctly bumped it to `2.0.1`.
2. Update the exact explainer-kit version expectations in repository validation
   and wrapper compatibility smoke coverage to `2.0.1`; do not alter any other
   skill-family version.
3. Run
   `pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts`
   and `pnpm test`; require both to exit 0.
4. Commit as `test(p01-t07): align explainer skill version`.

**Acceptance:** The repository-wide skill validation suite agrees with the
required canonical explainer-kit version bump and the full test suite passes.

---

## Phase 2: Set-level visual authoring runtime

### Task p02-t01: Bundle versioned visual authoring and review guidance

**Files:**

- Create: `.agents/skills/explainer-kit/references/visual-authoring.md`
- Create: `.agents/skills/explainer-kit/references/visual-review.md`
- Modify: `.agents/skills/explainer-kit/SKILL.md`
- Modify: `.agents/skills/explainer-kit/tests/rebuildability.test.mjs`

**Steps:**

1. Adapt the MIT-licensed representation-selection, hierarchy, diagram, deck,
   table, responsive-navigation, and visual-review guidance needed by an
   unattended provider.
2. Separate medium-specific authoring rules from the critic rubric and link
   both from the core skill; optional installed visual-explainer capability may
   enhance but cannot be required.
3. Add tests proving bundled installs contain both references and no
   home-directory dependency.
4. Run `pnpm format:fix` and
   `node --test .agents/skills/explainer-kit/tests/rebuildability.test.mjs`.
5. Commit as `feat(p02-t01): bundle visual authoring guidance`.

**Acceptance:** A clean OAT install has sufficient visual guidance to author
and assess every project-recap medium without external plugins.

---

### Task p02-t02: Define provider-neutral set-plan and visual-review contracts

**Files:**

- Create: `.agents/skills/explainer-kit/schemas/set-plan.v1.schema.json`
- Create: `.agents/skills/explainer-kit/schemas/visual-review-request.v1.schema.json`
- Create: `.agents/skills/explainer-kit/schemas/visual-review-result.v1.schema.json`
- Modify: `.agents/skills/explainer-kit/schemas/author-request.v2.schema.json`
- Modify: `.agents/skills/explainer-kit/scripts/lib/contracts.mjs`
- Modify: `.agents/skills/explainer-kit/references/contracts.md`
- Modify: `.agents/skills/explainer-kit/tests/contracts.test.mjs`
- Modify: `.agents/skills/explainer-kit/tests/schemas.test.mjs`

**Steps:**

1. Write RED contract tests for a set plan containing one shared
   terminology/status/number ledger, source coverage, adaptive portfolio,
   per-artifact draft, visual intent, and optional-artifact justification.
2. Define visual-review request/result envelopes that carry rendered evidence,
   shared ledger, rubric findings, artifact IDs, and pass/correct/fail
   disposition without provider-specific fields.
3. Extend author requests compatibly so every artifact receives immutable set
   context and its own planned draft/intent.
4. Run `pnpm format:fix` and
   `node --test .agents/skills/explainer-kit/tests/contracts.test.mjs .agents/skills/explainer-kit/tests/schemas.test.mjs`.
5. Commit as `feat(p02-t02): define explainer set contracts`.

**Acceptance:** Schema validation rejects ledger drift, unjustified optional
artifacts, unknown review dispositions, and author requests detached from set
context.

---

### Task p02-t03: Add one set-planning stage and immutable retained records

**Files:**

- Create: `.agents/skills/explainer-kit/scripts/lib/set-plan.mjs`
- Modify: `.agents/skills/explainer-kit/scripts/run.mjs`
- Modify: `.agents/skills/explainer-kit/scripts/lib/records.mjs`
- Modify: `.agents/skills/explainer-kit/tests/records.test.mjs`
- Modify: `.agents/skills/explainer-kit/tests/run.integration.test.mjs`

**Steps:**

1. Add RED integration tests proving the planner runs once after fact-base
   reconciliation and before any artifact author.
2. Inject a provider-neutral `planSet` seam and validate its result; persist
   request, result, ledger, portfolio, and drafts as immutable versioned
   records.
3. Pass identical set context to every artifact author and fail closed on
   unknown sources, conflicting ledger values, or missing required drafts.
4. Run `pnpm format:fix` and
   `node --test .agents/skills/explainer-kit/tests/records.test.mjs .agents/skills/explainer-kit/tests/run.integration.test.mjs`.
5. Commit as `feat(p02-t03): plan explainer sets before composition`.

**Acceptance:** One validated plan governs the whole artifact set and rebuild
records are sufficient to reproduce every author request.

---

### Task p02-t04: Make project recap an adaptive three-artifact visual set

**Files:**

- Modify: `.agents/skills/explainer-kit/recipes/project-recap.json`
- Modify: `.agents/skills/explainer-kit/scripts/lib/recipes.mjs`
- Modify: `.agents/skills/explainer-kit/scripts/run.mjs`
- Modify: `.agents/skills/explainer-kit/tests/recipes.test.mjs`
- Modify: `.agents/skills/explainer-kit/tests/e2e-recap.test.mjs`

**Steps:**

1. Add RED tests requiring a visual hub, architecture/system visual, and deck
   for every unattended project recap.
2. Permit status, rollout, and deep-dive artifacts only when the set planner
   supplies an allowed, source-backed justification.
3. Route the flagship hub through the artistic house-style composer from its
   planned draft; retain deterministic Markdown as an explicit fallback, not
   the golden path.
4. Run `pnpm format:fix` and
   `node --test .agents/skills/explainer-kit/tests/recipes.test.mjs .agents/skills/explainer-kit/tests/e2e-recap.test.mjs`.
5. Commit as `feat(p02-t04): require adaptive visual recap sets`.

**Acceptance:** Unattended recap output always contains the cohesive adaptive
minimum three, while redundant optional artifacts are rejected.

---

### Task p02-t05: Bind set planning and composition through the OAT adapter

**Files:**

- Modify: `.agents/skills/oat-explainer-kit/SKILL.md`
- Modify: `.agents/skills/oat-explainer-kit/scripts/run.mjs`
- Modify: `.agents/skills/oat-explainer-kit/tests/run.integration.test.mjs`
- Modify: `.agents/skills/oat-explainer-kit/tests/check-core.test.mjs`

**Steps:**

1. Add adapter tests for cardinality and capability checks covering `planSet`
   plus per-artifact author callbacks.
2. Resolve provider execution outside the generic core and bind callbacks with
   the exact shared set context and bundled medium guidance.
3. Fail before composition when unattended recap capability is absent; do not
   silently downgrade to floor artifacts.
4. Run `pnpm format:fix` and
   `node --test .agents/skills/oat-explainer-kit/tests/run.integration.test.mjs .agents/skills/oat-explainer-kit/tests/check-core.test.mjs`.
5. Commit as `feat(p02-t05): bind adaptive recap authors`.

**Acceptance:** Direct core callers and OAT callers share contracts and output
semantics while provider resolution remains adapter-owned.

---

### Task p02-t06: Align integration fixtures with adaptive recap sets

**Files:**

- Modify: `.agents/skills/explainer-kit/tests/run.integration.test.mjs`

**Steps:**

1. Preserve the eight RED failures proving pre-adaptive fixtures still assume
   one Markdown recap instead of the required hub, architecture, and deck.
2. Update fixture planners, author callbacks, retained-path assertions, resume
   checks, QA expectations, and CLI module fixtures to exercise all three
   required HTML artifacts with identical immutable set context.
3. Keep negative tests targeted at their intended contract failure rather than
   allowing an unrelated missing-draft or wrong-content-path error to mask the
   assertion.
4. Run
   `node --test .agents/skills/explainer-kit/tests/run.integration.test.mjs`
   and the union of every Phase p02 focused test; require all to exit 0.
5. Commit as `test(p02-t06): align adaptive recap integration`.

**Acceptance:** Core integration coverage asserts the adaptive-three behavior
without weakening approval, resume, QA, provenance, or fail-closed semantics.

---

### Task p02-t07: Align explainer family version contracts

**Files:**

- Modify: `packages/cli/src/validation/skills.test.ts`
- Modify: `tools/smoke/explainer-kit/wrapper-compatibility.test.mjs`

**Steps:**

1. Preserve RED evidence that repository validation still expects
   `explainer-kit@2.0.1` and `oat-explainer-kit@1.0.2`, and that smoke coverage
   carries the same stale pins.
2. Update only those exact family expectations to
   `explainer-kit@2.0.2` and `oat-explainer-kit@1.0.3`.
3. Run the focused CLI validation test, wrapper compatibility smoke test,
   `pnpm test`, and `pnpm release:validate`; require all to exit 0.
4. Commit as `test(p02-t07): align explainer skill versions`.

**Acceptance:** Canonical skills, repository validation, smoke compatibility,
the full test suite, and packed public-package validation agree on the Phase
p02 versions.

---

### Task p02-t08: Enforce complete reconciled source coverage

**Files:**

- Modify: `.agents/skills/explainer-kit/scripts/lib/set-plan.mjs`
- Modify: `.agents/skills/explainer-kit/tests/records.test.mjs`
- Modify: `.agents/skills/explainer-kit/tests/run.integration.test.mjs`

**Steps:**

1. Add RED tests for a set plan that omits one reconciled non-critic source and
   for a declared source that no portfolio artifact covers.
2. Require the plan-level source set to equal the complete reconciled
   non-critic source set, without duplicates or omissions.
3. Require every declared source to be assigned to at least one portfolio
   artifact while retaining existing unknown-source and required-draft checks.
4. Run the focused record and core integration tests.
5. Commit as `fix(p02-t08): enforce complete source coverage`.

**Acceptance:** A validated set plan cannot silently omit approved evidence at
either the plan or artifact-coverage level.

---

### Task p02-t09: Bind visual review to the complete rendered set

**Files:**

- Modify: `.agents/skills/explainer-kit/schemas/visual-review-request.v1.schema.json`
- Modify: `.agents/skills/explainer-kit/schemas/visual-review-result.v1.schema.json`
- Modify: `.agents/skills/explainer-kit/scripts/lib/contracts.mjs`
- Modify: `.agents/skills/explainer-kit/references/contracts.md`
- Modify: `.agents/skills/explainer-kit/tests/contracts.test.mjs`
- Modify: `.agents/skills/explainer-kit/tests/schemas.test.mjs`

**Steps:**

1. Add RED tests for omitted, extra, and duplicate rendered artifacts; partial
   result artifact IDs; findings detached from the reviewed request; and a
   passing disposition that carries correction findings.
2. Require request rendered-artifact IDs to equal the exact planned portfolio.
3. Bind each result to its request so result artifact IDs equal the reviewed
   set and every finding references an artifact from that set.
4. Make pass/correct/fail disposition semantics internally consistent and keep
   all contracts provider-neutral and closed.
5. Run the focused contract and schema tests.
6. Commit as `fix(p02-t09): bind visual review to full set`.

**Acceptance:** No schema-valid or runtime-valid review can pass a partial or
detached adaptive set.

---

### Task p02-t10: Protect retained set-plan records across resume

**Files:**

- Modify: `.agents/skills/explainer-kit/scripts/run.mjs`
- Modify: `.agents/skills/explainer-kit/scripts/lib/records.mjs`
- Modify: `.agents/skills/explainer-kit/scripts/lib/contracts.mjs`
- Modify: `.agents/skills/explainer-kit/tests/records.test.mjs`
- Modify: `.agents/skills/explainer-kit/tests/run.integration.test.mjs`
- Modify: `.agents/skills/explainer-kit/tests/rebuildability.test.mjs`

**Steps:**

1. Add RED tamper tests for set-plan request, result, ledger, portfolio, drafts,
   artifact identity, retained author/content paths, and cross-record
   projection drift.
2. Include all five set-plan records in immutable hash coverage and manifest
   completeness validation.
3. On resume, validate every retained record, require canonical projections and
   hashes to agree, and bind approval, content, and author identities to the
   validated portfolio through confined paths.
4. Prove a valid resume invokes neither planner nor authors and a tampered
   resume fails before reading or composing untrusted content.
5. Run the focused record, core integration, and rebuildability tests.
6. Commit as `fix(p02-t10): protect retained set plans`.

**Acceptance:** The durable rebuild package includes the complete set plan, and
post-pause mutation cannot alter resumed composition.

---

### Task p02-t11: Deliver bundled authoring guidance to callbacks

**Files:**

- Modify: `.agents/skills/explainer-kit/schemas/author-request.v2.schema.json`
- Modify: `.agents/skills/explainer-kit/scripts/lib/contracts.mjs`
- Modify: `.agents/skills/explainer-kit/scripts/run.mjs`
- Modify: `.agents/skills/explainer-kit/references/contracts.md`
- Modify: `.agents/skills/explainer-kit/tests/contracts.test.mjs`
- Modify: `.agents/skills/explainer-kit/tests/schemas.test.mjs`
- Modify: `.agents/skills/explainer-kit/tests/run.integration.test.mjs`
- Modify: `.agents/skills/oat-explainer-kit/references/author-callback.md`
- Modify: `.agents/skills/oat-explainer-kit/tests/run.integration.test.mjs`

**Steps:**

1. Add RED core and adapter tests proving every author callback receives the
   relevant bundled visual-authoring rules in a closed provider-neutral
   request.
2. Add an explicit author-request guidance field and populate it from
   `references/visual-authoring.md` without ambient or home-directory reads.
3. Update the callback contract for planner-owned portfolios, immutable set
   context, planned artifact identity, and prohibition of author-driven
   expansion after planning.
4. Reject missing or malformed guidance while preserving brief, shell, theme,
   provenance, and author-result contracts.
5. Run the focused contract, schema, core integration, and adapter integration
   tests.
6. Commit as `fix(p02-t11): deliver visual authoring guidance`.

**Acceptance:** Provider-neutral callbacks receive the bundled medium guidance
and accurate planner-owned expansion rules entirely through validated inputs.

---

### Task p02-t12: Add an explicit deterministic recap fallback

**Files:**

- Modify: `.agents/skills/explainer-kit/schemas/run-request.schema.json`
- Modify: `.agents/skills/explainer-kit/recipes/project-recap.json`
- Modify: `.agents/skills/explainer-kit/scripts/lib/contracts.mjs`
- Modify: `.agents/skills/explainer-kit/scripts/lib/recipes.mjs`
- Modify: `.agents/skills/explainer-kit/scripts/run.mjs`
- Modify: `.agents/skills/explainer-kit/references/contracts.md`
- Modify: `.agents/skills/explainer-kit/tests/contracts.test.mjs`
- Modify: `.agents/skills/explainer-kit/tests/schemas.test.mjs`
- Modify: `.agents/skills/explainer-kit/tests/recipes.test.mjs`
- Modify: `.agents/skills/explainer-kit/tests/run.integration.test.mjs`
- Modify: `.agents/skills/explainer-kit/tests/e2e-recap.test.mjs`

**Steps:**

1. Add RED tests for explicit deterministic fallback selection, default
   artistic selection, and prohibition of automatic downgrade after artistic
   author failure.
2. Define a closed, bounded project-recap fallback policy and explicit request
   selection that retains the required adaptive portfolio while choosing the
   deterministic Markdown path.
3. Keep unattended golden runs artistic by default; never reinterpret failure
   as fallback success or silently reduce required artifact cardinality.
4. Retain distinct paths, identities, manifests, and rebuild records for the
   selected mode.
5. Run the focused contract, schema, recipe, core integration, and recap e2e
   tests.
6. Commit as `feat(p02-t12): add explicit recap fallback`.

**Acceptance:** Operators can deliberately select deterministic Markdown while
default unattended recaps remain artistic and never auto-downgrade.

---

### Task p02-t13: Anchor retained set plans to the approval resume boundary

**Files:**

- Modify: `.agents/skills/explainer-kit/scripts/run.mjs`
- Modify: `.agents/skills/explainer-kit/scripts/lib/records.mjs`
- Modify: `.agents/skills/explainer-kit/references/contracts.md`
- Modify: `.agents/skills/explainer-kit/tests/records.test.mjs`
- Modify: `.agents/skills/explainer-kit/tests/run.integration.test.mjs`
- Modify: `.agents/skills/explainer-kit/tests/rebuildability.test.mjs`

**Steps:**

1. Add a RED coordinated-tamper test that changes the retained result, mutable
   request plan hash, portfolio, and drafts consistently, then proves resume
   fails before planner, author, durability, or publish callbacks.
2. Before an interactive run returns incomplete, derive an opaque versioned
   resume token from the run identity and raw-byte hashes of all five retained
   set-plan records, and expose it through the approval result.
3. Require the caller to echo that externally retained token with every
   interactive approval-resume decision. Validate its closed format and compare
   it against the recomputed token before hydrating any retained plan, author,
   or content state; missing or mismatched tokens fail with
   `E_APPROVAL_RESUME`.
4. Keep the trust anchor outside the mutable run root. Do not derive the
   expected value from the retained set-plan, approval, build, or projection
   files being checked.
5. Preserve rejected-correction flow, valid no-replan/no-reauthor resume, and
   complete final manifest immutable coverage. Document the approval-resume
   token handoff and verify deterministic token behavior.
6. Run the focused record, core integration, and rebuildability tests.
7. Commit as `fix(p02-t13): anchor set plan resume`.

**Acceptance:** Coordinated mutation of every currently cross-checked set-plan
record cannot change resumed composition because approval resume is bound to an
external pre-pause token.

---

## Phase 3: Independent browser critic and hard loop cap

### Task p03-t01: Retain browser screenshots and metrics at three viewports

**Files:**

- Modify: `.agents/skills/explainer-kit/scripts/lib/browser-runtime.mjs`
- Modify: `.agents/skills/explainer-kit/scripts/render-qa.mjs`
- Modify: `.agents/skills/explainer-kit/scripts/lib/qa.mjs`
- Modify: `.agents/skills/explainer-kit/tests/browser-runtime.test.mjs`
- Modify: `.agents/skills/explainer-kit/tests/qa.test.mjs`
- Modify: `tools/release/validate-explainer-visuals.mjs`

**Steps:**

1. Add RED tests for desktop, tablet, and mobile screenshot evidence paired
   with existing layout, accessibility, focus, interaction, and overflow
   metrics.
2. Store deterministic evidence metadata and bounded screenshot files under
   the run's QA records; keep binary data out of JSON.
3. Make missing or partial viewport evidence invalid for unattended project
   recaps while preserving explicit lower-tier behavior for other recipes.
4. Run `pnpm format:fix`,
   `node --test .agents/skills/explainer-kit/tests/browser-runtime.test.mjs .agents/skills/explainer-kit/tests/qa.test.mjs`,
   and `pnpm release:validate:visual`.
5. Commit as `feat(p03-t01): retain recap browser evidence`.

**Acceptance:** Every artifact in the adaptive set has reviewable screenshots
and metrics at all three required widths.

---

### Task p03-t02: Add an independent whole-set visual critic

**Files:**

- Create: `.agents/skills/explainer-kit/scripts/lib/visual-review.mjs`
- Modify: `.agents/skills/explainer-kit/scripts/run.mjs`
- Modify: `.agents/skills/explainer-kit/scripts/lib/qa.mjs`
- Modify: `.agents/skills/explainer-kit/tests/qa.test.mjs`
- Modify: `.agents/skills/explainer-kit/tests/run.integration.test.mjs`

**Steps:**

1. Add RED tests proving the visual critic is a distinct callback from the
   fact critic and artifact author and receives the complete rendered set.
2. Review first-viewport clarity, hierarchy, representation choice,
   legibility, polish, medium fit, ledger cohesion, redundancy, source links,
   topology, and interactions against actual browser evidence.
3. Replace the current empty-object cohesion path with evidence derived from
   rendered artifacts plus the shared ledger.
4. Run `pnpm format:fix` and
   `node --test .agents/skills/explainer-kit/tests/qa.test.mjs .agents/skills/explainer-kit/tests/run.integration.test.mjs`.
5. Commit as `feat(p03-t02): add independent visual critic`.

**Acceptance:** A synthetic layout that passes structural QA but violates the
rubric fails the critic with artifact-scoped actionable findings.

---

### Task p03-t03: Enforce exactly one correction pass and final review

**Files:**

- Modify: `.agents/skills/explainer-kit/scripts/run.mjs`
- Modify: `.agents/skills/explainer-kit/scripts/lib/records.mjs`
- Modify: `.agents/skills/explainer-kit/tests/run.integration.test.mjs`
- Modify: `.agents/skills/explainer-kit/tests/records.test.mjs`

**Steps:**

1. Add tests for pass-on-first-review, pass-after-one-correction, and
   fail-after-final-review branches.
2. Correct only failing artifacts, preserving approved content and unchanged
   artifacts; persist both review attempts and the single revision.
3. Make the state machine non-recursive: initial review → at most one
   correction → final review → terminal result.
4. Run `pnpm format:fix` and
   `node --test .agents/skills/explainer-kit/tests/run.integration.test.mjs .agents/skills/explainer-kit/tests/records.test.mjs`.
5. Commit as `feat(p03-t03): cap visual correction at one pass`.

**Acceptance:** Callback counters and retained records prove no execution path
can invoke a second correction or third review.

---

### Task p03-t04: Block publication and durability on missing or failed review

**Files:**

- Modify: `.agents/skills/explainer-kit/SKILL.md`
- Modify: `.agents/skills/explainer-kit/schemas/build-record.schema.json`
- Modify: `.agents/skills/explainer-kit/schemas/manifest.schema.json`
- Modify: `.agents/skills/explainer-kit/scripts/run.mjs`
- Modify: `.agents/skills/explainer-kit/scripts/lib/durability.mjs`
- Modify: `.agents/skills/explainer-kit/scripts/lib/records.mjs`
- Modify: `.agents/skills/explainer-kit/references/contracts.md`
- Modify: `.agents/skills/explainer-kit/tests/durability.test.mjs`
- Modify: `.agents/skills/explainer-kit/tests/contracts.test.mjs`
- Modify: `.agents/skills/explainer-kit/tests/rebuildability.test.mjs`
- Modify: `.agents/skills/explainer-kit/tests/records.test.mjs`
- Modify: `.agents/skills/explainer-kit/tests/run.integration.test.mjs`
- Modify: `.agents/skills/explainer-kit/tests/schemas.test.mjs`
- Modify: `.agents/skills/oat-explainer-kit/scripts/finalize-tracked-run.mjs`
- Modify: `.agents/skills/oat-explainer-kit/references/lifecycle-contract.md`
- Modify: `.agents/skills/oat-explainer-kit/tests/finalize-tracked-run.test.mjs`
- Modify: `packages/cli/src/commands/project/archive/archive-utils.ts`
- Modify: `packages/cli/src/commands/project/archive/archive-utils.test.ts`
- Modify: `packages/cli/src/commands/project/archive/push-runner.ts`
- Modify: `packages/cli/src/commands/project/archive/push-runner.test.ts`

**Steps:**

1. Add RED lifecycle tests for absent browser probe, absent visual critic,
   terminal critic failure, and passing review.
2. Return `built-needs-review` for every incomplete or failed unattended recap;
   preserve artifacts and findings but issue no publish receipt or durability
   attestation.
3. Propagate the terminal status through tracked-run finalization and archive
   manifest validation, recap export, and archive push behavior without
   converting it to success. Keep build-record and manifest outcome contracts
   aligned and document the blocking handoff.
4. Run `pnpm format:fix`,
   `node --test .agents/skills/explainer-kit/tests/contracts.test.mjs .agents/skills/explainer-kit/tests/durability.test.mjs .agents/skills/explainer-kit/tests/rebuildability.test.mjs .agents/skills/explainer-kit/tests/records.test.mjs .agents/skills/explainer-kit/tests/run.integration.test.mjs .agents/skills/explainer-kit/tests/schemas.test.mjs .agents/skills/oat-explainer-kit/tests/finalize-tracked-run.test.mjs`,
   and
   `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/archive/archive-utils.test.ts src/commands/project/archive/push-runner.test.ts`;
   require all commands to exit 0 with no failed tests.
5. Commit as `fix(p03-t04): block unreviewed recap publication`.

**Acceptance:** Only a complete passing browser-plus-critic evidence chain can
publish or attest durability.

---

### Task p03-t05: Align phase-wide visual-review integration fixtures

**Files:**

- Modify: `.agents/skills/explainer-kit/tests/e2e-recap.test.mjs`
- Modify: `.agents/skills/oat-explainer-kit/tests/completion.integration.test.mjs`
- Modify: `.agents/skills/oat-explainer-kit/tests/run.integration.test.mjs`

**Steps:**

1. Preserve RED evidence from the nine deterministic phase-wide failures caused
   by success-path fixtures that omit newly required planner, browser-evidence,
   or visual-review seams, plus the stale author-guidance wording assertion.
2. Update successful unattended recap fixtures to supply deterministic set
   planning, complete three-viewport browser evidence, and a passing
   provider-neutral whole-set visual review. Keep explicit missing/failed review
   cases expecting `built-needs-review`.
3. Align the completion documentation assertion with the current exact
   provider-neutral author-seam contract without weakening its one-seam
   requirement.
4. Preserve the original e2e, richness, fact-critic, and adapter assertions;
   fixture repair must not bypass the browser-plus-critic gate or change
   production behavior.
5. Run
   `node --test .agents/skills/explainer-kit/tests/e2e-recap.test.mjs .agents/skills/oat-explainer-kit/tests/completion.integration.test.mjs .agents/skills/oat-explainer-kit/tests/run.integration.test.mjs`,
   then rerun the complete Phase p03 union.
6. Commit as `test(p03-t05): align visual review fixtures`.

**Acceptance:** The phase-wide union is green because successful lifecycle
fixtures exercise the required visual-review chain, while missing or failed
review evidence still terminates as `built-needs-review`.

---

### Task p03-t06: Bind visual review to exact rendered evidence

**Files:**

- Modify: `.agents/skills/explainer-kit/schemas/visual-review-request.v1.schema.json`
- Modify: `.agents/skills/explainer-kit/schemas/visual-review-result.v1.schema.json`
- Modify: `.agents/skills/explainer-kit/scripts/lib/contracts.mjs`
- Modify: `.agents/skills/explainer-kit/scripts/lib/visual-review.mjs`
- Modify: `.agents/skills/explainer-kit/scripts/run.mjs`
- Modify: `.agents/skills/explainer-kit/references/contracts.md`
- Modify: `.agents/skills/explainer-kit/tests/contracts.test.mjs`
- Modify: `.agents/skills/explainer-kit/tests/schemas.test.mjs`
- Modify: `.agents/skills/explainer-kit/tests/run.integration.test.mjs`

**Steps:**

1. Add RED tests proving a stale unconditional result with matching artifact IDs
   is rejected after rendered, metrics, or screenshot bytes change.
2. Give each review request a deterministic identity and canonical request hash
   covering the plan, rendered artifact hashes, browser metrics hashes, and
   screenshot hashes.
3. Provide confined, provider-neutral evidence inputs that let the callback
   inspect the exact supplied bytes without ambient path discovery.
4. Require every result to echo the request identity/hash and validate the
   complete binding before accepting any disposition or finding.
5. Keep request/result objects closed and preserve exact complete-set
   artifact-ID validation.
6. Run the focused contract, schema, and core integration tests.
7. Commit as `fix(p03-t06): bind visual review evidence`.

**Acceptance:** No stale or content-detached visual-review result can authorize
the rendered package.

---

### Task p03-t07: Require observed whole-set cohesion evidence

**Files:**

- Modify: `.agents/skills/explainer-kit/schemas/set-plan.v1.schema.json`
- Modify: `.agents/skills/explainer-kit/schemas/visual-review-request.v1.schema.json`
- Modify: `.agents/skills/explainer-kit/scripts/lib/contracts.mjs`
- Modify: `.agents/skills/explainer-kit/scripts/lib/qa.mjs`
- Modify: `.agents/skills/explainer-kit/scripts/lib/visual-review.mjs`
- Modify: `.agents/skills/explainer-kit/tests/contracts.test.mjs`
- Modify: `.agents/skills/explainer-kit/tests/qa.test.mjs`
- Modify: `.agents/skills/explainer-kit/tests/run.integration.test.mjs`
- Modify: `.agents/skills/explainer-kit/tests/schemas.test.mjs`

**Steps:**

1. Add RED coverage for structural-QA success combined with an empty shared
   ledger, empty observations, or expected claims not observable in rendered
   artifacts.
2. Require a non-empty applicable terminology/status/numeric ledger for
   unattended adaptive recaps.
3. Derive per-artifact observed cohesion evidence from rendered content, retain
   it in the request, and bind each observation to its artifact and content
   hash.
4. Fail closed when required ledger values are absent, contradictory, or not
   observable; do not default missing cohesion groups to valid empty objects.
5. Preserve explicit lower-tier behavior for recipes without an applicable
   shared ledger.
6. Run the focused schema, contract, QA, and integration tests.
7. Commit as `fix(p03-t07): require observed cohesion`.

**Acceptance:** An adaptive recap cannot pass whole-set review without
non-empty rendered observations supporting its shared ledger.

---

### Task p03-t08: Authenticate and retain the complete review evidence chain

**Files:**

- Modify: `.agents/skills/explainer-kit/schemas/manifest.schema.json`
- Modify: `.agents/skills/explainer-kit/scripts/lib/browser-runtime.mjs`
- Modify: `.agents/skills/explainer-kit/scripts/lib/contracts.mjs`
- Modify: `.agents/skills/explainer-kit/scripts/lib/durability.mjs`
- Modify: `.agents/skills/explainer-kit/scripts/lib/qa.mjs`
- Modify: `.agents/skills/explainer-kit/scripts/lib/records.mjs`
- Modify: `.agents/skills/explainer-kit/scripts/run.mjs`
- Modify: `.agents/skills/explainer-kit/tests/browser-runtime.test.mjs`
- Modify: `.agents/skills/explainer-kit/tests/contracts.test.mjs`
- Modify: `.agents/skills/explainer-kit/tests/durability.test.mjs`
- Modify: `.agents/skills/explainer-kit/tests/e2e-recap.test.mjs`
- Modify: `.agents/skills/explainer-kit/tests/qa.test.mjs`
- Modify: `.agents/skills/explainer-kit/tests/rebuildability.test.mjs`
- Modify: `.agents/skills/explainer-kit/tests/records.test.mjs`
- Modify: `.agents/skills/explainer-kit/tests/run.integration.test.mjs`
- Modify: `.agents/skills/explainer-kit/tests/schemas.test.mjs`
- Modify: `.agents/skills/oat-explainer-kit/tests/completion.integration.test.mjs`
- Modify: `.agents/skills/oat-explainer-kit/tests/run.integration.test.mjs`
- Modify: `packages/cli/src/commands/project/archive/archive-utils.ts`
- Modify: `packages/cli/src/commands/project/archive/archive-utils.test.ts`
- Modify: `tools/release/validate-explainer-visuals.mjs`

**Steps:**

1. Add RED tests for arbitrary text in `.png` files, invalid PNG signatures,
   dimensions mismatching viewport metadata, deleted review evidence, and
   post-review byte mutation.
2. Validate PNG signatures and decoded IHDR dimensions against the retained
   viewport. Retain browser-runtime identity and deterministic capture settings
   without trusting a callback's assertion alone.
3. Use the installed Chromium path in at least one integration fixture; make
   deterministic doubles emit valid PNG bytes that the critic input actually
   reads.
4. Include original screenshots, metrics, per-attempt evidence, review
   requests/results, cohesion observations, and revision records in manifest
   immutable hashes whenever visual review is required.
5. Make core contracts, durability/rebuild validation, and CLI archive
   validation require and verify the complete known evidence chain while
   preserving confined paths and bounded file sizes.
6. Run focused browser, contract, QA, record, integration, rebuildability,
   durability, archive, and visual release validation tests.
7. Commit as `fix(p03-t08): retain authentic review evidence`.

**Acceptance:** Only valid viewport-matched screenshots and an immutable
browser-plus-review evidence chain can authorize durability or archive export.

---

### Task p03-t09: Normalize review-chain failures without exceeding the loop cap

**Files:**

- Modify: `.agents/skills/explainer-kit/scripts/lib/records.mjs`
- Modify: `.agents/skills/explainer-kit/scripts/lib/visual-review.mjs`
- Modify: `.agents/skills/explainer-kit/scripts/run.mjs`
- Modify: `.agents/skills/explainer-kit/tests/durability.test.mjs`
- Modify: `.agents/skills/explainer-kit/tests/records.test.mjs`
- Modify: `.agents/skills/explainer-kit/tests/run.integration.test.mjs`

**Steps:**

1. Add table-driven RED cases for one missing screenshot, malformed metrics,
   thrown or malformed initial/final critic results, a throwing correction
   callback, evidence-copy failure, and noncanonical viewport overrides.
2. Force unattended project recaps to the exact 320/768/1440 evidence tier and
   classify every required-evidence or visual-review contract/runtime failure
   as a review-gate outcome.
3. Persist partial evidence and structured findings/errors in valid manifest
   and build records with exact `built-needs-review` outcomes; invoke neither
   durability nor publish callbacks.
4. Prove callback counts remain bounded to two reviews and one correction on
   every error branch, with retained first-attempt evidence where available.
5. Keep unrelated validation, safety, authoring, and provenance failures as
   generic `failed` outcomes.
6. Run focused records, integration, and durability tests.
7. Commit as `fix(p03-t09): normalize review gate failures`.

**Acceptance:** Every incomplete or failed review-chain branch preserves a
review handoff as `built-needs-review` without a second correction or third
review.

---

### Task p03-t10: Expose first-class OAT browser and visual-review seams

**Files:**

- Modify: `.agents/skills/oat-explainer-kit/SKILL.md`
- Modify: `.agents/skills/oat-explainer-kit/scripts/run.mjs`
- Modify: `.agents/skills/oat-explainer-kit/references/lifecycle-contract.md`
- Create: `.agents/skills/oat-explainer-kit/references/visual-review-callback.md`
- Modify: `.agents/skills/oat-explainer-kit/tests/completion.integration.test.mjs`
- Modify: `.agents/skills/oat-explainer-kit/tests/run.integration.test.mjs`

**Steps:**

1. Add RED adapter tests for direct and module-backed browser-session and
   visual-critic providers, invalid exports, conflicting inputs, and reused
   author/fact-critic/visual-critic identities.
2. Add explicit validated callback/module entry points for browser evidence and
   visual criticism rather than forwarding them through opaque `coreOptions`.
3. Enforce mutual exclusion, provider-neutral request/result contracts,
   distinct role identity, and fail-before-core behavior for missing required
   unattended recap seams.
4. Document the public callback/module contract, complete evidence handoff, and
   `built-needs-review` failure semantics.
5. Update lifecycle fixtures to use only the first-class adapter boundary.
6. Run focused adapter and completion integration tests.
7. Commit as `fix(p03-t10): expose visual review providers`.

**Acceptance:** A normal OAT caller can construct the complete provider-neutral
review chain without private core-option knowledge.

---

### Task p03-t11: Align core manifests with finalization and archive consumers

**Files:**

- Modify: `.agents/skills/explainer-kit/scripts/lib/records.mjs`
- Modify: `.agents/skills/explainer-kit/tests/rebuildability.test.mjs`
- Modify: `.agents/skills/explainer-kit/tests/records.test.mjs`
- Modify: `.agents/skills/oat-explainer-kit/scripts/finalize-tracked-run.mjs`
- Modify: `.agents/skills/oat-explainer-kit/tests/finalize-tracked-run.test.mjs`
- Modify: `packages/cli/src/commands/project/archive/archive-utils.ts`
- Modify: `packages/cli/src/commands/project/archive/archive-utils.test.ts`
- Modify: `packages/cli/src/commands/project/archive/push-runner.ts`
- Modify: `packages/cli/src/commands/project/archive/push-runner.test.ts`

**Steps:**

1. Add a RED core-to-CLI compatibility test that supplies an actual successful
   `runExplainer` manifest and complete retained package to recap export.
2. Define one canonical required package-coverage contract: validate required
   core, set-plan, browser, visual-review, revision, and rendered paths while
   allowing valid required extras instead of demanding a reduced hand-built
   exact set.
3. Make finalization, archive export, and push verify the canonical coverage and
   reject `built-needs-review` without converting it to success.
4. Add the missing rebuild and push-path assertions for passing and blocked
   evidence chains, preserving exact terminal outcomes.
5. Run focused records, rebuildability, finalization, archive-utils, and
   push-runner tests.
6. Commit as `fix(p03-t11): align review package consumers`.

**Acceptance:** A real passing core package can finalize and archive, while a
review-incomplete or mutated evidence package cannot.

---

### Task p03-t12: Preserve interactive recap package compatibility

**Files:**

- Modify: `.agents/skills/explainer-kit/scripts/lib/records.mjs`
- Modify: `.agents/skills/explainer-kit/tests/records.test.mjs`
- Modify: `.agents/skills/explainer-kit/tests/run.integration.test.mjs`
- Modify: `.agents/skills/oat-explainer-kit/scripts/finalize-tracked-run.mjs`
- Modify: `.agents/skills/oat-explainer-kit/tests/finalize-tracked-run.test.mjs`
- Modify: `packages/cli/src/commands/project/archive/archive-utils.ts`
- Modify: `packages/cli/src/commands/project/archive/archive-utils.test.ts`

**Steps:**

1. Add RED compatibility cases proving that a successful interactive project
   recap can omit browser and visual-review records across core manifest
   writing, tracked-run finalization, and archive verification.
2. Derive the visual-review coverage tier from the hash-verified
   `run-request.json` mode rather than from the recipe and outcome alone.
3. Require the set-plan package for every successful project recap, require the
   complete first visual-review attempt for unattended recaps, and continue to
   reject any partially recorded visual-review chain in either mode.
4. Preserve the strict attempt-2 revision/evidence contract whenever second-pass
   evidence is recorded.
5. Rerun the complete Phase p03 union; require the two interactive regressions
   to pass without weakening any unattended fail-closed case.
6. Commit as `fix(p03-t12): preserve interactive recap coverage`.

**Acceptance:** Interactive recaps remain compatible without unattended review
evidence, while unattended and partially recorded evidence packages remain
fail-closed in every consumer.

---

### Task p03-t13: Align the OAT explainer skill version assertion

**Files:**

- Modify: `packages/cli/src/validation/skills.test.ts`

**Steps:**

1. Update the bundled-skill family assertion from `oat-explainer-kit@1.0.3` to
   the canonical p03-t10 version `1.0.4`.
2. Run the focused CLI skill-validation test and require the complete file to
   pass.
3. Commit as `test(p03-t13): align oat explainer skill version`.

**Acceptance:** Repository validation expects the canonical shipped
`oat-explainer-kit` version and no longer blocks the full Phase p03 gate.

---

### Task p03-t14: Preserve incomplete visual-review handoff manifests

**Files:**

- Modify: `.agents/skills/explainer-kit/scripts/lib/records.mjs`
- Modify: `.agents/skills/explainer-kit/tests/records.test.mjs`
- Modify: `.agents/skills/explainer-kit/tests/run.integration.test.mjs`

**Steps:**

1. Add a RED manifest-coverage case for an unattended `built-needs-review`
   package that retains a deliberately partial first or second review attempt.
2. Restrict complete visual-review coverage enforcement to successful
   `built-not-durable` and `built-durable` recap packages.
3. Preserve partial evidence and structured review errors in
   `built-needs-review` handoff manifests; finalization and archive consumers
   continue to reject that terminal outcome before treating it as success.
4. Keep successful unattended packages and successful packages in either mode
   with any partially recorded review chain fail-closed.
5. Rerun records and core integration tests, then the complete Phase p03 union.
6. Commit as `fix(p03-t14): preserve review handoff manifests`.

**Acceptance:** Review-gate failures remain valid, inspectable
`built-needs-review` handoffs without weakening immutable coverage for any
successful package.

---

## Phase 4: Topology, backlinks, and catalog integrity

### Task p04-t01: Detect and reroute non-linear diagrams

**Files:**

- Modify: `.agents/skills/explainer-kit/scripts/lib/diagram.mjs`
- Modify: `.agents/skills/explainer-kit/scripts/lib/recipes.mjs`
- Modify: `.agents/skills/explainer-kit/tests/diagram.test.mjs`
- Modify: `.agents/skills/explainer-kit/tests/e2e-recap.test.mjs`

**Steps:**

1. Add RED fixtures for branch, fan-in, and cycle topology and a negative test
   for silent linear flattening.
2. Detect unsupported topology before inline rendering and route that artifact
   to the artistic composer with the original graph semantics.
3. Keep the inline renderer for supported linear flows; do not implement a
   general graph-layout engine.
4. Run `pnpm format:fix` and
   `node --test .agents/skills/explainer-kit/tests/diagram.test.mjs .agents/skills/explainer-kit/tests/e2e-recap.test.mjs`.
5. Commit as `fix(p04-t01): reroute non-linear diagrams`.

**Acceptance:** Branches, fan-ins, and cycles are either preserved by artistic
composition or rejected; none are silently serialized.

---

### Task p04-t02: Emit commit-pinned source backlinks

**Files:**

- Modify: `.agents/skills/explainer-kit/schemas/fact-base.schema.json`
- Modify: `.agents/skills/explainer-kit/scripts/lib/fact-base.mjs`
- Modify: `.agents/skills/explainer-kit/scripts/lib/render.mjs`
- Modify: `.agents/skills/explainer-kit/tests/fact-base.test.mjs`
- Modify: `.agents/skills/explainer-kit/tests/render.test.mjs`
- Modify: `.agents/skills/oat-explainer-kit/scripts/run.mjs`

**Steps:**

1. Add tests for repository identity, commit SHA, path, line range, URL
   encoding, and archive-safe absolute links.
2. Have the adapter resolve the reviewed commit and let the core derive pinned
   GitHub blob URLs from manifest/fact-base provenance.
3. Render backlinks from claims and artifact source sections without relying
   on moving branches or local paths.
4. Run `pnpm format:fix` and
   `node --test .agents/skills/explainer-kit/tests/fact-base.test.mjs .agents/skills/explainer-kit/tests/render.test.mjs .agents/skills/oat-explainer-kit/tests/run.integration.test.mjs`;
   require exit 0 with no failed tests.
5. Commit as `feat(p04-t02): add commit-pinned recap backlinks`.

**Acceptance:** Every source-backed claim can resolve to immutable reviewed
source after project archival.

---

### Task p04-t03: Generate and publish a manifest-derived initiative catalog

**Files:**

- Create: `.agents/skills/explainer-kit/scripts/lib/catalog.mjs`
- Modify: `.agents/skills/explainer-kit/scripts/lib/s3-static.mjs`
- Modify: `.agents/skills/explainer-kit/schemas/manifest.schema.json`
- Modify: `.agents/skills/explainer-kit/tests/s3-static.test.mjs`
- Modify: `.agents/skills/explainer-kit/tests/e2e-recap.test.mjs`

**Steps:**

1. Add RED tests for `initiatives/<slug>/catalog.json`, exact manifest
   artifact parity, absolute artifact URLs, source backlinks, and stale entry
   rejection.
2. Generate the catalog from the finalized manifest only; never maintain a
   second hand-authored inventory.
3. Upload catalog and artifacts atomically enough that no successful receipt
   references missing objects.
4. Run `pnpm format:fix` and
   `node --test .agents/skills/explainer-kit/tests/s3-static.test.mjs .agents/skills/explainer-kit/tests/e2e-recap.test.mjs`.
5. Commit as `feat(p04-t03): publish initiative artifact catalog`.

**Acceptance:** Catalog contents equal the finalized manifest and all emitted
URLs resolve in local connector tests.

---

## Phase 5: Golden conformance and release closure

### Task p05-t01: Pass the simple-project golden benchmark

**Files:**

- Generate via rebuilt runtime: outputs under `.agents/skills/explainer-kit/tests/fixtures/golden/simple/`
- Modify: `.agents/skills/explainer-kit/tests/golden-conformance.test.mjs`

**Steps:**

1. Run the rebuilt unattended path against the simple fixture with real
   Chromium and the independent critic.
2. Have the rebuilt runtime generate representative HTML, screenshots, metrics,
   review result, and rubric evaluation with volatile values normalized.
   Never hand-edit generated outputs to satisfy the oracle.
3. Compare with the checked-in personal-kit oracle. The permitted “one
   correction” is the p03-t03 runtime author-correction transition. If a
   Critical/Important implementation defect remains, leave the benchmark red
   and append one bounded fix task to the owning runtime phase before
   regenerating evidence.
4. Run `pnpm format:fix` and
   `node --test --test-name-pattern='simple' .agents/skills/explainer-kit/tests/golden-conformance.test.mjs`;
   require exit 0 with the simple case passing and the other named cases skipped.
5. Commit as `test(p05-t01): pass simple recap benchmark`.

**Acceptance:** The adaptive minimum set passes on first review or one
correction and is understandable from its first viewport.

---

### Task p05-t02: Pass the non-linear architecture golden benchmark

**Files:**

- Generate via rebuilt runtime: outputs under `.agents/skills/explainer-kit/tests/fixtures/golden/non-linear/`
- Modify: `.agents/skills/explainer-kit/tests/golden-conformance.test.mjs`

**Steps:**

1. Run the branched/cyclic fixture end to end with real Chromium.
2. Prove topology preservation, artistic routing, full adaptive set,
   interaction integrity, catalog parity, and source-link resolution.
3. Treat one correction only as the p03-t03 runtime author-correction
   transition; never hand-edit generated outputs. If a Critical/Important
   implementation defect remains, leave the benchmark red and append one
   bounded fix task to the owning runtime phase before regenerating evidence.
4. Run `pnpm format:fix` and
   `node --test --test-name-pattern='non-linear' .agents/skills/explainer-kit/tests/golden-conformance.test.mjs`;
   require exit 0 with the non-linear case passing and the other named cases skipped.
5. Commit as `test(p05-t02): pass non-linear recap benchmark`.

**Acceptance:** No branch, fan-in, or cycle is flattened and the critic passes
within the runtime loop cap.

---

### Task p05-t03: Pass the archived project golden benchmark

**Files:**

- Generate via rebuilt runtime: outputs under `.agents/skills/explainer-kit/tests/fixtures/golden/explainer-authoring-redesign/`
- Modify: `.agents/skills/explainer-kit/tests/golden-conformance.test.mjs`

**Steps:**

1. Rebuild from archived explainer-authoring-redesign evidence with no active
   project dependency.
2. Verify first-viewport clarity, set cohesion, source backlinks, archive-safe
   catalog links, screenshot evidence, and bounded review history.
3. Treat one correction only as the p03-t03 runtime author-correction
   transition; never hand-edit generated outputs. If a Critical/Important
   implementation defect remains, leave the benchmark red and append one
   bounded fix task to the owning runtime phase before regenerating evidence.
4. Run `pnpm format:fix` and
   `node --test --test-name-pattern='explainer-authoring-redesign' .agents/skills/explainer-kit/tests/golden-conformance.test.mjs`;
   require exit 0 with the archived case passing and the other named cases skipped.
5. Commit as `test(p05-t03): pass archived recap benchmark`.

**Acceptance:** The complete archived set passes the oracle without local,
branch-moving, or unpublished-link dependencies.

---

### Task p05-t04: Close versions, documentation, and release validation

**Files:**

- Modify: every changed canonical skill's `SKILL.md` version once
- Modify: affected docs under `apps/oat-docs/docs/`
- Regenerate: `apps/oat-docs/index.md`
- Archive: `.oat/repo/pjm/backlog/items/BL-260728-unattended-visual-author-critic.md`
- Archive: `.oat/repo/pjm/backlog/items/BL-260728-cohesive-adaptive-recap-set.md`
- Archive: `.oat/repo/pjm/backlog/items/BL-260728-non-linear-diagram-routing.md`
- Archive: `.oat/repo/pjm/backlog/items/BL-260728-durable-backlinks-catalog.md`
- Modify: `.oat/repo/pjm/backlog/completed.md`
- Regenerate: `.oat/repo/pjm/backlog/index.md`

**Steps:**

1. Document set planning, adaptive-three semantics, critic independence,
   screenshot evidence, correction cap, `built-needs-review`, non-linear
   routing, pinned backlinks, and catalog output.
2. Bump each changed canonical skill version once; public-package versions were
   already bumped atomically in p01-t01.
3. Archive the four shipped successor backlog items with
   `pnpm run cli:source -- backlog archive <id> --summary "<verified outcome>"`
   for each exact ID listed in Files. Require all four commands to exit 0 and
   leave only `BL-260728-additional-visual-workflows` open under the original
   umbrella.
4. Regenerate the docs index and run `pnpm format:fix`.
5. Run `pnpm check`, `pnpm lint`, `pnpm format`, `pnpm type-check`,
   `pnpm test`, `pnpm build`, `pnpm build:docs`, and mandatory
   `pnpm release:validate`; require every command to exit 0.
6. Commit as `chore(p05-t04): close explainer quality release`.

**Acceptance:** All three golden cases and normal repository/release gates pass;
lower-severity visual enhancements are explicitly backlogged, not routed into
another review cycle.

---

## Reviews

| Scope  | Type     | Status          | Date       | Artifact                               |
| ------ | -------- | --------------- | ---------- | -------------------------------------- |
| p01    | code     | passed          | 2026-07-28 | reviews/20260728-p01-code-review.md    |
| p02    | code     | fixes_completed | 2026-07-28 | reviews/20260728-p02-code-review.md    |
| p02    | code     | fixes_completed | 2026-07-28 | reviews/20260728-p02-code-review-r1.md |
| p02    | code     | passed          | 2026-07-28 | reviews/20260728-p02-code-review-r2.md |
| p03    | code     | fixes_added     | 2026-07-28 | reviews/20260728-p03-code-review.md    |
| p04    | code     | pending         | -          | -                                      |
| p05    | code     | pending         | -          | -                                      |
| final  | code     | pending         | -          | -                                      |
| spec   | artifact | pending         | -          | -                                      |
| design | artifact | pending         | -          | -                                      |
| plan   | artifact | passed          | 2026-07-28 | -                                      |

**Status values:** `pending` → `received` → `fixes_added` →
`fixes_completed` → `passed`.

The imported plan review is the single pre-implementation design/plan review
authorized by the source. It used one remediation pass; the final exact
checklist correction was root-verified mechanically without another model
review. The normal final code review is the single bounded post-benchmark
review. The 2026-07-28 operator override permits up to three bounded
block-fix-review retries for phase/code reviews; it does not authorize
additional unrelated review cycles.

---

## Implementation Complete

**Summary:**

- Phase 1: 7 tasks — compliance, bounded outcomes, quality oracle, generated parity, and review fixes
- Phase 2: 13 tasks — bundled guidance, contracts, adaptive runtime, verification fixes, and review remediation
- Phase 3: 11 tasks — browser evidence, independent critic, loop cap, lifecycle gate, integration alignment, and review remediation
- Phase 4: 3 tasks — topology routing, pinned backlinks, generated catalog
- Phase 5: 4 tasks — three benchmark cases and release closure

**Total: 38 tasks**

Implementation is not complete. This section records the completion target and
must be updated with evidence when all tasks and reviews pass.

---

## References

- Imported source: `references/imported-plan.md`
- Original source path:
  `/Users/thomas.stang/.cursor/plans/golden-visual-quality-33154d65.plan.md`
- Merged foundation: `1151a0d7` / PR #179
- Golden workflow oracle:
  `/Users/thomas.stang/.agents/skills/personal-explainer-kit/SKILL.md`
- Archived foundation summary:
  `.oat/repo/reference/project-summaries/20260728-explainer-authoring-redesign.md`
- Licensing backlog:
  `.oat/repo/pjm/backlog/items/BL-260727-ship-mit-notices-inside.md`
- Visual umbrella backlog:
  `.oat/repo/pjm/backlog/items/BL-260727-close-the-explainer-kit-visual.md`
