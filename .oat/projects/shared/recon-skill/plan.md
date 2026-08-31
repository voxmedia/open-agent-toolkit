---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-08-31
oat_phase: plan
oat_phase_status: in_progress
oat_plan_parallel_groups: []
oat_plan_source: quick
oat_import_reference: null
oat_import_source_path: null
oat_import_provider: null
oat_generated: false
oat_template: false
---

# Implementation Plan: recon-skill

> Execute this plan using `oat-project-implement`. The phases are intentionally
> sequential because later contracts and lifecycle work consume earlier files
> and tests.

**Goal:** Add a provider-neutral `recon` skill that produces validated,
directory-based evidence packets through approved economical subagent waves,
then distribute it and its worker role through the research pack without
duplicating utility-pack ownership.

**Architecture:** Extend `oat-dispatch-subagents` with a no-launch
`prepare → approve → execute` contract, implement `recon` as an artifact-first
controller with deterministic packet validators and renderers, and add
same-scope pack dependency leases plus user-scope pack-agent materialization.
The canonical claim ledger and immutable review briefs keep raw worker dossiers
outside the normal consumer context.

**Tech Stack:** Agent Skills Markdown, Node.js ESM helper scripts and Node test
runner, TypeScript 7, Zod-backed CLI configuration, Vitest, pnpm/Turborepo,
Fumadocs.

**Commit Convention:** `{type}({task-id}): {description}`

## Planning Decisions

- This is a quick-workflow plan backed by the completed lightweight design.
- No per-phase review gate is configured. Plan-level HiLL phase metadata is
  left unset for the implementation workflow to resolve separately.
- Project dispatch remains managed with the user-approved `high` ceiling from
  `state.md`; the plan adds no model-specific override.
- Implementation is sequential. The dispatch contract is consumed by the recon
  skill; recon assets are consumed by pack and provider lifecycle work; docs and
  release packaging consume the complete shipped surface.
- Automatic project-discovery/quick-start integration and broader integration
  with existing research skills remain in the two recorded backlog items and
  are not implementation tasks here.

## Phase 1: Approval-Bound Dispatch Contract

### Task p01-t01: Add selection-only preparation and approval-bound execution

**Files:**

- Modify: `.agents/skills/oat-dispatch-subagents/SKILL.md`
- Modify: `.agents/skills/oat-dispatch-subagents/references/record-schema.md`
- Create: `.agents/skills/oat-dispatch-subagents/tests/approval-contract.test.mjs`
- Modify: `packages/cli/src/validation/skills.test.ts`

**Step 1: Add failing contract tests**

Assert that the bundled dispatch instructions and record schema define:

- a `prepare` operation that observes the live catalog and returns a complete
  dispatch record without launching;
- run-wide task-class floor calculation and one exact target pinned across all
  prepared waves;
- canonical approval fingerprints covering every selection and execution axis;
- `execute` refusal after model, effort, provider, route, role, service tier,
  authority, deadline, concurrency, lane cap, or relevant catalog drift;
- no replacement or alternate route after launch acceptance; and
- backwards compatibility for callers that perform the current one-step
  selection-and-launch flow.

Run:

```bash
node --test .agents/skills/oat-dispatch-subagents/tests/approval-contract.test.mjs
```

Expected: the new assertions fail before the contract is updated.

**Step 2: Define the versioned prepared-record state machine**

Extend `record-schema.md` with prepared selection evidence, exact launch axes,
per-wave task class and floor, run maximum floor, canonical serialization,
approval fingerprint and timestamp, catalog observation identity, launch
acceptance, and terminal outcome. Define legal transitions for `prepared`,
`approved`, `accepted`, `completed`, `not-accepted`, and `stale`, including
which changes force reapproval.

**Step 3: Update the dispatch workflow**

Add the selection-only and approval-bound modes to `SKILL.md`, preserve existing
provider reference loading, require the caller to classify all planned and
conditional waves before target selection, and prohibit silent floor weakening
or target substitution. Increase the skill frontmatter version once for this
PR.

**Step 4: Format and verify**

Run:

```bash
pnpm format:fix
node --test .agents/skills/oat-dispatch-subagents/tests/approval-contract.test.mjs
pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts
pnpm oat:validate-skills
```

Expected: the focused Node and Vitest contracts pass, and canonical skill
validation accepts the bumped skill.

**Step 5: Commit**

```bash
git add .agents/skills/oat-dispatch-subagents packages/cli/src/validation/skills.test.ts
git commit -m "feat(p01-t01): add approval-bound dispatch preparation"
```

## Phase 2: Recon Skill, Worker, and Packet Pipeline

### Task p02-t01: Define the recon controller and worker contracts

**Files:**

- Create: `.agents/skills/recon/SKILL.md`
- Create: `.agents/skills/recon/references/profiles.md`
- Create: `.agents/skills/recon/references/worker-contract.md`
- Create: `.agents/skills/recon/tests/skill-contract.test.mjs`
- Create: `.agents/agents/recon-worker.md`
- Modify: `packages/cli/src/validation/skills.test.ts`

**Step 1: Add failing static contract tests**

Test the frontmatter and workflow text for provider neutrality, exact model and
effort approval before launch, homogeneous run selection, `quick`/`standard`/
`thorough` profiles, adaptive lane caps, selective blindness, packet-directory
handoff, honest partial publication, no silent retry or substitution, and the
context firewall. Test that `recon-worker` exposes only the declared modes,
never interacts with the user, never dispatches children, and writes only its
assigned artifact.

Run:

```bash
node --test .agents/skills/recon/tests/skill-contract.test.mjs
```

Expected: the assertions fail until the new skill and role exist.

**Step 2: Author the common worker role**

Define `map`, `gather`, `compile`, `verify`, `adversary`, `coverage`, and
`reconcile` assignment modes in one canonical agent. Require explicit allowed
inputs, excluded inputs, source-read authority, sole write path, output schema,
uncertainty and contradiction reporting, and non-interactive operation.

**Step 3: Author the controller and profile references**

Implement request completion, destination precedence, source preflight,
provider/contract/unavailable enforcement levels, optional strict mode,
run-wide floor selection, approval-envelope presentation, approved dispatch,
stage sequencing, publication eligibility, and compact completion handoff.
Keep provider catalogs and exact launch mechanics in the dispatch dependencies;
include model examples only as explicitly labeled, non-normative examples.

**Step 4: Format and verify**

Run:

```bash
pnpm format:fix
node --test .agents/skills/recon/tests/skill-contract.test.mjs
pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts
pnpm oat:validate-skills
```

Expected: the controller and worker contracts pass without introducing nested
skills or skill-local agent definitions.

**Step 5: Commit**

```bash
git add .agents/skills/recon .agents/agents/recon-worker.md packages/cli/src/validation/skills.test.ts
git commit -m "feat(p02-t01): define recon controller and worker"
```

### Task p02-t02: Implement packet schemas and deterministic validation

**Files:**

- Create: `.agents/skills/recon/references/packet-contract.md`
- Create: `.agents/skills/recon/scripts/lib/contracts.mjs`
- Create: `.agents/skills/recon/scripts/lib/canonical-json.mjs`
- Create: `.agents/skills/recon/scripts/validate-artifact.mjs`
- Create: `.agents/skills/recon/scripts/validate-packet.mjs`
- Create: `.agents/skills/recon/tests/packet-validation.test.mjs`
- Create: `.agents/skills/recon/tests/fixtures/`
- Modify: `.agents/skills/recon/SKILL.md`
- Modify: `.agents/skills/recon/references/worker-contract.md`

**Step 1: Add failing fixture-driven validation tests**

Cover valid quick, standard, thorough, and partial packets plus invalid schema
versions, duplicate IDs, bad state transitions, missing artifact references,
hash mismatches, path escape, source drift, wrong excerpts, shifted lines,
changed URL captures, changed command outputs, changed connected-resource
versions, insufficient provenance, and redacted-exact evidence. Assert that a
quick packet cannot claim `verified`, unresolved challenge prevents
verification, and structural failure leaves no publishable `packet.md`.

Run:

```bash
node --test .agents/skills/recon/tests/packet-validation.test.mjs
```

Expected: fixture cases fail before the validators are implemented.

**Step 2: Define the versioned packet contracts**

Document and implement discriminated schemas for manifests, source
descriptors, typed locators, evidence records, claim ledgers, raw dossiers,
review briefs, review results, stage results, gaps, artifact references, and
dispatch receipts. Encode categorical claim states and legal promotion rules.

**Step 3: Implement deterministic validation**

Add canonical JSON hashing, managed-path containment, artifact digest checks,
source-kind locator validation, transient secret-span validation with redacted
persistence, review-brief disclosure checks, approval-envelope fingerprint
verification, and requested-versus-achieved profile derivation. Validators
must quarantine invalid candidates under `raw/` and never promote a shared
artifact in place.

**Step 4: Format and verify**

Run:

```bash
pnpm format:fix
node --test .agents/skills/recon/tests/packet-validation.test.mjs
node --test .agents/skills/recon/tests/*.test.mjs
pnpm oat:validate-skills
```

Expected: every positive and negative fixture has the designed deterministic
outcome, including secret redaction and locator downgrade behavior.

**Step 5: Commit**

```bash
git add .agents/skills/recon
git commit -m "feat(p02-t02): add recon packet validation"
```

### Task p02-t03: Add blind-review projection and deterministic packet rendering

**Files:**

- Create: `.agents/skills/recon/scripts/create-review-brief.mjs`
- Create: `.agents/skills/recon/scripts/render-packet.mjs`
- Create: `.agents/skills/recon/tests/review-brief.test.mjs`
- Create: `.agents/skills/recon/tests/render-packet.test.mjs`
- Modify: `.agents/skills/recon/tests/fixtures/`
- Modify: `.agents/skills/recon/SKILL.md`
- Modify: `.agents/skills/recon/references/packet-contract.md`

**Step 1: Add failing projection and rendering tests**

Assert that verification briefs contain only claim statements, display
excerpts, locators, and required source descriptors; adversarial briefs contain
only scope, questions, and provisional statements; neither contains raw dossier
paths, compiler reasoning, synthesis prose, provenance artifact references, or
prior review IDs. Assert stable output and digests for identical inputs and
atomic publication only after structural validation.

Run:

```bash
node --test .agents/skills/recon/tests/review-brief.test.mjs .agents/skills/recon/tests/render-packet.test.mjs
```

Expected: the projection and renderer tests fail before implementation.

**Step 2: Implement immutable review-brief projection**

Generate mode-specific briefs at unique paths, canonicalize them, and record
their digests as the exact reviewed input. Reject fields that violate the
selective-blind contract.

**Step 3: Implement consumer rendering and publication**

Render `packet.md` from the final validated manifest and claim ledger with run
status, requested and achieved profiles, synthesis, exact compact locators,
claim states, contradictions, unresolved questions, coverage gaps, and failed
or omitted passes. Write a temporary sibling and promote it only after full
packet validation; return only the directory path and compact status summary.

**Step 4: Format and verify the complete skill pipeline**

Run:

```bash
pnpm format:fix
node --test .agents/skills/recon/tests/*.test.mjs
pnpm test:skills
pnpm oat:validate-skills
```

Expected: all recon helpers are deterministic, no raw dossier content reaches
the rendered packet or parent handoff, and canonical skill validation passes.

**Step 5: Commit**

```bash
git add .agents/skills/recon
git commit -m "feat(p02-t03): render validated recon packets"
```

### Task p02-t04: Exercise complete recon runs with fake dispatch

**Files:**

- Create: `.agents/skills/recon/tests/helpers/fake-recon-run.mjs`
- Create: `.agents/skills/recon/tests/workflow.integration.test.mjs`
- Modify: `.agents/skills/recon/tests/fixtures/`

**Step 1: Add failing end-to-end scenarios**

Drive the real validation, brief-projection, reconciliation, and rendering
helpers with fixture sources and fake prepared/accepted dispatch records. Cover
quick, standard, and thorough runs; honest partial publication; generic-role
fallback before approval; dispatch-axis drift; invalid output quarantine with
last-valid-ledger preservation; contract-enforced and strict authority modes;
structural failure without `packet.md`; and a directory-only parent handoff.

Run:

```bash
node --test .agents/skills/recon/tests/workflow.integration.test.mjs
```

Expected: the scenario assertions fail until the fixture runner connects the
complete deterministic pipeline.

**Step 2: Implement the fixture runner**

Build a test-only orchestrator that creates a temporary packet root, applies a
profile topology, feeds immutable fake dispatch receipts and unique worker
artifacts through the production helpers, and returns the same compact status
shape promised by the skill. Inject all source, packet, assets, and user roots;
never resolve bundle-tier fixtures from the real user environment.

**Step 3: Format and verify**

Run:

```bash
pnpm format:fix
node --test .agents/skills/recon/tests/workflow.integration.test.mjs
node --test .agents/skills/recon/tests/*.test.mjs
pnpm test:skills
pnpm oat:validate-skills
```

Expected: every designed workflow outcome is reproduced without a live model
call, and no scenario leaks raw dossier content into the consumer result.

**Step 4: Commit**

```bash
git add .agents/skills/recon/tests/helpers/fake-recon-run.mjs .agents/skills/recon/tests/workflow.integration.test.mjs .agents/skills/recon/tests/fixtures
git commit -m "test(p02-t04): cover recon workflow outcomes"
```

## Phase 3: Research-Pack Distribution and Provider Materialization

### Task p03-t01: Model same-scope pack dependencies and durable leases

**Files:**

- Modify: `packages/cli/src/commands/tools/shared/types.ts`
- Modify: `packages/cli/src/commands/tools/shared/pack-manifest.ts`
- Modify: `packages/cli/src/config/oat-config.ts`
- Modify: `packages/cli/src/config/oat-config.test.ts`
- Modify: `packages/cli/src/commands/tools/shared/scoped-pack-intent.ts`
- Modify: `packages/cli/src/commands/tools/shared/scoped-pack-intent.test.ts`
- Modify: `packages/cli/src/commands/tools/shared/pack-manifest.test.ts`

**Step 1: Add failing model and persistence tests**

Test a research dependency declaration that targets only
`skill:oat-dispatch-subagents` and `skill:subagent-orchestration` from the
utility pack at the same scope. Test configuration round trips for direct pack
intent and sorted, deduplicated `requiredBy` leases, including migration from
the existing boolean-only tools configuration. Test a user-materializable asset
marker and reject it on anything except a managed agent that supports user
scope.

Run:

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/config/oat-config.test.ts src/commands/tools/shared/scoped-pack-intent.test.ts src/commands/tools/shared/pack-manifest.test.ts
```

Expected: dependency and lease assertions fail before the data model exists.

**Step 2: Add dependency metadata**

Extend `PackDefinition` with validated same-scope dependency declarations that
identify the owning pack and selected managed asset IDs. Reject unknown packs,
unknown assets, cross-scope dependencies, dependency cycles, and duplicate
edges in manifest validation. Extend `PackAssetDefinition` with the explicit
user-materializable marker and validate its kind, scope, and ownership
constraints.

**Step 3: Separate direct intent from transitive leases**

Extend scoped pack state so direct user intent remains compatible with current
`tools.<pack>` booleans while dependency leases persist independently as
`requiredBy`. Reads must distinguish direct, transitive, legacy-inferred, and
absent state; a dependency-owned partial footprint must not be inferred as a
direct full-pack install. Writes must be deterministic and preserve unrelated
configuration.

**Step 4: Format and verify**

Run:

```bash
pnpm format:fix
pnpm --filter @open-agent-toolkit/cli exec vitest run src/config/oat-config.test.ts src/commands/tools/shared/scoped-pack-intent.test.ts src/commands/tools/shared/pack-manifest.test.ts
pnpm --filter @open-agent-toolkit/cli exec tsc --noEmit
```

Expected: existing boolean intent remains readable and dependency state is
deterministic and cycle-safe.

**Step 5: Commit**

```bash
git add packages/cli/src/config/oat-config.ts packages/cli/src/config/oat-config.test.ts packages/cli/src/commands/tools/shared/types.ts packages/cli/src/commands/tools/shared/pack-manifest.ts packages/cli/src/commands/tools/shared/pack-manifest.test.ts packages/cli/src/commands/tools/shared/scoped-pack-intent.ts packages/cli/src/commands/tools/shared/scoped-pack-intent.test.ts
git commit -m "feat(p03-t01): model pack dependency leases"
```

### Task p03-t02: Reconcile dependency leases across pack lifecycles

**Files:**

- Create: `packages/cli/src/commands/tools/shared/pack-dependencies.ts`
- Create: `packages/cli/src/commands/tools/shared/pack-dependencies.test.ts`
- Modify: `packages/cli/src/commands/tools/shared/pack-lifecycle.ts`
- Modify: `packages/cli/src/commands/tools/shared/pack-lifecycle.test.ts`
- Modify: `packages/cli/src/commands/tools/shared/pack-reconcile.ts`
- Modify: `packages/cli/src/commands/tools/shared/pack-reconcile.test.ts`
- Modify: `packages/cli/src/commands/tools/shared/apply-pack-reconcile.ts`
- Modify: `packages/cli/src/commands/tools/shared/apply-pack-reconcile.test.ts`
- Modify: `packages/cli/src/commands/tools/update/update-tools.ts`
- Modify: `packages/cli/src/commands/tools/update/update-tools.test.ts`
- Modify: `packages/cli/src/commands/tools/remove/remove-tools.ts`
- Modify: `packages/cli/src/commands/tools/remove/remove-tools.test.ts`
- Modify: `packages/cli/src/commands/tools/remove/index.ts`
- Modify: `packages/cli/src/commands/tools/remove/config-write.test.ts`
- Modify: `packages/cli/src/commands/tools/install/index.ts`
- Modify: `packages/cli/src/commands/tools/install/index.test.ts`
- Modify: `packages/cli/src/commands/tools/migrate/migrate-pack.ts`
- Modify: `packages/cli/src/commands/tools/migrate/migrate-pack.test.ts`
- Modify: `packages/cli/src/commands/init/tools/index.ts`
- Modify: `packages/cli/src/commands/init/tools/index.test.ts`
- Modify: `packages/cli/src/commands/tools/shared/install-sync-context.ts`
- Modify: `packages/cli/src/commands/tools/shared/install-sync-context.test.ts`
- Modify: `packages/cli/src/commands/tools/tool-pack-lifecycle.integration.test.ts`

**Step 1: Add failing lifecycle tests**

Cover install, update, dry run, inventory, removal, and migration when research
is the only utility consumer; when utility has direct intent; when multiple
packs hold leases; when a dependency asset is drifted; and when research moves
between user and project scopes. Assert idempotent repeated reconciliation and
preflight of every managed path before any write. Exercise the actual
`oat tools install research` and `oat tools remove research` command boundaries,
including dependency canonical paths in provider sync and cleanup. Every test
must inject temporary scope, assets, and user roots rather than resolving
against the real user environment.

Run:

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/tools/shared/pack-dependencies.test.ts src/commands/tools/shared/pack-lifecycle.test.ts src/commands/tools/shared/pack-reconcile.test.ts src/commands/tools/shared/apply-pack-reconcile.test.ts src/commands/tools/shared/install-sync-context.test.ts src/commands/tools/install/index.test.ts src/commands/tools/update/update-tools.test.ts src/commands/tools/remove/remove-tools.test.ts src/commands/tools/remove/config-write.test.ts src/commands/tools/migrate/migrate-pack.test.ts src/commands/init/tools/index.test.ts src/commands/tools/tool-pack-lifecycle.integration.test.ts
```

Expected: transitive lifecycle cases fail before dependency expansion exists.

**Step 2: Plan dependency operations**

Expand a root pack request into ordered same-scope dependency operations,
acquire or release `requiredBy` leases separately from direct intent, and
deduplicate shared requests. Installation and update reconcile only the
declared utility asset subset. Removal deletes a dependency asset only when no
direct intent, other lease, or compatible ownership evidence remains.

**Step 3: Apply lifecycle operations atomically at the plan boundary**

Preflight root and dependency paths together, preserve dry-run reporting,
verify inventories before persisting intent, and return dependency actions in
the lifecycle result so CLI output remains auditable. Migration must acquire
destination leases before releasing source leases and retain a recoverable
source state on destination failure. The install command must pass root and
dependency canonical paths into filtered auto-sync; the remove command must
release leases before it computes provider cleanup and clear only direct root
intent.

**Step 4: Format and verify**

Run:

```bash
pnpm format:fix
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/tools/shared/pack-dependencies.test.ts src/commands/tools/shared/pack-lifecycle.test.ts src/commands/tools/shared/pack-reconcile.test.ts src/commands/tools/shared/apply-pack-reconcile.test.ts src/commands/tools/shared/install-sync-context.test.ts src/commands/tools/install/index.test.ts src/commands/tools/update/update-tools.test.ts src/commands/tools/remove/remove-tools.test.ts src/commands/tools/remove/config-write.test.ts src/commands/tools/migrate/migrate-pack.test.ts src/commands/init/tools/index.test.ts src/commands/tools/tool-pack-lifecycle.integration.test.ts
pnpm --filter @open-agent-toolkit/cli exec tsc --noEmit
```

Expected: dependency assets remain utility-owned, direct installs survive
research removal, and transitive-only installs are cleaned up safely.

**Step 5: Commit**

```bash
git add packages/cli/src/commands/tools/shared/pack-dependencies.ts packages/cli/src/commands/tools/shared/pack-dependencies.test.ts packages/cli/src/commands/tools/shared/pack-lifecycle.ts packages/cli/src/commands/tools/shared/pack-lifecycle.test.ts packages/cli/src/commands/tools/shared/pack-reconcile.ts packages/cli/src/commands/tools/shared/pack-reconcile.test.ts packages/cli/src/commands/tools/shared/apply-pack-reconcile.ts packages/cli/src/commands/tools/shared/apply-pack-reconcile.test.ts packages/cli/src/commands/tools/shared/install-sync-context.ts packages/cli/src/commands/tools/shared/install-sync-context.test.ts packages/cli/src/commands/tools/install/index.ts packages/cli/src/commands/tools/install/index.test.ts packages/cli/src/commands/tools/update/update-tools.ts packages/cli/src/commands/tools/update/update-tools.test.ts packages/cli/src/commands/tools/remove/remove-tools.ts packages/cli/src/commands/tools/remove/remove-tools.test.ts packages/cli/src/commands/tools/remove/index.ts packages/cli/src/commands/tools/remove/config-write.test.ts packages/cli/src/commands/tools/migrate/migrate-pack.ts packages/cli/src/commands/tools/migrate/migrate-pack.test.ts packages/cli/src/commands/tools/tool-pack-lifecycle.integration.test.ts packages/cli/src/commands/init/tools/index.ts packages/cli/src/commands/init/tools/index.test.ts
git commit -m "feat(p03-t02): reconcile pack dependencies"
```

### Task p03-t03: Materialize installed user-scope pack agents

**Files:**

- Modify: `packages/cli/src/shared/types.ts`
- Modify: `packages/cli/src/engine/scanner.ts`
- Modify: `packages/cli/src/engine/scanner.test.ts`
- Modify: `packages/cli/src/commands/sync/sync.types.ts`
- Modify: `packages/cli/src/commands/sync/index.ts`
- Modify: `packages/cli/src/commands/sync/index.test.ts`
- Modify: `packages/cli/src/commands/init/index.ts`
- Modify: `packages/cli/src/commands/init/index.test.ts`
- Modify: `packages/cli/src/commands/status/index.ts`
- Modify: `packages/cli/src/commands/status/index.test.ts`
- Modify: `packages/cli/src/commands/tools/shared/pack-inventory.ts`
- Modify: `packages/cli/src/commands/tools/shared/pack-inventory.test.ts`
- Modify: `packages/cli/src/commands/doctor/index.ts`
- Modify: `packages/cli/src/commands/doctor/index.test.ts`

**Step 1: Add failing provider-materialization tests**

Test that user sync discovers only installed, manifest-declared,
user-materializable managed agents; validates their bundled source; passes them
through active provider adapters and extensions; rejects canonical or provider
destination collisions; and removes a projection only when no pack or direct
managed-role intent retains it. Preserve the current built-in reviewer and
implementer roles. Inject a synthetic eligible pack-agent definition so the
generic materialization mechanism is verified before p03-t04 registers the
real recon asset.

Run:

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/engine/scanner.test.ts src/commands/sync/index.test.ts src/commands/init/index.test.ts src/commands/status/index.test.ts src/commands/tools/shared/pack-inventory.test.ts src/commands/doctor/index.test.ts
```

Expected: the recon-worker user-scope cases fail under the existing hard-coded
managed-role list.

**Step 2: Generalize installed role discovery**

Replace the closed filename-only scan with a resolver that merges built-in
managed roles and installed pack agents explicitly marked user-materializable.
Use pack inventory and bundled definitions as the authority; do not expose
arbitrary user Markdown files as managed provider roles.

**Step 3: Integrate provider planning and diagnostics**

Feed the resolved agents to normal sync planning and materialization
extensions, retain provider-specific codec behavior, update status/doctor to
report real reachability, and keep a visible generic-role fallback for a
provider that cannot express the canonical role.

**Step 4: Format and verify**

Run:

```bash
pnpm format:fix
pnpm --filter @open-agent-toolkit/cli exec vitest run src/engine/scanner.test.ts src/commands/sync/index.test.ts src/commands/init/index.test.ts src/commands/status/index.test.ts src/commands/tools/shared/pack-inventory.test.ts src/commands/doctor/index.test.ts
pnpm --filter @open-agent-toolkit/cli exec tsc --noEmit
```

Expected: user-scope `recon-worker` reaches supported providers without
materializing undeclared custom agents or regressing built-in roles.

**Step 5: Commit**

```bash
git add packages/cli/src/shared/types.ts packages/cli/src/engine/scanner.ts packages/cli/src/engine/scanner.test.ts packages/cli/src/commands/sync/sync.types.ts packages/cli/src/commands/sync/index.ts packages/cli/src/commands/sync/index.test.ts packages/cli/src/commands/init/index.ts packages/cli/src/commands/init/index.test.ts packages/cli/src/commands/status/index.ts packages/cli/src/commands/status/index.test.ts packages/cli/src/commands/tools/shared/pack-inventory.ts packages/cli/src/commands/tools/shared/pack-inventory.test.ts packages/cli/src/commands/doctor/index.ts packages/cli/src/commands/doctor/index.test.ts
git commit -m "feat(p03-t03): materialize user pack agents"
```

### Task p03-t04: Register and bundle recon in the research pack

**Files:**

- Modify: `packages/cli/src/commands/tools/shared/pack-manifest.ts`
- Modify: `packages/cli/src/commands/tools/shared/pack-manifest.test.ts`
- Modify: `packages/cli/src/commands/init/tools/shared/pack-metadata.test.ts`
- Modify: `packages/cli/src/commands/init/tools/shared/bundle-consistency.test.ts`
- Modify: `packages/cli/src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts`
- Modify: `packages/cli/src/commands/init/tools/research/install-research.ts`
- Modify: `packages/cli/src/commands/init/tools/research/install-research.test.ts`
- Modify: `packages/cli/src/commands/init/tools/research/index.ts`
- Modify: `packages/cli/src/commands/init/tools/research/index.test.ts`
- Modify: `packages/cli/src/commands/tools/shared/scan-tools.test.ts`
- Modify: `packages/cli/scripts/bundle-inputs.mjs`
- Modify: `packages/cli/scripts/bundle-assets.sh`

**Step 1: Add failing pack and bundle assertions**

Assert that research contains the `recon` skill and `recon-worker.md`, marks the
agent user-materializable, declares the two utility asset dependencies, and
keeps both dependency assets owned only by utility. Cover legacy research
installation, selectable skill behavior, tool scanning, bundle inventory, and
portable dependency-root instructions. Inject temporary assets, scope, and user
roots in every bundle-tier test.

Run:

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/tools/shared/pack-manifest.test.ts src/commands/init/tools/shared/pack-metadata.test.ts src/commands/init/tools/shared/bundle-consistency.test.ts src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts src/commands/init/tools/research/install-research.test.ts src/commands/init/tools/research/index.test.ts src/commands/tools/shared/scan-tools.test.ts
```

Expected: the new research assets and dependency guarantees are absent.

**Step 2: Register canonical assets**

Add the skill and agent to the research manifest, set user materialization on
the agent, and keep the utility dependency edges separate from research asset
ownership. Update derived manifest consumers and legacy installers without
duplicating source-of-truth lists.

**Step 3: Update the release bundle**

Add `recon` and `recon-worker.md` to the canonical arrays in
`bundle-inputs.mjs` and keep `bundle-assets.sh` consuming that source of truth.
The shipped skill includes runtime references and scripts; the bundle continues
to remove test-only directories and fixtures. Add contract checks for packaged
runtime helpers, installed-root dependency loading, and the generic-role
fallback.

**Step 4: Format and verify**

Run:

```bash
pnpm format:fix
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/tools/shared/pack-manifest.test.ts src/commands/init/tools/shared/pack-metadata.test.ts src/commands/init/tools/shared/bundle-consistency.test.ts src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts src/commands/init/tools/research/install-research.test.ts src/commands/init/tools/research/index.test.ts src/commands/tools/shared/scan-tools.test.ts
pnpm test:skills
pnpm oat:validate-skills
```

Expected: canonical and bundled inventories agree and research installation
delivers all standalone recon capabilities at either supported scope.

**Step 5: Commit**

```bash
git add packages/cli/src/commands/tools/shared/pack-manifest.ts packages/cli/src/commands/tools/shared/pack-manifest.test.ts packages/cli/src/commands/init/tools/shared/pack-metadata.test.ts packages/cli/src/commands/init/tools/shared/bundle-consistency.test.ts packages/cli/src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts packages/cli/src/commands/init/tools/research/install-research.ts packages/cli/src/commands/init/tools/research/install-research.test.ts packages/cli/src/commands/init/tools/research/index.ts packages/cli/src/commands/init/tools/research/index.test.ts packages/cli/src/commands/tools/shared/scan-tools.test.ts packages/cli/scripts/bundle-inputs.mjs packages/cli/scripts/bundle-assets.sh
git commit -m "feat(p03-t04): ship recon in research pack"
```

## Phase 4: Documentation, Release Packaging, and Completion Gates

### Task p04-t01: Document recon and research-pack dependency behavior

**Files:**

- Create: `apps/oat-docs/docs/workflows/skills/recon.md`
- Modify: `apps/oat-docs/docs/workflows/skills/index.md`
- Modify: `apps/oat-docs/docs/cli-utilities/tool-packs.md`
- Modify: `apps/oat-docs/docs/contributing/skills.md`
- Regenerate: `apps/oat-docs/index.md`

**Step 1: Document the user contract**

Explain when to use `recon` versus `analyze` or `deep-research`, profile and
approval behavior, output-directory precedence, packet layout, claim states,
selective blindness, strict versus contract enforcement, partial outcomes, and
directory-only consumption. Include user and project research-pack install and
update commands without presenting a named model as the requirement.

**Step 2: Document lifecycle semantics**

Update tool-pack documentation for same-scope dependencies, direct intent,
`requiredBy` leases, migration order, safe removal, and user-scope managed agent
materialization. State clearly that utility retains ownership of both dispatch
skills.

**Step 3: Regenerate the Fumadocs index**

Run:

```bash
pnpm -w run cli:source -- docs generate-index --docs-dir apps/oat-docs/docs --output apps/oat-docs/index.md
pnpm format:fix
```

Do not hand-edit `apps/oat-docs/index.md`.

**Step 4: Verify**

Run:

```bash
pnpm check
pnpm build:docs
```

Expected: markdown, generated index, navigation, and docs build all pass.

**Step 5: Commit**

```bash
git add apps/oat-docs/docs/workflows/skills/recon.md apps/oat-docs/docs/workflows/skills/index.md apps/oat-docs/docs/cli-utilities/tool-packs.md apps/oat-docs/docs/contributing/skills.md apps/oat-docs/index.md
git commit -m "docs(p04-t01): document recon evidence packets"
```

### Task p04-t02: Bump the lockstep release and run all completion gates

**Files:**

- Modify: `packages/cli/package.json`
- Modify: `packages/control-plane/package.json`
- Modify: `packages/docs-config/package.json`
- Modify: `packages/docs-theme/package.json`
- Modify: `packages/docs-transforms/package.json`
- Modify: `pnpm-lock.yaml`
- Modify only if a gate exposes a defect: files already owned by p01-p04

**Step 1: Select and apply the release version**

Fetch `origin/main`, determine the next common package version strictly greater
than the current lockstep baseline, update all five public packages to that
same version, and refresh the lockfile.

Run:

```bash
git fetch origin main
pnpm install --lockfile-only
pnpm format:fix
```

**Step 2: Run uncached and focused correctness checks**

Run:

```bash
pnpm exec turbo run test --force
pnpm test:smoke
pnpm test:skills
pnpm test:release
pnpm oat:validate-skills
pnpm lint
pnpm format
```

Expected: package tests execute rather than replaying only cached results; all
skill, smoke, release, lint, and formatting checks pass. New bundle-tier tests
must inject temporary user, scope, and assets roots; do not override `HOME` or
read the maintainer's installed templates.

**Step 3: Run the CI gates in repository order**

Run each command separately and capture its exit code:

```bash
pnpm check
pnpm type-check
pnpm test
pnpm build
pnpm run check:skill-bumps
pnpm release:check-versions
pnpm release:validate
pnpm build:docs
```

Expected: every command exits 0. Treat cache replay as insufficient evidence
for the earlier forced package-test run, and do not infer a gate result from a
pipe or pager.

**Step 4: Reconcile generated and bundled state**

Confirm `git diff --check`, the generated docs index, the skill version bump,
the five-package lockstep version, bundle inventory, and that no automatic OAT
workflow integration entered the diff. Apply only gate-driven fixes within the
files already owned by this plan and rerun the affected focused checks plus the
full failed gate.

**Step 5: Commit**

```bash
git add packages/cli/package.json packages/control-plane/package.json packages/docs-config/package.json packages/docs-theme/package.json packages/docs-transforms/package.json pnpm-lock.yaml
# If Step 4 changed another plan-owned file, stage that exact path explicitly.
git commit -m "chore(p04-t02): prepare recon release"
```

## Reviews

| Scope     | Type     | Status   | Date       | Artifact                                             | Reviewed Head | Invocation              | Gate Target |
| --------- | -------- | -------- | ---------- | ---------------------------------------------------- | ------------- | ----------------------- | ----------- |
| p01       | code     | pending  | -          | -                                                    | -             | -                       | -           |
| p02       | code     | pending  | -          | -                                                    | -             | -                       | -           |
| p03       | code     | pending  | -          | -                                                    | -             | -                       | -           |
| p04       | code     | pending  | -          | -                                                    | -             | -                       | -           |
| final     | code     | pending  | -          | -                                                    | -             | -                       | -           |
| spec      | artifact | pending  | -          | -                                                    | -             | -                       | -           |
| design    | artifact | passed   | 2026-08-31 | `reviews/design-self-review-2026-08-31T005342Z.md`   | -             | independent-self-review | -           |
| plan-self | artifact | passed   | 2026-08-31 | `reviews/plan-self-review-2026-08-31T011150Z.md`     | -             | independent-self-review | -           |
| plan      | artifact | received | 2026-08-31 | `reviews/artifact-plan-review-2026-08-31T011757Z.md` | -             | -                       | -           |

For code reviews, `Reviewed Head` is the full 40-character SHA at the head of
the reviewed range. `Invocation` records `manual`, `auto`, or `gate`; `Gate
Target` is populated only for gate events. Writers must preserve all rows and
unknown trailing cells.

Status progression is `pending` → `received` → `fixes_added` →
`fixes_completed` → `passed`. In quick mode the `spec` row remains as the
required review-table placeholder; there is no spec artifact to review.

## Implementation Complete

**Summary:**

- Phase 1: 1 task — approval-bound, backwards-compatible dispatch preparation.
- Phase 2: 4 tasks — recon controller, worker, packet validation, blind review,
  deterministic rendering, and fixture-driven end-to-end runs.
- Phase 3: 4 tasks — dependency leases, lifecycle reconciliation, user-agent
  materialization, and research-pack bundling.
- Phase 4: 2 tasks — documentation, lockstep release packaging, and full gates.

**Total: 11 tasks**

After all tasks and implementation reviews pass, the project is ready for the
final code-review and PR-publication workflows.

## References

- Discovery: `discovery.md`
- Design: `design.md`
- Independent design review:
  `reviews/design-self-review-2026-08-31T005342Z.md`
- Backlog, discovery/quick-start integration:
  `.oat/repo/pjm/backlog/items/BL-260830-integrate-recon-with-oat.md`
- Backlog, broader workflow integration:
  `.oat/repo/pjm/backlog/items/BL-260830-integrate-recon-across.md`
