---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-09-11
oat_phase: plan
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

# Implementation Plan: Recon rework

> **Manually accepted and implementation-ready.** Three plan-review cycles
> completed on 2026-09-09, all received findings were applied, and Thomas accepted
> the corrected aggregate plan at the cycle cap. No fourth automated planning
> review is authorized.

**Goal:** Restore inexpensive evidence fan-out across harnesses with caller-owned
judgment, independently approved per-wave targets, and bounded conditional
escalation.

**Architecture:** A v2 manifest with per-wave effective targets and finite
conditional waves normalizes beside unchanged v1 evidence into the existing
ValidatedRun boundary. Pure routing/proposal helpers support the controller;
existing provider guidance and generic dispatch retain selection/launch ownership.

**Tech Stack:** Existing Node.js ESM skill scripts, Node test runner, TypeScript
CLI contract tests with Vitest, Markdown skills/docs, pnpm/Turborepo. No new runtime
dependencies or native launcher.

**Commit Convention:** `type(pNN-tNN): description`; every task is an atomic
commit with its exact write set staged.

## Planning Checklist

- [x] Confirmed HiLL checkpoints from `workflow.hillCheckpointDefault: final`
- [x] Set `oat_plan_hill_phases` in frontmatter
- [x] Evaluated phases for parallelism opportunities
- [x] Set `oat_plan_parallel_groups` in frontmatter

## Planning Status

- Discovery: captured and completed through the CLI validation boundary.
- Lightweight design: integrated into the accepted quick plan; its separate
  placeholder review row remains non-blocking in quick mode.
- This plan: 4 sequential phases, 9 tasks; no tasks started.
- Manual plan artifact review: all three cycles' findings are applied; Thomas
  manually accepted the corrected aggregate plan and the latest event is `passed`.
- Project dispatch policy: managed `high`, selected in project state.
- The configured quick-start gate is disabled for this project because the user
  explicitly closed the capped planning-review loop. No optional cross-runtime
  phase gate was selected. Built-in implementation reviews remain unchanged.
- Implementation HiLL is confirmed at `p04` only from the configured final-phase
  workflow default. Automatic lifecycle review at that checkpoint is enabled from
  workflow configuration. An empty checkpoint list would mean every phase, not
  "undecided."
- The low-cost policy describes recon workers **as product behavior**; it does
  not require implementing or reviewing this contract with an inadequate model.

## Before Implementation

The receiving agent must follow `handoff.md`: verify the worktree, load
`oat-project-implement`, confirm and write implementation HiLL checkpoints, and
begin at `p01-t01` under the managed `high` ceiling. Do not launch another
planning review or repeat discovery unless implementation reveals a substantive
product ambiguity.

Do not automatically merge the backlog-triage branch. Issue #274 is the scope
source; discover any canonical backlog record created by the separate triage
and link it without duplicating or claiming other wave-7 work.

For issue #274's "below-floor routing" criterion, use the reviewed interpretation
in `design.md`: deterministic validation covers the `classFloor` enum,
`taskClass`/`classFloor` consistency, and exact approved-versus-constructed target
identity. It deliberately does not infer model capability from selector names;
qualification remains owned by active provider guidance, the live catalog, and
the calling root. Reconcile the backlog against this recorded interpretation at
shipping closeout instead of claiming literal model-ranking validation.

## Parallelism

`oat_plan_parallel_groups: []` is deliberate. Phase 1 defines schema/decision
semantics; phase 2 consumes them in helpers, validation, and workflow fixtures;
phase 3 binds the resulting behavior to controller guidance and rendering;
phase 4 verifies the composed released assets.

Adjacent phases share `contracts.mjs`, recon fixtures/tests, packet contract
docs, or CLI skill pins. Their tests depend on predecessor behavior. Do not split
these phases into parallel implementation worktrees on the current design.
Read-only source inventories or evidence collection may be delegated independently.

## Common Execution Rules

All commands below run from the `recon-rework` repository root unless a command
sets a package working directory. Use the canonical source CLI via
`pnpm run --silent cli:source -- ...` after `pnpm run worktree:init` has built
workspace dependencies. Use `pnpm run cli -- ...` when asset rebundling is needed.

The documented file-scoped formatter is `pnpm exec oxfmt --write <paths>`,
derived from root `package.json`'s `format:fix` script. Each task supplies paths.
Format project tracking files changed by the task too:

```bash
pnpm exec oxfmt --write .oat/projects/shared/recon-rework/implementation.md .oat/projects/shared/recon-rework/state.md .oat/projects/shared/recon-rework/plan.md
```

Record test commands, exit codes, fixture/probe provenance, and outcome categories
in implementation.md. Do not mistake a filtered pipeline exit or replayed Turbo
log for an executed passing test. Scope file tests with `exec vitest run`, not
an ambiguous package script forwarding shortcut.

Keep the manifest's ten wave modes distinct from the worker role's closed seven-mode
assignment vocabulary. Map `redundant-gather` to `gather`;
`semantic-verification` and `redundant-verification` to `verify`; `adversarial`
and `contradiction-resolution` to `adversary`; and only `reconciliation` to
`reconcile`. The remaining modes keep their same-named worker assignments. This
project must not widen the worker vocabulary. A contradiction-resolution worker
seeks discriminating evidence; only the terminal reconciliation performs
ledger-producing synthesis.

For approval, evidence, and conditional guards preserve positive and negative
controls. For new v2-only fields, old-schema rejection is not the semantic negative
control: neutralize the new guard in a disposable tracked test experiment, prove
the test fails, restore the guard, and prove the valid control passes. Never leave
the guard neutralized or claim fake fixtures are live-provider evidence.

## Phase 1: Decision and versioned contract

### Task p01-t01: Record the intended division of labor and superseding decision

**Files:**

- Create: one CLI-generated decision record under `.oat/repo/reference/decisions/`.
- Modify: `DR-260831-approval-bound-homogeneous.md`,
  `DR-260904-remove-dispatch-receipt-chain.md`, generated decision index.
- Modify: project discovery/design only if the received review established a
  technical correction; preserve the user intent and review history.

**Implement:**

1. Read decision guidance/index and load `oat-pjm-decision`. Run
   `pnpm run --silent cli:source -- pjm doctor --json`; capture its complete JSON
   and exit code in a `mktemp -d` file before any decision write, and inspect
   adoption. Unrelated backlog-ledger warnings are not project approval.
2. Record cheap evidence acquisition, caller judgment, economical per-wave
   selection, explicit approval, predeclared bounded escalation, and the distinction
   between intended targets and actual-launch proof.
3. Supersede the homogeneous-per-run decision. Amend both singular-selection
   wording and its reaffirmation in DR-260904; preserve the removal of unsupported
   receipts and prior evidence/publication invariants.
4. Cite DR-260719-separate-recon-authority-from and DR-260719-keep-final-judgment.
   Do not rewrite those decisions as though final reviewers became cheap workers.
5. Generate the record ID and index using their owning commands; do not hand-name
   a supposedly accepted decision.

**Format:** `pnpm exec oxfmt --write .oat/repo/reference/decisions/DR-260831-approval-bound-homogeneous.md .oat/repo/reference/decisions/DR-260904-remove-dispatch-receipt-chain.md .oat/repo/reference/decisions/index.md`, plus the exact new decision path returned by the CLI and changed project artifacts.

**Verify:** Run the governing commands explicitly:

```bash
doctor_evidence_dir=$(mktemp -d)
pnpm run --silent cli:source -- pjm doctor --json > "$doctor_evidence_dir/before.json"
doctor_before_exit=$?
pnpm run --silent cli:source -- decision new "Restore economical recon routing and caller-owned judgment" --status accepted --context "Issue #274 requires economical per-wave recon without weakening approval or evidence boundaries." --decision "Use independently selected and approved per-wave targets, keep final judgment in the caller, and permit only predeclared bounded escalation." --consequences "Supersede homogeneous run-wide selection while preserving the prohibition on unsupported launch receipts." --json
pnpm run --silent cli:source -- decision regenerate-index
pnpm run --silent cli:source -- pjm doctor --json > "$doctor_evidence_dir/after.json"
doctor_after_exit=$?
```

The `decision new` command is the task's creation action and runs exactly once;
capture its returned path for formatting and verification. Preserve the complete
pre-write doctor result and compare its stable warning identities/categories and
adoption state with the complete post-write result. The accepted baseline is the
inherited completed-ledger warning set with exit 1. The task passes when those
warnings are unchanged apart from the new accepted record appearing in the
generated index, its supersession links resolve, and the receipt boundary remains
intact. Record inherited warnings separately rather than relabeling them green.

**Commit:** `docs(p01-t01): restore economical recon and caller-owned judgment`.

### Task p01-t02: Add a v2 manifest shape with lossless v1 normalization

**Files:**

- Modify: `.agents/skills/recon/scripts/lib/contracts.mjs`,
  `scripts/validate-packet.mjs`, `references/packet-contract.md`.
- Create: `.agents/skills/recon/scripts/lib/routing.mjs`,
  `tests/routing-contracts.test.mjs`.
- Modify: `.agents/skills/recon/tests/fixtures/packet-fixture.mjs`,
  `tests/packet-validation.test.mjs`, `tests/integrity-contracts.test.mjs`.

**Implement:**

1. Retain a v1 fixture path with its original flat execution fields and fingerprint
   algorithm. Compute its approval fingerprint once against the pre-change
   production contract and store that byte-exact literal string in the fixture;
   compatibility assertions must never recompute the expected literal through the
   production helper under test. Do not convert every fixture to v2 and lose
   compatibility evidence.
2. Replace the global version gate with a closed kind/version dispatch:
   manifest 1/2; unchanged evidence kinds 1. Reject other combinations.
3. Implement the reviewed v2 execution shape from design: inherited full target,
   whole-target wave overrides, class/floor/reason, conditions, approval.
4. Add pure effective-wave resolution. Validate original wire shape and original
   fingerprint before normalization; preserve original artifact byte digests.
5. Keep v1 semantics intact, including previously legal expensive homogeneous
   selections. V1 compatibility must not retroactively demand v2 rationale fields.
6. New v2 fields stay closed and nullable effort is explicit unsupported/no-request
   behavior, never an unknown-value fallback.
7. Thread the normalized routing view into ValidatedRun without creating a second
   evidence-validation boundary or permitting the renderer to parse raw data.

**Format:**

```bash
pnpm exec oxfmt --write .agents/skills/recon/scripts/lib/contracts.mjs .agents/skills/recon/scripts/lib/routing.mjs .agents/skills/recon/scripts/validate-packet.mjs .agents/skills/recon/references/packet-contract.md .agents/skills/recon/tests/fixtures/packet-fixture.mjs .agents/skills/recon/tests/routing-contracts.test.mjs .agents/skills/recon/tests/packet-validation.test.mjs .agents/skills/recon/tests/integrity-contracts.test.mjs
```

**Verify:**

```bash
node --test .agents/skills/recon/tests/routing-contracts.test.mjs .agents/skills/recon/tests/packet-validation.test.mjs .agents/skills/recon/tests/integrity-contracts.test.mjs
```

Controls: the unchanged v1 fixture matches and validates with its pinned literal
fingerprint; changing one v1 execution field while retaining that literal is
rejected; v2 manifest/v1 evidence accepted; unknown versions and v2 keys in v1
rejected; full-target inheritance exact; axis/fingerprint mutation rejected.
Temporary unsupported-condition publication may remain refused until phase 2; do
not ship or label an incomplete intermediate state ready.

**Commit:** `feat(p01-t02): version recon per-wave execution contracts`.

## Phase 2: Proposal, conditional execution, and integration

### Task p02-t01: Implement economical routing preview and exact target checking

**Files:**

- Modify: `.agents/skills/recon/scripts/lib/routing.mjs`.
- Create: `.agents/skills/recon/scripts/prepare-routing.mjs`,
  `tests/routing-preview.test.mjs`.
- Modify: `.agents/skills/recon/tests/routing-contracts.test.mjs`.

**Implement:**

1. Define and exhaustively test bounded economical defaults for all ten wave modes.
   Require explicit selection rationale; do not hard-code models or provider prices.
2. Implement the draft proposal CLI described in design. Print per-wave
   assignments, counts, effective target axes, class/floor, rationale, conditions,
   and worst-case limits in Markdown/JSON.
   Keep preview and exact target-check functions in `routing.mjs`; make
   `prepare-routing.mjs` a thin CLI adapter over the same production logic.
3. Preview may accept missing approval but may not publish, write approval, or
   launch. Keep that structural path separate from packet validation.
4. Add approved-wave target checking: require valid approval, known wave, exact
   supported axes, and no normalization of opaque selectors.
5. Include reasons for stronger selection and unsupported controls. The tool
   checks structure/identity, not model capability from names or semantic adequacy.
6. Test directly and through subprocess CLI output, including malformed inputs
   and nonzero exits.

**Format:**

```bash
pnpm exec oxfmt --write .agents/skills/recon/scripts/lib/routing.mjs .agents/skills/recon/scripts/prepare-routing.mjs .agents/skills/recon/tests/routing-preview.test.mjs .agents/skills/recon/tests/routing-contracts.test.mjs
```

**Verify:**

```bash
node --test .agents/skills/recon/tests/routing-preview.test.mjs .agents/skills/recon/tests/routing-contracts.test.mjs
```

Controls: cheap defaults across modes; the terminal reconciliation's independently
selected stronger target does not alter gather targets; absent effort is explicit;
post-approval target change is rejected; declining or editing a preview produces
zero launches. Use synthetic opaque selectors and label them as preservation
fixtures, not qualified live models.

**Commit:** `feat(p02-t01): preview economical recon wave selections`.

### Task p02-t02: Enforce finite conditional escalation and outcome accounting

**Files:**

- Modify: `.agents/skills/recon/scripts/lib/contracts.mjs`,
  `scripts/lib/routing.mjs`, `scripts/validate-packet.mjs`,
  `references/packet-contract.md`.
- Create: `.agents/skills/recon/tests/conditional-routing.test.mjs`.
- Modify: `.agents/skills/recon/tests/fixtures/packet-fixture.mjs`,
  `tests/integrity-contracts.test.mjs`.

**Implement:**

1. Implement predeclared condition-to-wave binding, forward-only dependencies,
   unique identities/outputs, single activation, and profile hard-cap accounting.
   Conditions can activate an evidence-producing `contradiction-resolution` wave,
   never a second terminal reconciliation.
2. Validate finalized v2 conditional dispositions and artifact references through
   the existing digest/trust-root machinery.
3. Triggered conditional lanes need complete outcomes or material PASS\_\* gaps;
   not-triggered lanes cannot contribute artifacts or achieved passes.
4. Preserve required-profile checks independently of conditional annotations.
   An unresolved condition cannot erase missing required evidence.
5. Conditions require completed predecessor evidence and cannot use accepted
   failure, cancellation, timeout, or missing output to launch a replacement.
6. Include conditions/targets/limits in the approval fingerprint. Outcomes remain
   outside immutable approval and are labeled root-recorded dispositions.
7. Add executable checks of concrete typed predicate evidence where possible;
   explicitly retain root judgment where semantic necessity is not machine-proven.
8. Treat `reconciliation-needs-judgment` as a controller escalation outcome, not
   an evidence-search predicate. If foreseeable, select an adequate target for the
   one terminal reconciliation before approval. If discovered after approval,
   preserve prior work, record an unresolved/out-of-envelope gap, and require
   renewed user approval or a new envelope/run; do not mutate the target, launch a
   second reconciliation, or substitute contradiction search for synthesis.
9. Preserve the validator's structured-error contract for hostile condition
   arrays: repeated null or primitive entries must return categorical errors rather
   than throw, and every `afterWaveIds` entry must be a non-empty string.

**Format:**

```bash
pnpm exec oxfmt --write .agents/skills/recon/scripts/lib/contracts.mjs .agents/skills/recon/scripts/lib/routing.mjs .agents/skills/recon/scripts/validate-packet.mjs .agents/skills/recon/references/packet-contract.md .agents/skills/recon/tests/conditional-routing.test.mjs .agents/skills/recon/tests/fixtures/packet-fixture.mjs .agents/skills/recon/tests/integrity-contracts.test.mjs
```

**Verify:**

```bash
node --test .agents/skills/recon/tests/conditional-routing.test.mjs .agents/skills/recon/tests/integrity-contracts.test.mjs .agents/skills/recon/tests/packet-validation.test.mjs
```

Negative controls cover a valid old conditional omission fixture where applicable,
new guard neutralization, repeated malformed condition entries, invalid
`afterWaveIds`, unknown/cyclic rules, unapproved stronger targets, activated missing
outputs, skipped artifacts, and cap overflow. A complete valid conditional follow-up
passes; a failed accepted predecessor remains failed. The pinned v1 fingerprint
literal remains byte-identical after v2 fingerprint inputs gain conditions, while
otherwise-identical v2 manifests with and without conditions produce different
fingerprints.

**Commit:** `feat(p02-t02): validate bounded recon escalation outcomes`.

### Task p02-t03: Exercise complete profiles across provider-shaped dispatch controls

**Files:**

- Modify: `.agents/skills/recon/tests/helpers/fake-recon-run.mjs`,
  `tests/workflow.integration.test.mjs`, `tests/fixtures/packet-fixture.mjs`.
- Modify: `.agents/skills/recon/tests/review-brief.test.mjs` only for explicit
  mixed-version producer/consumer compatibility controls.

**Implement:**

1. Make the fake workflow reuse the production routing/preview/check logic, either
   by importing the functions from `routing.mjs` or invoking the thin CLI through a
   subprocess. It must not contain a separate fake implementation of selection
   enforcement.
2. Exercise quick, standard, and thorough profiles with v1 and v2 manifests.
   Cover redundant/conditional modes, not only map plus gather. For standard and
   thorough, the optional contradiction-resolution result feeds the same mandatory
   terminal reconciliation when triggered; the non-triggered branch still has
   exactly that one terminal reconciliation.
3. Model Claude controls with no separately requested effort, Codex effort as an
   independent axis, and Cursor opaque selectors. Unsupported requested controls
   stop before acceptance. No provider SDK or live credential is required.
4. Retain existing authority, pre-start fallback, accepted failure/cancellation,
   and no-dispatch-directory tests.
5. Assert cheap map/gather/check/challenge remains unchanged when a stronger
   terminal reconciliation and optional contradiction-resolution evidence pass are
   approved, both when the evidence pass activates and when it does not.
6. Show the single envelope before any launch; user refusal yields no calls.
   Fingerprint mutation or constructed-target mismatch refuses affected work.
7. Describe the fixture honestly: it proves production helper and control-flow
   behavior, not actual native runtime launch identity.
8. Verify `contradiction-resolution` composes with the production adversary brief,
   worker input restrictions, and packet validator; keep `reconciliation` mapped
   only to `reconcile`. Run both complete v2 branches through production packet
   validation and require a second/shadow reconciliation result to be rejected.

**Format:**

```bash
pnpm exec oxfmt --write .agents/skills/recon/tests/helpers/fake-recon-run.mjs .agents/skills/recon/tests/workflow.integration.test.mjs .agents/skills/recon/tests/fixtures/packet-fixture.mjs .agents/skills/recon/tests/review-brief.test.mjs
```

**Verify:**

```bash
node --test .agents/skills/recon/tests/workflow.integration.test.mjs .agents/skills/recon/tests/review-brief.test.mjs
```

Preserve the exact generated fixture and invocation/output log for representative
v1 and v2 successful and partial runs. If later real-provider acceptance is
requested, load the active provider reference, propose exact worker targets and
limits, obtain approval, and record observations separately from fixture results.

**Commit:** `test(p02-t03): cover recon routing across profile and harness shapes`.

## Phase 3: Controller, shared guidance, and consumer output

### Task p03-t01: Align controller and worker guidance with economical evidence work

**Files:**

- Modify: `.agents/skills/recon/SKILL.md`,
  `references/profiles.md`, `references/worker-contract.md`,
  `references/packet-contract.md`.
- Modify: `.agents/skills/subagent-orchestration/SKILL.md`,
  `references/model-selection-principles.md`.
- Modify: `.agents/agents/recon-worker.md` for the reviewed assignment contract.
- Modify: `.agents/skills/recon/tests/skill-contract.test.mjs`,
  `packages/cli/src/validation/skills.test.ts`.

This remains one intentionally coupled task and commit: controller behavior,
shared classification guidance, the canonical worker contract, prose pins, and
the PR-scoped skill/role version bumps must move together to preserve the shared
contract at every commit boundary.

**Implement:**

1. Put confirmed intent near the opening. Name the responsibility split explicitly:
   the recon controller owns profile/routing/evidence flow; `subagent-orchestration`
   owns task-class and qualification guidance; `oat-dispatch-subagents` owns live
   target resolution and launch mechanics; and the calling agent owns scope,
   approval dialogue, sufficiency judgment, and conclusions. Replace all run-wide
   maximum and same-target-per-run rules with the production helper-backed per-wave
   workflow, and pin this ownership contract in `skill-contract.test.mjs`.
2. Link the complete mode policy; describe narrowing/escalation by actual task
   difficulty and preserve stronger capability for judgment-bearing work.
3. Load same-scope dependencies and exactly one active-harness selection/mechanics
   pair. Do not add a second named provider ladder or cross-harness effort mapping.
4. Make the complete proposal explicit before approval; show supported effort,
   model, reasoning mode, service tier, lane counts, rationale, and finite limits.
   Update the controller's manifest-preparation step to emit `schemaVersion: 2`
   with per-wave `target`, `taskClass`, `classFloor`, `selectionReason`, and
   `conditions`, and pin that writer contract in `skill-contract.test.mjs`.
5. Consume conditional outcomes, preserve accepted-failure rules, and require
   root assessment of contradictions and downstream sufficiency. Document the
   single-terminal topology and the separate handling of
   `reconciliation-needs-judgment`: pre-approval target selection when foreseeable,
   otherwise an explicit unresolved/out-of-envelope return for renewed approval.
6. Preserve quick supported assurance and standard/thorough independent typed
   review requirements. In `references/profiles.md`, document quick explicitly as
   an evidence packet for an intelligent consumer with no independent semantic
   pass by design, and pin that boundary in `skill-contract.test.mjs`. Model mix
   is not review independence.
7. Clarify shared classification without weakening final consequential reviewers.
   Do not rewrite the dispatch engine; if a concrete dependency change is proven
   necessary, return to the root with the exact scope before editing it.
8. Increment each modified canonical skill's metadata.version once for the PR,
   following the current SemVer convention. Update the role under its current
   version policy. Update the exact existing recon pins in
   `.agents/skills/recon/tests/skill-contract.test.mjs` and
   `packages/cli/src/validation/skills.test.ts`; do not invent a numeric pin in
   `tools/smoke`.

**Format:**

```bash
pnpm exec oxfmt --write .agents/skills/recon/SKILL.md .agents/skills/recon/references/profiles.md .agents/skills/recon/references/worker-contract.md .agents/skills/recon/references/packet-contract.md .agents/skills/subagent-orchestration/SKILL.md .agents/skills/subagent-orchestration/references/model-selection-principles.md .agents/agents/recon-worker.md .agents/skills/recon/tests/skill-contract.test.mjs packages/cli/src/validation/skills.test.ts
```

**Verify:**

```bash
node --test .agents/skills/recon/tests/skill-contract.test.mjs .agents/skills/recon/tests/routing-contracts.test.mjs .agents/skills/recon/tests/workflow.integration.test.mjs
node --test tools/smoke/skill-version/reader-sameness.test.mjs
pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts
pnpm oat:validate-skills
```

Check the actual prose against executable owners; text pins prove only that the
published contract sentences exist, not that the behavior works. The p02-t03
production-logic workflow test is the behavioral backstop for the v2 writer
contract. Preserve provider-neutral consumers and package layout.

**Commit:** `feat(p03-t01): restore cheap recon fan-out across harnesses`.

### Task p03-t02: Render intended selections and document the consumer boundary

**Files:**

- Modify: `.agents/skills/recon/scripts/render-packet.mjs`,
  `tests/render-packet.test.mjs`, `references/packet-contract.md`.
- Modify: `apps/oat-docs/docs/workflows/skills/recon.md`.
- Modify: `apps/oat-docs/docs/workflows/skills/index.md` only if its recon summary
  describes the superseded behavior; no unrelated navigation rebuild.
- Generated if the page title/description or skills `## Contents` entry changes:
  `apps/oat-docs/index.md`; regenerate it with the documented command and stage it
  in this task's commit, never hand-edit it.

**Implement:**

1. Read only normalized ValidatedRun to render a compact intended-routing summary
   and conditional dispositions. Preserve atomic writes, digest revalidation,
   trust-root checks, and stale-output withdrawal.
2. Preserve evidence/claims/gaps as the main consumer context; never dump dossiers
   or turn the packet into a final recommendation.
3. Label approved intent versus real runtime observations. Do not fabricate
   actual-launch targets, receipts, cost totals, or universal correctness.
4. Document v1/v2 support, preview/check commands, inexpensive defaults, escalation
   examples, unsupported controls, and renewed approval boundaries. State explicitly
   that quick is an evidence packet for an intelligent consumer and has no
   independent semantic pass by design.
5. Read docs-app AGENTS.md before editing. Avoid fixed currently-live model claims;
   direct readers to the active provider guidance instead.
6. Do not re-bump recon if already bumped in p03-t01.

**Format:**

```bash
pnpm exec oxfmt --write .agents/skills/recon/scripts/render-packet.mjs .agents/skills/recon/tests/render-packet.test.mjs .agents/skills/recon/references/packet-contract.md apps/oat-docs/docs/workflows/skills/recon.md
```

If the generated index is owned by this task, regenerate it after the authored docs
edits and stage the result in the same commit:

```bash
pnpm -w run cli:source -- docs generate-index --docs-dir apps/oat-docs/docs --output apps/oat-docs/index.md
```

Do not hand-edit or independently format the generated index.

**Verify:**

```bash
node --test .agents/skills/recon/tests/render-packet.test.mjs .agents/skills/recon/tests/workflow.integration.test.mjs
pnpm --filter oat-docs check
```

Controls: unchanged v1 source bytes; v2 routing shown accurately; revoked/mutated
approval cannot publish; partial outcome remains visible; fabricated launch-proof
labels absent.

**Commit:** `docs(p03-t02): expose recon routing intent and evidence limits`.

## Phase 4: Distribution and composed verification

### Task p04-t01: Bundle the runtime and apply one lockstep release bump

**Files:**

- Modify: `packages/cli/package.json`, `packages/control-plane/package.json`,
  `packages/docs-config/package.json`, `packages/docs-theme/package.json`,
  `packages/docs-transforms/package.json`.
- Modify: `packages/cli/src/commands/init/tools/shared/bundle-consistency.test.ts`.
- Generated if changed: `pnpm-lock.yaml`, `.oat/sync/manifest.json`, configured
  provider views, and ignored `packages/cli/assets/**` build outputs.
- Modify: pack manifests only if the existing directory-copy contract does not
  include the new script; verify actual manifest ownership first.

**Implement:**

1. Fetch origin/main and choose one lockstep version strictly greater than the
   current base. Do not assume a previously observed version remains available or
   change main's branch.
2. Ensure new runtime scripts ship in the research pack while tests remain
   excluded according to existing packaging policy.
3. Extend bundle consistency to include the proposal helper and shared routing
   library. Test installed package layout using existing fixture facilities.
4. Build/bundle canonical assets and sync project-scoped views. Never manually
   edit generated copies or synchronize user-wide installs as part of this task.
5. Reconcile all required skill/role pins once per final PR diff. Do not adopt the
   stale AGENTS.md top-level skill-version wording over the newer migration.

**Format:**

```bash
pnpm exec oxfmt --write packages/cli/package.json packages/control-plane/package.json packages/docs-config/package.json packages/docs-theme/package.json packages/docs-transforms/package.json packages/cli/src/commands/init/tools/shared/bundle-consistency.test.ts
```

Also format each actually changed tracked manifest/pin file; do not format the
entire generated asset tree or rewrite pnpm's lockfile with a generic formatter.

**Verify:**

```bash
pnpm build
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared/bundle-consistency.test.ts
pnpm run cli -- sync --scope project
pnpm run check:skill-bumps
pnpm release:check-versions
```

Confirm generated runtime contains the new helper/library and actual package
scope remains intact. Stage only intended tracked outputs.

**Commit:** `chore(p04-t01): bundle recon routing and align release versions`.

### Task p04-t02: Record full validation and repeatable negative controls

**Files:**

- Modify: project `implementation.md`, `state.md`, and `plan.md` tracking only.
- Create: bounded evidence notes/probe instructions under project
  `references/verification/`; keep raw machine logs outside tracked artifacts.
- Any product defect found here becomes an explicit fix task with its own write
  set/commit and repeated relevant checks; do not hide it in bookkeeping.

**Implement and verify:**

Run the eight CI gates sequentially, in this exact order, capturing every exit
status. A failure stops the gate sequence for diagnosis; rerun after its repair.

1. `pnpm check`
2. `pnpm type-check`
3. `pnpm test`
4. `pnpm build`
5. `pnpm run check:skill-bumps`
6. `pnpm release:check-versions` (refresh origin/main before this gate)
7. `pnpm release:validate`
8. `pnpm build:docs`

Also run `pnpm lint` and `pnpm format` because skills are changed. Record
cache replay as such; do not present cached tests as executed evidence. For fresh
Turbo execution, use `HOME=$(mktemp -d) pnpm exec turbo run test --force` as the
repository documents. This is a per-command environment override, not a mutation
of the session's home or any global install.

Run focused `node --test .agents/skills/recon/tests/*.test.mjs` and
`pnpm test:skills`, `pnpm test:smoke`, `pnpm test:release` as fresh non-Turbo
supplements when preceding root output does not already supply actual execution.
Build before standalone smoke/release suites. Preserve observed results rather
than guessed counts.

Record v1 compatibility, v2 per-wave selection, valid/invalid conditional controls,
guard-neutralization evidence, and limits of synthetic harness tests. No live
native launch is claimed unless separately approved and observed.

**Format:**

```bash
pnpm exec oxfmt --write .oat/projects/shared/recon-rework/implementation.md .oat/projects/shared/recon-rework/state.md .oat/projects/shared/recon-rework/plan.md
```

Format each concrete verification note created. Include exact commands and
categorical expected outcomes sufficient for independent repetition.

**Commit:** `test(p04-t02): record recon compatibility and approval controls`.

### Phase 4 implementation evidence

Both Phase 4 task implementations are complete. Task `p04-t01` is commit
`9721d7c680a0778967addaf9ef8b391839949d9c`; task `p04-t02` is commit
`3e200321b705e5a3204cbe72434dff547ab2bc28`. Mechanical recovery commit
`b828fb10d8c4d02ac86df281ebb2ef61e394599d` changes only verification-note
whitespace in implementation/evidence content and records the completed recovery
marker in project state. The exact gate ledger, cache distinction, v1/v2 and
conditional controls, guard-neutralization proof, and synthetic-test limitations
are recorded in `references/verification/phase-4-validation.md`.

### Task p04-t03: (review) Enforce approved topology at packet validation

**Files:**

- Modify: `.agents/skills/recon/scripts/lib/contracts.mjs`
- Modify: `.agents/skills/recon/scripts/lib/routing.mjs`
- Modify: `.agents/skills/recon/tests/packet-validation.test.mjs`
- Modify: `.agents/skills/recon/tests/routing-contracts.test.mjs`

**Implement:**

1. Extract one shared v2 profile-topology validator and use it from both routing
   preview and finalized packet validation.
2. Enforce the complete profile-specific singleton set and order, exactly one
   non-conditional final reconciliation for standard/thorough, and only
   condition-bound contradiction resolution before reconciliation.
3. Preserve valid triggered and non-triggered conditional executions and the
   unchanged v1 compatibility boundary.

**Verify:**

```bash
node --test .agents/skills/recon/tests/routing-contracts.test.mjs .agents/skills/recon/tests/packet-validation.test.mjs
```

Negative controls must reject out-of-order stages, non-terminal reconciliation,
missing or duplicate required modes, and unconditional contradiction resolution
through `validatePacket()` after recomputing the production approval fingerprint.

**Commit:** `fix(p04-t03): enforce topology at packet validation`.

### Task p04-t04: (review) Return structured errors for malformed wave arrays

**Files:**

- Modify: `.agents/skills/recon/scripts/lib/contracts.mjs`
- Modify: `.agents/skills/recon/tests/packet-validation.test.mjs`
- Modify: `.agents/skills/recon/tests/integrity-contracts.test.mjs`

**Implement:**

1. After recording the array-shape error, iterate only over a verified array in
   both supported manifest-version validators.
2. Preserve the existing stable categorical error contract and public CLI JSON
   result instead of throwing for object-valued `execution.waves`.

**Verify:**

```bash
node --test .agents/skills/recon/tests/integrity-contracts.test.mjs .agents/skills/recon/tests/packet-validation.test.mjs
```

Direct `validateArtifactShape()` and public `validate-packet.mjs` controls must
return stable invalid results without a `TypeError` for malformed v1 and v2 wave
containers.

**Commit:** `fix(p04-t04): structure malformed wave errors`.

### Task p04-t05: (review) Align lifecycle summaries after final review

**Files:**

- Modify: `.oat/projects/shared/recon-rework/implementation.md`
- Modify: `.oat/projects/shared/recon-rework/plan.md`
- Modify: `.oat/projects/shared/recon-rework/design.md`
- Modify: `.oat/projects/shared/recon-rework/state.md`

**Implement:**

1. Align the implementation introduction, progress rollups, plan completion
   summary, and design preamble with the authoritative state: all phase reviews
   passed and final-review fixes are in progress.
2. Keep the final lifecycle review, implementation exit gate, and HiLL approval
   distinct; do not mark any pending closeout boundary complete.
3. Record the final-review fix commits and verification without erasing the
   original 9-task implementation history.

**Verify:**

```bash
pnpm exec oxfmt --check .oat/projects/shared/recon-rework/implementation.md .oat/projects/shared/recon-rework/plan.md .oat/projects/shared/recon-rework/design.md .oat/projects/shared/recon-rework/state.md
oat project validate-plan --project-path .oat/projects/shared/recon-rework --json
```

**Commit:** `docs(p04-t05): align final review lifecycle state`.

### Task p04-t06: (review) Correct the Phase 4 completion wording

**Files:**

- Modify: `.oat/projects/shared/recon-rework/implementation.md`
- Modify: `.oat/projects/shared/recon-rework/plan.md`
- Modify: `.oat/projects/shared/recon-rework/state.md`

**Implement:**

1. Change the Phase 4 subsection status to state that all final-review fix tasks
   are completed while the next narrowed final review remains pending.
2. Update task/phase totals and the latest final-review event without marking the
   exit gate, HiLL checkpoint, or implementation lifecycle complete.

**Verify:**

```bash
pnpm exec oxfmt --check .oat/projects/shared/recon-rework/implementation.md .oat/projects/shared/recon-rework/plan.md .oat/projects/shared/recon-rework/state.md
oat project validate-plan --project-path .oat/projects/shared/recon-rework --json
```

**Commit:** `docs(p04-t06): correct phase completion wording`.

Completion evidence: `p04-t06` is the lifecycle-wording commit containing this
record. Project artifact formatting, plan validation, and `git diff --check` pass.
The next narrowed final review remains pending.

Final-review tasks `p04-t03` and `p04-t04` are commits
`4f6884a99844cf5e86168ad422db7f2f49a23c08` and
`31619d967b0c0d7b42323ee77ff4ee86d6cef7a3`; `p04-t05` is commit
`fe30e986219bbf27b04fb08957166229acc955fe`; and `p04-t06` is the
lifecycle-wording commit containing this record. Focused task suites passed 49/49
and 84/84, and the composed recon suite passed 258/258. The original Phase 4
evidence remains intact.
None of this marks the narrowed final re-review, implementation exit gate,
configured HiLL checkpoint, or implementation lifecycle complete.

After this task, continue the normal authorized implementation review/final gate
workflow. This plan does not authorize push, PR publication, merge, backlog
closure, or live-provider spending. At approved shipping closeout, reconcile #274
and any canonical backlog record through their owning workflows against the
explicit below-floor interpretation in `design.md` and `## Before Implementation`;
do not claim model-name capability ranking, and do not close recap or wave-7 items.

## Phase 5: Post-retro simplification

### Task p05-t01: Remove unnecessary approval machinery and close RP-01/RP-02

**Status:** completed

**Commit:** `f16437f54491c57f9ad9518c34b415ffb7418a7e`

**Files:**

- Modify: `.agents/skills/recon/**`
- Modify: `apps/oat-docs/docs/workflows/skills/recon.md`
- Modify: `packages/*/package.json`
- Modify: `packages/cli/assets/public-package-versions.json`
- Modify: `packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts`
- Modify: `.oat/sync/manifest.json`
- Modify: `.oat/repo/reference/decisions/**`
- Modify: `.oat/projects/shared/recon-rework/**`

**Implement:**

1. Replace persisted approval fingerprints with session-local explicit approval
   and require fresh approval after resume, reload, or proposal edits.
2. Reject legacy packet-manifest v1 while retaining independently versioned v1
   evidence artifacts.
3. Make the shared profile-topology validator the sole owner of condition
   semantics and pin one diagnostic per isolated defect.
4. Skip foreign-run artifacts during inactive-condition attribution.
5. Replace conditional gap message parsing with structured `waveId` and `laneId`.
6. Update the public contract, durable decision, fixtures, integration coverage,
   project records, and retrospective dispositions coherently.

**Verify:**

Run the complete recon suite, the repository definition-of-done gates, skill
version/release checks, project validation, distribution sync, and
reproduction-grade negative controls for exact-target mismatch, condition
ownership, foreign-run attribution, and structured conditional gaps.

**Commit:** `refactor(recon): simplify approval and condition contracts`.

### Task p05-t02: Align shipped docs and historical decision surfaces

**Status:** completed

**Commit:** `3d21ea885a557e2642eb4b82cfb32d7a51024ea7`

**Files:**

- Modify: `apps/oat-docs/docs/workflows/skills/recon.md`
- Modify: `.agents/skills/recon/references/packet-contract.md`
- Modify: `.oat/projects/shared/recon-rework/**`
- Modify: `.oat/repo/reference/decisions/**`

**Implement:** Replace stale manifest-v1 documentation with the current
manifest-v2-only, session-local approval contract; annotate superseded discovery
requirements and prior decision clauses; and correct the packet-contract prose.

### Task p05-t03: Close dependent-validation and dead-condition gaps

**Status:** completed

**Commits:** `3d21ea885a557e2642eb4b82cfb32d7a51024ea7`,
`01a2a92c5e0de817110feea6cd88503636308585`,
`cfd2f25a539499276ae00f51c11b067f5c4871cf`,
`bd5dded4d460a95a1f9cd7ca46475ac49249dbbe`

**Files:**

- Modify: `.agents/skills/recon/scripts/**`
- Modify: `.agents/skills/recon/tests/**`

**Implement:** When routing cannot be normalized, continue independent source,
evidence, review, and reconciliation validation while skipping only
routing-dependent lane/condition checks. Require every eligible conditional wave
to have exactly one activating condition, give terminal-topology defects one
diagnostic owner, remove the duplicate missing-approval diagnostic, and pin the
fixes at pure and packet-validation boundaries.

### Task p05-t04: Reconcile final-review bookkeeping

**Status:** completed

**Commit:** this commit

**Files:**

- Modify: `.oat/projects/shared/recon-rework/**`

**Implement:** Receive and archive all final reviews, record every finding
disposition, fix all sub-threshold findings from the passing review, refresh task
totals and retrospective closure, and run a narrowed final re-review.

## Reviews

All three plan-review cycles have their corrections recorded. One tightened
verification evidence and the other established the approved single-terminal
topology. At the three-cycle cap, Thomas manually accepted the corrected aggregate
plan and directed that it be marked passed. The final event records that manual
acceptance; earlier event statuses remain as history. Keep the unbound template
rows below. The spec and design placeholders are non-blocking in quick mode.

| Scope  | Type     | Status          | Date       | Artifact                                                    | Reviewed Head                            | Invocation | Gate Target           |
| ------ | -------- | --------------- | ---------- | ----------------------------------------------------------- | ---------------------------------------- | ---------- | --------------------- |
| p01    | code     | passed          | 2026-09-10 | reviews/archived/p01-review-2026-09-10T020657Z.md           | f5317ee5fd4d5df78a341819023d7cc49f97da3e | manual     | -                     |
| p02    | code     | fixes_completed | 2026-09-10 | reviews/archived/p02-review-2026-09-10T030647Z.md           | 58b165063f7f1f154920b9793d353a2f8777ed81 | manual     | -                     |
| final  | code     | fixes_completed | 2026-09-10 | reviews/archived/final-review-2026-09-10T075058Z.md         | 769ea8aa937dd3e071600d8d5f119b184493e4ae | auto       | -                     |
| spec   | artifact | pending         | -          | -                                                           | -                                        | -          | -                     |
| design | artifact | pending         | -          | -                                                           | -                                        | -          | -                     |
| plan   | artifact | fixes_completed | 2026-09-09 | reviews/archived/artifact-plan-review-2026-09-09T163711Z.md | -                                        | -          | -                     |
| plan   | artifact | fixes_completed | 2026-09-09 | reviews/archived/artifact-plan-review-2026-09-09T232155Z.md | -                                        | -          | -                     |
| p03    | code     | fixes_completed | 2026-09-10 | reviews/archived/p03-review-2026-09-10T054626Z.md           | 33a5cfff83a11219429d3944cec8de8a1eb475a4 | manual     | -                     |
| p04    | code     | passed          | 2026-09-10 | reviews/archived/p04-review-2026-09-10T073941Z.md           | b62fb86aa6f31df166545c8aa4d6286510cd7d70 | manual     | -                     |
| plan   | artifact | passed          | 2026-09-09 | reviews/archived/artifact-plan-review-2026-09-09T231851Z.md | -                                        | manual     | -                     |
| p02    | code     | fixes_completed | 2026-09-10 | reviews/archived/p02-review-2026-09-10T033820Z.md           | 89594e147c9f1427823dca2d316524e26719f9a3 | manual     | -                     |
| p02    | code     | fixes_completed | 2026-09-10 | reviews/archived/p02-review-2026-09-10T041234Z.md           | b4424664101c86b3a044f23396290a1b83cd6d12 | manual     | -                     |
| p02    | code     | passed          | 2026-09-10 | reviews/archived/p02-review-2026-09-10T050659Z.md           | 420e1d4492b0734463aeac4d8bf91137f812dff0 | manual     | -                     |
| p03    | code     | fixes_completed | 2026-09-10 | reviews/archived/p03-review-2026-09-10T062438Z.md           | c6018f6c4f5633f005ed1938f3913db2e9bbd941 | manual     | -                     |
| p03    | code     | passed          | 2026-09-10 | reviews/archived/p03-review-2026-09-10T065216Z.md           | c1f175409c29d1afc04c7d69c84f61b80b4c850f | manual     | -                     |
| final  | code     | fixes_completed | 2026-09-10 | reviews/archived/final-review-2026-09-10T083842Z.md         | fe30e986219bbf27b04fb08957166229acc955fe | auto       | -                     |
| final  | code     | passed          | 2026-09-10 | reviews/archived/final-review-2026-09-10T085115Z.md         | b1c7e84716f65ccf414448f1d2ac7d96d9cac434 | auto       | -                     |
| final  | code     | passed          | 2026-09-10 | reviews/archived/final-review-2026-09-10T091637Z.md         | ad1d8ae99e43d125e7dd791225c3dc1984e7812f | gate       | cursor-fable-5-1-high |
| final  | code     | fixes_completed | 2026-09-11 | reviews/archived/final-review-2026-09-11T014112Z.md         | b1dd2acaf13bbad8ce49c2b472565584e33e08f2 | gate       | cursor-fable-5-1-high |
| final  | code     | fixes_completed | 2026-09-11 | reviews/archived/final-review-2026-09-11T020623Z.md         | e35342bae80cfbd95d3d393faa94d5d07021adac | gate       | cursor-fable-5-1-high |
| final  | code     | fixes_completed | 2026-09-11 | reviews/archived/final-review-2026-09-11T022854Z.md         | 44c00a120be3c6ad139354593e3876b41cedc845 | gate       | cursor-fable-5-1-high |
| final  | code     | fixes_completed | 2026-09-11 | reviews/archived/final-review-2026-09-11T024939Z.md         | d08443a4494aa0f7344893ce03cabf61a50fb683 | gate       | cursor-fable-5-1-high |
| final  | code     | passed          | 2026-09-11 | reviews/archived/final-review-2026-09-11T030536Z.md         | 5f243f7ac825a050e995c867597c69ef3e1b46bc | gate       | cursor-fable-5-1-high |
| p-rev1 | code     | passed          | 2026-09-11 | reviews/archived/p-rev1-review-2026-09-11T143545Z.md        | 9d27e15a615fc18056a8c5b7501a0508ffb9c4a4 | manual     | -                     |
| final  | code     | fixes_completed | 2026-09-11 | reviews/archived/final-review-2026-09-11T144641Z.md         | 0ee34935306c0dcb711ded3f83746a890cb50c97 | auto       | -                     |
| final  | code     | passed          | 2026-09-11 | reviews/archived/final-review-2026-09-11T150854Z.md         | 695f4dba72d9fb46ab10a962a08907a6d593f7e3 | auto       | -                     |
| final  | code     | fixes_completed | 2026-09-11 | reviews/archived/final-review-2026-09-11T152512Z.md         | c11f78febec9329642f068ae849059547f924c0a | gate       | cursor-fable-5-1-high |
| final  | code     | received        | 2026-09-11 | reviews/final-review-2026-09-11T154126Z.md                  | 819591ba1044e65a7eff7495a529bbe5ee122db3 | auto       | -                     |

## Phase p-rev1: Integrate current main

Source: inline feedback (2026-09-11)

### Task prev1-t01: (revision) Merge origin/main and resolve conflicts semantically

**Status:** completed

**Files:**

- Modify: `.agents/skills/oat-project-review-receive/SKILL.md`
- Modify: `.oat/sync/manifest.json`
- Modify: `packages/cli/assets/public-package-versions.json`
- Modify: `packages/cli/package.json`
- Modify: `packages/cli/src/validation/skills.test.ts`
- Modify: `packages/control-plane/package.json`
- Modify: `packages/docs-config/package.json`
- Modify: `packages/docs-theme/package.json`
- Modify: `packages/docs-transforms/package.json`

**Step 1:** Merge current `origin/main` into `recon-rework`. Resolve the review
contract and validation conflicts by composing both branches' behavior. Resolve
the public package manifests to one lockstep version strictly newer than current
`origin/main`, then regenerate or validate derived sync/version surfaces rather
than choosing an entire side mechanically.

**Step 2: Verify**

Run `git diff --check`, confirm `git ls-files -u` is empty, run the focused skill
and release validation suites for the conflicted surfaces, then run the complete
repository definition-of-done gate sequence plus `pnpm lint` and `pnpm format`.

Expected: no unmerged entries; composed review-receive behavior retained; all
skill, version, release, test, build, docs, lint, and formatting gates pass.

**Step 3: Commit**

Commit the semantic conflict resolution as the merge commit created by integrating
`origin/main`.

## Phase p-rev2: Final merged-head review fixes

Source: final lifecycle review `final-review-2026-09-11T144641Z.md`

### Task prev2-t01: (review) Align profile topology caps with documented waves

**Status:** completed

**Files:**

- Modify: `.agents/skills/recon/scripts/lib/contracts.mjs`
- Modify: `.agents/skills/recon/tests/routing-contracts.test.mjs`
- Modify: `.agents/skills/recon/tests/routing-preview.test.mjs`

**Step 1: Understand the issue**

The quick profile documents one map lane, one to four gather lanes, and one compile
lane, but the validator counts every lane against `quick.lanes: 4` and rejects the
maximum documented topology. It also admits wave modes that belong only to
standard or thorough profiles.

**Step 2: Implement fix**

Make each profile explicit about allowed wave modes and which lanes its caps
count. Permit quick's map plus up to four gather lanes plus compile, reject
cross-profile modes, and keep standard/thorough adaptive ranges aligned with the
published contract.

**Step 3: Verify**

Run the routing-contract and routing-preview suites. Add direct positive coverage
for the maximum quick topology and negative coverage for forbidden cross-profile
modes. Neutralize the new guard once and confirm the targeted test fails before
restoring it.

**Step 4: Commit**

Commit as `fix(prev2-t01): align recon profile topology caps`.

### Task prev2-t02: (review) Close object-valued manifest collection failures

**Status:** completed

**Files:**

- Modify: `.agents/skills/recon/scripts/validate-packet.mjs`
- Modify: `.agents/skills/recon/tests/packet-validation.test.mjs`
- Modify: `.agents/skills/recon/tests/integrity-contracts.test.mjs`

**Step 1: Understand the issue**

`collectReferences()` iterates `manifest.artifacts` before the array-shape guard.
An object-valued collection throws, emits no categorical JSON result, and leaves a
seeded stale `packet.md` published.

**Step 2: Implement fix**

Guard every reference-list iteration with `Array.isArray()` and audit equivalent
ledger collections so hostile object and numeric shapes reach the structured
validation and stale-output withdrawal path without cascading diagnostics.

**Step 3: Verify**

Add public-CLI negative controls for object and numeric collection values. Assert
exit 1, categorical JSON, no cascaded pass/reconciliation diagnostics, and removal
of seeded stale `packet.md`. Run the packet-validation, integrity-contract, and
complete recon suites; neutralize the guard once to prove the P0 test fails.

**Step 4: Commit**

Commit as `fix(prev2-t02): fail closed on hostile manifest collections`.

## Phase p-rev3: Configured-gate profile-cap fixes

Source: configured exit-gate review `final-review-2026-09-11T152512Z.md`

### Task prev3-t01: (review) Bound singleton wave lanes

**Status:** completed

**Files:**

- Modify: `.agents/skills/recon/scripts/lib/contracts.mjs`
- Modify: `.agents/skills/recon/tests/routing-contracts.test.mjs`
- Modify: `.agents/skills/recon/tests/packet-validation.test.mjs`

**Step 1: Understand the issue**

The adaptive 4/10/20 cap now excludes map, compile, and reconciliation, but those
singleton-mode waves have no per-wave lane bound. A quick run with 40 map lanes
therefore validates even though the profile permits one map lane.

**Step 2: Implement fix**

Require exactly one lane for every wave whose mode is outside the profile's
adaptive counted modes. Keep the shared validator authoritative for preview and
finalized packet validation.

**Step 3: Verify**

Pin quick map/compile and standard reconciliation overpopulation at both routing
and packet-validation boundaries. Reproduce the 40-map-lane pre-fix acceptance,
neutralize the new guard to prove the targeted test fails, restore it, and run the
focused plus complete recon suites.

**Step 4: Commit**

Commit as `fix(prev3-t01): bound singleton recon wave lanes`.

### Task prev3-t02: (review) Align adaptive cap contract prose

**Status:** completed

**Files:**

- Modify: `.agents/skills/recon/references/packet-contract.md`
- Modify: `.agents/skills/recon/references/profiles.md`
- Modify: `.agents/skills/recon/tests/skill-contract.test.mjs`

**Step 1: Understand the issue**

The shipped references still call 4/10/20 a total-worker hard cap even though the
implemented policy applies it to adaptive evidence modes and separately requires
single-lane map, compile, and reconciliation waves.

**Step 2: Implement fix**

Describe exactly which modes count toward the adaptive cap, which fixed modes are
single-lane, and how the total maximum follows from both rules. Pin the wording in
the skill-contract suite.

**Step 3: Verify**

Run the skill-contract suite, canonical skill validation, skill-bump gate, and
format checks.

**Step 4: Commit**

Commit as `docs(prev3-t02): align recon adaptive cap contract`.

### Task prev3-t03: (review) Clarify adaptive cap preview

**Status:** completed

**Files:**

- Modify: `.agents/skills/recon/scripts/lib/routing.mjs`
- Modify: `.agents/skills/recon/tests/routing-preview.test.mjs`

**Step 1: Understand the issue**

The approval preview shows six total lanes beside a profile lane cap of four
without explaining that the latter counts only adaptive evidence lanes.

**Step 2: Implement fix**

Expose the counted adaptive lane total and render the relationship explicitly,
for example four counted adaptive lanes out of six total.

**Step 3: Verify**

Pin the structured preview fields and rendered approval text, then run the routing
preview and complete recon suites.

**Step 4: Commit**

Commit as `fix(prev3-t03): clarify recon adaptive lane preview`.

## Implementation Complete

**Implementation tasks complete: 23 of 23 implemented. The configured exit-gate
remediation is complete and awaiting narrowed lifecycle re-review.**

- Phase 1: 2 tasks — decision and versioned contract.
- Phase 2: 3 tasks — preview, conditional validation, integrated controls.
- Phase 3: 2 tasks — guidance and consumer output.
- Phase 4: 6 tasks — distribution, complete verification, and final-review fixes.
- Phase 5: 4 tasks — simplification plus fresh final-review fixes.
- Phase p-rev1: 1 task — integrate current `origin/main` and resolve conflicts.
- Phase p-rev2: 2 tasks — close merged-head profile and hostile-collection gaps.
- Phase p-rev3: 3 tasks — bound fixed waves and align cap docs and preview.

**Total: 8 phases, 23 tasks.** All implementation tasks are complete.
Plan readiness, task completion, reviews, final gate, and shipping are distinct.

## References

- [Discovery](discovery.md)
- [Lightweight design draft](design.md)
- [Implementation tracker](implementation.md)
- [Receiving-agent handoff](handoff.md)
- [Source context and evidence map](references/source-context.md)
- Source issue: https://github.com/voxmedia/open-agent-toolkit/issues/274
