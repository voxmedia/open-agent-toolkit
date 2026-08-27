---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-08-27
oat_phase: plan
oat_phase_status: in_progress
oat_plan_parallel_groups:
  - [p01, p02, p03]
oat_phase_review_gate: false
oat_plan_source: quick
oat_import_reference: null
oat_import_source_path: null
oat_import_provider: null
oat_generated: false
oat_template: true
---

# Implementation Plan: Scope and Adoption Diagnostics

> Execute this plan using `oat-project-implement`. Phases p01-p03 have disjoint
> write sets and may run in isolated worktrees; p04 follows their merge.

**Goal:** Correct the remaining PJM adoption, provider reachability, shared
ownership, inventory-failure, output, and test-quality defects from the
user-scope tool-pack project.

**Architecture:** Preserve the canonical PJM adoption resolver and pack
inventory as the authorities. Thread active provider materialization capability
into inventory, then keep `doctor` and `status` as renderers of the same model.

**Tech Stack:** TypeScript ESM, Commander, Vitest, pnpm workspaces, Turborepo,
oxfmt, and Fumadocs Markdown.

**Commit Convention:** `{type}({task-id}): {description}`

## Parallelism

Phases p01, p02, and p03 are one parallel group. p01 writes only PJM migration
command/core tests; p02 writes pack inventory, doctor/status, and the scoped
diagnostic docs; p03 writes acceptance/unit test harnesses only. Their focused
verification is independent and their source write sets do not overlap. Phase
p04 is deliberately outside the group because it must select versions above
the then-current `origin/main` after all shipped changes merge, then run the
complete repository gate sequence against that integrated tree.

## Phase 1: PJM Migration Adoption Semantics

**Goal:** Remove project-pack intent from migration eligibility and pin the
canonical four-state adoption behavior.

### Task p01-t01: Remove pack intent from the migration core contract

**Files:**

- Modify: `packages/cli/src/commands/pjm/migrate.ts`
- Modify: `packages/cli/src/commands/pjm/migrate.test.ts`

**Step 1: Write tests (RED)**

Replace the `projectManagementEnabled` fixture contract with explicit migration
preconditions. Pin zero writes and an actionable skip reason for states that are
not migration-eligible while keeping dry-run/apply behavior unchanged for
eligible repositories.

Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/pjm/migrate.test.ts`

Expected: fail because the core still gates on project pack intent.

**Step 2: Implement (GREEN)**

Remove `projectManagementEnabled` from `PjmMigrationOptions`. Accept the
canonical adoption decision supplied by the command adapter, preserve
`already-migrated`, dry-run, apply, and zero-write boundaries, and report
adoption-oriented recovery text rather than pack-install text.

**Step 3: Format**

Run:
`pnpm exec oxfmt --write packages/cli/src/commands/pjm/migrate.ts packages/cli/src/commands/pjm/migrate.test.ts`

**Step 4: Verify**

Run the focused test command again; expected: pass.

**Step 5: Commit**

`git commit -m "fix(p01-t01): remove pack intent from PJM migration"`

### Task p01-t02: Resolve migration eligibility from PJM adoption

**Files:**

- Modify: `packages/cli/src/commands/pjm/index.ts`
- Modify: `packages/cli/src/commands/pjm/index.test.ts`
- Modify if the canonical state contract needs a bounded correction:
  `packages/cli/src/commands/pjm/adoption.ts`
- Modify with any adoption correction:
  `packages/cli/src/commands/pjm/adoption.test.ts`

**Step 1: Write tests (RED)**

At the public command boundary, cover `declared`, `inferred-legacy`,
`partial-initialization`, and `none` against both recognized legacy input and no
legacy input. Pin this behavior matrix:

| Adoption state           | Current/legacy evidence                 | Result                                                  |
| ------------------------ | --------------------------------------- | ------------------------------------------------------- |
| `declared`               | complete current layout                 | `already-migrated`; zero writes                         |
| `declared`               | recognized legacy sources               | normal dry-run/apply path                               |
| `inferred-legacy`        | complete current markerless layout      | `already-migrated`; zero writes                         |
| `partial-initialization` | recognized legacy sources               | normal dry-run/apply path                               |
| `partial-initialization` | no recognized legacy or complete layout | `skipped` with partial-state recovery; zero writes      |
| `none`                   | recognized old `reference/` sources     | normal dry-run/apply path                               |
| `none`                   | no recognized legacy or complete layout | `skipped` with no-migration-input recovery; zero writes |

The four canonical state labels provide context; recognized legacy-source
inventory is a separate migration precondition because a genuine old layout
can resolve to `partial-initialization` or `none`. Assert that project-pack
intent cannot change any row. Preserve `--print-prompt` as
adoption-independent and read-only.

Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/pjm/adoption.test.ts src/commands/pjm/migrate.test.ts src/commands/pjm/index.test.ts`

Expected: fail because `index.ts` still reads `config.tools.project-management`.

**Step 2: Implement (GREEN)**

Resolve adoption once through `resolvePjmAdoption({ projectRoot, repoRoot })`,
pass that result into the migration core, and remove the migration-only
`readOatConfig` dependency. Inventory recognized legacy sources before any
write and implement the matrix above: adoption state alone neither authorizes
nor blocks a legacy migration. Keep the four-state decision explicit; do not
infer adoption from user capability placement or scoped pack intent.

**Step 3: Format**

Run:
`pnpm exec oxfmt --write packages/cli/src/commands/pjm/index.ts packages/cli/src/commands/pjm/index.test.ts packages/cli/src/commands/pjm/adoption.ts packages/cli/src/commands/pjm/adoption.test.ts`

**Step 4: Verify**

Run the focused test command again; expected: pass with zero-write assertions
for every non-eligible state.

**Step 5: Commit**

`git commit -m "fix(p01-t02): resolve PJM migration from adoption and legacy evidence"`

**Phase 1 Verification:**

Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/pjm`

Expected: all PJM command, adoption, doctor, init, and migration tests pass.

## Phase 2: Provider-Aware and Fault-Tolerant Diagnostics

**Goal:** Make pack diagnostics accurate for active providers, shared owners,
and inventory failures without changing installation or sync behavior.

### Task p02-t01: Make user-agent reachability provider-aware

**Files:**

- Modify: `packages/cli/src/commands/tools/shared/pack-inventory.ts`
- Modify: `packages/cli/src/commands/tools/shared/pack-inventory.test.ts`
- Modify: `packages/cli/src/commands/doctor/index.ts`
- Modify: `packages/cli/src/commands/doctor/index.test.ts`
- Modify: `packages/cli/src/commands/status/index.ts`
- Modify: `packages/cli/src/commands/status/index.test.ts`
- Modify: `apps/oat-docs/docs/cli-utilities/tool-packs.md`

**Step 1: Write tests (RED)**

Cover Claude-only, Codex, Cursor, mixed, and no-provider user roots. For both
Codex and Cursor, cover configured-enabled without detection,
configured-disabled with detection, detected with unset config, and neither
detected nor configured. Assert the sync-owned config-aware matrix: enabled is
active, disabled is inactive, unset+detected is active, and unset+undetected is
inactive. All present managed agents are reported when no active adapter has a
user-agent extension; only bundled managed role files are excluded when active
Codex/Cursor materialization supplies them. Verify redacted paths and identical
human/JSON affected-agent sets in doctor and status.

Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/tools/shared/pack-inventory.test.ts src/commands/doctor/index.test.ts src/commands/status/index.test.ts`

Expected: fail because `USER_SCOPE_MANAGED_AGENT_FILES` is always excluded.

**Step 2: Implement (GREEN)**

Resolve adapters through `getConfigAwareAdapters` using the applicable scope's
resolved sync config (including `resolveUserSyncConfig` for user scope), then
thread one explicit materialization capability into inventory from both doctor
and status. Keep inventory deterministic and injectable; do not re-detect
providers inside inventory and do not expand user-scope sync content types.
Update diagnostic/detail/docs wording to distinguish Codex/Cursor managed-role
materialization from providers with no user-agent view.

**Step 3: Format**

Run:
`pnpm exec oxfmt --write packages/cli/src/commands/tools/shared/pack-inventory.ts packages/cli/src/commands/tools/shared/pack-inventory.test.ts packages/cli/src/commands/doctor/index.ts packages/cli/src/commands/doctor/index.test.ts packages/cli/src/commands/status/index.ts packages/cli/src/commands/status/index.test.ts apps/oat-docs/docs/cli-utilities/tool-packs.md`

**Step 4: Verify**

Run the focused test command again; expected: pass. Then run `pnpm check`;
expected: docs Markdown and package checks pass.

**Step 5: Commit**

`git commit -m "fix(p02-t01): report provider-aware user agents"`

### Task p02-t02: Attribute shared-owner observations to applicable packs

**Files:**

- Modify: `packages/cli/src/commands/tools/shared/pack-inventory.ts`
- Modify: `packages/cli/src/commands/tools/shared/pack-inventory.test.ts`
- Modify: `packages/cli/src/commands/doctor/index.ts`
- Modify: `packages/cli/src/commands/doctor/index.test.ts`
- Modify: `packages/cli/src/commands/status/index.ts`
- Modify: `packages/cli/src/commands/status/index.test.ts`

**Step 1: Write tests (RED)**

Cover each ordering of the `docs`/`workflows` shared script owner, including one
installed owner, both installed owners, a removed owner whose shared asset is
retained, and neither owner intended. Assert that reports never attribute the
asset to an unrelated uninstalled pack and never use shared presence as pack
placement evidence.

Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/tools/shared/pack-inventory.test.ts src/commands/doctor/index.test.ts src/commands/status/index.test.ts`

Expected: fail on the existing arbitrary non-owner attribution.

**Step 2: Implement (GREEN)**

Use manifest shared-owner identity plus the already-computed inventory/intent
set to select applicable owners. Emit an observation once with precise owner
context, or suppress it when no installed/intended owner makes it actionable.
Preserve the rule that shared assets alone never establish placement.

**Step 3: Format**

Run:
`pnpm exec oxfmt --write packages/cli/src/commands/tools/shared/pack-inventory.ts packages/cli/src/commands/tools/shared/pack-inventory.test.ts packages/cli/src/commands/doctor/index.ts packages/cli/src/commands/doctor/index.test.ts packages/cli/src/commands/status/index.ts packages/cli/src/commands/status/index.test.ts`

**Step 4: Verify**

Run the focused test command again; expected: pass in both pack enumeration
orders.

**Step 5: Commit**

`git commit -m "fix(p02-t02): attribute shared pack ownership precisely"`

### Task p02-t03: Degrade status inventory failures and delimit doctor output

**Files:**

- Modify: `packages/cli/src/commands/status/index.ts`
- Modify: `packages/cli/src/commands/status/index.test.ts`
- Modify: `packages/cli/src/commands/doctor/index.ts`
- Modify: `packages/cli/src/commands/doctor/index.test.ts`

**Step 1: Write tests (RED)**

Inject both asset-resolution and per-pack inventory failures. Assert non-hook
`status` returns a redacted `packs:inventory`-equivalent warning in human and
JSON output, retains unavailable-scope information, and exits without throwing;
assert hook mode still skips inventory. Add a retained-override detail
containing `; ` and prove human findings/fixes remain unambiguous entries.

Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/status/index.test.ts src/commands/doctor/index.test.ts`

Expected: fail because status throws and doctor joins entries with a colliding
separator.

**Step 2: Implement (GREEN)**

Mirror doctor's bounded inventory guard in `collectPackReport`, extend the
status pack report with an explicit availability diagnostic, and preserve
structured JSON. Use a human delimiter that cannot collide with existing
finding detail while keeping each recovery command copy-pasteable.

**Step 3: Format**

Run:
`pnpm exec oxfmt --write packages/cli/src/commands/status/index.ts packages/cli/src/commands/status/index.test.ts packages/cli/src/commands/doctor/index.ts packages/cli/src/commands/doctor/index.test.ts`

**Step 4: Verify**

Run the focused test command again; expected: pass for human, JSON, and hook
paths.

**Step 5: Commit**

`git commit -m "fix(p02-t03): harden scoped diagnostic output"`

**Phase 2 Verification:**

Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/tools/shared/pack-inventory.test.ts src/commands/doctor/index.test.ts src/commands/status/index.test.ts`

Expected: provider, owner, failure, redaction, and rendering cases pass.

## Phase 3: Test-Quality Ratchets

**Goal:** Make the affected tests exercise production-reachable behavior and
restore process-global state across every failure path.

### Task p03-t01: Replace tautological manifest and lifecycle assertions

**Files:**

- Modify:
  `packages/cli/src/commands/tools/tool-pack-lifecycle.integration.test.ts`
- Modify:
  `packages/cli/src/commands/init/tools/shared/bundle-consistency.test.ts`

**Step 1: Establish mutation targets**

Confirm the current `expectedCompleteness` assertion still passes if inventory
completeness is broken, and that manifest ownership violations throw during
module import before the duplicated expectation block can run. Record the
behavior in the task outcome; do not retain a test that cannot reach RED.

**Step 2: Implement useful coverage**

Remove the constant reconcile-plan assertion and retain the real post-action
inventory check. Delete or re-scope the module-load invariant block to a
behavior not already enforced by `validatePackManifest()`, preserving source
coverage and user-facing lifecycle assertions.

**Step 3: Format**

Run:
`pnpm exec oxfmt --write packages/cli/src/commands/tools/tool-pack-lifecycle.integration.test.ts packages/cli/src/commands/init/tools/shared/bundle-consistency.test.ts`

**Step 4: Verify**

Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/tools/tool-pack-lifecycle.integration.test.ts src/commands/init/tools/shared/bundle-consistency.test.ts`

Expected: pass with no assertion whose value is fixed by the production return
literal or import-time validator.

**Step 5: Commit**

`git commit -m "test(p03-t01): replace tautological pack assertions"`

### Task p03-t02: Make scoped CLI harnesses realistic and exception-safe

**Files:**

- Modify: `packages/cli/src/commands/sync/index.test.ts`
- Modify: `packages/cli/src/commands/commands.integration.test.ts`
- Modify: `packages/cli/src/e2e/workflow.test.ts`
- Modify:
  `packages/cli/src/commands/tools/tool-pack-lifecycle.integration.test.ts`

**Step 1: Write regression assertions (RED)**

Use a user-scope skill, not an impossible generic user agent, for the per-scope
sync-plan independence fixture. Exercise both `--scope user` and
`--scope=user` in the integration/e2e injection helpers. Force sync-stub
creation failure and assert `HOME`, `process.exitCode`, `argv`, stdout, and
stderr are restored.

Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/sync/index.test.ts src/commands/commands.integration.test.ts src/e2e/workflow.test.ts src/commands/tools/tool-pack-lifecycle.integration.test.ts`

Expected: fail on the joined scope form or pre-`try` asynchronous mutation.

**Step 2: Implement (GREEN)**

Replace the impossible fixture, detect explicit scopes with
`arg === '--scope' || arg.startsWith('--scope=')`, make both harnesses use the
same defensive rule, correct the comment, and complete asynchronous setup
before mutating process globals (or place all mutations inside the protected
`try/finally`).

**Step 3: Format**

Run:
`pnpm exec oxfmt --write packages/cli/src/commands/sync/index.test.ts packages/cli/src/commands/commands.integration.test.ts packages/cli/src/e2e/workflow.test.ts packages/cli/src/commands/tools/tool-pack-lifecycle.integration.test.ts`

**Step 4: Verify**

Run the focused test command again; expected: pass without leaking global state
between tests.

**Step 5: Commit**

`git commit -m "test(p03-t02): harden scoped CLI harnesses"`

**Phase 3 Verification:**

Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/sync/index.test.ts src/commands/commands.integration.test.ts src/e2e/workflow.test.ts src/commands/tools/tool-pack-lifecycle.integration.test.ts src/commands/init/tools/shared/bundle-consistency.test.ts`

Expected: all corrected quality-ratchet suites pass in one worker run.

## Phase 4: Integrated Release Readiness

**Goal:** Advance the shipped release unit and verify the merged implementation
against every repository gate.

### Task p04-t01: Advance lockstep public package versions

**Files:**

- Modify: `packages/cli/package.json`
- Modify: `packages/control-plane/package.json`
- Modify: `packages/docs-config/package.json`
- Modify: `packages/docs-theme/package.json`
- Modify: `packages/docs-transforms/package.json`
- Modify: `packages/cli/assets/public-package-versions.json`
- Move:
  `.oat/repo/pjm/backlog/items/BL-260827-correct-scope-and-adoption.md` to
  `.oat/repo/pjm/backlog/archived/BL-260827-correct-scope-and-adoption.md`
- Modify: `.oat/repo/pjm/backlog/completed.md`
- Modify: `.oat/repo/pjm/backlog/index.md`

**Step 1: Establish the release floor (RED)**

Run `git fetch origin main`, then run `pnpm release:check-versions`.

Expected: fail because CLI/docs shipped behavior changed without a version
strictly greater than current `origin/main`.

**Step 2: Implement (GREEN)**

Choose one patch version strictly greater than every lockstep public version on
current `origin/main`, apply it to all five package manifests, and keep the
four-entry bundled public-package version map in lockstep. Do not assume the
version that was next when this plan was authored remains available.

**Step 3: Format**

Run:
`pnpm exec oxfmt --write packages/cli/package.json packages/control-plane/package.json packages/docs-config/package.json packages/docs-theme/package.json packages/docs-transforms/package.json packages/cli/assets/public-package-versions.json`

**Step 4: Close the associated backlog item**

Run:
`pnpm run cli -- backlog archive BL-260827-correct-scope-and-adoption --summary "Corrected PJM migration adoption semantics and made scoped pack diagnostics provider-aware, attributable, and fault-tolerant."`

Inspect and stage the moved archived item, `backlog/completed.md`, and the
regenerated `backlog/index.md`. Verify the generated lifecycle state with
`pnpm run cli -- pjm doctor --json`; do not hand-edit those lifecycle changes.

**Step 5: Verify**

Run:
`pnpm release:check-versions && pnpm release:validate`

Expected: both version and public-package dry-run validation pass.

**Step 6: Commit**

`git commit -m "chore(p04-t01): bump scoped diagnostics release"`

### Task p04-t02: Run the complete repository gate sequence

**Files:**

- Modify only if verification exposes a bounded defect: files owned by the
  failing phase/task above.
- Record results during root bookkeeping:
  `.oat/projects/shared/scope-adoption-diagnostics/implementation.md`

**Step 1: Check integrated focused behavior**

Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/pjm src/commands/tools/shared/pack-inventory.test.ts src/commands/doctor/index.test.ts src/commands/status/index.test.ts src/commands/sync/index.test.ts src/commands/commands.integration.test.ts src/e2e/workflow.test.ts src/commands/tools/tool-pack-lifecycle.integration.test.ts src/commands/init/tools/shared/bundle-consistency.test.ts`

Expected: all project-focused tests pass after merging p01-p03.

**Step 2: Run CI gates in exact order with explicit exit codes**

Run each command separately, capture its complete log, and record the command's
own exit code:

1. `pnpm check`
2. `pnpm type-check`
3. `pnpm test`
4. `pnpm build`
5. `pnpm run check:skill-bumps`
6. `git fetch origin main && pnpm release:check-versions`
7. `pnpm release:validate`
8. `pnpm build:docs`

Expected: every command exits 0. Do not infer success through a trailing pager
or filter.

**Step 3: Verify repository hygiene**

Run: `git diff --check && git status --short`

Expected: no whitespace errors and only intentional project bookkeeping is
uncommitted.

**Step 4: Commit**

If verification required a bounded source correction, commit it under the
originating task's next stable fix ID and re-run every affected gate. Root then
records the final evidence in implementation bookkeeping with:

`git commit -m "chore(p04-t02): record diagnostics verification"`

**Phase 4 Verification:** The focused suite and all eight repository gates pass
at the final reviewed head.

## Reviews

| Scope  | Type     | Status   | Date       | Artifact                                             | Reviewed Head | Invocation | Gate Target |
| ------ | -------- | -------- | ---------- | ---------------------------------------------------- | ------------- | ---------- | ----------- |
| p01    | code     | pending  | -          | -                                                    | -             | -          | -           |
| p02    | code     | pending  | -          | -                                                    | -             | -          | -           |
| p03    | code     | pending  | -          | -                                                    | -             | -          | -           |
| p04    | code     | pending  | -          | -                                                    | -             | -          | -           |
| final  | code     | pending  | -          | -                                                    | -             | -          | -           |
| spec   | artifact | pending  | -          | -                                                    | -             | -          | -           |
| design | artifact | pending  | -          | -                                                    | -             | -          | -           |
| plan   | artifact | passed   | 2026-08-27 | `reviews/artifact-plan-review-2026-08-27T215450Z.md` | -             | -          | -           |
| plan   | artifact | received | 2026-08-27 | `reviews/artifact-plan-review-2026-08-27T221042Z.md` | -             | -          | -           |

Status progression: `pending` → `received` → `fixes_added` →
`fixes_completed` → `passed`.

## Implementation Complete

**Summary:**

- Phase 1: 2 tasks - PJM migration adoption semantics
- Phase 2: 3 tasks - provider-aware, attributable, fault-tolerant diagnostics
- Phase 3: 2 tasks - production-realistic test-quality ratchets
- Phase 4: 2 tasks - lockstep versions and integrated release verification

**Total: 9 tasks**

Implementation is not started. Completion requires all nine tasks, phase/final
reviews, and the complete repository gate sequence.

## References

- Discovery: `discovery.md`
- Associated backlog item:
  [`BL-260827-correct-scope-and-adoption`](../../../repo/pjm/backlog/items/BL-260827-correct-scope-and-adoption.md)
- Source follow-up inventory:
  `../user-scope-tool-packs/implementation.md#known-deferred-work`
- Source final review:
  `../user-scope-tool-packs/reviews/final-review-2026-08-27T174707Z.md`
