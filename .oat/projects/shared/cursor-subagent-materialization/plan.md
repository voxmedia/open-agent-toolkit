---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-07-17
oat_phase: plan
oat_phase_status: in_progress
oat_plan_parallel_groups: [['p03', 'p04']]
oat_plan_source: quick
oat_import_reference: null
oat_import_source_path: null
oat_import_provider: null
oat_generated: false
oat_template: true
---

# Implementation Plan: cursor-subagent-materialization

> Execute this plan using `oat-project-implement`.

**Goal:** Materialize model-pinned Cursor reviewer and phase-implementer variants from canonical agents, dispatch them by native variant name, and ship only live-verified base-ID-plus-bracket mappings with launcher-owned `configured` provenance.

**Architecture:** Introduce a narrow provider-neutral materialization-extension lifecycle while retaining provider-owned Codex TOML and Cursor Markdown codecs. Cursor keeps flat ladder IDs for selection and deterministic variant names, but an explicit verified mapping table is the only source for emitted bracket-form `model:` values.

**Tech Stack:** TypeScript ESM, Commander, Vitest, YAML/TOML codecs, pnpm/Turborepo, OAT canonical skill/agent sync.

**Commit Convention:** `{type}({task-id}): {description}`

## Planning Checklist

- [x] Discovery requirements are complete and authoritative.
- [x] Lightweight design is approved and its re-review passed.
- [x] Stable task IDs and per-task verification are defined.
- [x] Phase-level parallelism and write boundaries are evaluated.
- [x] Managed project dispatch policy is `high`.

## Parallelism

Phases p01 and p02 are sequential foundations: shipped mapping data cannot precede live syntax evidence, and lifecycle integration depends on the shared extension and Cursor codec contracts. After p02, p03 and p04 may run concurrently in isolated worktrees because p03 owns CLI/runtime TypeScript integration while p04 owns canonical agents, skills, recommendation data, and docs. Their verification suites are separate. Phase p05 runs only after both lanes merge because provider-view regeneration and lockstep versioning must reflect the complete final tree.

---

## Phase 1: Live Cursor Pin Verification

### Task p01-t01: Verify and record every shippable Cursor pin mapping

**Files:**

- Create: `.oat/projects/shared/cursor-subagent-materialization/references/cursor-pin-verification.md`
- Temporary only: `.cursor/agents/oat-pin-probe-*.md` (remove before commit)

**Step 1: Build the verification matrix**

List every proposed ladder ID, exact bracket-form frontmatter value, syntax family, and intended catalogue/recommendation use. Start from discovery; do not derive mappings by suffix parsing.

**Step 2: Launch native probes**

Create one temporary native agent definition per syntax family and launch it by exact agent type. Cover GPT effort, Claude effort, Composer standard/fast, and Grok effort/fast syntax. Test `claude-fable-5-thinking-*` and `cursor-grok-4.5-high-fast` explicitly rather than inferring them.

For each probe, record:

- exact definition and bracket-form `model:` value;
- launch acceptance and externally observable configured-model evidence;
- `CURSOR_CONVERSATION_ID` for transcript correlation;
- result: `approved` or `excluded`, with rationale.

Subagent self-report, catalogue presence, or successful completion alone is not model-pin proof. If positive pin evidence is unavailable or fallback is plausible, exclude the entry.

**Step 3: Gate every entry**

Map every proposed shipped catalogue/recommendation entry to approved evidence. Record the optional flat-ID experiment separately; never use it to authorize generated frontmatter.

**Step 4: Clean temporary files**

Remove all `oat-pin-probe-*` definitions and confirm no probe file remains.

**Step 5: Format and verify**

Run:

```bash
pnpm exec oxfmt --write .oat/projects/shared/cursor-subagent-materialization/references/cursor-pin-verification.md
test -z "$(git status --porcelain -- .cursor/agents/oat-pin-probe-*.md)"
```

Expected: the evidence record is formatted; no temporary agent definition remains; each future shipped entry is approved or explicitly excluded.

**Step 6: Commit**

```bash
git add .oat/projects/shared/cursor-subagent-materialization/references/cursor-pin-verification.md
git commit -m "test(p01-t01): verify cursor pin syntax mappings"
```

---

## Phase 2: Materialization Foundation

### Task p02-t01: Extract the provider materialization-extension lifecycle

**Files:**

- Create: `packages/cli/src/providers/shared/materialization-extension.ts`
- Create: `packages/cli/src/providers/shared/materialization-extension.test.ts`
- Modify: `packages/cli/src/providers/shared/index.ts`
- Modify: `packages/cli/src/providers/codex/codec/sync-extension.ts`
- Modify: `packages/cli/src/providers/codex/codec/sync-extension.test.ts`

**Step 1: Write failing contract tests**

Specify provider-tagged create/update/remove/skip operations, managed entries, aggregate hash, apply counts, and typed provider-private plan metadata. Include the Codex-specific lifecycle needs without moving TOML/config or adoption semantics into shared code.

**Step 2: Implement the narrow shared contract**

Adapt the Codex extension to the shared envelope while preserving existing owner markers, partial-sync behavior, config merging, stale cleanup, and public result formatting.

**Step 3: Format and verify**

Run:

```bash
pnpm exec oxfmt --write packages/cli/src/providers/shared/materialization-extension.ts packages/cli/src/providers/shared/materialization-extension.test.ts packages/cli/src/providers/shared/index.ts packages/cli/src/providers/codex/codec/sync-extension.ts packages/cli/src/providers/codex/codec/sync-extension.test.ts
pnpm --filter @open-agent-toolkit/cli exec vitest run src/providers/shared/materialization-extension.test.ts src/providers/codex/codec/sync-extension.test.ts
```

Expected: the shared lifecycle tests pass and Codex output/cleanup semantics are unchanged.

**Step 4: Commit**

```bash
git add packages/cli/src/providers/shared packages/cli/src/providers/codex/codec/sync-extension.ts packages/cli/src/providers/codex/codec/sync-extension.test.ts
git commit -m "refactor(p02-t01): extract materialization extension lifecycle"
```

---

### Task p02-t02: Implement the verified Cursor catalogue and Markdown codec

**Files:**

- Create: `packages/cli/src/providers/cursor/codec/catalog.ts`
- Create: `packages/cli/src/providers/cursor/codec/catalog.test.ts`
- Create: `packages/cli/src/providers/cursor/codec/shared.ts`
- Create: `packages/cli/src/providers/cursor/codec/shared.test.ts`
- Create: `packages/cli/src/providers/cursor/codec/materialize.ts`
- Create: `packages/cli/src/providers/cursor/codec/materialize.test.ts`
- Modify: `packages/cli/src/providers/cursor/index.ts`
- Read: `.oat/projects/shared/cursor-subagent-materialization/references/cursor-pin-verification.md`

**Step 1: Write failing catalogue and codec tests**

Require:

- explicit `ladderModelId` → `frontmatterModel` entries only;
- a bracket segment in every emitted model (`[]` allowed);
- exact Composer standard/fast forms;
- no unapproved Fable/Grok entry;
- unique normalized variant names;
- explicit Cursor `name`, `description`, and mapped `model`;
- omission of canonical-only `version`, `tools`, and `color`;
- YAML-comment managed/role/owner markers;
- byte-identical canonical body.

**Step 2: Implement catalogue, naming, and marker helpers**

Use the approved Phase 1 evidence verbatim. Preserve owner values `supported-catalogue | user-config | project-config`. Do not implement suffix stripping or a flat-ID frontmatter fallback.

**Step 3: Implement the Markdown materializer**

Generate deterministic role names shared with dispatch compilation. Detect normalized desired-name collisions and unmanaged Markdown definitions in `.cursor/agents`, `.claude/agents`, and `.codex/agents`; ignore Codex TOML files.

**Step 4: Format and verify**

Run:

```bash
pnpm exec oxfmt --write packages/cli/src/providers/cursor/codec packages/cli/src/providers/cursor/index.ts
pnpm --filter @open-agent-toolkit/cli exec vitest run src/providers/cursor/codec/catalog.test.ts src/providers/cursor/codec/shared.test.ts src/providers/cursor/codec/materialize.test.ts
```

Expected: only approved bracket mappings render, markers are parseable, collisions fail before writes, and canonical bodies remain identical.

**Step 5: Commit**

```bash
git add packages/cli/src/providers/cursor
git commit -m "feat(p02-t02): add cursor materialization codec"
```

---

### Task p02-t03: Add owner-aware Cursor target collection and desired-state planning

**Files:**

- Create: `packages/cli/src/providers/cursor/codec/sync-extension.ts`
- Create: `packages/cli/src/providers/cursor/codec/sync-extension.test.ts`

**Step 1: Write failing target and cleanup tests**

Cover supported-catalogue seeding, user effective config, shared/local/project-state candidates, project ownership precedence, mapped entries outside the supported catalogue, unknown-mapping diagnostics with source, full-sync owner cleanup, partial-sync no-cleanup, symlink-aware collision scans, and disabled-provider stale-state behavior.

**Step 2: Implement target collection and plans**

Resolve layered configuration through the existing effective-config boundary. Unknown config IDs fail closed; they never become raw frontmatter. Only recognized managed files with the applicable owner are updated or removed.

**Step 3: Format and verify**

Run:

```bash
pnpm exec oxfmt --write packages/cli/src/providers/cursor/codec/sync-extension.ts packages/cli/src/providers/cursor/codec/sync-extension.test.ts
pnpm --filter @open-agent-toolkit/cli exec vitest run src/providers/cursor/codec/sync-extension.test.ts
```

Expected: project/user ownership and cleanup boundaries match the Codex owner system without unsafe unknown-ID materialization.

**Step 4: Commit**

```bash
git add packages/cli/src/providers/cursor/codec/sync-extension.ts packages/cli/src/providers/cursor/codec/sync-extension.test.ts
git commit -m "feat(p02-t03): plan cursor materialized variants"
```

---

## Phase 3: CLI Lifecycle, Resolver, and Audit Integration

### Task p03-t01: Generalize bundled-agent scanning and sync orchestration

**Files:**

- Modify: `packages/cli/src/engine/scanner.ts`
- Modify: `packages/cli/src/engine/scanner.test.ts`
- Modify: `packages/cli/src/engine/index.ts`
- Modify: `packages/cli/src/commands/sync/sync.types.ts`
- Modify: `packages/cli/src/commands/sync/sync.utils.ts`
- Modify: `packages/cli/src/commands/sync/index.ts`
- Modify: `packages/cli/src/commands/sync/index.test.ts`
- Modify: `packages/cli/src/commands/sync/apply.ts`
- Modify: `packages/cli/src/commands/sync/dry-run.ts`

**Step 1: Write failing combined-extension tests**

Require both Codex and Cursor plans to participate in project/user sync, dry-run JSON, partial path filtering, apply counts, failure propagation, and idempotence. Preserve the two bundled canonical base-role sources.

**Step 2: Replace Codex-only command plumbing**

Run enabled materialization extensions through the shared lifecycle and retain provider-tagged summaries. Do not make provider restart or hot reload a correctness requirement.

**Step 3: Format and verify**

Run:

```bash
pnpm exec oxfmt --write packages/cli/src/engine/scanner.ts packages/cli/src/engine/scanner.test.ts packages/cli/src/engine/index.ts packages/cli/src/commands/sync
pnpm --filter @open-agent-toolkit/cli exec vitest run src/engine/scanner.test.ts src/commands/sync/index.test.ts src/providers/codex/codec/sync-extension.test.ts src/providers/cursor/codec/sync-extension.test.ts
```

Expected: combined plans apply deterministically and existing Codex sync behavior remains green.

**Step 4: Commit**

```bash
git add packages/cli/src/engine packages/cli/src/commands/sync
git commit -m "refactor(p03-t01): generalize sync materialization extensions"
```

---

### Task p03-t02: Integrate Cursor variants with status, init, and stray handling

**Files:**

- Modify: `packages/cli/src/commands/status/index.ts`
- Modify: `packages/cli/src/commands/status/index.test.ts`
- Modify: `packages/cli/src/commands/init/index.ts`
- Modify: `packages/cli/src/commands/init/index.test.ts`
- Modify: `packages/cli/src/commands/shared/codex-strays.ts`
- Modify: `packages/cli/src/commands/shared/codex-strays.test.ts`

**Step 1: Write failing lifecycle tests**

Ensure extension-managed Cursor variants are reported as desired-state operations, never offered for canonical adoption, and regenerated after relevant adoption without disturbing Codex role handling.

**Step 2: Implement provider-tagged lifecycle handling**

Compute extension plans before ordinary stray reporting. Keep provider-specific adoption hooks behind their extension boundary and preserve unmanaged files.

**Step 3: Format and verify**

Run:

```bash
pnpm exec oxfmt --write packages/cli/src/commands/status/index.ts packages/cli/src/commands/status/index.test.ts packages/cli/src/commands/init/index.ts packages/cli/src/commands/init/index.test.ts packages/cli/src/commands/shared/codex-strays.ts packages/cli/src/commands/shared/codex-strays.test.ts
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/status/index.test.ts src/commands/init/index.test.ts src/commands/shared/codex-strays.test.ts
```

Expected: managed Cursor files are not false-positive strays and status/init preserve both providers' ownership semantics.

**Step 4: Commit**

```bash
git add packages/cli/src/commands/status packages/cli/src/commands/init packages/cli/src/commands/shared/codex-strays.ts packages/cli/src/commands/shared/codex-strays.test.ts
git commit -m "feat(p03-t02): integrate cursor variants with lifecycle commands"
```

---

### Task p03-t03: Add the direct Cursor materialize provider command

**Files:**

- Create: `packages/cli/src/commands/providers/cursor/index.ts`
- Create: `packages/cli/src/commands/providers/cursor/materialize.ts`
- Create: `packages/cli/src/commands/providers/cursor/materialize.test.ts`
- Modify: `packages/cli/src/commands/providers/providers.types.ts`
- Modify: `packages/cli/src/commands/providers/index.ts`
- Modify: `packages/cli/src/commands/index.test.ts`
- Modify: `packages/cli/src/commands/help-snapshots.test.ts`

**Step 1: Write failing command tests**

Specify `oat providers cursor materialize <agent-name> --model <ladder-id>` for project/user scope, dry-run/JSON behavior, role/path overrides, owner assignment, unknown mapping rejection, and no raw frontmatter override.

**Step 2: Implement the thin command**

Reuse the Cursor codec and scope/path conventions; keep file planning and writes in provider modules.

**Step 3: Format and verify**

Run:

```bash
pnpm exec oxfmt --write packages/cli/src/commands/providers/cursor packages/cli/src/commands/providers/providers.types.ts packages/cli/src/commands/providers/index.ts packages/cli/src/commands/index.test.ts packages/cli/src/commands/help-snapshots.test.ts
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/providers/cursor/materialize.test.ts src/commands/index.test.ts src/commands/help-snapshots.test.ts
```

Expected: command help and behavior expose mapped ladder IDs only and never emit flat IDs into generated frontmatter.

**Step 4: Commit**

```bash
git add packages/cli/src/commands/providers packages/cli/src/commands/index.test.ts packages/cli/src/commands/help-snapshots.test.ts
git commit -m "feat(p03-t03): add cursor materialize command"
```

---

### Task p03-t04: Diagnose unavailable models without claiming runtime verification

**Files:**

- Modify: `packages/cli/src/providers/identity/availability.ts`
- Modify: `packages/cli/src/providers/identity/availability.test.ts`
- Modify: `packages/cli/src/commands/doctor/index.ts`
- Modify: `packages/cli/src/commands/doctor/index.test.ts`

**Step 1: Write failing availability tests**

Distinguish broad CLI catalogue availability (`models` / `--list-models`) from native Task probing and definition-pin evidence. Doctor should identify mapped variants whose flat ladder ID disappeared without calling the pin verified.

**Step 2: Implement diagnostic checks**

Reuse existing Cursor catalogue parsing and preserve current matrix-cell behavior. Keep availability, configured invocation, and runtime identity as separate evidence layers.

**Step 3: Format and verify**

Run:

```bash
pnpm exec oxfmt --write packages/cli/src/providers/identity/availability.ts packages/cli/src/providers/identity/availability.test.ts packages/cli/src/commands/doctor/index.ts packages/cli/src/commands/doctor/index.test.ts
pnpm --filter @open-agent-toolkit/cli exec vitest run src/providers/identity/availability.test.ts src/commands/doctor/index.test.ts
```

Expected: stale flat IDs produce actionable diagnostics while no output promotes configuration into observed model identity.

**Step 4: Commit**

```bash
git add packages/cli/src/providers/identity/availability.ts packages/cli/src/providers/identity/availability.test.ts packages/cli/src/commands/doctor
git commit -m "feat(p03-t04): diagnose cursor materialized targets"
```

---

### Task p03-t05: Compile Cursor dispatch to variants with configured provenance

**Files:**

- Modify: `packages/cli/src/providers/ceiling/registry.ts`
- Modify: `packages/cli/src/providers/ceiling/registry.test.ts`
- Modify: `packages/cli/src/commands/project/dispatch-ceiling/index.ts`
- Modify: `packages/cli/src/commands/project/dispatch-ceiling/index.test.ts`
- Modify: `packages/cli/src/providers/identity/dispatch-report.ts`
- Modify: `packages/cli/src/providers/identity/dispatch-report.test.ts`
- Modify: `packages/cli/src/providers/identity/stamp.test.ts`

**Step 1: Write failing resolver tests**

Require Cursor string candidates to compile to role-specific `dispatchArgs.variant` using the shared deterministic name builder. Add an explicit provider selection axis so Cursor pinned variants do not inherit Codex model+effort assumptions.

**Step 2: Implement variant compilation**

Change Cursor's mechanism to `pinned-variant`, preserve candidate ladder order and cap semantics, and reject direct role-name recursion.

**Step 3: Implement audit wording**

Record selected variant/model as launcher-configured controls. Keep runtime producer/model/effort null, provenance unknown, and confidence `not-reported`; `CURSOR_CONVERSATION_ID` is correlation only.

**Step 4: Format and verify**

Run:

```bash
pnpm exec oxfmt --write packages/cli/src/providers/ceiling/registry.ts packages/cli/src/providers/ceiling/registry.test.ts packages/cli/src/commands/project/dispatch-ceiling/index.ts packages/cli/src/commands/project/dispatch-ceiling/index.test.ts packages/cli/src/providers/identity/dispatch-report.ts packages/cli/src/providers/identity/dispatch-report.test.ts packages/cli/src/providers/identity/stamp.test.ts
pnpm --filter @open-agent-toolkit/cli exec vitest run src/providers/ceiling/registry.test.ts src/commands/project/dispatch-ceiling/index.test.ts src/providers/identity/dispatch-report.test.ts src/providers/identity/stamp.test.ts
```

Expected: managed Cursor resolution returns a native variant, reports it as configured, and leaves runtime identity not reported.

**Step 5: Commit**

```bash
git add packages/cli/src/providers/ceiling packages/cli/src/commands/project/dispatch-ceiling packages/cli/src/providers/identity/dispatch-report.ts packages/cli/src/providers/identity/dispatch-report.test.ts packages/cli/src/providers/identity/stamp.test.ts
git commit -m "feat(p03-t05): dispatch cursor pinned variants"
```

---

## Phase 4: Canonical Guidance, Recommendation, and Documentation

### Task p04-t01: Add Cursor conversation correlation to canonical roles

**Files:**

- Modify: `.agents/agents/oat-reviewer.md`
- Modify: `.agents/agents/oat-phase-implementer.md`

**Step 1: Update canonical return contracts**

When `CURSOR_AGENT=1` and `CURSOR_CONVERSATION_ID` is present, require the returned result to include that ID as transcript/session correlation. Explicitly state that it is not model evidence.

**Step 2: Bump both agent versions**

Increase each changed canonical agent's frontmatter version once for this PR.

**Step 3: Format and verify**

Run:

```bash
pnpm exec oxfmt --write .agents/agents/oat-reviewer.md .agents/agents/oat-phase-implementer.md
pnpm run cli -- internal validate-oat-skills
```

Expected: both canonical roles validate and use `configured`, never `verified`, for Cursor model provenance.

**Step 4: Commit**

```bash
git add .agents/agents/oat-reviewer.md .agents/agents/oat-phase-implementer.md
git commit -m "feat(p04-t01): report cursor conversation correlation"
```

---

### Task p04-t02: Migrate canonical dispatch guidance to native Cursor variants

**Files:**

- Modify: `.agents/skills/oat-dispatch-subagents/SKILL.md`
- Modify: `.agents/skills/oat-dispatch-subagents/references/provider-cursor.md`
- Modify: `.agents/skills/oat-project-review-provide/SKILL.md`
- Modify: `.agents/skills/oat-project-plan-writing/SKILL.md`
- Modify: `.agents/skills/oat-project-implement/references/phase-execution.md`
- Modify: `.agents/skills/oat-project-implement/references/dispatch-and-dry-run.md`
- Modify: `.agents/skills/oat-project-implement/references/completion-and-closeout.md`
- Modify: `packages/cli/src/validation/skills.test.ts`
- Modify: `packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts`

**Step 1: Preserve the coordination baseline**

Confirm current HEAD contains gate-execution-hardening commit `69d5fe0c` (equivalent to the earlier `c57bdc9d` task commit). Preserve its foreground/background, liveness, transcript-addressing, and pre-start recovery guidance; do not cherry-pick the older commit.

**Step 2: Update canonical dispatch prose**

Replace concrete managed Cursor `dispatchArgs.model` rules with `dispatchArgs.variant`, exact native-agent-type-first launch, and pre-start native role-selection rejection as the only replacement boundary. Keep Cursor model strings opaque inside the mapping/resolver; never normalize them in skills.

**Step 3: Bump changed skill versions**

Increase each changed canonical `SKILL.md` version once for the final PR diff, including `oat-dispatch-subagents` when its provider reference changes.

**Step 4: Update validation contracts**

Require variant-first guidance and reject stale concrete Cursor model-argument language while preserving Claude model-argument behavior.

**Step 5: Format and verify**

Run:

```bash
pnpm exec oxfmt --write .agents/skills/oat-dispatch-subagents .agents/skills/oat-project-review-provide/SKILL.md .agents/skills/oat-project-plan-writing/SKILL.md .agents/skills/oat-project-implement/references packages/cli/src/validation/skills.test.ts packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts
pnpm run cli -- internal validate-oat-skills
pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts src/commands/init/tools/shared/review-skill-contracts.test.ts
```

Expected: canonical skills validate, gate-hardening guidance remains present, and tests enforce Cursor variants rather than model arguments.

**Step 6: Commit**

```bash
git add .agents/skills/oat-dispatch-subagents .agents/skills/oat-project-review-provide/SKILL.md .agents/skills/oat-project-plan-writing/SKILL.md .agents/skills/oat-project-implement/references packages/cli/src/validation/skills.test.ts packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts
git commit -m "docs(p04-t02): dispatch cursor native variants"
```

---

### Task p04-t03: Promote the verified multi-family Cursor recommendation

**Files:**

- Modify: `packages/cli/config/dispatch-matrix-recommendation.json`
- Modify: `packages/cli/assets/config/dispatch-matrix-recommendation.json`
- Modify: `packages/cli/src/commands/config/index.test.ts`
- Modify: `packages/cli/src/commands/init/tools/shared/bundle-consistency.test.ts`
- Modify: `packages/cli/src/providers/cursor/codec/catalog.test.ts`
- Read: `.oat/projects/shared/cursor-subagent-materialization/references/cursor-pin-verification.md`
- Read: `.oat/projects/shared/cursor-cloud-autonomous-projects/references/oat-user-config.cloud.json`

**Step 1: Write failing recommendation tests**

Require source/asset parity, a new recommendation marker version, materializability for every Cursor candidate, and the operator-approved multi-family tier placement with Grok in Balanced only if Phase 1 approved its exact mapping.

**Step 2: Update source and bundled copy**

Promote only verified GPT, Claude, Composer, and Grok entries. Exclude unresolved Fable/Grok forms rather than guessing. Keep the supported catalogue broader than this reusable selection policy where evidence permits.

**Step 3: Format and verify**

Run:

```bash
pnpm exec oxfmt --write packages/cli/config/dispatch-matrix-recommendation.json packages/cli/assets/config/dispatch-matrix-recommendation.json packages/cli/src/commands/config/index.test.ts packages/cli/src/commands/init/tools/shared/bundle-consistency.test.ts packages/cli/src/providers/cursor/codec/catalog.test.ts
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/config/index.test.ts src/commands/init/tools/shared/bundle-consistency.test.ts src/providers/cursor/codec/catalog.test.ts
```

Expected: both recommendation copies match and every shipped Cursor cell resolves to an approved materialized variant.

**Step 4: Commit**

```bash
git add packages/cli/config/dispatch-matrix-recommendation.json packages/cli/assets/config/dispatch-matrix-recommendation.json packages/cli/src/commands/config/index.test.ts packages/cli/src/commands/init/tools/shared/bundle-consistency.test.ts packages/cli/src/providers/cursor/codec/catalog.test.ts
git commit -m "feat(p04-t03): recommend cursor multi-family dispatch"
```

---

### Task p04-t04: Document Cursor materialized dispatch and evidence boundaries

**Files:**

- Modify: `apps/oat-docs/docs/provider-sync/providers.md`
- Modify: `apps/oat-docs/docs/workflows/projects/dispatch-ceiling.md`
- Modify: `apps/oat-docs/docs/workflows/projects/implementation-execution.md`
- Modify: `apps/oat-docs/docs/workflows/projects/lifecycle.md`
- Modify: `apps/oat-docs/docs/workflows/projects/artifacts.md`
- Modify: `apps/oat-docs/docs/cli-utilities/configuration.md`

**Step 1: Update user-facing behavior**

Document sync-time Cursor variants, explicit flat-ID/bracket mapping, owner scopes, native variant launch, silent fallback risk, doctor availability diagnostics, and `configured` provenance. Remove claims that managed Cursor dispatch is enforced through a Task-level model argument.

**Step 2: Format and verify**

Run:

```bash
pnpm exec oxfmt --write apps/oat-docs/docs/provider-sync/providers.md apps/oat-docs/docs/workflows/projects/dispatch-ceiling.md apps/oat-docs/docs/workflows/projects/implementation-execution.md apps/oat-docs/docs/workflows/projects/lifecycle.md apps/oat-docs/docs/workflows/projects/artifacts.md apps/oat-docs/docs/cli-utilities/configuration.md
pnpm docs:check-links
```

Expected: docs links pass and terminology consistently separates configured selection, catalogue availability, and runtime identity.

**Step 3: Commit**

```bash
git add apps/oat-docs/docs/provider-sync/providers.md apps/oat-docs/docs/workflows/projects/dispatch-ceiling.md apps/oat-docs/docs/workflows/projects/implementation-execution.md apps/oat-docs/docs/workflows/projects/lifecycle.md apps/oat-docs/docs/workflows/projects/artifacts.md apps/oat-docs/docs/cli-utilities/configuration.md
git commit -m "docs(p04-t04): explain cursor materialized dispatch"
```

---

## Phase 5: Generated Views and Release Validation

### Task p05-t01: Regenerate and verify all provider views

**Files:**

- Generated: `.cursor/agents/oat-reviewer-*.md`
- Generated: `.cursor/agents/oat-phase-implementer-*.md`
- Generated: `.claude/**`
- Generated: `.codex/**`
- Generated: `.cursor/**`
- Generated: `.oat/sync/manifest.json`
- Generated: `packages/cli/assets/**`

**Step 1: Bundle canonical assets**

Run the repository CLI build/bundle path so packaged canonical skills, agents, docs, and recommendation data reflect source.

**Step 2: Sync provider views**

Run:

```bash
pnpm run cli -- sync --scope all
```

This is the repository-source invocation of `oat sync --scope all`. Do not hand-edit generated provider views.

**Step 3: Verify generated Cursor variants**

Assert:

- two generated role files per approved catalogue mapping;
- exact deterministic names;
- only bracket-form `model:` values;
- managed role/owner comments;
- canonical body identity;
- no excluded mapping or probe file;
- no generated-file drift on a second dry run.

Run:

```bash
pnpm run cli -- sync --scope all --dry-run
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/sync/index.test.ts src/commands/init/tools/shared/bundle-consistency.test.ts
```

Expected: the dry run reports no changes and generated assets contain only approved mappings.

**Step 4: Commit**

```bash
git add .claude .codex .cursor .oat/sync/manifest.json packages/cli/assets
git commit -m "chore(p05-t01): sync cursor materialized agents"
```

---

### Task p05-t02: Bump public packages and run the release boundary

**Files:**

- Modify: `packages/cli/package.json`
- Modify: `packages/control-plane/package.json`
- Modify: `packages/docs-config/package.json`
- Modify: `packages/docs-theme/package.json`
- Modify: `packages/docs-transforms/package.json`
- Modify: `packages/cli/assets/public-package-versions.json`

**Step 1: Apply the lockstep version bump**

Advance all five publishable packages from the current common version to the same next patch version. Refresh the bundled public-package version asset; do not edit only the CLI package.

**Step 2: Format**

Run:

```bash
pnpm exec oxfmt --write packages/cli/package.json packages/control-plane/package.json packages/docs-config/package.json packages/docs-theme/package.json packages/docs-transforms/package.json packages/cli/assets/public-package-versions.json
```

**Step 3: Run focused and workspace validation**

Run:

```bash
pnpm --filter @open-agent-toolkit/cli lint
pnpm --filter @open-agent-toolkit/cli type-check
pnpm --filter @open-agent-toolkit/cli test
pnpm build
pnpm format
pnpm release:validate
pnpm run cli -- sync --scope all --dry-run
```

Expected: all checks pass, the five package versions are identical, release validation passes, and provider views are clean.

**Step 4: Commit**

```bash
git add packages/cli/package.json packages/control-plane/package.json packages/docs-config/package.json packages/docs-theme/package.json packages/docs-transforms/package.json packages/cli/assets/public-package-versions.json
git commit -m "chore(p05-t02): bump public package versions"
```

---

## Reviews

| Scope  | Type     | Status          | Date       | Artifact                                                      |
| ------ | -------- | --------------- | ---------- | ------------------------------------------------------------- |
| p01    | code     | pending         | -          | -                                                             |
| p02    | code     | pending         | -          | -                                                             |
| p03    | code     | pending         | -          | -                                                             |
| p04    | code     | pending         | -          | -                                                             |
| p05    | code     | pending         | -          | -                                                             |
| final  | code     | pending         | -          | -                                                             |
| spec   | artifact | pending         | -          | -                                                             |
| design | artifact | fixes_completed | 2026-07-16 | reviews/archived/artifact-design-review-2026-07-16T111818Z.md |
| design | artifact | passed          | 2026-07-16 | reviews/archived/artifact-design-review-2026-07-16T194141Z.md |
| plan   | artifact | pending         | -          | -                                                             |

**Status values:** `pending` → `received` → `fixes_added` → `fixes_completed` → `passed`

---

## Implementation Complete

**Summary:**

- Phase 1: 1 task - Live evidence gates every shipped Cursor mapping.
- Phase 2: 3 tasks - Shared lifecycle, Cursor codec, and owner-aware desired state.
- Phase 3: 5 tasks - Sync/status/init/provider/doctor/resolver/audit integration.
- Phase 4: 4 tasks - Canonical roles, dispatch guidance, recommendation, and docs.
- Phase 5: 2 tasks - Generated provider views and lockstep release validation.

**Total: 15 tasks**

Ready for code review and merge after all tasks and reviews pass.

---

## References

- Discovery: `discovery.md`
- Lightweight design: `design.md`
- Pin verification record: `references/cursor-pin-verification.md` (created by p01-t01)
- Codex command reference: `packages/cli/src/commands/providers/codex/materialize.ts`
- Codex codec reference: `packages/cli/src/providers/codex/codec/`
- Proven cloud ladder: `.oat/projects/shared/cursor-cloud-autonomous-projects/references/oat-user-config.cloud.json`
- Coordination baseline: gate-execution-hardening merge commit `69d5fe0c`
