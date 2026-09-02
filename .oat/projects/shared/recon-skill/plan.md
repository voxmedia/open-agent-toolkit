---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-08-31
oat_phase: implement
oat_phase_status: complete
oat_plan_parallel_groups: []
oat_plan_hill_phases: ['p04']
oat_auto_review_at_hill_checkpoints: true
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
- Create: `.claude/skills/recon`
- Create: `.cursor/skills/recon`

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

**Step 4: Refresh repository provider views**

After registering the canonical skill, run the source CLI against project scope
and verify both committed provider skill views resolve back to the canonical
directory:

```bash
pnpm run cli:source -- sync --scope project
test "$(readlink .claude/skills/recon)" = "../../.agents/skills/recon"
test "$(readlink .cursor/skills/recon)" = "../../.agents/skills/recon"
```

User-scope behavior remains covered with injected temporary roots; this step
must not mutate the maintainer's user-scope provider views.

**Step 5: Format and verify**

Run:

```bash
pnpm format:fix
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/tools/shared/pack-manifest.test.ts src/commands/init/tools/shared/pack-metadata.test.ts src/commands/init/tools/shared/bundle-consistency.test.ts src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts src/commands/init/tools/research/install-research.test.ts src/commands/init/tools/research/index.test.ts src/commands/tools/shared/scan-tools.test.ts
pnpm test:skills
pnpm oat:validate-skills
```

Expected: canonical and bundled inventories agree and research installation
delivers all standalone recon capabilities at either supported scope.

**Step 6: Commit**

```bash
git add packages/cli/src/commands/tools/shared/pack-manifest.ts packages/cli/src/commands/tools/shared/pack-manifest.test.ts packages/cli/src/commands/init/tools/shared/pack-metadata.test.ts packages/cli/src/commands/init/tools/shared/bundle-consistency.test.ts packages/cli/src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts packages/cli/src/commands/init/tools/research/install-research.ts packages/cli/src/commands/init/tools/research/install-research.test.ts packages/cli/src/commands/init/tools/research/index.ts packages/cli/src/commands/init/tools/research/index.test.ts packages/cli/src/commands/tools/shared/scan-tools.test.ts packages/cli/scripts/bundle-inputs.mjs packages/cli/scripts/bundle-assets.sh .claude/skills/recon .cursor/skills/recon
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
must inject temporary user, scope, and assets roots and must not read the
maintainer's installed templates. The implementation harness intentionally
leaves process `HOME` unchanged under its governing safety rule; injected roots
are the evidence-grade isolation mechanism for this plan.

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

## Phase p-rev1: Revision 1 — Simplify Packet Validation

Source: inline design feedback and
`reviews/archived/p02-code-rereview-r4-2026-08-31T123548Z.md` (2026-08-31)

This revision preserves the user-facing recon profiles and packet contract while
reducing internal flexibility. Version 1 will compile packet inputs exactly once
into one non-persisted validated run graph. Assurance derivation and rendering
may consume only that graph. The revision adds no new profile, persisted artifact
kind, provider behavior, or integration surface.

### Task prev1-t01: (revision) Simplify the Phase 2 validation design

**Files:**

- Modify: `.oat/projects/shared/recon-skill/design.md`
- Modify: `.agents/skills/recon/references/packet-contract.md`

**Step 1: Define the minimum v1 invariant set**

Revise the design and packet contract around one normalized `ValidatedRun`
boundary:

- one complete canonical approval envelope with every required dispatch and
  execution axis; partial envelopes are invalid rather than extensible;
- one exact approved wave/lane topology and one stage/receipt resolution;
- exactly one terminal reconciliation and one immutable prior-ledger identity;
- canonical absolute realpaths for every declared trust root;
- persisted evidence is secret-safe before any assurance, audit, gap, or render
  branch;
- source ineligibility determines material gaps and partial status rather than
  trusting caller-declared materiality; and
- assurance derivation and rendering accept only the normalized validated graph,
  never independently re-resolve raw manifest artifacts.

Prefer prohibition over configurability in v1: reject extra reconciliation
results, missing approval axes, symlink root aliases, raw stale excerpts, and
caller-downgraded gap materiality. Preserve `quick`, `standard`, `thorough`,
selective blindness, categorical claim states, directory-only handoff, and
honest partial publication.

**Step 2: Record explicit non-goals**

State that this revision does not add another schema version, another review
pass, another persisted intermediate, generalized plugin-style artifact kinds,
or changes to p01 dispatch, research-pack distribution, documentation, or
backlog integrations.

**Step 3: Verify**

Run:

```bash
pnpm format
pnpm run cli -- project validate-plan --project-path .oat/projects/shared/recon-skill
```

Expected: the design and contract describe one authoritative validation boundary
and the project plan remains valid.

**Step 4: Commit**

```bash
git add .oat/projects/shared/recon-skill/design.md .agents/skills/recon/references/packet-contract.md
git commit -m "docs(prev1-t01): simplify recon validation design"
```

### Task prev1-t02: (revision) Centralize packet validation and publication

**Files:**

- Create: `.agents/skills/recon/scripts/lib/validated-run.mjs`
- Modify: `.agents/skills/recon/scripts/lib/contracts.mjs`
- Modify: `.agents/skills/recon/scripts/lib/safe-path.mjs`
- Modify: `.agents/skills/recon/scripts/validate-packet.mjs`
- Modify: `.agents/skills/recon/scripts/reconcile-ledger.mjs`
- Modify: `.agents/skills/recon/scripts/render-packet.mjs`
- Modify: `.agents/skills/recon/tests/fixtures/packet-fixture.mjs`
- Modify: `.agents/skills/recon/tests/helpers/fake-recon-run.mjs`
- Modify: `.agents/skills/recon/tests/integrity-contracts.test.mjs`
- Modify: `.agents/skills/recon/tests/packet-validation.test.mjs`
- Modify: `.agents/skills/recon/tests/render-packet.test.mjs`
- Modify: `.agents/skills/recon/tests/workflow.integration.test.mjs`

**Step 1: Reproduce the five review-round-4 bypasses**

Add direct failing mutations for:

- deletion of every required approval/receipt selection axis;
- a shadow reconciliation whose forged prior ledger authorizes removal from a
  different terminal prior ledger;
- secret-bearing stale, invalid, and unavailable audit evidence;
- a non-material stale-source gap under `complete` status; and
- repository, file, capture, packet, and output roots declared through symlink
  aliases or retargeted after validation.

Expected: each case fails against the pre-revision implementation for the reason
documented in the review artifact.

**Step 2: Compile one validated run graph**

Implement one deterministic normalization boundary that validates schemas,
canonical roots, the complete approval envelope, exact topology and receipts,
the single terminal reconciliation and prior ledger, secret-safe evidence,
derived gaps, claim assurance, achieved profile, and publication status. Reject
duplicate or shadow terminal artifacts. Return only normalized immutable data
needed by assurance and rendering.

Do not add another persisted artifact or schema version. Remove duplicated raw
artifact resolution from downstream assurance and render paths; those paths must
consume the normalized graph.

**Step 3: Verify the complete packet pipeline**

Run:

```bash
pnpm format:fix
node --test .agents/skills/recon/tests/*.test.mjs
pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts
pnpm test:skills
pnpm oat:validate-skills
pnpm lint
pnpm format
pnpm --filter @open-agent-toolkit/cli exec tsc --noEmit
pnpm check
```

Expected: all prior 79 recon tests and the five new mutation groups pass; raw or
partially validated packet data cannot reach assurance derivation or rendering.

**Step 4: Commit**

```bash
git add .agents/skills/recon/scripts .agents/skills/recon/tests
git commit -m "refactor(prev1-t02): centralize recon packet validation"
```

## Phase p-rev2: Revision 2 — Bind the Complete Approved Dispatch Projection

### Task prev2-t01: (review) Bind packets to the complete approved dispatch projection

**Files:**

- Modify: `.agents/skills/recon/scripts/lib/contracts.mjs`
- Modify: `.agents/skills/recon/scripts/validate-packet.mjs`
- Modify: `.agents/skills/recon/tests/fixtures/packet-fixture.mjs`
- Modify: `.agents/skills/recon/tests/integrity-contracts.test.mjs`
- Modify: `.agents/skills/recon/tests/packet-validation.test.mjs`
- Modify: `.agents/skills/recon/references/packet-contract.md`

**Step 1: Reproduce the approval-binding gap**

Add direct mutations that independently delete or change every dispatch axis
omitted by the reduced fixture: per-wave task classes and floors, lane scopes,
authorization scope and writable roots, fallback/context controls, payload
digests, run maximum floor, pinned target, and live catalog identity/fingerprint.
Prove each mutation currently remains publishable or is not represented.

**Step 2: Bind the existing canonical prepared projection**

Reuse or narrowly normalize the existing `oat-dispatch-approval/v1` prepared
projection in `manifest.execution` and each immutable
prepared/approved/accepted/completed receipt. Validate its canonical
fingerprint, approval evidence, catalog recheck, run maximum floor, pinned
target, and every per-wave/lane class, scope, authority, writable root,
execution control, and payload digest at the existing normalized packet
boundary. Do not create another profile, dispatch engine, persisted artifact,
or generalized approval abstraction.

**Step 3: Verify**

Run:

```bash
node --test .agents/skills/oat-dispatch-subagents/tests/approval-contract.test.mjs .agents/skills/recon/tests/*.test.mjs
pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts
pnpm test:skills
pnpm oat:validate-skills
pnpm lint
pnpm format
```

Expected: the complete prior suite passes, each formerly omitted approval axis
is present and bound, and independent deletion or mutation prevents packet
validation and publication.

**Step 4: Commit**

```bash
git add .agents/skills/recon
git commit -m "fix(prev2-t01): bind complete approved dispatch projection"
```

### Task prev2-t02: (review) Bind terminal receipts to the accepted child and fresh catalog recheck

**Files:**

- Modify: `.agents/skills/recon/scripts/lib/contracts.mjs`
- Modify: `.agents/skills/recon/scripts/validate-packet.mjs`
- Modify: `.agents/skills/recon/tests/fixtures/packet-fixture.mjs`
- Modify: `.agents/skills/recon/tests/integrity-contracts.test.mjs`
- Modify: `.agents/skills/recon/references/packet-contract.md`

**Step 1: Reproduce receipt-chain drift**

Add direct failing mutations for accepted- and completed-receipt handle drift,
manifest and receipt `approvedAt` drift, and a catalog recheck copied from or
not chronologically later than the original pre-approval observation.

**Step 2: Bind the existing receipt chain**

Inside the existing receipt validator, require manifest and
approved/accepted/completed approval timestamps to match, require accepted and
completed launch-acceptance records to be identical, and require the catalog
recheck to be a distinct observation after approval and before launch
acceptance. Preserve the existing exact projection, evidence, topology, and
artifact bindings; add no retry or lifecycle abstraction.

**Step 3: Verify**

Run:

```bash
node --test .agents/skills/recon/tests/integrity-contracts.test.mjs .agents/skills/recon/tests/packet-validation.test.mjs
node --test .agents/skills/oat-dispatch-subagents/tests/approval-contract.test.mjs .agents/skills/recon/tests/*.test.mjs
```

Expected: every handle, approval-time, and copied/non-fresh catalog mutation
fails closed while the complete valid packet fixtures remain publishable.

**Step 4: Commit**

```bash
git add .agents/skills/recon
git commit -m "fix(prev2-t02): bind accepted receipt chain"
```

### Task prev2-t03: (review) Validate canonical projection array values

**Files:**

- Modify: `.agents/skills/recon/scripts/lib/contracts.mjs`
- Modify: `.agents/skills/recon/tests/integrity-contracts.test.mjs`
- Modify: `.agents/skills/recon/references/packet-contract.md`

**Step 1: Isolate schema-value failures**

Rebind the manifest and all four receipts for each 22-axis deletion so the test
proves the projection schema itself rejects the omission. Add direct invalid
array-value cases for null or empty strings, duplicates, and unstable ordering.

**Step 2: Enforce the existing canonical array contract**

Require `writable_roots`, `escalate_when`, and `candidates_considered` entries
to be non-empty strings and enforce the canonical stable sorted-set rule where
the dispatch record schema declares set semantics. Keep validation within the
existing projection validator; add no generic collection framework.

**Step 3: Verify**

Run:

```bash
node --test .agents/skills/recon/tests/integrity-contracts.test.mjs
node --test .agents/skills/oat-dispatch-subagents/tests/approval-contract.test.mjs .agents/skills/recon/tests/*.test.mjs
pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts
pnpm test:skills
pnpm oat:validate-skills
pnpm lint
pnpm format
```

Expected: all 22 deletion cases isolate structural rejection, invalid canonical
array members/order/duplicates fail, and the complete recon and skill suites
remain green.

**Step 4: Commit**

```bash
git add .agents/skills/recon
git commit -m "fix(prev2-t03): validate canonical projection arrays"
```

## Phase p-rev3: Revision 3 — Fail Closed on Drifted Materializable Agents

### Task prev3-t01: (review) Require current inventory before native role projection

**Files:**

- Modify: `packages/cli/src/engine/scanner.ts`
- Modify: `packages/cli/src/engine/scanner.test.ts`
- Modify: `packages/cli/src/commands/sync/index.test.ts`

**Step 1: Reproduce non-current projection**

Add focused cases proving that manifest-declared user-materializable agents
with `outdated` or `newer` inventory status currently reach native provider
role projection while a `current` agent remains eligible.

**Step 2: Enforce the existing bundled-content authority**

Require an enabled, eligible manifest-declared agent to have `current`
inventory before adding it to the native-role selection. Reject non-current
content with an actionable fail-closed diagnostic. Keep the change inside the
existing scanner predicate and add no new materialization abstraction.

**Step 3: Verify**

Run:

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/engine/scanner.test.ts src/commands/sync/index.test.ts
pnpm --filter @open-agent-toolkit/cli exec tsc --noEmit
pnpm lint
pnpm format
```

Expected: `outdated` and `newer` agents fail closed with actionable diagnostics,
`current` agents remain eligible, and existing native-role sync behavior passes.

**Step 4: Commit**

```bash
git add packages/cli/src/engine/scanner.ts packages/cli/src/engine/scanner.test.ts packages/cli/src/commands/sync/index.test.ts
git commit -m "fix(prev3-t01): reject drifted materializable agents"
```

## Phase 5: Remote PR Review Fixes

### Task p05-t01: (review) Keep reconciliation claim transitions legal

**Files:**

- Modify: `.agents/skills/recon/scripts/reconcile-ledger.mjs`
- Modify: `.agents/skills/recon/tests/integrity-contracts.test.mjs`

**Step 1: Analyze failure context**

Add direct cases for reviewed claims whose prior state is `unresolved` or
`unsupported`, proving that reconciliation currently emits an edge rejected by
the packet contract.

**Step 2: Implement fix**

Derive only contract-legal state changes while preserving honest unresolved,
unsupported, and contested outcomes when review completion does not authorize a
legal promotion.

**Step 3: Verify targeted behavior**

Run focused integrity-contract tests with illegal-transition negative cases and
a valid promotion control.

**Step 4: Verify project commands and commit**

Run the recon suite and project verification commands, then commit with:

```bash
git commit -m "fix(p05-t01): keep reconciliation transitions legal"
```

### Task p05-t02: (review) Preserve published packets when re-rendering fails

**Files:**

- Modify: `.agents/skills/recon/scripts/render-packet.mjs`
- Modify: `.agents/skills/recon/tests/render-packet.test.mjs`

**Step 1: Analyze failure context**

Reproduce failures before promotion and after temporary output creation while a
valid `packet.md` already exists, and assert that the published file survives.

**Step 2: Implement fix**

Limit failure cleanup to the unpromoted temporary artifact and structure atomic
promotion so no fallible post-promotion step deletes the valid consumer view.

**Step 3: Verify targeted behavior**

Run renderer tests with preservation negative controls and a successful
replacement control.

**Step 4: Verify project commands and commit**

Run the recon suite and project verification commands, then commit with:

```bash
git commit -m "fix(p05-t02): preserve packets across render failures"
```

### Task p05-t03: (review) Represent provisional claim genesis honestly

**Files:**

- Modify: `.agents/skills/recon/scripts/lib/contracts.mjs`
- Modify: `.agents/skills/recon/tests/packet-validation.test.mjs`
- Modify: `.agents/skills/recon/references/packet-contract.md`

**Step 1: Analyze failure context**

Create a revision-one ledger containing a newly compiled claim that honestly
remains `provisional`, without falsely describing an earlier unsupported state.

**Step 2: Implement fix**

Define one explicit genesis rule for revision-one provisional claims while
retaining strict transition validation for actual state changes and later
ledger revisions.

**Step 3: Verify targeted behavior**

Prove the honest provisional case passes and invalid incoming, self, or later
revision transitions remain rejected under the chosen contract.

**Step 4: Verify project commands and commit**

Run the recon suite and project verification commands, then commit with:

```bash
git commit -m "fix(p05-t03): support honest provisional genesis"
```

### Task p05-t04: (review) Bind recon dependency reads to one portable scope

**Files:**

- Modify: `.agents/skills/recon/SKILL.md`
- Modify: `.agents/skills/recon/tests/skill-contract.test.mjs`

**Step 1: Analyze failure context**

Add contract coverage proving the current chained reads lack loaded-skill,
user-scope, then project-scope resolution and same-scope binding.

**Step 2: Implement fix**

Resolve and bind the installed dependency root once before reading
`oat-dispatch-subagents` or `subagent-orchestration`, failing closed with an
actionable pack-install/update message when no canonical dependency is found.

**Step 3: Verify targeted behavior**

Exercise loaded, user, project, and missing dependency cases without changing
the selected provider target or launch mechanics.

**Step 4: Verify project commands and commit**

Run canonical skill validation, the recon suite, lint, format, and project
verification commands, then commit with:

```bash
git commit -m "fix(p05-t04): bind portable recon dependencies"
```

### Task p05-t05: (review) Incorporate review-supplied evidence

**Files:**

- Modify: `.agents/skills/recon/scripts/reconcile-ledger.mjs`
- Modify: `.agents/skills/recon/tests/integrity-contracts.test.mjs`

**Step 1: Analyze failure context**

Add an incorporated review containing valid `newEvidence` and prove the current
reconciler drops it from the next ledger.

**Step 2: Implement fix**

Copy only exact, incorporated, schema-valid review evidence into the next
ledger, bind it to the affected claim, and reject duplicate IDs, conflicting
bytes, unincorporated evidence, or invented links.

**Step 3: Verify targeted behavior**

Run focused positive and adversarial evidence-reconciliation cases, including a
valid no-new-evidence control.

**Step 4: Verify project commands and commit**

Run the recon suite and project verification commands, then commit with:

```bash
git commit -m "fix(p05-t05): retain incorporated review evidence"
```

### Task p05-t06: (review) Scan direct array strings for blind inputs

**Files:**

- Modify: `.agents/skills/recon/scripts/create-review-brief.mjs`
- Modify: `.agents/skills/recon/tests/review-brief.test.mjs`

**Step 1: Analyze failure context**

Add review briefs with `raw/dossiers` strings directly inside questions and
included/excluded scope arrays and prove they currently pass validation.

**Step 2: Implement fix**

Apply the forbidden-string check to every visited string regardless of whether
it is an object field or array element, preserving path-specific diagnostics.

**Step 3: Verify targeted behavior**

Run review-brief tests with array, nested-object, allowed-string, and valid
brief controls.

**Step 4: Verify project commands and commit**

Run the recon suite and project verification commands, then commit with:

```bash
git commit -m "fix(p05-t06): scan array strings in review briefs"
```

## Phase p-rev4: Revision 4 — Final Packet Assurance Corrections

Source: `reviews/archived/final-review-2026-09-02T121146Z.md`
(2026-09-02). The user explicitly authorized conversion of all findings and one
fresh final re-review despite the standard final-scope review-cycle cap.

### Task prev4-t01: (review) Bind incorporated evidence to exact claims and final validation

**Files:**

- Modify: `.agents/skills/recon/scripts/lib/contracts.mjs`
- Modify: `.agents/skills/recon/scripts/reconcile-ledger.mjs`
- Modify: `.agents/skills/recon/scripts/validate-packet.mjs`
- Modify: `.agents/skills/recon/references/packet-contract.md`
- Modify: `.agents/skills/recon/tests/fixtures/packet-fixture.mjs`
- Modify: `.agents/skills/recon/tests/integrity-contracts.test.mjs`
- Modify: `.agents/skills/recon/tests/packet-validation.test.mjs`

**Step 1: Reproduce the persisted boundary failures**

Add a two-claim review with incorporated evidence and prove the current
reconciler associates it with every disposition claim and the final validated
packet rejects the resulting ledger with brief/continuity mismatches.

**Step 2: Implement the minimum exact association contract**

Add one closed typed claim/evidence association to review results. Reconcile
only exact incorporated associations, validate only those additions against the
immutable pre-review claim and brief, and preserve byte continuity for every
unaffected evidence link. Do not introduce a generalized evidence graph.

**Step 3: Verify end-to-end controls**

Run persisted reconcile-then-`compileValidatedRun` positive coverage plus
cross-claim, duplicate/conflicting, unincorporated, invented-link, and
no-new-evidence negative controls.

**Step 4: Commit**

```bash
git commit -m "fix(prev4-t01): bind incorporated evidence exactly"
```

### Task prev4-t02: (review) Enforce terminal receipt chronology

**Files:**

- Modify: `.agents/skills/recon/scripts/validate-packet.mjs`
- Modify: `.agents/skills/recon/references/packet-contract.md`
- Modify: `.agents/skills/recon/tests/integrity-contracts.test.mjs`
- Modify: `.agents/skills/recon/tests/packet-validation.test.mjs`

**Step 1: Reproduce impossible completion order**

Rebind an otherwise valid completed receipt with `completedAt` before
`acceptedAt` and prove the candidate remains publishable.

**Step 2: Complete the existing causal check**

Parse the terminal completion timestamp at the normalized packet boundary and
enforce the declared receipt sequence through `acceptedAt <= completedAt`,
without adding a new receipt lifecycle abstraction.

**Step 3: Verify chronology controls**

Prove completion-before-acceptance fails closed and valid equal/after boundaries
pass according to the existing timestamp precision contract.

**Step 4: Commit**

```bash
git commit -m "fix(prev4-t02): enforce receipt completion chronology"
```

### Task prev4-t03: (review) Bind packet promotion to rendered bytes

**Files:**

- Modify: `.agents/skills/recon/scripts/render-packet.mjs`
- Modify: `.agents/skills/recon/tests/render-packet.test.mjs`

**Step 1: Reproduce temporary identity drift**

At the promotion boundary, replace the temporary path after hashing and prove
the renderer currently reports success while the published bytes differ from
the returned digest.

**Step 2: Preserve rendered-object identity through promotion**

Use an unpredictable exclusive temporary file, retain and verify its identity
through write, hash, and atomic promotion, and verify the promoted target
matches the returned digest before reporting success. On identity drift, leave
the last-known-good packet intact.

**Step 3: Verify promotion controls**

Add a replacement negative control and normal atomic-replacement control, then
run the complete renderer and recon suites.

**Step 4: Commit**

```bash
git commit -m "fix(prev4-t03): bind packet promotion identity"
```

### Task prev4-t04: (review) Align the last-known-good packet policy

**Files:**

- Modify: `.agents/skills/recon/SKILL.md`
- Modify: `.agents/skills/recon/scripts/validate-packet.mjs`
- Modify: `.agents/skills/recon/references/packet-contract.md`
- Modify: `.agents/skills/recon/tests/packet-validation.test.mjs`
- Modify: `.agents/skills/recon/tests/workflow.integration.test.mjs`
- Modify: `.oat/projects/shared/recon-skill/design.md`

**Step 1: Reproduce the documented sequence**

Execute the exact skill-directed validate-then-render sequence with an existing
valid packet and an invalid new candidate; prove standalone prevalidation
removes the prior consumer entry point before renderer preservation can run.

**Step 2: Establish one authoritative preservation policy**

Make candidate prevalidation non-destructive and keep the previous validated
packet until a new candidate promotes successfully. Align the skill, validator,
packet contract, and design with that last-known-good policy; do not add another
publication state machine or persisted artifact.

**Step 3: Verify the shipped workflow**

Cover the documented invalid-candidate sequence, successful replacement,
structural failure without any prior packet, and direct renderer controls.
Because this task edits canonical `recon/SKILL.md`, preserve the existing single
PR-scoped version bump relative to `origin/main`; do not bump it a second time.

**Step 4: Commit**

```bash
git commit -m "fix(prev4-t04): align packet preservation workflow"
```

## Reviews

| Scope          | Type     | Status          | Date       | Artifact                                                               | Reviewed Head                            | Invocation | Gate Target         |
| -------------- | -------- | --------------- | ---------- | ---------------------------------------------------------------------- | ---------------------------------------- | ---------- | ------------------- |
| p01            | code     | passed          | 2026-08-31 | `reviews/archived/p01-code-rereview-2026-08-31T045845Z.md`             | d10b5271e072687ae244c03b5fd268c3eacbc828 | auto       | -                   |
| p02            | code     | passed          | 2026-08-31 | `reviews/archived/p-rev1-code-terminal-rereview-2026-08-31T170315Z.md` | 841a7164a4f789f244b1e7adac47b44365d09dfb | auto       | -                   |
| p03            | code     | passed          | 2026-08-31 | `reviews/archived/p03-review-2026-08-31T204054Z.md`                    | cb3d94ac2afa9d29f59257c708f71161fec35dcb | manual     | -                   |
| p04            | code     | passed          | 2026-08-31 | `reviews/archived/p04-review-2026-08-31T213712Z.md`                    | e2b8b40771dd64d22dc3e16e2faa1110db1e792a | manual     | -                   |
| p05            | code     | passed          | 2026-09-02 | `reviews/p05-review-2026-09-02T001430Z.md`                             | 79f344ce97b15037b0a09d5a066bc928b7393ec8 | manual     | -                   |
| p-rev1         | code     | passed          | 2026-08-31 | `reviews/archived/p-rev1-code-terminal-rereview-2026-08-31T170315Z.md` | 841a7164a4f789f244b1e7adac47b44365d09dfb | auto       | -                   |
| final          | code     | fixes_completed | 2026-08-31 | `reviews/archived/final-review-2026-08-31T220007Z.md`                  | 1d705ab4176e51723ae39c41573987af233bdd53 | manual     | -                   |
| final          | code     | fixes_completed | 2026-08-31 | `reviews/archived/final-review-2026-08-31T225932Z.md`                  | 855f8b717ac02d44fbb61b0d3371fb647656303c | manual     | -                   |
| final          | code     | passed          | 2026-08-31 | `reviews/archived/final-review-2026-08-31T232924Z.md`                  | 3cc1cd2e37e776da21f12d7243a96a212762d77f | manual     | -                   |
| final          | code     | passed          | 2026-08-31 | `reviews/archived/final-code-review-2026-08-31T234514Z.md`             | 8bad1e035080be3155ab6c91dae2f5104027d7da | gate       | cursor-fable-5-high |
| final          | code     | fixes_completed | 2026-09-01 | `reviews/archived/final-review-2026-09-01T032917Z.md`                  | dd7af61450eda1e2a5b494798bb6956ec5506d83 | manual     | -                   |
| final          | code     | passed          | 2026-09-01 | `reviews/archived/final-review-2026-09-01T034801Z.md`                  | 547705fae790c32d1bd9dada11f5877253e11530 | manual     | -                   |
| final          | code     | passed          | 2026-09-01 | `reviews/archived/final-review-2026-09-01T040114Z.md`                  | c82f11521a12262cc5cea93c66d2d66d85b06bda | gate       | cursor-fable-5-high |
| final          | code     | fixes_added     | 2026-09-02 | `reviews/archived/final-review-2026-09-02T121146Z.md`                  | 8574dffc8f7c2abfab25649b384abfb0aa738d15 | manual     | -                   |
| spec           | artifact | pending         | -          | -                                                                      | -                                        | -          | -                   |
| design         | artifact | passed          | 2026-08-31 | `reviews/archived/design-self-review-2026-08-31T005342Z.md`            | -                                        | -          | -                   |
| plan-self      | artifact | passed          | 2026-08-31 | `reviews/archived/plan-self-review-2026-08-31T011150Z.md`              | -                                        | -          | -                   |
| plan           | artifact | fixes_completed | 2026-08-31 | `reviews/archived/artifact-plan-review-2026-08-31T011757Z.md`          | -                                        | -          | -                   |
| plan           | artifact | passed          | 2026-08-31 | `reviews/archived/artifact-plan-review-2026-08-31T012704Z.md`          | -                                        | -          | -                   |
| github-pr #248 | remote   | fixes_completed | 2026-09-01 | `reviews/archived/remote-pr-248-review-2026-09-01T224825Z.md`          | -                                        | -          | -                   |

For code reviews, `Reviewed Head` is the full 40-character SHA at the head of
the reviewed range. `Invocation` records `manual`, `auto`, or `gate`; `Gate
Target` is populated only for gate events. Writers must preserve all rows and
unknown trailing cells.

Status progression is `pending` → `received` → `fixes_added` →
`fixes_completed` → `passed`. In quick mode the `spec` row remains as the
required review-table placeholder; there is no spec artifact to review.

Final gate residual disposition: the single Minor accepted-risk note concerns
the intentional harness rule that leaves process `HOME` unchanged. New
bundle-tier tests inject temporary user, scope, and asset roots; if an unrelated
pre-existing bundle-tier test fails locally, maintainer-template resolution is
the first diagnostic suspect. No plan change or implementation task is needed.

## Implementation Complete

**Summary:**

- Phase 1: 1 task — approval-bound, backwards-compatible dispatch preparation.
- Phase 2: 4 tasks — recon controller, worker, packet validation, blind review,
  deterministic rendering, and fixture-driven end-to-end runs.
- Phase 3: 4 tasks — dependency leases, lifecycle reconciliation, user-agent
  materialization, and research-pack bundling.
- Phase 4: 2 tasks — documentation, lockstep release packaging, and full gates.
- Revision 1: 2 tasks — simplify the validation design and centralize packet
  validation/publication behind one normalized run graph.
- Revision 2: 3 tasks — bind packet validation and receipts to the complete
  canonical user-approved dispatch projection, accepted child, fresh catalog
  recheck, and normative projection values.
- Revision 3: 1 task — fail closed when user-materializable agent content does
  not match the current bundled definition before native role projection.
- Phase 5: 6 tasks — correct remote-review findings in reconciliation,
  publication safety, claim genesis, portable dependency binding, evidence
  retention, and selective-blind scanning.
- Revision 4: 4 tasks — bind incorporated evidence, enforce terminal receipt
  chronology, preserve rendered-object identity through promotion, and align
  the last-known-good packet policy.

**Total: 27 tasks**

After all tasks and implementation reviews pass, the project is ready for the
final code-review and PR-publication workflows.

## References

- Discovery: `discovery.md`
- Design: `design.md`
- Independent design review:
  `reviews/archived/design-self-review-2026-08-31T005342Z.md`
- Backlog, discovery/quick-start integration:
  `.oat/repo/pjm/backlog/items/BL-260830-integrate-recon-with-oat.md`
- Backlog, broader workflow integration:
  `.oat/repo/pjm/backlog/items/BL-260830-integrate-recon-across.md`
