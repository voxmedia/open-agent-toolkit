---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-08-30
oat_phase: plan
oat_phase_status: complete
oat_plan_parallel_groups: []
oat_phase_review_gate: false
oat_plan_hill_phases: [p04]
oat_auto_review_at_hill_checkpoints: true
oat_plan_source: quick
oat_import_reference: null
oat_import_source_path: null
oat_import_provider: null
oat_generated: false
oat_template: false
---

# Implementation Plan: Scope and Adoption Diagnostics

> Execute this plan using `oat-project-implement`. Run p01-p04 sequentially in
> this visible worktree so the diagnostics slice can merge before the broader
> scope/provider project begins implementation.

**Goal:** Correct the remaining PJM adoption, provider reachability, shared
ownership, inventory-failure, output, and test-quality defects from the
user-scope tool-pack project.

**Architecture:** Preserve the canonical PJM adoption resolver and PR #240's
content-aware pack inventory as the authorities. Thread one narrow,
config-aware provider-materialization capability into inventory, then keep
`doctor` and `status` as renderers of the same diagnostic model. Do not define
the umbrella project's broader provider/scope/catalog state model here.

**Tech Stack:** TypeScript ESM, Commander, Vitest, pnpm workspaces, Turborepo,
oxfmt, and Fumadocs Markdown.

**Commit Convention:** `{type}({task-id}): {description}`

## Current-Main Revalidation (2026-08-30)

Revalidated from clean `origin/main` at `5d684ba97` against PR #240
(`cd07d72e5`), PR #242 (`ce7c3225d`), and the active
`tool-pack-scope-provider-truthfulness` discovery dossier.

Classification key: **1** still required unchanged; **2** still required with
current-main adaptation; **3** already satisfied by PR #240/#242; **4**
transferred to the scope/provider umbrella.

| Task    | Class | Revalidation result                                                                                                                                           |
| ------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| p01-t01 | 1     | The migration core still gates on `projectManagementEnabled`; neither PR touched PJM migration.                                                               |
| p01-t02 | 1     | The public command still reads project-pack intent instead of resolving adoption plus legacy evidence.                                                        |
| p02-t01 | 2     | Preserve PR #240's content/seed inventory and distinguish native provider materialization from PR #242's loaded → user → project canonical instruction reads. |
| p02-t02 | 2     | Replace the current per-pack shared-owner post-pass with attribution based on the complete cross-pack inventory/intent set.                                   |
| p02-t03 | 2     | Adapt to PR #240's current status/doctor report shapes while adding structured inventory availability and collision-free human rendering.                     |
| p03-t01 | 2     | The quality defect remains; preserve PR #242's bundled-contract reference aggregation while removing or re-scoping unreachable assertions.                    |
| p03-t02 | 1     | The impossible fixture, joined-scope blind spot, and pre-`try` global mutations remain unchanged.                                                             |
| p04-t01 | 2     | PRs #240/#242 advanced the release floor to `0.2.47`; choose a fresh version above current `origin/main` only after implementation.                           |
| p04-t02 | 1     | The focused and eight-step integrated verification remain correct and required on the final current-main implementation.                                      |

No complete task is class 3 or class 4. The transferred work is broader scope
inside and around p02-t01, not a retained task: provider × scope × content-type
state, provider projection and runtime catalog visibility, collection-directory
symlinks, restart guidance, `AGENTS.md` behavior, picker truthfulness, and
dispatch provenance all remain owned by `tool-pack-scope-provider-truthfulness`.

## Ownership Boundary and Merge Coordination

- This project owns PJM migration adoption semantics, narrow provider-aware
  user-agent materialization diagnostics, shared-owner attribution,
  inventory-failure rendering, doctor delimiter safety, and the two targeted
  test-quality repairs.
- PR #242's loaded → user → project resolver locates canonical role
  instructions. It does not prove native provider materialization or runtime
  catalog visibility and must never be suppressed or redefined by this project.
- p02-t01 may add only a narrow caller-supplied capability describing whether
  active config-aware Codex/Cursor adapters materialize the bundled managed
  role files. It must not add the umbrella's provider state vocabulary,
  projection model, restart state, catalog probe, or dispatch semantics.
- `pack-inventory.ts`, its tests, doctor/status, and tool-pack docs are future
  shared-file conflicts. Merge this diagnostics slice first; the umbrella must
  rebase onto these renderer and input seams before it begins implementation.
- Shared-owner and inventory-failure behavior remain this project's ownership.
  The umbrella may consume or supersede their inputs later but must not
  duplicate the renderer corrections.
- Release manifests and PJM backlog indexes are final fan-in surfaces. Do not
  run a concurrent umbrella release bump or archive this backlog item twice.
- The separate `migrate-the-legacy-pjm` cleanup landed as PR #244 before this
  project and owns only the generated-pointer classification/test correction
  in `packages/cli/src/commands/pjm/doctor.ts`. Diagnostics integrated that
  result at `ac380219d` without a source conflict, reran PJM doctor cleanly, and
  did not duplicate the cleanup's layout-classification change.
- The resulting merge order is PJM cleanup → scope-adoption diagnostics →
  tool-pack scope/provider truthfulness. No direct source overlap is currently
  planned: p02 writes `commands/doctor/index.ts` and `commands/status/index.ts`,
  not `commands/pjm/doctor.ts`. Flag and reconcile any broader cleanup diff
  before diagnostics merges.

## Parallelism

The implementation is sequential (`oat_plan_parallel_groups: []`). Although
p01-p03 retain disjoint primary write sets, sequential execution avoids hidden
phase worktrees, keeps every current-main adaptation visible in this Codex
worktree, and produces one diagnostics baseline for the umbrella to consume.
Phase p04 remains last because it must select versions above freshly fetched
`origin/main` and run the complete repository gate sequence.

## Phase 1: PJM Migration Adoption Semantics

**Goal:** Remove project-pack intent from migration eligibility and pin the
canonical four-state adoption behavior.

### Task p01-t01: Make the migration core and caller adoption-aware

**Files:**

- Modify: `packages/cli/src/commands/pjm/migrate.ts`
- Modify: `packages/cli/src/commands/pjm/migrate.test.ts`
- Modify: `packages/cli/src/commands/pjm/index.ts`
- Modify: `packages/cli/src/commands/pjm/index.test.ts`

**Step 1: Write tests (RED)**

Replace the `projectManagementEnabled` fixture contract with an explicit
adoption input. At the command boundary, assert that adoption is resolved once
and supplied to the migration core instead of pack intent. Pin zero writes and
an actionable skip reason for states that are not migration-eligible while
keeping dry-run/apply behavior unchanged for eligible repositories.

Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/pjm/migrate.test.ts src/commands/pjm/index.test.ts`

Expected: fail because the core still gates on project pack intent.

**Step 2: Implement (GREEN)**

Remove `projectManagementEnabled` from `PjmMigrationOptions`. Accept the
canonical adoption decision supplied by the command adapter. In `index.ts`,
resolve adoption once through
`resolvePjmAdoption({ projectRoot, repoRoot })`, pass it into the migration
core, and remove the migration-only `readOatConfig` dependency and stale caller
field in the same commit. Preserve `already-migrated`, dry-run, apply, and
zero-write boundaries, and report adoption-oriented recovery text rather than
pack-install text. Do not yet broaden legacy-source eligibility; p01-t02 owns
that matrix.

**Step 3: Format**

Run:
`pnpm exec oxfmt --write packages/cli/src/commands/pjm/migrate.ts packages/cli/src/commands/pjm/migrate.test.ts packages/cli/src/commands/pjm/index.ts packages/cli/src/commands/pjm/index.test.ts`

**Step 4: Verify**

Run the focused test command again, then run `pnpm type-check`; expected: the
core and its only production caller both pass tests and type checking in this
commit.

**Step 5: Commit**

`git commit -m "fix(p01-t01): make PJM migration adoption-aware"`

### Task p01-t02: Expand migration eligibility across adoption and legacy evidence

**Files:**

- Modify: `packages/cli/src/commands/pjm/index.ts`
- Modify: `packages/cli/src/commands/pjm/index.test.ts`
- Modify if the canonical state contract needs a bounded correction:
  `packages/cli/src/commands/pjm/adoption.ts`
- Modify with any adoption correction:
  `packages/cli/src/commands/pjm/adoption.test.ts`
- Modify: `apps/oat-docs/docs/cli-utilities/tool-packs.md`

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

Expected: fail because the adoption-aware boundary from p01-t01 does not yet
inventory legacy evidence or implement the full matrix.

**Step 2: Implement (GREEN)**

Inventory recognized legacy sources before any write and expand the
adoption-aware command/core seam from p01-t01 to implement the matrix above:
adoption state alone neither authorizes nor blocks a legacy migration. Keep the
four-state decision explicit; do not infer adoption from user capability
placement or scoped pack intent. Replace the documented temporary
`tools.project-management: true` prerequisite and version-specific workaround
with the adoption-plus-legacy-evidence contract.

**Step 3: Format**

Run:
`pnpm exec oxfmt --write packages/cli/src/commands/pjm/index.ts packages/cli/src/commands/pjm/index.test.ts packages/cli/src/commands/pjm/adoption.ts packages/cli/src/commands/pjm/adoption.test.ts apps/oat-docs/docs/cli-utilities/tool-packs.md`

**Step 4: Verify**

Run the focused test command again; expected: pass with zero-write assertions
for every non-eligible state. Then run `pnpm check`; expected: the updated
migration documentation and repository checks pass.

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
Codex/Cursor materialization supplies them. Assert that PR #242's canonical
loaded → user → project instruction-read availability does not suppress a
native-materialization diagnostic. Verify redacted paths and identical
human/JSON affected-agent sets in doctor and status.

Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/tools/shared/pack-inventory.test.ts src/commands/doctor/index.test.ts src/commands/status/index.test.ts`

Expected: fail because `USER_SCOPE_MANAGED_AGENT_FILES` is always excluded.

**Step 2: Implement (GREEN)**

Resolve adapters through `getConfigAwareAdapters` using the applicable scope's
resolved sync config (including `resolveUserSyncConfig` for user scope), then
thread one explicit, caller-supplied managed-role materialization capability
into inventory from both doctor and status. Keep inventory deterministic and
injectable; do not re-detect providers inside inventory and do not expand
user-scope sync content types. Preserve PR #240's content-aware comparison,
generated-seed, and retained-override semantics. Update diagnostic/detail/docs
wording to describe missing native provider materialization without claiming
that PR #242's canonical instruction reads or runtime catalog visibility are
absent.

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
placement evidence. Preserve PR #240's `current` versus retained `present`
seed semantics in every fixture.

Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/tools/shared/pack-inventory.test.ts src/commands/doctor/index.test.ts src/commands/status/index.test.ts`

Expected: fail on the existing arbitrary non-owner attribution.

**Step 2: Implement (GREEN)**

Use manifest shared-owner identity plus the complete already-computed
cross-pack inventory/intent set to select applicable owners. Replace the
per-pack post-pass rather than trying to repair attribution after rendering.
Emit an observation once with precise owner context, or suppress it when no
installed/intended owner makes it actionable. Preserve the rule that shared
assets alone never establish placement.

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

Mirror doctor's bounded inventory guard in `collectPackReport`, extend PR
#240's current status pack-report shape with an explicit availability
diagnostic, retain unavailable-scope information, and preserve structured JSON.
Render human findings and fixes as distinct entries instead of joining them
with a delimiter that can collide with finding detail; keep every recovery
command copy-pasteable.

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
coverage and user-facing lifecycle assertions. Preserve PR #242's
`readBundledSkillContract` aggregation of `oat-project-implement` plus its
reference files.

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
current `origin/main` (the revalidation floor is `0.2.47`), apply it to all five
package manifests, and keep the four-entry bundled public-package version map
in lockstep. Do not assume `0.2.48` remains available after the required fetch.

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
- Modify for the operator-approved bounded recovery:
  `packages/cli/vitest.config.ts`
- Record results during root bookkeeping:
  `.oat/projects/shared/scope-adoption-diagnostics/implementation.md`

**Approved recovery boundary (2026-08-30):** The repeated full-suite failures
proved that Git-heavy fixtures exceed their five-second limits only under
workspace concurrency while the same affected files pass together outside that
load. Adjust the CLI test runner's worker concurrency in this task so the exact
`pnpm test` gate is stable. Do not change production code, individual or global
test timeouts, test assertions, or the broader project lifecycle fixtures. The
exact unmodified gate command must exit 0 before this recovery is accepted.

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

### Task p04-t03: (review) Align terminal review summaries

**Files:**

- Modify: `.oat/projects/shared/scope-adoption-diagnostics/plan.md`
- Modify: `.oat/projects/shared/scope-adoption-diagnostics/implementation.md`
- Modify: `.oat/projects/shared/scope-adoption-diagnostics/state.md`

**Step 1: Understand the issue**

Final review finding `m1`: current summary prose still reports the completed
p04 review as pending even though the Reviews ledger records it as passed.
Locations: `state.md:52`, `plan.md:663`, and `implementation.md:338` at the
reviewed head.

**Step 2: Implement fix**

Align only the current terminal summaries and progress rollups with the
authoritative Reviews ledger: p04 passed, the final review fix is complete, and
only configured closeout gates plus approval remain. Thomas explicitly waived
a redundant second review on 2026-08-30 after the artifact-only alignment.
Preserve historical orchestration snapshots unchanged.

**Step 3: Verify**

Run:

```bash
if {
  sed -n '/^## Implementation Task Summary$/,/^## References$/p' \
    .oat/projects/shared/scope-adoption-diagnostics/plan.md
  sed -n '/^## Progress Overview$/,/^## Current-Main Plan Revalidation$/p; /^## Phase 4:/,/^## Orchestration Runs$/p; /^## Final Summary (for PR\/docs)$/,$p' \
    .oat/projects/shared/scope-adoption-diagnostics/implementation.md
  sed -n '/^## Current Phase$/,$p' \
    .oat/projects/shared/scope-adoption-diagnostics/state.md
} | rg -n "p04 and final reviews pending|awaiting p04 and final review|p04 and final reviews remain|final re-review|re-review the final fix range"; then
  exit 1
fi
```

Expected: no terminal-summary match. Historical orchestration snapshots are
explicitly outside this check and remain unchanged.

Run: `pnpm exec oxfmt --check .oat/projects/shared/scope-adoption-diagnostics/{plan.md,implementation.md,state.md} && git diff --check`

Expected: formatting and whitespace checks pass.

**Step 4: Commit**

```bash
git add .oat/projects/shared/scope-adoption-diagnostics/plan.md \
  .oat/projects/shared/scope-adoption-diagnostics/implementation.md \
  .oat/projects/shared/scope-adoption-diagnostics/state.md
git commit -m "fix(p04-t03): align terminal review summaries"
```

## Reviews

| Scope  | Type     | Status          | Date       | Artifact                                              | Reviewed Head                            | Invocation | Gate Target                   |
| ------ | -------- | --------------- | ---------- | ----------------------------------------------------- | ---------------------------------------- | ---------- | ----------------------------- |
| p01    | code     | fixes_completed | 2026-08-30 | `reviews/p01-review-2026-08-30T220053Z.md`            | b30da4105b556f7dc40af57b82f58f7285644b34 | manual     | -                             |
| p01    | code     | passed          | 2026-08-30 | `reviews/p01-review-2026-08-30T220913Z.md`            | 5f6e5c7019944ae7fa602367b9427c8713935cd5 | manual     | -                             |
| p02    | code     | passed          | 2026-08-30 | `reviews/p02-review-2026-08-30T224248Z.md`            | 496b3759e24dd9c4229e932d53194322924aaed8 | manual     | -                             |
| p03    | code     | passed          | 2026-08-30 | `reviews/p03-review-2026-08-30T225845Z.md`            | 2c108e71372ff9e7f08741512cc6818523ae300d | manual     | -                             |
| p04    | code     | passed          | 2026-08-30 | `reviews/archived/p04-review-2026-08-31T002514Z.md`   | 89a74da25cfb8e870b74645d760feeb6bb03996a | manual     | -                             |
| final  | code     | passed          | 2026-08-30 | `reviews/archived/final-review-2026-08-31T003300Z.md` | 9f64bd345eba013b260a1983f9cbabce0027a539 | auto       | -                             |
| spec   | artifact | pending         | -          | -                                                     | -                                        | -          | -                             |
| design | artifact | pending         | -          | -                                                     | -                                        | -          | -                             |
| plan   | artifact | passed          | 2026-08-27 | `reviews/artifact-plan-review-2026-08-27T215450Z.md`  | -                                        | -          | -                             |
| plan   | artifact | passed          | 2026-08-27 | `reviews/artifact-plan-review-2026-08-27T221042Z.md`  | -                                        | -          | -                             |
| plan   | artifact | fixes_completed | 2026-08-30 | -                                                     | -                                        | auto       | oat-reviewer-gpt-5-6-sol-high |

Status progression: `pending` → `received` → `fixes_added` →
`fixes_completed` → `passed`.

The final reviewer returned PASS for product and release behavior with only
artifact-alignment finding `m1`. After `p04-t03` aligned the current summaries,
Thomas explicitly waived a redundant second review on 2026-08-30; the exact
final event above therefore advances to `passed`.

The 2026-08-30 current-main review used the initial structured review plus two
rewrite/re-dispatch retries. The last review found one Important atomicity gap:
p01-t01 removed a core API field while deferring its caller to p01-t02. The
task boundary above now updates and type-checks the core and caller together.
The automatic retry bound was exhausted before a clean re-review, so this row
remains `fixes_completed`, not `passed`. Thomas explicitly approved proceeding
with the corrected plan on 2026-08-30; that override does not rewrite the
review result.

## Implementation Task Summary

**Summary:**

- Phase 1: 2 tasks - PJM migration adoption semantics
- Phase 2: 3 tasks - provider-aware, attributable, fault-tolerant diagnostics
- Phase 3: 2 tasks - production-realistic test-quality ratchets
- Phase 4: 3 tasks - release verification and final review alignment

**Total: 10 tasks**

All 10 implementation tasks are complete. Current-main revalidation retained all
nine original tasks, adapting five without expanding into umbrella ownership;
PR #244's cleanup-first dependency is integrated. A bounded p04 recovery capped
CLI Vitest at four workers and made the exact `pnpm test` gate pass without
changing timeouts or assertions. The initial final review passed product and
release behavior and produced only `m1`; `p04-t03` resolved it, and Thomas
explicitly waived a redundant second review on 2026-08-30. Configured closeout
gates and approval remain.

## References

- Discovery: `discovery.md`
- Associated backlog item:
  [`BL-260827-correct-scope-and-adoption`](../../../repo/pjm/backlog/archived/BL-260827-correct-scope-and-adoption.md)
- Archived source-project summary and follow-up inventory:
  `../../../repo/reference/project-summaries/20260827-user-scope-tool-packs.md`
- Revalidation baselines: PR #240 (`cd07d72e5`) and PR #242 (`ce7c3225d`)
- Coordinated umbrella:
  `../tool-pack-scope-provider-truthfulness/discovery.md`
