---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-07-10
oat_phase: plan
oat_phase_status: complete
oat_plan_hill_phases: ['p03']
oat_auto_review_at_hill_checkpoints: true
oat_plan_parallel_groups: [['p01', 'p02']]
oat_phase_review_gate:
  enabled: true
  phases: []
  review_type: code
  exit_nonzero_on: important
oat_plan_source: quick
oat_import_reference: null
oat_import_source_path: null
oat_import_provider: null
oat_generated: false
oat_template: false
---

# Implementation Plan: codex-subagent-max-depth

> Execute this plan using `oat-project-implement` — sequential by default, parallel when `oat_plan_parallel_groups` is declared.

**Goal:** Ensure OAT-managed Codex roles can execute the native
`root → coordinator → worker` topology at depth 2 while preserving scoped user
configuration and treating exact `agent_type` dispatch as launcher-owned
configured provenance.

**Architecture:** Extend the shared Codex TOML merge with a scope-aware depth
floor, use the same policy from sync and direct materialization, diagnose
insufficient managed-role depth in doctor, and clarify that native exact-role
selection precedes any pinned CLI fallback.

**Tech Stack:** TypeScript, Node.js, `@iarna/toml`, Commander, Vitest, Markdown,
pnpm, Turborepo

**Commit Convention:** `{type}({scope}): {description}` - e.g., `feat(p01-t01): add user auth endpoint`

## Planning Checklist

- [x] Defer HiLL checkpoint confirmation to `oat-project-implement`
- [x] Evaluated phases for parallelism opportunities
- [x] Confirmed the `p01` + `p02` parallel group with the user
- [x] Resolved project dispatch policy as managed `High`
- [x] Configured independent review for all implementation phases
- [x] Re-ran canonical plan artifact review after fixes

---

## Parallelism

`p01` and `p02` are candidates for one parallel group because their write sets
are disjoint: `p01` owns Codex CLI configuration and doctor code, while `p02`
owns implementation/review instructions and their contract tests. `p03`
depends on both because it updates provider documentation, regenerates managed
views, bumps lockstep package versions, and performs release validation.

The user confirmed `[['p01', 'p02']]`; no other parallelism is inferred.

---

## Phase 1: Codex Depth Policy and Scope Wiring

### Task p01-t01: Enforce the shared max-depth floor

**Files:**

- Modify: `packages/cli/src/providers/codex/codec/config-merge.ts`
- Modify: `packages/cli/src/providers/codex/codec/config-merge.test.ts`

**Step 1: Write test (RED)**

Add table-driven coverage for missing, invalid, lower, equal, and higher
`agents.max_depth` values. Add cases proving a higher
`inheritedMaxDepth` wins, unrelated settings and custom roles survive, and a
second merge is byte-identical with `changed: false`.

Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/providers/codex/codec/config-merge.test.ts`

Expected: New depth assertions fail because the merge does not yet write
`agents.max_depth`.

**Step 2: Implement (GREEN)**

```typescript
interface CodexConfigMergeArgs {
  existingContent: string | null;
  desiredRoles: CodexManagedRoleConfig[];
  staleManagedRoles?: string[];
  inheritedMaxDepth?: number;
}

export function readCodexMaxDepth(content: string | null): number | null;
```

Compute `max(2, valid target depth, valid inherited depth)`, pass the inherited
value through the single-role wrapper, and add JSDoc to exported or non-obvious
helpers. Do not change `agents.max_threads`.

**Step 3: Refactor**

Keep TOML parsing and numeric validation in focused helpers without changing
existing parse-error behavior.

**Step 4: Verify**

Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/providers/codex/codec/config-merge.test.ts`

Expected: All merge threshold, preservation, and idempotency cases pass.

**Step 5: Commit**

```bash
git add packages/cli/src/providers/codex/codec/config-merge.ts packages/cli/src/providers/codex/codec/config-merge.test.ts
git commit -m "feat(p01-t01): enforce codex subagent depth floor"
```

---

### Task p01-t02: Preserve inherited depth during Codex sync

**Files:**

- Modify: `packages/cli/src/providers/codex/codec/sync-extension.ts`
- Modify: `packages/cli/src/providers/codex/codec/sync-extension.test.ts`
- Modify: `packages/cli/src/commands/sync/index.test.ts`

**Step 1: Write test (RED)**

Add project-sync coverage where user config declares depth above `2` and verify
the project config operation preserves that value without mutating user config.
Cover user scope, missing/lower values, config operation
`create`/`update`/`skip`, and second-run convergence. Extend command output
coverage to retain the resulting Codex config operation and aggregate hash.

Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/providers/codex/codec/sync-extension.test.ts src/commands/sync/index.test.ts`

Expected: Inherited-depth and resulting-operation assertions fail.

**Step 2: Implement (GREEN)**

For project scope only, derive the lower-precedence user Codex config from
`options.userConfigDir`, read its numeric depth, and pass it into the shared
merge. User scope reads and writes only its own config. Keep planning and
dry-run paths non-mutating.

**Step 3: Refactor**

Reuse scope detection and `readCodexMaxDepth`; do not duplicate TOML parsing or
introduce another config writer.

**Step 4: Verify**

Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/providers/codex/codec/sync-extension.test.ts src/commands/sync/index.test.ts`

Expected: Scope isolation, inherited-depth preservation, sync output, and
idempotency tests pass.

**Step 5: Commit**

```bash
git add packages/cli/src/providers/codex/codec/sync-extension.ts packages/cli/src/providers/codex/codec/sync-extension.test.ts packages/cli/src/commands/sync/index.test.ts
git commit -m "feat(p01-t02): preserve codex depth across sync scopes"
```

---

### Task p01-t03: Apply scope-safe depth in direct materialization

**Files:**

- Modify: `packages/cli/src/commands/providers/codex/materialize.ts`
- Modify: `packages/cli/src/commands/providers/codex/materialize.test.ts`

**Step 1: Write test (RED)**

Add direct-command cases proving project materialization preserves a higher
user depth while writing only project config, explicit `--scope user` writes
only user config, missing/lower depth becomes `2`, and repeated materialization
is idempotent. Add an invalid-target-TOML case that verifies no role file is
written before the parse failure.

Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/providers/codex/materialize.test.ts`

Expected: Depth, scope, or pre-write failure assertions fail.

**Step 2: Implement (GREEN)**

Resolve inherited depth while building the materialization plan, precompute the
merged target config before writes, and then write the role and target config.
Never mutate the inherited user config during project materialization.

**Step 3: Refactor**

Keep file reads explicit and retain the existing command result shape and
dry-run behavior.

**Step 4: Verify**

Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/providers/codex/materialize.test.ts`

Expected: Project/user scope, preservation, no-partial-write, and idempotency
cases pass.

**Step 5: Commit**

```bash
git add packages/cli/src/commands/providers/codex/materialize.ts packages/cli/src/commands/providers/codex/materialize.test.ts
git commit -m "feat(p01-t03): enforce depth in direct codex materialization"
```

---

### Task p01-t04: Diagnose insufficient depth in doctor and preflight

**Files:**

- Modify: `packages/cli/src/commands/doctor/index.ts`
- Modify: `packages/cli/src/commands/doctor/index.test.ts`
- Modify: `packages/cli/src/commands/project/dispatch-ceiling/index.ts`
- Modify: `packages/cli/src/commands/project/dispatch-ceiling/index.test.ts`

**Step 1: Write test (RED)**

Add managed-role checks for project and user scopes:

- Pass at numeric depth `2` and above.
- Warn when missing, invalid, or below `2`.
- Emit no depth check when no managed role is present.
- Explain `root (0) → phase coordinator (1) → task worker (2)`.
- Recommend the matching `oat sync --scope project|user` and scoped direct
  materialization command.
- For project diagnosis, inherit user depth only when project depth is absent.
- Separately verify implementation preflight blocks managed nested dispatch
  when effective depth is missing, invalid, or below `2`, passes at `2+`, and
  returns scope-appropriate remediation.

Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/doctor/index.test.ts src/commands/project/dispatch-ceiling/index.test.ts`

Expected: The new `codex_max_depth` doctor check and managed preflight guard are
absent.

**Step 2: Implement (GREEN)**

Extract the Codex managed-role checks so both concrete scopes can use them.
Compute effective depth with Codex precedence, add a scope-qualified doctor
check, and preserve existing TOML, multi-agent, and role-file diagnostics.
Wire the same effective-depth requirement into the managed implementation
preflight path without changing unrelated dispatch target selection.

**Step 3: Refactor**

Keep check construction separate from command rendering and use JSDoc for new
non-obvious helpers.

**Step 4: Verify**

Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/doctor/index.test.ts src/commands/project/dispatch-ceiling/index.test.ts`

Expected: Existing doctor/dispatch tests and all new depth/remediation cases
pass.

**Step 5: Commit**

```bash
git add packages/cli/src/commands/doctor/index.ts packages/cli/src/commands/doctor/index.test.ts packages/cli/src/commands/project/dispatch-ceiling/index.ts packages/cli/src/commands/project/dispatch-ceiling/index.test.ts
git commit -m "feat(p01-t04): guard codex nested dispatch depth"
```

---

### Task p01-t05: (review) Make remediation commands executable

**Files:**

- Modify: `packages/cli/src/commands/doctor/index.ts`
- Modify: `packages/cli/src/commands/doctor/index.test.ts`
- Modify: `packages/cli/src/commands/project/dispatch-ceiling/index.ts`
- Modify: `packages/cli/src/commands/project/dispatch-ceiling/index.test.ts`

Include every required direct-materialization operand in doctor and preflight
remediation text, with matching project/user assertions.

**Commit:** `8cc8923125622bc043a30ddc2e0fa662c3049e7f`

---

### Task p01-t06: (review) Preserve zero-role partial sync no-op

**Files:**

- Modify: `packages/cli/src/providers/codex/codec/sync-extension.ts`
- Modify: `packages/cli/src/providers/codex/codec/sync-extension.test.ts`

Return from zero-role partial sync before reading unrelated inherited user
Codex TOML, and cover malformed inherited configuration.

**Commit:** `f175f592799560c15d64688ad509cb2458e941fb`

---

## Phase 2: Native Dispatch Provenance Contract

### Task p02-t01: Make exact native dispatch the primary route

**Files:**

- Modify: `.agents/skills/oat-project-implement/SKILL.md`
- Modify: `packages/cli/src/validation/skills.test.ts`

**Step 1: Write test (RED)**

Add contract assertions that:

- A resolver-returned Codex variant must first be sent as native
  `agent_type`.
- Spawn acceptance plus the launcher payload is configured invocation
  evidence.
- Every coordinator, task-worker, fix, and review launch records `target`,
  `model_axis`, and `effort_axis` from resolver output and the actual launcher
  payload after payload construction.
- Missing runtime telemetry or agent self-report is not role unavailability.
- Self-report cannot populate or overwrite the launcher-owned target/model/
  effort fields.
- The fresh pinned-child route is allowed only after an actual native
  `agent_type` rejection.
- An accepted child, including one that later returns `BLOCKED`, cannot trigger
  the pinned CLI fallback.
- Model/effort provenance is labeled launcher-selected/config-declared rather
  than worker-observed.

Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts`

Expected: New instruction-contract assertions fail.

**Step 2: Implement (GREEN)**

Clarify the managed Codex invariant and each coordinator, task-worker, fix, and
review dispatch clause that could otherwise interpret missing telemetry as
selection failure. Keep exact-target failure closed and retain the pinned child
only as a confirmed native-selection fallback. Preserve mandatory structured
logging of target, model, and effort from the resolver and constructed payload
for every launch route. Bump the skill frontmatter once from `2.0.33` to
`2.0.34`.

**Step 3: Refactor**

Use one consistent definition of native role-selection rejection and avoid
duplicated or contradictory self-report requirements.

**Step 4: Verify**

Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts`

Expected: Skill validation passes with native-first and launcher-owned
provenance enforced.

**Step 5: Commit**

```bash
git add .agents/skills/oat-project-implement/SKILL.md packages/cli/src/validation/skills.test.ts
git commit -m "fix(p02-t01): prefer exact native codex dispatch"
```

---

### Task p02-t02: Document configured reviewer and worker provenance

**Files:**

- Modify: `apps/oat-docs/docs/workflows/projects/implementation-execution.md`
- Modify: `apps/oat-docs/docs/workflows/projects/reviews.md`

**Step 1: Update documentation**

Document that an accepted launch with the exact materialized `agent_type` is
authoritative evidence of the configured invocation for coordinators, workers,
and reviewers. Keep optional self-report separate and non-authoritative, and
reserve runtime attestation for host-generated metadata. Require launcher-owned
target, model-axis, and effort-axis logging after payload construction, and
state that worker output cannot populate or overwrite those fields.

**Step 2: Clarify fallback semantics**

State that a pinned CLI child follows an actual native role-selection
rejection, not absent self-reporting or model/effort telemetry. An accepted
child, including one that later returns `BLOCKED`, represents a task outcome
and must never trigger pinned CLI fallback.

**Step 3: Verify**

Run: `pnpm format && pnpm build:docs`

Expected: Markdown formatting and the complete documentation build pass.

**Step 4: Commit**

```bash
git add apps/oat-docs/docs/workflows/projects/implementation-execution.md apps/oat-docs/docs/workflows/projects/reviews.md
git commit -m "docs(p02-t02): clarify codex dispatch provenance"
```

---

### Task p02-t03: (review) Align phase coordinator dispatch contract

Update the canonical phase coordinator and contract tests so exact native
`agent_type` is attempted first, launcher-owned provenance is immutable, and
only explicit pre-start role-selection rejection permits fallback.

**Commit:** `7eb3b1bbb84e02c04a2a5620644592540a7d9ea1`

---

### Task p02-t04: (review) Handle blocked reviewer terminals

Make accepted reviewer `BLOCKED` explicitly block phase/final review, never
trigger fallback, and never pass through absent findings.

**Commit:** `6b1f1f46b958cdb556af775eadfb22a249f714d3`

---

### Task p02-t05: (review) Align project review dispatch semantics

Apply native-first, rejection-only fallback and launcher-owned provenance to
`oat-project-review-provide`; bump its canonical skill version once.

**Commit:** `82bd024e20dd89383c7272b674070e33124cab86`

---

### Task p02-t06: (review) Document blocked reviewer semantics

Document that accepted reviewer `BLOCKED` blocks review, cannot pass from absent
findings, and remains subject to managed exact-target fallback guards.

**Commit:** `517d1721b3950a34aefa0b77ae71afb5b4b30a43`

---

### Task p02-t07: (review) Preserve reviewer retry route

Require accepted native reviewer timeouts to retry the same native route; the
pinned child remains eligible only after explicit pre-start rejection.

**Commit:** `f67354fa2db20cd1e95689aa3b29d558020ec86d`

---

## Phase 3: Provider Surface and Release Validation

### Task p03-t01: Document and regenerate the Codex provider surface

**Files:**

- Modify: `apps/oat-docs/docs/provider-sync/providers.md`
- Modify: `apps/oat-docs/docs/provider-sync/scope-and-surface.md`
- Generated: `.codex/config.toml`
- Generated: `.oat/sync/manifest.json`

**Step 1: Update provider documentation**

Describe the depth-2 topology, merge floor, higher inherited value
preservation, project/user write boundaries, doctor remediation, and native
`agent_type` first behavior.

**Step 2: Regenerate managed views**

Run: `pnpm run cli -- sync --scope project`

Expected: Project Codex config contains `agents.max_depth >= 2`; generated
provider/sync metadata reflects canonical changes without unrelated drift.

**Step 3: Verify generated output**

Run:
`pnpm run cli -- status --scope project && pnpm --filter @open-agent-toolkit/cli build`

Expected: Managed Codex output is converged and bundled CLI assets build.

**Step 4: Commit**

```bash
git add apps/oat-docs/docs/provider-sync/providers.md apps/oat-docs/docs/provider-sync/scope-and-surface.md .codex/config.toml .oat/sync/manifest.json
git commit -m "docs(p03-t01): document codex nested role configuration"
```

---

### Task p03-t02: Bump lockstep packages and validate the release

**Files:**

- Modify: `packages/cli/package.json`
- Modify: `packages/control-plane/package.json`
- Modify: `packages/docs-config/package.json`
- Modify: `packages/docs-theme/package.json`
- Modify: `packages/docs-transforms/package.json`
- Modify: `packages/cli/assets/public-package-versions.json`
- Modify: `.agents/skills/oat-project-implement/SKILL.md`
- Modify: `.agents/skills/oat-project-review-provide/SKILL.md`
- Modify: `packages/cli/src/validation/skills.test.ts`
- Generated: `.oat/sync/manifest.json`

**Step 1: Bump lockstep versions**

After rebasing onto PR #136, advance all five public packages together from
`0.1.50` to `0.1.51`. Because merged main already carries implementation skill
`2.0.34` and review-provide `1.3.13`, advance this branch's changed canonical
skills to `2.0.35` and `1.3.14`, respectively, then regenerate managed views.

**Step 2: Run focused and workspace verification**

Run:

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run \
  src/providers/codex/codec/config-merge.test.ts \
  src/providers/codex/codec/sync-extension.test.ts \
  src/commands/providers/codex/materialize.test.ts \
  src/commands/doctor/index.test.ts \
  src/commands/sync/index.test.ts \
  src/validation/skills.test.ts
pnpm lint
pnpm format
pnpm type-check
pnpm test
pnpm build
pnpm build:docs
pnpm release:validate
```

Expected: Focused tests, workspace checks, docs build, bundled assets, and
release validation all pass.

**Step 3: Review the final diff**

Confirm every changed canonical skill has exactly one version bump, all
lockstep packages match, generated output is intentional, no sandbox topology
change was introduced, and no unrelated file is included.

**Step 4: Commit**

```bash
git add packages/cli/package.json packages/control-plane/package.json packages/docs-config/package.json packages/docs-theme/package.json packages/docs-transforms/package.json
git commit -m "chore(p03-t02): prepare codex depth release"
```

---

## Reviews

| Scope  | Type     | Status  | Date       | Artifact                         |
| ------ | -------- | ------- | ---------- | -------------------------------- |
| p01    | code     | passed  | 2026-07-11 | in-memory exact pinned reviewer  |
| p02    | code     | passed  | 2026-07-11 | in-memory exact pinned reviewer  |
| p03    | code     | passed  | 2026-07-11 | in-memory exact pinned reviewer  |
| final  | code     | pending | -          | -                                |
| spec   | artifact | pending | -          | -                                |
| design | artifact | pending | -          | -                                |
| plan   | artifact | passed  | 2026-07-11 | in-memory exact pinned re-review |

**Status values:** `pending` → `received` → `fixes_added` → `fixes_completed` → `passed`

**Meaning:**

- `received`: review artifact exists (not yet converted into fix tasks)
- `fixes_added`: fix tasks were added to the plan (work queued)
- `fixes_completed`: fix tasks implemented, awaiting re-review
- `passed`: re-review run and recorded as passing (no unresolved
  Critical/Important/Medium)

---

## Implementation Complete

**Summary:**

- Phase 1: 6 tasks - shared depth policy, scoped sync/materialization, doctor,
  and two review fixes
- Phase 2: 7 tasks - native dispatch instructions, provenance documentation,
  and five review fixes
- Phase 3: 2 tasks - provider regeneration, package versions, and release validation

**Total: 15 tasks**

Completion status will be recorded after all tasks and verification pass.

---

## References

- Design: `design.md`
- Discovery: `discovery.md`
- Orchestration learnings: `references/subagent-orchestration-learnings.md`
- Codex configuration precedence:
  `https://developers.openai.com/codex/config-basic`
- Codex subagent configuration:
  `https://developers.openai.com/codex/subagents`
