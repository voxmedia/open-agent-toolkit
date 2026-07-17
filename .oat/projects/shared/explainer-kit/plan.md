---
oat_plan_source: spec-driven
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-07-17
oat_phase: plan
oat_phase_status: complete
oat_plan_parallel_groups: []
oat_plan_hill_phases: ['p05']
oat_auto_review_at_hill_checkpoints: true
oat_import_reference: null
oat_import_source_path: null
oat_import_provider: null
oat_generated: false
oat_template: false
---

# Implementation Plan: explainer-kit

> Execute this plan using `oat-project-implement`. The phases are sequential
> because each consumes contracts or lifecycle behavior established earlier.

**Goal:** Ship a destination-blind `explainer-kit` core and an OAT lifecycle
adapter with stable contracts, neutral visual assets, honest durability,
archive-safe project recaps, and release-candidate acceptance evidence.

**Architecture:** Runtime logic and assets live inside the canonical core skill.
The adapter resolves OAT config/state and invokes the same versioned request,
manifest, build-record, durability, and publish contracts used by direct and
private callers.

**Tech Stack:** Node.js 22 ESM (`.mjs`), JSON Schema, Bash where retained from
the reference implementation, TypeScript 5.8 for CLI/control-plane integration,
Vitest/Node test runner, Playwright/browser QA, pnpm/Turborepo, AWS CLI.

**Commit Convention:** `{type}(pNN-tNN): {description}`

**Atomic Staging Rule:** Every task must stage only the exact paths listed in
that task's **Files** section. Directory-wide pathspecs are prohibited when
they could include work from another task.

## Planning Checklist

- [x] Defer HiLL checkpoint confirmation to `oat-project-implement`
- [x] Evaluated phases for parallelism; all phases are sequential dependencies
- [x] User confirmed the phase/task breakdown
- [x] Complete dispatch ladder verified
- [x] Project dispatch policy recorded: managed `high`
- [x] Optional Phase gate review disabled by user
- [x] Managed structured pre-gate plan review passed
- [x] Cross-family gate explicitly waived by the user after manual review and
      acceptance of the late artifact's fixes

## Parallelism

No parallel phase group is proposed. Phase 2 consumes Phase 1 contracts and pack
layout; Phase 3 consumes the core; Phase 4 consumes core/adapter integration;
Phase 5 consumes one frozen release candidate.

## Phase 1: Contracts, configuration, and packaged skeleton

**Milestone:** Both public skills install from their intended packs, strict v1
contracts validate, and OAT config/state can represent lifecycle intent.

### Task p01-t01: Scaffold canonical skills and register both packs

**Files:**

- Create: `.agents/skills/explainer-kit/SKILL.md`
- Create: `.agents/skills/oat-explainer-kit/SKILL.md`
- Modify: `packages/cli/src/commands/init/tools/shared/skill-manifest.ts`
- Modify: `packages/cli/scripts/bundle-assets.sh`
- Modify: `packages/cli/src/commands/init/tools/shared/bundle-consistency.test.ts`
- Modify: `packages/cli/src/validation/skills.test.ts`

**Step 1: Write test (RED)**

Add expectations that `explainer-kit` is in `UTILITY_SKILLS`,
`oat-explainer-kit` is in `WORKFLOW_SKILLS`, both are bundled, and canonical
frontmatter starts at version `1.0.0`.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared/bundle-consistency.test.ts src/validation/skills.test.ts`
Expected: New pack/bundle assertions fail.

**Step 2: Implement (GREEN)**

Create minimal canonical skills with responsibilities, dependency direction,
and asset-relative path rules; register both pack entries and bundler paths.

**Step 3: Format**

Run: `pnpm exec oxfmt --write .agents/skills/explainer-kit/SKILL.md .agents/skills/oat-explainer-kit/SKILL.md packages/cli/src/commands/init/tools/shared/skill-manifest.ts packages/cli/src/commands/init/tools/shared/bundle-consistency.test.ts packages/cli/src/validation/skills.test.ts`

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared/bundle-consistency.test.ts src/validation/skills.test.ts`
Expected: Both skills are valid and pack/bundle lists agree.

**Step 5: Commit**

```bash
git add .agents/skills/explainer-kit/SKILL.md .agents/skills/oat-explainer-kit/SKILL.md packages/cli/src/commands/init/tools/shared/skill-manifest.ts packages/cli/scripts/bundle-assets.sh packages/cli/src/commands/init/tools/shared/bundle-consistency.test.ts packages/cli/src/validation/skills.test.ts
git commit -m "feat(p01-t01): scaffold explainer skill family"
```

### Task p01-t02: Define strict versioned contract schemas

**Files:**

- Create: `.agents/skills/explainer-kit/schemas/run-request.schema.json`
- Create: `.agents/skills/explainer-kit/schemas/fact-base.schema.json`
- Create: `.agents/skills/explainer-kit/schemas/theme.schema.json`
- Create: `.agents/skills/explainer-kit/schemas/manifest.schema.json`
- Create: `.agents/skills/explainer-kit/schemas/build-record.schema.json`
- Create: `.agents/skills/explainer-kit/schemas/durability-evidence.schema.json`
- Create: `.agents/skills/explainer-kit/schemas/publish-request.schema.json`
- Create: `.agents/skills/explainer-kit/schemas/publish-receipt.schema.json`
- Create: `.agents/skills/explainer-kit/tests/schemas.test.mjs`

**Step 1: Write test (RED)**

Cover required schema IDs and closed object shapes for every versioned
contract, including `DurabilityEvidenceRequestV1`; cover shared outcome enums,
path fields, render strategy persistence, durability evidence arrays, and
receipt artifact uniqueness declarations.

Run: `node --test .agents/skills/explainer-kit/tests/schemas.test.mjs`
Expected: Tests fail because schemas do not exist.

**Step 2: Implement (GREEN)**

Encode the design's exact v1 data models as closed JSON Schemas. Keep
cross-record and filesystem rules for p01-t06.

**Step 3: Format**

Run: `pnpm exec oxfmt --write .agents/skills/explainer-kit/schemas .agents/skills/explainer-kit/tests/schemas.test.mjs`

**Step 4: Verify**

Run: `node --test .agents/skills/explainer-kit/tests/schemas.test.mjs`
Expected: Schema structure and identity cases pass.

**Step 5: Commit**

```bash
git add .agents/skills/explainer-kit/schemas/run-request.schema.json .agents/skills/explainer-kit/schemas/fact-base.schema.json .agents/skills/explainer-kit/schemas/theme.schema.json .agents/skills/explainer-kit/schemas/manifest.schema.json .agents/skills/explainer-kit/schemas/build-record.schema.json .agents/skills/explainer-kit/schemas/durability-evidence.schema.json .agents/skills/explainer-kit/schemas/publish-request.schema.json .agents/skills/explainer-kit/schemas/publish-receipt.schema.json .agents/skills/explainer-kit/tests/schemas.test.mjs
git commit -m "feat(p01-t02): define explainer v1 schemas"
```

### Task p01-t03: Register typed explainer configuration

**Files:**

- Modify: `packages/cli/src/config/oat-config.ts`
- Modify: `packages/cli/src/config/oat-config.test.ts`
- Modify: `packages/cli/src/config/resolve.ts`
- Modify: `packages/cli/src/config/resolve.test.ts`
- Modify: `packages/cli/src/commands/config/index.ts`
- Modify: `packages/cli/src/commands/config/index.test.ts`

**Step 1: Write test (RED)**

Add table-driven cases for all ten `explainers.*` and
`workflow.explainers.*` keys: type, scope, default, source precedence,
repository-relative shared theme paths, and shared-only publish roots.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/config/oat-config.test.ts src/config/resolve.test.ts src/commands/config/index.test.ts`
Expected: New keys are unknown or unresolved.

**Step 2: Implement (GREEN)**

Extend `OatConfig`, defaults, parser/serializer, config key metadata, and
`get/set/list/describe` behavior without adding artifact-root keys.

**Step 3: Format**

Run: `pnpm exec oxfmt --write packages/cli/src/config/oat-config.ts packages/cli/src/config/oat-config.test.ts packages/cli/src/config/resolve.ts packages/cli/src/config/resolve.test.ts packages/cli/src/commands/config/index.ts packages/cli/src/commands/config/index.test.ts`

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/config/oat-config.test.ts src/config/resolve.test.ts src/commands/config/index.test.ts`
Expected: Every key is discoverable and invalid scope/value cases fail.

**Step 5: Commit**

```bash
git add packages/cli/src/config/oat-config.ts packages/cli/src/config/oat-config.test.ts packages/cli/src/config/resolve.ts packages/cli/src/config/resolve.test.ts packages/cli/src/commands/config/index.ts packages/cli/src/commands/config/index.test.ts
git commit -m "feat(p01-t03): register typed explainer config"
```

### Task p01-t04: Add explainer intent to project state

**Files:**

- Modify: `packages/control-plane/src/types.ts`
- Modify: `packages/control-plane/src/project.ts`
- Modify: `packages/control-plane/src/state/parser.ts`
- Modify: `packages/control-plane/src/state/parser.test.ts`
- Modify: `packages/control-plane/src/project.test.ts`
- Modify: `packages/cli/src/validation/project-state.ts`
- Modify: `packages/cli/src/validation/project-state.test.ts`

**Step 1: Write test (RED)**

Cover nullable explainer/recap decisions, valid sources/timestamps, absent-field
compatibility, unknown keys, invalid source/decision pairs, and autonomous
recap `skip` rejection.

Run: `pnpm --filter @open-agent-toolkit/control-plane exec vitest run src/state/parser.test.ts src/project.test.ts && pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/project-state.test.ts`
Expected: New state fields are unavailable or rejected.

**Step 2: Implement (GREEN)**

Add `ExplainerDecisionV1` and optional `oat_project_explainer` /
`oat_project_recap` parsing and CLI validation.

**Step 3: Format**

Run: `pnpm exec oxfmt --write packages/control-plane/src/types.ts packages/control-plane/src/project.ts packages/control-plane/src/state/parser.ts packages/control-plane/src/state/parser.test.ts packages/control-plane/src/project.test.ts packages/cli/src/validation/project-state.ts packages/cli/src/validation/project-state.test.ts`

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/control-plane exec vitest run src/state/parser.test.ts src/project.test.ts && pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/project-state.test.ts`
Expected: Old projects remain valid and intent invariants pass.

**Step 5: Commit**

```bash
git add packages/control-plane/src/types.ts packages/control-plane/src/project.ts packages/control-plane/src/state/parser.ts packages/control-plane/src/state/parser.test.ts packages/control-plane/src/project.test.ts packages/cli/src/validation/project-state.ts packages/cli/src/validation/project-state.test.ts
git commit -m "feat(p01-t04): model explainer lifecycle intent"
```

### Task p01-t05: Enforce packaged core dependency compatibility

**Files:**

- Create: `.agents/skills/oat-explainer-kit/scripts/check-core.mjs`
- Create: `.agents/skills/oat-explainer-kit/tests/check-core.test.mjs`
- Modify: `.agents/skills/oat-explainer-kit/SKILL.md`
- Modify: `packages/cli/src/commands/init/tools/utility/install-utility.test.ts`
- Modify: `packages/cli/src/commands/init/tools/workflows/install-workflows.test.ts`

**Step 1: Write test (RED)**

Cover compatible installed core, missing core, old major/minor, source-tree-only
false positives, and exact utility-pack install/update guidance.

Run: `node --test .agents/skills/oat-explainer-kit/tests/check-core.test.mjs`
Expected: Dependency checks do not exist.

**Step 2: Implement (GREEN)**

Implement `checkCoreCompatibility({ adapterRoot, minimumVersion })` using only
installed canonical paths and document fail-closed adapter behavior.

**Step 3: Format**

Run: `pnpm exec oxfmt --write .agents/skills/oat-explainer-kit packages/cli/src/commands/init/tools/utility/install-utility.test.ts packages/cli/src/commands/init/tools/workflows/install-workflows.test.ts`

**Step 4: Verify**

Run: `node --test .agents/skills/oat-explainer-kit/tests/check-core.test.mjs && pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/utility/install-utility.test.ts src/commands/init/tools/workflows/install-workflows.test.ts`
Expected: Installed-layout dependency behavior passes.

**Step 5: Commit**

```bash
git add .agents/skills/oat-explainer-kit/scripts/check-core.mjs .agents/skills/oat-explainer-kit/tests/check-core.test.mjs .agents/skills/oat-explainer-kit/SKILL.md packages/cli/src/commands/init/tools/utility/install-utility.test.ts packages/cli/src/commands/init/tools/workflows/install-workflows.test.ts
git commit -m "feat(p01-t05): enforce explainer core compatibility"
```

### Task p01-t06: Implement contract and safe-path validation

**Files:**

- Create: `.agents/skills/explainer-kit/scripts/lib/contracts.mjs`
- Create: `.agents/skills/explainer-kit/scripts/lib/safe-paths.mjs`
- Create: `.agents/skills/explainer-kit/scripts/validate.mjs`
- Create: `.agents/skills/explainer-kit/tests/contracts.test.mjs`

**Step 1: Write test (RED)**

Cover valid v1 fixtures plus unknown versions/keys, unsafe relative paths and
symlink escapes, incomplete publish blocks, invalid render strategy, duplicate
artifact paths, canonical hashes, cross-record mismatch, raw-secret fields,
and direct validation of the `durability-evidence` contract kind.

Run: `node --test .agents/skills/explainer-kit/tests/contracts.test.mjs`
Expected: Runtime contract validation does not exist.

**Step 2: Implement (GREEN)**

Implement `validateContract(kind, value)`, canonical hashing, and root-confined
path resolution. Return structured path/code/message errors without reading
ambient config.

**Step 3: Format**

Run: `pnpm exec oxfmt --write .agents/skills/explainer-kit/scripts/lib/contracts.mjs .agents/skills/explainer-kit/scripts/lib/safe-paths.mjs .agents/skills/explainer-kit/scripts/validate.mjs .agents/skills/explainer-kit/tests/contracts.test.mjs`

**Step 4: Verify**

Run: `node --test .agents/skills/explainer-kit/tests/contracts.test.mjs`
Expected: Positive, negative, path, hash, and cross-record cases pass.

**Step 5: Commit**

```bash
git add .agents/skills/explainer-kit/scripts/lib/contracts.mjs .agents/skills/explainer-kit/scripts/lib/safe-paths.mjs .agents/skills/explainer-kit/scripts/validate.mjs .agents/skills/explainer-kit/tests/contracts.test.mjs
git commit -m "feat(p01-t06): validate explainer contracts"
```

## Phase 2: Core pipeline, themes, rendering, and durability

**Milestone:** Direct packaged-core build-only runs produce complete,
schema-valid packages for both canonical recipes without OAT config.

### Task p02-t01: Normalize run requests and create atomic run records

**Files:**

- Create: `.agents/skills/explainer-kit/scripts/lib/fs-safe.mjs`
- Create: `.agents/skills/explainer-kit/scripts/lib/records.mjs`
- Create: `.agents/skills/explainer-kit/tests/records.test.mjs`

**Step 1: Write test (RED)**

Cover output-root containment, symlink/traversal rejection, slug normalization,
privacy-safe request persistence, monotonic stages, interruption-safe temp
files, and incomplete/failed initial outcomes.

Run: `node --test .agents/skills/explainer-kit/tests/records.test.mjs`
Expected: Record helpers are missing.

**Step 2: Implement (GREEN)**

Implement `initializeRun(request)`, `updateBuildRecord(run, stage)`, and
`writeManifestAtomic(run, manifest)`.

**Step 3: Format**

Run: `pnpm exec oxfmt --write .agents/skills/explainer-kit/scripts/lib .agents/skills/explainer-kit/tests/records.test.mjs`

**Step 4: Verify**

Run: `node --test .agents/skills/explainer-kit/tests/records.test.mjs`
Expected: Filesystem and record state tests pass.

**Step 5: Commit**

```bash
git add .agents/skills/explainer-kit/scripts/lib/fs-safe.mjs .agents/skills/explainer-kit/scripts/lib/records.mjs .agents/skills/explainer-kit/tests/records.test.mjs
git commit -m "feat(p02-t01): add atomic explainer run records"
```

### Task p02-t02: Implement reconciled fact-base processing

**Files:**

- Create: `.agents/skills/explainer-kit/scripts/lib/fact-base.mjs`
- Create: `.agents/skills/explainer-kit/references/fact-base-contract.md`
- Create: `.agents/skills/explainer-kit/tests/fact-base.test.mjs`

**Step 1: Write test (RED)**

Cover supplied-base consistency/freshness checks, federated source precedence,
contradiction classification, operator overrides, citations, and unresolved
claims. Assert that federated processing invokes a provider-neutral critic
callback and incorporates its result, while supplied fact bases run only the
documented lightweight consistency/freshness check.

Run: `node --test .agents/skills/explainer-kit/tests/fact-base.test.mjs`
Expected: Fact-base processor is missing.

**Step 2: Implement (GREEN)**

Implement supplied/federated normalization and a provider-neutral critic
execution seam without embedding provider-specific dispatch commands. Define
how the critic result enters contradiction classification and provenance.

**Step 3: Format**

Run: `pnpm exec oxfmt --write .agents/skills/explainer-kit/scripts/lib/fact-base.mjs .agents/skills/explainer-kit/references/fact-base-contract.md .agents/skills/explainer-kit/tests/fact-base.test.mjs`

**Step 4: Verify**

Run: `node --test .agents/skills/explainer-kit/tests/fact-base.test.mjs`
Expected: Both source modes produce cited, reconciled records.

**Step 5: Commit**

```bash
git add .agents/skills/explainer-kit/scripts/lib/fact-base.mjs .agents/skills/explainer-kit/references/fact-base-contract.md .agents/skills/explainer-kit/tests/fact-base.test.mjs
git commit -m "feat(p02-t02): implement explainer fact base"
```

### Task p02-t03: Add recipe registry and canonical narrative contracts

**Files:**

- Create: `.agents/skills/explainer-kit/recipes/project-explainer.json`
- Create: `.agents/skills/explainer-kit/recipes/project-recap.json`
- Create: `.agents/skills/explainer-kit/recipes/engineer-tour.json`
- Create: `.agents/skills/explainer-kit/scripts/lib/recipes.mjs`
- Create: `.agents/skills/explainer-kit/tests/recipes.test.mjs`

**Step 1: Write test (RED)**

Assert recipe/version lookup, closed source roles, one-project recap binding,
the six recap accountability sections, unsupported recipe errors, and generic
engineer-tour independence. Cover recipe-level unknown-size discovery limits:
stop after two consecutive no-new-findings rounds and always stop at the
recipe's hard maximum.

Run: `node --test .agents/skills/explainer-kit/tests/recipes.test.mjs`
Expected: Registry and recipes are missing.

**Step 2: Implement (GREEN)**

Implement `loadRecipe(id, version)`, narrative/content-model validation, and
closed discovery-limit configuration. Do not add `program-recap`.

**Step 3: Format**

Run: `pnpm exec oxfmt --write .agents/skills/explainer-kit/recipes .agents/skills/explainer-kit/scripts/lib/recipes.mjs .agents/skills/explainer-kit/tests/recipes.test.mjs`

**Step 4: Verify**

Run: `node --test .agents/skills/explainer-kit/tests/recipes.test.mjs`
Expected: Canonical and optional recipe contracts pass.

**Step 5: Commit**

```bash
git add .agents/skills/explainer-kit/recipes/project-explainer.json .agents/skills/explainer-kit/recipes/project-recap.json .agents/skills/explainer-kit/recipes/engineer-tour.json .agents/skills/explainer-kit/scripts/lib/recipes.mjs .agents/skills/explainer-kit/tests/recipes.test.mjs
git commit -m "feat(p02-t03): add explainer recipe registry"
```

### Task p02-t04: Implement dual-mode theme resolution

**Files:**

- Create: `.agents/skills/explainer-kit/palettes/neutral.json`
- Create: `.agents/skills/explainer-kit/palettes/ocean.json`
- Create: `.agents/skills/explainer-kit/palettes/ember.json`
- Create: `.agents/skills/explainer-kit/palettes/forest.json`
- Create: `.agents/skills/explainer-kit/palettes/violet.json`
- Create: `.agents/skills/explainer-kit/profiles/clean.json`
- Create: `.agents/skills/explainer-kit/profiles/editorial.json`
- Create: `.agents/skills/explainer-kit/profiles/technical.json`
- Create: `.agents/skills/explainer-kit/scripts/lib/theme.mjs`
- Create: `.agents/skills/explainer-kit/tests/theme.test.mjs`

**Step 1: Write test (RED)**

Cover neutral defaults, 3–5 palettes, 2–3 profiles, supplied-bundle precedence,
art-direction hashes/redaction, both complete modes, AA pairs, canonical bundle
hashes, and default-only/user-switchable presentation. Assert that
`renderStrategy` is persisted in normalized requests/build records while
remaining absent from `ResolvedThemeV1` and `bundleHash`.

Run: `node --test .agents/skills/explainer-kit/tests/theme.test.mjs`
Expected: Theme resolver/assets are missing.

**Step 2: Implement (GREEN)**

Implement `resolveTheme(selection)` with closed semantic roles and keep
`renderStrategy` in the normalized request/build record, not bundle identity;
the renderer receives it as a separate input.

**Step 3: Format**

Run: `pnpm exec oxfmt --write .agents/skills/explainer-kit/palettes .agents/skills/explainer-kit/profiles .agents/skills/explainer-kit/scripts/lib/theme.mjs .agents/skills/explainer-kit/tests/theme.test.mjs`

**Step 4: Verify**

Run: `node --test .agents/skills/explainer-kit/tests/theme.test.mjs`
Expected: Theme precedence, contrast, and hash cases pass.

**Step 5: Commit**

```bash
git add .agents/skills/explainer-kit/palettes/neutral.json .agents/skills/explainer-kit/palettes/ocean.json .agents/skills/explainer-kit/palettes/ember.json .agents/skills/explainer-kit/palettes/forest.json .agents/skills/explainer-kit/palettes/violet.json .agents/skills/explainer-kit/profiles/clean.json .agents/skills/explainer-kit/profiles/editorial.json .agents/skills/explainer-kit/profiles/technical.json .agents/skills/explainer-kit/scripts/lib/theme.mjs .agents/skills/explainer-kit/tests/theme.test.mjs
git commit -m "feat(p02-t04): implement resolved theme system"
```

### Task p02-t05: Neutralize production templates

**Files:**

- Create: `.agents/skills/explainer-kit/templates/house-style.html`
- Create: `.agents/skills/explainer-kit/templates/deck-shell.html`
- Create: `.agents/skills/explainer-kit/templates/diagram-shell.html`
- Create: `.agents/skills/explainer-kit/templates/engineer-tour.html`
- Create: `.agents/skills/explainer-kit/examples/project-explainer/fact-base.md`
- Create: `.agents/skills/explainer-kit/examples/project-explainer/content.md`
- Create: `.agents/skills/explainer-kit/examples/project-recap/fact-base.md`
- Create: `.agents/skills/explainer-kit/examples/project-recap/content.md`
- Create: `.agents/skills/explainer-kit/examples/theme-bundle.json`
- Create: `.agents/skills/explainer-kit/tests/templates.test.mjs`

**Step 1: Write test (RED)**

Cover documented tokens, inline-only assets, valid shell structure, and absence
of organization-specific names, colors, destinations, or example content.
Assert worked examples exist only under `examples/` and use RFC 2606 domains.
For `deck-shell.html`, cover left-to-right slide advance as the presentation
default, x-axis overflow confinement inside slide content, both keyboard arrow
pairs (`Left`/`Right` and `Up`/`Down`), a readable no-JS fallback, and a
vertical print layout.

Run: `node --test .agents/skills/explainer-kit/tests/templates.test.mjs`
Expected: Neutral production templates are missing.

**Step 2: Implement (GREEN)**

Evolve the reference shells while removing hardcoded branding/destinations and
preserving sticky navigation, diagrams, deck layout, and expandable code. Move
worked content into the exact external example fixtures.
Implement the deck as horizontal paging by default; preserve vertical document
flow when JavaScript is unavailable and in print media. Keep wide inner content
contained on the x-axis rather than expanding the page.

**Step 3: Format**

Run: `pnpm exec oxfmt --write .agents/skills/explainer-kit/templates .agents/skills/explainer-kit/examples .agents/skills/explainer-kit/tests/templates.test.mjs`

**Step 4: Verify**

Run: `node --test .agents/skills/explainer-kit/tests/templates.test.mjs`
Expected: Every production shell is neutral and token-complete; deck navigation,
overflow, no-JS, and print-axis cases pass.

**Step 5: Commit**

```bash
git add .agents/skills/explainer-kit/templates/house-style.html .agents/skills/explainer-kit/templates/deck-shell.html .agents/skills/explainer-kit/templates/diagram-shell.html .agents/skills/explainer-kit/templates/engineer-tour.html .agents/skills/explainer-kit/examples/project-explainer/fact-base.md .agents/skills/explainer-kit/examples/project-explainer/content.md .agents/skills/explainer-kit/examples/project-recap/fact-base.md .agents/skills/explainer-kit/examples/project-recap/content.md .agents/skills/explainer-kit/examples/theme-bundle.json .agents/skills/explainer-kit/tests/templates.test.mjs
git commit -m "feat(p02-t05): add neutral explainer templates"
```

### Task p02-t06: Implement typed-path rendering

**Files:**

- Create: `.agents/skills/explainer-kit/scripts/lib/render.mjs`
- Create: `.agents/skills/explainer-kit/tests/render.test.mjs`

**Step 1: Write test (RED)**

Cover escaped content, template token substitution, local assets, default-only
and user-switchable modes, explicit index URLs, typed site paths, artifact
cross-links, and unknown template/token rejection.

Run: `node --test .agents/skills/explainer-kit/tests/render.test.mjs`
Expected: Renderer is missing.

**Step 2: Implement (GREEN)**

Implement
`renderArtifact({ recipeArtifact, content, theme, renderStrategy, publicBaseUrl })`
using only validated recipes/themes, a separately validated render strategy,
and bundled templates.

**Step 3: Format**

Run: `pnpm exec oxfmt --write .agents/skills/explainer-kit/scripts/lib/render.mjs .agents/skills/explainer-kit/tests/render.test.mjs`

**Step 4: Verify**

Run: `node --test .agents/skills/explainer-kit/tests/render.test.mjs`
Expected: Neutral self-contained artifacts render to typed paths.

**Step 5: Commit**

```bash
git add .agents/skills/explainer-kit/scripts/lib/render.mjs .agents/skills/explainer-kit/tests/render.test.mjs
git commit -m "feat(p02-t06): render typed explainer artifacts"
```

### Task p02-t07: Add structural, accessibility, and leak QA

**Files:**

- Create: `.agents/skills/explainer-kit/scripts/lib/qa.mjs`
- Create: `.agents/skills/explainer-kit/scripts/render-qa.mjs`
- Create: `.agents/skills/explainer-kit/tests/qa.test.mjs`
- Create: `.agents/skills/explainer-kit/tests/fixtures/seeded-leak.html`

**Step 1: Write test (RED)**

Cover unresolved tokens, denylisted strings, inline-only assets, tag balance,
heading/link rules, inner-container overflow probes, reduced motion, keyboard
navigation, representative widths, seeded leak rejection, and cross-set
cohesion. Add positive/negative artifact-set fixtures for inconsistent
terminology, numeric claims, and statuses.

Run: `node --test .agents/skills/explainer-kit/tests/qa.test.mjs`
Expected: QA entry points are missing.

**Step 2: Implement (GREEN)**

Implement structural and cross-set cohesion checks plus a browser-probe
contract that can use available Playwright/browser tooling without becoming a
core dependency.

**Step 3: Format**

Run: `pnpm exec oxfmt --write .agents/skills/explainer-kit/scripts/lib/qa.mjs .agents/skills/explainer-kit/scripts/render-qa.mjs .agents/skills/explainer-kit/tests`

**Step 4: Verify**

Run: `node --test .agents/skills/explainer-kit/tests/qa.test.mjs`
Expected: Positive fixtures pass and the seeded leak/overflow cases fail.

**Step 5: Commit**

```bash
git add .agents/skills/explainer-kit/scripts/lib/qa.mjs .agents/skills/explainer-kit/scripts/render-qa.mjs .agents/skills/explainer-kit/tests/qa.test.mjs .agents/skills/explainer-kit/tests/fixtures/seeded-leak.html
git commit -m "feat(p02-t07): add explainer render QA"
```

### Task p02-t08: Implement honest durability evidence

**Files:**

- Create: `.agents/skills/explainer-kit/scripts/lib/durability.mjs`
- Create: `.agents/skills/explainer-kit/scripts/record-durability.mjs`
- Create: `.agents/skills/explainer-kit/tests/durability.test.mjs`

**Step 1: Write test (RED)**

Cover false-by-default rebuildability, deterministic replay evidence, commit
blob/hash verification, publish receipt verification, mutable-record exclusion,
two-commit termination, evidence arrays/supersession, and honest outcome
agreement.

Run: `node --test .agents/skills/explainer-kit/tests/durability.test.mjs`
Expected: Durability verifier is missing.

**Step 2: Implement (GREEN)**

Implement `recordDurability(request)` without creating commits and preserve
`built-not-durable` on verification failure.

**Step 3: Format**

Run: `pnpm exec oxfmt --write .agents/skills/explainer-kit/scripts/lib/durability.mjs .agents/skills/explainer-kit/scripts/record-durability.mjs .agents/skills/explainer-kit/tests/durability.test.mjs`

**Step 4: Verify**

Run: `node --test .agents/skills/explainer-kit/tests/durability.test.mjs`
Expected: Commit/publish evidence and false-claim cases pass.

**Step 5: Commit**

```bash
git add .agents/skills/explainer-kit/scripts/lib/durability.mjs .agents/skills/explainer-kit/scripts/record-durability.mjs .agents/skills/explainer-kit/tests/durability.test.mjs
git commit -m "feat(p02-t08): implement durability evidence"
```

### Task p02-t09: Compose the config-blind core run

**Files:**

- Create: `.agents/skills/explainer-kit/scripts/run.mjs`
- Create: `.agents/skills/explainer-kit/references/contracts.md`
- Modify: `.agents/skills/explainer-kit/SKILL.md`
- Create: `.agents/skills/explainer-kit/tests/run.integration.test.mjs`

**Step 1: Write test (RED)**

Run canonical recipes from temporary directories with no `.oat` files; cover
supplied/federated facts, stage failures, retained intermediates, privacy-safe
records, schema-valid results, and unattended approved-source runs. Assert
federated runs execute the adversarial critic while supplied runs perform only
the lightweight check. Exercise both the two-empty-round discovery stop and
the recipe hard maximum.

Run: `node --test .agents/skills/explainer-kit/tests/run.integration.test.mjs`
Expected: Core orchestration entry point is missing.

**Step 2: Implement (GREEN)**

Compose validate → fact-base → recipe/content → theme → render → QA →
manifest/build-record for unattended approved-source runs, with optional
durability/publish invoked only by request. Enforce recipe discovery bounds and
wire the provider-neutral critic execution seam only for federated inputs.

**Step 3: Format**

Run: `pnpm exec oxfmt --write .agents/skills/explainer-kit/scripts/run.mjs .agents/skills/explainer-kit/references/contracts.md .agents/skills/explainer-kit/SKILL.md .agents/skills/explainer-kit/tests/run.integration.test.mjs`

**Step 4: Verify**

Run: `node --test .agents/skills/explainer-kit/tests/*.test.mjs`
Expected: Full config-free core suite passes.

**Step 5: Commit**

```bash
git add .agents/skills/explainer-kit/scripts/run.mjs .agents/skills/explainer-kit/references/contracts.md .agents/skills/explainer-kit/SKILL.md .agents/skills/explainer-kit/tests/run.integration.test.mjs
git commit -m "feat(p02-t09): compose explainer core pipeline"
```

### Task p02-t10: Gate interactive content approval and resume

**Files:**

- Create: `.agents/skills/explainer-kit/scripts/lib/content-approval.mjs`
- Create: `.agents/skills/explainer-kit/tests/content-approval.test.mjs`
- Modify: `.agents/skills/explainer-kit/scripts/run.mjs`
- Modify: `.agents/skills/explainer-kit/tests/run.integration.test.mjs`
- Modify: `.agents/skills/explainer-kit/SKILL.md`

**Step 1: Write test (RED)**

Cover interactive pause after Markdown generation, no render/publish before
approval, rejection/correction persistence, same-run resume after approval, and
unattended lifecycle provenance that does not prompt.

Run: `node --test .agents/skills/explainer-kit/tests/content-approval.test.mjs .agents/skills/explainer-kit/tests/run.integration.test.mjs`
Expected: Interactive runs render without an explicit approval state.

**Step 2: Implement (GREEN)**

Implement `resolveContentApproval(run, mode, reviewedSource)` and resumable
stage state. Publishing remains independently human-gated.

**Step 3: Format**

Run: `pnpm exec oxfmt --write .agents/skills/explainer-kit/scripts/lib/content-approval.mjs .agents/skills/explainer-kit/tests/content-approval.test.mjs .agents/skills/explainer-kit/scripts/run.mjs .agents/skills/explainer-kit/tests/run.integration.test.mjs .agents/skills/explainer-kit/SKILL.md`

**Step 4: Verify**

Run: `node --test .agents/skills/explainer-kit/tests/content-approval.test.mjs .agents/skills/explainer-kit/tests/run.integration.test.mjs`
Expected: Interactive approval/resume and unattended provenance cases pass.

**Step 5: Commit**

```bash
git add .agents/skills/explainer-kit/scripts/lib/content-approval.mjs .agents/skills/explainer-kit/tests/content-approval.test.mjs .agents/skills/explainer-kit/scripts/run.mjs .agents/skills/explainer-kit/tests/run.integration.test.mjs .agents/skills/explainer-kit/SKILL.md
git commit -m "feat(p02-t10): gate explainer content approval"
```

## Phase 3: OAT adapter and lifecycle integration

**Milestone:** OAT resolves policy and paths, invokes the packaged core at plan
and completion gates, and preserves only final recap records through archival.

### Task p03-t01: Resolve adapter config and canonical output roots

**Files:**

- Create: `.agents/skills/oat-explainer-kit/scripts/resolve-config.mjs`
- Create: `.agents/skills/oat-explainer-kit/scripts/resolve-paths.mjs`
- Create: `.agents/skills/oat-explainer-kit/tests/config-paths.test.mjs`
- Create: `.agents/skills/oat-explainer-kit/references/config-contract.md`

**Step 1: Write test (RED)**

Cover `oat config get --json` value/source use, runtime overrides, cross-field
publish checks, active shared/local project roots, repo reference explainers,
direct-call rejection, symlinks, and traversal.

Run: `node --test .agents/skills/oat-explainer-kit/tests/config-paths.test.mjs`
Expected: Adapter resolution is missing.

**Step 2: Implement (GREEN)**

Implement source-aware translation into `ExplainerRunRequestV1` and fixed
`.oat/repo/reference/explainers/` non-project placement.

**Step 3: Format**

Run: `pnpm exec oxfmt --write .agents/skills/oat-explainer-kit`

**Step 4: Verify**

Run: `node --test .agents/skills/oat-explainer-kit/tests/config-paths.test.mjs`
Expected: Config/path matrix passes.

**Step 5: Commit**

```bash
git add .agents/skills/oat-explainer-kit/scripts/resolve-config.mjs .agents/skills/oat-explainer-kit/scripts/resolve-paths.mjs .agents/skills/oat-explainer-kit/tests/config-paths.test.mjs .agents/skills/oat-explainer-kit/references/config-contract.md
git commit -m "feat(p03-t01): resolve OAT explainer inputs"
```

### Task p03-t02: Bind OAT artifacts and invoke the core

**Files:**

- Create: `.agents/skills/oat-explainer-kit/scripts/bind-project-sources.mjs`
- Create: `.agents/skills/oat-explainer-kit/scripts/run.mjs`
- Create: `.agents/skills/oat-explainer-kit/tests/run.integration.test.mjs`
- Modify: `.agents/skills/oat-explainer-kit/SKILL.md`

**Step 1: Write test (RED)**

Cover plan/design/spec/implementation/summary source roles, approved-artifact
review provenance, supplied fact-base pass-through, core result propagation,
missing/incompatible core, and no ambient private config.

Run: `node --test .agents/skills/oat-explainer-kit/tests/run.integration.test.mjs`
Expected: Adapter run path is missing.

**Step 2: Implement (GREEN)**

Implement project source binding and invoke the installed core with one
normalized request/manifest seam.

**Step 3: Format**

Run: `pnpm exec oxfmt --write .agents/skills/oat-explainer-kit`

**Step 4: Verify**

Run: `node --test .agents/skills/oat-explainer-kit/tests/run.integration.test.mjs`
Expected: Adapter/core integration passes.

**Step 5: Commit**

```bash
git add .agents/skills/oat-explainer-kit/scripts/bind-project-sources.mjs .agents/skills/oat-explainer-kit/scripts/run.mjs .agents/skills/oat-explainer-kit/tests/run.integration.test.mjs .agents/skills/oat-explainer-kit/SKILL.md
git commit -m "feat(p03-t02): bind OAT explainer sources"
```

### Task p03-t03: Implement lifecycle intent resolution

**Files:**

- Create: `.agents/skills/oat-explainer-kit/scripts/resolve-intent.mjs`
- Create: `.agents/skills/oat-explainer-kit/scripts/persist-intent.mjs`
- Create: `.agents/skills/oat-explainer-kit/tests/intent.test.mjs`
- Create: `.agents/skills/oat-explainer-kit/references/lifecycle-contract.md`

**Step 1: Write test (RED)**

Cover mode → project state → workflow preference → default precedence,
ask-once persistence, stale conflicts, autonomous forced recap, prompt-only
autonomous explainer, and invalid autonomous skip.

Run: `node --test .agents/skills/oat-explainer-kit/tests/intent.test.mjs`
Expected: Intent resolver is missing.

**Step 2: Implement (GREEN)**

Implement pure `resolveIntent(...)` plus safe frontmatter persistence helpers.

**Step 3: Format**

Run: `pnpm exec oxfmt --write .agents/skills/oat-explainer-kit`

**Step 4: Verify**

Run: `node --test .agents/skills/oat-explainer-kit/tests/intent.test.mjs`
Expected: Full precedence table passes.

**Step 5: Commit**

```bash
git add .agents/skills/oat-explainer-kit/scripts/resolve-intent.mjs .agents/skills/oat-explainer-kit/scripts/persist-intent.mjs .agents/skills/oat-explainer-kit/tests/intent.test.mjs .agents/skills/oat-explainer-kit/references/lifecycle-contract.md
git commit -m "feat(p03-t03): resolve explainer lifecycle intent"
```

### Task p03-t04: Integrate plan and autonomous kickoff gates

**Files:**

- Modify: `.agents/skills/oat-project-plan/SKILL.md`
- Modify: `.agents/skills/oat-project-autonomous/SKILL.md`
- Modify: `packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts`

**Step 1: Write test (RED)**

Add contract assertions for plan ask-once behavior, post-plan generation,
failure-without-plan-rollback, autonomous forced recap intent, and
kickoff-request-only explainer intent.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared/review-skill-contracts.test.ts`
Expected: Lifecycle skill contracts lack explainer gates.

**Step 2: Implement (GREEN)**

Add adapter invocation steps without changing existing plan artifact review,
dispatch, or HiLL contracts. Defer PR-scoped skill version bumps to p04-t05.

**Step 3: Format**

Run: `pnpm exec oxfmt --write .agents/skills/oat-project-plan/SKILL.md .agents/skills/oat-project-autonomous/SKILL.md packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts`

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared/review-skill-contracts.test.ts`
Expected: Planning/autonomous contract assertions pass.

**Step 5: Commit**

```bash
git add .agents/skills/oat-project-plan/SKILL.md .agents/skills/oat-project-autonomous/SKILL.md packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts
git commit -m "feat(p03-t04): add explainer planning intent"
```

### Task p03-t05: Centralize tracked-run commit finalization

**Files:**

- Create: `.agents/skills/oat-explainer-kit/scripts/finalize-tracked-run.mjs`
- Create: `.agents/skills/oat-explainer-kit/tests/finalize-tracked-run.test.mjs`
- Modify: `.agents/skills/oat-explainer-kit/references/lifecycle-contract.md`

**Step 1: Write test (RED)**

Cover dedicated versus completion-bookkeeping commit modes, artifact commit
then evidence commit, mutable-record exclusion, push-together instructions,
verification failure, later attestation, and unrelated-change isolation.

Run: `node --test .agents/skills/oat-explainer-kit/tests/finalize-tracked-run.test.mjs`
Expected: Shared finalizer is missing.

**Step 2: Implement (GREEN)**

Implement a command planner/verifier; the adapter may invoke git but the core
still only verifies evidence and never creates commits.

**Step 3: Format**

Run: `pnpm exec oxfmt --write .agents/skills/oat-explainer-kit`

**Step 4: Verify**

Run: `node --test .agents/skills/oat-explainer-kit/tests/finalize-tracked-run.test.mjs`
Expected: Two-commit choreography terminates and failure remains recoverable.

**Step 5: Commit**

```bash
git add .agents/skills/oat-explainer-kit/scripts/finalize-tracked-run.mjs .agents/skills/oat-explainer-kit/tests/finalize-tracked-run.test.mjs .agents/skills/oat-explainer-kit/references/lifecycle-contract.md
git commit -m "feat(p03-t05): centralize explainer durability commits"
```

### Task p03-t06: Integrate implementation-tail recap and summary visibility

**Files:**

- Modify: `.agents/skills/oat-project-implement/SKILL.md`
- Modify: `.agents/skills/oat-project-summary/SKILL.md`
- Modify: `packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts`

**Step 1: Write test (RED)**

Assert fresh-recap deduplication, mandatory autonomous attempt, non-blocking
failed/built-not-durable outcomes, final HiLL placement, concise summary
outcome, and preserved existing implementation review sequencing.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared/review-skill-contracts.test.ts`
Expected: Implementation/summary contracts lack recap behavior.

**Step 2: Implement (GREEN)**

Add lifecycle-tail adapter/finalizer calls and summary outcome rules. Defer
PR-scoped skill version bumps to p04-t05.

**Step 3: Format**

Run: `pnpm exec oxfmt --write .agents/skills/oat-project-implement/SKILL.md .agents/skills/oat-project-summary/SKILL.md packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts`

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared/review-skill-contracts.test.ts`
Expected: Non-blocking recap and summary visibility contracts pass.

**Step 5: Commit**

```bash
git add .agents/skills/oat-project-implement/SKILL.md .agents/skills/oat-project-summary/SKILL.md packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts
git commit -m "feat(p03-t06): add implementation recap lifecycle"
```

### Task p03-t07: Export the selected recap during archive

**Files:**

- Modify: `packages/cli/src/commands/project/archive/index.ts`
- Modify: `packages/cli/src/commands/project/archive/index.test.ts`
- Modify: `packages/cli/src/commands/project/archive/push-runner.ts`
- Modify: `packages/cli/src/commands/project/archive/push-runner.test.ts`
- Modify: `packages/cli/src/commands/project/archive/archive-utils.ts`
- Modify: `packages/cli/src/commands/project/archive/archive-utils.test.ts`

**Step 1: Write test (RED)**

Cover optional `--project-recap-run`, project containment, recipe identity,
exact `reference/project-recaps/YYYYMMDD-slug` root, existing-destination
failure, temp sibling cleanup, hash verification, atomic rename, failed recap
packages, no-recap runs, and no active deletion on export failure.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/archive/index.test.ts src/commands/project/archive/push-runner.test.ts src/commands/project/archive/archive-utils.test.ts`
Expected: Archive command does not accept/export recap packages.

**Step 2: Implement (GREEN)**

Extend archive options/result with `ArchiveProjectRecapExportV1`; export only
the selected recap and preserve existing summary/S3 behavior.

**Step 3: Format**

Run: `pnpm exec oxfmt --write packages/cli/src/commands/project/archive`

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/archive/index.test.ts src/commands/project/archive/push-runner.test.ts src/commands/project/archive/archive-utils.test.ts`
Expected: Copy-before-delete and retry-safe archive cases pass.

**Step 5: Commit**

```bash
git add packages/cli/src/commands/project/archive/index.ts packages/cli/src/commands/project/archive/index.test.ts packages/cli/src/commands/project/archive/push-runner.ts packages/cli/src/commands/project/archive/push-runner.test.ts packages/cli/src/commands/project/archive/archive-utils.ts packages/cli/src/commands/project/archive/archive-utils.test.ts
git commit -m "feat(p03-t07): export durable project recaps"
```

### Task p03-t08: Integrate interactive completion policy

**Files:**

- Modify: `.agents/skills/oat-project-complete/SKILL.md`
- Modify: `packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts`
- Create: `.agents/skills/oat-explainer-kit/tests/completion.integration.test.mjs`

**Step 1: Write test (RED)**

Cover batched ask behavior, persisted generate/skip intent, fresh-recap reuse,
final recap selection, archive argument plumbing, no-recap completion, and
project-explainer exclusion from durable reference products. Add a local-scope
project case asserting no tracked recap export, no archive argument, and
`built-not-durable` unless independent publish evidence exists.

Run: `node --test .agents/skills/oat-explainer-kit/tests/completion.integration.test.mjs && pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared/review-skill-contracts.test.ts`
Expected: Completion flow lacks explainer policy and selection.

**Step 2: Implement (GREEN)**

Wire adapter resolution, recap selection, and archive argument construction
into completion. Defer durability/link choreography to p03-t09 and the
PR-scoped skill version bump to p04-t05.

**Step 3: Format**

Run: `pnpm exec oxfmt --write .agents/skills/oat-project-complete/SKILL.md .agents/skills/oat-explainer-kit/tests/completion.integration.test.mjs packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts`

**Step 4: Verify**

Run: `node --test .agents/skills/oat-explainer-kit/tests/completion.integration.test.mjs && pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared/review-skill-contracts.test.ts`
Expected: Interactive completion policy and selection cases pass.

**Step 5: Commit**

```bash
git add .agents/skills/oat-project-complete/SKILL.md .agents/skills/oat-explainer-kit/tests/completion.integration.test.mjs packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts
git commit -m "feat(p03-t08): integrate completion recap policy"
```

### Task p03-t09: Finalize recap durability and archive-aware links

**Files:**

- Modify: `.agents/skills/oat-project-complete/SKILL.md`
- Modify: `.agents/skills/oat-explainer-kit/tests/completion.integration.test.mjs`
- Modify: `.agents/skills/oat-explainer-kit/references/lifecycle-contract.md`

**Step 1: Write test (RED)**

Cover archive export report consumption, lifecycle bookkeeping commit, exported
recap re-attestation, active-path evidence supersession, evidence commit,
failed-attestation warning without completion failure, and non-404 summary/PR
links to the tracked reference root.

Run: `node --test .agents/skills/oat-explainer-kit/tests/completion.integration.test.mjs`
Expected: Completion stops before re-attestation and durable link rewriting.

**Step 2: Implement (GREEN)**

Add the two-commit completion choreography and archive-aware links. Never use
the gitignored archive as evidence or a post-completion link target.

**Step 3: Format**

Run: `pnpm exec oxfmt --write .agents/skills/oat-project-complete/SKILL.md .agents/skills/oat-explainer-kit/tests/completion.integration.test.mjs .agents/skills/oat-explainer-kit/references/lifecycle-contract.md`

**Step 4: Verify**

Run: `node --test .agents/skills/oat-explainer-kit/tests/completion.integration.test.mjs`
Expected: Archive-safe durability and link cases pass.

**Step 5: Commit**

```bash
git add .agents/skills/oat-project-complete/SKILL.md .agents/skills/oat-explainer-kit/tests/completion.integration.test.mjs .agents/skills/oat-explainer-kit/references/lifecycle-contract.md
git commit -m "feat(p03-t09): reattest archived project recaps"
```

## Phase 4: Publishing, compatibility, documentation, and release validation

**Milestone:** The public connector and packaged family pass repository quality
gates, and the frozen extension seam is ready for external acceptance.

### Task p04-t01: Implement sentinel-first additive S3 publishing

**Files:**

- Create: `.agents/skills/explainer-kit/scripts/lib/s3-static.mjs`
- Create: `.agents/skills/explainer-kit/scripts/publish.mjs`
- Create: `.agents/skills/explainer-kit/tests/s3-static.test.mjs`
- Create: `.agents/skills/explainer-kit/references/destination-contract.md`

**Step 1: Write test (RED)**

Cover corresponding-root normalization, run-unique sentinel suffixes, auth
failure, additive/idempotent uploads, duplicate paths, MIME/cache metadata,
explicit index URLs, public verification, receipts, and no delete/undeclared
overwrite.

Run: `node --test .agents/skills/explainer-kit/tests/s3-static.test.mjs`
Expected: Connector is missing.

**Step 2: Implement (GREEN)**

Implement argv-safe AWS CLI/HTTP operations with bounded transient retries and
human-gated invocation.

**Step 3: Format**

Run: `pnpm exec oxfmt --write .agents/skills/explainer-kit/scripts .agents/skills/explainer-kit/tests/s3-static.test.mjs .agents/skills/explainer-kit/references/destination-contract.md`

**Step 4: Verify**

Run: `node --test .agents/skills/explainer-kit/tests/s3-static.test.mjs`
Expected: Local fake-S3/HTTP connector suite passes.

**Step 5: Commit**

```bash
git add .agents/skills/explainer-kit/scripts/lib/s3-static.mjs .agents/skills/explainer-kit/scripts/publish.mjs .agents/skills/explainer-kit/tests/s3-static.test.mjs .agents/skills/explainer-kit/references/destination-contract.md
git commit -m "feat(p04-t01): add s3 static connector"
```

### Task p04-t02: Add release-grade visual and traceability fixtures

**Files:**

- Create: `.agents/skills/explainer-kit/tests/visual-matrix.test.mjs`
- Create: `.agents/skills/explainer-kit/tests/rebuildability.test.mjs`
- Create: `.agents/skills/explainer-kit/tests/fixtures/operational-wisdom.json`
- Modify: `.agents/skills/explainer-kit/scripts/render-qa.mjs`

**Step 1: Write test (RED)**

Cover all curated palettes/modes, every profile/artifact class, representative
viewports, a seeded false rebuildable claim, source/output hashes, and the
0.4.1 operational-wisdom trace.

Run: `node --test .agents/skills/explainer-kit/tests/visual-matrix.test.mjs .agents/skills/explainer-kit/tests/rebuildability.test.mjs`
Expected: Release fixtures/checks are missing.

**Step 2: Implement (GREEN)**

Add bounded matrix selection and trace fixtures without introducing a
deterministic renderer requirement.

**Step 3: Format**

Run: `pnpm exec oxfmt --write .agents/skills/explainer-kit/tests .agents/skills/explainer-kit/scripts/render-qa.mjs`

**Step 4: Verify**

Run: `node --test .agents/skills/explainer-kit/tests/visual-matrix.test.mjs .agents/skills/explainer-kit/tests/rebuildability.test.mjs`
Expected: Visual/traceability fixtures pass and false claims fail.

**Step 5: Commit**

```bash
git add .agents/skills/explainer-kit/tests/visual-matrix.test.mjs .agents/skills/explainer-kit/tests/rebuildability.test.mjs .agents/skills/explainer-kit/tests/fixtures/operational-wisdom.json .agents/skills/explainer-kit/scripts/render-qa.mjs
git commit -m "test(p04-t02): add explainer release QA fixtures"
```

### Task p04-t03: Add private-wrapper compatibility fixture and migration runbook

**Files:**

- Create: `tools/smoke/explainer-kit/wrapper-compatibility.test.mjs`
- Create: `tools/smoke/explainer-kit/fixtures/private-wrapper.mjs`
- Create: `.agents/skills/explainer-kit/references/extension-contract.md`
- Create: `.agents/skills/oat-explainer-kit/references/migration.md`
- Modify: `.agents/skills/explainer-kit/SKILL.md`
- Modify: `.agents/skills/oat-explainer-kit/SKILL.md`

**Step 1: Write test (RED)**

Exercise wrapper pre-resolution → `ExplainerRunRequestV1` → core run → manifest
consumption → post-run linking, with personal concerns remaining outside public
config.

Run: `node --test tools/smoke/explainer-kit/wrapper-compatibility.test.mjs`
Expected: Compatibility fixture/runbook are missing.

**Step 2: Implement (GREEN)**

Evolve the supplied migration draft into the frozen public extension contract,
RC sequence, rollback path, and operator-owned real-wrapper gate.
Carry the confirmed `personal-oat` public root
`https://dy4vzrzaexuy5.cloudfront.net` into the private wrapper's
`presets.example.json` and eventual Stoa configuration example; keep the
destination out of neutral public core fixtures.

**Step 3: Format**

Run: `pnpm exec oxfmt --write tools/smoke/explainer-kit .agents/skills/explainer-kit .agents/skills/oat-explainer-kit`

**Step 4: Verify**

Run: `node --test tools/smoke/explainer-kit/wrapper-compatibility.test.mjs`
Expected: Fixture proves the public seam without private assets.

**Step 5: Commit**

```bash
git add tools/smoke/explainer-kit/wrapper-compatibility.test.mjs tools/smoke/explainer-kit/fixtures/private-wrapper.mjs .agents/skills/explainer-kit/references/extension-contract.md .agents/skills/oat-explainer-kit/references/migration.md .agents/skills/explainer-kit/SKILL.md .agents/skills/oat-explainer-kit/SKILL.md
git commit -m "test(p04-t03): prove wrapper extension seam"
```

### Task p04-t04: Document the public explainer family

**Files:**

- Create: `apps/oat-docs/docs/workflows/skills/explainer-kit.md`
- Modify: `apps/oat-docs/docs/workflows/skills/index.md`
- Modify: `apps/oat-docs/docs/workflows/projects/artifacts.md`
- Modify: `apps/oat-docs/docs/cli-utilities/configuration.md`
- Modify: `apps/oat-docs/docs/cli-utilities/tool-packs.md`
- Modify: `apps/oat-docs/index.md` (generated)
- Modify: `NOTICES.md`

**Step 1: Analyze documentation delta**

Compare shipped contracts/config/pack placement with existing pages; keep
program-recap, private destinations, and legacy flat-layout migration out of v1.

**Step 2: Present delta plan and obtain approval**

Show the exact page-level additions/edits and attribution change to the user.
Do not author substantive documentation until the user approves that delta.

**Step 3: Author**

Document core/adapter usage, project-explainer versus durable project-recap,
repo reference paths, theme selection, build-only behavior, publishing, and
MIT-derived visual patterns.

**Step 4: Format**

Run: `pnpm exec oxfmt --write apps/oat-docs/docs/workflows/skills/explainer-kit.md apps/oat-docs/docs/workflows/skills/index.md apps/oat-docs/docs/workflows/projects/artifacts.md apps/oat-docs/docs/cli-utilities/configuration.md apps/oat-docs/docs/cli-utilities/tool-packs.md NOTICES.md`

**Step 5: Verify**

Run: `pnpm -w run cli:source -- docs generate-index --docs-dir apps/oat-docs/docs --output apps/oat-docs/index.md && pnpm build:docs`
Expected: Authored contents, generated index, and docs build pass.

**Step 6: Commit**

```bash
git add apps/oat-docs/docs/workflows/skills/explainer-kit.md apps/oat-docs/docs/workflows/skills/index.md apps/oat-docs/docs/workflows/projects/artifacts.md apps/oat-docs/docs/cli-utilities/configuration.md apps/oat-docs/docs/cli-utilities/tool-packs.md apps/oat-docs/index.md NOTICES.md
git commit -m "docs(p04-t04): document explainer kit"
```

### Task p04-t05: Bump shipped versions and pass release validation

**Files:**

- Modify: `.agents/skills/explainer-kit/SKILL.md`
- Modify: `.agents/skills/oat-explainer-kit/SKILL.md`
- Modify: `.agents/skills/oat-project-autonomous/SKILL.md`
- Modify: `.agents/skills/oat-project-plan/SKILL.md`
- Modify: `.agents/skills/oat-project-implement/SKILL.md`
- Modify: `.agents/skills/oat-project-complete/SKILL.md`
- Modify: `.agents/skills/oat-project-summary/SKILL.md`
- Modify: `packages/cli/package.json`
- Modify: `packages/control-plane/package.json`
- Modify: `packages/docs-config/package.json`
- Modify: `packages/docs-theme/package.json`
- Modify: `packages/docs-transforms/package.json`
- Modify: `pnpm-lock.yaml`

**Step 1: Verify version delta (RED)**

Run: `pnpm run cli:source -- internal validate-skill-version-bumps --base-ref origin/main && pnpm release:validate`
Expected: Skill-delta validation reports missing existing-skill bumps and
release validation reports missing lockstep public-package bumps.

**Step 2: Implement (GREEN)**

Keep new skills at their single PR-scoped version, bump every changed existing
skill once, and bump all five public packages in lockstep from the then-current
version.

**Step 3: Format**

Run: `pnpm exec oxfmt --write .agents/skills/explainer-kit/SKILL.md .agents/skills/oat-explainer-kit/SKILL.md .agents/skills/oat-project-autonomous/SKILL.md .agents/skills/oat-project-plan/SKILL.md .agents/skills/oat-project-implement/SKILL.md .agents/skills/oat-project-complete/SKILL.md .agents/skills/oat-project-summary/SKILL.md packages/cli/package.json packages/control-plane/package.json packages/docs-config/package.json packages/docs-theme/package.json packages/docs-transforms/package.json pnpm-lock.yaml`

**Step 4: Verify**

Run: `pnpm build && pnpm lint && pnpm format && pnpm type-check && pnpm test && pnpm run cli:source -- internal validate-skill-version-bumps --base-ref origin/main && pnpm release:validate`
Expected: Workspace, skill-version, and publishable-package release gates pass.

**Step 5: Commit**

```bash
git add .agents/skills/explainer-kit/SKILL.md .agents/skills/oat-explainer-kit/SKILL.md .agents/skills/oat-project-autonomous/SKILL.md .agents/skills/oat-project-plan/SKILL.md .agents/skills/oat-project-implement/SKILL.md .agents/skills/oat-project-complete/SKILL.md .agents/skills/oat-project-summary/SKILL.md packages/cli/package.json packages/control-plane/package.json packages/docs-config/package.json packages/docs-theme/package.json packages/docs-transforms/package.json pnpm-lock.yaml
git commit -m "chore(p04-t05): prepare explainer release candidate"
```

### Task p04-t06: Prove packaged core and adapter execution

**Files:**

- Create: `tools/smoke/explainer-kit/packaged-layout.test.mjs`
- Create: `tools/smoke/explainer-kit/fixtures/package-root.mjs`

**Step 1: Write test (RED)**

Build CLI assets into a temporary root, install the utility/workflows skill
directories at their intended scopes, invoke a config-free packaged
`project-explainer` run, invoke the packaged adapter against that core, and
cover missing/incompatible-core failures.

Run: `node --test tools/smoke/explainer-kit/packaged-layout.test.mjs`
Expected: Packaged-layout execution fixture is missing.

**Step 2: Implement (GREEN)**

Use `OAT_ASSETS_DIR` with `packages/cli/scripts/bundle-assets.sh`; never resolve
runtime assets back to the source checkout.

**Step 3: Format**

Run: `pnpm exec oxfmt --write tools/smoke/explainer-kit/packaged-layout.test.mjs tools/smoke/explainer-kit/fixtures/package-root.mjs`

**Step 4: Verify**

Run: `node --test tools/smoke/explainer-kit/packaged-layout.test.mjs`
Expected: Installed core/adapter success and dependency failures pass.

**Step 5: Commit**

```bash
git add tools/smoke/explainer-kit/packaged-layout.test.mjs tools/smoke/explainer-kit/fixtures/package-root.mjs
git commit -m "test(p04-t06): verify packaged explainer execution"
```

### Task p04-t07: Build reproducible retained release candidates

**Files:**

- Create: `tools/release/build-explainer-rc.mjs`
- Create: `tools/release/build-explainer-rc.test.mjs`

**Step 1: Write test (RED)**

Cover retained package tarballs and an RC manifest with commit, package/skill
versions, schema/recipe IDs, hashes, stable ordering, changed candidates, and
volatile timestamp exclusion.

Run: `node --test tools/release/build-explainer-rc.test.mjs`
Expected: RC builder is missing.

**Step 2: Implement (GREEN)**

Implement `build-explainer-rc.mjs --output <dir> --record <json>`. It retains
local tarballs and writes a stable tracked identity record; it does not publish.

**Step 3: Format**

Run: `pnpm exec oxfmt --write tools/release/build-explainer-rc.mjs tools/release/build-explainer-rc.test.mjs`

**Step 4: Verify**

Run: `node --test tools/release/build-explainer-rc.test.mjs`
Expected: Retention, stable identity, and changed-candidate cases pass.

**Step 5: Commit**

```bash
git add tools/release/build-explainer-rc.mjs tools/release/build-explainer-rc.test.mjs
git commit -m "feat(p04-t07): build retained explainer RC"
```

### Task p04-t08: Run connector entry points from the retained RC

**Files:**

- Create: `tools/release/run-explainer-rc.mjs`
- Create: `tools/release/run-explainer-rc.test.mjs`

**Step 1: Write test (RED)**

Cover RC manifest validation, tarball hash verification, temporary extraction,
allowed entry-point containment, packaged execution records, cleanup, and
source-tree fallback rejection.

Run: `node --test tools/release/run-explainer-rc.test.mjs`
Expected: Packaged RC runner is missing.

**Step 2: Implement (GREEN)**

Implement `run-explainer-rc.mjs --rc-manifest <json> --entry <path> --record
<json> -- <entry args>` with structured nonzero failures.

**Step 3: Format**

Run: `pnpm exec oxfmt --write tools/release/run-explainer-rc.mjs tools/release/run-explainer-rc.test.mjs`

**Step 4: Verify**

Run: `node --test tools/release/run-explainer-rc.test.mjs`
Expected: Only hash-verified packaged entry points execute.

**Step 5: Commit**

```bash
git add tools/release/run-explainer-rc.mjs tools/release/run-explainer-rc.test.mjs
git commit -m "feat(p04-t08): run frozen explainer RC"
```

### Task p04-t09: Validate external acceptance evidence

**Files:**

- Create: `tools/release/validate-explainer-acceptance.mjs`
- Create: `tools/release/validate-explainer-acceptance.test.mjs`

**Step 1: Write test (RED)**

Cover wrapper/publish/all modes, matching frozen RC IDs, passing verdicts,
packaged connector execution, receipt hashes, sentinel deletion, missing
evidence, and changed candidate rejection.

Run: `node --test tools/release/validate-explainer-acceptance.test.mjs`
Expected: Acceptance validator is missing.

**Step 2: Implement (GREEN)**

Implement `validate-explainer-acceptance.mjs <acceptance-dir> --gate
wrapper|publish|all` with structured nonzero failures.

**Step 3: Format**

Run: `pnpm exec oxfmt --write tools/release/validate-explainer-acceptance.mjs tools/release/validate-explainer-acceptance.test.mjs`

**Step 4: Verify**

Run: `node --test tools/release/validate-explainer-acceptance.test.mjs`
Expected: Identity, mismatch, packaged execution, and verdict cases pass.

**Step 5: Commit**

```bash
git add tools/release/validate-explainer-acceptance.mjs tools/release/validate-explainer-acceptance.test.mjs
git commit -m "feat(p04-t09): validate explainer acceptance"
```

## Phase 5: Release-candidate acceptance

**Milestone:** One unchanged packaged RC passes the real private-wrapper and
live S3/CDN gates; only then is v1 promotion allowed.

### Task p05-t01: Produce and identify the frozen packaged RC

**Files:**

- Create: `.oat/repo/reference/explainer-kit-acceptance/v1/rc.json`
- Create: `.oat/repo/reference/explainer-kit-acceptance/v1/rc.md`

**Step 1: Build candidate**

Run: `pnpm release:validate && node tools/release/build-explainer-rc.mjs --output dist/explainer-kit-rc --record .oat/repo/reference/explainer-kit-acceptance/v1/rc.json`
Expected: Retained local tarballs and a tracked RC identity record are created.
Add operator notes in `rc.md`; record commit, package/skill versions,
schema/recipe IDs, and artifact hashes.

**Step 2: Format**

Run: `pnpm exec oxfmt --write .oat/repo/reference/explainer-kit-acceptance/v1/rc.json .oat/repo/reference/explainer-kit-acceptance/v1/rc.md`

**Step 3: Verify**

Run: `node tools/release/build-explainer-rc.mjs --output dist/explainer-kit-rc --record .oat/repo/reference/explainer-kit-acceptance/v1/rc.verify.json && cmp .oat/repo/reference/explainer-kit-acceptance/v1/rc.json .oat/repo/reference/explainer-kit-acceptance/v1/rc.verify.json && rm .oat/repo/reference/explainer-kit-acceptance/v1/rc.verify.json`
Expected: Rebuilding the unchanged candidate produces the same identity record.

**Step 4: Commit**

```bash
git add .oat/repo/reference/explainer-kit-acceptance/v1/rc.json .oat/repo/reference/explainer-kit-acceptance/v1/rc.md
git commit -m "chore(p05-t01): freeze explainer release candidate"
```

### Task p05-t02: Record the operator-owned private-wrapper E2E

**Files:**

- Create: `.oat/repo/reference/explainer-kit-acceptance/v1/private-wrapper-result.json`
- Create: `.oat/repo/reference/explainer-kit-acceptance/v1/private-wrapper-e2e.md`

**Step 1: Execute external runbook**

The operator/wave project migrates the real private wrapper to the v1 seam,
then runs:

```bash
~/.agents/skills/personal-explainer-kit/scripts/acceptance.mjs \
  --rc-manifest "$PWD/.oat/repo/reference/explainer-kit-acceptance/v1/rc.json" \
  --request "$PRIVATE_WRAPPER_ACCEPTANCE_REQUEST" \
  --output "$PWD/.oat/repo/reference/explainer-kit-acceptance/v1/private-wrapper-result.json"
```

The private request remains outside the repository. The run validates vault,
Google Docs, presets, personal destinations, manifest consumption, and rollback.

**Step 2: Record evidence**

Capture RC identity, sanitized command/context, manifest/receipt hashes,
durability result, capability checklist, and operator verdict. No credentials
or private content enter this repository.

**Step 3: Format**

Run: `pnpm exec oxfmt --write .oat/repo/reference/explainer-kit-acceptance/v1/private-wrapper-result.json .oat/repo/reference/explainer-kit-acceptance/v1/private-wrapper-e2e.md`

**Step 4: Verify**

Run: `node tools/release/validate-explainer-acceptance.mjs .oat/repo/reference/explainer-kit-acceptance/v1 --gate wrapper`
Expected: Wrapper verdict passes and references exactly the frozen RC.

**Step 5: Commit**

```bash
git add .oat/repo/reference/explainer-kit-acceptance/v1/private-wrapper-result.json .oat/repo/reference/explainer-kit-acceptance/v1/private-wrapper-e2e.md
git commit -m "test(p05-t02): record private wrapper acceptance"
```

### Task p05-t03: Record the live S3/CDN smoke test

**Files:**

- Create: `.oat/repo/reference/explainer-kit-acceptance/v1/live-publish-request.json`
- Create: `.oat/repo/reference/explainer-kit-acceptance/v1/live-publish-result.json`
- Create: `.oat/repo/reference/explainer-kit-acceptance/v1/publish-receipt.json`
- Create: `.oat/repo/reference/explainer-kit-acceptance/v1/s3-cdn-smoke.md`

**Step 1: Execute live test**

Create a credential-free request that references an RC artifact and the
operator-provisioned corresponding roots, then run:

```bash
node tools/release/run-explainer-rc.mjs \
  --rc-manifest .oat/repo/reference/explainer-kit-acceptance/v1/rc.json \
  --entry scripts/publish.mjs \
  --record .oat/repo/reference/explainer-kit-acceptance/v1/live-publish-result.json \
  -- \
  --request .oat/repo/reference/explainer-kit-acceptance/v1/live-publish-request.json \
  --receipt .oat/repo/reference/explainer-kit-acceptance/v1/publish-receipt.json
```

The runner verifies/extracts the recorded core tarball and forbids a source-tree
fallback. Credentials come only from the standard AWS chain. Retain the
sanitized receipt and packaged-execution record.

**Step 2: Validate**

Confirm the sentinel used a run-unique unguessable suffix, was removed, no
undeclared object changed, MIME is correct, and receipt hashes match the RC
artifact.

**Step 3: Format**

Run: `pnpm exec oxfmt --write .oat/repo/reference/explainer-kit-acceptance/v1/live-publish-request.json .oat/repo/reference/explainer-kit-acceptance/v1/live-publish-result.json .oat/repo/reference/explainer-kit-acceptance/v1/publish-receipt.json .oat/repo/reference/explainer-kit-acceptance/v1/s3-cdn-smoke.md`

**Step 4: Verify**

Run: `node tools/release/validate-explainer-acceptance.mjs .oat/repo/reference/explainer-kit-acceptance/v1 --gate publish`
Expected: Live URL, sentinel, receipt, packaged connector identity, and frozen
RC identity pass.

**Step 5: Commit**

```bash
git add .oat/repo/reference/explainer-kit-acceptance/v1/live-publish-request.json .oat/repo/reference/explainer-kit-acceptance/v1/live-publish-result.json .oat/repo/reference/explainer-kit-acceptance/v1/publish-receipt.json .oat/repo/reference/explainer-kit-acceptance/v1/s3-cdn-smoke.md
git commit -m "test(p05-t03): record live explainer publish"
```

### Task p05-t04: Confirm promotion readiness

**Files:**

- Create: `.oat/repo/reference/explainer-kit-acceptance/v1/promotion.md`

**Step 1: Reconcile evidence**

Verify RC, private-wrapper, and S3/CDN records reference one unchanged commit
and package/skill/schema/recipe set. Any failure requires a new RC and rerun of
both external gates.

**Step 2: Run final gates**

Run: `node tools/release/validate-explainer-acceptance.mjs .oat/repo/reference/explainer-kit-acceptance/v1 --gate all && pnpm release:validate && pnpm test`
Expected: Both external gates reference the unchanged RC and the repository
remains release-valid.

**Step 3: Format**

Run: `pnpm exec oxfmt --write .oat/repo/reference/explainer-kit-acceptance/v1/promotion.md`

**Step 4: Commit**

```bash
git add .oat/repo/reference/explainer-kit-acceptance/v1/promotion.md
git commit -m "chore(p05-t04): approve explainer v1 promotion"
```

## Reviews

| Scope  | Type     | Status          | Date       | Artifact                                                    |
| ------ | -------- | --------------- | ---------- | ----------------------------------------------------------- |
| p01    | code     | passed          | 2026-07-17 | reviews/p01-review-2026-07-17T230548Z.md                    |
| p02    | code     | pending         | -          | -                                                           |
| p03    | code     | pending         | -          | -                                                           |
| p04    | code     | pending         | -          | -                                                           |
| p05    | code     | pending         | -          | -                                                           |
| final  | code     | pending         | -          | -                                                           |
| spec   | artifact | pending         | -          | -                                                           |
| design | artifact | pending         | -          | -                                                           |
| plan   | artifact | fixes_completed | 2026-07-17 | reviews/archived/artifact-plan-review-2026-07-17T191324Z.md |

**Status values:** `pending` → `received` → `fixes_added` →
`fixes_completed` → `passed`

## Implementation Complete

**Summary:**

- Phase 1: 6 tasks — schemas/validation, config/state, package skeleton
- Phase 2: 10 tasks — core pipeline, themes, rendering, QA, durability
- Phase 3: 9 tasks — OAT adapter and lifecycle/archive integration
- Phase 4: 9 tasks — publishing, compatibility, docs, release validation
- Phase 5: 4 tasks — frozen RC and external acceptance

**Total: 38 tasks**

Ready for implementation. The configured cross-family gate was explicitly
waived by the user after manual review and acceptance of the late artifact's
fixes.

## References

- Design: `design.md`
- Specification: `spec.md`
- Discovery: `discovery.md`
- Reference drafts: `references/skill-drafts/`
- Collaboration log: `brainstorming/2026-07-16-collab-log.md`
