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
- [x] Defer HiLL checkpoint confirmation to `oat-project-implement`.

## Parallelism

Gate g01 is operator-assisted and outside implementation phase ownership: it completes and commits live syntax evidence before `oat-project-implement` begins at p02. Phase p02 is the sequential implementation foundation. After p02, p03 and p04 may run concurrently in isolated worktrees because p03 owns CLI/runtime TypeScript integration while p04 owns canonical agents, skills, recommendation data, and docs. Their verification suites are separate. Phase p05 runs only after both lanes merge; its generated-view task completes before a second operator-assisted fresh-session gate launches final role variants. The plan recommends p05 as a HiLL checkpoint, but `oat-project-implement` must confirm and persist that choice at implementation start. Phase p06 runs the lockstep release boundary only after the confirmed gate passes.

---

## Pre-implementation Gate g01: Live Cursor Pin Verification

### Gate procedure: Verify and record every shippable Cursor pin mapping

**Execution contract:** This gate is not an implementation phase or task and has no phase-implementer or phase-review bookkeeping. Complete it in the project worktree before invoking `oat-project-implement` for p02. The preparation state is persisted on disk so the fresh session can resume from the recorded handoff.

**Files:**

- Create: `.oat/projects/shared/cursor-subagent-materialization/references/cursor-pin-verification.md`
- Temporary only: `.cursor/agents/oat-pin-probe-*.md` (remove before commit)

**Step 1: Build the verification matrix**

List every proposed ladder ID and exact bracket-form frontmatter value that may enter the shipped mapping registry. Record syntax family and use classifications (`supported-catalogue`, `recommendation`, and/or `configuration-only`) as metadata, not as evidence boundaries. Start from discovery; do not derive mappings by suffix parsing.

**Step 2: Persist the restart handoff**

Create one temporary native agent definition per distinct proposed mapping entry and write the proposed matrix plus `status: awaiting-fresh-session` to the verification record. Every definition must carry exactly that row's bracket-form `model:` value; family-level representatives cannot authorize unlaunched mappings. Confirm both the record and all temporary definitions exist in the worktree, then stop. The operator starts a new Cursor session rooted at this same worktree; do not delegate this gate to a phase implementer or continue launches in the preparing session.

**Step 3: Launch from the fresh native-agent discovery boundary**

In the new Cursor session, verify the persisted `awaiting-fresh-session` handoff, then invoke each exact temporary agent type through Cursor's native agent-definition surface. Do not substitute `cursor-agent --model`: that tests CLI selector routing, not definition-level frontmatter pinning.

Cover GPT effort, Claude effort, Composer standard/fast, and Grok effort/fast syntax. Test `claude-fable-5-thinking-*` and `cursor-grok-4.5-high-fast` explicitly rather than inferring them.

For each probe, record:

- exact definition and bracket-form `model:` value;
- launch acceptance and externally observable configured-model evidence from Cursor's native launch UI/metadata;
- `CURSOR_CONVERSATION_ID` for transcript correlation;
- the unique proposed mapping row authorized by this launch;
- result: `approved` or `excluded`, with rationale.

Subagent self-report, catalogue presence, successful completion, or `cursor-agent --model` output is not definition-pin proof. If the native launch surface does not expose evidence that distinguishes the configured pin from silent fallback, exclude the entry.

**Step 4: Gate every entry**

Require one mapping-specific approved evidence row for every entry that may be added to the shipped mapping registry, including configuration-only entries outside the catalogue and recommendation. Exclude any entry without an exact launch. Record the optional flat-ID experiment separately; never use it to authorize generated frontmatter.

**Step 5: Clean temporary files**

Change the verification record status to `complete`, remove all `oat-pin-probe-*` definitions, and confirm no probe file remains.

**Step 6: Format and verify**

Run:

```bash
pnpm exec oxfmt --write .oat/projects/shared/cursor-subagent-materialization/references/cursor-pin-verification.md
test -z "$(git status --porcelain -- .cursor/agents/oat-pin-probe-*.md)"
```

Expected: the evidence record is formatted; no temporary agent definition remains; each future shipped entry is approved or explicitly excluded.

**Step 7: Commit**

```bash
git add .oat/projects/shared/cursor-subagent-materialization/references/cursor-pin-verification.md
git commit -m "test(g01): verify cursor pin syntax mappings"
```

After this commit, begin tracked implementation at p02. Do not add a p01 orchestration run or code-review row; g01 is covered by its persisted evidence record and the plan artifact review.

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
- an approved mapping-specific gate g01 evidence row for every registry entry, regardless of catalogue/recommendation/configuration-only classification;
- a bracket segment in every emitted model (`[]` allowed);
- exact Composer standard/fast forms;
- no unapproved Fable/Grok entry;
- unique normalized variant names;
- explicit Cursor `name`, `description`, and mapped `model`;
- omission of canonical-only `version`, `tools`, and `color`;
- YAML-comment managed/role/owner markers;
- byte-identical canonical body.

**Step 2: Implement catalogue, naming, and marker helpers**

Use the approved gate g01 evidence verbatim. Preserve owner values `supported-catalogue | user-config | project-config`. Do not implement suffix stripping or a flat-ID frontmatter fallback.

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

Cover supported-catalogue seeding, user effective config, shared/local/project-state candidates, project ownership precedence, approved configuration-only mappings outside the supported catalogue, rejection of registry entries without mapping-specific gate g01 approval, unknown-mapping diagnostics with source, full-sync owner cleanup, partial-sync no-cleanup, symlink-aware collision scans, and disabled-provider stale-state behavior.

**Step 2: Implement target collection and plans**

Resolve layered configuration through the existing effective-config boundary. Unknown config IDs and mapped IDs without an approved mapping-specific evidence row fail closed; they never become raw frontmatter. Only recognized managed files with the applicable owner are updated or removed.

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
- Modify: `packages/cli/src/validation/skills.test.ts`
- Modify: `packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts`

**Step 1: Update canonical return contracts**

When `CURSOR_AGENT=1` and `CURSOR_CONVERSATION_ID` is present, require the returned result to include that ID as transcript/session correlation. Explicitly state that it is not model evidence.

**Step 2: Bump both agent versions**

Increase each changed canonical agent's frontmatter version once for this PR.

**Step 3: Update pinned-version tests**

Update assertions that pin these two canonical agent versions in the same task, so this commit is independently green.

**Step 4: Format and verify**

Run:

```bash
pnpm exec oxfmt --write .agents/agents/oat-reviewer.md .agents/agents/oat-phase-implementer.md packages/cli/src/validation/skills.test.ts packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts
pnpm run cli:source -- internal validate-oat-skills
pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts src/commands/init/tools/shared/review-skill-contracts.test.ts
git diff --exit-code -- packages/cli/assets
```

Expected: both canonical roles and pinned-version tests pass, generated assets remain untouched, and provenance uses `configured`, never `verified`.

**Step 5: Commit**

```bash
git add .agents/agents/oat-reviewer.md .agents/agents/oat-phase-implementer.md packages/cli/src/validation/skills.test.ts packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts
git commit -m "feat(p04-t01): report cursor conversation correlation"
```

---

### Task p04-t02: Migrate canonical dispatch guidance to native Cursor variants

**Files:**

- Modify: `.agents/skills/oat-dispatch-subagents/SKILL.md`
- Modify: `.agents/skills/oat-dispatch-subagents/references/provider-cursor.md`
- Modify: `.agents/skills/oat-project-plan/SKILL.md`
- Modify: `.agents/skills/oat-project-quick-start/SKILL.md`
- Modify: `.agents/skills/oat-project-import-plan/SKILL.md`
- Modify: `.agents/skills/oat-project-review-provide/SKILL.md`
- Modify: `.agents/skills/oat-project-review-provide-remote/SKILL.md`
- Modify: `.agents/skills/oat-project-plan-writing/SKILL.md`
- Modify: `.agents/skills/oat-project-implement/SKILL.md`
- Modify: `.agents/skills/oat-project-implement/references/phase-execution.md`
- Modify: `.agents/skills/oat-project-implement/references/dispatch-and-dry-run.md`
- Modify: `.agents/skills/oat-project-implement/references/completion-and-closeout.md`
- Modify: `packages/cli/src/validation/skills.test.ts`
- Modify: `packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts`

**Step 1: Preserve the coordination baseline**

Confirm current HEAD contains gate-execution-hardening commit `69d5fe0c` (equivalent to the earlier `c57bdc9d` task commit). Preserve its foreground/background, liveness, transcript-addressing, and pre-start recovery guidance; do not cherry-pick the older commit.

**Step 2: Update canonical dispatch prose**

Replace concrete managed Cursor `dispatchArgs.model` rules with `dispatchArgs.variant`, exact native-agent-type-first launch, and pre-start native role-selection rejection as the only replacement boundary across plan, quick-start, import-plan, local review, remote review, and implementation workflows. The remote workflow must invoke the exact resolver-selected native reviewer variant instead of the base `/oat-reviewer`; its TypeScript structured-findings wrapper remains provider-neutral because the skill owns dispatcher selection. Keep Cursor model strings opaque inside the mapping/resolver; never normalize them in skills.

**Step 3: Bump changed skill versions**

Increase each changed canonical `SKILL.md` version once for the final PR diff. This includes `oat-dispatch-subagents` when its provider reference changes, `oat-project-implement` when its reference files change, and all newly covered plan/quick-start/import/remote-review consumers.

**Step 4: Update validation contracts**

Require variant-first guidance in every listed canonical consumer and reject stale concrete Cursor model-argument or base-reviewer launch language while preserving Claude model-argument behavior. Add explicit remote-review assertions for exact resolver-selected native variants and the pre-start rejection boundary. Restrict this task's `packages/cli/src/validation/skills.test.ts` edits to canonical-skill contracts; defer assertions over rendered docs pages to p04-t04 so each commit remains independently green.

**Step 5: Format and verify**

Run:

```bash
pnpm exec oxfmt --write .agents/skills/oat-dispatch-subagents .agents/skills/oat-project-plan/SKILL.md .agents/skills/oat-project-quick-start/SKILL.md .agents/skills/oat-project-import-plan/SKILL.md .agents/skills/oat-project-review-provide/SKILL.md .agents/skills/oat-project-review-provide-remote/SKILL.md .agents/skills/oat-project-plan-writing/SKILL.md .agents/skills/oat-project-implement/SKILL.md .agents/skills/oat-project-implement/references packages/cli/src/validation/skills.test.ts packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts
pnpm run cli:source -- internal validate-oat-skills
pnpm run cli:source -- internal validate-skill-version-bumps --base-ref origin/main
pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts src/commands/init/tools/shared/review-skill-contracts.test.ts
git diff --exit-code -- packages/cli/assets
```

Expected: canonical skills and version bumps validate, generated assets remain untouched, gate-hardening guidance remains present, and tests enforce Cursor variants rather than model arguments.

**Step 6: Commit**

```bash
git add .agents/skills/oat-dispatch-subagents .agents/skills/oat-project-plan/SKILL.md .agents/skills/oat-project-quick-start/SKILL.md .agents/skills/oat-project-import-plan/SKILL.md .agents/skills/oat-project-review-provide/SKILL.md .agents/skills/oat-project-review-provide-remote/SKILL.md .agents/skills/oat-project-plan-writing/SKILL.md .agents/skills/oat-project-implement/SKILL.md .agents/skills/oat-project-implement/references packages/cli/src/validation/skills.test.ts packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts
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

Require source/asset parity, a new recommendation marker version, materializability for every Cursor candidate, and the operator-approved multi-family tier placement with Grok in Balanced only if gate g01 approved its exact mapping.

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
- Modify: `packages/cli/src/validation/skills.test.ts` (docs-page assertions only)

**Step 1: Update user-facing behavior**

Document sync-time Cursor variants, explicit flat-ID/bracket mapping, owner scopes, native variant launch, silent fallback risk, doctor availability diagnostics, and `configured` provenance. Remove claims that managed Cursor dispatch is enforced through a Task-level model argument. Update the docs-page assertions in `skills.test.ts` to enforce the revised rendered guidance.

**Step 2: Format and verify**

Run:

```bash
pnpm exec oxfmt --write apps/oat-docs/docs/provider-sync/providers.md apps/oat-docs/docs/workflows/projects/dispatch-ceiling.md apps/oat-docs/docs/workflows/projects/implementation-execution.md apps/oat-docs/docs/workflows/projects/lifecycle.md apps/oat-docs/docs/workflows/projects/artifacts.md apps/oat-docs/docs/cli-utilities/configuration.md
pnpm exec oxfmt --write packages/cli/src/validation/skills.test.ts
pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts
pnpm --filter oat-docs docs:lint
pnpm build:docs
pnpm docs:check-links
git diff --exit-code -- apps/oat-docs/index.md
```

Expected: docs lint, compilation, and links pass; the generated index remains clean; and terminology consistently separates configured selection, catalogue availability, and runtime identity.

**Step 3: Commit**

```bash
git add apps/oat-docs/docs/provider-sync/providers.md apps/oat-docs/docs/workflows/projects/dispatch-ceiling.md apps/oat-docs/docs/workflows/projects/implementation-execution.md apps/oat-docs/docs/workflows/projects/lifecycle.md apps/oat-docs/docs/workflows/projects/artifacts.md apps/oat-docs/docs/cli-utilities/configuration.md packages/cli/src/validation/skills.test.ts
git commit -m "docs(p04-t04): explain cursor materialized dispatch"
```

---

## Phase 5: Generated Views and Native Launch Gate

### Task p05-t01: Regenerate and verify all provider views

**Files:**

- Generated: `.cursor/agents/oat-reviewer-*.md`
- Generated: `.cursor/agents/oat-phase-implementer-*.md`
- Generated: `.claude/**`
- Generated: `.codex/**`
- Generated: `.cursor/**`
- Generated: `.oat/sync/manifest.json`
- Generated: `packages/cli/assets/**`
- Modify: `.oat/projects/shared/cursor-subagent-materialization/references/cursor-pin-verification.md`

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

Run:

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/sync/index.test.ts src/commands/init/tools/shared/bundle-consistency.test.ts
```

Expected: generated assets contain only approved mappings and focused tests pass.

**Step 4: Persist the final-launch restart handoff**

Choose at least one approved generated reviewer variant and one approved generated phase-implementer variant. Record each exact native type, its bracket-form `model:` value, and `status: awaiting-final-launch` in the verification record. This persisted handoff is the recommended p05 HiLL checkpoint input after the phase implementer returns. Implementation preflight must have confirmed and persisted p05 before execution reaches this step; otherwise stop and revise the gate route.

```bash
pnpm exec oxfmt --write .oat/projects/shared/cursor-subagent-materialization/references/cursor-pin-verification.md
```

**Step 5: Commit**

```bash
git add .claude .codex .cursor .oat/sync/manifest.json packages/cli/assets .oat/projects/shared/cursor-subagent-materialization/references/cursor-pin-verification.md
git commit -m "chore(p05-t01): sync cursor materialized agents"
```

**Step 6: Enforce post-commit generated cleanliness**

Run:

```bash
pnpm run --silent cli:source -- sync --scope all --dry-run --json > /tmp/oat-sync-dry-run.json
node -e 'const fs = require("node:fs"); const report = JSON.parse(fs.readFileSync(process.argv[1], "utf8")); if (report.summary.plannedOperations !== 0) throw new Error(`plannedOperations=${report.summary.plannedOperations}`);' /tmp/oat-sync-dry-run.json
git diff --exit-code -- .claude .codex .cursor .oat/sync/manifest.json packages/cli/assets
test -z "$(git status --porcelain --untracked-files=all -- .claude .codex .cursor .oat/sync/manifest.json packages/cli/assets)"
```

Expected: `summary.plannedOperations` is exactly zero and all generated provider views, the sync manifest, and bundled assets are clean, including untracked files. If not, regenerate, amend the task commit, and repeat before advancing.

---

### Recommended HiLL checkpoint after p05: Launch final generated Cursor role variants

At implementation start, confirm p05 as the HiLL checkpoint and persist `oat_plan_hill_phases: ['p05']`. That makes this a root/operator lifecycle boundary after p05-t01's phase implementer returns. `oat-project-implement` pauses at p05; no second p05 task is dispatched. The operator starts a fresh Cursor session rooted at this worktree so the committed generated native definitions are discovered, then resumes the project at this checkpoint.

**Files:**

- Modify: `.oat/projects/shared/cursor-subagent-materialization/references/cursor-pin-verification.md`
- Read: `.cursor/agents/oat-reviewer-*.md`
- Read: `.cursor/agents/oat-phase-implementer-*.md`

**Step 1: Validate the persisted handoff**

Confirm the verification record says `status: awaiting-final-launch` and names at least one approved generated reviewer variant plus one approved generated phase-implementer variant with their bracket-form `model:` values.

**Step 2: Launch through the native agent-definition surface**

In the fresh Cursor session, launch both exact native types. Do not substitute `cursor-agent --model`. Capture externally observable configured-model evidence and each returned `CURSOR_CONVERSATION_ID`.

**Step 3: Record the evidence boundary**

Append the role launch, configured variant/model evidence, and conversation correlation to the verification record. Keep runtime model and effort `not-reported`; neither successful completion nor the conversation ID is runtime identity proof.

**Step 4: Format, verify, and commit**

Run:

```bash
pnpm exec oxfmt --write .oat/projects/shared/cursor-subagent-materialization/references/cursor-pin-verification.md
test -z "$(git status --porcelain -- .cursor/agents/oat-pin-probe-*.md)"
```

Expected: both final generated role families were launched by exact native type, their conversation IDs are recorded, the configured/runtime evidence boundary is explicit, and no probe definition remains.

```bash
git add .oat/projects/shared/cursor-subagent-materialization/references/cursor-pin-verification.md
git commit -m "test(p05-hill): verify generated cursor role launches"
```

After this evidence commit, record p05 in `oat_hill_completed` through the normal lifecycle bookkeeping and resume `oat-project-implement` at p06.

---

## Phase 6: Release Validation

### Task p06-t01: Bump public packages and run the release boundary

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
```

Expected: all checks pass, the five package versions are identical, and release validation passes.

**Step 4: Commit**

```bash
git add packages/cli/package.json packages/control-plane/package.json packages/docs-config/package.json packages/docs-theme/package.json packages/docs-transforms/package.json packages/cli/assets/public-package-versions.json
git commit -m "chore(p06-t01): bump public package versions"
```

**Step 5: Enforce final generated cleanliness**

Run:

```bash
pnpm run --silent cli:source -- sync --scope all --dry-run --json > /tmp/oat-sync-dry-run.json
node -e 'const fs = require("node:fs"); const report = JSON.parse(fs.readFileSync(process.argv[1], "utf8")); if (report.summary.plannedOperations !== 0) throw new Error(`plannedOperations=${report.summary.plannedOperations}`);' /tmp/oat-sync-dry-run.json
git diff --exit-code -- .claude .codex .cursor .oat/sync/manifest.json packages/cli/assets
test -z "$(git status --porcelain --untracked-files=all -- .claude .codex .cursor .oat/sync/manifest.json packages/cli/assets)"
```

Expected: `summary.plannedOperations` is exactly zero and the generated provider views, sync manifest, and bundled assets remain clean after the release commit, including untracked files.

---

## Reviews

| Scope  | Type     | Status          | Date       | Artifact                                                      |
| ------ | -------- | --------------- | ---------- | ------------------------------------------------------------- |
| p02    | code     | pending         | -          | -                                                             |
| p03    | code     | pending         | -          | -                                                             |
| p04    | code     | pending         | -          | -                                                             |
| p05    | code     | pending         | -          | -                                                             |
| p06    | code     | pending         | -          | -                                                             |
| final  | code     | pending         | -          | -                                                             |
| spec   | artifact | pending         | -          | -                                                             |
| design | artifact | fixes_completed | 2026-07-16 | reviews/archived/artifact-design-review-2026-07-16T111818Z.md |
| design | artifact | passed          | 2026-07-16 | reviews/archived/artifact-design-review-2026-07-16T194141Z.md |
| plan   | artifact | fixes_completed | 2026-07-17 | reviews/archived/artifact-plan-review-2026-07-17T142637Z.md   |
| plan   | artifact | fixes_completed | 2026-07-17 | reviews/archived/artifact-plan-review-2026-07-17T160504Z.md   |

**Status values:** `pending` → `received` → `fixes_added` → `fixes_completed` → `passed`

---

## Implementation Complete

**Summary:**

- Gate g01: Live evidence gates every shipped Cursor mapping before implementation.
- Phase 2: 3 tasks - Shared lifecycle, Cursor codec, and owner-aware desired state.
- Phase 3: 4 tasks - Sync/status/init, doctor, resolver, and audit integration.
- Phase 4: 4 tasks - Canonical roles, dispatch guidance, recommendation, and docs.
- Phase 5: 1 task plus a recommended HiLL checkpoint - Generated provider views and final native role-launch evidence.
- Phase 6: 1 task - Lockstep public-package versioning and release validation.

**Total: 13 implementation tasks plus 1 pre-implementation gate**

Ready for code review and merge after all tasks and reviews pass.

---

## References

- Discovery: `discovery.md`
- Lightweight design: `design.md`
- Pin verification record: `references/cursor-pin-verification.md` (created by gate g01)
- Codex command reference: `packages/cli/src/commands/providers/codex/materialize.ts`
- Codex codec reference: `packages/cli/src/providers/codex/codec/`
- Proven cloud ladder: `.oat/projects/shared/cursor-cloud-autonomous-projects/references/oat-user-config.cloud.json`
- Coordination baseline: gate-execution-hardening merge commit `69d5fe0c`
